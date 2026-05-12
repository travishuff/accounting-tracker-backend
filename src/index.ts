import type { Server } from 'node:http';

import { createApp } from './app';
import { getConfig } from './config';
import { createBananaStore } from './lib/banana-store';

function startServer(): Server {
  const { databasePath, port } = getConfig();

  const store = createBananaStore(databasePath);

  const app = createApp({ store });

  return app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
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
