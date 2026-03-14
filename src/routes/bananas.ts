import { Request, Response, Router } from 'express';

import { createBananaStore } from '../lib/banana-store';

type BananaRouteConfig = {
  databasePath: string;
};

type BuyPayload = {
  buyDate: string;
  number: number;
};

type SellPayload = {
  sellDate: string;
  number: number;
};

function createBananaRouter({ databasePath }: BananaRouteConfig) {
  const router = Router();
  const store = createBananaStore(databasePath);

  router.get('/', async (req: Request, res: Response) => {
    const bananas = await store.list();
    res.status(200).json(bananas);
  });

  router.post('/', async (req: Request, res: Response) => {
    const bananas = await store.buy(req.body as BuyPayload);
    res.status(201).json(bananas);
  });

  router.put('/', async (req: Request, res: Response) => {
    const bananas = await store.sell(req.body as SellPayload);
    res.status(200).json(bananas);
  });

  return router;
}

export { createBananaRouter };
