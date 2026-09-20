'use client';

import { ChevronLeft, ChevronRight, CircleAlert, Info, Search, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';

/* ------------------------------------------------------------------ cards */

export function StatCard({
  icon,
  tone = 'green',
  label,
  value,
  delta,
  deltaTone,
  caption,
  hint,
  href,
  onClick,
}: {
  icon: ReactNode;
  tone?: 'green' | 'mint' | 'cream' | 'rose' | 'sky';
  label: string;
  value: ReactNode;
  delta?: string;
  /** "up" is green, "down" is red — pass explicitly when a drop is good news. */
  deltaTone?: 'good' | 'bad' | 'muted';
  caption?: ReactNode;
  hint?: string;
  href?: string;
  onClick?: () => void;
}) {
  const Tag = href ? 'a' : onClick ? 'button' : 'div';
  return (
    <Tag
      className={`kpi kpi--${tone}${href || onClick ? ' kpi--link' : ''}`}
      {...(href ? { href } : {})}
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      title={hint}
    >
      <span className="kpi__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">
        <strong className="numeric">{value}</strong>
        {delta && (
          <span className={`kpi__delta kpi__delta--${deltaTone ?? 'good'}`}>
            <span aria-hidden="true">{deltaTone === 'bad' ? '▼' : '▲'}</span> {delta}
          </span>
        )}
      </span>
      {caption && <span className="kpi__caption">{caption}</span>}
    </Tag>
  );
}

export function Panel({
  icon,
  title,
  action,
  children,
  className = '',
  headExtra,
  id,
}: {
  icon?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  headExtra?: ReactNode;
  id?: string;
}) {
  return (
    <section className={`acard ${className}`} id={id}>
      <header className="acard__head">
        {icon && (
          <span className="acard__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 className="panel-heading">{title}</h2>
        {headExtra}
        {action && <div className="acard__action">{action}</div>}
      </header>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------- badges */

export function StatusBadge({ label, tone, small }: { label: string; tone: string; small?: boolean }) {
  return <span className={`abadge abadge--${tone}${small ? ' abadge--sm' : ''}`}>{label}</span>;
}

/* ------------------------------------------------------------- pagination */

export function AdminPagination({
  page,
  pages,
  onChange,
  compact,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
  compact?: boolean;
}) {
  if (pages <= 1) return null;
  const nums: (number | 'gap')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i <= (compact ? 3 : 5) || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums.at(-1) !== 'gap') nums.push('gap');
  }
  return (
    <nav className="apager" aria-label="Phân trang">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Trang trước">
        <ChevronLeft size={15} aria-hidden="true" />
      </button>
      {nums.map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} className="apager__gap">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Trang ${n}`}
            className={n === page ? 'is-active' : undefined}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Trang sau">
        <ChevronRight size={15} aria-hidden="true" />
      </button>
    </nav>
  );
}

/* ----------------------------------------------------------------- states */

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="astate" role="status">
      <Search size={20} aria-hidden="true" />
      <p>
        <strong>{title}</strong>
        {text && <> {text}</>}
      </p>
      {action}
    </div>
  );
}

export function ErrorState({ title, text, onRetry }: { title: string; text?: string; onRetry?: () => void }) {
  return (
    <div className="astate astate--error" role="alert">
      <CircleAlert size={20} aria-hidden="true" />
      <p>
        <strong>{title}</strong>
        {text && <> {text}</>}
      </p>
      {onRetry && (
        <button type="button" className="abtn abtn--primary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function DemoTag({ children = 'Dữ liệu mẫu' }: { children?: ReactNode }) {
  return (
    <span className="ademo">
      <Info size={12} aria-hidden="true" /> {children}
    </span>
  );
}

/* ---------------------------------------------------------------- dialogs */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  tone = 'default',
  confirmLabel = 'Xác nhận',
  busy,
  children,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  tone?: 'default' | 'danger';
  confirmLabel?: string;
  busy?: boolean;
  children: ReactNode;
  /** When set, a reason is required before the action can run. */
  reason?: { label: string; placeholder?: string; options?: string[] };
}) {
  const id = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} labelledBy={id} className="dialog--admin" size="md">
      <h2 id={id} className="dialog__title">
        {tone === 'danger' && <TriangleAlert size={18} aria-hidden="true" />} {title}
      </h2>
      <div className="adialog__body">{children}</div>
      {reason && (
        <div className="afield">
          <label htmlFor={`${id}-reason`}>{reason.label}</label>
          {reason.options ? (
            <select
              id={`${id}-reason`}
              className="ainput"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
            >
              <option value="">— Chọn lý do —</option>
              {reason.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              id={`${id}-reason`}
              className="ainput"
              rows={3}
              value={value}
              placeholder={reason.placeholder}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
            />
          )}
          {error && (
            <p className="aerror" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      <div className="adialog__actions">
        <button type="button" className="abtn abtn--ghost" onClick={onClose}>
          Đóng
        </button>
        <button
          type="button"
          className={`abtn ${tone === 'danger' ? 'abtn--danger' : 'abtn--primary'}`}
          data-autofocus
          disabled={busy}
          onClick={() => {
            if (reason && !value.trim()) {
              setError('Vui lòng nhập lý do trước khi tiếp tục.');
              return;
            }
            onConfirm(value.trim());
          }}
        >
          {busy ? 'Đang xử lý…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Slide-over used for create/edit forms. Modal semantics (focus trap + Escape). */
export function FormDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
  dirty,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Ask before discarding unsaved edits. */
  dirty?: boolean;
}) {
  const id = useId();
  const [confirm, setConfirm] = useState(false);
  const close = () => (dirty ? setConfirm(true) : onClose());
  return (
    <>
      <Modal open={open} onClose={close} labelledBy={id} className={`dialog--admin dialog--drawer-right${wide ? ' is-wide' : ''}`} size="xl">
        <header className="adrawer__head">
          <h2 id={id}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </header>
        <div className="adrawer__body">{children}</div>
        {footer && <footer className="adrawer__foot">{footer}</footer>}
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onClose();
        }}
        title="Bỏ các thay đổi chưa lưu?"
        tone="danger"
        confirmLabel="Bỏ thay đổi"
      >
        <p>Biểu mẫu đang có nội dung chưa lưu. Đóng bây giờ sẽ mất các thay đổi đó.</p>
      </ConfirmDialog>
    </>
  );
}

/* ------------------------------------------------------------------ form */

export function Field({
  label,
  required,
  hint,
  error,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={`afield ${className}`}>
      <label htmlFor={id}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(' ') || undefined, invalid: Boolean(error) })}
      {hint && (
        <p className="ahint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="aerror" id={errId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="atoggle">
      <span className="atoggle__text">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="atoggle__track" aria-hidden="true">
        <span className="atoggle__thumb" />
      </span>
    </label>
  );
}

/** Row menu (…) rendered as a small popup list. */
export function RowMenu({ label, items }: { label: string; items: { label: string; onSelect: () => void; tone?: 'danger' }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="arowmenu" ref={ref}>
      <button type="button" className="arowmenu__btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} aria-label={label}>
        <span aria-hidden="true">•••</span>
      </button>
      {open && (
        <ul className="arowmenu__list" role="menu">
          {items.map((it) => (
            <li key={it.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={it.tone === 'danger' ? 'is-danger' : undefined}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
