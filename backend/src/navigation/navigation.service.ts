import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/types';
import type { NavigationItemInputDto } from './navigation.dto';
import { pathForContent } from '../content/slug';

const PRIMARY_MENU_KEY = 'primary';

const DEFAULT_PRIMARY_ITEMS = [
  { label: 'Trang chủ', externalUrl: '/' },
  { label: 'Phòng nghỉ', externalUrl: '/phong-nghi' },
  { label: 'Combo du lịch', externalUrl: '/combo-du-lich' },
  { label: 'Điểm đến', externalUrl: '/diem-den' },
  { label: 'Liên hệ', externalUrl: '/lien-he' },
] as const;

type NavigationMenuWithItems = {
  id: string;
  key: string;
  name: string;
  items: Array<{
    id: string;
    label: string;
    contentId: string | null;
    externalUrl: string | null;
    position: number;
    enabled: boolean;
    content: {
      kind: string;
      slugSource: string | null;
      publicationStatus: string;
      publishAt: Date | null;
      routes: Array<{ path: string }>;
    } | null;
  }>;
};

function publicHref(value: string | null | undefined): string | null {
  const href = value?.trim();
  if (!href || /[\u0000-\u001f\\]/.test(href)) return null;
  if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/admin') && !href.startsWith('/api')) return href;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

@Injectable()
export class NavigationService {
  constructor(private readonly prisma: PrismaService) {}

  async adminPrimaryMenu() {
    const menu = (await this.prisma.navigationMenu.findUnique({
      where: { key: PRIMARY_MENU_KEY },
      include: {
        items: {
          include: { content: { include: { routes: { where: { isCurrent: true }, take: 1 } } } },
          orderBy: { position: 'asc' },
        },
      },
    })) as NavigationMenuWithItems | null;

    if (!menu) {
      return {
        key: PRIMARY_MENU_KEY,
        name: 'Menu chính',
        isDefault: true,
        items: DEFAULT_PRIMARY_ITEMS.map((item, position) => ({
          id: `default-${position}`,
          label: item.label,
          contentId: null,
          externalUrl: item.externalUrl,
          href: item.externalUrl,
          kind: null,
          publicationStatus: null,
          position,
          enabled: true,
        })),
      };
    }

    return {
      key: menu.key,
      name: menu.name,
      isDefault: false,
      items: menu.items.map((item) => ({
        id: item.id,
        label: item.label,
        contentId: item.contentId,
        externalUrl: item.externalUrl,
        href: item.content?.kind === 'page' && item.content.slugSource
          ? pathForContent('page', item.content.slugSource)
          : item.content?.routes[0]?.path ?? publicHref(item.externalUrl),
        kind: item.content?.kind ?? null,
        publicationStatus: item.content?.publicationStatus ?? null,
        position: item.position,
        enabled: item.enabled,
      })),
    };
  }

  async publicMenu(key: string) {
    if (key !== PRIMARY_MENU_KEY) throw new BadRequestException('Menu không hợp lệ');
    const menu = (await this.prisma.navigationMenu.findUnique({
      where: { key },
      include: {
        items: {
          where: { enabled: true },
          include: { content: { include: { routes: { where: { isCurrent: true }, take: 1 } } } },
          orderBy: { position: 'asc' },
        },
      },
    })) as NavigationMenuWithItems | null;

    if (!menu) {
      return DEFAULT_PRIMARY_ITEMS.map((item) => ({ label: item.label, href: item.externalUrl }));
    }

    const now = new Date();
    return menu.items.flatMap((item) => {
      if (item.contentId) {
        const content = item.content;
        const href = content?.slugSource ? pathForContent('page', content.slugSource) : content?.routes[0]?.path;
        if (
          content?.kind !== 'page' ||
          content.publicationStatus !== 'published' ||
          (content.publishAt && content.publishAt > now) ||
          !href
        ) return [];
        return [{ label: item.label, href }];
      }
      const href = publicHref(item.externalUrl);
      return href ? [{ label: item.label, href }] : [];
    });
  }

  async updatePrimaryMenu(input: NavigationItemInputDto[], user: AuthenticatedUser) {
    if (!Array.isArray(input) || input.length > 30) {
      throw new BadRequestException('Menu chính tối đa 30 mục');
    }

    const seenContent = new Set<string>();
    const normalized = input.map((item, index) => {
      const label = item.label.trim();
      if (!label) throw new BadRequestException(`Mục ${index + 1} cần có tên hiển thị`);
      const hasContent = !!item.contentId;
      const hasUrl = !!item.externalUrl?.trim();
      if (hasContent === hasUrl) throw new BadRequestException(`Mục “${label}” phải chọn một chuyên trang hoặc một đường dẫn`);

      if (hasContent) {
        if (seenContent.has(item.contentId!)) throw new BadRequestException('Không thể thêm cùng một chuyên trang nhiều lần');
        seenContent.add(item.contentId!);
        return { ...item, label, position: index, contentId: item.contentId!, externalUrl: null };
      }

      const externalUrl = publicHref(item.externalUrl);
      if (!externalUrl) throw new BadRequestException(`Đường dẫn của “${label}” không hợp lệ`);
      return { ...item, label, position: index, contentId: null, externalUrl };
    });

    const linkedIds = normalized.flatMap((item) => item.contentId ? [item.contentId] : []);
    if (linkedIds.length) {
      const pages = await this.prisma.contentNode.findMany({
        where: { id: { in: linkedIds }, kind: 'page' },
        select: { id: true },
      });
      if (pages.length !== linkedIds.length) throw new BadRequestException('Menu chỉ có thể liên kết nội dung thuộc loại chuyên trang');
    }

    await this.prisma.$transaction(async (tx) => {
      const menu = await tx.navigationMenu.upsert({
        where: { key: PRIMARY_MENU_KEY },
        create: { key: PRIMARY_MENU_KEY, name: 'Menu chính' },
        update: {},
      });
      const current = await tx.navigationItem.findMany({ where: { menuId: menu.id }, select: { id: true } });
      const currentIds = new Set(current.map((item) => item.id));
      await tx.navigationItem.deleteMany({ where: { menuId: menu.id } });
      if (normalized.length) {
        await tx.navigationItem.createMany({
          data: normalized.map((item) => ({
            ...(item.id && currentIds.has(item.id) ? { id: item.id } : {}),
            menuId: menu.id,
            label: item.label,
            contentId: item.contentId,
            externalUrl: item.externalUrl,
            position: item.position,
            enabled: item.enabled,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'navigation.primary.update',
          entityType: 'navigation_menu',
          entityId: menu.id,
          diff: { itemCount: normalized.length, labels: normalized.map((item) => item.label) },
        },
      });
    });

    return this.adminPrimaryMenu();
  }

  async resetPrimaryMenu(user: AuthenticatedUser) {
    await this.prisma.$transaction(async (tx) => {
      const menu = await tx.navigationMenu.findUnique({
        where: { key: PRIMARY_MENU_KEY },
        select: { id: true, items: { select: { id: true } } },
      });
      if (!menu) return;

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'navigation.primary.reset',
          entityType: 'navigation_menu',
          entityId: menu.id,
          diff: { resetToDefault: true, removedItems: menu.items.length },
        },
      });
      await tx.navigationMenu.delete({ where: { id: menu.id } });
    });

    return this.adminPrimaryMenu();
  }
}
