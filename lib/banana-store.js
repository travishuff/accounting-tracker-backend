const { randomUUID } = require('node:crypto');
const { readFile, writeFile } = require('node:fs/promises');

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  return Math.floor((endDate - startDate) / 86_400_000);
}

async function readBananas(databasePath) {
  const data = await readFile(databasePath, 'utf8');
  return JSON.parse(data);
}

async function writeBananas(databasePath, bananas) {
  await writeFile(databasePath, JSON.stringify(bananas, null, 2));
}

function validateCount(number) {
  if (!Number.isInteger(number)) {
    return '"number" must be a whole number';
  }

  if (number < 1 || number > 50) {
    return '1-50 bananas per order';
  }

  return null;
}

function createBananaStore(databasePath) {
  return {
    async list() {
      return readBananas(databasePath);
    },

    async buy({ buyDate, number }) {
      const countError = validateCount(number);
      if (countError) {
        const error = new Error(countError);
        error.status = 400;
        throw error;
      }

      if (!isValidDateString(buyDate)) {
        const error = new Error('"buyDate" must be of the form "YYYY-MM-DD"');
        error.status = 400;
        throw error;
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

    async sell({ sellDate, number }) {
      const countError = validateCount(number);
      if (countError) {
        const error = new Error(countError);
        error.status = 400;
        throw error;
      }

      if (!isValidDateString(sellDate)) {
        const error = new Error('"sellDate" must be of the form "YYYY-MM-DD"');
        error.status = 400;
        throw error;
      }

      const existingBananas = await readBananas(databasePath);
      const soldBananas = [];

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

module.exports = { createBananaStore };
