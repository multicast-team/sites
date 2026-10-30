// Меню обелиска, вкладка Rewards (этап 6.16): вёрстка data/ui/obelisk-rewards.json + награды уровней data/systems/obelisk-rewards.json
// + правила ядра обелиска (core/obelisk.mjs: награда получена, есть неполученная награда).
//
// Экран не рисует записи O: ряды наград собираются из компонентов вёрстки (растянутые патчи, спрайты, тексты) по состоянию игрока и
// рисуются рисовальщиком таблиц кита (ui/kit/table.mjs); метка вкладки — примитивом кита fillCircle.
//
// Состояние: { level (уровень обелиска), claimed (получено наград), scroll (прокрутка списка, px; вход),
//   pulse: { glowScale, glowAlpha, pop } — пульс кнопки Claim (вход: закон пульса ??), scrollbar: { y1, y2 } (ползунок; вход) }.
// Вид ряда L: «получена» (L ≤ claimed), «следующая» (L = claimed + 1 и L ≤ level: рамка-подсветка и кнопка Claim), иначе «заперта».
// Содержимое ряда видно, если L ≤ claimed + row.revealAhead; иначе вместо ячеек — «?» и без кнопки «i».
// Лист «blend» — смена режима смешивания (сложение для свечения кнопки Claim): вершин не даёт, кит режим не переключает (?? долг кита).
import { drawLeaf } from '../kit/table.mjs';
import { fillCircle, rgbOf } from '../kit/prims.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} doc   data/ui/obelisk-rewards.json
 * @param {object} deps  { kitDoc: data/ui/kit.json (палитра разрешена), strings: data/strings.json → .strings, skin,
 *                         rewards: data/systems/obelisk-rewards.json, core: makeObelisk(…) }
 */
