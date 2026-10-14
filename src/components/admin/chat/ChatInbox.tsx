'use client';

import {
  ArrowLeft,
  Bell,
  BellOff,
  Bot,
  CircleUserRound,
  ExternalLink,
  FileText,
  Headset,
  LoaderCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Undo2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAdminSession } from '@/components/admin/AdminAuthGate';
import { AdminPagination, ConfirmDialog, EmptyState, ErrorState, StatusBadge } from '@/components/admin/shared/ui';
import { ApiError, apiPath, apiRequest } from '@/lib/api/client';

type Status = 'ai' | 'waiting_human' | 'human' | 'closed';
type View = 'needs_action' | 'new' | 'ai' | 'human' | 'mine' | 'unassigned' | 'closed' | 'spam' | 'all';

interface ChatItem {
  id: string;
  status: Status;
  visitorLabel: string;
  visitorName: string | null;
  visitorPhone: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  lastVisitorMessageAt: string | null;
  unread: boolean;
  handoffReason: string | null;
  isSpam: boolean;
  pageKind: string | null;
  lastPath: string | null;
  assignedUser: { id: string; fullName: string } | null;
  inquiryId: string | null;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  seq: string;
  role: 'visitor' | 'ai' | 'staff' | 'system';
  body: string;
  authorName: string | null;
  links: Array<{ path: string; title: string }>;
  askContact: boolean;
  internalNote?: string | null;
  createdAt: string;
}

interface ChatDetail extends ChatItem {
  entryPath: string | null;
  relatedContentTitle: string | null;
  aiReplyCount: number;
  closedAt: string | null;
  version: number;
  messages: ChatMessage[];
}

interface ListResult {
  items: ChatItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<View, number>;
}

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'needs_action', label: 'Cần xử lý' },
  { id: 'new', label: 'Mới (24h)' },
  { id: 'ai', label: 'AI đang trả lời' },
  { id: 'human', label: 'Nhân viên đang chat' },
  { id: 'mine', label: 'Của tôi' },
  { id: 'unassigned', label: 'Chưa ai nhận' },
  { id: 'closed', label: 'Đã đóng' },
  { id: 'spam', label: 'Spam' },
  { id: 'all', label: 'Tất cả' },
];

const STATUS: Record<Status, { label: string; tone: string }> = {
  ai: { label: 'AI đang trả lời', tone: 'info' },
  waiting_human: { label: 'Chờ nhân viên', tone: 'warning' },
  human: { label: 'Nhân viên đang chat', tone: 'success' },
  closed: { label: 'Đã đóng', tone: 'muted' },
};

const HANDOFF: Record<string, string> = {
  booking: 'Muốn đặt',
  price_quote: 'Xin báo giá',
  human_request: 'Muốn gặp nhân viên',
  complaint: 'Phản ánh',
  contact_left: 'Đã để lại SĐT',
  ai_error: 'AI gặp lỗi',
  ai_limit: 'Hết lượt AI',
  ai_disabled: 'AI đang tắt',
  unknown: 'AI chưa trả lời được',
  other: 'Cần người hỗ trợ',
};

const PAGE_KINDS: Array<{ id: string; label: string }> = [
  { id: '', label: 'Mọi trang' },
  { id: 'stay', label: 'Nơi lưu trú' },
  { id: 'combo', label: 'Combo' },
  { id: 'destination', label: 'Điểm đến' },
  { id: 'article', label: 'Bài viết' },
  { id: 'listing', label: 'Trang danh sách' },
  { id: 'other', label: 'Trang khác' },
];

const SOUND_KEY = 'dvb:chat-sound';

