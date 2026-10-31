// Меню питомцев, вкладка Pets (этап 8.16): вёрстка data/ui/pets.json (числа из листьев события Draw меню O) + ядро питомцев
// core/pets.mjs (шанс повышения уровня) + таблица питомцев data/systems/pets.json (ключи, порядок).
//
// Экран не рисует записи O: он раскладывает 16 карточек питомцев списком с шагом list.step (рисуются все, без отсечения — П, записи
// 8.16), открытая карточка (сумма уровней ≥ порога) — с бонусом, звёздами уровня, строкой шанса и кнопками; купленная (уровень ≥ 1) —
// ещё с портретом, плашкой уровня, слотом карты и строкой бросков; не купленная — с кнопкой цены (серой, если самоцветов мало);
// запертая — плашка «сумма/порог Total Pet Levels To Unlock». Затем верхняя полоса и нижние вкладки.
//
// Состояние: { levels[16] — уровни питомцев, rolls[16] — броски с последнего уровня, skinA[16] — скин A куплен (шанс),
//   cards[16] — ступень карты питомца (0 — нет), gems, stats: { chanceMulti, skinBonus, levelCap } — сводка (вход) }.
// Вид: { top — верхний край меню (px), scroll — прокрутка списка (px), tab — 'pets', pulse — пульс адской карты, check — кадр флажка;
//   thumb — [y1, y2] ползунка (необязательно: по умолчанию — закон thumbSpan от прокрутки и верха меню) }.
import { drawLeaf } from '../kit/table.mjs';
import { rgbOf } from '../kit/prims.mjs';
import { drawSpriteStretchedTrim } from '../kit/ninetrim.mjs';
import { makeShortFormat } from '../format/number.mjs';
import { formatFixed } from '../../core/num/real.mjs';

/**
 * @param {object} doc   data/ui/pets.json
 * @param {object} deps  { pets: data/systems/pets.json, core: makePets(pets) (core/pets.mjs), strings: data/strings.json → .strings, skin,
 *                         short: format.short (data/ui/workshop.json) }
 */
