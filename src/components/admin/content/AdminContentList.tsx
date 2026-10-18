'use client';

import {
  ArrowLeft,
  ExternalLink,
  FilePenLine,
  ImagePlus,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import { richDocumentToText } from '@/lib/content/rich-document';
import { publicPath } from '@/lib/slug';
import { comboAudienceTag, normalizeComboAudienceTags } from '@/lib/catalog/combo-audience';
import { COMBO_CATEGORIES } from '@/lib/catalog/constants';
import type { ComboAudience, ComboCategory } from '@/data/combos';
import { EMPTY_DOCUMENT, RichTextEditor, type RichDocument } from '@/components/admin/shared/RichTextEditor';
import { AdminSlugField, type GenerateSlugResult } from '@/components/admin/shared/AdminSlugField';
import { AdminSeoPanel } from '@/components/admin/shared/AdminSeoPanel';
import { MediaLibrary, type MediaAsset } from '../media/MediaLibrary';
import { MediaPicker } from '../media/MediaPicker';
import { AlbumEditor } from '../media/AlbumEditor';
import { useAdminToast } from '@/components/admin/toast/useAdminToast';
import { ListCard, ListFooter, ListToolbar, PageActions, StatusTabs, foldText } from '@/components/admin/shared/ListKit';
import { RowMenu, StatusBadge } from '@/components/admin/shared/ui';

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
  /** Create: '' until Generate. Edit: the saved slug (read-only here; Generate changes it). */
  slug: string;
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

const STATUS_TONE: Record<string, string> = {
  draft: 'muted',
  review: 'warning',
  scheduled: 'info',
  published: 'success',
  archived: 'muted',
};

/** Stable form fingerprint for "unsaved changes": the editor adds empty attributes (e.g. textAlign: null) on load. */
const fingerprint = (value: unknown): string => JSON.stringify(value, (_key, entry: unknown) => {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    const kept = Object.entries(entry as Record<string, unknown>).filter(([, inner]) => inner !== null && inner !== undefined);
    return kept.length ? Object.fromEntries(kept) : undefined;
  }
  return entry;
});

const relativeTime = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Date(value).toLocaleDateString('vi-VN');
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
const isAudienceCategory = (id: ComboCategory): id is ComboAudience => !['all', '2n1d', '3n2d'].includes(id);
const COMBO_AUDIENCE_CHOICES = COMBO_CATEGORIES.filter((item): item is typeof item & { id: ComboAudience } => isAudienceCategory(item.id));

function newForm(kind: ContentKind): ContentForm {
  return {
    id: null, title: '', slug: '', excerpt: '', metaTitle: '', metaDescription: '', featured: false, noindex: false,
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
    ...blank, id: item.id, version: item.version, title: item.title, slug: item.slug ?? '', excerpt: item.excerpt ?? '',
    metaTitle: item.metaTitle ?? '', metaDescription: item.metaDescription ?? '', featured: item.featured, noindex: item.noindex,
    body: item.body ?? EMPTY_DOCUMENT, media: item.media ?? [], details: item.details ?? blank.details,
  };
}

