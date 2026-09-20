import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';
import { CurrentUser, Public } from '../common/decorators';
import { CSRF_COOKIE, SESSION_COOKIE } from '../common/guards/session.guard';
import { loadConfig } from '../common/config/env';
import type { AuthenticatedUser } from '../common/types';

@Controller('auth')
export class AuthController {
  private readonly config = loadConfig();

  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ user: AuthenticatedUser; csrfToken: string; expiresAt: string }> {
    const issued = await this.auth.login(dto.email, dto.password, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    const secure = this.config.nodeEnv === 'production' && !this.config.publicOrigins.some((o) => o.startsWith('http://'));
    reply.setCookie(SESSION_COOKIE, issued.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      expires: issued.expiresAt,
    });
    // Readable by the admin app so it can echo the token back in a header.
    reply.setCookie(CSRF_COOKIE, issued.csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure,
      path: '/',
      expires: issued.expiresAt,
    });

    return { user: issued.user, csrfToken: issued.csrfToken, expiresAt: issued.expiresAt.toISOString() };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.auth.logout(user.sessionId);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    reply.clearCookie(CSRF_COOKIE, { path: '/' });
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    reply.clearCookie(CSRF_COOKIE, { path: '/' });
  }
}
