// Окна значков «Stat Pages» и «Currencies» (этап 6.28): рамка и вкладки — кит (ui/screens/modals.mjs → statsWindow /
// currenciesWindow, этап 6.3), содержимое — секции со строками статов и строки кошелька из data/ui/stats.json. Источники чисел —
// oracle/sources.json → ui.stats628.
//
// Экран чисел не считает: значения строк — клетки сводки статов ядра (core/stats.mjs, makeStats → get) и входы сессии
// (процент прохождения игры, время игры / офлайна / престижа в секундах, предметов в сундуках). Экран только выбирает,
// какие строки видны (условие show строки), и пишет значение коротким форматом UI (ui/format/number.mjs, как у Workshop 4.3).
//
// Состояние: { stat(cell) — значение клетки сводки, completion, gameplaySeconds, offlineSeconds, prestigeSeconds, itemsInChests }.
// Вид: { page — открытая страница 0…2, tasksPanel — под окном панель заданий NPE (окно ниже на сдвиг кита) }.
//
// Части в порядке рисования O: окно (затемнение, панель, кнопка закрытия, вкладки страниц) → содержимое страницы: на каждую
// секцию подложка и текст заголовка, затем строки — полоса, значок, текст «Подпись: значение» (или заглушка «?» и тире).
import { drawSprite, drawText, fillRect, rgbOf, VertexList } from '../kit/prims.mjs';
import { makeShortFormat } from '../format/number.mjs';
import { makeModals } from './modals.mjs';

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * @param {object} doc   data/ui/stats.json
 * @param {object} deps  { kit (makeKit), kitDoc (data/ui/kit.json), skin, strings (data/strings.json → .strings), short (format.short) }
 */
