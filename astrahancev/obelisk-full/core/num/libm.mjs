// spec: libm
// Своя libm ядра, ч.1 (этап 5.1): exp, exp2, log, log2, log10, pow — бит в бит как bionic-libm Android 14 x86_64,
// которую зовёт O (спека oracle/specs/libm.md, таблица oracle/libm-table).
// Алгоритмы — открытые библиотеки, не код игры:
//   exp exp2 log log2 pow — arm-optimized-routines (Copyright (c) 2018-2020, Arm Limited;
//     SPDX-License-Identifier: MIT OR Apache-2.0 WITH LLVM-exception), вариант без FMA, таблицы — core/num/libm-tables.mjs;
//   log10 — FreeBSD msun (Copyright (C) 1993 by Sun Microsystems, Inc. «Permission to use, copy, modify, and distribute
//     this software is freely granted, provided that this notice is preserved»).
// Все операции — сложение, умножение, деление double с округлением к ближайшему (как SSE2 без FMA) и работа с битами.
// NaN совпадает как класс: JS не хранит полезную нагрузку NaN.

import {
  EXP_INVLN2N, EXP_SHIFT, EXP_NEGLN2HIN, EXP_NEGLN2LON, EXP_POLY, EXP2_SHIFT, EXP2_POLY, EXP_TAB,
  LOG_LN2HI, LOG_LN2LO, LOG_POLY, LOG_POLY1, LOG_TAB, LOG_TAB2,
  LOG2_INVLN2HI, LOG2_INVLN2LO, LOG2_POLY, LOG2_POLY1, LOG2_TAB, LOG2_TAB2,
  POW_LN2HI, POW_LN2LO, POW_POLY, POW_TAB,
} from './libm-tables.mjs';

// ---- биты double: одна ячейка на 8 байт, слова hi/lo с учётом порядка байт платформы ----
const F = new Float64Array(1);
const W = new Uint32Array(F.buffer);
F[0] = 1;
const HI = W[1] === 0x3ff00000 ? 1 : 0;
const LO = 1 - HI;

function hiOf(x) { F[0] = x; return W[HI]; }
function fromWords(hi, lo) { W[HI] = hi; W[LO] = lo; return F[0]; }

// слова таблицы exp: T[2j] — поправка (double), T[2j+1] — биты масштаба (hi, lo)
const EXP_TAB_W = new Uint32Array(EXP_TAB.buffer);

const TWO52 = 4503599627370496; // 2^52
const P1009 = fromWords(0x7f000000, 0); // 2^1009
const PM1022 = fromWords(0x00100000, 0); // 2^-1022
const P27 = 134217728; // 2^27
const INF = Infinity;

// ---------------------------------------------------------------- exp / exp2 / экспонента pow

const InvLn2N = EXP_INVLN2N[0], Shift = EXP_SHIFT[0], NegLn2hiN = EXP_NEGLN2HIN[0], NegLn2loN = EXP_NEGLN2LON[0];
const C2 = EXP_POLY[0], C3 = EXP_POLY[1], C4 = EXP_POLY[2], C5 = EXP_POLY[3];
const Shift2 = EXP2_SHIFT[0];
const E1 = EXP2_POLY[0], E2 = EXP2_POLY[1], E3 = EXP2_POLY[2], E4 = EXP2_POLY[3], E5 = EXP2_POLY[4];

// Результат scale·(1 + tmp) у краёв диапазона: показатель масштаба мог выйти за пределы. kiLo — младшее слово k.
// hiShift — на сколько единиц показателя опускать масштаб при k > 0 (1009 для exp/pow, 1 для exp2), mulUp — 2^hiShift.
// signed: у pow масштаб может быть отрицательным (знак результата).
function specialcase(tmp, sHi, sLo, kiLo, hiShift, mulUp, signed) {
  if ((kiLo & 0x80000000) === 0) {
    const scale = fromWords((sHi - (hiShift << 20)) >>> 0, sLo);
    return mulUp * (scale + scale * tmp);
  }
  const hi2 = (sHi + (1022 << 20)) >>> 0;
  const scale = fromWords(hi2, sLo);
  let y = scale + scale * tmp;
  if (signed ? (y < 1.0 && y > -1.0) : y < 1.0) {
    const one = signed && y < 0.0 ? -1.0 : 1.0;
    let lo = scale - y + scale * tmp;
    const hi = one + y;
    lo = one - hi + y + lo;
    y = (hi + lo) - one;
    if (y === 0.0) y = signed && (hi2 & 0x80000000) ? -0 : 0;
  }
  return PM1022 * y;
}

