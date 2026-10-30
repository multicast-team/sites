// Пакет skin: выбор пакета ассетов и проверка по контракту skin/keys.json.
//
// Пакеты с одинаковыми нашими ключами (sprite.* / font.* / sound.*):
//   gray  — skin-gray/: серые плашки, своя упаковка, в git; игра должна работать на нём без ошибок;
//   local — skin-local/: атласы 2.2.50 (экспорт 1.30–1.31), только локально, вне git.
// Слой skin/ в ФС не ходит: вызывающий (страница, тест) передаёт read(путь от корня проекта) → JSON.
// Пиксели атласов: gray — рисует skin-gray/gray.mjs; local — PNG-файлы атласов, их декодирует вызывающий
// (свой декодер или WebGL texImage2D, не Canvas2D — см. 3.10).
import { makeSkin } from './model.mjs';
import { grayDocs, grayAtlas } from '../skin-gray/gray.mjs';

export const PACKS = ['gray', 'local'];

/** Проверка пакета по контракту: каждый ключ есть, вид совпадает, у спрайта то же число кадров. → список ошибок. */
export function checkContract(contract, docs) {
  const bad = [];
  for (const [key, c] of Object.entries(contract.keys)) {
    if (c.kind === 'sprite') {
      const s = docs.sprites.sprites[key];
      if (!s) bad.push(`нет спрайта ${key}`);
      else if (s.frames.length !== c.frames) bad.push(`${key}: кадров ${s.frames.length}, нужно ${c.frames}`);
    } else if (c.kind === 'font') {
      if (!docs.fonts.fonts[key]) bad.push(`нет шрифта ${key}`);
    } else if (c.kind === 'sound') {
      if (!docs.sounds[key]) bad.push(`нет звука ${key}`);
    } else bad.push(`${key}: неизвестный вид ${c.kind}`);
  }
  return bad;
}

async function localDocs(read) {
  const dir = 'skin-local/';
  const [sprites, tpag, fonts, nineslice, manifest, audio] = await Promise.all(
    ['sprites.json', 'tpag.json', 'fonts.json', 'nineslice.json', 'manifest.json', 'audio.json'].map((f) => read(dir + f)));
  const atlases = {}, files = {};
  for (const [f, v] of Object.entries(manifest.atlases)) {
    const m = /texture_(\d+)\.png$/.exec(f);
    if (!m) throw new Error(`skin local: атлас ${f}`);
    atlases[+m[1]] = [v.width, v.height];
    files[+m[1]] = dir + f;
  }
  const sounds = {};
  for (const [k, s] of Object.entries(audio.sounds)) sounds[k] = { length_s: s.length_s, volume: s.volume, pitch: s.pitch, file: dir + s.file };
  return { docs: { sprites, tpag, fonts, nineslice, atlases, sounds }, files };
}

/**
 * Открыть пакет.
 * @param {'gray'|'local'} name
 * @param {(path: string) => Promise<object>|object} read   JSON по пути от корня проекта (skin/keys.json, skin-gray/keys.json, …)
 * @returns {{ name, skin, sounds, atlasCount, atlasSize(i), atlasPixels(i)|null, atlasFile(i)|null }}
 */
export async function openSkin(name, read) {
  if (!PACKS.includes(name)) throw new Error(`skin: нет пакета ${name}`);
  const contract = await read('skin/keys.json');
  let docs, atlasPixels = null, atlasFile = null;
  if (name === 'gray') {
    const pack = await read('skin-gray/keys.json');
    docs = grayDocs(pack);
    const cache = new Map();
    atlasPixels = (i) => { if (!cache.has(i)) cache.set(i, grayAtlas(pack, i)); return cache.get(i); };
  } else {
    const l = await localDocs(read);
    docs = l.docs;
    atlasFile = (i) => { if (!l.files[i]) throw new Error(`skin local: нет атласа ${i}`); return l.files[i]; };
  }
  const bad = checkContract(contract, docs);
  if (bad.length) throw new Error(`skin ${name}: пакет не покрывает контракт (${bad.length}): ${bad.slice(0, 5).join('; ')}`);
  const skin = makeSkin(docs);
  return {
    name, skin, sounds: docs.sounds, keys: contract.keys,
    atlasCount: Object.keys(docs.atlases).length, atlasSize: skin.atlasSize, atlasPixels, atlasFile,
  };
}