export function makeObeliskRewardsScreen(doc, { kitDoc, strings, skin, rewards, core }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`obelisk-rewards: нет текста ${key}`);
    return s;
  };
  /** Количество награды: целое с разделителем групп разрядов (format.amount). */
  const num = (n) => {
    const { groupDigits, separator } = doc.format.amount;
    if (!Number.isInteger(n)) throw new Error(`obelisk-rewards: дробное количество ${n}`);
    const s = String(Math.abs(n)), parts = [];
    for (let i = s.length; i > 0; i -= groupDigits) parts.unshift(s.slice(Math.max(0, i - groupDigits), i));
    return (n < 0 ? '-' : '') + parts.join(separator);
  };
  const cellsOf = new Map();
  for (const it of tableRows(rewards.tables.rewardItems)) {
    if (!cellsOf.has(it.level)) cellsOf.set(it.level, []);
    cellsOf.get(it.level)[it.slot] = { item: it.item, sub: it.sub, amount: it.amount };
  }
  for (const p of tableRows(rewards.tables.rewardPerks)) cellsOf.get(p.level).push({ perk: p.icon, text: p.text });
  const LEVELS = rewards.constants.rewardLevels;

  const textWidth = (font, s) => {
    const f = skin.font(font);
    return [...s].reduce((a, ch) => a + (f.glyphs.get(ch.codePointAt(0))?.advance ?? 0), 0);
  };
  const at = (tpl, over = {}, dx = 0, dy = 0) => {
    const o = { ...tpl, ...over };
    delete o.shadow; delete o.shadowColor; delete o.pad; delete o.inset; delete o.step; delete o.fit;
    if (o.component === 'rect') { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; } else { o.x += dx; o.y += dy; }
    if (o.text !== undefined && o.value === undefined) o.value = T(o.text);
    delete o.text;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return o;
  };
  /** Текст с тенью: тень (dx, dy) чёрная, затем текст; оба с альфой стиля. */
  const shadowed = (out, tpl, over, x, y, st, sh = [1, 1]) => {
    out.push(at(tpl, { ...over, color: '#000000', alpha: st.alpha }, x + sh[0], y + sh[1]));
    out.push(at(tpl, { ...over, color: st.text, alpha: st.alpha }, x, y));
  };

  /** Вид ряда L: next | claimed | locked. */
  const rowKind = (L, st) => (core.rewardClaimed(L, st.claimed) ? 'claimed'
    : L === st.claimed + 1 && core.rewardUnlocked(L, st.level) ? 'next' : 'locked');

  function rowLeaves(out, L, y0, st) {
    const R = doc.row, kind = rowKind(L, st), S = R.styles[kind];
    const shown = L <= st.claimed + R.revealAhead;
    if (shown) { out.push(at(R.info.button, {}, 0, y0)); out.push(at(R.info.icon, {}, 0, y0)); }
    const title = T(R.title.text) + L;
    const w = textWidth(R.title.font, title) + R.tab.pad;
    out.push(at(R.tab, { w, frame: S.frame, color: S.color, alpha: 1 }, 0, y0));
    out.push(at(R.panel, { frame: S.frame, color: S.color, alpha: 1 }, 0, y0));
    out.push(at(R.tabInner, { w: w - R.tabInner.inset, alpha: S.innerAlpha }, 0, y0));
    shadowed(out, R.title, { value: title, x: R.tab.x + w / 2 }, 0, y0, S, R.title.shadow);
    const cells = cellsOf.get(L) || [];
    for (let c = 0; c < rewards.constants.rewardCells; c++) {
      const dx = c * R.cell.step;
      out.push(at(R.cell, { alpha: S.innerAlpha }, dx, y0));
      if (!shown) { shadowed(out, R.unknown, {}, dx, y0, S); continue; }
      const cell = cells[c];
      const tint = { color: S.text, alpha: S.alpha };
      if (cell.perk) {
        out.push(at(R.item, { sprite: cell.perk, ...tint }, dx, y0));
        const txt = T(cell.text), F = R.perkText.fit;
        const wide = Math.max(...txt.split('\n').map((ln) => textWidth(R.perkText.font, ln))) > F.maxWidth;
        shadowed(out, R.perkText, { value: txt, font: wide ? F.font : R.perkText.font }, dx, y0, S);
      } else {
        const ic = doc.itemIcons[cell.item];
        if (!ic) throw new Error(`obelisk-rewards: нет значка предмета ${cell.item}`);
        out.push(at(R.item, { sprite: ic.sprite, frame: ic.frameFromSub ? cell.sub : undefined, ...tint }, dx, y0));
        shadowed(out, R.amount, { value: num(cell.amount) + doc.amountSuffix }, dx, y0, S);
      }
    }
    if (kind === 'next') {
      const C = R.claim, P = st.pulse;
      out.push({ component: 'blend', mode: 1 });
      out.push(at(C.glow, { sx: P.glowScale, sy: P.glowScale, alpha: P.glowAlpha }, 0, y0));
      out.push({ component: 'blend', mode: 0 });
      const bw = C.button.w * P.pop, bh = C.button.h * P.pop;
      out.push(at(C.button, { x: C.button.x - bw / 2, w: bw, h: bh }, 0, y0 - bh / 2));
      const tx = { xscale: P.pop, yscale: P.pop, snap: false };
      out.push(at(C.text, { ...tx, color: '#000000' }, 1, y0 + 1));
      out.push(at(C.text, tx, 0, y0));
    } else out.push(at(kind === 'claimed' ? R.check : R.lock, {}, 0, y0));
  }

  function leaves(st) {
    const out = [];
    const p = kitDoc.styles[doc.kitStyles.panel];
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;   // фон-текстура панели прокручивается вместе со списком
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y - st.scroll, sx: tx.scale, sy: tx.scale, color: tx.color, alpha: tx.alpha });
    out.push(at(doc.panelFrame));
    out.push(at(doc.title, {}, 0, -st.scroll));
    const Lst = doc.list;
    for (let L = 1; L <= LEVELS; L++) {
      const y0 = Lst.y + (L - 1) * Lst.step - st.scroll;
      if (y0 <= Lst.cullAbove || y0 >= Lst.cullBelow) continue;
      rowLeaves(out, L, y0, st);
    }
    out.push({ ...doc.scrollbar, y1: st.scrollbar.y1, y2: st.scrollbar.y2 });
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

  /** Листья в list (VertexList кита); круг — fillCircle кита, blend — без вершин. Возвращает число листьев без вершин кита. */
  function draw(list, ls) {
    let skipped = 0;
    for (const l of ls) {
      if (l.component === 'blend') { skipped++; continue; }
      if (l.component === 'circle') { fillCircle(list, l.x, l.y, l.r, rgbOf(l.color), l.alpha ?? 1); continue; }
      if (!drawLeaf(list, skin, l)) skipped++;
    }
    return skipped;
  }

  return { leaves, rowKind, draw, cellsOf: (L) => cellsOf.get(L) };
}
