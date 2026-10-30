// spec: offline
// Offline: офлайн ч. 1 — секунды офлайна, первая руда этажа, доля поляны дронов, сырое число зачисток.
// Правила 21, 23–27: сырое число зачисток, шанс «a из b», частичное округление, итог зачисток (прямой и события офлайна).
// Правила 29–34: доля бомбы, доля поляны с бомбами и цепь, итог зачисток с бомбами (прямой и события).
// Правила 37–45 (версия 4.1; 45 — переполнение рыбы, fixFishOverflow): звёзды, рыбалка и Arcanist в событии — ворота (37), тики рыбалки (38, при любых скорости игры и шансах двойного и тройного тика), улов (39, вне спеки при тиках),
// обмен волшебников (40), мана (41), эссенции (42, вне спеки при начатом Arcanist), звёзды (43, вне спеки при открытых).
// Код по спеке oracle/specs/offline.md (правила 1–21, 23–27, 29–34, 37–45). Данные — data/systems/offline.json, передаёт вызывающий:
// ядро само в файлы не ходит.

/**
 * @param {object} data содержимое data/systems/offline.json
 */
export function makeOffline(data) {
  const c = data.constants;

  function seconds(serverTime, stamp, opts = {}) {
    if ((opts.founder ?? 0) !== 0) throw new Error('вне спеки offline (??)');
    const s = Math.min(serverTime - stamp, c['cap.seconds']);
    return { seconds: s, window: s >= c['window.minSeconds'] };
  }

  function firstOre(floor, baseOre) {
    const odd = floor % 2;
    const first = odd ? baseOre : baseOre - 1;
    return { first, second: first + 1, firstShare: c['share.firstEven'] + odd * c['share.firstOddExtra'] };
  }

  function avgMult(chance, multi) {
    return 1 + Math.min(1, chance / c.percent) * (multi - 1);
  }

  function safeDiv(x, d) {
    if (Math.abs(d) <= c['safeDiv.epsilon']) return x * c['safeDiv.big'];
    return x / d;
  }

  // P — шансы ярусов 1..4 долями (P[k - 1] — шанс яруса k), M — множители ярусов 0..4
  function hitShare(h, P, M, minTier) {
    const top = c['crit.topTier'];
    const tier = (k) => (k >= minTier ? Math.min(1, M[k] / h) : 0);
    const from = (k) => {
      if (k >= top) return tier(top);
      const p = P[k];
      return (1 - p) * tier(k) + p * from(k + 1);
    };
    return from(0);
  }

  function droneShare(stats, floor, first, second, hp, modsFirst, modsSecond) {
    const n = Math.max(1, stats.droneCount);
    const dmg = stats.pickaxeDamage * stats.droneMulti * avgMult(stats.drone3xChance, c['drone.tripleMulti']);
    const fast = stats.droneAttackSpeed * avgMult(stats.droneRapidFireChance, c['drone.rapidMulti']);
    const r = stats.droneRadius;
    const gap = Math.max(0, c['drone.gapWidth'] - 2 * r);
    const gapOn = gap > 0 ? 1 : 0;
    const single = n === 1 ? 1 : 0;
    const span = Math.max(0, c['drone.spanWidth'] / Math.max(1, n - gapOn) - 2 * r);
    const k = n === 1 && gap > 0 ? 2 : 1;
    const fly = (gap * single + span * k) / (stats.droneMovespeed * c['drone.framesPerSecond']);

    const pc = c.percent;
    const P = [stats.critChance / pc, stats.superCritChance / pc, stats.ultraCritChance / pc, stats.omegaCritChance / pc];
    const M = [1];
    M[1] = stats.critDamage;
    M[2] = stats.critDamage * stats.superCritDamage;
    M[3] = M[2] * stats.ultraCritDamage;
    M[4] = M[3] * stats.omegaCritDamage;

    const hits = (ore, mods) => {
      const h = hp[ore] / (dmg * mods[1]);
      return safeDiv(1, hitShare(h, P, M, mods[2]));
    };
    const fr = c['share.firstEven'] + (floor % 2) * c['share.firstOddExtra'];
    const t = Math.max(
      c['drone.minHitTime'] / fast,
      fr * hits(first, modsFirst) + (1 - fr) * hits(second, modsSecond)
        - r * stats.droneAttackSpeed / stats.droneMovespeed / c['drone.framesPerSecond'],
    );
    const body = t * stats.oresPerScreen / c['drone.oresDivisor'] / n / fast;
    return c['drone.scale'] / (1 + body + fly);
  }

  function rawClears(secs, share) {
    return secs / c['clears.secondsPerMinute'] * c['clears.screensPerMinute'] * Math.min(1, share);
  }

  // правило 25: 63-битное целое из двух слов (первое — младшие 32 бита, второе — старшие, старший бит обнуляется)
  function chance(rng, a, b) {
    const lo = BigInt(rng.u32());
    const hi = BigInt(rng.u32()) & 0x7fffffffn;
    const u = lo | (hi << 32n);
    return Number(u % BigInt(Math.trunc(b))) + 1 <= a;
  }

  // правило 24: бросок делается всегда, даже у целого x
  function partial(rng, x) {
    const whole = Math.floor(x);
    const frac = x % 1;
    return chance(rng, frac * c['partial.scale'], c['partial.scale']) ? whole + 1 : whole;
  }

  // правило 27
  function clears(secs, share, rng) {
    return partial(rng, rawClears(secs, share));
  }

  // правило 26: событие пропускает слова встроенного ГСЧ до броска зачисток
  function eventClears(secs, share, rng) {
    for (let i = 0; i < c['event.rngWordsBeforeClears']; i++) rng.u32();
    return clears(secs, share, rng);
  }

  // правила 29–30: доля бомбы слота на паре руд — меньшая из долей удара по первой и второй руде
  function bombShare(bs, multi, first, second, hp, modsFirst, modsSecond) {
    const dmg = c['bomb.baseDamage'] * bs.damageMulti * multi;
    const pc = c.percent;
    const P = [bs.critChance / pc, bs.superCritChance / pc, bs.ultraCritChance / pc, bs.omegaCritChance / pc];
    const M = [1];
    M[1] = bs.critDamage;
    M[2] = bs.critDamage * bs.superCritDamage;
    M[3] = M[2] * bs.ultraCritDamage;
    M[4] = M[3] * bs.omegaCritDamage;
    const one = (ore, mods) => hitShare(hp[ore] / (dmg * mods[0]), P, M, mods[2]);
    return Math.min(one(first, modsFirst), one(second, modsSecond));
  }

  // правила 31–33
  function bombFloor(minutes, o) {
    const S = minutes * c['clears.screensPerMinute'];
    const chainSlot = c['bomb.chainSlot'];
    const b = o.bombShares;
    let share = 0;
    for (let i = 0; i < c['bomb.count']; i++) {
      if (i === chainSlot) continue;
      share = Math.min(1, share + o.used[i] * b[i]);
    }
    share = Math.min(1, share + o.droneShare);
    let rate = Math.min(1, o.chain / S);
    if (Number.isNaN(rate)) rate = 0;
    const rest = 1 - share;
    let chainSpent = 0;
    if (rest > 0 && !o.paused) {
      const x = Math.min(rate, rest / b[chainSlot]);
      share = Math.min(1, share + x * b[chainSlot]);
      chainSpent = Math.floor(x * S + 0.5);
    }
    return { share, chainSpent, screens: S };
  }

  // правило 34, прямой расчёт
  function bombClears(minutes, o, rng) {
    const f = bombFloor(minutes, o);
    return { clears: partial(rng, f.screens * f.share), share: f.share, chainSpent: f.chainSpent };
  }

  // правило 34, событие: пропуск слов до броска
  function eventBombClears(secs, o, rng) {
    for (let i = 0; i < c['event.rngWordsBeforeClears']; i++) rng.u32();
    return bombClears(secs / c['clears.secondsPerMinute'], o, rng);
  }

  const outOfSpec = () => { throw new Error('вне спеки offline (??)'); };

  // правила 37–38: тики = ⌊s · кадры / скорость тика⌋; без начатой рыбалки или окна — 0;
  // скорость игры и шансы двойного и тройного тика не влияют (38, версия 4.1), шанс 5x ≠ 0 — вне спеки
  function eventFishing(secs, window, o) {
    if (!o.started || !window) return { ticks: 0 };
    if (o.x5Tick !== 0) outOfSpec();
    return { ticks: Math.floor(secs * c['fish.framesPerSecond'] / o.tickSpeed) };
  }

  // правила 37, 39
  function eventFishCaught(ticks) {
    if (ticks !== 0) outOfSpec();
    return 0;
  }

  // правило 45: больше границы (в том числе +∞) → замена; новый массив, вход не меняется
  function fixFishOverflow(values) {
    return values.map((x) => (x > c['fish.overflowAbove'] ? c['fish.overflowValue'] : x));
  }

  // правило 40
  function eventWizards(secs, window, o) {
    if (!o.started || !window) return { progress: o.progress, resets: o.resets };
    const t = o.progress + secs;
    const n = Math.floor(t / c['wizard.exchangeSeconds']);
    return { progress: t - c['wizard.exchangeSeconds'] * n, resets: Math.min(o.cap, o.resets + n) };
  }

  // правило 41
  function eventMana(secs, window, o) {
    if (!o.started || !window) return o.mana;
    return Math.min(o.cap, o.mana + secs / c['mana.secondsPerPoint'] * o.regenMulti);
  }

  // правила 37, 42
  function eventEssence(secs, window, o) {
    if (!o.started || !window) return 0;
    return outOfSpec();
  }

  // правила 37, 43
  function eventStars(secs, window, o) {
    const open = Array.isArray(o.unlocked) ? o.unlocked.some((x) => x !== 0) : o.unlocked !== 0;
    if (!open || !window) return { stars: 0, superStars: 0 };
    return outOfSpec();
  }

  return {
    eventFishing, fixFishOverflow, eventFishCaught, eventWizards, eventMana, eventEssence, eventStars,
    seconds, firstOre, avgMult, safeDiv, hitShare, droneShare, rawClears, chance, partial, clears, eventClears,
    bombShare, bombFloor, bombClears, eventBombClears,
  };
}
