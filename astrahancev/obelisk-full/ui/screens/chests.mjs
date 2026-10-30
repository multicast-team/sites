// Меню сундуков предметов (этап 6.13): вёрстка data/ui/chests.json из компонентов кита + привязки к состоянию игрока
// и к данным предметов (data/systems/items.json: порядок показа, редкость, количества открытия 1/10/100/1000/все).
//
// Экран не рисует записи O: он подставляет в шаблоны тексты шкал и кнопки, оттенок «нельзя», кадр выбранной кнопки
// количества, раскладывает выпавшие предметы сеткой и рисует листья рисовальщиком таблиц кита (ui/kit/table.mjs).
//
// Состояние: { chests — сундуков в наличии, itemMeter / itemReq — шкала сундука предметов и порог, relicMeter / relicReq — то же
//   для реликвий, loot — выпало при последнем открытии: число на предмет (массив по номеру предмета) или null }.
// Вид: { amount — номер строки openAmounts (выбор количества), confirm — ждёт подтверждения «открыть все» }.
import { drawLeaf } from '../kit/table.mjs';
import { makeShortFormat } from '../format/number.mjs';
import { formatReal } from '../../core/num/real.mjs';

/**
 * @param {object} doc   data/ui/chests.json
 * @param {object} deps  { items: data/systems/items.json, kitDoc: data/ui/kit.json (палитра разрешена), strings: data/strings.json → .strings,
 *                         format: формат коротких чисел (data/ui/workshop.json → format.short), skin }
 */
export function makeChestsScreen(doc, { items, kitDoc, strings, format, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`chests screen: нет текста ${key}`);
    return s;
  };
  const rowsOf = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const order = rowsOf(items.tables.order).sort((a, b) => a.place - b.place).map((r) => r.item);
  const rarity = new Map(rowsOf(items.tables.items).map((r) => [r.id, r.rarity]));
  const amounts = rowsOf(items.tables.openAmounts).map((r) => r.amount);
  const ALL = -1;
  const num = makeShortFormat(format);
  const style = (id) => {
    const s = kitDoc.styles[id];
    if (!s) throw new Error(`chests screen: нет стиля кита ${id}`);
    return s;
  };
  /** Текст из частей: t.* — ключ, {имя} — значение vars, прочее — как есть. */
  const compose = (parts, vars) => parts.map((p) => {
    const m = /^\{(\w+)\}$/.exec(p);
    if (m) { if (!(m[1] in vars)) throw new Error(`chests screen: нет значения ${p}`); return vars[m[1]]; }
    return p.startsWith('t.') ? T(p) : p;
  }).join('');
  const clean = (o) => { delete o.id; for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };
  const put = (out, t, ox, oy, over = {}) => {
    const o = { ...t, ...over };
    if (o.x !== undefined) o.x = ox + t.x;
    if (o.y !== undefined) o.y = oy + t.y;
    if (o.text !== undefined && o.value === undefined) { o.value = T(o.text); delete o.text; }
    out.push(clean(o));
  };

  /** Сколько нужно сундуков для кнопки количества: «все» — хотя бы один. */
  const need = (amount) => (amount === ALL ? 1 : amount);
  /** Сколько откроет кнопка Open: «все» — все в наличии, иначе выбранное число. */
  const toOpen = (state, view) => (amounts[view.amount ?? 0] === ALL ? state.chests : amounts[view.amount ?? 0]);
  /** Процент шкалы: ⌊шкала / порог · 100⌋ (??: вниз — по записям 6.13). */
  const pct = (m, r) => Math.floor(m / r * 100);

  function openLabel(state, view) {
    const a = amounts[view.amount ?? 0];
    const vars = { n: formatReal(a), owned: formatReal(state.chests) };
    const t = doc.openTexts;
    if (a === ALL) return compose(view.confirm ? t.confirm : t.all, vars);
    return compose(a === 1 ? t.one : t.many, vars);
  }

  /** Выпавшие предметы в порядке показа (items.order): [{item, count}]. */
  function lootList(state) {
    if (!state.loot) return [];
    return order.filter((it) => state.loot[it] > 0).map((it) => ({ item: it, count: state.loot[it] }));
  }

  /** Листья экрана в порядке рисования O. */
  function leaves(state, view = {}) {
    const out = [];
    const gray = doc.disabledColor;
    const p = style(doc.kitStyles.panel);
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y, sx: tx.scale, sy: tx.scale, color: tx.color, alpha: tx.alpha });
    // шкалы
    const MT = doc.meterTexts;
    const mover = {
      itemMeter: { value: compose(MT.item, { n: num(state.itemMeter), req: num(state.itemReq) }) },
      itemPct: { value: compose(MT.pct, { n: formatReal(pct(state.itemMeter, state.itemReq)) }) },
      relicMeter: { value: compose(MT.relic, { n: num(state.relicMeter), req: num(state.relicReq) }) },
      relicPct: { value: compose(MT.pct, { n: formatReal(pct(state.relicMeter, state.relicReq)) }) },
    };
    for (const t of doc.meters) put(out, t, 0, 0, mover[t.id] || {});
    // кнопка Open
    const a = amounts[view.amount ?? 0];
    const canOpen = state.chests >= need(a);
    const label = openLabel(state, view);
    const dim = canOpen ? {} : { color: gray };
    const oover = {
      button: { ...(view.confirm ? { sprite: doc.confirmSprite } : {}), ...dim },
      icon: dim,
      shadow: { value: label },
      label: { value: label, ...dim },
    };
    for (const t of doc.open) put(out, t, 0, 0, oover[t.id] || {});
    // выбор количества
    const S = doc.selector;
    put(out, S.backing, 0, 0);
    amounts.forEach((amt, k) => {
      const ok = state.chests >= need(amt);
      const text = amt === ALL ? T(S.allLabel) : formatReal(amt);
      const sover = {
        button: { ...(k === (view.amount ?? 0) ? { frame: S.selectedFrame } : {}), ...(ok ? {} : { color: gray }) },
        shadow: { value: text },
        label: { value: text, ...(ok ? {} : { color: gray }) },
      };
      for (const t of S.item) put(out, t, S.x + k * S.step, S.y, sover[t.id] || {});
    });
    // выпавшие предметы
    const L = doc.loot;
    lootList(state).forEach(({ item, count }, i) => {
      const lx = L.x + (i % L.cols) * L.dx, ly = L.y + Math.floor(i / L.cols) * L.dy;
      const color = L.rarityColor[rarity.get(item)];
      if (!color) throw new Error(`chests screen: нет цвета редкости ${rarity.get(item)}`);
      const lover = { frame: { color }, icon: { frame: item }, count: { value: L.countPrefix + formatReal(count) } };
      for (const t of L.item) put(out, t, lx, ly, lover[t.id] || {});
    });
    for (const t of doc.footer) put(out, t, 0, 0);
    return out;
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}) {
    let skipped = 0;
    for (const l of leaves(state, view)) if (!drawLeaf(list, skin, l)) skipped++;
    return skipped;
  }

  return { leaves, build, lootList, openLabel, toOpen, amounts };
}
