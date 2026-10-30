// Меню престижа и артефактов (этап 6.24): вёрстка data/ui/prestige.json из компонентов кита + привязки к ядру артефактов
// (core/artifacts.mjs: цены улучшения, капы, цены призыва, замки ярусов) и к очкам за престиж (core/prestige.mjs → gain).
//
// Экран не рисует записи O: он раскладывает блоки ярусов и строки открытых артефактов, подставляет числа и тексты, оттенок
// «не хватает очков», Maxed, замок обелиска, кнопки с подтверждением, и рисует листья рисовальщиком таблиц кита.
//
// Состояние: { pp — очки престижа, levels — 4 массива уровней (ярус 1 — 10, ярусы 2–4 — по 5), obelisk, capIncrease,
//   tier4CapIncrease, gain — очки за престиж сейчас (ядро prestige.gain), statues — статуй (мир 1: 0) }.
// Вид: { scroll — прокрутка списка вверх (px, ≥ 0), armPrestige — кнопка Prestige взведена, armSummon — номер яруса 1…4 со
//   взведённой кнопкой Summon или 0 }.
import { drawLeaf } from '../kit/table.mjs';
import { makeShortFormat } from '../format/number.mjs';

/**
 * @param {object} doc   data/ui/prestige.json
 * @param {object} deps  { artifacts: makeArtifacts(...) (core/artifacts.mjs), strings: data/strings.json → .strings,
 *                         format: формат коротких чисел (data/ui/workshop.json → format.short), skin }
 */
