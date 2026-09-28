'use client';

import {
  Archive,
  ArrowLeft,
  Copy,
  FilePenLine,
  ImagePlus,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import { slugFromTitle, withTitle, type SlugMode } from '@/lib/slug';
import { EMPTY_DOCUMENT, RichTextEditor, type RichDocument } from '@/components/admin/shared/RichTextEditor';
import { AdminSlugField } from '@/components/admin/shared/AdminSlugField';
import { MediaLibrary, type MediaAsset } from '../media/MediaLibrary';
import { MediaPicker } from '../media/MediaPicker';

type ContentKind = 'stay' | 'combo' | 'destination' | 'article' | 'page';
type MediaRef = { mediaId: string; role: string; position: number; url: string };
type DestinationDetails = { category: string; location: string | null; mapX: number | null; mapY: number | null };
type ComboActivity = { text: string; timeText?: string | null };
type ComboDay = { dayNo: number; title: string; timeRange?: string | null; activities: ComboActivity[] };
type ComboDeparture = {
  departureDate: string;
  returnDate: string;
  capacity: number;
  adultPriceVnd: number;
  childPriceVnd?: number | null;
  status?: string;
};
type ComboDetails = {
  code: string;
  durationDays: number;
  durationNights: number;
  pricingUnit: string;
  area: string | null;
  audienceTags: string[];
  inclusions: string[];
  exclusions: string[];
  terms: string[];
  destinationIds: string[];
  days: ComboDay[];
  departures: ComboDeparture[];
};
type ArticleDetails = { authorName: string | null; readMinutes: number | null };
type ContentDetails = {
  destination?: DestinationDetails;
  combo?: ComboDetails;
  article?: ArticleDetails;
};
type ContentItem = {
  id: string;
  kind: ContentKind;
  title: string;
  slug: string | null;
  path: string | null;
  excerpt: string | null;
  body?: RichDocument | null;
  publicationStatus: string;
  publishAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  featured: boolean;
  version: number;
  updatedAt: string;
  media: MediaRef[];
  details?: ContentDetails;
};
type ContentForm = {
  id: string | null;
  version?: number;
  title: string;
  slug: string;
  slugMode: SlugMode;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  featured: boolean;
  noindex: boolean;
  body: RichDocument;
  media: MediaRef[];
  details: ContentDetails;
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Bản nháp',
  review: 'Chờ duyệt',
  scheduled: 'Đã hẹn',
  published: 'Đã xuất bản',
  archived: 'Lưu trữ',
};

const KIND_LABEL: Record<ContentKind, string> = {
  stay: 'Phòng nghỉ',
  combo: 'Combo du lịch',
  destination: 'Điểm đến',
  article: 'Bài viết',
  page: 'Chuyên trang',
};

const EMPTY_DESTINATION: DestinationDetails = { category: 'Tự nhiên', location: '', mapX: null, mapY: null };
const EMPTY_COMBO: ComboDetails = {
  code: '', durationDays: 2, durationNights: 1, pricingUnit: 'person', area: '', audienceTags: [],
  inclusions: [], exclusions: [], terms: [], destinationIds: [],
  days: [{ dayNo: 1, title: 'Khởi hành và nhận phòng', timeRange: '', activities: [{ text: '', timeText: '' }] }],
  departures: [],
};
const EMPTY_ARTICLE: ArticleDetails = { authorName: '', readMinutes: null };

function newForm(kind: ContentKind): ContentForm {
  return {
    id: null, title: '', slug: '', slugMode: 'auto', excerpt: '', metaTitle: '', metaDescription: '', featured: false, noindex: false,
    body: EMPTY_DOCUMENT, media: [],
    details: kind === 'destination'
      ? { destination: { ...EMPTY_DESTINATION } }
      : kind === 'combo'
        ? { combo: { ...EMPTY_COMBO, days: EMPTY_COMBO.days.map((day) => ({ ...day, activities: [...day.activities] })) } }
        : { article: { ...EMPTY_ARTICLE } },
  };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function StringListEditor({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  return <section className="content-editor__list-editor">
    <div className="content-editor__subhead"><strong>{label}</strong><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => onChange([...items, ''])}><Plus size={14} aria-hidden="true" /> Thêm mục</button></div>
    {!items.length && <p className="ahint">Chưa có mục nào.</p>}
    {items.map((item, index) => <div className="settings-form__string-row" key={`${label}-${index}`}>
      <input className="ainput" aria-label={`${label}, mục ${index + 1}`} value={item} placeholder={placeholder} onChange={(event) => onChange(items.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} />
      <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Xóa ${label.toLowerCase()} mục ${index + 1}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} aria-hidden="true" /> Xóa</button>
    </div>)}
  </section>;
}

function mediaIdsInDocument(document: RichDocument): Set<string> {
  const ids = new Set<string>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const record = node as { attrs?: { mediaId?: unknown }; content?: unknown[] };
    if (typeof record.attrs?.mediaId === 'string') ids.add(record.attrs.mediaId);
    record.content?.forEach(visit);
  };
  visit(document);
  return ids;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Mở /admin và đăng nhập lại.';
  if (reason instanceof ApiError && reason.payload && typeof reason.payload === 'object') {
    const payload = reason.payload as { message?: unknown; problems?: unknown };
    const problems = Array.isArray(payload.problems) ? payload.problems.filter((item): item is string => typeof item === 'string') : [];
    if (problems.length) return `${String(payload.message ?? 'Chưa thể thực hiện')}: ${problems.join(' · ')}`;
  }
  return reason instanceof Error ? reason.message : 'Không thể hoàn tất thao tác.';
}

function formFromItem(item: ContentItem, kind: ContentKind): ContentForm {
  const blank = newForm(kind);
  return {
    ...blank, id: item.id, version: item.version, title: item.title, slug: item.slug ?? '', slugMode: 'manual', excerpt: item.excerpt ?? '',
    metaTitle: item.metaTitle ?? '', metaDescription: item.metaDescription ?? '', featured: item.featured, noindex: item.noindex,
    body: item.body ?? EMPTY_DOCUMENT, media: item.media ?? [], details: item.details ?? blank.details,
  };
}

export function AdminContentList({ kind, title }: { kind: ContentKind; title: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createMode = searchParams.get('action') === 'create';
  const editId = searchParams.get('edit');
  const editorMode = createMode || Boolean(editId);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ContentForm | null>(null);
  const [inlinePickerOpen, setInlinePickerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const inlineInsert = useRef<((attrs: { src: string; alt?: string; mediaId?: string }) => void) | null>(null);
  const initializedCreateFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setLoadFailed(false);
    try {
      const result = await apiRequest<{ items: ContentItem[] }>(`/content?kind=${kind}&page=1&pageSize=100`);
      setItems(result.items);
    } catch (reason) { setError(errorMessage(reason)); setLoadFailed(true); } finally { setLoading(false); }
  }, [kind]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!createMode) {
      initializedCreateFor.current = null;
      return;
    }
    if (initializedCreateFor.current === pathname) return;
    initializedCreateFor.current = pathname;
    setForm((current) => current ?? newForm(kind));
    setEditorKey((current) => current + 1);
  }, [createMode, kind, pathname]);

  const goToList = () => router.replace(pathname, { scroll: false });

  const closeEditor = () => {
    setForm(null);
    inlineInsert.current = null;
    setInlinePickerOpen(false);
    setError(null);
    setNotice(null);
    goToList();
  };

  const openCreate = () => {
    initializedCreateFor.current = pathname;
    setForm(newForm(kind)); setEditorKey((current) => current + 1); setError(null); setNotice(null);
    router.push(`${pathname}?action=create`, { scroll: false });
  };

  const openEdit = useCallback(async (item: ContentItem, duplicate = false, navigate = true) => {
    setBusy(item.id); setError(null);
    try {
      const full = await apiRequest<ContentItem>(`/content/${encodeURIComponent(item.id)}`);
      const next = formFromItem(full, kind);
      if (duplicate) { next.id = null; next.version = undefined; next.title = `${next.title} (bản sao)`; next.slug = slugFromTitle(next.title); next.slugMode = 'auto'; next.media = []; }
      setForm(next); setEditorKey((current) => current + 1);
      setNotice(duplicate ? 'Đã nạp bản sao. Bấm “Lưu bản nháp” để tạo bản ghi mới.' : null);
      if (navigate) {
        router.push(duplicate ? `${pathname}?action=create` : `${pathname}?edit=${encodeURIComponent(item.id)}`, { scroll: false });
      }
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  }, [kind, pathname, router]);

  useEffect(() => {
    if (!editId || loading || form?.id === editId || busy === editId) return;
    const item = items.find((candidate) => candidate.id === editId);
    if (item) void openEdit(item, false, false);
  }, [busy, editId, form?.id, items, loading, openEdit]);

  const updateForm = <K extends keyof ContentForm>(key: K, value: ContentForm[K]) => {
    setForm((current) => current ? key === 'title'
      ? withTitle(current, value as string, !current.id)
      : { ...current, [key]: value } : current);
  };
  const updateDestination = (patch: Partial<DestinationDetails>) => setForm((current) => current ? { ...current, details: { ...current.details, destination: { ...EMPTY_DESTINATION, ...current.details.destination, ...patch } } } : current);
  const updateCombo = (patch: Partial<ComboDetails>) => setForm((current) => current ? { ...current, details: { ...current.details, combo: { ...EMPTY_COMBO, ...current.details.combo, ...patch } } } : current);
  const updateArticle = (patch: Partial<ArticleDetails>) => setForm((current) => current ? { ...current, details: { ...current.details, article: { ...EMPTY_ARTICLE, ...current.details.article, ...patch } } } : current);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!form) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      let media = form.media;
      const referenced = mediaIdsInDocument(form.body);
      media = media.filter((item) => item.role === 'cover' || referenced.has(item.mediaId));
      const details = kind === 'combo' && form.details.combo
        ? {
            ...form.details,
            combo: {
              ...form.details.combo,
              // A partially filled optional departure is not sent to the API;
              // the draft can still be saved and completed later.
              departures: form.details.combo.departures.filter((departure) => departure.departureDate && departure.returnDate),
            },
          }
        : form.details;
      const common = {
        title: form.title, slug: form.id ? form.slug : form.slug.trim() || undefined, excerpt: form.excerpt.trim() || undefined, body: form.body,
        metaTitle: form.metaTitle.trim() || undefined, metaDescription: form.metaDescription.trim() || undefined,
        featured: form.featured, noindex: form.noindex, media: media.map(({ mediaId, role, position }) => ({ mediaId, role, position })), details,
      };
      const saved = form.id
        ? await apiRequest<ContentItem>(`/content/${encodeURIComponent(form.id)}`, { method: 'PUT', body: JSON.stringify({ ...common, expectedVersion: form.version }) })
        : await apiRequest<ContentItem>('/content', { method: 'POST', body: JSON.stringify({ kind, ...common }) });
      setItems((current) => form.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setForm(null); setNotice(form.id ? 'Đã lưu thay đổi và tạo revision mới.' : 'Đã tạo bản nháp thật trong PostgreSQL.');
      goToList();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally { setSaving(false); }
  };

  const pickInlineImage = (insert: (attrs: { src: string; alt?: string; mediaId?: string }) => void) => {
    inlineInsert.current = insert;
    setInlinePickerOpen(true);
  };

  const handleInlineImage = (asset: MediaAsset) => {
    if (!inlineInsert.current || !form) return;
    inlineInsert.current({ src: asset.url, alt: asset.altText ?? asset.originalFilename, mediaId: asset.id });
    setForm((current) => current ? {
      ...current,
      media: current.media.some((item) => item.mediaId === asset.id && item.role === 'inline')
        ? current.media
        : [...current.media, { mediaId: asset.id, role: 'inline', position: current.media.length, url: asset.url }],
    } : current);
    inlineInsert.current = null;
    setInlinePickerOpen(false);
  };

  const setStatus = async (item: ContentItem, status: string) => {
    setBusy(item.id); setError(null); setNotice(null);
    try {
      const updated = await apiRequest<ContentItem>(`/content/${encodeURIComponent(item.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, expectedVersion: item.version }) });
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setNotice(status === 'published' ? `Đã xuất bản “${item.title}”.` : status === 'archived' ? 'Đã lưu trữ nội dung.' : 'Đã đưa nội dung về bản nháp.');
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  };

  const remove = async (item: ContentItem) => {
    if (typeof window !== 'undefined' && !window.confirm(`Xoá bản nháp “${item.title}”?`)) return;
    setBusy(item.id); setError(null);
    try {
      await apiRequest(`/content/${encodeURIComponent(item.id)}?expectedVersion=${item.version}`, { method: 'DELETE' });
      setItems((current) => current.filter((entry) => entry.id !== item.id)); setNotice('Đã xoá nội dung chưa xuất bản.');
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  };

  const combo = form?.details.combo;
  const destination = form?.details.destination;
  const article = form?.details.article;
  const currentCover = form?.media.find((item) => item.role === 'cover');

  return (
    <section className="crm content-manager">
      {!editorMode && <div className="settings-screen__head">
        <div><h2>{title}</h2><p className="ahint">Dữ liệu thật từ API CMS và PostgreSQL. Có thể tạo, sửa, lưu revision, quản lý media và xuất bản từ màn này.</p></div>
        <div className="content-manager__head-actions">
          <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={loading || saving || !!busy}><RefreshCw size={15} aria-hidden="true" /> Tải lại</button>
          <button type="button" className="abtn abtn--primary" onClick={openCreate} disabled={saving || !!busy}><Plus size={16} aria-hidden="true" /> Tạo mới</button>
        </div>
      </div>}
      {editorMode && <div className="admin-form-page__head">
        <button type="button" className="abtn abtn--ghost admin-form-page__back" onClick={closeEditor} disabled={saving}>
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại danh sách
        </button>
        <div className="admin-form-page__title">
          <h2>{form?.id ? 'Chỉnh sửa' : 'Tạo mới'} {title.toLowerCase()}</h2>
          <p className="ahint">Soạn thảo trên trang riêng; nội dung được lưu theo trạng thái bản nháp, không tự xuất bản.</p>
        </div>
      </div>}
      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
      {notice && <p className="settings-screen__message settings-screen__message--success" role="status">{notice}</p>}

      {editorMode && form && (
        <form className="acard content-editor" onSubmit={save}>
          <div className="content-editor__head"><div><h3>{form.id ? 'Chỉnh sửa' : 'Tạo'} {KIND_LABEL[kind].toLowerCase()}</h3><p className="ahint">Lưu lần đầu là bản nháp. Muốn đưa lên website, hãy bổ sung SEO, ảnh đại diện và nội dung rồi bấm “Xuất bản”.</p></div><button type="button" className="abtn abtn--ghost abtn--sm" onClick={closeEditor} disabled={saving}>Đóng</button></div>
          <div className="content-editor__grid">
            <label className="afield content-editor__wide"><span>Tiêu đề *</span><input className="ainput" value={form.title} onChange={(event) => updateForm('title', event.target.value)} required maxLength={300} placeholder="Tiêu đề hiển thị trên website" /></label>
            <AdminSlugField
              title={form.title} value={form.slug} originalValue={form.id ? items.find((item) => item.id === form.id)?.slug : null}
              mode={form.id ? 'edit' : 'create'} kind={kind}
              onChange={(slug) => setForm((current) => current ? { ...current, slug, slugMode: 'manual' } : current)}
              disabled={saving}
            />
            <label className="afield"><span>Hiển thị nổi bật</span><span className="atoggle content-editor__toggle"><input type="checkbox" checked={form.featured} onChange={(event) => updateForm('featured', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Đưa lên vị trí nổi bật</strong><small>Chỉ áp dụng khi nội dung đã xuất bản.</small></span></span></label>
            <label className="afield content-editor__wide"><span>Tóm tắt</span><textarea className="ainput" value={form.excerpt} onChange={(event) => updateForm('excerpt', event.target.value)} maxLength={500} placeholder="Mô tả ngắn dùng cho thẻ danh sách và SEO fallback" /></label>
          </div>

          {kind === 'destination' && destination && <div className="content-editor__section"><h4>Thông tin điểm đến</h4><div className="content-editor__grid">
            <label className="afield"><span>Nhóm điểm đến *</span><input className="ainput" value={destination.category} onChange={(event) => updateDestination({ category: event.target.value })} required maxLength={100} placeholder="Ví dụ: Sinh thái" /></label>
            <label className="afield"><span>Khu vực</span><input className="ainput" value={destination.location ?? ''} onChange={(event) => updateDestination({ location: event.target.value })} maxLength={160} placeholder="Ví dụ: Ninh Bình" /></label>
            <label className="afield"><span>Tọa độ X</span><input className="ainput" type="number" step="0.001" value={destination.mapX ?? ''} onChange={(event) => updateDestination({ mapX: event.target.value ? Number(event.target.value) : null })} /></label>
            <label className="afield"><span>Tọa độ Y</span><input className="ainput" type="number" step="0.001" value={destination.mapY ?? ''} onChange={(event) => updateDestination({ mapY: event.target.value ? Number(event.target.value) : null })} /></label>
          </div></div>}

          {kind === 'combo' && combo && <div className="content-editor__section"><h4>Thông tin combo và lịch trình</h4><div className="content-editor__grid">
            <label className="afield"><span>Mã combo *</span><input className="ainput" value={combo.code} onChange={(event) => updateCombo({ code: event.target.value.toUpperCase() })} required maxLength={80} placeholder="DV-COMBO-01" /></label>
            <label className="afield"><span>Khu vực</span><input className="ainput" value={combo.area ?? ''} onChange={(event) => updateCombo({ area: event.target.value })} maxLength={160} placeholder="Cúc Phương · Tràng An" /></label>
            <label className="afield"><span>Số ngày *</span><input className="ainput" type="number" min="1" value={combo.durationDays} onChange={(event) => updateCombo({ durationDays: Number(event.target.value) || 1 })} required /></label>
            <label className="afield"><span>Số đêm *</span><input className="ainput" type="number" min="0" value={combo.durationNights} onChange={(event) => updateCombo({ durationNights: Number(event.target.value) || 0 })} required /></label>
            <label className="afield"><span>Đơn vị giá</span><select className="ainput" value={combo.pricingUnit} onChange={(event) => updateCombo({ pricingUnit: event.target.value })}><option value="person">/ người</option><option value="booking">/ booking</option><option value="room">/ phòng</option></select></label>
            <div className="content-editor__wide"><StringListEditor label="Nhóm khách" items={combo.audienceTags} onChange={(audienceTags) => updateCombo({ audienceTags })} placeholder="Ví dụ: Gia đình" /></div>
            <div className="content-editor__wide content-editor__days"><div className="content-editor__subhead"><div><strong>Lịch trình ({combo.days.length} ngày)</strong><p className="ahint">Mỗi ngày có tiêu đề, khung giờ và các hoạt động riêng.</p></div><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => updateCombo({ days: [...combo.days, { dayNo: combo.days.length + 1, title: '', timeRange: '', activities: [] }] })}><Plus size={14} aria-hidden="true" /> Thêm ngày</button></div>
              {combo.days.map((day, dayIndex) => <section className="content-editor__subsection" key={`day-${dayIndex}`}>
                <div className="content-editor__subhead"><strong>Ngày {day.dayNo || dayIndex + 1}</strong><div className="content-editor__row-actions"><button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Chuyển ngày ${dayIndex + 1} lên`} disabled={dayIndex === 0} onClick={() => updateCombo({ days: moveItem(combo.days, dayIndex, dayIndex - 1).map((item, index) => ({ ...item, dayNo: index + 1 })) })}>↑</button><button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Chuyển ngày ${dayIndex + 1} xuống`} disabled={dayIndex === combo.days.length - 1} onClick={() => updateCombo({ days: moveItem(combo.days, dayIndex, dayIndex + 1).map((item, index) => ({ ...item, dayNo: index + 1 })) })}>↓</button><button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => updateCombo({ days: combo.days.filter((_, index) => index !== dayIndex).map((item, index) => ({ ...item, dayNo: index + 1 })) })}><Trash2 size={14} aria-hidden="true" /> Xóa ngày</button></div></div>
                <div className="content-editor__grid"><label className="afield"><span>Tiêu đề ngày</span><input className="ainput" value={day.title} onChange={(event) => updateCombo({ days: combo.days.map((item, index) => index === dayIndex ? { ...item, title: event.target.value } : item) })} placeholder="Ví dụ: Khám phá điểm đến" /></label><label className="afield"><span>Khung giờ (tuỳ chọn)</span><input className="ainput" value={day.timeRange ?? ''} onChange={(event) => updateCombo({ days: combo.days.map((item, index) => index === dayIndex ? { ...item, timeRange: event.target.value } : item) })} placeholder="Ví dụ: Sáng – chiều" /></label></div>
                <StringListEditor label="Hoạt động trong ngày" items={day.activities.map((activity) => activity.text)} onChange={(activities) => updateCombo({ days: combo.days.map((item, index) => index === dayIndex ? { ...item, activities: activities.map((text, activityIndex) => ({ text, timeText: item.activities[activityIndex]?.timeText ?? '' })) } : item) })} placeholder="Nhập một hoạt động" />
              </section>)}
            </div>
            <div className="content-editor__wide content-editor__list-columns"><StringListEditor label="Bao gồm" items={combo.inclusions} onChange={(inclusions) => updateCombo({ inclusions })} placeholder="Một quyền lợi" /><StringListEditor label="Không bao gồm" items={combo.exclusions} onChange={(exclusions) => updateCombo({ exclusions })} placeholder="Một khoản không bao gồm" /></div>
            <div className="content-editor__wide"><StringListEditor label="Điều khoản" items={combo.terms} onChange={(terms) => updateCombo({ terms })} placeholder="Một điều khoản" /></div>
          </div><div className="content-editor__subsection"><div className="content-editor__subhead"><div><strong>Lịch khởi hành đầu tiên (tuỳ chọn)</strong><p className="ahint">Thêm ngày và giá để combo có thể hiển thị giá trên website.</p></div></div><div className="content-editor__grid">
            <label className="afield"><span>Ngày đi</span><input className="ainput" type="date" value={combo.departures[0]?.departureDate ?? ''} onChange={(event) => updateCombo({ departures: [{ ...(combo.departures[0] ?? { returnDate: '', capacity: 10, adultPriceVnd: 0 }), departureDate: event.target.value }] })} /></label>
            <label className="afield"><span>Ngày về</span><input className="ainput" type="date" value={combo.departures[0]?.returnDate ?? ''} onChange={(event) => updateCombo({ departures: [{ ...(combo.departures[0] ?? { departureDate: '', capacity: 10, adultPriceVnd: 0 }), returnDate: event.target.value }] })} /></label>
            <label className="afield"><span>Sức chứa</span><input className="ainput" type="number" min="1" value={combo.departures[0]?.capacity ?? 10} onChange={(event) => updateCombo({ departures: [{ ...(combo.departures[0] ?? { departureDate: '', returnDate: '', adultPriceVnd: 0 }), capacity: Number(event.target.value) || 1 }] })} /></label>
            <label className="afield"><span>Giá người lớn (VND)</span><input className="ainput" type="number" min="0" value={combo.departures[0]?.adultPriceVnd ?? ''} onChange={(event) => updateCombo({ departures: [{ ...(combo.departures[0] ?? { departureDate: '', returnDate: '', capacity: 10 }), adultPriceVnd: Number(event.target.value) || 0 }] })} /></label>
          </div></div></div>}

          {kind === 'article' && article && <div className="content-editor__section"><h4>Thông tin bài viết</h4><div className="content-editor__grid">
            <label className="afield"><span>Tác giả</span><input className="ainput" value={article.authorName ?? ''} onChange={(event) => updateArticle({ authorName: event.target.value })} maxLength={160} /></label>
            <label className="afield"><span>Thời gian đọc (phút)</span><input className="ainput" type="number" min="1" value={article.readMinutes ?? ''} onChange={(event) => updateArticle({ readMinutes: event.target.value ? Number(event.target.value) : null })} /></label>
          </div></div>}

          <RichTextEditor
            key={editorKey}
            value={form.body}
            label="Nội dung chi tiết"
            hint="Editor lưu TipTap JSON và API sẽ sanitise lại trước khi tạo revision. AI chỉ tạo bản xem trước; bạn duyệt rồi nội dung mới vào biểu mẫu."
            onChange={(body) => updateForm('body', body)}
            onPickImage={pickInlineImage}
            aiContext={{ kind, title: form.title, excerpt: form.excerpt, currentContentId: form.id }}
            onAiGenerated={(generated) => setForm((current) => current ? {
              ...withTitle(current, generated.title, !current.id),
              excerpt: generated.excerpt,
              metaTitle: generated.metaTitle,
              metaDescription: generated.metaDescription,
              media: [
                ...current.media,
                ...generated.images
                  .filter((image) => !current.media.some((item) => item.mediaId === image.mediaId))
                  .map((image, index) => ({ mediaId: image.mediaId, role: 'inline', position: current.media.length + index, url: image.url })),
              ],
            } : current)}
          />
          <MediaLibrary
            mode="modal"
            open={inlinePickerOpen}
            onClose={() => {
              inlineInsert.current = null;
              setInlinePickerOpen(false);
            }}
            onSelect={handleInlineImage}
          />

          <div className="content-editor__section"><h4>SEO và ảnh đại diện</h4><div className="content-editor__grid">
            <label className="afield"><span>Tiêu đề SEO *</span><input className="ainput" value={form.metaTitle} onChange={(event) => updateForm('metaTitle', event.target.value)} maxLength={200} placeholder="Tối đa khoảng 60 ký tự" /></label>
            <label className="afield"><span>Mô tả SEO *</span><textarea className="ainput" value={form.metaDescription} onChange={(event) => updateForm('metaDescription', event.target.value)} maxLength={320} placeholder="Mô tả khoảng 120–160 ký tự" /></label>
          </div><div className="content-editor__media">
            <MediaPicker
              value={currentCover?.url}
              mediaId={currentCover?.mediaId}
              label={currentCover ? 'Đổi ảnh đại diện' : 'Chọn ảnh đại diện'}
              uploadAltText={form.title}
              recommendedWidth={kind === 'destination' ? 1200 : 1600}
              recommendedHeight={kind === 'destination' ? 800 : 900}
              recommendedRatio={kind === 'destination' ? 1.5 : 1.78}
              onMediaChange={(asset) => setForm((current) => {
                if (!current) return current;
                const withoutCover = current.media.filter((item) => item.role !== 'cover');
                return asset
                  ? { ...current, media: [...withoutCover, { mediaId: asset.id, role: 'cover', position: 0, url: asset.url }] }
                  : { ...current, media: withoutCover };
              })}
            />
            <p className="ahint"><ImagePlus size={14} aria-hidden="true" /> Ảnh đại diện và ảnh trong bài đều chọn từ Media Library; ảnh mới được chuyển WebP trước khi lưu.</p>
          </div><label className="atoggle content-editor__noindex"><input type="checkbox" checked={form.noindex} onChange={(event) => updateForm('noindex', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Không cho công cụ tìm kiếm lập chỉ mục</strong><small>Dùng khi trang chưa sẵn sàng xuất hiện trên Google; trang chỉ công khai sau khi xuất bản.</small></span></label></div>
          <div className="content-editor__actions"><button type="button" className="abtn abtn--ghost" onClick={closeEditor} disabled={saving}>Hủy</button><button type="submit" className="abtn abtn--primary" disabled={saving}>{saving ? 'Đang lưu…' : form.id ? 'Lưu thay đổi' : 'Lưu bản nháp'}</button></div>
        </form>
      )}

      {editorMode && !form && <div className="acard apending">{loading || busy ? 'Đang tải dữ liệu…' : 'Không tìm thấy nội dung cần chỉnh sửa.'}</div>}
      {!editorMode && (loading ? <div className="acard apending">Đang tải dữ liệu thật…</div> : loadFailed ? <div className="acard apending content-manager__error-state">Không tải được nội dung từ API. Bấm “Tải lại” để thử lại.</div> : !items.length ? <div className="acard apending content-manager__empty"><FilePenLine size={22} aria-hidden="true" /><div><h3>Chưa có {KIND_LABEL[kind].toLowerCase()}</h3><p>Bấm “Tạo mới” để mở editor và tạo bản ghi đầu tiên trong PostgreSQL.</p></div></div> : <div className="settings-screen__list">
        {items.map((item) => <article className="acard settings-item content-manager__item" key={item.id}>
          <div className="settings-item__head"><div><h3>{item.title}</h3><code>{item.path ?? item.slug ?? item.id}</code></div><span className="settings-item__meta">{STATUS_LABEL[item.publicationStatus] ?? item.publicationStatus} · v{item.version}</span></div>
          {item.excerpt && <p>{item.excerpt}</p>}<p className="ahint">Cập nhật {new Date(item.updatedAt).toLocaleString('vi-VN')} · {item.media.length} media</p>
          <div className="content-manager__actions">
            <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void openEdit(item)} disabled={busy === item.id || saving}><FilePenLine size={14} aria-hidden="true" /> Sửa</button>
            <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void openEdit(item, true)} disabled={busy === item.id || saving}><Copy size={14} aria-hidden="true" /> Nhân bản</button>
            {item.publicationStatus === 'published' ? <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void setStatus(item, 'archived')} disabled={busy === item.id}><Archive size={14} aria-hidden="true" /> Lưu trữ</button> : <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => void setStatus(item, 'published')} disabled={busy === item.id}>{busy === item.id ? 'Đang xử lý…' : 'Xuất bản'}</button>}
            {item.publicationStatus !== 'draft' && item.publicationStatus !== 'published' && <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void setStatus(item, 'draft')} disabled={busy === item.id}>Đưa về nháp</button>}
            {item.publicationStatus !== 'published' && <button type="button" className="abtn abtn--danger abtn--sm" onClick={() => void remove(item)} disabled={busy === item.id}><Trash2 size={14} aria-hidden="true" /> Xoá</button>}
          </div>
        </article>)}
      </div>)}
    </section>
  );
}
