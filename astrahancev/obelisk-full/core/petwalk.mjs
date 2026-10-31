// spec: pets-2250
// Питомцы 2.2.50: свободный выгул (правила 11–25).
// Код по спеке oracle/specs/pets-2250.md. Данные — data/systems/petplay.json; встроенный ГСЧ передаёт вызывающий.

const f32 = Math.fround;

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} data содержимое data/systems/petplay.json */
export function makePetWalk(data) {
  const C = data.constants;
  const N = C.count;
  const L = C['walk.bounds.left'];
  const T = C['walk.bounds.top'];
  const R = C['walk.bounds.right'];
  const B = C['walk.bounds.bottom'];
  const dir = tableRows(data.tables.walkDir);
  const mulX = [];
  const mulY = [];
  for (const r of dir) { mulX[r.angle] = r.mulX; mulY[r.angle] = r.mulY; }
  const fix = new Map();
  for (const r of tableRows(data.tables.walkDirFix)) fix.set(`${r.angle},${r.step},${r.axis}`, r.value);

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // правило 11
  function start(before) {
    const cp = (k) => Array.from(before[k]);
    return {
      inited: false,
      x: cp('x'), y: cp('y'), tx: cp('tx'), ty: cp('ty'),
      walk: cp('walk').map(Boolean), nmt: cp('nmt'), face: cp('face'),
      spr: cp('spr').map(Boolean), act: cp('act'), ast: cp('ast'), adur: cp('adur'),
      roll: cp('roll'), petted: cp('petted'), speed: cp('speed'),
    };
  }

  // правило 18
  function pickTarget(s, i, rng, owned) {
    let best = null;
    let bestGap = -Infinity;
    for (let n = 0; n < C['walk.pickTries']; n++) {
      const a = rng.irandomRange(0, C['walk.angleMax']);
      const d = rng.irandomRange(C['walk.stepMin'], C['walk.stepMax']);
      const fx = fix.get(`${a},${d},0`);
      const fy = fix.get(`${a},${d},1`);
      const X = fx !== undefined ? fx : f32(d * mulX[a]);
      const Y = fy !== undefined ? fy : f32(d * mulY[a]);
      const tx = clamp(s.x[i] + X, L, R);
      const ty = clamp(s.y[i] + Y * C['walk.yScale'], T, B);
      let gap = Infinity;
      for (let j = 0; j < N; j++) {
        if (j === i || !owned[j]) continue;
        const ox = s.walk[j] ? s.tx[j] : s.x[j];
        const oy = s.walk[j] ? s.ty[j] : s.y[j];
        const g = Math.sqrt((tx - ox) * (tx - ox) + (ty - oy) * (ty - oy));
        if (g < gap) gap = g;
      }
      if (gap >= C['walk.personalSpace']) return [tx, ty];
      if (best === null || gap > bestGap) { best = [tx, ty]; bestGap = gap; }
    }
    return best;
  }

  // правило 19
  function sprintTarget(s, i, rng) {
    let tx = L + rng.irandom(C['walk.sprintSide']);
    if (s.x[i] < (L + R) / 2) tx = R - rng.irandom(C['walk.sprintSide']);
    const ty = clamp(s.y[i] + rng.irandomRange(-C['walk.sprintDy'], C['walk.sprintDy']), T, B);
    return [tx, ty];
  }

  // правило 20
  function idleAction(s, i, rng, now) {
    let act = 0;
    let adur = 0;
    if (rng.irandom(C['walk.napOneIn'] - 1) === 0) {
      act = 1;
      adur = rng.irandomRange(C['walk.napMinMs'], C['walk.napMaxMs']);
    } else if (rng.irandom(C['walk.lookOneIn'] - 1) === 0) {
      act = 2;
      adur = C['walk.lookMs'];
    } else if (rng.irandom(C['walk.wiggleOneIn'] - 1) === 0) {
      act = 3;
      adur = C['walk.wiggleMs'];
    }
    if (act === 0) return;
    s.act[i] = act;
    s.adur[i] = adur;
    s.ast[i] = now;
    const t = now + adur + rng.irandomRange(C['walk.wakeMinMs'], C['walk.wakeMaxMs']);
    if (t > s.nmt[i]) s.nmt[i] = t;
  }

  // правила 13–20
  function step(s, rng, now, dt, owned) {
    if (!s.inited) {
      for (let i = 0; i < N; i++) {
        s.nmt[i] = now + rng.irandomRange(C['walk.firstMinMs'], C['walk.firstMaxMs']);
        s.speed[i] = rng.irandomRange(C['walk.speedMin'], C['walk.speedMax']);
      }
      s.inited = true;
      return;
    }
    for (let i = 0; i < N; i++) {
      if (!owned[i]) continue;
      if (s.walk[i]) {
        // правило 15
        const sp = s.speed[i] * (s.spr[i] ? C['walk.sprintSpeedMulti'] : 1)
          * (now - s.roll[i] < C['walk.rollMs'] ? C['walk.rollSpeedMulti'] : 1);
        const st = sp * (dt / 1000000);
        const dx = s.tx[i] - s.x[i];
        const dy = s.ty[i] - s.y[i];
        if (dx > C['walk.faceMinDx']) s.face[i] = -1;
        else if (dx < -C['walk.faceMinDx']) s.face[i] = 1;
        const a = f32(dx);
        const b = f32(dy);
        const D = f32(Math.sqrt(f32(f32(a * a) + f32(b * b))));
        if (D <= st) {
          // правило 16
          s.x[i] = s.tx[i];
          s.y[i] = s.ty[i];
          s.walk[i] = false;
          s.spr[i] = false;
          s.nmt[i] = now + rng.irandomRange(C['walk.idleMinMs'], C['walk.idleMaxMs']);
          idleAction(s, i, rng, now);
        } else {
          s.x[i] = s.x[i] + dx / D * st;
          s.y[i] = s.y[i] + dy / D * st;
        }
      } else if (now >= s.nmt[i]) {
        // правило 17
        const [tx, ty] = pickTarget(s, i, rng, owned);
        s.tx[i] = tx;
        s.ty[i] = ty;
        if (rng.irandom(C['walk.sprintOneIn'] - 1) === 0) {
          const [sx, sy] = sprintTarget(s, i, rng);
          s.tx[i] = sx;
          s.ty[i] = sy;
          s.spr[i] = true;
        } else if (rng.irandom(C['walk.rollOneIn'] - 1) === 0 && Math.abs(s.tx[i] - s.x[i]) >= C['walk.rollMinDx']) {
          s.roll[i] = now;
          if (s.tx[i] > s.x[i]) s.face[i] = -1;
          else if (s.tx[i] < s.x[i]) s.face[i] = 1;
        }
        s.walk[i] = true;
      }
    }
  }

  return { start, step };
}
