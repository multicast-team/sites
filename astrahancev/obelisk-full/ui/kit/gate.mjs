// spec: input-layout
// Ворота проверки (этап 6.3, правило 7): окно значков вверху справа держит ворота; ответ проверки области = ворота и правило 5.
import { hitArea } from './input.mjs';

/** Ворота по данным gate (kit.json → gate): { icons: { имя: [a, b, c, d] }, close: [a, b, c, d] }; окно «нет». */
export function makeGate(gateData) {
  const { icons, close } = gateData;
  let win = null;          // имя значка или null (7)
  let onIcon = false;      // последнее нажатие попало в значок (7.2)

  const iconAt = (g) => Object.keys(icons).find((name) => hitArea(g, ...icons[name])) ?? null;

  return {
    /** Нажатие (7.1): значок открывает своё окно, повторное касание того же значка закрывает. */
    press(g) {
      const name = iconAt(g);
      onIcon = name !== null;
      if (onIcon) win = win === name ? null : name;
    },
    /** Отпускание (7.2–7.3): кнопка закрытия закрывает любое окно, если нажатие не было значком. */
    release(g) {
      if (win !== null && !onIcon && hitArea(g, ...close)) win = null;
      onIcon = false;
    },
    /** Ворота открыты ⇔ окно «нет». */
    isOpen: () => win === null,
    window: () => win,
    /** Проверка области с учётом ворот (7.4). */
    hit(g, a, b, c, d) {
      return win === null && hitArea(g, a, b, c, d);
    },
  };
}
