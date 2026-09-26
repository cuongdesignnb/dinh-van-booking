'use client';

import { ArrowRight, Copy, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSiteData } from '@/components/site/SiteDataProvider';
import { onDialogRequest, type DialogRequest } from '@/lib/events';
import { DEFAULT_SELECTION, dateError, selectionQuery } from '@/lib/selection';
import { DateRangePicker } from './DateRangePicker';
import { GuestPicker } from './GuestPicker';
import { Modal } from './Modal';

/** Global dialogs any page can request through `openDialog()`. */
export function DialogHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(
    () =>
      onDialogRequest((next) => {
        setReq(next);
        setNonce((n) => n + 1);
      }),
    [],
  );

  return (
    <Modal open={!!req} onClose={() => setReq(null)} labelledBy="dialog-title">
      {req && <DialogContent key={nonce} req={req} onDone={() => setReq(null)} />}
    </Modal>
  );
}

function DialogContent({ req, onDone }: { req: DialogRequest; onDone: () => void }) {
  const site = useSiteData();
  switch (req.type) {
    case 'reviews':
      return (
        <>
          <h2 id="dialog-title" className="dialog__title">
            Khách hàng nói về {site.name || 'website'}
          </h2>
          <p className="dialog__pending" role="status">
            Chưa có đánh giá đã được công bố.
          </p>
        </>
      );
    case 'search':
      return <SearchDialog onDone={onDone} />;
    case 'contact':
      return (
        <ContactPending
          title={
            req.channel === 'zalo'
              ? 'Nhắn Zalo cho Đinh Vân'
              : req.channel === 'phone'
                ? 'Gọi cho Đinh Vân'
                : req.channel === 'chat'
                  ? 'Chat với Đinh Vân'
                  : 'Kết nối với Đinh Vân'
          }
          lead="Hãy liên hệ với mình để được gợi ý phòng nghỉ, lịch trình phù hợp nhất nhé!"
          need={req.need ?? ''}
        />
      );
  }
}

function SearchDialog({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [sel, setSel] = useState(DEFAULT_SELECTION);
  const [field, setField] = useState<'in' | 'out'>('in');
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <h2 id="dialog-title" className="dialog__title">
        Tìm phòng nghỉ
      </h2>
      <p className="dialog__lead">Chọn ngày và số khách, mình sẽ gợi ý những nơi phù hợp.</p>
      <div className="search-dialog">
        <DateRangePicker
          checkIn={sel.checkIn}
          checkOut={sel.checkOut}
          field={field}
          onFieldChange={setField}
          onChange={(checkIn, checkOut) => {
            setSel((s) => ({ ...s, checkIn, checkOut }));
            setError(null);
          }}
          onDone={() => setField('in')}
          autoFocus={false}
        />
        <GuestPicker
          adults={sel.adults}
          childCount={sel.children}
          rooms={sel.rooms}
          onChange={(adults, children, rooms) => setSel((s) => ({ ...s, adults, children, rooms: rooms ?? s.rooms }))}
        />
      </div>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog__actions">
        <button
          type="button"
          className="btn btn--primary"
          data-autofocus
          onClick={() => {
            const err = dateError(sel);
            if (err) {
              setError(err.message);
              return;
            }
            onDone();
            router.push(`/phong-nghi?${selectionQuery(sel)}`);
          }}
        >
          Tìm phòng <ArrowRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn--light"
          onClick={() => {
            onDone();
            router.push('/phong-nghi');
          }}
        >
          Xem tất cả phòng
        </button>
      </div>
    </>
  );
}

/** Shown whenever a contact channel is not configured yet. */
export function ContactPending({ title, lead, need }: { title: string; lead: string; need: string }) {
  const [text, setText] = useState(need);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const { contact } = useSiteData();
  const hasContact = contact.zaloUrl || contact.phone;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };
  return (
    <>
      <h2 id="dialog-title" className="dialog__title">
        {title}
      </h2>
      <p className="dialog__lead">{lead}</p>
      {!hasContact && (
        <p className="dialog__pending" role="status">
          <Info size={16} aria-hidden="true" /> Thông tin liên hệ đang được cập nhật.
        </p>
      )}
      <label className="field">
        <span className="field__label">Nhu cầu của bạn (để sao chép gửi cho mình)</span>
        <textarea
          className="field__input"
          rows={4}
          value={text}
          data-autofocus
          placeholder="Ví dụ: 2 người lớn, 1 trẻ em, muốn ở gần Vườn quốc gia 2 đêm…"
          onChange={(e) => {
            setText(e.target.value);
            setCopied('idle');
          }}
        />
      </label>
      <div className="dialog__actions">
        <button type="button" className="btn btn--light" onClick={copy} disabled={!text.trim()}>
          <Copy size={16} aria-hidden="true" /> Sao chép nhu cầu
        </button>
        <Link className="btn btn--primary" href="/lien-he">
          Mở trang tư vấn <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <span className="dialog__copied" role="status">
          {copied === 'ok'
            ? 'Đã sao chép.'
            : copied === 'fail'
              ? 'Không sao chép được, hãy chọn và sao chép thủ công.'
              : ''}
        </span>
      </div>
    </>
  );
}
