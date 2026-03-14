import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';

import { createRoutes } from './routes';

type AppConfig = {
  databasePath: string;
};

type HttpError = Error & {
  status?: number;
};

function createApp({ databasePath }: AppConfig) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', createRoutes({ databasePath }));

  app.use((req: Request, res: Response) => {
    res.sendStatus(404);
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    const error = err as HttpError;
    const status = typeof error.status === 'number' ? error.status : 500;
    const message = error?.message ? error.message : 'Internal Server Error';

    console.error('Request failed', err);
    res.status(status).json({ error: message });
  });

  return app;
}

export { createApp };
