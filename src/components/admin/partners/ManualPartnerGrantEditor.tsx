'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { ApiError, apiRequest } from '@/lib/api/client';

type Organization = { id: string; name: string; status: string; membershipStatus: string };
type Candidate = { id: string; fullName: string; email: string; disabled: boolean; partnerOrganizations: Organization[] };
type Property = { id: string; name: string; code: string; roomTypes: Array<{ id: string; name: string; code: string }> };
const capabilities = { canReadInventory: 'Xem quỹ phòng', canWriteInventory: 'Cập nhật tồn', canEditRates: 'Đề xuất giá', canEditProfile: 'Đề xuất hồ sơ', canUploadMedia: 'Tải ảnh' };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Thao tác chưa hoàn tất.';

export function ManualPartnerGrantEditor() {
  const { user: admin } = useAdminSession();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [user, setUser] = useState<Candidate | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const [checks, setChecks] = useState({ canReadInventory: true, canWriteInventory: false, canEditRates: false, canEditProfile: false, canUploadMedia: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existingGrant, setExistingGrant] = useState('');
  const property = properties.find((item) => item.id === propertyId);
  const canCreateOrganization = admin.permissions.includes('partner.review') && admin.permissions.includes('partner.grant');
  const organizations = user?.partnerOrganizations.filter((org) => org.status === 'active' && org.membershipStatus === 'active') ?? [];

  async function searchUsers(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await apiRequest<{ items: Candidate[] }>(`/admin/partner-user-candidates?search=${encodeURIComponent(search.trim())}`); setCandidates(result.items); if (!result.items.length) setError('Không tìm thấy tài khoản phù hợp.'); }
    catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  async function searchProperties(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await apiRequest<{ items: Property[] }>(`/admin/partner-property-candidates?search=${encodeURIComponent(propertySearch.trim())}`); setProperties(result.items); setPropertyId(''); setScope([]); if (!result.items.length) setError('Không tìm thấy cơ sở phù hợp.'); }
    catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      const organization = await apiRequest<Organization>('/admin/partner-organizations/manual', { method: 'POST', body: JSON.stringify({
        userId: user.id, name: data.get('name'), organizationType: data.get('organizationType'), contactName: data.get('contactName'),
        phone: data.get('phone'), address: data.get('address'), membershipRole: data.get('membershipRole'), manuallyVerified: data.has('manuallyVerified'),
      }) });
      setUser({ ...user, partnerOrganizations: [...user.partnerOrganizations, organization] }); setOrganizationId(organization.id); setCreatingOrganization(false);
    } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user || !property) return;
    const data = new FormData(event.currentTarget); const expires = String(data.get('expiresAt') ?? '');
    setBusy(true); setError(''); setExistingGrant('');
    try {
      const result = await apiRequest<{ id: string }>('/admin/partner-grants', { method: 'POST', body: JSON.stringify({
        userId: user.id, organizationId, propertyId, roomTypeScope: scope, ...checks,
        expiresAt: expires ? new Date(expires).toISOString() : null, note: data.get('note'),
      }) });
      router.push(`/admin/doi-tac?tab=grants&grant=${encodeURIComponent(result.id)}`);
    } catch (reason) {
      setError(errorText(reason));
      if (reason instanceof ApiError && reason.status === 409 && reason.payload && typeof reason.payload === 'object') {
        const payload = reason.payload as { grantId?: string; payload?: { grantId?: string } };
        setExistingGrant(payload.grantId ?? payload.payload?.grantId ?? '');
      }
    } finally { setBusy(false); }
  }

  if (!admin.permissions.includes('partner.grant')) return <p role="alert">Không đủ quyền cấp quyền đối tác.</p>;
  return <div className="admin-partners manual-partner-grant">
    <Link className="admin-btn" href="/admin/doi-tac?tab=grants">← Quay lại quyền truy cập</Link>
    <section className="admin-partners__intro"><div><h2>Cấp quyền thủ công</h2><p>Chọn tài khoản đã tồn tại. Không tạo tài khoản nhân sự, không nhân bản cơ sở và không tự xuất bản hồ sơ.</p></div></section>
    {error && <div className="admin-partner-note" role="alert">{error}{existingGrant && <p><Link className="admin-btn" href={`/admin/doi-tac?tab=grants&grant=${encodeURIComponent(existingGrant)}`}>Mở quyền hiện có</Link></p>}</div>}
    <article className="admin-partner-card">
      <h3>1. Tài khoản và tổ chức</h3>
      <form className="admin-partner-add-member" onSubmit={searchUsers}><label className="admin-partner-field">Tìm tài khoản<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email hoặc họ tên" minLength={2} maxLength={120} required disabled={busy}/></label><button className="admin-btn" disabled={busy}>Tìm tài khoản</button></form>
      <div className="admin-partner-scope">{candidates.map((candidate) => <label key={candidate.id}><input type="radio" name="candidate" checked={user?.id === candidate.id} disabled={candidate.disabled || busy} onChange={() => {
        setUser(candidate); setOrganizationId(''); setCreatingOrganization(false); setExistingGrant(''); setError('');
      }}/>{candidate.fullName} · {candidate.email}{candidate.disabled ? ' · Đã khóa' : ''}</label>)}</div>
      {user && <>
        <label className="admin-partner-field">Tổ chức đối tác<select aria-label="Tổ chức đối tác" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} disabled={busy}><option value="">Chọn tổ chức đã duyệt</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
        {!user.partnerOrganizations.some((org) => org.membershipStatus !== 'revoked') && <p>Tài khoản này chưa có hồ sơ đối tác. {canCreateOrganization && <button type="button" className="admin-btn" disabled={busy} onClick={() => setCreatingOrganization(!creatingOrganization)}>Tạo hồ sơ đối tác cho user</button>}</p>}
        {!organizations.length && user.partnerOrganizations.some((org) => org.membershipStatus !== 'revoked') && <p>Hồ sơ hoặc thành viên chưa hoạt động. Hãy xử lý trong Tổ chức &amp; thành viên trước khi cấp quyền.</p>}
        {creatingOrganization && canCreateOrganization && <form className="manual-partner-org" onSubmit={createOrganization}>
          <label className="admin-partner-field">Tên tổ chức/cơ sở<input name="name" minLength={2} maxLength={180} required disabled={busy}/></label>
          <label className="admin-partner-field">Loại tổ chức<select name="organizationType" disabled={busy}><option value="property_owner">Chủ cơ sở</option><option value="agency">Đại lý</option></select></label>
          <label className="admin-partner-field">Người liên hệ<input name="contactName" defaultValue={user.fullName} minLength={2} maxLength={120} required disabled={busy}/></label>
          <label className="admin-partner-field">Số điện thoại<input name="phone" type="tel" minLength={8} maxLength={25} required disabled={busy}/></label>
          <label className="admin-partner-field">Địa chỉ<input name="address" maxLength={240} disabled={busy}/></label>
          <label className="admin-partner-field">Vai trò thành viên<select name="membershipRole" disabled={busy}><option value="owner">Chủ sở hữu</option><option value="manager">Quản lý</option></select></label>
          <label><input type="checkbox" name="manuallyVerified" required disabled={busy}/> Admin đã xác minh thủ công</label>
          <button className="admin-btn admin-btn--primary" disabled={busy}>Tạo hồ sơ đối tác</button>
        </form>}
      </>}
    </article>
    <article className="admin-partner-card">
      <h3>2. Cơ sở và hạng phòng</h3>
      <form className="admin-partner-add-member" onSubmit={searchProperties}><label className="admin-partner-field">Tìm cơ sở<input value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} placeholder="Tên hoặc mã cơ sở (trống: danh sách đầu)" maxLength={120} disabled={busy}/></label><button className="admin-btn" disabled={busy}>Tìm cơ sở</button></form>
      <label className="admin-partner-field">Cơ sở / nơi lưu trú<select aria-label="Cơ sở / nơi lưu trú" value={propertyId} onChange={(event) => { setPropertyId(event.target.value); setScope([]); setExistingGrant(''); }} disabled={busy}><option value="">Chọn cơ sở</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select></label>
      {property && <><button type="button" className="admin-btn" disabled={busy} onClick={() => setScope(property.roomTypes.map((room) => room.id))}>Chọn tất cả hạng phòng</button><fieldset className="admin-partner-scope"><legend>Phạm vi hạng phòng</legend>{property.roomTypes.map((room) => <label key={room.id}><input type="checkbox" checked={scope.includes(room.id)} disabled={busy} onChange={(event) => setScope((old) => event.target.checked ? [...old, room.id] : old.filter((id) => id !== room.id))}/>{room.name} · {room.code}</label>)}{!property.roomTypes.length && <p>Cơ sở chưa có hạng phòng. Cần bổ sung hạng phòng trước khi cấp quyền quỹ phòng hoặc giá.</p>}</fieldset></>}
    </article>
    <article className="admin-partner-card"><h3>3. Quyền được cấp</h3><p>Quyền áp dụng cho tổ chức đã chọn; các thành viên đang hoạt động hưởng quyền theo vai trò của họ. Không cấp sang cơ sở khác.</p>
      <form onSubmit={grant}><div className="admin-partner-permissions">{Object.entries(capabilities).map(([key, label]) => <label key={key}><input type="checkbox" checked={checks[key as keyof typeof checks]} disabled={busy} onChange={(event) => setChecks((old) => ({ ...old, [key]: event.target.checked,
        ...(key === 'canWriteInventory' && event.target.checked ? { canReadInventory: true } : {}), ...(key === 'canReadInventory' && !event.target.checked ? { canWriteInventory: false } : {}),
      }))}/>{label}</label>)}</div>
        <label className="admin-partner-field">Ngày hết hạn quyền (không bắt buộc)<input type="datetime-local" name="expiresAt" disabled={busy}/></label>
        <label className="admin-partner-field">Ghi chú<input name="note" maxLength={1000} disabled={busy}/></label>
        <button className="admin-btn admin-btn--primary" disabled={busy || !user || !organizationId || !propertyId || ((checks.canReadInventory || checks.canWriteInventory || checks.canEditRates) && !scope.length)}>Cấp quyền</button>
      </form>
    </article>
  </div>;
}
