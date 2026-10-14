/**
 * Tiny window-event bus so server-rendered sections can trigger client UI
 * (global dialogs, focusing a page's search form) without becoming client
 * components themselves.
 */
import type { Review } from '@/data/types';

type PublishedReview = Pick<Review, 'id' | 'author' | 'quote' | 'context' | 'rating'>;

export type DialogRequest =
  | { type: 'reviews'; title: string; items: PublishedReview[] }
  | { type: 'search' }
  | { type: 'contact'; channel: 'zalo' | 'phone' | 'social' | 'email' | 'chat'; need?: string };

const DIALOG_EVENT = 'dvb:dialog';
const FOCUS_SEARCH_EVENT = 'dvb:focus-search';
let searchTargets = 0;

export function openDialog(request: DialogRequest) {
  window.dispatchEvent(new CustomEvent<DialogRequest>(DIALOG_EVENT, { detail: request }));
}

export function onDialogRequest(handler: (request: DialogRequest) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<DialogRequest>).detail);
  window.addEventListener(DIALOG_EVENT, listener);
  return () => window.removeEventListener(DIALOG_EVENT, listener);
}

/** Focus the page's own search form, or open the global search dialog. */
export function focusSearch() {
  if (searchTargets > 0) window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
  else openDialog({ type: 'search' });
}

export function onFocusSearch(handler: () => void) {
  searchTargets += 1;
  window.addEventListener(FOCUS_SEARCH_EVENT, handler);
  return () => {
    searchTargets -= 1;
    window.removeEventListener(FOCUS_SEARCH_EVENT, handler);
  };
}

const OPEN_CHAT_EVENT = 'dvb:open-chat';

/** Opens the website chat panel (if the chat is enabled), optionally with a first message prefilled. */
export function openChat(draft?: string) {
  window.dispatchEvent(new CustomEvent<{ draft?: string }>(OPEN_CHAT_EVENT, { detail: { draft } }));
}

export function onOpenChat(handler: (draft?: string) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<{ draft?: string }>).detail?.draft);
  window.addEventListener(OPEN_CHAT_EVENT, listener);
  return () => window.removeEventListener(OPEN_CHAT_EVENT, listener);
}
