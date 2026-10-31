// spec: veinmorpher
// Действие бомбы Veinmorpher на камни экрана: руды → жилы, жилы → золотые жилы, спрайт жилы (spec veinmorpher, правила 0–2).

export function makeVeinmorpher(data) {
  const c = data.constants;
  const scale = c['roll.scale'];
  const die = c['roll.die'];
  const eps = c['compare.eps'];
  const sprites = { plain: c['sprite.plain'], gold: c['sprite.gold'], rainbow: c['sprite.rainbow'] };

  // правило 0: «x > y» с допуском
  const greater = (x, y) => x - y > eps;

  // правило 1: шанс «a из b», ровно 2 слова ГСЧ
  function chance(a, b, rng) {
    const m = rng.u63() % BigInt(Math.trunc(b));
    return !greater(Number(m) + 1, a);
  }

  // правило 2
  function apply(rocks, s, rng) {
    const a = scale * s.p;
    const makeVein = chance(a, die, rng);
    const makeGoldVein = chance(a, die, rng);
    const n = s.count ?? rocks.length;
    for (let i = 0; i < n; i++) {
      const q = rocks[i];
      if (!greater(q.hp, 0)) continue;
      if (makeVein && greater(s.research, q.zone)) q.vein = true;
      if (q.vein && makeGoldVein) q.veinGold = true;
      q.veinSprite = q.veinRainbow ? sprites.rainbow : q.veinGold ? sprites.gold : sprites.plain;
    }
    return { makeVein, makeGoldVein };
  }

  return { chance, apply };
}
