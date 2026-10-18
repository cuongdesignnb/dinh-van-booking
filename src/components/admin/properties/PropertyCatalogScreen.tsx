'use client';

import { ArrowLeft, BedDouble, ExternalLink, ImagePlus, Pencil, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import { KIND_LABEL } from '@/lib/admin/formatters';
import { roomUnitKindLabel } from '@/lib/room-unit-kind';
import { richDocumentToText } from '@/lib/content/rich-document';
import { MediaPicker } from '../media/MediaPicker';
import { MediaLibrary, type MediaAsset } from '../media/MediaLibrary';
import { AlbumEditor, type AlbumItem } from '../media/AlbumEditor';
import type { PropertyRoom } from './RoomTypeEditor';
import { EMPTY_DOCUMENT, RichTextEditor, type RichDocument } from '../shared/RichTextEditor';
import { AdminSlugField, type GenerateSlugResult } from '../shared/AdminSlugField';
import { AdminSeoPanel } from '../shared/AdminSeoPanel';
import { useAdminToast } from '@/components/admin/toast/useAdminToast';
import { ListCard, ListFooter, ListToolbar, PageActions, StatusTabs, foldText } from '../shared/ListKit';
import { RowMenu, StatusBadge } from '../shared/ui';

type PropertyItem = {
  id: string;
  contentId: string;
  title: string;
  description: string;
  descriptionDocument: RichDocument | null;
  metaTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  contentVersion: number;
  slug: string | null;
  path: string | null;
  excerpt: string | null;
  code: string;
  kind: string;
  area: string;
  address: string;
  operatingStatus: string;
  publicationStatus: string;
  featured: boolean;
  version: number;
  updatedAt: string;
  cover: { mediaId: string; url: string; alt: string } | null;
  gallery: AlbumItem[];
  roomTypes: PropertyRoom[];
};

type FormState = {
  title: string;
  /** '' until Generate; sent once with the create request. */
  slug: string;
  code: string;
  kind: string;
  area: string;
  address: string;
  description: string;
  descriptionDocument: RichDocument;
};

type EditFormState = {
  title: string;
  kind: string;
  area: string;
  address: string;
  excerpt: string;
  description: string;
  descriptionDocument: RichDocument;
  metaTitle: string;
  metaDescription: string;
  operatingStatus: string;
  noindex: boolean;
  featured: boolean;
};

type SelectedMedia = Pick<MediaAsset, 'id' | 'url' | 'altText'>;

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  code: '',
  kind: 'homestay',
  area: 'Cúc Phương, Ninh Bình',
  address: '',
  description: '',
  descriptionDocument: EMPTY_DOCUMENT,
};

const EMPTY_EDIT_FORM: EditFormState = {
  title: '',
  kind: 'homestay',
  area: 'Cúc Phương, Ninh Bình',
  address: '',
  excerpt: '',
  description: '',
  descriptionDocument: EMPTY_DOCUMENT,
  metaTitle: '',
  metaDescription: '',
  operatingStatus: 'pending_verification',
  noindex: true,
  featured: false,
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Bản nháp',
  review: 'Chờ duyệt',
  scheduled: 'Đã hẹn',
  published: 'Đã xuất bản',
  archived: 'Lưu trữ',
};

const OPERATING_STATUS_LABEL: Record<string, string> = {
  active: 'Đang hoạt động',
  pending_verification: 'Chờ xác minh',
  inactive: 'Tạm dừng',
};

const money = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Chưa có giá' : `${new Intl.NumberFormat('vi-VN').format(value)}đ / đêm`;

function plainTextDocument(value: string): RichDocument {
  return value.trim()
    ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] }
    : EMPTY_DOCUMENT;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Mở /admin rồi đăng nhập lại trước khi thao tác.';
  }
  return reason instanceof Error ? reason.message : 'Không thể hoàn tất thao tác.';
}

