// Меню реликвий, главная страница (этап 6.14): вёрстка data/ui/relics.json из компонентов кита + привязки к состоянию игрока
// и к данным реликвий (data/systems/relics.json: редкость, слот уровня, кап, пороги обелиска и суммы редкости, значок, название).
//
// Экран не рисует записи O: он раскладывает реликвии по разделам редкости (в порядке номеров реликвий), подставляет тексты
// уровня («n» или «n/кап», зелёный на капе), бонуса («+» n · шаг + суффикс), подписи (множитель руды золотых и радужных этажей),
// серую плашку (уровень 0) и требования (уровень 0 и порог не пройден), сдвигает список прокруткой, отсекает ряды вне полосы и рисует
// ползунок, затем шапку (кнопки открытия серые без сундуков, подпись последней реликвии, число сундуков).
//
// Состояние: { levels — уровни по слоту (массив, слот = data/systems/relics.json → relics.slot), chests — сундуков реликвий,
//   obelisk — уровень обелиска, last — номер последней выпавшей реликвии или null }.
//   Для страницы Summary ещё: outfit — 12 цветов костюма шахтёра (BGR, как в сейве), mythicChests, mythicOpened, divineChests,
//   divineOpened (сундуки мифические / божественные: есть и открыто).
// Вид: { scroll — прокрутка списка вверх, px (≥ 0), lastScale — масштаб подписи последней реликвии (вход анимации, ??),
//   summary — открыта страница Summary (раунд исправлений 6.14) }.
//
// Страница Summary рисуется поверх шапки и ползунка главной страницы; ряды и заголовки списка при ней не рисуются.
import { drawLeaf } from '../kit/table.mjs';
import { makeShortFormat } from '../format/number.mjs';
import { formatReal } from '../../core/num/real.mjs';
import { hitArea } from '../kit/input.mjs';

/**
 * @param {object} doc   data/ui/relics.json
 * @param {object} deps  { relics: data/systems/relics.json, kitDoc: data/ui/kit.json (палитра разрешена), strings: data/strings.json → .strings,
 *                         textWidth(fontKey, text) кита, skin }
 */
