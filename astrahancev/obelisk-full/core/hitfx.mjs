// spec: hit-fx
// Удар по камням: кольцо удара, усиление, встряска тела, альфа подписи (spec oracle/specs/hit-fx.md, правила 1–8). Числа — data/systems/hitfx.json.

export function makeHitFx(doc, inputs) {
  const c = doc.constants;
  const life = c['hit.ringLife'];
  const boostMax = c['hit.boostMax'];
  const ring = inputs.ring || [];
  const boost = inputs.boost || [];
  const blueHalf = inputs.blueHalf || {};
  const shake = inputs.shake || [];
  const label = inputs.label || [];

  /** Последнее событие с frame ≤ k (события по возрастанию кадра). */
  function lastAt(events, k, pick = (e) => e.frame) {
    let found = null;
    for (const e of events) {
      if (pick(e) > k) break;
      found = e;
    }
    return found;
  }

  const hex2 = (v) => v.toString(16).padStart(2, '0');

  // правило 3: цвет кольца по счётчику усиления
  function ringColor(k, cnt) {
    if (cnt === 0) return c['hit.ringColor'];
    if (cnt === boostMax) return c['hit.ringBoostColor'];
    let b = 255 * (boostMax - cnt) / boostMax;
    if (!Number.isInteger(b)) {
      b = blueHalf[k];
      if (b === undefined) throw new Error(`hitfx: кадр ${k}: нет синего при половинке`);
    }
    return `#ffff${hex2(b)}`;
  }

  // правила 1–4
  function ringAt(k, world) {
    const hit = lastAt(ring, k);
    if (!hit) return null;
    const n = k - hit.frame;
    if (!(n < life || (n === life && hit.tail))) return null;
    if (!world.ringAt) throw new Error(`hitfx: кадр ${k}: кольцо рисуется, а места нет`);
    const kb = lastAt(boost, k, (e) => e);
    const cnt = kb === null ? 0 : Math.max(0, boostMax - (k - kb));
    return {
      x: world.ringAt[0], y: world.ringAt[1], r: c['hit.ringRadius'],
      color: ringColor(k, cnt),
      alpha: c['hit.ringStep'] * (life - n) * (1 + cnt / c['hit.boostAlphaDiv']),
    };
  }

  // правило 5
  function angleOf(k, id) {
    let found = null;
    for (const e of shake) {
      if (e.frame > k) break;
      if (e.rock === id) found = e;
    }
    return found ? Math.max(0, found.angle - (k - found.frame)) : 0;
  }

  // правило 6
  function labelAlpha(k, id) {
    let found = null;
    for (const e of label) {
      if (e.frame > k) break;
      if (e.rock === id) found = e;
    }
    if (!found) throw new Error(`hitfx: кадр ${k}: у камня ${id} есть подпись, а установки не было`);
    return c['hit.labelStart'] - (k - found.frame + 1) / c['hit.labelFrames'];
  }

  function frame(k, world) {
    return {
      ring: ringAt(k, world),
      rocks: world.rocks.map((r) => ({
        id: r.id,
        base: r.base,
        body: { ...r.body, angle: angleOf(k, r.id) },
        icon: r.icon,
        label: r.label ? { ...r.label, alpha: labelAlpha(k, r.id) } : null,
      })),
    };
  }

  return { frame };
}
