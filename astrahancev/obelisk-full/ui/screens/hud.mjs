// HUD главного экрана (этап 6.5): вёрстка data/ui/hud.json из частей кита (ui/kit) — полосы, навыки, опыт, плашки руды,
// уровень, монеты и самоцветы, значки окон, кнопки хаба / выхода / обелиска / магазина, плашка этажа, колбы сундуков,
// подарки, версия. Порядок рисования — как у O (oracle/sources.json → ui.hud65). Рамочные линии под полосами (режим линий)
// кит пока не рисует: VertexList — только треугольники (долг 6.3).
//
// Входы — состояние экрана (что показывает HUD в этом кадре); привязки к ядру (банк, опыт, руда, задания) — экраны систем:
// {
//   shift      — над экраном панель заданий NPE: блоки с shift сдвигаются вниз на doc.tasksShift,
//   gifts      — число подарков (строка) или null,
//   skill      — строка навыков «2042(+6456)»,
//   xp         — { cur, max } или { capped: true },
//   plates     — [{ text, frame, alpha }] плашки руды сверху вниз (альфа — кадр анимации, бывает > 1),
//   level      — уровень (число),
//   wallet     — [монеты, самоцветы] строками,
//   hub        — { dot } — точка-уведомление на кнопке хаба,
//   exit       — кнопка выхода из меню,
//   obelisk    — null или { frame, timer, dot } — кнопка обелиска (кадр значка, текст таймера, точка),
//   shop       — null или { fill } — кнопка магазина (доля полосы Freebie),
//   floor      — null, { mode: 'full', autoLocked } или { mode: 'early', counter } — плашка этажа,
//   gauges     — null или [{ p, hl }, { p, hl }] — колбы сундуков и реликвий (доля, подсветка значка),
// }
import { rgbOf, fillCircle } from '../kit/prims.mjs';
import { resolvePalette } from '../kit/components.mjs';

/**
 * @param {object} docIn   data/ui/hud.json
 * @param {object} deps    { kit (makeKit), kitDoc (data/ui/kit.json — палитра), strings (data/strings.json → .strings) }
 */
