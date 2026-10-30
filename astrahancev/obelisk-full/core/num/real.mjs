// spec: workshop, gmlnum
// Точные операции над double для ядра (§3.0): целая степень, округления, перевод в int64, вывод числа.
// Своя реализация по поведению, описанному в спеке workshop (правила 2, 4, 5, 10). Степень в ядре с этапа 5.1 —
// pow своей libm (core/num/libm.mjs, = pow O бит в бит); powInt (правильно округлённая) осталась эталоном тестов.

const TWO52 = 4503599627370496; // 2^52
const TWO63 = 9223372036854775808; // 2^63
const SPLIT = 134217729; // 2^27 + 1 — деление double на две половины (Вельткамп)

const f64 = new Float64Array(1);
const u64 = new BigUint64Array(f64.buffer);

/** Точное произведение a·b = p + e (Деккер, без FMA). */
function twoProd(a, b) {
  const p = a * b;
  let c = SPLIT * a;
  const ah = c - (c - a), al = a - ah;
  c = SPLIT * b;
  const bh = c - (c - b), bl = b - bh;
  const e = ((ah * bh - p) + ah * bl + al * bh) + al * bl;
  return [p, e];
}

/** Произведение двух чисел двойной-двойной точности (hi, lo) → нормализованная пара. */
function ddMul(x, y) {
  const [p, e0] = twoProd(x[0], y[0]);
  const e = e0 + (x[0] * y[1] + x[1] * y[0]);
  const s = p + e;
  return [s, e - (s - p)];
}

/**
 * x^n для целого n ≥ 0 с правильным округлением до double (кроме случаев, когда точное значение ближе 2^-100
 * относительной погрешности к середине между соседними double). Спека workshop, правило 2: «степень — функция pow (libm)»;
 * pow libm O отдаёт результат с погрешностью < 1 ulp и на всех 6882 клетках цен совпадает с правильно округлённым.
 */
export function powInt(x, n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`powInt: нужна целая степень ≥ 0, дано ${n}`);
  let r = [1, 0];
  let b = [x, 0];
  for (let k = n; k > 0; k = Math.floor(k / 2)) {
    if (k % 2 === 1) r = ddMul(r, b);
    if (k > 1) b = ddMul(b, b);
  }
  return r[0];
}

/** Округление к ближайшему целому, половина — к чётному (режим округления IEEE по умолчанию). */
export function roundHalfEven(x) {
  if (!(Math.abs(x) < TWO52)) return x; // уже целое (или NaN/∞)
  if (x >= 0) return (x + TWO52) - TWO52;
  return -((-x + TWO52) - TWO52);
}

/** Округление «половина вверх»: floor(x + 0,5) — одно сложение double, затем floor. */
export function roundHalfUp(x) {
  return Math.floor(x + 0.5);
}

/** Перевод в 64-битное целое и обратно, как на x86_64: вне [−2^63, 2^63) и NaN → −2^63, иначе отбрасывание дробной части. */
export function viaInt64(x) {
  if (!(x >= -TWO63 && x < TWO63)) return -TWO63;
  return Math.trunc(x);
}

/** 10^n (n ≥ 0) на BigInt. */
function bigPow10(n) {
  let r = 1n;
  for (let i = 0; i < n; i++) r *= 10n;
  return r;
}

/**
 * Вывод double с d знаками после точки по точному двоичному значению, половина — к чётному (как printf «%.df»).
 * d ≥ 0 любое. Минус — по знаковому биту (даже у «-0.00»); для ±∞/NaN — String(x).
 */
export function formatFixed(x, d) {
  if (!Number.isFinite(x)) return String(x);
  f64[0] = x;
  const bits = u64[0];
  const neg = (bits >> 63n) === 1n;
  const expBits = Number((bits >> 52n) & 0x7ffn);
  let mant = bits & 0xfffffffffffffn;
  let e;
  if (expBits === 0) e = -1074; else { mant |= 1n << 52n; e = expBits - 1075; }
  let q;
  const num = mant * bigPow10(d);
  if (e >= 0) q = num << BigInt(e);
  else {
    const den = 1n << BigInt(-e);
    q = num / den;
    const r2 = (num % den) * 2n;
    if (r2 > den || (r2 === den && (q & 1n) === 1n)) q += 1n;
  }
  let s = q.toString();
  if (d > 0) {
    s = s.padStart(d + 1, '0');
    s = s.slice(0, s.length - d) + '.' + s.slice(s.length - d);
  }
  return (neg ? '-' : '') + s;
}

