'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ApiError, apiPath, apiRequest } from '@/lib/api/client';
import { EMPTY_DOCUMENT, RichTextEditor, type RichDocument } from '@/components/admin/shared/RichTextEditor';
import { InventoryCalendarMatrix } from '@/components/inventory/InventoryCalendarMatrix';

type PartnerUser = { id: string; email: string; fullName: string; roles: string[] };
type Grant = {
  id: string; propertyId: string; organizationId: string; organizationName: string; name: string; code: string;
  area: string; address: string; excerpt: string | null; descriptionDocument: RichDocument | null; checkInTime: string; checkOutTime: string;
  houseRules: string[]; notes: string[]; gallery: Array<{ id: string; url: string; altText: string | null; role: string; position: number }>;
  publicPath: string | null; publicationStatus: string; version: number; contentVersion: number;
  capabilities: { canReadInventory: boolean; canWriteInventory: boolean; canEditRates: boolean; canEditProfile: boolean; canUploadMedia: boolean };
  roomTypes: Array<{ id: string; code: string; name: string; status: string; version: number; capacityVerified: boolean; description: string | null; bedSummary: string | null; areaSqm: number | null; unitKind: string | null; bedroomCount: number | null; bathroomCount: number | null; maxAdults: number; maxChildren: number; ratePlans: Array<{ id: string; code: string; name: string; baseRateVnd: string; weekendRateVnd: string | null; breakfastIncluded: boolean; minStayNights: number; maxStayNights: number | null; inclusions: unknown[]; version: number }> }>;
};
type PartnerContext = {
  applications: Array<{ id: string; status: string; version: number; submittedName: string; submittedPhone: string; reviewNote: string | null; submittedAt: string; organization: { name: string; address: string | null } }>;
  organizations: Array<{ id: string; name: string; status: string; membershipRole: string; membershipStatus: string; verificationStatus: string; grants: Array<{ propertyId: string; status: string }> }>;
};
type PartnerMember = { userId: string; name: string; email: string; disabled: boolean; role: string; status: string; version: number };
type PartnerNotification = { id: string; kind: string; title: string; body: string; read: boolean; createdAt: string };
type PartnerRevision = { id: string; propertyId: string; propertyName: string; roomTypeId: string | null; revision: number; status: string; reviewNote: string | null; submittedAt: string };
type InventoryItem = {
  roomTypeId: string; roomTypeName: string; stayDate: string; dataState: 'missing' | 'fresh' | 'stale';
  saleState: 'not_on_sale' | 'stop_sell' | 'open'; available: number | null; capacity: number | null;
  blockedCount: number | null; heldCount: number | null; reservedCount: number | null; version: number | null;
};
type PartnerInventoryChange = {
  roomTypeId: string;
  stayDate: string;
  expectedVersion: number;
  externalSoldCount?: number;
  maintenanceCount?: number;
  ownerWithheldCount?: number;
  stopSell?: boolean;
};
type InventoryBulkPreview = {
  atomic: boolean;
  items: Array<{
    roomTypeId: string;
    stayDate: string;
    before: { capacity: number; blockedCount: number; heldCount: number; reservedCount: number; stopSell: boolean };
    after: { available: number; stopSell: boolean };
  }>;
};
type MediaItem = { id: string; url: string; altText: string | null; width: number | null; height: number | null; visibility: string };
type ClaimCandidate = { id: string; code: string; name: string; area: string; path: string | null };
type AvailabilityItem = { propertyId: string; roomTypeId: string; name: string; roomTypeName: string; area: string; path: string; cover: { url: string; alt: string | null } | null; status: 'available' | 'stale' | 'needs_check' | 'sold_out'; requestVerification: boolean; availableForStay: boolean; priceMode: 'contact' | 'published_rate'; lastConfirmedAt: string | null; checkIn: string; checkOut: string; nights: number; quantity: number };
export type PartnerEditorRoute = { mode: 'property-create' | 'room-create' | 'profile' | 'room' | 'rate'; propertyId?: string; roomTypeId?: string; ratePlanId?: string };

const statusText: Record<string, string> = {
  pending: 'Đang chờ quản trị viên xem xét', needs_info: 'Cần bổ sung thông tin', needs_information: 'Cần bổ sung thông tin',
  approved: 'Đã duyệt tài khoản', rejected: 'Chưa được duyệt', active: 'Đang hoạt động', pending_review: 'Đang chờ duyệt',
  needs_changes: 'Cần chỉnh sửa', conflict: 'Có xung đột phiên bản',
  draft: 'Bản nháp', published: 'Đang công khai', fresh: 'Vừa xác nhận', stale: 'Cần xác nhận lại', missing: 'Chưa mở quỹ',
  open: 'Đang bán', stop_sell: 'Đang dừng bán', not_on_sale: 'Chưa mở bán',
};

function todayInBusinessTimezone() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function shiftDay(day: string, delta: number) {
  const result = new Date(`${day}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + delta);
  return result.toISOString().slice(0, 10);
}

function labelDate(day: string) {
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${day}T00:00:00.000Z`));
}


function monthDates(day: string) {
  const [year, month] = day.split('-').map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => new Date(Date.UTC(year, month - 1, index + 1)).toISOString().slice(0, 10));
}


