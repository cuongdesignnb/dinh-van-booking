import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { MediaService, type MediaView } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { loadConfig, readSecret } from '../common/config/env';
import type { AuthenticatedUser } from '../common/types';
import { assertPublicHost, validatePublicHttpsUrl } from './safe-network';
import type { GenerateContentDto, SaveAiSettingsDto } from './ai.dto';

const SETTINGS_KEY = 'ai.providers.v1';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const MAX_REQUESTS_PER_WINDOW = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_PROVIDER_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const CONTENT_KINDS = new Set(['article', 'page', 'stay', 'combo', 'destination']);
const SAFE_TAGS = new Set([
  'p', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
  'blockquote', 'a', 'br', 'hr',
]);
const VOID_TAGS = new Set(['br', 'hr']);

type WireFormat = 'responses' | 'chat_completions';
type ProviderName = 'content' | 'image';
interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  wire?: WireFormat;
  maxOutputTokens?: number;
  imageSize?: string;
  imageQuality?: string;
}
interface StoredProvider extends Omit<ProviderConfig, 'apiKey'> {
  encryptedApiKey?: string;
}
interface StoredSettings {
  content?: StoredProvider;
  image?: StoredProvider;
}
interface LinkCandidate {
  id: string;
  kind: string;
  title: string;
  path: string;
  anchor: string;
}
interface GeneratedDraft {
  title: string;
  excerpt: string;
  bodyHtml: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  images: Array<{ prompt: string; alt: string; caption: string; afterHeading: string }>;
}
interface HtmlElement {
  tag: string;
  attrs: Record<string, string>;
  children: Array<HtmlElement | string>;
}

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    excerpt: { type: 'string' },
    bodyHtml: { type: 'string' },
    metaTitle: { type: 'string' },
    metaDescription: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    images: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          prompt: { type: 'string' },
          alt: { type: 'string' },
          caption: { type: 'string' },
          afterHeading: { type: 'string' },
        },
        required: ['prompt', 'alt', 'caption', 'afterHeading'],
      },
    },
  },
  required: ['title', 'excerpt', 'bodyHtml', 'metaTitle', 'metaDescription', 'tags', 'images'],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown, name: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new BadRequestException(`Thiếu ${name}`);
    return '';
  }
  if (typeof value !== 'string') throw new BadRequestException(`${name} phải là chuỗi`);
  const clean = value.trim().slice(0, max);
  if (required && !clean) throw new BadRequestException(`Thiếu ${name}`);
  return clean;
}

function normalizeAnchor(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase('vi-VN').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function anchorFromTitle(title: string): string {
  let words = title.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) words = ['khám phá', ...words];
  return words.slice(0, 8).join(' ');
}

function htmlText(children: Array<HtmlElement | string>): string {
  return children.map((child) => typeof child === 'string' ? child : htmlText(child.children)).join('');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (entity, code: string) => {
    const lower = code.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos' || lower === '#39') return "'";
    const numeric = lower.startsWith('#x') ? Number.parseInt(lower.slice(2), 16) : Number.parseInt(lower.slice(1), 10);
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 0x10ffff ? String.fromCodePoint(numeric) : entity;
  });
}

