// spec: menu-fx
// Эффекты меню: всплеск награды и вспышка покупки (spec oracle/specs/menu-fx.md v2, правила 1–8). Числа — data/systems/menufx.json.

import { lengthdir_x, lengthdir_y } from './num/gmlmath.mjs';

export function makeMenuFx(doc, inputs, { textWidth, spriteSize }) {
  const c = doc.constants;
  const col = (id, name) => {
    const t = doc.tables[id];
    const i = t.columns.indexOf(name);
    return t.rows.map((r) => r[i]);
  };
  const outline = col('menu.labelOutline', 'dx').map((dx, i) => [dx, col('menu.labelOutline', 'dy')[i]]);
  const flairCols = col('menu.flairColors', 'color');
  const nsPerMs = BigInt(c['clock.nsPerMs']);
  const msOf = (timeNs) => timeNs / nsPerMs;
  const bursts = inputs.bursts.map((b) => ({ ...b, ms0: msOf(b.t0Ns) }));
  const flairs = inputs.flair.map((f) => ({ ...f, ms0: msOf(f.t0Ns) }));

  const blend = (mode) => ({ component: 'blend', mode });
  const sprite = (key, x, y, sx, sy, angle, color, alpha) =>
    ({ component: 'sprite', sprite: key, frame: 0, x, y, sx, sy, angle, color, alpha });

  // правило 1
  function rings(b, e) {
    const t = e / c['menu.ringLife'];
    const s = c['menu.ringScale0'] + c['menu.ringScaleGain'] * t;
    const k = 1 - t;
    return [
      blend('add'),
      sprite(c['menu.ringSprite'], b.cx, b.cy, s, s, 0, c['menu.ring1Color'], c['menu.ringAlpha'] * (k * k)),
      sprite(c['menu.ringSprite'], b.cx, b.cy, c['menu.ring2Scale'] * s, c['menu.ring2Scale'] * s, 0, c['menu.ring2Color'], c['menu.ringAlpha'] * (k * k * k)),
      blend('normal'),
    ];
  }

  // правила 2–4
  function particle(p, k, e, out) {
    const a = e < p.fadeAt ? 1 : 1 - (e - p.fadeAt) / c['menu.partFade'];
    if (a > 0) {
      const pt = p.path[k];
      if (!pt) return;
      const [x, y, scale, angle] = pt;
      out.push(sprite(p.key, x + c['menu.shadowDx'], y + c['menu.shadowDy'], scale, scale, angle, c['menu.shadowColor'], c['menu.shadowAlpha'] * a));
      out.push(sprite(p.key, x, y, scale, scale, angle, c['menu.partColor'], a));
      return;
    }
    if (!p.sparkAt) return;
    const bb = 1 - (e - p.fadeAt - c['menu.partFade']) / c['menu.sparkFade'];
    if (bb > 0) {
      const fr = Math.floor((1 - bb) * c['menu.sparkFrames']);
      out.push({ component: 'sprite', sprite: c['menu.sparkSprite'], frame: fr, x: p.sparkAt[0], y: p.sparkAt[1], sx: 1, sy: 1, angle: 0, color: c['menu.partColor'], alpha: bb });
    }
  }

  // правило 5
  function labels(b, e, out) {
    let w = 0;
    for (const l of b.labels) w = Math.max(w, textWidth(c['menu.labelFont'], l.text));
    const x = b.cx - (w + c['menu.labelPad']) / 2;
    const fadeFrom = c['menu.labelLife'] - c['menu.labelFade'];
    b.labels.forEach((l, j) => {
      const tau = e - (c['menu.labelDelay'] + c['menu.labelStep'] * j);
      if (!(tau >= 0 && tau < c['menu.labelLife'])) return;
      const alpha = tau < fadeFrom ? 1 : 1 - (tau - fadeFrom) / c['menu.labelFade'];
      const p = tau >= c['menu.labelPop'] ? 1 : tau * (c['menu.labelPopK'] - tau) / c['menu.labelPopDiv'];
      const u = 1 - tau / c['menu.labelLife'];
      const y = b.cy + c['menu.labelDy'] - c['menu.labelGap'] * j - c['menu.labelRise'] * (1 - u * u);
      const sc = p * c['menu.labelIconSize'] / spriteSize(l.key);
      out.push(sprite(l.key, x, y, sc, sc, 0, c['menu.partColor'], alpha));
      const text = (tx, ty, color) => ({
        component: 'text', font: c['menu.labelFont'], x: tx, y: ty, text: l.text, xscale: p, yscale: p,
        color, alpha, halign: c['menu.labelHalign'], valign: c['menu.labelValign'], snap: c['menu.labelSnap'],
      });
      for (const [dx, dy] of outline) out.push(text(x + c['menu.labelTextDx'] + dx, y + dy, c['menu.labelOutlineColor']));
      out.push(text(x + c['menu.labelTextDx'], y, c['menu.labelColor']));
    });
  }

  // правила 6–8
  function flairLeaves(f, e) {
    const t = e / c['menu.flairLife'];
    const [x1, y1, x2, y2] = f.rect;
    const out = [
      blend('add'),
      { component: 'rect', x1, y1, x2, y2, color: c['menu.flairColor'], alpha: c['menu.flairAlpha'] * (1 - t) },
      blend('normal'),
    ];
    const q = 1 - (1 - t) * (1 - t) * (1 - t);
    const cols = flairCols;
    for (let i = 0; i < c['menu.flairStars']; i++) {
      const di = c['menu.flairTheta0'] + c['menu.flairThetaStep'] * i + c['menu.flairTurn'];
      out.push(sprite(
        c['menu.flairSprite'],
        f.cx + lengthdir_x(c['menu.flairRx'] * q, di),
        f.cy + c['menu.flairDrop'] * t * t + lengthdir_y(c['menu.flairRy'] * q, di),
        c['menu.flairStarScale'], c['menu.flairStarScale'], di, cols[i % cols.length], 1 - t));
    }
    return out;
  }

  function frame({ k, timeNs }) {
    const ms = msOf(timeNs);
    const outB = [];
    for (const b of bursts) {
      if (b.ms0 > ms) continue;
      const e = Number(ms - b.ms0);
      if (e < c['menu.ringLife']) outB.push(...rings(b, e));
      for (const p of b.particles) particle(p, k, e, outB);
      labels(b, e, outB);
    }
    const outF = [];
    let last = null;
    for (const f of flairs) if (f.ms0 <= ms) last = f; // живёт только последняя покупка
    if (last) {
      const e = Number(ms - last.ms0);
      if (e < c['menu.flairLife']) outF.push({ call: last.call, leaves: flairLeaves(last, e) });
    }
    return { bursts: outB, flair: outF };
  }

  return { frame };
}
