// Экран «Настройки» (этап 6.26): вкладки All / General / Gameplay / Display / Offline / Menus.
// Вёрстка — data/ui/options.json (секции со строками-флажками, шаги списка, ползунок, вкладки кита tabs.options, нижняя панель
// ссылок); листья рисует ui/kit/table.mjs (drawLeaf) на примитивах кита. Источники чисел — oracle/sources.json → ui.options626.
//
// Состояние: { obelisk — уровень обелиска (пороги строк minObelisk), checked — id отмеченных строк, notation — номер нотации,
//              notationDigits — доп. цифры (0…3) }.
// Вид: { tab — id вкладки (data/ui/options.json → tabs.ids), tasksPanel — над меню панель заданий NPE (список, ползунок и вкладки
//        ниже на top.tasksPanel px; фон и нижняя панель не сдвигаются) }.
// Порядок рисования: фон → ползунок → секции и строки → строка «More options…» → вкладки → нижняя панель.
import { expandTable, drawLeaf } from '../kit/table.mjs';

/**
 * @param {object} doc   data/ui/options.json
 * @param {object} deps  { kit (ui/kit makeKit), skin, strings (data/strings.json → .strings) }
 */
export function makeOptionsScreen(doc, { kit, skin, strings }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`options screen: нет текста ${key}`);
    return s;
  };
  const L = doc.list;

  /** Подстановка полей шаблона: "@имя" → значение из subst; лист с only ≠ вид строки — выкидывается. */
  function fill(node, subst, kind) {
    const children = [];
    for (const ch of node.children) {
      if (ch.only !== undefined && ch.only !== kind) continue;
      const out = { ...ch };
      delete out.only;
      for (const [k, v] of Object.entries(out)) if (typeof v === 'string' && v[0] === '@') out[k] = subst[v.slice(1)];
      if (out.value !== undefined) delete out.text;
      children.push(out);
    }
    return { component: 'group', children };
  }

  const visible = (row, obelisk) => (row.minObelisk ?? 0) <= obelisk;

  /** Текст строки по виду: флажок — ключ строки; нотация — название + образец; цифры — ключ по числу. */
  function rowText(row, state) {
    if (row.kind === 'notation') {
      const n = state.notation ?? 0;
      const sample = doc.notation.samples[n];
      if (sample === undefined) throw new Error(`options screen: нет образца нотации ${n}`);
      return { value: T(doc.notation.names[n]) + sample };
    }
    if (row.kind === 'digits') return { text: doc.notation.digits[state.notationDigits ?? 0] };
    return { text: row.text };
  }

  /**
   * Раскладка вкладки: секции вкладки (All — все), строки с порогом ≤ уровня; секция без видимых строк не показывается.
   * y — от начала списка без сдвига панели заданий. Возвращает элементы, y строки «More options…» (или null) и конец содержимого.
   */
  function layout(state, tab) {
    const items = [];
    let y = L.y, next = Infinity, any = false;
    for (const sec of doc.sections) {
      if (tab !== 'all' && sec.tab !== tab) continue;
      for (const r of sec.rows) if (!visible(r, state.obelisk) && r.minObelisk < next) next = r.minObelisk;
      const rows = sec.rows.filter((r) => visible(r, state.obelisk));
      if (!rows.length) continue;
      if (any) y += L.rowToHeader - L.rowStep;
      any = true;
      items.push({ kind: 'header', sec, y });
      y += L.headerToRow;
      for (const r of rows) {
        items.push({ kind: 'row', sec, row: r, y });
        y += L.rowStep;
      }
    }
    // y — курсор после последней строки; строка «More options…» стоит на курсоре
    const footer = next < Infinity ? { y, level: next } : null;
    const end = footer ? y + L.footerAfter : y;
    return { items, footer, end };
  }

  /** Ползунок: [y1, y2]. Высота содержимого H = конец + pad; видимая высота view − top; H ≤ видимой → вся дорожка. */
  function thumbSpan(end, top) {
    const s = doc.scroll;
    const t0 = s.trackTop + top;
    const H = end + s.pad, V = s.view - top;
    if (H <= V) return [t0, s.trackBottom];
    return [t0, t0 + (s.trackBottom - t0) * V / H];
  }

  const draw = (out, node, ox = 0, oy = 0) => {
    for (const leaf of expandTable(node, strings, ox, oy)) drawLeaf(out, skin, leaf);
  };

  /** Список вершин экрана (порядок O). */
  function build(state, view = {}) {
    const tab = view.tab ?? 'all';
    const tabIndex = doc.tabs.ids.indexOf(tab);
    if (tabIndex < 0) throw new Error(`options screen: нет вкладки ${tab}`);
    const top = view.tasksPanel ? doc.top.tasksPanel : 0;
    const checked = new Set(state.checked ?? []);
    const { items, footer, end } = layout(state, tab);
    const out = kit.newList();
    draw(out, doc.backdrop);
    const [y1, y2] = thumbSpan(end, top);
    const s = doc.scroll;
    draw(out, { component: 'rect', x1: s.x1, y1, x2: s.x2, y2, color: s.color, alpha: s.alpha });
    for (const it of items) {
      if (it.kind === 'header') draw(out, fill(doc.header, { icon: it.sec.icon, label: it.sec.label }), 0, it.y + top);
      else {
        const kind = it.row.kind ? 'cycle' : 'check';
        const node = fill(doc.row, { checked: checked.has(it.row.id) ? 1 : 0, ...rowText(it.row, state) }, kind);
        const txt = rowText(it.row, state);
        // текст строки — ключом или значением (нотация)
        const last = node.children[node.children.length - 1];
        if (txt.value !== undefined) { delete last.text; last.value = txt.value; } else last.text = txt.text;
        draw(out, node, 0, it.y + top);
      }
    }
    if (footer) draw(out, { ...doc.footer, text: undefined, value: T(doc.footer.text) + footer.level }, 0, footer.y + top);
    kit.tabs(out, doc.tabs.style, doc.tabs.x, doc.tabs.y + top, doc.tabs.labels.map(T), tabIndex);
    draw(out, doc.bottom);
    return out;
  }

  return { build, layout, thumbSpan };
}
