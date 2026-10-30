// spec: libm
// Своя libm ядра, ч.2 (этап 5.2), float32: expf logf powf sinf cosf sincosf (arm-optimized-routines — в них
// вычисления идут в double) и acosf atanf atan2f log10f tanf fmodf modff roundf lroundf (FreeBSD msun — арифметика float,
// каждая операция округляется до float32 через Math.fround). Бит в бит как bionic-libm Android 14 x86_64 у O.
// Лицензии: AOR — Copyright (c) 2017-2020, Arm Limited, SPDX-License-Identifier: MIT OR Apache-2.0 WITH LLVM-exception;
// msun — Copyright (C) 1993 by Sun Microsystems, Inc. «Permission to use, copy, modify, and distribute this software is
// freely granted, provided that this notice is preserved.» (tanf/k_tandf — Bruce D. Evans, FreeBSD). Код игры не участвует.
// Аргументы и результаты — числа JS, равные float32 (Math.fround). NaN совпадает как класс: сигнальный NaN во float
// в JS не передаётся (при переводе float→double он становится тихим).

import {
  EXP2F_TAB, EXP2F_SHIFT_SCALED, EXP2F_POLY, EXP2F_SHIFT, EXP2F_INVLN2_SCALED, EXP2F_POLY_SCALED,
  LOGF_TAB, LOGF_LN2, LOGF_POLY, POWF_LOG2_TAB, POWF_LOG2_POLY, SINCOSF_TABLE, INV_PIO4,
} from './libm-tables52.mjs';
import { kernelRemPio2 } from './libm-trig.mjs';

const fr = Math.fround;
const FF = new Float32Array(1);
const FU = new Uint32Array(FF.buffer);
const D = new Float64Array(1);
const DW = new Uint32Array(D.buffer);
D[0] = 1;
const HI = DW[1] === 0x3ff00000 ? 1 : 0;
const LO = 1 - HI;

function asuint(x) { FF[0] = x; return FU[0]; }
function asfloat(u) { FU[0] = u >>> 0; return FF[0]; }
function dwords(hi, lo) { DW[HI] = hi >>> 0; DW[LO] = lo >>> 0; return D[0]; }
const TAB_W = new Uint32Array(EXP2F_TAB.buffer); // EXP2F_TAB — биты uint64: слова [lo, hi] (little-endian)

// масштаб 2^(k/N) из таблицы: биты tab[ki % 32] + (ki << 47); ki — младшие 32 бита k (целого в двойном сдвиге)
// kiIdx — младшее слово ki (индекс таблицы ki % 32), kiShift — младшее слово сдвигаемого значения (у powf ki + знак)
function scaleFrom(kiIdx, kiShift) {
  const j = kiIdx & 31;
  const lo = TAB_W[2 * j + LO];
  let hi = TAB_W[2 * j + HI];
  // + (ki << 47) по модулю 2^64: к старшему слову прибавляются младшие 17 бит ki, сдвинутые на 15
  hi = (hi + (kiShift & 0x1ffff) * 32768) >>> 0;
  return dwords(hi, lo);
}

// ---------------------------------------------------------------- expf

const N2 = 32;
const InvLn2N = EXP2F_INVLN2_SCALED[0], SHIFT = EXP2F_SHIFT[0], SHIFT_SCALED = EXP2F_SHIFT_SCALED[0];
const CS = EXP2F_POLY_SCALED, CP = EXP2F_POLY;
const TOP88 = 0x42b >>> 0; // top12(88.0f) = 0x42b00000 >> 20

