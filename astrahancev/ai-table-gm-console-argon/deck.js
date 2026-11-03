/* =====================================================================
   AI-стол · before/after deck.  Owner: foundation.

   SLIDE API
   ---------
   slides/index.js sets window.DECK_SLIDES = ['01-login', … '15-admin'] (file names, in order).
   Each slides/NN-key.js calls:

     Deck.register({
       id: '07',                       // two digits, matches the file prefix
       key: 'fight',
       title: 'Бой — мой ход',         // header title
       change: 'Карта на весь стол, умения под рукой, одна печать',   // ONE line «что изменилось»
       surface: 'table',               // 'table' | 'tv' | 'phone' | 'admin' | 'start' | 'login'
       before: 'before/25-fight-tabletop.webp',   // or null when the screen did not exist
       css: true,                      // optional: deck loads slides/07-fight.css (or give a path)
       views: [                        // optional: several surfaces in one slide (segmented switch)
         { key: 'table', label: 'Стол', surface: 'table', before: 'before/25-fight-tabletop.webp' },
         { key: 'tv',    label: 'ТВ',   surface: 'tv',    before: 'before/26-fight-scene.webp' } ],
       quiz: [                         // optional «5 секунд» answers (defaults shown); a view may have its own quiz
         { q: 'Что нажать?', a: 'Печать «Подтвердить»', sel: '[data-main]' },
         { q: 'Чей ход?',    a: 'Никита',               sel: '[data-turn]' } ],
       mount(stage, ctx) { … },        // build the live mock into `stage`; may return a cleanup fn
       unmount() { … }                 // optional; ctx timers/listeners are cleaned up anyway
     });

   mount() gets a FRESH stage element, already sized to the surface
   (1920×1080, phone 390×844) and scaled by the deck — draw in stage pixels.
   The stage has data-surface, and for the table data-screen="32|43|55" (drives --mm).

   ctx = {
     surface, view, width, height, stage,
     UI, art, icon(name),                     // components.js, manifest, sprite icon
     rotated()            → true when «Сесть напротив» turned the table 180°
     mm()                 → px per mm for the chosen screen (2 at 43″)
     setTimeout / setInterval / raf / sleep(ms)   auto-cancelled on unmount
     on(target, type, fn, opts)                   auto-removed on unmount
     signal               AbortSignal, aborted on unmount
     onDeck(event, fn)    'rotate' | 'screen' | 'mode' | 'resize'
     local(evt|x, y)      client point → stage coordinates (UI.local)
     toast(opts) / sound(name)
     remount()            rebuild the slide from scratch (demo reset)
   }

   Conventions: mark THE main action with data-main and whose-turn with data-turn
   (used by «5 секунд»).  Never scroll inside a stage.  Everything is static: no CDN.
   Deep link: index.html#07 (optionally #07/new | #07/compare | #07/curtain, #07/new/tv).
   ===================================================================== */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h;

  var SURF = {
    table: { w: 1920, h: 1080 }, tv: { w: 1920, h: 1080 }, admin: { w: 1920, h: 1080 },
    start: { w: 1920, h: 1080 }, login: { w: 1920, h: 1080 }, phone: { w: 390, h: 844 }
  };
  var SCREENS = { '32': 2.71, '43': 2, '55': 1.58 };
  var MODES = ['compare', 'curtain', 'new'];
  var MODE_LABEL = { compare: 'Сравнить', curtain: 'Шторка', new: 'Новое' };

  var Deck = window.Deck = {
    slides: {}, order: [], titles: window.DECK_TITLES || {}, index: 0,
    mode: null, rotated: false, screen: '43', view: null, ready: false
  };
  var loaded = {}, missing = {};
  var cur = null;        // { def, ctx, stage, cleanup, view }
  var els = {};

  /* -------------------------------------------------------------- register / load */
  Deck.register = function (def) {
    if (!def || !def.id) { console.warn('Deck.register: missing id', def); return; }
    def.id = String(def.id).padStart(2, '0');
    Deck.slides[def.id] = def;
    if (def.css) {
      var href = def.css === true ? 'slides/' + def.id + '-' + def.key + '.css' : def.css;
      if (!document.querySelector('link[href="' + href + '"]')) document.head.appendChild(h('link', { rel: 'stylesheet', href: href }));
    }
    if (Deck.ready && Deck.order[Deck.index] && Deck.order[Deck.index].id === def.id) show(Deck.index, { force: true });
  };

  function loadAll(files) {
    return Promise.all(files.map(function (f) {
      return new Promise(function (res) {
        var sc = document.createElement('script');
        sc.src = 'slides/' + f + '.js';
        sc.async = false;
        sc.onload = function () { loaded[f] = 1; res(); };
        sc.onerror = function () { missing[f] = 1; res(); };
        document.body.appendChild(sc);
      });
    }));
  }

  /* -------------------------------------------------------------- shell */
  function glyph(kind) {
    var paths = {
      compare: '<rect x="2" y="5" width="9" height="14" rx="1.5"/><rect x="13" y="5" width="9" height="14" rx="1.5"/>',
      curtain: '<rect x="2" y="5" width="20" height="14" rx="1.5"/><path d="M12 3v18"/><path d="M9 12h-2M17 12h-2"/>',
      new: '<rect x="2" y="5" width="20" height="14" rx="1.5"/><path d="M6 15l4-4 3 3 2-2 3 3"/>',
      replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>'
    };
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = paths[kind];
    return s;
  }
  function btn(cls, kids, title, on) {
    var b = h('button', { class: 'dk-btn ' + cls, type: 'button', title: title || null, 'aria-label': title || null }, kids);
    if (on) b.addEventListener('click', on);
    return b;
  }

  function buildShell() {
    var root = document.getElementById('deck');
    UI.ensureDefs();
    els.prev = btn('dk-nav dk-nav--prev', UI.icon('arrow-left'), 'Назад  ←', function () { go(Deck.index - 1); });
    els.next = btn('dk-nav dk-nav--next', UI.icon('arrow-right'), 'Дальше  →', function () { go(Deck.index + 1); });
    els.prevS = btn('dk-btn--icon dk-only-narrow', UI.icon('arrow-left'), 'Назад', function () { go(Deck.index - 1); });
    els.nextS = btn('dk-btn--icon dk-only-narrow', UI.icon('arrow-right'), 'Дальше', function () { go(Deck.index + 1); });
    els.count = h('div', { class: 'dk-count' }, h('b'), h('span'));
    els.title = h('div', { class: 'dk-title' });
    els.change = h('div', { class: 'dk-change' });
    els.views = h('div', { class: 'dk-seg dk-views' });
    els.modes = h('div', { class: 'dk-seg dk-modes' });
    MODES.forEach(function (m) {
      els.modes.appendChild(btn('dk-seg__b', [glyph(m), h('span', { text: MODE_LABEL[m] })], MODE_LABEL[m], function () { setMode(m); }));
    });
    els.quiz = btn('dk-btn--word', [UI.icon('hourglass'), h('span', { text: '5 секунд' })], '5 секунд: покажем и спросим', startQuiz);
    els.rot = btn('dk-btn--word', [UI.icon('rotate'), h('span', { text: 'Напротив' })], 'Сесть напротив: повернуть стол на 180°', function () { setRotated(!Deck.rotated); });
    els.size = h('div', { class: 'dk-seg dk-size' });
    ['32', '43', '55'].forEach(function (k) {
      els.size.appendChild(btn('dk-seg__b', h('span', { text: k + '″' }), 'Экран стола ' + k + '″', function () { setScreen(k); }));
    });
    els.replay = btn('dk-btn--icon', glyph('replay'), 'Заново', function () { show(Deck.index, { force: true }); });
    els.sound = btn('dk-btn--icon dk-sound', UI.icon('speaker'), 'Звук', function () {
      UI.sound.enabled = !UI.sound.enabled; UI.setIcon(els.sound.querySelector('svg'), UI.sound.enabled ? 'speaker' : 'speaker-off');
      els.sound.classList.toggle('is-off', !UI.sound.enabled);
    });
    els.full = btn('dk-btn--icon', UI.icon('fullscreen'), 'На весь экран (F)', toggleFull);
    els.dots = h('div', { class: 'dk-dots' });

    var bar = h('header', { class: 'dk-bar' },
      h('div', { class: 'dk-bar__l' }, els.prevS, els.count, h('div', { class: 'dk-text' }, els.title, els.change), els.nextS),
      h('div', { class: 'dk-bar__r' }, els.views, els.modes, els.quiz, els.rot, els.size, els.replay, els.sound, els.full),
      els.dots);

    els.capB = h('div', { class: 'dk-cap' }, h('i'), h('span', { text: 'До' }), h('i'));
    els.capA = h('div', { class: 'dk-cap dk-cap--after' }, h('i'), h('span', { text: 'После' }), h('i'));
    els.boxB = h('div', { class: 'dk-box dk-box--before' });
    els.boxA = h('div', { class: 'dk-box dk-box--after' });
    els.paneB = h('figure', { class: 'dk-pane dk-pane--before' }, els.capB, els.boxB);
    els.paneA = h('figure', { class: 'dk-pane dk-pane--after' }, els.capA, els.boxA);
    els.panes = h('div', { class: 'dk-panes' }, els.paneB, els.paneA);
    els.over = h('div', { class: 'dk-over' });
    els.view = h('main', { class: 'dk-view' }, els.prev, els.panes, els.next, els.over);
    // phones (≤500 px): the bar hides above the screen so the phone stage renders 1:1; this tab pulls it down
    els.peek = h('button', { class: 'dk-peek', type: 'button', title: 'Меню колоды', 'aria-label': 'Меню колоды' }, UI.icon('arrow-right'));
    els.peek.addEventListener('click', function () { els.root.style.setProperty('--bar-h', bar.offsetHeight + 'px'); els.root.classList.toggle('is-chrome'); });
    els.root = h('div', { class: 'dk' }, bar, els.view, els.peek);
    root.appendChild(els.root);

    window.addEventListener('resize', function () { layout(); emit('resize'); });
    window.addEventListener('hashchange', fromHash);
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', function () { els.root.classList.toggle('is-full', !!document.fullscreenElement); setTimeout(layout, 50); });
    bindSwipe();
  }

  /* -------------------------------------------------------------- navigation */
  function slideAt(i) {
    var f = Deck.order[i]; if (!f) return null;
    return Deck.slides[f.id] || null;
  }
  function go(i) {
    if (i < 0 || i >= Deck.order.length || i === Deck.index) return;
    show(i);
  }
  Deck.go = function (id) { var i = Deck.order.findIndex(function (o) { return o.id === String(id).padStart(2, '0'); }); if (i >= 0) show(i); };

  function writeHash() {
    var f = Deck.order[Deck.index]; if (!f) return;
    var hsh = '#' + f.id + (Deck.modeExplicit ? '/' + Deck.mode : '') + (Deck.view && Deck.viewExplicit ? '/' + Deck.view : '');
    if (location.hash !== hsh) history.replaceState(null, '', hsh);
  }
  function fromHash() {
    var m = /^#(\d{1,2})(?:\/(compare|curtain|new))?(?:\/([\w-]+))?/.exec(location.hash || '');
    if (!m) { if (!Deck.ready) show(0); return; }
    var id = m[1].padStart(2, '0');
    var i = Deck.order.findIndex(function (o) { return o.id === id; });
    if (m[2]) { Deck.mode = m[2]; Deck.modeExplicit = true; }
    if (m[3]) { Deck.view = m[3]; Deck.viewExplicit = true; }
    show(i < 0 ? 0 : i, { force: true, keepView: !!m[3] });
  }

  /* -------------------------------------------------------------- show slide */
  function teardown() {
    if (!cur) return;
    try { if (cur.cleanup) cur.cleanup(); } catch (e) { console.error(e); }
    try { if (cur.def && cur.def.unmount) cur.def.unmount(); } catch (e) { console.error(e); }
    if (cur.ctx) cur.ctx.__dispose();
    cur = null;
  }

  function show(i, o) {
    o = o || {};
    if (!Deck.order.length) return;
    i = Math.max(0, Math.min(Deck.order.length - 1, i));
    var same = i === Deck.index && cur;
    if (same && !o.force) return;
    endQuiz(true);
    teardown();
    if (i !== Deck.index && !o.keepView) { Deck.view = null; Deck.viewExplicit = false; }
    Deck.index = i;
    var f = Deck.order[i];
    var def = Deck.slides[f.id];
    var views = def && def.views && def.views.length ? def.views : null;
    var view = views ? (views.filter(function (v) { return v.key === Deck.view; })[0] || views[0]) : null;
    Deck.view = view ? view.key : null;
    var surface = (view && view.surface) || (def && def.surface) || 'table';
    var before = view && view.before !== undefined ? view.before : def ? def.before : (window.DECK_BEFORE || {})[f.id];
    var size = (def && def.size) || SURF[surface] || SURF.table;

    // header
    els.count.querySelector('b').textContent = f.id;
    els.count.querySelector('span').textContent = '/ ' + String(Deck.order.length).padStart(2, '0');
    els.title.textContent = def ? def.title : (Deck.titles[f.id] || f.key);
    els.change.textContent = def ? (def.change || '') : 'Слайд в работе';
    document.title = (def ? def.title : (Deck.titles[f.id] || '')) + ' · AI-стол: до и после';
    els.prev.disabled = els.prevS.disabled = i === 0;
    els.next.disabled = els.nextS.disabled = i === Deck.order.length - 1;
    renderDots();
    els.views.innerHTML = '';
    els.views.hidden = !views;
    if (views) views.forEach(function (v) {
      var b = btn('dk-seg__b' + (v.key === Deck.view ? ' is-on' : ''), [v.icon !== null ? UI.icon(v.icon || ({ table: 'dev-table', tv: 'dev-tv', phone: 'dev-phone', admin: 'gear', start: 'dev-table', login: 'padlock' })[v.surface] || 'dot') : null, h('span', { text: v.label || v.key })], v.label, function () {
        Deck.view = v.key; Deck.viewExplicit = true; show(Deck.index, { force: true, keepView: true });
      });
      els.views.appendChild(b);
    });
    var isTable = surface === 'table';
    els.rot.disabled = !isTable; els.size.classList.toggle('is-disabled', !isTable);
    [].forEach.call(els.size.children, function (b, k) { b.disabled = !isTable; b.classList.toggle('is-on', ['32', '43', '55'][k] === Deck.screen); });
    els.rot.classList.toggle('is-on', Deck.rotated && isTable);

    // before pane
    els.boxB.innerHTML = '';
    els.beforeImg = null;
    if (before) {
      els.beforeImg = h('img', { class: 'dk-before', src: before, alt: 'Как было', draggable: 'false' });
      els.boxB.appendChild(els.beforeImg);
    } else {
      els.boxB.appendChild(h('div', { class: 'dk-nobefore' }, UI.rhomb('dk-nobefore__r'), h('b', { text: 'Не было' }), h('span', { text: 'новый экран' })));
    }
    els.hasBefore = !!before;

    // after pane: fresh stage
    els.boxA.innerHTML = '';
    var scaler = h('div', { class: 'dk-scaler' });
    var stage = h('div', { class: 'stage', 'data-surface': surface, style: { width: size.w + 'px', height: size.h + 'px' } });
    if (isTable) stage.setAttribute('data-screen', Deck.screen);
    scaler.appendChild(stage);
    els.boxA.appendChild(scaler);
    els.scaler = scaler; els.stage = stage;
    els.surface = surface; els.size0 = size;
    scaler.toggleAttribute('data-rot', false);
    if (isTable && Deck.rotated) {
      scaler.setAttribute('data-rot', '180');
      if (els.beforeImg) els.beforeImg.classList.add('is-rot');
    }
    // curtain
    els.curtain = null;
    if (before) {
      var cimg = h('img', { src: before, alt: '', draggable: 'false' });
      var grip = h('div', { class: 'dk-curtain__grip' }, h('span', { class: 'dk-curtain__knob' }, UI.icon('arrow-left'), UI.icon('arrow-right')));
      els.curtain = h('div', { class: 'dk-curtain', style: { '--x': (Deck.curtainX != null ? Deck.curtainX : 50) + '%' } }, h('div', { class: 'dk-curtain__img' }, cimg), grip,
        h('span', { class: 'dk-curtain__tag dk-curtain__tag--b', text: 'До' }), h('span', { class: 'dk-curtain__tag dk-curtain__tag--a', text: 'После' }));
      if (isTable && Deck.rotated) cimg.classList.add('is-rot');
      els.boxA.appendChild(els.curtain);
      bindCurtain(els.curtain, grip);
    }
    if (!Deck.modeExplicit) Deck.mode = defaultMode();
    applyMode();
    layout();
    UI.bindTapFx(stage);

    if (!def) {
      stage.appendChild(soonCard(f, missing[f.file]));
      cur = { def: null, ctx: null, stage: stage };
    } else {
      var ctx = makeCtx(def, stage, surface, view, size);
      cur = { def: def, ctx: ctx, stage: stage };
      try {
        var r = def.mount(stage, ctx);
        if (typeof r === 'function') cur.cleanup = r;
      } catch (e) {
        console.error('[deck] slide ' + def.id + ' mount failed', e);
        stage.appendChild(soonCard(f, false, e));
      }
    }
    writeHash();
    els.view.classList.remove('is-enter'); void els.view.offsetWidth; els.view.classList.add('is-enter');
  }
  Deck.show = show;

  function soonCard(f, isMissing, err) {
    var big = els.surface !== 'phone';
    var card = UI.frame({ jewel: true, cls: 'dk-soon' + (big ? '' : ' dk-soon--phone') },
      UI.rhomb('dk-soon__r'),
      h('div', { class: 't-title dk-soon__t', text: Deck.titles[f.id] || f.key }),
      UI.rule({ width: big ? 360 : 220 }),
      h('div', { class: 'dk-soon__s', text: err ? 'Слайд упал — см. консоль' : 'Скоро' }));
    return h('div', { class: 'dk-soon-wrap' }, card);
  }

  function renderDots() {
    els.dots.innerHTML = '';
    Deck.order.forEach(function (f, k) {
      var has = !!Deck.slides[f.id];
      var d = h('button', { class: 'dk-dot' + (k === Deck.index ? ' is-on' : '') + (has ? '' : ' is-soon'), type: 'button', title: f.id + ' · ' + ((Deck.slides[f.id] && Deck.slides[f.id].title) || Deck.titles[f.id] || f.key), 'aria-label': f.id },
        UI.rhomb('dk-dot__r'));
      d.addEventListener('click', function () { show(k); });
      els.dots.appendChild(d);
    });
  }

  /* -------------------------------------------------------------- ctx */
  var deckHandlers = {};
  function emit(ev, data) { (deckHandlers[ev] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }

  function makeCtx(def, stage, surface, view, size) {
    var timers = [], intervals = [], rafs = [], listeners = [], mine = [];
    var ac = window.AbortController ? new AbortController() : { signal: {}, abort: function () {} };
    var dead = false;
    var ctx = {
      surface: surface, view: view ? view.key : null, width: size.w, height: size.h, stage: stage,
      UI: UI, art: window.art, icon: UI.icon, signal: ac.signal,
      rotated: function () { return surface === 'table' && Deck.rotated; },
      mm: function () { return surface === 'table' ? SCREENS[Deck.screen] : 2; },
      setTimeout: function (fn, ms) { var t = setTimeout(function () { if (!dead) fn(); }, ms); timers.push(t); return t; },
      clearTimeout: function (t) { clearTimeout(t); },
      setInterval: function (fn, ms) { var t = setInterval(function () { if (!dead) fn(); }, ms); intervals.push(t); return t; },
      clearInterval: function (t) { clearInterval(t); },
      raf: function (fn) { var r = requestAnimationFrame(function (ts) { if (!dead) fn(ts); }); rafs.push(r); return r; },
      sleep: function (ms) { return new Promise(function (res) { ctx.setTimeout(res, ms); }); },
      on: function (target, type, fn, o) { target.addEventListener(type, fn, o); listeners.push([target, type, fn, o]); return fn; },
      onDeck: function (ev, fn) { (deckHandlers[ev] = deckHandlers[ev] || []).push(fn); mine.push([ev, fn]); },
      local: function (a, b) { return UI.local(stage, a, b); },
      toast: function (o) { return UI.toast(stage, o); },
      sound: function (n) { UI.sound(n); },
      remount: function () { setTimeout(function () { show(Deck.index, { force: true, keepView: true }); }, 0); },
      alive: function () { return !dead; }
    };
    ctx.__dispose = function () {
      dead = true;
      timers.forEach(clearTimeout); intervals.forEach(clearInterval); rafs.forEach(cancelAnimationFrame);
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      mine.forEach(function (m) { var a = deckHandlers[m[0]]; if (a) { var k = a.indexOf(m[1]); if (k >= 0) a.splice(k, 1); } });
      try { ac.abort(); } catch (e) { /* noop */ }
    };
    return ctx;
  }

  /* -------------------------------------------------------------- modes + layout */
  function defaultMode() {
    var w = window.innerWidth, hgt = window.innerHeight;
    return (w >= 1100 && w > hgt) ? 'compare' : 'new';
  }
  function setMode(m) {
    endQuiz(true);   // quiz marks are measured snapshots: drop them when the layout changes
    Deck.mode = m; Deck.modeExplicit = true;
    applyMode(); layout(); writeHash(); emit('mode', m);
  }
  function applyMode() {
    var m = Deck.mode || 'new';
    if (m === 'curtain' && !els.hasBefore) m = 'new';
    els.root.setAttribute('data-mode', m);
    [].forEach.call(els.modes.children, function (b, k) { b.classList.toggle('is-on', MODES[k] === m); });
    els.modes.children[1].disabled = !els.hasBefore;
  }
  function setRotated(b) {
    endQuiz();   // quiz marks are measured snapshots: drop them when the layout changes
    Deck.rotated = b;
    if (els.surface === 'table') {
      if (b) els.scaler.setAttribute('data-rot', '180'); else els.scaler.removeAttribute('data-rot');
      if (els.beforeImg) els.beforeImg.classList.toggle('is-rot', b);
      var ci = els.curtain && els.curtain.querySelector('img'); if (ci) ci.classList.toggle('is-rot', b);
    }
    els.rot.classList.toggle('is-on', b);
    emit('rotate', b);
  }
  function setScreen(k) {
    endQuiz();   // quiz marks are measured snapshots: drop them when the layout changes
    Deck.screen = k;
    if (els.stage && els.surface === 'table') {
      els.stage.setAttribute('data-screen', k);
      var stg = els.stage;   // open dice cards grow with --mm: re-fit them into the stage
      requestAnimationFrame(function () { [].forEach.call(stg.querySelectorAll('.dcard'), function (c) { c.style.left = ''; c.style.removeProperty('--kis-dx'); UI.keepInStage(c); }); });
    }
    [].forEach.call(els.size.children, function (b, j) { b.classList.toggle('is-on', ['32', '43', '55'][j] === k); });
    emit('screen', k);
  }

  function layout() {
    if (!els.stage) return;
    var mode = els.root.getAttribute('data-mode');
    var vr = els.view.getBoundingClientRect();
    var navW = window.innerWidth < 900 ? 0 : 64;
    var tiny = window.innerWidth <= 500;
    var padX = tiny ? 0 : 16 + navW, padY = tiny ? 0 : 14;
    var capH = mode === 'compare' ? 34 : 0;
    var W = Math.max(100, vr.width - padX * 2), H = Math.max(100, vr.height - padY * 2);
    var sw = els.size0.w, sh = els.size0.h, k, dir = 'row';
    if (mode === 'compare') {
      var gap = 24;
      var kRow = Math.min((W - gap) / 2 / sw, (H - capH) / sh);
      var kCol = Math.min(W / sw, (H - gap - capH * 2) / 2 / sh);
      if (kCol > kRow * 1.08) { k = kCol; dir = 'column'; } else k = kRow;
    } else {
      k = Math.min(W / sw, H / sh);
    }
    k = Math.max(0.05, k);
    var bw = Math.floor(sw * k), bh = Math.floor(sh * k);
    els.panes.style.flexDirection = dir;
    [els.boxA, els.boxB].forEach(function (b) { b.style.width = bw + 'px'; b.style.height = bh + 'px'; });
    els.scaler.style.width = bw + 'px'; els.scaler.style.height = bh + 'px';
    els.stage.style.transform = 'scale(' + k + ')';
    Deck.scale = k;
    els.root.style.setProperty('--k', k);
  }

  /* -------------------------------------------------------------- curtain */
  function bindCurtain(c, grip) {
    function set(e) {
      var r = c.getBoundingClientRect();
      var x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
      Deck.curtainX = x;
      c.style.setProperty('--x', x + '%');
    }
    grip.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      grip.setPointerCapture(e.pointerId);
      grip.classList.add('is-drag');
      function mv(ev) { set(ev); }
      function up() { grip.classList.remove('is-drag'); grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); }
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
    });
  }

  /* -------------------------------------------------------------- 5-second test */
  var quiz = null;
  function startQuiz() {
    if (quiz) { endQuiz(); return; }
    var prevMode = els.root.getAttribute('data-mode');
    els.root.setAttribute('data-mode', 'new'); layout();
    var def = slideAt(Deck.index);
    // a view may carry its own quiz; a TV view without one gets the TV default (nothing to press there)
    var view = def && def.views ? def.views.filter(function (v) { return v.key === Deck.view; })[0] : null;
    var qs = (view && view.quiz) || (def && def.quiz) || [{ q: 'Что нажать?', sel: '[data-main]' }, { q: 'Чей ход?', sel: '[data-turn]' }];
    if (view && !view.quiz && view.surface === 'tv') qs = qs.map(function (q) {
      return q.sel && /data-main/.test(q.sel) && !els.stage.querySelector(q.sel) ? { q: q.q, a: 'Ничего: ТВ только показывает', sel: null } : q;
    });
    var ring = h('div', { class: 'dk-timer' }, h('span', { class: 'dk-timer__n', text: '5' }));
    els.over.appendChild(ring);
    quiz = { prevMode: prevMode, nodes: [ring], timers: [] };
    els.quiz.classList.add('is-on');
    var n = 5;
    quiz.timers.push(setInterval(function () {
      n--; ring.querySelector('.dk-timer__n').textContent = n;
      if (n <= 0) { clearInterval(quiz.timers[0]); ring.remove(); ask(qs); }
    }, 1000));
  }
  function ask(qs) {
    if (!quiz) return;
    var veil = h('div', { class: 'dk-veil' });
    var card = UI.frame({ jewel: true, cls: 'dk-ask' },
      h('div', { class: 'dk-ask__qs' }, qs.map(function (q, i) { return h('div', { class: 'dk-ask__q' }, h('b', { text: String(i + 1) }), h('span', { text: q.q })); })),
      UI.rule({ gold: true }),
      h('div', { class: 'dk-ask__btns' },
        btn('dk-btn--word dk-btn--gold', [UI.icon('eye'), h('span', { text: 'Показать' })], 'Показать ответ', function () { reveal(qs, veil); }),
        btn('dk-btn--word', [UI.icon('cross'), h('span', { text: 'Закрыть' })], 'Закрыть', function () { endQuiz(); })));
    veil.appendChild(card);
    els.over.appendChild(veil);
    quiz.nodes.push(veil);
    UI.sound('turn');
  }
  function reveal(qs, veil) {
    veil.classList.add('is-reveal');
    var vr = els.view.getBoundingClientRect();
    qs.forEach(function (q, i) {
      var nodes = q.sel ? [].slice.call(els.stage.querySelectorAll(q.sel)) : [];
      nodes = nodes.filter(function (n) { var r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).slice(0, 3);
      nodes.forEach(function (n) {
        var r = n.getBoundingClientRect();
        var pad = 10;
        var mk = h('div', { class: 'dk-mark', style: { left: (r.left - vr.left - pad) + 'px', top: (r.top - vr.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' } },
          h('span', { class: 'dk-mark__tag' }, h('b', { text: String(i + 1) }), q.a ? h('span', { text: q.a }) : null));
        els.over.appendChild(mk); quiz.nodes.push(mk);
      });
      if (!nodes.length && q.a) {
        var t = h('div', { class: 'dk-mark-free' }, h('b', { text: String(i + 1) }), h('span', { text: q.a }));
        els.over.appendChild(t); quiz.nodes.push(t);
      }
    });
    var close = btn('dk-btn--word dk-quiz-close', [UI.icon('check'), h('span', { text: 'Готово' })], 'Готово', function () { endQuiz(); });
    els.over.appendChild(close); quiz.nodes.push(close);
  }
  function endQuiz(silent) {
    if (!quiz) return;
    quiz.timers.forEach(clearInterval);
    quiz.nodes.forEach(function (n) { n.remove(); });
    els.quiz.classList.remove('is-on');
    var pm = quiz.prevMode; quiz = null;
    if (!silent) { els.root.setAttribute('data-mode', pm); layout(); }
  }

  /* -------------------------------------------------------------- input */
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  }
  function onKey(e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') { go(Deck.index + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { go(Deck.index - 1); e.preventDefault(); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(Deck.order.length - 1);
    else if (k === '1' || k === '2' || k === '3') setMode(MODES[+k - 1]);
    else if (k === 'f' || k === 'F' || k === 'а' || k === 'А') toggleFull();
    else if ((k === 'r' || k === 'R' || k === 'к' || k === 'К') && els.surface === 'table') setRotated(!Deck.rotated);
    else if (k === '5') startQuiz();
    else if (k === 'Escape') endQuiz();
  }
  function bindSwipe() {
    var sx = 0, sy = 0, st = 0, on = false;
    els.view.addEventListener('pointerdown', function (e) {
      on = false;
      if (e.pointerType === 'mouse') return;
      var t = e.target;
      if (t.closest('.dk-curtain__grip')) return;
      if (t.closest('.stage') && t.closest('button, [data-tap], .ui-tap, .tok, .board, input, textarea, [data-drag]')) return;
      on = true; sx = e.clientX; sy = e.clientY; st = Date.now();
    });
    els.view.addEventListener('pointerup', function (e) {
      if (!on) return; on = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - st < 700) go(Deck.index + (dx < 0 ? 1 : -1));
    });
  }

  /* -------------------------------------------------------------- boot */
  Deck.boot = function () {
    var files = (window.DECK_SLIDES || []).slice();
    Deck.order = files.map(function (f) { var m = /^(\d+)-?(.*)$/.exec(f) || [f, f, f]; return { file: f, id: m[1].padStart(2, '0'), key: m[2] }; });
    Deck.titles = window.DECK_TITLES || {};
    buildShell();
    // show the requested slide right away (as «скоро» if not loaded yet), then fill in
    var m = /^#(\d{1,2})/.exec(location.hash || '');
    var first = m ? Math.max(0, Deck.order.findIndex(function (o) { return o.id === m[1].padStart(2, '0'); })) : 0;
    Deck.index = -1;
    loadAll(files).then(function () {
      Deck.ready = true;
      Deck.index = -1;
      if (m) fromHash(); else show(first);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Deck.boot);
  else Deck.boot();
})();
