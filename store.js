let STORE_PRODUCTS=[];
let STORE_CONFIG=null;
let STORE_META={source:'unknown',live:false,generatedAt:null};

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
function customsLimitEur(){return Number(STORE_CONFIG?.customs?.limitEur||150)}
function customsRecommendedEur(){return Number(STORE_CONFIG?.customs?.recommendedMaxEur||145)}
function cartGoodsEur(cart=getCart()){
  return cart.reduce((sum,x)=>{const p=getProduct(x.id);return sum+(p?priceBreakdown(p).productEur*x.qty:0)},0);
}
function customsState(valueEur=cartGoodsEur()){
  const limit=customsLimitEur(),recommended=customsRecommendedEur();
  return {valueEur,limit,recommended,over:valueEur>limit,near:valueEur>recommended&&valueEur<=limit,ok:valueEur<=recommended};
}
function normalizeProduct(p){
  const weight=Number(p.weight||0),volumetricWeightKg=Number(p.volumetricWeightKg||0);
  const price=Number(p.price ?? (p.priceUsd!=null?calcDeliveredUah(p.priceUsd,Math.max(weight,volumetricWeightKg,.1)):0));
  const old=Number(p.old ?? (p.listPriceUsd!=null?calcDeliveredUah(p.listPriceUsd,Math.max(weight,volumetricWeightKg,.1)):price));
  const discount=Number(p.discount ?? (old>0?Math.round((1-price/old)*100):0));
  return {...p,id:Number(p.id),price,old,discount,reviews:Number(p.reviews||0),rating:Number(p.rating||0),weight,volumetricWeightKg};
}
function passesSelection(p){
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
async function loadStore(){
  try{
    const [feedRes,configRes]=await Promise.all([fetch('products-feed.json',{cache:'no-store'}),fetch('deal-config.json',{cache:'no-store'})]);
    if(configRes.ok) STORE_CONFIG=await configRes.json();
    if(!feedRes.ok) throw new Error('Product feed unavailable');
    const feed=await feedRes.json();
    const normalized=(feed.products||[]).map(normalizeProduct);
    STORE_PRODUCTS=normalized.filter(passesSelection);
    STORE_META={source:feed.source||'feed',live:Boolean(feed.live),generatedAt:feed.generatedAt||null};
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