export function makeStatsScreen(doc, { kit, kitDoc, skin, strings, short }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`stats screen: нет текста ${key}`);
    return s;
  };
  const st = (k) => { const s = doc.styles[`stats.${k}`]; if (!s) throw new Error(`stats screen: нет стиля stats.${k}`); return s; };
  const SEC = st('section'), FMT = st('format'), PAGES = st('pages');
  const fmt = makeShortFormat(short);
  const modals = makeModals(kit, kitDoc, strings);
  const winTop = (tasksPanel) => {
    const m = kitDoc.styles[kitDoc.styles['window.stats'].modal];
    return m.top + (tasksPanel ? m.tasksShift : 0);
  };

  /** Видна ли строка: always — всегда; {cell, gt} — клетка сводки больше порога. */
  function shown(item, state) {
    if (item.show === 'always') return true;
    return state.stat(item.show.cell) > item.show.gt;
  }

  /** Время «0d00h00m» из секунд: дни, часы и минуты вниз (?? дни без ведущих нулей — наблюдались только нули). */
  function timeText(sec) {
    const s = Math.max(0, Math.floor(sec));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return `${d}${FMT.time.d}${pad2(h)}${FMT.time.h}${pad2(m)}${FMT.time.m}`;
  }

  /** Текст значения строки. */
  function valueText(v, state) {
    if (v.input !== undefined) {
      const x = state[v.input];
      if (x === undefined) throw new Error(`stats screen: нет входа ${v.input}`);
      if (v.time) return timeText(x);
      return (v.prefix ? T(v.prefix) : '') + fmt(x) + (v.suffix ?? '');
    }
    const c = state.stat(v.cell);
    if (v.over !== undefined) return T(FMT.plus) + String(Math.round((c / v.over - 1) * 100)) + FMT.percent;
    let x = c;
    if (v.per !== undefined) x = v.per / c;
    if (v.mul !== undefined) x = v.mul * c;
    return fmt(x) + (v.suffixKey ? T(v.suffixKey) : v.suffix ?? '');
  }

  /** Строки содержимого страницы: [{section, slot, text, color, icon, empty}] — для проверки и для рисования. */
  function rowsOf(state, page) {
    const out = [];
    PAGES[page].forEach((s, si) => {
      const bySlot = new Map(s.items.map((it) => [it.slot, it]));
      for (let k = 0; k < s.rows; k++) {
        const it = bySlot.get(k);
        if (it && s.title && shown(it, state)) {
          out.push({ section: si, slot: k, icon: it.icon, color: it.color ?? SEC.row.color, iconColor: SEC.row.iconColor, text: T(it.label) + T(SEC.separator) + valueText(it.value, state) });
        } else out.push({ section: si, slot: k, icon: SEC.empty.icon, color: SEC.empty.color, iconColor: SEC.row.iconColor, text: T(SEC.empty.text), empty: true });
      }
    });
    return out;
  }

  /** Содержимое открытой страницы в list (окно сверху на top). */
  function content(list, state, page, top) {
    const rows = rowsOf(state, page);
    PAGES[page].forEach((s, si) => {
      const col = SEC.columns[s.col], ty = top + s.dy;
      const TT = SEC.title;
      drawSprite(list, skin, TT.backing, 0, s.cx, ty, s.sx, TT.sy, [255, 255, 255], 1);
      drawText(list, skin, { font: TT.font, x: s.cx + (s.textDx ?? 0), y: ty, text: s.title ? T(s.title) : T(TT.hidden), halign: 1, valign: 1,
        rgb: rgbOf(TT.color), alpha: 1, snap: true });
      const R = SEC.row;
      for (const r of rows.filter((x) => x.section === si)) {
        const c = ty + TT.firstRowDy + r.slot * s.pitch;
        fillRect(list, col.x1, c - s.up, col.x2, c + s.down, rgbOf(R.fills[r.slot % R.fills.length]), R.alpha);
        const rgb = rgbOf(r.color);
        drawSprite(list, skin, r.icon, 0, col.x1 + R.iconDx, c, 1, 1, rgbOf(r.iconColor), 1);
        drawText(list, skin, { font: R.font, x: col.x1 + R.textDx, y: c, text: r.text, halign: 0, valign: 1, rgb, alpha: 1, snap: true });
      }
    });
  }

  /** Части окна в порядке рисования: [имя, VertexList]. */
  function parts(state, view) {
    const win = new VertexList();
    const top = modals.statsWindow(win, { page: view.page, tasksPanel: !!view.tasksPanel });
    const body = new VertexList();
    content(body, state, view.page, top);
    return [['window', win], ['content', body]];
  }

  // ---------------------------------------------------------------- окно Currencies
  // Кошелёк: { ore[k], bar[k] — руды и слитки по номеру руды, chests, relicChests, mythicChests, divineChests, dronePoints, skillPoints,
  // chestsUnlocked — вкладка сундуков показывает строки (?? условие — см. ui.stats628.currencies) }.
  const CU = doc.styles['stats.currencies'];
  if (!CU) throw new Error('stats screen: нет стиля stats.currencies');
  const num = (x, what) => {
    if (typeof x !== 'number' || !Number.isFinite(x)) throw new Error(`stats screen: нет значения кошелька ${what}`);
    return fmt(x);
  };

  /** Строки окна Currencies на вкладке tab: [{pass: 'ores'|'chests', k, texts, covered}] — для проверки и для рисования. */
  function walletRows(wallet, tab) {
    const out = [];
    CU.ores.names.forEach((key, k) => {
      const o = wallet.ore[k], b = wallet.bar[k];
      out.push({ pass: 'ores', k, texts: [T(key), num(o, `ore[${k}]`), num(b, `bar[${k}]`)], covered: o === 0 && b === 0 });
    });
    if (tab === CU.chests.tab) {
      for (let k = 0; k < CU.chests.rows; k++) {
        const it = CU.chests.items[k];
        const on = !!it && !!wallet[CU.chests.show];
        out.push({ pass: 'chests', k, item: on ? it : null, texts: on ? [T(it.label) + T(SEC.separator) + num(wallet[it.value], it.value)] : [] });
      }
    }
    return out;
  }

  /** Содержимое окна Currencies в list (окно сверху на top). */
  function walletContent(list, wallet, tab, top) {
    const R = CU.rows, fill = rgbOf(R.fill), white = rgbOf(CU.color);
    const bar = (k) => fillRect(list, R.x1, top + R.dy1 + k * R.pitch, R.x2, top + R.dy2 + k * R.pitch, fill, 1);
    const text = (x, y, t) => drawText(list, skin, { font: CU.font, x, y, text: t, halign: 0, valign: 1, rgb: white, alpha: 1, snap: true });
    for (const r of walletRows(wallet, tab)) {
      const c = top + R.dy + r.k * R.pitch;
      bar(r.k);
      if (r.pass === 'ores') {
        const O = CU.ores;
        text(O.nameX, c, r.texts[0]);
        drawSprite(list, skin, O.ore.icon, r.k, O.ore.x, c, 1, 1, white, 1);
        text(O.ore.textX, c, r.texts[1]);
        drawSprite(list, skin, O.bar.icon, r.k, O.bar.x, c, 1, 1, white, 1);
        text(O.bar.textX, c, r.texts[2]);
        if (r.covered) bar(r.k);
      } else if (r.item) {
        drawSprite(list, skin, r.item.icon, 0, CU.chests.iconX, c, 1, 1, white, 1);
        text(CU.chests.textX, c, r.texts[0]);
      }
    }
  }

  /** Части окна Currencies: view — { tab (открытая вкладка), locked (закрытые вкладки), tasksPanel }. */
  function currenciesParts(wallet, view) {
    const win = new VertexList();
    const top = modals.currenciesWindow(win, { selected: view.tab, locked: view.locked ?? [], tasksPanel: !!view.tasksPanel });
    const body = new VertexList();
    walletContent(body, wallet, view.tab, top);
    return [['window', win], ['content', body]];
  }

  return { parts, rowsOf, valueText, timeText, top: winTop, currenciesParts, walletRows };
}
