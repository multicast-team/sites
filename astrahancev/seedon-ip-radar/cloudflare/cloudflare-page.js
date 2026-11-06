

const CF_COLOS = {"AAE":["Annabah","DZ"],"ABJ":["Abidjan","CI"],"ABQ":["Albuquerque","US"],"ACC":["Accra","GH"],"ACX":["Xingyi","CN"],"ADB":["Izmir","TR"],"ADD":["Addis Ababa","ET"],"ADL":["Adelaide","AU"],"AGR":["","IN"],"AIP":["","IN"],"AKL":["Auckland","NZ"],"AKX":["Aktyubinsk","KZ"],"ALA":["Almaty","KZ"],"ALG":["Algiers","DZ"],"AMD":["Ahmedabad","IN"],"AMM":["Amman","JO"],"AMS":["Amsterdam","NL"],"ANC":["Anchorage","US"],"ARI":["Arica","CL"],"ARN":["Stockholm","SE"],"ARU":["Aracatuba","BR"],"ASK":["Yamoussoukro","CI"],"ASU":["Asuncion","PY"],"ATH":["Athens","GR"],"ATL":["Atlanta","US"],"AUS":["Austin","US"],"AVA":["Anshun","CN"],"BAH":["Manama","BH"],"BAQ":["Barranquilla","CO"],"BBI":["Bhubaneswar","IN"],"BCN":["Barcelona","ES"],"BDQ":["Vadodara","IN"],"BEG":["Belgrad","RS"],"BEL":["Belem","BR"],"BEY":["Beirut","LB"],"BGI":["Bridgetown","BB"],"BGR":["Bangor","US"],"BGW":["Baghdad","IQ"],"BKK":["Bangkok","TH"],"BLR":["Bangalore","IN"],"BNA":["Nashville","US"],"BNE":["Brisbane","AU"],"BOD":["Bordeaux/Merignac","FR"],"BOG":["Bogota","CO"],"BOM":["Mumbai","IN"],"BOS":["Boston","US"],"BRU":["Brussels","BE"],"BSB":["Brasilia","BR"],"BSR":["Basrah","IQ"],"BTS":["Bratislava","SK"],"BUD":["Budapest","HU"],"BUF":["Buffalo","US"],"BWN":["Bandar Seri Begawan","BN"],"CAI":["Cairo","EG"],"CAN":["Guangzhou","CN"],"CAW":["Campos Dos Goytacazes","BR"],"CBR":["Canberra","AU"],"CCU":["Kolkata","IN"],"CDG":["Paris","FR"],"CEB":["Lapu-Lapu City","PH"],"CFC":["Caçador","BR"],"CGB":["Cuiaba","BR"],"CGD":["Changde","CN"],"CGK":["Jakarta","ID"],"CGO":["Zhengzhou","CN"],"CGP":["Chittagong","BD"],"CGY":["Cagayan De Oro City","PH"],"CHC":["Christchurch","NZ"],"CJB":["Coimbatore","IN"],"CKG":["Chongqing","CN"],"CLE":["Cleveland","US"],"CLO":["Cali","CO"],"CLT":["Charlotte","US"],"CMB":["Colombo","LK"],"CMH":["Columbus","US"],"CNF":["Belo Horizonte","BR"],"CNN":["Mattanur","IN"],"CNX":["Chiang Mai","TH"],"COK":["Cochin","IN"],"COR":["Cordoba","AR"],"CPH":["Copenhagen","DK"],"CPT":["Cape Town","ZA"],"CRK":["Mabalacat","PH"],"CSX":["Changsha","CN"],"CTU":["Chengdu","CN"],"CVG":["Hebron","US"],"CWB":["Curitiba","BR"],"CZL":["Constantine","DZ"],"CZX":["Changzhou","CN"],"DAC":["Dhaka","BD"],"DAD":["Da Nang","VN"],"DAR":["Dar es Salaam","TZ"],"DEL":["New Delhi","IN"],"DEN":["Denver","US"],"DFW":["Dallas-Fort Worth","US"],"DKR":["Dakar","SN"],"DLA":["Douala","CM"],"DLC":["Dalian","CN"],"DME":["Moscow","RU"],"DMM":["Ad Dammam","SA"],"DOH":["Doha","QA"],"DPS":["Denpasar-Bali Island","ID"],"DTW":["Detroit","US"],"DUB":["Dublin","IE"],"DUR":["Durban","ZA"],"DUS":["Dusseldorf","DE"],"DXB":["Dubai","AE"],"DYU":["Dushanbe","TJ"],"EBB":["Kampala","UG"],"EBL":["Arbil","IQ"],"EVN":["Yerevan","AM"],"EWR":["Newark","US"],"EZE":["Ezeiza","AR"],"FCO":["Rome","IT"],"FIH":["Kinshasa","CD"],"FLN":["Florianopolis","BR"],"FOC":["Fuzhou","CN"],"FOR":["Fortaleza","BR"],"FRA":["Frankfurt-am-Main","DE"],"FRU":["Bishkek","KG"],"FSD":["Sioux Falls","US"],"FUK":["Fukuoka","JP"],"FUO":["Foshan","CN"],"GBE":["Gaborone","BW"],"GDL":["Guadalajara","MX"],"GEO":["Georgetown","GY"],"GIG":["Rio De Janeiro","BR"],"GND":["Saint George's","GD"],"GOT":["Gothenburg","SE"],"GRU":["Sao Paulo","BR"],"GUA":["Guatemala City","GT"],"GUM":["Hagatna","GU"],"GVA":["Geneva","CH"],"GYD":["Baku","AZ"],"GYE":["Guayaquil","EC"],"GYN":["Goiania","BR"],"HAK":["Haikou","CN"],"HAM":["Hamburg","DE"],"HAN":["Hanoi","VN"],"HBA":["Hobart","AU"],"HEL":["Helsinki","FI"],"HFA":["Haifa","IL"],"HGH":["Shaoxing","CN"],"HKG":["Hong Kong","HK"],"HNL":["Honolulu","US"],"HRE":["Harare","ZW"],"HYD":["Hyderabad","IN"],"HYN":["Taizhou","CN"],"IAD":["Dulles","US"],"IAH":["Houston","US"],"ICN":["Seoul","KR"],"IND":["Indianapolis","US"],"ISB":["Islamabad","PK"],"IST":["Arnavutkoy","TR"],"ISU":["Sulaymaniyah","IQ"],"IXC":["Chandigarh","IN"],"JAX":["Jacksonville","US"],"JDO":["Juazeiro Do Norte","BR"],"JED":["Jeddah","SA"],"JHB":["Senai","MY"],"JIB":["Djibouti City","DJ"],"JNB":["Johannesburg","ZA"],"JOG":["Yogyakarta-Java Island","ID"],"JOI":["Joinville","BR"],"JRG":["Jharsuguda","IN"],"JXG":["Jiaxing","CN"],"KBP":["Kiev","UA"],"KCH":["Kuching","MY"],"KEF":["Reykjavik","IS"],"KGL":["Kigali","RW"],"KHH":["Kaohsiung City","TW"],"KHI":["Karachi","PK"],"KHN":["Xinyu","CN"],"KIN":["Kingston","JM"],"KIV":["Chișinău","MD"],"KIX":["Osaka","JP"],"KMG":["Kunming","CN"],"KNU":["Kanpur","IN"],"KTM":["Kathmandu","NP"],"KUL":["Kuala Lumpur","MY"],"KWE":["Guiyang","CN"],"KWI":["Kuwait City","KW"],"LAD":["Luanda","AO"],"LAS":["Las Vegas","US"],"LAX":["Los Angeles","US"],"LCA":["Larnarca","CY"],"LED":["St. Petersburg","RU"],"LHE":["Lahore","PK"],"LHR":["London","GB"],"LHW":["Lanzhou","CN"],"LIM":["Lima","PE"],"LIS":["Lisbon","PT"],"LJU":["Ljubljana","SI"],"LLK":["Lankaran","AZ"],"LLW":["Lilongwe","MW"],"LOS":["Lagos","NG"],"LPB":["La Paz / El Alto","BO"],"LUH":["","IN"],"LUN":["Lusaka","ZM"],"LUX":["Luxembourg","LU"],"LYA":["Luoyang","CN"],"LYS":["Lyon","FR"],"MAA":["Chennai","IN"],"MAD":["Madrid","ES"],"MAN":["Manchester","GB"],"MAO":["Manaus","BR"],"MBA":["Mombasa","KE"],"MCI":["Kansas City","US"],"MCT":["Muscat","OM"],"MDE":["Rionegro","CO"],"MEL":["Melbourne","AU"],"MEM":["Memphis","US"],"MEX":["Mexico City","MX"],"MFM":["Taipa","MO"],"MIA":["Miami","US"],"MLA":["Luqa","MT"],"MLE":["Male","MV"],"MLG":["Malang-Java Island","ID"],"MNL":["Manila","PH"],"MPM":["Maputo","MZ"],"MRS":["Marseille","FR"],"MRU":["Port Louis","MU"],"MSP":["Minneapolis","US"],"MSQ":["Minsk","BY"],"MUC":["Munich","DE"],"MXP":["Milan","IT"],"NAG":["Naqpur","IN"],"NBO":["Nairobi","KE"],"NJF":["Najaf","IQ"],"NOU":["Noumea","NC"],"NQN":["Neuquen","AR"],"NQZ":["Astana","KZ"],"NRT":["Tokyo","JP"],"NVT":["Navegantes","BR"],"OKA":["Naha","JP"],"OKC":["Oklahoma City","US"],"OMA":["Omaha","US"],"ORD":["Chicago","US"],"ORF":["Norfolk","US"],"ORN":["Oran","DZ"],"OSL":["Oslo","NO"],"OTP":["Bucharest","RO"],"OUA":["Ouagadougou","BF"],"PAT":["Patna","IN"],"PBH":["Paro","BT"],"PBM":["Zandery","SR"],"PDX":["Portland","US"],"PER":["Perth","AU"],"PHL":["Philadelphia","US"],"PHX":["Phoenix","US"],"PIT":["Pittsburgh","US"],"PKX":["Langfang","CN"],"PMO":["Palermo","IT"],"PMW":["Palmas","BR"],"PNH":["Phnom Penh","KH"],"PNQ":["Pune","IN"],"POA":["Porto Alegre","BR"],"POS":["Port of Spain","TT"],"PPT":["Papeete","PF"],"PRG":["Prague","CZ"],"PTY":["Tocumen","PA"],"QRO":["Queretaro","MX"],"QWJ":["Americana","BR"],"RAO":["Ribeirao Preto","BR"],"RDU":["Raleigh/Durham","US"],"REC":["Recife","BR"],"RIC":["Richmond","US"],"RIX":["Riga","LV"],"RUH":["Riyadh","SA"],"RUN":["St Denis","RE"],"SAN":["San Diego","US"],"SAP":["La Mesa","HN"],"SAT":["San Antonio","US"],"SCL":["Santiago","CL"],"SDQ":["Santo Domingo","DO"],"SEA":["Seattle","US"],"SFO":["San Francisco","US"],"SGN":["Ho Chi Minh City","VN"],"SHA":["Shanghai","CN"],"SIN":["Singapore","SG"],"SJC":["San Jose","US"],"SJK":["Sao Jose Dos Campos","BR"],"SJO":["San Jose","CR"],"SJP":["Sao Jose Do Rio Preto","BR"],"SJU":["San Juan","PR"],"SJW":["Hengshui","CN"],"SKG":["Thessaloniki","GR"],"SKP":["Skopje","MK"],"SLC":["Salt Lake City","US"],"SMF":["Sacramento","US"],"SOD":["Sorocaba","BR"],"SOF":["Sofia","BG"],"SSA":["Salvador","BR"],"STI":["Santiago","DO"],"STL":["St Louis","US"],"STR":["Stuttgart","DE"],"SUV":["Nausori","FJ"],"SYD":["Sydney","AU"],"SZX":["Shenzhen","CN"],"TAO":["Qingdao","CN"],"TBS":["Tbilisi","GE"],"TEN":["Tongren","CN"],"TGU":["Tegucigalpa","HN"],"TIA":["Tirana","AL"],"TLH":["Tallahassee","US"],"TLL":["Tallinn","EE"],"TLV":["Tel Aviv","IL"],"TNA":["Jinan","CN"],"TNR":["Antananarivo","MG"],"TPA":["Tampa","US"],"TPE":["Taipei","TW"],"TUN":["Tunis","TN"],"TXL":["Berlin","DE"],"TYN":["Yangquan","CN"],"UDI":["Uberlandia","BR"],"UDR":["Udaipur","IN"],"UIO":["Quito","EC"],"ULN":["Ulan Bator","MN"],"URT":["Surat Thani","TH"],"VCP":["Campinas","BR"],"VIE":["Vienna","AT"],"VIX":["Vitoria","BR"],"VNO":["Vilnius","LT"],"VTE":["Vientiane","LA"],"WAW":["Warsaw","PL"],"WDH":["Windhoek","NA"],"WLG":["Wellington","NZ"],"WRO":["Wroclaw","PL"],"XAP":["Chapeco","BR"],"XFN":["Xiangyang","CN"],"XIY":["Baoji","CN"],"XNH":["Nasiriyah","IQ"],"YHZ":["Halifax","CA"],"YUL":["Montreal","CA"],"YVR":["Vancouver","CA"],"YWG":["Winnipeg","CA"],"YXE":["Saskatoon","CA"],"YYC":["Calgary","CA"],"YYZ":["Toronto","CA"],"ZAG":["Zagreb","HR"],"ZDM":["Ramallah","PS"],"ZRH":["Zurich","CH"]};
const COLO_ZH = {
  HKG:'Гонконг',NRT:'Токио',KIX:'Осака',FUK:'Фукуока',OKA:'Наха',SIN:'Сингапур',ICN:'Сеул',TPE:'Тайбэй',KHH:'Гаосюн',MFM:'Макао',
  SHA:'Шанхай',CAN:'Гуанчжоу',SZX:'Шэньчжэнь',PKX:'Пекин·Ланфан',CTU:'Чэнду',CKG:'Чунцин',HGH:'Ханчжоу·Шаосин',TAO:'Циндао',TNA:'Цзинань',CGO:'Чжэнчжоу',XIY:'Сиань·Баоцзи',
  KMG:'Куньмин',CSX:'Чанша',FOC:'Фучжоу',DLC:'Далянь',HAK:'Хайкоу',KWE:'Гуйян',LHW:'Ланьчжоу',CZX:'Чанчжоу',JXG:'Цзясин',LYA:'Лоян',SJW:'Шицзячжуан·Хэншуй',TYN:'Тайюань·Янцюань',
  MNL:'Манила',CGK:'Джакарта',KUL:'Куала-Лумпур',BKK:'Бангкок',SGN:'Хошимин',HAN:'Ханой',PNH:'Пномпень',CEB:'Себу',DAC:'Дакка',KTM:'Катманду',
  BOM:'Мумбаи',DEL:'Нью-Дели',MAA:'Ченнаи',BLR:'Бангалор',HYD:'Хайдарабад',CCU:'Калькутта',CMB:'Коломбо',KHI:'Карачи',ISB:'Исламабад',LHE:'Лахор',
  SYD:'Сидней',MEL:'Мельбурн',BNE:'Брисбен',PER:'Перт',ADL:'Аделаида',AKL:'Окленд',GUM:'Гуам',
  DXB:'Дубай',DOH:'Доха',BAH:'Бахрейн',KWI:'Кувейт',RUH:'Эр-Рияд',JED:'Джидда',MCT:'Маскат',TLV:'Тель-Авив',AMM:'Амман',
  LAX:'Лос-Анджелес',SJC:'Сан-Хосе',SFO:'Сан-Франциско',SEA:'Сиэтл',PDX:'Портленд',DEN:'Денвер',PHX:'Финикс',LAS:'Лас-Вегас',SLC:'Солт-Лейк-Сити',
  DFW:'Даллас',IAH:'Хьюстон',ORD:'Чикаго',ATL:'Атланта',MIA:'Майами',EWR:'Ньюарк',JFK:'Нью-Йорк',IAD:'Вашингтон',BOS:'Бостон',
  YVR:'Ванкувер',YYZ:'Торонто',YUL:'Монреаль',YYC:'Калгари',MEX:'Мехико',GRU:'Сан-Паулу',GIG:'Рио-де-Жанейро',EZE:'Буэнос-Айрес',SCL:'Сантьяго',BOG:'Богота',LIM:'Лима',
  LHR:'Лондон',MAN:'Манчестер',CDG:'Париж',MRS:'Марсель',FRA:'Франкфурт',MUC:'Мюнхен',DUS:'Дюссельдорф',BER:'Берлин',HAM:'Гамбург',AMS:'Амстердам',
  BRU:'Брюссель',ZRH:'Цюрих',GVA:'Женева',VIE:'Вена',PRG:'Прага',WAW:'Варшава',BUD:'Будапешт',MAD:'Мадрид',BCN:'Барселона',LIS:'Лиссабон',
  MXP:'Милан',FCO:'Рим',ATH:'Афины',IST:'Стамбул',CPH:'Копенгаген',ARN:'Стокгольм',OSL:'Осло',HEL:'Хельсинки',DUB:'Дублин',
  DME:'Москва',LED:'Санкт-Петербург',KBP:'Киев',JNB:'Йоханнесбург',CPT:'Кейптаун',NBO:'Найроби',LOS:'Лагос',CAI:'Каир',CMN:'Касабланка',
};
function ccZh(cc) {
  cc = (cc || '').toUpperCase();
  if (!cc) return '';
  if (cc === 'TW') return 'Тайвань';
  if (cc === 'HK') return 'Гонконг';
  if (cc === 'MO') return 'Макао';
  try { const n = new Intl.DisplayNames(['ru-RU'], { type: 'region' }).of(cc); if (n && n !== cc) return n; } catch (e) {}
  return cc;
}
function coloInfo(code) {
  code = (code || '').toUpperCase();
  const row = CF_COLOS[code];
  if (!row) return { code, city: code || 'Неизвестно', cc: '', zh: code || 'Неизвестно' };
  return { code, city: row[0], cc: row[1], zh: COLO_ZH[code] || row[0] };
}
function coloHtml(code, big) {
  const c = coloInfo(code);
  if (!c.code) return '<span class="tag tag-neutral">Неизвестно</span>';
  return `${flagImg(c.cc)}<span class="code">${c.code}</span><span class="city" style="font-weight:500;font-size:${big ? '0.7em' : '1em'};color:var(--text-soft)">${c.zh}</span>`;
}

