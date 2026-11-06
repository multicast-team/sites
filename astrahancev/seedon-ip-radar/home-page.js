
// ================================================================

// ================================================================

const pingTargets = [
  {name:'Яндекс',icon:window.radarURL('favicon.svg'),url:'https://yandex.ru/favicon.ico',tag:'Россия'},
  {name:'VK',icon:window.radarURL('favicon.svg'),url:'https://vk.com/favicon.ico',tag:'Россия'},
  {name:'Mail.ru',icon:window.radarURL('favicon.svg'),url:'https://mail.ru/favicon.ico',tag:'Россия'},
  {name:'GitHub',icon:'https://ip.net.coffee/favicons/github.webp',url:'https://github.com/generate_204',tag:'Международный'},
  {name:'Cloudflare',icon:'https://ip.net.coffee/favicons/cloudflare.webp',url:'https://challenges.cloudflare.com/cdn-cgi/trace',tag:'Международный'},
  {name:'YouTube',icon:'https://ip.net.coffee/favicons/youtube.webp',url:'https://www.youtube.com/generate_204',tag:'Международный'}
];

// Render ping grid
function renderPingGrid() {
  const grid = document.getElementById('pingGrid');
  grid.innerHTML = pingTargets.map((t, i) => `
    <div class="ping-item" id="ping-${i}">
      <img class="ping-icon" src="${t.icon}" alt="${t.name}" onerror="this.style.display='none'">
      <div style="flex:1;min-width:0">
        <div class="ping-name">${t.name === 'ByteDance' ? '<span class="bd-full">ByteDance</span><span class="bd-short">ByteDance</span>' : t.name}${t.tag==='Россия' ? ' <img src="https://ip.net.coffee/favicons/flags/ru.png" alt="Флаг России" width="40" height="27" style="width:14px;height:auto;vertical-align:-1px;border-radius:1px">' : ''}</div>
        <div class="ping-dots" id="ping-dots-${i}">${'<div class="ping-dot dot-pending"></div>'.repeat(12)}</div>
      </div>
      <div class="ping-ms" id="ping-ms-${i}" style="color: var(--text-muted)">--ms</div>
    </div>
  `).join('');
}

// Single ping: fetch no-cors with 3s timeout
async function singlePing(url) {
  const start = performance.now();
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(2500) });
    return Math.round(performance.now() - start);
  } catch {
    return -1;
  }
}

function dotClass(ms) {
  if (ms < 0) return 'dot-fail';
  if (ms < 100) return 'dot-good';
  if (ms < 400) return 'dot-warn';
  return 'dot-bad';
}

// Run pings: 1 warmup (hidden) + 12 measured rounds, display median
const pingHistory = pingTargets.map(() => []);

async function runPings() {
  // Warmup: establish TCP+TLS connections (not displayed, 3s timeout per target)
  await Promise.allSettled(pingTargets.map(t => singlePing(t.url).catch(() => -1)));

  const ROUNDS = 12;
  const MIN_INTERVAL_MS = 80;
  // Per-site independent loops: a slow/failed site doesn't block others
  await Promise.allSettled(pingTargets.map(async (t, i) => {
    for (let round = 0; round < ROUNDS; round++) {
      const roundStart = performance.now();
      const ms = await singlePing(t.url);
      const dotsEl = document.getElementById(`ping-dots-${i}`);
      const msEl = document.getElementById(`ping-ms-${i}`);
      dotsEl.children[round].className = 'ping-dot ' + dotClass(ms);

      if (ms >= 0) pingHistory[i].push(ms);

      // Display median
      const valid = pingHistory[i].slice().sort((a, b) => a - b);
      if (valid.length > 0) {
        const median = valid[Math.floor(valid.length / 2)];
        msEl.textContent = Math.min(median, 999) + 'ms';
        msEl.style.color = median < 100 ? '#1b8a2d' : median < 400 ? '#6fcf7c' : '#f0c040';
      } else if (ms < 0) {
        msEl.textContent = 'Тайм-аут';
        msEl.style.color = '#e17055';
      }

      // Minimum 100ms per round (pad only if this round finished fast; skip last round)
      const elapsed = performance.now() - roundStart;
      if (elapsed < MIN_INTERVAL_MS && round < ROUNDS - 1) {
        await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
      }
    }
  }));
}

