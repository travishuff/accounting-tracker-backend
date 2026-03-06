const { Router } = require('express');

const { createBananaStore } = require('../lib/banana-store');

function createBananaRouter({ databasePath }) {
  const router = Router();
  const store = createBananaStore(databasePath);

  router.get('/', async (req, res) => {
    const bananas = await store.list();
    res.status(200).json(bananas);
  });

  router.post('/', async (req, res) => {
    const bananas = await store.buy(req.body);
    res.status(201).json(bananas);
  });

  router.put('/', async (req, res) => {
    const bananas = await store.sell(req.body);
    res.status(200).json(bananas);
  });

  return router;
}

module.exports = { createBananaRouter };