/** e^x во float (AOR expf). */
export function expf(x) {
  x = fr(x);
  const ux = asuint(x);
  const abstop = (ux >>> 20) & 0x7ff;
  if (abstop >= TOP88) {
    if (ux === 0xff800000) return 0;
    if (abstop >= 0x7f8) return x + x;
    if (x > 88.72283172607421875) return Infinity;       // 0x1.62e42ep6f
    if (x < -103.97207641601562) return 0;               // 0x1.9fe368p6f
  }
  let z = InvLn2N * x;
  let kd = z + SHIFT;
  D[0] = kd;
  const kiLo = DW[LO];
  kd -= SHIFT;
  const r = z - kd;
  const s = scaleFrom(kiLo, kiLo);
  z = CS[0] * r + CS[1];
  const r2 = r * r;
  let y = CS[2] * r + 1;
  y = z * r2 + y;
  y = y * s;
  return fr(y);
}

// ---------------------------------------------------------------- logf

const LOGF_OFF = 0x3f330000;
const Ln2 = LOGF_LN2[0];
const LA = LOGF_POLY;

/** ln x во float (AOR logf). */
export function logf(x) {
  x = fr(x);
  let ix = asuint(x);
  if (ix === 0x3f800000) return 0;
  if (((ix - 0x00800000) >>> 0) >= 0x7f800000 - 0x00800000) {
    if (((ix * 2) >>> 0) === 0) return -Infinity;
    if (ix === 0x7f800000) return x;
    if ((ix & 0x80000000) || ((ix * 2) >>> 0) >= 0xff000000) return NaN;
    ix = asuint(fr(x * 8388608));
    ix = (ix - (23 << 23)) >>> 0;
  }
  const tmp = (ix - LOGF_OFF) >>> 0;
  const i = (tmp >>> (23 - 4)) % 16;
  const k = (tmp | 0) >> 23;
  const iz = (ix - (tmp & 0xff800000)) >>> 0;
  const invc = LOGF_TAB[2 * i], logc = LOGF_TAB[2 * i + 1];
  const z = asfloat(iz);
  const r = z * invc - 1;
  const y0 = logc + k * Ln2;
  const r2 = r * r;
  let y = LA[1] * r + LA[2];
  y = LA[0] * r2 + y;
  y = y * r2 + (y0 + r);
  return fr(y);
}

// ---------------------------------------------------------------- powf

const PA = POWF_LOG2_POLY;
const SIGN_BIAS = 1 << (5 + 11);

function log2Inline(ix) {
  const tmp = (ix - LOGF_OFF) >>> 0;
  const i = (tmp >>> (23 - 4)) % 16;
  const top = (tmp & 0xff800000) >>> 0;
  const iz = (ix - top) >>> 0;
  const k = (top | 0) >> 23;
  const invc = POWF_LOG2_TAB[2 * i], logc = POWF_LOG2_TAB[2 * i + 1];
  const z = asfloat(iz);
  const r = z * invc - 1;
  const y0 = logc + k;
  const r2 = r * r;
  let y = PA[0] * r + PA[1];
  const p = PA[2] * r + PA[3];
  const r4 = r2 * r2;
  let q = PA[4] * r + y0;
  q = p * r2 + q;
  y = y * r4 + q;
  return y;
}

function exp2Inline(xd, signBias) {
  let kd = xd + SHIFT_SCALED;
  D[0] = kd;
  const kiLo = DW[LO];
  kd -= SHIFT_SCALED;
  const r = xd - kd;
  const s = scaleFrom(kiLo, (kiLo + signBias) >>> 0);
  const z = CP[0] * r + CP[1];
  const r2 = r * r;
  let y = CP[2] * r + 1;
  y = z * r2 + y;
  y = y * s;
  return fr(y);
}

function checkint(iy) {
  const e = (iy >>> 23) & 0xff;
  if (e < 0x7f) return 0;
  if (e > 0x7f + 23) return 2;
  if (iy & ((1 << (0x7f + 23 - e)) - 1)) return 0;
  if (iy & (1 << (0x7f + 23 - e))) return 1;
  return 2;
}
function zeroinfnan(ix) { return ((2 * ix - 1) >>> 0) >= ((2 * 0x7f800000 - 1) >>> 0); }