export function makeHud(docIn, { kit, kitDoc, strings }) {
  const doc = resolvePalette({ palette: kitDoc.palette, styles: docIn }).styles;
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`hud: нет текста ${key}`);
    return s;
  };

  /** Спрайт-часть вёрстки HUD { sprite, frame?, x, y, sx, sy, color?, alpha? } со сдвигом dy; over — замена полей. */
  const sprite = (list, p, dy, over = {}) =>
    kit.part(list, { sprite: p.sprite, frame: p.frame, dx: p.x, dy: p.y, sx: p.sx, sy: p.sy, color: p.color, alpha: p.alpha }, 0, dy, over);
  const dot = (list, d, dy) => fillCircle(list, d.x, d.y + dy, d.r, rgbOf(d.color), 1);

  function build(list, st) {
    const dyOf = (block) => (block.shift && st.shift ? doc.tasksShift : 0);

    // полосы: верхняя растёт на сдвиг (низ), нижняя на месте
    {
      const b = doc.bands, dy = dyOf(b);
      for (const r of b.rects) kit.rect(list, r.x1, r.y1, r.x2, r.y2 + (r.grow ? dy : 0), r.color);
    }
    if (st.gifts != null) {
      const g = doc.gifts, dy = dyOf(g);
      for (const p of g.parts) sprite(list, p, dy);
      for (const [ox, oy] of g.iconShadow.offsets) sprite(list, { ...g.icon, x: g.icon.x + ox, y: g.icon.y + oy }, dy, { color: g.iconShadow.color, alpha: g.iconShadow.alpha });
      sprite(list, g.icon, dy);
      kit.label(list, g.text.style, g.text.x, g.text.y + dy, st.gifts);
    }
    {
      const s = doc.skill, dy = dyOf(s);
      sprite(list, s.bar, dy); sprite(list, s.icon, dy);
      kit.label(list, s.text.style, s.text.x, s.text.y + dy, st.skill);
    }
    {
      const x = doc.xp, dy = dyOf(x);
      sprite(list, x.bar, dy); sprite(list, x.icon, dy);
      const capped = !!st.xp.capped;
      kit.label(list, x.text.style, capped ? x.text.cappedX : x.text.x, x.text.y + dy, capped ? T(x.cappedLabel) : `${st.xp.cur}/${st.xp.max}`);
    }
    {
      const P = doc.plates, dy = dyOf(P);
      (st.plates || []).forEach((pl, k) => {
        const y = P.y + k * P.step + dy;
        const x1 = P.textX - P.pad - P.charWidth * [...pl.text].length;   // левый край — по числу символов (?? ширина шрифта не та: 9,6 = 1,2 × 8)
        kit.box(list, P.box, x1, y + P.dy1, P.x2, y + P.dy2, pl.alpha);
        sprite(list, { ...P.icon, frame: pl.frame, y: y - dy }, dy, { alpha: pl.alpha });
        kit.label(list, P.text, P.textX, y, pl.text, undefined, pl.alpha);
      });
    }
    {
      const L = doc.level, dy = dyOf(L);
      kit.progress(list, L.progress, L.x, L.y + dy, st.xp.capped ? 1 : st.xp.cur / st.xp.max);
      sprite(list, L.icon, dy);
      kit.label(list, L.text.style, L.text.x, L.text.y + dy, String(st.level));
    }
    {
      const W = doc.wallet, dy = dyOf(W);
      W.rows.forEach((row, k) => {
        sprite(list, row.bar, dy); sprite(list, row.icon, dy);
        kit.label(list, row.text.style, row.text.x, row.text.y + dy, st.wallet[k]);
      });
    }
    sprite(list, doc.currenciesIcon, dyOf(doc.currenciesIcon));
    {
      const h = doc.hubButton, dy = dyOf(h);
      sprite(list, h.body, dy); sprite(list, h.icon, dy);
      if (st.hub?.dot) dot(list, h.dot, dy);
    }
    if (st.exit) { const e = doc.exitButton, dy = dyOf(e); sprite(list, e.body, dy); sprite(list, e.icon, dy); }
    if (st.obelisk) {
      const o = doc.obeliskButton, dy = dyOf(o);
      sprite(list, o.shadow, dy); sprite(list, o.body, dy); sprite(list, o.icon, dy, { frame: st.obelisk.frame });
      if (st.obelisk.dot) dot(list, o.dot, dy);
      kit.label(list, o.timer.style, o.timer.x, o.timer.y + dy, st.obelisk.timer);
    }
    if (st.shop) {
      // кнопка магазина: тело, полоса заполнения Freebie снизу вверх (доля st.shop.fill, при 0 — пустая часть спрайта), значок
      const s = doc.shopButton, dy = dyOf(s);
      sprite(list, s.body, dy);
      kit.progress(list, s.fill.progress, s.fill.x, s.fill.y + dy, st.shop.fill ?? 0);
      sprite(list, s.icon, dy);
    }
    if (st.floor) {
      const F = doc.floorPanel, dy = dyOf(F), grey = F.lockedTint;
      if (st.floor.mode === 'early') {
        // ранняя плашка: кнопка «вверх» и счётчик закрыты (серые), тень короче
        sprite(list, { ...F.shadow, sy: F.shadowEarlySy }, dy);
        sprite(list, F.up.body, dy, { color: grey }); sprite(list, F.up.arrow, dy, { color: grey });
        sprite(list, F.down.body, dy, { color: grey });
        kit.label(list, F.down.counter.style, F.down.counter.x, F.down.counter.y + dy, st.floor.counter);
      } else {
        sprite(list, F.shadow, dy);
        sprite(list, F.toggle.body, dy);
        for (const a of F.toggle.arrows) sprite(list, a, dy);
        sprite(list, F.up.body, dy); sprite(list, F.up.arrow, dy);
        sprite(list, F.down.body, dy); sprite(list, F.down.arrow, dy);
        const locked = st.floor.autoLocked;
        sprite(list, F.auto.body, dy, locked ? { color: grey } : {});
        kit.label(list, F.auto.text.style, F.auto.text.x, F.auto.text.y + dy, T(F.auto.label), locked ? grey : undefined);
      }
    }
    if (st.gauges) {
      const G = doc.gauges, dy = dyOf(G);
      G.rows.forEach((row, k) => {
        const g = st.gauges[k];
        kit.progress(list, row.progress, row.x, row.y + dy, g.p);
        if (g.hl) sprite(list, row.highlight, dy);
        sprite(list, row.icon, dy);
      });
    }
    sprite(list, doc.statsIcon, dyOf(doc.statsIcon));
    {
      const v = doc.versionLabel, dy = dyOf(v);
      kit.label(list, v.style, v.x, v.y + dy, v.prefix + docIn.version, undefined, v.alpha);
    }
    return list;
  }

  return { build };
}