async function runIPQuery() {
  const result = await window.radarDirectIP();
  const value = document.getElementById('ipValue');
  const geo = document.getElementById('ipGeo');
  const source = document.getElementById('ipSource');
  if (!result) { value.textContent = 'Не удалось определить IP'; geo.textContent = 'Источники не ответили. Повторите проверку позже.'; return; }
  await renderIPResult(result.ip, '', result.source, value, geo, source);
}

async function renderIPResult(ip, geo, source, valueEl, geoEl, sourceEl) {
  // Use our server-side geo cache for the flag
  let flagHtml = '';
  try {
    const geoData = await lookupGeo(ip);
    if (geoData && geoData.countryCode) {
      const cc = geoData.countryCode;
      const flagSrc = cc === 'cn' ? 'https://ip.net.coffee/favicons/cn.png' : cc === 'tw' ? 'https://ip.net.coffee/favicons/flags/tw.png' : `https://ip.net.coffee/favicons/flags/${cc}.png`;
      const flagAlt = cc === 'tw' ? 'Тайвань' : cc;
      flagHtml = `<img src="${flagSrc}" width="40" height="27" style="width:22px;height:auto;border-radius:2px;vertical-align:middle" alt="${flagAlt}" onerror="this.onerror=null;this.style.display='none'">`;
    }
    if (!geo && geoData) geo = geoData.geoString;
  } catch {}
  const ipLink = `<a class="ip-link" href="${window.radarURL('ip/index.html?ip=' + encodeURIComponent(ip))}" target="_blank" rel="noopener">${ip}</a>`;
  valueEl.innerHTML = `${flagHtml} ${ipLink}`;
  geoEl.textContent = geo || '';
  geoEl.title = geo || '';

  sourceEl.textContent = source || '';
  // Fetch IP property from risk API
  try {
    const r = await fetch(`https://ip.net.coffee/api/iprisk/${ip}`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      const t = d.company_type || '';
      const typeLabel = { 'isp': 'ISP', 'hosting': 'Hosting', 'business': 'Корпоративный', 'education': 'Образовательный' };
      const tStr = typeLabel[t] || t;
      let prop = '';
      if (d.isResidential === true && t === 'business') prop = 'Корпоративный интернет (Business)';
      else if (d.isResidential === true) prop = 'Домашний интернет' + (tStr ? ` (${tStr})` : '');
      else if (d.is_datacenter === true && t === 'business') prop = 'Корпоративный канал (Business)';
      else if (d.is_datacenter === true) prop = 'Серверный (Hosting)';
      else if (t === 'education') prop = 'Выделенный (Education)';
      else prop = tStr ? `Неизвестно (${tStr})` : 'Неизвестно';
      sourceEl.textContent = [source, prop].filter(Boolean).join(' · ');
    }
  } catch {}
}

// ================================================================

// ================================================================

