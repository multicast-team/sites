// spec: tick, saveini
// Сессия игры: шаг кадра, старт на кадре S, таймеры новой игры (spec oracle/specs/tick.md, правила 2–8).
import { createClock } from './tick.mjs';
import { initialTimers } from './savedict.mjs';

const US_PER_S = 1000000;

function initialValue(kind, value) {
  if (kind === 'list') return [];
  if (kind === 'bool') return Boolean(value);
  return value;
}

export function createGame({ tick, save, epochSeconds }) {
  const c = tick.constants;
  const clock = createClock(c, epochSeconds);
  const { columns, rows } = save.tables.newGame;
  const iKey = columns.indexOf('key');
  const iKind = columns.indexOf('kind');
  const iValue = columns.indexOf('value');
  const initial = {};
  for (const row of rows) initial[row[iKey]] = initialValue(row[iKind], row[iValue]);

  // ключи сейва без глобала в игре (spec saveini, правило 8): значения новой игры, не меняются
  const noGlobal = {};
  const ng = save.tables.noGlobal;
  const [gKey, gKind, gValue] = ['key', 'kind', 'value'].map((n) => ng.columns.indexOf(n));
  for (const row of ng.rows) noGlobal[row[gKey]] = initialValue(row[gKind], row[gValue]);

  const game = {
    frame: 0,
    deltaUs: 0,
    started: false,
    initial,
    noGlobal,
    // наши таймеры
    ...initialTimers(initial),

    /** Один кадр. */
    step() {
      clock.advance();
      game.frame = clock.frame;
      game.deltaUs = clock.deltaUs;
      const s = game.frame - c.startFrame; // кадров от старта
      if (s < 0) return;
      if (s === 0) { game.started = true; return; }

      game.bugCounter = game.bugCounter + game.deltaUs / US_PER_S;

      if (s % c.secondPeriod === 0) {
        game.gameSeconds += 1;
        game.realSeconds += 1;
        game.prestigeSeconds += 1;
        game.giftCountdown -= 1;
        if (game.giftCountdown === 0) game.giftCountdown = c.freebieReset;
        game.cloudCountdown -= 1;
        if (game.cloudCountdown === 0) game.cloudCountdown = c.cloudReset;
        if (game.founderMark < c.founderMark) game.founderMark = c.founderMark;
      }

      if (s >= c.offlineFirst && (s - c.offlineFirst) % c.offlinePeriod === 0) {
        game.offlineStamp += c.offlineStep;
      }

      if (s >= c.saleFirst && (s - c.saleFirst) % c.salePeriod === 0) game.saleFlag = true;

      if (s % c.starPeriod === 0) {
        const m = clock.minuteInYear();
        if (m !== game.starMinute) {
          game.starRotation += 1;
          game.starPrevRotation = game.starRotation;
          game.starMinute = m;
        }
      }
    },
  };
  return game;
}
