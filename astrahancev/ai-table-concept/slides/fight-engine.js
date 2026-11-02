/* =====================================================================
   AI-стол · fight state machine (slides 07–10).  Owner: screens «fight».

   window.FightEngine.mount(stage, ctx, { start }) → cleanup
     start: 'turn'    — Никита's turn, nothing chosen (slide 07)
            'confirm' — Атака → Матёрый drafted, seal pulsing in both nodes (09)
            'roll'    — seal already stamped, dice card out of Никита's seat (08)
            'enemy'   — heroes done, world phase starts (10)

   One machine for all four slides:
     heroes phase: seat i lit → slot → targets (gold rings) → target → arrow + preview
                   → seal in both nodes → stamp → dice card from the seat → tile → ✓
                   → hit flash + number → end turn (hourglass) → next seat …
     world phase:  intents + red arrows → per enemy: world d20 in both nodes → number
                   at the hero (rotated to its owner) · Кощей gets a reaction card (Щит)
   Extras: drag own token (reach in hero colour + boot), long-press slot/token/Severin
   (sheet facing the presser), fans (Старец, Кощей), magic missiles, area spells that
   follow the finger, 8 s idle → ghost hand.
   ===================================================================== */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h;

  var ORDER = ['nearLeft', 'nearRight', 'farLeft', 'farRight'];
  /* positions on the painted ford (12×9): heroes on the stepping stones / left bank,
     tinniks on the stones and in the water.  Никита + Настасья start in melee reach. */
  var POS = { guardian: [4, 4], fury: [4, 5], beacon: [1, 3], arcanist: [1, 5], big: [5, 4], small1: [5, 5], silt: [7, 3], small2: [9, 6] };
  var ENEMY_IDS = ['big', 'silt', 'small1', 'small2'];
  var MELEE = { 'guardian:attack': 1, 'fury:attack': 1, 'shadow:attack': 1, 'beacon:cure': 1 };
  var ONCE = { 'guardian:second-wind': 1, 'guardian:surge': 1 };
  /* behaviour not carried by UI.HEROES */
  var EXTRA = {
    'guardian:second-wind': { kind: 'selfheal', die: 'd10', n: 1, mod: 1 },
    'guardian:surge': { kind: 'surge' },
    'fury:rage': { kind: 'rage' },
    'fury:reckless': { kind: 'adv' },
    'shadow:aim': { kind: 'adv' },
    'shadow:cunning-dash': { kind: 'dash' },
    'shadow:cunning-disengage': { kind: 'disengage' },
    'dash': { kind: 'dash' },
    'disengage': { kind: 'disengage' },
    'stand': { kind: 'off', reason: 'lock', text: 'Вы на ногах' },
    'beacon:cure': { kind: 'heal', die: 'd8', n: 1, mod: 3 },
    'beacon:word': { kind: 'heal', die: 'd4', n: 1, mod: 3 },
    'beacon:spare': { kind: 'off', reason: 'lock', text: 'Никто не при смерти' },
    'beacon:bless': { kind: 'bless' },
    'beacon:bolt': { kind: 'attack', hit: 5, die: 'd6', n: 4, mod: 0 },
    'beacon:channel': { kind: 'off', reason: 'lock', text: 'Нежити нет' },
    'beacon:preserve': { kind: 'off', reason: 'lock', text: 'Раны лёгкие' },
    'arcanist:missile': { kind: 'missiles', n: 3, die: 'd4', mod: 1 },
    'arcanist:shield': { kind: 'off', reason: 'lock', text: 'Только в ответ' },
    'arcanist:hands': { kind: 'area', shape: 'cone', len: 3, die: 'd6', n: 3, mod: 0 },
    'arcanist:grease': { kind: 'area', shape: 'square', size: 2 },
    'arcanist:shatter': { kind: 'area', shape: 'circle', r: 2, die: 'd8', n: 3, mod: 0 },
    'voice:inspire': { kind: 'bless' },
    'voice:word': { kind: 'heal', die: 'd4', n: 1, mod: 3 }
  };
  var SEAL_ICON = { attack: 'swords', save: 'target', heal: 'heart', selfheal: 'heart', missiles: 'target', area: 'target', dash: 'boot', disengage: 'boot', rage: 'cond-rage', bless: 'cond-bless', adv: 'adv', surge: 'cost-action' };

  /* world turn: round 1 is scripted (shows hit, miss and the Shield reaction), later rounds roll honestly */
  var PLAN1 = [
    { id: 'big', target: 'guardian', intent: 'intent-strike', roll: 16, mod: 4, dmg: 7 },
    { id: 'silt', target: 'arcanist', intent: 'intent-shot', roll: 12, mod: 3, dmg: 5 },
    { id: 'small1', target: 'fury', intent: 'intent-strike', roll: 5, mod: 3, dmg: 4 },
    { id: 'small2', target: 'beacon', intent: 'intent-strike', move: [2, 3], roll: 15, mod: 3, dmg: 3 }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function parseDice(s) {
    var m = /(\d+)d(\d+)([+-]\d+)?/.exec(s || '');
    return m ? { n: +m[1], die: 'd' + m[2], mod: m[3] ? +m[3] : 0 } : { n: 1, die: 'd6', mod: 0 };
  }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function cheb(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }

  function mount(stage, ctx, o) {
    o = o || {};
    var start = o.start || 'turn';
    stage.classList.add('ft');
    UI.ensureDefs();
    [['--ft-surface', 'table-surface'], ['--ft-leather', 'texture-leather'], ['--ft-parch', 'texture-parchment']].forEach(function (v) {
      var u = UI.art(v[1]); if (u) stage.style.setProperty(v[0], 'url("' + new URL(u, document.baseURI).href + '")');   // absolute: a url() in a custom property resolves against fight.css
    });

    /* ------------------------------------------------------------ layout */
    var L = UI.tableLayout(stage, {});
    var nodes = L.nodes();             // [near, far]
    var S = { round: 1, turn: 0, phase: 'heroes', mode: 'idle', draft: null, pair: null, mainEl: null, over: false, log: [] };
    var seats = {}, byHero = {};

    ORDER.forEach(function (pos, i) {
      var hid = UI.PARTY4[pos], hd = UI.HEROES[hid];
      var rec = { pos: pos, i: i, hero: hid, hd: hd, far: pos.indexOf('far') === 0, hp: hd.hp, max: hd.max, ac: hd.ac,
        used: {}, usedKeys: {}, spent: {}, flags: {}, badges: [], shelf: clone(hd.shelf) };
      rec.inner = (/Left$/.test(pos) !== rec.far) ? 'right' : 'left';     // side toward the node, in the seat's own frame
      rec.seat = L.seat(pos, {
        hero: hid, slots: rec.shelf, active: false,
        onSlot: function (so, el) { onSlot(rec, so, el); },
        onEndTurn: function () { endTurn(rec); }
      });
      rec.box = rec.seat.parentNode;
      // taps on a resting seat: explain instead of acting (mic and long-press still work)
      ctx.on(rec.seat, 'click', function (e) {
        var t = e.target.closest('.slot, .endturn');
        if (t && isCurrent(rec) && t.classList.contains('fan__item')) { fanPick(rec, t, e); return; }
        if (!t || isCurrent(rec)) return;
        e.stopImmediatePropagation(); e.preventDefault();
        if (t.__lp && Date.now() - t.__lp < 700) return;
        UI.sound('error');
        t.classList.remove('is-nope'); void t.offsetWidth; t.classList.add('is-nope');
        UI.toastFor(t, { icon: 'hourglass', text: S.phase === 'world' ? 'Ход врага' : 'Ждите хода' });
      }, true);
      seats[pos] = rec; byHero[hid] = rec;
    });

    // board on the full-width centre
    var tokens = UI.FORD.tokens().map(function (t) { var p = POS[t.id]; if (p) { t.x = p[0]; t.y = p[1]; } return t; });
    var board = UI.board({
      map: 'map-ford', tokens: tokens, difficult: UI.FORD.water,
      onMove: function (id, x, y, feet, left) {
        var rec = byHero[id]; if (!rec) return;
        board.showBoot(id);
        redrawDraft();
        logLine(rec.hd.short + ' идёт: ' + feet + ' фт');
      },
      onTokenTap: function (id) { if (S.mode === 'aiming') return; },
      onCellTap: function (x, y) {
        if (S.marking) { toggleMark(x, y); return; }
        if (S.mode === 'idle' && board.querySelector('.reach-cell')) { board.clearReach(); ensureBoot(); }
      }
    });
    board.classList.add('ft-board');
    L.center.appendChild(board);
    var cfx = UI.fxLayer(L.center);
    ctx.on(board, 'pointerup', function () { ctx.setTimeout(ensureBoot, 40); });
    ENEMY_IDS.forEach(function (id) {
      var t = board.token(id); t.ac = UI.ENEMIES[t.enemy].ac;
      if (/^small/.test(id)) t.el.classList.add('ft-small');
    });
    // long-press any token: who is it (sheet faces that token's owner)
    Object.keys(board.tokens).forEach(function (id) {
      var t = board.tokens[id];
      UI.longPress(t.el, function () {
        var en = t.enemy && UI.ENEMIES[t.enemy], hr = t.hero && UI.HEROES[t.hero];
        var c = board.tokenCenter(id), b = UI.center(board, stage), bx = b.x - board.offsetWidth / 2, by = b.y - board.offsetHeight / 2;
        UI.sheet(stage, { art: en ? en.token : 'bust-' + t.hero, title: en ? en.name : hr.short,
          text: 'Хиты ' + t.hp + ' из ' + t.max + ' · КД ' + (en ? en.ac : hr.ac) + (en && en.leader ? '. Вожак: падёт — остальные бегут.' : ''),
          x: bx + c.x, y: by + c.y + (t.far ? 150 : -150), rot: t.far ? 180 : 0 });
      });
    });

    // left end: queue + phase + round
    var stripItems = ORDER.map(function (p) { return { hero: UI.PARTY4[p] }; })
      .concat(ENEMY_IDS.map(function (id) { return { enemy: board.token(id).enemy }; }));
    var strip = UI.turnStrip({ items: stripItems, dir: 'v', size: 50, big: 84, phase: 'heroes', round: '1/2' });
    strip.classList.add('ft-strip');
    L.endL.appendChild(strip);

    // right end: goal emblem + service icons
    var goal = h('button', { class: 'ft-goal', type: 'button', 'aria-label': 'Цель боя' },
      h('span', { class: 'ft-goal__lead' }, UI.medallion({ enemy: 'tinnik-big', size: 92 }), h('span', { class: 'ft-goal__crown' }, UI.icon('crown'))),
      h('span', { class: 'ft-goal__arrow' }, UI.icon('arrow-right')),
      h('span', { class: 'ft-goal__flee' }, UI.icon('flee')));
    goal.addEventListener('click', function () { UI.sheet(stage, { icon: 'crown', title: 'Цель', text: UI.FORD.goal + '. Раунд ' + Math.min(S.round, 2) + ' из 2.', x: 1560, y: 540 }); });
    var svc = h('div', { class: 'ft-svc' });
    [['scroll', 'Журнал'], ['flag', 'Пометки'], ['help', 'Как играть'], ['gear', 'Настройки']].forEach(function (s) {
      var b = h('button', { class: 'ft-svc__b', type: 'button', 'aria-label': s[1] }, UI.icon(s[0]));
      b.addEventListener('click', function () { svcTap(s[0], b); });
      svc.appendChild(b);
    });
    L.endR.appendChild(goal);
    L.endR.appendChild(svc);

    // Severin: tap cycles the demo states (foundation), long-press → his last line
    nodes.forEach(function (n) {
      UI.longPress(n.severin, function () {
        UI.sheetFor(n.severin, { art: 'severin-bust', title: 'Северин', text: S.phase === 'world'
          ? 'Тинники бьют первыми, кто ближе к воде. Держите строй.'
          : 'Матёрый ведёт стаю. Свалите его, и мелочь уйдёт в ил.' });
      });
    });

    /* fan items: UI.slot's own click guard swallows taps on a fan child, so the seat handles them */
    function fanPick(rec, item, e) {
      e.stopImmediatePropagation(); e.preventDefault();
      if (item.__lp && Date.now() - item.__lp < 700) return;
      var parent = item.parentNode && item.parentNode.parentNode;
      var k = rec.seat.slots.indexOf(parent); if (k < 0) return;
      var so = (rec.shelf[k].fan || []).filter(function (c) { return c.key === item.dataset.key; })[0];
      if (!so) return;
      if (item.dataset.state === 'disabled') {
        UI.sound('error');
        item.classList.remove('is-nope'); void item.offsetWidth; item.classList.add('is-nope');
        UI.toastFor(item, { icon: so.reason || 'lock', text: so.reasonText || 'Недоступно' });
        return;
      }
      UI.closeFans(stage);
      onSlot(rec, so, parent);
    }

    /* ------------------------------------------------------------ helpers */
    function isCurrent(rec) { return S.phase === 'heroes' && !S.over && seats[ORDER[S.turn]] === rec; }
    function cur() { return seats[ORDER[S.turn]]; }
    function alive(id) { var t = board.token(id); return t && !t.dead && !t.gone; }
    function isEnemy(id) { return ENEMY_IDS.indexOf(id) >= 0; }
    function guard(p) { return p.then(function (v) { return ctx.alive() ? v : new Promise(function () {}); }); }
    function wait(ms) { return ctx.sleep(ms); }
    function logLine(s) { S.log.push(s); if (S.log.length > 6) S.log.shift(); }
    function ensureBoot() {
      var rec = cur();
      if (S.phase !== 'heroes' || S.mode !== 'idle' || S.over || !rec || board.querySelector('.boot')) return;
      board.showBoot(rec.hero);
    }

    /* arrow hero → target; for neighbours an arc over the two tokens (a straight one would be 6 px long) */
    var arrowLayer = board.querySelector('.board__arrows');
    function drawArrow(fromId, toId, o2) {
      var a = board.tokenCenter(fromId), b = board.tokenCenter(toId); if (!a || !b) return null;
      if (cheb(board.token(fromId), board.token(toId)) > 1) return board.arrow(fromId, toId, o2);
      var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      var nx = uy, ny = -ux;
      if (ny > 0.01 || (Math.abs(ny) < 0.01 && nx < 0)) { nx = -nx; ny = -ny; }     // arc always over the top
      var off = 30;
      var A = { x: a.x + nx * off, y: a.y + ny * off }, B = { x: b.x + nx * off, y: b.y + ny * off };
      var bend = (nx * -uy + ny * ux) > 0 ? 0.75 : -0.75;                          // control point toward n
      var g = UI.arrow(arrowLayer, A, B, Object.assign({ gap: 4, startGap: 2 }, o2 || {}, { bend: bend }));
      var tt = board.token(toId); if (tt) tt.el.classList.add('ft-melee');
      return g;
    }

    function setMain(el) {
      if (S.mainEl) { S.mainEl.removeAttribute('data-main'); S.mainEl.classList.remove('ft-main', 'ft-nudge'); }
      S.mainEl = el || null;
      if (el) { el.setAttribute('data-main', ''); el.classList.add('ft-main'); }
    }

    function topSlotOf(rec, so) {
      var hit = null;
      rec.seat.slots.forEach(function (el, k) {
        var top = rec.shelf[k];
        if (top === so || (top.fan && top.fan.indexOf(so) >= 0)) hit = { el: el, top: top };
      });
      return hit;
    }
    function kindOf(rec, so) {
      var ex = EXTRA[rec.hero + ':' + so.key] || EXTRA[so.key];
      if (ex) return ex;
      if (so.target === 'enemy') return so.save ? { kind: 'save' } : { kind: 'attack' };
      if (so.target === 'ally') return { kind: 'heal', die: 'd4', n: 1, mod: 3 };
      return { kind: 'buff' };
    }
    function resOf(so) {
      if (so.cost === 'bonus') return 'bonus';
      if (so.cost === 'action' || so.cost === 'cantrip' || so.cost === 'slot') return 'action';
      return null;
    }
    function avail(rec, so) {
      if (so.fan) {
        var any = so.fan.some(function (c) { return avail(rec, c).state === 'ready'; });
        return any ? { state: 'ready' } : { state: 'disabled', reason: 'hourglass', text: 'Всё потрачено' };
      }
      var k = kindOf(rec, so);
      if (k.kind === 'off') return { state: 'disabled', reason: k.reason || 'lock', text: k.text };
      if (ONCE[rec.hero + ':' + so.key] && rec.spent[so.key]) return { state: 'disabled', reason: 'hourglass', text: 'Раз до отдыха' };
      var r = resOf(so);
      if (r && rec.used[r]) return { state: 'disabled', reason: 'hourglass', text: r === 'action' ? 'Действие потрачено' : 'Бонус потрачен' };
      return { state: 'ready' };
    }

    /* seat visuals: states + ≤3 words on the lit seat, none on resting seats (brief rule 2) */
    function refreshSeat(rec) {
      var active = isCurrent(rec);
      var selTop = S.draft && S.draft.rec === rec ? topSlotOf(rec, S.draft.so) : null;
      rec.seat.slots.forEach(function (el, k) {
        var so = rec.shelf[k];
        if (so.fan) so.fan.forEach(function (c) { var a = avail(rec, c); c.state = a.state; c.reason = a.reason; c.reasonText = a.text; });
        if (!active) { el.setState('ready'); return; }
        if (selTop && selTop.el === el) { el.setState('selected'); return; }
        if (!so.fan && rec.usedKeys[so.key]) { el.setState('used'); return; }
        var a = avail(rec, so);
        el.opts.reasonText = a.text;
        el.setState(a.state, a.reason);
      });
      refreshLabels(rec);
    }
    function refreshLabels(rec) {
      var active = isCurrent(rec) && !rec.seat.classList.contains('ft-rolling');
      var etLab = rec.seat.endTurnEl && rec.seat.endTurnEl.querySelector('.slot__label');
      var budget = 3, show = [];
      if (active && etLab) { show.push(etLab); budget--; }      // the hourglass is not universal: «Конец» always on the lit seat
      rec.seat.slots.forEach(function (el) {
        var st = el.dataset.state;
        if (active && budget > 0 && (st === 'ready' || st === 'selected')) { show.push(el); budget--; }
      });
      rec.seat.slots.forEach(function (el) { el.classList.toggle('ft-nolab', show.indexOf(el) < 0); });
      if (etLab) etLab.classList.toggle('ft-hide', show.indexOf(etLab) < 0);
    }
    function refreshAll() { ORDER.forEach(function (p) { refreshSeat(seats[p]); }); }

    function updateMain() {
      if (S.over) return;
      if (S.phase !== 'heroes') { setMain(null); return; }
      var rec = cur();
      if (S.mode === 'idle') {
        var first = null;
        if (!rec.used.action) rec.seat.slots.forEach(function (el, k) {
          var so = rec.shelf[k];
          if (!first && el.dataset.state === 'ready' && (so.target || so.fan)) first = el;
        });
        setMain(first || rec.seat.endTurnEl);
      }
      refreshLabels(rec);
    }

    function badge(rec, name, on) {
      var i = rec.badges.indexOf(name);
      if (on && i < 0) rec.badges.push(name);
      if (!on && i >= 0) rec.badges.splice(i, 1);
      rec.seat.medal.setBadges(rec.badges);
    }

    /* ------------------------------------------------------------ juice */
    function burst(id, color) {
      var c = board.tokenCenter(id); if (!c) return;
      var b = h('div', { class: 'ft-burst', style: { left: c.x + 'px', top: c.y + 'px', '--c': color || 'var(--dmg)' } });
      board.fx.appendChild(b); ctx.setTimeout(function () { b.remove(); }, 650);
      UI.spark(board.fx, c.x, c.y, color || 'var(--dmg)', 12);
    }
    function hurtSeat(rec, color) {
      rec.seat.classList.remove('ft-hurt', 'ft-healed'); void rec.seat.offsetWidth;
      rec.seat.classList.add(color === 'heal' ? 'ft-healed' : 'ft-hurt');
      ctx.setTimeout(function () { rec.seat.classList.remove('ft-hurt', 'ft-healed'); }, 700);
    }
    function baton(rec) {
      var m = UI.medallion({ hero: rec.hero, size: 190 });
      var b = h('div', { class: 'ft-baton' + (rec.far ? ' is-far' : ''), style: { '--hero': rec.hd.color } }, h('i', { class: 'ft-baton__rays' }), m);
      cfx.appendChild(b); ctx.setTimeout(function () { b.remove(); }, 1300);
    }
    function phaseFlash(world) {
      var b = h('div', { class: 'ft-phase' + (world ? ' is-world' : '') }, h('i', { class: 'ft-phase__ring' }), UI.icon(world ? 'phase-skull' : 'phase-sun'));
      cfx.appendChild(b); ctx.setTimeout(function () { b.remove(); }, 1400);
    }
    function worldRoll(v, mod, die, hit) {
      nodes.forEach(function (n) { n.classList.add('ft-world'); });
      var ro = { die: die || 'd20', value: v, mod: mod, size: 160, hold: 1000 };
      var p = UI.rollDie(nodes[0], 140, 88, ro);
      var en = UI.sound.enabled; UI.sound.enabled = false;
      UI.rollDie(nodes[1], 140, 88, ro);
      UI.sound.enabled = en;
      var wraps = nodes.map(function (n) { var all = n.querySelectorAll('.fx-roll'); return all[all.length - 1]; });
      wraps.forEach(function (w) { if (w && hit != null) w.classList.add(hit ? 'ft-hit' : 'ft-miss'); });
      ctx.setTimeout(function () {
        if (hit === false) return;
        wraps.forEach(function (w) { if (w && w.isConnected) UI.spark(w.parentNode, parseFloat(w.style.left), parseFloat(w.style.top), 'var(--gold-hi)', 14); });
      }, UI.reduced() ? 60 : 880);
      return guard(p).then(function () { nodes.forEach(function (n) { n.classList.remove('ft-world'); }); return v; });
    }
    function sev(st) { nodes.forEach(function (n) { n.severin.setState(st); }); }

    /* ------------------------------------------------------------ hero turn */
    function startTurn(i) {
      S.phase = 'heroes'; S.turn = i; S.mode = 'idle';
      var rec = cur();
      rec.used = {}; rec.usedKeys = {}; rec.flags.shield = false;
      if (rec.flags.adv) badge(rec, 'adv', true);
      board.speedLeft(rec.hero, 30);
      ORDER.forEach(function (p) { seats[p].seat.setActive(p === rec.pos); });
      board.setActive(rec.hero);
      board.clearReach();
      strip.setPhase('heroes', Math.min(S.round, 2) + '/2');
      strip.setCurrent(i);
      board.showBoot(rec.hero);
      refreshAll();
      updateMain();
      if (!o.quiet) { baton(rec); UI.sound('turn'); }
      o.quiet = false;
    }

    function endTurn(rec) {
      if (!isCurrent(rec) || S.mode === 'resolving' || S.mode === 'rolling') return;
      cancelDraft();
      rec.usedKeys = {};
      board.clearReach();
      if (S.turn + 1 < ORDER.length) {
        startTurn(S.turn + 1);
        refreshSeat(rec);
      } else {
        refreshSeat(rec);
        worldPhase();
      }
    }

    /* ------------------------------------------------------------ choosing */
    function onSlot(rec, so, el) {
      if (!isCurrent(rec)) return;
      if (S.mode === 'resolving' || S.mode === 'rolling') { UI.sound('error'); return; }
      board.clearReach(); ensureBoot();
      if (S.draft && S.draft.so === so) { cancelDraft(); refreshSeat(rec); updateMain(); return; }
      cancelDraft();
      var k = kindOf(rec, so);
      var a = avail(rec, so);
      if (a.state !== 'ready') { UI.sound('error'); UI.toastFor(el, { icon: a.reason || 'lock', text: a.text || 'Недоступно' }); return; }
      var top = topSlotOf(rec, so);
      S.draft = { rec: rec, so: so, k: k, top: top, targets: [], missiles: {}, point: null };
      if (top && top.top !== so) { top.el.setArt(so.art); top.el.setLabel(so.label); }
      refreshSeat(rec);
      if (k.kind === 'attack' || k.kind === 'save' || k.kind === 'heal' || k.kind === 'missiles') startTargeting();
      else if (k.kind === 'area') startAim();
      else { S.draft.targets = [rec.hero]; S.mode = 'drafted'; showSeal(); }
      refreshLabels(rec);
    }

    function validTargets(d) {
      var rec = d.rec, me = board.token(rec.hero);
      var pool = d.k.kind === 'heal' ? ORDER.map(function (p) { return seats[p].hero; }) : ENEMY_IDS.filter(alive);
      if (MELEE[rec.hero + ':' + d.so.key]) pool = pool.filter(function (id) { return id === rec.hero || cheb(board.token(id), me) <= 1; });
      return pool;
    }

    function startTargeting() {
      var d = S.draft, rec = d.rec;
      var ids = validTargets(d);
      if (!ids.length) {
        UI.sound('error');
        UI.toastFor(d.top.el, { icon: 'boot', text: 'Подойдите ближе' });
        cancelDraft(); refreshSeat(rec); updateMain();
        board.showReach(rec.hero); board.showBoot(rec.hero);
        return;
      }
      S.mode = 'targeting';
      board.setTargets(ids, function (id) { pickTarget(id); });
      if (d.k.kind !== 'heal') board.classList.add('ft-hunt');
      setMain(board.token(ids[0]).el);
    }

    function previewFor(d, id) {
      var k = d.k, so = d.so, items;
      if (k.kind === 'attack') {
        var dm = k.die ? k : parseDice(so.dmg);
        items = [{ icon: dm.die, text: dm.mod ? UI.fmtMod(dm.mod + (d.rec.flags.rage ? 2 : 0)) : (dm.n > 1 ? '×' + dm.n : null), tone: 'dmg' },
          { icon: 'shield-ac', text: board.token(id).ac }, { icon: d.rec.flags.adv ? 'adv' : 'd20', text: UI.fmtMod(k.hit || so.hit || 0), tone: 'hit' }];
      } else if (k.kind === 'save') {
        var ds = parseDice(so.dmg);
        items = [{ icon: ds.die, text: null, tone: 'dmg' }, { icon: 'dc-shield', text: 13 }];
      } else if (k.kind === 'heal') {
        items = [{ icon: 'heart', text: null, tone: 'heal' }, { icon: k.die, text: UI.fmtMod(k.mod), tone: 'heal' }];
      }
      var b = board.preview(id, { items: items });
      if (b) dieFaces(b);
      if (b && d.rec.far) b.classList.add('ft-far');
      return b;
    }

    /* a bare die glyph means nothing to a newcomer: write its face count inside it («8» in the d8) */
    function dieFaces(b) {
      [].forEach.call(b.querySelectorAll('.preview__it'), function (it) {
        var use = it.querySelector('use'); if (!use) return;
        var m = /#i-d(\d+)$/.exec(use.getAttribute('href') || ''); if (!m) return;
        var ic = it.querySelector('.ic');
        var die = UI.die('d' + m[1], { size: 50, value: m[1] }); die.classList.add('ft-die');
        ic.parentNode.replaceChild(die, ic);
      });
    }

    function pickTarget(id, opt) {
      opt = opt || {};
      var d = S.draft; if (!d) return;
      var col = d.rec.hd.color;
      board.clearReach();
      UI.sound('pick');
      if (d.k.kind === 'missiles') {
        var total = Object.keys(d.missiles).reduce(function (s, k) { return s + d.missiles[k]; }, 0);
        if (total >= d.k.n) { d.missiles = {}; board.clearPreview(); hideSeal(); S.mode = 'targeting'; }
        d.missiles[id] = (d.missiles[id] || 0) + 1;
        board.clearArrows();
        [].forEach.call(board.querySelectorAll('.ft-melee'), function (e) { e.classList.remove('ft-melee'); });
        Object.keys(d.missiles).forEach(function (tid) {
          drawArrow(d.rec.hero, tid, { color: col, width: 8, bend: 0.28 });
          var dots = []; for (var i = 0; i < d.missiles[tid]; i++) dots.push({ icon: 'dot', tone: 'hit' });
          var b = board.preview(tid, { items: dots }); if (b && d.rec.far) b.classList.add('ft-far');
        });
        d.targets = Object.keys(d.missiles);
        var c = board.tokenCenter(id); UI.spark(board.fx, c.x, c.y, col, 8);
        total = Object.keys(d.missiles).reduce(function (s, k) { return s + d.missiles[k]; }, 0);
        if (total >= d.k.n) { S.mode = 'drafted'; if (!opt.noSeal) showSeal(); }
        return;
      }
      d.targets = [id];
      board.pick(id);
      board.clearArrows(); board.clearPreview();
      [].forEach.call(board.querySelectorAll('.ft-melee'), function (e) { e.classList.remove('ft-melee'); });
      if (id !== d.rec.hero) drawArrow(d.rec.hero, id, { color: d.k.kind === 'heal' ? 'var(--heal)' : col, width: 9 });
      previewFor(d, id);
      var cc = board.tokenCenter(id); UI.spark(board.fx, cc.x, cc.y, 'var(--gold-hi)', 8);
      S.mode = 'drafted';
      if (!opt.noSeal) showSeal();
    }

    function redrawDraft() {
      var d = S.draft; if (!d || !d.targets.length || d.k.kind === 'area') return;
      board.clearArrows();
      d.targets.forEach(function (id) { if (id !== d.rec.hero) drawArrow(d.rec.hero, id, { color: d.k.kind === 'heal' ? 'var(--heal)' : d.rec.hd.color, width: d.k.kind === 'missiles' ? 8 : 9 }); });
    }

    /* area spells: the template follows the finger, tap locks it */
    var aoe = null;
    function startAim() {
      var d = S.draft;
      S.mode = 'aiming';
      board.classList.add('is-targeting', 'ft-aiming');
      aoe = UI.s('svg', { class: 'ft-aoe', viewBox: '0 0 960 720', width: 960, height: 720, style: '--hero:' + d.rec.hd.color });
      aoe.appendChild(UI.s('path', { class: 'ft-aoe__shape' }));
      board.insertBefore(aoe, board.querySelector('.board__tokens'));
      var lead = board.tokenCenter('big') || board.cellCenter(8, 4);
      aimAt(lead.x, lead.y);
      setMain(aoe);
    }
    function aimShape(d, x, y) {
      var cell = 80, k = d.k, me = board.tokenCenter(d.rec.hero), path, inside;
      if (k.shape === 'circle') {
        var cx = (Math.floor(x / cell) + 0.5) * cell, cy = (Math.floor(y / cell) + 0.5) * cell, r = (k.r + 0.5) * cell;
        path = 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z';
        inside = function (p) { return Math.hypot(p.x - cx, p.y - cy) <= r - 6; };
        return { path: path, inside: inside, point: { x: cx, y: cy } };
      }
      if (k.shape === 'square') {
        var gx = Math.round(x / cell) - 1, gy = Math.round(y / cell) - 1, s = k.size * cell;
        gx = Math.max(0, Math.min(12 - k.size, gx)); gy = Math.max(0, Math.min(9 - k.size, gy));
        path = 'M' + gx * cell + ' ' + gy * cell + 'h' + s + 'v' + s + 'h' + (-s) + 'Z';
        inside = function (p) { return p.x > gx * cell && p.x < gx * cell + s && p.y > gy * cell && p.y < gy * cell + s; };
        return { path: path, inside: inside, point: { x: gx * cell + s / 2, y: gy * cell + s / 2 } };
      }
      // cone from the caster toward the finger
      var a = Math.atan2(y - me.y, x - me.x), len = (k.len + 0.5) * cell, half = Math.atan(0.5);
      var p1 = { x: me.x + Math.cos(a - half) * len / Math.cos(half), y: me.y + Math.sin(a - half) * len / Math.cos(half) };
      var p2 = { x: me.x + Math.cos(a + half) * len / Math.cos(half), y: me.y + Math.sin(a + half) * len / Math.cos(half) };
      path = 'M' + me.x + ' ' + me.y + 'L' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1) + 'L' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1) + 'Z';
      inside = function (p) {
        var dx = p.x - me.x, dy = p.y - me.y, dist = Math.hypot(dx, dy);
        if (dist < 10 || dist > len + 10) return false;
        var da = Math.abs(((Math.atan2(dy, dx) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        return da <= half + 0.12;
      };
      return { path: path, inside: inside, point: { x: x, y: y } };
    }
    function aimAt(x, y) {
      var d = S.draft; if (!d || !aoe) return;
      var sh = aimShape(d, x, y);
      aoe.firstChild.setAttribute('d', sh.path);
      d.point = sh.point; d.targets = [];
      Object.keys(board.tokens).forEach(function (id) {
        var t = board.tokens[id]; if (t.dead || t.gone || id === d.rec.hero) return;
        var inn = sh.inside(board.tokenCenter(id));
        t.el.classList.toggle('ft-inaoe', inn && isEnemy(id));
        t.el.classList.toggle('ft-danger', inn && !isEnemy(id));
        if (inn && isEnemy(id)) d.targets.push(id);
      });
    }
    ctx.on(board, 'pointermove', function (e) {
      if (S.mode !== 'aiming' && !(S.mode === 'drafted' && aoe && S.draft && S.draft.k.kind === 'area' && e.buttons)) return;
      var p = UI.local(board, e.clientX, e.clientY); aimAt(p.x, p.y);
    });
    ctx.on(board, 'click', function (e) {
      if (!aoe || !S.draft || S.draft.k.kind !== 'area') return;
      var p = UI.local(board, e.clientX, e.clientY); aimAt(p.x, p.y);
      UI.sound('pick'); UI.spark(board.fx, S.draft.point.x, S.draft.point.y, S.draft.rec.hd.color, 10);
      aoe.classList.add('is-locked');
      S.mode = 'drafted';
      showSeal();
    });
    function clearAim() {
      if (aoe) { aoe.remove(); aoe = null; }
      board.classList.remove('ft-aiming');
      Object.keys(board.tokens).forEach(function (id) { board.tokens[id].el.classList.remove('ft-inaoe', 'ft-danger'); });
    }

    /* ------------------------------------------------------------ seal (rule 8: one commit shown twice) */
    function showSeal() {
      var d = S.draft;
      var t0 = d.targets[0];
      var intent = { art: d.so.art, color: d.rec.hd.color };
      if (t0 && isEnemy(t0)) intent.enemy = board.token(t0).enemy; else intent.hero = t0 || d.rec.hero;
      setMain(null);
      board.classList.add('ft-drafted');
      S.pair = UI.sealPair(nodes, { icon: SEAL_ICON[d.k.kind] || 'seal', word: 'Подтвердить', intent: intent, onPress: commit });
      nodes.forEach(function (n) { n.classList.toggle('ft-mine', (n === nodes[1]) === d.rec.far); });
      UI.sound('open');
    }
    function hideSeal() { if (S.pair) { S.pair.hide(); S.pair = null; } }

    function cancelDraft() {
      var d = S.draft;
      hideSeal();
      board.clearTargets(); board.clearArrows(); board.clearPreview();
      board.classList.remove('ft-hunt', 'is-targeting', 'ft-drafted');
      [].forEach.call(board.querySelectorAll('.ft-melee'), function (e) { e.classList.remove('ft-melee'); });
      clearAim();
      if (d && d.top && d.top.top !== d.so) { d.top.el.setArt(d.top.top.art); d.top.el.setLabel(d.top.top.label); }
      S.draft = null;
      if (S.mode !== 'resolving' && S.mode !== 'rolling') S.mode = 'idle';
    }

    /* ------------------------------------------------------------ resolving */
    function commit() {
      var d = S.draft; if (!d) return;
      S.pair = null; S.mode = 'resolving';
      setMain(null);
      board.clearTargets();
      board.classList.remove('ft-hunt', 'ft-drafted');
      if (aoe) aoe.classList.add('is-locked');
      var r = resOf(d.so); if (r) d.rec.used[r] = true;
      if (ONCE[d.rec.hero + ':' + d.so.key]) d.rec.spent[d.so.key] = true;
      if (!d.so.fan && d.top && d.top.top === d.so) d.rec.usedKeys[d.so.key] = true;
      var p;
      switch (d.k.kind) {
        case 'attack': p = doAttack(d); break;
        case 'save': p = doSave(d); break;
        case 'heal': case 'selfheal': p = doHeal(d); break;
        case 'missiles': p = doMissiles(d); break;
        case 'area': p = doArea(d); break;
        default: p = doBuff(d);
      }
      p.then(function () { return wait(380); }).then(function () { afterAction(d); });
    }

    function afterAction(d) {
      var rec = d.rec;
      S.draft = d;            // let cancelDraft restore the fan slot art
      cancelDraft();
      S.mode = 'idle';
      if (S.leaderDown) { rout(); return; }
      refreshSeat(rec);
      updateMain();
      ensureBoot();
    }

    function openCard(rec, co) {
      return new Promise(function (res) {
        S.mode = 'rolling';
        var holder = h('div', { class: 'ft-cardslot ft-cardslot--' + rec.inner });
        var card = UI.diceCard(Object.assign({ color: rec.hd.color, word: 'Бросай' }, co, {
          onConfirm: function (v) {
            ctx.setTimeout(function () {
              card.close();
              ctx.setTimeout(function () { holder.remove(); }, 340);
              rec.seat.classList.remove('ft-rolling');
              setMain(null);
              S.mode = 'resolving';
              refreshLabels(rec);
              res(v);
            }, 240);
          }
        }));
        holder.appendChild(card);
        rec.box.appendChild(holder);
        rec.seat.classList.add('ft-rolling');
        refreshLabels(rec);
        setMain(holder);
        UI.sound('open');
      });
    }

    function hurtEnemy(id, dmg, rec, crit) {
      var t = board.token(id); if (!t || t.dead) return;
      t.hp = Math.max(0, t.hp - dmg); board.setHp(id, t.hp);
      board.pop(id, dmg, crit ? 'crit' : 'dmg', { rot: rec && rec.far ? 180 : 0 });
      burst(id, crit ? '#FFD36B' : null);
      UI.flash(board.fx, crit ? 'rgba(255,211,107,.22)' : 'rgba(255,90,67,.14)', 320);
      UI.sound(crit ? 'crit' : 'hit');
      logLine(UI.ENEMIES[t.enemy].name + ': −' + dmg + ' хитов');
      if (t.hp <= 0) {
        ctx.setTimeout(function () {
          board.kill(id); board.clearIntent(id);
          var si = 4 + ENEMY_IDS.indexOf(id); if (strip.items[si]) strip.items[si].setState('dead');
        }, 380);
        logLine(UI.ENEMIES[t.enemy].name + ' пал');
        if (UI.ENEMIES[t.enemy].leader) S.leaderDown = true;
      }
    }
    function healHero(rec, amt) {
      rec.hp = Math.min(rec.max, rec.hp + amt);
      rec.seat.setHp(rec.hp); board.setHp(rec.hero, rec.hp);
      board.pop(rec.hero, amt, 'heal', { rot: rec.far ? 180 : 0 });
      burst(rec.hero, 'var(--heal)');
      hurtSeat(rec, 'heal');
      UI.sound('heal');
      logLine(rec.hd.short + ': +' + amt + ' хитов');
    }
    function seatPop(rec, text, kind) {
      var c = UI.center(rec.seat.medal, stage);
      var p = UI.pop(UI.fxLayer(stage), c.x, c.y + (rec.far ? 120 : -120), text, kind, { rot: rec.far ? 180 : 0, size: 64 });
      if (p) p.classList.add('ft-seatpop');
    }
    function hurtHero(rec, dmg) {
      rec.hp = Math.max(0, rec.hp - dmg);
      rec.seat.setHp(rec.hp); board.setHp(rec.hero, rec.hp);
      board.pop(rec.hero, dmg, 'dmg', { rot: rec.far ? 180 : 0, size: 84 });
      seatPop(rec, '−' + dmg, 'dmg');
      burst(rec.hero);
      hurtSeat(rec);
      UI.sound('hit');
      if (rec.hp <= 0) { rec.seat.medal.setState('dying'); board.kill(rec.hero); }
      logLine(rec.hd.short + ': −' + dmg + ' хитов');
    }
    function showCheck(rec, id, total, ok) {
      board.clearPreview(id);
      var b = board.preview(id, { items: [{ icon: 'd20', text: total, tone: ok ? 'hit' : null }, { icon: ok ? 'check' : 'cross', tone: ok ? 'heal' : 'dmg' }] });
      if (b) { b.classList.add('ft-result'); if (rec.far) b.classList.add('ft-far'); }
    }

    function doAttack(d) {
      var rec = d.rec, id = d.targets[0], t = board.token(id);
      var hit = d.k.hit || d.so.hit || 0;
      var dm = d.k.die ? { die: d.k.die, n: d.k.n, mod: d.k.mod } : parseDice(d.so.dmg);
      var adv = rec.flags.adv ? 'adv' : null;
      if (adv) { rec.flags.adv = false; badge(rec, 'adv', false); }
      return openCard(rec, { die: 'd20', mod: hit, dc: t.ac, adv: adv }).then(function (v) {
        var total = v + hit, crit = v === 20, ok = crit || (v !== 1 && total >= t.ac);
        showCheck(rec, id, total, ok);
        logLine(rec.hd.short + ': ' + v + ' ' + UI.fmtMod(hit) + ' = ' + total + ' против КД ' + t.ac + (ok ? ' — попал' : ' — мимо'));
        if (!ok) { board.pop(id, null, 'miss', { rot: rec.far ? 180 : 0 }); UI.sound('miss'); return wait(500); }
        UI.sound('pick');
        return wait(520).then(function () {
          var mod = dm.mod + (rec.flags.rage ? 2 : 0);
          return openCard(rec, { groups: [{ die: dm.die, n: dm.n * (crit ? 2 : 1), mod: mod }], word: 'Урон' });
        }).then(function (v2) {
          board.clearPreview(id);
          hurtEnemy(id, v2 + dm.mod + (rec.flags.rage ? 2 : 0), rec, crit);
          return wait(700);
        });
      });
    }

    function doSave(d) {
      var rec = d.rec, id = d.targets[0], t = board.token(id);
      var dm = parseDice(d.so.dmg), save = rnd(3, 14), mod = 1;
      sev('speaking');
      return worldRoll(save, mod).then(function () {
        sev('idle');
        var ok = save + mod >= 13;
        showCheck(rec, id, save + mod, !ok);
        if (ok) { board.pop(id, null, 'miss', { rot: rec.far ? 180 : 0 }); UI.sound('miss'); return wait(500); }
        return wait(420).then(function () { return openCard(rec, { groups: [{ die: dm.die, n: dm.n, mod: dm.mod }], word: 'Урон' }); })
          .then(function (v) { board.clearPreview(id); hurtEnemy(id, v + dm.mod, rec); return wait(700); });
      });
    }

    function doHeal(d) {
      var rec = d.rec, k = d.k, who = byHero[d.targets[0]] || rec;
      return openCard(rec, { groups: [{ die: k.die, n: k.n || 1, mod: k.mod }], word: 'Лечение' }).then(function (v) {
        board.clearPreview(); healHero(who, v + k.mod); return wait(700);
      });
    }

    function doMissiles(d) {
      var rec = d.rec, k = d.k, order = [];
      Object.keys(d.missiles).forEach(function (id) { for (var i = 0; i < d.missiles[id]; i++) order.push(id); });
      var groups = order.map(function (id, i) { return { die: k.die, n: 1, mod: k.mod, label: i + 1 }; });
      return openCard(rec, { groups: groups, word: 'Бросай' }).then(function (vals) {
        board.clearPreview();
        var chain = Promise.resolve();
        order.forEach(function (id, i) {
          chain = chain.then(function () { hurtEnemy(id, vals[i] + k.mod, rec); return wait(260); });
        });
        return chain.then(function () { return wait(500); });
      });
    }

    function doArea(d) {
      var rec = d.rec, k = d.k;
      if (!k.die) {
        d.targets.forEach(function (id) { burst(id, '#C8A05A'); board.pop(id, '↓', 'info', { rot: rec.far ? 180 : 0 }); });
        UI.sound('miss');
        return wait(700);
      }
      return openCard(rec, { groups: [{ die: k.die, n: k.n, mod: k.mod }], word: 'Урон' }).then(function (v) {
        UI.flash(board.fx, 'color-mix(in srgb, ' + rec.hd.color + ' 30%, transparent)', 420);
        d.targets.forEach(function (id) { hurtEnemy(id, v, rec); });
        if (!d.targets.length) { UI.sound('miss'); board.pop(rec.hero, null, 'miss'); }
        return wait(800);
      });
    }

    function doBuff(d) {
      var rec = d.rec, k = d.k, c = board.tokenCenter(rec.hero);
      UI.spark(board.fx, c.x, c.y, rec.hd.color, 14);
      if (k.kind === 'rage') {
        rec.flags.rage = true; badge(rec, 'cond-rage', true);
        var r = rec.seat.ability('rage'); if (r && d.so.alt) { r.setArt(d.so.alt.art); r.setLabel(d.so.alt.label); }
        board.pop(rec.hero, '+2', 'info');
      } else if (k.kind === 'adv') {
        rec.flags.adv = true; badge(rec, 'adv', true);
      } else if (k.kind === 'surge') {
        rec.used.action = false; rec.usedKeys = {};
        board.pop(rec.hero, '+1', 'info');
      } else if (k.kind === 'dash') {
        board.speedLeft(rec.hero, board.speedLeft(rec.hero) + 30);
        board.pop(rec.hero, '+30', 'info', { rot: rec.far ? 180 : 0 });
      } else if (k.kind === 'disengage') {
        badge(rec, 'boot', true);
      } else if (k.kind === 'bless') {
        ORDER.forEach(function (p) { var r2 = seats[p]; if (r2 !== rec || true) badge(r2, 'cond-bless', true); var cc = board.tokenCenter(r2.hero); UI.spark(board.fx, cc.x, cc.y, 'var(--gold-hi)', 8); });
      }
      UI.sound('heal');
      logLine(rec.hd.short + ': ' + d.so.label);
      return wait(500);
    }

    /* ------------------------------------------------------------ world turn */
    function planFor(round) {
      if (round === 1) return PLAN1.map(function (p) { return Object.assign({}, p); }).filter(function (p) { return alive(p.id); });
      return PLAN1.filter(function (p) { return alive(p.id); }).map(function (p) {
        var en = UI.ENEMIES[board.token(p.id).enemy], dd = parseDice(en.dmg);
        return { id: p.id, target: p.target, intent: p.intent, roll: rnd(1, 20), mod: p.mod, dmg: rnd(dd.n, dd.n * parseInt(dd.die.slice(1), 10)) + dd.mod };
      }).filter(function (p) { return byHero[p.target].hp > 0; });
    }

    function worldPhase() {
      S.phase = 'world'; S.mode = 'enemy';
      setMain(null);
      board.clearReach();
      ORDER.forEach(function (p) { seats[p].seat.setActive(false); refreshSeat(seats[p]); });
      strip.setPhase('world', Math.min(S.round, 2) + '/2');
      strip.setCurrent(4 + ENEMY_IDS.findIndex(alive));
      phaseFlash(true); UI.sound('turn');
      sev('speaking');
      var plan = planFor(S.round);
      board.setActive(null);
      wait(800).then(function () {
        plan.forEach(function (p) {
          board.intent(p.id, { icon: p.intent });
          p.arrow = drawArrow(p.id, p.target, { enemy: true, width: 6, bend: -0.16 });
        });
        board.classList.add('ft-intents');
        return wait(1100);
      }).then(function () {
        var chain = Promise.resolve();
        plan.forEach(function (p) { chain = chain.then(function () { return enemyAct(p, plan); }); });
        return chain;
      }).then(function () {
        board.classList.remove('ft-intents');
        sev('idle');
        board.setActive(null);
        return wait(500);
      }).then(function () {
        S.round++;
        if (S.round > 2) { endFight(false); return; }
        phaseFlash(false);
        ctx.setTimeout(function () { startTurn(0); }, 450);
      });
    }

    function enemyAct(p, plan) {
      if (!alive(p.id)) return Promise.resolve();
      var hero = byHero[p.target];
      strip.setCurrent(4 + ENEMY_IDS.indexOf(p.id));
      board.setActive(p.id);
      plan.forEach(function (q) { if (q.arrow) q.arrow.classList.toggle('ft-faded', q !== p); });
      var pre = Promise.resolve();
      if (p.move) {
        pre = wait(250).then(function () {
          board.moveToken(p.id, p.move[0], p.move[1]);
          UI.sound('tap');
          return wait(380);
        }).then(function () {
          if (p.arrow) p.arrow.remove();
          p.arrow = drawArrow(p.id, p.target, { enemy: true, width: 6, bend: -0.16 });
        });
      }
      var total = p.roll + p.mod, ac;
      var willHit = p.roll === 20 || (p.roll !== 1 && total >= hero.ac);
      return pre.then(function () { return worldRoll(p.roll, p.mod, 'd20', willHit); }).then(function () {
        ac = hero.ac;
        var hit = p.roll === 20 || (p.roll !== 1 && total >= ac);
        if (hit && hero.hero === 'arcanist' && !hero.flags.shield && total < ac + 5 && hero.hp > 0) {
          return offerReaction(hero, p, total).then(function (yes) {
            if (yes) { hero.flags.shield = true; return false; }
            return true;
          });
        }
        return hit;
      }).then(function (hit) {
        if (hit) hurtHero(hero, p.dmg);
        else { board.pop(hero.hero, null, 'miss'); UI.sound('miss'); }
        logLine(UI.ENEMIES[board.token(p.id).enemy].name + ' → ' + hero.hd.short + ': ' + total + (hit ? ', −' + p.dmg : ', мимо'));
        return wait(750);
      }).then(function () {
        board.clearIntent(p.id);
        if (p.arrow) { p.arrow.remove2(); p.arrow = null; }
      });
    }

    /* reaction card (offer-banner): slides from the target's seat — shield emblem, ✓ / ✕ */
    function offerReaction(rec, p, total) {
      return new Promise(function (res) {
        S.mode = 'reaction';
        rec.seat.setDim(false); rec.seat.classList.add('ft-react-on');
        var en = board.token(p.id);
        var ms = 8000, done = false;
        var yes = h('button', { class: 'ft-react__yes', type: 'button', 'aria-label': 'Да', html: '<svg class="ft-tick" viewBox="0 0 48 48" aria-hidden="true"><path d="M9 25.5l10 10L39.5 13"/></svg>' });
        var no = h('button', { class: 'ft-react__no', type: 'button', 'aria-label': 'Нет' }, UI.icon('cross'));
        var card = h('div', { class: 'ft-react', style: { '--hero': rec.hd.color, '--ms': ms + 'ms' } },
          h('div', { class: 'ft-react__threat' },
            UI.bgArt(h('span', { class: 'ft-react__foe' }), UI.ENEMIES[en.enemy].token),
            h('span', { class: 'ft-react__roll' }, UI.icon('d20'), h('b', { text: String(total) }))),
          h('span', { class: 'ft-react__vs' }, UI.icon('arrow-right')),
          h('div', { class: 'ft-react__ab' }, UI.bgArt(h('span', { class: 'ft-react__pic' }), 'ab-arcanist-shield'), h('span', { class: 'ft-react__lab', text: 'Щит' })),
          h('div', { class: 'ft-react__gain' }, UI.icon('shield-ac'), h('b', { text: String(rec.ac + 5) })),
          h('div', { class: 'ft-react__btns' }, yes, no),
          h('i', { class: 'ft-react__timer' }));
        var holder = h('div', { class: 'ft-cardslot ft-cardslot--' + rec.inner + ' ft-cardslot--react' }, card);
        rec.box.appendChild(holder);
        setMain(yes);
        UI.sound('open');
        function finish(v) {
          if (done) return; done = true;
          setMain(null);
          card.classList.add(v ? 'is-yes' : 'is-no');
          UI.sound(v ? 'stamp' : 'tap');
          if (v) {
            var c = board.tokenCenter(rec.hero);
            var sh = h('div', { class: 'ft-shieldfx', style: { left: c.x + 'px', top: c.y + 'px' } });
            board.fx.appendChild(sh); ctx.setTimeout(function () { sh.remove(); }, 1400);
            board.pop(rec.hero, String(rec.ac + 5), 'info', { rot: 180 });
            logLine(rec.hd.short + ': Щит, КД ' + (rec.ac + 5));
          }
          ctx.setTimeout(function () {
            holder.remove();
            rec.seat.classList.remove('ft-react-on'); rec.seat.setDim(true);
            S.mode = 'enemy';
            res(v);
          }, 420);
        }
        yes.addEventListener('click', function () { finish(true); });
        no.addEventListener('click', function () { finish(false); });
        ctx.setTimeout(function () { finish(false); }, ms);
      });
    }

    /* ------------------------------------------------------------ the end */
    function rout() {
      S.over = true; setMain(null);
      ENEMY_IDS.forEach(function (id) { if (alive(id)) { board.intent(id, { icon: 'intent-flee' }); } });
      goal.classList.add('is-done');
      UI.sound('flee');
      wait(700).then(function () {
        ENEMY_IDS.forEach(function (id) { if (alive(id)) board.flee(id, 5); });
        return wait(1000);
      }).then(function () { endFight(true); });
    }
    function endFight(win) {
      S.over = true; setMain(null);
      ORDER.forEach(function (p) { seats[p].seat.setActive(false); refreshSeat(seats[p]); });
      if (!win) ENEMY_IDS.forEach(function (id) { if (alive(id)) board.flee(id, 5); });
      board.setActive(null);
      strip.setCurrent(-1);
      board.clearReach();
      var word = win ? 'Победа' : 'Отбились';
      var end = h('div', { class: 'ft-end' + (win ? ' is-win' : '') },
        h('div', { class: 't-title ft-end__w ft-end__w--far', text: word }),
        h('span', { class: 'ft-end__emb' }, h('i'), UI.icon(win ? 'laurel' : 'laurel-broken')),
        h('div', { class: 't-title ft-end__w', text: word }));
      L.center.appendChild(end);
      UI.sound(win ? 'heal' : 'turn');
      ctx.setTimeout(function () {
        S.pair = UI.sealPair(nodes, { icon: 'rotate', word: 'Ещё раз', hold: 600, onPress: function () { ctx.remount(); } });
      }, 900);
    }

    /* ------------------------------------------------------------ service icons on the right end */
    function svcTap(kind, b) {
      if (kind === 'scroll') {
        UI.sheet(stage, { icon: 'scroll', title: 'Журнал', text: S.log.length ? S.log.join('\n') : 'Бой только начался.', x: 1560, y: 600 });
      } else if (kind === 'help') {
        UI.sheet(stage, { icon: 'help', title: 'Ход', text: 'Умение → цель → печать. Бросьте настоящий кубик и тапните число. Песочные часы — конец хода.', x: 1560, y: 600 });
      } else if (kind === 'flag') {
        S.marking = !S.marking;
        b.classList.toggle('is-on', S.marking);
        board.classList.toggle('ft-marking', S.marking);
        UI.toastFor(b, { icon: 'flag', text: S.marking ? 'Тапните клетку' : 'Пометки сняты' });
        if (!S.marking) clearMarks();
      } else {
        gearSheet();
      }
    }
    /* gear: everything §5 hides behind it, as a sheet of big rows (one tap each) */
    function gearSheet() {
      var sh = UI.sheet(stage, { icon: 'gear', title: 'Настройки', x: 1560, y: 520 });
      var list = h('div', { class: 'ft-gear' });
      [['rotate', 'Поворот', function () { UI.toast(stage, { icon: 'rotate', text: 'Поворот — кнопка «Напротив»' }); }],
        ['dev-table', 'Раскладка', function () { UI.toast(stage, { icon: 'dev-table', text: '2 и 2' }); }],
        ['check', 'Проверка', function () { UI.toast(stage, { icon: 'check', tone: 'good', text: 'Всё на связи' }); }],
        ['help', 'Правила', function () { svcTap('help'); }],
        ['party-swap', 'Новый отряд', function () { UI.toast(stage, { icon: 'party-swap', text: 'Выбор героев — слайд 04' }); }],
        ['back', 'Ещё раз', function () { ctx.remount(); }]].forEach(function (r) {
        var b = h('button', { class: 'ft-gear__b', type: 'button' }, UI.icon(r[0]), h('span', { text: r[1] }));
        b.addEventListener('click', function (e) { e.stopPropagation(); sh.remove(); r[2](); });
        list.appendChild(b);
      });
      var fr = sh.querySelector('.sheet__frame') || sh.firstChild;
      fr.appendChild(list);
    }
    // keep the sheet open while its own rows are pressed (UI.sheet closes on any document pointerdown)
    ctx.on(window, 'pointerdown', function (e) { if (e.target.closest && e.target.closest('.ft-gear')) e.stopPropagation(); }, true);
    var marks = {};
    function toggleMark(x, y) {
      var k = x + ':' + y;
      if (marks[k]) { marks[k].remove(); delete marks[k]; UI.sound('tap'); return; }
      var c = board.cellCenter(x, y);
      var m = h('div', { class: 'ft-mark', style: { left: c.x + 'px', top: c.y + 'px' } }, UI.icon('flag'));
      board.querySelector('.board__over').appendChild(m);
      marks[k] = m; UI.sound('pick');
    }
    function clearMarks() { Object.keys(marks).forEach(function (k) { marks[k].remove(); }); marks = {}; }

    /* ------------------------------------------------------------ idle hint: ghost hand after 8 s (rule 14) */
    var last = Date.now(), hand = null;
    ctx.on(stage, 'pointerdown', function () { last = Date.now(); if (hand) { hand.remove(); hand = null; } if (S.mainEl) S.mainEl.classList.remove('ft-nudge'); }, true);
    ctx.setInterval(function () {
      if (hand || S.over || Date.now() - last < 8000 || !stage.isConnected) return;
      if (S.phase === 'world' && S.mode !== 'reaction') return;     // enemy turn: nothing to touch, no hint
      var rec = S.phase === 'heroes' ? cur() : null;
      var target = S.mainEl;
      if (!target && S.pair && rec) target = S.pair.seals[rec.far ? 1 : 0];
      if (S.mainEl && S.mainEl.classList.contains('ft-cardslot')) target = S.mainEl.querySelector('.dcard__ok:not(:disabled)') || S.mainEl.querySelector('.tile');
      if (!target || !target.isConnected || target.offsetParent === null) return;
      var c = UI.center(target.classList.contains('seal') ? target.querySelector('.seal__disk') : target, stage);
      var far = !!target.closest('[data-far]') || (!!target.closest('.tok') && rec && rec.far);
      hand = h('div', { class: 'ft-hand' + (far ? ' is-far' : ''), style: { left: c.x + 'px', top: c.y + 'px' } });
      hand.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M24 6c3 0 5 2.2 5 5v17l2.2-.6c2.8-.8 5 .6 5.6 2.8l2.4-.5c2.8-.6 4.9.9 5.4 3.2l1.6-.3c2.9-.5 5.2 1.5 5.2 4.4v9.5C51.4 56 45.5 62 37 62h-5.5c-4.8 0-8-1.8-11-5.6L9.6 42.6c-1.9-2.5-.9-5.6 1.6-6.4 1.7-.5 3.3 0 4.6 1.2L19 40V11c0-2.8 2.2-5 5-5z"/></svg>';
      UI.fxLayer(stage).appendChild(hand);
      if (S.mainEl) S.mainEl.classList.add('ft-nudge');
    }, 1000);

    /* ------------------------------------------------------------ deck hooks */
    ctx.onDeck('rotate', function () { if (hand) { hand.remove(); hand = null; } });

    /* ------------------------------------------------------------ start */
    if (start === 'enemy') {
      // round 1 already played by the heroes: Никита hit the leader, a small one fell
      var big = board.token('big'); big.hp = 5; board.setHp('big', 5);
      var s1 = board.token('small1'); s1.hp = 0; board.setHp('small1', 0); board.kill('small1');
      strip.items[4 + ENEMY_IDS.indexOf('small1')].setState('dead');
      o.quiet = true;
      startTurn(3);
      ORDER.forEach(function (p) { seats[p].seat.setActive(false); });
      S.phase = 'world'; S.mode = 'enemy';
      refreshAll(); setMain(null); board.clearReach();
      ctx.setTimeout(function () { worldPhase(); }, 700);
    } else {
      o.quiet = true;
      startTurn(0);
      if (start === 'confirm' || start === 'roll') {
        var nik = seats.nearLeft;
        var atk = nik.shelf[0], el = nik.seat.ability('attack');
        onSlot(nik, atk, el);
        pickTarget('big', { noSeal: start === 'roll' });
        if (start === 'roll') commit();
      }
    }

    return function () { if (hand) hand.remove(); };
  }

  window.FightEngine = { mount: mount };
  try { window.dispatchEvent(new Event('fight-engine-ready')); } catch (e) { /* old browsers: slides poll */ }
})();
