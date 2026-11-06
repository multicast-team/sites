import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
let passed = 0;
function harness(route) {
  const calls = [];
  const context = vm.createContext({URL,URLSearchParams,Response,Request,AbortSignal,Intl,Map,Set,Date,console,
    document:{currentScript:{src:'https://example.test/nested/radar-common.js'},addEventListener(){}},
    fetch:async (input, options) => {const url=typeof input==='string'?input:input.url; calls.push({url,options}); return route(url,options);}});
  context.window=context;
  vm.runInContext(readFileSync(new URL('radar-translations.js',root),'utf8'),context);
  vm.runInContext(readFileSync(new URL('radar-common.js',root),'utf8'),context);
  return {context,calls};
}
const json = (data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function test(name,run){await run();passed++;console.log('PASS '+name);}
await test('Portable root URL and IPv6 links',async()=>{
 const {context:c}=harness(()=>json({}));assert.equal(c.radarURL('ip/index.html?ip=::1'),'https://example.test/nested/ip/index.html?ip=::1');
});
await test('DIRECT primary: only Seedon is called',async()=>{
 const {context:c,calls}=harness(()=>json({ip:'198.51.100.5'}));const d=await c.radarDirectIP();assert.equal(d.direct,true);assert.equal(calls.length,1);assert.equal(calls[0].url,'https://seedon.ru/api/myip');
});
await test('Yandex fallback accepts a JSON string, marks route unverified',async()=>{
 const {context:c,calls}=harness(url=>{if(url.includes('seedon.ru'))throw Error('offline');return json('198.51.100.6');});const d=await c.radarDirectIP();assert.equal(d.direct,false);assert.equal(d.ip,'198.51.100.6');assert.equal(calls.length,2);
});
await test('ipify fallback is third and explicitly names VPN-dependent routing',async()=>{
 const {context:c,calls}=harness(url=>{if(!url.includes('ipify'))throw Error('offline');return json({ip:'203.0.113.7'});});const d=await c.radarDirectIP();assert.equal(d.direct,false);assert.match(d.source,/VPN/);assert.equal(calls.length,3);
});
await test('All DIRECT sources fail without inventing an IP',async()=>{
 const {context:c}=harness(()=>{throw Error('offline');});assert.equal(await c.radarDirectIP(),null);
});
await test('Invalid source IP and IPv6 validation',async()=>{
 const {context:c}=harness(()=>json({ip:'999.1.1.1'}));assert.equal(await c.radarDirectIP(),null);assert.equal(c.radarValidIP('2001:db8::1'),true);assert.equal(c.radarValidIP('::1::2'),false);assert.equal(c.radarValidIP('<img src=x>'),false);
});
await test('Absolute legacy API URL, country and backend string translation',async()=>{
 const {context:c,calls}=harness(()=>json({country:'美国',country_code:'US',label:'高危'}));const d=await (await c.fetch('/api/iprisk/1.1.1.1')).json();assert.equal(calls[0].url,'https://ip.net.coffee/api/iprisk/1.1.1.1');assert.equal(d.country,'Соединенные Штаты');assert.equal(d.label,'Высокий риск');
});
await test('GeoIP HTTP failure falls back to ipwho.is in Russian',async()=>{
 const {context:c,calls}=harness(url=>url.includes('/api/geoip/')?json({},502):json({success:true,country_code:'DE',country:'Germany',city:'Берлин',connection:{isp:'Example ISP',asn:64500}}));
 const d=await (await c.fetch('https://ip.net.coffee/api/geoip/1.1.1.1')).json();assert.equal(d.country,'Германия');assert.equal(d.isp,'Example ISP');assert.equal(d.asn,64500);assert.equal(calls[1].url,'https://ipwho.is/1.1.1.1?lang=ru');
});
await test('Claude official Statuspage fields are adapted',async()=>{
 const {context:c}=harness(()=>json({status:{indicator:'major'},page:{updated_at:'2026-11-06T12:00:00Z'},components:[{name:'API',status:'major_outage'}],incidents:[]}));const d=await (await c.fetch('https://status.claude.com/api/v2/summary.json')).json();assert.equal(d.overall_indicator,'major');assert.equal(d.components[0].status_cn,'Недоступен');
});
await test('Claude offline fallback stays unknown, never healthy',async()=>{
 const {context:c,calls}=harness(url=>{if(url.includes('status-fallback.json'))return json({overall_indicator:'unknown',components:[],incidents:[]});throw Error('CORS');});const d=await (await c.fetch('https://status.claude.com/api/v2/summary.json')).json();assert.equal(d.overall_indicator,'unknown');assert.equal(calls[1].url,'https://example.test/nested/claude/status-fallback.json');
});
await test('OpenAI offline fallback resolves to gpt/status-fallback.json',async()=>{
 const {context:c,calls}=harness(url=>{if(url.includes('status-fallback.json'))return json({overall_indicator:'unknown'});throw Error('CORS');});const d=await (await c.fetch('https://status.openai.com/api/v2/summary.json')).json();assert.equal(d.overall_indicator,'unknown');assert.equal(calls[1].url,'https://example.test/nested/gpt/status-fallback.json');
});
await test('Malformed official payload uses unknown fallback',async()=>{
 const {context:c}=harness(url=>json(url.includes('status-fallback.json')?{overall_indicator:'unknown'}:{}));const d=await (await c.fetch('https://status.claude.com/api/v2/summary.json')).json();assert.equal(d.overall_indicator,'unknown');
});
await test('Service aggregation preserves unavailable services',async()=>{
 const {context:c}=harness(url=>{if(url.includes('status-fallback.json'))return json({overall_indicator:'unknown'});throw Error('offline');});const data=await c.radarServiceStatuses();assert.equal(data.count,31);assert.equal(data.services.length,31);assert.equal(data.failing,0);assert(data.services.every(s=>s.indicator==='unknown' && s.level===-1 && !s.ok));
});
console.log(`Network adapter checks: ${passed} passed`);
