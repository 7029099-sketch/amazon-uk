const ADMIN_ROLES={
  owner:{name:'Владелец',sections:['dashboard','orders','purchases','warehouse','logistics','products','finance','documents','customers','team','integrations','settings']},
  operator:{name:'Оператор',sections:['dashboard','orders','purchases','warehouse','logistics','customers','documents']},
  buyer:{name:'Закупщик',sections:['dashboard','orders','purchases','products','documents']},
  logistics:{name:'Логист',sections:['dashboard','orders','warehouse','logistics','documents']},
  finance:{name:'Финансы',sections:['dashboard','orders','finance','documents','customers']},
  content:{name:'Контент',sections:['dashboard','products']}
};
const STATUS_LABELS={new:'Новый',paid:'Оплачен',purchased:'Выкуплен',us_warehouse:'На складе США',international:'В пути в Украину',last_mile:'Доставка по Украине',delivered:'Получен',cancelled:'Отменён'};
const STATUS_ORDER=['new','paid','purchased','us_warehouse','international','last_mile','delivered','cancelled'];
let ADMIN_ORDERS=[];
let CURRENT_ROLE=localStorage.getItem('amazonUkAdminRole')||'owner';

function h(value=''){return String(value).replace(/[&<>'"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]))}
function adminMoney(v){return Math.round(Number(v)||0).toLocaleString('ru-RU')+' ₴'}
function adminDate(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function orderMoney(o){const f=o?.commission?.financials||{};return {goods:Number(f.productUah||0),shipping:Number(f.shippingUah||0),commission:Number(f.serviceUah||0),total:Number(f.totalUah||o.total||0)}}
function orderItems(o){
  if(Array.isArray(o.items)&&o.items.length)return o.items;
  return (o.cart||[]).map(x=>{const p=getProduct(x.id);return p?productOrderSnapshot(p,x.qty):{id:x.id,name:'Товар #'+x.id,brand:'',qty:x.qty||1,image:'',sourceUrl:'',asin:''}});
}
function orderStatus(o){return STATUS_LABELS[o.status]?o.status:'new'}
function customerName(o){return [o.customer?.firstName,o.customer?.lastName].filter(Boolean).join(' ')||'Без имени'}
function getStoredOrders(){try{return JSON.parse(localStorage.getItem('amazonUkOrders'))||[]}catch(e){return[]}}
function saveStoredOrders(){localStorage.setItem('amazonUkOrders',JSON.stringify(ADMIN_ORDERS.slice(0,250)))}
function getTeam(){try{const x=JSON.parse(localStorage.getItem('amazonUkAdminUsers'));if(Array.isArray(x)&&x.length)return x}catch(e){}return[{id:'owner',name:'Владелец',email:'owner@local',role:'owner',active:true}]}
function saveTeam(users){localStorage.setItem('amazonUkAdminUsers',JSON.stringify(users))}
function allowed(section){return ADMIN_ROLES[CURRENT_ROLE]?.sections.includes(section)}
function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function emptyRow(cols,text='Пока данных нет'){return `<tr><td colspan="${cols}"><div class="empty-admin">${h(text)}</div></td></tr>`}
function statusPill(status){const s=STATUS_LABELS[status]?status:'new';return `<span class="status-pill ${s}">${STATUS_LABELS[s]}</span>`}

function navigate(section){
  if(!allowed(section))section='dashboard';
  document.querySelectorAll('[data-section-panel]').forEach(x=>x.classList.toggle('active',x.dataset.sectionPanel===section));
  document.querySelectorAll('.admin-nav [data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===section));
  const btn=document.querySelector(`.admin-nav [data-section="${section}"]`);
  setText('sectionTitle',btn?.querySelector('span')?.textContent||'Обзор');
  setText('sectionEyebrow',section==='dashboard'?'Операционный центр':'Amazon UK Ops');
  document.getElementById('adminSide')?.classList.remove('open');
  location.hash=section==='dashboard'?'':'#'+section;
}
function applyRole(){
  localStorage.setItem('amazonUkAdminRole',CURRENT_ROLE);
  document.querySelectorAll('.admin-nav [data-section]').forEach(btn=>{const ok=allowed(btn.dataset.section);btn.style.display=ok?'grid':'none'});
  const current=document.querySelector('.admin-section.active')?.dataset.sectionPanel||'dashboard';
  if(!allowed(current))navigate('dashboard');
  renderTeam();
}

function renderDashboard(){
  const total=ADMIN_ORDERS.reduce((s,o)=>s+orderMoney(o).total,0),commission=ADMIN_ORDERS.reduce((s,o)=>s+orderMoney(o).commission,0),warehouse=ADMIN_ORDERS.filter(o=>orderStatus(o)==='us_warehouse').length;
  const alerts=ADMIN_ORDERS.filter(o=>['new','paid'].includes(orderStatus(o))).length+STORE_PRODUCTS.filter(p=>!p.lastCheckedAt).length;
  setText('statOrders',ADMIN_ORDERS.length);setText('statRevenue',adminMoney(total));setText('statCommission',adminMoney(commission));setText('statWarehouse',warehouse);setText('statProducts',STORE_PRODUCTS.length);setText('statAlerts',alerts);setText('navOrderCount',ADMIN_ORDERS.length);
  const pipeline=document.getElementById('pipeline');if(pipeline)pipeline.innerHTML=['new','purchased','us_warehouse','international','last_mile','delivered'].map(s=>`<div class="pipeline-item"><b>${ADMIN_ORDERS.filter(o=>orderStatus(o)===s).length}</b><span>${STATUS_LABELS[s]}</span></div>`).join('');
  const tasks=[];
  const newOrders=ADMIN_ORDERS.filter(o=>orderStatus(o)==='new').length;if(newOrders)tasks.push(['●','Проверить новые заказы',newOrders+' шт.','сейчас']);
  const toBuy=ADMIN_ORDERS.filter(o=>orderStatus(o)==='paid').length;if(toBuy)tasks.push(['$','Выкупить на Amazon',toBuy+' заказов','выкуп']);
  const atWarehouse=ADMIN_ORDERS.filter(o=>orderStatus(o)==='us_warehouse').length;if(atWarehouse)tasks.push(['▤','Решить по консолидации',atWarehouse+' заказов','склад']);
  const stale=STORE_PRODUCTS.filter(p=>{const t=new Date(p.lastCheckedAt||STORE_META.generatedAt||0).getTime();return t&&Date.now()-t>24*3600*1000}).length;if(stale)tasks.push(['↻','Перепроверить карточки',stale+' товаров','каталог']);
  if(!tasks.length)tasks.push(['✓','Срочных действий нет','Очередь чистая','готово']);
  const taskList=document.getElementById('taskList');if(taskList)taskList.innerHTML=tasks.map(t=>`<div class="task"><div class="task-icon">${t[0]}</div><div><b>${t[1]}</b><span>${t[2]}</span></div><em>${t[3]}</em></div>`).join('');
  renderOrderRows(document.getElementById('recentOrdersBody'),ADMIN_ORDERS.slice(0,6),false);
}

function renderOrderRows(body,list,withAction=true){
  if(!body)return;
  if(!list.length){body.innerHTML=emptyRow(withAction?8:6,'Заказов пока нет. Оформи тестовый заказ на сайте, и он появится здесь.');return}
  body.innerHTML=list.map(o=>{const m=orderMoney(o),items=orderItems(o),date=o.created||o.createdAt;return `<tr><td><button class="order-link" data-order="${h(o.no)}">${h(o.no)}</button></td><td><b>${h(customerName(o))}</b><div class="muted-admin">${h(o.customer?.phone||'')}</div></td>${withAction?`<td>${items.length} поз.</td><td>${adminMoney(m.total)}</td><td>${adminMoney(m.commission)}</td>`:`<td>${adminMoney(m.total)}</td><td>${items.reduce((s,x)=>s+Number(x.qty||1),0)} шт.</td>`}<td>${statusPill(orderStatus(o))}</td><td>${adminDate(date)}</td>${withAction?`<td><button class="mini-action" data-order="${h(o.no)}">Открыть</button></td>`:''}</tr>`}).join('');
  body.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>openOrder(b.dataset.order));
}
function renderOrders(){
  const q=(document.getElementById('orderSearch')?.value||'').trim().toLowerCase(),status=document.getElementById('orderStatusFilter')?.value||'all';
  let list=[...ADMIN_ORDERS];
  if(status!=='all')list=list.filter(o=>orderStatus(o)===status);
  if(q)list=list.filter(o=>{const hay=[o.no,customerName(o),o.customer?.phone,o.customer?.email,...orderItems(o).map(x=>x.brand+' '+x.name+' '+x.asin)].join(' ').toLowerCase();return hay.includes(q)});
  renderOrderRows(document.getElementById('ordersBody'),list,true);
}
function renderPurchases(){
  const body=document.getElementById('purchasesBody');if(!body)return;
  const rows=ADMIN_ORDERS.flatMap(o=>orderItems(o).map(i=>({o,i})));
  if(!rows.length){body.innerHTML=emptyRow(7);return}
  body.innerHTML=rows.map(({o,i})=>{const p=o.purchase||{};return `<tr><td><button class="order-link" data-order="${h(o.no)}">${h(o.no)}</button></td><td><div class="product-cell">${i.image?`<img src="${h(i.image)}" alt="">`:''}<div><b>${h(i.brand+' '+i.name)}</b><span>${h(i.asin||i.sku||'')}</span></div></div></td><td>${i.sourceUrl?`<a class="order-link" href="${h(i.sourceUrl)}" target="_blank" rel="noopener">Открыть ↗</a>`:'—'}</td><td>${i.sourcePriceUsd!=null?'$'+Number(i.sourcePriceUsd).toFixed(2):'—'}</td><td>${h(p.amazonOrderId||'—')}</td><td>${p.invoiceUrl?`<a class="order-link" href="${h(p.invoiceUrl)}" target="_blank" rel="noopener">Открыть</a>`:'не загружен'}</td><td>${statusPill(orderStatus(o))}</td></tr>`}).join('');
  body.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>openOrder(b.dataset.order));
}
function renderWarehouse(){
  const box=document.getElementById('warehouseBoard');if(!box)return;
  const groups=[{title:'Ожидаем на складе',statuses:['paid','purchased'],hint:'Amazon → US warehouse'},{title:'На складе / консолидация',statuses:['us_warehouse'],hint:'вес, размеры, package ID'},{title:'Передано перевозчику',statuses:['international','last_mile','delivered'],hint:'international tracking'}];
  box.innerHTML=groups.map(g=>{const list=ADMIN_ORDERS.filter(o=>g.statuses.includes(orderStatus(o)));return `<section class="warehouse-col"><h3>${g.title}</h3><div class="muted-admin">${g.hint}</div>${list.length?list.map(o=>`<div class="warehouse-card"><b>${h(o.no)} · ${h(customerName(o))}</b><span>${orderItems(o).length} поз. · package: ${h(o.warehouse?.packageId||'ещё нет')}<br>Вес: ${o.warehouse?.measuredWeightKg?Number(o.warehouse.measuredWeightKg).toFixed(2)+' кг':'ожидается'}</span><button class="mini-action" data-order="${h(o.no)}" style="margin-top:8px">Открыть</button></div>`).join(''):'<div class="empty-admin">Пусто</div>'}</section>`}).join('');
  box.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>openOrder(b.dataset.order));
}
function renderLogistics(){
  const body=document.getElementById('logisticsBody');if(!body)return;
  if(!ADMIN_ORDERS.length){body.innerHTML=emptyRow(6);return}
  body.innerHTML=ADMIN_ORDERS.map(o=>{const s=o.shipping||{},w=o.warehouse||{};return `<tr><td><button class="order-link" data-order="${h(o.no)}">${h(o.no)}</button></td><td>${h(s.internationalTracking||'—')}</td><td>${w.measuredWeightKg?Number(w.measuredWeightKg).toFixed(2)+' кг':'—'}</td><td>${h(s.carrier||'—')}</td><td>${h(s.ukTracking||'—')}<div class="muted-admin">${h(s.lastMileCarrier||'')}</div></td><td>${statusPill(orderStatus(o))}</td></tr>`}).join('');
  body.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>openOrder(b.dataset.order));
}
function renderProducts(){
  const health=document.getElementById('catalogHealth');if(health){const checked=STORE_PRODUCTS.filter(p=>p.dealVerified!==false).length;health.innerHTML=`<span class="health-chip good">✓ ${checked} проверено</span><span class="health-chip">Скидка ≥ ${STORE_CONFIG?.minDiscount||35}%</span><span class="health-chip">Рейтинг ≥ ${STORE_CONFIG?.minRating||4.5}</span><span class="health-chip">Отзывы ≥ ${(STORE_CONFIG?.minReviews||1000).toLocaleString('ru-RU')}</span><span class="health-chip">Вес ≤ ${STORE_CONFIG?.maxWeightKg||2} кг</span><span class="health-chip">Стоимость товара ≤ €${customsRecommendedEur()}</span>`}
  const body=document.getElementById('productsBody');if(!body)return;if(!STORE_PRODUCTS.length){body.innerHTML=emptyRow(8,'Нет товаров, которые проходят текущий фильтр.');return}
  body.innerHTML=STORE_PRODUCTS.map(p=>`<tr><td><div class="product-cell"><img src="${h(p.image)}" alt=""><div><b>${h(p.brand+' '+p.name)}</b><span>${h(p.cat||'')}</span></div></div></td><td>${h(p.asin||'—')}</td><td><del class="muted-admin">${p.listPriceUsd?'$'+Number(p.listPriceUsd).toFixed(2):''}</del> <b>$${Number(p.priceUsd||0).toFixed(2)}</b></td><td><b>−${p.discount}%</b></td><td>★ ${p.rating}<div class="muted-admin">${p.reviews.toLocaleString('ru-RU')} отзывов</div></td><td>${billableWeightKg(p).toFixed(2)} кг</td><td>${p.returnRisk==='low'?'<span class="status-pill delivered">низкий</span>':h(p.returnRisk||'—')}</td><td>${formatCheckedDate(p.lastCheckedAt||STORE_META.generatedAt)}</td></tr>`).join('');
}
function renderFinance(){
  const sums=ADMIN_ORDERS.reduce((a,o)=>{const m=orderMoney(o);a.goods+=m.goods;a.shipping+=m.shipping;a.commission+=m.commission;a.total+=m.total;return a},{goods:0,shipping:0,commission:0,total:0});
  setText('finGoods',adminMoney(sums.goods));setText('finShipping',adminMoney(sums.shipping));setText('finCommission',adminMoney(sums.commission));setText('finTotal',adminMoney(sums.total));
  const box=document.getElementById('financeSplit');if(box)box.innerHTML=`<div class="finance-line"><span>Получено всего по заказам</span><b>${adminMoney(sums.total)}</b></div><div class="finance-line"><span>Средства на покупку товара</span><b>${adminMoney(sums.goods)}</b></div><div class="finance-line"><span>Доставка / расходы</span><b>${adminMoney(sums.shipping)}</b></div><div class="finance-line"><span>Комиссия сервиса</span><b>${adminMoney(sums.commission)}</b></div><div class="finance-line"><span>Контрольная разница</span><b>${adminMoney(sums.total-sums.goods-sums.shipping-sums.commission)}</b></div>`;
}
function renderDocuments(){
  const box=document.getElementById('documentGrid');if(!box)return;
  const docs=[['Договор / оферта','acceptance','Фиксация версии и времени согласия'],['Amazon invoice','invoice','Инвойс по фактическому выкупу'],['Подтверждение оплаты','payment','Платёж клиентом / эквайринг'],['Склад США','warehouse','Фото, вес, размеры, package ID'],['International shipping','shipping','Лейбл, манифест, tracking'],['Украинская ТТН','lastmile','Nova / Meest / другой оператор'],['Отчёт комиссионера','report','Факт. расходы, комиссия, остаток'],['Возврат / refund','refund','Если заказ отменён или есть остаток']];
  box.innerHTML=docs.map(d=>{let complete=0;if(d[1]==='acceptance')complete=ADMIN_ORDERS.filter(o=>o.acceptance?.accepted).length;if(d[1]==='invoice')complete=ADMIN_ORDERS.filter(o=>o.purchase?.invoiceUrl).length;if(d[1]==='shipping')complete=ADMIN_ORDERS.filter(o=>o.shipping?.internationalTracking).length;if(d[1]==='lastmile')complete=ADMIN_ORDERS.filter(o=>o.shipping?.ukTracking).length;if(d[1]==='report')complete=ADMIN_ORDERS.filter(o=>o.commission?.reportStatus==='completed').length;return `<article class="doc-card"><div class="doc-icon">▧</div><b>${d[0]}</b><span>${d[2]}</span><span class="doc-state">${complete} / ${ADMIN_ORDERS.length} заказов</span></article>`}).join('');
}
function renderCustomers(){
  const body=document.getElementById('customersBody');if(!body)return;
  const map=new Map();ADMIN_ORDERS.forEach(o=>{const key=o.customer?.phone||o.customer?.email||customerName(o);if(!map.has(key))map.set(key,{name:customerName(o),phone:o.customer?.phone||'',email:o.customer?.email||'',city:o.customer?.city||'',orders:0,total:0,last:o.created});const c=map.get(key);c.orders++;c.total+=orderMoney(o).total;if(new Date(o.created)>new Date(c.last))c.last=o.created});const list=[...map.values()];
  if(!list.length){body.innerHTML=emptyRow(6);return}body.innerHTML=list.map(c=>`<tr><td><b>${h(c.name)}</b></td><td>${h(c.phone)}<div class="muted-admin">${h(c.email)}</div></td><td>${h(c.city)}</td><td>${c.orders}</td><td>${adminMoney(c.total)}</td><td>${adminDate(c.last)}</td></tr>`).join('');
}
function renderTeam(){
  const box=document.getElementById('teamList');if(box){const users=getTeam();box.innerHTML=users.map(u=>`<div class="team-user"><div class="team-user__avatar">${h((u.name||'?')[0].toUpperCase())}</div><div><b>${h(u.name)}</b><span>${h(u.email)}</span></div><span class="role-badge">${h(ADMIN_ROLES[u.role]?.name||u.role)}</span></div>`).join('')}
  const body=document.getElementById('permissionBody');if(body)body.innerHTML=Object.entries(ADMIN_ROLES).map(([key,r])=>`<tr><td><b>${r.name}</b></td>${['orders','purchases','warehouse','logistics','products','finance','team'].map(s=>`<td>${r.sections.includes(s)?'✓':'—'}</td>`).join('')}</tr>`).join('');
}
function renderIntegrations(){
  const box=document.getElementById('integrationGrid');if(!box)return;
  const list=[
    ['Amazon product data','Каталог, цена, рейтинг, изображения и доступность. Сейчас используется ручной проверенный snapshot.',STORE_META.live?'ready':'manual'],
    ['Amazon Associates','Affiliate tag для самостоятельной покупки на Amazon.','manual'],
    ['US warehouse / 3PL','Приём Amazon-посылок, package ID, вес, фото, консолидация.','manual'],
    ['Nova Global','API: создание отправлений, лейблы/манифесты, tracking, адреса отделений.','manual'],
    ['Meest / Meest America','Альтернативный международный маршрут, склад/портал и доставка США → Украина.','manual'],
    ['Nova Poshta last mile','Украинская ТТН, отделения, почтоматы и статусы.','manual'],
    ['Telegram Bot','Автопубликация карточек товаров и скидок в канал.','manual'],
    ['Payments / acquiring','Приём оплаты, webhook, фискальный сценарий, возвраты.','manual'],
    ['Email / SMS','Подтверждение заказа и изменения статуса клиенту.','manual']
  ];
  box.innerHTML=list.map(x=>`<article class="integration-card"><div class="integration-card__head"><b>${x[0]}</b><span class="integration-state ${x[2]==='ready'?'ready':''}">${x[2]==='ready'?'подключено':x[2]==='manual'?'подготовлено':'не подключено'}</span></div><p>${x[1]}</p><button type="button">Настроить после backend</button></article>`).join('');
}
function renderSettings(){
  const sel=document.getElementById('selectionSettings'),price=document.getElementById('pricingSettings');if(sel)sel.innerHTML=[['Минимальная скидка',(STORE_CONFIG?.minDiscount||35)+'%'],['Минимальный рейтинг',STORE_CONFIG?.minRating||4.5],['Минимум отзывов',(STORE_CONFIG?.minReviews||1000).toLocaleString('ru-RU')],['Максимальная цена','$'+(STORE_CONFIG?.maxPriceUsd||100)],['Макс. оплачиваемый вес',(STORE_CONFIG?.maxWeightKg||2)+' кг'],['Рекомендуемый customs buffer','€'+customsRecommendedEur()],['Скрывать истёкшие скидки',STORE_CONFIG?.hideExpiredDeals?'Да':'Нет']].map(x=>`<div class="setting-row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');if(price)price.innerHTML=[['USD / UAH',usdRate()],['Базовая доставка','$'+Number(STORE_CONFIG?.shipping?.baseUsd||0).toFixed(2)],['Доп. за кг','$'+Number(STORE_CONFIG?.shipping?.extraPerKgUsd||0).toFixed(2)],['Комиссия',Number(STORE_CONFIG?.serviceFee?.percent||0)+'%'],['Минимальная комиссия','$'+Number(STORE_CONFIG?.serviceFee?.minimumUsd||0).toFixed(2)],['Таможенный порог','€'+customsLimitEur()]].map(x=>`<div class="setting-row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
}

function openOrder(no){
  const o=ADMIN_ORDERS.find(x=>x.no===no);if(!o)return;const m=orderMoney(o),items=orderItems(o),content=document.getElementById('drawerContent');
  content.innerHTML=`<p class="eyebrow">Заказ</p><h2 class="drawer-title">${h(o.no)}</h2><div class="drawer-sub">${adminDate(o.created)} · ${h(customerName(o))}</div><div class="drawer-block"><h3>Клиент</h3><div class="drawer-row"><span>Телефон</span><b>${h(o.customer?.phone||'—')}</b></div><div class="drawer-row"><span>Email</span><b>${h(o.customer?.email||'—')}</b></div><div class="drawer-row"><span>Доставка</span><b>${h(o.customer?.delivery||'—')}</b></div><div class="drawer-row"><span>Адрес / отделение</span><b>${h(o.customer?.address||'—')}</b></div></div><div class="drawer-block"><h3>Товары</h3>${items.map(i=>`<div class="drawer-product">${i.image?`<img src="${h(i.image)}" alt="">`:''}<div><b>${h(i.brand+' '+i.name)}</b><span>${h(i.asin||'')} · ${i.qty||1} шт.</span></div><strong>${i.deliveredUnitUah?adminMoney(i.deliveredUnitUah*(i.qty||1)):''}</strong></div>`).join('')}</div><div class="drawer-block"><h3>Финансы</h3><div class="drawer-row"><span>Товар</span><b>${adminMoney(m.goods)}</b></div><div class="drawer-row"><span>Доставка / расходы</span><b>${adminMoney(m.shipping)}</b></div><div class="drawer-row"><span>Комиссия</span><b>${adminMoney(m.commission)}</b></div><div class="drawer-row"><span>Итого</span><b>${adminMoney(m.total)}</b></div></div><div class="drawer-block"><h3>Операции</h3><form class="invite-form" id="orderOpsForm"><label>Статус<select id="drawerStatus">${STATUS_ORDER.map(s=>`<option value="${s}" ${orderStatus(o)===s?'selected':''}>${STATUS_LABELS[s]}</option>`).join('')}</select></label><label>Amazon Order ID<input id="drawerAmazonOrder" value="${h(o.purchase?.amazonOrderId||'')}" placeholder="например 112-..."></label><label>Invoice URL / ID<input id="drawerInvoice" value="${h(o.purchase?.invoiceUrl||'')}" placeholder="ссылка или ID документа"></label><label>US package ID<input id="drawerPackage" value="${h(o.warehouse?.packageId||'')}" placeholder="ID посылки на складе"></label><label>Фактический вес, кг<input id="drawerWeight" type="number" step="0.01" value="${h(o.warehouse?.measuredWeightKg||'')}"></label><label>International tracking<input id="drawerInternational" value="${h(o.shipping?.internationalTracking||'')}"></label><label>Перевозчик<input id="drawerCarrier" value="${h(o.shipping?.carrier||'')}"></label><label>Украинская ТТН<input id="drawerUkTracking" value="${h(o.shipping?.ukTracking||'')}"></label><label>Last mile<input id="drawerLastMile" value="${h(o.shipping?.lastMileCarrier||'')}"></label><button class="primary-small" type="submit">Сохранить изменения</button><small>В прототипе изменения сохраняются локально. В production эти поля должны писать в базу и журнал аудита.</small></form></div>`;
  document.getElementById('orderOpsForm').onsubmit=e=>{e.preventDefault();o.status=document.getElementById('drawerStatus').value;o.purchase={...(o.purchase||{}),amazonOrderId:document.getElementById('drawerAmazonOrder').value.trim(),invoiceUrl:document.getElementById('drawerInvoice').value.trim()};o.warehouse={...(o.warehouse||{}),packageId:document.getElementById('drawerPackage').value.trim(),measuredWeightKg:Number(document.getElementById('drawerWeight').value)||null};o.shipping={...(o.shipping||{}),internationalTracking:document.getElementById('drawerInternational').value.trim(),carrier:document.getElementById('drawerCarrier').value.trim(),ukTracking:document.getElementById('drawerUkTracking').value.trim(),lastMileCarrier:document.getElementById('drawerLastMile').value.trim()};o.timeline=[...(o.timeline||[]),{at:new Date().toISOString(),type:'admin_update',label:'Операционные данные обновлены',role:CURRENT_ROLE}];saveStoredOrders();renderAll();openOrder(no)};
  document.getElementById('orderDrawer').classList.add('open');document.getElementById('drawerBackdrop').classList.add('open');
}
function closeDrawer(){document.getElementById('orderDrawer')?.classList.remove('open');document.getElementById('drawerBackdrop')?.classList.remove('open')}
function exportOrdersCsv(){
  const rows=[['order','created','customer','phone','status','goods_uah','shipping_uah','commission_uah','total_uah','amazon_order_id','international_tracking','uk_tracking']];ADMIN_ORDERS.forEach(o=>{const m=orderMoney(o);rows.push([o.no,o.created,customerName(o),o.customer?.phone||'',orderStatus(o),m.goods,m.shipping,m.commission,m.total,o.purchase?.amazonOrderId||'',o.shipping?.internationalTracking||'',o.shipping?.ukTracking||''])});const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='amazon-uk-orders-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}
function renderAll(){renderDashboard();renderOrders();renderPurchases();renderWarehouse();renderLogistics();renderProducts();renderFinance();renderDocuments();renderCustomers();renderTeam();renderIntegrations();renderSettings()}

(async()=>{
  await window.storeReady;
  ADMIN_ORDERS=getStoredOrders();
  const roleSelect=document.getElementById('roleSelect');if(roleSelect){roleSelect.value=ADMIN_ROLES[CURRENT_ROLE]?CURRENT_ROLE:'owner';roleSelect.onchange=()=>{CURRENT_ROLE=roleSelect.value;applyRole()}}
  document.querySelectorAll('.admin-nav [data-section]').forEach(btn=>btn.onclick=()=>navigate(btn.dataset.section));
  document.querySelectorAll('[data-go]').forEach(btn=>btn.onclick=()=>navigate(btn.dataset.go));
  document.getElementById('mobileMenu').onclick=()=>document.getElementById('adminSide').classList.toggle('open');
  document.getElementById('drawerClose').onclick=closeDrawer;document.getElementById('drawerBackdrop').onclick=closeDrawer;
  document.getElementById('orderSearch').addEventListener('input',renderOrders);document.getElementById('orderStatusFilter').addEventListener('change',renderOrders);document.getElementById('exportOrders').onclick=exportOrdersCsv;
  document.getElementById('inviteForm').onsubmit=e=>{e.preventDefault();const users=getTeam(),name=document.getElementById('inviteName').value.trim(),email=document.getElementById('inviteEmail').value.trim(),role=document.getElementById('inviteRole').value;if(!name||!email)return;users.push({id:'u'+Date.now(),name,email,role,active:true});saveTeam(users);e.target.reset();renderTeam()};
  const feedState=document.getElementById('feedState'),feedDot=document.getElementById('feedDot');if(feedState)feedState.textContent=STORE_META.live?'live API':'ручной snapshot';if(feedDot&&!STORE_META.live)feedDot.classList.add('warning');
  renderAll();applyRole();
  const initial=location.hash.replace('#','');navigate(initial&&allowed(initial)?initial:'dashboard');
})();