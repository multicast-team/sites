// Экран Sell (руда, этап 6.12): вёрстка data/ui/ore.json из компонентов кита + привязки к данным руды
// (data/systems/mining.json: базовая цена продажи руды; data/systems/crafting.json: имена и мир
// материалов) и к состоянию игрока.
//
// Экран не рисует записи O: он раскладывает шаблон ряда по шагу списка, подставляет поля с id привязки (кадр значка = номер
// руды, тексты чисел, оттенок «нельзя продать», кадр замка) и рисует листья рисовальщиком таблиц кита (ui/kit/table.mjs).
// Панель и ползунок — по стилям кита (data/ui/kit.json).
//
// Состояние: { world, floors (открыто этажей — длина ползунка), highestOre (номер старшей руды, найденной в этом престиже — поле сейва; ряды — руды мира до неё), ore[], locked[] (замки продажи строк, 0/1 — хранятся в сейве),
//   sellMulti (множитель цены продажи руды — клетка сводки) }.
// Вид: { top — сдвиг меню вниз (панель заданий NPE), scroll — прокрутка списка вверх, px (≥ 0), mode — режим продажи
//   (номер строки таблицы modes: Sell All, 10 %, 25 %, 50 %) }.
import { drawLeaf } from '../kit/table.mjs';
import { makeShortFormat } from '../format/number.mjs';
import { formatFixed } from '../../core/num/real.mjs';

/**
 * @param {object} doc    data/ui/ore.json
 * @param {object} deps   { mining: data/systems/mining.json, crafting: data/systems/crafting.json, kitDoc: data/ui/kit.json (палитра
 *                          разрешена), strings: data/strings.json → .strings, textWidth(fontKey, text) кита, skin }
 */
