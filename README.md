# Backend

This service exposes a small banana inventory API under `/api`.

## Routes

1. `GET /api/bananas`
   Returns all bananas in the database.
2. `POST /api/bananas`
   Accepts `number` and `buyDate` (`YYYY-MM-DD`) in the request body and returns the newly purchased bananas.
3. `PUT /api/bananas`
   Accepts `number` and `sellDate` (`YYYY-MM-DD`) in the request body and returns the bananas sold by the request.

Bananas are stored in this shape:

```json
{
  "id": "f3a6c6bb-b97e-4639-abea-f91cdf7b0444",
  "buyDate": "YYYY-MM-DD",
  "sellDate": null
}
```

The backing JSON file is reset on server startup so each run starts from a clean state.

## Requirements

Node.js `18+`

## Install

From the repo root: `npm install`

## Run

From the repo root: `npm start`

For local development with automatic restarts: `npm run dev`

The server listens on port `8080` by default.

## Test

Run `npm test`
