/* =====================================================================
   Slide 16 · «Пульт мастера» — GM console in «Живой мастер» mode.
   Tablet landscape 1280×800 & Laptop 1920×1080.
   Screens: История · Бой · Привал · Финал.
   Drawers: Лица · Тайны · Дар.
   ===================================================================== */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h, s = UI.s;
  var SVGNS = 'http://www.w3.org/2000/svg';

  var PARTY_IDS = ['guardian', 'fury', 'beacon', 'arcanist'];

  var BEATS = [
    {
      key: 'arrival',
      step: 0,
      title: 'Околица Тихой',
      bg: 'backdrop-arrival',
      readAloud: 'Деревня Тихая почернела у самой воды. Ставни забиты, от старой мельницы тянет болотной тиной и дёгтем, а у мокрых мостков качается пустая лодка.',
      choices: [
        { key: 'talk', icon: 'choice-talk', words: 'Расспросить', sub: 'К мельничихе Агафье у запруды', next: 1 },
        { key: 'sneak', icon: 'choice-sneak', words: 'Красться', sub: 'Скрытность к20 +2 против 12', next: 2 },
        { key: 'search', icon: 'choice-search', words: 'Искать', sub: 'Осмотреть мостки и следы у воды', next: 2 },
        { key: 'leave', icon: 'back', words: 'Уйти', sub: 'Обогнуть брод по старому тракту', next: 1 }
      ]
    },
    {
      key: 'miller',
      step: 1,
      title: 'Двор мельницы',
      bg: 'backdrop-miller',
      readAloud: 'Мельничиха Агафья приоткрывает засов на ладонь. «Не ходите к броду в темноте — шлюз ночью подняли нарочно, а ключ был только у старшины Онисима».',
      choices: [
        { key: 'onisim', icon: 'choice-talk', words: 'Допросить', sub: 'Прижать старшину Онисима к стенке', next: 2 },
        { key: 'ford', icon: 'choice-go', words: 'К броду', sub: 'Спуститься к чёрной воде с фонарём', next: 2 },
        { key: 'ambush', icon: 'choice-sneak', words: 'Засада', sub: 'Затаиться в камышах у затвора', next: 2 },
        { key: 'search', icon: 'choice-search', words: 'Обыскать', sub: 'Проверить амбар и цепь шлюза', next: 2 }
      ]
    },
    {
      key: 'ford',
      step: 2,
      title: 'Чёрная вода у брода',
      bg: 'backdrop-ford',
      readAloud: 'Чёрная вода у Мельничьего Брода закипает пузырями. Из-под корней и мокрых камней поднимаются горбатые спины тинников — во главе с Матёрым.',
      choices: [
        { key: 'strike', icon: 'choice-fight', words: 'Ударить', sub: 'Войти в воду и бить первыми', next: 'fight' },
        { key: 'wait', icon: 'hourglass', words: 'Ждать', sub: 'Подпустить тинников к берегу', next: 'fight' },
        { key: 'sluice', icon: 'clue-key', words: 'Затвор', sub: 'Рвануть цепь мельничного шлюза', next: 'fight' },
        { key: 'back', icon: 'back', words: 'Отступить', sub: 'Отойти к каменному мосту', next: 0 }
      ]
    }
  ];

  var NPCS = [
    {
      id: 'onisim',
      name: 'Онисим',
      role: 'Старшина Тихой',
      art: 'portrait-onisim',
      says: '«Вода сама поднялась, клянусь старой плотиной! Заслонка с осени прогнила».',
      hides: 'Ночью сам отдал ключ от шлюза людям Карася за долю с казённой соли.'
    },
    {
      id: 'agafya',
      name: 'Агафья',
      role: 'Мельничиха у запруды',
      art: 'backdrop-miller',
      says: '«Не ходите к броду после заката — из омута тянет ледяной тиной».',
      hides: 'Видела с крыльца, как старшина открывал затвор и светил фонарём лодке.'
    },
    {
      id: 'karas',
      name: 'Карась',
      role: 'Приказчик солеварни',
      art: 'portrait-karas',
      says: '«Соль казённая, проезжайте мимо по тракту, нечего тут вынюхивать».',
      hides: 'Прячет на дне лодки печать солеварни и ждёт высокой воды у брода.'
    }
  ];

  var CLUES_INIT = [
    {
      id: 'village',
      icon: 'clue-scroll',
      title: 'Тихая заперлась',
      text: 'Деревня сидит за засовами: по ночам из ила у мельницы выползают тинники.',
      open: true
    },
    {
      id: 'key',
      icon: 'clue-key',
      title: 'Ключ от шлюза',
      text: 'Затвор мельницы подняли нарочно хозяйским ключом — он висел у старшины.',
      open: false
    },
    {
      id: 'track',
      icon: 'clue-track',
      title: 'Следы у камышей',
      text: 'Мокрые перепончатые следы и свежий дёготь ведут от шлюза к лодке Карася.',
      open: false
    }
  ];

  var GIFTS = [
    { id: 'inspire', title: 'Вдохновение', desc: '+1к6 к любому броску на выбор игрока', art: 'ab-voice-inspire' },
    { id: 'lantern', title: 'Фонарь брода', desc: 'Разгоняет туман и даёт преимущество у воды', art: 'ab-beacon-flame' },
    { id: 'ward', title: 'Оберег мельницы', desc: '+2 к защите против ударов из тины', art: 'ab-arcanist-shield' }
  ];

  var FOES_INIT = [
    { id: 'big', enemy: 'tinnik-big', name: 'Матёрый тинник', hp: 12, max: 12, ac: 13, dmg: '1к8+2', x: 6, y: 4, leader: true },
    { id: 'silt', enemy: 'tinnik-silt', name: 'Илистый тинник', hp: 16, max: 16, ac: 12, dmg: '1к6+2', x: 7, y: 2 },
    { id: 'small1', enemy: 'tinnik-small', name: 'Мелкий тинник', hp: 8, max: 8, ac: 11, dmg: '1к4+1', x: 7, y: 6 },
    { id: 'small2', enemy: 'tinnik-small', name: 'Тинник у камней', hp: 6, max: 8, ac: 11, dmg: '1к4+1', x: 9, y: 4 }
  ];

  var TURN_ORDER = [
    { id: 'guardian', hero: 'guardian' },
    { id: 'fury', hero: 'fury' },
    { id: 'big', enemy: 'tinnik-big' },
    { id: 'silt', enemy: 'tinnik-silt' },
    { id: 'beacon', hero: 'beacon' },
    { id: 'arcanist', hero: 'arcanist' },
    { id: 'small1', enemy: 'tinnik-small' }
  ];

  var OUTCOMES = {
    victory: {
      key: 'victory',
      icon: 'laurel',
      word: 'Победа',
      short: 'Победа',
      art: 'victory-dawn',
      hp: { guardian: 22, fury: 26, beacon: 18, arcanist: 11 },
      hook: 'Тинники ушли под чёрную воду, и Мельничий Брод снова открыт. Но на мокром камне у затвора блестит оброненная печать солеварни — кто открыл шлюз этой ночью?'
    },
    mixed: {
      key: 'mixed',
      icon: 'laurel-broken',
      word: 'Успех с потерями',
      short: 'Потери',
      art: 'victory-dawn',
      hp: { guardian: 11, fury: 6, beacon: 4, arcanist: 0 },
      hook: 'Брод удержан дорогой ценой: Кощей пал у старого колеса, а лодка Карася ушла вниз по течению с печатью солеварни. В его книге остались ещё две реки.'
    },
    defeat: {
      key: 'defeat',
      icon: 'skull',
      word: 'Поражение',
      short: 'Поражение',
      art: 'defeat-water',
      hp: { guardian: 0, fury: 0, beacon: 0, arcanist: 0 },
      hook: 'Чёрная вода сомкнулась над мостками, и старое колесо мельницы заскрипело во тьме. Деревня Тихая ждёт новых смельчаков на рассвете.'
    }
  };

  /* Inline embossed SVG outcome emblem from Slide 14 */
  var LEAVES_L = [[9.21, 17.48, 175], [6.94, 15.74, 200], [5.62, 13.21, 225], [5.5, 10.35, 250], [6.59, 7.71, 275], [8.5, 5.9, 298]];
  function leavesSvg(list, fill, extra) {
    return list.map(function (l) {
      return '<ellipse cx="' + l[0] + '" cy="' + l[1] + '" rx="1.1" ry="2.55" transform="rotate(' + l[2] + ' ' + l[0] + ' ' + l[1] + ')" fill="' + fill + '" ' + (extra || '') + '/>';
    }).join('');
  }
  function mirrorLeaves(list) {
    return list.map(function (l) { return [24 - l[0], l[1], 180 - l[2]]; });
  }
  function outcomeEmblemSvg(kind) {
    var id = 'gm-emb-' + kind;
    var g = 'url(#' + id + ')', edge = 'stroke="#5A3A12" stroke-width=".28"';
    var defs = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      (kind === 'defeat'
        ? '<stop offset="0" stop-color="#F2F4FA"/><stop offset=".55" stop-color="#B7C3D8"/><stop offset="1" stop-color="#5E6F8C"/>'
        : '<stop offset="0" stop-color="#FFF1C4"/><stop offset=".35" stop-color="#F5D58A"/><stop offset="1" stop-color="#A67C43"/>') +
      '</linearGradient></defs>';
    var body;
    if (kind === 'defeat') {
      edge = 'stroke="#1E2738" stroke-width=".3"';
      body = '<path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V19a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 19v-3.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7z" fill="' + g + '" ' + edge + '/>' +
        '<circle cx="9.2" cy="10.5" r="1.75" fill="#0B0E16"/><circle cx="14.8" cy="10.5" r="1.75" fill="#0B0E16"/>' +
        '<path d="M12 12.6l-1.1 2.2h2.2z" fill="#0B0E16"/>' +
        '<path d="M9.8 17.2v2.8M12 17.2v2.8M14.2 17.2v2.8" stroke="#0B0E16" stroke-width=".75" stroke-linecap="round"/>';
    } else {
      var stems = '<path d="M12 19.2C7 17.2 5 12.2 7 6.2M12 19.2c5-2 7-7 5-13" fill="none" stroke="' + g + '" stroke-width="1.05" stroke-linecap="round"/>';
      var tie = '<path d="M9.4 20.6L12 18.4l2.6 2.2" fill="none" stroke="' + g + '" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>';
      var crown = '<polygon points="12,2.2 13.2,4.4 12,3.8 10.8,4.4" fill="' + g + '" ' + edge + '/>';
      var rList = mirrorLeaves(LEAVES_L);
      if (kind === 'victory') {
        body = stems + tie + crown + leavesSvg(LEAVES_L, g, edge) + leavesSvg(rList, g, edge);
      } else {
        body = stems + tie + leavesSvg(LEAVES_L, g, edge) +
          leavesSvg(rList.slice(0, 3), g, edge) +
          '<g transform="translate(1.2 1.8) rotate(14 17 9)">' + leavesSvg(rList.slice(4), g, edge) + '</g>' +
          '<path d="M14.4 12.4l5.2-2.2" stroke="#0C0805" stroke-width="1.5" stroke-linecap="round"/>' +
          '<ellipse cx="18.6" cy="22.8" rx="1.1" ry="2.55" transform="rotate(72 18.6 22.8)" fill="' + g + '" ' + edge + ' opacity=".85"/>';
      }
    }
    return '<svg xmlns="' + SVGNS + '" viewBox="-1 -1 26 26" aria-hidden="true">' + defs + body + '</svg>';
  }

  /* Persistent state across tablet/laptop view switches */
  var S = {
    tab: 'story',          // 'story' | 'fight' | 'rest' | 'finale'
    drawer: null,          // null | 'faces' | 'clues' | 'gift'
    beatIdx: 0,
    choiceIdx: 0,
    proposed: false,
    counted: false,
    tvNpc: 'onisim',
    tvSub: 'Тихая почернела у самой воды…',
    tableNote: 'Слушают сцену',
    clues: JSON.parse(JSON.stringify(CLUES_INIT)),
    giftHero: 'guardian',
    giftCard: 'inspire',
    gifted: { guardian: true },
    /* Fight state */
    enemyTurn: true,
    turnIdx: 2,            // 2 = Матёрый тинник
    targetHero: 'guardian',
    pickingTarget: false,
    timerSec: 40,
    foes: JSON.parse(JSON.stringify(FOES_INIT)),
    heroHp: { guardian: 28, fury: 32, beacon: 22, arcanist: 15 },
    /* Rest state */
    restType: 'short',     // 'short' | 'long'
    restStarted: false,
    restHp: { guardian: 18, fury: 14, beacon: 16, arcanist: 9 },
    /* Finale state */
    outcome: 'mixed'       // 'victory' | 'mixed' | 'defeat'
  };

  function mount(stage, ctx) {
    var isLaptop = ctx.view === 'laptop' || stage.offsetWidth >= 1600;
    stage.setAttribute('data-device', isLaptop ? 'laptop' : 'tablet');

    /* Default to 'new' mode on slide 16 when not explicitly in compare mode so the console frame fills the view */
    var dk = document.querySelector('.dk');
    if (dk && window.Deck && !window.Deck.modeExplicit && dk.getAttribute('data-mode') === 'compare') {
      window.Deck.mode = 'new';
      dk.setAttribute('data-mode', 'new');
      window.dispatchEvent(new Event('resize'));
    }

    var root = h('div', { class: 'gm' + (isLaptop ? ' is-laptop' : '') });
    [['--gm-surface', 'table-surface'], ['--gm-leather', 'texture-leather'], ['--gm-parch', 'texture-parchment']].forEach(function (p) {
      var u = UI.art(p[1]);
      if (u) root.style.setProperty(p[0], 'url("' + new URL(u, document.baseURI).href + '")');
    });

    var amb = h('div', { class: 'gm__amb' });
    root.appendChild(amb);
    root.appendChild(h('div', { class: 'gm__vig' }));
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) {
      root.appendChild(UI.rhomb('gm__corner gm__corner--' + c));
    });

    /* ---------- Header Bar ---------- */
    var sevCrest = h('div', { class: 'gm-brand__sev' });
    UI.bgArt(sevCrest, 'severin-bust');
    var brand = h('div', { class: 'gm-brand' },
      sevCrest,
      h('div', { class: 'gm-brand__txt' },
        h('span', { class: 'gm-brand__eyebrow', text: 'Живой мастер' }),
        h('span', { class: 'gm-brand__title', text: 'Пульт мастера' })));

    var tabDefs = [
      { key: 'story', icon: 'scroll', word: 'История' },
      { key: 'fight', icon: 'swords', word: 'Бой' },
      { key: 'rest', icon: 'campfire', word: 'Привал' },
      { key: 'finale', icon: 'laurel', word: 'Финал' }
    ];
    var tabBtns = {};
    var tabsEl = h('div', { class: 'gm-tabs', role: 'tablist' });
    tabDefs.forEach(function (td) {
      var b = h('button', {
        class: 'gm-tab' + (S.tab === td.key ? ' is-on' : ''),
        type: 'button',
        'data-tab': td.key,
        'aria-label': td.word
      },
        UI.icon(td.icon),
        h('span', { text: td.word }),
        UI.rhomb('gm-tab__jewel'));
      ctx.on(b, 'click', function () { setTab(td.key); });
      tabBtns[td.key] = b;
      tabsEl.appendChild(b);
    });

    var linkTable = h('button', { class: 'gm-link', type: 'button', 'aria-label': 'Стол на связи' },
      h('i', { class: 'gm-link__dot' }),
      UI.icon('dev-table'),
      h('span', { text: 'Стол на связи' }));
    var linkTv = h('button', { class: 'gm-link', type: 'button', 'aria-label': 'ТВ на связи' },
      h('i', { class: 'gm-link__dot' }),
      UI.icon('dev-tv'),
      h('span', { text: 'ТВ на связи' }));
    ctx.on(linkTable, 'click', function () {
      UI.toast(stage, { icon: 'dev-table', text: 'Стол на связи · 4 места готовы', tone: 'good' });
    });
    ctx.on(linkTv, 'click', function () {
      UI.toast(stage, { icon: 'dev-tv', text: 'ТВ на связи · сцена синхронизирована', tone: 'good' });
    });

    var devSwitch = h('button', {
      class: 'gm-devbtn',
      type: 'button',
      'aria-label': isLaptop ? 'Ноутбук 1920×1080' : 'Планшет 1280×800'
    },
      UI.icon(isLaptop ? 'dev-tv' : 'dev-table'),
      h('span', { text: isLaptop ? '1920×1080' : '1280×800' }));
    ctx.on(devSwitch, 'click', function () {
      if (window.Deck) {
        window.Deck.view = isLaptop ? 'tablet' : 'laptop';
        window.Deck.viewExplicit = true;
        window.Deck.show(window.Deck.index, { force: true, keepView: true });
      }
    });

    var statusEl = h('div', { class: 'gm-status' }, linkTable, linkTv, devSwitch);
    var barEl = h('header', { class: 'gm-bar' }, brand, tabsEl, statusEl);
    root.appendChild(barEl);

    /* ---------- Body Grid ---------- */
    var mainEl = h('main', { class: 'gm-main' });
    var sideEl = h('aside', { class: 'gm-side' });
    var bodyEl = h('div', { class: 'gm-body' }, mainEl, sideEl);
    root.appendChild(bodyEl);
    stage.appendChild(root);

    /* ---------- 40s Enemy Countdown Interval ---------- */
    var ringFgEl = null, ringNumEl = null;
    ctx.setInterval(function () {
      if (S.tab !== 'fight' || !S.enemyTurn || S.drawer) return;
      S.timerSec = S.timerSec <= 1 ? 40 : S.timerSec - 1;
      updateTimerDom();
    }, 1000);

    function updateTimerDom() {
      if (ringNumEl) ringNumEl.textContent = String(S.timerSec);
      if (ringFgEl) {
        var offset = (100 - (S.timerSec / 40) * 100).toFixed(1);
        ringFgEl.style.strokeDashoffset = offset;
      }
    }

    /* ---------- Helper: Build Right Sidebar Mirrors ---------- */
    function buildMirrors(bgKey, subText, npcArtKey) {
      var mTableBg = h('div', { class: 'gm-mirror__bg' });
      UI.bgArt(mTableBg, bgKey);
      var seatsBox = h('div', { class: 'gm-mirror__seats' });
      PARTY_IDS.forEach(function (hid) {
        var hd = UI.HEROES[hid];
        var sdot = h('span', { class: 'gm-mirror__seat', style: { '--c': hd.color } });
        UI.bgArt(sdot, 'bust-' + hid);
        seatsBox.appendChild(sdot);
      });
      var mTable = h('div', { class: 'gm-mirror' },
        mTableBg,
        h('div', { class: 'gm-mirror__shade' }),
        h('div', { class: 'gm-mirror__top' },
          h('span', { class: 'gm-mirror__lbl' }, UI.icon('dev-table'), h('span', { text: 'Стол' })),
          h('i', { class: 'gm-mirror__dot' })),
        seatsBox,
        h('div', { class: 'gm-mirror__sub', text: S.tableNote }));

      var mTvBg = h('div', { class: 'gm-mirror__bg' });
      UI.bgArt(mTvBg, bgKey);
      var npcThumb = h('div', { class: 'gm-mirror__npc' });
      UI.bgArt(npcThumb, npcArtKey || 'portrait-onisim');
      var mTv = h('div', { class: 'gm-mirror' },
        mTvBg,
        h('div', { class: 'gm-mirror__shade' }),
        h('div', { class: 'gm-mirror__top' },
          h('span', { class: 'gm-mirror__lbl' }, UI.icon('dev-tv'), h('span', { text: 'ТВ' })),
          h('i', { class: 'gm-mirror__dot' })),
        npcThumb,
        h('div', { class: 'gm-mirror__sub', text: subText || S.tvSub }));

      return h('div', { class: 'gm-mirrors' }, mTable, mTv);
    }

    /* ---------- Helper: Build Party Quick Bar ---------- */
    function buildPartyBox(hpMap, onHeroPick) {
      var row = h('div', { class: 'gm-party__row' });
      var medSize = isLaptop ? 68 : 50;
      PARTY_IDS.forEach(function (hid) {
        var hd = UI.HEROES[hid];
        var hp = hpMap && hpMap[hid] != null ? hpMap[hid] : hd.hp;
        var med = UI.medallion({ hero: hid, hp: hp, max: hd.max, size: medSize, state: hp <= 0 ? 'dead' : '' });
        var cell = h('button', {
          class: 'gm-pcell' + (S.giftHero === hid ? ' is-picked' : ''),
          type: 'button',
          style: { '--hero': hd.color },
          'aria-label': hd.short
        },
          S.gifted[hid] ? h('span', { class: 'gm-pcell__gift', title: 'Дар вручён' }, UI.icon('seal')) : null,
          med,
          h('span', { class: 'gm-pcell__name', text: hd.short }));
        ctx.on(cell, 'click', function () {
          S.giftHero = hid;
          if (onHeroPick) onHeroPick(hid);
          else openDrawer('gift');
        });
        row.appendChild(cell);
      });
      return h('div', { class: 'gm-party' },
        h('div', { class: 'gm-party__hd' },
          h('span', { text: 'Отряд у стола' }),
          h('span', { class: 'gm-party__hint', text: 'Тап по герою — дар' })),
        row);
    }

    /* ---------- Helper: Build Primary Gold Action Pedestal ---------- */
    function buildPedestal(opts) {
      var sealSize = isLaptop ? 132 : 102;
      var seal = UI.seal({
        icon: opts.icon,
        word: opts.word,
        size: sealSize,
        hold: opts.hold || 0,
        main: true,
        onPress: function () {
          seal.stamp({ hide: false }).then(function () {
            if (opts.onFire) opts.onFire();
          });
        }
      });
      if (opts.hold) {
        var t0 = 0;
        seal.addEventListener('pointerdown', function () { t0 = Date.now(); });
        seal.addEventListener('pointerup', function () {
          if (t0 && Date.now() - t0 < 450) {
            UI.sound('error');
            UI.toast(stage, { icon: 'hourglass', text: 'Держите печать полсекунды', tone: 'bad' });
          }
          t0 = 0;
        });
        seal.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      }
      var sealRow = opts.timerNode
        ? h('div', { class: 'gm-timer-wrap' }, opts.timerNode, seal)
        : h('div', { class: 'gm-pedestal__seal' }, seal);

      return UI.frame({ gold: true, jewel: true, cls: 'gm-pedestal' },
        h('div', { class: 'gm-pedestal__top' },
          h('span', { class: 'gm-pedestal__eyebrow', text: opts.eyebrow || 'Главное действие' }),
          h('div', { class: 'gm-pedestal__summary', text: opts.summary || '' })),
        sealRow,
        h('div', { class: 'gm-pedestal__foot' },
          h('span', { class: 'gm-kbd', text: 'Пробел' }),
          h('span', { text: opts.foot || 'Один тап — шаг вперёд' })));
    }

    /* =====================================================================
       RENDER SCREEN 1: ИСТОРИЯ
       ===================================================================== */
    function renderStory() {
      var beat = BEATS[S.beatIdx] || BEATS[0];
      var ch = beat.choices[S.choiceIdx] || beat.choices[0];
      UI.bgArt(amb, beat.bg);

      /* Read-aloud card */
      var artEl = h('div', { class: 'gm-read__art' });
      UI.bgArt(artEl, beat.bg);

      var bpath = h('div', { class: 'gm-bpath' });
      BEATS.forEach(function (b, idx) {
        var st = h('span', {
          class: 'gm-bpath__step' + (idx === S.beatIdx ? ' is-on' : idx < S.beatIdx ? ' is-done' : ''),
          title: b.title
        }, UI.rhomb('gm-bpath__r'));
        ctx.on(st, 'click', function () {
          S.beatIdx = idx;
          S.choiceIdx = 0;
          S.tvSub = BEATS[idx].readAloud.slice(0, 62) + '…';
          render();
        });
        bpath.appendChild(st);
        if (idx < BEATS.length - 1) bpath.appendChild(h('i', { class: 'gm-bpath__line' }));
      });

      var toTvBtn = h('button', { class: 'gm-btn gm-btn--gold', type: 'button', 'aria-label': 'На ТВ' },
        UI.icon('dev-tv'),
        h('span', { text: 'На ТВ' }));
      ctx.on(toTvBtn, 'click', function () {
        S.tvSub = beat.readAloud.slice(0, 66) + '…';
        UI.sound('pick');
        var p = UI.center(toTvBtn, stage);
        UI.spark(stage, p.x, p.y, 'var(--gold-hi)', 10);
        UI.toast(stage, { icon: 'dev-tv', text: 'Строка отправлена на ТВ', tone: 'good' });
        render();
      });

      var readCard = UI.frame({ gold: true, jewel: true, cls: 'gm-read' },
        artEl,
        h('div', { class: 'gm-read__shade' }),
        h('div', { class: 'gm-read__top' },
          h('div', { class: 'gm-read__beat' },
            h('span', { class: 'gm-read__tag' }, UI.icon('scroll'), h('span', { text: 'Бит ' + (S.beatIdx + 1) + ' из 3' })),
            h('span', { class: 'gm-read__title', text: beat.title })),
          bpath),
        h('div', { class: 'gm-read__bot' },
          h('div', { class: 'gm-read__copy' },
            h('span', { class: 'gm-read__eyebrow' }, UI.icon('speaker'), h('span', { text: 'Читай вслух' })),
            h('p', { class: 'gm-read__text', text: beat.readAloud })),
          toTvBtn));

      /* Choices grid */
      var chGrid = h('div', { class: 'gm-choices' });
      beat.choices.forEach(function (item, idx) {
        var sel = idx === S.choiceIdx;
        var card = h('button', {
          class: 'gm-ch' + (sel ? ' is-selected' : '') + (sel && S.counted ? ' is-counted' : ''),
          type: 'button',
          'data-choice-idx': String(idx),
          'aria-label': item.words
        },
          h('span', { class: 'gm-kbd gm-ch__kbd', text: String(idx + 1) }),
          h('span', { class: 'gm-ch__state', text: 'Засчитано' }),
          h('span', { class: 'gm-ch__ic' }, UI.icon(item.icon)),
          h('span', { class: 'gm-ch__w', text: item.words }),
          h('span', { class: 'gm-ch__sub', text: item.sub }));
        ['tl', 'tr', 'bl', 'br'].forEach(function (c) {
          card.appendChild(UI.rhomb('frame__corner frame__corner--' + c));
        });
        ctx.on(card, 'click', function () {
          S.choiceIdx = idx;
          S.counted = false;
          UI.sound('tap');
          render();
        });
        chGrid.appendChild(card);
      });

      /* Story action toolbar */
      var btnPropose = h('button', {
        class: 'gm-btn' + (S.proposed ? ' is-active' : ''),
        type: 'button',
        'aria-label': 'Предложить'
      }, UI.icon('dev-table'), h('span', { text: 'Предложить' }));
      ctx.on(btnPropose, 'click', function () {
        S.proposed = true;
        S.tableNote = 'Выбор на столе (' + beat.choices.length + ')';
        UI.sound('open');
        UI.toast(stage, { icon: 'dev-table', text: 'Карточки выбора выложены на стол', tone: 'good' });
        render();
      });

      var btnCount = h('button', {
        class: 'gm-btn' + (S.counted ? ' is-active' : ''),
        type: 'button',
        'aria-label': 'Засчитать'
      }, UI.icon('check'), h('span', { text: 'Засчитать' }));
      ctx.on(btnCount, 'click', function () {
        S.counted = true;
        S.tableNote = 'Выбрано: «' + ch.words + '»';
        UI.sound('pick');
        UI.toast(stage, { icon: 'check', text: 'Засчитан выбор: «' + ch.words + '»', tone: 'good' });
        render();
      });

      var openCluesCount = S.clues.filter(function (c) { return c.open; }).length;
      var btnFaces = h('button', {
        class: 'gm-btn' + (S.drawer === 'faces' ? ' is-active' : ''),
        type: 'button',
        'data-drawer-btn': 'faces',
        'aria-label': 'Лица'
      }, UI.icon('eye'), h('span', { text: 'Лица' }));
      ctx.on(btnFaces, 'click', function () { openDrawer(S.drawer === 'faces' ? null : 'faces'); });

      var btnClues = h('button', {
        class: 'gm-btn' + (S.drawer === 'clues' ? ' is-active' : ''),
        type: 'button',
        'data-drawer-btn': 'clues',
        'aria-label': 'Тайны'
      }, UI.icon('clue-key'), h('span', { text: 'Тайны' }), h('b', { class: 'gm-btn__badge', text: openCluesCount + '/' + S.clues.length }));
      ctx.on(btnClues, 'click', function () { openDrawer(S.drawer === 'clues' ? null : 'clues'); });

      var btnGift = h('button', {
        class: 'gm-btn' + (S.drawer === 'gift' ? ' is-active' : ''),
        type: 'button',
        'data-drawer-btn': 'gift',
        'aria-label': 'Дар'
      }, UI.icon('seal'), h('span', { text: 'Дар' }));
      ctx.on(btnGift, 'click', function () { openDrawer(S.drawer === 'gift' ? null : 'gift'); });

      var toolbar = h('div', { class: 'gm-toolbar' },
        h('div', { class: 'gm-toolbar__g' }, btnPropose, btnCount),
        h('div', { class: 'gm-toolbar__g' }, btnFaces, btnClues, btnGift));

      mainEl.appendChild(readCard);
      mainEl.appendChild(h('div', { class: 'gm-choices-box' }, chGrid, toolbar));

      /* Right sidebar */
      var activeNpc = NPCS.filter(function (n) { return n.id === S.tvNpc; })[0] || NPCS[0];
      sideEl.appendChild(buildMirrors(beat.bg, S.tvSub, activeNpc.art));
      sideEl.appendChild(buildPartyBox(S.heroHp));
      sideEl.appendChild(buildPedestal({
        icon: 'arrow-right',
        word: 'Дальше',
        eyebrow: 'Шаг истории',
        summary: '«' + ch.words + '» → ' + (ch.next === 'fight' ? 'К бою у брода' : BEATS[ch.next].title),
        foot: 'Засчитать выбор стола и перейти',
        onFire: function () {
          if (ch.next === 'fight') {
            S.tab = 'fight';
            S.tableNote = 'Бой у Мельничьего Брода';
            UI.toast(stage, { icon: 'swords', text: 'Переход к бою у брода!', tone: 'good' });
          } else {
            S.beatIdx = ch.next;
            S.choiceIdx = 0;
            S.proposed = false;
            S.counted = false;
            S.tvSub = BEATS[S.beatIdx].readAloud.slice(0, 62) + '…';
            S.tableNote = 'Бит: ' + BEATS[S.beatIdx].title;
            UI.toast(stage, { icon: 'arrow-right', text: 'Следующий бит: ' + BEATS[S.beatIdx].title, tone: 'good' });
          }
          render();
        }
      }));
    }

    /* =====================================================================
       RENDER DRAWERS: ЛИЦА · ТАЙНЫ · ДАР
       ===================================================================== */
    function renderDrawer() {
      if (!S.drawer) return;
      var wrap = h('div', { class: 'gm-drawer-wrap' });
      var titleMap = {
        faces: { icon: 'eye', title: 'Лица · Персонажи у Мельничьего Брода' },
        clues: { icon: 'clue-key', title: 'Тайны · Улики приключения' },
        gift: { icon: 'seal', title: 'Дар · Награда герою от мастера' }
      };
      var meta = titleMap[S.drawer];
      var closeBtn = h('button', { class: 'gm-drawer__close', type: 'button', 'aria-label': 'Закрыть' }, UI.icon('cross'));
      ctx.on(closeBtn, 'click', function () { openDrawer(null); });

      var contentNode = null;
      if (S.drawer === 'faces') {
        contentNode = h('div', { class: 'gm-npcs' });
        NPCS.forEach(function (npc) {
          var port = h('div', { class: 'gm-npc__port' });
          UI.bgArt(port, npc.art);
          var tvBtn = h('button', {
            class: 'gm-btn' + (S.tvNpc === npc.id ? ' gm-btn--gold' : ''),
            type: 'button',
            style: { width: '100%' },
            'aria-label': 'На ТВ'
          }, UI.icon('dev-tv'), h('span', { text: 'На ТВ' }));
          ctx.on(tvBtn, 'click', function () {
            S.tvNpc = npc.id;
            S.tvSub = npc.name + ': ' + npc.says;
            UI.sound('pick');
            UI.toast(stage, { icon: 'dev-tv', text: npc.name + ' выведен на ТВ', tone: 'good' });
            render();
          });

          var card = h('div', { class: 'gm-npc' + (S.tvNpc === npc.id ? ' is-on-tv' : '') },
            h('div', { class: 'gm-npc__top' },
              port,
              h('div', { class: 'gm-npc__id' },
                h('span', { class: 'gm-npc__name', text: npc.name }),
                h('span', { class: 'gm-npc__role', text: npc.role }))),
            h('div', { class: 'gm-npc__lines' },
              h('div', { class: 'gm-npc__line' },
                h('span', { class: 'gm-npc__lbl' }, UI.icon('speaker'), h('span', { text: 'Говорит вслух' })),
                h('p', { class: 'gm-npc__txt', text: npc.says })),
              h('div', { class: 'gm-npc__line gm-npc__line--secret' },
                h('span', { class: 'gm-npc__lbl' }, UI.icon('lock'), h('span', { text: 'Скрывает от стола' })),
                h('p', { class: 'gm-npc__txt', text: npc.hides }))),
            tvBtn);
          contentNode.appendChild(card);
        });
      } else if (S.drawer === 'clues') {
        contentNode = h('div', { class: 'gm-clues' });
        S.clues.forEach(function (cl) {
          var actBtn = h('button', {
            class: 'gm-btn' + (cl.open ? '' : ' gm-btn--gold'),
            type: 'button',
            style: { width: '100%' },
            'aria-label': cl.open ? 'Открыто' : 'Открыть'
          },
            UI.icon(cl.open ? 'check' : 'eye'),
            h('span', { text: cl.open ? 'Открыто' : 'Открыть' }));
          ctx.on(actBtn, 'click', function () {
            cl.open = !cl.open;
            UI.sound(cl.open ? 'heal' : 'tap');
            if (cl.open) {
              var p = UI.center(actBtn, stage);
              UI.spark(stage, p.x, p.y, 'var(--gold-hi)', 12);
              S.tableNote = 'Улика открыта: «' + cl.title + '»';
              UI.toast(stage, { icon: cl.icon, text: 'Улика «' + cl.title + '» открыта игрокам', tone: 'good' });
            }
            render();
          });

          var card = h('div', { class: 'gm-clue' + (cl.open ? ' is-open' : '') },
            h('span', { class: 'gm-clue__status', text: cl.open ? 'Открыто столу' : 'Скрыто от стола' }),
            h('div', { class: 'gm-clue__medal' }, UI.icon(cl.icon)),
            h('div', { class: 'gm-clue__title', text: cl.title }),
            h('p', { class: 'gm-clue__txt', text: cl.text }),
            actBtn);
          contentNode.appendChild(card);
        });
      } else if (S.drawer === 'gift') {
        var hRow = h('div', { class: 'gm-gift-heroes' });
        PARTY_IDS.forEach(function (hid, idx) {
          var hd = UI.HEROES[hid];
          var med = UI.medallion({ hero: hid, hp: S.heroHp[hid], max: hd.max, size: isLaptop ? 92 : 68 });
          var hb = h('button', {
            class: 'gm-ghero' + (S.giftHero === hid ? ' is-selected' : ''),
            type: 'button',
            style: { '--hero': hd.color },
            'aria-label': hd.short
          },
            h('span', { class: 'gm-kbd', text: String(idx + 1) }),
            med,
            h('span', { class: 'gm-ghero__name', text: hd.short }));
          ctx.on(hb, 'click', function () {
            S.giftHero = hid;
            UI.sound('tap');
            render();
          });
          hRow.appendChild(hb);
        });

        var gRow = h('div', { class: 'gm-gift-cards' });
        GIFTS.forEach(function (gf) {
          var art = h('span', { class: 'gm-gcard__art' });
          UI.bgArt(art, gf.art);
          var gb = h('button', {
            class: 'gm-gcard' + (S.giftCard === gf.id ? ' is-selected' : ''),
            type: 'button',
            'aria-label': gf.title
          },
            art,
            h('div', { class: 'gm-gcard__txt' },
              h('div', { class: 'gm-gcard__w', text: gf.title }),
              h('div', { class: 'gm-gcard__d', text: gf.desc })));
          ctx.on(gb, 'click', function () {
            S.giftCard = gf.id;
            UI.sound('tap');
            render();
          });
          gRow.appendChild(gb);
        });

        var chosenHero = UI.HEROES[S.giftHero];
        var chosenGift = GIFTS.filter(function (g) { return g.id === S.giftCard; })[0] || GIFTS[0];
        var giveBtn = h('button', {
          class: 'gm-btn gm-btn--gold gm-gift-submit',
          type: 'button',
          'aria-label': 'Подарить в руку'
        },
          UI.icon('seal'),
          h('span', { text: 'Вручить дар · ' + chosenHero.short }));
        ctx.on(giveBtn, 'click', function () {
          S.gifted[S.giftHero] = true;
          S.tableNote = 'Дар «' + chosenGift.title + '» → ' + chosenHero.short;
          UI.sound('ForTheGlory' in UI ? 'seal' : 'heal');
          var p = UI.center(giveBtn, stage);
          UI.spark(stage, p.x, p.y, 'var(--gold-hi)', 16);
          UI.toast(stage, { icon: 'seal', text: chosenHero.short + ' получает дар «' + chosenGift.title + '»!', tone: 'good' });
          openDrawer(null);
        });

        contentNode = h('div', { class: 'gm-gift-body' },
          hRow,
          gRow,
          h('div', { class: 'gm-gift-foot' },
            h('div', { class: 'gm-gift-note', text: 'Раз в сцену карточка уходит прямо на стол выбранному герою' }),
            giveBtn));
      }

      var drawerFrame = UI.frame({ gold: true, jewel: true, cls: 'gm-drawer' },
        h('div', { class: 'gm-drawer__hd' },
          h('div', { class: 'gm-drawer__titlebox' },
            h('span', { class: 'gm-drawer__ic' }, UI.icon(meta.icon)),
            h('span', { class: 'gm-drawer__title', text: meta.title })),
          closeBtn),
        contentNode);
      wrap.appendChild(drawerFrame);
      mainEl.appendChild(wrap);
    }

    /* =====================================================================
       RENDER SCREEN 2: БОЙ
       ===================================================================== */
    function renderFight() {
      UI.bgArt(amb, 'map-ford');

      /* Top initiative bar */
      var strip = UI.turnStrip({
        dir: 'h',
        size: isLaptop ? 56 : 46,
        big: isLaptop ? 76 : 62,
        phase: S.enemyTurn ? 'world' : 'heroes',
        round: '1/2',
        current: S.turnIdx,
        items: TURN_ORDER
      });
      strip.items.forEach(function (m, idx) {
        ctx.on(m, 'click', function () {
          S.turnIdx = idx;
          S.enemyTurn = !!TURN_ORDER[idx].enemy;
          S.timerSec = 40;
          UI.sound('turn');
          render();
        });
      });

      var btnEnemyTurn = h('button', {
        class: 'gm-btn' + (S.enemyTurn ? ' gm-btn--gold' : ''),
        type: 'button',
        'data-turn-toggle': '',
        'aria-label': S.enemyTurn ? 'Враг' : 'Герой'
      },
        UI.icon(S.enemyTurn ? 'phase-skull' : 'phase-sun'),
        h('span', { text: S.enemyTurn ? 'Враг' : 'Герой' }),
        h('span', { class: 'gm-kbd', text: 'N' }));
      ctx.on(btnEnemyTurn, 'click', function () {
        toggleEnemyTurn();
      });

      var btnAim = h('button', {
        class: 'gm-btn' + (S.pickingTarget ? ' is-active' : ''),
        type: 'button',
        'data-aim-btn': '',
        'aria-label': 'Цель'
      },
        UI.icon('target'),
        h('span', { text: 'Цель' }));
      ctx.on(btnAim, 'click', function () {
        S.pickingTarget = !S.pickingTarget;
        UI.sound('tap');
        render();
      });

      var fightTop = h('div', { class: 'gm-fight-top' },
        strip,
        h('div', { class: 'gm-toolbar__g' }, btnAim, btnEnemyTurn));

      /* Battle Map with real tokens */
      var cellPx = isLaptop ? 82 : 60;
      var tokens = [
        { id: 'guardian', hero: 'guardian', x: 4, y: 4, hp: S.heroHp.guardian, max: 28 },
        { id: 'fury', hero: 'fury', x: 4, y: 6, hp: S.heroHp.fury, max: 35 },
        { id: 'beacon', hero: 'beacon', x: 2, y: 3, hp: S.heroHp.beacon, max: 24 },
        { id: 'arcanist', hero: 'arcanist', x: 2, y: 5, hp: S.heroHp.arcanist, max: 17 }
      ];
      S.foes.forEach(function (f) {
        if (f.hp > 0) {
          tokens.push({ id: f.id, enemy: f.enemy, x: f.x, y: f.y, hp: f.hp, max: f.max });
        }
      });

      var board = UI.board({
        map: 'map-ford',
        cols: 12,
        rows: 9,
        cell: cellPx,
        bleed: false,
        tokens: tokens,
        active: TURN_ORDER[S.turnIdx].id,
        onTokenTap: function (id) {
          if (UI.HEROES[id]) {
            S.targetHero = id;
            S.pickingTarget = false;
            UI.sound('pick');
            UI.toast(stage, { icon: 'target', text: 'Цель врага: ' + UI.HEROES[id].short, tone: 'info' });
            render();
          }
        }
      });

      /* Add GM-only numeric HP badges onto every enemy token */
      S.foes.forEach(function (f) {
        var tok = board.token(f.id);
        if (tok && tok.el) {
          tok.el.appendChild(h('span', { class: 'gm-foe-hp', text: f.hp + '/' + f.max + ' · КД ' + f.ac }));
        }
      });

      /* Highlight target & draw planned enemy attack arrow */
      board.setTargets(PARTY_IDS, function (hid) {
        S.targetHero = hid;
        S.pickingTarget = false;
        UI.sound('pick');
        UI.toast(stage, { icon: 'target', text: 'Цель сменена: ' + UI.HEROES[hid].short, tone: 'info' });
        render();
      });
      board.pick(S.targetHero);
      board.intent('big', { icon: 'intent-strike' });
      board.arrow('big', S.targetHero, { enemy: true, width: isLaptop ? 9 : 7 });

      var mapBleed = h('div', { class: 'gm-mapbox__bleed' });
      UI.bgArt(mapBleed, 'map-ford');
      var mapBox = h('div', { class: 'gm-mapbox' },
        mapBleed,
        h('div', { class: 'gm-map-hud' },
          UI.icon('eye'),
          h('span', { text: 'Хиты врагов видны только мастеру · Тап по герою меняет цель' })),
        board);

      mainEl.appendChild(fightTop);
      mainEl.appendChild(mapBox);

      /* Right Sidebar in Fight */
      /* 1. GM-only Enemy HP Roster */
      var foeGrid = h('div', { class: 'gm-foes__grid' });
      S.foes.forEach(function (f) {
        var ed = UI.ENEMIES[f.enemy];
        var tokImg = h('span', { class: 'gm-foe-card__tok' });
        UI.bgArt(tokImg, ed.token);
        var card = h('button', {
          class: 'gm-foe-card' + (f.id === 'big' ? ' is-active' : ''),
          type: 'button',
          'aria-label': f.name
        },
          tokImg,
          h('div', { class: 'gm-foe-card__info' },
            h('span', { class: 'gm-foe-card__name', text: f.name }),
            h('div', { class: 'gm-foe-card__hp' },
              h('span', { text: '♥ ' + f.hp + '/' + f.max }),
              h('span', { class: 'gm-foe-card__ac', text: 'КД ' + f.ac }))));
        ctx.on(card, 'click', function () {
          f.hp = f.hp <= 2 ? f.max : f.hp - 3;
          UI.sound('hit');
          render();
        });
        foeGrid.appendChild(card);
      });
      var foesBox = h('div', { class: 'gm-foes' },
        h('div', { class: 'gm-foes__hd' },
          h('span', null, UI.icon('eye'), h('span', { text: 'Хиты врагов (скрыто от игроков)' })),
          h('span', { text: '4 в бою' })),
        foeGrid);

      /* 2. Planned Target Selector Card */
      var targetHd = UI.HEROES[S.targetHero];
      var foePort = h('span', { class: 'gm-plan__port', style: { '--c': 'var(--enemy)' } });
      UI.bgArt(foePort, 'token-tinnik-big');
      var heroPort = h('span', { class: 'gm-plan__port', style: { '--c': targetHd.color } });
      UI.bgArt(heroPort, 'bust-' + S.targetHero);

      var tBtns = h('div', { class: 'gm-plan__targets' });
      PARTY_IDS.forEach(function (hid, idx) {
        var hd = UI.HEROES[hid];
        var tb = h('button', {
          class: 'gm-tbtn' + (S.targetHero === hid ? ' is-target' : ''),
          type: 'button',
          style: { '--hero': hd.color },
          'data-target-hero': hid,
          'aria-label': hd.short
        },
          h('span', { class: 'gm-kbd', text: String(idx + 1) }),
          h('span', { text: hd.short }));
        ctx.on(tb, 'click', function () {
          S.targetHero = hid;
          UI.sound('pick');
          render();
        });
        tBtns.appendChild(tb);
      });

      var planBox = h('div', { class: 'gm-plan' },
        h('div', { class: 'gm-plan__vs' },
          h('div', { class: 'gm-plan__who' },
            foePort,
            h('div', { class: 'gm-plan__txt' },
              h('span', { class: 'gm-plan__lbl', text: 'Ходит враг' }),
              h('span', { class: 'gm-plan__name', style: { '--c': '#FF8A7A' }, text: 'Матёрый' }))),
          h('div', { class: 'gm-plan__mid' },
            UI.icon('intent-strike'),
            h('span', { text: 'к20+4 · 1к8+2' })),
          h('div', { class: 'gm-plan__who' },
            heroPort,
            h('div', { class: 'gm-plan__txt' },
              h('span', { class: 'gm-plan__lbl', text: 'Цель удара' }),
              h('span', { class: 'gm-plan__name', style: { '--c': targetHd.color }, text: targetHd.short })))),
        tBtns);

      /* 3. 40-second Countdown Ring + Gold Action «Как обычно» */
      ringFgEl = s('circle', {
        cx: 50, cy: 50, r: 43,
        class: 'gm-ring40__fg',
        pathLength: 100,
        'stroke-dasharray': '100',
        'stroke-dashoffset': String((100 - (S.timerSec / 40) * 100).toFixed(1))
      });
      ringNumEl = h('b', { class: 'gm-ring40__n', text: String(S.timerSec) });
      var timerRing = h('div', { class: 'gm-ring40', title: 'Автовыбор через 40 секунд' },
        s('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' },
          s('circle', { cx: 50, cy: 50, r: 43, class: 'gm-ring40__bg' }),
          ringFgEl),
        h('div', { class: 'gm-ring40__txt' },
          ringNumEl,
          h('span', { class: 'gm-ring40__s', text: 'сек' })));

      sideEl.appendChild(foesBox);
      sideEl.appendChild(planBox);
      sideEl.appendChild(buildPedestal({
        icon: 'swords',
        word: 'Как обычно',
        eyebrow: S.enemyTurn ? 'Ход врага · Автовыбор 40 с' : 'Ход стола · Ожидание',
        summary: 'Матёрый бьёт: ' + targetHd.short,
        foot: 'Исполнить намерение врага',
        timerNode: timerRing,
        onFire: function () {
          var tc = board.tokenCenter(S.targetHero) || { x: 300, y: 240 };
          UI.rollDie(stage, tc.x + 80, tc.y + 120, { die: 'd20', value: 16, mod: 4, size: isLaptop ? 120 : 96, hold: 800 }).then(function () {
            S.heroHp[S.targetHero] = Math.max(1, S.heroHp[S.targetHero] - 7);
            S.timerSec = 40;
            board.pop(S.targetHero, 7, 'dmg');
            UI.sound('hit');
            UI.toast(stage, { icon: 'swords', text: 'Матёрый тинник наносит 7 урона (' + targetHd.short + ')', tone: 'bad' });
            render();
          });
        }
      }));
    }

    /* =====================================================================
       RENDER SCREEN 3: ПРИВАЛ
       ===================================================================== */
    function renderRest() {
      UI.bgArt(amb, 'rest-campfire');
      var artEl = h('div', { class: 'gm-read__art' });
      UI.bgArt(artEl, 'rest-campfire');

      var optShort = h('button', {
        class: 'gm-ropt' + (S.restType === 'short' ? ' is-selected' : ''),
        type: 'button',
        'data-rest-opt': 'short',
        'aria-label': 'Короткий'
      },
        h('span', { class: 'gm-kbd gm-ch__kbd', text: '1' }),
        h('span', { class: 'gm-ropt__ic' }, UI.icon('campfire')),
        h('div', { class: 'gm-ropt__txt' },
          h('span', { class: 'gm-ropt__w', text: 'Короткий' }),
          h('span', { class: 'gm-ropt__d', text: 'Час у костра: герои тратят кости хитов, Кощей возвращает ячейку чар.' })));
      ctx.on(optShort, 'click', function () {
        S.restType = 'short';
        UI.sound('tap');
        render();
      });

      var optLong = h('button', {
        class: 'gm-ropt' + (S.restType === 'long' ? ' is-selected' : ''),
        type: 'button',
        'data-rest-opt': 'long',
        'aria-label': 'Долгий'
      },
        h('span', { class: 'gm-kbd gm-ch__kbd', text: '2' }),
        h('span', { class: 'gm-ropt__ic' }, UI.icon('moon')),
        h('div', { class: 'gm-ropt__txt' },
          h('span', { class: 'gm-ropt__w', text: 'Долгий' }),
          h('span', { class: 'gm-ropt__d', text: 'Ночь у старой мельницы: все хиты, кости и ячейки возвращаются полностью.' })));
      ctx.on(optLong, 'click', function () {
        S.restType = 'long';
        UI.sound('tap');
        render();
      });

      var partyRow = h('div', { class: 'gm-rest-party' });
      PARTY_IDS.forEach(function (hid) {
        var hd = UI.HEROES[hid];
        var hp = S.restHp[hid];
        var med = UI.medallion({ hero: hid, hp: hp, max: hd.max, size: isLaptop ? 88 : 64 });
        var giftBtn = h('button', {
          class: 'gm-btn',
          type: 'button',
          style: { width: '100%', height: isLaptop ? '50px' : '48px' },
          'aria-label': 'Дар'
        }, UI.icon('seal'), h('span', { text: 'Дар' }));
        ctx.on(giftBtn, 'click', function () {
          S.giftHero = hid;
          openDrawer('gift');
        });

        partyRow.appendChild(h('div', { class: 'gm-rhero', style: { '--hero': hd.color } },
          med,
          h('span', { class: 'gm-rhero__name', text: hd.short }),
          h('span', { class: 'gm-rhero__meta', text: 'Хиты ' + hp + '/' + hd.max + (hid === 'arcanist' ? ' · Чары' : ' · Кости 3/3') }),
          giftBtn));
      });

      var restScene = UI.frame({ gold: true, jewel: true, cls: 'gm-rest-scene' },
        artEl,
        h('div', { class: 'gm-read__shade' }),
        h('div', { class: 'gm-read__top', style: { padding: '0' } },
          h('div', { class: 'gm-read__beat' },
            h('span', { class: 'gm-read__tag' }, UI.icon('campfire'), h('span', { text: 'Лагерь у брода' })),
            h('span', { class: 'gm-read__title', text: 'Привал отряда' }))),
        h('div', { class: 'gm-rest-opts' }, optShort, optLong),
        partyRow);

      mainEl.appendChild(restScene);

      /* Right Sidebar in Rest */
      sideEl.appendChild(buildMirrors('rest-campfire', 'Отряд у костра у Мельничьего Брода', 'severin-bust'));
      sideEl.appendChild(buildPartyBox(S.restHp));
      sideEl.appendChild(buildPedestal({
        icon: S.restStarted ? (S.restType === 'short' ? 'campfire' : 'moon') : 'campfire',
        word: S.restStarted ? (S.restType === 'short' ? 'Короткий' : 'Долгий') : 'Привал',
        eyebrow: 'Отдых отряда',
        summary: (S.restType === 'short' ? 'Короткий привал' : 'Долгий привал') + ' у костра',
        foot: 'Открыть привал на столе и ТВ',
        onFire: function () {
          S.restStarted = true;
          PARTY_IDS.forEach(function (hid) {
            var hd = UI.HEROES[hid];
            S.restHp[hid] = S.restType === 'long' ? hd.max : Math.min(hd.max, S.restHp[hid] + 8);
          });
          UI.sound('heal');
          UI.toast(stage, {
            icon: S.restType === 'short' ? 'campfire' : 'moon',
            text: (S.restType === 'short' ? 'Короткий' : 'Долгий') + ' привал объявлен на столе!',
            tone: 'good'
          });
          render();
        }
      }));
    }

    /* =====================================================================
       RENDER SCREEN 4: ФИНАЛ
       ===================================================================== */
    function renderFinale() {
      var out = OUTCOMES[S.outcome] || OUTCOMES.mixed;
      UI.bgArt(amb, out.art);
      var artEl = h('div', { class: 'gm-read__art' });
      UI.bgArt(artEl, out.art);

      var embBox = h('div', { class: 'gm-fin-emb', html: outcomeEmblemSvg(out.key) });

      var outBtns = h('div', { class: 'gm-fin-outs' });
      ['victory', 'mixed', 'defeat'].forEach(function (k, idx) {
        var od = OUTCOMES[k];
        var ob = h('button', {
          class: 'gm-fout' + (S.outcome === k ? ' is-on' : ''),
          type: 'button',
          'data-outcome-btn': k,
          'aria-label': od.short
        },
          h('span', { class: 'gm-kbd', text: String(idx + 1) }),
          UI.icon(od.icon),
          h('span', { text: od.word }));
        ctx.on(ob, 'click', function () {
          S.outcome = k;
          UI.sound('turn');
          render();
        });
        outBtns.appendChild(ob);
      });

      var hookTvBtn = h('button', { class: 'gm-btn gm-btn--gold', type: 'button', 'aria-label': 'На ТВ' },
        UI.icon('dev-tv'),
        h('span', { text: 'На ТВ' }));
      ctx.on(hookTvBtn, 'click', function () {
        S.tvSub = out.hook.slice(0, 66) + '…';
        UI.sound('pick');
        UI.toast(stage, { icon: 'dev-tv', text: 'Крючок финала выведен на ТВ', tone: 'good' });
        render();
      });

      var hookCard = h('div', { class: 'gm-hook' },
        h('div', { class: 'gm-read__copy' },
          h('span', { class: 'gm-read__eyebrow' }, UI.icon('scroll'), h('span', { text: 'Крючок · Читай вслух' })),
          h('p', { class: 'gm-read__text', text: out.hook })),
        hookTvBtn);

      var finStage = UI.frame({ gold: true, jewel: true, cls: 'gm-fin-stage' },
        artEl,
        h('div', { class: 'gm-read__shade' }),
        h('div', { class: 'gm-read__top', style: { width: '100%', padding: '0' } },
          h('div', { class: 'gm-read__beat' },
            h('span', { class: 'gm-read__tag' }, UI.icon(out.icon), h('span', { text: 'Исход главы' })),
            h('span', { class: 'gm-read__title', text: out.word }))),
        h('div', { class: 'gm-fin-center' }, embBox, outBtns),
        hookCard);

      mainEl.appendChild(finStage);

      /* Right Sidebar in Finale */
      sideEl.appendChild(buildMirrors(out.art, out.hook.slice(0, 56) + '…', 'severin-bust'));
      sideEl.appendChild(buildPartyBox(out.hp));
      sideEl.appendChild(buildPedestal({
        icon: 'rotate',
        word: 'Ещё раз',
        hold: 500,
        eyebrow: 'Завершение главы · Удержание',
        summary: out.word,
        foot: 'Зажмите печать на 0,5 с для новой главы',
        onFire: function () {
          S.beatIdx = 0;
          S.choiceIdx = 0;
          S.restStarted = false;
          S.tab = 'story';
          UI.flash(stage, 'rgba(245, 213, 138, .28)', 520);
          UI.toast(stage, { icon: 'rotate', text: 'Глава перезапущена с начала', tone: 'good' });
          render();
        }
      }));
    }

    /* =====================================================================
       MASTER RENDER & NAVIGATION
       ===================================================================== */
    function setTab(key) {
      S.tab = key;
      S.drawer = null;
      UI.sound('open');
      render();
    }

    function openDrawer(kind) {
      S.drawer = kind;
      UI.sound('open');
      render();
    }

    function toggleEnemyTurn(force) {
      S.enemyTurn = force != null ? !!force : !S.enemyTurn;
      S.turnIdx = S.enemyTurn ? 2 : 0;
      S.timerSec = 40;
      UI.sound('turn');
      render();
    }

    function render() {
      Object.keys(tabBtns).forEach(function (k) {
        tabBtns[k].classList.toggle('is-on', k === S.tab);
      });
      mainEl.innerHTML = '';
      sideEl.innerHTML = '';
      ringFgEl = null;
      ringNumEl = null;

      if (S.tab === 'story') renderStory();
      else if (S.tab === 'fight') renderFight();
      else if (S.tab === 'rest') renderRest();
      else if (S.tab === 'finale') renderFinale();

      if (S.drawer) renderDrawer();
    }

    /* ---------- Laptop Hotkeys: Space = gold action, 1–4 = choices, N = enemy turn ---------- */
    ctx.on(window, 'keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      var k = e.key;

      if (k === ' ' || e.code === 'Space') {
        var mainBtn = stage.querySelector('[data-main]');
        if (mainBtn) {
          e.preventDefault();
          e.stopPropagation();
          mainBtn.click();
        }
      } else if (k === '1' || k === '2' || k === '3' || k === '4') {
        var idx = (+k) - 1;
        e.preventDefault();
        e.stopPropagation();
        if (S.drawer === 'gift') {
          if (PARTY_IDS[idx]) { S.giftHero = PARTY_IDS[idx]; UI.sound('tap'); render(); }
        } else if (S.tab === 'story') {
          var beat = BEATS[S.beatIdx];
          if (beat && beat.choices[idx]) { S.choiceIdx = idx; UI.sound('tap'); render(); }
        } else if (S.tab === 'fight') {
          if (PARTY_IDS[idx]) { S.targetHero = PARTY_IDS[idx]; UI.sound('pick'); render(); }
        } else if (S.tab === 'rest') {
          if (idx === 0 || idx === 1) { S.restType = idx === 0 ? 'short' : 'long'; UI.sound('tap'); render(); }
        } else if (S.tab === 'finale') {
          var outs = ['victory', 'mixed', 'defeat'];
          if (outs[idx]) { S.outcome = outs[idx]; UI.sound('turn'); render(); }
        }
      } else if (k === 'n' || k === 'N' || k === 'т' || k === 'Т') {
        e.preventDefault();
        e.stopPropagation();
        if (S.tab !== 'fight') S.tab = 'fight';
        toggleEnemyTurn(true);
      } else if (k === 'Escape' && S.drawer) {
        e.preventDefault();
        e.stopPropagation();
        openDrawer(null);
      }
    }, true);

    /* Expose programmatic control for inspection & screenshot automation */
    window.GMConsole = {
      state: S,
      setTab: setTab,
      openDrawer: openDrawer,
      toggleEnemyTurn: toggleEnemyTurn,
      setTarget: function (hid) { S.targetHero = hid; render(); },
      render: render
    };

    render();
  }

  Deck.register({
    id: '16',
    key: 'gm-console',
    title: 'Пульт мастера',
    change: 'Пульт живого ведущего: чтение вслух, выбор стола, лица, тайны, дар, бой с 40-секундным кольцом, привал и финал',
    surface: 'tablet',
    before: null,
    css: true,
    get size() {
      return window.Deck && window.Deck.view === 'laptop' ? { w: 1920, h: 1080 } : { w: 1280, h: 800 };
    },
    views: [
      { key: 'tablet', label: 'Планшет', surface: 'tablet', icon: 'dev-table', before: null },
      { key: 'laptop', label: 'Ноутбук', surface: 'admin', icon: 'dev-tv', before: null }
    ],
    quiz: [
      { q: 'Что нажать?', a: 'Золотую печать («Дальше» / «Как обычно» / «Привал» / «Ещё раз»)', sel: '[data-main]' },
      { q: 'Чей ход?', a: 'Отмечен в ленте инициативы и в карточке хода', sel: '[data-turn], .gm-plan__vs' }
    ],
    mount: mount
  });
})();
