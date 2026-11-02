/* Slide 07 «Бой — мой ход».  Owner: screens «fight».  Mounts the shared fight engine at state «turn». */
(function () {
  'use strict';
  if (!window.FightEngine && !document.querySelector('script[data-fight-engine]')) {
    var sc = document.createElement('script');
    sc.src = 'slides/fight-engine.js'; sc.setAttribute('data-fight-engine', '');
    document.head.appendChild(sc);
  }
  Deck.register({
    id: '07', key: 'fight',
    title: 'Бой — мой ход',
    change: 'Карта на весь стол, герой и умения под рукой — светится только то, что трогать',
    surface: 'table',
    before: 'before/25-fight-tabletop.webp',
    css: 'slides/fight.css',
    quiz: [
      { q: 'Что нажать?', a: 'Умение «Атака» у Никиты', sel: '[data-main]' },
      { q: 'Чей ход?', a: 'Никита (ближний левый)', sel: '[data-turn]' }
    ],
    mount: function (stage, ctx) {
      if (!window.FightEngine) { ctx.on(window, 'fight-engine-ready', function () { ctx.remount(); }); return; }
      return window.FightEngine.mount(stage, ctx, { start: 'turn' });
    }
  });
})();