const YLOGX_TOP = 0x80bf; // asuint64(126.0) >> 47 (POWF_SCALE = 1)
const YLOGX_OFLOW = 0x1fffffffd1d571 / 70368744177664; // 0x1.fffffffd1d571p+6

/** x^y во float (AOR powf). */
export function powf(x, y) {
  x = fr(x); y = fr(y);
  let signBias = 0;
  let ix = asuint(x);
  const iy = asuint(y);
  if (((ix - 0x00800000) >>> 0) >= 0x7f800000 - 0x00800000 || zeroinfnan(iy)) {
    if (zeroinfnan(iy)) {
      if (((2 * iy) >>> 0) === 0) return 1;           // сигнальный NaN в x не различим в JS (см. шапку)
      if (ix === 0x3f800000) return 1;
      if (((2 * ix) >>> 0) > 2 * 0x7f800000 || ((2 * iy) >>> 0) > 2 * 0x7f800000) return x + y;
      if (((2 * ix) >>> 0) === 2 * 0x3f800000) return 1;
      if ((((2 * ix) >>> 0) < 2 * 0x3f800000) === !(iy & 0x80000000)) return 0;
      return fr(y * y);
    }
    if (zeroinfnan(ix)) {
      let x2 = fr(x * x);
      if ((ix & 0x80000000) && checkint(iy) === 1) { x2 = -x2; signBias = 1; }
      if (((2 * ix) >>> 0) === 0 && (iy & 0x80000000)) return signBias ? -Infinity : Infinity;
      return (iy & 0x80000000) ? fr(1 / x2) : x2;
    }
    if (ix & 0x80000000) {
      const yint = checkint(iy);
      if (yint === 0) return NaN;
      if (yint === 1) signBias = SIGN_BIAS;
      ix = (ix & 0x7fffffff) >>> 0;
    }
    if (ix < 0x00800000) {
      ix = asuint(fr(x * 8388608));
      ix = (ix & 0x7fffffff) >>> 0;
      ix = (ix - (23 << 23)) >>> 0;
    }
  }
  const logx = log2Inline(ix);
  const ylogx = y * logx;
  D[0] = ylogx;
  if (((DW[HI] >>> 15) & 0xffff) >= YLOGX_TOP) {
    const neg = signBias !== 0;
    if (ylogx > YLOGX_OFLOW) return neg ? -Infinity : Infinity;
    if (ylogx <= -150.0) return neg ? -0 : 0;
  }
  return exp2Inline(ylogx, signBias);
}

// ---------------------------------------------------------------- sinf / cosf / sincosf (AOR)

const TBL = [0, 1].map((t) => {
  const o = t * 14, a = SINCOSF_TABLE;
  return { sign: [a[o], a[o + 1], a[o + 2], a[o + 3]], hpi_inv: a[o + 4], hpi: a[o + 5],
    c0: a[o + 6], c1: a[o + 7], c2: a[o + 8], c3: a[o + 9], c4: a[o + 10], s1: a[o + 11], s2: a[o + 12], s3: a[o + 13] };
});
const pi63 = 3.4061215800865545e-19; // 0x1.921FB54442D18p-62
function abstop12(x) { return (asuint(x) >>> 20) & 0x7ff; }
const AT_PIO4 = 0x3f4, AT_2M12 = 0x398, AT_120 = 0x42f, AT_INF = 0x7f8;

