import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function readJson(name) {
  return JSON.parse(await readFile(path.join(ROOT, name), 'utf8'));
}

export async function getCatalogContext() {
  const [feed, config] = await Promise.all([readJson('products-feed.json'), readJson('deal-config.json')]);
  return { feed, config };
}

function billableWeightKg(p) {
  return Math.max(Number(p.weight || 0), Number(p.volumetricWeightKg || 0), 0.1);
}

function shippingUsd(config, weightKg) {
  const s = config.shipping || {};
  const weight = Math.max(0.1, Number(weightKg || 0.5));
  return Number(s.baseUsd || 0) + Math.max(0, weight - 0.5) * Number(s.extraPerKgUsd || 0);
}

function serviceFeeUsd(config, sourceUsd) {
  const f = config.serviceFee || {};
  if (f.type === 'percent_with_minimum') {
    return Math.max(Number(f.minimumUsd || 0), Number(sourceUsd || 0) * Number(f.percent || 0) / 100);
  }
  if (f.type === 'percent') return Number(sourceUsd || 0) * Number(f.valueUsd || 0);
  return Number(f.valueUsd || 0);
}

function normalizeProduct(p, feed, config) {
  const weight = billableWeightKg(p);
  const productUsd = Number(p.priceUsd || 0);
  const deliveryUsd = shippingUsd(config, weight);
  const serviceUsd = serviceFeeUsd(config, productUsd);
  const images = [...new Set([p.image, ...(Array.isArray(p.images) ? p.images : [])].filter(Boolean))];
  return {
    ...p,
    id: Number(p.id),
    source: p.source || feed.sourceKey || 'amazon-us',
    image: images[0] || '',
    images,
    rating: Number(p.rating || 0),
    reviews: Number(p.reviews || 0),
    priceUsd: productUsd,
    listPriceUsd: Number(p.listPriceUsd || productUsd),
    discount: Number(p.discount || 0),
    weight: Number(p.weight || 0),
    volumetricWeightKg: Number(p.volumetricWeightKg || 0),
    billableWeightKg: weight,
    productEur: productUsd / Number(config.customs?.defaultEurUsdRate || 1.17),
    deliveredPriceUah: Math.round((productUsd + deliveryUsd + serviceUsd) * Number(config.defaultUsdUahRate || 42)),
    breakdown: { productUsd, shippingUsd: deliveryUsd, serviceUsd }
  };
}

export function passesSelection(p, config) {
  if (p.discount < Number(config.minDiscount || 0)) return false;
  if (p.rating < Number(config.minRating || 0)) return false;
  if (p.reviews < Number(config.minReviews || 0)) return false;
  if (p.billableWeightKg > Number(config.maxWeightKg || 999)) return false;
  if (p.priceUsd > Number(config.maxPriceUsd || 999999)) return false;
  if (p.productEur > Number(config.customs?.recommendedMaxEur || 145)) return false;
  if (p.restrictedShipping === true || p.hazmat === true || p.shippingAllowed === false) return false;
  if (config.hideExpiredDeals && p.dealExpired === true) return false;
  if (p.dealVerified === false) return false;
  return true;
}

export async function searchCatalog({ q = '', cat = 'all', source = 'all', limit = 60 } = {}) {
  const { feed, config } = await getCatalogContext();
  let products = (feed.products || []).map(p => normalizeProduct(p, feed, config)).filter(p => passesSelection(p, config));
  const query = String(q || '').trim().toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);

  if (tokens.length) {
    products = products.filter(p => {
      const hay = [p.brand, p.name, p.asin, p.sku, p.desc, ...(p.features || [])].filter(Boolean).join(' ').toLowerCase();
      return tokens.every(token => hay.includes(token));
    });
  }
  if (cat && cat !== 'all') products = products.filter(p => p.cat === cat);
  if (source && source !== 'all') products = products.filter(p => p.source === source);

  products.sort((a, b) => b.discount - a.discount || b.reviews - a.reviews);
  return {
    source: feed.sourceKey || 'amazon-us',
    generatedAt: feed.generatedAt || null,
    live: Boolean(feed.live),
    products: products.slice(0, Math.min(100, Math.max(1, Number(limit) || 60)))
  };
}

export async function getProductById(id) {
  const { feed, config } = await getCatalogContext();
  const p = (feed.products || []).find(x => Number(x.id) === Number(id));
  if (!p) return null;
  const normalized = normalizeProduct(p, feed, config);
  return passesSelection(normalized, config) ? normalized : null;
}

export async function buildOrderFromItems(items) {
  const { config } = await getCatalogContext();
  const snapshots = [];
  let goodsUsd = 0;
  let shipping = 0;
  let service = 0;

  for (const item of items) {
    const product = await getProductById(item.id);
    if (!product) throw new Error(`product_unavailable:${item.id}`);
    const qty = Math.max(1, Math.min(20, Number(item.qty) || 1));
    goodsUsd += product.breakdown.productUsd * qty;
    shipping += product.breakdown.shippingUsd * qty;
    service += product.breakdown.serviceUsd * qty;
    snapshots.push({
      productId: product.id,
      source: product.source,
      asin: product.asin || '',
      sku: product.sku || '',
      brand: product.brand || '',
      name: product.name || '',
      qty,
      image: product.image || '',
      sourceUrl: product.sourceUrl || '',
      sourcePriceUsd: product.priceUsd,
      listPriceUsd: product.listPriceUsd,
      discount: product.discount,
      rating: product.rating,
      reviews: product.reviews,
      billableWeightKg: product.billableWeightKg,
      deliveredUnitUah: product.deliveredPriceUah,
      goodsValueEur: product.productEur,
      lastCheckedAt: product.lastCheckedAt || null
    });
  }

  const rate = Number(config.defaultUsdUahRate || 42);
  const goodsEur = goodsUsd / Number(config.customs?.defaultEurUsdRate || 1.17);
  const financials = {
    productUsd: Number(goodsUsd.toFixed(2)),
    shippingUsd: Number(shipping.toFixed(2)),
    serviceUsd: Number(service.toFixed(2)),
    totalUsd: Number((goodsUsd + shipping + service).toFixed(2)),
    productUah: Math.round(goodsUsd * rate),
    shippingUah: Math.round(shipping * rate),
    serviceUah: Math.round(service * rate),
    totalUah: Math.round((goodsUsd + shipping + service) * rate),
    executionFundsUah: Math.round((goodsUsd + shipping) * rate)
  };

  return { snapshots, financials, goodsEur, customsLimitEur: Number(config.customs?.limitEur || 150) };
}
