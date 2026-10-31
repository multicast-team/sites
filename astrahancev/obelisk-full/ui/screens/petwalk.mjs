// spec: pet-walk-ui
// Слой свободного выгула питомцев (этап 8.17b): проход 1 — тень и питомец, проход 2 — сердечки и «Z» сна (spec pet-walk-ui, правила 1–9).
import { drawSprite, rgbOf } from '../kit/prims.mjs';

const f32 = Math.fround;

export function makePetWalkLayer({ skin, data }) {
  const C = data.constants;
  const tableRows = (t) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, k) => [c, r[k]])));
  const shadow = tableRows(data.tables.petShadow);
  const pets = tableRows(data.tables.pets);
  const WHITE = rgbOf('#ffffff');
  const BLACK = rgbOf('#000000');
  const SHADOW_KEY = 'sprite.rock_shadow';
  const HEART_KEY = 'sprite.heart_pets';
  const Z_KEY = 'sprite.snooze';   // ?? ключ «Z» в спеке не назван — прямое прочтение: sprite.snooze

  /** view = { state, now, order, owned, tick }; возвращает число вызовов drawSprite. */
  function build(list, view) {
    const { state: s, now, order, owned, tick } = view;
    let calls = 0;
    const draw = (key, frame, x, y, sx, sy, rgb, alpha, angle) => {
      drawSprite(list, skin, key, frame, x, y, sx, sy, rgb, alpha, angle);
      calls++;
    };

    // правило 3: счётчик анимации — tick сложений animStep во float32, один на всех
    let counter = 0;
    for (let n = 0; n < tick; n++) counter = f32(counter + C['show.animStep']);
    const step = Math.floor(counter);

    const drawn = [];
    // проход 1 (правило 1)
    for (const i of order) {
      if (!owned[i]) continue;
      drawn.push(i);
      const face = s.face[i];
      const sleeping = s.act[i] === C['show.napAct'] && now - s.ast[i] < s.adur[i];
      const looking = s.act[i] === C['show.lookAct'] && now - s.ast[i] < s.adur[i];

      // правило 4: взгляд — смена стороны на каждом нечётном периоде lookTurnMs
      let fe = face;
      if (looking && Math.floor((now - s.ast[i]) / C['walk.lookTurnMs']) % 2 === 1) fe = -face;

      // правило 6: первое подходящее состояние
      const scale = C['show.scale'];
      let dy = 0, kx = 1, ky = 1, a = 0, m = scale;
      const er = now - s.roll[i];
      const eh = now - s.petted[i];
      if (er < C['walk.rollMs']) {
        const p = er / C['walk.rollMs'];
        dy = -C['show.rollHop'] * Math.sin(Math.PI * p);
        a = 360 * (3 * p * p - 2 * p * p * p);
        m = scale * (1 - C['show.rollShadow'] * Math.sin(Math.PI * p));   // правило 5
      } else if (eh < C['show.hopMs']) {
        const p = eh / C['show.hopMs'];
        dy = -C['show.hopHeight'] * Math.sin(Math.PI * p);
        const q = C['show.hopSquash'] * Math.sin(2 * Math.PI * p) * (1 - p);
        kx = 1 - q;
        ky = 1 + q;
      } else if (s.walk[i]) {
        dy = -Math.abs(Math.sin(now / C['show.bobMs'] + i)) * C['show.bobHeight'];
      }
      if (sleeping) {
        const e = now - s.ast[i];
        const L = Math.min(e / C['show.napLieMs'], 1);
        const b = Math.sin(now / C['show.napBreathMs'] + i);
        kx = 1 + L * (C['show.napWide'] - C['show.napBreathX'] * b);
        ky = 1 - L * (C['show.napFlat'] - C['show.napBreathY'] * b);
      }

      // правило 5: тень
      const sh = shadow[i];
      draw(SHADOW_KEY, 0, s.x[i] + sh.dx * fe, s.y[i] + sh.dy, m, m, WHITE, 1, 0);

      // правило 6: питомец
      const key = `sprite.pet_${pets[i].key}`;
      const frames = skin.sprite(key).frames.length;
      draw(key, step % frames, s.x[i], s.y[i] + dy, scale * fe * kx, scale * ky, WHITE, 1, a);
    }

    // проход 2 (правило 1): сердечки и «Z» по порядку прохода 1
    const off = C['show.shadowOffset'];
    for (const i of drawn) {
      // правило 8: сердечко
      const eh = now - s.petted[i];
      if (eh < C['show.heartMs']) {
        const p = eh / C['show.heartMs'];
        const sc = Math.min(1, eh / C['show.heartGrowMs']);
        const X = s.x[i] + C['show.heartSway'] * Math.sin(2 * Math.PI * p);
        const Y = s.y[i] - C['show.heartRise0'] - C['show.heartRise'] * p;
        draw(HEART_KEY, 0, X + off, Y + off, sc, sc, BLACK, C['show.heartShadowAlpha'] * (1 - p * p), 0);
        draw(HEART_KEY, 0, X, Y, sc, sc, WHITE, 1, 0);
      }

      // правило 9: «Z» сна, старшая первой (k по возрастанию — t по убыванию)
      if (s.act[i] === C['show.napAct'] && now - s.ast[i] < s.adur[i]) {
        const e = now - s.ast[i];
        for (let k = 0; ; k++) {
          const t = e - C['show.zFirstMs'] - C['show.zEveryMs'] * k;
          if (t < 0) break;
          if (t >= C['show.zLifeMs']) continue;
          const p = t / C['show.zLifeMs'];
          const X = s.x[i] + C['show.zDx'] + C['show.zDrift'] * p + C['show.zSway'] * Math.sin(2 * Math.PI * p);
          const Y = s.y[i] - C['show.zDy'] - C['show.zRise'] * p;
          const sc = C['show.zScale0'] + C['show.zGrow'] * p;
          const al = Math.min(1, C['show.zFadeIn'] * p) * (1 - p);
          draw(Z_KEY, 0, X + off, Y + off, sc, sc, BLACK, C['show.zShadowAlpha'] * al, 0);
          draw(Z_KEY, 0, X, Y, sc, sc, WHITE, al, 0);
        }
      }
    }
    return calls;
  }
  return { build };
}
