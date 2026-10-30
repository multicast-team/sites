// Кэш кадра по грязным прямоугольникам (этап 3.12, раунд исправлений 2): обёртка над FrameRaster с тем же набором методов.
// Без Node и DOM. Это и есть «кэш статичных слоёв»: всё, что не изменилось с прошлого кадра (фон, тайлы, панели), не перерисовывается,
// пиксели берутся из прошлого кадра; перерисовываются только прямоугольники, где что-то поменялось.
//
// Вызовы кадра копятся (массивы вершин копируются — вызывающий может их переиспользовать) и исполняются в readFrame().
// Цель (экран или текстура-поверхность) рисуется «по прямоугольникам», если:
//   - список вызовов кадра того же вида, что у прошлого: те же методы по порядку, те же аргументы у всех вызовов, кроме draw;
//     у draw — та же цель (остальные поля могут отличаться);
//   - у цели в кадре нет рисования с проверкой глубины или трафарета и описаний текстур посреди кадра.
// Тогда прямоугольники = объединение рамок (в пикселях цели, с запасом 2 px):
//   - треугольников draw, у которых отличаются вершины (позиция, цвет, uv) от того же draw прошлого кадра, — в обоих кадрах;
//   - всего draw целиком (в обоих кадрах), если у него отличается что-то кроме вершин, или его текстура выборки изменилась с прошлого
//     кадра, или текстура выборки — сама цель рисования этого или прошлого кадра;
//   - пикселей, где начальное содержимое цели (до первого рисования в кадре) отличается от начального содержимого прошлого кадра
//     (не нужно, если кадр начинается очисткой цвета всей цели).
// Почему побайтно то же, что полный кадр: пиксель вне прямоугольников получает ту же последовательность фрагментов (те же
// треугольники в том же порядке, то же состояние, те же texel-и) от того же начального значения — значит, то же значение, что в
// прошлом кадре; внутри прямоугольника кадр рисуется заново от начального содержимого (каждый вызов — с окном отсечения ∩ прямоугольник,
// растр не зависит от окна ничем, кроме того, какие пиксели писать). Прямоугольники не пересекаются (иначе пиксель смешался бы дважды).
// Описание/загрузка текстуры сравнивается по виду (номер, размер, рамка): изменение её байтов ловит версия текстуры у draw (выборка)
// и сравнение начального содержимого цели (цель).
// Если прямоугольники покрывают больше opt.maxShare цели — цель рисуется целиком обычным путём.

const ALL = 1e9;
const STATE = ['setClearColor', 'setClearDepth', 'setClearStencil', 'setScissorTest', 'setScissor', 'setColorMask', 'setDepthTest',
  'setDepthFunc', 'setDepthMask', 'setDepthRange', 'setStencilTest', 'setStencilFunc', 'setStencilOp', 'setStencilMask', 'setCull',
  'setCullFace', 'setFrontFace'];
const isTA = (v) => v && ArrayBuffer.isView(v);
const VERT = new Set(['pos', 'colour', 'uv']);

function headOf(d) {   // всё, кроме вершин
  const o = {};
  for (const k of Object.keys(d).sort()) if (!VERT.has(k)) o[k] = isTA(d[k]) ? Array.from(d[k]) : d[k];
  return JSON.stringify(o);
}
function sigOf(m, a) {   // не-draw вызов: метод и аргументы (массив байт — длиной и версией, см. defineTexture)
  return m + JSON.stringify(a, (k, v) => (isTA(v) ? `#${v.length}` : v));
}
const area = (r) => Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]);
const meets = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
const inter = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];

