import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { Duplex } from 'node:stream';
import test from 'node:test';

import type { Express } from 'express';

import { createApp } from '../app';
import { createBananaStore } from '../lib/banana-store';
import type { BananaStore } from '../lib/banana-store';

type TestClient = {
  request: (method: string, url: string, body?: unknown) => Promise<TestResponse>;
  close: () => void;
};

type TestResponse = {
  status: number;
  body: unknown;
};

type TestRequest = IncomingMessage & {
  body?: unknown;
};

class MockSocket extends Duplex {
  chunks: Buffer[] = [];

  _read(): void {}

  _write(chunk: Buffer | string, _encoding: string, callback: () => void): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }
}

function createTestClient(store: BananaStore = createBananaStore(':memory:')): TestClient {
  const app = createApp({ store });

  return {
    request(method: string, url: string, body?: unknown) {
      return dispatch(app, method, url, body);
    },
    close() {
      store.close();
    },
  };
}

async function dispatch(
  app: Express,
  method: string,
  url: string,
  body?: unknown,
): Promise<TestResponse> {
  const socket = new MockSocket();
  const req = new IncomingMessage(socket as unknown as Socket) as TestRequest;
  req.method = method;
  req.url = url;

  if (body !== undefined) {
    req.body = body;
  }
  req.push(null);

  const res = new ServerResponse(req);
  res.assignSocket(socket as unknown as Socket);

  const response = new Promise<TestResponse>((resolve) => {
    res.on('finish', () => {
      const rawResponse = Buffer.concat(socket.chunks).toString('utf8');
      const responseBody = rawResponse.split('\r\n\r\n', 2)[1] ?? '';
      resolve({
        status: res.statusCode,
        body: responseBody ? JSON.parse(responseBody) : undefined,
      });
    });
  });

  app(req, res);
  return response;
}

async function withMutedErrors<T>(callback: () => Promise<T>): Promise<T> {
  const originalError = console.error;
  console.error = () => {};
  try {
    return await callback();
  } finally {
    console.error = originalError;
  }
}

test('GET /api returns health status', async () => {
  const client = createTestClient();

  try {
    const response = await client.request('GET', '/api');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'ok' });
  } finally {
    client.close();
  }
});

test('GET /api/bananas returns inventory', async () => {
  const client = createTestClient();

  try {
    const response = await client.request('GET', '/api/bananas');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  } finally {
    client.close();
  }
});

test('POST /api/bananas validates request bodies', async () => {
  const client = createTestClient();

  try {
    const response = await withMutedErrors(() =>
      client.request('POST', '/api/bananas', { buyDate: '2026-03-01', number: 0 }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: '1-50 bananas per order' });
  } finally {
    client.close();
  }
});

test('POST /api/bananas/sales maps insufficient eligible inventory to 409', async () => {
  const client = createTestClient();

  try {
    const response = await withMutedErrors(() =>
      client.request('POST', '/api/bananas/sales', { sellDate: '2026-03-01', number: 1 }),
    );

    assert.equal(response.status, 409);
    assert.deepEqual(response.body, {
      error: 'Only 0 banana(s) eligible to sell on 2026-03-01, requested 1',
    });
  } finally {
    client.close();
  }
});

test('unknown routes return 404', async () => {
  const client = createTestClient();

  try {
    const response = await client.request('GET', '/missing');

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Not Found' });
  } finally {
    client.close();
  }
});

test('unexpected errors return a generic 500 response', async () => {
  const store: BananaStore = {
    list() {
      throw new Error('database password leaked in stack');
    },
    buy() {
      throw new Error('not used');
    },
    sell() {
      throw new Error('not used');
    },
    close() {},
  };
  const client = createTestClient(store);

  try {
    const response = await withMutedErrors(() => client.request('GET', '/api/bananas'));

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'Internal Server Error' });
  } finally {
    client.close();
  }
});
