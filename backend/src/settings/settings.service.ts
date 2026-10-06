import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { SETTINGS_BY_KEY, SETTING_DEFINITIONS, type SettingDefinition } from './settings.registry';
import { normalizeAboutPage } from './about-page.validation';

export interface SettingView {
  key: string;
  group: string;
  label: string;
  description?: string;
  isPublic: boolean;
  value: unknown;
  isDefault: boolean;
  version: number;
  updatedAt: string | null;
}

/** Deep merge that lets a stored value omit keys added by a later default. */
export function mergeWithDefault(defaultValue: unknown, stored: unknown): unknown {
  // `null` is an explicit business value (for example an intentionally
  // blank phone or social URL). Only an absent key should inherit a default.
  if (stored === undefined) return defaultValue;
  if (stored === null) return null;
  if (Array.isArray(defaultValue) || Array.isArray(stored)) return stored;
  // A field with a null default may legitimately change shape later, e.g. a
  // text setting upgraded to a TipTap document. Null has no child keys to merge.
  if (defaultValue === null || typeof defaultValue !== 'object' || typeof stored !== 'object') return stored;
  const merged: Record<string, unknown> = { ...(defaultValue as Record<string, unknown>) };
  for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
    merged[key] = mergeWithDefault((defaultValue as Record<string, unknown>)[key], value);
  }
  return merged;
}

