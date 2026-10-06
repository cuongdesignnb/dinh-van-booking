/**
 * Server-side shape for the `about.page` setting. The Admin form is only a
 * convenience: whatever arrives here is rebuilt field by field. Unknown keys are
 * dropped, short texts are trimmed and length-checked, rich fields go through
 * the same TipTap whitelist as articles, media fields must be media UUIDs (their
 * existence is checked by SettingsService like every other `*MediaId`), and
 * links on the local-area cards must stay on this site.
 */
import { BadRequestException } from '@nestjs/common';
import { sanitizeDocument, type RichNode } from '../content/document';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEM_ID = /^[a-z0-9][a-z0-9-]{0,47}$/;

export const ABOUT_VALUE_ICONS = ['check', 'message', 'shield', 'phone', 'heart', 'leaf', 'map', 'house'] as const;
export const ABOUT_AREA_ICONS = ['trees', 'mountain', 'house', 'waves', 'map'] as const;

/** field -> [Vietnamese label, max length] */
const TEXT_FIELDS: Record<string, [string, number]> = {
  heroEyebrow: ['Lời dẫn đầu trang', 80],
  title: ['Tiêu đề trang (H1)', 120],
  phoneCtaLabel: ['Nhãn nút gọi điện', 60],
  zaloCtaLabel: ['Nhãn nút Zalo', 60],
  contactCtaLabel: ['Nhãn nút gửi yêu cầu', 60],
  storyTitle: ['Tiêu đề câu chuyện', 120],
  greeting: ['Lời chào viết tay', 120],
  signatureNote: ['Dòng chữ ký', 120],
  quote: ['Câu trích nổi bật', 300],
  valuesTitle: ['Tiêu đề khối giá trị', 120],
  valuesIntro: ['Mô tả khối giá trị', 300],
  stepsTitle: ['Tiêu đề các bước', 120],
  stepsIntro: ['Mô tả các bước', 300],
  areasTitle: ['Tiêu đề khối địa phương', 120],
  areasIntro: ['Mô tả khối địa phương', 400],
  faqTitle: ['Tiêu đề FAQ', 120],
  ctaTitle: ['Tiêu đề dải kêu gọi', 120],
  ctaStaysLabel: ['Nhãn nút xem chỗ nghỉ', 60],
  areaServed: ['Khu vực phục vụ', 200],
  seoTitle: ['Tiêu đề SEO', 70],
  seoDescription: ['Mô tả SEO', 170],
  ogDescription: ['Mô tả khi chia sẻ', 200],
};
const RICH_FIELDS: Record<string, string> = {
  intro: 'Giới thiệu ngắn',
  story: 'Câu chuyện',
  ctaText: 'Nội dung dải kêu gọi',
};
const MEDIA_FIELDS: Record<string, string> = {
  heroImageMediaId: 'Ảnh đầu trang',
  portraitMediaId: 'Ảnh chân dung',
  ogImageMediaId: 'Ảnh chia sẻ',
};

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new BadRequestException(`Trang Về mình – ${message}`);
}

function text(value: unknown, label: string, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') fail(`${label}: phải là văn bản.`);
  const trimmed = value.trim();
  if (trimmed.length > max) fail(`${label}: tối đa ${max} ký tự (hiện ${trimmed.length}).`);
  return trimmed || null;
}

function rich(value: unknown, label: string, allowedBlocks: string[]): RichNode | null {
  if (value === null || value === undefined) return null;
  // Older drafts stored short rich fields as plain strings; keep them as paragraphs.
  if (typeof value === 'string') {
    const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;
    value = { type: 'doc', content: lines.map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] })) };
  }
  if (!isRecord(value) || value.type !== 'doc') fail(`${label}: nội dung soạn thảo không hợp lệ.`);
  return sanitizeDocument(value, { allowedBlocks });
}

function mediaId(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !UUID.test(value)) fail(`${label}: hãy chọn ảnh từ Media Library.`);
  return value.toLowerCase();
}

