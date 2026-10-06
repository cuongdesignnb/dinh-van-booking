'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { apiRequest } from '@/lib/api/client';
import { StateBlock } from '@/components/ui/system';
import { InventoryCalendarMatrix, businessToday, inventoryDates, shiftInventoryDay, type AvailableChange, type MatrixDay, type MatrixRoom } from '@/components/inventory/InventoryCalendarMatrix';
type Property = { id: string; code: string; name: string; roomTypes: MatrixRoom[] };
export function AdminInventoryMatrix() {
  const { user } = useAdminSession();
  const [properties, setProperties] = useState<Property[]>([]), [propertyId, setPropertyId] = useState('');
  const [items, setItems] = useState<MatrixDay[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [view, setView] = useState<'week' | 'month'>('week'), [anchor, setAnchor] = useState(businessToday);
  const dates = useMemo(() => inventoryDates(anchor, view), [anchor, view]);
  const property = properties.find((p) => p.id === propertyId);
  const requestSequence = useRef(0);
  useEffect(() => {
    if (!user.permissions.includes('inventory.read')) return;
    void apiRequest<{ items: Property[] }>('/admin/inventory/properties', { cache: 'no-store' }).then((result) => { setProperties(result.items); setPropertyId((old) => old || result.items[0]?.id || ''); }).catch((reason) => setError(reason.message)).finally(() => setPropertiesLoaded(true));
  }, [user.permissions]);
  const refresh = useCallback(async () => {
    if (!propertyId) return; const sequence = ++requestSequence.current; setLoading(true); setError('');
    try { const query = new URLSearchParams({ propertyId, from: dates[0], to: shiftInventoryDay(dates.at(-1)!, 1) }); const result = await apiRequest<{ items: MatrixDay[] }>(`/admin/inventory/matrix?${query}`, { cache: 'no-store' }); if (sequence === requestSequence.current) setItems(result.items); }
    catch (reason) { if (sequence === requestSequence.current) { setItems([]); setError(reason instanceof Error ? reason.message : 'Không tải được quỹ phòng.'); } }
    finally { if (sequence === requestSequence.current) setLoading(false); }
  }, [propertyId, dates]);
  useEffect(() => { const sequenceRef = requestSequence; void refresh(); return () => { sequenceRef.current++; }; }, [refresh]);
  const mutation = (path: string, data: unknown, key?: string) => apiRequest(path, { method: 'POST', headers: key ? { 'idempotency-key': key } : undefined, body: JSON.stringify(data) });
  if (!user.permissions.includes('inventory.read')) return <StateBlock kind="error" title="Không đủ quyền xem quỹ phòng" text="Liên hệ quản trị viên nếu bạn cần quyền này." />;
  return <div className="admin-inventory">
    {error && <p className="ui-alert ui-tone-danger" role="alert">{error}</p>}
    {!propertiesLoaded && !error && <StateBlock kind="loading" title="Đang tải danh sách cơ sở…" />}
    {property && <InventoryCalendarMatrix mode="admin" propertyName={property.name} rooms={property.roomTypes} items={items} dates={dates} view={view} anchor={anchor} onView={setView} onAnchor={setAnchor} loading={loading} canWrite={user.permissions.includes('inventory.write')} onRefresh={refresh}
      propertySelector={<label className="admin-inventory__property">Cơ sở lưu trú<select className="ui-select" value={propertyId} onChange={(e) => { if (e.target.value !== propertyId) { setItems([]); setPropertyId(e.target.value); } }}>{properties.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.code}</option>)}</select></label>}
      onSave={(change, key) => mutation('/admin/inventory/available', change, key)}
      onOpen={(room, day, capacity, key) => apiRequest(`/admin/inventory/${room.id}`, { method: 'PUT', headers: { 'idempotency-key': key }, body: JSON.stringify({ from: day, to: shiftInventoryDay(day, 1), capacity, expectedVersions: { [day]: 0 } }) })}
      onPreview={(changes: AvailableChange[]) => apiRequest('/admin/inventory/available/preview', { method: 'POST', body: JSON.stringify({ changes }) })}
      onBulk={(changes, key) => mutation('/admin/inventory/available/bulk', { changes }, key)} />}
    {propertiesLoaded && !error && !properties.length && <StateBlock title="Chưa có cơ sở lưu trú" text="Tạo nơi lưu trú và hạng phòng trước, sau đó quỹ phòng sẽ hiển thị tại đây." />}
  </div>;
}
