// Игровой растр, параллельный (этап 3.12, раунд исправлений): тот же FrameRaster, но кадр рисуют n потоков, каждый — свою полосу
// строк каждой цели (FrameRaster opt.band). Пиксель растра не зависит от того, с какой строки начат треугольник и в какой полосе он
// лежит (рёбра, плоскости и выборка считаются от координат пикселя), поэтому полосы вместе дают ровно тот же кадр, что один поток.
// Без Node и без DOM: потоки даёт хозяин (браузер — Worker с band-worker.mjs, тесты Node — worker_threads), здесь только «порты»:
//   port = { post(msg), listen(cb) }.
//
// Порядок работы кадра:
//   1. вызовы растра (те же методы, что у FrameRaster) копятся в список; массивы вершин копируются в общую память (арену);
//      текстуры — сразу в общую память (каждый поток видит те же байты), в список идёт adoptTexture;
//   2. finish() рассылает список всем потокам и ждёт «готово» от каждого; поток k повторяет весь список в своей полосе;
//   3. зависимость между полосами одна: рисование, которое берёт выборку из текстуры, куда в этом кадре уже рисовали (или грузили),
//      — перед ним барьер (все потоки дошли до этого места), иначе поток мог бы прочесть чужую полосу недорисованной;
//   4. каждый поток сам переворачивает свои строки экрана в общий кадр (верхняя строка первой) — readFrame() его отдаёт.
// Границы полос подстраиваются по времени потоков прошлого кадра (balance), на результат это не влияет.

// Список вызовов кадра уходит потокам одной строкой JSON (сериализация один раз на главном потоке, а не копия объектов на каждый поток):
// типизированные массивы — в арену, буферы текстур — списком SharedArrayBuffer рядом со строкой, числа, которых нет в JSON (−0, NaN, ±∞), —
// метками {$n}.
const enc = (k, v) => (typeof v === 'number' && (v !== v || v === Infinity || v === -Infinity || Object.is(v, -0)) ? { $n: Object.is(v, -0) ? '-0' : String(v) } : v);
const dec = (k, v) => (v !== null && typeof v === 'object' && v.$n !== undefined ? (v.$n === '-0' ? -0 : Number(v.$n)) : v);
const KINDS = { Float32Array, Float64Array, Uint8Array, Uint8ClampedArray, Int32Array, Uint32Array, Int16Array, Uint16Array, Int8Array };

export class ParallelRaster {
  /** W×H — экран; ports — порты потоков (см. выше); opt.balance — подстраивать полосы (по умолчанию да). */
  constructor(W, H, ports, opt = {}) {
    this.W = W; this.H = H; this.ports = ports; this.n = ports.length;
    this.balance = opt.balance !== false;
    this.screenBuf = new SharedArrayBuffer(W * H * 4);
    this.outBuf = new SharedArrayBuffer(W * H * 4);
    this.out = new Uint8Array(this.outBuf);
    this.ctl = new SharedArrayBuffer(16);   // барьер: [счётчик, поколение]
    this.bounds = Array.from({ length: this.n + 1 }, (_, k) => k / this.n);
    this.tex = new Map();                   // номер → {w, h}
    this.arenas = []; this.arenaCap = 1 << 22;
    this.calls = []; this.dirty = new Set(); this.bufs = [];
    this.waiting = null; this.doneCount = 0; this.times = new Array(this.n).fill(0); this.unknownSum = 0;
    this.stats = { draws: 0, barriers: 0 };
    ports.forEach((p, k) => {
      p.listen((m) => {
        if (m.type !== 'done') return;
        this.times[k] = m.ms; this.unknownSum += m.unknown;
        if (++this.doneCount === this.n && this.waiting) { const w = this.waiting; this.waiting = null; w(); }
      });
      p.post({ type: 'init', k, n: this.n, W, H, screen: this.screenBuf, out: this.outBuf, ctl: this.ctl });
    });
    this.resetArena();
  }