// ============ Test Items ============
const tests = [
  {name:'Seedon · РФ / DIRECT', type:'russian', method:'seedon'},

  { name: 'NetEase',              type: 'domestic', method: 'netease' },
  { name: 'ByteDance',          type: 'domestic', method: 'bytedance', url: 'https://perfops.byte-test.com/500b-bench.jpg' },
  { name: 'Cloudflare Китай', type: 'domestic', method: 'cftrace', domain: 'www.cloudflare-cn.com' },
  { name: 'Qualcomm China',   type: 'domestic', method: 'cftrace', domain: 'www.qualcomm.cn' },

  { name: 'discord.com',       type: 'international', extra: ['social'], method: 'cftrace', domain: 'gateway.discord.gg' },
  { name: 'x.com',             type: 'international', extra: ['social'], method: 'cftrace', domain: 'x.com' },
  { name: 'medium.com',        type: 'international', extra: ['social'], method: 'cftrace', domain: 'medium.com' },
  { name: 'signal.org',        type: 'international', extra: ['social'], method: 'cftrace', domain: 'signal.org' },

  { name: 'anthropic.com',     type: 'international', extra: ['ai'], method: 'cftrace', domain: 'anthropic.com' },
  { name: 'claude.ai',         type: 'international', extra: ['ai'], method: 'cftrace', domain: 'claude.ai' },
  { name: 'chatgpt.com',       type: 'international', extra: ['ai'], method: 'cftrace', domain: 'chatgpt.com' },
  { name: 'openai.com',        type: 'international', extra: ['ai'], method: 'cftrace', domain: 'openai.com' },
  { name: 'sora.com',          type: 'international', extra: ['ai'], method: 'cftrace', domain: 'sora.com' },
  { name: 'grok.com',          type: 'international', extra: ['ai'], method: 'cftrace', domain: 'grok.com' },
  { name: 'pixpix.com',        type: 'international', extra: ['ai'], method: 'cftrace', domain: 'pixpix.com' },
  { name: 'perplexity.ai', type: 'international', extra: ['ai'], method: 'cftrace', domain: 'www.perplexity.ai' },
  { name: 'midjourney.com',    type: 'international', extra: ['ai'], method: 'cftrace', domain: 'midjourney.com' },
  { name: 'mistral.ai',        type: 'international', extra: ['ai'], method: 'cftrace', domain: 'mistral.ai' },

  { name: 'coinbase.com',      type: 'international', extra: ['crypto'], method: 'cftrace', domain: 'coinbase.com' },
  { name: 'www.okx.com',       type: 'international', extra: ['crypto'], method: 'cftrace', domain: 'www.okx.com' },
  { name: 'binance.com',      type: 'international', extra: ['crypto'], method: 'cftrace', domain: 'www.binance.info' },
  { name: 'crypto.com',        type: 'international', extra: ['crypto'], method: 'cftrace', domain: 'crypto.com' },

  { name: 'zoom.us',           type: 'international', extra: ['tools'], method: 'cftrace', domain: 'zoom.us' },
  { name: '1password.com',     type: 'international', extra: ['tools'], method: 'cftrace', domain: '1password.com' },
  { name: 'wise.com',          type: 'international', extra: ['tools'], method: 'cftrace', domain: 'wise.com' },
  { name: 'poe.com',           type: 'international', extra: ['tools'], method: 'cftrace', domain: 'poe.com' },
  { name: 'notion.so',         type: 'international', extra: ['tools'], method: 'cftrace', domain: 'notion.so' },
  { name: 'shopify.com',       type: 'international', extra: ['tools'], method: 'cftrace', domain: 'shopify.com' },
  { name: 'godaddy.com',       type: 'international', extra: ['tools'], method: 'cftrace', domain: 'godaddy.com' },
  { name: 'producthunt.com',   type: 'international', extra: ['tools'], method: 'cftrace', domain: 'producthunt.com' },

  { name: 'cloudflare.com', type: 'international', extra: ['speed'], method: 'cftrace', domain: 'challenges.cloudflare.com', fallbackDomain: 'www.cloudflare.com' },

  { name: 'cloudflare cdnjs',  type: 'international', extra: ['static'], method: 'cftrace', domain: 'cdnjs.cloudflare.com' },
  { name: 'npm registry',    type: 'international', extra: ['static'], method: 'cftrace', domain: 'registry.npmjs.org' },
  { name: 'kali.download',         type: 'international', extra: ['static'], method: 'cftrace', domain: 'kali.download' },
  { name: 'unpkg.com',             type: 'international', extra: ['static'], method: 'cftrace', domain: 'unpkg.com' },
  { name: 'nodejs.org',        type: 'international', extra: ['dev'], method: 'cftrace', domain: 'nodejs.org' },
  { name: 'gitlab.com',        type: 'international', extra: ['dev'], method: 'cftrace', domain: 'gitlab.com' },

  { name: 'crunchyroll.com',   type: 'international', extra: ['media'], method: 'cftrace', domain: 'crunchyroll.com' },
];

// ============ State ============
const state = new Array(tests.length).fill(null).map(() => ({
  status: 'pending', // pending | loading | done | error
  ip: null,
  geo: null,
  countryCode: null,
  error: null,
}));

