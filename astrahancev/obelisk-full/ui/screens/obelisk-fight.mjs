// Меню обелиска, вкладка Fight, и сцена боя (этап 6.15): вёрстка data/ui/obelisk-fight.json + привязки к ядру обелиска
// (core/obelisk.mjs: статы уровня, «есть неполученная награда») и к состоянию игрока.
//
// Экран не рисует записи O: он подставляет в листья с id привязки (уровень, урон кирки, статы, перезарядка, вкладки) и рисует
// листья рисовальщиком таблиц кита (ui/kit/table.mjs); круг метки вкладки — примитивом кита fillCircle.
//
// Состояние вкладки: { level, pickaxe (урон кирки), stats (ядро: maxHp, armor, hp, timeSec), cooldown (с до открытия), unclaimed,
//   rewards: [{icon, text}] — строки блока Rewards (из таблицы наград ядра, этап 6.16; здесь — вход) }.
// Состояние сцены: { level, pickaxe, stats, fight: { left, total (с: осталось и всего), hp (здоровье в бою), hpShown (доля полосы
//   здоровья на экране — плавная, вход), maxHp, timeShown (доля полосы времени на экране, вход), dealt (урон за бой), seconds (целых секунд боя) }, bob (сдвиг обелиска по y, px; закон — ??, вход) }.
import { drawLeaf } from '../kit/table.mjs';
import { fillCircle, rgbOf } from '../kit/prims.mjs';
import { makeShortFormat } from '../format/number.mjs';

/**
 * @param {object} doc   data/ui/obelisk-fight.json
 * @param {object} deps  { kitDoc: data/ui/kit.json (палитра разрешена), strings: data/strings.json → .strings, skin }
 */
