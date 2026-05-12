import { Request, Response, Router } from 'express';
import { ZodType } from 'zod';

import { BananaStore } from '../lib/banana-store';
import { formatIssue } from '../lib/format-issue';
import { HttpError } from '../lib/http-error';
import { buySchema, sellSchema } from '../lib/schemas';

type BananaRouteConfig = {
  store: BananaStore;
};

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(issue ? formatIssue(issue, body) : 'Invalid request body', 400);
  }
  return result.data;
}

function createBananaRouter({ store }: BananaRouteConfig) {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.status(200).json(store.list());
  });

  router.post('/', (req: Request, res: Response) => {
    const payload = parseBody(buySchema, req.body);
    res.status(201).json(store.buy(payload));
  });

  router.put('/', (req: Request, res: Response) => {
    const payload = parseBody(sellSchema, req.body);
    res.status(200).json(store.sell(payload));
  });

  return router;
}

export { createBananaRouter };
