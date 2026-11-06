
const NODES = [
  // Asia
  { id: 'n01', name: 'Шанхай, Китай', cc: 'cn', city: 'Shanghai', continent: 'Азия', cIcon: '🌏' },
  { id: 'n02', name: 'Гонконг', cc: 'hk', city: 'Hong Kong', continent: 'Азия', cIcon: '🌏' },
  { id: 'n03', name: 'Токио, Япония', cc: 'jp', city: 'Tokyo', continent: 'Азия', cIcon: '🌏' },
  { id: 'n04', name: 'Сингапур', cc: 'sg', city: 'Singapore', continent: 'Азия', cIcon: '🌏' },
  { id: 'n05', name: 'Хошимин, Вьетнам', cc: 'vn', city: 'Ho Chi Minh City', continent: 'Азия', cIcon: '🌏' },
  { id: 'n06', name: 'Джакарта, Индонезия', cc: 'id', city: 'Jakarta', continent: 'Азия', cIcon: '🌏' },
  { id: 'n07', name: 'Мумбаи, Индия', cc: 'in', city: 'Mumbai', continent: 'Азия', cIcon: '🌏' },
  { id: 'n08', name: 'Тель-Авив, Израиль', cc: 'il', city: 'Tel Aviv', continent: 'Азия', cIcon: '🌏' },
  // Americas
  { id: 'n09', name: 'Лос-Анджелес, США', cc: 'us', city: 'Los Angeles', continent: 'Америка', cIcon: '🌎' },
  { id: 'n10', name: 'Атланта, США', cc: 'us', city: 'Atlanta', continent: 'Америка', cIcon: '🌎' },
  { id: 'n11', name: 'Ванкувер, Канада', cc: 'ca', city: 'Vancouver', continent: 'Америка', cIcon: '🌎' },
  { id: 'n12', name: 'Сан-Паулу, Бразилия', cc: 'br', city: 'Sao Paulo', continent: 'Америка', cIcon: '🌎' },
  // Europe
  { id: 'n13', name: 'Франкфурт, Германия', cc: 'de', city: 'Frankfurt', continent: 'Европа', cIcon: '🌍' },
  { id: 'n14', name: 'Амстердам, Нидерланды', cc: 'nl', city: 'Amsterdam', continent: 'Европа', cIcon: '🌍' },
  { id: 'n15', name: 'Париж, Франция', cc: 'fr', city: 'Paris', continent: 'Европа', cIcon: '🌍' },
  { id: 'n16', name: 'Стокгольм, Швеция', cc: 'se', city: 'Stockholm', continent: 'Европа', cIcon: '🌍' },
  { id: 'n17', name: 'Цюрих, Швейцария', cc: 'ch', city: 'Zurich', continent: 'Европа', cIcon: '🌍' },
  { id: 'n18', name: 'Мадрид, Испания', cc: 'es', city: 'Madrid', continent: 'Европа', cIcon: '🌍' },
  { id: 'n19', name: 'Москва, Россия', cc: 'ru', city: 'Moscow', continent: 'Европа', cIcon: '🌍' },
  { id: 'n20', name: 'Стамбул, Турция', cc: 'tr', city: 'Istanbul', continent: 'Европа', cIcon: '🌍' },
];

