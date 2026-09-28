import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { isReservedSlug, pathForContent, slugify } from './slug';

/** Update never consults the title: only an explicitly different slug can move a route. */
export function resolveUpdatedSlug(current: string, requested: string | undefined): string {
  if (requested === undefined) return current;
  if (!requested.trim()) throw new BadRequestException('Slug đường dẫn không được để trống');
  const normalized = slugify(requested);
  if (normalized === current) return current;
  if (isReservedSlug(normalized)) throw new BadRequestException('Slug này là đường dẫn hệ thống được bảo vệ. Hãy chọn slug khác.');
  return normalized;
}

/** Both the content node update and route switch must run in the caller's transaction. */
export async function switchCurrentRoute(
  tx: Prisma.TransactionClient,
  contentId: string,
  kind: string,
  nextSlug: string,
): Promise<void> {
  const path = pathForContent(kind, nextSlug);
  const owner = await tx.publicRoute.findUnique({ where: { path }, select: { contentId: true } });
  if (owner && owner.contentId !== contentId) {
    throw new ConflictException('Đường dẫn này đã được nội dung khác sử dụng. Hãy chọn slug khác.');
  }
  await tx.publicRoute.updateMany({
    where: { contentId, isCurrent: true },
    data: { isCurrent: false, redirectStatus: 308 },
  });
  // Re-activate a historical route owned by this content instead of creating a
  // duplicate path. The immediately previous current route becomes a 308.
  await tx.publicRoute.upsert({
    where: { path },
    create: { contentId, path, isCurrent: true, redirectStatus: 308 },
    update: { isCurrent: true, redirectStatus: 308 },
  });
}
