// spec: libm
// Своя libm ядра, ч.2 (этап 5.2), double: sin cos tan sincos asin acos atan atan2 asinh sinh cbrt fmod modf
// round lround ldexp — бит в бит как bionic-libm Android 14 x86_64, которую зовёт O (спека oracle/specs/libm.md,
// таблица oracle/libm-table). Алгоритмы — FreeBSD msun (тот же, что в bionic):
//   Copyright (C) 1993, 2004 by Sun Microsystems, Inc. All rights reserved. «Developed at SunPro, a Sun Microsystems,
//   Inc. business. Permission to use, copy, modify, and distribute this software is freely granted, provided that this
//   notice is preserved.» cbrt — Copyright (C) 1993 Sun, Bruce D. Evans (FreeBSD). Код игры не участвует.
// Внутренние вызовы msun идут в функции bionic: log → core/num/libm.mjs (AOR), exp → AOR.
// Только + − × ÷ double, sqrt/floor (точные операции IEEE) и работа с битами. NaN совпадает как класс.

import { exp as aorExp, log as aorLog } from './libm.mjs';
import { IPIO2 } from './libm-tables52.mjs';

const F = new Float64Array(1);
const W = new Uint32Array(F.buffer);
F[0] = 1;
const HI = W[1] === 0x3ff00000 ? 1 : 0;
const LO = 1 - HI;
function hiOf(x) { F[0] = x; return W[HI] | 0; }          // знаковое старшее слово (int32_t hx)
function loOf(x) { F[0] = x; return W[LO]; }               // беззнаковое младшее слово
function words(hi, lo) { W[HI] = hi >>> 0; W[LO] = lo >>> 0; return F[0]; }
function withLo(x, lo) { F[0] = x; W[LO] = lo >>> 0; return F[0]; }
function withHi(x, hi) { F[0] = x; W[HI] = hi >>> 0; return F[0]; }

// ---------------------------------------------------------------- scalbn / ldexp

const P1023 = words(0x7fe00000, 0);           // 2^1023
const PM1022x53 = words(0x00100000, 0) * 9007199254740992; // 2^-1022 · 2^53

/** x · 2^n (scalbn msun) — ldexp bionic. n — int32. */
export function ldexp(x, n) {
  let y = x;
  n |= 0;
  if (n > 1023) {
    y *= P1023; n -= 1023;
    if (n > 1023) { y *= P1023; n -= 1023; if (n > 1023) n = 1023; }
  } else if (n < -1022) {
    y *= PM1022x53; n += 1022 - 53;
    if (n < -1022) { y *= PM1022x53; n += 1022 - 53; if (n < -1022) n = -1022; }
  }
  return y * words((0x3ff + n) << 20, 0);
}
export const scalbn = ldexp;

// ---------------------------------------------------------------- приведение аргумента (rem_pio2)

const TWO24 = 16777216, TWON24 = 5.96046447753906250000e-08;
const PIo2 = [
  1.57079625129699707031e+00, 7.54978941586159635335e-08, 5.39030252995776476554e-15, 3.28200341580791294123e-22,
  1.27065575308067607349e-29, 1.22933308981111328932e-36, 2.73370053816464559624e-44, 2.16741683877804819444e-51,
];
const INIT_JK = [3, 4, 4, 6];
const ipio2 = Array.from(IPIO2, (v) => v | 0);

