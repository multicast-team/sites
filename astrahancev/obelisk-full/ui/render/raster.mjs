// Игровой растр, ч.1 (этап 3.11): программный растр кадра игры в буфер RGBA. Без Node (process, Buffer), без DOM:
// работает и в браузере, и в Node. Вывод на экран — present.mjs (ImageData + putImageData, решение 3.10).
//
// Модель — та же, что у эталонного растра тестов (калибровка против кадров оригинала, этапы 3.1–3.6, plan.md §3.2):
//   - вершина во float32: clip = M·(x, y, z, 1) — каждое умножение и сложение округляется; окно: ndc·(w/2) + (x0 + w/2) одним fma;
//   - вершины привязываются к сетке 1/256 пикселя (к ближнему чётному), рёбра — целочисленные функции, «верх-лево»
//     для цели с началом внизу; плоскости атрибутов — от трёх вершин во float32, значение в пикселе — fma(dady, y, fma(dadx, x, c0));
//   - треугольник, выходящий за объём видимости, режется по 6 плоскостям (без запаса), многоугольник — веером;
//   - выборка: nearest — texel ⌊s·W⌋; linear — координаты 24.8 (к ближнему чётному), вес 8 бит, lerp с округлением;
//     повтор по параметрам текстуры (по умолчанию REPEAT для степеней двойки, иначе прижим);
//   - цвет фрагмента → байт с округлением к ближнему чётному; смешивание в байтах: mul(a, b) = (ab + (ab >> 8) + 128) >> 8,
//     сумма с насыщением;
//   - линии и точки толщиной 1: поперечная координата — нижняя/левая граница полосы, вдоль — [начало, конец) по направлению.
//
// Вход — наш список команд (без имён и номеров оригинала): эффекты по ключам effects.mjs, режимы и множители — строками.
//   draw({ target, mode, first, count, effect: {key, mixColour?, alphaTest?}, params, matrix[16], pos, posSize,
//          colour (Uint8Array — байты 0..255 или Float32Array 0..1, по 4 на вершину), uv, uvSize, texture,
//          blend: null | {src: [rgb, a], dst: [rgb, a], eq: [rgb, a]}, colorMask, scissor: null | [x, y, w, h], viewport: [x, y, w, h] })
//   target / texture — номер текстуры (0 — экран). Состояние глубины, трафарета, отсечения граней и очистки — сеттерами.
import { varyingKeys, vertex as fxVertex, fragment as fxFragment, isTextured, f16 } from './effects.mjs';

const f32 = Math.fround;
let FAST = true;
/** Быстрые ветки вкл/выкл (выкл — та же модель без ускорений: для замера и контроля). */
export function setFast(on) { FAST = !!on; }
const SUB = 8, S = 1 << SUB;   // сетка вершин 1/256 пикселя

export const MODES = ['points', 'lines', 'lineLoop', 'lineStrip', 'triangles', 'triangleStrip', 'triangleFan'];

const mulNorm = (a, b) => { const ab = a * b; return (ab + (ab >> 8) + 128) >> 8; };
/** float → байт: к ближнему чётному. */
export function to8(v) {
  if (!(v > 0)) return 0;
  if (v >= 1) return 255;
  const x = f32(v * 255), r = Math.round(x);
  return (r - x === 0.5 && (r & 1)) ? r - 1 : r;
}
const un8 = (b) => f32(b / 255);
const rint = (v) => { const r = Math.round(v); return (r - v === 0.5 && (r & 1)) ? r - 1 : r; };

// ---------- быстрые ветки (этап 3.12): те же формулы, посчитанные один раз там, где они постоянны ----------
// mulNorm(a, b) таблицей; тождества смешивания проверяются при загрузке, а не предполагаются.
const MUL = new Uint8Array(65536);
for (let a = 0; a < 256; a++) for (let b = 0; b < 256; b++) MUL[(a << 8) | b] = mulNorm(a, b);
let IDENT = true;   // mulNorm(d, 255) = d и mulNorm(x, 0) = 0 для всех байтов → при α = 0 пиксель не меняется, при α = 255 — копия
for (let x = 0; x < 256; x++) if (MUL[(x << 8) | 255] !== x || MUL[x << 8] !== 0) IDENT = false;
const UN8 = new Float64Array(256);
for (let b = 0; b < 256; b++) UN8[b] = un8(b);
/** Порядок байтов: слово RGBA пишется одним Uint32 только на little-endian. */
const LE = new Uint8Array(new Uint32Array([0x04030201]).buffer)[0] === 1;
const view32 = (u8) => (LE && (u8.byteOffset & 3) === 0 ? new Uint32Array(u8.buffer, u8.byteOffset, u8.length >> 2) : null);
const TRI_MODES = { triangles: 1, triangleStrip: 2, triangleFan: 3 };
/** Повтор/прижим/зеркало индекса texel-я (то же правило, что в выборке). */
function wrapIdx(i, n, mode) {
  if (i >= 0 && i < n) return i;
  const pot = (n & (n - 1)) === 0;
  if (mode === 'clamp' || (mode === undefined && !pot)) return Math.min(n - 1, Math.max(0, i));
  if (mode === 'mirror') { const m = ((i % (2 * n)) + 2 * n) % (2 * n); return m < n ? m : 2 * n - 1 - m; }
  return pot ? i & (n - 1) : ((i % n) + n) % n;
}
/** Эффект sprite при постоянном varying v канала: байт texel-я → байт фрагмента (та же цепочка float16, что в effects.mjs). */
const SPRITE_LUT = new Map();
function spriteLut(v) {
  let t = SPRITE_LUT.get(v);
  if (!t) {
    t = new Uint8Array(256);
    const hv = f16(v, 'even');
    for (let b = 0; b < 256; b++) t[b] = to8(f16(hv * f16(un8(b), 'trunc'), 'even'));
    let id = true;
    for (let b = 0; b < 256; b++) if (t[b] !== b) id = false;
    t.ident = id;
    SPRITE_LUT.set(v, t);
  }
  return t;
}
/** Наибольший px с K − a·px > 0 при a > 0 (целые, точно); q — догадка (прежняя строка) или NaN. */
function maxPx(K, a, q) {
  if (q !== q) q = Math.floor((K - 1) / a);
  while (a * (q + 1) <= K - 1) q++;
  while (a * q > K - 1) q--;
  return q;
}
/** Наименьший px с K + b·px > 0 при b > 0; q — догадка или NaN. */
function minPx(K, b, q) {
  if (q !== q) q = Math.floor(-K / b) + 1;
  while (b * (q - 1) > -K) q--;
  while (b * q <= -K) q++;
  return q;
}
// Коды float16 (знак·2^15 | порядок·0x400 | мантисса) для градиентной ветки: значение, интервал цветов, которые float16 (к ближнему
// чётному, effects.f16) переводит в этот код (строго внутри — без ничьих), и ленивые таблицы фрагмента по коду.
const SG16 = 1 << 15;   // бит знака кода float16
export const HVAL = new Float64Array(65536), HLO = new Float64Array(65536).fill(NaN), HHI = new Float64Array(65536).fill(NaN);
for (let k = 0; k <= 0x7c00; k++) { const v = k < 0x400 ? k * 2 ** -24 : (1024 + (k & 0x3ff)) * 2 ** ((k >> 10) - 25); HVAL[k] = k === 0x7c00 ? Infinity : v; HVAL[k | SG16] = -HVAL[k]; }
for (let k = 0; k < 0x7c00; k++) {
  HLO[k] = k === 0 ? -(2 ** -25) : (HVAL[k - 1] + HVAL[k]) / 2; HHI[k] = k === 0x7bff ? 65520 : (HVAL[k] + HVAL[k + 1]) / 2;   // ≥ 65520 → ∞
  if (k) { HLO[k | SG16] = -HHI[k]; HHI[k | SG16] = -HLO[k]; }
}
HVAL[0x7e00] = NaN;   // NaN: f16 его не меняет, байт фрагмента — 0
const POW2 = new Float64Array(64);
for (let i = 0; i < 64; i++) POW2[i] = 2 ** (i - 32);
/** Код float16 от x: то же округление, что effects.f16(x, 'even') (к ближнему чётному, субнормали, ≥ 65520 → ∞). */
export function hcode(x) {
  if (x !== x) return 0x7e00;
  const sg = x < 0 ? SG16 : 0, a = x < 0 ? -x : x;
  if (a >= 65520) return sg | 0x7c00;
  let q, base;
  if (a < 2 ** -14) { q = a * 16777216; base = 0; }
  else {
    const e = a < 1 ? 7 - Math.clz32(Math.floor(a * 16777216)) : 31 - Math.clz32(Math.floor(a));
    q = a * POW2[42 - e]; base = ((e + 15) << 10) - 1024;
  }
  const r0 = Math.floor(q), fr = q - r0;
  return sg | (base + (fr > 0.5 || (fr === 0.5 && (r0 & 1)) ? r0 + 1 : r0));
}
const SPR16 = new Array(65536).fill(null);   // код h → Int16Array(256): байт texel-я → байт фрагмента sprite (−1 — ещё не считан)
const TB16 = new Float64Array(256);
for (let b = 0; b < 256; b++) TB16[b] = f16(un8(b), 'trunc');
function sprByte(code, b) {
  let t = SPR16[code];
  if (t === null) { t = SPR16[code] = new Int16Array(256).fill(-1); }
  let v = t[b];
  if (v < 0) v = t[b] = to8(f16(HVAL[code] * TB16[b], 'even'));
  return v;
}
const FILL16 = new Int16Array(65536).fill(-1);   // код h → байт заливки to8(h)
function fillByte(code) { let v = FILL16[code]; if (v < 0) v = FILL16[code] = to8(HVAL[code]); return v; }

/** Биты плоскостей объёма видимости, снаружи которых вершина (та же формула, что в clipTri). */
function clipMask(c0, c1, c2, w) {
  let m = 0;
  for (let i = 0; i < 6; i++) {
    const p = CLIP_PLANES[i];
    if (f32(f32(f32(f32(c0 * p[0]) + f32(c1 * p[1])) + f32(c2 * p[2])) + f32(w * p[3])) < 0) m |= 1 << i;
  }
  return m;
}

// fma во float32 (одно округление): произведение float32·float32 точно в double; ничья при двойном округлении решается знаком ошибки суммы.
const F32B = new Float32Array(1), U32B = new Uint32Array(F32B.buffer);
function stepF32(x, up) {
  if (x === 0) return up ? 1.401298464324817e-45 : -1.401298464324817e-45;
  F32B[0] = x; if ((x > 0) === up) U32B[0]++; else U32B[0]--; return F32B[0];
}
export function fma32(a, b, c) {
  const p = a * b, s = p + c, bb = s - p, err = (p - (s - bb)) + (c - bb);
  let r = f32(s);
  if (err !== 0 && r !== s) {
    const lo = r < s ? r : stepF32(r, false), hi = r > s ? r : stepF32(r, true);
    if (s - lo === hi - s) r = err > 0 ? hi : lo;
  }
  return r;
}

