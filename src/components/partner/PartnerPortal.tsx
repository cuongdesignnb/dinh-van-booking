'use client';

import { FormEvent, useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Bell, Building2, CalendarRange, ExternalLink, FileText, Images, Info, LogOut, Search, SlidersHorizontal, Users } from 'lucide-react';
import { DinhVanMark } from '@/components/ui/BrandLogo';
import { Drawer, StateBlock, StatusPill, type Tone } from '@/components/ui/system';
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
  open: 'Đang bán', stop_sell: 'Đang dừng bán', not_on_sale: 'Chưa mở bán', revoked: 'Đã thu hồi',
};
const statusTone: Record<string, Tone> = {
  pending: 'warning', needs_info: 'warning', needs_information: 'warning', pending_review: 'warning', needs_changes: 'warning', stale: 'warning',
  approved: 'success', active: 'success', published: 'success', fresh: 'success', open: 'success',
  rejected: 'danger', conflict: 'danger', stop_sell: 'danger', revoked: 'danger',
  draft: 'neutral', missing: 'neutral', not_on_sale: 'neutral',
};
type PortalTab = 'calendar' | 'profile' | 'search' | 'notifications' | 'organization';

/** Plain-language summary of what a partner may do on one property. */
function accessSummary(capabilities: Grant['capabilities']) {
  if (capabilities.canWriteInventory && capabilities.canEditProfile && capabilities.canEditRates) return { label: 'Quản lý đầy đủ', tone: 'brand' as Tone };
  if (capabilities.canWriteInventory) return { label: 'Quản lý phòng', tone: 'success' as Tone };
  if (capabilities.canReadInventory) return { label: 'Chỉ xem', tone: 'info' as Tone };
  if (capabilities.canEditProfile || capabilities.canEditRates || capabilities.canUploadMedia) return { label: 'Cập nhật hồ sơ', tone: 'neutral' as Tone };
  return { label: 'Chưa được giao việc', tone: 'neutral' as Tone };
}