function referencedMediaIds(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => referencedMediaIds(item, result));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if ((key === 'mediaId' || /MediaId$/.test(key)) && typeof child === 'string' && child) result.add(child);
      else referencedMediaIds(child, result);
    }
  }
  return result;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async load(): Promise<Map<string, { value: unknown; version: number; updatedAt: Date | null }>> {
    // Do not cache mutable business settings in a process-local Map. The API is
    // allowed to run with more than one instance, and a local cache makes a
    // successful admin write invisible to another web/API process.
    const rows = await this.prisma.setting.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const cache = new Map<string, { value: unknown; version: number; updatedAt: Date | null }>();
    for (const definition of SETTING_DEFINITIONS) {
      const row = byKey.get(definition.key);
      cache.set(definition.key, {
        value: row ? mergeWithDefault(definition.defaultValue, row.value) : definition.defaultValue,
        version: row?.version ?? 0,
        updatedAt: row?.updatedAt ?? null,
      });
    }
    return cache;
  }

  /** Typed read used by the rest of the backend. Never returns undefined. */
  async get<T>(key: string): Promise<T> {
    const definition = SETTINGS_BY_KEY.get(key);
    if (!definition) throw new NotFoundException(`Không có cấu hình ${key}`);
    const cache = await this.load();
    return cache.get(key)!.value as T;
  }

  async list(group?: string): Promise<SettingView[]> {
    const cache = await this.load();
    return SETTING_DEFINITIONS.filter((d) => !group || d.group === group).map((d) =>
      this.toView(d, cache.get(d.key)!),
    );
  }

  /** Only the keys the public website is allowed to see. */
  async publicSnapshot(): Promise<Record<string, unknown>> {
    const cache = await this.load();
    const snapshot: Record<string, unknown> = {};
    for (const definition of SETTING_DEFINITIONS) {
      if (definition.isPublic) snapshot[definition.key] = cache.get(definition.key)!.value;
    }
    return snapshot;
  }

  async update(
    key: string,
    value: unknown,
    expectedVersion: number,
    userId: string,
  ): Promise<SettingView> {
    const definition = SETTINGS_BY_KEY.get(key);
    if (!definition) throw new NotFoundException(`Không có cấu hình ${key}`);
    if (value === undefined) throw new BadRequestException('Thiếu giá trị');

    const merged = mergeWithDefault(definition.defaultValue, await this.normalize(key, value));
    const mediaIds = [...referencedMediaIds(merged)];
    if (mediaIds.length) {
      const assets = await this.prisma.mediaAsset.findMany({
        where: { id: { in: mediaIds }, isDemo: false, visibility: 'public', processingStatus: 'ready' },
        select: { id: true },
      });
      if (assets.length !== mediaIds.length) {
        throw new BadRequestException('Một hoặc nhiều ảnh không còn khả dụng trong Media Library. Hãy chọn lại ảnh trước khi lưu.');
      }
    }
    try {
      const saved = await this.prisma.$transaction(
        async (tx) => {
          const current = await tx.setting.findUnique({ where: { key } });
          const currentVersion = current?.version ?? 0;
          if (expectedVersion !== currentVersion) {
            throw new ConflictException({
              code: 'version_conflict',
              message: 'Cấu hình đã được người khác thay đổi. Tải lại rồi lưu lại.',
              currentVersion,
            });
          }

          // Serializable protects the absent-row (version 0) case too. Two
          // first writes cannot both be accepted and then overwrite each other.
          const savedRow = await tx.setting.upsert({
            where: { key },
            create: {
              key,
              value: merged as object,
              schemaVersion: definition.schemaVersion,
              isPublic: definition.isPublic,
              version: 1,
              updatedById: userId,
            },
            update: {
              value: merged as object,
              schemaVersion: definition.schemaVersion,
              isPublic: definition.isPublic,
              version: { increment: 1 },
              updatedById: userId,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: userId,
              action: 'settings.update',
              entityType: 'setting',
              diff: { key, from: current?.value ?? null, to: merged } as object,
            },
          });
          return savedRow;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return this.toView(definition, { value: merged, version: saved.version, updatedAt: saved.updatedAt });
    } catch (error) {
      // PostgreSQL can abort one of two concurrent serializable transactions.
      // Expose a stable conflict instead of reporting a false success.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException({
          code: 'version_conflict',
          message: 'Cấu hình vừa được người khác thay đổi. Tải lại rồi lưu lại.',
        });
      }
      throw error;
    }
  }

  /**
   * Keys with a structured Admin form get a server-side shape check. Rich text
   * uses the same TipTap whitelist as articles (`content.editor` blocks).
   */
  private async normalize(key: string, value: unknown): Promise<unknown> {
    if (key !== 'about.page') return value;
    const editor = await this.get<{ allowedBlocks: string[] }>('content.editor');
    return normalizeAboutPage(value, { allowedBlocks: editor.allowedBlocks });
  }

  /** Puts a key back to the shipped default. */
  async reset(key: string, expectedVersion: number, userId: string): Promise<SettingView> {
    const definition = SETTINGS_BY_KEY.get(key);
    if (!definition) throw new NotFoundException(`Không có cấu hình ${key}`);
    await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.setting.findUnique({ where: { key }, select: { version: true } });
        const currentVersion = current?.version ?? 0;
        if (currentVersion !== expectedVersion) {
          throw new ConflictException({
            code: 'version_conflict',
            message: 'Cấu hình đã được người khác thay đổi. Tải lại rồi thử lại.',
            currentVersion,
          });
        }
        if (current) {
          const removed = await tx.setting.deleteMany({ where: { key, version: expectedVersion } });
          if (removed.count !== 1) {
            const latest = await tx.setting.findUnique({ where: { key }, select: { version: true } });
            throw new ConflictException({
              code: 'version_conflict',
              message: 'Cấu hình vừa được thay đổi. Tải lại rồi thử lại.',
              currentVersion: latest?.version ?? 0,
            });
          }
        }
        await tx.auditLog.create({
          data: { actorId: userId, action: 'settings.reset', entityType: 'setting', diff: { key } as object },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.toView(definition, { value: definition.defaultValue, version: 0, updatedAt: null });
  }

  private toView(
    definition: SettingDefinition,
    state: { value: unknown; version: number; updatedAt: Date | null },
  ): SettingView {
    return {
      key: definition.key,
      group: definition.group,
      label: definition.label,
      description: definition.description,
      isPublic: definition.isPublic,
      value: state.value,
      isDefault: state.version === 0,
      version: state.version,
      updatedAt: state.updatedAt ? state.updatedAt.toISOString() : null,
    };
  }
}
