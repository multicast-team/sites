// Экран «Журнал» (этап 6.27): вёрстка data/ui/logs.json из примитивов кита + привязки к журналам ядра (core/logs.mjs).
//
// Экран чисел не знает: строки журнала отладки (уровень, время, текст) и записи журнала игрока отдаёт ядро; экран раскладывает
// их на поверхности списка и рисует рамку меню. Состояние: { logs — журналы ядра (makeLogs) }. Вид: { tab — 'logs' | 'debug',
// filter — группа фильтра журнала игрока ('all', 'milestone', 'general', 'gemSpend', 'giftLoot'), scroll — смещение списка (≥ 0) }.
//
// Части — в порядке рисования O: фон меню → панель → поверхность (содержимое в координатах поверхности) → кадр поверхности →
// ползунок → нижние вкладки → фильтры (только на вкладке Logs). Рамки вкладок и ползунка — линии без ширины (режим линий):
// кит их пока не рисует (тот же пробел, что у меню ☰ 6.3), они в части не входят.
import { drawSprite, drawText, fillRect, rgbOf, VertexList } from '../kit/prims.mjs';

const H = { left: 0, center: 1, right: 2 };
const V = { top: 0, middle: 1, bottom: 2 };
const f = Math.fround;

/**
 * @param {object} doc   data/ui/logs.json
 * @param {object} deps  { kit (makeKit), skin, strings (data/strings.json → .strings) }
 */
