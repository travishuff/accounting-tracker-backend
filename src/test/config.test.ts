import assert from 'node:assert/strict';

import { test } from 'bun:test';

import { getConfig } from '../config';

type EnvOverride = {
  PORT?: string;
  DATABASE_PATH?: string;
};

function withEnv<T>(env: EnvOverride, callback: () => T): T {
  const hadPort = Object.hasOwn(process.env, 'PORT');
  const hadDatabasePath = Object.hasOwn(process.env, 'DATABASE_PATH');
  const originalPort = process.env.PORT;
  const originalDatabasePath = process.env.DATABASE_PATH;

  setEnv('PORT', env.PORT);
  setEnv('DATABASE_PATH', env.DATABASE_PATH);

  try {
    return callback();
  } finally {
    restoreEnv('PORT', hadPort, originalPort);
    restoreEnv('DATABASE_PATH', hadDatabasePath, originalDatabasePath);
  }
}

function setEnv(key: 'PORT' | 'DATABASE_PATH', value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function restoreEnv(
  key: 'PORT' | 'DATABASE_PATH',
  hadValue: boolean,
  value: string | undefined,
): void {
  if (!hadValue) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

test('getConfig returns defaults when environment variables are unset', () => {
  const config = withEnv({ PORT: undefined, DATABASE_PATH: undefined }, () => getConfig());

  assert.equal(config.port, 8080);
  assert.match(config.databasePath, /bananas\.db$/);
});

test('getConfig parses configured values', () => {
  const config = withEnv({ PORT: '3001', DATABASE_PATH: '/tmp/test-bananas.db' }, () =>
    getConfig(),
  );

  assert.equal(config.port, 3001);
  assert.equal(config.databasePath, '/tmp/test-bananas.db');
});

test('getConfig rejects invalid ports', () => {
  assert.throws(() => withEnv({ PORT: 'not-a-port' }, () => getConfig()), /PORT/);
  assert.throws(() => withEnv({ PORT: '0' }, () => getConfig()), /Too small/);
  assert.throws(() => withEnv({ PORT: '65536' }, () => getConfig()), /Too big/);
});

test('getConfig rejects an empty database path', () => {
  assert.throws(() => withEnv({ DATABASE_PATH: '' }, () => getConfig()), /DATABASE_PATH/);
});
