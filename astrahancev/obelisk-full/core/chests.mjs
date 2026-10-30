// spec: chests
// Сундук предметов и сундук реликвий: таблицы выпадения и броски. Код по спеке oracle/specs/chests.md (правила 5–12).
// Данные (chests.json, items.json, relics.json) передаёт вызывающий: ядро само в файлы не ходит.

import { newGameRng } from './gamerng.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** первая строка таблицы весов, у которой v < накопленного */
function pickWeighted(rows, v) {
  let acc = 0;
  for (const r of rows) {
    acc += r.weight;
    if (v < acc) return r.rarity;
  }
  return rows[rows.length - 1].rarity;
}

export function makeChests({ chests, items, relics }) {
  const C = chests.constants;
  const itemRarity = tableRows(chests.tables.itemRarity);
  const itemTutorial = tableRows(chests.tables.itemTutorial);
  const relicRarity = tableRows(chests.tables.relicRarity);
  const generatorRows = tableRows(chests.tables.generators);
  const itemRows = tableRows(items.tables.items);
  const relicRows = tableRows(relics.tables.relics);
  const dropRows = tableRows(relics.tables.dropTables);

  const itemById = new Map(itemRows.map((r) => [r.id, r]));
  const relicById = new Map(relicRows.map((r) => [r.id, r]));
  const dropByRarity = new Map();
  for (const r of relicRarity) {
    dropByRarity.set(r.rarity, dropRows.filter((d) => d.rarity === r.rarity).sort((a, b) => a.position - b.position));
  }

  function generators() {
    if (generatorRows.length !== C['generators.count']) throw new Error('chests: число генераторов ≠ generators.count');
    return generatorRows.map((g) => newGameRng(g.state0));
  }

  // правила 5–7
  function openItem(gen, opened) {
    let item;
    if (opened < C['items.tutorialUntil']) {
      for (let i = 0; i < C['items.tutorialWords']; i++) gen.u32();
      item = itemTutorial.find((t) => t.opened === opened).item;
    } else {
      const rarity = pickWeighted(itemRarity, gen.u32() % C['items.rarityDie']);
      for (;;) {
        const c = gen.u32() % C['items.pickDie'];
        const it = itemById.get(c);
        if (it && it.rarity === rarity && it.fromItemChest) { item = c; break; }
      }
    }
    return { item, opened: opened + 1 };
  }

  // правило 11
  function relicLists(obeliskLvl, lvl) {
    const out = {};
    for (const r of relicRarity.slice().reverse()) { // порядок ключей — от частой редкости к редкой (интерфейс спеки)
      const list = dropByRarity.get(r.rarity).map((d) => relicById.get(d.relic));
      const owned = list.reduce((s, x) => s + lvl[x.slot], 0);
      out[r.rarity] = list
        .filter((x) => obeliskLvl >= x.obeliskReq && owned >= x.rarityOwnedReq && (x.cap === 0 || lvl[x.slot] < x.cap))
        .map((x) => x.id);
    }
    return out;
  }

  // правила 8–10
  function openRelic(gen, obeliskLvl, lvl) {
    const u1 = gen.u32();
    const u2 = gen.u32();
    const rarity = pickWeighted(relicRarity, u1 % C['relics.rarityDie']);
    const list = relicLists(obeliskLvl, lvl)[rarity];
    const relic = list[u2 % list.length];
    return { relic, slot: relicById.get(relic).slot, rarity };
  }

  return { generators, openItem, relicLists, openRelic };
}
