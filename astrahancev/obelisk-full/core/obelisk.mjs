// spec: obelisk
// Обелиск: статы по уровню, удар кирки (ярусы крита, округление), награды уровней, запертые меню и список открытий.
// Код по спеке oracle/specs/obelisk.md (правила 1–20). Данные — data/systems/obelisk.json, тексты — data/strings.json;
// оба передаёт вызывающий: ядро само в файлы не ходит.

import { roundHalfEven } from './num/real.mjs';
import { pow } from './num/libm.mjs';

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} data    содержимое data/systems/obelisk.json
 * @param {object} strings словарь текстов data/strings.json → .strings
 */
export function makeObelisk(data, strings) {
  const C = data.constants;
  const rewards = tableRows(data.tables.rewards);
  const menus = tableRows(data.tables.menus);
  const unlocks = tableRows(data.tables.unlocks);
  const T = (key) => {
    if (typeof strings[key] !== 'string') throw new Error(`obelisk: нет текста ${key}`);
    return key;
  };
  T(C.rewardNone);
  rewards.forEach((r) => T(r.text));
  menus.forEach((m, i) => {
    if (m.index !== i) throw new Error(`obelisk: меню ${i} не на месте`);
    if (m.description) T(m.description);
  });
  if (menus.length !== C.menuCount) throw new Error('obelisk: число меню ≠ menuCount');

  const rewardByLevel = new Map(rewards.map((r) => [r.level, r.text]));
  const unlockLevels = unlocks.map((u) => u.level).sort((a, b) => a - b);
  const inMenus = (i) => Number.isInteger(i) && i >= 0 && i < C.menuCount;
  const capped = (L) => Math.min(L, C.cap);

  function stats(level, mods = {}) {
    const armorReduction = mods.armorReduction ?? 1;
    const timerMulti = mods.timerMulti ?? 1;
    const damageDone = mods.damageDone ?? 0;
    const L = capped(level);
    const first = pow(C.hpGrowth, Math.min(L, C.growthSwitch + 1));
    const lateN = Math.max(0, L - C.growthSwitch);
    const maxHp = Math.floor((C.hpBase * first) * pow(C.hpGrowthLate, lateN));
    const armor = L === 0
      ? C.armorFirst
      : Math.floor(((C.armorBase * first) * pow(C.armorGrowthLate, lateN)) * armorReduction);
    const gems = level <= C.growthSwitch
      ? C.gemsBase + C.gemsStep * level
      : C.gemsLateStep * (level - C.growthSwitch);
    return { hp: maxHp - damageDone, maxHp, armor, gems, timeLimit: C.timeBase * timerMulti };
  }

  function attack(f, rng) {
    const chances = [f.critChance, f.superCritChance, f.ultraCritChance, f.omegaCritChance];
    const mults = [f.critDamage, f.superCritDamage, f.ultraCritDamage, f.omegaCritDamage];
    let tier = 0;
    while (tier < chances.length && rng.irandom(C.critRoll) < chances[tier]) tier++;
    for (let i = 0; i < C.rngWordsAfterRolls; i++) rng.u32();
    let x = f.pickaxeDamage - f.armor;
    for (let i = 0; i < tier; i++) x *= mults[i];
    let damage = f.level >= C.roundUpFrom ? Math.floor(x + 0.5) : roundHalfEven(x);
    if (!(damage > 0)) damage = 0;
    return { damage, damageDone: Math.min(f.damageDone + damage, f.maxHp) };
  }

  const rewardText = (level) => rewardByLevel.get(level) ?? C.rewardNone;
  const rewardUnlocked = (L, level) => L <= level;
  const rewardClaimed = (L, claimed) => L <= claimed;
  const hasUnclaimedReward = (level, claimed) => claimed < level;
  const claimReward = (claimed) => claimed + 1;

  const menuUnlockLevel = (i) => (inMenus(i) ? menus[i].level : C.menuLockedLevel);
  const menuDescription = (i) => (inMenus(i) && menus[i].description ? menus[i].description : null);
  const menuFromMenuId = (menuId) => menus.findIndex((m) => m.menu === menuId);
  const menuWaiting = (i, level, visited) => inMenus(i) && menus[i].level <= level && !visited[i];
  const anyMenuWaiting = (level, visited) => menus.some((m, i) => menuWaiting(i, level, visited));
  const nextUnlockLevel = (level) => {
    const next = unlockLevels.find((l) => l > level);
    return next === undefined ? -1 : next;
  };

  return {
    stats, attack, rewardText, rewardUnlocked, rewardClaimed, hasUnclaimedReward, claimReward,
    menuUnlockLevel, menuDescription, menuFromMenuId, menuWaiting, anyMenuWaiting, nextUnlockLevel,
  };
}
