import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

test('PostgreSQL serialization errors wrapped by the Prisma adapter become HTTP 409', () => {
  const error = new Prisma.PrismaClientKnownRequestError('serialization conflict', {
    code: 'P2010',
    clientVersion: 'test',
    meta: { driverAdapterError: { cause: { originalCode: '40001' } } },
  });
  const response: { statusCode: number | null; payload: Record<string, unknown> | null } = { statusCode: null, payload: null };
  const reply = {
    status(code: number) { response.statusCode = code; return this; },
    send(payload: Record<string, unknown>) { response.payload = payload; return this; },
  };
  const host = { switchToHttp: () => ({ getResponse: () => reply }) } as unknown as ArgumentsHost;

  new PrismaExceptionFilter().catch(error, host);

  assert.equal(response.statusCode, HttpStatus.CONFLICT);
  assert.equal(response.payload?.code, 'transaction_conflict');
});
