import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../common/types';
import { InventoryMutationService } from '../inventory/inventory-mutation.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateSheetBindingDto, CreateSheetWorkbookDto, PrepareSheetDraftDto } from './sheets.dto';
import { SheetsValuesProvider, type SheetCell } from './sheets.provider';

type RangeBounds = { startColumn: number; startRow: number; endColumn: number; endRow: number };
type JsonRecord = Record<string, unknown>;
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const dayKey = (day: Date) => day.toISOString().slice(0, 10);

function dateOnly(value: string): Date {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(Number.NaN);
  if (!Number.isFinite(date.getTime()) || dayKey(date) !== value) throw new BadRequestException(`Ngày không hợp lệ: ${value}`);
  return date;
}

function dates(fromValue: string, toValue: string, max = 31): Date[] {
  const from = dateOnly(fromValue); const to = dateOnly(toValue);
  const count = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (count < 1 || count > max) throw new BadRequestException(`Lô phải từ 1 đến ${max} ngày.`);
  return Array.from({ length: count }, (_, index) => { const day = new Date(from); day.setUTCDate(day.getUTCDate() + index); return day; });
}

function columnNumber(label: string): number {
  let result = 0;
  for (const char of label.replaceAll('$', '').toUpperCase()) result = result * 26 + char.charCodeAt(0) - 64;
  return result;
}

function columnLabel(number: number): string {
  let value = number; let label = '';
  while (value > 0) { const next = (value - 1) % 26; label = String.fromCharCode(65 + next) + label; value = Math.floor((value - 1) / 26); }
  return label;
}

function parseRange(value: string): RangeBounds {
  const match = /^\$?([A-Z]{1,3})\$?(\d+):\$?([A-Z]{1,3})\$?(\d+)$/i.exec(value);
  if (!match) throw new BadRequestException('Vùng Sheet phải là một khoảng hữu hạn dạng A1:P500.');
  const result = { startColumn: columnNumber(match[1]), startRow: Number(match[2]), endColumn: columnNumber(match[3]), endRow: Number(match[4]) };
  if (result.startColumn > result.endColumn || result.startRow < 1 || result.startRow > result.endRow) throw new BadRequestException('Khoảng ô không hợp lệ.');
  if ((result.endColumn - result.startColumn + 1) * (result.endRow - result.startRow + 1) > 30_000) throw new BadRequestException('Vùng Sheet vượt quá giới hạn 30.000 ô.');
  return result;
}

function overlaps(a: RangeBounds, b: RangeBounds): boolean {
  return a.startColumn <= b.endColumn && b.startColumn <= a.endColumn && a.startRow <= b.endRow && b.startRow <= a.endRow;
}

function sheetRange(title: string, configuredRange: string, startRow?: number, rowCount?: number): string {
  const bounds = parseRange(configuredRange);
  const firstRow = startRow ?? bounds.startRow;
  const lastRow = rowCount === undefined ? bounds.endRow : firstRow + rowCount - 1;
  if (firstRow < bounds.startRow || lastRow > bounds.endRow) throw new ConflictException('Vùng được cấu hình đã hết hàng trống.');
  const escapedTitle = title.replaceAll("'", "''");
  return `'${escapedTitle}'!${columnLabel(bounds.startColumn)}${firstRow}:${columnLabel(bounds.endColumn)}${lastRow}`;
}

function snapshot(object: unknown): JsonRecord { return object && typeof object === 'object' && !Array.isArray(object) ? object as JsonRecord : {}; }
function cellText(value: unknown): string { return value === null || value === undefined ? '' : String(value).trim(); }
function parseOptionalCount(value: unknown, field: string): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : /^\d+$/.test(String(value).trim()) ? Number(value) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5000) throw new BadRequestException(`${field} phải để trống hoặc là số nguyên 0–5.000.`);
  return parsed;
}

const INPUT_HEADERS: SheetCell[] = ['batchId', 'draftItemId', 'roomTypeId', 'stayDate', 'baseVersion', 'baselineExternalSoldCount', 'baselineMaintenanceCount', 'baselineOwnerWithheldCount', 'baselineStopSell', 'newExternalSoldCount', 'newMaintenanceCount', 'newOwnerWithheldCount', 'newStopSell', 'operation', 'reason', 'submit'];
const RESULT_HEADERS: SheetCell[] = ['batchId', 'draftItemId', 'roomTypeId', 'stayDate', 'status', 'message', 'acceptedVersion', 'acceptedAt', 'conflictId'];
const OUTPUT_HEADERS: SheetCell[] = ['roomTypeId', 'roomTypeCode', 'roomTypeName', 'stayDate', 'capacity', 'blockedCount', 'heldCount', 'reservedCount', 'availableRaw', 'stopSell', 'lastConfirmedAt', 'version'];

