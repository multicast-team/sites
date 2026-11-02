/* Slide 11 · Телефон в бою (390×844).  Owner: screens «phone-tv».
   Brief §4.2: hero banner + three icon tabs, map full width, slots 56 px with fans,
   mic 80 px, keyboard left, end turn right, drafted action → 64 px seal bar,
   dice → bottom sheet 5×4.  Demo loop: slot → enemy → seal → dice → damage →
   end turn → enemy attacks (Shield reaction) → my turn again. */
(function () {
  'use strict';

  var ME = 'arcanist';
  var VW = 390, CELL = 48, COLS = 12, ROWS = 9;
  var BW = COLS * CELL, BH = ROWS * CELL;
  var MAP_H = 380;                // map viewport height (y 150 → 530): the board covers it exactly
  var FIT = MAP_H / BH;           // overview zoom (cell ≈ 42 px): no empty bands, cols 1–9 in frame
  var CX0 = 5.5 * CELL;           // overview centre: the fight zone (own token … farthest tinnik)
  /* same positions and «Фазы сторон» order as the table (fight-engine.js POS / ORDER) */
  var POS = { guardian: [4, 4], fury: [4, 5], beacon: [1, 3], arcanist: [1, 5], big: [5, 4], small1: [5, 5], silt: [7, 3], small2: [9, 6] };
  var ORDER = [
    { hero: 'guardian' }, { hero: 'fury' }, { hero: 'beacon' }, { hero: 'arcanist' },
    { enemy: 'tinnik-big', id: 'big' }, { enemy: 'tinnik-silt', id: 'silt' }, { enemy: 'tinnik-small', id: 'small1' }, { enemy: 'tinnik-small', id: 'small2' }
  ];
  var MY_I = 3;

  Deck.register({
    id: '11',
    key: 'phone',
    title: 'Телефон в бою',
    change: 'Герой сверху, карта на весь экран, умения и микрофон под пальцем',
    surface: 'phone',
    before: 'before/24-fight-phone.webp',
    css: true,
    quiz: [
      { q: 'Что нажать?', a: 'Умение «Луч», потом врага', sel: '[data-main]' },
      { q: 'Чей ход?', a: 'Кощей (это я)', sel: '[data-turn]' }
    ],
    mount: mount
  });

  function mount(stage, ctx) {
    var UI = ctx.UI, h = UI.h;
    var hero = UI.HEROES[ME];
    var color = hero.color;
    var S = { hp: hero.hp, ac: hero.ac, crystals: 2, actionUsed: false, draft: null, busy: false, mine: true, shieldUsed: false, tab: 'game', zoomed: false };

    var root = h('div', { class: 'ph', style: { '--hero': color } });
    root.appendChild(h('div', { class: 'ph__bg' }));
    stage.appendChild(root);

    /* ================================================== banner (0–96) */
    var medal = UI.medallion({ hero: ME, hp: S.hp, max: hero.max, size: 72, heart: false, cls: 'ph-ban__medal' });
    var medalBtn = h('button', { class: 'ph-ban__who', type: 'button', 'aria-label': 'Кто говорит' }, medal);
    var hpN = h('b', { text: String(S.hp) });
    var acN = h('b', { text: String(S.ac) });
    var crys = h('span', { class: 'ph-stat ph-stat--crys' });
    function drawCrystals() {
      crys.innerHTML = '';
      for (var i = 0; i < 2; i++) crys.appendChild(h('i', { class: i < S.crystals ? 'is-on' : '' }, UI.icon('crystal')));
    }
    drawCrystals();
    var condList = ['cond-bless'];
    var name = h('div', { class: 'ph-ban__name', text: hero.short });
    var stats = h('div', { class: 'ph-ban__stats' },
      h('span', { class: 'ph-stat ph-stat--hp' }, UI.heartSvg(), hpN),
      h('span', { class: 'ph-stat ph-stat--ac' }, UI.icon('shield-ac'), acN),
      crys);
    var tabs = h('div', { class: 'ph-tabs' });
    var TABS = [
      { key: 'game', label: 'Игра', icon: 'd20' },
      { key: 'gm', label: 'Ведущий', sev: true },
      { key: 'party', label: 'Отряд', icon: 'shield-ac' }
    ];
    var tabEls = {};
    TABS.forEach(function (t) {
      var inner = t.sev ? h('span', { class: 'ph-tab__sev' }) : UI.icon(t.icon);
      if (t.sev) UI.bgArt(inner, 'severin-bust');
      var b = h('button', { class: 'ph-tab', type: 'button', 'aria-label': t.label, title: t.label }, inner, h('i', { class: 'ph-tab__dot' }));
      ctx.on(b, 'click', function () { setTab(t.key); });
      tabEls[t.key] = b; tabs.appendChild(b);
    });
    var banner = h('div', { class: 'ph-ban', 'data-turn': '' }, medalBtn, h('div', { class: 'ph-ban__id' }, name, stats), tabs);
    root.appendChild(banner);
    medal.setState('active');
    medal.setBadges(condList);

    /* ================================================== middle panels (96–676) */
    var mid = h('div', { class: 'ph-mid' });
    root.appendChild(mid);
    var pGame = h('div', { class: 'ph-panel ph-panel--game is-on' });
    var pGm = h('div', { class: 'ph-panel ph-panel--gm' });
    var pParty = h('div', { class: 'ph-panel ph-panel--party' });
    mid.appendChild(pGame); mid.appendChild(pGm); mid.appendChild(pParty);
    var panels = { game: pGame, gm: pGm, party: pParty };

    /* ---- turn strip + round */
    var strip = UI.turnStrip({ dir: 'h', size: 30, big: 44, phase: null, items: ORDER.map(function (o) { return o.hero ? { hero: o.hero } : { enemy: o.enemy }; }), current: MY_I });
    var roundIc = UI.icon('phase-sun');
    var round = h('div', { class: 'ph-round' }, h('span', { class: 'ph-round__ic' }, roundIc), h('b', { text: '1/2' }));
    var goal = h('button', { class: 'ph-goal', type: 'button', 'aria-label': 'Цель боя' }, UI.icon('crown'), h('i', { class: 'ph-goal__arr' }, UI.icon('arrow-right')), UI.icon('flee'));
    UI.longPress(goal, function () { UI.sheet(stage, { icon: 'crown', title: 'Цель', text: UI.FORD.goal + '. Раунд 1 из 2.', y: 300 }); });
    ctx.on(goal, 'click', function () { UI.toast(stage, { icon: 'crown', text: 'Вожак падёт — бегут', y: 176 }); });
    pGame.appendChild(h('div', { class: 'ph-strip' }, strip, round));

    /* ---- map viewport */
    var view = h('div', { class: 'ph-map' });
    var bleed = h('div', { class: 'ph-map__bleed' }); UI.bgArt(bleed, 'map-ford');
    var cam = h('div', { class: 'ph-cam' });
    view.appendChild(bleed); view.appendChild(cam);
    pGame.appendChild(view);
    view.appendChild(goal);
    var toks = UI.FORD.tokens().map(function (t) { var c = Object.assign({}, t); delete c.far; var p = POS[c.id]; if (p) { c.x = p[0]; c.y = p[1]; } return c; });
    var board = UI.board({ map: 'map-ford', cols: COLS, rows: ROWS, cell: CELL, bleed: false, tokens: toks, active: ME,
      onMove: function (id, x, y, feet, left) { if (left <= 0) UI.toast(stage, { icon: 'boot', text: '0', y: 180 }); camTo(FIT, null, null); },
      onTokenTap: function (id) { if (id !== ME && !board.classList.contains('is-targeting')) tokenInfo(id); }
    });
    cam.appendChild(board);
    // dead enemies keep a skull, hp from the shared data
    var camState = { s: FIT, x: 0, y: 0 };
    function camTo(s, cx, cy, instant) {
      if (cx == null) { cx = CX0; cy = BH / 2; }
      var tx = VW / 2 - cx * s, ty = MAP_H / 2 - cy * s;
      var w = BW * s, hh = BH * s;
      tx = w >= VW ? Math.min(0, Math.max(VW - w, tx)) : (VW - w) / 2;
      ty = hh >= MAP_H ? Math.min(0, Math.max(MAP_H - hh, ty)) : (MAP_H - hh) / 2;
      camState = { s: s, x: tx, y: ty, cx: cx, cy: cy };
      cam.classList.toggle('is-instant', !!instant);
      cam.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + s + ')';
      S.zoomed = s > FIT + 0.01;
    }
    camTo(FIT, null, null, true);

    // pinch + double tap zoom («зум двумя пальцами»)
    var pts = {}, pinch = null, lastTap = 0;
    ctx.on(view, 'pointerdown', function (e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: camState.s, cx: camState.cx, cy: camState.cy };
      } else if (!e.target.closest('.tok')) {
        var now = Date.now();
        if (now - lastTap < 320) {
          var p = UI.local(board, e.clientX, e.clientY);
          if (S.zoomed) camTo(FIT, null, null); else camTo(1.25, p.x, p.y);
          lastTap = 0;
        } else lastTap = now;
      }
    });
    ctx.on(view, 'pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (pinch && ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        var s = Math.max(FIT, Math.min(1.6, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / (pinch.d || 1)));
        camTo(s, pinch.cx, pinch.cy, true);
      }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      ctx.on(view, ev, function (e) { delete pts[e.pointerId]; if (Object.keys(pts).length < 2) pinch = null; });
    });

    /* ---- «what now» zone: Severin line OR seal bar (604–676) */
    var zone = h('div', { class: 'ph-zone' });
    pGame.appendChild(zone);
    var sevMini = UI.severin({ size: 48, state: 'speaking', cycle: false });
    var sayTxt = h('span', { class: 'ph-say__t' });
    var say = h('div', { class: 'ph-say' }, sevMini, sayTxt);
    zone.appendChild(say);
    var sayTimer = null;
    function sevSay(text, ms, who) {
      sayTxt.innerHTML = '';
      if (who) sayTxt.appendChild(h('b', { style: { color: UI.heroColor(who) }, text: UI.HEROES[who].short + ': ' }));
      sayTxt.appendChild(document.createTextNode(text));
      say.classList.remove('is-in'); void say.offsetWidth; say.classList.add('is-in', 'is-on');
      sevMini.setState(who ? 'listening' : 'speaking');
      gmSay(text, who);
      if (sayTimer) ctx.clearTimeout(sayTimer);
      sayTimer = ctx.setTimeout(function () { sevMini.setState('idle'); }, ms || 2600);
    }

    // seal bar: one global commit, full width 64 px
    var sealDisk = UI.seal({ small: true, size: 60, main: false, icon: 'target' });
    sealDisk.tabIndex = -1;
    var sealBar = h('div', { class: 'ph-seal', role: 'button', tabindex: '0', 'data-tap': '', 'data-silent': '', 'aria-label': 'Подтвердить', hidden: true },
      h('span', { class: 'ph-seal__ribbon' }), sealDisk, h('span', { class: 'ph-seal__w', text: 'Подтвердить' }), h('span', { class: 'ph-seal__prev' }));
    zone.appendChild(sealBar);
    ctx.on(sealBar, 'click', function () { commit(); });
    ctx.on(sealBar, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(); } });

    /* ---- Severin tab */
    var gmSev = UI.severin({ size: 168, state: 'idle', cycle: true });
    var gmLog = h('div', { class: 'ph-gm__log' });
    pGm.appendChild(h('div', { class: 'ph-gm' },
      h('div', { class: 'ph-gm__art' }),
      h('div', { class: 'ph-gm__sev' }, gmSev),
      h('div', { class: 'ph-gm__name t-title', text: 'Северин Кроу' }),
      UI.rule({ width: 220 }),
      gmLog));
    UI.bgArt(pGm.querySelector('.ph-gm__art'), 'severin-card');
    function gmSay(text, who) {
      var b = h('div', { class: 'ph-bub' + (who ? ' ph-bub--me' : ''), style: who ? { '--hero': UI.heroColor(who) } : null },
        who ? h('span', { class: 'ph-bub__who' }, h('span', { class: 'ph-bub__face' })) : null, h('span', { text: text }));
      if (who) UI.bgArt(b.querySelector('.ph-bub__face'), 'bust-' + who);
      gmLog.appendChild(b);
      while (gmLog.children.length > 3) gmLog.removeChild(gmLog.firstChild);
      if (!who) { gmSev.setState('speaking'); ctx.setTimeout(function () { gmSev.setState('idle'); }, 2400); }
    }

    /* ---- Party tab */
    var partyHeroes = ['arcanist', 'guardian', 'fury', 'beacon'];
    var partyMeds = {};
    var pg = h('div', { class: 'ph-party__grid' });
    partyHeroes.forEach(function (id) {
      var hd = UI.HEROES[id];
      var m = UI.medallion({ hero: id, hp: hd.hp, max: hd.max, size: 92, badges: id === 'arcanist' ? ['cond-bless'] : id === 'fury' ? ['cond-rage'] : null });
      partyMeds[id] = m;
      var card = h('button', { class: 'ph-pc' + (id === ME ? ' is-me' : ''), type: 'button', style: { '--hero': hd.color } }, m,
        h('span', { class: 'ph-pc__n', text: hd.short }),
        h('span', { class: 'ph-pc__ac' }, UI.icon('shield-ac'), h('b', { text: String(hd.ac) })));
      UI.longPress(card, function () { UI.sheet(stage, { art: 'bust-' + id, title: hd.short, text: hd.epithet + '. КД ' + hd.ac + ', хиты ' + hd.hp + '.', y: 360 }); });
      pg.appendChild(card);
    });
    var pe = h('div', { class: 'ph-party__foes' });
    var foeMeds = {};
    [['big', 'tinnik-big'], ['silt', 'tinnik-silt'], ['small1', 'tinnik-small'], ['small2', 'tinnik-small']].forEach(function (f) {
      var ed = UI.ENEMIES[f[1]];
      var m = UI.medallion({ enemy: f[1], hp: ed.hp, max: ed.max, size: 70 });
      if (ed.leader) m.appendChild(h('span', { class: 'ph-crown' }, UI.icon('crown')));
      foeMeds[f[0]] = m;
      pe.appendChild(m);
    });
    pParty.appendChild(h('div', { class: 'ph-party' }, pg,
      h('div', { class: 'ph-party__goal' }, UI.icon('crown'), UI.icon('arrow-right'), UI.icon('flee'), h('b', { text: '1/2' })),
      pe));

    function setTab(k) {
      if (S.tab === k) return;
      S.tab = k;
      Object.keys(panels).forEach(function (p) { panels[p].classList.toggle('is-on', p === k); });
      Object.keys(tabEls).forEach(function (p) { tabEls[p].classList.toggle('is-on', p === k); });
      UI.closeFans(stage);
      UI.sound('open');
    }
    tabEls.game.classList.add('is-on');

    /* ================================================== bottom (676–844) */
    var bottom = h('div', { class: 'ph-bot' });
    root.appendChild(bottom);
    var SHELF = [
      { key: 'ray', art: 'ab-arcanist-frost', label: 'Луч', cost: 'action', target: 'enemy', hit: 5, die: 'd8', n: 1, info: 'Луч холода: к20 +5 против КД, урон 1к8 холодом, цель замедлена.' },
      { key: 'missile', art: 'ab-arcanist-missile', label: 'Стрела', cost: 'slot', lvl: 1, target: 'enemy', auto: true, die: 'd4', n: 3, mod: 3, info: 'Волшебная стрела: три снаряда по 1к4 +1, без промаха. Тратит ячейку.' },
      { key: 'shield', art: 'ab-arcanist-shield', label: 'Щит', cost: 'reaction', lvl: 1, state: 'disabled', reason: 'hourglass', reasonText: 'В ход врага', info: 'Щит: +5 к КД до вашего хода. Реакция, когда по вам попали.' },
      { key: 'spells', art: 'icon-burning-hands', label: 'Чары', info: 'Чары: огонь, жир, гром.', fan: [
        { key: 'hands', art: 'icon-burning-hands', label: 'Огонь', cost: 'slot', lvl: 1, area: true, info: 'Огненные ладони: конус 15 футов, 3к6 огнём.' },
        { key: 'grease', art: 'icon-grease', label: 'Жир', cost: 'slot', lvl: 1, area: true, info: 'Жир: квадрат 10 футов, враги падают.' },
        { key: 'shatter', art: 'icon-shatter', label: 'Гром', cost: 'slot', lvl: 2, state: 'disabled', reason: 'crystal', reasonText: 'Нет ячеек II', info: 'Дребезги: сфера 10 футов, 3к8 звуком. Нужна ячейка II.' }] },
      { key: 'legs', art: 'icon-dash', label: 'Ноги', info: 'Перемещение: рывок, отход, встать. Фишку можно тащить по карте.', fan: UI.LEGS.map(function (l) { return Object.assign({ self: true }, l); }) }
    ];
    var shelf = h('div', { class: 'ph-shelf' });
    var slots = {};
    SHELF.forEach(function (so) {
      var sl = UI.slot(Object.assign({ color: color }, so, {
        onTap: function (se) { pickAbility(so, se); },
        onPick: function (child, ce) { pickAbility(child, ce, sl); }
      }));
      if (so.state) sl.setState(so.state, so.reason);
      slots[so.key] = sl;
      shelf.appendChild(sl);
    });
    slots.ray.classList.add('is-main');
    slots.ray.setAttribute('data-main', '');
    bottom.appendChild(shelf);
    // Fans on a 390 px screen: keep the arc inside the edges (fan items handle their own taps).
    ctx.on(shelf, 'click', function (e) {
      // fan items fire on their own since the integrator fixed UI.slot's click guard
      if (e.target.closest('.fan__item')) return;
      var sl = e.target.closest('.slot');
      if (!sl) return;
      ctx.raf(function () {
        var fan = sl.querySelector(':scope > .fan'); if (!fan) return;
        var xs = [].map.call(fan.querySelectorAll('.fan__item'), function (it) { return parseFloat(it.style.getPropertyValue('--x')) || 0; });
        var cx = UI.center(sl.querySelector('.slot__disk'), stage).x;
        var L = cx + Math.min.apply(null, xs) - 34, R = cx + Math.max.apply(null, xs) + 34;
        var dx = L < 4 ? 4 - L : R > VW - 4 ? VW - 4 - R : 0;
        fan.style.marginLeft = dx.toFixed(1) + 'px';
      });
    });

    var kb = h('button', { class: 'ph-kb', type: 'button', 'aria-label': 'Написать' }, UI.icon('keyboard'));
    var mic = UI.mic({ color: color, size: 92, onChange: function (st) { onMic(st); } });
    var endT = UI.endTurn({ color: color, onTap: function () { endTurn(); } });
    bottom.appendChild(h('div', { class: 'ph-voice' }, kb, mic, endT));

    /* ---- mic: 4 states; listening → Severin answers in the tab and the zone */
    function onMic(st) {
      if (st === 'listening') { gmSev.setState('listening'); sevMini.setState('listening'); }
      if (st === 'thinking') { gmSev.setState('thinking'); sevMini.setState('thinking'); }
      if (st === 'speaking') { sevSay('Лёд ждёт твоего слова, Кощей.', 2600); }
      if (st === 'idle') { gmSev.setState('idle'); }
    }

    /* ---- keyboard sheet «Северину» */
    var kbSheet = null;
    ctx.on(kb, 'click', function () {
      if (kbSheet) { closeKb(); return; }
      var field = h('div', { class: 'ph-kbs__field' }, h('span', { class: 'ph-kbs__ph', text: 'Северину…' }), h('i', { class: 'ph-kbs__caret' }));
      var send = h('button', { class: 'ph-kbs__send', type: 'button', 'aria-label': 'Отправить' }, UI.icon('arrow-right'));
      var claim = h('button', { class: 'ph-kbs__claim', type: 'button' }, UI.icon('scroll'), h('span', { text: 'Заявить' }));
      kbSheet = h('div', { class: 'ph-kbs' }, field, send, claim);
      root.appendChild(kbSheet);
      UI.sound('open');
      send.addEventListener('click', function () { closeKb(); sevSay('Говори вслух — так быстрее.', 2400); });
      claim.addEventListener('click', function () { closeKb(); UI.toast(stage, { icon: 'scroll', text: 'Черновик', y: 560 }); });
    });
    function closeKb() { if (!kbSheet) return; var k = kbSheet; kbSheet = null; k.classList.add('is-out'); ctx.setTimeout(function () { k.remove(); }, 260); }

    /* ---- banner portrait: «кто говорит» */
    var whoPop = null;
    ctx.on(medalBtn, 'click', function () {
      if (whoPop) { whoPop.remove(); whoPop = null; return; }
      whoPop = h('div', { class: 'ph-who' });
      partyHeroes.forEach(function (id) {
        var b = h('button', { class: 'ph-who__b' + (id === ME ? ' is-on' : ''), type: 'button', style: { '--hero': UI.heroColor(id) }, 'aria-label': UI.HEROES[id].short });
        UI.bgArt(b, 'bust-' + id);
        b.addEventListener('click', function () {
          whoPop.remove(); whoPop = null;
          UI.toast(stage, { icon: 'mic', text: UI.HEROES[id].short, y: 130 });
        });
        whoPop.appendChild(b);
      });
      root.appendChild(whoPop);
      UI.sound('open');
    });

    /* ================================================== the turn */
    var ENEMY_IDS = ['big', 'silt', 'small1', 'small2'];
    function liveEnemies() { return ENEMY_IDS.filter(function (id) { var t = board.token(id); return t && !t.dead && !t.gone; }); }

    function clearDraft(keepSlot) {
      board.clearTargets(); board.clearArrows(); board.clearPreview();
      if (S.draft && S.draft.slot && !keepSlot && S.draft.slot.dataset.state === 'selected') S.draft.slot.setState('ready');
      S.draft = null;
      hideSeal();
    }

    function pickAbility(ab, slotEl, parentSlot) {
      if (S.busy || !S.mine) return;
      if (setTab) setTab('game');
      var anchor = parentSlot || slotEl;
      if (S.draft && S.draft.ab.key === ab.key) { clearDraft(); camTo(FIT); return; }  // tap again = cancel
      clearDraft();
      if (ab.cost === 'slot' && S.crystals <= 0) { UI.toastFor(anchor, { icon: 'crystal', text: 'Нет ячеек', tone: 'bad' }); return; }
      slots.ray.classList.remove('is-main'); slots.ray.removeAttribute('data-main');
      anchor.setState('selected');
      S.draft = { ab: ab, slot: anchor, target: null };
      if (ab.target === 'enemy') {
        var ids = liveEnemies();
        camTo(FIT);                       // own token + every target in frame
        board.setTargets(ids, function (id) { pickTarget(id); });
        ids.forEach(function (id) { var t = board.token(id); t.el.setAttribute('data-main', ''); });
        sevSay('Кого?', 1600);
      } else {
        // area / self: drafted at once, the seal appears
        showSeal(ab);
      }
    }

    function pickTarget(id) {
      var ab = S.draft.ab;
      liveEnemies().forEach(function (k) { board.token(k).el.removeAttribute('data-main'); });
      S.draft.target = id;
      board.pick(id);
      board.clearArrows();
      board.arrow(ME, id, { color: color, width: 6 });
      var t = board.token(id);
      var e = UI.ENEMIES[t.enemy];
      var items = ab.auto ? [{ icon: 'target', text: '100%', tone: 'hit' }, { icon: 'd4', text: '3×', tone: 'dmg' }]
        : [{ icon: 'd20', text: UI.fmtMod(ab.hit), tone: 'hit' }, { icon: 'shield-ac', text: e.ac }, { icon: ab.die, tone: 'dmg' }];
      var pv = board.preview(id, { items: items });
      camTo(FIT);
      if (pv) ctx.setTimeout(function () { keepInView(pv); }, 360);
      UI.sound('pick');
      showSeal(ab);
    }

    // the preview badge lives inside the scaled board: nudge it back inside the 390 px frame
    function keepInView(el) {
      if (!el.isConnected) return;
      var r = el.getBoundingClientRect(), v = view.getBoundingClientRect();
      var k = v.width / VW || 1;                 // deck scale of the phone stage
      var dx = 0;
      if (r.right > v.right - 6 * k) dx = (v.right - 6 * k) - r.right;
      if (r.left + dx < v.left + 6 * k) dx = (v.left + 6 * k) - r.left;
      if (dx) { el.style.position = 'relative'; el.style.left = (dx / (k * camState.s)).toFixed(1) + 'px'; }
    }

    function showSeal(ab) {
      var prev = sealBar.querySelector('.ph-seal__prev');
      prev.innerHTML = '';
      var a = h('span', { class: 'ph-seal__ab' }); UI.bgArt(a, ab.art);
      prev.appendChild(a);
      if (S.draft && S.draft.target) {
        var tt = board.token(S.draft.target);
        var b = h('span', { class: 'ph-seal__tg' }); UI.bgArt(b, UI.ENEMIES[tt.enemy].token);
        prev.appendChild(UI.icon('arrow-right', 'ph-seal__arr'));
        prev.appendChild(b);
      }
      sealDisk.setIcon(ab.target === 'enemy' ? 'target' : ab.self ? 'boot' : 'seal');
      sealBar.hidden = false;
      sealBar.classList.remove('is-out'); void sealBar.offsetWidth; sealBar.classList.add('is-in', 'is-main');
      sealBar.setAttribute('data-main', '');
      say.classList.remove('is-on');
    }
    function hideSeal() {
      if (sealBar.hidden) return;
      sealBar.classList.remove('is-main'); sealBar.removeAttribute('data-main');
      sealBar.classList.add('is-out');
      ctx.setTimeout(function () { if (sealBar.classList.contains('is-out')) sealBar.hidden = true; }, 300);
    }

    function commit() {
      if (!S.draft || S.busy) return;
      var ab = S.draft.ab;
      if (ab.target === 'enemy' && !S.draft.target) return;
      S.busy = true;
      sealBar.classList.remove('is-main'); sealBar.removeAttribute('data-main');
      sealDisk.stamp({ hide: false }).then(function () {
        hideSeal();
        if (!ctx.alive()) return;
        resolve(ab, S.draft.target);
      });
      UI.flash(stage, 'rgba(245,213,138,.25)', 320);
    }

    function spend(ab) {
      if (ab.cost === 'slot') { S.crystals = Math.max(0, S.crystals - 1); drawCrystals(); crys.classList.remove('is-bump'); void crys.offsetWidth; crys.classList.add('is-bump'); }
      if (ab.cost === 'action' || ab.cost === 'slot') {
        S.actionUsed = true;
        if (S.draft && S.draft.slot) S.draft.slot.setState('used');
        ['ray', 'missile', 'spells'].forEach(function (k) { if (slots[k].dataset.state !== 'used') slots[k].setState('disabled', 'hourglass'); });
        endT.classList.add('is-main'); endT.setAttribute('data-main', '');
      } else if (S.draft && S.draft.slot) S.draft.slot.setState('ready');
    }

    function resolve(ab, target) {
      if (!target) {
        spend(ab);
        clearDraft(true);
        S.busy = false;
        UI.toast(stage, { icon: ab.self ? 'boot' : 'check', text: ab.label, tone: 'good', y: 400 });
        if (ab.self) { board.speedLeft(ME, ab.key === 'dash' ? 60 : 30); board.showReach(ME); board.showBoot(ME); }
        return;
      }
      var t = board.token(target), e = UI.ENEMIES[t.enemy];
      if (ab.auto) {
        rollSheet({ groups: [{ die: 'd4', n: 3, mod: 3 }], word: 'Урон', onDone: function (v) { damage(ab, target, v + 3, false); } });
        return;
      }
      rollSheet({ die: 'd20', mod: ab.hit, word: 'Бросай', dc: null, onDone: function (v) {
        var total = v + ab.hit, crit = v === 20, hit = crit || (v !== 1 && total >= e.ac);
        showResult(v, ab.hit, total, hit, crit).then(function () {
          if (!hit) {
            board.pop(target, null, 'miss', { size: 40 });
            UI.sound('miss');
            sevSay('Лёд прошёл мимо.', 2200);
            spend(ab); clearDraft(true); S.busy = false;
            return;
          }
          rollSheet({ groups: [{ die: ab.die, n: crit ? 2 : 1, mod: 0 }], word: crit ? 'Крит!' : 'Урон', onDone: function (d) { damage(ab, target, d, crit); } });
        });
      } });
    }

    function damage(ab, target, n, crit) {
      var t = board.token(target);
      board.pop(target, n, crit ? 'crit' : 'dmg', { size: crit ? 64 : 56 });
      UI.sound(crit ? 'crit' : 'hit');
      var hp = Math.max(0, t.hp - n);
      board.setHp(target, hp);
      if (foeMeds[target]) foeMeds[target].setHp(hp);
      spend(ab);
      clearDraft(true);
      if (hp <= 0) {
        ctx.setTimeout(function () {
          board.kill(target);
          if (foeMeds[target]) foeMeds[target].setState('dead');
          UI.sound('flee');
          var i = ORDER.map(function (o) { return o.id; }).indexOf(target);
          if (i >= 0 && strip.items[i]) strip.items[i].classList.add('is-gone');
          if (UI.ENEMIES[t.enemy].leader) {
            sevSay('Матёрый пал! Тинники бегут.', 3200);
            liveEnemies().forEach(function (id, k) { ctx.setTimeout(function () { board.flee(id, 4); }, 300 + k * 220); });
          } else sevSay('Тинник ушёл под лёд.', 2400);
        }, 500);
      } else {
        board.token(target).el.classList.add('is-slowed');
        sevSay('Лёд сковал тинника!', 2400);
      }
      S.busy = false;
    }

    /* ---- big centered result: «17 +5 = 22» */
    function showResult(v, mod, total, hit, crit) {
      var r = h('div', { class: 'ph-res' + (hit ? ' is-hit' : ' is-miss') + (crit ? ' is-crit' : '') },
        h('b', { class: 'ph-res__d', text: String(v) }), h('span', { text: UI.fmtMod(mod) }), h('i', { text: '=' }), h('b', { class: 'ph-res__t', text: String(total) }),
        h('span', { class: 'ph-res__ic' }, UI.icon(hit ? 'target' : 'cross')));
      root.appendChild(r);
      if (crit) UI.flash(stage, 'rgba(255,211,107,.35)', 420);
      return new Promise(function (res) { ctx.setTimeout(function () { r.classList.add('is-out'); ctx.setTimeout(function () { r.remove(); res(); }, 260); }, 1100); });
    }

    /* ---- dice bottom sheet (5×4 tiles, never auto-filled) */
    function rollSheet(o) {
      hideSeal();
      var wrap = h('div', { class: 'ph-dice' }, h('div', { class: 'ph-dice__veil' }));
      var card = UI.diceCard({ die: o.die, mod: o.mod, groups: o.groups, word: o.word, hero: ME, layout: 'phone', mic: true,
        onConfirm: function (v) {
          var sum = Array.isArray(v) ? v.reduce(function (a, b) { return a + b; }, 0) : v;
          wrap.classList.add('is-out');
          ctx.setTimeout(function () { wrap.remove(); o.onDone(sum); }, 300);
        } });
      wrap.appendChild(card);
      root.appendChild(wrap);
      UI.sound('open');
    }

    /* ---- end of turn → the world acts → back to me */
    function endTurn() {
      if (S.busy || !S.mine) return;
      clearDraft();
      UI.closeFans(stage);
      endT.classList.remove('is-main'); endT.removeAttribute('data-main');
      S.mine = false;
      root.classList.add('is-waiting');
      banner.removeAttribute('data-turn');
      medal.setState('dim');
      board.clearReach();
      UI.sound('turn');
      var bigAlive = board.token('big') && !board.token('big').dead;
      var actor = bigAlive ? 'big' : (liveEnemies()[0] || null);
      strip.setCurrent(actor ? ORDER.map(function (x) { return x.id; }).indexOf(actor) : MY_I);
      board.setActive(actor);
      if (!actor) { ctx.setTimeout(newRound, 1400); return; }
      roundIc.parentNode.classList.add('is-world'); UI.setIcon(roundIc, 'phase-skull');
      slots.shield.setState('ready');
      ctx.setTimeout(function () { enemyAttack(actor); }, 900);
    }

    function enemyAttack(actor) {
      var ed = UI.ENEMIES[board.token(actor).enemy];
      board.intent(actor, { icon: 'intent-strike' });
      board.arrow(actor, ME, { enemy: true, width: 6 });
      camTo(FIT);
      sevSay(ed.name + ' бьёт Кощея!', 2600);
      ctx.setTimeout(function () {
        var c = { x: VW / 2, y: 330 };
        UI.rollDie(stage, c.x, c.y, { die: 'd20', value: 11, mod: 4, size: 96, hold: 900 }).then(function () {
          if (!ctx.alive()) return;
          if (S.shieldUsed) return hitMe(actor, 6);
          offerShield(actor);
        });
      }, 1300);
    }

    // reaction card: Щит? ✓ / ✕ — 15 vs КД 12 → hit; with Щит КД 17 → miss
    function offerShield(actor) {
      var ok = h('button', { class: 'ph-react__ok', type: 'button', 'aria-label': 'Да', 'data-main': '' }, UI.icon('check'));
      var no = h('button', { class: 'ph-react__no', type: 'button', 'aria-label': 'Нет' }, UI.icon('cross'));
      var art = h('span', { class: 'ph-react__art' }); UI.bgArt(art, 'ab-arcanist-shield');
      var card = h('div', { class: 'ph-react' },
        h('span', { class: 'ph-react__vs' }, h('b', { text: '15' }), UI.icon('shield-ac'), h('b', { class: 'ph-react__ac', text: '12' })),
        art, h('span', { class: 'ph-react__plus', text: '+5' }), ok, no, h('i', { class: 'ph-react__time' }));
      ok.classList.add('is-main');
      root.appendChild(card);
      slots.shield.classList.add('is-offer');
      UI.sound('open');
      var done = false;
      function close() { card.classList.add('is-out'); slots.shield.classList.remove('is-offer'); ctx.setTimeout(function () { card.remove(); }, 280); }
      ok.addEventListener('click', function () {
        if (done) return; done = true; close();
        S.shieldUsed = true; S.crystals = Math.max(0, S.crystals - 1); drawCrystals();
        slots.shield.setState('used');
        acN.textContent = '17';
        condList.push('shield-ac'); medal.setBadges(condList);
        board.pop(ME, null, 'miss', { size: 40 });
        UI.sound('miss');
        sevSay('Щит вспыхнул — удар соскользнул!', 2600);
        ctx.setTimeout(newRound, 2600);
      });
      no.addEventListener('click', function () { if (done) return; done = true; close(); hitMe(actor, 6); });
      ctx.setTimeout(function () { if (!done) { done = true; close(); hitMe(actor, 6); } }, 6000);
    }

    function hitMe(actor, n) {
      board.pop(ME, n, 'dmg', { size: 56 });
      UI.sound('hit');
      S.hp = Math.max(1, S.hp - n);
      hpN.textContent = S.hp; medal.setHp(S.hp); board.setHp(ME, S.hp); partyMeds[ME].setHp(S.hp);
      banner.classList.remove('is-hurt'); void banner.offsetWidth; banner.classList.add('is-hurt');
      sevSay('Тина хлещет по плечу.', 2400);
      ctx.setTimeout(newRound, 2600);
    }

    function newRound() {
      board.clearIntent(); board.clearArrows();
      S.mine = true; S.actionUsed = false;
      root.classList.remove('is-waiting');
      banner.setAttribute('data-turn', '');
      medal.setState('active');
      strip.setCurrent(MY_I);
      board.setActive(ME);
      board.speedLeft(ME, 30);
      roundIc.parentNode.classList.remove('is-world'); UI.setIcon(roundIc, 'phase-sun');
      round.querySelector('b').textContent = '2/2';
      ['ray', 'missile', 'spells', 'legs'].forEach(function (k) { slots[k].setState('ready'); });
      slots.shield.setState(S.shieldUsed ? 'used' : 'disabled', 'hourglass');
      slots.ray.classList.add('is-main'); slots.ray.setAttribute('data-main', '');
      UI.sound('turn');
      UI.flash(stage, 'color-mix(in srgb, ' + color + ' 30%, transparent)', 420);
      sevSay('Кощей, снова твой ход.', 2600);
    }

    function tokenInfo(id) {
      var t = board.token(id); if (!t || !t.enemy) return;
      var e = UI.ENEMIES[t.enemy];
      UI.sheet(stage, { art: e.token, title: e.name, text: 'КД ' + e.ac + ', хиты ' + t.hp + ' из ' + t.max + (e.leader ? '. Вожак: падёт — остальные бегут.' : '.'), y: 360 });
    }

    /* opening line */
    ctx.setTimeout(function () { sevSay('Кощей, твой ход.', 2800); }, 450);
  }
})();