export function PartnerPortal({ editorRoute, initialPropertyId, initialMode = 'login' }: { editorRoute?: PartnerEditorRoute; initialPropertyId?: string; initialMode?: 'login' | 'register' }) {
  const [user, setUser] = useState<PartnerUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [formMode, setFormMode] = useState<'login' | 'register'>(initialMode);
  useEffect(() => { setFormMode(initialMode); }, [initialMode]);
  const [formBusy, setFormBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [portalDisabled, setPortalDisabled] = useState(false);
  const [context, setContext] = useState<PartnerContext | null>(null);
  const [properties, setProperties] = useState<Grant[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [calendarAnchor, setCalendarAnchor] = useState(todayInBusinessTimezone);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<InventoryBulkPreview | null>(null);
  const [bulkPayload, setBulkPayload] = useState<{ organizationId: string; changes: PartnerInventoryChange[] } | null>(null);
  const [descriptionDocument, setDescriptionDocument] = useState<RichDocument>(EMPTY_DOCUMENT);
  const [revisions, setRevisions] = useState<PartnerRevision[]>([]);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [mediaAlt, setMediaAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [claimCandidates, setClaimCandidates] = useState<ClaimCandidate[]>([]);
  const [claimSearch, setClaimSearch] = useState('');
  const [claimPropertyId, setClaimPropertyId] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  const [members, setMembers] = useState<PartnerMember[]>([]);
  const [memberRole, setMemberRole] = useState<'manager' | 'viewer'>('manager');
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [searchCheckIn, setSearchCheckIn] = useState(todayInBusinessTimezone);
  const [searchCheckOut, setSearchCheckOut] = useState(() => shiftDay(todayInBusinessTimezone(), 1));
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [availabilitySearched, setAvailabilitySearched] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const today = useMemo(todayInBusinessTimezone, []);
  const dates = useMemo(() => calendarView === 'week'
    ? Array.from({ length: 7 }, (_, index) => shiftDay(calendarAnchor, index))
    : monthDates(calendarAnchor), [calendarAnchor, calendarView]);

  const loadPortalData = useCallback(async () => {
    const [nextContext, propertyResult] = await Promise.all([
      apiRequest<PartnerContext>('/partners/context', { cache: 'no-store' }),
      apiRequest<{ items: Grant[] }>('/partners/properties', { cache: 'no-store' }),
    ]);
    setContext(nextContext);
    setProperties(propertyResult.items);
    setPortalDisabled(false);
    setSelectedPropertyId((current) => propertyResult.items.some((item) => item.propertyId === current) ? current : '');
  }, []);

  useEffect(() => {
    let active = true;
    void apiRequest<PartnerUser>('/auth/me', { cache: 'no-store' }).then(async (current) => {
      if (!active) return;
      setUser(current);
      await loadPortalData();
    }).catch((reason: unknown) => {
      if (!active) return;
      if (reason instanceof ApiError && reason.status === 403) setPortalDisabled(true);
      else if (!(reason instanceof ApiError && reason.status === 401)) setError('Chưa kết nối được với cổng đối tác. Vui lòng thử lại sau.');
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [loadPortalData]);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await apiRequest<{ items: PartnerNotification[] }>('/partners/notifications', { cache: 'no-store' });
      setNotifications(result.items);
    } catch { /* Notifications are secondary; the portal's core data remains usable. */ }
  }, []);

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    void loadNotifications();
    const timer = window.setInterval(() => { void loadNotifications(); }, 60_000);
    window.addEventListener('focus', loadNotifications);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', loadNotifications); };
  }, [user, loadNotifications]);

  const selectedProperty = properties.find((property) => property.propertyId === selectedPropertyId) ?? null;
  const activeOrg = context?.organizations.find((item) => item.status === 'active' && item.membershipStatus === 'active');

  const loadRevisions = useCallback(async (organizationId: string) => {
    try {
      const params = new URLSearchParams({ organizationId });
      const result = await apiRequest<{ items: PartnerRevision[] }>(`/partners/profile-revisions?${params}`, { cache: 'no-store' });
      setRevisions(result.items);
    } catch { setRevisions([]); }
  }, []);

  useEffect(() => {
    if (!activeOrg) { setRevisions([]); return; }
    void loadRevisions(activeOrg.id);
  }, [activeOrg, loadRevisions]);

  useEffect(() => {
    if (!selectedProperty) return;
    setDescriptionDocument(selectedProperty.descriptionDocument ?? EMPTY_DOCUMENT);
    setSelectedMediaIds(selectedProperty.gallery.map((item) => item.id));
  }, [selectedProperty]);

  useEffect(() => {
    const requestedPropertyId = editorRoute?.propertyId ?? initialPropertyId;
    if (requestedPropertyId && properties.some((property) => property.propertyId === requestedPropertyId)) {
      setSelectedPropertyId(requestedPropertyId);
    }
  }, [editorRoute?.propertyId, initialPropertyId, properties]);

  const loadMembers = useCallback(async (organizationId: string) => {
    setMembersLoading(true);
    try {
      const params = new URLSearchParams({ organizationId });
      const result = await apiRequest<{ items: PartnerMember[] }>(`/partners/members?${params}`, { cache: 'no-store' });
      setMembers(result.items);
    } catch (reason) {
      setMembers([]);
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách thành viên.');
    } finally { setMembersLoading(false); }
  }, []);

  useEffect(() => {
    if (activeOrg?.membershipRole === 'owner') void loadMembers(activeOrg.id);
    else setMembers([]);
  }, [activeOrg, loadMembers]);

  const loadInventory = useCallback(async () => {
    if (!selectedProperty?.capabilities.canReadInventory) { setInventory([]); return; }
    setInventoryLoading(true);
    try {
      const params = new URLSearchParams({ organizationId: selectedProperty.organizationId, propertyId: selectedProperty.propertyId, from: dates[0], toExclusive: shiftDay(dates[dates.length - 1], 1) });
      const result = await apiRequest<{ items: InventoryItem[] }>(`/partners/inventory?${params}`, { cache: 'no-store' });
      setInventory(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được lịch phòng.');
    } finally {
      setInventoryLoading(false);
    }
  }, [dates, selectedProperty]);

  useEffect(() => {
    void loadInventory();
    if (!selectedProperty?.capabilities.canReadInventory) return;
    const timer = window.setInterval(() => { void loadInventory(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadInventory, selectedProperty?.capabilities.canReadInventory]);

  const activeOrganizationIds = context?.organizations.filter((item) => item.status === 'active' && item.membershipStatus === 'active').map((item) => item.id).join(',') ?? '';
  useEffect(() => {
    if (!user || !activeOrganizationIds || typeof EventSource === 'undefined') return;
    const source = new EventSource(apiPath('/partners/events'), { withCredentials: true });
    source.addEventListener('inventory.changed', () => { void loadInventory(); });
    source.addEventListener('scope.changed', () => { void loadPortalData(); void loadInventory(); });
    source.addEventListener('authorization_revoked', () => {
      source.close(); setUser(null); setContext(null); setProperties([]); setInventory([]);
      setError('Quyền truy cập đối tác đã thay đổi. Vui lòng đăng nhập lại để tải phạm vi mới.');
    });
    return () => source.close();
  }, [user, activeOrganizationIds, loadInventory, loadPortalData]);

  const loadMedia = useCallback(async (property: Grant) => {
    if (!property.capabilities.canUploadMedia && !property.capabilities.canEditProfile) { setMedia([]); return; }
    try {
      const params = new URLSearchParams({ organizationId: property.organizationId });
      const result = await apiRequest<{ items: MediaItem[] }>(`/partners/media?${params}`, { cache: 'no-store' });
      setMedia(result.items);
    } catch { setMedia([]); }
  }, []);

  useEffect(() => {
    if (selectedProperty) void loadMedia(selectedProperty);
  }, [loadMedia, selectedProperty]);

  useEffect(() => {
    if (!activeOrg) return;
    const params = new URLSearchParams({ organizationId: activeOrg.id });
    if (claimSearch.trim()) params.set('search', claimSearch.trim());
    const timer = window.setTimeout(() => {
      void apiRequest<{ items: ClaimCandidate[] }>(`/partners/property-access-claims/candidates?${params}`, { cache: 'no-store' })
        .then((result) => { setClaimCandidates(result.items); setClaimPropertyId((current) => result.items.some((item) => item.id === current) ? current : result.items[0]?.id ?? ''); })
        .catch(() => setClaimCandidates([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [activeOrg, claimSearch]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setMessage(''); setFormBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      if (formMode === 'register') {
        await apiRequest('/partners/registrations', { method: 'POST', body: JSON.stringify({
          fullName: form.get('fullName'), email: form.get('email'), password: form.get('password'),
          organizationName: form.get('organizationName'), organizationType: form.get('organizationType'),
          phone: form.get('phone'), address: form.get('address'),
        }) });
        setMessage('Đã nhận hồ sơ. Tài khoản và quyền quản lý cơ sở sẽ chờ quản trị viên xác minh; hiện chưa có quyền truy cập dữ liệu cơ sở.');
        setFormMode('login');
        event.currentTarget.reset();
      } else {
        const result = await apiRequest<{ user: PartnerUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
        setUser(result.user);
        await loadPortalData();
      }
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 403) setPortalDisabled(true);
      else setError(reason instanceof Error ? reason.message : 'Không thể hoàn tất thao tác.');
    } finally { setFormBusy(false); }
  };

  const resubmitApplication = async (event: FormEvent<HTMLFormElement>, application: PartnerContext['applications'][number]) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(''); setMessage(''); setFormBusy(true);
    try {
      await apiRequest(`/partners/applications/${encodeURIComponent(application.id)}/resubmit`, { method: 'PUT', body: JSON.stringify({
        expectedVersion: application.version,
        fullName: form.get('fullName'), phone: form.get('phone'), organizationName: form.get('organizationName'), address: form.get('address'),
      }) });
      await loadPortalData();
      setMessage('Đã gửi lại thông tin bổ sung. Hồ sơ sẽ được quản trị viên xem xét lại.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể gửi lại hồ sơ.');
    } finally { setFormBusy(false); }
  };

  const logout = async () => {
    try { await apiRequest('/auth/logout', { method: 'POST' }); } finally { setUser(null); setContext(null); setProperties([]); setInventory([]); }
  };


  const previewBulkInventory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProperty) return;
    const form = new FormData(event.currentTarget);
    const roomTypeId = String(form.get('roomTypeId') ?? '');
    const from = String(form.get('from') ?? '');
    const toExclusive = String(form.get('toExclusive') ?? '');
    const changeFields = ['externalSoldCount', 'maintenanceCount', 'ownerWithheldCount'] as const;
    const datesInRange: string[] = [];
    for (let day = from; day && day < toExclusive && datesInRange.length <= 31; day = shiftDay(day, 1)) datesInRange.push(day);
    if (!roomTypeId || datesInRange.length < 1 || datesInRange.length > 31) {
      setError('Chọn một khoảng từ 1 đến 31 đêm. Ngày trả kết thúc không nằm trong khoảng cập nhật.');
      return;
    }
    const items = datesInRange.map((day) => inventoryByKey.get(`${roomTypeId}:${day}`));
    if (items.some((item) => !item || item.version === null)) {
      setError('Lô chỉ áp dụng cho ngày đã mở quỹ. Một ngày còn thiếu; hãy thu hẹp khoảng hoặc nhờ quản trị viên mở quỹ trước.');
      return;
    }
    const changes: PartnerInventoryChange[] = items.map((item, index) => {
      const change: PartnerInventoryChange = { roomTypeId, stayDate: datesInRange[index], expectedVersion: item!.version! };
      for (const field of changeFields) {
        const value = String(form.get(field) ?? '').trim();
        if (value !== '') change[field] = Number(value);
      }
      const stopSell = String(form.get('stopSell') ?? '');
      if (stopSell !== '') change.stopSell = stopSell === 'true';
      return change;
    });
    if (changes.every((change) => change.externalSoldCount === undefined && change.maintenanceCount === undefined && change.ownerWithheldCount === undefined && change.stopSell === undefined)) {
      setError('Nhập ít nhất một thay đổi. Để xác nhận không đổi, dùng nút “Đã kiểm tra, không đổi” trong dòng hạng phòng.');
      return;
    }
    setBulkBusy(true); setError(''); setBulkPreview(null);
    const payload = { organizationId: selectedProperty.organizationId, changes };
    try {
      const preview = await apiRequest<InventoryBulkPreview>('/partners/inventory/bulk/preview', { method: 'POST', body: JSON.stringify(payload) });
      setBulkPayload(payload); setBulkPreview(preview);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xem trước được lô cập nhật.');
    } finally { setBulkBusy(false); }
  };

  const applyBulkInventory = async () => {
    if (!bulkPayload) return;
    setBulkBusy(true); setError('');
    try {
      const result = await apiRequest<{ syncStatus?: string }>('/partners/inventory/bulk', {
        method: 'PUT', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(bulkPayload),
      });
      setMessage(result.syncStatus === 'queued' ? 'Đã lưu lô trên hệ thống; các bảng đồng bộ đang chờ xử lý.' : 'Đã lưu lô cập nhật.');
      setBulkOpen(false); setBulkPreview(null); setBulkPayload(null);
      await loadInventory();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Lô chưa được lưu. Nội dung vẫn được giữ để đối chiếu.');
      await loadInventory();
    } finally { setBulkBusy(false); }
  };

  const confirmRoomRange = async (roomTypeId: string) => {
    if (!selectedProperty) return;
    const rows = dates.map((day) => inventoryByKey.get(`${roomTypeId}:${day}`));
    if (rows.some((item) => !item || item.version === null)) {
      setError('Không thể xác nhận: khoảng đang xem có ngày chưa mở quỹ.');
      return;
    }
    setBulkBusy(true); setError('');
    try {
      await apiRequest('/partners/inventory/confirm', {
        method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          organizationId: selectedProperty.organizationId, roomTypeId,
          from: dates[0], toExclusive: shiftDay(dates[dates.length - 1], 1),
          expectedVersions: Object.fromEntries(rows.map((item) => [item!.stayDate, item!.version])),
        }),
      });
      setMessage('Đã xác nhận khoảng ngày này, không thay đổi số phòng.');
      await loadInventory();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xác nhận được khoảng ngày.');
      await loadInventory();
    } finally { setBulkBusy(false); }
  };

  const createProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!context) return;
    const org = context.organizations.find((item) => item.status === 'active' && item.membershipStatus === 'active');
    if (!org) { setError('Tài khoản/tổ chức chưa được quản trị viên duyệt.'); return; }
    const form = new FormData(event.currentTarget);
    setFormBusy(true); setError('');
    try {
      await apiRequest('/partners/properties', {
        method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ organizationId: org.id, title: form.get('title'), kind: form.get('kind'), area: form.get('area'), address: form.get('address'), excerpt: form.get('excerpt'), mediaIds: selectedMediaIds }),
      });
      setMessage('Đã tạo bản nháp cơ sở. Hồ sơ chưa công khai và cần được quản trị viên xem xét.');
      setSelectedMediaIds([]); await loadPortalData();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tạo được bản nháp.'); }
    finally { setFormBusy(false); }
  };

  const createRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProperty) return;
    const form = new FormData(event.currentTarget);
    setFormBusy(true); setError('');
    try {
      await apiRequest(`/partners/properties/${selectedProperty.propertyId}/room-types`, {
        method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ organizationId: selectedProperty.organizationId, name: form.get('name'), code: form.get('code'), description: form.get('description'), bedSummary: form.get('bedSummary') }),
      });
      setMessage('Đã lưu hạng phòng ở trạng thái nháp; chưa có giá hoặc tồn được tự điền.'); await loadPortalData();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tạo được hạng phòng.'); }
    finally { setFormBusy(false); }
  };

  const submitRevision = async (body: Record<string, unknown>) => {
    if (!selectedProperty) return;
    setRevisionBusy(true); setError(''); setMessage('');
    try {
      const result = await apiRequest<{ status: string; replayed?: boolean }>('/partners/profile-revisions', {
        method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body),
      });
      setMessage(result.replayed ? 'Đề xuất này đã được nhận trước đó.' : 'Đã gửi đề xuất để quản trị viên xem xét. Thông tin công khai chưa bị thay đổi.');
      if (activeOrg) await loadRevisions(activeOrg.id);
      await loadPortalData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không gửi được đề xuất. Nội dung đang nhập vẫn được giữ lại.');
    } finally { setRevisionBusy(false); }
  };

  const savePropertyRevision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProperty) return;
    const form = new FormData(event.currentTarget);
    const lines = (value: FormDataEntryValue | null) => String(value ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    await submitRevision({
      organizationId: selectedProperty.organizationId, propertyId: selectedProperty.propertyId,
      baseVersion: selectedProperty.version, contentBaseVersion: selectedProperty.contentVersion,
      proposed: {
        title: String(form.get('title')), area: String(form.get('area')), address: String(form.get('address')),
        excerpt: String(form.get('excerpt')), checkInTime: String(form.get('checkInTime')), checkOutTime: String(form.get('checkOutTime')),
        descriptionDocument, houseRules: lines(form.get('houseRules')), notes: lines(form.get('notes')),
        media: selectedMediaIds.map((mediaId, position) => ({ mediaId, role: position === 0 ? 'cover' : 'gallery', position })),
      },
    });
  };

  const saveRoomRevision = async (event: FormEvent<HTMLFormElement>, room: Grant['roomTypes'][number]) => {
    event.preventDefault();
    if (!selectedProperty) return;
    const form = new FormData(event.currentTarget);
    const optionalNumber = (key: string) => { const value = String(form.get(key) ?? '').trim(); return value ? Number(value) : undefined; };
    const proposed: Record<string, unknown> = {
      name: String(form.get('name')), description: String(form.get('description')), bedSummary: String(form.get('bedSummary')),
      unitKind: String(form.get('unitKind')),
    };
    for (const key of ['areaSqm', 'bedroomCount', 'bathroomCount', 'maxAdults', 'maxChildren']) {
      const value = optionalNumber(key); if (value !== undefined) proposed[key] = value;
    }
    await submitRevision({ organizationId: selectedProperty.organizationId, propertyId: selectedProperty.propertyId, roomTypeId: room.id, baseVersion: room.version, proposed });
  };

  const saveRateRevision = async (event: FormEvent<HTMLFormElement>, room: Grant['roomTypes'][number], rate: Grant['roomTypes'][number]['ratePlans'][number]) => {
    event.preventDefault();
    if (!selectedProperty) return;
    const form = new FormData(event.currentTarget);
    const maxStay = String(form.get('maxStayNights') ?? '').trim();
    await submitRevision({ organizationId: selectedProperty.organizationId, propertyId: selectedProperty.propertyId, roomTypeId: room.id, ratePlanId: rate.id, baseVersion: rate.version, proposed: {
      baseRateVnd: String(form.get('baseRateVnd')), weekendRateVnd: String(form.get('weekendRateVnd') ?? '').trim() || null,
      breakfastIncluded: form.get('breakfastIncluded') === 'on', minStayNights: Number(form.get('minStayNights')),
      maxStayNights: maxStay ? Number(maxStay) : null,
      inclusions: String(form.get('inclusions') ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    } });
  };

  const submitClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeOrg || !claimPropertyId) return;
    const form = new FormData(event.currentTarget);
    setClaimBusy(true); setError('');
    try {
      const result = await apiRequest<{ status: string }>('/partners/property-access-claims', { method: 'POST', body: JSON.stringify({
        organizationId: activeOrg.id, propertyId: claimPropertyId, reason: form.get('reason'),
      }) });
      setMessage(result.status === 'pending' ? 'Đã gửi yêu cầu. Cơ sở gốc và quỹ phòng không bị nhân bản.' : 'Yêu cầu đã được ghi nhận.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không gửi được yêu cầu.'); }
    finally { setClaimBusy(false); }
  };

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeOrg || activeOrg.membershipRole !== 'owner') return;
    const form = new FormData(event.currentTarget);
    setMemberBusy(true); setError('');
    try {
      const params = new URLSearchParams({ organizationId: activeOrg.id });
      await apiRequest(`/partners/members?${params}`, { method: 'POST', body: JSON.stringify({ email: form.get('email'), role: memberRole }) });
      event.currentTarget.reset();
      await loadMembers(activeOrg.id);
      setMessage('Đã thêm tài khoản vào tổ chức. Quyền trên từng cơ sở vẫn do quản trị viên cấp riêng.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thêm được thành viên.'); }
    finally { setMemberBusy(false); }
  };

  const changeMemberStatus = async (member: PartnerMember) => {
    if (!activeOrg || activeOrg.membershipRole !== 'owner') return;
    setMemberBusy(true); setError('');
    try {
      const params = new URLSearchParams({ organizationId: activeOrg.id });
      await apiRequest(`/partners/members/${encodeURIComponent(member.userId)}?${params}`, {
        method: 'PATCH', body: JSON.stringify({ action: member.status === 'active' ? 'revoke' : 'restore', expectedVersion: member.version }),
      });
      await loadMembers(activeOrg.id);
      setMessage(member.status === 'active' ? 'Đã thu hồi quyền thành viên.' : 'Đã khôi phục quyền thành viên.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được thành viên.'); }
    finally { setMemberBusy(false); }
  };

  const markNotificationRead = async (notification: PartnerNotification) => {
    if (notification.read) return;
    try {
      await apiRequest(`/partners/notifications/${encodeURIComponent(notification.id)}/read`, { method: 'PATCH' });
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được thông báo.'); }
  };

  const searchAvailability = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setAvailabilityBusy(true);
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams({
      checkIn: searchCheckIn, checkOut: searchCheckOut,
      rooms: String(form.get('rooms') ?? '1'), adults: String(form.get('adults') ?? '1'), children: String(form.get('children') ?? '0'),
    });
    const area = String(form.get('area') ?? '').trim();
    const kind = String(form.get('kind') ?? '').trim();
    if (area) params.set('area', area);
    if (kind) params.set('kind', kind);
    try {
      const result = await apiRequest<{ enabled: boolean; items: AvailabilityItem[] }>(`/partners/availability?${params}`, { cache: 'no-store' });
      setAvailabilityEnabled(result.enabled); setAvailability(result.items); setAvailabilitySearched(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa tra cứu được tình trạng phòng.'); }
    finally { setAvailabilityBusy(false); }
  };

  const uploadMedia = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProperty) return;
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    if (!(file instanceof File)) return;
    const payload = new FormData();
    payload.append('organizationId', selectedProperty.organizationId);
    payload.append('propertyId', selectedProperty.propertyId);
    payload.append('altText', mediaAlt.trim());
    payload.append('file', file);
    setUploading(true); setError('');
    try {
      const item = await apiRequest<MediaItem>('/partners/media/upload', { method: 'POST', body: payload });
      setMedia((current) => [item, ...current]); setSelectedMediaIds((current) => current.includes(item.id) ? current : [...current, item.id]);
      setMediaAlt(''); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được ảnh.'); }
    finally { setUploading(false); }
  };

  if (checking) return <section className="partner-card partner-loading">Đang kiểm tra phiên đăng nhập…</section>;
  if (portalDisabled) return <section className="partner-card partner-disabled"><span className="partner-eyebrow">Đinh Vân Booking</span><h1>Cổng đối tác đang đóng</h1><p>Quản trị viên chưa bật đăng ký và lịch quỹ phòng. Dữ liệu đối tác hiện chưa được mở sử dụng.</p><Link href="/">Quay về website</Link></section>;

  if (!user) return <section className="partner-auth-wrap">
    <div className="partner-auth-brand"><span className="partner-eyebrow">Hợp tác cùng Đinh Vân Booking</span><h1>Cổng dành cho đối tác</h1><p>Quản lý hồ sơ cơ sở và lịch quỹ phòng trong phạm vi đã được duyệt.</p></div>
    <div className="partner-card partner-auth-card">
      <div className="partner-tabs" role="tablist" aria-label="Tài khoản đối tác">
        <button type="button" className={formMode === 'login' ? 'is-active' : ''} onClick={() => { setFormMode('login'); setError(''); }}>Đăng nhập</button>
        <button type="button" className={formMode === 'register' ? 'is-active' : ''} onClick={() => { setFormMode('register'); setError(''); }}>Đăng ký</button>
      </div>
      <form className="partner-form" onSubmit={submitAuth}>
        {formMode === 'register' && <>
          <label>Họ và tên<input name="fullName" autoComplete="name" required minLength={2} /></label>
          <label>Tên tổ chức/cơ sở<input name="organizationName" required minLength={2} /></label>
          <label>Loại đối tác<select name="organizationType"><option value="property_owner">Chủ cơ sở</option><option value="agency">Đại lý</option></select></label>
          <label>Số điện thoại<input name="phone" autoComplete="tel" required /></label>
          <label>Địa chỉ đơn vị<input name="address" autoComplete="street-address" /></label>
        </>}
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Mật khẩu<input name="password" type="password" autoComplete={formMode === 'login' ? 'current-password' : 'new-password'} minLength={12} required /></label>
        {message && <p className="partner-message" role="status">{message}</p>}
        {error && <p className="partner-error" role="alert">{error}</p>}
        <button className="partner-primary" type="submit" disabled={formBusy}>{formBusy ? 'Đang xử lý…' : formMode === 'login' ? 'Đăng nhập' : 'Gửi hồ sơ đăng ký'}</button>
        {formMode === 'register' && <small>Gửi đăng ký không tạo quyền quản lý ngay. Quản trị viên cần xác minh riêng tài khoản và cơ sở.</small>}
      </form>
    </div>
  </section>;

  const applications = context?.applications ?? [];
  const rooms = selectedProperty?.roomTypes ?? [];
  const inventoryByKey = new Map(inventory.map((item) => [`${item.roomTypeId}:${item.stayDate}`, item]));

  if (editorRoute) {
    const editorRoom = rooms.find((room) => room.id === editorRoute.roomTypeId);
    const editorRate = editorRoom?.ratePlans.find((rate) => rate.id === editorRoute.ratePlanId);
    const editorPropertyAllowed = Boolean(selectedProperty?.capabilities.canEditProfile);
    const editorRateAllowed = Boolean(selectedProperty?.capabilities.canEditRates);
    return <div className="partner-shell">
      <header className="partner-topbar"><Link className="partner-brand" href="/doi-tac">Đinh Vân <span>Đối tác</span></Link><div><span>{user.fullName}</span><button type="button" onClick={() => void logout()}>Đăng xuất</button></div></header>
      <div className="partner-content">
        <Link className="partner-editor-back" href={selectedProperty ? `/doi-tac?property=${selectedProperty.propertyId}` : '/doi-tac'}>← Quay lại cổng đối tác</Link>
        <section className="partner-heading"><div><span className="partner-eyebrow">Trang chỉnh sửa riêng</span><h1>{editorRoute.mode === 'property-create' ? 'Tạo hồ sơ cơ sở nháp' : editorRoute.mode === 'room-create' ? 'Khai báo hạng phòng' : editorRoute.mode === 'profile' ? 'Đề xuất chỉnh sửa hồ sơ' : editorRoute.mode === 'room' ? 'Đề xuất chỉnh sửa hạng phòng' : 'Đề xuất chỉnh sửa giá'}</h1><p>Thay đổi gửi đi sẽ qua bước duyệt; dữ liệu công khai không đổi trước khi được chấp thuận.</p></div></section>
        {error && <p className="partner-error" role="alert">{error}</p>}{message && <p className="partner-message" role="status">{message}</p>}
        {editorRoute.mode === 'property-create' && activeOrg && <section className="partner-card"><h2>Thông tin cơ sở cần bổ sung</h2><p>Chỉ nhập dữ kiện đã xác nhận. Giá, số phòng và tình trạng tồn không tự tạo.</p><form className="partner-form partner-form-grid" onSubmit={createProperty}>
          <label>Tên cơ sở<input name="title" required minLength={3} /></label><label>Loại hình<select name="kind"><option value="homestay">Homestay</option><option value="hotel">Khách sạn</option><option value="resort">Khu nghỉ dưỡng</option><option value="villa">Villa</option><option value="guesthouse">Nhà nghỉ</option><option value="bungalow">Bungalow</option></select></label>
          <label>Khu vực<input name="area" required /></label><label className="partner-form-wide">Địa chỉ<input name="address" required /></label><label className="partner-form-wide">Trích yếu<input name="excerpt" /></label>
          <div className="partner-form-actions partner-form-wide"><button className="partner-primary" disabled={formBusy}>{formBusy ? 'Đang lưu…' : 'Tạo bản nháp'}</button></div>
        </form></section>}
        {editorRoute.mode === 'property-create' && !activeOrg && <section className="partner-card"><h2>Tổ chức chưa được duyệt</h2><p>Chỉ tổ chức đang hoạt động mới có thể tạo hồ sơ cơ sở nháp.</p></section>}
        {editorRoute.mode !== 'property-create' && !selectedProperty && <section className="partner-card"><h2>Không tìm thấy cơ sở</h2><p>Cơ sở không thuộc phạm vi được cấp quyền hoặc quyền đã thay đổi.</p></section>}
        {editorRoute.mode === 'room-create' && selectedProperty && editorPropertyAllowed && <section className="partner-card"><h2>{selectedProperty.name}</h2><p>Khai báo đúng hạng phòng của cơ sở này. Số lượng, giá và chính sách không được tự suy đoán.</p><form className="partner-form partner-form-grid" onSubmit={createRoom}>
          <label>Tên hạng phòng<input name="name" required /></label><label>Mã hạng (không bắt buộc)<input name="code" /></label><label>Mô tả<input name="description" /></label><label>Giường<input name="bedSummary" /></label>
          <div className="partner-form-actions partner-form-wide"><button className="partner-primary" disabled={formBusy}>{formBusy ? 'Đang lưu…' : 'Tạo hạng phòng nháp'}</button></div>
        </form></section>}
        {editorRoute.mode === 'profile' && selectedProperty && editorPropertyAllowed && <section className="partner-card partner-editor-card"><div className="partner-card-head"><div><h2>{selectedProperty.name}</h2><p>Phiên bản hồ sơ {selectedProperty.version} · nội dung {selectedProperty.contentVersion}</p></div></div>
          <form className="partner-form partner-form-grid" onSubmit={(event) => void savePropertyRevision(event)}>
            <label>Tên cơ sở<input name="title" defaultValue={selectedProperty.name} required minLength={3} /></label><label>Khu vực<input name="area" defaultValue={selectedProperty.area} required /></label>
            <label className="partner-form-wide">Địa chỉ<input name="address" defaultValue={selectedProperty.address} required /></label><label>Giờ nhận phòng<input name="checkInTime" defaultValue={selectedProperty.checkInTime} required /></label><label>Giờ trả phòng<input name="checkOutTime" defaultValue={selectedProperty.checkOutTime} required /></label>
            <label className="partner-form-wide">Trích yếu<input name="excerpt" defaultValue={selectedProperty.excerpt ?? ''} maxLength={500} /></label>
            <div className="partner-form-wide partner-rich-editor"><RichTextEditor value={descriptionDocument} onChange={(document) => setDescriptionDocument(document)} label="Mô tả chi tiết" hint="Nội dung sẽ qua bước duyệt trước khi thay đổi trang công khai." /></div>
            <label>Nội quy — mỗi dòng một nội quy<textarea name="houseRules" rows={4} defaultValue={selectedProperty.houseRules.join('\n')} maxLength={7200} /></label><label>Ghi chú cho khách — mỗi dòng một ghi chú<textarea name="notes" rows={4} defaultValue={selectedProperty.notes.join('\n')} maxLength={10000} /></label>
            <div className="partner-form-wide"><span className="partner-field-label">Album ảnh (ảnh đầu là ảnh bìa)</span>{media.length ? <div className="partner-media-grid">{media.map((item) => <button key={item.id} type="button" className={selectedMediaIds.includes(item.id) ? 'is-selected' : ''} onClick={() => setSelectedMediaIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])}><Image src={item.url} alt={item.altText ?? ''} width={item.width ?? 320} height={item.height ?? 220} unoptimized /><span>{item.altText || 'Chưa có ALT'}{selectedMediaIds.includes(item.id) ? ` · vị trí ${selectedMediaIds.indexOf(item.id) + 1}` : ''}</span></button>)}</div> : <p className="partner-muted">Chưa có ảnh trong thư viện của tổ chức.</p>}</div>
            <div className="partner-form-actions partner-form-wide"><button className="partner-primary" type="submit" disabled={revisionBusy}>{revisionBusy ? 'Đang gửi…' : 'Gửi quản trị viên duyệt'}</button></div>
          </form>
        </section>}
        {editorRoute.mode === 'room' && selectedProperty && editorPropertyAllowed && editorRoom && <section className="partner-card"><h2>{editorRoom.name} · {editorRoom.code}</h2><p>Phiên bản {editorRoom.version}; đề xuất cần quản trị viên duyệt.</p><form className="partner-form partner-form-grid" onSubmit={(event) => void saveRoomRevision(event, editorRoom)}>
          <label>Tên hạng phòng<input name="name" defaultValue={editorRoom.name} required /></label><label>Loại đơn vị<input name="unitKind" defaultValue={editorRoom.unitKind ?? ''} /></label><label className="partner-form-wide">Mô tả<input name="description" defaultValue={editorRoom.description ?? ''} /></label><label>Giường<input name="bedSummary" defaultValue={editorRoom.bedSummary ?? ''} /></label><label>Diện tích m²<input name="areaSqm" type="number" min="0" defaultValue={editorRoom.areaSqm ?? ''} /></label>
          <label>Số phòng ngủ<input name="bedroomCount" type="number" min="0" defaultValue={editorRoom.bedroomCount ?? ''} /></label><label>Số phòng tắm<input name="bathroomCount" type="number" min="0" defaultValue={editorRoom.bathroomCount ?? ''} /></label><label>Người lớn tối đa<input name="maxAdults" type="number" min="1" defaultValue={editorRoom.maxAdults} /></label><label>Trẻ em tối đa<input name="maxChildren" type="number" min="0" defaultValue={editorRoom.maxChildren} /></label>
          <div className="partner-form-actions partner-form-wide"><button className="partner-primary" disabled={revisionBusy}>{revisionBusy ? 'Đang gửi…' : 'Gửi đề xuất hạng phòng'}</button></div>
        </form></section>}
        {editorRoute.mode === 'rate' && selectedProperty && editorRateAllowed && editorRoom && editorRate && <section className="partner-card"><h2>{editorRoom.name} · {editorRate.name}</h2><p>Giá hiện tại {editorRate.baseRateVnd === '0' ? 'cần được xác nhận' : `${Number(editorRate.baseRateVnd).toLocaleString('vi-VN')}₫/đêm`} · phiên bản {editorRate.version}</p><form className="partner-form partner-form-grid" onSubmit={(event) => void saveRateRevision(event, editorRoom, editorRate)}>
          <label>Giá ngày thường (VND)<input name="baseRateVnd" inputMode="numeric" pattern="[0-9]{1,15}" defaultValue={editorRate.baseRateVnd} required /></label><label>Giá cuối tuần (để trống nếu không có giá riêng)<input name="weekendRateVnd" inputMode="numeric" pattern="[0-9]{0,15}" defaultValue={editorRate.weekendRateVnd ?? ''} /></label><label>Số đêm tối thiểu<input name="minStayNights" type="number" min="1" max="30" defaultValue={editorRate.minStayNights} required /></label><label>Số đêm tối đa<input name="maxStayNights" type="number" min="1" max="365" defaultValue={editorRate.maxStayNights ?? ''} /></label>
          <label className="partner-check"><input name="breakfastIncluded" type="checkbox" defaultChecked={editorRate.breakfastIncluded} /> Đã bao gồm bữa sáng</label><label>Quyền lợi — mỗi dòng một mục<textarea name="inclusions" rows={3} defaultValue={editorRate.inclusions.filter((value): value is string => typeof value === 'string').join('\n')} /></label>
          <div className="partner-form-actions partner-form-wide"><button className="partner-primary" disabled={revisionBusy}>{revisionBusy ? 'Đang gửi…' : 'Gửi đề xuất giá'}</button></div>
        </form></section>}
        {editorRoute.mode === 'profile' && selectedProperty && !editorPropertyAllowed && <section className="partner-card"><h2>Chưa có quyền sửa hồ sơ</h2><p>Quản trị viên cấp riêng quyền hồ sơ cho từng cơ sở.</p></section>}
        {editorRoute.mode === 'room-create' && selectedProperty && !editorPropertyAllowed && <section className="partner-card"><h2>Chưa có quyền khai báo hạng phòng</h2><p>Quản trị viên cấp riêng quyền hồ sơ cho từng cơ sở.</p></section>}
        {editorRoute.mode === 'room' && selectedProperty && !editorPropertyAllowed && <section className="partner-card"><h2>Chưa có quyền sửa hạng phòng</h2><p>Quản trị viên cấp riêng quyền hồ sơ cho từng cơ sở.</p></section>}
        {editorRoute.mode === 'room' && selectedProperty && editorPropertyAllowed && !editorRoom && <section className="partner-card"><h2>Không tìm thấy hạng phòng</h2><p>Hạng phòng không thuộc cơ sở được cấp quyền.</p></section>}
        {editorRoute.mode === 'rate' && selectedProperty && (!editorRateAllowed || !editorRoom || !editorRate) && <section className="partner-card"><h2>Không có quyền sửa giá</h2><p>Kiểm tra grant còn hiệu lực và hạng phòng thuộc đúng cơ sở.</p></section>}
      </div>
    </div>;
  }

  return <div className="partner-shell">
    <header className="partner-topbar"><Link className="partner-brand" href="/doi-tac">Đinh Vân <span>Đối tác</span></Link><div><span>{user.fullName}</span><button type="button" onClick={() => void logout()}>Đăng xuất</button></div></header>
    <div className="partner-content">
      <section className="partner-heading"><div><span className="partner-eyebrow">Không gian vận hành</span><h1>Xin chào, {user.fullName}</h1><p>Thông tin chỉ hiển thị theo tổ chức và quyền đã được quản trị viên cấp.</p></div><Link href="/">Xem website</Link></section>
      {error && <p className="partner-error" role="alert">{error}</p>}
      {message && <p className="partner-message" role="status">{message}</p>}
      <section className="partner-card partner-notifications"><div className="partner-card-head"><div><h2>Thông báo</h2><p>{notifications.filter((item) => !item.read).length ? `${notifications.filter((item) => !item.read).length} thông báo chưa đọc` : 'Không có thông báo mới'}</p></div><button type="button" onClick={() => void loadNotifications()}>Tải lại</button></div>
        {notifications.length === 0 ? <p className="partner-muted">Kết quả duyệt, quyền cơ sở và nhắc xác nhận tồn sẽ hiển thị tại đây.</p> : <div className="partner-notification-list">{notifications.map((notification) => <article className={notification.read ? '' : 'is-unread'} key={notification.id}><div><strong>{notification.title}</strong><p>{notification.body}</p><small>{new Date(notification.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></div>{!notification.read && <button type="button" onClick={() => void markNotificationRead(notification)}>Đánh dấu đã đọc</button>}</article>)}</div>}
      </section>
      {applications.some((item) => item.status !== 'approved') && <section className="partner-card partner-review-status"><h2>Hồ sơ đăng ký</h2>{applications.filter((item) => item.status !== 'approved').map((item) => <div key={item.id}><p><strong>{statusText[item.status] ?? item.status}</strong>{item.reviewNote && <span> — {item.reviewNote}</span>}</p>{item.status === 'needs_info' && <form className="partner-form partner-form-grid" onSubmit={(event) => void resubmitApplication(event, item)}><label>Họ và tên<input name="fullName" defaultValue={item.submittedName} required minLength={2} /></label><label>Số điện thoại<input name="phone" defaultValue={item.submittedPhone} required /></label><label>Tên tổ chức/cơ sở<input name="organizationName" defaultValue={item.organization.name} required minLength={2} /></label><label>Địa chỉ đơn vị<input name="address" defaultValue={item.organization.address ?? ''} /></label><div className="partner-form-actions partner-form-wide"><button className="partner-primary" disabled={formBusy}>{formBusy ? 'Đang gửi…' : 'Gửi lại hồ sơ'}</button></div></form>}</div>)}<small>Tài khoản được duyệt chưa đồng nghĩa đã có quyền sửa từng cơ sở.</small></section>}
      {!activeOrg && <section className="partner-empty"><h2>Chưa có tổ chức được duyệt</h2><p>Khi quản trị viên duyệt hồ sơ, tổ chức sẽ xuất hiện tại đây. Quyền theo từng cơ sở được cấp riêng sau đó.</p></section>}
      {activeOrg && <section className="partner-card partner-availability-search"><div className="partner-card-head"><div><h2>Tra cứu phòng đã được công khai</h2><p>Kết quả chỉ đọc dữ liệu công khai đã duyệt; trước khi nhận khách vẫn cần xác nhận lại trên hệ thống.</p></div></div>
        <form className="partner-search-form" onSubmit={(event) => void searchAvailability(event)}>
          <label>Ngày nhận<input type="date" value={searchCheckIn} min={today} onChange={(event) => { setSearchCheckIn(event.target.value); if (event.target.value >= searchCheckOut) setSearchCheckOut(shiftDay(event.target.value, 1)); }} required /></label>
          <label>Ngày trả<input type="date" value={searchCheckOut} min={shiftDay(searchCheckIn, 1)} onChange={(event) => setSearchCheckOut(event.target.value)} required /></label>
          <label>Số phòng<input name="rooms" type="number" min="1" max="5" defaultValue="1" required /></label>
          <label>Người lớn<input name="adults" type="number" min="1" max="20" defaultValue="2" required /></label>
          <label>Trẻ em<input name="children" type="number" min="0" max="12" defaultValue="0" required /></label>
          <label>Khu vực<input name="area" maxLength={80} placeholder="Ví dụ: Cúc Phương" /></label>
          <label>Loại cơ sở<select name="kind" defaultValue=""><option value="">Tất cả</option><option value="homestay">Homestay</option><option value="hotel">Khách sạn</option><option value="resort">Khu nghỉ dưỡng</option><option value="villa">Villa</option></select></label>
          <button className="partner-primary" type="submit" disabled={availabilityBusy}>{availabilityBusy ? 'Đang kiểm tra…' : 'Tra cứu'}</button>
        </form>
        {!availabilityEnabled && <p className="partner-muted">Tra cứu tồn công khai đang tạm tắt.</p>}
        {availabilityEnabled && availability.length > 0 && <div className="partner-search-results">{availability.map((item) => <article className="partner-search-result" key={`${item.propertyId}:${item.roomTypeId}`}>
          {item.cover && <Image src={item.cover.url} alt={item.cover.alt ?? ''} width={480} height={320} unoptimized />}
          <div><span className={`partner-search-status is-${item.status}`}>{item.status === 'available' ? 'Có quỹ theo lần xác nhận gần nhất' : item.status === 'stale' ? 'Cần xác nhận lại' : item.status === 'needs_check' ? 'Đang được rà soát' : 'Không còn quỹ phù hợp'}</span><h3>{item.name}</h3><p>{item.roomTypeName} · {item.area}</p><small>{item.priceMode === 'contact' ? 'Giá cần xác nhận trực tiếp' : 'Giá công khai cần kiểm tra lại trước khi nhận khách'}{item.lastConfirmedAt ? ` · Xác nhận gần nhất ${new Date(item.lastConfirmedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : ''}</small></div>
          {item.path && <Link href={item.path}>Xem cơ sở</Link>}
        </article>)}</div>}
        {availabilityEnabled && availabilitySearched && availability.length === 0 && <p className="partner-muted">Chưa có kết quả cho khoảng ngày và bộ lọc này.</p>}
      </section>}
      {activeOrg && <div className="partner-layout-grid">
        <aside className="partner-card partner-property-list"><div className="partner-card-head"><div><h2>Cơ sở được cấp quyền</h2><p>{activeOrg.name}</p></div><Link href="/doi-tac/chinh-sua?mode=property-create">Tạo bản nháp</Link></div>
          {properties.filter((item) => item.organizationId === activeOrg.id).length === 0 ? <p className="partner-muted">Chưa được cấp quyền cơ sở. Bạn có thể tạo bản nháp hoặc gửi yêu cầu quản lý cơ sở có sẵn.</p> : properties.filter((item) => item.organizationId === activeOrg.id).map((property) => <button key={property.propertyId} type="button" className={`partner-property-option${selectedPropertyId === property.propertyId ? ' is-selected' : ''}`} onClick={() => setSelectedPropertyId(property.propertyId)}><strong>{property.name}</strong><span>{property.area} · {statusText[property.publicationStatus] ?? property.publicationStatus}</span><small>{property.capabilities.canWriteInventory ? 'Có quyền cập nhật quỹ' : property.capabilities.canEditProfile ? 'Có quyền khai báo hồ sơ' : 'Chỉ xem theo phạm vi được cấp'}</small></button>)}
        </aside>
        <section className="partner-main-column">
          {selectedProperty && <>
            <section className="partner-card partner-property-summary"><div><span className="partner-eyebrow">{selectedProperty.code}</span><h2>{selectedProperty.name}</h2><p>{selectedProperty.area} · <span className="partner-status-pill">{statusText[selectedProperty.publicationStatus] ?? selectedProperty.publicationStatus}</span></p></div><div className="partner-summary-actions">{selectedProperty.capabilities.canEditProfile && <><Link href={`/doi-tac/chinh-sua?mode=profile&property=${selectedProperty.propertyId}`}>Đề xuất sửa hồ sơ</Link><Link href={`/doi-tac/chinh-sua?mode=room-create&property=${selectedProperty.propertyId}`}>Thêm hạng phòng</Link></>}{selectedProperty.publicPath && <a href={selectedProperty.publicPath} target="_blank" rel="noreferrer">Xem trang công khai</a>}</div></section>
            {(selectedProperty.capabilities.canEditProfile || selectedProperty.capabilities.canEditRates) && rooms.map((room) => <section className="partner-card partner-room-edit-card" key={`edit:${room.id}`}><div className="partner-card-head"><div><h3>{room.name} <small>{room.code}</small></h3><p>{room.status === 'draft' ? 'Hạng phòng nháp' : room.capacityVerified ? 'Sức chứa đã xác minh' : 'Sức chứa chưa xác minh'} · phiên bản {room.version}</p></div><div className="partner-summary-actions">{selectedProperty.capabilities.canEditProfile && <Link href={`/doi-tac/chinh-sua?mode=room&property=${selectedProperty.propertyId}&room=${room.id}`}>Sửa hạng phòng</Link>}{selectedProperty.capabilities.canEditRates && room.ratePlans.map((rate) => <Link key={rate.id} href={`/doi-tac/chinh-sua?mode=rate&property=${selectedProperty.propertyId}&room=${room.id}&rate=${rate.id}`}>Sửa giá · {rate.name}</Link>)}</div></div></section>)}
            {selectedProperty.capabilities.canUploadMedia && <section className="partner-card"><h3>Media Library của tổ chức</h3><p>Ảnh tải lên được chuyển thành WebP, lưu riêng tư; ALT bắt buộc. Ảnh chỉ công khai sau khi được duyệt và gắn vào hồ sơ.</p><form className="partner-upload-form" onSubmit={uploadMedia}><label>Mô tả ALT<input value={mediaAlt} onChange={(event) => setMediaAlt(event.target.value)} required /></label><label>Chọn ảnh<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label><button className="partner-primary" disabled={uploading}>{uploading ? 'Đang tải…' : 'Tải vào thư viện'}</button></form><div className="partner-media-grid">{media.map((item) => <button key={item.id} type="button" className={selectedMediaIds.includes(item.id) ? 'is-selected' : ''} onClick={() => setSelectedMediaIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])}><Image src={item.url} alt={item.altText ?? ''} width={item.width ?? 320} height={item.height ?? 220} unoptimized /><span>{item.altText || 'Chưa có ALT'} · {item.visibility === 'private' ? 'Riêng tư' : 'Công khai'}</span></button>)}</div></section>}
            {selectedProperty.capabilities.canReadInventory ? <section className="partner-card partner-inventory-card">
              <InventoryCalendarMatrix mode="partner" propertyName={selectedProperty.name} rooms={rooms} items={inventory} dates={dates} view={calendarView} anchor={calendarAnchor} onView={setCalendarView} onAnchor={setCalendarAnchor} canWrite={selectedProperty.capabilities.canWriteInventory} loading={inventoryLoading} onRefresh={loadInventory}
                onSave={(change, key) => apiRequest('/partners/inventory/available', { method: 'POST', headers: { 'idempotency-key': key }, body: JSON.stringify({ ...change, organizationId: selectedProperty.organizationId }) })}
                onConfirm={selectedProperty.capabilities.canWriteInventory ? confirmRoomRange : undefined} />
              {selectedProperty.capabilities.canWriteInventory && <details className="partner-bulk-edit" open={bulkOpen} onToggle={(event) => { if (!event.currentTarget.open) { setBulkOpen(false); setBulkPreview(null); setBulkPayload(null); } }}><summary onClick={(event) => { event.preventDefault(); setBulkOpen((open) => !open); setBulkPreview(null); setBulkPayload(null); }}>Chi tiết nâng cao: khoá/bán ngoài quỹ</summary><p>Chọn một hạng phòng và khoảng đêm đã mở quỹ. Xem trước thay đổi trước khi lưu; một ngày xung đột sẽ làm cả lô bị từ chối.</p>
                <form className="partner-form partner-form-grid" onSubmit={(event) => void previewBulkInventory(event)}>
                  <label>Hạng phòng<select name="roomTypeId" required><option value="">Chọn hạng phòng</option>{rooms.filter((room) => room.status === 'active').map((room) => <option key={room.id} value={room.id}>{room.name} · {room.code}</option>)}</select></label>
                  <label>Từ ngày<input name="from" type="date" defaultValue={dates[0]} required /></label><label>Đến trước ngày<input name="toExclusive" type="date" defaultValue={shiftDay(dates[dates.length - 1], 1)} required /></label>
                  <label>Số bán ngoài quỹ<input name="externalSoldCount" type="number" min="0" max="5000" placeholder="Không đổi" /></label><label>Số bảo trì/khóa riêng<input name="maintenanceCount" type="number" min="0" max="5000" placeholder="Không đổi" /></label><label>Quỹ chủ cơ sở giữ lại<input name="ownerWithheldCount" type="number" min="0" max="5000" placeholder="Không đổi" /></label><label>Trạng thái bán<select name="stopSell" defaultValue=""><option value="">Không đổi</option><option value="false">Mở bán</option><option value="true">Dừng bán</option></select></label>
                  <div className="partner-form-actions partner-form-wide"><button className="partner-primary" disabled={bulkBusy}>{bulkBusy ? 'Đang kiểm tra…' : 'Xem trước lô'}</button></div>
                </form>
                {bulkPreview && <div className="partner-bulk-preview" role="status"><strong>Xem trước · {bulkPreview.items.length} đêm · cập nhật nguyên lô</strong><ul>{bulkPreview.items.map((item) => { const beforeAvailable = item.before.stopSell ? 0 : item.before.capacity - item.before.blockedCount - item.before.heldCount - item.before.reservedCount; return <li key={`${item.roomTypeId}:${item.stayDate}`}>{labelDate(item.stayDate)}: {beforeAvailable} → {item.after.available} phòng{item.after.stopSell ? ' · Dừng bán' : ''}</li>; })}</ul><div className="partner-form-actions"><button type="button" className="partner-primary" disabled={bulkBusy} onClick={() => void applyBulkInventory()}>{bulkBusy ? 'Đang lưu…' : 'Xác nhận và lưu lô'}</button><button type="button" onClick={() => { setBulkPreview(null); setBulkPayload(null); }}>Sửa đề xuất</button></div></div>}
              </details>}
            </section> : <section className="partner-card"><h2>Lịch quỹ phòng</h2><p>Chưa có quyền xem hoặc cập nhật tồn cho cơ sở này. Quyền này do quản trị viên cấp riêng.</p></section>}
          </>}
          {selectedProperty && <section className="partner-card partner-revision-list"><div className="partner-card-head"><div><h2>Lịch sử đề xuất</h2><p>Đề xuất chờ duyệt chưa làm thay đổi dữ liệu công khai.</p></div><button type="button" onClick={() => activeOrg && void loadRevisions(activeOrg.id)}>Tải lại</button></div>
            {revisions.filter((item) => item.propertyId === selectedProperty.propertyId).length === 0 ? <p className="partner-muted">Chưa gửi đề xuất chỉnh sửa.</p> : revisions.filter((item) => item.propertyId === selectedProperty.propertyId).map((item) => <article key={item.id}><div><strong>Đề xuất #{item.revision}</strong><span className={`partner-status-pill is-${item.status}`}>{statusText[item.status] ?? item.status}</span><small>{new Date(item.submittedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></div>{item.reviewNote && <p>{item.reviewNote}</p>}</article>)}
          </section>}
        </section>
      </div>}
      {activeOrg?.membershipRole === 'owner' && <section className="partner-card partner-members-card"><div className="partner-card-head"><div><h2>Thành viên tổ chức</h2><p>Chỉ chủ tổ chức quản lý thành viên. Mỗi cơ sở vẫn cần grant riêng từ quản trị viên.</p></div><button type="button" onClick={() => void loadMembers(activeOrg.id)} disabled={membersLoading}>Tải lại</button></div>
        <form className="partner-member-form" onSubmit={addMember}><label>Email tài khoản đã đăng ký<input type="email" name="email" required maxLength={254} placeholder="ten@vidu.vn" /></label><label>Vai trò<select value={memberRole} onChange={(event) => setMemberRole(event.target.value as 'manager' | 'viewer')}><option value="manager">Quản lý tổ chức</option><option value="viewer">Chỉ xem</option></select></label><button className="partner-primary" type="submit" disabled={memberBusy}>{memberBusy ? 'Đang lưu…' : 'Thêm thành viên'}</button><small>Không gửi lời mời hoặc tạo tài khoản thay người khác. Quyền xem/sửa tồn được quản trị viên cấp riêng theo cơ sở.</small></form>
        {membersLoading && members.length === 0 ? <p className="partner-muted">Đang tải danh sách…</p> : members.length === 0 ? <p className="partner-muted">Chưa có thành viên.</p> : <div className="partner-member-list">{members.map((member) => <div className="partner-member-row" key={member.userId}><span><strong>{member.name}</strong><small>{member.email} · {member.role === 'owner' ? 'Chủ tổ chức' : member.role === 'manager' ? 'Quản lý' : 'Chỉ xem'} · {statusText[member.status] ?? member.status}{member.disabled ? ' · Tài khoản đã khóa' : ''}</small></span>{member.userId !== user.id && member.status !== 'pending' && <button type="button" disabled={memberBusy || member.disabled} onClick={() => void changeMemberStatus(member)}>{member.status === 'active' ? 'Thu hồi' : 'Khôi phục'}</button>}</div>)}</div>}
      </section>}
      {activeOrg && <section className="partner-card partner-claim-help"><h2>Xin quản lý một cơ sở có sẵn</h2><p>Chọn hồ sơ gốc để quản trị viên xem xét. Yêu cầu không tạo bản sao cơ sở hoặc quỹ phòng.</p><form className="partner-form partner-form-grid" onSubmit={submitClaim}><label>Tìm theo tên, khu vực hoặc mã<input value={claimSearch} onChange={(event) => setClaimSearch(event.target.value)} /></label><label>Cơ sở<select value={claimPropertyId} onChange={(event) => setClaimPropertyId(event.target.value)} required><option value="">Chọn cơ sở</option>{claimCandidates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.area} · {item.code}</option>)}</select></label><label className="partner-form-wide">Lý do/giấy tờ bổ sung<input name="reason" /></label><div className="partner-form-actions partner-form-wide"><button className="partner-primary" disabled={claimBusy || !claimPropertyId}>{claimBusy ? 'Đang gửi…' : 'Gửi yêu cầu quản lý'}</button></div></form>{claimCandidates.length === 0 && <p className="partner-muted">Không có cơ sở công khai phù hợp với từ khoá này. Quản trị viên có thể tìm hồ sơ khác bằng mã.</p>}</section>}
    </div>
  </div>;
}
