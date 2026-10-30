// Экран Workshop (этап 4.3): вёрстка data/ui/workshop.json из компонентов кита (ui/kit) + привязки к ядру (core/workshop.mjs).
//
// Экран не знает чисел баланса: цены, капы, замки, тексты строк и «хватает баров» отдаёт ядро; экран раскладывает
// секции миров и строки по шагам из data/ui/workshop.json и переводит состояние строки в параметры компонента buyRow.
// Состояние: { obelisk, worlds, capBonus, levels[37], bars[86] }. Вид: { scroll — смещение списка вверх в px комнаты (≥ 0),
// window — окно { w, h } (по умолчанию 500×960), safeTop — верхний безопасный отступ (вырез) в px слоя: весь интерфейс меню
// (список, ползунок, подзаголовок, ☰) ниже на safeTop, шум панели на месте }.
// Этап 6.19: координаты вёрстки — смещения от якоря doc.root.anchor в слое интерфейса (ui/kit/anchors.mjs). Слой 500×960 при
// любом окне (правило 1 spec input-layout), поэтому вершины экрана при 500×960 и 1000×1920 одни и те же; окно меняет только
// перевод касаний (touchRow) и вывод на canvas (масштаб layer.scale). Сдвиг 64, который 4.3 приписал панели заданий NPE, —
// это верхний отступ выреза (6.19: сейвы с заданием 20 и вырезом 64 дают тот же сдвиг, вырез 0 — без сдвига): верхний якорь слоя.
import { makeShortFormat } from '../format/number.mjs';
import { makeLayer } from '../kit/anchors.mjs';

/**
 * @param {object} doc      data/ui/workshop.json
 * @param {object} deps     { kit (ui/kit makeKit), workshop (core makeWorkshop), strings (data/strings.json → .strings) }
 */
