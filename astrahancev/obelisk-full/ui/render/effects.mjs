// Игровой растр, ч.1 (этап 3.11): эффекты — что делает каждый вид рисования с вершиной и фрагментом.
//
// Эффект задаётся НАШИМ ключом (не исходником программы): вызывающий выбирает его сам, параметры передаёт по нашим именам.
// Модель — та же, что у эталонного растра тестов (модель llvmpipe, калибровка этапов 3.1–3.6): цвет и выборка во float16
// (точность lowp/mediump), смещения и константы эффектов — как в калибровке. Здесь только поведение, записанное своим кодом.
//
//   fill            — цвет вершины
//   sprite          — текстура × цвет вершины
//   gold            — текстура × цвет → яркость → цвет палитры из 6 (params.palette — 6 × [r, g, b] байтами)
//   blurDown/blurUp — шаг размытия «вниз» (центр ½ + 4 диагонали по ⅛) и «вверх» (4 диагонали по ⅙ + 4 оси ×2 по 1/12), params.texel
//   glyph           — текст: позиция · масштаб + сдвиг (params.place = [x, y, альфа, масштаб]), цвет из 24-битного params.colour24;
//                     mixColour — смешать с цветом вершины по её альфе
//   glyphSdf        — то же с текстурой расстояния: альфа = smoothstep по ширине |d/dx| + |d/dy|
//   glyphSdfShadow  — тень такого текста: цвет и мягкость params.shadow = [r, g, b, мягкость], альфа — params.place[2]
//   sdf, sdfFx, sdfBlur — текст с полем расстояния: обычный, со свечением/контуром, размытый (float32; в кадрах эталона не встречались)
//
// Вершина: (позиция до матрицы, varying-и r g b a s t f). Фрагмент: varying-и в центре пикселя → [r, g, b, a] или null (discard).

const f32 = Math.fround;

export const EFFECTS = ['fill', 'sprite', 'gold', 'blurDown', 'blurUp', 'glyph', 'glyphSdf', 'glyphSdfShadow', 'sdf', 'sdfFx', 'sdfBlur'];
const GLYPH = new Set(['glyph', 'glyphSdf', 'glyphSdfShadow']);

/** Нужна ли эффекту текстура (юнит 0). */
export const isTextured = (key) => key !== 'fill';

/** Какие varying-и интерполирует растр для эффекта. */
export function varyingKeys(key) {
  switch (key) {
    case 'fill': return ['r', 'g', 'b', 'a'];
    case 'blurDown': case 'blurUp': return ['s', 't'];
    case 'glyphSdfShadow': return ['f', 's', 't'];
    default: return ['r', 'g', 'b', 'a', 's', 't'];
  }
}

// ---------- float16 (точность lowp/mediump): округление к ближнему чётному или усечение, с субнормалями ----------
const F16_BUF = new DataView(new ArrayBuffer(8));
const F16_STEP = new Float64Array(2048);
for (let e = 0; e < 2048; e++) F16_STEP[e] = e - 1023 < -14 ? 2 ** -24 : 2 ** (e - 1023 - 10);
export function f16(x, mode = 'even') {
  if (x === 0 || !Number.isFinite(x)) return x;
  const a = Math.abs(x);
  if (a >= 65520) return x > 0 ? Infinity : -Infinity;
  F16_BUF.setFloat64(0, a);
  const step = F16_STEP[(F16_BUF.getUint32(0) >>> 20) & 2047];
  const q = a / step, r0 = Math.floor(q), fr = q - r0;
  const r = mode === 'trunc' ? r0 : fr > 0.5 || (fr === 0.5 && (r0 & 1)) ? r0 + 1 : r0;
  return Math.sign(x) * r * step;
}
const h = (x) => f16(x, 'even');
const htex = (c) => c.map((x) => f16(x, 'trunc'));   // результат выборки текстуры → half усечением
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const fma = (a, b, c) => f32(a * b + c);
const R255 = f32(1 / 255);

/** smoothstep во float32: t = clamp((x − e0)/(e1 − e0)), t·t·(3 − 2t). */
function smoothstep(e0, e1, x) {
  const t = f32(clamp01(f32(f32(x - e0) / f32(e1 - e0))));
  return f32(f32(t * t) * f32(3 - f32(2 * t)));
}
/** smoothstep во float16: t·(t·(3 − 2t)). */
function smoothstep16(e0, e1, x) {
  const t = clamp01(h(f32(h(x - e0) / h(e1 - e0))));
  return h(t * h(t * h(3 - h(2 * t))));
}
const mix = (x, y, a) => f32(x + f32(a * f32(y - x)));