// ============ Favicon URL helper ============
const LOCAL_FAVICONS = {
  'Alibaba': 'alibaba', 'NetEase': 'netease', 'ByteDance': 'bytedance',
  'Qualcomm China': 'qualcomm', 'Cloudflare Китай': 'cloudflare',
  'cloudflare.com': 'cloudflare',
  'discord.com': 'discord', 'x.com': 'x', 'medium.com': 'medium',
  'chatgpt.com': 'chatgpt', 'sora.com': 'sora', 'openai.com': 'openai',
  'claude.ai': 'claude', 'grok.com': 'grok', 'anthropic.com': 'anthropic',
  'perplexity.ai': 'perplexity',
  'telegram.org': 'telegram', 'substack.com': 'substack',
  'midjourney.com': 'midjourney',
  'coinbase.com': 'coinbase', 'www.okx.com': 'okx', 'binance.com': 'binance',
  'zoom.us': 'zoom', '1password.com': '1password', 'wise.com': 'wise',
  'godaddy.com': 'godaddy', 'producthunt.com': 'producthunt',
  'fast.com': 'fast',
  'cdn.jsdelivr.net': 'jsdelivr', 'cloudflare cdnjs': 'cdnjs',
  'cloudflaremirrors.com': 'cloudflaremirrors', 'npm registry': 'npmjs',
  'kali.download': 'kali', 'unpkg.com': 'unpkg',
  'crunchyroll.com': 'crunchyroll', 'nodejs.org': 'nodejs', 'gitlab.com': 'gitlab',
  'crypto.com': 'crypto', 'notion.so': 'notion', 'shopify.com': 'shopify', 'pixpix.com': 'pixpix',
  'signal.org': 'signal', 'mistral.ai': 'mistral', 'poe.com': 'poe',
};
// Files on server: .webp preferred, .png fallback
const ICO_ICONS = new Set(['alibaba']);
const WEBP_ICONS = new Set([
  'anthropic','bytedance','cdnjs','chatgpt','claude','cloudflare',
  'cloudflaremirrors','coinbase','crunchyroll','discord','fast','gitlab',
  'godaddy','grok','jsdelivr','medium','midjourney','nodejs','npmjs',
  'okx','substack','telegram','unpkg','wise','x',

  'sora','openai','perplexity','zoom','1password','producthunt','taobao','weixin','github','youtube','javdb',
  'signal','mistral','poe',   // 2026-09-15
]);
// These don't have local files — use Google Favicon as fallback
const GOOGLE_FALLBACK = new Set();
const PINNED_ICONS = { 'pixpix': 'https://ip.net.coffee/favicons/link/pixpix.ico?v=4', 'grok': 'https://ip.net.coffee/favicons/grok.png?v=4', 'chatgpt': 'https://ip.net.coffee/favicons/chatgpticon.png?v=1' };
function faviconUrl(name, domain) {
  const key = LOCAL_FAVICONS[name];
  if (key && PINNED_ICONS[key]) return PINNED_ICONS[key];
  if (key && !GOOGLE_FALLBACK.has(key)) {
    const ext = ICO_ICONS.has(key) ? 'ico' : WEBP_ICONS.has(key) ? 'webp' : 'png';
    return `https://ip.net.coffee/favicons/${key}.${ext}`;
  }


  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}

// ============ Badge HTML ============
function badgeHTML(type, extras) {
  let html = '';
  if (type === 'russian') html += '<span class="badge badge-domestic">Россия</span>';
  if (type === 'domestic') {
    html += '<span class="badge badge-domestic">Китай</span>';
  } else {
    html += '<span class="badge badge-international">Международный</span>';
  }
  if (extras) {
    for (const e of extras) {
      const labels = { ai:'AI', crypto:'Crypto', social:'Social', tools:'Tools', speed:'Speed', dev:'Dev', media:'Media', static:'Static' };
      html += `<span class="badge badge-${e}">${labels[e] || e}</span>`;
    }
  }
  return html;
}

