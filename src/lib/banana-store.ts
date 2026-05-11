import { randomUUID } from 'node:crypto';

import Database from 'better-sqlite3';

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
  reset: () => void;
  close: () => void;
};

const FRESHNESS_DAYS = 10;

function rowToBanana(row: BananaRow): Banana {
  return {
    id: row.id,
    buyDate: row.buy_date,
    sellDate: row.sell_date,
  };
}

function createBananaStore(databasePath: string): BananaStore {
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS bananas (
      id TEXT PRIMARY KEY,
      buy_date TEXT NOT NULL,
      sell_date TEXT
    );
  `);

  const listStmt = db.prepare<[], BananaRow>('SELECT id, buy_date, sell_date FROM bananas ORDER BY rowid');
  const insertStmt = db.prepare<[string, string]>('INSERT INTO bananas (id, buy_date, sell_date) VALUES (?, ?, NULL)');
  const findSellableStmt = db.prepare<[string, string, number], BananaRow>(`
    SELECT id, buy_date, sell_date FROM bananas
    WHERE sell_date IS NULL
      AND buy_date <= ?
      AND CAST(julianday(?) - julianday(buy_date) AS INTEGER) < ${FRESHNESS_DAYS}
    ORDER BY rowid
    LIMIT ?
  `);
  const markSoldStmt = db.prepare<[string, string]>('UPDATE bananas SET sell_date = ? WHERE id = ?');
  const truncateStmt = db.prepare('DELETE FROM bananas');

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
    const candidates = findSellableStmt.all(sellDate, sellDate, count);
    const sold: Banana[] = [];
    for (const row of candidates) {
      markSoldStmt.run(sellDate, row.id);
      sold.push({ id: row.id, buyDate: row.buy_date, sellDate });
    }
    return sold;
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
      truncateStmt.run();
    },

    close() {
      db.close();
    },
  };
}

export { createBananaStore };
export type { Banana, BananaStore, BuyInput, SellInput };
