import { Prisma } from '../generated/prisma/client';
import { previewOf } from './chat-text';

export type ChatRole = 'visitor' | 'ai' | 'staff' | 'system';
export type ChatStatus = 'ai' | 'waiting_human' | 'human' | 'closed';
export const CHAT_STATUSES: readonly ChatStatus[] = ['ai', 'waiting_human', 'human', 'closed'];

export interface ChatLink { path: string; title: string }

export interface ChatMessageView {
  id: string;
  seq: string;
  role: ChatRole;
  body: string;
  authorName: string | null;
  links: ChatLink[];
  askContact: boolean;
  createdAt: string;
}

export const MESSAGE_SELECT = {
  id: true, seq: true, role: true, body: true, meta: true, createdAt: true,
  author: { select: { fullName: true } },
} as const satisfies Prisma.ChatMessageSelect;

type MessageRow = Prisma.ChatMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

function metaRecord(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === 'object' && !Array.isArray(meta) ? meta as Record<string, unknown> : {};
}

export function toMessageView(row: MessageRow): ChatMessageView {
  const meta = metaRecord(row.meta);
  const links = Array.isArray(meta.links)
    ? meta.links.filter((link): link is ChatLink => !!link && typeof link === 'object' && typeof (link as ChatLink).path === 'string' && typeof (link as ChatLink).title === 'string')
    : [];
  return {
    id: row.id,
    seq: row.seq.toString(),
    role: row.role as ChatRole,
    body: row.body,
    authorName: row.role === 'staff' ? row.author?.fullName ?? null : null,
    links,
    askContact: meta.askContact === true,
    createdAt: row.createdAt.toISOString(),
  };
}

interface AppendInput {
  conversationId: string;
  role: ChatRole;
  body: string;
  authorUserId?: string | null;
  clientId?: string | null;
  meta?: Prisma.InputJsonObject;
}

/**
 * Inserts one message and moves the conversation's activity markers with it.
 * Callers pass a transaction client so status changes land atomically.
 */
export async function appendMessage(
  db: Prisma.TransactionClient,
  input: AppendInput,
  conversationData: Prisma.ChatConversationUpdateInput = {},
): Promise<MessageRow> {
  const message = await db.chatMessage.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      body: input.body,
      authorUserId: input.authorUserId ?? null,
      clientId: input.clientId ?? null,
      ...(input.meta ? { meta: input.meta } : {}),
    },
    select: MESSAGE_SELECT,
  });
  await db.chatConversation.update({
    where: { id: input.conversationId },
    data: {
      lastMessageAt: message.createdAt,
      lastMessagePreview: previewOf(input.body),
      ...(input.role === 'visitor' ? { lastVisitorMessageAt: message.createdAt, lastVisitorSeq: message.seq } : {}),
      version: { increment: 1 },
      ...conversationData,
    },
  });
  return message;
}

/** Start of the current business day (Asia/Ho_Chi_Minh, UTC+7, no DST). */
export function startOfBusinessDay(now = new Date()): Date {
  const offset = 7 * 3_600_000;
  const local = new Date(now.getTime() + offset);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offset);
}
