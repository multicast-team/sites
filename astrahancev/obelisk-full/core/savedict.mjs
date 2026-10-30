// spec: tick
// Экспорт сейва: словарь «ключ INI → значение» (единственный модуль ядра с ключами INI оригинала; spec oracle/specs/tick.md).

// наше имя таймера в игре ↔ ключ INI
const TIMER_KEYS = {
  gameSeconds: 'single_vars/secondsPlayed',
  realSeconds: 'single_vars/secondsPlayedReal',
  prestigeSeconds: 'single_vars/secondsPassedThisPrestige',
  giftCountdown: 'single_vars/countdownTillFreebie',
  cloudCountdown: 'single_vars/cloudsave_timer',
  founderMark: 'single_vars/highest_founder_recorded',
  bugCounter: 'single_vars/lootbug_counter',
  offlineStamp: 'single_vars/ofl_unix_timestamp',
  saleFlag: 'single_vars/isLimitedTimeSaleAlerted',
  starRotation: 'single_vars/starRotation',
  starPrevRotation: 'single_vars/starRotationPreviousRotation',
  starMinute: 'single_vars/starRotationMinuteInYearOfLastChange',
};

/** Начальные значения таймеров по нашим именам из начального словаря (ключи INI → значения). */
export function initialTimers(initial) {
  const t = {};
  for (const [name, key] of Object.entries(TIMER_KEYS)) t[name] = initial[key];
  return t;
}

export function saveDict(game) {
  if (!game.started) return null;
  const d = {};
  for (const [k, v] of Object.entries(game.initial)) d[k] = Array.isArray(v) ? [] : v;
  for (const [name, key] of Object.entries(TIMER_KEYS)) d[key] = game[name];
  Object.assign(d, game.noGlobal); // правило 8 spec saveini: 194 ключа без глобала
  return d;
}

/** Ключи сейва сундуков (spec chests): сундуки, открыто за всё время, журнал игрока. */
export function chestDict(st) {
  return {
    'chests/chests': st.chests,
    'single_vars/itemChestsOpenedEver': st.opened,
    'single_vars/player_log': st.log.map((e) => ({
      category: e.category, colour: e.colour, count: e.count, height: e.height, plain: e.plain,
      text: e.text, time: e.time, wrap_width: e.wrap_width,
    })),
  };
}

/** Ключи сейва бомб (spec bombs): заряды 13 слотов, число цепи, пауза цепи. */
export function bombDict(st) {
  const d = {};
  for (let i = 0; i < st.charges.length; i++) d[`bomb_stuff/bombCharges_${i}`] = st.charges[i];
  d['single_vars/bombChainCount'] = st.chain;
  d['single_vars/isChainBombPaused'] = !!st.paused;
  return d;
}
