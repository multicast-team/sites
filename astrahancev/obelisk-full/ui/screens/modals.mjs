// Окна и всплывающие элементы мира 1 из UI-кита (этап 6.3): окна значков (Stat Pages, Currencies), тост хаба, меню ☰ (Menu Options),
// листы офлайна (Offline Gains: начало и итог). Вёрстка — стили data/ui/kit.json (window.*, modal.window, tabs.*, toast.hub,
// menu.options, sheet.*); источник чисел — oracle/sources.json → ui.modal63. Содержимое окон (строки статистики, валюты, итоги
// офлайна) — экраны своих систем (фазы 6–8), здесь только рамка компонента.
// Входы — состояние экрана: открытая страница/вкладка, закрытые вкладки, панель заданий, текст и альфа тоста, флажки меню.

export function makeModals(kit, kitDoc, strings) {
  const S = kitDoc.styles;
  const t = (k) => {
    if (!(k in strings)) throw new Error(`modals: нет текста ${k}`);
    return strings[k];
  };
  const topOf = (modalId, tasksPanel) => S[modalId].top + (tasksPanel ? S[modalId].tasksShift : 0);

  /** Окно Stat Pages: page — открытая страница (0…), tasksPanel — над главным экраном панель заданий NPE. */
  function statsWindow(list, { page, tasksPanel = false }) {
    const w = S['window.stats'];
    const top = topOf(w.modal, tasksPanel);
    kit.modal(list, w.modal, top);
    kit.tabs(list, w.tabs, w.tabsX, top + w.tabsDy, w.labels.map(t), page, t(w.caption));
    return top;
  }

  /** Окно Currencies: selected — открытая вкладка, locked — номера закрытых вкладок (миры, которых ещё нет). */
  function currenciesWindow(list, { selected, locked = [], tasksPanel = false }) {
    const w = S['window.currencies'];
    const top = topOf(w.modal, tasksPanel);
    kit.modal(list, w.modal, top);
    kit.iconTabs(list, w.tabs, w.tabsX, top + w.tabsDy, w.icons, selected, locked, t(w.caption));
    return top;
  }

  /** Тост хаба: text — готовая строка, alpha — альфа полосы в этом кадре (анимация тоста), y — центр полосы. */
  function hubToast(list, { text, alpha, y }) {
    kit.toast(list, 'toast.hub', y, text, alpha);
  }

  /** Меню ☰ открыто: rows = [{key, checked}] — ключи текстов строк меню своего экрана. */
  function menuOptions(list, { rows }) {
    kit.menuOptions(list, 'menu.options', t('t.menu_options'), rows.map((r) => ({ text: t(r.key), checked: !!r.checked })));
  }

  /** Лист офлайна: рамка, тёмное поле и кнопка — части в порядке рисования, между ними содержимое. kind — 'offlineStart' | 'offlineResult'. */
  const SHEET = { offlineStart: ['sheet.offlineStart', 't.confirm'], offlineResult: ['sheet.offlineResult', 't.close'] };
  function sheetFrame(list, kind) { kit.sheet(list, SHEET[kind][0]); }
  function sheetInner(list, kind) { kit.sheetInner(list, SHEET[kind][0]); }
  function sheetButton(list, kind) { kit.sheetButton(list, SHEET[kind][0], t(SHEET[kind][1])); }

  return { statsWindow, currenciesWindow, hubToast, menuOptions, sheetFrame, sheetInner, sheetButton };
}
