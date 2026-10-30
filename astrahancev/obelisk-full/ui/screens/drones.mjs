// Экран Drones, страница Upgrades (этап 6.20): вёрстка data/ui/drones.json из компонентов кита + привязки к ядру дронов
// (core/drones.mjs: цена строки, цена X очков, сколько очков по карману) и к состоянию игрока.
//
// Страница — один длинный прокручиваемый список: панель обмена золота на очки дронов, затем разделы «улучшения дрона», «костюмы»,
// «улучшения костюмов» (заголовок раздела + ряды по шагу). Сверху — полоса вкладок навигации: касание вкладки прокручивает страницу
// к своему разделу (заголовок раздела встаёт на y = navigation.headerAt), прокрутка идёт к цели по кадрам с долей ease.
// Снизу — полоса страниц (Upgrades / Suits / закрытая). Плашка очков, ползунок и полосы не прокручиваются.
//
// Страница Suits (этап 6.21) — гардероб: сетка костюмов, надетый костюм подсвечен, под сеткой — полоса его описания (до порога страницы Fuel —
// с эффектом улучшения костюма, после — с таймером и эффектом топлива); сверху вместо вкладок — «Drone Slots Available». На странице Upgrades
// купленный костюм — кнопка «Maxed», в разделе Suit Upgrades поверх заглушки — ряд улучшения костюма.
//
// Состояние: { gold, points, pointsBought, upgrades[7] (уровни строк), suits[11] (куплен ли костюм), suitUpgrades[11], slots[5] (слоты дронов:
// номер костюма + 1, 0 — пусто), fuelLeft[11]? (секунды топлива; в записях — 0), obelisk }.
// Вид: { page — нижняя страница (0 Upgrades, 1 Suits), scroll — прокрутка страницы вверх, px (≥ 0), tab — выбранная вкладка (0…2),
//        mult — множитель обмена (0 — 1x … 4 — Max) }.
import { drawLeaf } from '../kit/table.mjs';
import { makeShortFormat } from '../format/number.mjs';

/**
 * @param {object} doc    data/ui/drones.json
 * @param {object} deps   { drones: makeDrones(data/systems/drones.json), dronesData: data/systems/drones.json, kitDoc: data/ui/kit.json
 *                          (палитра разрешена), strings: data/strings.json → .strings, textWidth(fontKey, text) кита, skin }
 */
