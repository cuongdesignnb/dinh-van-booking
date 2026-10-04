'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import { useAdminToast } from '@/components/admin/toast/useAdminToast';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import Link from 'next/link';

type Tab = 'applications' | 'organizations' | 'claims' | 'grants' | 'revisions' | 'sheets';
type Application = { id: string; status: string; version: number; submittedAt: string; reviewNote: string | null; applicant: { id: string; email: string; fullName: string; disabledAt: string | null }; organization: { id: string; name: string; phone: string; address: string | null; organizationType: string; status: string; verificationStatus: string } };
type Member = { userId: string; name: string; email: string; disabled: boolean; role: string; status: string; version: number };
type Organization = { id: string; name: string; legalName: string | null; contactName: string; email: string; phone: string; address: string | null; organizationType: string; status: string; verificationStatus: string; version: number; createdAt: string; counts: { grants: number; claims: number; applications: number }; members: Member[] };
type Claim = { id: string; organization: { id: string; name: string; status: string }; property: { id: string; title: string; publicationStatus: string; roomTypes: Array<{ id: string; name: string; code: string; status: string }> }; status: string; reason: string | null; version: number; createdAt: string; reviewNote: string | null };
type Grant = { id: string; organization: { id: string; name: string; status: string }; property: { id: string; title: string; roomTypes: Array<{ id: string; name: string; code: string }> }; status: string; roomTypeScope: unknown; canReadInventory: boolean; canWriteInventory: boolean; canEditRates: boolean; canEditProfile: boolean; canUploadMedia: boolean; expiresAt: string | null; version: number };
type Revision = { id: string; organization: { id: string; name: string }; property: { id: string; title: string }; roomTypeId: string | null; targetRatePlanId: string | null; revision: number; baseVersion: number; contentBaseVersion: number | null; proposed: unknown; status: string; version: number; author: { fullName: string; email: string }; submittedAt: string };
type SheetWorkbook = { id: string; spreadsheetId: string; title: string; periodStart: string; periodEndExclusive: string; status: string; importPaused: boolean; exportPaused: boolean; projectionBatches: Array<{ id: string; bindingId: string; sheetTitle: string; status: string; error: string | null; createdAt: string }>; bindings: Array<{ id: string; propertyId: string; propertyTitle: string; organizationId: string; organizationName: string; sheetTitle: string; outputRange: string; inputRange: string; resultRange: string; status: string }> };
type SheetsRuntime = { enabled: boolean; importEnabled: boolean; adapter: string; items: SheetWorkbook[] };

const tabs: Array<[Tab, string]> = [['applications', 'Hồ sơ đăng ký'], ['organizations', 'Tổ chức & thành viên'], ['claims', 'Yêu cầu cơ sở'], ['grants', 'Quyền truy cập'], ['revisions', 'Nội dung chờ duyệt'], ['sheets', 'Google Sheets']];
const dateLabel = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const errorText = (error: unknown) => error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Thao tác chưa hoàn tất.';