/** Strict HTML allow-list parser: model markup never reaches the browser as-is. */
export function sanitizeGeneratedHtml(
  input: string,
  candidates: LinkCandidate[],
): { html: string; linked: LinkCandidate[] } {
  if (input.length > 100_000) throw new BadRequestException('Nội dung AI vượt quá giới hạn cho phép');
  const candidateByPath = new Map(candidates.map((candidate) => [candidate.path, candidate]));
  const root: HtmlElement = { tag: 'root', attrs: {}, children: [] };
  const stack: HtmlElement[] = [root];
  const tokenizer = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+|</g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const linked: LinkCandidate[] = [];
  const linkedPaths = new Set<string>();
  while ((match = tokenizer.exec(input)) !== null) {
    if (match.index !== lastIndex) throw new BadRequestException('HTML nội dung AI bị lỗi cấu trúc');
    lastIndex = tokenizer.lastIndex;
    const token = match[0];
    if (token.startsWith('<!--')) throw new BadRequestException('HTML nội dung AI không được có comment');
    if (!token.startsWith('<')) {
      stack[stack.length - 1].children.push(decodeEntities(token));
      continue;
    }
    const tagMatch = /^<\s*(\/?)\s*([a-z][a-z0-9]*)\b([\s\S]*?)\s*(\/?)>$/i.exec(token);
    if (!tagMatch) throw new BadRequestException('HTML nội dung AI bị lỗi cấu trúc');
    const [, closing, rawTag, rawAttrs, selfClosing] = tagMatch;
    const tag = rawTag.toLowerCase();
    if (!SAFE_TAGS.has(tag)) throw new BadRequestException(`HTML AI có thẻ không được phép: ${tag}`);
    if (closing) {
      if (rawAttrs.trim() || selfClosing || stack.length === 1 || stack[stack.length - 1].tag !== tag) {
        throw new BadRequestException('HTML nội dung AI bị đóng thẻ không hợp lệ');
      }
      const element = stack.pop()!;
      if (tag === 'a') {
        const path = element.attrs.href;
        const candidate = candidateByPath.get(path);
        const anchor = normalizeAnchor(htmlText(element.children));
        if (!candidate || anchor !== normalizeAnchor(candidate.anchor) || linkedPaths.has(path)) {
          // Remove an invalid-but-harmless link wrapper, retaining its text.
          stack[stack.length - 1].children.push(...element.children);
        } else {
          linkedPaths.add(path);
          linked.push(candidate);
          stack[stack.length - 1].children.push(element);
        }
      } else {
        stack[stack.length - 1].children.push(element);
      }
      continue;
    }

    const attrs = rawAttrs.trim();
    const parsedAttrs: Record<string, string> = {};
    if (tag === 'a') {
      const href = /^href\s*=\s*(["'])(.*?)\1$/i.exec(attrs);
      if (!href) throw new BadRequestException('Liên kết trong nội dung AI thiếu URL hợp lệ');
      const path = decodeEntities(href[2]).trim();
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /[?#\u0000-\u001f]/.test(path)) {
        throw new BadRequestException('Nội dung AI chứa URL liên kết không an toàn');
      }
      if (!candidateByPath.has(path)) throw new BadRequestException('Nội dung AI liên kết tới route chưa được xuất bản hoặc không tồn tại');
      parsedAttrs.href = path;
    } else if (attrs) {
      throw new BadRequestException(`Thẻ ${tag} không được có thuộc tính`);
    }
    if (VOID_TAGS.has(tag)) {
      if (!selfClosing && /\s+/.test(rawAttrs)) throw new BadRequestException(`Thẻ ${tag} không hợp lệ`);
      stack[stack.length - 1].children.push({ tag, attrs: parsedAttrs, children: [] });
      continue;
    }
    const element: HtmlElement = { tag, attrs: parsedAttrs, children: [] };
    stack[stack.length - 1].children.push(element);
    stack.push(element);
  }
  if (lastIndex !== input.length || stack.length !== 1) throw new BadRequestException('HTML nội dung AI chưa đóng đủ thẻ');

  const render = (node: HtmlElement | string): string => {
    if (typeof node === 'string') return escapeHtml(node);
    if (node.tag === 'root') return node.children.map(render).join('');
    if (node.tag === 'br' || node.tag === 'hr') return `<${node.tag}>`;
    const href = node.tag === 'a' ? ` href="${escapeHtml(node.attrs.href)}"` : '';
    const tag = node.tag === 'b' ? 'strong' : node.tag === 'i' ? 'em' : node.tag;
    return `<${tag}${href}>${node.children.map(render).join('')}</${tag}>`;
  };
  const html = render(root).trim();
  const plain = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length < 120 || !/<h[2-4]>[^<\s]/i.test(html)) {
    throw new BadRequestException('Bản nháp AI quá ngắn hoặc thiếu tiêu đề mục H2–H4');
  }
  return { html, linked };
}

export function encryptProviderKey(value: string, secret: string): string {
  const iv = randomBytes(12);
  const key = scryptSync(secret, 'dinh-van-ai-provider-key-v1', 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptProviderKey(value: string, secret: string): string {
  const [version, ivText, tagText, bodyText] = value.split(':');
  if (version !== 'v1' || !ivText || !tagText || !bodyText) throw new Error('Invalid encrypted provider key');
  const key = scryptSync(secret, 'dinh-van-ai-provider-key-v1', 32);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(bodyText, 'base64url')), decipher.final()]).toString('utf8');
}

function providerSecret(): string {
  if (process.env.AI_SETTINGS_ENCRYPTION_KEY_FILE || process.env.AI_SETTINGS_ENCRYPTION_KEY) {
    return process.env.AI_SETTINGS_ENCRYPTION_KEY_FILE
      ? readSecret('AI_SETTINGS_ENCRYPTION_KEY')
      : process.env.AI_SETTINGS_ENCRYPTION_KEY!;
  }
  return loadConfig().sessionSecret;
}

function maskKey(key: string): string | null {
  if (!key) return null;
  return key.length <= 8 ? '••••••••' : `${key.slice(0, 4)}${'•'.repeat(8)}${key.slice(-4)}`;
}

function readEnvironmentSecret(name: string): string {
  if (process.env[`${name}_FILE`]) {
    try { return readSecret(name); } catch { return ''; }
  }
  return process.env[name] ?? '';
}

