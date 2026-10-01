# Amazon UK Ops architecture

This repository is currently a static storefront prototype. `admin.html` is a working UI prototype that reads the same product feed and test orders stored in browser `localStorage`. It is intentionally **not** a secure production admin yet.

## Production goal

One internal order ID must connect the whole chain:

`customer -> checkout -> payment -> Amazon purchase -> US warehouse/3PL -> consolidation -> international shipment -> customs -> Ukrainian last mile -> delivered -> commission report`

The admin should never require staff to reconcile the same order manually between Telegram, spreadsheets, Amazon invoices and carrier portals.

## Core entities

### orders
- `id`, `number`, `status`, timestamps
- customer and delivery snapshot
- terms version and acceptance timestamp
- goods value for customs control
- financial split: execution funds / shipping expenses / service commission
- price-change approval state
- audit metadata

### order_items
- immutable product snapshot at order time
- product/ASIN/source URL
- source price, list price, discount
- quantity, weight, billable weight
- delivered estimate at order time

### purchases
- order / item relation
- Amazon order ID
- seller
- actual purchase price
- purchased timestamp
- invoice file reference
- payment transaction reference

### warehouse_packages
- US warehouse package ID
- inbound carrier tracking
- received timestamp
- physical weight, dimensions, volumetric weight
- photo references
- item-to-package mapping
- consolidation group

### shipments
- international carrier
- label / manifest
- international tracking
- declared contents/value
- billable weight and actual shipping cost
- Ukrainian carrier and TTN
- shipment timeline

### documents
- type: Amazon invoice, customer payment receipt, warehouse proof, manifest, customs document, last-mile label, commission report, refund
- immutable file metadata
- linked order / purchase / shipment

### commission_reports
- actual purchase cost
- actual third-party expenses
- service commission
- remainder/refund
- final customer report file

### users / roles / permissions
Suggested roles:
- Owner
- Operator
- Buyer
- Logistics
- Finance
- Content

Permissions should be granular by module and action (`view`, `create`, `update`, `export`, `refund`, `manage_users`, etc.). Production auth needs server-side sessions or a managed identity provider. Hiding UI elements in JavaScript is not security.

## Audit log

Every operational change should record:
- actor user ID
- timestamp
- entity and entity ID
- action
- previous value
- new value
- request/IP metadata where appropriate

Financial fields, accepted offer version, invoices and historical order-item snapshots should never silently change when the live product catalog changes.

## Integrations

### Product source
Use an approved Amazon product/affiliate data source. Secrets must stay server-side. The current JSON feed is a manually verified snapshot, not a live Amazon API.

### Amazon Associates
Store the associate tag in server configuration. Affiliate click tracking should be separate from the `buy-on-behalf` commission transaction.

### US warehouse / 3PL
Required events:
- package received
- package ID / order ID mapping
- measured weight and dimensions
- package photos
- consolidation / repack result
- outbound tracking

Prefer webhooks. If unavailable, schedule polling server-side.

### International logistics
Adapter interface should support multiple carriers so Meest, Nova Global or another B2B operator can be swapped without changing orders.

### Ukraine last mile
Create TTN, resolve branches/lockers, receive tracking updates and delivery/failure states.

### Telegram
A Telegram bot should publish only products that currently pass the deal filter. The bot token must be stored as a server secret. Publishing history should be recorded to avoid duplicate posts and to measure clicks per product.

### Payments / fiscal flow
Payment webhooks must be idempotent. Store provider transaction IDs. Refunds and partial refunds must be represented as separate financial events rather than overwriting the original payment.

## Automation rules

A daily catalog job should:
1. fetch/verify current product data;
2. compare price and availability with the previous snapshot;
3. calculate discount from trustworthy reference data;
4. check rating/reviews;
5. calculate physical and volumetric shipping risk;
6. reject restricted/hazmat/incompatible items;
7. run customs-value filter;
8. mark expired deals inactive rather than deleting history;
9. publish approved changes to storefront;
10. optionally queue Telegram posts.

If verification fails, keep the last known data internally but do not label it current/live. Products should have `last_checked_at` and `verification_state`.

## Security before launch

- real authentication and server-side authorization
- database instead of browser localStorage
- secrets only in environment/secret manager
- 2FA for privileged roles
- encrypted document storage / signed URLs
- audit log
- backups
- rate limiting
- CSRF/session protections where relevant
- privacy policy and retention rules for customer data
- legal/accounting review of payment, PRRO/RRO, commission reporting and offer text before accepting real money