export function PartnerAdminScreen({ initialTab, initialGrantId }: { initialTab?: Tab; initialGrantId?: string }) {
  const { user } = useAdminSession();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'applications');
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [workbooks, setWorkbooks] = useState<SheetWorkbook[]>([]);
  const [sheetsRuntime, setSheetsRuntime] = useState({ enabled: false, importEnabled: false, adapter: 'unknown' });
  const [busyId, setBusyId] = useState('');
  const toast = useAdminToast();
  const visibleTabs = tabs.filter(([key]) => key !== 'sheets' || user.permissions.includes('sheets.read'));

  const reload = useCallback(async () => {
    const tasks = await Promise.allSettled([
      apiRequest<{ items: Application[] }>('/admin/partner-applications?status=all', { cache: 'no-store' }),
      apiRequest<{ items: Organization[] }>('/admin/partner-organizations', { cache: 'no-store' }),
      apiRequest<{ items: Claim[] }>('/admin/property-access-claims?status=all', { cache: 'no-store' }),
      apiRequest<{ items: Grant[] }>('/admin/partner-grants', { cache: 'no-store' }),
      apiRequest<{ items: Revision[] }>('/admin/partner-revisions?status=all', { cache: 'no-store' }),
    ]);
    if (tasks[0].status === 'fulfilled') setApplications(tasks[0].value.items);
    if (tasks[1].status === 'fulfilled') setOrganizations(tasks[1].value.items);
    if (tasks[2].status === 'fulfilled') setClaims(tasks[2].value.items);
    if (tasks[3].status === 'fulfilled') setGrants(tasks[3].value.items);
    if (tasks[4].status === 'fulfilled') setRevisions(tasks[4].value.items);
    if (user.permissions.includes('sheets.read')) {
      try {
        const sheetData = await apiRequest<SheetsRuntime>('/admin/sheets/workbooks', { cache: 'no-store' });
        setWorkbooks(sheetData.items);
        setSheetsRuntime({ enabled: sheetData.enabled, importEnabled: sheetData.importEnabled, adapter: sheetData.adapter });
      } catch (error) { toast.error(errorText(error)); }
    } else { setWorkbooks([]); setSheetsRuntime({ enabled: false, importEnabled: false, adapter: 'không được cấp quyền xem' }); }
    const firstError = tasks.find((task) => task.status === 'rejected');
    if (firstError?.status === 'rejected') toast.error(errorText(firstError.reason));
  }, [toast, user.permissions]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (tab === 'grants' && initialGrantId) document.getElementById(`grant-${initialGrantId}`)?.scrollIntoView({ block: 'center' });
  }, [tab, grants, initialGrantId]);

  const mutate = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try { await action(); toast.success(success); await reload(); }
    catch (error) { toast.error(errorText(error)); }
    finally { setBusyId(''); }
  };

  const reviewApplication = (item: Application, action: 'approve' | 'request_info' | 'reject', note?: string) => mutate(item.id, () => apiRequest(`/admin/partner-applications/${item.id}/review`, { method: 'POST', body: JSON.stringify({ action, expectedVersion: item.version, note }) }), 'Đã cập nhật hồ sơ đối tác.');
  const reviewClaim = (item: Claim, action: 'approve' | 'reject', form: HTMLFormElement) => {
    const data = new FormData(form);
    const roomTypeScope = data.getAll('roomTypeScope').map(String);
    const expiresAtValue = String(data.get('expiresAt') ?? '').trim();
    return mutate(item.id, () => apiRequest(`/admin/property-access-claims/${item.id}/review`, { method: 'POST', body: JSON.stringify({
      action, expectedVersion: item.version, note: data.get('note'), roomTypeScope,
      canReadInventory: data.has('canReadInventory'), canWriteInventory: data.has('canWriteInventory'),
      canEditRates: data.has('canEditRates'), canEditProfile: data.has('canEditProfile'), canUploadMedia: data.has('canUploadMedia'),
      ...(expiresAtValue ? { expiresAt: new Date(expiresAtValue).toISOString() } : {}),
    }) }), action === 'approve' ? 'Đã duyệt yêu cầu và cấp quyền theo phạm vi.' : 'Đã từ chối yêu cầu.');
  };

  return <div className="admin-partners">
    <section className="admin-partners__intro"><div><span className="admin-kicker">Đối tác & vận hành</span><h2>Quản lý đối tác</h2><p>Duyệt tài khoản, yêu cầu gắn với cơ sở gốc, phạm vi quyền và đề xuất nội dung. Duyệt tài khoản không tự động cấp quyền cơ sở hay xuất bản.</p></div><button type="button" className="admin-btn" onClick={() => void reload()}>Tải lại dữ liệu</button></section>
    <div className="admin-partners__tabs" role="tablist" aria-label="Các nghiệp vụ đối tác">{visibleTabs.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}<small>{key === 'applications' ? applications.filter((x) => x.status === 'pending').length : key === 'claims' ? claims.filter((x) => x.status === 'pending').length : key === 'revisions' ? revisions.filter((x) => x.status === 'pending').length : ''}</small></button>)}</div>

    {tab === 'applications' && <div className="admin-partners__list">{applications.length ? applications.map((item) => <article className="admin-partner-card" key={item.id}>
      <header><div><span className={`admin-partner-status is-${item.status}`}>{applicationStatus(item.status)}</span><h3>{item.organization.name}</h3><p>{item.applicant.fullName} · {item.applicant.email} · {item.organization.phone}</p></div><time>{dateLabel(item.submittedAt)}</time></header>
      <dl><div><dt>Loại hình</dt><dd>{item.organization.organizationType === 'agency' ? 'Đại lý' : 'Chủ cơ sở'}</dd></div><div><dt>Địa chỉ</dt><dd>{item.organization.address || 'Chưa cung cấp'}</dd></div><div><dt>Trạng thái tổ chức</dt><dd>{item.organization.status} · {item.organization.verificationStatus}</dd></div></dl>
      {item.reviewNote && <p className="admin-partner-note">Ghi chú trước: {item.reviewNote}</p>}
      {['pending', 'needs_info'].includes(item.status) && <form className="admin-partner-review-row" onSubmit={(event) => { event.preventDefault(); void reviewApplication(item, 'request_info', String(new FormData(event.currentTarget).get('note') ?? '')); }}><input name="note" aria-label="Ghi chú xử lý" placeholder="Ghi chú cho người đăng ký" /><button type="submit" className="admin-btn" disabled={busyId === item.id}>Yêu cầu bổ sung</button><button type="button" className="admin-btn admin-btn--danger" disabled={busyId === item.id} onClick={() => void reviewApplication(item, 'reject', item.reviewNote ?? '')}>Từ chối</button><button type="button" className="admin-btn admin-btn--primary" disabled={busyId === item.id} onClick={() => void reviewApplication(item, 'approve')}>Duyệt tài khoản</button></form>}
    </article>) : <Empty text="Chưa có hồ sơ đăng ký đối tác." />}</div>}

    {tab === 'organizations' && <div className="admin-partners__list">{organizations.length ? organizations.map((org) => <article className="admin-partner-card" key={org.id}>
      <header><div><span className={`admin-partner-status is-${org.status}`}>{organizationStatus(org.status)}</span><h3>{org.name}</h3><p>{org.contactName} · {org.email} · {org.phone}</p></div><div className="admin-partner-card__actions"><button type="button" className="admin-btn" disabled={busyId === org.id || !['active', 'suspended'].includes(org.status)} onClick={() => void mutate(org.id, () => apiRequest(`/admin/partner-organizations/${org.id}`, { method: 'PATCH', body: JSON.stringify({ action: org.status === 'active' ? 'suspend' : 'restore', expectedVersion: org.version }) }), org.status === 'active' ? 'Đã tạm ngưng tổ chức.' : 'Đã khôi phục tổ chức.')}>{org.status === 'active' ? 'Tạm ngưng' : org.status === 'suspended' ? 'Khôi phục' : 'Chưa thể thao tác'}</button></div></header>
      <p className="admin-partner-note">{org.address || 'Chưa có địa chỉ'} · {org.counts.grants} quyền cơ sở · xác minh: {org.verificationStatus}</p>
      <div className="admin-partner-members"><h4>Thành viên</h4>{org.members.map((member) => <div className="admin-partner-member" key={member.userId}><span><strong>{member.name}</strong><small>{member.email} · {member.role} · {member.status}{member.disabled ? ' · tài khoản đã khóa' : ''}</small></span>{member.status !== 'pending' && <button type="button" className="admin-link-button" disabled={busyId === `${org.id}:${member.userId}`} onClick={() => void mutate(`${org.id}:${member.userId}`, () => apiRequest(`/admin/partner-organizations/${org.id}/memberships/${member.userId}`, { method: 'PATCH', body: JSON.stringify({ action: member.status === 'active' ? 'revoke' : 'restore', expectedVersion: member.version }) }), member.status === 'active' ? 'Đã thu hồi thành viên.' : 'Đã khôi phục thành viên.')}>{member.status === 'active' ? 'Thu hồi' : 'Khôi phục'}</button>}</div>)}</div>
      {org.status === 'active' && <form className="admin-partner-add-member" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void mutate(org.id, () => apiRequest(`/admin/partner-organizations/${org.id}/memberships`, { method: 'POST', body: JSON.stringify({ email: data.get('email'), role: data.get('role') }) }), 'Đã thêm thành viên đã đăng ký.').then(() => form.reset()); }}><input type="email" name="email" required placeholder="Email tài khoản đã đăng ký"/><select name="role"><option value="manager">Quản lý tổ chức</option><option value="viewer">Chỉ xem</option><option value="owner">Chủ sở hữu</option></select><button type="submit" className="admin-btn">Thêm thành viên</button><small>Không gửi email mời; chỉ thêm tài khoản đã tồn tại.</small></form>}
    </article>) : <Empty text="Chưa có tổ chức đối tác." />}</div>}

    {tab === 'claims' && <div className="admin-partners__list">{claims.filter((claim) => claim.status === 'pending').length ? claims.filter((claim) => claim.status === 'pending').map((item) => <ClaimCard key={item.id} item={item} busy={busyId === item.id} onReview={reviewClaim} />) : <Empty text="Không có yêu cầu quản lý cơ sở đang chờ." />}</div>}

    {tab === 'grants' && <div className="admin-partners__list">{user.permissions.includes('partner.grant') && <Link className="admin-btn admin-btn--primary" href="/admin/doi-tac/cap-quyen">+ Cấp quyền thủ công</Link>}{grants.length ? grants.map((item) => <div id={`grant-${item.id}`} key={item.id}><GrantCard item={item} busy={busyId === item.id} onSave={(payload) => mutate(item.id, () => apiRequest(`/admin/partner-grants/${item.id}`, { method: 'PATCH', body: JSON.stringify({ ...payload, expectedVersion: item.version }) }), 'Đã cập nhật quyền theo phạm vi.')} /></div>) : <Empty text="Chưa có quyền cơ sở được cấp." />}</div>}

    {tab === 'revisions' && <div className="admin-partners__list">{revisions.filter((revision) => revision.status === 'pending').length ? revisions.filter((revision) => revision.status === 'pending').map((item) => <RevisionCard key={item.id} item={item} busy={busyId === item.id} onReview={(action, note) => mutate(item.id, () => apiRequest(`/admin/partner-revisions/${item.id}/review`, { method: 'POST', body: JSON.stringify({ action, expectedVersion: item.version, note }) }), action === 'approve' ? 'Đã duyệt và áp dụng nội dung.' : 'Đã cập nhật trạng thái bản đề xuất.')} />) : <Empty text="Không có đề xuất nội dung đang chờ." />}</div>}

    {tab === 'sheets' && <SheetsAdmin workbooks={workbooks} grants={grants} runtime={sheetsRuntime} canManage={user.permissions.includes('sheets.manage')} onChanged={reload} />}
  </div>;
}

