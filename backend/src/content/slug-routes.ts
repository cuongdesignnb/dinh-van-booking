import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { pathForContent } from './slug';

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
