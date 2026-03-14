import { join } from 'node:path';

type AppConfig = {
  port: number;
  databasePath: string;
};

function getConfig(): AppConfig {
  return {
    port: Number(process.env.PORT) || 8080,
    databasePath: process.env.DATABASE_PATH || join(process.cwd(), 'bananas.json'),
  };
}

export { getConfig };