function applicationStatus(status: string) { return ({ pending: 'Chờ duyệt', needs_info: 'Cần bổ sung', approved: 'Đã duyệt', rejected: 'Từ chối' } as Record<string, string>)[status] ?? status; }
function organizationStatus(status: string) { return ({ pending_review: 'Chờ xác minh', active: 'Đang hoạt động', suspended: 'Tạm ngưng', rejected: 'Từ chối' } as Record<string, string>)[status] ?? status; }
function Empty({ text }: { text: string }) { return <div className="admin-partners__empty">{text}</div>; }

function ClaimCard({ item, busy, onReview }: { item: Claim; busy: boolean; onReview: (item: Claim, action: 'approve' | 'reject', form: HTMLFormElement) => Promise<void> }) {
  const [scope, setScope] = useState<string[]>([]);
  return <article className="admin-partner-card"><header><div><span className="admin-partner-status is-pending">Chờ cấp quyền</span><h3>{item.property.title}</h3><p>Đơn vị yêu cầu: {item.organization.name} · {item.property.publicationStatus}</p></div><time>{dateLabel(item.createdAt)}</time></header>
    <p className="admin-partner-note">{item.reason || 'Không có ghi chú bổ sung.'}</p>
    <form onSubmit={(event) => { event.preventDefault(); void onReview(item, 'approve', event.currentTarget); }}>
      <div className="admin-partner-permissions">{[['canReadInventory','Xem quỹ phòng'],['canWriteInventory','Cập nhật tồn'],['canEditRates','Đề xuất giá'],['canEditProfile','Đề xuất hồ sơ'],['canUploadMedia','Tải ảnh riêng tư']].map(([name,label]) => <label key={name}><input type="checkbox" name={name} defaultChecked={name === 'canReadInventory'} /> {label}</label>)}</div>
      <fieldset className="admin-partner-scope"><legend>Phạm vi hạng phòng (bắt buộc chọn rõ)</legend>{item.property.roomTypes.map((room) => <label key={room.id}><input type="checkbox" name="roomTypeScope" value={room.id} checked={scope.includes(room.id)} onChange={(event) => setScope((current) => event.target.checked ? [...current, room.id] : current.filter((id) => id !== room.id))}/>{room.name} · {room.code} ({room.status})</label>)}</fieldset>
      <label className="admin-partner-field">Hết hạn quyền (để trống nếu không đặt)<input type="datetime-local" name="expiresAt" /></label><label className="admin-partner-field">Ghi chú<input name="note" placeholder="Ghi chú nội bộ/cho đối tác" /></label>
      <div className="admin-partner-card__actions"><button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={(event) => { const form = event.currentTarget.form; if (form) void onReview(item, 'reject', form); }}>Từ chối</button><button type="submit" className="admin-btn admin-btn--primary" disabled={busy || scope.length === 0}>Duyệt và cấp quyền</button></div>
      <small>Duyệt quyền này không đồng nghĩa với duyệt hồ sơ nội dung để công khai.</small>
    </form>
  </article>;
}

