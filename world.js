const deals=[
  {id:1,region:'usa',flag:'🇺🇸',source:'Amazon US',icon:'💻',badge:'−34%',name:'MacBook Air M4 · 13-inch',price:'$849',old:'$1,299',rating:'★ 4.8',reviews:'8K+',note:'Лучше для USA',total:'≈ $849'},
  {id:2,region:'china',flag:'🇨🇳',source:'AliExpress',icon:'🔋',badge:'−46%',name:'Baseus Powerbank 20 000 mAh',price:'$27',old:'$50',rating:'★ 4.7',reviews:'12K+',note:'Низкая цена',total:'≈ $31'},
  {id:3,region:'usa',flag:'🇺🇸',source:'Walmart',icon:'🎧',badge:'−38%',name:'Sony Wireless Headphones',price:'$79',old:'$129',rating:'★ 4.6',reviews:'4K+',note:'США',total:'≈ $79'},
  {id:4,region:'europe',flag:'🇵🇱',source:'Amazon PL',icon:'🧱',badge:'−29%',name:'LEGO Technic Set',price:'269 zł',old:'379 zł',rating:'★ 4.9',reviews:'2K+',note:'Польша',total:'≈ 269 zł'},
  {id:5,region:'china',flag:'🇨🇳',source:'Temu',icon:'🏠',badge:'−51%',name:'Smart Home Organizer Set',price:'$16',old:'$33',rating:'★ 4.6',reviews:'6K+',note:'Компактный',total:'≈ $20'},
  {id:6,region:'usa',flag:'🇺🇸',source:'eBay',icon:'⌚',badge:'−40%',name:'Garmin Watch · Open Box',price:'$119',old:'$199',rating:'★ 4.8',reviews:'3K+',note:'Open box',total:'≈ $119'},
  {id:7,region:'china',flag:'🇨🇳',source:'AliExpress',icon:'📷',badge:'−36%',name:'Compact Creator Light',price:'$41',old:'$64',rating:'★ 4.7',reviews:'1.8K',note:'Creator gear',total:'≈ $47'},
  {id:8,region:'europe',flag:'🇪🇺',source:'Amazon DE',icon:'🍳',badge:'−31%',name:'KitchenAid Accessory',price:'€44',old:'€64',rating:'★ 4.8',reviews:'5K+',note:'EU deal',total:'≈ €44'}
];

const marketDemo=[
  {name:'Amazon US',sub:'USA · быстрая доставка',price:'$39',total:'≈ $46',save:'итог для UA'},
  {name:'AliExpress',sub:'China · 9–16 дней',price:'$24',total:'≈ $29',save:'−37% к Amazon',best:true},
  {name:'Temu',sub:'China · 8–14 дней',price:'$26',total:'≈ $31',save:'−33% к Amazon'},
  {name:'Walmart',sub:'USA · доставка через склад',price:'$35',total:'≈ $43',save:'−7% к Amazon'}
];

const countrySettings={
  ua:{flag:'🇺🇦',label:'Украина',currency:'UAH',hero:'Найди, где выгоднее. В любой стране.'},
  us:{flag:'🇺🇸',label:'USA',currency:'USD',hero:'Find where it’s cheaper. Anywhere.'},
  pl:{flag:'🇵🇱',label:'Polska',currency:'PLN',hero:'Znajdź, gdzie jest taniej.'},
  sk:{flag:'🇸🇰',label:'Slovensko',currency:'EUR',hero:'Nájdi, kde je to výhodnejšie.'}
};

let activeFilter='all';
let activeCountry='ua';

const grid=document.getElementById('dealGrid');
const marketList=document.getElementById('marketList');
const toast=document.getElementById('toast');

function renderDeals(){
  const visible=activeFilter==='all'?deals:deals.filter(d=>d.region===activeFilter);
  grid.innerHTML=visible.map(d=>`
    <article class="deal-card">
      <div class="deal-media">
        <span class="deal-badge">${d.badge}</span>
        <span aria-hidden="true">${d.icon}</span>
        <span class="deal-source">${d.flag} ${d.source}</span>
      </div>
      <div class="deal-body">
        <small>${d.note}</small>
        <h3>${d.name}</h3>
        <div class="price-line"><strong>${d.price}</strong><del>${d.old}</del></div>
        <div class="deal-meta"><span>${d.rating} · ${d.reviews}</span><span>${d.total}</span></div>
        <button class="deal-action" data-deal="${d.id}">Сравнить рынки</button>
      </div>
    </article>`).join('');
}

function renderMarkets(){
  marketList.innerHTML=marketDemo.map(m=>`
    <div class="market-row ${m.best?'best':''}">
      <div><strong>${m.name}</strong><small>${m.sub}</small></div>
      <div class="total">${m.total}</div>
      <div class="save">${m.save}</div>
    </div>`).join('');
  const best=marketDemo.find(m=>m.best);
  document.getElementById('bestResult').textContent=`${best.name} · ориентировочно ${best.total}`;
}

function showToast(text){
  toast.textContent=text;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove('show'),2400);
}

function runDemoSearch(query){
  const q=(query||'').trim();
  if(!q){showToast('Введите товар для поиска');return;}
  document.getElementById('searchInput').value=q;
  document.getElementById('compare').scrollIntoView({behavior:'smooth',block:'start'});
  showToast(`DEMO: сравниваем «${q}» по мировым площадкам`);
}

document.getElementById('globalSearch').addEventListener('submit',e=>{
  e.preventDefault();
  runDemoSearch(document.getElementById('searchInput').value);
});

document.querySelectorAll('.quick-searches button').forEach(btn=>btn.addEventListener('click',()=>runDemoSearch(btn.dataset.query)));

document.getElementById('filterRow').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-filter]');
  if(!btn)return;
  activeFilter=btn.dataset.filter;
  document.querySelectorAll('#filterRow button').forEach(b=>b.classList.toggle('active',b===btn));
  renderDeals();
});

grid.addEventListener('click',e=>{
  const btn=e.target.closest('[data-deal]');
  if(!btn)return;
  const deal=deals.find(d=>String(d.id)===btn.dataset.deal);
  document.getElementById('compare').scrollIntoView({behavior:'smooth',block:'start'});
  showToast(`DEMO: сравниваем ${deal.name}`);
});

const countryButton=document.getElementById('countryButton');
const countryMenu=document.getElementById('countryMenu');
countryButton.addEventListener('click',()=>{countryMenu.hidden=!countryMenu.hidden;});
countryMenu.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-country]');
  if(!btn)return;
  activeCountry=btn.dataset.country;
  const c=countrySettings[activeCountry];
  document.getElementById('countryFlag').textContent=c.flag;
  document.getElementById('countryLabel').textContent=c.label;
  countryMenu.hidden=true;
  showToast(`${c.flag} ${c.label}: локальная версия · ${c.currency}`);
});

document.addEventListener('click',e=>{
  if(!countryMenu.hidden&&!countryMenu.contains(e.target)&&!countryButton.contains(e.target))countryMenu.hidden=true;
});

renderDeals();
renderMarkets();
