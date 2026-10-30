// spec: item-gift-fx
// Эффекты 2.2.50: применение предмета (часть A) и окно подарка (часть B) (spec oracle/specs/item-gift-fx.md v2). Числа — data/systems/itemfx.json.

import { lengthdir_x, lengthdir_y } from './num/gmlmath.mjs';

function helpers(doc) {
  const c = doc.constants;
  const nsPerMs = BigInt(c['clock.nsPerMs']);
  const nsPerUs = BigInt(c['clock.nsPerUs']);
  return {
    c,
    msOf: (t) => t / nsPerMs,
    usOf: (t) => t / nsPerUs,
    col: (id, name) => {
      const t = doc.tables[id];
      const i = t.columns.indexOf(name);
      return t.rows.map((r) => r[i]);
    },
    blend: (mode) => ({ component: 'blend', mode }),
    sprite: (key, frame, x, y, sx, sy, angle, color, alpha) =>
      ({ component: 'sprite', sprite: key, frame, x, y, sx, sy, angle, color, alpha }),
  };
}

export function makeItemFx(doc, inputs) {
  const { c, msOf, col, blend, sprite } = helpers(doc);
  const dys = col('item.streakOutline', 'dy');
  const outline = col('item.streakOutline', 'dx').map((dx, i) => [dx, dys[i]]);
  const uses = inputs.uses.map((u) => ({ ...u, ms0: msOf(u.t0Ns) }));
  const streak = inputs.streak ? { ...inputs.streak, ms0: msOf(inputs.streak.t0Ns) } : null;

  // правило 1
  function rings(u, e) {
    const t = e / c['item.ringLife'];
    const s = c['item.ringScale0'] + c['item.ringScaleGain'] * t;
    return [
      blend('add'),
      sprite(c['item.ringSprite'], 0, c['item.x'], c['item.y'], s, s, 0, u.ringColor, c['item.ring1Alpha'] * u.mult * (1 - t) * (1 - t)),
      sprite(c['item.ringSprite'], 0, c['item.x'], c['item.y'], c['item.ring2Scale'] * s, c['item.ring2Scale'] * s, 0, c['item.ring2Color'], c['item.ring2Alpha'] * u.mult * (1 - t) * (1 - t) * (1 - t)),
      blend('normal'),
    ];
  }

  // правила 2–4
  function element(u, k, e, out) {
    const a = e < c['item.fadeAt'] ? 1 : 1 - (e - c['item.fadeAt']) / c['item.fade'];
    if (a >= 0) {
      const pt = u.path[k];
      if (!pt) return;
      const [x, y, scale, angle] = pt;
      out.push(sprite(u.sprite, u.frame, x + c['item.shadowDx'], y + c['item.shadowDy'], scale, scale, angle, c['item.shadowColor'], c['item.shadowAlpha'] * a));
      out.push(sprite(u.sprite, u.frame, x, y, scale, scale, angle, c['item.partColor'], a));
      return;
    }
    if (!u.sparkAt) return;
    const b = 1 - (e - c['item.fadeAt'] - c['item.fade']) / c['item.sparkFade'];
    if (b >= 0) {
      const fr = Math.min(c['item.sparkFrames'] - 1, Math.floor((1 - b) * c['item.sparkFrames']));
      out.push(sprite(c['item.sparkSprite'], fr, u.sparkAt[0], u.sparkAt[1], 1, 1, 0, c['item.sparkColor'], b));
    }
  }

  // правило 5
  function streakLeaves(s, e, out) {
    const a = e < s.fadeAt ? 1 : 1 - (e - s.fadeAt) / c['item.streakFade'];
    if (!(a >= 0)) return;
    const sc = s.base * (1 + c['item.streakPop'] * Math.max(0, 1 - e / c['item.streakPopMs']));
    const y = c['item.streakY'] - c['item.streakRise'] * (1 - a);
    const text = (x, ty, color) => ({
      component: 'text', font: c['item.streakFont'], x, y: ty, text: s.text, xscale: sc, yscale: sc,
      color, alpha: a, halign: 1, valign: 1, snap: false,
    });
    for (const [dx, dy] of outline) out.push(text(c['item.x'] + dx, y + dy, c['item.streakOutlineColor']));
    out.push(text(c['item.x'], y, c['item.streakColor']));
  }

  function frame({ k, timeNs }) {
    const ms = msOf(timeNs);
    const active = uses.filter((u) => u.t0Ns <= timeNs);
    const fx = [];
    if (active.length) {
      const last = active[active.length - 1];
      const e = Number(ms - last.ms0);
      if (e < c['item.ringLife']) fx.push(...rings(last, e));
      for (let i = active.length - 1; i >= 0; i--) element(active[i], k, Number(ms - active[i].ms0), fx);
    }
    const st = [];
    if (streak && streak.t0Ns <= timeNs) streakLeaves(streak, Number(ms - streak.ms0), st);
    return { fx, streak: st };
  }

  return { frame };
}

