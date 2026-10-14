import { apiPath, apiRequest } from '@/lib/api/client';

export type ChatRole = 'visitor' | 'ai' | 'staff' | 'system';
export type ChatStatus = 'ai' | 'waiting_human' | 'human' | 'closed';

export interface ChatLink { path: string; title: string }

export interface ChatMessage {
  id: string;
  seq: string;
  role: ChatRole;
  body: string;
  authorName: string | null;
  links: ChatLink[];
  askContact: boolean;
  createdAt: string;
}

export interface VisitorConversation {
  id: string;
  status: ChatStatus;
  hasPhone: boolean;
  messages: ChatMessage[];
}

const quiet = { quiet: true } as const;

export function chatSession() {
  return apiRequest<{ enabled: boolean; conversation: VisitorConversation | null }>('/chat/session', { cache: 'no-store' }, quiet);
}

export function chatMessagesAfter(after?: string) {
  const query = after ? `?after=${encodeURIComponent(after)}` : '';
  return apiRequest<{ conversation: VisitorConversation | null }>(`/chat/messages${query}`, { cache: 'no-store' }, quiet);
}

export function sendChatMessage(body: string, clientId: string, path: string) {
  return apiRequest<{ message: ChatMessage; conversation: VisitorConversation }>('/chat/messages', {
    method: 'POST',
    body: JSON.stringify({ body, clientId, path }),
  }, quiet);
}

export function shareChatContact(phone: string, name: string) {
  return apiRequest<{ conversation: VisitorConversation }>('/chat/contact', {
    method: 'POST',
    body: JSON.stringify({ phone, ...(name.trim() ? { name: name.trim() } : {}) }),
  }, quiet);
}

export function requestChatHuman() {
  return apiRequest<{ conversation: VisitorConversation }>('/chat/human', { method: 'POST', body: '{}' }, quiet);
}

export const chatStreamUrl = () => apiPath('/chat/stream');

export function newClientId(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '') : `${Date.now()}${Math.random().toString(36).slice(2)}`;
  return `c${random}`.slice(0, 40);
}

/** Merges server messages into the local list by id, keeping seq order. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => (BigInt(a.seq) < BigInt(b.seq) ? -1 : BigInt(a.seq) > BigInt(b.seq) ? 1 : 0));
}
