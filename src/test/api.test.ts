import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createBananaStore } from '../lib/banana-store';

async function createTestStore() {
  const directory = await mkdtemp(join(tmpdir(), 'banana-backend-'));
  const databasePath = join(directory, 'bananas.json');

  await writeFile(databasePath, '[]\n');

  return {
    async close() {
      await rm(directory, { recursive: true, force: true });
    },
    store: createBananaStore(databasePath),
  };
}

test('buying and selling bananas updates inventory', async () => {
  const context = await createTestStore();

  try {
    const boughtBananas = await context.store.buy({
      buyDate: '2026-03-01',
      number: 3,
    });

    assert.equal(boughtBananas.length, 3);
    assert.equal(
      boughtBananas.every((banana) => banana.sellDate === null),
      true,
    );

    const soldBananas = await context.store.sell({
      sellDate: '2026-03-05',
      number: 2,
    });

    assert.equal(soldBananas.length, 2);
    assert.equal(
      soldBananas.every((banana) => banana.sellDate === '2026-03-05'),
      true,
    );

    const inventory = await context.store.list();
    assert.equal(inventory.length, 3);
    assert.equal(inventory.filter((banana) => banana.sellDate === null).length, 1);
  } finally {
    await context.close();
  }
});

test('invalid purchase payloads return 400', async () => {
  const context = await createTestStore();

  try {
    await assert.rejects(
      context.store.buy({ buyDate: '2026-02-30', number: 1.5 }),
      (error: unknown) => {
        const err = error as { status?: number; message?: string };
        assert.equal(err.status, 400);
        assert.match(err.message ?? '', /whole number/);
        return true;
      },
    );
  } finally {
    await context.close();
  }
});