function internalPath(value: unknown, label: string): string | null {
  const target = text(value, label, 200);
  if (!target) return null;
  if (!target.startsWith('/') || target.startsWith('//') || /[\s\u0000-\u001f\\]/.test(target)) {
    fail(`${label}: chỉ nhận đường dẫn nội bộ bắt đầu bằng / (ví dụ /diem-den).`);
  }
  return target;
}

function list<T>(value: unknown, label: string, max: number, prefix: string, item: (row: Rec, name: string) => T): Array<T & { id: string; enabled: boolean }> {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) fail(`${label}: phải là danh sách.`);
  if (value.length > max) fail(`${label}: tối đa ${max} mục.`);
  const seen = new Set<string>();
  return value.map((row, index) => {
    const name = `${label} ${index + 1}`;
    if (!isRecord(row)) fail(`${name}: định dạng không hợp lệ.`);
    // Ids only keep React keys and anchors stable; a missing or clashing id is regenerated.
    let id = typeof row.id === 'string' && ITEM_ID.test(row.id) ? row.id : `${prefix}-${index + 1}`;
    for (let n = 2; seen.has(id); n += 1) id = `${prefix}-${index + 1}-${n}`;
    seen.add(id);
    if (row.enabled !== undefined && typeof row.enabled !== 'boolean') fail(`${name}: trạng thái hiển thị không hợp lệ.`);
    return { id, enabled: row.enabled !== false, ...item(row, name) };
  });
}

function icon<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number], label: string): T[number] {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !allowed.includes(value)) fail(`${label}: biểu tượng không hợp lệ.`);
  return value as T[number];
}

function requiredTitle(value: unknown, name: string, max = 120): string {
  const title = text(value, `${name} – tiêu đề`, max);
  if (!title) fail(`${name}: nhập tiêu đề hoặc xoá mục này.`);
  return title;
}

export function normalizeAboutPage(input: unknown, options: { allowedBlocks: string[] }): Rec {
  if (!isRecord(input)) fail('giá trị phải là một đối tượng.');
  const { allowedBlocks } = options;
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') fail('trạng thái hiển thị không hợp lệ.');
  if (input.showFaq !== undefined && typeof input.showFaq !== 'boolean') fail('trạng thái hiển thị FAQ không hợp lệ.');

  const out: Rec = { enabled: input.enabled === true };
  for (const [key, [label, max]] of Object.entries(TEXT_FIELDS)) out[key] = text(input[key], label, max);
  for (const [key, label] of Object.entries(RICH_FIELDS)) out[key] = rich(input[key], label, allowedBlocks);
  for (const [key, label] of Object.entries(MEDIA_FIELDS)) out[key] = mediaId(input[key], label);
  if (out.enabled && !out.title) fail('Tiêu đề trang (H1) không được để trống khi trang đang bật.');

  out.values = list(input.values, 'Giá trị', 8, 'value', (row, name) => ({
    icon: icon(row.icon, ABOUT_VALUE_ICONS, 'check', name),
    title: requiredTitle(row.title, name),
    text: text(row.text, `${name} – mô tả`, 400) ?? '',
  }));
  out.steps = list(input.steps, 'Bước', 8, 'step', (row, name) => ({
    title: requiredTitle(row.title, name),
    text: text(row.text, `${name} – mô tả`, 400) ?? '',
  }));
  out.areas = list(input.areas, 'Thẻ địa phương', 8, 'area', (row, name) => ({
    icon: icon(row.icon, ABOUT_AREA_ICONS, 'trees', name),
    title: requiredTitle(row.title, name),
    text: text(row.text, `${name} – mô tả`, 500) ?? '',
    linkLabel: text(row.linkLabel, `${name} – nhãn liên kết`, 60),
    linkTarget: internalPath(row.linkTarget, `${name} – đường dẫn`),
    imageMediaId: mediaId(row.imageMediaId, `${name} – ảnh`),
  }));
  out.showFaq = input.showFaq === true;
  out.faqs = list(input.faqs, 'Câu hỏi', 12, 'faq', (row, name) => {
    const question = text(row.question, `${name} – câu hỏi`, 200);
    const answer = rich(row.answer, `${name} – câu trả lời`, allowedBlocks);
    if (!question) fail(`${name}: nhập câu hỏi hoặc xoá mục này.`);
    return { question, answer };
  });
  return out;
}
