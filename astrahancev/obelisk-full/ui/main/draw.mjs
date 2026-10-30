// Страница игры (этап 6.33): список вершин кита (ui/kit VertexList) → вызовы игрового растра ui/render/raster.mjs.
//
// Кадр интерфейса — слой 500×960 (spec input-layout, правило 1): вершины кита в px слоя, растр окна W×H (500×960 или
// 1000×1920) получает ту же проекцию «слой → окно». Подряд идущие вершины с одним атласом — один вызов: без атласа эффект
// fill, с атласом — sprite с цветом вершин. Смешивание — α источника и (1 − α) приёмника для цвета и альфы, сложение;
// проекция — слой в ndc с y вниз (те же числа, что у кадров L1/L2 каталога, oracle/workshop43). Текстура атласа i — номер i + 1.
const f32 = Math.fround;
const BLEND = { src: ['srcAlpha', 'srcAlpha'], dst: ['oneMinusSrcAlpha', 'oneMinusSrcAlpha'], eq: ['add', 'add'] };

/** Проекция слоя w×h: x → 2x/w − 1, y → 1 − 2y/h (столбцы, как у GL). */
export function layerMatrix(w = 500, h = 960) {
  return [f32(2 / w), 0, 0, 0, 0, f32(-2 / h), 0, 0, 0, 0, f32(1 / 32000), 0, -1, 1, 0.5, 1];
}

/**
 * Нарисовать список вершин на растре R (FrameRaster/LayerCache: draw, defineTexture, hasTexture).
 * atlasPixels(i) → { w, h, rgba } — пиксели атласа (атлас грузится в растр один раз).
 */
export function drawList(R, list, atlasPixels, { W, H, layer = [500, 960] } = {}) {
  const n = list.count;
  if (!n) return 0;
  const pos = new Float32Array(n * 2), uv = new Float32Array(n * 2), col = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    pos[2 * i] = list.x[i]; pos[2 * i + 1] = list.y[i];
    uv[2 * i] = list.u[i]; uv[2 * i + 1] = list.v[i];
    const c = list.rgba[i];
    if (Array.isArray(c)) { col[4 * i] = c[0]; col[4 * i + 1] = c[1]; col[4 * i + 2] = c[2]; col[4 * i + 3] = c[3]; }
    else { col[4 * i] = c & 255; col[4 * i + 1] = (c >>> 8) & 255; col[4 * i + 2] = (c >>> 16) & 255; col[4 * i + 3] = Math.floor(c / 0x1000000) & 255; }
  }
  const matrix = layerMatrix(layer[0], layer[1]);
  let calls = 0;
  for (let a = 0; a < n;) {
    const atlas = list.atlas[a];
    let b = a;
    while (b < n && list.atlas[b] === atlas) b++;
    const count = (b - a) - ((b - a) % 3);
    if (count > 0) {
      const textured = atlas >= 0;
      if (textured && !R.hasTexture(atlas + 1)) {
        const p = atlasPixels(atlas);
        R.defineTexture(atlas + 1, p.w, p.h, p.rgba);
      }
      R.draw({
        target: 0, mode: 'triangles', first: a, count,
        effect: { key: textured ? 'sprite' : 'fill', mixColour: true, alphaTest: false }, params: {}, matrix,
        pos, posSize: 2, colour: col, uv: textured ? uv : null, uvSize: 2, texture: textured ? atlas + 1 : 0,
        blend: BLEND, colorMask: [1, 1, 1, 1], scissor: null, viewport: [0, 0, W, H],
      });
      calls++;
    }
    a = b;
  }
  return calls;
}
