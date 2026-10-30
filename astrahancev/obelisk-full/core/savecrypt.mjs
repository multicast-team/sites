// spec: savecrypt
// Шифр текста сейва: RC4 с расписанием ключа «байт номер max(1, i mod L)» + base64 (spec oracle/specs/savecrypt.md, правила 1–10).
// Без DOM и импортов: base64 и UTF-8 своим кодом / TextEncoder, TextDecoder.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const DECODE = new Int16Array(128).fill(-1);
for (let i = 0; i < 64; i++) DECODE[ALPHABET.charCodeAt(i)] = i;
const ALPHA_CODES = new Uint8Array(64);
for (let i = 0; i < 64; i++) ALPHA_CODES[i] = ALPHABET.charCodeAt(i);

// правила 3–5: байты ключа; не строка — один нулевой байт; пустая строка — ошибка
function keyBytes(key) {
  if (typeof key !== 'string') return new Uint8Array(1);
  if (key.length === 0) throw new Error('unable to mod by 0');
  return new TextEncoder().encode(key);
}

// правило 2: поток RC4 с первого байта; правило 3: на шаге i берётся байт номер max(1, i mod L) (с 1)
function applyStream(data, key) {
  const k = keyBytes(key);
  const L = k.length;
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i++) s[i] = i;
  for (let i = 0, j = 0; i < 256; i++) {
    const n = Math.max(1, i % L);
    j = (j + s[i] + k[n - 1]) & 255;
    const t = s[i]; s[i] = s[j]; s[j] = t;
  }
  const out = new Uint8Array(data.length);
  for (let n = 0, i = 0, j = 0; n < data.length; n++) {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    const t = s[i]; s[i] = s[j]; s[j] = t;
    out[n] = data[n] ^ s[(s[i] + s[j]) & 255];
  }
  return out;
}

function toBase64(bytes) {
  const n = bytes.length;
  const out = new Uint8Array(4 * Math.ceil(n / 3));
  let o = 0;
  for (let p = 0; p < n; p += 3) {
    const b0 = bytes[p];
    const b1 = p + 1 < n ? bytes[p + 1] : 0;
    const b2 = p + 2 < n ? bytes[p + 2] : 0;
    out[o++] = ALPHA_CODES[b0 >> 2];
    out[o++] = ALPHA_CODES[((b0 & 3) << 4) | (b1 >> 4)];
    out[o++] = p + 1 < n ? ALPHA_CODES[((b1 & 15) << 2) | (b2 >> 6)] : 61;
    out[o++] = p + 2 < n ? ALPHA_CODES[b2 & 63] : 61;
  }
  return new TextDecoder('latin1').decode(out);
}

// правила 7, 9, 10: канонический вид; иначе и при пустом результате — исключение
function fromBase64(b64) {
  if (typeof b64 !== 'string') throw new Error('base64: not a string');
  let end = b64.length;
  while (end > 0 && b64.charCodeAt(end - 1) === 61 && b64.length - end < 3) end--;
  if (b64.length - end > 2) throw new Error('base64: bad padding');
  const full = end >> 2;
  const rem = end & 3;
  const nb = full * 3 + (rem === 3 ? 2 : rem === 2 ? 1 : 0);
  if (nb === 0) throw new Error('buffer_get_size argument 1 invalid reference to (buffer) - requested -1');
  const v = new Uint8Array(end);
  for (let i = 0; i < end; i++) {
    const c = b64.charCodeAt(i);
    const d = c < 128 ? DECODE[c] : -1;
    if (d < 0) throw new Error('base64: non-canonical input');
    v[i] = d;
  }
  const out = new Uint8Array(nb);
  let o = 0;
  let p = 0;
  for (let g = 0; g < full; g++, p += 4) {
    out[o++] = (v[p] << 2) | (v[p + 1] >> 4);
    out[o++] = ((v[p + 1] & 15) << 4) | (v[p + 2] >> 2);
    out[o++] = ((v[p + 2] & 3) << 6) | v[p + 3];
  }
  if (rem >= 2) out[o++] = (v[p] << 2) | (v[p + 1] >> 4);
  if (rem === 3) out[o++] = ((v[p + 1] & 15) << 4) | (v[p + 2] >> 2);
  return out;
}

export function encryptSaveText(text, key) {
  return toBase64(applyStream(new TextEncoder().encode(text), key));
}

// правило 8: байты до первого нулевого
export function decryptSaveBytes(b64, key) {
  const plain = applyStream(fromBase64(b64), key);
  const z = plain.indexOf(0);
  return z < 0 ? plain : plain.subarray(0, z);
}

export function decryptSaveText(b64, key) {
  return new TextDecoder().decode(decryptSaveBytes(b64, key));
}
