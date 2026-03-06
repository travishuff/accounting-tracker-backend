const { join } = require('node:path');

function getConfig() {
  return {
    port: Number(process.env.PORT) || 8080,
    databasePath: process.env.DATABASE_PATH || join(__dirname, 'bananas.json'),
  };
}

module.exports = { getConfig };