/** Первый и последний (+1) номер элемента в [a, b), где A и B различаются (NaN = NaN по битам); null — равны. Словами, где можно. */
function diffRange(A, B, a, b) {
  let X = A, Y = B, s = 1;
  const bpe = A.BYTES_PER_ELEMENT;
  if (bpe === 1 && (A.byteOffset & 3) === 0 && (B.byteOffset & 3) === 0) { s = 4; X = new Uint32Array(A.buffer, A.byteOffset, A.length >> 2); Y = new Uint32Array(B.buffer, B.byteOffset, B.length >> 2); }
  else if (bpe === 4 && !(A instanceof Uint32Array)) { X = new Uint32Array(A.buffer, A.byteOffset, A.length); Y = new Uint32Array(B.buffer, B.byteOffset, B.length); }
  else if (bpe === 8) { s = 0.5; X = new Uint32Array(A.buffer, A.byteOffset, A.length * 2); Y = new Uint32Array(B.buffer, B.byteOffset, B.length * 2); }
  // слова [wa, wb) целиком внутри [a, b) — словами, края — поэлементно
  const wa = Math.ceil(a / s), wb = Math.floor(b / s);
  const el = (i) => A[i] !== B[i] && !(A[i] !== A[i] && B[i] !== B[i]);
  let lo = -1, hi = -1;
  for (let i = a; i < Math.min(b, wa * s); i++) if (el(i)) { lo = i; break; }
  if (lo < 0) for (let w = wa; w < wb; w++) if (X[w] !== Y[w]) { lo = Math.floor(w * s); break; }
  if (lo < 0) for (let i = Math.max(a, wb * s); i < b; i++) if (el(i)) { lo = i; break; }
  if (lo < 0) return null;
  for (let i = b - 1; i >= Math.max(a, wb * s); i--) if (el(i)) { hi = i + 1; break; }
  if (hi < 0) for (let w = wb - 1; w >= wa; w--) if (X[w] !== Y[w]) { hi = Math.min(b, Math.floor((w + 1) * s) + (s < 1 ? 1 : 0)); break; }
  if (hi < 0) for (let i = Math.min(b, wa * s) - 1; i >= a; i--) if (el(i)) { hi = i + 1; break; }
  return [lo, Math.max(hi, lo + 1)];
}
function sameV(A, B, k, sz) {
  if (!A) return !B;
  for (let i = k * sz, e = i + sz; i < e; i++) if (A[i] !== B[i] && !(A[i] !== A[i] && B[i] !== B[i])) return false;
  return true;
}

/** Набор непересекающихся прямоугольников [x0, y0, x1, y1) не больше k штук: пересекающиеся сливаются, лишние — с наименьшим приростом. */
class Rects {
  constructor(k, bound) { this.k = k; this.bound = bound; this.list = []; }
  add(r) {
    r = inter(r, this.bound);
    if (r[2] <= r[0] || r[3] <= r[1]) return;
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < this.list.length; i++) if (meets(this.list[i], r)) { r = union(r, this.list[i]); this.list.splice(i, 1); changed = true; break; }
    }
    this.list.push(r);
    while (this.list.length > this.k) {
      let bi = 0, bj = 1, best = Infinity;
      for (let i = 0; i < this.list.length; i++) for (let j = i + 1; j < this.list.length; j++) {
        const g = area(union(this.list[i], this.list[j])) - area(this.list[i]) - area(this.list[j]);
        if (g < best) { best = g; bi = i; bj = j; }
      }
      const u = union(this.list[bi], this.list[bj]);
      this.list.splice(bj, 1); this.list.splice(bi, 1);
      this.add(u);
    }
  }
  area() { return this.list.reduce((s, r) => s + area(r), 0); }
}

export class LayerCache {
  /** R — FrameRaster без полосы. opt.k — прямоугольников на цель (8), opt.maxShare — доля площади, выше которой цель рисуется целиком (0.6). */
  constructor(R, opt = {}) {
    if (R.band) throw new Error('кэш кадра — только для растра без полосы');
    this.R = R; this.W = R.W; this.H = R.H;
    this.k = opt.k ?? 8; this.maxShare = opt.maxShare ?? 0.6;
    this.ops = []; this.prev = null;           // вызовы этого и прошлого кадра: {m, a, sig?, tv?}
    this.live = new Map();                     // цель → {data, rects, chained}: пиксели в растре после прошлого кадра
    this.texVer = new Map(); this.verN = 0;    // номер текстуры → версия содержимого/параметров (растёт при описании, загрузке, параметрах)
    this.start = new Map(); this.final = new Map();   // цель → копия пикселей: начало и конец прошлого кадра
    this.stats = { frames: 0, incr: 0, full: 0, pixels: 0, rects: 0, ms: { prep: 0 } };
    this.last = null;                          // по целям прошлого кадра: прямоугольники или 'full'
    for (const m of STATE) this[m] = (...a) => { a = a.map((x) => (x && typeof x === 'object' ? Array.from(x) : x)); this.ops.push({ m, a, sig: sigOf(m, a) }); };
  }
  bump(id) { this.texVer.set(id, ++this.verN); }

