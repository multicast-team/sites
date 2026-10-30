// spec: bomb-fx
// Эффект бомбы: полёт, взрыв, свечение, 6 звёзд (spec oracle/specs/bomb-fx.md, правила 1–8). Числа — data/systems/bombfx.json.

import { sin, lengthdir_x, lengthdir_y } from './num/gmlmath.mjs';

export function makeBombFx(doc) {
  const c = doc.constants;
  const flightMs = c['bomb.flightMs'];
  const boomMs = c['bomb.boomMs'];
  const nsPerMs = BigInt(c['clock.nsPerMs']);

  let list = [];

  // правило 1: миллисекунды кадра — целая часть деления нс на nsPerMs
  const msOf = (timeNs) => timeNs / nsPerMs;

  function spawn(p) {
    list.push({ ms0: msOf(p.timeNs), sprite: p.sprite, tx: p.tx, ty: p.ty, arc: p.arc, starAngle: p.starAngle, spin: p.spin });
  }

  // правило 2
  function flight(s, e) {
    const u = 1 - e / flightMs;
    const q = 1 - u * u;
    const x = c['bomb.startX'] + (s.tx - c['bomb.startX']) * q;
    const y = (c['bomb.startY'] + (s.ty - c['bomb.startY']) * q) - s.arc * c['bomb.arcFactor'] * q * (1 - q);
    const scale = c['bomb.flightScale'] + c['bomb.flightScaleGain'] * q;
    return [{ component: 'sprite', sprite: s.sprite, frame: 0, x, y, sx: scale, sy: scale, angle: s.spin * c['bomb.spinDegrees'] * q, color: c['bomb.color'], alpha: 1 }];
  }

  // правила 3–7
  function boom(s, e) {
    const p = (e - flightMs) / boomMs;
    const a = 1 - p;
    const inv2 = (1 - p) * (1 - p);
    const leaves = [
      { component: 'blend', mode: c['bomb.glowBlend'] },
      { component: 'sprite', sprite: c['bomb.glowSprite'], frame: 0, x: s.tx, y: s.ty, sx: c['bomb.glowScaleEnd'] - c['bomb.glowScaleShrink'] * inv2, sy: c['bomb.glowScaleEnd'] - c['bomb.glowScaleShrink'] * inv2, angle: 0, color: c['bomb.glowColor'], alpha: c['bomb.glowAlpha'] * a },
      { component: 'blend', mode: 0 },
    ];
    const q1 = 1 - inv2;
    const b = c['bomb.boomScale'] * (1 + c['bomb.boomGrow'] * q1);
    const k = p < c['bomb.squashUntil'] ? sin(Math.PI * p / c['bomb.squashUntil']) : 0;
    leaves.push({ component: 'sprite', sprite: s.sprite, frame: 0, x: s.tx, y: s.ty, sx: b * (1 + c['bomb.squash'] * k), sy: b * (1 - c['bomb.squash'] * k), angle: 0, color: c['bomb.color'], alpha: a });
    const r = c['bomb.starRadius'] - c['bomb.starRadiusShrink'] * inv2;
    for (let i = 0; i < c['bomb.starCount']; i++) {
      const ang = s.starAngle + c['bomb.starStepDegrees'] * i;
      leaves.push({
        component: 'sprite', sprite: c['bomb.starSprite'], frame: 0,
        x: s.tx + lengthdir_x(r, ang), y: s.ty + lengthdir_y(r, ang),
        sx: c['bomb.starScale'], sy: c['bomb.starScale'], angle: ang, color: c['bomb.starColor'], alpha: a,
      });
    }
    return leaves;
  }

  function frame(timeNs) {
    const ms = msOf(timeNs);
    const kept = [];
    for (const s of list) {
      if (Number(ms - s.ms0) < flightMs + boomMs) kept.push(s);
    }
    list = kept;
    const out = [];
    for (let i = kept.length - 1; i >= 0; i--) { // правило 8: новее — раньше
      const s = kept[i];
      const e = Number(ms - s.ms0);
      if (e < flightMs) out.push({ phase: 'flight', e, leaves: flight(s, e) });
      else out.push({ phase: 'boom', e, leaves: boom(s, e) });
    }
    return out;
  }

  return { spawn, frame };
}