  resetArena() { this.ai = 0; this.ao = 0; if (!this.arenas.length) this.arenas.push(new SharedArrayBuffer(this.arenaCap)); }
  /** Копия массива в арену → ссылка {$a, i, o, n}. */
  stash(a) {
    const kind = a.constructor.name, bytes = a.byteLength;
    let o = (this.ao + 7) & ~7;
    if (o + bytes > this.arenas[this.ai].byteLength) {
      this.ai++; o = 0;
      if (this.ai >= this.arenas.length || this.arenas[this.ai].byteLength < bytes) this.arenas[this.ai] = new SharedArrayBuffer(Math.max(this.arenaCap, bytes));
    }
    new Uint8Array(this.arenas[this.ai], o, bytes).set(new Uint8Array(a.buffer, a.byteOffset, bytes));
    this.ao = o + bytes;
    return { $a: kind, i: this.ai, o, n: a.length };
  }

  push(m, args) { this.calls.push([m, args]); }

  // ---------- текстуры: байты сразу в общую память ----------
  defineTexture(id, w, h, rgba) {
    const buf = new SharedArrayBuffer(w * h * 4), data = new Uint8Array(buf);
    if (rgba) data.set(rgba.subarray ? rgba.subarray(0, w * h * 4) : rgba);
    this.tex.set(id, { w, h });
    this.dirty.delete(id);   // новый буфер: прежние рисования в него не попадают
    this.bufs.push(buf);
    this.push('adoptTexture', [id, w, h, { $buf: this.bufs.length - 1 }]);
  }
  defineDepthStencil(id, w, h) { this.tex.set(id, { w, h }); this.push('defineDepthStencil', [id, w, h]); }
  hasTexture(id) { return this.tex.has(id); }
  uploadRect(id, x0, y0, w, h, rgba) { this.dirty.add(id); this.push('uploadRect', [id, x0, y0, w, h, this.stash(rgba.subarray(0, w * h * 4))]); }
  deleteTexture(id) { this.tex.delete(id); this.push('deleteTexture', [id]); }

  // ---------- состояние: как есть ----------
  setTexParam(...a) { this.push('setTexParam', a); }
  setClearColor(c) { this.push('setClearColor', [Array.from(c)]); }
  setClearDepth(...a) { this.push('setClearDepth', a); }
  setClearStencil(...a) { this.push('setClearStencil', a); }
  setScissorTest(...a) { this.push('setScissorTest', a); }
  setScissor(r) { this.push('setScissor', [Array.from(r)]); }
  setColorMask(m) { this.push('setColorMask', [Array.from(m)]); }
  setDepthTest(...a) { this.push('setDepthTest', a); }
  setDepthFunc(...a) { this.push('setDepthFunc', a); }
  setDepthMask(...a) { this.push('setDepthMask', a); }
  setDepthRange(r) { this.push('setDepthRange', [Array.from(r)]); }
  setStencilTest(...a) { this.push('setStencilTest', a); }
  setStencilFunc(...a) { this.push('setStencilFunc', a); }
  setStencilOp(...a) { this.push('setStencilOp', a); }
  setStencilMask(...a) { this.push('setStencilMask', a); }
  setCull(...a) { this.push('setCull', a); }
  setCullFace(...a) { this.push('setCullFace', a); }
  setFrontFace(...a) { this.push('setFrontFace', a); }

  clear(target, what) { this.dirty.add(target); this.push('clear', [target, what]); }

  draw(d) {
    this.stats.draws++;
    if (d.texture != null && this.dirty.has(d.texture)) { this.push('$barrier', []); this.stats.barriers++; this.dirty.clear(); }
    this.dirty.add(d.target);
    const o = {};
    for (const k in d) { const v = d[k]; o[k] = v && ArrayBuffer.isView(v) ? this.stash(v) : v; }
    this.push('draw', [o]);
  }

  /** Нарисовать накопленный кадр всеми потоками; → Promise (когда все полосы готовы и перевёрнуты в кадр). */
  finish() {
    const msg = { type: 'frame', calls: JSON.stringify(this.calls, enc), bufs: this.bufs, arenas: this.arenas.slice(0, this.ai + 1), bounds: this.bounds };
    this.calls = []; this.dirty.clear(); this.bufs = [];
    this.doneCount = 0;
    const p = new Promise((r) => { this.waiting = r; });
    for (const port of this.ports) port.post(msg);
    return p.then(() => { this.resetArena(); if (this.balance) this.rebalance(); });
  }

