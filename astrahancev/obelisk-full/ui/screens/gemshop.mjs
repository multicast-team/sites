// Экран магазина (gem shop) мира 1, этап 6.25: вёрстка data/ui/gemshop.json (компоненты из конвертера записей O) + привязки к
// данным магазина (data/systems/gemshop.json: цены, капы, паки, шансы Freebie) и к состоянию игрока.
//
// Ленты IAP (Value Packs, Perk Bundles, Perks, Gem Packs) — неизменная картинка без покупок («Без IAP-лент»): кнопки с ценой в валюте
// ничего не делают. За самоцветы — Freebie, Resource / Large / Skill Point Pack, Gem Unlocks и Gem Upgrades: экран раскладывает
// шаблоны рядов по разделам, подставляет числа и тексты, оттенок «не хватает самоцветов», кадр взвода, Maxed.
//
// Состояние: { gems, obelisk, gemUpgrades[6], gemUnlocks[4], bankedFreebies, capIncrease, freebieGems, freebieCap, freebieTimer,
//   }.
// Вид: { scroll — прокрутка списка вверх (px, ≥ 0), countdown — секунды до Freebie на экране (целые), confirm — счётчики взвода ядра
//   core/gemshop.mjs ({upgrades[6], unlocks[4], packs[3]}), hideMaxed, menuOpen, vpScale — масштаб картинки Value Pack (пульсация, ??),
//   packPP — [PP Resource Pack, PP Large Resource Pack] на экране (??: правило числа не снято), animFrame — кадр анимации искр
//   Value Pack у листов с кадром −1 (??: счёт кадров не снят) }.
import { drawLeaf } from '../kit/table.mjs';
import { fillRoundRect, rgbOf } from '../kit/prims.mjs';

/**
 * @param {object} doc   data/ui/gemshop.json
 * @param {object} deps  { gemshop: data/systems/gemshop.json, strings: data/strings.json → .strings, skin }
 */
