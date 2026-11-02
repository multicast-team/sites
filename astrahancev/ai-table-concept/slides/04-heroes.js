/* =====================================================================
   Slide 04 · «Выбор героев»  (brief §4.1 «Подготовка», §4.3 ТВ-ряд).
   Owner: screens «heroes».  Table: «Зал героев» — two back-to-back rows of
   three hero cards; tap a hero → colour seal ring, the hero flies into the
   nearest free seat; ≥3 heroes → one gold seal «В путь» in both nodes.
   TV view: six heroes in a row, taken ones lit with their seat number.
   ===================================================================== */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h, s = UI.s;

  var SEATS = ['nearLeft', 'nearRight', 'farRight', 'farLeft'];          // clockwise → seat numbers 1..4
  var SEAT_NO = { nearLeft: 1, nearRight: 2, farRight: 3, farLeft: 4, phone: 5 };
  var NEAR_ROW = ['guardian', 'fury', 'shadow'];                          // screen order, faces the near side
  var FAR_ROW = ['beacon', 'arcanist', 'voice'];                          // faces the far side
  var MAX = 5, NEED = 3;
  // pick-locked (§5): a hero that cannot be taken right now — grey card, reason icon, one line on tap
  var LOCKED = { voice: { icon: 'skull', text: 'Пала в прошлом бою' } };

  // state shared by both views (survives the Стол ⇄ ТВ switch)
  var S = { seat: {}, order: [], started: false };
  function seatOf(id) { for (var k in S.seat) if (S.seat[k] === id) return k; return null; }
  function count() { return S.order.length; }
  function reset() { S.seat = {}; S.order = []; S.started = false; }

  function heroAbs(id) {
    // three signature abilities: top-level shelf first, then fan items, unique art, no «Ноги»
    var top = UI.HEROES[id].shelf.filter(function (x) { return x.key !== 'legs'; });
    var all = top.concat([].concat.apply([], top.map(function (x) { return x.fan || []; })));
    var seen = {};
    return all.filter(function (x) { if (seen[x.art]) return false; seen[x.art] = 1; return true; }).slice(0, 3);
  }
  function abMedal(ab, size) {
    var m = h('span', { class: 'h4-ab', style: size ? { '--s': size + 'px' } : null });
    UI.bgArt(m, ab.art);
    return m;
  }
  function ringSvg(cls) {
    // seal ring of the hero colour: notched wax ring
    var pts = [], n = 28;
    for (var i = 0; i <= n * 4; i++) {
      var a = (i / (n * 4)) * Math.PI * 2, r = 47 + Math.sin(a * n) * 1.8;
      pts.push((50 + Math.cos(a) * r).toFixed(2) + ' ' + (50 + Math.sin(a) * r).toFixed(2));
    }
    return s('svg', { class: cls, viewBox: '0 0 100 100', 'aria-hidden': 'true' },
      s('path', { d: 'M' + pts.join(' L') + 'Z', class: 'h4-ring__wax' }),
      s('circle', { cx: 50, cy: 50, r: 36, class: 'h4-ring__in' }),
      s('circle', { cx: 50, cy: 50, r: 41.5, class: 'h4-ring__dots' }));
  }

  /* =================================================================== TABLE */
  function mountTable(stage, ctx) {
    if (S.started) reset();
    var L = UI.tableLayout(stage);
    var center = L.center;
    center.classList.add('h4-center');
    var fx = UI.fxLayer(stage);
    var pair = null;
    var cards = {};

    /* --- hall: two half-halls back to back, each facing its side --- */
    var hall = h('div', { class: 'h4-hall' });
    var rows = {};
    [['far', FAR_ROW], ['near', NEAR_ROW]].forEach(function (r) {
      var side = r[0];
      var row = h('div', { class: 'h4-row h4-row--' + side });
      if (side === 'far') row.setAttribute('data-far', '');
      var bg = h('div', { class: 'h4-row__bg' }); UI.bgArt(bg, 'hall-heroes');
      row.appendChild(bg);
      row.appendChild(h('div', { class: 'h4-row__shade' }));
      var list = h('div', { class: 'h4-row__cards' });
      // far row is rotated 180°: reverse DOM order so the screen order reads left→right as listed
      var ids = side === 'far' ? r[1].slice().reverse() : r[1];
      ids.forEach(function (id) { var c = card(id); cards[id] = c; list.appendChild(c); });
      row.appendChild(list);
      rows[side] = row;
      hall.appendChild(row);
    });
    hall.appendChild(h('div', { class: 'h4-spine' }, UI.rule({ gold: true, width: 1100 })));
    var cover = h('div', { class: 'h4-cover' }); UI.bgArt(cover, 'cover-ford');
    center.appendChild(cover);
    center.appendChild(hall);
    rows.near.setAttribute('data-main', '');           // «5 секунд»: the main thing is a hero

    /* --- ends: help + gear, quiet --- */
    var help = h('button', { class: 'h4-endbtn', type: 'button', 'aria-label': 'Как играть' }, UI.icon('help'));
    help.addEventListener('click', function () {
      UI.sheetFor(help, { icon: 'help', title: 'Выбор героев', text: 'Тапни героя — он сядет к тебе. Нужно трое, можно пятеро. Пятый играет с телефона. Потом печать «В путь».' });
    });
    L.endL.appendChild(help);
    var gear = h('button', { class: 'h4-endbtn', type: 'button', 'aria-label': 'Настройки' }, UI.icon('gear'));
    gear.addEventListener('click', function () { UI.gearSheet(gear, { onPick: function (k, it) { if (k === 'party' || k === 'again') ctx.remount(); else UI.toastFor(gear, { icon: it.icon, text: it.word }); } }); });
    L.endR.appendChild(gear);

    /* --- node sockets: five, three of them required --- */
    var socketSets = L.nodes().map(function (node) {
      var box = h('div', { class: 'h4-socks', 'data-turn': node === L.near.node ? '' : null });
      var list = [];
      for (var i = 0; i < MAX; i++) {
        var a = (-162 + i * 36) * Math.PI / 180, R = 94;
        var sk = h('span', { class: 'h4-sock' + (i < NEED ? ' is-need' : ' is-opt'), style: { left: (140 + Math.cos(a) * R) + 'px', top: (92 + Math.sin(a) * R) + 'px' } },
          h('span', { class: 'h4-sock__img' }),
          i === MAX - 1 ? h('span', { class: 'h4-sock__dev' }, UI.icon('dev-phone')) : null);
        box.appendChild(sk); list.push(sk);
      }
      node.appendChild(box);
      return list;
    });

    /* --- seats --- */
    var boxes = { nearLeft: L.near.left, nearRight: L.near.right, farLeft: L.far.left, farRight: L.far.right };
    SEATS.forEach(function (pos) { if (S.seat[pos]) fillSeat(pos, S.seat[pos], true); else emptySeat(pos); });
    S.order.forEach(function (id) { cards[id].classList.add('is-taken'); setRing(id); });
    syncSockets(); syncSeal(true);

    /* ------------------------------------------------------------ builders */
    function card(id) {
      var hd = UI.HEROES[id];
      var c = h('button', { class: 'h4-card', type: 'button', 'data-hero': id, style: { '--hero': hd.color }, 'aria-label': hd.name });
      c.appendChild(h('span', { class: 'h4-card__aura' }));
      c.appendChild(h('span', { class: 'h4-card__plinth' }));
      var artEl = h('span', { class: 'h4-card__art' }); UI.bgArt(artEl, 'hero-' + id);
      if (!(window.art && window.art.isNew('hero-' + id))) c.classList.add('is-store');
      c.appendChild(artEl);
      c.appendChild(h('span', { class: 'h4-card__fade' }));
      var foot = h('span', { class: 'h4-card__foot' },
        h('span', { class: 'h4-card__abs' }, heroAbs(id).map(function (ab) { return abMedal(ab); })),
        h('span', { class: 'h4-card__name', text: hd.short }));
      c.appendChild(foot);
      var fr = UI.frame({ cls: 'h4-card__frame' }); c.appendChild(fr);
      var ring = h('span', { class: 'h4-card__ring' }, ringSvg('h4-ring'), h('span', { class: 'h4-card__no' }));
      c.appendChild(ring);
      c.artEl = artEl; c.ringEl = ring;
      var lk = LOCKED[id];
      if (lk) {
        c.classList.add('is-locked');
        c.setAttribute('aria-label', hd.name + ': ' + lk.text);
        c.appendChild(h('span', { class: 'h4-card__lock' }, UI.icon(lk.icon)));
        c.addEventListener('click', function () {
          UI.sound('error');
          c.classList.remove('is-nope'); void c.offsetWidth; c.classList.add('is-nope');
          UI.toastFor(c, { icon: lk.icon, text: lk.text });
        });
        return c;
      }
      c.addEventListener('click', function () { toggle(id); });
      UI.longPress(c, function () {
        UI.sheetFor(c, { art: 'bust-' + id, title: hd.name, text: hd.epithet + '. ' + heroAbs(id).map(function (a) { return a.label; }).join(' · ') + '.' });
      });
      return c;
    }

    function emptySeat(pos) {
      var box = boxes[pos];
      box.innerHTML = '';
      var outer = /Left$/.test(pos) ? (pos.indexOf('far') === 0 ? 'right' : 'left') : (pos.indexOf('far') === 0 ? 'left' : 'right');
      // empty seat = a leather strip with one dark silhouette medallion and a gold-rimmed «+» (no skeleton bars)
      var bgL = h('span', { class: 'h4-empty__bg' }); UI.bgArt(bgL, 'texture-leather');
      var e = h('button', { class: 'h4-empty h4-empty--' + outer, type: 'button', 'aria-label': 'Свободное место' },
        bgL,
        h('span', { class: 'h4-empty__medal' },
          h('span', { class: 'h4-empty__sil' }),
          h('span', { class: 'h4-empty__plus' }, UI.icon('plus'))));
      e.addEventListener('click', function () {
        // nudge: the heroes facing this side hop
        var side = pos.indexOf('far') === 0 ? 'far' : 'near';
        (side === 'far' ? FAR_ROW : NEAR_ROW).forEach(function (id, k) {
          var c = cards[id]; if (c.classList.contains('is-taken') || c.classList.contains('is-locked')) return;
          ctx.setTimeout(function () { c.classList.remove('is-hop'); void c.offsetWidth; c.classList.add('is-hop'); }, k * 70);
        });
      });
      box.appendChild(e);
      return e;
    }

    function fillSeat(pos, id, instant) {
      var seat = L.seat(pos, { hero: id, endTurn: false, labels: false });
      seat.classList.add('h4-seat');
      if (!instant) seat.classList.add('is-pending');
      seat.medal.classList.add('ui-tap');
      seat.medal.addEventListener('click', function () { toggle(id); });
      return seat;
    }

    function setRing(id) {
      var c = cards[id], pos = seatOf(id);
      c.querySelector('.h4-card__no').innerHTML = '';
      c.querySelector('.h4-card__no').appendChild(pos === 'phone' ? UI.icon('dev-phone') : document.createTextNode(String(SEAT_NO[pos])));
    }

    function syncSockets() {
      socketSets.forEach(function (list) {
        list.forEach(function (sk, i) {
          var id = S.order[i];
          var img = sk.querySelector('.h4-sock__img');
          img.style.backgroundImage = '';
          sk.classList.toggle('is-full', !!id);
          if (id) { UI.bgArt(img, 'bust-' + id); sk.style.setProperty('--hero', UI.HEROES[id].color); }
          else sk.style.removeProperty('--hero');
        });
        list.forEach(function (sk, i) {
          sk.classList.toggle('is-ready', count() >= NEED);
          // party-short: the required sockets still empty glow brighter until three heroes sit
          sk.classList.toggle('is-short', i < NEED && !S.order[i]);
        });
      });
    }

    function syncSeal(quiet) {
      var n = count();
      hall.classList.toggle('is-ready', n >= NEED);   // party ready: free cards stop breathing, only the seal pulses
      if (n >= NEED && !pair && !S.started) {
        pair = UI.sealPair(L.nodes(), { word: 'В путь', icon: 'choice-go', onPress: start });
        rows.near.removeAttribute('data-main');
        if (!quiet) { ctx.sound('open'); }
      } else if (n < NEED && pair) {
        pair.seals.forEach(function (sl) { sl.removeAttribute('data-main'); });
        pair.hide(); pair = null;
        rows.near.setAttribute('data-main', '');
      }
    }

    /* ------------------------------------------------------------ flight */
    function fly(fromEl, toEl, id, back) {
      var a = UI.center(fromEl, stage), b = UI.center(toEl, stage);
      var ra = UI.isFar(fromEl) ? 180 : 0, rb = UI.isFar(toEl) ? 180 : 0;
      if (rb - ra === 180 && a.x > b.x) rb = -180;          // spin the short way
      var hd = UI.HEROES[id];
      var f = h('div', { class: 'h4-fly', style: { '--hero': hd.color, left: '0px', top: '0px' } }, h('span', { class: 'h4-fly__img' }));
      UI.bgArt(f.firstChild, 'bust-' + id);
      fx.appendChild(f);
      var s0 = back ? 1 : 1.35, s1 = back ? 1.35 : 1;
      var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - (UI.isFar(toEl) ? -60 : 60) };
      var dur = UI.reduced() ? 1 : 560;
      var anim = f.animate([
        { transform: 'translate(' + a.x + 'px,' + a.y + 'px) translate(-50%,-50%) rotate(' + ra + 'deg) scale(' + s0 + ')', opacity: back ? 1 : 0.2 },
        { transform: 'translate(' + mid.x + 'px,' + mid.y + 'px) translate(-50%,-50%) rotate(' + ((ra + rb) / 2) + 'deg) scale(' + (Math.max(s0, s1) * 1.12) + ')', opacity: 1, offset: 0.5 },
        { transform: 'translate(' + b.x + 'px,' + b.y + 'px) translate(-50%,-50%) rotate(' + rb + 'deg) scale(' + s1 + ')', opacity: 1 }
      ], { duration: dur, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
      // spark trail
      if (!UI.reduced()) [0.3, 0.55, 0.8].forEach(function (t) {
        ctx.setTimeout(function () {
          var x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x;
          var y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y;
          UI.spark(stage, x, y, hd.color, 4);
        }, dur * t);
      });
      return new Promise(function (res) {
        anim.onfinish = function () {
          UI.spark(stage, b.x, b.y, hd.color, 12);
          f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).onfinish = function () { f.remove(); };
          res();
        };
      });
    }

    /* ------------------------------------------------------------ actions */
    function toggle(id) {
      if (S.started || cards[id].__busy) return;
      var pos = seatOf(id);
      if (pos) unpick(id, pos); else pick(id);
    }

    function nearestFree(id) {
      var c = UI.center(cards[id], stage), best = null, bd = 1e9;
      SEATS.forEach(function (pos) {
        if (S.seat[pos]) return;
        var p = UI.center(boxes[pos], stage);
        var d = Math.hypot(p.x - c.x, (p.y - c.y) * 1.2);
        if (d < bd) { bd = d; best = pos; }
      });
      return best;
    }

    function pick(id) {
      var c = cards[id];
      if (count() >= MAX) {
        UI.sound('error');
        c.classList.remove('is-nope'); void c.offsetWidth; c.classList.add('is-nope');
        UI.toastFor(c, { icon: 'lock', text: 'Отряд полон' });
        return;
      }
      var pos = nearestFree(id) || 'phone';
      S.seat[pos] = id; S.order.push(id);
      setRing(id);
      c.classList.add('is-taken', 'is-stamp');
      ctx.setTimeout(function () { c.classList.remove('is-stamp'); }, 600);
      var cc = UI.center(c.ringEl, stage);
      UI.stampFx(stage, cc.x, cc.y, UI.HEROES[id].color);
      UI.sound('stamp');
      c.__busy = true;
      var target, seat = null;
      if (pos === 'phone') {
        target = socketSets[0][S.order.length - 1];
      } else {
        seat = fillSeat(pos, id, false);
        target = seat.medal;
      }
      fly(c.artEl, target, id, false).then(function () {
        c.__busy = false;
        if (seat) {
          seat.classList.remove('is-pending'); seat.classList.add('is-in');
          UI.sound('turn');
        } else {
          UI.toastFor(L.near.node, { icon: 'dev-phone', text: 'С телефона' });
        }
        syncSockets(); syncSeal();
      });
    }

    function unpick(id, pos) {
      var c = cards[id];
      c.__busy = true;
      var from;
      if (pos === 'phone') from = socketSets[0][S.order.indexOf(id)];
      else from = boxes[pos].querySelector('.seat .medal') || boxes[pos];
      var ghost = from;
      // measure before swapping the seat out
      var tmp = h('div', { class: 'h4-anchor' });
      var p = UI.center(ghost, stage);
      tmp.style.left = p.x + 'px'; tmp.style.top = p.y + 'px';
      if (UI.isFar(ghost)) tmp.setAttribute('data-far', '');
      fx.appendChild(tmp);
      delete S.seat[pos];
      S.order.splice(S.order.indexOf(id), 1);
      if (pos !== 'phone') { var e = emptySeat(pos); e.classList.add('is-back'); }
      // the 5th (phone) hero moves into the freed seat
      var promote = pos !== 'phone' && S.seat.phone ? S.seat.phone : null;
      syncSockets(); syncSeal();
      UI.sound('mic-off');
      fly(tmp, c.artEl, id, true).then(function () {
        tmp.remove();
        c.classList.remove('is-taken');
        c.classList.remove('is-back'); void c.offsetWidth; c.classList.add('is-back');
        c.__busy = false;
        if (promote) {
          delete S.seat.phone; S.seat[pos] = promote; setRing(promote);
          cards[promote].__busy = true;
          var seat = fillSeat(pos, promote, false);
          var sk = socketSets[0][S.order.indexOf(promote)];
          fly(sk, seat.medal, promote, false).then(function () { cards[promote].__busy = false; seat.classList.remove('is-pending'); seat.classList.add('is-in'); syncSockets(); });
        }
      });
    }

    function start() {
      S.started = true; pair = null;
      UI.sound('flee');
      center.classList.add('is-go');
      var far = rows.far, near = rows.near;
      [near, far].forEach(function (r) { r.removeAttribute('data-main'); });
      ctx.setTimeout(function () {
        UI.flash(stage, 'rgba(245,213,138,.35)', 500);
        ctx.toast({ icon: 'choice-go', text: 'История начинается', x: 960, y: 700, ms: 3200 });   // the table toast doubles itself (far copy at y 380, turned)
        SEATS.forEach(function (pos) {
          var st = boxes[pos].querySelector('.seat');
          if (st) st.classList.add('is-active');
        });
        L.nodes().forEach(function (n) { n.severin.setState('speaking'); });
      }, 420);
    }
  }

  /* =================================================================== TV */
  function mountTv(stage, ctx) {
    var root = h('div', { class: 'h4tv' });
    var bg = h('div', { class: 'h4tv__bg' }); UI.bgArt(bg, 'hall-heroes');
    root.appendChild(bg);
    root.appendChild(h('div', { class: 'h4tv__shade' }));
    var row = h('div', { class: 'h4tv__row' });
    var cols = {};
    UI.HERO_IDS.forEach(function (id) {
      var hd = UI.HEROES[id];
      var art = h('div', { class: 'h4tv__art' }); UI.bgArt(art, 'hero-' + id);
      var badge = h('div', { class: 'h4tv__badge' }, ringSvg('h4-ring'), h('span', { class: 'h4tv__no' }));
      var col = h('div', { class: 'h4tv__col' + ((window.art && window.art.isNew('hero-' + id)) ? '' : ' is-store') + (LOCKED[id] ? ' is-locked' : ''), 'data-hero': id, style: { '--hero': hd.color } },
        h('div', { class: 'h4tv__aura' }),
        art,
        badge,
        LOCKED[id] ? h('div', { class: 'h4tv__lock' }, UI.icon(LOCKED[id].icon)) : null,
        h('div', { class: 'h4tv__name', text: hd.short }),
        h('div', { class: 'h4tv__epi', text: hd.epithet }),
        h('div', { class: 'h4tv__abs' }, heroAbs(id).map(function (ab) { return abMedal(ab, 72); })));
      cols[id] = col; row.appendChild(col);
    });
    root.appendChild(row);
    var sev = UI.severin({ size: 96, state: 'speaking', cycle: false });
    var sub = h('div', { class: 'h4tv__sub' }, sev, h('div', { class: 'h4tv__line', text: 'Кто пойдёт к Мельничьему броду?' }));
    root.appendChild(sub);
    stage.appendChild(root);

    function paint(map, fresh) {
      UI.HERO_IDS.forEach(function (id) {
        var pos = null; for (var k in map) if (map[k] === id) pos = k;
        var col = cols[id], was = col.classList.contains('is-taken');
        col.classList.toggle('is-taken', !!pos);
        var no = col.querySelector('.h4tv__no'); no.innerHTML = '';
        if (pos) no.appendChild(pos === 'phone' ? UI.icon('dev-phone') : document.createTextNode(String(SEAT_NO[pos])));
        if (pos && !was && fresh) {
          col.classList.remove('is-stamp'); void col.offsetWidth; col.classList.add('is-stamp');
          var c = UI.center(col.querySelector('.h4tv__badge'), stage);
          UI.stampFx(stage, c.x, c.y, UI.HEROES[id].color);
          UI.sound('stamp');
        }
      });
    }
    paint(S.seat, false);
    if (!S.order.length) {
      // nobody chose yet: play the concept party sitting down, one by one
      var demo = {}, seq = [['nearLeft', 'guardian'], ['nearRight', 'fury'], ['farLeft', 'beacon'], ['farRight', 'arcanist']];
      var i = 0;
      var step = function () {
        if (i >= seq.length) { ctx.setTimeout(function () { demo = {}; i = 0; paint(demo, false); ctx.setTimeout(step, 900); }, 3200); return; }
        demo[seq[i][0]] = seq[i][1]; i++;
        paint(demo, true);
        ctx.setTimeout(step, 900);
      };
      ctx.setTimeout(step, 700);
    }
  }

  Deck.register({
    id: '04',
    key: 'heroes',
    title: 'Выбор героев',
    change: 'Зал героев вместо чекбоксов: тап — герой садится к тебе',
    surface: 'table',
    before: 'before/03-setup-tabletop.webp',
    css: true,
    views: [
      { key: 'table', label: 'Стол', surface: 'table', before: 'before/03-setup-tabletop.webp' },
      { key: 'tv', label: 'ТВ', surface: 'tv', before: 'before/04-setup-scene.webp' }
    ],
    quiz: [
      { q: 'Что нажать?', a: 'Героя — он сядет к тебе', sel: '[data-main]' },
      { q: 'Сколько нужно?', a: 'Трое из пяти гнёзд', sel: '[data-turn]' }
    ],
    mount: function (stage, ctx) {
      if (ctx.view === 'tv' || ctx.surface === 'tv') mountTv(stage, ctx);
      else mountTable(stage, ctx);
    }
  });
})();