/** string(x) GML (спека gmlnum, правило 1): целое в int64 — цифры без точки, иначе два знака. */
export function formatReal(x) {
  if (Number.isNaN(x)) return 'NaN';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  if (x >= -TWO63 && x < TWO63 && Math.trunc(x) === x) return BigInt(x).toString();
  return formatFixed(x, 2);
}

/** string_format(x, tot, dec) GML (правило 2). */
export function stringFormat(x, tot, dec) {
  let body;
  if (Number.isNaN(x)) {
    f64[0] = x;
    body = (u64[0] >> 63n) === 1n ? '-nan' : 'nan';
  } else if (x === Infinity) body = 'inf';
  else if (x === -Infinity) body = '-inf';
  else body = formatFixed(x, dec);
  return body.padStart(dec > 0 ? tot + dec + 1 : tot, ' ');
}

const REAL_NUM = /^[ ]*([+-]?)(?:0[xX]([0-9a-fA-F]+)|(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?|(inf)|(nan))/i;

/** Точное округление рационального m·2^k (m ≥ 0n) до double, половина к чётному. */
function bigToDouble(num, den) {
  if (num === 0n) return 0;
  // масштаб так, чтобы частное имело 54+ бит
  const nb = num.toString(2).length, db = den.toString(2).length;
  let sh = 55 - (nb - db);
  let n = sh >= 0 ? num << BigInt(sh) : num, d = sh >= 0 ? den : den << BigInt(-sh);
  let q = n / d;
  const sticky = n % d !== 0n;
  let e2 = -sh; // значение = q·2^e2 (с остатком)
  let qb = q.toString(2).length;
  // позиция младшего бита мантиссы: нормальное — qb-53, но не ниже -1074
  let drop = Math.max(qb - 53, -1074 - e2);
  if (drop > 0) {
    const mask = (1n << BigInt(drop)) - 1n;
    const rem = q & mask, half = 1n << BigInt(drop - 1);
    q >>= BigInt(drop);
    if (rem > half || (rem === half && (sticky || (q & 1n) === 1n))) q += 1n;
    e2 += drop;
  }
  // q·2^e2 → double
  if (q === 0n) return 0;
  const bl = q.toString(2).length;
  if (bl + e2 > 1024) return Infinity;
  let r = Number(q);
  let k = e2;
  while (k > 0) { const st = Math.min(k, 1000); r *= pow2(st); k -= st; }
  while (k < 0) { const st = Math.min(-k, 1000); r /= pow2(st); k += st; }
  return r;
}
function pow2(n) { f64[0] = 0; u64[0] = BigInt(n + 1023) << 52n; return f64[0]; }

/** real(s) GML (правило 3): самый длинный начальный числовой кусок; нет числа — Error. */
export function parseReal(s) {
  const m = REAL_NUM.exec(s);
  if (!m) throw new Error(`unable to convert string "${s}" to number`);
  const neg = m[1] === '-';
  let v;
  if (m[7]) v = Infinity;
  else if (m[8]) v = NaN;
  else if (m[2] !== undefined) v = bigToDouble(BigInt('0x' + m[2]), 1n);
  else {
    const ip = m[3] ?? '', fp = m[4] ?? m[5] ?? '';
    let ex = m[6] ? Number(m[6]) : 0;
    if (ex > 100000) ex = 100000; else if (ex < -100000) ex = -100000;
    const digits = BigInt((ip + fp) || '0');
    const e10 = ex - fp.length;
    if (digits === 0n) v = 0;
    else if (e10 + (ip + fp).length > 400) v = Infinity;
    else if (e10 + (ip + fp).length < -400) v = 0;
    else v = e10 >= 0 ? bigToDouble(digits * bigPow10(e10), 1n) : bigToDouble(digits, bigPow10(-e10));
  }
  return neg ? -v : v;
}
