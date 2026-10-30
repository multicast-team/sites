// spec: hit-fx
// Слой удара (этап 6.30): кольцо, затем камни по порядку — подложка, тело с углом, значок, подпись (spec hit-fx, правила 4, 7, 8).
import { drawSprite, rgbOf } from '../kit/prims.mjs';
import { fillCircle } from '../kit/circle.mjs';
import { makeKit } from '../kit/components.mjs';

export function makeHitFxLayer({ skin, kitDoc, doc }) {
  const key = doc.constants['hit.labelStyleKey'];
  const c = doc.constants;
  const style = { font: c['hit.labelFont'], halign: c['hit.labelHalign'], valign: c['hit.labelValign'], color: c['hit.labelColor'], snap: c['hit.labelSnap'],
    shadow: { dx: c['hit.labelShadowDx'], dy: c['hit.labelShadowDy'], color: c['hit.labelShadowColor'] } };
  const kit = makeKit({ ...kitDoc, styles: { ...kitDoc.styles, [key]: style } }, skin);

  const sprite = (list, s, angle) => drawSprite(list, skin, s.sprite, s.frame, s.x, s.y, s.sx, s.sy, rgbOf(s.color), s.alpha, angle);

  /** out — результат frame() ядра { ring, rocks }. */
  function build(list, out) {
    const ring = out.ring;
    if (ring) fillCircle(list, ring.x, ring.y, ring.r, rgbOf(ring.color), ring.alpha);
    for (const r of out.rocks) {
      sprite(list, r.base, 0);
      sprite(list, r.body, r.body.angle);
      if (r.icon) sprite(list, r.icon, 0);
      if (r.label) kit.label(list, key, r.label.x, r.label.y, r.label.text, undefined, r.label.alpha);
    }
    return list;
  }
  return { build };
}
