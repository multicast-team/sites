/* =====================================================================
   Slide 01 · Вход.  Owner: screens «entry».
   Full-bleed cover, one framed 520 px card: padlock medallion, a 64 px
   password «lock» (gold rhomb sockets fill as you type), eye toggle,
   gold seal «Войти».  Empty → shake + toast.  Any password → unlock.
   ===================================================================== */
(function () {
  'use strict';
  var UI = window.UI, h = UI.h, s = UI.s;

  function embers(n, cls) {
    var box = h('div', { class: cls || 'ent-embers', 'aria-hidden': 'true' });
    for (var i = 0; i < n; i++) {
      var sz = 3 + Math.random() * 5;
      box.appendChild(h('i', { style: {
        left: (Math.random() * 100).toFixed(1) + '%', width: sz.toFixed(1) + 'px', height: sz.toFixed(1) + 'px',
        '--dx': ((Math.random() - 0.5) * 220).toFixed(0) + 'px',
        animationDuration: (7 + Math.random() * 9).toFixed(1) + 's',
        animationDelay: (-Math.random() * 16).toFixed(1) + 's', opacity: (0.4 + Math.random() * 0.6).toFixed(2) } }));
    }
    return box;
  }

  /* padlock drawn here so the shackle can swing open */
  function padlock() {
    return s('svg', { class: 'lg-lock__svg', viewBox: '0 0 100 100', 'aria-hidden': 'true' },
      s('path', { class: 'lg-lock__shackle', d: 'M30 50 V32 a20 20 0 0 1 40 0 V50', fill: 'none' }),
      s('rect', { class: 'lg-lock__body', x: 18, y: 46, width: 64, height: 46, rx: 9 }),
      s('rect', { class: 'lg-lock__shine', x: 24, y: 51, width: 52, height: 6, rx: 3 }),
      s('circle', { class: 'lg-lock__hole', cx: 50, cy: 66, r: 6 }),
      s('path', { class: 'lg-lock__hole', d: 'M46.5 68 h7 l2 13 h-11z' }));
  }

  Deck.register({
    id: '01',
    key: 'login',
    title: 'Вход',
    change: 'Обложка вместо пустоты, замок и одна печать «Войти»',
    surface: 'login',
    before: 'before/00c-login.png',
    css: true,
    quiz: [
      { q: 'Что сделать?', a: 'Ввести пароль и нажать печать «Войти»', sel: '[data-main]' },
      { q: 'Куда вводить?', a: 'В замок посередине', sel: '.lg-field' }
    ],
    mount: function (stage, ctx) {
      var root = h('div', { class: 'lg' });
      var bg = UI.bgArt(h('div', { class: 'lg-bg' }), 'cover-ford');
      root.appendChild(h('div', { class: 'lg-bgwrap' }, bg));
      root.appendChild(h('div', { class: 'lg-mist' }, h('i'), h('i')));
      root.appendChild(h('div', { class: 'lg-shade' }));
      root.appendChild(embers(26));

      /* logo */
      var logo = h('div', { class: 'lg-logo' },
        UI.rhomb('lg-logo__r'),
        h('div', { class: 't-title lg-logo__t', text: 'Чёрная вода' }),
        UI.rule({ width: 420 }));
      root.appendChild(logo);

      /* lock medallion */
      var lockSvg = padlock();
      var lock = h('div', { class: 'lg-lock' }, h('span', { class: 'lg-lock__glow' }), h('span', { class: 'lg-lock__rim' }), lockSvg);

      /* password field: real input under rhomb sockets */
      var input = h('input', { class: 'lg-input', type: 'password', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Пароль', maxlength: '12' });
      var sockets = h('div', { class: 'lg-sockets' });
      var caret = h('i', { class: 'lg-caret' });
      var eyeBtn = h('button', { class: 'lg-eye', type: 'button', 'aria-label': 'Показать пароль' }, UI.icon('eye'), h('i', { class: 'lg-eye__slash' }));
      var keyIc = h('span', { class: 'lg-key' }, UI.icon('padlock'));
      var field = h('div', { class: 'lg-field is-main', 'data-main': '', 'data-tap': '' }, keyIc, sockets, input, eyeBtn);
      var show = false;

      function renderSockets(popIdx) {
        var v = input.value, n = Math.max(6, v.length + (v.length < 12 ? 1 : 0));
        sockets.innerHTML = '';
        for (var i = 0; i < n; i++) {
          var filled = i < v.length;
          var sk = h('span', { class: 'lg-sk' + (filled ? ' is-on' : '') + (i === popIdx ? ' is-pop' : '') + (i === v.length ? ' is-next' : '') });
          if (filled && show) sk.appendChild(h('b', { text: v[i] }));
          else sk.appendChild(UI.rhomb('lg-sk__r'));
          sockets.appendChild(sk);
        }
        var nx = sockets.children[Math.min(v.length, n - 1)];
        if (nx && v.length < 12) nx.appendChild(caret);
        var has = v.length > 0;
        field.classList.toggle('is-main', !has);
        field.toggleAttribute('data-main', !has);
        seal.classList.toggle('is-main', has);
        seal.toggleAttribute('data-main', has);
        seal.classList.toggle('is-idle', !has);
      }

      var card = UI.frame({ cls: 'lg-card', parch: true }, field);
      var seal = UI.seal({ icon: 'arrow-right', word: 'Войти', size: 112, main: false, onPress: submit });
      seal.classList.add('lg-seal');
      var sealBox = h('div', { class: 'lg-sealbox' }, seal);
      var cardWrap = h('div', { class: 'lg-cardwrap' }, lock, card, sealBox);
      root.appendChild(cardWrap);

      /* corner: connection dot (statusbar → dot) */
      root.appendChild(h('div', { class: 'lg-net', title: 'На связи' }, h('i')));

      /* after unlock */
      var next = h('button', { class: 'lg-next', type: 'button', 'aria-label': 'Дальше' }, UI.icon('arrow-right'));
      root.appendChild(next);
      ctx.on(next, 'click', function () { Deck.go('02'); });

      stage.appendChild(root);
      renderSockets(-1);

      ctx.on(field, 'pointerdown', function (e) {
        if (e.target.closest('.lg-eye')) return;
        ctx.setTimeout(function () { input.focus({ preventScroll: true }); }, 0);
      });
      ctx.on(input, 'focus', function () { field.classList.add('is-focus'); });
      ctx.on(input, 'blur', function () { field.classList.remove('is-focus'); });
      var prevLen = 0;
      ctx.on(input, 'input', function () {
        var len = input.value.length;
        renderSockets(len > prevLen ? len - 1 : -1);
        if (len > prevLen) {
          var sk = sockets.children[len - 1];
          if (sk) { var p = UI.center(sk, stage); UI.spark(stage, p.x, p.y, 'var(--gold-hi)', 5); }
          UI.sound('tap');
        }
        prevLen = len;
      });
      ctx.on(input, 'keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      ctx.on(eyeBtn, 'click', function () {
        show = !show;
        eyeBtn.classList.toggle('is-on', show);
        eyeBtn.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
        renderSockets(-1);
      });

      var done = false;
      function submit() {
        if (done) return;
        if (!input.value.length) {
          UI.sound('error');
          field.classList.remove('is-nope'); void field.offsetWidth; field.classList.add('is-nope');
          lock.classList.remove('is-nope'); void lock.offsetWidth; lock.classList.add('is-nope');
          UI.toast(stage, { icon: 'padlock', text: 'Пароль', tone: 'bad', x: 960, y: 820 });
          ctx.setTimeout(function () { input.focus({ preventScroll: true }); }, 50);
          return;
        }
        done = true;
        input.blur();
        seal.stamp({ hide: false }).then(function () {
          seal.classList.remove('is-main'); seal.removeAttribute('data-main');
          root.classList.add('is-open');
          UI.sound('pick');
          var c = UI.center(lock, stage);
          UI.spark(stage, c.x, c.y, 'var(--gold-hi)', 22);
          UI.flash(stage, 'rgba(255,226,160,.35)', 520);
          ctx.setTimeout(function () { UI.toast(stage, { icon: 'check', text: 'Открыто', tone: 'good', x: 960, y: 900 }); }, 420);
          ctx.setTimeout(function () { next.classList.add('is-on', 'is-main'); next.setAttribute('data-main', ''); }, 1100);
        });
      }
    }
  });
})();
