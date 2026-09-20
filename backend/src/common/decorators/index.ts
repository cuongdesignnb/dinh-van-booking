import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '../permissions';
import type { AuthenticatedUser } from '../types';

export const IS_PUBLIC = 'dvb:isPublic';
export const REQUIRED_PERMISSIONS = 'dvb:permissions';

/** Marks a route as reachable without a staff session (public website, auth endpoints). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const RequirePermissions = (...codes: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, codes);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined =>
    ctx.switchToHttp().getRequest().user,
);