export function makeLogsScreen(doc, { kit, skin, strings }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`logs screen: нет текста ${key}`);
    return s;
  };
  const st = (k) => { const s = doc.styles[`logs.${k}`]; if (!s) throw new Error(`logs screen: нет стиля logs.${k}`); return s; };
  const EN = st('entries'), AG = EN.age;
  const S = st('surface'), D = st('debug'), E = st('empty'), B = st('scrollbar'), TB = st('tabs'), FL = st('filters'), P = st('panel');
  const font = (k) => skin.font(k);

  /** Число строк текста строки журнала отладки после переноса по ширине (как у drawText с width). */
  function debugLines(text) {
    const fnt = font(D.font);
    let lines = 0;
    for (const para of String(text).split('\n')) lines += wrapCount(fnt, para, D.text.width);
    return lines;
  }

  /** Раскладка строк журнала отладки на поверхности: [{y1, y2, color, text, rgb}] (y — до прокрутки). */
  function layoutDebug(lines) {
    const out = [];
    let y = D.top;
    lines.forEach((ln, k) => {
      const n = debugLines(ln.line);
      const y2 = y + n * D.text.sep + D.text.pad;
      out.push({ y1: y, y2, fill: D.row.colors[k % D.row.colors.length], rgb: D.levels[ln.level] ?? D.levels.info, text: ln.line });
      y = y2 + D.gap;
    });
    return { rows: out, height: y };
  }

  /** Содержимое поверхности (координаты поверхности 0…w × 0…h). */
  function surfaceContent(list, state, view) {
    const scroll = view.scroll ?? 0;
    if (view.tab === 'debug') {
      const { rows } = layoutDebug(state.logs.debugLines());
      for (const r of rows) {
        const y1 = r.y1 - scroll, y2 = r.y2 - scroll;
        fillRect(list, D.x1, y1, D.x2, y2, rgbOf(r.fill), D.row.alpha);
        drawText(list, skin, { font: D.font, x: D.x1 + D.text.dx, y: y1 + D.text.dy, text: r.text, halign: 0, valign: 0,
          rgb: rgbOf(r.rgb), alpha: 1, snap: true, sep: D.text.sep, width: D.text.width });
      }
      return;
    }
    const entries = state.logs.entries(view.filter ?? 'all');
    if (entries.length === 0) {
      drawText(list, skin, { font: E.font, x: E.x, y: E.y, text: T(E.text), halign: H[E.halign], valign: V[E.valign], rgb: rgbOf(E.color), alpha: 1, snap: true });
      return;
    }
    const { rows } = layoutEntries(entries, state.logs.now());
    for (const r of rows) {
      const y1 = r.y1 - scroll, y2 = r.y2 - scroll;
      fillRect(list, EN.x1, y1, EN.x2, y2, rgbOf(r.fill), EN.row.alpha);
      if (r.icon) drawSprite(list, skin, r.icon, 0, EN.icon.dx, y1 + EN.icon.dy, 1, 1, [255, 255, 255], 1);
      // текст записи — Scribble Jr (scribbleText): кит его не рисует, вершин здесь нет
      // подпись времени — под текстом записи: сдвиг на (строк − 1) · lineStep (record627 ev1-long2/long/long4/long5g: 2…5 строк)
      const A = EN.age, ay = y1 + A.dy + (r.lines - 1) * EN.lineStep, base = { font: A.font, text: r.age, halign: 0, valign: 0, alpha: 1, snap: true };
      for (const [dx, dy] of A.outline.offsets) drawText(list, skin, { ...base, x: A.dx + dx, y: ay + dy, rgb: rgbOf(A.outline.color) });
      drawText(list, skin, { ...base, x: A.dx, y: ay, rgb: rgbOf(A.color) });
    }
  }

  /** Число строк текста записи после переноса (шрифт Scribble Jr, ширина text.width; у строки со значком первая строка с отступом
   *  text.iconIndent пробелов — record627 ev1-long5g: первый глиф на x 27, следующие строки с 0). */
  function entryLines(text, icon) {
    const fnt = font(EN.text.font);
    let n = 0;
    String(text).split('\n').forEach((para, k) => { n += wrapCount(fnt, para, EN.text.width, icon && k === 0 ? ' '.repeat(EN.text.iconIndent) : ''); });
    return n;
  }

  /** Подпись времени записи: у групп с датой — «Месяц Д ЧЧ:ММ» (UTC), иначе по возрасту (правила ageRules: первое с age < below). */
  function ageText(e, now) {
    const A = AG;
    if (A.dateGroups.includes(e.group)) {
      const d = new Date(Math.floor(e.time) * 1000);
      const p2 = (v) => String(v).padStart(2, '0');
      return `${T(A.months[d.getUTCMonth()])} ${d.getUTCDate()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
    }
    const age = Math.max(0, now - e.time);
    const rule = A.rules.find((r) => r.below === undefined || age < r.below);
    if (rule.text) return T(rule.text);
    return `${Math.floor(age / rule.div)}${T(rule.suffix)}`;
  }

  /** Раскладка строк журнала игрока: [{y1, y2, fill, icon, group, text, lines, age}] (y — до прокрутки). */
  function layoutEntries(entries, now) {
    const rows = [];
    let y = EN.top;
    entries.forEach((e, k) => {
      const icon = EN.icon.sprites[e.group] ?? null, lines = entryLines(e.text, !!icon);
      const y2 = y + EN.height + (lines - 1) * EN.lineStep;
      rows.push({ y1: y, y2, fill: EN.row.colors[k % EN.row.colors.length], icon, group: e.group,
        text: e.text, lines, age: ageText(e, now) });
      y = y2;
    });
    return { rows, height: y };
  }

  /** Текст записей, который O рисует Scribble Jr (кит его не рисует): позиция текста на поверхности и смещения обводки — для сверки. */
  function scribbleText(state, view = {}) {
    const v = { tab: 'logs', filter: 'all', scroll: 0, ...view };
    if (v.tab === 'debug') return [];
    const { rows } = layoutEntries(state.logs.entries(v.filter), state.logs.now());
    return rows.map((r) => ({ group: r.group, text: r.text, lines: r.lines, x: EN.text.dx, y: r.y1 - v.scroll + EN.text.dy,
      x0: r.icon ? EN.text.iconX : 0, outline: EN.text.outline }));
  }

  /** Кадр поверхности: квадрат x…x+w × y…y+h, uv 0…1, белый (атлас — поверхность, не skin: atlas −1). */
  function surfaceQuad(list) {
    const l = f(S.x), t = f(S.y), r = f(S.x + S.w), b = f(S.y + S.h);
    list.quad([[l, t, 0, 0], [r, t, 1, 0], [r, b, 1, 1], [l, b, 0, 1]], [0, 1, 2, 2, 3, 0], () => 0xffffffff, -1);
  }

  /** Ползунок: дорожка и бегунок; длина бегунка — доля видимой части (?? при списке длиннее поверхности — не снято). */
  function scrollbar(list, state, view) {
    let y1 = B.y1, y2 = B.y2;
    if (view.tab === 'debug') {
      const { height } = layoutDebug(state.logs.debugLines());
      if (height > S.h) {
        const len = (B.y2 - B.y1) * S.h / height;
        y1 = B.y1 + (view.scroll ?? 0) * ((B.y2 - B.y1) - len) / (height - S.h);
        y2 = y1 + len;
      }
    }
    fillRect(list, B.track.x1, B.y1, B.track.x2, B.y2, rgbOf(B.track.color), B.track.alpha);
    fillRect(list, B.thumb.x1, y1, B.thumb.x2, y2, rgbOf(B.thumb.color), B.thumb.alpha);
  }

  /** Нижние вкладки: невыбранные раньше выбранной (порядок O); у каждой — заливка и текст с тенью. */
  function tabs(list, view) {
    const sel = view.tab === 'debug' ? 1 : 0;
    const order = TB.labels.map((_, k) => k).filter((k) => k !== sel).concat([sel]);
    for (const k of order) {
      const st = k === sel ? TB.selected : TB.idle;
      const x1 = TB.edges[k], x2 = TB.edges[k + 1];
      fillRect(list, x1, TB.y1, x2, st.bottom, rgbOf(st.fill), 1);
      const cx = (x1 + x2) / 2, cy = TB.y1 + st.textDy;
      const base = { font: TB.font, text: T(TB.labels[k]), halign: 1, valign: 1, alpha: 1, snap: true };
      drawText(list, skin, { ...base, x: cx + TB.shadow.dx, y: cy + TB.shadow.dy, rgb: rgbOf(TB.shadow.color) });
      drawText(list, skin, { ...base, x: cx, y: cy, rgb: rgbOf(st.color) });
    }
  }

  /** Фильтры журнала игрока: кнопки в ряд с шагом; выбранная — серым оттенком (кнопка и текст). */
  function filters(list, view) {
    const selected = FL.groups.indexOf(view.filter ?? 'all');
    FL.labels.forEach((key, k) => {
      const x = FL.x + k * FL.step, y = FL.y;
      const col = rgbOf(k === selected ? FL.selectedColor : FL.color);
      drawSprite(list, skin, FL.button.sprite, 0, x, y, FL.button.sx, FL.button.sy, col, 1);
      const base = { font: FL.font, text: T(key), halign: 1, valign: 1, alpha: 1, snap: true };
      drawText(list, skin, { ...base, x: x + FL.shadow.dx, y: y + FL.shadow.dy, rgb: rgbOf(FL.shadow.color) });
      drawText(list, skin, { ...base, x: x + FL.text.dx, y: y + FL.text.dy, rgb: col });
    });
  }

  /** Части экрана в порядке рисования O: [[имя, список вершин]]. */
  function parts(state, view = {}) {
    const v = { tab: 'logs', filter: 'all', scroll: 0, ...view };
    const out = [];
    const L = () => kit.newList();
    const back = L(); kit.panel(back, st('backdrop').style); out.push(['фон', back]);
    const pan = L(); drawSprite(pan, skin, P.sprite, 0, P.x, P.y, P.sx, P.sy, [255, 255, 255], 1); out.push(['панель', pan]);
    const surf = new VertexList([0, 0, S.w, S.h]); surfaceContent(surf, state, v); out.push(['поверхность', surf]);
    const quad = L(); surfaceQuad(quad); out.push(['кадр поверхности', quad]);
    const bar = L(); scrollbar(bar, state, v); out.push(['ползунок', bar]);
    const tb = L(); tabs(tb, v); out.push(['вкладки', tb]);
    if (v.tab !== 'debug') { const fl = L(); filters(fl, v); out.push(['фильтры', fl]); }
    return out;
  }

  /** Все вершины экрана одним списком (порядок частей). */
  function build(state, view = {}) {
    const all = kit.newList();
    for (const [, l] of parts(state, view)) for (let k = 0; k < l.count; k++) all.push(l.x[k], l.y[k], l.u[k], l.v[k], l.rgba[k], l.atlas[k]);
    return all;
  }

  return { parts, build, layoutDebug, debugLines, layoutEntries, scribbleText };
}

/** Число строк после переноса по словам на ширину width — то же правило, что у drawText с width (spec text-layout).
 *  prefix — отступ первой строки (пробелы перед текстом: у записи со значком), входит в её ширину. */
function wrapCount(font, line, width, prefix = '') {
  const w = (s) => [...s].reduce((a, ch) => a + (font.glyphs.get(ch.codePointAt(0))?.advance || 0), 0);
  let n = 1, cur = prefix, empty = true;
  for (const word of line.split(' ')) {
    const next = empty ? cur + word : cur + ' ' + word;
    if (!empty && w(next) > width) { n++; cur = word; } else { cur = next; empty = false; }
  }
  return n;
}
