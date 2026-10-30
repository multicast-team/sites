// UI-кит (этапы 4.1, 6.1, 6.3): панель, лейбл, кнопка, плашка уровня, заголовок секции, строка покупки, вкладки, полоса прогресса;
// 6.3 — рамка-фаска, модальное окно, вкладки-значки, тост, меню ☰ (Menu Options), лист-окно с кнопкой внизу;
// 6.5 — part (спрайт-часть) наружу для экранов, замена альфы у label и part (HUD: плашки руды).
// Стили — data/ui/kit.json; цвета стилей — '#rrggbb' или '@имя' из palette (6.1).
// Компонент = порядок примитивов (ui/kit/prims.mjs) + стиль из data/ui/kit.json (ключи skin, масштабы, смещения, цвета).
// Координаты стиля — смещения от якоря компонента; якорь задаёт экран (data/ui/<экран>.json, этап 4.3).
import { VertexList, drawSprite, drawSpritePart, drawText, fillRect, fillRoundRect, lineWidth, rgbOf } from './prims.mjs';

const ALIGN_H = { left: 0, center: 1, right: 2 };
const ALIGN_V = { top: 0, middle: 1, bottom: 2 };

/**
 * Палитра стилей (этап 6.1): строка «@имя» в любом поле стиля — цвет из kitDoc.palette. Подставляется один раз при сборке кита,
 * дальше компоненты видят только '#rrggbb'.
 */
export function resolvePalette(kitDoc) {
  const pal = kitDoc.palette || {};
  const walk = (v, where) => {
    if (typeof v === 'string' && v.startsWith('@')) {
      const c = pal[v.slice(1)];
      if (c === undefined) throw new Error(`kit: нет цвета ${v} в palette (${where})`);
      return c;
    }
    if (Array.isArray(v)) return v.map((x, k) => walk(x, `${where}[${k}]`));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, `${where}.${k}`)]));
    return v;
  };
  return { ...kitDoc, styles: walk(kitDoc.styles, 'styles') };
}

