import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
export type AvailableChange = { roomTypeId: string; stayDate: string; available: number; expectedVersion: number; reopen?: boolean };
export type InventoryNight = { roomTypeId: string; stayDate: Date; quantity: number };
export type PartnerInventoryChange = {
  roomTypeId: string; stayDate: string; expectedVersion: number;
  externalSoldCount?: number; maintenanceCount?: number; ownerWithheldCount?: number; stopSell?: boolean;
};
type DaySnapshot = {
  roomTypeId: string; stayDate: Date; capacity: number; blockedCount: number; heldCount: number;
  reservedCount: number; stopSell: boolean; version: number; lastConfirmedAt?: Date | null;
};

export function availableRaw(day: Pick<DaySnapshot, 'capacity' | 'blockedCount' | 'heldCount' | 'reservedCount'>): number {
  return day.capacity - day.blockedCount - day.heldCount - day.reservedCount;
}

export function validateInventoryInvariant(day: Pick<DaySnapshot, 'capacity' | 'blockedCount' | 'heldCount' | 'reservedCount'>): void {
  if ([day.capacity, day.blockedCount, day.heldCount, day.reservedCount].some((value) => !Number.isInteger(value) || value < 0)) {
    throw new ConflictException('Số liệu quỹ phòng không hợp lệ; cần quản trị viên kiểm tra trước khi sửa.');
  }
  if (day.blockedCount + day.heldCount + day.reservedCount > day.capacity) {
    throw new ConflictException('Quỹ phòng đang có sai lệch vượt sức chứa; không thể ghi đè.');
  }
}

function dateKey(date: Date): string { return date.toISOString().slice(0, 10); }
function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Ngày phải có định dạng YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException('Ngày không hợp lệ');
  return date;
}
function dateRange(fromValue: string, toExclusiveValue: string, maxNights = 90) {
  const from = dateOnly(fromValue);
  const to = dateOnly(toExclusiveValue);
  const count = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (count < 1 || count > maxNights) throw new BadRequestException(`Khoảng ngày phải từ 1 đến ${maxNights} đêm`);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(from);
    day.setUTCDate(day.getUTCDate() + index);
    return day;
  });
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (_key, item) => item instanceof Date ? item.toISOString() : item)) as Prisma.InputJsonValue;
}

@Injectable()
export class InventoryMutationService {
  constructor(private readonly prisma: PrismaService) {}

  // Inventory mutations acquire advisory locks in a globally stable order.
  // Their following READ COMMITTED statement then observes the winner's row
  // version and returns an actionable optimistic-version conflict, instead of
  // surfacing a serialization failure as a server error.
  async lockRows(tx: Tx, rows: Array<{ roomTypeId: string; stayDate: Date }>): Promise<void> {
    const ordered = [...new Map(rows.map((row) => [`${row.roomTypeId}:${dateKey(row.stayDate)}`, row])).values()]
      .sort((a, b) => a.roomTypeId.localeCompare(b.roomTypeId) || a.stayDate.getTime() - b.stayDate.getTime());
    for (const row of ordered) {
      const lockKey = `${row.roomTypeId}:${dateKey(row.stayDate)}`;
      // Keep the void-returning lock call inside a subquery and expose a scalar
      // Prisma can deserialize; querying the advisory function directly fails
      // at runtime before the inventory row is locked.
      await tx.$queryRaw<Array<{ locked: number }>>(Prisma.sql`SELECT 1::int AS locked FROM (SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))) AS advisory_lock`);
      await tx.$queryRaw(Prisma.sql`SELECT room_type_id FROM inventory_days WHERE room_type_id = ${row.roomTypeId}::uuid AND stay_date = ${row.stayDate}::date FOR UPDATE`);
    }
  }

  async enqueueChanged(tx: Tx, row: DaySnapshot, source: string, command: string): Promise<void> {
    await tx.outboxEvent.create({ data: {
      eventType: 'inventory.changed',
      aggregateType: 'room_type',
      aggregateId: row.roomTypeId,
      dedupeKey: `inventory:${row.roomTypeId}:${dateKey(row.stayDate)}:${row.version}`,
      availableAt: new Date(Date.now() + 10_000),
      payload: toJson({ roomTypeId: row.roomTypeId, stayDate: dateKey(row.stayDate), version: row.version, source, command }),
    } });
  }

  async hold(tx: Tx, bookingId: string, nights: InventoryNight[]): Promise<void> {
    for (const night of this.orderedNights(nights)) {
      const row = await tx.inventoryDay.update({
        where: { roomTypeId_stayDate: { roomTypeId: night.roomTypeId, stayDate: night.stayDate } },
        data: { heldCount: { increment: night.quantity }, version: { increment: 1 } },
      });
      await this.enqueueChanged(tx, row, 'booking', 'hold_created');
    }
    void bookingId;
  }

  async confirmHold(tx: Tx, bookingId: string, nights: InventoryNight[]): Promise<void> {
    for (const night of this.orderedNights(nights)) {
      const row = await tx.inventoryDay.update({
        where: { roomTypeId_stayDate: { roomTypeId: night.roomTypeId, stayDate: night.stayDate } },
        data: { heldCount: { decrement: night.quantity }, reservedCount: { increment: night.quantity }, version: { increment: 1 } },
      });
      await this.enqueueChanged(tx, row, 'booking', 'hold_confirmed');
    }
    void bookingId;
  }