function isIPv6(ip) { return ip && ip.includes(':'); }
function truncateIP(ip) { if (!isIPv6(ip) || ip.length <= 20) return ip; return ip.substring(0, 18) + '...'; }
function displayIP(ip) {
  if (!ip) return 'Не удалось получить';
  if (isIPv6(ip)) return `<span class="ip-truncate ip-mask-target" title="${ip}">${truncateIP(ip)}</span>`;
  return `<span class="ip-mask-target">${ip}</span>`;
}
function linkIP(ip) { if (!ip) return 'Не удалось получить'; return `<a class="ip-link" href="${window.radarURL('ip/index.html?ip=' + encodeURIComponent(ip))}" target="_blank" rel="noopener" title="Открыть ${ip} для Рейтинг IP">${displayIP(ip)}</a>`; }
function setGeoText(elId, text) {
  const el = document.getElementById(elId); if (!el) return;
  el.innerHTML = '<span class="geo-text"></span>'; const span = el.firstElementChild; span.textContent = text || '';
  el.classList.remove('truncated'); el.removeAttribute('data-full'); if (!text) return;
  requestAnimationFrame(() => { if (span.scrollWidth > span.clientWidth + 1) { el.dataset.full = text; el.classList.add('truncated'); } });
}
function flagImg(cc) {
  if (!cc) return '';
  const l = cc.toLowerCase();
  const src = l === 'cn' ? 'https://ip.net.coffee/favicons/cn.png' : l === 'tw' ? 'https://ip.net.coffee/favicons/flags/tw.png' : `https://ip.net.coffee/favicons/flags/${l}.png`;
  return `<img src="${src}" width="40" height="27" style="width:24px;height:auto;border-radius:2px;vertical-align:middle" alt="${ccZh(cc)}" title="${ccZh(cc)}" onerror="this.onerror=null;this.style.display='none'">`;
}
function tag(text, cls) { return `<span class="tag ${cls || 'tag-neutral'}">${text}</span>`; }
function row(label, value) { return `<div class="risk-row"><span class="risk-label">${label}</span><span class="risk-value">${value}</span></div>`; }
function sig(v, yesText, noText) { if (v === true) return `<span class="sig sig-yes">${yesText || 'Обнаружено'}</span>`; if (v === false) return `<span class="sig sig-no">${noText || 'Не обнаружено'}</span>`; return '<span class="sig sig-na">Неизвестно</span>'; }

