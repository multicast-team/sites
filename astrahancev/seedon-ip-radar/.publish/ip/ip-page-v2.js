
(function(){"use strict";
var API2='https://ip.net.coffee/api/ipv2/';
var out=document.getElementById('result');
if(!out)return;
(function(){var sb=document.querySelector('.container > .search-bar');var w=null;if(sb&&!sb.parentNode.classList.contains('search-top-wrap')){w=document.createElement('div');w.className='search-top-wrap';sb.parentNode.insertBefore(w,sb);w.appendChild(sb);sb.classList.add('v2-top');}else if(sb){w=sb.parentNode;}

var h1=document.querySelector('.container > h1');if(h1&&w&&!document.querySelector('.v2-titlebar')){var tb=document.createElement('div');tb.className='v2-titlebar';h1.parentNode.insertBefore(tb,h1);tb.appendChild(h1);tb.appendChild(w);var q=new URLSearchParams(location.search).get('ip');var m=q?[null,q]:null;if(m&&m[1].indexOf(':')!==-1||(m&&m[1].indexOf('%3A')!==-1))h1.classList.add('v2-v6');}})();
var _cap={};
(function(){var of=window.fetch;if(!of)return;window.fetch=function(u,o){var p=of.apply(this,arguments);try{var url=(typeof u==='string')?u:((u&&u.url)||'');var m=url.match(/\/api\/ip\/lookup\/([^?#]+)/);if(m){var ip;try{ip=decodeURIComponent(m[1]);}catch(e){ip=m[1];}var e2=_cap[ip]={data:null,promise:null};e2.promise=p.then(function(r){return r.clone().json();}).then(function(d){e2.data=d;return d;}).catch(function(){e2.data=null;return null;});}}catch(err){}return p;};})();

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function ccZh2(cc,fb){cc=(cc||'').toUpperCase();if(!cc)return fb||'';if(cc==='TW')return'Тайвань';if(cc==='HK')return'Гонконг';if(cc==='MO')return'Макао';try{var n=new Intl.DisplayNames(['ru-RU'],{type:'region'}).of(cc);if(n&&n!==cc)return n;}catch(e){}return fb||cc;}
function roundHalfUp(x){return Math.floor(x+0.5);}
function el(html){var t=document.createElement('div');t.innerHTML=html;return t.firstElementChild;}
function closestGrid(node){while(node&&node!==out){if(node.classList&&(node.classList.contains('grid')||node.classList.contains('grid-3')))return node;node=node.parentNode;}return null;}
function cardByTitle(prefix){var hs=out.querySelectorAll('.result-body .card > h3');for(var i=0;i<hs.length;i++){if(hs[i].textContent.trim().indexOf(prefix)===0)return hs[i].parentNode;}return null;}
function rowByLabel(card,label){if(!card)return null;var kvs=card.querySelectorAll('.kv');for(var i=0;i<kvs.length;i++){var k=kvs[i].querySelector('.k');if(!k)continue;var t=(k.childNodes[0]&&k.childNodes[0].nodeType===3)?k.childNodes[0].textContent.trim():k.textContent.trim();if(t===label)return kvs[i];}return null;}


function tierOf(s){s=Number(s);if(!isFinite(s))return{text:'-',cls:'neutral'};if(s>=95)return{text:'Очень надёжный',cls:'safe'};if(s>=80)return{text:'Надёжный',cls:'safe'};if(s>=50)return{text:'Хорошо',cls:'info'};if(s>=25)return{text:'Нейтральный',cls:'warn'};return{text:'Подозрительный',cls:'danger'};}


var REGION={
  tiktok:{block:['CN','HK','IN','IR','AF','KP','JO','SO','SN','KG','UZ'],partial:[]},
  social:{block:['CN','IR','KP','TM'],partial:['RU','MM']},
  ai:{block:['CN','RU','BY','IR','KP','CU','SY','AF'],partial:['HK','MO','VE','MM']}
};
var NOTE={
  tiktok:{HK:'Гонконг: TikTok 2020 прекратил работу с года, Недоступен',CN:'Материковый Китай: TikTok Недоступен',IN:'Индия: TikTok Заблокирован'},
  social:{RU:'Россия: Instagram / Facebook / X Блокировка, YouTube Ограничение скорости',MM:'Мьянма: Facebook Блокировка',CN:'Материковый Китай: Международные соцсети недоступны'},
  ai:{HK:'Гонконг: ChatGPT ✗ · Claude ✗ · Gemini ✓',MO:'Макао: ChatGPT ✗ · Claude ✗ · Gemini ✓',CN:'Материковый Китай: ChatGPT ✗ · Claude ✗ · Gemini ✗',VE:'Венесуэла: Только Gemini Доступен',MM:'Мьянма: Только Gemini Доступен'}
};
function regionNote(kind,cc,mode){var m=NOTE[kind]||{};if(m[cc])return m[cc];return ccZh2(cc)+': '+(mode==='block'?'Недоступно в этом регионе':'Частично доступно в этом регионе');}
function sceneScores(d){
  var trust=(d.trust_score == null ? NaN : Number(d.trust_score));if(!isFinite(trust))return null;
  var base=roundHalfUp(trust/10);
  var cc=(d.countryCode||'').toUpperCase(),reg=(d.registered_country_code||'').toUpperCase();
  var dc=!!(d.is_datacenter||d.company_type==='hosting'||d.asn_kind==='hosting'||d.asn_kind==='cdn');
  var native=!!(cc&&reg&&cc===reg),broadcast=!!(cc&&reg&&cc!==reg);
  var human=!dc&&!d.is_crawler&&!d.is_public_service;
  var business=(d.company_type||'')==='business';
  var pv=!!(d.is_proxy||d.is_vpn||d.is_tor);
  
  var intel=d.intelligence||{};
  
  var threats=!!d.is_abuser;
  var abRaw=parseFloat(intel.abuser_score_raw!=null?intel.abuser_score_raw:d.abuser_score);
  var abPen=0;if(isFinite(abRaw)){abPen=abRaw>0.05?2:abRaw>0.025?1:abRaw>0.01?0.5:0;}else{var lv=String(intel.abuser_level||'').toLowerCase();abPen=(lv==='high'||lv==='very_high'||lv==='veryhigh')?2:lv==='elevated'?1:0;}
  var hpRaw=(intel.rep_threat!=null&&intel.rep_threat!=='')?intel.rep_threat:intel.httpbl_threat;var hp=Number(hpRaw);var hpPen=(isFinite(hp)&&hp>0)?(hp<=25?1:2):0;
  var crawler=!!d.is_crawler;
  var risky=threats||abPen>0||hpPen>0||crawler||pv;
  function calc(kind){
    var s=base;if(native)s+=0.5;if(human)s+=0.5;if(business)s-=0.5;if(dc)s-=2;if(broadcast)s-=1;if(kind!=='ai'&&dc)s-=1;if(pv)s-=(kind==='ai'?2:3);
    if(threats)s-=(kind==='ai'?0.5:1);s-=abPen;s-=hpPen;if(crawler)s-=0.5;
    s=roundHalfUp(s);if(s<0)s=0;if(s>10)s=10;if(risky&&s>9)s=9;
    var r=REGION[kind];var blocked=r.block.indexOf(cc)>=0,partial=r.partial.indexOf(cc)>=0;
    if(blocked)return{score:0,blocked:true,cls:'off',verdict:'Регион не поддерживается',note:regionNote(kind,cc,'block')};
    if(partial&&s>5)s=5;
    var v,c,tip='';if(partial){v='Частично доступно';c='warn';}else if(s>=10){v='Отлично';c='best';}else if(s>=8){v='Рекомендуется';c='good';}else if(s>=5){if(kind==='ai'){v='Можно попробовать';tip='GPT и Gemini Доступен, Claude Не рекомендуется';}else{v='Доступен';tip='Только«Доступен», это не означает пригодность для работы с аккаунтами';}c='warn';}else{v='Не рекомендуется';c='warn';}
    return{score:s,blocked:false,cls:c,verdict:v,note:partial?regionNote(kind,cc,'partial'):'',tip:tip};
  }
  return{tiktok:calc('tiktok'),social:calc('social'),ai:calc('ai')};
}
function ringHtml(name,r){
  var k=r.score;var fg=k>0?(new Array(k+1).join('8 2 ')+'0 100'):'0 100';
  var inner=r.blocked?'<text x="22" y="26.5" class="rg-num rg-blocked">🚫</text>':'<text x="22" y="26.5" class="rg-num">'+k+'</text>';
  var t='';var tipTxt=r.tip||r.note||'';
  return'<div class="rg '+r.cls+'"'+t+'><svg viewBox="0 0 44 44" aria-label="'+esc(name)+' '+k+'/10"><circle class="rg-track" cx="22" cy="22" r="18" pathLength="100"/><circle class="rg-fill" cx="22" cy="22" r="18" pathLength="100" style="stroke-dasharray:'+fg+'"/>'+inner+'</svg><span class="rg-txt"><span class="rg-name">'+esc(name)+'</span><span class="rg-verdict">'+esc(r.verdict)+(tipTxt?'<span class="tip-wrap">ⓘ<span class="tip-text">'+esc(tipTxt)+'</span></span>':'')+'</span></span></div>';
}


function enhanceHead(d){
  var head=out.querySelector('.ip-head');if(!head)return;
  var sb=head.querySelector('.search-bar');
  if(sb){var cont=out.parentNode;cont.insertBefore(sb,out);sb.classList.add('v2-top');}
  if(head.querySelector('.ip-gauge'))return;
  var sg=head.querySelector('.score-gauge');var trust=(d.trust_score == null ? NaN : Number(d.trust_score));var ok=isFinite(trust);
  var pct=ok?Math.max(0,Math.min(100,trust)):0;
  var g=el('<div class="ip-gauge"><div class="gauge-bar"><div class="gauge-pointer" style="left:'+pct+'%"></div></div><div class="gauge-labels"><span>0 Высокий риск</span><span>25</span><span>50</span><span>75</span><span>100 Надёжный</span></div></div>');
  if(sg){head.insertBefore(g,sg);var t=tierOf(trust);sg.className='score-gauge score-v2 tier-'+t.cls;sg.innerHTML='<span class="score-num">'+(ok?trust:'-')+'</span><span class="score-tier">'+esc(t.text)+'</span>';}
  else head.appendChild(g);
  fitSearch();
}

function fitSearch(){var sb=document.querySelector('.search-top-wrap > .search-bar.v2-top');var head=out.querySelector('.ip-head');var bar=head&&head.querySelector('.gauge-bar');if(!sb||!bar)return;if(innerWidth<=760){sb.style.width='';return;}var w=Math.round(head.getBoundingClientRect().right-bar.getBoundingClientRect().left);if(w>200&&w<head.getBoundingClientRect().width)sb.style.width=w+'px';}
var _fsT=null;window.addEventListener('resize',function(){clearTimeout(_fsT);_fsT=setTimeout(fitSearch,120);});


function enhanceCards(d){
  var typeCard=cardByTitle('Сценарий использования / Тип'),asnCard=cardByTitle('ASN / Оператор');
  if(!typeCard||!asnCard||typeCard.classList.contains('kv-grid'))return;

  var rNative=rowByLabel(typeCard,'IP Нативность');
  if(rNative){var v=rNative.querySelector('.v');var geoZh=ccZh2(d.countryCode,d.country);var chip=v.querySelector('.chip');
    if(chip&&/Бродкаст IP/.test(chip.textContent)){var regZh=ccZh2(d.registered_country_code,d.registered_country);chip.textContent='Бродкаст IP ('+regZh+')';var tip=v.querySelector('.tip-text');if(tip)tip.textContent='IP зарегистрирован в'+regZh+', Геолокация'+geoZh+', Такое расхождение встречается часто, Само по себе не мешает использованию. ';}
    if(geoZh&&!v.querySelector('.geo-zh')){var cc2=(d.countryCode||'').toLowerCase(),ipTxt=currentIp()||'';var fsrc=cc2==='cn'?'https://ip.net.coffee/favicons/cn.png':'https://ip.net.coffee/favicons/flags/'+cc2+'.png';
      var flag=(cc2.length===2)?'<img class="flag-inline" src="'+fsrc+'" alt="'+esc(ipTxt+' принадлежит'+geoZh+' IP')+'" title="'+esc(ipTxt+' принадлежит'+geoZh+' IP')+'" width="20" height="14" loading="lazy" decoding="async">':'';
      v.insertBefore(el('<span class="geo-zh">'+flag+esc(geoZh)+'</span>'),v.firstChild);v.insertBefore(document.createTextNode(' '),v.childNodes[1]||null);}}
  var rAsn=rowByLabel(typeCard,'ASN Принадлежность'),rCo=rowByLabel(typeCard,'Организация'),rHuman=rowByLabel(typeCard,'Люди и боты');
  var rCidr=rowByLabel(asnCard,'CIDR'),rRange=rowByLabel(asnCard,'IP Диапазон'),rAsnNo=rowByLabel(asnCard,'ASN');
  if(rCidr)rCidr.remove();if(rRange)rRange.remove();
  if(rAsn){if(rAsnNo&&rAsnNo.nextSibling)asnCard.insertBefore(rAsn,rAsnNo.nextSibling);else asnCard.appendChild(rAsn);}
  if(rCo)asnCard.appendChild(rCo);
  var sc=sceneScores(d);
  var _v6=String(currentIp()||d.ip||'').indexOf(':')!==-1;
  if(_v6&&rHuman&&!d.is_public_service){
    rHuman.parentNode.insertBefore(el('<div class="kv kv-scene-na"><span class="k">Пригодность по сценариям</span><span class="v v2-scene-na">IPv6 Для этого адреса оценка недоступна</span></div>'),rHuman.nextSibling);
  }else
  if(sc&&rHuman&&!d.is_public_service){
    var row=el('<div class="kv kv-scene"><span class="k">Пригодность по сценариям<span class="tip-wrap">ⓘ<span class="tip-text">Максимум 10 баллов, Чем выше оценка, тем лучше. включает: Отлично, Рекомендуется, Доступен, Можно попробовать, не рекомендуется или доступно частично</span></span></span><span class="v v-scene">'+ringHtml('TikTok',sc.tiktok)+ringHtml('Соцсети',sc.social)+ringHtml('AI Приложение',sc.ai)+'</span></div>');
    rHuman.parentNode.insertBefore(row,rHuman.nextSibling);
  }
  typeCard.classList.add('kv-grid');asnCard.classList.add('kv-grid');
}


function fullCard(id,title,inner,extraCls){return el('<div class="grid v2-grid"><div class="card-full"><div class="card v2sec v2-collapsible'+(extraCls?' '+extraCls:'')+'" id="'+id+'"><h3>'+title+'<button type="button" class="v2-toggle" aria-expanded="false">Развернуть</button></h3><div class="v2-body">'+inner+'</div></div></div></div>');}
document.addEventListener('click',function(e){var b=e.target.closest('.v2-toggle');if(!b)return;e.preventDefault();var c=b.closest('.v2-collapsible');if(!c)return;var open=c.classList.toggle('open');b.textContent=open?'Свернуть':'Развернуть';b.setAttribute('aria-expanded',open?'true':'false');});
function insertAfter(ref,node){if(ref&&ref.parentNode)ref.parentNode.insertBefore(node,ref.nextSibling);}
function loadingHtml(t){return'<div class="v2-loading"><span class="ai-spinner"></span>'+esc(t||'Загрузка…')+'</div>';}
function getJSON(url,ms){return fetch(url,{signal:AbortSignal.timeout(ms||15000)}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});}

function buildSections(ip,d){
  var body=out.querySelector('.result-body');if(!body||body.querySelector('#v2-heat'))return;
  var isV6=ip.indexOf(':')!==-1;
  var pingGrid=document.getElementById('globalPingGrid');var afterPing=pingGrid?closestGrid(pingGrid):null;
  var g3=body.querySelector('.grid-3');
  var histCard=cardByTitle('История геолокации');var histGrid=histCard?closestGrid(histCard):null;
  var asnHxCard=cardByTitle('ASN История');var asnHxGrid=asnHxCard?closestGrid(asnHxCard):null;

  var row2=el('<div class="grid v2-grid v2-row2">'
    +'<div class="card v2sec" id="v2-heat"><h3>Интерес к подсети <span class="v2-sub" id="v2-heat-sub"></span></h3><div class="v2-body">'+(isV6?'<div class="muted v2-note">IPv6 Для этого адреса статистика подсети недоступна</div>':loadingHtml('Загрузка статистики подсети…'))+'</div></div>'
    +'<div class="card v2sec" id="v2-map"><h3>Геолокация на карте</h3><div class="v2-body map-body">'+loadingHtml('Построение карты…')+'</div></div>'
    +'</div>');
  insertAfter(afterPing||g3,row2);
  // BGP + DNSBL
  var bgp=fullCard('v2-bgp','BGP Топология маршрутов',loadingHtml('Загрузка наблюдений маршрутизации…'));
  var dnsbl=fullCard('v2-dnsbl','Мировые чёрные списки угроз и спама (DNSBL)',isV6?'<div class="muted v2-note">IPv6 Для этого адреса проверка чёрных списков недоступна</div>':loadingHtml('Параллельная проверка 12 чёрных списков…'));
  insertAfter(histGrid||row2,bgp);insertAfter(bgp,dnsbl);

  var cos=fullCard('v2-cos','Провайдеры в дата-центре / Клиент',d.asn?loadingHtml('Агрегация одинаковых ASN Записи…'):'<div class="muted v2-note">Нет ASN Информация</div>');
  insertAfter(asnHxGrid||dnsbl,cos);
  renderMap(ip,d);
  if(!isV6)getJSON(API2+'heat/'+encodeURIComponent(ip)).then(function(j){renderHeat(ip,j);}).catch(function(){setBody('v2-heat','<div class="muted v2-note">Не удалось прочитать</div>');});
  getJSON(API2+'bgp/'+encodeURIComponent(ip),22000).then(function(j){renderBgp(j);}).catch(function(){setBody('v2-bgp','<div class="muted v2-note">Не удалось получить данные маршрутизации</div>');});
  if(!isV6)getJSON(API2+'dnsbl/'+encodeURIComponent(ip),15000).then(function(j){renderDnsbl(j);}).catch(function(){setBody('v2-dnsbl','<div class="muted v2-note">Проверка чёрных списков недоступна</div>');});
  if(d.asn)pollCos(d,0);
}
function pollCos(d,tries){
  getJSON(API2+'asncos/'+encodeURIComponent(d.asn),15000).then(function(j){
    if(j&&j.pending){if(tries<12){setTimeout(function(){pollCos(d,tries+1);},1500);}else{setBody('v2-cos','<div class="muted v2-note">Истекло время сбора данных, Обновите страницу позже</div>');}return;}
    renderCos(j,d);
  }).catch(function(){setBody('v2-cos','<div class="muted v2-note">Не удалось прочитать</div>');});
}
function setBody(id,html){var c=document.getElementById(id);if(!c)return;var b=c.querySelector('.v2-body');if(b)b.innerHTML=html;else{var nb=document.createElement('div');nb.className='v2-body';nb.innerHTML=html;c.appendChild(nb);}}


var HEAT_TIP={'Популярный':'Очень высокий интерес, Часто связано с рекламными акциями, Популярные продукты, либо используется прокси, NAT, WARP и другие общедоступные выходы','Активный':'Высокий интерес, Высокий интерес к подсети, Часто связано с рекламными акциями, Популярные продукты, возможно, адреса введены в эксплуатацию недавно IP подсеть','Доступен':'Нормальный уровень, Часто встречается IP либо пользователи проверяют собственный выходной адрес IP','Низкий интерес':'Низкий интерес IP подсеть, Редко используется, Интерес к подсети невысок'};
var HEAT_CLS={'Популярный':'ht-m-hot','Активный':'ht-m-act','Доступен':'ht-m-nor','Низкий интерес':'ht-m-cold'};
var _heatLast=null;
function md(s){return (s||'').slice(5).replace('-','/');}
function renderHeat(ip,j){
  if(!j||j.error||j.supported===false){setBody('v2-heat','<div class="muted v2-note">Данных пока нет</div>');return;}
  _heatLast=j;var vals=j.vals||[],days=j.days||[],n=vals.length;if(n<2){setBody('v2-heat','<div class="muted v2-note">Данных пока нет</div>');return;}
  var card=document.getElementById('v2-heat');var W=Math.max(320,Math.round(((card&&card.clientWidth)||520)-36)),H=118,TOP=22;
  function X(i){return i/(n-1)*W;}function Y(v){return H-2-(v/100)*(H-TOP-2);}
  var pts=vals.map(function(v,i){return [X(i),Y(v)];});
  var line='M'+pts[0][0].toFixed(1)+','+pts[0][1].toFixed(1);
  for(var i=1;i<n;i++){var x0=pts[i-1][0],y0=pts[i-1][1],x1=pts[i][0],y1=pts[i][1],cx=(x0+x1)/2;line+=' C'+cx.toFixed(1)+','+y0.toFixed(1)+' '+cx.toFixed(1)+','+y1.toFixed(1)+' '+x1.toFixed(1)+','+y1.toFixed(1);}
  var area=line+' L'+W+','+H+' L0,'+H+' Z';
  var pk=j.peak||{};var pi=(typeof pk.i==='number')?pk.i:0;var px=pts[pi][0],py=pts[pi][1];var pa=px<W/2?'start':'end';var ptx=pa==='start'?px+8:px-8;
  var peak='<g class="ht-peak"><line x1="'+px.toFixed(1)+'" y1="'+py.toFixed(1)+'" x2="'+px.toFixed(1)+'" y2="'+H+'"/><circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="4"/><text x="'+ptx.toFixed(1)+'" y="'+Math.max(13,py-10).toFixed(1)+'" text-anchor="'+pa+'">Пик '+vals[pi]+' · '+esc(md(days[pi]))+'</text></g>';
  var dots='';for(var k=0;k<n;k++){var x=pts[k][0],y=pts[k][1];var an=x<W*0.25?'start':x>W*0.75?'end':'middle';dots+='<g class="ht-pt"><rect x="'+(x-W/(2*(n-1))).toFixed(1)+'" y="0" width="'+(W/(n-1)).toFixed(1)+'" height="'+H+'" fill="transparent"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3"/><text x="'+x.toFixed(1)+'" y="'+Math.max(12,y-9).toFixed(1)+'" text-anchor="'+an+'">'+esc(md(days[k]))+' · '+vals[k]+'</text></g>';}
  var svg='<svg viewBox="0 0 '+W+' '+H+'" class="ht-trend" role="img" aria-label="Динамика интереса к подсети"><defs><linearGradient id="htg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ht-g0"/><stop offset="1" class="ht-g1"/></linearGradient></defs><path d="'+area+'" fill="url(#htg)"/><path class="ht-line" d="'+line+'"/>'+peak+dots+'</svg>';
  var chg=Number(j.chg)||0;var arrow=chg>8?'↑':chg<-8?'↓':'→';var chgTxt=(chg>0?'+':'')+chg+'%';
  var mode=j.mode||'Доступен';
  var html='<div class="ht-top">'
    +'<div class="ht-tile ht-idx"><b>'+(Number(j.idx)||0)+'</b><span>Индекс интереса<span class="tip-wrap">ⓘ<span class="tip-text">Максимальное значение 100, Не в масштабе, Показывает только динамику</span></span></span></div>'
    +'<div class="ht-tile"><b>'+arrow+' '+esc(chgTxt)+'</b><span>последние 7 дн. относительно предыдущих 7 дн.</span></div>'
    +'<div class="ht-tile '+(HEAT_CLS[mode]||'')+'"><b>'+esc(mode)+'</b><span>Динамика<span class="tip-wrap">ⓘ<span class="tip-text">'+esc(HEAT_TIP[mode]||'')+'</span></span></span></div>'
    +'</div><div class="ht-chart">'+svg+'<div class="ht-axis"><span>'+esc(md(days[0]))+'</span><span>'+esc(md(days[n-1]))+'</span></div></div>'
    +'<div class="ht-foot">Обновляется ежедневно · Индекс и график отражают относительную динамику, Не отражает абсолютное число</div>';
  setBody('v2-heat',html);
  var sub=document.getElementById('v2-heat-sub');if(sub)sub.textContent=(j.base||ip.split('.').slice(0,3).join('.'))+'.0/24 · последние 14 дн.';
}
var _heatRT=null;addEventListener('resize',function(){if(!_heatLast)return;clearTimeout(_heatRT);_heatRT=setTimeout(function(){var ip=currentIp();if(ip&&document.getElementById('v2-heat'))renderHeat(ip,_heatLast);},200);});


var _land=null,_landP=null;
function landPath(){if(_land)return Promise.resolve(_land);if(_landP)return _landP;_landP=fetch(window.radarURL('ip/land110.txt'),{cache:'force-cache'}).then(function(r){return r.text();}).then(function(t){_land=t;return t;});return _landP;}
function renderMap(ip,d){
  var gs=Array.isArray(d.geo_sources)?d.geo_sources:[];var rank={g1:0,g7:1,g3:2,g2:3};
  var pts=gs.filter(function(r){return r&&r.lat!=null&&r.lon!=null&&isFinite(r.lat)&&isFinite(r.lon);}).sort(function(a,b){return (rank[a.src]==null?9:rank[a.src])-(rank[b.src]==null?9:rank[b.src]);});
  if(!pts.length){setBody('v2-map','<div class="muted v2-note">Координаты отсутствуют</div>');return;}
  var p0=pts[0];var W=1000,H=500;function px(lon){return (lon+180)/360*W;}function py(lat){return (90-lat)/180*H;}
  var cx=px(p0.lon),cy=py(p0.lat);var vw=94.4,vh=47.2;var vx=Math.max(0,Math.min(W-vw,cx-vw/2)),vy=Math.max(0,Math.min(H-vh,cy-vh/2));
  var city=[d.city||p0.city,d.country?ccZh2(d.countryCode,d.country):''].filter(Boolean).join(' · ');
  landPath().then(function(path){
    var pins=pts.slice(1).map(function(p){return'<circle cx="'+px(p.lon).toFixed(2)+'" cy="'+py(p.lat).toFixed(2)+'" r=".28" fill="var(--v2-accent)" opacity=".9"/>';}).join('');
    var html='<a class="map" href="https://www.google.com/maps?q='+encodeURIComponent(p0.lat+','+p0.lon)+'" target="_blank" rel="nofollow noopener noreferrer" title="'+esc('в Google Открыть на карте'+ip+'для IP Точка на карте')+'">'
      +'<svg viewBox="'+vx.toFixed(2)+' '+vy.toFixed(2)+' '+vw+' '+vh+'" preserveAspectRatio="xMidYMid slice"><path class="land" d="'+path+'"/>'
      +'<g transform="translate('+cx.toFixed(2)+','+cy.toFixed(2)+')"><circle class="pulse" r="2.2" fill="var(--v2-pin)" opacity=".22"><animate attributeName="r" values="1.8;3.6;1.8" dur="2.4s" repeatCount="indefinite"/></circle><circle class="pin" r=".9" fill="var(--v2-pin)" stroke="#fff" stroke-width=".25"/><text x="'+(((cx-vx)/vw)>0.58?'-2':'2')+'" y=".85" text-anchor="'+(((cx-vx)/vw)>0.58?'end':'start')+'" class="map-label">'+esc(city.length>26?city.slice(0,25)+'…':city)+'</text></g>'+pins+'</svg>'
      +'<div class="coord">'+p0.lat.toFixed(2)+', '+p0.lon.toFixed(2)+'</div>'
      +'<div class="srcs"><span><i style="background:var(--v2-pin)"></i>Основная геолокация<em class="map-coord"> · '+p0.lat.toFixed(2)+', '+p0.lon.toFixed(2)+'</em></span>'+(pts.length>1?'<span><i style="background:var(--v2-accent)"></i>Другие источники<em class="map-cnt"> '+(pts.length-1)+' шт.</em></span>':'')+'</div>'
      +'<div class="inset"><svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice"><rect width="1000" height="500" fill="var(--v2-sea)"/><path class="land" d="'+path+'"/><circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="9" fill="var(--v2-pin)"/></svg></div></a>';
    setBody('v2-map',html);fitMap();try{var _ma=document.querySelector('#v2-map .map');if(_ma&&window.ResizeObserver){new ResizeObserver(function(){fitMap();}).observe(_ma);}}catch(e){}
  }).catch(function(){setBody('v2-map','<div class="muted v2-note">Не удалось загрузить карту</div>');});
}

function fitMap(){
  var a=document.querySelector('#v2-map .map');if(!a)return;var svg=a.querySelector('svg');if(!svg)return;
  var vb=(svg.getAttribute('viewBox')||'').split(' ');var vw=parseFloat(vb[2])||94.4;var mw=a.clientWidth||520;var k=vw/mw;
  var mobile=innerWidth<=700;var fs=(mobile?14:13.5)*k,pr=(mobile?6.5:5.5)*k,gap=(mobile?10:9)*k;
  var t=svg.querySelector('.map-label');if(t){t.style.fontSize=fs.toFixed(3)+'px';t.style.strokeWidth=(2.5*k).toFixed(3)+'px';t.setAttribute('y',(fs*0.36).toFixed(3));t.setAttribute('x',(t.getAttribute('text-anchor')==='end'?-gap:gap).toFixed(3));}
  var pin=svg.querySelector('.pin');if(pin){pin.setAttribute('r',pr.toFixed(3));pin.setAttribute('stroke-width',(1.6*k).toFixed(3));}
  var pu=svg.querySelector('.pulse');if(pu){pu.setAttribute('r',(pr*2.4).toFixed(3));var an=pu.querySelector('animate');if(an)an.setAttribute('values',(pr*2).toFixed(3)+';'+(pr*4).toFixed(3)+';'+(pr*2).toFixed(3));}
}
var _mapRT=null;addEventListener('resize',function(){clearTimeout(_mapRT);_mapRT=setTimeout(fitMap,150);});


function humanEstimate(d){
  var t=(d.company_type||'').toLowerCase(),k=(d.asn_kind||'').toLowerCase();var h;
  if(d.is_public_service)h=2;else if(d.is_crawler)h=6;else if(d.is_mobile||k==='mobile')h=93;
  else if(d.is_datacenter||t==='hosting'||k==='hosting'||k==='cdn')h=18;else if(t==='business')h=65;else h=88;
  return h;
}
function humanAdjust(h,d){
  if(d.is_tor)h*=0.4;else if(d.is_proxy||d.is_vpn)h*=0.6;
  if(d.is_crawler)h=Math.min(h,h*0.3+2);if(d.is_abuser)h-=5;
  return Math.max(1,Math.min(99,h));
}
function syncHumanPill(hb,h){
  
  var row=hb.closest('.kv');if(!row)return;var pill=row.querySelector('.ht-pill');if(!pill)return;
  if(pill.classList.contains('ht-pill-satellite')||pill.classList.contains('ht-pill-crawler'))return;
  var kind=h>=55?'human':h>=40?'mix':'robot';var txt={human:'Преимущественно люди',mix:'Смешанный трафик',robot:'Преимущественно боты'}[kind];var icon={human:'#htp-human',mix:'#htp-human',robot:'#htp-robot'}[kind];
  pill.className='ht-pill ht-pill-'+kind;var use=pill.querySelector('use');if(use){use.setAttribute('href',icon);}var sp=pill.querySelector('span');if(sp)sp.textContent=txt;
}
function drawHumanBar(hb,h,note){
  var b=100-h;hb.classList.remove('loading');hb.title=note;syncHumanPill(hb,h);
  hb.innerHTML='<span class="hb-bar"><i style="width:'+h.toFixed(1)+'%"></i></span><span class="hb-lbl"><em class="h">Люди '+h.toFixed(1)+'%</em><em class="b">Боты '+b.toFixed(1)+'%</em></span>';
}
function renderHumanBar(d){
  var card=cardByTitle('Сценарий использования / Тип');if(!card)return;var row=rowByLabel(card,'Люди и боты');if(!row)return;
  var v=row.querySelector('.v');if(!v||v.querySelector('.hb'))return;
  v.classList.add('v-hb');row.classList.add('kv-hb');
  var hb=el('<span class="hb loading"><span class="hb-bar"><i></i></span><span class="hb-lbl"><em class="h">&nbsp;</em><em class="b">&nbsp;</em></span></span>');
  v.insertBefore(hb,v.firstChild);
  function est(){drawHumanBar(hb,humanAdjust(humanEstimate(d),d),'Расчётное значение: Оценка по типу сети и признакам риска');}
  if(!d.asn){est();return;}
  getJSON(API2+'radar/'+encodeURIComponent(d.asn),14000).then(function(j){
    if(j&&j.ok&&typeof j.human==='number'){drawHumanBar(hb,humanAdjust(j.human,d),'последние 28 дн. статистики, с учётом текущего IP Поправка по признакам риска');}else est();
  }).catch(est);
}

/* ---------- BGP ---------- */
function bgpName(n,max){n=(n||'').trim();return n.length>max?n.slice(0,max-1)+'…':n;}
function bgpNode(x,y,asn,name,cls,w){var mx=(w||176)>=200?24:20;return'<g class="bn '+cls+'" transform="translate('+x+','+y+')"><rect width="'+(w||176)+'" height="46" rx="8"/><text x="12" y="19" class="bn-asn">AS'+asn+'</text><text x="12" y="36" class="bn-name">'+esc(bgpName(name,mx))+'</text></g>';}
function bgpSvg(p){
  var ups=(p.upstreams||[]).slice(0,4);var sec=(p.second||[]).slice(0,8);var origin=(p.origins||[])[0]||{asn:'?',name:''};
  var TOP=30;var H=Math.max(220,Math.max(ups.length,sec.length)*58+TOP+10);var svg='<svg viewBox="0 0 980 '+H+'" class="bgp" role="img" aria-label="BGP Топология маршрутов">';
  var oy=(H+TOP)/2-23;svg+=bgpNode(20,oy,origin.asn,origin.name,'origin',190);
  var ux=330;var uys=ups.map(function(_,i){return TOP+i*(ups.length>1?(H-TOP-56)/(ups.length-1):0);});if(ups.length===1)uys=[oy];
  ups.forEach(function(u,i){var w=1+u.share/12;svg+='<path class="be" style="stroke-width:'+w.toFixed(1)+'" d="M210,'+(oy+23)+' C270,'+(oy+23)+' 270,'+(uys[i]+23)+' '+ux+','+(uys[i]+23)+'"/>';svg+='<text x="'+(ux-62)+'" y="'+(uys[i]+18)+'" class="be-lbl">'+u.share+'%</text>';});
  var tx=700;var tys=sec.map(function(_,i){return TOP+i*(sec.length>1?(H-TOP-56)/(sec.length-1):0);});
  sec.forEach(function(s,i){var ui=-1;ups.forEach(function(u,k){if(u.asn===s.via)ui=k;});if(ui<0)return;var w=1+s.share/12;svg+='<path class="be" style="stroke-width:'+w.toFixed(1)+'" d="M'+(ux+176)+','+(uys[ui]+23)+' C'+(ux+240)+','+(uys[ui]+23)+' '+(ux+240)+','+(tys[i]+23)+' '+tx+','+(tys[i]+23)+'"/>';});
  ups.forEach(function(u,i){svg+=bgpNode(ux,uys[i],u.asn,u.name,'up'+(u.tier1?' t1':''));});
  sec.forEach(function(s,i){svg+=bgpNode(tx,tys[i],s.asn,s.name,s.tier1?'t1':'t2',200);});
  svg+='<text x="20" y="'+(oy-8)+'" class="col-lbl">источник AS</text><text x="330" y="16" class="col-lbl">Прямой транзит · Доля маршрутов</text><text x="700" y="16" class="col-lbl">Вторичный транзит · Синяя рамка = Tier 1</text></svg>';return svg;
}
function bgpList(p){
  var ups=(p.upstreams||[]).slice(0,4);var sec=(p.second||[]).slice(0,8);var origin=(p.origins||[])[0]||{asn:'?',name:''};
  function row(n,extra,cls){var sh=Number(n.share)||0;return'<div class="bl-row'+(cls?' '+cls:'')+'"><b>AS'+esc(String(n.asn))+'</b><span>'+esc(bgpName(n.name,30))+(extra||'')+'</span><em>'+sh.toFixed(1)+'%</em><i style="width:'+Math.max(2,Math.min(100,sh))+'%"></i></div>';}
  var h='<div class="bgp-list"><div class="bl-h">источник AS</div><div class="bl-row origin"><b>AS'+esc(String(origin.asn))+'</b><span>'+esc(bgpName(origin.name,30))+'</span></div>';
  h+='<div class="bl-h">Прямой транзит · Доля маршрутов</div>'+ups.map(function(u){return row(u,'',u.tier1?'t1':'');}).join('');
  if(sec.length)h+='<div class="bl-h">Вторичный транзит · Синий = Tier 1</div>'+sec.map(function(x){return row(x,x.via?'<small>через AS'+esc(String(x.via))+'</small>':'',x.tier1?'t1':'');}).join('');
  return h+'</div>';
}
function renderBgp(p){
  if(!p||p.error||p.ok===false||!p.upstreams||!p.upstreams.length){setBody('v2-bgp','<div class="muted v2-note">Данных наблюдения маршрутов нет</div>');return;}
  var snaps=(p.snapshots||[]);
  var thumbs=snaps.map(function(s,i){var dt=new Date((s.taken_at||0)*1000).toISOString().slice(0,10);return'<button class="th'+(i===0?' cur':'')+'" type="button" data-i="'+i+'"><span>'+dt+'</span><small>'+(i===0?'Текущий · ':'')+(s.upstreams||[]).length+' Транзит</small></button>';}).join('');
  var sub='<span class="v2-sub">'+esc(p.prefix||'')+' · '+(p.paths||0)+' наблюдаемых маршрутов</span>';
  var h3=document.querySelector('#v2-bgp > h3');if(h3&&!h3.querySelector('.v2-sub'))h3.insertAdjacentHTML('beforeend',' '+sub);
  setBody('v2-bgp','<div class="ths">'+thumbs+'</div><div class="bgp-wrap">'+bgpSvg(p)+'</div>'+bgpList(p)+'<div class="muted v2-foot">Нажмите дату, чтобы открыть исторический снимок; Толщина линий = Доля маршрутов, Синий = Tier 1 Магистраль. </div>');
  var wrap=document.querySelector('#v2-bgp .ths');if(wrap)wrap.addEventListener('click',function(e){var b=e.target.closest('.th');if(!b)return;var i=parseInt(b.dataset.i,10);var s=snaps[i];if(!s)return;wrap.querySelectorAll('.th').forEach(function(x){x.classList.toggle('cur',x===b);});var q={origins:p.origins,upstreams:s.upstreams,second:s.second};var w2=document.querySelector('#v2-bgp .bgp-wrap');if(w2)w2.innerHTML=bgpSvg(q);var l2=document.querySelector('#v2-bgp .bgp-list');if(l2)l2.outerHTML=bgpList(q);});
}

/* ---------- DNSBL ---------- */
var CAT_ZH={Spam:'Спам',Botnet:'Ботнет',Malware:'Вредоносный код',Reputation:'Репутация','Proxy/Tor':'Прокси/Tor'};
function renderDnsbl(p){
  if(!p||p.error||p.ok===false||!Array.isArray(p.results)||!p.results.length){setBody('v2-dnsbl','<div class="muted v2-note">Проверка чёрных списков недоступна</div>');return;}
  var PBL={'127.0.0.10':1,'127.0.0.11':1};
  var res=p.results.map(function(r){var o={};for(var k in r)o[k]=r[k];if(o.listed&&/spamhaus/i.test(o.zone||'')){var real=(o.codes||[]).filter(function(c){return !PBL[c];});if(!real.length){o.listed=false;o.pbl=true;}else{o.codes=real;}}return o;});
  var listed=res.filter(function(r){return r.listed;}).length;var to=res.filter(function(r){return r.status==='timeout';}).length;
  var cats={};res.forEach(function(r){cats[r.category]=(cats[r.category]||0)+1;});
  var tabs='<button class="tab on" data-cat="">Все ('+res.length+')</button>'+Object.keys(cats).map(function(c){return'<button class="tab" data-cat="'+esc(c)+'">'+esc(CAT_ZH[c]||c)+' ('+cats[c]+')</button>';}).join('');
  var engs=res.map(function(r){var pill=r.listed?'<span class="pill bad">Чёрный список'+(r.codes&&r.codes.length?' '+esc(r.codes[0]):'')+'</span>':(r.pbl?'<span class="pill ok">Надёжный<span class="tip-wrap">ⓘ<span class="tip-text">Spamhaus PBL Список правил: Отмечен как домашний / Динамический IP подсеть не должна отправлять почту напрямую, связано с политикой подсети оператора, Не означает, что IP есть сведения о вредоносной активности или спаме, учтён как надёжный. </span></span></span>':(r.status==='timeout'?'<span class="pill mute">Тайм-аут</span>':'<span class="pill ok">Надёжный</span>'));return'<div class="eng" data-cat="'+esc(r.category)+'"><div class="eng-top"><div><b>'+esc(r.engine)+'</b><div class="mono muted">'+esc(r.zone)+'</div></div>'+pill+'</div><div class="eng-bot"><span class="tag">'+esc(CAT_ZH[r.category]||r.category)+'</span><span class="muted mono">'+(r.ms||0)+' ms</span></div></div>';}).join('');
  var kpis='<div class="kpis"><div class="kpi"><b>'+res.length+'</b><span>Источник проверки</span></div><div class="kpi '+(listed?'':'ok')+'"><b>'+(res.length-listed-to)+'</b><span>Надёжный</span></div><div class="kpi '+(listed?'bad':'')+'"><b>'+listed+'</b><span>Чёрный список</span></div>'+(to?'<div class="kpi"><b>'+to+'</b><span>Тайм-аут</span></div>':'')+'</div>';
  var h3=document.querySelector('#v2-dnsbl > h3');if(h3&&!h3.querySelector('.kpis'))h3.insertAdjacentHTML('beforeend',kpis);
  setBody('v2-dnsbl','<div class="tabs" id="v2-dtabs">'+tabs+'</div><div class="engs" id="v2-engs">'+engs+'</div>');
  var tb=document.getElementById('v2-dtabs');if(tb)tb.addEventListener('click',function(e){var t=e.target.closest('.tab');if(!t)return;tb.querySelectorAll('.tab').forEach(function(x){x.classList.toggle('on',x===t);});var c=t.dataset.cat;document.querySelectorAll('#v2-engs .eng').forEach(function(n){n.hidden=!!c&&n.dataset.cat!==c;});});
}


function renderCos(j,d){
  var list=((j&&Array.isArray(j.companies))?j.companies:[]).filter(function(c){var n=String(c&&c.name||'').trim();return n&&!/^(n\/a|na|none|null|unknown|-|—)$/i.test(n);});
  if(!list.length){setBody('v2-cos','<div class="muted v2-note">Не найдены совпадающие ASN Запись об организации</div>');return;}
  function tag(t){t=(t||'').toLowerCase();if(t==='hosting')return'<span class="tag idc">IDC</span>';if(t==='business')return'<span class="tag biz">Организация</span>';if(t==='isp')return'<span class="tag isp">ISP</span>';return'';}
  var rows=list.map(function(c){return'<div class="co" data-type="'+esc((c.type||'').toLowerCase())+'"><span class="co-name" title="'+esc(c.name)+'">'+esc(c.name)+'</span><span class="co-meta">'+tag(c.type)+'</span></div>';}).join('');
  var hasIdc=list.some(function(c){return (c.type||'').toLowerCase()==='hosting';});
  var tabs=hasIdc?'<div class="tabs" id="v2-ctabs"><button class="tab on" data-t="">Показать всё</button><button class="tab" data-t="hosting">Только IDC</button></div>':'';
  setBody('v2-cos',tabs+'<div class="cogrid" id="v2-cogrid">'+rows+'</div>');
  var h3=document.querySelector('#v2-cos > h3');if(h3&&!h3.querySelector('.v2-sub'))h3.insertAdjacentHTML('beforeend',' <span class="v2-sub">AS'+esc(String(j.asn||d.asn||''))+'</span>');
  var tb=document.getElementById('v2-ctabs');if(tb)tb.addEventListener('click',function(e){var t=e.target.closest('.tab');if(!t)return;tb.querySelectorAll('.tab').forEach(function(x){x.classList.toggle('on',x===t);});var c=t.dataset.t;document.querySelectorAll('#v2-cogrid .co').forEach(function(n){n.hidden=!!c&&n.dataset.type!==c;});});
}


function currentIp(){var q=new URLSearchParams(location.search).get('ip');var m=q?[null,q]:null;if(m){try{return decodeURIComponent(m[1]);}catch(e){return m[1];}}var a=out.querySelector('.ip-head a.ip');return a?a.textContent.trim():'';}
function ready(){var b=out.querySelector('.result-body');if(!b)return false;if(b.querySelector('.skeleton-card'))return false;return !!cardByTitle('ASN / Оператор');}
function enhance(){
  if(!ready())return;var ip=currentIp();if(!ip)return;var body=out.querySelector('.result-body');
  if(body.getAttribute('data-v2')===ip)return;body.setAttribute('data-v2',ip);
  function apply(d){if(!d||d.error||d.is_bogon)return;try{enhanceHead(d);}catch(e){}try{enhanceCards(d);}catch(e){}try{renderHumanBar(d);}catch(e){}if(d.is_public_service)return;try{buildSections(ip,d);}catch(e){}}
  var cap=_cap[ip];
  if(cap&&cap.data){apply(cap.data);return;}
  if(cap&&cap.promise){cap.promise.then(function(d){if(d)apply(d);else fallback();});return;}
  fallback();
  function fallback(){fetch(API2+'lookup/'+encodeURIComponent(ip),{signal:AbortSignal.timeout(20000)}).then(function(r){return r.json();}).then(apply).catch(function(){body.removeAttribute('data-v2');});}
}
var mo=new MutationObserver(function(){enhance();});
mo.observe(out,{childList:true,subtree:true});
enhance();
})();
