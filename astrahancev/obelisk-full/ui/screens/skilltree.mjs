// Экран дерева навыков (этап 6.22): вёрстка data/ui/skilltree.json из компонентов кита + данные узлов
// (data/systems/skilltree.json: позиция, родитель, кап, особый, требование обелиска, ключи заголовка и описания) + ядро
// core/skilltree.mjs (цена, доступность, замок, можно ли купить).
//
// Экран не рисует записи O: он строит листья по узлам (линия к родителю, слот по состоянию, значок, замок с цифрами требования),
// панель описания выбранного узла, правую панель очков и битов, ползунок и полосу подсказки, и рисует их рисовальщиком кита.
//
// Состояние: { levels[70], skillPoints, skillBits, obelisk, counters? } — из сейва/ядра; counters — счётчики других систем для описаний
//   (relicChests, bombCritChance, rainbowFloorMulti, polyCardMulti, fishCards, legendaryFish, goldenFrogs).
// Вид: { scroll — прокрутка дерева вверх, px (≥ 0); selected — выбранный узел (0 по умолчанию); armed — кнопка покупки взведена;
//   bob — сдвиг узлов по y, px: число или массив по узлам (покачивание открытых узлов; правило не снято, ??) }.
//
// Этап 6.23 (spec skilltree-desc): панель описания выбранного узла — «Lvl: L/кап» у узлов с капом больше 1; запертый узел — заголовок
// «??????????» и «Unlocked at Obelisk Level N» без значков и кнопки; описания узлов без готового текста собираются из кусков STRG
// и чисел (уровень × P или счётчик другой системы из state.counters); прокрутка открытия меню — openScroll(levels).
import { drawLeaf } from '../kit/table.mjs';
import { formatReal, formatFixed } from '../../core/num/real.mjs';

/**
 * @param {object} doc   data/ui/skilltree.json
 * @param {object} deps  { tree: data/systems/skilltree.json, core: makeSkillTree(tree), kitDoc: data/ui/kit.json (палитра разрешена),
 *                         strings: data/strings.json → .strings, skin }
 */
