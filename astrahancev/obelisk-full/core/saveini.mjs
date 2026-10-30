// spec: saveini
// INI-сейв, части 1–3 (секции 1–47): запись и разбор текста (spec oracle/specs/saveini.md, правила 1–7, 10–21).
// Имена секций и ключей — только из data/systems/save.json (iniLayout, iniLayoutPart2, iniLayoutPart3, iniLoadDefaults,
// iniSectionFormats, iniFormats, newGame, noGlobal).

const MAX_VALUE = 255; // правило 3а (только числа «%.6f», правило 14)
const dv = new DataView(new ArrayBuffer(8));

/** Запись числа: точное значение double, округлённое до constants.iniDecimals знаков к ближайшему (правила 3–4), без обрезки. */
export function formatIniReal(x, decimals = 6) {
  if (!Number.isFinite(x)) return String(x);
  dv.setFloat64(0, x);
  const b = dv.getBigUint64(0);
  const neg = (b >> 63n) === 1n;
  const be = Number((b >> 52n) & 0x7ffn);
  const frac = b & ((1n << 52n) - 1n);
  const m = be === 0 ? frac : frac | (1n << 52n);
  const e = (be === 0 ? 1 : be) - 1075; // x = m · 2^e
  const scale = BigInt('1' + '0'.repeat(decimals));
  let q;
  if (e >= 0) q = (m << BigInt(e)) * scale;
  else {
    const num = m * scale;
    const den = 1n << BigInt(-e);
    q = num / den;
    const r2 = (num % den) * 2n;
    if (r2 > den || (r2 === den && (q & 1n) === 1n)) q += 1n;
  }
  const t = q.toString().padStart(decimals + 1, '0');
  return (neg ? '-' : '') + t.slice(0, -decimals) + '.' + t.slice(-decimals);
}

function kindMap(saveData) {
  const kinds = new Map();
  for (const name of ['newGame', 'noGlobal']) {
    const { columns, rows } = saveData.tables[name];
    const iKey = columns.indexOf('key');
    const iKind = columns.indexOf('kind');
    for (const r of rows) kinds.set(r[iKey], r[iKind]);
  }
  for (const r of table(saveData, 'iniLoadDefaults')) if (!kinds.has(r.key)) kinds.set(r.key, r.kind);
  return kinds;
}

function layout(saveData) {
  const { columns, rows } = saveData.tables.iniLayout;
  const iSec = columns.indexOf('section');
  const iKey = columns.indexOf('key');
  return rows.map((r) => [r[iSec], r[iKey]]);
}

/** Значение словаря → текст между кавычками (правила 3, 5, 6, 3а). */
function valueText(v, kind, decimals) {
  let s;
  if (kind === 'string') return String(v ?? '');
  if (typeof v === 'boolean') s = formatIniReal(Number(v), decimals);
  else s = formatIniReal(v ?? 0, decimals);
  return s.length > MAX_VALUE ? s.slice(0, MAX_VALUE) : s;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[n >> 18] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

function fromBase64(text) {
  const t = text.replace(/=+$/, '');
  const out = [];
  let acc = 0, bits = 0;
  for (const ch of t) {
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); acc &= (1 << bits) - 1; }
  }
  return Uint8Array.from(out);
}

/** «Текст числа» (правило 11): целое из [−лимит, лимит) — цифры, иначе фиксированные знаки (округление как в правиле 3). */
export function formatIniNumText(x, constants) {
  const lim = constants.iniNumTextIntLimit;
  if (Number.isInteger(x) && x >= -lim && x < lim) return BigInt(x).toString();
  return formatIniReal(x, constants.iniNumTextDecimals);
}

function table(saveData, name) {
  const { columns, rows } = saveData.tables[name];
  return rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
}

function intText(x) {
  return Number.isInteger(x) ? BigInt(x).toString() : formatIniReal(x);
}

/** Список zN~ (правило 12): префикс, «~», base64 от deflate от UTF-8 записей. */
function encodeList(list, prefix, saveData, deflate) {
  const c = saveData.constants;
  const fields = table(saveData, 'iniListFields');
  const body = list.map((e) => fields.map((f) => {
    const v = e[f.field];
    if (v === f.empty && f.empty !== null) return '';
    return f.kind === 'string' ? String(v ?? '') : intText(v ?? 0);
  }).join(c.iniListFieldSep)).join(c.iniListEntrySep) + c.iniListEnd;
  return prefix + c.iniListPrefixSep + toBase64(deflate(new TextEncoder().encode(body)));
}

function decodeList(raw, saveData, inflate) {
  const c = saveData.constants;
  const fields = table(saveData, 'iniListFields');
  const defaults = table(saveData, 'iniListLoadDefaults');
  let body = new TextDecoder().decode(inflate(fromBase64(raw.slice(raw.indexOf(c.iniListPrefixSep) + 1))));
  if (body.endsWith(c.iniListEnd)) body = body.slice(0, -c.iniListEnd.length);
  if (body === '') return [];
  return body.split(c.iniListEntrySep).map((rec) => {
    const parts = rec.split(c.iniListFieldSep);
    const e = {};
    fields.forEach((f, i) => {
      const p = parts[i] ?? '';
      e[f.field] = f.kind === 'string' ? p : (p === '' ? f.empty : Number(p));
    });
    for (const d of defaults) e[d.field] = d.value;
    return e;
  });
}

function formats(saveData) {
  return new Map(table(saveData, 'iniFormats').map((r) => [r.key, r]));
}

