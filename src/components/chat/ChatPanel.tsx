'use client';

import { ArrowUp, Headset, LoaderCircle, Phone, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Image from '@/components/ui/ManagedImage';
import { AdvisorMonogram } from '@/components/home/HomeArt';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { ApiError } from '@/lib/api/client';
import {
  chatMessagesAfter,
  chatSession,
  chatStreamUrl,
  mergeMessages,
  newClientId,
  requestChatHuman,
  sendChatMessage,
  shareChatContact,
  type ChatMessage,
  type ChatStatus,
  type VisitorConversation,
} from '@/lib/chat/visitor';
import { publicAsset, publicSetting, publicText } from '@/lib/public-content';

type Pending = { clientId: string; body: string; failed: boolean };

const DEFAULT_GREETING = 'Xin chào! Mình là trợ lý AI. Bạn cần tìm chỗ nghỉ, combo hay gợi ý lịch trình cho chuyến đi? Nhân viên tư vấn có thể tham gia bất cứ lúc nào.';
const DEFAULT_QUICK = ['Tìm chỗ nghỉ phù hợp', 'Có combo nào đang mở?', 'Gợi ý lịch trình 2 ngày'];
const TYPING_TIMEOUT_MS = 40_000;

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Bạn gửi hơi nhanh, vui lòng đợi một chút rồi thử lại.';
    if (error.status === 403) return 'Phiên chat đã hết hạn, vui lòng tải lại trang.';
    if (error.message && error.status < 500) return error.message;
  }
  return 'Chưa gửi được, vui lòng thử lại.';
}

function quickReplies(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_QUICK;
  const items = value
    .filter((item) => !(item && typeof item === 'object' && (item as Record<string, unknown>).enabled === false))
    .map((item) => (typeof item === 'string' ? item : item && typeof item === 'object' ? publicText((item as Record<string, unknown>).label) : ''))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
  return items.length ? items : DEFAULT_QUICK;
}

function timeOf(iso: string): string {
  try { return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); } catch { return ''; }
}

