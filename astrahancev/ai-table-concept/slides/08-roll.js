/* Slide 08 «Бросок кубиков».  Owner: screens «fight».  Mounts the shared fight engine at state «roll». */
(function () {
  'use strict';
  if (!window.FightEngine && !document.querySelector('script[data-fight-engine]')) {
    var sc = document.createElement('script');
    sc.src = 'slides/fight-engine.js'; sc.setAttribute('data-fight-engine', '');
    document.head.appendChild(sc);
  }
  Deck.register({
    id: '08', key: 'roll',
    title: 'Бросок кубиков',
    change: 'Карточка выезжает у героя: кубик, «Бросай» и только возможные числа',
    surface: 'table',
    before: 'before/22-moment-roll-card-tabletop.webp',
    css: 'slides/fight.css',
    quiz: [
      { q: 'Что нажать?', a: 'Плитку с числом с настоящего кубика', sel: '.dcard__tiles, [data-main]' },
      { q: 'Чей ход?', a: 'Никита', sel: '[data-turn]' }
    ],
    mount: function (stage, ctx) {
      if (!window.FightEngine) { ctx.on(window, 'fight-engine-ready', function () { ctx.remount(); }); return; }
      return window.FightEngine.mount(stage, ctx, { start: 'roll' });
    }
  });
})();
