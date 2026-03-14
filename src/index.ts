import { writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';

import { createApp } from './app';
import { getConfig } from './config';

async function startServer(): Promise<Server> {
  const { databasePath, port } = getConfig();

  await writeFile(databasePath, '[]\n');

  const app = createApp({ databasePath });

  return app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exitCode = 1;
  });
}

export { startServer };