export function PropertyCatalogScreen({ routeMode, routeId }: { routeMode?: 'create' | 'edit'; routeId?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const legacyCreate = searchParams.get('action') === 'create';
  const legacyEditId = searchParams.get('edit');
  const createMode = routeMode === 'create' || legacyCreate;
  const editId = routeMode === 'edit' ? routeId ?? null : legacyEditId;
  const roomParam = searchParams.get('room');
  const editorMode = createMode || Boolean(editId);
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<PropertyItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [coverMedia, setCoverMedia] = useState<SelectedMedia | null>(null);
  const [editCover, setEditCover] = useState<SelectedMedia | null>(null);
  const [gallery, setGallery] = useState<AlbumItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inlinePickerOpen, setInlinePickerOpen] = useState(false);
  const inlineInsert = useRef<((attrs: { src: string; alt?: string; mediaId?: string }) => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadFailed(false);
    try {
      const response = await apiRequest<{ items: PropertyItem[] }>('/properties');
      setItems(response.items);
    } catch (reason) {
      setError(errorMessage(reason));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Old property-editor room links still land in the property-scoped room workspace.
  useEffect(() => {
    if (routeMode) return;
    if (editId && roomParam) router.replace(`/admin/hang-phong?property=${encodeURIComponent(editId)}&room=${encodeURIComponent(roomParam)}`);
    else if (legacyCreate) router.replace('/admin/phong-nghi/them');
    else if (legacyEditId) router.replace(`/admin/phong-nghi/${encodeURIComponent(legacyEditId)}`);
  }, [editId, legacyCreate, legacyEditId, roomParam, routeMode, router]);

  const fillEditForm = useCallback((item: PropertyItem) => {
    setEditing(item);
    setEditForm({
      title: item.title,
      kind: item.kind,
      area: item.area,
      address: item.address,
      excerpt: item.excerpt ?? '',
      description: item.description,
      descriptionDocument: item.descriptionDocument ?? plainTextDocument(item.description),
      metaTitle: item.metaTitle ?? '',
      metaDescription: item.metaDescription ?? '',
      operatingStatus: item.operatingStatus,
      noindex: item.noindex,
      featured: item.featured,
    });
    setEditCover(item.cover ? { id: item.cover.mediaId, url: item.cover.url, altText: item.cover.alt } : null);
    setGallery(item.gallery ?? []);
  }, []);

  useEffect(() => {
    if (!editId || editing?.id === editId) return;
    const item = items.find((candidate) => candidate.id === editId);
    if (item) fillEditForm(item);
  }, [editId, editing?.id, fillEditForm, items]);

  useEffect(() => {
    if (!editing || roomParam || window.location.hash !== '#hang-phong') return;
    const frame = requestAnimationFrame(() => document.getElementById('hang-phong')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [editing, roomParam]);

  const goToList = () => router.replace('/admin/phong-nghi', { scroll: false });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCoverMedia(null);
    setGallery([]);
    setEditing(null);
    setError(null);
    setNotice(null);
    router.push('/admin/phong-nghi/them', { scroll: false });
  };

  const closeEditor = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCoverMedia(null);
    setEditCover(null);
    setGallery([]);
    setError(null);
    setNotice(null);
    goToList();
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    // Title edits never touch the slug; only Generate does.
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateEdit = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setEditForm((current) => ({ ...current, [key]: value }));
  };

  const openEdit = (item: PropertyItem) => {
    fillEditForm(item);
    setError(null);
    setNotice(null);
    router.push(`/admin/phong-nghi/${encodeURIComponent(item.id)}`, { scroll: false });
  };

  const pickInlineImage = useCallback((insert: (attrs: { src: string; alt?: string; mediaId?: string }) => void) => {
    inlineInsert.current = insert;
    setInlinePickerOpen(true);
  }, []);

  const handleInlineImage = useCallback((asset: MediaAsset) => {
    inlineInsert.current?.({ src: asset.url, alt: asset.altText ?? asset.originalFilename, mediaId: asset.id });
    inlineInsert.current = null;
    setInlinePickerOpen(false);
  }, []);

  const closeInlinePicker = () => {
    inlineInsert.current = null;
    setInlinePickerOpen(false);
  };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (form.description.trim().length < 40) {
      const message = 'Mô tả nơi lưu trú cần ít nhất 40 ký tự.';
      setError(message); toast.error(message);
      setBusy(false);
      return;
    }
    try {
      const created = await apiRequest<PropertyItem>('/properties', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          slug: form.slug.trim() || undefined,
          code: form.code,
          kind: form.kind,
          area: form.area,
          address: form.address,
          description: form.description,
          descriptionDocument: form.descriptionDocument,
          coverMediaId: coverMedia?.id ?? undefined,
          galleryMediaIds: gallery.map((item) => item.mediaId),
        }),
      });
      setForm(EMPTY_FORM);
      setCoverMedia(null);
      setGallery([]);
      setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      fillEditForm(created);
      router.replace(`/admin/phong-nghi/${encodeURIComponent(created.id)}`);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const publish = async (item: PropertyItem) => {
    setPublishing(item.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/content/${encodeURIComponent(item.contentId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published', expectedVersion: item.contentVersion }),
      });
      setNotice(`Đã xuất bản “${item.title}”.`);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPublishing(null);
    }
  };

  const unpublish = async (item: PropertyItem) => {
    if (!window.confirm(`Gỡ “${item.title}” khỏi website công khai và đưa về bản nháp?`)) return;
    setPublishing(item.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/content/${encodeURIComponent(item.contentId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'draft', expectedVersion: item.contentVersion }),
      });
      setNotice(`Đã gỡ xuất bản “${item.title}” và đưa về bản nháp.`);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setPublishing(null);
    }
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setEditBusy(true);
    setError(null);
    setNotice(null);
    if (!editForm.description.trim()) {
      const message = 'Mô tả nơi lưu trú không được để trống.';
      setError(message); toast.error(message);
      setEditBusy(false);
      return;
    }
    try {
      const updated = await apiRequest<PropertyItem>(`/properties/${encodeURIComponent(editing.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editForm.title,
          kind: editForm.kind,
          area: editForm.area,
          address: editForm.address,
          excerpt: editForm.excerpt || null,
          description: editForm.description,
          descriptionDocument: editForm.descriptionDocument,
          metaTitle: editForm.metaTitle || null,
          metaDescription: editForm.metaDescription || null,
          operatingStatus: editForm.operatingStatus,
          noindex: editForm.noindex,
          featured: editForm.featured,
          coverMediaId: editCover?.id ?? null,
          galleryMediaIds: gallery.map((item) => item.mediaId),
          expectedVersion: editing.version,
          expectedContentVersion: editing.contentVersion,
        }),
      });
      fillEditForm(updated);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setEditBusy(false);
    }
  };

  const applyGenerated = (result: GenerateSlugResult) => {
    const patch = { slug: result.slug, path: result.path, contentVersion: result.version };
    setEditing((current) => current ? { ...current, ...patch } : current);
    setItems((current) => current.map((item) => item.id === editing?.id ? { ...item, ...patch } : item));
  };

  const remove = async (item: PropertyItem) => {
    if (item.publicationStatus === 'published') {
      const message = 'Không thể xoá nơi lưu trú đã xuất bản. Gỡ xuất bản trước.';
      setError(message); toast.error(message);
      return;
    }
    if (!window.confirm(`Xoá bản nháp “${item.title}”? Hành động này xoá cả route, revision và thông tin phòng liên quan.`)) return;
    setDeleting(item.id);
    setError(null);
    setNotice(null);
    try {
      await apiRequest<void>(`/properties/${encodeURIComponent(item.id)}?expectedVersion=${item.version}`, { method: 'DELETE' });
      if (editing?.id === item.id) setEditing(null);
      setNotice(`Đã xoá bản nháp “${item.title}”.`);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setDeleting(null);
    }
  };

  const statusCounts = items.reduce<Record<string, number>>((acc, item) => { acc[item.publicationStatus] = (acc[item.publicationStatus] ?? 0) + 1; return acc; }, {});
  const listTabs = [
    { key: 'all', label: 'Tất cả', count: items.length },
    { key: 'published', label: 'Đang hiển thị', count: statusCounts.published ?? 0 },
    { key: 'draft', label: 'Bản nháp', count: items.length - (statusCounts.published ?? 0) },
  ];
  const needle = foldText(search.trim());
  const visible = items.filter((item) => (tab === 'all' || (tab === 'published' ? item.publicationStatus === 'published' : item.publicationStatus !== 'published'))
    && (kindFilter === 'all' || item.kind === kindFilter)
    && (!needle || foldText(`${item.title} ${item.code} ${item.area} ${item.address}`).includes(needle)));

  return (
    <section className={`property-catalog${editorMode && !roomParam ? ' admin-editing' : ''}`}>
      {!editorMode && <PageActions>
        <Link className="abtn abtn--ghost" href="/admin/hang-phong"><BedDouble size={15} aria-hidden="true" /> Quản lý hạng phòng</Link>
        <button type="button" className="abtn abtn--primary" onClick={openCreate} disabled={busy}><Plus size={16} aria-hidden="true" /> Thêm nơi lưu trú</button>
      </PageActions>}

      {editorMode && roomParam && <div className="admin-form-page__head">
        <button type="button" className="abtn abtn--ghost admin-form-page__back" onClick={closeEditor}>
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại danh sách
        </button>
        <div className="admin-form-page__title"><h2>Quản lý hạng phòng</h2></div>
      </div>}

      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
      {notice && <p className="settings-screen__message settings-screen__message--success" role="status">{notice}</p>}

      {editorMode && !createMode && editing && !roomParam && (
        <form className="cedit property-form" onSubmit={saveEdit}>
          <div className="cedit__bar">
            <button type="button" className="cedit__back" onClick={closeEditor} disabled={editBusy} aria-label="Quay lại danh sách"><ArrowLeft size={18} aria-hidden="true" /></button>
            <div className="cedit__crumb">
              <span>Nơi lưu trú · {editing.code}</span>
              <h2>{editForm.title.trim() || editing.title}</h2>
            </div>
            <span className="cedit__state"><StatusBadge small label={STATUS_LABEL[editing.publicationStatus] ?? editing.publicationStatus} tone={editing.publicationStatus === 'published' ? 'success' : 'muted'} /></span>
            <div className="cedit__actions">
              <a className="abtn abtn--ghost" href="#hang-phong"><BedDouble size={15} aria-hidden="true" /> Đến hạng phòng ({editing.roomTypes.length})</a>
              {editing.publicationStatus === 'published' && editing.path && <a className="abtn abtn--ghost" href={editing.path} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> Xem trên web</a>}
              <button type="submit" className="abtn abtn--primary" disabled={editBusy}>{editBusy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            </div>
          </div>

          <div className="cedit__grid">
            <div className="cedit__main">
              <input className="cedit__title" value={editForm.title} onChange={(event) => updateEdit('title', event.target.value)} required maxLength={300} aria-label="Tên nơi lưu trú *" placeholder="Tên nơi lưu trú…" />
              <div className="property-form__grid">
                <label className="afield">
                  <span>Loại hình *</span>
                  <select className="ainput" value={editForm.kind} onChange={(event) => updateEdit('kind', event.target.value)}>
                    {Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="afield">
                  <span>Khu vực *</span>
                  <input className="ainput" value={editForm.area} onChange={(event) => updateEdit('area', event.target.value)} required maxLength={160} />
                </label>
                <label className="afield property-form__wide">
                  <span>Địa chỉ *</span>
                  <input className="ainput" value={editForm.address} onChange={(event) => updateEdit('address', event.target.value)} required maxLength={300} />
                </label>
                <label className="afield property-form__wide">
                  <span>Trích yếu</span>
                  <input className="ainput" value={editForm.excerpt} onChange={(event) => updateEdit('excerpt', event.target.value)} maxLength={500} placeholder="1–2 câu hiện trên thẻ nơi lưu trú" />
                </label>
              </div>
              <RichTextEditor
                label="Mô tả *"
                hint="Dùng tiêu đề, danh sách, liên kết, bảng và ảnh trong Media Library."
                value={editForm.descriptionDocument}
                onChange={(document, plainText) => setEditForm((current) => ({ ...current, descriptionDocument: document, description: plainText }))}
                onPickImage={pickInlineImage}
                disabled={editBusy}
                aiContext={{ kind: 'stay', title: editForm.title, excerpt: editForm.excerpt, currentContentId: editing.contentId }}
                onAiGenerated={(generated) => setEditForm((current) => ({
                  ...current,
                  title: generated.title,
                  excerpt: generated.excerpt,
                  metaTitle: generated.metaTitle,
                  metaDescription: generated.metaDescription,
                }))}
              />
              <div className="property-form__section" id="hang-phong">
                <div className="album-editor__head"><div><h4>Hạng phòng ({editing.roomTypes.length})</h4><p className="ahint">Mỗi hạng phòng có giá, sức chứa và album riêng. Quỹ phòng theo ngày quản lý ở mục “Quỹ phòng”.</p></div><div className="property-form__room-actions"><Link className="abtn abtn--ghost abtn--sm" href={`/admin/hang-phong?property=${encodeURIComponent(editing.id)}`}>Xem danh sách hạng phòng</Link><Link className="abtn abtn--primary abtn--sm" href={`/admin/hang-phong?property=${encodeURIComponent(editing.id)}&room=create`}><Plus size={15} /> Thêm hạng phòng</Link></div></div>
                {editing.roomTypes.length ? <ul className="alist__rows prop-rooms">{editing.roomTypes.map((room) => <li className="arow" key={room.id}>
                  <Link className="arow__main" href={`/admin/hang-phong?property=${encodeURIComponent(editing.id)}&room=${encodeURIComponent(room.id)}`}>
                    <span className="arow__text">
                      <span className="arow__meta"><StatusBadge small label={room.status === 'active' ? 'Đang hoạt động' : 'Tạm ẩn'} tone={room.status === 'active' ? 'success' : 'muted'} />{!room.capacityVerified && <span className="arow__warn">Sức chứa chờ xác minh</span>}</span>
                      <strong className="arow__title">{room.name}</strong>
                      <small>{room.code} · {roomUnitKindLabel(room.unitKind) ?? 'Chưa phân loại'} · {room.unitCount ? `${room.unitCount} phòng/căn` : 'Chưa có số phòng/căn'} · {room.rate?.baseRateVnd === 0 ? 'Liên hệ để nhận giá' : money(room.rate?.baseRateVnd)} · {room.gallery?.length ?? 0} ảnh</small>
                    </span>
                  </Link>
                  <div className="arow__actions"><Link className="abtn abtn--ghost abtn--sm" href={`/admin/hang-phong?property=${encodeURIComponent(editing.id)}&room=${encodeURIComponent(room.id)}`}><Pencil size={14} /> Sửa hạng phòng</Link></div>
                </li>)}</ul> : <p className="ahint">Chưa có hạng phòng; bấm “Thêm hạng phòng”.</p>}
              </div>
              <div className="property-form__section"><AlbumEditor label="Album nơi lưu trú" items={gallery} onChange={setGallery} /></div>
            </div>

            <aside className="cedit__side">
              <section className="cside">
                <h3>Xuất bản</h3>
                <div className="cside__row"><span>Trên website</span><StatusBadge small label={STATUS_LABEL[editing.publicationStatus] ?? editing.publicationStatus} tone={editing.publicationStatus === 'published' ? 'success' : 'muted'} /></div>
                <label className="afield">
                  <span>Trạng thái vận hành</span>
                  <select className="ainput" value={editForm.operatingStatus} onChange={(event) => updateEdit('operatingStatus', event.target.value)}>
                    <option value="pending_verification">Chờ xác minh</option>
                    <option value="inactive">Tạm dừng</option>
                    <option value="active">Đang hoạt động</option>
                  </select>
                </label>
                <AdminSlugField
                  mode="edit" kind="stay" title={editForm.title} value={editing.slug}
                  currentPath={editing.path} published={editing.publicationStatus === 'published'}
                  expectedVersion={editing.contentVersion} endpointBase={`/properties/${encodeURIComponent(editing.id)}`}
                  onGenerated={applyGenerated} disabled={editBusy}
                />
                <label className="atoggle cside__toggle"><input type="checkbox" checked={editForm.featured} onChange={(event) => updateEdit('featured', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Nổi bật trên trang chủ</strong><small>Dùng khi khối “Phòng nghỉ nổi bật” chỉ lấy phòng nổi bật.</small></span></label>
                <label className="atoggle cside__toggle"><input type="checkbox" checked={editForm.noindex} onChange={(event) => updateEdit('noindex', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Ẩn khỏi Google</strong><small>Không lập chỉ mục khi đang chuẩn bị.</small></span></label>
                {editing.publicationStatus === 'published'
                  ? <button type="button" className="abtn abtn--ghost abtn--sm cside__full" onClick={() => void unpublish(editing)} disabled={publishing === editing.id}>{publishing === editing.id ? 'Đang gỡ…' : 'Gỡ xuất bản'}</button>
                  : <button type="button" className="abtn abtn--primary abtn--sm cside__full" onClick={() => void publish(editing)} disabled={publishing === editing.id}>{publishing === editing.id ? 'Đang xuất bản…' : 'Xuất bản bản đã lưu'}</button>}
              </section>
              <section className="cside">
                <h3>Ảnh đại diện</h3>
                <MediaPicker
                  value={editCover?.url}
                  mediaId={editCover?.id}
                  label={editCover ? 'Đổi ảnh' : 'Chọn ảnh đại diện'}
                  recommendedWidth={1200}
                  recommendedHeight={800}
                  recommendedRatio={1.5}
                  uploadAltText={editForm.title}
                  onMediaChange={(asset) => setEditCover(asset ? { id: asset.id, url: asset.url, altText: asset.altText } : null)}
                />
              </section>
              <section className="cside">
                <h3>SEO</h3>
                <label className="afield"><span>Tiêu đề SEO <small className="cside__count">{editForm.metaTitle.length}/60</small></span><input className="ainput" value={editForm.metaTitle} onChange={(event) => updateEdit('metaTitle', event.target.value)} maxLength={200} /></label>
                <label className="afield"><span>Mô tả SEO <small className="cside__count">{editForm.metaDescription.length}/160</small></span><textarea className="ainput" rows={3} value={editForm.metaDescription} onChange={(event) => updateEdit('metaDescription', event.target.value)} maxLength={320} /></label>
                <AdminSeoPanel
                  kind="stay" title={editForm.title} metaTitle={editForm.metaTitle} metaDescription={editForm.metaDescription}
                  path={editing.slug ? editing.path : null} hasCover={!!editCover}
                  bodyText={`${editForm.excerpt} ${richDocumentToText(editForm.descriptionDocument)}`} noindex={editForm.noindex}
                  schema={{ propertyKind: editForm.kind, roomTypeCount: editing.roomTypes.filter((room) => room.status === 'active').length }}
                />
              </section>
            </aside>
          </div>
        </form>
      )}

      {createMode && (
        <form className="cedit property-form" onSubmit={create}>
          <div className="cedit__bar">
            <button type="button" className="cedit__back" onClick={closeEditor} disabled={busy} aria-label="Quay lại danh sách"><ArrowLeft size={18} aria-hidden="true" /></button>
            <div className="cedit__crumb">
              <span>Nơi lưu trú · Bước 1: hồ sơ cơ sở, bước 2: hạng phòng</span>
              <h2>Thêm nơi lưu trú</h2>
            </div>
            <div className="cedit__actions">
              <button type="button" className="abtn abtn--ghost" onClick={closeEditor} disabled={busy}>Hủy</button>
              <button type="submit" className="abtn abtn--primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu cơ sở và thêm hạng phòng'}</button>
            </div>
          </div>
          <div className="cedit__grid">
            <div className="cedit__main">
              <input className="cedit__title" value={form.title} onChange={(event) => update('title', event.target.value)} required maxLength={300} aria-label="Tên nơi lưu trú *" placeholder="Tên nơi lưu trú, ví dụ: Nhà sàn Đinh Vân" />
              <div className="property-form__grid">
                <label className="afield">
                  <span>Mã nơi lưu trú *</span>
                  <input className="ainput" value={form.code} onChange={(event) => update('code', event.target.value.toUpperCase())} required pattern="[A-Za-z0-9_-]+" placeholder="DV-HOMESTAY-01" />
                </label>
                <label className="afield">
                  <span>Loại hình *</span>
                  <select className="ainput" value={form.kind} onChange={(event) => update('kind', event.target.value)}>
                    {Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="afield">
                  <span>Khu vực *</span>
                  <input className="ainput" value={form.area} onChange={(event) => update('area', event.target.value)} required maxLength={160} />
                </label>
                <label className="afield property-form__wide">
                  <span>Địa chỉ *</span>
                  <input className="ainput" value={form.address} onChange={(event) => update('address', event.target.value)} required maxLength={300} placeholder="Địa chỉ hiển thị cho khách" />
                </label>
              </div>
              <RichTextEditor
                label="Mô tả *"
                hint="Tối thiểu 40 ký tự. Có thể chèn ảnh dùng lại từ Media Library."
                value={form.descriptionDocument}
                onChange={(document, plainText) => setForm((current) => ({ ...current, descriptionDocument: document, description: plainText }))}
                onPickImage={pickInlineImage}
                disabled={busy}
                aiContext={{ kind: 'stay', title: form.title }}
                onAiGenerated={(generated) => setForm((current) => ({
                  ...current,
                  title: generated.title,
                  description: generated.excerpt,
                }))}
              />
              <div className="property-form__section"><AlbumEditor label="Album nơi lưu trú" items={gallery} onChange={setGallery} /></div>
            </div>
            <aside className="cedit__side">
              <section className="cside">
                <h3>Đường dẫn</h3>
                <AdminSlugField
                  mode="create" kind="stay" title={form.title} value={form.slug}
                  onChange={(slug) => setForm((current) => ({ ...current, slug }))}
                  previewEndpoint="/properties/slug/preview" disabled={busy}
                />
                <p className="ahint">Lưu xong là bản nháp, chưa hiện trên website.</p>
              </section>
              <section className="cside">
                <h3>Ảnh đại diện</h3>
                <MediaPicker
                  value={coverMedia?.url}
                  mediaId={coverMedia?.id}
                  label="Chọn ảnh đại diện"
                  recommendedWidth={1200}
                  recommendedHeight={800}
                  recommendedRatio={1.5}
                  uploadAltText={form.title}
                  onMediaChange={(asset) => setCoverMedia(asset ? { id: asset.id, url: asset.url, altText: asset.altText } : null)}
                />
                <p className="ahint"><ImagePlus size={14} aria-hidden="true" /> Ảnh mới được chuyển WebP khi lưu.</p>
              </section>
            </aside>
          </div>
        </form>
      )}

      {editorMode && !createMode && !editing && <div className="acard apending">{loading ? 'Đang tải thông tin nơi lưu trú…' : loadFailed ? 'Không tải được dữ liệu từ API. Hãy tải lại danh sách rồi thử lại.' : 'Không tìm thấy nơi lưu trú cần chỉnh sửa.'}</div>}
      {!editorMode && <ListCard>
        <div className="alist__head">
          <StatusTabs tabs={listTabs} value={tab} onChange={setTab} />
          <button type="button" className="abtn abtn--ghost abtn--sm alist__reload" onClick={() => void load()} disabled={loading || busy || !!publishing} aria-label="Tải lại danh sách" title="Tải lại"><RefreshCw size={15} aria-hidden="true" /></button>
        </div>
        <ListToolbar search={search} onSearch={setSearch} placeholder="Tìm theo tên, mã, khu vực…">
          <select className="ainput" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} aria-label="Lọc theo loại hình">
            <option value="all">Mọi loại hình</option>
            {Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </ListToolbar>
        {loading ? <div className="alist__state">Đang tải danh sách…</div>
          : loadFailed ? <div className="alist__state property-catalog__error-state">Không tải được danh sách nơi lưu trú. Bấm nút tải lại ở góc phải.</div>
          : !items.length ? <div className="alist__state"><BedDouble size={22} aria-hidden="true" /><strong>Chưa có nơi lưu trú</strong><span>Bấm “Thêm nơi lưu trú” để tạo cơ sở đầu tiên, sau đó thêm từng hạng phòng.</span></div>
          : !visible.length ? <div className="alist__state">Không có nơi lưu trú khớp bộ lọc.</div>
          : <ul className="alist__rows">
            {visible.map((item) => {
              const roomCount = item.roomTypes.length;
              const roomsHref = roomCount ? `/admin/hang-phong?property=${encodeURIComponent(item.id)}` : `/admin/hang-phong?property=${encodeURIComponent(item.id)}&room=create`;
              const published = item.publicationStatus === 'published';
              const menu = [
                ...(published && item.path ? [{ label: 'Xem trên website', onSelect: () => { window.open(item.path ?? '/', '_blank', 'noopener'); } }] : []),
                { label: 'Thêm hạng phòng', onSelect: () => router.push(`/admin/hang-phong?property=${encodeURIComponent(item.id)}&room=create`) },
                ...(!published ? [{ label: deleting === item.id ? 'Đang xoá…' : 'Xoá', tone: 'danger' as const, onSelect: () => void remove(item) }] : []),
              ];
              return <li className="arow property-card" key={item.id}>
                <button type="button" className="arow__main" onClick={() => openEdit(item)} disabled={editBusy || !!deleting}>
                  <span className="arow__thumb" style={item.cover ? { backgroundImage: `url(${item.cover.url})` } : undefined}>{!item.cover && <ImagePlus size={18} aria-hidden="true" />}</span>
                  <span className="arow__text">
                    <span className="arow__meta">
                      <StatusBadge small label={STATUS_LABEL[item.publicationStatus] ?? item.publicationStatus} tone={published ? 'success' : 'muted'} />
                      <StatusBadge small label={OPERATING_STATUS_LABEL[item.operatingStatus] ?? item.operatingStatus} tone={item.operatingStatus === 'active' ? 'info' : 'warning'} />
                      {item.featured && <span className="arow__tag">Nổi bật</span>}
                    </span>
                    <strong className="arow__title">{item.title}</strong>
                    <small>{item.code} · {KIND_LABEL[item.kind as keyof typeof KIND_LABEL] ?? item.kind} · {item.area}</small>
                    <small className="property-card__rooms">Hạng phòng ({roomCount}){roomCount ? `: ${item.roomTypes.slice(0, 3).map((room) => room.name).join(' · ')}${roomCount > 3 ? ` · +${roomCount - 3}` : ''}` : ' — chưa có'}</small>
                  </span>
                </button>
                <div className="arow__actions">
                  <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => openEdit(item)} disabled={editBusy || !!deleting || !!publishing}><Pencil size={14} aria-hidden="true" /> Sửa</button>
                  <Link className="abtn abtn--ghost abtn--sm" href={roomsHref}><BedDouble size={14} aria-hidden="true" /> {roomCount ? `Hạng phòng (${roomCount})` : 'Thêm hạng phòng'}</Link>
                  {published
                    ? <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void unpublish(item)} disabled={publishing === item.id}>{publishing === item.id ? 'Đang gỡ…' : 'Gỡ xuất bản'}</button>
                    : <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => void publish(item)} disabled={publishing === item.id}>{publishing === item.id ? 'Đang xuất bản…' : 'Xuất bản'}</button>}
                  <RowMenu label={`Thao tác khác với “${item.title}”`} items={menu} />
                </div>
              </li>;
            })}
          </ul>}
        {!loading && !!items.length && <ListFooter shown={visible.length} total={items.length} unit="nơi lưu trú" />}
      </ListCard>}
      <MediaLibrary
        mode="modal"
        open={inlinePickerOpen}
        onClose={closeInlinePicker}
        onSelect={handleInlineImage}
        initialAltText={editing?.title ?? form.title}
      />
    </section>
  );
}