  async releaseReservationRows(
    tx: Tx,
    reservations: Array<{ id: string; status: string; nights: InventoryNight[] }>,
  ): Promise<void> {
    for (const reservation of reservations) {
      if (reservation.status !== 'held' && reservation.status !== 'confirmed') continue;
      const moved = await tx.inventoryReservation.updateMany({
        where: { id: reservation.id, status: reservation.status },
        data: { status: 'released', releasedAt: new Date(), expiresAt: null },
      });
      if (moved.count !== 1) continue;
      for (const night of this.orderedNights(reservation.nights)) {
        const field = reservation.status === 'held' ? 'heldCount' : 'reservedCount';
        const row = await tx.inventoryDay.update({
          where: { roomTypeId_stayDate: { roomTypeId: night.roomTypeId, stayDate: night.stayDate } },
          data: { [field]: { decrement: night.quantity }, version: { increment: 1 } },
        });
        await this.enqueueChanged(tx, row, 'booking', 'reservation_released');
      }
    }
  }

  async updateAdminRange(roomTypeId: string, input: {
    from: string; to: string; capacity: number; blockedCount?: number; stopSell?: boolean; note?: string; expectedVersions: Record<string, number>;
  }, actorId: string, idempotencyKey: string) {
    if (!Number.isInteger(input.capacity) || input.capacity < 0 || !Number.isInteger(input.blockedCount ?? 0) || (input.blockedCount ?? 0) < 0) {
      throw new BadRequestException('Sức chứa và số khoá phải là số nguyên không âm');
    }
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 160) throw new BadRequestException('Cần Idempotency-Key hợp lệ');
    const dates = dateRange(input.from, input.to);
    const room = await this.prisma.roomType.findUnique({ where: { id: roomTypeId }, select: { id: true, approvedPoolLimit: true } });
    if (!room) throw new NotFoundException('Không tìm thấy hạng phòng');
    if (room.approvedPoolLimit !== null && input.capacity > room.approvedPoolLimit) {
      throw new ConflictException('Sức chứa vượt quá quỹ tối đa đã được duyệt.');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockRows(tx, dates.map((stayDate) => ({ roomTypeId, stayDate })));
      const output: DaySnapshot[] = [];
      let blocksCreated = 0;
      const confirmedAt = new Date();
      const request = { from: input.from, to: input.to, capacity: input.capacity, blockedCount: input.blockedCount ?? null, stopSell: input.stopSell ?? null, note: input.note?.trim() ?? null, expectedVersions: input.expectedVersions };
      const previous = await tx.inventoryChange.findMany({ where: { source: 'admin', idempotencyKey, roomTypeId } });
      if (previous.length) {
        if (previous.length !== dates.length) throw new ConflictException('Idempotency-Key đã được dùng cho một khoảng dữ liệu khác.');
        const byDate = new Map(previous.map((row) => [dateKey(row.stayDate), row]));
        return { items: dates.map((stayDate) => {
          const row = byDate.get(dateKey(stayDate)); const saved = row?.toSnapshot as { request?: typeof request; row?: DaySnapshot } | undefined;
          // PostgreSQL JSONB normalizes object key order; equality must not
          // depend on the serialized insertion order of the original request.
          if (!row || row.command !== 'admin_bulk_inventory_update' || !saved || !isDeepStrictEqual(saved.request, request) || !saved.row) throw new ConflictException('Idempotency-Key đã được dùng với dữ liệu khác.');
          const savedDay = saved.row.stayDate as unknown as Date | string;
          return { ...saved.row, stayDate: typeof savedDay === 'string' ? savedDay.slice(0, 10) : dateKey(savedDay), available: saved.row.stopSell ? 0 : availableRaw(saved.row) };
        }), blocksCreated: 0, replayed: true };
      }
      for (const stayDate of dates) {
        const current = await tx.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId, stayDate } } });
        const expectedVersion = input.expectedVersions?.[dateKey(stayDate)];
        if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw new BadRequestException(`Thiếu phiên bản tồn ngày ${dateKey(stayDate)}.`);
        if ((current?.version ?? 0) !== expectedVersion) throw new ConflictException({ code: 'inventory_version_conflict', stayDate: dateKey(stayDate), currentVersion: current?.version ?? 0, message: `Quỹ ngày ${dateKey(stayDate)} đã đổi; toàn bộ lô chưa được ghi.` });
        if (await tx.inventoryIntegrityIncident.findFirst({ where: { roomTypeId, stayDate, resolvedAt: null } })) throw new ConflictException(`Ngày ${dateKey(stayDate)} đang có sai lệch cần xác minh.`);
        const requestedBlocked = input.blockedCount ?? current?.blockedCount ?? 0;
        const activeBlocks = await tx.inventoryBlock.findMany({
          where: { status: 'active', nights: { some: { roomTypeId, stayDate } } },
          include: { nights: { where: { roomTypeId, stayDate }, select: { quantity: true } } },
        });
        const managedBlocks = activeBlocks.filter((item) => item.kind === 'admin_calendar');
        const otherLedgerBlocked = activeBlocks.filter((item) => item.kind !== 'admin_calendar')
          .reduce((sum, item) => sum + item.nights.reduce((nightSum, night) => nightSum + night.quantity, 0), 0);
        const managedBlocked = requestedBlocked - otherLedgerBlocked;
        if (managedBlocked < 0) throw new ConflictException(`Số khoá không thể thấp hơn các nguồn đang khoá ngày ${dateKey(stayDate)} (${otherLedgerBlocked})`);
        if (requestedBlocked > input.capacity) throw new BadRequestException(`Số phòng khoá ngày ${dateKey(stayDate)} không thể lớn hơn sức chứa`);
        const occupied = (current?.heldCount ?? 0) + (current?.reservedCount ?? 0);
        if (input.capacity < requestedBlocked + occupied) throw new ConflictException(`Sức chứa ngày ${dateKey(stayDate)} nhỏ hơn số phòng đã khoá/giữ/đặt`);
        // Block nights reference the inventory day. Create a missing day first,
        // within the same locked transaction, before inserting its ledger rows.
        const row = await tx.inventoryDay.upsert({
          where: { roomTypeId_stayDate: { roomTypeId, stayDate } },
          create: { roomTypeId, stayDate, capacity: input.capacity, blockedCount: requestedBlocked, stopSell: input.stopSell ?? false, lastConfirmedAt: confirmedAt, lastConfirmedById: actorId, lastConfirmedSource: 'admin' },
          update: { capacity: input.capacity, blockedCount: requestedBlocked, ...(input.stopSell !== undefined ? { stopSell: input.stopSell } : {}), lastConfirmedAt: confirmedAt, lastConfirmedById: actorId, lastConfirmedSource: 'admin', version: { increment: 1 } },
        });
        if (managedBlocks.length) await tx.inventoryBlock.updateMany({ where: { id: { in: managedBlocks.map((item) => item.id) }, status: 'active' }, data: { status: 'released', releasedAt: new Date(), version: { increment: 1 } } });
        if (managedBlocked > 0) {
          await tx.inventoryBlock.create({ data: {
            kind: 'admin_calendar', reason: input.note?.trim() || 'Khoá phòng từ lịch quản trị', createdBy: actorId,
            sourceKey: `admin:${randomUUID()}`,
            nights: { create: { roomTypeId, stayDate, quantity: managedBlocked } },
          } });
          blocksCreated++;
        }
        validateInventoryInvariant(row);
        output.push(row);
        await this.enqueueChanged(tx, row, 'admin', 'bulk_inventory_update');
        await tx.inventoryChange.create({ data: {
          roomTypeId, stayDate, source: 'admin', command: 'admin_bulk_inventory_update', idempotencyKey,
          fromSnapshot: toJson(current ?? { missing: true }), toSnapshot: toJson({ request, row }), actorId,
        } });
      }
      await tx.auditLog.create({ data: {
        actorId, action: 'inventory.bulk_updated', entityType: 'room_type', entityId: roomTypeId,
        diff: toJson({ from: input.from, toExclusive: input.to, capacity: input.capacity, blockedCount: input.blockedCount ?? null, stopSell: input.stopSell ?? null, blocksCreated, idempotencyKey }),
      } });
      return { items: output.map((row) => ({ ...row, stayDate: dateKey(row.stayDate), available: row.stopSell ? 0 : availableRaw(row) })), blocksCreated, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async previewPartnerSet(input: { organizationId: string; actorId: string; changes: PartnerInventoryChange[] }) {
    this.validatePartnerChanges(input.changes);
    return this.prisma.$transaction(async (tx) => {
      const items = [];
      for (const change of input.changes) {
        const stayDate = dateOnly(change.stayDate);
        const room = await tx.roomType.findUnique({ where: { id: change.roomTypeId }, select: { propertyId: true } });
        if (!room) throw new NotFoundException('Không tìm thấy hạng phòng trong yêu cầu.');
        await this.assertActiveGrant(tx, input.organizationId, input.actorId, room.propertyId, change.roomTypeId, 'write');
        const current = await tx.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: change.roomTypeId, stayDate } } });
        if (!current) throw new ConflictException(`Ngày ${change.stayDate} chưa được mở quỹ.`);
        if (current.version !== change.expectedVersion) throw new ConflictException({ code: 'inventory_version_conflict', stayDate: change.stayDate, currentVersion: current.version });
        const incident = await tx.inventoryIntegrityIncident.findFirst({ where: { roomTypeId: change.roomTypeId, stayDate, resolvedAt: null } });
        if (incident) throw new ConflictException(`Ngày ${change.stayDate} đang cần quản trị viên xác minh.`);
        const ledger = await this.partnerLedger(tx, input.organizationId, change.roomTypeId, stayDate, current);
        const externalSoldCount = change.externalSoldCount ?? ledger.own.external_sold;
        const maintenanceCount = change.maintenanceCount ?? ledger.own.maintenance;
        const ownerWithheldCount = change.ownerWithheldCount ?? ledger.own.owner_withheld;
        const blockedCount = ledger.otherBlocked + externalSoldCount + maintenanceCount + ownerWithheldCount;
        const after = { ...current, blockedCount, stopSell: change.stopSell ?? current.stopSell };
        validateInventoryInvariant(after);
        items.push({ stayDate: change.stayDate, roomTypeId: change.roomTypeId, before: current, after: { ...after, available: after.stopSell ? 0 : availableRaw(after) } });
      }
      return { items, atomic: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async setPartnerInventory(input: {
    organizationId: string; actorId: string; changes: PartnerInventoryChange[]; idempotencyKey: string; bindingId?: string;
  }) {
    this.validatePartnerChanges(input.changes);
    if (!input.idempotencyKey || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 160) throw new BadRequestException('Cần Idempotency-Key hợp lệ');
    const dates = input.changes.map((change) => ({ roomTypeId: change.roomTypeId, stayDate: dateOnly(change.stayDate) }));
    const ordered = [...input.changes].sort((a, b) => a.roomTypeId.localeCompare(b.roomTypeId) || a.stayDate.localeCompare(b.stayDate));
    return this.prisma.$transaction(async (tx) => {
      const rooms = await tx.roomType.findMany({ where: { id: { in: [...new Set(ordered.map((change) => change.roomTypeId))] } }, select: { id: true, propertyId: true, approvedPoolLimit: true } });
      const roomById = new Map(rooms.map((room) => [room.id, room]));
      if (roomById.size !== new Set(ordered.map((change) => change.roomTypeId)).size) throw new NotFoundException('Một hoặc nhiều hạng phòng không tồn tại.');
      if (!input.bindingId) for (const room of rooms) await this.assertActiveGrant(tx, input.organizationId, input.actorId, room.propertyId, room.id, 'write');
      await this.lockRows(tx, dates);
      if (input.bindingId) for (const change of ordered) {
        const room = roomById.get(change.roomTypeId)!;
        await this.assertActiveSheetGrant(tx, input.bindingId, input.organizationId, room.propertyId, room.id, dateOnly(change.stayDate));
      }

      const source = input.bindingId ? `google_sheets:${input.bindingId}` : `partner:${input.organizationId}:bulk`;
      const prior = await tx.inventoryChange.findMany({ where: { source, idempotencyKey: input.idempotencyKey } });
      if (prior.length) {
        if (prior.length !== ordered.length) throw new ConflictException('Idempotency-Key đã được dùng một phần; không thể áp dụng lại lô này.');
        const byKey = new Map(prior.map((row) => [`${row.roomTypeId}:${dateKey(row.stayDate)}`, row]));
        const replay = ordered.map((change) => {
          const row = byKey.get(`${change.roomTypeId}:${change.stayDate}`);
          const saved = row?.toSnapshot as { request?: PartnerInventoryChange; row?: DaySnapshot } | undefined;
          if (!row || !['partner_bulk_set', 'sheet_bulk_set'].includes(row.command) || !isDeepStrictEqual(saved?.request, change) || !saved?.row) {
            throw new ConflictException('Idempotency-Key đã được dùng cho lô dữ liệu khác. Tạo lô mới để sửa tiếp.');
          }
          return { ...saved.row, stayDate: change.stayDate, available: saved.row.stopSell ? 0 : availableRaw(saved.row) };
        });
        return { items: replay, replayed: true, syncStatus: 'queued' as const };
      }

      const output: DaySnapshot[] = [];
      const now = new Date();
      for (const change of ordered) {
        const stayDate = dateOnly(change.stayDate);
        const current = await tx.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: change.roomTypeId, stayDate } } });
        if (!current) throw new ConflictException(`Ngày ${change.stayDate} chưa được mở quỹ; không tự tạo tồn.`);
        if (current.version !== change.expectedVersion) throw new ConflictException({ code: 'inventory_version_conflict', stayDate: change.stayDate, currentVersion: current.version, message: 'Lịch đã đổi; toàn bộ lô chưa được ghi.' });
        if (await tx.inventoryIntegrityIncident.findFirst({ where: { roomTypeId: change.roomTypeId, stayDate, resolvedAt: null } })) throw new ConflictException(`Ngày ${change.stayDate} đang có sai lệch cần quản trị viên xác minh.`);
        const ledger = await this.partnerLedger(tx, input.organizationId, change.roomTypeId, stayDate, current);
        const externalSoldCount = change.externalSoldCount ?? ledger.own.external_sold;
        const maintenanceCount = change.maintenanceCount ?? ledger.own.maintenance;
        const ownerWithheldCount = change.ownerWithheldCount ?? ledger.own.owner_withheld;
        const newBlocked = ledger.otherBlocked + externalSoldCount + maintenanceCount + ownerWithheldCount;
        const afterCounts = { ...current, blockedCount: newBlocked };
        validateInventoryInvariant(afterCounts);
        const room = roomById.get(change.roomTypeId)!;
        if (room.approvedPoolLimit !== null && current.capacity > room.approvedPoolLimit) throw new ConflictException('Quỹ ngày vượt mức tối đa đã duyệt; quản trị viên cần rà soát.');

        for (const kind of ['external_sold', 'maintenance', 'owner_withheld'] as const) {
          const blocks = ledger.blocks.filter((block) => block.kind === kind && block.ownerOrganizationId === input.organizationId);
          if (blocks.length) await tx.inventoryBlock.updateMany({ where: { id: { in: blocks.map((block) => block.id) }, status: 'active' }, data: { status: 'released', releasedAt: now, version: { increment: 1 } } });
          const quantity = kind === 'external_sold' ? externalSoldCount : kind === 'maintenance' ? maintenanceCount : ownerWithheldCount;
          if (quantity > 0) await tx.inventoryBlock.create({ data: {
            kind, reason: 'Điều chỉnh quỹ từ Cổng đối tác', ownerOrganizationId: input.organizationId,
            createdBy: input.actorId, sourceKey: `partner:${input.organizationId}:${change.roomTypeId}:${change.stayDate}:${kind}:${randomUUID()}`,
            nights: { create: { roomTypeId: change.roomTypeId, stayDate, quantity } },
          } });
        }
        const updated = await tx.inventoryDay.update({
          where: { roomTypeId_stayDate: { roomTypeId: change.roomTypeId, stayDate } },
          data: {
            blockedCount: newBlocked, ...(change.stopSell !== undefined ? { stopSell: change.stopSell } : {}),
            lastConfirmedAt: now, lastConfirmedById: input.actorId, lastConfirmedSource: 'partner_portal', version: { increment: 1 },
          },
        });
        validateInventoryInvariant(updated);
        await tx.inventoryChange.create({ data: {
          organizationId: input.organizationId, roomTypeId: change.roomTypeId, stayDate,
          source, command: input.bindingId ? 'sheet_bulk_set' : 'partner_bulk_set', idempotencyKey: input.idempotencyKey,
          fromSnapshot: toJson(current), toSnapshot: toJson({ request: change, row: updated }), actorId: input.actorId,
        } });
        await this.enqueueChanged(tx, updated, input.bindingId ? 'google_sheets' : 'partner_portal', input.bindingId ? 'sheet_bulk_set' : 'bulk_set');
        output.push(updated);
      }
      await tx.auditLog.create({ data: {
        actorId: input.actorId, action: input.bindingId ? 'inventory.sheets_bulk_set' : 'inventory.partner_bulk_set', entityType: 'partner_organization', entityId: input.organizationId,
        diff: toJson({ idempotencyKey: input.idempotencyKey, bindingId: input.bindingId ?? null, attribution: input.bindingId ? 'file_principal' : 'partner_user', changes: ordered.map(({ roomTypeId, stayDate, expectedVersion }) => ({ roomTypeId, stayDate, expectedVersion })) }),
      } });
      return { items: output.map((row) => ({ ...row, stayDate: dateKey(row.stayDate), available: row.stopSell ? 0 : availableRaw(row) })), replayed: false, syncStatus: 'queued' as const };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private validatePartnerChanges(changes: PartnerInventoryChange[]): void {
    if (!Array.isArray(changes) || changes.length < 1 || changes.length > 250) throw new BadRequestException('Một lô cần từ 1 đến 250 ngày.');
    const seen = new Set<string>();
    for (const change of changes) {
      const key = `${change.roomTypeId}:${change.stayDate}`;
      if (seen.has(key)) throw new BadRequestException('Một ngày/hạng phòng chỉ được xuất hiện một lần trong lô.');
      seen.add(key);
      dateOnly(change.stayDate);
      if (!Number.isInteger(change.expectedVersion) || change.expectedVersion < 1) throw new BadRequestException('Thiếu phiên bản nền cho một hoặc nhiều ngày.');
      for (const field of ['externalSoldCount', 'maintenanceCount', 'ownerWithheldCount'] as const) {
        const value = change[field];
        if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 5000)) throw new BadRequestException(`${field} phải là số nguyên từ 0 đến 5.000.`);
      }
      if (change.stopSell !== undefined && typeof change.stopSell !== 'boolean') throw new BadRequestException('Trạng thái dừng bán không hợp lệ.');
    }
  }

  private async partnerLedger(db: Prisma.TransactionClient | PrismaService, organizationId: string, roomTypeId: string, stayDate: Date, current: DaySnapshot) {
    const blocks = await db.inventoryBlock.findMany({
      where: { status: 'active', nights: { some: { roomTypeId, stayDate } } },
      include: { nights: { where: { roomTypeId, stayDate }, select: { quantity: true } } },
    });
    const total = blocks.reduce((sum, block) => sum + block.nights.reduce((sub, night) => sub + night.quantity, 0), 0);
    if (total !== current.blockedCount) throw new ConflictException('Tổng ledger không khớp bộ đếm hiện tại; không ghi để tránh làm sai quỹ.');
    const own = { external_sold: 0, maintenance: 0, owner_withheld: 0 };
    for (const block of blocks) {
      if (block.ownerOrganizationId !== organizationId || !Object.hasOwn(own, block.kind)) continue;
      own[block.kind as keyof typeof own] += block.nights.reduce((sum, night) => sum + night.quantity, 0);
    }
    const ownTotal = own.external_sold + own.maintenance + own.owner_withheld;
    return { blocks, own, otherBlocked: total - ownTotal };
  }

  async quickSetAvailable(input: {
    organizationId: string; actorId: string; roomTypeId: string; stayDate: string; available: number;
    expectedVersion: number; idempotencyKey: string; reopen?: boolean;
  }) {
    const result = await this.setAvailableBatch([{
      roomTypeId: input.roomTypeId, stayDate: input.stayDate, available: input.available,
      expectedVersion: input.expectedVersion, reopen: input.reopen ?? false,
    }], input.actorId, input.idempotencyKey, false, input.organizationId);
    return { ...result.items[0], replayed: result.replayed };
  }

  async setAvailableBatch(changes: AvailableChange[], actorId: string, idempotencyKey: string, preview = false, organizationId?: string) {
    if (!changes.length || changes.length > 90) throw new BadRequestException('Chọn từ 1 đến 90 ô quỹ phòng.');
    if (!preview && (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 160)) throw new BadRequestException('Cần Idempotency-Key hợp lệ');
    const ordered = [...changes].sort((a, b) => a.roomTypeId.localeCompare(b.roomTypeId) || a.stayDate.localeCompare(b.stayDate));
    if (ordered.some((change) => !Number.isInteger(change.expectedVersion) || change.expectedVersion < 1)) throw new BadRequestException('Thiếu phiên bản nền hợp lệ.');
    if (new Set(ordered.map((c) => `${c.roomTypeId}:${c.stayDate}`)).size !== ordered.length) throw new BadRequestException('Một ô chỉ được xuất hiện một lần.');
    return this.prisma.$transaction(async (tx) => {
      await this.lockRows(tx, ordered.map((c) => ({ roomTypeId: c.roomTypeId, stayDate: dateOnly(c.stayDate) })));
      if (!preview) {
        const source = organizationId ? `partner:${organizationId}` : `admin:${actorId}:available`;
        const prior = await tx.inventoryChange.findMany({ where: { source, idempotencyKey } });
        const cells = new Set(ordered.map((c) => `${c.roomTypeId}:${c.stayDate}`));
        if (prior.length && (prior.length !== ordered.length || prior.some((row) => !cells.has(`${row.roomTypeId}:${dateKey(row.stayDate)}`)))) {
          throw new ConflictException('Idempotency-Key đã được dùng cho phạm vi khác. Hãy tạo lệnh mới.');
        }
      }
      const items = [];
      for (const change of ordered) items.push(await this.quickSetAvailableTx(tx, { ...change, actorId, organizationId, idempotencyKey }, preview, ordered));
      return { items, replayed: items.every((row) => row.replayed), atomic: true, preview };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private async quickSetAvailableTx(tx: Tx, input: AvailableChange & { organizationId?: string; actorId: string; idempotencyKey: string }, preview: boolean, request: AvailableChange[]) {
    if (!Number.isInteger(input.available) || input.available < 0 || input.available > 5000) throw new BadRequestException('Số lượng còn bán phải là số nguyên từ 0 đến 5.000');
    if (!input.idempotencyKey || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 160) throw new BadRequestException('Cần Idempotency-Key hợp lệ');
    const stayDate = dateOnly(input.stayDate);
      const room = await tx.roomType.findUnique({ where: { id: input.roomTypeId }, select: { id: true, propertyId: true, approvedPoolLimit: true, status: true, capacityVerified: true, property: { select: { content: { select: { isDemo: true } } } } } });
      if (!room) throw new NotFoundException('Không tìm thấy hạng phòng');
      if (input.organizationId) await this.assertActiveGrant(tx, input.organizationId, input.actorId, room.propertyId, input.roomTypeId, 'write');
      else if (room.property.content.isDemo || room.status !== 'active' || !room.capacityVerified) throw new ConflictException('Hạng phòng chưa hoạt động hoặc chưa xác minh sức chứa; chưa được thao tác bán.');
      const source = input.organizationId ? `partner:${input.organizationId}` : `admin:${input.actorId}:available`;
      const previous = preview ? null : await tx.inventoryChange.findFirst({ where: { source, idempotencyKey: input.idempotencyKey, roomTypeId: input.roomTypeId, stayDate } });
      if (previous) {
        const saved = previous.toSnapshot as { requestedAvailable?: number; request?: AvailableChange[]; row?: DaySnapshot };
        if (previous.command !== 'quick_set_available' || saved.requestedAvailable !== input.available || (saved.request && !isDeepStrictEqual(saved.request, JSON.parse(JSON.stringify(request)))) || !saved.row) {
          throw new ConflictException('Idempotency-Key đã được dùng cho dữ liệu khác. Hãy tạo lệnh mới.');
        }
        return { ...saved.row, stayDate: dateKey(new Date(saved.row.stayDate)), available: saved.row.stopSell ? 0 : availableRaw(saved.row), replayed: true };
      }
      const current = await tx.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: input.roomTypeId, stayDate } } });
      if (!current) throw new ConflictException('Ngày này chưa được mở quỹ; yêu cầu chủ cơ sở/quản trị viên mở trước.');
      if (current.version !== input.expectedVersion) throw new ConflictException({ code: 'inventory_version_conflict', message: 'Lịch tồn đã đổi ở nơi khác. Tải lại để xem bản hiện tại; thay đổi của bạn chưa bị ghi đè.', currentVersion: current.version });
      if (current.stopSell && !input.reopen) throw new ConflictException('Ngày đang dừng bán. Hãy xác nhận rõ thao tác mở bán trước khi sửa số còn bán.');
      const incident = await tx.inventoryIntegrityIncident.findFirst({ where: { roomTypeId: input.roomTypeId, stayDate, resolvedAt: null } });
      if (incident) throw new ConflictException('Ngày này đang có sai lệch ledger; cần quản trị viên xử lý trước.');

      const blocks = await tx.inventoryBlock.findMany({
        where: { status: 'active', nights: { some: { roomTypeId: input.roomTypeId, stayDate } } },
        include: { nights: { where: { roomTypeId: input.roomTypeId, stayDate }, select: { quantity: true } } },
      });
      const ownWithheld = blocks.filter((block) => input.organizationId ? block.kind === 'owner_withheld' && block.ownerOrganizationId === input.organizationId : block.kind === 'admin_calendar');
      const ownCount = ownWithheld.reduce((sum, block) => sum + block.nights.reduce((nightSum, night) => nightSum + night.quantity, 0), 0);
      const ledgerCount = blocks.reduce((sum, block) => sum + block.nights.reduce((nightSum, night) => nightSum + night.quantity, 0), 0);
      if (ledgerCount !== current.blockedCount) {
        throw new ConflictException('Tổng ledger không khớp bộ đếm đang lưu; không ghi để tránh làm sai quỹ.');
      }
      const otherBlocked = ledgerCount - ownCount;
      const maxAvailableWithoutOwn = current.capacity - otherBlocked - current.heldCount - current.reservedCount;
      const newOwnWithheld = maxAvailableWithoutOwn - input.available;
      if (newOwnWithheld < 0) throw new ConflictException(`Số còn bán vượt mức cho phép (${Math.max(0, maxAvailableWithoutOwn)}); kiểm tra bán ngoài/bảo trì/giữ riêng trước.`);
      if (room.approvedPoolLimit !== null && current.capacity > room.approvedPoolLimit) throw new ConflictException('Quỹ ngày vượt mức tối đa đã duyệt; quản trị viên cần rà soát.');
      validateInventoryInvariant(current);
      if (preview) return { ...current, stayDate: input.stayDate, available: input.available, beforeAvailable: current.stopSell ? 0 : availableRaw(current), replayed: false };

      if (ownWithheld.length) await tx.inventoryBlock.updateMany({ where: { id: { in: ownWithheld.map((block) => block.id) }, status: 'active' }, data: { status: 'released', releasedAt: new Date(), version: { increment: 1 } } });
      if (newOwnWithheld > 0) await tx.inventoryBlock.create({ data: {
        kind: input.organizationId ? 'owner_withheld' : 'admin_calendar', reason: 'Điều chỉnh số còn bán từ lịch hạng phòng', status: 'active',
        ownerOrganizationId: input.organizationId ?? null, createdBy: input.actorId, sourceKey: `${source}:${randomUUID()}`,
        nights: { create: { roomTypeId: input.roomTypeId, stayDate, quantity: newOwnWithheld } },
      } });
      const updated = await tx.inventoryDay.update({
        where: { roomTypeId_stayDate: { roomTypeId: input.roomTypeId, stayDate } },
        data: {
          blockedCount: current.blockedCount - ownCount + newOwnWithheld,
          stopSell: input.reopen ? false : current.stopSell,
          lastConfirmedAt: new Date(), lastConfirmedById: input.actorId, lastConfirmedSource: input.organizationId ? 'partner_portal' : 'admin',
          version: { increment: 1 },
        },
      });
      validateInventoryInvariant(updated);
      const toSnapshot = toJson({ requestedAvailable: input.available, request, row: updated });
      await tx.inventoryChange.create({ data: {
        organizationId: input.organizationId, roomTypeId: input.roomTypeId, stayDate,
        source, command: 'quick_set_available', idempotencyKey: input.idempotencyKey,
        fromSnapshot: toJson(current), toSnapshot, actorId: input.actorId,
      } });
      await tx.auditLog.create({ data: {
        actorId: input.actorId, action: input.organizationId ? 'inventory.partner_quick_set' : 'inventory.admin_quick_set', entityType: 'room_type', entityId: input.roomTypeId,
        diff: toJson({ organizationId: input.organizationId ?? null, stayDate: input.stayDate, version: updated.version, requestedAvailable: input.available, source }),
      } });
      await this.enqueueChanged(tx, updated, input.organizationId ? 'partner_portal' : 'admin', 'quick_set_available');
      return { ...updated, stayDate: input.stayDate, available: updated.stopSell ? 0 : availableRaw(updated), replayed: false };
  }

  async confirmUnchanged(input: {
    organizationId: string; actorId: string; roomTypeId: string; from: string; to: string;
    expectedVersions: Record<string, number>; idempotencyKey: string;
  }) {
    if (!input.idempotencyKey || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 160) throw new BadRequestException('Cần Idempotency-Key hợp lệ');
    const dates = dateRange(input.from, input.to);
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.roomType.findUnique({ where: { id: input.roomTypeId }, select: { propertyId: true } });
      if (!room) throw new NotFoundException('Không tìm thấy hạng phòng');
      await this.assertActiveGrant(tx, input.organizationId, input.actorId, room.propertyId, input.roomTypeId, 'write');
      await this.lockRows(tx, dates.map((stayDate) => ({ roomTypeId: input.roomTypeId, stayDate })));
      const source = `partner:${input.organizationId}:confirm`;
      const existing = await tx.inventoryChange.findMany({ where: { source, idempotencyKey: input.idempotencyKey, roomTypeId: input.roomTypeId } });
      if (existing.length) {
        const byDate = new Map(existing.map((row) => [dateKey(row.stayDate), row]));
        if (existing.length !== dates.length) throw new ConflictException('Idempotency-Key đã được dùng cho một phạm vi khác.');
        const replay = dates.map((stayDate) => {
          const key = dateKey(stayDate);
          const prior = byDate.get(key);
          const snapshot = prior?.toSnapshot as { expectedVersion?: number; row?: DaySnapshot } | undefined;
          if (!prior || prior.command !== 'confirm_unchanged' || snapshot?.expectedVersion !== input.expectedVersions[key] || !snapshot.row) throw new ConflictException('Idempotency-Key đã được dùng với dữ liệu khác.');
          return { ...snapshot.row, stayDate: key };
        });
        return { items: replay, replayed: true };
      }
      const rows = [];
      for (const stayDate of dates) {
        const key = dateKey(stayDate);
        const current = await tx.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: input.roomTypeId, stayDate } } });
        if (!current) throw new ConflictException(`Ngày ${key} chưa có dữ liệu tồn; xác nhận không tự mở quỹ.`);
        if (current.version !== input.expectedVersions[key]) throw new ConflictException({ code: 'inventory_version_conflict', message: `Lịch tồn ngày ${key} đã thay đổi; chưa cập nhật lần xác nhận.`, currentVersion: current.version });
        const updated = await tx.inventoryDay.update({
          where: { roomTypeId_stayDate: { roomTypeId: input.roomTypeId, stayDate } },
          data: { lastConfirmedAt: new Date(), lastConfirmedById: input.actorId, lastConfirmedSource: 'partner_portal', version: { increment: 1 } },
        });
        await tx.inventoryChange.create({ data: {
          organizationId: input.organizationId, roomTypeId: input.roomTypeId, stayDate,
          source, command: 'confirm_unchanged', idempotencyKey: input.idempotencyKey,
          fromSnapshot: toJson(current), toSnapshot: toJson({ expectedVersion: input.expectedVersions[key], row: updated }), actorId: input.actorId,
        } });
        await this.enqueueChanged(tx, updated, 'partner_portal', 'confirm_unchanged');
        rows.push(updated);
      }
      await tx.auditLog.create({ data: {
        actorId: input.actorId, action: 'inventory.partner_confirmed', entityType: 'room_type', entityId: input.roomTypeId,
        diff: toJson({ organizationId: input.organizationId, from: input.from, toExclusive: input.to, source: 'partner_portal' }),
      } });
      return { items: rows, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private orderedNights(nights: InventoryNight[]): InventoryNight[] {
    return [...nights].sort((a, b) => a.roomTypeId.localeCompare(b.roomTypeId) || a.stayDate.getTime() - b.stayDate.getTime());
  }

  async confirmSheetUnchanged(input: {
    bindingId: string; organizationId: string; actorId: string; batchId: string; roomTypeId: string;
    expectedVersions: Record<string, number>; from: string; toExclusive: string;
  }) {
    const dates = dateRange(input.from, input.toExclusive, 31);
    const source = `google_sheets:${input.bindingId}:confirm`;
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.roomType.findUnique({ where: { id: input.roomTypeId }, select: { id: true, propertyId: true } });
      if (!room) throw new NotFoundException('Không tìm thấy hạng phòng.');
      await this.lockRows(tx, dates.map((stayDate) => ({ roomTypeId: room.id, stayDate })));
      for (const stayDate of dates) await this.assertActiveSheetGrant(tx, input.bindingId, input.organizationId, room.propertyId, room.id, stayDate);
      const prior = await tx.inventoryChange.findMany({ where: { source, idempotencyKey: input.batchId, roomTypeId: room.id } });
      if (prior.length) {
        if (prior.length !== dates.length || prior.some((change) => change.command !== 'confirm_unchanged')) throw new ConflictException('Batch đã được dùng cho nội dung khác.');
        return { items: prior.map((change) => ({ ...(change.toSnapshot as Record<string, unknown>) })), replayed: true };
      }
      const output = [];
      for (const stayDate of dates) {
        const key = dateKey(stayDate);
        const current = await tx.inventoryDay.findUnique({ where: { roomTypeId_stayDate: { roomTypeId: room.id, stayDate } } });
        if (!current) throw new ConflictException(`Ngày ${key} chưa được mở quỹ.`);
        if (current.version !== input.expectedVersions[key]) throw new ConflictException({ code: 'inventory_version_conflict', date: key, currentVersion: current.version });
        if (await tx.inventoryIntegrityIncident.findFirst({ where: { roomTypeId: room.id, stayDate, resolvedAt: null } })) throw new ConflictException(`Ngày ${key} đang có sai lệch ledger.`);
        validateInventoryInvariant(current);
        const updated = await tx.inventoryDay.update({ where: { roomTypeId_stayDate: { roomTypeId: room.id, stayDate } }, data: {
          lastConfirmedAt: new Date(), lastConfirmedById: input.actorId, lastConfirmedSource: 'google_sheets', version: { increment: 1 },
        } });
        const snapshot = { roomTypeId: updated.roomTypeId, stayDate: key, version: updated.version, lastConfirmedAt: updated.lastConfirmedAt?.toISOString() ?? null, attribution: 'file_principal' };
        await tx.inventoryChange.create({ data: { organizationId: input.organizationId, roomTypeId: room.id, stayDate, source, command: 'confirm_unchanged', idempotencyKey: input.batchId, fromSnapshot: toJson(current), toSnapshot: toJson(snapshot), actorId: input.actorId } });
        await this.enqueueChanged(tx, updated, 'google_sheets', 'confirm_unchanged');
        output.push(snapshot);
      }
      await tx.auditLog.create({ data: { actorId: input.actorId, action: 'inventory.sheets_confirm_unchanged', entityType: 'room_type', entityId: room.id, diff: toJson({ organizationId: input.organizationId, bindingId: input.bindingId, batchId: input.batchId, attribution: 'file_principal', from: input.from, toExclusive: input.toExclusive }) } });
      return { items: output, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private async assertActiveGrant(
    tx: Tx, organizationId: string, userId: string, propertyId: string, roomTypeId: string, capability: 'write' | 'read',
  ): Promise<void> {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM partner_organizations WHERE id = ${organizationId}::uuid FOR SHARE`);
    await tx.$queryRaw(Prisma.sql`SELECT organization_id FROM partner_memberships WHERE organization_id = ${organizationId}::uuid AND user_id = ${userId}::uuid FOR SHARE`);
    const membership = await tx.partnerMembership.findUnique({ where: { organizationId_userId: { organizationId, userId } }, include: { organization: { select: { status: true } } } });
    if (!membership || membership.status !== 'active' || membership.organization.status !== 'active') {
      throw new ForbiddenException('Tổ chức hoặc tài khoản không còn quyền thành viên.');
    }
    const candidate = await tx.partnerPropertyGrant.findUnique({ where: { organizationId_propertyId: { organizationId, propertyId } } });
    if (!candidate) throw new ForbiddenException('Chưa có quyền được duyệt cho cơ sở này.');
    await tx.$queryRaw(Prisma.sql`SELECT id FROM partner_property_grants WHERE id = ${candidate.id}::uuid FOR SHARE`);
    const grant = await tx.partnerPropertyGrant.findUnique({ where: { id: candidate.id } });
    const scope = grant?.roomTypeScope;
    const roomInScope = Array.isArray(scope) && (scope.includes('*') || scope.includes(roomTypeId));
    if (!grant || grant.status !== 'active' || grant.expiresAt && grant.expiresAt <= new Date()
      || (capability === 'write' ? !grant.canWriteInventory : !grant.canReadInventory) || !roomInScope) {
      throw new ForbiddenException('Quyền quản lý hoặc phạm vi hạng phòng không còn hiệu lực.');
    }
  }

  private async assertActiveSheetGrant(tx: Tx, bindingId: string, organizationId: string, propertyId: string, roomTypeId: string, stayDate: Date): Promise<void> {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM partner_organizations WHERE id = ${organizationId}::uuid FOR SHARE`);
    const organization = await tx.partnerOrganization.findUnique({ where: { id: organizationId }, select: { status: true } });
    if (!organization || organization.status !== 'active') throw new ConflictException('Tổ chức đã bị tạm ngưng; lệnh Sheet chưa được áp dụng.');
    const binding = await tx.sheetPropertyBinding.findUnique({ where: { id: bindingId }, include: { workbook: true } });
    if (!binding || binding.status !== 'active' || binding.organizationId !== organizationId || binding.propertyId !== propertyId
      || binding.workbook.status !== 'active' || binding.workbook.importPaused
      || stayDate < binding.workbook.periodStart || stayDate >= binding.workbook.periodEndExclusive) {
      throw new ConflictException('Workbook không còn quyền nhập cho cơ sở/kỳ này.');
    }
    await tx.$queryRaw(Prisma.sql`SELECT id FROM sheet_property_bindings WHERE id = ${binding.id}::uuid FOR SHARE`);
    const candidate = await tx.partnerPropertyGrant.findUnique({ where: { organizationId_propertyId: { organizationId, propertyId } }, select: { id: true } });
    if (!candidate) throw new ConflictException('Quyền nhập tồn của workbook chưa được duyệt hoặc đã bị thu hồi.');
    await tx.$queryRaw(Prisma.sql`SELECT id FROM partner_property_grants WHERE id = ${candidate.id}::uuid FOR SHARE`);
    const grant = await tx.partnerPropertyGrant.findUnique({ where: { id: candidate.id } });
    if (!grant || grant.status !== 'active' || grant.expiresAt && grant.expiresAt <= new Date() || !grant.canWriteInventory
      || !Array.isArray(grant.roomTypeScope) || !(grant.roomTypeScope.includes('*') || grant.roomTypeScope.includes(roomTypeId))) {
      throw new ConflictException('Quyền nhập tồn của workbook chưa được duyệt hoặc đã bị thu hồi.');
    }
  }
}
