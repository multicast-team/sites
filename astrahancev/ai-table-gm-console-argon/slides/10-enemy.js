/* Slide 10 «Ход врага и реакция».  Owner: screens «fight».  Mounts the shared fight engine at state «enemy». */
(function () {
  'use strict';
  if (!window.FightEngine && !document.querySelector('script[data-fight-engine]')) {
    var sc = document.createElement('script');
    sc.src = 'slides/fight-engine.js'; sc.setAttribute('data-fight-engine', '');
    document.head.appendChild(sc);
  }
  Deck.register({
    id: '10', key: 'enemy',
    title: 'Ход врага и реакция',
    change: 'Намерения врагов стрелками, кубики мира открыто, реакция выезжает у сиденья',
    surface: 'table',
    before: 'before/23-fight-table.webp',
    css: 'slides/fight.css',
    quiz: [
      { q: 'Что нажать?', a: 'Ничего — смотреть; у Кощея «Щит» ✓', sel: '[data-main], .arrow--enemy' },
      { q: 'Чей ход?', a: 'Тинники', sel: '[data-turn]' }
    ],
    mount: function (stage, ctx) {
      if (!window.FightEngine) { ctx.on(window, 'fight-engine-ready', function () { ctx.remount(); }); return; }
      return window.FightEngine.mount(stage, ctx, { start: 'enemy' });
    }
  });
})();
