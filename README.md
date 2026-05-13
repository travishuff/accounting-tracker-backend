# Banana Backend

A small Express + TypeScript service that tracks a banana inventory. It exposes a JSON API under `/api` and persists data to a local SQLite database.

The companion frontend lives at `banana-tracker`.

## Stack

- Node.js (20+)
- Express 5
- TypeScript 5
- SQLite via `better-sqlite3`
- `zod` for request validation
- `node:test` for the test runner

## Requirements

- Node.js `>=20`
- No external services — SQLite runs in-process and writes to a local file

## Quick start

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:8080` and restarts on save (via `tsx watch`). On first run it creates `bananas.db` in the repo root.

## Configuration

Configuration is read from environment variables at startup:

| Variable        | Default        | Description                                   |
| --------------- | -------------- | --------------------------------------------- |
| `PORT`          | `8080`         | TCP port the HTTP server binds to (`1-65535`) |
| `DATABASE_PATH` | `./bananas.db` | Path to the SQLite database file              |

Invalid configuration fails fast during startup. `PORT` must be an integer from `1` to `65535`, and `DATABASE_PATH` cannot be empty.

To start fresh, stop the server and delete the database file:

```bash
rm bananas.db bananas.db-wal bananas.db-shm
```

## Scripts

| Command                | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Run the server with `tsx watch` (live reload, no build step) |
| `npm run build`        | Compile TypeScript to `dist/`                                |
| `npm start`            | Build, then run the compiled output (`node dist/index.js`)   |
| `npm test`             | Compile tests to `dist-test/` and run with `node --test`     |
| `npm run lint`         | Run ESLint over the project                                  |
| `npm run format`       | Apply Prettier formatting                                    |
| `npm run format:check` | Check formatting without writing                             |

## API

All endpoints live under `/api`. All requests and responses are `application/json`.

### `GET /api`

Health check.

**Response — 200**

```json
{ "status": "ok" }
```

### `GET /api/bananas`

List every banana in the database, sorted by insertion order.

**Response — 200**

```json
[
  {
    "id": "f3a6c6bb-b97e-4639-abea-f91cdf7b0444",
    "buyDate": "2026-05-10",
    "sellDate": null
  }
]
```

### `POST /api/bananas` — buy

Purchase `number` bananas, all dated `buyDate`. Each banana is assigned a fresh UUID.

**Request body**

```json
{
  "buyDate": "2026-05-10",
  "number": 5
}
```

**Response — 201**

Returns only the bananas created by this request (not the full inventory):

```json
[
  { "id": "…", "buyDate": "2026-05-10", "sellDate": null },
  { "id": "…", "buyDate": "2026-05-10", "sellDate": null }
]
```

### `POST /api/bananas/sales` — sell

Sell exactly `number` bananas with sell date `sellDate`. The server picks eligible bananas in insertion order and marks them sold. A banana is **eligible** when:

- it has not already been sold (`sellDate` is `null`), and
- its `buyDate` is on or before `sellDate`, and
- fewer than 10 days have elapsed between `buyDate` and `sellDate` (the freshness window).

The operation is atomic: if fewer than `number` eligible bananas exist, the request fails with `409 Conflict` and no bananas are marked sold.

**Request body**

```json
{
  "sellDate": "2026-05-12",
  "number": 3
}
```

**Response — 201**

```json
[
  { "id": "…", "buyDate": "2026-05-10", "sellDate": "2026-05-12" },
  { "id": "…", "buyDate": "2026-05-10", "sellDate": "2026-05-12" },
  { "id": "…", "buyDate": "2026-05-10", "sellDate": "2026-05-12" }
]
```

## Data model

A banana has exactly three fields:

| Field      | Type               | Description                                            |
| ---------- | ------------------ | ------------------------------------------------------ |
| `id`       | `string` (UUID v4) | Server-assigned, stable for the lifetime of the banana |
| `buyDate`  | `string`           | ISO date, `YYYY-MM-DD`                                 |
| `sellDate` | `string \| null`   | ISO date once sold; `null` while in inventory          |

## Validation

Request bodies are validated at the route boundary with `zod`. The constraints are:

- `number` — integer in `[1, 50]`
- `buyDate` / `sellDate` — string matching `^\d{4}-\d{2}-\d{2}$` **and** a real calendar date (`2026-02-30` is rejected)

## Error responses

Every error response uses the same envelope:

```json
{ "error": "1-50 bananas per order" }
```

Status codes returned by the API:

| Status | When                                                                                   |
| ------ | -------------------------------------------------------------------------------------- |
| `400`  | Request body fails zod validation (bad type, out of range, malformed date)             |
| `404`  | Unknown route                                                                          |
| `409`  | `POST /api/bananas/sales` requested more bananas than were eligible                    |
| `500`  | Unhandled server error. Response body uses the generic message `Internal Server Error` |

## Storage

Data is persisted to a single SQLite file (`bananas.db` by default). The `bananas` table is created on first startup if it doesn't exist, and survives server restarts. WAL journaling is enabled, so you may see `bananas.db-wal` and `bananas.db-shm` sidecar files — all three are git-ignored.

Concurrency is handled at the database layer. The `buy` and `sell` operations run inside a SQLite transaction, so overlapping HTTP requests cannot corrupt the store or interleave a partial sell.

## Project layout

```
src/
  app.ts              Express app construction + error middleware
  config.ts           Environment-driven config (PORT, DATABASE_PATH)
  index.ts            Process entry point: constructs the store and starts the server
  lib/
    banana-store.ts   SQLite-backed inventory store (buy, sell, list)
    http-error.ts     Shared HttpError class for status-bearing errors
    format-issue.ts   Maps zod issues to user-facing error messages
    inventory-errors.ts Domain-level inventory errors
    schemas.ts        zod request schemas (buySchema, sellSchema)
  routes/
    index.ts          Mounts the /api router
    bananas.ts        Route handlers for /api/bananas (list, buy, sell)
  test/
    api.test.ts       Store behavior + persistence regression tests
    config.test.ts    Environment config parsing tests
    http.test.ts      Express route and error-envelope tests
    schemas.test.ts   Validation schema tests
```

## Testing

```bash
npm test
```

Tests use in-memory SQLite (`:memory:`) for isolation. The persistence regression test writes to a temporary file to verify that data survives reopening the same database. HTTP tests exercise the Express app in process, so they do not need to bind a local port.

## Linting and formatting

```bash
npm run lint          # eslint
npm run format        # prettier --write
npm run format:check  # prettier --check
```
