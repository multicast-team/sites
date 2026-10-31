// Меню карт (этап 8.13): вёрстка data/ui/cards.json + привязки к состоянию игрока и к данным карт (data/systems/cards.json:
// наборы и их размеры; эффект ступеней — ядро core/cards.mjs).
//
// Экран не рисует записи O: он раскладывает наборы карт сеткой по 9 в ряд, подбирает рубашку по ступени карты (нет / обычная /
// золочёная / полихром / ад), затемняет неоткрытые, кладёт пульс ада поверх адских, отмечает выбранную карту, двигает список
// прокруткой (ряды выше полосы не рисуются, но место занимают; ряды ниже отсечки не рисуются и места не занимают),
// затем рисует панель выбранной карты (имя, бонусы обычной и золочёной ступени, кнопка Gild), нижние вкладки и верхнюю полосу.
//
// Состояние: { levels — { набор: [ступень 0…4 по номеру карты] } }.
// Касание неоткрытой карты выбора не даёт: ни выделения, ни панели (П, запись c813-sel0).
// Вид: { top — верхний край меню (px), scroll — прокрутка списка вверх (px), thumb — [y1, y2] ползунка (вход из кадра O, ??),
//   pulse — альфа пульса адских карт (вход анимации, ??), sel — { set, index } выбранная карта или null, armed — Gild взведена,
//   confirm — окно подтверждения Gild { armed — «Gild!» взведена } или null, info — справка (i) открыта, options — меню ☰ открыто,
//   known — { fish: с какого номера рыба показана знаком вопроса } (вход, ??) }.
// 8.13b: состояние также { shards — { набор: [осколки] }, wallet — { gold, pp, gems }, options — { hideUnowned, hideMaxed } }.
import { drawLeaf } from '../kit/table.mjs';
import { drawSpritePart, fillRoundRect, rgbOf } from '../kit/prims.mjs';
import { formatReal } from '../../core/num/real.mjs';
import { makeShortFormat } from '../format/number.mjs';

const f = Math.fround;

/**
 * @param {object} doc   data/ui/cards.json
 * @param {object} deps  { cards: data/systems/cards.json, core: makeCards(cards) (core/cards.mjs), strings: data/strings.json → .strings,
 *                         textWidth(fontKey, text) кита, skin }
 */
