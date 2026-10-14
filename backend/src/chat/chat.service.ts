import { BadRequestException, ConflictException, Injectable, NotFoundException, type MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Prisma } from '../generated/prisma/client';
import { AuthService } from '../auth/auth.service';
import { loadConfig } from '../common/config/env';
import { hashIp, newToken, sha256 } from '../common/crypto';
import type { AuthenticatedUser, Paginated } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { ChatAiService } from './chat-ai.service';
import { ChatEventsService } from './chat-events.service';
import { appendMessage, MESSAGE_SELECT, toMessageView, type ChatMessageView, type ChatStatus } from './chat-store';
import {
  cleanMessageBody,
  extractPhone,
  isValidVietnamesePhone,
  normalizePhone,
  pageKindFromPath,
  sanitizePath,
} from './chat-text';

export const CHAT_VISITOR_COOKIE = 'dvb_chat';
export const CHAT_VISITOR_TTL_MS = 30 * 86_400_000;
const HISTORY_WINDOW_MS = 30 * 86_400_000;
const VISITOR_MESSAGE_PAGE = 100;
const ADMIN_MESSAGE_PAGE = 300;

export const CHAT_VIEWS = ['needs_action', 'new', 'ai', 'human', 'mine', 'unassigned', 'closed', 'spam', 'all'] as const;
export type ChatView = (typeof CHAT_VIEWS)[number];
const PAGE_KINDS = new Set(['stay', 'combo', 'destination', 'article', 'listing', 'other']);

export interface VisitorMeta { ip?: string; userAgent?: string }

export interface VisitorConversationView {
  id: string;
  status: ChatStatus;
  hasPhone: boolean;
  messages: ChatMessageView[];
}

export interface ChatListItem {
  id: string;
  status: ChatStatus;
  visitorLabel: string;
  visitorName: string | null;
  visitorPhone: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  lastVisitorMessageAt: string | null;
  unread: boolean;
  handoffReason: string | null;
  isSpam: boolean;
  pageKind: string | null;
  lastPath: string | null;
  assignedUser: { id: string; fullName: string } | null;
  inquiryId: string | null;
  createdAt: string;
}

export interface ChatDetail extends ChatListItem {
  entryPath: string | null;
  relatedContentTitle: string | null;
  aiReplyCount: number;
  closedAt: string | null;
  version: number;
  messages: ChatMessageView[];
}

export interface ListChatsQuery {
  view?: string;
  search?: string;
  from?: string;
  to?: string;
  hasPhone?: string;
  pageKind?: string;
  page?: string | number;
  pageSize?: string | number;
}

const LIST_INCLUDE = { assignedUser: { select: { id: true, fullName: true } } } as const satisfies Prisma.ChatConversationInclude;
type ConversationRow = Prisma.ChatConversationGetPayload<{ include: typeof LIST_INCLUDE }>;