export function ChatPanel({ open, draft, onDraftUsed, onClose, onUnread }: {
  open: boolean;
  draft?: string;
  onDraftUsed: () => void;
  onClose: () => void;
  onUnread: () => void;
}) {
  const site = useSiteData();
  const pathname = usePathname();
  const config = publicSetting(site.publicSite, 'chat.widget');
  const panel = publicSetting(site.publicSite, 'home.contactPanel');
  const advisorName = publicText(panel.advisorName);
  const portrait = publicAsset(site.publicSite, panel.advisorImageMediaId);
  const title = publicText(config.title) || (advisorName ? `Tư vấn cùng ${advisorName}` : 'Tư vấn chuyến đi');
  const subtitle = publicText(config.subtitle) || 'Trợ lý AI trả lời ngay · nhân viên có thể tham gia';
  const greeting = publicText(config.greeting) || DEFAULT_GREETING;
  const placeholder = publicText(config.inputPlaceholder) || 'Nhập câu hỏi của bạn…';
  const privacyNote = publicText(config.privacyNote);
  const chips = useMemo(() => quickReplies(config.quickReplies), [config.quickReplies]);

  const [conversation, setConversation] = useState<Omit<VisitorConversation, 'messages'> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typingSince, setTypingSince] = useState<number | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSeq = useRef<string | undefined>(undefined);
  const conversationId = useRef<string | null>(null);
  const openRef = useRef(open);
  const uid = useId();
  openRef.current = open;

  const apply = useCallback((next: VisitorConversation | null, replace = false) => {
    if (!next) return;
    const switched = conversationId.current !== next.id;
    conversationId.current = next.id;
    setConversation({ id: next.id, status: next.status, hasPhone: next.hasPhone });
    setMessages((current) => {
      const merged = replace || switched ? mergeMessages([], next.messages) : mergeMessages(current, next.messages);
      const newest = merged.at(-1);
      if (newest) {
        const previous = lastSeq.current;
        lastSeq.current = newest.seq;
        if (previous && BigInt(newest.seq) > BigInt(previous) && newest.role !== 'visitor' && !openRef.current) onUnread();
        if (newest.role !== 'visitor') setTypingSince(null);
      }
      return merged;
    });
  }, [onUnread]);

  const refresh = useCallback(async () => {
    try {
      const { conversation: next } = await chatMessagesAfter(lastSeq.current);
      if (next) apply(next);
    } catch { /* next event or poll retries */ }
  }, [apply]);

  // First load: issues the chat cookie and restores the visitor's conversation.
  useEffect(() => {
    let cancelled = false;
    chatSession()
      .then(({ conversation: current }) => { if (!cancelled) apply(current, true); })
      .catch(() => { if (!cancelled) setError('Chưa kết nối được khung chat. Vui lòng thử lại sau.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apply]);

  // Live updates over SSE, with a slow poll as a safety net.
  useEffect(() => {
    if (loading) return;
    let source: EventSource | null = null;
    try {
      source = new EventSource(chatStreamUrl(), { withCredentials: true });
      const onEvent = () => { void refresh(); };
      source.addEventListener('message.created', onEvent);
      source.addEventListener('conversation.updated', onEvent);
    } catch { source = null; }
    const timer = window.setInterval(() => { void refresh(); }, open ? 15_000 : 45_000);
    return () => { source?.close(); window.clearInterval(timer); };
  }, [loading, open, refresh]);

  useEffect(() => {
    if (!typingSince) return;
    const timer = window.setTimeout(() => setTypingSince(null), TYPING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [typingSince]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (draft && open) { setText(draft); onDraftUsed(); inputRef.current?.focus(); }
  }, [draft, open, onDraftUsed]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, pending, typingSince, contactOpen, open]);

  const status: ChatStatus | null = conversation?.status ?? null;
  const latest = messages.at(-1);
  const wantsContact = !conversation?.hasPhone && (contactOpen || (!!latest && latest.role !== 'visitor' && latest.askContact));
  const staffName = [...messages].reverse().find((message) => message.role === 'staff')?.authorName;

  const send = useCallback(async (body: string, retry?: Pending) => {
    const clean = body.trim();
    if (!clean) return;
    const item = retry ?? { clientId: newClientId(), body: clean, failed: false };
    setPending((current) => [...current.filter((entry) => entry.clientId !== item.clientId), { ...item, failed: false }]);
    setError(null);
    try {
      const result = await sendChatMessage(clean, item.clientId, pathname || '/');
      setPending((current) => current.filter((entry) => entry.clientId !== item.clientId));
      apply(result.conversation);
      if (result.conversation.status === 'ai') setTypingSince(Date.now());
    } catch (sendError) {
      setPending((current) => current.map((entry) => (entry.clientId === item.clientId ? { ...entry, failed: true } : entry)));
      setError(errorText(sendError));
    }
  }, [apply, pathname]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const body = text;
    if (!body.trim()) return;
    setText('');
    void send(body);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit();
  };

  const askHuman = async () => {
    setError(null);
    if (!conversation || conversation.status === 'closed') {
      await send('Mình muốn gặp nhân viên tư vấn.');
      return;
    }
    try { apply((await requestChatHuman()).conversation); } catch (humanError) { setError(errorText(humanError)); }
  };

  const submitContact = async (event: FormEvent) => {
    event.preventDefault();
    setContactBusy(true);
    setContactError(null);
    try {
      apply((await shareChatContact(phone, name)).conversation);
      setContactOpen(false);
      setPhone('');
    } catch (contactFailure) {
      setContactError(errorText(contactFailure));
    } finally {
      setContactBusy(false);
    }
  };

  const statusLine = status === 'human'
    ? `${staffName ?? 'Nhân viên tư vấn'} đang trò chuyện với bạn`
    : status === 'waiting_human'
      ? 'Đang chờ nhân viên tư vấn phản hồi'
      : status === 'closed'
        ? 'Cuộc trò chuyện đã kết thúc · nhắn tiếp để bắt đầu lại'
        : subtitle;

  return (
    <section
      id="dvb-chat-panel"
      className="chatp"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${uid}-title`}
      hidden={!open}
    >
      <header className="chatp__head">
        <span className="chatp__avatar">
          {portrait?.src
            ? <Image src={portrait.src} alt="" width={44} height={44} unoptimized />
            : <AdvisorMonogram name={advisorName || 'Tư vấn'} idPrefix="chat-adv" />}
          <span className="chatp__dot" data-status={status ?? 'ai'} aria-hidden="true" />
        </span>
        <div className="chatp__titles">
          <h2 className="chatp__title" id={`${uid}-title`}>{title}</h2>
          <p className="chatp__status">{statusLine}</p>
        </div>
        <button type="button" className="chatp__icon" onClick={onClose} aria-label="Thu nhỏ khung chat">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="chatp__list" ref={listRef} aria-live="polite" aria-relevant="additions">
        <div className="chatm chatm--ai">
          <span className="chatm__who">Trợ lý AI</span>
          <p className="chatm__bubble">{greeting}</p>
        </div>
        {loading && <p className="chatp__loading"><LoaderCircle size={16} className="chatp__spin" aria-hidden="true" /> Đang mở cuộc trò chuyện…</p>}
        {messages.map((message) => message.role === 'system'
          ? <p key={message.id} className="chatm chatm--system">{message.body}</p>
          : (
            <div key={message.id} className={`chatm chatm--${message.role}`}>
              {message.role !== 'visitor' && (
                <span className="chatm__who">{message.role === 'staff' ? message.authorName ?? 'Nhân viên tư vấn' : 'Trợ lý AI'}</span>
              )}
              <p className="chatm__bubble">{message.body}</p>
              {message.links.length > 0 && (
                <span className="chatm__links">
                  {message.links.map((link) => (
                    <Link key={link.path} href={link.path} className="chatm__link" onClick={() => onClose()}>{link.title}</Link>
                  ))}
                </span>
              )}
              <time className="chatm__time" dateTime={message.createdAt}>{timeOf(message.createdAt)}</time>
            </div>
          ))}
        {pending.map((item) => (
          <div key={item.clientId} className="chatm chatm--visitor" data-pending={!item.failed || undefined} data-failed={item.failed || undefined}>
            <p className="chatm__bubble">{item.body}</p>
            {item.failed
              ? <button type="button" className="chatm__retry" onClick={() => void send(item.body, item)}><RotateCcw size={13} aria-hidden="true" /> Gửi lại</button>
              : <span className="chatm__time">Đang gửi…</span>}
          </div>
        ))}
        {typingSince && status === 'ai' && (
          <p className="chatm chatm--typing" aria-label="Trợ lý đang trả lời"><span /><span /><span /></p>
        )}
        {!loading && messages.length === 0 && pending.length === 0 && (
          <div className="chatp__chips">
            {chips.map((chip) => (
              <button key={chip} type="button" className="chatp__chip" onClick={() => void send(chip)}>{chip}</button>
            ))}
          </div>
        )}
        {wantsContact && (
          <form className="chatp__contact" onSubmit={submitContact}>
            <p className="chatp__contact-title"><Phone size={15} aria-hidden="true" /> Để lại số điện thoại hoặc Zalo để được gọi lại</p>
            <div className="chatp__contact-row">
              <label className="sr-only" htmlFor={`${uid}-name`}>Tên của bạn</label>
              <input id={`${uid}-name`} className="chatp__field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên (không bắt buộc)" autoComplete="name" maxLength={80} />
              <label className="sr-only" htmlFor={`${uid}-phone`}>Số điện thoại</label>
              <input id={`${uid}-phone`} className="chatp__field" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Số điện thoại / Zalo" inputMode="tel" autoComplete="tel" required maxLength={20} />
            </div>
            {contactError && <p className="chatp__error" role="alert">{contactError}</p>}
            <button type="submit" className="chatp__contact-btn" disabled={contactBusy || phone.replace(/\D/g, '').length < 9}>
              {contactBusy ? 'Đang gửi…' : 'Gửi số điện thoại'}
            </button>
          </form>
        )}
      </div>

      <footer className="chatp__foot">
        {error && <p className="chatp__error" role="alert">{error}</p>}
        {(status !== 'human' && status !== 'waiting_human') || (!conversation?.hasPhone && messages.length > 0 && !wantsContact) ? (
          <div className="chatp__actions">
            {status !== 'human' && status !== 'waiting_human' && (
              <button type="button" className="chatp__ghost" onClick={() => void askHuman()}>
                <Headset size={15} aria-hidden="true" /> Gặp nhân viên
              </button>
            )}
            {!conversation?.hasPhone && messages.length > 0 && !wantsContact && (
              <button type="button" className="chatp__ghost" onClick={() => setContactOpen(true)}>
                <Phone size={15} aria-hidden="true" /> Để lại SĐT
              </button>
            )}
          </div>
        ) : null}
        <form className="chatp__composer" onSubmit={submit}>
          <label className="sr-only" htmlFor={`${uid}-input`}>Tin nhắn</label>
          <textarea
            id={`${uid}-input`}
            ref={inputRef}
            className="chatp__input"
            rows={1}
            value={text}
            maxLength={2000}
            placeholder={placeholder}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="chatp__send" disabled={!text.trim()} aria-label="Gửi tin nhắn">
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </form>
        {privacyNote && <p className="chatp__note">{privacyNote}</p>}
      </footer>
    </section>
  );
}
