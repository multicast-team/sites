/* Slide 09 «Подтверждение».  Owner: screens «fight».  Mounts the shared fight engine at state «confirm». */
(function () {
  'use strict';
  if (!window.FightEngine && !document.querySelector('script[data-fight-engine]')) {
    var sc = document.createElement('script');
    sc.src = 'slides/fight-engine.js'; sc.setAttribute('data-fight-engine', '');
    document.head.appendChild(sc);
  }
  Deck.register({
    id: '09', key: 'confirm',
    title: 'Подтверждение',
    change: 'Черновик виден на карте, одна печать на оба края стола',
    surface: 'table',
    before: 'before/20-moment-approval-lay-out-mf-ford-tutorial-table.webp',
    css: 'slides/fight.css',
    quiz: [
      { q: 'Что нажать?', a: 'Печать «Подтвердить»', sel: '[data-main]' },
      { q: 'Чей ход?', a: 'Никита', sel: '[data-turn]' }
    ],
    mount: function (stage, ctx) {
      if (!window.FightEngine) { ctx.on(window, 'fight-engine-ready', function () { ctx.remount(); }); return; }
      return window.FightEngine.mount(stage, ctx, { start: 'confirm' });
    }
  });
})();
