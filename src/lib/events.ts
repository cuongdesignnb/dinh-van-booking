/**
 * Tiny window-event bus so server-rendered sections can trigger client UI
 * (dialogs, focusing the search form) without becoming client components.
 */
export type DialogRequest =
  | { type: 'stay'; id: string }
  | { type: 'all-stays' }
  | { type: 'destination'; id: string }
  | { type: 'all-destinations' }
  | { type: 'reviews' }
  | { type: 'combo' }
  | { type: 'contact'; channel: 'zalo' | 'phone' | 'social' | 'email'; need?: string }
  | {
      type: 'search-results';
      checkIn: string;
      checkOut: string;
      adults: number;
      children: number;
    };

const DIALOG_EVENT = 'dvb:dialog';
const FOCUS_SEARCH_EVENT = 'dvb:focus-search';

export function openDialog(request: DialogRequest) {
  window.dispatchEvent(new CustomEvent<DialogRequest>(DIALOG_EVENT, { detail: request }));
}

export function onDialogRequest(handler: (request: DialogRequest) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<DialogRequest>).detail);
  window.addEventListener(DIALOG_EVENT, listener);
  return () => window.removeEventListener(DIALOG_EVENT, listener);
}

export function focusSearch() {
  window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
}

export function onFocusSearch(handler: () => void) {
  window.addEventListener(FOCUS_SEARCH_EVENT, handler);
  return () => window.removeEventListener(FOCUS_SEARCH_EVENT, handler);
}