export function makeSkillTreeScreen(doc, { tree, core, kitDoc, strings, skin }) {
  const T = (key) => {
    const s = strings[key] ?? doc.texts?.[key];
    if (typeof s !== 'string') throw new Error(`skilltree screen: нет текста ${key}`);
    return s;
  };
  const t = tree.tables.nodes;
  const nodes = t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const slotOf = (n) => (n.special ? tree.constants['slot.special'] : tree.constants['slot.normal']);
  const style = (id) => {
    const s = kitDoc.styles[id];
    if (!s) throw new Error(`skilltree screen: нет стиля кита ${id}`);
    return s;
  };
  const tpl = (o, over = {}) => {
    const x = { ...o, ...over };
    delete x.id;
    if (x.text !== undefined) { x.value = T(x.text); delete x.text; }
    for (const k of Object.keys(x)) if (x[k] === undefined) delete x[k];
    return x;
  };

  /** Тон линии и узла: доступность (0…3) + уровень узла; 0 — тёмный, 1 — серый, 2 и больше — белый (??: проверены 0…4). */
  const tone = (i, levels) => Math.min(core.available(i, levels) + levels[i], doc.line.tone.length - 1);
  const bobOf = (bob, i) => (Array.isArray(bob) ? bob[i] ?? 0 : bob ?? 0);

  /** Ползунок: длина = дорожка · V / (V + предел), верх = начало дорожки + scroll · (дорожка − длина) / предел. */
  function thumbSpan(scroll) {
    const th = doc.thumb;
    const L = th.bottom - th.top;
    const len = L * th.view / (th.view + th.maxScroll);
    const y1 = th.top + scroll * (L - len) / th.maxScroll;
    return [y1, y1 + len];
  }

  function nodeLeaves(out, state, i, y, selected) {
    const n = nodes[i], N = doc.node, s = N.scale;
    const slot = slotOf(n);
    const lvl = state.levels[i];
    const av = core.available(i, state.levels);
    const st = lvl > 0 ? 2 : av > 0 ? 1 : 0;   // кадр слота: 0 — недоступен, 1 — доступен, 2 — куплен
    if (core.locked(i, state.obelisk)) {   // заперт обелиском: слот кадра состояния и замок серым, цифры требования, без значка
      const L = N.lock;
      out.push({ component: 'sprite', sprite: slot, ...(st ? { frame: st } : {}), x: n.x, y, sx: s, sy: s, color: L.color });
      // выбранный запертый узел: слот кадра выделения запертого (6.23) между слотом и замком
      if (i === selected) out.push({ component: 'sprite', sprite: slot, frame: L.selectedFrame, x: n.x, y, sx: s, sy: s });
      out.push({ component: 'sprite', sprite: slot, frame: L.frame, x: n.x, y, sx: s, sy: s, color: L.color });
      const digits = String(n.obeliskReq).padStart(L.dx.length, '0');   // требования узлов 17…72 — две цифры
      const dy = n.special ? L.dy.special : L.dy.normal;
      [...digits].forEach((d, k) => out.push({ component: 'sprite', sprite: L.digits, frame: Number(d), x: n.x + L.dx[k], y: y + dy, sx: s, sy: s }));
      return;
    }
    out.push({ component: 'sprite', sprite: slot, frame: st, x: n.x, y, sx: s, sy: s });
    if (i === selected) out.push({ component: 'sprite', sprite: slot, frame: N.selectedFrame, x: n.x, y, sx: s, sy: s });
    if (n.cap > 1) {
      out.push({ component: 'sprite', sprite: N.multi, frame: st, x: n.x, y, sx: s, sy: s });
      if (lvl > 0) out.push({ component: 'sprite', sprite: N.multi, frame: N.levelFrame + lvl, x: n.x, y, sx: s, sy: s });
      // выбранный узел с капом больше 1: рамка мульти-узла кадра multiSelectedFrom + кадр слота (6.23: 4 — доступен, 5 — куплен;
      // недоступный выбранный мульти-узел не наблюдался, ??)
      if (i === selected) out.push({ component: 'sprite', sprite: N.multi, frame: N.multiSelectedFrom + st, x: n.x, y, sx: s, sy: s });
    }
    out.push({ component: 'sprite', sprite: N.icon, frame: i, x: n.x, y, sx: s, sy: s, ...(st === 0 ? { color: N.disabledColor } : {}) });
  }

  /** Число куска описания: уровень, кап, требование обелиска или счётчик; × k, у счётчика с div — целая часть x / div. */
  function partNumber(p, ctx) {
    const x = ctx[p.n];
    if (typeof x !== 'number') throw new Error(`skilltree screen: нет числа ${p.n}`);
    const base = p.div ? Math.floor(x / p.div) : x;
    const v = p.k === undefined ? base : p.k * base;
    return p.fmt === undefined ? formatReal(v) : formatFixed(v, p.fmt);
  }
  const compose = (parts, ctx) => parts.map((p) => (typeof p === 'string' ? T(p) : partNumber(p, ctx))).join('');

  /** Текст описания узла: готовый текст, собранный из кусков (descs) или пустой (описание не снято, ??). */
  function descText(i, state) {
    const n = nodes[i];
    if (n.text) return T(n.text);
    const parts = doc.descs?.[String(i)];
    if (!parts) return '';
    return compose(parts, { ...(state.counters || {}), level: state.levels[i], cap: n.cap, req: n.obeliskReq });
  }

  function descLeaves(out, state, sel, armed) {
    const D = doc.desc, n = nodes[sel];
    out.push(tpl(D.backing), tpl(D.box));
    const locked = core.locked(sel, state.obelisk);
    if (!locked) for (const ic of D.icons) out.push(tpl(ic, { frame: sel }));
    const ti = D.title;
    const title = T(locked ? D.locked.title : n.title ?? doc.titles[String(sel)]);
    for (const [dx, dy] of ti.outline)
      out.push({ component: 'text', font: ti.font, x: ti.x + dx, y: ti.y + dy, value: title, halign: 'center', valign: 'middle', color: ti.outlineColor });
    out.push({ component: 'text', font: ti.font, x: ti.x, y: ti.y, value: title, halign: 'center', valign: 'middle', color: ti.color });
    if (locked) {   // запертый узел: только «Unlocked at Obelisk Level N»
      out.push(tpl(D.text, { value: compose(D.locked.parts, { req: n.obeliskReq }) }));
      return;
    }
    out.push(tpl(D.text, { value: descText(sel, state) }));
    const lvl = state.levels[sel];
    const levelLeaves = () => {
      if (n.cap <= 1) return;
      const L = D.level;
      out.push(tpl(L.box), tpl(L.label, { value: compose(L.parts, { level: lvl, cap: n.cap }) }));
    };
    if (lvl >= n.cap) {
      out.push(tpl(D.button));
      levelLeaves();
      out.push(tpl(D.maxed.button), tpl(D.maxed.shadow), tpl(D.maxed.label));
      return;
    }
    if (core.available(sel, state.levels) === 0) {   // родитель не куплен: только тёмная кнопка, без значка и цены
      out.push(tpl(D.button, { color: D.unavailableColor }));
      levelLeaves();   // ?? (не наблюдалось: недоступный узел с капом больше 1)
      return;
    }
    const can = core.canBuy(sel, state);
    const gray = can ? {} : { color: D.disabledColor };
    out.push(tpl(D.button, { ...(armed && can ? { frame: D.armedFrame } : {}), ...gray }));
    out.push(tpl(D.point, gray));
    out.push(tpl(D.cost, { value: String(core.cost(sel, lvl, state.obelisk)), ...gray }));
    levelLeaves();
  }

  /** Прокрутка при открытии меню: y самого нижнего купленного узла − below, в пределах [0, предел ползунка]; ничего не куплено — 0. */
  function openScroll(levels) {
    let m = -Infinity;
    nodes.forEach((n, i) => { if (levels[i] > 0 && n.y > m) m = n.y; });
    return Math.min(Math.max(m - doc.openScroll.below, 0), doc.thumb.maxScroll);
  }

  function sideLeaves(out, state) {
    const S = doc.side;
    for (const h of S.head) out.push(tpl(h));
    for (const r of S.rows) {
      for (const c of S.row) {
        const o = tpl(c, { y: c.y + r.y });
        if (c.id === 'label') { o.value = T(r.label); }
        // число до порога — числом (как у O: draw_text вещественного), с порога — текстом (??: порог в (50, 98765], правило не снято)
        if (c.id === 'value') o.value = state[r.value] >= S.textFrom ? String(state[r.value]) : state[r.value];
        if (c.id === 'icon') o.sprite = r.icon;
        out.push(o);
      }
    }
  }

  /** Листья экрана в порядке рисования O. */
  function leaves(state, view = {}) {
    const scroll = view.scroll ?? 0, sel = view.selected ?? 0;
    const out = [];
    const p = style(doc.kitStyles.panel);
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y - scroll * doc.noiseScroll, sx: tx.scale, sy: tx.scale,
        color: tx.color, alpha: tx.alpha });
    const sp = doc.space;
    for (const x of sp.xs)
      for (let k = 0; k < sp.count; k++)
        out.push({ component: 'sprite', sprite: sp.sprite, frame: sp.frame, x, y: sp.y + k * sp.step - scroll * sp.scroll, sx: sp.scale, sy: sp.scale, color: sp.color });
    // линии узлов к родителю: вертикаль (x, y) → (x, y родителя), горизонталь → (x родителя, y родителя); сначала подложка, затем тон
    const Ln = doc.line;
    nodes.forEach((n, i) => {
      const p0 = nodes[n.root ? i : n.parent];
      const seg = [[n.x, n.y - scroll, n.x, p0.y - scroll], [n.x, p0.y - scroll, p0.x, p0.y - scroll]];
      Ln.under.forEach((u, k) => out.push({ component: 'line', x1: seg[k][0], y1: seg[k][1], x2: seg[k][2], y2: seg[k][3], w: u.w, color: u.color, alpha: Ln.alpha }));
      const color = Ln.tone[tone(i, state.levels)];
      for (const s of seg) out.push({ component: 'line', x1: s[0], y1: s[1], x2: s[2], y2: s[3], w: Ln.w, color, alpha: Ln.alpha });
    });
    nodes.forEach((n, i) => {
      const dy = core.locked(i, state.obelisk) ? 0 : bobOf(view.bob, i);   // запертые узлы не качаются
      nodeLeaves(out, state, i, n.y - scroll + dy, sel);
    });
    descLeaves(out, state, sel, !!view.armed);
    sideLeaves(out, state);
    const th = style(doc.kitStyles.thumb);
    const [y1, y2] = thumbSpan(scroll);
    out.push({ component: 'rect', x1: th.x1, y1, x2: th.x2, y2, color: th.color, alpha: th.alpha });
    for (const b of doc.banner) out.push(tpl(b));
    for (const o of out) if (o.color === '#ffffff') delete o.color;
    return out;
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}) {
    let skipped = 0;
    for (const l of leaves(state, view)) {
      // кадр спрайта больше числа кадров берётся по модулю (фон: кадр 3 спрайта из 2 кадров рисует кадр 1 — вершины = O)
      const n = l.component === 'sprite' && l.frame ? skin.sprite(l.sprite).frames.length : 0;
      if (!drawLeaf(list, skin, n && l.frame >= n ? { ...l, frame: l.frame % n } : l)) skipped++;
    }
    return skipped;
  }

  return { leaves, build, thumbSpan, tone, nodes, openScroll, descText };
}