function pingHostLabel() {
  const pf = window.__PING_PREFILL;
  const h = (pf && pf.ip) || ((document.getElementById('hostInput') || {}).value || '').trim();
  return String(h).replace(/[<>"'&]/g, '');
}
function flagImg(cc, name) {
  const src = cc === 'cn' ? 'https://ip.net.coffee/favicons/cn.png' : cc === 'tw' ? 'https://ip.net.coffee/favicons/flags/tw.png' : `https://ip.net.coffee/favicons/flags/${cc}.png`;
  const host = name ? pingHostLabel() : '';
  const seo = host ? `Из${name}до${host}для Ping Данные задержки` : '';
  const altTxt = seo || (cc === 'tw' ? 'Тайвань' : cc);
  const ttl = seo ? ` title="${seo}"` : '';
  return `<img src="${src}" width="40" height="27" alt="${altTxt}"${ttl} onerror="this.onerror=null;this.style.display='none'">`;
}
function refreshFlagTitles(host) {
  const h = String(host || '').replace(/[<>"'&]/g, '');
  if (!h) return;
  NODES.forEach((n, i) => {
    const img = document.querySelector('#row-' + i + ' img');
    if (img) { img.alt = img.title = 'Из' + n.name + 'до' + h + 'для Ping Данные задержки'; }
  });
}

function pingClass(ms) {
  if (ms < 100) return 'ping-ok';
  if (ms < 200) return 'ping-med';
  if (ms < 350) return 'ping-slow';
  return 'ping-bad';
}


function renderTable() {
  const tbody = document.getElementById('resultsBody');
  let lastContinent = '';
  tbody.innerHTML = NODES.map((n, i) => {
    let sep = '';
    if (n.continent !== lastContinent) {
      lastContinent = n.continent;
      sep = `<tr class="continent-row"><td colspan="4">${n.cIcon} ${n.continent}</td></tr>`;
    }
    return `${sep}<tr id="row-${i}">
      <td><div class="node-cell">${flagImg(n.cc, n.name)} ${n.name}<span class="node-city" style="color: var(--text-muted);font-size:0.82em;margin-left:4px">${n.city}</span></div></td>
      <td class="ping-val ping-wait" id="min-${i}">--</td>
      <td class="ping-val ping-wait" id="avg-${i}">--</td>
      <td class="ping-val ping-wait" id="max-${i}">--</td>
    </tr>`;
  }).join('');
}

function showLoading() {
  NODES.forEach((_, i) => {
    document.getElementById(`min-${i}`).className = 'ping-val ping-wait';
    document.getElementById(`min-${i}`).innerHTML = '<div class="loading-bar" style="width:36px"></div>';
    document.getElementById(`avg-${i}`).innerHTML = '<div class="loading-bar" style="width:36px"></div>';
    document.getElementById(`max-${i}`).innerHTML = '<div class="loading-bar" style="width:36px"></div>';
  });
}

function updateRow(index, data) {
  // data is array of [["OK", latency_sec, ip?], ...] or null
  if (!data || !data[0]) {
    document.getElementById(`min-${index}`).innerHTML = '<span class="ping-err">Тайм-аут</span>';
    document.getElementById(`avg-${index}`).textContent = '--';
    document.getElementById(`max-${index}`).textContent = '--';
    return;
  }

  const pings = data[0];
  const times = pings.filter(p => p[0] === 'OK').map(p => Math.round(p[1] * 1000));

  if (times.length === 0) {
    document.getElementById(`min-${index}`).innerHTML = '<span class="ping-err">Недоступен</span>';
    document.getElementById(`avg-${index}`).textContent = '--';
    document.getElementById(`max-${index}`).textContent = '--';
    return;
  }

  const min = Math.min(...times);
  const max = Math.max(...times);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

  const cls = pingClass(avg);
  document.getElementById(`min-${index}`).className = `ping-val ${cls}`;
  document.getElementById(`min-${index}`).textContent = min + ' ms';
  document.getElementById(`avg-${index}`).className = `ping-val ping-avg ${cls}`;
  document.getElementById(`avg-${index}`).textContent = avg + ' ms';
  document.getElementById(`max-${index}`).className = `ping-val ${cls}`;
  document.getElementById(`max-${index}`).textContent = max + ' ms';
}

let polling = false;

async function startPing() {
  const host = document.getElementById('hostInput').value.trim();
  if (!host) return;
  if (polling) return;
  refreshFlagTitles(host);

  const btn = document.getElementById('pingBtn');
  btn.disabled = true;
  btn.textContent = 'Проверка...';
  polling = true;
  showLoading();

  try {
    // Build node filter
    const nodeParam = NODES.map(n => `node=${n.id}`).join('&');
    // Get user IP for rate limiting
    let userIp = 'unknown';
    try {
      const tr = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: AbortSignal.timeout(3000) });
      const txt = await tr.text();
      const m = txt.match(/ip=([^\n]+)/);
      if (m) userIp = m[1].trim();
    } catch {}

    const url = `https://ip.net.coffee/api/ping/start?host=${encodeURIComponent(host)}&user_ip=${encodeURIComponent(userIp)}&${nodeParam}&force=1`;
    const _note = document.getElementById('ping-cache-note'); if (_note) _note.style.display = 'none';
    try { if (/^[0-9a-fA-F.:]+$/.test(host) && location.pathname !== '/ping/' + host) history.replaceState(null, '', '/ping/' + host); } catch (e) {}
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await resp.json();

    // Rate limited?
    if (data.error) {
      NODES.forEach((_, i) => {
        document.getElementById(`status-${i}`).innerHTML = `<span class="ping-err">${data.error}</span>`;
        document.getElementById(`min-${i}`).textContent = '--';
        document.getElementById(`avg-${i}`).textContent = '--';
        document.getElementById(`max-${i}`).textContent = '--';
      });
      return;
    }

    // Cached result from server?
    if (data.cached) {
      const results = data.results;
      NODES.forEach((n, i) => { if (results[n.id]) updateRow(i, results[n.id]); });
      return;
    }

    const requestId = data.request_id;
    if (!requestId) throw new Error('No request ID');

    // Poll for results (max 15 seconds)
    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      attempts++;
      await new Promise(r => setTimeout(r, 1500));

      const rResp = await fetch(`https://ip.net.coffee/api/ping/result/${requestId}`, { signal: AbortSignal.timeout(10000) });
      const results = await rResp.json();

      let allDone = true;
      NODES.forEach((n, i) => {
        const nodeData = results[n.id];
        if (nodeData) {
          updateRow(i, nodeData);
        } else {
          allDone = false;
        }
      });

      if (!allDone && attempts < maxAttempts) {
        await poll();
      }
    };

    await poll();

  } catch (e) {
    NODES.forEach((_, i) => {
      const st = document.getElementById(`status-${i}`);
      if (st.querySelector('.loading-bar')) {
        st.innerHTML = '<span class="ping-err">Запрос не удался</span>';
      }
    });
  } finally {
    polling = false;
    btn.disabled = false;
    btn.textContent = 'Ping';

    const note = document.getElementById('ping-cache-note');
    const txt = document.getElementById('ping-note-text');
    if (note && txt && document.querySelector('#resultsBody .ping-val.ping-ok, #resultsBody .ping-val.ping-med, #resultsBody .ping-val.ping-slow, #resultsBody .ping-val.ping-bad')) {
      const d = new Date(Date.now() + (8 * 60 + new Date().getTimezoneOffset()) * 60000);
      const p = n => String(n).padStart(2, '0');
      txt.textContent = 'Выше показаны ' + host + ' Результат последней проверки ('
        + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' '
        + p(d.getHours()) + ':' + p(d.getMinutes()) + ', Время UTC+8), ';
      note.style.display = '';
    }
  }
}

// Auto-fill Cloudflare IP on load
function pingAgain() {

  try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) {}
  window.scrollTo(0, 0);
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
  startPing();
}

async function init() {
  renderTable();
  const again = document.getElementById('ping-again');
  if (again) {
    again.addEventListener('click', pingAgain);
    again.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pingAgain(); }
    });
  }

  const pf = window.__PING_PREFILL;
  if (pf && pf.ip) {
    document.getElementById('hostInput').value = pf.ip;
    if (pf.results) NODES.forEach((n, i) => { if (pf.results[n.id]) updateRow(i, pf.results[n.id]); });
    return;
  }
  try {
    const r = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: AbortSignal.timeout(5000) });
    const txt = await r.text();
    const m = txt.match(/ip=([^\n]+)/);
    if (m) {
      document.getElementById('hostInput').value = m[1].trim();
    }
  } catch {}
}

init();

// Enter key triggers ping
document.getElementById('hostInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') startPing();
});

