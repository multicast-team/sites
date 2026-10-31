// Экран меню испытаний (этап 8.3): вёрстка data/ui/challenges.json (числа из листьев события Draw меню O) + ядро испытаний
// core/challenges.mjs (подпись, текст, требование, награда, ступень, видимые строки Upcoming).
//
// Состояние: { id — номер текущего испытания, progress, coins [обычные, Extreme, Divine], levels [52] — уровни улучшений испытаний,
//   obelisk, skillNodes (?? множитель строки 11) }.
// Вид: { scroll — прокрутка списка (px, ≥ 0), menuOpen — меню ☰, hideMaxed, peek — окно Upcoming, pulse { k, alpha } — фаза
//   пульсации кнопки «Complete Challenge» (?? правило по времени не снято — вход из кадра O) }.
import { drawLeaf } from '../kit/table.mjs';
import { drawSpritePart, fillRoundRect, rgbOf, wrapWords } from '../kit/prims.mjs';
import { drawSpriteStretchedTrim, spriteCulled } from '../kit/ninetrim.mjs';
import { makeShortFormat } from '../format/number.mjs';
import { formatFixed } from '../../core/num/real.mjs';

/**
 * @param {object} doc   data/ui/challenges.json
 * @param {object} deps  { core (makeChallenges), strings (data/strings.json → .strings), skin, short (format.short) }
 */
