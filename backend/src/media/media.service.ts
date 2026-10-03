import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp, { type Metadata, type Sharp } from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SETTINGS_BY_KEY } from '../settings/settings.registry';
import { loadConfig } from '../common/config/env';
import type { Paginated } from '../common/types';
import { normalizeUploadMetadata } from './media-upload-metadata';

function settingMediaReferences(value: unknown, id: string, path = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => settingMediaReferences(item, id, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const next = path ? `${path}.${key}` : key;
    if ((key === 'mediaId' || /MediaId$/.test(key)) && child === id) return [next];
    return settingMediaReferences(child, id, next);
  });
}

export interface MediaProcessingSettings {
  convertToWebp: boolean;
  deleteOriginal: boolean;
  quality: number;
  maxWidth: number;
  maxBytes: number;
  allowedMimeTypes: string[];
  renditions: Array<{ name: string; width: number }>;
  stripMetadata: boolean;
}

export interface MediaView {
  id: string;
  url: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  byteSize: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  renditions: Record<string, { url: string; width: number }>;
  createdAt: string;
  usage: { count: number; inUse: boolean };
}

/** Shared by uploads and the read-only bootstrap preview for identical SHA dedupe. */
export async function encodeMediaWebp(
  source: Buffer,
  rules: MediaProcessingSettings,
  targetWidth: number,
  animated: boolean,
): Promise<{ data: Buffer; width: number; height: number }> {
  let pipeline = sharp(source, { animated }).rotate();
  if (rules.stripMetadata === false) pipeline = pipeline.withMetadata();
  pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true });
  const { data, info } = await pipeline
    .webp({ quality: Math.min(Math.max(rules.quality, 40), 100), effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly config = loadConfig();

  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService) {}

  /**
   * Takes an uploaded image, re-encodes it as WebP and stores only that file.
   * The uploaded bytes never reach the disk in their original format, so there
   * is no JPEG/PNG left behind to clean up later.
   */
  async ingest(
    file: { buffer: Buffer; filename: string; mimetype: string },
    meta: { altText?: string; caption?: string },
    userId: string,
    ownership: { organizationId?: string; visibility?: 'public' | 'private' } = {},
  ): Promise<MediaView> {
    const rules = await this.settings.get<MediaProcessingSettings>('media.processing');

    if (!rules.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Định dạng ${file.mimetype} không được phép`);
    }
    if (file.buffer.byteLength > Math.min(rules.maxBytes, this.config.mediaMaxBytes)) {
      throw new BadRequestException('Ảnh vượt quá dung lượng cho phép');
    }

    let pipeline: Sharp;
    let probe: Metadata;
    try {
      pipeline = sharp(file.buffer, { animated: file.mimetype === 'image/gif' });
      probe = await pipeline.metadata();
    } catch {
      throw new BadRequestException('Tệp tải lên không phải ảnh hợp lệ');
    }
    if (!probe.width || !probe.height) throw new BadRequestException('Không đọc được kích thước ảnh');

    const encoded = await encodeMediaWebp(file.buffer, rules, rules.maxWidth, file.mimetype === 'image/gif');
    const sha = createHash('sha256').update(encoded.data).digest('hex');
    const uploadMetadata = normalizeUploadMetadata(file.filename, meta.altText, meta.caption);

    // The same picture uploaded twice reuses one file instead of filling the volume.
    const existing = await this.prisma.mediaAsset.findFirst({ where: {
      sha256: sha,
      ...(ownership.visibility === 'private' && ownership.organizationId ? {
        OR: [{ visibility: 'public' }, { visibility: 'private', ownerOrganizationId: ownership.organizationId }],
      } : {}),
    } });
    if (existing) return this.getOne(existing.id);

    const now = new Date();
    const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const baseName = randomUUID();
    const storageKey = `${folder}/${baseName}.webp`;
    await this.writeFile(storageKey, encoded.data);

    const renditions: Record<string, { url: string; width: number }> = {};
    for (const rendition of rules.renditions) {
      if (rendition.width >= encoded.width) continue;
      const variant = await encodeMediaWebp(file.buffer, rules, rendition.width, file.mimetype === 'image/gif');
      const key = `${folder}/${baseName}-${rendition.name}.webp`;
      await this.writeFile(key, variant.data);
      renditions[rendition.name] = { url: this.publicUrl(key), width: variant.width };
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        storageKey,
        originalFilename: uploadMetadata.originalFilename,
        // What we stored, not what was uploaded: the original format is gone.
        mimeType: 'image/webp',
        byteSize: BigInt(encoded.data.byteLength),
        width: encoded.width,
        height: encoded.height,
        altText: uploadMetadata.altText,
        caption: uploadMetadata.caption,
        sha256: sha,
        renditions: renditions as object,
        processingStatus: 'ready',
        visibility: ownership.visibility ?? 'public',
        ownerOrganizationId: ownership.organizationId ?? null,
        uploadedById: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'media.upload',
        entityType: 'media_asset',
        entityId: asset.id,
        diff: {
          uploadedAs: file.mimetype,
          storedAs: 'image/webp',
          originalBytes: file.buffer.byteLength,
          storedBytes: encoded.data.byteLength,
        } as object,
      },
    });

    this.logger.log(
      `Stored ${storageKey} as WebP (${file.mimetype} ${file.buffer.byteLength}B -> ${encoded.data.byteLength}B)`,
    );
    return this.toView(asset);
  }

  private async writeFile(storageKey: string, data: Buffer): Promise<void> {
    const target = join(this.config.mediaRoot, storageKey);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  async list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<Paginated<MediaView>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 24));
    const where = params.search
      ? {
          OR: [
            { originalFilename: { contains: params.search, mode: 'insensitive' as const } },
            { altText: { contains: params.search, mode: 'insensitive' as const } },
            { caption: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    const usage = await this.usageCounts(rows.map((row) => row.id));
    return {
      items: rows.map((row) => this.toView(row, usage.get(row.id) ?? 0)),
      page,
      pageSize,
      total,
    };
  }

  async getOne(id: string): Promise<MediaView> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Không tìm thấy ảnh');
    const usage = await this.usageCounts([asset.id]);
    return this.toView(asset, usage.get(asset.id) ?? 0);
  }

  async updateMeta(
    id: string,
    data: { altText?: string | null; caption?: string | null },
    userId: string,
  ): Promise<MediaView> {
    const asset = await this.prisma.mediaAsset.update({
      where: { id },
      data: { altText: data.altText ?? null, caption: data.caption ?? null },
    });
    await this.prisma.auditLog.create({
      data: { actorId: userId, action: 'media.update', entityType: 'media_asset', entityId: id },
    });
    const usage = await this.usageCounts([asset.id]);
    return this.toView(asset, usage.get(asset.id) ?? 0);
  }

  /** Refuses to delete an asset still referenced by content or public settings. */
  async remove(id: string, userId: string): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Không tìm thấy ảnh');
    const useCount = (await this.usageCounts([id])).get(id) ?? 0;
    if (useCount > 0) {
      throw new ConflictException({
        code: 'media_in_use',
        message: `Ảnh đang được dùng ở ${useCount} nơi. Gỡ khỏi nội dung hoặc cài đặt trước khi xoá.`,
      });
    }

    const renditions = (asset.renditions ?? {}) as Record<string, { url: string }>;
    const keys = [
      asset.storageKey,
      ...Object.values(renditions).map((r) => r.url.replace(`${this.config.mediaPublicBase}/`, '')),
    ];
    for (const key of keys) {
      await unlink(join(this.config.mediaRoot, key)).catch(() => undefined);
    }

    await this.prisma.mediaAsset.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'media.delete',
        entityType: 'media_asset',
        entityId: id,
        diff: { storageKey: asset.storageKey } as object,
      },
    });
  }

  private publicUrl(storageKey: string): string {
    return `${this.config.mediaPublicBase}/${storageKey}`;
  }

  /** Counts content, Open Graph, and registered-setting references for list/get/delete. */
  private async usageCounts(ids: string[]): Promise<Map<string, number>> {
    const uniqueIds = [...new Set(ids)];
    const counts = new Map(uniqueIds.map((id) => [id, 0]));
    if (!uniqueIds.length) return counts;

    const [contentMedia, openGraphContent, settings] = await Promise.all([
      this.prisma.contentMedia.findMany({
        where: { mediaId: { in: uniqueIds } },
        select: { mediaId: true },
      }),
      this.prisma.contentNode.findMany({
        where: { ogMediaId: { in: uniqueIds } },
        select: { ogMediaId: true },
      }),
      this.prisma.setting.findMany({
        where: { key: { in: [...SETTINGS_BY_KEY.keys()] } },
        select: { key: true, value: true },
      }),
    ]);

    for (const reference of contentMedia) {
      counts.set(reference.mediaId, (counts.get(reference.mediaId) ?? 0) + 1);
    }
    for (const reference of openGraphContent) {
      if (reference.ogMediaId) counts.set(reference.ogMediaId, (counts.get(reference.ogMediaId) ?? 0) + 1);
    }
    for (const setting of settings) {
      for (const id of uniqueIds) {
        const references = settingMediaReferences(setting.value, id);
        if (references.length) counts.set(id, (counts.get(id) ?? 0) + references.length);
      }
    }
    return counts;
  }

  private toView(asset: {
    id: string;
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    byteSize: bigint;
    width: number | null;
    height: number | null;
    altText: string | null;
    caption: string | null;
    renditions: unknown;
    createdAt: Date;
  }, usageCount = 0): MediaView {
    return {
      id: asset.id,
      url: this.publicUrl(asset.storageKey),
      storageKey: asset.storageKey,
      originalFilename: asset.originalFilename,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize.toString(),
      width: asset.width,
      height: asset.height,
      altText: asset.altText,
      caption: asset.caption,
      renditions: (asset.renditions ?? {}) as Record<string, { url: string; width: number }>,
      createdAt: asset.createdAt.toISOString(),
      usage: { count: usageCount, inUse: usageCount > 0 },
    };
  }
}
