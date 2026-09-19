'use client';

import { Info, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog (usually its h2). */
  labelledBy: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
  children: ReactNode;
}

/**
 * Controlled native <dialog>. `showModal()` provides the inert background,
 * Escape handling and focus containment; we restore focus to the opener.
 * First `[data-autofocus]` element (or the close button) receives focus.
 */
export function Modal({ open, onClose, labelledBy, size = 'md', className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Portal to <body> so a dialog never ends up inside <p>/<button> markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.showModal();
      document.body.dataset.lock = 'true';
      requestAnimationFrame(() => {
        d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
        d.querySelector<HTMLElement>('.dialog__body')?.scrollTo({ top: 0 });
      });
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, mounted]);

  useEffect(
    () => () => {
      delete document.body.dataset.lock;
    },
    [],
  );

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={ref}
      className={`dialog dialog--${size}${className ? ` ${className}` : ''}`}
      aria-labelledby={labelledBy}
      onClose={() => {
        delete document.body.dataset.lock;
        onCloseRef.current();
        const el = opener.current;
        if (el?.isConnected) el.focus();
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      {open && (
        <div className="dialog__panel">
          <button
            type="button"
            className="dialog__close icon-btn"
            onClick={() => ref.current?.close()}
            aria-label="Đóng hộp thoại"
          >
            <X size={18} aria-hidden="true" />
          </button>
          <div className="dialog__body">{children}</div>
        </div>
      )}
    </dialog>,
    document.body,
  );
}

export function DemoNote({ children, tone = 'demo' }: { children: ReactNode; tone?: 'demo' | 'info' }) {
  return (
    <p className={tone === 'demo' ? 'dialog__note' : 'dialog__pending'}>
      <Info size={15} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
