import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';

import { BananaStore } from './lib/banana-store';
import { HttpError } from './lib/http-error';
import { createRoutes } from './routes';

type AppConfig = {
  store: BananaStore;
};

function createApp({ store }: AppConfig) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', createRoutes({ store }));

  app.use((_req: Request, res: Response) => {
    res.sendStatus(404);
  });

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    const error = err as Partial<HttpError>;
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error?.message ? error.message : 'Internal Server Error';

    console.error('Request failed', err);
    res.status(status).json({ error: message });
  });

  return app;
}

export { createApp };
