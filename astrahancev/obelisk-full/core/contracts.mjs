// spec: contracts
// Контракты: бросок контракта, требование, награда, завершение, пропуск, пакет, 34 улучшения за очки контрактов.
// Код по спеке oracle/specs/contracts.md (правила 1–14). Данные — data/systems/contracts.json; передаёт вызывающий: ядро само в файлы не ходит.

import { roundHalfEven, viaInt64 } from './num/real.mjs';
import { pow, log } from './num/libm.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} data содержимое data/systems/contracts.json */
export function makeContracts(data) {
  const C = data.constants;
  const growth = tableRows(data.tables.goalGrowth);
  const upg = tableRows(data.tables.upgrades);
  if (upg.length !== C.count) throw new Error('contracts: число улучшений данных ≠ count');
  upg.forEach((u, i) => { if (u.id !== i) throw new Error(`contracts: улучшение ${i} не на месте`); });

  // правило 1: потолок номера руды
  function maxOre(done) {
    let p = C['roll.capBase'];
    for (let k = 1; k <= C['roll.capSteps']; k++) if (done >= C['roll.capStep'] * k) p++;
    if (done >= C['roll.capMid.from']) p = C['roll.capMid'];
    if (done >= C['roll.capHigh.from']) p = C['roll.capHigh'];
    const m = done < C['roll.smallBelow'] ? done : Math.floor(done / C['roll.divisor'] + 0.5);
    return Math.min(p, m);
  }

  // правила 3–4: требование
  function goalOf(n, u, reqMulti) {
    let r;
    if (n <= C['goal.lowUpTo']) {
      r = C['goal.base'] * pow(C['goal.lowGrowth'], n);
    } else {
      const L = log(n) / log(C['goal.logBase']);
      let g = growth[0].growth;
      for (const row of growth) if (n >= row.from) g = row.growth;
      r = C['goal.base'] * pow(g, n / L);
    }
    let x = (r * u) / (1 + reqMulti / 100);
    if (x < C['goal.min']) x = C['goal.min'];
    if (x === Infinity) return C['goal.infCap'];
    const fl = Math.floor(x);
    const res = viaInt64(x - fl >= 0.5 ? fl + 1 : fl);
    return res >= C['goal.infCap'] ? C['goal.infCap'] : res;
  }

  function rollInto(s, stats, gen) {
    const n = s.contractsDoneRun;
    const top = maxOre(n);
    let ore = gen.irandomRange(0, top);
    if (n > 0) while (ore === s.contractLastRoll) ore = gen.irandomRange(0, top);
    const u = gen.randomRange(C['goal.spreadLo'], C['goal.spreadHi']);
    s.contractActive = ore;
    s.contractGoal = goalOf(n, u, stats.reqMulti);
  }

  const copy = (s) => ({ ...s, bars: s.bars.slice(), contractLevels: s.contractLevels.slice() });

  function roll(state, stats, gen) {
    const s = copy(state);
    rollInto(s, stats, gen);
    return s;
  }

  // spec offline, правило 25: шанс «a из b» — 63-битное U из двух слов, 2 слова на вызов
  function chance(rng, a, b) {
    const lo = BigInt(rng.u32());
    const hi = BigInt(rng.u32()) & 0x7fffffffn;
    const U = (hi << 32n) | lo;
    const m = BigInt(Math.trunc(b));
    return Number(U % m) + 1 <= a;
  }

  // правило 6
  function reward(stats, rng) {
    let r = stats.pointsPerContract;
    for (const k of ['double', 'triple', 'five', 'ten']) {
      const a = stats[`${k}Chance`] * C[`reward.${k}.k`];
      if (chance(rng, a, C[`reward.${k}.scale`])) r *= C[`reward.${k}.mul`];
    }
    return r;
  }

  // правило 8
  function completeInto(s, stats, gen, rng) {
    const r = reward(stats, rng);
    s.bars[s.contractActive] -= s.contractGoal;
    s.contractsDoneRun += 1;
    s.contractPoints += r;
    s.popupAmount += r;
    s.popupFrames = C['popup.frames'];
    s.contractLastRoll = s.contractActive;
    rollInto(s, stats, gen);
  }

  function complete(state, stats, gen, rng) {
    const s = copy(state);
    completeInto(s, stats, gen, rng);
    return s;
  }

  // правило 10
  function skip(state, stats, gen) {
    const s = copy(state);
    s.gems -= C['skip.gems'];
    s.gemsSpentTotal += C['skip.gems'];
    s.contractLastRoll = s.contractActive;
    rollInto(s, stats, gen);
    return s;
  }

  // правило 11
  function completeAll(state, stats, gen, rng) {
    const s = copy(state);
    s.popupAmount = 0;
    while (s.autoComplete === 1 && s.bars[s.contractActive] >= s.contractGoal) completeInto(s, stats, gen, rng);
    return s;
  }

  // правило 13
  function cap(i) {
    return upg[i].cap;
  }

  function price(i, level, obelisk, costReduc) {
    const u = upg[i];
    if (level >= u.cap) return 0;
    const c = (u.base * costReduc) * pow(u.growth, level);
    if (obelisk >= C['price.highModeFromObelisk']) return Math.floor(c + 0.5);
    return viaInt64(roundHalfEven(c));
  }

  function lock(i, levels, obelisk, world) {
    const u = upg[i];
    if (world < u.world) return { kind: 'world', need: u.world };
    if (obelisk < u.obelisk) return { kind: 'obelisk', need: u.obelisk };
    if (i >= 1 && levels[i - 1] < u.prevNeed) return { kind: 'previous', need: u.prevNeed };
    return null;
  }

  function effect(i, level, done) {
    const u = upg[i];
    return u.perDone ? done * u.per * level : u.per * level;
  }

  function buyAmount(i, level) {
    return Math.min(C['buy.amount'], upg[i].cap - level);
  }

  // правило 14
  function buy(state, i, stats) {
    const L = state.contractLevels[i];
    if (lock(i, state.contractLevels, state.obelisk, state.world)) return state;
    if (L >= upg[i].cap) return state;
    const p = price(i, L, state.obelisk, stats.costReduc);
    if (state.contractPoints < p) return state;
    const s = copy(state);
    s.contractPoints -= p;
    s.contractPointsSpentRun += p;
    s.contractLevels[i] = L + 1;
    return s;
  }

  return { maxOre, roll, reward, complete, skip, completeAll, price, cap, lock, effect, buyAmount, buy };
}