export function makeCardsScreen(doc, { cards, core, strings, textWidth, skin, format }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`cards screen: нет текста ${key}`);
    return s;
  };
  const rowsOf = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const sizeOf = new Map(rowsOf(cards.tables.sets).map((r) => [r.set, r.size]));
  const G = doc.grid;
  const levelOf = (state, set, i) => state.levels?.[set]?.[i] ?? 0;
  const owned = (state, set) => (state.levels?.[set] ?? []).some((v) => v > 0);
  /** Набор показан: у misc — только если открыта хотя бы одна карта (??: по записям 1.29 и 8.13), остальные — всегда. */
  const shown = (state, s) => s.set !== 'misc' || owned(state, 'misc');
  const short = format ? makeShortFormat(format) : null;
  /** Карты набора в порядке показа: номера карт; unowned 'hide' — неоткрытые не показываются (П: c813-d3, сейв every). */
  const cardsOf = (state, s) => {
    const n = sizeOf.get(s.set);
    const all = s.order ? s.order : Array.from({ length: n }, (_, k) => k);
    return s.unowned === 'hide' ? all.filter((i) => levelOf(state, s.set, i) > 0) : all;
  };
  /** Значок карты: [спрайт, кадр] — знак вопроса у неоткрытых наборов 'question' и у неизвестных рыб (вход view.known, ??). */
  const iconOf = (s, i, lv, view) => {
    const q = (s.unowned === 'question' && lv === 0) || (s.unknownFrom && i >= (view.known?.[s.set] ?? Infinity));
    return [q ? G.question : s.sprite, i];   // у знака вопроса кадр = номер карты (П); рисуется по модулю числа кадров (build)
  };
  const shardsOf = (state, set, i) => state.shards?.[set]?.[i] ?? 0;

  function grid(out, state, view, hits = null) {
    const top = view.top;
    let y = top + doc.header.dyFirst - (view.scroll ?? 0);
    const sel = view.sel;
    const H = doc.header;
    for (const s of doc.sets) {
      if (!shown(state, s)) continue;
      out.push({ component: 'sprite', sprite: H.sprite, x: H.x, y, sx: H.sx, sy: H.sy });
      out.push({ component: 'text', font: H.font, x: H.textX + 1, y: y + 1, value: T(s.title), halign: 'center', valign: 'middle', color: H.shadow });
      out.push({ component: 'text', font: H.font, x: H.textX, y, value: T(s.title), halign: 'center', valign: 'middle' });
      let ry = y + G.firstRow;
      if (ry >= G.cutBelow) { y += G.emptySection; continue; }
      const list = cardsOf(state, s);
      const n = list.length;
      const rows = Math.ceil(n / G.cols);
      for (let r = 0; r < rows && ry < G.cutBelow; r++, ry += G.dy) {
        if (ry < G.drawFrom) {
          // ряд выше полосы не рисуется, но выделение выбранной карты в нём O рисует (П: c813-d4, рубашка кадр 3 на y = −1085)
          for (let c = 0; c < G.cols && r * G.cols + c < n; c++) {
            const i = list[r * G.cols + c];
            if (hits) hits.push({ set: s.set, index: i, x: G.x0 + c * G.dx, y: ry });
            if (sel && sel.set === s.set && sel.index === i && levelOf(state, s.set, i) > 0) {
              out.push({ component: 'sprite', sprite: G.backing, frame: G.selectedFrame, x: G.x0 + c * G.dx, y: ry, sx: G.scale, sy: G.scale });
            }
          }
          continue;
        }
        for (let c = 0; c < G.cols; c++) {
          const k = r * G.cols + c;
          if (k >= n) break;
          const i = list[k];   // порядок показа набора (bomb: 11 и 12 переставлены, arch, misc — кадры значков O)
          if (!s.sprite) throw new Error(`cards screen: нет значка набора ${s.set} (??: не снят с O)`);
          if (hits) hits.push({ set: s.set, index: i, x: G.x0 + c * G.dx, y: ry });
          card(out, s, i, levelOf(state, s.set, i), G.x0 + c * G.dx, ry, view, sel && sel.set === s.set && sel.index === i, shardsOf(state, s.set, i));
        }
      }
      y = ry + G.afterRows;
    }
  }

  function card(out, s, i, lv, x, y, view, selected, shards = 0) {
    const sc = G.scale;
    const [ik, fi] = iconOf(s, i, lv, view);
    if (selected && lv > 0) out.push({ component: 'sprite', sprite: G.backing, frame: G.selectedFrame, x, y, sx: sc, sy: sc });
    if (lv === 0) {
      out.push({ component: 'sprite', sprite: G.backing, x, y, sx: sc, sy: sc, color: G.unowned.backing, alpha: G.unowned.alpha });
      out.push({ component: 'sprite', sprite: ik, frame: fi, x, y, sx: sc, sy: sc, color: G.unowned.icon, alpha: G.unowned.alpha });
      return;
    }
    // золочёная карта с полным запасом осколков полихрома: рубашка кадр shard.frame и полоска запаса под картой (П: c813-shard; ?? — неполный запас)
    const ready = lv === 2 && G.shard && shards >= G.shard.need;
    const fr = ready ? G.shard.frame : G.frameOfLevel[lv];
    out.push({ component: 'sprite', sprite: G.backing, frame: fr, x, y, sx: sc, sy: sc });
    if (lv === 4) out.push({ component: 'sprite', sprite: G.backing, frame: fr, x, y, sx: sc, sy: sc, color: G.infernal.color, alpha: view.pulse * G.infernal.backingK });
    out.push({ component: 'sprite', sprite: ik, frame: fi, x, y, sx: sc, sy: sc });
    if (lv === 4) out.push({ component: 'sprite', sprite: ik, frame: fi, x, y, sx: sc, sy: sc, color: G.infernal.color, alpha: view.pulse });
    if (ready) {
      const b = G.shard.bar;
      out.push({ component: 'part', sprite: b.sprite, frame: 0, left: b.left, top: b.top, w: b.w, h: b.h, x: x + b.dx, y: y + b.dy, sx: b.scale, sy: b.scale, angle: 0, color: '#ffffff', alpha: 1 });
    }
  }

  const rect = (out, [x1, y1, x2, y2, color], dy = 0) => out.push({ component: 'rect', x1, y1: y1 + dy, x2, y2: y2 + dy, color });

  function panel(out, state, view) {
    const P = doc.panel, top = view.top;
    for (const r of P.rects) rect(out, r, top);
    const sel = view.sel;
    if (!sel) return;
    const lv = levelOf(state, sel.set, sel.index);
    if (lv === 0) return;
    const s = doc.sets.find((x) => x.set === sel.set);
    const N = P.name, B = P.bonus;
    if (!N.suffix[sel.set] || !B.line[sel.set] || !N.names[sel.set]) throw new Error(`cards screen: панель набора ${sel.set} не снята с O (??)`);
    const key = N.names[sel.set]?.[sel.index];
    if (!key) throw new Error(`cards screen: нет имени карты ${sel.set} ${sel.index} (??)`);
    const base = T(key);
    const name = T(N.prefix[lv]) + base + N.suffix[sel.set];
    const ny = top + N.dy;
    out.push({ component: 'sprite', sprite: N.patch, x: N.x, y: ny, sx: f((textWidth(N.font, name) + N.padW) / N.divW), sy: N.sy });
    out.push({ component: 'text', font: N.font, x: N.textX, y: ny, value: name, valign: 'middle' });
    const lines = B.rows.map((r) => '\n' + B.line[sel.set].replace('{name}', base).replace('{v}', formatReal(core.effect(sel.set, sel.index, r.level))));
    B.rows.forEach((r, k) => out.push({ component: 'sprite', sprite: B.patch, x: B.x, y: top + r.dy, sx: f(textWidth(B.font, lines[k]) / B.divW), sy: B.sy }));
    B.rows.forEach((r, k) => {
      const on = lv >= r.level;
      out.push({ component: 'text', font: B.font, x: B.textX, y: top + r.dy, value: lines[k], valign: 'middle', color: on ? undefined : B.off });
      out.push({ component: 'text', font: B.font, x: B.textX, y: top + r.dy, value: T(r.label), valign: 'middle', color: on ? r.on : B.off });
    });
    card(out, s, sel.index, lv, P.card.x, top + P.card.dy, view, false, shardsOf(state, sel.set, sel.index));
    if (lv === 1) {
      const g = P.gild;
      out.push({ component: 'sprite', sprite: g.sprite, frame: view.armed || view.confirm ? 1 : 0, x: g.x, y: top + g.dy, sx: g.sx, sy: g.sy });
      out.push({ component: 'text', font: g.font, x: g.x, y: top + g.textDy, value: T(g.text), halign: 'center', valign: 'middle' });
    }
  }

  /** Карта, нарисованная в точке привязки (x, y) сетки, или null: { set, index } (касание карты и разбор кадров). */
  function cardAt(state, view, x, y) {
    const hits = [];
    grid([], state, { ...view, sel: null }, hits);
    const h = hits.find((c) => c.x === x && c.y === y);
    return h ? { set: h.set, index: h.index } : null;
  }

  /** Имя карты без приставки ступени и строки бонуса ступеней 1 и 2 (панель, окно Gild, card_fanfare). */
  function cardText(sel) {
    const N = doc.panel.name, B = doc.panel.bonus;
    const base = T(N.names[sel.set][sel.index]);
    const line = (lv) => B.line[sel.set].replace('{name}', base).replace('{v}', formatReal(core.effect(sel.set, sel.index, lv)));
    return { base, name: base + N.suffix[sel.set], before: line(1), after: line(2) };
  }

  /** Вход card_fanfare (spec card-fanfare, «Входы»): рубашка и значок новой ступени, имя, строки до/после. */
  function fanfareInput(sel, lv = 2, view = {}) {
    const s = doc.sets.find((x) => x.set === sel.set);
    const [icon, iconFrame] = iconOf(s, sel.index, lv, view);
    const t = cardText(sel);
    return { card: { backing: G.backing, backingFrame: G.frameOfLevel[lv], icon, iconFrame }, name: t.name, before: t.before, after: t.after };
  }

  /** Окно подтверждения Gild (П: c813-arm, c813-arm2): рисуется после сетки, до панели. Флажок цены — хватает ли средств (??: по c813-arm). */
  function confirm(out, state, view) {
    const C = doc.confirm, sel = view.sel;
    if (!view.confirm || !sel || !C) return;
    const sp = (o, extra = {}) => out.push({ component: 'sprite', sprite: o.sprite, x: o.x, y: o.y, sx: o.sx, sy: o.sy, ...extra });
    sp(C.shade, { color: C.shade.color, alpha: C.shade.alpha });
    sp(C.back);
    sp(C.title);
    const lv = levelOf(state, sel.set, sel.index);
    const t = cardText(sel);
    out.push({ component: 'text', font: C.title.font, x: C.title.x, y: C.title.y, value: T(C.title.head) + T(doc.panel.name.prefix[lv]) + t.name + T(C.title.tail), halign: 'center', valign: 'middle' });
    const s = doc.sets.find((x) => x.set === sel.set);
    const [ik, fi] = iconOf(s, sel.index, lv, view);
    out.push({ component: 'sprite', sprite: G.backing, frame: G.frameOfLevel[lv], x: C.card.x, y: C.card.y, sx: C.card.scale, sy: C.card.scale });
    out.push({ component: 'sprite', sprite: ik, frame: fi, x: C.card.x, y: C.card.y, sx: C.card.scale, sy: C.card.scale });
    sp(C.cost);
    out.push({ component: 'text', font: C.cost.font, x: C.cost.x, y: C.cost.y, value: T(C.cost.text), halign: 'center', valign: 'middle' });
    const cost = core.gildCost(sel.set, sel.index);
    const have = [state.wallet?.gold ?? 0, state.wallet?.pp ?? 0, state.wallet?.gems ?? 0];
    const R = C.row;
    C.rows.forEach((r, j) => {
      out.push({ component: 'sprite', sprite: R.patch, x: R.patchX, y: r.y, sx: R.sx, sy: R.sy });
      out.push({ component: 'sprite', sprite: R.check, frame: have[j] >= cost[j] ? 1 : 0, x: R.checkX, y: r.checkY, sx: R.checkScale, sy: R.checkScale });
      out.push({ component: 'text', font: R.font, x: R.textX, y: r.y, value: short(cost[j]) + T(r.unit), valign: 'middle' });
      out.push({ component: 'sprite', sprite: r.icon, x: R.iconX, y: r.y, sx: R.iconScale, sy: R.iconScale });
    });
    const b = C.button;
    out.push({ component: 'sprite', sprite: b.sprite, frame: view.confirm.armed ? 1 : 0, x: b.x, y: b.y, sx: b.sx, sy: b.sy });
    out.push({ component: 'text', font: b.font, x: b.x, y: b.y + b.textDy, value: T(b.text), halign: 'center', valign: 'middle' });
  }

  /** Число строк текста с переносом по словам на ширину width (как draw_text_ext: перенос по пробелам, «\n» — новая строка). */
  function lineCount(fontKey, text, width) {
    let n = 0;
    for (const ln of String(text).split('\n')) {
      let cur = '';
      n++;
      for (const w of ln.split(' ')) {
        const next = cur === '' ? w : cur + ' ' + w;
        if (cur !== '' && textWidth(fontKey, next) > width) { n++; cur = w; } else cur = next;
      }
    }
    return n;
  }

  /** Справка (i) (П: c813-info): после вкладок, до верхней полосы. Разделы «Polychrome Cards» и «Infernal Cards» не показаны (??: условие). */
  function info(out) {
    const I = doc.info, B = I.box;
    for (const [x1, y1, x2, y2, color, alpha] of I.rects) out.push({ component: 'rect', x1, y1, x2, y2, color, alpha });
    const h = I.head;
    out.push({ component: 'text', font: h.font, x: h.x, y: h.y, value: T(h.text), halign: 'center', valign: 'middle', color: h.color });
    out.push({ component: 'sprite', sprite: h.icon, x: h.iconL[0], y: h.y, sx: h.iconL[1], sy: h.iconScale });
    out.push({ component: 'sprite', sprite: h.icon, x: h.iconR[0], y: h.y, sx: h.iconR[1], sy: h.iconScale });
    let top = B.top0;
    for (const bx of I.boxes) {
      const body = bx.body ? T(bx.body) : bx.lines.map(([a, b]) => T(a) + T(bx.join) + T(b)).concat([T(bx.last)]).join('\n');
      const bottom = top + B.bodyDy + lineCount(B.bodyFont, body, B.width) * B.sep + B.pad;
      out.push({ component: 'rect', x1: B.x1, y1: top, x2: B.x2, y2: bottom, color: B.color, alpha: B.alpha });
      out.push({ component: 'sprite', sprite: bx.icon, x: B.iconX, y: (top + bottom) / 2, sx: B.iconScale, sy: B.iconScale });
      out.push({ component: 'text', font: B.titleFont, x: B.textX, y: top + B.titleDy, value: T(bx.title), color: B.titleColor });
      out.push({ component: 'text', font: B.bodyFont, x: B.textX, y: top + B.bodyDy, value: body, sep: B.sep, width: B.width });
      top = bottom + B.gap;
    }
    const f = I.foot;
    out.push({ component: 'text', font: f.font, x: f.x, y: f.y, value: T(f.text), halign: 'center', valign: 'middle', color: f.color });
  }

  /** Меню ☰ (П: c813-opt): внутри верхней полосы, после значка ☰. Флажки — опции состояния. Рамка — режим линий (кит не рисует, ??). */
  function options(out, state) {
    const O = doc.options, [x1, y1, x2, y2, xr, yr] = O.box;
    out.push({ component: 'roundrect', x1, y1, x2, y2, xrad: xr, yrad: yr, color: O.fill.color, alpha: O.fill.alpha });
    out.push({ component: 'roundrect', x1, y1, x2, y2, xrad: xr, yrad: yr, outline: true, color: O.frame, alpha: 1 });
    const t = O.title;
    out.push({ component: 'text', font: t.font, x: t.x, y: t.y, value: T(t.text), valign: 'middle', color: t.color });
    const R = O.row;
    for (const r of O.rows) {
      out.push({ component: 'sprite', sprite: R.check, frame: state.options?.[r.key] ? 1 : 0, x: R.checkX, y: r.y, sx: R.checkScale, sy: R.checkScale });
      out.push({ component: 'text', font: R.font, x: R.textX + 1, y: r.y + 1, value: T(r.text), valign: 'middle', color: R.shadow });
      out.push({ component: 'text', font: R.font, x: R.textX, y: r.y, value: T(r.text), valign: 'middle' });
    }
  }

  function tabs(out) {
    const t = doc.tabs;
    for (const r of t.rects) rect(out, r);
    for (const it of t.items) {
      out.push({ component: 'sprite', sprite: t.button, x: it.x, y: t.y, sx: 2, sy: 2, color: t.tint });
      out.push({ component: 'sprite', sprite: it.icon, x: it.x, y: t.iconY, sx: 2, sy: 2, color: t.tint });
      out.push({ component: 'sprite', sprite: t.desc, x: it.x, y: t.labelY, sx: t.descSx, sy: t.descSy });
      out.push({ component: 'text', font: t.font, x: it.x, y: t.labelY, value: T(it.label), halign: 'center', valign: 'middle', color: it.locked ? t.tint : undefined });
    }
  }

  function topbar(out, state, view) {
    const b = doc.topbar, top = view.top;
    for (const r of b.rects) rect(out, r, top);
    out.push({ component: 'sprite', sprite: view.options ? doc.options.button : b.button, x: b.menuX, y: top + b.dy, sx: b.bsx, sy: b.bsy });
    for (const [x1, y1, x2, y2] of b.burger) out.push({ component: 'rect', x1, y1: top + y1, x2, y2: top + y2 });
    if (view.options) options(out, state);
    out.push({ component: 'sprite', sprite: view.info ? doc.info.button : b.button, x: b.infoX, y: top + b.dy, sx: b.bsx, sy: b.bsy });
    out.push({ component: 'sprite', sprite: b.info, x: b.infoX, y: top + b.infoDy });
  }

  /** Листья экрана в порядке рисования O. */
  function leaves(state, view = {}) {
    const out = [];
    const [x1, y1, x2, y2] = doc.backdrop.rect;
    out.push({ component: 'rect', x1, y1, x2, y2, color: doc.backdrop.color, alpha: doc.backdrop.alpha });
    const nz = doc.noise;
    for (let k = 0; k < nz.count; k++) out.push({ component: 'sprite', sprite: nz.sprite, x: nz.x, y: nz.y0 + k * nz.step - (view.scroll ?? 0), sx: nz.scale, sy: nz.scale, alpha: nz.alpha });
    const sb = doc.scrollbar;
    out.push({ component: 'rect', x1: sb.x1, y1: view.thumb[0], x2: sb.x2, y2: view.thumb[1], color: sb.color, alpha: sb.alpha });
    grid(out, state, view);
    confirm(out, state, view);
    panel(out, state, view);
    tabs(out);
    if (view.info) info(out);
    topbar(out, state, view);
    for (const o of out) for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return out;
  }

  function build(list, state, view = {}, only = null) {
    let skipped = 0;
    for (const l of only ?? leaves(state, view)) {
      if (l.component === 'part') { drawSpritePart(list, skin, l.sprite, l.frame, l.left, l.top, l.w, l.h, l.x, l.y, l.sx, l.sy, l.angle, rgbOf(l.color), l.alpha); continue; }
      if (l.component === 'roundrect') {
        if (l.outline) skipped++;   // рамка — режим линий: кит не рисует (как challenges 8.3)
        else fillRoundRect(list, l.x1, l.y1, l.x2, l.y2, l.xrad, l.yrad, rgbOf(l.color), l.alpha);
        continue;
      }
      if (l.component === 'sprite' && l.frame) {   // кадр за пределами спрайта — по модулю числа кадров (как у O: знак вопроса, кадр = номер карты)
        const n = skin.sprite(l.sprite).frames.length;
        if (l.frame >= n) { if (!drawLeaf(list, skin, { ...l, frame: l.frame % n })) skipped++; continue; }
      }
      if (!drawLeaf(list, skin, l)) skipped++;
    }
    return skipped;
  }

  return { leaves, build, fanfareInput, cardText, cardAt };
}
