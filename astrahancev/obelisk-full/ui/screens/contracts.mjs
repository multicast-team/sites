// Экран меню контрактов (этап 8.11): вёрстка data/ui/contracts.json (числа из листьев события Draw меню O) + ядро контрактов
// core/contracts.mjs (цена, кап, замок, эффект улучшений).
//
// Состояние: { contractActive — номер руды контракта, contractGoal, contractPoints, contractsDoneRun, autoComplete (0/1), gems,
//   bars[] — бары по номеру руды, contractLevels[34], obelisk, world, reward — очки за контракт (сводка: pointsPerContract),
//   costReduc — множитель цены улучшений (сводка), floor — номер этажа кнопки со стрелкой (см. floorOf) }.
// Вид: { scroll — прокрутка списка (px, 0…maxScroll), buyMode — 1 | 5 | 10 | 'max', gemArmed — кнопка самоцветов нажата (первое касание
//   Skip взводит её; ?? правило снятия взвода не снято) }.
import { drawLeaf } from '../kit/table.mjs';
import { drawSpritePart, rgbOf } from '../kit/prims.mjs';
import { makeShortFormat } from '../format/number.mjs';
import { formatFixed } from '../../core/num/real.mjs';

/**
 * Номер этажа на кнопке со стрелкой: последний этаж, у которого базовая руда = руда контракта (П: руды 0/3/5/7/12 → 1/7/11/15/23,
 * таблица floors data/systems/mining.json). Руды без этажа в таблице — ?? (null).
 */
export function floorOf(mining, ore) {
  let f = null;
  for (const [floor, base] of mining.tables.floors.rows) if (base === ore) f = floor;
  return f;
}

/**
 * Число уровней и цена покупки режимом Buy N (П: Buy 5/10 — min(N, кап − L) уровней, цены уровней по одному (правило 13) и сумма;
 * Buy Max — столько уровней подряд, сколько хватает очков, но не меньше одного (?? ноль доступных — цена одного уровня, не наблюдалось)).
 */
export function buyPlan(core, i, L, mode, state) {
  const cap = core.cap(i);
  const price = (l) => core.price(i, l, state.obelisk, state.costReduc ?? 1);
  if (L >= cap) return { n: 0, cost: 0 };
  if (mode === 'max') {
    let n = 0, cost = 0;
    while (L + n < cap && cost + price(L + n) <= state.contractPoints) { cost += price(L + n); n++; }
    if (n === 0) return { n: 1, cost: price(L) };
    return { n, cost };
  }
  const n = Math.min(mode ?? 1, cap - L);
  let cost = 0;
  for (let k = 0; k < n; k++) cost += price(L + k);
  return { n, cost };
}

/**
 * @param {object} doc   data/ui/contracts.json
 * @param {object} deps  { core (makeContracts), strings (data/strings.json → .strings), skin, short (format.short), skipGems (цена Skip) }
 */
