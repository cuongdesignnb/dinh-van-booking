import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../auth/auth.service';
import { IS_PUBLIC } from '../decorators';
import { loadConfig } from '../config/env';

export const SESSION_COOKIE = 'dvb_session';
export const CSRF_COOKIE = 'dvb_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly config = loadConfig();

  constructor(private readonly reflector: Reflector, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();

    const token = request.cookies?.[SESSION_COOKIE];
    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }

    const user = await this.auth.resolveSession(token);
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
    request.user = user;

    if (!SAFE_METHODS.has(request.method)) {
      this.assertSameOrigin(request);
      const csrf = request.headers?.[CSRF_HEADER];
      if (!(await this.auth.verifyCsrf(user.sessionId, typeof csrf === 'string' ? csrf : undefined))) {
        throw new ForbiddenException('CSRF token không hợp lệ');
      }
    }
    return true;
  }

  /** A cookie alone must never be enough: the request has to come from our own origin. */
  private assertSameOrigin(request: { headers?: Record<string, unknown> }): void {
    const origin = request.headers?.origin as string | undefined;
    if (!origin) return; // same-origin form posts omit Origin on some browsers
    const allowed = this.config.publicOrigins;
    if (allowed.length && !allowed.includes(origin)) {
      throw new ForbiddenException('Nguồn yêu cầu không được phép');
    }
  }
}
