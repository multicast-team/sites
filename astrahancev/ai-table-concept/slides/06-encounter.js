/* =====================================================================
   Slide 06 · «Перед боем» (brief §4.1).  Owner: story screens.
   The ford picture gives way to the map; heroes land on start cells,
   enemies burst in with a flash.  ONE gold seal «В бой» (crossed swords)
   pulses in both nodes.  Tap → initiative: each node shows a d20 and the
   party portraits, the first seat is lit (tap another to change roller),
   a dice card slides out of that seat → tile → check → number pop →
   the world rolls openly → the turn strip forms on the left end.
   ===================================================================== */
(function () {
  'use strict';

  var ORDER = ['nearLeft', 'nearRight', 'farLeft', 'farRight'];
  var INIT = { guardian: 1, fury: 2, beacon: 0, arcanist: 2, shadow: 3, voice: 2 };
  var WORLD = { roll: 9, mod: 1 };          // the world's initiative, rolled openly
  var ENEMY_ORDER = ['big', 'silt', 'small1', 'small2'];

  Deck.register({
    id: '06',
    key: 'encounter',
    title: 'Перед боем',
    change: 'Карта проявляется сама, враги появляются со вспышкой; одна печать «В бой», инициатива — плитками',
    surface: 'table',
    before: 'before/17-encounter-tabletop.webp',
    css: true,
    quiz: [
      { q: 'Что нажать?', a: 'Печать «В бой»', sel: '[data-main]' },
      { q: 'Чей ход?', a: 'Ничей: бой ещё не начат', sel: '[data-turn]' }
    ],

    mount: function (stage, ctx) {
      var UI = ctx.UI, h = UI.h;
      var root = h('div', { class: 'en' });
      stage.appendChild(root);
      var L = UI.tableLayout(root, {});
      var nodes = L.nodes();
      var seats = {};
      ORDER.forEach(function (pos) {
        var seat = L.seat(pos, { hero: UI.PARTY4[pos], slots: [], endTurn: false });
        var ha = h('div', { class: 'en-heroart' });
        UI.bgArt(ha, 'hero-' + UI.PARTY4[pos]);
        seat.insertBefore(ha, seat.children[1]);
        seats[pos] = seat;
      });

      /* ---------- centre: ford picture → map ---------- */
      var pic = h('div', { class: 'en-pic' });
      UI.bgArt(pic, 'cover-ford');
      L.center.appendChild(pic);
      var board = UI.board({ map: UI.FORD.map, tokens: [], drag: false });
      var boardBox = h('div', { class: 'en-board' }, board);
      L.center.appendChild(boardBox);

      var all = UI.FORD.tokens();
      var heroToks = all.filter(function (t) { return t.hero; });
      var enemyToks = all.filter(function (t) { return t.enemy; });

      /* ---------- right end: goal emblem ---------- */
      var goal = h('button', { class: 'en-goal', type: 'button', 'aria-label': 'Цель боя' },
        h('span', { class: 'en-goal__crown' }, UI.icon('crown')),
        UI.medallion({ enemy: 'tinnik-big', size: 96, cls: 'en-goal__m' }),
        h('span', { class: 'en-goal__arrow' }, UI.icon('arrow-right')),
        h('span', { class: 'en-goal__flee' }, UI.icon('flee')));
      goal.addEventListener('click', function (e) {
        var p = ctx.local(e);
        UI.sheet(stage, { icon: 'crown', title: 'Цель', text: UI.FORD.goal + '. Раунд 1 из 2.', x: 1480, y: p.y, rot: p.y < 540 ? 180 : 0 });
      });
      L.endR.appendChild(goal);

      var st = { pair: null, roller: 'nearLeft', card: null, cardBox: null, locked: false, inits: [] };

      /* ---------- intro: map, heroes, enemies, seal ---------- */
      /* the picture opens from the centre (a masked hole that grows by scale) and the map shows through */
      ctx.setTimeout(function () { boardBox.classList.add('is-on'); pic.classList.add('is-out'); UI.sound('open'); }, 120);
      ctx.setTimeout(function () { pic.remove(); }, 1400);
      heroToks.forEach(function (t, i) {
        ctx.setTimeout(function () {
          var tk = board.addToken(Object.assign({}, t));
          tk.el.classList.add('en-drop');
          var c = board.cellCenter(t.x, t.y);
          ctx.setTimeout(function () { UI.spark(board.fx, c.x, c.y, UI.heroColor(t.hero), 10); UI.sound('tap'); }, 260);
        }, 380 + i * 110);
      });
      enemyToks.forEach(function (t, i) {
        ctx.setTimeout(function () {
          var tk = board.addToken(Object.assign({}, t));
          tk.el.classList.add('en-burst');
          var c = board.cellCenter(t.x, t.y);
          var ring = h('div', { class: 'en-ring', style: { left: c.x + 'px', top: c.y + 'px' } });
          board.fx.appendChild(ring);
          ctx.setTimeout(function () { ring.remove(); }, 800);
          UI.spark(board.fx, c.x, c.y, 'var(--dmg)', 12);
          UI.flash(L.center, 'rgba(184,69,58,.28)', 280);
          UI.sound('hit');
        }, 520 + i * 150);
      });
      ctx.setTimeout(function () { goal.classList.add('is-on'); }, 1000);
      ctx.setTimeout(showSeal, 1100);

      function showSeal() {
        st.pair = UI.sealPair(nodes, { icon: 'swords', word: 'В бой', onPress: startInitiative });
      }

      /* ---------- initiative ---------- */
      function startInitiative() {
        st.pair = null;
        UI.sound('turn');
        nodes.forEach(function (n) {
          n.classList.add('en-has-init');
          var die = UI.die('d20', { size: 66 });
          var row = h('div', { class: 'en-init__row' });
          var pics = ORDER.map(function (pos) {
            var hero = UI.PARTY4[pos];
            var b = h('button', { class: 'en-init__p', type: 'button', 'data-pos': pos, 'aria-label': UI.HEROES[hero].short, style: { '--hero': UI.HEROES[hero].color } },
              UI.medallion({ hero: hero, size: 52 }));
            b.addEventListener('click', function () { if (!st.locked) setRoller(pos, true); });
            row.appendChild(b);
            return b;
          });
          var box = h('div', { class: 'en-init' }, h('div', { class: 'en-init__die' }, die), row);
          n.appendChild(box);
          st.inits.push({ node: n, box: box, die: die, pics: pics });
        });
        setRoller(st.roller, false);
      }

      function setRoller(pos, user) {
        if (user && pos === st.roller && st.card) return;
        st.roller = pos;
        if (user) UI.sound('pick');
        st.inits.forEach(function (it) {
          it.pics.forEach(function (b) {
            var on = b.dataset.pos === pos;
            b.classList.toggle('is-on', on);
            if (on && user) { var p = UI.center(b, stage); UI.spark(stage, p.x, p.y, b.style.getPropertyValue('--hero'), 8); }
          });
        });
        ORDER.forEach(function (q) {
          seats[q].classList.toggle('is-active', q === pos);
          seats[q].classList.toggle('is-dim', q !== pos);
          seats[q].medal.setState(q === pos ? 'active' : '');
        });
        openCard(pos);
      }

      function openCard(pos) {
        if (st.card) {
          var old = st.card, oldBox = st.cardBox;
          old.close();
          ctx.setTimeout(function () { oldBox.remove(); }, 340);
        }
        var hero = UI.PARTY4[pos], far = pos.indexOf('far') === 0;
        var box = h('div', { class: 'en-roll en-roll--' + pos });
        if (far) box.setAttribute('data-far', '');
        var card = UI.diceCard({
          die: 'd20', mod: INIT[hero], hero: hero, word: 'Бросай',
          onMic: function (m) { m.setState(m.state() === 'listening' ? 'idle' : 'listening'); },
          onConfirm: function (v, el) { confirm(v, el, pos); }
        });
        box.appendChild(card);
        root.appendChild(box);
        st.card = card; st.cardBox = box;
      }

      function confirm(v, card, pos) {
        st.locked = true;
        var hero = UI.PARTY4[pos], total = v + INIT[hero], far = pos.indexOf('far') === 0;
        var d = card.querySelector('.die'), p = UI.center(d, stage);
        UI.pop(stage, p.x, p.y + (far ? 170 : -170), String(total), 'crit', { size: 96, rot: far ? 180 : 0 });
        st.inits.forEach(function (it) {
          it.die.setValue(total, true);
          it.box.classList.add('is-rolled');
          it.pics.forEach(function (b) { b.disabled = true; });
        });
        ctx.setTimeout(function () {
          card.close();
          var box = st.cardBox; st.card = null;
          ctx.setTimeout(function () { box.remove(); }, 340);
          worldRoll(total);
        }, 900);
      }

      function worldRoll(heroTotal) {
        var wTotal = WORLD.roll + WORLD.mod;
        // the world rolls openly inside both nodes (brief §4.1): the party's die steps aside first
        st.inits.forEach(function (it) { it.box.classList.add('is-out'); });
        ctx.setTimeout(function () {
          UI.rollDie(stage, 960, 984, { die: 'd20', value: WORLD.roll, mod: WORLD.mod, size: 104, hold: 1100 });
          UI.rollDie(stage, 960, 96, { die: 'd20', value: WORLD.roll, mod: WORLD.mod, size: 104, hold: 1100, rot: 180 });
        }, 200);
        board.tokens.big && board.tokens.big.el.classList.add('en-roller');
        ctx.setTimeout(function () {
          board.tokens.big && board.tokens.big.el.classList.remove('en-roller');
          formStrip(heroTotal >= wTotal);
        }, 2100);
      }

      function formStrip(heroesFirst) {
        // phase emblem bursts in the centre
        var emb = h('div', { class: 'en-phase' + (heroesFirst ? '' : ' is-world') }, h('span', { class: 'en-phase__ic' }, UI.icon(heroesFirst ? 'phase-sun' : 'phase-skull')));
        L.center.appendChild(emb);
        ctx.setTimeout(function () { emb.remove(); }, 1500);
        UI.sound('turn');

        var heroes = [st.roller].concat(ORDER.filter(function (q) { return q !== st.roller; })).map(function (q) { return { hero: UI.PARTY4[q] }; });
        var foes = ENEMY_ORDER.map(function (id) { var t = enemyToks.filter(function (x) { return x.id === id; })[0]; return { enemy: t.enemy }; });
        var items = heroesFirst ? heroes.concat(foes) : foes.concat(heroes);
        var strip = UI.turnStrip({ items: items, current: 0, phase: heroesFirst ? 'heroes' : 'world', round: '1/2', size: 50, big: 84 });
        strip.classList.add('en-strip');
        strip.items.forEach(function (m, i) { m.style.setProperty('--d', (180 + i * 90) + 'ms'); });
        L.endL.appendChild(strip);

        // nodes return to Severin
        st.inits.forEach(function (it) { it.box.classList.add('is-out'); });
        ctx.setTimeout(function () {
          st.inits.forEach(function (it) { it.box.remove(); it.node.classList.remove('en-has-init'); });
          nodes.forEach(function (n) { n.severin.setState('speaking'); });
          ctx.setTimeout(function () { nodes.forEach(function (n) { n.severin.setState('idle'); }); }, 3000);
        }, 420);

        // whose turn
        ORDER.forEach(function (q) {
          var on = heroesFirst && q === st.roller;
          seats[q].setActive(on);
          if (!on) seats[q].setDim(true);
        });
        board.setActive(heroesFirst ? UI.PARTY4[st.roller] : 'big');
        if (heroesFirst) {
          var tk = board.tokenCenter(UI.PARTY4[st.roller]);
          UI.spark(board.fx, tk.x, tk.y, UI.heroColor(UI.PARTY4[st.roller]), 14);
        }
      }
    }
  });
})();
