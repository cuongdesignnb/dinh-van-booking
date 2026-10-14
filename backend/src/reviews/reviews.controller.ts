import { BadRequestException, Controller, ForbiddenException, Headers, HttpCode, PayloadTooLargeException, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { GuestSessionContext } from '../auth/auth.service';
import { Public } from '../common/decorators';
import { loadConfig } from '../common/config/env';
import type { AuthenticatedUser } from '../common/types';
import { MAX_REVIEW_PHOTOS } from './review-input';
import { ReviewsService, type ReviewPhotoUpload } from './reviews.service';

const FIELD_NAMES = new Set(['stay', 'rating', 'name', 'phone', 'body', 'stayedMonth', 'source', 'consent', 'website']);

/** Guest review submission: multipart text fields plus up to five photos. */
@Controller('reviews')
export class ReviewsController {
  private readonly config = loadConfig();

  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Post()
  @HttpCode(201)
  async submit(@Req() request: FastifyRequest, @Headers('idempotency-key') key: string) {
    const scoped = request as FastifyRequest & { user?: AuthenticatedUser; guestSession?: GuestSessionContext | null };
    const principal = scoped.user ? `user:${scoped.user.id}` : scoped.guestSession ? `guest:${scoped.guestSession.id}` : null;
    if (!principal) throw new ForbiddenException('Cần phiên bảo mật trước khi gửi đánh giá');
    if (!request.isMultipart()) throw new BadRequestException('Yêu cầu phải là multipart/form-data');

    const fields: Record<string, string> = {};
    const photos: ReviewPhotoUpload[] = [];
    try {
      for await (const part of request.parts({ limits: { files: MAX_REVIEW_PHOTOS, fields: 12, fileSize: this.config.mediaMaxBytes, fieldSize: 8 * 1024 } })) {
        if (part.type === 'file') {
          if (part.fieldname !== 'photos') { await part.toBuffer(); continue; }
          photos.push({ buffer: await part.toBuffer(), filename: part.filename, mimetype: part.mimetype });
        } else if (FIELD_NAMES.has(part.fieldname) && typeof part.value === 'string') {
          fields[part.fieldname] = part.value;
        }
      }
    } catch (error) {
      const code = (error as { code?: string }).code ?? '';
      if (code.includes('FILES_LIMIT')) throw new BadRequestException(`Tối đa ${MAX_REVIEW_PHOTOS} ảnh cho mỗi đánh giá`);
      if (code.includes('FILE_TOO_LARGE') || code.includes('REQ_FILE_TOO_LARGE')) throw new PayloadTooLargeException('Mỗi ảnh tối đa 10 MB');
      throw new BadRequestException('Không đọc được dữ liệu gửi lên');
    }
    return this.reviews.submit(fields, photos, {
      principal,
      guestSessionId: scoped.guestSession?.id ?? null,
      ip: request.ip,
      idempotencyKey: key,
    });
  }
}