export function makeDronesScreen(doc, { drones, dronesData, kitDoc, strings, textWidth, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`drones screen: нет текста ${key}`);
    return s;
  };
  const rowsOf = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const upRows = rowsOf(doc.upgrades);
  const capOf = rowsOf(dronesData.tables.upgrades).map((r) => r.cap);
  const reqOf = rowsOf(dronesData.tables.upgrades).map((r) => r.obeliskReq);
  const suitRows = rowsOf(doc.suits);
  const style = (id) => {
    const s = kitDoc.styles[id];
    if (!s) throw new Error(`drones screen: нет стиля кита ${id}`);
    return s;
  };
  const short = makeShortFormat(doc.format.short);
  const priceFmt = makeShortFormat({ ...doc.format.short, ...doc.exchange.priceFormat });
  const G = doc.disabledColor;
  const SH = doc.shadow;

  const clean = (o) => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };
  /** Лист шаблона со сдвигом (ox, oy) и привязками over; text-ключ → строка; shadow → копия с тенью перед листом. */
  function put(out, tpl, ox, oy, over = {}) {
    const o = { ...tpl, ...over };
    const shadow = o.shadow;
    delete o.id; delete o.shadow;
    o.x = ox + (over.x ?? tpl.x);
    o.y = oy + (over.y ?? tpl.y);
    if (o.text !== undefined) { o.value = T(o.text); delete o.text; }
    if (shadow) out.push(clean({ ...o, x: o.x + SH.dx, y: o.y + SH.dy, color: SH.color }));
    out.push(clean(o));
  }
  const byId = (parts) => Object.fromEntries(parts.map((p) => [p.id, p]));

  /** Заголовок раздела: две линии по краям текста, текст с тенью. */
  function header(out, key, y) {
    const h = doc.header;
    const text = T(key);
    const half = textWidth(h.font, text) / 2;
    const L = h.line;
    out.push({ component: 'line', x1: L.x1, y1: y, x2: h.x - half - L.gap, y2: y, w: L.w, color: L.color, alpha: L.alpha });
    out.push({ component: 'line', x1: h.x + half + L.gap, y1: y, x2: L.x2, y2: y, w: L.w, color: L.color, alpha: L.alpha });
    out.push({ component: 'text', font: h.font, x: h.x + SH.dx, y: y + SH.dy, value: text, halign: 'center', valign: 'middle', color: SH.color });
    out.push({ component: 'text', font: h.font, x: h.x, y, value: text, halign: 'center', valign: 'middle', color: h.color });
  }

  /** Обмен при множителе mult: { count, price } — X очков по правилу 5 ядра; Max — сколько по карману (при нуле — 1 очко за цену одного). */
  function exchangeOf(state, mult) {
    const x = doc.exchange.mult.counts[mult];
    if (x === null) {
      const m = drones.maxPoints(state.pointsBought, state.gold);
      return { count: Math.max(m.count, 1), price: m.price };
    }
    return { count: x, price: drones.pointsCost(state.pointsBought, x) };
  }

  function exchange(out, state, view, y0) {
    const E = doc.exchange;
    for (const p of E.parts) put(out, p, 0, y0);
    const M = E.mult;
    M.counts.forEach((n, i) => {
      const P = byId(M.parts);
      const label = M.labels[i] ? { text: M.labels[i] } : { value: n + M.suffix };
      put(out, P.button, M.x + i * M.step, y0, i === view.mult ? { sprite: M.selectedSprite } : {});
      put(out, P.label, M.x + i * M.step, y0, label);
    });
    const { count, price } = exchangeOf(state, view.mult);
    const can = state.gold >= price;
    const gray = can ? {} : { color: G };
    const B = byId(E.buy);
    put(out, B.button, 0, y0, gray);
    put(out, B.coin, 0, y0, gray);
    put(out, B.price, 0, y0, { value: priceFmt(price), ...gray });
    put(out, B.arrow, 0, y0, gray);
    put(out, B.point, 0, y0, gray);
    put(out, B.count, 0, y0, { value: T(E.countPrefix) + count, ...gray });
  }

  /** Текст эффекта строки «a > b»: база + шаг · уровень, с префиксом и знаком процента. */
  const effectAt = (r, L) => (r.effectPrefix ? T(r.effectPrefix) : '') + (r.effectBase + r.effectStep * L) + T('t.pct');
  const effect = (r, level) => effectAt(r, level) + doc.effectSep + effectAt(r, level + 1);

  function upgradeRow(out, state, r, y) {
    const P = byId(doc.upgradeRow);
    const L = state.upgrades[r.row];
    const cap = capOf[r.row];
    const maxed = L >= cap;
    put(out, P.backing, 0, y);
    put(out, P.desc, 0, y);
    put(out, P.icon, 0, y, { sprite: r.icon });
    if (maxed) {
      put(out, P.button, 0, y, { sprite: doc.maxedSprite });
      put(out, P.maxed, 0, y);
    } else {
      const cost = drones.upgradeCost(r.row, L);
      const gray = state.points >= cost ? {} : { color: G };
      put(out, P.button, 0, y, gray);
      put(out, P.price, 0, y, { value: short(cost), ...gray });
      put(out, P.point, 0, y, gray);
    }
    // строка без эффекта (Unlock Drone) — имя по центру ряда; на капе — только текущее значение эффекта и нет плашки уровня
    const hasEffect = r.effectBase !== null;
    put(out, P.name, 0, y, { text: r.name, ...(hasEffect ? {} : { y: doc.upgradeNameY.noEffect }) });
    if (hasEffect) put(out, P.effect, 0, y, { value: maxed ? effectAt(r, L) : effect(r, L) });
    const req = reqOf[r.row];
    const locked = state.obelisk < req;
    if (!maxed && !locked) {
      put(out, P.tagBacking, 0, y);
      put(out, P.tagDesc, 0, y);
      put(out, P.tag, 0, y, { value: L + doc.tagSep + cap });
    }
    // строка закрыта обелиском (порог строки из data/systems/drones.json): без плашки уровня, затемнение поверх ряда и текст порога
    if (locked) {
      const U = byId(doc.upgradeLock);
      put(out, U.backing, 0, y);
      put(out, U.desc, 0, y);
      put(out, U.text, 0, y, { value: T(doc.upgradeLockText[0]) + req + T(doc.upgradeLockText[1]) });
    }
  }

  const textOfParts = (parts) => parts.map((p) => (typeof p === 'number' ? String(p) : p.startsWith('t.') ? T(p) : p)).join('');
  const lockedRow = (out, y, text) => {
    const P = byId(doc.lockedRow);
    put(out, P.backing, 0, y);
    put(out, P.desc, 0, y);
    put(out, P.text, 0, y, { value: text });
  };

  function suitRow(out, state, s, y) {
    const P = byId(doc.suitRow);
    const locked = state.obelisk < s.obelisk;
    const gray = state.points >= s.price ? {} : { color: G };
    put(out, P.backing, 0, y);
    put(out, P.desc, 0, y);
    if (!locked) put(out, P.icon, 0, y, { sprite: s.icon });
    if (state.suits[s.suit] > 0) {   // куплен (6.21): зелёная кнопка «Maxed», как у строки улучшения на капе
      put(out, P.button, 0, y, { sprite: doc.maxedSprite });
      put(out, byId(doc.upgradeRow).maxed, 0, y);
    } else {
      put(out, P.button, 0, y, gray);
      put(out, P.price, 0, y, { value: short(s.price), ...gray });
      put(out, P.point, 0, y, gray);
    }
    put(out, P.name, 0, y, { text: s.name });
    put(out, P.text, 0, y, { value: textOfParts(s.text) });
    if (locked) lockedRow(out, y, T(doc.lockText) + s.obelisk);
  }

  /** y заголовков разделов от начала страницы (без прокрутки): первый — firstHeaderY, следующий — последний ряд + gapAfter. */
  function sectionHeaders() {
    const n = [upRows.length, suitRows.length, doc.suitUpgradeRows];
    const ys = [];
    let y = doc.firstHeaderY;
    doc.sections.forEach((s, i) => {
      ys.push(y);
      y = y + s.rowFirst + (n[i] - 1) * s.rowStep + s.gapAfter;
    });
    return ys;
  }
  const HEADERS = sectionHeaders();

  /** Цель прокрутки вкладки tab: заголовок её раздела встаёт на y = navigation.headerAt. */
  const tabTarget = (tab) => HEADERS[doc.topBar.tabs[tab].section] - doc.navigation.headerAt;
  /** Один кадр прокрутки к цели: s + (цель − s) · ease, прокрутка хранится в float32 (запись O d620-tab3n: кадр 21 = 2166.833984375). */
  const scrollStep = (s, target) => Math.fround(s + (target - s) * doc.navigation.ease);

  /** Ползунок: дорожка top…bottom, видимая высота view, предел прокрутки max; длина = дорожка · V / (V + max). Своя пара на каждой странице. */
  function thumbSpan(scroll, t = doc.thumb) {
    const L = t.bottom - t.top;
    const len = L * t.view / (t.view + t.max);
    const y1 = t.top + scroll * (L - len) / t.max;
    return [y1, y1 + len];
  }

  // ── страница Suits (гардероб, этап 6.21): сетка костюмов, подсветка надетого и его описание, «Capped!» без свободного слота ──
  const W = doc.wardrobe;
  /** Слоты дронов: всего — число дронов (уровень строки 0), занято — непустые слоты (значение слота = номер костюма + 1, 0 — пусто). */
  function slotsOf(state) {
    const total = state.upgrades[W.slots.countRow];
    const worn = (state.slots ?? []).slice(0, total).filter((x) => x > 0).map((x) => x - 1);
    return { total, worn, free: total - worn.length };
  }
  /** Описание костюма k при закрытой странице Fuel: текст костюма (descs) + части эффекта улучшения костюма + значение (база + шаг · уровень)
   *  + суффикс; false — у костюма строки эффекта нет (Midas, Frogger), null — не снято (??). */
  function suitDescription(k, level) {
    const e = W.effects[k];
    if (e === null || !W.descs[k]) throw new Error(`drones screen: описание костюма ${k} в гардеробе не снято (??)`);
    const text = textOfParts(W.descs[k]);
    if (e === false) return text;
    if (level > 0 && e.step === null) throw new Error(`drones screen: не поддерживается — шаг эффекта улучшения костюма ${k} не снят (??)`);
    return text + textOfParts(e.parts) + (e.base + (e.step ?? 0) * level) + e.suffix;
  }
  /** Число строк текста после переноса по ширине width (слова через пробел, жадно; как перенос текста кита). */
  function lineCount(font, text, width) {
    let n = 0;
    for (const ln of text.split('\n')) {
      let cur = '';
      n++;
      for (const word of ln.split(' ')) {
        const next = cur === '' ? word : cur + ' ' + word;
        if (cur !== '' && textWidth(font, next) > width) { n++; cur = word; } else cur = next;
      }
    }
    return n;
  }
  /** Таймер топлива м:сс (?? — в записях только 0). */
  const fuelTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const band = (out, b, y2) => out.push({ component: 'rect', x1: b.x1, y1: b.y1, x2: b.x2, y2, color: b.color });
  /** Полоса описания надетого костюма k: имя, значки, описание (текст костюма + эффект улучшения); с порога страницы Fuel — вместо
   *  правого значка таймер топлива, ниже описания — блок «Fuel Effect: (Inactive)» с эффектом топлива. Блоки растут вниз по числу строк. */
  function suitInfo(out, state, k, s) {
    const I = byId(W.info);
    const NL = W.infoLines;
    const F = W.fuelInfo;
    const P = byId(F.parts);
    const fuelOn = state.obelisk >= doc.bottomBar.pages[2].obelisk;
    const text = suitDescription(k, state.suitUpgrades?.[k] ?? 0);
    const extra = text.split('\n').length - 1;   // строк описания сверх одной: блок растёт вниз на lineStep, центр — на половину
    let fuelText = null, fuelExtra = 0;
    if (fuelOn) {
      const left = state.fuelLeft?.[k] ?? 0;
      if (left > 0) throw new Error('drones screen: активное топливо в гардеробе не снято (??)');
      if (!W.fuelEffects[k]) throw new Error(`drones screen: эффект топлива костюма ${k} не снят (??)`);
      fuelText = textOfParts(F.inactive) + textOfParts(W.fuelEffects[k]);
      fuelExtra = lineCount(P.fuel.font, fuelText, P.fuel.width) - F.baseLines;
    }
    band(out, I.band, fuelOn ? F.bandY2 + (extra + fuelExtra) * F.lineStep : I.band.y2 + extra * NL.lineStep);
    put(out, I.nameBacking, 0, 0);
    put(out, I.name, 0, 0, { text: s.name });
    put(out, I.iconLeft, 0, 0, { frame: k });
    if (fuelOn) {
      put(out, P.timerBacking, 0, 0);
      put(out, P.hourglass, 0, 0);
      put(out, P.fuelIcon, 0, 0);
      put(out, P.timer, 0, 0, { value: fuelTime(state.fuelLeft?.[k] ?? 0) });
    } else put(out, I.iconRight, 0, 0, { frame: k });
    const dy = extra * NL.lineStep / 2;
    put(out, I.descBacking, 0, dy, { sy: I.descBacking.sy + extra * NL.syPerLine });
    put(out, I.desc, 0, dy, { value: text });
    if (fuelOn) {
      const fy = extra * F.lineStep + fuelExtra * F.lineStep / 2;
      put(out, P.fuelBacking, 0, fy, { sy: P.fuelBacking.sy + fuelExtra * F.fuelBackingSyPerLine });
      put(out, P.fuel, 0, fy, { value: fuelText });
    }
  }

  function wardrobe(out, state, scroll) {
    const P = byId(W.parts);
    const { worn, free } = slotsOf(state);
    put(out, P.backing, 0, -scroll);
    suitRows.forEach((s, k) => {
      const x = W.grid.x + (k % W.grid.cols) * W.grid.dx;
      const y = W.grid.y + Math.floor(k / W.grid.cols) * W.grid.dy - scroll;
      const owned = state.suits[k] > 0;
      if (owned && worn.includes(k)) {
        const h = W.highlight;
        out.push({ component: 'rect', x1: x + h.dx1, y1: y + h.dy1, x2: x + h.dx2, y2: y + h.dy2, alpha: h.alpha });
        put(out, P.border, x, y);
        suitInfo(out, state, k, s);
        put(out, P.icon, x, y, { sprite: s.icon });
      } else if (owned) {
        put(out, P.icon, x, y, { sprite: s.icon, ...(free > 0 ? {} : { color: W.colors.dim }) });
        if (free <= 0) put(out, P.capped, x, y);
      } else {
        put(out, P.icon, x, y, { sprite: s.icon, color: state.obelisk >= s.obelisk ? W.colors.dim : W.colors.hidden });
        put(out, P.lock, x, y);
      }
    });
  }

  /** Листья экрана в порядке рисования O. Вид: page — нижняя страница (0 Upgrades, 1 Suits). */
  function leaves(state, view = {}) {
    const v = { scroll: 0, tab: 0, mult: 0, page: 0, ...view };
    const out = [];
    const p = style(doc.kitStyles.panel);
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y - v.scroll, sx: tx.scale, sy: tx.scale,
        color: tx.color, alpha: tx.alpha });
    if (v.page === 1) wardrobe(out, state, v.scroll);
    else upgradesPage(out, state, v);
    const PB = byId(doc.pointsBox);
    put(out, PB.backing, 0, 0);
    put(out, PB.desc, 0, 0);
    put(out, PB.count, 0, 0, { value: state.points });
    put(out, PB.icon, 0, 0);
    const th = style(doc.kitStyles.thumb);
    const [y1, y2] = thumbSpan(v.scroll, v.page === 1 ? W.thumb : doc.thumb);
    out.push({ component: 'rect', x1: th.x1, y1, x2: th.x2, y2, color: th.color, alpha: th.alpha });
    const BB = doc.bottomBar;
    for (const r of BB.rects) out.push({ ...r });
    const BP = byId(BB.parts);
    // страница открыта с порога обелиска (null — закрыта во всех записях мира 1); текущая и закрытые — серые, у закрытой — замок и «?????»
    BB.pages.forEach((pg0, i) => {
      const x = BB.x + i * BB.step;
      const locked = pg0.obelisk === null || state.obelisk < pg0.obelisk;
      const pg = locked ? BB.lockedPage : pg0;
      const dim = i === v.page || locked ? { color: G } : {};
      put(out, BP.button, x, 0, dim);
      put(out, BP.icon, x, 0, { sprite: pg.icon, ...dim });
      put(out, BP.desc, x, 0);
      put(out, BP.label, x, 0, { text: pg.label, ...(locked ? { color: G } : {}) });
    });
    const TB = doc.topBar;
    for (const r of TB.rects) out.push({ ...r });
    if (v.page === 1) {
      const { total, free } = slotsOf(state);
      put(out, W.slotsText, 0, 0, { value: T(W.slotsText.prefix) + free + W.slotsText.sep + total, prefix: undefined, sep: undefined });
    } else {
      const TP = byId(TB.parts);
      TB.tabs.forEach((t, i) => {
        put(out, TP.button, t.x, TB.y, { sx: t.sx, ...(i === v.tab ? { sprite: TB.selectedSprite } : {}) });
        put(out, TP.icon, t.iconX, TB.y, { sprite: t.icon });
        put(out, TP.label, t.textX, TB.y, { text: t.label });
      });
    }
    const MB = byId(TB.menu);
    put(out, MB.button, 0, 0);
    for (let k = 0; k < MB.bar.count; k++) {
      const b = MB.bar;
      out.push({ component: 'rect', x1: b.x1, y1: b.y1 + k * b.step, x2: b.x2, y2: b.y2 + k * b.step });
    }
    return out;
  }

  /** Тело страницы Upgrades (6.20): панель обмена и три раздела, всё со сдвигом −прокрутка. */
  function upgradesPage(out, state, v) {
    exchange(out, state, v, -v.scroll);
    const S = doc.sections;
    header(out, S[0].title, HEADERS[0] - v.scroll);
    upRows.forEach((r, i) => upgradeRow(out, state, r, HEADERS[0] - v.scroll + S[0].rowFirst + i * S[0].rowStep));
    header(out, S[1].title, HEADERS[1] - v.scroll);
    suitRows.forEach((s, i) => suitRow(out, state, s, HEADERS[1] - v.scroll + S[1].rowFirst + i * S[1].rowStep));
    header(out, S[2].title, HEADERS[2] - v.scroll);
    for (let i = 0; i < doc.suitUpgradeRows; i++) {
      const y = HEADERS[2] - v.scroll + S[2].rowFirst + i * S[2].rowStep;
      lockedRow(out, y, T(doc.suitUpgradeLockedText));
      if (state.suits[i] > 0) suitUpgradeRow(out, state, i, y);   // 6.21: ряд купленного костюма поверх заглушки
    }
  }

  // ── улучшение купленного костюма (6.21) ──
  const SU = doc.suitUpgrade;
  const suRows = SU.rows.map((r) => Object.fromEntries(SU.columns.map((c, i) => [c, r[i]])));
  /** Число в тексте эффекта: целое — без дробной части, иначе 2 знака (запись O: 30s > 28.50s). */
  const num2 = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2));
  function suitUpgradeRow(out, state, k, y) {
    const r = suRows.find((x) => x.suit === k);
    if (!r) throw new Error(`drones screen: улучшение костюма ${k} не снято (??)`);
    const L = state.suitUpgrades?.[k] ?? 0;
    if (L > 0) throw new Error('drones screen: не поддерживается — цена улучшения костюма при уровне > 0 не снята (??)');
    const P = byId(SU.parts);
    put(out, P.backing, 0, y);
    put(out, P.desc, 0, y);
    put(out, P.icon, 0, y, { sprite: suitRows[k].icon });
    put(out, P.tagDesc, 0, y);
    put(out, P.tag, 0, y, { value: L + doc.tagSep + SU.cap });
    const gray = state.points >= r.price ? {} : { color: G };
    put(out, P.button, 0, y, gray);
    put(out, P.point, 0, y, gray);
    put(out, P.price, 0, y, { value: short(r.price), ...gray });
    put(out, P.name, 0, y, { text: r.name });
    const a = r.base + r.step * L, b = r.base + r.step * (L + 1);
    put(out, P.effect, 0, y, { value: T(r.label) + num2(a) + r.unit + SU.effectSep + r.after + num2(b) + r.unit });
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}) {
    let skipped = 0;
    for (const l of leaves(state, view)) if (!drawLeaf(list, skin, l)) skipped++;
    return skipped;
  }

  /** Явная граница поддержки (раунд исправлений 6.21): уровень улучшения костюма > 0 не снят в O — шаг эффекта и рост цены ??.
   *  Возвращает причину или null; вызывающий (бот 7.x) проверяет её до leaves/build, а не ловит ошибку. */
  function unsupported(state) {
    const k = (state.suitUpgrades ?? []).findIndex((L) => L > 0);
    return k < 0 ? null : `не поддерживается: уровень улучшения костюма ${k} > 0 не снят в O (шаг эффекта и рост цены ??)`;
  }
  return { leaves, build, thumbSpan, tabTarget, scrollStep, exchangeOf, slotsOf, suitDescription, unsupported, sectionHeaders: () => HEADERS.slice() };
}
