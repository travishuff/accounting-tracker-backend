import { randomUUID } from 'node:crypto';

import { Database } from 'bun:sqlite';

import { InsufficientEligibleInventoryError } from './inventory-errors';

type Banana = {
  id: string;
  buyDate: string;
  sellDate: string | null;
};

type BuyInput = {
  buyDate: string;
  number: number;
};

type SellInput = {
  sellDate: string;
  number: number;
};

type BananaRow = {
  id: string;
  buy_date: string;
  sell_date: string | null;
};

type BananaStore = {
  list: () => Banana[];
  buy: (input: BuyInput) => Banana[];
  sell: (input: SellInput) => Banana[];
  reset: () => number;
  close: () => void;
};

const FRESHNESS_DAYS = 10;

type CountRow = {
  count: number;
};

function rowToBanana(row: BananaRow): Banana {
  return {
    id: row.id,
    buyDate: row.buy_date,
    sellDate: row.sell_date,
  };
}

function createBananaStore(databasePath: string): BananaStore {
  const db = new Database(databasePath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS bananas (
      id TEXT PRIMARY KEY,
      buy_date TEXT NOT NULL,
      sell_date TEXT
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS bananas_unsold_buy_date_idx
    ON bananas (buy_date)
    WHERE sell_date IS NULL;
  `);

  const listStmt = db.prepare<BananaRow, []>(
    'SELECT id, buy_date, sell_date FROM bananas ORDER BY rowid',
  );
  const insertStmt = db.prepare<unknown, [string, string]>(
    'INSERT INTO bananas (id, buy_date, sell_date) VALUES (?, ?, NULL)',
  );
  const findSellableStmt = db.prepare<BananaRow, [string, string, number]>(`
    SELECT id, buy_date, sell_date FROM bananas
    WHERE sell_date IS NULL
      AND buy_date <= ?
      AND buy_date > ?
    ORDER BY rowid
    LIMIT ?
  `);
  const markSoldStmt = db.prepare<unknown, [string, string]>(
    'UPDATE bananas SET sell_date = ? WHERE id = ?',
  );
  const countStmt = db.prepare<CountRow, []>('SELECT COUNT(*) AS count FROM bananas');
  const resetStmt = db.prepare<unknown, []>('DELETE FROM bananas');

  const buyTxn = db.transaction((buyDate: string, count: number): Banana[] => {
    const created: Banana[] = [];
    for (let i = 0; i < count; i += 1) {
      const id = randomUUID();
      insertStmt.run(id, buyDate);
      created.push({ id, buyDate, sellDate: null });
    }
    return created;
  });

  const sellTxn = db.transaction((sellDate: string, count: number): Banana[] => {
    const oldestEligibleBuyDate = subtractDays(sellDate, FRESHNESS_DAYS);
    const candidates = findSellableStmt.all(sellDate, oldestEligibleBuyDate, count);
    if (candidates.length < count) {
      throw new InsufficientEligibleInventoryError(candidates.length, count, sellDate);
    }
    const sold: Banana[] = [];
    for (const row of candidates) {
      markSoldStmt.run(sellDate, row.id);
      sold.push({ id: row.id, buyDate: row.buy_date, sellDate });
    }
    return sold;
  });
  const resetTxn = db.transaction((): number => {
    const row = countStmt.get();
    resetStmt.run();
    return row?.count ?? 0;
  });

  return {
    list() {
      return listStmt.all().map(rowToBanana);
    },

    buy({ buyDate, number }: BuyInput) {
      return buyTxn(buyDate, number);
    },

    sell({ sellDate, number }: SellInput) {
      return sellTxn(sellDate, number);
    },

    reset() {
      return resetTxn();
    },

    close() {
      db.close();
    },
  };
}

function subtractDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
}

export { createBananaStore };
export type { Banana, BananaStore, BuyInput, SellInput };
