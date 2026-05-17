import { Request, Response, Router } from 'express';

import { BananaStore } from '../lib/banana-store';
import { createBananaRouter } from './bananas';

type RouteConfig = {
  store: BananaStore;
};

function createRoutes({ store }: RouteConfig) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  router.delete('/database', (_req: Request, res: Response) => {
    res.status(200).json({ deleted: store.reset() });
  });

  router.use('/bananas', createBananaRouter({ store }));

  return router;
}

export { createRoutes };
