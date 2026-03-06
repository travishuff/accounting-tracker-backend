const { Router } = require('express');

const { createBananaRouter } = require('./bananas');

function createRoutes({ databasePath }) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.use('/bananas', createBananaRouter({ databasePath }));

  return router;
}

module.exports = { createRoutes };