function sinfPoly(x, x2, p, n) {
  if ((n & 1) === 0) {
    const x3 = x * x2;
    const s1 = p.s2 + x2 * p.s3;
    const x7 = x3 * x2;
    const s = x + x3 * p.s1;
    return s + x7 * s1;
  }
  const x4 = x2 * x2;
  const c2 = p.c3 + x2 * p.c4;
  const c1 = p.c0 + x2 * p.c1;
  const x6 = x4 * x2;
  const c = c1 + x4 * p.c2;
  return c + x6 * c2;
}
function sincosfPoly(x, x2, p, n, out) {
  const x4 = x2 * x2, x3 = x2 * x;
  const c2 = p.c3 + x2 * p.c4;
  const s1 = p.s2 + x2 * p.s3;
  const si = n & 1 ? 1 : 0, ci = 1 - si;
  const c1 = p.c0 + x2 * p.c1;
  const x5 = x3 * x2, x6 = x4 * x2;
  const s = x + x3 * p.s1;
  const c = c1 + x4 * p.c2;
  out[si] = fr(s + x5 * s1);
  out[ci] = fr(c + x6 * c2);
}
let NQ = 0;
function reduceFast(x, p) {
  const r = x * p.hpi_inv;
  const n = ((r | 0) + 0x800000) >> 24;
  NQ = n;
  return x - n * p.hpi;
}
const M64 = (1n << 64n) - 1n;
function reduceLarge(xi) {
  const a = (xi >>> 26) & 15;
  const shift = (xi >>> 23) & 7;
  let x = BigInt((((xi & 0xffffff) | 0x800000) << shift) >>> 0);
  const res0a = (x * BigInt(INV_PIO4[a])) & 0xffffffffn;
  const res1 = x * BigInt(INV_PIO4[a + 4]);
  const res2 = x * BigInt(INV_PIO4[a + 8]);
  let res0 = ((res2 >> 32n) | (res0a << 32n)) & M64;
  res0 = (res0 + res1) & M64;
  const n = ((res0 + (1n << 61n)) & M64) >> 62n;
  res0 = (res0 - (n << 62n)) & M64;
  NQ = Number(n);
  return Number(BigInt.asIntN(64, res0)) * pi63;
}

/** sin во float (AOR sinf). */
export function sinf(y) {
  y = fr(y);
  let x = y, s, n, p = TBL[0];
  const at = abstop12(y);
  if (at < AT_PIO4) {
    s = x * x;
    if (at < AT_2M12) return y;
    return fr(sinfPoly(x, s, p, 0));
  } else if (at < AT_120) {
    x = reduceFast(x, p); n = NQ;
    s = p.sign[n & 3];
    if (n & 2) p = TBL[1];
    return fr(sinfPoly(x * s, x * x, p, n));
  } else if (at < AT_INF) {
    const xi = asuint(y);
    const sign = xi >>> 31;
    x = reduceLarge(xi); n = NQ;
    s = p.sign[(n + sign) & 3];
    if ((n + sign) & 2) p = TBL[1];
    return fr(sinfPoly(x * s, x * x, p, n));
  }
  return NaN;
}

/** cos во float (AOR cosf). */
export function cosf(y) {
  y = fr(y);
  let x = y, s, n, p = TBL[0];
  const at = abstop12(y);
  if (at < AT_PIO4) {
    const x2 = x * x;
    if (at < AT_2M12) return 1;
    return fr(sinfPoly(x, x2, p, 1));
  } else if (at < AT_120) {
    x = reduceFast(x, p); n = NQ;
    s = p.sign[n & 3];
    if (n & 2) p = TBL[1];
    return fr(sinfPoly(x * s, x * x, p, n ^ 1));
  } else if (at < AT_INF) {
    const xi = asuint(y);
    const sign = xi >>> 31;
    x = reduceLarge(xi); n = NQ;
    s = p.sign[(n + sign) & 3];
    if ((n + sign) & 2) p = TBL[1];
    return fr(sinfPoly(x * s, x * x, p, n ^ 1));
  }
  return NaN;
}