/** e^x — бит в бит как exp bionic-libm O. */
export function exp(x) {
  F[0] = x;
  const xhi = W[HI];
  let abstop = (xhi >>> 20) & 0x7ff;
  let special = false;
  if (((abstop - 0x3c9) >>> 0) >= 0x408 - 0x3c9) {
    if (((abstop - 0x3c9) >>> 0) >= 0x80000000) return 1.0 + x; // |x| < 2^-54 (и 0)
    if (abstop >= 0x409) {
      if (x === -INF) return 0.0;
      if (abstop >= 0x7ff) return 1.0 + x;
      return xhi >>> 31 ? 0.0 : INF;
    }
    special = true;
  }
  const z = InvLn2N * x;
  let kd = z + Shift;
  F[0] = kd;
  const kiLo = W[LO];
  kd -= Shift;
  const r = x + kd * NegLn2hiN + kd * NegLn2loN;
  const j = (kiLo & 127) * 2;
  const tail = EXP_TAB[j];
  const sLo = EXP_TAB_W[2 * (j + 1) + LO];
  const sHi = (EXP_TAB_W[2 * (j + 1) + HI] + ((kiLo << 13) >>> 0)) >>> 0;
  const r2 = r * r;
  const tmp = tail + r + r2 * (C2 + r * C3) + r2 * r2 * (C4 + r * C5);
  if (special) return specialcase(tmp, sHi, sLo, kiLo, 1009, P1009, false);
  const scale = fromWords(sHi, sLo);
  return scale + scale * tmp;
}

/** 2^x — бит в бит как exp2 bionic-libm O. */
export function exp2(x) {
  F[0] = x;
  const xhi = W[HI], xlo = W[LO];
  const abstop = (xhi >>> 20) & 0x7ff;
  let special = false;
  if (((abstop - 0x3c9) >>> 0) >= 0x408 - 0x3c9) {
    if (((abstop - 0x3c9) >>> 0) >= 0x80000000) return 1.0 + x;
    if (abstop >= 0x409) {
      if (x === -INF) return 0.0;
      if (abstop >= 0x7ff) return 1.0 + x;
      if (!(xhi >>> 31)) return INF;
      if (x <= -1075.0) return 0.0;
    }
    // |x| > 928 по битам модуля
    const ahi = xhi & 0x7fffffff;
    if (ahi > 0x408d0000 || (ahi === 0x408d0000 && xlo !== 0)) special = true;
  }
  let kd = x + Shift2;
  F[0] = kd;
  const kiLo = W[LO];
  kd -= Shift2;
  const r = x - kd;
  const j = (kiLo & 127) * 2;
  const tail = EXP_TAB[j];
  const sLo = EXP_TAB_W[2 * (j + 1) + LO];
  const sHi = (EXP_TAB_W[2 * (j + 1) + HI] + ((kiLo << 13) >>> 0)) >>> 0;
  const r2 = r * r;
  const tmp = tail + r * E1 + r2 * (E2 + r * E3) + r2 * r2 * (E4 + r * E5);
  if (special) return specialcase(tmp, sHi, sLo, kiLo, 1, 2, false);
  const scale = fromWords(sHi, sLo);
  return scale + scale * tmp;
}

// ---------------------------------------------------------------- log

const Ln2hi = LOG_LN2HI[0], Ln2lo = LOG_LN2LO[0];
const A0 = LOG_POLY[0], A1 = LOG_POLY[1], A2 = LOG_POLY[2], A3 = LOG_POLY[3], A4 = LOG_POLY[4];
const B = LOG_POLY1;
const B0 = B[0], B1 = B[1], B2 = B[2], B3 = B[3], B4 = B[4], B5 = B[5], B6 = B[6], B7 = B[7], B8 = B[8], B9 = B[9], B10 = B[10];
const LOG_NEAR_LO = 0x3fee0000; // биты 1 − 2^-4 (младшее слово 0)
const LOG_NEAR_HI = 0x3ff10900; // биты 1 + 0x1.09p-4 (младшее слово 0)

