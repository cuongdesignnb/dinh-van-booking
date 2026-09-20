import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { MediaService, type MediaView } from './media.service';
import { ListMediaQuery, UpdateMediaDto } from './dto/media.dto';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser, Paginated } from '../common/types';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.mediaRead)
  list(@Query() query: ListMediaQuery): Promise<Paginated<MediaView>> {
    return this.media.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.mediaRead)
  getOne(@Param('id') id: string): Promise<MediaView> {
    return this.media.getOne(id);
  }

  /**
   * Multipart upload. Whatever comes in, a WebP goes out: the uploaded format
   * is re-encoded and never written to the media volume.
   */
  @Post('upload')
  @RequirePermissions(PERMISSIONS.mediaWrite)
  async upload(
    @Req() request: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaView> {
    if (!request.isMultipart()) throw new BadRequestException('Yêu cầu phải là multipart/form-data');

    const file = await request.file();
    if (!file) throw new BadRequestException('Không có tệp nào được tải lên');

    const buffer = await file.toBuffer();
    const fields = file.fields as Record<string, { value?: string } | undefined>;
    return this.media.ingest(
      { buffer, filename: file.filename, mimetype: file.mimetype },
      { altText: fields.altText?.value, caption: fields.caption?.value },
      user.id,
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.mediaWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaView> {
    return this.media.updateMeta(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.mediaDelete)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.media.remove(id, user.id);
  }
}
