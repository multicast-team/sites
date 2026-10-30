// Короткий вывод чисел в UI («450k», «2.00m», «-9.23qi», «1234») — этап 4.3 (экран Workshop).
// Правила и суффиксы — данные data/ui/workshop.json → format.short (сняты с кадров O; источник — oracle/sources.json →
// ui.workshop43.format, 123 пары «число → текст» сейва fmt + цены и бары 19 состояний). Код наш:
//   |x| < plainFloorFrom      — целое: как есть; дробное: plainDecimals знаков, округление по точному значению (0.125 → 0.12);
//   plainFloorFrom ≤ |x| < plainBelow — целая часть вниз (1234.56 → 1234);
//   иначе группа k = ⌊⌊log10|x|⌋ / 3⌋, v = x / 10^(3k), d знаков по величине v (decimals), m = ⌊v·10^d, округлённое до
//   digits (15) значащих цифр⌋ (вниз, к −∞), и m / 10^d с d знаками + суффикс группы k (4.1e12: v·100 = 409.99999999999994 →
//   410 → «4.10t»; 9999999 → «9.99m»; −9.2234e18 → «−9.23qi»); после последнего суффикса (10^60) — научная запись
//   sciPrefix + 3k («3.50e63»). ?? Округление до 15 цифр и «+1e-9 и вниз» одинаково дают все 182 пары O; выбрано первое.
import { formatFixed } from '../../core/num/real.mjs';

const pow10 = (e) => Number(`1e${e}`);   // ближайший double к 10^e (литерал — правильно округлённый)

/** fmt: { plainBelow, plainFloorFrom, plainDecimals, groupDigits, suffixes: [..], sciPrefix, decimals: [[меньше, знаков]...], digits, rounding: 'floorSignificant' } */
export function makeShortFormat(fmt) {
  const { plainBelow, plainFloorFrom, plainDecimals, groupDigits, suffixes, sciPrefix, decimals, digits } = fmt;
  if (fmt.rounding !== 'floorSignificant') throw new Error(`format.short: округление ${fmt.rounding} не поддержано`);
  return function short(x) {
    const a = Math.abs(x);
    if (!(a >= plainBelow)) {
      if (a >= plainFloorFrom) return String(Math.floor(x));
      return Number.isInteger(x) ? String(x) : formatFixed(x, plainDecimals);
    }
    // группа по десятичному порядку: k = ⌊⌊log10 |x|⌋ / groupDigits⌋ (1e200 = 9.99…e199 → log10 = 200 → «100e198», как у O)
    const k = Math.floor(Math.floor(Math.log10(a)) / groupDigits);
    const v = x / pow10(groupDigits * k);
    const d = (decimals.find(([lt]) => Math.abs(v) < lt) || decimals[decimals.length - 1])[1];
    const m = Math.floor(Number((v * pow10(d)).toPrecision(digits)));   // вниз от числа, округлённого до digits значащих цифр
    const suf = k <= suffixes.length ? suffixes[k - 1] : sciPrefix + groupDigits * k;
    return (d ? formatFixed(m / pow10(d), d) : String(m)) + suf;
  };
}
