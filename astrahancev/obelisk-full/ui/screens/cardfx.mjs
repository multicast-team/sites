// spec: card-fanfare
// Слой анимации золочения карты (этап 8.13b): листья ядра (core/cardfx.mjs, makeCardFanfare) → вершины кита в порядке листьев;
// смена смешения вершин не имеет, а возвращается списком { at: число вершин на момент листа, mode }.
import { alphaByte, drawSprite, drawText, fillRect, rgbOf } from '../kit/prims.mjs';

export function makeCardFanfareLayer({ skin }) {
  function build(list, leaves) {
    const blends = [];
    for (const l of leaves) {
      if (l.component === 'blend') blends.push({ at: list.count, mode: l.mode });
      else if (l.component === 'sprite') drawSprite(list, skin, l.sprite, l.frame, l.x, l.y, l.sx, l.sy, rgbOf(l.color), l.alpha, l.angle);
      else if (l.component === 'text') {
        const p = { font: l.font, x: l.x, y: l.y, text: l.text, halign: l.halign, valign: l.valign, alpha: l.alpha, snap: l.snap, xscale: l.xscale, yscale: l.yscale };
        if (l.colors) drawText(list, skin, { ...p, colours: l.colors.map(rgbOf), alphaRound: !!l.alphaRound });
        else drawText(list, skin, { ...p, rgb: rgbOf(l.color) });
      } else if (l.component === 'rect') fillRect(list, l.x1, l.y1, l.x2, l.y2, rgbOf(l.color), l.alpha);
      else if (l.component === 'tris') {
        for (const [x, y, color, alpha] of l.vertices) {
          const [r, g, b] = rgbOf(color);
          list.push(x, y, 0, 0, ((r | (g << 8) | (b << 16)) >>> 0) + alphaByte(alpha) * 0x1000000, -1);
        }
      }
    }
    return blends;
  }
  return { build };
}
