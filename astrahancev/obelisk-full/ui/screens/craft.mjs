// Экран Craft (этап 6.11): вёрстка data/ui/craft.json из компонентов кита + привязки к данным системы крафта
// (data/systems/crafting.json: какие бары варятся, база цены, множители) и к состоянию игрока.
//
// Экран не рисует записи O: он раскладывает шаблоны ряда (обычный и режим видимости) по шагу списка, подставляет в поля
// с id привязки (кадр значка = номер бара, тексты чисел, оттенок «нельзя», ширина плашки имени по ширине текста) и
// рисует листья рисовальщиком таблиц кита (ui/kit/table.mjs). Панель, кнопка ☰ и ползунок — по стилям кита (data/ui/kit.json).
//
// Состояние: { world, obelisk, floors (открыто этажей), ore[], bar[] } — из сейва/ядра.
// Вид: { top — сдвиг меню вниз (панель заданий NPE), scroll — прокрутка списка вверх, px (≥ 0), multi — номер выбранного
//   множителя (0…), visibility — режим видимости (глаз) }. Переключение видимости отдельной строки — не снято (??).
import { drawLeaf } from '../kit/table.mjs';
import { makeShortFormat } from '../format/number.mjs';

const F = Math.fround;

/**
 * @param {object} doc    data/ui/craft.json
 * @param {object} deps   { crafting: data/systems/crafting.json, mining: data/systems/mining.json, kitDoc: data/ui/kit.json (палитра
 *                          разрешена), strings: data/strings.json → .strings, textWidth(fontKey, text) кита, skin }
 */
