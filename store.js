let STORE_PRODUCTS=[];
let STORE_CONFIG=null;
let STORE_META={source:'unknown',live:false,generatedAt:null};
let STORE_SEARCH_META={mode:'snapshot',source:'local',query:'',error:null};
const COMMISSION_TERMS_VERSION='2026-10-01-v1';
const DISCOVERED_SESSION_KEY='amazonUkDiscoveredProducts';

function usdRate(){return Number(STORE_CONFIG?.defaultUsdUahRate||42)}
function eurUsdRate(){return Number(STORE_CONFIG?.customs?.defaultEurUsdRate||1.17)}
function billableWeightKg(p){return Math.max(Number(p?.weight||0),Number(p?.volumetricWeightKg||0),.1)}
function shippingUsd(weightKg=.5){
  const s=STORE_CONFIG?.shipping||{baseUsd:6.9,extraPerKgUsd:4.1};
  const weight=Math.max(.1,Number(weightKg)||.5);
  return Number(s.baseUsd||0)+Math.max(0,weight-.5)*Number(s.extraPerKgUsd||0);
}
function serviceFeeUsd(sourceUsd){
  const f=STORE_CONFIG?.serviceFee||{type:'fixed',valueUsd:7};
  if(f.type==='percent_with_minimum') return Math.max(Number(f.minimumUsd||0),Number(sourceUsd||0)*Number(f.percent||0)/100);
  if(f.type==='percent') return Number(sourceUsd||0)*Number(f.valueUsd||0);
  return Number(f.valueUsd||0);
}
function calcDeliveredUah(priceUsd,weightKg=.5){
  const source=Number(priceUsd)||0;
  return Math.round((source+shippingUsd(weightKg)+serviceFeeUsd(source))*usdRate());
}
function sourceValueUsd(p){
  if(p?.priceUsd!=null) return Number(p.priceUsd)||0;
  const totalUsd=(Number(p?.price)||0)/usdRate();
  const ship=shippingUsd(billableWeightKg(p));
  let source=Math.max(0,totalUsd-ship-serviceFeeUsd(Math.max(0,totalUsd-ship)));
  for(let i=0;i<5;i++) source=Math.max(0,totalUsd-ship-serviceFeeUsd(source));
  return source;
}
function priceBreakdown(p){
  const productUsd=sourceValueUsd(p);
  const shipping=shippingUsd(billableWeightKg(p));
  const service=serviceFeeUsd(productUsd);
  return {productUsd,shippingUsd:shipping,serviceUsd:service,totalUsd:productUsd+shipping+service,totalUah:Number(p?.price)||Math.round((productUsd+shipping+service)*usdRate()),productEur:productUsd/eurUsdRate(),billableWeightKg:billableWeightKg(p)};
}
function cartFinancialBreakdown(cart=getCart()){
  const result=cart.reduce((acc,x)=>{const p=getProduct(x.id);if(!p)return acc;const b=priceBreakdown(p),q=Number(x.qty)||1;acc.productUsd+=b.productUsd*q;acc.shippingUsd+=b.shippingUsd*q;acc.serviceUsd+=b.serviceUsd*q;acc.totalUah+=(Number(p.price)||Math.round(b.totalUsd*usdRate()))*q;return acc},{productUsd:0,shippingUsd:0,serviceUsd:0,totalUah:0});
  result.productUah=Math.round(result.productUsd*usdRate());
  result.shippingUah=Math.round(result.shippingUsd*usdRate());
  result.serviceUah=Math.round(result.serviceUsd*usdRate());
  result.totalUsd=result.productUsd+result.shippingUsd+result.serviceUsd;
  result.executionFundsUah=result.productUah+result.shippingUah;
  return result;
}
function commissionOrderSnapshot(cart=getCart()){
  return {agreementType:'commission',termsVersion:COMMISSION_TERMS_VERSION,offerUrl:'offer.html',agentActs:'in_own_name_at_principal_expense',financials:cartFinancialBreakdown(cart),priceIncreaseRequiresApproval:true,reportStatus:'pending_execution'};
}
function externalPurchaseUrl(p){return String(p?.affiliateUrl||p?.sourceUrl||'').trim()}
function externalPurchaseRel(p){return p?.affiliateUrl?'sponsored nofollow noopener':'nofollow noopener'}
function customsLimitEur(){return Number(STORE_CONFIG?.customs?.limitEur||150)}
function customsRecommendedEur(){return Number(STORE_CONFIG?.customs?.recommendedMaxEur||145)}
function cartGoodsEur(cart=getCart()){return cart.reduce((sum,x)=>{const p=getProduct(x.id);return sum+(p?priceBreakdown(p).productEur*x.qty:0)},0)}
function customsState(valueEur=cartGoodsEur()){
  const limit=customsLimitEur(),recommended=customsRecommendedEur();
  return {valueEur,limit,recommended,over:valueEur>limit,near:valueEur>recommended&&valueEur<=limit,ok:valueEur<=recommended};
}
function uniqueProductImages(p){
  const list=[p?.image,...(Array.isArray(p?.images)?p.images:[])].filter(Boolean);
  return [...new Set(list)];
}
function stableProductId(p){
  const numeric=Number(p?.id);
  if(Number.isFinite(numeric)&&numeric>0)return numeric;
  const key=String(p?.asin||p?.sku||p?.sourceUrl||p?.name||Math.random());
  let hash=2166136261;
  for(let i=0;i<key.length;i++){hash^=key.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return 100000000+Math.abs(hash>>>0)%899999999;
}
function marketplaceKey(p){return String(p?.source||p?.marketplace||STORE_CONFIG?.source||'amazon-us')}
function marketplaceLabel(p){const key=marketplaceKey(p);return STORE_CONFIG?.sourceLabels?.[key]||key.replace(/-us$/,'').replace(/^./,s=>s.toUpperCase())}
function normalizeProduct(p){
  const weight=Number(p.weight||0),volumetricWeightKg=Number(p.volumetricWeightKg||0);
  const price=Number(p.price ?? (p.priceUsd!=null?calcDeliveredUah(p.priceUsd,Math.max(weight,volumetricWeightKg,.1)):0));
  const old=Number(p.old ?? (p.listPriceUsd!=null?calcDeliveredUah(p.listPriceUsd,Math.max(weight,volumetricWeightKg,.1)):price));
  const discount=Number(p.discount ?? (old>0?Math.round((1-price/old)*100):0));
  const images=uniqueProductImages(p);
  const source=marketplaceKey(p);
  return {...p,id:stableProductId(p),price,old,discount,reviews:Number(p.reviews||0),rating:Number(p.rating||0),weight,volumetricWeightKg,image:images[0]||'',images,source,marketplace:source};
}
function passesSelection(p){
  // Public product claims require current licensed evidence, not old manually entered snapshots.
  const rights=p.compliance||{};
  if(rights.contentRightsStatus!=='approved'||rights.sourceTermsReviewed!==true)return false;
  if(p.dealVerified!==true||!p.lastCheckedAt)return false;
  const checked=Date.parse(p.lastCheckedAt);
  if(!Number.isFinite(checked)||Date.now()-checked>12*60*60*1000)return false;
  const c=STORE_CONFIG||{},maxWeight=Number(c.maxWeightKg||999);
  if(p.discount<Number(c.minDiscount||0)) return false;
  if(p.rating<Number(c.minRating||0)) return false;
  if(p.reviews<Number(c.minReviews||0)) return false;
  if(billableWeightKg(p)>maxWeight) return false;
  if(p.priceUsd!=null&&Number(p.priceUsd)>Number(c.maxPriceUsd||999999)) return false;
  if(priceBreakdown(p).productEur>customsRecommendedEur()) return false;
  if(p.restrictedShipping===true||p.hazmat===true||p.shippingAllowed===false) return false;
  if(c.hideExpiredDeals&&p.dealExpired===true) return false;
  if(p.dealVerified===false) return false;
  return true;
}
function productOrderSnapshot(p,qty=1){
  const b=priceBreakdown(p),q=Math.max(1,Number(qty)||1);
  return {id:p.id,asin:p.asin||'',sku:p.sku||'',brand:p.brand||'',name:p.name||'',qty:q,image:p.image||'',source:p.source||'',sourceName:marketplaceLabel(p),sourceUrl:p.sourceUrl||'',affiliateUrl:p.affiliateUrl||'',sourcePriceUsd:Number(p.priceUsd||b.productUsd),listPriceUsd:Number(p.listPriceUsd||0),discount:Number(p.discount||0),rating:Number(p.rating||0),reviews:Number(p.reviews||0),weightKg:Number(p.weight||0),billableWeightKg:b.billableWeightKg,deliveredUnitUah:Number(p.price||b.totalUah),goodsValueEur:b.productEur,lastCheckedAt:p.lastCheckedAt||STORE_META.generatedAt||null};
}
function orderItemsSnapshot(cart=getCart()){return cart.map(x=>{const p=getProduct(x.id);return p?productOrderSnapshot(p,x.qty):null}).filter(Boolean)}
function getOrders(){try{return JSON.parse(localStorage.getItem('amazonUkOrders'))||[]}catch(e){return[]}}
function saveOrder(order){const orders=getOrders();orders.unshift(order);localStorage.setItem('amazonUkOrders',JSON.stringify(orders.slice(0,250)));localStorage.setItem('amazonUkLastOrder',JSON.stringify(order));return order}
function formatCheckedDate(value){if(!value)return'не указано';const d=new Date(value);if(Number.isNaN(d.getTime()))return'не указано';return d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function getDiscoveredProducts(){try{return JSON.parse(sessionStorage.getItem(DISCOVERED_SESSION_KEY))||[]}catch(e){return[]}}
function rememberDiscoveredProducts(list){
  if(!Array.isArray(list)||!list.length)return;
  const merged=[...list,...getDiscoveredProducts()].map(normalizeProduct);
  const unique=[];const seen=new Set();
  for(const p of merged){if(seen.has(p.id))continue;seen.add(p.id);unique.push(p)}
  try{sessionStorage.setItem(DISCOVERED_SESSION_KEY,JSON.stringify(unique.slice(0,150)))}catch(e){}
  for(const p of unique){if(!STORE_PRODUCTS.some(x=>x.id===p.id)&&passesSelection(p))STORE_PRODUCTS.push(p)}
}
function localSearchProducts(query){
  const q=String(query||'').trim().toLowerCase();
  if(!q)return [...STORE_PRODUCTS];
  const tokens=q.split(/\s+/).filter(Boolean);
  return STORE_PRODUCTS.filter(p=>{const hay=[p.brand,p.name,p.asin,p.sku,p.desc,marketplaceLabel(p),...(p.features||[])].filter(Boolean).join(' ').toLowerCase();return tokens.every(t=>hay.includes(t))});
}
async function searchMarketplace(query,{category='all'}={}){
  const q=String(query||'').trim();
  const discovery=STORE_CONFIG?.discovery||{};
  const min=Number(discovery.minimumQueryLength||2);
  if(!q||q.length<min){const products=localSearchProducts(q);STORE_SEARCH_META={mode:'snapshot',source:'local',query:q,error:null};return {products,meta:STORE_SEARCH_META}}
  if(discovery.enabled&&discovery.endpoint){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Number(discovery.timeoutMs||7000));
    try{
      const url=new URL(discovery.endpoint,location.origin);url.searchParams.set('q',q);if(category&&category!=='all')url.searchParams.set('cat',category);
      const res=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
      if(!res.ok)throw new Error('Search endpoint '+res.status);
      const payload=await res.json();
      const normalized=(payload.products||[]).map(normalizeProduct).filter(passesSelection);
      rememberDiscoveredProducts(normalized);
      STORE_SEARCH_META={mode:'remote',source:payload.source||'marketplace-search',query:q,error:null,generatedAt:payload.generatedAt||new Date().toISOString()};
      return {products:normalized,meta:STORE_SEARCH_META};
    }catch(err){
      console.warn('Marketplace search fallback:',err);
      const products=localSearchProducts(q);
      STORE_SEARCH_META={mode:'fallback',source:'local',query:q,error:String(err?.message||err)};
      return {products,meta:STORE_SEARCH_META};
    }finally{clearTimeout(timeout)}
  }
  const products=localSearchProducts(q);
  STORE_SEARCH_META={mode:'snapshot',source:'local',query:q,error:null};
  return {products,meta:STORE_SEARCH_META};
}
async function loadStore(){
  try{
    const [feedRes,configRes]=await Promise.all([fetch('products-feed.json',{cache:'no-store'}),fetch('deal-config.json',{cache:'no-store'})]);
    if(configRes.ok) STORE_CONFIG=await configRes.json();
    if(!feedRes.ok) throw new Error('Product feed unavailable');
    const feed=await feedRes.json();
    const feedProducts=(feed.products||[]).map(p=>normalizeProduct({...p,source:p.source||feed.sourceKey||'amazon-us'}));
    const discovered=getDiscoveredProducts().map(normalizeProduct);
    const merged=[...feedProducts,...discovered];const seen=new Set();
    STORE_PRODUCTS=merged.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return passesSelection(p)});
    STORE_META={source:feed.source||'feed',live:Boolean(feed.live),generatedAt:feed.generatedAt||null,mode:STORE_CONFIG?.mode||'verified-snapshot'};
    window.dispatchEvent(new CustomEvent('productsloaded',{detail:STORE_META}));
    return STORE_PRODUCTS;
  }catch(err){console.error('Store feed error:',err);STORE_PRODUCTS=[];window.dispatchEvent(new CustomEvent('productsloaded',{detail:{source:'error',live:false,error:true}}));return STORE_PRODUCTS;}
}
window.storeReady=loadStore();
function getProduct(id){return STORE_PRODUCTS.find(p=>p.id===Number(id))||null}
function getCart(){try{return JSON.parse(localStorage.getItem('amazonUkCart'))||[]}catch(e){return[]}}
function saveCart(cart){localStorage.setItem('amazonUkCart',JSON.stringify(cart));window.dispatchEvent(new Event('cartchange'))}
function addToCart(id,qty=1){const cart=getCart(),item=cart.find(x=>x.id===Number(id));if(item)item.qty+=qty;else cart.push({id:Number(id),qty});saveCart(cart);return cart}
function setQty(id,qty){let cart=getCart();const item=cart.find(x=>x.id===Number(id));if(!item)return;item.qty=Math.max(0,Number(qty)||0);cart=cart.filter(x=>x.qty>0);saveCart(cart)}
function removeFromCart(id){saveCart(getCart().filter(x=>x.id!==Number(id)))}
function cartCount(){return getCart().reduce((s,x)=>s+x.qty,0)}
function cartTotal(){return getCart().reduce((s,x)=>{const p=getProduct(x.id);return s+(p?p.price*x.qty:0)},0)}
function formatUah(v){return Math.round(Number(v)||0).toLocaleString('ru-RU')+' ₴'}
function formatUsd(v){return '$'+Number(v||0).toFixed(2)}
function formatEur(v){return '€'+Number(v||0).toFixed(0)}
function syncCartBadges(){document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=cartCount())}
window.addEventListener('cartchange',syncCartBadges);document.addEventListener('DOMContentLoaded',syncCartBadges);