/** Плоскости атрибутов по трём вершинам (порядок вершин — как у сборки): [c0, dadx, dady] во float32 без fma. */
function planes(keys, v0, v1, v2) {
  const x0c = f32(v0.x - 0.5), y0c = f32(v0.y - 0.5);
  const dx01 = f32(v0.x - v1.x), dy01 = f32(v0.y - v1.y), dx20 = f32(v2.x - v0.x), dy20 = f32(v2.y - v0.y);
  const e = f32(dx01 * dy20), f = f32(dy01 * dx20), ooa = f32(1 / f32(e - f));
  const dx20o = f32(dx20 * ooa), dy20o = f32(dy20 * ooa), dx01o = f32(dx01 * ooa), dy01o = f32(dy01 * ooa);
  return keys.map((k) => {
    const a0 = v0[k], da01 = f32(a0 - v1[k]), da20 = f32(v2[k] - a0);
    const dadx = f32(f32(da01 * dy20o) - f32(da20 * dy01o));
    const dady = f32(f32(da20 * dx01o) - f32(da01 * dx20o));
    const c0 = f32(a0 - f32(f32(dadx * x0c) + f32(dady * y0c)));
    return [c0, dadx, dady];
  });
}
function interpOf(keys, pl) {
  return (px, py) => {
    const o = {};
    for (let i = 0; i < keys.length; i++) { const p = pl[i]; o[keys[i]] = fma32(p[2], py, fma32(p[1], px, p[0])); }
    return o;
  };
}

const CLIP_PLANES = [[-1, 0, 0, 1], [1, 0, 0, 1], [0, -1, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1], [0, 0, -1, 1]];

export class FrameRaster {
  /**
   * W×H — размер экрана (цель 0). opt.screen — свой буфер экрана (общая память параллельного растра, parallel.mjs);
   * opt.band = [f0, f1] — полоса строк: растр пишет только строки ⌊h·f0⌋ ≤ y < ⌊h·f1⌋ каждой цели высоты h (3.12 ч.2: полосы по
   * потокам; пиксель не зависит от того, с какой строки начат треугольник, поэтому полосы вместе дают тот же кадр).
   */
  constructor(W, H, opt = {}) {
    this.W = W; this.H = H;
    this.screen = opt.screen || new Uint8Array(W * H * 4);   // строки снизу вверх (начало координат окна внизу)
    this.band = opt.band || null;
    this.tex = new Map();                      // номер → {w, h, data, params: {min, mag, wrapS, wrapT}}
    this.clearColor = [0, 0, 0, 0]; this.scissorOn = false; this.scissorRect = [0, 0, W, H]; this.mask = [1, 1, 1, 1];
    this.depthOn = false; this.stencilOn = false; this.cullOn = false; this.cullWhich = 'back'; this.front = 'ccw';
    this.depthCmp = 'less'; this.depthWrite = 1; this.clearDepthV = 1; this.depthRangeV = [0, 1];
    this.stFunc = ['always', 0, 0xffffffff]; this.stOps = ['keep', 'keep', 'keep']; this.stWrite = 0xffffffff; this.clearStencilV = 0;
    this.aux = new Map();                      // цель → {depth, stencil}
    this.stats = { draws: 0, tris: 0, lines: 0, points: 0, pixels: 0, discards: 0, culled: 0, clipped: 0, unknown: {} };
  }

  /** Счётчик треугольников общего пути по причине (для замера 3.12). */
  slow(why) { const s = this.stats.slow || (this.stats.slow = {}); s[why] = (s[why] || 0) + 1; return false; }
  unknown(what) { this.stats.unknown[what] = (this.stats.unknown[what] || 0) + 1; }
  unknownCount() { return Object.values(this.stats.unknown).reduce((a, b) => a + b, 0); }

  // ---------- текстуры ----------
  /** Текстура w×h; rgba — пиксели (копируются) или null (пустая, нули). Параметры выборки прежней текстуры с тем же номером сохраняются. */
  defineTexture(id, w, h, rgba) {
    const old = this.tex.get(id);
    const data = new Uint8Array(w * h * 4);
    if (rgba) data.set(rgba.subarray ? rgba.subarray(0, w * h * 4) : rgba);
    this.tex.set(id, { w, h, data, params: old ? old.params : {} });
  }
  /** Текстура-буфер глубины/трафарета (без цвета). */
  defineDepthStencil(id, w, h) { this.tex.set(id, { w, h, data: null, depthStencil: true, params: {} }); }
  /** Текстура над готовым буфером data (без копии; общая память параллельного растра). Параметры выборки — как у defineTexture. */
  adoptTexture(id, w, h, data) {
    const old = this.tex.get(id);
    this.tex.set(id, { w, h, data, params: old ? old.params : {} });
  }
  hasTexture(id) { return this.tex.has(id); }
  /** Полоса строк [y0, y1) цели высоты h (без полосы — вся высота). */
  rows(h) { const b = this.band; return b ? [Math.floor(h * b[0]), Math.floor(h * b[1])] : [0, h]; }
  /** Сменить полосу (между кадрами). */
  setBand(b) { this.band = b ? [b[0], b[1]] : null; }
  uploadRect(id, x0, y0, w, h, rgba) {
    const t = this.tex.get(id);
    if (!t) { this.unknown('загрузка в неописанную текстуру'); return; }
    const [r0, r1] = this.rows(t.h);
    for (let y = 0; y < h; y++) if (y0 + y >= r0 && y0 + y < r1) t.data.set(rgba.subarray((y * w) * 4, (y * w + w) * 4), ((y0 + y) * t.w + x0) * 4);
  }
  /** name: min | mag ('nearest' | 'linear' | 'nearestMip' | 'linearMip'), wrapS | wrapT ('repeat' | 'clamp' | 'mirror'). */
  setTexParam(id, name, value) {
    const t = this.tex.get(id);
    if (!t) { this.unknown('параметр неописанной текстуры'); return; }
    t.params[name] = value;
  }
  deleteTexture(id) { this.tex.delete(id); }

  // ---------- состояние ----------
  setClearColor(c) { this.clearColor = c.slice(0, 4); }
  setClearDepth(d) { this.clearDepthV = d; }
  setClearStencil(s) { this.clearStencilV = s & 0xff; }
  setScissorTest(on) { this.scissorOn = !!on; }
  setScissor(r) { this.scissorRect = r.slice(0, 4); }
  setColorMask(m) { this.mask = m.slice(0, 4); }
  setDepthTest(on) { this.depthOn = !!on; }
  setDepthFunc(fn) { this.depthCmp = fn; }
  setDepthMask(m) { this.depthWrite = m; }
  setDepthRange(r) { this.depthRangeV = r.slice(0, 2); }
  setStencilTest(on) { this.stencilOn = !!on; }
  setStencilFunc(fn, ref, mask) { this.stFunc = [fn, ref, mask >>> 0]; }
  setStencilOp(fail, zfail, zpass) { this.stOps = [fail, zfail, zpass]; }
  setStencilMask(m) { this.stWrite = m >>> 0; }
  setCull(on) { this.cullOn = !!on; }
  setCullFace(which) { this.cullWhich = which; }
  setFrontFace(dir) { this.front = dir; }

  target(id) {
    if (id === 0) return { w: this.W, h: this.H, data: this.screen, key: 0 };
    const t = this.tex.get(id);
    if (!t) throw new Error(`цель ${id}: текстуры нет`);
    t.key = id;
    return t;
  }
  auxOf(t) {
    let a = this.aux.get(t.key);
    if (!a || a.n !== t.w * t.h) { a = { n: t.w * t.h, depth: new Float32Array(t.w * t.h).fill(1), stencil: new Uint8Array(t.w * t.h) }; this.aux.set(t.key, a); }
    return a;
  }

