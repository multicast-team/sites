// spec: artifacts
// Артефакты ярусов 1–4: цены, капы, призыв, улучшение. Код по спеке oracle/specs/artifacts.md (правила 1–8).
// Данные — data/systems/artifacts.json; их передаёт вызывающий: ядро само в файлы не ходит.

import { roundHalfEven, roundHalfUp } from './num/real.mjs';
import { pow } from './num/libm.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} data содержимое data/systems/artifacts.json */
export function makeArtifacts(data) {
  const C = data.constants;
  const tiers = tableRows(data.tables.tiers);
  const arts = tableRows(data.tables.artifacts);
  const force = tableRows(data.tables.summonForce);
  const T = (tier) => {
    const t = tiers[tier - 1];
    if (!t || t.tier !== tier) throw new Error(`artifacts: нет яруса ${tier}`);
    return t;
  };
  const art = (tier, index) => {
    const a = arts[T(tier).firstRow + index];
    if (!a || a.tier !== tier || a.index !== index) throw new Error(`artifacts: нет артефакта ${tier}/${index}`);
    return a;
  };

  const count = (tier) => T(tier).count;
  const row = (tier, index) => art(tier, index).row;

  // правило 1
  function price(tier, index, level, obelisk) {
    const a = art(tier, index);
    const x = pow(a.growth, level - 1) * a.base;
    return obelisk >= C['price.roundUpFrom'] ? roundHalfUp(x) : roundHalfEven(x);
  }

  // правило 2
  const cap = (tier, index, capIncrease, tier4CapIncrease = 0) =>
    art(tier, index).cap + capIncrease + (tier === 4 ? tier4CapIncrease : 0);

  const owned = (lv) => lv.reduce((n, l) => n + (l > 0 ? 1 : 0), 0);

  // правило 3: summonBase · 2^открытых, степень двойки — умножением
  function summonCost(tier, tierLevels) {
    let x = T(tier).summonBase;
    for (let i = owned(tierLevels); i > 0; i--) x *= C['summon.growth'];
    return x;
  }

  // правило 4
  const locked = (tier, obelisk) => obelisk < T(tier).obeliskReq;

  // правила 2, 3, 8
  function menu({ levels, obelisk, capIncrease, tier4CapIncrease = 0 }) {
    const out = { price: [], cap: [], capped: [], summon: [] };
    for (let t = 1; t <= 4; t++) {
      const lv = levels[t - 1];
      out.price.push(lv.map((l, i) => price(t, i, l, obelisk)));
      out.cap.push(lv.map((l, i) => cap(t, i, capIncrease, tier4CapIncrease)));
      out.summon.push(summonCost(t, lv));
    }
    out.capped = levels[0].map((l, i) => (l >= out.cap[0][i] ? 1 : 0));
    out.tier1Owned = owned(levels[0]);
    out.tier1Levels = levels[0].reduce((s, l) => s + l, 0);
    out.tier12Owned = owned(levels[0]) + owned(levels[1]);
    let lc = C['levelCost.base'];
    for (const l of levels[0]) lc += Math.max(l - 1, 0);
    out.levelCost = lc;
    return out;
  }

  const copy = (s) => ({ ...s, levels: s.levels.map((l) => l.slice()) });

  // правило 5
  function upgrade(state, tier, index) {
    const s = copy(state);
    const lv = s.levels[tier - 1];
    const l = lv[index];
    if (l < 1 || locked(tier, s.obelisk)) return s;
    if (l >= cap(tier, index, s.capIncrease, s.tier4CapIncrease)) return s;
    const p = price(tier, index, l, s.obelisk);
    if (s.pp < p) return s;
    s.pp = s.pp - p;
    lv[index] = l + 1;
    return s;
  }

  // правило 7
  function pick(tier, lv, gen) {
    const n = count(tier);
    const u = gen.u32();
    const have = owned(lv);
    for (const f of force) {
      if (f.tier === tier && lv[f.index] === 0 && have >= f.minOwned) return f.index;
    }
    let c = u % n;
    while (lv[c] > 0) c = gen.u32() % n;
    return c;
  }

  // правила 6–7
  function summon(state, tier, gen) {
    const s = copy(state);
    const lv = s.levels[tier - 1];
    if (locked(tier, s.obelisk) || owned(lv) >= count(tier)) return { state: s, index: null };
    const p = summonCost(tier, lv);
    if (s.pp < p) return { state: s, index: null };
    const index = pick(tier, lv, gen);
    s.pp = s.pp - p;
    lv[index] = 1;
    return { state: s, index };
  }

  // 25 уровней в сквозной нумерации
  const flatLevels = (levels) => {
    const out = Array(arts.length).fill(0);
    for (let t = 1; t <= 4; t++) levels[t - 1].forEach((l, i) => { out[row(t, i)] = l; });
    return out;
  };

  return { count, row, price, cap, summonCost, locked, menu, upgrade, summon, flatLevels };
}
