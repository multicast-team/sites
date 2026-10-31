// spec: stars
// Stargazing: создание летящей звезды и суперзвезды, кадр, касание, поимка и ценность, открытие новой звезды.
// Код по спеке oracle/specs/stars.md (v2, правила 1–18). Данные — data/systems/stars.json; передаёт вызывающий: ядро само в файлы не ходит.

import { cosf, sinf } from './num/libmf.mjs';

const fr = Math.fround;
const MASK63 = (1n << 63n) - 1n;

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} data содержимое data/systems/stars.json */
export function makeStars(data) {
  const C = data.constants;
  const paths = tableRows(data.tables.paths);
  if (paths.length !== C['path.modes']) throw new Error('stars: число режимов пути данных ≠ path.modes');
  paths.forEach((p, i) => { if (p.mode !== i) throw new Error(`stars: режим ${i} не на месте`); });
  const cardDie = new Map(tableRows(data.tables.cardDie).map((r) => [r.star, BigInt(r.die)]));

  // spec offline, правило 25: «шанс a из b», 2 слова
  function chance(rng, a, b) {
    const U = rng.u63();
    const B = BigInt(Math.trunc(b));
    if (B <= 0n) return false;
    return Number(U % B) + 1 <= a;
  }

  // spec offline, правило 24: частичное округление, бросок всегда (2 слова)
  function partRound(rng, x) {
    const fl = Math.floor(x);
    const f = x % 1;
    return chance(rng, f * 10000, 10000) ? fl + 1 : fl;
  }

  // правило 2
  function path(rng) {
    const p = paths[rng.u32() % C['path.modes']];
    const x = p.x0 + p.xSign * rng.irandomRange(0, p.xSpan);
    const y = p.y0 + p.ySign * rng.irandomRange(0, p.ySpan);
    const direction = p.dir0 + p.dirSign * rng.irandomRange(0, p.dirSpan);
    return { x, y, direction };
  }

  // правила 2–3: событие Create
  function create(rng, i, chances) {
    const { x, y, direction } = path(rng);
    const nova = chance(rng, C['nova.scale'] * chances.nova, C['nova.die']);
    const giant = chance(rng, C['giant.scale'] * chances.giant, C['giant.die']);
    const radiant = chance(rng, C['radiant.scale'] * chances.radiant, C['radiant.die']);
    const auto = chance(rng, C['auto.scale'] * chances.auto, C['auto.die']);
    return {
      id: i,
      x: fr(x),
      y: fr(y),
      direction,
      speed: 0,
      life: C.life,
      hp: C.hp,
      caught: 0,
      auto: auto ? 1 : 0,
      nova: nova ? 1 : 0,
      giant: giant ? 1 : 0,
      radiant: radiant ? 1 : 0,
      scale: giant ? C['scale.giant'] : C['scale.normal'],
      frame: 0,
      frameTick: 0,
      spin: 0,
      spinSpeed: C.spinSpeed,
      caughtAge: 0,
    };
  }

  // правило 15: событие Create суперзвезды (автоловля первой)
  function createSuper(rng, chances) {
    const { x, y, direction } = path(rng);
    const auto = chance(rng, C['auto.scale'] * chances.auto, C['auto.die']);
    const nova = chance(rng, C['superNova.scale'] * chances.superNova, C['superNova.die']);
    const giant = chance(rng, C['superGiant.scale'] * chances.superGiant, C['superGiant.die']);
    const radiant = chance(rng, C['superRadiant.scale'] * chances.superRadiant, C['superRadiant.die']);
    return {
      super: 1,
      x: fr(x),
      y: fr(y),
      direction,
      speed: 0,
      life: C.life,
      hp: C.hp,
      caught: 0,
      auto: auto ? 1 : 0,
      nova: nova ? 1 : 0,
      giant: giant ? 1 : 0,
      radiant: radiant ? 1 : 0,
      scale: giant ? C['scale.giant'] : C['scale.normal'],
      frame: 0,
      frameTick: 0,
      angle: 0,
      spinSpeed: C.spinSpeed,
      caughtAge: 0,
    };
  }

  // правило 14
  function spawnSupers(rng, chances) {
    const triple = chance(rng, C['superTriple.scale'] * chances.tripleSuper, C['superTriple.die']);
    const tenfold = chance(rng, C['super10x.scale'] * chances.super10x, C['super10x.die']);
    const n = (triple ? C['superTriple.count'] : 1) * (tenfold ? C['super10x.count'] : 1);
    const out = [];
    for (let k = 0; k < n; k++) out.push(createSuper(rng, chances));
    return out;
  }

  // правила 1, 13
  function createStar(rng, i, chances) {
    const R = partRound(rng, C['super.base'] / chances.superDiv);
    const isSuper = chance(rng, 1, R);
    const supers = isSuper ? spawnSupers(rng, chances) : [];
    const dbl = chance(rng, C['double.scale'] * chances.double, C['double.die']);
    const tpl = chance(rng, C['triple.scale'] * chances.triple, C['triple.die']);
    const n = (dbl ? C['double.count'] : 1) * (tpl ? C['triple.count'] : 1);
    const stars = [];
    for (let k = 0; k < n; k++) stars.push(create(rng, i, chances));
    return { super: isSuper, supers, stars };
  }

  // правило 17: произведение множителей
  function value(star, econ) {
    const m = econ.mult;
    let v = m.all;
    if (star.super) {
      if (star.nova) v *= m.superNova;
      if (star.giant) v *= m.superGiant;
      if (star.radiant) v *= m.superRadiant;
    } else {
      v *= econ.cardMulti(star.id, econ.cards[star.id]);
      if (star.nova) v *= m.nova;
      if (star.giant) v *= m.giant;
      if (star.radiant) v *= m.radiant;
    }
    if (star.nova && star.giant) v *= m.combo;
    return v;
  }

  // правила 7, 17, 18
  function catchReward(star, rng, econ) {
    const gain = partRound(rng, value(star, econ));
    let card = 0;
    if (star.super) {
      econ.superCollected += gain;
    } else {
      econ.collected[star.id] += gain;
      if (econ.cards[star.id] === 0) {
        // spec chests, правило 4: 63-битное U из двух слов (младшее первым)
        const lo = BigInt(econ.cardGen.u32());
        const hi = BigInt(econ.cardGen.u32());
        const U = ((hi << 32n) | lo) & MASK63;
        if (Number(U % cardDie.get(star.id)) + 1 <= gain) {
          econ.cards[star.id] = C['card.found'];
          card = 1;
        }
      }
    }
    return { gain, card };
  }

  // правила 4–7, 16
  function step(star, rng, dtUs, gameSpeed = 1, collected, econ) {
    const wasCaught = star.caught;
    if (star.caught) {
      star.caughtAge += 1;
      if (star.caughtAge >= (star.super ? C['superCaught.frames'] : C['caught.frames'])) return 'gone';
    }
    const v = (dtUs / C['step.usPerSec']) * C['step.fps'] / gameSpeed;
    star.speed = star.caught ? 0 : fr(v);
    if (star.auto && star.life <= C['auto.life']) star.hp = 0;
    star.life -= v;
    if (star.life <= 0) return 'gone';
    let result = null;
    if (star.hp <= 0 && !star.caught) {
      star.caught = 1;
      star.caughtAge = 0;
      if (econ) catchReward(star, rng, econ);
      else collected[star.id] += partRound(rng, C['value.base']);
      result = 'caught';
    }
    star.frameTick += 1;
    if (star.frameTick >= C['anim.every']) { star.frame += 1; star.frameTick = 0; }
    if (star.super) {
      if (!wasCaught) star.angle = fr(star.angle + star.spinSpeed * v);
    } else if (!star.caught) {
      star.spin -= star.spinSpeed * v;
    }
    const a = fr(fr(star.direction * fr(Math.PI)) / 180);
    const c = cosf(a);
    const s = sinf(a);
    star.x = fr(star.x + fr(star.speed * c));
    star.y = fr(star.y + fr(-star.speed * s));
    return result;
  }

  // правило 8
  function tap(stars, x, y) {
    const h = C['hit.half'];
    let n = 0;
    for (const s of stars) {
      if (Math.abs(x - s.x) <= h && Math.abs(y - s.y) <= h) {
        if (!s.caught && s.hp > 0) n++;
        s.hp = 0;
      }
    }
    return n;
  }

  const numberUnlocked = (lv) => lv.reduce((n, v) => n + (v >= 1 ? 1 : 0), 0);
  const allOwned = (lv) => lv.every((v) => v >= 1);

  // правила 10–12
  function rollNew(lv, gen, last) {
    const out = lv.slice();
    if (allOwned(out)) {
      if (last !== null && last !== undefined) out[last] = 1;
      return { lv: out, pick: null, last };
    }
    const m = Math.max(numberUnlocked(out), C['roll.minBound']);
    let r;
    do { r = gen.irandomRange(0, m); } while (out[r] !== 0);
    let pick = r;
    for (let k = 0; k < C['roll.fixed']; k++) if (out[k] === 0) { pick = k; break; }
    out[pick] = 1;
    return { lv: out, pick, last: pick };
  }

  return { createStar, createSuper, spawnSupers, catchReward, create, step, tap, numberUnlocked, allOwned, rollNew };
}
