// spec: stats
// Стат-движок: 284 клетки сводки от уровней Upgrades (93), Workshop (37), дерева навыков (70), артефактов (25), gem shop
// (6 + 4), дронов (7 строк), угля (16 строк, дополнение 5.25) и грейдов костюмов дронов (droneGrade, 11 строк, дополнение 8.18).
// Код по спеке oracle/specs/stats.md (правила 1–23, версия 8.18; внешние значения — дополнение 8.20, правила 25–26). Данные — data/systems/stats.json и data/systems/statrules.json;
// оба передаёт вызывающий: ядро само в файлы не ходит.

import { pow } from './num/libm.mjs';

const ROWS = { upgrades: 93, workshop: 37, skilltree: 70, artifacts: 25, gemUpgrades: 6, gemUnlocks: 4, drones: 7, coal: 16, droneGrade: 11 };
const HIGH_ROUND_FROM = 26; // с этого уровня обелиска шаг round — вниз от x + 0.5
const MAX_PASSES = 10;

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

// округление к ближайшему целому, половина — к чётному
function roundHalfEven(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

/**
 * @param {object} cellsData содержимое data/systems/stats.json
 * @param {object} rulesData содержимое data/systems/statrules.json
 */
export function makeStats(cellsData, rulesData) {
  const cells = tableRows(cellsData.tables.cells);
  const names = new Set(cells.map((c) => c.cell));
  const value = new Map(cells.map((c) => [c.cell, c.base]));
  const levels = {
    upgrades: Array(ROWS.upgrades).fill(0),
    workshop: Array(ROWS.workshop).fill(0),
    skilltree: Array(ROWS.skilltree).fill(0),
    artifacts: Array(ROWS.artifacts).fill(0),
    gemUpgrades: Array(ROWS.gemUpgrades).fill(0),
    gemUnlocks: Array(ROWS.gemUnlocks).fill(0),
    drones: Array(ROWS.drones).fill(0),
    coal: Array(ROWS.coal).fill(0),
    droneGrade: Array(ROWS.droneGrade).fill(0),
  };
  let obelisk = 0; // уровень обелиска: режим шага round
  let task = 1; // номер задания: шаг scaleUntilTask
  let external = new Map(); // внешние значения: ключ → double (дополнение 8.20)

  // декларации: клетки в порядке таблицы, шаги — группы подряд идущих строк с одним номером step
  const decl = [];
  const byCell = new Map();
  for (const w of tableRows(rulesData.tables.rules)) {
    if (!names.has(w.cell)) throw new Error(`stats: декларация неизвестной клетки ${w.cell}`);
    let d = byCell.get(w.cell);
    if (!d) { d = { cell: w.cell, steps: [] }; byCell.set(w.cell, d); decl.push(d); }
    const last = d.steps[d.steps.length - 1];
    if (last && last.step === w.step) last.terms.push(w);
    else d.steps.push({ step: w.step, op: w.op, terms: [w] });
  }

  let stable = false; // уровни не менялись и последняя пересборка ничего не изменила

  const L = (t) => {
    const l = levels[t.source];
    if (!l) throw new Error(`stats: неизвестный источник ${t.source}`);
    return l[t.row] ?? 0;
  };

  function chain(terms, from) {
    let g = from;
    for (const t of terms) g = g + t.value * L(t);
    return g;
  }

  function evalCell(d) {
    let a = 0;
    for (const s of d.steps) {
      const t = s.terms;
      switch (s.op) {
        case 'start': a = t[0].value; break;
        case 'add': a = a + t[0].value * L(t[0]); break;
        case 'addDiv': a = a + L(t[0]) / t[0].value; break;
        case 'mulTerm': a = a * (1 + t[0].value * L(t[0])); break;
        case 'mulSum': a = a * (1 + chain(t, 0)); break;
        case 'mulChain': a = a * chain(t, 1); break;
        case 'mulInvChain': a = a * (1 / chain(t, 1)); break;
        case 'tri': { const l = L(t[0]); a = a * (((l + 1) * (l + 2)) / 2); break; }
        case 'mulCell': {
          if (!value.has(t[0].ref)) throw new Error(`stats: неизвестная клетка ${t[0].ref}`);
          a = a * value.get(t[0].ref);
          break;
        }
        case 'mulPow': a = a * pow(t[0].value, L(t[0])); break;
        case 'scale': a = a * t[0].value; break;
        case 'scaleUntilTask': if (task < t[0].row) a = a * t[0].value; break;
        case 'mulCellTerm': {
          if (!value.has(t[0].ref)) throw new Error(`stats: неизвестная клетка ${t[0].ref}`);
          a = a * (1 + (t[0].value * value.get(t[0].ref)) * L(t[0]));
          break;
        }
        case 'mulExt': if (external.has(t[0].ref)) a = a * external.get(t[0].ref); break;
        case 'addExt': if (external.has(t[0].ref)) a = a + external.get(t[0].ref); break;
        case 'mulTermExt': {
          const m = 1 + t[0].value * L(t[0]);
          a = external.has(t[0].ref) ? a * (m * external.get(t[0].ref)) : a * m;
          break;
        }
        case 'round': a = obelisk >= HIGH_ROUND_FROM ? Math.floor(a + 0.5) : roundHalfEven(a); break;
        default: throw new Error(`stats: неизвестный вид шага ${s.op}`);
      }
    }
    return a;
  }

  function pass() {
    let changed = false;
    for (const d of decl) {
      const v = evalCell(d);
      if (!Object.is(v, value.get(d.cell))) changed = true;
      value.set(d.cell, v);
    }
    return changed;
  }

  function settle() {
    if (stable) return 0;
    let n = 0;
    while (n < MAX_PASSES) {
      n++;
      if (!pass()) { stable = true; break; }
    }
    return n;
  }

  function source(name) {
    if (!(name in ROWS) || !levels[name]) throw new Error(`stats: неизвестный источник ${name}`);
    return levels[name];
  }

  return {
    setLevels(name, array) {
      source(name);
      levels[name] = Array.from(array);
      stable = false;
    },
    setLevel(name, row, level) {
      source(name)[row] = level;
      stable = false;
    },
    setObelisk(level) { obelisk = level; stable = false; },
    setTask(n) { task = n; stable = false; },
    setExternal(obj) { external = new Map(Object.entries(obj)); stable = false; },
    pass() { stable = false; return pass(); },
    settle,
    get(cell) {
      if (!value.has(cell)) throw new Error(`stats: неизвестная клетка ${cell}`);
      return value.get(cell);
    },
    values() { return Object.fromEntries(value); },
    setValues(obj) {
      for (const [c, v] of Object.entries(obj)) {
        if (!value.has(c)) throw new Error(`stats: неизвестная клетка ${c}`);
        value.set(c, v);
      }
      stable = false;
    },
  };
}