/** Натуральный логарифм — бит в бит как log bionic-libm O. */
export function log(x) {
  F[0] = x;
  let ixhi = W[HI], ixlo = W[LO];
  if (ixhi >= LOG_NEAR_LO && ixhi < LOG_NEAR_HI) {
    if (ixhi === 0x3ff00000 && ixlo === 0) return 0;
    const r = x - 1.0;
    const r2 = r * r;
    const r3 = r * r2;
    let y = r3 * (B1 + r * B2 + r2 * B3 + r3 * (B4 + r * B5 + r2 * B6 + r3 * (B7 + r * B8 + r2 * B9 + r3 * B10)));
    let w = r * P27;
    const rhi = r + w - w;
    const rlo = r - rhi;
    w = rhi * rhi * B0;
    const hi = r + w;
    let lo = r - hi + w;
    lo += B0 * rlo * (rhi + r);
    y += lo;
    y += hi;
    return y;
  }
  const top = ixhi >>> 16;
  if (((top - 0x0010) >>> 0) >= 0x7ff0 - 0x0010) {
    if ((ixhi & 0x7fffffff) === 0 && ixlo === 0) return -INF;
    if (x === INF) return x;
    if ((top & 0x8000) || (top & 0x7ff0) === 0x7ff0) return NaN;
    F[0] = x * TWO52; // субнормальное: нормализуем
    ixhi = (W[HI] - (52 << 20)) >>> 0; ixlo = W[LO];
  }
  const tmpHi = (ixhi - 0x3fe60000) >>> 0;
  const i = (tmpHi >>> 13) & 127;
  const k = (tmpHi | 0) >> 20;
  const z = fromWords((ixhi - (tmpHi & 0xfff00000)) >>> 0, ixlo);
  const invc = LOG_TAB[2 * i], logc = LOG_TAB[2 * i + 1];
  const r = (z - LOG_TAB2[2 * i] - LOG_TAB2[2 * i + 1]) * invc;
  const kd = k;
  const w = kd * Ln2hi + logc;
  const hi = w + r;
  const lo = w - hi + r + kd * Ln2lo;
  const r2 = r * r;
  return lo + r2 * A0 + r * r2 * (A1 + r * A2 + r2 * (A3 + r * A4)) + hi;
}

// ---------------------------------------------------------------- log2

const InvLn2hi = LOG2_INVLN2HI[0], InvLn2lo = LOG2_INVLN2LO[0];
const L2A = LOG2_POLY, L2B = LOG2_POLY1;
const G0 = L2A[0], G1 = L2A[1], G2 = L2A[2], G3 = L2A[3], G4 = L2A[4], G5 = L2A[5];
const H0 = L2B[0], H1 = L2B[1], H2 = L2B[2], H3 = L2B[3], H4 = L2B[4], H5 = L2B[5], H6 = L2B[6], H7 = L2B[7], H8 = L2B[8], H9 = L2B[9];
const LOG2_NEAR_LO = hiOf(1.0 - 0x15b51 / 2097152); // 1 − 0x1.5b51p-5 (младшее слово 0)
const LOG2_NEAR_HI = hiOf(1.0 + 0x16ab2 / 2097152); // 1 + 0x1.6ab2p-5 (младшее слово 0)