@Injectable()
export class ChatService {
  private readonly config = loadConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly events: ChatEventsService,
    private readonly ai: ChatAiService,
  ) {}

  /* ------------------------------------------------------------ visitor */

  static newVisitorToken(): string {
    return newToken(32);
  }

  visitorKey(token: string): string {
    return sha256(`chat:${token}`);
  }

  /** The visitor's most recent conversation (open, or closed within the history window). */
  private async currentConversation(visitorKey: string) {
    return this.prisma.chatConversation.findFirst({
      where: { visitorTokenHash: visitorKey, isSpam: false, createdAt: { gte: new Date(Date.now() - HISTORY_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async visitorView(token: string, afterSeq?: string): Promise<VisitorConversationView | null> {
    const conversation = await this.currentConversation(this.visitorKey(token));
    if (!conversation) return null;
    const after = afterSeq && /^\d{1,19}$/.test(afterSeq) ? BigInt(afterSeq) : null;
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id, ...(after !== null ? { seq: { gt: after } } : {}) },
      orderBy: { seq: after !== null ? 'asc' : 'desc' },
      take: VISITOR_MESSAGE_PAGE,
      select: MESSAGE_SELECT,
    });
    if (after === null) rows.reverse();
    return {
      id: conversation.id,
      status: conversation.status as ChatStatus,
      hasPhone: !!conversation.visitorPhone,
      messages: rows.map((row) => toMessageView(row)),
    };
  }

  async postVisitorMessage(
    token: string,
    input: { body?: unknown; clientId?: unknown; path?: unknown },
    meta: VisitorMeta,
  ): Promise<{ message: ChatMessageView; conversation: VisitorConversationView }> {
    const body = cleanMessageBody(input.body);
    if (!body) throw new BadRequestException('Tin nhắn trống');
    const clientId = typeof input.clientId === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(input.clientId) ? input.clientId : null;
    if (!clientId) throw new BadRequestException('Thiếu mã tin nhắn hợp lệ');
    const path = sanitizePath(input.path);
    const visitorKey = this.visitorKey(token);
    await this.auth.consumeRateLimit('chat-message', visitorKey, 20, 5 * 60_000, 5 * 60_000);

    let conversation = await this.currentConversation(visitorKey);
    if (conversation && conversation.status !== 'closed') {
      const duplicate = await this.prisma.chatMessage.findUnique({
        where: { conversationId_clientId: { conversationId: conversation.id, clientId } },
        select: MESSAGE_SELECT,
      });
      if (duplicate) return { message: toMessageView(duplicate), conversation: (await this.visitorView(token))! };
    }
    if (!conversation || conversation.status === 'closed') {
      if (meta.ip) await this.auth.consumeRateLimit('chat-new-ip', meta.ip, 8, 60 * 60_000, 60 * 60_000);
      conversation = await this.prisma.chatConversation.create({
        data: {
          visitorTokenHash: visitorKey,
          entryPath: path,
          lastPath: path,
          pageKind: pageKindFromPath(path),
          ipHash: hashIp(meta.ip, this.config.sessionSecret),
          userAgent: meta.userAgent?.slice(0, 255) ?? null,
        },
      });
    }
    const conversationId = conversation.id;
    const phone = extractPhone(body);
    const relatedContentId = path ? await this.contentIdForPath(path) : undefined;
    // A failed AI turn is not a staff decision: while nobody has picked the chat up, the next message retries the AI.
    const retryAi = conversation.status === 'waiting_human' && conversation.handoffReason === 'ai_error' && !conversation.assignedUserId;
    const status = retryAi ? 'ai' : conversation.status;

    const message = await this.prisma.$transaction(async (tx) => appendMessage(tx, {
      conversationId, role: 'visitor', body, clientId,
    }, {
      ...(path ? { lastPath: path, pageKind: pageKindFromPath(path) } : {}),
      ...(relatedContentId !== undefined ? { relatedContentId } : {}),
      ...(retryAi ? { status: 'ai', handoffReason: null } : {}),
    }));
    this.events.emit({ type: 'message.created', conversationId, status, visitorKey });
    if (retryAi) this.events.emit({ type: 'conversation.updated', conversationId, status, visitorKey });

    if (phone && !conversation.visitorPhone) {
      await this.attachContact(conversationId, { phone, name: null }, 'chat_message');
    } else if (status === 'ai') {
      this.ai.schedule(conversationId);
    }
    return { message: toMessageView(message), conversation: (await this.visitorView(token))! };
  }

  /** Visitor leaves a phone number in the inline form. */
  async shareContact(token: string, input: { phone?: unknown; name?: unknown }): Promise<VisitorConversationView> {
    const visitorKey = this.visitorKey(token);
    await this.auth.consumeRateLimit('chat-contact', visitorKey, 5, 60 * 60_000, 60 * 60_000);
    const phone = normalizePhone(typeof input.phone === 'string' ? input.phone : '');
    if (!isValidVietnamesePhone(phone)) throw new BadRequestException('Số điện thoại chưa đúng định dạng');
    const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim().slice(0, 80) : null;
    const conversation = await this.currentConversation(visitorKey);
    if (!conversation || conversation.status === 'closed') throw new BadRequestException('Hãy gửi một tin nhắn trước khi để lại số điện thoại');
    await this.attachContact(conversation.id, { phone, name }, 'chat_form');
    return (await this.visitorView(token))!;
  }

  async requestHuman(token: string): Promise<VisitorConversationView> {
    const visitorKey = this.visitorKey(token);
    await this.auth.consumeRateLimit('chat-human', visitorKey, 6, 60 * 60_000, 60 * 60_000);
    const conversation = await this.currentConversation(visitorKey);
    if (!conversation || conversation.status === 'closed') throw new BadRequestException('Hãy gửi một tin nhắn trước để nhân viên biết bạn cần gì');
    if (conversation.status === 'ai') {
      await this.prisma.$transaction((tx) => appendMessage(tx, {
        conversationId: conversation.id, role: 'system',
        body: conversation.visitorPhone
          ? 'Đã báo nhân viên tư vấn. Bạn vui lòng chờ trong giây lát nhé.'
          : 'Đã báo nhân viên tư vấn. Bạn có thể để lại số điện thoại hoặc Zalo để được gọi lại nếu chưa kịp phản hồi.',
        meta: { askContact: !conversation.visitorPhone },
      }, { status: 'waiting_human', handoffReason: 'human_request' }));
      this.emitBoth(conversation.id, 'waiting_human', visitorKey);
    }
    return (await this.visitorView(token))!;
  }

  visitorStreamKey(token: string): string {
    return this.visitorKey(token);
  }

  /**
   * Saves the phone, links (or creates) the CRM customer and one inquiry for the
   * conversation, and asks a person to follow up.
   */
  private async attachContact(conversationId: string, contact: { phone: string; name: string | null }, origin: string, actorId?: string): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.chatConversation.findUniqueOrThrow({ where: { id: conversationId } });
      const recent = await tx.chatMessage.findMany({
        where: { conversationId, role: 'visitor' }, orderBy: { seq: 'desc' }, take: 4, select: { body: true },
      });
      const summary = [
        `Khách để lại liên hệ qua chat website${conversation.lastPath ? ` (trang ${conversation.lastPath})` : ''}.`,
        ...recent.reverse().map((item) => `• ${item.body.slice(0, 240)}`),
      ].join('\n').slice(0, 1500);
      const name = contact.name ?? conversation.visitorName;
      const existing = await tx.customer.findFirst({ where: { phoneNormalized: contact.phone } });
      const customer = existing
        ? await tx.customer.update({
            where: { id: existing.id },
            data: { ...(name ? { fullName: name } : {}), version: { increment: 1 } },
          })
        : await tx.customer.create({
            data: {
              fullName: name ?? 'Khách chat website',
              phone: contact.phone,
              phoneNormalized: contact.phone,
              source: 'chat',
              groupKind: 'family',
              need: recent[0]?.body.slice(0, 500) ?? null,
            },
          });
      let inquiryId = conversation.inquiryId;
      if (!inquiryId) {
        const kind = conversation.pageKind;
        const inquiry = await tx.inquiry.create({
          data: {
            customerId: customer.id,
            source: 'chat',
            intent: kind === 'stay' || kind === 'combo' || kind === 'destination' ? kind : null,
            relatedContentId: kind === 'stay' || kind === 'combo' || kind === 'destination' ? conversation.relatedContentId : null,
            message: summary,
          },
        });
        inquiryId = inquiry.id;
        await tx.auditLog.create({
          data: {
            actorId: actorId ?? null, action: 'inquiry.create', entityType: 'inquiry', entityId: inquiry.id,
            diff: { source: 'chat', conversationId, origin } as Prisma.InputJsonObject,
          },
        });
      }
      const handOver = conversation.status === 'ai';
      await appendMessage(tx, {
        conversationId,
        role: 'system',
        body: handOver
          ? 'Cảm ơn bạn! Nhân viên tư vấn sẽ liên hệ lại qua số điện thoại bạn vừa để lại.'
          : 'Đã ghi nhận số điện thoại của bạn.',
      }, {
        visitorPhone: contact.phone,
        ...(name ? { visitorName: name } : {}),
        customer: { connect: { id: customer.id } },
        inquiry: { connect: { id: inquiryId } },
        ...(handOver ? { status: 'waiting_human', handoffReason: 'contact_left' } : {}),
      });
      return { status: handOver ? 'waiting_human' : conversation.status, visitorKey: conversation.visitorTokenHash };
    });
    this.emitBoth(conversationId, result.status, result.visitorKey);
  }

  private async contentIdForPath(path: string): Promise<string | null> {
    if (!['stay', 'combo', 'destination', 'article'].includes(pageKindFromPath(path))) return null;
    const route = await this.prisma.publicRoute.findUnique({ where: { path }, select: { contentId: true } });
    return route?.contentId ?? null;
  }

  private emitBoth(conversationId: string, status: string, visitorKey: string): void {
    this.events.emit({ type: 'message.created', conversationId, status, visitorKey });
    this.events.emit({ type: 'conversation.updated', conversationId, status, visitorKey });
  }

  /* ------------------------------------------------------------ admin */

  /** Staff event stream; ends itself once the staff session is revoked or expires. */
  adminStream(user: AuthenticatedUser): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const inner = this.events.stream(() => true).subscribe(subscriber);
      const timer = setInterval(() => {
        const now = new Date();
        void this.prisma.authSession.findFirst({
          where: { id: user.sessionId, userId: user.id, revokedAt: null, expiresAt: { gt: now }, idleUntil: { gt: now }, user: { disabledAt: null } },
          select: { id: true },
        }).then((session) => {
          if (session) return;
          subscriber.next({ type: 'authorization_revoked', data: { reason: 'session_inactive' } });
          subscriber.complete();
        }).catch(() => undefined);
      }, 60_000);
      return () => { inner.unsubscribe(); clearInterval(timer); };
    });
  }

  private viewWhere(view: ChatView, user: AuthenticatedUser): Prisma.ChatConversationWhereInput {
    switch (view) {
      case 'needs_action':
        return {
          isSpam: false,
          OR: [
            { status: 'waiting_human' },
            { status: 'human', lastVisitorSeq: { gt: this.prisma.chatConversation.fields.staffLastReadSeq } },
          ],
        };
      case 'new': return { isSpam: false, createdAt: { gte: new Date(Date.now() - 86_400_000) } };
      case 'ai': return { isSpam: false, status: 'ai' };
      case 'human': return { isSpam: false, status: 'human' };
      case 'mine': return { isSpam: false, assignedUserId: user.id, status: { not: 'closed' } };
      case 'unassigned': return { isSpam: false, status: 'waiting_human', assignedUserId: null };
      case 'closed': return { isSpam: false, status: 'closed' };
      case 'spam': return { isSpam: true };
      default: return { isSpam: false };
    }
  }

  async list(query: ListChatsQuery, user: AuthenticatedUser): Promise<Paginated<ChatListItem> & { counts: Record<ChatView, number> }> {
    const view: ChatView = CHAT_VIEWS.includes(query.view as ChatView) ? query.view as ChatView : 'needs_action';
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 30));
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 120) : '';
    const filters: Prisma.ChatConversationWhereInput[] = [this.viewWhere(view, user)];
    if (search) {
      const digits = search.replace(/\D/g, '');
      filters.push({
        OR: [
          { visitorName: { contains: search, mode: 'insensitive' } },
          ...(digits.length >= 3 ? [{ visitorPhone: { contains: normalizePhone(digits) } }] : []),
          { messages: { some: { body: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }
    const from = query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? new Date(`${query.from}T00:00:00+07:00`) : null;
    const to = query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? new Date(`${query.to}T23:59:59.999+07:00`) : null;
    if (from || to) filters.push({ lastMessageAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
    if (query.hasPhone === 'true') filters.push({ visitorPhone: { not: null } });
    if (query.hasPhone === 'false') filters.push({ visitorPhone: null });
    if (query.pageKind && PAGE_KINDS.has(query.pageKind)) filters.push({ pageKind: query.pageKind });
    const where: Prisma.ChatConversationWhereInput = { AND: filters };

    const [rows, total, counts] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where, include: LIST_INCLUDE,
        orderBy: view === 'needs_action' ? [{ lastVisitorMessageAt: 'asc' }, { lastMessageAt: 'asc' }] : [{ lastMessageAt: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.prisma.chatConversation.count({ where }),
      this.counts(user),
    ]);
    return { items: rows.map((row) => this.toListItem(row)), page, pageSize, total, counts };
  }

  async counts(user: AuthenticatedUser): Promise<Record<ChatView, number>> {
    const values = await Promise.all(CHAT_VIEWS.map((view) => this.prisma.chatConversation.count({ where: this.viewWhere(view, user) })));
    return Object.fromEntries(CHAT_VIEWS.map((view, index) => [view, values[index]])) as Record<ChatView, number>;
  }

  /** Badge numbers for the admin sidebar. */
  async summary(): Promise<{ waitingChats: number; unreadChats: number }> {
    const [waitingChats, unreadChats] = await Promise.all([
      this.prisma.chatConversation.count({ where: { isSpam: false, status: 'waiting_human' } }),
      this.prisma.chatConversation.count({
        where: { isSpam: false, status: { in: ['waiting_human', 'human'] }, lastVisitorSeq: { gt: this.prisma.chatConversation.fields.staffLastReadSeq } },
      }),
    ]);
    return { waitingChats, unreadChats };
  }

  async detail(id: string): Promise<ChatDetail> {
    const row = await this.prisma.chatConversation.findUnique({ where: { id }, include: LIST_INCLUDE });
    if (!row) throw new NotFoundException('Không tìm thấy phiên chat');
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId: id }, orderBy: { seq: 'desc' }, take: ADMIN_MESSAGE_PAGE, select: MESSAGE_SELECT,
    });
    messages.reverse();
    const related = row.relatedContentId
      ? await this.prisma.contentNode.findUnique({ where: { id: row.relatedContentId }, select: { title: true } })
      : null;
    return {
      ...this.toListItem(row),
      entryPath: row.entryPath,
      relatedContentTitle: related?.title ?? null,
      aiReplyCount: row.aiReplyCount,
      closedAt: row.closedAt?.toISOString() ?? null,
      version: row.version,
      messages: messages.map((row) => toMessageView(row, true)),
    };
  }

  /** A staff member takes over: the AI stops answering this conversation. */
  async join(id: string, user: AuthenticatedUser): Promise<ChatDetail> {
    const changed = await this.prisma.$transaction(async (tx) => {
      const row = await this.lockable(tx, id);
      if (row.status === 'human' && row.assignedUserId === user.id) return null;
      await appendMessage(tx, { conversationId: id, role: 'system', body: `${user.fullName} đã tham gia cuộc trò chuyện.` }, {
        status: 'human', assignedUser: { connect: { id: user.id } }, closedAt: null,
      });
      await this.audit(tx, user.id, 'chat.join', id, { from: row.status });
      return row.visitorTokenHash;
    });
    if (changed) this.emitBoth(id, 'human', changed);
    return this.detail(id);
  }

  /** Hands the conversation back to the AI assistant. */
  async release(id: string, user: AuthenticatedUser): Promise<ChatDetail> {
    const changed = await this.prisma.$transaction(async (tx) => {
      const row = await this.lockable(tx, id);
      if (row.status === 'ai') return null;
      // Internal hand-back: the visitor simply keeps chatting, so no notice is posted to them.
      await tx.chatConversation.update({
        where: { id },
        data: { status: 'ai', handoffReason: null, assignedUser: { disconnect: true }, closedAt: null, version: { increment: 1 } },
      });
      await this.audit(tx, user.id, 'chat.release', id, { from: row.status });
      return row.visitorTokenHash;
    });
    if (changed) this.events.emit({ type: 'conversation.updated', conversationId: id, status: 'ai', visitorKey: changed });
    return this.detail(id);
  }

  async close(id: string, user: AuthenticatedUser): Promise<ChatDetail> {
    const changed = await this.prisma.$transaction(async (tx) => {
      const row = await this.lockable(tx, id);
      if (row.status === 'closed') return null;
      await appendMessage(tx, { conversationId: id, role: 'system', body: 'Cuộc trò chuyện đã kết thúc. Bạn có thể nhắn tiếp bất cứ lúc nào để bắt đầu cuộc trò chuyện mới.' }, {
        status: 'closed', closedAt: new Date(), staffLastReadSeq: row.lastVisitorSeq,
      });
      await this.audit(tx, user.id, 'chat.close', id, { from: row.status });
      return row.visitorTokenHash;
    });
    if (changed) this.emitBoth(id, 'closed', changed);
    return this.detail(id);
  }

  async reopen(id: string, user: AuthenticatedUser): Promise<ChatDetail> {
    const changed = await this.prisma.$transaction(async (tx) => {
      const row = await this.lockable(tx, id);
      if (row.status !== 'closed') return null;
      await tx.chatConversation.update({ where: { id }, data: { status: 'waiting_human', closedAt: null, version: { increment: 1 } } });
      await this.audit(tx, user.id, 'chat.reopen', id, {});
      return row.visitorTokenHash;
    });
    if (changed) this.events.emit({ type: 'conversation.updated', conversationId: id, status: 'waiting_human', visitorKey: changed });
    return this.detail(id);
  }

  async markRead(id: string, seq: unknown): Promise<{ ok: true }> {
    const row = await this.prisma.chatConversation.findUnique({ where: { id }, select: { lastVisitorSeq: true, staffLastReadSeq: true, visitorTokenHash: true, status: true } });
    if (!row) throw new NotFoundException('Không tìm thấy phiên chat');
    const target = typeof seq === 'string' && /^\d{1,19}$/.test(seq) ? BigInt(seq) : row.lastVisitorSeq;
    const next = target > row.lastVisitorSeq ? row.lastVisitorSeq : target;
    if (next > row.staffLastReadSeq) {
      await this.prisma.chatConversation.update({ where: { id }, data: { staffLastReadSeq: next } });
      this.events.emit({ type: 'conversation.updated', conversationId: id, status: row.status, visitorKey: row.visitorTokenHash });
    }
    return { ok: true };
  }

  async setSpam(id: string, spam: boolean, user: AuthenticatedUser): Promise<ChatDetail> {
    const changed = await this.prisma.$transaction(async (tx) => {
      const row = await this.lockable(tx, id);
      if (row.isSpam === spam) return null;
      await tx.chatConversation.update({
        where: { id },
        data: { isSpam: spam, ...(spam ? { status: 'closed', closedAt: new Date() } : {}), version: { increment: 1 } },
      });
      await this.audit(tx, user.id, spam ? 'chat.spam' : 'chat.unspam', id, {});
      return { visitorKey: row.visitorTokenHash, status: spam ? 'closed' : row.status };
    });
    if (changed) this.events.emit({ type: 'conversation.updated', conversationId: id, status: changed.status, visitorKey: changed.visitorKey });
    return this.detail(id);
  }

  /** Staff reply. Sending also takes the conversation over, so the AI never talks across a person. */
  async staffMessage(id: string, input: { body?: unknown; clientId?: unknown }, user: AuthenticatedUser): Promise<ChatDetail> {
    const body = cleanMessageBody(input.body);
    if (!body) throw new BadRequestException('Tin nhắn trống');
    const clientId = typeof input.clientId === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(input.clientId) ? input.clientId : null;
    try {
      const visitorKey = await this.prisma.$transaction(async (tx) => {
        const row = await this.lockable(tx, id);
        if (row.isSpam) throw new ConflictException('Phiên này đã bị đánh dấu spam');
        if (row.status !== 'human' || row.assignedUserId !== user.id) {
          await appendMessage(tx, { conversationId: id, role: 'system', body: `${user.fullName} đã tham gia cuộc trò chuyện.` }, {
            status: 'human', assignedUser: { connect: { id: user.id } }, closedAt: null,
          });
          await this.audit(tx, user.id, 'chat.join', id, { from: row.status, via: 'message' });
        }
        await appendMessage(tx, { conversationId: id, role: 'staff', body, authorUserId: user.id, clientId }, {
          staffLastReadSeq: row.lastVisitorSeq,
        });
        return row.visitorTokenHash;
      });
      this.emitBoth(id, 'human', visitorKey);
    } catch (error) {
      // Replayed clientId: the message already exists.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
    return this.detail(id);
  }

  async createInquiry(id: string, user: AuthenticatedUser): Promise<ChatDetail> {
    const row = await this.prisma.chatConversation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy phiên chat');
    if (row.inquiryId) return this.detail(id);
    if (!row.visitorPhone) throw new BadRequestException('Khách chưa để lại số điện thoại; hãy xin số trước khi tạo yêu cầu tư vấn');
    await this.attachContact(id, { phone: row.visitorPhone, name: row.visitorName }, 'staff', user.id);
    return this.detail(id);
  }

  private async lockable(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.chatConversation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy phiên chat');
    return row;
  }

  private audit(tx: Prisma.TransactionClient, actorId: string, action: string, id: string, diff: Record<string, unknown>) {
    return tx.auditLog.create({ data: { actorId, action, entityType: 'chat_conversation', entityId: id, diff: diff as Prisma.InputJsonObject } });
  }

  private toListItem(row: ConversationRow): ChatListItem {
    return {
      id: row.id,
      status: row.status as ChatStatus,
      visitorLabel: row.visitorName ?? `Khách #${row.id.slice(0, 4).toUpperCase()}`,
      visitorName: row.visitorName,
      visitorPhone: row.visitorPhone,
      lastMessagePreview: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt.toISOString(),
      lastVisitorMessageAt: row.lastVisitorMessageAt?.toISOString() ?? null,
      unread: row.lastVisitorSeq > row.staffLastReadSeq,
      handoffReason: row.handoffReason,
      isSpam: row.isSpam,
      pageKind: row.pageKind,
      lastPath: row.lastPath,
      assignedUser: row.assignedUser,
      inquiryId: row.inquiryId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