// ===== trace =====
async function trace(domain, timeoutMs) {
  const r = await fetch(`https://${domain}/cdn-cgi/trace`, { cache: 'no-store', signal: AbortSignal.timeout(timeoutMs || 6000) });
  const txt = await r.text();
  const o = {};
  txt.trim().split('\n').forEach(l => { const i = l.indexOf('='); if (i > 0) o[l.slice(0, i)] = l.slice(i + 1); });
  if (!o.ip) throw new Error('Нет ip Поле');
  return o;
}
async function timedTrace(domain) {
  const t0 = performance.now();
  const o = await trace(domain);
  return { o, ms: Math.round(performance.now() - t0) };
}

const state = { self: null, ip: null, geo: null, look: null, coloSelf: null, tsResult: {} };

function httpLabel(h) { h = (h || '').toLowerCase(); if (h.includes('3')) return 'HTTP/3'; if (h.includes('2')) return 'HTTP/2'; if (h.includes('1.1')) return 'HTTP/1.1'; return h ? h.toUpperCase() : 'Неизвестно'; }
function tlsLabel(t) { t = t || ''; return t.replace('TLSv', 'TLS ').replace('v', ' ') || 'Неизвестно'; }
function warpLabel(w) { w = (w || 'off').toLowerCase(); return w === 'plus' ? 'WARP+ Включено' : w === 'on' ? 'WARP Включено' : 'WARP Не включено'; }
function sniLabel(s) { s = (s || '').toLowerCase(); return s === 'encrypted' ? 'Шифрование SNI (ECH)' : s === 'plaintext' ? 'Без шифрования SNI' : s === 'off' ? 'Не используется SNI' : (s || 'Неизвестно'); }

