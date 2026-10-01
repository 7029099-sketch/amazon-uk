# Amazon UK prototype

Static storefront prototype for curated Amazon US deals with an estimated delivered-to-Ukraine price and two purchase modes:

- order through the service under the commission workflow;
- follow the source Amazon link and buy independently.

## Main pages

- `index.html` - storefront
- `catalog.html` - filtered deal catalog
- `product.html` - product detail with multi-image gallery
- `cart.html` - cart and customs-value meter
- `checkout.html` - commission-order checkout prototype
- `offer.html` - draft public offer
- `admin.html` - operations/admin UI prototype

## Product data

`products-feed.json` is currently a manually verified snapshot. It must not be presented as a continuously live Amazon API feed.

`deal-config.json` defines the current selection and pricing rules.

## Admin

`admin.html` reads the same catalog and test orders saved by checkout. It contains views for orders, Amazon purchase/invoices, US warehouse, consolidation, logistics, finance, documents, customers, team roles, integrations and settings.

This is not secure production authentication. Real staff accounts, permissions, documents and shared order data require a backend, database and server-side authorization. See `ADMIN_ARCHITECTURE.md`.

## Before production

- approved live/authorized Amazon product data source
- backend + database
- server-side authentication and RBAC
- payments and webhooks
- carrier / 3PL integrations
- document storage
- Telegram bot integration
- accounting and legal review of the commission/payment/fiscal flow
- replace or legally review branding before public launch
