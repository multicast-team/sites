// spec: bombs
// Перезарядка бомб (13 слотов) и таймер цепной бомбы (spec oracle/specs/bombs.md). Данные приходят аргументом.

export function makeBombs({ bombs }) {
  const c = bombs.constants;
  const col = bombs.tables.slots.columns;
  const slotCol = col.indexOf('slot');
  const secCol = col.indexOf('rechargeSeconds');
  const seconds = [];
  for (const row of bombs.tables.slots.rows) seconds[row[slotCol]] = row[secCol];

  // «a достигло b»: a ≥ b или b − a < эпсилон
  const reached = (a, b) => a >= b || b - a < c.epsilon;

  function newState(s) {
    return {
      charges: s.charges.slice(),
      cooldown: s.cooldown.slice(),
      capacity: s.capacity.slice(),
      chain: s.chain,
      counter: s.counter,
      paused: s.paused,
    };
  }

  function step(st, input) {
    const { dt, rechargeMulti, capacityCell } = input;
    for (let i = 0; i < c.slots; i++) {
      if (!(st.charges[i] < st.capacity[i])) continue;
      st.cooldown[i] = st.cooldown[i] + (dt * rechargeMulti);
      while (reached(st.cooldown[i], seconds[i])) {
        st.cooldown[i] = st.cooldown[i] - seconds[i];
        st.charges[i] = i === c.uncappedSlot
          ? st.charges[i] + 1
          : Math.min(st.charges[i] + 1, capacityCell);
      }
    }
    if (st.chain > 0 && !st.paused) st.counter = st.counter + (dt * c.framesPerSecond);
    if (reached(st.counter, c.chainFrames)) {
      st.counter = st.counter - c.chainFrames;
      if (st.chain > 0) st.chain = st.chain - 1;
    }
    return st;
  }

  function snapshot(st) {
    return newState(st);
  }

  return { newState, step, snapshot };
}
