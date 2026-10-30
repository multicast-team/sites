// spec: oresell
// Sell (руда): замки продажи строк — чтение из словаря сейва, запись обратно и переключение (spec oracle/specs/oresell.md, правила 1–5).
// Ядро в файлы не ходит: работает со словарём «секция/ключ» → число (как у core/saveini.mjs).

const SECTION = 'currencies';
const PREFIX = 'ore_sell_locked_';

/** Ключ словаря для строки k. */
function fieldKey(k) {
  return `${SECTION}/${PREFIX}${k}`;
}

/** Номер строки должен быть целым в 0…n−1 (иначе ошибка). */
function checkIndex(locks, k) {
  if (!Number.isInteger(k) || k < 0 || k >= locks.length) {
    throw new RangeError(`oresell: строка ${k} вне 0…${locks.length - 1}`);
  }
}

/** Число полей замков в раскладке сейва (правило 5). */
export function lockFieldCount(saveData) {
  const { columns, rows } = saveData.tables.iniLayout;
  const iSec = columns.indexOf('section');
  const iKey = columns.indexOf('key');
  let n = 0;
  for (const r of rows) {
    if (r[iSec] === SECTION && String(r[iKey]).startsWith(PREFIX)) n++;
  }
  return n;
}

/** Чтение флагов (правило 5): 1, если значение поля не 0; отсутствующее поле — 0. */
export function readLocks(dict, n) {
  const locks = new Array(n);
  for (let k = 0; k < n; k++) {
    const v = dict?.[fieldKey(k)];
    locks[k] = v !== undefined && v !== null && Number(v) !== 0 ? 1 : 0;
  }
  return locks;
}

/** Запись всех полей числами 0/1 (правило 5); возвращает тот же словарь. */
export function writeLocks(dict, locks) {
  for (let k = 0; k < locks.length; k++) dict[fieldKey(k)] = locks[k] ? 1 : 0;
  return dict;
}

/** Касание замка строки k (правило 2): флаг меняется на противоположный, остальные не трогаем. */
export function toggleLock(locks, k) {
  checkIndex(locks, k);
  const next = locks.slice();
  next[k] = next[k] ? 0 : 1;
  return next;
}

/** «Запереть все» (правило 3): все N флагов = 1. */
export function lockAll(locks) {
  return locks.map(() => 1);
}

/** «Отпереть все» (правило 4): все N флагов = 0. */
export function unlockAll(locks) {
  return locks.map(() => 0);
}

/** Заперта ли строка k (правило 1). */
export function isLocked(locks, k) {
  checkIndex(locks, k);
  return locks[k] === 1;
}
