const cors = require('cors');
const express = require('express');

const { createRoutes } = require('./routes');

function createApp({ databasePath }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', createRoutes({ databasePath }));

  app.use((req, res) => {
    res.sendStatus(404);
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    console.error('Request failed', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  return app;
}

module.exports = { createApp };