@Injectable()
export class SheetsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService, private readonly inventory: InventoryMutationService, private readonly provider: SheetsValuesProvider) {}

  async listWorkbooks() {
    const rows = await this.prisma.sheetWorkbook.findMany({
      include: { bindings: { include: {
        property: { include: { content: { select: { title: true } } } },
        organization: { select: { id: true, name: true } },
      } } },
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }], take: 100,
    });
    const [enabled, importEnabled] = await Promise.all([this.settings.get<boolean>('sheetsSync.enabled'), this.settings.get<boolean>('sheetsSync.importEnabled')]);
    const latestRuns = await this.prisma.sheetSyncRun.findMany({ where: { workbookId: { in: rows.map((row) => row.id) } }, orderBy: { createdAt: 'desc' }, take: 200 });
    const projectionBatches = await this.prisma.sheetDraftBatch.findMany({
      where: { projectionStatus: { in: ['pending', 'failed'] }, binding: { workbookId: { in: rows.map((row) => row.id) } } },
      include: { binding: { select: { id: true, workbookId: true, sheetTitle: true } } },
      orderBy: { createdAt: 'asc' }, take: 200,
    });
    return { enabled, importEnabled, adapter: this.provider.isFake() ? 'fake-test-only' : 'google-sheets-rest', items: rows.map((row) => ({
      id: row.id, spreadsheetId: row.spreadsheetId, title: row.title, periodStart: row.periodStart.toISOString(), periodEndExclusive: row.periodEndExclusive.toISOString(),
      status: row.status, importPaused: row.importPaused, exportPaused: row.exportPaused, createdAt: row.createdAt.toISOString(),
      bindings: row.bindings.map((binding) => ({ id: binding.id, propertyId: binding.propertyId, propertyTitle: binding.property.content.title, organizationId: binding.organizationId, organizationName: binding.organization.name, sheetId: binding.sheetId, sheetTitle: binding.sheetTitle, outputRange: binding.outputRange, inputRange: binding.inputRange, resultRange: binding.resultRange, status: binding.status })),
      runs: latestRuns.filter((run) => run.workbookId === row.id).slice(0, 10).map((run) => ({ id: run.id, direction: run.direction, status: run.status, attempt: run.attempt, startedAt: run.startedAt?.toISOString() ?? null, finishedAt: run.finishedAt?.toISOString() ?? null })),
      projectionBatches: projectionBatches.filter((batch) => batch.binding.workbookId === row.id).map((batch) => ({ id: batch.id, bindingId: batch.bindingId, sheetTitle: batch.binding.sheetTitle, status: batch.projectionStatus, error: batch.projectionError, createdAt: batch.createdAt.toISOString() })),
    })) };
  }

  async createWorkbook(input: CreateSheetWorkbookDto, actor: AuthenticatedUser) {
    const start = dateOnly(input.periodStart); const end = dateOnly(input.periodEndExclusive);
    const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    if (start.getUTCDate() !== 1 || end.getTime() !== nextMonth.getTime()) throw new BadRequestException('Mỗi workbook phải đúng một tháng dương lịch, từ ngày 1 đến trước ngày đầu tháng kế tiếp.');
    const row = await this.prisma.sheetWorkbook.create({ data: {
      spreadsheetId: input.spreadsheetId.trim(), title: input.title.trim(), periodStart: start, periodEndExclusive: end,
      createdById: actor.id, status: 'active', importPaused: true, exportPaused: true,
    } });
    await this.prisma.auditLog.create({ data: { actorId: actor.id, action: 'sheets.workbook_registered', entityType: 'sheet_workbook', entityId: row.id, diff: { spreadsheetIdTail: row.spreadsheetId.slice(-8), title: row.title, periodStart: input.periodStart, periodEndExclusive: input.periodEndExclusive, importPaused: true, exportPaused: true } } });
    return { id: row.id, title: row.title, spreadsheetId: row.spreadsheetId, status: row.status, importPaused: row.importPaused, exportPaused: row.exportPaused };
  }

  async createBinding(workbookId: string, input: CreateSheetBindingDto, actor: AuthenticatedUser) {
    const workbook = await this.prisma.sheetWorkbook.findUnique({ where: { id: workbookId } });
    if (!workbook || workbook.status !== 'active') throw new NotFoundException('Không tìm thấy workbook đang hoạt động.');
    const ranges = [parseRange(input.outputRange), parseRange(input.inputRange), parseRange(input.resultRange)];
    if (ranges.some((a, index) => ranges.slice(index + 1).some((b) => overlaps(a, b)))) throw new BadRequestException('Vùng xuất, nhập và kết quả phải tách biệt, không được chồng lấn.');
    if (ranges[0].endColumn - ranges[0].startColumn + 1 < OUTPUT_HEADERS.length || ranges[1].endColumn - ranges[1].startColumn + 1 < INPUT_HEADERS.length || ranges[2].endColumn - ranges[2].startColumn + 1 < RESULT_HEADERS.length) throw new BadRequestException('Vùng OUTPUT cần 12 cột, INPUT cần 16 cột và RESULT cần 9 cột.');
    const [org, property, grant] = await Promise.all([
      this.prisma.partnerOrganization.findUnique({ where: { id: input.organizationId }, select: { id: true, status: true } }),
      this.prisma.property.findUnique({ where: { id: input.propertyId }, select: { id: true } }),
      this.prisma.partnerPropertyGrant.findUnique({ where: { organizationId_propertyId: { organizationId: input.organizationId, propertyId: input.propertyId } } }),
    ]);
    if (!org || org.status !== 'active' || !property || !grant || grant.status !== 'active' || !grant.canReadInventory || !grant.canWriteInventory) throw new ForbiddenException('Chỉ bind cơ sở có grant đang hoạt động, đã duyệt quyền xem và nhập tồn.');
    const inputRange = input.inputRange.toUpperCase(); const outputRange = input.outputRange.toUpperCase(); const resultRange = input.resultRange.toUpperCase();
    const row = await this.prisma.sheetPropertyBinding.create({ data: {
      workbookId, organizationId: org.id, propertyId: property.id, sheetId: input.sheetId, sheetTitle: input.sheetTitle.trim(),
      outputRange, inputRange, resultRange, nextInputRow: ranges[1].startRow, nextResultRow: ranges[2].startRow,
    } });
    await this.prisma.auditLog.create({ data: { actorId: actor.id, action: 'sheets.binding_created', entityType: 'sheet_property_binding', entityId: row.id, diff: { workbookId, organizationId: org.id, propertyId: property.id, sheetId: row.sheetId, outputRange, inputRange, resultRange } } });
    return { id: row.id, workbookId, propertyId: property.id, organizationId: org.id, sheetTitle: row.sheetTitle, status: row.status };
  }

  async prepareDraft(bindingId: string, input: PrepareSheetDraftDto, actor: AuthenticatedUser) {
    await this.assertEnabled('export');
    const dayList = dates(input.from, input.toExclusive);
    const prepared = await this.prisma.$transaction(async (tx) => {
      const binding = await tx.sheetPropertyBinding.findUnique({ where: { id: bindingId }, include: { workbook: true } });
      if (!binding || binding.status !== 'active' || binding.workbook.status !== 'active') throw new NotFoundException('Không tìm thấy binding đang hoạt động.');
      if (binding.workbook.exportPaused) throw new ConflictException('Tạm dừng ghi lên workbook; bỏ pause xuất trước khi chuẩn bị lô.');
      if (dayList.some((day) => day < binding.workbook.periodStart || day >= binding.workbook.periodEndExclusive)) throw new BadRequestException('Lô phải nằm hoàn toàn trong kỳ của workbook.');
      const room = await tx.roomType.findUnique({ where: { id: input.roomTypeId }, select: { id: true, propertyId: true, name: true, code: true } });
      if (!room || room.propertyId !== binding.propertyId) throw new BadRequestException('Hạng phòng không thuộc cơ sở đang liên kết.');
      const [organization, grant] = await Promise.all([
        tx.partnerOrganization.findUnique({ where: { id: binding.organizationId }, select: { status: true } }),
        tx.partnerPropertyGrant.findUnique({ where: { organizationId_propertyId: { organizationId: binding.organizationId, propertyId: binding.propertyId } } }),
      ]);
      if (!organization || organization.status !== 'active' || !grant || grant.status !== 'active' || grant.expiresAt && grant.expiresAt <= new Date() || !grant.canReadInventory || !grant.canWriteInventory
        || !Array.isArray(grant.roomTypeScope) || !(grant.roomTypeScope.includes('*') || grant.roomTypeScope.includes(room.id))) throw new ForbiddenException('Grant hiện hành không cho phép chuẩn bị lô cho hạng phòng này.');
      const rows = await tx.inventoryDay.findMany({ where: { roomTypeId: room.id, stayDate: { in: dayList } }, orderBy: { stayDate: 'asc' } });
      if (rows.length !== dayList.length) throw new ConflictException('Có ngày chưa mở quỹ. Lô không tạo dữ liệu tồn mới.');
      const rowByDay = new Map(rows.map((row) => [dayKey(row.stayDate), row]));
      const blockRows = await tx.inventoryBlockNight.findMany({ where: { roomTypeId: room.id, stayDate: { in: dayList }, block: { status: 'active', ownerOrganizationId: binding.organizationId } }, include: { block: { select: { kind: true } } } });
      const blockByDay = new Map<string, { external: number; maintenance: number; withheld: number }>();
      for (const block of blockRows) {
        const key = dayKey(block.stayDate); const counts = blockByDay.get(key) ?? { external: 0, maintenance: 0, withheld: 0 };
        if (block.block.kind === 'external_sold') counts.external += block.quantity;
        if (block.block.kind === 'maintenance') counts.maintenance += block.quantity;
        if (block.block.kind === 'owner_withheld') counts.withheld += block.quantity;
        blockByDay.set(key, counts);
      }
      const inputBounds = parseRange(binding.inputRange); const resultBounds = parseRange(binding.resultRange);
      const neededRows = dayList.length + 1;
      if (binding.nextInputRow + neededRows - 1 > inputBounds.endRow || binding.nextResultRow + neededRows - 1 > resultBounds.endRow) throw new ConflictException('Không còn hàng trống trong vùng input/result đã cấu hình. Cấp workbook/tab tháng mới hoặc tăng vùng đã duyệt.');
      const batch = await tx.sheetDraftBatch.create({ data: {
        bindingId, createdById: actor.id, status: 'draft', inputStartRow: binding.nextInputRow, resultStartRow: binding.nextResultRow,
        expiresAt: new Date(Date.now() + 30 * 86_400_000), baseline: asJson({ propertyId: room.propertyId, roomTypeId: room.id, from: input.from, toExclusive: input.toExclusive, timezone: binding.workbook.timezone }),
        items: { create: dayList.map((day, index) => {
          const row = rowByDay.get(dayKey(day))!; const counts = blockByDay.get(dayKey(day)) ?? { external: 0, maintenance: 0, withheld: 0 };
          return { roomTypeId: room.id, stayDate: day, command: 'inventory_set', baseVersion: row.version, rowPosition: binding.nextInputRow + 1 + index,
            baseline: asJson({ capacity: row.capacity, blockedCount: row.blockedCount, heldCount: row.heldCount, reservedCount: row.reservedCount, stopSell: row.stopSell, externalSoldCount: counts.external, maintenanceCount: counts.maintenance, ownerWithheldCount: counts.withheld, version: row.version }) };
        }) },
      }, include: { items: true } });
      await tx.sheetPropertyBinding.update({ where: { id: bindingId }, data: { nextInputRow: binding.nextInputRow + neededRows, nextResultRow: binding.nextResultRow + neededRows } });
      return { binding, room, batch };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    let projectionStatus: 'projected' | 'failed' = 'projected';
    try {
      await this.writeDraftRows(prepared.binding, prepared.batch);
      await this.prisma.sheetDraftBatch.update({ where: { id: prepared.batch.id }, data: { projectionStatus: 'projected', projectionError: null, projectedAt: new Date() } });
    } catch {
      projectionStatus = 'failed';
      await this.prisma.sheetDraftBatch.update({ where: { id: prepared.batch.id }, data: { projectionStatus: 'failed', projectionError: 'Google Sheets chưa nhận vùng dữ liệu; kiểm tra quyền file, tên tab và phạm vi ô rồi thử lại.' } });
    }
    await this.prisma.auditLog.create({ data: { actorId: actor.id, action: projectionStatus === 'projected' ? 'sheets.draft_batch_prepared' : 'sheets.draft_projection_failed', entityType: 'sheet_draft_batch', entityId: prepared.batch.id, diff: { bindingId, roomTypeId: input.roomTypeId, from: input.from, toExclusive: input.toExclusive, rowCount: prepared.batch.items.length, projectionStatus } } });
    return { batchId: prepared.batch.id, status: prepared.batch.status, projectionStatus, rowCount: prepared.batch.items.length, expiresAt: prepared.batch.expiresAt.toISOString(), message: projectionStatus === 'projected' ? 'Lô đã được chuẩn bị; người dùng phải tự điền và nhập GỬI. Hệ thống không tự submit.' : 'PostgreSQL đã lưu lô, nhưng Google Sheets chưa nhận dữ liệu. Lô được giữ nguyên; dùng Thử ghi lại để tiếp tục.' };
  }

  async retryDraftProjection(batchId: string, actor: AuthenticatedUser) {
    await this.assertEnabled('export');
    const batch = await this.prisma.sheetDraftBatch.findUnique({ where: { id: batchId }, include: { binding: { include: { workbook: true } }, items: true } });
    if (!batch || batch.status !== 'draft' || batch.expiresAt <= new Date()) throw new NotFoundException('Không tìm thấy lô nháp còn hạn để ghi lại.');
    const { binding } = batch;
    if (binding.status !== 'active' || binding.workbook.status !== 'active' || binding.workbook.exportPaused) throw new ConflictException('Binding hoặc export đang tạm dừng; không ghi vào Google Sheets.');
    const [organization, grant] = await Promise.all([
      this.prisma.partnerOrganization.findUnique({ where: { id: binding.organizationId }, select: { status: true } }),
      this.prisma.partnerPropertyGrant.findUnique({ where: { organizationId_propertyId: { organizationId: binding.organizationId, propertyId: binding.propertyId } } }),
    ]);
    const scope = grant?.roomTypeScope;
    if (!organization || organization.status !== 'active' || !grant || grant.status !== 'active' || grant.expiresAt && grant.expiresAt <= new Date() || !grant.canReadInventory || !grant.canWriteInventory
      || !Array.isArray(scope) || batch.items.some((item) => !(scope.includes('*') || scope.includes(item.roomTypeId)))) throw new ForbiddenException('Grant hiện hành không cho phép ghi lại lô này.');
    await this.writeDraftRows(binding, batch);
    const updated = await this.prisma.sheetDraftBatch.update({ where: { id: batch.id }, data: { projectionStatus: 'projected', projectionError: null, projectedAt: new Date() }, select: { id: true, projectionStatus: true, projectedAt: true } });
    await this.prisma.auditLog.create({ data: { actorId: actor.id, action: 'sheets.draft_projection_retried', entityType: 'sheet_draft_batch', entityId: batch.id, diff: { bindingId: binding.id, projectionStatus: 'projected' } } });
    return { ...updated, projectedAt: updated.projectedAt?.toISOString() ?? null };
  }

  async syncNow(workbookId: string, direction: 'import' | 'export', actor: AuthenticatedUser) {
    await this.assertEnabled(direction);
    const workbook = await this.prisma.sheetWorkbook.findUnique({ where: { id: workbookId }, include: { bindings: { where: { status: 'active' } } } });
    if (!workbook || workbook.status !== 'active') throw new NotFoundException('Không tìm thấy workbook đang hoạt động.');
    if (direction === 'import' && (workbook.importPaused || !await this.settings.get<boolean>('sheetsSync.importEnabled'))) throw new ConflictException('Import đang bị tạm dừng hoặc feature flag import đang tắt.');
    if (direction === 'import' && workbook.periodEndExclusive <= new Date()) throw new ConflictException('Kỳ workbook đã đóng; lệnh nhập tồn cũ không được áp dụng.');
    if (direction === 'export' && workbook.exportPaused) throw new ConflictException('Export đang bị tạm dừng.');
    const run = await this.prisma.sheetSyncRun.create({ data: { workbookId, direction, status: 'running', attempt: 1, startedAt: new Date(), detail: asJson({ trigger: 'admin_manual', actorId: actor.id }) } });
    try {
      const result = direction === 'export' ? await this.exportWorkbook(workbook) : await this.pollWorkbook(workbook);
      await this.prisma.sheetSyncRun.update({ where: { id: run.id }, data: { status: 'succeeded', finishedAt: new Date(), detail: asJson({ ...result, adapter: this.provider.isFake() ? 'fake-test-only' : 'google-sheets-rest' }) } });
      await this.prisma.auditLog.create({ data: { actorId: actor.id, action: `sheets.${direction}_requested`, entityType: 'sheet_sync_run', entityId: run.id, diff: asJson({ workbookId, direction }) } });
      return { runId: run.id, status: 'succeeded', ...result };
    } catch (error) {
      await this.prisma.sheetSyncRun.update({ where: { id: run.id }, data: { status: 'failed', finishedAt: new Date(), detail: asJson({ error: error instanceof Error ? error.message : 'Lỗi đồng bộ không xác định' }) } });
      throw error;
    }
  }

  async pause(workbookId: string, direction: 'import' | 'export', paused: boolean, actor: AuthenticatedUser) {
    const current = await this.prisma.sheetWorkbook.findUnique({ where: { id: workbookId } });
    if (!current) throw new NotFoundException('Không tìm thấy workbook.');
    const updated = await this.prisma.sheetWorkbook.update({ where: { id: workbookId }, data: direction === 'import' ? { importPaused: paused } : { exportPaused: paused } });
    await this.prisma.auditLog.create({ data: { actorId: actor.id, action: `sheets.${direction}_${paused ? 'paused' : 'resumed'}`, entityType: 'sheet_workbook', entityId: workbookId, diff: { direction, paused } } });
    return { id: updated.id, importPaused: updated.importPaused, exportPaused: updated.exportPaused };
  }

  async exportPending(): Promise<{ skipped: boolean; exportedWorkbooks: number; pendingEvents: number }> {
    if (!await this.settings.get<boolean>('sheetsSync.enabled')) return { skipped: true, exportedWorkbooks: 0, pendingEvents: 0 };
    const events = await this.prisma.outboxEvent.findMany({ where: { eventType: 'inventory.changed', processedAt: null, availableAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: 250 });
    if (!events.length) return { skipped: false, exportedWorkbooks: 0, pendingEvents: 0 };
    const payloads = events.map((event) => ({ event, payload: snapshot(event.payload) }));
    const roomIds = [...new Set(payloads.map(({ payload }) => String(payload.roomTypeId ?? '')).filter(Boolean))];
    const rooms = await this.prisma.roomType.findMany({ where: { id: { in: roomIds } }, select: { id: true, propertyId: true } });
    const propertyByRoom = new Map(rooms.map((room) => [room.id, room.propertyId]));
    const properties = [...new Set(rooms.map((room) => room.propertyId))];
    if (!properties.length) return { skipped: false, exportedWorkbooks: 0, pendingEvents: events.length };
    const bindings = await this.prisma.sheetPropertyBinding.findMany({ where: { propertyId: { in: properties }, status: 'active', workbook: { status: 'active' } }, include: { workbook: true } });
    const workToEvents = new Map<string, Set<string>>();
    const requiredBindings = new Map<string, Set<string>>();
    for (const { event, payload } of payloads) {
      const propertyId = propertyByRoom.get(String(payload.roomTypeId ?? ''));
      if (!propertyId) continue;
      for (const binding of bindings) {
        const day = typeof payload.stayDate === 'string' ? dateOnly(payload.stayDate) : null;
        if (!day || binding.propertyId !== propertyId || day < binding.workbook.periodStart || day >= binding.workbook.periodEndExclusive) continue;
        const required = requiredBindings.get(event.id) ?? new Set<string>(); required.add(binding.id); requiredBindings.set(event.id, required);
        if (!binding.workbook.exportPaused) { const set = workToEvents.get(binding.workbookId) ?? new Set<string>(); set.add(event.id); workToEvents.set(binding.workbookId, set); }
      }
    }
    let exportedWorkbooks = 0;
    const exportedBindingIds = new Set<string>();
    for (const [workbookId, eventIds] of workToEvents) {
      const workbook = await this.prisma.sheetWorkbook.findUnique({ where: { id: workbookId }, include: { bindings: { where: { status: 'active' } } } });
      if (!workbook || workbook.status !== 'active' || workbook.exportPaused) continue;
      const run = await this.prisma.sheetSyncRun.create({ data: { workbookId, direction: 'export', status: 'running', attempt: 1, startedAt: new Date(), detail: asJson({ trigger: 'transactional_outbox', eventCount: eventIds.size }) } });
      try {
        const result = await this.exportWorkbook(workbook);
        await this.prisma.sheetSyncRun.update({ where: { id: run.id }, data: { status: 'succeeded', finishedAt: new Date(), detail: asJson({ ...result, eventCount: eventIds.size }) } });
        for (const id of result.exportedBindingIds) exportedBindingIds.add(id);
        exportedWorkbooks++;
      } catch (error) {
        await this.prisma.sheetSyncRun.update({ where: { id: run.id }, data: { status: 'failed', finishedAt: new Date(), detail: asJson({ error: error instanceof Error ? error.message : 'Export failed', eventCount: eventIds.size }) } });
        await this.prisma.outboxEvent.updateMany({ where: { id: { in: [...eventIds] }, processedAt: null }, data: { availableAt: new Date(Date.now() + 60_000) } });
      }
    }
    const completeEventIds = events.filter((event) => {
      const required = requiredBindings.get(event.id);
      return !required?.size || [...required].every((bindingId) => exportedBindingIds.has(bindingId));
    }).map((event) => event.id);
    if (completeEventIds.length) await this.prisma.outboxEvent.updateMany({ where: { id: { in: completeEventIds }, processedAt: null }, data: { processedAt: new Date() } });
    const deferredEventIds = events.filter((event) => !completeEventIds.includes(event.id)).map((event) => event.id);
    if (deferredEventIds.length) await this.prisma.outboxEvent.updateMany({ where: { id: { in: deferredEventIds }, processedAt: null }, data: { availableAt: new Date(Date.now() + 5 * 60_000) } });
    return { skipped: false, exportedWorkbooks, pendingEvents: events.length };
  }

  async pollScheduled(): Promise<{ skipped: boolean; workbooks: number }> {
    if (!await this.settings.get<boolean>('sheetsSync.enabled') || !await this.settings.get<boolean>('sheetsSync.importEnabled')) return { skipped: true, workbooks: 0 };
    const workbooks = await this.prisma.sheetWorkbook.findMany({ where: { status: 'active', importPaused: false, periodEndExclusive: { gt: new Date() } }, include: { bindings: { where: { status: 'active' } } }, take: 20 });
    let processed = 0;
    for (const workbook of workbooks) {
      try {
        const run = await this.prisma.sheetSyncRun.create({ data: { workbookId: workbook.id, direction: 'import', status: 'running', attempt: 1, startedAt: new Date(), detail: asJson({ trigger: 'poller' }) } });
        const result = await this.pollWorkbook(workbook);
        await this.prisma.sheetSyncRun.update({ where: { id: run.id }, data: { status: 'succeeded', finishedAt: new Date(), detail: asJson(result) } });
      } catch (error) {
        // A failing Google import never reaches or delays the separate booking-hold worker.
        await this.prisma.sheetSyncRun.create({ data: { workbookId: workbook.id, direction: 'import', status: 'failed', attempt: 1, startedAt: new Date(), finishedAt: new Date(), detail: asJson({ error: error instanceof Error ? error.message : 'Import failed', trigger: 'poller' }) } });
      }
      processed++;
    }
    return { skipped: false, workbooks: processed };
  }

  private async assertEnabled(direction: 'import' | 'export'): Promise<void> {
    if (!await this.settings.get<boolean>('sheetsSync.enabled')) throw new ConflictException('Đồng bộ Google Sheets đang tắt.');
    if (direction === 'import' && !await this.settings.get<boolean>('sheetsSync.importEnabled')) throw new ConflictException('Nhận lệnh từ Sheets đang tắt.');
  }

  private async writeDraftRows(binding: { workbook: { spreadsheetId: string }; sheetTitle: string; inputRange: string; resultRange: string }, batch: { id: string; inputStartRow: number; resultStartRow: number; items: Array<{ id: string; roomTypeId: string; stayDate: Date; baseVersion: number; baseline: Prisma.JsonValue; rowPosition: number }> }) {
    const inputBounds = parseRange(binding.inputRange); const resultBounds = parseRange(binding.resultRange);
    const inputRows: SheetCell[][] = [INPUT_HEADERS]; const resultRows: SheetCell[][] = [RESULT_HEADERS];
    for (const item of batch.items) {
      const baseline = snapshot(item.baseline);
      inputRows.push([batch.id, item.id, item.roomTypeId, dayKey(item.stayDate), item.baseVersion, Number(baseline.externalSoldCount ?? 0), Number(baseline.maintenanceCount ?? 0), Number(baseline.ownerWithheldCount ?? 0), !!baseline.stopSell, null, null, null, null, '', '', '']);
      resultRows.push([batch.id, item.id, item.roomTypeId, dayKey(item.stayDate), 'draft', 'Chưa gửi', '', '', '']);
    }
    await this.provider.write(binding.workbook.spreadsheetId, sheetRange(binding.sheetTitle, binding.inputRange, batch.inputStartRow, inputRows.length), inputRows);
    await this.provider.write(binding.workbook.spreadsheetId, sheetRange(binding.sheetTitle, binding.resultRange, batch.resultStartRow, resultRows.length), resultRows);
    void inputBounds; void resultBounds;
  }

  private async exportWorkbook(workbook: { id: string; spreadsheetId: string; periodStart: Date; periodEndExclusive: Date; bindings: Array<{ id: string; organizationId: string; propertyId: string; sheetTitle: string; outputRange: string; workbookId: string }> }) {
    let exported = 0;
    const exportedBindingIds: string[] = [];
    const unavailableBindingIds: string[] = [];
    for (const binding of workbook.bindings) {
      const [organization, grant] = await Promise.all([
        this.prisma.partnerOrganization.findUnique({ where: { id: binding.organizationId }, select: { status: true } }),
        this.prisma.partnerPropertyGrant.findUnique({ where: { organizationId_propertyId: { organizationId: binding.organizationId, propertyId: binding.propertyId } } }),
      ]);
      if (!organization || organization.status !== 'active' || !grant || grant.status !== 'active' || grant.expiresAt && grant.expiresAt <= new Date() || !grant.canReadInventory) { unavailableBindingIds.push(binding.id); continue; }
      const scope = Array.isArray(grant.roomTypeScope) ? grant.roomTypeScope : [];
      const rooms = await this.prisma.roomType.findMany({ where: {
        propertyId: binding.propertyId, status: 'active',
        ...(scope.includes('*') ? {} : { id: { in: scope.filter((id): id is string => typeof id === 'string') } }),
      }, select: { id: true, code: true, name: true } });
      const roomIds = rooms.map((room) => room.id);
      const days = Math.round((workbook.periodEndExclusive.getTime() - workbook.periodStart.getTime()) / 86_400_000);
      const capacity = rooms.length * days;
      const bounds = parseRange(binding.outputRange);
      if (bounds.endColumn - bounds.startColumn + 1 < OUTPUT_HEADERS.length || bounds.endRow - bounds.startRow + 1 < capacity + 1) throw new ConflictException(`Vùng OUTPUT của tab ${binding.sheetTitle} không đủ chỗ cho ${capacity} dòng.`);
      const inventory = roomIds.length ? await this.prisma.inventoryDay.findMany({ where: { roomTypeId: { in: roomIds }, stayDate: { gte: workbook.periodStart, lt: workbook.periodEndExclusive } }, orderBy: [{ roomTypeId: 'asc' }, { stayDate: 'asc' }] }) : [];
      const roomById = new Map(rooms.map((room) => [room.id, room]));
      const rows: SheetCell[][] = [OUTPUT_HEADERS];
      for (const row of inventory) {
        const room = roomById.get(row.roomTypeId)!;
        rows.push([row.roomTypeId, room.code, room.name, dayKey(row.stayDate), row.capacity, row.blockedCount, row.heldCount, row.reservedCount, row.capacity - row.blockedCount - row.heldCount - row.reservedCount, row.stopSell, row.lastConfirmedAt?.toISOString() ?? '', row.version]);
      }
      // The configured output region is exclusively application-owned; input/result regions are never touched here.
      const oldRows = bounds.endRow - bounds.startRow + 1;
      await this.provider.write(workbook.spreadsheetId, sheetRange(binding.sheetTitle, binding.outputRange, bounds.startRow, oldRows), Array.from({ length: oldRows }, (_, index) => rows[index] ?? Array.from({ length: OUTPUT_HEADERS.length }, () => null)));
      exported++;
      exportedBindingIds.push(binding.id);
    }
    return { exportedBindings: exported, exportedBindingIds, unavailableBindingIds, outputOnly: true };
  }

  private async pollWorkbook(workbook: { id: string; spreadsheetId: string; bindings: Array<{ id: string; organizationId: string; propertyId: string; sheetTitle: string; inputRange: string; resultRange: string }> }) {
    let submitted = 0;
    for (const binding of workbook.bindings) {
      const [organization, grant] = await Promise.all([
        this.prisma.partnerOrganization.findUnique({ where: { id: binding.organizationId }, select: { status: true } }),
        this.prisma.partnerPropertyGrant.findUnique({ where: { organizationId_propertyId: { organizationId: binding.organizationId, propertyId: binding.propertyId } } }),
      ]);
      if (!organization || organization.status !== 'active' || !grant || grant.status !== 'active' || grant.expiresAt && grant.expiresAt <= new Date() || !grant.canWriteInventory || !grant.canReadInventory) continue;
      const batches = await this.prisma.sheetDraftBatch.findMany({ where: { bindingId: binding.id, status: { in: ['draft', 'submitted', 'applied', 'conflict', 'failed'] }, expiresAt: { gt: new Date() } }, include: { items: { orderBy: { stayDate: 'asc' } } }, orderBy: { createdAt: 'asc' }, take: 100 });
      for (const batch of batches) {
        const input = await this.provider.read(workbook.spreadsheetId, sheetRange(binding.sheetTitle, binding.inputRange, batch.inputStartRow + 1, batch.items.length), true);
        if (!input.some((row) => cellText(row[15]).toUpperCase() === 'GỬI')) continue;
        await this.ingestSubmittedBatch(workbook.spreadsheetId, binding, batch, input);
        submitted++;
      }
    }
    return { submittedBatches: submitted, immutableBatchIds: true };
  }

  private async ingestSubmittedBatch(spreadsheetId: string, binding: { id: string; organizationId: string; sheetTitle: string; resultRange: string }, batch: { id: string; status: string; payloadHash: string | null; resultStartRow: number; items: Array<{ id: string; roomTypeId: string; stayDate: Date; baseVersion: number; baseline: Prisma.JsonValue; rowPosition: number; result: Prisma.JsonValue }> }, rows: SheetCell[][]) {
    const normalizedRows = batch.items.map((item, index) => Array.from({ length: INPUT_HEADERS.length }, (_, col) => rows[index]?.[col] ?? ''));
    const hash = createHash('sha256').update(JSON.stringify(normalizedRows)).digest('hex');
    if (batch.status !== 'draft') {
      if (batch.payloadHash !== hash) {
        await this.writeResults(spreadsheetId, binding, batch, batch.items.map((item) => ({ item, status: 'SUBMITTED_PAYLOAD_CHANGED', message: 'Nội dung đã sửa sau khi gửi; chưa áp dụng. Tạo lô mới.', acceptedVersion: '' })));
        return;
      }
      else if (batch.status !== 'submitted') { await this.restoreResults(spreadsheetId, binding, batch); return; }
    }
    let mutationCompleted = false;
    try {
      const parsed = batch.items.map((item, index) => {
        const row = normalizedRows[index];
        for (let col = 0; col < row.length; col++) if (typeof row[col] === 'string' && String(row[col]).startsWith('=')) throw new BadRequestException(`Dòng ${index + 1}: không nhận công thức trong lệnh input.`);
        if (cellText(row[0]) !== batch.id || cellText(row[1]) !== item.id || cellText(row[2]) !== item.roomTypeId || cellText(row[3]) !== dayKey(item.stayDate) || Number(row[4]) !== item.baseVersion) throw new BadRequestException(`Dòng ${index + 1}: định danh/baseline không khớp với batch đã chuẩn bị.`);
        if (cellText(row[15]).toUpperCase() !== 'GỬI') throw new BadRequestException('Phải gửi tất cả các dòng trong batch cùng lúc.');
        const operation = cellText(row[13]).toUpperCase();
        const externalSoldCount = parseOptionalCount(row[9], 'newExternalSoldCount');
        const maintenanceCount = parseOptionalCount(row[10], 'newMaintenanceCount');
        const ownerWithheldCount = parseOptionalCount(row[11], 'newOwnerWithheldCount');
        const stopCell = row[12];
        const stopSell = stopCell === '' || stopCell === null || stopCell === undefined ? undefined : typeof stopCell === 'boolean' ? stopCell : ['TRUE','FALSE'].includes(String(stopCell).toUpperCase()) ? String(stopCell).toUpperCase() === 'TRUE' : undefined;
        if (stopCell !== '' && stopCell !== null && stopCell !== undefined && stopSell === undefined) throw new BadRequestException(`Dòng ${index + 1}: newStopSell chỉ nhận TRUE/FALSE hoặc để trống.`);
        if (operation === 'CONFIRM_UNCHANGED') {
          if ([externalSoldCount, maintenanceCount, ownerWithheldCount, stopSell].some((value) => value !== undefined)) throw new BadRequestException('CONFIRM_UNCHANGED không được kèm giá trị thay đổi.');
          return { item, operation, reason: cellText(row[14]) };
        }
        if (operation !== '' && operation !== 'SET') throw new BadRequestException(`Dòng ${index + 1}: operation chỉ nhận SET hoặc CONFIRM_UNCHANGED.`);
        if ([externalSoldCount, maintenanceCount, ownerWithheldCount, stopSell].every((value) => value === undefined)) throw new BadRequestException(`Dòng ${index + 1}: lệnh trống không phải xác nhận tồn; dùng operation CONFIRM_UNCHANGED.`);
        return { item, operation: 'SET', externalSoldCount, maintenanceCount, ownerWithheldCount, stopSell, reason: cellText(row[14]) };
      });
      if (parsed.some((row) => row.operation !== parsed[0].operation)) throw new BadRequestException('Một batch chỉ được chứa một operation.');
      if (batch.status === 'draft') {
        const frozen = await this.prisma.sheetDraftBatch.updateMany({ where: { id: batch.id, status: 'draft' }, data: { status: 'submitted', payloadHash: hash, submittedAt: new Date() } });
        if (frozen.count !== 1) return;
      }
      let acceptedVersions: number[] = [];
      if (parsed[0].operation === 'CONFIRM_UNCHANGED') {
        const roomTypeId = parsed[0].item.roomTypeId;
        if (parsed.some((item) => item.item.roomTypeId !== roomTypeId)) throw new BadRequestException('Lô phải thuộc một hạng phòng.');
        const ordered = [...parsed].sort((a,b) => a.item.stayDate.getTime() - b.item.stayDate.getTime());
        const result = await this.inventory.confirmSheetUnchanged({ bindingId: binding.id, organizationId: binding.organizationId, actorId: (await this.workbookCreatorByBinding(binding.id)), batchId: batch.id, roomTypeId, from: dayKey(ordered[0].item.stayDate), toExclusive: dayKey(new Date(ordered.at(-1)!.item.stayDate.getTime() + 86_400_000)), expectedVersions: Object.fromEntries(ordered.map((row) => [dayKey(row.item.stayDate), row.item.baseVersion])) });
        acceptedVersions = result.items.map((row) => Number((row as JsonRecord).version ?? row.version));
        mutationCompleted = true;
      } else {
        const changes = parsed.map((row) => ({ roomTypeId: row.item.roomTypeId, stayDate: dayKey(row.item.stayDate), expectedVersion: row.item.baseVersion,
          ...(row.externalSoldCount !== undefined ? { externalSoldCount: row.externalSoldCount } : {}), ...(row.maintenanceCount !== undefined ? { maintenanceCount: row.maintenanceCount } : {}),
          ...(row.ownerWithheldCount !== undefined ? { ownerWithheldCount: row.ownerWithheldCount } : {}), ...(row.stopSell !== undefined ? { stopSell: row.stopSell } : {}) }));
        if (new Set(changes.map((change) => change.roomTypeId)).size !== 1) throw new BadRequestException('Một batch chỉ được tác động một hạng phòng.');
        const result = await this.inventory.setPartnerInventory({ organizationId: binding.organizationId, actorId: await this.workbookCreatorByBinding(binding.id), changes, idempotencyKey: batch.id, bindingId: binding.id });
        acceptedVersions = result.items.map((row) => row.version);
        mutationCompleted = true;
      }
      const acceptedAt = new Date().toISOString();
      await this.prisma.$transaction(async (tx) => {
        await tx.sheetDraftBatch.update({ where: { id: batch.id }, data: { status: 'applied', appliedAt: new Date() } });
        for (const [index, item] of batch.items.entries()) await tx.sheetDraftItem.update({ where: { id: item.id }, data: { proposed: asJson(parsed[index]), result: asJson({ status: 'applied', acceptedVersion: acceptedVersions[index], acceptedAt, attribution: 'file_principal' }) } });
      });
      try { await this.writeResults(spreadsheetId, binding, batch, batch.items.map((item, index) => ({ item, status: 'APPLIED', message: 'Đã ghi vào PostgreSQL; đồng bộ output đang chờ.', acceptedVersion: acceptedVersions[index], acceptedAt }))); }
      catch { /* Inventory and result are committed in PostgreSQL; the next poll repairs only the RESULT projection. */ }
    } catch (error) {
      if (mutationCompleted) throw error;
      const message = error instanceof Error ? error.message : 'Không áp dụng được batch.';
      if (!(error instanceof BadRequestException) && !(error instanceof ConflictException)) throw error;
      const isConflict = error instanceof ConflictException || /version|xung đột|conflict|đã đổi/i.test(message);
      const current = await this.prisma.inventoryDay.findMany({ where: { OR: batch.items.map((item) => ({ roomTypeId: item.roomTypeId, stayDate: item.stayDate })) } });
      await this.prisma.$transaction(async (tx) => {
        await tx.sheetDraftBatch.update({ where: { id: batch.id }, data: { status: isConflict ? 'conflict' : 'failed', payloadHash: hash, submittedAt: new Date() } });
        for (const item of batch.items) {
          const now = current.find((row) => row.roomTypeId === item.roomTypeId && dayKey(row.stayDate) === dayKey(item.stayDate));
          const baseline = snapshot(item.baseline);
          const proposed = parsedProposal(normalizedRows[batch.items.indexOf(item)]);
          let conflictId: string | null = null;
          if (isConflict && now) {
            const conflict = await tx.inventoryConflict.create({ data: { source: 'google_sheets', sourceId: batch.id, roomTypeId: item.roomTypeId, stayDate: item.stayDate, baseSnapshot: asJson(baseline), currentSnapshot: asJson(now), proposedSnapshot: asJson(proposed), currentVersion: now.version } });
            conflictId = conflict.id;
          }
          await tx.sheetDraftItem.update({ where: { id: item.id }, data: { proposed: asJson(proposed), result: asJson({ status: isConflict ? 'conflict' : 'invalid', message, current: now ?? null, conflictId }) } });
        }
      });
      await this.writeResults(spreadsheetId, binding, batch, batch.items.map((item) => ({ item, status: isConflict ? 'CONFLICT' : 'INVALID', message, acceptedVersion: '', conflictId: current.length ? 'Mở trung tâm xung đột' : '' })));
    }
  }

  private async workbookCreatorByBinding(bindingId: string): Promise<string> {
    const binding = await this.prisma.sheetPropertyBinding.findUnique({ where: { id: bindingId }, include: { workbook: { select: { createdById: true } } } });
    if (!binding) throw new NotFoundException('Không tìm thấy binding.');
    return binding.workbook.createdById;
  }

  private async writeResults(spreadsheetId: string, binding: { sheetTitle: string; resultRange: string }, batch: { id: string; resultStartRow: number }, rows: Array<{ item: { id: string; roomTypeId: string; stayDate: Date }; status: string; message: string; acceptedVersion: number | string; acceptedAt?: string; conflictId?: string }>) {
    const values: SheetCell[][] = [RESULT_HEADERS, ...rows.map(({ item, status, message, acceptedVersion, acceptedAt, conflictId }) => [batch.id, item.id, item.roomTypeId, dayKey(item.stayDate), status, message, acceptedVersion, acceptedAt ?? '', conflictId ?? ''])];
    await this.provider.write(spreadsheetId, sheetRange(binding.sheetTitle, binding.resultRange, batch.resultStartRow, values.length), values);
  }

  private async restoreResults(spreadsheetId: string, binding: { sheetTitle: string; resultRange: string }, batch: { id: string; status: string; resultStartRow: number; items: Array<{ id: string; roomTypeId: string; stayDate: Date; result: Prisma.JsonValue }> }) {
    const values: SheetCell[][] = [RESULT_HEADERS, ...batch.items.map((item) => { const result = snapshot(item.result); return [batch.id, item.id, item.roomTypeId, dayKey(item.stayDate), cellText(result.status) || batch.status, cellText(result.message), (result.acceptedVersion as number | string) ?? '', cellText(result.acceptedAt), cellText(result.conflictId)]; })];
    await this.provider.write(spreadsheetId, sheetRange(binding.sheetTitle, binding.resultRange, batch.resultStartRow, values.length), values);
  }
}

function parsedProposal(row: SheetCell[]): JsonRecord {
  return { newExternalSoldCount: row[9] ?? null, newMaintenanceCount: row[10] ?? null, newOwnerWithheldCount: row[11] ?? null, newStopSell: row[12] ?? null, operation: cellText(row[13]), reason: cellText(row[14]) };
}
