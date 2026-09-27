'use client';

import { ArrowLeft, BedDouble, ImagePlus, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import { MediaPicker } from '../media/MediaPicker';
import { MediaLibrary, type MediaAsset } from '../media/MediaLibrary';
import { EMPTY_DOCUMENT, RichTextEditor, type RichDocument } from '../shared/RichTextEditor';

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
  roomTypes: Array<{
    id: string;
    code: string;
    name: string;
    maxOccupancy: number;
    unitCount: number;
    rate: { baseRateVnd: number; weekendRateVnd: number | null; breakfastIncluded: boolean } | null;
  }>;
};

type FormState = {
  title: string;
  code: string;
  kind: string;
  area: string;
  address: string;
  description: string;
  descriptionDocument: RichDocument;
  roomCode: string;
  roomName: string;
  maxAdults: string;
  maxChildren: string;
  bedSummary: string;
  areaSqm: string;
  unitCount: string;
  rateName: string;
  rateVnd: string;
  weekendRateVnd: string;
  breakfastIncluded: boolean;
};

type EditFormState = {
  title: string;
  kind: string;
  area: string;
  address: string;
  slug: string;
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
  code: '',
  kind: 'homestay',
  area: 'Cúc Phương, Ninh Bình',
  address: '',
  description: '',
  descriptionDocument: EMPTY_DOCUMENT,
  roomCode: 'STANDARD',
  roomName: 'Phòng tiêu chuẩn',
  maxAdults: '2',
  maxChildren: '0',
  bedSummary: '1 giường đôi',
  areaSqm: '24',
  unitCount: '1',
  rateName: 'Giá tiêu chuẩn',
  rateVnd: '',
  weekendRateVnd: '',
  breakfastIncluded: false,
};