/** Точное приведение больших аргументов по таблице 2/π (__kernel_rem_pio2 msun). Возвращает n & 7, y — выход. */
export function kernelRemPio2(x, y, e0, nx, prec) {
  const iq = new Int32Array(20);
  const f = new Float64Array(20), fq = new Float64Array(20), q = new Float64Array(20);
  let z, fw, i, j, k, ih, n, carry;
  const jk = INIT_JK[prec];
  const jp = jk;
  const jx = nx - 1;
  let jv = Math.trunc((e0 - 3) / 24); if (jv < 0) jv = 0;
  let q0 = e0 - 24 * (jv + 1);
  j = jv - jx; const m = jx + jk;
  for (i = 0; i <= m; i++, j++) f[i] = j < 0 ? 0 : ipio2[j];
  for (i = 0; i <= jk; i++) {
    for (j = 0, fw = 0.0; j <= jx; j++) fw += x[j] * f[jx + i - j];
    q[i] = fw;
  }
  let jz = jk;
  for (;;) { // recompute
    for (i = 0, j = jz, z = q[jz]; j > 0; i++, j--) {
      fw = Math.trunc(TWON24 * z);
      iq[i] = Math.trunc(z - TWO24 * fw);
      z = q[j - 1] + fw;
    }
    z = ldexp(z, q0);
    z -= 8.0 * Math.floor(z * 0.125);
    n = Math.trunc(z);
    z -= n;
    ih = 0;
    if (q0 > 0) {
      i = iq[jz - 1] >> (24 - q0); n += i;
      iq[jz - 1] -= i << (24 - q0);
      ih = iq[jz - 1] >> (23 - q0);
    } else if (q0 === 0) ih = iq[jz - 1] >> 23;
    else if (z >= 0.5) ih = 2;
    if (ih > 0) {
      n += 1; carry = 0;
      for (i = 0; i < jz; i++) {
        j = iq[i];
        if (carry === 0) { if (j !== 0) { carry = 1; iq[i] = 0x1000000 - j; } }
        else iq[i] = 0xffffff - j;
      }
      if (q0 > 0) {
        if (q0 === 1) iq[jz - 1] &= 0x7fffff;
        else if (q0 === 2) iq[jz - 1] &= 0x3fffff;
      }
      if (ih === 2) {
        z = 1.0 - z;
        if (carry !== 0) z -= ldexp(1.0, q0);
      }
    }
    if (z === 0) {
      j = 0;
      for (i = jz - 1; i >= jk; i--) j |= iq[i];
      if (j === 0) {
        for (k = 1; iq[jk - k] === 0; k++);
        for (i = jz + 1; i <= jz + k; i++) {
          f[jx + i] = ipio2[jv + i];
          for (j = 0, fw = 0.0; j <= jx; j++) fw += x[j] * f[jx + i - j];
          q[i] = fw;
        }
        jz += k;
        continue;
      }
    }
    break;
  }
  if (z === 0.0) {
    jz -= 1; q0 -= 24;
    while (iq[jz] === 0) { jz--; q0 -= 24; }
  } else {
    z = ldexp(z, -q0);
    if (z >= TWO24) {
      fw = Math.trunc(TWON24 * z);
      iq[jz] = Math.trunc(z - TWO24 * fw);
      jz += 1; q0 += 24;
      iq[jz] = fw;
    } else iq[jz] = Math.trunc(z);
  }
  fw = ldexp(1.0, q0);
  for (i = jz; i >= 0; i--) { q[i] = fw * iq[i]; fw *= TWON24; }
  for (i = jz; i >= 0; i--) {
    for (fw = 0.0, k = 0; k <= jp && k <= jz - i; k++) fw += PIo2[k] * q[i + k];
    fq[jz - i] = fw;
  }
  if (prec === 0) {
    fw = 0.0;
    for (i = jz; i >= 0; i--) fw += fq[i];
    y[0] = ih === 0 ? fw : -fw;
  } else { // prec 1, 2
    fw = 0.0;
    for (i = jz; i >= 0; i--) fw += fq[i];
    y[0] = ih === 0 ? fw : -fw;
    fw = fq[0] - fw;
    for (i = 1; i <= jz; i++) fw += fq[i];
    y[1] = ih === 0 ? fw : -fw;
  }
  return n & 7;
}

const invpio2 = 6.36619772367581382433e-01,
  pio2_1 = 1.57079632673412561417e+00, pio2_1t = 6.07710050650619224932e-11,
  pio2_2 = 6.07710050630396597660e-11, pio2_2t = 2.02226624879595063154e-21,
  pio2_3 = 2.02226624871116645580e-21, pio2_3t = 8.47842766036889956997e-32;
const RN = 6755399441055744; // 0x1.8p52

function remMedium(x, ix, y) {
  const fn = (x * invpio2 + RN) - RN;
  const n = fn | 0;
  let r = x - fn * pio2_1;
  let w = fn * pio2_1t;
  const j = ix >> 20;
  y[0] = r - w;
  let i = j - ((hiOf(y[0]) >> 20) & 0x7ff);
  if (i > 16) {
    let t = r;
    w = fn * pio2_2;
    r = t - w;
    w = fn * pio2_2t - ((t - r) - w);
    y[0] = r - w;
    i = j - ((hiOf(y[0]) >> 20) & 0x7ff);
    if (i > 49) {
      t = r;
      w = fn * pio2_3;
      r = t - w;
      w = fn * pio2_3t - ((t - r) - w);
      y[0] = r - w;
    }
  }
  y[1] = (r - y[0]) - w;
  return n;
}

function small(x, y, hx, k) { // x ∓ k·π/2 для k = 1…4
  if (hx > 0) {
    const z = x - k * pio2_1;
    y[0] = z - k * pio2_1t;
    y[1] = (z - y[0]) - k * pio2_1t;
    return k;
  }
  const z = x + k * pio2_1;
  y[0] = z + k * pio2_1t;
  y[1] = (z - y[0]) + k * pio2_1t;
  return -k;
}

