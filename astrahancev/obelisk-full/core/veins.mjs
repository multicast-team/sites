// spec: veins
// Veins: бросок жилы зоны, броски флагов жилы, множитель карты жилы, доход с жилы со случайным округлением.
// Код по спеке oracle/specs/veins.md (правила V1–V5, V7). Данные — data/systems/veins.json, передаёт вызывающий.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} data содержимое data/systems/veins.json */
export function makeVeins(data) {
  const C = data.constants;
  const cardTable = new Map(tableRows(data.tables.cardMulti).map((r) => [r.level, r.multi]));

  // V1: жила есть, если (результат + 1) / scale <= r; слова тратятся всегда
  function spawnRoll(rate, rng) {
    return (rng.irandom(C['spawn.die']) + 1) / C['spawn.scale'] <= rate;
  }

  // V2: флаг жилы с шансом c, %
  function flagRoll(chance, rng) {
    return (rng.irandom(C['flag.die']) + 1) / C['flag.scale'] <= chance;
  }

  // V4: множитель карты жилы
  function cardMulti(level, polyBonus, infernalBonus) {
    if (level === C['card.polyLevel']) return polyBonus;
    if (level === C['card.infernalLevel']) return C['card.infernalBase'] + (polyBonus - 1) * infernalBonus;
    return cardTable.get(level) ?? 1;
  }

  // V3, V5, V7
  function income(s, rng, opts = {}) {
    const z = Math.trunc(s.zone);
    if (!(z >= 0 && z < C.zones)) throw new Error('veins: зона вне таблицы');
    const goldMul = s.gold ? s.goldMulti : 1;
    const rainbowMul = s.gold && s.rainbow ? s.rainbowMulti : 1;
    const gleamMul = s.gleaming ? s.gleamingMulti : 1;
    const v = s.amount * s.incomeMulti * cardMulti(s.card, s.polyBonus, s.infernalBonus) * goldMul * rainbowMul * gleamMul;
    const d = v - Math.trunc(v);
    const roll = rng.irandom(C['income.die']);
    const gain = Math.floor(v) + ((roll + 1) / C['income.scale'] <= d ? 1 : 0);
    if (typeof opts.cardRoll === 'function') opts.cardRoll(z);
    return gain;
  }

  return { spawnRoll, flagRoll, cardMulti, income };
}
