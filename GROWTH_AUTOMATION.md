# HAPAI SEO & Social automation

The admin Growth Center tracks seven product-level states:

- SEO ready
- Google indexed
- Facebook published
- Instagram published
- Telegram published
- Reels created
- Affiliate link OK

## Intended production flow

1. A product enters the catalog from an approved source.
2. Catalog and compliance checks pass.
3. The SEO worker creates or updates the permanent product URL, title, description, canonical, hreflang, structured Product data and sitemap entry.
4. Google Search Console integration records index/inspection state. A sitemap submission or URL inspection result is not the same as a guarantee of ranking.
5. Social workers create channel-specific copy and media from the same product snapshot.
6. Facebook, Instagram and Telegram publishers enqueue and publish only approved, fresh offers.
7. Reels generation creates a short vertical asset from approved product media and hands it to the social publisher.
8. Affiliate validation checks the country/marketplace tracking link separately from the managed-purchase flow.
9. Publication IDs, timestamps, errors and retries are stored per product and per country.

## Country model

Use one product identity with country-specific publication state. Example dimensions:

`product_id + country + channel + status + external_post_id + published_at + error`

Initial country targets in `growth-config.json` are UA, US, PL and SK. Country routing must control language, currency, marketplace and affiliate tracking ID.

## Safety rules

- Never store OAuth, bot, Meta or marketplace secrets in frontend JavaScript or Git.
- Never publish a product if compliance blocks it, the deal is unverified, or the price snapshot is stale beyond the configured limit.
- Do not call a manual snapshot live.
- Keep Amazon affiliate and managed-purchase flows separate.
- Do not auto-publish the same deal repeatedly. Store external post IDs and a content fingerprint.
- Expired deal pages should remain available for SEO when useful, but current price/availability markup must be updated or removed.
- Google indexing and rich results are observed states, not promises.

## Connections required before automation becomes live

- Google Search Console property and OAuth/server authorization
- Facebook Page publishing authorization
- Instagram professional account linked to the publishing setup
- Telegram bot with channel posting permission
- short-video generation/publishing provider
- Amazon Associates account and country-specific tracking IDs
- deployed backend + database + scheduler/queue

## Prototype behavior

`admin-growth.js` is intentionally local-state only. It gives the admin UI and status model now, while real provider callbacks and backend persistence are not yet connected. `growth-config.json` contains no secrets.