/** x = n·π/2 + (y[0] + y[1]) (__ieee754_rem_pio2 msun). */
export function remPio2(x, y) {
  const hx = hiOf(x);
  const ix = hx & 0x7fffffff;
  if (ix <= 0x3fe921fb) { y[0] = x; y[1] = 0; return 0; }
  if (ix <= 0x400f6a7a) {
    if ((ix & 0xfffff) === 0x921fb) return remMedium(x, ix, y);
    return small(x, y, hx, ix <= 0x4002d97c ? 1 : 2);
  }
  if (ix <= 0x401c463b) {
    if (ix <= 0x4015fdbc) {
      if (ix === 0x4012d97c) return remMedium(x, ix, y);
      return small(x, y, hx, 3);
    }
    if (ix === 0x401921fb) return remMedium(x, ix, y);
    return small(x, y, hx, 4);
  }
  if (ix < 0x413921fb) return remMedium(x, ix, y);
  if (ix >= 0x7ff00000) { y[0] = y[1] = x - x; return 0; }
  const low = loOf(x);
  const e0 = (ix >> 20) - 1046;
  let z = words(ix - (e0 << 20), low);
  const tx = [0, 0, 0], ty = [0, 0];
  for (let i = 0; i < 2; i++) { tx[i] = z | 0; z = (z - tx[i]) * TWO24; }
  tx[2] = z;
  let nx = 3;
  while (tx[nx - 1] === 0) nx--;
  const n = kernelRemPio2(tx, ty, e0, nx, 1);
  if (hx < 0) { y[0] = -ty[0]; y[1] = -ty[1]; return -n; }
  y[0] = ty[0]; y[1] = ty[1]; return n;
}

// ---------------------------------------------------------------- ядра sin / cos / tan

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
  S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
  C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

function kSin(x, y, iy) {
  const z = x * x, w = z * z;
  const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
  const v = z * x;
  if (iy === 0) return x + v * (S1 + z * r);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}
function kCos(x, y) {
  const z = x * x;
  let w = z * z;
  const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
  const hz = 0.5 * z;
  w = 1.0 - hz;
  return w + (((1.0 - w) - hz) + (z * r - x * y));
}
const T = [
  3.33333333333334091986e-01, 1.33333333333201242699e-01, 5.39682539762260521377e-02, 2.18694882948595424599e-02,
  8.86323982359930005737e-03, 3.59207910759131235356e-03, 1.45620945432529025516e-03, 5.88041240820264096874e-04,
  2.46463134818469906812e-04, 7.81794442939557092300e-05, 7.14072491382608190305e-05, -1.85586374855275456654e-05,
  2.59073051863633712884e-05,
];
const pio4 = 7.85398163397448278999e-01, pio4lo = 3.06161699786838301793e-17;
function kTan(x, y, iy) {
  let z, r, v, w, s;
  const hx = hiOf(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x3FE59428) {
    if (hx < 0) { x = -x; y = -y; }
    z = pio4 - x;
    w = pio4lo - y;
    x = z + w; y = 0.0;
  }
  z = x * x;
  w = z * z;
  r = T[1] + w * (T[3] + w * (T[5] + w * (T[7] + w * (T[9] + w * T[11]))));
  v = z * (T[2] + w * (T[4] + w * (T[6] + w * (T[8] + w * (T[10] + w * T[12])))));
  s = z * x;
  r = y + z * (s * (r + v) + y);
  r += T[0] * s;
  w = x + r;
  if (ix >= 0x3FE59428) {
    v = iy;
    return (1 - ((hx >> 30) & 2)) * (v - 2.0 * (x - (w * w / (w + v) - r)));
  }
  if (iy === 1) return w;
  z = withLo(w, 0);
  v = r - (z - x);
  const a = -1.0 / w;
  const t = withLo(a, 0);
  s = 1.0 + t * z;
  return t + a * (s + t * v);
}

const Y = new Float64Array(2);

/** sin (msun). */
export function sin(x) {
  const ix = hiOf(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) {
    if (ix < 0x3e500000) return x;
    return kSin(x, 0.0, 0);
  }
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x, Y);
  switch (n & 3) {
    case 0: return kSin(Y[0], Y[1], 1);
    case 1: return kCos(Y[0], Y[1]);
    case 2: return -kSin(Y[0], Y[1], 1);
    default: return -kCos(Y[0], Y[1]);
  }
}

/** cos (msun). */
export function cos(x) {
  const ix = hiOf(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) {
    if (ix < 0x3e46a09e) return 1.0;
    return kCos(x, 0.0);
  }
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x, Y);
  switch (n & 3) {
    case 0: return kCos(Y[0], Y[1]);
    case 1: return -kSin(Y[0], Y[1], 1);
    case 2: return -kCos(Y[0], Y[1]);
    default: return kSin(Y[0], Y[1], 1);
  }
}

