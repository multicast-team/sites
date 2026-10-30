// spec: workshop
// Workshop: 37 строк улучшений за бары — цены, капы, замки, «хватает баров», тексты, клетки эффектов, покупка.
// Код по спеке oracle/specs/workshop.md (правила 1–16). Данные — data/systems/workshop.json, тексты — data/strings.json;
// оба передаёт вызывающий: ядро само в файлы не ходит.

import { roundHalfEven, roundHalfUp, viaInt64, formatFixed, formatReal } from './num/real.mjs';
import { pow } from './num/libm.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} data    содержимое data/systems/workshop.json
 * @param {object} strings словарь текстов data/strings.json → .strings
 */
export function makeWorkshop(data, strings) {
  const C = data.constants;
  const rows = tableRows(data.tables.rows);
  const texts = tableRows(data.tables.texts);
  const cells = tableRows(data.tables.cells);
  const effects = tableRows(data.tables.effects);
  const N = C.rowCount;
  if (rows.length !== N || texts.length !== N) throw new Error('workshop: число строк данных ≠ rowCount');
  rows.forEach((r, i) => { if (r.row !== i || texts[i].row !== i) throw new Error(`workshop: строка ${i} не на месте`); });
  const order = rows.slice().sort((a, b) => a.place - b.place).map((r) => r.row);
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`workshop: нет текста ${key}`);
    return s;
  };
  const cellsByName = new Map(cells.map((c) => [c.cell, { ...c, terms: [] }]));
  for (const e of effects) {
    const c = cellsByName.get(e.cell);
    if (!c) throw new Error(`workshop: эффект строки ${e.row} в неизвестную клетку ${e.cell}`);
    c.terms.push(e);
  }
  for (const c of cellsByName.values()) c.terms.sort((a, b) => a.row - b.row); // правило 12: по возрастанию строки (??)

  /** Правило 3: режим округления цены по уровню обелиска. */
  const priceMode = (obelisk) => (obelisk >= C['price.highModeFromObelisk'] ? 'high' : 'low');

  /** Правила 2, 4, 5: цена одной из трёх валют строки на уровне L. */
  function priceOf(base, growth, level, obelisk) {
    const c = base * pow(growth, level); // правило 2: степень — pow libm O (своя libm, этап 5.1)
    const big = C['price.bigFrom'], step = C['price.bigStep'];
    if (priceMode(obelisk) === 'high') {
      return c < big ? roundHalfUp(c) : roundHalfUp(c / step) * step;
    }
    const v = c < big ? roundHalfEven(c) : roundHalfEven(c / step) * step;
    return viaInt64(v);
  }

  /** Три цены строки [A, B, C]. */
  function prices(row, level, obelisk) {
    const r = rows[row];
    return [r.baseA, r.baseB, r.baseC].map((b) => priceOf(b, r.growth, level, obelisk));
  }

  /** Номера баров трёх цен. */
  const barsOf = (row) => [rows[row].barA, rows[row].barB, rows[row].barC];

  /** Правила 6–7: кап строки с добавкой капа. */
  function cap(row, obelisk, capBonus = 0) {
    let c = rows[row].cap;
    if (row === C['capByObelisk.row']) c = Math.min(C['capByObelisk.max'], C['capByObelisk.perObelisk'] * obelisk + C['capByObelisk.offset']);
    if (c > C['capBonus.minCap']) c += capBonus;
    return c;
  }

  /** Сумма капов (правило 7). */
  function capsTotal(obelisk, capBonus = 0) {
    let s = 0;
    for (let i = 0; i < N; i++) s += cap(i, obelisk, capBonus);
    return s;
  }

  /** Правило 8: предыдущая бомба куплена (у строк без предыдущей — всегда да). */
  const prevOk = (row, levels) => rows[row].prevRow < 0 || levels[rows[row].prevRow] > 0;

  /** Правило 14д: бар ≥ цены по сравнению с эпсилоном (больше, или разница меньше эпсилона — ??: граница < / ≤). */
  function enough(bar, price) {
    return bar > price || Math.abs(bar - price) < C['afford.epsilon'];
  }

  /** Правило 9: «хватает баров» — все три цены покрыты; замки не учитываются. */
  function affordable(row, level, obelisk, bars) {
    const p = prices(row, level, obelisk);
    const ids = barsOf(row);
    return ids.every((id, k) => enough(bars[id], p[k]));
  }

  /** Замки строки (правило 14 а–г): true — условие выполнено. */
  function locks(state, row) {
    const r = rows[row];
    const L = state.levels[row];
    return {
      obelisk: state.obelisk >= r.obeliskReq,
      world: state.worlds >= r.worldReq,
      prev: prevOk(row, state.levels),
      notCapped: L < cap(row, state.obelisk, state.capBonus || 0),
    };
  }

  const fmt = (x, decimals) => (decimals === 3 ? formatFixed(x, 3) : formatReal(x));
  const shown = (t, level) => t.valueBase + t.valueStep * level;

  /** Правило 10: текст «сейчас > дальше». */
  function lineText(row, level) {
    const t = texts[row];
    if (!t.decimals) return T(t.line);
    return T(t.line) + fmt(shown(t, level), t.decimals) + t.unit + ' > ' + t.nextSign + fmt(shown(t, level + 1), t.decimals) + t.unit;
  }

  /** Правило 10: текст «на капе». */
  function doneText(row, level) {
    const t = texts[row];
    if (!t.decimals) return T(t.done);
    return T(t.done) + fmt(shown(t, level), t.decimals) + t.doneUnit;
  }

  /** Имя предыдущей бомбы для плашки замка (правило 8), '' — нет. */
  const prevName = (row) => (rows[row].prevName ? T(rows[row].prevName) : '');

  /**
   * Правила 11–13: клетки эффектов при уровнях строк levels.
   * sum: база + k·L по строкам (сначала k·L, затем сложение); product: база · Π(1 + k·L); level: уровень строки.
   * Плюс число открытых бомб и описания бомб, которые меняет Workshop (строки 13, 16, 20).
   */
  function cellValues(levels) {
    const out = {};
    for (const c of cellsByName.values()) {
      let v = c.base;
      for (const e of c.terms) {
        const L = levels[e.row];
        if (c.combine === 'sum') v = v + e.perLevel * L;
        else if (c.combine === 'product') v = v * (1 + e.perLevel * L);
        else v = L; // level
      }
      out[c.cell] = v;
    }
    let owned = C['bombs.alwaysOpen'];
    for (const c of cellsByName.values()) if (c.combine === 'level' && out[c.cell] === 1) owned += 1;
    out['bomb.owned'] = owned; // правило 13: +1 при уровне 1 (??: на уровнях выше капа — не считается)
    const inf = levels[C['desc.infinity.row']];
    out['bomb.infinity.desc'] = T(C['desc.infinity.prefix'])
      + formatFixed(C['desc.infinity.base'] + C['desc.infinity.step'] * inf, C['desc.infinity.decimals']) + T(C['desc.infinity.suffix']);
    const mega = levels[C['desc.mega.row']];
    out['bomb.mega.desc'] = mega > 0 ? T(C['desc.mega.prefix']) + formatReal(C['desc.mega.base'] + C['desc.mega.step'] * mega) + T(C['desc.mega.suffix']) : null;
    const gold = levels[C['desc.plenty.row']];
    out['bomb.plenty.desc'] = T(C['desc.plenty.prefix']) + formatReal(out['bomb.plenty.multi']) + T(C['desc.plenty.suffix'])
      + (gold > 0 ? '\n' + formatReal(C['desc.plenty.step'] * gold) + T(C['desc.plenty.goldSuffix']) : '');
    return out;
  }

  /**
   * Правила 14–16: нажатие «Buy» строки. state = {obelisk, worlds, capBonus, levels[37], bars[86], logRevision}.
   * Меняет state при покупке; возвращает true/false. Пересчёт клеток эффектов — отдельно (cellValues), банк при покупке
   * статы не пересчитывает (правило 15).
   */
  function buy(state, row) {
    const lk = locks(state, row);
    if (!(lk.obelisk && lk.world && lk.prev && lk.notCapped)) return false;
    const L = state.levels[row];
    const p = prices(row, L, state.obelisk);
    const ids = barsOf(row);
    if (!ids.every((id, k) => enough(state.bars[id], p[k]))) return false;
    ids.forEach((id, k) => { state.bars[id] = state.bars[id] - p[k]; });
    state.levels[row] = L + 1;
    state.logRevision = (state.logRevision || 0) + 1;
    return true;
  }

  return {
    rowCount: N, barCount: C.barCount, order,
    priceMode, prices, barsOf, cap, capsTotal, prevOk, prevName, affordable, enough, locks,
    lineText, doneText, cellValues, buy,
    requirement: (row) => ({ obelisk: rows[row].obeliskReq, world: rows[row].worldReq, prevRow: rows[row].prevRow }),
  };
}
