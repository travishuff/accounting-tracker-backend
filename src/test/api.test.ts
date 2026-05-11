import assert from 'node:assert/strict';
import test from 'node:test';

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

    const sold = store.sell({ sellDate: '2026-03-20', number: 5 });

    assert.equal(sold.length, 1);
    assert.equal(sold[0].buyDate, '2026-03-20');
  } finally {
    close();
  }
});

test('sell skips bananas bought after the sell date', () => {
  const { store, close } = createTestStore();

  try {
    store.buy({ buyDate: '2026-03-10', number: 2 });

    const sold = store.sell({ sellDate: '2026-03-05', number: 2 });

    assert.equal(sold.length, 0);
  } finally {
    close();
  }
});

test('reset truncates the store', () => {
  const { store, close } = createTestStore();

  try {
    store.buy({ buyDate: '2026-03-01', number: 3 });
    store.reset();
    assert.equal(store.list().length, 0);
  } finally {
    close();
  }
});