export function makeChallengesScreen(doc, { core, strings, skin, short }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`challenges screen: нет текста ${key}`);
    return s;
  };
  const fmt = makeShortFormat(short);
  const U = doc.upgrades.rows.map((r) => Object.fromEntries(doc.upgrades.columns.map((c, i) => [c, r[i]])));
  const H = doc.header, Ls = doc.list, R = Ls.row, TB = doc.topbar, UP = doc.upcoming;
  const vis = (y) => y > doc.cull.top && y < doc.cull.bottom;
  const num = (v) => (Number.isInteger(v) ? String(v) : formatFixed(v, 2));
  /** Ширина строки шрифта (сумма advance глифов; spec text-layout) и число строк с переносом по словам на ширине width (перенос кита). */
  const width = (fk, str) => [...str].reduce((a, ch) => a + (skin.font(fk).glyphs.get(ch.codePointAt(0))?.advance || 0), 0);
  const lineCount = (fk, str, w) => String(str).split('\n').reduce((n, ln) => n + wrapWords(skin.font(fk), ln, w).length, 0);

  /** Текст эффекта улучшения на уровне L. */
  function effectText(u, L, state) {
    const [kind, pre, step, suf, per] = u.effect;
    if (kind === 'yesno') return { text: Ls.yesNo[L > 0 ? 1 : 0] };
    const m = per === 1 ? 1 : per === 'completed' ? state.id : per === 'obelisk' ? state.obelisk : per === 'skillNodes' ? state.skillNodes ?? 0 : NaN;
    if (kind === 'pair') return { value: pre + num(L * step[0] * m) + '/' + num(L * step[1] * m) + suf };
    return { value: pre + num(L * step * m) + suf };
  }

  /** Ряды списка: y (до прокрутки), раздел, улучшение; Hide maxed убирает ряды на капе. */
  function layout(state, view = {}) {
    const rows = [];
    let k = 0;
    for (const u of U) {
      if (view.hideMaxed && state.levels[u.id] >= u.cap) continue;
      rows.push({ u, y: Ls.firstRow + Ls.rowStep * k + Ls.sectionGap * u.tier });
      k++;
    }
    return rows;
  }

  function thumb(scroll) {
    const t = doc.thumb, track = t.bottom - t.top;
    const len = (track * t.view) / (t.view + t.maxScroll);
    const y1 = t.top + (scroll * (track - len)) / t.maxScroll;
    return { component: 'rect', x1: t.x1, y1, x2: t.x2, y2: y1 + len, color: t.color, alpha: t.alpha };
  }

  function outlined(out, leaf, offs, color = '#000000') {
    for (const [dx, dy] of offs) out.push({ ...leaf, x: leaf.x + dx, y: leaf.y + dy, color });
    out.push(leaf);
  }

  function leaves(state, view = {}) {
    const out = [];
    const sc = view.scroll ?? 0;
    const id = state.id;
    const tier = core.tier(id);
    const info = core.info(id);
    out.push({ ...doc.back });
    for (let k = 0; k < doc.noise.count; k++) {
      const n = doc.noise;
      out.push({ component: 'sprite', sprite: n.sprite, x: n.x, y: n.step * k - sc, sx: n.sx, sy: n.sy, alpha: n.alpha });
    }
    // шапка
    for (const b of H.backing) if (vis(b.y - sc)) out.push({ component: 'sprite', sprite: H.backings[tier], ...b, y: b.y - sc });
    // подложка описания: масштаб y = строк + 1 (П: 1 и 2 строки)
    H.plates.forEach((p, i) => out.push({ ...p, y: p.y - sc, ...(i === 1 ? { sy: H.descSyBase + lineCount(H.descFont, info.text, H.desc.width) } : {}) }));
    out.push({ ...H.title, y: H.title.y - sc, value: info.label });
    out.push({ ...H.desc, y: H.desc.y - sc, value: info.text });
    const B = H.bar;
    if (vis(B.y - sc)) {
      for (const [fr, w] of [[B.back, B.w], [B.fill, (B.w * state.progress) / info.req]]) {
        out.push({ component: 'part', sprite: B.sprite, frame: fr, left: 0, top: 0, w, h: B.h, x: B.x, y: B.y - sc, sx: B.sx, sy: B.sy, angle: 0, color: '#ffffff', alpha: 1 });
      }
    }
    H.peek.forEach((p, i) => {
      if (!vis(p.y - sc)) return;
      out.push({ ...p, y: p.y - sc, ...(i === 0 && view.peek ? { frame: 1 } : {}) });
    });
    out.push({ ...H.progress, y: H.progress.y - sc, value: fmt(state.progress) + '/' + fmt(info.req) });
    const rw = { ...H.reward, y: H.reward.y - sc, value: T(H.rewardParts[0]) + info.reward + T(H.rewardParts[1 + tier]) };
    if (H.rewardOutline[tier]) outlined(out, rw, H.outline); else out.push(rw);
    if (state.progress >= info.req) {   // готово (?? сравнение без эпсилона ядра)
      const C = H.complete, k = view.pulse?.k ?? 1, y = C.y - sc;
      out.push({ component: 'blend', mode: 1 });
      out.push({ component: 'sprite', sprite: C.glow.sprite, x: C.glow.x, y, sx: C.glow.sx * k, sy: C.glow.sy * k, color: C.glow.color, alpha: view.pulse?.alpha ?? 1 });
      out.push({ component: 'blend', mode: 0 });
      out.push({ component: 'sprite', sprite: C.button.sprite, x: C.button.x, y, sx: C.button.sx * k, sy: C.button.sy * k });
      out.push({ component: 'text', font: C.text.font, x: C.text.x, y: C.y + C.text.dy * k - sc, value: T(C.text.text), sep: C.text.sep, width: C.text.width,
        xscale: k, yscale: k, halign: 'center', valign: 'middle', color: '#ffffff', alpha: 1, snap: false });
    }
    // список
    const rows = layout(state, view);
    let lastTier = -1;
    for (const { u, y: Y0 } of rows) {
      if (u.tier !== lastTier) {
        lastTier = u.tier;
        const S = Ls.sections[u.tier], ty = Y0 + Ls.titleDy - sc;
        if (vis(ty)) {
          for (const [x1, x2] of S.lines) out.push({ component: 'line', x1, y1: ty, x2, y2: ty, w: Ls.lineW, color: S.color, alpha: Ls.lineAlpha });
          outlined(out, { component: 'text', font: 'font.size12', x: 250, y: ty, text: S.title, halign: 'center', valign: 'middle', color: S.color }, [[1, 1]]);
          if (S.subtitle) {
            outlined(out, { component: 'text', font: Ls.subtitleFont, x: 250, y: ty + Ls.subtitleDy, text: S.subtitle, halign: 'center', valign: 'middle', color: Ls.subtitleColor }, [[1, 1]]);
          }
        }
      }
      const Y = Y0 - sc, L = state.levels[u.id], maxed = L >= u.cap, poor = state.coins[u.tier] < u.cost;
      const locked = u.id > 0 && state.levels[u.id - 1] === 0;
      if (vis(Y)) {
        out.push({ ...R.bg, y: Y, frame: u.tier });
        out.push({ component: 'sprite', sprite: maxed ? R.maxedButton : R.normalButton, x: R.button.x, y: Y, sx: R.button.sx, sy: R.button.sy, ...(!maxed && poor ? { color: R.poor } : {}) });
        out.push({ component: 'sprite', sprite: u.icon, ...(u.frame ? { frame: u.frame } : {}), x: R.icon.x, y: Y, sx: R.icon.sx, sy: R.icon.sy });
        for (const s of R.small) out.push({ component: 'sprite', sprite: 'sprite.patch_desc', x: s.x, y: Y + s.dy, sx: R.smallSx, sy: R.smallSy });
        out.push({ component: 'text', font: 'font.size12', x: R.small[0].x, y: Y + R.small[0].dy, value: `${L}/${u.cap}`, halign: 'center', valign: 'middle' });
        out.push({ component: 'text', font: 'font.size12', x: R.small[1].x, y: Y + R.small[1].dy, ...effectText(u, L, state), halign: 'center', valign: 'middle' });
        out.push({ component: 'sprite', sprite: 'sprite.patch_desc', x: R.plate.x, y: Y, sx: R.plate.sx, sy: R.plate.sy });
        out.push({ component: 'text', font: 'font.size12', x: R.descX, y: Y, text: u.desc, halign: 'center', valign: 'middle' });
      }
      const tt = (x, y, o) => ({ component: 'text', font: 'font.size12', x, y, halign: 'center', valign: 'middle', alpha: 1, snap: false, ...o });
      if (maxed) {
        outlined(out, tt(R.maxed.x, Y + R.maxed.dy, { text: R.maxed.text, color: '#ffffff' }), [[1, 1]]);
      } else {
        out.push({ component: 'sprite', sprite: Ls.coins[u.tier], x: R.coin.x, y: Y + R.coin.dy, sx: R.coin.sx, sy: R.coin.sy, ...(poor ? { color: R.poor } : {}) });
        outlined(out, tt(R.cost.x, Y + R.cost.dy, { value: fmt(u.cost), color: poor ? R.poor : '#ffffff' }), [[1, 1]]);
      }
      if (locked) {
        if (vis(Y)) out.push({ ...R.bg, y: Y, frame: u.tier, color: R.lock.bg });
        out.push({ component: 'sprite', sprite: 'sprite.patch_desc', x: R.lock.plate.x, y: Y, sx: R.lock.plate.sx, sy: R.lock.plate.sy, color: R.lock.plate.color });
        out.push({ component: 'text', font: 'font.size12', x: R.lock.text.x, y: Y, text: R.lock.text.key, halign: 'center', valign: 'middle', color: R.lock.text.color });
      }
    }
    out.push(thumb(sc));
    // верхняя полоса
    for (const r of TB.rects) out.push({ ...r });
    TB.coinX.forEach((x, t) => {
      if (id < TB.showFrom[t]) return;
      out.push({ component: 'sprite', sprite: TB.plate.sprite, x, y: TB.y, sx: TB.plate.sx, sy: TB.plate.sy });
      out.push({ component: 'sprite', sprite: Ls.coins[t], x, y: TB.y, sx: TB.coinS, sy: TB.coinS });
      out.push({ component: 'text', font: 'font.size12', x: x + TB.textDx, y: TB.y, value: fmt(state.coins[t]), valign: 'middle' });
    });
    for (const l of TB.info) out.push({ ...l });
    const mb = TB.menuButton;
    out.push({ component: 'sprite', sprite: view.menuOpen ? 'sprite.patch_button_green' : 'sprite.patch_button', x: mb.x, y: mb.y, sx: mb.sx, sy: mb.sy });
    for (const r of TB.burger) out.push({ ...r });
    if (view.menuOpen) for (const m of doc.menu) { const o = { ...m }; if (o.id === 'check') o.frame = view.hideMaxed ? 1 : 0; delete o.id; out.push(o); }
    if (view.peek) upcoming(out, state);
    return out;
  }

  function upcoming(out, state) {
    for (const l of UP.head) out.push({ ...l });
    const list = core.visible(state.id);
    const card = (y, t, alpha) => ({ ...UP.card, sprite: H.backings[t], y, ...(alpha !== undefined ? { alpha } : {}) });
    const at = (l, y0) => { const o = { ...l, y: y0 + l.dy }; delete o.dy; return o; };
    if (list.length === 0) {
      out.push(card(UP.firstY, core.tier(state.id), UP.end.alpha));
      out.push(at(UP.end.text, UP.firstY));
    }
    list.forEach((c, k) => {
      const y0 = UP.firstY + UP.step * k;
      out.push(card(y0, c.tier));
      out.push(at(UP.titlePlate, y0));
      out.push({ ...at(UP.title, y0), value: c.label });
      if (k === 0) {
        // плашка прогресса — по ширине текста: w = ширина + отступ, правый край постоянный (П: 35 → 47, 42 → 54, 49 → 61)
        const pt = fmt(state.progress) + '/' + fmt(c.req), pw = width(UP.progress.font, pt) + UP.progressPad, px = UP.progressRight - pw;
        out.push(at(UP.current[0], y0), at(UP.current[1], y0), { ...at(UP.current[2], y0), x: px, w: pw });
        out.push({ ...at(UP.progress, y0), x: px + pw / 2, value: pt });
      }
      out.push(at(UP.descPlate, y0));
      out.push({ ...at(UP.desc, y0), value: c.text });
      // плашка награды — по ширине текста награды: w = ширина + rewardPad, по центру rewardCenter; монета на coin.dx от левого края
      // (П: «Reward: 10 Challenge Coins» 182 → 222, Extreme 238 → 278 (x 111), Divine 231 → 271 (x 114,5); монета 153 / 125 / 128,5)
      const rt = T(H.rewardParts[0]) + c.reward + T(H.rewardParts[1 + c.tier]), rw = width(UP.reward.font, rt) + UP.rewardPad, rx = UP.rewardCenter - rw / 2;
      out.push({ ...at(UP.rewardPlate, y0), x: rx, w: rw });
      out.push({ component: 'sprite', sprite: Ls.coins[c.tier], x: rx + UP.coin.dx, y: y0 + UP.coin.dy });
      out.push({ ...at(UP.reward, y0), value: rt });
    });
    out.push({ ...UP.close });
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал (рамка скруглённого меню — режим линий). */
  const trimmed = (key) => { const sp = skin.sprite(key); const d = sp.frames[0].dst; return !!sp.nine && (d[0] !== 0 || d[1] !== 0 || d[2] !== sp.width || d[3] !== sp.height); };
  function build(list, state, view = {}, only = null) {
    let skipped = 0;
    for (const l0 of only ?? leaves(state, view)) {
      const l = l0.text !== undefined ? { ...l0, value: T(l0.text), text: undefined } : l0;
      if (l.component === 'blend') continue;   // режим смешивания — состояние GL, вершин нет
      if (l.component === 'roundrect') {
        if (!l.outline) fillRoundRect(list, l.x1, l.y1, l.x2, l.y2, l.xrad, l.yrad, rgbOf(l.color ?? '#ffffff'), l.alpha ?? 1);
        else skipped++;
        continue;
      }
      if (l.component === 'stretched') {
        drawSpriteStretchedTrim(list, skin, l.sprite, l.frame ?? 0, l.x, l.y, l.w, l.h, rgbOf(l.color ?? '#ffffff'), l.alpha ?? 1);
        continue;
      }
      if (l.component === 'part') {
        // полоса нулевой ширины (прогресс 0) у O тоже даёт квад нулевой ширины (П: w1-ob10-challenges, вершины 79764–79769)
        if (l.w >= 0) drawSpritePart(list, skin, l.sprite, l.frame, l.left, l.top, l.w, l.h, l.x, l.y, l.sx, l.sy, l.angle, rgbOf(l.color), l.alpha);
        continue;
      }
      // спрайт nine-slice с обрезанным кадром (подложки ступеней): как растянутый с обрезкой (ui/kit/ninetrim.mjs, П по вершинам O)
      if (l.component === 'sprite' && trimmed(l.sprite)) {
        const sp = skin.sprite(l.sprite), sx = l.sx ?? 1, sy = l.sy ?? 1;
        if (spriteCulled(list, skin, l.sprite, l.x, l.y, sx, sy)) continue;   // отсечение окном вида, как у целого спрайта (sprite-layout п.6)
        drawSpriteStretchedTrim(list, skin, l.sprite, l.frame ?? 0, l.x - sp.origin[0] * sx, l.y - sp.origin[1] * sy, sp.width * sx, sp.height * sy,
          rgbOf(l.color ?? '#ffffff'), l.alpha ?? 1);
        continue;
      }
      if (!drawLeaf(list, skin, l)) skipped++;
    }
    return skipped;
  }
  return { leaves, build, layout, thumb, effectText };
}
