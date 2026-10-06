'use client';

import { ArrowLeft, ArrowRight, Building2, Check, KeyRound, Search, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { StatusPill } from '@/components/ui/system';
import { ApiError, apiRequest } from '@/lib/api/client';

type Organization = { id: string; name: string; status: string; membershipStatus: string };
type Candidate = { id: string; fullName: string; email: string; disabled: boolean; partnerOrganizations: Organization[] };
type Property = { id: string; name: string; code: string; roomTypes: Array<{ id: string; name: string; code: string }> };
type Checks = { canReadInventory: boolean; canWriteInventory: boolean; canEditRates: boolean; canEditProfile: boolean; canUploadMedia: boolean };
type Level = 'view' | 'rooms' | 'full' | 'custom';

const capabilities: Record<keyof Checks, string> = { canReadInventory: 'Xem lịch phòng', canWriteInventory: 'Cập nhật phòng trống', canEditRates: 'Đề xuất giá', canEditProfile: 'Đề xuất hồ sơ cơ sở', canUploadMedia: 'Tải ảnh' };
/** Presets only pick checkbox values; the request still sends the five capability flags exactly as before. */
const LEVELS: Array<{ id: Level; title: string; text: string; checks?: Checks }> = [
  { id: 'view', title: 'Chỉ xem', text: 'Xem lịch phòng trống của cơ sở, không chỉnh sửa gì.', checks: { canReadInventory: true, canWriteInventory: false, canEditRates: false, canEditProfile: false, canUploadMedia: false } },
  { id: 'rooms', title: 'Quản lý phòng', text: 'Xem và cập nhật số phòng trống theo ngày.', checks: { canReadInventory: true, canWriteInventory: true, canEditRates: false, canEditProfile: false, canUploadMedia: false } },
  { id: 'full', title: 'Quản lý đầy đủ', text: 'Cập nhật phòng trống, đề xuất giá, hồ sơ và ảnh (nội dung vẫn chờ duyệt).', checks: { canReadInventory: true, canWriteInventory: true, canEditRates: true, canEditProfile: true, canUploadMedia: true } },
  { id: 'custom', title: 'Tùy chỉnh quyền', text: 'Tự chọn từng quyền cho trường hợp đặc biệt.' },
];
const STEPS = ['Chọn người', 'Chọn cơ sở', 'Chọn phạm vi', 'Chọn mức quyền', 'Lưu'];
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Thao tác chưa hoàn tất.';
const needsScope = (checks: Checks) => checks.canReadInventory || checks.canWriteInventory || checks.canEditRates;

export function ManualPartnerGrantEditor() {
  const { user: admin } = useAdminSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [user, setUser] = useState<Candidate | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoaded, setPropertiesLoaded] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const [level, setLevel] = useState<Level>('view');
  const [checks, setChecks] = useState<Checks>(LEVELS[0].checks!);
  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [existingGrant, setExistingGrant] = useState('');
  const property = properties.find((item) => item.id === propertyId);
  const canCreateOrganization = admin.permissions.includes('partner.review') && admin.permissions.includes('partner.grant');
  const organizations = user?.partnerOrganizations.filter((org) => org.status === 'active' && org.membershipStatus === 'active') ?? [];
  const organization = organizations.find((org) => org.id === organizationId);
  const allRooms = !!property && property.roomTypes.length > 0 && scope.length === property.roomTypes.length;
  const scopeMissing = needsScope(checks) && !scope.length;
  const canSave = !busy && !!user && !!organizationId && !!propertyId && !scopeMissing;
  const stepReady = [!!user && !!organizationId, !!propertyId, !!property && (scope.length > 0 || !property.roomTypes.length), !scopeMissing && Object.values(checks).some(Boolean), canSave];

  async function searchUsers(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await apiRequest<{ items: Candidate[] }>(`/admin/partner-user-candidates?search=${encodeURIComponent(search.trim())}`); setCandidates(result.items); if (!result.items.length) setError('Không tìm thấy tài khoản phù hợp.'); }
    catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  async function searchProperties(event?: FormEvent) {
    event?.preventDefault(); setBusy(true); setError('');
    try { const result = await apiRequest<{ items: Property[] }>(`/admin/partner-property-candidates?search=${encodeURIComponent(propertySearch.trim())}`); setProperties(result.items); setPropertiesLoaded(true); setPropertyId(''); setScope([]); if (!result.items.length) setError('Không tìm thấy cơ sở phù hợp.'); }
    catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      const created = await apiRequest<Organization>('/admin/partner-organizations/manual', { method: 'POST', body: JSON.stringify({
        userId: user.id, name: data.get('name'), organizationType: data.get('organizationType'), contactName: data.get('contactName'),
        phone: data.get('phone'), address: data.get('address'), membershipRole: data.get('membershipRole'), manuallyVerified: data.has('manuallyVerified'),
      }) });
      setUser({ ...user, partnerOrganizations: [...user.partnerOrganizations, created] }); setOrganizationId(created.id); setCreatingOrganization(false);
    } catch (reason) { setError(errorText(reason)); } finally { setBusy(false); }
  }
  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user || !property || !canSave) return;
    setBusy(true); setError(''); setExistingGrant('');
    try {
      const result = await apiRequest<{ id: string }>('/admin/partner-grants', { method: 'POST', body: JSON.stringify({
        userId: user.id, organizationId, propertyId, roomTypeScope: scope, ...checks,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, note,
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

  const goTo = (next: number) => {
    setError('');
    setStep(next);
    if (next === 1 && !propertiesLoaded && !busy) void searchProperties();
  };
  const pickLevel = (next: Level) => {
    setLevel(next);
    const preset = LEVELS.find((item) => item.id === next)?.checks;
    if (preset) setChecks(preset);
  };
  const toggleCheck = (key: keyof Checks, value: boolean) => setChecks((old) => ({
    ...old, [key]: value,
    ...(key === 'canWriteInventory' && value ? { canReadInventory: true } : {}),
    ...(key === 'canReadInventory' && !value ? { canWriteInventory: false } : {}),
  }));

  if (!admin.permissions.includes('partner.grant')) return <p role="alert">Không đủ quyền giao cơ sở cho đối tác.</p>;
  const levelTitle = LEVELS.find((item) => item.id === level)?.title ?? '';

  return <div className="admin-partners grant-wizard">
    <div className="grant-wizard__top">
      <Link className="admin-btn" href="/admin/doi-tac?tab=grants"><ArrowLeft size={16} aria-hidden="true" /> Quyền truy cập</Link>
      <p>Giao một cơ sở cho tài khoản đối tác đã đăng ký. Không tạo tài khoản mới, không nhân bản cơ sở, không tự xuất bản hồ sơ.</p>
    </div>

    <ol className="ui-stepper grant-wizard__steps" aria-label="Các bước giao quyền">
      {STEPS.map((label, index) => {
        const reachable = index <= step || stepReady.slice(0, index).every(Boolean);
        return <li key={label} className={index < step ? 'is-done' : undefined} aria-current={index === step ? 'step' : undefined}>
          <button type="button" disabled={!reachable || busy} onClick={() => goTo(index)}>
            <span className="ui-stepper__num" aria-hidden="true">{index < step ? <Check size={14} /> : index + 1}</span>
            <span>{label}</span>
          </button>
        </li>;
      })}
    </ol>

    {error && <div className="ui-alert ui-tone-danger" role="alert">{error}{existingGrant && <> <Link className="admin-btn" href={`/admin/doi-tac?tab=grants&grant=${encodeURIComponent(existingGrant)}`}>Mở quyền hiện có</Link></>}</div>}

    <section className="grant-wizard__panel" aria-labelledby="grant-step-title">
      {step === 0 && <>
        <StepHead icon={<UserRound size={20} />} title="Chọn người được giao quyền" text="Tìm theo email hoặc họ tên tài khoản đối tác đã đăng ký." />
        <form className="grant-wizard__search" onSubmit={searchUsers} role="search">
          <label className="ui-field"><span className="ui-label">Tìm tài khoản</span><input className="ui-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email hoặc họ tên" minLength={2} maxLength={120} required disabled={busy} /></label>
          <button className="ui-btn" disabled={busy}><Search size={16} aria-hidden="true" /> Tìm</button>
        </form>
        {candidates.length > 0 && <fieldset className="grant-wizard__fieldset"><legend>Tài khoản tìm thấy</legend><div className="ui-choice-grid">
          {candidates.map((candidate) => <label className="ui-choice" key={candidate.id}>
            <input type="radio" name="candidate" checked={user?.id === candidate.id} disabled={candidate.disabled || busy} onChange={() => { setUser(candidate); setOrganizationId(''); setCreatingOrganization(false); setExistingGrant(''); setError(''); }} />
            <strong>{candidate.fullName}</strong><small>{candidate.email}{candidate.disabled ? ' · Tài khoản đã khóa' : ''}</small>
          </label>)}
        </div></fieldset>}
        {user && <>
          <label className="ui-field grant-wizard__org"><span className="ui-label">Thuộc tổ chức đối tác</span><select className="ui-select" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} disabled={busy}><option value="">Chọn tổ chức đã duyệt</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>
          {!user.partnerOrganizations.some((org) => org.membershipStatus !== 'revoked') && <p className="ui-alert ui-tone-info">Tài khoản này chưa có hồ sơ đối tác. {canCreateOrganization && <button type="button" className="ui-btn ui-btn--sm" disabled={busy} onClick={() => setCreatingOrganization(!creatingOrganization)}>Tạo hồ sơ đối tác</button>}</p>}
          {!organizations.length && user.partnerOrganizations.some((org) => org.membershipStatus !== 'revoked') && <p className="ui-alert ui-tone-warning">Hồ sơ hoặc thành viên chưa hoạt động. Hãy xử lý ở tab “Tổ chức &amp; thành viên” trước.</p>}
          {creatingOrganization && canCreateOrganization && <form className="grant-wizard__org-form" onSubmit={createOrganization}>
            <label className="ui-field"><span className="ui-label">Tên tổ chức / cơ sở</span><input className="ui-input" name="name" minLength={2} maxLength={180} required disabled={busy} /></label>
            <label className="ui-field"><span className="ui-label">Loại tổ chức</span><select className="ui-select" name="organizationType" disabled={busy}><option value="property_owner">Chủ cơ sở</option><option value="agency">Đại lý</option></select></label>
            <label className="ui-field"><span className="ui-label">Người liên hệ</span><input className="ui-input" name="contactName" defaultValue={user.fullName} minLength={2} maxLength={120} required disabled={busy} /></label>
            <label className="ui-field"><span className="ui-label">Số điện thoại</span><input className="ui-input" name="phone" type="tel" minLength={8} maxLength={25} required disabled={busy} /></label>
            <label className="ui-field"><span className="ui-label">Địa chỉ</span><input className="ui-input" name="address" maxLength={240} disabled={busy} /></label>
            <label className="ui-field"><span className="ui-label">Vai trò thành viên</span><select className="ui-select" name="membershipRole" disabled={busy}><option value="owner">Chủ sở hữu</option><option value="manager">Quản lý</option></select></label>
            <label className="ui-check grant-wizard__span"><input type="checkbox" name="manuallyVerified" required disabled={busy} /> Tôi đã xác minh thông tin đối tác này</label>
            <div className="grant-wizard__span"><button className="ui-btn ui-btn--primary" disabled={busy}>Tạo hồ sơ đối tác</button></div>
          </form>}
        </>}
      </>}

      {step === 1 && <>
        <StepHead icon={<Building2 size={20} />} title="Chọn cơ sở" text="Mỗi lần giao một cơ sở. Đối tác chỉ thấy cơ sở được giao." />
        <form className="grant-wizard__search" onSubmit={(event) => void searchProperties(event)} role="search">
          <label className="ui-field"><span className="ui-label">Tìm cơ sở</span><input className="ui-input" value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} placeholder="Tên hoặc mã cơ sở" maxLength={120} disabled={busy} /></label>
          <button className="ui-btn" disabled={busy}><Search size={16} aria-hidden="true" /> Tìm</button>
        </form>
        {busy && !properties.length && <p className="ui-muted" role="status">Đang tải danh sách cơ sở…</p>}
        {properties.length > 0 && <fieldset className="grant-wizard__fieldset"><legend>Cơ sở</legend><div className="ui-choice-grid">
          {properties.map((item) => <label className="ui-choice" key={item.id}>
            <input type="radio" name="property" checked={propertyId === item.id} disabled={busy} onChange={() => { setPropertyId(item.id); setScope(item.roomTypes.map((room) => room.id)); setExistingGrant(''); }} />
            <strong>{item.name}</strong><small>Mã {item.code} · {item.roomTypes.length} hạng phòng</small>
          </label>)}
        </div></fieldset>}
      </>}

      {step === 2 && property && <>
        <StepHead icon={<KeyRound size={20} />} title="Chọn phạm vi hạng phòng" text={`Đối tác chỉ làm việc với các hạng phòng được chọn tại ${property.name}.`} />
        {property.roomTypes.length ? <>
          <div className="ui-choice-grid grant-wizard__scope-mode" role="radiogroup" aria-label="Phạm vi">
            <label className="ui-choice"><input type="radio" name="scope-mode" checked={allRooms} disabled={busy} onChange={() => setScope(property.roomTypes.map((room) => room.id))} /><strong>Tất cả hạng phòng</strong><small>{property.roomTypes.length} hạng phòng hiện có</small></label>
            <label className="ui-choice"><input type="radio" name="scope-mode" checked={!allRooms} disabled={busy} onChange={() => setScope([])} /><strong>Chọn từng hạng phòng</strong><small>Giới hạn ở một vài hạng phòng</small></label>
          </div>
          <fieldset className="grant-wizard__fieldset"><legend>Hạng phòng được giao</legend><div className="grant-wizard__rooms">
            {property.roomTypes.map((room) => <label className="ui-check" key={room.id}><input type="checkbox" checked={scope.includes(room.id)} disabled={busy} onChange={(event) => setScope((old) => event.target.checked ? [...old, room.id] : old.filter((id) => id !== room.id))} /> {room.name} <span className="ui-muted">· {room.code}</span></label>)}
          </div></fieldset>
          {!scope.length && <p className="ui-hint">Chọn ít nhất một hạng phòng để tiếp tục.</p>}
        </> : <p className="ui-alert ui-tone-warning">Cơ sở chưa có hạng phòng. Chỉ có thể giao quyền đề xuất hồ sơ và ảnh; hãy thêm hạng phòng trước nếu cần quyền lịch phòng hoặc giá.</p>}
      </>}

      {step === 3 && <>
        <StepHead icon={<ShieldCheck size={20} />} title="Chọn mức quyền" text="Chọn mức có sẵn, hoặc tùy chỉnh từng quyền." />
        <div className="ui-choice-grid grant-wizard__levels" role="radiogroup" aria-label="Mức quyền">
          {LEVELS.map((item) => <label className="ui-choice" key={item.id}><input type="radio" name="level" checked={level === item.id} disabled={busy} onChange={() => pickLevel(item.id)} /><strong>{item.title}</strong><small>{item.text}</small></label>)}
        </div>
        {level === 'custom' && <fieldset className="grant-wizard__fieldset"><legend>Quyền chi tiết</legend><div className="grant-wizard__rooms">
          {(Object.keys(capabilities) as Array<keyof Checks>).map((key) => <label className="ui-check" key={key}><input type="checkbox" checked={checks[key]} disabled={busy} onChange={(event) => toggleCheck(key, event.target.checked)} /> {capabilities[key]}</label>)}
        </div></fieldset>}
        {scopeMissing && <p className="ui-alert ui-tone-warning">Mức quyền này cần ít nhất một hạng phòng. Quay lại bước “Chọn phạm vi”.</p>}
        <details className="grant-wizard__more">
          <summary>Tùy chọn thêm (hạn dùng, ghi chú)</summary>
          <div className="grant-wizard__org-form">
            <label className="ui-field"><span className="ui-label">Hết hạn quyền (không bắt buộc)</span><input className="ui-input" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={busy} /></label>
            <label className="ui-field"><span className="ui-label">Ghi chú nội bộ</span><input className="ui-input" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} disabled={busy} /></label>
          </div>
        </details>
      </>}

      {step === 4 && <form onSubmit={grant}>
        <StepHead icon={<Check size={20} />} title="Kiểm tra và lưu" text="Xem lại trước khi giao quyền. Có thể thu hồi hoặc chỉnh sửa sau ở tab Quyền truy cập." />
        <dl className="grant-wizard__summary">
          <div><dt>Người được giao</dt><dd>{user ? `${user.fullName} · ${user.email}` : '—'}</dd></div>
          <div><dt>Tổ chức</dt><dd>{organization?.name ?? '—'}</dd></div>
          <div><dt>Cơ sở</dt><dd>{property ? `${property.name} · ${property.code}` : '—'}</dd></div>
          <div><dt>Phạm vi</dt><dd>{!property ? '—' : allRooms ? `Tất cả ${property.roomTypes.length} hạng phòng` : scope.length ? property.roomTypes.filter((room) => scope.includes(room.id)).map((room) => room.name).join(', ') : 'Không áp dụng hạng phòng'}</dd></div>
          <div><dt>Mức quyền</dt><dd><StatusPill tone="brand">{levelTitle}</StatusPill><span className="grant-wizard__caps">{(Object.keys(capabilities) as Array<keyof Checks>).filter((key) => checks[key]).map((key) => capabilities[key]).join(' · ') || 'Chưa chọn quyền nào'}</span></dd></div>
          <div><dt>Hết hạn</dt><dd>{expiresAt ? new Date(expiresAt).toLocaleString('vi-VN') : 'Không đặt hạn'}</dd></div>
        </dl>
        <div className="ui-sticky-actions grant-wizard__save">
          <button type="button" className="ui-btn" disabled={busy} onClick={() => goTo(3)}><ArrowLeft size={16} aria-hidden="true" /> Quay lại</button>
          <button className="ui-btn ui-btn--primary" disabled={!canSave}>{busy ? 'Đang lưu…' : 'Lưu và giao quyền'}</button>
        </div>
      </form>}

      {step < 4 && <div className="grant-wizard__nav">
        {step > 0 ? <button type="button" className="ui-btn" disabled={busy} onClick={() => goTo(step - 1)}><ArrowLeft size={16} aria-hidden="true" /> Quay lại</button> : <span />}
        <button type="button" className="ui-btn ui-btn--primary" disabled={busy || !stepReady[step]} onClick={() => goTo(step + 1)}>Tiếp tục <ArrowRight size={16} aria-hidden="true" /></button>
      </div>}
    </section>
  </div>;
}

function StepHead({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <header className="grant-wizard__head">
    <span className="grant-wizard__icon" aria-hidden="true">{icon}</span>
    <div><h2 id="grant-step-title">{title}</h2><p>{text}</p></div>
  </header>;
}