function GrantCard({ item, busy, onSave }: { item: Grant; busy: boolean; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const initialScope = Array.isArray(item.roomTypeScope) ? item.roomTypeScope.filter((entry): entry is string => typeof entry === 'string') : [];
  const [scope, setScope] = useState(initialScope);
  const [statusAction, setStatusAction] = useState<'revoke' | 'restore' | undefined>();
  const [checks, setChecks] = useState({ canReadInventory: item.canReadInventory, canWriteInventory: item.canWriteInventory, canEditRates: item.canEditRates, canEditProfile: item.canEditProfile, canUploadMedia: item.canUploadMedia });
  return <article className="admin-partner-card"><header><div><span className={`admin-partner-status is-${item.status}`}>{item.status === 'active' ? 'Đang cấp quyền' : 'Đã thu hồi'}</span><h3>{item.property.title}</h3><p>{item.organization.name} · {item.expiresAt ? `Hết hạn ${dateLabel(item.expiresAt)}` : 'Không đặt ngày hết hạn'}</p></div><button type="button" className="admin-btn" onClick={() => setStatusAction((old) => old ? undefined : item.status === 'active' ? 'revoke' : 'restore')}>{statusAction ? 'Bỏ chọn thao tác' : item.status === 'active' ? 'Chuẩn bị thu hồi' : 'Chuẩn bị khôi phục'}</button></header>
    <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const expires = String(form.get('expiresAt') ?? '').trim(); void onSave({ ...checks, roomTypeScope: scope, ...(expires ? { expiresAt: new Date(expires).toISOString() } : {}), ...(statusAction ? { action: statusAction } : {}) }); }}>
      <div className="admin-partner-permissions">{Object.entries({ canReadInventory: 'Xem quỹ phòng', canWriteInventory: 'Cập nhật tồn', canEditRates: 'Đề xuất giá', canEditProfile: 'Đề xuất hồ sơ', canUploadMedia: 'Tải ảnh riêng tư' }).map(([key,label]) => <label key={key}><input type="checkbox" checked={checks[key as keyof typeof checks]} onChange={(event) => setChecks((old) => ({ ...old, [key]: event.target.checked }))}/>{label}</label>)}</div>
      <fieldset className="admin-partner-scope"><legend>Phạm vi hạng phòng</legend>{item.property.roomTypes.map((room) => <label key={room.id}><input type="checkbox" checked={scope.includes(room.id)} onChange={(event) => setScope((current) => event.target.checked ? [...current, room.id] : current.filter((id) => id !== room.id))}/>{room.name} · {room.code}</label>)}</fieldset>
      <label className="admin-partner-field">Hết hạn quyền<input type="datetime-local" name="expiresAt" defaultValue={item.expiresAt ? new Date(item.expiresAt).toISOString().slice(0,16) : ''} /></label>
      <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>Lưu phạm vi và trạng thái</button>
    </form>
  </article>;
}

