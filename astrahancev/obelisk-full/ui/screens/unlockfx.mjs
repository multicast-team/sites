// spec: unlock-fx
// Анимация открытия запертого обелиском меню на плитке хаба (этап 6.8, часть 1): цвет кнопки и масштаб замка по прогрессу a
// (свой таймер по delta кадра), свечение после открытия. Числа — data/ui/unlockfx.json, data/ui/hub.json (tile.unvisited.pulse);
// файлы читает вызывающий.
const hex2 = (n) => n.toString(16).padStart(2, '0');

/**
 * @param {object} doc  data/ui/unlockfx.json
 * @param {object} deps { hub: data/systems/hub.json, hubDoc: data/ui/hub.json }
 */
export function makeUnlockFx(doc, { hub, hubDoc }) {
  const pulse = hubDoc.tile.unvisited.pulse;
  const G = doc.glow;
  const none = (a) => a === null || a === undefined;

  const progressStart = () => ({ a: 1 });
  const progressStep = (pr, deltaUs) => ({ a: pr.a - deltaUs / doc.progress.durationUs });

  /** Синий канал цвета пульса: B0 = round(255 · (1 − q)), q = tintBase + tintGain · (p − 1) / amplitude. */
  function pulseBlue(pulseScale) {
    const q = pulse.tintBase + pulse.tintGain * ((pulseScale - 1) / pulse.amplitude);
    return Math.round(255 * (1 - q));
  }

  /** Цвет кнопки: без прогресса — цвет пульса, иначе BB = round(B0 + (255 − B0) · (1 − a)). */
  function buttonColor(pulseScale, a) {
    const b0 = pulseBlue(pulseScale);
    return '#ffff' + hex2(none(a) ? b0 : Math.round(b0 + (255 - b0) * (1 - a)));
  }

  /** Масштаб замка: pulseLockScale · (1 + lockGrow · (1 − a)). */
  function lockScale(pulseLockScale, a) {
    return none(a) ? pulseLockScale : pulseLockScale * (1 + doc.lockGrow * (1 - a));
  }

  const glowStart = () => ({ alpha: 1 });
  const glowStep = (g, deltaUs) => ({ alpha: g.alpha - (deltaUs / G.usPerSecond) * G.fadePerSecond });
  const glowVisible = (g) => g.alpha > 1e-5;
  const glowScale = (g) => G.scaleStart + G.scaleGain * (1 - g.alpha);

  function glowLeaves(x, y, g) {
    const s = glowScale(g);
    return [
      { component: 'blend', mode: G.blend },
      { component: 'sprite', sprite: G.sprite, x, y, sx: s, sy: s, color: G.color, alpha: g.alpha },
      { component: 'blend', mode: 0 },
    ];
  }

  return { progressStart, progressStep, pulseBlue, buttonColor, lockScale, glowStart, glowStep, glowVisible, glowScale, glowLeaves };
}
