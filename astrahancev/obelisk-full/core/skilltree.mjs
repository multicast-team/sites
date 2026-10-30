// spec: skilltree
// Дерево навыков: цена, доступность, замок, покупка двумя касаниями. Код по спеке oracle/specs/skilltree.md (правила 1–5, 10, 11).
// Данные — data/systems/skilltree.json; передаёт вызывающий: ядро само в файлы не ходит.

const AUTO_CAST_NODE = 69;

function roundHalfEven(x) {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5) return f;
  if (d > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

/** @param {object} treeData содержимое data/systems/skilltree.json */
export function makeSkillTree(treeData) {
  const t = treeData.tables.nodes;
  const nodes = t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const growth = treeData.constants['cost.growth'];
  const highFrom = treeData.constants['cost.highModeFromObelisk'];

  function cost(node, level, obelisk) {
    const n = nodes[node];
    if (n.cap === 1) return n.cost;
    let c = n.cost;
    for (let i = 0; i < level; i++) c = c * growth; // 1.25^L точно
    return obelisk >= highFrom ? Math.floor(c + 0.5) : roundHalfEven(c);
  }

  function available(node, levels) {
    const n = nodes[node];
    return n.root ? 1 : levels[n.parent];
  }

  function locked(node, obelisk) {
    return obelisk < nodes[node].obeliskReq;
  }

  function canBuy(node, state) {
    const { levels, skillPoints, obelisk } = state;
    return available(node, levels) > 0 && !locked(node, obelisk) && levels[node] < nodes[node].cap &&
      skillPoints >= cost(node, levels[node], obelisk);
  }

  return {
    count: nodes.length,
    cost,
    available,
    locked,
    canBuy,
    menu(levels, obelisk) {
      return {
        cost: nodes.map((_, i) => cost(i, levels[i], obelisk)),
        available: nodes.map((_, i) => available(i, levels)),
        locked: nodes.map((_, i) => locked(i, obelisk)),
      };
    },
    press(state, node) {
      const next = { ...state, levels: Array.from(state.levels) };
      if (!canBuy(node, state)) return next;
      if (!state.armed) { next.armed = 1; return next; }
      next.skillPoints = state.skillPoints - cost(node, state.levels[node], state.obelisk);
      next.levels[node] = state.levels[node] + 1;
      next.armed = 0;
      return next;
    },
    nodesBought(levels) {
      let n = 0;
      for (const l of levels) if (l > 0) n++;
      return n;
    },
    autoCastUnlocked(levels) {
      return levels[AUTO_CAST_NODE] > 0;
    },
  };
}
