// spec: npe
// NPE: экран хаба и меню, гейты плиток, закрытие заданий, кнопка обелиска и бой, открытие запертых меню.
// Код по спеке oracle/specs/npe.md (правила 1–12). Данные — hub.json, obelisk.json, tasks.json + taskrules.json, boot.json;
// их передаёт вызывающий: ядро само в файлы не ходит.

import { makeTasks } from './tasks.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {{hub:object, obelisk:object, tasks:object, boot:object}} data
 */
export function makeNpe({ hub, obelisk, tasks, boot }) {
  const C = hub.constants;
  const tiles = tableRows(hub.tables.tiles);
  const buttons = Object.fromEntries(tableRows(hub.tables.buttons).map((b) => [b.name, b]));
  const menus = tableRows(obelisk.tables.menus);
  const menuOf = new Map(menus.map((m) => [m.menu, m]));
  const claimer = makeTasks(tasks);
  const zeroCounters = Object.fromEntries(tableRows(tasks.tables.onStart).map((r) => [r.counter, 0]));
  const T = boot.constants;
  const hit = (b, x, y) => x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2;

  function initial() {
    return {
      screen: C.noScreen, shown: 0, fight: 0, task: 1, visited: menus.map(() => 0),
      cooldown: 0, fought: 0, unlock: null,
    };
  }

  const hubOpen = (s) => s.shown === 1 && s.screen === C.noScreen && s.fight === 0 && s.unlock === null;

  function tileTap(s, x, y, ext) {
    if (!hubOpen(s)) return null;
    const t = tiles.find((r) => hit(r, x, y));
    if (!t) return null;
    const m = menuOf.get(t.screen);
    if (!m) return s.task >= t.minTask ? { ...s, screen: t.screen } : null;
    if (ext.obeliskLevel < m.level) return null;
    if (s.visited[m.index] === 1) return { ...s, screen: t.screen };
    return { ...s, unlock: { index: m.index, left: C.unlockFrames + 1 } };
  }

  function hubButton(s) {
    if (s.fight === 1) return null;
    if (hubOpen(s)) return { ...s, shown: 0 };
    return { ...s, screen: C.noScreen, shown: 1 };
  }

  function closeButton(s) {
    if (s.fight === 1 && s.screen === C.noScreen) return null;
    return { ...s, screen: C.noScreen, shown: 0 };
  }

  function taskButton(s, ext) {
    if (s.shown !== 0) return null;
    const g = claimer.goal(s.task);
    if (g === null || ext.taskProgress < g) return null;
    const need = tasks.constants['final.item'];
    const r = claimer.claim({
      task: s.task, taskProgress: ext.taskProgress, gems: 0, dronePoints: 0,
      consumables: new Array(need + 1).fill(0), freebieCountdown: 0,
    }, zeroCounters);
    return r === null ? null : { ...s, task: r.task };
  }

  function obeliskButton(s) {
    if (s.task < C.obeliskButtonTask) return null;
    if (s.shown === 0) return { ...s, screen: C.obeliskScreen, shown: 1 };
    if (s.fight === 1 && s.screen === C.noScreen) return { ...s, screen: C.obeliskScreen };
    return null;
  }

  function attackButton(s) {
    if (s.screen !== C.obeliskScreen) return null;
    if (s.cooldown === 0) {
      return { ...s, screen: C.noScreen, fight: 1, shown: 1, cooldown: C.fightCooldown, fought: s.fought + 1 };
    }
    return { ...s, screen: C.noScreen, fight: 0, shown: 0 };
  }

  function down(state, x, y, ext) {
    const s = { ...state, visited: state.visited.slice() };
    if (ext.overlay) return s;
    const tries = [
      () => tileTap(s, x, y, ext),
      () => (hit(buttons.hub, x, y) ? hubButton(s) : null),
      () => (hit(buttons.close, x, y) ? closeButton(s) : null),
      () => (hit(buttons.task, x, y) ? taskButton(s, ext) : null),
      () => (hit(buttons.obelisk, x, y) ? obeliskButton(s) : null),
      () => (hit(buttons.attack, x, y) ? attackButton(s) : null),
    ];
    for (const f of tries) {
      const r = f();
      if (r !== null) return r;
    }
    return s;
  }

  function step(state, frame, ext) {
    const s = { ...state, visited: state.visited.slice() };
    if (s.unlock !== null) {
      const left = s.unlock.left - 1;
      if (left <= 0) {
        s.visited[s.unlock.index] = 1;
        s.unlock = null;
      } else {
        s.unlock = { index: s.unlock.index, left };
      }
    }
    const tick = ext && typeof ext.tick === 'boolean'
      ? ext.tick
      : frame >= T.startFrame && (frame - T.startFrame) % T.secondPeriod === 0;
    if (tick && s.cooldown > 0) s.cooldown -= 1;
    return s;
  }

  function view(state, ext) {
    return { screen: state.screen, shown: state.shown === 1 || (ext && ext.overlay) ? 1 : 0 };
  }

  return { initial, down, step, view };
}