/**
 * Вершина k. va — {pos, posSize, colour (float 0..1, по 4), uv, uvSize}; P — параметры эффекта.
 * → {x, y, z, v: {r, g, b, a, s, t, f}}
 */
export function vertex(key, mixColour, va, k, P) {
  const { pos, posSize, colour: col, uv, uvSize } = va;
  let x = pos[k * posSize], y = pos[k * posSize + 1];
  const z = posSize > 2 ? pos[k * posSize + 2] : 0;
  const o = {
    r: col ? col[k * 4] : 1, g: col ? col[k * 4 + 1] : 1, b: col ? col[k * 4 + 2] : 1, a: col ? col[k * 4 + 3] : 1,
    s: uv ? uv[k * uvSize] : 0, t: uv ? uv[k * uvSize + 1] : 0, f: 0,
  };
  if (!GLYPH.has(key)) return { x, y, z, v: o };
  const p = P.place || [0, 0, 1, 1];
  x = fma(x, f32(p[3]), f32(p[0])); y = fma(y, f32(p[3]), f32(p[1]));
  if (key === 'glyphSdfShadow') { o.f = f32(p[2]); return { x, y, z: 0, v: o }; }
  // 24-битный цвет R + 256·G + 65536·B (целое деление к нулю)
  const ic = (P.colour24 || [0])[0] | 0;
  const B = Math.trunc(Math.trunc(ic / 256) / 256), G = Math.trunc(ic / 256) - B * 256, Rr = ic - B * 256 * 256 - G * 256;
  let r = f32(Rr * R255), g = f32(G * R255), b = f32(B * R255);
  if (mixColour && col) {
    const ca = col[k * 4 + 3];
    r = mix(r, col[k * 4], ca); g = mix(g, col[k * 4 + 1], ca); b = mix(b, col[k * 4 + 2], ca);
  }
  o.r = r; o.g = g; o.b = b; o.a = f32(p[2]);
  return { x, y, z: 0, v: o };
}

/**
 * Фрагмент. v — varying-и в центре пикселя; env:
 *   sample(s, t) → [r, g, b, a] float из текстуры юнита 0 (фильтр и повтор — параметры текстуры);
 *   d(key) → [ddx, ddy] наклон varying-а;  fine(fn) → [ddx, ddy] значения fn по своей строке/столбцу квада 2×2;  P — параметры.
 */
export function fragment(key, alphaTestOn, v, env) {
  switch (key) {
    case 'fill': return [h(v.r), h(v.g), h(v.b), h(v.a)];
    case 'sprite': {
      const c = env.sample(v.s, v.t);
      return [0, 1, 2, 3].map((k) => h(h(v['rgba'[k]]) * f16(c[k], 'trunc')));
    }
    case 'gold': return gold(v, env);
    case 'blurDown': case 'blurUp': return blur(key, v, env);
    case 'glyph': case 'glyphSdf': case 'glyphSdfShadow': return glyph(key, v, env);
    case 'sdf': case 'sdfFx': case 'sdfBlur': return sdfText(key, alphaTestOn, v, env);
    default: return null;
  }
}

function gold(v, env) {
  const c = htex(env.sample(v.s, v.t));
  const o = [0, 1, 2, 3].map((k) => h(h(v['rgba'[k]]) * c[k]));
  const p = h(f32(h(h(o[0] + o[1]) + o[2]) / 3));
  let idx = h(h(p * 6) - 1); idx = idx < 0 ? 0 : idx > 5 ? 5 : idx;
  const pal = env.P.palette[Math.trunc(idx)].map((x) => h(f32(x / 255)));
  return [pal[0], pal[1], pal[2], o[3]];
}

function blur(key, v, env) {
  const tr = (x) => f16(x, 'trunc');
  const tx = env.P.texel || [0, 0, 0, 0], dx = h(f32(tx[0])), dy = h(f32(tx[1]));
  const hs = h(v.s), ht = h(v.t);
  const at = (sx, sy) => env.sample(h(hs + dx * sx), h(ht + dy * sy)).map(tr);
  const sum4 = (S, k) => h(h(h(S[0][k] + S[1][k]) + S[2][k]) + S[3][k]);
  const S = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => at(sx, sy));
  if (key === 'blurDown') {
    const c0 = env.sample(v.s, v.t).map(tr);   // центр — по самой координате, без округления к half
    return [0, 1, 2, 3].map((k) => h(h(c0[k] * 0.5) + h(sum4(S, k) * 0.125)));
  }
  const A = [[0, 2], [0, -2], [2, 0], [-2, 0]].map(([sx, sy]) => at(sx, sy));
  const k6 = h(f32(1 / 6)), k12 = h(f32(1 / 12));
  return [0, 1, 2, 3].map((k) => h(h(sum4(S, k) * k6) + h(sum4(A, k) * k12)));
}

