import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SETTINGS_BY_KEY, SETTING_DEFINITIONS, type SettingDefinition } from './settings.registry';

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
function mergeWithDefault(defaultValue: unknown, stored: unknown): unknown {
  if (stored === null || stored === undefined) return defaultValue;
  if (Array.isArray(defaultValue) || Array.isArray(stored)) return stored;
  if (typeof defaultValue !== 'object' || typeof stored !== 'object') return stored;
  const merged: Record<string, unknown> = { ...(defaultValue as Record<string, unknown>) };
  for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
    merged[key] = mergeWithDefault((defaultValue as Record<string, unknown>)[key], value);
  }
  return merged;
}

@Injectable()
export class SettingsService {
  // Settings are read on nearly every request; the cache is dropped on write.
  private cache: Map<string, { value: unknown; version: number; updatedAt: Date | null }> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async load(): Promise<Map<string, { value: unknown; version: number; updatedAt: Date | null }>> {
    if (this.cache) return this.cache;
    const rows = await this.prisma.setting.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const cache = new Map<string, { value: unknown; version: number; updatedAt: Date | null }>();
    for (const definition of SETTING_DEFINITIONS) {
      const row = byKey.get(definition.key);
      cache.set(definition.key, {
        value: mergeWithDefault(definition.defaultValue, row?.value ?? null),
        version: row?.version ?? 0,
        updatedAt: row?.updatedAt ?? null,
      });
    }
    this.cache = cache;
    return cache;
  }

  invalidate(): void {
    this.cache = null;
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
    expectedVersion: number | undefined,
    userId: string,
  ): Promise<SettingView> {
    const definition = SETTINGS_BY_KEY.get(key);
    if (!definition) throw new NotFoundException(`Không có cấu hình ${key}`);
    if (value === undefined) throw new BadRequestException('Thiếu giá trị');

    const current = await this.prisma.setting.findUnique({ where: { key } });
    const currentVersion = current?.version ?? 0;
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new ConflictException({
        code: 'version_conflict',
        message: 'Cấu hình đã được người khác thay đổi. Tải lại rồi lưu lại.',
        currentVersion,
      });
    }

    const merged = mergeWithDefault(definition.defaultValue, value);
    const saved = await this.prisma.setting.upsert({
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

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'settings.update',
        entityType: 'setting',
        diff: { key, from: current?.value ?? null, to: merged } as object,
      },
    });

    this.invalidate();
    return this.toView(definition, { value: merged, version: saved.version, updatedAt: saved.updatedAt });
  }

  /** Puts a key back to the shipped default. */
  async reset(key: string, userId: string): Promise<SettingView> {
    const definition = SETTINGS_BY_KEY.get(key);
    if (!definition) throw new NotFoundException(`Không có cấu hình ${key}`);
    await this.prisma.setting.deleteMany({ where: { key } });
    await this.prisma.auditLog.create({
      data: { actorId: userId, action: 'settings.reset', entityType: 'setting', diff: { key } as object },
    });
    this.invalidate();
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