  /** Новые границы полос: плотность работы в полосе k считается постоянной (время / ширина), границы — равные доли суммы. */
  rebalance() {
    const n = this.n, b = this.bounds, t = this.times;
    const total = t.reduce((a, x) => a + x, 0);
    if (!(total > 0)) return;
    const nb = [0];
    let k = 0, acc = 0;
    for (let j = 1; j < n; j++) {
      const goal = total * j / n;
      while (k < n - 1 && acc + t[k] < goal) { acc += t[k]; k++; }
      const frac = t[k] > 0 ? (goal - acc) / t[k] : 0;
      nb.push(b[k] + (b[k + 1] - b[k]) * Math.min(1, Math.max(0, frac)));
    }
    nb.push(1);
    // сглаживание и наименьшая ширина — чтобы одна полоса не схлопывалась от шума
    const min = 0.25 / n;
    for (let j = 1; j < n; j++) nb[j] = 0.5 * b[j] + 0.5 * nb[j];
    for (let j = 1; j < n; j++) nb[j] = Math.max(nb[j], nb[j - 1] + min);
    for (let j = n - 1; j >= 1; j--) nb[j] = Math.min(nb[j], nb[j + 1] - min);
    this.bounds = nb;
  }

  /** Кадр (верхняя строка первой) — общий буфер, до следующего finish(). */
  readFrame() { return this.out; }
  unknownCount() { return this.unknownSum; }
  /** Остановить потоки. */
  close() { for (const p of this.ports) p.post({ type: 'close' }); }
}

/** Ссылка арены → массив (общая память, без копии). */
function unstash(r, arenas) {
  const C = KINDS[r.$a];
  return new C(arenas[r.i], r.o, r.n);
}

/**
 * Поток полосы: handler(msg) для сообщений главного потока; post(msg) — ответ главному.
 * Используется хозяином потока (browser: band-worker.mjs; Node: тестовый переходник).
 */
export function bandWorker(post, FrameRaster) {
  let R = null, k = 0, n = 1, ctl = null, out = null, waited = 0;
  const barrier = () => {
    const w0 = performance.now();
    const g = Atomics.load(ctl, 1);
    if (Atomics.add(ctl, 0, 1) === n - 1) { Atomics.store(ctl, 0, 0); Atomics.add(ctl, 1, 1); Atomics.notify(ctl, 1); }
    else while (Atomics.load(ctl, 1) === g) Atomics.wait(ctl, 1, g);
    waited += performance.now() - w0;
  };
  return (m) => {
    if (m.type === 'init') {
      k = m.k; n = m.n; ctl = new Int32Array(m.ctl); out = new Uint8Array(m.out);
      R = new FrameRaster(m.W, m.H, { screen: new Uint8Array(m.screen), band: [k / n, (k + 1) / n] });
      return;
    }
    if (m.type === 'close') { if (typeof close === 'function') close(); return; }
    if (m.type !== 'frame') return;
    const t0 = performance.now();
    waited = 0;
    R.setBand([m.bounds[k], m.bounds[k + 1]]);
    const u0 = R.unknownCount();
    const calls = JSON.parse(m.calls, dec);
    for (const [meth, args] of calls) {
      if (meth === '$barrier') { barrier(); continue; }
      if (meth === 'draw') {
        const d = args[0], o = {};
        for (const key in d) { const v = d[key]; o[key] = v && v.$a ? unstash(v, m.arenas) : v; }
        R.draw(o);
      } else if (meth === 'uploadRect') {
        R.uploadRect(args[0], args[1], args[2], args[3], args[4], unstash(args[5], m.arenas));
      } else if (meth === 'adoptTexture') {
        R.adoptTexture(args[0], args[1], args[2], new Uint8Array(m.bufs[args[3].$buf]));
      } else R[meth](...args);
    }
    R.readFrame(out);
    post({ type: 'done', k, ms: performance.now() - t0 - waited, unknown: R.unknownCount() - u0 });
  };
}