// ============ Country flag ============
function flagHTML(countryCode) {
  if (!countryCode) return '';
  const cc = countryCode.toLowerCase();
  const src = cc === 'cn' ? 'https://ip.net.coffee/favicons/cn.png' : cc === 'tw' ? 'https://ip.net.coffee/favicons/flags/tw.png' : `https://ip.net.coffee/favicons/flags/${cc}.png`;
  const altTxt = cc === 'tw' ? 'Тайвань' : cc;
  return `<img class="flag-icon" width="40" height="27" src="${src}" alt="${altTxt}" onerror="if(this.dataset.f){this.style.display='none';return;}this.style.display='none';">`;
}

// ============ Render table ============
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = tests.map((t, i) => {
    const s = state[i];
    const fav = t.domain ? faviconUrl(t.name, t.domain) : faviconUrl(t.name);
    const siteCell = `
      <td>
        <div class="site-cell">
          <img class="favicon" src="${fav}" alt="${t.name}" onerror="this.style.display='none'">
          <span class="site-name">${t.name}</span>
          ${badgeHTML(t.type, t.extra)}
        </div>
      </td>`;

    let flagCell, ipCell, geoCell;

    if (s.status === 'pending') {
      flagCell = '<td></td>';
      ipCell = '<td><span class="pending-text"></span></td>';
      geoCell = '<td class="geo-col"></td>';
    } else if (s.status === 'loading') {
      flagCell = '<td><div class="loading-bar" style="width:24px;height:24px;border-radius:50%"></div></td>';
      ipCell = '<td><div class="loading-bar" style="width:120px"></div></td>';
      geoCell = '<td class="geo-col"><div class="loading-bar" style="width:180px"></div></td>';
    } else if (s.status === 'error') {
      flagCell = '<td>?</td>';
      ipCell = `<td><span class="error-text">${s.error || 'Не удалось получить'}</span></td>`;
      geoCell = '<td class="geo-col"></td>';
    } else {
      flagCell = `<td>${flagHTML(s.countryCode)}</td>`;
      ipCell = `<td class="ip-cell">${s.ip || 'Не получено IP'}</td>`;
      geoCell = `<td class="geo-col geo-cell">${s.geo || ''}</td>`;
    }

    return `<tr>${siteCell}${flagCell}${ipCell}${geoCell}</tr>`;
  }).join('');
}

// ============ Geo lookup — multi-provider fallback + dedup cache ============
const geoCache = new Map();    // normalized IP → { geoString, countryCode }
const geoInflight = new Map(); // normalized IP → Promise (dedup concurrent)

function normalizeIp(ip) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip.replace(/\.\d+$/, '.1');
  return ip;
}

// Primary: our own server-side cache API (/24 subnet, 30-day TTL, SQLite-backed)
// Fallback: direct third-party APIs if our server is down
async function fetchGeoFromServer(ip) {
  const r = await fetch(`https://ip.net.coffee/api/geoip/${ip}`, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) return null;
  const d = await r.json();
  const parts = [d.country, d.region, d.city, d.isp].filter(Boolean);
  return { geoString: parts.join(' '), countryCode: d.country_code || null, isp: d.isp || '', country: d.country || '', region: d.region || '', city: d.city || '' };
}

