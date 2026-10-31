// spec: lootbug
// Лутбаг: появление по таймеру и из банка, золотой и тройной, бросок лута free/paid, цена paid, активность баффов.
// Код по спеке oracle/specs/lootbug.md (правила 0–10). Данные — data/systems/lootbug.json, передаёт вызывающий.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} data содержимое data/systems/lootbug.json */
export function makeLootbug(data) {
  const C = data.constants;
  const EPS = C['compare.eps'];
  const loot = tableRows(data.tables.loot);
  const conditions = tableRows(data.tables.conditions);
  const gates = tableRows(data.tables.gates).sort((a, b) => a.order - b.order);
  const baseWeights = {};
  for (const r of loot) (baseWeights[r.table] ??= [])[r.row] = r.weight;
  const priceOf = {};
  for (const r of loot) if (r.table === 'paid') priceOf[r.row] = r.price;

  // правило 0: сравнения с допуском
  const eq = (a, b) => Math.abs(a - b) <= EPS;
  const ge = (a, b) => eq(a, b) || a > b;
  const gt = (a, b) => a - b > EPS;
  const le = (a, b) => eq(a, b) || a < b;

  // правило 4/5: шанс «a из b», U — 63 бита
  const chanceRoll = (a, b, U) => le(Number(U % BigInt(b)) + 1, a);
  const gameU63 = (g) => {
    const lo = BigInt(g.u32());
    const hi = BigInt(g.u32()) & 0x7fffffffn;
    return lo | (hi << 32n);
  };

  function weights(gate) {
    const w = {};
    for (const t of Object.keys(baseWeights)) w[t] = baseWeights[t].slice();
    const open = {};
    for (const c of conditions) {
      const v = Number(gate[c.input]);
      open[c.gate] = (open[c.gate] ?? true) && ge(v, c.min);
    }
    for (const g of gates) {
      if (!open[g.gate]) continue;
      if (g.op === 'set') w[g.table][g.row] = g.value;
      else w[g.table][g.row] += g.value;
    }
    return w;
  }

  function roll(table, gate, lootRng) {
    const u = lootRng.u32();
    if (table !== 'free' && table !== 'paid') return C['roll.other'];
    const ws = weights(gate)[table];
    let S = 0;
    for (const x of ws) S += x;
    const r = u % (S + 1);
    let acc = 0;
    for (let i = 0; i < ws.length; i++) {
      acc += ws[i];
      if (le(r, acc)) return i;
    }
    return C['roll.other'];
  }

  function price(row, reduction) {
    return priceOf[row] - reduction;
  }

  function spawn(world, chances, tripleRng, rng) {
    if (world.bugs.length > 0) return 0;
    const triple = chanceRoll(chances.triple, C['chance.of'], gameU63(tripleRng));
    const n = triple ? 1 + C['triple.extra'] : 1;
    for (let i = 0; i < n; i++) {
      const golden = chanceRoll(chances.golden, C['chance.of'], rng.u63());
      world.bugs.push({ golden });
    }
    return n;
  }

  function step(world, inp, tripleRng, rng) {
    world.counter += inp.dt;
    const req = C['time.required'] / inp.rate;
    if (ge(world.counter, req)) {
      world.banked = Math.min(world.banked + 1, inp.cap);
      if (le(inp.cap, 0)) spawn(world, { triple: inp.triple, golden: inp.golden }, tripleRng, rng);
      world.bankTimer = C['bank.spawnAt'];
      world.counter -= req;
    }
    world.bankTimer += C['bank.step'] * inp.dt;
    if (ge(world.bankTimer, C['bank.cost'])) {
      if (world.bugs.length === 0 && gt(world.banked, 0)) {
        spawn(world, { triple: inp.triple, golden: inp.golden }, tripleRng, rng);
        world.banked -= 1;
      }
      world.bankTimer -= C['bank.cost'];
    }
  }

  function buffActive(value) {
    return gt(value, 0);
  }

  return { weights, roll, price, spawn, step, buffActive };
}
