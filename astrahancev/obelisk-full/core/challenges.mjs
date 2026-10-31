// spec: challenges
// Испытания: прогресс, пересчёт от состояния, готовность, сдача, ступени и видимые строки (все 0…100).
// Код по спеке oracle/specs/challenges.md (правила 1–7). Данные — data/systems/challenges.json, их передаёт вызывающий:
// ядро само в файлы не ходит. Входы не меняются: каждая операция возвращает новое состояние.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} data содержимое data/systems/challenges.json */
export function makeChallenges(data) {
  const C = data.constants;
  const labels = [C['label.normal'], C['label.extreme'], C['label.divine']];
  const chain = new Map(tableRows(data.tables.chain).map((r) => [r.id, r]));
  const rules = tableRows(data.tables.stateRules);
  const eps = C.epsilon;
  const tierStart = [0, C['tier.extremeFrom'], C['tier.divineFrom']];

  // Правило 1: сравнения с эпсилоном.
  const eq = (a, b) => Math.abs(a - b) <= eps;
  const ge = (a, b) => a > b || eq(a, b);
  const lt = (a, b) => !ge(a, b);

  /** Правило 6: ступень номера. */
  function tier(id) {
    if (ge(id, C['tier.divineFrom'])) return 2;
    if (ge(id, C['tier.extremeFrom'])) return 1;
    return 0;
  }

  function label(id) {
    const t = tier(id);
    return labels[t] + String(id - tierStart[t] + 1);
  }

  function info(id) {
    const row = chain.get(id);
    return { id, tier: tier(id), label: label(id), text: row?.text, req: row?.req, reward: row?.reward };
  }

  const copy = (s) => ({ ...s, coins: [...s.coins] });

  /** Правило 2: событие прогресса. */
  function progress(state, id, mode, n) {
    const s = copy(state);
    if (lt(s.obelisk, C.obeliskReq) || !eq(id, s.challengeId)) return s;
    if (mode === C['mode.add']) s.progress = s.progress + n;
    else if (mode === C['mode.max']) s.progress = s.progress > n ? s.progress : n;
    return s;
  }

  // Правило 3: слагаемые и условия.
  const terms = {
    value: (v) => v,
    minus1: (v) => v - 1,
    cap: (v, arg) => (v < arg ? v : arg),
  };
  const conds = {
    eq: (v, arg) => eq(v, arg),
    ge: (v, arg) => ge(v, arg),
    le: (v, arg) => ge(arg, v),
  };

  // Группы строк по номеру (порядок строк сохраняется).
  const groups = [];
  for (const r of rules) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.id === r.id) last.rows.push(r);
    else groups.push({ id: r.id, rows: [r] });
  }

  /** Правило 3: пересчёт прогресса от состояния. */
  function fromState(state, view) {
    let s = copy(state);
    for (const g of groups) {
      const vals = g.rows.map((r) => {
        const src = view[r.source];
        return r.index === null || r.index === undefined ? src : src[r.index];
      });
      if (g.rows.every((r) => conds[r.transform] === undefined)) {
        let sum = terms[g.rows[0].transform](vals[0], g.rows[0].arg);
        for (let i = 1; i < g.rows.length; i++) sum = sum + terms[g.rows[i].transform](vals[i], g.rows[i].arg);
        s = progress(s, g.id, C['mode.max'], sum);
      } else if (g.rows.every((r, i) => conds[r.transform](vals[i], r.arg))) {
        s = progress(s, g.id, C['mode.max'], 1);
      }
    }
    return s;
  }

  /** Правило 4: готовность. */
  function checkReady(state) {
    const s = copy(state);
    const row = chain.get(s.challengeId);
    s.ready = row !== undefined && lt(s.challengeId, C.readyIdLimit) && ge(s.obelisk, C.obeliskReq) && ge(s.progress, row.req) ? 1 : 0;
    return s;
  }

  /** Правило 5: сдача. */
  function complete(state) {
    const s = copy(state);
    const row = chain.get(s.challengeId);
    if (row !== undefined) s.coins[tier(s.challengeId)] += row.reward;
    s.challengeId = s.challengeId + 1;
    s.progress = 0;
    return s;
  }

  /** Правило 7: видимые строки меню. */
  function visible(challengeId) {
    const out = [];
    for (let k = 0; k < C['visible.count']; k++) {
      const id = challengeId + k;
      if (!lt(id, C['visible.idLimit'])) break;
      out.push(info(id));
    }
    return out;
  }

  return { tier, label, info, progress, fromState, checkReady, complete, visible };
}
