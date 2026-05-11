import assert from 'node:assert/strict';
import test from 'node:test';

import { buySchema, sellSchema } from '../lib/schemas';

test('buySchema rejects non-integer counts', () => {
  const result = buySchema.safeParse({ buyDate: '2026-03-01', number: 1.5 });
  assert.equal(result.success, false);
  assert.match(result.error?.issues[0]?.message ?? '', /whole number/);
});

test('buySchema rejects out-of-range counts', () => {
  const tooFew = buySchema.safeParse({ buyDate: '2026-03-01', number: 0 });
  const tooMany = buySchema.safeParse({ buyDate: '2026-03-01', number: 51 });
  assert.equal(tooFew.success, false);
  assert.equal(tooMany.success, false);
  assert.match(tooFew.error?.issues[0]?.message ?? '', /1-50/);
  assert.match(tooMany.error?.issues[0]?.message ?? '', /1-50/);
});

test('buySchema rejects malformed dates', () => {
  const result = buySchema.safeParse({ buyDate: '2026/03/01', number: 1 });
  assert.equal(result.success, false);
  assert.match(result.error?.issues[0]?.message ?? '', /YYYY-MM-DD/);
});

test('buySchema rejects impossible calendar dates', () => {
  const result = buySchema.safeParse({ buyDate: '2026-02-30', number: 1 });
  assert.equal(result.success, false);
  assert.match(result.error?.issues[0]?.message ?? '', /real calendar date/);
});

test('buySchema accepts a valid payload', () => {
  const result = buySchema.safeParse({ buyDate: '2026-03-01', number: 10 });
  assert.equal(result.success, true);
});

test('sellSchema mirrors buySchema validation', () => {
  const ok = sellSchema.safeParse({ sellDate: '2026-03-05', number: 5 });
  const bad = sellSchema.safeParse({ sellDate: 'not-a-date', number: 5 });
  assert.equal(ok.success, true);
  assert.equal(bad.success, false);
});
