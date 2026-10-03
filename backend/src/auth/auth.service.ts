import { HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashIp, hashPassword, newToken, sha256, verifyPassword } from '../common/crypto';
import { Prisma } from '../generated/prisma/client';
import { loadConfig } from '../common/config/env';
import type { AuthenticatedUser } from '../common/types';
import type { PermissionCode } from '../common/permissions';

export interface IssuedSession {
  token: string;
  csrfToken: string;
  expiresAt: Date;
  user: AuthenticatedUser;
}

export interface IssuedGuestSession {
  id: string;
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

export interface GuestSessionContext {
  id: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly config = loadConfig();

  constructor(private readonly prisma: PrismaService) {}

  /** Bootstrap an anonymous, opaque browser session and its CSRF token. */
  async bootstrapGuestSession(token?: string, csrfToken?: string): Promise<IssuedGuestSession> {
    const now = new Date();
    if (token) {
      const current = await this.prisma.guestSession.findUnique({ where: { tokenHash: sha256(token) } });
      if (current && !current.revokedAt && current.expiresAt > now) {
        if (csrfToken && current.csrfHash === sha256(csrfToken)) {
          return { id: current.id, token, csrfToken, expiresAt: current.expiresAt };
        }
        const rotatedCsrf = newToken(24);
        await this.prisma.guestSession.update({ where: { id: current.id }, data: { csrfHash: sha256(rotatedCsrf) } });
        return { id: current.id, token, csrfToken: rotatedCsrf, expiresAt: current.expiresAt };
      }
    }

    const guestToken = newToken();
    const nextCsrf = newToken(24);
    const expiresAt = new Date(now.getTime() + this.config.guestSessionTtlMinutes * 60_000);
    const created = await this.prisma.guestSession.create({
      data: { tokenHash: sha256(guestToken), csrfHash: sha256(nextCsrf), expiresAt },
      select: { id: true },
    });
    return { id: created.id, token: guestToken, csrfToken: nextCsrf, expiresAt };
  }

