# HAPAI SALE: launch gates and 16-part implementation plan

Status: IN PROGRESS, not Amazon-ready. Public website and production integrations must be independently verified.

## Product positioning
Search-first shopping discovery for Ukraine. User can search any product supported by licensed source APIs, discover verified deals, compare source-market prices and choose direct merchant purchase. Assisted buying is strictly optional and subject to a separate legal and Amazon-program review.

## Sixteen workstreams
1. Principles: search-first, transparent, user-choice, licensed sources.
2. Competitor benchmarks: Slickdeals, Keepa, CamelCamelCamel, idealo, Hotline, Google Shopping; do not copy protected content.
3. Navigation map: home/search/deals/categories/brands/products/stores/guides/favorites/alerts/assistance/legal.
4. Public route structure, SEO index/noindex rules and sitemap.
5. Home: global search, verified deal ranking, fresh feed, categories, editorial guides.
6. Product: authorized images (up to 5), product identity, verified reference/current prices, source, freshness, outbound link, optional assistance.
7. Value score: verified savings, comparison, delivery feasibility, trust, freshness; no fabricated reference prices.
8. Categories: broad discovery; editorial top deals may be more selective than search.
9. Source adapters: Amazon regions then Walmart/eBay/Target/Best Buy/others only when licensed and permitted.
10. Jobs: three editorial refreshes (08:00,13:00,19:00 Europe/Kyiv); source-specific content freshness separately enforced.
11. SEO: unique localized URLs, useful copy, canonical/hreflang, Product/Offer only for reliable eligible data, indexability gates, no thin pages.
12. Optional assisted purchasing: distinct from Amazon Associates; obtain legal/program review before enabling Amazon purchase-on-behalf.
13. Admin: server authentication, RBAC, audit, moderation, catalog, SEO, growth, finance, logistics.
14. Production audit: current static prototype, snapshot search, scaffold backend, social connectors not connected; verify Render/DNS.
15. Mandatory fixes: fail closed on unverified offers, enforce content rights, block stale pricing/discount labels, ensure runtime enforcement and tests. Config was set true on 2026-10-08 but code must still enforce it.
16. Rollout: backend+database, approved live source, search, SEO, compliance QA, permitted publications, optional payment flow, then Amazon Associates application.

## Acceptance tests before registration
- Public HTTPS and responsive navigation work, legal/contact/disclosure pages complete.
- Search does not falsely claim live Amazon-wide results from a local snapshot.
- Missing/stale source rights or price provenance block deal badges and automated publication.
- Affiliate disclosures and outbound links satisfy current official country-specific terms.
- Social and email uses independently permitted assets/links.
- No Amazon affiliate program content is reused for unauthorized merchant aggregation or managed purchase.
- Checkout/payment stays disabled until lawful payment processing, fiscal, refund, privacy and security reviews pass.
- Admin credentials are server-side; no localStorage prototype is described as secure production.
- Structured data mirrors visible current content; canonical/hreflang/sitemap tested.
- Confirm source-specific cache limits and price timestamp requirements against official documents.
- Manual sign-off and recorded review dates for each source and channel.

## Implementation note
A complete live Amazon search, real payments, and production social publishing cannot be honestly marked done by repository scaffolding. They require provider approval/credentials, deployment and end-to-end testing. Never fabricate approval or offer data.