  // ---------- вызовы: копятся ----------
  defineTexture(id, w, h, rgba) { this.bump(id); this.ops.push({ m: 'defineTexture', a: [id, w, h, rgba], sig: sigOf('defineTexture', [id, w, h]) }); }
  defineDepthStencil(id, w, h) { this.bump(id); this.ops.push({ m: 'defineDepthStencil', a: [id, w, h], sig: sigOf('defineDepthStencil', [id, w, h]) }); }
  adoptTexture(id, w, h, data) { this.bump(id); this.ops.push({ m: 'adoptTexture', a: [id, w, h, data], sig: sigOf('adoptTexture', [id, w, h]) }); }
  uploadRect(id, x0, y0, w, h, rgba) { this.bump(id); const a = [id, x0, y0, w, h, rgba.slice(0, w * h * 4)]; this.ops.push({ m: 'uploadRect', a, sig: sigOf('uploadRect', a) }); }
  setTexParam(id, name, value) { this.bump(id); this.ops.push({ m: 'setTexParam', a: [id, name, value], sig: sigOf('setTexParam', [id, name, value]) }); }
  deleteTexture(id) { this.bump(id); this.ops.push({ m: 'deleteTexture', a: [id], sig: sigOf('deleteTexture', [id]) }); }
  hasTexture(id) {   // по описаниям и удалениям, в том числе ещё не исполненным
    for (let i = this.ops.length - 1; i >= 0; i--) {
      const o = this.ops[i];
      if ((o.m === 'defineTexture' || o.m === 'defineDepthStencil' || o.m === 'adoptTexture') && o.a[0] === id) return true;
      if (o.m === 'deleteTexture' && o.a[0] === id) return false;
    }
    return this.R.hasTexture(id);
  }
  clear(target, what) { const a = [target, { color: !!what.color, depth: !!what.depth, stencil: !!what.stencil }]; this.ops.push({ m: 'clear', a, sig: sigOf('clear', a) }); }
  draw(d) {
    const o = {};
    for (const k in d) { const v = d[k]; o[k] = isTA(v) ? v.slice() : v; }
    this.ops.push({ m: 'draw', a: o, tv: d.texture != null ? (this.texVer.get(d.texture) ?? 0) : 0 });
  }
  finish() { return Promise.resolve(); }
  unknownCount() { return this.R.unknownCount(); }

