// Инфо-страница меню (этап 8.4): окно, которое открывает кнопка «i» (испытания, звёзды) или вкладка Info (статуи).
// Вёрстка — data/ui/menuinfo.json (числа из листьев события Draw меню O, записи oracle/info84). Страница рисуется поверх меню:
// затемнение, рамка, заголовок с двумя значками, разделы (плашка, значок, заголовок, текст с переносом), подпись «Tap anywhere to close».
//
// Состояние: { tier — ступень текущего испытания 0/1/2 (ядро испытаний), statues — уровни статуй трёх наборов [[9], [9], [9]]
//   (0 — не построена, 1 — построена, 2 — золочёная, 3 — платиновая), world — открытый мир, stars — уровни звёзд [23], superStars }.
// Нужны только поля страницы, которую рисуем.
import { drawLeaf } from '../kit/table.mjs';
import { wrapWords } from '../kit/prims.mjs';

/**
 * @param {object} doc   data/ui/menuinfo.json
 * @param {object} deps  { strings (data/strings.json → .strings), skin }
 */
export function makeMenuInfo(doc, { strings, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`menuinfo: нет текста ${key}`);
    return s;
  };
  const B = doc.box;
  const lineCount = (fk, str, w) => String(str).split('\n').reduce((n, ln) => n + wrapWords(skin.font(fk), ln, w).length, 0);

  /** Часть текста раздела: ключ строки или переменная состояния. */
  function part(p, state) {
    if (typeof p === 'string') return T(p);
    switch (p.var) {
      case 'tier':
        return state.tier >= p.minTier ? T(p.text) : '';
      case 'worlds':
        // мир w: «Standard n/9  Gilded n/9  Platinum n/9» — статуи набора с уровнем ≥ 1, ≥ 2, ≥ 3; набор k — k-й мир из списка;
        // мир закрыт («Locked»), пока открытый мир меньше w (П: мир 1, 3, 4; ?? граница при мире 2)
        return p.worlds.map((w, k) => {
          const head = p.line + w + p.colon;
          if (state.world < w) return head + T(p.locked);
          const lv = state.statues[k];
          return head + p.levels.map((key, i) => T(key) + lv.filter((x) => x >= i + 1).length + p.of + p.per).join(p.join);
        }).join('');
      case 'starsDiscovered':
        return T(p.label) + state.stars.filter((x) => x > 0).length + p.of + p.total;
      case 'superStars':
        return T(p.label) + state.superStars;
      default:
        throw new Error(`menuinfo: неизвестная часть ${p.var}`);
    }
  }

  /**
   * Листья страницы page (ключ doc.pages) в порядке рисования O. view.inset — вырез сверху (safe-inset, px комнаты): верх рамки, шапка
   * и разделы ниже на него; затемнение, низ рамки, подпись и значки у подписи — на месте (П: вырез 0 и 64 у всех трёх страниц).
   */
  function leaves(page, state = {}, view = {}) {
    const P = doc.pages[page];
    if (!P) throw new Error(`menuinfo: нет страницы ${page}`);
    const dy = view.inset ?? 0;
    const out = [];
    P.rects.forEach(([x1, y1, x2, y2, color, alpha], i) => out.push({ component: 'rect', x1, y1: i === 0 ? y1 : y1 + dy, x2, y2, color, alpha }));
    const h = P.head, hy = h.y + dy;
    out.push({ component: 'text', font: h.font, x: h.x, y: hy, value: T(h.text), halign: 'center', valign: 'middle', color: h.color });
    out.push({ component: 'sprite', sprite: h.icon, x: h.iconL[0], y: hy, sx: h.iconL[1], sy: h.iconScale });
    out.push({ component: 'sprite', sprite: h.icon, x: h.iconR[0], y: hy, sx: h.iconR[1], sy: h.iconScale });
    let top = P.top0 + dy;
    for (const bx of P.boxes) {
      if (bx.minTier !== undefined && !(state.tier >= bx.minTier)) continue;
      const body = bx.body.map((p) => part(p, state)).join('');
      const bottom = top + B.bodyDy + lineCount(B.bodyFont, body, B.width) * B.sep + B.pad;
      out.push({ component: 'rect', x1: B.x1, y1: top, x2: B.x2, y2: bottom, color: B.color, alpha: B.alpha });
      out.push({ component: 'sprite', sprite: bx.icon, frame: bx.frame, x: B.iconX, y: (top + bottom) / 2, sx: B.iconScale, sy: B.iconScale });
      out.push({ component: 'text', font: B.titleFont, x: B.textX, y: top + B.titleDy, value: T(bx.title), color: B.titleColor });
      out.push({ component: 'text', font: B.bodyFont, x: B.textX, y: top + B.bodyDy, value: body, sep: B.sep, width: B.width });
      top = bottom + B.gap;
    }
    const f = doc.foot;
    out.push({ component: 'text', font: f.font, x: f.x, y: f.y, value: T(f.text), halign: 'center', valign: 'middle', color: f.color });
    for (const e of P.extra) out.push({ component: 'sprite', sprite: e.sprite, x: e.x, y: e.y, alpha: e.alpha });
    for (const o of out) for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return out;
  }

  /** Вершины страницы в list (VertexList кита); число листьев, которые кит не нарисовал. */
  function build(list, page, state = {}, view = {}, only = null) {
    let skipped = 0;
    for (const l of only ?? leaves(page, state, view)) {
      // кадр за пределами спрайта — по модулю числа кадров (П: star_map из 1 кадра, O рисует кадр 1 = кадр 0; как cards.mjs)
      const n = l.component === 'sprite' && l.frame ? skin.sprite(l.sprite).frames.length : 0;
      if (!drawLeaf(list, skin, n && l.frame >= n ? { ...l, frame: l.frame % n } : l)) skipped++;
    }
    return skipped;
  }

  return { leaves, build, pages: Object.keys(doc.pages) };
}
