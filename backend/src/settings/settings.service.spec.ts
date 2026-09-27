import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeWithDefault } from './settings.service';

test('settings merge allows null-default fields to become rich documents and preserves explicit nulls', () => {
  const richDocument = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mô tả thương hiệu' }] }],
  };
  const defaults = {
    name: null,
    description: null,
    logoMediaId: null,
    nested: { existing: 'default', optional: null },
  };

  assert.deepEqual(mergeWithDefault(defaults, {
    name: 'Đinh Vân Booking',
    description: richDocument,
    logoMediaId: null,
    nested: { existing: 'custom' },
  }), {
    name: 'Đinh Vân Booking',
    description: richDocument,
    logoMediaId: null,
    nested: { existing: 'custom', optional: null },
  });
  assert.equal(mergeWithDefault(null, richDocument), richDocument);
  assert.deepEqual(mergeWithDefault({ description: richDocument }, { description: null }), { description: null });
});
