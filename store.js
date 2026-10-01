const STORE_PRODUCTS=[
{id:1,cat:'electronics',brand:'Sony',name:'WH-1000XM5 Wireless Headphones',emoji:'🎧',price:12490,old:21490,discount:42,rating:4.7,reviews:12400,weight:.9,sku:'SONY-XM5',desc:'Флагманские беспроводные наушники с активным шумоподавлением, комфортной посадкой и длительной автономностью.',features:['Активное шумоподавление','До 30 часов работы','Bluetooth multipoint','Быстрая зарядка']},
{id:2,cat:'kids',brand:'LEGO',name:'Creator 3-in-1 Deep Sea Creatures',emoji:'🧱',price:1790,old:2990,discount:40,rating:4.8,reviews:8200,weight:.6,sku:'LEGO-31088',desc:'Набор LEGO Creator 3-в-1 для детей: несколько вариантов сборки в одной коробке.',features:['3 модели в 1 наборе','Развивает моторику','Оригинальный LEGO','Подарочная упаковка']},
{id:3,cat:'home',brand:'Philips',name:'Airfryer Compact Essential',emoji:'🍟',price:3490,old:5290,discount:34,rating:4.6,reviews:9700,weight:2.1,sku:'PHIL-AF',desc:'Компактный аэрогриль для приготовления с меньшим количеством масла.',features:['Компактный корпус','Простое управление','Съёмная корзина','Лёгкая очистка']},
{id:4,cat:'beauty',brand:'CeraVe',name:'Hydrating Skin Care Set',emoji:'🧴',price:1290,old:1990,discount:35,rating:4.8,reviews:18300,weight:.7,sku:'CERAVE-SET',desc:'Набор базового ухода CeraVe для ежедневного очищения и увлажнения кожи.',features:['Для ежедневного ухода','С церамидами','Без резкого аромата','Популярный бренд США']},
{id:5,cat:'auto',brand:'Anker',name:'Compact Car Charger 67W',emoji:'🚗',price:990,old:1590,discount:38,rating:4.7,reviews:6700,weight:.2,sku:'ANKER-67W',desc:'Компактное автомобильное зарядное устройство высокой мощности.',features:['До 67W','USB-C','Компактный размер','Защита от перегрева']},
{id:6,cat:'electronics',brand:'JBL',name:'Flip 6 Portable Bluetooth Speaker',emoji:'🔊',price:2790,old:4490,discount:38,rating:4.7,reviews:14200,weight:.8,sku:'JBL-FLIP6',desc:'Портативная Bluetooth-колонка JBL с мощным звуком и защитой для поездок.',features:['Защита от воды','До 12 часов работы','Bluetooth','Компактный корпус']},
{id:7,cat:'kids',brand:'Fisher-Price',name:'Baby Learning Toy Set',emoji:'🧸',price:1490,old:2390,discount:38,rating:4.8,reviews:5100,weight:.9,sku:'FP-LEARN',desc:'Развивающий набор Fisher-Price для малышей с яркими безопасными элементами.',features:['Для раннего развития','Безопасные материалы','Яркие элементы','Подарочный вариант']},
{id:8,cat:'home',brand:'Shark',name:'Handheld Cordless Vacuum',emoji:'🧹',price:4290,old:6490,discount:34,rating:4.5,reviews:7800,weight:1.8,sku:'SHARK-HV',desc:'Компактный беспроводной пылесос для быстрой уборки дома и автомобиля.',features:['Беспроводной','Компактный','Насадки в комплекте','Для дома и авто']}
];
function getProduct(id){return STORE_PRODUCTS.find(p=>p.id===Number(id))||STORE_PRODUCTS[0]}
function getCart(){try{return JSON.parse(localStorage.getItem('amazonUkCart'))||[]}catch(e){return[]}}
function saveCart(cart){localStorage.setItem('amazonUkCart',JSON.stringify(cart));window.dispatchEvent(new Event('cartchange'))}
function addToCart(id,qty=1){const cart=getCart(), item=cart.find(x=>x.id===Number(id)); if(item)item.qty+=qty; else cart.push({id:Number(id),qty}); saveCart(cart);return cart}
function setQty(id,qty){let cart=getCart(); const item=cart.find(x=>x.id===Number(id)); if(!item)return; item.qty=Math.max(0,Number(qty)||0); cart=cart.filter(x=>x.qty>0); saveCart(cart)}
function removeFromCart(id){saveCart(getCart().filter(x=>x.id!==Number(id)))}
function cartCount(){return getCart().reduce((s,x)=>s+x.qty,0)}
function cartTotal(){return getCart().reduce((s,x)=>{const p=getProduct(x.id);return s+p.price*x.qty},0)}
function formatUah(v){return Math.round(v).toLocaleString('ru-RU')+' ₴'}
function syncCartBadges(){document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=cartCount())}
window.addEventListener('cartchange',syncCartBadges);document.addEventListener('DOMContentLoaded',syncCartBadges);