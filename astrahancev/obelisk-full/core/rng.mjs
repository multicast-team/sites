// spec: rng
// Встроенный ГСЧ рантайма: WELL512a, засев линейным конгруэнтным генератором (spec oracle/specs/rng.md, правила 1–10).
// Один генератор — одно состояние; 64-битная арифметика правил 2, 5, 7, 8 — точная, через BigInt.

const TWO63 = 9223372036854775808; // 2^63
const MIN64 = -(1n << 63n);
const MASK63 = (1n << 63n) - 1n;
const INV32 = 2.3283064365386963e-10; // 2^-32

// правило 2: усечение к нулю; NaN, ±inf, вне [−2^63, 2^63) → −2^63
function toInt64(x) {
  if (!(x >= -TWO63 && x < TWO63)) return MIN64;
  return BigInt(Math.trunc(x));
}

// правило 3: 32-битный сид без знака
function seedOf(x) {
  if (x >= 0 || Number.isNaN(x)) return Number(BigInt.asUintN(32, toInt64(x)));
  let t = Math.trunc(x);
  if (t < -2147483648) t = -2147483648;
  return t >>> 0;
}

export function makeRng(seed = 0) {
  const s = new Uint32Array(16);
  let k = 0;
  let saved = 0;

  function setSeed(x) {
    const S = seedOf(x);
    saved = S;
    let t = S;
    for (let i = 0; i < 16; i++) {
      t = (((t * 214013 + 2531011) >>> 0) >>> 16); // t·214013 + 2531011 < 2^53 — точно, >>> берёт по модулю 2^32
      s[i] = t;
    }
    k = 0;
  }

  // правило 4
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
    s[k] = old ^ b ^ d ^ (old << 2) ^ (b << 18) ^ (c << 28);
    return s[k];
  }

  // правило 5
  function u63() {
    const lo = BigInt(u32());
    const hi = BigInt(u32());
    return ((hi << 32n) | lo) & MASK63;
  }

  function random(n) {
    return (u32() * INV32) * n;
  }

  function randomRange(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return lo + (u32() * INV32) * (hi - lo);
  }

  function irandom(n) {
    const U = u63();
    const N = toInt64(n);
    if (N >= 0n) return Number(U % (N + 1n));
    if (N !== MIN64) return Number(-(U % (1n - N)));
    return Number(U % MASK63);
  }

  function irandomRange(a, b) {
    const U = u63();
    const A = toInt64(a);
    const B = toInt64(b);
    const lo = A < B ? A : B;
    const hi = A < B ? B : A;
    let m = BigInt.asIntN(64, hi - lo + 1n);
    if (m < 0n) m = -m;
    const r = m === 0n ? 0n : U % m;
    return Number(BigInt.asIntN(64, lo + r));
  }

  function choose(...items) {
    if (items.length === 0) return 0;
    return items[u32() % items.length];
  }

  setSeed(seed);
  return { setSeed, getSeed: () => saved, u32, u63, random, randomRange, irandom, irandomRange, choose };
}
