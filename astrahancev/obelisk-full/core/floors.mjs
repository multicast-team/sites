// spec: floors
// Floors: этажи и руда мира 1 — кап этажей, таблица этажей, таблица руд, число зачисток, бросок руды на экран.
// Код по спеке oracle/specs/floors.md (правила 1–20). Данные — data/systems/mining.json и (миры 2–4, необязательно)
// data/systems/worlds.json, передаёт вызывающий: ядро само в файлы не ходит.

import { roundHalfEven } from './num/real.mjs';
import { makeVeins } from './veins.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} data содержимое data/systems/mining.json
 * @param {object} [worlds] содержимое data/systems/worlds.json (миры 2–4); без него — поведение мира 1
 * @param {object} [veins] содержимое data/systems/veins.json (жилы, правило V6)
 */
export function makeFloors(data, worlds, veins) {
  const veinRoller = veins ? makeVeins(veins) : null;
  const C = data.constants;
  const floors = new Map(tableRows(data.tables.floors).map((r) => [r.floor, r]));
  const ores = new Map(tableRows(data.tables.ores).map((r) => [r.ore, r]));
  const picks = tableRows(data.tables.picks);
  const cols = tableRows(data.tables.columns);
  const parityName = (n) => (n % 2 === 0 ? 'even' : 'odd');
  const pickVariants = (par) => picks.filter((r) => r.parity === par).map((r) => r.shift);
  const colVariants = (par) => cols.filter((r) => r.parity === par).map((r) => r.column);

  const W = worlds ? worlds.constants : null;
  const worldRows = worlds ? tableRows(worlds.tables.worlds) : [];
  const pools = new Map();
  const strips = new Map();
  if (worlds) {
    for (const r of tableRows(worlds.tables.floors)) floors.set(r.floor, r);
    for (const r of tableRows(worlds.tables.ores)) ores.set(r.ore, r);
    for (const r of tableRows(worlds.tables.pools)) {
      if (!pools.has(r.zone)) pools.set(r.zone, []);
      pools.get(r.zone).push(r.ore);
    }
    for (const r of tableRows(worlds.tables.strips)) {
      if (!strips.has(r.zone)) strips.set(r.zone, { even: [], odd: [] });
      strips.get(r.zone)[r.parity].push(r.column);
    }
  }

  function floorCap(openWorlds = 1) {
    if (!worlds) return C.floorCap;
    const w = worldRows.find((r) => r.world === openWorlds);
    return w ? w.lastFloor : null;
  }

  function worldOf(F) {
    const w = worldRows.find((r) => F >= r.firstFloor && F <= r.lastFloor);
    return w ? w.world : null;
  }

  function zonePool(z) {
    const p = pools.get(z);
    return p ? [...p] : null;
  }

  function randomOreOfZone(z, rng) {
    const p = pools.get(z);
    return p ? rng.choose(...p) : null;
  }

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
    const { perScreen = 10, bigChance = 0, sellMulti = 1, top = 0, goldenChance = 0, rainbowChance = 0,
      goldenVeinChance = 0, voidChance = 0, veinRate = 0, rainbowVeinChance = 0, gleamingVeinChance = 0, randomize } = opts;
    const fl = floors.get(F);
    if (!fl) throw new Error(`floors: этаж ${F} вне таблицы`);
    const strip = strips.get(fl.zone);
    if (goldenChance > 0 || rainbowChance > 0 || goldenVeinChance > 0 || voidChance > 0
      || rainbowVeinChance > 0 || gleamingVeinChance > 0 || (veinRate > 0 && !veinRoller)
      || (fl.zone === C['roll.unsupportedZone'] && !strip)) {
      throw new Error('вне спеки floors (??)');
    }
    const die = C['roll.chanceDie'];
    if (W) {
      if (rng.irandom(W['roll.rareDie']) === W['roll.rareFace']) {
        if (typeof randomize !== 'function') throw new Error('randomize: нет сида окружения');
        randomize(rng);
      }
    } else {
      for (let j = 0; j < C['roll.leadDice']; j++) rng.irandom(die);
    }
    const pv = pickVariants(parityName(F));
    const step = C['roll.gapBase'] - C['roll.gapPerRock'] * perScreen;
    const rocks = [];
    for (let i = 0; i < perScreen; i++) {
      const size = rng.irandom(die) + 1 <= bigChance ? C['roll.bigSize'] : 1;
      const oreId = fl.baseOre + rng.choose(...pv);
      let vein = false;
      let golden = false;
      if (veinRoller) vein = veinRoller.spawnRoll((veinRate * veins.constants['spawn.perScreenBase']) / perScreen, rng);
      else golden = rng.irandom(die) < goldenChance;
      const rainbow = rng.irandom(die) < rainbowChance;
      for (let j = 0; j < C['roll.idleDicePerRock']; j++) rng.irandom(die);
      let col = rng.choose(...colVariants(parityName(i)));
      if (strip && i < W['strip.rocks']) {
        const sc = strip[parityName(i)];
        col = i % 2 === 0 ? rng.choose(...sc) : sc[0];
      }
      const x = C['roll.left'] + col * C['roll.columnStep'] + rng.irandom(C['roll.jitter']);
      const y = (C['roll.top'] + top) + i * step;
      const o = ores.get(oreId);
      rocks.push({ ore: oreId, x, y, hp: o?.hp, size, zone: fl.zone, value: o ? o.sell * sellMulti : undefined, golden, rainbow, rotation: C['roll.rotation'], vein, void: false });
    }
    return { count: rocks.length, rocks };
  }

  return { floorCap, worldOf, floor, ore, zonePool, randomOreOfZone, clearsToProgress, rollScreen };
}