const EMPTY_EDIT_FORM: EditFormState = {
  title: '',
  kind: 'homestay',
  area: 'Cúc Phương, Ninh Bình',
  address: '',
  slug: '',
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

const KIND_LABEL: Record<string, string> = {
  homestay: 'Homestay',
  lodge: 'Eco Lodge',
  bungalow: 'Bungalow',
  stilt: 'Nhà sàn',
  resort: 'Resort',
  villa: 'Villa',
  glamping: 'Glamping',
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

export function PropertyCatalogScreen() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const createMode = searchParams.get('action') === 'create';
  const editId = searchParams.get('edit');
  const editorMode = createMode || Boolean(editId);
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<PropertyItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [coverMedia, setCoverMedia] = useState<SelectedMedia | null>(null);
  const [editCover, setEditCover] = useState<SelectedMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inlinePickerOpen, setInlinePickerOpen] = useState(false);
  const inlineInsert = useRef<((attrs: { src: string; alt?: string; mediaId?: string }) => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  const fillEditForm = useCallback((item: PropertyItem) => {
    setEditing(item);
    setEditForm({
      title: item.title,
      kind: item.kind,
      area: item.area,
      address: item.address,
      slug: item.slug ?? '',
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
  }, []);

  useEffect(() => {
    if (!editId || editing?.id === editId) return;
    const item = items.find((candidate) => candidate.id === editId);
    if (item) fillEditForm(item);
  }, [editId, editing?.id, fillEditForm, items]);

  const goToList = () => router.replace(pathname, { scroll: false });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCoverMedia(null);
    setEditing(null);
    setError(null);
    setNotice(null);
    router.push(`${pathname}?action=create`, { scroll: false });
  };

  const closeEditor = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCoverMedia(null);
    setEditCover(null);
    setError(null);
    setNotice(null);
    goToList();
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateEdit = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) => {
    setEditForm((current) => ({ ...current, [key]: value }));
  };

  const openEdit = (item: PropertyItem) => {
    fillEditForm(item);
    setError(null);
    setNotice(null);
    router.push(`${pathname}?edit=${encodeURIComponent(item.id)}`, { scroll: false });
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
      setError('Mô tả nơi lưu trú cần ít nhất 40 ký tự.');
      setBusy(false);
      return;
    }
    try {
      await apiRequest<PropertyItem>('/properties', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          code: form.code,
          kind: form.kind,
          area: form.area,
          address: form.address,
          description: form.description,
          descriptionDocument: form.descriptionDocument,
          roomCode: form.roomCode,
          roomName: form.roomName,
          maxAdults: Number(form.maxAdults),
          maxChildren: Number(form.maxChildren),
          bedSummary: form.bedSummary || undefined,
          areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
          unitCount: Number(form.unitCount),
          rateName: form.rateName || undefined,
          rateVnd: Number(form.rateVnd),
          weekendRateVnd: form.weekendRateVnd ? Number(form.weekendRateVnd) : undefined,
          breakfastIncluded: form.breakfastIncluded,
          coverMediaId: coverMedia?.id ?? undefined,
        }),
      });
      setNotice('Đã tạo nơi lưu trú và lưu vào PostgreSQL ở trạng thái bản nháp.');
      setForm(EMPTY_FORM);
      setCoverMedia(null);
      goToList();
      await load();
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
      setError('Mô tả nơi lưu trú không được để trống.');
      setEditBusy(false);
      return;
    }
    try {
      await apiRequest<PropertyItem>(`/properties/${encodeURIComponent(editing.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editForm.title,
          kind: editForm.kind,
          area: editForm.area,
          address: editForm.address,
          slug: editForm.slug || undefined,
          excerpt: editForm.excerpt || null,
          description: editForm.description,
          descriptionDocument: editForm.descriptionDocument,
          metaTitle: editForm.metaTitle || null,
          metaDescription: editForm.metaDescription || null,
          operatingStatus: editForm.operatingStatus,
          noindex: editForm.noindex,
          featured: editForm.featured,
          coverMediaId: editCover?.id ?? null,
          expectedVersion: editing.version,
          expectedContentVersion: editing.contentVersion,
        }),
      });
      setNotice(`Đã cập nhật “${editForm.title}”.`);
      setEditing(null);
      setEditCover(null);
      goToList();
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setEditBusy(false);
    }
  };

  const remove = async (item: PropertyItem) => {
    if (item.publicationStatus === 'published') {
      setError('Không thể xoá nơi lưu trú đã xuất bản. Gỡ xuất bản trước.');
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

  return (
    <section className="property-catalog">
      {!editorMode && <div className="settings-screen__head">
        <div>
          <h2>Phòng nghỉ</h2>
          <p className="ahint">Danh sách thật từ API catalog và PostgreSQL. Bản nháp chưa xuất hiện trên website công khai.</p>
        </div>
        <div className="property-catalog__head-actions">
          <button type="button" className="abtn abtn--ghost" onClick={() => void load()} disabled={loading || busy || !!publishing}>
            <RefreshCw size={15} aria-hidden="true" /> Tải lại
          </button>
          <button type="button" className="abtn abtn--primary" onClick={openCreate} disabled={busy}>
            <Plus size={16} aria-hidden="true" /> Thêm phòng nghỉ
          </button>
        </div>
      </div>}

      {editorMode && <div className="admin-form-page__head">
        <button type="button" className="abtn abtn--ghost admin-form-page__back" onClick={closeEditor}>
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại danh sách
        </button>
        <div className="admin-form-page__title">
          <h2>{createMode ? 'Thêm nơi lưu trú' : 'Chỉnh sửa nơi lưu trú'}</h2>
          <p className="ahint">{createMode ? 'Tạo thông tin phòng nghỉ trên trang riêng; dữ liệu chỉ được lưu khi bấm nút lưu.' : 'Cập nhật thông tin nơi lưu trú trên trang riêng.'}</p>
        </div>
      </div>}

      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
      {notice && <p className="settings-screen__message settings-screen__message--success" role="status">{notice}</p>}

      {editorMode && !createMode && editing && (
        <form className="acard property-form" onSubmit={saveEdit}>
          <div className="property-form__title">
            <div>
              <h3>Chỉnh sửa nơi lưu trú</h3>
              <p className="ahint">Mã <strong>{editing.code}</strong> là mã ổn định của seeder và không đổi. Lưu có kiểm tra phiên bản để tránh ghi đè người khác.</p>
            </div>
            <Pencil size={22} aria-hidden="true" />
          </div>
          <div className="property-form__grid">
            <label className="afield property-form__wide">
              <span>Tên nơi lưu trú *</span>
              <input className="ainput" value={editForm.title} onChange={(event) => updateEdit('title', event.target.value)} required maxLength={300} />
            </label>
            <label className="afield">
              <span>Loại hình *</span>
              <select className="ainput" value={editForm.kind} onChange={(event) => updateEdit('kind', event.target.value)}>
                {Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="afield">
              <span>Trạng thái vận hành</span>
              <select className="ainput" value={editForm.operatingStatus} onChange={(event) => updateEdit('operatingStatus', event.target.value)}>
                <option value="pending_verification">Chờ xác minh</option>
                <option value="inactive">Tạm dừng</option>
                <option value="active">Đang hoạt động</option>
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
            <label className="afield">
              <span>Slug</span>
              <input className="ainput" value={editForm.slug} onChange={(event) => updateEdit('slug', event.target.value)} maxLength={160} />
            </label>
            <label className="afield">
              <span>Trích yếu</span>
              <input className="ainput" value={editForm.excerpt} onChange={(event) => updateEdit('excerpt', event.target.value)} maxLength={500} />
            </label>
            <div className="property-form__wide">
              <RichTextEditor
                label="Mô tả *"
                hint="Dùng tiêu đề, danh sách, liên kết, bảng và ảnh trong Media Library. Nội dung hiển thị public sẽ giữ nguyên định dạng."
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
            </div>
            <label className="afield">
              <span>Tiêu đề SEO</span>
              <input className="ainput" value={editForm.metaTitle} onChange={(event) => updateEdit('metaTitle', event.target.value)} maxLength={200} />
            </label>
            <label className="afield">
              <span>Mô tả SEO</span>
              <input className="ainput" value={editForm.metaDescription} onChange={(event) => updateEdit('metaDescription', event.target.value)} maxLength={320} />
            </label>
          </div>
          <div className="property-form__section">
            <p className="ahint">{editing.roomTypes.length ? `Đang có ${editing.roomTypes.length} hạng phòng trong property; màn này chưa tự động đổi hạng phòng, đơn vị hoặc giá.` : 'Chưa có hạng phòng. Có thể bổ sung sau khi xác minh.'}</p>
            <div className="property-form__toggles">
              <label className="atoggle">
                <input type="checkbox" checked={editForm.noindex} onChange={(event) => updateEdit('noindex', event.target.checked)} />
                <span className="atoggle__track"><span className="atoggle__thumb" /></span>
                <span className="atoggle__text"><strong>Không lập chỉ mục</strong><small>Giữ bản ghi ngoài công cụ tìm kiếm khi đang chuẩn bị.</small></span>
              </label>
              <label className="atoggle">
                <input type="checkbox" checked={editForm.featured} onChange={(event) => updateEdit('featured', event.target.checked)} />
                <span className="atoggle__track"><span className="atoggle__thumb" /></span>
                <span className="atoggle__text"><strong>Nổi bật</strong><small>Chỉ có tác dụng khi nội dung đủ điều kiện xuất bản.</small></span>
              </label>
            </div>
          </div>
          <div className="property-form__section">
            <h4>Ảnh đại diện</h4>
            <MediaPicker
              value={editCover?.url}
              mediaId={editCover?.id}
              label={editCover ? 'Đổi ảnh đại diện' : 'Chọn ảnh đại diện'}
              recommendedWidth={1200}
              recommendedHeight={800}
              recommendedRatio={1.5}
              uploadAltText={editForm.title}
              onMediaChange={(asset) => setEditCover(asset ? { id: asset.id, url: asset.url, altText: asset.altText } : null)}
            />
            <p className="ahint">Có thể bỏ ảnh để giữ bản nháp chưa hoàn thiện. Ảnh mới luôn được xử lý thành WebP trong Media Library.</p>
          </div>
          <div className="property-form__actions">
            <button type="button" className="abtn abtn--ghost" onClick={closeEditor} disabled={editBusy}>Huỷ</button>
            <button type="submit" className="abtn abtn--primary" disabled={editBusy}>{editBusy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
          </div>
        </form>
      )}

      {createMode && (
        <form className="acard property-form" onSubmit={create}>
          <div className="property-form__title">
            <div>
              <h3>Tạo nơi lưu trú mới</h3>
              <p className="ahint">Lưu lần đầu sẽ tạo nội dung, nơi lưu trú, loại phòng, giá và đơn vị phòng trong cùng một giao dịch.</p>
            </div>
            <BedDouble size={22} aria-hidden="true" />
          </div>
          <div className="property-form__grid">
            <label className="afield property-form__wide">
              <span>Tên nơi lưu trú *</span>
              <input className="ainput" value={form.title} onChange={(event) => update('title', event.target.value)} required maxLength={300} placeholder="Ví dụ: Nhà sàn Đinh Vân" />
            </label>
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
            <div className="property-form__wide">
              <RichTextEditor
                label="Mô tả *"
                hint="Tối thiểu 40 ký tự. Có thể chèn ảnh dùng lại từ Media Library; ảnh không bị nhúng base64 vào nội dung."
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
            </div>
          </div>

          <div className="property-form__section">
            <h4>Loại phòng đầu tiên</h4>
            <div className="property-form__grid">
              <label className="afield">
                <span>Mã loại phòng *</span>
                <input className="ainput" value={form.roomCode} onChange={(event) => update('roomCode', event.target.value.toUpperCase())} required pattern="[A-Za-z0-9_-]+" />
              </label>
              <label className="afield">
                <span>Tên loại phòng *</span>
                <input className="ainput" value={form.roomName} onChange={(event) => update('roomName', event.target.value)} required maxLength={160} />
              </label>
              <label className="afield">
                <span>Người lớn tối đa *</span>
                <input className="ainput" type="number" min="1" max="30" value={form.maxAdults} onChange={(event) => update('maxAdults', event.target.value)} required />
              </label>
              <label className="afield">
                <span>Trẻ em tối đa</span>
                <input className="ainput" type="number" min="0" max="30" value={form.maxChildren} onChange={(event) => update('maxChildren', event.target.value)} />
              </label>
              <label className="afield">
                <span>Diện tích (m²)</span>
                <input className="ainput" type="number" min="1" value={form.areaSqm} onChange={(event) => update('areaSqm', event.target.value)} />
              </label>
              <label className="afield">
                <span>Số đơn vị phòng *</span>
                <input className="ainput" type="number" min="1" max="100" value={form.unitCount} onChange={(event) => update('unitCount', event.target.value)} required />
              </label>
              <label className="afield property-form__wide">
                <span>Giường / view</span>
                <input className="ainput" value={form.bedSummary} onChange={(event) => update('bedSummary', event.target.value)} maxLength={120} placeholder="1 giường đôi · View rừng" />
              </label>
            </div>
          </div>

          <div className="property-form__section">
            <h4>Giá bán đầu tiên</h4>
            <div className="property-form__grid">
              <label className="afield">
                <span>Tên bảng giá</span>
                <input className="ainput" value={form.rateName} onChange={(event) => update('rateName', event.target.value)} maxLength={160} />
              </label>
              <label className="afield">
                <span>Giá ngày thường (VND) *</span>
                <input className="ainput" type="number" min="1" value={form.rateVnd} onChange={(event) => update('rateVnd', event.target.value)} required placeholder="650000" />
              </label>
              <label className="afield">
                <span>Giá cuối tuần (VND)</span>
                <input className="ainput" type="number" min="1" value={form.weekendRateVnd} onChange={(event) => update('weekendRateVnd', event.target.value)} placeholder="Để trống nếu chưa cấu hình" />
              </label>
              <label className="atoggle property-form__toggle">
                <input type="checkbox" checked={form.breakfastIncluded} onChange={(event) => update('breakfastIncluded', event.target.checked)} />
                <span className="atoggle__track"><span className="atoggle__thumb" /></span>
                <span className="atoggle__text"><strong>Bao gồm bữa sáng</strong><small>Đây là thuộc tính của bảng giá, không phải dữ liệu mẫu.</small></span>
              </label>
            </div>
          </div>

          <div className="property-form__section">
            <h4>Ảnh đại diện</h4>
            <div className="property-form__upload">
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
              <p className="ahint"><ImagePlus size={14} aria-hidden="true" /> Ảnh được chọn lại từ thư viện dùng chung; ảnh mới sẽ được chuyển thành WebP và lưu vào media storage thật.</p>
            </div>
          </div>

          <div className="property-form__actions">
            <button type="button" className="abtn abtn--ghost" onClick={closeEditor} disabled={busy}>Hủy</button>
            <button type="submit" className="abtn abtn--primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu nơi lưu trú'}</button>
          </div>
        </form>
      )}

      {editorMode && !createMode && !editing && <div className="acard apending">{loading ? 'Đang tải thông tin nơi lưu trú…' : loadFailed ? 'Không tải được dữ liệu từ API. Hãy tải lại danh sách rồi thử lại.' : 'Không tìm thấy nơi lưu trú cần chỉnh sửa.'}</div>}
      {!editorMode && (loading ? <div className="acard apending">Đang tải danh sách thật…</div> : loadFailed ? <div className="acard apending property-catalog__error-state">Không tải được danh sách nơi lưu trú. Bấm “Tải lại” để thử lại.</div> : !items.length ? (
        <div className="acard apending">
          <BedDouble size={22} aria-hidden="true" />
          <div><h3>Chưa có nơi lưu trú</h3><p>Bấm “Thêm phòng nghỉ” để tạo bản ghi đầu tiên trong PostgreSQL.</p></div>
        </div>
      ) : (
        <div className="property-catalog__list">
          {items.map((item) => {
            const room = item.roomTypes[0];
            return (
              <article className="acard property-card" key={item.id}>
                <div className="property-card__cover">
                  {item.cover ? <Image src={item.cover.url} alt={item.cover.alt} width={180} height={126} className="property-card__image" unoptimized /> : <div className="property-card__placeholder"><ImagePlus size={22} aria-hidden="true" /><span>Chưa có ảnh</span></div>}
                </div>
                <div className="property-card__body">
                  <div className="property-card__head"><div><h3>{item.title}</h3><p className="ahint">{item.code} · {KIND_LABEL[item.kind] ?? item.kind}</p></div><span className="abadge abadge--neutral">{STATUS_LABEL[item.publicationStatus] ?? item.publicationStatus} · {OPERATING_STATUS_LABEL[item.operatingStatus] ?? item.operatingStatus}</span></div>
                  <p>{item.area} · {item.address}</p>
                  <p className="ahint">{room ? `${room.name} · ${room.unitCount} đơn vị · ${money(room.rate?.baseRateVnd)}` : 'Chưa có loại phòng'}</p>
                  <div className="property-card__actions">
                    <div className="property-card__action-group">
                      <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => openEdit(item)} disabled={editBusy || !!deleting || !!publishing}>
                        <Pencil size={14} aria-hidden="true" /> Sửa
                      </button>
                      {item.publicationStatus !== 'published' && <button type="button" className="abtn abtn--danger abtn--sm" onClick={() => void remove(item)} disabled={deleting === item.id || editBusy || !!publishing}>
                        <Trash2 size={14} aria-hidden="true" /> {deleting === item.id ? 'Đang xoá…' : 'Xoá'}
                      </button>}
                    </div>
                    {item.publicationStatus === 'published' ? (
                      <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void unpublish(item)} disabled={publishing === item.id}>
                        {publishing === item.id ? 'Đang gỡ…' : 'Gỡ xuất bản'}
                      </button>
                    ) : (
                      <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => void publish(item)} disabled={publishing === item.id}>
                        {publishing === item.id ? 'Đang xuất bản…' : 'Xuất bản'}
                      </button>
                    )}
                    <span className="ahint">{item.path ?? `/${item.slug ?? ''}`}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ))}
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
