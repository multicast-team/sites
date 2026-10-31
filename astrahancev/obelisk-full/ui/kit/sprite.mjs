// spec: sprite-layout
// Спрайт: целый кадр и nine-slice, отсечение окном вида. Независимая реализация (этап 4.1, раунд исправлений):
// написана только по тексту oracle/specs/sprite-layout.md (версия 1), без прежнего кода кита и без записей O.
// Номера правил в комментариях — разделы «Правила» спеки.

import { sinf, cosf } from '../../core/num/libmf.mjs';

const F = Math.fround;

// Порядок вершин квадрата; углы: 0 лево-верх, 1 право-верх, 2 право-низ, 3 лево-низ.
const WHOLE = [0, 1, 2, 2, 3, 0]; // п.1: лв, пв, пн, пн, лн, лв
const PIECE = [0, 1, 3, 3, 1, 2]; // п.3: лв, пв, лн, лн, пв, пн

// Индексы режимов в массиве modes (порядок данных skin: лево, верх, право, низ, центр).
const M_LEFT = 0, M_TOP = 1, M_RIGHT = 2, M_BOTTOM = 3, M_CENTER = 4;

/** Сумма и произведение во float32 (п.5). */
const add = (a, b) => F(F(a) + F(b));
const sub = (a, b) => F(F(a) - F(b));
const mul = (a, b) => F(F(a) * F(b));

/** Цвет вершины: красный — младший байт, альфа — floor(a · 255) (раздел «Входы и выходы»). */
function vertexColor(rgb, alpha) {
  const a = Math.floor(F(Math.min(alpha, 1)) * 255);   // альфа > 1 даёт 255 (v4)
  return (((rgb[0] & 255) | ((rgb[1] & 255) << 8) | ((rgb[2] & 255) << 16)) >>> 0) + a * 0x1000000;
}

/** Один квадрат: экран [x0, y0, x1, y1], атлас (px) [u0, v0, u1, v1]. */
function emit(list, order, scr, tex, size, color, atlas) {
  const [W, H] = size;
  const px = [scr[0], scr[2], scr[2], scr[0]];
  const py = [scr[1], scr[1], scr[3], scr[3]];
  const pu = [tex[0], tex[2], tex[2], tex[0]];
  const pv = [tex[1], tex[1], tex[3], tex[3]];
  for (const k of order) list.push(px[k], py[k], F(F(pu[k]) / W), F(F(pv[k]) / H), color, atlas);
}

/**
 * Разбиение одной оси области на отрезки для режима: [экран от, экран до, исходник от, исходник до].
 * «Повторить» — плитки размера исходника без масштаба от начала области, последняя обрезается (п.4).
 * «Растянуть» — один отрезок. Углы всегда идут через «растянуть» (размер исходника = размер на экране).
 */
function axisSegments(mode, s0, s1, t0, t1, len) {
  if (mode === 'stretch') return [[s0, s1, t0, t1]];
  if (mode === 'repeat') {
    const step = t1 - t0;
    const out = [];
    if (!(step > 0)) return out;
    // len — длина области в координатах от начала спрайта (float32); остаток последней плитки = len − k·шаг (вычитанием во
    // float32), а не «конец − начало плитки» на экране (4.3: O так; на экране выходит на 1 ulp иначе — uv 1417,6001 ≠ 1417,59998)
    let p = F(s0), rest = len === undefined ? sub(s1, s0) : F(len);
    while (p < s1) {
      const q = add(p, step);
      if (q <= s1) out.push([p, q, t0, t1]);
      else out.push([p, F(s1), t0, add(t0, rest)]);
      p = q;
      rest = sub(rest, step);
    }
    return out;
  }
  if (mode === 'hide') return [];
  // ?? «зеркально» и «пусто с повтором» в спеке v1 не описаны (раздел «Неясности»).
  throw new Error(`sprite-layout v1: режим nine-slice «${mode}» не описан`);
}

/**
 * Радиус отсечения спрайта (spec sprite-layout п.6, v9): расстояние от точки привязки до дальнего угла холста, округлённое вверх
 * до целого px холста, × больший из |sx|, |sy|. Холст, а не кадр: обрезка кадра (dst) радиус не меняет.
 */
