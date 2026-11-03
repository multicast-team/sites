/* =====================================================================
   AI-стол · game components.  Owner: foundation.   window.UI
   Every factory returns a DOM element (with methods attached) styled by
   components.css.  Sizes default to tokens (--slot, --mic, --seal …),
   colours to --hero.  Positions passed to juice helpers are LOCAL to the
   container you pass (use UI.local(container, event) to convert).

   Building blocks
     UI.h(tag, props, ...kids)        DOM builder (props: class, style, data-*, on*, html, text)
     UI.s(tag, attrs, ...kids)        SVG builder
     UI.icon(name, cls?)              <svg class="ic"><use href="assets/icons.svg#i-name"/></svg>
     UI.HEROES / UI.ENEMIES / UI.FORD / UI.PARTY4 / UI.LEGS   shared game data
     UI.local(container, evt|x, y)    client point → container-local point (handles scale + 180°)
     UI.center(el, container)         centre of el in container-local coords
     UI.longPress(el, fn, ms=400)
     UI.sound(name)                   tap, stamp, dice, turn, mic-on, mic-off, hit, miss, heal, error, open, flee
   Pieces
     UI.frame(opts, ...kids)          bronze / gold double border, corner rhombs, top jewel
     UI.rule(opts)                    ornamental divider line with rhombs
     UI.seal(opts)                    gold wax seal + ribbon word; .stamp() .show() .hide() .setWord()
     UI.medallion(opts)               portrait + HP ring + heart number; .setHp() .setState()
     UI.slot(opts)                    ability slot; .setState(state, reason) ; fan via opts.fan
     UI.fan(slotEl, items, opts)      arc of extra slots over a slot (2nd and last disclosure level)
     UI.endTurn(opts)                 hourglass button «Конец»
     UI.mic(opts)                     idle / listening / thinking / speaking; .setState()
     UI.severin(opts)                 Severin medallion, same 4 states as mic
     UI.die(type, opts)               SVG die (d4…d20) with value; .setValue()
     UI.diceCard(opts)                roll card: die + mod badge + allowed tiles + mic + check
     UI.keepInStage(el, margin)       shift a positioned element sideways so it stays inside its stage
     UI.choiceCard(opts)              big icon + 2-3 words
     UI.toast(container, opts)        icon + few words, auto-hide
     UI.sheet(container, opts)        long-press info sheet (rotatable), UI.sheetFor(el, opts)
                                      on the table both are shared by default: two copies, near upright +
                                      far turned 180° at the mirror point; opts.side 'near'|'far' = one owner
     UI.turnStrip(opts)               queue of portraits, current bigger, phase emblem + round
     UI.intent(opts)                  enemy intent badge (icon + multi-hit dots)
     UI.targetRing()                  gold rotating target ring
     UI.arrowLayer(w, h) / UI.arrow(layer, from, to, opts)
     UI.board(opts)                   12x9 map board with tokens, drag-to-move, targets, arrows
     UI.seat(opts) / UI.node(opts) / UI.sealPair(nodes, opts) / UI.tableLayout(stage)
   Juice
     UI.spark(c, x, y, color)  UI.pop(c, x, y, text, kind)  UI.flash(c, color)
     UI.stampFx(c, x, y)       UI.rollDie(c, x, y, opts)   UI.shake(stage, px≤6, TV only)
     UI.bindTapFx(stage)       (deck calls it: every tap on button/[data-tap] → press + spark + click)
   Conventions for slides
     data-main  on THE one main action (deck «5 секунд» reveals it; gets .is-main pulse)
     data-turn  on the element that shows whose turn it is (5-second reveal)
     data-far   on containers rotated 180° (sheets/toasts opened from inside face that side)
     data-own   ="near"|"far" on a non-seat container whose transients belong to one side
                (inside .seat this is automatic; everything else on the table opens on both sides)
   ===================================================================== */
