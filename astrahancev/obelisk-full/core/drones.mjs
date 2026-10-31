// spec: drones
// Дроны и топливо мира 1: улучшения дрона, очки дронов, уголь, костюмы и слоты.
// Код по спеке oracle/specs/drones.md (правила 1–12, версия 3). Данные — data/systems/drones.json, их передаёт вызывающий:
// ядро само в файлы не ходит. Входы не меняются.
// 13 клеток сводки (правила 1–2: stat.drone*, stat.coal*, stat.droneSuitCap) считает стат-движок (core/stats.mjs, источники
// drones и coal); здесь остальные функции принимают готовые клетки сводки c (объект с ключами stat.*).

import { roundHalfEven } from './num/real.mjs';
import { pow } from './num/libm.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} dronesData содержимое data/systems/drones.json */
export function makeDrones(dronesData) {
  const C = dronesData.constants;
  const up = tableRows(dronesData.tables.upgrades);
  const coal = tableRows(dronesData.tables.coal);
  const suits = tableRows(dronesData.tables.suits);
  // строки угля по смыслу: 0 — уменьшение таймера, 1 — длительность топлива, 5 — множитель ёмкости
  const timerCell = coal[0].cell;
  const fuelCell = coal[1].cell;
  const capCell = coal[5].cell;
  /** Правило 3: цена строки при уровне level. */
  function upgradeCost(row, level) {
    if (row === 0) return C['upgrade.unlockCost'];
    return roundHalfEven(C['upgrade.costBase'] * pow(up[row].growth, level));
  }

  /** Правило 4: порог уровня строки при номере задания task. */
  function levelReq(row, task) {
    if (row === 0) return 0;
    return task < C['upgrade.levelReqUntilTask'] ? C['upgrade.levelReq'] : 0;
  }

  function menu(upgrades, task) {
    return {
      cost: up.map((r) => upgradeCost(r.row, upgrades[r.row])),
      levelReq: up.map((r) => levelReq(r.row, task)),
      cap: up.map((r) => r.cap),
      obeliskReq: up.map((r) => r.obeliskReq),
    };
  }

  const term = (bought, j) => C['points.base'] + C['points.step'] * (bought + j);

  /** Правило 5: цена x очков при bought уже купленных. */
  function pointsCost(bought, x) {
    let s = 0;
    for (let j = 0; j < x; j++) s += term(bought, j);
    return s;
  }

  /** Правило 6: сколько очков по карману и за сколько (при нуле — цена одного очка). */
  function maxPoints(bought, gold) {
    let s = 0;
    let n = 0;
    for (;;) {
      const next = s + term(bought, n);
      if (next > gold) break;
      s = next;
      n++;
    }
    return { count: n, price: n === 0 ? term(bought, 0) : s };
  }

  /** Правило 7: купить максимум очков. */
  function buyMaxPoints(state) {
    const { count, price } = maxPoints(state.pointsBought, state.gold);
    if (count === 0) return { ...state };
    return { ...state, gold: state.gold - price, points: state.points + count, pointsBought: state.pointsBought + count };
  }

  /** Правило 8. */
  const generatorSeconds = (c) => C['coal.generatorSeconds'] - c[timerCell];
  const coalPerTick = (generator) => generator;
  const coalCap = (generator, c) => roundHalfEven(C['coal.capPerLevel'] * generator * c[capCell]);
  /** Правило 9. */
  const addCoal = (current, n, cap) => Math.min(cap, current + n);

  /** Правило 10. */
  const fuelDuration = (suit, grade, c) => suits[suit].fuelBase * (c[fuelCell] * (1 + C['suit.fuelPerGrade'] * grade));
  const expToGrade = (suit, grade) => suits[suit].expBase * (grade + 1);
  const gradeCapCell = Object.fromEntries(tableRows(dronesData.tables.gradeCap).map((r) => [r.suit, r.cell]));
  const gradeCap = (suit, c) => C['suit.gradeCap'] + c[gradeCapCell[suit]];

  /** Правила 11–12. */
  function freeSlots(slots, n) {
    let f = 0;
    for (const s of slots.slice(0, n)) if (s === 0) f++;
    return f;
  }
  const isEquipped = (slots, drone) => slots.includes(drone);
  const isFueled = (slots, drone, fuelSeconds) => isEquipped(slots, drone) && fuelSeconds[drone - 1] > 0;
  /** Правило 12 (v3): повтор не проверяется; работают только первые n слотов. */
  function equip(slots, drone, n) {
    const out = slots.slice();
    for (let i = 0; i < n && i < out.length; i++) {
      if (out[i] === 0) { out[i] = drone; break; }
    }
    return out;
  }
  function unequip(slots, drone, n) {
    const out = slots.slice();
    for (let i = 0; i < n && i < out.length; i++) {
      if (out[i] === drone) { out[i] = 0; break; }
    }
    return out;
  }

  return {
    upgradeCost, levelReq, menu, pointsCost, maxPoints, buyMaxPoints,
    generatorSeconds, coalPerTick, coalCap, addCoal,
    fuelDuration, expToGrade, gradeCap,
    freeSlots, isEquipped, isFueled, equip, unequip,
  };
}
