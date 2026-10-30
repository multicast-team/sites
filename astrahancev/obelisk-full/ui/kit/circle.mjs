// spec: shape-layout
// Закрашенный круг по shape-layout версии 6 (п. 6, п. 8): круг строится через описанный прямоугольник
// (края X1 = f(x − r + 1), X2 = f(x + r + 1), центр f((X1 + X2) / 2), полуразмер f((X2 − X1) / 2)),
// точка N — своим углом a_N = f(f(N · 2π) / N), а не точка 0. Аргументы x, y, r — double как есть.
// Интерфейс и упаковка цвета — как у fillCircle в prims.mjs.

const f = Math.fround;

const alphaByte = (a) => Math.floor(f(Math.min(a, 1)) * 255);
const packRgba = (rgb, a) => ((rgb[0] | (rgb[1] << 8) | (rgb[2] << 16)) >>> 0) + (a * 0x1000000);

/**
 * Закрашенный круг: веер из n треугольников (центр, точка i, точка i+1), 3n вершин; центр и полуразмеры — из описанного
 * прямоугольника, точка i = (cx + hx · cos a_i, cy + hy · sin a_i), a_i = f(f(i · 2π) / n), i = 0…n (точка n — свой угол);
 * цвет центра и края — rgb.
 */
export function fillCircle(list, x, y, r, rgb, alpha, n = 24) {
  const col = packRgba(rgb, alphaByte(alpha));
  const X1 = f(x - r + 1), X2 = f(x + r + 1), Y1 = f(y - r + 1), Y2 = f(y + r + 1);
  const cx = f((X1 + X2) / 2), cy = f((Y1 + Y2) / 2);
  const hx = f((X2 - X1) / 2), hy = f((Y2 - Y1) / 2);
  const twoPi = f(2 * Math.PI);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = f(f(i * twoPi) / n);
    pts.push([f(cx + f(hx * f(Math.cos(a)))), f(cy + f(hy * f(Math.sin(a))))]);
  }
  for (let i = 0; i < n; i++) {
    list.push(cx, cy, 0, 0, col, -1);
    list.push(pts[i][0], pts[i][1], 0, 0, col, -1);
    list.push(pts[i + 1][0], pts[i + 1][1], 0, 0, col, -1);
  }
}
