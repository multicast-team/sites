// Экран Upgrades ч.1 (этап 6.9): список строк улучшений по секциям миров, «Hide Maxed Upgrades», Buy All.
//
// Вёрстка — data/ui/upgrades.json (секции, шаги ряда, значки строк, свои стили поверх кита data/ui/kit.json). Числа строки
// (цена, руды, кап, пороги, тексты «сейчас > дальше» и «на капе», «можно купить») отдаёт ядро core/upgrades.mjs; экран только
// раскладывает строки и переводит состояние строки в примитивы кита.
// Состояние: { levels[93], bars[86], gold, lvl, world, task, obelisk?, artifacts?, totals? } (obelisk и artifacts нужны ядру для цен;
// totals — итог бонуса строк с плашкой row.extra (за карты, статуи), строка → число; нет — 0). Вид: { scroll — смещение списка вверх (px комнаты, ≥ 0),
// top — сдвиг интерфейса меню вниз (панель над меню), hideMaxed — флажок «Hide Maxed Upgrades», menuOpen — открыто меню ☰,
// buyAllFrame — кадр спрайта кнопки Buy All }.
import { makeKit } from '../kit/components.mjs';
import { makeShortFormat } from '../format/number.mjs';

/**
 * @param {object} doc   data/ui/upgrades.json
 * @param {object} deps  { kitDoc (data/ui/kit.json), skin, upgrades (core makeUpgrades), strings (data/strings.json → .strings),
 *                        short (format.short), epsilon (граница «хватает», data/systems/upgraderules.json → afford.epsilon) }
 */