(function () {
  'use strict';
  var UI = window.UI = {};
  var SVGNS = 'http://www.w3.org/2000/svg';
  UI.ICONS = 'assets/icons.svg';
  var reducedMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  UI.reduced = function () { return reducedMQ.matches; };
  var art = function (k) { return window.art ? window.art(k) : null; };
  UI.art = art;

  /* ------------------------------------------------------------ builders */
  function applyProps(el, props) {
    if (!props) return;
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class' || k === 'className') el.setAttribute('class', v);
      else if (k === 'style') {
        if (typeof v === 'string') el.style.cssText += ';' + v;
        else Object.keys(v).forEach(function (p) { if (p.indexOf('--') === 0) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; });
      }
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
  }
  function append(el, kids) {
    kids.forEach(function (c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return append(el, c);
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }
  function h(tag, props) { var el = document.createElement(tag); applyProps(el, props); append(el, [].slice.call(arguments, 2)); return el; }
  function s(tag, attrs) { var el = document.createElementNS(SVGNS, tag); applyProps(el, attrs); append(el, [].slice.call(arguments, 2)); return el; }
  UI.h = h; UI.s = s;

  UI.icon = function (name, cls) {
    var svg = s('svg', { class: 'ic' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', focusable: 'false' });
    var use = s('use'); use.setAttribute('href', UI.ICONS + '#i-' + name);
    svg.appendChild(use);
    return svg;
  };
  function setIcon(svg, name) { var u = svg && svg.querySelector('use'); if (u) u.setAttribute('href', UI.ICONS + '#i-' + name); }
  UI.setIcon = setIcon;

  function bgArt(el, key) {
    if (!key) return el;
    if (/^(assets\/|https?:|data:|before\/)/.test(key)) { el.style.backgroundImage = 'url("' + key + '")'; return el; }
    var u = art(key); if (!u) return el;
    var f = window.art.fit(key);
    el.style.backgroundImage = 'url("' + u + '")';
    el.style.backgroundPosition = f.pos;
    el.style.backgroundSize = f.zoom === 1 ? 'cover' : (f.zoom * 100) + '% auto';
    return el;
  }
  UI.bgArt = bgArt;

  /* global SVG defs (gradients shared by every component) */
  function ensureDefs() {
    if (document.getElementById('ui-defs')) return;
    var svg = s('svg', { id: 'ui-defs', width: 0, height: 0, style: 'position:absolute;width:0;height:0;overflow:hidden', 'aria-hidden': 'true' });
    svg.innerHTML =
      '<defs>' +
      '<radialGradient id="ui-g-wax" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FFF1C4"/><stop offset=".22" stop-color="#F5D58A"/><stop offset=".55" stop-color="#D9A548"/><stop offset=".85" stop-color="#9A6A22"/><stop offset="1" stop-color="#5E3D10"/></radialGradient>' +
      '<radialGradient id="ui-g-wax-in" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#C8913A"/><stop offset=".7" stop-color="#E7BC66"/><stop offset="1" stop-color="#FCE4A0"/></radialGradient>' +
      '<linearGradient id="ui-g-bronze" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a3519"/><stop offset=".3" stop-color="#C29A5B"/><stop offset=".5" stop-color="#6B4E2A"/><stop offset=".75" stop-color="#D4AE6C"/><stop offset="1" stop-color="#4a3519"/></linearGradient>' +
      '<linearGradient id="ui-g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5418"/><stop offset=".3" stop-color="#F5D58A"/><stop offset=".55" stop-color="#E0B25C"/><stop offset=".8" stop-color="#a8771f"/><stop offset="1" stop-color="#F5D58A"/></linearGradient>' +
      '<linearGradient id="ui-g-ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A1F1A"/><stop offset=".5" stop-color="#5A1411"/><stop offset="1" stop-color="#330908"/></linearGradient>' +
      '<linearGradient id="ui-g-bone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6DE"/><stop offset=".5" stop-color="#E9D7AE"/><stop offset="1" stop-color="#B49B6C"/></linearGradient>' +
      '<linearGradient id="ui-g-bone-dk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8C291"/><stop offset="1" stop-color="#8F7647"/></linearGradient>' +
      '<linearGradient id="ui-g-enemy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E06A5C"/><stop offset=".5" stop-color="#B8453A"/><stop offset="1" stop-color="#5E1C16"/></linearGradient>' +
      '<filter id="ui-f-emboss"><feGaussianBlur in="SourceAlpha" stdDeviation=".6" result="b"/><feOffset dy=".8" result="o"/><feComposite in="SourceGraphic" in2="o" operator="over"/></filter>' +
      '</defs>';
    (document.body || document.documentElement).appendChild(svg);
  }
  UI.ensureDefs = ensureDefs;

  /* ------------------------------------------------------------ game data */
  var LEGS = [
    { key: 'dash', art: 'icon-dash', label: 'Рывок', cost: 'action', info: 'Рывок: удвоить перемещение до конца хода.' },
    { key: 'disengage', art: 'icon-disengage', label: 'Отход', cost: 'action', info: 'Отход: уйти от врагов без атак по возможности.' },
    { key: 'stand', art: 'icon-stand-up', label: 'Встать', cost: 'move', info: 'Встать: подняться за половину скорости.' }
  ];
  UI.LEGS = LEGS;
  function legs() { return { key: 'legs', art: 'icon-dash', label: 'Ноги', fan: LEGS.slice(), info: 'Перемещение: рывок, отход, встать.' }; }

  UI.HEROES = {
    guardian: { id: 'guardian', name: 'Никита Кожемяка', short: 'Никита', epithet: 'Железная хватка', color: '#F0A838', hp: 28, max: 28, ac: 16, speed: 30,
      shelf: [
        { key: 'attack', art: 'ab-guardian-attack', label: 'Атака', cost: 'action', target: 'enemy', hit: 5, dmg: '1d8+3', die: 'd8', info: 'Удар молотом: к20 +5 против КД, урон 1к8 +3.' },
        { key: 'second-wind', art: 'ab-guardian-second-wind', label: 'Дыхание', cost: 'bonus', info: 'Второе дыхание: вернуть 1к10 +1 хитов. Раз до отдыха.' },
        { key: 'surge', art: 'ab-guardian-surge', label: 'Всплеск', cost: 'free', info: 'Всплеск действий: ещё одно действие в этот ход. Раз до отдыха.' },
        legs()] },
    fury: { id: 'fury', name: 'Настасья Микулична', short: 'Настасья', epithet: 'Удалая богатырша', color: '#FF6A3D', hp: 35, max: 35, ac: 14, speed: 30,
      shelf: [
        { key: 'attack', art: 'ab-fury-attack', label: 'Атака', cost: 'action', target: 'enemy', hit: 5, dmg: '1d12+3', die: 'd12', info: 'Секира: к20 +5 против КД, урон 1к12 +3.' },
        { key: 'reckless', art: 'ab-fury-reckless', label: 'Безрассудно', cost: 'free', info: 'Безрассудная атака: преимущество на атаки, но и по вам — с преимуществом.' },
        { key: 'rage', art: 'ab-fury-rage', label: 'Ярость', cost: 'bonus', alt: { art: 'icon-extend-rage', label: 'Продлить' }, info: 'Ярость: +2 к урону, сопротивление ударам. В ярости слот становится «Продлить».' },
        legs()] },
    shadow: { id: 'shadow', name: 'Лиса Патрикеевна', short: 'Лиса', epithet: 'Хитрый клинок', color: '#B366FF', hp: 24, max: 24, ac: 14, speed: 30,
      shelf: [
        { key: 'attack', art: 'ab-shadow-sneak', label: 'Атака', cost: 'action', target: 'enemy', hit: 5, dmg: '1d6+3', die: 'd6', info: 'Кинжал: к20 +5, урон 1к6 +3, плюс скрытая атака 1к6.' },
        { key: 'cunning', art: 'ab-shadow-dash', label: 'Хитрость', info: 'Хитрое действие: рывок или отход бонусом.', fan: [
          { key: 'cunning-dash', art: 'ab-shadow-dash', label: 'Рывок', cost: 'bonus', info: 'Хитрый рывок бонусным действием.' },
          { key: 'cunning-disengage', art: 'icon-cunning-disengage', label: 'Отход', cost: 'bonus', info: 'Хитрый отход бонусным действием.' }] },
        { key: 'aim', art: 'icon-steady-aim', label: 'Прицел', cost: 'bonus', info: 'Твёрдый прицел: преимущество на следующую атаку, но без перемещения.' },
        legs()] },
    beacon: { id: 'beacon', name: 'Старец Подорожник', short: 'Старец', epithet: 'Целитель ран', color: '#F4E6B8', hp: 24, max: 24, ac: 16, speed: 30,
      shelf: [
        { key: 'flame', art: 'ab-beacon-flame', label: 'Пламя', cost: 'cantrip', target: 'enemy', save: 'ЛОВ 13', dmg: '1d8', die: 'd8', info: 'Священное пламя: спасбросок Ловкости 13, урон 1к8 излучением.' },
        { key: 'heal', art: 'ab-beacon-heal', label: 'Лечение', info: 'Лечение: раны, слово, покой.', fan: [
          { key: 'cure', art: 'ab-beacon-heal', label: 'Раны', cost: 'slot', lvl: 1, target: 'ally', info: 'Лечение ран касанием: 1к8 +3 хитов.' },
          { key: 'word', art: 'icon-healing-word', label: 'Слово', cost: 'bonus', lvl: 1, target: 'ally', info: 'Лечащее слово на расстоянии: 1к4 +3 хитов.' },
          { key: 'spare', art: 'icon-spare-the-dying', label: 'Покой', cost: 'cantrip', target: 'ally', info: 'Уход за умирающим: стабилизировать союзника.' }] },
        { key: 'prayers', art: 'ab-beacon-bless', label: 'Молитвы', info: 'Молитвы: благословение, направленный снаряд, божественный канал.', fan: [
          { key: 'bless', art: 'ab-beacon-bless', label: 'Благословение', cost: 'slot', lvl: 1, info: 'Благословение: +1к4 к атакам и спасброскам троих союзников.' },
          { key: 'bolt', art: 'icon-guiding-bolt', label: 'Снаряд', cost: 'slot', lvl: 1, target: 'enemy', info: 'Направленный снаряд: 4к6 излучением, следующая атака с преимуществом.' },
          { key: 'channel', art: 'icon-channel-divinity', label: 'Канал', cost: 'action', info: 'Божественный канал: изгнать нежить.' },
          { key: 'preserve', art: 'icon-preserve-life', label: 'Жизнь', cost: 'action', info: 'Сохранение жизни: раздать 15 хитов союзникам.' }] },
        legs()] },
    arcanist: { id: 'arcanist', name: 'Кощей', short: 'Кощей', epithet: 'Повелитель молний', color: '#4FB8FF', hp: 17, max: 17, ac: 12, speed: 30,
      shelf: [
        { key: 'ray', art: 'ab-arcanist-frost', label: 'Луч', cost: 'cantrip', target: 'enemy', hit: 5, dmg: '1d8', die: 'd8', info: 'Луч холода: к20 +5, урон 1к8 холодом, скорость цели −10.' },
        { key: 'spells', art: 'ab-arcanist-missile', label: 'Чары', info: 'Чары: стрела, щит, огонь, жир, гром.', fan: [
          { key: 'missile', art: 'ab-arcanist-missile', label: 'Стрела', cost: 'slot', lvl: 1, target: 'enemy', missiles: 3, info: 'Волшебная стрела: три снаряда по 1к4 +1, без промаха. Тапами разложите снаряды.' },
          { key: 'shield', art: 'ab-arcanist-shield', label: 'Щит', cost: 'reaction', lvl: 1, info: 'Щит: +5 к КД до вашего хода, реакцией.' },
          { key: 'hands', art: 'icon-burning-hands', label: 'Огонь', cost: 'slot', lvl: 1, info: 'Огненные ладони: конус 15 футов, 3к6 огнём.' },
          { key: 'grease', art: 'icon-grease', label: 'Жир', cost: 'slot', lvl: 1, info: 'Жир: квадрат 10 футов, враги падают.' },
          { key: 'shatter', art: 'icon-shatter', label: 'Гром', cost: 'slot', lvl: 2, info: 'Дребезги: сфера 10 футов, 3к8 звуком.' }] },
        legs()] },
    voice: { id: 'voice', name: 'Любава', short: 'Любава', epithet: 'Голос гуслей', color: '#3FD68A', hp: 22, max: 22, ac: 13, speed: 30,
      shelf: [
        { key: 'mockery', art: 'ab-voice-mockery', label: 'Насмешка', cost: 'cantrip', target: 'enemy', save: 'МДР 13', dmg: '1d4', die: 'd4', info: 'Злая насмешка: спасбросок Мудрости, 1к4 психической, помеха на атаку.' },
        { key: 'inspire', art: 'ab-voice-inspire', label: 'Вдохновение', cost: 'bonus', target: 'ally', info: 'Вдохновение: союзник получает кость 1к6 к броску.' },
        { key: 'spells', art: 'icon-dissonant-whispers', label: 'Чары', info: 'Чары: огни, шёпот, слово, героизм.', fan: [
          { key: 'faerie', art: 'icon-faerie-fire', label: 'Огни', cost: 'slot', lvl: 1, info: 'Огонь фей: подсветить врагов, атаки по ним с преимуществом.' },
          { key: 'whispers', art: 'icon-dissonant-whispers', label: 'Шёпот', cost: 'slot', lvl: 1, target: 'enemy', info: 'Диссонирующий шёпот: 3к6 психической, цель бежит.' },
          { key: 'word', art: 'icon-healing-word', label: 'Слово', cost: 'bonus', lvl: 1, target: 'ally', info: 'Лечащее слово: 1к4 +3 хитов.' },
          { key: 'heroism', art: 'icon-heroism', label: 'Героизм', cost: 'slot', lvl: 1, target: 'ally', info: 'Героизм: временные хиты каждый ход.' }] },
        legs()] }
  };
  UI.HERO_IDS = ['guardian', 'fury', 'shadow', 'beacon', 'arcanist', 'voice'];
  /** Concept party of four, by SCREEN position (far strip is rotated 180°). */
  UI.PARTY4 = { nearLeft: 'guardian', nearRight: 'fury', farLeft: 'beacon', farRight: 'arcanist' };

  UI.ENEMY_COLOR = '#B8453A';
  UI.ENEMIES = {
    'tinnik-big': { name: 'Матёрый тинник', hp: 12, max: 12, ac: 13, token: 'token-tinnik-big', leader: true, intent: 'intent-strike', dmg: '1d8+2' },
    'tinnik-silt': { name: 'Илистый тинник', hp: 16, max: 16, ac: 12, token: 'token-tinnik', intent: 'intent-strike', dmg: '1d6+2' },
    'tinnik-small': { name: 'Мелкий тинник', hp: 8, max: 8, ac: 11, token: 'token-tinnik', minion: true, intent: 'intent-strike', dmg: '1d4+1' }
  };
  /** First fight «Мельничий Брод»: goal, round, default 12x9 positions (water = columns 6–7). */
  UI.FORD = {
    title: 'Мельничий Брод', map: 'map-ford', goal: 'Если падёт Матёрый тинник — остальные бегут', round: 1, rounds: 2,
    water: (function () { var a = []; for (var y = 1; y <= 7; y++) { a.push([6, y]); a.push([7, y]); } return a; })(),
    tokens: function () {
      return [
        { id: 'guardian', hero: 'guardian', x: 3, y: 4 },
        { id: 'fury', hero: 'fury', x: 3, y: 6 },
        { id: 'beacon', hero: 'beacon', x: 1, y: 3, far: true },
        { id: 'arcanist', hero: 'arcanist', x: 1, y: 5, far: true },
        { id: 'big', enemy: 'tinnik-big', x: 9, y: 4 },
        { id: 'silt', enemy: 'tinnik-silt', x: 8, y: 2 },
        { id: 'small1', enemy: 'tinnik-small', x: 9, y: 6 },
        { id: 'small2', enemy: 'tinnik-small', x: 10, y: 3 }
      ];
    }
  };

  function heroColor(id) { var hd = UI.HEROES[id]; return hd ? hd.color : 'var(--gold)'; }
  UI.heroColor = heroColor;

  /* ------------------------------------------------------------ geometry */
  function stageOf(el) { return el && el.closest ? el.closest('.stage') : null; }
  UI.stageOf = stageOf;
  function isRotated(el) {
    var r = el && el.closest && el.closest('[data-rot="180"]');
    return !!r && r !== null;
  }
  /** client point → local coordinates of `container` (scale + optional 180° stage turn). */
  UI.local = function (container, cx, cy) {
    if (cx && typeof cx === 'object') { var e = cx.touches ? cx.touches[0] : cx; cy = e.clientY; cx = e.clientX; }
    var r = container.getBoundingClientRect();
    var W = container.offsetWidth || r.width, H = container.offsetHeight || r.height;
    var k = r.width / W || 1;
    var x = (cx - r.left) / k, y = (cy - r.top) / k;
    if (isRotated(container)) { x = W - x; y = H - y; }
    return { x: x, y: y };
  };
  UI.center = function (el, container) {
    var r = el.getBoundingClientRect();
    return UI.local(container, r.left + r.width / 2, r.top + r.height / 2);
  };
  function farOf(el) { return !!(el && el.closest && el.closest('[data-far]')); }
  UI.isFar = farOf;

  UI.longPress = function (el, fn, ms) {
    ms = ms || 400;
    var t = null, sx = 0, sy = 0;
    function cancel() { if (t) { clearTimeout(t); t = null; } el.classList.remove('is-holding'); }
    el.addEventListener('pointerdown', function (e) {
      // nested long-press targets (a fan item inside its parent slot): the innermost one owns the press,
      // so holding «Огонь» shows «Огонь», not the parent «Чары» (owner feedback 2026-11-02, item 2)
      if (e.__lpOwner && e.__lpOwner !== el && el.contains(e.__lpOwner)) { cancel(); return; }
      e.__lpOwner = el;
      sx = e.clientX; sy = e.clientY; cancel();
      el.classList.add('is-holding');
      t = setTimeout(function () { t = null; el.classList.remove('is-holding'); el.__lp = Date.now(); fn(e); }, ms);
    });
    el.addEventListener('pointermove', function (e) { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, cancel); });
    el.addEventListener('click', function (e) { if (el.__lp && Date.now() - el.__lp < 700) { e.stopImmediatePropagation(); e.preventDefault(); el.__lp = 0; } }, true);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return el;
  };

  /* ------------------------------------------------------------ sound (WebAudio synth, no files) */
  var actx = null, master = null;
  function audio() {
    if (actx) return actx;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { actx = new AC(); master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination); } catch (e) { actx = null; }
    return actx;
  }
  function tone(f, dur, type, vol, when, f2) {
    var a = audio(); if (!a) return;
    var t0 = a.currentTime + (when || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol, when, freq, q) {
    var a = audio(); if (!a) return;
    var t0 = a.currentTime + (when || 0);
    var n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = a.createBufferSource(); src.buffer = b;
    var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 1;
    var g = a.createGain(); g.gain.value = vol || 0.1;
    src.connect(f); f.connect(g); g.connect(master); src.start(t0);
  }
  var SOUNDS = {
    tap: function () { noise(0.03, 0.05, 0, 2600, 2); tone(1500, 0.05, 'sine', 0.025); },
    open: function () { noise(0.18, 0.04, 0, 900, 0.7); },
    stamp: function () { tone(110, 0.32, 'sine', 0.35, 0, 48); noise(0.12, 0.22, 0, 400, 0.8); tone(620, 0.25, 'triangle', 0.04, 0.03); },
    dice: function () { for (var i = 0; i < 7; i++) noise(0.025, 0.09, i * (0.05 + Math.random() * 0.05), 1800 + Math.random() * 1500, 3); },
    turn: function () { tone(660, 0.9, 'sine', 0.06); tone(990, 1.1, 'sine', 0.035, 0.08); },
    'mic-on': function () { tone(520, 0.12, 'sine', 0.05, 0, 880); },
    'mic-off': function () { tone(880, 0.12, 'sine', 0.05, 0, 440); },
    hit: function () { tone(140, 0.2, 'sine', 0.25, 0, 60); noise(0.08, 0.15, 0, 700, 1); },
    crit: function () { tone(120, 0.35, 'sine', 0.3, 0, 40); noise(0.2, 0.2, 0, 500, 0.6); tone(880, 0.4, 'triangle', 0.05, 0.05); },
    miss: function () { noise(0.22, 0.06, 0, 1600, 0.5); },
    heal: function () { tone(523, 0.4, 'sine', 0.05); tone(784, 0.5, 'sine', 0.04, 0.08); tone(1046, 0.6, 'sine', 0.03, 0.16); },
    error: function () { tone(150, 0.16, 'square', 0.03); tone(120, 0.18, 'square', 0.03, 0.12); },
    flee: function () { noise(0.35, 0.05, 0, 900, 0.5); tone(400, 0.3, 'sine', 0.03, 0, 200); },
    pick: function () { tone(740, 0.12, 'triangle', 0.05); tone(1110, 0.18, 'sine', 0.035, 0.05); }
  };
  var gestured = false;   // never create an AudioContext before the first user gesture
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { gestured = true; }, { capture: true, once: true }); });
  UI.sound = function (name) {
    if (!UI.sound.enabled || !SOUNDS[name] || !gestured) return;
    var a = audio(); if (!a) return;
    if (a.state === 'suspended') a.resume();
    try { SOUNDS[name](); } catch (e) { /* audio is decoration */ }
  };
  UI.sound.enabled = true;

  /* ------------------------------------------------------------ juice */
  var PARTICLE_BUDGET = { table: 80, tv: 150, phone: 40, admin: 40, start: 60 };
  function fxLayer(c) {
    var l = c.querySelector(':scope > .fx-layer');
    if (!l) { l = h('div', { class: 'fx-layer' }); c.appendChild(l); }
    return l;
  }
  UI.fxLayer = fxLayer;
  function budgetOf(c) {
    var st = stageOf(c) || c;
    return PARTICLE_BUDGET[(st.dataset && st.dataset.surface) || 'table'] || 80;
  }
  function liveParticles(c) { var st = stageOf(c) || c; return st.querySelectorAll('.fx-spark').length; }

  UI.spark = function (c, x, y, color, n) {
    if (UI.reduced()) return;
    n = n || 9;
    var room = budgetOf(c) - liveParticles(c); n = Math.min(n, room); if (n <= 0) return;
    var l = fxLayer(c);
    var ring = h('div', { class: 'fx-tapring', style: { left: x + 'px', top: y + 'px', '--c': color || 'var(--gold-hi)' } });
    l.appendChild(ring); setTimeout(function () { ring.remove(); }, 420);
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.6, d = 26 + Math.random() * 34;
      var p = h('div', { class: 'fx-spark', style: { left: x + 'px', top: y + 'px', '--dx': (Math.cos(a) * d).toFixed(1) + 'px', '--dy': (Math.sin(a) * d).toFixed(1) + 'px', '--c': color || 'var(--gold-hi)' } });
      l.appendChild(p);
      setTimeout(p.remove.bind(p), 560);
    }
  };

  /** Number pop. kind: dmg | heal | miss | crit | info. Quick pops at the same spot merge (Hades).
      opts.both (table only, see «both long sides»): a shared number/word pops twice — the near copy
      upright at (x, y), the far copy turned 180° at the point mirrored through opts.around ({x, y},
      default 70 px below), so «6» and «9», «мимо», «+12» read right from both long sides. */
  UI.pop = function (c, x, y, text, kind, opts) {
    opts = opts || {};
    if (opts.both && onTable(c)) {
      var ar = opts.around || { x: x, y: y + 70 };
      var o1 = Object.assign({}, opts, { both: false, rot: 0 }), o2 = Object.assign({}, opts, { both: false, rot: 180 });
      var a = UI.pop(c, x, y, text, kind, o1), b = UI.pop(c, 2 * ar.x - x, 2 * ar.y - y, text, kind, o2);
      if (a && b && a !== b) { a.twin = b; b.twin = a; b.setAttribute('data-twin', ''); }
      return a;
    }
    var l = fxLayer(c), now = Date.now();
    var num = typeof text === 'number' ? text : (/^[+-]?\d+$/.test(String(text)) ? parseInt(text, 10) : null);
    if (num != null) {
      var prev = [].slice.call(l.querySelectorAll('.fx-pop')).filter(function (p) {
        return p.__kind === kind && p.__rot === (opts.rot || 0) && now - p.__t < 380 && Math.hypot(p.__x - x, p.__y - y) < 40 && p.__num != null;
      })[0];
      if (prev) {
        prev.__num += num; prev.__t = now;
        prev.querySelector('.fx-pop__n').textContent = (kind === 'heal' ? '+' : '') + Math.abs(prev.__num);
        var pin = prev.querySelector('.fx-pop__in'); pin.style.animation = 'none'; void pin.offsetWidth; pin.style.animation = '';
        return prev;
      }
    }
    var label = num != null ? (kind === 'heal' ? '+' : '') + Math.abs(num) : (kind === 'miss' && !text ? 'мимо' : text);
    var p = h('div', { class: 'fx-pop fx-pop--' + (kind || 'dmg'), style: { left: x + 'px', top: y + 'px', '--rot': (opts.rot || 0) + 'deg', '--fs': opts.size ? opts.size + 'px' : null } },
      h('span', { class: 'fx-pop__in' },
        kind === 'heal' ? UI.icon('heart', 'fx-pop__ic') : null,
        h('span', { class: 'fx-pop__n', text: label })));
    p.__t = now; p.__x = x; p.__y = y; p.__num = num; p.__kind = kind; p.__rot = opts.rot || 0;
    l.appendChild(p);
    setTimeout(function () { p.remove(); }, 1100);
    return p;
  };

  UI.flash = function (c, color, ms) {
    var l = fxLayer(c);
    var f = h('div', { class: 'fx-flash', style: { '--c': color || 'rgba(255,240,200,.55)', '--ms': (ms || 360) + 'ms' } });
    l.appendChild(f); setTimeout(function () { f.remove(); }, (ms || 360) + 60);
  };

  UI.stampFx = function (c, x, y, color) {
    var l = fxLayer(c);
    var g = h('div', { class: 'fx-stamp', style: { left: x + 'px', top: y + 'px', '--c': color || 'var(--gold)' } },
      h('div', { class: 'fx-stamp__ring' }), h('div', { class: 'fx-stamp__ring fx-stamp__ring--2' }));
    l.appendChild(g); setTimeout(function () { g.remove(); }, 900);
    UI.spark(c, x, y, color || 'var(--gold-hi)', 14);
  };

  /** Screen shake — TV only, ≤6 px (rule 11). */
  UI.shake = function (stage, px) {
    if (UI.reduced() || !stage || stage.dataset.surface !== 'tv') return;
    stage.style.setProperty('--shake', Math.min(6, px || 6) + 'px');
    stage.classList.remove('fx-shaking'); void stage.offsetWidth; stage.classList.add('fx-shaking');
    setTimeout(function () { stage.classList.remove('fx-shaking'); }, 420);
  };

  /** Global tap feedback for a stage: press + spark + click sound on button / [data-tap]. */
  UI.bindTapFx = function (stage) {
    if (stage.__tapfx) return;
    stage.__tapfx = true;
    stage.addEventListener('pointerdown', function (e) {
      var t = e.target.closest && e.target.closest('button, [data-tap], .ui-tap');
      if (!t || !stage.contains(t) || t.disabled || t.getAttribute('aria-disabled') === 'true') return;
      var p = UI.local(stage, e.clientX, e.clientY);
      var col = getComputedStyle(t).getPropertyValue('--hero').trim() || 'var(--gold-hi)';
      UI.spark(stage, p.x, p.y, col, 7);
      t.classList.add('is-pressed');
      var up = function () { t.classList.remove('is-pressed'); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
      window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      if (!t.hasAttribute('data-silent')) UI.sound('tap');
    });
  };

  /* ------------------------------------------------------------ ornament */
  function rhomb(cls) {
    return s('svg', { class: cls, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
      s('path', { d: 'M12 1.5 22.5 12 12 22.5 1.5 12Z', class: 'orn-o' }),
      s('path', { d: 'M12 6 18 12 12 18 6 12Z', class: 'orn-i' }),
      s('path', { d: 'M12 8.6v6.8M8.6 12h6.8', class: 'orn-x' }));
  }
  UI.rhomb = rhomb;

  /** Ornamental frame. opts: {gold, jewel, cls, tag, style, pad, parch} */
  UI.frame = function (opts) {
    opts = opts || {};
    var kids = [].slice.call(arguments, 1);
    var el = h(opts.tag || 'div', { class: 'frame' + (opts.gold ? ' frame--gold' : '') + (opts.parch ? ' frame--parch' : '') + (opts.cls ? ' ' + opts.cls : ''), style: opts.style });
    if (opts.pad != null) el.style.setProperty('--pad', typeof opts.pad === 'number' ? opts.pad + 'px' : opts.pad);
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { el.appendChild(rhomb('frame__corner frame__corner--' + c)); });
    if (opts.jewel) el.appendChild(rhomb('frame__jewel'));
    var body = h('div', { class: 'frame__body' });
    append(body, kids);
    el.appendChild(body);
    el.body = body;
    return el;
  };

  /** Divider: line — rhomb — line. opts: {gold, width} */
  UI.rule = function (opts) {
    opts = opts || {};
    return h('div', { class: 'orn-rule' + (opts.gold ? ' orn-rule--gold' : ''), style: opts.width ? { width: opts.width + 'px' } : null },
      h('i'), rhomb('orn-rule__r'), h('i'));
  };

  /* ------------------------------------------------------------ seal */
  var WAX_PATH = (function () {
    var pts = [], n = 22;
    for (var i = 0; i <= n * 4; i++) {
      var a = (i / (n * 4)) * Math.PI * 2;
      var r = 47 + Math.sin(a * n) * 1.6 + Math.sin(a * 5 + 1) * 0.9;
      pts.push((50 + Math.cos(a) * r).toFixed(2) + ' ' + (50 + Math.sin(a) * r).toFixed(2));
    }
    return 'M' + pts.join(' L') + 'Z';
  })();

  /**
   * Gold wax seal.  opts: {icon='seal', word='Подтвердить', size, hold=0 (ms, 0 = tap),
   *   main=true (pulse + data-main), onPress(el), disabled, small (no ribbon)}
   * el.stamp() → Promise (plays stamp, sound, fx);  el.show() / el.hide();  el.setWord(w) / el.setIcon(n)
   */
  UI.seal = function (opts) {
    opts = opts || {};
    ensureDefs();
    var el = h('button', { class: 'seal' + (opts.main !== false ? ' is-main' : '') + (opts.cls ? ' ' + opts.cls : ''), type: 'button', 'data-silent': true, 'aria-label': opts.word || 'Подтвердить' });
    if (opts.size) el.style.setProperty('--s', opts.size + 'px');
    if (opts.main !== false) el.setAttribute('data-main', '');
    var disk = h('span', { class: 'seal__disk' });
    disk.appendChild(s('svg', { class: 'seal__wax', viewBox: '0 0 100 100', 'aria-hidden': 'true' },
      s('path', { d: WAX_PATH, fill: 'url(#ui-g-wax)', class: 'seal__blob' }),
      s('circle', { cx: 50, cy: 50, r: 37, fill: 'url(#ui-g-wax-in)', class: 'seal__well' }),
      s('circle', { cx: 50, cy: 50, r: 37, fill: 'none', class: 'seal__lip' }),
      s('circle', { cx: 50, cy: 50, r: 32, fill: 'none', class: 'seal__dots' })));
    var ic = UI.icon(opts.icon || 'seal', 'seal__icon');
    disk.appendChild(ic);
    var hold = s('svg', { class: 'seal__hold', viewBox: '0 0 100 100', 'aria-hidden': 'true' },
      s('circle', { cx: 50, cy: 50, r: 46, pathLength: 100 }));
    disk.appendChild(hold);
    el.appendChild(h('span', { class: 'seal__halo' }));
    el.appendChild(disk);
    var txt;
    if (!opts.small) {
      var rib = s('svg', { class: 'seal__ribbon', viewBox: '0 0 220 56', 'aria-hidden': 'true' },
        s('path', { d: 'M8 14 L30 18 Q110 34 190 18 L212 14 L202 30 L212 46 L188 42 Q110 58 32 42 L8 46 L18 30Z', fill: 'url(#ui-g-ribbon)', class: 'seal__band' }),
        s('path', { d: 'M30 22 Q110 38 190 22', fill: 'none', class: 'seal__stitch' }),
        s('path', { d: 'M30 38 Q110 54 190 38', fill: 'none', class: 'seal__stitch' }),
        s('path', { d: 'M26 33 Q110 49 194 33', fill: 'none', class: 'seal__arc' }));
      var pid = 'seal-arc-' + (++UI._uid);
      rib.querySelector('.seal__arc').setAttribute('id', pid);
      txt = s('text', { class: 'seal__word', 'text-anchor': 'middle' });
      var tp = s('textPath', { startOffset: '50%' }); tp.setAttribute('href', '#' + pid);
      tp.textContent = opts.word || 'Подтвердить';
      txt.appendChild(tp); rib.appendChild(txt);
      el.appendChild(rib);
      el.__tp = tp;
    }
    el.setWord = function (w) { if (el.__tp) el.__tp.textContent = w; el.setAttribute('aria-label', w); fitWord(); };
    el.setIcon = function (n) { setIcon(ic, n); };
    function fitWord() {
      if (!el.__tp) return;
      var len = (el.__tp.textContent || '').length;
      txt.setAttribute('font-size', len > 10 ? 19 : len > 7 ? 22 : 25);
    }
    fitWord();
    var busy = false;
    function fire() {
      if (busy || el.disabled) return;
      if (opts.onPress) opts.onPress(el); else el.stamp();
    }
    if (opts.hold) {
      el.classList.add('seal--hold');
      el.style.setProperty('--hold', opts.hold + 'ms');
      var ht = null;
      el.addEventListener('pointerdown', function () {
        if (el.disabled) return;
        el.classList.add('is-charging');
        ht = setTimeout(function () { ht = null; el.classList.remove('is-charging'); fire(); }, opts.hold);
      });
      var stop = function () { if (ht) { clearTimeout(ht); ht = null; } el.classList.remove('is-charging'); };
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { el.addEventListener(ev, stop); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
    } else {
      el.addEventListener('click', fire);
    }
    el.stamp = function (o) {
      o = o || {};
      busy = true;
      el.classList.remove('is-stamping'); void el.offsetWidth; el.classList.add('is-stamping');
      if (!o.silent) UI.sound('stamp');
      var st = stageOf(el);
      if (st) { var c = UI.center(disk, st); UI.stampFx(st, c.x, c.y); }
      return new Promise(function (res) {
        setTimeout(function () {
          el.classList.remove('is-stamping'); busy = false;
          if (o.hide !== false) el.hide();
          res(el);
        }, UI.reduced() ? 120 : 620);
      });
    };
    el.show = function () { el.hidden = false; el.classList.remove('is-gone'); el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in'); return el; };
    el.hide = function () { el.classList.add('is-gone'); setTimeout(function () { if (el.classList.contains('is-gone')) el.hidden = true; }, 320); return el; };
    if (opts.disabled) el.disabled = true;
    return el;
  };
  UI._uid = 0;

  /* ------------------------------------------------------------ medallion */
  function heartSvg() {
    return s('svg', { class: 'medal__hi', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
      s('path', { d: 'M12 21.2s-7.9-4.8-9.9-9.6C.6 7.9 2.9 3.6 6.9 3.6c2.2 0 3.8 1.2 5.1 2.9 1.3-1.7 2.9-2.9 5.1-2.9 4 0 6.3 4.3 4.8 8-2 4.8-9.9 9.6-9.9 9.6z' }));
  }
  UI.heartSvg = heartSvg;
  var SPIKES = (function () {
    var pts = [], n = 16;
    for (var i = 0; i < n * 2; i++) {
      var a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 44 : 50;
      pts.push((50 + Math.cos(a) * r).toFixed(2) + ',' + (50 + Math.sin(a) * r).toFixed(2));
    }
    return pts.join(' ');
  })();
  UI.SPIKES = SPIKES;

  /**
   * Round portrait medallion.  opts: {hero | img (art key), enemy, color, size=140, hp, max,
   *   heart=true, state: ''|'active'|'dim'|'dead'|'dying', badges:[icon names], ring=true, cls}
   * el.setHp(hp, max?) ; el.setState(s) ; el.setBadges([...])
   */
  UI.medallion = function (opts) {
    opts = opts || {};
    ensureDefs();
    var hero = opts.hero && UI.HEROES[opts.hero];
    var enemy = opts.enemy && (UI.ENEMIES[opts.enemy] || {});
    var color = opts.color || (hero ? hero.color : enemy ? UI.ENEMY_COLOR : 'var(--bronze-hi)');
    var size = opts.size || 140;
    var el = h('div', { class: 'medal' + (enemy ? ' medal--enemy' : '') + (opts.cls ? ' ' + opts.cls : ''), style: { '--s': size + 'px', '--hero': color } });
    if (hero) el.dataset.hero = hero.id;
    el.appendChild(h('div', { class: 'medal__glow' }));
    if (enemy) el.appendChild(s('svg', { class: 'medal__ring medal__spk', viewBox: '0 0 100 100', 'aria-hidden': 'true' },
      s('polygon', { points: SPIKES, class: 'medal__spikes', fill: 'url(#ui-g-enemy)' })));
    var img = h('div', { class: 'medal__img' });
    bgArt(img, opts.img || (hero ? 'bust-' + hero.id : enemy ? enemy.token : null));
    el.appendChild(img);
    var ring = s('svg', { class: 'medal__ring', viewBox: '0 0 100 100', 'aria-hidden': 'true' });
    ring.appendChild(s('circle', { cx: 50, cy: 50, r: 46.5, class: 'medal__rim' }));
    ring.appendChild(s('circle', { cx: 50, cy: 50, r: 43, class: 'medal__hue' }));
    var track = s('circle', { cx: 50, cy: 50, r: 39.5, class: 'medal__track' });
    var arc = s('circle', { cx: 50, cy: 50, r: 39.5, class: 'medal__hp', pathLength: 100, transform: 'rotate(-90 50 50)' });
    var showHp = opts.hp != null;
    if (showHp) { ring.appendChild(track); ring.appendChild(arc); }
    // img sits inside ring; for enemies a bit smaller
    el.appendChild(ring);
    var heart = null, heartN = null;
    if (showHp && opts.heart !== false) {
      heartN = h('span', { class: 'medal__hn' });
      heart = h('div', { class: 'medal__heart' }, heartSvg(), heartN);
      el.appendChild(heart);
    }
    var badges = h('div', { class: 'medal__badges' });
    el.appendChild(badges);
    var stateIc = h('div', { class: 'medal__state' });
    el.appendChild(stateIc);
    var cur = { hp: opts.hp, max: opts.max || (hero ? hero.max : enemy ? enemy.max : opts.hp) };
    el.setHp = function (hp, max) {
      if (max != null) cur.max = max;
      cur.hp = Math.max(0, hp);
      if (!showHp) return el;
      var f = cur.max ? cur.hp / cur.max : 0;
      arc.setAttribute('stroke-dasharray', (f * 100).toFixed(1) + ' 100');
      el.classList.toggle('is-low', f <= 0.25 && cur.hp > 0);
      if (heartN) heartN.textContent = cur.hp;
      if (heart) { heart.classList.remove('is-bump'); void heart.offsetWidth; heart.classList.add('is-bump'); }
      return el;
    };
    el.getHp = function () { return cur.hp; };
    el.setState = function (st) {
      ['active', 'dim', 'dead', 'dying', 'off'].forEach(function (k) { el.classList.toggle('is-' + k, st === k); });
      stateIc.innerHTML = '';
      if (st === 'dead' || st === 'dying') stateIc.appendChild(UI.icon('skull'));
      if (st === 'stable') stateIc.appendChild(UI.icon('bandage'));
      return el;
    };
    el.setBadges = function (list) {
      badges.innerHTML = '';
      (list || []).forEach(function (b) { badges.appendChild(h('span', { class: 'medal__badge' }, UI.icon(b))); });
      return el;
    };
    if (showHp) el.setHp(opts.hp, cur.max);
    if (opts.state) el.setState(opts.state);
    if (opts.badges) el.setBadges(opts.badges);
    return el;
  };

  /* ------------------------------------------------------------ ability slot + fan */
  var COST_ICON = { action: 'cost-action', bonus: 'cost-bonus', reaction: 'cost-reaction', slot: 'cost-slot', cantrip: 'cost-cantrip', move: 'boot' };
  var REASON_TEXT = { lock: 'Недоступно', hourglass: 'Уже потрачено', crystal: 'Нет ячеек', cost: 'Действие потрачено' };

  /**
   * Ability slot.  opts: {art, icon, label, cost, lvl, color/hero, size, state, reason, reasonText,
   *   fan:[slot opts], onTap(el, opts), onPick(childOpts, childEl), info, title, key}
   * states: ready | selected | disabled | used.  reason: lock | hourglass | crystal
   * Long-press (400 ms) opens an info sheet facing the presser.
   */
  UI.slot = function (opts) {
    opts = opts || {};
    var color = opts.color || (opts.hero ? heroColor(opts.hero) : null);
    var el = h('button', { class: 'slot', type: 'button', 'data-key': opts.key || null, 'aria-label': opts.label || opts.key || '' });
    if (color) el.style.setProperty('--hero', color);
    if (opts.size) el.style.setProperty('--s', opts.size + 'px');
    var disk = h('span', { class: 'slot__disk' });
    var pic = h('span', { class: 'slot__pic' });
    if (opts.art) bgArt(pic, opts.art); else if (opts.icon) pic.appendChild(UI.icon(opts.icon, 'slot__ic'));
    disk.appendChild(pic);
    disk.appendChild(h('span', { class: 'slot__rim' }));
    el.appendChild(disk);
    if (opts.cost && COST_ICON[opts.cost]) {
      var ci = opts.cost === 'slot' && opts.lvl ? 'cost-slot-' + opts.lvl : COST_ICON[opts.cost];
      el.appendChild(h('span', { class: 'slot__cost slot__cost--' + opts.cost }, UI.icon(ci)));
    }
    if (opts.fan) el.appendChild(h('span', { class: 'slot__more' }, h('i'), h('i'), h('i')));
    var reasonEl = h('span', { class: 'slot__reason' });
    el.appendChild(reasonEl);
    var label = opts.label ? h('span', { class: 'slot__label', text: opts.label }) : null;
    if (label) el.appendChild(label);
    el.opts = opts;
    el.setState = function (st, reason) {
      el.dataset.state = st || 'ready';
      el.setAttribute('aria-disabled', st === 'disabled' ? 'true' : 'false');
      reasonEl.innerHTML = '';
      if (st === 'disabled' && (reason || opts.reason)) reasonEl.appendChild(UI.icon(reason || opts.reason));
      if (st === 'used') reasonEl.appendChild(UI.icon('check'));
      el.__reason = reason || opts.reason;
      return el;
    };
    el.setLabel = function (t) { if (label) label.textContent = t; };
    el.setArt = function (k) { pic.style.backgroundImage = ''; bgArt(pic, k); };
    el.setState(opts.state || 'ready', opts.reason);
    el.addEventListener('click', function (e) {
      var ownFan = e.target.closest('.fan'); if (ownFan && ownFan !== el && el.contains(ownFan) && e.target.closest('.slot') !== el) return;   // clicks on items of our open fan belong to them
      var st = el.dataset.state;
      if (st === 'disabled') {
        UI.sound('error');
        el.classList.remove('is-nope'); void el.offsetWidth; el.classList.add('is-nope');
        var stg = stageOf(el);
        if (stg) UI.toastFor(el, { icon: el.__reason || 'lock', text: opts.reasonText || REASON_TEXT[el.__reason] || 'Недоступно' });
        return;
      }
      if (opts.fan) { UI.fan(el, opts.fan, { color: color, onPick: opts.onPick }); return; }
      if (opts.onTap) opts.onTap(el, opts);
    });
    if (opts.info) UI.longPress(el, function () { UI.sheetFor(el, { icon: opts.icon, art: opts.art, title: opts.title || opts.label, text: opts.info, cost: opts.cost, lvl: opts.lvl }); });
    return el;
  };
  /** Cost chip for an info sheet: icon + one word (action, bonus, reaction, spell slot with its circle …). */
  var COST_WORD = { action: 'Действие', bonus: 'Бонус', reaction: 'Реакция', slot: 'Ячейка', cantrip: 'Заговор', move: 'Движение', free: 'Свободно' };
  function costChip(cost, lvl) {
    if (!cost || !COST_WORD[cost]) return null;
    var ic = cost === 'slot' && lvl ? 'cost-slot-' + lvl : COST_ICON[cost];
    return h('span', { class: 'sheet__cost sheet__cost--' + cost }, ic ? UI.icon(ic) : null,
      h('span', { text: COST_WORD[cost] + (cost === 'slot' && lvl ? ' ' + ['', 'I', 'II', 'III'][lvl] + ' круга' : '') }));
  }

  /** Fan: arc of up to 8 slots above `slotEl`.  items: slot opts.  opts: {color, onPick(item, el)} */
  UI.fan = function (slotEl, items, opts) {
    opts = opts || {};
    var old = slotEl.querySelector(':scope > .fan');
    if (old) { closeFan(old); return null; }
    var st = stageOf(slotEl);
    if (st) [].slice.call(st.querySelectorAll('.fan')).forEach(closeFan);
    var n = Math.min(items.length, 8);
    var spread = Math.min(150, Math.max(70, n * 30)) * Math.PI / 180;
    var R = Math.max(104, (n * 86) / spread);
    var fan = h('div', { class: 'fan', style: { '--r': R + 'px' } });
    fan.appendChild(h('div', { class: 'fan__veil' }));
    items.slice(0, 8).forEach(function (it, i) {
      var a = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
      var child = UI.slot(Object.assign({ color: opts.color }, it, {
        fan: null,
        onTap: function (ce) {
          closeFan(fan);
          if (it.onTap) it.onTap(ce, it);
          if (opts.onPick) opts.onPick(it, ce);
        }
      }));
      child.classList.add('fan__item');
      child.style.setProperty('--x', (Math.sin(a) * R).toFixed(1) + 'px');
      child.style.setProperty('--y', (-Math.cos(a) * R).toFixed(1) + 'px');
      child.style.setProperty('--i', i);
      fan.appendChild(child);
    });
    slotEl.appendChild(fan);
    slotEl.classList.add('is-fanned');
    UI.sound('open');
    requestAnimationFrame(function () { fan.classList.add('is-open'); });
    setTimeout(function () {
      function away(e) {
        if (!fan.isConnected) { document.removeEventListener('pointerdown', away, true); return; }
        if (fan.contains(e.target) && e.target.closest('.fan__item')) return;
        if (slotEl.contains(e.target) && !e.target.closest('.fan')) { document.removeEventListener('pointerdown', away, true); return; }
        closeFan(fan); document.removeEventListener('pointerdown', away, true);
      }
      document.addEventListener('pointerdown', away, true);
    }, 0);
    return fan;
  };
  function closeFan(fan) {
    if (!fan || !fan.parentNode) return;
    fan.parentNode.classList.remove('is-fanned');
    fan.classList.remove('is-open'); fan.classList.add('is-closing');
    setTimeout(function () { fan.remove(); }, 220);
  }
  UI.closeFans = function (root) { [].slice.call((root || document).querySelectorAll('.fan')).forEach(closeFan); };

  UI.endTurn = function (opts) {
    opts = opts || {};
    var el = h('button', { class: 'endturn', type: 'button', 'aria-label': 'Конец хода' },
      h('span', { class: 'endturn__disk' }, UI.icon('hourglass')),
      opts.label === '' ? null : h('span', { class: 'slot__label', text: opts.label || 'Конец' }));
    if (opts.color) el.style.setProperty('--hero', opts.color);
    if (opts.onTap) el.addEventListener('click', function () { opts.onTap(el); });
    UI.longPress(el, function () { UI.sheetFor(el, { icon: 'hourglass', title: 'Конец хода', text: 'Передать ход следующему. Неистраченные действия сгорают.' }); });
    return el;
  };

  /* ------------------------------------------------------------ mic + Severin */
  var MIC_STATES = ['idle', 'listening', 'thinking', 'speaking'];
  function voiceFx() {
    return h('span', { class: 'vfx' },
      h('i', { class: 'vfx__rip' }), h('i', { class: 'vfx__rip vfx__rip--2' }), h('i', { class: 'vfx__rip vfx__rip--3' }),
      h('span', { class: 'vfx__orbit' }, h('b'), h('b'), h('b')),
      h('span', { class: 'vfx__wave' }, h('b'), h('b'), h('b'), h('b'), h('b')));
  }
  /**
   * Mic.  opts: {color/hero, size=72 (token --mic), state, onChange(state), onTap(el) (overrides the demo cycle)}
   * Demo: tap cycles idle → listening → thinking → speaking → idle.
   */
  UI.mic = function (opts) {
    opts = opts || {};
    var color = opts.color || (opts.hero ? heroColor(opts.hero) : 'var(--gold)');
    var el = h('button', { class: 'mic', type: 'button', 'aria-label': 'Микрофон', style: { '--hero': color } });
    if (opts.size) el.style.setProperty('--s', opts.size + 'px');
    el.appendChild(voiceFx());
    el.appendChild(h('span', { class: 'mic__disk' }, UI.icon('mic', 'mic__ic')));
    el.setState = function (st) {
      var prev = el.dataset.state;
      el.dataset.state = st;
      if (prev && prev !== st) {
        if (st === 'listening') UI.sound('mic-on');
        if (prev === 'listening') UI.sound('mic-off');
      }
      if (opts.onChange && prev !== st) opts.onChange(st, el);
      return el;
    };
    el.state = function () { return el.dataset.state; };
    el.dataset.state = opts.state || 'idle';
    el.addEventListener('click', function () {
      if (opts.onTap) return opts.onTap(el);
      var i = MIC_STATES.indexOf(el.dataset.state);
      el.setState(MIC_STATES[(i + 1) % MIC_STATES.length]);
    });
    return el;
  };
  UI.MIC_STATES = MIC_STATES;

  /** Severin medallion.  opts: {size=120, state: idle|listening|thinking|speaking, onTap(el), cycle (demo)} */
  UI.severin = function (opts) {
    opts = opts || {};
    var el = h('button', { class: 'severin', type: 'button', 'aria-label': 'Северин Кроу' });
    if (opts.size) el.style.setProperty('--s', opts.size + 'px');
    el.appendChild(voiceFx());
    var img = h('span', { class: 'severin__img' }); bgArt(img, 'severin-bust');
    el.appendChild(h('span', { class: 'severin__disk' }, img, h('span', { class: 'severin__rim' })));
    el.setState = function (st) { el.dataset.state = st; return el; };
    el.state = function () { return el.dataset.state; };
    el.dataset.state = opts.state || 'idle';
    el.addEventListener('click', function () {
      if (opts.onTap) return opts.onTap(el);
      if (opts.cycle !== false) { var i = MIC_STATES.indexOf(el.dataset.state); el.setState(MIC_STATES[(i + 1) % 4]); }
    });
    if (opts.onLong) UI.longPress(el, function () { opts.onLong(el); });
    return el;
  };

  /* ------------------------------------------------------------ dice */
  var DIE_SHAPES = {
    d4: { outer: '50,6 95,88 5,88', inner: ['50,6 50,62', '50,62 95,88', '50,62 5,88'], ty: 66 },
    d6: { outer: '12,12 88,12 88,88 12,88', inner: [], ty: 54, rx: 14 },
    d8: { outer: '50,3 95,50 50,97 5,50', inner: ['5,50 95,50'], ty: 40, split: true },
    d10: { outer: '50,3 95,42 50,97 5,42', inner: ['5,42 30,56 50,97', '95,42 70,56 50,97', '30,56 70,56', '30,56 50,3', '70,56 50,3'], ty: 47 },
    d12: { outer: '50,3 94,35 77,90 23,90 6,35', inner: ['50,20 72,42 63,70 37,70 28,42 50,20', '50,3 50,20', '94,35 72,42', '77,90 63,70', '23,90 37,70', '6,35 28,42'], ty: 52 },
    d20: { outer: '50,3 91,26 91,74 50,97 9,74 9,26', inner: ['50,24 77,70 23,70 50,24', '50,3 50,24', '91,26 50,24', '9,26 50,24', '91,26 77,70', '91,74 77,70', '50,97 77,70', '50,97 23,70', '9,74 23,70', '9,26 23,70'], ty: 56 }
  };
  /** SVG die.  type d4..d20; opts {value, size, label (small corner tag), color} ; el.setValue(v, flash) */
  UI.die = function (type, opts) {
    opts = opts || {};
    ensureDefs();
    var shp = DIE_SHAPES[type] || DIE_SHAPES.d20;
    var el = h('div', { class: 'die die--' + type, style: opts.size ? { '--s': opts.size + 'px' } : null });
    var svg = s('svg', { viewBox: '0 0 100 100', class: 'die__svg', 'aria-hidden': 'true' });
    if (type === 'd6') svg.appendChild(s('rect', { x: 12, y: 12, width: 76, height: 76, rx: 14, class: 'die__body', fill: 'url(#ui-g-bone)' }));
    else svg.appendChild(s('polygon', { points: shp.outer, class: 'die__body', fill: 'url(#ui-g-bone)' }));
    shp.inner.forEach(function (p) { svg.appendChild(s('polyline', { points: p, class: 'die__edge' })); });
    var num = s('text', { x: 50, y: shp.ty + 8, 'text-anchor': 'middle', class: 'die__num' });
    svg.appendChild(num);
    el.appendChild(svg);
    if (opts.label != null) el.appendChild(h('span', { class: 'die__tag', text: String(opts.label) }));
    el.setValue = function (v, flash) {
      num.textContent = v == null || v === '' ? '?' : String(v);
      el.classList.toggle('is-empty', v == null || v === '');
      num.setAttribute('font-size', String(v || '').length > 2 ? 26 : String(v || '').length > 1 ? 34 : 40);   // «?» ≥ 48 px on a 120+ px die
      if (flash) { el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); }
      return el;
    };
    el.setValue(opts.value);
    return el;
  };

  function fmtMod(m) { return (m >= 0 ? '+' : '−') + Math.abs(m); }
  UI.fmtMod = fmtMod;

  /**
   * Dice card (rule 13: only reachable values, never auto-filled).
   * opts: {die='d20', mod=0, n=1, groups:[{die, n, mod, label}], adv:'adv'|'dis', dc, color/hero,
   *        word='Бросай', layout:'table'|'phone', mic=true, onConfirm(values, el), onMic(el)}
   * For adv/dis: two d20 + arrow, ONE number is entered (the kept die).
   * Range > 20 → keypad 3×4 with a big display.
   */
  UI.diceCard = function (opts) {
    opts = opts || {};
    var color = opts.color || (opts.hero ? heroColor(opts.hero) : 'var(--gold)');
    var groups = opts.groups || [{ die: opts.die || 'd20', n: opts.n || 1, mod: opts.mod || 0 }];
    groups.forEach(function (g) {
      var faces = parseInt(String(g.die).slice(1), 10) || 20;
      g.min = g.n || 1; g.max = (g.n || 1) * faces; g.value = null;
    });
    var phone = opts.layout === 'phone';
    var el = h('div', { class: 'dcard' + (phone ? ' dcard--phone' : '') + (opts.adv ? ' dcard--adv' : ''), style: { '--hero': color } });
    var left = h('div', { class: 'dcard__left' });
    left.appendChild(h('div', { class: 'dcard__word', text: opts.word || 'Бросай' }));
    var diceRow = h('div', { class: 'dcard__dice' });
    left.appendChild(diceRow);
    var active = 0;
    var dieEls = [];
    if (opts.adv) {
      var pair = h('div', { class: 'dcard__adv dcard__adv--' + opts.adv });
      var d1 = UI.die('d20', { size: phone ? 52 : 84 }), d2 = UI.die('d20', { size: phone ? 52 : 84 });
      pair.appendChild(d1); pair.appendChild(h('span', { class: 'dcard__advic' }, UI.icon(opts.adv === 'adv' ? 'adv' : 'dis'))); pair.appendChild(d2);
      diceRow.appendChild(pair);
      dieEls = [d1];
      d1.__twin = d2;
    } else {
      groups.forEach(function (g, i) {
        var d = UI.die(g.die, { size: groups.length > 1 ? (phone ? 48 : 70) : (phone ? 64 : 140), label: groups.length > 1 ? (g.label || i + 1) : null });
        d.classList.add('ui-tap'); d.setAttribute('data-tap', '');
        d.addEventListener('click', function () { select(i); });
        diceRow.appendChild(d); dieEls.push(d);
      });
    }
    var mod = groups.length === 1 ? (groups[0].mod || 0) : null;
    if (mod) left.appendChild(h('div', { class: 'dcard__mod', text: fmtMod(mod) }));
    if (opts.dc) left.appendChild(h('div', { class: 'dcard__dc' }, UI.icon('dc-shield'), h('b', { text: String(opts.dc) })));
    el.appendChild(left);

    var mid = h('div', { class: 'dcard__mid' });
    el.appendChild(mid);
    var right = h('div', { class: 'dcard__right' });
    var micEl = opts.mic === false ? null : UI.mic({ color: color, size: phone ? 56 : 64, onTap: opts.onMic });
    if (micEl) right.appendChild(micEl);
    ensureDefs();
    var ok = h('button', { class: 'dcard__ok', type: 'button', disabled: true, 'aria-label': 'Готово' },
      s('svg', { class: 'seal__wax', viewBox: '0 0 100 100', 'aria-hidden': 'true' },
        s('path', { d: WAX_PATH, fill: 'url(#ui-g-wax)' }),
        s('circle', { cx: 50, cy: 50, r: 37, fill: 'url(#ui-g-wax-in)' }),
        s('circle', { cx: 50, cy: 50, r: 37, fill: 'none', class: 'seal__lip' })),
      UI.icon('check'));
    right.appendChild(ok);
    el.appendChild(right);
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { el.appendChild(rhomb('frame__corner frame__corner--' + c)); });

    var display = null;
    function renderTiles() {
      mid.innerHTML = '';
      var g = groups[active];
      var count = g.max - g.min + 1;
      if (count > 20) {
        display = h('div', { class: 'dcard__display', text: g.value != null ? String(g.value) : '' });
        var pad = h('div', { class: 'dcard__pad' });
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'clear'].forEach(function (k) {
          var b = h('button', { class: 'tile tile--key', type: 'button' }, k === 'back' ? UI.icon('back') : k === 'clear' ? UI.icon('cross') : k);
          b.addEventListener('click', function () { key(k); });
          pad.appendChild(b);
        });
        mid.appendChild(display); mid.appendChild(pad);
        mid.classList.add('is-pad');
        return;
      }
      mid.classList.remove('is-pad');
      var cols = phone ? 5 : (count > 14 ? 7 : count > 7 ? Math.ceil(count / 2) : count);
      var grid = h('div', { class: 'dcard__tiles', style: { '--cols': cols } });
      for (var v = g.min; v <= g.max; v++) {
        (function (val) {
          var t = h('button', { class: 'tile' + (g.value === val ? ' is-on' : '') + (val === g.max && g.die === 'd20' && g.n === 1 ? ' tile--nat' : ''), type: 'button', text: String(val) });
          t.addEventListener('click', function () { setVal(val); });
          grid.appendChild(t);
        })(v);
      }
      mid.appendChild(grid);
    }
    var typed = '';
    function key(k) {
      var g = groups[active];
      if (k === 'back') typed = typed.slice(0, -1);
      else if (k === 'clear') typed = '';
      else if (typed.length < 3) typed += k;
      var v = typed === '' ? null : parseInt(typed, 10);
      var okv = v != null && v >= g.min && v <= g.max;
      display.textContent = typed;
      display.classList.toggle('is-bad', v != null && !okv);
      g.value = okv ? v : null;
      dieEls[active].setValue(okv ? v : null, okv);
      refresh();
    }
    function setVal(v) {
      var g = groups[active];
      g.value = v;
      var d = dieEls[active];
      d.setValue(v, true);
      if (d.__twin) d.__twin.setValue(opts.adv === 'adv' ? '≤' + v : '≥' + v);
      UI.sound('pick');
      renderTiles();
      refresh();
      var next = groups.findIndex(function (x) { return x.value == null; });
      if (next >= 0 && next !== active) setTimeout(function () { select(next); }, 160);
    }
    function select(i) {
      active = i; typed = groups[i].value != null ? String(groups[i].value) : '';
      dieEls.forEach(function (d, j) { d.classList.toggle('is-active', j === i && groups.length > 1); });
      renderTiles();
    }
    function refresh() {
      var all = groups.every(function (g) { return g.value != null; });
      ok.disabled = !all;
      ok.classList.toggle('is-main', all);
      if (all) ok.setAttribute('data-main', ''); else ok.removeAttribute('data-main');
    }
    ok.addEventListener('click', function () {
      if (ok.disabled) return;
      var vals = groups.map(function (g) { return g.value; });
      el.classList.add('is-done');
      UI.sound('pick');
      if (opts.onConfirm) opts.onConfirm(groups.length === 1 ? vals[0] : vals, el);
    });
    el.groups = groups;
    el.close = function () { el.classList.add('is-leaving'); setTimeout(function () { el.remove(); }, 320); };
    select(0);
    refresh();
    if (!el.hasAttribute('data-main')) {
      // before a value is chosen, the main thing is the tiles: mark the card itself
      el.setAttribute('data-main-pre', '');
    }
    // keep the card inside the stage horizontally (big tiles on 32″ make it wider than a seat)
    requestAnimationFrame(function () { requestAnimationFrame(function () { UI.keepInStage(el); }); });
    return el;
  };
  /** Shift an element sideways (style.left, it must be positioned) so it stays inside its stage.
      Measures by the horizontal centre, so scale/vertical entrance animations do not skew it;
      works for elements inside 180°-turned seats. */
  UI.keepInStage = function (el, margin) {
    var st = stageOf(el); if (!st || !el.isConnected || !st.offsetWidth) return;
    var q = st.getBoundingClientRect(), k = q.width / st.offsetWidth; if (!k) return;
    var m = (margin == null ? 8 : margin) * k;
    function cx() { var r = el.getBoundingClientRect(); return r.left + r.width / 2; }
    var c = cx(), half = el.offsetWidth * k / 2, dx = 0;
    if (half * 2 > q.width - 2 * m) dx = (q.left + q.width / 2) - c;   // wider than the stage: centre it
    else if (c - half < q.left + m) dx = q.left + m - (c - half);
    else if (c + half > q.right - m) dx = q.right - m - (c + half);
    if (Math.abs(dx) < 1) return;
    var base = parseFloat(el.style.left) || 0;
    var sh = dx / k;
    el.style.left = (base + sh) + 'px';
    if (Math.abs((cx() - c) - dx) > 2) { sh = -sh; el.style.left = (base + sh) + 'px'; }   // turned seat: local x runs the other way
    var prev = parseFloat(el.style.getPropertyValue('--kis-dx')) || 0;
    el.style.setProperty('--kis-dx', (prev + sh) + 'px');   // .dcard::before (pointer arrow) shifts back by this
  };

  /** Roll a world die openly (all faces flicker) then settle.  opts {die, value, mod, rot, size, onDone, label} */
  UI.rollDie = function (c, x, y, opts) {
    opts = opts || {};
    var faces = parseInt(String(opts.die || 'd20').slice(1), 10) || 20;
    var d = UI.die(opts.die || 'd20', { size: opts.size || 110 });
    var wrap = h('div', { class: 'fx-roll', style: { left: x + 'px', top: y + 'px', '--rot': (opts.rot || 0) + 'deg' } }, d);
    if (opts.mod) wrap.appendChild(h('span', { class: 'fx-roll__mod', text: fmtMod(opts.mod) }));
    fxLayer(c).appendChild(wrap);
    UI.sound('dice');
    var steps = UI.reduced() ? 1 : 9, i = 0;
    return new Promise(function (res) {
      (function tick() {
        if (i++ < steps) { d.setValue(1 + Math.floor(Math.random() * faces)); setTimeout(tick, 55 + i * 8); return; }
        d.setValue(opts.value, true);
        wrap.classList.add('is-settled');
        if (opts.value === faces && faces === 20) wrap.classList.add('is-crit');
        setTimeout(function () { if (opts.keep !== true) { wrap.classList.add('is-out'); setTimeout(function () { wrap.remove(); }, 400); } res(wrap); if (opts.onDone) opts.onDone(wrap); }, opts.hold || 900);
      })();
    });
  };

  /* ------------------------------------------------------------ choice card, toast, sheet */
  /** Choice card 240×140.  opts {icon, words, onPick(el), selected, size:{w,h}} ; el.setSelected(b) */
  UI.choiceCard = function (opts) {
    opts = opts || {};
    var el = h('button', { class: 'choice' + (opts.cls ? ' ' + opts.cls : ''), type: 'button' },
      h('span', { class: 'choice__ic' }, UI.icon(opts.icon || 'choice-go')),
      h('span', { class: 'choice__w', text: opts.words || '' }));
    if (opts.color) el.style.setProperty('--hero', opts.color);
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { el.appendChild(rhomb('frame__corner frame__corner--' + c)); });
    el.setSelected = function (b) { el.classList.toggle('is-selected', !!b); return el; };
    if (opts.selected) el.setSelected(true);
    el.addEventListener('click', function () { if (opts.onPick) opts.onPick(el); });
    if (opts.info) UI.longPress(el, function () { UI.sheetFor(el, { icon: opts.icon, title: opts.words, text: opts.info }); });
    return el;
  };

  /**
   * Toast: icon + few words.  opts {icon, text, tone:'info'|'good'|'bad', ms=2200, x, y, rot}
   * Default position: centre-top of container.  UI.toastFor(el, opts) places it near el, facing its side.
   */
  /* ---- both long sides (brief rule 7; owner 2026-11-02 «на столе всё должно дублироваться»)
     On the flat table every transient thing with words follows ONE rule:
       · it belongs to one player (sits in a .seat or under [data-own]) → one copy, in front of that
         player, turned to them  (opts.side = 'near' | 'far');
       · otherwise it is shared → TWO copies: the near one upright in the near half, the far one
         turned 180° at the mirrored point (W−x, H−y).  UI.toast / UI.sheet do this by default on a
         table stage; opts.both = false or opts.side opts out.  UI.toastFor / UI.sheetFor pick the
         mode from the element.  The two copies live and die together (el.twin). */
  function onTable(c) { var st = stageOf(c) || c; return !!(st && st.dataset && st.dataset.surface === 'table'); }
  UI.onTable = onTable;
  /** 'near' | 'far' when el belongs to one player's seat on the table, null when it is shared. */
  UI.ownerSide = function (el) {
    var own = el && el.closest && el.closest('.seat, [data-own]');
    if (!own) return null;
    var v = own.getAttribute('data-own');
    if (v === 'near' || v === 'far') return v;
    return farOf(own) ? 'far' : 'near';
  };
  /** Mode for a transient on container c: {both:true} | {side, rot} | {rot} (off the table). */
  function placeMode(c, opts) {
    if (!onTable(c)) return { both: false, rot: opts.rot || 0 };
    if (opts.side === 'near' || opts.side === 'far') return { both: false, rot: opts.side === 'far' ? 180 : 0 };
    if (opts.both === false) return { both: false, rot: opts.rot || 0 };
    return { both: true };
  }
  /** Near/far points for a mirrored pair of an element hgt px tall: the near copy sits in the near
      half (a point given in the far half folds into it, x kept), the far copy at the mirror point. */
  function mirrorPair(c, x, y, hgt) {
    var W = c.offsetWidth, H = c.offsetHeight;
    if (y < H / 2) y = H - y;   // a point in the far half folds down: the near copy keeps its x
    var lo = H / 2 + hgt / 2 + 8, hi = H - hgt / 2 - 8;
    y = Math.max(lo, Math.min(Math.max(lo, hi), y));
    return [{ x: x, y: y, rot: 0 }, { x: W - x, y: H - y, rot: 180 }];
  }
  UI.mirrorPair = mirrorPair;
  function twin(a, b) { a.twin = b; b.twin = a; a.classList.add('is-side-near'); b.classList.add('is-side-far'); b.setAttribute('data-twin', ''); }

  UI.toast = function (c, opts) {
    opts = opts || {};
    var l = fxLayer(c), mode = placeMode(c, opts);
    var x0 = opts.x != null ? opts.x : c.offsetWidth / 2;
    var y0 = opts.y != null ? opts.y : (mode.both ? c.offsetHeight - Math.min(140, c.offsetHeight * 0.14) : Math.min(140, c.offsetHeight * 0.14));
    function one(x, y, rot) {
      var t = h('div', { class: 'toast toast--' + (opts.tone || 'info'), style: { left: x + 'px', top: y + 'px', '--rot': rot + 'deg' } },
        opts.icon ? UI.icon(opts.icon, 'toast__ic') : null, h('span', { text: opts.text || '' }));
      l.appendChild(t);
      var tw = t.offsetWidth, cw = c.offsetWidth;   // keep the whole toast on screen
      if (tw && cw && tw + 24 < cw) t.style.left = Math.max(tw / 2 + 12, Math.min(cw - tw / 2 - 12, x)) + 'px';
      setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 320); }, opts.ms || 2200);
      return t;
    }
    if (!mode.both) return one(x0, y0, mode.rot);
    var a = one(x0, y0, 0), pts = mirrorPair(c, x0, y0, a.offsetHeight || 50);
    a.style.left = pts[0].x + 'px'; a.style.top = pts[0].y + 'px';
    var tw = a.offsetWidth, cw = c.offsetWidth;
    if (tw && cw && tw + 24 < cw) a.style.left = Math.max(tw / 2 + 12, Math.min(cw - tw / 2 - 12, pts[0].x)) + 'px';
    var b = one(c.offsetWidth - parseFloat(a.style.left), pts[1].y, 180);
    twin(a, b);
    return a;
  };
  /** Where an element's transient goes: 'both' (shared, on the table) or the owner side. */
  function sideFor(el, st) {
    if (!onTable(st)) return farOf(el) ? 'far' : 'near';
    return UI.ownerSide(el) || 'both';
  }
  UI.sideFor = sideFor;
  UI.toastFor = function (el, opts) {
    var st = stageOf(el); if (!st) return null;
    var p = UI.center(el, st), side = opts && opts.shared && onTable(st) ? 'both' : sideFor(el, st);
    if (side === 'both') return UI.toast(st, Object.assign({ x: p.x, y: p.y + (p.y < st.offsetHeight / 2 ? 90 : -90) }, opts, { both: true, side: null }));
    var far = side === 'far';
    return UI.toast(st, Object.assign({ x: p.x, y: p.y + (far ? 90 : -90), rot: far ? 180 : 0 }, opts, { side: onTable(st) ? side : null }));
  };

  /**
   * Info sheet (long-press).  opts {icon, art, title, text, cost, lvl, body, x, y, rot, side, both}.  Tap anywhere closes.
   * body: a node (copied for the far twin) or a function () → node (called per copy: use it for buttons).
   * On the table a sheet is shared (two copies) unless opts.side names its owner (see «both long sides»).
   */
  UI.sheet = function (c, opts) {
    opts = opts || {};
    [].slice.call(c.querySelectorAll('.sheet')).forEach(function (o) { o.remove(); });
    var l = fxLayer(c), mode = placeMode(c, opts);
    var W = c.offsetWidth, H = c.offsetHeight, w = Math.min(460, W - 24);
    var copies = [];
    function build(k) {
      var head = h('div', { class: 'sheet__head' });
      if (opts.art) head.appendChild(bgArt(h('span', { class: 'sheet__art' }), opts.art));
      else if (opts.icon) head.appendChild(h('span', { class: 'sheet__ic' }, UI.icon(opts.icon)));
      var chip = costChip(opts.cost, opts.lvl);
      if (opts.title || chip) head.appendChild(h('span', { class: 'sheet__hd' }, opts.title ? h('span', { class: 'sheet__title', text: opts.title }) : null, chip));
      var extra = typeof opts.body === 'function' ? opts.body(k) : (opts.body ? (k ? opts.body.cloneNode(true) : opts.body) : null);
      var body = UI.frame({ parch: true, cls: 'sheet__frame' }, head, opts.text ? h('p', { class: 'sheet__text', text: opts.text }) : null, extra);
      var sh = h('div', { class: 'sheet' + (opts.body ? ' sheet--body' : ''), style: { width: w + 'px' } }, body);
      l.appendChild(sh);
      copies.push(sh);
      return sh;
    }
    function put(sh, x, y, rot, clampY) {
      x = Math.max(w / 2 + 12, Math.min(W - w / 2 - 12, x));
      if (clampY) y = Math.max(110, Math.min(H - 110, y));
      sh.style.left = x + 'px'; sh.style.top = y + 'px'; sh.style.setProperty('--rot', rot + 'deg');
    }
    var x = opts.x != null ? opts.x : W / 2, y = opts.y != null ? opts.y : H / 2;
    var sh = build(0);
    if (!mode.both) put(sh, x, y, mode.rot, true);
    else {
      var pts = mirrorPair(c, x, y, sh.offsetHeight || 220);
      put(sh, pts[0].x, pts[0].y, 0, false);
      var far = build(1);
      put(far, W - parseFloat(sh.style.left), pts[1].y, 180, false);
      twin(sh, far);
    }
    UI.sound('open');
    function close(e) {
      if (e && opts.body && copies.some(function (s) { return s.contains(e.target); })) return;   // interactive sheet: inside taps keep it open
      if (sh.classList.contains('is-out')) return;
      copies.forEach(function (s) { s.classList.add('is-out'); setTimeout(function () { s.remove(); }, 260); });
      document.removeEventListener('pointerdown', close, true);
    }
    copies.forEach(function (s) { s.close = function () { close(); }; });
    setTimeout(function () { document.addEventListener('pointerdown', close, true); }, 30);
    return sh;
  };
  UI.sheetFor = function (el, opts) {
    var st = stageOf(el); if (!st) return null;
    var p = UI.center(el, st), side = opts && opts.shared && onTable(st) ? 'both' : sideFor(el, st);
    if (side === 'both') return UI.sheet(st, Object.assign({ x: p.x, y: p.y + (p.y < st.offsetHeight / 2 ? 150 : -150) }, opts, { both: true, side: null }));
    var far = side === 'far';
    return UI.sheet(st, Object.assign({ x: p.x, y: p.y + (far ? 150 : -150), rot: far ? 180 : 0 }, opts, { side: onTable(st) ? side : null }));
  };

  /**
   * Typed input for a seat (§5 gm-input / table-text-input / table-submit): field + «Северину» + «Заявить».
   * opts {hero, onSend(text), onDeclare(text)}.  «Заявить» makes a draft; the slide then shows the seal.
   */
  UI.textSheet = function (el, opts) {
    opts = opts || {};
    var color = opts.hero ? heroColor(opts.hero) : 'var(--gold)';
    var inp = h('input', { class: 'tsheet__in', type: 'text', placeholder: 'Что делаешь?', 'aria-label': 'Текст', autocomplete: 'off', enterkeyhint: 'send' });
    var sh;
    function go(kind) {
      var t = inp.value.trim();
      if (!t) { inp.classList.remove('is-nope'); void inp.offsetWidth; inp.classList.add('is-nope'); UI.sound('error'); inp.focus(); return; }
      if (sh) sh.close();
      if (kind === 'gm') { if (opts.onSend) opts.onSend(t); else UI.toastFor(el, { icon: 'choice-talk', text: 'Северин слышит' }); }
      else { if (opts.onDeclare) opts.onDeclare(t); else UI.toastFor(el, { icon: 'seal', text: 'Жми печать' }); }
    }
    var bSev = h('button', { class: 'tsheet__b', type: 'button' }, UI.icon('choice-talk'), h('span', { text: 'Северину' }));
    var bDecl = h('button', { class: 'tsheet__b tsheet__b--main', type: 'button' }, UI.icon('seal'), h('span', { text: 'Заявить' }));
    bSev.addEventListener('click', function () { go('gm'); });
    bDecl.addEventListener('click', function () { go('declare'); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go('declare'); } });
    var body = h('div', { class: 'tsheet', style: { '--hero': color } }, inp, h('div', { class: 'tsheet__row' }, bSev, bDecl));
    sh = UI.sheetFor(el, { icon: 'keyboard', body: body });
    setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (_) {} }, 60);
    return sh;
  };

  /**
   * Gear sheet (§5): everything rare lives here.  opts {items:[{key, icon, word}], onPick(key, item)}.
   * Default items: раскладка, проверка, правила, новый отряд, ещё раз.  UI.gear(opts) = the round button.
   */
  UI.GEAR_ITEMS = [
    { key: 'layout', icon: 'rotate', word: 'Раскладка' },
    { key: 'device', icon: 'dev-table', word: 'Проверка' },
    { key: 'rules', icon: 'info', word: 'Правила' },
    { key: 'party', icon: 'party-swap', word: 'Новый отряд' },
    { key: 'again', icon: 'back', word: 'Ещё раз' }
  ];
  UI.gearSheet = function (el, opts) {
    opts = opts || {};
    var items = opts.items || UI.GEAR_ITEMS;
    var sh;
    function grid() {   // built once per copy: on the table the gear sheet opens for both long sides
      var g = h('div', { class: 'gsheet' });
      items.forEach(function (it) {
        var b = h('button', { class: 'gsheet__b', type: 'button', 'data-key': it.key }, h('span', { class: 'gsheet__ic' }, UI.icon(it.icon)), h('span', { class: 'gsheet__w', text: it.word }));
        b.addEventListener('click', function () {
          if (sh) sh.close();
          if (opts.onPick) opts.onPick(it.key, it); else UI.toastFor(el, { icon: it.icon, text: it.word });
        });
        g.appendChild(b);
      });
      return g;
    }
    sh = UI.sheetFor(el, { icon: 'gear', body: grid });
    return sh;
  };
  UI.gear = function (opts) {
    opts = opts || {};
    var b = h('button', { class: 'gear-btn', type: 'button', 'aria-label': 'Настройки' }, UI.icon('gear'));
    b.addEventListener('click', function () { UI.gearSheet(b, opts); });
    return b;
  };

  /* ------------------------------------------------------------ turn strip, intent, target, arrow */
  /**
   * Turn strip.  opts {items:[{hero}|{enemy, img}], current=0, dir:'v'|'h', size=56, big=96,
   *   phase:'heroes'|'world', round:'1/2'}.  el.setCurrent(i) ; el.setPhase(p, round)
   */
  UI.turnStrip = function (opts) {
    opts = opts || {};
    var el = h('div', { class: 'tstrip tstrip--' + (opts.dir || 'v'), style: { '--ts': (opts.size || 56) + 'px', '--tb': (opts.big || 96) + 'px' } });
    var phase = h('div', { class: 'tstrip__phase' });
    var phIc = UI.icon('phase-sun'); var rnd = h('b', { class: 'tstrip__round' });
    phase.appendChild(h('span', { class: 'tstrip__emb' }, phIc));
    phase.appendChild(rnd);
    if (opts.phase !== null) el.appendChild(phase);
    var list = h('div', { class: 'tstrip__list' });
    el.appendChild(list);
    var meds = (opts.items || []).map(function (it) {
      var m = UI.medallion({ hero: it.hero, enemy: it.enemy, img: it.img, cls: 'tstrip__m', state: it.state });
      m.style.removeProperty('--s');
      if (it.enemy && UI.ENEMIES[it.enemy] && UI.ENEMIES[it.enemy].leader) m.appendChild(h('span', { class: 'tstrip__crown' }, UI.icon('crown')));
      list.appendChild(m);
      return m;
    });
    el.items = meds;
    el.setCurrent = function (i) {
      meds.forEach(function (m, j) { m.classList.toggle('is-current', j === i); m.classList.toggle('is-done', j < i); });
      var cur = meds[i];
      list.querySelectorAll('[data-turn]').forEach(function (n) { n.removeAttribute('data-turn'); });
      if (cur) cur.setAttribute('data-turn', '');
      el.current = i;
      return el;
    };
    el.setPhase = function (p, r) {
      setIcon(phIc, p === 'world' ? 'phase-skull' : 'phase-sun');
      phase.classList.toggle('is-world', p === 'world');
      if (r != null) {
        var m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(r));
        rnd.innerHTML = '';
        if (m) {   // «1/2» → two pips, first lit: reads the same from both long sides (§2.7)
          rnd.classList.add('is-pips'); rnd.setAttribute('aria-label', 'Раунд ' + m[1] + ' из ' + m[2]);
          for (var q = 1; q <= +m[2]; q++) rnd.appendChild(h('i', { class: q <= +m[1] ? 'is-on' : '' }));
        } else { rnd.classList.remove('is-pips'); rnd.textContent = r; }
      }
      return el;
    };
    el.setPhase(opts.phase || 'heroes', opts.round || '1/2');
    el.setCurrent(opts.current || 0);
    return el;
  };

  /** Enemy intent badge.  opts {icon='intent-strike', count (multi-hit dots), text} */
  UI.intent = function (opts) {
    opts = opts || {};
    var el = h('div', { class: 'intent' }, h('span', { class: 'intent__disk' }, UI.icon(opts.icon || 'intent-strike')));
    if (opts.count > 1) {
      var dots = h('span', { class: 'intent__dots' });
      for (var i = 0; i < opts.count; i++) dots.appendChild(h('i'));
      el.appendChild(dots);
    }
    if (opts.text) el.appendChild(h('span', { class: 'intent__t', text: opts.text }));
    return el;
  };

  UI.targetRing = function (opts) {
    opts = opts || {};
    var el = h('div', { class: 'target-ring' + (opts.enemy ? ' target-ring--enemy' : '') });
    el.appendChild(s('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' },
      s('circle', { cx: 50, cy: 50, r: 46, class: 'target-ring__c' }),
      s('path', { d: 'M50 0v12M50 88v12M0 50h12M88 50h12', class: 'target-ring__t' })));
    return el;
  };

  UI.arrowLayer = function (w, hgt) {
    ensureDefs();
    var svg = s('svg', { class: 'arrow-layer', viewBox: '0 0 ' + w + ' ' + hgt, width: w, height: hgt, 'aria-hidden': 'true' });
    return svg;
  };
  /** Curved arrow from {x,y} to {x,y}.  opts {color, enemy, bend=.18, gap=36 (stop short of target), width=8} */
  UI.arrow = function (layer, a, b, opts) {
    opts = opts || {};
    var color = opts.color || (opts.enemy ? 'var(--dmg)' : 'var(--gold)');
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    var gap = opts.gap != null ? opts.gap : 36, start = opts.startGap != null ? opts.startGap : 30;
    var ux = dx / L, uy = dy / L;
    var A = { x: a.x + ux * start, y: a.y + uy * start }, B = { x: b.x - ux * gap, y: b.y - uy * gap };
    var bend = (opts.bend != null ? opts.bend : 0.18) * L;
    var C = { x: (A.x + B.x) / 2 - uy * bend, y: (A.y + B.y) / 2 + ux * bend };
    var g = s('g', { class: 'arrow' + (opts.enemy ? ' arrow--enemy' : ''), style: '--c:' + color });
    var d = 'M' + A.x.toFixed(1) + ' ' + A.y.toFixed(1) + ' Q' + C.x.toFixed(1) + ' ' + C.y.toFixed(1) + ' ' + B.x.toFixed(1) + ' ' + B.y.toFixed(1);
    g.appendChild(s('path', { d: d, class: 'arrow__shadow' }));
    g.appendChild(s('path', { d: d, class: 'arrow__line', style: 'stroke-width:' + (opts.width || 8) }));
    g.appendChild(s('path', { d: d, class: 'arrow__dash' }));
    // head: tangent at B is (B - C)
    var tx = B.x - C.x, ty = B.y - C.y, tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    var hs = (opts.width || 8) * 3.2;
    var p1 = { x: B.x + tx * hs * 0.5, y: B.y + ty * hs * 0.5 };
    var p2 = { x: B.x - tx * hs * 0.7 - ty * hs * 0.65, y: B.y - ty * hs * 0.7 + tx * hs * 0.65 };
    var p3 = { x: B.x - tx * hs * 0.7 + ty * hs * 0.65, y: B.y - ty * hs * 0.7 - tx * hs * 0.65 };
    g.appendChild(s('polygon', { points: [p1, p2, p3].map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '), class: 'arrow__head' }));
    layer.appendChild(g);
    g.remove2 = function () { g.classList.add('is-out'); setTimeout(function () { g.remove(); }, 260); };
    return g;
  };

  /* ------------------------------------------------------------ board */
  /**
   * Board.  opts {map='map-ford', cols=12, rows=9, cell=80, bleed=true (table wood to 1920),
   *   tokens:[{id, hero | enemy | img, x, y, hp, max, far (hero token faces far side), speed, drag}],
   *   blocked:[[x,y]], difficult:[[x,y]], drag=true, onMove(id,x,y,feet), onTokenTap(id, el), onCellTap(x,y)}
   * API: el.token(id) el.addToken(t) el.moveToken(id,x,y) el.setActive(id) el.setTargets(ids, onPick) el.clearTargets()
   *      el.arrow(fromId,toId,opts) el.clearArrows() el.preview(id,{items:[{icon,text}]}) el.clearPreview()
   *      el.intent(id, opts) el.clearIntent(id) el.pop(id,text,kind,{rot}) el.setHp(id,hp) el.kill(id) el.flee(id)
   *      el.cellCenter(x,y) el.tokenCenter(id) el.showReach(id) el.clearReach() el.speedLeft(id, feet?)
   */
  UI.board = function (opts) {
    opts = opts || {};
    var cols = opts.cols || 12, rows = opts.rows || 9, cell = opts.cell || 80;
    var W = cols * cell, H = rows * cell;
    var el = h('div', { class: 'board', style: { width: W + 'px', height: H + 'px', '--cell': cell + 'px' } });
    var mapUrl = art(opts.map || 'map-ford');
    if (opts.bleed !== false) {
      var bw = opts.bleedWidth || 1920;
      var bl = h('div', { class: 'board__bleed', style: { width: bw + 'px', left: ((W - bw) / 2) + 'px' } });
      // table wood + vignette (components.css), not a blurred copy of the map
      el.appendChild(bl);
    }
    var map = h('div', { class: 'board__map' });
    if (mapUrl) map.style.backgroundImage = 'url("' + mapUrl + '")';
    el.appendChild(map);
    el.appendChild(h('div', { class: 'board__grid' }));
    var reach = h('div', { class: 'board__reach' }); el.appendChild(reach);
    var arrows = UI.arrowLayer(W, H); arrows.classList.add('board__arrows'); el.appendChild(arrows);
    var toks = h('div', { class: 'board__tokens' }); el.appendChild(toks);
    var over = h('div', { class: 'board__over' }); el.appendChild(over);
    var fx = h('div', { class: 'board__fx' }); el.appendChild(fx);
    el.fx = fx;

    var blocked = {}; (opts.blocked || []).forEach(function (c) { blocked[c[0] + ',' + c[1]] = 1; });
    var difficult = {}; (opts.difficult || []).forEach(function (c) { difficult[c[0] + ',' + c[1]] = 1; });
    var T = {};
    el.tokens = T;

    function cc(x, y) { return { x: x * cell + cell / 2, y: y * cell + cell / 2 }; }
    el.cellCenter = cc;
    el.tokenCenter = function (id) { var t = T[id]; return t ? cc(t.x, t.y) : null; };
    function place(t) { t.el.style.transform = 'translate(' + (t.x * cell) + 'px,' + (t.y * cell) + 'px)'; }

    el.addToken = function (t) {
      var hero = t.hero && UI.HEROES[t.hero];
      var enemy = t.enemy && UI.ENEMIES[t.enemy];
      var color = t.color || (hero ? hero.color : enemy ? UI.ENEMY_COLOR : 'var(--bronze-hi)');
      t.hp = t.hp != null ? t.hp : hero ? hero.hp : enemy ? enemy.hp : null;
      t.max = t.max != null ? t.max : hero ? hero.max : enemy ? enemy.max : t.hp;
      t.speed = t.speed || (hero ? hero.speed : 30); t.left = t.speed;
      var te = h('div', { class: 'tok' + (enemy ? ' tok--enemy' : ' tok--hero') + (enemy && enemy.leader ? ' tok--leader' : '') + (enemy && enemy.minion ? ' tok--minion' : ''), 'data-id': t.id, style: { '--hero': color } });
      var body = h('div', { class: 'tok__body' + (t.far ? ' is-far' : '') });
      if (enemy) body.appendChild(s('svg', { class: 'tok__ring tok__spk', viewBox: '0 0 100 100', 'aria-hidden': 'true' },
        s('polygon', { points: SPIKES, class: 'tok__spikes', fill: 'url(#ui-g-enemy)' })));
      var img = h('div', { class: 'tok__img' }); bgArt(img, t.img || (hero ? 'bust-' + hero.id : enemy ? enemy.token : null));
      body.appendChild(img);
      var ring = s('svg', { class: 'tok__ring', viewBox: '0 0 100 100', 'aria-hidden': 'true' });
      ring.appendChild(s('circle', { cx: 50, cy: 50, r: 43, class: 'tok__hue' }));
      var hp = s('circle', { cx: 50, cy: 50, r: 43, class: 'tok__hp', pathLength: 100, transform: 'rotate(-90 50 50)' });
      ring.appendChild(hp);
      body.appendChild(ring);
      te.appendChild(body);
      if (enemy && enemy.leader) te.appendChild(h('span', { class: 'tok__crown' }, UI.icon('crown')));
      te.appendChild(h('div', { class: 'tok__over' }));
      te.appendChild(h('div', { class: 'tok__under' }));   // far twins of shared badges (preview)
      t.el = te; t.hpEl = hp; t.body = body;
      toks.appendChild(te);
      place(t);
      setHp(t);
      T[t.id] = t;
      bindToken(t);
      return t;
    };
    function setHp(t) {
      if (t.hp == null) return;
      var f = t.max ? t.hp / t.max : 0;
      t.hpEl.setAttribute('stroke-dasharray', (f * 100).toFixed(1) + ' 100');
      t.el.classList.toggle('is-low', f <= 0.25 && t.hp > 0);   // ring keeps hero / enemy colour (rule 9); green only for heal pops
    }
    el.setHp = function (id, hp) { var t = T[id]; if (!t) return; t.hp = Math.max(0, hp); setHp(t); };
    el.token = function (id) { return T[id]; };
    el.moveToken = function (id, x, y) { var t = T[id]; if (!t) return; t.x = x; t.y = y; place(t); };
    el.setActive = function (id) {
      Object.keys(T).forEach(function (k) { T[k].el.classList.toggle('is-active', k === id); T[k].el.toggleAttribute('data-turn', k === id); });
      el.active = id;
    };
    el.kill = function (id) { var t = T[id]; if (!t) return; t.dead = true; t.el.classList.add('is-dead'); };
    el.flee = function (id, dx) {
      var t = T[id]; if (!t) return; t.gone = true;
      t.el.classList.add('is-fleeing'); t.el.style.transform = 'translate(' + ((t.x + (dx || 5)) * cell) + 'px,' + (t.y * cell) + 'px)';
      setTimeout(function () { t.el.remove(); delete T[id]; }, 900);
    };

    /* --- reach + drag --- */
    function occupied(x, y, except) {
      return Object.keys(T).some(function (k) { var t = T[k]; return k !== except && !t.dead && !t.gone && t.x === x && t.y === y; });
    }
    function reachMap(id) {
      var t = T[id], steps = Math.floor(t.left / 5), out = {};
      var q = [[t.x, t.y, 0]], seen = {}; seen[t.x + ',' + t.y] = 0;
      while (q.length) {
        var c = q.shift();
        for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) continue;
          var nx = c[0] + dx, ny = c[1] + dy, key = nx + ',' + ny;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || blocked[key]) continue;
          var cost = c[2] + (difficult[key] ? 2 : 1);
          if (cost > steps || (seen[key] != null && seen[key] <= cost)) continue;
          if (occupied(nx, ny, id)) continue;
          seen[key] = cost; out[key] = cost; q.push([nx, ny, cost]);
        }
      }
      return out;
    }
    el.speedLeft = function (id, feet) { var t = T[id]; if (!t) return 0; if (feet != null) t.left = feet; return t.left; };
    var curReach = null, bootEl = null;
    el.showReach = function (id) {
      el.clearReach();
      var t = T[id]; if (!t) return;
      curReach = reachMap(id);
      reach.style.setProperty('--hero', t.el.style.getPropertyValue('--hero'));
      Object.keys(curReach).forEach(function (k) {
        var p = k.split(',');
        reach.appendChild(h('div', { class: 'reach-cell', 'data-c': k, style: { transform: 'translate(' + (p[0] * cell) + 'px,' + (p[1] * cell) + 'px)' } }));
      });
      reach.classList.add('is-on');
    };
    el.clearReach = function () { reach.innerHTML = ''; reach.classList.remove('is-on'); curReach = null; if (bootEl) { if (bootEl.twin) bootEl.twin.remove(); bootEl.remove(); bootEl = null; } };
    /* feet left: on the table shared — near copy upper-right of the token, far copy turned 180° at the
       point mirrored through the token centre; off the table one copy turned to the token's side */
    function boot(t, feet, x, y) {
      var both = onTable(el);
      if (!bootEl) {
        bootEl = h('div', { class: 'boot' }, UI.icon('boot'), h('b')); over.appendChild(bootEl);
        if (both) { var b2 = h('div', { class: 'boot', 'data-twin': '' }, UI.icon('boot'), h('b')); over.appendChild(b2); bootEl.twin = b2; }
      }
      bootEl.querySelector('b').textContent = feet;
      var bw = bootEl.offsetWidth || 70, bh = bootEl.offsetHeight || 36;
      if (!both) { bootEl.style.transform = 'translate(' + (x + cell * 0.38) + 'px,' + (y - cell * 0.62) + 'px)' + (t.far ? ' rotate(180deg)' : ''); return; }
      var nx = x + cell * 0.38, ny = y - cell * 0.62;   // near copy's top-left
      bootEl.style.transform = 'translate(' + nx + 'px,' + ny + 'px)';
      var tw = bootEl.twin; tw.querySelector('b').textContent = feet;
      tw.style.transform = 'translate(' + (2 * x - nx - bw) + 'px,' + (2 * y - ny - bh) + 'px) rotate(180deg)';
    }
    el.showBoot = function (id) { var t = T[id]; if (!t) return; var c = cc(t.x, t.y); boot(t, t.left, c.x, c.y); };

    function bindToken(t) {
      var te = t.el;
      te.addEventListener('pointerdown', function (e) {
        if (t.dead || t.gone) return;
        var canDrag = opts.drag !== false && t.drag !== false && !!t.hero && (t.drag === true || el.active === t.id);
        var start = UI.local(el, e.clientX, e.clientY), moved = false;
        var c0 = cc(t.x, t.y);
        if (canDrag) { try { te.setPointerCapture(e.pointerId); } catch (_) {} el.showReach(t.id); boot(t, t.left, c0.x, c0.y); }
        function mv(ev) {
          var p = UI.local(el, ev.clientX, ev.clientY);
          if (!moved && Math.hypot(p.x - start.x, p.y - start.y) > 8) { moved = true; if (canDrag) te.classList.add('is-drag'); }
          if (!moved || !canDrag) return;
          var x = c0.x + (p.x - start.x), y = c0.y + (p.y - start.y);
          te.style.transform = 'translate(' + (x - cell / 2) + 'px,' + (y - cell / 2) + 'px) scale(1.12)';
          var gx = Math.floor(x / cell), gy = Math.floor(y / cell), key = gx + ',' + gy;
          [].forEach.call(reach.children, function (rc) { rc.classList.toggle('is-hover', rc.dataset.c === key); });
          var cost = curReach && curReach[key];
          boot(t, cost != null ? t.left - cost * 5 : (gx === t.x && gy === t.y ? t.left : '×'), x, y);
        }
        function up(ev) {
          te.removeEventListener('pointermove', mv); te.removeEventListener('pointerup', up); te.removeEventListener('pointercancel', up);
          te.classList.remove('is-drag');
          if (!moved) {
            if (canDrag) { /* keep reach visible after a tap on own token */ }
            if (opts.onTokenTap) opts.onTokenTap(t.id, te);
            return;
          }
          if (!canDrag) return;
          var p = UI.local(el, ev.clientX, ev.clientY);
          var x = c0.x + (p.x - start.x), y = c0.y + (p.y - start.y);
          var gx = Math.floor(x / cell), gy = Math.floor(y / cell), key = gx + ',' + gy;
          var cost = curReach && curReach[key];
          if (cost != null) {
            t.x = gx; t.y = gy; t.left -= cost * 5; place(t);
            UI.sound('tap');
            var nc = cc(gx, gy); UI.spark(el.fx, nc.x, nc.y, t.el.style.getPropertyValue('--hero'), 8);
            el.clearReach();
            if (opts.onMove) opts.onMove(t.id, gx, gy, cost * 5, t.left);
          } else { place(t); el.clearReach(); }
        }
        te.addEventListener('pointermove', mv); te.addEventListener('pointerup', up); te.addEventListener('pointercancel', up);
      });
    }
    el.addEventListener('click', function (e) {
      if (!opts.onCellTap || e.target.closest('.tok')) return;
      var p = UI.local(el, e.clientX, e.clientY);
      opts.onCellTap(Math.floor(p.x / cell), Math.floor(p.y / cell));
    });

    /* --- targets / arrows / preview / intent / pops --- */
    var targetPick = null;
    el.setTargets = function (ids, onPick) {
      el.clearTargets();
      el.classList.add('is-targeting');
      targetPick = onPick;
      ids.forEach(function (id) {
        var t = T[id]; if (!t) return;
        t.el.classList.add('is-target');
        var r = UI.targetRing(); r.classList.add('tok__target');
        t.el.appendChild(r);
        t.__tap = function (e) { e.stopPropagation(); if (targetPick) targetPick(id, t.el); };
        t.el.addEventListener('click', t.__tap);
      });
    };
    el.clearTargets = function () {
      el.classList.remove('is-targeting');
      Object.keys(T).forEach(function (k) {
        var t = T[k]; t.el.classList.remove('is-target', 'is-picked');
        var r = t.el.querySelector('.tok__target'); if (r) r.remove();
        if (t.__tap) { t.el.removeEventListener('click', t.__tap); t.__tap = null; }
      });
      targetPick = null;
    };
    el.pick = function (id) { Object.keys(T).forEach(function (k) { T[k].el.classList.toggle('is-picked', k === id); }); };
    el.arrow = function (fromId, toId, o) {
      var a = el.tokenCenter(fromId), b = el.tokenCenter(toId); if (!a || !b) return null;
      return UI.arrow(arrows, a, b, Object.assign({ gap: cell * 0.5, startGap: cell * 0.42 }, o || {}));
    };
    el.clearArrows = function () { arrows.innerHTML = ''; };
    /* o {items, cls, far, decorate(b)}.  On the table the badge is shared: a second copy hangs under
       the token turned 180° (.tok__under) so the far side reads it too; off the table o.far turns the
       single copy.  decorate runs on every copy. */
    el.preview = function (id, o) {
      el.clearPreview(id);
      var t = T[id]; if (!t) return null;
      var both = onTable(el);
      function make(under) {
        var b = h('div', { class: 'preview' + (o.cls ? ' ' + o.cls : '') + (!both && o.far ? ' is-far' : '') });
        (o.items || []).forEach(function (it) {
          b.appendChild(h('span', { class: 'preview__it' + (it.tone ? ' is-' + it.tone : '') }, it.icon ? UI.icon(it.icon) : null, it.text != null ? h('b', { text: String(it.text) }) : null));
        });
        t.el.querySelector(under ? '.tok__under' : '.tok__over').appendChild(b);
        if (o.decorate) o.decorate(b);
        return b;
      }
      var b = make(false);
      if (both) { var b2 = make(true); b.twin = b2; b2.twin = b; b2.setAttribute('data-twin', ''); }
      return b;
    };
    el.clearPreview = function (id) {
      (id ? [T[id]] : Object.keys(T).map(function (k) { return T[k]; })).forEach(function (t) {
        if (t) [].slice.call(t.el.querySelectorAll('.preview')).forEach(function (p) { p.remove(); });
      });
    };
    el.intent = function (id, o) {
      el.clearIntent(id);
      var t = T[id]; if (!t) return null;
      var b = UI.intent(o); b.classList.add('tok__intent');
      t.el.querySelector('.tok__over').appendChild(b);
      return b;
    };
    el.clearIntent = function (id) {
      (id ? [T[id]] : Object.keys(T).map(function (k) { return T[k]; })).forEach(function (t) {
        if (t) [].slice.call(t.el.querySelectorAll('.tok__intent')).forEach(function (p) { p.remove(); });
      });
    };
    el.pop = function (id, text, kind, o) {
      var c = el.tokenCenter(id); if (!c) return null;
      var t = T[id];
      if (kind === 'dmg' || kind === 'crit') { t.el.classList.remove('is-hit'); void t.el.offsetWidth; t.el.classList.add('is-hit'); }
      // on the table a map number/word is shared: it pops above the token for the near side and,
      // turned, below it for the far side (o.both = false keeps one copy turned by o.rot)
      var both = onTable(el) && !(o && o.both === false);
      return UI.pop(fx, c.x, c.y - cell * (both ? 0.6 : 0.35), text, kind, Object.assign({ rot: t && t.far ? 180 : 0 }, o || {}, both ? { both: true, around: c } : {}));
    };

    (opts.tokens || []).forEach(el.addToken);
    if (opts.active) el.setActive(opts.active);
    return el;
  };

  /* ------------------------------------------------------------ seat / node / table layout */
  /**
   * Seat 820×180.  opts {hero, hp, slots (default hero shelf), outer:'left'|'right', active, dim,
   *   onSlot(slotOpts, slotEl), onEndTurn(), mic:true, micState, endTurn:true, labels:true,
   *   keyboard:true (typed input next to the mic), onText(kind 'gm'|'declare', text, seat)}
   * el.medal el.mic el.slots el.endTurnEl el.ability(key) ; el.setActive(b) el.setDim(b) el.setHp(hp)
   */
  UI.seat = function (opts) {
    opts = opts || {};
    var hd = UI.HEROES[opts.hero] || UI.HEROES.guardian;
    var el = h('div', { class: 'seat seat--' + (opts.outer || 'left'), 'data-hero': hd.id, style: { '--hero': hd.color } });
    el.appendChild(h('div', { class: 'seat__bg' }));
    var mic = opts.mic === false ? null : UI.mic({ color: hd.color, state: opts.micState });
    var medal = UI.medallion({ hero: hd.id, hp: opts.hp != null ? opts.hp : hd.hp, max: hd.max, size: opts.medalSize || 132 });
    var id = h('div', { class: 'seat__id' });
    var name = h('div', { class: 'seat__name', text: hd.short });
    var shelf = h('div', { class: 'seat__shelf' });
    var slots = (opts.slots || hd.shelf).map(function (so) {
      var sl = UI.slot(Object.assign({ color: hd.color }, so, {
        label: opts.labels === false ? null : so.label,
        onTap: function (se) { if (opts.onSlot) opts.onSlot(so, se); },
        onPick: function (child, ce) { if (opts.onSlot) opts.onSlot(child, ce); }
      }));
      shelf.appendChild(sl);
      return sl;
    });
    id.appendChild(name); id.appendChild(shelf);
    var et = opts.endTurn === false ? null : UI.endTurn({ color: hd.color, onTap: opts.onEndTurn });
    var kbd = opts.keyboard === false || !mic ? null : h('button', { class: 'seat__kbd', type: 'button', 'aria-label': 'Написать' }, UI.icon('keyboard'));
    if (kbd) kbd.addEventListener('click', function () {
      UI.textSheet(kbd, { hero: hd.id,
        onSend: opts.onText ? function (t) { opts.onText('gm', t, el); } : null,
        onDeclare: opts.onText ? function (t) { opts.onText('declare', t, el); } : null });
    });
    if (mic) el.appendChild(h('div', { class: 'seat__mic' }, mic, kbd));
    el.appendChild(h('div', { class: 'seat__medal' }, medal));
    el.appendChild(id);
    if (et) el.appendChild(h('div', { class: 'seat__end' }, et));
    el.medal = medal; el.mic = mic; el.kbd = kbd; el.slots = slots; el.endTurnEl = et; el.shelf = shelf; el.nameEl = name;
    el.ability = function (key) { return slots.filter(function (x) { return x.dataset.key === key; })[0]; };
    el.setActive = function (b) {
      el.classList.toggle('is-active', !!b); el.classList.toggle('is-dim', !b);
      medal.setState(b ? 'active' : '');
      el.toggleAttribute('data-turn', !!b);
      return el;
    };
    el.setDim = function (b) { el.classList.toggle('is-dim', !!b); return el; };
    el.setHp = function (hp) { medal.setHp(hp); return el; };
    if (opts.active != null) el.setActive(opts.active);
    if (opts.dim) el.setDim(true);
    return el;
  };

  /**
   * Node 280×180 between the seats: Severin medallion; a seal and the mini-intent appear over it.
   * el.severin ; el.showSeal(sealOpts) → seal ; el.hideSeal() ; el.setIntent({icon|art, hero|img}) ; el.clearIntent()
   */
  UI.node = function (opts) {
    opts = opts || {};
    var el = h('div', { class: 'node' });
    var sev = UI.severin({ size: opts.size || 120, state: opts.state, onTap: opts.onSeverin, onLong: opts.onSeverinLong });
    el.appendChild(h('div', { class: 'node__sev' }, sev));
    var intent = h('div', { class: 'node__intent' });
    el.appendChild(intent);
    var sealBox = h('div', { class: 'node__seal' });
    el.appendChild(sealBox);
    el.severin = sev;
    el.seal = null;
    el.showSeal = function (so) {
      sealBox.innerHTML = '';
      var seal = UI.seal(so);
      sealBox.appendChild(seal);
      el.classList.add('has-seal');
      seal.show();
      el.seal = seal;
      return seal;
    };
    el.hideSeal = function () {
      el.classList.remove('has-seal');
      if (el.seal) el.seal.hide();
      el.seal = null;
      el.clearIntent();
    };
    el.setIntent = function (o) {
      intent.innerHTML = '';
      if (!o) return;
      var a = h('span', { class: 'node__ia' });
      if (o.art) bgArt(a, o.art); else a.appendChild(UI.icon(o.icon || 'target'));
      if (o.color) intent.style.setProperty('--hero', o.color);
      intent.appendChild(a);
      intent.appendChild(h('span', { class: 'node__iarrow' }, UI.icon('arrow-right')));
      var tg = h('span', { class: 'node__it' + (o.enemy ? ' is-enemy' : '') });
      bgArt(tg, o.img || (o.hero ? 'bust-' + o.hero : o.enemy && UI.ENEMIES[o.enemy] ? UI.ENEMIES[o.enemy].token : null));
      intent.appendChild(tg);
      intent.classList.add('is-on');
    };
    el.clearIntent = function () { intent.classList.remove('is-on'); intent.innerHTML = ''; };
    return el;
  };

  /**
   * One global seal shown in several nodes (rule 8): pressing any stamps all, then all hide.
   * opts = seal opts + onPress(): runs after the stamp.  Returns {seals, stamp(), hide()}.
   */
  UI.sealPair = function (nodes, opts) {
    opts = opts || {};
    var pair = { seals: [] };
    var fired = false;
    pair.stamp = function () {
      if (fired) return Promise.resolve();
      fired = true;
      var ps = pair.seals.map(function (sl, i) { return sl.stamp({ silent: i > 0 }); });
      nodes.forEach(function (n) { setTimeout(function () { n.classList.remove('has-seal'); n.clearIntent(); }, 600); });
      return Promise.all(ps).then(function () { if (opts.onPress) opts.onPress(); });
    };
    pair.hide = function () { nodes.forEach(function (n) { n.hideSeal(); }); };
    nodes.forEach(function (n, i) {
      var so = Object.assign({}, opts, { onPress: pair.stamp });   // both copies glow: ONE action shown twice
      pair.seals.push(n.showSeal(so));
      if (opts.intent) n.setIntent(opts.intent);
    });
    return pair;
  };

  /**
   * Table skeleton on a 1920×1080 stage (brief §4.1).
   *   far strip  y 0–180   (rotated 180°, data-far)   near strip y 900–1080
   *   each strip: left seat x 0–820 · node 820–1100 · right seat 1100–1920   (SCREEN positions)
   *   centre y 180–900 full width; ends: left/right 180 px columns over the centre edges.
   * Returns {root, center, endL, endR, near:{el,left,node,right}, far:{…}, seat(pos, opts), nodes()}
   *   pos ∈ nearLeft | nearRight | farLeft | farRight ; seat() mounts UI.seat with the right outer side.
   */
  UI.tableLayout = function (stage, opts) {
    opts = opts || {};
    var root = h('div', { class: 'tl' });
    var center = h('div', { class: 'tl__center' });
    var endL = h('div', { class: 'tl__end tl__end--l' });
    var endR = h('div', { class: 'tl__end tl__end--r' });
    function strip(far) {
      var el = h('div', { class: 'tl__strip tl__strip--' + (far ? 'far' : 'near') });
      if (far) el.setAttribute('data-far', '');
      var L = h('div', { class: 'tl__seat' }), R = h('div', { class: 'tl__seat' }), N = h('div', { class: 'tl__node' });
      // far strip is rotated 180°: DOM order right…left so screen order stays left…right
      if (far) { el.appendChild(R); el.appendChild(N); el.appendChild(L); }
      else { el.appendChild(L); el.appendChild(N); el.appendChild(R); }
      var node = opts.nodes === false ? null : UI.node({ onSeverin: opts.onSeverin });
      if (node) N.appendChild(node);
      return { el: el, left: L, right: R, nodeBox: N, node: node };
    }
    var far = strip(true), near = strip(false);
    // connection dot (§5 statusbar): quiet green; tap = state, long-press = demo «нет связи»
    var link = h('button', { class: 'tl__link', type: 'button', 'aria-label': 'Связь' }, h('i'));
    root.appendChild(center); root.appendChild(endL); root.appendChild(endR);
    root.appendChild(far.el); root.appendChild(near.el); root.appendChild(link);
    stage.appendChild(root);
    var L = { root: root, center: center, endL: endL, endR: endR, near: near, far: far, link: link };
    L.setLink = function (ok) {
      link.classList.toggle('is-off', !ok);
      UI.toast(stage, { icon: ok ? 'dot' : 'cross', text: ok ? 'Связь есть' : 'Нет связи', tone: ok ? 'good' : 'bad', x: 1740, y: 860 });
      if (!ok) UI.sound('error');
      return L;
    };
    link.addEventListener('click', function () { UI.toast(stage, { icon: link.classList.contains('is-off') ? 'cross' : 'dot', text: link.classList.contains('is-off') ? 'Нет связи' : 'Связь есть', tone: link.classList.contains('is-off') ? 'bad' : 'good', x: 1740, y: 860 }); });
    UI.longPress(link, function () { L.setLink(link.classList.contains('is-off')); });
    L.seat = function (pos, so) {
      var isFar = pos.indexOf('far') === 0, isLeft = /Left$/.test(pos);
      var box = (isFar ? far : near)[isLeft ? 'left' : 'right'];
      // outer = toward the table's short end, in the seat's own (possibly rotated) frame
      var outer = isFar ? (isLeft ? 'right' : 'left') : (isLeft ? 'left' : 'right');
      box.innerHTML = '';
      var seat = UI.seat(Object.assign({ outer: outer }, so));
      box.appendChild(seat);
      L[pos] = seat;
      return seat;
    };
    L.nodes = function () { return [near.node, far.node].filter(Boolean); };
    return L;
  };
})();
