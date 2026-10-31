// spec: sprite-layout
// (дополнение этапа 8.3 к ??-пункту п.2 «кадр с обрезкой»)
// Растянутый спрайт с nine-slice и обрезанным кадром (dst ≠ весь холст): по записям O (окно Upcoming меню испытаний, этап 8.3)
// куски рисуются только в пределах dst кадра — холст сжимается до dst: левый/верхний край сдвигается на dst.x/dst.y, правый/нижний —
// на (ширина − dst.x − dst.w)/(высота − dst.y − dst.h), края nine-slice уменьшаются на те же величины, середина та же.
// Кадр без обрезки — как drawSpriteStretched кита. Отдельный файл, чтобы не менять отпечатки экранов, которые кит уже использует.
import { drawSpriteStretched, cullRadius, culledByView } from './sprite.mjs';

export function drawSpriteStretchedTrim(list, skin, key, frame, x, y, w, h, rgb, alpha) {
  const s = skin.sprite(key);
  const fr = s.frames[frame];
  if (!fr) throw new Error(`кадр ${frame} спрайта ${key}`);
  const [dx, dy, dw, dh] = fr.dst;
  if (!s.nine || (dx === 0 && dy === 0 && dw === s.width && dh === s.height)) {
    drawSpriteStretched(list, skin, key, frame, x, y, w, h, rgb, alpha);
    return;
  }
  const r = s.width - dx - dw, b = s.height - dy - dh;
  const n = s.nine;
  const v = { ...s, width: dw, height: dh, origin: [0, 0],
    nine: { ...n, left: n.left - dx, top: n.top - dy, right: n.right - r, bottom: n.bottom - b },
    frames: s.frames.map((f) => ({ ...f, dst: [0, 0, f.dst[2], f.dst[3]] })) };
  const vs = { sprite: (k) => (k === key ? v : skin.sprite(k)) };
  drawSpriteStretched(list, vs, key, frame, x + dx, y + dy, w - dx - r, h - dy - b, rgb, alpha);
}

/**
 * Отсечение вызова «спрайт» окном вида для nine-slice с обрезанным кадром, который экран рисует через drawSpriteStretchedTrim:
 * то же правило, что у целого спрайта (spec sprite-layout п.6 v9 — cullRadius / culledByView кита). true — вызов отсечён.
 */
export function spriteCulled(list, skin, key, x, y, sx, sy) {
  const F = Math.fround;
  const culled = culledByView(list, F(x), F(y), cullRadius(skin.sprite(key), F(sx), F(sy)));
  if (culled) list.culled++;
  return culled;
}
