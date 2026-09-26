import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({ imports: [MediaModule], controllers: [AiController], providers: [AiService] })
export class AiModule {}
