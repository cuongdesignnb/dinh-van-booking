import { Allow } from 'class-validator';

/** Values are validated by the service; the DTOs only whitelist the accepted keys. */
export class VisitorMessageDto {
  @Allow() body!: unknown;
  @Allow() clientId!: unknown;
  @Allow() path?: unknown;
}

export class VisitorContactDto {
  @Allow() phone!: unknown;
  @Allow() name?: unknown;
}

export class VisitorMessagesQuery {
  @Allow() after?: string;
}

export class StaffMessageDto {
  @Allow() body!: unknown;
  @Allow() clientId?: unknown;
}

export class MarkReadDto {
  @Allow() seq?: unknown;
}

export class SpamDto {
  @Allow() spam!: unknown;
}

export class ListChatsQueryDto {
  @Allow() view?: string;
  @Allow() search?: string;
  @Allow() from?: string;
  @Allow() to?: string;
  @Allow() hasPhone?: string;
  @Allow() pageKind?: string;
  @Allow() page?: string;
  @Allow() pageSize?: string;
}