  async bootstrapAuthenticatedCsrf(token: string, csrfToken?: string): Promise<{ csrfToken: string; expiresAt: Date } | null> {
    const current = await this.prisma.authSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { select: { disabledAt: true } } },
    });
    const now = new Date();
    if (!current || current.revokedAt || current.expiresAt <= now || current.idleUntil <= now || current.user.disabledAt) return null;
    if (csrfToken && current.csrfHash === sha256(csrfToken)) return { csrfToken, expiresAt: current.expiresAt };
    const rotatedCsrf = newToken(24);
    await this.prisma.authSession.update({ where: { id: current.id }, data: { csrfHash: sha256(rotatedCsrf) } });
    return { csrfToken: rotatedCsrf, expiresAt: current.expiresAt };
  }

  async resolveGuestSession(token: string): Promise<GuestSessionContext | null> {
    const session = await this.prisma.guestSession.findUnique({
      where: { tokenHash: sha256(token) },
      select: { id: true, expiresAt: true, revokedAt: true },
    });
    return session && !session.revokedAt && session.expiresAt > new Date() ? { id: session.id } : null;
  }

  async verifyGuestCsrf(sessionId: string, csrfToken: string | undefined): Promise<boolean> {
    if (!csrfToken) return false;
    const session = await this.prisma.guestSession.findUnique({ where: { id: sessionId } });
    return !!session && !session.revokedAt && session.expiresAt > new Date() && session.csrfHash === sha256(csrfToken);
  }

  async login(email: string, password: string, meta: { ip?: string; userAgent?: string }): Promise<IssuedSession> {
    const normalizedEmail = email.trim().toLowerCase();
    await this.consumeRateLimit('login-email', normalizedEmail, 8, 15 * 60_000, 30 * 60_000);
    if (meta.ip) await this.consumeRateLimit('login-ip', meta.ip, 30, 15 * 60_000, 15 * 60_000);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    // Same failure for unknown account and wrong password: no account enumeration.
    const ok = user && !user.disabledAt && (await verifyPassword(password, user.passwordHash));
    if (!user || !ok) {
      this.logger.warn('Login rejected');
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const token = newToken();
    const csrfToken = newToken(24);
    const now = Date.now();
    const expiresAt = new Date(now + this.config.sessionTtlMinutes * 60_000);
    const idleUntil = new Date(now + this.config.sessionIdleMinutes * 60_000);

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        csrfHash: sha256(csrfToken),
        userAgent: meta.userAgent?.slice(0, 255),
        ipHash: hashIp(meta.ip, this.config.sessionSecret),
        expiresAt,
        idleUntil,
      },
    });

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { token, csrfToken, expiresAt, user: this.toAuthenticatedUser(user, session.id) };
  }

  /** Database-backed limiter shared by API instances; identifiers stay keyed hashes. */
  async consumeRateLimit(scope: string, subject: string, limit: number, windowMs: number, blockMs: number): Promise<void> {
    const subjectHash = sha256(`${this.config.sessionSecret}:${scope}:${subject}`);
    const now = new Date();
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const blockSeconds = Math.max(1, Math.ceil(blockMs / 1000));
    const rows = await this.prisma.$queryRaw<Array<{ request_count: number; blocked_until: Date | null }>>(Prisma.sql`
      INSERT INTO auth_rate_limits (scope, subject_hash, window_started_at, request_count, blocked_until)
      VALUES (${scope}, ${subjectHash}, ${now}, 1, NULL)
      ON CONFLICT (scope, subject_hash) DO UPDATE SET
        window_started_at = CASE
          WHEN auth_rate_limits.window_started_at <= ${now}::timestamptz - (${windowSeconds} * INTERVAL '1 second') THEN ${now}
          ELSE auth_rate_limits.window_started_at END,
        request_count = CASE
          WHEN auth_rate_limits.window_started_at <= ${now}::timestamptz - (${windowSeconds} * INTERVAL '1 second') THEN 1
          ELSE auth_rate_limits.request_count + 1 END,
        blocked_until = CASE
          WHEN auth_rate_limits.blocked_until > ${now} THEN auth_rate_limits.blocked_until
          WHEN auth_rate_limits.window_started_at <= ${now}::timestamptz - (${windowSeconds} * INTERVAL '1 second') THEN NULL
          WHEN auth_rate_limits.request_count + 1 > ${limit} THEN ${now}::timestamptz + (${blockSeconds} * INTERVAL '1 second')
          ELSE auth_rate_limits.blocked_until END
      RETURNING request_count, blocked_until
    `);
    if ((rows[0]?.blocked_until && rows[0].blocked_until > now) || (rows[0]?.request_count ?? 0) > limit) {
      throw new HttpException('Tạm thời có quá nhiều lần thử. Vui lòng đợi rồi thử lại.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /** Returns the user behind a session token, sliding the idle window forward. */
  async resolveSession(token: string): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: {
        user: { include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } },
      },
    });
    if (!session || session.revokedAt) return null;

    const now = new Date();
    if (session.expiresAt <= now || session.idleUntil <= now) {
      await this.prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: now } });
      return null;
    }
    if (session.user.disabledAt) return null;

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { idleUntil: new Date(now.getTime() + this.config.sessionIdleMinutes * 60_000) },
    });

    return this.toAuthenticatedUser(session.user, session.id);
  }

  async verifyCsrf(sessionId: string, csrfToken: string | undefined): Promise<boolean> {
    if (!csrfToken) return false;
    const session = await this.prisma.authSession.findUnique({ where: { id: sessionId } });
    return !!session && session.csrfHash === sha256(csrfToken);
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await hashPassword(nextPassword), version: { increment: 1 } },
      }),
      // Every other session of this user is dropped when the password changes.
      this.prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private toAuthenticatedUser(
    user: { id: string; email: string; fullName: string; roles: Array<{ role: { code: string; permissions: Array<{ permission: { code: string } }> } }> },
    sessionId: string,
  ): AuthenticatedUser {
    const permissions = new Set<string>();
    for (const link of user.roles) {
      for (const grant of link.role.permissions) permissions.add(grant.permission.code);
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles.map((r) => r.role.code),
      permissions: [...permissions] as PermissionCode[],
      sessionId,
    };
  }
}