function providerDefaults(kind: ProviderName): ProviderConfig {
  const isContent = kind === 'content';
  return {
    baseUrl: DEFAULT_BASE_URL,
    model: isContent ? '' : 'gpt-image-1',
    apiKey: '',
    ...(isContent ? { wire: 'responses' as const, maxOutputTokens: 5000 } : { imageSize: '1024x1024', imageQuality: 'medium' }),
  };
}

function extractResponseText(data: Record<string, unknown>, wire: WireFormat): string {
  if (wire === 'responses') {
    if (typeof data.output_text === 'string') return data.output_text;
    if (Array.isArray(data.output)) {
      const texts: string[] = [];
      for (const item of data.output) {
        if (!isRecord(item) || !Array.isArray(item.content)) continue;
        for (const part of item.content) if (isRecord(part) && typeof part.text === 'string') texts.push(part.text);
      }
      if (texts.length) return texts.join('\n');
    }
  }
  const choices = data.choices;
  if (Array.isArray(choices) && isRecord(choices[0])) {
    const message = choices[0].message;
    if (isRecord(message) && typeof message.content === 'string') return message.content;
    if (typeof choices[0].text === 'string') return choices[0].text;
  }
  throw new BadGatewayException('Nhà cung cấp AI trả về cấu trúc nội dung không nhận diện được');
}

function endpoint(base: string, path: string): string {
  const clean = base.replace(/\/+$/, '');
  return clean.endsWith(`/${path}`) ? clean : `${clean}/${path}`;
}