export function makeRelicsScreen(doc, { relics, kitDoc, strings, textWidth, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`relics screen: нет текста ${key}`);
    return s;
  };
  const rowsOf = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const rarData = rowsOf(relics.tables.rarities);
  const rarUi = new Map(rowsOf(doc.rarities).map((r) => [r.rarity, r]));
  const all = rowsOf(relics.tables.relics).sort((a, b) => a.id - b.id);
  const textOf = new Map(rowsOf(doc.relicTexts).map((r) => [r.relic, r]));
  const subOf = new Map(rowsOf(doc.subTexts).map((r) => [r.relic, r]));
  const num = makeShortFormat(doc.format.short);
  const hex = (bgr) => '#' + [bgr & 255, (bgr >> 8) & 255, (bgr >> 16) & 255].map((v) => v.toString(16).padStart(2, '0')).join('');
  /** Разделы: редкость в порядке data/systems/relics.json → rarities, реликвии раздела — по номеру. */
  const sections = rarData.map((r) => {
    const ui = rarUi.get(r.rarity);
    if (!ui) throw new Error(`relics screen: нет вида редкости ${r.rarity}`);
    return { rarity: r.rarity, color: hex(r.color), ui, relics: all.filter((x) => x.rarity === r.rarity) };
  });
  const style = (id) => {
    const s = kitDoc.styles[id];
    if (!s) throw new Error(`relics screen: нет стиля кита ${id}`);
    return s;
  };
  const compose = (parts, vars) => parts.map((p) => {
    const m = /^\{(\w+)\}$/.exec(p);
    if (m) { if (!(m[1] in vars)) throw new Error(`relics screen: нет значения ${p}`); return vars[m[1]]; }
    return p.startsWith('t.') ? T(p) : p;
  }).join('');
  const clean = (o) => { delete o.id; for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };
  /** Лист шаблона со сдвигом (y, y1, y2 — от якоря oy); text → value. */
  const put = (out, t, oy, over = {}) => {
    const o = { ...t, ...over };
    for (const k of ['y', 'y1', 'y2']) if (t[k] !== undefined && over[k] === undefined) o[k] = oy + t[k];
    if (o.text !== undefined && o.value === undefined) { o.value = T(o.text); delete o.text; }
    out.push(clean(o));
  };

  const levelOf = (state, r) => {
    const v = state.levels[r.slot];
    if (v === undefined) throw new Error(`relics screen: нет уровня слота ${r.slot}`);
    return v;
  };
  /** Сумма уровней реликвий редкости (порог rarityOwnedReq). */
  const raritySum = (state, rarity) => all.filter((x) => x.rarity === rarity).reduce((a, x) => a + levelOf(state, x), 0);
  /** Бонус реликвии: уровень · num / den (порядок: сначала умножение — целые точны). */
  const bonusOf = (state, r) => { const t = textOf.get(r.id); return levelOf(state, r) * t.num / t.den; };

  /** Ряд реликвии: { y, relic, level, locks: [{kind, text}], overlay }. */
  function rowInfo(state, r) {
    const level = levelOf(state, r);
    const locks = [];
    if (r.rarityOwnedReq > 0) {
      const n = raritySum(state, r.rarity);
      if (n < r.rarityOwnedReq) locks.push({ kind: 'rarity', text: compose(doc.reqTexts.rarity, { n: formatReal(n), req: formatReal(r.rarityOwnedReq), rarity: T(rarUi.get(r.rarity).reqName) }) });
    }
    if (r.obeliskReq > 0 && state.obelisk < r.obeliskReq) locks.push({ kind: 'obelisk', text: compose(doc.reqTexts.obelisk, { req: formatReal(r.obeliskReq) }) });
    // ряд с уровнем > 0 не серый и без требований, даже если порог не пройден (запись r614-rich-s3: реликвия 30, 2 уровня при
    // сумме divine 19 < 30) — замки показываются только у ряда с уровнем 0
    return { level, locks: level === 0 ? locks : [], overlay: level === 0 };
  }

  /** Раскладка списка при прокрутке 0: [{kind: 'title', section, y} | {kind: 'row', section, relic, y}] и предел прокрутки. */
  function layout() {
    const L = doc.list;
    const items = [];
    let y = L.top;
    for (const s of sections) {
      items.push({ kind: 'title', section: s, y });
      s.relics.forEach((r, i) => items.push({ kind: 'row', section: s, relic: r, y: y + L.titleToRow + i * L.rowStep }));
      y += L.titleToRow + (s.relics.length - 1) * L.rowStep + L.sectionGap;
    }
    return { items, height: y - L.top };
  }
  const LAY = layout();

  /**
   * Ползунок: дорожка от thumb.top до thumb.bottom, видимая высота view; предел прокрутки m = высота списка − pad (??: pad по записям).
   * Длина = дорожка · V / (V + m), верх = начало дорожки + scroll · (дорожка − длина) / m (как ползунок Craft, 6.11).
   */
  function thumbSpan(scroll) {
    const t = doc.thumb;
    const L = t.bottom - t.top;
    const m = maxScroll();
    const len = L * t.view / (t.view + m);
    const y1 = t.top + scroll * (L - len) / m;
    return [y1, y1 + len];
  }
  function maxScroll() { return LAY.height - doc.thumb.pad; }

  function title(out, s, y) {
    const h = doc.title;
    const text = T(s.ui.title);
    const half = textWidth(h.font, text) / 2;
    const L = h.line;
    out.push({ component: 'line', x1: L.x1, y1: y, x2: h.x - half - L.gap, y2: y, w: L.w, color: s.color, alpha: L.alpha });
    out.push({ component: 'line', x1: h.x + half + L.gap, y1: y, x2: L.x2, y2: y, w: L.w, color: s.color, alpha: L.alpha });
    out.push({ component: 'text', font: h.font, x: h.x + h.shadow.dx, y: y + h.shadow.dy, value: text, halign: 'center', valign: 'middle', color: h.shadow.color });
    out.push({ component: 'text', font: h.font, x: h.x, y, value: text, halign: 'center', valign: 'middle', color: s.color });
  }

  function subText(state, r) {
    const s = subOf.get(r.id);
    if (!s) return '';
    const from = all.find((x) => x.id === s.from);
    return compose(s.parts, { v: formatReal(s.base * (1 + bonusOf(state, from) / 100)) });
  }

  function row(out, state, s, r, y) {
    const info = rowInfo(state, r);
    const capped = r.cap > 0 && info.level >= r.cap;
    const tx = textOf.get(r.id);
    const lv = r.cap > 0 ? compose(doc.levelTexts.capped, { n: num(info.level), cap: num(r.cap) }) : compose(doc.levelTexts.plain, { n: num(info.level) });
    const green = capped ? { color: doc.capColor } : {};
    const over = {
      frame: { color: s.ui.frame },
      icon: { sprite: r.icon },
      name: { value: T(r.text) },
      sub: { value: subText(state, r) },
      level: { value: lv, ...green },
      bonus: { value: doc.bonusPrefix + formatReal(bonusOf(state, r)) + tx.suffix, ...green },
    };
    for (const t of doc.row) put(out, t, y, over[t.id] || {});
    if (!info.overlay) return;
    put(out, doc.overlay, y);
    const two = info.locks.length > 1;
    for (const lk of info.locks) {
      const dy = two ? (lk.kind === 'rarity' ? doc.reqTwo.rarityDy : doc.reqTwo.obeliskDy) : 0;   // один замок — по центру (только «редкость» снята, ??)
      for (const t of doc.req) put(out, t, y + dy, t.id === 'text' ? { value: lk.text } : {});
    }
  }

  const CK = rowsOf(doc.chestKinds);
  const CK_BY = new Map(CK.map((k) => [k.kind, k]));
  const chestCounts = (state) => ({ relic: state.chests, mythic: state.mythicChests ?? 0, divine: state.divineChests ?? 0 });

  /** Подпись последней реликвии (пусто, пока не открывали). */
  const lastLabel = (state) => (state.last === null || state.last === undefined ? '' : T(all.find((x) => x.id === state.last).text));

  /** Листья экрана в порядке рисования O. */
  function leaves(state, view = {}) {
    const scroll = view.scroll ?? 0;
    const C = doc.list.cull;
    const out = [];
    const p = style(doc.kitStyles.panel);
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y - scroll, sx: tx.scale, sy: tx.scale, color: tx.color, alpha: tx.alpha });
    // список: ряды и заголовки вне полосы не рисуются (границы — по записям, ??); при открытой Summary списка нет
    for (const it of view.summary ? [] : LAY.items) {
      const y = it.y - scroll;
      if (it.kind === 'title') { if (y >= C.titleTop && y <= C.titleBottom) title(out, it.section, y); }
      else if (y >= C.rowTop && y <= C.rowBottom) row(out, state, it.section, it.relic, y);
    }
    // шапка: сундуки реликвий, мифические и божественные (виды — doc.chestKinds)
    const gray = doc.disabledColor;
    const have = chestCounts(state);
    const can = CK.some((k) => have[k.kind] >= 1);
    const dim = can ? {} : { color: gray };
    const scale = view.lastScale ?? 1;
    const openKind = CK_BY.get(doc.chestKinds.openPriority.find((k) => have[k] >= 1) ?? 'relic');
    const allKinds = CK.filter((k) => have[k.kind] >= 1);
    // число сундуков: число как есть при n ≤ 10000 (лист O — число; ??: граница типа между 10000 и 99999 — вид одинаковый),
    // строкой при < 100000 (r614-c99999 «99999»), иначе короткий текст (r614-c100000 «100k»)
    const countText = (n) => (n <= doc.format.short.plainBelow ? n : n < doc.format.countPlainBelow ? String(n) : num(n));
    const hover = {
      openButton: dim, openIcon: { sprite: openKind.icon, ...dim }, openLabel: { text: openKind.openText, ...dim }, allButton: dim, allLabel: dim,
      last: { value: lastLabel(state), ...(scale !== 1 ? { xscale: scale, yscale: scale } : {}) },
      count: { value: countText(have.relic) },
    };
    for (const t of doc.header) {
      if (t.id === 'allIcon' && allKinds.length > 0) {
        // Open All: значки видов с сундуками, x по числу значков
        const xs = doc.chestKinds.allIconX[allKinds.length - 1];
        allKinds.forEach((k, i) => put(out, t, 0, { sprite: k.icon, x: xs[i] }));
        continue;
      }
      put(out, t, 0, t.id === 'allIcon' ? dim : hover[t.id] || {});
      if (t.id !== 'countIcon') continue;
      // строки счётчиков мифических и божественных сундуков — только при > 0, на своих местах
      for (const k of CK) {
        if (k.rowDy === 0 || have[k.kind] < 1) continue;
        for (const id of ['countBack', 'countDesc', 'count', 'countIcon']) {
          const tt = doc.header.find((x) => x.id === id);
          put(out, tt, k.rowDy, id === 'count' ? { value: countText(have[k.kind]) } : id === 'countIcon' ? { sprite: k.icon } : {});
        }
      }
    }
    // ползунок
    const [y1, y2] = thumbSpan(scroll);
    const th = doc.thumb;
    out.push({ component: 'rect', x1: th.x1, y1, x2: th.x2, y2, color: th.color, alpha: th.alpha });
    if (view.summary) summary(out, state);
    return out;
  }

  // ---- страница Summary ----
  const SM = doc.summary;
  const sideOf = new Map(rowsOf(SM.sideOf).map((r) => [r.rarity, r]));
  const chanceOf = new Map(rarData.map((r) => [r.rarity, r.chance]));
  const smallFont = new Set(SM.smallFont.relics);
  /** Доля n из total в процентах: formatReal(100·n/total) + «%» — «0%» при n = 0, «NaN%» при total = 0 (запись r614-sum-zero). */
  const pct = (n, total) => formatReal(n / total * 100) + SM.pctSuffix;


  function summary(out, state) {
    out.push({ ...SM.background });
    const total = all.reduce((a, r) => a + levelOf(state, r), 0);
    const mo = state.mythicOpened ?? 0, dO = state.divineOpened ?? 0;
    const fromRelic = total - mo - dO;   // реликвий из сундуков реликвий (запись r614-sum-chx: 49686 − 2 − 1 = 49683)
    let y = SM.rows.top;
    for (const s of sections) {
      const side = sideOf.get(s.rarity);
      const n = raritySum(state, s.rarity);
      s.relics.forEach((r, i) => {
        const yy = y + i * SM.rows.step;
        const level = levelOf(state, r);
        const capped = r.cap > 0 && level >= r.cap;
        const font = smallFont.has(r.id) ? { font: SM.smallFont.font } : {};
        const name = level === 0
          ? { value: compose(SM.emptyParts, { n: formatReal(level) }), color: SM.emptyColor, ...font }
          : { value: compose(SM.nameParts, { n: formatReal(level), name: T(r.text) }), ...(s.color !== '#ffffff' ? { color: s.color } : {}), ...font };
        const over = { frame: capped ? { sprite: SM.cappedFrame } : {}, icon: { sprite: level === 0 ? SM.emptyIcon : r.icon }, name };
        for (const t of SM.row) put(out, t, yy, over[t.id] || {});
        if (i !== 0) return;
        // правая колонка — после первого ряда редкости
        const chance = side.side === 'mythic' ? compose(SM.mythicChance, { n: formatReal(100 / chanceOf.get(s.rarity)) }) : T(side.chance);
        // доли — от реликвий из сундуков реликвий (r614-sum-chs: 50/97 = 51.55%, мифических 10/97 = 10.31%);
        // «Excluding» — мифические без открытых мифических сундуков: (10 − 5)/97 = 5.15%
        // «Your Average: 1/N»: N = ⌊реликвий из сундуков реликвий / (божественных − открытых божественных сундуков)⌋ (97/2 = 48.5 → 48;
        // ??: floor или округление половины к чётному — записи не различают); без них — 1 / базовый шанс (25000)
        const dn = n - dO;
        const avg = dn === 0 ? 100 / chanceOf.get(s.rarity) : Math.floor(fromRelic / dn);
        const sideOver = { ring: { frame: side.ring }, chance: { value: chance }, pct: { value: pct(n, fromRelic) },
          excl: { value: pct(n - mo, fromRelic) }, avg: { value: compose(SM.averageParts, { n: formatReal(avg) }) } };
        for (const t of SM.sides[side.side]) put(out, t, yy, sideOver[t.id] || {});
      });
      y += s.relics.length * SM.rows.step + SM.rows.sectionGap;
    }
    put(out, SM.close, 0);
    const M = SM.miner;
    for (let k = 0; k < M.frames; k++) {
      const c = state.outfit?.[k];
      if (c === undefined) throw new Error(`relics screen: нет цвета костюма ${k}`);
      out.push(clean({ component: 'sprite', sprite: M.sprite, frame: k, x: M.x, y: M.y, sx: M.sx, sy: M.sy, color: hex(c) }));
    }
    // счётчики: реликвий из сундуков реликвий, открытых мифических и божественных сундуков (r614-sum-chx: 49683, 2, 1)
    const cnt = { relics: fromRelic, mythic: mo, divine: dO };
    for (const c of SM.counters) {
      const v = cnt[c.id];
      const dim = c.dimZero && v === 0 ? { color: SM.counterZeroColor } : {};
      put(out, c.panel, 0);
      put(out, c.icon, 0, dim);
      put(out, c.text, 0, { value: formatReal(v), ...dim });
    }
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}) {
    let skipped = 0;
    for (const l of leaves(state, view)) if (!drawLeaf(list, skin, l)) skipped++;
    return skipped;
  }

  /**
   * Касание (точка GUI g = [gx, gy], ui/kit/input.mjs → pointer().gui) → действие экрана или null.
   * Зоны — data/ui/relics.json → touch (по записям O t614-*): при открытой Summary касание закрывает её (зона close),
   * иначе — кнопки шапки по порядку; кнопка с needChests без сундуков любого вида не срабатывает (??: без сундуков O тоже ничего
   * не открывает, но срабатывает ли касание — не наблюдаемо).
   */
  function touch(state, view, g) {
    const Z = doc.touch;
    if (view.summary) return hitArea(g, ...Z.close) ? 'close' : null;
    const have = chestCounts(state);
    const any = CK.some((k) => have[k.kind] >= 1);
    for (const b of Z.buttons) if (hitArea(g, ...b.area) && (!b.needChests || any)) return b.action;
    return null;
  }

  return { leaves, build, layout: () => LAY, thumbSpan, maxScroll, rowInfo, raritySum, touch };
}
