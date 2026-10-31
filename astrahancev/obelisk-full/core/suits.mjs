// spec: suits-a, suits-b
// Костюмы дронов 0–4: надет, заправлен, вклад в клетки сводки.
// Код по спекам oracle/specs/suits-a.md (правила 1–12) и suits-b.md (правила 2, 4, 5, интерфейс). Данные — data/systems/suits.json; передаёт вызывающий: ядро само в файлы не ходит.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} suitsData содержимое data/systems/suits.json */
export function makeSuits(suitsData) {
  const C = suitsData.constants;
  const effects = tableRows(suitsData.tables.effects);
  const abilities = tableRows(suitsData.tables.abilities);
  const steps = tableRows(suitsData.tables.steps);

  function ability(suit, kind) {
    return abilities.find((a) => a.suit === suit && a.kind === kind);
  }

  // правило 1: номер костюма s + смещение есть среди первых n слотов
  function worn(state, n) {
    const out = [];
    for (let s = 0; s < C.count; s++) {
      let on = false;
      for (let i = 0; i < state.slots.length && i < n; i++) {
        if (state.slots[i] === s + C['slot.offset']) on = true;
      }
      out.push(on);
    }
    return out;
  }

  // правило 2: надет и топлива строго больше минимума
  function fueled(state, n) {
    const w = worn(state, n);
    return w.map((on, s) => on && state.fuel[s] > C['fuel.min']);
  }

  function condition(e, w, f) {
    const ok = e.when === 'always' ? true : e.when === 'worn' ? w[e.suit] : e.when === 'fueled' ? f[e.suit] : null;
    if (ok === null) throw new Error(`suits: неизвестное условие ${e.when}`);
    return ok;
  }

  // правило 2 suits-b: t = A + B · (L + offset)
  function term(e, state) {
    const L = e.level === 'upgrade' ? state.upgrade[e.suit] : state.grade[e.suit];
    return e.start + e.step * (L + (e.offset ?? 0));
  }

  // правила 3–5: строки effects по порядку таблицы; строки с ключом ext — шаги движка (externals)
  function apply(cells, state, n) {
    const out = { ...cells };
    const w = worn(state, n);
    const f = fueled(state, n);
    for (const e of effects) {
      if (e.ext) continue;
      if (!condition(e, w, f)) continue;
      if (!(e.cell in out)) throw new Error(`suits: нет клетки ${e.cell}`);
      const t = term(e, state);
      out[e.cell] = e.op === 'mul' ? out[e.cell] * t : out[e.cell] + t;
    }
    return out;
  }

  // правило 4 suits-b: внешние значения «ключ → t» строк с ext, условие которых выполнено
  function externals(state, n) {
    const out = {};
    const w = worn(state, n);
    const f = fueled(state, n);
    for (const e of effects) {
      if (!e.ext || !condition(e, w, f)) continue;
      out[e.ext] = term(e, state);
    }
    return out;
  }

  // правило 5 suits-b: копия деклараций statrules со вставленными и заменёнными шагами
  function rules(rulesData) {
    const columns = [...rulesData.tables.rules.columns];
    const ix = Object.fromEntries(columns.map((c, i) => [c, i]));
    let rows = rulesData.tables.rules.rows.map((r) => [...r]);
    for (const st of steps) {
      const own = rows.map((r, i) => i).filter((i) => rows[i][ix.cell] === st.cell);
      const hasAnchor = (r) => (st.source == null ? r[ix.op] === 'start' : r[ix.source] === st.source && r[ix.row] === st.row);
      const hit = own.filter((i) => hasAnchor(rows[i]));
      if (!hit.length) throw new Error(`suits: нет шага-якоря для ${st.cell}`);
      const num = rows[hit[0]][ix.step];
      if (st.mode === 'replace') {
        const r = rows[hit[0]];
        if (r[ix.op] !== 'mulTerm') throw new Error(`suits: якорь замены ${st.cell} не mulTerm`);
        r[ix.op] = st.op;
        r[ix.ref] = st.ext;
      } else if (st.mode === 'after') {
        let last = hit[0];
        for (const i of own) if (rows[i][ix.step] === num) last = i;
        const row = columns.map(() => null);
        row[ix.cell] = st.cell;
        row[ix.step] = num + 0.5;
        row[ix.op] = st.op;
        row[ix.ref] = st.ext;
        rows.splice(last + 1, 0, row);
      } else throw new Error(`suits: неизвестный режим ${st.mode}`);
    }
    return { ...rulesData, tables: { ...rulesData.tables, rules: { ...rulesData.tables.rules, columns, rows } } };
  }

  // правило 9: раз в periodFrames кадров бомба стреляет, если зарядов не меньше капа
  function autobomb(suit, frame, charges, caps) {
    const a = ability(suit, 'autobomb');
    if (!a || frame <= 0 || frame % C['autobomb.periodFrames'] !== 0) return -1;
    return charges[a.bomb] >= caps[a.bomb] ? a.bomb : -1;
  }

  // правило 10: период бомбы лягушки в кадрах
  function frogPeriod(upgrade) {
    return C['frog.baseFrames'] - C['frog.stepFrames'] * upgrade;
  }

  function frogFires(suit, frame, upgrade) {
    if (!ability(suit, 'frogBomb') || frame <= 0) return false;
    return frame % frogPeriod(upgrade) === 0;
  }

  // правило 11: золото + доля · цена продажи (сначала произведение)
  function midasGold(gold, ratio, sell) {
    return gold + ratio * sell;
  }

  return { worn, fueled, apply, externals, rules, autobomb, frogPeriod, frogFires, midasGold };
}