/** sincosf (AOR) → [sin, cos] во float. */
export function sincosf(y) {
  y = fr(y);
  const out = [0, 0];
  let x = y, s, n, p = TBL[0];
  const at = abstop12(y);
  if (at < AT_PIO4) {
    const x2 = x * x;
    if (at < AT_2M12) { out[0] = y; out[1] = 1; return out; }
    sincosfPoly(x, x2, p, 0, out);
  } else if (at < AT_120) {
    x = reduceFast(x, p); n = NQ;
    s = p.sign[n & 3];
    if (n & 2) p = TBL[1];
    sincosfPoly(x * s, x * x, p, n, out);
  } else if (at < AT_INF) {
    const xi = asuint(y);
    const sign = xi >>> 31;
    x = reduceLarge(xi); n = NQ;
    s = p.sign[(n + sign) & 3];
    if ((n + sign) & 2) p = TBL[1];
    sincosfPoly(x * s, x * x, p, n, out);
  } else { out[0] = out[1] = NaN; }
  return out;
}

// ---------------------------------------------------------------- acosf (msun, арифметика float)

const f_pi = fr(3.1415925026e+00), f_pio2_hi = fr(1.5707962513e+00), f_pio2_lo = fr(7.5497894159e-08);
const f_pS0 = fr(1.6666586697e-01), f_pS1 = fr(-4.2743422091e-02), f_pS2 = fr(-8.6563630030e-03), f_qS1 = fr(-7.0662963390e-01);

/** arccos во float (msun acosf). */
export function acosf(x) {
  x = fr(x);
  let z, p, q, r, w, s, c, df;
  const hx = asuint(x) | 0;
  const ix = hx & 0x7fffffff;
  if (ix >= 0x3f800000) {
    if (ix === 0x3f800000) return hx > 0 ? 0 : fr(f_pi + fr(2 * f_pio2_lo));
    return NaN;
  }
  if (ix < 0x3f000000) {
    if (ix <= 0x32800000) return fr(f_pio2_hi + f_pio2_lo);
    z = fr(x * x);
    p = fr(z * fr(f_pS0 + fr(z * fr(f_pS1 + fr(z * f_pS2)))));
    q = fr(1 + fr(z * f_qS1));
    r = fr(p / q);
    return fr(f_pio2_hi - fr(x - fr(f_pio2_lo - fr(x * r))));
  } else if (hx < 0) {
    z = fr(fr(1 + x) * 0.5);
    p = fr(z * fr(f_pS0 + fr(z * fr(f_pS1 + fr(z * f_pS2)))));
    q = fr(1 + fr(z * f_qS1));
    s = fr(Math.sqrt(z));
    r = fr(p / q);
    w = fr(fr(r * s) - f_pio2_lo);
    return fr(f_pi - fr(2 * fr(s + w)));
  }
  z = fr(fr(1 - x) * 0.5);
  s = fr(Math.sqrt(z));
  df = asfloat(asuint(s) & 0xfffff000);
  c = fr(fr(z - fr(df * df)) / fr(s + df));
  p = fr(z * fr(f_pS0 + fr(z * fr(f_pS1 + fr(z * f_pS2)))));
  q = fr(1 + fr(z * f_qS1));
  r = fr(p / q);
  w = fr(fr(r * s) + c);
  return fr(2 * fr(df + w));
}

// ---------------------------------------------------------------- atanf / atan2f

const f_atanhi = [4.6364760399e-01, 7.8539812565e-01, 9.8279368877e-01, 1.5707962513e+00].map(fr);
const f_atanlo = [5.0121582440e-09, 3.7748947079e-08, 3.4473217170e-08, 7.5497894159e-08].map(fr);
const f_aT = [3.3333328366e-01, -1.9999158382e-01, 1.4253635705e-01, -1.0648017377e-01, 6.1687607318e-02].map(fr);

