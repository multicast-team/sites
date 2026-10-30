// spec: chests
// Генераторы ГСЧ игры: WELL512a (16 слов + индекс), отдельные от встроенного ГСЧ. Код по спеке oracle/specs/chests.md (правила 1–4).

const INV32 = 1 / 4294967296; // 2^-32

/** @param {{state:number[], index:number}} snap снимок: 16 слов uint32 и индекс 0..15 (копируется) */
export function makeGameRng(snap) {
  const s = snap.state.map((x) => x >>> 0);
  let k = snap.index & 15;
  if (s.length !== 16) throw new Error('gamerng: нужно 16 слов состояния');

  // правило 2: шаг WELL512a
  function u32() {
    const a = s[k];
    let c = s[(k + 13) & 15];
    const b = a ^ c ^ (a << 16) ^ (c << 15);
    c = s[(k + 9) & 15];
    c ^= c >>> 11;
    const a2 = (b ^ c) >>> 0;
    s[k] = a2;
    const d = a2 ^ ((a2 << 5) & 0xda442d24);
    k = (k + 15) & 15;
    const old = s[k];
    s[k] = (old ^ b ^ d ^ (old << 2) ^ (b << 18) ^ (c << 28)) >>> 0;
    return s[k];
  }

  // правило 4
  function irandomRange(a, b) {
    const x = Math.trunc(a);
    const y = Math.trunc(b);
    const lo = Math.min(x, y);
    const hi = Math.max(x, y);
    return lo + (u32() % (hi - lo + 1));
  }

  function irandom(n) {
    return u32() % (Math.trunc(n) + 1);
  }

  function random(n) {
    return (u32() * INV32) * n;
  }

  function randomRange(a, b) {
    return a + (u32() * INV32) * (b - a);
  }

  function snapshot() {
    return { state: Array.from(s), index: k };
  }

  return { u32, irandomRange, irandom, random, randomRange, snapshot };
}

// правило 3: начальное состояние новой игры
export function newGameRng(state0) {
  const state = [state0 >>> 0];
  for (let i = 0; i < 15; i++) {
    state.push(((state[i] * 214013 + 2531011) >>> 0) >>> 16);
  }
  return makeGameRng({ state, index: 0 });
}
