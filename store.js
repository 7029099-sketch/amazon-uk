let STORE_PRODUCTS=[];
let STORE_CONFIG=null;
let STORE_META={source:'unknown',live:false,generatedAt:null};

function calcDeliveredUah(priceUsd,weightKg=0.5,config=STORE_CONFIG){
  const c=config||{defaultUsdUahRate:42,shipping:{baseUsd:6.9,extraPerKgUsd:4.1},serviceFee:{type:'fixed',valueUsd:7}};
  const weight=Math.max(.1,Number(weightKg)||.5);
  const shipping=c.shipping.baseUsd+Math.max(0,weight-.5)*c.shipping.extraPerKgUsd;
  const fee=c.serviceFee.type==='percent'?Number(priceUsd)*c.serviceFee.valueUsd:Number(c.serviceFee.valueUsd||0);
  return Math.round((Number(priceUsd)+shipping+fee)*Number(c.defaultUsdUahRate||42));
}

function normalizeProduct(p){
  const price=Number(p.price ?? (p.priceUsd!=null?calcDeliveredUah(p.priceUsd,p.weight):0));
  const old=Number(p.old ?? (p.listPriceUsd!=null?calcDeliveredUah(p.listPriceUsd,p.weight):price));
  const discount=Number(p.discount ?? (old>0?Math.round((1-price/old)*100):0));
  return {...p,id:Number(p.id),price,old,discount,reviews:Number(p.reviews||0),rating:Number(p.rating||0),weight:Number(p.weight||0)};
}

async function loadStore(){
  try{
    const [feedRes,configRes]=await Promise.all([
      fetch('products-feed.json',{cache:'no-store'}),
      fetch('deal-config.json',{cache:'no-store'})
    ]);
    if(configRes.ok) STORE_CONFIG=await configRes.json();
    if(!feedRes.ok) throw new Error('Product feed unavailable');
    const feed=await feedRes.json();
    STORE_PRODUCTS=(feed.products||[]).map(normalizeProduct);
    STORE_META={source:feed.source||'feed',live:Boolean(feed.live),generatedAt:feed.generatedAt||null};
    window.dispatchEvent(new CustomEvent('productsloaded',{detail:STORE_META}));
    return STORE_PRODUCTS;
  }catch(err){
    console.error('Store feed error:',err);
    STORE_PRODUCTS=[];
    window.dispatchEvent(new CustomEvent('productsloaded',{detail:{source:'error',live:false,error:true}}));
    return STORE_PRODUCTS;
  }
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
function syncCartBadges(){document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=cartCount())}
window.addEventListener('cartchange',syncCartBadges);document.addEventListener('DOMContentLoaded',syncCartBadges);