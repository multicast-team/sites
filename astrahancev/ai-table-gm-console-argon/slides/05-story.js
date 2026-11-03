/* =====================================================================
   Slide 05 · «История с выбором» (brief §4.1).  Owner: story screens.
   Centre = beat picture at 60 %.  Choice cards lie along both long edges
   (near copy + far copy, rotated).  Tap a card → it lifts, the seal with
   the choice icon appears in both nodes → tap the seal → stamp → next beat.
   «Красться» rolls first: dice card from the roller's seat (d20 +2 vs 12).
   Clue tokens on the left end, beat path on the right end.  Severin
   medallion speaks; a tap shows ONE subtitle line facing the tapper.
   ===================================================================== */
(function () {
  'use strict';

  var ROLLER = { pos: 'nearRight', hero: 'fury', mod: 2, dc: 12 };

  var CLUES = {
    village: { icon: 'clue-scroll', title: 'Тихая', text: 'Деревня заперлась по домам: по ночам из ила кто-то выползает.' },
    key: { icon: 'clue-key', title: 'Шлюз', text: 'Мельничиха Агафья: шлюз открыли нарочно, ключ был у старшины.' },
    track: { icon: 'clue-track', title: 'Следы', text: 'Мокрые следы с перепонками ведут от брода к мельнице.' }
  };

  /* beats: bg = art key, line = what Severin says (one line), step = index on the beat path */
  var BEATS = {
    village: {
      bg: 'backdrop-arrival', step: 0, line: 'Тихая почернела. Пахнет тиной и дёгтем.',
      choices: [
        { key: 'talk', icon: 'choice-talk', words: 'Расспросить', info: 'Постучать к мельничихе Агафье и расспросить о ночных шорохах.', to: 'miller', clue: 'key' },
        { key: 'sneak', icon: 'choice-sneak', words: 'Красться', info: 'Тихо пробраться к броду. Бросок скрытности: к20 +2 против 12.', roll: true, to: 'ford', clue: 'track' },
        { key: 'search', icon: 'choice-search', words: 'Искать', info: 'Осмотреть берег и мостки при свете фонаря.', to: 'ford', clue: 'track' }
      ],
      decline: 'road'
    },
    miller: {
      bg: 'backdrop-miller', step: 1, line: 'Агафья шепчет: «Шлюз открыли нарочно».',
      choices: [
        { key: 'go', icon: 'choice-go', words: 'К броду', info: 'Спуститься к броду прямо сейчас, пока темно.', to: 'ford' },
        { key: 'sneak', icon: 'choice-sneak', words: 'Красться', info: 'Подойти к броду незамеченными. Бросок скрытности: к20 +2 против 12.', roll: true, to: 'ford', clue: 'track' }
      ],
      decline: 'road'
    },
    ford: {
      bg: 'backdrop-ford', step: 2, line: 'Ил на броду вздувается пузырями…',
      choices: [
        { key: 'fight', icon: 'choice-fight', words: 'Ударить', info: 'Выйти на брод и напасть, пока тинники не выползли.', to: 'fight' },
        { key: 'wait', icon: 'hourglass', words: 'Ждать', info: 'Затаиться в камышах и посмотреть, кто полезет из воды.', to: 'fight' }
      ],
      decline: 'road'
    },
    road: {
      bg: 'backdrop-road', step: 0, line: 'Дорога уводит прочь. Тихая остаётся во тьме.',
      choices: [
        { key: 'back', icon: 'choice-go', words: 'Вернуться', info: 'Повернуть назад, к деревне.', to: 'village' }
      ],
      decline: null
    }
  };

  Deck.register({
    id: '05',
    key: 'story',
    title: 'История с выбором',
    change: 'Картина сцены вместо стены текста; выбор — крупные карточки у края, печать подтверждает',
    surface: 'table',
    before: 'before/11-story-tabletop.webp',
    css: true,
    quiz: [
      { q: 'Что нажать?', a: 'Карточку выбора', sel: '[data-main]' },
      { q: 'Чей ход?', a: 'Ничей: выбор общий', sel: null }
    ],

    mount: function (stage, ctx) {
      var UI = ctx.UI, h = UI.h;
      var root = h('div', { class: 'st' });
      var parch = UI.art('texture-parchment');
      if (parch) root.style.setProperty('--st-parch', 'url("' + new URL(parch, document.baseURI).href + '")');
      stage.appendChild(root);
      var L = UI.tableLayout(root, { onSeverin: onSeverin });
      var nodes = L.nodes();

      ['nearLeft', 'nearRight', 'farLeft', 'farRight'].forEach(function (pos) {
        var seat = L.seat(pos, { hero: UI.PARTY4[pos], slots: [], endTurn: false });
        var ha = h('div', { class: 'st-heroart' });
        UI.bgArt(ha, 'hero-' + UI.PARTY4[pos]);
        seat.insertBefore(ha, seat.children[1]);
      });

      /* ---------- centre: picture layers ---------- */
      var picBox = h('div', { class: 'st-pic' });
      L.center.appendChild(picBox);
      L.center.appendChild(h('div', { class: 'st-shade' }));

      var rowNear = h('div', { class: 'st-row st-row--near' });
      var rowFar = h('div', { class: 'st-row st-row--far', 'data-far': '' });
      L.center.appendChild(rowFar);
      L.center.appendChild(rowNear);

      var subNear = h('div', { class: 'st-sub st-sub--near' });
      var subFar = h('div', { class: 'st-sub st-sub--far', 'data-far': '' });
      L.center.appendChild(subNear); L.center.appendChild(subFar);

      /* ---------- ends: clues (left), beat path (right) ---------- */
      var clueCol = h('div', { class: 'st-clues' });
      L.endL.appendChild(clueCol);
      var path = h('div', { class: 'st-path' });
      var pathDots = [0, 1, 2].map(function (i) {
        var d = h('span', { class: 'st-path__d' }, UI.rhomb('st-path__r'));
        path.appendChild(d);
        if (i < 2) path.appendChild(h('i', { class: 'st-path__l' }));
        return d;
      });
      var pathEnd = h('span', { class: 'st-path__end' }, UI.icon('swords'));
      path.appendChild(h('i', { class: 'st-path__l' }));
      path.appendChild(pathEnd);
      L.endR.appendChild(path);

      var state = { beat: null, pick: null, pair: null, busy: false, clues: {} };

      /* ---------- Severin ---------- */
      var speakT = null, subT = null;
      function speak(ms) {
        nodes.forEach(function (n) { n.severin.setState('speaking'); });
        if (speakT) ctx.clearTimeout(speakT);
        speakT = ctx.setTimeout(function () { nodes.forEach(function (n) { n.severin.setState('idle'); }); }, ms || 3200);
      }
      function think() { nodes.forEach(function (n) { n.severin.setState('thinking'); }); }
      function onSeverin() {
        showSub();
        speak(4000);
      }
      // Severin's line is shared: whichever node is tapped, both long sides get it
      function showSub() {
        [subNear, subFar].forEach(function (el) {
          el.innerHTML = '';
          el.appendChild(h('span', { class: 'st-sub__ic' }, UI.icon('scroll')));
          el.appendChild(h('span', { class: 'st-sub__t', text: BEATS[state.beat].line }));
          el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
        });
        if (subT) ctx.clearTimeout(subT);
        subT = ctx.setTimeout(hideSubs, 8000);
      }
      function hideSubs() { subNear.classList.remove('is-on'); subFar.classList.remove('is-on'); }

      /* ---------- clues ---------- */
      function addClue(key, fly) {
        if (!key || state.clues[key]) return;
        var c = CLUES[key];
        var tok = h('button', { class: 'st-clue', type: 'button', 'aria-label': c.title }, h('span', { class: 'st-clue__ic' }, UI.icon(c.icon)));
        tok.addEventListener('click', function () {
          // a clue is shared: it opens for both long sides (near copy upright, far copy turned 180°)
          var p = UI.center(tok, stage);
          UI.sheet(stage, { icon: c.icon, title: c.title, text: c.text, x: 440, y: p.y });
        });
        clueCol.appendChild(tok);
        state.clues[key] = tok;
        if (fly) {
          tok.classList.add('is-new');
          ctx.setTimeout(function () {
            var p = UI.center(tok, stage);
            UI.spark(stage, p.x, p.y, 'var(--gold-hi)', 12);
            UI.sound('pick');
          }, 380);
          ctx.setTimeout(function () { tok.classList.remove('is-new'); }, 2600);
        }
      }

      /* ---------- picture ---------- */
      function setPicture(key, instant) {
        var layer = h('div', { class: 'st-pic__l' + (instant ? ' is-on' : '') });
        UI.bgArt(layer, key);
        picBox.appendChild(layer);
        if (!instant) { void layer.offsetWidth; layer.classList.add('is-on'); }
        var old = [].slice.call(picBox.children, 0, -1);
        ctx.setTimeout(function () { old.forEach(function (o) { o.remove(); }); }, 900);
      }

      /* ---------- choices ---------- */
      var cards = [];   // {ch, near, far}
      function buildRows(beat) {
        rowNear.innerHTML = ''; rowFar.innerHTML = ''; cards = [];
        var list = beat.choices.slice();
        if (beat.decline) list.push({ key: 'decline', icon: 'back', words: 'Уйти', info: 'Уйти от брода. История пойдёт другой дорогой.', to: beat.decline, decline: true });
        list.forEach(function (ch, i) {
          var pair = { ch: ch };
          [['near', rowNear], ['far', rowFar]].forEach(function (side) {
            var c = UI.choiceCard({ icon: ch.icon, words: ch.words, info: ch.info, cls: ch.decline ? 'st-decline' : '', onPick: function () { pick(pair, side[0]); } });
            c.style.setProperty('--i', i);
            side[1].appendChild(c);
            pair[side[0]] = c;
          });
          cards.push(pair);
        });
        rowNear.setAttribute('data-main', '');
        root.classList.remove('has-pick');
        rowNear.classList.remove('is-out'); rowFar.classList.remove('is-out');
        rowNear.classList.add('is-in'); rowFar.classList.add('is-in');
        ctx.setTimeout(function () { rowNear.classList.remove('is-in'); rowFar.classList.remove('is-in'); }, 900);
      }

      function pick(pair, side) {
        if (state.busy) return;
        var again = state.pick === pair;
        cards.forEach(function (p) {
          var on = !again && p === pair;
          p.near.setSelected(on); p.far.setSelected(on);
          p.near.classList.toggle('is-muted', !again && !on);
          p.far.classList.toggle('is-muted', !again && !on);
        });
        if (again) {
          state.pick = null;
          root.classList.remove('has-pick');
          if (state.pair) { state.pair.hide(); state.pair = null; }
          rowNear.setAttribute('data-main', '');
          return;
        }
        state.pick = pair;
        UI.sound('pick');
        var src = pair[side];
        var p = UI.center(src, stage);
        var who = (side === 'far' ? 'far' : 'near') + (p.x < 960 ? 'Left' : 'Right');
        var halo = UI.heroColor(UI.PARTY4[who]);
        pair.near.style.setProperty('--halo', halo); pair.far.style.setProperty('--halo', halo);
        UI.spark(stage, p.x, p.y, 'var(--gold-hi)', 12);
        rowNear.removeAttribute('data-main');
        root.classList.add('has-pick');
        if (state.pair) {
          state.pair.seals.forEach(function (s) { s.setIcon(pair.ch.icon); s.show(); });
        } else {
          state.pair = UI.sealPair(nodes, { icon: pair.ch.icon, word: 'Подтвердить', onPress: commit });
        }
      }

      function commit() {
        var ch = state.pick && state.pick.ch;
        state.pair = null;
        if (!ch) return;
        state.busy = true;
        hideSubs();
        // lifted card gets stamped too
        [state.pick.near, state.pick.far].forEach(function (c) { c.classList.add('is-stamped'); });
        think();
        ctx.setTimeout(function () {
          rowNear.classList.add('is-out'); rowFar.classList.add('is-out');
          rowNear.removeAttribute('data-main');
        }, 260);
        if (ch.roll) ctx.setTimeout(function () { startRoll(ch); }, 620);
        else ctx.setTimeout(function () { go(ch.to, ch.clue); }, 700);
      }

      /* ---------- story roll ---------- */
      function startRoll(ch) {
        nodes.forEach(function (n) { n.severin.setState('listening'); });
        ['nearLeft', 'nearRight', 'farLeft', 'farRight'].forEach(function (pos) {
          if (pos === ROLLER.pos) L[pos].setActive(true); else L[pos].setDim(true);
        });
        var box = h('div', { class: 'st-roll st-roll--' + ROLLER.pos, 'data-own': ROLLER.pos.indexOf('far') === 0 ? 'far' : 'near' });
        root.appendChild(box);
        var card = UI.diceCard({
          die: 'd20', mod: ROLLER.mod, dc: ROLLER.dc, hero: ROLLER.hero, word: 'Бросай',
          onMic: function (m) { m.setState(m.state() === 'listening' ? 'idle' : 'listening'); },
          onConfirm: function (v, el) { finishRoll(ch, v, el, box); }
        });
        card.setAttribute('data-main', '');
        box.appendChild(card);
      }
      function finishRoll(ch, v, card, box) {
        var total = v + ROLLER.mod, ok = total >= ROLLER.dc;
        var d = card.querySelector('.die');
        var p = UI.center(d, stage);
        // the number belongs to the roller (faces their seat); the outcome word is shared (both sides)
        var rf = ROLLER.pos.indexOf('far') === 0;
        UI.pop(stage, p.x, p.y + (rf ? 170 : -170), String(total), ok ? 'crit' : 'dmg', { size: 96, rot: rf ? 180 : 0 });
        UI.sound(ok ? 'heal' : 'miss');
        UI.toast(stage, { icon: ok ? 'check' : 'cross', text: ok ? 'Успех' : 'Замечены', tone: ok ? 'good' : 'bad', x: p.x + (rf ? -230 : 230), y: p.y + (rf ? 170 : -170), ms: 1800 });
        ctx.setTimeout(function () {
          card.close();
          ctx.setTimeout(function () { box.remove(); }, 360);
          ['nearLeft', 'nearRight', 'farLeft', 'farRight'].forEach(function (pos) { L[pos].setActive(false); L[pos].classList.remove('is-dim'); L[pos].medal.setState(''); });
          go(ch.to, ok ? ch.clue : null, !ok);
        }, 1500);
      }

      /* ---------- beat change ---------- */
      function go(to, clue, alarmed) {
        if (to === 'fight') return toFight();
        var beat = BEATS[to];
        var first = state.beat == null;
        state.beat = to; state.pick = null; state.busy = false;
        setPicture(beat.bg, first);
        if (!first) UI.sound('open');
        pathDots.forEach(function (d, i) { d.classList.toggle('is-on', i === beat.step); d.classList.toggle('is-done', i < beat.step); });
        pathEnd.classList.remove('is-on');
        ctx.setTimeout(function () { buildRows(beat); }, first ? 0 : 420);
        if (!first) ctx.setTimeout(function () { addClue('village', true); }, 700);
        if (clue) ctx.setTimeout(function () { addClue(clue, true); }, 1100);
        if (alarmed) ctx.setTimeout(function () { UI.flash(L.center, 'rgba(184,69,58,.35)', 420); }, 500);
        ctx.setTimeout(function () { speak(3400); }, first ? 400 : 650);
      }

      function toFight() {
        state.beat = 'ford'; state.busy = true;
        UI.flash(L.center, 'rgba(184,69,58,.45)', 500);
        UI.sound('hit');
        pathDots.forEach(function (d) { d.classList.remove('is-on'); d.classList.add('is-done'); });
        pathEnd.classList.add('is-on');
        var emb = h('button', { class: 'st-fight is-main', type: 'button', 'data-main': '', 'aria-label': 'К бою' },
          h('span', { class: 'st-fight__ring' }),
          h('span', { class: 'st-fight__ic' }, UI.icon('swords')));
        L.center.appendChild(emb);
        // tinniks rise from the water
        [[700, 360], [960, 300], [1220, 380]].forEach(function (xy, i) {
          var t = h('div', { class: 'st-rise', style: { left: xy[0] + 'px', top: xy[1] + 'px', '--d': (i * 180) + 'ms' } });
          UI.bgArt(t, i === 1 ? 'token-tinnik-big' : 'token-tinnik');
          L.center.appendChild(t);
        });
        speak(3000);
        ctx.setTimeout(function () { UI.sound('hit'); }, 500);
        // a quiet way on: tap the emblem → «Перед боем»
        emb.addEventListener('click', function () { if (window.Deck && Deck.go) Deck.go('06'); });
      }

      /* ---------- start ---------- */
      go('village');
    }
  });
})();