  /** Очистка цели: what = {color, depth, stencil}; окно отсечения и маска цвета — из состояния. */
  clear(targetId, what) {
    const t = this.target(targetId);
    let [x0, y0, x1, y1] = [0, 0, t.w, t.h];
    if (this.band) { const [r0, r1] = this.rows(t.h); y0 = r0; y1 = r1; }
    if (this.scissorOn) {
      const s = this.scissorRect;
      x0 = Math.max(x0, s[0]); y0 = Math.max(y0, s[1]); x1 = Math.min(x1, s[0] + s[2]); y1 = Math.min(y1, s[1] + s[3]);
    }
    if (what.depth || what.stencil) {
      const ax = this.auxOf(t), dv = Math.min(1, Math.max(0, this.clearDepthV)), sv = this.clearStencilV & this.stWrite & 0xff;
      if (FAST && (!what.stencil || (this.stWrite & 0xff) === 0xff)) {   // 3.12: строками fill
        for (let y = y0; y < y1; y++) {
          if (x1 <= x0) break;
          if (what.depth && this.depthWrite) ax.depth.fill(dv, y * t.w + x0, y * t.w + x1);
          if (what.stencil) ax.stencil.fill(sv, y * t.w + x0, y * t.w + x1);
        }
      } else for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = y * t.w + x;
        if (what.depth && this.depthWrite) ax.depth[i] = dv;
        if (what.stencil) ax.stencil[i] = (ax.stencil[i] & ~this.stWrite) | sv;
      }
    }
    if (!what.color) return;
    const col = this.clearColor.map((x) => to8(f32(x)));
    const D32 = FAST && this.mask.every((m) => m) ? view32(t.data) : null;
    if (D32) {   // 3.12: все каналы — строка одним fill словом RGBA
      const word = (col[0] | (col[1] << 8) | (col[2] << 16) | (col[3] << 24)) >>> 0;
      for (let y = y0; y < y1; y++) if (x1 > x0) D32.fill(word, y * t.w + x0, y * t.w + x1);
      return;
    }
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const o = (y * t.w + x) * 4;
      for (let k = 0; k < 4; k++) if (this.mask[k]) t.data[o + k] = col[k];
    }
  }

  draw(d) {
    const key = d.effect.key;
    const tgt = this.target(d.target);
    if (!d.pos) { this.unknown('нет позиций'); return; }
    if (!d.matrix || d.matrix.length < 16) { this.unknown('нет матрицы'); return; }
    const P = d.params || {};
    const M = Array.from(d.matrix.slice(0, 16), f32);
    const vp = d.viewport;
    const hw = f32(vp[2] / 2), hh = f32(vp[3] / 2), cx = f32(vp[0] + vp[2] / 2), cy = f32(vp[1] + vp[3] / 2);
    const [dn, df] = this.depthRangeV;
    const textured = isTextured(key);
    const sampler = textured ? this.tex.get(d.texture) : null;
    if (textured && !sampler) { this.unknown(`текстура ${d.texture} не описана`); return; }
    if (sampler && sampler === tgt) { this.unknown('выборка из цели рисования'); return; }
    const keys = varyingKeys(key).slice();
    if (this.depthOn) keys.push('z');
    const ctx = { tgt, sampler, key, alphaTest: !!d.effect.alphaTest, P, keys, blend: d.blend || null, vpS: [hw, hh, f32((df - dn) / 2)], vpT: [cx, cy, f32((df + dn) / 2)],
      cmask: d.colorMask || [1, 1, 1, 1], clip: this.clipRect(d, tgt), aux: (this.depthOn || this.stencilOn) ? this.auxOf(tgt) : null, fast: 0 };
    // быстрая ветка треугольников: sprite/fill без глубины и трафарета, все каналы, смешивание «нет», src·α + dst·(1 − α) или src·α + dst
    if (FAST && (key === 'sprite' || key === 'fill') && !this.depthOn && !this.stencilOn && ctx.cmask.every((m) => m)) {
      const bm = blendMode(ctx.blend);
      if (bm) ctx.fast = bm;
    }
    this.stats.draws++;
    if (ctx.fast && TRI_MODES[d.mode]) { this.drawFast(d, ctx, M); return; }
    let colour = d.colour || null;
    if (colour instanceof Uint8Array || colour instanceof Uint8ClampedArray) { const c = new Float32Array(colour.length); for (let i = 0; i < c.length; i++) c[i] = un8(colour[i]); colour = c; }
    const va = { pos: d.pos, posSize: d.posSize || 2, colour, uv: d.uv || null, uvSize: d.uvSize || 2 };
    const V = [];
    for (let k = d.first; k < d.first + d.count; k++) {
      const pv = fxVertex(key, !!d.effect.mixColour, va, k, P);
      const x = pv.x, y = pv.y, z = pv.z;
      const cl = (r) => f32(f32(f32(f32(M[r] * x) + f32(M[4 + r] * y)) + f32(M[8 + r] * z)) + M[12 + r]);
      const c0 = cl(0), c1 = cl(1), c2 = cl(2), w = cl(3), nx = f32(c0 / w), ny = f32(c1 / w), nz = f32(c2 / w);
      V.push({ x: f32(nx * hw + cx), y: f32(ny * hh + cy), ...pv.v, z: f32(f32(nz * f32((df - dn) / 2)) + f32((df + dn) / 2)), clip: [c0, c1, c2, w] });
    }
    const n = V.length;
    switch (d.mode) {
      case 'triangles': for (let i = 2; i < n; i += 3) this.clipTri(ctx, V[i - 2], V[i - 1], V[i]); break;
      case 'triangleStrip': for (let i = 2; i < n; i++) this.clipTri(ctx, V[i + (i & 1) - 2], V[i - (i & 1) - 1], V[i]); break;
      case 'triangleFan': for (let i = 2; i < n; i++) this.clipTri(ctx, V[0], V[i - 1], V[i]); break;
      case 'lines': for (let k = 0; k + 1 < n; k += 2) this.line(ctx, V[k], V[k + 1]); break;
      case 'lineStrip': for (let k = 0; k + 1 < n; k++) this.line(ctx, V[k], V[k + 1]); break;
      case 'lineLoop': for (let k = 0; k + 1 < n; k++) this.line(ctx, V[k], V[k + 1]); if (n > 1) this.line(ctx, V[n - 1], V[0]); break;
      case 'points': for (const v of V) this.point(ctx, v); break;
      default: this.unknown(`режим ${d.mode}`);
    }
  }

  /** Буферы вершин быстрой ветки (растут по мере надобности, между вызовами не освобождаются). */
  vbuf(n) {
    let B = this.vb;
    if (!B || B.cap < n) {
      const cap = Math.max(1024, 1 << Math.ceil(Math.log2(n)));
      const F = () => new Float64Array(cap);
      B = this.vb = { cap, X: F(), Y: F(), QX: F(), QY: F(), C0: F(), C1: F(), C2: F(), C3: F(), VR: F(), VG: F(), VB: F(), VA: F(), VS: F(), VT: F(), MK: new Uint8Array(cap), SK: new Uint8Array(cap) };
      B.AT = [B.VR, B.VG, B.VB, B.VA, B.VS, B.VT];
    }
    return B;
  }

  /**
   * Быстрая ветка рисования (3.12): вершины — те же формулы, что в общем пути (эффекты sprite/fill не трогают позицию), но в
   * типизированные массивы без объектов; треугольник целиком внутри объёма видимости идёт в fastTri, задевающий границу — в clipTri.
   */
  drawFast(d, ctx, M) {
    const n = d.count, first = d.first, B = this.vbuf(n);
    const { X, Y, QX, QY, C0, C1, C2, C3, VR, VG, VB, VA, VS, VT, MK } = B;
    const pos = d.pos, ps = d.posSize || 2, col = d.colour || null, uv = d.uv || null, us = d.uvSize || 2;
    const col8 = col instanceof Uint8Array || col instanceof Uint8ClampedArray;
    const hw = ctx.vpS[0], hh = ctx.vpS[1], cx = ctx.vpT[0], cy = ctx.vpT[1];
    const m0 = M[0], m1 = M[1], m2 = M[2], m3 = M[3], m4 = M[4], m5 = M[5], m6 = M[6], m7 = M[7];
    const m8 = M[8], m9 = M[9], m10 = M[10], m11 = M[11], m12 = M[12], m13 = M[13], m14 = M[14], m15 = M[15];
    const md = TRI_MODES[d.mode];
    // полоса (параллельный растр): независимые треугольники, все три вершины которых перед камерой (w > 0, конечны) и чьи строки
    // лежат вне полосы с запасом 2 строки, пропускаются до полного счёта вершин — в полосе они не дали бы ни пикселя (отсечение по
    // объёму видимости при w > 0 не выводит многоугольник за рамку проекции вершин дальше округления).
    let SK = null;
    if (this.band && md === 1) {
      const [r0, r1] = this.rows(ctx.tgt.h);
      SK = B.SK;
      for (let i = 0; i + 2 < n; i += 3) {
        let lo = Infinity, hi = -Infinity, ok = true;
        for (let v = 0; v < 3; v++) {
          const pk = (first + i + v) * ps, x = pos[pk], y = pos[pk + 1], z = ps > 2 ? pos[pk + 2] : 0;
          const c1 = f32(f32(f32(f32(m1 * x) + f32(m5 * y)) + f32(m9 * z)) + m13);
          const w = f32(f32(f32(f32(m3 * x) + f32(m7 * y)) + f32(m11 * z)) + m15);
          const vy = f32(f32(c1 / w) * hh + cy);
          if (!(w > 0) || vy - vy !== 0) { ok = false; break; }
          if (vy < lo) lo = vy; if (vy > hi) hi = vy;
        }
        SK[i] = ok && (Math.ceil(hi) < r0 - 2 || Math.floor(lo) > r1 + 1) ? 1 : 0;
      }
      if (n % 3) SK[n - n % 3] = 0;   // неполная тройка в конце — не треугольник, но вершины считаются как прежде
    }
    for (let j = 0; j < n; j++) {
      if (SK !== null && SK[j - j % 3] === 1) continue;
      const k = first + j, pk = k * ps;
      const x = pos[pk], y = pos[pk + 1], z = ps > 2 ? pos[pk + 2] : 0;
      const c0 = f32(f32(f32(f32(m0 * x) + f32(m4 * y)) + f32(m8 * z)) + m12);
      const c1 = f32(f32(f32(f32(m1 * x) + f32(m5 * y)) + f32(m9 * z)) + m13);
      const c2 = f32(f32(f32(f32(m2 * x) + f32(m6 * y)) + f32(m10 * z)) + m14);
      const w = f32(f32(f32(f32(m3 * x) + f32(m7 * y)) + f32(m11 * z)) + m15);
      const vx = f32(f32(c0 / w) * hw + cx), vy = f32(f32(c1 / w) * hh + cy);
      X[j] = vx; Y[j] = vy; C0[j] = c0; C1[j] = c1; C2[j] = c2; C3[j] = w;
      QX[j] = rint(f32(vx - 0.5) * S); QY[j] = rint(f32(vy - 0.5) * S);
      if (col) {
        const ck = k * 4;
        if (col8) { VR[j] = UN8[col[ck]]; VG[j] = UN8[col[ck + 1]]; VB[j] = UN8[col[ck + 2]]; VA[j] = UN8[col[ck + 3]]; }
        else { VR[j] = col[ck]; VG[j] = col[ck + 1]; VB[j] = col[ck + 2]; VA[j] = col[ck + 3]; }
      } else { VR[j] = 1; VG[j] = 1; VB[j] = 1; VA[j] = 1; }
      if (uv) { VS[j] = uv[k * us]; VT[j] = uv[k * us + 1]; } else { VS[j] = 0; VT[j] = 0; }
      // плоскости объёма видимости: при конечных c — f32(±c + w) < 0 ⇔ (±c + w) < 0 (разность float32 точна до знака; нули знака не меняют)
      MK[j] = (c0 - c0 === 0 && c1 - c1 === 0 && c2 - c2 === 0 && w - w === 0)
        ? (w - c0 < 0 ? 1 : 0) | (c0 + w < 0 ? 2 : 0) | (w - c1 < 0 ? 4 : 0) | (c1 + w < 0 ? 8 : 0) | (c2 + w < 0 ? 16 : 0) | (w - c2 < 0 ? 32 : 0)
        : clipMask(c0, c1, c2, w);
    }
    if (md === 1) for (let i = 2; i < n; i += 3) { if (SK === null || SK[i - 2] === 0) this.fastTri(ctx, B, i - 2, i - 1, i); }
    else if (md === 2) for (let i = 2; i < n; i++) this.fastTri(ctx, B, i + (i & 1) - 2, i - (i & 1) - 1, i);
    else for (let i = 2; i < n; i++) this.fastTri(ctx, B, 0, i - 1, i);
  }

  /** Вершина j буфера быстрой ветки → объект общего пути (для отсечения и общего растра). */
  vobj(ctx, B, j) {
    const nz = f32(B.C2[j] / B.C3[j]);
    return { x: B.X[j], y: B.Y[j], r: B.VR[j], g: B.VG[j], b: B.VB[j], a: B.VA[j], s: B.VS[j], t: B.VT[j], f: 0,
      z: f32(f32(nz * ctx.vpS[2]) + ctx.vpT[2]), clip: [B.C0[j], B.C1[j], B.C2[j], B.C3[j]] };
  }

  /** Треугольник быстрой ветки по номерам вершин: то же, что clipTri + tri, без объектов. */
  fastTri(ctx, B, a, b, c) {
    const MK = B.MK, ma = MK[a], mb = MK[b], mc = MK[c];
    if (ma | mb | mc) {
      if (ma & mb & mc) return;
      this.clipTri(ctx, this.vobj(ctx, B, a), this.vobj(ctx, B, b), this.vobj(ctx, B, c));
      return;
    }
    const QX = B.QX, QY = B.QY;
    const X0 = QX[a], Y0 = QY[a], X1 = QX[b], Y1 = QY[b], X2 = QX[c], Y2 = QY[c];
    const area = (X1 - X0) * (Y2 - Y0) - (X2 - X0) * (Y1 - Y0);
    if (area === 0) return;
    if (this.cullOn) {
      const isFront = (area > 0) === (this.front === 'ccw');
      if (this.cullWhich === 'both' || (this.cullWhich === 'back' && !isFront) || (this.cullWhich === 'front' && isFront)) { this.stats.culled++; return; }
    }
    const turn = (X0 - X1) * (Y2 - Y0) - (X2 - X0) * (Y0 - Y1);
    let p0 = a, p1 = b;
    if (turn < 0) { p0 = b; p1 = a; }
    const p2 = c;
    this.stats.tris++;
    const cl = ctx.clip;
    const bx0 = Math.max(cl[0], Math.ceil(Math.min(X0, X1, X2) / S)), bx1 = Math.min(cl[2] - 1, Math.floor(Math.max(X0, X1, X2) / S));
    const by0 = Math.max(cl[1], Math.ceil(Math.min(Y0, Y1, Y2) / S)), by1 = Math.min(cl[3] - 1, Math.floor(Math.max(Y0, Y1, Y2) / S));
    if (bx0 > bx1 || by0 > by1) return;
    // плоскости — как planes(): порядок вершин сборки, float32 без fma
    const X = B.X, Y = B.Y;
    const x0 = X[p0], y0 = Y[p0], x1 = X[p1], y1 = Y[p1], x2 = X[p2], y2 = Y[p2];
    const x0c = f32(x0 - 0.5), y0c = f32(y0 - 0.5);
    const dx01 = f32(x0 - x1), dy01 = f32(y0 - y1), dx20 = f32(x2 - x0), dy20 = f32(y2 - y0);
    const e = f32(dx01 * dy20), f = f32(dy01 * dx20), ooa = f32(1 / f32(e - f));
    const dx20o = f32(dx20 * ooa), dy20o = f32(dy20 * ooa), dx01o = f32(dx01 * ooa), dy01o = f32(dy01 * ooa);
    const PLB = this.PLB || (this.PLB = new Float64Array(18)), AT = B.AT, nk = ctx.key === 'sprite' ? 6 : 4;
    // у одинакового у трёх вершин атрибута при конечных множителях dadx = dady = ±0 и c0 = a0 ровно (0·конечное = ±0)
    const fin = dx20o - dx20o === 0 && dy20o - dy20o === 0 && dx01o - dx01o === 0 && dy01o - dy01o === 0 && x0c - x0c === 0 && y0c - y0c === 0;
    for (let i = 0; i < nk; i++) {
      if (fin) { const A = AT[i], a0 = A[p0]; if (a0 === A[p1] && a0 === A[p2] && a0 - a0 === 0) { PLB[i * 3] = a0; PLB[i * 3 + 1] = 0; PLB[i * 3 + 2] = 0; continue; } }
      const A = AT[i], a0 = A[p0], da01 = f32(a0 - A[p1]), da20 = f32(A[p2] - a0);
      const dadx = f32(f32(da01 * dy20o) - f32(da20 * dy01o));
      const dady = f32(f32(da20 * dx01o) - f32(da01 * dx20o));
      PLB[i * 3] = f32(a0 - f32(f32(dadx * x0c) + f32(dady * y0c))); PLB[i * 3 + 1] = dadx; PLB[i * 3 + 2] = dady;
    }
    const XS = this.XS || (this.XS = new Float64Array(3)), YS = this.YS || (this.YS = new Float64Array(3));
    XS[0] = QX[p0]; XS[1] = QX[p1]; XS[2] = QX[p2]; YS[0] = QY[p0]; YS[1] = QY[p1]; YS[2] = QY[p2];
    if (this.triSpan(ctx, PLB, XS, YS, bx0, bx1, by0, by1)) return;
    this.triGeneral(ctx, [this.vobj(ctx, B, p0), this.vobj(ctx, B, p1), this.vobj(ctx, B, p2)], bx0, bx1, by0, by1);
  }

  clipRect(d, t) {
    const vp = d.viewport;
    let x0 = Math.max(0, vp[0]), y0 = Math.max(0, vp[1]), x1 = Math.min(t.w, vp[0] + vp[2]), y1 = Math.min(t.h, vp[1] + vp[3]);
    const sc = d.scissor;
    if (sc) { x0 = Math.max(x0, sc[0]); y0 = Math.max(y0, sc[1]); x1 = Math.min(x1, sc[0] + sc[2]); y1 = Math.min(y1, sc[1] + sc[3]); }
    if (this.band) { const [r0, r1] = this.rows(t.h); y0 = Math.max(y0, r0); y1 = Math.min(y1, r1); }
    return [x0, y0, x1, y1];
  }

  /** Отсечение по объёму видимости: плоскости по порядку, новая вершина — линейно в clip-координатах и атрибутах. */
  clipTri(ctx, A, B, C) {
    const dot = (v, p) => f32(f32(f32(f32(v.clip[0] * p[0]) + f32(v.clip[1] * p[1])) + f32(v.clip[2] * p[2])) + f32(v.clip[3] * p[3]));
    const mask = (v) => { let m = 0; for (let i = 0; i < 6; i++) if (dot(v, CLIP_PLANES[i]) < 0) m |= 1 << i; return m; };
    const m0 = mask(A), m1 = mask(B), m2 = mask(C);
    if (!(m0 | m1 | m2)) return this.tri(ctx, A, B, C);
    if (m0 & m1 & m2) return;
    this.stats.clipped++;
    const keys = ctx.keys.filter((k) => k !== 'z');
    const lin = (t, o, i) => f32(o + f32(t * f32(i - o)));
    const between = (t, out, inn) => {
      const clip = [0, 1, 2, 3].map((k) => lin(t, out.clip[k], inn.clip[k]));
      const oow = f32(1 / clip[3]);
      const v = { clip, x: f32(f32(f32(clip[0] * oow) * ctx.vpS[0]) + ctx.vpT[0]), y: f32(f32(f32(clip[1] * oow) * ctx.vpS[1]) + ctx.vpT[1]),
        z: f32(f32(f32(clip[2] * oow) * ctx.vpS[2]) + ctx.vpT[2]) };
      for (const k of keys) v[k] = lin(t, out[k], inn[k]);
      return v;
    };
    let list = [A, B, C], cm = m0 | m1 | m2;
    while (cm && list.length >= 3) {
      const pi = 31 - Math.clz32(cm & -cm), P = CLIP_PLANES[pi];
      cm &= ~(1 << pi);
      const out = [];
      let prev = list[0], dpPrev = dot(prev, P);
      const L = list.concat([list[0]]);
      for (let i = 1; i < L.length; i++) {
        const v = L[i], dp = dot(v, P);
        let cross;
        if (dpPrev >= 0) { out.push(prev); cross = dp < 0; } else cross = !(dp < 0);
        if (cross) {
          const den = f32(dp - dpPrev);
          if (dp < 0) out.push(-dp < dpPrev ? between(f32(dp / den), v, prev) : between(f32(-dpPrev / den), prev, v));
          else out.push(-dpPrev < dp ? between(f32(-dpPrev / den), prev, v) : between(f32(dp / den), v, prev));
        }
        prev = v; dpPrev = dp;
      }
      list = out;
    }
    for (let i = 2; i < list.length; i++) this.tri(ctx, list[i - 1], list[i], list[0]);
  }

  /** Треугольник: привязка к сетке, отсечение граней, плоскости в порядке сборки, рёбра в целых. */
  tri(ctx, A, B, C) {
    const q = (v) => rint(f32(v - 0.5) * S);
    const X0 = q(A.x), Y0 = q(A.y), X1 = q(B.x), Y1 = q(B.y), X2 = q(C.x), Y2 = q(C.y);
    const area = (X1 - X0) * (Y2 - Y0) - (X2 - X0) * (Y1 - Y0);
    if (area === 0) return;
    if (this.cullOn) {   // лицевая — против часовой в окне с y вверх при front = 'ccw'
      const isFront = (area > 0) === (this.front === 'ccw');
      if (this.cullWhich === 'both' || (this.cullWhich === 'back' && !isFront) || (this.cullWhich === 'front' && isFront)) { this.stats.culled++; return; }
    }
    const turn = (X0 - X1) * (Y2 - Y0) - (X2 - X0) * (Y0 - Y1);
    const PL = turn < 0 ? [B, A, C] : [A, B, C];
    this.stats.tris++;
    const [cx0, cy0, cx1, cy1] = ctx.clip;
    const bx0 = Math.max(cx0, Math.ceil(Math.min(X0, X1, X2) / S)), bx1 = Math.min(cx1 - 1, Math.floor(Math.max(X0, X1, X2) / S));
    const by0 = Math.max(cy0, Math.ceil(Math.min(Y0, Y1, Y2) / S)), by1 = Math.min(cy1 - 1, Math.floor(Math.max(Y0, Y1, Y2) / S));
    if (bx0 > bx1 || by0 > by1) return;
    if (ctx.fast) {
      const pl = planes(ctx.keys, PL[0], PL[1], PL[2]);
      const PLB = this.PLB || (this.PLB = new Float64Array(18));
      for (let i = 0; i < pl.length; i++) { PLB[i * 3] = pl[i][0]; PLB[i * 3 + 1] = pl[i][1]; PLB[i * 3 + 2] = pl[i][2]; }
      const XS = this.XS || (this.XS = new Float64Array(3)), YS = this.YS || (this.YS = new Float64Array(3));
      for (let i = 0; i < 3; i++) { XS[i] = q(PL[i].x); YS[i] = q(PL[i].y); }
      if (this.triSpan(ctx, PLB, XS, YS, bx0, bx1, by0, by1)) return;
    } else this.slow(`ветка: ${ctx.key} ${this.depthOn ? 'глубина ' : ''}${this.stencilOn ? 'трафарет ' : ''}${ctx.blend ? 'смешивание' : ''}`);
    this.triGeneral(ctx, PL, bx0, bx1, by0, by1);
  }

  /** Общий растр треугольника: каждый пиксель — фрагмент эффекта (PL — вершины в порядке сборки). */
  triGeneral(ctx, PL, bx0, bx1, by0, by1) {
    const q = (v) => rint(f32(v - 0.5) * S);
    const keys = ctx.keys;
    const pl = planes(keys, PL[0], PL[1], PL[2]);
    const interp = interpOf(keys, pl);
    const slope = (key) => { const i = keys.indexOf(key); return i < 0 ? [0, 0] : [pl[i][1], pl[i][2]]; };
    const xs = PL.map((v) => q(v.x)), ys = PL.map((v) => q(v.y));
    // ребро i → j: dcdx = y_i − y_j, dcdy = x_i − x_j; внутри при dcdx·(x_i − X) − dcdy·(y_i − Y) + bias > 0; bias — «верх-лево»
    const ed = [0, 1, 2].map((i) => {
      const j = (i + 1) % 3, dcdx = ys[i] - ys[j], dcdy = xs[i] - xs[j];
      return { x: xs[i], y: ys[i], dcdx, dcdy, bias: dcdx < 0 || (dcdx === 0 && dcdy > 0) ? 1 : 0 };
    });
    const deriv = { interp, slope };
    for (let py = by0; py <= by1; py++) {
      const PY = py * S;
      for (let px = bx0; px <= bx1; px++) {
        const PX = px * S;
        let inside = true;
        for (const e of ed) if (e.dcdx * (e.x - PX) - e.dcdy * (e.y - PY) + e.bias <= 0) { inside = false; break; }
        if (inside) this.frag(ctx, px, py, interp(px, py), deriv);
      }
    }
  }

  /**
   * Быстрая ветка треугольника (3.12). Берётся, когда плоскости цвета постоянны (dadx = dady = 0 ровно: значение в любом пикселе = c0).
   * Тогда каждая величина считается той же формулой, но один раз на треугольник / столбец / строку, а не в каждом пикселе:
   * цвет — таблицей «байт texel-я → байт фрагмента», индекс texel-я — по столбцам (s) и строкам (t) с повтором значений,
   * пиксели строки — промежуток, где все три ребра «внутри» (целые, точно). Смешивание — таблицей mulNorm.
   * pl — плоскости [c0, dadx, dady] подряд в порядке ключей (r g b a [s t]); xs, ys — вершины на сетке в порядке сборки.
   * → false, если условия не выполнены (тогда — общий путь).
   */
  triSpan(ctx, pl, xs, ys, bx0, bx1, by0, by1) {
    if (pl[1] !== 0 || pl[2] !== 0 || pl[4] !== 0 || pl[5] !== 0 || pl[7] !== 0 || pl[8] !== 0 || pl[10] !== 0 || pl[11] !== 0) {
      return this.triGrad(ctx, pl, xs, ys, bx0, bx1, by0, by1) || this.slow('цвет не постоянен');
    }
    const textured = ctx.key === 'sprite';
    const c0 = fma32(pl[2], by0, fma32(pl[1], bx0, pl[0])), c1 = fma32(pl[5], by0, fma32(pl[4], bx0, pl[3]));
    const c2 = fma32(pl[8], by0, fma32(pl[7], bx0, pl[6])), c3 = fma32(pl[11], by0, fma32(pl[10], bx0, pl[9]));
    const nx = bx1 - bx0 + 1;
    let T = null, lin = false, L0 = null, L1 = null, L2 = null, L3 = null, U = null, V = null, ident = false, cst = false;
    let f0 = 0, f1 = 0, f2 = 0, f3 = 0;
    if (textured) {
      for (let i = 12; i < 18; i++) if (!Number.isFinite(pl[i])) return this.slow('uv не конечны');
      T = ctx.sampler;
      const pm = T.params;   // фильтр уменьшения/увеличения различаются — тогда нужен ρ (как в общем пути)
      const flt = pm.min === pm.mag ? pm.min : (Math.max(Math.hypot(pl[13] * T.w, pl[16] * T.h), Math.hypot(pl[14] * T.w, pl[17] * T.h)) > 1 ? pm.min : pm.mag);
      lin = flt === 'linear' || flt === 'linearMip';
      const lc = this.lutCache || (this.lutCache = [NaN, null, NaN, null, NaN, null, NaN, null]);
      if (lc[0] !== c0) { lc[0] = c0; lc[1] = spriteLut(c0); }
      if (lc[2] !== c1) { lc[2] = c1; lc[3] = spriteLut(c1); }
      if (lc[4] !== c2) { lc[4] = c2; lc[5] = spriteLut(c2); }
      if (lc[6] !== c3) { lc[6] = c3; lc[7] = spriteLut(c3); }
      L0 = lc[1]; L1 = lc[3]; L2 = lc[5]; L3 = lc[7];
      ident = L0.ident && L1.ident && L2.ident && L3.ident;
      if (!lin && T.w === 1 && T.h === 1) {   // один texel: любой индекс после повтора/прижима/зеркала — 0
        cst = true; const d = T.data; f0 = L0[d[0]]; f1 = L1[d[1]]; f2 = L2[d[2]]; f3 = L3[d[3]];
      } else {
        U = axisSet(this.axU || (this.axU = {}), pl[12], pl[13], pl[14], T.w, 1, T.params.wrapS, lin, bx0, nx);
        V = axisSet(this.axV || (this.axV = {}), pl[15], pl[16], pl[17], T.h, T.w, T.params.wrapT, lin, bx0, nx);
      }
    } else {
      cst = true; f0 = to8(f16(c0, 'even')); f1 = to8(f16(c1, 'even')); f2 = to8(f16(c2, 'even')); f3 = to8(f16(c3, 'even'));
    }
    // рёбра (как в общем пути): внутри при dcdx·(x_i − PX) − dcdy·(y_i − PY) + bias > 0 → K_i + dcdy_i·S·py − dcdx_i·S·px > 0
    const x0 = xs[0], x1 = xs[1], x2 = xs[2], y0 = ys[0], y1 = ys[1], y2 = ys[2];
    const a0 = y0 - y1, b0 = x0 - x1, a1 = y1 - y2, b1 = x1 - x2, a2 = y2 - y0, b2 = x2 - x0;
    const k0 = a0 * x0 - b0 * y0 + (a0 < 0 || (a0 === 0 && b0 > 0) ? 1 : 0);
    const k1 = a1 * x1 - b1 * y1 + (a1 < 0 || (a1 === 0 && b1 > 0) ? 1 : 0);
    const k2 = a2 * x2 - b2 * y2 + (a2 < 0 || (a2 === 0 && b2 > 0) ? 1 : 0);
    const A0 = a0 * S, A1 = a1 * S, A2 = a2 * S, B0 = b0 * S, B1 = b1 * S, B2 = b2 * S;
    const tgt = ctx.tgt, D = tgt.data, TW = tgt.w, mode = ctx.fast;
    const D32 = tgt.data === this.screen ? (this.screen32 === undefined ? (this.screen32 = view32(this.screen)) : this.screen32)
      : (tgt.d32 === undefined ? (tgt.d32 = view32(tgt.data)) : tgt.d32);
    // постоянный источник: что делать со строкой
    let word = 0, skip = false, lut = null, t0 = 0, t1 = 0, t2 = 0, t3 = 0, ia = 0;
    if (cst) {
      if (mode === 1 || (mode === 2 && IDENT && f3 === 255)) { word = (f0 | (f1 << 8) | (f2 << 16) | (f3 << 24)) >>> 0; }
      else if (IDENT && f3 === 0) skip = true;
      else {
        ia = mode === 2 ? 255 - f3 : 255;
        t0 = MUL[(f0 << 8) | f3]; t1 = MUL[(f1 << 8) | f3]; t2 = MUL[(f2 << 8) | f3]; t3 = MUL[(f3 << 8) | f3];
        if (nx * (by1 - by0 + 1) > 4096) {
          lut = this.LUT4 || (this.LUT4 = new Uint8Array(1024));
          for (let d = 0; d < 256; d++) {
            const m = MUL[(d << 8) | ia];
            let v = t0 + m; lut[d] = v > 255 ? 255 : v; v = t1 + m; lut[256 + d] = v > 255 ? 255 : v;
            v = t2 + m; lut[512 + d] = v > 255 ? 255 : v; v = t3 + m; lut[768 + d] = v > 255 ? 255 : v;
          }
        }
      }
    }
    const src = T ? T.data : null;
    const S32 = T && !cst ? (T.d32 === undefined ? (T.d32 = view32(T.data)) : T.d32) : null;
    const wordCopy = ident && S32 && D32;
    let npx = 0;
    // граница ребра по строкам: от прежней строки шагами (точно, без деления), если ребро не пологое; иначе делением
    const st0 = Math.abs(B0) <= 4 * Math.abs(A0), st1 = Math.abs(B1) <= 4 * Math.abs(A1), st2 = Math.abs(B2) <= 4 * Math.abs(A2);
    let q0 = NaN, q1 = NaN, q2 = NaN;
    for (let py = by0; py <= by1; py++) {
      let lo = bx0, hi = bx1;
      const K0 = k0 + B0 * py, K1 = k1 + B1 * py, K2 = k2 + B2 * py;
      if (A0 === 0) { if (K0 <= 0) continue; } else if (A0 > 0) { q0 = maxPx(K0, A0, st0 ? q0 : NaN); if (q0 < hi) hi = q0; } else { q0 = minPx(K0, -A0, st0 ? q0 : NaN); if (q0 > lo) lo = q0; }
      if (A1 === 0) { if (K1 <= 0) continue; } else if (A1 > 0) { q1 = maxPx(K1, A1, st1 ? q1 : NaN); if (q1 < hi) hi = q1; } else { q1 = minPx(K1, -A1, st1 ? q1 : NaN); if (q1 > lo) lo = q1; }
      if (A2 === 0) { if (K2 <= 0) continue; } else if (A2 > 0) { q2 = maxPx(K2, A2, st2 ? q2 : NaN); if (q2 < hi) hi = q2; } else { q2 = minPx(K2, -A2, st2 ? q2 : NaN); if (q2 > lo) lo = q2; }
      if (lo > hi) continue;
      npx += hi - lo + 1;
      const rowPx = py * TW;
      if (cst) {
        if (skip) continue;
        if (mode === 1 || (mode === 2 && IDENT && f3 === 255)) {
          if (D32) D32.fill(word, rowPx + lo, rowPx + hi + 1);
          else for (let o = (rowPx + lo) * 4, e = (rowPx + hi + 1) * 4; o < e; o += 4) { D[o] = f0; D[o + 1] = f1; D[o + 2] = f2; D[o + 3] = f3; }
        } else if (lut) {
          for (let o = (rowPx + lo) * 4, e = (rowPx + hi + 1) * 4; o < e; o += 4) {
            D[o] = lut[D[o]]; D[o + 1] = lut[256 + D[o + 1]]; D[o + 2] = lut[512 + D[o + 2]]; D[o + 3] = lut[768 + D[o + 3]];
          }
        } else {
          for (let o = (rowPx + lo) * 4, e = (rowPx + hi + 1) * 4; o < e; o += 4) {
            let v = t0 + MUL[(D[o] << 8) | ia]; D[o] = v > 255 ? 255 : v;
            v = t1 + MUL[(D[o + 1] << 8) | ia]; D[o + 1] = v > 255 ? 255 : v;
            v = t2 + MUL[(D[o + 2] << 8) | ia]; D[o + 2] = v > 255 ? 255 : v;
            v = t3 + MUL[(D[o + 3] << 8) | ia]; D[o + 3] = v > 255 ? 255 : v;
          }
        }
        continue;
      }
      if (!U.fixed) axisFill(U, py, lo - bx0, hi - bx0);
      if (!lin && S32 && D32 && IDENT) {   // nearest словами RGBA: строка texel-ей — одним числом, если t по строке постоянна
        let vi0 = null, vr = 0;
        if (V.colConst) vr = axisRowIdx(V, py); else { if (!V.fixed) axisFill(V, py, lo - bx0, hi - bx0); vi0 = V.i0; }
        if (ident && mode === 1 && U.seq && vi0 === null) { const t0i = vr + U.i0[lo - bx0]; D32.set(S32.subarray(t0i, t0i + hi - lo + 1), rowPx + lo); }
        else if (ident) rowWord(D, D32, S32, rowPx, lo, hi, lo - bx0, U.i0, vi0, vr, mode);
        else rowLut(D, D32, S32, rowPx, lo, hi, lo - bx0, U.i0, vi0, vr, mode, L0, L1, L2, L3);
        continue;
      }
      if (!V.fixed) axisFill(V, py, lo - bx0, hi - bx0);
      const ui0 = U.i0, vi0 = V.i0;
      if (!lin && wordCopy && IDENT) {   // белый цвет: фрагмент = texel; слово RGBA целиком
        for (let px = lo, kx = lo - bx0; px <= hi; px++, kx++) {
          const w = S32[vi0[kx] + ui0[kx]], s3 = w >>> 24;
          if (mode === 1 || (mode === 2 && s3 === 255)) { D32[rowPx + px] = w; continue; }
          if (s3 === 0) continue;
          const o = (rowPx + px) << 2, ib = mode === 2 ? 255 - s3 : 255;
          let v = MUL[((w & 255) << 8) | s3] + MUL[(D[o] << 8) | ib]; D[o] = v > 255 ? 255 : v;
          v = MUL[(w & 0xff00) | s3] + MUL[(D[o + 1] << 8) | ib]; D[o + 1] = v > 255 ? 255 : v;
          v = MUL[((w >>> 8) & 0xff00) | s3] + MUL[(D[o + 2] << 8) | ib]; D[o + 2] = v > 255 ? 255 : v;
          v = MUL[(s3 << 8) | s3] + MUL[(D[o + 3] << 8) | ib]; D[o + 3] = v > 255 ? 255 : v;
        }
      } else if (!lin) {
        for (let px = lo, kx = lo - bx0; px <= hi; px++, kx++) {
          const ti = vi0[kx] + ui0[kx], so = ti << 2;
          const s3 = L3[src[so + 3]];
          if (mode !== 1 && IDENT && s3 === 0) continue;
          const di = rowPx + px;
          if (mode === 1 || (mode === 2 && IDENT && s3 === 255)) {
            if (wordCopy) D32[di] = S32[ti];
            else { const o = di << 2; D[o] = L0[src[so]]; D[o + 1] = L1[src[so + 1]]; D[o + 2] = L2[src[so + 2]]; D[o + 3] = s3; }
            continue;
          }
          const o = di << 2, s0 = L0[src[so]], s1 = L1[src[so + 1]], s2 = L2[src[so + 2]], ib = mode === 2 ? 255 - s3 : 255;
          let v = MUL[(s0 << 8) | s3] + MUL[(D[o] << 8) | ib]; D[o] = v > 255 ? 255 : v;
          v = MUL[(s1 << 8) | s3] + MUL[(D[o + 1] << 8) | ib]; D[o + 1] = v > 255 ? 255 : v;
          v = MUL[(s2 << 8) | s3] + MUL[(D[o + 2] << 8) | ib]; D[o + 2] = v > 255 ? 255 : v;
          v = MUL[(s3 << 8) | s3] + MUL[(D[o + 3] << 8) | ib]; D[o + 3] = v > 255 ? 255 : v;
        }
      } else {
        const ui1 = U.i1, uw = U.w, vi1 = V.i1, vw = V.w;
        for (let px = lo, kx = lo - bx0; px <= hi; px++, kx++) {
          const wu = uw[kx], wv = vw[kx], o00 = (vi0[kx] + ui0[kx]) * 4, o10 = (vi0[kx] + ui1[kx]) * 4, o01 = (vi1[kx] + ui0[kx]) * 4, o11 = (vi1[kx] + ui1[kx]) * 4;
          const s0 = L0[lerp8(lerp8(src[o00], src[o10], wu), lerp8(src[o01], src[o11], wu), wv)];
          const s1 = L1[lerp8(lerp8(src[o00 + 1], src[o10 + 1], wu), lerp8(src[o01 + 1], src[o11 + 1], wu), wv)];
          const s2 = L2[lerp8(lerp8(src[o00 + 2], src[o10 + 2], wu), lerp8(src[o01 + 2], src[o11 + 2], wu), wv)];
          const s3 = L3[lerp8(lerp8(src[o00 + 3], src[o10 + 3], wu), lerp8(src[o01 + 3], src[o11 + 3], wu), wv)];
          const o = (rowPx + px) * 4;
          if (mode === 1 || (mode === 2 && IDENT && s3 === 255)) { D[o] = s0; D[o + 1] = s1; D[o + 2] = s2; D[o + 3] = s3; continue; }
          if (IDENT && s3 === 0) continue;
          const ib = mode === 2 ? 255 - s3 : 255;
          let v = MUL[(s0 << 8) | s3] + MUL[(D[o] << 8) | ib]; D[o] = v > 255 ? 255 : v;
          v = MUL[(s1 << 8) | s3] + MUL[(D[o + 1] << 8) | ib]; D[o + 1] = v > 255 ? 255 : v;
          v = MUL[(s2 << 8) | s3] + MUL[(D[o + 2] << 8) | ib]; D[o + 2] = v > 255 ? 255 : v;
          v = MUL[(s3 << 8) | s3] + MUL[(D[o + 3] << 8) | ib]; D[o + 3] = v > 255 ? 255 : v;
        }
      }
    }
    this.stats.pixels += npx;
    const fs = this.stats.fast || (this.stats.fast = { tris: 0, px: 0 });
    fs.tris++; fs.px += npx;
    return true;
  }

  /**
   * Быстрая ветка с непостоянным цветом (градиент; 3.12). Цвет канала в пикселе — fma32(dady, y, fma32(dadx, x, c0)), как в общем пути;
   * внутренняя часть — один раз на столбец. Фрагмент зависит от цвета только через h = float16(цвет): пока цвет строго внутри
   * интервала округления к прежнему h, берётся прежняя таблица (spriteLut(h) / байт заливки), иначе h считается заново.
   * Только nearest и слова RGBA (little-endian); иначе → false (общий путь).
   */
  triGrad(ctx, pl, xs, ys, bx0, bx1, by0, by1) {
    const textured = ctx.key === 'sprite', T = ctx.sampler, tgt = ctx.tgt, D = tgt.data, TW = tgt.w, mode = ctx.fast;
    if (!IDENT || !LE) return false;
    const D32 = tgt.data === this.screen ? (this.screen32 === undefined ? (this.screen32 = view32(this.screen)) : this.screen32)
      : (tgt.d32 === undefined ? (tgt.d32 = view32(tgt.data)) : tgt.d32);
    if (!D32) return false;
    const nx = bx1 - bx0 + 1;
    let U = null, V = null, S32 = null;
    if (textured) {
      for (let i = 12; i < 18; i++) if (!Number.isFinite(pl[i])) return false;
      const pm = T.params;
      const flt = pm.min === pm.mag ? pm.min : (Math.max(Math.hypot(pl[13] * T.w, pl[16] * T.h), Math.hypot(pl[14] * T.w, pl[17] * T.h)) > 1 ? pm.min : pm.mag);
      if (flt === 'linear' || flt === 'linearMip') return false;
      S32 = T.d32 === undefined ? (T.d32 = view32(T.data)) : T.d32;
      if (!S32) return false;
      U = axisSet(this.axU || (this.axU = {}), pl[12], pl[13], pl[14], T.w, 1, T.params.wrapS, false, bx0, nx);
      V = axisSet(this.axV || (this.axV = {}), pl[15], pl[16], pl[17], T.h, T.w, T.params.wrapT, false, bx0, nx);
    }
    const G = this.grad || (this.grad = { inner: [null, null, null, null], cap: 0 });
    if (G.cap < nx) { G.cap = Math.max(64, 1 << Math.ceil(Math.log2(nx))); for (let k = 0; k < 4; k++) G.inner[k] = new Float64Array(G.cap); }
    for (let k = 0; k < 4; k++) { const In = G.inner[k], p0 = pl[k * 3], p1 = pl[k * 3 + 1]; for (let j = 0; j < nx; j++) In[j] = fma32(p1, bx0 + j, p0); }
    const I0 = G.inner[0], I1 = G.inner[1], I2 = G.inner[2], I3 = G.inner[3], P0 = pl[2], P1 = pl[5], P2 = pl[8], P3 = pl[11];
    // состояние канала: код h и интервал цветов (lo, hi), которые дают тот же h
    let h0 = 0, h1 = 0, h2 = 0, h3 = 0, lo0 = NaN, hi0 = NaN, lo1 = NaN, hi1 = NaN, lo2 = NaN, hi2 = NaN, lo3 = NaN, hi3 = NaN;
    const x0 = xs[0], x1 = xs[1], x2 = xs[2], y0 = ys[0], y1 = ys[1], y2 = ys[2];
    const a0 = y0 - y1, b0 = x0 - x1, a1 = y1 - y2, b1 = x1 - x2, a2 = y2 - y0, b2 = x2 - x0;
    const k0 = a0 * x0 - b0 * y0 + (a0 < 0 || (a0 === 0 && b0 > 0) ? 1 : 0);
    const k1 = a1 * x1 - b1 * y1 + (a1 < 0 || (a1 === 0 && b1 > 0) ? 1 : 0);
    const k2 = a2 * x2 - b2 * y2 + (a2 < 0 || (a2 === 0 && b2 > 0) ? 1 : 0);
    const A0 = a0 * S, A1 = a1 * S, A2 = a2 * S, B0 = b0 * S, B1 = b1 * S, B2 = b2 * S;
    let npx = 0;
    for (let py = by0; py <= by1; py++) {
      let lo = bx0, hi = bx1;
      const K0 = k0 + B0 * py, K1 = k1 + B1 * py, K2 = k2 + B2 * py;
      if (A0 === 0) { if (K0 <= 0) continue; } else if (A0 > 0) { const m = maxPx(K0, A0, NaN); if (m < hi) hi = m; } else { const m = minPx(K0, -A0, NaN); if (m > lo) lo = m; }
      if (A1 === 0) { if (K1 <= 0) continue; } else if (A1 > 0) { const m = maxPx(K1, A1, NaN); if (m < hi) hi = m; } else { const m = minPx(K1, -A1, NaN); if (m > lo) lo = m; }
      if (A2 === 0) { if (K2 <= 0) continue; } else if (A2 > 0) { const m = maxPx(K2, A2, NaN); if (m < hi) hi = m; } else { const m = minPx(K2, -A2, NaN); if (m > lo) lo = m; }
      if (lo > hi) continue;
      npx += hi - lo + 1;
      const rowPx = py * TW;
      let vi0 = null, vr = 0, ui0 = null;
      if (textured) {
        if (!U.fixed) axisFill(U, py, lo - bx0, hi - bx0);
        ui0 = U.i0;
        if (V.colConst) vr = axisRowIdx(V, py); else { if (!V.fixed) axisFill(V, py, lo - bx0, hi - bx0); vi0 = V.i0; }
      }
      for (let px = lo, kx = lo - bx0; px <= hi; px++, kx++) {
        const c0 = fma32(P0, py, I0[kx]), c1 = fma32(P1, py, I1[kx]), c2 = fma32(P2, py, I2[kx]), c3 = fma32(P3, py, I3[kx]);
        if (!(c0 > lo0 && c0 < hi0)) { h0 = hcode(c0); lo0 = HLO[h0]; hi0 = HHI[h0]; }
        if (!(c1 > lo1 && c1 < hi1)) { h1 = hcode(c1); lo1 = HLO[h1]; hi1 = HHI[h1]; }
        if (!(c2 > lo2 && c2 < hi2)) { h2 = hcode(c2); lo2 = HLO[h2]; hi2 = HHI[h2]; }
        if (!(c3 > lo3 && c3 < hi3)) { h3 = hcode(c3); lo3 = HLO[h3]; hi3 = HHI[h3]; }
        let s0, s1, s2, s3;
        if (textured) {
          const w = S32[(vi0 === null ? vr : vi0[kx]) + ui0[kx]];
          s3 = sprByte(h3, w >>> 24);
          if (mode !== 1 && s3 === 0) continue;
          s0 = sprByte(h0, w & 255); s1 = sprByte(h1, (w >>> 8) & 255); s2 = sprByte(h2, (w >>> 16) & 255);
        } else {
          s3 = fillByte(h3);
          if (mode !== 1 && s3 === 0) continue;
          s0 = fillByte(h0); s1 = fillByte(h1); s2 = fillByte(h2);
        }
        if (mode === 1 || (mode === 2 && s3 === 255)) { D32[rowPx + px] = (s0 | (s1 << 8) | (s2 << 16) | (s3 << 24)) >>> 0; continue; }
        const o = (rowPx + px) << 2, ib = mode === 2 ? 255 - s3 : 255;
        let v = MUL[(s0 << 8) | s3] + MUL[(D[o] << 8) | ib]; D[o] = v > 255 ? 255 : v;
        v = MUL[(s1 << 8) | s3] + MUL[(D[o + 1] << 8) | ib]; D[o + 1] = v > 255 ? 255 : v;
        v = MUL[(s2 << 8) | s3] + MUL[(D[o + 2] << 8) | ib]; D[o + 2] = v > 255 ? 255 : v;
        v = MUL[(s3 << 8) | s3] + MUL[(D[o + 3] << 8) | ib]; D[o + 3] = v > 255 ? 255 : v;
      }
    }
    this.stats.pixels += npx;
    const fs = this.stats.fast || (this.stats.fast = { tris: 0, px: 0 });
    fs.tris++; fs.px += npx; fs.grad = (fs.grad || 0) + 1;
    return true;
  }

  /** Линия толщиной 1: концы на сетке 1/256; поперечно — пиксель, чей центр в полосе ширины 1 (нижняя/левая граница входит). */
  line(ctx, A, B) {
    this.stats.lines++;
    const H2 = S / 2;
    const q = (v) => Math.round(f32(v - 0.5) * S);
    const ax = q(A.x), ay = q(A.y), bx = q(B.x), by = q(B.y);
    const dx = bx - ax, dy = by - ay;
    if (dx === 0 && dy === 0) return;
    const [cx0, cy0, cx1, cy1] = ctx.clip;
    const lerp = (t) => { const o = {}; for (const k of ctx.keys) o[k] = f32(A[k] + (B[k] - A[k]) * t); return o; };
    const fdx = B.x - A.x, fdy = B.y - A.y, len2 = fdx * fdx + fdy * fdy || 1;
    const deriv = { interp: (px, py) => lerp(((px + 0.5 - A.x) * fdx + (py + 0.5 - A.y) * fdy) / len2),
      slope: (k) => [f32((B[k] - A[k]) * fdx / len2), f32((B[k] - A[k]) * fdy / len2)] };
    const minor = (c) => Math.ceil((c - H2) / S);
    const range = (a0, b0) => (a0 <= b0 ? [Math.ceil(a0 / S), Math.ceil(b0 / S) - 1] : [Math.floor(b0 / S) + 1, Math.floor(a0 / S)]);
    // 3.12: заливка с одинаковым цветом концов — цвет по линии постоянен (f32(a + 0·t) = a), фрагмент считается один раз
    let put = null;
    if (ctx.fast && ctx.key === 'fill' && A.r === B.r && A.g === B.g && A.b === B.b && A.a === B.a) {
      const f = [to8(f16(A.r, 'even')), to8(f16(A.g, 'even')), to8(f16(A.b, 'even')), to8(f16(A.a, 'even'))];
      const D = ctx.tgt.data, TW = ctx.tgt.w, mode = ctx.fast, s3 = f[3], ib = mode === 2 ? 255 - s3 : 255;
      put = (px, py) => {
        const o = (py * TW + px) * 4;
        this.stats.pixels++;
        if (mode === 1) { D[o] = f[0]; D[o + 1] = f[1]; D[o + 2] = f[2]; D[o + 3] = s3; return; }
        for (let k = 0; k < 4; k++) { const v = MUL[(f[k] << 8) | s3] + MUL[(D[o + k] << 8) | ib]; D[o + k] = v > 255 ? 255 : v; }
      };
    }
    if (Math.abs(dx) >= Math.abs(dy)) {
      const [i0, i1] = range(ax, bx);
      for (let px = Math.max(cx0, i0); px <= Math.min(cx1 - 1, i1); px++) {
        const t = (px * S - ax) / dx, py = minor(ay + dy * t);
        if (py < cy0 || py >= cy1) continue;
        if (put) put(px, py); else this.frag(ctx, px, py, lerp(t), deriv);
      }
    } else {
      const [j0, j1] = range(ay, by);
      for (let py = Math.max(cy0, j0); py <= Math.min(cy1 - 1, j1); py++) {
        const t = (py * S - ay) / dy, px = minor(ax + dx * t);
        if (px < cx0 || px >= cx1) continue;
        if (put) put(px, py); else this.frag(ctx, px, py, lerp(t), deriv);
      }
    }
  }

  point(ctx, V) {
    this.stats.points++;
    const H2 = S / 2, q = (v) => Math.round(f32(v - 0.5) * S);
    const minor = (c) => Math.ceil((c - H2) / S);
    const [cx0, cy0, cx1, cy1] = ctx.clip;
    const px = minor(q(V.x)), py = minor(q(V.y));
    if (px < cx0 || px >= cx1 || py < cy0 || py >= cy1) return;
    const o = {}; for (const k of ctx.keys) o[k] = V[k];
    this.frag(ctx, px, py, o, { interp: () => o, slope: () => [0, 0] });
  }

  /** Выборка юнита 0 → [r, g, b, a] float. */
  sample(T, s, t, lin) {
    const W = T.w, H = T.h, P = T.params, d = T.data;
    const wrap = (i, n, mode) => {
      if (i >= 0 && i < n) return i;
      const pot = (n & (n - 1)) === 0;
      if (mode === 'clamp' || (mode === undefined && !pot)) return Math.min(n - 1, Math.max(0, i));
      if (mode === 'mirror') { const m = ((i % (2 * n)) + 2 * n) % (2 * n); return m < n ? m : 2 * n - 1 - m; }
      return pot ? i & (n - 1) : ((i % n) + n) % n;
    };
    const ws = P.wrapS, wt = P.wrapT;
    const at = (i, j) => (wrap(j, H, wt) * W + wrap(i, W, ws)) * 4;
    if (!lin) {
      const o = at(Math.floor(f32(s * W)), Math.floor(f32(t * H)));
      return [un8(d[o]), un8(d[o + 1]), un8(d[o + 2]), un8(d[o + 3])];
    }
    const U = rint(f32(f32(s * W) * 256)) - 128, V2 = rint(f32(f32(t * H) * 256)) - 128;
    const i0 = U >> 8, j0 = V2 >> 8, wu = U & 255, wv = V2 & 255;
    const o00 = at(i0, j0), o10 = at(i0 + 1, j0), o01 = at(i0, j0 + 1), o11 = at(i0 + 1, j0 + 1);
    const lerp = (a, b, w) => a + (((b - a) * w + 128) >> 8);
    const out = new Array(4);
    for (let k = 0; k < 4; k++) out[k] = un8(lerp(lerp(d[o00 + k], d[o10 + k], wu), lerp(d[o01 + k], d[o11 + k], wu), wv));
    return out;
  }

  frag(ctx, px, py, val, deriv) {
    const t = ctx.tgt, i = py * t.w + px;
    if (this.stencilOn && ctx.aux) {
      const [fn, ref, msk] = this.stFunc, s = ctx.aux.stencil[i];
      if (!compare(fn, ref & msk & 0xff, s & msk & 0xff)) { this.stencilOp(ctx.aux, i, this.stOps[0], ref); return; }
    }
    if (this.depthOn && ctx.aux) {
      const z = Math.min(1, Math.max(0, val.z));
      if (!compare(this.depthCmp, z, ctx.aux.depth[i])) { if (this.stencilOn) this.stencilOp(ctx.aux, i, this.stOps[1], this.stFunc[1]); return; }
      if (this.depthWrite) ctx.aux.depth[i] = z;
    }
    if (this.stencilOn && ctx.aux) this.stencilOp(ctx.aux, i, this.stOps[2], this.stFunc[1]);
    const T = ctx.sampler;
    let lin = false;
    if (T) {   // увеличение и 1:1 — фильтр mag, уменьшение — min (mip-уровней нет)
      const [dsx, dsy] = deriv.slope('s'), [dtx, dty] = deriv.slope('t');
      const rho = Math.max(Math.hypot(dsx * T.w, dtx * T.h), Math.hypot(dsy * T.w, dty * T.h));
      const flt = rho > 1 ? T.params.min : T.params.mag;
      lin = flt === 'linear' || flt === 'linearMip';
    }
    const env = {
      P: ctx.P,
      sample: (s, tt) => this.sample(T, s, tt, lin),
      d: (k) => deriv.slope(k),
      fine: (fn) => {   // своя строка и свой столбец квада 2×2
        const qx = px & ~1, qy = py & ~1;
        return [fn(deriv.interp(qx + 1, py)) - fn(deriv.interp(qx, py)), fn(deriv.interp(px, qy + 1)) - fn(deriv.interp(px, qy))];
      },
    };
    const col = fxFragment(ctx.key, ctx.alphaTest, val, env);
    if (!col) { this.stats.discards++; return; }
    const o = i * 4, D = t.data;
    const s8 = [to8(col[0]), to8(col[1]), to8(col[2]), to8(col[3])];
    const out = ctx.blend ? blend(ctx.blend, s8, [D[o], D[o + 1], D[o + 2], D[o + 3]]) : s8;
    const m = ctx.cmask;
    for (let k = 0; k < 4; k++) if (m[k]) D[o + k] = out[k];
    this.stats.pixels++;
  }

  stencilOp(ax, i, op, ref) {
    const s = ax.stencil[i], wm = this.stWrite & 0xff;
    let v = s;
    switch (op) {
      case 'keep': return;
      case 'zero': v = 0; break;
      case 'replace': v = ref & 0xff; break;
      case 'incr': v = Math.min(255, s + 1); break;
      case 'decr': v = Math.max(0, s - 1); break;
      case 'invert': v = ~s & 0xff; break;
      case 'incrWrap': v = (s + 1) & 0xff; break;
      case 'decrWrap': v = (s - 1) & 0xff; break;
      default: this.unknown(`операция трафарета ${op}`); return;
    }
    ax.stencil[i] = (s & ~wm) | (v & wm);
  }

  /** Кадр экрана сверху вниз (верхняя строка первой) — для вывода и сравнения. */
  /** Кадр готов сразу (тот же вид, что у ParallelRaster и LayerCache: вызовы → await finish() → readFrame()). */
  finish() { return Promise.resolve(); }
  readFrame(out = new Uint8Array(this.W * this.H * 4)) {
    const { W, H } = this;
    const [r0, r1] = this.rows(H);   // с полосой — только её строки (остальные пишут другие потоки)
    for (let y = H - r1; y < H - r0; y++) out.set(this.screen.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    return out;
  }
}

