import { join } from 'node:path';

import { z } from 'zod';

type AppConfig = {
  port: number;
  databasePath: string;
};

const envSchema = z.object({
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT must be an integer between 1 and 65535')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .optional(),
  DATABASE_PATH: z.string().min(1, 'DATABASE_PATH cannot be empty').optional(),
});

function getConfig(): AppConfig {
  const env = envSchema.parse({
    PORT: process.env.PORT,
    DATABASE_PATH: process.env.DATABASE_PATH,
  });

  return {
    port: env.PORT ?? 8080,
    databasePath: env.DATABASE_PATH ?? join(process.cwd(), 'bananas.db'),
  };
}

export { getConfig };