/** Логарифм по основанию 2 — бит в бит как log2 bionic-libm O. */
export function log2(x) {
  F[0] = x;
  let ixhi = W[HI], ixlo = W[LO];
  if (ixhi >= LOG2_NEAR_LO && ixhi < LOG2_NEAR_HI) {
    if (ixhi === 0x3ff00000 && ixlo === 0) return 0;
    const r = x - 1.0;
    F[0] = r;
    const rhi = fromWords(W[HI], 0);
    const rlo = r - rhi;
    const hi = rhi * InvLn2hi;
    let lo = rlo * InvLn2hi + r * InvLn2lo;
    const r2 = r * r;
    const r4 = r2 * r2;
    const p = r2 * (H0 + r * H1);
    let y = hi + p;
    lo += hi - y + p;
    lo += r4 * (H2 + r * H3 + r2 * (H4 + r * H5) + r4 * (H6 + r * H7 + r2 * (H8 + r * H9)));
    y += lo;
    return y;
  }
  const top = ixhi >>> 16;
  if (((top - 0x0010) >>> 0) >= 0x7ff0 - 0x0010) {
    if ((ixhi & 0x7fffffff) === 0 && ixlo === 0) return -INF;
    if (x === INF) return x;
    if ((top & 0x8000) || (top & 0x7ff0) === 0x7ff0) return NaN;
    F[0] = x * TWO52;
    ixhi = (W[HI] - (52 << 20)) >>> 0; ixlo = W[LO];
  }
  const tmpHi = (ixhi - 0x3fe60000) >>> 0;
  const i = (tmpHi >>> 14) & 63;
  const k = (tmpHi | 0) >> 20;
  const z = fromWords((ixhi - (tmpHi & 0xfff00000)) >>> 0, ixlo);
  const invc = LOG2_TAB[2 * i], logc = LOG2_TAB[2 * i + 1];
  const kd = k;
  const r = (z - LOG2_TAB2[2 * i] - LOG2_TAB2[2 * i + 1]) * invc;
  F[0] = r;
  const rhi = fromWords(W[HI], 0);
  const rlo = r - rhi;
  const t1 = rhi * InvLn2hi;
  const t2 = rlo * InvLn2hi + r * InvLn2lo;
  const t3 = kd + logc;
  const hi = t3 + t1;
  const lo = t3 - hi + t1 + t2;
  const r2 = r * r;
  const r4 = r2 * r2;
  const p = G0 + r * G1 + r2 * (G2 + r * G3) + r4 * (G4 + r * G5);
  return lo + r2 * p + hi;
}

// ---------------------------------------------------------------- log10 (msun)

const two54 = fromWords(0x43500000, 0);
const ivln10hi = fromWords(0x3fdbcb7b, 0x15200000);
const ivln10lo = fromWords(0x3dbb9438, 0xca9aadd5);
const log10_2hi = fromWords(0x3fd34413, 0x509f6000);
const log10_2lo = fromWords(0x3d59fef3, 0x11f12b36);
const Lg1 = fromWords(0x3fe55555, 0x55555593);
const Lg2 = fromWords(0x3fd99999, 0x9997fa04);
const Lg3 = fromWords(0x3fd24924, 0x94229359);
const Lg4 = fromWords(0x3fcc71c5, 0x1d8e78af);
const Lg5 = fromWords(0x3fc74664, 0x96cb03de);
const Lg6 = fromWords(0x3fc39a09, 0xd078c69f);
const Lg7 = fromWords(0x3fc2f112, 0xdf3e5244);

/** Логарифм по основанию 10 — бит в бит как log10 bionic-libm O (msun). */
export function log10(x) {
  F[0] = x;
  let hx = W[HI] | 0;
  const lx = W[LO];
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -INF;
    if (hx < 0) return NaN;
    k -= 54; x *= two54;
    F[0] = x; hx = W[HI] | 0;
  }
  if (hx >= 0x7ff00000) return x + x;
  if (hx === 0x3ff00000 && lx === 0) return 0;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  const i = (hx + 0x95f64) & 0x100000;
  F[0] = x; W[HI] = (hx | (i ^ 0x3ff00000)) >>> 0; x = F[0];
  k += i >> 20;
  const y = k;
  const f = x - 1.0;
  const hfsq = 0.5 * f * f;
  // k_log1p(f)
  const s = f / (2.0 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (Lg2 + w * (Lg4 + w * Lg6));
  const t2 = z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)));
  const R = t2 + t1;
  const r = s * (0.5 * f * f + R);
  F[0] = f - hfsq; W[LO] = 0;
  const hi = F[0];
  const lo = (f - hi) - hfsq + r;
  let valHi = hi * ivln10hi;
  const y2 = y * log10_2hi;
  let valLo = y * log10_2lo + (lo + hi) * ivln10lo + lo * ivln10hi;
  const ww = y2 + valHi;
  valLo += (y2 - ww) + valHi;
  valHi = ww;
  return valLo + valHi;
}

