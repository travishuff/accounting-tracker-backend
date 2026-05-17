import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { test } from 'bun:test';

import { createBananaStore } from '../lib/banana-store';

function createTestStore() {
  const store = createBananaStore(':memory:');
  return {
    store,
    close() {
      store.close();
    },
  };
}

test('buying and selling bananas updates inventory', () => {
  const { store, close } = createTestStore();

  try {
    const boughtBananas = store.buy({
      buyDate: '2026-03-01',
      number: 3,
    });

    assert.equal(boughtBananas.length, 3);
    assert.equal(
      boughtBananas.every((banana) => banana.sellDate === null),
      true,
    );

    const soldBananas = store.sell({
      sellDate: '2026-03-05',
      number: 2,
    });

    assert.equal(soldBananas.length, 2);
    assert.equal(
      soldBananas.every((banana) => banana.sellDate === '2026-03-05'),
      true,
    );

    const inventory = store.list();
    assert.equal(inventory.length, 3);
    assert.equal(inventory.filter((banana) => banana.sellDate === null).length, 1);
  } finally {
    close();
  }
});

test('sell skips bananas older than the freshness window', () => {
  const { store, close } = createTestStore();

  try {
    store.buy({ buyDate: '2026-03-01', number: 1 });
    store.buy({ buyDate: '2026-03-20', number: 1 });

    const sold = store.sell({ sellDate: '2026-03-20', number: 1 });

    assert.equal(sold.length, 1);
    assert.equal(sold[0].buyDate, '2026-03-20');

    const inventory = store.list();
    assert.equal(inventory.filter((banana) => banana.sellDate === null).length, 1);
  } finally {
    close();
  }
});

test('sell includes bananas that are nine days old', () => {
  const { store, close } = createTestStore();

  try {
    store.buy({ buyDate: '2026-03-01', number: 1 });

    const sold = store.sell({ sellDate: '2026-03-10', number: 1 });

    assert.equal(sold.length, 1);
    assert.equal(sold[0].buyDate, '2026-03-01');
  } finally {
    close();
  }
});

test('sell excludes bananas that are exactly ten days old', () => {
  const { store, close } = createTestStore();

  try {
    store.buy({ buyDate: '2026-03-01', number: 1 });

    assert.throws(
      () => store.sell({ sellDate: '2026-03-11', number: 1 }),
      (err: Error) => err.name === 'InsufficientEligibleInventoryError',
    );
  } finally {
    close();
  }
});

test('sell chooses eligible bananas in insertion order and does not resell sold inventory', () => {
  const { store, close } = createTestStore();

  try {
    const [first] = store.buy({ buyDate: '2026-03-01', number: 1 });
    const [second] = store.buy({ buyDate: '2026-03-02', number: 1 });

    const firstSale = store.sell({ sellDate: '2026-03-03', number: 1 });
    const secondSale = store.sell({ sellDate: '2026-03-03', number: 1 });

    assert.equal(firstSale[0].id, first.id);
    assert.equal(secondSale[0].id, second.id);
  } finally {
    close();
  }
});

test('sell rejects requests larger than the eligible inventory', () => {
  const { store, close } = createTestStore();

  try {
    store.buy({ buyDate: '2026-03-01', number: 1 });
    store.buy({ buyDate: '2026-03-20', number: 1 });

    assert.throws(
      () => store.sell({ sellDate: '2026-03-20', number: 5 }),
      (err: Error) => err.message.includes('eligible to sell'),
    );

    const inventory = store.list();
    assert.equal(inventory.filter((banana) => banana.sellDate === null).length, 2);
  } finally {
    close();
  }
});

test('sell rejects when no bananas are eligible on the sell date', () => {
  const { store, close } = createTestStore();

  try {
    store.buy({ buyDate: '2026-03-10', number: 2 });

    assert.throws(
      () => store.sell({ sellDate: '2026-03-05', number: 2 }),
      (err: Error) => err.message.includes('eligible to sell'),
    );
  } finally {
    close();
  }
});

test('reset deletes all bananas and returns the deleted count', () => {
  const { store, close } = createTestStore();

  try {
    store.buy({ buyDate: '2026-03-01', number: 3 });
    store.sell({ sellDate: '2026-03-03', number: 1 });

    const deleted = store.reset();

    assert.equal(deleted, 3);
    assert.deepEqual(store.list(), []);
    assert.equal(store.reset(), 0);
  } finally {
    close();
  }
});

test('data persists across store instances on the same file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'banana-backend-'));
  const databasePath = join(directory, 'bananas.db');

  try {
    const first = createBananaStore(databasePath);
    first.buy({ buyDate: '2026-03-01', number: 4 });
    first.sell({ sellDate: '2026-03-05', number: 2 });
    first.close();

    const second = createBananaStore(databasePath);
    try {
      const inventory = second.list();
      assert.equal(inventory.length, 4);
      assert.equal(inventory.filter((banana) => banana.sellDate === null).length, 2);
      assert.equal(inventory.filter((banana) => banana.sellDate === '2026-03-05').length, 2);
    } finally {
      second.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
