'use client';

import type { ReactNode } from 'react';
import { focusSearch, openDialog, type DialogRequest } from '@/lib/events';

type Action = DialogRequest | { type: 'focus-search' };

interface Props {
  action: Action;
  className?: string;
  children: ReactNode;
  label?: string;
  magnetic?: boolean;
}

/** Button that opens a global dialog (or focuses the search form) from server-rendered markup. */
export function ActionButton({ action, className, children, label, magnetic }: Props) {
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-haspopup={action.type === 'focus-search' ? undefined : 'dialog'}
      data-magnetic={magnetic || undefined}
      onClick={() => (action.type === 'focus-search' ? focusSearch() : openDialog(action))}
    >
      {children}
    </button>
  );
}