const LAYOUTS = { 1: 'iniLayout', 2: 'iniLayoutPart2', 3: 'iniLayoutPart3' };

/** Раскладка части: [секция, ключ, presence] (у частей 1–2 столбца presence нет — «always»). */
function layoutOf(saveData, part) {
  const { columns, rows } = saveData.tables[LAYOUTS[part]];
  const iSec = columns.indexOf('section');
  const iKey = columns.indexOf('key');
  const iPres = columns.indexOf('presence');
  return rows.map((r) => [r[iSec], r[iKey], iPres < 0 ? 'always' : r[iPres]]);
}

/** Порядок записи (правило 16): [[секция, [ключи]]] с учётом порядка загруженного файла и «после загрузки» (правило 17). */
function plan(rows, dict, order) {
  const secs = new Map();
  for (const [s, k, pres] of rows) {
    if (!secs.has(s)) secs.set(s, []);
    secs.get(s).push([k, pres]);
  }
  const present = ([k, pres], s) => pres !== 'afterLoad' || `${s}/${k}` in dict;
  const result = [];
  const done = new Set();
  const emit = (s, ordKeys) => {
    const items = secs.get(s);
    const byKey = new Map(items.map((it) => [it[0], it]));
    const keys = [];
    const seen = new Set();
    for (const k of ordKeys) {
      if (byKey.has(k) && !seen.has(k) && present(byKey.get(k), s)) { keys.push(k); seen.add(k); }
    }
    for (const it of items) if (!seen.has(it[0]) && present(it, s)) keys.push(it[0]);
    result.push([s, keys]);
    done.add(s);
  };
  if (order) for (const [s, ks] of order) if (secs.has(s) && !done.has(s)) emit(s, ks);
  for (const s of secs.keys()) if (!done.has(s)) emit(s, []);
  return result;
}

/** Текст INI части opts.part (1 или 2) по словарю «секция/ключ» → значение (правила 1–2, 10–14). */
export function encodeIni(dict, saveData, opts = {}) {
  dict ??= {}; // словаря ещё нет (до старта) — все значения по умолчанию вида
  const part = opts.part ?? 1;
  const kinds = kindMap(saveData);
  const fmts = formats(saveData);
  const decimals = saveData.constants.iniDecimals;
  let out = '';
  for (const [s, keys] of plan(layoutOf(saveData, part), dict, opts.order)) {
    out += `[${s}]\r\n`;
    for (const k of keys) {
    const key = `${s}/${k}`;
    const v = dict[key];
    const f = fmts.get(key);
    let text;
    if (f?.format === 'zList' && Array.isArray(v)) text = encodeList(v, f.prefix, saveData, opts.deflate);
    else if (f?.format === 'numText') text = formatIniNumText(Number(v ?? 0), saveData.constants);
    else if (part >= 2 && typeof v === 'string') text = v;
    else text = valueText(v, kinds.get(key), decimals);
    out += `${k}="${text}"\r\n`;
    }
  }
  return out;
}

/** Разбор текста в словарь «секция/ключ» → значение (правила 7, 13). */
export function decodeIni(text, saveData, opts = {}) {
  const part = opts.part ?? 1;
  const kinds = kindMap(saveData);
  const fmts = formats(saveData);
  const wanted = new Set(layoutOf(saveData, part).map(([s, k]) => `${s}/${k}`));
  const bufs = new Map(table(saveData, 'iniSectionFormats').filter((r) => r.format === 'b64buf').map((r) => [r.section, r.bytes]));
  const d = {};
  let sec = null;
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (line === '') continue;
    if (line.startsWith('[') && line.endsWith(']')) { sec = line.slice(1, -1); continue; }
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = `${sec}/${line.slice(0, i)}`;
    if (!wanted.has(key) || key in d) continue;
    const rest = line.slice(i + 1);
    if (!rest.startsWith('"')) continue;
    const j = rest.indexOf('"', 1);
    const raw = j < 0 ? rest.slice(1) : rest.slice(1, j);
    const f = fmts.get(key);
    if (bufs.has(sec)) d[key] = normBuffer(raw, bufs.get(sec));
    else if (f?.format === 'zList' && raw.startsWith(f.prefix + saveData.constants.iniListPrefixSep) && opts.inflate) d[key] = decodeList(raw, saveData, opts.inflate);
    else d[key] = kinds.get(key) === 'string' || f?.format === 'zList' ? raw : Number(raw);
  }
  for (const r of table(saveData, 'iniLoadDefaults')) if (wanted.has(r.key) && !(r.key in d)) d[r.key] = r.value; // правила 17, 19
  return d;
}

/** Буфер секции b64buf (правило 18): символы алфавита до первого чужого, байты → ровно `size` байт → base64. */
function normBuffer(raw, size) {
  let n = 0;
  while (n < raw.length && B64.includes(raw[n])) n++;
  const bytes = new Uint8Array(size);
  bytes.set(fromBase64(raw.slice(0, n)).subarray(0, size));
  return toBase64(bytes);
}

/** Порядок текста (правило 16): [[секция, [ключи]]] — секции и ключи как в файле, первое вхождение (разбор по правилу 13). */
export function iniOrder(text) {
  const secs = new Map();
  let keys = null;
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (line === '') continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      const name = line.slice(1, -1);
      if (!secs.has(name)) secs.set(name, []);
      keys = secs.get(name);
      continue;
    }
    const i = line.indexOf('=');
    if (i < 0 || !keys) continue;
    const k = line.slice(0, i);
    if (!keys.includes(k)) keys.push(k);
  }
  return [...secs];
}
