// spec: floors
// Floors: этажи и руда мира 1 — кап этажей, таблица этажей, таблица руд, число зачисток, бросок руды на экран.
// Код по спеке oracle/specs/floors.md (правила 1–12). Данные — data/systems/mining.json, передаёт вызывающий:
// ядро само в файлы не ходит.

import { roundHalfEven } from './num/real.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} data содержимое data/systems/mining.json
 */
export function makeFloors(data) {
  const C = data.constants;
  const floors = new Map(tableRows(data.tables.floors).map((r) => [r.floor, r]));
  const ores = new Map(tableRows(data.tables.ores).map((r) => [r.ore, r]));
  const picks = tableRows(data.tables.picks);
  const cols = tableRows(data.tables.columns);
  const parityName = (n) => (n % 2 === 0 ? 'even' : 'odd');
  const pickVariants = (par) => picks.filter((r) => r.parity === par).map((r) => r.shift);
  const colVariants = (par) => cols.filter((r) => r.parity === par).map((r) => r.column);

  function floorCap() { return C.floorCap; }

  function floor(F) {
    const r = floors.get(F);
    return r ? { baseOre: r.baseOre, zone: r.zone } : null;
  }

  function ore(id) {
    const r = ores.get(id);
    return r ? { hp: r.hp, xp: r.xp, sell: r.sell } : null;
  }

  function clearsToProgress(F, task, mul) {
    if (F === 0) return 0;
    const k = task < C['clears.lateFromTask'] ? C['clears.perFloorEarly'] : C['clears.perFloorLate'];
    return roundHalfEven((F * k) * mul);
  }

  function rollScreen(F, rng, opts = {}) {
    const { perScreen = 10, bigChance = 0, sellMulti = 1, top = 0, goldenChance = 0, rainbowChance = 0 } = opts;
    const fl = floors.get(F);
    if (!fl) throw new Error(`floors: этаж ${F} вне таблицы`);
    if (goldenChance > 0 || rainbowChance > 0 || fl.zone === C['roll.unsupportedZone']) {
      throw new Error('вне спеки floors (??)');
    }
    const die = C['roll.chanceDie'];
    for (let j = 0; j < C['roll.leadDice']; j++) rng.irandom(die);
    const pv = pickVariants(parityName(F));
    const step = C['roll.gapBase'] - C['roll.gapPerRock'] * perScreen;
    const rocks = [];
    for (let i = 0; i < perScreen; i++) {
      const size = rng.irandom(die) + 1 <= bigChance ? C['roll.bigSize'] : 1;
      const oreId = fl.baseOre + rng.choose(...pv);
      const golden = rng.irandom(die) < goldenChance;
      const rainbow = rng.irandom(die) < rainbowChance;
      for (let j = 0; j < C['roll.idleDicePerRock']; j++) rng.irandom(die);
      const col = rng.choose(...colVariants(parityName(i)));
      const x = C['roll.left'] + col * C['roll.columnStep'] + rng.irandom(C['roll.jitter']);
      const y = (C['roll.top'] + top) + i * step;
      const o = ores.get(oreId);
      rocks.push({ ore: oreId, x, y, hp: o?.hp, size, zone: fl.zone, value: o ? o.sell * sellMulti : undefined, golden, rainbow, rotation: C['roll.rotation'] });
    }
    return { count: rocks.length, rocks };
  }

  return { floorCap, floor, ore, clearsToProgress, rollScreen };
}
