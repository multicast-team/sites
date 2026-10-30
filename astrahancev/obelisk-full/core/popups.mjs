// spec: damage-popup
// Попапы урона: полёт, угасание, удаление, порядок вывода (spec oracle/specs/damage-popup.md, правила 1–7). Числа — из data/systems/fx.json.

import { lengthdir_x, lengthdir_y } from './num/gmlmath.mjs';

export function makePopups(fx) {
  const c = fx.constants;
  const speed = c['damagePopup.speed'];
  const alphaStart = c['damagePopup.alphaStart'];
  const fadePerSecond = c['damagePopup.fadePerSecond'];
  const msPerSecond = c['damagePopup.msPerSecond'];
  const nsPerMs = BigInt(c['clock.nsPerMs']);

  let list = [];

  // правило 1: миллисекунды кадра — целая часть деления нс на nsPerMs
  function msOf(timeNs) {
    return timeNs / nsPerMs;
  }

  function spawn(p) {
    list.push({
      ms0: msOf(p.timeNs),
      x0: p.x,
      y0: p.y,
      vx: lengthdir_x(speed, p.dir), // правило 3: один раз от D
      vy: lengthdir_y(speed, p.dir),
      text: p.text,
      kind: p.kind,
    });
  }

  function frame(timeNs) {
    const ms = msOf(timeNs);
    const out = [];
    const kept = [];
    for (const q of list) {
      const a = Number(ms - q.ms0) / msPerSecond; // правило 2
      const life = alphaStart - fadePerSecond * a; // правило 5
      if (life <= 0) continue; // правило 6
      kept.push(q);
      out.push({
        x: q.x0 + q.vx * a, // правило 4
        y: q.y0 + q.vy * a,
        text: q.text,
        kind: q.kind,
        alpha: Math.min(1, life),
      });
    }
    list = kept;
    return out;
  }

  function count() {
    return list.length;
  }

  return { spawn, frame, count };
}