// ---------------------------------------------------------------- pow

const PLn2hi = POW_LN2HI[0], PLn2lo = POW_LN2LO[0];
const PA0 = POW_POLY[0], PA1 = POW_POLY[1], PA2 = POW_POLY[2], PA3 = POW_POLY[3], PA4 = POW_POLY[4], PA5 = POW_POLY[5], PA6 = POW_POLY[6];
const SIGN_BIAS = 0x800 << 7;
let logTail = 0;

// log(x) с хвостом ≈15 доп. бит; x задан битами (ixhi, ixlo), субнормальные нормализованы через знаковый бит показателя.
function logInline(ixhi, ixlo) {
  const tmpHi = (ixhi - 0x3fe69555) >>> 0;
  const i = (tmpHi >>> 13) & 127;
  const k = (tmpHi | 0) >> 20;
  const izHi = (ixhi - (tmpHi & 0xfff00000)) >>> 0;
  const z = fromWords(izHi, ixlo);
  const kd = k;
  const invc = POW_TAB[4 * i], logc = POW_TAB[4 * i + 2], logctail = POW_TAB[4 * i + 3];
  const zhi = fromWords((izHi + (ixlo >= 0x80000000 ? 1 : 0)) >>> 0, 0);
  const zlo = z - zhi;
  const rhi = zhi * invc - 1.0;
  const rlo = zlo * invc;
  const r = rhi + rlo;
  const t1 = kd * PLn2hi + logc;
  const t2 = t1 + r;
  const lo1 = kd * PLn2lo + logctail;
  const lo2 = t1 - t2 + r;
  const ar = PA0 * r;
  const ar2 = r * ar;
  const ar3 = r * ar2;
  const arhi = PA0 * rhi;
  const arhi2 = rhi * arhi;
  const hi = t2 + arhi2;
  const lo3 = rlo * (ar + arhi);
  const lo4 = t2 - hi + arhi2;
  const p = ar3 * (PA1 + r * PA2 + ar2 * (PA3 + r * PA4 + ar2 * (PA5 + r * PA6)));
  const lo = lo1 + lo2 + lo3 + lo4 + p;
  const y = hi + lo;
  logTail = hi - y + lo;
  return y;
}

// sign·exp(x + xtail); signBias — 0 или SIGN_BIAS (знак минус)
function expInline(x, xtail, signBias) {
  F[0] = x;
  const xhi = W[HI];
  const abstop = (xhi >>> 20) & 0x7ff;
  let special = false;
  if (((abstop - 0x3c9) >>> 0) >= 0x408 - 0x3c9) {
    if (((abstop - 0x3c9) >>> 0) >= 0x80000000) {
      const one = 1.0 + x;
      return signBias ? -one : one;
    }
    if (abstop >= 0x409) {
      if (xhi >>> 31) return signBias ? -0 : 0;
      return signBias ? -INF : INF;
    }
    special = true;
  }
  const z = InvLn2N * x;
  let kd = z + Shift;
  F[0] = kd;
  const kiLo = W[LO];
  kd -= Shift;
  let r = x + kd * NegLn2hiN + kd * NegLn2loN;
  r += xtail;
  const j = (kiLo & 127) * 2;
  const tail = EXP_TAB[j];
  const sLo = EXP_TAB_W[2 * (j + 1) + LO];
  const sHi = (EXP_TAB_W[2 * (j + 1) + HI] + (((kiLo + signBias) << 13) >>> 0)) >>> 0;
  const r2 = r * r;
  const tmp = tail + r + r2 * (C2 + r * C3) + r2 * r2 * (C4 + r * C5);
  if (special) return specialcase(tmp, sHi, sLo, kiLo, 1009, P1009, true);
  const scale = fromWords(sHi, sLo);
  return scale + scale * tmp;
}

