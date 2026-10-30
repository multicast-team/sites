// Меню обелиска, вкладка Unlocks (этап 6.17): вёрстка data/ui/obelisk-unlocks.json + список открытий data/systems/obelisk-unlocks.json
// + правила ядра обелиска (core/obelisk.mjs: следующий уровень открытия, есть неполученная награда — жёлтая метка вкладки Rewards).
//
// Экран не рисует записи O: группы открытий собираются из компонентов вёрстки (растянутые патчи, спрайты, тексты, прямоугольники)
// по уровню обелиска игрока и рисуются рисовальщиком таблиц кита (ui/kit/table.mjs); метка — примитивом кита fillCircle.
//
// Состояние: { level (уровень обелиска), claimed (получено наград), scroll (прокрутка списка, px; вход), scrollbar: { y1, y2 } | null (ползунок; вход) }.
// Список: группы уровней 1…level, у которых есть открытия (ячейки — по порядку видов doc.kindOrder, внутри вида — по строкам данных), затем закрытая группа уровня
// core.nextUnlockLevel(level) («?» и «???»), если он есть.
import { drawLeaf } from '../kit/table.mjs';
import { fillCircle, rgbOf } from '../kit/prims.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} doc   data/ui/obelisk-unlocks.json
 * @param {object} deps  { kitDoc: data/ui/kit.json (палитра разрешена), strings: data/strings.json → .strings, skin,
 *                         unlocks: data/systems/obelisk-unlocks.json, core: makeObelisk(…) }
 */
