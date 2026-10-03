(function(){
  const STATE_KEY='hapai_growth_state_v1';
  const STATUS_DEFS=[
    ['seoReady','SEO готов'],
    ['googleIndexed','Google index'],
    ['facebookPublished','FB опубликовано'],
    ['instagramPublished','Instagram опубликовано'],
    ['telegramPublished','Telegram опубликовано'],
    ['reelsCreated','Reels создан'],
    ['affiliateLinkOk','Affiliate link OK']
  ];
  const CONNECTION_LABELS={
    googleSearchConsole:'Google Search Console',
    facebook:'Facebook',
    instagram:'Instagram',
    telegram:'Telegram',
    reels:'Reels',
    amazonAssociates:'Amazon Associates'
  };
  let growthConfig=null;
  function esc(v=''){return String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
  function readState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{return{}}}
  function writeState(v){localStorage.setItem(STATE_KEY,JSON.stringify(v))}
  function hasAffiliateLink(p){const u=String(p.affiliateUrl||'');return Boolean(p.compliance?.affiliateEnabled===true&&u&&/[?&](tag|ascsubtag)=/i.test(u))}
  function ensureProductState(p){const state=readState();const key=String(p.id);if(!state[key])state[key]={};for(const [field] of STATUS_DEFS){if(typeof state[key][field]!=='boolean')state[key][field]=field==='affiliateLinkOk'?hasAffiliateLink(p):false}writeState(state);return state[key]}
  function allProductState(){const state=readState();for(const p of (window.STORE_PRODUCTS||[])){const key=String(p.id);if(!state[key])state[key]={};for(const [field] of STATUS_DEFS){if(typeof state[key][field]!=='boolean')state[key][field]=field==='affiliateLinkOk'?hasAffiliateLink(p):false}}writeState(state);return state}
  function injectStyles(){if(document.getElementById('growthStyles'))return;const s=document.createElement('style');s.id='growthStyles';s.textContent=`
    .growth-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.growth-stat{background:#fff;border:1px solid #e5e7eb;border-radius:17px;padding:16px}.growth-stat small{display:block;color:#64748b;font-size:9px}.growth-stat strong{display:block;font:800 24px Manrope,Inter,sans-serif;margin:7px 0 3px}.growth-stat span{font-size:9px;color:#94a3b8}.growth-connections{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.growth-connection{border:1px solid #e5e7eb;background:#fff;border-radius:16px;padding:14px}.growth-connection__top{display:flex;align-items:center;justify-content:space-between;gap:8px}.growth-connection b{font-size:11px}.growth-connection p{font-size:9px;line-height:1.55;color:#64748b;margin:8px 0 0}.growth-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:8px;font-weight:800;background:#f1f5f9;color:#475569}.growth-pill.ok{background:#ecfdf5;color:#047857}.growth-pill.warn{background:#fff7ed;color:#c2410c}.growth-status-btn{border:0;background:transparent;padding:0;cursor:pointer}.growth-status{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:5px 8px;font-size:8px;font-weight:800;white-space:nowrap;background:#fef2f2;color:#b91c1c}.growth-status.done{background:#ecfdf5;color:#047857}.growth-status::before{content:'○';font-weight:900}.growth-status.done::before{content:'✓'}.growth-table th,.growth-table td{white-space:nowrap}.growth-table td:first-child,.growth-table th:first-child{position:sticky;left:0;background:#fff;z-index:1;min-width:240px}.growth-table .product-name{display:block;font-weight:800;font-size:10px;white-space:normal;max-width:240px}.growth-table .product-meta{display:block;color:#94a3b8;font-size:8px;margin-top:4px}.growth-note{padding:13px 15px;border:1px solid #dbeafe;background:#eff6ff;border-radius:14px;color:#1e3a8a;font-size:9px;line-height:1.6;margin-bottom:15px}.growth-note b{display:block;margin-bottom:3px}.growth-actions{display:flex;gap:8px;flex-wrap:wrap}.growth-actions button{border:1px solid #dbe1e8;background:#fff;border-radius:10px;padding:8px 10px;font-weight:800;font-size:9px;cursor:pointer}.growth-actions button:hover{background:#f8fafc}@media(max-width:1000px){.growth-summary{grid-template-columns:1fr 1fr}.growth-connections{grid-template-columns:1fr 1fr}}@media(max-width:640px){.growth-summary,.growth-connections{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}
  async function loadConfig(){try{const r=await fetch('growth-config.json',{cache:'no-store'});if(r.ok)growthConfig=await r.json()}catch{}if(!growthConfig)growthConfig={connections:{}}}
  function injectUI(){if(document.getElementById('growthNav'))return;const nav=document.querySelector('.admin-nav'),content=document.querySelector('.admin-content');if(!nav||!content)return;
    const btn=document.createElement('button');btn.id='growthNav';btn.type='button';btn.innerHTML='↗ <span>SEO & Social</span><i id="growthTodoCount">0</i>';
    const integrations=[...nav.querySelectorAll('button')].find(b=>b.dataset.section==='integrations');nav.insertBefore(btn,integrations||null);
    const section=document.createElement('section');section.className='admin-section';section.id='growthSection';section.innerHTML=`
      <div class="section-intro"><div><p class="eyebrow">Organic growth engine</p><h2>SEO & Social</h2></div><p>Для каждого товара отслеживаем SEO, индексацию, публикации, Reels и affiliate-ссылку. После подключения внешних аккаунтов эти статусы должны обновляться автоматически.</p></div>
      <div class="growth-note"><b>Смысл модуля</b>Один прошедший проверку товар должен превращаться в SEO-страницу, посты для соцсетей, Telegram, короткое видео и корректную affiliate-ссылку. Никакие секреты не храним в браузере или публичном репозитории.</div>
      <div class="growth-summary" id="growthSummary"></div>
      <article class="admin-card"><div class="card-head"><div><small>Внешние сервисы</small><h2>Подключения</h2></div></div><div class="growth-connections" id="growthConnections"></div></article>
      <article class="admin-card"><div class="card-head"><div><small>Контент-конвейер</small><h2>Статусы товаров</h2></div><div class="growth-actions"><button id="growthMarkSeo">Отметить SEO для готовых карточек</button><button id="growthResetManual">Сбросить ручные статусы</button></div></div><div class="table-wrap"><table class="growth-table"><thead><tr><th>Товар</th>${STATUS_DEFS.map(([,label])=>`<th>${esc(label)}</th>`).join('')}</tr></thead><tbody id="growthProducts"></tbody></table></div></article>
    `;content.appendChild(section);btn.onclick=openGrowth;document.getElementById('roleSelect')?.addEventListener('change',syncRoleVisibility);syncRoleVisibility();
  }
  function syncRoleVisibility(){const role=document.getElementById('roleSelect')?.value||'owner';const btn=document.getElementById('growthNav');if(btn)btn.style.display=['owner','content'].includes(role)?'grid':'none'}
  function openGrowth(){document.querySelectorAll('[data-section-panel],#complianceSection,#growthSection').forEach(x=>x.classList.remove('active'));document.getElementById('growthSection')?.classList.add('active');document.querySelectorAll('.admin-nav button').forEach(x=>x.classList.remove('active'));document.getElementById('growthNav')?.classList.add('active');const t=document.getElementById('sectionTitle');if(t)t.textContent='SEO & Social';const e=document.getElementById('sectionEyebrow');if(e)e.textContent='Organic growth engine';document.getElementById('adminSide')?.classList.remove('open');renderGrowth()}
  function renderConnections(){const box=document.getElementById('growthConnections');if(!box)return;const connections=growthConfig?.connections||{};box.innerHTML=Object.keys(CONNECTION_LABELS).map(key=>{const c=connections[key]||{status:'not_connected',purpose:''};const ok=c.status==='connected';return `<div class="growth-connection"><div class="growth-connection__top"><b>${esc(CONNECTION_LABELS[key])}</b><span class="growth-pill ${ok?'ok':'warn'}">${ok?'подключено':'нужно подключить'}</span></div><p>${esc(c.purpose||'')}</p></div>`}).join('')}
  function statusButton(p,field,label,state){const done=Boolean(state[field]);return `<button class="growth-status-btn" data-growth-product="${esc(p.id)}" data-growth-field="${esc(field)}" title="Ручное переключение для прототипа"><span class="growth-status ${done?'done':''}">${done?'готово':'нет'}</span></button>`}
  function renderGrowth(){const products=[...(window.STORE_PRODUCTS||[])],state=allProductState();const totalSteps=products.length*STATUS_DEFS.length;let done=0;for(const p of products){const ps=state[String(p.id)]||{};for(const [f] of STATUS_DEFS)if(ps[f])done++}const remaining=Math.max(0,totalSteps-done);const fullyReady=products.filter(p=>STATUS_DEFS.every(([f])=>state[String(p.id)]?.[f])).length;const affiliateOk=products.filter(p=>state[String(p.id)]?.affiliateLinkOk).length;
    const summary=document.getElementById('growthSummary');if(summary)summary.innerHTML=`<article class="growth-stat"><small>Товаров</small><strong>${products.length}</strong><span>в текущем каталоге</span></article><article class="growth-stat"><small>Готовых шагов</small><strong>${done}/${totalSteps}</strong><span>по всем каналам</span></article><article class="growth-stat"><small>Полностью готовы</small><strong>${fullyReady}</strong><span>7 из 7 статусов</span></article><article class="growth-stat"><small>Affiliate OK</small><strong>${affiliateOk}</strong><span>валидная tracking-ссылка</span></article>`;
    renderConnections();const body=document.getElementById('growthProducts');if(body)body.innerHTML=products.length?products.map(p=>{const ps=state[String(p.id)]||ensureProductState(p);return `<tr><td><span class="product-name">${esc((p.brand||'')+' '+(p.name||''))}</span><span class="product-meta">${esc(p.asin||p.sku||p.id)} · ${esc(typeof marketplaceLabel==='function'?marketplaceLabel(p):(p.source||'source'))}</span></td>${STATUS_DEFS.map(([f,l])=>`<td>${statusButton(p,f,l,ps)}</td>`).join('')}</tr>`}).join(''):'<tr><td colspan="8">Нет товаров</td></tr>';
    document.querySelectorAll('[data-growth-product]').forEach(btn=>btn.onclick=()=>{const st=readState(),id=String(btn.dataset.growthProduct),field=btn.dataset.growthField;st[id]=st[id]||{};st[id][field]=!st[id][field];writeState(st);renderGrowth()});
    const todo=document.getElementById('growthTodoCount');if(todo)todo.textContent=remaining;
    const markSeo=document.getElementById('growthMarkSeo');if(markSeo)markSeo.onclick=()=>{const st=allProductState();for(const p of products){const c=p.compliance||{};const allowed=p.dealVerified!==false&&p.sourceUrl&&p.lastCheckedAt&&c.contentRightsStatus!=='blocked';if(allowed)st[String(p.id)].seoReady=true}writeState(st);renderGrowth()};
    const reset=document.getElementById('growthResetManual');if(reset)reset.onclick=()=>{localStorage.removeItem(STATE_KEY);renderGrowth()};
  }
  async function boot(){injectStyles();await loadConfig();injectUI();allProductState();renderGrowth();setInterval(()=>{if(document.getElementById('growthSection')?.classList.contains('active'))renderGrowth()},30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
  window.HAPAI_GROWTH={render:renderGrowth,state:readState};
})();
