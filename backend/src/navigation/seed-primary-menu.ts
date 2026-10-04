import type { PrismaClient } from '../generated/prisma/client';

export const STANDARD_PRIMARY_MENU = [
  { label: 'Trang chủ', externalUrl: '/' },
  { label: 'Phòng nghỉ', externalUrl: '/phong-nghi' },
  { label: 'Combo du lịch', externalUrl: '/combo-du-lich' },
  { label: 'Điểm đến', externalUrl: '/diem-den' },
  { label: 'Tra cứu phòng', externalUrl: '/lich-phong' },
  { label: 'Liên hệ', externalUrl: '/lien-he' },
] as const;

export async function seedPrimaryMenu(prisma: PrismaClient): Promise<number> {
  return prisma.$transaction(async (tx) => {
    // Serializes concurrent seed runs; admin edits remain protected by row lock.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(174823091)`;
    const menu = await tx.navigationMenu.upsert({ where: { key: 'primary' }, create: { key: 'primary', name: 'Menu chính' }, update: {} });
    await tx.$queryRaw`SELECT id FROM navigation_menus WHERE id = ${menu.id}::uuid FOR UPDATE`;
    const items = await tx.navigationItem.findMany({ where: { menuId: menu.id }, include: { content: { select: { routes: { where: { isCurrent: true }, select: { path: true } } } } } });
    const path = (value: string) => value.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    const existing = new Set(items.flatMap((item) => item.externalUrl ? [path(item.externalUrl)] : item.content?.routes.map((route) => path(route.path)) ?? []));
    let position = items.reduce((max, item) => Math.max(max, item.position), -1) + 1;
    const missing = STANDARD_PRIMARY_MENU.filter((item) => !existing.has(item.externalUrl));
    if (missing.length) await tx.navigationItem.createMany({ data: missing.map((item) => ({ ...item, menuId: menu.id, contentId: null, enabled: true, position: position++ })) });
    return missing.length;
  });
}
