// spec: chests
// Сундук предметов в игре: кнопка «открыть» меню, бросок, журнал игрока. Код по спеке oracle/specs/chests.md (правила 17–19).
// Данные (chests.json, items.json, relics.json, strings.json) передаёт вызывающий: ядро само в файлы не ходит.

import { makeGameRng } from './gamerng.mjs';
import { makeChests } from './chests.mjs';

const copyEntry = (e) => ({ ...e });

export function makeChestPlay({ chests, items, relics, strings }) {
  const C = chests.constants;
  const engine = makeChests({ chests, items, relics });
  const text = C['log.prefix'] + strings.strings[C['log.textKey']];
  const itemGen = C['items.generator'];

  function load({ chests: n, opened, items: it, gens, log }) {
    const g = {};
    for (const [id, snap] of Object.entries(gens)) g[id] = makeGameRng(snap);
    return {
      chests: n, opened, items: it.slice(), gens: g, log: log.map(copyEntry), menu: false,
    };
  }

  const openMenu = (st) => { st.menu = true; };
  const closeMenu = (st) => { st.menu = false; };

  // правило 19
  function addLog(st, unixSeconds) {
    const time = Math.floor(unixSeconds);
    const last = st.log[st.log.length - 1];
    if (last && last.text === text) {
      last.count += 1;
      last.time = time;
    } else {
      st.log.push({
        category: C['log.category'], colour: C['log.colour'], count: 1, height: C['log.height'],
        plain: false, text, time, wrap_width: C['log.wrapWidth'],
      });
    }
  }

  // правила 17–18
  function touch(st, { action, x, y, unixSeconds }) {
    if (action !== 0 || !st.menu) return 0;
    if (x < C['menu.items.open.x0'] || x > C['menu.items.open.x1']) return 0;
    if (y < C['menu.items.open.y0'] || y > C['menu.items.open.y1']) return 0;
    let done = 0;
    for (let i = 0; i < C['menu.items.open.count'] && st.chests >= 1; i++) {
      const r = engine.openItem(st.gens[itemGen], st.opened);
      st.items[r.item] += 1;
      st.opened = r.opened;
      st.chests -= 1;
      addLog(st, unixSeconds);
      done++;
    }
    return done;
  }

  function snapshot(st) {
    const gens = {};
    for (const [id, g] of Object.entries(st.gens)) gens[id] = g.snapshot();
    return { chests: st.chests, opened: st.opened, items: st.items.slice(), gens, log: st.log.map(copyEntry) };
  }

  return { load, openMenu, closeMenu, touch, snapshot };
}
