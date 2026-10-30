// Модель skin: ассеты по нашим ключам (sprite.*, font.*) для ui/.
//
// На вход — уже прочитанные JSON пакета skin (у skin-local: sprites.json, tpag.json, fonts.json, nineslice.json и
// размеры атласов из manifest.json). Файлы читает тот, кто запускает игру (страница или тест): слой skin/ не ходит в ФС.
// Код ui/ видит только ключи и геометрию: где кадр лежит в атласе, origin, отступы nine-slice, метрики глифов.

const NINE_MODES = ['stretch', 'repeat', 'mirror', 'blank_repeat', 'hide'];

/**
 * @param {object} docs
 * @param {object} docs.sprites   { sprites: { key: { width, height, origin:[x,y], frames:[{tpag}] } } }
 * @param {object} docs.tpag      { tpag: [{ src:[x,y,w,h], dst:[x,y,w,h], bound:[w,h], atlas }] }
 * @param {object} docs.fonts     { fonts: { key: { line_height, glyphs:[[char,x,y,w,h,advance,offset]], page:{ atlas, src } } } }
 * @param {object} [docs.nineslice] { sprites: { key: { left, top, right, bottom, enabled, modes[5] } } }
 * @param {object} docs.atlases   { <номер атласа>: [w, h] }
 */
export function makeSkin(docs) {
  const pages = docs.tpag.tpag;
  const nine = docs.nineslice?.sprites || {};
  const spriteCache = new Map();
  const fontCache = new Map();
  const atlasSize = (i) => {
    const s = docs.atlases[i];
    if (!s) throw new Error(`skin: нет размера атласа ${i}`);
    return s;
  };

  function sprite(key) {
    if (spriteCache.has(key)) return spriteCache.get(key);
    const s = docs.sprites.sprites[key];
    if (!s) throw new Error(`skin: нет спрайта ${key}`);
    const frames = s.frames.map((f) => {
      const p = pages[f.tpag];
      return { atlas: p.atlas, src: p.src, dst: p.dst, atlasSize: atlasSize(p.atlas) };
    });
    const n = nine[key];
    const out = {
      key, width: s.width, height: s.height, origin: s.origin, frames,
      nine: n && n.enabled ? { left: n.left, top: n.top, right: n.right, bottom: n.bottom,
        modes: n.modes.map((m) => { if (!NINE_MODES.includes(m)) throw new Error(`skin: режим ${m}`); return m; }) } : null,
    };
    spriteCache.set(key, out);
    return out;
  }

  function font(key) {
    if (fontCache.has(key)) return fontCache.get(key);
    const f = docs.fonts.fonts[key];
    if (!f) throw new Error(`skin: нет шрифта ${key}`);
    const glyphs = new Map();
    for (const [ch, x, y, w, h, advance, offset] of f.glyphs) glyphs.set(ch, { x, y, w, h, advance, offset });
    const out = { key, lineHeight: f.line_height, glyphs, atlas: f.page.atlas, pageX: f.page.src[0], pageY: f.page.src[1],
      atlasSize: atlasSize(f.page.atlas) };
    fontCache.set(key, out);
    return out;
  }

  return { sprite, font, atlasSize };
}
