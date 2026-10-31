// spec: cards
// Карты: эффект ступеней 0–4, счётчики коллекции, детерминированная часть броска, золочение и улучшения, Buns.
// Код по спеке oracle/specs/cards.md (правила 1–9). Данные — data/systems/cards.json, их передаёт вызывающий.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} data содержимое data/systems/cards.json */
export function makeCards(data) {
  const C = data.constants;
  const sets = {};
  for (const r of tableRows(data.tables.sets)) sets[r.set] = { ...r, cards: [] };
  for (const r of tableRows(data.tables.cards)) sets[r.set].cards[r.index] = r;
  const reduction = tableRows(data.tables.petQuest).map((r) => r.reduction);

  /** Эффект карты на ступени level; bonus = { poly, infernal } (правила 1–3). */
  function effect(set, index, level, bonus) {
    const s = sets[set];
    const c = s.cards[index];
    const b = bonus || {};
    if (level === 0) return c.base;
    if (level === 1) return c.level1;
    if (level === 2) return c.level2;
    const v3 = s.poly === 'stat' ? b.poly : c.level3;
    if (level === 3) return v3;
    const I = b.infernal;
    let v;
    switch (s.infernal) {
      case 'keep': return v3;
      case 'base': return c.base;
      case 'scaleStat':
      case 'scaleDiff':
        v = c.base + (v3 - c.base) * I;
        break;
      case 'scaleDelta':
        v = c.base + c.delta4 * I;
        break;
      default: throw new Error(`cards: неизвестный вид ада ${s.infernal}`);
    }
    // ceil4 — только для scaleDiff/scaleDelta
    if (c.ceil4 === 1 && s.infernal !== 'scaleStat') v = Math.ceil(v);
    return v;
  }

  function effects(state) {
    const out = {};
    for (const [set, lv] of Object.entries(state.levels)) {
      const bonus = { poly: state.polyBonus[set], infernal: state.infernalBonus[set] };
      out[set] = lv.map((l, i) => effect(set, i, l, bonus));
    }
    return out;
  }

  function counts(levels) {
    const r = { exist: C['exist.total'], owned: 0, complete: 1, infernal: 0, gilded: 0, gildedOre: 0, gildedBar: 0, polyOre: 0, atLeast: [0, 0, 0, 0] };
    for (const [set, lv] of Object.entries(levels)) {
      for (const l of lv) {
        r.owned += l;
        for (let k = 1; k <= 4; k++) if (l >= k) r.atLeast[k - 1]++;
        if (l < 1) r.complete = 0;
        if (l >= 2) {
          r.gilded++;
          if (set === 'ore') r.gildedOre++;
          if (set === 'bar') r.gildedBar++;
        }
        if (l >= 3 && set === 'ore') r.polyOre++;
        if (l >= 4) r.infernal++;
      }
    }
    return r;
  }

  function bySet(levels, set) {
    const r = [0, 0, 0, 0, 0, 0];
    for (const l of levels[set]) {
      r[0] += l;
      for (let k = 1; k <= 4; k++) if (l >= k) r[k]++;
      if (l >= 4) r[5]++;
    }
    return r;
  }

  /** Бросок при гарантированной удаче (правило 6). Меняет state на месте, возвращает [ступень, осколки|null]. */
  function roll(state, set, index, amount) {
    const lv = state.levels[set];
    const sh = sets[set].shards === 1 && state.shards ? state.shards[set] : undefined;
    if (amount > 0 && state.obelisk >= C.obeliskReq) {
      if (lv[index] === 0) lv[index] = 1;
      else if (lv[index] === 2 && sh && state.node39 >= C['roll.nodeMin'] && sh[index] < C.shardCap) sh[index] += 1;
    }
    return [lv[index], sh ? sh[index] : null];
  }

  function gildCost(set, index) {
    const c = sets[set].cards[index];
    return [C['gild.gold'], c.pp, c.gems];
  }

  function canGild(wallet, set, index) {
    const [g, pp, gems] = gildCost(set, index);
    return wallet.gold >= g && wallet.pp >= pp && wallet.gems >= gems ? 1 : 0;
  }

  /** Улучшение из меню (правило 8). Меняет state на месте, возвращает [ступень, gold, pp, gems]. */
  function upgrade(state, set, index, kind) {
    if (kind === 'gild') {
      const [g, pp, gems] = gildCost(set, index);
      state.levels[set][index] = C['level.gild'];
      state.gold -= g;
      state.pp -= pp;
      state.gems -= gems;
    } else if (kind === 'poly') {
      state.levels[set][index] = C['level.poly'];
    } else if (kind === 'infernal') {
      state.levels[set][index] = C['level.infernal'];
    } else {
      throw new Error(`cards: неизвестное улучшение ${kind}`);
    }
    return [state.levels[set][index], state.gold, state.pp, state.gems];
  }

  /** Buns (правило 9). */
  function petQuest(level, infernalBonus) {
    const multiplier = effect(C['petQuest.set'], C['petQuest.index'], level, { infernal: infernalBonus });
    const red = level >= 4 ? reduction[3] * infernalBonus : reduction[level];
    return { reduction: red, multiplier };
  }

  return { effect, effects, counts, bySet, roll, gildCost, canGild, upgrade, petQuest };
}