export function makeUpgradesScreen(doc, { kitDoc, skin, upgrades, strings, short, epsilon }) {
  const styles = { ...kitDoc.styles, ...doc.styles };
  const MENU = 'upgrades.menuOptions';
  const kits = new Map();
  /** Кит со стилями экрана; меню ☰ (стиль кита menu.options) сдвинуто на top. */
  const kitFor = (top) => {
    if (!kits.has(top)) kits.set(top, makeKit({ ...kitDoc, styles: { ...styles, [MENU]: menuStyleShifted(top) } }, skin));
    return kits.get(top);
  };
  let kit = kitFor(0);
  const fmt = makeShortFormat(short);
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`upgrades screen: нет текста ${key}`);
    return s;
  };
  const L = doc.list, tx = doc.texts, R = doc.row;
  const sections = new Map(doc.sections.map((s) => [s.world, s]));
  const icons = new Map(doc.icons.map((x) => [x.row, x.icon]));
  const rowCount = L.rowCount;
  const extraRows = new Set(R.extra?.rows ?? []);

  /** Строки по секциям миров (порог мира строки), порядок — номер строки. hideMaxed — строки на капе не показываются. */
  function layout(state, hideMaxed = false) {
    const caps = upgrades.open(state.levels).caps;
    const bySection = new Map();
    for (let r = 0; r < rowCount; r++) {
      if (hideMaxed && !(state.levels[r] < caps[r])) continue;
      const w = upgrades.worldReq(r);
      if (!bySection.has(w)) bySection.set(w, []);
      bySection.get(w).push(r);
    }
    const out = [];
    let y = L.y;
    [...bySection.keys()].sort((a, b) => a - b).forEach((w, k) => {
      if (k > 0) y += L.rowToHeader;
      out.push({ kind: 'header', world: w, y });
      y += L.headerToRow;
      bySection.get(w).forEach((row, j) => {
        if (j > 0) y += L.rowStep;
        out.push({ kind: 'row', world: w, row, y });
      });
    });
    return out;
  }

  /** Вид строки r: цены (ненулевые), «хватает», кнопка, плашка уровня, замок. */
  function rowView(state, r) {
    const lv = state.levels[r];
    const cap = upgrades.cap(r, state.levels);
    const maxed = !(lv < cap);
    const v = { row: r, maxed, icon: icons.get(r), level: null, costs: [], canBuy: false, locks: [], levelLocked: false, extra: null };
    // плашка итога — только при уровне строки > 0 (П: poor s3 — строка 43 на L 0 без плашки, строки 32 и 36 на L 1 под замком
    // по уровню — с плашкой); ?? итог ≠ 0 и плашка у строки на капе по O не сверены (в записях итог 0, строки не на капе)
    if (extraRows.has(r) && lv > 0) v.extra = T(tx.extraPrefix) + String(state.totals?.[r] ?? 0) + T(tx.extraSuffix);
    if (maxed) { v.title = upgrades.doneText(r, state.levels); return v; }
    v.title = upgrades.lineText(r, state.levels);
    if (lv > 0) v.level = `${lv}/${cap}`;
    const p = upgrades.price(r, state.levels, state), o = upgrades.ores(r, state.levels);
    for (let k = 0; k < 3; k++) {
      if (p[k] === 0) continue;
      const stock = k < 2 ? state.bars[o[k]] : state.gold;
      const text = fmt(stock) + T(tx.costSep) + fmt(p[k]);
      // широкий текст — мелким шрифтом (порог R.cost.fitWidth — ширина в шрифте стиля style; ?? точный порог между 108 и 117)
      const small = kit.textWidth(styles[R.cost.style].font, text) > R.cost.fitWidth;
      v.costs.push({ text, style: small ? R.cost.smallStyle : R.cost.style, affordable: stock >= p[k] || Math.abs(stock - p[k]) < epsilon,
        sprite: k < 2 ? R.cost.barSprite : R.cost.goldSprite, frame: k < 2 ? o[k] : 0 });
    }
    v.canBuy = upgrades.canBuy(r, state);
    // замки по порядку O: сначала порог уровня (кнопки Buy у такой строки нет), затем порог мира
    if (state.lvl < upgrades.levelReq(r, state.task)) { v.levelLocked = true; v.locks.push(T(tx.lockLevelPrefix) + upgrades.levelReq(r, state.task)); }
    if (state.world < upgrades.worldReq(r)) v.locks.push(T(tx.lockWorldPrefix) + upgrades.worldReq(r) + T(tx.lockWorldSuffix));
    return v;
  }

  /** Подложка строки: у секции с рамкой — фаска прямоугольниками, иначе спрайт секции. */
  function backing(list, sec, x, y, over = {}) {
    if (sec.frame) kit.box(list, sec.frame, x + R.frame.dx1, y + R.frame.dy1, x + R.frame.dx2, y + R.frame.dy2);
    else kit.part(list, R.backing, x, y, { sprite: sec.backing, ...over });
  }

  function drawRow(list, sec, x, y, v) {
    if (v.level != null) kit.badge(list, R.badge.style, x + R.badge.dx, y + R.badge.dy, v.level, sec.badge);
    backing(list, sec, x, y);
    kit.rect(list, x + R.desc.dx1, y + R.desc.dy1, x + R.desc.dx2, y + R.desc.dy2, R.desc.color);
    kit.part(list, R.icon, x, y, { sprite: v.icon });
    if (v.maxed) {
      kit.button(list, R.maxed.button, x + R.button.dx, y + R.button.dy, T(tx.maxed), true);
      kit.label(list, R.maxed.text.style, x + R.maxed.text.dx, y + R.maxed.text.dy, v.title);
      return;
    }
    if (v.extra != null) kit.badge(list, R.extra.style, x + R.extra.dx, y + R.extra.dy, v.extra, sec.badge);
    if (!v.levelLocked) kit.button(list, R.button.style, x + R.button.dx, y + R.button.dy, T(tx.buy), v.canBuy);
    const ts = kit.textWidth(styles[R.title.style].font, v.title) > R.title.fitWidth ? R.title.smallStyle : R.title.style;
    kit.label(list, ts, x + R.title.dx, y + R.title.dy, v.title);
    const cols = R.cost.columns[v.costs.length - 1];
    if (v.costs.length && !cols) throw new Error(`upgrades screen: нет столбцов для ${v.costs.length} цен`);
    v.costs.forEach((c, k) => kit.label(list, c.style, x + cols[k].textDx, y + R.cost.textDy, c.text, c.affordable ? R.cost.colorYes : R.cost.colorNo));
    v.costs.forEach((c, k) => kit.part(list, { ...R.cost.icon, dx: cols[k].iconDx }, x, y, { sprite: c.sprite, frame: c.frame }));
    const lk = sec.frame ? R.lockFrame : R.lock;
    for (const text of v.locks) {
      for (const p of lk.parts) kit.part(list, p, x, y, p.sprite ? {} : { sprite: sec.backing ?? sec.lockBacking });
      kit.label(list, lk.label, x, y, text);
    }
  }

  /** Ползунок: дорожка от track.top + top до track.bottom; видимая высота view = viewBottom − top; предел прокрутки maxScroll. */
  function thumbSpan(scroll, top, maxScroll) {
    const t = doc.scroll.track;
    const len0 = t.bottom - (t.top + top);
    const V = t.viewBottom - top;
    const len = len0 * V / (V + maxScroll);
    const y1 = (t.top + top) + scroll * (len0 - len) / maxScroll;
    return [y1, y1 + len];
  }

  /** Предел прокрутки — постоянный (O: один и тот же при любом числе показанных строк, в том числе при Hide Maxed). */
  const maxScrollOf = () => doc.scroll.track.maxScroll;

  /** Меню ☰ открыто: стиль menu.options со сдвигом top. */
  function menuStyleShifted(top) {
    const s = styles[doc.menu.optionsStyle];
    // padRight — свой у меню Upgrades (правый край панели 214 у O; ?? правило ширины панели — по одной строке)
    return { ...s, buttonY: s.buttonY + top, panel: { ...s.panel, y1: s.panel.y1 + top, y2: s.panel.y2 + top, padRight: doc.menu.padRight ?? s.panel.padRight },
      caption: { ...s.caption, y: s.caption.y + top }, row: { ...s.row, labelY: s.row.labelY + top, check: { ...s.row.check, dy: s.row.check.dy + top } } };
  }

  /** Вершины экрана: панель → секции и строки → ползунок → полоса ☰ → ☰ → нижняя полоса → Buy All (порядок O). */
  function build(state, view = {}) {
    const scroll = view.scroll ?? 0, top = view.top ?? 0;
    const lay = layout(state, !!view.hideMaxed);
    kit = kitFor(top);
    const out = kit.newList();
    kit.panel(out, doc.panel.style, scroll);
    // Обрыв списка (6.10, записи O record69/record610, 80 состояний): сравнивается не y записи, а y «без зазора секции» —
    // у заголовка секции и первой строки после него это y предыдущей строки + шаг строк (зазор секции добавляется после проверки).
    let prevRowY = null, afterHeader = false;
    for (const e of lay) {
      const y = (e.y + top) - scroll;
      const base = (e.kind === 'header' || afterHeader) && prevRowY !== null ? prevRowY + L.rowStep : y;
      if (base > L.drawBelow) break;
      if (e.kind === 'header') afterHeader = true; else { afterHeader = false; prevRowY = y; }
      const sec = sections.get(e.world);
      if (e.kind === 'header') kit.header(out, doc.header.style, L.x, y, T(tx.sectionPrefix) + e.world + T(tx.sectionSuffix), sec.color);
      else drawRow(out, sec, L.x, y, rowView(state, e.row));
    }
    const [y1, y2] = thumbSpan(scroll, top, maxScrollOf());
    kit.scrollThumb(out, doc.scroll.style, y1, y2);
    for (const r of doc.bar.rects) kit.rect(out, r.x1, r.y1 + top, r.x2, r.y2 + top, r.color);
    if (view.menuOpen) {
      kit.menuOptions(out, MENU, T(tx.menuCaption), [{ text: T(tx.hideMaxed), checked: !!view.hideMaxed }]);
    } else kit.menuButton(out, doc.menu.style, doc.menu.x, doc.menu.y + top);
    const b = doc.bottom;
    kit.box(out, b.box, ...b.frame);
    kit.part(out, b.button, 0, 0, { frame: view.buyAllFrame ?? 0 });
    kit.label(out, b.label, b.labelX, b.labelY, T(tx.buyAll));
    return out;
  }

  return { build, layout, rowView, thumbSpan, maxScrollOf };
}