function compare(fn, a, b) {   // a — входящее, b — в буфере
  switch (fn) {
    case 'never': return false;
    case 'less': return a < b;
    case 'equal': return a === b;
    case 'lequal': return a <= b;
    case 'greater': return a > b;
    case 'notequal': return a !== b;
    case 'gequal': return a >= b;
    default: return true;
  }
}

function factor(f, k, s, d) {
  switch (f) {
    case 'zero': return 0;
    case 'one': return 255;
    case 'srcColor': return s[k];
    case 'oneMinusSrcColor': return 255 - s[k];
    case 'srcAlpha': return s[3];
    case 'oneMinusSrcAlpha': return 255 - s[3];
    case 'dstAlpha': return d[3];
    case 'oneMinusDstAlpha': return 255 - d[3];
    case 'dstColor': return d[k];
    case 'oneMinusDstColor': return 255 - d[k];
    case 'srcAlphaSaturate': return k === 3 ? 255 : Math.min(s[3], 255 - d[3]);
    default: throw new Error(`множитель смешивания ${f}`);
  }
}

/** Смешивание в байтах: bl = {src: [rgb, a], dst: [rgb, a], eq: [rgb, a]}, eq — add | sub | revsub. */
function blend(bl, s8, d8) {
  const out = new Array(4);
  for (let k = 0; k < 4; k++) {
    const j = k < 3 ? 0 : 1;
    const x = mulNorm(s8[k], factor(bl.src[j], k, s8, d8)), y = mulNorm(d8[k], factor(bl.dst[j], k, s8, d8)), eq = bl.eq[j];
    const v = eq === 'sub' ? x - y : eq === 'revsub' ? y - x : x + y;
    out[k] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return out;
}

/**
 * Смешивание одного пикселя словом (раунд исправлений 3.12): то же, что MUL-таблица по каналам — mulNorm(x, y) = (xy + (xy >> 8) + 128) >> 8,
 * сумма с насыщением, — но арифметикой и одним чтением/записью слова RGBA (little-endian). s0..s3 — байты фрагмента, ib — множитель dst.
 */
function blendPx(D32, i, s0, s1, s2, s3, ib) {
  const d = D32[i];
  let x = s0 * s3, y = (d & 255) * ib, v = ((x + (x >> 8) + 128) >> 8) + ((y + (y >> 8) + 128) >> 8);
  let w = v > 255 ? 255 : v;
  x = s1 * s3; y = ((d >>> 8) & 255) * ib; v = ((x + (x >> 8) + 128) >> 8) + ((y + (y >> 8) + 128) >> 8);
  w |= (v > 255 ? 255 : v) << 8;
  x = s2 * s3; y = ((d >>> 16) & 255) * ib; v = ((x + (x >> 8) + 128) >> 8) + ((y + (y >> 8) + 128) >> 8);
  w |= (v > 255 ? 255 : v) << 16;
  x = s3 * s3; y = (d >>> 24) * ib; v = ((x + (x >> 8) + 128) >> 8) + ((y + (y >> 8) + 128) >> 8);
  D32[i] = (w | ((v > 255 ? 255 : v) << 24)) >>> 0;
}
/** Строка nearest при белом цвете (фрагмент = texel): mode 1 — копия, 2 — src·α + dst·(1 − α), 3 — src·α + dst. Нужен IDENT. */
function rowWord(D, D32, S32, rowPx, lo, hi, kx, ui0, vi0, vr, mode) {
  if (vi0 === null) {
    for (let px = lo; px <= hi; px++, kx++) {
      const w = S32[vr + ui0[kx]], s3 = w >>> 24;
      if (mode === 1 || (mode === 2 && s3 === 255)) { D32[rowPx + px] = w; continue; }
      if (s3 === 0) continue;
      blendPx(D32, rowPx + px, w & 255, (w >>> 8) & 255, (w >>> 16) & 255, s3, mode === 2 ? 255 - s3 : 255);
    }
    return;
  }
  for (let px = lo; px <= hi; px++, kx++) {
    const w = S32[vi0[kx] + ui0[kx]], s3 = w >>> 24;
    if (mode === 1 || (mode === 2 && s3 === 255)) { D32[rowPx + px] = w; continue; }
    if (s3 === 0) continue;
    blendPx(D32, rowPx + px, w & 255, (w >>> 8) & 255, (w >>> 16) & 255, s3, mode === 2 ? 255 - s3 : 255);
  }
}
/** То же при постоянном цвете ≠ белого: байты texel-я через таблицы L (spriteLut). Нужен IDENT. */
function rowLut(D, D32, S32, rowPx, lo, hi, kx, ui0, vi0, vr, mode, L0, L1, L2, L3) {
  for (let px = lo; px <= hi; px++, kx++) {
    const w = S32[(vi0 === null ? vr : vi0[kx]) + ui0[kx]], s3 = L3[w >>> 24];
    if (mode !== 1 && s3 === 0) continue;
    const s0 = L0[w & 255], s1 = L1[(w >>> 8) & 255], s2 = L2[(w >>> 16) & 255];
    if (mode === 1 || (mode === 2 && s3 === 255)) { D32[rowPx + px] = (s0 | (s1 << 8) | (s2 << 16) | (s3 << 24)) >>> 0; continue; }
    blendPx(D32, rowPx + px, s0, s1, s2, s3, mode === 2 ? 255 - s3 : 255);
  }
}

const lerp8 = (a, b, w) => a + (((b - a) * w + 128) >> 8);

/**
 * Быстрые режимы смешивания: 1 — без смешивания (копия), 2 — src·α + dst·(1 − α), 3 — src·α + dst (оба — по всем каналам, сложение);
 * иначе 0 (общий путь).
 */
function blendMode(bl) {
  if (!bl) return 1;
  if (bl.src[0] !== 'srcAlpha' || bl.src[1] !== 'srcAlpha' || bl.eq[0] !== 'add' || bl.eq[1] !== 'add') return 0;
  if (bl.dst[0] === 'oneMinusSrcAlpha' && bl.dst[1] === 'oneMinusSrcAlpha') return 2;
  if (bl.dst[0] === 'one' && bl.dst[1] === 'one') return 3;
  return 0;
}

/**
 * Ось выборки (s или t) быстрой ветки: значение в пикселе — fma32(p2, py, fma32(p1, px, p0)), как в общем пути.
 * Внутренняя часть fma32(p1, px, p0) считается один раз на столбец; при p2 = 0 индекс от строки не зависит (один раз на треугольник),
 * иначе — на строку, но повторно только там, где внутренняя часть сменилась (у спрайта без поворота она по строке постоянна).
 * Индекс — как в выборке: nearest ⌊v·n⌋, linear — 24.8 к ближнему чётному, −½, вес 8 бит; с повтором/прижимом; умножен на stride.
 * A — переиспользуемые буферы (растут по ширине).
 */
function axisSet(A, p0, p1, p2, n, stride, mode, lin, bx0, nx) {
  if (!A.inner || A.inner.length < nx) {
    const cap = Math.max(64, 1 << Math.ceil(Math.log2(nx)));
    A.inner = new Float64Array(cap); A.i0 = new Int32Array(cap); A.i1 = new Int32Array(cap); A.w = new Int32Array(cap);
  }
  A.p2 = p2; A.n = n; A.stride = stride; A.mode = mode; A.lin = lin;
  const inner = A.inner;
  for (let k = 0; k < nx; k++) inner[k] = fma32(p1, bx0 + k, p0);
  A.fixed = p2 === 0;
  A.colConst = p1 === 0 && !lin;   // fma32(±0, px, p0) = p0 в каждом столбце: индекс строки — одно число (axisRowIdx)
  if (A.fixed) axisFill(A, 0, 0, nx - 1);   // fma32(±0, py, x) = x при py ≥ 0 (с точностью до знака нуля: индекс тот же)
  A.seq = false;   // индексы столбцов подряд (+1): строка texel-ей копируется целиком
  if (A.fixed && !lin && stride === 1) { const i0 = A.i0; let ok = true; for (let k = 1; k < nx; k++) if (i0[k] !== i0[k - 1] + 1) { ok = false; break; } A.seq = ok; }
  return A;
}
/** Индекс оси при colConst (nearest): то же, что axisFill, одним числом на строку. */
function axisRowIdx(A, py) {
  const x = A.inner[0], v = A.p2 === 0 ? x : fma32(A.p2, py, x);
  return wrapIdx(Math.floor(f32(v * A.n)), A.n, A.mode) * A.stride;
}
function axisFill(A, py, k0, k1) {
  const { inner, i0, i1, w, n, stride, mode, lin, p2 } = A;
  let last = NaN, a0 = 0, a1 = 0, aw = 0;
  for (let k = k0; k <= k1; k++) {
    const x = inner[k];
    if (x !== last) {
      last = x;
      const v = p2 === 0 ? x : fma32(p2, py, x);
      if (!lin) a0 = wrapIdx(Math.floor(f32(v * n)), n, mode) * stride;
      else { const u = rint(f32(f32(v * n) * 256)) - 128, j = u >> 8; a0 = wrapIdx(j, n, mode) * stride; a1 = wrapIdx(j + 1, n, mode) * stride; aw = u & 255; }
    }
    i0[k] = a0; if (lin) { i1[k] = a1; w[k] = aw; }
  }
}
