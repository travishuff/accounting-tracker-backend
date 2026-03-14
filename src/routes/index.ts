import { Request, Response, Router } from 'express';

import { createBananaRouter } from './bananas';

type RouteConfig = {
  databasePath: string;
};

function createRoutes({ databasePath }: RouteConfig) {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  router.use('/bananas', createBananaRouter({ databasePath }));

  return router;
}

export { createRoutes };
