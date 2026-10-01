# Marketplace Search Layer

Positioning: **Поисковик выгодных товаров США для украинцев**.

The frontend is intentionally marketplace-agnostic. Today the verified snapshot is Amazon US. Later the same search/result UI can receive products from Walmart, eBay, Target, Best Buy or another approved US source without rewriting the cart, product page or operations model.

## Current behavior

- `deal-config.json -> discovery.enabled` is `false` until a real server endpoint is deployed.
- Search falls back to the verified local snapshot.
- No marketplace API credentials belong in browser JavaScript.
- Product prices from a manual snapshot must never be described as continuously live.
- Before purchase through our service, price and availability are confirmed again.

## Backend endpoint

Expected endpoint:

`GET /api/search?q=<query>&cat=<optional-category>`

Example response:

```json
{
  "source": "amazon-us",
  "generatedAt": "2026-10-01T18:00:00Z",
  "products": [
    {
      "id": 123456789,
      "source": "amazon-us",
      "asin": "B000000000",
      "brand": "Brand",
      "name": "Product name",
      "cat": "home",
      "image": "https://...",
      "images": ["https://..."],
      "priceUsd": 29.99,
      "listPriceUsd": 49.99,
      "discount": 40,
      "rating": 4.7,
      "reviews": 12000,
      "weight": 0.6,
      "volumetricWeightKg": 0.8,
      "sourceUrl": "https://...",
      "affiliateUrl": "https://...",
      "shippingAllowed": true,
      "restrictedShipping": false,
      "hazmat": false,
      "dealVerified": true,
      "dealExpired": false,
      "returnRisk": "low",
      "lastCheckedAt": "2026-10-01T18:00:00Z",
      "desc": "...",
      "features": ["..."]
    }
  ]
}
```

## Server responsibilities

1. Query an approved marketplace data source.
2. Normalize all sources into the common product shape above.
3. Calculate or fetch actual / volumetric weight when available.
4. Apply source-specific shipping restrictions and hazardous-goods rules.
5. Keep price timestamps and price history.
6. Never expose API secrets to the browser.
7. Return only data that may legally be displayed under the provider agreement.
8. Keep source attribution per product.
9. Preserve historical order snapshots even when a product later disappears.

## Our selection layer

The frontend applies the current baseline filter from `deal-config.json`:

- discount >= 35%
- rating >= 4.5
- reviews >= 1,000
- source price <= $100
- billable weight <= 2 kg
- product value below the configured customs buffer
- no restricted shipping / hazmat / failed verification

The commercial preference layer should rank compact low-risk products higher: no sizing, no model-specific compatibility, no battery, non-fragile, preferably under 1 kg and $15-80.

## Product identity

Each result must retain marketplace identity (`source`, ASIN/SKU/source URL). Orders additionally store a complete product snapshot at checkout so later price or catalog changes cannot alter historical order data.

## Planned sources

1. Amazon US
2. Walmart US
3. eBay US
4. Target US
5. Best Buy US

A new source should be implemented as a backend adapter, not as source-specific frontend pages.
