'use client';

import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowLeft, BedDouble, CalendarClock, Check, CircleDollarSign,
  ClipboardList, CreditCard, FileBarChart2, Plus, RefreshCw, Search, Tag, Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api/client';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { useAdminToast } from '@/components/admin/toast/useAdminToast';
import { AdminPagination, EmptyState, ErrorState, Panel, StatCard, StatusBadge } from '../shared/ui';

type Section = 'dashboard' | 'bookings' | 'inventory' | 'customers' | 'coupons' | 'payments' | 'reports';
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
type Person = { fullName: string; phone: string | null; email: string | null };
type AdminQuote = { id: string; subtotalVnd: string; discountVnd: string; totalVnd: string; dueNowVnd: string; expiresAt: string; snapshot: { propertyName: string; roomName: string; nights: Array<{ stayDate: string; amountVnd: string }> } };
type RoomType = { id: string; code: string; name: string; propertyId: string; propertyName: string; status: string };
type Booking = {
  id: string; publicCode: string; bookingStatus: string; paymentPlan: string; channel: string; checkIn: string | null; checkOut: string | null;
  adults: number; children: number; totalVnd: string; dueNowVnd: string; version: number; expiresAt: string | null; createdAt: string;
  customer: Person; lines?: Array<{ id: string; kind: string; label: string; quantity: number; grossVnd: string; netVnd: string; priceBreakdown: unknown; reservations?: Array<{ status: string; expiresAt: string | null; nights: Array<{ stayDate: string; quantity: number }> }> }>;
  payments?: Array<{ id: string; amountVnd: string; method: string; status: string; refunds?: Array<{ id: string; amountVnd: string; status: string }> }>;
  events?: Array<{ id: string; eventType: string; fromStatus: string | null; toStatus: string | null; detail: string | null; actorLabel: string; createdAt: string }>;
  notes?: Array<{ id: string; body: string; createdAt: string; author?: { fullName: string } | null }>;
};
type Customer = { id: string; fullName: string; phone: string | null; email: string | null; city: string | null; need: string | null; note: string | null; source: string; groupKind: string; version: number; _count?: { inquiries: number; bookings: number }; inquiries?: Array<{ id: string; stage: string; createdAt: string; interactions?: Array<{ id: string; channel: string; body: string; occurredAt: string; author?: { fullName: string } | null }>; followUps?: Array<{ id: string; purpose: string; dueAt: string; status: string; assignee?: { fullName: string } | null }> }>; bookings?: Array<{ id: string; publicCode: string; bookingStatus: string; checkIn: string | null; checkOut: string | null; totalVnd: string }> };
type Coupon = { id: string; code: string; name: string; discountType: string; percentBps: number | null; amountVnd: string | null; maxDiscountVnd: string | null; minSubtotalVnd: string | null; usageLimit: number | null; perCustomerLimit: number | null; reservedUses: number; committedUses: number; active: boolean; version: number; startsAt: string | null; endsAt: string | null; _count?: { redemptions: number } };
type Payment = { id: string; bookingId: string; method: string; provider: string | null; externalReference: string | null; status: string; amountVnd: string; postedAt: string; note: string | null; verifiedBy?: { fullName: string } | null; booking: { id: string; publicCode: string; customer: { fullName: string; phone?: string | null } }; refunds?: Array<{ id: string; amountVnd: string; status: string }> };
type Refund = { id: string; paymentId: string; amountVnd: string; reason: string; status: string; createdAt: string; payment: { booking: { publicCode: string; customer: { fullName: string } } } };
type InventoryRow = { roomTypeId: string; stayDate: string; onSale: boolean; capacity: number | null; blockedCount: number | null; heldCount: number | null; reservedCount: number | null; stopSell: boolean; available: number | null; version: number | null };
type Dashboard = { generatedAt: string; sources: Record<string, string>; bookings: { total: number; byStatus: Record<string, number> }; newInquiries: number; customers: number; published: { stays: number; combos: number; destinations: number }; content: { draft: number; review: number; published: number }; inventoryAlerts: number; holdsExpiringWithinHour: number; payments: Record<string, number>; refunds: Record<string, number>; recordedPaymentsVnd: string };
type Report = { from: string; toExclusive: string; timezone: string; bookingSummary: { total: number; byStatus: Array<{ status: string; count: number; bookingValueVnd: string }> }; revenueSummary: { postedPaymentsVnd: string; settledRefundsVnd: string; netCashVnd: string; paymentCount: number; refundCount: number }; inquiryConversion: { total: number; won: number; conversionBps: number; byStage: Array<{ stage: string; count: number }> }; inventory: { listedRoomNights: string; capacity: string; blocked: string; held: string; reserved: string; available: string }; customerAcquisition: { total: number; bySource: Array<{ source: string; count: number }> }; contentPublication: Record<string, number>; scope: { bookingsPaymentsRefundsInventory: { propertyId: string | null; roomTypeId: string | null }; inquiryCustomerContent: string } };

const SECTION_TITLE: Record<Section, string> = {
  dashboard: 'Chỉ số chính', bookings: 'Đặt phòng', inventory: 'Quỹ phòng', customers: 'Khách hàng',
  coupons: 'Khuyến mãi', payments: 'Thanh toán & hoàn tiền', reports: 'Báo cáo vận hành',
};
const SOURCE_LABEL: Record<string, string> = { website: 'Website', phone: 'Điện thoại', zalo: 'Zalo', referral: 'Giới thiệu', facebook: 'Facebook', walk_in: 'Đến trực tiếp', partner: 'Đối tác', other: 'Khác' };
const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: 'Chờ xác nhận', confirmed: 'Đã xác nhận', checked_in: 'Đang lưu trú', completed: 'Hoàn tất',
  cancelled: 'Đã huỷ', expired: 'Hết hạn', no_show: 'Không đến', new: 'Mới', contacted: 'Đã liên hệ', quoted: 'Đã báo giá',
  won: 'Thành công', lost: 'Không tiếp tục', held: 'Đang giữ', released: 'Đã nhả', requested: 'Chờ duyệt', approved: 'Đã duyệt',
  settled: 'Đã hoàn', rejected: 'Từ chối', posted: 'Đã ghi nhận',
};
const STATUS_TONE: Record<string, string> = { confirmed: 'green', completed: 'green', posted: 'green', settled: 'green', won: 'green', pending_confirmation: 'amber', held: 'amber', requested: 'amber', new: 'blue', checked_in: 'blue', cancelled: 'rose', expired: 'rose', rejected: 'rose', inactive: 'gray' };
const money = (value: string | bigint | null | undefined) => value === null || value === undefined ? '—' : `${new Intl.NumberFormat('vi-VN').format(BigInt(value))} ₫`;
const number = (value: number | string | null | undefined) => new Intl.NumberFormat('vi-VN').format(Number(value ?? 0));
const dateLabel = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
const dateTimeLabel = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value)) : '—';
const todayInVietnam = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const shiftDay = (value: string, delta: number) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + delta); return date.toISOString().slice(0, 10); };
const statusLabel = (value: string) => STATUS_LABEL[value] ?? value;
const idempotencyKey = () => crypto.randomUUID();

