import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be of the form "YYYY-MM-DD"')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'must be a real calendar date');

const count = z
  .number()
  .int('"number" must be a whole number')
  .min(1, '1-50 bananas per order')
  .max(50, '1-50 bananas per order');

const buySchema = z.object({
  buyDate: isoDate,
  number: count,
});

const sellSchema = z.object({
  sellDate: isoDate,
  number: count,
});

type BuyPayload = z.infer<typeof buySchema>;
type SellPayload = z.infer<typeof sellSchema>;

export { buySchema, sellSchema };
export type { BuyPayload, SellPayload };