export function makeCraftScreen(doc, { crafting, mining, kitDoc, strings, textWidth, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`craft screen: нет текста ${key}`);
    return s;
  };
  const rowsOf = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const bars = rowsOf(crafting.tables.bars);
  const byBar = new Map(bars.map((b) => [b.bar, b]));
  const costOf = new Map(rowsOf(crafting.tables.recipes).map((r) => [r.bar, r.cost]));
  const multis = rowsOf(crafting.tables.multipliers);
  const floorOre = new Map(rowsOf(mining.tables.floors).map((f) => [f.floor, f.baseOre]));
  const C = crafting.constants;
  const style = (id) => {
    const s = kitDoc.styles[id];
    if (!s) throw new Error(`craft screen: нет стиля кита ${id}`);
    return s;
  };

  /** Наибольший номер руды открытых этажей (руда последнего открытого этажа). */
  const oreReached = (floors) => floorOre.get(Math.min(Math.max(1, floors), C.floorCap)) ?? 0;

  /** Последний бар списка: руда последнего открытого этажа, не меньше minLastBar (??). */
  const lastBar = (state) => Math.max(C.minLastBar, oreReached(state.floors));
  /** Ряды обычного режима: бары мира с рецептом, 0…lastBar. */
  function craftRows(state) {
    const lim = lastBar(state);
    return bars.filter((b) => b.world === state.world && costOf.has(b.bar) && b.bar <= lim).map((b) => b.bar);
  }
  /** Ряды режима видимости: все бары мира. */
  const visRows = (state) => bars.filter((b) => b.world === state.world).map((b) => b.bar);

  /** Сколько варить за касание при множителе m (номер строки таблицы multipliers); max — сколько хватает руды (не меньше 1). */
  function amountOf(state, bar, m) {
    const mm = multis[m];
    if (mm.max !== 1) return mm.amount;
    const base = costOf.get(bar);
    return Math.max(1, Math.floor(state.ore[bar] / base));
  }

  /** Текст числа (руда, бары, цена, выход): короткий формат data/ui/craft.json → format.short (тот же, что у Workshop). */
  const num = makeShortFormat(doc.format.short);

  const leaf = (tpl, ox, oy, over = {}) => {
    const o = { ...tpl, ...over };
    delete o.id;
    o.x = ox + tpl.x;
    o.y = oy + tpl.y;
    return o;
  };
  const textOf = (o) => (o.text !== undefined ? { ...o, value: T(o.text), text: undefined } : o);
  const clean = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };

  function header(out, world, top, scroll) {
    const h = doc.header;
    const y = h.y + top - scroll;
    const text = T(h.texts[0]) + world + T(h.texts[1]);
    const half = textWidth(h.font, text) / 2;
    const L = h.line;
    out.push({ component: 'line', x1: L.x1, y1: y, x2: h.x - half - L.gap, y2: y, w: L.w, color: L.color, alpha: L.alpha });
    out.push({ component: 'line', x1: h.x + half + L.gap, y1: y, x2: L.x2, y2: y, w: L.w, color: L.color, alpha: L.alpha });
    out.push({ component: 'text', font: h.font, x: h.x + h.shadow.dx, y: y + h.shadow.dy, value: text, halign: 'center', valign: 'middle', color: h.shadow.color });
    out.push({ component: 'text', font: h.font, x: h.x, y, value: text, halign: 'center', valign: 'middle', color: h.color });
  }

  function normalRow(out, state, bar, y, m) {
    const b = byBar.get(bar);
    const name = T(b.name);
    const w = textWidth(doc.row.find((t) => t.id === 'name').font, name);
    const fit = doc.nameFit;
    const amount = amountOf(state, bar, m);
    const cost = costOf.get(bar) * amount;
    const can = state.ore[bar] >= cost;
    const jump = bar < lastBar(state);   // «к руде» — для баров до руды последнего этажа (??)
    const gray = doc.disabledColor;
    const over = {
      eye: { frame: 0 },
      nameBacking: { sx: (w + fit.backing.pad) / fit.backing.unit },
      nameDesc: { sx: (w + fit.desc.pad) / fit.desc.unit },
      name: { value: name },
      oreIcon: { frame: bar }, barIcon: { frame: bar }, costIcon: { frame: bar }, outputIcon: { frame: bar },
      oreCount: { value: num(state.ore[bar]) },
      barCount: { value: num(state.bar[bar]) },
      jumpButton: jump ? {} : { color: gray },
      jumpArrow: jump ? {} : { color: gray },
      cost: { value: num(cost) },
      output: { value: num(amount) },
      craftButton: can ? {} : { color: gray },
      craftLabel: can ? {} : { color: gray },
    };
    for (const t of doc.row) out.push(clean(textOf(leaf(t, 0, y, over[t.id] || {}))));
  }

  function visRow(out, state, bar, y) {
    const b = byBar.get(bar);
    const over = {
      oreIcon: { frame: bar }, barIcon: { frame: bar },
      name: { value: T(b.name) },
    };
    for (const t of doc.visRow) out.push(clean(textOf(leaf(t, 0, y, over[t.id] || {}))));
  }

  /**
   * Ползунок (полоса справа): дорожка от thumb.top (+ сдвиг top) до thumb.bottom, видимая высота view − top; предел прокрутки
   * m = n · шаг − pad, n — число рядов списка (и тех, что вне полосы рисования). Длина = дорожка · V / (V + m), верх = начало дорожки + scroll · (дорожка − длина) / m.
   */
  function thumbSpan(n, step, scroll, top) {
    const t = doc.thumb;
    const L = t.bottom - (t.top + top);
    const V = t.view - top;
    const m = n * step - t.pad;
    const len = L * V / (V + m);
    const y1 = (t.top + top) + scroll * (L - len) / m;
    return [y1, y1 + len];
  }

  /** Листья экрана в порядке рисования O. */
  function leaves(state, view = {}) {
    const top = view.top ?? 0, scroll = view.scroll ?? 0, m = view.multi ?? 0, vis = !!view.visibility;
    const shown = (y) => y >= doc.cull.top && y <= doc.cull.bottom;   // ряд и заголовок вне полосы не рисуются (??, границы — по записям)
    const out = [];
    // панель меню: затемнение и плитки шума (стиль кита)
    const p = style(doc.kitStyles.panel);
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y - scroll * doc.noiseScroll, sx: tx.scale, sy: tx.scale,
        color: tx.color, alpha: tx.alpha });
    if (shown(doc.header.y + top - scroll)) header(out, state.world, top, scroll);
    const list = doc.list;
    const rows = vis ? visRows(state) : craftRows(state);
    const y0 = doc.header.y + top - scroll + (vis ? list.visRowY : list.rowY);
    const step = vis ? list.visRowStep : list.rowStep;
    rows.forEach((bar, i) => {
      const y = y0 + i * step;
      if (!shown(y)) return;
      if (vis) visRow(out, state, bar, y); else normalRow(out, state, bar, y, m);
    });
    // ползунок
    const th = style(doc.kitStyles.thumb);
    const [y1, y2] = thumbSpan(rows.length, step, scroll, top);
    out.push({ component: 'rect', x1: th.x1, y1, x2: th.x2, y2, color: th.color, alpha: th.alpha });
    // полоса ☰
    const tb = doc.topBar;
    for (const r of tb.rects) out.push({ component: 'rect', x1: r.x1, y1: tb.y + top + r.y1, x2: r.x2, y2: tb.y + top + r.y2, color: r.color });
    const mb = style(doc.kitStyles.menuButton);
    out.push({ component: 'sprite', sprite: mb.body.sprite, x: tb.menuX + mb.body.dx, y: tb.y + top + mb.body.dy, sx: mb.body.sx, sy: mb.body.sy });
    for (const r of mb.bars) out.push({ component: 'rect', x1: tb.menuX + r.x1, y1: tb.y + top + r.y1, x2: tb.menuX + r.x2, y2: tb.y + top + r.y2, color: r.color });
    // нижняя полоса: множители, «Craft All», глаз — с уровня обелиска multiFromObelisk
    if (state.obelisk >= C.multiFromObelisk) {
      const B = doc.bottom, by = B.y;
      out.push(leaf(B.backing, 0, by));
      out.push(leaf(B.eyeButton, 0, by));
      out.push(leaf(B.eye, 0, by, { frame: vis ? B.eyeFrame.visibility : B.eyeFrame.normal }));
      const dx = state.obelisk >= C.craftAllFromObelisk ? 0 : B.craftAllHiddenDx;   // «Craft All» до порога — за левым краем
      out.push(leaf(B.craftAllButton, dx, by));
      out.push(clean(textOf(leaf(B.craftAllLabel, dx, by))));
      const M = B.multi;
      multis.forEach((mm, i) => {
        if (state.obelisk < mm.fromObelisk) return;
        const x = M.x + i * M.step;
        const label = mm.max === 1 ? T(doc.bottom.maxLabel) : mm.amount + M.suffix;
        out.push(leaf(M.button, x, by));
        if (i === m) out.push(leaf(M.selected, x, by));
        out.push(leaf(M.shadow, x, by, { value: label }));
        out.push(leaf(M.label, x, by, { value: label }));
      });
    }
    return out.map((o) => { delete o.id; return o; });
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}) {
    let skipped = 0;
    for (const l of leaves(state, view)) if (!drawLeaf(list, skin, l)) skipped++;
    return skipped;
  }

  return { leaves, build, craftRows, visRows, amountOf, thumbSpan, lastBar };
}
