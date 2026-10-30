// Страница игры (этап 6.33): декодер PNG атласов пакета skin-local в RGBA без Canvas2D (решение 3.10: Canvas2D
// домножает на альфу и теряет байты). 8 бит на канал, без чересстрочности; виды цвета 0, 2, 4, 6.
import { inflate } from './flate.mjs';

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

export function decodePng(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0) !== 0x89504e47) throw new Error('png: подпись');
  let p = 8, w = 0, h = 0, ct = 0;
  const parts = [];
  while (p < u8.length) {
    const len = dv.getUint32(p), type = String.fromCharCode(...u8.subarray(p + 4, p + 8));
    const body = u8.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); ct = body[9];
      if (body[8] !== 8 || body[12] !== 0 || !(ct in CHANNELS)) throw new Error(`png: глубина ${body[8]}, вид ${ct}, чересстрочность ${body[12]}`);
    } else if (type === 'IDAT') parts.push(body);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const z = new Uint8Array(parts.reduce((a, b) => a + b.length, 0));
  let o = 0;
  for (const b of parts) { z.set(b, o); o += b.length; }
  const raw = inflate(z);
  const c = CHANNELS[ct], stride = w * c;
  const cur = new Uint8Array(stride), prev = new Uint8Array(stride);
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0, q = 0; y < h; y++) {
    const f = raw[q++];
    for (let i = 0; i < stride; i++, q++) {
      const x = raw[q], a = i >= c ? cur[i - c] : 0, b = prev[i], d = i >= c ? prev[i - c] : 0;
      let v;
      if (f === 0) v = x;
      else if (f === 1) v = x + a;
      else if (f === 2) v = x + b;
      else if (f === 3) v = x + ((a + b) >> 1);
      else {
        const pp = a + b - d, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - d);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : d);
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const s = x * c, t = (y * w + x) * 4;
      if (c === 4) { rgba[t] = cur[s]; rgba[t + 1] = cur[s + 1]; rgba[t + 2] = cur[s + 2]; rgba[t + 3] = cur[s + 3]; }
      else if (c === 3) { rgba[t] = cur[s]; rgba[t + 1] = cur[s + 1]; rgba[t + 2] = cur[s + 2]; rgba[t + 3] = 255; }
      else if (c === 2) { rgba[t] = rgba[t + 1] = rgba[t + 2] = cur[s]; rgba[t + 3] = cur[s + 1]; }
      else { rgba[t] = rgba[t + 1] = rgba[t + 2] = cur[s]; rgba[t + 3] = 255; }
    }
    prev.set(cur);
  }
  return { w, h, rgba };
}