  // ---------- рамки ----------
  /** Рамка вершин [a, b) draw в пикселях цели (с запасом 2 px), ∩ область рисования; null — пусто; при w ≤ 0 — вся область. */
  bbox(d, a, b, clip) {
    const key = d.effect && d.effect.key;
    if (key !== 'sprite' && key !== 'fill') return clip;          // вершины других эффектов могут сдвигаться шейдером — вся область
    const M = d.matrix, vp = d.viewport, pos = d.pos, ps = d.posSize || 2;
    const hw = vp[2] / 2, hh = vp[3] / 2, cx = vp[0] + hw, cy = vp[1] + hh;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = a; k < b; k++) {
      const p = k * ps, x = pos[p], y = pos[p + 1], z = ps > 2 ? pos[p + 2] : 0;
      const w = M[3] * x + M[7] * y + M[11] * z + M[15];
      const vx = ((M[0] * x + M[4] * y + M[8] * z + M[12]) / w) * hw + cx, vy = ((M[1] * x + M[5] * y + M[9] * z + M[13]) / w) * hh + cy;
      if (!(w > 0) || !Number.isFinite(vx) || !Number.isFinite(vy)) return clip;
      if (vx < x0) x0 = vx; if (vx > x1) x1 = vx; if (vy < y0) y0 = vy; if (vy > y1) y1 = vy;
    }
    if (x0 > x1) return null;
    const r = inter([Math.floor(x0) - 2, Math.floor(y0) - 2, Math.ceil(x1) + 3, Math.ceil(y1) + 3], clip);
    return r[2] > r[0] && r[3] > r[1] ? r : null;
  }
  clipOf(d) {
    const t = d.target === 0 ? { w: this.W, h: this.H } : this.R.tex.get(d.target) || { w: ALL, h: ALL };
    const vp = d.viewport;
    let r = [Math.max(0, vp[0]), Math.max(0, vp[1]), Math.min(t.w, vp[0] + vp[2]), Math.min(t.h, vp[1] + vp[3])];
    if (d.scissor) r = inter(r, [d.scissor[0], d.scissor[1], d.scissor[0] + d.scissor[2], d.scissor[1] + d.scissor[3]]);
    return r;
  }
  drawBox(op) { if (op.box === undefined) op.box = op.a.count > 0 ? this.bbox(op.a, op.a.first, op.a.first + op.a.count, this.clipOf(op.a)) : null; return op.box; }

  /** Рамки треугольников draw (режим triangles): Int32Array по 4 на треугольник; рамка «вся область» — у всех (тогда null). */
  triBoxes(op) {
    if (op.tb !== undefined) return op.tb;
    const d = op.a, key = d.effect && d.effect.key;
    if (key !== 'sprite' && key !== 'fill') { op.tb = null; return null; }
    const clip = this.clipOf(d), n = Math.floor(d.count / 3), tb = new Int32Array(n * 4);
    const M = d.matrix, vp = d.viewport, pos = d.pos, ps = d.posSize || 2;
    const hw = vp[2] / 2, hh = vp[3] / 2, cx = vp[0] + hw, cy = vp[1] + hh;
    const m0 = M[0], m1 = M[1], m3 = M[3], m4 = M[4], m5 = M[5], m7 = M[7], m8 = M[8], m9 = M[9], m11 = M[11], m12 = M[12], m13 = M[13], m15 = M[15];
    const c0 = clip[0], c1 = clip[1], c2 = clip[2], c3 = clip[3];
    for (let i = 0; i < n; i++) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, all = false;
      for (let v = 0; v < 3; v++) {
        const p = (d.first + 3 * i + v) * ps, x = pos[p], y = pos[p + 1], z = ps > 2 ? pos[p + 2] : 0;
        const w = m3 * x + m7 * y + m11 * z + m15;
        const vx = ((m0 * x + m4 * y + m8 * z + m12) / w) * hw + cx, vy = ((m1 * x + m5 * y + m9 * z + m13) / w) * hh + cy;
        if (!(w > 0) || vx - vx !== 0 || vy - vy !== 0) { all = true; break; }
        if (vx < x0) x0 = vx; if (vx > x1) x1 = vx; if (vy < y0) y0 = vy; if (vy > y1) y1 = vy;
      }
      const o = i * 4;
      if (all) { tb[o] = c0; tb[o + 1] = c1; tb[o + 2] = c2; tb[o + 3] = c3; continue; }
      tb[o] = Math.max(c0, Math.floor(x0) - 2); tb[o + 1] = Math.max(c1, Math.floor(y0) - 2);
      tb[o + 2] = Math.min(c2, Math.ceil(x1) + 3); tb[o + 3] = Math.min(c3, Math.ceil(y1) + 3);
    }
    op.tb = tb;
    return tb;
  }
  /** Тот же draw только из треугольников, чья рамка задевает r (порядок прежний; треугольники triangles независимы). null — ни одного. */
  subset(d, tb, r) {
    const n = tb.length >> 2, pick = [];
    for (let i = 0; i < n; i++) { const o = i * 4; if (tb[o] < r[2] && r[0] < tb[o + 2] && tb[o + 1] < r[3] && r[1] < tb[o + 3]) pick.push(i); }
    if (!pick.length) return null;
    if (pick.length === n) return { ...d };
    const ps = d.posSize || 2, us = d.uvSize || 2, o = { ...d, first: 0, count: pick.length * 3 };
    const cut = (A, sz) => {
      if (!A) return A;
      const B = new A.constructor(pick.length * 3 * sz);
      let j = 0;
      for (const i of pick) { const a = (d.first + 3 * i) * sz; B.set(A.subarray(a, a + 3 * sz), j); j += 3 * sz; }
      return B;
    };
    o.pos = cut(d.pos, ps); o.colour = cut(d.colour, 4); o.uv = cut(d.uv, us);
    return o;
  }

  /** Изменения draw к прошлому кадру → прямоугольники в R (Rects цели). */
  diffDraw(op, old, rs, samp) {
    const d = op.a, e = old.a;
    const whole = () => { const b1 = this.drawBox(op), b0 = this.drawBox(old); if (b1) rs.add(b1); if (b0) rs.add(b0); };
    if (op.head === undefined) op.head = headOf(d);
    if (old.head === undefined) old.head = headOf(e);
    if (op.head !== old.head || samp === 'whole' || (!samp && op.tv !== old.tv)) { whole(); return; }
    const n = d.count, f = d.first;
    const ps = d.posSize || 2, us = d.uvSize || 2;
    // вершины [k0, k1), где хоть что-то отличается (сначала — сравнение массивов целиком словами)
    let k0 = Infinity, k1 = -1;
    for (const [A, B, sz] of [[d.pos, e.pos, ps], [d.colour, e.colour, 4], [d.uv, e.uv, us]]) {
      if (!A && !B) continue;
      if (!A || !B || A.constructor !== B.constructor) { k0 = f; k1 = f + n; break; }
      const r = diffRange(A, B, f * sz, (f + n) * sz);
      if (r) { k0 = Math.min(k0, Math.floor(r[0] / sz)); k1 = Math.max(k1, Math.floor((r[1] - 1) / sz) + 1); }
    }
    if (k1 < 0 && old.tb !== undefined && op.head === old.head) op.tb = old.tb;   // тот же draw — те же рамки треугольников
    if (k1 < 0) { if (samp && samp.length && !this.mapRects(d, samp, rs)) whole(); return; }
    if (samp || d.mode !== 'triangles') { whole(); return; }
    const clip = this.clipOf(d), clip0 = this.clipOf(e);
    const t0 = f + Math.floor((k0 - f) / 3) * 3;
    for (let t = t0; t + 2 < f + n && t < k1; t += 3) {
      if (sameV(d.pos, e.pos, t, ps) && sameV(d.colour, e.colour, t, 4) && sameV(d.uv, e.uv, t, us)) continue;
      const b1 = this.bbox(d, t, t + 3, clip), b0 = this.bbox(e, t, t + 3, clip0);
      if (b1) rs.add(b1); if (b0) rs.add(b0);
    }
  }

  /**
   * Прямоугольники текстуры выборки (в texel-ях) → пиксели цели draw. Только sprite, все вершины на одном аффинном отображении
   * «окно → texel» (2D-квад, проверка по каждой вершине) и uv в [0, 1] (без повтора); запас — 2 texel-я и 2 пикселя (выборка linear
   * берёт соседний texel, округления float32 на порядки меньше). Не подходит — false (тогда draw целиком).
   */
  mapRects(d, list, rs) {
    if (!d.effect || d.effect.key !== 'sprite' || !d.uv) return false;
    const T = this.R.tex.get(d.texture);
    if (!T) return false;
    const M = d.matrix, vp = d.viewport, pos = d.pos, ps = d.posSize || 2, uv = d.uv, us = d.uvSize || 2;
    const hw = vp[2] / 2, hh = vp[3] / 2, cx = vp[0] + hw, cy = vp[1] + hh;
    const P = [];
    for (let k = d.first; k < d.first + d.count; k++) {
      const p = k * ps, x = pos[p], y = pos[p + 1], z = ps > 2 ? pos[p + 2] : 0;
      const w = M[3] * x + M[7] * y + M[11] * z + M[15];
      if (!(w > 0)) return false;
      const s = uv[k * us], t = uv[k * us + 1];
      if (!(s >= 0 && s <= 1 && t >= 0 && t <= 1)) return false;
      P.push([((M[0] * x + M[4] * y + M[8] * z + M[12]) / w) * hw + cx, ((M[1] * x + M[5] * y + M[9] * z + M[13]) / w) * hh + cy, s * T.w, t * T.h]);
    }
    if (P.length < 3) return false;
    // аффинное отображение texel → окно по трём вершинам, не лежащим на одной прямой
    let A = null;
    for (let i = 2; i < P.length && !A; i++) {
      const [a, b, c] = [P[0], P[1], P[i]];
      const det = (b[2] - a[2]) * (c[3] - a[3]) - (c[2] - a[2]) * (b[3] - a[3]);
      if (Math.abs(det) < 1e-9) continue;
      const solve = (j) => {   // окно_j = α·s + β·t + γ
        const ex = b[j] - a[j], fx = c[j] - a[j];
        const al = (ex * (c[3] - a[3]) - fx * (b[3] - a[3])) / det, be = ((b[2] - a[2]) * fx - (c[2] - a[2]) * ex) / det;
        return [al, be, a[j] - al * a[2] - be * a[3]];
      };
      A = [solve(0), solve(1)];
    }
    if (!A) return false;
    for (const q of P) for (let j = 0; j < 2; j++) if (Math.abs(A[j][0] * q[2] + A[j][1] * q[3] + A[j][2] - q[j]) > 1e-3) return false;
    const box = this.bbox(d, d.first, d.first + d.count, this.clipOf(d));
    if (!box) return true;
    for (const r of list) {
      const cs = [[r[0] - 2, r[1] - 2], [r[2] + 2, r[1] - 2], [r[0] - 2, r[3] + 2], [r[2] + 2, r[3] + 2]];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [s, t] of cs) {
        const X = A[0][0] * s + A[0][1] * t + A[0][2], Y = A[1][0] * s + A[1][1] * t + A[1][2];
        x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
      }
      const q = inter([Math.floor(x0) - 2, Math.floor(y0) - 2, Math.ceil(x1) + 3, Math.ceil(y1) + 3], box);
      if (q[2] > q[0] && q[3] > q[1]) rs.add(q);
    }
    return true;
  }

  /** Строки и столбцы, где a ≠ b (цели w×h) → прямоугольники (по полосам подряд идущих строк). */
  diffPixels(a, b, w, h, rs) {
    if (!b || a.length !== b.length) { rs.add([0, 0, w, h]); return; }
    const A = new Uint32Array(a.buffer, a.byteOffset, a.length >> 2), B = new Uint32Array(b.buffer, b.byteOffset, b.length >> 2);
    let run = null;
    for (let y = 0; y < h; y++) {
      const o = y * w;
      let lo = -1, hi = -1;
      for (let x = 0; x < w; x++) if (A[o + x] !== B[o + x]) { lo = x; break; }
      if (lo >= 0) for (let x = w - 1; x >= lo; x--) if (A[o + x] !== B[o + x]) { hi = x; break; }
      if (lo >= 0) { if (run) { run[0] = Math.min(run[0], lo); run[2] = Math.max(run[2], hi + 1); run[3] = y + 1; } else run = [lo, y, hi + 1, y + 1]; }
      else if (run) { rs.add(run); run = null; }
    }
    if (run) rs.add(run);
  }

  // ---------- кадр ----------
  readFrame(out) {
    const R = this.R, ops = this.ops, prev = this.prev, T0 = performance.now();
    this.ops = [];
    this.stats.frames++;
    // 1. тот же вид кадра?
    let alike = !!prev && prev.length === ops.length;
    const written = new Set(), writtenPrev = new Set(), bad = new Set();
    for (let i = 0; i < ops.length; i++) {
      const o = ops[i];
      if (o.m === 'draw') written.add(o.a.target); else if (o.m === 'clear') written.add(o.a[0]);
      if (!alike) continue;
      const p = prev[i];
      if (p.m !== o.m || (o.m === 'draw' ? p.a.target !== o.a.target : p.sig !== o.sig)) alike = false;
    }
    if (prev) for (const o of prev) if (o.m === 'draw') writtenPrev.add(o.a.target); else if (o.m === 'clear') writtenPrev.add(o.a[0]);
    const sampledTargets = new Set([...written, ...writtenPrev]);
    // 2. по целям: номера draw, первый и последний вызов; «плохие» цели (глубина/трафарет, описание посреди кадра)
    const draws = new Map(), firstIdx = new Map(), lastIdx = new Map();
    if (alike) {
      let depthOn = false, stencilOn = false, began = false;
      for (let i = 0; i < ops.length; i++) {
        const o = ops[i];
        if (o.m === 'setDepthTest') depthOn = !!o.a[0];
        else if (o.m === 'setStencilTest') stencilOn = !!o.a[0];
        else if (o.m === 'draw' || o.m === 'clear') began = true;
        else if (began && /^(defineTexture|defineDepthStencil|adoptTexture|uploadRect|deleteTexture)$/.test(o.m)) { if (written.has(o.a[0])) bad.add(o.a[0]); }
        if (o.m !== 'draw' && o.m !== 'clear') continue;
        const t = o.m === 'draw' ? o.a.target : o.a[0];
        if (!firstIdx.has(t)) firstIdx.set(t, i);
        lastIdx.set(t, i);
        if (o.m !== 'draw') continue;
        if (depthOn || stencilOn) bad.add(t);
        if (!draws.has(t)) draws.set(t, []);
        draws.get(t).push(i);
      }
    }
    /** Изменения draw-ов цели t к прошлому кадру → Rects (выборка из цели S, уже нарисованной по прямоугольникам до начала t, —
     *  прямоугольники S, перенесённые в пиксели t). */
    const rectsOf = (t, w, h) => {
      const rs = new Rects(this.k, [0, 0, w, h]);
      for (const i of draws.get(t) || []) {
        const o = ops[i], S = o.a.texture;
        let samp = null;
        if (S != null && sampledTargets.has(S)) {
          const ms = mode.get(S);
          samp = ms && ms.incr && lastIdx.get(S) < firstIdx.get(t) && !(writtenPrev.has(S) && !written.has(S)) ? ms.rs : 'whole';
        }
        this.diffDraw(o, prev[i], rs, samp);
      }
      return rs;
    };
    const T1 = performance.now();
    // 3. исполнение по порядку
    const mode = new Map();   // цель → {incr, rs}
    const touched = new Set();   // текстуры, описанные/залитые в этом списке до первого рисования в них
    const firstOp = (t, o) => {
      const tg = R.target(t), w = tg.w, h = tg.h;
      const wholeClear = o.m === 'clear' && o.a[1].color && !R.scissorOn && R.mask.every((x) => x);
      // быстрый путь (как в игре): пиксели цели не трогали с конца прошлого кадра — в них уже F прошлого кадра, рисуем на месте.
      // Начальное содержимое отличается от начального прошлого кадра только в прямоугольниках прошлого кадра, если и тот начинался
      // с нетронутых пикселей (цепочка); при очистке всей цели в начале оно не важно.
      const lv = this.live.get(t);
      const chained = !!lv && lv.data === tg.data && !touched.has(t);
      if (alike && !bad.has(t) && chained && (wholeClear || (lv.chained && lv.rects !== 'full'))) {
        const rs = rectsOf(t, w, h);
        if (!wholeClear) for (const r of lv.rects) rs.add(r);
        if (rs.area() <= this.maxShare * w * h) {
          this.start.delete(t); this.final.delete(t);   // копий нет: медленный путь следующего кадра начнёт целиком
          const m = { incr: true, rs: rs.list, chained, inplace: true };
          this.stats.incr++; this.stats.inplace = (this.stats.inplace || 0) + 1; this.stats.pixels += rs.area(); this.stats.rects += rs.list.length;
          mode.set(t, m);
          return m;
        }
      }
      // начальное содержимое — в один из двух буферов цели по очереди (без выделения памяти каждый кадр)
      const pair = this.start.get(t) || [null, null];
      const oldStart = pair[0], oldFinal = this.final.get(t);
      let startCopy = pair[1];
      if (!startCopy || startCopy.length !== tg.data.length) startCopy = new Uint8Array(tg.data.length);
      startCopy.set(tg.data);
      this.start.set(t, [startCopy, oldStart]);
      let m = { incr: false, rs: null, chained };
      if (alike && !bad.has(t) && oldFinal && oldFinal.length === tg.data.length) {
        const rs = rectsOf(t, w, h);
        // начало кадра — очистка цвета всей цели: начальное содержимое не важно
        if (!wholeClear) this.diffPixels(startCopy, oldStart, w, h, rs);
        if (rs.area() <= this.maxShare * w * h) {
          m = { incr: true, rs: rs.list, chained };
          tg.data.set(oldFinal);
          const D = new Uint32Array(tg.data.buffer, tg.data.byteOffset, tg.data.length >> 2), S = new Uint32Array(startCopy.buffer);
          for (const r of rs.list) for (let y = r[1]; y < r[3]; y++) D.set(S.subarray(y * w + r[0], y * w + r[2]), y * w + r[0]);
          this.stats.pixels += rs.area(); this.stats.rects += rs.list.length;
        }
      }
      if (m.incr) this.stats.incr++; else { this.stats.full++; this.stats.pixels += w * h; }
      mode.set(t, m);
      return m;
    };
    for (const o of ops) {
      if (o.m === 'draw') {
        const d = o.a, t = d.target;
        const m = mode.get(t) || (R.hasTexture(t) || t === 0 ? firstOp(t, o) : { incr: false });
        if (!m.incr) { R.draw(d); continue; }
        const box = this.drawBox(o);
        if (!box) { if (d.count > 0) { /* пусто в области — растр тоже ничего не нарисует */ } continue; }
        const sc0 = d.scissor;
        const tb = m.rs.length && d.mode === 'triangles' && d.count >= 192 ? this.triBoxes(o) : null;
        for (const r of m.rs) {
          if (!meets(r, box)) continue;
          const c = sc0 ? inter(r, [sc0[0], sc0[1], sc0[0] + sc0[2], sc0[1] + sc0[3]]) : r;
          if (c[2] <= c[0] || c[3] <= c[1]) continue;
          const dd = tb ? this.subset(d, tb, c) : d;
          if (!dd) continue;
          dd.scissor = [c[0], c[1], c[2] - c[0], c[3] - c[1]];
          R.draw(dd);
        }
        d.scissor = sc0;
      } else if (o.m === 'clear') {
        const [t, what] = o.a;
        const m = mode.get(t) || firstOp(t, o);
        if (!m.incr || !what.color) { R.clear(t, what); continue; }
        if (what.depth || what.stencil) R.clear(t, { depth: what.depth, stencil: what.stencil });
        const on = R.scissorOn, sr = R.scissorRect;
        const base = on ? [sr[0], sr[1], sr[0] + sr[2], sr[1] + sr[3]] : null;
        R.scissorOn = true;
        for (const r of m.rs) {
          const c = base ? inter(r, base) : r;
          if (c[2] <= c[0] || c[3] <= c[1]) continue;
          R.scissorRect = [c[0], c[1], c[2] - c[0], c[3] - c[1]];
          R.clear(t, { color: true });
        }
        R.scissorOn = on; R.scissorRect = sr;
      } else {
        if (/^(defineTexture|defineDepthStencil|adoptTexture|uploadRect|deleteTexture)$/.test(o.m) && !mode.has(o.a[0])) touched.add(o.a[0]);
        R[o.m](...o.a);
      }
    }
    const T2 = performance.now();
    // 4. конец кадра: пиксели целей — для следующего
    this.live = new Map();
    for (const t of written) {
      const tg = R.hasTexture(t) || t === 0 ? R.target(t) : null;
      if (!tg) continue;
      const m = mode.get(t) || { incr: false };
      this.live.set(t, { data: tg.data, rects: m.incr ? m.rs.map((r) => r.slice()) : 'full', chained: !!m.chained });
      if (m.inplace) continue;
      let f = this.final.get(t);
      if (!f || f.length !== tg.data.length) f = new Uint8Array(tg.data.length);
      f.set(tg.data); this.final.set(t, f);
    }
    for (const t of [...this.final.keys()]) if (!written.has(t)) { this.final.delete(t); this.start.delete(t); }
    this.last = Object.fromEntries([...mode].map(([t, m]) => [t, m.incr ? m.rs.map((r) => r.slice()) : 'full']));
    this.prev = ops;
    const res = R.readFrame(out);
    this.time = { compare: T1 - T0, exec: T2 - T1, tail: performance.now() - T2 };
    return res;
  }
}
