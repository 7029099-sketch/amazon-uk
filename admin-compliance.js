(function(){
  const RULE_DOC='COMPLIANCE_GUARDRAILS.md';
  function esc(v=''){return String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
  function ageHours(value){const t=new Date(value||0).getTime();return t?Math.max(0,(Date.now()-t)/36e5):Infinity}
  function yesNo(v){return v===true?'Да':v===false?'Нет':'Не указано'}
  function pill(label,tone='warn'){return `<span class="compliance-pill ${tone}">${esc(label)}</span>`}
  function productCheck(p){
    const cfg=window.STORE_CONFIG?.compliance||STORE_CONFIG?.compliance||{};
    const c=p.compliance||{};
    const issues=[],warnings=[];
    if(cfg.requireSourceUrl!==false&&!p.sourceUrl)issues.push('Нет source URL');
    if(cfg.requirePriceTimestamp!==false&&!p.lastCheckedAt)issues.push('Нет времени проверки цены');
    if(p.lastCheckedAt&&ageHours(p.lastCheckedAt)>Number(cfg.maxPriceAgeHours||24))warnings.push('Цена старше '+Number(cfg.maxPriceAgeHours||24)+' ч');
    if(p.dealVerified===false)issues.push('Скидка не подтверждена');
    if(p.shippingAllowed===false||p.restrictedShipping===true||p.hazmat===true)issues.push('Ограничение доставки');
    if(cfg.requireContentUseBasis!==false&&(!c.contentUseBasis||c.contentUseBasis==='manual-review-required'))warnings.push('Права на контент требуют проверки');
    if(c.contentRightsStatus&&c.contentRightsStatus!=='approved')warnings.push('Content rights: '+c.contentRightsStatus);
    if(cfg.requireTrademarkReviewForAds!==false&&c.trademarkReviewed!==true)warnings.push('Товарные знаки не проверены для рекламы');
    if(c.sourceTermsReviewed!==true)warnings.push('Правила источника не отмечены как проверенные');
    if(c.affiliateEnabled===true&&c.managedPurchaseOnBehalf===true)issues.push('Нельзя смешивать affiliate flow и выкуп от имени клиента');
    if(c.affiliateEnabled===true&&cfg.requireAffiliateDisclosureWhenApplicable!==false&&c.affiliateDisclosurePresent!==true)issues.push('Нет affiliate disclosure');
    const adsEligible=c.adsEligible===true&&issues.length===0&&warnings.length===0;
    const publishEligible=issues.length===0;
    return {issues,warnings,adsEligible,publishEligible};
  }
  function launchChecks(){
    const cfg=STORE_CONFIG?.compliance||{};
    const g=cfg.launchGates||{};
    return [
      ['Собственный бренд выбран',g.independentBrandSelected===true],
      ['Финальный домен выбран',g.finalDomainSelected===true],
      ['Права на данные маркетплейсов проверены',g.marketplaceDataRightsReviewed===true],
      ['Amazon Associates flow проверен отдельно',g.amazonAssociatesFlowReviewed===true],
      ['Сценарий выкупа через нас проверен отдельно',g.managedPurchaseFlowReviewed===true],
      ['Правила Google Ads / Merchant проверены',g.advertisingPoliciesReviewed===true],
      ['Privacy / Terms / consent проверены',g.privacyAndTermsReviewed===true],
      ['Налоги / фискализация / платежный поток проверены',g.taxAndFiscalFlowReviewed===true],
      ['Ограничения перевозчика и категорий проверены',g.carrierRestrictionsReviewed===true]
    ];
  }
  function injectStyles(){
    if(document.getElementById('complianceStyles'))return;
    const s=document.createElement('style');s.id='complianceStyles';s.textContent=`
      .compliance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.compliance-card{background:#fff;border:1px solid #e4e8ed;border-radius:17px;padding:16px}.compliance-card small{font-size:9px;color:#7c8795}.compliance-card strong{display:block;font:800 24px Manrope;margin:7px 0 3px}.compliance-card span{font-size:9px;color:#8b95a3}.compliance-card.danger strong{color:#b91c1c}.compliance-card.warn strong{color:#b45309}.compliance-pill{display:inline-flex;border-radius:999px;padding:5px 8px;font-size:8px;font-weight:800;white-space:nowrap}.compliance-pill.ok{background:#ecfdf5;color:#047857}.compliance-pill.warn{background:#fff7ed;color:#c2410c}.compliance-pill.bad{background:#fef2f2;color:#b91c1c}.compliance-list{display:grid;gap:8px}.compliance-check{display:grid;grid-template-columns:26px 1fr auto;gap:10px;align-items:center;border:1px solid #edf0f3;border-radius:12px;padding:10px}.compliance-check i{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-style:normal;background:#fef2f2;color:#b91c1c;font-weight:800}.compliance-check.ok i{background:#ecfdf5;color:#047857}.compliance-check b{font-size:10px}.compliance-check span{font-size:8px;color:#8b95a3}.compliance-note{background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:13px 15px;font-size:10px;line-height:1.6;color:#7c2d12;margin-bottom:14px}.compliance-note b{display:block;margin-bottom:4px}.compliance-source{font-size:8px;color:#64748b;line-height:1.45}.compliance-action{display:inline-flex;margin-top:8px;color:#2563eb;font-size:9px;font-weight:800}.compliance-table td{vertical-align:top}.compliance-table .issues{max-width:300px;font-size:9px;line-height:1.5;color:#7c2d12}@media(max-width:1100px){.compliance-grid{grid-template-columns:1fr 1fr}}@media(max-width:640px){.compliance-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function injectUI(){
    if(document.getElementById('complianceNav'))return;
    const nav=document.querySelector('.admin-nav'),content=document.querySelector('.admin-content');if(!nav||!content)return;
    const btn=document.createElement('button');btn.id='complianceNav';btn.type='button';btn.innerHTML='⚑ <span>Compliance</span><i id="complianceCount">0</i>';
    const settings=[...nav.querySelectorAll('button')].find(b=>b.dataset.section==='settings');nav.insertBefore(btn,settings||null);
    const section=document.createElement('section');section.className='admin-section';section.id='complianceSection';section.innerHTML=`
      <div class="section-intro"><div><p class="eyebrow">Launch guardrails</p><h2>Compliance Center</h2></div><p>Один экран, который не даёт нам забыть про права на контент, товарные знаки, актуальность цен, affiliate/managed-buy разделение, рекламу, перевозку и обязательные проверки перед запуском.</p></div>
      <div class="compliance-note"><b>Главное правило Amazon</b>Affiliate-сценарий «перейти и купить на Amazon» и наш сценарий «мы выкупаем товар для клиента» должны быть разделены. Если используем Amazon Associates / Program Content, нельзя автоматически считать его разрешением на наш managed-purchase flow.</div>
      <div class="compliance-grid" id="complianceStats"></div>
      <div class="admin-grid admin-grid--2"><article class="admin-card"><div class="card-head"><div><small>Перед рекламой</small><h2>Launch gates</h2></div><a class="ghost" href="${RULE_DOC}" target="_blank">Правила ↗</a></div><div class="compliance-list" id="launchCompliance"></div></article><article class="admin-card"><div class="card-head"><div><small>Правило архитектуры</small><h2>Что нельзя смешивать</h2></div></div><div class="check-list"><div>Amazon affiliate link → только покупка на Amazon</div><div>Выкуп через нас → отдельный договор и checkout</div><div>API/content rights → проверяются по каждому источнику</div><div>Реклама → только после проверки бренда, цены и роли сайта</div><div>Логины Amazon клиента → никогда не собираем</div><div>Цена snapshot → никогда не называем live</div></div></article></div>
      <article class="admin-card"><div class="card-head"><div><small>Карточки</small><h2>Проверка товаров</h2></div></div><div class="table-wrap"><table class="compliance-table"><thead><tr><th>Товар</th><th>Источник</th><th>Цена</th><th>Контент / TM</th><th>Affiliate</th><th>Реклама</th><th>Что проверить</th></tr></thead><tbody id="complianceProducts"></tbody></table></div></article>
    `;content.appendChild(section);
    btn.onclick=()=>openCompliance();
    document.getElementById('roleSelect')?.addEventListener('change',syncRoleVisibility);
    syncRoleVisibility();
  }
  function syncRoleVisibility(){const role=document.getElementById('roleSelect')?.value||'owner',btn=document.getElementById('complianceNav');if(btn)btn.style.display=['owner','content'].includes(role)?'grid':'none'}
  function openCompliance(){
    document.querySelectorAll('[data-section-panel],#complianceSection').forEach(x=>x.classList.remove('active'));
    document.getElementById('complianceSection')?.classList.add('active');
    document.querySelectorAll('.admin-nav button').forEach(x=>x.classList.remove('active'));document.getElementById('complianceNav')?.classList.add('active');
    const title=document.getElementById('sectionTitle');if(title)title.textContent='Compliance';const eyebrow=document.getElementById('sectionEyebrow');if(eyebrow)eyebrow.textContent='Launch guardrails';
    document.getElementById('adminSide')?.classList.remove('open');renderCompliance();
  }
  function renderCompliance(){
    const products=[...(window.STORE_PRODUCTS||STORE_PRODUCTS||[])],checks=products.map(p=>({p,r:productCheck(p)}));
    const blocked=checks.filter(x=>x.r.issues.length).length,warn=checks.filter(x=>!x.r.issues.length&&x.r.warnings.length).length,ads=checks.filter(x=>x.r.adsEligible).length;
    const gates=launchChecks(),gateDone=gates.filter(x=>x[1]).length;
    const stats=document.getElementById('complianceStats');if(stats)stats.innerHTML=`<article class="compliance-card"><small>Товаров проверено</small><strong>${products.length}</strong><span>текущий каталог</span></article><article class="compliance-card danger"><small>Блокеры</small><strong>${blocked}</strong><span>требуют исправления</span></article><article class="compliance-card warn"><small>Предупреждения</small><strong>${warn}</strong><span>нужна ручная проверка</span></article><article class="compliance-card"><small>Готово для рекламы</small><strong>${ads}</strong><span>без известных флагов</span></article>`;
    const launch=document.getElementById('launchCompliance');if(launch)launch.innerHTML=gates.map(([name,ok])=>`<div class="compliance-check ${ok?'ok':''}"><i>${ok?'✓':'!'}</i><div><b>${esc(name)}</b><span>${ok?'зафиксировано':'до запуска не закрыто'}</span></div>${pill(ok?'готово':'блокер',ok?'ok':'bad')}</div>`).join('');
    const body=document.getElementById('complianceProducts');if(body)body.innerHTML=checks.length?checks.map(({p,r})=>{const c=p.compliance||{},problems=[...r.issues,...r.warnings];return `<tr><td><b>${esc((p.brand||'')+' '+(p.name||''))}</b><div class="compliance-source">${esc(p.asin||p.sku||'')}</div></td><td>${esc(typeof marketplaceLabel==='function'?marketplaceLabel(p):(p.source||'—'))}<div class="compliance-source">${p.sourceUrl?'URL есть':'нет URL'}</div></td><td>${pill(ageHours(p.lastCheckedAt)<=Number(STORE_CONFIG?.compliance?.maxPriceAgeHours||24)?'актуальна':'устарела',ageHours(p.lastCheckedAt)<=Number(STORE_CONFIG?.compliance?.maxPriceAgeHours||24)?'ok':'warn')}<div class="compliance-source">${esc(typeof formatCheckedDate==='function'?formatCheckedDate(p.lastCheckedAt):p.lastCheckedAt||'нет')}</div></td><td>${pill(c.contentRightsStatus==='approved'?'rights ok':'review',c.contentRightsStatus==='approved'?'ok':'warn')} ${pill(c.trademarkReviewed===true?'TM ok':'TM review',c.trademarkReviewed===true?'ok':'warn')}</td><td>${c.affiliateEnabled===true?pill('affiliate','warn'):pill('off','ok')}<div class="compliance-source">managed buy: ${yesNo(c.managedPurchaseEligible)}</div></td><td>${pill(r.adsEligible?'можно':'нельзя',r.adsEligible?'ok':'bad')}</td><td class="issues">${problems.length?problems.map(esc).join('<br>'):'✓ Явных флагов нет'}</td></tr>`}).join(''):'<tr><td colspan="7">Нет товаров</td></tr>';
    const count=document.getElementById('complianceCount');if(count)count.textContent=blocked+warn+gates.filter(x=>!x[1]).length;
  }
  function boot(){injectStyles();injectUI();renderCompliance();setInterval(()=>{if(document.getElementById('complianceSection')?.classList.contains('active'))renderCompliance()},30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
  window.complianceCheckProduct=productCheck;
})();