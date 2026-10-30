// spec: sprite-layout, text-layout, shape-layout
// Таблица вёрстки (этап 6.4): дерево компонентов data/ui/drafts/<экран>.json → примитивы кита (ui/kit/prims.mjs).
// Черновики собраны разовым конвертером из записей O (он живёт в oracle/ и в рантайм не попадает), разложены на компоненты:
//   sprite {sprite, frame, x, y, sx, sy, color, alpha}, text {font, x, y, text|value, halign, valign, color, alpha, sep, width,
//   xscale, yscale, colors, snap}, stretched {sprite, frame, x, y, w, h, color, alpha} (6.15, растянутый спрайт: область w × h),
//   rect {x1, y1, x2, y2, outline, color, alpha, colors [4 × '#rrggbb' — углы лево-верх, право-верх, право-низ, лево-низ]}, line {x1, y1, x2, y2, w, color, alpha},
//   group {x, y, children}, repeat {x, y, step {x, y}, count, item [компоненты], items [{номер ребёнка: замены полей}]},
//   todo {what} — что кит пока не рисует (часть спрайта без ключа, поверхность, линии с цветом концов).
// Координаты детей group/repeat — от якоря; якорь копии i: (x + step.x·i, y + step.y·i).
import { drawSprite, drawSpriteStretched, drawText, fillRect, lineWidth, rgbOf } from './prims.mjs';

const ALIGN_H = { left: 0, center: 1, right: 2 };
const ALIGN_V = { top: 0, middle: 1, bottom: 2 };
const POS = { sprite: ['x', 'y'], stretched: ['x', 'y'], text: ['x', 'y'], rect: ['x1', 'y1', 'x2', 'y2'], line: ['x1', 'y1', 'x2', 'y2'] };

/** Сдвиг листа на (ox, oy): x-поля + ox, y-поля + oy. */
function shifted(leaf, ox, oy) {
  const out = { ...leaf };
  for (const k of POS[leaf.component] || []) out[k] = (k[0] === 'x' ? ox : oy) + leaf[k];
  return out;
}

/** Замена полей копии ряда: текст ключом и текст значением взаимно исключают друг друга. */
function merge(ch, over) {
  const out = { ...ch, ...over };
  if ('value' in over && !('text' in over)) delete out.text;
  if ('text' in over && !('value' in over)) delete out.value;
  return out;
}

/**
 * Дерево → листья с абсолютными координатами, в порядке рисования. strings — словарь текстов (t.* → строка);
 * raw = true — ключи текстов не подставляются.
 */
export function expandTable(node, strings = {}, ox = 0, oy = 0, out = [], raw = false) {
  const c = node.component;
  if (c === 'group') {
    const gx = ox + (node.x ?? 0), gy = oy + (node.y ?? 0);
    for (const ch of node.children) expandTable(ch, strings, gx, gy, out, raw);
  } else if (c === 'repeat') {
    for (let i = 0; i < node.count; i++) {
      const ax = ox + (node.x + node.step.x * i), ay = oy + (node.y + node.step.y * i);
      const over = node.items?.[i] || {};
      node.item.forEach((ch, k) => expandTable(over[k] ? merge(ch, over[k]) : ch, strings, ax, ay, out, raw));
    }
  } else {
    const leaf = shifted(node, ox, oy);
    if (c === 'text' && leaf.text !== undefined && !raw) {
      if (!(leaf.text in strings)) throw new Error(`таблица: нет текста ${leaf.text}`);
      leaf.value = strings[leaf.text];
    }
    out.push(leaf);
  }
  return out;
}

/** Один лист → вершины в list. Возвращает false, если лист кит не рисует (todo, рамка и линия без ширины — режим линий). */
export function drawLeaf(list, skin, n) {
  const rgb = rgbOf(n.color ?? '#ffffff'), alpha = n.alpha ?? 1;
  switch (n.component) {
    case 'sprite':
      drawSprite(list, skin, n.sprite, n.frame ?? 0, n.x, n.y, n.sx ?? 1, n.sy ?? 1, rgb, alpha);
      return true;
    case 'stretched':
      drawSpriteStretched(list, skin, n.sprite, n.frame ?? 0, n.x, n.y, n.w, n.h, rgb, alpha);
      return true;
    case 'text':
      drawText(list, skin, { font: n.font, x: n.x, y: n.y, text: n.value, halign: ALIGN_H[n.halign ?? 'left'], valign: ALIGN_V[n.valign ?? 'top'],
        rgb, alpha, snap: n.snap ?? true, xscale: n.xscale ?? 1, yscale: n.yscale ?? 1,
        ...(n.colors ? { colours: n.colors.map(rgbOf) } : {}), ...(n.sep !== undefined ? { sep: n.sep } : {}), ...(n.width !== undefined ? { width: n.width } : {}) });
      return true;
    case 'rect':
      if (n.outline) return false;
      fillRect(list, n.x1, n.y1, n.x2, n.y2, rgb, alpha, n.colors?.map(rgbOf));
      return true;
    case 'line':
      if (n.w === undefined) return false;
      lineWidth(list, n.x1, n.y1, n.x2, n.y2, n.w, rgb, alpha);
      return true;
    default:
      return false;
  }
}

/** Вся таблица → вершины. Возвращает число листьев, которые кит не нарисовал. */
export function renderTable(list, skin, doc, strings = {}) {
  let skipped = 0;
  for (const leaf of expandTable(doc.root, strings)) if (!drawLeaf(list, skin, leaf)) skipped++;
  return skipped;
}
