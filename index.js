const { writeFile } = require('node:fs/promises');

const { createApp } = require('./app');
const { getConfig } = require('./config');

async function startServer() {
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

module.exports = { startServer };