export function makeGemShopScreen(doc, { gemshop, strings, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`gemshop screen: нет текста ${key}`);
    return s;
  };
  const rowsOf = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const C = gemshop.constants;
  const upgrades = rowsOf(gemshop.tables.upgrades);
  const unlocks = rowsOf(gemshop.tables.unlocks);
  const packs = rowsOf(gemshop.tables.packs);
  const upgradesByRow = [...upgrades].sort((a, b) => a.row - b.row);
  const gray = doc.disabledColor;

  /** Лист шаблона → лист экрана: сдвиг y на oy, замены полей, id убирается; text с outline → 4 чёрные копии и текст. */
  function put(out, tpl, oy, over = {}) {
    const o = { ...tpl, ...over };
    delete o.id;
    for (const k of ['y', 'y1', 'y2']) if (typeof o[k] === 'number') o[k] += oy;
    if ('value' in over && !('text' in over)) delete o.text;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    if (o.outline && o.component === 'text') {
      delete o.outline;
      for (const [dx, dy] of doc.outline) {
        const s = { ...o, x: o.x + dx, y: o.y + dy, color: '#000000' };
        delete s.alpha;
        out.push(s);
      }
    }
    out.push(o);
  }
  const putAll = (out, list, oy, overById = {}) => { for (const t of list) put(out, t, oy, (t.id && overById[t.id]) || {}); };

  const fmtNum = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(2));
  /** Текст строки улучшения: «имя\nсейчас > дальше», на капе — «имя\nсейчас» (части через «, »). */
  function upgradeText(id, L, cap) {
    const u = doc.upgradeTexts[id];
    const val = (p, l) => p.prefix + fmtNum(p.kind === 'pow' ? p.base * p.step ** l : p.base + p.step * l) + p.suffix;
    return u.name + '\n' + u.parts.map((p) => (L < cap ? `${val(p, L)} > ${val(p, L + 1)}` : val(p, L))).join(', ');
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /** Раскладка списка: y баннеров и рядов в координатах списка (прокрутка 0). */
  function layout(state, view = {}) {
    const B = doc.banners.map((b) => ({ ...b }));
    const full = state.obelisk >= packs.find((p) => p.id === 3).minObelisk;
    const unl = unlocks.filter((u) => !(view.hideMaxed && state.gemUnlocks[u.id] >= u.cap));
    const capOf = (u) => u.cap + (state.capIncrease ?? 0);
    const upg = upgradesByRow.filter((u) => !(view.hideMaxed && state.gemUpgrades[u.id] >= capOf(u)));
    B[4].y = B[3].y + (full ? doc.resource.end.full : doc.resource.end.short);
    B[5].y = B[4].y + doc.unlock.firstRow + (unl.length - 1) * doc.unlock.rowStep + doc.unlock.tail;
    B[6].y = B[5].y + doc.upgrade.firstRow + (upg.length - 1) * doc.upgrade.rowStep + doc.upgrade.tail;
    return { B, full, unl, upg, capOf };
  }

  /**
   * Ползунок: дорожка top…bottom, вид view, предел прокрутки m. m = thumb.maxScroll минус высота скрытых (Hide Maxed) рядов открытий и
   * улучшений (П: g625-rich--hide — 3400 − 2·115 − 3·110 = 2840); у OB3 без двух рядов Resource Packs m тот же 3400 (П: g625-ob3).
   */
  function thumbSpan(scroll, maxScroll = doc.thumb.maxScroll) {
    const t = doc.thumb;
    const L = t.bottom - t.top;
    const len = L * t.view / (t.view + maxScroll);
    const y1 = t.top + scroll * (L - len) / maxScroll;
    return [y1, y1 + len];
  }

  /** Листья экрана в порядке рисования O. */
  function leaves(state, view = {}) {
    const s = view.scroll ?? 0;
    const confirm = view.confirm ?? { upgrades: [], unlocks: [], packs: [] };
    const { B, full, unl, upg, capOf } = layout(state, view);
    const out = [];
    put(out, doc.bg.fill, 0);
    const nz = doc.bg.noise;
    for (let k = 0; k < nz.count; k++) put(out, { ...nz, count: undefined, step: undefined }, k * nz.step - s);
    put(out, doc.bg.panel, 0);
    for (const b of B) {
      put(out, doc.banner.sprite, b.y - s, { frame: b.frame });
      put(out, doc.banner.text, b.y - s, { text: b.text });
    }
    // Value Pack: вариант — первое не купленное открытие (??: видны варианты 0 и 2)
    const vpId = unlocks.find((u) => !(state.gemUnlocks[u.id] >= u.cap))?.id;
    const vp = doc.valuePacks[vpId];
    if (!vp) throw new Error(`gemshop screen: нет Value Pack для открытия ${vpId}`);
    const sc = view.vpScale ?? 3;
    const I = doc.iap;
    putAll(out, I.valuePack, -s, {
      'vp.gems': { value: vp.gems }, 'vp.chests': { value: vp.chests }, 'vp.relics': { value: vp.relics },
      'vp.title': { text: vp.title }, 'vp.value': { text: vp.valueText }, 'vp.packShadow': { frame: vp.frame, sx: sc, sy: sc },
      'vp.pack': { frame: vp.frame, sx: sc, sy: sc }, 'vp.nothing': { sx: sc, sy: sc }, 'vp.sparkle': { sx: sc, sy: sc }, 'vp.price': { text: vp.price },
    });
    // Perk Bundles и Perks — ряды с шагом (шаблон + поля ряда), Founders — неизменный блок
    const putRows = (t) => t.rows.forEach((over, r) => putAll(out, t.row, t.y + r * t.step - s, over));
    putRows(I.bundles);
    putAll(out, I.founders, -s);
    putRows(I.perks);
    // Resource Packs: Freebie, Resource, Large, [1x + Skill Point, Mythic — обелиск ≥ 4]
    let y = B[3].y + doc.resource.firstRow;
    const banked = state.bankedFreebies;
    const fb = doc.freebie;
    const on = banked > 0;
    const cd = view.countdown ?? 0;
    const full2 = cd + Math.max(0, state.freebieCap - banked - 1) * state.freebieTimer;
    putAll(out, fb.row, y - s, {
      banked: { value: doc.texts.banked + banked + doc.texts.per + state.freebieCap },
      fullIn: { value: doc.texts.fullIn + mmss(full2) }, countdown: { value: mmss(cd) },
      button: on ? { sprite: fb.activeButton, color: undefined } : { color: gray }, buttonIcon: on ? { color: undefined } : { color: gray },
      label: { color: on ? '#ffffff' : gray },
    });
    const items = full ? fb.items[4] : fb.items[3];
    const vals = [String(state.freebieGems), String(C['freebie.chestsBase']), C['freebie.relicChance'] + doc.texts.pct, C['freebie.shardChance'] + doc.texts.pct];
    items.forEach((t, k) => put(out, t, y - s, k % 2 === 0 ? { value: vals[k / 2], text: undefined } : {}));
    const packRow = (id, ppk) => {
      const p = packs.find((x) => x.id === id);
      const can = state.gems >= p.price;
      const armed = (confirm.packs?.[id - 1] ?? 0) > 0;
      putAll(out, doc.packs[id].items, y - s, {
        button: { ...(can ? {} : { color: gray }), ...(armed ? { frame: doc.armedFrame } : {}) },
        gem: can ? {} : { color: gray }, price: { value: String(p.price), color: can ? '#ffffff' : gray }, priceShadow: { value: String(p.price) },
        ...(ppk !== undefined ? { pp: { value: String(view.packPP[ppk]) } } : {}),
      });
    };
    y += doc.resource.rowStep; packRow(1, 0);
    y += doc.resource.rowStep; packRow(2, 1);
    if (full) {
      y += doc.resource.rowStep;
      putAll(out, doc.packs[3].before, y - s);
      packRow(3);
      y += doc.resource.rowStep;
      putAll(out, doc.mythic, y - s);
    }
    // Gem Unlocks
    unl.forEach((u, i) => {
      const r = doc.unlock.rows[u.id];
      const yy = B[4].y + doc.unlock.firstRow + i * doc.unlock.rowStep - s;
      const owned = state.gemUnlocks[u.id] >= u.cap;
      const can = state.gems >= u.price;
      const armed = (confirm.unlocks?.[u.id] ?? 0) > 0;
      for (const t of doc.unlock.row) {
        if (owned && ['button', 'price', 'gem'].includes(t.id)) continue;
        put(out, t, yy, {
          title: { text: r.title }, titlePlate: { sx: r.titleSx }, text: { text: r.text }, icon: { sprite: r.icon },
          button: { ...(can ? {} : { color: gray }), ...(armed ? { frame: doc.armedFrame } : {}) },
          price: { value: u.price, ...(can ? {} : { color: gray }) }, gem: can ? {} : { color: gray },
        }[t.id] || {});
        if (owned && t.id === 'icon') putAll(out, doc.maxed, yy);
      }
    });
    // Gem Upgrades — раздел рисуется, только если его баннер выше границы окна (??: граница внутри (1021, 1101])
    if (B[5].y - s < doc.drawBelow) {
      upg.forEach((u, i) => {
        const yy = B[5].y + doc.upgrade.firstRow + i * doc.upgrade.rowStep - s;
        const L = state.gemUpgrades[u.id];
        const cap = capOf(u);
        const maxed = L >= cap;
        const can = state.gems >= u.price;
        const armed = (confirm.upgrades?.[u.id] ?? 0) > 0;
        for (const t of doc.upgrade.row) {
          if (maxed && ['button', 'price', 'gem'].includes(t.id)) continue;
          put(out, t, yy, {
            level: { value: L + doc.texts.per + cap }, text: { value: upgradeText(u.id, L, cap) }, icon: { sprite: doc.upgrade.icons[u.row] },
            button: { ...(can ? {} : { color: gray }), ...(armed ? { frame: doc.armedFrame } : {}) },
            price: { value: u.price, ...(can ? {} : { color: gray }) }, gem: can ? {} : { color: gray },
          }[t.id] || {});
          if (maxed && t.id === 'icon') putAll(out, doc.maxed, yy);
        }
      });
    }
    // Gem Packs (IAP) — так же по баннеру раздела
    if (B[6].y - s < doc.drawBelow) putAll(out, doc.gemPacks, B[6].y - doc.banners[6].y - s);
    const m = doc.thumb.maxScroll - (unlocks.length - unl.length) * doc.unlock.rowStep - (upgrades.length - upg.length) * doc.upgrade.rowStep;
    const [t1, t2] = thumbSpan(s, m);
    const th = doc.thumb;
    out.push({ component: 'rect', x1: th.x1, y1: t1, x2: th.x2, y2: t2, color: th.color, alpha: th.alpha });
    doc.topBar.forEach((t, k) => {
      if (k === doc.toast.before && banked > 0) putAll(out, doc.toast.leaves, 0);   // ?? плашка «можно получить бесплатно» — при Freebie в банке
      put(out, t, 0, k === doc.menu.buttonAt && view.menuOpen ? { sprite: doc.menu.button } : {});
      // меню ☰ рисуется сразу после трёх полос значка ☰ (записи O: w1-ob10-gemshop-menu, g625-rich--menu)
      if (k === doc.menu.after && view.menuOpen) {
        for (const m of doc.menu.leaves) put(out, m, 0, m.sprite === 'sprite.unchecked_checked' ? { frame: view.hideMaxed ? 1 : 0 } : {});
      }
    });
    return out;
  }

  /** Вершины экрана в list (VertexList кита). Скруглённая панель меню — заливкой (рамку-линию кит не рисует). Возвращает число непокрытых листов. */
  function build(list, state, view = {}) {
    let skipped = 0;
    for (const l0 of leaves(state, view)) {
      const l = l0.text !== undefined ? { ...l0, value: T(l0.text), text: undefined } : l0;
      if (l.component === 'roundrect') {
        if (!l.outline) fillRoundRect(list, l.x1, l.y1, l.x2, l.y2, l.xrad, l.yrad, rgbOf(l.color ?? '#ffffff'), l.alpha ?? 1);
        continue;
      }
      // кадр −1 — «текущий кадр анимации» (искры Value Pack): view.animFrame, если задан (?? правило счёта кадров не снято —
      // в проверке вход берётся из кадра O); иначе и для кадров вне числа кадров спрайта — по модулю (кадр 1 подложки из 1 кадра)
      const n = l.component === 'sprite' && l.frame ? skin.sprite(l.sprite).frames.length : 0;
      const fr = l.frame === -1 && Number.isInteger(view.animFrame) ? view.animFrame : l.frame;
      if (!drawLeaf(list, skin, n ? { ...l, frame: ((fr % n) + n) % n } : l)) skipped++;
    }
    return skipped;
  }

  return { leaves, build, layout, thumbSpan, upgradeText };
}