export function cullRadius(s, sx, sy) {
  const [ox, oy] = s.origin;
  return Math.ceil(Math.hypot(Math.max(ox, s.width - ox), Math.max(oy, s.height - oy))) * Math.max(Math.abs(sx), Math.abs(sy));
}

/** Вызов отсечён окном вида list.view = [лево, верх, право, низ] (п.6, v9): окно полуоткрытое — y − ρ = низ отсекается, y + ρ = верх рисуется. */
export function culledByView(list, x, y, rad) {
  const [vl, vt, vr, vb] = list.view;
  return y - rad >= vb || y + rad < vt || x - rad >= vr || x + rad < vl;
}

/**
 * Спрайт key (кадр frame) в (x, y), масштаб (sx, sy), оттенок rgb, альфа alpha → вершины в list (VertexList ui/kit).
 * angle — градусы (double, к [0, 360) не приводится): ≠ 0 у кадра без nine-slice — п.1а (v8); с nine-slice — ?? в спеке.
 */
export function drawSprite(list, skin, key, frame, x, y, sx, sy, rgb, alpha, angle = 0) {
  const s = skin.sprite(key);
  const fr = s.frames[frame];
  if (!fr) throw new Error(`кадр ${frame} спрайта ${key}`);
  const [ox, oy] = s.origin;
  x = F(x); y = F(y); sx = F(sx); sy = F(sy);

  // п.6 (v9, этап 8.3): отсечение целиком по радиусу ρ = ⌈|точка привязки → дальний угол холста|⌉ · больший масштаб;
  // окно полуоткрытое [лево, право) × [верх, низ) — см. cullRadius / culledByView
  const rad = cullRadius(s, sx, sy);
  const culled = culledByView(list, x, y, rad);
  // журнал вызовов для проверок (oracle/): включается list.trace = []; на вершины не влияет
  if (list.trace) list.trace.push({ key, frame, x, y, sx, sy, angle, rad, culled, at: list.count });
  if (culled) { list.culled++; return; }

  if (angle !== 0) {
    if (s.nine) throw new Error(`sprite-layout п.1а: nine-slice с углом ${angle} ?? в спеке`);
    layoutRotated(list, fr, x, y, sx, sy, ox, oy, angle, vertexColor(rgb, alpha));
    return;
  }
  layoutFrame(list, s, fr, x, y, sx, sy, ox, oy, vertexColor(rgb, alpha));
}

/**
 * Повёрнутый целый кадр (п.1а, v8): r = f32(f32(f32(α) · f32(π)) / 180); s, c = sinf, cosf; смещения углов холста — как в п.1
 * (ax = dx · sx, ay = dy · sy); x′ = (x + ax · c) + ay · s, y′ = (y − ax · s) + ay · c, каждая операция — float32. x, y, sx, sy — float32.
 */
function layoutRotated(list, fr, x, y, sx, sy, ox, oy, angle, color) {
  const [srcX, srcY, srcW, srcH] = fr.src;
  const [dstX, dstY, dstW, dstH] = fr.dst;
  const r = F(F(F(angle) * F(Math.PI)) / 180);
  const sn = sinf(r), cs = cosf(r);
  const corner = (dx, dy) => {
    const ax = mul(dx, sx), ay = mul(dy, sy);
    return [add(add(x, mul(ax, cs)), mul(ay, sn)), add(sub(y, mul(ax, sn)), mul(ay, cs))];
  };
  // углы холста: лево-верх, право-верх, право-низ, лево-низ
  const px = [dstX - ox, dstX + dstW - ox], py = [dstY - oy, dstY + dstH - oy];
  const c = [corner(px[0], py[0]), corner(px[1], py[0]), corner(px[1], py[1]), corner(px[0], py[1])];
  const u = [srcX, srcX + srcW], v = [srcY, srcY + srcH];
  const tex = [[u[0], v[0]], [u[1], v[0]], [u[1], v[1]], [u[0], v[1]]];
  const [W, H] = fr.atlasSize;
  for (const k of WHOLE) list.push(c[k][0], c[k][1], F(F(tex[k][0]) / W), F(F(tex[k][1]) / H), color, fr.atlas);
}