function glyph(key, v, env) {
  if (key === 'glyph') {
    const c = htex(env.sample(v.s, v.t));
    return [0, 1, 2, 3].map((k) => h(h(v['rgba'[k]]) * c[k]));
  }
  const dist = htex(env.sample(v.s, v.t))[3];
  if (key === 'glyphSdfShadow') {
    const cs = (env.P.shadow || [0, 0, 0, 0]).map((x) => h(f32(x)));
    const al = smoothstep16(h(0.5 - cs[3]), h(0.5 + cs[3]), dist);
    return [cs[0], cs[1], cs[2], h(al * h(v.f))];
  }
  const [ddx, ddy] = env.fine((w) => htex(env.sample(w.s, w.t))[3]);
  const fw = h(Math.abs(h(ddx)) + Math.abs(h(ddy)));
  const range = h(f32(Math.max(fw, h(0.001)) / h(f32(Math.SQRT2))));
  const al = smoothstep16(h(0.5 - range), h(0.5 + range), dist);
  return [h(v.r), h(v.g), h(v.b), h(al * h(v.a))];
}

function alphaTest(on, col, P) {
  if (!on) return col;
  const en = P.alphaTestOn, ref = P.alphaRef;
  if (en && en[0] && col[3] <= f32((ref || [0])[0])) return null;
  return col;
}

/** Текст с полем расстояния (float32). */
function sdfText(key, at, v, env) {
  const tex = env.sample(v.s, v.t).slice();
  const P = env.P;
  if (key === 'sdfBlur') {
    const mm = P.blurRange || [0, 1], bc = P.blurColour || [1, 1, 1, 1];
    const cur = [f32(bc[0]), f32(bc[1]), f32(bc[2]), f32(f32(bc[3]) * smoothstep(f32(mm[0]), f32(mm[1]), tex[3]))];
    return alphaTest(at, [f32(v.r * cur[0]), f32(v.g * cur[1]), f32(v.b * cur[2]), f32(v.a * cur[3])], P);
  }
  // разброс = (|d(uv)/dx · масштаб| + |d(uv)/dy · масштаб|)/2
  const du = P.distUV || [0, 0];
  const [sx, sy] = env.d('s'), [tx, ty] = env.d('t');
  const len = (a, b) => f32(Math.sqrt(f32(f32(a * a) + f32(b * b))));
  const lx = len(f32(sx * f32(du[0])), f32(tx * f32(du[1]))), ly = len(f32(sy * f32(du[0])), f32(ty * f32(du[1])));
  let spread = f32(f32(lx + ly) * 0.5);
  if (key === 'sdf') {
    spread = Math.min(spread, 0.5);
    tex[3] = smoothstep(f32(0.5 - spread), f32(0.5 + spread), tex[3]);
    return alphaTest(at, [f32(v.r * tex[0]), f32(v.g * tex[1]), f32(v.b * tex[2]), f32(v.a * tex[3])], P);
  }
  // свечение → контур → ядро
  let cur = [0, 0, 0, -1], bf;
  const on = (x) => !!(x && x[0]);
  const vec = (x, d) => (x || d).map(f32);
  if (on(P.glow)) {
    const mm = vec(P.glowRange, [0, 1]);
    if (tex[3] > mm[0]) { cur = vec(P.glowColour, [0, 0, 0, 0]); cur[3] = f32(cur[3] * smoothstep(mm[0], mm[1], tex[3])); }
  }
  if (on(P.outline)) {
    const th = vec(P.outlineThresh, [0])[0], oc = vec(P.outlineColour, [0, 0, 0, 0]);
    const os = Math.min(spread, th);
    if (tex[3] > f32(th - os)) {
      bf = smoothstep(f32(th - os), f32(th + os), tex[3]);
      if (cur[3] < 0) cur = [oc[0], oc[1], oc[2], 0];
      cur = cur.map((x, k) => mix(x, oc[k], bf));
    }
  }
  const ct = vec(P.coreThresh, [0.5])[0], cc = vec(P.coreColour, [1, 1, 1, 1]);
  spread = Math.min(spread, ct);
  bf = smoothstep(f32(ct - spread), f32(ct + spread), tex[3]);
  if (cur[3] < 0) cur = [cc[0], cc[1], cc[2], 0];
  const t2 = cur.map((x, k) => mix(x, cc[k], bf));
  return alphaTest(at, [f32(v.r * t2[0]), f32(v.g * t2[1]), f32(v.b * t2[2]), f32(v.a * t2[3])], P);
}