export function makeGiftFx(doc, inputs) {
  const { c, msOf, usOf, col, blend, sprite } = helpers(doc);
  const sparkCols = col('gift.sparkColors', 'color');
  const opens = inputs.opens;
  const back = (x) => 1 + (c['gift.backC1'] + 1) * (x - 1) * (x - 1) * (x - 1) + c['gift.backC1'] * (x - 1) * (x - 1);
  const rect = (x1, y1, x2, y2, color, alpha) => ({ component: 'rect', x1, y1, x2, y2, color, alpha });
  const halves = (x, y, sx, sy, angle, alpha) => [
    sprite(c['gift.boxSprite'], 2, x, y, sx, sy, angle, c['gift.white'], alpha),
    sprite(c['gift.boxSprite'], 1, x, y, sx, sy, angle, c['gift.white'], alpha),
  ];

  function frame({ k, timeNs }) {
    let w = null;
    for (const o of opens) if (o.k0 <= k) w = o;
    if (!w) return null;
    const tau = Number(usOf(timeNs) - usOf(w.t0Ns)) / c['gift.usPerMs'];
    const P = c['gift.popMs'];
    const Q = c['gift.shakeMs'];
    const B = P + Q;
    const out = [rect(0, 0, c['gift.dimSize'], c['gift.dimSize'], c['gift.dimColor'], c['gift.dimAlpha'])];
    if (tau < P) {
      const s = c['gift.boxScale'] * back(tau / P);
      out.push(...halves(c['gift.x'], c['gift.boxY'], s, s, 0, 1));
    } else if (tau < B) {
      const p = (tau - P) / Q;
      out.push(
        blend('add'),
        sprite(c['gift.glowSprite'], 0, c['gift.x'], c['gift.boxY'], c['gift.glowScale'] * p, c['gift.glowScale'] * p, 0, c['gift.glowColor'], c['gift.glowAlpha'] * p),
        blend('normal'),
      );
      const sh = w.shake[k];
      if (sh) {
        const base = c['gift.boxScale'] + (c['gift.burstScale'] - c['gift.boxScale']) * p * p;
        const j = Math.max(0, c['gift.squashK'] * (p - c['gift.squashFrom']));
        out.push(...halves(sh[0], c['gift.boxY'], base * (1 + j), base * (1 - j), sh[1], 1));
      }
    } else {
      afterBurst(w, k, timeNs, tau - B, out);
    }
    if (k > w.btnK) buttons(w, k, out);
    return out;
  }

  function afterBurst(w, k, timeNs, T, out) {
    const hr = 1 - T / c['gift.halfMs'];
    const hc = 1 - hr * hr * hr;
    const aH = Math.min(1, 1 - (T - c['gift.halfFadeAt']) / c['gift.halfFade']);
    const halfOn = T < c['gift.halfMs'] && aH > 0;
    if (halfOn) {
      out.push(sprite(c['gift.boxSprite'], 2, c['gift.x'], c['gift.boxY'] + c['gift.halfDist'] * hc, c['gift.burstScale'], c['gift.burstScale'], c['gift.halfTurn'] * hc, c['gift.white'], aH));
    }
    // веер
    out.push(blend('add'));
    const u = Math.min(1, T / c['gift.fanMs']);
    const g = 1 - (1 - u) * (1 - u) * (1 - u);
    const r = c['gift.fanR'] * g;
    const phi = c['gift.fanSpin'] * (Number(msOf(timeNs)) - inputs.clock0Ms);
    const vertices = [];
    for (let i = 0; i < c['gift.fanRays']; i++) {
      const a1 = phi + c['gift.fanStep'] * i;
      const a2 = phi + c['gift.fanStep'] * i + c['gift.fanWidth'];
      vertices.push([c['gift.x'], c['gift.lootY'], c['gift.fanColor'], c['gift.fanAlpha'] * g]);
      vertices.push([c['gift.x'] + lengthdir_x(r, a1), c['gift.lootY'] + lengthdir_y(r, a1), c['gift.fanColor'], 0]);
      vertices.push([c['gift.x'] + lengthdir_x(r, a2), c['gift.lootY'] + lengthdir_y(r, a2), c['gift.fanColor'], 0]);
    }
    out.push({ component: 'tris', vertices });
    // свечение добычи
    const pulse = w.pulse[k];
    if (pulse) out.push(sprite(c['gift.glowSprite'], 0, c['gift.x'], c['gift.lootY'], pulse[0], pulse[0], 0, c['gift.fanColor'], pulse[1]));
    out.push(blend('normal'));
    // значок добычи
    const loot = w.loot[k];
    if (loot) out.push(sprite(w.lootSprite, w.lootFrame, c['gift.x'], loot[0], loot[1], loot[1], loot[2], c['gift.white'], 1));
    if (halfOn) {
      out.push(sprite(c['gift.boxSprite'], 1, c['gift.x'], c['gift.boxY'] - c['gift.halfDist'] * hc, c['gift.burstScale'], c['gift.burstScale'], -c['gift.halfTurn'] * hc, c['gift.white'], aH));
    }
    // искры
    const sp = w.sparks[k];
    const sA = Math.min(1, 1 - (T - c['gift.sparkFadeAt']) / c['gift.sparkFade']);
    if (sp && sA > 0) {
      for (let i = 0; i < sp.length; i++) {
        const sc = c['gift.sparkScale0'] + c['gift.sparkScaleStep'] * (i % c['gift.sparkScaleMod']);
        const ang = i % 2 === 0 ? c['gift.sparkSpin'] * T : -c['gift.sparkSpin'] * T;
        out.push(sprite(c['gift.sparkSprite'], 0, sp[i][0], sp[i][1], sc, sc, ang, sparkCols[i % sparkCols.length], sA));
      }
    }
    // белое свечение и вспышка
    if (T < c['gift.flashMs']) {
      const q = 1 - T / c['gift.flashMs'];
      const s = c['gift.wglow0'] - c['gift.wglowGain'] * q * q * q;
      out.push(
        blend('add'),
        sprite(c['gift.glowSprite'], 0, c['gift.x'], c['gift.boxY'], s, s, 0, c['gift.white'], c['gift.wglowAlpha'] * q),
        blend('normal'),
        rect(0, 0, c['gift.dimSize'], c['gift.dimSize'], c['gift.white'], c['gift.flashAlpha'] * q),
      );
    }
    // плашка названия
    if (T > c['gift.plateAt']) {
      const a = Math.min(1, (T - c['gift.plateAt']) / c['gift.plateFade']);
      const y = c['gift.plateY'] + c['gift.plateRise'] * (1 - a) * (1 - a) * (1 - a);
      out.push(sprite(c['gift.plateSprite'], 0, c['gift.x'], y, c['gift.plateSx'], c['gift.plateSy'], 0, c['gift.white'], a));
      const ts = w.titleScale[k] ?? 1;
      out.push({
        component: 'text', font: c['gift.titleFont'], x: c['gift.x'], y, text: w.title, xscale: ts, yscale: ts,
        colors: [c['gift.titleColor'], c['gift.titleColor'], c['gift.titleColor'], c['gift.titleColor']],
        alpha: a, halign: 1, valign: 1, snap: false, alphaRound: true,
      });
    }
  }

  function buttons(w, k, out) {
    const u = Math.min(1, (k - w.btnK) / c['gift.btnFrames']);
    let y = c['gift.btnY'] + c['gift.btnRise'] * (1 - u) * (1 - u) * (1 - u);
    let a = 1 - (1 - u) * (1 - u) * (1 - u);
    const tr = w.btnTrack?.[k];
    if (tr) [y, a] = tr;
    const oc = w.left > 0 ? c['gift.white'] : c['gift.btnOffColor'];
    const text = (x, str, color) => ({
      component: 'text', font: c['gift.btnFont'], x, y: y + c['gift.btnTextDy'], text: str, xscale: 1, yscale: 1,
      color, alpha: a, halign: 1, valign: 1, snap: true,
    });
    out.push(
      sprite(c['gift.plateSprite'], 0, c['gift.x'], y, c['gift.btnBarSx'], c['gift.btnBarSy'], 0, c['gift.white'], a),
      sprite(c['gift.btnSprite'], 0, c['gift.btnCloseX'], y, c['gift.btnSx'], c['gift.btnSy'], 0, c['gift.white'], a),
      text(c['gift.btnCloseX'], c['gift.closeText'], c['gift.white']),
      sprite(c['gift.btnSprite'], 0, c['gift.btnOpenX'], y, c['gift.btnSx'], c['gift.btnSy'], 0, oc, a),
      text(c['gift.btnOpenX'], c['gift.openText'] + w.left + c['gift.openTextEnd'], oc),
    );
  }

  return { frame };
}