export function AdminContentList({ kind, title, routeMode, routeId, basePath: requestedBasePath }: {
  kind: ContentKind; title: string; routeMode?: 'create' | 'edit'; routeId?: string; basePath?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAdminToast();
  const legacyCreate = searchParams.get('action') === 'create';
  const legacyEditId = searchParams.get('edit');
  const basePath = requestedBasePath ?? pathname;
  const createMode = routeMode === 'create' || legacyCreate;
  const editId = routeMode === 'edit' ? routeId ?? null : legacyEditId;
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
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null); setLoadFailed(false);
    try {
      const result = await apiRequest<{ items: ContentItem[] }>(`/content?kind=${kind}&page=1&pageSize=100`);
      setItems(result.items);
    } catch (reason) { setError(errorMessage(reason)); setLoadFailed(true); } finally { setLoading(false); }
  }, [kind]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (routeMode) return;
    if (legacyCreate) router.replace(`${basePath}/them`);
    else if (legacyEditId) router.replace(`${basePath}/${encodeURIComponent(legacyEditId)}`);
  }, [basePath, legacyCreate, legacyEditId, routeMode, router]);

  useEffect(() => {
    if (!createMode) {
      initializedCreateFor.current = null;
      return;
    }
    if (initializedCreateFor.current === pathname) return;
    initializedCreateFor.current = pathname;
    setForm((current) => {
      const next = current ?? newForm(kind);
      setSnapshot(fingerprint(next));
      return next;
    });
    setEditorKey((current) => current + 1);
  }, [createMode, kind, pathname]);

  const goToList = () => router.replace(basePath, { scroll: false });

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
    const next = newForm(kind);
    setForm(next); setSnapshot(fingerprint(next)); setSavedAt(null); setEditorKey((current) => current + 1); setError(null); setNotice(null);
    router.push(`${basePath}/them`, { scroll: false });
  };

  const openEdit = useCallback(async (item: ContentItem, duplicate = false, navigate = true) => {
    setBusy(item.id); setError(null);
    try {
      const full = await apiRequest<ContentItem>(`/content/${encodeURIComponent(item.id)}`);
      const next = formFromItem(full, kind);
      if (duplicate) { next.id = null; next.version = undefined; next.title = `${next.title} (bản sao)`; next.slug = ''; next.media = []; }
      setForm(next); setSnapshot(duplicate ? '' : fingerprint(next)); setSavedAt(duplicate ? null : full.updatedAt); setEditorKey((current) => current + 1);
      setNotice(duplicate ? 'Đã nạp bản sao. Bấm “Lưu bản nháp” để tạo bản ghi mới.' : null);
      if (navigate) {
        router.push(duplicate ? `${basePath}/them` : `${basePath}/${encodeURIComponent(item.id)}`, { scroll: false });
      }
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  }, [basePath, kind, router]);

  useEffect(() => {
    if (!editId || loading || form?.id === editId || busy === editId) return;
    const item = items.find((candidate) => candidate.id === editId);
    if (item) void openEdit(item, false, false);
  }, [busy, editId, form?.id, items, loading, openEdit]);

  const updateForm = <K extends keyof ContentForm>(key: K, value: ContentForm[K]) => {
    // Title edits never touch the slug; only Generate does.
    setForm((current) => current ? { ...current, [key]: value } : current);
  };
  const updateDestination = (patch: Partial<DestinationDetails>) => setForm((current) => current ? { ...current, details: { ...current.details, destination: { ...EMPTY_DESTINATION, ...current.details.destination, ...patch } } } : current);
  const updateCombo = (patch: Partial<ComboDetails>) => setForm((current) => current ? { ...current, details: { ...current.details, combo: { ...EMPTY_COMBO, ...current.details.combo, ...patch } } } : current);
  const updateArticle = (patch: Partial<ArticleDetails>) => setForm((current) => current ? { ...current, details: { ...current.details, article: { ...EMPTY_ARTICLE, ...current.details.article, ...patch } } } : current);

  const persist = async (): Promise<ContentItem | null> => {
    if (!form) return null;
    if (!form.title.trim()) {
      const message = 'Nhập tiêu đề trước khi lưu.';
      setError(message); toast.error(message); return null;
    }
    setSaving(true); setError(null); setNotice(null);
    try {
      let media = form.media;
      const referenced = mediaIdsInDocument(form.body);
      media = media.filter((item) => item.role === 'cover' || item.role === 'gallery' || item.role.startsWith('room:') || referenced.has(item.mediaId));
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
        title: form.title, excerpt: form.excerpt.trim() || undefined, body: form.body,
        metaTitle: form.metaTitle.trim() || undefined, metaDescription: form.metaDescription.trim() || undefined,
        featured: form.featured, noindex: form.noindex, media: media.map(({ mediaId, role, position }) => ({ mediaId, role, position })), details,
      };
      const saved = form.id
        ? await apiRequest<ContentItem>(`/content/${encodeURIComponent(form.id)}`, { method: 'PUT', body: JSON.stringify({ ...common, expectedVersion: form.version }) })
        : await apiRequest<ContentItem>('/content', { method: 'POST', body: JSON.stringify({ kind, ...common, slug: form.slug || undefined }) });
      setItems((current) => form.id ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      const nextForm = formFromItem(saved, kind);
      setForm(nextForm); setSnapshot(fingerprint(nextForm)); setSavedAt(saved.updatedAt);
      setNotice(form.id ? 'Đã lưu thay đổi.' : 'Đã tạo bản nháp.');
      if (!form.id) router.replace(`${basePath}/${encodeURIComponent(saved.id)}`);
      return saved;
    } catch (reason) {
      setError(errorMessage(reason));
      return null;
    } finally { setSaving(false); }
  };

  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void persist(); };

  const applyGenerated = (result: GenerateSlugResult) => {
    setForm((current) => current ? { ...current, slug: result.slug, version: result.version } : current);
    setItems((current) => current.map((item) => item.id === form?.id ? { ...item, slug: result.slug, path: result.path, version: result.version } : item));
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
      setForm((current) => current && current.id === updated.id ? { ...current, version: updated.version } : current);
      setNotice(status === 'published' ? `Đã xuất bản “${item.title}”.` : status === 'archived' ? 'Đã lưu trữ nội dung.' : 'Đã đưa nội dung về bản nháp.');
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  };

  const saveAndPublish = async () => {
    const dirtyNow = !!form && fingerprint(form) !== snapshot;
    const target = dirtyNow || !form?.id ? await persist() : items.find((entry) => entry.id === form.id) ?? null;
    if (target) await setStatus(target, 'published');
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
  const savedItem = form?.id ? items.find((item) => item.id === form.id) : undefined;

  const dirty = !!form && fingerprint(form) !== snapshot;
  const counts = items.reduce<Record<string, number>>((acc, item) => { acc[item.publicationStatus] = (acc[item.publicationStatus] ?? 0) + 1; return acc; }, {});
  const waiting = (counts.review ?? 0) + (counts.scheduled ?? 0);
  const tabs = [
    { key: 'all', label: 'Tất cả', count: items.length },
    { key: 'published', label: 'Đã xuất bản', count: counts.published ?? 0 },
    { key: 'draft', label: 'Bản nháp', count: counts.draft ?? 0 },
    ...(waiting > 0 ? [{ key: 'review', label: 'Chờ duyệt / hẹn giờ', count: waiting }] : []),
    ...((counts.archived ?? 0) > 0 ? [{ key: 'archived', label: 'Lưu trữ', count: counts.archived ?? 0 }] : []),
  ];
  const needle = foldText(search.trim());
  const visible = items.filter((item) => (tab === 'all' || item.publicationStatus === tab || (tab === 'review' && item.publicationStatus === 'scheduled'))
    && (!needle || foldText(`${item.title} ${item.path ?? ''}`).includes(needle)));
  const savedStatus = savedItem?.publicationStatus ?? 'draft';
  const kindLower = KIND_LABEL[kind].toLowerCase();

  return (
    <section className={`crm content-manager${editorMode ? ' content-manager--editing' : ''}`}>
      {!editorMode && <PageActions>
        <button type="button" className="abtn abtn--primary" onClick={openCreate} disabled={saving || !!busy}><Plus size={16} aria-hidden="true" /> Tạo {kindLower}</button>
      </PageActions>}
      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
      {notice && <p className="settings-screen__message settings-screen__message--success" role="status">{notice}</p>}

      {editorMode && form && (
        <form className="cedit" onSubmit={save}>
          <div className="cedit__bar">
            <button type="button" className="cedit__back" onClick={closeEditor} disabled={saving} aria-label="Quay lại danh sách"><ArrowLeft size={18} aria-hidden="true" /></button>
            <div className="cedit__crumb">
              <span>{title}</span>
              <h2>{form.title.trim() || (form.id ? 'Chưa đặt tiêu đề' : `Tạo ${kindLower}`)}</h2>
            </div>
            <span className={`cedit__state${dirty ? ' cedit__state--dirty' : ''}`}>
              {saving ? 'Đang lưu…' : dirty ? 'Có thay đổi chưa lưu' : savedAt ? `Đã lưu · ${relativeTime(savedAt)}` : 'Chưa lưu'}
            </span>
            <div className="cedit__actions">
              {savedStatus === 'published' && savedItem?.path && <a className="abtn abtn--ghost" href={savedItem.path} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> Xem trên web</a>}
              <button type="submit" className={`abtn ${savedStatus === 'published' ? 'abtn--primary' : 'abtn--ghost'}`} disabled={saving}>{saving ? 'Đang lưu…' : form.id ? (savedStatus === 'published' ? 'Cập nhật' : 'Lưu nháp') : 'Lưu bản nháp'}</button>
              {savedStatus !== 'published' && <button type="button" className="abtn abtn--primary" onClick={() => void saveAndPublish()} disabled={saving || (!!form.id && busy === form.id)}>Xuất bản</button>}
            </div>
          </div>

          <div className="cedit__grid">
            <div className="cedit__main">
              <input className="cedit__title" value={form.title} onChange={(event) => updateForm('title', event.target.value)} required maxLength={300} placeholder={`Tiêu đề ${kindLower}…`} aria-label="Tiêu đề *" />
              <label className="afield"><span>Tóm tắt</span><textarea className="ainput" rows={2} value={form.excerpt} onChange={(event) => updateForm('excerpt', event.target.value)} maxLength={500} placeholder="1–2 câu hiện trên thẻ danh sách và dùng làm mô tả dự phòng" /></label>

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
              <fieldset className="content-editor__wide content-editor__audience"><legend>Nhóm khách phù hợp</legend><p className="ahint">Chọn các nhóm đã xác minh cho combo này. Các nút lọc ngoài website sử dụng chính các lựa chọn này.</p><div className="content-editor__audience-options">{COMBO_AUDIENCE_CHOICES.map((choice) => <label key={choice.id}><input type="checkbox" checked={normalizeComboAudienceTags(combo.audienceTags).includes(choice.id)} onChange={(event) => {
                const selected = normalizeComboAudienceTags(combo.audienceTags).filter((id) => id !== choice.id);
                if (event.target.checked) selected.push(choice.id);
                updateCombo({ audienceTags: [...combo.audienceTags.filter((tag) => !comboAudienceTag(tag)), ...selected] });
              }} /><span>{choice.label}</span></label>)}</div></fieldset>
              {combo.audienceTags.some((tag) => !comboAudienceTag(tag)) && <div className="content-editor__wide"><StringListEditor label="Nhãn khách bổ sung" items={combo.audienceTags.filter((tag) => !comboAudienceTag(tag))} onChange={(custom) => updateCombo({ audienceTags: [...normalizeComboAudienceTags(combo.audienceTags), ...custom] })} placeholder="Nhãn nội bộ không dùng để lọc" /><p className="ahint">Nhãn cũ được giữ nguyên để không mất dữ liệu; chỉ bốn nhóm ở trên tham gia bộ lọc public.</p></div>}
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

              <RichTextEditor
                key={editorKey}
                value={form.body}
                label="Nội dung"
                hint="Chèn ảnh bằng nút ảnh trên thanh công cụ; nút AI tạo bản nháp để bạn duyệt trước khi đưa vào bài."
                onChange={(body) => updateForm('body', body)}
                onPickImage={pickInlineImage}
                aiContext={{ kind, title: form.title, excerpt: form.excerpt, currentContentId: form.id }}
                onAiGenerated={(generated) => setForm((current) => current ? {
                  ...current,
                  title: generated.title,
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
              {kind === 'destination' && <div className="content-editor__section"><AlbumEditor label="Album điểm đến" items={form.media.filter((item) => item.role === 'gallery').map((item) => ({ mediaId: item.mediaId, url: item.url }))} onChange={(albumItems) => setForm((current) => current ? { ...current, media: [...current.media.filter((item) => item.role !== 'gallery'), ...albumItems.map((item, position) => ({ mediaId: item.mediaId, url: item.url, role: 'gallery', position: position + 1 }))] } : current)} /></div>}
            </div>

            <aside className="cedit__side">
              <section className="cside">
                <h3>Xuất bản</h3>
                <div className="cside__row"><span>Trạng thái</span><StatusBadge small label={STATUS_LABEL[savedStatus] ?? savedStatus} tone={STATUS_TONE[savedStatus] ?? 'muted'} /></div>
                {form.id && form.version
                  ? <AdminSlugField
                      mode="edit" kind={kind} title={form.title} value={form.slug || null}
                      currentPath={savedItem?.path ?? null} published={savedStatus === 'published'}
                      expectedVersion={form.version} endpointBase={`/content/${encodeURIComponent(form.id)}`}
                      onGenerated={applyGenerated} disabled={saving}
                    />
                  : <AdminSlugField
                      mode="create" kind={kind} title={form.title} value={form.slug}
                      onChange={(slug) => setForm((current) => current ? { ...current, slug } : current)}
                      previewEndpoint="/content/slug/preview" previewBody={{ kind }} disabled={saving}
                    />}
                <label className="atoggle cside__toggle"><input type="checkbox" checked={form.featured} onChange={(event) => updateForm('featured', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Nổi bật</strong><small>Ưu tiên hiển thị khi đã xuất bản.</small></span></label>
                <label className="atoggle cside__toggle"><input type="checkbox" checked={form.noindex} onChange={(event) => updateForm('noindex', event.target.checked)} /><span className="atoggle__track"><span className="atoggle__thumb" /></span><span className="atoggle__text"><strong>Ẩn khỏi Google</strong><small>Không cho công cụ tìm kiếm lập chỉ mục trang này.</small></span></label>
                {savedStatus === 'published' && savedItem && <button type="button" className="abtn abtn--ghost abtn--sm cside__full" onClick={() => void setStatus(savedItem, 'draft')} disabled={busy === savedItem.id}>Gỡ xuống, đưa về nháp</button>}
              </section>

              <section className="cside">
                <h3>Ảnh đại diện</h3>
                <MediaPicker
                  value={currentCover?.url}
                  mediaId={currentCover?.mediaId}
                  label={currentCover ? 'Đổi ảnh' : 'Chọn ảnh đại diện'}
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
                <p className="ahint"><ImagePlus size={14} aria-hidden="true" /> Bắt buộc để xuất bản. Ảnh mới được chuyển WebP khi lưu.</p>
              </section>

              {kind === 'article' && article && <section className="cside">
                <h3>Thông tin bài viết</h3>
                <label className="afield"><span>Tác giả</span><input className="ainput" value={article.authorName ?? ''} onChange={(event) => updateArticle({ authorName: event.target.value })} maxLength={160} /></label>
                <label className="afield"><span>Thời gian đọc (phút)</span><input className="ainput" type="number" min="1" value={article.readMinutes ?? ''} onChange={(event) => updateArticle({ readMinutes: event.target.value ? Number(event.target.value) : null })} /></label>
              </section>}

              <section className="cside">
                <h3>SEO</h3>
                <label className="afield"><span>Tiêu đề SEO * <small className="cside__count">{form.metaTitle.length}/60</small></span><input className="ainput" value={form.metaTitle} onChange={(event) => updateForm('metaTitle', event.target.value)} maxLength={200} placeholder="Khoảng 50–60 ký tự" /></label>
                <label className="afield"><span>Mô tả SEO * <small className="cside__count">{form.metaDescription.length}/160</small></span><textarea className="ainput" rows={3} value={form.metaDescription} onChange={(event) => updateForm('metaDescription', event.target.value)} maxLength={320} placeholder="Khoảng 120–160 ký tự" /></label>
                <AdminSeoPanel
                  kind={kind} title={form.title} metaTitle={form.metaTitle} metaDescription={form.metaDescription}
                  path={form.slug ? savedItem?.path ?? publicPath(kind, form.slug) : null}
                  hasCover={!!currentCover} bodyText={richDocumentToText(form.body)} noindex={form.noindex}
                  schema={{ itineraryDays: combo?.days.filter((day) => day.title.trim() || day.activities.some((activity) => activity.text.trim())).length, authorName: article?.authorName }}
                />
              </section>
            </aside>
          </div>
        </form>
      )}

      {editorMode && !form && <div className="acard apending">{loading || busy ? 'Đang tải dữ liệu…' : 'Không tìm thấy nội dung cần chỉnh sửa.'}</div>}
      {!editorMode && <ListCard>
        <div className="alist__head">
          <StatusTabs tabs={tabs} value={tab} onChange={setTab} />
          <button type="button" className="abtn abtn--ghost abtn--sm alist__reload" onClick={() => void load()} disabled={loading || saving || !!busy} aria-label="Tải lại danh sách" title="Tải lại"><RefreshCw size={15} aria-hidden="true" /></button>
        </div>
        <ListToolbar search={search} onSearch={setSearch} placeholder={`Tìm ${kindLower} theo tiêu đề hoặc đường dẫn…`} />
        {loading ? <div className="alist__state">Đang tải dữ liệu…</div>
          : loadFailed ? <div className="alist__state">Không tải được nội dung. Bấm nút tải lại ở góc phải.</div>
          : !items.length ? <div className="alist__state"><FilePenLine size={22} aria-hidden="true" /><strong>Chưa có {kindLower} nào</strong><span>Bấm “Tạo {kindLower}” ở góc trên để bắt đầu.</span></div>
          : !visible.length ? <div className="alist__state">Không có {kindLower} khớp bộ lọc.</div>
          : <ul className="alist__rows">
            {visible.map((item) => {
              const cover = item.media.find((media) => media.role === 'cover');
              const published = item.publicationStatus === 'published';
              const menu = [
                { label: 'Sửa', onSelect: () => void openEdit(item) },
                { label: 'Nhân bản', onSelect: () => void openEdit(item, true) },
                ...(published && item.path ? [{ label: 'Xem trên website', onSelect: () => { window.open(item.path ?? '/', '_blank', 'noopener'); } }] : []),
                ...(item.publicationStatus !== 'draft' ? [{ label: 'Đưa về nháp', onSelect: () => void setStatus(item, 'draft') }] : []),
                ...(published ? [{ label: 'Lưu trữ', onSelect: () => void setStatus(item, 'archived') }] : []),
                ...(!published ? [{ label: 'Xoá', tone: 'danger' as const, onSelect: () => void remove(item) }] : []),
              ];
              return <li className="arow content-manager__item" key={item.id}>
                <button type="button" className="arow__main" onClick={() => void openEdit(item)} disabled={busy === item.id}>
                  <span className="arow__thumb" style={cover ? { backgroundImage: `url(${cover.url})` } : undefined}>{!cover && <FilePenLine size={18} aria-hidden="true" />}</span>
                  <span className="arow__text">
                    <span className="arow__meta"><span className="settings-item__meta"><StatusBadge small label={STATUS_LABEL[item.publicationStatus] ?? item.publicationStatus} tone={STATUS_TONE[item.publicationStatus] ?? 'muted'} /></span>{!cover && <span className="arow__warn">Chưa có ảnh đại diện</span>}</span>
                    <strong className="arow__title">{item.title}</strong>
                    <small>{item.path ?? 'Chưa tạo đường dẫn'} · Sửa {relativeTime(item.updatedAt)}</small>
                  </span>
                </button>
                <div className="arow__actions">
                  {published
                    ? item.path && <a className="abtn abtn--ghost abtn--sm" href={item.path} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true" /> Xem</a>
                    : <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => void setStatus(item, 'published')} disabled={busy === item.id}>{busy === item.id ? 'Đang xử lý…' : 'Xuất bản'}</button>}
                  <RowMenu label={`Thao tác với “${item.title}”`} items={menu} />
                </div>
              </li>;
            })}
          </ul>}
        {!loading && !!items.length && <ListFooter shown={visible.length} total={items.length} unit={kindLower} />}
      </ListCard>}
    </section>
  );
}
