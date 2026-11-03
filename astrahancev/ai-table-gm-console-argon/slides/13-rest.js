/* Slide 13 «Привал» — table (+ TV glance).  Owner: rest-end-admin.
   Flow: dying hero (pulsing skull) → tap a living saver → Medicine card (d20, DC 10)
         → two equal choices in both nodes: campfire «Короткий» / moon «Долгий»
         short: hit-die slots on seats (real die → tiles → heal pop), Кощей's crystals, seal «Закончить»
         long: night falls, everyone back to full, dawn.                                     */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h;

  var SEATS = [
    { pos: 'nearLeft', hero: 'guardian' }, { pos: 'nearRight', hero: 'fury' },
    { pos: 'farLeft', hero: 'beacon' }, { pos: 'farRight', hero: 'arcanist' }
  ];
  var HD = { guardian: { die: 'd10', mod: 2 }, fury: { die: 'd12', mod: 3 }, beacon: { die: 'd8', mod: 1 }, arcanist: { die: 'd6', mod: 1 } };
  var MED = { guardian: 1, fury: 0, beacon: 5, arcanist: 1 };
  var START_HP = { guardian: 14, fury: 0, beacon: 11, arcanist: 5 };
  var DYING = 'fury';
  // the party lives in the seats only (no duplicate busts around the fire)
  var FIRE = [960, 400];

  function mountTable(stage, ctx) {
    var root = h('div', { class: 'r13' });
    stage.appendChild(root);
    var L = UI.tableLayout(root);
    var st = { phase: 'dying', hp: {}, dice: {}, card: null, pair: null, crystal: false };

    /* ---------- centre: campfire scene ---------- */
    var art = UI.bgArt(h('div', { class: 'r13-art' }), 'rest-campfire');
    var night = h('div', { class: 'r13-night' }, h('div', { class: 'r13-stars' }), h('div', { class: 'r13-moon' }, UI.icon('moon')));
    var glow = h('div', { class: 'r13-glow', style: { left: FIRE[0] + 'px', top: FIRE[1] + 'px' } });
    var embers = h('div', { class: 'r13-embers', style: { left: FIRE[0] + 'px', top: FIRE[1] + 'px' } });
    for (var i = 0; i < 22; i++) {
      embers.appendChild(h('i', { style: { '--x': (Math.random() * 200 - 100).toFixed(0) + 'px', '--d': (Math.random() * 3.2).toFixed(2) + 's', '--t': (2.4 + Math.random() * 1.8).toFixed(2) + 's', '--sx': (Math.random() * 60 - 30).toFixed(0) + 'px' } }));
    }
    var done = h('div', { class: 'r13-dawn' }, UI.icon('phase-sun'));
    L.center.appendChild(h('div', { class: 'r13-scene' }, art, glow, embers, night, done));

    /* ---------- ends: engraved phase mark left (decoration, not a button), gear right ---------- */
    L.endL.appendChild(h('div', { class: 'r13-emb', 'aria-hidden': 'true' }, UI.icon('campfire')));
    var gear = UI.gear({ onPick: function (k, it) {
      if (k === 'again') { ctx.remount(); return; }
      UI.toastFor(gear, { icon: it.icon, text: k === 'party' ? 'Выбор героев' : it.word });
    } });
    L.endR.appendChild(gear);

    /* ---------- card layers: near (screen) and far (rotated 180°) ---------- */
    var nearLayer = h('div', { class: 'r13-layer' });
    var farLayer = h('div', { class: 'r13-layer r13-layer--far', 'data-far': '' });
    root.appendChild(nearLayer); root.appendChild(farLayer);

    /* ---------- seats ---------- */
    var seats = {};
    SEATS.forEach(function (sd) {
      var hd = UI.HEROES[sd.hero];
      st.hp[sd.hero] = START_HP[sd.hero];
      st.dice[sd.hero] = 3;
      var seat = L.seat(sd.pos, { hero: sd.hero, hp: st.hp[sd.hero], slots: [], endTurn: false });
      seat.classList.add('r13-seat');
      seat.__pos = sd.pos;
      seats[sd.hero] = seat;
      var medBox = seat.querySelector('.seat__medal');
      medBox.setAttribute('data-tap', '');
      medBox.classList.add('r13-medtap');
      seat.__badge = h('span', { class: 'r13-savebadge' }, UI.icon('stabilize'));
      medBox.appendChild(seat.__badge);
      medBox.addEventListener('click', function () { tapHero(sd.hero, medBox); });

      // rest tools (visible during the short rest)
      var tools = h('div', { class: 'r13-tools' });
      var hdSlot = UI.slot({ icon: 'hit-die', label: 'Кость', key: 'hit-die', color: hd.color,
        info: 'Кость хитов: бросьте ' + HD[sd.hero].die.replace('d', 'к') + ' ' + UI.fmtMod(HD[sd.hero].mod) + ' и верните столько хитов. Осталось костей: 3.',
        onTap: function () { spendHitDie(sd.hero); } });
      var pips = h('span', { class: 'r13-pips' }, h('i'), h('i'), h('i'));
      hdSlot.appendChild(pips);
      hdSlot.__pips = pips;
      tools.appendChild(hdSlot);
      seat.__hd = hdSlot;
      if (sd.hero === 'arcanist') {
        var cr = UI.slot({ icon: 'cost-slot-1', label: 'Чары', key: 'arcane', color: hd.color,
          info: 'Магическое восстановление: раз в день на коротком отдыхе вернуть ячейку I круга.',
          onTap: function () { recoverSlot(cr); } });
        cr.classList.add('r13-crystal');
        cr.appendChild(h('span', { class: 'r13-cpips' }, h('i', { class: 'is-full' }), h('i')));
        tools.appendChild(cr);
        seat.__cr = cr;
      }
      seat.shelf.appendChild(tools);

    });

    /* dying hero */
    function setDying(on) {
      seats[DYING].medal.setState(on ? 'dying' : 'stable');
      seats[DYING].classList.toggle('is-dying', on);
      seats[DYING].querySelector('.seat__medal').toggleAttribute('data-turn', on);
      seats[DYING].classList.toggle('is-down', true);
    }
    setDying(true);
    var savers = ['guardian', 'beacon', 'arcanist'];

    /* ---------- nodes: two equal choices ---------- */
    var picks = L.nodes().map(function (node, ni) {
      var box = h('div', { class: 'r13-pick' });
      [['short', 'campfire', 'Короткий'], ['long', 'moon', 'Долгий']].forEach(function (o) {
        var b = h('button', { class: 'r13-opt r13-opt--' + o[0], type: 'button', 'data-k': o[0], 'aria-label': o[2] + ' отдых' },
          h('span', { class: 'r13-opt__disk' }, UI.icon(o[1]), h('span', { class: 'r13-opt__lock' }, UI.icon('lock'))),
          h('span', { class: 'r13-opt__w', text: o[2] }));
        b.addEventListener('click', function () { choose(o[0], b); });
        UI.longPress(b, function () {
          UI.sheetFor(b, o[0] === 'short'
            ? { icon: 'campfire', title: 'Короткий отдых', text: 'Час у костра: тратьте кости хитов, Кощей возвращает ячейку.' }
            : { icon: 'moon', title: 'Долгий отдых', text: 'Ночь у мельницы: все хиты, кости и ячейки возвращаются.' });
        });
        box.appendChild(b);
      });
      if (ni === 0) box.setAttribute('data-pickmain', '');
      node.appendChild(box);
      node.classList.add('r13-node');
      return box;
    });

    function setPhase(p) {
      st.phase = p;
      root.dataset.phase = p;
      // the one main action per phase
      [].slice.call(root.querySelectorAll('[data-main]')).forEach(function (n) { if (!n.classList.contains('seal')) { n.removeAttribute('data-main'); n.classList.remove('is-main'); } });
      // ONE target: the nearest rescuer (Никита) carries the gold badge; the other savers show it only on a hint
      savers.forEach(function (k) { seats[k].querySelector('.r13-medtap').classList.toggle('is-saver', p === 'dying' && k === 'guardian'); });
      if (p === 'dying') {
        var main = seats.guardian.querySelector('.r13-medtap');
        main.setAttribute('data-main', ''); main.classList.add('is-main');
      }
      root.classList.toggle('is-dyingphase', p === 'dying');
      picks.forEach(function (bx) {
        bx.classList.toggle('is-locked', p === 'dying');
        bx.classList.toggle('is-gone', p !== 'dying' && p !== 'choose');
        if (p === 'choose' && bx.hasAttribute('data-pickmain')) { bx.setAttribute('data-main', ''); bx.classList.add('is-main'); }
      });
      // Severin stays visible and tappable between the two choices; only the short-rest seal covers him
      L.nodes().forEach(function (n) { n.classList.toggle('has-seal', p === 'short'); });
    }
    setPhase('dying');

    /* ---------- dice cards slide out of the seat toward the centre ---------- */
    function seatCx(hero) {
      var pos = seats[hero].__pos, left = /Left$/.test(pos), far = pos.indexOf('far') === 0;
      var sx = left ? 410 : 1510;
      return { far: far, x: far ? 1920 - sx : sx };
    }
    function openCard(hero, o, cb) {
      closeCard();
      var p = seatCx(hero);
      var card = UI.diceCard(Object.assign({ hero: hero, onConfirm: function (v, el) {
        ctx.setTimeout(function () { closeCard(); cb(v); }, 180);
      } }, o));
      var pos = h('div', { class: 'r13-cardpos', 'data-own': p.far ? 'far' : 'near', style: { left: p.x + 'px' } }, card);
      (p.far ? farLayer : nearLayer).appendChild(pos);
      var w = card.offsetWidth || 700;
      pos.style.left = Math.max(w / 2 + 16, Math.min(1920 - w / 2 - 16, p.x)) + 'px';
      st.card = { pos: pos, card: card, hero: hero };
      root.classList.add('is-rolling');
      seats[hero].classList.add('is-rolling');
      UI.sound('open');
    }
    function closeCard() {
      if (!st.card) return;
      var c = st.card; st.card = null;
      c.card.close();
      ctx.setTimeout(function () { c.pos.remove(); }, 340);
      root.classList.remove('is-rolling');
      seats[c.hero].classList.remove('is-rolling');
    }

    /* ---------- taps ---------- */
    function tapHero(hero, el) {
      if (st.phase === 'dying') {
        if (hero === DYING) {
          UI.sound('error');
          UI.toastFor(el, { icon: 'stabilize', text: 'Кто спасёт?', shared: true });   // asks the whole table: both sides
          savers.forEach(function (k) { var b = seats[k].querySelector('.r13-medtap'); b.classList.remove('is-hint'); void b.offsetWidth; b.classList.add('is-hint'); });
          ctx.setTimeout(function () { savers.forEach(function (k) { seats[k].querySelector('.r13-medtap').classList.remove('is-hint'); }); }, 1800);
          return;
        }
        openCard(hero, { die: 'd20', mod: MED[hero], dc: 10 }, function (v) {
          var total = v + MED[hero];
          var b = seats[DYING].medal, c = UI.center(b, stage), dyFar = seats[DYING].__pos.indexOf('far') === 0;
          // the outcome number is shared: upright copy in the near half, the turned one mirrored (W−x, H−y)
          var W2 = stage.offsetWidth, H2 = stage.offsetHeight, px = c.x, py = c.y + (dyFar ? 40 : -40);
          if (dyFar) { px = W2 - px; py = H2 - py; }
          var mid = { x: W2 / 2, y: H2 / 2 };
          if (total >= 10) {
            setDying(false);
            UI.sound('heal');
            UI.spark(stage, c.x, c.y, 'var(--heal)', 18);
            // the outcome is shared: number and word for both long sides (one mirrored pair each)
            UI.pop(stage, px, py, total, 'heal', { size: 64, both: true, around: mid });
            UI.toastFor(seats[DYING].medal, { icon: 'bandage', text: 'Стабильна', tone: 'good', shared: true });
            ctx.setTimeout(function () { setPhase('choose'); UI.sound('turn'); }, 700);
          } else {
            UI.sound('miss');
            UI.pop(stage, px, py, String(total), 'miss', { size: 64, both: true, around: mid });
            UI.toastFor(seats[hero].medal, { icon: 'cross', text: 'Ещё раз', tone: 'bad' });
          }
        });
        return;
      }
      if (st.phase === 'short') { spendHitDie(hero); return; }
      UI.toastFor(el, { icon: 'heart', text: st.hp[hero] + ' / ' + UI.HEROES[hero].max });
    }

    function choose(k, btn) {
      if (st.phase === 'dying') {
        UI.sound('error');
        btn.classList.remove('is-nope'); void btn.offsetWidth; btn.classList.add('is-nope');
        UI.toastFor(btn, { icon: 'lock', text: 'Сначала спасите', tone: 'bad' });
        return;
      }
      if (st.phase !== 'choose') return;
      setPhase(k);
      UI.sound('stamp');
      picks.forEach(function (bx) {
        var b = bx.querySelector('[data-k="' + k + '"]');
        var c = UI.center(b.querySelector('.r13-opt__disk'), stage);
        UI.stampFx(stage, c.x, c.y);
        b.classList.add('is-chosen');
      });
      ctx.setTimeout(function () { (k === 'short' ? startShort : startLong)(); }, 420);
    }

    /* ---------- short rest ---------- */
    function startShort() {
      root.classList.add('is-short');
      glow.classList.add('is-lit');
      SEATS.forEach(function (sd) { refreshHd(sd.hero); });
      st.pair = UI.sealPair(L.nodes(), { icon: 'campfire', word: 'Закончить', onPress: finishShort });
    }
    function refreshHd(hero) {
      var s = seats[hero].__hd, n = st.dice[hero], hd = UI.HEROES[hero];
      [].slice.call(s.__pips.children).forEach(function (p, i) { p.classList.toggle('is-full', i < n); });
      if (st.hp[hero] <= 0) { s.opts.reasonText = 'Без сознания'; s.setState('disabled', 'lock'); }
      else if (n <= 0) { s.opts.reasonText = 'Кости кончились'; s.setState('disabled', 'hourglass'); }
      else if (st.hp[hero] >= hd.max) { s.opts.reasonText = 'Здоров'; s.setState('disabled', 'check'); }
      else s.setState('ready');
    }
    function spendHitDie(hero) {
      if (st.phase !== 'short') return;
      var s = seats[hero].__hd;
      if (st.card && st.card.hero === hero) { closeCard(); refreshHd(hero); return; }   // second tap puts the die away
      if (s.dataset.state === 'disabled') { s.click(); return; }
      s.setState('selected');
      openCard(hero, { die: HD[hero].die, mod: HD[hero].mod }, function (v) {
        st.dice[hero]--;
        heal(hero, v + HD[hero].mod);
        refreshHd(hero);
      });
    }
    function heal(hero, amount) {
      var hd = UI.HEROES[hero];
      var before = st.hp[hero];
      st.hp[hero] = Math.min(hd.max, st.hp[hero] + amount);
      var got = st.hp[hero] - before;
      seats[hero].setHp(st.hp[hero]);
      var far = seats[hero].__pos.indexOf('far') === 0;
      var mc = UI.center(seats[hero].medal, stage);
      // the number flies from the seat toward the fire, facing its owner
      UI.pop(stage, mc.x, mc.y + (far ? 90 : -90), got, 'heal', { size: 64, rot: far ? 180 : 0 });
      UI.spark(stage, mc.x, mc.y, 'var(--heal)', 10);
      var b = seats[hero].querySelector('.seat__medal');
      b.classList.remove('is-healed'); void b.offsetWidth; b.classList.add('is-healed');
      UI.sound('heal');
    }
    function recoverSlot(cr) {
      if (st.phase !== 'short' || st.crystal) return;
      st.crystal = true;
      cr.querySelectorAll('.r13-cpips i')[1].classList.add('is-full', 'is-new');
      cr.setState('used');
      var c = UI.center(cr, stage);
      UI.spark(stage, c.x, c.y, 'var(--magic)', 14);
      UI.pop(stage, c.x, c.y + 60, 'I', 'info', { size: 56, rot: 180 });
      UI.sound('heal');
    }
    function finishShort() {
      root.classList.remove('is-short');
      closeCard();
      if (st.hp[DYING] <= 0) {   // stable hero wakes with 1 HP
        seats[DYING].medal.setState('');
        seats[DYING].classList.remove('is-down');
        heal(DYING, 1);
      }
      ctx.setTimeout(finishAll, 500);
    }

    /* ---------- long rest ---------- */
    function startLong() {
      root.classList.add('is-night');
      UI.sound('open');
      ctx.setTimeout(function () {
        SEATS.forEach(function (sd, i) {
          ctx.setTimeout(function () {
            if (sd.hero === DYING) { seats[DYING].medal.setState(''); seats[DYING].classList.remove('is-down'); }
            st.dice[sd.hero] = 3;
            heal(sd.hero, 999);
          }, i * 260);
        });
      }, 1500);
      ctx.setTimeout(function () {
        root.classList.remove('is-night');
        UI.flash(stage, 'rgba(255,214,150,.35)', 700);
        finishAll();
      }, 3000);
    }

    function finishAll() {
      setPhase('done');
      root.classList.add('is-done');
      glow.classList.remove('is-lit');
      L.nodes().forEach(function (n) { n.severin.setState('speaking'); });
      UI.sound('turn');
      ctx.setTimeout(function () { L.nodes().forEach(function (n) { n.severin.setState('idle'); }); }, 4200);
    }
  }

  /* ---------- TV glance: the same circle, 10-foot sizes ---------- */
  function mountTv(stage, ctx) {
    var root = h('div', { class: 'r13tv' });
    root.appendChild(UI.bgArt(h('div', { class: 'r13tv__art' }), 'rest-campfire'));
    var em = h('div', { class: 'r13-embers r13tv__embers' });
    for (var i = 0; i < 40; i++) em.appendChild(h('i', { style: { '--x': (Math.random() * 360 - 180).toFixed(0) + 'px', '--d': (Math.random() * 3.2).toFixed(2) + 's', '--t': (2.6 + Math.random() * 2).toFixed(2) + 's', '--sx': (Math.random() * 80 - 40).toFixed(0) + 'px' } }));
    root.appendChild(em);
    var row = h('div', { class: 'r13tv__row' });
    SEATS.forEach(function (sd) {
      var hd = UI.HEROES[sd.hero];
      var m = UI.medallion({ hero: sd.hero, hp: START_HP[sd.hero], max: hd.max, size: 200, state: sd.hero === DYING ? 'dying' : '' });
      row.appendChild(h('div', { class: 'r13tv__hero', style: { '--hero': hd.color } }, m, h('div', { class: 'r13tv__name', text: hd.short })));
    });
    root.appendChild(row);
    var sev = UI.severin({ size: 96, state: 'speaking' });
    root.appendChild(h('div', { class: 'r13tv__sub' }, sev,
      h('p', { class: 'r13tv__line' }, h('span', { text: 'Огонь трещит. Настасья не дышит —' }), h('br'), h('span', { text: 'кто перевяжет её, пока не поздно?' }))));
    root.appendChild(h('div', { class: 'r13tv__badge', 'aria-hidden': 'true' }, UI.icon('campfire')));
    stage.appendChild(root);
  }

  Deck.register({
    id: '13',
    key: 'rest',
    title: 'Привал',
    change: 'Костёр вместо панели: спасти павшего, потом костёр или луна',
    surface: 'table',
    before: 'before/32-rest-tabletop.webp',
    css: true,
    views: [
      { key: 'table', label: 'Стол', surface: 'table', before: 'before/32-rest-tabletop.webp' },
      { key: 'tv', label: 'ТВ', surface: 'tv', before: null }
    ],
    quiz: [
      { q: 'Что нажать?', a: 'Портрет живого героя — он спасёт Настасью', sel: '[data-main]' },
      { q: 'Кому плохо?', a: 'Настасья: красный череп на её месте', sel: '[data-turn]' }
    ],
    mount: function (stage, ctx) {
      if (ctx.view === 'tv') return mountTv(stage, ctx);
      return mountTable(stage, ctx);
    }
  });
})();
