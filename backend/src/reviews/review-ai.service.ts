import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { endpoint, extractResponseText, postProviderJson } from '../ai/ai-provider.client';
import { assertPublicHost, validatePublicHttpsUrl } from '../ai/safe-network';
import { maskPersonalData, sanitizeAiReply } from '../chat/chat-text';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const TIMEOUT_MS = 60_000;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * AI helpers for real guest reviews: a draft owner reply and a review request
 * message. Both are drafts a person edits and sends; nothing here writes or
 * invents a review.
 */
@Injectable()
export class ReviewAiService {
  private readonly logger = new Logger(ReviewAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly ai: AiService,
  ) {}

  async replySuggest(reviewId: string): Promise<{ draft: string }> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { rating: true, body: true, authorName: true, isDemo: true, content: { select: { title: true } } },
    });
    if (!review || review.isDemo) throw new NotFoundException('Không tìm thấy đánh giá');
    const brand = await this.brandName();
    const system = [
      `Bạn soạn NHÁP câu trả lời công khai của ${brand} cho một đánh giá thật của khách về nơi lưu trú "${review.content.title}". Nhân viên sẽ đọc, sửa rồi mới đăng.`,
      'Yêu cầu: cảm ơn khách bằng tên, phản hồi đúng ý khách nêu; nếu đánh giá có điểm chưa hài lòng thì xin lỗi chân thành và nói sẽ ghi nhận để cải thiện.',
      'Không hứa bồi thường, giảm giá, quà tặng hay bất kỳ cam kết nào. Không bịa thông tin về cơ sở. Không nhắc số điện thoại hay thông tin cá nhân.',
      'Văn phong thân thiện, lịch sự, tối đa khoảng 80 từ, tiếng Việt (hoặc ngôn ngữ khách dùng), văn bản thuần không markdown.',
    ].join('\n');
    const user = `Khách: ${review.authorName}\nSố sao: ${review.rating}/5\nĐánh giá: ${maskPersonalData(review.body)}`;
    return { draft: await this.complete(system, user) };
  }

  async inviteMessage(contentId: unknown, link: unknown): Promise<{ message: string; aiUsed: boolean }> {
    if (typeof contentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(contentId)) throw new BadRequestException('Chọn nơi lưu trú');
    let url: URL;
    try { url = new URL(String(link)); } catch { throw new BadRequestException('Link đánh giá không hợp lệ'); }
    if (!/^https?:$/.test(url.protocol) || !url.pathname.startsWith('/phong-nghi/')) throw new BadRequestException('Link đánh giá không hợp lệ');
    const content = await this.prisma.contentNode.findFirst({ where: { id: contentId, kind: 'stay' }, select: { title: true } });
    if (!content) throw new NotFoundException('Không tìm thấy nơi lưu trú');
    const brand = await this.brandName();
    const fallback = `Chào anh/chị, cảm ơn anh/chị đã lưu trú tại ${content.title}. Nếu tiện, anh/chị cho ${brand} xin vài dòng đánh giá (kèm ảnh nếu có) tại đây: ${url.toString()}\nĐánh giá thật của anh/chị giúp những khách sau chọn chỗ nghỉ phù hợp hơn. Cảm ơn anh/chị nhiều!`;
    const system = [
      `Bạn soạn tin nhắn Zalo ngắn để ${brand} xin khách vừa lưu trú tại "${content.title}" để lại đánh giá trên website.`,
      'Yêu cầu bắt buộc: lịch sự, ngắn (tối đa khoảng 60 từ), xưng "anh/chị". Đặt nguyên văn đường link được cung cấp trong tin nhắn.',
      'Không xin đánh giá 5 sao hay đánh giá tốt; mời khách chia sẻ trải nghiệm thật, khen hay góp ý đều được. Không hứa quà, giảm giá hay bất kỳ lợi ích nào để đổi lấy đánh giá.',
      'Văn bản thuần, không markdown.',
    ].join('\n');
    try {
      let message = await this.complete(system, `Đường link: ${url.toString()}`);
      if (!message.includes(url.toString())) message = `${message}\n${url.toString()}`;
      return { message, aiUsed: true };
    } catch (error) {
      this.logger.warn(`Review invite message fell back to template: ${error instanceof Error ? error.message : String(error)}`);
      return { message: fallback, aiUsed: false };
    }
  }

  private async brandName(): Promise<string> {
    const identity = await this.settings.get<Record<string, unknown>>('brand.identity');
    return text(identity?.name) ?? 'chúng mình';
  }

  private async complete(system: string, user: string): Promise<string> {
    const provider = await this.ai.contentProvider();
    if (!provider.apiKey || !provider.model) throw new BadRequestException('Chưa cấu hình AI (Cài đặt › AI viết nội dung)');
    const base = validatePublicHttpsUrl(provider.baseUrl, 'Base URL AI');
    await assertPublicHost(base);
    const body = provider.wire === 'responses'
      ? { model: provider.model, instructions: system, input: user, max_output_tokens: 600, store: false }
      : { model: provider.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 600 };
    const response = await postProviderJson(endpoint(base.toString(), provider.wire === 'responses' ? 'responses' : 'chat/completions'), provider.apiKey, body, TIMEOUT_MS, 256 * 1024);
    const draft = sanitizeAiReply(extractResponseText(response, provider.wire));
    if (!draft) throw new BadRequestException('AI chưa trả về nội dung, hãy thử lại');
    return draft;
  }
}
