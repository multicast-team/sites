// spec: libm, gmlnum
// Встроенные функции GML над своей libm (этап 5.1, спека oracle/specs/libm.md, раздел «Функции GML»):
// что именно зовёт O для power / exp / ln / log2 / log10. Проверено вызовами в O (oracle/libm51/raw51.json).
import { pow, exp as libmExp, log, log10 as libmLog10 } from './libm.mjs';
import * as T from './libm-trig.mjs';
import { sinf, cosf, atan2f } from './libmf.mjs';
import { roundHalfEven, viaInt64 } from './real.mjs';

const LN2 = log(2);

/** power(x, y) = pow libm. */
export function power(x, y) { return pow(x, y); }
/** exp(x) = exp libm. */
export function exp(x) { return libmExp(x); }
/** ln(x) = log libm. */
export function ln(x) { return log(x); }
/** log2(x) в GML — не log2 libm, а ln(x) / ln(2) (одно деление double). */
export function log2(x) { return log(x) / LN2; }
/** log10(x) = log10 libm. */
export function log10(x) { return libmLog10(x); }

// ---- этап 5.2, спека gmlnum ----
const fr = Math.fround;
const PI = Math.PI;
const PIF = fr(PI);
const EPS_LD = fr(1e-4);

/** round: половина к чётному, через int64 (знак нуля теряется; вне диапазона −2^63; ±∞ как есть). */
export function round(x) {
  if (x === Infinity || x === -Infinity) return x;
  return viaInt64(roundHalfEven(x)) + 0;
}
export function floor(x) { return Math.floor(x); }
export function ceil(x) { return Math.ceil(x); }
/** frac: дробная часть modf libm. */
export function frac(x) { return T.modf(x)[0]; }
export function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }
export function abs(x) { return Math.abs(x); }
export function sqr(x) { return x * x; }
export function sqrt(x) { return Math.sqrt(x); }
/** int64: отбрасывание дробной части через 64-битное целое. */
export function int64(x) { return viaInt64(x) + 0; }

export function sin(x) { return T.sin(x); }
export function cos(x) { return T.cos(x); }
export function tan(x) { return T.tan(x); }
/** arcsin: asin libm от аргумента, округлённого до float. */
export function arcsin(x) { return T.asin(fr(x)); }
export function arccos(x) { return T.acos(x); }
export function arctan(x) { return T.atan(x); }
export function arctan2(y, x) { return T.atan2(y, x); }

export function degtorad(x) { return x * PI / 180; }
export function radtodeg(x) { return x * 180 / PI; }
export function dsin(x) { return T.sin(degtorad(x)); }
export function dcos(x) { return T.cos(degtorad(x)); }
export function dtan(x) { return T.tan(degtorad(x)); }
export function darcsin(x) { return radtodeg(T.asin(x)); }
export function darccos(x) { return radtodeg(T.acos(x)); }
export function darctan(x) { return radtodeg(T.atan(x)); }
export function darctan2(y, x) { return radtodeg(T.atan2(y, x)); }

export function point_distance(x1, y1, x2, y2) {
  const dx = fr(fr(x2) - fr(x1)), dy = fr(fr(y2) - fr(y1));
  return fr(Math.sqrt(fr(fr(dx * dx) + fr(dy * dy))));
}
export function point_direction(x1, y1, x2, y2) {
  x1 = fr(x1); y1 = fr(y1); x2 = fr(x2); y2 = fr(y2);
  if (x1 === x2 && y1 === y2) return 0;
  const dx = fr(x2 - x1), dy = fr(y2 - y1);
  const a = atan2f(dy, dx);
  let r = fr(fr(-a * 180) / PIF);
  if (r < 0) r = fr(r + 360);
  return r;
}
function ldRad(dir) { return fr(fr(fr(dir) * PIF) / 180); }
function ldZero(r) { return Math.abs(r) < EPS_LD ? (r < 0 || Object.is(r, -0) ? -0 : 0) : r; }
export function lengthdir_x(len, dir) { return ldZero(fr(fr(len) * cosf(ldRad(dir)))); }
export function lengthdir_y(len, dir) { return ldZero(fr(-fr(len) * sinf(ldRad(dir)))); }

export function logn(n, x) { return log(x) / log(n); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