/** Стили кита из data/ui/kit.json: { palette?, styles: { id: {...} } }. */
export function makeKit(kitDocIn, skin) {
  const kitDoc = resolvePalette(kitDocIn);
  const st = (id) => {
    const s = kitDoc.styles[id];
    if (!s) throw new Error(`kit: нет стиля ${id}`);
    return s;
  };
  const textStyle = (id) => st(id);
  /** Ширина строки в px шрифта (сумма advance глифов). */
  const textWidth = (fontKey, text) => {
    const f = skin.font(fontKey);
    let w = 0;
    for (const ch of text) w += f.glyphs.get(ch.codePointAt(0))?.advance || 0;
    return w;
  };

  /** Лейбл: текст стиля id в (x, y); тень (если в стиле) рисуется первой, со смещением. color, alpha — замена цвета и альфы стиля (6.5). */
  function label(list, styleId, x, y, text, color, alpha) {
    const s = textStyle(styleId);
    const base = { font: s.font, halign: ALIGN_H[s.halign], valign: ALIGN_V[s.valign], alpha: alpha ?? s.alpha ?? 1, snap: s.snap, alphaRound: s.alphaRound,
      text, xscale: s.scale ?? 1, yscale: s.scale ?? 1 };
    if (s.shadow) drawText(list, skin, { ...base, x: x + s.shadow.dx, y: y + s.shadow.dy, rgb: rgbOf(s.shadow.color) });
    drawText(list, skin, { ...base, x, y, rgb: rgbOf(color ?? s.color) });
  }

  /** Спрайт-часть стиля: { sprite, frame?, dx, dy, sx, sy, color?, alpha? }; over — замена sprite, frame, color, alpha (6.5). */
  function part(list, p, x, y, over = {}) {
    drawSprite(list, skin, over.sprite ?? p.sprite, over.frame ?? p.frame ?? 0, x + p.dx, y + p.dy, p.sx, p.sy,
      rgbOf(over.color ?? p.color ?? '#ffffff'), over.alpha ?? p.alpha ?? 1);
  }

  /** Панель меню: затемнение + плитки текстуры шума; плитки сдвигаются прокруткой списка scroll (4.3), затемнение — нет. */
  function panel(list, styleId, scroll = 0) {
    const s = st(styleId);
    const r = s.fill;
    fillRect(list, r.x1, r.y1, r.x2, r.y2, rgbOf(r.color), r.alpha);
    const t = s.texture;
    for (let k = 0; k < t.count; k++)
      drawSprite(list, skin, t.sprite, 0, t.x + k * t.step.x, t.y + k * t.step.y - scroll, t.scale, t.scale, rgbOf(t.color), t.alpha);
  }

  /** Кнопка: nine-slice фон с оттенком и надпись; enabled выбирает пару цветов. */
  function button(list, styleId, x, y, text, enabled) {
    const s = st(styleId);
    const look = enabled ? s.enabled : s.disabled;
    part(list, s.body, x, y, { color: look.tint });
    label(list, s.label, x + s.labelDx, y + s.labelDy, text, look.text);
  }

  /** Плашка уровня «0/1»: две подложки и текст; backing — спрайт первой подложки (цвет секции мира, 4.3), иначе из стиля. */
  function badge(list, styleId, x, y, text, backing) {
    const s = st(styleId);
    s.parts.forEach((p, k) => part(list, p, x, y, k === 0 && backing ? { sprite: backing } : {}));
    label(list, s.label, x, y, text);
  }

  /** Заголовок секции: две линии по бокам и лейбл; color — цвет секции (линии и текст), по умолчанию из стиля. */
  function header(list, styleId, x, y, text, color) {
    const s = st(styleId);
    for (const ln of s.lines) lineWidth(list, x + ln.x1, y + ln.dy, x + ln.x2, y + ln.dy, ln.width, rgbOf(color ?? ln.color), ln.alpha);
    label(list, s.label, x, y, text, color);
  }

  /**
   * Строка покупки. row: { backing?, icon, overlay?, title?, costs: [{ text, frame, affordable }], canBuy, buyText, level?, locks: [текст…], maxed? }.
   * maxed — строка на капе (4.3): после значка — кнопка стиля maxed.button и текст title стиля maxed.text, затем замки (6.19).
   * level и title — только у открытой строки (у закрытой их нет: она под замком).
   * Порядок (как у O): плашка уровня над строкой → фон → поле описания → иконка → значок поверх → кнопка → рамка заголовка →
   * заголовок → тексты цен → иконки цен → замки (каждый: серый фон, серое поле, текст).
   */
  function buyRow(list, styleId, x, y, row) {
    const s = st(styleId);
    const backing = row.backing ?? s.backing.sprite;
    if (row.level != null) badge(list, s.badge.style, x + s.badge.dx, y + s.badge.dy, row.level, row.backing);
    part(list, s.backing, x, y, { sprite: backing });
    part(list, s.desc, x, y);
    part(list, s.icon, x, y, { sprite: row.icon });
    if (row.overlay) part(list, s.overlay, x, y, { sprite: row.overlay });
    if (row.maxed) {
      // строка на капе (этап 4.3): зелёная кнопка и текст «на капе» по центру поля описания; без рамки заголовка, цен и замков
      button(list, s.maxed.button, x + s.button.dx, y + s.button.dy, row.buyText, true);
      label(list, s.maxed.text.style, x + s.maxed.text.dx, y + s.maxed.text.dy, row.title);
      lockPlates(list, s, x, y, row.locks, backing);   // 6.19: строка на капе под замком — плашки замков поверх
      return;
    }
    button(list, s.button.style, x + s.button.dx, y + s.button.dy, row.buyText, row.canBuy);
    if (row.title != null) {
      for (const p of s.titleBox) part(list, p, x, y, p.sprite ? {} : { sprite: backing });   // без sprite — подложка секции (4.3)
      // длинный заголовок (шире fitWidth в шрифте стиля) — меньшим шрифтом smallStyle (4.3)
      const ts = s.title.fitWidth !== undefined && textWidth(textStyle(s.title.style).font, row.title) > s.title.fitWidth ? s.title.smallStyle : s.title.style;
      label(list, ts, x + s.title.dx, y + s.title.dy, row.title);
    }
    row.costs.forEach((c, k) => {
      const col = s.costs.columns[k];
      label(list, s.costs.style, x + col.textDx, y + s.costs.textDy, c.text, c.affordable ? s.costs.colorYes : s.costs.colorNo);
    });
    row.costs.forEach((c, k) => {
      const col = s.costs.columns[k];
      part(list, { ...s.costs.icon, dx: col.iconDx }, x, y, { frame: c.frame });
    });
    lockPlates(list, s, x, y, row.locks, backing);
  }

  /** Плашки замков строки: каждая — серый фон, серое поле, текст. */
  function lockPlates(list, s, x, y, locks, backing) {
    for (const text of locks || []) {
      for (const p of s.lock.parts) part(list, p, x, y, p.sprite ? {} : { sprite: backing });
      label(list, s.lock.label, x, y, text);
    }
  }

  /** Полоса прокрутки: ползунок от y1 до y2 (края включительно, дробный низ — как у прямоугольника). */
  function scrollThumb(list, styleId, y1, y2) {
    const s = st(styleId);
    fillRect(list, s.x1, y1, s.x2, y2, rgbOf(s.color), s.alpha);
  }

  /** Полоса подзаголовка: прямоугольники и текст по центру; y — якорь (центр текста), y стиля — смещения от него. */
  function subtitleBar(list, styleId, text, y) {
    const s = st(styleId);
    for (const r of s.rects) fillRect(list, r.x1, y + r.y1, r.x2, y + r.y2, rgbOf(r.color), r.alpha ?? 1);
    label(list, s.label, s.textX, y + s.textY, text);
  }

  /** Кнопка-значок «☰»: nine-slice фон и полоски прямоугольниками (смещения от центра кнопки). */
  function menuButton(list, styleId, x, y) {
    const s = st(styleId);
    part(list, s.body, x, y);
    for (const r of s.bars) fillRect(list, x + r.x1, y + r.y1, x + r.x2, y + r.y2, rgbOf(r.color), r.alpha ?? 1);
  }

  /**
   * Вкладки (этап 6.1): подложка-прямоугольники, необязательная подпись (плашка + лейбл), затем вкладки в ряд.
   * (x, y) — якорь ряда; caption — текст подписи; вкладка k — в (x + first.dx + k·step.x, y + first.dy + k·step.y). selected — номер выбранной (или −1).
   * Вид вкладки: normal / selected — спрайт тела (если задан), оттенок тела и цвет текста.
   */
  function tabs(list, styleId, x, y, labels, selected, caption) {
    const s = st(styleId);
    for (const r of s.rects || []) fillRect(list, x + r.x1, y + r.y1, x + r.x2, y + r.y2, rgbOf(r.color), r.alpha ?? 1);
    if (s.caption) {
      for (const p of s.caption.parts) part(list, p, x, y);
      label(list, s.caption.label, x + s.caption.labelDx, y + s.caption.labelDy, caption);
    }
    labels.forEach((text, k) => {
      const look = k === selected ? s.selected : s.normal;
      const tx = x + s.first.dx + k * s.step.x, ty = y + s.first.dy + k * s.step.y;
      part(list, s.body, tx, ty, { sprite: look.sprite, color: look.tint });
      label(list, s.label, tx + s.labelDx, ty + s.labelDy, text, look.text);
    });
  }

  /**
   * Полоса прогресса (этап 6.1): фон, заполнение частью спрайта длиной fill.length · p (spec sprite-layout п.7), шапка, подпись.
   * (x, y) — якорь; bg с w/h — тоже часть спрайта, иначе целый кадр. axis 'x' — длина по ширине, 'y' — по высоте.
   * cap — спрайт, который едет за краем заполнения: y = якорь + cap.dy − длина · fill.sy (у вертикальной колбы).
   */
  function progress(list, styleId, x, y, p, text) {
    const s = st(styleId);
    const white = [255, 255, 255];
    const b = s.bg;
    if (b) {
      if (b.w !== undefined) drawSpritePart(list, skin, b.sprite, b.frame ?? 0, 0, 0, b.w, b.h, x + b.dx, y + b.dy, b.sx, b.sy, 0, rgbOf(b.color ?? '#ffffff'), b.alpha ?? 1);
      else part(list, b, x, y);
    }
    const f = s.fill;
    const len = f.length * p;
    const [w, h] = f.axis === 'y' ? [f.thickness, len] : [len, f.thickness];
    drawSpritePart(list, skin, f.sprite, f.frame ?? 0, 0, 0, w, h, x + f.dx, y + f.dy, f.sx, f.sy, f.angle ?? 0, f.color ? rgbOf(f.color) : white, f.alpha ?? 1);
    if (s.cap) part(list, s.cap, x, y - len * f.sy);
    if (s.label && text != null) label(list, s.label.style, x + s.label.dx, y + s.label.dy, text);
  }

  // ---------------- этап 6.3: модальные окна, ☰, тосты ----------------

  /** Рамка-фаска: прямоугольники стиля, края которых сдвинуты на (dx1, dy1, dx2, dy2) от (x1, y1, x2, y2); alpha — замена альфы (6.5). */
  function box(list, styleId, x1, y1, x2, y2, alpha) {
    for (const r of st(styleId).rects) fillRect(list, x1 + r.dx1, y1 + r.dy1, x2 + r.dx2, y2 + r.dy2, rgbOf(r.color), alpha ?? r.alpha ?? 1);
  }

  /** Закрашенный прямоугольник (края включительно) цветом '#rrggbb' (6.5: полосы HUD). */
  function rect(list, x1, y1, x2, y2, color, alpha = 1) {
    fillRect(list, x1, y1, x2, y2, rgbOf(color), alpha);
  }

  /** Модальное окно: затемнение, панель, кнопка закрытия (фаска, тело, значок). top — верх области окна, dy стиля — от него. */
  function modal(list, styleId, top) {
    const s = st(styleId);
    const o = s.overlay;
    fillRect(list, o.x1, top + o.dy1, o.x2, o.y2, rgbOf(o.color), o.alpha ?? 1);   // низ затемнения — от комнаты, не от top
    part(list, s.panel, 0, top);
    const c = s.close;
    box(list, c.box, c.x1, top + c.dy1, c.x2, top + c.dy2);
    part(list, c.body, 0, top);
    part(list, c.icon, 0, top);
  }

  /**
   * Вкладки-значки (окно валют): подложка и подпись как у tabs, вкладка — тело и значок icons[k] = {sprite, frame?}.
   * Вид: locked (номер в locked) → selected → normal; у вида оттенок тела tint и цвет значка icon.
   */
  function iconTabs(list, styleId, x, y, icons, selected, locked = [], caption = null) {
    const s = st(styleId);
    for (const r of s.rects || []) fillRect(list, x + r.x1, y + r.y1, x + r.x2, y + r.y2, rgbOf(r.color), r.alpha ?? 1);
    if (s.caption) {
      for (const p of s.caption.parts) part(list, p, x, y);
      label(list, s.caption.label, x + s.caption.labelDx, y + s.caption.labelDy, caption);
    }
    icons.forEach((ic, k) => {
      const look = locked.includes(k) ? s.locked : k === selected ? s.selected : s.normal;
      const tx = x + s.first.dx + k * s.step.x, ty = y + s.first.dy + k * s.step.y;
      part(list, s.body, tx, ty, { color: look.tint });
      part(list, s.icon, tx, ty, { sprite: ic.sprite, frame: ic.frame ?? 0, color: look.icon });
    });
  }

  /** Тост: полоса во всю ширину с альфой alpha, текст по центру (альфа · textAlphaMul), значок. y — центр полосы. */
  function toast(list, styleId, y, text, alpha) {
    const s = st(styleId);
    const b = s.band;
    fillRect(list, b.x1, y + b.dy1, b.x2, y + b.dy2, rgbOf(b.color), alpha);
    const t = textStyle(s.label);
    drawText(list, skin, { font: t.font, x: s.textX, y, text, halign: ALIGN_H[t.halign], valign: ALIGN_V[t.valign], rgb: rgbOf(t.color),
      alpha: alpha * s.textAlphaMul, snap: t.snap, xscale: 1, yscale: 1 });
    const ic = s.icon;
    drawSprite(list, skin, ic.sprite, ic.frame ?? 0, ic.dx, y + ic.dy, ic.sx, ic.sy, rgbOf(ic.color ?? '#ffffff'), alpha);
  }

  /**
   * Меню ☰ открыто: кнопка (вид «открыто»), скруглённая панель, подпись, строки-флажки rows = [{text, checked}].
   * Рамку панели (полоса линий, цвет panel.outline) кит не рисует — VertexList только треугольники.
   */
  function menuOptions(list, styleId, caption, rows) {
    const s = st(styleId);
    menuButton(list, s.button, s.buttonX, s.buttonY);
    const p = s.panel;
    // правый край панели — по самой длинной строке: labelX + ширина текста (шрифт стиля строки) + padRight
    const wMax = Math.max(0, ...rows.map((r) => textWidth(textStyle(s.row.label).font, r.text)));
    fillRoundRect(list, p.x1, p.y1, s.row.labelX + wMax + p.padRight, p.y2, p.xrad, p.yrad, rgbOf(p.color), p.alpha);
    label(list, s.caption.style, s.caption.x, s.caption.y, caption);
    rows.forEach((r, k) => {
      const dy = k * s.row.step;
      part(list, s.row.check, 0, dy, { frame: r.checked ? 1 : 0 });
      label(list, s.row.label, s.row.labelX, s.row.labelY + dy, r.text);
    });
  }

  /**
   * Лист-окно: sheet — затемнение и фаска frame; sheetInner — тёмное поле; sheetButton — кнопка внизу. У O между ними рисуется
   * содержимое листа (шапка, строки), поэтому части вызываются отдельно, в порядке рисования.
   */
  function sheet(list, styleId) {
    const s = st(styleId);
    const o = s.overlay;
    fillRect(list, o.x1, o.y1, o.x2, o.y2, rgbOf(o.color), o.alpha ?? 1);
    box(list, s.box, ...s.frame);
  }

  function sheetInner(list, styleId) {
    const r = st(styleId).inner;
    fillRect(list, r.x1, r.y1, r.x2, r.y2, rgbOf(r.color), r.alpha ?? 1);
  }

  function sheetButton(list, styleId, text) {
    const b = st(styleId).button;
    part(list, b.body, 0, 0);
    label(list, b.label, b.labelX, b.labelY, text);
  }

  // окно отсечения спрайтов: окно вида, расширенное на cullMargin, и запас радиуса cullPad (spec sprite-layout п.6)
  const v = kitDoc.view, m = v.cullMargin;
  const cullRect = [v.x1 - m, v.y1 - m, v.x2 + m, v.y2 + m];
  return { label, part, panel, button, badge, header, buyRow, scrollThumb, subtitleBar, menuButton, tabs, progress, textWidth,
    box, rect, modal, iconTabs, toast, menuOptions, sheet, sheetInner, sheetButton,
    newList: () => new VertexList(cullRect, v.cullPad) };
}
