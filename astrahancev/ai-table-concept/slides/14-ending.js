/* Slide 14 «Финал» — table + TV.  Owner: rest-end-admin.
   Centre: outcome emblem (laurel / broken laurel / skull) over the dawn or the dark water,
   1–3 words twice (near + far copy, far smaller).  The party lives in the seats, fallen in greyscale.
   Main action: seal «Ещё раз» in both nodes, HOLD 0.5 s (destructive, brief §9.3); gear on the right end.
   The outcome switcher is DECK chrome (header segment + keys 7/8/9), never inside the stage;
   the state is shared with the TV view. */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h;

  var ORDER = ['victory', 'mixed', 'defeat'];
  var OUT = {
    victory: { icon: 'laurel', word: 'Победа', art: 'victory-dawn', sound: 'heal',
      hp: { guardian: 19, fury: 23, beacon: 14, arcanist: 6 },
      hook: ['Тинники ушли под воду, брод снова ваш.', 'Но кто открыл шлюз этой ночью?'] },
    mixed: { icon: 'laurel-cracked', word: 'Успех с потерями', art: 'victory-dawn', sound: 'turn',
      hp: { guardian: 9, fury: 4, beacon: 3, arcanist: 0 },
      hook: ['Карась ушёл по воде с печатью солеварни.', 'В его книге — ещё две реки.'] },
    defeat: { icon: 'skull', word: 'Поражение', art: 'defeat-water', sound: 'flee',
      hp: { guardian: 0, fury: 0, beacon: 0, arcanist: 0 },
      hook: ['Чёрная вода сомкнулась над бродом.', 'Мельница ждёт новых смельчаков.'] }
  };
  var state = { outcome: 'mixed' };   // shared by the table and TV views
  var PARTY = [
    { pos: 'nearLeft', hero: 'guardian', end: 'L', far: false },
    { pos: 'farLeft', hero: 'beacon', end: 'L', far: true },
    { pos: 'nearRight', hero: 'fury', end: 'R', far: false },
    { pos: 'farRight', hero: 'arcanist', end: 'R', far: true }
  ];

  function artLayers(box) {
    var layers = {};
    ['victory-dawn', 'defeat-water'].forEach(function (k) {
      var l = UI.bgArt(h('div', { class: 'e14-art', 'data-art': k }), k);
      box.appendChild(l); layers[k] = l;
    });
    return layers;
  }
  function motes(n, spread) {
    var m = h('div', { class: 'e14-motes' });
    for (var i = 0; i < n; i++) {
      m.appendChild(h('i', { style: { left: (Math.random() * 100).toFixed(1) + '%', '--d': (Math.random() * 6).toFixed(2) + 's', '--t': (4 + Math.random() * 4).toFixed(2) + 's', '--sx': (Math.random() * spread - spread / 2).toFixed(0) + 'px', '--z': (0.6 + Math.random() * 0.9).toFixed(2) } }));
    }
    return m;
  }
  /* Outcome emblems drawn inline: gold (or cold steel) on metal, embossed.  The sprite glyphs are
     fill="none" + currentColor, so a gradient cannot reach them; and the sprite's «broken laurel»
     read as an open mouth.  Here the mixed outcome is the SAME closed wreath with a crack across the
     right branch and one leaf fallen out below it. */
  var SVGNS = 'http://www.w3.org/2000/svg', uid = 0;
  var LEAVES_L = [[9.21, 17.48, 175], [6.94, 15.74, 200], [5.62, 13.21, 225], [5.5, 10.35, 250], [6.59, 7.71, 275], [8.5, 5.9, 298]];
  function leaves(list, fill, extra) {
    return list.map(function (l) { return '<ellipse cx="' + l[0] + '" cy="' + l[1] + '" rx="1.1" ry="2.55" transform="rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')" fill="' + fill + '" ' + (extra || '') + '/>'; }).join('');
  }
  function mirror(list) { return list.map(function (l) { return [24 - l[0], l[1], 180 - l[2]]; }); }
  function emblemSvg(kind, id) {
    var g = 'url(#' + id + 'g)', edge = 'stroke="#5A3A12" stroke-width=".28"';
    var defs = '<defs><linearGradient id="' + id + 'g" x1="0" y1="0" x2="0" y2="1">' +
      (kind === 'defeat'
        ? '<stop offset="0" stop-color="#F2F4FA"/><stop offset=".55" stop-color="#B7C3D8"/><stop offset="1" stop-color="#5E6F8C"/>'
        : '<stop offset="0" stop-color="#FFF1C4"/><stop offset=".35" stop-color="#F5D58A"/><stop offset="1" stop-color="#A67C43"/>') +
      '</linearGradient></defs>';
    var body;
    if (kind === 'defeat') {
      edge = 'stroke="#1E2738" stroke-width=".3"';
      body = '<path fill-rule="evenodd" fill="' + g + '" ' + edge + ' d="M12 2.5C7.3 2.5 4 5.8 4 10.3c0 2.6 1.2 4.6 3 5.7V19a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 19v-3c1.8-1.1 3-3.1 3-5.7C20 5.8 16.7 2.5 12 2.5ZM8.8 8.7a2.1 2.1 0 1 0 0 4.2a2.1 2.1 0 1 0 0-4.2Z M15.2 8.7a2.1 2.1 0 1 0 0 4.2a2.1 2.1 0 1 0 0-4.2ZM12 13.4l1.2 2.3h-2.4Z M9.6 17.2h1.3v3.4H9.6Z M13.1 17.2h1.3v3.4h-1.3Z"/>';
    } else {
      var R = mirror(LEAVES_L);
      var stemL = '<path d="M11.16 21.06A9.6 9.6 0 0 1 7.2 3.19" fill="none" stroke="' + g + '" stroke-width="1.5" stroke-linecap="round"/>';
      var stemR = '<path d="M12.84 21.06A9.6 9.6 0 0 0 16.8 3.19" fill="none" stroke="' + g + '" stroke-width="1.5" stroke-linecap="round"/>';
      var tie = '<path d="M10 21.4l2-1.2 2 1.2" fill="none" stroke="' + g + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
      if (kind === 'victory') body = stemL + leaves(LEAVES_L, g, edge) + stemR + leaves(R, g, edge) + tie;
      else {
        // right branch: leaf #3 (the one at 18.4,13.2) is missing; a dark crack cuts the stem there; the leaf lies fallen below
        var kept = R.filter(function (l, i) { return i !== 2; });
        body = stemL + leaves(LEAVES_L, g, edge) + stemR + leaves(kept, g, edge) + tie +
          // the crack: a dark jagged split through the stem where the leaf broke off, with a bright broken edge
          '<path d="M15.6 10.2l2.2 1.5-1.2.9 2.6 1.3-1 .9 2.6 1.2" fill="none" stroke="#0A0603" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M15.6 10.2l2.2 1.5-1.2.9 2.6 1.3-1 .9 2.6 1.2" fill="none" stroke="#FFF1C4" stroke-width=".35" stroke-linecap="round" stroke-linejoin="round" opacity=".7" transform="translate(-.35 -.3)"/>' +
          // the fallen leaf, lying under the wreath on the right
          '<ellipse cx="18.6" cy="23.4" rx="1.1" ry="2.55" transform="rotate(72 18.6 23.4)" fill="' + g + '" ' + edge + ' opacity=".85"/>';
      }
    }
    return '<svg xmlns="' + SVGNS + '" viewBox="-1 -1 26 26" class="e14-emb__svg" aria-hidden="true">' + defs + body + '</svg>';
  }
  function emblem(size) {
    var ic = h('div', { class: 'e14-emb__ic' });
    var el = h('div', { class: 'e14-emb', style: { '--es': size + 'px' } },
      h('div', { class: 'e14-emb__rays' }),
      h('div', { class: 'e14-emb__disk' }),
      ic);
    el.set = function (k, bump) {
      ic.innerHTML = emblemSvg(k, 'e14e' + (++uid));
      if (bump) { el.classList.remove('is-pop'); void el.offsetWidth; el.classList.add('is-pop'); }
    };
    return el;
  }
  /* Deck-chrome switcher (outside .stage): a segment in the deck header + keys 7/8/9. Removed on unmount. */
  function chromeToggle(ctx, onPick) {
    var bar = document.querySelector('.dk-bar__r');
    var box = h('div', { class: 'dk-seg e14-chrome', role: 'group', 'aria-label': 'Исход (демо)', title: 'Исход (демо): клавиши 7 · 8 · 9' });
    var btns = ORDER.map(function (k, i) {
      var b = h('button', { class: 'dk-btn dk-seg__b', type: 'button', 'data-k': k, title: OUT[k].word + '  (' + (7 + i) + ')', 'aria-label': OUT[k].word },
        h('span', { class: 'e14-chrome__ic', html: emblemSvg(k, 'e14c' + (++uid)) }), h('span', { text: ['Победа', 'С потерями', 'Поражение'][i] }));
      b.addEventListener('click', function () { onPick(k); });
      box.appendChild(b);
      return b;
    });
    if (bar) bar.insertBefore(box, bar.firstChild);
    ctx.on(document, 'keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      var i = ['7', '8', '9'].indexOf(e.key);
      if (i >= 0) { onPick(ORDER[i]); e.preventDefault(); }
    });
    box.set = function (k) { btns.forEach(function (b) { b.classList.toggle('is-on', b.dataset.k === k); }); };
    box.remove2 = function () { box.remove(); };
    return box;
  }

  /* ================================================================ TABLE */
  function mountTable(stage, ctx) {
    var root = h('div', { class: 'e14' });
    stage.appendChild(root);
    var L = UI.tableLayout(root);

    var scene = h('div', { class: 'e14-scene' });
    var layers = artLayers(scene);
    var veil = h('div', { class: 'e14-veil' });
    var fx = h('div', { class: 'e14-fx' }, motes(36, 120));
    var emb = emblem(330);
    var wordNear = h('div', { class: 'e14-word t-title' });
    var wordFar = h('div', { class: 'e14-word e14-word--far t-title', 'data-far': '' });
    var blackout = h('div', { class: 'e14-blackout' }, UI.icon('rotate'));
    scene.appendChild(veil); scene.appendChild(fx);
    scene.appendChild(h('div', { class: 'e14-center' }, wordFar, emb, wordNear));
    L.center.appendChild(scene);
    root.appendChild(blackout);

    // the party lives in the seats only (fallen = greyscale); the ends carry the outcome glow + the gear
    var seats = {};
    PARTY.forEach(function (p) {
      var hd = UI.HEROES[p.hero];
      var seat = L.seat(p.pos, { hero: p.hero, hp: OUT[state.outcome].hp[p.hero], slots: [], endTurn: false });
      seat.classList.add('e14-seat');
      seats[p.hero] = seat;
      var mb = seat.querySelector('.seat__medal');
      UI.longPress(mb, function () { UI.sheetFor(mb, { art: 'bust-' + p.hero, title: hd.short, text: hd.name + ' — ' + hd.epithet.toLowerCase() + '.' }); });
    });
    L.endL.appendChild(h('div', { class: 'e14-endglow' }));
    L.endR.appendChild(h('div', { class: 'e14-endglow' }));
    var gear = UI.gear({ onPick: function (k, it) {
      if (k === 'again') { restart(); return; }
      UI.toastFor(gear, { icon: it.icon, text: k === 'party' ? 'Выбор героев' : it.word });
    } });
    L.endR.appendChild(gear);
    var tg = chromeToggle(ctx, function (k) { if (k !== state.outcome) setOutcome(k, true); });

    function setOutcome(k, anim) {
      state.outcome = k;
      var o = OUT[k];
      root.dataset.outcome = k;
      Object.keys(layers).forEach(function (a) { layers[a].classList.toggle('is-on', a === o.art); });
      emb.set(k, anim);
      wordNear.textContent = o.word; wordFar.textContent = o.word;
      [wordNear, wordFar].forEach(function (w) { w.classList.toggle('is-long', o.word.length > 10); if (anim) { w.classList.remove('is-in'); void w.offsetWidth; w.classList.add('is-in'); } });
      tg.set(k);
      PARTY.forEach(function (p, i) {
        var hp = o.hp[p.hero], dead = hp <= 0;
        var apply = function () {
          seats[p.hero].setHp(hp);
          seats[p.hero].medal.setState(dead ? 'dead' : '');
          seats[p.hero].classList.toggle('is-fallen', dead);
        };
        if (anim) ctx.setTimeout(apply, 120 + i * 90); else apply();
      });
      if (anim) {
        UI.sound(o.sound);
        var c = UI.center(emb, stage);
        UI.spark(stage, c.x, c.y, k === 'defeat' ? '#9FB4D8' : 'var(--gold-hi)', 20);
        if (k === 'victory') UI.flash(stage, 'rgba(255,226,160,.28)', 520);
      }
    }
    setOutcome(state.outcome, false);

    // THE main action: seal «Ещё раз», hold 0.5 s
    var restarting = false;
    var pair = UI.sealPair(L.nodes(), { icon: 'rotate', word: 'Ещё раз', hold: 500, onPress: restart });
    pair.seals.forEach(function (sl) {
      var t0 = 0;
      sl.addEventListener('pointerdown', function () { t0 = Date.now(); });
      sl.addEventListener('pointerup', function () {
        if (t0 && Date.now() - t0 < 450 && !restarting) {
          UI.sound('error');
          UI.toastFor(sl, { icon: 'hourglass', text: 'Держите' });
        }
        t0 = 0;
      });
      sl.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // a long hold must not open a menu
    });
    function restart() {
      restarting = true;
      root.classList.add('is-restart');
      UI.sound('turn');
      ctx.setTimeout(function () { state.outcome = 'mixed'; ctx.remount(); }, 1500);
    }
    return function () { tg.remove2(); };
  }

  /* ================================================================ TV */
  function mountTv(stage, ctx) {
    var root = h('div', { class: 'e14tv' });
    stage.appendChild(root);
    var layers = artLayers(root);
    root.appendChild(h('div', { class: 'e14-veil e14tv__veil' }));
    root.appendChild(h('div', { class: 'e14-fx' }, motes(70, 160)));
    var emb = emblem(240);
    var word = h('div', { class: 'e14tv__word t-title' });
    root.appendChild(h('div', { class: 'e14tv__top' }, emb, word));
    var row = h('div', { class: 'e14tv__row' });
    var meds = {};
    ['guardian', 'fury', 'beacon', 'arcanist'].forEach(function (id) {
      var hd = UI.HEROES[id];
      var m = UI.medallion({ hero: id, hp: OUT[state.outcome].hp[id], max: hd.max, size: 168 });
      var cell = h('div', { class: 'e14tv__hero', style: { '--hero': hd.color } }, m, h('div', { class: 'e14tv__name', text: hd.short }));
      row.appendChild(cell);
      meds[id] = { m: m, cell: cell };
    });
    root.appendChild(row);
    var l1 = h('span'), l2 = h('span');
    root.appendChild(h('div', { class: 'e14tv__sub' }, UI.severin({ size: 96, state: 'speaking' }), h('p', { class: 'e14tv__line' }, l1, h('br'), l2)));
    var tg = chromeToggle(ctx, function (k) { if (k !== state.outcome) set(k, true); });

    function set(k, anim) {
      state.outcome = k;
      var o = OUT[k];
      root.dataset.outcome = k;
      Object.keys(layers).forEach(function (a) { layers[a].classList.toggle('is-on', a === o.art); });
      emb.set(k, anim);
      word.textContent = o.word;
      if (anim) { word.classList.remove('is-in'); void word.offsetWidth; word.classList.add('is-in'); }
      l1.textContent = o.hook[0]; l2.textContent = o.hook[1];
      Object.keys(meds).forEach(function (id) {
        var hp = o.hp[id];
        meds[id].m.setHp(hp); meds[id].m.setState(hp <= 0 ? 'dead' : '');
        meds[id].cell.classList.toggle('is-fallen', hp <= 0);
      });
      tg.set(k);
      if (anim) {
        UI.sound(o.sound);
        if (k !== 'defeat') UI.shake(stage, 4);
        var c = UI.center(emb, stage);
        UI.spark(stage, c.x, c.y, k === 'defeat' ? '#9FB4D8' : 'var(--gold-hi)', 30);
      }
    }
    set(state.outcome, false);
    return function () { tg.remove2(); };
  }

  Deck.register({
    id: '14',
    key: 'ending',
    title: 'Финал',
    change: 'Эмблема исхода во весь центр, павшие серые, «Ещё раз» удержанием',
    surface: 'table',
    before: 'before/37-ending-tabletop.webp',
    css: true,
    views: [
      { key: 'table', label: 'Стол', surface: 'table', before: 'before/37-ending-tabletop.webp' },
      { key: 'tv', label: 'ТВ', surface: 'tv', before: 'before/38-ending-scene.webp' }
    ],
    quiz: [
      { q: 'Чем кончилось?', a: 'Успех с потерями: Кощей пал', sel: '.e14-emb, .e14tv__word' },
      { q: 'Что нажать?', a: 'Печать «Ещё раз» — зажать', sel: '[data-main]' }
    ],
    mount: function (stage, ctx) {
      if (ctx.view === 'tv') return mountTv(stage, ctx);
      return mountTable(stage, ctx);
    }
  });
})();
