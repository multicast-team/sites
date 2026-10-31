// spec: sprite-layout, text-layout, shape-layout
// Примитивы UI-кита (этап 4.1): спрайт, спрайт с nine-slice, растровый текст, прямоугольник, линия с шириной.
// Каждый примитив добавляет треугольники в список вершин (VertexList) в том виде, в каком их отдаёт растру игра:
// позиция float32, текстурные координаты float32 (пиксель атласа / размер атласа), цвет RGBA unorm8.
// Правила раскладки — спеки oracle/specs/{sprite-layout,text-layout,shape-layout}.md; код написан по ним.

const f = Math.fround;

/** '#rrggbb' → [r, g, b]. */
export function rgbOf(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`цвет ${hex}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
/** Альфа → байт: вниз, альфа > 1 даёт 255 (спека text-layout п.6, shape-layout v3). */
export const alphaByte = (a) => Math.floor(f(Math.min(a, 1)) * 255);
/** Альфа → байт: к ближайшему, альфа > 1 даёт 255 (спека text-layout п.6а: текст с цветами углов и альфой аргументом). */
export const alphaByteRound = (a) => Math.round(f(Math.min(a, 1)) * 255);

/**
 * Список вершин; atlas −1 — фигура без текстуры (белая текстура, uv не важны).
 * view — окно вида [лево, верх, право, низ] для отсечения целых спрайтов (spec sprite-layout п.4).
 */
export class VertexList {
  // cullPad — запас радиуса отсечения спрайтов sprite-layout v2; с v9 (этап 8.3) правило отсечения его не читает (п.6: ⌈ρ⌉, окно полуоткрытое)
  constructor(view = [0, 0, 500, 960], cullPad = 0.5) { this.view = view; this.cullPad = cullPad; this.culled = 0; this.x = []; this.y = []; this.u = []; this.v = []; this.rgba = []; this.atlas = []; }
  get count() { return this.x.length; }
  push(x, y, u, v, rgba, atlas) {
    this.x.push(f(x)); this.y.push(f(y)); this.u.push(f(u)); this.v.push(f(v)); this.rgba.push(rgba); this.atlas.push(atlas);
  }
  /** Квадрат 6 вершинами в заданном порядке углов: углы — [x, y, u, v], order — индексы углов 0..3 (лв, пв, пн, лн). */
  quad(c, order, rgbaOf, atlas) {
    for (const k of order) this.push(c[k][0], c[k][1], c[k][2], c[k][3], rgbaOf(k), atlas);
  }
}

const ORDER_SPRITE = [0, 1, 2, 2, 3, 0];   // лв, пв, пн, пн, лн, лв — целый кадр и текст

const packRgba = (rgb, a) => ((rgb[0] | (rgb[1] << 8) | (rgb[2] << 16)) >>> 0) + (a * 0x1000000);

// Спрайт (кадр и nine-slice) — ui/kit/sprite.mjs: независимая реализация по spec sprite-layout (4.1, раунд исправлений).
export { drawSprite, drawSpriteStretched, drawSpritePart } from './sprite.mjs';

// ---------------- текст (spec text-layout) ----------------

/**
 * Перенос строки по словам на ширине width (spec text-layout п. 8 и 8а, v9 — этап 8.3, записи O challenges83). Слова — куски между
 * одиночными пробелами (пробелы подряд дают пустые слова). Слово, с которым строка (вместе с соединяющим пробелом) шире width,
 * начинает новую строку: соединяющий пробел пропадает, хвост пробелов законченной строки не рисуется и в ширину не входит.
 * Пустое слово тоже начинает строку — тогда следующий пробел остаётся в её начале («And» + 15 пробелов + «Let» → « Let…»).
 */
export function wrapWords(font, line, width) {
  const words = line.split(' ');
  const out = [];
  const w = (s) => [...s].reduce((a, ch) => a + (font.glyphs.get(ch.codePointAt(0))?.advance || 0), 0);
  const trim = (s) => s.replace(/ +$/, '');
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = cur + ' ' + words[i];
    if (trim(cur) !== '' && w(next) > width) { out.push(trim(cur)); cur = words[i]; } else cur = next;
  }
  out.push(cur);
  return out;
}

/**
 * Текст: { font, x, y, text, halign 0|1|2, valign 0|1|2, rgb, alpha, snap, xscale, yscale, colours?: [rgb×4], sep?, width?, alphaRound? }.
 * alphaRound = true — альфа вершин к ближайшему (п.6а), иначе вниз (п.6).
 * snap = true — сдвиг выравнивания округляется вниз (обычный текст); false — дробный (текст с масштабом и цветами углов).
 */
export function drawText(list, skin, p) {
  const font = skin.font(p.font);
  let lines = String(p.text).split('\n');
  if (p.width !== undefined && p.width >= 0) lines = lines.flatMap((ln) => wrapWords(font, ln, p.width));
  const ext = p.sep !== undefined && p.sep >= 0;
  const step = ext ? p.sep : font.lineHeight;
  const SX = f(p.xscale ?? 1), SY = f(p.yscale ?? 1);
  // высота блока для сдвига по вертикали — spec text-layout п.3г (v8, уточняет п.3в): у «ext» (sep ≥ 0) при любом n ≥ 1 (n − 1)·sep + line_height шрифта (у одной строки line_height, а не sep); у обычного вывода n·шаг (п.2); шаг между строками на экране не меняется
  // половина блока при valign middle — п.3б (v6): у обычного вывода (без sep) со snap — n·⌊шаг/2⌋ (а не ⌊n·шаг/2⌋); «ext» и snap = false — как раньше
  // п.3д (v9, этап 8.3): у «ext» без округления (snap = false, текст с масштабом) и n ≥ 2 строк H = n · sep (П: «Complete\nChallenge»
  // size12, lh 18, sep 21, масштаб k — верх первой строки y − 21·k, а не y − 19,5·k); у одной строки и со snap — п.3г
  const H = ext ? (p.snap === false && lines.length > 1 ? lines.length * step : (lines.length - 1) * step + font.lineHeight) : lines.length * step;
  const half = (v) => (p.snap ? Math.floor(v / 2) : v / 2);
  const halfBlock = !ext && p.snap ? lines.length * Math.floor(step / 2) : half(H);
  const dy = p.valign === 1 ? -halfBlock : p.valign === 2 ? -H : 0;
  const [aw, ah] = font.atlasSize;
  const alpha = (p.alphaRound ? alphaByteRound : alphaByte)(Math.min(p.alpha ?? 1, 1));   // spec text-layout п.6: альфа > 1 даёт 255
  let top = f(f(p.y) + f(dy * SY));
  for (const line of lines) {
    const chars = [...line].map((ch) => font.glyphs.get(ch.codePointAt(0))).filter(Boolean);   // нет глифа — пропуск (??)
    const w = chars.reduce((a, g) => a + g.advance, 0);
    const dx = p.halign === 1 ? -half(w) : p.halign === 2 ? -w : 0;
    let pen = f(f(p.x) + f(dx * SX));
    chars.forEach((g, k) => {
      const l = f(f(pen + f(g.offset * SX)) - SX), r = f(l + f((g.w + 2) * SX));
      const t = f(top - SY), b = f(t + f((g.h + 2) * SY));
      const gx = font.pageX + g.x - 1, gy = font.pageY + g.y - 1;
      const u0 = f(gx / aw), v0 = f(gy / ah), u1 = f((gx + g.w + 2) / aw), v1 = f((gy + g.h + 2) / ah);
      let colOf;
      if (p.colours) {
        const n = chars.length, mix = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
        const [c1, c2, c3, c4] = p.colours, tl = k / n, tr = (k + 1) / n;
        const cs = [mix(c1, c2, tl), mix(c1, c2, tr), mix(c4, c3, tr), mix(c4, c3, tl)];
        colOf = (i) => packRgba(cs[i], alpha);
      } else {
        const c = packRgba(p.rgb, alpha);
        colOf = () => c;
      }
      list.quad([[l, t, u0, v0], [r, t, u1, v0], [r, b, u1, v1], [l, b, u0, v1]], ORDER_SPRITE, colOf, font.atlas);
      pen = f(pen + f(g.advance * SX));
    });
    top = f(top + f(step * SY));
  }
}

// ---------------- фигуры (spec shape-layout) ----------------

const farEdge = (v) => (Number.isInteger(v) ? f(f(v) + f(1.01)) : f(f(v) + 1));

/**
 * Закрашенный прямоугольник (края включительно, spec shape-layout п.2). colors — 4 цвета [r, g, b] углов лево-верх, право-верх,
 * право-низ, лево-низ (v4, градиент); без него все углы — rgb. Альфа общая.
 */
export function fillRect(list, x1, y1, x2, y2, rgb, alpha, colors) {
  const a = alphaByte(alpha);
  const cols = (colors ?? [rgb, rgb, rgb, rgb]).map((c) => packRgba(c, a));
  const l = f(x1), t = f(y1), r = farEdge(x2), b = farEdge(y2);
  list.quad([[l, t, 0, 0], [r, t, 0, 0], [r, b, 0, 0], [l, b, 0, 0]], ORDER_SPRITE, (k) => cols[k], -1);
}

/**
 * Закрашенный скруглённый прямоугольник (spec shape-layout п.7а v2, п.2, п.8): 4 угла по N/4 + 1 точек,
 * треугольники (центр, p_j, p_j+1) по замкнутому контуру. Радиусы по осям — xrad / 2, yrad / 2. Рамку не рисует.
 */
export function fillRoundRect(list, x1, y1, x2, y2, xrad, yrad, rgb, alpha, n = 24) {
  const col = packRgba(rgb, alphaByte(alpha));
  const X1 = f(f(x1) + 1), Y1 = f(f(y1) + 1), X2 = farEdge(x2), Y2 = farEdge(y2);
  const rx = f(xrad / 2), ry = f(yrad / 2);
  const cx = f((X1 + X2) / 2), cy = f((Y1 + Y2) / 2);
  const hx = f((X2 - X1) / 2), hy = f((Y2 - Y1) / 2);
  const sxs = [1, -1, -1, 1], sys = [1, 1, -1, -1];
  const q = n / 4, twoPi = f(2 * Math.PI);
  const pts = [];
  for (let k = 0; k < 4; k++) {
    const ox = f(cx + sxs[k] * f(hx - rx)), oy = f(cy + sys[k] * f(hy - ry));
    for (let i = k * q; i <= k * q + q; i++) {
      const a = f(f(i * twoPi) / n);
      pts.push([f(ox + f(rx * f(Math.cos(a)))), f(oy + f(ry * f(Math.sin(a))))]);
    }
  }
  for (let j = 0; j < pts.length; j++) {
    const p = pts[j], s = pts[(j + 1) % pts.length];
    list.push(cx, cy, 0, 0, col, -1);
    list.push(p[0], p[1], 0, 0, col, -1);
    list.push(s[0], s[1], 0, 0, col, -1);
  }
}

/**
 * Закрашенный круг (spec shape-layout п.6, п.8): веер из n треугольников (центр, точка i, точка i+1), 3n вершин,
 * центр (x + 1, y + 1), точка i = центр + r · (cos a_i, sin a_i), a_i = i · 2π / n; цвет центра и края — rgb.
 */
export function fillCircle(list, x, y, r, rgb, alpha, n = 24) {
  const col = packRgba(rgb, alphaByte(alpha));
  const cx = f(f(x) + 1), cy = f(f(y) + 1), rr = f(r), twoPi = f(2 * Math.PI);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = f(f(i * twoPi) / n);
    pts.push([f(cx + f(rr * f(Math.cos(a)))), f(cy + f(rr * f(Math.sin(a))))]);
  }
  for (let i = 0; i < n; i++) {
    const p = pts[i], s = pts[(i + 1) % n];
    list.push(cx, cy, 0, 0, col, -1);
    list.push(p[0], p[1], 0, 0, col, -1);
    list.push(s[0], s[1], 0, 0, col, -1);
  }
}

/** Линия с шириной w (spec shape-layout п.5): концы +1, нормаль · w/2; нулевая длина — пусто. */
export function lineWidth(list, x1, y1, x2, y2, w, rgb, alpha) {
  const col = packRgba(rgb, alphaByte(alpha));
  const ax = f(f(x1) + 1), ay = f(f(y1) + 1), bx = f(f(x2) + 1), by = f(f(y2) + 1);
  const len = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
  if (!(len > 0)) return;
  const nx = f(f(-(by - ay) / len) * f(w / 2)), ny = f(f((bx - ax) / len) * f(w / 2));
  const pts = [[f(ax + nx), f(ay + ny)], [f(bx + nx), f(by + ny)], [f(bx - nx), f(by - ny)], [f(ax - nx), f(ay - ny)]];
  for (const k of [0, 1, 2, 2, 3, 0]) list.push(pts[k][0], pts[k][1], 0, 0, col, -1);
}