export function makeWorkshopScreen(doc, { kit, workshop, strings }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`workshop screen: нет текста ${key}`);
    return s;
  };
  const node = (id) => {
    const n = doc.root.children.find((c) => c.id === id);
    if (!n) throw new Error(`workshop screen: нет узла ${id}`);
    return n;
  };
  const panel = node('panel'), list = node('rows'), thumb = node('scroll'), subtitle = node('subtitle'), menu = node('menu');
  const short = makeShortFormat(doc.format.short);
  const items = new Map(list.items.map((it) => [it.row, it]));
  const sections = new Map(list.sections.map((s) => [s.world, s]));
  const tx = list.texts;
  const gap = list.gaps;

  /** Секции по мирам: строки в порядке показа (ядро: order), мир строки — её порог мира. */
  function layoutRows() {
    const bySection = new Map();
    for (const row of workshop.order) {
      const w = workshop.requirement(row).world;
      if (!bySection.has(w)) bySection.set(w, []);
      bySection.get(w).push(row);
    }
    const out = [];
    let y = list.y;
    const worlds = [...bySection.keys()].sort((a, b) => a - b);
    worlds.forEach((w, k) => {
      if (k > 0) y += gap.rowToHeader;
      out.push({ kind: 'header', world: w, y });
      y += gap.headerToRow;
      bySection.get(w).forEach((row, j) => {
        if (j > 0) y += gap.rowStep;
        out.push({ kind: 'row', world: w, row, y });
      });
    });
    return out;
  }
  const LAYOUT = layoutRows();

  /** Параметры buyRow по состоянию строки (привязки). */
  function rowView(state, row, world) {
    const L = state.levels[row];
    const lk = workshop.locks(state, row);
    const req = workshop.requirement(row);
    const it = items.get(row);
    if (!it) throw new Error(`workshop screen: нет строки ${row} в items`);
    const prices = workshop.prices(row, L, state.obelisk);
    const ids = workshop.barsOf(row);
    const costs = ids.map((id, k) => ({
      text: short(state.bars[id]) + T(tx.costSep) + short(prices[k]),
      affordable: workshop.enough(state.bars[id], prices[k]),
      frame: id,
    }));
    const locks = [];
    // порядок плашек замков, как у O: предыдущая бомба → уровень обелиска → мир
    if (!lk.prev) locks.push(T(tx.lockPrev) + workshop.prevName(row));
    if (!lk.obelisk) locks.push(T(tx.lockObelisk) + req.obelisk);
    if (!lk.world) locks.push(T(tx.lockWorldPrefix) + req.world + T(tx.lockWorldSuffix));
    const open = lk.obelisk;
    const v = {
      backing: sections.get(world).backing, icon: it.icon, overlay: it.overlay ?? null,
      costs, locks, canBuy: workshop.affordable(row, L, state.obelisk, state.bars), buyText: T(tx.buy),
    };
    const cap = workshop.cap(row, state.obelisk, state.capBonus || 0);
    if (open) v.level = `${L}/${cap}`;
    // 6.19: строка на капе рисуется как «на капе» и под замком (кнопка Maxed и текст «на капе», поверх — плашки замков),
    // плашки уровня у закрытой строки нет (записи O 6.19: ob1 — строки 2–3 на капе под замком обелиска; строка 7 с капом 0)
    if (!lk.notCapped) Object.assign(v, { maxed: true, title: workshop.doneText(row, L), buyText: T(tx.maxed) });
    else if (open) v.title = workshop.lineText(row, L);
    return v;
  }

  /**
   * Ползунок: дорожка от track.top (+ сдвиг top) до track.bottom, видимая высота списка view = viewBottom − top, предел
   * прокрутки maxScroll (data/ui/workshop.json → scroll). Длина = дорожка · view / (view + maxScroll), верх = начало
   * дорожки + scroll · (дорожка − длина) / maxScroll.
   */
  function thumbSpan(scroll, top = 0) {
    const t = thumb.track;
    const L = t.bottom - (t.top + top);
    const V = t.viewBottom - top;
    const len = L * V / (V + t.maxScroll);
    const y1 = (t.top + top) + scroll * (L - len) / t.maxScroll;
    return [y1, y1 + len];
  }

  const anchor = doc.root.anchor ?? 'topLeft';
  /** Слой окна вида и начало вёрстки (точка якоря экрана в слое). */
  const layerOf = (view) => makeLayer(view.window ?? { w: 500, h: 960 }, { safeTop: view.safeTop ?? 0 });
  const originOf = (layer) => layer.point(anchor);
  /** Сдвиг интерфейса меню вниз от вёрстки (верхний отступ слоя). */
  const topOf = (view = {}) => originOf(layerOf(view))[1];

  /** Список вершин экрана: панель → секции и строки → ползунок → подзаголовок → ☰ (порядок O). */
  function build(state, view = {}) {
    const scroll = view.scroll ?? 0;
    const [ox, oy] = originOf(layerOf(view));
    const out = kit.newList();
    kit.panel(out, panel.style, scroll);
    for (const e of LAYOUT) {
      const y = (e.y + oy) - scroll;
      if (e.kind === 'header') {
        const s = sections.get(e.world);
        const text = T(tx.sectionPrefix) + e.world + T(tx.sectionSuffix);
        kit.header(out, list.header.style, ox + list.x, y, text, s.color);
      } else {
        kit.buyRow(out, list.item.style, ox + list.x, y, rowView(state, e.row, e.world));
      }
    }
    const [y1, y2] = thumbSpan(scroll, oy);
    kit.scrollThumb(out, thumb.style, y1, y2);
    kit.subtitleBar(out, subtitle.style, T(subtitle.text), subtitle.y + oy);
    kit.menuButton(out, menu.style, ox + menu.x, menu.y + oy);
    return out;
  }

  /** Строка списка под точкой слоя (y), если точка на ряду строки: { row, y0 } — y0 — центр ряда в слое. ?? Высота зоны
   *  касания ряда (± половина шага ряда) — не снималась с O: только для навигации, покупка по касанию — этап сборки игры. */
  function rowAt(gy, view = {}) {
    const scroll = view.scroll ?? 0;
    const [, oy] = originOf(layerOf(view));
    for (const e of LAYOUT) {
      if (e.kind !== 'row') continue;
      const y0 = (e.y + oy) - scroll;
      if (Math.abs(gy - y0) * 2 < gap.rowStep) return { row: e.row, y0 };
    }
    return null;
  }

  /** Касание окна (px окна view.window) → строка списка под ним (через слой: правила 2–3 spec input-layout). */
  function touchRow(px, py, view = {}) {
    const g = layerOf(view).touch(px, py).gui;
    return rowAt(g[1], view);
  }

  return { build, rowView, thumbSpan, topOf, layerOf, rowAt, touchRow, layout: LAYOUT };
}