function RevisionCard({ item, busy, onReview }: { item: Revision; busy: boolean; onReview: (action: 'approve' | 'request_changes' | 'reject', note: string) => Promise<void> }) {
  const proposed = item.proposed && typeof item.proposed === 'object' ? Object.entries(item.proposed as Record<string, unknown>) : [];
  const [note, setNote] = useState('');
  return <article className="admin-partner-card"><header><div><span className="admin-partner-status is-pending">Bản {item.revision} · Chờ duyệt</span><h3>{item.property.title}</h3><p>{item.organization.name} · {item.author.fullName} ({item.author.email}) · {dateLabel(item.submittedAt)}</p></div></header>
    <dl>{proposed.map(([key,value]) => <div key={key}><dt>{revisionLabel(key)}</dt><dd>{revisionValue(key, value)}</dd></div>)}</dl>
    <label className="admin-partner-field">Ghi chú xử lý<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: cần ảnh bìa có quyền sử dụng" /></label>
    <div className="admin-partner-card__actions"><button type="button" className="admin-btn admin-btn--danger" disabled={busy} onClick={() => void onReview('reject', note)}>Từ chối</button><button type="button" className="admin-btn" disabled={busy} onClick={() => void onReview('request_changes', note)}>Yêu cầu chỉnh sửa</button><button type="button" className="admin-btn admin-btn--primary" disabled={busy} onClick={() => void onReview('approve', note)}>Duyệt và áp dụng</button></div>
  </article>;
}

