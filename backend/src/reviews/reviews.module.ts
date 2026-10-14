import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { MediaModule } from '../media/media.module';
import { ReviewAiService } from './review-ai.service';
import { ReviewsAdminController } from './reviews-admin.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AiModule, MediaModule],
  controllers: [ReviewsController, ReviewsAdminController],
  providers: [ReviewsService, ReviewAiService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