/** tan (msun). */
export function tan(x) {
  const ix = hiOf(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) {
    if (ix < 0x3e400000) return x;
    return kTan(x, 0.0, 1);
  }
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x, Y);
  return kTan(Y[0], Y[1], 1 - ((n & 1) << 1));
}

function kSinCos(x, y, iy, out, si, ci) {
  const z = x * x;
  let w = z * z;
  let r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
  const v = z * x;
  if (iy === 0) out[si] = x + v * (S1 + z * r);
  else out[si] = x - ((z * (y / 2 - v * r) - y) - v * S1);
  r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
  const hz = z / 2;
  w = 1 - hz;
  out[ci] = w + (((1 - w) - hz) + (z * r - x * y));
}

/** sincos (msun) → [sin, cos]. */
export function sincos(x) {
  const out = [0, 0];
  const ix = hiOf(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) {
    if (ix < 0x3e400000) { out[0] = x; out[1] = 1; return out; }
    kSinCos(x, 0, 0, out, 0, 1);
    return out;
  }
  if (ix >= 0x7ff00000) { out[0] = x - x; out[1] = x - x; return out; }
  const n = remPio2(x, Y);
  switch (n & 3) {
    case 0: kSinCos(Y[0], Y[1], 1, out, 0, 1); break;
    case 1: kSinCos(Y[0], Y[1], 1, out, 1, 0); out[1] = -out[1]; break;
    case 2: kSinCos(Y[0], Y[1], 1, out, 0, 1); out[0] = -out[0]; out[1] = -out[1]; break;
    default: kSinCos(Y[0], Y[1], 1, out, 1, 0); out[0] = -out[0];
  }
  return out;
}

// ---------------------------------------------------------------- asin / acos

const pio2_hi = 1.57079632679489655800e+00, pio2_lo = 6.12323399573676603587e-17, pio4_hi = 7.85398163397448278999e-01;
const pS0 = 1.66666666666666657415e-01, pS1 = -3.25565818622400915405e-01, pS2 = 2.01212532134862925881e-01,
  pS3 = -4.00555345006794114027e-02, pS4 = 7.91534994289814532176e-04, pS5 = 3.47933107596021167570e-05,
  qS1 = -2.40339491173441421878e+00, qS2 = 2.02094576023350569471e+00, qS3 = -6.88283971605453293030e-01,
  qS4 = 7.70381505559019352791e-02;
const PI = 3.14159265358979311600e+00;

/** asin (msun). */
export function asin(x) {
  let t, w, p, q, c, r, s;
  const hx = hiOf(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x3ff00000) {
    if (((ix - 0x3ff00000) | loOf(x)) === 0) return x * pio2_hi + x * pio2_lo;
    return (x - x) / (x - x);
  } else if (ix < 0x3fe00000) {
    if (ix < 0x3e500000) return x;
    t = x * x;
    p = t * (pS0 + t * (pS1 + t * (pS2 + t * (pS3 + t * (pS4 + t * pS5)))));
    q = 1.0 + t * (qS1 + t * (qS2 + t * (qS3 + t * qS4)));
    w = p / q;
    return x + x * w;
  }
  w = 1.0 - Math.abs(x);
  t = w * 0.5;
  p = t * (pS0 + t * (pS1 + t * (pS2 + t * (pS3 + t * (pS4 + t * pS5)))));
  q = 1.0 + t * (qS1 + t * (qS2 + t * (qS3 + t * qS4)));
  s = Math.sqrt(t);
  if (ix >= 0x3FEF3333) {
    w = p / q;
    t = pio2_hi - (2.0 * (s + s * w) - pio2_lo);
  } else {
    w = withLo(s, 0);
    c = (t - w * w) / (s + w);
    r = p / q;
    p = 2.0 * s * r - (pio2_lo - 2.0 * c);
    q = pio4_hi - 2.0 * w;
    t = pio4_hi - (p - q);
  }
  return hx > 0 ? t : -t;
}

