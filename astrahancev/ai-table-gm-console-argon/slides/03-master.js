/* =====================================================================
   Slide 03 · Выбор мастера (new screen).  Owner: screens «entry».
   View «Экран»: the owner's concept choose-master-severin.jpg brought to life —
     Severin card in the light (name, epithet, 3 traits, gold seal «Выбрать»),
     two locked silhouettes «Скоро».  Tap Severin → stamp + glow + one line
     of his voice; tap a locked one → shake + toast.  Long press Severin → his blurb.
   View «Стол»: the same moment on the table — art in the centre without text,
     Severin medallions and ONE seal «Выбрать» shown in both nodes.
   ===================================================================== */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h;

  var SEV = {
    name: 'Северин Кроу',
    epithet: 'Саркастичный рассказчик',
    traits: ['Остроумный', 'Язвительный', 'Справедливый'],
    blurb: 'Он запомнит каждое глупое решение, вернёт его в самый неподходящий момент и обязательно объяснит, почему вы сами виноваты.',
    line: '«Ну что ж. Посмотрим, чего вы стоите.»'
  };
  var LOCKED = [
    { key: 'blue', art: 'master-silhouette-blue', color: '#5AA9FF' },
    { key: 'green', art: 'master-silhouette-green', color: '#8FD06A' }
  ];

  function embers(n) {
    var box = h('div', { class: 'ent-embers', 'aria-hidden': 'true' });
    for (var i = 0; i < n; i++) {
      var sz = 3 + Math.random() * 4;
      box.appendChild(h('i', { style: {
        left: (20 + Math.random() * 60).toFixed(1) + '%', width: sz.toFixed(1) + 'px', height: sz.toFixed(1) + 'px',
        '--dx': ((Math.random() - 0.5) * 180).toFixed(0) + 'px',
        animationDuration: (7 + Math.random() * 8).toFixed(1) + 's',
        animationDelay: (-Math.random() * 15).toFixed(1) + 's', opacity: (0.35 + Math.random() * 0.55).toFixed(2) } }));
    }
    return box;
  }

  /* Store fallback = crops of the owner's concept (1280×720) that carry baked-in
     text («Северин Кроу», «В разработке»).  Until assets/gen art is switched on,
     show only the picture part of the concept card so the text is never doubled. */
  var CONCEPT = { w: 1280, h: 720, sev: [425, 105, 435, 340], blue: [70, 115, 325, 300], green: [888, 115, 325, 300] };
  function conceptCrop(el, part, boxW) {
    var r = CONCEPT[part], k = boxW / r[2];
    el.style.backgroundImage = 'url("' + window.art('severin-card') + '")';
    el.style.backgroundSize = Math.round(CONCEPT.w * k) + 'px ' + Math.round(CONCEPT.h * k) + 'px';
    el.style.backgroundPosition = -Math.round(r[0] * k) + 'px ' + -Math.round(r[1] * k) + 'px';
    el.style.height = Math.round(r[3] * k) + 'px';
    el.style.bottom = 'auto';
    el.classList.add('is-crop');
    return el;
  }
  function isFallback(key) { return !window.art.isNew(key) && /choose-master/.test(window.art(key) || ''); }

  function lockedCard(lk, ctx, stage, big) {
    var el = h('button', { class: 'ms-lock ms-lock--' + lk.key + (big ? '' : ' ms-lock--sm'), type: 'button', 'aria-label': 'Скоро', style: { '--mc': lk.color } },
      UI.bgArt(h('span', { class: 'ms-lock__art' }), lk.art),
      h('span', { class: 'ms-lock__veil' }),
      h('span', { class: 'ms-lock__flare' }),
      h('span', { class: 'ms-lock__q', text: '?' }),
      h('span', { class: 'ms-lock__tag' }, UI.icon('lock'), big ? h('span', { text: 'Скоро' }) : null));
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { el.appendChild(UI.rhomb('frame__corner frame__corner--' + c)); });
    if (isFallback(lk.art)) { el.classList.add('is-fallback'); conceptCrop(el.querySelector('.ms-lock__art'), lk.key, big ? 404 : 144); }
    ctx.on(el, 'click', function () {
      UI.sound('error');
      el.classList.remove('is-nope', 'is-flare'); void el.offsetWidth; el.classList.add('is-nope', 'is-flare');
      ctx.setTimeout(function () { el.classList.remove('is-flare'); }, 700);
      if (big) { var p = UI.center(el, stage); UI.toast(stage, { icon: 'lock', text: 'Скоро', tone: 'bad', x: p.x, y: p.y + 130 }); }
      else UI.toastFor(el, { icon: 'lock', text: 'Скоро', tone: 'bad' });
    });
    return el;
  }

  function sevCard(big) {
    var art = UI.bgArt(h('span', { class: 'ms-sev__art' }), 'severin-card');
    var el = h('div', { class: 'ms-sev' + (big ? '' : ' ms-sev--sm'), 'data-turn': '', 'data-tap': '', role: 'button', tabindex: '0', 'aria-label': SEV.name },
      h('span', { class: 'ms-sev__rays' }),
      h('span', { class: 'ms-sev__in' },
        art, h('span', { class: 'ms-sev__veil' }), h('span', { class: 'ms-sev__glare' }),
        big ? h('span', { class: 'ms-sev__text' },
          h('span', { class: 't-title ms-sev__name', text: SEV.name }),
          h('span', { class: 'ms-sev__epi', text: SEV.epithet })) : null,
        h('span', { class: 'ms-sev__ok' }, UI.icon('check'))));
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { el.querySelector('.ms-sev__in').appendChild(UI.rhomb('frame__corner frame__corner--' + c)); });
    el.appendChild(UI.rhomb('ms-sev__jewel'));
    if (isFallback('severin-card')) { el.classList.add('is-fallback'); conceptCrop(art, 'sev', big ? 544 : 214); }
    el.__art = art;
    return el;
  }

  function bindTilt(ctx, el) {
    var inner = el.querySelector('.ms-sev__in');
    ctx.on(el, 'pointermove', function (e) {
      if (UI.reduced()) return;
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      inner.style.transform = 'perspective(1200px) rotateY(' + (px * 10).toFixed(2) + 'deg) rotateX(' + (-py * 8).toFixed(2) + 'deg)';
      inner.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
      inner.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
      el.classList.add('is-hover');
    });
    ctx.on(el, 'pointerleave', function () { inner.style.transform = ''; el.classList.remove('is-hover'); });
  }

  /* ------------------------------------------------------------ view: screen */
  function mountScreen(stage, ctx) {
    var root = h('div', { class: 'ms' });
    root.appendChild(h('div', { class: 'ms-bg' }));
    var border = h('div', { class: 'ms-border', 'aria-hidden': 'true' });
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { border.appendChild(UI.rhomb('ms-border__r ms-border__r--' + c)); });
    root.appendChild(border);
    root.appendChild(embers(24));
    root.appendChild(h('div', { class: 'ms-head' },
      h('span', { class: 'ms-head__line' }), h('span', { class: 't-title ms-head__t', text: 'Выберите мастера' }), h('span', { class: 'ms-head__line ms-head__line--r' })));

    var left = lockedCard(LOCKED[0], ctx, stage, true);
    var right = lockedCard(LOCKED[1], ctx, stage, true);
    var sev = sevCard(true);
    var seal = UI.seal({ icon: 'check', word: 'Выбрать', size: 104, onPress: choose });
    var sealBox = h('div', { class: 'ms-seal' }, seal);
    var cap = h('div', { class: 'ms-cap' });
    var next = h('button', { class: 'ms-next', type: 'button', 'aria-label': 'Дальше' }, UI.icon('arrow-right'));

    root.appendChild(h('div', { class: 'ms-row' }, left, h('div', { class: 'ms-mid' }, sev, sealBox), right));
    root.appendChild(cap);
    root.appendChild(next);
    stage.appendChild(root);

    bindTilt(ctx, sev);
    ctx.on(sev, 'click', function () { choose(); });
    ctx.on(sev, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
    UI.longPress(sev, function () {
      UI.sheet(stage, { art: 'severin-bust', title: 'Северин', text: SEV.traits.join(' · ') + '. ' + SEV.blurb, x: 960, y: 560 });
    });
    ctx.on(next, 'click', function () { Deck.go('04'); });

    var chosen = false;
    function choose() {
      if (chosen) {
        sev.classList.remove('is-bump'); void sev.offsetWidth; sev.classList.add('is-bump');
        return;
      }
      chosen = true;
      var p = UI.center(sev, stage);
      UI.stampFx(stage, p.x, p.y - 80, 'var(--gold)');
      seal.stamp().then(function () {
        sealBox.classList.add('is-gone');
        speak();
      });
      root.classList.add('is-chosen');
      UI.flash(stage, 'rgba(255,200,120,.22)', 600);
      ctx.setTimeout(function () { UI.spark(stage, p.x - 200, p.y, 'var(--gold-hi)', 10); UI.spark(stage, p.x + 200, p.y, 'var(--gold-hi)', 10); }, 180);
    }
    function speak() {
      var sv = UI.severin({ size: 92, state: 'speaking', cycle: false });
      var txt = h('span', { class: 'ms-cap__t' });
      cap.innerHTML = '';
      cap.appendChild(sv); cap.appendChild(txt);
      cap.classList.add('is-on');
      // the line types itself in, like his voice
      var full = SEV.line, i = 0;
      var t = ctx.setInterval(function () {
        i += 2; txt.textContent = full.slice(0, i);
        if (i >= full.length) {
          ctx.clearInterval(t);
          ctx.setTimeout(function () {
            sv.setState('idle');
            next.classList.add('is-on', 'is-main'); next.setAttribute('data-main', '');
          }, 900);
        }
      }, 45);
    }
  }

  /* ------------------------------------------------------------ view: table */
  /* The centre is read from both long sides: two mirrored rows (near row faces
     the near side, far row is turned 180°).  Each node shows the big Severin
     medallion (brief §4.1) with the ONE seal «Выбрать» beside it, not over it.
     Empty seats: a dark silhouette medallion with a gold-framed «+», static
     (heroes are picked on the next screen; the seal is the only pulse here). */
  function mountTable(stage, ctx) {
    var L = UI.tableLayout(stage);
    L.root.classList.add('ms-tl');
    L.center.appendChild(h('div', { class: 'ms-tl__bg' }));
    L.center.appendChild(embers(16));
    var sevs = [];
    ['near', 'far'].forEach(function (side) {
      var sev = sevCard(false);
      sevs.push(sev);
      var row = h('div', { class: 'ms-tl__row ms-tl__row--' + side },
        lockedCard(LOCKED[0], ctx, stage, false), sev, lockedCard(LOCKED[1], ctx, stage, false));
      if (side === 'far') row.setAttribute('data-far', '');
      L.center.appendChild(row);
    });
    ['near', 'far'].forEach(function (k) {
      [L[k].left, L[k].right].forEach(function (box) {
        var e = h('div', { class: 'ms-empty' },
          h('span', { class: 'ms-empty__medal' }, h('span', { class: 'ms-empty__sil' }), h('span', { class: 'ms-empty__plus' }, UI.icon('plus'))));
        box.appendChild(e);
        ctx.on(e, 'click', function () {
          var nd = (k === 'near' ? L.near : L.far).node;
          if (nd && nd.seal) { nd.seal.classList.remove('is-bump'); void nd.seal.offsetWidth; nd.seal.classList.add('is-bump'); }
        });
      });
    });
    var nodes = L.nodes();
    var pair = UI.sealPair(nodes, { icon: 'check', word: 'Выбрать', onPress: done });
    sevs.forEach(function (sev) {
      sev.removeAttribute('data-turn');
      bindTilt(ctx, sev);
      ctx.on(sev, 'click', function () { pair.stamp(); });
    });
    sevs[0].setAttribute('data-turn', '');
    function done() {
      L.root.classList.add('is-chosen');
      sevs.forEach(function (sev) {
        var p = UI.center(sev, stage);
        UI.stampFx(stage, p.x, p.y, 'var(--gold)');
      });
      UI.flash(stage, 'rgba(255,200,120,.2)', 600);
      nodes.forEach(function (n) { n.severin.setState('speaking'); });
      ctx.setTimeout(function () { nodes.forEach(function (n) { n.severin.setState('idle'); }); }, 3200);
    }
  }

  Deck.register({
    id: '03',
    key: 'master',
    title: 'Выбор мастера',
    change: 'Новый экран: живая карточка Северина, одна печать «Выбрать», остальные мастера — «скоро»',
    surface: 'start',
    before: null,
    css: true,
    views: [
      { key: 'screen', label: 'Экран', surface: 'start', before: null },
      { key: 'table', label: 'Стол', surface: 'table', before: null }
    ],
    quiz: [
      { q: 'Что нажать?', a: 'Печать «Выбрать»', sel: '[data-main]' },
      { q: 'Кого можно выбрать?', a: 'Только Северина', sel: '[data-turn]' }
    ],
    mount: function (stage, ctx) {
      if (ctx.view === 'table') mountTable(stage, ctx);
      else mountScreen(stage, ctx);
    }
  });
})();
