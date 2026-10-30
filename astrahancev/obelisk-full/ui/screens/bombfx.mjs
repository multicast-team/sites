// spec: bomb-fx
// Слой эффекта бомбы (этап 6.29b): листья экземпляров ядра (core/bombfx.mjs) → вершины кита в порядке листьев;
// смена смешения вершин не имеет, а возвращается списком { at: число вершин на момент листа, mode }.
import { drawSprite, rgbOf } from '../kit/prims.mjs';

export function makeBombFxLayer({ skin }) {
  function build(list, instances) {
    const blends = [];
    for (const inst of instances) {
      for (const l of inst.leaves) {
        if (l.component === 'blend') blends.push({ at: list.count, mode: l.mode });
        else drawSprite(list, skin, l.sprite, l.frame, l.x, l.y, l.sx, l.sy, rgbOf(l.color), l.alpha, l.angle);
      }
    }
    return blends;
  }
  return { build };
}