async function fetchGeoFallback(ip) {
  // Fallback 1
  try {
    const r = await fetch(`https://api.ip.sb/geoip/${ip}`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) { const d = await r.json(); if (d.country) return {
      geoString: [d.country, d.region, d.city, d.isp || d.organization].filter(Boolean).join(' '),
      countryCode: d.country_code?.toLowerCase() || null,
    }; }
  } catch {}
  // Fallback 2
  try {
    const r = await fetch(`https://ipwho.is/${ip}?lang=ru`, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (d.success) return {
      geoString: [d.country, d.region, d.city, d.connection?.isp].filter(Boolean).join(' '),
      countryCode: d.country_code?.toLowerCase() || null,
    };
  } catch {}
  return null;
}

async function lookupGeo(ip) {
  if (!ip) return null;
  const key = normalizeIp(ip);

  // L1: browser memory cache
  if (geoCache.has(key)) return geoCache.get(key);
  // L2: dedup in-flight
  if (geoInflight.has(key)) return geoInflight.get(key);

  // L3: server cache → fallback to third-party
  const promise = (async () => {
    let result = null;
    try { result = await fetchGeoFromServer(ip); } catch {}
    if (!result) {
      try { result = await fetchGeoFallback(ip); } catch {}
    }
    if (result) geoCache.set(key, result);
    return result;
  })();

  geoInflight.set(key, promise);
  try { return await promise; }
  finally { geoInflight.delete(key); }
}

// ============ Detection methods ============

// 1. Cloudflare cdn-cgi/trace — the primary method for most sites
async function detectCftrace(domain) {
  const resp = await fetch(`https://${domain}/cdn-cgi/trace`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  const text = await resp.text();
  const entries = Object.fromEntries(text.trim().split('\n').map(l => l.split('=')));
  return { ip: entries.ip || null, loc: entries.loc?.toLowerCase() || null };
}

// 2. Alibaba — JSONP via alicdn.com DNS detection
function detectAlibaba() {
  return new Promise((resolve, reject) => {
    const cbName = '__ali_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const randomStr = Date.now() + '-' + Math.random().toString(36).slice(2, 18);
    const url = `https://${randomStr}.dns-detect.alicdn.com/api/detect/DescribeDNSLookup?cb=${cbName}`;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Тайм-аут'));
    }, 5000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      const el = document.getElementById('script-' + cbName);
      if (el) el.remove();
    }

    window[cbName] = (data) => {
      cleanup();
      if (data?.content?.localIp) {
        resolve({
          ip: data.content.localIp,
          countryCode: data.content.ipCountry?.toLowerCase() || null,
        });
      } else {
        reject(new Error('Нет IP Данные'));
      }
    };

    const script = document.createElement('script');
    script.id = 'script-' + cbName;
    script.src = url;
    script.async = true;
    script.onerror = () => { cleanup(); reject(new Error('Не удалось загрузить')); };
    document.body.appendChild(script);
  });
}