function revisionLabel(key: string) { return ({ title: 'Tên cơ sở', excerpt: 'Trích yếu', descriptionDocument: 'Mô tả', media: 'Album ảnh', name: 'Tên hạng phòng', description: 'Mô tả hạng phòng', bedSummary: 'Giường', areaSqm: 'Diện tích', maxAdults: 'Người lớn tối đa', maxChildren: 'Trẻ em tối đa', houseRules: 'Nội quy', notes: 'Ghi chú khách', area: 'Khu vực', address: 'Địa chỉ', checkInTime: 'Giờ nhận phòng', checkOutTime: 'Giờ trả phòng', baseRateVnd: 'Giá ngày thường', weekendRateVnd: 'Giá cuối tuần', breakfastIncluded: 'Bữa sáng', minStayNights: 'Số đêm tối thiểu', maxStayNights: 'Số đêm tối đa', inclusions: 'Quyền lợi' } as Record<string,string>)[key] ?? key; }

function revisionValue(key: string, value: unknown): string {
  if (value === null) return 'Xoá giá trị';
  if (key === 'descriptionDocument' && value && typeof value === 'object') {
    const parts: string[] = [];
    const visit = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const record = node as { type?: unknown; text?: unknown; content?: unknown[] };
      if (record.type === 'text' && typeof record.text === 'string') parts.push(record.text);
      if (['paragraph', 'heading', 'hardBreak', 'listItem'].includes(String(record.type))) parts.push(' ');
      record.content?.forEach(visit);
    };
    visit(value);
    return parts.join('').replace(/\s+/g, ' ').trim() || 'Mô tả định dạng (chưa có chữ)';
  }
  if (Array.isArray(value)) {
    const lines = value.map((item) => typeof item === 'string' ? item : item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string' ? String((item as { text: string }).text) : '').filter(Boolean);
    if (key === 'media') return `${value.length} ảnh${lines.length ? ` · ${lines.join(' · ')}` : ''}`;
    return lines.length ? lines.join(' · ') : `${value.length} mục`;
  }
  if (key === 'baseRateVnd' || key === 'weekendRateVnd') return `${Number(value).toLocaleString('vi-VN')} ₫/đêm`;
  if (key === 'breakfastIncluded') return value === true ? 'Có bao gồm' : 'Không bao gồm';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'string' || typeof value === 'number') return String(value) || 'Để trống';
  return 'Nội dung cần xem xét';
}

