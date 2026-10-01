# Backend deployment plan

This repository now contains a Node/PostgreSQL backend scaffold. The current public site can remain static until the backend service is intentionally enabled.

## What the backend already provides

- `GET /api/health`
- `GET /api/search?q=...&cat=...&source=...`
- `POST /api/orders` with server-side recalculation of product, shipping and service amounts
- admin login with JWT
- server-side RBAC roles: owner, operator, buyer, logistics, finance, content
- shared orders in PostgreSQL
- historical product snapshots per order
- order timeline / audit log
- purchase, warehouse and shipping operational fields
- document metadata for invoice / shipping / commission-report records
- team creation endpoint for the owner

## Required production environment variables

```text
NODE_ENV=production
DATABASE_URL=postgres://...
JWT_SECRET=<long random secret>
ADMIN_NAME=<initial owner name>
ADMIN_EMAIL=<initial owner email>
ADMIN_PASSWORD=<strong initial password>
```

Do not commit real passwords, database URLs, Amazon credentials, carrier tokens or Telegram bot tokens.

## Recommended Render setup

Create a Node Web Service from this repository:

- Build command: `npm install`
- Start command: `npm start`
- Node 20+
- Attach a PostgreSQL database and expose its connection string as `DATABASE_URL`
- Add the secret environment variables above

The server also serves the existing static storefront, so after switching from the current Static Site to the Web Service the public pages and `/api/*` can live on the same domain.

Do not delete the current Static Site until the Web Service has been tested on its temporary Render URL.

## Safe rollout order

1. Deploy backend on a temporary URL.
2. Confirm `/api/health` and `/api/search`.
3. Create the first owner through environment bootstrap.
4. Connect checkout to `POST /api/orders` with localStorage fallback during testing.
5. Connect admin login and shared order loading.
6. Move documents to object storage.
7. Connect carrier / 3PL APIs and payment webhooks.
8. Connect an approved Amazon / marketplace data source server-side.
9. Only then set `deal-config.json -> discovery.enabled` to `true` for the production domain.

## Important

The current `/api/search` deliberately searches the verified local snapshot. It is the contract and filtering layer, not a scraper. Amazon/Walmart/eBay/etc. adapters should be added server-side and must follow each provider's current API/content rules.
