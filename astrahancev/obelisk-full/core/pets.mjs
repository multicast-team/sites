// spec: pets-xp
// Опыт питомцев: шанс и бросок повышения уровня, требование и выдача опыта квеста.
// Код по спеке oracle/specs/pets-xp.md (правила 1–8). Данные — data/systems/pets.json; передаёт вызывающий: ядро само в файлы не ходит.

import { pow } from './num/libm.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} petsData содержимое data/systems/pets.json */
export function makePets(petsData) {
  const C = petsData.constants;
  const pets = tableRows(petsData.tables.pets);
  if (pets.length !== C.count) throw new Error('pets: число питомцев данных ≠ count');
  pets.forEach((p, i) => { if (p.id !== i) throw new Error(`pets: питомец ${i} не на месте`); });

  // правило 1: знаменатель шанса
  function chance(i, pet, stats) {
    const lvl = Math.max(pet.level, C['chance.minLevel']);
    const multi = Math.max(stats.chanceMulti, C['chance.minMulti']);
    const s = pet.skinA ? 1 : 0;
    const x = (pets[i].chanceBase * lvl) / (multi * (1 + C['chance.skinPercent'] * stats.skinBonus * s));
    return Math.floor(x + 0.5);
  }

  // правило 7: требование уровня квеста
  function questReq(i, questLevel, questMulti) {
    const p = pets[i];
    const base = Math.trunc(p.questBase * pow(p.questGrowth, questLevel));
    const r = C['quest.round'];
    return r * Math.floor((base * questMulti) / r + 0.5);
  }

  // правило 25 offline: шанс «a из b», два слова генератора
  function chanceOf(gen, a, b) {
    const lo = BigInt(gen.u32());
    const hi = BigInt(gen.u32());
    const U = (lo | (hi << 32n)) & ((1n << 63n) - 1n);
    return Number(U % BigInt(Math.trunc(b))) + 1 <= a;
  }

  // правила 2–4: бросок повышения уровня
  function roll(i, pet, n, stats, gen) {
    if (pet.level < C['roll.minLevel'] || pet.level >= stats.levelCap || n < C['roll.minRolls']) {
      return { level: pet.level, rolls: pet.rolls, levelUp: false };
    }
    const rolls = pet.rolls + n;
    const k = C['roll.scale'];
    if (chanceOf(gen, k * n, k * chance(i, pet, stats))) {
      return { level: pet.level + 1, rolls: 0, levelUp: true };
    }
    return { level: pet.level, rolls, levelUp: false };
  }

  // правило 8: выдача опыта квеста
  function giveExp(i, pet, n, stats) {
    const max = pets[i].questMax;
    let { questLevel, questExp, questReq: req } = pet;
    if (!pet.skinB || questLevel >= max) {
      return { questLevel, questExp, questReq: req, levelUps: 0 };
    }
    questExp += n;
    let levelUps = 0;
    while (questLevel < max && questExp >= req) {
      questExp -= req;
      questLevel += 1;
      levelUps += 1;
      req = questReq(i, questLevel, stats.questMultiAfterLevelUp);
      if (questLevel >= max) questExp = 0;
    }
    req = questReq(i, questLevel, levelUps > 0 ? stats.questMultiAfterLevelUp : stats.questMulti);
    return { questLevel, questExp, questReq: req, levelUps };
  }

  function generatorOf(i) {
    return C['generator.first'] + i;
  }

  return { chance, questReq, roll, giveExp, generatorOf };
}