/** arctan во float (msun atanf). */
export function atanf(x) {
  x = fr(x);
  let w, s1, s2, z, id;
  const hx = asuint(x) | 0;
  const ix = hx & 0x7fffffff;
  if (ix >= 0x4c800000) {
    if (ix > 0x7f800000) return x + x;
    return hx > 0 ? fr(f_atanhi[3] + f_atanlo[3]) : fr(-f_atanhi[3] - f_atanlo[3]);
  }
  if (ix < 0x3ee00000) {
    if (ix < 0x39800000) return x;
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3f980000) {
      if (ix < 0x3f300000) { id = 0; x = fr(fr(fr(2 * x) - 1) / fr(2 + x)); }
      else { id = 1; x = fr(fr(x - 1) / fr(x + 1)); }
    } else if (ix < 0x401c0000) { id = 2; x = fr(fr(x - 1.5) / fr(1 + fr(1.5 * x))); }
    else { id = 3; x = fr(-1 / x); }
  }
  z = fr(x * x);
  w = fr(z * z);
  s1 = fr(z * fr(f_aT[0] + fr(w * fr(f_aT[2] + fr(w * f_aT[4])))));
  s2 = fr(w * fr(f_aT[1] + fr(w * f_aT[3])));
  if (id < 0) return fr(x - fr(x * fr(s1 + s2)));
  z = fr(f_atanhi[id] - fr(fr(fr(x * fr(s1 + s2)) - f_atanlo[id]) - x));
  return hx < 0 ? -z : z;
}

const f_tiny = fr(1.0e-30), f_pi_o_4 = fr(7.8539818525e-01), f_pi_o_2 = fr(1.5707963705e+00), f_pi2 = fr(3.1415927410e+00),
  f_pi_lo = fr(-8.7422776573e-08);

/** atan2(y, x) во float (msun atan2f). */
export function atan2f(y, x) {
  y = fr(y); x = fr(x);
  let z;
  const hx = asuint(x) | 0, hy = asuint(y) | 0;
  const ix = hx & 0x7fffffff, iy = hy & 0x7fffffff;
  if (ix > 0x7f800000 || iy > 0x7f800000) return x + y;
  if (hx === 0x3f800000) return atanf(y);
  let m = ((hy >> 31) & 1) | ((hx >> 30) & 2);
  if (iy === 0) {
    switch (m) { case 0: case 1: return y; case 2: return fr(f_pi2 + f_tiny); default: return fr(-f_pi2 - f_tiny); }
  }
  if (ix === 0) return hy < 0 ? fr(-f_pi_o_2 - f_tiny) : fr(f_pi_o_2 + f_tiny);
  if (ix === 0x7f800000) {
    if (iy === 0x7f800000) {
      switch (m) {
        case 0: return fr(f_pi_o_4 + f_tiny); case 1: return fr(-f_pi_o_4 - f_tiny);
        case 2: return fr(fr(3 * f_pi_o_4) + f_tiny); default: return fr(fr(-3 * f_pi_o_4) - f_tiny);
      }
    }
    switch (m) { case 0: return 0; case 1: return -0; case 2: return fr(f_pi2 + f_tiny); default: return fr(-f_pi2 - f_tiny); }
  }
  if (iy === 0x7f800000) return hy < 0 ? fr(-f_pi_o_2 - f_tiny) : fr(f_pi_o_2 + f_tiny);
  const k = (iy - ix) >> 23;
  if (k > 26) { z = fr(f_pi_o_2 + fr(0.5 * f_pi_lo)); m &= 1; }
  else if (k < -26 && hx < 0) z = 0;
  else z = atanf(Math.abs(fr(y / x)));
  switch (m) {
    case 0: return z;
    case 1: return -z;
    case 2: return fr(f_pi2 - fr(z - f_pi_lo));
    default: return fr(fr(z - f_pi_lo) - f_pi2);
  }
}

// ---------------------------------------------------------------- log10f

const two25 = 33554432, ivln10hi = fr(4.3432617188e-01), ivln10lo = fr(-3.1689971365e-05),
  log10_2hi = fr(3.0102920532e-01), log10_2lo = fr(7.9034151668e-07);
const Lg1 = 0xaaaaaa / 16777216, Lg2 = 0xccce13 / 33554432, Lg3 = 0x91e9ee / 33554432, Lg4 = 0xf89e26 / 67108864;