function SheetsAdmin({ workbooks, grants, runtime, canManage, onChanged }: { workbooks: SheetWorkbook[]; grants: Grant[]; runtime: { enabled: boolean; importEnabled: boolean; adapter: string }; canManage: boolean; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const toast = useAdminToast();
  const [month, setMonth] = useState(() => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(new Date()); return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`; });
  const [draftBinding, setDraftBinding] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true);
    try {
      const [yearText, monthText] = month.split('-'); const year = Number(yearText); const monthNumber = Number(monthText);
      const start = `${month}-01`; const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0,10);
      await apiRequest('/admin/sheets/workbooks', { method: 'POST', body: JSON.stringify({ spreadsheetId: data.get('spreadsheetId'), title: data.get('title'), periodStart: start, periodEndExclusive: end }) });
      toast.success('Đã lưu cấu hình workbook. Chưa có lệnh Google nào được gửi; workbook đang pause.'); form.reset(); await onChanged();
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  const submitBinding = async (workbookId: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const grant = grants.find((item) => item.id === data.get('grantId'));
    if (!grant) { toast.error('Chọn một grant cơ sở đang hoạt động.'); return; }
    setBusy(true);
    try {
      await apiRequest(`/admin/sheets/workbooks/${workbookId}/bindings`, { method: 'POST', body: JSON.stringify({ organizationId: grant.organization.id, propertyId: grant.property.id, sheetId: data.get('sheetId'), sheetTitle: data.get('sheetTitle'), outputRange: data.get('outputRange'), inputRange: data.get('inputRange'), resultRange: data.get('resultRange') }) });
      toast.success('Đã gắn tab vào đúng cơ sở/grant.'); form.reset(); await onChanged();
    } catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  const sync = async (id: string, direction: 'import' | 'export') => {
    setBusy(true); try { const result = await apiRequest<{ status: string }>(`/admin/sheets/workbooks/${id}/sync`, { method: 'POST', body: JSON.stringify({ direction }) }); toast.success(`Đồng bộ ${direction} hoàn tất: ${result.status}.`); await onChanged(); }
    catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  const retryProjection = async (id: string) => {
    setBusy(true);
    try { await apiRequest(`/admin/sheets/draft-batches/${id}/retry-projection`, { method: 'POST' }); toast.success('Đã ghi lại batch lên Google Sheets.'); await onChanged(); }
    catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  const pause = async (book: SheetWorkbook, direction: 'import' | 'export') => {
    setBusy(true); try { await apiRequest(`/admin/sheets/workbooks/${book.id}/pause/${direction}`, { method: 'PATCH', body: JSON.stringify({ paused: direction === 'import' ? !book.importPaused : !book.exportPaused }) }); toast.success(`${direction === 'import' ? 'Import' : 'Export'} đã cập nhật trạng thái.`); await onChanged(); }
    catch (error) { toast.error(errorText(error)); } finally { setBusy(false); }
  };
  return <section className="admin-partners__list">{canManage && <article className="admin-partner-card"><h3>Đăng ký workbook theo tháng</h3><p>Chỉ nhập Spreadsheet ID được chủ dự án cấp. Không quét Drive, không tự mở quyền Google. Workbook mới mặc định dừng cả import/export. Adapter hiện tại: <strong>{runtime.adapter}</strong>; cờ đồng bộ {runtime.enabled ? 'đang bật' : 'đang tắt'}.</p><form className="admin-partner-add-member" onSubmit={(event) => void submit(event)}><input name="spreadsheetId" required placeholder="Spreadsheet ID đã được cấp quyền"/><input name="title" required placeholder="Tên workbook tháng"/><label>Tháng<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} required/></label><button className="admin-btn admin-btn--primary" disabled={busy}>Lưu workbook</button></form></article>}
    {workbooks.length ? workbooks.map((book) => <article className="admin-partner-card" key={book.id}><header><div><span className="admin-partner-status is-pending">{book.status} · import {book.importPaused ? 'tạm dừng' : 'mở'} · export {book.exportPaused ? 'tạm dừng' : 'mở'}</span><h3>{book.title}</h3><p>…{book.spreadsheetId.slice(-8)} · {book.periodStart.slice(0,10)} → {book.periodEndExclusive.slice(0,10)}</p></div>{canManage && <div className="admin-partner-card__actions"><button type="button" className="admin-btn" disabled={busy} onClick={() => void pause(book,'import')}>{book.importPaused ? 'Mở import' : 'Pause import'}</button><button type="button" className="admin-btn" disabled={busy} onClick={() => void pause(book,'export')}>{book.exportPaused ? 'Mở export' : 'Pause export'}</button><button type="button" className="admin-btn" disabled={busy || !runtime.enabled || book.importPaused || !runtime.importEnabled} onClick={() => void sync(book.id,'import')}>Kiểm tra lệnh nhập</button><button type="button" className="admin-btn admin-btn--primary" disabled={busy || !runtime.enabled || book.exportPaused} onClick={() => void sync(book.id,'export')}>Đồng bộ output</button></div>}</header>
      {book.projectionBatches?.map((batch) => <div className="admin-partner-sheet-binding" key={batch.id}><strong>Cần ghi lại lô lên tab {batch.sheetTitle}</strong><span>{batch.error ?? 'Lô đã lưu trong PostgreSQL nhưng chưa xác nhận đã xuất hiện trong Sheets.'}</span>{canManage && <button type="button" className="admin-btn admin-btn--primary" disabled={busy || !runtime.enabled || book.exportPaused} onClick={() => void retryProjection(batch.id)}>Thử ghi lại</button>}</div>)}
      {book.bindings.map((binding) => <div className="admin-partner-sheet-binding" key={binding.id}><strong>{binding.propertyTitle}</strong><span>{binding.organizationName} · tab: {binding.sheetTitle}</span><small>OUTPUT {binding.outputRange} · INPUT {binding.inputRange} · RESULT {binding.resultRange} · {binding.status}</small>{canManage && <button type="button" className="admin-btn" disabled={busy} onClick={() => setDraftBinding((current) => current === binding.id ? '' : binding.id)}>Chuẩn bị lô nhập</button>}{canManage && draftBinding === binding.id && <form className="admin-partner-add-member" onSubmit={(event) => { event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true); void apiRequest<{projectionStatus:string; message:string}>(`/admin/sheets/bindings/${binding.id}/draft-batches`, { method:'POST', body:JSON.stringify({ roomTypeId:data.get('roomTypeId'), from:data.get('from'), toExclusive:data.get('toExclusive') }) }).then((result) => { if (result.projectionStatus === 'projected') toast.success('Đã tạo batch nền. Hệ thống chưa tự gửi lệnh.'); else toast.error(result.message); form.reset(); return onChanged(); }).catch((error:unknown) => toast.error(errorText(error))).finally(() => setBusy(false)); }}><select name="roomTypeId" required><option value="">Chọn hạng phòng</option>{grants.find((grant) => grant.organization.id === binding.organizationId && grant.property.id === binding.propertyId)?.property.roomTypes.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.code}</option>)}</select><label>Từ ngày<input name="from" type="date" required/></label><label>Đến trước ngày<input name="toExclusive" type="date" required/></label><button className="admin-btn admin-btn--primary" disabled={busy || !runtime.enabled || book.exportPaused}>Chuẩn bị batch</button></form>}</div>)}
      {canManage && grants.some((grant) => grant.status === 'active' && grant.canWriteInventory) && <details><summary>Thêm binding tab cơ sở</summary><form className="admin-partner-add-member" onSubmit={(event) => void submitBinding(book.id,event)}><select name="grantId" required><option value="">Chọn grant cơ sở đang cấp quyền ghi tồn</option>{grants.filter((grant) => grant.status === 'active' && grant.canWriteInventory).map((grant) => <option key={grant.id} value={grant.id}>{grant.organization.name} · {grant.property.title}</option>)}</select><input name="sheetId" required placeholder="GID tab (số)"/><input name="sheetTitle" required placeholder="Tên tab trong Google Sheets"/><input name="outputRange" required defaultValue="A1:L1000" aria-label="Vùng output"/><input name="inputRange" required defaultValue="N1:AC1000" aria-label="Vùng input"/><input name="resultRange" required defaultValue="AE1:AM1000" aria-label="Vùng result"/><button className="admin-btn" disabled={busy}>Gắn tab và phạm vi</button><small>Ba vùng phải không giao nhau: output 12 cột, input 16 cột, result 9 cột. Kiểm tra GID/tên tab thủ công trước khi sync.</small></form></details>}
      <p className="admin-partner-note">Poller chỉ chạy khi cả cờ tương ứng bật và workbook không pause. Cần cấp service account sandbox bằng secret trên backend; không có credential thì Google E2E chưa được kiểm chứng.</p></article>) : <Empty text="Chưa đăng ký workbook thử nghiệm."/>}</section>;
}
