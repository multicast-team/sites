// spec: tick
// Часы кадра: номер кадра, время кадра в нс (BigInt, без потери точности), delta в целых мкс, минута года UTC (spec oracle/specs/tick.md, правила 1 и 7).

const NS_PER_US = 1000n;
const NS_PER_S = 1000000000n;
const MIN_PER_DAY = 1440;
const MIN_PER_HOUR = 60;
const S_PER_MIN = 60n;
const S_PER_DAY = 86400n;

function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// дни от 1970-01-01 → год и номер дня года с нуля (григорианский календарь, целочисленно)
function yearAndDay(days) {
  let y = 1970;
  let d = days;
  if (d >= 0) {
    for (;;) {
      const len = isLeap(y) ? 366 : 365;
      if (d < len) break;
      d -= len;
      y++;
    }
  } else {
    while (d < 0) {
      y--;
      d += isLeap(y) ? 366 : 365;
    }
  }
  return { year: y, dayOfYear: d };
}

/** Минута года UTC по секундам Unix: номер дня года с нуля · 1440 + час · 60 + минута. */
export function minuteInYear(unixSeconds) {
  const s = BigInt(unixSeconds);
  let days = s / S_PER_DAY;
  let rem = s % S_PER_DAY;
  if (rem < 0n) { rem += S_PER_DAY; days -= 1n; }
  const { dayOfYear } = yearAndDay(Number(days));
  const minuteOfDay = Number(rem / S_PER_MIN);
  const hour = Math.floor(minuteOfDay / MIN_PER_HOUR);
  const minute = minuteOfDay - hour * MIN_PER_HOUR;
  return dayOfYear * MIN_PER_DAY + hour * MIN_PER_HOUR + minute;
}

/** Часы кадра: constants — tick.constants из data/systems/boot.json. */
export function createClock(constants, epochSeconds) {
  const frameNs = BigInt(constants.frameNs);
  const phaseNs = BigInt(constants.clockPhaseNs);
  const epochNs = BigInt(epochSeconds) * NS_PER_S;
  const usAt = (k) => (epochNs + phaseNs + BigInt(k) * frameNs) / NS_PER_US;
  const clock = {
    frame: 0,
    deltaUs: 0,
    /** Перейти к следующему кадру. */
    advance() {
      clock.frame += 1;
      clock.deltaUs = Number(usAt(clock.frame) - usAt(clock.frame - 1));
    },
    /** Время кадра, нс от эпохи 1970 (BigInt). */
    timeNs() {
      return epochNs + phaseNs + BigInt(clock.frame) * frameNs;
    },
    /** Время кадра от эпохи часов в мкс (целая часть нс / 1000). */
    timeUs() {
      return usAt(clock.frame);
    },
    /** Минута года UTC по времени кадра. */
    minuteInYear() {
      return minuteInYear(clock.timeNs() / NS_PER_S);
    },
  };
  return clock;
}