function kLog1pf(f) {
  const s = fr(f / fr(2 + f));
  const z = fr(s * s);
  const w = fr(z * z);
  const t1 = fr(w * fr(Lg2 + fr(w * Lg4)));
  const t2 = fr(z * fr(Lg1 + fr(w * Lg3)));
  const R = fr(t2 + t1);
  const hfsq = fr(fr(0.5 * f) * f);
  return fr(s * fr(hfsq + R));
}

/** log10 во float (msun log10f). */
export function log10f(x) {
  x = fr(x);
  let hx = asuint(x) | 0;
  let k = 0;
  if (hx < 0x00800000) {
    if ((hx & 0x7fffffff) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 25; x = fr(x * two25);
    hx = asuint(x) | 0;
  }
  if (hx >= 0x7f800000) return x + x;
  if (hx === 0x3f800000) return 0;
  k += (hx >> 23) - 127;
  hx &= 0x007fffff;
  const i = (hx + 0x4afb0d) & 0x800000;
  x = asfloat(hx | (i ^ 0x3f800000));
  k += i >> 23;
  const y = fr(k);
  const f = fr(x - 1);
  const hfsq = fr(fr(0.5 * f) * f);
  const r = kLog1pf(f);
  let hi = fr(f - hfsq);
  hi = asfloat(asuint(hi) & 0xfffff000);
  const lo = fr(fr(fr(f - hi) - hfsq) + r);
  return fr(fr(fr(fr(fr(y * log10_2lo) + fr(fr(lo + hi) * ivln10lo)) + fr(lo * ivln10hi)) + fr(hi * ivln10hi)) + fr(y * log10_2hi));
}

// ---------------------------------------------------------------- tanf (вычисления в double)

const TF = [
  0x15554d3418c99f / 18014398509481984, 0x1112fd38999f72 / 36028797018963968,
  0x1b54c91d865afe / 144115188075855872, 0x191df3908c33ce / 288230376151711744,
  0x185dadfcecf44e / 2305843009213693952, 0x1362b9bf971bcd / 576460752303423488,
];
function kTandf(x, iy) {
  const z = x * x;
  let r = TF[4] + z * TF[5];
  const t = TF[2] + z * TF[3];
  const w = z * z;
  const s = z * x;
  const u = TF[0] + z * TF[1];
  r = (x + s * u) + (s * w) * (t + w * r);
  if (iy === 1) return fr(r);
  return fr(-1.0 / r);
}
const M_PI_2 = 1.57079632679489661923;
const t1pio2 = 1 * M_PI_2, t2pio2 = 2 * M_PI_2, t3pio2 = 3 * M_PI_2, t4pio2 = 4 * M_PI_2;
const f_invpio2 = 6.36619772367581382433e-01, f_pio2_1 = 1.57079631090164184570e+00, f_pio2_1t = 1.58932547735281966916e-08;
const RN = 6755399441055744;

/** tan во float (msun tanf). */
export function tanf(x) {
  x = fr(x);
  const hx = asuint(x) | 0;
  const ix = hx & 0x7fffffff;
  if (ix <= 0x3f490fda) {
    if (ix < 0x39800000) return x;
    return kTandf(x, 1);
  }
  if (ix <= 0x407b53d1) {
    if (ix <= 0x4016cbe3) return kTandf(x + (hx > 0 ? -t1pio2 : t1pio2), -1);
    return kTandf(x + (hx > 0 ? -t2pio2 : t2pio2), 1);
  }
  if (ix <= 0x40e231d5) {
    if (ix <= 0x40afeddf) return kTandf(x + (hx > 0 ? -t3pio2 : t3pio2), -1);
    return kTandf(x + (hx > 0 ? -t4pio2 : t4pio2), 1);
  }
  if (ix >= 0x7f800000) return x - x;
  // __ieee754_rem_pio2f
  let n, y;
  if (ix < 0x4dc90fdb) {
    const fn = (x * f_invpio2 + RN) - RN;
    n = fn | 0;
    const r = x - fn * f_pio2_1;
    const w = fn * f_pio2_1t;
    y = r - w;
  } else {
    const e0 = (ix >> 23) - 150;
    const z = asfloat(ix - (e0 << 23));
    const ty = [0];
    n = kernelRemPio2([z], ty, e0, 1, 0);
    if (hx < 0) { y = -ty[0]; n = -n; } else y = ty[0];
  }
  return kTandf(y, 1 - ((n & 1) << 1));
}

// ---------------------------------------------------------------- fmodf, modff, roundf, lroundf

/** fmod во float (msun fmodf, со сдвиговым циклом на 32 битах). */
export function fmodf(x, y) {
  x = fr(x); y = fr(y);
  let n, hx = asuint(x) | 0, hy = asuint(y) | 0, hz, ix, iy, i;
  const sx = hx & 0x80000000;
  hx ^= sx;
  hy &= 0x7fffffff;
  if (hy === 0 || hx >= 0x7f800000 || hy > 0x7f800000) return NaN;
  const zero = sx ? -0 : 0;
  if (hx < hy) return x;
  if (hx === hy) return zero;
  if (hx < 0x00800000) { for (ix = -126, i = hx << 8; i > 0; i <<= 1) ix -= 1; }
  else ix = (hx >> 23) - 127;
  if (hy < 0x00800000) { for (iy = -126, i = hy << 8; i >= 0; i <<= 1) iy -= 1; }
  else iy = (hy >> 23) - 127;
  if (ix >= -126) hx = 0x00800000 | (0x007fffff & hx);
  else { n = -126 - ix; hx = hx << n; }
  if (iy >= -126) hy = 0x00800000 | (0x007fffff & hy);
  else { n = -126 - iy; hy = hy << n; }
  n = ix - iy;
  while (n--) {
    hz = (hx - hy) | 0;
    if (hz < 0) hx = (hx + hx) | 0;
    else {
      if (hz === 0) return zero;
      hx = (hz + hz) | 0;
    }
  }
  hz = (hx - hy) | 0;
  if (hz >= 0) hx = hz;
  if (hx === 0) return zero;
  while (hx < 0x00800000) { hx = (hx + hx) | 0; iy -= 1; }
  if (iy >= -126) {
    hx = (hx - 0x00800000) | ((iy + 127) << 23);
    return asfloat(hx | sx);
  }
  n = -126 - iy;
  hx >>= n;
  return asfloat(hx | sx);
}

/** modff (msun) → [дробная, целая] во float. */
export function modff(x) {
  x = fr(x);
  const i0 = asuint(x) | 0;
  const j0 = ((i0 >> 23) & 0xff) - 0x7f;
  if (j0 < 23) {
    if (j0 < 0) return [x, asfloat(i0 & 0x80000000)];
    const i = 0x007fffff >> j0;
    if ((i0 & i) === 0) return [asfloat(i0 & 0x80000000), x];
    const ip = asfloat(i0 & ~i);
    return [fr(x - ip), ip];
  }
  if (x !== x) return [x, x];
  return [asfloat(i0 & 0x80000000), x];
}

/** roundf (msun): половина — от нуля. */
export function roundf(x) {
  x = fr(x);
  const hx = asuint(x);
  if ((hx & 0x7fffffff) === 0x7f800000) return x + x;
  let t;
  if (!(hx & 0x80000000)) {
    t = Math.floor(x);
    if (fr(t - x) <= -0.5) t += 1;
    return fr(t);
  }
  t = Math.floor(-x);
  if (fr(t + x) <= -0.5) t += 1;
  return fr(-t);
}

const TWO63 = 9223372036854775808;
/** lroundf (msun) → BigInt int64: перевод roundf(x) в int64 (x86_64): вне [−2^63, 2^63) и NaN → −2^63. */
export function lroundf(x) {
  const r = roundf(x);
  if (r >= -TWO63 && r < TWO63) return BigInt(r);
  return -9223372036854775808n;
}