/** acos (msun). */
export function acos(x) {
  let z, p, q, r, w, s, c, df;
  const hx = hiOf(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x3ff00000) {
    if (((ix - 0x3ff00000) | loOf(x)) === 0) return hx > 0 ? 0.0 : PI + 2.0 * pio2_lo;
    return (x - x) / (x - x);
  }
  if (ix < 0x3fe00000) {
    if (ix <= 0x3c600000) return pio2_hi + pio2_lo;
    z = x * x;
    p = z * (pS0 + z * (pS1 + z * (pS2 + z * (pS3 + z * (pS4 + z * pS5)))));
    q = 1.0 + z * (qS1 + z * (qS2 + z * (qS3 + z * qS4)));
    r = p / q;
    return pio2_hi - (x - (pio2_lo - x * r));
  } else if (hx < 0) {
    z = (1.0 + x) * 0.5;
    p = z * (pS0 + z * (pS1 + z * (pS2 + z * (pS3 + z * (pS4 + z * pS5)))));
    q = 1.0 + z * (qS1 + z * (qS2 + z * (qS3 + z * qS4)));
    s = Math.sqrt(z);
    r = p / q;
    w = r * s - pio2_lo;
    return PI - 2.0 * (s + w);
  }
  z = (1.0 - x) * 0.5;
  s = Math.sqrt(z);
  df = withLo(s, 0);
  c = (z - df * df) / (s + df);
  p = z * (pS0 + z * (pS1 + z * (pS2 + z * (pS3 + z * (pS4 + z * pS5)))));
  q = 1.0 + z * (qS1 + z * (qS2 + z * (qS3 + z * qS4)));
  r = p / q;
  w = r * s + c;
  return 2.0 * (df + w);
}

// ---------------------------------------------------------------- atan / atan2

const atanhi = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const atanlo = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const aT = [
  3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
  9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
  4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02,
];

/** atan (msun). */
export function atan(x) {
  let w, s1, s2, z, id;
  const hx = hiOf(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x44100000) {
    if (ix > 0x7ff00000 || (ix === 0x7ff00000 && loOf(x) !== 0)) return x + x;
    return hx > 0 ? atanhi[3] + atanlo[3] : -atanhi[3] - atanlo[3];
  }
  if (ix < 0x3fdc0000) {
    if (ix < 0x3e400000) return x;
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {
      if (ix < 0x3fe60000) { id = 0; x = (2.0 * x - 1.0) / (2.0 + x); }
      else { id = 1; x = (x - 1.0) / (x + 1.0); }
    } else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1.0 + 1.5 * x); }
    else { id = 3; x = -1.0 / x; }
  }
  z = x * x;
  w = z * z;
  s1 = z * (aT[0] + w * (aT[2] + w * (aT[4] + w * (aT[6] + w * (aT[8] + w * aT[10])))));
  s2 = w * (aT[1] + w * (aT[3] + w * (aT[5] + w * (aT[7] + w * aT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  z = atanhi[id] - ((x * (s1 + s2) - atanlo[id]) - x);
  return hx < 0 ? -z : z;
}

const tiny = 1.0e-300, pi_o_4 = 7.8539816339744827900E-01, pi_o_2 = 1.5707963267948965580E+00,
  pi_lo = 1.2246467991473531772E-16;

/** atan2(y, x) (msun). */
export function atan2(y, x) {
  let z;
  const hx = hiOf(x), lx = loOf(x), hy = hiOf(y), ly = loOf(y);
  const ix = hx & 0x7fffffff, iy = hy & 0x7fffffff;
  if ((ix | ((lx | -lx) >>> 31)) >>> 0 > 0x7ff00000 || (iy | ((ly | -ly) >>> 31)) >>> 0 > 0x7ff00000) return x + y;
  if (hx === 0x3ff00000 && lx === 0) return atan(y);
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2);
  if ((iy | ly) === 0) {
    switch (m) { case 0: case 1: return y; case 2: return PI + tiny; default: return -PI - tiny; }
  }
  if ((ix | lx) === 0) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) {
      switch (m) {
        case 0: return pi_o_4 + tiny; case 1: return -pi_o_4 - tiny;
        case 2: return 3.0 * pi_o_4 + tiny; default: return -3.0 * pi_o_4 - tiny;
      }
    }
    switch (m) { case 0: return 0.0; case 1: return -0.0; case 2: return PI + tiny; default: return -PI - tiny; }
  }
  if (iy === 0x7ff00000) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
  const k = (iy - ix) >> 20;
  if (k > 60) { z = pi_o_2 + 0.5 * pi_lo; m &= 1; }
  else if (hx < 0 && k < -60) z = 0.0;
  else z = atan(Math.abs(y / x));
  switch (m) {
    case 0: return z;
    case 1: return -z;
    case 2: return PI - (z - pi_lo);
    default: return (z - pi_lo) - PI;
  }
}

// ---------------------------------------------------------------- log1p, asinh

const ln2_hi = 6.93147180369123816490e-01, ln2_lo = 1.90821492927058770002e-10, two54 = 1.80143985094819840000e+16;
const Lp1 = 6.666666666666735130e-01, Lp2 = 3.999999999940941908e-01, Lp3 = 2.857142874366239149e-01,
  Lp4 = 2.222219843214978396e-01, Lp5 = 1.818357216161805012e-01, Lp6 = 1.531383769920937332e-01,
  Lp7 = 1.479819860511658591e-01;