function relative(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

function clock(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

function newClientId(): string {
  return `s${(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 40);
}

function beep() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
    oscillator.onended = () => void context.close();
  } catch { /* audio unavailable */ }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 403) return 'Tài khoản không có quyền thực hiện thao tác này.';
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ChatInbox() {
  const { user } = useAdminSession();
  const canWrite = user.permissions.includes('chat.write');
  const [view, setView] = useState<View>('needs_action');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [hasPhone, setHasPhone] = useState('');
  const [pageKind, setPageKind] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListResult | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [confirm, setConfirm] = useState<'close' | 'spam' | null>(null);
  const [sound, setSound] = useState(true);
  const [aiTest, setAiTest] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const soundRef = useRef(true);
  const waitingRef = useRef<number | null>(null);
  const refreshTimer = useRef<number | null>(null);
  selectedRef.current = selectedId;
  soundRef.current = sound;

  useEffect(() => {
    try { setSound(window.localStorage.getItem(SOUND_KEY) !== '0'); } catch { /* storage unavailable */ }
    const initial = new URLSearchParams(window.location.search).get('id');
    if (initial && /^[0-9a-f-]{36}$/i.test(initial)) setSelectedId(initial);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ view, page: String(page), pageSize: '30' });
    if (search) params.set('search', search);
    if (hasPhone) params.set('hasPhone', hasPhone);
    if (pageKind) params.set('pageKind', pageKind);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params.toString();
  }, [view, page, search, hasPhone, pageKind, from, to]);

  const loadList = useCallback(async () => {
    try {
      const result = await apiRequest<ListResult>(`/admin/chats?${query}`, { cache: 'no-store' });
      setList(result);
      setListError(null);
      const waiting = result.counts.needs_action;
      window.dispatchEvent(new CustomEvent('dvb:chat-counts', { detail: { waitingChats: waiting } }));
      if (waitingRef.current !== null && waiting > waitingRef.current) {
        if (soundRef.current) beep();
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Có khách đang chờ tư vấn', { body: 'Mở hộp thư chat để tham gia.', tag: 'dvb-chat' });
        }
      }
      waitingRef.current = waiting;
    } catch (error) {
      setListError(errorMessage(error, 'Không tải được danh sách chat.'));
    }
  }, [query]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const result = await apiRequest<ChatDetail>(`/admin/chats/${id}`, { cache: 'no-store' });
      if (selectedRef.current !== id) return;
      setDetail(result);
      setDetailError(null);
      if (result.unread) {
        const lastVisitor = [...result.messages].reverse().find((message) => message.role === 'visitor');
        void apiRequest(`/admin/chats/${id}/read`, { method: 'POST', body: JSON.stringify(lastVisitor ? { seq: lastVisitor.seq } : {}) }, { quiet: true }).catch(() => undefined);
      }
    } catch (error) {
      if (selectedRef.current === id) setDetailError(errorMessage(error, 'Không tải được cuộc trò chuyện.'));
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);

  useEffect(() => {
    setDetail(null);
    setDetailError(null);
    setActionError(null);
    setText('');
    if (!selectedId) return;
    void loadDetail(selectedId);
    const url = new URL(window.location.href);
    url.searchParams.set('id', selectedId);
    window.history.replaceState(null, '', url);
  }, [selectedId, loadDetail]);

  // Live updates: refetch on each event, coalesced; slow polling covers a dropped stream.
  useEffect(() => {
    const schedule = (conversationId?: string) => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => { void loadList(); }, 400);
      if (conversationId && conversationId === selectedRef.current) void loadDetail(conversationId);
    };
    let source: EventSource | null = null;
    try {
      source = new EventSource(apiPath('/admin/chats/stream'), { withCredentials: true });
      source.onopen = () => setLive(true);
      source.onerror = () => setLive(false);
      const handler = (event: MessageEvent<string>) => {
        try { schedule((JSON.parse(event.data) as { conversationId?: string }).conversationId); } catch { schedule(); }
      };
      source.addEventListener('message.created', handler);
      source.addEventListener('conversation.updated', handler);
    } catch { source = null; }
    const timer = window.setInterval(() => {
      void loadList();
      if (selectedRef.current) void loadDetail(selectedRef.current);
    }, 30_000);
    return () => { source?.close(); window.clearInterval(timer); if (refreshTimer.current) window.clearTimeout(refreshTimer.current); };
  }, [loadList, loadDetail]);

  useEffect(() => {
    const count = list?.counts.needs_action ?? 0;
    const base = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = count > 0 ? `(${count > 99 ? '99+' : count}) ${base}` : base;
    return () => { document.title = document.title.replace(/^\(\d+\+?\)\s*/, ''); };
  }, [list?.counts.needs_action]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [detail?.messages.length, detail?.id]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try { window.localStorage.setItem(SOUND_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
    if (next && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
  };

  const act = async (action: string, path: string, body: unknown = {}) => {
    if (!detail) return;
    setBusy(action);
    setActionError(null);
    try {
      const result = await apiRequest<ChatDetail>(`/admin/chats/${detail.id}/${path}`, { method: 'POST', body: JSON.stringify(body) }, { quiet: true });
      setDetail(result);
      void loadList();
      return result;
    } catch (error) {
      setActionError(errorMessage(error, 'Thao tác chưa thực hiện được.'));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const body = text.trim();
    if (!body) return;
    const result = await act('send', 'messages', { body, clientId: newClientId() });
    if (result) setText('');
  };

  const onComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); }
  };

  const suggest = async () => {
    if (!detail) return;
    setBusy('suggest');
    setActionError(null);
    try {
      const result = await apiRequest<{ draft: string }>(`/admin/chats/${detail.id}/suggest`, { method: 'POST', body: '{}' }, { quiet: true });
      setText(result.draft);
    } catch (error) {
      setActionError(errorMessage(error, 'AI chưa gợi ý được câu trả lời.'));
    } finally {
      setBusy(null);
    }
  };

  const testAi = async () => {
    setBusy('ai-test');
    setAiTest(null);
    try {
      const result = await apiRequest<{ model: string; format: string; latencyMs: number; reply: string }>('/admin/chats/ai-test', { method: 'POST', body: '{}' }, { quiet: true });
      setAiTest(`AI hoạt động · model ${result.model} · định dạng ${result.format} · ${(result.latencyMs / 1000).toFixed(1)}s — “${result.reply.slice(0, 140)}”`);
    } catch (error) {
      setAiTest(`AI chưa hoạt động: ${errorMessage(error, 'không gọi được nhà cung cấp AI')}`);
    } finally {
      setBusy(null);
    }
  };

  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  const joinedByMe = detail?.status === 'human' && detail.assignedUser?.id === user.id;

  return (
    <section className="chatbox" data-thread={selectedId ? 'open' : undefined}>
      <header className="chatbox__bar">
        <div className="chatbox__tabs" role="tablist" aria-label="Lọc cuộc trò chuyện">
          {VIEWS.map((item) => {
            const count = list?.counts[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={view === item.id}
                className={`chatbox__tab${view === item.id ? ' is-active' : ''}${item.id === 'needs_action' && count > 0 ? ' is-alert' : ''}`}
                onClick={() => { setView(item.id); setPage(1); }}
              >
                {item.label}
                {item.id !== 'all' && count > 0 && <span className="chatbox__count">{count > 99 ? '99+' : count}</span>}
              </button>
            );
          })}
        </div>
        <div className="chatbox__tools">
          <span className={`chatbox__live${live ? ' is-on' : ''}`} title={live ? 'Đang nhận tin trực tiếp' : 'Đang tự tải lại mỗi 30 giây'}>
            {live ? 'Trực tiếp' : 'Tự tải lại'}
          </span>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={toggleSound} aria-pressed={sound} title="Âm báo khi có khách chờ">
            {sound ? <Bell size={15} aria-hidden="true" /> : <BellOff size={15} aria-hidden="true" />} Âm báo
          </button>
          {canWrite && (
            <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void testAi()} disabled={busy === 'ai-test'}>
              {busy === 'ai-test' ? <LoaderCircle size={15} className="chatbox__spin" aria-hidden="true" /> : <Bot size={15} aria-hidden="true" />} Kiểm tra AI
            </button>
          )}
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void loadList()} aria-label="Tải lại danh sách">
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </header>
      {aiTest && <p className={`chatbox__notice${aiTest.startsWith('AI hoạt động') ? '' : ' is-error'}`} role="status">{aiTest}</p>}

      <div className="chatbox__filters">
        <label className="chatbox__search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Tìm cuộc trò chuyện</span>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm theo tên, số điện thoại hoặc nội dung" />
        </label>
        <label className="chatbox__filter">
          <span>Liên hệ</span>
          <select value={hasPhone} onChange={(event) => { setHasPhone(event.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="true">Đã có SĐT</option>
            <option value="false">Chưa có SĐT</option>
          </select>
        </label>
        <label className="chatbox__filter">
          <span>Trang</span>
          <select value={pageKind} onChange={(event) => { setPageKind(event.target.value); setPage(1); }}>
            {PAGE_KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="chatbox__filter">
          <span>Từ ngày</span>
          <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        </label>
        <label className="chatbox__filter">
          <span>Đến ngày</span>
          <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
        </label>
      </div>

      <div className="chatbox__body">
        <div className="chatbox__list">
          {listError ? (
            <ErrorState title="Không tải được danh sách" text={listError} onRetry={() => void loadList()} />
          ) : !list ? (
            <p className="chatbox__loading"><LoaderCircle size={16} className="chatbox__spin" aria-hidden="true" /> Đang tải…</p>
          ) : !list.items.length ? (
            <EmptyState title="Không có cuộc trò chuyện" text={view === 'needs_action' ? 'Chưa có khách nào đang chờ nhân viên.' : 'Thử đổi bộ lọc hoặc từ khoá.'} />
          ) : (
            <ul className="chatbox__items">
              {list.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`chatrow${selectedId === item.id ? ' is-selected' : ''}${item.unread ? ' is-unread' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="chatrow__top">
                      <strong className="chatrow__name">{item.visitorLabel}</strong>
                      <time className="chatrow__time" dateTime={item.lastMessageAt}>{relative(item.lastMessageAt)}</time>
                    </span>
                    <span className="chatrow__preview">{item.lastMessagePreview ?? '—'}</span>
                    <span className="chatrow__meta">
                      <StatusBadge label={STATUS[item.status].label} tone={STATUS[item.status].tone} small />
                      {item.status === 'waiting_human' && item.handoffReason && <span className="chatrow__tag">{HANDOFF[item.handoffReason] ?? HANDOFF.other}</span>}
                      {item.visitorPhone && <span className="chatrow__tag">SĐT</span>}
                      {item.assignedUser && <span className="chatrow__tag">{item.assignedUser.fullName}</span>}
                      {item.unread && <span className="chatrow__dot" aria-label="Có tin chưa đọc" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {list && <AdminPagination page={page} pages={pages} onChange={setPage} compact />}
        </div>

        <div className="chatbox__thread">
          {!selectedId ? (
            <div className="chatbox__placeholder">
              <Headset size={34} aria-hidden="true" />
              <p>Chọn một cuộc trò chuyện để xem nội dung, tham gia trả lời hoặc trả lại cho trợ lý AI.</p>
            </div>
          ) : detailError ? (
            <ErrorState title="Không tải được cuộc trò chuyện" text={detailError} onRetry={() => void loadDetail(selectedId)} />
          ) : !detail ? (
            <p className="chatbox__loading"><LoaderCircle size={16} className="chatbox__spin" aria-hidden="true" /> Đang mở…</p>
          ) : (
            <>
              <div className="chatthread__head">
                <button type="button" className="chatthread__back abtn abtn--ghost abtn--sm" onClick={() => setSelectedId(null)}>
                  <ArrowLeft size={15} aria-hidden="true" /> Danh sách
                </button>
                <div className="chatthread__who">
                  <h2>{detail.visitorLabel}</h2>
                  <p>
                    <StatusBadge label={STATUS[detail.status].label} tone={STATUS[detail.status].tone} small />
                    {detail.assignedUser && <span> · phụ trách: {detail.assignedUser.fullName}</span>}
                    {detail.status === 'waiting_human' && detail.handoffReason && <span> · {HANDOFF[detail.handoffReason] ?? HANDOFF.other}</span>}
                  </p>
                </div>
                {canWrite && (
                  <div className="chatthread__actions">
                    {detail.status !== 'human' || !joinedByMe ? (
                      <button type="button" className="abtn abtn--primary abtn--sm" onClick={() => void act('join', 'join')} disabled={!!busy || detail.isSpam}>
                        <Headset size={15} aria-hidden="true" /> Tham gia chat
                      </button>
                    ) : null}
                    {detail.status !== 'ai' && detail.status !== 'closed' && (
                      <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void act('release', 'release')} disabled={!!busy}>
                        <Undo2 size={15} aria-hidden="true" /> Trả lại cho AI
                      </button>
                    )}
                    {detail.status === 'closed'
                      ? <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void act('reopen', 'reopen')} disabled={!!busy || detail.isSpam}>Mở lại</button>
                      : <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setConfirm('close')} disabled={!!busy}><XCircle size={15} aria-hidden="true" /> Kết thúc</button>}
                    {detail.isSpam
                      ? <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void act('unspam', 'spam', { spam: false })} disabled={!!busy}>Bỏ spam</button>
                      : <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setConfirm('spam')} disabled={!!busy}><ShieldAlert size={15} aria-hidden="true" /> Spam</button>}
                  </div>
                )}
              </div>
              {actionError && <p className="chatbox__notice is-error" role="alert">{actionError}</p>}

              <div className="chatthread">
                <div className="chatthread__messages" ref={threadRef} aria-live="polite">
                  {detail.messages.map((message) => message.role === 'system'
                    ? (
                      <p key={message.id} className="cmsg cmsg--system">
                        {message.body} <time dateTime={message.createdAt}>{clock(message.createdAt)}</time>
                        {message.internalNote && <span className="cmsg__note">Lý do kỹ thuật (chỉ nhân viên thấy): {message.internalNote}</span>}
                      </p>
                    )
                    : (
                      <div key={message.id} className={`cmsg cmsg--${message.role}`}>
                        <span className="cmsg__who">
                          {message.role === 'visitor' ? <CircleUserRound size={13} aria-hidden="true" /> : message.role === 'ai' ? <Bot size={13} aria-hidden="true" /> : <Headset size={13} aria-hidden="true" />}
                          {message.role === 'visitor' ? detail.visitorLabel : message.role === 'ai' ? 'Trợ lý AI' : message.authorName ?? 'Nhân viên'}
                          <time dateTime={message.createdAt}>{clock(message.createdAt)}</time>
                        </span>
                        <p className="cmsg__body">{message.body}</p>
                        {message.links.length > 0 && (
                          <span className="cmsg__links">
                            {message.links.map((link) => <a key={link.path} href={link.path} target="_blank" rel="noreferrer">{link.title} <ExternalLink size={11} aria-hidden="true" /></a>)}
                          </span>
                        )}
                      </div>
                    ))}
                </div>

                {canWrite && detail.status !== 'closed' && !detail.isSpam && (
                  <form className="chatthread__composer" onSubmit={send}>
                    {!joinedByMe && <p className="chatthread__hint">Gửi tin nhắn sẽ tự tham gia cuộc trò chuyện và tạm dừng trợ lý AI.</p>}
                    <label className="sr-only" htmlFor="chat-reply">Trả lời khách</label>
                    <textarea
                      id="chat-reply"
                      value={text}
                      rows={3}
                      maxLength={2000}
                      placeholder="Nhập câu trả lời cho khách… (Enter để gửi, Shift+Enter xuống dòng)"
                      onChange={(event) => setText(event.target.value)}
                      onKeyDown={onComposerKey}
                    />
                    <div className="chatthread__send">
                      <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void suggest()} disabled={!!busy}>
                        {busy === 'suggest' ? <LoaderCircle size={15} className="chatbox__spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />} AI gợi ý
                      </button>
                      <button type="submit" className="abtn abtn--primary abtn--sm" disabled={!text.trim() || !!busy}>
                        <Send size={15} aria-hidden="true" /> Gửi
                      </button>
                    </div>
                  </form>
                )}
              </div>

              <aside className="chatinfo" aria-label="Thông tin khách">
                <h3>Thông tin khách</h3>
                <dl>
                  <dt>Tên</dt><dd>{detail.visitorName ?? 'Chưa cho biết'}</dd>
                  <dt>Điện thoại</dt><dd>{detail.visitorPhone ? <a href={`tel:${detail.visitorPhone}`}>{detail.visitorPhone}</a> : 'Chưa để lại'}</dd>
                  <dt>Trang đang xem</dt><dd>{detail.lastPath ? <a href={detail.lastPath} target="_blank" rel="noreferrer">{detail.relatedContentTitle ?? detail.lastPath}</a> : '—'}</dd>
                  <dt>Vào từ trang</dt><dd>{detail.entryPath ?? '—'}</dd>
                  <dt>Bắt đầu</dt><dd>{clock(detail.createdAt)}</dd>
                  <dt>Lượt AI đã trả lời</dt><dd>{detail.aiReplyCount}</dd>
                </dl>
                {detail.inquiryId ? (
                  <Link className="abtn abtn--ghost abtn--sm" href="/admin/yeu-cau-tu-van"><FileText size={15} aria-hidden="true" /> Xem yêu cầu tư vấn</Link>
                ) : canWrite && detail.visitorPhone ? (
                  <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => void act('inquiry', 'inquiry')} disabled={!!busy}>
                    <FileText size={15} aria-hidden="true" /> Tạo yêu cầu tư vấn
                  </button>
                ) : (
                  <p className="ahint">Khi khách để lại số điện thoại, hệ thống tự tạo Yêu cầu tư vấn.</p>
                )}
              </aside>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => { const kind = confirm; setConfirm(null); if (kind === 'close') void act('close', 'close'); if (kind === 'spam') void act('spam', 'spam', { spam: true }); }}
        title={confirm === 'spam' ? 'Đánh dấu cuộc trò chuyện là spam?' : 'Kết thúc cuộc trò chuyện?'}
        tone={confirm === 'spam' ? 'danger' : 'default'}
        confirmLabel={confirm === 'spam' ? 'Đánh dấu spam' : 'Kết thúc cuộc trò chuyện'}
        busy={!!busy}
      >
        {confirm === 'spam'
          ? <p>Cuộc trò chuyện sẽ được đóng và chuyển vào mục Spam. Bạn có thể bỏ đánh dấu sau.</p>
          : <p>Khách sẽ thấy cuộc trò chuyện đã kết thúc. Nếu khách nhắn tiếp, hệ thống mở một cuộc trò chuyện mới.</p>}
      </ConfirmDialog>
    </section>
  );
}