export function makeOreScreen(doc, { mining, crafting, kitDoc, strings, textWidth, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`ore screen: нет текста ${key}`);
    return s;
  };
  const rowsOf = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const materials = rowsOf(crafting.tables.bars);
  const byOre = new Map(materials.map((b) => [b.bar, b]));
  const sellOf = new Map(rowsOf(mining.tables.ores).map((o) => [o.ore, o.sell]));
  const modes = rowsOf(doc.modes);
  const style = (id) => {
    const s = kitDoc.styles[id];
    if (!s) throw new Error(`ore screen: нет стиля кита ${id}`);
    return s;
  };

  /** Ряды: руды мира от 0 до старшей найденной в этом престиже (не по открытым этажам: записи O 6.12 o612-f10, o612-h7). */
  function oreRows(state) {
    const last = state.highestOre;
    if (!Number.isFinite(last)) throw new Error('ore screen: нет state.highestOre');
    return materials.filter((b) => b.world === state.world && b.bar <= last).map((b) => b.bar);
  }

  /** Цена продажи 1 руды: база × множитель цены (клетка сводки). */
  const priceOf = (state, ore) => sellOf.get(ore) * state.sellMulti;
  /** Выручка строки: руда × цена. */
  const valueOf = (state, ore) => state.ore[ore] * priceOf(state, ore);
  /** Выручка Sell All: по незапертым рядам Σ ⌊руда × доля режима⌋ × цена (??: порядок сложения — по рядам). */
  function sellAllOf(state, mode) {
    const share = modes[mode].share;
    let s = 0;
    for (const k of oreRows(state)) if (!state.locked[k]) s += Math.floor(state.ore[k] * share) * priceOf(state, k);
    return s;
  }

  const num = makeShortFormat(doc.format.short);
  const price = (x) => formatFixed(x, doc.format.priceDecimals);

  const leaf = (tpl, ox, oy, over = {}) => {
    const o = { ...tpl, ...over };
    delete o.id;
    o.x = ox + tpl.x;
    o.y = oy + tpl.y;
    return o;
  };
  const textOf = (o) => (o.text !== undefined ? { ...o, value: T(o.text), text: undefined } : o);
  const clean = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };

  function header(out, world, y) {
    const h = doc.header;
    const text = T(h.texts[0]) + world + T(h.texts[1]);
    const half = textWidth(h.font, text) / 2;
    const L = h.line;
    out.push({ component: 'line', x1: L.x1, y1: y, x2: h.x - half - L.gap, y2: y, w: L.w, color: L.color, alpha: L.alpha });
    out.push({ component: 'line', x1: h.x + half + L.gap, y1: y, x2: L.x2, y2: y, w: L.w, color: L.color, alpha: L.alpha });
    out.push({ component: 'text', font: h.font, x: h.x + h.shadow.dx, y: y + h.shadow.dy, value: text, halign: 'center', valign: 'middle', color: h.shadow.color });
    out.push({ component: 'text', font: h.font, x: h.x, y, value: text, halign: 'center', valign: 'middle', color: h.color });
  }

  function row(out, state, ore, y) {
    const gray = doc.disabledColor;
    const can = state.ore[ore] > 0;   // «Sell» серая, если руды нет (??: по записям — замок на оттенок не влияет)
    const over = {
      sellButton: can ? {} : { color: gray },
      sellLabel: can ? {} : { color: gray },
      oreCount: { value: num(state.ore[ore]) },
      oreIcon: { frame: ore },
      value: { value: num(valueOf(state, ore)) },
      title: { value: T(doc.title[0]) + T(byOre.get(ore).name) + T(doc.title[1]) },
      price: { value: price(priceOf(state, ore)) },
      lock: state.locked[ore] ? { frame: doc.lockFrame.locked, color: doc.lockedColor } : { frame: doc.lockFrame.open },
    };
    const locked = !!state.locked[ore];   // запертая строка: затемнение поверх ряда и серый замок
    const backing = y <= doc.backingBelow;   // подложка ряда только выше границы (??: граница — внутри (1200, 1280])
    for (const t of doc.row) {
      if (!backing && doc.backingIds.includes(t.id)) continue;
      if (!locked && doc.lockedOnly.includes(t.id)) continue;
      out.push(clean(textOf(leaf(t, 0, y, over[t.id] || {}))));
    }
  }

  /**
   * Ползунок: дорожка от thumb.top (+ сдвиг top) до thumb.bottom, видимая высота view − top; предел прокрутки
   * m = n · unit + extra, n — ОТКРЫТО ЭТАЖЕЙ (state.floors), а не рядов списка (записи O 6.12: o612-f3/f10/f33/h7 — этажи 3, 10, 26, 33). Длина = дорожка · V / (V + m), верх = начало дорожки + scroll · (дорожка − длина) / m.
   */
  function thumbSpan(n, scroll, top) {
    const t = doc.thumb;
    const L = t.bottom - (t.top + top);
    const V = t.view - top;
    const m = n * t.unit + t.extra;
    const len = L * V / (V + m);
    const y1 = (t.top + top) + scroll * (L - len) / m;
    return [y1, y1 + len];
  }

  /** Листья экрана в порядке рисования O. */
  function leaves(state, view = {}) {
    const top = view.top ?? 0, scroll = view.scroll ?? 0, mode = view.mode ?? 0;
    const out = [];
    const p = style(doc.kitStyles.panel);
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y - scroll * doc.noiseScroll, sx: tx.scale, sy: tx.scale,
        color: tx.color, alpha: tx.alpha });
    const hy = doc.header.y + top - scroll;
    header(out, state.world, hy);
    const rows = oreRows(state);
    rows.forEach((ore, i) => row(out, state, ore, hy + doc.list.rowY + i * doc.list.rowStep));
    const th = style(doc.kitStyles.thumb);
    const [y1, y2] = thumbSpan(state.floors, scroll, top);
    out.push({ component: 'rect', x1: th.x1, y1, x2: th.x2, y2, color: th.color, alpha: th.alpha });
    const B = doc.bottom;
    const over = {
      modeLabel: { text: modes[mode].label },
      sellAllLabel: { value: T(B.currency) + num(sellAllOf(state, mode)) },
    };
    for (const t of B.parts) out.push(clean(textOf(leaf(t, 0, B.y, over[t.id] || {}))));
    return out;
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}) {
    let skipped = 0;
    for (const l of leaves(state, view)) if (!drawLeaf(list, skin, l)) skipped++;
    return skipped;
  }

  return { leaves, build, oreRows, priceOf, valueOf, sellAllOf, thumbSpan, modes };
}