export function AdminOperationsScreen({ section, bookingRouteMode, bookingId }: { section: Section; bookingRouteMode?: 'create' | 'edit'; bookingId?: string }) {
  const { user } = useAdminSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const legacyBookingCreate = section === 'bookings' && searchParams.get('action') === 'create';
  const legacyBookingId = section === 'bookings' ? searchParams.get('selected') : null;
  const bookingCreateMode = bookingRouteMode === 'create' || (legacyBookingCreate && !bookingRouteMode);
  const can = (permission: string) => user.permissions.includes(permission);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [bookingFrom, setBookingFrom] = useState('');
  const [bookingTo, setBookingTo] = useState('');
  const [bookingPropertyId, setBookingPropertyId] = useState('');
  const [page, setPage] = useState(1);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; at: string; kind: string; title: string; detail: string | null }>>([]);
  const [bookings, setBookings] = useState<Page<Booking> | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingDetailLoading, setBookingDetailLoading] = useState(false);
  const [bookingQuote, setBookingQuote] = useState<AdminQuote | null>(null);
  const [customers, setCustomers] = useState<Page<Customer> | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [coupons, setCoupons] = useState<Page<Coupon> | null>(null);
  const [couponEditId, setCouponEditId] = useState<string | null>(null);
  const [couponRedemptions, setCouponRedemptions] = useState<Array<{ id: string; status: string; savingsVnd: string; booking: { publicCode: string; bookingStatus: string; customer: { fullName: string } } }> | null>(null);
  const [payments, setPayments] = useState<Page<Payment> | null>(null);
  const [refunds, setRefunds] = useState<Page<Refund> | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomTypeId, setRoomTypeId] = useState('');
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [rangeFrom, setRangeFrom] = useState(() => `${todayInVietnam().slice(0, 7)}-01`);
  const [rangeTo, setRangeTo] = useState(todayInVietnam);
  const [reportPropertyId, setReportPropertyId] = useState('');
  const [reportRoomTypeId, setReportRoomTypeId] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [inventoryFrom, setInventoryFrom] = useState(todayInVietnam);
  const [capacity, setCapacity] = useState('');
  const [blocked, setBlocked] = useState('0');
  const [inventoryNote, setInventoryNote] = useState('');
  const inventoryIdempotency = useRef<{ fingerprint: string; key: string } | null>(null);
  const [stopSell, setStopSell] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [bookingForm, setBookingForm] = useState({ roomTypeId: '', checkIn: todayInVietnam(), checkOut: shiftDay(todayInVietnam(), 1), quantity: '1', adults: '2', children: '0', fullName: '', phone: '', email: '', couponCode: '', note: '' });
  const [note, setNote] = useState('');
  const [interaction, setInteraction] = useState('');
  const [followUp, setFollowUp] = useState({ dueDate: shiftDay(todayInVietnam(), 1), purpose: '' });
  const [couponForm, setCouponForm] = useState({ code: '', name: '', discountType: 'percent', value: '1000', minSubtotalVnd: '', maxDiscountVnd: '', usageLimit: '', perCustomerLimit: '', startsAt: '', endsAt: '' });
  const [paymentForm, setPaymentForm] = useState({ bookingId: '', amountVnd: '', method: 'bank_transfer', externalReference: '', note: '' });
  const [paymentStatus, setPaymentStatus] = useState('');
  const [refundStatus, setRefundStatus] = useState('');
  const [refundForm, setRefundForm] = useState({ paymentId: '', amountVnd: '', reason: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (section === 'dashboard') {
        const [summary, recent] = await Promise.all([
          apiRequest<Dashboard>('/admin/dashboard/summary'),
          apiRequest<{ items: typeof activity }>('/admin/dashboard/activity'),
        ]);
        setDashboard(summary); setActivity(recent.items);
      } else if (section === 'bookings') {
        const params = new URLSearchParams({ page: String(page), pageSize: '20' });
        if (search.trim()) params.set('search', search.trim());
        if (status) params.set('status', status);
        if (bookingFrom) params.set('from', bookingFrom);
        if (bookingTo) params.set('to', shiftDay(bookingTo, 1));
        if (bookingPropertyId) params.set('propertyId', bookingPropertyId);
        const [result, rooms] = await Promise.all([
          apiRequest<Page<Booking>>(`/admin/bookings?${params}`),
          apiRequest<{ items: RoomType[] }>('/admin/inventory/room-types'),
        ]);
        setBookings(result); setRoomTypes(rooms.items);
        if (!bookingForm.roomTypeId && rooms.items[0]) setBookingForm((old) => ({ ...old, roomTypeId: rooms.items[0].id }));
      } else if (section === 'inventory') {
        const result = await apiRequest<{ items: RoomType[] }>('/admin/inventory/room-types');
        setRoomTypes(result.items);
        const selected = roomTypeId || result.items[0]?.id || '';
        if (selected && selected !== roomTypeId) setRoomTypeId(selected);
        if (selected) {
          const data = await apiRequest<{ items: InventoryRow[] }>(`/admin/inventory?roomTypeId=${encodeURIComponent(selected)}&from=${inventoryFrom}&to=${shiftDay(inventoryFrom, 14)}`);
          setInventory(data.items);
          if (data.items[0]?.capacity !== null && data.items[0]?.capacity !== undefined) {
            setCapacity(String(data.items[0].capacity)); setBlocked(String(data.items[0].blockedCount ?? 0)); setStopSell(data.items[0].stopSell);
          }
        } else setInventory([]);
      } else if (section === 'customers') {
        const params = new URLSearchParams({ page: String(page), pageSize: '20' });
        if (search.trim()) params.set('search', search.trim());
        const result = await apiRequest<Page<Customer>>(`/admin/customers?${params}`);
        setCustomers(result);
        if (customer?.id) setCustomer(await apiRequest<Customer>(`/admin/customers/${customer.id}`));
      } else if (section === 'coupons') {
        const params = new URLSearchParams({ page: String(page), pageSize: '20' });
        if (search.trim()) params.set('search', search.trim());
        if (status) params.set('status', status);
        const result = await apiRequest<Page<Coupon>>(`/admin/coupons?${params}`);
        setCoupons(result);
      } else if (section === 'payments') {
        const paymentParams = new URLSearchParams({ pageSize: '50' });
        const refundParams = new URLSearchParams({ pageSize: '50' });
        if (search.trim()) { paymentParams.set('search', search.trim()); refundParams.set('search', search.trim()); }
        if (paymentStatus) paymentParams.set('status', paymentStatus);
        if (refundStatus) refundParams.set('status', refundStatus);
        const [paymentResult, refundResult, bookingResult] = await Promise.all([
          apiRequest<Page<Payment>>(`/admin/payments?${paymentParams}`),
          apiRequest<Page<Refund>>(`/admin/refunds?${refundParams}`),
          apiRequest<Page<Booking>>('/admin/bookings?pageSize=100'),
        ]);
        setPayments(paymentResult); setRefunds(refundResult); setBookings(bookingResult);
      } else if (section === 'reports') {
        const params = new URLSearchParams({ from: rangeFrom, to: rangeTo });
        if (reportPropertyId) params.set('propertyId', reportPropertyId);
        if (reportRoomTypeId) params.set('roomTypeId', reportRoomTypeId);
        if (reportStatus) params.set('status', reportStatus);
        const [summary, rooms] = await Promise.all([
          apiRequest<Report>(`/admin/reports/summary?${params}`),
          apiRequest<{ items: RoomType[] }>('/admin/inventory/room-types'),
        ]);
        setReport(summary); setRoomTypes(rooms.items);
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally { setLoading(false); }
  }, [section, page, search, status, bookingFrom, bookingTo, bookingPropertyId, roomTypeId, inventoryFrom, bookingForm.roomTypeId, customer?.id, rangeFrom, rangeTo, reportPropertyId, reportRoomTypeId, reportStatus, paymentStatus, refundStatus]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (section !== 'bookings' || bookingRouteMode) return;
    if (legacyBookingCreate) router.replace('/admin/dat-phong/them');
    else if (legacyBookingId) router.replace(`/admin/dat-phong/${encodeURIComponent(legacyBookingId)}`);
  }, [bookingRouteMode, legacyBookingCreate, legacyBookingId, router, section]);

  useEffect(() => {
    if (section !== 'bookings' || bookingRouteMode !== 'edit' || !bookingId) return;
    let current = true;
    setBookingDetailLoading(true);
    setBooking(null);
    apiRequest<Booking>(`/admin/bookings/${encodeURIComponent(bookingId)}`)
      .then((result) => { if (current) setBooking(result); })
      .catch((reason) => { if (current) setError(errorMessage(reason)); })
      .finally(() => { if (current) setBookingDetailLoading(false); });
    return () => { current = false; };
  }, [bookingId, bookingRouteMode, section]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(success); await load(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };

  const openBooking = (id: string) => router.push(`/admin/dat-phong/${encodeURIComponent(id)}`);

  const updateBookingForm = (changes: Partial<typeof bookingForm>) => {
    setBookingForm((old) => ({ ...old, ...changes }));
    setBookingQuote(null);
  };

  const createBookingQuote = async (event: FormEvent) => {
    event.preventDefault();
    if (!bookingForm.roomTypeId) { setError('Chọn hạng phòng trước.'); toast.error('Chọn hạng phòng trước khi kiểm tra giá và tồn.'); return; }
    await run(async () => {
      const quote = await apiRequest<AdminQuote>('/quotes', { method: 'POST', body: JSON.stringify({
        roomTypeId: bookingForm.roomTypeId, checkIn: bookingForm.checkIn, checkOut: bookingForm.checkOut,
        quantity: Number(bookingForm.quantity), adults: Number(bookingForm.adults), children: Number(bookingForm.children),
        ...(bookingForm.couponCode.trim() ? { couponCode: bookingForm.couponCode.trim() } : {}),
      }) });
      setBookingQuote(quote);
    }, 'Đã kiểm tra tồn và lấy giá trực tiếp từ máy chủ.');
  };

  const createBooking = async () => {
    if (!bookingQuote) return;
    await run(async () => {
      const created = await apiRequest<Booking>('/admin/bookings', { method: 'POST', headers: { 'idempotency-key': idempotencyKey() }, body: JSON.stringify({
        quoteId: bookingQuote.id, fullName: bookingForm.fullName, phone: bookingForm.phone,
        ...(bookingForm.email ? { email: bookingForm.email } : {}), ...(bookingForm.note ? { note: bookingForm.note } : {}),
      }) });
      setBooking(created); setBookingQuote(null); setShowCreate(false);
      router.replace(`/admin/dat-phong/${encodeURIComponent(created.id)}`);
    }, 'Đã tạo yêu cầu và giữ chỗ tạm thời. Đơn chưa được xác nhận hay thanh toán.');
  };

  const saveInventory = async (event: FormEvent) => {
    event.preventDefault();
    if (!roomTypeId) return;
    const to = shiftDay(inventoryFrom, 14);
    const expectedVersions: Record<string, number> = {};
    for (let offset = 0; offset < 14; offset++) {
      const day = shiftDay(inventoryFrom, offset);
      const row = inventory.find((candidate) => candidate.stayDate === day);
      if (!row) { setError(`Chưa tải phiên bản tồn ngày ${day}; tải lại lịch trước khi lưu.`); return; }
      expectedVersions[day] = row.version ?? 0;
    }
    const payload = { from: inventoryFrom, to, capacity: Number(capacity), blockedCount: Number(blocked), stopSell, expectedVersions, ...(inventoryNote.trim() ? { note: inventoryNote.trim() } : {}) };
    const fingerprint = JSON.stringify(payload);
    if (!inventoryIdempotency.current || inventoryIdempotency.current.fingerprint !== fingerprint) inventoryIdempotency.current = { fingerprint, key: crypto.randomUUID() };
    await run(async () => {
      await apiRequest(`/admin/inventory/${roomTypeId}`, { method: 'PUT', headers: { 'Idempotency-Key': inventoryIdempotency.current!.key }, body: JSON.stringify(payload) });
      inventoryIdempotency.current = null;
      setInventoryNote('');
    }, 'Đã cập nhật quỹ phòng.');
  };

  const selectCustomer = async (id: string) => {
    setCustomer(null); setError('');
    try { setCustomer(await apiRequest<Customer>(`/admin/customers/${id}`)); }
    catch (reason) { setError(errorMessage(reason)); }
  };

  const saveCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (!customer) return;
    await run(async () => {
      const updated = await apiRequest<Customer>(`/admin/customers/${customer.id}`, { method: 'PATCH', body: JSON.stringify({
        expectedVersion: customer.version, fullName: customer.fullName, phone: customer.phone, email: customer.email,
        city: customer.city, groupKind: customer.groupKind, need: customer.need, note: customer.note,
      }) });
      setCustomer(updated);
    }, 'Đã cập nhật hồ sơ khách hàng.');
  };

  const addInteraction = async (event: FormEvent) => {
    event.preventDefault(); if (!customer || !interaction.trim()) return;
    await run(async () => {
      await apiRequest(`/admin/customers/${customer.id}/interactions`, { method: 'POST', body: JSON.stringify({ channel: 'internal', body: interaction.trim() }) });
      setInteraction('');
      setCustomer(await apiRequest<Customer>(`/admin/customers/${customer.id}`));
    }, 'Đã lưu ghi chú chăm sóc.');
  };

  const addFollowUp = async (event: FormEvent) => {
    event.preventDefault(); if (!customer || !followUp.purpose.trim()) return;
    await run(async () => {
      await apiRequest(`/admin/customers/${customer.id}/follow-ups`, { method: 'POST', body: JSON.stringify({ dueAt: `${followUp.dueDate}T09:00:00+07:00`, purpose: followUp.purpose.trim() }) });
      setFollowUp((old) => ({ ...old, purpose: '' }));
      setCustomer(await apiRequest<Customer>(`/admin/customers/${customer.id}`));
    }, 'Đã tạo lịch chăm sóc.');
  };

  const couponPayload = (form: typeof couponForm, existing?: Coupon) => ({
    code: form.code.trim().toUpperCase(), name: form.name.trim(), discountType: form.discountType,
    ...(form.discountType === 'percent' ? { percentBps: Number(form.value), amountVnd: null } : { percentBps: null, amountVnd: form.value }),
    maxDiscountVnd: form.maxDiscountVnd || null, minSubtotalVnd: form.minSubtotalVnd || null,
    usageLimit: form.usageLimit ? Number(form.usageLimit) : null, perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : null,
    startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00+07:00`).toISOString() : null,
    endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59+07:00`).toISOString() : null,
    active: existing?.active ?? true,
  });

  const createCoupon = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => {
      if (couponEditId) {
        const existing = coupons?.items.find((item) => item.id === couponEditId);
        if (!existing) throw new Error('Mã khuyến mãi đã thay đổi hoặc không còn trong danh sách. Hãy tải lại.');
        await apiRequest(`/admin/coupons/${couponEditId}`, { method: 'PATCH', body: JSON.stringify({ ...couponPayload(couponForm), expectedVersion: existing.version }) });
      } else {
        await apiRequest('/admin/coupons', { method: 'POST', body: JSON.stringify(couponPayload(couponForm)) });
      }
      setCouponEditId(null);
      setCouponForm({ code: '', name: '', discountType: 'percent', value: '1000', minSubtotalVnd: '', maxDiscountVnd: '', usageLimit: '', perCustomerLimit: '', startsAt: '', endsAt: '' });
    }, couponEditId ? 'Đã cập nhật mã khuyến mãi.' : 'Đã tạo mã khuyến mãi.');
  };

  const editCoupon = (coupon: Coupon) => {
    setCouponEditId(coupon.id);
    setCouponForm({
      code: coupon.code, name: coupon.name, discountType: coupon.discountType,
      value: coupon.discountType === 'percent' ? String(coupon.percentBps ?? '') : String(coupon.amountVnd ?? ''),
      minSubtotalVnd: coupon.minSubtotalVnd ?? '', maxDiscountVnd: coupon.maxDiscountVnd ?? '',
      usageLimit: coupon.usageLimit === null ? '' : String(coupon.usageLimit),
      perCustomerLimit: coupon.perCustomerLimit === null ? '' : String(coupon.perCustomerLimit),
      startsAt: coupon.startsAt?.slice(0, 10) ?? '', endsAt: coupon.endsAt?.slice(0, 10) ?? '',
    });
    setError(''); setNotice('');
    document.querySelector('[data-admin-section="coupons"] .admin-operations__coupon-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const resetCouponForm = () => {
    setCouponEditId(null);
    setCouponForm({ code: '', name: '', discountType: 'percent', value: '1000', minSubtotalVnd: '', maxDiscountVnd: '', usageLimit: '', perCustomerLimit: '', startsAt: '', endsAt: '' });
  };

  const toggleCoupon = async (coupon: Coupon) => run(async () => {
    const currentForm = { code: coupon.code, name: coupon.name, discountType: coupon.discountType, value: coupon.discountType === 'percent' ? String(coupon.percentBps ?? '') : String(coupon.amountVnd ?? ''), minSubtotalVnd: coupon.minSubtotalVnd ?? '', maxDiscountVnd: coupon.maxDiscountVnd ?? '', usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '', perCustomerLimit: coupon.perCustomerLimit ? String(coupon.perCustomerLimit) : '', startsAt: coupon.startsAt?.slice(0, 10) ?? '', endsAt: coupon.endsAt?.slice(0, 10) ?? '' };
    await apiRequest(`/admin/coupons/${coupon.id}`, { method: 'PATCH', body: JSON.stringify({ ...couponPayload(currentForm, { ...coupon, active: !coupon.active }), expectedVersion: coupon.version, active: !coupon.active }) });
  }, coupon.active ? 'Đã tắt mã khuyến mãi.' : 'Đã bật lại mã khuyến mãi.');

  const createPayment = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => {
      await apiRequest('/admin/payments', { method: 'POST', headers: { 'idempotency-key': idempotencyKey() }, body: JSON.stringify({ ...paymentForm, amountVnd: paymentForm.amountVnd }) });
      setPaymentForm((old) => ({ ...old, amountVnd: '', externalReference: '', note: '' }));
    }, 'Đã ghi nhận khoản thanh toán offline; không có cổng nào bị gọi.');
  };

  const createRefund = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => {
      await apiRequest('/admin/refunds', { method: 'POST', headers: { 'idempotency-key': idempotencyKey() }, body: JSON.stringify(refundForm) });
      setRefundForm((old) => ({ ...old, amountVnd: '', reason: '' }));
    }, 'Đã ghi nhận yêu cầu hoàn tiền để duyệt thủ công.');
  };

  const updateRefund = async (item: Refund, next: 'approved' | 'settled' | 'rejected') => run(async () => {
    await apiRequest(`/admin/refunds/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
  }, next === 'approved' ? 'Đã duyệt yêu cầu hoàn tiền.' : next === 'rejected' ? 'Đã từ chối yêu cầu hoàn tiền.' : 'Đã ghi nhận hoàn tiền offline. Không gọi nhà cung cấp.');

  const reportCsv = () => {
    if (!report) return;
    const rows = [['Nhóm', 'Chỉ số', 'Giá trị'],
      ['Khoảng', 'Từ', report.from], ['Khoảng', 'Đến trước', report.toExclusive], ['Khoảng', 'Múi giờ', report.timezone],
      ['Booking', 'Tổng', String(report.bookingSummary.total)],
      ...report.bookingSummary.byStatus.map((row) => ['Booking', `Trạng thái ${statusLabel(row.status)} · giá trị VND`, `${row.count} · ${row.bookingValueVnd}`]),
      ['Thu tiền', 'Tiền đã ghi nhận (VND)', report.revenueSummary.postedPaymentsVnd], ['Thu tiền', 'Số giao dịch', String(report.revenueSummary.paymentCount)],
      ['Hoàn tiền', 'Đã quyết toán (VND)', report.revenueSummary.settledRefundsVnd], ['Hoàn tiền', 'Số yêu cầu quyết toán', String(report.revenueSummary.refundCount)],
      ['Đối soát', 'Thu ròng (VND)', report.revenueSummary.netCashVnd],
      ['Tư vấn', 'Tổng yêu cầu', String(report.inquiryConversion.total)], ['Tư vấn', 'Tỷ lệ thành công (bps)', String(report.inquiryConversion.conversionBps)],
      ...report.inquiryConversion.byStage.map((row) => ['Tư vấn', `Trạng thái ${statusLabel(row.stage)}`, String(row.count)]),
      ['Quỹ phòng', 'Số room-night đã mở', report.inventory.listedRoomNights], ['Quỹ phòng', 'Sức chứa', report.inventory.capacity],
      ['Quỹ phòng', 'Khoá', report.inventory.blocked], ['Quỹ phòng', 'Đang giữ', report.inventory.held], ['Quỹ phòng', 'Đã đặt', report.inventory.reserved], ['Quỹ phòng', 'Còn mở', report.inventory.available],
      ['Khách hàng', 'Tổng mới', String(report.customerAcquisition.total)],
      ...report.customerAcquisition.bySource.map((row) => ['Khách hàng', `Nguồn ${row.source}`, String(row.count)]),
      ...Object.entries(report.contentPublication).map(([state, count]) => ['Nội dung', `Trạng thái ${state}`, String(count)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a'); const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })); link.href = url; link.download = `bao-cao-${report.from}-${report.toExclusive}.csv`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const pages = (data: Page<unknown> | null) => Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)));
  const rangeLabel = useMemo(() => `${inventoryFrom} → ${shiftDay(inventoryFrom, 13)}`, [inventoryFrom]);
  const properties = useMemo(() => Array.from(new Map(roomTypes.map((room) => [room.propertyId, room.propertyName])).entries()).map(([id, name]) => ({ id, name })), [roomTypes]);

  return (
    <section className="admin-operations" data-admin-section={section}>
      <header className="admin-operations__head">
        <div><h2>{section === 'bookings' && bookingCreateMode ? 'Tạo yêu cầu đặt phòng' : section === 'bookings' && bookingId ? 'Chi tiết đặt phòng' : SECTION_TITLE[section]}</h2><p>Số liệu lấy trực tiếp từ hệ thống, bấm “Tải lại” để cập nhật.</p></div>
        {(bookingCreateMode || bookingId) && <button type="button" className="abtn abtn--ghost" onClick={() => router.push('/admin/dat-phong')}><ArrowLeft size={15} aria-hidden="true" /> Quay lại danh sách</button>}
        <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={15} aria-hidden="true" /> Tải lại</button>
      </header>
      {error && <ErrorState title="Không thực hiện được" text={error} onRetry={() => void load()} />}
      {notice && <p className="admin-operations__notice" role="status"><Check size={16} aria-hidden="true" /> {notice}</p>}
      {loading && <div className="acard admin-operations__loading" role="status">Đang tải dữ liệu…</div>}
      {!loading && section === 'dashboard' && <>
        {!dashboard ? <EmptyState title="Chưa có số liệu tổng quan." /> : <>
          <div className="kpis admin-operations__kpis">
            <StatCard icon={<ClipboardList size={20} />} tone="green" label="Đơn đặt phòng" value={number(dashboard.bookings.total)} caption="Tất cả đơn đặt phòng" href="/admin/dat-phong" />
            <StatCard icon={<Activity size={20} />} tone="mint" label="Yêu cầu mới" value={number(dashboard.newInquiries)} caption="Chưa liên hệ lại với khách" href="/admin/yeu-cau-tu-van" />
            <StatCard icon={<Users size={20} />} tone="cream" label="Khách hàng" value={number(dashboard.customers)} caption="Hồ sơ khách hàng đã lưu" href="/admin/khach-hang" />
            <StatCard icon={<BedDouble size={20} />} tone="rose" label="Cảnh báo tồn" value={number(dashboard.inventoryAlerts)} caption="Hết phòng hoặc đang dừng bán" href="/admin/ton-phong" />
            <StatCard icon={<CalendarClock size={20} />} tone="sky" label="Giữ chỗ sắp hết hạn" value={number(dashboard.holdsExpiringWithinHour)} caption="Trong 60 phút tới" href="/admin/dat-phong" />
            <StatCard icon={<CircleDollarSign size={20} />} tone="green" label="Đã ghi nhận" value={money(dashboard.recordedPaymentsVnd)} caption="Tổng tiền khách đã thanh toán" href="/admin/thanh-toan" />
          </div>
          <div className="admin-operations__grid">
            <Panel icon={<ClipboardList size={18} />} title="Đặt phòng theo trạng thái">
              <div className="admin-operations__status-list">{Object.entries(dashboard.bookings.byStatus).length ? Object.entries(dashboard.bookings.byStatus).map(([key, value]) => <div key={key}><StatusBadge label={statusLabel(key)} tone={STATUS_TONE[key] ?? 'gray'} /><strong>{number(value)}</strong></div>) : <EmptyState title="Chưa có booking." text="Khi có đơn thật, số lượng sẽ xuất hiện tại đây." />}</div>
            </Panel>
            <Panel icon={<BedDouble size={18} />} title="Nội dung công khai">
              <div className="admin-operations__status-list"><div><span>Nơi lưu trú</span><strong>{number(dashboard.published.stays)}</strong></div><div><span>Combo</span><strong>{number(dashboard.published.combos)}</strong></div><div><span>Điểm đến</span><strong>{number(dashboard.published.destinations)}</strong></div><div><span>Bài/trang đã xuất bản</span><strong>{number(dashboard.content.published)}</strong></div></div>
            </Panel>
            <Panel icon={<Activity size={18} />} title="Hoạt động gần đây" className="admin-operations__activity">
              {activity.length ? <ol className="admin-operations__timeline">{activity.map((item) => <li key={`${item.kind}-${item.id}`}><time>{dateLabel(item.at)}</time><strong>{item.title}</strong>{item.detail && <small>{item.detail}</small>}</li>)}</ol> : <EmptyState title="Chưa có hoạt động." text="Sự kiện thật sẽ hiển thị ở đây." />}
            </Panel>
          </div>
          <p className="admin-operations__source">Cập nhật lúc {dateLabel(dashboard.generatedAt)}.</p>
        </>}
      </>}

      {!loading && section === 'bookings' && <>
        {!bookingId && <Panel icon={<ClipboardList size={18} />} title={bookingCreateMode || showCreate ? 'Tạo yêu cầu đặt phòng' : 'Danh sách yêu cầu đặt phòng'} action={can('booking.write') && !bookingCreateMode ? <Link href="/admin/dat-phong/them" className="abtn abtn--primary abtn--sm"><Plus size={15} /> Tạo yêu cầu</Link> : undefined}>
          {(bookingCreateMode || showCreate) && can('booking.write') && <form className="admin-operations__form" onSubmit={createBookingQuote}>
            <label className="afield"><span>Hạng phòng</span><select className="ainput" required value={bookingForm.roomTypeId} onChange={(e) => updateBookingForm({ roomTypeId: e.target.value })}><option value="">Chọn hạng phòng…</option>{roomTypes.map((room) => <option key={room.id} value={room.id}>{room.propertyName} · {room.name}</option>)}</select></label>
            <label className="afield"><span>Nhận phòng</span><input className="ainput" required type="date" value={bookingForm.checkIn} onChange={(e) => updateBookingForm({ checkIn: e.target.value })} /></label>
            <label className="afield"><span>Trả phòng</span><input className="ainput" required type="date" min={shiftDay(bookingForm.checkIn, 1)} value={bookingForm.checkOut} onChange={(e) => updateBookingForm({ checkOut: e.target.value })} /></label>
            <label className="afield"><span>Số phòng</span><input className="ainput" type="number" min="1" max="20" required value={bookingForm.quantity} onChange={(e) => updateBookingForm({ quantity: e.target.value })} /></label>
            <label className="afield"><span>Người lớn</span><input className="ainput" type="number" min="1" max="30" required value={bookingForm.adults} onChange={(e) => updateBookingForm({ adults: e.target.value })} /></label>
            <label className="afield"><span>Trẻ em</span><input className="ainput" type="number" min="0" max="30" required value={bookingForm.children} onChange={(e) => updateBookingForm({ children: e.target.value })} /></label>
            <label className="afield"><span>Tên khách</span><input className="ainput" required minLength={2} value={bookingForm.fullName} onChange={(e) => updateBookingForm({ fullName: e.target.value })} /></label>
            <label className="afield"><span>Điện thoại</span><input className="ainput" required minLength={8} value={bookingForm.phone} onChange={(e) => updateBookingForm({ phone: e.target.value })} /></label>
            <label className="afield"><span>Email (không bắt buộc)</span><input className="ainput" type="email" value={bookingForm.email} onChange={(e) => updateBookingForm({ email: e.target.value })} /></label>
            <label className="afield"><span>Mã giảm giá</span><input className="ainput" value={bookingForm.couponCode} onChange={(e) => updateBookingForm({ couponCode: e.target.value })} /></label>
            <label className="afield admin-operations__span"><span>Ghi chú</span><input className="ainput" value={bookingForm.note} onChange={(e) => updateBookingForm({ note: e.target.value })} /></label>
            {bookingQuote && <div className="admin-operations__span admin-operations__quote"><div><span>Báo giá máy chủ</span><strong>{bookingQuote.snapshot.propertyName} · {bookingQuote.snapshot.roomName}</strong></div><div><span>Tạm tính</span><strong>{money(bookingQuote.subtotalVnd)}</strong></div><div><span>Giảm giá</span><strong>−{money(bookingQuote.discountVnd)}</strong></div><div><span>Tổng tiền</span><strong>{money(bookingQuote.totalVnd)}</strong></div><div><span>Cần thanh toán ban đầu</span><strong>{money(bookingQuote.dueNowVnd)}</strong></div><small>Báo giá giữ trong thời gian ngắn đến {dateTimeLabel(bookingQuote.expiresAt)}. Chỉ giữ chỗ sau khi bạn bấm xác nhận.</small></div>}
            <div className="admin-operations__span admin-operations__form-actions"><button type="button" className="abtn abtn--ghost" onClick={() => { setShowCreate(false); setBookingQuote(null); router.push('/admin/dat-phong'); }}>Quay lại danh sách</button><button type="submit" className="abtn abtn--ghost" disabled={busy || !roomTypes.length}>Kiểm tra giá & tồn</button>{bookingQuote && <button type="button" className="abtn abtn--primary" disabled={busy} onClick={() => void createBooking()}>Xác nhận tạo yêu cầu & giữ chỗ</button>}<small>Đơn tạo ra ở trạng thái chờ xác nhận; chưa phải thanh toán.</small></div>
          </form>}
          {!bookingCreateMode && !showCreate && <>
          <div className="admin-operations__filters"><label className="admin-operations__search"><Search size={16} /><input aria-label="Tìm booking" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Mã đơn, tên khách, số điện thoại" /></label><select className="ainput" aria-label="Lọc trạng thái" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}><option value="">Tất cả trạng thái</option>{['pending_confirmation', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'no_show'].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select><select className="ainput" aria-label="Lọc cơ sở lưu trú" value={bookingPropertyId} onChange={(e) => { setPage(1); setBookingPropertyId(e.target.value); }}><option value="">Tất cả nơi lưu trú</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select><label className="afield"><span>Nhận phòng từ</span><input className="ainput" type="date" value={bookingFrom} onChange={(e) => { setPage(1); setBookingFrom(e.target.value); }} /></label><label className="afield"><span>Đến ngày</span><input className="ainput" type="date" min={bookingFrom || undefined} value={bookingTo} onChange={(e) => { setPage(1); setBookingTo(e.target.value); }} /></label></div>
          {bookings?.items.length ? <div className="admin-operations__table-wrap"><table className="atable"><thead><tr><th>Mã đơn / khách</th><th>Ngày nghỉ</th><th>Trạng thái</th><th>Tổng tiền</th><th>Ngày tạo</th><th></th></tr></thead><tbody>{bookings.items.map((item) => <tr key={item.id}><td><button type="button" className="admin-operations__row-link" onClick={() => void openBooking(item.id)}>{item.publicCode}</button><small>{item.customer?.fullName} · {item.customer?.phone ?? 'Chưa có SĐT'}</small></td><td>{dateLabel(item.checkIn)} – {dateLabel(item.checkOut)}</td><td><StatusBadge label={statusLabel(item.bookingStatus)} tone={STATUS_TONE[item.bookingStatus] ?? 'gray'} /></td><td>{money(item.totalVnd)}</td><td>{dateLabel(item.createdAt)}</td><td><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void openBooking(item.id)}>Chi tiết</button></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có yêu cầu đặt phòng." text="Các yêu cầu thật từ website hoặc quản trị sẽ hiển thị tại đây." />}
          {bookings && <AdminPagination page={bookings.page} pages={pages(bookings)} onChange={setPage} />}
          </>}
        </Panel>}
        {bookingId && !booking && <div className="acard apending">{bookingDetailLoading ? 'Đang tải đặt phòng…' : 'Không tìm thấy đặt phòng.'}</div>}
        {booking && (bookingId || !bookingCreateMode) && <Panel icon={<ClipboardList size={18} />} title={`Chi tiết ${booking.publicCode}`} action={<button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => router.push('/admin/dat-phong')}><ArrowLeft size={14} /> Danh sách</button>}>
          <div className="admin-operations__detail-grid"><div><span>Khách</span><strong>{booking.customer?.fullName} · {booking.customer?.phone}</strong></div><div><span>Thời gian</span><strong>{dateLabel(booking.checkIn)} – {dateLabel(booking.checkOut)} · {booking.adults} người lớn / {booking.children} trẻ em</strong></div><div><span>Trạng thái</span><strong>{statusLabel(booking.bookingStatus)}</strong></div><div><span>Tổng / cần cọc</span><strong>{money(booking.totalVnd)} / {money(booking.dueNowVnd)}</strong></div><div><span>Giữ chỗ đến</span><strong>{dateLabel(booking.expiresAt)}</strong></div></div>
          <h3>Dòng dịch vụ</h3><ul className="admin-operations__plain-list">{booking.lines?.map((line) => <li key={line.id}>{line.label} · {line.quantity} · {money(line.netVnd)}</li>)}</ul>
          <h3>Thanh toán</h3><ul className="admin-operations__plain-list">{booking.payments?.length ? booking.payments.map((item) => <li key={item.id}>{money(item.amountVnd)} · {item.method} · {statusLabel(item.status)}</li>) : <li>Chưa có thanh toán được ghi nhận.</li>}</ul>
          <h3>Ghi chú nội bộ</h3><ul className="admin-operations__plain-list">{booking.notes?.length ? booking.notes.map((item) => <li key={item.id}>{dateTimeLabel(item.createdAt)} · {item.author?.fullName ?? 'Quản trị viên'} · {item.body}</li>) : <li>Chưa có ghi chú.</li>}</ul>
          <h3>Lịch sử</h3><ol className="admin-operations__timeline">{booking.events?.map((item) => <li key={item.id}><time>{dateLabel(item.createdAt)}</time><strong>{item.actorLabel} · {item.eventType}</strong>{item.detail && <small>{item.detail}</small>}</li>)}</ol>
          {can('booking.write') && <form className="admin-operations__inline-form" onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; void run(async () => { await apiRequest(`/admin/bookings/${booking.id}/notes`, { method: 'POST', body: JSON.stringify({ body: note.trim() }) }); setNote(''); setBooking(await apiRequest<Booking>(`/admin/bookings/${booking.id}`)); }, 'Đã thêm ghi chú nội bộ.'); }}><input className="ainput" aria-label="Ghi chú booking" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú nội bộ…" /><button className="abtn abtn--ghost" type="submit" disabled={busy}>Thêm ghi chú</button></form>}
          <div className="admin-operations__actions">{can('booking.write') && booking.bookingStatus === 'pending_confirmation' && <button type="button" className="abtn abtn--primary" disabled={busy} onClick={() => void run(async () => { await apiRequest(`/admin/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'confirmed', expectedVersion: booking.version }) }); setBooking(await apiRequest<Booking>(`/admin/bookings/${booking.id}`)); }, 'Đơn đã xác nhận; tồn được chuyển từ giữ sang đã đặt.')}>Xác nhận đơn</button>}{can('booking.write') && booking.bookingStatus === 'confirmed' && <><button type="button" className="abtn abtn--primary" disabled={busy} onClick={() => void run(async () => { await apiRequest(`/admin/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'checked_in', expectedVersion: booking.version }) }); setBooking(await apiRequest<Booking>(`/admin/bookings/${booking.id}`)); }, 'Đã ghi nhận khách nhận phòng.')}>Nhận phòng</button>{booking.checkIn && booking.checkIn.slice(0, 10) <= todayInVietnam() && <button type="button" className="abtn abtn--ghost" disabled={busy} onClick={() => { if (window.confirm('Xác nhận khách không đến?')) void run(async () => { await apiRequest(`/admin/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'no_show', expectedVersion: booking.version, reason: 'Khách không đến nhận phòng.' }) }); setBooking(await apiRequest<Booking>(`/admin/bookings/${booking.id}`)); }, 'Đã ghi nhận khách không đến.'); }}>Không đến</button>}</>}{can('booking.write') && booking.bookingStatus === 'checked_in' && booking.checkOut && booking.checkOut.slice(0, 10) <= todayInVietnam() && <button type="button" className="abtn abtn--primary" disabled={busy} onClick={() => void run(async () => { await apiRequest(`/admin/bookings/${booking.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'completed', expectedVersion: booking.version }) }); setBooking(await apiRequest<Booking>(`/admin/bookings/${booking.id}`)); }, 'Đã hoàn tất kỳ lưu trú.')}>Hoàn tất</button>}{can('booking.cancel') && ['pending_confirmation', 'confirmed'].includes(booking.bookingStatus) && <button type="button" className="abtn abtn--danger" disabled={busy} onClick={() => { const reason = window.prompt('Lý do huỷ đơn?'); if (reason?.trim()) void run(async () => { await apiRequest(`/admin/bookings/${booking.id}/cancel`, { method: 'POST', body: JSON.stringify({ status: 'cancelled', expectedVersion: booking.version, reason }) }); setBooking(await apiRequest<Booking>(`/admin/bookings/${booking.id}`)); }, 'Đơn đã huỷ và quỹ phòng được giải phóng.'); }}>Huỷ đơn</button>}</div>
        </Panel>}
      </>}

      {!loading && section === 'inventory' && <Panel icon={<BedDouble size={18} />} title="Lịch tồn theo đêm" headExtra={<span className="ahint">{rangeLabel}</span>} action={can('catalog.read') ? <Link className="abtn abtn--ghost abtn--sm" href="/admin/hang-phong"><BedDouble size={15} aria-hidden="true" /> Quản lý hạng phòng</Link> : undefined}>
        <div className="admin-operations__filters"><label className="afield"><span>Hạng phòng</span><select className="ainput" value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}><option value="">Chọn hạng phòng…</option>{roomTypes.map((room) => <option key={room.id} value={room.id}>{room.propertyName} · {room.name}</option>)}</select></label><label className="afield"><span>Bắt đầu</span><input className="ainput" type="date" value={inventoryFrom} onChange={(e) => setInventoryFrom(e.target.value)} /></label></div>
        {!roomTypes.length ? <EmptyState title="Chưa có hạng phòng đang vận hành." text="Hạng phòng tạm ẩn hoặc chưa có đơn vị phòng sẽ không xuất hiện trong quỹ phòng. Xác minh thông tin trước khi kích hoạt." action={can('catalog.read') ? <Link className="abtn abtn--primary" href="/admin/hang-phong">Xem và bổ sung hạng phòng</Link> : undefined} /> : <>
          {can('inventory.write') ? <form className="admin-operations__form admin-operations__inventory-form" onSubmit={saveInventory}><label className="afield"><span>Sức chứa mỗi đêm</span><input className="ainput" required type="number" min="0" max="5000" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></label><label className="afield"><span>Khoá mỗi đêm</span><input className="ainput" required type="number" min="0" max="5000" value={blocked} onChange={(e) => setBlocked(e.target.value)} /></label><label className="atoggle"><span className="atoggle__text"><strong>Dừng bán</strong><small>Áp dụng cho toàn khoảng 14 đêm.</small></span><input type="checkbox" checked={stopSell} onChange={(e) => setStopSell(e.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span></label><label className="afield"><span>Lý do khoá phòng (nếu có)</span><input className="ainput" maxLength={500} value={inventoryNote} onChange={(e) => setInventoryNote(e.target.value)} /></label><button className="abtn abtn--primary" type="submit" disabled={busy || !roomTypeId}>Cập nhật khoảng ngày</button></form> : <p className="admin-operations__source">Tài khoản hiện tại chỉ có quyền xem tồn phòng.</p>}
          <div className="admin-operations__table-wrap"><table className="atable"><thead><tr><th>Đêm</th><th>Sức chứa</th><th>Khoá</th><th>Đang giữ</th><th>Đã đặt</th><th>Còn</th><th>Trạng thái</th></tr></thead><tbody>{inventory.map((row) => <tr key={row.stayDate}><td>{dateLabel(row.stayDate)}</td><td>{row.capacity ?? '—'}</td><td>{row.blockedCount ?? '—'}</td><td>{row.heldCount ?? '—'}</td><td>{row.reservedCount ?? '—'}</td><td>{row.available ?? '—'}</td><td>{row.onSale ? row.stopSell ? <StatusBadge label="Dừng bán" tone="rose" /> : <StatusBadge label="Đang mở" tone="green" /> : <StatusBadge label="Chưa mở tồn" tone="gray" />}</td></tr>)}</tbody></table></div>
          <p className="admin-operations__source">Còn phòng = sức chứa − khoá − đang giữ − đã đặt. Ngày chưa có dòng tồn được coi là chưa mở bán, không phải tồn bằng 0.</p>
        </>}
      </Panel>}

      {!loading && section === 'customers' && <>
        <Panel icon={<Users size={18} />} title="Danh sách khách hàng">
          <div className="admin-operations__filters"><label className="admin-operations__search"><Search size={16} /><input aria-label="Tìm khách hàng" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Tên, điện thoại, email, nguồn" /></label></div>
          {customers?.items.length ? <div className="admin-operations__table-wrap"><table className="atable"><thead><tr><th>Khách hàng</th><th>Nguồn</th><th>Yêu cầu</th><th>Đặt phòng</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{customers.items.map((item) => <tr key={item.id}><td><strong>{item.fullName}</strong><small>{item.phone} · {item.email ?? 'Chưa có email'}</small></td><td>{SOURCE_LABEL[item.source] ?? item.source}</td><td>{item._count?.inquiries ?? 0}</td><td>{item._count?.bookings ?? 0}</td><td><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void selectCustomer(item.id)}>Hồ sơ</button></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có hồ sơ khách hàng." text="Hồ sơ khách được tạo khi có yêu cầu tư vấn hoặc đặt phòng." />}
          {customers && <AdminPagination page={customers.page} pages={pages(customers)} onChange={setPage} />}
        </Panel>
        {customer && <Panel icon={<Users size={18} />} title={customer.fullName} action={<button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setCustomer(null)}>Đóng hồ sơ</button>}>
          {can('crm.write') ? <form className="admin-operations__form" onSubmit={saveCustomer}><label className="afield"><span>Họ tên</span><input className="ainput" required value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} /></label><label className="afield"><span>Điện thoại</span><input className="ainput" value={customer.phone ?? ''} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></label><label className="afield"><span>Email</span><input className="ainput" type="email" value={customer.email ?? ''} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></label><label className="afield"><span>Khu vực</span><input className="ainput" value={customer.city ?? ''} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></label><label className="afield"><span>Phân loại</span><input className="ainput" value={customer.groupKind} onChange={(e) => setCustomer({ ...customer, groupKind: e.target.value })} /></label><label className="afield"><span>Nhu cầu</span><input className="ainput" value={customer.need ?? ''} onChange={(e) => setCustomer({ ...customer, need: e.target.value })} /></label><label className="afield admin-operations__span"><span>Ghi chú</span><textarea className="ainput" rows={3} value={customer.note ?? ''} onChange={(e) => setCustomer({ ...customer, note: e.target.value })} /></label><div className="admin-operations__span"><button type="submit" className="abtn abtn--primary" disabled={busy}>Lưu hồ sơ</button></div></form> : <p className="admin-operations__source">Tài khoản hiện tại chỉ có quyền xem hồ sơ.</p>}
          {can('crm.write') && <div className="admin-operations__crm-grid"><form className="admin-operations__inline-form" onSubmit={addInteraction}><input className="ainput" value={interaction} onChange={(e) => setInteraction(e.target.value)} placeholder="Ghi nhận cuộc gọi / trao đổi…" /><button className="abtn abtn--ghost" disabled={busy}>Lưu trao đổi</button></form><form className="admin-operations__inline-form" onSubmit={addFollowUp}><input className="ainput" type="date" required value={followUp.dueDate} onChange={(e) => setFollowUp({ ...followUp, dueDate: e.target.value })} /><input className="ainput" value={followUp.purpose} onChange={(e) => setFollowUp({ ...followUp, purpose: e.target.value })} placeholder="Mục đích nhắc việc" /><button className="abtn abtn--ghost" disabled={busy}>Tạo nhắc việc</button></form></div>}
          <h3>Trao đổi</h3><ul className="admin-operations__plain-list">{customer.inquiries?.flatMap((inquiry) => inquiry.interactions ?? []).length ? customer.inquiries?.flatMap((inquiry) => inquiry.interactions ?? []).map((item) => <li key={item.id}>{dateLabel(item.occurredAt)} · {item.channel} · {item.body}</li>) : <li>Chưa ghi nhận trao đổi.</li>}</ul>
          <h3>Lịch sử đặt phòng</h3><ul className="admin-operations__plain-list">{customer.bookings?.length ? customer.bookings.map((item) => <li key={item.id}>{item.publicCode} · {statusLabel(item.bookingStatus)} · {dateLabel(item.checkIn)} – {dateLabel(item.checkOut)} · {money(item.totalVnd)}</li>) : <li>Khách chưa có booking.</li>}</ul>
          <h3>Lịch chăm sóc</h3><ul className="admin-operations__plain-list">{customer.inquiries?.flatMap((inquiry) => inquiry.followUps ?? []).length ? customer.inquiries?.flatMap((inquiry) => inquiry.followUps ?? []).map((item) => <li key={item.id}>{dateLabel(item.dueAt)} · {item.purpose} · {statusLabel(item.status)} {can('crm.write') && item.status === 'open' && <button type="button" className="alink" onClick={() => void run(async () => { await apiRequest(`/admin/follow-ups/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }); setCustomer(await apiRequest<Customer>(`/admin/customers/${customer.id}`)); }, 'Đã hoàn thành nhắc việc.')}>Hoàn tất</button>}</li>) : <li>Chưa có lịch chăm sóc.</li>}</ul>
        </Panel>}
      </>}

      {!loading && section === 'coupons' && <>
        <Panel icon={<Tag size={18} />} title={couponEditId ? 'Chỉnh sửa mã khuyến mãi' : 'Tạo mã khuyến mãi'} className="admin-operations__coupon-form">
          {can('coupon.write') ? <form className="admin-operations__form" onSubmit={createCoupon}><label className="afield"><span>Mã</span><input className="ainput" required value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} /></label><label className="afield"><span>Tên hiển thị</span><input className="ainput" required value={couponForm.name} onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })} /></label><label className="afield"><span>Loại giảm</span><select className="ainput" value={couponForm.discountType} onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}><option value="percent">Phần trăm</option><option value="fixed">Số tiền (VND)</option></select></label><label className="afield"><span>{couponForm.discountType === 'percent' ? 'Mức giảm (%)' : 'Mức giảm VND'}</span><input className="ainput" required type="number" min="1" max={couponForm.discountType === 'percent' ? '100' : undefined} step={couponForm.discountType === 'percent' ? '0.01' : '1'} value={couponForm.discountType === 'percent' ? String(Number(couponForm.value) / 100) : couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: couponForm.discountType === 'percent' ? String(Math.round(Number(e.target.value) * 100)) : e.target.value })} /></label><label className="afield"><span>Đơn tối thiểu (VND)</span><input className="ainput" type="number" min="0" value={couponForm.minSubtotalVnd} onChange={(e) => setCouponForm({ ...couponForm, minSubtotalVnd: e.target.value })} /></label><label className="afield"><span>Giảm tối đa (VND)</span><input className="ainput" type="number" min="0" value={couponForm.maxDiscountVnd} onChange={(e) => setCouponForm({ ...couponForm, maxDiscountVnd: e.target.value })} /></label><label className="afield"><span>Tổng lượt</span><input className="ainput" type="number" min="1" value={couponForm.usageLimit} onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })} /></label><label className="afield"><span>Lượt mỗi khách</span><input className="ainput" type="number" min="1" value={couponForm.perCustomerLimit} onChange={(e) => setCouponForm({ ...couponForm, perCustomerLimit: e.target.value })} /></label><label className="afield"><span>Bắt đầu</span><input className="ainput" type="date" value={couponForm.startsAt} onChange={(e) => setCouponForm({ ...couponForm, startsAt: e.target.value })} /></label><label className="afield"><span>Kết thúc</span><input className="ainput" type="date" value={couponForm.endsAt} onChange={(e) => setCouponForm({ ...couponForm, endsAt: e.target.value })} /></label><div className="admin-operations__span admin-operations__form-actions"><button className="abtn abtn--primary" disabled={busy}>{couponEditId ? 'Lưu thay đổi' : 'Tạo mã'}</button>{couponEditId && <button type="button" className="abtn abtn--ghost" onClick={resetCouponForm}>Huỷ sửa</button>}<small className="ahint">Theo schema hiện tại, mã áp dụng chung; chưa có trường scope sản phẩm hoặc mô tả.</small></div></form> : <p className="admin-operations__source">Tài khoản hiện tại chỉ có quyền xem mã khuyến mãi.</p>}
        </Panel>
        <Panel icon={<Tag size={18} />} title="Mã và lịch sử sử dụng">
          <div className="admin-operations__filters"><label className="admin-operations__search"><Search size={16} /><input aria-label="Tìm mã khuyến mãi" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Mã hoặc tên" /></label><select className="ainput" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc mã"><option value="">Tất cả</option><option value="active">Đang bật</option><option value="inactive">Đã tắt</option></select></div>
          {coupons?.items.length ? <div className="admin-operations__table-wrap"><table className="atable"><thead><tr><th>Mã</th><th>Giảm</th><th>Lượt giữ / dùng</th><th>Hiệu lực</th><th>Trạng thái</th><th>Tác vụ</th></tr></thead><tbody>{coupons.items.map((item) => <tr key={item.id}><td><strong>{item.code}</strong><small>{item.name}</small></td><td>{item.discountType === 'percent' ? `${((item.percentBps ?? 0) / 100).toLocaleString('vi-VN')}%` : money(item.amountVnd)}</td><td>{item.reservedUses} / {item.committedUses} · {item._count?.redemptions ?? 0} bản ghi</td><td>{dateLabel(item.startsAt)} – {dateLabel(item.endsAt)}</td><td><StatusBadge label={item.active ? 'Đang bật' : 'Đã tắt'} tone={item.active ? 'green' : 'gray'} /></td><td>{can('coupon.write') && <><button className="abtn abtn--ghost abtn--sm" type="button" onClick={() => editCoupon(item)} disabled={busy}>Sửa</button> <button className="abtn abtn--ghost abtn--sm" type="button" onClick={() => void toggleCoupon(item)} disabled={busy}>{item.active ? 'Tắt mã' : 'Bật lại'}</button> </>}<button className="alink" type="button" onClick={() => void run(async () => { const result = await apiRequest<{ items: NonNullable<typeof couponRedemptions> }>(`/admin/coupons/${item.id}/redemptions`); setCouponRedemptions(result.items); }, `Đã tải ${item.code}.`)}>Lịch sử</button></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có mã khuyến mãi." text="Tạo mã đầu tiên ở biểu mẫu phía trên." />}
          {couponRedemptions && <ul className="admin-operations__plain-list">{couponRedemptions.length ? couponRedemptions.map((item) => <li key={item.id}>{item.booking.publicCode} · {item.booking.customer.fullName} · {statusLabel(item.status)} · giảm {money(item.savingsVnd)}</li>) : <li>Chưa có lượt sử dụng.</li>}</ul>}
          {coupons && <AdminPagination page={coupons.page} pages={pages(coupons)} onChange={setPage} />}
        </Panel>
      </>}

      {!loading && section === 'payments' && <>
        <div className="admin-operations__filters"><label className="admin-operations__search"><Search size={16} /><input aria-label="Tìm giao dịch" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Mã đơn, khách, mã tham chiếu hoặc lý do hoàn" /></label><select className="ainput" aria-label="Trạng thái thanh toán" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}><option value="">Mọi thanh toán</option><option value="posted">Đã ghi nhận</option><option value="pending">Đang chờ</option><option value="failed">Thất bại</option><option value="voided">Đã huỷ</option></select><select className="ainput" aria-label="Trạng thái hoàn tiền" value={refundStatus} onChange={(e) => setRefundStatus(e.target.value)}><option value="">Mọi yêu cầu hoàn</option><option value="requested">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="settled">Đã quyết toán</option><option value="rejected">Từ chối</option></select></div>
        <div className="admin-operations__grid admin-operations__finance-grid">
          {can('finance.write') && <Panel icon={<CreditCard size={18} />} title="Ghi nhận thanh toán offline"><form className="admin-operations__form" onSubmit={createPayment}><label className="afield admin-operations__span"><span>Booking</span><select className="ainput" required value={paymentForm.bookingId} onChange={(e) => setPaymentForm({ ...paymentForm, bookingId: e.target.value })}><option value="">Chọn booking…</option>{bookings?.items.filter((item) => !['cancelled', 'expired'].includes(item.bookingStatus)).map((item) => <option key={item.id} value={item.id}>{item.publicCode} · {item.customer?.fullName} · {money(item.totalVnd)}</option>)}</select></label><label className="afield"><span>Số tiền VND</span><input className="ainput" required type="number" min="1" value={paymentForm.amountVnd} onChange={(e) => setPaymentForm({ ...paymentForm, amountVnd: e.target.value })} /></label><label className="afield"><span>Phương thức</span><select className="ainput" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}><option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option><option value="offline_pos">POS offline</option><option value="other">Khác</option></select></label><label className="afield"><span>Mã tham chiếu</span><input className="ainput" value={paymentForm.externalReference} onChange={(e) => setPaymentForm({ ...paymentForm, externalReference: e.target.value })} /></label><label className="afield"><span>Ghi chú</span><input className="ainput" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} /></label><div className="admin-operations__span"><button className="abtn abtn--primary" disabled={busy || !paymentForm.bookingId}>Ghi nhận</button></div></form><p className="admin-operations__safe-note"><AlertTriangle size={15} /> Chỉ ghi sổ offline. Không có API charge, webhook hay nhà cung cấp thanh toán thật.</p></Panel>}
          {can('finance.write') && <Panel icon={<CircleDollarSign size={18} />} title="Tạo yêu cầu hoàn"><form className="admin-operations__form" onSubmit={createRefund}><label className="afield admin-operations__span"><span>Khoản thanh toán</span><select className="ainput" required value={refundForm.paymentId} onChange={(e) => setRefundForm({ ...refundForm, paymentId: e.target.value })}><option value="">Chọn giao dịch…</option>{payments?.items.filter((item) => item.status === 'posted').map((item) => <option key={item.id} value={item.id}>{item.booking.publicCode} · {money(item.amountVnd)} · {item.booking.customer.fullName}</option>)}</select></label><label className="afield"><span>Số tiền VND</span><input className="ainput" required type="number" min="1" value={refundForm.amountVnd} onChange={(e) => setRefundForm({ ...refundForm, amountVnd: e.target.value })} /></label><label className="afield"><span>Lý do</span><input className="ainput" required minLength={3} value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} /></label><div className="admin-operations__span"><button className="abtn abtn--ghost" disabled={busy || !refundForm.paymentId}>Tạo yêu cầu</button></div></form><p className="admin-operations__safe-note"><AlertTriangle size={15} /> Hoàn tiền phải được duyệt và ghi nhận riêng; hệ thống không gọi ngân hàng/cổng thanh toán.</p></Panel>}
        </div>
        <Panel icon={<CreditCard size={18} />} title="Sổ thanh toán"><div className="admin-operations__table-wrap">{payments?.items.length ? <table className="atable"><thead><tr><th>Booking / khách</th><th>Tiền</th><th>Phương thức</th><th>Tham chiếu</th><th>Trạng thái</th><th>Người xác nhận</th><th>Ngày</th></tr></thead><tbody>{payments.items.map((item) => <tr key={item.id}><td>{item.booking.publicCode}<small>{item.booking.customer.fullName}</small></td><td>{money(item.amountVnd)}</td><td>{item.method}</td><td>{item.externalReference ?? '—'}</td><td><StatusBadge label={statusLabel(item.status)} tone={STATUS_TONE[item.status] ?? 'gray'} /></td><td>{item.verifiedBy?.fullName ?? '—'}</td><td>{dateLabel(item.postedAt)}</td></tr>)}</tbody></table> : <EmptyState title="Chưa có khoản thanh toán." text="Ghi nhận offline ở biểu mẫu phía trên." />}</div></Panel>
        <Panel icon={<CircleDollarSign size={18} />} title="Sổ hoàn tiền"><div className="admin-operations__table-wrap">{refunds?.items.length ? <table className="atable"><thead><tr><th>Booking / khách</th><th>Số tiền</th><th>Lý do</th><th>Trạng thái</th><th>Tác vụ</th></tr></thead><tbody>{refunds.items.map((item) => <tr key={item.id}><td>{item.payment.booking.publicCode}<small>{item.payment.booking.customer.fullName}</small></td><td>{money(item.amountVnd)}</td><td>{item.reason}</td><td><StatusBadge label={statusLabel(item.status)} tone={STATUS_TONE[item.status] ?? 'gray'} /></td><td>{can('refund.approve') && item.status === 'requested' && <><button className="abtn abtn--ghost abtn--sm" type="button" disabled={busy} onClick={() => void updateRefund(item, 'approved')}>Duyệt</button> <button className="abtn abtn--danger abtn--sm" type="button" disabled={busy} onClick={() => { if (window.confirm('Từ chối yêu cầu hoàn tiền này?')) void updateRefund(item, 'rejected'); }}>Từ chối</button></>}{can('refund.approve') && item.status === 'approved' && <button className="abtn abtn--primary abtn--sm" type="button" disabled={busy} onClick={() => void updateRefund(item, 'settled')}>Đã hoàn offline</button>}</td></tr>)}</tbody></table> : <EmptyState title="Chưa có yêu cầu hoàn tiền." />}</div></Panel>
      </>}

      {!loading && section === 'reports' && <>
        <Panel icon={<FileBarChart2 size={18} />} title="Báo cáo vận hành" action={<button type="button" className="abtn abtn--ghost abtn--sm" onClick={reportCsv} disabled={!report}><ArrowDownToLine size={14} /> Tải CSV</button>}>
          <form className="admin-operations__filters" onSubmit={(event) => { event.preventDefault(); void load(); }}><label className="afield"><span>Từ ngày</span><input className="ainput" type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /></label><label className="afield"><span>Đến ngày</span><input className="ainput" type="date" min={rangeFrom} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} /></label><label className="afield"><span>Nơi lưu trú</span><select className="ainput" value={reportPropertyId} onChange={(e) => { const value = e.target.value; setReportPropertyId(value); if (reportRoomTypeId && !roomTypes.some((room) => room.id === reportRoomTypeId && (!value || room.propertyId === value))) setReportRoomTypeId(''); }}><option value="">Tất cả nơi lưu trú</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><label className="afield"><span>Hạng phòng</span><select className="ainput" value={reportRoomTypeId} onChange={(e) => setReportRoomTypeId(e.target.value)}><option value="">Tất cả hạng phòng</option>{roomTypes.filter((room) => !reportPropertyId || room.propertyId === reportPropertyId).map((room) => <option key={room.id} value={room.id}>{room.propertyName} · {room.name}</option>)}</select></label><label className="afield"><span>Trạng thái booking</span><select className="ainput" value={reportStatus} onChange={(e) => setReportStatus(e.target.value)}><option value="">Tất cả</option>{['pending_confirmation', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'no_show'].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><button className="abtn abtn--primary" type="submit">Áp dụng</button></form>
          {report && <><div className="admin-operations__report-cards"><div><span>Booking tạo trong kỳ</span><strong>{number(report.bookingSummary.total)}</strong></div><div><span>Tiền thu đã ghi</span><strong>{money(report.revenueSummary.postedPaymentsVnd)}</strong></div><div><span>Hoàn đã quyết toán</span><strong>{money(report.revenueSummary.settledRefundsVnd)}</strong></div><div><span>Thu ròng</span><strong>{money(report.revenueSummary.netCashVnd)}</strong></div><div><span>Yêu cầu tư vấn</span><strong>{number(report.inquiryConversion.total)}</strong></div><div><span>Tỷ lệ chốt</span><strong>{(report.inquiryConversion.conversionBps / 100).toLocaleString('vi-VN')}%</strong></div></div><p className="admin-operations__source">Kỳ {report.from} đến trước {report.toExclusive} · múi giờ {report.timezone}. Nguồn: {report.revenueSummary.paymentCount} khoản thanh toán, {report.revenueSummary.refundCount} hoàn đã quyết toán.</p><p className="admin-operations__safe-note"><AlertTriangle size={15} /> Bộ lọc nơi lưu trú áp dụng cho booking, thanh toán, hoàn tiền và quỹ phòng. Tư vấn, khách hàng và nội dung được tổng hợp toàn hệ thống vì dữ liệu hiện chưa gắn với từng nơi lưu trú.</p></>}
        </Panel>
        {report && <div className="admin-operations__grid"><Panel icon={<ClipboardList size={18} />} title="Đặt phòng theo trạng thái"><ul className="admin-operations__plain-list">{report.bookingSummary.byStatus.length ? report.bookingSummary.byStatus.map((row) => <li key={row.status}>{statusLabel(row.status)} · {number(row.count)} · giá trị booking {money(row.bookingValueVnd)}</li>) : <li>Không có booking trong kỳ.</li>}</ul></Panel><Panel icon={<Activity size={18} />} title="Phễu tư vấn"><ul className="admin-operations__plain-list">{report.inquiryConversion.byStage.length ? report.inquiryConversion.byStage.map((row) => <li key={row.stage}>{statusLabel(row.stage)} · {number(row.count)}</li>) : <li>Không có inquiry trong kỳ.</li>}</ul></Panel><Panel icon={<BedDouble size={18} />} title="Quỹ phòng đã mở"><ul className="admin-operations__plain-list"><li>{number(report.inventory.listedRoomNights)} room-night</li><li>Sức chứa {number(report.inventory.capacity)} · khoá {number(report.inventory.blocked)}</li><li>Đang giữ {number(report.inventory.held)} · đã đặt {number(report.inventory.reserved)}</li><li>Còn mở {number(report.inventory.available)}</li></ul></Panel><Panel icon={<Users size={18} />} title="Khách hàng theo nguồn"><ul className="admin-operations__plain-list">{report.customerAcquisition.bySource.length ? report.customerAcquisition.bySource.map((row) => <li key={row.source}>{row.source} · {number(row.count)}</li>) : <li>Không có khách mới trong kỳ.</li>}</ul></Panel></div>}
      </>}
    </section>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Có lỗi khi kết nối API. Hãy thử tải lại.';
}
