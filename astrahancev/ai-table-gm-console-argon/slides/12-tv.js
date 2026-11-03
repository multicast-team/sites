/* Slide 12 · ТВ в бою (1920×1080).  Owner: screens «phone-tv».
   Brief §4.3 «Бой»: left 400 px spotlight of the active hero, centre map (cell 96),
   top turn strip 72/120, right 200 px goal / round / crown, bottom subtitle 48 px with
   Severin medallion.  No service text.  Demo loop plays by itself:
   Severin speaks → player die «?» → result → damage 96 px → turn passes →
   the world rolls a big open d20 → … → the leader falls, the rest flee → replay. */
(function () {
  'use strict';

  var CELL = 96, COLS = 12, ROWS = 9;
  var MAP_X = 484, MAP_Y = 150;            // 1152×864 board
  /* same positions and «Фазы сторон» order as the table (fight-engine.js POS / ORDER): heroes, then the world */
  var POS = { guardian: [4, 4], fury: [4, 5], beacon: [1, 3], arcanist: [1, 5], big: [5, 4], small1: [5, 5], silt: [7, 3], small2: [9, 6] };
  var ORDER = [
    { hero: 'guardian' }, { hero: 'fury' }, { hero: 'beacon' }, { hero: 'arcanist' },
    { enemy: 'tinnik-big', id: 'big' }, { enemy: 'tinnik-silt', id: 'silt' }, { enemy: 'tinnik-small', id: 'small1' }, { enemy: 'tinnik-small', id: 'small2' }
  ];
  var IX = {}; ORDER.forEach(function (o, i) { IX[o.id || o.hero] = i; });

  Deck.register({
    id: '12',
    key: 'tv',
    title: 'ТВ в бою',
    change: 'Герой хода в полный рост, карта крупно, субтитр Северина — и ни строчки служебного',
    surface: 'tv',
    before: 'before/26-fight-scene.webp',
    css: true,
    quiz: [
      { q: 'Кто ходит?', a: 'Герой слева, он же крупно в ленте', sel: '[data-turn]' },
      { q: 'Что сказал Северин?', a: 'Субтитр внизу', sel: '.tv-sub' }
    ],
    mount: mount
  });

  function mount(stage, ctx) {
    var UI = ctx.UI, h = UI.h;
    var gen = 0;
    var root = null;

    function build() {
      var my = ++gen;
      if (root) { var old = root; old.classList.add('is-out'); ctx.setTimeout(function () { old.remove(); }, 500); }
      root = h('div', { class: 'tv' });
      stage.appendChild(root);
      var R = root;

      /* backdrop: the map itself, blurred, fills the frame */
      var bg = h('div', { class: 'tv__bg' }); UI.bgArt(bg, 'map-ford');
      R.appendChild(bg);
      R.appendChild(h('div', { class: 'tv__vig' }));

      /* ---------- map ---------- */
      var toks = UI.FORD.tokens().map(function (t) { var c = Object.assign({}, t); delete c.far; var p = POS[c.id]; if (p) { c.x = p[0]; c.y = p[1]; } return c; });
      var board = UI.board({ map: 'map-ford', cols: COLS, rows: ROWS, cell: CELL, bleed: false, drag: false, tokens: toks, active: 'guardian' });
      var mapBox = h('div', { class: 'tv-map', style: { left: MAP_X + 'px', top: MAP_Y + 'px' } }, board);
      R.appendChild(mapBox);

      /* ---------- top: turn strip ---------- */
      var strip = UI.turnStrip({ dir: 'h', size: 72, big: 120, phase: null, current: 0,
        items: ORDER.map(function (o) { return o.hero ? { hero: o.hero } : { enemy: o.enemy }; }) });
      R.appendChild(h('div', { class: 'tv-strip' }, strip));

      /* ---------- right: goal · round ---------- */
      var leader = UI.medallion({ enemy: 'tinnik-big', hp: 12, max: 12, size: 132, cls: 'tv-goal__leader' });
      leader.appendChild(h('span', { class: 'tv-goal__crown' }, UI.icon('crown')));
      var phaseIc = UI.icon('phase-sun');
      var phase = h('span', { class: 'tv-round__ic' }, phaseIc);
      var roundN = h('b', { class: 'tv-round__n', text: '1/2' });
      var goal = h('div', { class: 'tv-goal' },
        leader,
        h('span', { class: 'tv-goal__then' }, UI.icon('arrow-right')),
        h('span', { class: 'tv-goal__flee' }, UI.icon('flee')),
        UI.rule({ width: 150 }),
        h('div', { class: 'tv-round' }, phase, roundN));
      R.appendChild(goal);

      /* ---------- left: spotlight ---------- */
      var spotBox = h('div', { class: 'tv-spot' });
      R.appendChild(spotBox);
      var spotCur = null;
      var hp = { guardian: 28, fury: 35, beacon: 24, arcanist: 17 };
      var used = {};
      function spotHero(id) {
        var hd = UI.HEROES[id];
        var card = h('div', { class: 'tv-spot__card', style: { '--hero': hd.color }, 'data-turn': '' });
        card.appendChild(h('div', { class: 'tv-spot__glow' }));
        var artEl = h('div', { class: 'tv-spot__art' }); UI.bgArt(artEl, 'hero-' + id);
        artEl.style.backgroundSize = 'contain'; artEl.style.backgroundPosition = '50% 100%';
        card.appendChild(artEl);
        card.appendChild(h('div', { class: 'tv-spot__fade' }));
        var hpN = h('b', { text: String(hp[id]) });
        var ab = hd.shelf.filter(function (s) { return s.cost === 'bonus' || s.cost === 'free' || s.key === 'rage'; }).slice(0, 2);
        card.appendChild(h('div', { class: 'tv-spot__id' },
          h('div', { class: 'tv-spot__name', text: hd.name }),
          h('div', { class: 'tv-spot__stats' },
            h('span', { class: 'tv-stat tv-stat--hp' }, UI.heartSvg(), hpN),
            h('span', { class: 'tv-stat tv-stat--ac' }, UI.icon('shield-ac'), h('b', { text: String(hd.ac) })),
            ab.map(function (a) {
              var d = h('span', { class: 'tv-ab' + (used[id + a.key] ? ' is-used' : '') }); UI.bgArt(d, a.art);
              return d;
            }))));
        card.hpN = hpN;
        return swapSpot(card);
      }
      function spotEnemy(tokId) {
        var t = board.token(tokId), e = UI.ENEMIES[t.enemy];
        var card = h('div', { class: 'tv-spot__card tv-spot__card--enemy', style: { '--hero': UI.ENEMY_COLOR }, 'data-turn': '' });
        card.appendChild(h('div', { class: 'tv-spot__glow' }));
        var m = UI.medallion({ enemy: t.enemy, hp: t.hp, max: t.max, size: 320, cls: 'tv-spot__foe' });
        if (e.leader) m.appendChild(h('span', { class: 'tv-goal__crown tv-spot__crown' }, UI.icon('crown')));
        card.appendChild(m);
        card.appendChild(h('div', { class: 'tv-spot__id' },
          h('div', { class: 'tv-spot__name', text: e.name }),
          h('div', { class: 'tv-spot__stats' },
            h('span', { class: 'tv-stat tv-stat--ac' }, UI.icon('shield-ac'), h('b', { text: String(e.ac) })),
            h('span', { class: 'tv-intent' }, UI.icon('intent-strike')))));
        return swapSpot(card);
      }
      function swapSpot(card) {
        if (spotCur) { var o = spotCur; o.classList.add('is-out'); o.removeAttribute('data-turn'); ctx.setTimeout(function () { o.remove(); }, 520); }
        spotBox.appendChild(card);
        spotCur = card;
        return card;
      }

      /* player roll widget, over the spotlight */
      function playerRoll(o) {
        var die = UI.die(o.die || 'd20', { size: 170 });
        var word = h('div', { class: 'tv-roll__w', text: 'Бросай' });
        var res = h('div', { class: 'tv-roll__res' });
        var w = h('div', { class: 'tv-roll', style: { '--hero': o.color } }, h('div', { class: 'tv-roll__halo' }), die, word, res);
        spotCur.appendChild(w);
        return ctx.sleep(o.wait || 1700).then(function () {
          UI.sound('pick');
          die.setValue(o.value, true);
          word.classList.add('is-gone');
          var parts = [h('b', { class: 'tv-roll__d', text: String(o.value) })];
          (o.extra || []).forEach(function (x) { parts.push(h('span', { text: '+' + x })); });
          if (o.mod) parts.push(h('span', { text: UI.fmtMod(o.mod) }));
          parts.push(h('i', { text: '=' }));
          parts.push(h('b', { class: 'tv-roll__t', text: String(o.total) }));
          if (o.vs != null) parts.push(h('span', { class: 'tv-roll__vs' + (o.hit ? ' is-hit' : ' is-miss') }, UI.icon('shield-ac'), h('em', { text: String(o.vs) })));
          parts.forEach(function (p) { res.appendChild(p); });
          res.classList.add('is-on');
          if (o.crit) { w.classList.add('is-crit'); UI.flash(stage, 'rgba(255,211,107,.35)', 520); UI.shake(stage, 6); UI.sound('crit'); }
          return ctx.sleep(o.hold || 1500);
        }).then(function () { w.classList.add('is-out'); return ctx.sleep(300); }).then(function () { w.remove(); });
      }

      /* ---------- bottom: Severin subtitle ---------- */
      var sev = UI.severin({ size: 96, state: 'idle', cycle: false });
      var face = h('span', { class: 'tv-sub__face' });     // a player's line: the speaker's own portrait
      var subT = h('div', { class: 'tv-sub__t' });
      var sub = h('div', { class: 'tv-sub' }, h('span', { class: 'tv-sub__who' }, sev, face), subT);
      R.appendChild(sub);
      function say(text, who, ms) {
        subT.classList.add('is-swap');
        return ctx.sleep(180).then(function () {
          subT.innerHTML = '';
          if (who) subT.appendChild(h('b', { style: { color: UI.heroColor(who) }, text: UI.HEROES[who].short + ': ' }));
          subT.appendChild(document.createTextNode(text));
          subT.classList.remove('is-swap');
          if (who) { UI.bgArt(face, 'bust-' + who); face.style.setProperty('--hero', UI.heroColor(who)); }
          sub.classList.toggle('is-player', !!who);
          sev.setState(who ? 'listening' : 'speaking');
          return ctx.sleep(ms || 2200);
        }).then(function () { sev.setState('idle'); });
      }

      /* speaker in the corner (sound on), no words */
      R.appendChild(h('div', { class: 'tv-spk' }, UI.icon('speaker')));

      /* ---------- demo script ---------- */
      function alive() { return ctx.alive() && my === gen; }
      function turn(i, isWorld) {
        strip.setCurrent(i);
        UI.setIcon(phaseIc, isWorld ? 'phase-skull' : 'phase-sun');
        phase.classList.toggle('is-world', !!isWorld);
        UI.sound('turn');
      }
      function hpTo(id, v) { hp[id] = v; board.setHp(id, v); if (spotCur && spotCur.hpN) { spotCur.hpN.textContent = v; } }

      async function play() {
        await ctx.sleep(700); if (!alive()) return;
        // раунд 1 · фаза героев · Никита (уже у воды, рядом с Матёрым)
        turn(IX.guardian); board.setActive('guardian'); spotHero('guardian');
        await say('Никита, матёрый тинник у самой воды.'); if (!alive()) return;
        await say('Бью его молотом!', 'guardian', 1600); if (!alive()) return;
        var arr = board.arrow('guardian', 'big', { color: UI.heroColor('guardian'), width: 10 });
        await playerRoll({ color: UI.heroColor('guardian'), value: 15, mod: 5, total: 20, vs: 13, hit: true }); if (!alive()) return;
        await playerRoll({ die: 'd8', color: UI.heroColor('guardian'), value: 6, mod: 3, total: 9, wait: 1200, hold: 900 }); if (!alive()) return;
        board.pop('big', 9, 'dmg'); UI.sound('hit'); board.setHp('big', 3); leader.setHp(3);
        if (arr) arr.remove2();
        await say('Молот вминает тинника в ил!', null, 2000); if (!alive()) return;

        // Настасья — мимо
        turn(IX.fury); board.setActive('fury'); spotHero('fury');
        var fa0 = board.arrow('fury', 'big', { color: UI.heroColor('fury'), width: 10 });
        await playerRoll({ color: UI.heroColor('fury'), value: 6, mod: 5, total: 11, vs: 13, hit: false, wait: 1300, hold: 1100 }); if (!alive()) return;
        board.pop('big', null, 'miss'); UI.sound('miss');
        if (fa0) fa0.remove2();
        await say('Секира рубит воду.', null, 1600); if (!alive()) return;

        // фаза мира: Матёрый тинник
        turn(IX.big, true); board.setActive('big'); spotEnemy('big');
        board.intent('big', { icon: 'intent-strike' });
        var ea = board.arrow('big', 'guardian', { enemy: true, width: 10 });
        await say('Матёрый тинник хлещет Никиту тиной!', null, 1400); if (!alive()) return;
        await UI.rollDie(stage, MAP_X + 576, MAP_Y + 400, { die: 'd20', value: 14, mod: 4, size: 230, hold: 1300 }); if (!alive()) return;
        board.pop('guardian', 7, 'dmg'); UI.sound('hit'); hpTo('guardian', 21);
        board.clearIntent('big'); if (ea) ea.remove2();
        await ctx.sleep(900); if (!alive()) return;

        // раунд 2 · Настасья — крит
        roundN.textContent = '2/2';
        turn(IX.fury); board.setActive('fury'); spotHero('fury');
        await say('Настасья, твой черёд. Секира ждёт.'); if (!alive()) return;
        var fa = board.arrow('fury', 'big', { color: UI.heroColor('fury'), width: 10 });
        await playerRoll({ color: UI.heroColor('fury'), value: 20, mod: 5, total: 25, vs: 13, hit: true, crit: true }); if (!alive()) return;
        await playerRoll({ die: 'd12', color: UI.heroColor('fury'), value: 9, extra: [6], mod: 3, total: 18, wait: 1100, hold: 900 }); if (!alive()) return;
        board.pop('big', 18, 'crit'); UI.sound('crit'); UI.shake(stage, 6);
        board.setHp('big', 0); leader.setHp(0);
        if (fa) fa.remove2();
        await ctx.sleep(500); if (!alive()) return;
        board.kill('big'); leader.setState('dead'); strip.items[IX.big].classList.add('is-gone');
        goal.classList.add('is-won');
        UI.sound('flee');
        ['silt', 'small1', 'small2'].forEach(function (id, k) { ctx.setTimeout(function () { board.flee(id, 5); }, 400 + k * 260); });
        [IX.silt, IX.small1, IX.small2].forEach(function (i) { strip.items[i].classList.add('is-gone'); });
        await say('Матёрый пал! Тинники бегут в ил.', null, 3400); if (!alive()) return;
        R.classList.add('is-victory');
        await ctx.sleep(2600); if (!alive()) return;
        build();
      }
      play();
    }

    build();
  }
})();
