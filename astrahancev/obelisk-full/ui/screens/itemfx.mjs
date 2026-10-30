// spec: item-gift-fx
// Слой эффекта применения предмета (этап 6.32b): листья ядра (core/itemfx.mjs) → вершины кита в порядке листьев;
// смена смешения вершин не имеет, а возвращается списком { at: число вершин на момент листа, mode }.
import { drawSprite, drawText, fillRect, rgbOf } from '../kit/prims.mjs';

export function makeItemFxLayer({ skin }) {
  function build(list, leaves) {
    const blends = [];
    for (const l of leaves) {
      if (l.component === 'blend') blends.push({ at: list.count, mode: l.mode });
      else if (l.component === 'sprite') drawSprite(list, skin, l.sprite, l.frame, l.x, l.y, l.sx, l.sy, rgbOf(l.color), l.alpha, l.angle);
      else if (l.component === 'text') {
        drawText(list, skin, { font: l.font, x: l.x, y: l.y, text: l.text, halign: l.halign, valign: l.valign, rgb: rgbOf(l.color), alpha: l.alpha, snap: l.snap, xscale: l.xscale, yscale: l.yscale });
      } else if (l.component === 'rect') fillRect(list, l.x1, l.y1, l.x2, l.y2, rgbOf(l.color), l.alpha);
    }
    return blends;
  }
  return { build };
}