// 0 — не целое, 1 — нечётное целое, 2 — чётное целое (y конечное, не 0)
function checkint(hi, lo) {
  const e = (hi >>> 20) & 0x7ff;
  if (e < 0x3ff) return 0;
  if (e > 0x3ff + 52) return 2;
  const m = 0x3ff + 52 - e; // 0..52: позиция бита единицы
  if (m >= 32) {
    if (lo !== 0) return 0;
    const s = m - 32;
    if (s > 0 && (hi & ((1 << s) - 1)) !== 0) return 0;
    return (hi >>> s) & 1 ? 1 : 2;
  }
  if (m > 0 && ((lo << (32 - m)) >>> 0) !== 0) return 0;
  return (lo >>> m) & 1 ? 1 : 2;
}

// 0, ±∞ или NaN
function zeroInfNan(hi, lo) {
  const a = hi & 0x7fffffff;
  return (a === 0 && lo === 0) || a >= 0x7ff00000;
}

function isSignalingNaN(hi, lo) {
  return (hi & 0x7ff80000) === 0x7ff00000 && ((hi & 0x7ffff) !== 0 || lo !== 0);
}

/** x^y — бит в бит как pow bionic-libm O. */
export function pow(x, y) {
  let signBias = 0;
  F[0] = x;
  let ixhi = W[HI], ixlo = W[LO];
  F[0] = y;
  const iyhi = W[HI], iylo = W[LO];
  let topx = ixhi >>> 20;
  const topy = iyhi >>> 20;
  if (((topx - 0x001) >>> 0) >= 0x7ff - 0x001 || (((topy & 0x7ff) - 0x3be) >>> 0) >= 0x43e - 0x3be) {
    if (zeroInfNan(iyhi, iylo)) {
      if ((iyhi & 0x7fffffff) === 0 && iylo === 0) return isSignalingNaN(ixhi, ixlo) ? x + y : 1.0;
      if (ixhi === 0x3ff00000 && ixlo === 0) return isSignalingNaN(iyhi, iylo) ? x + y : 1.0;
      if (x !== x || y !== y) return x + y;
      if ((ixhi & 0x7fffffff) === 0x3ff00000 && ixlo === 0) return 1.0;
      const axLess1 = (ixhi & 0x7fffffff) < 0x3ff00000;
      if (axLess1 === !(iyhi >>> 31)) return 0.0;
      return y * y;
    }
    if (zeroInfNan(ixhi, ixlo)) {
      let x2 = x * x;
      if (ixhi >>> 31 && checkint(iyhi, iylo) === 1) x2 = -x2;
      return iyhi >>> 31 ? 1 / x2 : x2;
    }
    // x и y конечные, не 0
    if (ixhi >>> 31) {
      const yint = checkint(iyhi, iylo);
      if (yint === 0) return NaN;
      if (yint === 1) signBias = SIGN_BIAS;
      ixhi &= 0x7fffffff;
      topx &= 0x7ff;
    }
    if ((((topy & 0x7ff) - 0x3be) >>> 0) >= 0x43e - 0x3be) {
      if (ixhi === 0x3ff00000 && ixlo === 0) return 1.0;
      const gt1 = ixhi > 0x3ff00000 || (ixhi === 0x3ff00000 && ixlo !== 0);
      if ((topy & 0x7ff) < 0x3be) return gt1 ? 1.0 + y : 1.0 - y;
      return gt1 === (topy < 0x800) ? INF : 0.0;
    }
    if (topx === 0) {
      F[0] = x * TWO52;
      ixhi = ((W[HI] & 0x7fffffff) - (52 << 20)) >>> 0;
      ixlo = W[LO];
    }
  }
  const hi = logInline(ixhi, ixlo);
  const lo = logTail;
  const yhi = fromWords(iyhi, iylo & 0xf8000000);
  const ylo = y - yhi;
  F[0] = hi;
  const lhi = fromWords(W[HI], W[LO] & 0xf8000000);
  const llo = hi - lhi + lo;
  const ehi = yhi * lhi;
  const elo = ylo * lhi + y * llo;
  return expInline(ehi, elo, signBias);
}
