import { Body, Controller, ForbiddenException, Get, Header, HttpCode, Post, Query, Req, Res, Sse, type MessageEvent } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { EMPTY, type Observable } from 'rxjs';
import { Public } from '../common/decorators';
import { loadConfig } from '../common/config/env';
import { SettingsService } from '../settings/settings.service';
import { ChatEventsService } from './chat-events.service';
import { VisitorContactDto, VisitorMessageDto, VisitorMessagesQuery } from './chat.dto';
import { CHAT_VISITOR_COOKIE, CHAT_VISITOR_TTL_MS, ChatService, type VisitorConversationView } from './chat.service';

type CookieRequest = FastifyRequest & { cookies?: Record<string, string | undefined> };
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,100}$/;

/**
 * Website visitor side of the live chat. The visitor is identified by an
 * httpOnly `dvb_chat` cookie (stored hashed); writes still need the guest
 * session + CSRF that the global SessionGuard enforces on public routes.
 */
@Controller('chat')
export class ChatController {
  private readonly config = loadConfig();

  constructor(
    private readonly chat: ChatService,
    private readonly events: ChatEventsService,
    private readonly settings: SettingsService,
  ) {}

  @Public()
  @Get('session')
  @Header('Cache-Control', 'private, no-store')
  async session(@Req() request: CookieRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<{ enabled: boolean; conversation: VisitorConversationView | null }> {
    const enabled = await this.enabled();
    if (!enabled) return { enabled, conversation: null };
    const token = this.token(request, reply, true)!;
    return { enabled, conversation: await this.chat.visitorView(token) };
  }

  @Public()
  @Get('messages')
  @Header('Cache-Control', 'private, no-store')
  async messages(@Req() request: CookieRequest, @Query() query: VisitorMessagesQuery): Promise<{ conversation: VisitorConversationView | null }> {
    const token = this.token(request);
    return { conversation: token ? await this.chat.visitorView(token, query.after) : null };
  }

  @Public()
  @Post('messages')
  @HttpCode(202)
  async send(@Req() request: CookieRequest, @Res({ passthrough: true }) reply: FastifyReply, @Body() dto: VisitorMessageDto) {
    await this.assertEnabled();
    const token = this.token(request, reply, true)!;
    return this.chat.postVisitorMessage(token, dto, { ip: request.ip, userAgent: request.headers['user-agent'] });
  }

  @Public()
  @Post('contact')
  @HttpCode(200)
  async contact(@Req() request: CookieRequest, @Body() dto: VisitorContactDto): Promise<{ conversation: VisitorConversationView }> {
    await this.assertEnabled();
    const token = this.requireToken(request);
    return { conversation: await this.chat.shareContact(token, dto) };
  }

  @Public()
  @Post('human')
  @HttpCode(200)
  async human(@Req() request: CookieRequest): Promise<{ conversation: VisitorConversationView }> {
    await this.assertEnabled();
    const token = this.requireToken(request);
    return { conversation: await this.chat.requestHuman(token) };
  }

  @Public()
  @Sse('stream')
  stream(@Req() request: CookieRequest): Observable<MessageEvent> {
    const token = this.token(request);
    if (!token) return EMPTY;
    const key = this.chat.visitorStreamKey(token);
    return this.events.stream((event) => event.visitorKey === key);
  }

  private async enabled(): Promise<boolean> {
    const widget = await this.settings.get<{ enabled?: unknown }>('chat.widget');
    return widget?.enabled === true;
  }

  private async assertEnabled(): Promise<void> {
    if (!(await this.enabled())) throw new ForbiddenException('Khung chat đang tạm tắt');
  }

  private requireToken(request: CookieRequest): string {
    const token = this.token(request);
    if (!token) throw new ForbiddenException('Phiên chat đã hết hạn; hãy tải lại trang');
    return token;
  }

  /** Reads the visitor cookie; optionally issues one (and slides its expiry) when a reply is available. */
  private token(request: CookieRequest, reply?: FastifyReply, create = false): string | null {
    const existing = request.cookies?.[CHAT_VISITOR_COOKIE];
    const token = existing && TOKEN_PATTERN.test(existing) ? existing : create ? ChatService.newVisitorToken() : null;
    if (token && reply) {
      const secure = this.config.nodeEnv === 'production' && !this.config.publicOrigins.some((origin) => origin.startsWith('http://'));
      reply.setCookie(CHAT_VISITOR_COOKIE, token, {
        httpOnly: true, sameSite: 'lax', secure, path: '/', expires: new Date(Date.now() + CHAT_VISITOR_TTL_MS),
      });
    }
    return token;
  }
}
