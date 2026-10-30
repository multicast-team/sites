// Попапы урона над камнями (этап 6.6, spec damage-popup правило 8): у каждого попапа ядра (core/popups.mjs) — тень и текст
// стиля text.popup.<вид> (data/ui/kit.json: font.size12 по центру, тень чёрным +1, +1), альфа — альфа попапа.
// Порядок — порядок списка ядра (правило 7).

/** @param {object} deps { kit (makeKit) } */
export function makePopupLayer({ kit }) {
  /** Нарисовать попапы кадра: popups — [{ x, y, text, kind, alpha }] из frame() ядра. */
  function build(list, popups) {
    for (const p of popups) kit.label(list, `text.popup.${p.kind}`, p.x, p.y, p.text, undefined, p.alpha);
    return list;
  }
  return { build };
}
