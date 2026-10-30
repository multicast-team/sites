// Хаб меню (этап 6.18): плитки систем на сетке data/ui/hub.json, гейты плиток, точки и пульс непосещённых меню, режим пинов,
// низ экрана (звук, версия, часы, батарея). Рисует через рисовальщик таблиц кита (ui/kit/table.mjs) и примитивы кита.
//
// Гейты — привязки к данным систем (те же таблицы, что у ядра core/npe.mjs, spec npe правила 2–3):
//   плитка из таблицы меню обелиска (data/systems/obelisk.json → menus): уровень обелиска ниже уровня меню — «заперта обелиском»
//   (значок обелиска и уровень); уровень достигнут, флаг посещения 0 — «не посещена» (точка, пульс, «???»); иначе открыта;
//   остальные плитки — по наименьшему заданию (data/systems/hub.json → tiles.minTask): задание ниже — «заперта заданием» («---»),
//   задание равно наименьшему (в пределах taskDot) — открыта с жёлтой точкой без пульса;
//   плитки без строки в обеих таблицах (Options, Cloud) открыты всегда; плитка вне экрана заперта уровнем lockLevel.
// Состояние: { task, obelisk, visited[11] } (ядро) и вид: { insetTop — безопасная зона сверху (вырез экрана устройства), px комнаты:
//   плитки и заголовки ниже на неё; pins — режим «Setup Pins»; pulse — {scale, lockScale}: масштабы пульса (если нет — pulseOf(doc, ms)); ms — время кадра, целые мс; progress — {index, a}; clock — текст часов; battery — заряд в %; music, sfx — звук включён }.
import { drawLeaf } from '../kit/table.mjs';
import { alphaByte, rgbOf } from '../kit/prims.mjs';
import { sin } from '../../core/num/gmlmath.mjs';

/**
 * Закрашенный круг по spec shape-layout п.6 и п.8: веер из n треугольников (центр, точка i, точка i+1), центр (x + 1, y + 1),
 * точка i = центр + r · (cos a_i, sin a_i), a_i = i · 2π / n; каждая операция — float32. Своя копия экрана хаба: круг кита
 * (этап 6.5) на момент этапа 6.18 не закоммичен; после него — заменить вызовом кита.
 */
function circle(list, x, y, r, rgb, alpha, n = 24) {
  const F = Math.fround;
  const col = ((rgb[0] | (rgb[1] << 8) | (rgb[2] << 16)) >>> 0) + alphaByte(alpha) * 0x1000000;
  const cx = F(F(x) + 1), cy = F(F(y) + 1), rr = F(r), twoPi = F(2 * Math.PI);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = F(F(i * twoPi) / n);
    pts.push([F(cx + F(rr * F(Math.cos(a)))), F(cy + F(rr * F(Math.sin(a))))]);
  }
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    list.push(cx, cy, 0, 0, col, -1);
    list.push(p[0], p[1], 0, 0, col, -1);
    list.push(q[0], q[1], 0, 0, col, -1);
  }
}

function rows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

const hex2 = (n) => n.toString(16).padStart(2, '0');

/** Пульс непосещённой плитки (spec unlock-fx правило 0): p = base + gain · sin(ms / msPerRadian); замок = locked.lockScale · p. */
export function pulseOf(doc, ms) {
  const u = doc.tile.unvisited.pulse;
  const scale = u.base + u.gain * sin(ms / u.msPerRadian);
  return { scale, lockScale: doc.tile.locked.lockScale * scale };
}

/**
 * @param {object} doc     data/ui/hub.json
 * @param {object} deps    { hub: data/systems/hub.json, obelisk: data/systems/obelisk.json, strings: data/strings.json → .strings, skin,
 *                   fx — необязателен: makeUnlockFx (ui/screens/unlockfx.mjs), анимация открытия меню, spec unlock-fx часть 1 }
 * Дополнительные входы: s.unlock — null или { index, left }; v.jitter — [dx, dy] сдвиг замка; v.glow — null или { index, alpha }.
 */