/** log1p (msun) — нужна asinh. */
export function log1p(x) {
  let hfsq, f = 0, c = 0, s, z, R, u, hu = 0;
  const hx = hiOf(x);
  const ax = hx & 0x7fffffff;
  let k = 1;
  if (hx < 0x3FDA827A) {
    if (ax >= 0x3ff00000) {
      if (x === -1.0) return -Infinity;
      return (x - x) / (x - x);
    }
    if (ax < 0x3e200000) {
      if (two54 + x > 0 && ax < 0x3c900000) return x;
      return x - x * x * 0.5;
    }
    if (hx > 0 || hx <= (0xbfd2bec4 | 0)) { k = 0; f = x; hu = 1; }
  }
  if (hx >= 0x7ff00000) return x + x;
  if (k !== 0) {
    if (hx < 0x43400000) {
      u = 1.0 + x;
      hu = hiOf(u);
      k = (hu >> 20) - 1023;
      c = k > 0 ? 1.0 - (u - x) : x - (u - 1.0);
      c /= u;
    } else {
      u = x;
      hu = hiOf(u);
      k = (hu >> 20) - 1023;
      c = 0;
    }
    hu &= 0x000fffff;
    if (hu < 0x6a09e) {
      u = withHi(u, hu | 0x3ff00000);
    } else {
      k += 1;
      u = withHi(u, hu | 0x3fe00000);
      hu = (0x00100000 - hu) >> 2;
    }
    f = u - 1.0;
  }
  hfsq = 0.5 * f * f;
  if (hu === 0) {
    if (f === 0) {
      if (k === 0) return 0;
      c += k * ln2_lo;
      return k * ln2_hi + c;
    }
    R = hfsq * (1.0 - 0.66666666666666666 * f);
    if (k === 0) return f - R;
    return k * ln2_hi - ((R - (k * ln2_lo + c)) - f);
  }
  s = f / (2.0 + f);
  z = s * s;
  R = z * (Lp1 + z * (Lp2 + z * (Lp3 + z * (Lp4 + z * (Lp5 + z * (Lp6 + z * Lp7))))));
  if (k === 0) return f - (hfsq - s * (hfsq + R));
  return k * ln2_hi - ((hfsq - (s * (hfsq + R) + (k * ln2_lo + c))) - f);
}

const LN2D = 6.93147180559945286227e-01;

/** asinh (msun; log — AOR bionic). */
export function asinh(x) {
  let t, w;
  const hx = hiOf(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x7ff00000) return x + x;
  if (ix < 0x3e300000) return x;
  if (ix > 0x41b00000) w = aorLog(Math.abs(x)) + LN2D;
  else if (ix > 0x40000000) {
    t = Math.abs(x);
    w = aorLog(2.0 * t + 1.0 / (Math.sqrt(x * x + 1.0) + t));
  } else {
    t = x * x;
    w = log1p(Math.abs(x) + t / (1.0 + Math.sqrt(1.0 + t)));
  }
  return hx > 0 ? w : -w;
}

// ---------------------------------------------------------------- expm1, sinh

const o_threshold = 7.09782712893383973096e+02, invln2 = 1.44269504088896338700e+00;
const Q1 = -3.33333333333331316428e-02, Q2 = 1.58730158725481460165e-03, Q3 = -7.93650757867487942473e-05,
  Q4 = 4.00821782732936239552e-06, Q5 = -2.01099218183624371326e-07;

/** expm1 (msun) — нужна sinh. */
export function expm1(x) {
  let y, hi, lo, c = 0, t, e, k;
  let hx = hiOf(x);
  const xsb = hx & 0x80000000;
  hx &= 0x7fffffff;
  if (hx >= 0x4043687A) {
    if (hx >= 0x40862E42) {
      if (hx >= 0x7ff00000) {
        if (((hx & 0xfffff) | loOf(x)) !== 0) return x + x;
        return xsb === 0 ? x : -1.0;
      }
      if (x > o_threshold) return Infinity;
    }
    if (xsb !== 0) { if (x + tiny < 0.0) return tiny - 1.0; }
  }
  if (hx > 0x3fd62e42) {
    if (hx < 0x3FF0A2B2) {
      if (xsb === 0) { hi = x - ln2_hi; lo = ln2_lo; k = 1; }
      else { hi = x + ln2_hi; lo = -ln2_lo; k = -1; }
    } else {
      k = Math.trunc(invln2 * x + (xsb === 0 ? 0.5 : -0.5));
      t = k;
      hi = x - t * ln2_hi;
      lo = t * ln2_lo;
    }
    x = hi - lo;
    c = (hi - x) - lo;
  } else if (hx < 0x3c900000) {
    return x;
  } else k = 0;
  const hfx = 0.5 * x;
  const hxs = x * hfx;
  const r1 = 1.0 + hxs * (Q1 + hxs * (Q2 + hxs * (Q3 + hxs * (Q4 + hxs * Q5))));
  t = 3.0 - r1 * hfx;
  e = hxs * ((r1 - t) / (6.0 - x * t));
  if (k === 0) return x - (x * e - hxs);
  const twopk = words(((0x3ff + k) << 20) >>> 0, 0);
  e = (x * (e - c) - c);
  e -= hxs;
  if (k === -1) return 0.5 * (x - e) - 0.5;
  if (k === 1) {
    if (x < -0.25) return -2.0 * (e - (x + 0.5));
    return 1.0 + 2.0 * (x - e);
  }
  if (k <= -2 || k > 56) {
    y = 1.0 - (e - x);
    if (k === 1024) y = y * 2.0 * P1023;
    else y = y * twopk;
    return y - 1.0;
  }
  if (k < 20) {
    t = words(0x3ff00000 - (0x200000 >> k), 0);
    y = t - (e - x);
    y = y * twopk;
  } else {
    t = words((0x3ff - k) << 20, 0);
    y = x - (e + t);
    y += 1.0;
    y = y * twopk;
  }
  return y;
}

