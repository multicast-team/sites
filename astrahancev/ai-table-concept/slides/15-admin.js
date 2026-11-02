/* Slide 15 «Пульт» — operator console, 1920×1080, no scroll.  Owner: rest-end-admin.
   Left «Состояние»: traffic lights with icons; a red light opens «Если зависло» by itself.
   Centre «Игра»: beat by human name, mini-map (watch only), director line, what we wait for, notes.
   Right «Управление»: sound, fights and rule checks, turn order, table, party, help, Severin's log.
   Plain Russian, no codes.  Tap a light to break it (demo); every control answers.          */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h;

  var LEVEL_WORD = { ok: 'работает', warn: 'внимание', bad: 'сбой' };
  var ROWS = [
    { key: 'link', icon: 'dot', name: 'Связь',
      text: { ok: 'на связи · 4 устройства', warn: 'связь рвётся · переподключаемся', bad: 'нет связи с сервером' },
      fix: 'Переподключить',
      steps: ['Подождите 30 секунд: экраны переподключатся сами.', 'Не помогло — обновите страницу на зависшем устройстве.', 'Сервер перезапускается сам за минуту. Игра сохранена.', 'Всё ещё красное — напишите владельцу.'] },
    { key: 'severin', icon: 'severin', name: 'Северин',
      text: { ok: 'слушает стол', warn: 'отвечает медленно · 6 с', bad: 'не на связи — играйте кнопками' },
      fix: 'Перезапустить Северина',
      steps: ['Играйте кнопками на столе: ничего не потеряется.', 'Нажмите «Перезапустить Северина» ниже.', 'Через минуту он вернётся и перескажет последний ход.'] },
    { key: 'sound', icon: 'speaker', name: 'Звук',
      text: { ok: 'играет на ТВ', warn: 'ТВ молчит — нажмите «Включить звук» на ТВ', bad: 'выключен на сервере' },
      fix: 'Включить звук',
      steps: ['Проверьте громкость самого телевизора.', 'На ТВ нажмите «Включить звук» один раз.', 'Справа в «Звуке» снимите «Без звука».'] },
    { key: 'devices', icon: 'dev-table', name: 'Устройства',
      text: { ok: '3 подключены · все слышно', warn: 'ТВ не слышно', bad: 'стол отключился' },
      fix: 'Проверить устройства',
      steps: ['Посмотрите, горит ли экран стола.', 'Обновите страницу стола: места и герои вернутся.', 'Телефоны переподключатся сами.'] },
    { key: 'build', icon: 'gear', name: 'Сборка',
      text: { ok: 'исправна · обновлена 2 ноября', warn: 'есть обновление — после игры', bad: 'сборка не запустилась' },
      fix: 'Откатить на прошлую',
      steps: ['Доиграйте сцену: игра сохранена.', 'Нажмите «Откатить на прошлую».', 'Напишите владельцу, что сломалось.'] },
    { key: 'rev', icon: 'scroll', name: 'Сохранение',
      text: { ok: 'сохранено 5 с назад', warn: 'сохранение задерживается', bad: 'не сохраняется' },
      fix: 'Сохранить сейчас',
      steps: ['Не закрывайте стол: изменения в памяти.', 'Нажмите «Сохранить сейчас».', 'Красное не уходит — напишите владельцу.'] }
  ];
  var DEVICES = [
    { icon: 'dev-table', name: 'Стол', text: 'быстро · слышно', more: 'экран 43″ · отклик 12 мс', lvl: 'ok' },
    { icon: 'dev-phone', name: 'Телефон · Лиса', text: 'чуть медленнее · слышно', more: 'отклик 120 мс', lvl: 'ok' },
    { icon: 'dev-tv', name: 'ТВ', text: 'быстро · не слышно', more: 'отклик 30 мс', lvl: 'warn' }
  ];
  var BEATS = [
    { icon: 'choice-go', name: 'Прибытие' }, { icon: 'choice-talk', name: 'Мельник' },
    { icon: 'swords', name: 'Брод' }, { icon: 'campfire', name: 'Привал' }, { icon: 'flag', name: 'Шлюз' }
  ];
  var LOG0 = [
    ['12:41', 'sev', 'Тинники выходят из камыша. Никита, ты ближе всех.'],
    ['12:41', 'table', 'Никита: «Бью самого большого молотом».'],
    ['12:42', 'rule', 'Удар Никиты 20, защита 13 — попал.'],
    ['12:42', 'sev', 'Молот вминает панцирь. Матёрый ревёт.'],
    ['12:43', 'table', 'Ждём бросок урона: восьмигранник + 3.']
  ];
  var LOG_POOL = [
    ['rule', 'Урон Никиты: 6 + 3 = 9. У Матёрого 3 хита.'],
    ['sev', 'Илистый тинник плюётся тиной в Настасью.'],
    ['rule', 'Тинник: 11, защита Настасьи 14 — мимо.'],
    ['table', 'Настасья: «Ярость! Рублю его!»'],
    ['sev', 'Секира падает. Матёрый уходит под воду.'],
    ['rule', 'Вожак пал: остальные бегут.']
  ];
  var WHO = { sev: 'Северин', table: 'Стол', rule: 'Правила' };

  function seg(items, on, onPick) {
    var box = h('div', { class: 'a15-seg' });
    var btns = items.map(function (it) {
      var b = h('button', { class: 'a15-seg__b' + (it.k === on ? ' is-on' : ''), type: 'button', 'data-k': it.k },
        it.icon ? UI.icon(it.icon) : null, it.t ? h('span', { text: it.t }) : null);
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.toggle('is-on', x === b); });
        if (onPick) onPick(it.k, b);
      });
      box.appendChild(b);
      return b;
    });
    return box;
  }
  function btn(icon, text, cls, on) {
    var b = h('button', { class: 'a15-btn' + (cls ? ' ' + cls : ''), type: 'button' }, icon ? UI.icon(icon) : null, text ? h('span', { text: text }) : null);
    if (on) b.addEventListener('click', function () { on(b); });
    return b;
  }
  function section(icon, title) {
    return h('div', { class: 'a15-sec' }, UI.icon(icon), h('span', { text: title }));
  }
  function colHead(icon, title, extra) {
    return h('div', { class: 'a15-colhead' }, h('span', { class: 'a15-colhead__ic' }, UI.icon(icon)), h('span', { class: 'a15-colhead__t', text: title }), extra || null);
  }
  function fakeQr(n) {
    var cells = [], seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var svg = UI.s('svg', { class: 'a15-qr', viewBox: '0 0 ' + n + ' ' + n, 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' });
    svg.appendChild(UI.s('rect', { x: 0, y: 0, width: n, height: n, fill: '#EFE3C8' }));
    function finder(x, y) {
      svg.appendChild(UI.s('rect', { x: x, y: y, width: 7, height: 7, fill: '#15100B' }));
      svg.appendChild(UI.s('rect', { x: x + 1, y: y + 1, width: 5, height: 5, fill: '#EFE3C8' }));
      svg.appendChild(UI.s('rect', { x: x + 2, y: y + 2, width: 3, height: 3, fill: '#15100B' }));
    }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inF && rnd() > 0.52) svg.appendChild(UI.s('rect', { x: x, y: y, width: 1, height: 1, fill: '#15100B' }));
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    return svg;
  }

  function mount(stage, ctx) {
    var root = h('div', { class: 'a15' });
    stage.appendChild(root);
    var lv = {};          // level per status row
    var rowEls = {};

    /* ================= header ================= */
    var pill = h('div', { class: 'a15-pill' }, h('i', { class: 'a15-dot' }), h('span'));
    var clock = h('span', { class: 'a15-clock', text: 'идёт 47 мин' });
    root.appendChild(h('header', { class: 'a15-head' },
      h('div', { class: 'a15-head__l' }, UI.rhomb('a15-head__r'), h('span', { class: 'a15-head__t t-title', text: 'Пульт' }),
        h('span', { class: 'a15-head__camp' }, UI.icon('scroll'), h('span', { text: 'Чёрная вода у Мельничьего Брода' })), clock),
      h('div', { class: 'a15-head__r2' }, pill)));

    var cols = h('div', { class: 'a15-cols' });
    root.appendChild(cols);

    /* ================= LEFT: Состояние ================= */
    var left = UI.frame({ cls: 'a15-col a15-col--state' });
    cols.appendChild(left);
    left.body.appendChild(colHead('dot', 'Состояние'));
    var list = h('div', { class: 'a15-lights' });
    left.body.appendChild(list);
    ROWS.forEach(function (r) {
      lv[r.key] = r.key === 'sound' ? 'warn' : 'ok';
      var icon = r.icon === 'severin' ? h('span', { class: 'a15-light__sev' }) : UI.icon(r.icon);
      if (r.icon === 'severin') UI.bgArt(icon, 'severin-bust');
      var lamp = h('button', { class: 'a15-lamp', type: 'button', 'aria-label': r.name + ': сменить (демо)' }, icon);
      var val = h('span', { class: 'a15-light__v' });
      var word = h('span', { class: 'a15-light__w' });
      var row = h('div', { class: 'a15-light', 'data-k': r.key }, lamp, h('div', { class: 'a15-light__txt' }, h('span', { class: 'a15-light__n', text: r.name }), val), word);
      var fixBtn = btn('rotate', r.fix, 'a15-btn--fix', function (b) { repair(r.key, b); });
      var stuck = h('div', { class: 'a15-stuck' },
        h('div', { class: 'a15-stuck__h' }, UI.icon('help'), h('span', { text: 'Если зависло' })),
        h('ol', { class: 'a15-stuck__ol' }, r.steps.map(function (s) { return h('li', { text: s }); })),
        fixBtn);
      if (r.key === 'rev') {   // the revision number hides behind a tap
        row.setAttribute('data-tap', '');
        row.addEventListener('click', function (e) {
          if (e.target.closest('.a15-lamp')) return;
          UI.toastFor(row, { icon: 'scroll', text: 'Версия игры № 57' });
        });
      }
      lamp.addEventListener('click', function () {
        var order = ['ok', 'warn', 'bad'];
        setLevel(r.key, order[(order.indexOf(lv[r.key]) + 1) % 3], true);
      });
      var wrap = h('div', { class: 'a15-lightwrap' }, row, stuck);
      if (r.key === 'devices') {
        var dl = h('div', { class: 'a15-devs' }, DEVICES.map(function (d) {
          // plain words first; the numbers (ms, screen) only on a tap
          var t = h('span', { text: d.text });
          var row = h('div', { class: 'a15-dev', 'data-lvl': d.lvl, 'data-tap': '', title: 'Подробнее' }, UI.icon(d.icon), h('b', { text: d.name }), t, h('i', { class: 'a15-dot' }));
          row.addEventListener('click', function () { var m = row.classList.toggle('is-more'); t.textContent = m ? d.more : d.text; });
          return row;
        }));
        wrap.insertBefore(dl, stuck);
      }
      list.appendChild(wrap);
      rowEls[r.key] = { row: row, val: val, word: word, wrap: wrap, stuck: stuck, def: r };
    });
    left.body.appendChild(h('div', { class: 'a15-grow' }));
    // the demo «break it» control is DECK chrome (header), never inside the product canvas
    var bar = document.querySelector('.dk-bar__r');
    var demoB = h('button', { class: 'dk-btn dk-btn--word a15-chrome', type: 'button', title: 'Показать сбой (демо, клавиша 0)', 'aria-label': 'Показать сбой (демо)' },
      UI.icon('flag'), h('span', { text: 'Сбой (демо)' }));
    demoB.addEventListener('click', function () { setLevel('link', lv.link === 'bad' ? 'ok' : 'bad', true); });
    if (bar) bar.insertBefore(demoB, bar.firstChild);
    ctx.on(document, 'keydown', function (e) {
      if (e.key === '0' && !e.ctrlKey && !e.metaKey && !e.altKey) setLevel('link', lv.link === 'bad' ? 'ok' : 'bad', true);
    });

    function setLevel(k, l, anim) {
      lv[k] = l;
      var e = rowEls[k];
      e.row.dataset.lvl = l;
      e.val.textContent = e.def.text[l];
      e.word.textContent = LEVEL_WORD[l];
      if (l === 'bad') {
        // red opens «Если зависло» by itself; only one open at a time
        Object.keys(rowEls).forEach(function (o) { if (o !== k) rowEls[o].wrap.classList.remove('is-open'); });
        e.wrap.classList.add('is-open');
        if (anim) { UI.sound('error'); e.row.classList.remove('is-nope'); void e.row.offsetWidth; e.row.classList.add('is-nope'); }
      } else e.wrap.classList.remove('is-open');
      if (anim && l === 'ok') UI.sound('pick');
      refreshPill();
      left.classList.toggle('has-red', Object.keys(lv).some(function (o) { return lv[o] === 'bad'; }));
      left.classList.toggle('red-devices', lv.devices === 'bad');
      if (k === 'severin') sevMini.setState(l === 'bad' ? 'idle' : 'listening');
    }
    function refreshPill() {
      var all = Object.keys(lv).map(function (k) { return lv[k]; });
      var worst = all.indexOf('bad') >= 0 ? 'bad' : all.indexOf('warn') >= 0 ? 'warn' : 'ok';
      pill.dataset.lvl = worst;
      pill.querySelector('span').textContent = worst === 'bad' ? 'Нужна помощь — слева красное' : worst === 'warn' ? 'Играть можно · есть замечание' : 'Всё работает';
    }
    function repair(k, b) {
      b.classList.add('is-busy');
      b.disabled = true;
      ctx.setTimeout(function () {
        b.classList.remove('is-busy'); b.disabled = false;
        setLevel(k, 'ok', true);
        UI.toastFor(rowEls[k].row, { icon: 'check', text: 'Работает', tone: 'good' });
      }, 1400);
    }

    /* ================= CENTRE: Игра ================= */
    var mid = UI.frame({ cls: 'a15-col a15-col--game' });
    cols.appendChild(mid);
    var sevMini = UI.severin({ size: 56, state: 'listening', cycle: false });
    mid.body.appendChild(colHead('swords', 'Игра', h('span', { class: 'a15-colhead__sev' }, sevMini)));

    // beat
    var beatsRow = h('div', { class: 'a15-beats' });
    BEATS.forEach(function (bt, i) {
      var st = i < 2 ? 'done' : i === 2 ? 'now' : 'next';
      beatsRow.appendChild(h('div', { class: 'a15-beat', 'data-st': st }, h('span', { class: 'a15-beat__d' }, UI.icon(st === 'done' ? 'check' : bt.icon)), h('span', { class: 'a15-beat__n', text: bt.name })));
      if (i < BEATS.length - 1) beatsRow.appendChild(h('i', { class: 'a15-beat__line' + (i < 2 ? ' is-done' : '') }));
    });
    mid.body.appendChild(h('div', { class: 'a15-card a15-beatcard' },
      UI.bgArt(h('div', { class: 'a15-beatart' }), 'backdrop-ford'),
      h('div', { class: 'a15-beatinfo' },
        h('div', { class: 'a15-k', text: 'Сейчас' }),
        h('div', { class: 'a15-beatname', text: 'Бой у Мельничьего брода' }),
        beatsRow)));

    // mini-map + turn
    var mapBox = h('div', { class: 'a15-map' });
    var board = null;
    try {
      board = UI.board({ cell: 36, bleed: false, drag: false, map: 'map-ford', tokens: UI.FORD.tokens(), blocked: [], difficult: UI.FORD.water });
      board.classList.add('a15-board');
      mapBox.appendChild(board);
      if (board.setActive) board.setActive('guardian');
    } catch (e) { mapBox.appendChild(h('div', { class: 'a15-k', text: 'Карта недоступна' })); }
    mapBox.appendChild(h('div', { class: 'a15-map__tag' }, UI.icon('eye'), h('span', { text: 'наблюдение' })));
    var turnMed = UI.medallion({ hero: 'guardian', hp: 22, max: 28, size: 84, state: 'active' });
    var waitBar = h('i', { class: 'a15-wait__bar' });
    var waitSec = h('b', { text: '0:20' });
    var turnSide = h('div', { class: 'a15-turn' },
      h('div', { class: 'a15-k', text: 'Раунд 1 из 2 · ходит' }),
      h('div', { class: 'a15-turn__who' }, turnMed, h('div', { class: 'a15-turn__name', text: 'Никита' })),
      h('div', { class: 'a15-goal' }, UI.icon('crown'), h('span', { text: 'Падёт Матёрый — остальные бегут' })));
    mid.body.appendChild(h('div', { class: 'a15-maprow' }, mapBox, turnSide));

    // director + waiting
    var press = h('i', { class: 'a15-press__fill' });
    mid.body.appendChild(h('div', { class: 'a15-card a15-line' },
      h('span', { class: 'a15-line__ic' }, UI.icon('target')),
      h('div', { class: 'a15-line__txt' }, h('div', { class: 'a15-k', text: 'Режиссёр' }), h('div', { class: 'a15-line__v', text: 'Ранить, не добивать' })),
      h('div', { class: 'a15-press' }, h('span', { class: 'a15-wait__track' }, press), h('span', { text: 'отряд 100% от плана' }))));
    var waitText = h('div', { class: 'a15-line__v', text: 'Никита бросает кубик урона на столе' });
    mid.body.appendChild(h('div', { class: 'a15-card a15-line a15-wait' },
      h('span', { class: 'a15-line__ic' }, UI.icon('hourglass')),
      h('div', { class: 'a15-line__txt' }, h('div', { class: 'a15-k', text: 'Ждём' }), waitText),
      h('div', { class: 'a15-wait__t' }, waitSec, h('span', { class: 'a15-wait__track' }, waitBar))));
    mid.body.appendChild(h('div', { class: 'a15-notes' },
      h('div', { class: 'a15-note', 'data-lvl': 'ok' }, UI.icon('check'), h('span', { text: 'Бой рассчитан на 3–4 героев, за столом 4 — подходит' })),
      h('div', { class: 'a15-note', 'data-lvl': 'warn' }, UI.icon('cross'), h('span', { text: 'Последний отказ: «Кощею нечем колдовать — ячейки кончились» · 2 мин назад' }))));

    /* ================= RIGHT: Управление ================= */
    var right = UI.frame({ cls: 'a15-col a15-col--ctl' });
    cols.appendChild(right);
    right.body.appendChild(colHead('gear', 'Управление'));
    var R = right.body;

    // sound
    var muted = false, stopped = false;
    var vol = h('input', { class: 'a15-range', type: 'range', min: 0, max: 100, value: 70, 'aria-label': 'Громкость' });
    var volN = h('b', { class: 'a15-volN', text: '70' });
    var stopB = btn('cross', 'Стоп', null, function (b) {
      stopped = !stopped; b.classList.toggle('is-on', stopped);
      b.querySelector('span').textContent = stopped ? 'Играть' : 'Стоп';
      setLevel('sound', stopped ? 'warn' : 'ok', false);
      rowEls.sound.val.textContent = stopped ? 'остановлен с пульта' : 'играет на ТВ';
      UI.toastFor(b, { icon: stopped ? 'speaker-off' : 'speaker', text: stopped ? 'Северин замолчал' : 'Звук идёт' });
    });
    var muteB = btn('speaker', 'Без звука', null, function (b) {
      muted = !muted; b.classList.toggle('is-on', muted);
      UI.setIcon(b.querySelector('svg'), muted ? 'speaker-off' : 'speaker');
      vol.disabled = muted; root.classList.toggle('is-muted', muted);
      UI.toastFor(b, { icon: muted ? 'speaker-off' : 'speaker', text: muted ? 'Тихо' : 'Громко' });
    });
    ctx.on(vol, 'input', function () { volN.textContent = vol.value; vol.style.setProperty('--v', vol.value + '%'); });
    vol.style.setProperty('--v', '70%');
    R.appendChild(section('volume', 'Звук'));
    R.appendChild(h('div', { class: 'a15-row' }, stopB, muteB, h('label', { class: 'a15-vol' }, UI.icon('volume'), vol, volN)));

    // fights
    var fight = 'ford', test = 'casters';
    R.appendChild(section('swords', 'Бой вручную и проверка правил'));
    R.appendChild(h('div', { class: 'a15-row' },
      seg([{ k: 'ford', t: 'Брод' }, { k: 'guards', t: 'Стража' }, { k: 'finale', t: 'Шлюз' }], fight, function (k) { fight = k; }),
      btn('swords', 'Начать', 'a15-btn--go', function (b) {
        UI.toastFor(b, { icon: 'swords', text: 'Бой разложен на столе' });
        if (board) { board.classList.remove('is-reset'); void board.offsetWidth; board.classList.add('is-reset'); }
        UI.sound('stamp');
      })));
    R.appendChild(h('div', { class: 'a15-row' },
      seg([{ k: 'casters', t: 'Заклинатели' }, { k: 'reactions', t: 'Реакции' }, { k: 'death', t: 'Смерть' }], test, function (k) { test = k; }),
      btn('check', 'Проверить', null, function (b) { UI.toastFor(b, { icon: 'check', text: 'Тестовый бой готов', tone: 'good' }); })));

    // turn order + table
    R.appendChild(h('div', { class: 'a15-two' },
      h('div', null, section('hourglass', 'Порядок ходов'),
        seg([{ k: 'phases', icon: 'phase-sun', t: 'Фазы сторон' }, { k: 'init', icon: 'd20', t: 'Инициатива' }], 'phases', function (k, b) {
          UI.toastFor(b, { icon: k === 'init' ? 'd20' : 'phase-sun', text: 'Со следующего боя' });
        }))));
    R.appendChild(section('dev-table', 'Стол: раскладка и поворот'));
    R.appendChild(h('div', { class: 'a15-row' },
      seg([{ k: '22', t: '2 и 2' }, { k: '21', t: '2 и 1' }, { k: '32', t: '3 и 2' }], '22', function (k, b) { UI.toastFor(b, { icon: 'dev-table', text: 'Раскладка ' + b.textContent }); }),
      btn('rotate', 'Повернуть', 'a15-rot', function (b) { b.classList.toggle('is-turned'); UI.toastFor(b, { icon: 'rotate', text: 'Стол повёрнут' }); })));

    // party
    var restartB = btn('rotate', 'Начать заново', 'a15-btn--hold', null);
    restartB.appendChild(h('i', { class: 'a15-hold' }));
    var hT = null;
    ctx.on(restartB, 'pointerdown', function () {
      restartB.classList.add('is-charging');
      hT = ctx.setTimeout(function () {
        hT = null; restartB.classList.remove('is-charging');
        UI.sound('stamp');
        UI.toastFor(restartB, { icon: 'rotate', text: 'История начата заново', tone: 'good' });
        flash();
      }, 500);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      ctx.on(restartB, ev, function () {
        if (hT) { ctx.clearTimeout(hT); hT = null; if (ev === 'pointerup') UI.toastFor(restartB, { icon: 'hourglass', text: 'Держите полсекунды' }); }
        restartB.classList.remove('is-charging');
      });
    });
    function flash() { UI.flash(stage, 'rgba(245,213,138,.18)', 500); }
    R.appendChild(section('party-swap', 'Отряд'));
    R.appendChild(h('div', { class: 'a15-row' },
      btn('party-swap', 'Новый отряд', null, function (b) { UI.toastFor(b, { icon: 'party-swap', text: 'Стол: выбор героев' }); }),
      restartB));

    // help
    R.appendChild(section('info', 'Справка'));
    R.appendChild(h('div', { class: 'a15-row' },
      btn('qr', 'Адреса', null, function () { openPop('qr'); }),
      btn('help', 'Памятка', null, function () { openPop('help'); }),
      btn('info', 'Правила', null, function () { openPop('srd'); })));

    // Severin log
    R.appendChild(section('scroll', 'Лог Северина'));
    var log = h('div', { class: 'a15-log' });
    R.appendChild(log);
    function logLine(t, who, text, fresh) {
      var li = h('div', { class: 'a15-log__l' + (fresh ? ' is-new' : ''), 'data-who': who },
        h('span', { class: 'a15-log__t', text: t }), h('b', { text: WHO[who] }), h('span', { class: 'a15-log__x', text: text }));
      log.appendChild(li);
      while (log.children.length > 7) log.removeChild(log.firstChild);
    }
    LOG0.forEach(function (l) { logLine(l[0], l[1], l[2]); });

    /* ================= popups (one level) ================= */
    var pop = h('div', { class: 'a15-pop' });
    root.appendChild(pop);
    function openPop(kind) {
      pop.innerHTML = '';
      var body;
      if (kind === 'qr') {
        body = UI.frame({ gold: true, cls: 'a15-pop__f' },
          h('div', { class: 'a15-pop__h' }, UI.icon('qr'), h('span', { class: 't-title', text: 'Адреса' })),
          h('div', { class: 'a15-qrbox' }, fakeQr(29),
            h('div', { class: 'a15-addr' },
              [['dev-table', 'Стол', 'адрес-стола/table'], ['dev-phone', 'Телефон', 'адрес-стола/phone'], ['dev-tv', 'ТВ', 'адрес-стола/scene'], ['gear', 'Пульт', 'адрес-стола/admin']].map(function (a) {
                return h('div', { class: 'a15-addr__l' }, UI.icon(a[0]), h('b', { text: a[1] }), h('code', { text: a[2] }));
              }),
              h('p', { class: 'a15-pop__p', text: 'Наведите камеру телефона на код — откроется вход. Пароль комнаты здесь не показываем.' }))));
      } else if (kind === 'help') {
        body = UI.frame({ gold: true, cls: 'a15-pop__f' },
          h('div', { class: 'a15-pop__h' }, UI.icon('help'), h('span', { class: 't-title', text: 'Памятка' })),
          h('div', { class: 'a15-steps' }, [['mic', 'Говори', 'Зажми микрофон у своего места и скажи, что делает герой.'],
            ['choice-go', 'Выбери', 'Тапни умение, потом цель на карте.'],
            ['seal', 'Подтверди', 'Золотая печать посередине — и это случится.'],
            ['d20', 'Брось', 'Брось настоящий кубик и тапни выпавшее число.']].map(function (s, i) {
            return h('div', { class: 'a15-step' }, h('span', { class: 'a15-step__n', text: String(i + 1) }), h('span', { class: 'a15-step__ic' }, UI.icon(s[0])), h('b', { text: s[1] }), h('span', { text: s[2] }));
          })));
      } else {
        body = UI.frame({ gold: true, cls: 'a15-pop__f' },
          h('div', { class: 'a15-pop__h' }, UI.icon('info'), h('span', { class: 't-title', text: 'Правила и лицензия' })),
          h('p', { class: 'a15-pop__p', text: 'Игра идёт по открытым правилам пятой редакции (свободная лицензия CC BY 4.0). Ниже — обязательная подпись правообладателя, дословно.' }),
          h('p', { class: 'a15-pop__p a15-pop__p--srd', text: 'This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.' }),
          h('p', { class: 'a15-pop__p', text: 'Шрифты Forum и Alegreya — SIL Open Font License 1.1.' }));
      }
      var close = h('button', { class: 'a15-pop__x', type: 'button', 'aria-label': 'Закрыть' }, UI.icon('cross'));
      close.addEventListener('click', closePop);
      body.appendChild(close);
      pop.appendChild(h('div', { class: 'a15-pop__veil' }));
      pop.appendChild(body);
      pop.querySelector('.a15-pop__veil').addEventListener('click', closePop);
      pop.classList.add('is-open');
      UI.sound('open');
    }
    function closePop() { pop.classList.remove('is-open'); }

    /* ================= live: the console breathes ================= */
    ROWS.forEach(function (r) { setLevel(r.key, lv[r.key], false); });
    var saved = 5, wait = 20, poolI = 0, mins = 43;
    ctx.setInterval(function () {
      saved = saved >= 9 ? 1 : saved + 1;
      if (lv.rev === 'ok') rowEls.rev.val.textContent = 'сохранено ' + saved + ' с назад';
      wait = wait <= 0 ? 20 : wait - 1;
      waitSec.textContent = '0:' + String(wait).padStart(2, '0');
      waitBar.style.transform = 'scaleX(' + (wait / 20).toFixed(3) + ')';
    }, 1000);
    ctx.setInterval(function () {
      var p = LOG_POOL[poolI++ % LOG_POOL.length];
      mins++;
      logLine('12:' + mins, p[0], p[1], true);
      if (p[0] === 'sev') { sevMini.setState('speaking'); ctx.setTimeout(function () { if (lv.severin !== 'bad') sevMini.setState('listening'); }, 2200); }
      if (p[0] === 'rule' && board && board.pop) { try { board.pop('big', poolI % 2 ? '9' : 'мимо', poolI % 2 ? 'dmg' : 'miss', { size: 30 }); } catch (e) { /* decoration */ } }
    }, 4200);
    press.style.transform = 'scaleX(.18)';
    return function () { demoB.remove(); };
  }

  Deck.register({
    id: '15',
    key: 'admin',
    title: 'Пульт',
    change: 'Светофоры по-русски, красное само подсказывает, что делать',
    surface: 'admin',
    before: 'before/27-fight-admin.webp',
    css: true,
    quiz: [
      { q: 'Всё ли зелёное?', a: 'Нет: звук жёлтый — ТВ молчит', sel: '.a15-pill' },
      { q: 'Где кнопки?', a: 'Справа, «Управление»', sel: '.a15-col--ctl' }
    ],
    mount: mount
  });
})();
