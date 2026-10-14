'use client';

import { BadgeCheck, Check, Copy, ExternalLink, LoaderCircle, MessageSquareReply, Search, Sparkles, Star, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { AdminPagination, ConfirmDialog, EmptyState, ErrorState, StatusBadge } from '@/components/admin/shared/ui';
import { ApiError, apiRequest } from '@/lib/api/client';

type Status = 'pending' | 'approved' | 'rejected';
type Tab = Status | 'all';

interface AdminReview {
  id: string;
  rating: number;
  body: string;
  authorName: string;
  phone: string | null;
  stay: { contentId: string; name: string; path: string | null };
  stayedAt: string | null;
  source: string;
  verified: boolean;
  status: Status;
  rejectReason: string | null;
  moderatedAt: string | null;
  moderatedBy: string | null;
  ownerReply: string | null;
  ownerReplyAt: string | null;
  photos: Array<{ id: string; src: string; width: number | null; height: number | null; visibility: string }>;
  createdAt: string;
}

interface ListResult { items: AdminReview[]; total: number; page: number; pageSize: number; counts: Record<Tab, number> }
interface StayOption { contentId: string; name: string; slug: string | null; path: string | null; ratingAverage: number | null; ratingCount: number; pending: number }

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'all', label: 'Tất cả' },
];
const STATUS: Record<Status, { label: string; tone: string }> = {
  pending: { label: 'Chờ duyệt', tone: 'warning' },
  approved: { label: 'Đã duyệt', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'muted' },
};
const REASONS: Array<{ id: string; label: string }> = [
  { id: 'spam', label: 'Spam / quảng cáo' },
  { id: 'inappropriate', label: 'Ngôn từ không phù hợp' },
  { id: 'off_topic', label: 'Không liên quan đến nơi lưu trú' },
  { id: 'personal_data', label: 'Chứa thông tin cá nhân' },
  { id: 'other', label: 'Lý do khác' },
];
const REASON_LABEL = Object.fromEntries(REASONS.map((reason) => [reason.id, reason.label]));

function errorText(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) return 'Tài khoản không có quyền thực hiện thao tác này.';
  return error instanceof Error && error.message ? error.message : fallback;
}

function Stars({ value }: { value: number }) {
  return (
    <span className="arev-stars" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} data-on={star <= value || undefined} aria-hidden="true" />)}
    </span>
  );
}

function InviteTool({ stays }: { stays: StayOption[] }) {
  const published = stays.filter((stay) => stay.path);
  const [stayId, setStayId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const stay = published.find((item) => item.contentId === stayId);
  const link = stay?.path && typeof window !== 'undefined' ? `${window.location.origin}${stay.path}?danh-gia=1&nguon=loi-moi` : '';

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setNote(`Đã sao chép ${what}.`); } catch { setNote('Trình duyệt chặn sao chép; hãy chọn và copy thủ công.'); }
  };
  const draft = async () => {
    if (!stay) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await apiRequest<{ message: string; aiUsed: boolean }>('/admin/reviews/invite-message', { method: 'POST', body: JSON.stringify({ stayId: stay.contentId, link }) }, { quiet: true });
      setMessage(result.message);
      setNote(result.aiUsed ? 'AI đã soạn tin nhắn — hãy đọc lại trước khi gửi.' : 'AI chưa sẵn sàng, đã dùng mẫu tin nhắn có sẵn.');
    } catch (error) {
      setNote(errorText(error, 'Chưa soạn được tin nhắn.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="acard arev-invite" aria-labelledby="arev-invite-t">
      <h3 id="arev-invite-t">Xin đánh giá từ khách đã ở</h3>
      <p className="ahint">Gửi link này qua Zalo cho khách vừa trả phòng. Link mở thẳng form đánh giá của nơi lưu trú. Không đề nghị quà hay giảm giá để đổi lấy đánh giá.</p>
      <div className="arev-invite__row">
        <select value={stayId} onChange={(event) => { setStayId(event.target.value); setMessage(''); setNote(null); }} aria-label="Chọn nơi lưu trú">
          <option value="">Chọn nơi lưu trú…</option>
          {published.map((item) => <option key={item.contentId} value={item.contentId}>{item.name}</option>)}
        </select>
        <button type="button" className="abtn abtn--ghost abtn--sm" disabled={!link} onClick={() => void copy(link, 'link')}><Copy size={15} aria-hidden="true" /> Sao chép link</button>
        <button type="button" className="abtn abtn--ghost abtn--sm" disabled={!link || busy} onClick={() => void draft()}>
          {busy ? <LoaderCircle size={15} className="arev-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />} AI soạn tin nhắn Zalo
        </button>
      </div>
      {link && <p className="arev-invite__link"><code>{link}</code></p>}
      {message && (
        <div className="arev-invite__msg">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} aria-label="Tin nhắn xin đánh giá" />
          <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => void copy(message, 'tin nhắn')}><Copy size={15} aria-hidden="true" /> Sao chép tin nhắn</button>
        </div>
      )}
      {note && <p className="ahint" role="status">{note}</p>}
    </section>
  );
}

