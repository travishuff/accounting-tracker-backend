import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';

import { BananaStore } from './lib/banana-store';
import { HttpError } from './lib/http-error';
import { InsufficientEligibleInventoryError } from './lib/inventory-errors';
import { createRoutes } from './routes';

type AppConfig = {
  store: BananaStore;
};

function createApp({ store }: AppConfig) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());
  app.use('/api', createRoutes({ store }));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    const status = resolveStatus(err);
    const message = resolveMessage(err);

    if (status >= 500) {
      console.error('Request failed', err);
    }
    res.status(status).json({ error: message });
  });

  return app;
}

function resolveStatus(error: unknown): number {
  if (error instanceof HttpError && error.status >= 400 && error.status <= 599) {
    return error.status;
  }
  if (error instanceof InsufficientEligibleInventoryError) {
    return 409;
  }
  return 500;
}

function resolveMessage(error: unknown): string {
  if (error instanceof HttpError || error instanceof InsufficientEligibleInventoryError) {
    return error.message;
  }
  return 'Internal Server Error';
}

export { createApp };
