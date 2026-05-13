import type { Server } from 'node:http';

import { createApp } from './app';
import { getConfig } from './config';
import { createBananaStore } from './lib/banana-store';

function startServer(): Server {
  const { databasePath, port } = getConfig();

  const store = createBananaStore(databasePath);

  const app = createApp({ store });

  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
  server.once('close', () => {
    store.close();
  });

  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error('Failed to stop server cleanly', error);
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return server;
}

if (require.main === module) {
  try {
    startServer();
  } catch (error) {
    console.error('Failed to start server', error);
    process.exitCode = 1;
  }
}

export { startServer };