/**
 * Растянутый спрайт (п.8, v6): origin не используется, (x, y) — лево-верх области w × h на экране; раскладка drawSprite с привязкой
 * (0, 0) и масштабами float32(w / ширина холста), float32(h / высота холста). Отсечения нет (?? в спеке).
 */
export function drawSpriteStretched(list, skin, key, frame, x, y, w, h, rgb, alpha) {
  const s = skin.sprite(key);
  const fr = s.frames[frame];
  if (!fr) throw new Error(`кадр ${frame} спрайта ${key}`);
  layoutFrame(list, s, fr, F(x), F(y), F(w / s.width), F(h / s.height), 0, 0, vertexColor(rgb, alpha));
}

/** Общее ядро раскладки drawSprite и drawSpriteStretched: целый кадр (п.1) или nine-slice (п.2–4); x, y, sx, sy — уже float32. */
function layoutFrame(list, s, fr, x, y, sx, sy, ox, oy, color) {
  const w = s.width, h = s.height;
  const [srcX, srcY, srcW, srcH] = fr.src;
  const [dstX, dstY, dstW, dstH] = fr.dst;

  if (!s.nine) {
    // п.1: целый кадр.
    // v10 (этап 8.17b): смещение правого (нижнего) края = смещение левого (верхнего) + ширина (высота) · масштаб, всё в float32;
    // края — от x (y), а не от левого (верхнего) на экране: «лево + dst.w · sx» расходится с O на 1 ulp. (v4 было одним произведением.)
    const a = mul(dstX - ox, sx), c = mul(dstY - oy, sy);
    const l = add(x, a);
    const t = add(y, c);
    const r = add(x, add(a, mul(dstW, sx)));
    const b = add(y, add(c, mul(dstH, sy)));
    emit(list, WHOLE, [l, t, r, b], [srcX, srcY, srcX + srcW, srcY + srcH], fr.atlasSize, color, fr.atlas);
    return;
  }

  // п.2: nine-slice. ?? Кадр с обрезкой (dst ≠ весь холст) спекой не описан: холст → атлас сдвигом src − dst.
  const n = s.nine;
  const L = sub(x, mul(ox, sx)), T = sub(y, mul(oy, sy));
  // v7 (этап 6.8): границы областей на экране — Л (В) + смещения o0..o3 через масштаб средней части k = ((W − лево) − право) / m,
  // m = w − лево − право; o1 = лево, o2 = лево + m·k, o3 = o2 + право; правый (нижний) край — Л + o3, а не Л + W.
  // m ≤ 0 (?? в записях нет) — прежние формулы: П = Л + W, «П − право», «В + (H − низ)», Н = В + H.
  const W = mul(w, sx), H = mul(h, sy);
  const bounds = (P, size, len, a, b, fromEnd) => {
    const m = len - a - b;
    if (!(m > 0)) {
      const E = add(P, size);
      return [P, add(P, a), fromEnd ? sub(E, b) : add(P, sub(size, b)), E];
    }
    const k = F(sub(sub(size, a), b) / m);
    const o2 = add(a, mul(m, k));
    return [P, add(P, a), add(P, o2), add(P, add(o2, b))];
  };
  const ex = bounds(L, W, w, n.left, n.right, true);
  const ey = bounds(T, H, h, n.top, n.bottom);
  // те же границы от начала спрайта (для остатка плиток «повторить»)
  const lx = [0, n.left, sub(mul(w, sx), n.right), mul(w, sx)];
  const ly = [0, n.top, sub(mul(h, sy), n.bottom), mul(h, sy)];
  const cx = [0, n.left, w - n.right, w];                         // в холсте спрайта
  const cy = [0, n.top, h - n.bottom, h];
  const ax = cx.map((c) => srcX + (c - dstX));                    // → атлас
  const ay = cy.map((c) => srcY + (c - dstY));
  // п.2а, v5: высота меньше суммы краёв — средней полосы нет; нижняя полоса идёт от В + верх до Н, её uv — от начала нижнего края
  // исходника (h − низ) на ту же высоту (1 px экрана = 1 px исходника)
  const squashed = mul(h, sy) < n.top + n.bottom;
  if (squashed) {
    ey[2] = ey[1];
    ay[3] = ay[2] + sub(ey[3], ey[1]);
  }

  // Режим по осям для каждой из 9 ячеек (столбец i, строка j): углы — один кусок; края повторяются вдоль себя.
  const modes = n.modes;
  const cell = (i, j) => {
    if (i !== 1 && j !== 1) return ['stretch', 'stretch'];
    if (i === 1 && j === 1) return [modes[M_CENTER], modes[M_CENTER]];
    if (j === 0) return [modes[M_TOP], 'stretch'];
    if (j === 2) return [modes[M_BOTTOM], 'stretch'];
    if (i === 0) return ['stretch', modes[M_LEFT]];
    return ['stretch', modes[M_RIGHT]];
  };

  // п.3: порядок кусков — строки сверху вниз, в строке слева направо; внутри области — ряды сверху вниз.
  for (let j = 0; j < 3; j++) {
    if (squashed && j === 1) continue;                            // п.2а, v5
    for (let i = 0; i < 3; i++) {
      const [mx, my] = cell(i, j);
      if (mx === 'hide' || my === 'hide') continue;
      const xs = axisSegments(mx, ex[i], ex[i + 1], ax[i], ax[i + 1], sub(lx[i + 1], lx[i]));
      const ys = axisSegments(my, ey[j], ey[j + 1], ay[j], ay[j + 1], sub(ly[j + 1], ly[j]));
      for (const [y0, y1, v0, v1] of ys) {
        for (const [x0, x1, u0, u1] of xs) emit(list, PIECE, [x0, y0, x1, y1], [u0, v0, u1, v1], fr.atlasSize, color, fr.atlas);
      }
    }
  }
}

