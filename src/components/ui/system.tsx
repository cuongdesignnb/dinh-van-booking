'use client';

import { CircleAlert, Inbox, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

/** Status label with a dot. The text always carries the meaning; colour only reinforces it. */
export function StatusPill({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`ui-badge ui-tone-${tone}${className ? ` ${className}` : ''}`}>
      <span className="ui-badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, actions, as = 'h2' }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; as?: 'h1' | 'h2' }) {
  const Heading = as;
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__titles">
        {eyebrow && <span className="ui-eyebrow">{eyebrow}</span>}
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ui-page-header__actions">{actions}</div>}
    </header>
  );
}

export function StateBlock({ kind = 'empty', title, text, action, icon }: { kind?: 'empty' | 'loading' | 'error'; title: string; text?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  const glyph = icon ?? (kind === 'error' ? <CircleAlert size={24} /> : kind === 'loading' ? <LoaderCircle size={24} className="ui-spin" /> : <Inbox size={24} />);
  return (
    <div className={`ui-state${kind === 'error' ? ' ui-state--error' : ''}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="ui-state__icon" aria-hidden="true">{glyph}</span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Stepper({ steps, current, label = 'Các bước' }: { steps: string[]; current: number; label?: string }) {
  return (
    <ol className="ui-stepper" aria-label={label}>
      {steps.map((step, index) => (
        <li key={step} className={index < current ? 'is-done' : undefined} aria-current={index === current ? 'step' : undefined}>
          <span className="ui-stepper__num" aria-hidden="true">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Side drawer on desktop, bottom sheet on phones. Native <dialog> gives focus
 * containment, Escape and an inert page; focus returns to the opener.
 */
export function Drawer({ open, onClose, title, eyebrow, description, footer, children, labelId, busy }: {
  open: boolean; onClose: () => void; title: ReactNode; eyebrow?: ReactNode; description?: ReactNode;
  footer?: ReactNode; children: ReactNode; labelId: string; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  // Portal only after mount so server and first client render match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      document.body.dataset.lock = 'true';
      requestAnimationFrame(() => dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, mounted]);

  useEffect(() => () => { delete document.body.dataset.lock; }, []);

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={ref}
      className="ui-drawer"
      aria-labelledby={labelId}
      onCancel={(event) => { if (busyRef.current) event.preventDefault(); }}
      onClose={() => {
        delete document.body.dataset.lock;
        onCloseRef.current();
        if (opener.current?.isConnected) opener.current.focus();
      }}
      onClick={(event) => { if (event.target === ref.current && !busyRef.current) ref.current?.close(); }}
    >
      {open && <>
        <header className="ui-drawer__head">
          <div>
            {eyebrow && <span className="ui-eyebrow">{eyebrow}</span>}
            <h2 id={labelId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--icon" onClick={() => ref.current?.close()} disabled={busy} aria-label="Đóng">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="ui-drawer__body">{children}</div>
        {footer && <footer className="ui-drawer__foot">{footer}</footer>}
      </>}
    </dialog>,
    document.body,
  );
}
