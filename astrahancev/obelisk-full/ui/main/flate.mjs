// Страница игры (этап 6.33): синхронные zlib-обёртки (RFC 1950) и inflate (RFC 1951) для сейва и PNG-атласов.
// Нужны синхронно: кодер INI ядра (core/saveini.mjs) зовёт deflate/inflate списков внутри разбора, а в браузере
// CompressionStream только асинхронный. Сжатие — «хранимые» блоки (без сжатия): игра читает любой корректный zlib.

const ADLER_MOD = 65521;

function adler32(u8) {
  let a = 1, b = 0;
  for (let i = 0; i < u8.length;) {
    const end = Math.min(u8.length, i + 3800);
    for (; i < end; i++) { a += u8[i]; b += a; }
    a %= ADLER_MOD; b %= ADLER_MOD;
  }
  return ((b << 16) | a) >>> 0;
}

/** zlib с хранимыми блоками (без сжатия). */
export function deflateStored(u8) {
  const blocks = Math.max(1, Math.ceil(u8.length / 65535));
  const out = new Uint8Array(2 + u8.length + blocks * 5 + 4);
  out[0] = 0x78; out[1] = 0x01;
  let o = 2;
  for (let k = 0; k < blocks; k++) {
    const from = k * 65535, len = Math.min(65535, u8.length - from);
    out[o++] = k === blocks - 1 ? 1 : 0;
    out[o++] = len & 255; out[o++] = len >>> 8;
    out[o++] = ~len & 255; out[o++] = (~len >>> 8) & 255;
    out.set(u8.subarray(from, from + len), o); o += len;
  }
  const s = adler32(u8);
  out[o++] = s >>> 24; out[o++] = (s >>> 16) & 255; out[o++] = (s >>> 8) & 255; out[o++] = s & 255;
  return out;
}

// ---------- inflate ----------
const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/** Канонический код Хаффмана по длинам: { count[len], symbols[] }. */
function huffman(lengths) {
  const count = new Uint16Array(16);
  for (const l of lengths) count[l]++;
  count[0] = 0;
  const offs = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + count[i - 1];
  const symbols = new Uint16Array(lengths.length);
  lengths.forEach((l, s) => { if (l) symbols[offs[l]++] = s; });
  return { count, symbols };
}

let FIXED = null;
function fixedTables() {
  if (!FIXED) {
    const l = new Array(288);
    for (let i = 0; i < 288; i++) l[i] = i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8;
    FIXED = { lit: huffman(l), dist: huffman(new Array(30).fill(5)) };
  }
  return FIXED;
}

/** raw — true: поток deflate без обёртки zlib. */
export function inflate(src, { raw = false } = {}) {
  let pos = raw ? 0 : 2, bitBuf = 0, bitCnt = 0;
  let out = new Uint8Array(Math.max(1024, src.length * 4)), n = 0;
  const need = (k) => {
    if (n + k <= out.length) return;
    let m = out.length * 2;
    while (m < n + k) m *= 2;
    const o2 = new Uint8Array(m); o2.set(out.subarray(0, n)); out = o2;
  };
  const bits = (k) => {
    while (bitCnt < k) {
      if (pos >= src.length) throw new Error('inflate: конец данных');
      bitBuf |= src[pos++] << bitCnt; bitCnt += 8;
    }
    const v = bitBuf & ((1 << k) - 1);
    bitBuf >>>= k; bitCnt -= k;
    return v;
  };
  const decode = (h) => {
    let code = 0, first = 0, index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const c = h.count[len];
      if (code - c < first) return h.symbols[index + (code - first)];
      index += c; first += c; first <<= 1; code <<= 1;
    }
    throw new Error('inflate: плохой код');
  };
  for (let last = 0; !last;) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      bitBuf = 0; bitCnt = 0;
      const len = src[pos] | (src[pos + 1] << 8);
      pos += 4;
      need(len); out.set(src.subarray(pos, pos + len), n); n += len; pos += len;
      continue;
    }
    let lit, dist;
    if (type === 1) ({ lit, dist } = fixedTables());
    else if (type === 2) {
      const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
      const cl = new Array(19).fill(0);
      for (let i = 0; i < hclen; i++) cl[CL_ORDER[i]] = bits(3);
      const clh = huffman(cl);
      const lens = [];
      while (lens.length < hlit + hdist) {
        const s = decode(clh);
        if (s < 16) lens.push(s);
        else if (s === 16) { const p = lens[lens.length - 1]; for (let r = 3 + bits(2); r > 0; r--) lens.push(p); }
        else if (s === 17) for (let r = 3 + bits(3); r > 0; r--) lens.push(0);
        else for (let r = 11 + bits(7); r > 0; r--) lens.push(0);
      }
      lit = huffman(lens.slice(0, hlit)); dist = huffman(lens.slice(hlit));
    } else throw new Error('inflate: тип блока 3');
    for (;;) {
      const s = decode(lit);
      if (s < 256) { need(1); out[n++] = s; continue; }
      if (s === 256) break;
      const li = s - 257;
      const len = LEN_BASE[li] + bits(LEN_EXTRA[li]);
      const di = decode(dist);
      const d = DIST_BASE[di] + bits(DIST_EXTRA[di]);
      need(len);
      for (let k = 0; k < len; k++, n++) out[n] = out[n - d];
    }
  }
  return out.slice(0, n);
}