export function makePetsScreen(doc, { pets, core, strings, skin, short }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`pets screen: нет текста ${key}`);
    return s;
  };
  const rowsOf = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const P = rowsOf(doc.pets);
  const keys = rowsOf(pets.tables.pets).map((r) => r.key);
  const fmt = makeShortFormat(short);
  const width = (fk, str) => [...str].reduce((a, ch) => a + (skin.font(fk).glyphs.get(ch.codePointAt(0))?.advance || 0), 0);
  /** Число бонуса: 2 знака, «.00» отбрасывается (П: probe816, 16 × 19 строк). */
  const num = (v) => { const t = formatFixed(v, 2); return t.endsWith('.00') ? t.slice(0, -3) : t; };
  const C = doc.card;
  const at = (o, Y) => { const r = { ...o, y: Y + o.dy }; delete r.dy; return r; };
  const rect = (r, Y) => ({ component: 'rect', x1: r.x1, y1: Y + r.dy1, x2: r.x2, y2: Y + r.dy2, ...(r.colors ? { colors: r.colors, alpha: 1 } : { color: r.color ?? '#ffffff' }), ...(r.alpha !== undefined && !r.colors ? { alpha: r.alpha } : {}) });
  const txt = (font, x, y, o) => ({ component: 'text', font, x, y, halign: 'center', valign: 'middle', ...o });

  const total = (state) => state.levels.reduce((a, b) => a + b, 0);
  /** Число звёзд-алмазов: алмаз k — при L ≥ from + per·k, не больше max (закон — doc.card.stars.diamond, П: записи over/all/stars/stars2
   *  при капе 10; ?? зависимость порога от капа). */
  const diamonds = (L) => {
    const D = C.stars.diamond;
    return Math.min(D.max, Math.max(0, Math.floor((L - D.from) / D.per) + 1));
  };
  /** Бонус питомца i на уровне L: части «текст + (b + a·max(L, 1))» и хвост (П: probe816). */
  const buffText = (p, L) => p.buff.map(([t, a, b]) => t + num(b + a * Math.max(L, 1))).join('') + p.buffTail;

  /** Знаменатель шанса уровня (core/pets, правило 1 pets-xp). */
  const levelUpOdds = (i, state) => core.chance(i, { level: state.levels[i], skinA: state.skinA[i] }, state.stats);

  function petCard(out, state, i, Y, view) {
    const p = P[i], L = state.levels[i], owned = L >= 1, cap = state.stats.levelCap;
    for (const b of C.backs) out.push(at(b, Y));
    for (const r of C.rects) out.push(rect(r, Y));
    out.push(txt(C.name.font, C.name.x, Y + C.name.dy, { text: p.name, color: C.name.color }));
    out.push(at(C.buff.plate, Y));
    out.push(txt(C.buff.font, C.buff.x, Y + C.buff.dy, { value: buffText(p, L), sep: C.buff.sep, width: C.buff.width }));
    const S = C.stars;
    for (let k = 0; k < S.count; k++) {
      out.push({ component: 'sprite', sprite: S.sprite, x: S.x + S.step * k, y: Y + S.dy, ...(k >= L ? { color: S.off } : {}) });
    }
    const D = S.diamond;   // звёзды-алмазы поверх первых звёзд (П: записи over/all/stars/stars2, закон — diamonds())
    for (let k = 0, n = diamonds(L); k < n; k++) out.push({ component: 'sprite', sprite: D.sprite, x: S.x + S.step * k, y: Y + S.dy });
    const H = C.chance;
    out.push(at(H.plate, Y));
    let line;
    if (L < cap) {
      line = T(H.prefix) + '1/' + fmt(levelUpOdds(i, state)) + H.sep + T(p.levelUpText);
    } else {
      // на капе и выше: флажок и «Card Odds: 1/<шанс уровня · (base + perLevel·L)> …», с открытой картой — «<имя> Completed!» (П: cap/over/card/all)
      out.push({ ...at(H.check, Y), frame: view.check ?? H.check.frame });
      line = state.cards[i] > 0 ? T(p.name) + T(H.completed)
        : T(H.cardPrefix) + '1/' + fmt(levelUpOdds(i, state) * (doc.cardOdds.base + doc.cardOdds.perLevel * L)) + H.sep + T(p.levelUpText);
    }
    out.push(txt(H.font, H.x + H.shadow[0], Y + H.dy + H.shadow[1], { value: line, color: '#000000' }));
    out.push(txt(H.font, H.x, Y + H.dy, { value: line }));
    if (owned && L < cap) {
      const R = C.rolls;
      out.push(at(R.back, Y), rect(R.rect, Y), at(R.plate, Y));
      out.push(txt(R.font, R.x, Y + R.dy, { value: T(R.prefix) + String(state.rolls[i]) }));
    }
    const I = C.info;
    out.push(at(I.button, Y), at(I.icon, Y), txt(I.font, I.x, Y + I.dy, { text: I.text }));
    if (owned) out.push(at(C.rename.button, Y), txt(C.rename.font, C.rename.x, Y + C.rename.dy, { text: C.rename.text }));
    out.push(at(C.head.plate, Y), { ...at(C.head.icon, Y), ...(i ? { frame: i } : {}) });
    if (owned) {
      const O = C.portrait, V = O.level;
      out.push(at(O.plate, Y));
      out.push({ component: 'sprite', sprite: `sprite.pet_${keys[i]}`, x: O.x, y: Y + O.dy, sx: O.sx, sy: O.sy });
      const lv = T(V.prefix) + L + '/' + cap;
      const w = width(V.font, lv) + V.pad;
      out.push({ component: 'stretched', sprite: V.sprite, frame: 0, x: V.cx - w / 2, y: Y + V.dy, w, h: V.h, color: '#ffffff', alpha: 1 });
      out.push(txt(V.font, V.cx, Y + V.dyText, { value: lv, color: L >= cap ? V.capColor : V.color }));
      const K = C.cardSlot;
      out.push(at(K.plate, Y));
      const cl = state.cards[i];
      if (cl > 0) {
        // открытая карта: рубашка кадра ступени, голова питомца (кадр = номер); адская — красный пульс поверх (вход view.pulse, как меню карт 8.13)
        const fr = K.frameOfLevel[cl], hot = cl === K.infernal.level;
        const pulse = view.pulse ?? 0;
        out.push({ ...at(K.back, Y), color: undefined, alpha: undefined, ...(fr ? { frame: fr } : {}) });
        if (hot) out.push({ ...at(K.back, Y), ...(fr ? { frame: fr } : {}), color: K.infernal.color, alpha: pulse * K.infernal.backingK });
        out.push({ ...at(K.icon, Y), ...(i ? { frame: i } : {}) });
        if (hot) out.push({ ...at(K.icon, Y), ...(i ? { frame: i } : {}), color: K.infernal.color, alpha: pulse });
      } else {
        out.push(at(K.back, Y), { ...at(K.unknown, Y), ...(i ? { frame: i } : {}) });
      }
    } else {
      const B = C.buy, poor = state.gems < p.price ? { color: B.poor } : {};
      out.push({ ...at(B.button, Y), ...poor }, { ...at(B.gem, Y), ...poor });
      out.push(txt(B.font, B.x, Y + B.dy, { value: fmt(p.price), ...poor }));
    }
  }

  function lockedCard(out, state, i, Y) {
    const K = doc.locked;
    out.push(at(K.back, Y), at(K.plate, Y));
    out.push(txt(K.font, K.x, Y + K.dy, { value: total(state) + '/' + P[i].unlockLevels + T(K.suffix), color: K.color }));
  }

  /** Ползунок [y1, y2] от прокрутки и верхнего края меню (закон как у кита Workshop 4.3: data/ui/pets.json → thumb.track). */
  function thumbSpan(scroll, top) {
    const t = doc.thumb.track, d = top - doc.thumb.menuTop;
    const L = t.bottom - (t.top + d), V = t.viewBottom - d;
    const len = L * V / (V + t.maxScroll);
    const y1 = (t.top + d) + scroll * (L - len) / t.maxScroll;
    return [y1, y1 + len];
  }

  function leaves(state, view = {}) {
    const out = [];
    const sc = view.scroll ?? 0, top = view.top;
    out.push({ ...doc.back });
    const N = doc.noise;
    for (let k = 0; k < N.count; k++) out.push({ component: 'sprite', sprite: N.sprite, x: N.x, y: N.step * k - sc, sx: N.sx, sy: N.sy, alpha: N.alpha });
    const [ty1, ty2] = view.thumb ?? thumbSpan(sc, top);
    out.push({ component: 'rect', x1: doc.thumb.x1, y1: ty1, x2: doc.thumb.x2, y2: ty2, color: doc.thumb.color, alpha: doc.thumb.alpha });
    const sum = total(state);
    for (let i = 0; i < P.length; i++) {
      const Y = doc.list.y0 + doc.list.step * i - sc;
      if (sum >= P[i].unlockLevels) petCard(out, state, i, Y, view); else lockedCard(out, state, i, Y);
    }
    // верхняя полоса
    const B = doc.topbar;
    for (const r of B.rects) out.push(rect(r, top));
    out.push(txt(B.total.font, B.total.x, top + B.total.dy, { value: T(B.total.prefix) + sum, color: B.total.color }));
    out.push(at(B.walk.button, top));
    for (const r of B.walk.rects) out.push(rect(r, top));
    out.push(at(B.walk.icon, top));
    out.push(at(B.menu.button, top));
    const M = B.menu.lines;
    for (let k = 0; k < M.count; k++) out.push({ component: 'rect', x1: M.x1, y1: top + M.dy1 + M.step * k, x2: M.x2, y2: top + M.dy1 + M.step * k + M.h });
    // нижние вкладки
    const Tb = doc.tabs;
    for (const r of Tb.rects) out.push({ ...r });
    for (const it of Tb.items) {
      const sel = it.tab === (view.tab ?? 'pets') ? { color: Tb.selected } : {};
      out.push({ component: 'sprite', sprite: Tb.button.sprite, x: it.x, y: Tb.y, sx: Tb.button.sx, sy: Tb.button.sy, ...sel });
      out.push({ component: 'sprite', sprite: it.icon, x: it.x, y: Tb.iconY, sx: Tb.icon.sx, sy: Tb.icon.sy, ...sel });
      out.push({ component: 'sprite', sprite: Tb.plate.sprite, x: it.x, y: Tb.plateY, sx: Tb.plate.sx, sy: Tb.plate.sy });
      out.push(txt(Tb.font, it.x, Tb.plateY, { text: it.text }));
    }
    return out;
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}, only = null) {
    let skipped = 0;
    for (const l0 of only ?? leaves(state, view)) {
      const l = l0.text !== undefined ? { ...l0, value: T(l0.text), text: undefined } : l0;
      if (l.component === 'stretched') {
        drawSpriteStretchedTrim(list, skin, l.sprite, l.frame ?? 0, l.x, l.y, l.w, l.h, rgbOf(l.color ?? '#ffffff'), l.alpha ?? 1);
        continue;
      }
      if (l.component === 'sprite' && l.frame) {   // кадр за пределами спрайта — по модулю числа кадров (знак вопроса слота карты, как в меню карт 8.13)
        const n = skin.sprite(l.sprite).frames.length;
        if (l.frame >= n) { if (!drawLeaf(list, skin, { ...l, frame: l.frame % n })) skipped++; continue; }
      }
      if (!drawLeaf(list, skin, l)) skipped++;
    }
    return skipped;
  }

  return { leaves, build, thumbSpan, buffText: (i, L) => buffText(P[i], L) };
}
