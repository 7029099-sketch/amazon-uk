# ХАПАЙ SALE — Шо, так можно?!

Independent storefront brand: **ХАПАЙ SALE**.

Tagline: **Шо, так можно?!**

Positioning: **Поисковик выгодных товаров США для украинцев.**

Working prototype of a US deal discovery, filtering, ordering and delivery service for Ukraine.

The product is designed as a marketplace-agnostic discovery and ordering layer. Amazon US is the first source; Walmart, eBay, Target, Best Buy and other approved US sources can later plug into the same normalized search API without rebuilding the storefront, cart or operations flow.

## Main pages

- `index.html` - storefront / positioning
- `catalog.html` - filtered deal search
- `product.html` - product detail with multi-image gallery
- `cart.html` - cart and customs-value meter
- `checkout.html` - commission-order checkout prototype
- `offer.html` - draft public offer
- `admin.html` - operations/admin UI prototype

## Product data

`products-feed.json` is currently a manually verified snapshot. It must not be presented as a continuously live Amazon API feed.

`deal-config.json` defines selection, pricing, customs-buffer, marketplace-discovery and compliance rules. `MARKETPLACE_SEARCH_SPEC.md` defines the common product contract for future source adapters.

## Compliance

`admin-compliance.js` adds a Compliance Center to the admin UI. `COMPLIANCE_GUARDRAILS.md` documents the operating guardrails for source rights, price freshness, trademarks, ads, logistics and the separation between affiliate links and the managed-purchase flow.

The independent ХАПАЙ SALE brand is selected, but the final public domain, source/data rights, ad policies, tax/fiscal flow, carrier restrictions and production legal review remain launch gates.

## Backend foundation

The repository contains a Node/PostgreSQL backend scaffold:

- `server/index.js` - API + static storefront server
- `server/catalog.js` - server-side search/filter/pricing layer
- `server/auth.js` - admin authentication and RBAC
- `server/db.js` - PostgreSQL connection/transactions
- `server/schema.sql` - orders, items, documents, events, admin users and audit log
- `BACKEND_DEPLOY.md` - safe deployment sequence

Current API foundation includes `/api/health`, `/api/search`, server-recalculated order creation, admin login, shared orders, operational updates, documents and team roles.

The current Render Static Site does not execute this backend yet. Keep it running while a separate temporary Node Web Service + PostgreSQL instance is tested. Do not switch `deal-config.json -> discovery.enabled` to `true` until the backend endpoint is actually deployed.

## Admin

`admin.html` currently works as a local prototype and models views for orders, US purchases/invoices, warehouse, consolidation, logistics, finance, documents, customers, team roles, integrations, compliance and settings.

The backend foundation provides the next production layer: shared PostgreSQL data, JWT authentication, server-side roles and audit history. The frontend admin still needs to be connected to those endpoints before it should be used by real staff.

## Before production

- approved live/authorized marketplace product data source
- deploy backend + PostgreSQL
- connect checkout/admin frontend to server APIs
- secure document object storage
- payments and webhooks
- carrier / 3PL integrations
- Telegram bot integration
- accounting and legal review of the commission/payment/fiscal flow
- select the final domain for the ХАПАЙ SALE brand before public launch