/**
 * Часть спрайта (п.7, v3): прямоугольник (left, top, width, height) холста спрайта ∩ dst кадра, угол лево-верх запроса — в (x, y);
 * origin не используется. angle — 0 или 180; один цвет на все углы. Отсечения нет (?? в спеке).
 */
export function drawSpritePart(list, skin, key, frame, left, top, width, height, x, y, sx, sy, angle, rgb, alpha) {
  if (angle !== 0 && angle !== 180) throw new Error(`sprite-layout п.7: угол ${angle} ??`);
  const s = skin.sprite(key);
  const fr = s.frames[frame];
  if (!fr) throw new Error(`кадр ${frame} спрайта ${key}`);
  const [srcX, srcY] = fr.src;
  const [dstX, dstY, dstW, dstH] = fr.dst;
  x = F(x); y = F(y); sx = F(sx); sy = F(sy);

  // пересечение запроса с dst кадра
  const l = Math.max(left, dstX), r = Math.min(left + width, dstX + dstW);
  const t = Math.max(top, dstY), b = Math.min(top + height, dstY + dstH);
  const offX = mul(l - left, sx), offY = mul(t - top, sy);
  const spanX = mul(r - l, sx), spanY = mul(b - t, sy);
  let x0, x1, y0, y1;
  if (angle === 0) {
    x0 = add(x, offX); x1 = add(x0, spanX);
    y0 = add(y, offY); y1 = add(y0, spanY);
  } else {
    x0 = sub(x, offX); x1 = sub(x0, spanX);
    y0 = sub(y, offY); y1 = sub(y0, spanY);
  }
  // uv: src + (граница − dst.x); порядок вершин как у целого кадра, по углам запроса в холсте (x0,y0 — его лево-верх)
  emit(list, WHOLE, [x0, y0, x1, y1],
    [srcX + (l - dstX), srcY + (t - dstY), srcX + (r - dstX), srcY + (b - dstY)],
    fr.atlasSize, vertexColor(rgb, alpha), fr.atlas);
}