function accessList(capabilities: Grant['capabilities']) {
  return [
    capabilities.canWriteInventory ? 'Xem và cập nhật số phòng' : capabilities.canReadInventory ? 'Xem lịch phòng' : null,
    capabilities.canEditProfile ? 'Đề xuất sửa hồ sơ và hạng phòng' : null,
    capabilities.canEditRates ? 'Đề xuất giá' : null,
    capabilities.canUploadMedia ? 'Tải ảnh lên thư viện' : null,
  ].filter((item): item is string => !!item);
}

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
  const [tab, setTab] = useState<PortalTab>('calendar');
  const advancedTitle = useId();
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

  // Open the first assigned property so the calendar is one click away.
  useEffect(() => {
    if (selectedPropertyId || editorRoute || initialPropertyId || !activeOrg) return;
    const first = properties.find((item) => item.organizationId === activeOrg.id);
    if (first) setSelectedPropertyId(first.propertyId);
  }, [activeOrg, editorRoute, initialPropertyId, properties, selectedPropertyId]);

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
      setError('Chỉ cập nhật được những ngày đã mở quỹ. Có ngày chưa mở; hãy thu hẹp khoảng ngày hoặc nhờ quản trị viên mở quỹ trước.');
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
      setError(reason instanceof Error ? reason.message : 'Chưa xem trước được thay đổi.');
    } finally { setBulkBusy(false); }
  };

  const applyBulkInventory = async () => {
    if (!bulkPayload) return;
    setBulkBusy(true); setError('');
    try {
      const result = await apiRequest<{ syncStatus?: string }>('/partners/inventory/bulk', {
        method: 'PUT', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(bulkPayload),
      });
      setMessage(result.syncStatus === 'queued' ? 'Đã lưu thay đổi; bảng tính đồng bộ sẽ được cập nhật sau ít phút.' : 'Đã lưu thay đổi cho các ngày đã chọn.');
      setBulkOpen(false); setBulkPreview(null); setBulkPayload(null);
      await loadInventory();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa lưu được. Nội dung vẫn được giữ để bạn kiểm tra lại.');
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
      setMessage(result.status === 'pending' ? 'Đã gửi yêu cầu. Quản trị viên sẽ xem xét và phản hồi trong mục Thông báo.' : 'Yêu cầu đã được ghi nhận.');
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
      setMessage('Đã thêm tài khoản vào tổ chức. Quyền trên từng cơ sở vẫn do quản trị viên giao riêng.');
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

  const flash = <>
    {error && <p className="ui-alert ui-tone-danger" role="alert"><Info size={16} aria-hidden="true" />{error}</p>}
    {message && <p className="ui-alert ui-tone-success" role="status"><Info size={16} aria-hidden="true" />{message}</p>}
  </>;

  if (checking) return <div className="partner-center"><StateBlock kind="loading" title="Đang kiểm tra phiên đăng nhập…" /></div>;
  if (portalDisabled) return <div className="partner-center"><section className="ui-card ui-card--pad partner-disabled">
    <span className="ui-eyebrow">Đinh Vân Booking</span>
    <h1>Cổng đối tác đang tạm đóng</h1>
    <p>Quản trị viên chưa mở đăng ký và lịch phòng cho đối tác. Vui lòng quay lại sau.</p>
    <Link className="ui-btn ui-btn--primary" href="/">Quay về website</Link>
  </section></div>;

  if (!user) return <section className="partner-auth">
    <div className="partner-auth__brand">
      <Link className="partner-auth__logo" href="/"><DinhVanMark className="partner-auth__mark" /><span>Đinh Vân <small>Đối tác</small></span></Link>
      <div className="partner-auth__pitch">
        <span className="ui-eyebrow">Hợp tác cùng Đinh Vân Booking</span>
        <h1>Cổng dành cho đối tác lưu trú</h1>
        <p>Cập nhật phòng trống, gửi đề xuất hồ sơ và nhận thông báo — chỉ trong phạm vi cơ sở bạn được giao.</p>
        <ul className="partner-auth__points">
          <li><CalendarRange size={18} aria-hidden="true" /> Lịch phòng trực quan theo tuần</li>
          <li><FileText size={18} aria-hidden="true" /> Mọi thay đổi hồ sơ đều qua bước duyệt</li>
          <li><Bell size={18} aria-hidden="true" /> Thông báo khi có kết quả duyệt</li>
        </ul>
      </div>
    </div>
    <div className="partner-auth__panel">
      <div className="ui-card ui-card--pad partner-auth__card">
        <div className="ui-tabs partner-auth__tabs" role="tablist" aria-label="Tài khoản đối tác">
          <button type="button" role="tab" id="partner-tab-login" aria-controls="partner-auth-form" aria-selected={formMode === 'login'} className="ui-tab" onClick={() => { setFormMode('login'); setError(''); }}>Đăng nhập</button>
          <button type="button" role="tab" id="partner-tab-register" aria-controls="partner-auth-form" aria-selected={formMode === 'register'} className="ui-tab" onClick={() => { setFormMode('register'); setError(''); }}>Đăng ký hợp tác</button>
        </div>
        <div className="partner-auth__intro">
          <h2>{formMode === 'login' ? 'Chào mừng trở lại' : 'Gửi hồ sơ hợp tác'}</h2>
          <p>{formMode === 'login' ? 'Đăng nhập bằng email đối tác đã được duyệt.' : 'Điền thông tin cơ bản. Quản trị viên sẽ xác minh trước khi giao quyền quản lý cơ sở.'}</p>
        </div>
        <form id="partner-auth-form" role="tabpanel" aria-labelledby={formMode === 'login' ? 'partner-tab-login' : 'partner-tab-register'} className="partner-form" onSubmit={submitAuth}>
          {formMode === 'register' && <div className="partner-form__grid">
            <label className="ui-field"><span>Họ và tên</span><input className="ui-input" name="fullName" autoComplete="name" required minLength={2} /></label>
            <label className="ui-field"><span>Số điện thoại</span><input className="ui-input" name="phone" autoComplete="tel" inputMode="tel" required /></label>
            <label className="ui-field"><span>Tên cơ sở / doanh nghiệp</span><input className="ui-input" name="organizationName" required minLength={2} /></label>
            <label className="ui-field"><span>Bạn là</span><select className="ui-select" name="organizationType"><option value="property_owner">Chủ cơ sở lưu trú</option><option value="agency">Đại lý du lịch</option></select></label>
            <label className="ui-field partner-form__wide"><span>Địa chỉ (không bắt buộc)</span><input className="ui-input" name="address" autoComplete="street-address" /></label>
          </div>}
          <label className="ui-field"><span>Email</span><input className="ui-input" name="email" type="email" autoComplete="username" required /></label>
          <label className="ui-field"><span>Mật khẩu</span><input className="ui-input" name="password" type="password" autoComplete={formMode === 'login' ? 'current-password' : 'new-password'} minLength={12} required /><small className="ui-hint">Tối thiểu 12 ký tự.</small></label>
          {flash}
          <button className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" type="submit" disabled={formBusy}>{formBusy ? 'Đang xử lý…' : formMode === 'login' ? 'Đăng nhập' : 'Gửi hồ sơ đăng ký'}</button>
          {formMode === 'register' && <p className="ui-hint">Gửi hồ sơ chưa tạo quyền quản lý ngay. Bạn sẽ nhận thông báo khi được duyệt.</p>}
        </form>
      </div>
      <Link className="partner-auth__back" href="/"><ArrowLeft size={16} aria-hidden="true" /> Về trang chủ Đinh Vân</Link>
    </div>
  </section>;

  const applications = context?.applications ?? [];
  const rooms = selectedProperty?.roomTypes ?? [];
  const inventoryByKey = new Map(inventory.map((item) => [`${item.roomTypeId}:${item.stayDate}`, item]));
  const unread = notifications.filter((item) => !item.read).length;
  const orgProperties = activeOrg ? properties.filter((item) => item.organizationId === activeOrg.id) : [];

  const topbar = <header className="partner-topbar">
    <Link className="partner-brand" href="/doi-tac"><DinhVanMark className="partner-brand__mark" /><span>Đinh Vân <small>Đối tác</small></span></Link>
    <div className="partner-topbar__actions">
      {!editorRoute && <button type="button" className="ui-btn ui-btn--ghost partner-topbar__bell" onClick={() => setTab('notifications')} aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}>
        <Bell size={18} aria-hidden="true" />{unread > 0 && <span className="partner-topbar__count" aria-hidden="true">{unread}</span>}
      </button>}
      <span className="partner-topbar__user"><span className="partner-topbar__avatar" aria-hidden="true">{user.fullName.trim().split(/\s+/).slice(-1)[0]?.[0]?.toLocaleUpperCase('vi-VN')}</span><span className="partner-topbar__name">{user.fullName}</span></span>
      <button type="button" className="ui-btn ui-btn--sm" onClick={() => void logout()}><LogOut size={16} aria-hidden="true" /> Đăng xuất</button>
    </div>
  </header>;

  if (editorRoute) {
    const editorRoom = rooms.find((room) => room.id === editorRoute.roomTypeId);
    const editorRate = editorRoom?.ratePlans.find((rate) => rate.id === editorRoute.ratePlanId);
    const editorPropertyAllowed = Boolean(selectedProperty?.capabilities.canEditProfile);
    const editorRateAllowed = Boolean(selectedProperty?.capabilities.canEditRates);
    const blocked = (title: string, text: string) => <StateBlock kind="error" title={title} text={text} action={<Link className="ui-btn" href="/doi-tac">Quay lại cổng đối tác</Link>} />;
    return <div className="partner-shell">
      {topbar}
      <div className="partner-content partner-content--narrow">
        <Link className="partner-back" href={selectedProperty ? `/doi-tac?property=${selectedProperty.propertyId}` : '/doi-tac'}><ArrowLeft size={16} aria-hidden="true" /> Quay lại cổng đối tác</Link>
        <header className="ui-page-header">
          <div className="ui-page-header__titles">
            <span className="ui-eyebrow">{selectedProperty?.name ?? 'Đối tác'}</span>
            <h1>{editorRoute.mode === 'property-create' ? 'Tạo hồ sơ cơ sở mới' : editorRoute.mode === 'room-create' ? 'Thêm hạng phòng' : editorRoute.mode === 'profile' ? 'Đề xuất sửa hồ sơ cơ sở' : editorRoute.mode === 'room' ? 'Đề xuất sửa hạng phòng' : 'Đề xuất sửa giá'}</h1>
            <p>Thay đổi sẽ được quản trị viên duyệt trước khi hiển thị trên website.</p>
          </div>
        </header>
        {flash}
        {editorRoute.mode === 'property-create' && activeOrg && <section className="ui-card ui-card--pad"><div className="ui-card__head"><div><h2 className="ui-card__title">Thông tin cơ sở</h2><p className="ui-card__lead">Chỉ nhập thông tin đã xác nhận. Giá và số phòng sẽ được khai báo sau.</p></div></div><form className="partner-form partner-form__grid" onSubmit={createProperty}>
          <label className="ui-field"><span>Tên cơ sở</span><input className="ui-input" name="title" required minLength={3} /></label>
          <label className="ui-field"><span>Loại hình</span><select className="ui-select" name="kind"><option value="homestay">Homestay</option><option value="hotel">Khách sạn</option><option value="resort">Khu nghỉ dưỡng</option><option value="villa">Villa</option><option value="guesthouse">Nhà nghỉ</option><option value="bungalow">Bungalow</option></select></label>
          <label className="ui-field"><span>Khu vực</span><input className="ui-input" name="area" required /></label>
          <label className="ui-field partner-form__wide"><span>Địa chỉ</span><input className="ui-input" name="address" required /></label>
          <label className="ui-field partner-form__wide"><span>Giới thiệu ngắn</span><input className="ui-input" name="excerpt" /></label>
          <div className="ui-sticky-actions partner-form__wide"><button className="ui-btn ui-btn--primary" disabled={formBusy}>{formBusy ? 'Đang lưu…' : 'Tạo bản nháp'}</button></div>
        </form></section>}
        {editorRoute.mode === 'property-create' && !activeOrg && blocked('Tổ chức chưa được duyệt', 'Chỉ tổ chức đã được duyệt mới có thể tạo hồ sơ cơ sở.')}
        {editorRoute.mode !== 'property-create' && !selectedProperty && blocked('Không tìm thấy cơ sở', 'Cơ sở này không nằm trong danh sách bạn được giao, hoặc quyền đã thay đổi.')}
        {editorRoute.mode === 'room-create' && selectedProperty && editorPropertyAllowed && <section className="ui-card ui-card--pad"><div className="ui-card__head"><div><h2 className="ui-card__title">{selectedProperty.name}</h2><p className="ui-card__lead">Khai báo đúng hạng phòng của cơ sở. Số lượng, giá và chính sách sẽ được bổ sung sau.</p></div></div><form className="partner-form partner-form__grid" onSubmit={createRoom}>
          <label className="ui-field"><span>Tên hạng phòng</span><input className="ui-input" name="name" required /></label>
          <label className="ui-field"><span>Mã hạng (không bắt buộc)</span><input className="ui-input" name="code" /></label>
          <label className="ui-field"><span>Mô tả</span><input className="ui-input" name="description" /></label>
          <label className="ui-field"><span>Giường</span><input className="ui-input" name="bedSummary" placeholder="Ví dụ: 1 giường đôi" /></label>
          <div className="ui-sticky-actions partner-form__wide"><button className="ui-btn ui-btn--primary" disabled={formBusy}>{formBusy ? 'Đang lưu…' : 'Tạo hạng phòng nháp'}</button></div>
        </form></section>}
        {editorRoute.mode === 'profile' && selectedProperty && editorPropertyAllowed && <form className="partner-form partner-editor" onSubmit={(event) => void savePropertyRevision(event)}>
          <section className="ui-card ui-card--pad"><h2 className="ui-card__title">Thông tin cơ bản</h2><div className="partner-form__grid">
            <label className="ui-field"><span>Tên cơ sở</span><input className="ui-input" name="title" defaultValue={selectedProperty.name} required minLength={3} /></label>
            <label className="ui-field"><span>Khu vực</span><input className="ui-input" name="area" defaultValue={selectedProperty.area} required /></label>
            <label className="ui-field partner-form__wide"><span>Địa chỉ</span><input className="ui-input" name="address" defaultValue={selectedProperty.address} required /></label>
            <label className="ui-field"><span>Giờ nhận phòng</span><input className="ui-input" name="checkInTime" defaultValue={selectedProperty.checkInTime} required /></label>
            <label className="ui-field"><span>Giờ trả phòng</span><input className="ui-input" name="checkOutTime" defaultValue={selectedProperty.checkOutTime} required /></label>
            <label className="ui-field partner-form__wide"><span>Giới thiệu ngắn</span><input className="ui-input" name="excerpt" defaultValue={selectedProperty.excerpt ?? ''} maxLength={500} /></label>
          </div></section>
          <section className="ui-card ui-card--pad"><h2 className="ui-card__title">Mô tả chi tiết</h2><div className="partner-rich-editor"><RichTextEditor value={descriptionDocument} onChange={(document) => setDescriptionDocument(document)} label="Mô tả chi tiết" hint="Nội dung sẽ được duyệt trước khi thay đổi trên website." /></div></section>
          <section className="ui-card ui-card--pad"><h2 className="ui-card__title">Nội quy & lưu ý</h2><div className="partner-form__grid">
            <label className="ui-field"><span>Nội quy — mỗi dòng một ý</span><textarea className="ui-textarea" name="houseRules" rows={5} defaultValue={selectedProperty.houseRules.join('\n')} maxLength={7200} /></label>
            <label className="ui-field"><span>Lưu ý cho khách — mỗi dòng một ý</span><textarea className="ui-textarea" name="notes" rows={5} defaultValue={selectedProperty.notes.join('\n')} maxLength={10000} /></label>
          </div></section>
          <section className="ui-card ui-card--pad"><h2 className="ui-card__title">Album ảnh</h2><p className="ui-card__lead">Chọn ảnh theo thứ tự hiển thị; ảnh đầu tiên là ảnh bìa.</p>
            {media.length ? <div className="partner-media-grid">{media.map((item) => <button key={item.id} type="button" aria-pressed={selectedMediaIds.includes(item.id)} className={selectedMediaIds.includes(item.id) ? 'is-selected' : ''} onClick={() => setSelectedMediaIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])}><Image src={item.url} alt={item.altText ?? ''} width={item.width ?? 320} height={item.height ?? 220} unoptimized /><span>{selectedMediaIds.includes(item.id) ? `#${selectedMediaIds.indexOf(item.id) + 1} · ` : ''}{item.altText || 'Chưa có mô tả ảnh'}</span></button>)}</div> : <StateBlock title="Thư viện ảnh còn trống" text="Tải ảnh lên trong mục Hồ sơ cơ sở của cổng đối tác." />}
          </section>
          <div className="ui-sticky-actions"><span className="ui-sticky-actions__note">Website chỉ thay đổi sau khi đề xuất được duyệt.</span><Link className="ui-btn" href={`/doi-tac?property=${selectedProperty.propertyId}`}>Huỷ</Link><button className="ui-btn ui-btn--primary" type="submit" disabled={revisionBusy}>{revisionBusy ? 'Đang gửi…' : 'Gửi đề xuất'}</button></div>
        </form>}
        {editorRoute.mode === 'room' && selectedProperty && editorPropertyAllowed && editorRoom && <section className="ui-card ui-card--pad"><div className="ui-card__head"><div><h2 className="ui-card__title">{editorRoom.name} <small className="partner-muted">{editorRoom.code}</small></h2><p className="ui-card__lead">Đề xuất sẽ được quản trị viên duyệt.</p></div></div><form className="partner-form partner-form__grid" onSubmit={(event) => void saveRoomRevision(event, editorRoom)}>
          <label className="ui-field"><span>Tên hạng phòng</span><input className="ui-input" name="name" defaultValue={editorRoom.name} required /></label>
          <label className="ui-field"><span>Loại đơn vị</span><input className="ui-input" name="unitKind" defaultValue={editorRoom.unitKind ?? ''} /></label>
          <label className="ui-field partner-form__wide"><span>Mô tả</span><input className="ui-input" name="description" defaultValue={editorRoom.description ?? ''} /></label>
          <label className="ui-field"><span>Giường</span><input className="ui-input" name="bedSummary" defaultValue={editorRoom.bedSummary ?? ''} /></label>
          <label className="ui-field"><span>Diện tích (m²)</span><input className="ui-input" name="areaSqm" type="number" min="0" defaultValue={editorRoom.areaSqm ?? ''} /></label>
          <label className="ui-field"><span>Số phòng ngủ</span><input className="ui-input" name="bedroomCount" type="number" min="0" defaultValue={editorRoom.bedroomCount ?? ''} /></label>
          <label className="ui-field"><span>Số phòng tắm</span><input className="ui-input" name="bathroomCount" type="number" min="0" defaultValue={editorRoom.bathroomCount ?? ''} /></label>
          <label className="ui-field"><span>Người lớn tối đa</span><input className="ui-input" name="maxAdults" type="number" min="1" defaultValue={editorRoom.maxAdults} /></label>
          <label className="ui-field"><span>Trẻ em tối đa</span><input className="ui-input" name="maxChildren" type="number" min="0" defaultValue={editorRoom.maxChildren} /></label>
          <div className="ui-sticky-actions partner-form__wide"><button className="ui-btn ui-btn--primary" disabled={revisionBusy}>{revisionBusy ? 'Đang gửi…' : 'Gửi đề xuất hạng phòng'}</button></div>
        </form></section>}
        {editorRoute.mode === 'rate' && selectedProperty && editorRateAllowed && editorRoom && editorRate && <section className="ui-card ui-card--pad"><div className="ui-card__head"><div><h2 className="ui-card__title">{editorRoom.name} · {editorRate.name}</h2><p className="ui-card__lead">Giá hiện tại: {editorRate.baseRateVnd === '0' ? 'cần được xác nhận' : `${Number(editorRate.baseRateVnd).toLocaleString('vi-VN')}₫/đêm`}</p></div></div><form className="partner-form partner-form__grid" onSubmit={(event) => void saveRateRevision(event, editorRoom, editorRate)}>
          <label className="ui-field"><span>Giá ngày thường (VND)</span><input className="ui-input" name="baseRateVnd" inputMode="numeric" pattern="[0-9]{1,15}" defaultValue={editorRate.baseRateVnd} required /></label>
          <label className="ui-field"><span>Giá cuối tuần (để trống nếu như ngày thường)</span><input className="ui-input" name="weekendRateVnd" inputMode="numeric" pattern="[0-9]{0,15}" defaultValue={editorRate.weekendRateVnd ?? ''} /></label>
          <label className="ui-field"><span>Số đêm tối thiểu</span><input className="ui-input" name="minStayNights" type="number" min="1" max="30" defaultValue={editorRate.minStayNights} required /></label>
          <label className="ui-field"><span>Số đêm tối đa</span><input className="ui-input" name="maxStayNights" type="number" min="1" max="365" defaultValue={editorRate.maxStayNights ?? ''} /></label>
          <label className="ui-check partner-form__wide"><input name="breakfastIncluded" type="checkbox" defaultChecked={editorRate.breakfastIncluded} /> Đã bao gồm bữa sáng</label>
          <label className="ui-field partner-form__wide"><span>Quyền lợi kèm theo — mỗi dòng một mục</span><textarea className="ui-textarea" name="inclusions" rows={3} defaultValue={editorRate.inclusions.filter((value): value is string => typeof value === 'string').join('\n')} /></label>
          <div className="ui-sticky-actions partner-form__wide"><button className="ui-btn ui-btn--primary" disabled={revisionBusy}>{revisionBusy ? 'Đang gửi…' : 'Gửi đề xuất giá'}</button></div>
        </form></section>}
        {editorRoute.mode === 'profile' && selectedProperty && !editorPropertyAllowed && blocked('Bạn chưa được giao quyền sửa hồ sơ', 'Quản trị viên giao quyền sửa hồ sơ riêng cho từng cơ sở.')}
        {editorRoute.mode === 'room-create' && selectedProperty && !editorPropertyAllowed && blocked('Bạn chưa được giao quyền thêm hạng phòng', 'Quản trị viên giao quyền sửa hồ sơ riêng cho từng cơ sở.')}
        {editorRoute.mode === 'room' && selectedProperty && !editorPropertyAllowed && blocked('Bạn chưa được giao quyền sửa hạng phòng', 'Quản trị viên giao quyền sửa hồ sơ riêng cho từng cơ sở.')}
        {editorRoute.mode === 'room' && selectedProperty && editorPropertyAllowed && !editorRoom && blocked('Không tìm thấy hạng phòng', 'Hạng phòng này không thuộc cơ sở bạn được giao.')}
        {editorRoute.mode === 'rate' && selectedProperty && (!editorRateAllowed || !editorRoom || !editorRate) && blocked('Bạn chưa được giao quyền sửa giá', 'Kiểm tra lại với quản trị viên: quyền có thể đã hết hạn hoặc hạng phòng không thuộc phạm vi được giao.')}
      </div>
    </div>;
  }

  const tabs: Array<{ id: PortalTab; label: string; icon: typeof Bell; count?: number; hidden?: boolean }> = [
    { id: 'calendar', label: 'Lịch phòng', icon: CalendarRange, hidden: !activeOrg },
    { id: 'profile', label: 'Hồ sơ cơ sở', icon: Building2, hidden: !activeOrg },
    { id: 'search', label: 'Tra cứu phòng', icon: Search, hidden: !activeOrg },
    { id: 'notifications', label: 'Thông báo', icon: Bell, count: unread },
    { id: 'organization', label: 'Tổ chức', icon: Users, hidden: !activeOrg },
  ];
  const visibleTabs = tabs.filter((item) => !item.hidden);
  const currentTab = visibleTabs.some((item) => item.id === tab) ? tab : visibleTabs[0].id;
  const access = selectedProperty ? accessSummary(selectedProperty.capabilities) : null;
  const propertyRevisions = selectedProperty ? revisions.filter((item) => item.propertyId === selectedProperty.propertyId) : [];
  const needProperty = (content: ReactNode) => selectedProperty ? content : <StateBlock title="Chọn một cơ sở" text={orgProperties.length ? 'Chọn cơ sở ở phía trên để xem thông tin.' : 'Bạn chưa được giao cơ sở nào. Có thể tạo hồ sơ mới hoặc xin quản lý cơ sở có sẵn trong mục Tổ chức.'} />;

  return <div className="partner-shell">
    {topbar}
    <div className="partner-content">
      <section className="partner-welcome">
        <div>
          <span className="ui-eyebrow">{activeOrg?.name ?? 'Cổng đối tác'}</span>
          <h1>Xin chào, {user.fullName}</h1>
          <p>{activeOrg ? (orgProperties.length ? `Bạn đang quản lý ${orgProperties.length} cơ sở. Chỉ những cơ sở được giao mới hiển thị ở đây.` : 'Tổ chức đã được duyệt. Cơ sở sẽ hiển thị khi quản trị viên giao quyền.') : 'Hồ sơ của bạn đang chờ duyệt.'}</p>
        </div>
        <Link className="ui-btn" href="/" target="_blank"><ExternalLink size={16} aria-hidden="true" /> Xem website</Link>
      </section>
      {flash}

      {applications.some((item) => item.status !== 'approved') && <section className="ui-card ui-card--pad partner-review-status">
        <div className="ui-card__head"><div><h2 className="ui-card__title">Hồ sơ đăng ký</h2><p className="ui-card__lead">Tài khoản được duyệt rồi mới được giao quyền quản lý từng cơ sở.</p></div></div>
        {applications.filter((item) => item.status !== 'approved').map((item) => <div key={item.id} className="partner-review-status__item">
          <p><StatusPill tone={statusTone[item.status] ?? 'neutral'}>{statusText[item.status] ?? item.status}</StatusPill>{item.reviewNote && <span className="partner-muted"> {item.reviewNote}</span>}</p>
          {item.status === 'needs_info' && <form className="partner-form partner-form__grid" onSubmit={(event) => void resubmitApplication(event, item)}>
            <label className="ui-field"><span>Họ và tên</span><input className="ui-input" name="fullName" defaultValue={item.submittedName} required minLength={2} /></label>
            <label className="ui-field"><span>Số điện thoại</span><input className="ui-input" name="phone" defaultValue={item.submittedPhone} required /></label>
            <label className="ui-field"><span>Tên cơ sở / doanh nghiệp</span><input className="ui-input" name="organizationName" defaultValue={item.organization.name} required minLength={2} /></label>
            <label className="ui-field"><span>Địa chỉ</span><input className="ui-input" name="address" defaultValue={item.organization.address ?? ''} /></label>
            <div className="partner-form__wide"><button className="ui-btn ui-btn--primary" disabled={formBusy}>{formBusy ? 'Đang gửi…' : 'Gửi lại hồ sơ'}</button></div>
          </form>}
        </div>)}
      </section>}

      {!activeOrg && <StateBlock title="Chưa có tổ chức được duyệt" text="Khi quản trị viên duyệt hồ sơ, tổ chức và các cơ sở được giao sẽ xuất hiện tại đây." />}

      {activeOrg && <section className="partner-properties" aria-label="Cơ sở được giao">
        {orgProperties.map((property) => { const summary = accessSummary(property.capabilities); return <button key={property.propertyId} type="button" aria-pressed={selectedPropertyId === property.propertyId} className={`partner-property${selectedPropertyId === property.propertyId ? ' is-selected' : ''}`} onClick={() => setSelectedPropertyId(property.propertyId)}>
          <span className="partner-property__icon" aria-hidden="true"><Building2 size={20} /></span>
          <span className="partner-property__text"><strong>{property.name}</strong><small>{property.area} · {statusText[property.publicationStatus] ?? property.publicationStatus}</small></span>
          <StatusPill tone={summary.tone}>{summary.label}</StatusPill>
        </button>; })}
        <Link className="partner-property partner-property--add" href="/doi-tac/chinh-sua?mode=property-create"><span className="partner-property__icon" aria-hidden="true">+</span><span className="partner-property__text"><strong>Tạo hồ sơ cơ sở mới</strong><small>Gửi quản trị viên duyệt</small></span></Link>
      </section>}

      <nav className="ui-tabs partner-tabs" aria-label="Khu vực làm việc">
        {visibleTabs.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className="ui-tab" aria-current={currentTab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><Icon size={17} aria-hidden="true" />{item.label}{!!item.count && <span className="ui-tab__count">{item.count}</span>}</button>; })}
      </nav>

      {currentTab === 'calendar' && activeOrg && needProperty(selectedProperty && (selectedProperty.capabilities.canReadInventory ? <InventoryCalendarMatrix mode="partner" propertyName={selectedProperty.name} rooms={rooms} items={inventory} dates={dates} view={calendarView} anchor={calendarAnchor} onView={setCalendarView} onAnchor={setCalendarAnchor} canWrite={selectedProperty.capabilities.canWriteInventory} loading={inventoryLoading} onRefresh={loadInventory}
          toolbarExtra={selectedProperty.capabilities.canWriteInventory ? <button type="button" className="ui-btn" onClick={() => { setBulkOpen(true); setBulkPreview(null); setBulkPayload(null); setError(''); }}><SlidersHorizontal size={16} aria-hidden="true" /> Cập nhật nâng cao</button> : undefined}
          onSave={(change, key) => apiRequest('/partners/inventory/available', { method: 'POST', headers: { 'idempotency-key': key }, body: JSON.stringify({ ...change, organizationId: selectedProperty.organizationId }) })}
          onConfirm={selectedProperty.capabilities.canWriteInventory ? confirmRoomRange : undefined} />
        : <StateBlock icon={<CalendarRange size={24} />} title="Bạn chưa được giao quyền xem lịch phòng" text="Quản trị viên giao quyền xem hoặc cập nhật lịch phòng riêng cho từng cơ sở." />))}

      {currentTab === 'profile' && activeOrg && needProperty(selectedProperty && access && <div className="partner-grid">
        <section className="ui-card ui-card--pad partner-summary">
          <div className="ui-card__head"><div><span className="ui-eyebrow">{selectedProperty.code}</span><h2 className="ui-card__title">{selectedProperty.name}</h2><p className="ui-card__lead">{selectedProperty.area}</p></div><StatusPill tone={statusTone[selectedProperty.publicationStatus] ?? 'neutral'}>{statusText[selectedProperty.publicationStatus] ?? selectedProperty.publicationStatus}</StatusPill></div>
          <h3 className="partner-subtitle">Bạn có thể</h3>
          <ul className="partner-checklist">{accessList(selectedProperty.capabilities).map((item) => <li key={item}>{item}</li>)}{!accessList(selectedProperty.capabilities).length && <li className="is-off">Chưa có việc nào được giao cho cơ sở này</li>}</ul>
          <div className="ui-actions">
            {selectedProperty.capabilities.canEditProfile && <><Link className="ui-btn ui-btn--primary" href={`/doi-tac/chinh-sua?mode=profile&property=${selectedProperty.propertyId}`}>Đề xuất sửa hồ sơ</Link><Link className="ui-btn" href={`/doi-tac/chinh-sua?mode=room-create&property=${selectedProperty.propertyId}`}>Thêm hạng phòng</Link></>}
            {selectedProperty.publicPath && <a className="ui-btn ui-btn--ghost" href={selectedProperty.publicPath} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" /> Xem trên website</a>}
          </div>
        </section>
        <section className="ui-card ui-card--pad">
          <div className="ui-card__head"><div><h2 className="ui-card__title">Hạng phòng</h2><p className="ui-card__lead">{rooms.length} hạng phòng trong cơ sở này</p></div></div>
          {rooms.length ? <ul className="partner-rooms">{rooms.map((room) => <li key={room.id}>
            <div><strong>{room.name}</strong><small>{room.code} · {room.status === 'draft' ? 'Bản nháp' : room.capacityVerified ? 'Đã xác minh sức chứa' : 'Chưa xác minh sức chứa'}</small></div>
            {(selectedProperty.capabilities.canEditProfile || selectedProperty.capabilities.canEditRates) && <div className="ui-actions">
              {selectedProperty.capabilities.canEditProfile && <Link className="ui-btn ui-btn--sm" href={`/doi-tac/chinh-sua?mode=room&property=${selectedProperty.propertyId}&room=${room.id}`}>Sửa thông tin</Link>}
              {selectedProperty.capabilities.canEditRates && room.ratePlans.map((rate) => <Link key={rate.id} className="ui-btn ui-btn--sm" href={`/doi-tac/chinh-sua?mode=rate&property=${selectedProperty.propertyId}&room=${room.id}&rate=${rate.id}`}>Sửa giá · {rate.name}</Link>)}
            </div>}
          </li>)}</ul> : <p className="partner-muted">Chưa có hạng phòng.</p>}
        </section>
        {selectedProperty.capabilities.canUploadMedia && <section className="ui-card ui-card--pad partner-grid__wide">
          <div className="ui-card__head"><div><h2 className="ui-card__title"><Images size={20} aria-hidden="true" /> Thư viện ảnh</h2><p className="ui-card__lead">Ảnh tải lên được giữ riêng tư cho tới khi được duyệt và gắn vào hồ sơ.</p></div></div>
          <form className="partner-upload" onSubmit={uploadMedia}>
            <label className="ui-field"><span>Mô tả ảnh (bắt buộc)</span><input className="ui-input" value={mediaAlt} onChange={(event) => setMediaAlt(event.target.value)} placeholder="Ví dụ: Phòng đôi nhìn ra rừng" required /></label>
            <label className="ui-field"><span>Chọn ảnh</span><input className="ui-input" name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
            <button className="ui-btn ui-btn--primary" disabled={uploading}>{uploading ? 'Đang tải…' : 'Tải lên'}</button>
          </form>
          {media.length ? <div className="partner-media-grid">{media.map((item) => <button key={item.id} type="button" aria-pressed={selectedMediaIds.includes(item.id)} className={selectedMediaIds.includes(item.id) ? 'is-selected' : ''} onClick={() => setSelectedMediaIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])}><Image src={item.url} alt={item.altText ?? ''} width={item.width ?? 320} height={item.height ?? 220} unoptimized /><span>{item.altText || 'Chưa có mô tả ảnh'} · {item.visibility === 'private' ? 'Riêng tư' : 'Công khai'}</span></button>)}</div> : <p className="partner-muted">Chưa có ảnh trong thư viện.</p>}
        </section>}
        <section className="ui-card ui-card--pad partner-grid__wide">
          <div className="ui-card__head"><div><h2 className="ui-card__title">Đề xuất đã gửi</h2><p className="ui-card__lead">Đề xuất đang chờ duyệt chưa làm thay đổi website.</p></div><button type="button" className="ui-btn ui-btn--sm" onClick={() => activeOrg && void loadRevisions(activeOrg.id)}>Tải lại</button></div>
          {propertyRevisions.length === 0 ? <p className="partner-muted">Bạn chưa gửi đề xuất nào cho cơ sở này.</p> : <ul className="partner-list">{propertyRevisions.map((item) => <li key={item.id}><div><strong>Đề xuất #{item.revision}</strong><small>{new Date(item.submittedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small>{item.reviewNote && <p>{item.reviewNote}</p>}</div><StatusPill tone={statusTone[item.status] ?? 'neutral'}>{statusText[item.status] ?? item.status}</StatusPill></li>)}</ul>}
        </section>
      </div>)}

      {currentTab === 'search' && activeOrg && <section className="ui-card ui-card--pad">
        <div className="ui-card__head"><div><h2 className="ui-card__title">Tra cứu phòng trống</h2><p className="ui-card__lead">Kết quả lấy từ dữ liệu đã công khai. Hãy xác nhận lại trước khi nhận khách.</p></div></div>
        <form className="partner-search" onSubmit={(event) => void searchAvailability(event)}>
          <label className="ui-field"><span>Ngày nhận</span><input className="ui-input" type="date" value={searchCheckIn} min={today} onChange={(event) => { setSearchCheckIn(event.target.value); if (event.target.value >= searchCheckOut) setSearchCheckOut(shiftDay(event.target.value, 1)); }} required /></label>
          <label className="ui-field"><span>Ngày trả</span><input className="ui-input" type="date" value={searchCheckOut} min={shiftDay(searchCheckIn, 1)} onChange={(event) => setSearchCheckOut(event.target.value)} required /></label>
          <label className="ui-field"><span>Số phòng</span><input className="ui-input" name="rooms" type="number" min="1" max="5" defaultValue="1" required /></label>
          <label className="ui-field"><span>Người lớn</span><input className="ui-input" name="adults" type="number" min="1" max="20" defaultValue="2" required /></label>
          <label className="ui-field"><span>Trẻ em</span><input className="ui-input" name="children" type="number" min="0" max="12" defaultValue="0" required /></label>
          <label className="ui-field"><span>Khu vực</span><input className="ui-input" name="area" maxLength={80} placeholder="Ví dụ: Cúc Phương" /></label>
          <label className="ui-field"><span>Loại cơ sở</span><select className="ui-select" name="kind" defaultValue=""><option value="">Tất cả</option><option value="homestay">Homestay</option><option value="hotel">Khách sạn</option><option value="resort">Khu nghỉ dưỡng</option><option value="villa">Villa</option></select></label>
          <button className="ui-btn ui-btn--primary" type="submit" disabled={availabilityBusy}><Search size={16} aria-hidden="true" /> {availabilityBusy ? 'Đang kiểm tra…' : 'Tra cứu'}</button>
        </form>
        {!availabilityEnabled && <p className="ui-alert ui-tone-warning"><Info size={16} aria-hidden="true" /> Tra cứu phòng trống đang tạm tắt.</p>}
        {availabilityEnabled && availability.length > 0 && <div className="partner-results">{availability.map((item) => <article className="partner-result" key={`${item.propertyId}:${item.roomTypeId}`}>
          {item.cover ? <Image src={item.cover.url} alt={item.cover.alt ?? ''} width={480} height={320} unoptimized /> : <span className="partner-result__placeholder" aria-hidden="true"><Building2 size={24} /></span>}
          <div className="partner-result__body">
            <StatusPill tone={item.status === 'available' ? 'success' : item.status === 'sold_out' ? 'danger' : 'warning'}>{item.status === 'available' ? 'Còn phòng' : item.status === 'stale' ? 'Cần xác nhận lại' : item.status === 'needs_check' ? 'Đang được rà soát' : 'Hết phòng phù hợp'}</StatusPill>
            <h3>{item.name}</h3>
            <p>{item.roomTypeName} · {item.area}</p>
            <small>{item.priceMode === 'contact' ? 'Giá: liên hệ để xác nhận' : 'Giá công khai — kiểm tra lại trước khi nhận khách'}{item.lastConfirmedAt ? ` · Cập nhật ${new Date(item.lastConfirmedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : ''}</small>
          </div>
          {item.path && <Link className="ui-btn ui-btn--sm" href={item.path}>Xem cơ sở</Link>}
        </article>)}</div>}
        {availabilityEnabled && availabilitySearched && availability.length === 0 && <StateBlock title="Chưa có kết quả" text="Thử đổi ngày, số khách hoặc khu vực." />}
      </section>}

      {currentTab === 'notifications' && <section className="ui-card ui-card--pad">
        <div className="ui-card__head"><div><h2 className="ui-card__title">Thông báo</h2><p className="ui-card__lead">{unread ? `${unread} thông báo chưa đọc` : 'Không có thông báo mới'}</p></div><button type="button" className="ui-btn ui-btn--sm" onClick={() => void loadNotifications()}>Tải lại</button></div>
        {notifications.length === 0 ? <StateBlock icon={<Bell size={24} />} title="Chưa có thông báo" text="Kết quả duyệt, thay đổi quyền và nhắc cập nhật lịch phòng sẽ hiển thị tại đây." /> : <ul className="partner-list">{notifications.map((notification) => <li className={notification.read ? '' : 'is-unread'} key={notification.id}><div><strong>{notification.title}</strong><p>{notification.body}</p><small>{new Date(notification.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</small></div>{!notification.read && <button type="button" className="ui-btn ui-btn--sm" onClick={() => void markNotificationRead(notification)}>Đánh dấu đã đọc</button>}</li>)}</ul>}
      </section>}

      {currentTab === 'organization' && activeOrg && <div className="partner-grid">
        {activeOrg.membershipRole === 'owner' && <section className="ui-card ui-card--pad partner-grid__wide">
          <div className="ui-card__head"><div><h2 className="ui-card__title">Thành viên tổ chức</h2><p className="ui-card__lead">Chỉ chủ tổ chức thêm hoặc thu hồi thành viên. Quyền trên từng cơ sở vẫn do quản trị viên giao.</p></div><button type="button" className="ui-btn ui-btn--sm" onClick={() => void loadMembers(activeOrg.id)} disabled={membersLoading}>Tải lại</button></div>
          <form className="partner-member-form" onSubmit={addMember}>
            <label className="ui-field"><span>Email tài khoản đã đăng ký</span><input className="ui-input" type="email" name="email" required maxLength={254} placeholder="ten@vidu.vn" /></label>
            <label className="ui-field"><span>Vai trò</span><select className="ui-select" value={memberRole} onChange={(event) => setMemberRole(event.target.value as 'manager' | 'viewer')}><option value="manager">Quản lý</option><option value="viewer">Chỉ xem</option></select></label>
            <button className="ui-btn ui-btn--primary" type="submit" disabled={memberBusy}>{memberBusy ? 'Đang lưu…' : 'Thêm thành viên'}</button>
          </form>
          {membersLoading && members.length === 0 ? <p className="partner-muted">Đang tải danh sách…</p> : members.length === 0 ? <p className="partner-muted">Chưa có thành viên.</p> : <ul className="partner-list">{members.map((member) => <li key={member.userId}><div><strong>{member.name}</strong><small>{member.email} · {member.role === 'owner' ? 'Chủ tổ chức' : member.role === 'manager' ? 'Quản lý' : 'Chỉ xem'}{member.disabled ? ' · Tài khoản đã khoá' : ''}</small></div><span className="ui-actions"><StatusPill tone={statusTone[member.status] ?? 'neutral'}>{statusText[member.status] ?? member.status}</StatusPill>{member.userId !== user.id && member.status !== 'pending' && <button type="button" className={`ui-btn ui-btn--sm${member.status === 'active' ? ' ui-btn--danger' : ''}`} disabled={memberBusy || member.disabled} onClick={() => void changeMemberStatus(member)}>{member.status === 'active' ? 'Thu hồi' : 'Khôi phục'}</button>}</span></li>)}</ul>}
        </section>}
        <section className="ui-card ui-card--pad partner-grid__wide">
          <div className="ui-card__head"><div><h2 className="ui-card__title">Xin quản lý một cơ sở có sẵn</h2><p className="ui-card__lead">Chọn cơ sở đã có trên website và gửi lý do để quản trị viên xem xét.</p></div></div>
          <form className="partner-form partner-form__grid" onSubmit={submitClaim}>
            <label className="ui-field"><span>Tìm theo tên, khu vực hoặc mã</span><input className="ui-input" value={claimSearch} onChange={(event) => setClaimSearch(event.target.value)} /></label>
            <label className="ui-field"><span>Cơ sở</span><select className="ui-select" value={claimPropertyId} onChange={(event) => setClaimPropertyId(event.target.value)} required><option value="">Chọn cơ sở</option>{claimCandidates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.area} · {item.code}</option>)}</select></label>
            <label className="ui-field partner-form__wide"><span>Lý do / giấy tờ chứng minh</span><input className="ui-input" name="reason" /></label>
            <div className="partner-form__wide"><button className="ui-btn ui-btn--primary" disabled={claimBusy || !claimPropertyId}>{claimBusy ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></div>
          </form>
          {claimCandidates.length === 0 && <p className="partner-muted">Không tìm thấy cơ sở phù hợp với từ khoá này.</p>}
        </section>
      </div>}
    </div>

    {selectedProperty?.capabilities.canWriteInventory && <Drawer open={bulkOpen} onClose={() => { if (!bulkBusy) { setBulkOpen(false); setBulkPreview(null); setBulkPayload(null); } }} labelId={advancedTitle} busy={bulkBusy}
      eyebrow={selectedProperty.name} title="Cập nhật nâng cao"
      description="Ghi nhận phòng bán ngoài, phòng bảo trì hoặc phòng giữ lại cho nhiều đêm. Bạn sẽ xem trước trước khi lưu."
      footer={bulkPreview ? <>
        <button type="button" className="ui-btn" disabled={bulkBusy} onClick={() => { setBulkPreview(null); setBulkPayload(null); }}>Quay lại sửa</button>
        <button type="button" className="ui-btn ui-btn--primary" disabled={bulkBusy} onClick={() => void applyBulkInventory()}>{bulkBusy ? 'Đang lưu…' : 'Xác nhận và lưu'}</button>
      </> : <>
        <button type="button" className="ui-btn" disabled={bulkBusy} onClick={() => setBulkOpen(false)}>Huỷ</button>
        <button type="submit" form={advancedTitle + '-form'} className="ui-btn ui-btn--primary" disabled={bulkBusy}>{bulkBusy ? 'Đang kiểm tra…' : 'Xem trước thay đổi'}</button>
      </>}>
      {error && <p className="ui-alert ui-tone-danger" role="alert">{error}</p>}
      {bulkPreview ? <div className="partner-advanced-preview" role="status">
        <span className="ui-badge ui-tone-brand">{bulkPreview.items.length} đêm sẽ được cập nhật cùng lúc</span>
        <ul className="inventory-panel__preview-days">{bulkPreview.items.map((item) => { const beforeAvailable = item.before.stopSell ? 0 : item.before.capacity - item.before.blockedCount - item.before.heldCount - item.before.reservedCount; return <li key={`${item.roomTypeId}:${item.stayDate}`}><span>{labelDate(item.stayDate)}</span><strong>{beforeAvailable} → {item.after.available} phòng{item.after.stopSell ? ' · Dừng bán' : ''}</strong></li>; })}</ul>
        <p className="ui-hint">Nếu một ngày bị thay đổi bởi người khác trong lúc này, toàn bộ cập nhật sẽ không được lưu để tránh sai lệch.</p>
      </div> : <form id={advancedTitle + '-form'} className="partner-form" onSubmit={(event) => void previewBulkInventory(event)}>
        <label className="ui-field"><span>Hạng phòng</span><select className="ui-select" name="roomTypeId" required data-autofocus><option value="">Chọn hạng phòng</option>{rooms.filter((room) => room.status === 'active').map((room) => <option key={room.id} value={room.id}>{room.name} · {room.code}</option>)}</select></label>
        <div className="partner-form__grid">
          <label className="ui-field"><span>Từ đêm</span><input className="ui-input" name="from" type="date" defaultValue={dates[0]} required /></label>
          <label className="ui-field"><span>Đến trước ngày</span><input className="ui-input" name="toExclusive" type="date" defaultValue={shiftDay(dates[dates.length - 1], 1)} required /></label>
          <label className="ui-field"><span>Phòng đã bán ngoài</span><input className="ui-input" name="externalSoldCount" type="number" min="0" max="5000" placeholder="Giữ nguyên" /></label>
          <label className="ui-field"><span>Phòng bảo trì / khoá</span><input className="ui-input" name="maintenanceCount" type="number" min="0" max="5000" placeholder="Giữ nguyên" /></label>
          <label className="ui-field"><span>Phòng chủ cơ sở giữ lại</span><input className="ui-input" name="ownerWithheldCount" type="number" min="0" max="5000" placeholder="Giữ nguyên" /></label>
          <label className="ui-field"><span>Trạng thái bán</span><select className="ui-select" name="stopSell" defaultValue=""><option value="">Giữ nguyên</option><option value="false">Mở bán</option><option value="true">Dừng bán</option></select></label>
        </div>
        <p className="ui-hint">Để trống ô nào thì giữ nguyên giá trị đó. Ngày trả phòng không nằm trong khoảng cập nhật.</p>
      </form>}
    </Drawer>}
  </div>;
}
