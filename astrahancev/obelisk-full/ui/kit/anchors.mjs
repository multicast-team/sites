// spec: input-layout
// API якорей интерфейса (этап 6.19, долг 6.2): вёрстка живёт в слое интерфейса 500×960 при любом окне (правило 1 спеки
// oracle/specs/input-layout.md). Окно влияет только на перевод слоя в пиксели окна (вывод) и касания в слой (ввод, правила 2–3).
// Верхний безопасный отступ (вырез экрана, safe inset сверху) сдвигает вниз верхние якоря (topLeft, top, topRight) на safeTop px
// слоя; нижние якоря на месте (по кадрам O 4.3 и 6.19: меню и HUD ниже на 64 при вырезе 64 px окна 500×960 / 128 px окна
// 1000×1920, нижняя панель на месте). Средние якоря (left, center, right) отступ не двигает — ?? (не наблюдалось).
//
//   const layer = makeLayer({ w: 1000, h: 1920 }, { safeTop: safeTopOfInset(128, { w: 1000, h: 1920 }) });
//   layer.point('topLeft', 28, 80)         → [28, 144]  — точка вёрстки в слое (от окна не зависит, от выреза — да)
//   layer.toWindow([250, 480])            → [500, 960] — точка слоя в px окна (масштаб окна к слою)
//   layer.touch(px, py)                   → { raw, gui, room } — касание окна в слой (input.mjs)
//   layer.hit([a, b, c, d], px, py)       → попало ли касание окна в область слоя (правило 5)
import { GUI, pointer, hitArea } from './input.mjs';

/** Именованные якоря слоя (имена — схема ui-screen, поле anchor): доли ширины и высоты слоя 500×960. */
export const ANCHORS = Object.freeze({
  topLeft: [0, 0], top: [0.5, 0], topRight: [1, 0],
  left: [0, 0.5], center: [0.5, 0.5], right: [1, 0.5],
  bottomLeft: [0, 1], bottom: [0.5, 1], bottomRight: [1, 1],
});

const checkWin = (win) => {
  if (!win || !Number.isInteger(win.w) || !Number.isInteger(win.h) || win.w <= 0 || win.h <= 0) throw new Error('окно: нужны целые w>0 и h>0');
};

const TOP_ROW = new Set(['topLeft', 'top', 'topRight']);

/** Якорь → точка слоя. Слой не зависит от окна (правило 1), поэтому и точка от окна не зависит; safeTop — верхний отступ слоя. */
export function anchorPoint(name, dx = 0, dy = 0, safeTop = 0) {
  const a = ANCHORS[name];
  if (!a) throw new Error(`нет якоря ${name}`);
  return [a[0] * GUI.w + dx, a[1] * GUI.h + dy + (TOP_ROW.has(name) ? safeTop : 0)];
}

/** Вырез сверху в px окна → отступ в px слоя (масштаб слоя к окну по y). П для 0 и 64 px слоя (вырез 64 при 500×960 и 128 при
 *  1000×1920); другие значения и округление дробного отступа — ??. */
export function safeTopOfInset(insetPx, win) {
  checkWin(win);
  return (insetPx * GUI.h) / win.h;
}

/**
 * Слой интерфейса для окна win = { w, h } (px окна) и верхнего отступа safeTop (px слоя): { win, gui, safeTop, scale, point, toWindow, touch, hit }.
 * gui — всегда 500×960; scale — px окна на px слоя по x и y.
 */
export function makeLayer(win = GUI, { safeTop = 0 } = {}) {
  checkWin(win);
  if (typeof safeTop !== 'number' || !Number.isFinite(safeTop) || safeTop < 0) throw new Error(`safeTop ${safeTop}`);
  const scale = [win.w / GUI.w, win.h / GUI.h];
  return Object.freeze({
    win: { w: win.w, h: win.h },
    gui: { w: GUI.w, h: GUI.h },
    safeTop,
    scale,
    point: (name, dx = 0, dy = 0) => anchorPoint(name, dx, dy, safeTop),
    toWindow: ([x, y]) => [x * scale[0], y * scale[1]],
    touch: (px, py) => pointer(px, py, win),
    hit: ([a, b, c, d], px, py) => hitArea(pointer(px, py, win).gui, a, b, c, d),
  });
}
