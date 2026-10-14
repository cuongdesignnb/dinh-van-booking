import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PublicModule } from '../public/public.module';
import { ChatAdminController } from './chat-admin.controller';
import { ChatAiService } from './chat-ai.service';
import { ChatEventsService } from './chat-events.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AiModule, PublicModule],
  controllers: [ChatController, ChatAdminController],
  providers: [ChatService, ChatAiService, ChatEventsService],
  exports: [ChatService],
})
export class ChatModule {}
