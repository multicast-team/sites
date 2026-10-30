// spec: logs
// Журналы: отладки сессии (запуск, попытки связи wss) и игрока (группы, фильтр, бюджет).
// Код по спеке oracle/specs/logs.md (правила 1–9). Данные — data/systems/logs.json,
// их передаёт вызывающий: ядро само в файлы не ходит.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

// Дата по UTC из секунд UNIX: алгоритм дней гражданского календаря.
function utcDate(seconds) {
  const days = Math.floor(seconds / 86400);
  const rest = seconds - days * 86400;
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  const h = Math.floor(rest / 3600);
  const m = Math.floor((rest - h * 3600) / 60);
  const s = rest - h * 3600 - m * 60;
  return `${pad(year, 4)}/${pad(month, 2)}/${pad(day, 2)} ${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}`;
}

/** @param {object} data содержимое data/systems/logs.json */
export function makeLogs(data) {
  const C = data.constants;
  const boot = tableRows(data.tables.debugBoot).sort((a, b) => a.order - b.order);
  const wss = tableRows(data.tables.debugWss).sort((a, b) => a.step - b.step);
  const once = tableRows(data.tables.debugOnce);
  const filterOf = new Map(tableRows(data.tables.playerGroups).map((r) => [r.group, r.filter]));
  const allFilter = -1;

  let clock = 0;
  let session = 0;
  let pending = [];
  let lines = [];
  let log = [];

  function formatDebugLine(level, time, text) {
    return `[${level}][${utcDate(time)}] ${text}`;
  }

  function write(level, time, text) {
    lines.push({ level, time, text, line: formatDebugLine(level, time, text) });
  }

  function startSession({ clock: start, saveFound }) {
    clock = start;
    session = 0;
    lines = [];
    pending = [];
    for (const r of boot) {
      if (r.when === 'always' || (r.when === 'saveFound' && saveFound)) write(r.level, clock, r.text);
    }
    // Момент, порядок внутри момента (разовые раньше попыток), уровень, текст.
    for (const r of once) pending.push({ at: r.atSeconds, rank: 0, rows: [r] });
    for (let k = 1; k <= C['wss.maxRetries']; k++) {
      const rows = wss.filter((r) => r.when === 'always' || (r.when === 'retry' && k < C['wss.maxRetries']) || (r.when === 'last' && k === C['wss.maxRetries']));
      pending.push({ at: k * C['wss.periodSeconds'], rank: 1, rows });
    }
    pending.sort((a, b) => a.at - b.at || a.rank - b.rank);
  }

  function advance(seconds) {
    session += seconds;
    while (pending.length > 0 && pending[0].at <= session) {
      const ev = pending.shift();
      for (const r of ev.rows) write(r.level, clock + ev.at, r.text);
    }
  }

  function now() {
    return clock + Math.floor(session);
  }

  function debugLines() {
    return lines.map((l) => ({ ...l }));
  }

  function filterValue(filter) {
    if (filter === 'all') return allFilter;
    if (!filterOf.has(filter)) throw new Error(`logs: неизвестный фильтр ${filter}`);
    return filterOf.get(filter);
  }

  function addEntry(group, text, time = now()) {
    if (!filterOf.has(group)) throw new Error(`logs: неизвестная группа ${group}`);
    log.push({ group, text, time });
    let count = 0;
    for (const e of log) if (e.group === group) count++;
    let extra = count - C['player.groupBudget'];
    if (extra > 0) {
      log = log.filter((e) => {
        if (e.group === group && extra > 0) {
          extra--;
          return false;
        }
        return true;
      });
    }
  }

  function entries(filter = 'all') {
    if (filter !== 'all') filterValue(filter);
    return log.filter((e) => filter === 'all' || e.group === filter).map((e) => ({ ...e }));
  }

  return { startSession, advance, now, debugLines, formatDebugLine, addEntry, entries, filterValue };
}