export function makeContractsScreen(doc, { core, strings, skin, short, skipGems }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`contracts screen: нет текста ${key}`);
    return s;
  };
  const fmt = makeShortFormat(short);
  const U = doc.upgrades.rows.map((r) => Object.fromEntries(doc.upgrades.columns.map((c, i) => [c, r[i]])));
  const Ls = doc.list, R = Ls.row, K = Ls.lock, P = doc.panel, TB = doc.topbar, BB = doc.buybar;
  const num = (v) => (Number.isInteger(v) ? String(v) : formatFixed(v, 2));
  const width = (fk, str) => [...str].reduce((a, ch) => a + (skin.font(fk).glyphs.get(ch.codePointAt(0))?.advance || 0), 0);
  const worldOf = (i) => Ls.worlds.findIndex(([a, b]) => i >= a && i <= b);
  const rowTop = (i) => Ls.firstRow + Ls.rowStep * i + Ls.worldGap * worldOf(i);
  const vis = (y1) => y1 + Ls.cull.centerDy > Ls.cull.top && y1 + Ls.cull.centerDy < Ls.cull.bottom;
  const txt = (x, y, o) => ({ component: 'text', font: R.font, x, y, halign: 'center', valign: 'middle', ...o });
  const shadowed = (out, leaf, [dx, dy]) => { out.push({ ...leaf, x: leaf.x + dx, y: leaf.y + dy, color: '#000000' }); out.push(leaf); };

  function effectText(u, L, state) {
    const e = core.effect(u.id, L, state.contractsDoneRun);
    if (u.kind === 'x') return num(1 + e) + 'x';
    return u.kind + num(e) + '%';
  }

  function lockText(lk) {
    const parts = K[lk.kind];
    if (!parts) throw new Error(`contracts screen: текст замка «${lk.kind}» не снят (??)`);
    return parts[0] + lk.need + parts[1];
  }

  function thumb(scroll) {
    const t = doc.thumb, track = t.bottom - t.top;
    const len = (track * t.view) / (t.view + t.maxScroll);
    const y1 = t.top + (scroll * (track - len)) / t.maxScroll;
    return { component: 'rect', x1: t.x1, y1, x2: t.x2, y2: y1 + len, color: t.color, alpha: t.alpha };
  }

  function leaves(state, view = {}) {
    const out = [];
    const sc = view.scroll ?? 0;
    const mode = view.buyMode ?? 1;
    out.push({ ...doc.back });
    for (let k = 0; k < doc.noise.count; k++) {
      const n = doc.noise;
      out.push({ component: 'sprite', sprite: n.sprite, x: n.x, y: n.step * k - sc, sx: n.sx, sy: n.sy, alpha: n.alpha });
    }
    // список: разделы миров и ряды улучшений
    for (const u of U) {
      const Y = rowTop(u.id) - sc;
      if (!vis(Y)) continue;
      const w = worldOf(u.id), S = Ls.section;
      if (u.id === Ls.worlds[w][0]) {
        const hy = Y + S.dy, color = S.colors[w];
        for (const [x1, x2] of S.lines) out.push({ component: 'line', x1, y1: hy, x2, y2: hy, w: S.lineW, color, alpha: S.lineAlpha });
        shadowed(out, { component: 'text', font: S.font, x: 250, y: hy, value: S.parts[0] + (w + 1) + S.parts[1], halign: 'center', valign: 'middle', color }, S.shadow);
      }
      const L = state.contractLevels[u.id], cap = core.cap(u.id), maxed = L >= cap;
      const plan = buyPlan(core, u.id, L, mode, state);
      const poor = !maxed && state.contractPoints < plan.cost;
      const gray = poor ? { color: R.poor } : {};
      const r = (t) => ({ component: t.component, x1: t.x1, y1: Y + t.dy1, x2: t.x2, y2: Y + t.dy2, color: t === R.bg ? R.bgColors[w] : t.color });
      out.push(r(R.shadow), r(R.bg));
      out.push({ component: 'sprite', sprite: maxed ? R.button.maxed : R.button.sprite, x: R.button.x, y: Y + R.button.dy, sx: R.button.sx, sy: R.button.sy, ...gray });
      out.push({ component: 'sprite', sprite: u.icon, x: R.icon.x, y: Y + R.icon.dy, sx: R.icon.sx, sy: R.icon.sy });
      for (const p of R.plates) { const o = { ...p, y: Y + p.dy }; delete o.dy; out.push(o); }
      out.push(txt(R.level.x, Y + R.level.dy, { value: `${L}/${cap}`, snap: R.level.snap }));
      out.push(txt(R.effect.x, Y + R.effect.dy, { value: effectText(u, L, state) }));
      out.push(r(R.descBack));
      out.push(txt(R.desc.x, Y + R.desc.dy, { text: u.desc, sep: R.desc.sep, width: R.desc.width }));
      if (maxed) {
        shadowed(out, txt(R.maxed.x, Y + R.maxed.dy, { text: R.maxed.text, snap: false }), R.maxed.shadow);
      } else {
        out.push({ component: 'sprite', sprite: R.point.sprite, x: R.point.x, y: Y + R.point.dy, ...gray });
        shadowed(out, txt(R.price.x, Y + R.price.dy, { value: fmt(plan.cost), snap: false, ...gray }), R.price.shadow);
      }
      const lk = core.lock(u.id, state.contractLevels, state.obelisk, state.world);
      if (lk) {
        out.push(r(R.bg));
        out.push({ component: 'rect', x1: R.bg.x1, y1: Y + R.bg.dy1, x2: R.bg.x2, y2: Y + R.bg.dy2, color: K.shade.color, alpha: K.shade.alpha });
        out.push({ component: 'sprite', sprite: K.plate.sprite, x: K.plate.x, y: Y + K.plate.dy, sx: K.plate.sx, sy: K.plate.sy, color: K.plate.color });
        out.push(txt(K.text.x, Y + K.text.dy, { value: lockText(lk), color: K.text.color, sep: K.text.sep, width: K.text.width }));
      }
    }
    // шапка контракта
    const ore = state.contractActive, goal = state.contractGoal, have = state.bars[ore];
    out.push({ ...P.back });
    for (const p of P.plates) out.push({ ...p });
    const oreKey = P.ores[ore];
    if (!oreKey) throw new Error(`contracts screen: имя руды ${ore} не снято (??)`);
    out.push(txt(P.goal.x, P.goal.y, { value: fmt(goal) + ' ' + T(oreKey) + T(P.goal.bars) }));
    for (const b of P.barIcons) out.push({ component: 'sprite', sprite: P.barIcon.sprite, ...(ore ? { frame: ore } : {}), x: b.x, y: b.y, sx: P.barIcon.sx, sy: P.barIcon.sy });
    out.push({ ...P.floor.button }, { ...P.floor.arrow });
    out.push(txt(P.floor.text.x, P.floor.text.y, { value: String(state.floor), color: '#ffffff', alpha: 1, snap: false }));
    const B = P.bar;
    for (const [fr, w] of [[B.back, B.w], [B.fill, (B.w * have) / goal]]) {
      out.push({ component: 'part', sprite: B.sprite, frame: fr, left: 0, top: 0, w, h: B.h, x: B.x, y: B.y, sx: B.sx, sy: B.sy, angle: 0, color: '#ffffff', alpha: 1 });
    }
    out.push(txt(P.progress.x, P.progress.y, { value: fmt(have) + '/' + fmt(goal) }));
    out.push(txt(P.reward.x, P.reward.y, { value: P.reward.parts[0] + state.reward + P.reward.parts[1], color: '#ffffff', alpha: 1, snap: false }));
    out.push({ ...P.rewardPoint });
    const G = P.gem, gp = state.gems < skipGems ? { color: G.poor } : {};
    out.push({ component: 'sprite', ...G.button, ...(view.gemArmed ? { frame: 1 } : {}), ...gp });
    out.push({ component: 'sprite', ...G.icon, ...gp });
    out.push(txt(G.text.x, G.text.y, { value: String(skipGems), color: gp.color ?? '#ffffff', alpha: 1, snap: false }));
    for (const l of P.skip) out.push({ ...l });
    if (have >= goal) for (const l of P.complete) out.push({ ...l });   // ?? равенство не наблюдалось
    P.auto.forEach((l, i) => out.push(i === 0 && state.autoComplete ? { ...l, frame: 1 } : { ...l }));
    out.push(thumb(sc));
    // верхняя полоса
    for (const r of TB.rects) out.push({ ...r });
    const title = TB.title.parts[0] + (state.contractsDoneRun + 1) + TB.title.parts[1];
    out.push({ component: 'sprite', sprite: TB.title.sprite, x: TB.title.x, y: TB.title.y, sx: (width(R.font, title) + TB.title.pad) / TB.title.div, sy: TB.title.sy });
    out.push(txt(TB.title.x, TB.title.y, { value: title, snap: false }));
    for (const l of TB.points) out.push({ ...l });
    out.push({ component: 'text', font: R.font, x: TB.pointsText.x, y: TB.pointsText.y, value: fmt(state.contractPoints), valign: 'middle' });
    for (const l of TB.menu) out.push({ ...l });
    // нижняя полоса Buy 1/5/10/Max
    for (const r of BB.rects) out.push({ ...r });
    const b = BB.button;
    for (const k of BB.buttons) {
      out.push({ component: 'sprite', sprite: b.sprite, ...(k.mode === mode ? { frame: b.selectedFrame } : {}), x: k.x, y: b.y, sx: b.sx, sy: b.sy });
      shadowed(out, txt(k.x, b.y + b.textDy, { text: k.text, snap: false }), b.shadow);
    }
    return out;
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}, only = null) {
    let skipped = 0;
    for (const l0 of only ?? leaves(state, view)) {
      const l = l0.text !== undefined ? { ...l0, value: T(l0.text), text: undefined } : l0;
      if (l.component === 'part') {
        if (l.w >= 0) drawSpritePart(list, skin, l.sprite, l.frame, l.left, l.top, l.w, l.h, l.x, l.y, l.sx, l.sy, l.angle, rgbOf(l.color), l.alpha);
        continue;
      }
      if (!drawLeaf(list, skin, l)) skipped++;
    }
    return skipped;
  }

  return { leaves, build, buyPlan: (i, L, mode, state) => buyPlan(core, i, L, mode, state) };
}