export function makePrestigeScreen(doc, { artifacts, strings, format, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`prestige screen: нет текста ${key}`);
    return s;
  };
  const short = makeShortFormat(format);
  const gray = doc.disabledColor, dim = doc.dimColor;
  const L = doc.list;
  const font = (key) => skin.font(key);
  /** Ширина строки шрифта (сумма advance глифов; spec text-layout). */
  const width = (fk, s) => [...s].reduce((a, ch) => a + (font(fk).glyphs.get(ch.codePointAt(0))?.advance || 0), 0);
  const compose = (parts, vars) => parts.map((p) => {
    const m = /^\{(\w+)\}$/.exec(p);
    if (m) { if (!(m[1] in vars)) throw new Error(`prestige screen: нет значения ${p}`); return vars[m[1]]; }
    return p.startsWith('t.') ? T(p) : p;
  }).join('');
  /** Лист шаблона → лист экрана: сдвиг (ox, oy), замены полей; id убирается; value без text — text убирается. */
  function put(out, tpl, ox, oy, over = {}) {
    const o = { ...tpl, ...over };
    delete o.id; delete o.count; delete o.step;
    if (typeof o.x === 'number') o.x += ox;
    if (typeof o.y === 'number') o.y += oy;
    for (const k of ['y1', 'y2']) if (typeof o[k] === 'number') o[k] += oy;
    if ('value' in over && !('text' in over)) delete o.text;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    out.push(o);
  }
  const putAll = (out, list, ox, oy, by = {}) => { for (const t of list) put(out, t, ox, oy, (t.id && by[t.id]) || {}); };
  /** Число эффекта: целое — как есть; дробное — ?? (в записях не встречалось), до 2 знаков без хвостовых нулей. */
  const num = (x) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));
  const signed = (x) => (x >= 0 ? '+' : '') + num(x);
  /** PP на плашке: ниже plainBelow формата — число (O выводит real), иначе короткая запись (??: граница по формату). */
  const ppValue = (pp) => (Math.abs(pp) < format.plainBelow ? pp : short(pp));

  /** Раскладка списка (прокрутка 0): y блоков ярусов и строк открытых артефактов; section2 — рисуются ли ярусы 2–4 при прокрутке s. */
  function layout(state, s = 0) {
    const tiers = [];
    let y = L.block0;
    doc.tiers.forEach((t, ti) => {
      const lv = state.levels[ti];
      const rows = [];
      lv.forEach((l, i) => { if (l >= 1) rows.push({ index: i, y: y + L.firstRow + rows.length * L.rowStep }); });
      tiers.push({ tier: ti + 1, y, rows });
      y += L.nextBlock + rows.length * L.rowStep;
    });
    // ярусы 2–4 рисуются все вместе, если блок яруса 2 на экране выше section2Below (?? граница внутри (927, 1147] по записям)
    const section2 = tiers[1].y - s < L.section2Below;
    return { tiers, section2 };
  }

  /** Ползунок: y1 = top + s·k, длина view·k, k = ratio (?? постоянен во всех записях: от числа строк не зависит). */
  function thumbSpan(s) {
    const t = doc.thumb;
    const k = t.ratio[0] / t.ratio[1];
    const y1 = t.top + s * k;
    return [y1, y1 + t.view * k];
  }

  function leaves(state, view = {}) {
    const s = view.scroll ?? 0;
    const out = [];
    put(out, doc.bg.fill, 0, 0);
    const nz = doc.bg.noise;
    for (let k = 0; k < nz.count; k++) put(out, nz, 0, k * nz.step - s);
    // шапка: очки за престиж
    const H = doc.headerTexts;
    const g = state.gain;
    const on = g > 0;
    const gainText = compose(H.gain, { n: short(g) });
    const gainTpl = doc.header.find((t) => t.id === 'gain');
    for (const t of doc.header) {
      if (!on && (t.id === 'gain' || t.id === 'gainIcon')) continue;
      const over = {
        gain: { value: gainText },
        // значок PP сразу за текстом: x = x шаблона + ширина «+N» (П: +6456 → 289, +347 → 280)
        gainIcon: { x: t.x + width(gainTpl.font, gainText) },
        pp: { value: compose(H.pp, { a: short(state.pp), b: short(state.pp + g) }), ...(on ? {} : { color: dim }) },
        button: { ...(view.armPrestige ? { frame: 1 } : {}), ...(on ? {} : { color: dim }) },
        label: { ...(view.armPrestige ? { text: H.confirm } : {}), ...(on ? {} : { color: dim }) },
        icon: on ? {} : { color: dim },
      }[t.id] || {};
      put(out, t, 0, -s, over);
    }
    // ярусы
    const { tiers, section2 } = layout(state, s);
    const B = doc.blockTexts;
    tiers.forEach(({ tier, y, rows }, ti) => {
      if (ti >= 1 && !section2) return;
      const td = doc.tiers[ti];
      const lv = state.levels[ti];
      const n = artifacts.count(tier);
      const owned = lv.filter((l) => l >= 1).length;
      const caps = lv.map((_, i) => artifacts.cap(tier, i, state.capIncrease ?? 0, state.tier4CapIncrease ?? 0));
      const all = owned >= n;
      const cost = artifacts.summonCost(tier, lv);
      const can = state.pp >= cost;
      const armed = view.armSummon === tier;
      const back = { sprite: td.backing.sprite, ...(td.backing.frame ? { frame: td.backing.frame } : {}) };
      const blockOver = {
        backing: back,
        title: all ? { text: B.maxed } : armed ? { text: B.confirm } : {},
        button: all ? { sprite: B.allOwnedButton, color: gray } : { ...(armed ? { sprite: B.armedButton } : {}), ...(can ? {} : { color: gray }) },
        costIcon: can ? {} : { color: gray },
        cost: { value: short(cost), ...(can ? {} : { color: gray }) },
        owned: { value: compose(B.owned, { title: T(td.owned), n: String(owned), all: String(n) }) },
        levels: { value: compose(B.levels, { title: T(td.levels), n: String(lv.reduce((a, b) => a + b, 0)), all: String(caps.reduce((a, b) => a + b, 0)) }) },
      };
      for (const t of doc.block) {
        if (all && (t.id === 'costIcon' || t.id === 'cost')) continue;
        put(out, t, 0, y - s, blockOver[t.id] || {});
      }
      if (artifacts.locked(tier, state.obelisk)) putAll(out, doc.lock, 0, y - s, { backing: back, text: { text: td.lock } });
      for (const r of rows) {
        const a = td.rows[r.index];
        const Lv = lv[r.index], cap = caps[r.index];
        const maxed = Lv >= cap;
        const price = artifacts.price(tier, r.index, Lv, state.obelisk);
        const ok = state.pp >= price;
        const eff = a.perStatue !== undefined ? signed(a.perStatue * (state.statues ?? 0)) + a.unit : signed(a.step * Lv) + a.unit;
        const desc = a.perStatue !== undefined
          ? { value: compose(doc.rowTexts.statue, { key: T(a.desc), n: num(a.perStatue * (state.statues ?? 0)) }) } : { text: a.desc };
        const rowOver = {
          backing: back,
          button: maxed ? { sprite: doc.rowTexts.cappedButton } : ok ? {} : { color: gray },
          icon: { sprite: a.icon },
          plate: { sx: td.plateSx },
          level: { value: compose(doc.rowTexts.level, { n: String(Lv), cap: String(cap) }) },
          effect: { value: eff },
          desc,
        };
        for (const t of doc.row) put(out, t, 0, r.y - s, rowOver[t.id] || {});
        if (maxed) putAll(out, doc.rowMaxed, 0, r.y - s);
        else putAll(out, doc.rowPrice, 0, r.y - s, { icon: ok ? {} : { color: gray }, shadow: { value: short(price) }, price: { value: short(price), ...(ok ? {} : { color: gray }) } });
      }
    });
    putAll(out, doc.badge, 0, 0, { pp: { value: ppValue(state.pp) } });
    const [t1, t2] = thumbSpan(s);
    const th = doc.thumb;
    out.push({ component: 'rect', x1: th.x1, y1: t1, x2: th.x2, y2: t2, color: th.color, alpha: th.alpha });
    for (const t of doc.topBar) put(out, t, 0, 0);
    return out;
  }

  /** Вершины экрана в list (VertexList кита). Возвращает число листьев, которые кит не нарисовал. */
  function build(list, state, view = {}) {
    let skipped = 0;
    for (const l0 of leaves(state, view)) {
      const l = l0.text !== undefined ? { ...l0, value: T(l0.text), text: undefined } : l0;
      if (!drawLeaf(list, skin, l)) skipped++;
    }
    return skipped;
  }

  return { leaves, build, layout, thumbSpan };
}