const shuge = 1.0e307, kln2 = 1246.97177782734161156;

/** sinh (msun; exp — AOR bionic). */
export function sinh(x) {
  let t;
  const jx = hiOf(x);
  const ix = jx & 0x7fffffff;
  if (ix >= 0x7ff00000) return x + x;
  let h = 0.5;
  if (jx < 0) h = -h;
  if (ix < 0x40360000) {
    if (ix < 0x3e300000) return x;
    t = expm1(Math.abs(x));
    if (ix < 0x3ff00000) return h * (2.0 * t - t * t / (t + 1.0));
    return h * (t + t / (t + 1.0));
  }
  if (ix < 0x40862E42) return h * aorExp(Math.abs(x));
  if (ix <= 0x408633CE) {
    // __ldexp_exp(|x|, -1): exp(|x| − k·ln2) с подменой показателя, затем масштаб
    const ex = aorExp(Math.abs(x) - kln2);
    const hx = hiOf(ex);
    const expt = -1 + ((hx >>> 20) - (0x3ff + 1023) + 1799);
    const m = withHi(ex, (hx & 0xfffff) | ((0x3ff + 1023) << 20));
    return h * 2.0 * (m * words((0x3ff + expt) << 20, 0));
  }
  return x * shuge;
}

// ---------------------------------------------------------------- cbrt

const B1 = 715094163, B2 = 696219795;
const P0 = 1.87595182427177009643, P1 = -1.88497979543377169875, P2 = 1.621429720105354466140,
  P3 = -0.758397934778766047437, P4 = 0.145996192886612446982;

/** cbrt (msun). */
export function cbrt(x) {
  let r, s, t, w;
  let hx = hiOf(x);
  const low = loOf(x);
  const sign = hx & 0x80000000;
  hx ^= sign;
  if (hx >= 0x7ff00000) return x + x;
  if (hx < 0x00100000) {
    if ((hx | low) === 0) return x;
    t = words(0x43500000, 0);
    t *= x;
    const high = hiOf(t);
    t = words((sign | (Math.trunc((high & 0x7fffffff) / 3) + B2)) >>> 0, 0);
  } else t = words((sign | (Math.trunc(hx / 3) + B1)) >>> 0, 0);
  r = (t * t) * (t / x);
  t = t * ((P0 + r * (P1 + r * P2)) + ((r * r) * r) * (P3 + r * P4));
  // округление до 22 бит: +0x80000000 к 64-битному образу, затем обнуление младших 30 бит
  F[0] = t;
  let lo = W[LO] + 0x80000000, hi = W[HI];
  if (lo >= 4294967296) { lo -= 4294967296; hi = (hi + 1) >>> 0; }
  t = words(hi, (lo & 0xc0000000) >>> 0);
  s = t * t;
  r = x / s;
  w = t + t;
  r = (r - t) / (w + r);
  t = t + t * r;
  return t;
}

// ---------------------------------------------------------------- fmod, modf, round, lround

