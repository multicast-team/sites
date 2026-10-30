// spec: upgrades
// Upgrades (меню 1): цены, руды, капы и открытие меню, пороги, тексты строк, покупка.
// Код по спеке oracle/specs/upgrades.md (правила 1–10). Данные — data/systems/upgrades.json, upgraderules.json, тексты —
// data/strings.json; все три передаёт вызывающий: ядро само в файлы не ходит.

import { roundHalfEven, roundHalfUp, viaInt64, formatReal } from './num/real.mjs';
import { pow } from './num/libm.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} upgradesData содержимое data/systems/upgrades.json
 * @param {object} rulesData    содержимое data/systems/upgraderules.json
 * @param {object} strings      словарь текстов data/strings.json → .strings
 */
export function makeUpgrades(upgradesData, rulesData, strings) {
  const C = upgradesData.constants;
  const R = rulesData.constants;
  const N = C.rowCount;
  const rows = tableRows(upgradesData.tables.rows);
  const texts = new Map(tableRows(upgradesData.tables.texts).map((t) => [t.row, t]));
  const capRaise = tableRows(upgradesData.tables.capRaise);
  const afterIntro = new Map(tableRows(rulesData.tables.levelReq).map((t) => [t.row, t.afterIntro]));
  const pickStart = tableRows(rulesData.tables.pickaxeStart).map((t) => t.cost);
  const pickSteps = tableRows(rulesData.tables.pickaxeSteps);
  const pickMulti = tableRows(rulesData.tables.pickaxeMulti);
  if (rows.length !== N) throw new Error('upgrades: число строк данных ≠ rowCount');
  rows.forEach((r, i) => { if (r.row !== i) throw new Error(`upgrades: строка ${i} не на месте`); });
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`upgrades: нет текста ${key}`);
    return s;
  };
  const PICK = C['pickaxe.row'];
  const GOLD = C['gold.row'];

  // правило 1, д: округление и переполнение int64; v3: при обелиске ≥ порога — ⌊x + 0.5⌋ без перевода в int64
  const finish = (x, obelisk) => (obelisk >= R['cost.roundUpFromObelisk'] ? roundHalfUp(x) : viaInt64(roundHalfEven(x)));

  // правило 2: множитель золота
  function goldMulti(row, levels) {
    const r = 1 - R['gold.step'] * levels[GOLD];
    return row > GOLD || row >= C['gold.minMultiplierFromRow'] ? Math.max(C['gold.minMultiplier'], r) : r;
  }

  // правило 3: цена кирки (только бар A)
  // task — номер задания, A — уровень артефакта «Pickaxe Cost −3 Bars» (v2: а, е, ж); без ctx — задание 0, артефакт 0
  function pickaxeCost(L, task, A, obelisk) {
    const q = Math.floor(L / 2);
    let c = L < R['pickaxe.linearFrom'] && task < R['pickaxe.startTableBeforeTask'] ? pickStart[L] : R['pickaxe.linearStep'] * (L + 1);
    for (const s of pickSteps) if (q > s.oreAbove) c += s.perLevel * (L - s.fromLevel);
    for (let z = R['pickaxe.loopFrom']; z < q + (L - R['pickaxe.loopLevelOffset']); z++) c += R['pickaxe.loopStep'] * (z - R['pickaxe.loopShift']);
    for (const m of pickMulti) {
      if (L < m.fromLevel) break;                         // ступени по возрастанию порога
      c *= m.factor;
    }
    c -= R['pickaxe.artifactStep'] * A;
    if (c < R['pickaxe.minCost']) c = R['pickaxe.minCost'];
    return finish(c, obelisk);
  }

  function price(row, levels, ctx) {
    const L = levels[row];
    const obelisk = ctx && typeof ctx.obelisk === 'number' ? ctx.obelisk : 0;
    if (row === PICK) {
      const task = ctx && typeof ctx.task === 'number' ? ctx.task : 0;
      const tier = ctx && ctx.artifacts ? ctx.artifacts[R['pickaxe.artifactTier'] - 1] : undefined;
      const A = tier && typeof tier[R['pickaxe.artifactIndex']] === 'number' ? tier[R['pickaxe.artifactIndex']] : 0;
      return [pickaxeCost(L, task, A, obelisk), 0, 0];
    }
    const r = rows[row];
    const k = Math.max(0, L - r.linearBelow + 1);
    const g = pow(C['cost.growth'], k);
    const m = goldMulti(row, levels);
    const one = (b, mult) => finish(((b * (L + 1)) * g) * mult, obelisk);
    return [one(r.baseOreA, 1), one(r.baseOreB, 1), one(r.baseGold, m)];
  }

  function ores(row, levels) {
    if (row === PICK) return [Math.floor(levels[row] / 2), rows[row].oreB, -1];
    return [rows[row].oreA, rows[row].oreB, -1];
  }

  // правило 5: кап по текущим уровням, понижение уровня при открытии
  function capOf(row, levels) {
    const r = rows[row];
    let c = r.cap;
    if (r.capRaisable) for (const cr of capRaise) c += cr.perLevel * levels[cr.row];
    return c;
  }

  function open(levels) {
    const lv = levels.slice();
    const caps = [];
    for (let i = 0; i < N; i++) {
      const c = capOf(i, lv);
      caps.push(c);
      if (lv[i] > c) lv[i] = c;
    }
    return { caps, levels: lv };
  }

  const cap = (row, levels) => open(levels).caps[row];

  // правило 6
  function levelReq(row, task) {
    if (task < R['intro.task']) return rows[row].levelReq;
    return afterIntro.get(row);
  }
  const worldReq = (row) => rows[row].worldReq;

  // правило 7
  function texts2(row, levels) {
    const L = levels[row];
    if (row === PICK) {
      const v = (n) => formatReal((n + 1) * (n + 2) / 2);
      return { head: T('t.upgrade_pickaxe_minus'), sign: '', unit: '', a: v(L), b: v(L + 1) };
    }
    const t = texts.get(row);
    const v = (n) => formatReal(t.valueBase + t.valueStep * n);
    return { head: T(t.name) + T(C['text.sep']), sign: t.sign, unit: t.unit, a: v(L), b: v(L + 1) };
  }
  function lineText(row, levels) {
    const x = texts2(row, levels);
    return x.head + x.sign + x.a + x.unit + ' > ' + x.sign + x.b + x.unit;
  }
  function doneText(row, levels) {
    const x = texts2(row, levels);
    return x.head + x.sign + x.a + x.unit;
  }

  // правило 8
  const enough = (stock, cost) => stock >= cost || Math.abs(stock - cost) < R['afford.epsilon'];

  function canBuy(row, s) {
    if (!(s.levels[row] < cap(row, s.levels))) return false;
    if (!(s.lvl >= levelReq(row, s.task))) return false;
    if (!(s.world >= worldReq(row))) return false;
    const p = price(row, s.levels, s);
    const o = ores(row, s.levels);
    return enough(s.bars[o[0]], p[0]) && enough(s.bars[o[1]], p[1]) && enough(s.gold, p[2]);
  }

  // правило 9
  function buy(row, s) {
    if (!canBuy(row, s)) return false;
    const p = price(row, s.levels, s);
    const o = ores(row, s.levels);
    s.bars[o[0]] -= p[0];
    s.bars[o[1]] -= p[1];
    s.gold -= p[2];
    s.levels[row] += 1;
    return true;
  }

  return { price, ores, open, cap, levelReq, worldReq, lineText, doneText, canBuy, buy };
}
