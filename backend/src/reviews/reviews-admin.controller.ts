import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { Allow } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import { ReviewAiService } from './review-ai.service';
import { ReviewsService } from './reviews.service';

class ListReviewsQueryDto {
  @Allow() status?: string;
  @Allow() stay?: string;
  @Allow() rating?: string;
  @Allow() hasPhotos?: string;
  @Allow() search?: string;
  @Allow() page?: string;
  @Allow() pageSize?: string;
}
class RejectDto { @Allow() reason!: unknown }
class ReplyDto { @Allow() reply!: unknown }
class InviteDto { @Allow() stayId!: unknown; @Allow() link!: unknown }

/** Moderation of guest reviews. */
@Controller('admin/reviews')
export class ReviewsAdminController {
  constructor(private readonly reviews: ReviewsService, private readonly ai: ReviewAiService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.reviewRead)
  list(@Query() query: ListReviewsQueryDto) {
    return this.reviews.list(query);
  }

  @Get('stays')
  @RequirePermissions(PERMISSIONS.reviewRead)
  stays() {
    return this.reviews.stays();
  }

  @Post('invite-message')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.reviewWrite)
  invite(@Body() dto: InviteDto) {
    return this.ai.inviteMessage(dto.stayId, dto.link);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.reviewRead)
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.detail(id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.reviewWrite)
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reviews.approve(id, user);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.reviewWrite)
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviews.reject(id, dto.reason, user);
  }

  @Delete(':id/photos/:mediaId')
  @RequirePermissions(PERMISSIONS.reviewWrite)
  removePhoto(@Param('id', ParseUUIDPipe) id: string, @Param('mediaId', ParseUUIDPipe) mediaId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reviews.removePhoto(id, mediaId, user);
  }

  @Put(':id/reply')
  @RequirePermissions(PERMISSIONS.reviewWrite)
  reply(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReplyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviews.reply(id, dto.reply, user);
  }

  @Post(':id/reply-suggest')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.reviewWrite)
  replySuggest(@Param('id', ParseUUIDPipe) id: string) {
    return this.ai.replySuggest(id);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.reviewWrite)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reviews.remove(id, user);
  }
}