export function makeHubScreen(doc, { hub, obelisk, strings, skin, fx }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`hub screen: нет текста ${key}`);
    return s;
  };
  const minTask = new Map(rows(hub.tables.tiles).map((r) => [r.screen, r.minTask]));
  const menuOf = new Map(rows(obelisk.tables.menus).map((m) => [m.menu, m]));
  const G = doc.grid, P = doc.tile;

  /** Точка плитки (центр кнопки) без сдвига панели заданий. */
  function placeOf(t) {
    if (t.offscreen) return [t.offscreen.x, t.offscreen.y];
    if (t.misc !== undefined) return [G.misc.x + G.misc.dx * t.misc, G.misc.y];
    return [G.x + G.dx * t.col, G.rows[t.row]];
  }

  /** Вид плитки: open | taskLocked | obeliskLocked | unvisited; level — уровень замка обелиска. */
  function tileState(t, s) {
    if (t.lockLevel !== undefined) return { kind: 'obeliskLocked', level: t.lockLevel };
    const m = menuOf.get(t.screen);
    if (m) {
      if (s.obelisk < m.level) return { kind: 'obeliskLocked', level: m.level };
      return { kind: s.visited[m.index] === 1 ? 'open' : 'unvisited' };
    }
    if (minTask.has(t.screen)) {
      const need = minTask.get(t.screen), D = P.taskDot;
      if (s.task < need) return { kind: 'taskLocked' };
      // точка задания: плитка, которую открыло текущее задание (?? снято на заданиях 3, 7, 9, 14, 15, 17; при 1 и 20 точек нет)
      return { kind: 'open', taskDot: s.task === need && s.task >= D.fromTask && s.task <= D.toTask };
    }
    return { kind: 'open' };
  }

  /** Цвет пульса: к жёлтому на долю tintBase + tintGain·фаза, фаза = (масштаб − 1)/amplitude (?? правило снято на 4 фазах). */
  function pulseTint(p) {
    const u = P.unvisited.pulse;
    const k = u.tintBase + u.tintGain * ((p - 1) / u.amplitude);
    return '#ffff' + hex2(fx ? fx.pulseBlue(p) : Math.round(255 * (1 - k)));
  }

  /** Листья экрана (компоненты таблицы и круги) в порядке рисования. */
  function leaves(s, v) {
    const out = [];
    const dy = v.insetTop ?? 0;
    const B = doc.background;
    out.push({ component: 'sprite', sprite: B.sprite, x: B.x, y: B.y, sx: B.sx, sy: B.sy, color: B.color, alpha: B.alpha });
    if (v.pins) out.push({ component: 'sprite', sprite: B.sprite, x: B.x, y: B.y, sx: B.sx, sy: B.sy, color: B.pinsColor, alpha: B.alpha });
    const H = doc.headers;
    for (const h of H.rows) {
      out.push({ component: 'sprite', sprite: H.sprite, x: H.x, y: h.y + dy, sx: H.sx, sy: H.sy });
      out.push({ component: 'text', font: H.font, x: H.textX, y: h.y + dy, text: h.text, valign: 'middle' });
    }
    const L = P.locked;
    const text = (x, y, t) => ({ component: 'text', font: P.font, x, y, ...t, halign: 'center', valign: 'middle' });
    for (const t of doc.tiles) {
      const st = tileState(t, s);
      if (v.pins && (st.kind !== 'open' || t.pinnable === false)) continue;
      const [x, y0] = placeOf(t);
      const y = y0 + dy;
      if (st.kind === 'open') {
        if (st.taskDot) out.push({ component: 'circle', x: x + P.unvisited.dot.dx, y: y + P.unvisited.dot.dy, r: P.unvisited.dot.r, color: P.unvisited.dot.color });
        out.push({ component: 'sprite', sprite: P.button, x, y });
        out.push({ component: 'sprite', sprite: t.icon, x, y: y + P.iconDy, sx: P.iconScale, sy: P.iconScale });
        out.push(text(x, y + P.labelDy, { text: t.label }));
        if (fx && v.glow && menuOf.get(t.screen)?.index === v.glow.index && fx.glowVisible(v.glow)) out.push(...fx.glowLeaves(x, y, v.glow));
      } else if (st.kind === 'taskLocked') {
        const k = P.taskLocked;
        out.push({ component: 'sprite', sprite: L.backing, x, y: y + k.dy, sx: L.backingSx, sy: L.backingSy, color: L.color });
        out.push(text(x, y + k.dy, { text: k.text }));
        out.push({ component: 'sprite', sprite: P.button, x, y, color: L.color });
        out.push({ component: 'sprite', sprite: L.lock, frame: L.lockFrame, x, y: y + L.lockDy, sx: L.lockScale, sy: L.lockScale, color: L.color });
      } else if (st.kind === 'obeliskLocked') {
        const k = P.obeliskLocked;
        out.push({ component: 'sprite', sprite: L.backing, x, y: y + k.dy, sx: L.backingSx, sy: L.backingSy, color: L.color });
        out.push({ component: 'sprite', sprite: k.icon, x: x + k.iconDx, y: y + k.dy });
        out.push({ component: 'sprite', sprite: P.button, x, y, color: L.color });
        out.push({ component: 'sprite', sprite: L.lock, frame: L.lockFrame, x, y: y + L.lockDy, sx: L.lockScale, sy: L.lockScale, color: L.color });
        out.push(text(x, y + k.dy, { value: k.prefix + String(st.level) }));
      } else {
        const k = P.unvisited, pulse = v.pulse ?? pulseOf(doc, v.ms), p = pulse.scale;
        const u = fx && s.unlock && menuOf.get(t.screen)?.index === s.unlock.index ? s.unlock : null;
        const [jx, jy] = u ? v.jitter ?? [0, 0] : [0, 0];
        const a = u ? (v.progress?.index === u.index ? v.progress.a : 1) : null;
        const ls = u ? fx.lockScale(pulse.lockScale, a) : pulse.lockScale;
        out.push({ component: 'circle', x: x + k.dot.dx, y: y + k.dot.dy, r: k.dot.r, color: k.dot.color });
        out.push({ component: 'sprite', sprite: P.button, x, y, sx: p, sy: p, color: u ? fx.buttonColor(p, a) : pulseTint(p) });
        out.push({ component: 'sprite', sprite: L.lock, frame: L.lockFrame, x: x + jx, y: y + L.lockDy + jy, sx: ls, sy: ls });
        out.push(text(x, y + P.labelDy, { text: k.text }));
      }
    }
    const PN = doc.pins;
    if (s.task >= PN.minTask) {
      out.push({ component: 'sprite', sprite: PN.sprite, frame: v.pins ? 1 : 0, x: PN.x, y: PN.y, sx: PN.sx, sy: PN.sy });
      if (v.pins) out.push(text(PN.hint.x, PN.hint.y, { text: PN.hint.text }));
      out.push(text(PN.x, PN.y + PN.textDy, { text: PN.text }));
    }
    const S = doc.sound;
    S.buttons.forEach((b, i) => {
      const on = i === 0 ? v.music !== false : v.sfx !== false;
      out.push({ component: 'sprite', sprite: S.sprite, x: b.x, y: S.y, sx: S.sx, sy: S.sy });
      out.push({ component: 'sprite', sprite: b.icon, frame: on ? 1 : 0, x: b.x, y: S.y, sx: S.iconScale, sy: S.iconScale });
    });
    const F = doc.footer;
    out.push({ component: 'text', font: F.font, x: F.x, y: F.versionY, value: F.version, valign: 'middle', color: F.color });
    out.push({ component: 'text', font: F.font, x: F.x, y: F.clockY, value: v.clock, valign: 'middle', color: F.color });
    const Bt = doc.battery;
    for (const part of [Bt.backing, Bt.frame]) out.push({ component: 'sprite', sprite: part.sprite, x: part.x, y: part.y, sx: part.sx, sy: part.sy });
    const I = Bt.icon, BR = Bt.bars;
    out.push({ component: 'sprite', sprite: I.sprite, x: I.x, y: I.y, sx: I.scale, sy: I.scale });
    const bars = Math.ceil(v.battery / BR.perBar);   // ?? снято только при 100 %
    for (let i = 0; i < bars; i++) {
      const y = I.y + BR.stepY * i;
      out.push({ component: 'sprite', sprite: I.sprite, frame: BR.frameLow, x: I.x, y, sx: I.scale, sy: I.scale });
      out.push({ component: 'sprite', sprite: I.sprite, frame: BR.frameLow, x: I.x, y: y + BR.pairDy, sx: I.scale, sy: I.scale });
      out.push({ component: 'sprite', sprite: I.sprite, frame: BR.frameHigh, x: I.x, y: y + BR.pairDy, sx: I.scale, sy: I.scale });
    }
    const LB = Bt.label;
    out.push({ component: 'sprite', sprite: LB.sprite, x: LB.x, y: LB.y, sx: LB.sx, sy: LB.sy });
    out.push({ component: 'text', font: LB.font, x: LB.x, y: LB.y + LB.textDy, value: `${v.battery}%`, halign: 'center', valign: 'middle' });
    for (const l of out) if (l.component === 'text' && l.text !== undefined) l.value = T(l.text);
    return out;
  }

  /** Вершины экрана в list. Возвращает число листьев, которые кит не нарисовал. */
  function build(list, s, v) {
    let skipped = 0;
    for (const l of leaves(s, v)) {
      if (l.component === 'blend') continue;
      if (l.component === 'circle') circle(list, l.x, l.y, l.r, rgbOf(l.color), l.alpha ?? 1);
      else if (!drawLeaf(list, skin, l)) skipped++;
    }
    return skipped;
  }

  return { leaves, build, tileState, placeOf };
}