async function main() {
  let o;
  try { o = await trace('ip.net.coffee'); }
  catch (e) {
    ['ipAddr', 'coloBig', 'warpBig', 'riskIp'].forEach(id => { document.getElementById(id).innerHTML = '<span class="tag tag-danger">Cloudflare API недоступен</span>'; });
    ['ipGeo', 'coloSub', 'protoSub'].forEach(id => { document.getElementById(id).textContent = ''; });
    document.getElementById('connContent').innerHTML = '<div class="cf-note">Нет доступа cdn-cgi/trace, Вероятно, запрос заблокирован расширением браузера или прокси Cloudflare API. </div>';
    document.getElementById('profileContent').innerHTML = '';
    document.getElementById('riskPill').innerHTML = '<span class="risk-pill lv-high"><span class="dot"></span>Оценка недоступна</span>';
    document.getElementById('riskGeo').innerHTML = '<div class="loc">Cloudflare API недоступен</div>';
    runCompare();
    return;
  }
  state.self = o; state.ip = o.ip; state.coloSelf = o.colo;
  if (isIPv6(o.ip)) document.getElementById('ipv6Warn').style.display = 'block';
  document.getElementById('ipAddr').innerHTML = `${o.loc ? flagImg(o.loc) : ''} ${linkIP(o.ip)}`;
  document.getElementById('riskIp').innerHTML = `${o.loc ? flagImg(o.loc) : ''} ${linkIP(o.ip)}`;
  setGeoText('ipGeo', 'Определение владельца...');
  const c = coloInfo(o.colo);
  document.getElementById('coloBig').innerHTML = coloHtml(o.colo, true);
  document.getElementById('coloSub').textContent = c.cc ? `${ccZh(c.cc)} · ${c.city} Дата-центр · Код ${c.code}` : `Код узла ${o.colo || 'Неизвестно'}`;
  const w = (o.warp || 'off').toLowerCase();
  document.getElementById('warpBig').innerHTML = w === 'off' ? tag('WARP Не включено', 'tag-safe') : tag(warpLabel(w), 'tag-warn');
  document.getElementById('protoSub').textContent = `${httpLabel(o.http)} · ${tlsLabel(o.tls)} · ${sniLabel(o.sni)}`;
  renderConn(o);
  saveColoHistory(o);
  applyMask();
  runCompare();
  loadRisk(false);
  try {
    const r = await fetch(`https://ip.net.coffee/api/geoip/${o.ip}`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const g = await r.json(); state.geo = g;
      const geo = [g.country, g.region, g.city, g.isp].filter(Boolean).join(' ');
      document.getElementById('ipAddr').innerHTML = `${flagImg(g.country_code || o.loc || '')} ${linkIP(o.ip)}`;
      setGeoText('ipGeo', geo);
      applyMask();
    } else setGeoText('ipGeo', '');
  } catch (e) { setGeoText('ipGeo', ''); }
  renderProfile(o);
}

function renderConn(o) {
  const c = coloInfo(o.colo);
  const rows = [
    row('Код узла', `<b>${c.code || 'Неизвестно'}</b>`),
    row('Дата-центр', c.code ? `${c.zh}${c.zh !== c.city ? ' (' + c.city + ')' : ''}` : 'Неизвестно'),
    row('Местоположение узла', c.cc ? `${flagImg(c.cc)} ${ccZh(c.cc)}` : 'Неизвестно'),
    row('Выходной IP Геолокация', o.loc ? `${flagImg(o.loc)} ${ccZh(o.loc)}` : 'Неизвестно'),
    row('Протокол соединения', httpLabel(o.http)),
    row('TLS Версия', tlsLabel(o.tls)),
    row('SNI', sniLabel(o.sni)),
    row('Обмен ключами', o.kex ? `<span class="dev-long">${o.kex}</span>` : 'Неизвестно'),
    row('WARP', warpLabel(o.warp)),
    row('Zero Trust Шлюз', (o.gateway || 'off') === 'on' ? tag('Включено', 'tag-info') : 'Не включено'),
    row('Время пограничного сервера', o.ts ? new Date(parseFloat(o.ts) * 1000).toLocaleString('ru-RU', { hour12: false }) : 'Неизвестно'),
  ];
  document.getElementById('connContent').innerHTML = rows.join('');
}

function renderProfile(o) {
  const c = coloInfo(o.colo);
  const g = state.geo || {}, lk = state.look || {};
  const asn = lk.asn || '';
  const asnNum = parseInt(String(asn).replace(/^AS/i, ''), 10);
  const isCfIp = asnNum === 13335 || (o.warp || 'off') !== 'off';
  const sameRegion = c.cc && o.loc && c.cc.toUpperCase() === o.loc.toUpperCase();
  const nearby = { HK: ['HKG', 'SZX', 'CAN', 'MFM'], CN: ['HKG', 'TPE', 'NRT', 'KIX', 'ICN', 'SIN'], TW: ['TPE', 'KHH', 'HKG'], JP: ['NRT', 'KIX', 'FUK', 'OKA'], SG: ['SIN', 'KUL', 'CGK'], MO: ['MFM', 'HKG'], KR: ['ICN', 'NRT'], MY: ['KUL', 'SIN'] };
  const near = sameRegion || (nearby[(o.loc || '').toUpperCase()] || []).includes(c.code);
  const ts = typeof lk.trust_score === 'number' ? lk.trust_score : null;
  const rows = [
    row('Проверка выходного адреса Cloudflare IP', isCfIp ? tag('Да (WARP / Cloudflare Прокси)', 'tag-warn') : tag('Нет', 'tag-safe')),
    row('Выходной IP ASN', asn ? `<span class="dev-long">AS${String(asn).replace(/^AS/i, '')} ${lk.asOrganization || lk.asname || g.isp || ''}</span>` : (state.look ? 'Неизвестно' : 'Проверка...')),
    row('Выходной IP Репутация IP', ts !== null ? `<a href="${window.radarURL('ip/index.html?ip=' + encodeURIComponent(o.ip))}" target="_blank" rel="noopener" title="Открыть ${o.ip} для Рейтинг IP" style="text-decoration:none;color:inherit">${ts} / 100 ${tag(scoreLabel(ts).text, scoreLabel(ts).cls)}</a>` : (state.look ? 'Неизвестно' : 'Проверка...')),
    row('Узел и регион выхода', c.code ? (near ? tag('Ближайший узел', 'tag-safe') : tag('Узел другого региона', 'tag-warn')) : tag('Неизвестно')),
    row('HTTP/3 (QUIC)', httpLabel(o.http) === 'HTTP/3' ? tag('Включено', 'tag-safe') : tag('Не включено', 'tag-neutral')),
    row('TLS 1.3', /1\.3/.test(o.tls || '') ? tag('Да', 'tag-safe') : tag(tlsLabel(o.tls), 'tag-warn')),
    row('Шифрование SNI (ECH)', (o.sni || '') === 'encrypted' ? tag('Включено', 'tag-safe') : tag('Не включено', 'tag-neutral')),
    row('IP Версия', isIPv6(o.ip) ? tag('IPv6', 'tag-info') : tag('IPv4', 'tag-info')),
  ];
  document.getElementById('profileContent').innerHTML = rows.join('');
}
function scoreLabel(t) {
  if (t >= 95) return { text: 'Очень надёжный', cls: 'tag-safe' };
  if (t >= 80) return { text: 'Надёжный', cls: 'tag-safe' };
  if (t >= 50) return { text: 'Хорошо', cls: 'tag-info' };
  if (t >= 25) return { text: 'Нейтральный', cls: 'tag-warn' };
  return { text: 'Подозрительный', cls: 'tag-danger' };
}

