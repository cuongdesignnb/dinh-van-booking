import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS } from '../decorators';
import type { PermissionCode } from '../permissions';
import type { AuthenticatedUser } from '../types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user: AuthenticatedUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Không đủ quyền');
    const granted = new Set(user.permissions);
    const missing = required.filter((code) => !granted.has(code));
    if (missing.length) {
      throw new ForbiddenException(`Thiếu quyền: ${missing.join(', ')}`);
    }
    return true;
  }
}
