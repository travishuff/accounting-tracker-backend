import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

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

type BananaStore = {
  list: () => Promise<Banana[]>;
  buy: (input: BuyInput) => Promise<Banana[]>;
  sell: (input: SellInput) => Promise<Banana[]>;
};

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function daysBetween(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000);
}

async function readBananas(databasePath: string): Promise<Banana[]> {
  const data = await readFile(databasePath, 'utf8');
  return JSON.parse(data) as Banana[];
}

async function writeBananas(databasePath: string, bananas: Banana[]): Promise<void> {
  await writeFile(databasePath, JSON.stringify(bananas, null, 2));
}

function validateCount(number: number): string | null {
  if (!Number.isInteger(number)) {
    return '"number" must be a whole number';
  }

  if (number < 1 || number > 50) {
    return '1-50 bananas per order';
  }

  return null;
}

function createBananaStore(databasePath: string): BananaStore {
  return {
    async list() {
      return readBananas(databasePath);
    },

    async buy({ buyDate, number }: BuyInput) {
      const countError = validateCount(number);
      if (countError) {
        throw new HttpError(countError, 400);
      }

      if (!isValidDateString(buyDate)) {
        throw new HttpError('"buyDate" must be of the form "YYYY-MM-DD"', 400);
      }

      const bananas = Array.from({ length: number }, () => ({
        id: randomUUID(),
        buyDate,
        sellDate: null,
      }));

      const existingBananas = await readBananas(databasePath);
      await writeBananas(databasePath, [...existingBananas, ...bananas]);

      return bananas;
    },

    async sell({ sellDate, number }: SellInput) {
      const countError = validateCount(number);
      if (countError) {
        throw new HttpError(countError, 400);
      }

      if (!isValidDateString(sellDate)) {
        throw new HttpError('"sellDate" must be of the form "YYYY-MM-DD"', 400);
      }

      const existingBananas = await readBananas(databasePath);
      const soldBananas: Banana[] = [];

      for (const banana of existingBananas) {
        if (soldBananas.length === number) {
          break;
        }

        if (
          banana.sellDate === null &&
          banana.buyDate <= sellDate &&
          daysBetween(banana.buyDate, sellDate) < 10
        ) {
          banana.sellDate = sellDate;
          soldBananas.push(banana);
        }
      }

      await writeBananas(databasePath, existingBananas);
      return soldBananas;
    },
  };
}

export { createBananaStore };
