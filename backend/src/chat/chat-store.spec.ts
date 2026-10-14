import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toMessageView } from './chat-store';

const row = {
  id: 'm1', seq: 7n, role: 'system', body: 'Nhân viên sẽ phản hồi', createdAt: new Date('2026-10-14T05:00:00Z'), author: null,
  meta: { handoff: true, error: 'Nhà cung cấp AI phản hồi quá thời gian cho phép' },
};

test('technical AI errors reach staff views only', () => {
  assert.equal(toMessageView(row, true).internalNote, 'Nhà cung cấp AI phản hồi quá thời gian cho phép');
  assert.equal('internalNote' in toMessageView(row), false);
  // Array.prototype.map passes the index as a second argument; visitor code must never get the note that way.
  assert.equal([row, row].map((item) => toMessageView(item)).some((view) => 'internalNote' in view), false);
});
