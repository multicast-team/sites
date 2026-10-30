// spec: prestige
// Престиж: очки за престиж (gain) и сброс состояния (apply).
// Код по спеке oracle/specs/prestige.md (правила 1–3). Данные — data/systems/prestige.json и tasks.json,
// оба передаёт вызывающий: ядро само в файлы не ходит.

import { roundHalfEven, viaInt64 } from './num/real.mjs';
import { pow } from './num/libm.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} prestigeData содержимое data/systems/prestige.json
 * @param {object} tasksData    содержимое data/systems/tasks.json (номер задания престижа — в данных престижа)
 */
export function makePrestige(prestigeData, tasksData) {
  const C = prestigeData.constants;
  const values = tableRows(prestigeData.tables.resetValues);
  const arrays = tableRows(prestigeData.tables.resetArrays);
  const indices = tableRows(prestigeData.tables.resetIndices);
  if (!tasksData || !tasksData.constants) throw new Error('prestige: нет данных заданий');

  /** Очки престижа: правило 1 (withOver = false — вариант без надбавки, правило 2). */
  function gain(level, multiplier, withOver = true) {
    if (level < C['gain.minLevel']) return 0;
    const b = C['gain.base'] * pow(C['gain.growth'], level - C['gain.offset']);
    const k = withOver && level > C['gain.overLevel'] ? 1 + C['gain.overStep'] * (level - C['gain.overLevel']) : 1;
    const x = Math.floor(b * k);
    return viaInt64(roundHalfEven(x * multiplier));
  }

  /** Престиж: правило 3. Возвращает новое состояние. */
  function apply(state, g) {
    const s = { ...state };
    s.prestigePoints = state.prestigePoints + g;
    s.prestiges = state.prestiges + C['prestiges.step'];
    s.nameChanges = state.nameChanges + C['nameChanges.step'];
    for (const r of values) s[r.field] = r.value;
    for (const r of arrays) s[r.field] = new Array(state[r.field].length).fill(r.value);
    const copied = new Set();
    for (const r of indices) {
      if (!copied.has(r.field)) { s[r.field] = state[r.field].slice(); copied.add(r.field); }
      s[r.field][r.index] = r.value;
    }
    if (state.task === C['task.id']) s.taskProgress = Math.max(state.taskProgress, s.prestiges);
    return s;
  }

  return { gain, apply };
}
