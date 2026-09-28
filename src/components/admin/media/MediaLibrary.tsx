'use client';

import { Images, Pencil, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { ApiError, apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';

export type MediaAsset = {
  id: string;
  url: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  byteSize: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  renditions: Record<string, { url: string; width: number }>;
  createdAt: string;
};

type MediaListResponse = {
  items: MediaAsset[];
  page: number;
  pageSize: number;
  total: number;
};

type MediaLibraryProps = {
  /** A page is used by the standalone Media Library route; a modal is used by every picker. */
  mode?: 'page' | 'modal';
  open?: boolean;
  onClose?: () => void;
  onSelect?: (asset: MediaAsset) => void;
  selectedId?: string | null;
  title?: string;
  initialAltText?: string;
};

const PAGE_SIZE = 24;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

function errorMessage(reason: unknown): string {
  if (reason instanceof ApiError && reason.status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để quản lý media.';
  }
  if (reason instanceof ApiError && reason.payload && typeof reason.payload === 'object') {
    const payload = reason.payload as { message?: unknown; problems?: unknown };
    const problems = Array.isArray(payload.problems)
      ? payload.problems.filter((item): item is string => typeof item === 'string')
      : [];
    if (problems.length) return `${String(payload.message ?? 'Chưa thể thực hiện')}: ${problems.join(' · ')}`;
    if (typeof payload.message === 'string') return payload.message;
  }
  return reason instanceof Error ? reason.message : 'Không thể hoàn tất thao tác với thư viện ảnh.';
}

function formatBytes(value: string): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function displayName(asset: MediaAsset): string {
  return asset.originalFilename || asset.storageKey.split('/').pop() || 'Ảnh WebP';
}

export function MediaLibrary({
  mode = 'page',
  open = true,
  onClose,
  onSelect,
  selectedId,
  title = 'Thư viện ảnh',
  initialAltText = '',
}: MediaLibraryProps) {
  const headingId = useId();
  const isModal = mode === 'modal';
  const active = !isModal || open;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [altText, setAltText] = useState(initialAltText);
  const [caption, setCaption] = useState('');
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isModal && open && !wasOpen.current) setAltText(initialAltText);
    wasOpen.current = isModal ? open : false;
  }, [initialAltText, isModal, open]);

  const detail = items.find((item) => item.id === detailId) ?? null;

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (query.trim()) params.set('search', query.trim());
      const result = await apiRequest<MediaListResponse>(`/media?${params.toString()}`);
      setItems(result.items);
      setTotal(result.total);
      setDetailId((current) => (current && result.items.some((item) => item.id === current) ? current : null));
    } catch (reason) {
      setError(errorMessage(reason));
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [active, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail) return;
    setAltText(detail.altText ?? '');
    setCaption(detail.caption ?? '');
  }, [detail]);

  const select = (asset: MediaAsset) => {
    if (onSelect) {
      onSelect(asset);
      onClose?.();
      return;
    }
    setDetailId(asset.id);
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const uploaded: MediaAsset[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append('altText', (altText.trim() || file.name).slice(0, 500));
        if (caption.trim()) form.append('caption', caption.trim().slice(0, 1000));
        form.append('file', file);
        uploaded.push(await apiRequest<MediaAsset>('/media/upload', { method: 'POST', body: form }));
      }
      setItems((current) => [...uploaded, ...current.filter((item) => !uploaded.some((next) => next.id === item.id))]);
      setTotal((current) => current + uploaded.filter((item) => !items.some((old) => old.id === item.id)).length);
      setNotice(
        uploaded.length === 1
          ? 'Đã tải ảnh lên. Bản lưu trong thư viện là WebP; tệp gốc không được giữ lại.'
          : `Đã tải ${uploaded.length} ảnh lên. Các bản lưu trong thư viện đều là WebP.`,
      );
      if (uploaded.length === 1 && onSelect) select(uploaded[0]);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setUploading(false);
    }
  };

  const saveMetadata = async () => {
    if (!detail) return;
    setSavingMeta(true);
    setError('');
    setNotice('');
    try {
      const updated = await apiRequest<MediaAsset>(`/media/${encodeURIComponent(detail.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ altText: altText.trim() || null, caption: caption.trim() || null }),
      });
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice('Đã lưu mô tả ảnh.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSavingMeta(false);
    }
  };

  const remove = async () => {
    if (!detail) return;
    if (!window.confirm(`Xoá “${displayName(detail)}” khỏi thư viện?`)) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await apiRequest<void>(`/media/${encodeURIComponent(detail.id)}`, { method: 'DELETE' });
      setItems((current) => current.filter((item) => item.id !== detail.id));
      setTotal((current) => Math.max(0, current - 1));
      setDetailId(null);
      setNotice('Đã xoá ảnh khỏi thư viện và storage.');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setDeleting(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const content = (
    <div className={`media-library${isModal ? ' media-library--modal' : ' media-library--page'}`}>
      <header className="media-library__head">
        <div>
          <h2 id={headingId} className="media-library__title">
            <Images size={19} aria-hidden="true" /> {title}
          </h2>
          <p className="media-library__hint">{total} ảnh · mọi tệp tải lên được chuyển thành WebP và không giữ định dạng gốc.</p>
        </div>
        <div className="media-library__tools">
          <label className="bk__search media-library__search">
            <Search size={14} aria-hidden="true" />
            <input
              className="ainput"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên tệp, alt, chú thích…"
              aria-label="Tìm trong thư viện ảnh"
            />
          </label>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void load()} disabled={loading || uploading}>
            <RefreshCw size={14} aria-hidden="true" /> Tải lại
          </button>
          <label className="abtn abtn--primary abtn--sm media-library__upload">
            <Upload size={14} aria-hidden="true" /> {uploading ? 'Đang xử lý…' : 'Tải ảnh mới'}
            <input type="file" accept={ACCEPTED} multiple onChange={(event) => void upload(event)} disabled={uploading} />
          </label>
        </div>
      </header>

      <div className="media-library__upload-meta">
        <label className="afield">
          <span>Alt mặc định cho ảnh tải lên</span>
          <input className="ainput" value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={500} placeholder="Để trống sẽ dùng tên tệp" />
        </label>
        <label className="afield">
          <span>Chú thích mặc định</span>
          <input className="ainput" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={1000} placeholder="Không bắt buộc" />
        </label>
      </div>

      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}
      {notice && <p className="settings-screen__message settings-screen__message--success" role="status">{notice}</p>}

      <div className={`media-library__body${isModal ? '' : ' media-library__body--managed'}`}>
        <section className="media-library__list" aria-label="Danh sách ảnh">
          {loading ? (
            <div className="media-library__empty">Đang tải thư viện ảnh…</div>
          ) : loadFailed ? (
            <div className="media-library__empty media-library__error-state">Không tải được thư viện ảnh. Bấm “Tải lại” để thử lại.</div>
          ) : items.length ? (
            <ul className="media-library__grid">
              {items.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className={`media-library__card${selectedId === asset.id || detailId === asset.id ? ' is-active' : ''}`}
                    onClick={() => select(asset)}
                    aria-pressed={selectedId === asset.id || detailId === asset.id}
                  >
                    <Image src={asset.url} alt={asset.altText ?? displayName(asset)} width={220} height={140} unoptimized />
                    <span className="media-library__card-name">{displayName(asset)}</span>
                    <span className="media-library__card-meta">
                      {asset.width && asset.height ? `${asset.width}×${asset.height}` : '—'} · {formatBytes(asset.byteSize)}
                    </span>
                    {onSelect && <span className="media-library__card-action">Chọn ảnh</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="media-library__empty">
              <Images size={24} aria-hidden="true" />
              <strong>{query ? 'Không tìm thấy ảnh phù hợp.' : 'Thư viện chưa có ảnh.'}</strong>
              <span>Tải ảnh lên để dùng lại ở mọi màn hình quản trị.</span>
            </div>
          )}
          {pages > 1 && (
            <div className="media-library__pagination">
              <button type="button" className="abtn abtn--ghost abtn--sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
                Trang trước
              </button>
              <span>Trang {page}/{pages}</span>
              <button type="button" className="abtn abtn--ghost abtn--sm" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)}>
                Trang sau
              </button>
            </div>
          )}
        </section>

        {!isModal && (
          <aside className="media-library__detail">
            {detail ? (
              <>
                <Image src={detail.url} alt={detail.altText ?? displayName(detail)} width={420} height={260} unoptimized />
                <dl>
                  <dt>Tệp lưu trữ</dt>
                  <dd>{detail.storageKey}</dd>
                  <dt>Định dạng</dt>
                  <dd>{detail.mimeType} · {formatBytes(detail.byteSize)}</dd>
                  <dt>Ngày tải lên</dt>
                  <dd>{new Date(detail.createdAt).toLocaleString('vi-VN')}</dd>
                </dl>
                <label className="afield">
                  <span>Alt text</span>
                  <input className="ainput" value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={500} />
                </label>
                <label className="afield">
                  <span>Chú thích</span>
                  <textarea className="ainput" rows={3} value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={1000} />
                </label>
                <div className="media-library__detail-actions">
                  <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => void saveMetadata()} disabled={savingMeta || deleting}>
                    <Pencil size={13} aria-hidden="true" /> {savingMeta ? 'Đang lưu…' : 'Lưu mô tả'}
                  </button>
                  <button type="button" className="abtn abtn--danger abtn--sm" onClick={() => void remove()} disabled={savingMeta || deleting}>
                    <Trash2 size={13} aria-hidden="true" /> {deleting ? 'Đang xoá…' : 'Xoá ảnh'}
                  </button>
                </div>
              </>
            ) : (
              <div className="media-library__detail-empty">Chọn một ảnh để xem metadata và thao tác.</div>
            )}
          </aside>
        )}
      </div>
    </div>
  );

  if (!isModal) return content;
  return (
    <Modal open={open} onClose={() => onClose?.()} labelledBy={headingId} className="dialog--admin media-library-dialog" size="xl">
      {content}
    </Modal>
  );
}