export function makeObeliskUnlocksScreen(doc, { kitDoc, strings, skin, unlocks, core }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`obelisk-unlocks: нет текста ${key}`);
    return s;
  };
  const byLevel = new Map();
  for (const u of tableRows(unlocks.tables.unlockList)) {
    if (!byLevel.has(u.level)) byLevel.set(u.level, []);
    byLevel.get(u.level).push(u);
  }
  // ячейки группы — по порядку видов doc.kindOrder, внутри вида — по порядку строк данных (сортировка устойчивая)
  const rank = (k) => {
    const i = doc.kindOrder.indexOf(k);
    if (i < 0) throw new Error(`obelisk-unlocks: вида ${k} нет в kindOrder`);
    return i;
  };
  for (const cells of byLevel.values()) cells.sort((a, b) => rank(a.kind) - rank(b.kind));

  const textWidth = (font, s) => {
    const f = skin.font(font);
    return [...s].reduce((a, ch) => a + (f.glyphs.get(ch.codePointAt(0))?.advance ?? 0), 0);
  };
  /** Число строк текста при переносе по словам на ширине width (жадно, по пробелам; \n — новая строка). Только для выбора шрифта. */
  const lineCount = (font, s, width) => s.split('\n').reduce((n, line) => {
    let k = 1, cur = '';
    for (const w of line.split(' ')) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && textWidth(font, t) > width) { k++; cur = w; } else cur = t;
    }
    return n + k;
  }, 0);
  const at = (tpl, over = {}, dx = 0, dy = 0) => {
    const o = { ...tpl, ...over };
    delete o.shadow; delete o.fitSize; delete o.pad; delete o.inset; delete o.step; delete o.fit;
    if (o.component === 'rect') { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; } else { o.x += dx; o.y += dy; }
    if (o.text !== undefined && o.value === undefined) o.value = T(o.text);
    delete o.text;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return o;
  };
  /** Текст с тенью: тень (dx, dy) чёрная, затем текст. */
  const shadowed = (out, tpl, over, x, y, color) => {
    const [sx, sy] = tpl.shadow;
    out.push(at(tpl, { ...over, color: '#000000' }, x + sx, y + sy));
    out.push(at(tpl, { ...over, color }, x, y));
  };

  const G = doc.group;
  const rowsOf = (n) => Math.ceil(n / G.maxCols);
  const colsOf = (n) => Math.min(n, G.maxCols);
  const heightOf = (n) => G.panel.h + (rowsOf(n) - 1) * G.cell.step.y;

  /** Группы списка: [{ level, cells | null (закрытая) }]. */
  function groups(st) {
    const out = [];
    for (let L = 1; L <= st.level; L++) if (byLevel.has(L)) out.push({ level: L, cells: byLevel.get(L) });
    const next = core.nextUnlockLevel(st.level);
    if (next >= 0) out.push({ level: next, cells: null });
    return out;
  }

  function groupLeaves(out, g, y) {
    const n = g.cells ? g.cells.length : 1;
    const cols = colsOf(n), w = cols * G.cell.step.x, px = G.centerX - w / 2;
    const tint = g.cells ? {} : { color: doc.hidden.color };
    const title = T(G.title.text) + g.level;
    const tw = textWidth(G.title.font, title) + G.tab.pad;
    out.push(at(G.tab, { w: tw, ...tint }, px, y));
    out.push(at(G.panel, { w, h: heightOf(n), ...tint }, px, y));
    out.push(at(G.tabInner, { w: tw - G.tabInner.inset }, px, y));
    shadowed(out, G.title, { value: title, x: G.tab.x + tw / 2 }, px, y, g.cells ? '#ffffff' : doc.hidden.text);
    for (let k = 0; k < n; k++) {
      const cx = px + G.cell.x + (k % G.maxCols) * G.cell.step.x, cy = y + G.cell.y + Math.floor(k / G.maxCols) * G.cell.step.y;
      out.push(at(G.cell, { x: 0, y: 0 }, cx, cy));
      if (!g.cells) {
        shadowed(out, doc.hidden.mark, {}, cx, cy, doc.hidden.text);
        shadowed(out, doc.hidden.caption, {}, cx, cy, doc.hidden.text);
        continue;
      }
      const u = g.cells[k], K = doc.kinds[u.kind];
      if (!K) throw new Error(`obelisk-unlocks: нет плашки вида ${u.kind}`);
      // значок: большая сторона рамки спрайта = fitSize (× вариант), середина рамки — в точке значка (поправка на начало спрайта)
      const sp = skin.sprite(u.icon), [ox, oy] = sp.origin;
      const s = (G.icon.fitSize / Math.max(sp.width, sp.height)) * (u.variant || 1);
      out.push(at(G.icon, { sprite: u.icon, frame: u.frame || undefined, sx: s, sy: s }, cx + (ox - sp.width / 2) * s, cy + (oy - sp.height / 2) * s));
      const txt = T(u.text), F = G.text.fit;
      const font = lineCount(G.text.font, txt, G.text.width) > F.maxLines ? F.font : G.text.font;
      shadowed(out, G.text, { value: txt, font }, cx, cy, '#ffffff');
      out.push(at(G.label, { color: K.color }, cx, cy));
      out.push(at(G.labelText, { value: T(K.text), color: K.textColor }, cx, cy));
    }
  }

  function leaves(st) {
    const out = [];
    const p = kitDoc.styles[doc.kitStyles.panel];
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;   // фон-текстура панели прокручивается вместе со списком
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y - st.scroll, sx: tx.scale, sy: tx.scale, color: tx.color, alpha: tx.alpha });
    out.push(at(doc.panelFrame));
    shadowed(out, doc.title, {}, 0, -st.scroll, '#ffffff');
    let y = doc.list.y - st.scroll;
    for (const g of groups(st)) {
      const h = G.panel.y + heightOf(g.cells ? g.cells.length : 1);
      if (y + h > doc.list.cullAbove && y < doc.list.cullBelow) groupLeaves(out, g, y);
      y += h + G.gap;
    }
    if (st.scrollbar) out.push({ ...doc.scrollbar, y1: st.scrollbar.y1, y2: st.scrollbar.y2 });   // нет ползунка — список короче окна
    const B = doc.tabs;
    for (const r of B.rects) out.push(at(r));
    B.icons.forEach((icon, i) => {
      const x = B.x + i * B.step, sel = i === B.selected ? { color: B.selectedColor } : {};
      out.push(at(B.button, sel, x));
      out.push(at(B.icon, { sprite: icon, ...sel }, x));
      out.push(at(B.caption, {}, x));
      out.push(at(B.label, { value: T(B.labels[i]) }, x));
    });
    if (core.hasUnclaimedReward(st.level, st.claimed)) out.push({ ...doc.dot });
    return out;
  }

  /** Листья в list (VertexList кита); круг — fillCircle кита. Возвращает число листьев без вершин кита. */
  function draw(list, ls) {
    let skipped = 0;
    for (const l of ls) {
      if (l.component === 'circle') { fillCircle(list, l.x, l.y, l.r, rgbOf(l.color), l.alpha ?? 1); continue; }
      if (!drawLeaf(list, skin, l)) skipped++;
    }
    return skipped;
  }

  return { leaves, groups, draw };
}
