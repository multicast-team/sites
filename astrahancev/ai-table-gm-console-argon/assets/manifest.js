/* =====================================================================
   Art manifest.  Owner: foundation.
   window.art(key)      → URL string (or null when CSS should paint it).
   window.art.fit(key)  → { pos, zoom } framing hint for store fallbacks
                          (e.g. Severin's face inside the 16:9 concept).
   window.ART_GEN       → Set of keys whose NEW file exists in assets/gen/
                          as <key>.webp. Leave empty until the art arrives;
                          adding a key switches every slide to the new art.
   NEVER reference assets/gen/... directly in slides — always art('key').
   ===================================================================== */
(function () {
  'use strict';

  // Fill when the generated art lands, e.g. new Set(['hero-guardian', 'map-ford']).
  window.ART_GEN = window.ART_GEN || new Set([
    'ab-arcanist-frost', 'ab-arcanist-missile', 'ab-arcanist-shield', 'ab-beacon-bless', 'ab-beacon-flame', 'ab-beacon-heal', 'ab-fury-attack', 'ab-fury-rage', 'ab-fury-reckless', 'ab-guardian-attack', 'ab-guardian-second-wind', 'ab-guardian-surge', 'ab-shadow-dash', 'ab-shadow-sneak', 'ab-voice-inspire', 'ab-voice-mockery', 'bust-arcanist', 'bust-beacon', 'bust-fury', 'bust-guardian', 'bust-shadow', 'bust-voice', 'cover-ford', 'defeat-water', 'hall-heroes', 'hero-arcanist', 'hero-beacon', 'hero-fury', 'hero-guardian', 'hero-shadow', 'hero-voice', 'map-ford', 'master-silhouette-blue', 'master-silhouette-green', 'rest-campfire', 'severin-bust', 'severin-card', 'table-surface', 'texture-leather', 'texture-parchment', 'token-thug', 'token-tinnik-big', 'token-tinnik', 'victory-dawn'
  ]);

  var S = 'assets/store/';

  // ability emblem → closest existing store icon
  var AB = {
    'ab-guardian-attack': 'icon-attack',
    'ab-guardian-second-wind': 'icon-second-wind',
    'ab-guardian-surge': 'icon-action-surge',
    'ab-fury-attack': 'icon-frenzy',
    'ab-fury-rage': 'icon-rage',
    'ab-fury-reckless': 'icon-reckless-attack',
    'ab-beacon-flame': 'icon-sacred-flame',
    'ab-beacon-heal': 'icon-cure-wounds',
    'ab-beacon-bless': 'icon-bless',
    'ab-arcanist-frost': 'icon-ray-of-frost',
    'ab-arcanist-missile': 'icon-magic-missile',
    'ab-arcanist-shield': 'icon-shield',
    'ab-shadow-dash': 'icon-cunning-dash',
    'ab-shadow-sneak': 'icon-sneak-attack',
    'ab-voice-mockery': 'icon-vicious-mockery',
    'ab-voice-inspire': 'icon-bardic-inspiration'
  };

  var FIXED = {
    'map-ford': S + 'map-mf-ford-tutorial.webp',
    'map-sluice-guards': S + 'map-mf-sluice-guards.webp',
    'map-sluice-finale': S + 'map-mf-sluice-finale.webp',
    'cover-ford': S + 'backdrop-ford.webp',
    'hall-heroes': S + 'backdrop-arrival.webp',
    'rest-campfire': S + 'backdrop-mill-rest.webp',
    'victory-dawn': S + 'backdrop-aftermath.webp',
    'defeat-water': S + 'backdrop-night.webp',
    'severin-card': S + 'choose-master-severin.jpg',
    'severin-bust': S + 'choose-master-severin.jpg',
    'master-silhouette-blue': S + 'choose-master-severin.jpg',
    'master-silhouette-green': S + 'choose-master-severin.jpg',
    'heroes-six': S + 'generated_1792048145393.png',
    'heroes-grid': S + 'choose-hero-six.jpg',
    'table-surface': null,
    'texture-leather': null,
    'texture-parchment': null
  };

  // framing hints for fallbacks that are crops of a larger picture
  var FIT = {
    'severin-bust': { pos: '47.7% 18%', zoom: 7.5 },      // face in the 1280x720 concept
    'severin-card': { pos: '50% 72%', zoom: 2.9 },        // centre card of the concept (3:4 box)
    'master-silhouette-blue': { pos: '7% 60%', zoom: 3.94 },
    'master-silhouette-green': { pos: '93% 60%', zoom: 3.94 }
  };

  function art(key) {
    if (!key) return null;
    if (window.ART_GEN.has(key)) return 'assets/gen/' + key + '.webp';
    if (Object.prototype.hasOwnProperty.call(FIXED, key)) return FIXED[key];
    if (AB[key]) return S + AB[key] + '.webp';
    var m;
    if ((m = /^hero-(\w+)$/.exec(key))) return S + 'hero-' + m[1] + '.webp';
    if ((m = /^bust-(\w+)$/.exec(key))) return S + 'portrait-' + m[1] + '.webp';
    if ((m = /^portrait-(\w+)$/.exec(key))) return S + 'portrait-' + m[1] + '.webp';
    if (/^token-[\w-]+$/.test(key)) return S + key + '.webp';
    if (/^backdrop-[\w-]+$/.test(key)) return S + key + '.webp';
    if (/^icon-[\w-]+$/.test(key)) return S + key + '.webp';   // raw store ability icon
    if (/^map-[\w-]+$/.test(key)) return S + 'map-mf-' + key.slice(4) + '.webp';
    return null;
  }
  art.fit = function (key) {
    if (window.ART_GEN.has(key)) return { pos: '50% 50%', zoom: 1 };
    return FIT[key] || { pos: '50% 50%', zoom: 1 };
  };
  /** CSS background declaration for a key, honouring fit hints. */
  art.bg = function (key) {
    var u = art(key); if (!u) return '';
    var f = art.fit(key);
    return 'background-image:url("' + u + '");background-position:' + f.pos +
      ';background-size:' + (f.zoom === 1 ? 'cover' : (f.zoom * 100) + '% auto') + ';background-repeat:no-repeat;';
  };
  art.isNew = function (key) { return window.ART_GEN.has(key); };
  window.art = art;
})();

/* Material textures as CSS variables (components.css paints strips, cards and the
   table centre with them). 'none' until the generated file exists. */
(function () {
  'use strict';
  var r = document.documentElement;
  [['--art-leather', 'texture-leather'], ['--art-parch', 'texture-parchment'], ['--art-surface', 'table-surface']].forEach(function (p) {
    var u = window.art(p[1]);
    r.style.setProperty(p[0], u ? 'url("' + u + '")' : 'none');
  });
})();
