import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Sse, type MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import { ChatAiService } from './chat-ai.service';
import { ListChatsQueryDto, MarkReadDto, SpamDto, StaffMessageDto } from './chat.dto';
import { ChatService } from './chat.service';

/** Admin inbox for website chats: filters, take-over, reply, hand back to the AI. */
@Controller('admin/chats')
export class ChatAdminController {
  constructor(private readonly chat: ChatService, private readonly ai: ChatAiService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.chatRead)
  list(@Query() query: ListChatsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.list(query, user);
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.chatRead)
  summary() {
    return this.chat.summary();
  }

  @Sse('stream')
  @RequirePermissions(PERMISSIONS.chatRead)
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.chat.adminStream(user);
  }

  @Post('ai-test')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  aiTest() {
    return this.ai.test();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.chatRead)
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.chat.detail(id);
  }

  @Post(':id/read')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatRead)
  read(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkReadDto) {
    return this.chat.markRead(id, dto.seq);
  }

  @Post(':id/join')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.join(id, user);
  }

  @Post(':id/release')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  release(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.release(id, user);
  }

  @Post(':id/close')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.close(id, user);
  }

  @Post(':id/reopen')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  reopen(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.reopen(id, user);
  }

  @Post(':id/spam')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  spam(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SpamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.setSpam(id, dto.spam === true, user);
  }

  @Post(':id/messages')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  message(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StaffMessageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.staffMessage(id, dto, user);
  }

  @Post(':id/inquiry')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  inquiry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.createInquiry(id, user);
  }

  @Post(':id/suggest')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.chatWrite)
  suggest(@Param('id', ParseUUIDPipe) id: string) {
    return this.ai.suggest(id);
  }
}