function publicCandidatesAnchor(candidate: { title: string }): string {
  return anchorFromTitle(candidate.title);
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly config = loadConfig();
  private readonly requestTimes = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService, private readonly media: MediaService) {}

  async getSettings(): Promise<Record<string, unknown>> {
    const stored = await this.readStoredSettings();
    const content = this.resolveProvider('content', stored.content);
    const image = this.resolveProvider('image', stored.image);
    return {
      version: stored.version,
      content: {
        baseUrl: content.baseUrl,
        model: content.model,
        wire: content.wire,
        maxOutputTokens: content.maxOutputTokens,
        keyConfigured: !!content.apiKey,
        maskedKey: maskKey(content.apiKey),
        keySource: stored.content?.encryptedApiKey ? 'database' : content.apiKey ? 'environment' : 'none',
      },
      image: {
        baseUrl: image.baseUrl,
        model: image.model,
        imageSize: image.imageSize,
        imageQuality: image.imageQuality,
        keyConfigured: !!image.apiKey,
        maskedKey: maskKey(image.apiKey),
        keySource: stored.image?.encryptedApiKey ? 'database' : image.apiKey ? 'environment' : 'none',
      },
      encryption: process.env.AI_SETTINGS_ENCRYPTION_KEY || process.env.AI_SETTINGS_ENCRYPTION_KEY_FILE ? 'dedicated_key' : 'session_secret',
    };
  }

  async saveSettings(dto: SaveAiSettingsDto, userId: string): Promise<Record<string, unknown>> {
    const expectedVersion = Number(dto.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw new BadRequestException('Phiên bản cài đặt không hợp lệ');
    }
    const currentRow = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    const version = currentRow?.version ?? 0;
    if (version !== expectedVersion) {
      throw new HttpException({ code: 'version_conflict', message: 'Cấu hình AI vừa được thay đổi. Hãy tải lại trước khi lưu.', currentVersion: version }, 409);
    }
    const current = this.parseStored(currentRow?.value);
    const content = this.updateStoredProvider('content', dto.content, current.content);
    const image = this.updateStoredProvider('image', dto.image, current.image);
    const next: StoredSettings = { content, image };
    try {
      await this.prisma.$transaction(async (tx) => {
        const latest = await tx.setting.findUnique({ where: { key: SETTINGS_KEY } });
        const latestVersion = latest?.version ?? 0;
        if (latestVersion !== expectedVersion) {
          throw new HttpException({ code: 'version_conflict', message: 'Cấu hình AI vừa được thay đổi. Hãy tải lại trước khi lưu.', currentVersion: latestVersion }, 409);
        }
        await tx.setting.upsert({
          where: { key: SETTINGS_KEY },
          create: { key: SETTINGS_KEY, value: next as Prisma.InputJsonObject, schemaVersion: 1, isPublic: false, version: 1, updatedById: userId },
          update: { value: next as Prisma.InputJsonObject, schemaVersion: 1, isPublic: false, version: { increment: 1 }, updatedById: userId },
        });
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'ai.settings.update',
            entityType: 'setting',
            entityId: SETTINGS_KEY,
            diff: {
              from: this.safeAuditState(current),
              to: this.safeAuditState(next),
            } as Prisma.InputJsonObject,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new HttpException({ code: 'version_conflict', message: 'Cấu hình AI vừa được thay đổi. Hãy tải lại trước khi lưu.' }, 409);
      }
      throw error;
    }
    return this.getSettings();
  }

  async generate(dto: GenerateContentDto, user: AuthenticatedUser): Promise<Record<string, unknown>> {
    this.enforceRateLimit(user.id);
    const kind = cleanString(dto.kind, 'loại nội dung', 32, true);
    if (!CONTENT_KINDS.has(kind)) throw new BadRequestException('Loại nội dung AI không hợp lệ');
    const brief = cleanString(dto.brief, 'yêu cầu nội dung', 4000, true);
    const title = cleanString(dto.title, 'tiêu đề', 300);
    const excerpt = cleanString(dto.excerpt, 'mô tả ngắn', 800);
    const generateImages = dto.generateImages === true;
    const imageCount = generateImages ? Number(dto.imageCount ?? 1) : 0;
    if (generateImages && (!Number.isInteger(imageCount) || imageCount < 1 || imageCount > 3)) {
      throw new BadRequestException('Số ảnh tạo trong một lần phải từ 1 đến 3');
    }
    const currentContentId = dto.currentContentId === undefined ? null : cleanString(dto.currentContentId, 'mã nội dung', 80, true);
    if (currentContentId && !/^[0-9a-f-]{36}$/i.test(currentContentId)) throw new BadRequestException('Mã nội dung không hợp lệ');

    const stored = await this.readStoredSettings();
    const contentProvider = this.resolveProvider('content', stored.content);
    if (!contentProvider.apiKey || !contentProvider.model) {
      throw new BadRequestException('Chưa cấu hình API key và model AI viết nội dung trong Cài đặt → AI');
    }
    validatePublicHttpsUrl(contentProvider.baseUrl, 'Base URL AI viết nội dung');
    const linkCandidates = await this.findLinkCandidates(kind, brief, currentContentId);
    const draft = await this.requestDraft(contentProvider, { kind, brief, title, excerpt, linkCandidates, imageCount });
    const sanitized = sanitizeGeneratedHtml(draft.bodyHtml, linkCandidates);
    let bodyHtml = sanitized.html;
    const linked = [...sanitized.linked];
    if (linkCandidates.length && linked.length === 0) {
      const fallback = linkCandidates[0];
      bodyHtml += `<p>Để có thêm thông tin liên quan cho kế hoạch của bạn, hãy tham khảo <a href="${escapeHtml(fallback.path)}">${escapeHtml(fallback.anchor)}</a>.</p>`;
      linked.push(fallback);
    }

    const warnings: string[] = [];
    const mediaAssets: MediaView[] = [];
    if (linkCandidates.length === 0) warnings.push('Hiện chưa có route công khai đủ điều kiện để chèn liên kết nội bộ thật.');
    if (imageCount > 0) {
      const imageProvider = this.resolveProvider('image', stored.image);
      if (!imageProvider.apiKey || !imageProvider.model) {
        warnings.push('Chưa cấu hình API key và model AI tạo ảnh; bài viết vẫn được giữ để bạn xem trước.');
      } else {
        const imageSpecs = draft.images.slice(0, imageCount);
        if (imageSpecs.length < imageCount) warnings.push('AI trả về ít mô tả ảnh hơn số lượng yêu cầu.');
        const results = await Promise.allSettled(imageSpecs.map((spec, index) => this.generateImage(imageProvider, spec, draft, kind, brief, index, user.id)));
        for (const result of results) {
          if (result.status === 'fulfilled') mediaAssets.push(result.value.asset);
          else {
            this.logger.warn(`Image generation failed for content draft (${result.reason instanceof Error ? result.reason.name : 'unknown error'})`);
            warnings.push('Một hoặc nhiều ảnh không tạo được; phần nội dung và các ảnh thành công vẫn dùng được.');
          }
        }
        for (const result of [...results].reverse()) {
          if (result.status === 'fulfilled') bodyHtml = this.insertImage(bodyHtml, result.value.asset, result.value.afterHeading);
        }
      }
    }

    return {
      title: draft.title.trim().slice(0, 300),
      excerpt: draft.excerpt.trim().slice(0, 500),
      bodyHtml,
      metaTitle: draft.metaTitle.trim().slice(0, 200),
      metaDescription: draft.metaDescription.trim().slice(0, 320),
      tags: draft.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim().slice(0, 60)).filter(Boolean).slice(0, 12),
      links: linked.map(({ path, title: label, anchor, kind: linkKind }) => ({ path, title: label, anchor, kind: linkKind })),
      images: mediaAssets.map((asset) => ({ id: asset.id, url: asset.url, alt: asset.altText, caption: asset.caption, mediaId: asset.id })),
      warnings,
      saved: false,
      publicationStatus: 'draft',
    };
  }

  private async requestDraft(
    provider: ProviderConfig,
    input: { kind: string; brief: string; title: string; excerpt: string; linkCandidates: LinkCandidate[]; imageCount: number },
  ): Promise<GeneratedDraft> {
    const instruction = [
      'Bạn là biên tập viên nội dung cho một hệ thống du lịch Việt Nam. Tạo bản nháp chính xác, dễ đọc, hữu ích và không bịa giá, tồn phòng, chính sách, số liệu hoặc trải nghiệm xác thực.',
      'Chỉ trả JSON theo schema được cung cấp. bodyHtml chỉ dùng p, h2, h3, h4, strong, em, u, s, ul, ol, li, blockquote, a, br, hr. Không dùng h1, ảnh, script, style, thuộc tính HTML ngoài href của a.',
      'Nếu được cung cấp danh sách route nội bộ, hãy chèn tự nhiên 1–2 anchor khớp chính xác cả href và anchor đã cho; mỗi route tối đa một lần. Không tạo URL khác, không dùng link ngoài. Nếu không có route thì không chèn liên kết.',
      'Nội dung phải có cấu trúc H2/H3, đoạn văn đầy đủ và meta description tự nhiên. Không tuyên bố nội dung đã được xác minh nếu thông tin đầu vào không nói vậy.',
      input.imageCount > 0
        ? `Trả về đúng ${input.imageCount} mô tả ảnh khác nhau. Mỗi ảnh cần prompt rõ chủ thể/bối cảnh, ALT tiếng Việt mô tả những gì ảnh thể hiện (không nhồi từ khoá), caption ngắn và tên heading H2/H3 phù hợp để đặt ảnh ngay sau heading đó.`
        : 'Trả về images là mảng rỗng.',
    ].join('\n');
    const userInput = {
      contentKind: input.kind,
      requestedTitle: input.title,
      requestedExcerpt: input.excerpt,
      brief: input.brief,
      internalLinkOptions: input.linkCandidates.map(({ path, title, anchor, kind }) => ({ path, title, anchor, kind })),
      imageCount: input.imageCount,
      language: 'Vietnamese',
    };
    const url = validatePublicHttpsUrl(provider.baseUrl, 'Base URL AI viết nội dung');
    await assertPublicHost(url);
    const wire = provider.wire ?? 'responses';
    if (wire !== 'responses' && wire !== 'chat_completions') throw new BadRequestException('Kiểu API nội dung trên máy chủ không hợp lệ');
    const maxOutputTokens = provider.maxOutputTokens ?? 5000;
    if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 256 || maxOutputTokens > 30_000) {
      throw new BadRequestException('Giới hạn token AI trên máy chủ không hợp lệ');
    }
    const endpointUrl = endpoint(url.toString(), wire === 'responses' ? 'responses' : 'chat/completions');
    const body = wire === 'responses'
      ? {
          model: provider.model,
          instructions: instruction,
          input: JSON.stringify(userInput),
          max_output_tokens: maxOutputTokens,
          store: false,
          text: { format: { type: 'json_schema', name: 'cms_content_draft', strict: true, schema: DRAFT_SCHEMA } },
        }
      : {
          model: provider.model,
          messages: [{ role: 'system', content: instruction }, { role: 'user', content: JSON.stringify(userInput) }],
          max_tokens: maxOutputTokens,
          response_format: { type: 'json_schema', json_schema: { name: 'cms_content_draft', strict: true, schema: DRAFT_SCHEMA } },
        };
    const response = await this.fetchJson(endpointUrl, provider.apiKey, body, 90_000);
    let text = extractResponseText(response, wire).trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new BadGatewayException('AI trả về JSON không hợp lệ; chưa có nội dung nào được lưu'); }
    if (!isRecord(parsed)) throw new BadGatewayException('AI không trả về một bản nháp hợp lệ');
    const draft = parsed as unknown as GeneratedDraft;
    if (typeof draft.title !== 'string' || !draft.title.trim()
        || typeof draft.excerpt !== 'string' || !draft.excerpt.trim() || typeof draft.bodyHtml !== 'string'
        || typeof draft.metaTitle !== 'string' || !draft.metaTitle.trim()
        || typeof draft.metaDescription !== 'string' || !draft.metaDescription.trim()
        || !Array.isArray(draft.tags) || !Array.isArray(draft.images)) {
      throw new BadGatewayException('AI trả về thiếu trường nội dung bắt buộc; chưa lưu bản nháp');
    }
    draft.images = draft.images.filter((image) => isRecord(image)).map((image) => ({
      prompt: typeof image.prompt === 'string' ? image.prompt.trim().slice(0, 2000) : '',
      alt: typeof image.alt === 'string' ? image.alt.trim().slice(0, 500) : '',
      caption: typeof image.caption === 'string' ? image.caption.trim().slice(0, 1000) : '',
      afterHeading: typeof image.afterHeading === 'string' ? image.afterHeading.trim().slice(0, 180) : '',
    }));
    return draft;
  }

  private async generateImage(
    provider: ProviderConfig,
    spec: GeneratedDraft['images'][number],
    draft: GeneratedDraft,
    kind: string,
    brief: string,
    index: number,
    userId: string,
  ): Promise<{ asset: MediaView; afterHeading: string }> {
    const alt = spec.alt || `${draft.title} – hình minh hoạ ${index + 1}`;
    const caption = spec.caption || alt;
    const prompt = spec.prompt || `Minh hoạ biên tập cho nội dung ${kind}: ${brief}. Không chèn chữ, logo hoặc watermark.`;
    const imageSize = provider.imageSize ?? '1024x1024';
    const imageQuality = provider.imageQuality ?? 'medium';
    if (!['auto', '1024x1024', '1536x1024', '1024x1536'].includes(imageSize)
        || !['low', 'medium', 'high', 'auto', 'standard'].includes(imageQuality)) {
      throw new BadRequestException('Cấu hình kích thước hoặc chất lượng ảnh trên máy chủ không hợp lệ');
    }
    const base = validatePublicHttpsUrl(provider.baseUrl, 'Base URL AI tạo ảnh');
    await assertPublicHost(base);
    const response = await this.fetchJson(endpoint(base.toString(), 'images/generations'), provider.apiKey, {
      model: provider.model,
      prompt,
      n: 1,
      size: imageSize,
      quality: imageQuality,
      response_format: 'b64_json',
    }, 150_000, 18 * 1024 * 1024);
    const data = response.data;
    if (!Array.isArray(data) || !isRecord(data[0])) throw new BadGatewayException('AI tạo ảnh không trả về dữ liệu ảnh');
    let bytes: Buffer;
    let mimeType: string;
    if (typeof data[0].b64_json === 'string') {
      const encoded = data[0].b64_json;
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new BadGatewayException('Dữ liệu ảnh AI không hợp lệ');
      bytes = Buffer.from(encoded, 'base64');
      mimeType = 'image/png';
    } else if (typeof data[0].url === 'string') {
      const imageUrl = validatePublicHttpsUrl(data[0].url, 'URL ảnh AI');
      await assertPublicHost(imageUrl);
      const imageResponse = await fetch(imageUrl, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
      if (!imageResponse.ok) throw new BadGatewayException('Không tải được ảnh từ nhà cung cấp AI');
      const declaredSize = Number(imageResponse.headers.get('content-length') ?? 0);
      if (declaredSize > MAX_IMAGE_BYTES) throw new BadGatewayException('Ảnh AI vượt quá dung lượng cho phép');
      mimeType = (imageResponse.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      bytes = await this.readLimitedBody(imageResponse, MAX_IMAGE_BYTES);
    } else {
      throw new BadGatewayException('AI tạo ảnh không trả về URL hoặc dữ liệu ảnh');
    }
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new BadGatewayException('Ảnh AI không hợp lệ hoặc quá lớn');
    const ingested = await this.media.ingest(
      { buffer: bytes, filename: `ai-${Date.now()}-${index + 1}.${mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png'}`, mimetype: mimeType },
      { altText: alt, caption },
      userId,
    );
    // A deduplicated upload can return older metadata; keep the generated ALT on the reusable asset.
    const asset = await this.media.updateMeta(ingested.id, { altText: alt, caption }, userId);
    return { asset, afterHeading: spec.afterHeading };
  }

  private insertImage(html: string, asset: MediaView, afterHeading: string): string {
    const image = `<p><img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.altText ?? '')}" data-media-id="${escapeHtml(asset.id)}"></p>`
      + (asset.caption ? `<p><em>${escapeHtml(asset.caption)}</em></p>` : '');
    const headings = [...html.matchAll(/<h([2-4])>([\s\S]*?)<\/h\1>/gi)];
    if (!headings.length) return `${html}${image}`;
    const wanted = normalizeAnchor(afterHeading);
    const target = headings.find((heading) => normalizeAnchor(heading[2].replace(/<[^>]*>/g, '')) === wanted) ?? headings[0];
    const insertAt = (target.index ?? 0) + target[0].length;
    return `${html.slice(0, insertAt)}${image}${html.slice(insertAt)}`;
  }

  private async findLinkCandidates(kind: string, brief: string, currentContentId: string | null): Promise<LinkCandidate[]> {
    const now = new Date();
    const rows = await this.prisma.contentNode.findMany({
      where: {
        isDemo: false,
        publicationStatus: 'published',
        ...(currentContentId ? { id: { not: currentContentId } } : {}),
        OR: [{ publishAt: null }, { publishAt: { lte: now } }],
        routes: { some: { isCurrent: true } },
      },
      select: {
        id: true,
        kind: true,
        title: true,
        routes: { where: { isCurrent: true }, take: 1, select: { path: true } },
        property: {
          select: {
            operatingStatus: true,
            roomTypes: { where: { status: 'active' }, select: { units: { where: { active: true }, select: { id: true } }, ratePlans: { where: { active: true }, select: { baseRateVnd: true } } } },
          },
        },
        combo: { select: { days: { take: 1, select: { dayNo: true } } } },
        destination: { select: { contentId: true } },
        article: { select: { contentId: true } },
        page: { select: { contentId: true } },
      },
      take: 200,
    });
    const tokens = new Set(normalizeAnchor(brief).split(' ').filter((word) => word.length > 2));
    const eligible = rows.flatMap((row) => {
      const path = row.routes[0]?.path;
      if (!path || path.startsWith('//') || path.includes('?') || path.includes('#') || path.includes('\\')
          || path !== `/${path.split('/').filter(Boolean).join('/')}`) return [];
      if (row.kind === 'stay' && (!row.property || row.property.operatingStatus !== 'active'
          || !row.property.roomTypes.some((room) => room.units.length > 0 && room.ratePlans.some((rate) => rate.baseRateVnd > 0n)))) return [];
      if (row.kind === 'combo' && !row.combo?.days.length) return [];
      if (row.kind === 'destination' && !row.destination) return [];
      if (row.kind === 'article' && !row.article) return [];
      if (row.kind === 'page' && !row.page) return [];
      const candidate = { id: row.id, kind: row.kind, title: row.title, path, anchor: publicCandidatesAnchor(row) };
      if (countWords(candidate.anchor) < 2 || countWords(candidate.anchor) > 8) return [];
      const titleTokens = new Set(normalizeAnchor(row.title).split(' '));
      const score = [...tokens].reduce((total, token) => total + Number(titleTokens.has(token)), 0);
      return [{ ...candidate, score }];
    });
    eligible.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'vi'));
    const anchors = new Set<string>();
    return eligible.filter((row) => {
      const anchor = normalizeAnchor(row.anchor);
      if (anchors.has(anchor)) return false;
      anchors.add(anchor);
      return true;
    }).slice(0, 5).map((candidate) => ({
      id: candidate.id,
      kind: candidate.kind,
      title: candidate.title,
      path: candidate.path,
      anchor: candidate.anchor,
    }));
  }

  private async fetchJson(url: string, apiKey: string, body: unknown, timeoutMs: number, maxBytes = MAX_PROVIDER_RESPONSE_BYTES): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new HttpException('Nhà cung cấp AI phản hồi quá thời gian cho phép', 504);
      }
      throw new BadGatewayException('Không kết nối được nhà cung cấp AI. Kiểm tra địa chỉ máy chủ và kết nối mạng.');
    }
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (declaredSize > maxBytes) throw new BadGatewayException('Phản hồi AI vượt quá giới hạn cho phép');
    let responseBuffer: Buffer;
    try {
      responseBuffer = await this.readLimitedBody(response, maxBytes);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new HttpException('Nhà cung cấp AI phản hồi quá thời gian cho phép', 504);
      }
      throw new BadGatewayException('Không đọc được phản hồi từ nhà cung cấp AI');
    }
    const text = responseBuffer.toString('utf8');
    if (!response.ok) throw new BadGatewayException(`Nhà cung cấp AI trả về HTTP ${response.status}. Hãy kiểm tra API key, model và cấu hình endpoint.`);
    try {
      const json: unknown = JSON.parse(text);
      if (!isRecord(json)) throw new Error('not an object');
      return json;
    } catch {
      throw new BadGatewayException('Nhà cung cấp AI trả về JSON không hợp lệ');
    }
  }

  private async readLimitedBody(response: Response, limit: number): Promise<Buffer> {
    if (!response.body) return Buffer.alloc(0);
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new BadGatewayException('Phản hồi từ nhà cung cấp vượt quá giới hạn cho phép');
      }
      parts.push(value);
    }
    return Buffer.concat(parts.map((part) => Buffer.from(part)));
  }

  private enforceRateLimit(userId: string): void {
    const now = Date.now();
    const recent = (this.requestTimes.get(userId) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) throw new HttpException('Đã đạt giới hạn 5 lần tạo nội dung trong 10 phút. Vui lòng thử lại sau.', 429);
    recent.push(now);
    this.requestTimes.set(userId, recent);
    if (this.requestTimes.size > 2000) {
      for (const [id, times] of this.requestTimes) {
        if (!times.some((time) => now - time < RATE_WINDOW_MS)) this.requestTimes.delete(id);
      }
    }
  }

  private async readStoredSettings(): Promise<StoredSettings & { version: number }> {
    const row = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    return { ...this.parseStored(row?.value), version: row?.version ?? 0 };
  }

  private parseStored(value: unknown): StoredSettings {
    if (!isRecord(value)) return {};
    return {
      ...(isRecord(value.content) ? { content: value.content as unknown as StoredProvider } : {}),
      ...(isRecord(value.image) ? { image: value.image as unknown as StoredProvider } : {}),
    };
  }

  private resolveProvider(kind: ProviderName, stored?: StoredProvider): ProviderConfig {
    const prefix = kind === 'content' ? 'AI_CONTENT' : 'AI_IMAGE';
    const defaults = providerDefaults(kind);
    const storedKey = stored?.encryptedApiKey ? decryptProviderKey(stored.encryptedApiKey, providerSecret()) : '';
    const envKey = readEnvironmentSecret(`${prefix}_API_KEY`);
    return {
      ...defaults,
      ...stored,
      baseUrl: stored?.baseUrl ?? process.env[`${prefix}_BASE_URL`] ?? defaults.baseUrl,
      model: stored?.model ?? process.env[`${prefix}_MODEL`] ?? defaults.model,
      apiKey: storedKey || envKey,
      ...(kind === 'content' ? {
        wire: (stored?.wire ?? process.env.AI_CONTENT_WIRE ?? defaults.wire) as WireFormat,
        maxOutputTokens: stored?.maxOutputTokens ?? Number(process.env.AI_CONTENT_MAX_OUTPUT_TOKENS ?? defaults.maxOutputTokens),
      } : {
        imageSize: stored?.imageSize ?? process.env.AI_IMAGE_SIZE ?? defaults.imageSize,
        imageQuality: stored?.imageQuality ?? process.env.AI_IMAGE_QUALITY ?? defaults.imageQuality,
      }),
    } as ProviderConfig;
  }

  private updateStoredProvider(kind: ProviderName, value: unknown, current?: StoredProvider): StoredProvider {
    if (!isRecord(value)) throw new BadRequestException(`Cấu hình nhà cung cấp ${kind} không hợp lệ`);
    const prefix = kind === 'content' ? 'AI_CONTENT' : 'AI_IMAGE';
    const defaults = providerDefaults(kind);
    const baseUrl = cleanString(value.baseUrl ?? current?.baseUrl ?? defaults.baseUrl, 'Base URL', 500, true);
    validatePublicHttpsUrl(baseUrl, 'Base URL');
    const model = cleanString(value.model ?? current?.model ?? defaults.model, 'model', 120);
    const apiKeyInput = value.apiKey === undefined ? '' : cleanString(value.apiKey, 'API key', 2000);
    const clearApiKey = value.clearApiKey === true;
    const encryptedApiKey = clearApiKey
      ? undefined
      : apiKeyInput
        ? encryptProviderKey(apiKeyInput, providerSecret())
        : current?.encryptedApiKey;
    const next: StoredProvider = { baseUrl, model, ...(encryptedApiKey ? { encryptedApiKey } : {}) };
    if (kind === 'content') {
      const wire = value.wire ?? current?.wire ?? defaults.wire;
      if (wire !== 'responses' && wire !== 'chat_completions') throw new BadRequestException('Chọn kiểu API nội dung hợp lệ');
      const maxOutputTokens = Number(value.maxOutputTokens ?? current?.maxOutputTokens ?? defaults.maxOutputTokens);
      if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 256 || maxOutputTokens > 30_000) {
        throw new BadRequestException('Giới hạn token phải từ 256 đến 30000');
      }
      next.wire = wire;
      next.maxOutputTokens = maxOutputTokens;
    } else {
      const imageSize = cleanString(value.imageSize ?? current?.imageSize ?? defaults.imageSize, 'kích thước ảnh', 32, true);
      if (!['auto', '1024x1024', '1536x1024', '1024x1536'].includes(imageSize)) throw new BadRequestException('Kích thước ảnh không hợp lệ');
      const imageQuality = cleanString(value.imageQuality ?? current?.imageQuality ?? defaults.imageQuality, 'chất lượng ảnh', 20, true);
      if (!['low', 'medium', 'high', 'auto', 'standard'].includes(imageQuality)) throw new BadRequestException('Chất lượng ảnh không hợp lệ');
      next.imageSize = imageSize;
      next.imageQuality = imageQuality;
    }
    // Keys may be supplied through environment variables; a blank key is deliberately not persisted.
    if (!encryptedApiKey && process.env[`${prefix}_API_KEY`]) return next;
    return next;
  }

  private safeAuditState(settings: StoredSettings): Record<string, unknown> {
    const view = (provider?: StoredProvider) => ({
      baseUrl: provider?.baseUrl ?? null,
      model: provider?.model ?? null,
      keyConfigured: !!provider?.encryptedApiKey,
      ...(provider?.wire ? { wire: provider.wire } : {}),
      ...(provider?.imageSize ? { imageSize: provider.imageSize } : {}),
      ...(provider?.imageQuality ? { imageQuality: provider.imageQuality } : {}),
    });
    return { content: view(settings.content), image: view(settings.image) };
  }
}
