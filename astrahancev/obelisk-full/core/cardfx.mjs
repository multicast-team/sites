// spec: card-fanfare
// Анимация золочения карты 2.2.50 (spec oracle/specs/card-fanfare.md v2, этап 8.13b). Числа — data/systems/cardfx.json.

import { exp, lengthdir_x, lengthdir_y, sin } from './num/gmlmath.mjs';

export function makeCardFanfare(doc, strings) {
  const c = doc.constants;
  const st = doc.tables['card.stars'];
  const stars = st.rows.map((r) => Object.fromEntries(st.columns.map((n, i) => [n, r[i]])));
  const shadows = doc.tables['card.gildedShadow'].rows;
  const cx = c['card.cx'];
  const cy = c['card.cy'];
  const pt = (theta, d) => [cx + lengthdir_x(d, theta), cy + lengthdir_y(d, theta)];
  const back = (p) => {
    const q = p - 1;
    return 1 + (c['card.backC1'] + 1) * q * q * q + c['card.backC1'] * q * q;
  };
  const blend = (mode) => ({ component: 'blend', mode });
  const sprite = (key, frame, x, y, s, color, alpha, angle = 0) =>
    ({ component: 'sprite', sprite: key, frame, x, y, sx: s, sy: s, angle, color, alpha });
  const text = (font, x, y, str, alpha, extra) =>
    ({ component: 'text', font, x, y, text: str, halign: 1, valign: 1, xscale: 1, yscale: 1, alpha, snap: true, ...extra });

  function leaves({ e, M, card, name, before, after }) {
    const out = [];
    const p = Math.min(e / c['card.growMs'], 1);
    const G = 1 - (1 - p) * (1 - p) * (1 - p);

    out.push({ component: 'rect', x1: 0, y1: 0, x2: c['card.dimW'], y2: c['card.dimH'], color: c['card.black'], alpha: c['card.bgAlpha'] * G });

    // лучи и свечение
    out.push(blend('add'));
    const R = c['card.rayR'] * G;
    const vertices = [];
    for (let j = 0; j < c['card.rays']; j++) {
      const th = M / c['card.rayMsPerDeg'] + c['card.rayStep'] * j;
      const [x1, y1] = pt(th - c['card.rayHalf'], R);
      const [x2, y2] = pt(th + c['card.rayHalf'], R);
      vertices.push([cx, cy, c['card.yellow'], c['card.rayAlpha'] * G]);
      vertices.push([x1, y1, c['card.orange'], 0]);
      vertices.push([x2, y2, c['card.orange'], 0]);
    }
    out.push({ component: 'tris', vertices });
    const s = sin(M / c['card.glowMsPerRad']);
    const g1 = G * (c['card.glow1Base'] + c['card.glow1Amp'] * s);
    const g2 = G * (c['card.glow2Base'] + c['card.glow2Amp'] * s);
    out.push(sprite(c['card.glowSprite'], 0, cx, cy, g1, c['card.glow1Color'], c['card.glow1A'] + c['card.glow1AAmp'] * s));
    out.push(sprite(c['card.glowSprite'], 0, cx, cy, g2, c['card.glow2Color'], c['card.glow2A'] + c['card.glow2AAmp'] * s));
    out.push(blend('normal'));

    // карта
    if (e > 0) {
      const cs = c['card.cardScale'] * back(Math.min(e / c['card.cardMs'], 1));
      out.push(sprite(card.backing, card.backingFrame, cx, cy, cs, c['card.white'], 1));
      out.push(sprite(card.icon, card.iconFrame, cx, cy, cs, c['card.white'], 1));
    }

    // звёзды
    const f = e / c['card.starMsPerFrame'];
    if (f < c['card.starEnd']) {
      const d = c['card.starDist'];
      const fall = c['card.starFall'] * Math.max(f - c['card.starFallFrom'], 0) * Math.max(f - c['card.starFallFrom'], 0);
      const alpha = f <= c['card.starFadeFrom'] ? 1 : 1 - (f - c['card.starFadeFrom']) / c['card.starFadeLen'];
      for (const star of stars) {
        const [x, y0] = pt(star.dir, d * star.reach * (1 - exp(-f / c['card.starTau'])));
        out.push(sprite(c['card.starSprite'], 0, x, y0 + fall, star.scale, star.color, alpha, star.spin * f));
      }
    }

    // искры
    for (let j = 0; j < c['card.sparkles']; j++) {
      const fr = (Math.floor(M / c['card.sparkFrameMs']) + c['card.sparkFrameStep'] * j) % c['card.sparkFrames'];
      const dist = G * (c['card.sparkR'] + c['card.sparkAmp'] * sin(M / c['card.sparkMsPerRad'] + j));
      const [x, y] = pt(M / c['card.sparkMsPerDeg'] + c['card.sparkStep'] * j, dist);
      out.push(sprite(c['card.sparkSprite'], fr, x, y, c['card.sparkScale'], j % 2 === 0 ? c['card.sparkEvenColor'] : c['card.sparkOddColor'], G));
    }

    // «Gilded!»
    if (e > c['card.gildedAt']) {
      const q = back(Math.min((e - c['card.gildedAt']) / c['card.gildedMs'], 1));
      const str = strings[c['card.gildedKey']];
      const gx = c['card.gildedX'];
      const gy = c['card.gildedY'];
      const base = { xscale: q, yscale: q, snap: false };
      for (const [dx, dy] of shadows) out.push(text(c['card.gildedFont'], gx + dx, gy + dy, str, 1, { ...base, color: c['card.black'] }));
      const top = c['card.gildedTop'];
      const bottom = c['card.gildedBottom'];
      out.push(text(c['card.gildedFont'], gx, gy, str, 1, { ...base, colors: [top, top, bottom, bottom], alphaRound: true }));
    }

    // имя
    if (e > c['card.nameAt']) {
      const a = Math.min((e - c['card.nameAt']) / c['card.nameMs'], 1);
      const nx = c['card.nameX'];
      const ny = c['card.nameY'];
      out.push(text(c['card.nameFont'], nx + c['card.shadowDx'], ny + c['card.shadowDy'], name, a, { color: c['card.shadowColor'] }));
      out.push(text(c['card.nameFont'], nx, ny, name, a, { color: c['card.nameColor'] }));
    }

    // до и после
    if (e > c['card.noteAt']) {
      const b = Math.min((e - c['card.noteAt']) / c['card.noteMs'], 1);
      const nx = c['card.noteX'];
      const note = (x, y, str, color) =>
        text(c['card.noteFont'], x, y, str, b, { snap: false, colors: [color, color, color, color], alphaRound: true });
      const bs = strings[c['card.beforeKey']] + before;
      const as = strings[c['card.afterKey']] + after;
      const dx = c['card.shadowDx'];
      const dy = c['card.shadowDy'];
      out.push(note(nx + dx, c['card.beforeY'] + dy, bs, c['card.shadowColor']));
      out.push(note(nx, c['card.beforeY'], bs, c['card.beforeColor']));
      out.push(note(nx + dx, c['card.afterY'] + dy, as, c['card.shadowColor']));
      out.push(note(nx, c['card.afterY'], as, c['card.afterColor']));
    }

    // «Tap anywhere to continue»
    if (e >= c['card.tapAt']) {
      out.push(text(c['card.tapFont'], c['card.tapX'], c['card.tapY'], strings[c['card.tapKey']],
        c['card.tapA'] + c['card.tapAmp'] * sin(M / c['card.tapMsPerRad']), { color: c['card.tapColor'] }));
    }
    return out;
  }

  const closable = (e) => e >= c['card.closeAt'];
  return { leaves, closable };
}