let riskLoading = false;
async function loadRisk(force) {
  if (!state.ip || riskLoading) return;
  riskLoading = true;
  const btn = document.getElementById('btnRisk'); btn.disabled = true;
  if (force) {
    document.getElementById('riskPill').innerHTML = '<span class="risk-pill lv-mid"><span class="dot"></span>Индекс риска: Вычисление</span>';
    document.querySelectorAll('#riskList .risk-value').forEach(el => { el.innerHTML = '<span class="sig sig-na">Проверка</span>'; });
  }
  try {
    const r = await fetch(`https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(state.ip)}`, { signal: AbortSignal.timeout(20000), cache: force ? 'no-store' : 'default' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(); state.look = d;
    renderRisk(d);
    renderProfile(state.self);
  } catch (e) {
    document.getElementById('riskPill').innerHTML = '<span class="risk-pill lv-mid"><span class="dot"></span>Оценка временно недоступна</span>';
    document.getElementById('riskGeo').innerHTML = '<div class="loc">Источник данных временно недоступен, Обновите страницу позже</div>';
    document.querySelectorAll('#riskList .risk-value').forEach(el => { el.innerHTML = '<span class="sig sig-na">Неизвестно</span>'; });
  }
  btn.disabled = false; riskLoading = false;
}
function renderRisk(d) {
  const o = state.self || {};
  const warpOn = (o.warp || 'off') !== 'off';
  const ts = typeof d.trust_score === 'number' ? d.trust_score : 50;
  let risk = 100 - ts;
  if (warpOn) risk += 10;
  if (d.is_tor) risk = Math.max(risk, 90);
  if (d.is_proxy) risk = Math.max(risk, 75);
  if (d.is_abuser) risk = Math.max(risk, 70);
  risk = Math.max(0, Math.min(100, Math.round(risk)));
  const lv = risk < 30 ? 'low' : risk < 60 ? 'mid' : 'high';
  const lvText = risk < 30 ? 'Окружение без признаков риска' : risk < 60 ? 'Есть признаки риска' : 'Высокий риск';
  document.getElementById('riskPill').innerHTML = `<span class="risk-pill lv-${lv}"><span class="dot"></span>Индекс риска: <span class="num">${risk}</span> / 100 · ${lvText}</span>`;
  const cc = (d.countryCode || o.loc || '').toUpperCase();
  const loc = [d.region, d.city].filter(Boolean).join(' · ') || '—';
  const isp = [d.isp, d.company_name && d.company_name !== d.isp ? d.company_name : ''].filter(Boolean).join(' / ');
  document.getElementById('riskGeo').innerHTML = `<div class="cc">${flagImg(cc)}${cc || 'Неизвестно'} <span style="font-size:0.72em;font-weight:500;color:var(--text-soft)">${ccZh(cc)}</span></div><div class="loc">${loc}</div><div class="isp">${isp || ''}${d.is_datacenter ? ' (Серверная сеть)' : d.isResidential ? ' (Резидентская сеть)' : ''}</div>`;
  const anyProxy = !!(d.is_proxy || d.is_vpn);
  const ctype = (d.company_type || '').toLowerCase();
  const signals = [
    !!d.is_proxy,
    anyProxy && (d.isResidential === true || ctype === 'isp'),
    anyProxy && ctype === 'business',
    !!d.is_vpn,
    !!d.is_tor,
    !!d.is_datacenter,
    !!d.is_abuser,
  ];
  const cells = document.querySelectorAll('#riskList .risk-value');
  signals.forEach((v, i) => { if (cells[i]) cells[i].innerHTML = sig(v); });
  const hits = ['Публичный прокси', 'Резидентский прокси', 'Корпоративный прокси', 'VPN', 'Tor', 'Серверный (Hosting) IP', 'История злоупотреблений'].filter((_, i) => signals[i]);

  const noteEl = document.getElementById('riskNote');
  noteEl.hidden = hits.length > 0;
  noteEl.innerHTML = hits.length ? ''
    : `Прокси не обнаружен, VPN, Tor и признаки злоупотреблений, Базовая репутация ${ts}/100${warpOn ? ', но текущий маршрут через WARP Выходной IP, Cloudflare Возможна более строгая проверка сайта' : ''}. `;
}

const TS = { ni: { id: null, key: '', t0: 0, interactive: false, box: 'tsBoxNi', st: 'tsNiState', sv: 'tsNiServer', tm: 'tsNiTime', vd: 'tsNiVerdict', tk: 'tsNiToken', mode: 'non-interactive' },
             mg: { id: null, key: '', t0: 0, interactive: false, box: 'tsBoxMg', st: 'tsMgState', sv: 'tsMgServer', tm: 'tsMgTime', vd: 'tsMgVerdict', tk: 'tsMgToken', mode: 'managed' } };
let RC = { key: '', ready: false };
function verdict(id, cls, title, text) { const el = document.getElementById(id); el.className = 'verdict ' + cls; el.innerHTML = `<b>${title}</b>${text}`; }
async function serverVerify(provider, mode, token) {
  const r = await fetch('https://ip.net.coffee/api/captcha/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, mode, token }), signal: AbortSignal.timeout(15000), cache: 'no-store' });
  return r.json();
}
function tsOnToken(k, token) {
  const c = TS[k]; const dt = Date.now() - c.t0;
  document.getElementById(c.st).innerHTML = tag('Проверка пройдена', 'tag-safe');
  document.getElementById(c.tk).textContent = 'Получен (скрыт)';
  document.getElementById(c.sv).innerHTML = tag('Проверка', 'tag-neutral');
  serverVerify('turnstile', c.mode, token).then(j => {
    if (!j.ok) { document.getElementById(c.sv).innerHTML = tag('Не настроено', 'tag-neutral'); return; }
    document.getElementById(c.sv).innerHTML = j.success ? '<span style="color:#1b8a2d;font-weight:700">PASS ✅</span>' : `<span style="color:#c62828;font-weight:700">FAIL</span> <span style="font-size:0.8em;color:var(--text-muted)">${(j.error_codes || []).join(',')}</span>`;
    document.getElementById(c.tm).textContent = j.elapsed_ms + ' ms';
    state.tsResult[k] = { success: j.success, interactive: c.interactive, dt };
    if (!j.success) { verdict(c.vd, 'bad', 'Серверная проверка не пройдена', 'Cloudflare отклонил этот token, Обычно связано с окружением или token Срок истёк, Сбросьте результат и повторите. '); return; }
    if (k === 'ni') verdict(c.vd, 'ok', 'Автоматическая проверка пройдена!', 'Не требует действий пользователя, Фоновая проверка пройдена. ');
    else if (c.interactive) verdict(c.vd, 'mid', 'Нажмите для проверки (Хорошо)', 'Управляемая проверка потребовала подтверждения: Окружение браузера выглядит нормально, есть отдельные подозрительные признаки, Cloudflare Окружение требует дополнительной проверки. ');
    else verdict(c.vd, 'ok', 'Автоматическая проверка пройдена!', 'Managed Режим работает отлично, Cloudflare Автоматически признано безопасным, Без нажатия пользователем, Отличное соединение. ');
  }).catch(() => { document.getElementById(c.sv).innerHTML = tag('Истекло время проверки', 'tag-warn'); });
}
function tsOnError(k, code) {
  const c = TS[k];
  document.getElementById(c.st).innerHTML = tag('Проверка не пройдена', 'tag-danger');
  document.getElementById(c.tm).textContent = (Date.now() - c.t0) + ' ms';
  if (String(code) === '110200') { verdict(c.vd, 'wait', 'Домен не разрешён ключом Turnstile', 'Для проверки на этом домене нужен собственный ключ Cloudflare с разрешённым именем сайта. Оценка окружения по этому отказу не выставляется.'); return; }
  verdict(c.vd, 'bad', 'Проверка не пройдена (Плохо)', `Turnstile Ответ с ошибкой ${code || ''}. Возможны необычные характеристики отпечатка браузера, Есть признаки автоматизации или низкая репутация сети, На многих сайтах может часто появляться капча. `);
}
function tsRender(k) {
  const c = TS[k]; if (!c.key || typeof turnstile === 'undefined') return;
  const box = document.getElementById(c.box); box.innerHTML = '';
  c.t0 = Date.now(); c.interactive = false;
  document.getElementById(c.st).innerHTML = tag('Проверка', 'tag-neutral');
  document.getElementById(c.sv).textContent = '—'; document.getElementById(c.tm).textContent = '—'; document.getElementById(c.tk).textContent = '—';
  verdict(c.vd, 'wait', 'Проверка', 'Turnstile Оценка браузера и сетевого окружения...');
  c.id = turnstile.render(box, {
    sitekey: c.key, theme: siteTheme(), language: 'ru', action: 'cf_env_check',
    callback: t => tsOnToken(k, t),
    'error-callback': code => { tsOnError(k, code); return true; },
    'expired-callback': () => { document.getElementById(c.st).innerHTML = tag('token Срок истёк', 'tag-warn'); },
    'before-interactive-callback': () => { c.interactive = true; document.getElementById(c.st).innerHTML = tag('Требуется подтверждение', 'tag-warn'); },
    'unsupported-callback': () => { tsOnError(k, 'unsupported'); },
  });
}
function siteTheme() {
  const a = document.documentElement.getAttribute('data-theme');
  if (a === 'dark' || a === 'light') return a;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
let _tsTheme = null;
function tsRerenderOnTheme() {
  const t = siteTheme(); if (t === _tsTheme) return; _tsTheme = t;
  ['ni', 'mg'].forEach(k => { if (TS[k].id !== null) tsReset(k); });
}
new MutationObserver(tsRerenderOnTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', tsRerenderOnTheme);
function tsReset(k) { const c = TS[k]; if (c.id !== null && typeof turnstile !== 'undefined') { try { turnstile.remove(c.id); } catch (e) {} c.id = null; } tsRender(k); }
window.__cfTsReady = function () { _tsTheme = siteTheme(); tsRender('ni'); tsRender('mg'); };

function rcSetup() {
  if (!RC.key) return;
  document.getElementById('rcCard').style.display = '';
  const s = document.createElement('script'); s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(RC.key); s.async = true;
  s.onload = () => { grecaptcha.ready(() => { RC.ready = true; document.getElementById('rcEngine').innerHTML = tag('Google Модуль безопасности готов', 'tag-safe'); }); };
  s.onerror = () => { document.getElementById('rcEngine').innerHTML = tag('Не удалось загрузить Google Скрипт (Возможна блокировка)', 'tag-danger'); };
  document.head.appendChild(s);
}
async function rcRun() {
  if (!RC.ready) { document.getElementById('rcState').innerHTML = tag('Модуль не готов', 'tag-warn'); return; }
  const btn = document.getElementById('btnRc'); btn.disabled = true;
  document.getElementById('rcState').innerHTML = tag('Оценка', 'tag-neutral');
  const t0 = Date.now();
  try {
    const token = await grecaptcha.execute(RC.key, { action: 'cf_env_check' });
    const j = await serverVerify('recaptcha', 'v3', token);
    document.getElementById('rcTime').textContent = (Date.now() - t0) + ' ms';
    if (!j.ok || !j.success) { document.getElementById('rcState').innerHTML = tag('Проверка не пройдена', 'tag-danger'); document.getElementById('rcScore').textContent = '—'; verdict('rcVerdict', 'bad', 'Проверка не пройдена', 'Google Запрос оценки отклонён: ' + ((j.error_codes || []).join(',') || j.error || 'Причина неизвестна')); btn.disabled = false; return; }
    const sc = typeof j.score === 'number' ? j.score : 0;
    document.getElementById('rcState').innerHTML = tag('Проверка пройдена', 'tag-safe');
    document.getElementById('rcScore').textContent = sc.toFixed(1);
    document.querySelectorAll('#rcScale tr').forEach(tr => tr.classList.remove('on'));
    const trs = [...document.querySelectorAll('#rcScale tr')]; const hit = trs.find(tr => sc >= parseFloat(tr.dataset.min)); if (hit) hit.classList.add('on');
    if (sc >= 0.7) verdict('rcVerdict', 'ok', sc >= 0.9 ? 'Отлично: Окружение без признаков риска' : 'Хорошо: Высокое доверие к окружению', `Google Оценка доверия ${sc.toFixed(1)}, Отпечаток браузера и сетевое окружение выглядят нормально, В большинстве случаев капча не требуется. `);
    else if (sc >= 0.5) verdict('rcVerdict', 'mid', 'Средне: Обнаружены признаки риска', `Google Оценка доверия ${sc.toFixed(1)}, Некоторые сайты могут запросить дополнительную проверку. `);
    else verdict('rcVerdict', 'bad', 'Плохо: трафик может определяться как аномальный', `Google Оценка доверия ${sc.toFixed(1)}, Регистрация, При входе возможны капча или отказ в доступе. `);
  } catch (e) {
    document.getElementById('rcState').innerHTML = tag('Не удалось выполнить', 'tag-danger');
    verdict('rcVerdict', 'bad', 'Не удалось выполнить', 'Браузер не смог завершить проверку reCAPTCHA Запрос, Часто встречается Google Домен заблокирован. ');
  }
  btn.disabled = false;
}
function rcReset() { document.getElementById('rcState').innerHTML = tag('Ожидание запуска', 'tag-neutral'); document.getElementById('rcScore').textContent = '—'; document.getElementById('rcTime').textContent = '—'; verdict('rcVerdict', 'wait', 'Ожидание запуска', 'Нажмите«Начать проверку»затем через Google Фоновая оценка. '); document.querySelectorAll('#rcScale tr').forEach(tr => tr.classList.remove('on')); }
(async function captchaInit() {
  const isForeignHost = !/ip\.net\.coffee|ping0\.cc/i.test(location.hostname);
  if (isForeignHost) {
    const g = document.getElementById('tsGrid');
    if (g) g.style.display = 'none';
    return;
  }
  try {
    const cfg = await (await fetch('https://ip.net.coffee/api/captcha/config', { signal: AbortSignal.timeout(6000) })).json();
    TS.ni.key = (cfg.turnstile || {})['non-interactive'] || '';
    TS.mg.key = (cfg.turnstile || {})['managed'] || '';
    RC.key = (cfg.recaptcha || {}).sitekey || '';
  } catch (e) {}
  if (TS.ni.key || TS.mg.key) {
    const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__cfTsReady'; s.async = true; s.defer = true;
    s.onerror = () => { ['ni', 'mg'].forEach(k => { document.getElementById(TS[k].box).innerHTML = '<span style="font-size:0.85em;color:#c62828">Не удалось загрузить скрипт Turnstile</span>'; tsOnError(k, 'load'); }); };
    document.head.appendChild(s);
  } else {
    document.getElementById('tsGrid').style.display = 'none';
  }
  rcSetup();
})();

const COMPARE_TARGETS = [
  { name: 'Cloudflare Бесплатный сайт', domain: 'ip.net.coffee', tier: 'Бесплатный тариф', tcls: 'free', icon: 'https://ip.net.coffee/favicons/cloudflare.webp', note: 'Бесплатный тариф' },
  { name: 'cloudflare.com', domain: 'www.cloudflare.com', tier: 'Корпоративный тариф', tcls: 'ent', icon: 'https://ip.net.coffee/favicons/cloudflare.webp', note: 'Cloudflare Официальный сайт' },
  { name: 'openai.com', domain: 'openai.com', tier: 'Корпоративный тариф', tcls: 'ent', icon: 'https://ip.net.coffee/favicons/openai.webp', note: 'ChatGPT Сайт сервиса' },
  { name: 'discord.com', domain: 'gateway.discord.gg', tier: 'Корпоративный тариф', tcls: 'ent', icon: 'https://ip.net.coffee/favicons/discord.webp', note: 'Discord Шлюз' },
  { name: '1.1.1.1', domain: '1.1.1.1', tier: 'WARP / DNS Сеть', tcls: '', icon: 'https://ip.net.coffee/favicons/cloudflare.webp', note: 'WARP и общедоступным DNS используемая сеть' },
  { name: 'speed.cloudflare.com', domain: 'speed.cloudflare.com', tier: 'Сеть теста', tcls: '', icon: 'https://ip.net.coffee/favicons/cloudflare.webp', note: 'Официальный тест скорости' },
  { name: 'cdnjs.cloudflare.com', domain: 'cdnjs.cloudflare.com', tier: 'Статические ресурсы CDN', tcls: '', icon: 'https://ip.net.coffee/favicons/cdnjs.webp', note: '' },
  { name: 'workers.cloudflare.com', domain: 'workers.cloudflare.com', tier: 'Workers Платформа', tcls: '', icon: 'https://ip.net.coffee/favicons/cloudflare.webp', note: '' },
];
let compareRunning = false;
function msClass(ms) { return ms < 80 ? 'ms-good' : ms < 200 ? 'ms-ok' : 'ms-bad'; }
async function runCompare() {
  if (compareRunning) return;
  compareRunning = true;
  const btn = document.getElementById('btnCompare'); btn.disabled = true;
  const tb = document.getElementById('compareBody');
  tb.innerHTML = COMPARE_TARGETS.map((t, i) => `<tr id="cmp-${i}"><td class="site"><img src="${t.icon}" alt="${t.name}" onerror="this.style.display='none'">${t.name}<small>${t.note || '&nbsp;'}</small></td><td><span class="tier ${t.tcls}">${t.tier}</span></td><td class="colo"><span class="loading-bar" style="width:90px"></span></td><td class="ms"><span class="loading-bar" style="width:50px"></span></td><td><span class="loading-bar" style="width:50px"></span></td></tr>`).join('');
  document.getElementById('compareNote').textContent = 'Тестирование, Предварительное соединение с каждым сайтом 1 попыток, затем 3 попыток, минимум...';
  const results = [];
  await Promise.all(COMPARE_TARGETS.map(async (t, i) => {
    const tr = document.getElementById(`cmp-${i}`);
    try {
      await trace(t.domain);
      let best = Infinity, o = null;
      for (let k = 0; k < 3; k++) { const r = await timedTrace(t.domain); if (r.ms < best) { best = r.ms; o = r.o; } }
      results[i] = { t, o, ms: best };
      tr.children[2].innerHTML = coloHtml(o.colo);
      tr.children[3].innerHTML = `<span class="${msClass(best)}">${best} ms</span>`;
      tr.children[4].textContent = httpLabel(o.http);
    } catch (e) {
      results[i] = { t, err: true };
      tr.children[2].innerHTML = '<span class="tag tag-danger">Недоступен</span>';
      tr.children[3].textContent = '—';
      tr.children[4].textContent = '—';
    }
  }));
  const ok = results.filter(r => r && !r.err);
  const maxMs = Math.max(...ok.map(r => r.ms), 1);
  ok.forEach(r => { const i = results.indexOf(r); const cell = document.getElementById(`cmp-${i}`).children[3]; cell.innerHTML += `<span class="lat-bar" style="width:${Math.max(6, Math.round(120 * r.ms / maxMs))}px;background:${r.ms < 80 ? '#6fcf7c' : r.ms < 200 ? '#f0c040' : '#e17055'}"></span>`; });
  const self = results[0] && !results[0].err ? results[0] : null;
  const ent = ok.filter(r => r.t.tcls === 'ent');
  const colos = [...new Set(ok.map(r => r.o.colo))];
  let note = '';
  if (!ok.length) note = 'Все Cloudflare сайты недоступны, Проверьте сеть и расширения браузера. ';
  else if (colos.length === 1) note = `Все тарифы на этом маршруте используют один узел <b>${colos[0]} ${coloInfo(colos[0]).zh}</b>, Нет различий в выборе узлов, Оптимальное состояние. `;
  else {
    const parts = colos.map(c => `<b>${c} ${coloInfo(c).zh}</b> (${ok.filter(r => r.o.colo === c).map(r => r.t.name).join(', ')})`);
    note = `Маршрут использует ${colos.length} разных узлов: ${parts.join('; ')}. `;
    if (self && ent.length) {
      const entBest = ent.reduce((a, b) => a.ms < b.ms ? a : b);
      if (self.o.colo !== entBest.o.colo) note += ` Сайт бесплатного тарифа направлен на <b>${self.o.colo}</b>, Узел корпоративного тарифа <b>${entBest.o.colo}</b>, Разница задержки <b>${Math.abs(self.ms - entBest.ms)} ms</b>, Разница обусловлена уровнем тарифа. `;
    }
  }
  document.getElementById('compareNote').innerHTML = note;
  btn.disabled = false; compareRunning = false;
}



let speedRunning = false;
const SPEED_DL = [10e6, 25e6, 64e6, 200e6], SPEED_UL = [5e6, 10e6, 34e6];
function rateFromSamples(samples) {
  if (samples.length < 4) return 0;
  const total = samples[samples.length - 1].t - samples[0].t;
  const cut = samples[0].t + total * 0.15;
  const from = samples.find(x => x.t >= cut) || samples[0];
  const last = samples[samples.length - 1];
  const dt = (last.t - from.t) / 1000;
  return dt > 0.05 ? (last.b - from.b) * 8 / dt / 1e6 : 0;
}
async function dlOnce(bytes, onProgress) {
  const r = await fetch('https://speed.cloudflare.com/__down?bytes=' + bytes, { cache: 'no-store', signal: AbortSignal.timeout(60000) });
  const reader = r.body.getReader(); const samples = [{ t: performance.now(), b: 0 }]; let got = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; got += value.length; samples.push({ t: performance.now(), b: got }); if (onProgress) onProgress(got, samples); }
  return { bytes: got, ms: samples[samples.length - 1].t - samples[0].t, rate: rateFromSamples(samples) };
}
async function ulOnce(bytes) {
  const t0 = performance.now();
  await fetch('https://speed.cloudflare.com/__up', { method: 'POST', body: new Blob([new Uint8Array(bytes)]), cache: 'no-store', signal: AbortSignal.timeout(60000) });
  const ms = performance.now() - t0;
  return { bytes, ms, rate: bytes * 8 / (ms / 1000) / 1e6 };
}
async function runSpeed() {
  if (speedRunning) return;
  speedRunning = true;
  const btn = document.getElementById('btnSpeed'); btn.disabled = true;
  const note = document.getElementById('speedNote');
  const set = (id, v) => { document.getElementById(id).textContent = v; };
  set('spDown', '...'); set('spUp', '...'); set('spRtt', '...');
  let colo = '', used = 0;
  const mb = n => (n / 1e6).toFixed(0);
  try {
    const warm = await fetch('https://speed.cloudflare.com/__down?bytes=1000000', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    await warm.arrayBuffer(); used += 1e6;
    colo = warm.headers.get('cf-meta-colo') || '';
    if (!colo) { try { colo = (await trace('speed.cloudflare.com')).colo || ''; } catch (e) {} }
    const m = (warm.headers.get('server-timing') || '').match(/rtt=(\d+)/);
    set('spRtt', m ? (parseInt(m[1], 10) / 1000).toFixed(1) : '—');
    const cname = colo ? colo + ' ' + coloInfo(colo).zh : 'Неизвестно';

    let best = 0, measured = 0;
    for (const sz of SPEED_DL) {
      note.textContent = `Узел теста ${cname}, Загрузка ${mb(sz)} MB В процессе...`;
      const r = await dlOnce(sz, (got, samples) => { const live = rateFromSamples(samples); if (live > 0) set('spDown', live.toFixed(1)); });
      used += r.bytes; measured += r.ms; best = Math.max(best, r.rate);
      set('spDown', best.toFixed(1));
      if (measured >= 10000) break;
    }

    let bestUp = 0, measuredUp = 0;
    try {
      await ulOnce(1e6); used += 1e6;
      for (const sz of SPEED_UL) {
        note.textContent = `Узел теста ${cname}, Отправка ${mb(sz)} MB В процессе...`;
        const r = await ulOnce(sz); used += r.bytes; measuredUp += r.ms; bestUp = Math.max(bestUp, r.rate);
        set('spUp', bestUp.toFixed(1));
        if (measuredUp >= 8000) break;
      }
    } catch (e) { if (!bestUp) set('spUp', '—'); }
    note.innerHTML = `Узел теста <b>${cname}</b>, Передано примерно <b>${(used / 1e6).toFixed(0)} MB</b>. Запрос выполняется вашим браузером speed.cloudflare.com Тест по уровням (Максимальный объём загрузки 300 MB, Максимальный объём отправки 50 MB, Тест завершится автоматически), Максимальная стабильная скорость без начального разгона; Пограничный RTT является Cloudflare Измерено со стороны узла TCP Время туда и обратно. Измеряется с вашего устройства. `;
  } catch (e) {
    set('spDown', '—'); set('spUp', '—'); set('spRtt', '—');
    note.textContent = 'Тест скорости не удался: speed.cloudflare.com Недоступен или заблокирован. ';
  }
  btn.disabled = false; speedRunning = false;
}

const HIST_KEY = 'cf_colo_history', HIST_MAX = 6;
function getHist() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (e) { return []; } }
function saveColoHistory(o) {
  try {
    let h = getHist();
    const last = h[0];
    if (!(last && last.ip === o.ip && last.colo === o.colo && Date.now() - last.ts < 10 * 60 * 1000)) {
      h.unshift({ ip: o.ip, colo: o.colo, warp: o.warp || 'off', http: o.http || '', ts: Date.now() });
      h = h.slice(0, HIST_MAX);
      localStorage.setItem(HIST_KEY, JSON.stringify(h));
    }
  } catch (e) {}
  renderHist();
}
function renderHist() {
  const h = getHist(); const el = document.getElementById('historyContent');
  if (!h.length) { el.textContent = 'Записей нет'; return; }
  el.innerHTML = h.map(x => `<div class="risk-row"><span class="risk-label" style="font-size:0.82em">${new Date(x.ts).toLocaleString('ru-RU', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span><span class="risk-value" style="font-size:0.85em">${coloHtml(x.colo)} · ${linkIP(x.ip)}${x.warp !== 'off' ? ' · ' + tag('WARP', 'tag-warn') : ''}</span></div>`).join('');
  applyMask();
}
function clearColoHistory() { try { localStorage.removeItem(HIST_KEY); } catch (e) {} renderHist(); }

const MASK_KEY = 'ip_mask_on';
function maskIpText(t) {
  return (t || '').replace(/\b(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}\b/g, '$1.$2.*.*')
    .replace(/\b([0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4})(:[0-9a-fA-F:.]+)/g, '$1:****');
}
function applyMask() {
  const on = (() => { try { return localStorage.getItem(MASK_KEY) === '1'; } catch (e) { return false; } })();
  document.querySelectorAll('.ip-mask-target').forEach(el => {
    if (!el.dataset.orig) el.dataset.orig = el.textContent;
    el.textContent = on ? maskIpText(el.dataset.orig) : el.dataset.orig;
  });
  const cb = document.getElementById('ipMaskToggle'); if (cb) cb.checked = on;
}
document.getElementById('ipMaskToggle').addEventListener('change', function () {
  try { localStorage.setItem(MASK_KEY, this.checked ? '1' : '0'); } catch (e) {}
  applyMask();
});

(function () {
  const asia = ['HKG', 'NRT', 'KIX', 'SIN', 'ICN', 'TPE', 'KHH', 'MFM', 'MNL', 'KUL', 'BKK', 'CGK', 'SGN', 'BOM', 'SYD'];
  const west = ['LAX', 'SJC', 'SEA', 'DFW', 'ORD', 'IAD', 'EWR', 'YVR', 'LHR', 'FRA', 'AMS', 'CDG', 'MAD', 'ARN', 'DME'];
  const chip = c => { const i = coloInfo(c); return `<span class="colo-chip">${flagImg(i.cc)}<b>${c}</b>${i.zh}</span>`; };
  document.getElementById('coloChipsAsia').innerHTML = asia.map(chip).join('');
  document.getElementById('coloChipsWest').innerHTML = west.map(chip).join('');
})();

renderHist();
main();

