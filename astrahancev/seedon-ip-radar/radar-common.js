/* Seedon IP Radar: shared network adapters for static hosting. */
(function () {
  'use strict';
  const script = document.currentScript;
  const root = new URL('./', script.src);
  const originalFetch = window.fetch.bind(window);
  const regionNames = new Intl.DisplayNames(['ru'], {type: 'region'});
  const indicators = {none:'Все системы работают',minor:'Частичный сбой',major:'Крупный сбой',critical:'Критический сбой',maintenance:'Технические работы',unknown:'Статус недоступен'};
  const componentStates = {operational:'Работает',degraded_performance:'Работает медленно',partial_outage:'Частичный сбой',major_outage:'Недоступен',under_maintenance:'Технические работы'};
  window.radarURL = path => new URL(path, root).href;
  window.radarCountry = code => { try {return regionNames.of(String(code).toUpperCase());} catch {return code || '';} };
  window.radarDirectIP = async function () {
    const sources = [
      ['https://seedon.ru/api/myip', 'Seedon · DIRECT'],
      ['https://yandex.ru/internet/api/v0/ip', 'Яндекс · резервный источник'],
      ['https://api.ipify.org?format=json', 'ipify · маршрут зависит от VPN']
    ];
    for (let i = 0; i < sources.length; i++) {
      const [url, source] = sources[i];
      try {
        const response = await originalFetch(url, {signal: AbortSignal.timeout(6000), cache:'no-store'});
        if (!response.ok) continue;
        const text = await response.text();
        let data;
        try {data = JSON.parse(text);} catch {data = text.trim();}
        const ip = typeof data === 'string' ? data.trim() : data.ip || data.address;
        if (!window.radarValidIP(ip)) continue;
        return {ip, geo:'', source, direct:i === 0};
      } catch {}
    }
    return null;
  };
  window.radarValidIP = function (ip) {
    if (typeof ip !== 'string') return false;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return ip.split('.').every(n => +n <= 255);
    if (!ip.includes(':') || !/^[0-9a-f:]+$/i.test(ip) || ip.length > 39) return false;
    try {new URL('https://[' + ip + ']/'); return true;} catch {return false;}
  };
  function normalizeStatus(data) {
    const indicator = data.status?.indicator || data.overall_indicator || 'unknown';
    return {...data, overall_indicator:indicator, overall:indicators[indicator] || indicators.unknown,
      fetched_at:data.page?.updated_at || data.fetched_at || new Date().toISOString(),
      components:(data.components || []).map(c => ({...c,status_cn:componentStates[c.status] || 'Нет данных'}))};
  }
  async function summary(provider, options) {
    try {
      const endpoint = provider === 'claude' ? 'https://status.claude.com/api/v2/summary.json' : 'https://status.openai.com/api/v2/summary.json';
      const response = await originalFetch(endpoint, {...options, signal:options?.signal || AbortSignal.timeout(7000)});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data.status || !Array.isArray(data.components)) throw new Error('Некорректный ответ Statuspage');
      return normalizeStatus(data);
    } catch {
      const response = await originalFetch(window.radarURL((provider === 'claude' ? 'claude' : 'gpt') + '/status-fallback.json'));
      return normalizeStatus(await response.json());
    }
  }
  const services = [
    ['claude','Claude (Anthropic)','AI','https://status.claude.com'],
    ['openai','OpenAI / ChatGPT','AI','https://status.openai.com'],
    ['cloudflare','Cloudflare','Облака','https://www.cloudflarestatus.com'],
    ['cursor','Cursor','AI','https://status.cursor.com'],
    ['elevenlabs','ElevenLabs','AI','https://status.elevenlabs.io'],
    ['groq','Groq','AI','https://groqstatus.com'],
    ['perplexity','Perplexity','AI','https://status.perplexity.com'],
    ['replicate','Replicate','AI','https://www.replicatestatus.com'],
    ['digitalocean','DigitalOcean','Облака','https://status.digitalocean.com'],
    ['flyio','Fly.io','Облака','https://status.flyio.net'],
    ['vercel','Vercel','Облака','https://www.vercel-status.com'],
    ['github','GitHub','Разработка','https://www.githubstatus.com'],
    ['atlassian','Atlassian / Jira','Разработка','https://jira-software.status.atlassian.com'],
    ['clerk','Clerk','Разработка','https://status.clerk.com'],
    ['figma','Figma','Разработка','https://status.figma.com'],
    ['notion','Notion','Разработка','https://www.notion-status.com'],
    ['pythoninfra','Python / PyPI','Разработка','https://status.python.org'],
    ['stripe','Stripe','Разработка','https://status.stripe.com'],
    ['sentry','Sentry','Разработка','https://status.sentry.io'],
    ['sendgrid','SendGrid','Разработка','https://status.sendgrid.com'],
    ['twilio','Twilio','Разработка','https://status.twilio.com'],
    ['discord','Discord','Сообщество','https://discordstatus.com'],
    ['reddit','Reddit','Сообщество','https://www.redditstatus.com'],
    ['npm','npm','Разработка','https://status.npmjs.org'],
    ['netlify','Netlify','Облака','https://www.netlifystatus.com'],
    ['render','Render','Облака','https://status.render.com'],
    ['supabase','Supabase','Облака','https://status.supabase.com'],
    ['huggingface','Hugging Face','AI','https://status.huggingface.co'],
    ['grok','Grok / xAI','AI','https://status.x.ai'],
    ['pinterest','Pinterest','Сообщество','https://www.pintereststatus.com'],
    ['twitch','Twitch','Сообщество','https://status.twitch.com']
  ];
  window.radarServiceStatuses = async function () {
    const results = [];
    // Four concurrent status requests; no background worker or server-side polling.
    let cursor = 0;
    async function worker() {
      while (cursor < services.length) {
        const [key,name,group,page] = services[cursor++];
        let data, ok = true;
        try {
          if (key === 'claude' || key === 'openai') data = await summary(key);
          else {
            const response = await originalFetch(page + '/api/v2/summary.json', {signal:AbortSignal.timeout(6000)});
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const raw = await response.json();
            if (!raw.status) throw new Error('Statuspage недоступен');
            data = normalizeStatus(raw);
          }
          ok = data.overall_indicator !== 'unknown';
        } catch {data = normalizeStatus({}); ok = false;}
        const indicator = data.overall_indicator;
        results.push({key,name,name_cn:name,group,tag:group,tag_slug:group === 'AI'?'ai':group === 'Облака'?'cloud':group === 'Разработка'?'dev':'comm',
          page_url:page,indicator,indicator_cn:indicators[indicator],description:data.overall,ok,
          level:({none:0,minor:2,major:3,critical:4,maintenance:1})[indicator] ?? -1,
          incidents:data.incidents || [],scheduled:data.scheduled_maintenances || [],
          favicon_url:window.radarURL('favicon.svg'),last_check_at:data.fetched_at,
          detail_url:key === 'claude'?window.radarURL('claude/status.html'):page,detail_label:'Официальный статус'});
      }
    }
    await Promise.all(Array.from({length:4}, worker));
    return {services:results,count:results.length,failing:results.filter(s=>s.level>=2).length,fetched_at:new Date().toISOString()};
  };
  function jsonResponse(data, response) {
    return new Response(JSON.stringify(data), {status:response?.status || 200,headers:{'Content-Type':'application/json; charset=utf-8'}});
  }
  function translateData(data) {
    if (window.radarTranslateData) data = window.radarTranslateData(data);
    if (!data || typeof data !== 'object') return data;
    const cc = data.country_code || data.countryCode;
    if (cc && /^[a-z]{2}$/i.test(cc)) data.country = window.radarCountry(cc);
    if (data.registered_country_code) data.registered_country = window.radarCountry(data.registered_country_code);
    return data;
  }
  window.fetch = async function (input, options) {
    let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('/api/')) url = 'https://ip.net.coffee' + url;
    if (/status\.claude\.com\/api\/v2\/summary\.json/.test(url)) return jsonResponse(await summary('claude', options));
    if (/status\.openai\.com\/api\/v2\/summary\.json/.test(url)) return jsonResponse(await summary('gpt', options));
    if (url.includes('/status/data.json')) return jsonResponse(await window.radarServiceStatuses());
    const geo = url.match(/^https:\/\/ip\.net\.coffee\/api\/geoip\/([^?#]+)/);
    if (geo) {
      try {
        const response = await originalFetch(url, options);
        if (!response.ok) throw new Error('GeoIP HTTP ' + response.status);
        const data = await response.json();
        if (!data.country_code && !data.countryCode && !data.country) throw new Error('Нет геоданных');
        return jsonResponse(translateData(data), response);
      } catch {
        const response = await originalFetch('https://ipwho.is/' + geo[1] + '?lang=ru', {signal:AbortSignal.timeout(6000)});
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error('Геолокация недоступна');
        return jsonResponse(translateData({...data,isp:data.connection?.isp || '',asn:data.connection?.asn,
          countryCode:data.country_code,asOrganization:data.connection?.org || ''}));
      }
    }
    const response = await originalFetch(typeof input === 'string' || input instanceof URL ? url : input, options);
    if (/^https:\/\/ip\.net\.coffee\/api\//.test(url) && response.headers.get('Content-Type')?.includes('json')) {
      return jsonResponse(translateData(await response.json()), response);
    }
    return response;
  };
  // Rebase URLs created by legacy template strings after asynchronous rendering.
  function fixLink(link) {
    const raw = link.getAttribute('href');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return;
    const match = raw.match(/^\/ip\/([^/?#]+)$/);
    if (match) link.href = window.radarURL('ip/index.html?ip=' + encodeURIComponent(decodeURIComponent(match[1])));
    else link.href = window.radarURL(raw.slice(1));
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href]').forEach(fixLink);
    new MutationObserver(records => records.forEach(record => {
      if (record.type === 'attributes') fixLink(record.target);
      for (const node of record.addedNodes) if (node.nodeType === 1) {
        if (node.matches('a[href]')) fixLink(node);
        node.querySelectorAll('a[href]').forEach(fixLink);
      }
    })).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
  });
})();