/** fmod (msun), сдвиговый алгоритм на 32-битных словах. */
export function fmod(x, y) {
  let n, hx = hiOf(x), hy = hiOf(y), hz, ix, iy, i;
  let lx = loOf(x), ly = loOf(y), lz;
  const sx = hx & 0x80000000;
  hx ^= sx;
  hy &= 0x7fffffff;
  if ((hy | ly) === 0 || hx >= 0x7ff00000 || (hy | ((ly | -ly) >>> 31)) >>> 0 > 0x7ff00000) return NaN;
  const zero = sx ? -0.0 : 0.0;
  if (hx <= hy) {
    if (hx < hy || lx < ly) return x;
    if (lx === ly) return zero;
  }
  if (hx < 0x00100000) {
    if (hx === 0) { for (ix = -1043, i = lx | 0; i > 0; i <<= 1) ix -= 1; }
    else { for (ix = -1022, i = hx << 11; i > 0; i <<= 1) ix -= 1; }
  } else ix = (hx >> 20) - 1023;
  if (hy < 0x00100000) {
    if (hy === 0) { for (iy = -1043, i = ly | 0; i > 0; i <<= 1) iy -= 1; }
    else { for (iy = -1022, i = hy << 11; i > 0; i <<= 1) iy -= 1; }
  } else iy = (hy >> 20) - 1023;
  if (ix >= -1022) hx = 0x00100000 | (0x000fffff & hx);
  else {
    n = -1022 - ix;
    if (n <= 31) { hx = (hx << n) | (lx >>> (32 - n)); lx = (lx << n) >>> 0; }
    else { hx = lx << (n - 32); lx = 0; }
  }
  if (iy >= -1022) hy = 0x00100000 | (0x000fffff & hy);
  else {
    n = -1022 - iy;
    if (n <= 31) { hy = (hy << n) | (ly >>> (32 - n)); ly = (ly << n) >>> 0; }
    else { hy = ly << (n - 32); ly = 0; }
  }
  n = ix - iy;
  while (n--) {
    hz = (hx - hy) | 0; lz = (lx - ly) >>> 0; if (lx < ly) hz = (hz - 1) | 0;
    if (hz < 0) { hx = (hx + hx + (lx >>> 31)) | 0; lx = (lx + lx) >>> 0; }
    else {
      if ((hz | lz) === 0) return zero;
      hx = (hz + hz + (lz >>> 31)) | 0; lx = (lz + lz) >>> 0;
    }
  }
  hz = (hx - hy) | 0; lz = (lx - ly) >>> 0; if (lx < ly) hz = (hz - 1) | 0;
  if (hz >= 0) { hx = hz; lx = lz; }
  if ((hx | lx) === 0) return zero;
  while (hx < 0x00100000) { hx = (hx + hx + (lx >>> 31)) | 0; lx = (lx + lx) >>> 0; iy -= 1; }
  if (iy >= -1022) {
    hx = (hx - 0x00100000) | ((iy + 1023) << 20);
    return words(hx | sx, lx);
  }
  n = -1022 - iy;
  if (n <= 20) { lx = ((lx >>> n) | (hx << (32 - n))) >>> 0; hx >>= n; }
  else if (n <= 31) { lx = ((hx << (32 - n)) | (lx >>> n)) >>> 0; hx = sx; }
  else { lx = hx >>> (n - 32); hx = sx; }
  return words(hx | sx, lx) * 1.0;
}

/** modf (msun) → [дробная часть, целая часть]. */
export function modf(x) {
  const i0 = hiOf(x), i1 = loOf(x);
  const j0 = ((i0 >> 20) & 0x7ff) - 0x3ff;
  if (j0 < 20) {
    if (j0 < 0) return [x, words(i0 & 0x80000000, 0)];
    const i = 0x000fffff >> j0;
    if (((i0 & i) | i1) === 0) return [words(i0 & 0x80000000, 0), x];
    const ip = words(i0 & ~i, 0);
    return [x - ip, ip];
  } else if (j0 > 51) {
    if (j0 === 0x400) return [0.0 / x, x];
    return [words(i0 & 0x80000000, 0), x * 1.0];
  }
  const i = 0xffffffff >>> (j0 - 20);
  if ((i1 & i) === 0) return [words(i0 & 0x80000000, 0), x];
  const ip = words(i0, (i1 & ~i) >>> 0);
  return [x - ip, ip];
}

/** round (msun): половина — от нуля. */
export function round(x) {
  const hx = hiOf(x);
  if ((hx & 0x7fffffff) === 0x7ff00000) return x + x;
  let t;
  if (!(hx & 0x80000000)) {
    t = Math.floor(x);
    if (t - x <= -0.5) t += 1;
    return t;
  }
  t = Math.floor(-x);
  if (t + x <= -0.5) t += 1;
  return -t;
}

const TWO63 = 9223372036854775808;
/** lround (msun) → BigInt int64. У double диапазон проверки msun вырождается (INRANGE всегда истинно), поэтому
 * результат — перевод round(x) в int64 инструкцией x86_64: вне [−2^63, 2^63) и NaN → −2^63. */
export function lround(x) {
  const r = round(x);
  if (r >= -TWO63 && r < TWO63) return BigInt(r);
  return -9223372036854775808n;
}
