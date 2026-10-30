// spec: input-layout
// Ввод интерфейса (этап 6.2): касание в px окна → координаты указателя; проверка попадания в прямоугольник.
// Правила — спека oracle/specs/input-layout.md; код написан по ним.

/** Слой интерфейса не зависит от окна: всегда 500×960 (правило 1). */
export const GUI = { w: 500, h: 960 };

const bad = (v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0;

/**
 * Касание (px, py) в окне win = { w, h } → { raw, gui, room }.
 * raw — целая часть касания (правило 2); gui — raw, переведённый в слой 500×960 и округлённый вниз (правило 3);
 * room = gui, сдвига вида нет (правило 4).
 */
export function pointer(px, py, win) {
  if (bad(px) || bad(py)) throw new Error(`касание ${px}, ${py}`);
  if (!win || !(win.w > 0) || !(win.h > 0)) throw new Error('окно: нужны w>0 и h>0');
  const rx = Math.floor(px), ry = Math.floor(py);                     // правило 2
  const gx = Math.floor((rx * GUI.w) / win.w);                        // правило 3
  const gy = Math.floor((ry * GUI.h) / win.h);
  return { raw: [rx, ry], gui: [gx, gy], room: [gx, gy] };            // правило 4
}

/**
 * Попадание g = [gx, gy] в область (a, b, c, d): a ≤ gx ≤ b и c ≤ gy ≤ d (правило 5).
 * Границы включаются, не округляются; перевёрнутая область не попадает никогда.
 */
export function hitArea(g, a, b, c, d) {
  return a <= g[0] && g[0] <= b && c <= g[1] && g[1] <= d;
}