function ReviewCard({ review, canWrite, onChange, onAskReject, onAskDelete }: {
  review: AdminReview;
  canWrite: boolean;
  onChange: (next: AdminReview) => void;
  onAskReject: (review: AdminReview) => void;
  onAskDelete: (review: AdminReview) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(review.ownerReply ?? '');

  const run = async (action: string, path: string, init: RequestInit) => {
    setBusy(action);
    setError(null);
    try {
      const next = await apiRequest<AdminReview>(`/admin/reviews/${review.id}${path}`, init, { quiet: true });
      onChange(next);
      return next;
    } catch (failure) {
      setError(errorText(failure, 'Thao tác chưa thực hiện được.'));
      return null;
    } finally {
      setBusy(null);
    }
  };
  const suggest = async () => {
    setBusy('suggest');
    setError(null);
    try {
      const result = await apiRequest<{ draft: string }>(`/admin/reviews/${review.id}/reply-suggest`, { method: 'POST', body: '{}' }, { quiet: true });
      setReply(result.draft);
      setReplyOpen(true);
    } catch (failure) {
      setError(errorText(failure, 'AI chưa gợi ý được câu trả lời.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="acard arev-card" data-status={review.status}>
      <header className="arev-card__head">
        <div>
          <p className="arev-card__who">
            <strong>{review.authorName}</strong>
            {review.phone && <a href={`tel:${review.phone}`}>{review.phone}</a>}
            {review.verified && <span className="arev-card__verified"><BadgeCheck size={14} aria-hidden="true" /> Đã đặt qua website</span>}
          </p>
          <p className="arev-card__meta">
            <Stars value={review.rating} />
            <span>{review.stay.name}</span>
            {review.stay.path && <a href={review.stay.path} target="_blank" rel="noreferrer" aria-label={`Mở trang ${review.stay.name}`}><ExternalLink size={12} aria-hidden="true" /></a>}
            {review.stayedAt && <span>· lưu trú {review.stayedAt.split('-').reverse().join('/')}</span>}
            <span>· {review.source === 'invite' ? 'qua link mời' : 'tự gửi trên website'}</span>
            <span>· {new Date(review.createdAt).toLocaleString('vi-VN')}</span>
          </p>
        </div>
        <StatusBadge label={STATUS[review.status].label} tone={STATUS[review.status].tone} small />
      </header>

      <p className="arev-card__body">{review.body}</p>

      {review.photos.length > 0 && (
        <ul className="arev-card__photos">
          {review.photos.map((photo, index) => (
            <li key={photo.id}>
              <a href={photo.src} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- private media, served only to staff */}
                <img src={photo.src} alt={`Ảnh ${index + 1} của ${review.authorName}`} />
              </a>
              {canWrite && review.status !== 'rejected' && (
                <button type="button" onClick={() => void run(`photo-${photo.id}`, `/photos/${photo.id}`, { method: 'DELETE' })} disabled={!!busy} aria-label={`Gỡ ảnh ${index + 1}`} title="Gỡ ảnh không phù hợp">
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {review.status === 'rejected' && review.rejectReason && <p className="ahint">Lý do từ chối: {REASON_LABEL[review.rejectReason] ?? review.rejectReason}{review.moderatedBy ? ` · ${review.moderatedBy}` : ''}</p>}
      {review.status === 'approved' && review.moderatedBy && <p className="ahint">Duyệt bởi {review.moderatedBy}{review.moderatedAt ? ` · ${new Date(review.moderatedAt).toLocaleString('vi-VN')}` : ''}</p>}

      {review.ownerReply && !replyOpen && (
        <div className="arev-card__reply">
          <p className="arev-card__reply-title"><MessageSquareReply size={14} aria-hidden="true" /> Phản hồi đã đăng</p>
          <p>{review.ownerReply}</p>
        </div>
      )}
      {replyOpen && (
        <div className="arev-card__compose">
          <label className="sr-only" htmlFor={`reply-${review.id}`}>Phản hồi của chủ nhà</label>
          <textarea id={`reply-${review.id}`} value={reply} onChange={(event) => setReply(event.target.value)} rows={3} maxLength={1500} placeholder="Phản hồi công khai, hiện dưới đánh giá…" />
          <div className="arev-card__actions">
            <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void suggest()} disabled={!!busy}>
              {busy === 'suggest' ? <LoaderCircle size={15} className="arev-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />} AI gợi ý
            </button>
            {review.ownerReply && <button type="button" className="abtn abtn--ghost abtn--sm" onClick={async () => { if (await run('reply', '/reply', { method: 'PUT', body: JSON.stringify({ reply: '' }) })) { setReply(''); setReplyOpen(false); } }} disabled={!!busy}>Gỡ phản hồi</button>}
            <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => { setReply(review.ownerReply ?? ''); setReplyOpen(false); }}>Huỷ</button>
            <button type="button" className="abtn abtn--primary abtn--sm" disabled={!reply.trim() || !!busy} onClick={async () => { if (await run('reply', '/reply', { method: 'PUT', body: JSON.stringify({ reply }) })) setReplyOpen(false); }}>Đăng phản hồi</button>
          </div>
        </div>
      )}

      {error && <p className="settings-screen__message settings-screen__message--error" role="alert">{error}</p>}

      {canWrite && (
        <div className="arev-card__actions">
          {review.status !== 'approved' && (
            <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => void run('approve', '/approve', { method: 'POST', body: '{}' })} disabled={!!busy}>
              {busy === 'approve' ? <LoaderCircle size={15} className="arev-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />} Duyệt
            </button>
          )}
          {review.status !== 'rejected' && <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => onAskReject(review)} disabled={!!busy}><X size={15} aria-hidden="true" /> {review.status === 'approved' ? 'Gỡ xuống' : 'Từ chối'}</button>}
          {review.status === 'approved' && !replyOpen && (
            <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setReplyOpen(true)} disabled={!!busy}><MessageSquareReply size={15} aria-hidden="true" /> {review.ownerReply ? 'Sửa phản hồi' : 'Trả lời'}</button>
          )}
          <button type="button" className="abtn abtn--ghost abtn--sm arev-card__delete" onClick={() => onAskDelete(review)} disabled={!!busy}><Trash2 size={15} aria-hidden="true" /> Xoá</button>
        </div>
      )}
    </article>
  );
}

export function ReviewsInbox() {
  const { user } = useAdminSession();
  const canWrite = user.permissions.includes('review.write');
  const [tab, setTab] = useState<Tab>('pending');
  const [stay, setStay] = useState('');
  const [rating, setRating] = useState('');
  const [hasPhotos, setHasPhotos] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListResult | null>(null);
  const [stays, setStays] = useState<StayOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminReview | null>(null);
  const [deleting, setDeleting] = useState<AdminReview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (tab !== 'all') params.set('status', tab);
    if (stay) params.set('stay', stay);
    if (rating) params.set('rating', rating);
    if (hasPhotos) params.set('hasPhotos', 'true');
    if (search) params.set('search', search);
    return params.toString();
  }, [tab, stay, rating, hasPhotos, search, page]);

  const load = useCallback(async () => {
    try {
      const result = await apiRequest<ListResult>(`/admin/reviews?${query}`, { cache: 'no-store' });
      setList(result);
      setError(null);
      window.dispatchEvent(new CustomEvent('dvb:review-counts', { detail: { pendingReviews: result.counts.pending } }));
    } catch (failure) {
      setError(errorText(failure, 'Không tải được danh sách đánh giá.'));
    }
  }, [query]);

  const loadStays = useCallback(async () => {
    try { setStays(await apiRequest<StayOption[]>('/admin/reviews/stays', { cache: 'no-store' })); } catch { /* filters stay usable without the list */ }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadStays(); }, [loadStays]);

  const replace = (next: AdminReview) => {
    setList((current) => current ? { ...current, items: current.items.map((item) => (item.id === next.id ? next : item)) } : current);
    void load();
    void loadStays();
  };

  const reject = async (reason: string) => {
    if (!rejecting) return;
    const code = REASONS.find((item) => item.label === reason)?.id ?? 'other';
    setBusy(true);
    try {
      replace(await apiRequest<AdminReview>(`/admin/reviews/${rejecting.id}/reject`, { method: 'POST', body: JSON.stringify({ reason: code }) }, { quiet: true }));
      setRejecting(null);
    } catch (failure) {
      setError(errorText(failure, 'Chưa từ chối được đánh giá.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/reviews/${deleting.id}`, { method: 'DELETE' }, { quiet: true });
      setDeleting(null);
      void load();
      void loadStays();
    } catch (failure) {
      setError(errorText(failure, 'Chưa xoá được đánh giá.'));
    } finally {
      setBusy(false);
    }
  };

  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  return (
    <section className="arev">
      <div className="arev__tabs" role="tablist" aria-label="Lọc theo trạng thái">
        {TABS.map((item) => {
          const count = list?.counts[item.id] ?? 0;
          return (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`arev__tab${tab === item.id ? ' is-active' : ''}${item.id === 'pending' && count > 0 ? ' is-alert' : ''}`} onClick={() => { setTab(item.id); setPage(1); }}>
              {item.label} <span className="arev__count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="arev__filters">
        <label className="arev__search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Tìm đánh giá</span>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm theo tên, số điện thoại hoặc nội dung" />
        </label>
        <select value={stay} onChange={(event) => { setStay(event.target.value); setPage(1); }} aria-label="Lọc theo nơi lưu trú">
          <option value="">Mọi nơi lưu trú</option>
          {stays.map((item) => <option key={item.contentId} value={item.contentId}>{item.name}{item.pending ? ` (${item.pending} chờ)` : ''}</option>)}
        </select>
        <select value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }} aria-label="Lọc theo số sao">
          <option value="">Mọi số sao</option>
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}
        </select>
        <label className="arev__check"><input type="checkbox" checked={hasPhotos} onChange={(event) => { setHasPhotos(event.target.checked); setPage(1); }} /> Có ảnh</label>
      </div>

      {canWrite && <InviteTool stays={stays} />}

      {error && <ErrorState title="Có lỗi" text={error} onRetry={() => void load()} />}
      {!list ? (
        <p className="ahint arev__loading"><LoaderCircle size={16} className="arev-spin" aria-hidden="true" /> Đang tải…</p>
      ) : !list.items.length ? (
        <EmptyState title={tab === 'pending' ? 'Không có đánh giá chờ duyệt' : 'Không có đánh giá'} text={tab === 'pending' ? 'Đánh giá mới của khách sẽ xuất hiện ở đây.' : 'Thử đổi bộ lọc hoặc từ khoá.'} />
      ) : (
        <div className="arev__list">
          {list.items.map((review) => (
            <ReviewCard key={review.id} review={review} canWrite={canWrite} onChange={replace} onAskReject={setRejecting} onAskDelete={setDeleting} />
          ))}
        </div>
      )}
      {list && <AdminPagination page={page} pages={pages} onChange={setPage} />}

      <ConfirmDialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => void reject(reason)}
        title={rejecting?.status === 'approved' ? 'Gỡ đánh giá khỏi website?' : 'Từ chối đánh giá?'}
        confirmLabel={rejecting?.status === 'approved' ? 'Gỡ xuống' : 'Từ chối'}
        tone="danger"
        busy={busy}
        reason={{ label: 'Lý do', options: REASONS.map((item) => item.label) }}
      >
        <p>Đánh giá sẽ không hiển thị trên website và điểm trung bình được tính lại. Khách không nhận được thông báo.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        title="Xoá hẳn đánh giá?"
        confirmLabel="Xoá vĩnh viễn"
        tone="danger"
        busy={busy}
      >
        <p>Đánh giá và ảnh kèm theo bị xoá vĩnh viễn, không khôi phục được. Nếu chỉ muốn ẩn, hãy dùng “Từ chối”.</p>
      </ConfirmDialog>
    </section>
  );
}
