import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../auth/auth.service';
import { IS_PUBLIC } from '../decorators';
import { loadConfig } from '../config/env';

export const SESSION_COOKIE = 'dvb_session';
export const GUEST_SESSION_COOKIE = 'dvb_guest';
export const CSRF_COOKIE = 'dvb_csrf';
export const CSRF_HEADER = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();

    const token = request.cookies?.[SESSION_COOKIE];
    const user = token ? await this.auth.resolveSession(token) : null;
    if (user) {
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

    if (!isPublic) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    const guestToken = request.cookies?.[GUEST_SESSION_COOKIE];
    if (SAFE_METHODS.has(request.method)) {
      request.guestSession = guestToken ? await this.auth.resolveGuestSession(guestToken) : null;
      return true;
    }

    this.assertSameOrigin(request);
    const guestSession = guestToken ? await this.auth.resolveGuestSession(guestToken) : null;
    if (!guestSession) throw new ForbiddenException('Cần khởi tạo phiên bảo mật trước khi gửi yêu cầu');
    const csrf = request.headers?.[CSRF_HEADER];
    if (!(await this.auth.verifyGuestCsrf(guestSession.id, typeof csrf === 'string' ? csrf : undefined))) {
      throw new ForbiddenException('CSRF token không hợp lệ');
    }
    request.guestSession = guestSession;
    return true;
  }

  /** A cookie alone must never be enough: the request has to come from our own origin. */
  private assertSameOrigin(request: { headers?: Record<string, unknown> }): void {
    const origin = request.headers?.origin as string | undefined;
    if (!origin) return; // same-origin form posts omit Origin on some browsers
    const allowed = loadConfig().publicOrigins;
    if (allowed.length && !allowed.includes(origin)) {
      throw new ForbiddenException('Nguồn yêu cầu không được phép');
    }
  }
}