// 3. Netease — HEAD request checking cdn-user-ip header
async function detectNetease() {
  const resp = await fetch('https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png', {
    method: 'HEAD',
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  const ip = resp.headers.get('cdn-user-ip');
  if (ip) return { ip };
  throw new Error('Не получено IP');
}

// 4. Bytedance — HEAD request checking x-request-ip / x-response-cinfo
async function detectBytedance(url) {
  const resp = await fetch(url, {
    method: 'HEAD',
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  });
  const ip = resp.headers.get('x-request-ip') || resp.headers.get('x-response-cinfo');
  if (ip) return { ip };
  throw new Error('Не получено IP');
}

// ============ Run single test ============
async function runTest(index) {
  const test = tests[index];
  state[index].status = 'loading';
  renderRow(index);

  try {
    let ip = null, geo = null, countryCode = null;

    switch (test.method) {
      case 'seedon': { const result = await window.radarDirectIP(); if (!result) throw new Error('Источник IP недоступен'); ip = result.ip; break; }
    case 'cftrace': {
        let result;
        try {
          result = await detectCftrace(test.domain);
        } catch (e) {
          if (test.fallbackDomain) {
            result = await detectCftrace(test.fallbackDomain);
          } else {
            throw e;
          }
        }
        ip = result.ip;
        countryCode = result.loc;
        break;
      }
      case 'netease': {
        const result = await detectNetease();
        ip = result.ip;
        break;
      }
      case 'bytedance': {
        const result = await detectBytedance(test.url);
        ip = result.ip;
        break;
      }
    }

    state[index].ip = ip;
    state[index].countryCode = countryCode;
    state[index].status = ip ? 'done' : 'error';
    state[index].error = ip ? null : 'Не получено IP';

    // Geo lookup — always fetch for country code; use existing geo text if available
    if (ip) {
      if (geo) state[index].geo = geo;
      renderRow(index);
      const geoResult = await lookupGeo(ip);
      if (geoResult) {
        if (!geo) state[index].geo = geoResult.geoString;
        if (!state[index].countryCode) {
          state[index].countryCode = geoResult.countryCode;
        }
      }
    }

    renderRow(index);
  } catch (e) {
    state[index].status = 'error';
    state[index].error = e.message || 'Не удалось получить';
    renderRow(index);
  }
}

// ============ Render single row (efficient update) ============
function renderRow(index) {
  const tbody = document.getElementById('tableBody');
  const row = tbody.children[index];
  if (!row) { renderTable(); return; }

  const t = tests[index];
  const s = state[index];
  const fav = t.domain ? faviconUrl(t.name, t.domain) : faviconUrl(t.name);

  let flagCell, ipCell, geoCell;

  if (s.status === 'pending') {
    flagCell = '<td></td>';
    ipCell = '<td><span class="pending-text"></span></td>';
    geoCell = '<td class="geo-col"></td>';
  } else if (s.status === 'loading') {
    flagCell = '<td><div class="loading-bar" style="width:24px;height:24px;border-radius:50%"></div></td>';
    ipCell = '<td><div class="loading-bar" style="width:120px"></div></td>';
    geoCell = '<td class="geo-col"><div class="loading-bar" style="width:180px"></div></td>';
  } else if (s.status === 'error') {
    flagCell = '<td style="font-size:1.2em;text-align:center">?</td>';
    ipCell = `<td><span class="error-text">${s.error || 'Не удалось получить'}</span></td>`;
    geoCell = '<td class="geo-col"></td>';
  } else {
    flagCell = `<td>${flagHTML(s.countryCode)}</td>`;
    ipCell = `<td class="ip-cell">${s.ip || 'Не получено IP'}</td>`;
    geoCell = `<td class="geo-col geo-cell">${s.geo || (s.status === 'done' ? '<div class="loading-bar" style="width:160px"></div>' : '')}</td>`;
  }

  const siteCell = `
    <td>
      <div class="site-cell">
        <img class="favicon" src="${fav}" alt="${t.name}" onerror="this.style.display='none'">
        <span class="site-name">${t.name}</span>
        ${badgeHTML(t.type, t.extra)}
      </div>
    </td>`;

  row.innerHTML = `${siteCell}${flagCell}${ipCell}${geoCell}`;
  renderSplitIpSummary();
}

// Compact IPv6 for display: "2400:6ea0::5145:8d6b:78ff:fe91:a6c" → "2400:6ea0…a6c"
// Keeps first 2 hextets + last 1 hextet to stay within ~15ch (IPv4 width).
// Full IP is preserved in href and title for click + tooltip.
function compactIp(ip) {
  if (!ip || !ip.includes(':')) return ip;  // IPv4 or empty
  if (ip.length <= 22) return ip;             // short IPv6 fits already
  const parts = ip.split(':');
  return parts[0] + ':' + parts[1] + '…' + parts[parts.length - 1];
}

function renderSplitIpSummary() {
  const grid = document.getElementById('splitIpGrid');
  if (!grid) return;
  // Dedupe by IP; keep first non-empty countryCode seen.
  const seen = new Map();
  for (let i = 0; i < state.length; i++) {
    const s = state[i];
    if (!s || s.status !== 'done' || !s.ip) continue;
    if (!seen.has(s.ip)) {
      seen.set(s.ip, s.countryCode || '');
    } else if (!seen.get(s.ip) && s.countryCode) {
      seen.set(s.ip, s.countryCode);
    }
  }
  const cells = [];
  for (const [ip, cc] of seen.entries()) {
    const lc = (cc || '').toLowerCase();
    const flagSrc = lc === 'cn'
      ? 'https://ip.net.coffee/favicons/cn.png'
      : lc === 'tw'
      ? 'https://ip.net.coffee/favicons/flags/tw.png'
      : (lc ? `https://ip.net.coffee/favicons/flags/${lc}.png` : '');
    const flagAlt = lc === 'tw' ? 'Тайвань' : lc;
    const flagHtml = flagSrc
      ? `<img class="split-flag" width="40" height="27" src="${flagSrc}" alt="${flagAlt}" onerror="this.style.display='none'">`
      : '<span class="split-flag" style="display:inline-block"></span>';
    const ipEsc = String(ip).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const displayEsc = String(compactIp(ip)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    cells.push(
      `<a class="split-ip-cell" href="${window.radarURL('ip/index.html?ip=' + encodeURIComponent(ip))}" target="_blank" rel="noopener" title="Проверка ${ipEsc} для IP Качество">`
      + flagHtml
      + `<span class="split-ip">${displayEsc}</span>`
      + '</a>'
    );
  }
  grid.innerHTML = cells.join('');
}

// ============ Concurrency limiter (sliding window) ============
function runWithLimit(items, limit, worker) {
  return new Promise(resolve => {
    let cursor = 0, active = 0, done = 0;
    const total = items.length;
    if (total === 0) return resolve();
    function next() {
      while (active < limit && cursor < total) {
        const i = cursor++;
        active++;
        Promise.resolve(worker(i)).catch(() => {}).finally(() => {
          active--;
          done++;
          if (done === total) resolve();
          else next();
        });
      }
    }
    next();
  });
}

// ============ Run all tests with auto-retry ============
async function runAll() {
  const MAX_RETRIES = 2;
  // First pass: run all concurrently
  await runWithLimit(tests, 5, i => runTest(i));

  // Retry failed ones, up to MAX_RETRIES times
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const failedIndices = state
      .map((s, i) => (s.status === 'error') ? i : -1)
      .filter(i => i >= 0);
    if (failedIndices.length === 0) break;
    // Wait a bit before retrying
    await new Promise(r => setTimeout(r, 2000 * attempt));
    await runWithLimit(failedIndices, 5, idx => runTest(failedIndices[idx]));
  }
}

// ============ Init ============
// Section 1: IP query + ping
renderPingGrid();
runIPQuery();
runPings();

// Section 2: Split tunnel tests
renderTable();
runAll();



function maskIpText(text) {
  if (!text) return '';
  const t = String(text).trim();
  // IPv4: 1.2.3.4 → 1.2.*.*
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(t)) {
    const parts = t.split('.');
    return parts[0] + '.' + parts[1] + '.*.*';
  }

  if (t.includes('…')) {
    const idx = t.lastIndexOf('…');
    return t.substring(0, idx + 1) + '*';
  }

  if (t.includes(':')) {
    const parts = t.split(':');
    if (parts.length >= 2) {
      return parts[0] + ':' + parts[1] + ':*';
    }
  }
  return t;
}

window.__ipMaskOn = false;

function applyMaskToElement(el) {
  if (!el) return;
  if (!el.dataset.realText) {
    el.dataset.realText = el.textContent.trim();
  }
  const real = el.dataset.realText;
  const want = window.__ipMaskOn ? maskIpText(real) : real;
  if (el.textContent !== want) el.textContent = want;
}

window.applyAllIpMasks = function applyAllIpMasks() {
  document.querySelectorAll('.ip-card .ip-link, .split-ip-cell .split-ip, .main-table td.ip-cell').forEach(applyMaskToElement);
};

document.addEventListener('DOMContentLoaded', () => {
  const tg = document.getElementById('ipMaskToggle');
  if (tg) {
    tg.checked = window.__ipMaskOn;
    tg.addEventListener('change', (e) => {
      window.__ipMaskOn = e.target.checked;

      // Re-render all IP-bearing elements: clear realText first so next pass picks up real value
      document.querySelectorAll('.ip-card .ip-link, .split-ip-cell .split-ip, .main-table td.ip-cell').forEach(el => {
        // If we're switching ON, ensure realText is captured BEFORE we overwrite textContent
        if (!el.dataset.realText) el.dataset.realText = el.textContent.trim();
      });
      applyAllIpMasks();
    });
  }
  applyAllIpMasks();
});

// Re-apply mask whenever IP-bearing containers update (idempotent — only writes when needed)
(function setupIpMaskObserver(){
  const targets = ['ipCard', 'splitIpGrid', 'tableBody'];
  const cb = () => requestAnimationFrame(() => window.applyAllIpMasks && window.applyAllIpMasks());
  const observer = new MutationObserver(cb);
  document.addEventListener('DOMContentLoaded', () => {
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el, { childList: true, subtree: true });
    });
  });
})();


