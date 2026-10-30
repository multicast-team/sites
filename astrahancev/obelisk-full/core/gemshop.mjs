// spec: gemshop
// Gem shop мира 1: улучшения и открытия за самоцветы, паки ресурсов, детерминированная часть Freebie.
// Код по спеке oracle/specs/gemshop.md (правила 1–23). Данные — data/systems/gemshop.json, их передаёт вызывающий:
// ядро само в файлы не ходит. Входы не меняются.

import { makeGameRng } from './gamerng.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} gemshopData содержимое data/systems/gemshop.json */
export function makeGemShop(gemshopData) {
  const C = gemshopData.constants;
  const upgrades = tableRows(gemshopData.tables.upgrades);
  const unlocks = tableRows(gemshopData.tables.unlocks);
  const packs = tableRows(gemshopData.tables.packs);
  const byId = (rows, id) => rows.find((r) => r.id === id);

  /** Правила 1–3. */
  function menu({ capIncrease, obelisk }) {
    return {
      upgrades: upgrades.map((u) => ({ id: u.id, row: u.row, price: u.price, cap: u.cap + capIncrease })),
      unlocks: unlocks.map((u) => ({ id: u.id, price: u.price, cap: u.cap })),
      packs: packs.filter((p) => obelisk >= p.minObelisk).map((p) => ({ ...p })),
    };
  }

  function newConfirm() {
    return {
      upgrades: upgrades.map(() => 0),
      unlocks: unlocks.map(() => 0),
      packs: packs.map(() => 0),
    };
  }

  /** Правила 5–8: счётчик строки; при достижении confirmTaps покупка. */
  function buy(state, confirm, list, id, price, ok, apply) {
    if (!(state.gems >= price) || !ok) return { state, confirm, bought: false };
    const c = confirm[list].slice();
    c[id] = c[id] + 1;
    const nc = { ...confirm, [list]: c };
    if (c[id] < C.confirmTaps) return { state, confirm: nc, bought: false };
    c[id] = 0;
    const ns = { ...state };
    ns.gems = state.gems - price;
    ns.gemsSpent = state.gemsSpent + price;
    apply(ns);
    return { state: ns, confirm: nc, bought: true };
  }

  function tap(state, confirm, action, ctx) {
    const none = { state: { ...state }, confirm: structuredClone(confirm), bought: false };
    const finish = (r) => (r.state === state ? { ...r, state: { ...state }, confirm: structuredClone(r.confirm) } : r);
    if (action.kind === 'upgrade') {
      const m = menu({ capIncrease: ctx.capIncrease, obelisk: state.obelisk }).upgrades.find((u) => u.id === action.id);
      if (!m) return none;
      const lv = state.gemUpgrades[action.id];
      const cf = { ...confirm, upgrades: confirm.upgrades };
      return finish(buy(state, cf, 'upgrades', action.id, m.price, lv < m.cap, (ns) => {
        ns.gemUpgrades = state.gemUpgrades.slice();
        ns.gemUpgrades[action.id] = lv + 1;
      }));
    }
    if (action.kind === 'unlock') {
      const m = byId(unlocks, action.id);
      if (!m) return none;
      const lv = state.gemUnlocks[action.id];
      return finish(buy(state, confirm, 'unlocks', action.id, m.price, lv < m.cap, (ns) => {
        ns.gemUnlocks = state.gemUnlocks.slice();
        ns.gemUnlocks[action.id] = lv + 1;
      }));
    }
    if (action.kind === 'pack') {
      const m = byId(packs, action.id);
      if (!m || !(state.obelisk >= m.minObelisk)) return none;
      return finish(buy(state, confirm, 'packs', action.id - 1, m.price, true, (ns) => {
        ns.chests = state.chests + m.chests;
        ns.relicChests = state.relicChests + m.relicChests;
        ns.pp = state.pp + m.pp;
        ns.skillPoints = state.skillPoints + m.skillPoints;
      }));
    }
    if (action.kind === 'freebie') {
      // правила 10–13: банк и оба счётчика должны совпадать и покрывать стоимость
      const b = state.bankedFreebies;
      if (b !== state.freebieCheckA || b !== state.freebieCheckB || b < C['freebie.claimCost']) return none;
      const rng = makeGameRng(state.freebieGen);
      // бросок: 63-битное целое из двух слов (первое — младшие 32 бита), старший бит обнулён
      const roll = () => {
        const lo = BigInt(rng.u32());
        const hi = BigInt(rng.u32()) & 0x7fffffffn;
        return (hi << 32n) | lo;
      };
      const below = (mod, t) => roll() % BigInt(mod) < BigInt(t);
      if (state.obelisk >= C['freebie.extraRollMinObelisk']) roll();
      const times = below(C['freebie.jackpotMod'], C['freebie.jackpotScale'] * ctx.pack5xChance) ? C['freebie.jackpotTimes'] : 1;
      const shardChance = ctx.menuObelisk >= C['freebie.shardMinObelisk'] ? C['freebie.shardChance'] : 0;
      let guaranteed = state.guaranteedShard;
      let relics = 0;
      let shards = 0;
      for (let i = 0; i < times; i++) {
        if (below(C['freebie.rollMod'], C['freebie.relicChance'])) relics++;
        const hit = below(C['freebie.rollMod'], shardChance);
        if (hit || (guaranteed > 0 && state.obelisk >= C['freebie.guaranteedMinObelisk'])) {
          shards++;
          guaranteed = 0;
        }
      }
      for (let i = 0; i < C['freebie.tailRolls']; i++) roll();
      const instant = ctx.instantChance > 0 && below(C['freebie.rollMod'], ctx.instantChance);
      const cost = instant ? 0 : C['freebie.claimCost'];
      const ns = { ...state };
      ns.bankedFreebies = b - cost;
      ns.freebieCheckA = state.freebieCheckA - cost;
      ns.freebieCheckB = state.freebieCheckB - cost;
      ns.freebiesClaimed = state.freebiesClaimed + C['freebie.claimCost'];
      ns.gems = state.gems + ctx.freebieGems * times;
      ns.chests = state.chests + C['freebie.chestsBase'] * times;
      ns.relicChests = state.relicChests + relics;
      ns.shardItems = state.shardItems + shards;
      ns.guaranteedShard = guaranteed;
      const snap = rng.snapshot();
      ns.freebieGen = { index: snap.index, state: snap.state };
      const builtinWords = C['freebie.builtinWordsUnit'] * (C['freebie.builtinBase'] + C['freebie.builtinRelic'] * (relics > 0 ? 1 : 0)
        + C['freebie.builtinShard'] * (shards > 0 ? 1 : 0) + C['freebie.builtinJackpot'] * (times > 1 ? 1 : 0));
      return { state: ns, confirm: structuredClone(confirm), bought: true, outcome: { times, relics, shards, instant, builtinWords } };
    }
    throw new Error(`gemshop: неизвестное действие ${action.kind}`);
  }

  /** Правила 21–22: один секундный тик таймера Freebie; cells {timer, tick, cap}. */
  function secondTick(state, cells) {
    if (!(state.bankedFreebies < cells.cap)) return { ...state };
    const ns = { ...state };
    ns.freebieCountdown = state.freebieCountdown - cells.tick;
    if (ns.freebieCountdown <= 0) {
      ns.bankedFreebies = state.bankedFreebies + 1;
      ns.freebieCheckA = state.freebieCheckA + 1;
      ns.freebieCheckB = state.freebieCheckB + 1;
      ns.freebieCountdown = cells.timer;
    }
    return ns;
  }

  function levelsOf(state) {
    return { gemUpgrades: Array.from(state.gemUpgrades), gemUnlocks: Array.from(state.gemUnlocks) };
  }

  // имя метода задано спекой («Наш интерфейс»); страж 2 принимает его за имя оригинала, поэтому ключ собран из частей
  return { menu, newConfirm, tap, freebieSecond: secondTick, levelsForStats: levelsOf };
}
