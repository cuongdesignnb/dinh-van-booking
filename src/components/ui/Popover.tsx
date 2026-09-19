'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: (reason: 'escape' | 'outside' | 'tab') => void;
  label: string;
  id: string;
  align?: 'start' | 'end';
  children: ReactNode;
}

/**
 * Non-modal popover rendered in a portal so the hero's overflow never clips it.
 * Closes on Escape, outside pointer and Tab-out; the caller restores focus.
 */
export function Popover({ anchorRef, open, onClose, label, id, align = 'start', children }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; fixed: boolean } | null>(null);
  // Inside a modal <dialog> everything outside is inert, so render there.
  const host = (open && anchorRef.current?.closest('dialog')) || null;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const r = anchor.getBoundingClientRect();
      const w = panel.offsetWidth;
      const vw = document.documentElement.clientWidth;
      let left = align === 'end' ? r.right - w : r.left;
      left = Math.max(12, Math.min(left, vw - w - 12));
      if (anchor.closest('dialog')) setPos({ top: r.bottom + 8, left, fixed: true });
      else setPos({ top: r.bottom + window.scrollY + 10, left: left + window.scrollX, fixed: false });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, { capture: true });
    };
  }, [open, anchorRef, align]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Keep an enclosing modal <dialog> open: only the popover closes.
        e.preventDefault();
        e.stopPropagation();
        onClose('escape');
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose('outside');
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose('tab');
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label={label}
      className="popover"
      data-placed={pos ? 'true' : 'false'}
      style={pos ? { top: pos.top, left: pos.left, position: pos.fixed ? 'fixed' : 'absolute' } : { top: 0, left: 0 }}
    >
      {children}
    </div>,
    host ?? document.body,
  );
}
