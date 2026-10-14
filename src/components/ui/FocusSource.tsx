'use client';

import { useEffect } from 'react';

/**
 * Records whether the visitor is navigating with a pointer or the keyboard on
 * <html data-focus-source>. Field and card focus cues are styled only for
 * keyboard navigation, so a mouse click or a tap never draws an "active" box,
 * while Tab users still see where they are. Typing inside a field does not
 * count as keyboard navigation; only Tab does.
 */
export function FocusSource() {
  useEffect(() => {
    const root = document.documentElement;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Tab') root.dataset.focusSource = 'keyboard'; };
    const onPointer = () => { root.dataset.focusSource = 'pointer'; };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);
  return null;
}
