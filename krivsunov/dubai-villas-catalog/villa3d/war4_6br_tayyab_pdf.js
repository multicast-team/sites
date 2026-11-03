// Вилла Al Warqa 4 · современная 6BR (брошюра «BrandNew Modern 6BR Villa W Pool ~ War4», объявление dubizzle AW4550K11127).
// Модель собрана по 35 фото брошюры, 30 фото объявления и цифрам: дом ~703 м² (7 570 sqft), участок ~1 116 м² (12 017 sqft),
// угловой участок, 2 этажа, первый этаж поднят на ~0,9 м, этажи ~4,2 и ~3,9 м. Поэтажного плана нет — размеры приблизительные.
// Оси: X — вдоль главной улицы (на восток), Z — к главной улице (на юг), Y — вверх, метры.

export const info = {
  title: 'Al Warqa 4 · современная 6BR',
  note: 'Модель по фото брошюры и объявления: форма дома, бассейн, двор и ограда. Поэтажного плана нет, поэтому размеры приблизительные (±1–2 м), внутренние помещения не показаны.'
};

export function build(THREE) {
  const root = new THREE.Group();
  root.name = 'war4_villa';

  // ---------- материалы ----------
  function canvasTexture(size, draw, metersPerTile) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d'), size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.repeat.set(1 / metersPerTile, 1 / metersPerTile);
    return texture;
  }
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  function speckle(ctx, size, amount, spread) {
    for (let i = 0; i < amount; i++) {
      const v = (rnd() - 0.5) * spread;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  }
  const tileTex = canvasTexture(512, (ctx, s) => { // светлая плитка 0,6×1,2 м, на текстуре 2,4×2,4 м
    for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
      const shade = 222 + Math.floor(rnd() * 12);
      ctx.fillStyle = `rgb(${shade},${shade - 8},${shade - 22})`;
      const off = (r % 2) * (s / 4);
      ctx.fillRect((c * s / 2 + off) % s, r * s / 4, s / 2, s / 4);
      ctx.fillRect((c * s / 2 + off) % s - s, r * s / 4, s / 2, s / 4);
    }
    speckle(ctx, s, 9000, 0.06);
    ctx.strokeStyle = 'rgba(120,105,85,0.55)';
    ctx.lineWidth = 2;
    for (let r = 0; r <= 4; r++) { ctx.beginPath(); ctx.moveTo(0, r * s / 4); ctx.lineTo(s, r * s / 4); ctx.stroke(); }
    for (let r = 0; r < 4; r++) for (let c = 0; c <= 2; c++) {
      const x = (c * s / 2 + (r % 2) * (s / 4)) % s;
      ctx.beginPath(); ctx.moveTo(x, r * s / 4); ctx.lineTo(x, (r + 1) * s / 4); ctx.stroke();
    }
  }, 2.4);
  const paverTex = canvasTexture(512, (ctx, s) => { // тёмная брусчатка 0,2×0,1 м «ёлочкой», на текстуре 1,6 м
    const u = s / 16;
    ctx.fillStyle = '#4a4e52';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const g = 84 + Math.floor(rnd() * 22);
      ctx.fillStyle = `rgb(${g},${g + 3},${g + 6})`;
      if ((x + y) % 2 === 0) ctx.fillRect(x * u + 1, y * u + 1, u * 2 - 2, u - 2);
      else ctx.fillRect(x * u + 1, y * u + 1, u - 2, u * 2 - 2);
    }
    speckle(ctx, s, 6000, 0.08);
  }, 1.6);
  const grassTex = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#4f9a37';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const g = 120 + Math.floor(rnd() * 70);
      ctx.fillStyle = `rgba(${40 + Math.floor(rnd() * 30)},${g},${30 + Math.floor(rnd() * 25)},0.55)`;
      ctx.fillRect(rnd() * s, rnd() * s, 1, 2 + rnd() * 3);
    }
  }, 1.5);
  const sandTex = canvasTexture(256, (ctx, s) => { ctx.fillStyle = '#d29a62'; ctx.fillRect(0, 0, s, s); speckle(ctx, s, 14000, 0.16); }, 2.5);
  const asphaltTex = canvasTexture(256, (ctx, s) => { ctx.fillStyle = '#3c3f43'; ctx.fillRect(0, 0, s, s); speckle(ctx, s, 16000, 0.12); }, 3);
  const slatTex = canvasTexture(256, (ctx, s) => { // вертикальные ламели ограды
    ctx.fillStyle = '#17191b';
    ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 16) { ctx.fillStyle = '#2b2e31'; ctx.fillRect(x, 0, 3, s); ctx.fillStyle = '#0c0d0e'; ctx.fillRect(x + 12, 0, 3, s); }
  }, 0.8);

  const M = {
    white: new THREE.MeshStandardMaterial({ color: 0xebe5da, roughness: 0.82 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xf4f0e7, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x24333d, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.35, roughness: 0.45 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xe2d6c1, roughness: 0.85 }),
    coping: new THREE.MeshStandardMaterial({ color: 0xd9c9ad, roughness: 0.8 }),
    tiles: new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.75 }),
    pavers: new THREE.MeshStandardMaterial({ map: paverTex, roughness: 0.9 }),
    grass: new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
    sand: new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xd3cdc3, roughness: 0.9 }),
    slats: new THREE.MeshStandardMaterial({ map: slatTex, roughness: 0.6, metalness: 0.2 }),
    water: new THREE.MeshStandardMaterial({ color: 0x35c6b0, metalness: 0.05, roughness: 0.05, envMapIntensity: 1.1, emissive: 0x0d4a40, emissiveIntensity: 0.45 }),
    poolWall: new THREE.MeshStandardMaterial({ color: 0x8fd8c7, roughness: 0.5 }),
    door: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, metalness: 0.4, roughness: 0.35 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 0.95 }),
    frond: new THREE.MeshStandardMaterial({ color: 0x467f30, roughness: 0.8, side: THREE.DoubleSide }),
    frondDry: new THREE.MeshStandardMaterial({ color: 0x7d8a3c, roughness: 0.85, side: THREE.DoubleSide }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }),
    shrub: new THREE.MeshStandardMaterial({ color: 0x9a9a5a, roughness: 1 }),
    play: new THREE.MeshStandardMaterial({ color: 0xcf4a2a, roughness: 0.6 }),
    slide: new THREE.MeshStandardMaterial({ color: 0x2c6fd6, roughness: 0.4 }),
    neighbor: new THREE.MeshStandardMaterial({ color: 0xe6dac6, roughness: 0.9 }),
    neighborDark: new THREE.MeshStandardMaterial({ color: 0x5d6770, roughness: 0.5, metalness: 0.4 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x8e9499, metalness: 0.6, roughness: 0.4 })
  };

  // ---------- помощники ----------
  const add = (obj, parent = root) => { parent.add(obj); return obj; };
  function boxMM(x0, x1, y0, y1, z0, z1, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, parent);
  }
  function rectZ(x0, x1, y0, y1, z, mat, facing, parent) { // вертикальный прямоугольник, нормаль ±Z
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    if (facing < 0) m.rotation.y = Math.PI;
    return add(m, parent);
  }
  function rectX(z0, z1, y0, y1, x, mat, facing, parent) { // нормаль ±X
    const m = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), mat);
    m.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    m.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
    return add(m, parent);
  }
  function gridZ(x0, x1, y0, y1, z, cols, rows, facing, parent, bar = 0.07) { // стекло с чёрными переплётами
    rectZ(x0, x1, y0, y1, z + facing * 0.005, M.glass, facing, parent);
    const zc = z + facing * 0.05;
    for (let i = 0; i <= cols; i++) { const x = x0 + (i * (x1 - x0)) / cols; boxMM(x - bar / 2, x + bar / 2, y0, y1, zc - 0.05, zc + 0.05, M.black, parent); }
    for (let j = 0; j <= rows; j++) { const y = y0 + (j * (y1 - y0)) / rows; boxMM(x0, x1, y - bar / 2, y + bar / 2, zc - 0.05, zc + 0.05, M.black, parent); }
  }
  function gridX(z0, z1, y0, y1, x, cols, rows, facing, parent, bar = 0.07) {
    rectX(z0, z1, y0, y1, x + facing * 0.005, M.glass, facing, parent);
    const xc = x + facing * 0.05;
    for (let i = 0; i <= cols; i++) { const z = z0 + (i * (z1 - z0)) / cols; boxMM(xc - 0.05, xc + 0.05, y0, y1, z - bar / 2, z + bar / 2, M.black, parent); }
    for (let j = 0; j <= rows; j++) { const y = y0 + (j * (y1 - y0)) / rows; boxMM(xc - 0.05, xc + 0.05, y - bar / 2, y + bar / 2, z0, z1, M.black, parent); }
  }
  const toShape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const toPath = (pts) => new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  function prismXY(pts, z0, z1, mat, holes = [], parent) { // многоугольник в плоскости XY, вытянут по Z
    const shape = toShape(pts);
    holes.forEach((h) => shape.holes.push(toPath(h)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, z0);
    return add(new THREE.Mesh(geo, mat), parent);
  }
  function ground(ptsXZ, y, mat, holesXZ = [], parent) { // горизонтальная поверхность по точкам плана (x, z)
    const shape = toShape(ptsXZ.map(([x, z]) => [x, -z]));
    holesXZ.forEach((h) => shape.holes.push(toPath(h.map(([x, z]) => [x, -z]))));
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.userData.noCast = true;
    return add(m, parent);
  }
  const rectXZ = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  function ribbon(ptsXZ, y0, y1, mat, parent) { // вертикальная лента вдоль замкнутого контура
    const pos = [];
    for (let i = 0; i < ptsXZ.length; i++) {
      const [ax, az] = ptsXZ[i];
      const [bx, bz] = ptsXZ[(i + 1) % ptsXZ.length];
      pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat.clone());
    m.material.side = THREE.DoubleSide;
    return add(m, parent);
  }
  function offsetConvex(pts, d) { // сдвиг выпуклого многоугольника (против часовой) внутрь на d
    const n = pts.length;
    const lines = pts.map((a, i) => {
      const b = pts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;
      return [[a[0] + nx * d, a[1] + ny * d], [b[0] + nx * d, b[1] + ny * d]];
    });
    return lines.map((l1, i) => {
      const l0 = lines[(i - 1 + n) % n];
      return intersect(l0[0], l0[1], l1[0], l1[1]);
    });
  }
  function intersect(p1, p2, p3, p4) {
    const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
    const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d;
    return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
  }
  function clipX(pts, xs, keepGreater) { // отсечение многоугольника вертикальной прямой x = xs
    const inside = (p) => (keepGreater ? p[0] >= xs : p[0] <= xs);
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (inside(a)) out.push(a);
      if (inside(a) !== inside(b)) {
        const t = (xs - a[0]) / (b[0] - a[0]);
        out.push([xs, a[1] + t * (b[1] - a[1])]);
      }
    }
    return out;
  }
  function latticeHoles(quad, cols, rows, inset) { // треугольные проёмы декоративной решётки внутри четырёхугольника
    const [q0, q1, q2, q3] = quad;
    const P = (u, v) => [
      (1 - u) * (1 - v) * q0[0] + u * (1 - v) * q1[0] + u * v * q2[0] + (1 - u) * v * q3[0],
      (1 - u) * (1 - v) * q0[1] + u * (1 - v) * q1[1] + u * v * q2[1] + (1 - u) * v * q3[1]
    ];
    const jitter = [0.12, -0.1, 0.07, -0.13, 0.1, -0.06, 0.09, -0.11];
    const grid = [];
    for (let j = 0; j <= rows; j++) {
      grid.push([]);
      for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        const k = (i * 3 + j * 5) % jitter.length;
        grid[j].push(P(i / cols + (edge ? 0 : jitter[k] / cols), j / rows + (edge ? 0 : jitter[(k + 3) % jitter.length] / rows)));
      }
    }
    const holes = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
      const tris = (i + j) % 2 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const t of tris) {
        const la = Math.hypot(t[1][0] - t[2][0], t[1][1] - t[2][1]);
        const lb = Math.hypot(t[0][0] - t[2][0], t[0][1] - t[2][1]);
        const lc = Math.hypot(t[0][0] - t[1][0], t[0][1] - t[1][1]);
        const per = la + lb + lc;
        const ix = (la * t[0][0] + lb * t[1][0] + lc * t[2][0]) / per;
        const iy = (la * t[0][1] + lb * t[1][1] + lc * t[2][1]) / per;
        const s = per / 2;
        const area = Math.sqrt(Math.max(0, s * (s - la) * (s - lb) * (s - lc)));
        const r = area / s;
        if (r - inset < 0.08) continue;
        const k = (r - inset) / r;
        holes.push(t.map((p) => [ix + (p[0] - ix) * k, iy + (p[1] - iy) * k]));
      }
    }
    return holes;
  }

  // ---------- размеры ----------
  const PODIUM = 0.9;      // первый этаж выше земли (5 ступеней у входа)
  const WING_FRONT = 6.6;  // лицевая плоскость рамы крыла (к улице)
  const WING_BACK = -7.6;  // задняя плоскость рамы крыла (к бассейну)
  const CORE = { x: 4.0, front: 4.6, back: -6.0, top: 9.7 };

  // ---------- подиум, крыльцо ----------
  boxMM(-12.6, 12.6, 0, PODIUM, -7.7, 6.7, M.stone);
  for (let i = 0; i < 5; i++) boxMM(-2.3, 2.3, 0, PODIUM - i * 0.18, 6.7, 6.7 + (i + 1) * 0.35, M.stone);

  // ---------- центральный объём: холл со вторым светом и лестницей ----------
  const core = new THREE.Group();
  add(core);
  boxMM(-CORE.x, CORE.x, PODIUM, CORE.top, CORE.back, CORE.front, M.white, core);
  boxMM(-CORE.x - 0.1, CORE.x + 0.1, CORE.top - 0.45, CORE.top + 0.05, CORE.back - 0.1, CORE.front + 0.1, M.frame, core);
  gridZ(-3.6, 3.6, 5.2, CORE.top - 0.55, CORE.front, 5, 2, 1, core);          // тёмное стекло над входом
  gridZ(-1.7, 1.7, 4.05, 4.95, CORE.front, 3, 1, 1, core);                     // фрамуга
  boxMM(-0.85, 0.85, PODIUM, 4.0, CORE.front, CORE.front + 0.08, M.door, core);   // поворотная входная дверь
  boxMM(-0.04, 0.04, 2.2, 2.9, CORE.front + 0.08, CORE.front + 0.14, M.frame, core); // ручка-штанга
  gridZ(-1.7, -0.9, PODIUM, 4.0, CORE.front, 1, 2, 1, core);
  gridZ(0.9, 1.7, PODIUM, 4.0, CORE.front, 1, 2, 1, core);
  gridZ(-3.6, 3.6, PODIUM + 0.05, CORE.top - 0.55, CORE.back, 5, 3, -1, core);  // витраж холла к бассейну

  // ---------- крылья (правое строится, левое — зеркально) ----------
  const wing = new THREE.Group();
  const glassTwoSided = M.glass.clone();
  glassTwoSided.side = THREE.DoubleSide;
  // разрез рамы: дно 4,85 м, крыша поднимается к краю, торец наклонён наружу («бабочка»)
  const outer = [[CORE.x, 4.85], [13.0, 4.85], [15.0, 10.2], [CORE.x, 8.95]];
  const inner = offsetConvex(outer, 0.45);
  prismXY(outer, WING_BACK, WING_FRONT, M.frame, [inner], wing);
  const LATTICE_X = 11.0;
  const latticeZone = clipX(inner, LATTICE_X, true);
  const wallZone = clipX(inner, LATTICE_X, false);
  for (const side of [1, -1]) {
    const face = side > 0 ? WING_FRONT : WING_BACK;
    const back = face - side * 1.0;             // утопленная стена второго этажа
    const win = side > 0 ? [5.3, 10.5, 5.75, 8.35] : [4.6, 10.6, 5.6, 8.5];
    const wallMesh = new THREE.Mesh(new THREE.ShapeGeometry((() => {
      const s = toShape(wallZone);
      s.holes.push(toPath([[win[0], win[2]], [win[1], win[2]], [win[1], win[3]], [win[0], win[3]]]));
      return s;
    })()), M.white.clone());
    wallMesh.material.side = THREE.DoubleSide;
    wallMesh.position.z = back;
    wing.add(wallMesh);
    gridZ(win[0], win[1], win[2], win[3], back, side > 0 ? 4 : 5, 2, side, wing);
    // за решёткой — стеклянная стена лоджии
    const glassBehind = new THREE.Mesh(new THREE.ShapeGeometry(toShape(latticeZone)), glassTwoSided);
    glassBehind.position.z = back - side * 0.01;
    wing.add(glassBehind);
    // декоративная решётка с треугольными проёмами почти в плоскости рамы
    const holes = latticeHoles(latticeZone, 3, 3, 0.13);
    const z0 = side > 0 ? face - 0.32 : face + 0.1;
    prismXY(latticeZone, z0, z0 + 0.22, M.frame, holes, wing);
  }
  // первый этаж крыла
  boxMM(CORE.x, 12.0, PODIUM, 4.85, -7.0, 6.0, M.white, wing);
  // к улице: узкие высокие окна и окно гостевой спальни
  for (const x of [5.0, 6.2, 7.4]) gridZ(x, x + 0.7, 1.35, 4.35, 6.0, 1, 2, 1, wing);
  gridZ(8.8, 11.2, 1.35, 4.35, 6.0, 2, 2, 1, wing);
  // к бассейну: витраж гостиной с колоннами
  gridZ(4.4, 11.6, PODIUM + 0.05, 4.6, -7.0, 4, 1, -1, wing);
  for (const x of [4.25, 7.9, 11.75]) boxMM(x - 0.25, x + 0.25, PODIUM, 4.85, -7.35, -6.85, M.white, wing);
  // торец
  gridX(-3.0, 1.5, 1.4, 4.2, 12.0, 2, 1, 1, wing);
  add(wing);
  const leftWing = wing.clone();
  leftWing.scale.x = -1;
  add(leftWing);

  // ---------- задний двор: бассейн, настил, газон, детская площадка ----------
  const poolShape = new THREE.Shape();
  poolShape.moveTo(-4.6, 8.15);
  poolShape.lineTo(9.6, 8.15);
  poolShape.splineThru([new THREE.Vector2(9.1, 10.2), new THREE.Vector2(7.0, 12.0), new THREE.Vector2(3.0, 12.9), new THREE.Vector2(-1.2, 12.5), new THREE.Vector2(-3.9, 10.8), new THREE.Vector2(-4.6, 8.15)]);
  const poolPts = poolShape.getPoints(48).map((p) => [p.x, -p.y]); // в план (x, z)
  // контур с бортом 0,45 м: смещаем точки наружу от центра бассейна
  const cx = poolPts.reduce((s, p) => s + p[0], 0) / poolPts.length;
  const cz = poolPts.reduce((s, p) => s + p[1], 0) / poolPts.length;
  const copingPts = poolPts.map(([x, z]) => {
    if (Math.abs(z + 8.15) < 0.01) return [x + Math.sign(x - cx) * 0.45, -7.85];
    const dx = x - cx, dz = (z - cz) * 1.8, len = Math.hypot(dx, dz) || 1;
    return [x + (dx / len) * 0.45, z + (dz / len) * 0.45];
  });
  ground([[-16.8, -16.3], [16.8, -16.3], [16.8, -7.7], [-16.8, -7.7]], 0.03, M.tiles, [copingPts]);
  ground(copingPts, 0.05, M.coping, [poolPts]);
  ground(poolPts, -0.005, M.water);                                         // чуть выше земли-подложки
  ribbon(poolPts, -0.006, 0.05, M.poolWall);
  ground(rectXZ(-16.6, -6.4, -16.1, -10.6), 0.06, M.grass);              // газон с детской площадкой
  ground(rectXZ(10.4, 16.6, -11.6, -7.9), 0.06, M.grass);
  // душ у бассейна
  boxMM(10.05, 10.15, 0, 2.3, -8.65, -8.55, M.lamp);
  boxMM(10.1, 10.6, 2.25, 2.32, -8.65, -8.55, M.lamp);
  // детская площадка: качели и горка
  const play = new THREE.Group();
  for (const x of [-15.2, -12.2]) {
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.55, 8), M.play);
      leg.position.set(x, 1.2, -13.6 + s * 0.45);
      leg.rotation.x = s * 0.36;
      play.add(leg);
    }
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.3, 8), M.play);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(-13.7, 2.38, -13.6);
  play.add(beam);
  for (const x of [-14.4, -13.0]) {
    boxMM(x - 0.25, x + 0.25, 0.55, 0.6, -13.75, -13.45, M.black, play);
    for (const dx of [-0.2, 0.2]) boxMM(x + dx - 0.01, x + dx + 0.01, 0.6, 2.35, -13.61, -13.59, M.black, play);
  }
  boxMM(-11.9, -11.0, 1.35, 1.45, -14.2, -13.0, M.play, play);           // площадка горки
  const slide = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.6), M.slide);
  slide.position.set(-9.95, 0.75, -13.6);
  slide.rotation.z = -0.55;
  play.add(slide);
  add(play);

  // ---------- двор у дома: боковые проходы, пальмы, пристройка ----------
  ground(rectXZ(12.6, 16.8, -7.7, 6.7), 0.03, M.tiles);
  ground(rectXZ(-16.8, -12.6, -7.7, 6.7), 0.03, M.tiles);
  ground(rectXZ(15.3, 16.75, -7.6, 6.6), 0.05, M.sand);
  const frondGeo = (() => { // лист: заострённая лопасть, прогнутая вниз к концу
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.22, 0.45, 0.02, 1);
    shape.quadraticCurveTo(-0.22, 0.45, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, -0.55 * y * y); }
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);
    return geo;
  })();
  function palm(x, z, h, lean = 0.06, parent = root) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, h, 8), M.trunk);
    trunk.position.y = h / 2;
    g.add(trunk);
    const n = 18, size = Math.min(2.4, 1.0 + h * 0.25);
    for (let i = 0; i < n; i++) {
      const frond = new THREE.Mesh(frondGeo, i % 4 === 3 ? M.frondDry : M.frond);
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.17;
      frond.scale.setScalar(size * (0.85 + (i % 3) * 0.1));
      frond.position.set(0, h, 0);
      frond.rotation.set(0, a, 0, 'YXZ');
      frond.rotateX(-0.55 + (i % 3) * 0.35);
      g.add(frond);
    }
    g.position.set(x, 0, z);
    g.rotation.z = lean;
    return add(g, parent);
  }
  for (const z of [-5.5, -1.0, 3.5]) palm(16.0, z, 5.2 + (z > 0 ? 0.6 : 0));
  for (const [x, z] of [[15.9, -6.8], [15.6, 1.2], [15.9, 5.8]]) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), M.shrub);
    shrub.scale.y = 0.7;
    shrub.position.set(x, 0.25, z);
    add(shrub);
  }
  boxMM(12.2, 16.6, 0, 3.3, -16.25, -12.5, M.white);                      // водительская / летняя кухня
  boxMM(12.1, 16.7, 3.3, 3.45, -16.35, -12.4, M.frame);
  boxMM(13.2, 14.2, 0, 2.4, -12.5, -12.44, M.door);
  palm(2.9, 5.6, 4.6, 0.04);                                               // пальма в кашпо у входа
  boxMM(2.3, 3.5, PODIUM, PODIUM + 0.55, 5.0, 6.2, M.door);

  // ---------- передний двор и ограда с ламелями ----------
  ground(rectXZ(-16.8, 16.8, 6.7, 16.3), 0.03, M.pavers);
  ground(rectXZ(-2.3, 2.3, 8.45, 16.3), 0.04, M.tiles);
  // машины для масштаба: 5 мест внутри и 5 снаружи по объявлению
  function car(x, z, rot, color) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.35 });
    boxMM(-2.35, 2.35, 0.32, 1.05, -0.93, 0.93, body, g);
    boxMM(-1.25, 1.05, 1.05, 1.62, -0.84, 0.84, M.glass, g);
    boxMM(-1.0, 0.9, 1.6, 1.66, -0.8, 0.8, body, g);
    for (const wx of [-1.5, 1.5]) for (const wz of [-0.86, 0.86]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.26, 14), M.tyre);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.37, wz);
      g.add(wheel);
    }
    g.position.set(x, 0.03, z);
    g.rotation.y = rot;
    return add(g);
  }
  car(-9.3, 11.6, Math.PI / 2, 0xf2f2f0);
  car(9.1, 11.4, Math.PI / 2, 0x202326);
  car(-3.9, 21.8, Math.PI / 2, 0xb7bcc2);
  const H = 2.65;
  function fence(axis, a0, a1, at, gates) { // ограда: белое основание 0,9 м, столбы, чёрные ламели; gates — проёмы до земли
    const segs = [];
    let cur = a0;
    for (const [g0, g1] of gates) { segs.push([cur, g0, false]); segs.push([g0, g1, true]); cur = g1; }
    segs.push([cur, a1, false]);
    for (const [s0, s1, gate] of segs) {
      if (s1 - s0 < 0.05) continue;
      const pieces = gate ? 1 : Math.max(1, Math.round((s1 - s0) / 4.5));
      for (let k = 0; k < pieces; k++) {
        const p0 = s0 + ((s1 - s0) * k) / pieces, p1 = s0 + ((s1 - s0) * (k + 1)) / pieces;
        const yb = gate ? 0 : 0.9;
        if (axis === 'x') {
          if (!gate) boxMM(p0, p1, 0, 0.9, at - 0.17, at + 0.17, M.white);
          const panel = boxMM(p0 + 0.25, p1 - 0.25, yb, H - 0.15, at - 0.06, at + 0.06, M.slats);
          panel.material = M.slats.clone();
          panel.material.map = M.slats.map.clone();
          panel.material.map.repeat.set((p1 - p0) / 0.8, 1);
          panel.material.map.needsUpdate = true;
          boxMM(p0 - 0.28, p0 + 0.28, 0, H, at - 0.28, at + 0.28, M.frame);
        } else {
          if (!gate) boxMM(at - 0.17, at + 0.17, 0, 0.9, p0, p1, M.white);
          const panel = boxMM(at - 0.06, at + 0.06, yb, H - 0.15, p0 + 0.25, p1 - 0.25, M.slats);
          panel.material = M.slats.clone();
          panel.material.map = M.slats.map.clone();
          panel.material.map.repeat.set((p1 - p0) / 0.8, 1);
          panel.material.map.needsUpdate = true;
          boxMM(at - 0.28, at + 0.28, 0, H, p0 - 0.28, p0 + 0.28, M.frame);
        }
      }
    }
    if (axis === 'x') boxMM(a1 - 0.28, a1 + 0.28, 0, H, at - 0.28, at + 0.28, M.frame);
    else boxMM(at - 0.28, at + 0.28, 0, H, a1 - 0.28, a1 + 0.28, M.frame);
  }
  fence('x', -16.8, 16.8, 16.5, [[-12.0, -6.6], [-2.0, -0.7], [6.6, 11.6]]); // главная улица: два въезда и калитка
  fence('z', -16.5, 16.5, 16.8, []);                                       // боковая улица (угловой участок)
  boxMM(-17.0, -16.6, 0, 3.0, -16.5, 16.5, M.white);                       // глухие стены к соседям
  boxMM(-17.0, 16.6, 0, 3.0, -16.75, -16.35, M.white);

  // ---------- улицы ----------
  ground(rectXZ(-90, 28, 19.2, 33), 0.01, M.asphalt);
  ground(rectXZ(19.6, 28, -90, 33), 0.012, M.asphalt);
  boxMM(-90, 19.6, 0, 0.14, 16.75, 19.2, M.concrete);                     // тротуары
  boxMM(17.05, 19.6, 0, 0.14, -90, 16.75, M.concrete);
  ground(rectXZ(-9.4, 4.4, 19.2, 24.4), 0.03, M.pavers);                    // 5 мест снаружи
  for (let i = 0; i <= 5; i++) boxMM(-9.4 + i * 2.76 - 0.06, -9.4 + i * 2.76 + 0.06, 0.03, 0.045, 19.3, 24.3, M.paint);
  for (let x = -86; x < 18; x += 6) boxMM(x, x + 3, 0.012, 0.022, 28.15, 28.3, M.paint);
  for (let z = -86; z < 18; z += 6) boxMM(23.7, 23.85, 0.014, 0.024, z, z + 3, M.paint);
  ground(rectXZ(5.2, 7.4, 17.2, 18.8), 0.15, M.sand);
  ground(rectXZ(10.2, 12.4, 17.2, 18.8), 0.15, M.sand);
  palm(6.3, 18.0, 1.4, 0.02);
  palm(11.3, 18.0, 1.4, 0.02);
  function lamp(x, z, rot) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 8, 8), M.lamp);
    pole.position.y = 4;
    g.add(pole);
    boxMM(-0.05, 1.4, 7.85, 7.95, -0.05, 0.05, M.lamp, g);
    boxMM(1.1, 1.6, 7.75, 7.9, -0.15, 0.15, M.lamp, g);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    return add(g);
  }
  for (const x of [-38, -20, -4, 12]) lamp(x, 18.8, -Math.PI / 2);
  for (const z of [-40, -22, -4]) lamp(19.1, z, 0);

  // ---------- соседи и дальние дома (для масштаба) ----------
  boxMM(-44, -21, 0, 8.2, -12, 9, M.neighbor);
  boxMM(-44.4, -20.6, 8.2, 9.0, -12.4, 9.4, M.neighbor);
  boxMM(-6, 16, 0, 7.6, -50, -33, M.neighbor);
  boxMM(-3, 12, 4.0, 6.8, -32.95, -32.9, M.neighborDark);
  boxMM(36, 58, 0, 7.5, -30, -6, M.neighbor);
  boxMM(-70, -50, 0, 9.0, 40, 60, M.neighbor);
  boxMM(40, 66, 0, 11, 44, 70, M.neighbor);

  const views = {
    start: { pos: [31, 15, 37], target: [0, 4, 0] },
    street: { pos: [9, 1.7, 31], target: [0, 5.2, 4] },
    back: { pos: [-21, 19, -38], target: [1, 2.5, -6] },
    pool: { pos: [-12.5, 2.4, -15.6], target: [3, 3.6, -6.5] },
    top: { pos: [0.2, 78, 10], target: [0, 0, 0] }
  };
  return { root, views };
}
