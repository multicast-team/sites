// spec: statues
// Construct → вкладка Statues, статуи набора 1: ярус, цены, «хватает», замки, касание кнопки Build с подтверждением, постройка,
// зона кнопки, внешние значения для стат-движка и шаги в декларациях. Код по спеке oracle/specs/statues.md (правила 1–14).
// Данные — data/systems/statues.json; их передаёт вызывающий: ядро само в файлы не ходит.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} statuesData содержимое data/systems/statues.json
 */
export function makeStatues(statuesData) {
  const k = statuesData.constants;
  const T = Object.fromEntries(Object.entries(statuesData.tables).map(([n, t]) => [n, tableRows(t)]));
  const count = k.statues;
  const buttonRow = T.buttons.find((b) => b.tab === k.tab);

  // правила 1–2: ярус набора и замок
  function tierOf(state) {
    let t = Infinity;
    for (const l of state.statues) if (l < t) t = l;
    return t;
  }

  function lockedText(state, t) {
    if (t >= k.tiers) return T.locked.find((r) => r.tier === t).text;
    if (t === k.tiers - 1 && state.obelisk < k['platinum.obeliskMin']) return T.locked.find((r) => r.tier === t).text;
    return null;
  }

  // правило 3: позиции цены по ярусу и номеру цены
  function priceOf(state, t) {
    let n = 0;
    for (const l of state.statues) if (l > t) n++;
    const items = T.costs
      .filter((r) => r.tier === t && r.k === n)
      .sort((a, b) => a.item - b.item)
      .map((r) => ({ type: r.type, id: r.id, cost: r.cost }));
    return { k: n, items };
  }

  function stock(state, it) {
    if (it.type === 'bar') return state.bars[it.id];
    if (it.type === 'vein') return state.veins[it.id];
    return state.gems;
  }

  function offer(state) {
    const t = tierOf(state);
    const locked = lockedText(state, t);
    if (locked !== null) return { tier: t, locked };
    const p = priceOf(state, t);
    const candidates = [];
    state.statues.forEach((l, i) => { if (l === t) candidates.push(i); });
    return { tier: t, k: p.k, items: p.items, candidates };
  }

  // правила 2, 4
  function canBuy(state) {
    const o = offer(state);
    if (o.locked !== undefined) return false;
    return o.items.every((it) => stock(state, it) - it.cost >= -k['afford.eps']);
  }

  function openMenu(tab = k.tab) {
    return { tab, armed: 0, reveal: -1 };
  }

  function close(menu) {
    return { ...menu, reveal: -1 };
  }

  function format(text, vars) {
    return text.replace(/\{(\w+)\}/g, (_, n) => String(vars[n]));
  }

  // правила 6–8, 10
  function press(state, menu, pick) {
    const same = () => ({
      state: { ...state, statues: [...state.statues], bars: [...state.bars], veins: [...state.veins] },
      menu: { ...menu },
      events: [],
      built: false,
    });
    if (menu.tab !== k.tab || menu.reveal >= 0) return same();
    if (!canBuy(state)) return same();
    if (menu.armed + 1 < k['confirm.taps']) {
      const r = same();
      r.menu.armed = menu.armed + 1;
      return r;
    }
    const o = offer(state);
    if (!o.candidates.includes(pick)) throw new Error(`statues: статуя ${pick} не кандидат`);
    const next = { ...state, statues: [...state.statues], bars: [...state.bars], veins: [...state.veins] };
    let gems = 0;
    for (const it of o.items) {
      if (it.type === 'bar') next.bars[it.id] = next.bars[it.id] - it.cost;
      else if (it.type === 'vein') next.veins[it.id] = next.veins[it.id] - it.cost;
      else { next.gems = next.gems - it.cost; gems = gems + it.cost; }
    }
    next.gemsSpent = next.gemsSpent + gems;
    next.statues[pick] = o.tier + 1;
    const events = [
      { group: k['log.gems.group'], text: format(k['log.gems'], { gems: Math.trunc(gems) }) },
      { group: k['log.built.group'], text: format(k['log.built'], { prefix: tierPrefix(o.tier + 1), name: T.statues[pick].name }) },
    ];
    return { state: next, menu: { ...menu, armed: 0, reveal: pick }, events, built: true };
  }

  // приставка яруса t + 1: «», «Gilded », «Platinum » — строки таблицы tiers с номером t
  function tierPrefix(level) {
    return T.tiers.find((r) => r.tier === level - 1).prefix;
  }

  // правило 9
  function buttonAt(x, y) {
    const b = buttonRow;
    return x >= b.x1 && x <= b.x2 && y >= b.y1 && y <= b.y2 ? 'build' : null;
  }

  // правила 11–12
  function externals(levels) {
    const out = {};
    for (const e of T.effects) if (levels[e.statue] === e.level) out[e.ext] = e.value;
    return out;
  }

  // правило 13
  function rules(rulesData, cellsData) {
    const cellsT = cellsData?.tables.cells;
    const cellIx = cellsT && Object.fromEntries(cellsT.columns.map((c, i) => [c, i]));
    const columns = [...rulesData.tables.rules.columns];
    const ix = Object.fromEntries(columns.map((c, i) => [c, i]));
    const rows = rulesData.tables.rules.rows.map((r) => [...r]);
    const blank = (cell, step, op) => {
      const row = columns.map(() => null);
      row[ix.cell] = cell; row[ix.step] = step; row[ix.op] = op;
      return row;
    };
    // новые декларации — в начале таблицы
    const freshBy = new Map();
    for (const s of T.steps) {
      const own = (list) => list.map((r, i) => i).filter((i) => list[i][ix.cell] === s.cell);
      if (s.mode === 'new') {
        let d = freshBy.get(s.cell);
        if (!d) {
          if (own(rows).length) throw new Error(`statues: у ${s.cell} уже есть декларация`);
          const base = cellsT?.rows.find((r) => r[cellIx.cell] === s.cell)?.[cellIx.base];
          if (base === undefined) throw new Error(`statues: нет клетки ${s.cell}`);
          const st = blank(s.cell, 0, 'start');
          st[ix.value] = base;
          d = [st];
          freshBy.set(s.cell, d);
        }
        const row = blank(s.cell, d.length, s.op);
        if (s.ext != null || s.ref != null) row[ix.ref] = s.ext ?? s.ref;
        d.push(row);
        continue;
      }
      const idx = own(rows);
      if (!idx.length) throw new Error(`statues: нет декларации ${s.cell}`);
      if (s.mode === 'end') {
        let top = -Infinity;
        for (const i of idx) if (rows[i][ix.step] > top) top = rows[i][ix.step];
        const row = blank(s.cell, top + 1, s.op);
        row[ix.ref] = s.ext ?? s.ref;
        rows.splice(idx[idx.length - 1] + 1, 0, row);
        continue;
      }
      const hit = idx.filter((i) => rows[i][ix.source] === s.source && rows[i][ix.row] === s.row);
      if (!hit.length) throw new Error(`statues: нет шага-якоря для ${s.cell}`);
      if (s.mode === 'replace') {
        const r = rows[hit[0]];
        if (r[ix.op] !== 'mulTerm') throw new Error(`statues: якорь замены ${s.cell} не mulTerm`);
        r[ix.op] = s.op;
        r[ix.ref] = s.ext;
      } else if (s.mode === 'after') {
        const num = rows[hit[0]][ix.step];
        let last = hit[0];
        for (const i of idx) if (rows[i][ix.step] === num || rows[i][ix.step] === num + 0.5) last = i;
        const row = blank(s.cell, num + 0.5, s.op);
        row[ix.ref] = s.ext;
        rows.splice(last + 1, 0, row);
      } else throw new Error(`statues: неизвестный режим ${s.mode}`);
    }
    const head = [...freshBy.values()].flat();
    return { ...rulesData, tables: { ...rulesData.tables, rules: { ...rulesData.tables.rules, columns, rows: [...head, ...rows] } } };
  }

  return { offer, canBuy, openMenu, press, close, buttonAt, externals, rules };
}
