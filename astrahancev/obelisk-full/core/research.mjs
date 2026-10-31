// spec: research
// Construct, вкладка Research: исследование и удвоение жил, частота жил, замки вкладок, касания кнопок.
// Код по спеке oracle/specs/research.md (правила 1–14, интерфейс). Данные — data/systems/research.json; передаёт вызывающий: ядро само в файлы не ходит.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}

/** @param {object} researchData содержимое data/systems/research.json */
export function makeResearch(researchData) {
  const C = researchData.constants;
  const researchRows = tableRows(researchData.tables.research);
  const doubleRows = tableRows(researchData.tables.double);
  const zones = tableRows(researchData.tables.zones);
  const buttons = tableRows(researchData.tables.buttons);
  const tabs = tableRows(researchData.tables.tabs);

  // правила 1–3
  function offer(state, kind) {
    if (kind === 'research') {
      if (!(state.research < C.levels)) return null;
      const L = state.research;
      const row = researchRows[L];
      let costB = row.costB;
      let costC = row.costC;
      if (state.obelisk < C['bigCost.obeliskMin'] && L >= C['bigCost.fromLevel']) {
        costB = C['bigCost.lowValue'];
        costC = C['bigCost.lowValue'];
      }
      return {
        level: L,
        vein: row.vein,
        veinCost: row.veinCost,
        gems: 0,
        bars: [[row.barB, costB], [row.barC, costC]],
        worldReq: row.worldReq,
      };
    }
    if (kind === 'double') {
      if (!(state.double < state.research && state.double < C.levels)) return null;
      const L = state.double;
      const row = doubleRows[L];
      return {
        level: L,
        vein: null,
        veinCost: 0,
        gems: row.gems,
        bars: [[row.barB, row.costB], [row.barC, row.costC]],
        worldReq: row.worldReq,
      };
    }
    return null;
  }

  // правило 5
  function enough(stock, price) {
    return stock - price >= -C['afford.eps'];
  }

  // правила 4–5
  function canBuy(state, kind) {
    const o = offer(state, kind);
    if (!o) return false;
    if (!(state.world >= o.worldReq)) return false;
    if (kind === 'research' && !enough(state.veins[o.vein], o.veinCost)) return false;
    if (kind === 'double' && !enough(state.gems, o.gems)) return false;
    for (const [bar, cost] of o.bars) {
      if (!enough(state.bars[bar], cost)) return false;
    }
    return true;
  }

  // правило 8
  function openMenu() {
    return { tab: 0, armed: { research: 0, double: 0 } };
  }

  // правила 6, 8–10
  function press(state, menu, kind) {
    const next = {
      ...state,
      bars: state.bars.slice(),
      veins: state.veins.slice(),
    };
    const nextMenu = { ...menu, armed: { ...menu.armed } };
    const events = [];
    if (kind !== 'research' && kind !== 'double') return { state: next, menu: nextMenu, events };
    if (menu.tab !== 0) return { state: next, menu: nextMenu, events };
    if (!canBuy(state, kind)) return { state: next, menu: nextMenu, events };
    if (menu.armed[kind] < C['confirm.taps'] - 1) {
      nextMenu.armed[kind] = menu.armed[kind] + 1;
      return { state: next, menu: nextMenu, events };
    }
    const o = offer(state, kind);
    const L = o.level;
    const name = zones[L].name;
    nextMenu.armed[kind] = 0;
    if (kind === 'research') {
      next.veins[o.vein] = next.veins[o.vein] - o.veinCost;
    } else {
      next.gems = next.gems - o.gems;
      next.gemsSpent = next.gemsSpent + o.gems;
    }
    next.bars[o.bars[0][0]] = next.bars[o.bars[0][0]] - o.bars[0][1];
    next.bars[o.bars[1][0]] = next.bars[o.bars[1][0]] - o.bars[1][1];
    if (kind === 'research') {
      next.research = state.research + 1;
      events.push({
        group: C['log.unlock.group'],
        text: fill(L === 0 ? C['log.unlock.first'] : C['log.unlock.next'], { zone: L, name }),
      });
    } else {
      next.double = state.double + 1;
      events.push({ group: C['log.gems.group'], text: fill(C['log.gems'], { gems: o.gems }) });
      events.push({ group: C['log.double.group'], text: fill(C['log.double'], { zone: L, name }) });
    }
    return { state: next, menu: nextMenu, events };
  }

  // правила 6–7
  function buttonAt(x, y, tab) {
    for (const b of buttons) {
      if (tab === b.tab && x >= b.x1 && x < b.x2 && y >= b.y1 && y < b.y2) return b.button;
    }
    return null;
  }

  // правило 13
  function spawnRate(state, zone) {
    if (zone >= zones.length) return 0;
    if (state.research <= zone) return 0;
    const rate = state.multi / zones[zone].divisor;
    return state.double > zone ? C['rate.double'] * rate : rate;
  }

  // правило 14
  function tabsUnlocked(state) {
    return tabs.map((t) => (state.research >= t.researchMin && !(t.closedWhenCheating && state.cheating === 1) ? 1 : 0));
  }

  return { offer, canBuy, openMenu, press, buttonAt, spawnRate, tabsUnlocked };
}
