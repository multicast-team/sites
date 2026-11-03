/* =====================================================================
   Slide 02 · Старт.  Owner: screens «entry».
   Three device cards (Стол / Телефон / ТВ): big icon + one word, tilt
   under the finger, tap = choose (stamp, connect ring, check).
   Corner: «?» → 4 living picture-steps (говори, выбери, подтверди, брось),
   QR → address code, «i» → SRD line.  Lead text and the 10-step wall are gone.
   ===================================================================== */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h, s = UI.s;

  function embers(n) {
    var box = h('div', { class: 'ent-embers', 'aria-hidden': 'true' });
    for (var i = 0; i < n; i++) {
      var sz = 3 + Math.random() * 4;
      box.appendChild(h('i', { style: {
        left: (Math.random() * 100).toFixed(1) + '%', width: sz.toFixed(1) + 'px', height: sz.toFixed(1) + 'px',
        '--dx': ((Math.random() - 0.5) * 200).toFixed(0) + 'px',
        animationDuration: (8 + Math.random() * 9).toFixed(1) + 's',
        animationDelay: (-Math.random() * 16).toFixed(1) + 's', opacity: (0.3 + Math.random() * 0.5).toFixed(2) } }));
    }
    return box;
  }

  /* fake but QR-looking code (no real address inside: rule «no addresses in the concept») */
  function qrSvg() {
    var N = 25, seed = 7, cells = [];
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function finder(x, y) { return x >= 0 && x < 7 && y >= 0 && y < 7; }
    var svg = s('svg', { class: 'stt-qr__svg', viewBox: '-2 -2 ' + (N + 4) + ' ' + (N + 4), 'aria-hidden': 'true' });
    svg.appendChild(s('rect', { x: -2, y: -2, width: N + 4, height: N + 4, rx: 1.5, fill: '#EFE3C8' }));
    [[0, 0], [N - 7, 0], [0, N - 7]].forEach(function (f) {
      svg.appendChild(s('rect', { x: f[0] + 0.5, y: f[1] + 0.5, width: 6, height: 6, fill: 'none', stroke: '#1a120a', 'stroke-width': 1 }));
      svg.appendChild(s('rect', { x: f[0] + 2, y: f[1] + 2, width: 3, height: 3, fill: '#1a120a' }));
    });
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      if (finder(x, y) || finder(x - (N - 7), y) || finder(x, y - (N - 7))) continue;
      if ((x === 7 || y === 7 || x === N - 8 || y === N - 8) && (x < 8 || y < 8)) continue;
      if (rnd() < 0.47) cells.push('M' + x + ' ' + y + 'h1v1h-1z');
    }
    svg.appendChild(s('path', { d: cells.join(''), fill: '#1a120a' }));
    // centre rhomb mark
    svg.appendChild(s('rect', { x: N / 2 - 2.6, y: N / 2 - 2.6, width: 5.2, height: 5.2, fill: '#EFE3C8', transform: 'rotate(45 ' + N / 2 + ' ' + N / 2 + ')' }));
    svg.appendChild(s('rect', { x: N / 2 - 1.6, y: N / 2 - 1.6, width: 3.2, height: 3.2, fill: '#9A6A22', transform: 'rotate(45 ' + N / 2 + ' ' + N / 2 + ')' }));
    return svg;
  }

  /* «Стол» as seen from above: the table with four seats, two per long side
     (the sprite's dev-table reads as a generic screen at 112 px) */
  function tableTopIcon() {
    return s('svg', { class: 'ic stt-card__ic stt-tabletop', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
      s('rect', { x: 3, y: 6.5, width: 18, height: 11, rx: 1.6, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
      s('rect', { x: 6, y: 9, width: 12, height: 6, rx: .6, fill: 'currentColor', opacity: .28 }),
      s('path', { d: 'M12 10.4l1.6 1.6-1.6 1.6-1.6-1.6Z', fill: 'currentColor' }),
      [[7.5, 3.4], [16.5, 3.4], [7.5, 20.6], [16.5, 20.6]].map(function (c) {
        return s('circle', { cx: c[0], cy: c[1], r: 1.9, fill: 'currentColor' });
      }));
  }

  var DEVICES = [
    { key: 'table', icon: 'dev-table', word: 'Стол', art: 'map-ford' },
    { key: 'phone', icon: 'dev-phone', word: 'Телефон', art: 'bust-fury' },
    { key: 'tv', icon: 'dev-tv', word: 'ТВ', art: 'hall-heroes' }
  ];

  Deck.register({
    id: '02',
    key: 'start',
    title: 'Старт',
    change: 'Три устройства крупными карточками вместо стены из десяти шагов',
    surface: 'start',
    before: 'before/00a-start-1.png',
    css: true,
    quiz: [
      { q: 'Что нажать?', a: 'Карточку своего устройства', sel: '[data-main]' },
      { q: 'Где помощь?', a: '«?» в углу', sel: '.stt-corner--help' }
    ],
    mount: function (stage, ctx) {
      var root = h('div', { class: 'st' });
      root.appendChild(UI.bgArt(h('div', { class: 'stt-bg' }), 'cover-ford'));
      root.appendChild(h('div', { class: 'stt-shade' }));
      root.appendChild(embers(22));

      root.appendChild(h('div', { class: 'stt-logo' },
        h('div', { class: 't-title stt-logo__t', text: 'Чёрная вода' }), UI.rule({ width: 340 })));

      /* ---- device cards ---- */
      var row = h('div', { class: 'stt-row' });
      var cards = DEVICES.map(function (d, i) {
        var artEl = UI.bgArt(h('span', { class: 'stt-card__art' }), d.art);
        var medal = h('span', { class: 'stt-card__medal' },
          h('span', { class: 'stt-card__spin' }),
          d.key === 'table' ? tableTopIcon() : UI.icon(d.icon, 'stt-card__ic'),
          h('span', { class: 'stt-card__ok' }, UI.icon('check')));
        var inner = h('span', { class: 'stt-card__in' },
          artEl, h('span', { class: 'stt-card__veil' }), h('span', { class: 'stt-card__glare' }),
          medal,
          h('span', { class: 'stt-card__w', text: d.word }));
        ['tl', 'tr', 'bl', 'br'].forEach(function (c) { inner.appendChild(UI.rhomb('frame__corner frame__corner--' + c)); });
        var card = h('button', { class: 'stt-card stt-card--' + d.key, type: 'button', 'aria-label': d.word, style: { animationDelay: (0.12 + i * 0.1) + 's' } }, inner);
        if (i === 0) { card.classList.add('is-main'); card.setAttribute('data-main', ''); }
        card.__d = d; card.__in = inner;
        row.appendChild(card);
        bindTilt(card, inner);
        ctx.on(card, 'click', function () { choose(card); });
        return card;
      });
      root.appendChild(row);

      function bindTilt(card, inner) {
        ctx.on(card, 'pointermove', function (e) {
          if (UI.reduced()) return;
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          inner.style.transform = 'perspective(900px) rotateY(' + (px * 14).toFixed(2) + 'deg) rotateX(' + (-py * 12).toFixed(2) + 'deg)';
          inner.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
          inner.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
          card.classList.add('is-hover');
        });
        ctx.on(card, 'pointerleave', function () { inner.style.transform = ''; card.classList.remove('is-hover'); });
      }

      var chosen = null, busyT = null;
      function choose(card) {
        if (chosen === card) {
          card.classList.remove('is-bump'); void card.offsetWidth; card.classList.add('is-bump');
          return;
        }
        chosen = card;
        if (busyT) ctx.clearTimeout(busyT);
        cards.forEach(function (c) {
          var me = c === card;
          c.classList.toggle('is-chosen', me);
          c.classList.toggle('is-away', !me);
          c.classList.remove('is-ok', 'is-main');
          c.toggleAttribute('data-main', false);
        });
        var medal = card.querySelector('.stt-card__medal');
        var p = UI.center(medal, stage);
        UI.stampFx(stage, p.x, p.y);
        UI.sound('stamp');
        card.classList.add('is-linking');
        busyT = ctx.setTimeout(function () {
          card.classList.remove('is-linking');
          card.classList.add('is-ok');
          UI.sound('pick');
          UI.spark(stage, p.x, p.y, 'var(--heal)', 14);
          UI.toast(stage, { icon: 'check', text: 'Готово', tone: 'good', x: 960, y: 900 });
        }, 1100);
      }

      /* ---- corners: ? and QR (top right), i (bottom left), link dot ---- */
      function corner(cls, icon, label, fn) {
        var b = h('button', { class: 'stt-corner ' + cls, type: 'button', 'aria-label': label }, UI.icon(icon));
        ctx.on(b, 'click', fn);
        return b;
      }
      root.appendChild(h('div', { class: 'stt-corners' },
        corner('stt-corner--qr', 'qr', 'Адреса', openQr),
        corner('stt-corner--help', 'help', 'Как играть', openHelp)));
      root.appendChild(corner('stt-corner--info', 'info', 'Правила SRD', function () {
        UI.sheet(stage, { icon: 'info', title: 'SRD 5.1', text: 'Правила — System Reference Document 5.1, лицензия CC BY 4.0.', x: 360, y: 860 });
      }));
      root.appendChild(h('div', { class: 'stt-net', title: 'На связи' }, h('i')));

      stage.appendChild(root);

      /* ---- overlays ---- */
      var over = null;
      function closeOver() {
        if (!over) return;
        var o = over; over = null;
        o.classList.add('is-out');
        ctx.setTimeout(function () { o.remove(); }, 260);
      }
      function openOver(cls, kids) {
        closeOver();
        var o = h('div', { class: 'stt-over ' + cls },
          h('button', { class: 'stt-over__x', type: 'button', 'aria-label': 'Закрыть' }, UI.icon('cross')), kids);
        ctx.on(o, 'click', function (e) { if (!e.target.closest('.stt-step, .stt-qr')) closeOver(); });
        root.appendChild(o);
        over = o;
        UI.sound('open');
        return o;
      }

      function step(n, word, illo, cls) {
        var el = h('div', { class: 'stt-step ' + (cls || ''), style: { animationDelay: (0.08 + n * 0.12) + 's' }, 'data-tap': '' },
          h('span', { class: 'stt-step__n' }, UI.rhomb('stt-step__r'), h('b', { text: String(n) })),
          h('span', { class: 'stt-step__illo' }, illo),
          h('span', { class: 'stt-step__w', text: word }));
        return el;
      }

      function openHelp() {
        // 1 говори — live mic
        var mic = UI.mic({ color: 'var(--c-voice)', state: 'listening', size: 112 });
        // 2 выбери — three choice chips, the middle one lifts under a tapping finger
        var pick = h('span', { class: 'stt-pick' },
          h('i', { class: 'stt-pick__c' }, UI.icon('choice-talk')),
          h('i', { class: 'stt-pick__c is-sel' }, UI.icon('choice-go')),
          h('i', { class: 'stt-pick__c' }, UI.icon('choice-search')),
          h('span', { class: 'stt-pick__tap' }));
        // 3 подтверди — seal that stamps itself
        var seal = UI.seal({ small: true, size: 104, main: false, word: 'Подтвердить' });
        seal.classList.add('stt-autoseal');
        // 4 брось — d20 that tumbles to a number
        var die = UI.die('d20', { value: 17, size: 128 });
        var dieBox = h('span', { class: 'stt-die' }, die);

        var row4 = h('div', { class: 'stt-steps' },
          step(1, 'Говори', mic, 'stt-step--talk'), h('span', { class: 'stt-arrow' }, UI.icon('arrow-right')),
          step(2, 'Выбери', pick, 'stt-step--pick'), h('span', { class: 'stt-arrow' }, UI.icon('arrow-right')),
          step(3, 'Подтверди', seal, 'stt-step--seal'), h('span', { class: 'stt-arrow' }, UI.icon('arrow-right')),
          step(4, 'Брось', dieBox, 'stt-step--roll'));
        var o = openOver('stt-over--help', row4);

        // gentle loops inside the illustrations (cleared on close / unmount)
        var micStates = ['listening', 'thinking', 'speaking', 'idle'], mi = 0;
        var tick = ctx.setInterval(function () {
          if (!o.isConnected) { ctx.clearInterval(tick); return; }
          mi = (mi + 1) % micStates.length; mic.dataset.state = micStates[mi];
        }, 1400);
        var sealT = ctx.setInterval(function () {
          if (!o.isConnected) { ctx.clearInterval(sealT); return; }
          seal.classList.remove('is-stamping'); void seal.offsetWidth; seal.classList.add('is-stamping');
          ctx.setTimeout(function () { seal.classList.remove('is-stamping'); }, 620);
        }, 2200);
        var vals = [3, 11, 8, 19, 6, 14, 17], vi = 0;
        var dieT = ctx.setInterval(function () {
          if (!o.isConnected) { ctx.clearInterval(dieT); return; }
          dieBox.classList.remove('is-roll'); void dieBox.offsetWidth; dieBox.classList.add('is-roll');
          var k = 0;
          var spin = ctx.setInterval(function () {
            k++; if (die.setValue) die.setValue(vals[(vi + k) % vals.length]);
            if (k >= 6) { ctx.clearInterval(spin); if (die.setValue) die.setValue(17, true); }
          }, 90);
          vi++;
        }, 2600);
        // tapping a step plays it once more with sound
        [].slice.call(o.querySelectorAll('.stt-step')).forEach(function (st) {
          ctx.on(st, 'click', function () {
            st.classList.remove('is-ping'); void st.offsetWidth; st.classList.add('is-ping');
            if (st.classList.contains('stt-step--seal')) UI.sound('stamp');
            else if (st.classList.contains('stt-step--roll')) UI.sound('dice');
            else if (st.classList.contains('stt-step--talk')) UI.sound('mic-on');
            else UI.sound('pick');
          });
        });
      }

      function openQr() {
        var card = UI.frame({ parch: true, cls: 'stt-qr' },
          h('div', { class: 'stt-qr__code' }, qrSvg(), h('span', { class: 'stt-qr__scan' })),
          h('div', { class: 'stt-qr__w' }, UI.icon('dev-phone'), h('span', { text: 'Телефон' })));
        openOver('stt-over--qr', card);
      }
    }
  });
})();
