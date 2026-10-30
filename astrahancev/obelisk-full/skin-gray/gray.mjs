// Серый пакет skin: геометрия по нашим ключам (skin-gray/keys.json) → документы для skin/model.mjs и пиксели атласов.
// Пикселей оригинала здесь нет: каждая плашка — серый прямоугольник с тёмной рамкой 1 px, глифы — светлые плашки
// (пробел прозрачный). Пакет нужен, чтобы проверять: игра работает без ассетов оригинала, от них зависит только картинка.
// Модуль ничего не импортирует и в ФС не ходит: JSON пакета передаёт вызывающий.

const BODY = [0x9a, 0x9a, 0x9a], EDGE = [0x5a, 0x5a, 0x5a], GLYPH = [0xd8, 0xd8, 0xd8];

/** keys.json серого пакета → { sprites, tpag, fonts, nineslice, atlases } в формате skin/model.mjs (makeSkin). */
export function grayDocs(pack) {
  const tpag = [], sprites = {}, fonts = {}, nine = {}, sounds = {};
  const plates = pack.plates;
  for (const [key, e] of Object.entries(pack.keys)) {
    if (e.kind === 'sprite') {
      const frames = e.f.map(([p, dx, dy]) => {
        const [atlas, x, y, w, h] = plates[p];
        tpag.push({ src: [x, y, w, h], dst: [dx, dy, w, h], bound: [e.w, e.h], atlas });
        return { tpag: tpag.length - 1 };
      });
      sprites[key] = { width: e.w, height: e.h, origin: e.o, bbox: e.b, frames };
      if (e.n) nine[key] = { left: e.n[0], top: e.n[1], right: e.n[2], bottom: e.n[3], enabled: 1, modes: e.n.slice(4) };
    } else if (e.kind === 'font') {
      const [atlas, x, y] = plates[e.page];
      fonts[key] = { line_height: e.lh, glyphs: e.g, page: { atlas, src: [x, y] } };
    } else if (e.kind === 'sound') {
      sounds[key] = { length_s: e.len, volume: e.vol, pitch: e.pitch, samples: null }; // тишина нужной длины
    } else throw new Error(`skin-gray: вид ${e.kind} у ${key}`);
  }
  const atlases = Object.fromEntries(pack.atlases.map((s, i) => [i, s]));
  return { sprites: { sprites }, tpag: { tpag }, fonts: { fonts }, nineslice: { sprites: nine }, sounds, atlases };
}

/** Пиксели серого атласа i: { w, h, rgba } (RGBA8, верхняя строка первой, не премультиплицировано). */
export function grayAtlas(pack, i) {
  const [w, h] = pack.atlases[i];
  if (!w) throw new Error(`skin-gray: нет атласа ${i}`);
  const rgba = new Uint8Array(w * h * 4);
  const put = (x, y, c) => { const o = (y * w + x) * 4; rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255; };
  const box = (x0, y0, bw, bh, body, edge) => {
    for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) {
      const border = x === x0 || y === y0 || x === x0 + bw - 1 || y === y0 + bh - 1;
      put(x, y, border && edge ? edge : body);
    }
  };
  const glyphsOf = new Map();
  for (const e of Object.values(pack.keys)) if (e.kind === 'font') glyphsOf.set(e.page, e.g);
  pack.plates.forEach(([a, x, y, pw, ph, kind], p) => {
    if (a !== i) return;
    if (kind === 'sprite') return box(x, y, pw, ph, BODY, EDGE);
    for (const [c, gx, gy, gw, gh] of glyphsOf.get(p) || []) if (c !== 32 && gw > 0 && gh > 0) box(x + gx, y + gy, gw, gh, GLYPH, null);
  });
  return { w, h, rgba };
}
