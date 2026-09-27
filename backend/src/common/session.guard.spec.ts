import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PublicQuotesController } from '../admin-operations/admin-operations.controller';
import { SessionGuard } from './guards/session.guard';

const staff = { id: 'staff-1', sessionId: 'session-1', email: 'staff@example.test', fullName: 'Staff', roles: [], permissions: [] };
const auth = {
  resolveSession: async (token: string) => token === 'staff-token' ? staff : null,
  verifyCsrf: async (_id: string, token?: string) => token === 'staff-csrf',
  resolveGuestSession: async (token: string) => token === 'guest-token' ? { id: 'guest-session-1' } : null,
  verifyGuestCsrf: async (id: string, token?: string) => id === 'guest-session-1' && token === 'guest-csrf',
};
const guard = new SessionGuard(new Reflector(), auth as never);

function requestContext(method: string, cookies: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const request: Record<string, unknown> = { method, cookies, headers };
  const context = {
    getHandler: () => method === 'GET' ? PublicQuotesController.prototype.get : PublicQuotesController.prototype.create,
    getClass: () => PublicQuotesController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

test('public mutations require an issued guest session and matching CSRF token', async () => {
  const missing = requestContext('POST');
  await assert.rejects(guard.canActivate(missing.context), ForbiddenException);

  const mismatch = requestContext('POST', { dvb_guest: 'guest-token' }, { 'x-csrf-token': 'wrong' });
  await assert.rejects(guard.canActivate(mismatch.context), ForbiddenException);

  const valid = requestContext('POST', { dvb_guest: 'guest-token' }, { 'x-csrf-token': 'guest-csrf' });
  assert.equal(await guard.canActivate(valid.context), true);
  assert.deepEqual((valid.request as { guestSession?: unknown }).guestSession, { id: 'guest-session-1' });
});

test('staff writes keep staff CSRF enforcement while anonymous quote reads stay public', async () => {
  const unauthenticatedAdmin = {
    ...requestContext('GET').context,
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
  await assert.rejects(guard.canActivate(unauthenticatedAdmin), UnauthorizedException);

  const staffWrite = requestContext('POST', { dvb_session: 'staff-token' }, { 'x-csrf-token': 'staff-csrf' });
  assert.equal(await guard.canActivate(staffWrite.context), true);
  assert.equal((staffWrite.request as { user?: { id: string } }).user?.id, staff.id);

  const badStaffCsrf = requestContext('POST', { dvb_session: 'staff-token' }, { 'x-csrf-token': 'wrong' });
  await assert.rejects(guard.canActivate(badStaffCsrf.context), ForbiddenException);

  const publicRead = requestContext('GET');
  assert.equal(await guard.canActivate(publicRead.context), true);
});
