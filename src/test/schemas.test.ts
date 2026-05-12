import assert from 'node:assert/strict';
import test from 'node:test';

import { formatIssue } from '../lib/format-issue';
import { buySchema, sellSchema } from '../lib/schemas';

function firstError(input: unknown): string {
  const result = buySchema.safeParse(input);
  assert.equal(result.success, false);
  const issue = result.error?.issues[0];
  assert.ok(issue);
  return formatIssue(issue, input);
}

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

test('formatIssue reports missing fields by name', () => {
  assert.equal(firstError({ number: 1 }), '"buyDate" is required');
  assert.equal(firstError({ buyDate: '2026-03-01' }), '"number" is required');
  assert.equal(firstError({}), '"buyDate" is required');
});

test('formatIssue reports wrong-type fields by name', () => {
  assert.equal(firstError({ buyDate: 123, number: 1 }), '"buyDate" must be a string');
  assert.equal(firstError({ buyDate: '2026-03-01', number: 'five' }), '"number" must be a number');
});

test('formatIssue passes through schema messages for non-type issues', () => {
  assert.match(firstError({ buyDate: '2026-03-01', number: 1.5 }), /whole number/);
  assert.match(firstError({ buyDate: '2026/03/01', number: 1 }), /YYYY-MM-DD/);
});
