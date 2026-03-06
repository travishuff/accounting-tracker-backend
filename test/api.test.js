const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

const { createBananaStore } = require('../lib/banana-store');

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
    assert.equal(boughtBananas.every((banana) => banana.sellDate === null), true);

    const soldBananas = await context.store.sell({
      sellDate: '2026-03-05',
      number: 2,
    });

    assert.equal(soldBananas.length, 2);
    assert.equal(soldBananas.every((banana) => banana.sellDate === '2026-03-05'), true);

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
      (error) => {
        assert.equal(error.status, 400);
        assert.match(error.message, /whole number/);
        return true;
      }
    );
  } finally {
    await context.close();
  }
});