export function makeObeliskFightScreen(doc, { kitDoc, strings, skin }) {
  const T = (key) => {
    const s = strings[key];
    if (typeof s !== 'string') throw new Error(`obelisk-fight: нет текста ${key}`);
    return s;
  };
  const num = makeShortFormat(doc.format.short);
  const ROUND = { ceil: Math.ceil, floor: Math.floor, round: (x) => Math.floor(x + 0.5) };
  const at = (tpl, over = {}, dx = 0, dy = 0) => {
    const o = { ...tpl, ...over };
    delete o.id; delete o.cooldownGray;
    if (o.component === 'rect') { o.x1 += dx; o.x2 += dx; o.y1 += dy; o.y2 += dy; } else { o.x += dx; o.y += dy; }
    if (o.text !== undefined && o.value === undefined) { o.value = T(o.text); }
    delete o.text;
    for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
    return o;
  };
  /** Минуты:секунды; секунды округляются по doc.clockRound (58.8 → «0:59»). */
  const clock = (s) => { const t = Math.max(0, ROUND[doc.clockRound](s)); return `${Math.floor(t / 60)}${T('t.sym.3a')}${String(t % 60).padStart(2, '0')}`; };
  /** Текст урона в секунду: 0/0 — doc.nanText («-nan» у O x86_64; ?? Android), x/0 — doc.infText. */
  const dpsText = (x) => (Number.isNaN(x) ? doc.nanText : x === Infinity ? doc.infText : num(x));
  const weak = (st) => st.pickaxe <= st.stats.armor;   // ?? равенство: при pickaxe = armor урон 0 (spec obelisk п.10) — предупреждение

  /**
   * Строки блока Rewards: уровень «L > L+1», кап уровня XP «a > a + шаг» (st.levelCap — вход), постоянная строка и награда уровня L+1
   * (текст — ключ из ядра: st.nextReward).
   */
  function rewardRows(st) {
    const W = doc.tab.rewardRow;
    return W.rows.map((r) => {
      if (r.kind === 'level') return { icon: r.icon, text: T(r.text) + st.level + W.sep + (st.level + 1) };
      if (r.kind === 'cap') return { icon: r.icon, text: T(r.text) + st.levelCap + W.sep + (st.levelCap + W.capStep) };
      if (r.kind === 'reward') return { icon: r.icon, text: T(st.nextReward) };
      return { icon: r.icon, text: T(r.text) };
    });
  }

  function tabLeaves(st) {
    const D = doc.tab, out = [];
    const p = kitDoc.styles[doc.kitStyles.panel];
    out.push({ component: 'rect', x1: p.fill.x1, y1: p.fill.y1, x2: p.fill.x2, y2: p.fill.y2, color: p.fill.color, alpha: p.fill.alpha });
    const tx = p.texture;
    for (let k = 0; k < tx.count; k++)
      out.push({ component: 'sprite', sprite: tx.sprite, x: tx.x + k * tx.step.x, y: tx.y + k * tx.step.y, sx: tx.scale, sy: tx.scale, color: tx.color, alpha: tx.alpha });
    out.push(at(D.frame));
    const over = {
      level: { value: T(D.head.find((l) => l.id === 'level').text) + st.level },
      pickaxe: { value: num(st.pickaxe), color: weak(st) ? D.pickaxeWeakColor : D.pickaxeColor },
      obeliskShadow: { frame: st.level }, obelisk: { frame: st.level },
    };
    for (const l of D.head) out.push(at(l, over[l.id]));
    const R = D.statsRow;
    const vals = [String(st.level + 1), `${num(st.stats.hp)}${T('t.per')}${num(st.stats.maxHp)}`, num(st.stats.armor), clock(st.stats.timeSec)];
    R.icons.forEach((icon, i) => {
      const y = R.y + i * R.step;
      out.push(at(R.icon, { sprite: icon, frame: R.iconFrameIsLevel[i] ? st.level : undefined }, 0, y));
      out.push(at(R.backing, {}, 0, y));
      out.push(at(R.text, { value: T(R.labels[i]) + vals[i] }, 0, y));
    });
    for (const l of D.rewardsBox) out.push(at(l));
    const W = D.rewardRow;
    st.rewards.forEach((r, i) => {
      const y = W.y + i * W.step;
      out.push(at(W.backing, {}, 0, y));
      out.push(at(W.icon, { sprite: r.icon }, 0, y));
      out.push(at(W.text, { value: r.text }, 0, y));
    });
    const cd = st.cooldown > 0;   // перезарядка: серые листья с cooldownGray (кнопка и надпись; запись f615-cd)
    for (const l of D.attack) out.push(at(l, { ...(l.id === 'cooldown' ? { value: clock(st.cooldown) } : {}), ...(cd && l.cooldownGray ? { color: D.attackCooldownColor } : {}) }));
    if (weak(st)) for (const l of D.warning) out.push(at(l));
    const B = D.tabs;
    for (const r of B.rects) out.push(at(r));
    B.icons.forEach((icon, i) => {
      const x = B.x + i * B.step, sel = i === 0 ? { color: B.selectedColor } : {};
      out.push(at(B.button, sel, x));
      out.push(at(B.icon, { sprite: icon, ...sel }, x));
      out.push(at(B.caption, {}, x));
      out.push(at(B.label, { value: T(B.labels[i]) }, x));
    });
    if (st.unclaimed) out.push({ ...D.dot });
    return out;
  }

  function sceneLeaves(st) {
    const D = doc.scene, out = [];
    const w = weak(st), f = st.fight;
    const fr = st.level % D.frameCycle;   // сцена передаёт кадр уровня по кругу кадров обелиска (40 → 10, ??: закон по 2, 10, 40)
    out.push(at(D.shadow, { frame: fr }));
    out.push(at(D.obelisk, { frame: fr, y: D.obelisk.y + st.bob }));
    for (const l of D.top) out.push(at(l));
    const A = D.armor;
    out.push(at(A.backing));
    out.push(at(A.icon, { frame: st.level, color: w ? A.weakIconColor : undefined }));
    out.push(at(A.bar)); out.push(at(A.shine));
    out.push(at(A.shadow, { value: num(st.stats.armor) }));
    out.push(at(A.text, { value: num(st.stats.armor), color: w ? A.weakTextColor : undefined }));
    if (w) for (const l of D.warning) out.push(at(l));
    const M = D.time, frac = f.timeShown;   // доля полосы времени на экране — вход (закон сглаживания ??)
    out.push(at(M.backing)); out.push(at(M.icon)); out.push(at(M.track));
    const tx2 = M.bar.x1 + (M.bar.x2 - M.bar.x1) * frac;
    out.push(at(M.bar, { x2: tx2 })); out.push(at(M.shine, { x2: tx2 }));
    out.push(at(M.shadow, { value: clock(f.left) })); out.push(at(M.text, { value: clock(f.left) }));
    const H = D.health, hp = f.hp, hfrac = f.hpShown;
    out.push(at(H.backing)); out.push(at(H.track));
    const hx2 = H.bar.x1 + (H.bar.x2 - H.bar.x1) * hfrac;
    out.push(at(H.bar, { x2: hx2 })); out.push(at(H.shine, { x2: hx2 }));
    const K = H.ticks;
    for (let i = 1; i <= K.count; i++) {
      const x = K.x + K.step * i;
      out.push({ component: 'line', x1: x, y1: K.y1, x2: x, y2: K.y2, color: K.color, alpha: K.alpha });
    }
    out.push(at(H.icon, { frame: st.level }));
    out.push(at(H.shadow, { value: num(hp) })); out.push(at(H.text, { value: num(hp) }));
    const P = H.pct, pct = `${Math.ceil(hp / f.maxHp * 100)}${T('t.pct')}`;   // процент — от здоровья, вверх (59 при 58,3; 12 при 11,0)
    for (const [dx, dy] of P.outline) out.push({ component: 'text', font: P.font, x: P.x + dx, y: P.y + dy, value: pct, halign: 'center', valign: 'middle', color: P.color });
    out.push({ component: 'text', font: P.font, x: P.x, y: P.y, value: pct, halign: 'center', valign: 'middle', color: P.textColor });
    const Q = D.panelText, vals = [num(f.dealt), dpsText(f.dealt / f.seconds)];
    D.panels.forEach((p, i) => {
      out.push(at(p.backing)); out.push(at(p.desc)); out.push(at(p.icon));
      out.push(at(Q.labelShadow, { value: T(p.label) }, p.x, p.backing.y));
      out.push(at(Q.label, { value: T(p.label) }, p.x, p.backing.y));
      out.push(at(Q.valueShadow, { value: vals[i] }, p.x, p.backing.y));
      out.push(at(Q.value, { value: vals[i] }, p.x, p.backing.y));
    });
    return out;
  }

  /** Листья в list (VertexList кита); круг — fillCircle кита. Возвращает число листьев, которые кит не нарисовал (линии без ширины). */
  function draw(list, leaves) {
    let skipped = 0;
    for (const l of leaves) {
      if (l.component === 'circle') { fillCircle(list, l.x, l.y, l.r, rgbOf(l.color), l.alpha ?? 1); continue; }
      // кадр спрайта за числом кадров — по модулю (кадр = уровень обелиска: 15 кадров обелиска, 1 кадр тени; ?? правило рантайма
      // спрайтов, проверено вершинами O на уровнях 2, 10, 40, 75 — долг кита: спека sprite-layout)
      const n = l.sprite !== undefined && l.frame !== undefined ? skin.sprite(l.sprite).frames.length : 0;
      if (!drawLeaf(list, skin, n && l.frame >= n ? { ...l, frame: l.frame % n } : l)) skipped++;
    }
    return skipped;
  }

  return { tabLeaves, sceneLeaves, rewardRows, draw, clock, weak };
}
