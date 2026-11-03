// Вилла Al Warqa 4 · современная 6BR — подробная модель для полной 3D-визуализации (прогулка, пролёт, день/ночь).
// По 35 фото брошюры и 30 фото объявления dubizzle AW4550K11127: дом ~703 м², участок ~1 116 м², угловой, 2 этажа,
// пол 1-го этажа поднят на 0,9 м, второй свет ~8 м. Плана нет — размеры и расстановка комнат приблизительные.
// Оси: X — вдоль главной улицы (на восток), Z — к главной улице (на юг), Y — вверх, метры.
// build(THREE, { tex }) → { root, views, tour, doors, phys, rooms, lights, night, anim, probes, kit }.

export const info = {
  title: 'Al Warqa 4 · современная 6BR',
  note: 'Дом, участок и интерьер по фото брошюры и объявления; плана нет, размеры приблизительные.'
};

export function build(THREE, opts = {}) {
  const tex = opts.tex || (() => null);
  const root = new THREE.Group();
  root.name = 'war4_villa';
  // Физика прогулки: colliders — коробки [x0,y0,z0,x1,y1,z1]; walkables — поверхности [x0,z0,x1,z1,высота];
  // polys — препятствия-многоугольники { pts:[[x,z]...], y0, y1 }.
  const phys = { colliders: [], walkables: [], polys: [] };
  const lights = [];   // источники света для пула огней: { pos, color, intensity, distance, room, set: 'empty'|'night' }
  const night = [];    // светящиеся материалы, включаемые вечером: { mat, on }
  const anim = [];     // (время, шаг) => void

  // ---------- текстуры ----------
  function pbr(name, mpt, params = {}, o = {}) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 1, metalness: 0 }, params));
    const t = tex(name, mpt, o.rotate || 0);
    if (t) {
      m.map = t.map;
      if (t.normal) {
        m.normalMap = t.normal;
        m.normalScale = new THREE.Vector2(o.normal ?? 0.8, o.normal ?? 0.8);
      }
      if (t.orm) {
        m.roughnessMap = t.orm;
        m.aoMap = t.orm;
        m.aoMapIntensity = o.ao ?? 0.7;
        if (params.metalness) m.metalnessMap = t.orm;
      }
    }
    return m;
  }
  function canvasTexture(w, h, draw, repeat = [1, 1], srgb = true) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.repeat.set(...repeat);
    return t;
  }
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  // нормали волн воды: сумма синусов, бесшовная плитка
  const waterNormal = (() => {
    const N = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = N;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(N, N);
    const waves = [];
    for (let i = 0; i < 14; i++) waves.push([1 + Math.floor(rnd() * 5), Math.floor(rnd() * 7) - 3, rnd() * 6.28, 0.6 + rnd()]);
    const hgt = (x, y) => waves.reduce((s, [a, b, p, k]) => s + Math.sin(((a * x + b * y) / N) * 6.283 + p) * k / (a + Math.abs(b)), 0);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
      const nx = -dx * 2.5, ny = -dy * 2.5, nz = 1, l = Math.hypot(nx, ny, nz);
      const i = (y * N + x) * 4;
      img.data[i] = (nx / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.35, 0.35);
    return t;
  })();
  // лист пальмы: центральная жилка и частые узкие листочки разных оттенков, прозрачность по альфе
  const frondTex = canvasTexture(256, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const rib = ctx.createLinearGradient(0, h, 0, 0);
    rib.addColorStop(0, '#8a8a4a');
    rib.addColorStop(1, '#5e7a34');
    ctx.strokeStyle = rib;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2, 10); ctx.stroke();
    for (let y = h - 50; y > 30; y -= 7) {
      const t = y / h, len = (w / 2 - 10) * Math.sin(Math.PI * (1 - t) * 0.95 + 0.15) * (0.88 + rnd() * 0.12);
      for (const side of [-1, 1]) {
        const g = 92 + Math.floor(rnd() * 60), dry = rnd() < 0.06;
        ctx.strokeStyle = dry ? `rgb(${130 + Math.floor(rnd() * 40)},${120 + Math.floor(rnd() * 30)},60)` : `rgb(${34 + Math.floor(rnd() * 36)},${g},${26 + Math.floor(rnd() * 26)})`;
        ctx.lineWidth = 4.2 + rnd() * 1.6;
        ctx.beginPath();
        ctx.moveTo(w / 2, y);
        ctx.quadraticCurveTo(w / 2 + side * len * 0.55, y - 16, w / 2 + side * len, y - 44 - rnd() * 14);
        ctx.stroke();
      }
    }
  });

  const grassTime = { value: 0 };
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = (shader) => { // ветер: кончики травинок качаются, фаза — от места травинки
    shader.uniforms.uTime = grassTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
      #else
        vec2 ip = vec2(0.0);
      #endif
      float sway = sin(uTime * 1.7 + ip.x * 0.8 + ip.y * 0.6) * 0.6 + sin(uTime * 3.1 + ip.x * 2.3 + ip.y * 1.7) * 0.25;
      transformed.z += sway * 0.3 * position.y * position.y;`);
  };
  const M = {
    plaster: pbr('plaster', 2.4, { color: 0xf4efe7 }, { normal: 0.45 }),
    frame: pbr('concrete_white', 3.0, { color: 0xf8f4ec }, { normal: 0.35 }),
    stone: pbr('travertine', 1.8, { color: 0xfffaf2 }, { normal: 0.45 }),
    coping: pbr('travertine', 1.1, { color: 0xf3eadc }, { normal: 0.45 }),
    deck: pbr('deck', 3.0, {}, { normal: 0.7 }),
    pavers: pbr('pavers', 1.6, { color: 0xd4d4d4 }, { normal: 0.9 }),
    grass: pbr('grass', 2.2, { color: 0xe4ecd6 }, { normal: 0.6 }),
    sand: pbr('sand', 6.0, { color: 0xf2dec2 }, { normal: 0.7 }),
    asphalt: pbr('asphalt', 4.5, { color: 0xa8a8a8 }, { normal: 0.6 }),
    pool: pbr('pool', 1.4, {}, { normal: 0.6 }),
    gravel: pbr('gravel', 1.2, { color: 0xf3efe6 }, { normal: 0.9 }),
    bark: pbr('bark', 1.0, { color: 0xc4b089 }, { normal: 1.0 }),
    fence: pbr('metal_black', 1.0, { color: 0x45494d, metalness: 1 }, { normal: 0.3 }),
    alu: new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.32, metalness: 0.75 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1b252a, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.32, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide }),
    door: new THREE.MeshStandardMaterial({ color: 0x222326, roughness: 0.32, metalness: 0.6 }),
    water: new THREE.MeshStandardMaterial({ color: 0x1aa0ae, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.62, normalMap: waterNormal, normalScale: new THREE.Vector2(0.45, 0.45), envMapIntensity: 1.5, depthWrite: false }),
    frond: new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, color: 0xd8e8c0 }),
    shrub: new THREE.MeshStandardMaterial({ color: 0x6f8b48, roughness: 0.9 }),
    play: new THREE.MeshStandardMaterial({ color: 0xd2452a, roughness: 0.5 }),
    slide: new THREE.MeshStandardMaterial({ color: 0x2c6fd6, roughness: 0.35 }),
    neighbor: pbr('plaster', 3.0, { color: 0xe7dccb }, { normal: 0.45 }),
    neighborGlass: new THREE.MeshStandardMaterial({ color: 0x2a3640, roughness: 0.1, metalness: 0.6 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x8e9499, metalness: 0.7, roughness: 0.35 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xb8bdc2, metalness: 1, roughness: 0.25 }),
    carGlass: new THREE.MeshStandardMaterial({ color: 0x0e141a, metalness: 0.3, roughness: 0.04, transparent: true, opacity: 0.82, envMapIntensity: 1.8 }),
    // вечерняя подсветка (яркость в ночном режиме задаёт просмотрщик через night[])
    ledFacade: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff1dc, emissiveIntensity: 0 }),
    lampHead: new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0xffe2b0, emissiveIntensity: 0 }),
    poolLight: new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x6ff6ff, emissiveIntensity: 0 }),
    carLight: new THREE.MeshStandardMaterial({ color: 0x444444, emissive: 0xfff6e8, emissiveIntensity: 0 }),
    carTail: new THREE.MeshStandardMaterial({ color: 0x440000, emissive: 0xff1a1a, emissiveIntensity: 0 })
  };
  night.push({ mat: M.ledFacade, on: 2.6 }, { mat: M.lampHead, on: 6 }, { mat: M.poolLight, on: 5 }, { mat: M.carLight, on: 3 }, { mat: M.carTail, on: 2 });
  anim.push((t) => { waterNormal.offset.set(t * 0.012, t * 0.007); waterNormal.rotation = Math.sin(t * 0.05) * 0.2; grassTime.value = t; });

  const MI = { // интерьер: материалы с userData.room получают отражения «комнатного» зонда просмотрщика
    wall: pbr('wall_paint', 2.4, { color: 0xf5efe6 }, { normal: 0.3, ao: 0.3 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf7f5f1, roughness: 0.95 }),
    floor: pbr('floor_cream', 2.4, {}, { normal: 0.25, ao: 0 }),
    floor1: pbr('floor_cream', 2.4, {}, { normal: 0.25, ao: 0 }),
    floorRoom: pbr('floor_taupe', 2.4, {}, { normal: 0.25, ao: 0 }),
    floorBath: pbr('bath_stone', 1.2, { color: 0xb5b5b5 }, { normal: 0.35, ao: 0.3 }),
    walnut: pbr('walnut', 1.0, {}, { rotate: Math.PI / 2, normal: 0.5 }),
    oak: pbr('oak', 1.2, {}, { rotate: Math.PI / 2, normal: 0.35 }),
    stoneDark: pbr('bath_stone', 1.6, {}, { normal: 0.35 }),
    stoneLight: pbr('travertine', 1.0, {}, { normal: 0.3 }),
    tread: pbr('travertine', 1.2, { color: 0xfffbf3 }, { normal: 0.3 }),
    porcelain: new THREE.MeshPhysicalMaterial({ color: 0xf7f6f2, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06 }),
    basin: new THREE.MeshStandardMaterial({ color: 0xd9e3e6, roughness: 0.15 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe2e6ea, metalness: 1, roughness: 0.12 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0a0e10, roughness: 0.03, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4 }),
    led: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a6, emissiveIntensity: 2.2 }),
    riser: new THREE.MeshStandardMaterial({ color: 0xf3e6cf, emissive: 0xffd8a0, emissiveIntensity: 0.5, roughness: 0.4 }),
    downlight: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff4e2, emissiveIntensity: 3 }),
    slot: new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.7 }),
    skirt: new THREE.MeshStandardMaterial({ color: 0xe4ddd2, roughness: 0.42 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.3 })
  };
  for (const [key, m] of Object.entries(MI)) m.userData.room = key === 'floor1' ? 'ff' : 'gf';
  for (const key of ['led', 'downlight', 'glass']) MI[key].userData.noCast = true;
  M.glass.userData.noCast = true;
  M.water.userData.noCast = true;

  // ---------- помощники ----------
  const add = (obj, parent = root) => { parent.add(obj); return obj; };
  const aabb = (x0, x1, y0, y1, z0, z1) => [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)];
  const solid = (x0, x1, y0, y1, z0, z1) => { phys.colliders.push(aabb(x0, x1, y0, y1, z0, z1)); };
  const walk = (x0, x1, top, z0, z1) => { phys.walkables.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), top]); };
  function boxMM(x0, x1, y0, y1, z0, z1, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, parent);
  }
  const toShape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const toPath = (pts) => new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x, y)));
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
  function latticeHoles(quad, cols, rows, inset) { // треугольные проёмы декоративной решётки
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
  // Пакет: детали одного материала сливаются в одну сетку; развёртка по мировым координатам в метрах,
  // поэтому плитка, шпон и штукатурка ложатся в одном масштабе. uv2 не нужен: AO берётся из той же развёртки.
  function makeBatch() {
    const groups = new Map();
    const put = (geo, mat) => {
      if (!groups.has(mat)) groups.set(mat, []);
      groups.get(mat).push(geo.index ? geo.toNonIndexed() : geo);
    };
    return {
      geo: put,
      box(x0, x1, y0, y1, z0, z1, mat) {
        if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
        const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
        g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        put(g, mat);
      },
      boxSplit(x0, x1, y0, y1, z0, z1, mat, innerMat, axis, sign) { // грань внутрь дома — отделкой
        if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
        const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).toNonIndexed();
        g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        const k = axis === 'x' ? 0 : 2, p = g.attributes.position.array, q = g.attributes.normal.array;
        const parts = [[[], []], [[], []]];
        for (let i = 0; i < p.length; i += 9) {
          const part = parts[q[i + k] * sign > 0.5 ? 1 : 0];
          for (let j = 0; j < 9; j++) { part[0].push(p[i + j]); part[1].push(q[i + j]); }
        }
        parts.forEach(([pos, nor], j) => {
          if (!pos.length) return;
          const h = new THREE.BufferGeometry();
          h.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          h.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
          put(h, j ? innerMat : mat);
        });
        g.dispose();
      },
      geoSplit(geo, mat, innerMat, axis, sign) { // треугольники, смотрящие внутрь дома, — отделкой
        const g = geo.index ? geo.toNonIndexed() : geo;
        const k = axis === 'x' ? 0 : 2, p = g.attributes.position.array, q = g.attributes.normal.array;
        const parts = [[[], []], [[], []]];
        for (let i = 0; i < p.length; i += 9) {
          const part = parts[q[i + k] * sign > 0.5 ? 1 : 0];
          for (let j = 0; j < 9; j++) { part[0].push(p[i + j]); part[1].push(q[i + j]); }
        }
        parts.forEach(([pos, nor], j) => {
          if (!pos.length) return;
          const h = new THREE.BufferGeometry();
          h.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          h.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
          put(h, j ? innerMat : mat);
        });
      },
      flush(parent) {
        for (const [mat, list] of groups) {
          let n = 0;
          for (const g of list) n += g.attributes.position.count;
          const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
          let o = 0;
          for (const g of list) {
            const p = g.attributes.position.array, q = g.attributes.normal.array, c = g.attributes.position.count;
            pos.set(p, o * 3);
            nor.set(q, o * 3);
            if (mat.userData.keepUV && g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
            else for (let i = 0; i < c; i++) {
              const ax = Math.abs(q[i * 3]), ay = Math.abs(q[i * 3 + 1]), az = Math.abs(q[i * 3 + 2]);
              const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
              uv[(o + i) * 2] = ay >= ax && ay >= az ? x : ax >= az ? z : x;
              uv[(o + i) * 2 + 1] = ay >= ax && ay >= az ? -z : y;
            }
            o += c;
            g.dispose();
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
          geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          geo.computeBoundingSphere();
          const mesh = new THREE.Mesh(geo, mat);
          if (mat.userData.noCast) mesh.userData.noCast = true;
          if (mat.userData.noAO) mesh.userData.noAO = true;
          if (mat.transparent) mesh.renderOrder = 2;
          parent.add(mesh);
        }
        groups.clear();
      }
    };
  }
  const xb = makeBatch(); // всё неподвижное снаружи
  const ib = makeBatch(); // интерьер
  // Стена с проёмами: along 'x' — вдоль X (толщина t0..t1 по Z), 'z' — вдоль Z (толщина по X);
  // holes — [a0, a1, y0, y1, проход?]; проём без отметки «проход» (окно) для прогулки остаётся препятствием.
  // inner — [материал, знак]: грань, смотрящая внутрь дома, получает отделку.
  const SKIRT = 0.085;
  function skirting(along, s0, s1, y0, t0, t1, faces) { // faces: -1 — грань t0, +1 — грань t1
    if (s1 - s0 < 0.05) return;
    for (const f of faces) {
      const [c0, c1] = f < 0 ? [t0 - 0.012, t0] : [t1, t1 + 0.012];
      if (along === 'x') ib.box(s0, s1, y0, y0 + SKIRT, c0, c1, MI.skirt); else ib.box(c0, c1, y0, y0 + SKIRT, s0, s1, MI.skirt);
    }
  }
  function wall(batch, along, a0, a1, y0, y1, t0, t1, holes, mat, inner = null, physics = true) {
    const cut = (vals, lo, hi) => [...new Set(vals)].filter((v) => v >= lo && v <= hi).sort((p, q) => p - q);
    const skirtFaces = mat === MI.wall ? [-1, 1] : inner && inner[0] === MI.wall ? [inner[1]] : null;
    const ua = cut([a0, a1, ...holes.flatMap((h) => [h[0], h[1]])], a0, a1);
    const uy = cut([y0, y1, ...holes.flatMap((h) => [h[2], h[3]])], y0, y1);
    for (let j = 0; j < uy.length - 1; j++) {
      const yc = (uy[j] + uy[j + 1]) / 2;
      let start = null;
      for (let i = 0; i < ua.length; i++) {
        const ac = i < ua.length - 1 ? (ua[i] + ua[i + 1]) / 2 : null;
        const solidCell = ac !== null && !holes.some(([h0, h1, hy0, hy1]) => ac > h0 && ac < h1 && yc > hy0 && yc < hy1);
        if (solidCell && start === null) start = ua[i];
        if (!solidCell && start !== null) {
          const b = along === 'x' ? [start, ua[i], uy[j], uy[j + 1], t0, t1] : [t0, t1, uy[j], uy[j + 1], start, ua[i]];
          if (inner) batch.boxSplit(...b, mat, inner[0], along === 'x' ? 'z' : 'x', inner[1]);
          else batch.box(...b, mat);
          if (physics) solid(b[0], b[1], b[2], b[3], b[4], b[5]);
          if (skirtFaces && j === 0 && Math.min(Math.abs(y0 - F0), Math.abs(y0 - F1)) < 0.01) skirting(along, start, ua[i], y0, t0, t1, skirtFaces);
          start = null;
        }
      }
    }
    if (physics) for (const [h0, h1, hy0, hy1, pass] of holes) {
      if (pass) continue;
      if (along === 'x') solid(h0, h1, hy0, hy1, t0, t1); else solid(t0, t1, hy0, hy1, h0, h1);
    }
  }
  function ground(ptsXZ, y, mat, holesXZ = [], parent = root) { // горизонтальная поверхность по точкам плана (x, z)
    const shape = toShape(ptsXZ.map(([x, z]) => [x, -z]));
    holesXZ.forEach((h) => shape.holes.push(toPath(h.map(([x, z]) => [x, -z]))));
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.userData.noCast = true;
    return add(m, parent);
  }
  const rectXZ = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  // Окно: стекло (прозрачное, с отражениями) + переплёты из чёрного алюминия + подоконники.
  function windowZ(batch, x0, x1, y0, y1, z, cols, rows, facing, parent, sill = true) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), M.glass);
    pane.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    pane.renderOrder = 2;
    parent.add(pane);
    const d = 0.06, bar = 0.06;
    for (let i = 0; i <= cols; i++) { const x = x0 + (i * (x1 - x0)) / cols; batch.box(x - bar / 2, x + bar / 2, y0, y1, z - d, z + d, M.alu); }
    for (let j = 0; j <= rows; j++) { const y = y0 + (j * (y1 - y0)) / rows; batch.box(x0, x1, y - bar / 2, y + bar / 2, z - d, z + d, M.alu); }
    if (sill) batch.box(x0 - 0.05, x1 + 0.05, y0 - 0.05, y0, z + (facing > 0 ? 0 : -0.12), z + (facing > 0 ? 0.12 : 0), M.coping);
  }
  function windowX(batch, z0, z1, y0, y1, x, cols, rows, facing, parent, sill = true) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), M.glass);
    pane.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    pane.rotation.y = Math.PI / 2;
    pane.renderOrder = 2;
    parent.add(pane);
    const d = 0.06, bar = 0.06;
    for (let i = 0; i <= cols; i++) { const z = z0 + (i * (z1 - z0)) / cols; batch.box(x - d, x + d, y0, y1, z - bar / 2, z + bar / 2, M.alu); }
    for (let j = 0; j <= rows; j++) { const y = y0 + (j * (y1 - y0)) / rows; batch.box(x - d, x + d, y - bar / 2, y + bar / 2, z0, z1, M.alu); }
    if (sill) batch.box(x + (facing > 0 ? 0 : -0.12), x + (facing > 0 ? 0.12 : 0), y0 - 0.05, y0, z0 - 0.05, z1 + 0.05, M.coping);
  }
  function prism(batch, pts, z0, z1, mat, holes = []) { // многоугольник в плоскости XY, вытянут по Z
    const shape = toShape(pts);
    holes.forEach((h) => shape.holes.push(toPath(h)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, z0);
    batch.geo(g, mat);
  }

  // ---------- размеры ----------
  const PODIUM = 0.9;
  const WING_FRONT = 6.6, WING_BACK = -7.6;
  const CORE = { x: 4.0, front: 4.6, back: -6.0, top: 9.7 };
  const F0 = PODIUM, F1 = 5.3;
  const CG = 4.6, CGB = 4.25, C1 = 8.45;
  const CC = CORE.top - 0.5;
  const IN = CORE.x - 0.25;
  // проёмы между холлом и крыльями: проход в зал, дверь в коридор, дверь с галереи (все проходные)
  const SIDE_HOLES = [[-5.4, -2.4, F0, 3.9, true], [1.5, 2.6, F0, 3.2, true], [-0.6, 0.6, F1, F1 + 2.4, true]];

  // ---------- подиум, крыльцо ----------
  xb.box(-12.6, 12.6, 0, PODIUM, -7.7, 6.7, M.stone);
  solid(-12.6, 12.6, 0, PODIUM, -7.7, 6.7);
  walk(-12.6, 12.6, PODIUM, -7.7, 6.7);
  for (let i = 0; i < 5; i++) {
    const top = PODIUM - i * 0.18, z1 = 6.7 + (i + 1) * 0.35;
    xb.box(-2.3, 2.3, 0, top, 6.7 + i * 0.35, z1, M.stone);
    walk(-2.3, 2.3, top, 6.7 + i * 0.35, z1);
  }
  for (const s of [-1, 1]) solid(s * 2.3 - 0.02, s * 2.3 + 0.02, 0, 1.2, 6.7, 8.45); // щёки крыльца
  // настенные светильники у входа
  for (const x of [-2.6, 2.6]) {
    xb.box(x - 0.07, x + 0.07, 2.5, 2.9, CORE.front, CORE.front + 0.08, M.alu);
    xb.box(x - 0.05, x + 0.05, 2.45, 2.5, CORE.front + 0.01, CORE.front + 0.07, M.lampHead);
  }

  // ---------- центральный объём: холл со вторым светом и лестницей ----------
  const core = new THREE.Group();
  add(core);
  const cb = makeBatch();
  wall(cb, 'x', -CORE.x, CORE.x, PODIUM, CORE.top - 0.45, CORE.front - 0.25, CORE.front,
    [[-0.85, 0.85, PODIUM, 4.0, true], [-1.7, -0.85, PODIUM, 4.0], [0.85, 1.7, PODIUM, 4.0], [-1.7, 1.7, 4.05, 4.95], [-3.6, 3.6, 5.2, CORE.top - 0.55]], M.plaster, [MI.wall, -1]);
  wall(cb, 'x', -CORE.x, CORE.x, PODIUM, CORE.top - 0.45, CORE.back, CORE.back + 0.25, [[-3.6, 3.6, PODIUM + 0.05, CORE.top - 0.55]], M.plaster, [MI.wall, 1]);
  wall(cb, 'z', CORE.back, CORE.front, PODIUM, CORE.top - 0.45, IN, CORE.x, SIDE_HOLES, M.plaster, [MI.wall, -1]);
  wall(cb, 'z', CORE.back, CORE.front, PODIUM, CORE.top - 0.45, -CORE.x, -IN, SIDE_HOLES, M.plaster, [MI.wall, 1]);
  cb.box(-CORE.x, CORE.x, CORE.top - 0.45, CORE.top, CORE.back, CORE.front, M.frame);
  cb.box(-CORE.x - 0.1, CORE.x + 0.1, CORE.top - 0.45, CORE.top + 0.05, CORE.back - 0.1, CORE.front + 0.1, M.frame);
  cb.box(-CORE.x + 0.15, CORE.x - 0.15, CORE.top + 0.05, CORE.top + 0.09, CORE.back + 0.1, CORE.front - 0.1, M.gravel); // кровля
  for (const x of [-2.2, 1.0]) { // наружные блоки кондиционеров на кровле
    cb.box(x, x + 1.1, CORE.top + 0.09, CORE.top + 0.95, -3.2, -2.4, M.lamp);
    cb.box(x + 0.15, x + 0.95, CORE.top + 0.3, CORE.top + 0.85, -2.42, -2.38, M.alu);
  }
  windowZ(cb, -3.6, 3.6, 5.2, CORE.top - 0.55, CORE.front, 5, 2, 1, core, false); // стекло второго света над входом
  windowZ(cb, -1.7, 1.7, 4.05, 4.95, CORE.front, 3, 1, 1, core, false);         // фрамуга
  windowZ(cb, -1.7, -0.9, PODIUM, 4.0, CORE.front, 1, 2, 1, core, false);
  windowZ(cb, 0.9, 1.7, PODIUM, 4.0, CORE.front, 1, 2, 1, core, false);
  windowZ(cb, -3.6, 3.6, PODIUM + 0.05, CORE.top - 0.55, CORE.back, 5, 3, -1, core, false); // витраж к бассейну
  cb.box(-3.7, 3.7, CORE.top - 0.58, CORE.top - 0.53, CORE.front + 0.02, CORE.front + 0.1, M.ledFacade);
  cb.flush(core);
  // поворотная входная дверь: ось в 0,4 м от левого края, открывается внутрь
  const entryDoor = new THREE.Group();
  entryDoor.position.set(-0.45, 0, CORE.front + 0.04);
  core.add(entryDoor);
  boxMM(-0.4, 1.3, PODIUM, 4.0, -0.04, 0.04, M.door, entryDoor);
  for (const z of [0.04, -0.1]) boxMM(0.41, 0.49, 2.2, 2.9, z, z + 0.06, M.lamp, entryDoor);
  entryDoor.userData.openAngle = 1.45;
  entryDoor.userData.hinge = [-0.45, CORE.front + 0.04];

  // ---------- крылья: правое строится, левое — зеркальная копия ----------
  const wing = new THREE.Group();
  const wb = makeBatch();
  const outer = [[CORE.x, 4.85], [13.0, 4.85], [15.0, 10.2], [CORE.x, 8.95]];
  const inner = offsetConvex(outer, 0.45);
  const [, J, K, L] = inner;
  const roofAt = (x) => L[1] + (x - L[0]) * (K[1] - L[1]) / (K[0] - L[0]);
  prism(wb, [...outer, [CORE.x, roofAt(CORE.x)], K, J, [CORE.x, F1]], WING_BACK, WING_FRONT, M.frame);
  wall(wb, 'z', WING_BACK, WING_FRONT, F1, L[1], CORE.x, CORE.x + 0.45, [SIDE_HOLES[2]], M.frame, [MI.wall, 1], false);
  // светодиодная лента под нижней кромкой рамы и по наклонному торцу
  wb.box(CORE.x + 0.3, 13.0, 4.82, 4.85, WING_FRONT - 0.12, WING_FRONT - 0.04, M.ledFacade);
  wb.box(CORE.x + 0.3, 13.0, 4.82, 4.85, WING_BACK + 0.04, WING_BACK + 0.12, M.ledFacade);
  const LATTICE_X = 11.0;
  const latticeZone = clipX(inner, LATTICE_X, true);
  const wallZone = clipX(inner, LATTICE_X, false);
  for (const side of [1, -1]) {
    const face = side > 0 ? WING_FRONT : WING_BACK;
    const back = face - side * 1.0; // утопленная стена второго этажа
    const win = side > 0 ? [5.3, 10.5, 5.75, 8.35] : [4.6, 10.6, 5.6, 8.5];
    const shape = toShape(wallZone);
    shape.holes.push(toPath([[win[0], win[2]], [win[1], win[2]], [win[1], win[3]], [win[0], win[3]]]));
    const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
    wallGeo.translate(0, 0, side > 0 ? back - 0.2 : back);
    wb.geoSplit(wallGeo, M.plaster, MI.wall, 'z', -side);
    windowZ(wb, win[0], win[1], win[2], win[3], back + side * 0.0, side > 0 ? 4 : 5, 2, side, wing);
    // стеклянная стена лоджии за решёткой
    const g = new THREE.Mesh(new THREE.ShapeGeometry(toShape(latticeZone)), M.glass);
    g.position.z = back - side * 0.01;
    g.renderOrder = 2;
    wing.add(g);
    const holes = latticeHoles(latticeZone, 3, 3, 0.13);
    const z0 = side > 0 ? face - 0.32 : face + 0.1;
    prism(wb, latticeZone, z0, z0 + 0.22, M.frame, holes);
  }
  const NARROW = [5.0, 6.2, 7.4];
  const END_WIN = [-3.6, 0.3];
  wall(wb, 'x', CORE.x, 12.0, PODIUM, 4.85, 5.75, 6.0, [...NARROW.map((x) => [x, x + 0.7, 1.35, 4.35]), [8.8, 11.2, 1.35, 4.35]], M.plaster, [MI.wall, -1], false);
  wall(wb, 'x', CORE.x, 12.0, PODIUM, 4.85, -7.0, -6.75, [[4.4, 11.6, PODIUM + 0.05, 4.6]], M.plaster, [MI.wall, 1], false);
  wall(wb, 'z', -7.0, 6.0, PODIUM, 4.85, 11.75, 12.0, [[END_WIN[0], END_WIN[1], 1.4, 4.2]], M.plaster, [MI.wall, -1], false);
  wall(wb, 'z', -7.0, 6.0, PODIUM, 4.85, CORE.x, CORE.x + 0.25, SIDE_HOLES.slice(0, 2), M.plaster, [MI.wall, 1], false);
  for (const x of NARROW) windowZ(wb, x, x + 0.7, 1.35, 4.35, 6.0, 1, 2, 1, wing);
  windowZ(wb, 8.8, 11.2, 1.35, 4.35, 6.0, 2, 2, 1, wing);
  windowZ(wb, 4.4, 11.6, PODIUM + 0.05, 4.6, -7.0, 4, 1, -1, wing, false);
  for (const x of [4.25, 7.9, 11.75]) wb.box(x - 0.25, x + 0.25, PODIUM, 4.85, -7.35, -6.85, M.plaster);
  windowX(wb, END_WIN[0], END_WIN[1], 1.4, 4.2, 12.0, 2, 1, 1, wing);
  wb.flush(wing);
  add(wing);
  const leftWing = wing.clone();
  leftWing.scale.x = -1;
  add(leftWing);
  // физика крыльев (зеркальные копии геометрии): стены с окнами, колонны, утопленные стены 2-го этажа
  for (const s of [1, -1]) {
    const X = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    solid(...X(CORE.x, 12.0), F0, 4.85, 5.75, 6.0);
    solid(...X(CORE.x, 12.0), F0, 4.85, -7.0, -6.75);
    solid(...X(11.75, 12.0), F0, 4.85, -7.0, 6.0);
    for (const [z0, z1] of [[-7.0, -5.4], [-2.4, 1.5], [2.6, 6.0]]) solid(...X(CORE.x, CORE.x + 0.25), F0, 4.85, z0, z1);
    solid(...X(CORE.x, CORE.x + 0.45), F1, 8.6, WING_BACK, -0.6);
    solid(...X(CORE.x, CORE.x + 0.45), F1, 8.6, 0.6, WING_FRONT);
    solid(...X(CORE.x, 15), F1, 9, 5.4, 5.6);       // утопленная стена и стекло к улице
    solid(...X(CORE.x, 15), F1, 9, -6.6, -6.4);     // и к бассейну
    for (const x of [4.25, 7.9, 11.75]) solid(...X(x - 0.25, x + 0.25), F0, 4.85, -7.35, -6.85);
  }

  // ---------- задний двор: бассейн с чашей, настил, газон, детская площадка ----------
  const poolShape = new THREE.Shape();
  poolShape.moveTo(-4.6, 8.15);
  poolShape.lineTo(9.6, 8.15);
  poolShape.splineThru([new THREE.Vector2(9.1, 10.2), new THREE.Vector2(7.0, 12.0), new THREE.Vector2(3.0, 12.9), new THREE.Vector2(-1.2, 12.5), new THREE.Vector2(-3.9, 10.8), new THREE.Vector2(-4.6, 8.15)]);
  const poolPts = poolShape.getPoints(64).map((p) => [p.x, -p.y]);
  const cx = poolPts.reduce((s, p) => s + p[0], 0) / poolPts.length;
  const cz = poolPts.reduce((s, p) => s + p[1], 0) / poolPts.length;
  const copingPts = poolPts.map(([x, z]) => {
    if (Math.abs(z + 8.15) < 0.01) return [x + Math.sign(x - cx) * 0.45, -7.85];
    const dx = x - cx, dz = (z - cz) * 1.8, len = Math.hypot(dx, dz) || 1;
    return [x + (dx / len) * 0.45, z + (dz / len) * 0.45];
  });
  const DEPTH = 1.5, WATER = -0.08;
  ground([[-16.8, -16.3], [16.8, -16.3], [16.8, -7.7], [-16.8, -7.7]], 0.03, M.deck, [copingPts]);
  ground(copingPts, 0.06, M.coping, [poolPts]);
  ground(poolPts, -DEPTH, M.pool);
  { // стенки чаши
    const pos = [];
    for (let i = 0; i < poolPts.length; i++) {
      const [ax, az] = poolPts[i], [bx, bz] = poolPts[(i + 1) % poolPts.length];
      pos.push(ax, -DEPTH, az, bx, -DEPTH, bz, bx, 0.06, bz, ax, -DEPTH, az, bx, 0.06, bz, ax, 0.06, az);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const wallMat = M.pool.clone();
    wallMat.side = THREE.DoubleSide;
    xb.geo(g, wallMat);
  }
  const water = ground(poolPts, WATER, M.water);
  water.renderOrder = 3;
  for (let i = 0; i < 6; i++) { // подводные светильники
    const [px, pz] = poolPts[Math.floor((i + 0.5) * poolPts.length / 6)];
    const k = 0.93;
    const g = new THREE.CircleGeometry(0.12, 16);
    g.lookAt(new THREE.Vector3(cx - px, 0, cz - pz));
    g.translate(cx + (px - cx) * k, -0.45, cz + (pz - cz) * k);
    xb.geo(g, M.poolLight);
  }
  for (const [px, pz] of [[-3.8, -9.0], [8.6, -9.0]]) { // лесенка
    for (const dx of [-0.25, 0.25]) {
      const rail = new THREE.TorusGeometry(0.3, 0.025, 8, 16, Math.PI);
      rail.rotateY(Math.PI / 2);
      rail.translate(px + dx, 0.36, pz - 0.05);
      xb.geo(rail, MI.chrome);
    }
  }
  phys.polys.push({ pts: copingPts.map(([x, z]) => [x - Math.sign(x - cx) * 0.25, z - Math.sign(z - cz) * 0.2]), y0: -2, y1: 3 });
  lights.push({ pos: [cx, -0.3, cz], color: 0x58e6ff, intensity: 18, distance: 14, room: 'yard', set: 'night' });
  ground(rectXZ(-16.6, -6.4, -16.1, -10.6), 0.065, M.grass);
  ground(rectXZ(10.4, 16.6, -11.6, -7.9), 0.065, M.grass);
  // травинки поверх газонов: изогнутая полоска из 4 сегментов, тёмная у земли и светлая к кончику
  function grassField(x0, x1, z0, z1, y, density, skip = []) {
    const pos = [], col = [], idx = [], seg = 4;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, w = 0.5 * (1 - t) * (1 - t * 0.25), bend = 0.28 * t * t;
      pos.push(-w, t, bend, w, t, bend);
      for (let k = 0; k < 2; k++) col.push(0.13 + 0.3 * t, 0.24 + 0.4 * t, 0.05 + 0.12 * t);
      if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const blade = new THREE.BufferGeometry();
    blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    blade.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const nor = new Float32Array(pos.length);
    for (let i = 1; i < nor.length; i += 3) nor[i] = 1; // нормали вверх: травинка светится как газон, без тёмной изнанки
    blade.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    blade.setIndex(idx);
    const total = Math.round((x1 - x0) * (z1 - z0) * density);
    const mesh = new THREE.InstancedMesh(blade, grassMat, total);
    const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    let n = 0;
    for (let i = 0; i < total; i++) {
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
      if (skip.some(([a0, a1, b0, b1]) => x > a0 && x < a1 && z > b0 && z < b1)) continue;
      const h = 0.035 + rnd() * rnd() * 0.09;
      e.set((rnd() - 0.5) * 0.6, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.6);
      mat4.compose(p.set(x, y, z), q.setFromEuler(e), sc.set(0.006 + rnd() * 0.006, h, h));
      mesh.setMatrixAt(n, mat4);
      mesh.setColorAt(n, c.setRGB(0.8 + rnd() * 0.35, 0.82 + rnd() * 0.3, 0.75 + rnd() * 0.25));
      n++;
    }
    mesh.count = n;
    mesh.computeBoundingSphere();
    mesh.userData.noCast = true;
    mesh.userData.grass = n; // просмотрщик на «средней» оставляет треть травинок
    root.add(mesh);
  }
  grassField(-16.6, -6.4, -16.1, -10.6, 0.065, 700, [[-15.7, -8.6, -14.5, -12.7]]);
  grassField(10.4, 16.6, -11.6, -7.9, 0.065, 700);
  walk(-16.8, 16.8, 0.03, -16.3, -7.7);
  // душ у бассейна
  xb.box(10.05, 10.15, 0, 2.3, -8.65, -8.55, MI.chrome);
  xb.box(10.1, 10.6, 2.25, 2.32, -8.65, -8.55, MI.chrome);
  solid(9.95, 10.25, 0, 2.3, -8.75, -8.45);
  // детская площадка: качели и горка
  for (const x of [-15.2, -12.2]) {
    for (const s of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.06, 0.06, 2.55, 10);
      leg.rotateX(s * 0.36);
      leg.translate(x, 1.2, -13.6 + s * 0.45);
      xb.geo(leg, M.play);
    }
  }
  { const beam = new THREE.CylinderGeometry(0.07, 0.07, 3.3, 10); beam.rotateZ(Math.PI / 2); beam.translate(-13.7, 2.38, -13.6); xb.geo(beam, M.play); }
  for (const x of [-14.4, -13.0]) {
    xb.box(x - 0.25, x + 0.25, 0.55, 0.6, -13.75, -13.45, M.alu);
    for (const dx of [-0.2, 0.2]) xb.box(x + dx - 0.01, x + dx + 0.01, 0.6, 2.35, -13.61, -13.59, M.alu);
  }
  xb.box(-11.9, -11.0, 1.35, 1.45, -14.2, -13.0, M.play);
  { const s = new THREE.BoxGeometry(2.6, 0.06, 0.6); s.rotateZ(-0.55); s.translate(-9.95, 0.75, -13.6); xb.geo(s, M.slide); }
  solid(-15.6, -11.0, 0, 2.5, -14.4, -12.8);

  // ---------- двор у дома: боковые проходы, пальмы, пристройка ----------
  ground(rectXZ(12.6, 16.8, -7.7, 6.7), 0.03, M.deck);
  ground(rectXZ(-16.8, -12.6, -7.7, 6.7), 0.03, M.deck);
  ground(rectXZ(15.3, 16.75, -7.6, 6.6), 0.05, M.gravel);
  walk(12.6, 16.8, 0.03, -7.7, 6.7);
  walk(-16.8, -12.6, 0.03, -7.7, 6.7);
  // пальма: ствол с корой, 22 листа с прозрачными листочками
  const frondGeo = (() => {
    const g = new THREE.PlaneGeometry(0.55, 1, 2, 14);
    g.translate(0, 0.5, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), x = pos.getX(i);
      pos.setZ(i, -0.6 * y * y + Math.abs(x) * 0.25);
    }
    g.computeVertexNormals();
    g.rotateX(-Math.PI / 2);
    return g;
  })();
  function palm(x, z, h, lean = 0.06) {
    const rings = Math.max(8, Math.round(h / 0.16));
    const trunk = new THREE.CylinderGeometry(0.13, 0.24, h, 16, rings * 4);
    const tp = trunk.attributes.position, tuv = trunk.attributes.uv;
    for (let i = 0; i < tp.count; i++) { // кольца-рубцы от старых листьев
      const yy = tp.getY(i) + h / 2, k = 1 + 0.075 * Math.pow(Math.abs(Math.sin((yy / h) * rings * Math.PI)), 6);
      tp.setX(i, tp.getX(i) * k);
      tp.setZ(i, tp.getZ(i) * k);
      tuv.setXY(i, tuv.getX(i) * 1.4, yy / 1.0);
    }
    trunk.computeVertexNormals();
    trunk.translate(0, h / 2, 0);
    trunk.rotateZ(lean);
    trunk.translate(x, 0, z);
    const top = new THREE.Vector3(x - Math.sin(lean) * h, Math.cos(lean) * h, z);
    const parts = [trunk];
    const n = 30, size = Math.min(2.7, 1.1 + h * 0.28);
    for (let i = 0; i < n; i++) {
      const f = frondGeo.clone();
      const upper = i % 3 === 0, s = size * (upper ? 0.72 + rnd() * 0.12 : 0.85 + rnd() * 0.2);
      f.scale(s, s, s);
      f.rotateZ((rnd() - 0.5) * 0.5);
      f.rotateX(upper ? -0.45 + rnd() * 0.3 : 0.15 + rnd() * 0.55);
      f.rotateY((i / n) * Math.PI * 2 * 3.0 + rnd() * 0.25);
      f.translate(top.x, top.y - (upper ? 0 : 0.08), top.z);
      parts.push(f);
    }
    for (let i = 0; i < 7; i++) { // основания черешков под кроной
      const g = new THREE.ConeGeometry(0.05, 0.32, 6);
      g.translate(0, 0.16, 0);
      g.rotateX(0.5 + rnd() * 0.4);
      g.rotateY((i / 7) * Math.PI * 2);
      g.translate(top.x, top.y - 0.22, top.z);
      xb.geo(g, M.bark);
    }
    xb.geo(parts[0], M.bark);
    for (const f of parts.slice(1)) xb.geo(f, M.frond);
    solid(x - 0.3, x + 0.3, 0, h, z - 0.3, z + 0.3);
  }
  M.frond.userData.keepUV = true;
  M.bark.userData.keepUV = true;
  for (const z of [-5.5, -1.0, 3.5]) palm(16.0, z, 5.2 + (z > 0 ? 0.6 : 0));
  for (const [x, z] of [[15.9, -6.8], [15.6, 1.2], [15.9, 5.8]]) {
    const g = new THREE.IcosahedronGeometry(0.4, 1);
    g.scale(1, 0.7, 1);
    g.translate(x, 0.3, z);
    xb.geo(g, M.shrub);
  }
  for (const z of [-5.5, -1.0, 3.5]) { // подсветка пальм снизу
    const g = new THREE.CircleGeometry(0.1, 12);
    g.rotateX(-Math.PI / 2);
    g.translate(15.6, 0.07, z);
    xb.geo(g, M.lampHead);
  }
  lights.push({ pos: [15.4, 1.5, -1.0], color: 0xffd7a0, intensity: 6, distance: 9, room: 'yard', set: 'night' });
  // пристройка: закрытая кухня и комната водителя
  xb.box(12.2, 16.6, 0, 3.3, -16.25, -12.5, M.plaster);
  xb.box(12.1, 16.7, 3.3, 3.45, -16.35, -12.4, M.frame);
  xb.box(13.2, 14.2, 0, 2.4, -12.5, -12.44, M.door);
  windowZ(xb, 14.8, 16.2, 1.1, 2.5, -12.5, 2, 1, 1, root);
  solid(12.2, 16.6, 0, 3.3, -16.25, -12.5);
  // пальма в кашпо у входа
  palm(2.9, 5.6, 4.6, 0.04);
  xb.box(2.3, 3.5, PODIUM, PODIUM + 0.55, 5.0, 6.2, M.alu);
  solid(2.3, 3.5, PODIUM, PODIUM + 0.55, 5.0, 6.2);

  // ---------- передний двор и ограда с ламелями ----------
  ground(rectXZ(-16.8, 16.8, 6.7, 16.3), 0.03, M.pavers);
  ground(rectXZ(-2.3, 2.3, 8.45, 16.3), 0.04, M.deck);
  walk(-16.8, 16.8, 0.03, 6.7, 16.3);
  for (const x of [-6.5, -3.4, 3.4, 6.5]) { // столбики подсветки у дорожки
    xb.box(x - 0.08, x + 0.08, 0.03, 0.75, 11.6, 11.76, M.alu);
    xb.box(x - 0.07, x + 0.07, 0.55, 0.68, 11.75, 11.77, M.lampHead);
  }
  // машины для масштаба: 5 мест внутри и 5 снаружи по объявлению
  function car(x, z, rot, color) { // кузов по боковому профилю со скруглением, стеклянная кабина, колёса с дисками
    const g = new THREE.Group();
    const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 });
    const extrude = (pts, width, mat, bevel = 0.06) => {
      const geo = new THREE.ExtrudeGeometry(toShape(pts), { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6 });
      geo.translate(0, 0, -width / 2);
      const m = new THREE.Mesh(geo, mat);
      g.add(m);
      return m;
    };
    extrude([[-2.3, 0.32], [2.28, 0.32], [2.36, 0.62], [2.2, 0.8], [0.95, 0.92], [-1.85, 0.98], [-2.32, 0.86]], 1.7, paint, 0.08);
    const cabin = extrude([[0.9, 0.9], [0.3, 1.38], [-1.05, 1.42], [-1.8, 0.96]], 1.5, M.carGlass, 0.05);
    cabin.renderOrder = 2;
    extrude([[0.25, 1.38], [-1.0, 1.42], [-1.02, 1.47], [0.2, 1.43]], 1.48, paint, 0.03);
    for (const wx of [-1.45, 1.5]) for (const wz of [-0.86, 0.86]) {
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 12, 28), M.tyre);
      tyre.position.set(wx, 0.4, wz);
      g.add(tyre);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 20), M.rim);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(wx, 0.4, wz * 1.02);
      g.add(rim);
    }
    for (const wz of [-0.6, 0.6]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.42), M.carLight);
      head.position.set(2.36, 0.68, wz);
      g.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.5), M.carTail);
      tail.position.set(-2.38, 0.8, wz);
      g.add(tail);
    }
    g.position.set(x, 0.03, z);
    g.rotation.y = rot;
    add(g);
    const along = Math.abs(Math.sin(rot)) > 0.5;
    solid(x - (along ? 0.95 : 2.4), x + (along ? 0.95 : 2.4), 0, 1.6, z - (along ? 2.4 : 0.95), z + (along ? 2.4 : 0.95));
  }
  car(-9.3, 11.6, Math.PI / 2, 0xf2f2f0);
  car(9.1, 11.4, Math.PI / 2, 0x202326);
  car(-3.9, 21.8, Math.PI / 2, 0xb7bcc2);
  const H = 2.65;
  function fence(axis, a0, a1, at, gates) { // ограда: основание, столбы, ламели 4 см с зазором 3 см
    const segs = [];
    let cur = a0;
    for (const [g0, g1] of gates) { segs.push([cur, g0, false]); segs.push([g0, g1, true]); cur = g1; }
    segs.push([cur, a1, false]);
    const box = (p0, p1, y0, y1, t0, t1, mat) => (axis === 'x' ? xb.box(p0, p1, y0, y1, t0, t1, mat) : xb.box(t0, t1, y0, y1, p0, p1, mat));
    for (const [s0, s1, gate] of segs) {
      if (s1 - s0 < 0.05) continue;
      const pieces = gate ? 1 : Math.max(1, Math.round((s1 - s0) / 4.5));
      for (let k = 0; k < pieces; k++) {
        const p0 = s0 + ((s1 - s0) * k) / pieces, p1 = s0 + ((s1 - s0) * (k + 1)) / pieces;
        const yb = gate ? 0.03 : 0.9;
        if (!gate) box(p0, p1, 0, 0.9, at - 0.17, at + 0.17, M.plaster);
        for (let p = p0 + 0.3; p < p1 - 0.3; p += 0.07) box(p, p + 0.04, yb, H - 0.15, at - 0.04, at + 0.04, M.fence);
        box(p0 + 0.25, p1 - 0.25, H - 0.17, H - 0.12, at - 0.05, at + 0.05, M.fence);
        box(p0 - 0.28, p0 + 0.28, 0, H, at - 0.28, at + 0.28, M.frame);
      }
    }
    box(a1 - 0.28, a1 + 0.28, 0, H, at - 0.28, at + 0.28, M.frame);
    if (axis === 'x') solid(a0, a1, 0, H, at - 0.3, at + 0.3); else solid(at - 0.3, at + 0.3, 0, H, a0, a1);
  }
  fence('x', -16.8, 16.8, 16.5, [[-12.0, -6.6], [-2.0, -0.7], [6.6, 11.6]]); // главная улица: въезды и калитка
  fence('z', -16.5, 16.5, 16.8, []);                                       // боковая улица
  xb.box(-17.0, -16.6, 0, 3.0, -16.5, 16.5, M.plaster);                    // глухие стены к соседям
  xb.box(-17.0, 16.6, 0, 3.0, -16.75, -16.35, M.plaster);
  solid(-17.0, -16.6, 0, 3.0, -16.5, 16.5);
  solid(-17.0, 16.6, 0, 3.0, -16.75, -16.35);

  // ---------- земля, улицы, соседи ----------
  { // песок вокруг; под бассейном — проём, чтобы видеть чашу
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 700, 0, Math.PI * 2, false);
    shape.holes.push(toPath(poolPts.map(([x, z]) => [x, -z])));
    const g = new THREE.ShapeGeometry(shape, 64);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
    const m = new THREE.Mesh(g, M.sand);
    m.position.y = -0.01;
    m.userData.noCast = true;
    m.receiveShadow = true;
    add(m);
  }
  walk(-700, 700, 0, -700, 700);
  ground(rectXZ(-90, 28, 19.2, 33), 0.012, M.asphalt);
  ground(rectXZ(19.6, 28, -90, 33), 0.014, M.asphalt);
  xb.box(-90, 19.6, 0, 0.14, 16.75, 19.2, M.coping);
  xb.box(17.05, 19.6, 0, 0.14, -90, 16.75, M.coping);
  walk(-90, 19.6, 0.14, 16.75, 19.2);
  walk(17.05, 19.6, 0.14, -90, 16.75);
  ground(rectXZ(-9.4, 4.4, 19.2, 24.4), 0.03, M.pavers);
  for (let i = 0; i <= 5; i++) xb.box(-9.4 + i * 2.76 - 0.06, -9.4 + i * 2.76 + 0.06, 0.03, 0.045, 19.3, 24.3, M.paint);
  for (let x = -86; x < 18; x += 6) xb.box(x, x + 3, 0.014, 0.024, 28.15, 28.3, M.paint);
  for (let z = -86; z < 18; z += 6) xb.box(23.7, 23.85, 0.016, 0.026, z, z + 3, M.paint);
  ground(rectXZ(5.2, 7.4, 17.2, 18.8), 0.15, M.gravel);
  ground(rectXZ(10.2, 12.4, 17.2, 18.8), 0.15, M.gravel);
  palm(6.3, 18.0, 1.4, 0.02);
  palm(11.3, 18.0, 1.4, 0.02);
  function lamp(x, z, rot) {
    const pole = new THREE.CylinderGeometry(0.06, 0.09, 8, 10);
    pole.translate(x, 4, z);
    xb.geo(pole, M.lamp);
    const dx = Math.cos(rot), dz = -Math.sin(rot);
    const arm = new THREE.BoxGeometry(1.45, 0.1, 0.1);
    arm.rotateY(rot);
    arm.translate(x + dx * 0.7, 7.9, z + dz * 0.7);
    xb.geo(arm, M.lamp);
    const head = new THREE.BoxGeometry(0.5, 0.06, 0.3);
    head.rotateY(rot);
    head.translate(x + dx * 1.35, 7.82, z + dz * 1.35);
    xb.geo(head, M.lampHead);
    solid(x - 0.15, x + 0.15, 0, 8, z - 0.15, z + 0.15);
  }
  for (const x of [-38, -20, -4, 12]) lamp(x, 18.8, -Math.PI / 2);
  for (const z of [-40, -22, -4]) lamp(19.1, z, 0);
  lights.push({ pos: [12, 7.2, 20.2], color: 0xffd9a8, intensity: 30, distance: 22, room: 'street', set: 'night' });
  function neighbor(x0, x1, h, z0, z1) {
    xb.box(x0, x1, 0, h, z0, z1, M.neighbor);
    xb.box(x0 - 0.3, x1 + 0.3, h, h + 0.6, z0 - 0.3, z1 + 0.3, M.neighbor);
    for (let x = x0 + 1.5; x < x1 - 2; x += 3.2) {
      for (const [y0, y1] of [[1.2, 3.2], [h - 3.4, h - 1.2]]) {
        xb.box(x, x + 1.8, y0, y1, z0 - 0.03, z0, M.neighborGlass);
        xb.box(x, x + 1.8, y0, y1, z1, z1 + 0.03, M.neighborGlass);
      }
    }
    solid(x0, x1, 0, h, z0, z1);
  }
  neighbor(-44, -21, 8.2, -12, 9);
  neighbor(-6, 16, 7.6, -50, -33);
  neighbor(36, 58, 7.5, -30, -6);
  neighbor(-70, -50, 9.0, 40, 60);
  neighbor(40, 66, 11, 44, 70);

  // =====================================================================================================
  // ---------- интерьер (планировка как в пустом доме на фото) ----------
  const interior = new THREE.Group();
  interior.name = 'interior';
  add(interior);
  const VX = 2.3, VZ = -2.0;
  const W1 = CORE.x + 0.45;
  const LZ = 10.95;
  const slantX = (y) => J[0] + (y - J[1]) * (K[0] - J[0]) / (K[1] - J[1]);
  const SX = slantX(F1);
  const sx = (s, a, b) => (s > 0 ? [a, b] : [-b, -a]);
  function floorAt(x0, x1, z0, z1, y, mat = MI.floor, batch = ib) {
    batch.box(x0, x1, y, y + 0.012, z0, z1, mat);
    walk(x0, x1, y + 0.012, z0, z1);
  }
  function downlights(x0, x1, z0, z1, y, step = 1.7, batch = ib) {
    const nx = Math.max(1, Math.round((x1 - x0) / step)), nz = Math.max(1, Math.round((z1 - z0) / step));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const g = new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16);
      g.translate(x0 + (i + 0.5) * (x1 - x0) / nx, y - 0.004, z0 + (j + 0.5) * (z1 - z0) / nz);
      batch.geo(g, MI.downlight);
    }
  }
  function ceiling(x0, x1, z0, z1, y, tray = 0) {
    if (!tray) {
      ib.box(x0, x1, y, y + 0.04, z0, z1, MI.ceiling);
      downlights(x0 + 0.3, x1 - 0.3, z0 + 0.3, z1 - 0.3, y);
      return;
    }
    const d = tray, ty = y + 0.2;
    ib.box(x0, x1, y, y + 0.04, z0, z0 + d, MI.ceiling);
    ib.box(x0, x1, y, y + 0.04, z1 - d, z1, MI.ceiling);
    ib.box(x0, x0 + d, y, y + 0.04, z0 + d, z1 - d, MI.ceiling);
    ib.box(x1 - d, x1, y, y + 0.04, z0 + d, z1 - d, MI.ceiling);
    ib.box(x0 + d, x1 - d, ty, ty + 0.04, z0 + d, z1 - d, MI.ceiling);
    for (const [a, b, c, e] of [[x0 + d, x1 - d, z0 + d, z0 + d + 0.03], [x0 + d, x1 - d, z1 - d - 0.03, z1 - d], [x0 + d, x0 + d + 0.03, z0 + d, z1 - d], [x1 - d - 0.03, x1 - d, z0 + d, z1 - d]]) {
      ib.box(a, b, y + 0.04, ty, c, e, MI.ceiling);
    }
    const g = 0.09;
    for (const [a, b, c, e] of [[x0 + d - g, x1 - d + g, z0 + d - g, z0 + d - g + 0.03], [x0 + d - g, x1 - d + g, z1 - d + g - 0.03, z1 - d + g], [x0 + d - g, x0 + d - g + 0.03, z0 + d - g, z1 - d + g], [x1 - d + g - 0.03, x1 - d + g, z0 + d - g, z1 - d + g]]) {
      ib.box(a, b, y + 0.05, y + 0.07, c, e, MI.led);
    }
    downlights(x0 + d / 2 - 0.3, x1 - d / 2 + 0.3, z0 + d / 2 - 0.3, z0 + d / 2 + 0.3, y, 1.9);
    downlights(x0 + d / 2 - 0.3, x1 - d / 2 + 0.3, z1 - d / 2 - 0.3, z1 - d / 2 + 0.3, y, 1.9);
  }
  const slot = (x0, x1, z0, z1, y) => ib.box(x0, x1, y - 0.012, y, z0, z1, MI.slot);
  // «у стены»: u — вдоль стены, v — расстояние от стены в комнату (n — куда смотрит грань стены)
  function onWall(along, at, n, batch = ib) {
    return {
      box(u0, u1, y0, y1, v0, v1, mat, collide = false) {
        const a = at + n * v0, b = at + n * v1;
        const t0 = Math.min(a, b), t1 = Math.max(a, b);
        if (along === 'x') { batch.box(u0, u1, y0, y1, t0, t1, mat); if (collide) solid(u0, u1, y0, y1, t0, t1); }
        else { batch.box(t0, t1, y0, y1, u0, u1, mat); if (collide) solid(t0, t1, y0, y1, u0, u1); }
      },
      at(u, v) { return along === 'x' ? [u, at + n * v] : [at + n * v, u]; },
      yaw: along === 'x' ? (n > 0 ? 0 : Math.PI) : (n > 0 ? Math.PI / 2 : -Math.PI / 2),
      batch
    };
  }
  function placed(geo, w, u, y, v, mat) {
    geo.rotateY(w.yaw);
    const [x, z] = w.at(u, v);
    geo.translate(x, y, z);
    w.batch.geo(geo, mat);
  }
  function sconce(w, u, y) { // настенный светильник «вверх-вниз»
    w.box(u - 0.06, u + 0.06, y - 0.07, y + 0.07, 0, 0.08, M.alu);
    w.box(u - 0.045, u + 0.045, y + 0.07, y + 0.075, 0.015, 0.065, MI.downlight);
    w.box(u - 0.045, u + 0.045, y - 0.075, y - 0.07, 0.015, 0.065, MI.downlight);
  }
  function doorway(along, a0, a1, y0, h, t0, t1, swing, hinge = 0) { // наличники и открытая створка
    const w = 0.07, p = 0.015;
    const put = (aa0, aa1, yy0, yy1, tt0, tt1) => (along === 'x' ? ib.box(aa0, aa1, yy0, yy1, tt0, tt1, MI.walnut) : ib.box(tt0, tt1, yy0, yy1, aa0, aa1, MI.walnut));
    for (const [tt0, tt1] of [[t0 - p, t0], [t1, t1 + p]]) {
      put(a0 - w, a0, y0, y0 + h + w, tt0, tt1);
      put(a1, a1 + w, y0, y0 + h + w, tt0, tt1);
      put(a0 - w, a1 + w, y0 + h, y0 + h + w, tt0, tt1);
    }
    put(a0, a0 + 0.02, y0, y0 + h, t0, t1);
    put(a1 - 0.02, a1, y0, y0 + h, t0, t1);
    put(a0, a1, y0 + h - 0.02, y0 + h, t0, t1);
    if (!swing) return;
    const width = a1 - a0 - 0.05, th = 0.045;
    const ah = hinge === 0 ? a0 + 0.025 : a1 - 0.025 - th;
    const face = swing > 0 ? t1 : t0;
    const tA = swing > 0 ? face : face - width, tB = swing > 0 ? face + width : face;
    put(ah, ah + th, y0 + 0.01, y0 + h - 0.03, tA, tB);
    if (along === 'x') solid(ah, ah + th, y0, y0 + h, tA, tB); else solid(tA, tB, y0, y0 + h, ah, ah + th);
    // ручки-рычаги с обеих сторон створки у свободного края
    const tf = swing > 0 ? tB - 0.07 : tA + 0.07, dir = swing > 0 ? -1 : 1, hy = y0 + 1.0;
    const metal = (aa0, aa1, yy0, yy1, tt0, tt1) => (along === 'x' ? ib.box(aa0, aa1, yy0, yy1, Math.min(tt0, tt1), Math.max(tt0, tt1), MI.chrome)
      : ib.box(Math.min(tt0, tt1), Math.max(tt0, tt1), yy0, yy1, aa0, aa1, MI.chrome));
    for (const [s0, s1] of [[ah - 0.055, ah], [ah + th, ah + th + 0.055]]) {
      const o = s0 < ah ? s0 : s1 - 0.012;
      metal(s0 < ah ? ah - 0.008 : ah + th, s0 < ah ? ah : ah + th + 0.008, hy - 0.035, hy + 0.035, tf - 0.025, tf + 0.025);
      metal(Math.min(o, o + 0.012), Math.max(o, o + 0.012), hy - 0.01, hy + 0.01, tf, tf + dir * 0.13);
      metal(s0 < ah ? ah - 0.05 : ah + th, s0 < ah ? ah : ah + th + 0.05, hy - 0.009, hy + 0.009, tf - 0.009, tf + 0.009);
    }
    // выключатель у проёма со стороны, противоположной петлям, на обеих гранях стены
    const sa = hinge === 0 ? a1 + 0.2 : a0 - 0.2;
    for (const [c0, c1] of [[t0 - 0.008, t0], [t1, t1 + 0.008]]) {
      if (along === 'x') ib.box(sa - 0.045, sa + 0.045, y0 + 1.06, y0 + 1.15, c0, c1, MI.plate); else ib.box(c0, c1, y0 + 1.06, y0 + 1.15, sa - 0.045, sa + 0.045, MI.plate);
    }
  }
  function partition(s, along, a0, a1, t0, t1, y0, y1, doors = [], h = 2.4) {
    let A = [a0, a1], T = [t0, t1], D = doors;
    if (s < 0) {
      if (along === 'x') { A = sx(s, a0, a1); D = doors.map(([d0, d1, sw = 1, hi = 0]) => [-d1, -d0, sw, 1 - hi]); }
      else { T = sx(s, t0, t1); D = doors.map(([d0, d1, sw = 1, hi = 0]) => [d0, d1, -sw, hi]); }
    }
    wall(ib, along, A[0], A[1], y0, y1, T[0], T[1], D.map(([d0, d1]) => [d0, d1, y0, y0 + h, true]), MI.wall);
    for (const [d0, d1, sw = 1, hi = 0] of D) doorway(along, d0, d1, y0, h, T[0], T[1], sw, hi);
  }
  function slantPartition(s, t0, t1, doors = []) {
    partition(s, 'x', LZ - 0.2, SX, t0, t1, F1, C1, doors);
    const pts = [[SX, F1], [slantX(C1), C1], [SX, C1]].map(([x, y]) => [s * x, y]);
    const g = new THREE.ExtrudeGeometry(toShape(pts), { depth: t1 - t0, bevelEnabled: false });
    g.translate(0, 0, t0);
    ib.geo(g, MI.wall);
  }
  function clad(w, u0, u1, y0, y1) { w.box(u0, u1, y0, y1, 0, 0.015, MI.stoneDark); }
  function wardrobe(w, u0, u1, y0, depth = 0.6, h = 2.8) {
    w.box(u0, u1, y0, y0 + h, 0, depth, MI.oak, true);
    for (let u = u0 + 0.6; u < u1 - 0.1; u += 0.6) w.box(u - 0.006, u + 0.006, y0 + 0.05, y0 + h - 0.05, depth, depth + 0.004, MI.slot);
  }
  function vanity(w, u0, u1, y0, sinks = 1) {
    w.box(u0, u1, y0 + 0.62, y0 + 0.8, 0, 0.55, MI.oak, true);
    w.box(u0, u1, y0 + 0.8, y0 + 0.83, 0, 0.56, MI.stoneLight);
    w.box(u0 + 0.05, u1 - 0.05, y0 + 1.15, y0 + 2.15, 0.015, 0.03, MI.mirror);
    for (let k = 0; k < sinks; k++) {
      const u = u0 + ((k + 0.5) * (u1 - u0)) / sinks;
      const bowl = new THREE.LatheGeometry([[0.02, 0], [0.15, 0.005], [0.2, 0.06], [0.215, 0.14], [0.2, 0.14], [0.18, 0.07], [0.03, 0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
      placed(bowl, w, u, y0 + 0.83, 0.3, MI.porcelain);
      placed(new THREE.CylinderGeometry(0.016, 0.016, 0.34, 10), w, u, y0 + 1.0, 0.07, MI.chrome);
      w.box(u - 0.014, u + 0.014, y0 + 1.15, y0 + 1.178, 0.07, 0.2, MI.chrome);
    }
  }
  function toilet(w, u, y0) {
    const bowl = new THREE.SphereGeometry(0.2, 22, 14);
    bowl.scale(0.95, 0.75, 1.45);
    placed(bowl, w, u, y0 + 0.4, 0.3, MI.porcelain);
    w.box(u - 0.18, u + 0.18, y0 + 0.3, y0 + 0.5, 0, 0.1, MI.porcelain, true);
    w.box(u - 0.12, u + 0.12, y0 + 1.0, y0 + 1.16, 0, 0.012, MI.chrome);
  }
  function showerHead(w, u, y0) {
    w.box(u - 0.015, u + 0.015, y0 + 2.2, y0 + 2.23, 0, 0.35, MI.chrome);
    placed(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 28), w, u, y0 + 2.2, 0.35, MI.chrome);
    w.box(u - 0.08, u + 0.08, y0 + 1.0, y0 + 1.14, 0, 0.05, MI.chrome);
  }
  function tub(x, z, y0, alongZ) {
    const prof = [[0, 0], [0.33, 0], [0.4, 0.5], [0.41, 0.58], [0.37, 0.58], [0.34, 0.12], [0, 0.1]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 40);
    g.scale(alongZ ? 1 : 2.1, 1, alongZ ? 2.1 : 1);
    g.translate(x, y0, z);
    ib.geo(g, MI.porcelain);
    const filler = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 10);
    filler.translate(alongZ ? x + 0.55 : x, y0 + 0.5, alongZ ? z : z + 0.55);
    ib.geo(filler, MI.chrome);
    solid(x - (alongZ ? 0.42 : 0.88), x + (alongZ ? 0.42 : 0.88), y0, y0 + 0.58, z - (alongZ ? 0.88 : 0.42), z + (alongZ ? 0.88 : 0.42));
  }
  function glassPanel(along, a0, a1, at, y0, h = 2.0, collide = true) {
    if (along === 'x') { ib.box(a0, a1, y0, y0 + h, at - 0.006, at + 0.006, MI.glass); if (collide) solid(a0, a1, y0, y0 + h, at - 0.02, at + 0.02); }
    else { ib.box(at - 0.006, at + 0.006, y0, y0 + h, a0, a1, MI.glass); if (collide) solid(at - 0.02, at + 0.02, y0, y0 + h, a0, a1); }
  }
  function railing(along, a0, a1, at, y0) {
    glassPanel(along, a0, a1, at, y0 + 0.05, 1.0);
    if (along === 'x') {
      ib.box(a0, a1, y0, y0 + 0.07, at - 0.03, at + 0.03, M.alu);
      ib.box(a0, a1, y0 + 1.05, y0 + 1.065, at - 0.012, at + 0.012, M.alu);
    } else {
      ib.box(at - 0.03, at + 0.03, y0, y0 + 0.07, a0, a1, M.alu);
      ib.box(at - 0.012, at + 0.012, y0 + 1.05, y0 + 1.065, a0, a1, M.alu);
    }
  }

  // ----- холл: полы, галереи, малая гостиная над холлом у бассейна -----
  floorAt(-IN, IN, CORE.back + 0.25, CORE.front - 0.25, F0);
  ib.box(-IN, IN, CG, F1, CORE.back + 0.25, VZ, MI.ceiling);
  floorAt(-IN, IN, CORE.back + 0.25, VZ, F1, MI.floor1);
  for (const s of [1, -1]) {
    ib.box(...sx(s, VX, IN), CG, F1, VZ, CORE.front - 0.25, MI.ceiling);
    floorAt(...sx(s, VX, IN), VZ, CORE.front - 0.25, F1, MI.floor1);
    downlights(...sx(s, VX + 0.2, IN - 0.2), VZ + 0.4, CORE.front - 0.6, CG, 1.8);
  }
  downlights(-IN + 0.4, IN - 0.4, CORE.back + 0.6, VZ - 0.3, CG, 1.9);
  railing('z', VZ, -0.55, -VX, F1);
  railing('z', 0.75, CORE.front - 0.25, -VX, F1);
  railing('z', VZ, CORE.front - 0.25, VX, F1);
  railing('x', -VX, VX, VZ, F1);
  ib.box(-IN, IN, CC, CC + 0.05, CORE.back + 0.25, CORE.front - 0.25, MI.ceiling);
  for (const [a, b, c, e] of [[-IN, IN, CORE.back + 0.25, CORE.back + 0.29], [-IN, IN, CORE.front - 0.29, CORE.front - 0.25], [-IN, -IN + 0.04, CORE.back + 0.25, CORE.front - 0.25], [IN - 0.04, IN, CORE.back + 0.25, CORE.front - 0.25]]) {
    ib.box(a, b, CC - 0.03, CC, c, e, MI.led);
  }
  downlights(-IN + 0.5, IN - 0.5, CORE.back + 0.6, CORE.front - 0.6, CC, 2.0);
  slot(-1.2, 1.2, 3.6, 3.72, CC);
  slot(-1.2, 1.2, -5.1, -4.98, CC);
  const coreFront = onWall('x', CORE.front - 0.25, -1);
  for (const u of [-2.45, 2.45]) sconce(coreFront, u, F0 + 1.85);
  for (const s of [1, -1]) {
    const side = onWall('z', s * IN, -s);
    sconce(side, 3.5, F0 + 1.85);
    sconce(side, -1.3, F0 + 1.85);
    sconce(side, 2.6, F1 + 1.85);
    if (s > 0) sconce(side, -3.9, F1 + 1.85);
    doorway('z', 1.5, 2.6, F0, 2.3, ...sx(s, IN, CORE.x + 0.25), -s, 1);
    doorway('z', -0.6, 0.6, F1, 2.4, ...sx(s, IN, W1), 0);
  }
  const pantry = onWall('z', -IN, 1);
  pantry.box(-5.4, -2.6, F1, F1 + 0.86, 0, 0.6, MI.oak, true);
  pantry.box(-5.4, -2.6, F1 + 0.86, F1 + 0.9, 0, 0.62, MI.stoneLight);
  pantry.box(-4.3, -3.7, F1 + 0.88, F1 + 0.905, 0.15, 0.47, M.alu);
  pantry.box(-5.4, -2.6, F1 + 0.9, F1 + 2.2, 0, 0.02, MI.stoneLight);
  pantry.box(-4.02, -3.98, F1 + 0.9, F1 + 1.25, 0.05, 0.09, M.alu);
  pantry.box(-4.02, -3.98, F1 + 1.21, F1 + 1.25, 0.09, 0.28, M.alu);

  // ----- П-образная лестница: 26 подъёмов, марши поперёк холла, площадка у правой галереи -----
  const RISE = (F1 - F0) / 26, RUN = 0.26, XS = -2.25, XL = XS + 12 * RUN, T = 0.3;
  const ZA = [-1.95, -0.65], ZB = [-0.55, 0.75];
  const flightA = [[XS, F0]];
  for (let i = 1; i <= 12; i++) flightA.push([XS + (i - 1) * RUN, F0 + i * RISE], [XS + i * RUN, F0 + i * RISE]);
  flightA.push([XL, F0 + 12 * RISE - T], [XS + T * RUN / RISE, F0]);
  const flightB = [[XL, F0 + 13 * RISE - T], [XL, F0 + 13 * RISE]];
  for (let j = 1; j <= 12; j++) flightB.push([XL - (j - 1) * RUN, F0 + (13 + j) * RISE], [XL - j * RUN, F0 + (13 + j) * RISE]);
  flightB.push([XS, F0 + 25 * RISE - T]);
  for (const [pts, [z0, z1]] of [[flightA, ZA], [flightB, ZB]]) prism(ib, pts, z0, z1, MI.wall);
  for (let i = 1; i <= 12; i++) {
    const a = XS + (i - 1) * RUN, top = F0 + i * RISE;
    ib.box(a - 0.02, a + RUN, top - 0.005, top + 0.025, ZA[0], ZA[1], MI.tread);
    ib.box(a - 0.004, a, top - RISE, top - 0.005, ZA[0] + 0.02, ZA[1] - 0.02, MI.riser);
    walk(a - 0.02, a + RUN, top + 0.025, ZA[0], ZA[1]);
    solid(a, a + RUN, F0, top - 0.3, ZA[0], ZA[1]);
    const b = XL - i * RUN, topB = F0 + (13 + i) * RISE;
    ib.box(b, b + RUN + 0.02, topB - 0.005, topB + 0.025, ZB[0], ZB[1], MI.tread);
    ib.box(b + RUN, b + RUN + 0.004, topB - RISE, topB - 0.005, ZB[0] + 0.02, ZB[1] - 0.02, MI.riser);
    walk(b, b + RUN + 0.02, topB + 0.025, ZB[0], ZB[1]);
    solid(b, b + RUN, F0, topB - 0.3, ZB[0], ZB[1]);
  }
  const landingTop = F0 + 13 * RISE;
  ib.box(XL, VX - 0.05, landingTop - T, landingTop, ZA[0], ZB[1], MI.wall);
  ib.box(XL, VX - 0.05, landingTop, landingTop + 0.025, ZA[0], ZB[1], MI.tread);
  ib.box(XL - 0.004, XL, F0 + 12 * RISE, landingTop - 0.005, ZA[0] + 0.02, ZA[1] - 0.02, MI.riser);
  walk(XL, VX - 0.05, landingTop + 0.025, ZA[0], ZB[1]);
  solid(XL, VX - 0.05, F0, landingTop - 0.3, ZA[0], ZB[1]);
  solid(XS - 0.02, XL, F0, F1, ZA[1], ZB[0]); // промежуток между маршами
  const sloped = (x0, y0, x1, y1, z) => {
    const g = new THREE.ExtrudeGeometry(toShape([[x0, y0], [x1, y1], [x1, y1 + 1.0], [x0, y0 + 1.0]]), { depth: 0.012, bevelEnabled: false });
    g.translate(0, 0, z);
    ib.geo(g, MI.glass);
  };
  sloped(XS, F0 + RISE - 0.1, XL, F0 + 12 * RISE - 0.1, ZA[0] - 0.02);
  sloped(XL, F0 + 14 * RISE - 0.1, XS, F0 + 25 * RISE - 0.1, ZB[1] + 0.008);
  sloped(XL, F0 + 14 * RISE - 0.1, XS, F0 + 25 * RISE - 0.1, ZB[0] - 0.012);
  solid(XS, XL, F0, F1 + 1.1, ZA[0] - 0.04, ZA[0] - 0.005);
  solid(XS, XL, F0, F1 + 1.1, ZB[1] + 0.005, ZB[1] + 0.04);
  glassPanel('x', XL, VX - 0.05, ZA[0] - 0.014, landingTop, 1.05);
  glassPanel('x', XL, VX - 0.05, ZB[1] + 0.014, landingTop, 1.05);
  glassPanel('z', ZA[0], ZB[1], VX - 0.04, landingTop, 1.05);

  // ----- крылья, 1-й этаж -----
  for (const s of [1, -1]) {
    const X = (a, b) => sx(s, a, b);
    floorAt(...X(4.25, 11.75), -6.75, 0.55, F0);
    ceiling(...X(4.25, 11.75), -6.75, 0.55, CG, 1.0);
    slot(...X(5.0, 11.0), -6.2, -6.08, CG);
    const hallWall = onWall('z', s * 4.25, s);
    sconce(hallWall, -1.1, F0 + 1.85);
    sconce(hallWall, -6.1, F0 + 1.85);
    partition(s, 'x', 4.25, 11.75, 0.55, 0.75, F0, 4.85, s > 0 ? [[4.5, 5.6, 1, 0], [9.5, 10.4, 1, 1]] : [[4.5, 5.6, 1, 0]]);
    floorAt(...X(4.25, 5.95), 0.75, 5.75, F0);
    ceiling(...X(4.25, 5.95), 0.75, 5.75, CGB);
  }
  // правое крыло: прачечная и кладовая, санузел и комната прислуги
  partition(1, 'z', 0.75, 5.75, 5.95, 6.1, F0, 4.85, [[1.3, 2.2, 1, 0]]);
  partition(1, 'x', 6.1, 8.45, 2.85, 3.0, F0, 4.85);
  partition(1, 'z', 0.75, 5.75, 8.45, 8.6, F0, 4.85, [[3.6, 4.4, -1, 1]]);
  floorAt(6.1, 8.45, 0.75, 2.85, F0, MI.floorBath);
  ceiling(6.1, 8.45, 0.75, 2.85, CGB);
  const laundry = onWall('z', 8.45, -1);
  for (const [u0, u1] of [[0.95, 1.55], [1.6, 2.2]]) {
    laundry.box(u0, u1, F0, F0 + 0.85, 0, 0.6, MI.porcelain, true);
    placed(new THREE.CircleGeometry(0.2, 28), laundry, (u0 + u1) / 2, F0 + 0.45, 0.605, M.alu);
  }
  wardrobe(onWall('x', 0.75, 1), 6.2, 8.35, F0, 0.5, 2.6);
  floorAt(6.1, 8.45, 3.0, 5.75, F0, MI.floorBath);
  ceiling(6.1, 8.45, 3.0, 5.75, CGB);
  const maidBath = { vanity: onWall('x', 3.0, 1), toilet: onWall('z', 6.1, 1) };
  vanity(maidBath.vanity, 6.4, 7.4, F0);
  toilet(maidBath.toilet, 4.3, F0);
  showerHead(maidBath.toilet, 5.3, F0);
  glassPanel('x', 6.1, 7.3, 4.85, F0);
  clad(maidBath.toilet, 3.0, 5.75, F0, CGB);
  floorAt(8.6, 11.75, 0.75, 5.75, F0, MI.floorRoom);
  ceiling(8.6, 11.75, 0.75, 5.75, CGB);
  wardrobe(onWall('z', 11.75, -1), 1.0, 3.4, F0);
  sconce(onWall('x', 0.75, 1), 11.1, F0 + 1.7);
  // левое крыло: гостевая спальня с санузлом
  partition(-1, 'z', 0.75, 5.75, 5.95, 6.1, F0, 4.85, [[1.2, 2.1, 1, 0]]);
  partition(1, 'x', -8.6, -6.1, 2.85, 3.0, F0, 4.85, [[-7.9, -7.0, -1, 0]]);
  partition(1, 'z', 3.0, 5.75, -8.6, -8.45, F0, 4.85);
  floorAt(-11.75, -6.1, 0.75, 2.85, F0, MI.floorRoom);
  floorAt(-11.75, -8.6, 2.85, 5.75, F0, MI.floorRoom);
  ceiling(-11.75, -6.1, 0.75, 5.75, CGB);
  wardrobe(onWall('z', -11.75, 1), 1.0, 5.4, F0);
  const guestHead = onWall('x', 0.75, 1);
  sconce(guestHead, -10.9, F0 + 1.1);
  sconce(guestHead, -8.3, F0 + 1.1);
  slot(-10.6, -9.0, 5.1, 5.22, CGB);
  floorAt(-8.45, -6.1, 3.0, 5.75, F0, MI.floorBath);
  const guestBath = { vanity: onWall('z', -8.45, 1), toilet: onWall('z', -6.1, -1) };
  vanity(guestBath.vanity, 3.3, 4.6, F0);
  toilet(guestBath.toilet, 3.9, F0);
  showerHead(guestBath.vanity, 5.3, F0);
  glassPanel('x', -8.45, -7.2, 4.85, F0);
  clad(guestBath.vanity, 3.0, 5.75, F0, CGB);
  clad(guestBath.toilet, 3.0, 5.75, F0, CGB);

  // ----- крылья, 2-й этаж -----
  for (const s of [1, -1]) {
    const X = (a, b) => sx(s, a, b);
    ib.box(...X(W1, slantX(C1)), C1, C1 + 0.04, -6.6, 5.6, MI.ceiling);
    const lining = new THREE.ExtrudeGeometry(toShape([[SX - 0.012, F1], [slantX(C1) - 0.012, C1], [slantX(C1) - 0.002, C1], [SX - 0.002, F1]].map(([x, y]) => [s * x, y])), { depth: 12.2, bevelEnabled: false });
    lining.translate(0, 0, -6.6);
    ib.geo(lining, MI.wall);
    solid(...X(SX - 0.05, SX + 2), F1, C1, -6.6, 5.6);
    floorAt(...X(W1, SX), -0.7, 0.7, F1, MI.floor1);
    downlights(...X(W1 + 0.4, SX - 0.4), -0.3, 0.3, C1, 2.0);
    partition(s, 'x', W1, LZ - 0.2, -0.85, -0.7, F1, C1, [[4.9, 5.9, -1, 0]]);
    partition(s, 'x', W1, LZ - 0.2, 0.7, 0.85, F1, C1, [[4.9, 5.9, 1, 0]]);
    slantPartition(s, -0.85, -0.7);
    slantPartition(s, 0.7, 0.85, s > 0 ? [[11.1, 12.0, 1, 1]] : []);
    partition(s, 'z', -6.6, -0.85, 10.75, LZ, F1, C1, [[-4.25, -3.35, -1, 0]]);
    partition(s, 'z', 0.85, 5.6, 10.75, LZ, F1, C1, s > 0 ? [] : [[3.35, 4.25, -1, 1]]);
    floorAt(...X(W1, 10.75), -6.6, -0.85, F1, MI.floorRoom);
    downlights(...X(W1 + 0.6, 10.15), -6.0, -1.5, C1);
    ib.box(...X(4.7, 10.5), C1 - 0.03, C1, -6.5, -6.46, MI.led);
    slot(...X(5.4, 9.6), -6.1, -5.98, C1);
    wardrobe(onWall('x', -0.85, -1), ...X(6.2, 10.6), F1);
    const headBack = onWall('z', s * W1, s);
    sconce(headBack, -2.5, F1 + 1.1);
    sconce(headBack, -5.3, F1 + 1.1);
    floorAt(...X(W1, s > 0 ? 9.15 : 10.75), 0.85, 5.6, F1, MI.floorRoom);
    downlights(...X(W1 + 0.6, s > 0 ? 8.6 : 10.15), 1.4, 5.1, C1);
    ib.box(...X(5.5, 10.3), C1 - 0.03, C1, 5.46, 5.5, MI.led);
    wardrobe(onWall('x', 0.85, 1), ...X(6.2, 9.0), F1);
    const headFront = onWall('z', s * W1, s);
    sconce(headFront, 2.0, F1 + 1.1);
    sconce(headFront, 4.8, F1 + 1.1);
  }
  // правое крыло: ванная хозяина, санузел спальни 2, кабинет за решёткой
  floorAt(LZ, SX, -6.6, -0.85, F1, MI.floorBath);
  downlights(LZ + 0.3, SX - 0.2, -6.2, -1.2, C1, 1.6);
  const masterBath = { vanity: onWall('z', LZ, 1), toilet: onWall('x', -0.85, -1) };
  clad(masterBath.vanity, -6.6, -4.32, F1, C1);
  clad(masterBath.vanity, -3.28, -0.85, F1, C1);
  clad(masterBath.toilet, LZ, SX, F1, C1);
  vanity(masterBath.vanity, -3.0, -1.35, F1, 2);
  toilet(masterBath.toilet, 12.05, F1);
  tub(11.8, -5.45, F1, true);
  partition(1, 'z', 0.85, 5.6, 9.15, 9.3, F1, C1, [[1.2, 2.0, -1, 0]]);
  floorAt(9.3, 10.75, 0.85, 5.6, F1, MI.floorBath);
  downlights(9.5, 10.55, 1.2, 5.2, C1, 1.4);
  const bath2 = onWall('z', 10.75, -1);
  clad(bath2, 0.85, 5.6, F1, C1);
  vanity(bath2, 2.3, 3.5, F1);
  toilet(bath2, 3.95, F1);
  showerHead(bath2, 5.1, F1);
  glassPanel('x', 9.3, 10.15, 4.55, F1);
  floorAt(LZ, SX, 0.85, 5.6, F1, MI.floorRoom);
  downlights(LZ + 0.3, SX - 0.2, 1.3, 5.2, C1, 1.6);
  sconce(onWall('z', LZ, 1), 3.2, F1 + 1.6);
  // левое крыло: санузлы спален 3 и 4 за решёткой, шкаф в конце коридора
  const bath3 = { vanity: onWall('z', -LZ, -1), toilet: onWall('x', -0.85, -1) };
  floorAt(-SX, -LZ, -6.6, -0.85, F1, MI.floorBath);
  downlights(-SX + 0.2, -LZ - 0.3, -6.2, -1.2, C1, 1.6);
  clad(bath3.vanity, -6.6, -4.32, F1, C1);
  clad(bath3.vanity, -3.28, -0.85, F1, C1);
  vanity(bath3.vanity, -3.0, -1.6, F1);
  toilet(bath3.toilet, -12.05, F1);
  showerHead(bath3.vanity, -5.8, F1);
  glassPanel('x', -SX, -LZ, -5.0, F1);
  const bath4 = { vanity: onWall('z', -LZ, -1), toilet: onWall('x', 0.85, 1) };
  floorAt(-SX, -LZ, 0.85, 5.6, F1, MI.floorBath);
  downlights(-SX + 0.2, -LZ - 0.3, 1.2, 5.2, C1, 1.6);
  clad(bath4.vanity, 0.85, 3.28, F1, C1);
  clad(bath4.vanity, 4.32, 5.6, F1, C1);
  vanity(bath4.vanity, 1.2, 2.6, F1);
  toilet(bath4.toilet, -12.05, F1);
  showerHead(bath4.vanity, 5.1, F1);
  glassPanel('x', -SX, -11.55, 4.6, F1);
  wardrobe(onWall('z', -SX, 1), -0.65, 0.65, F1, 0.55, 2.6);
  xb.flush(root);
  ib.flush(interior);

  // ---------- комнаты (для света, подписей и прогулки) ----------
  const room = (id, name, x0, x1, y0, y1, z0, z1) => ({ id, name, min: [x0, y0, z0], max: [x1, y1, z1] });
  const rooms = [
    room('foyer', 'Входной холл со вторым светом', -IN, IN, F0, CC, VZ, CORE.front - 0.25),
    room('rear', 'Холл к бассейну', -IN, IN, F0, CG, CORE.back + 0.25, VZ),
    room('mezz', 'Малая гостиная и пантри', -IN, IN, F1, CC, CORE.back + 0.25, VZ),
    room('living', 'Большая гостиная', -11.75, -4.25, F0, CG + 0.2, -6.75, 0.55),
    room('dining', 'Столовая', 4.25, 11.75, F0, CG + 0.2, -6.75, 0.55),
    room('guest', 'Гостевая спальня', -11.75, -6.1, F0, CGB, 0.75, 5.75),
    room('maid', 'Комната прислуги', 8.6, 11.75, F0, CGB, 0.75, 5.75),
    room('laundry', 'Прачечная и кладовая', 6.1, 8.45, F0, CGB, 0.75, 2.85),
    room('corrL', 'Коридор', -5.95, -4.25, F0, CGB, 0.75, 5.75),
    room('corrR', 'Коридор', 4.25, 5.95, F0, CGB, 0.75, 5.75),
    room('master', 'Спальня хозяина', W1, 10.75, F1, C1, -6.6, -0.85),
    room('masterBath', 'Ванная хозяина', LZ, 13.9, F1, C1, -6.6, -0.85),
    room('bed2', 'Спальня 2 — игровая', W1, 9.15, F1, C1, 0.85, 5.6),
    room('study', 'Кабинет', LZ, 13.9, F1, C1, 0.85, 5.6),
    room('bed3', 'Спальня 3', -10.75, -W1, F1, C1, -6.6, -0.85),
    room('bed4', 'Спальня 4', -10.75, -W1, F1, C1, 0.85, 5.6),
    room('corr1R', 'Коридор 2-го этажа', W1, 13.9, F1, C1, -0.7, 0.7),
    room('corr1L', 'Коридор 2-го этажа', -13.9, -W1, F1, C1, -0.7, 0.7)
  ];
  // мягкий тёплый свет пустого дома по комнатам (включается вечером)
  for (const r of rooms) {
    const c = [(r.min[0] + r.max[0]) / 2, r.max[1] - 0.6, (r.min[2] + r.max[2]) / 2];
    lights.push({ pos: c, color: 0xffd2a0, intensity: 6, distance: 10, room: r.id, set: 'empty' });
  }

  const views = {
    start: { pos: [31, 15, 37], target: [0, 4, 0] },
    street: { pos: [9, 1.7, 31], target: [0, 5.2, 4] },
    back: { pos: [-21, 19, -38], target: [1, 2.5, -6] },
    pool: { pos: [-12.5, 2.4, -15.6], target: [3, 3.6, -6.5] },
    top: { pos: [0.2, 78, 10], target: [0, 0, 0] }
  };

  // ---------- пролёт по дому ----------
  const E0 = F0 + 1.6, E1 = F1 + 1.6, step = (i) => F0 + i * RISE + 1.6;
  const tour = [
    { pos: [0, 2.1, 15.2], look: [0, 4.6, 4.6], label: 'Вход с улицы', hold: 1.0 },
    { pos: [0.1, 2.4, 10.4], look: [0.2, 3.4, 4.6] },
    { pos: [0.3, E0, 6.4], look: [0.3, 2.7, 2.0] },
    { pos: [0.3, E0, 4.0], look: [0.0, 5.0, 0.0] },
    { pos: [0.4, E0, 2.4], look: [0.0, 6.2, -2.6], label: 'Входной холл, второй свет ~8 м', hold: 1.5 },
    { pos: [2.45, E0, 1.4], look: [3.0, 2.4, -3.0] },
    { pos: [3.0, E0, -1.0], look: [3.4, 2.4, -4.0] },
    { pos: [3.2, E0, -3.4], look: [8.0, 2.4, -4.0] },
    { pos: [4.6, E0, -3.9], look: [8.5, 2.4, -5.0] },
    { pos: [6.3, E0, -2.4], look: [9.0, 2.0, -5.6], label: 'Столовая с видом на бассейн', hold: 1.2 },
    { pos: [9.4, E0, -1.3], look: [11.5, 2.2, -3.6] },
    { pos: [6.2, E0, -2.9], look: [2.0, 2.4, -4.0] },
    { pos: [2.6, E0, -4.4], look: [0.0, 2.3, -9.0], label: 'Холл к бассейну' },
    { pos: [-2.6, E0, -4.2], look: [-8.0, 2.4, -4.0] },
    { pos: [-4.8, E0, -3.9], look: [-8.5, 2.4, -5.0] },
    { pos: [-7.3, E0, -2.4], look: [-8.6, 1.7, -6.6], label: 'Большая гостиная', hold: 1.2 },
    { pos: [-9.8, E0, -1.5], look: [-6.0, 2.4, 0.0] },
    { pos: [-5.1, E0, -0.4], look: [-5.1, 2.5, 3.0] },
    { pos: [-5.05, E0, 1.6], look: [-9.0, 2.5, 1.7], label: 'Гостевая спальня с санузлом' },
    { pos: [-6.7, E0, 1.65], look: [-9.5, 2.0, 3.6] },
    { pos: [-7.5, E0, 1.8], look: [-10.4, 1.6, 4.4], hold: 1.0 },
    { pos: [-6.6, E0, 1.6], look: [-4.0, 2.5, 1.9] },
    { pos: [-5.0, E0, 2.0], look: [-2.0, 2.5, 2.0] },
    { pos: [-3.2, E0, 2.05], look: [-3.0, 2.5, -2.0] },
    { pos: [-3.1, E0, -1.3], look: [0.0, 3.6, -1.3], label: 'Лестница' },
    { pos: [-2.0, step(1.5), -1.3], look: [1.0, step(8), -1.3], speed: 0.9 },
    { pos: [0.6, step(12), -1.3], look: [2.3, step(13), -1.0], speed: 0.9 },
    { pos: [1.6, step(13), -1.0], look: [1.6, step(14), 1.0], speed: 0.9 },
    { pos: [1.6, step(13), 0.1], look: [-1.0, step(20), 0.1], speed: 0.9 },
    { pos: [-0.6, step(19), 0.1], look: [-3.0, step(25), 0.1], speed: 0.9 },
    { pos: [-2.0, step(25), 0.1], look: [-4.5, E1, 0.1] },
    { pos: [-3.0, E1, 0.3], look: [0.5, 5.2, 4.2], label: 'Галерея второго этажа', hold: 1.2 },
    { pos: [-4.1, E1, 0.0], look: [-6.0, E1, 0.0] },
    { pos: [-5.4, E1, 0.0], look: [-5.4, E1, -3.0] },
    { pos: [-5.4, E1, -1.6], look: [-7.5, 6.7, -4.5] },
    { pos: [-7.3, E1, -3.7], look: [-7.8, 6.4, -8.5], label: 'Спальня 3 с видом на бассейн', hold: 1.0 },
    { pos: [-5.5, E1, -1.3], look: [-5.3, E1, 1.0] },
    { pos: [-5.3, E1, 0.0], look: [-2.0, E1, 0.0] },
    { pos: [-3.1, E1, -0.4], look: [-2.6, E1, -4.0] },
    { pos: [-2.4, E1, -3.2], look: [0.5, 6.2, -9.0] },
    { pos: [-0.4, E1, -4.3], look: [0.6, 6.0, -9.5], label: 'Малая гостиная и пантри', hold: 1.2 },
    { pos: [2.6, E1, -3.3], look: [3.0, E1, 0.0] },
    { pos: [3.0, E1, -0.4], look: [6.0, E1, 0.0] },
    { pos: [4.1, E1, 0.0], look: [6.0, E1, 0.0] },
    { pos: [5.4, E1, 0.0], look: [5.4, E1, -3.0] },
    { pos: [5.4, E1, -1.6], look: [7.6, 6.7, -4.5] },
    { pos: [7.6, E1, -3.6], look: [8.0, 6.4, -8.5], label: 'Спальня хозяина, 36 м²', hold: 1.2 },
    { pos: [10.1, E1, -3.8], look: [12.0, 6.6, -3.8] },
    { pos: [11.6, E1, -3.7], look: [11.8, 6.0, -6.3], label: 'Ванная с отдельностоящей ванной', hold: 1.0 },
    { pos: [10.0, E1, -4.3], look: [7.6, 6.6, -6.6] },
    { pos: [7.8, 6.6, -5.6], look: [7.6, 6.4, -7.5] },
    { pos: [7.6, 6.4, -6.9], look: [7.0, 6.0, -12.0] },
    { pos: [7.0, 8.5, -12.0], look: [2.0, 4.0, -4.0] },
    { pos: [6.0, 13.5, -25.0], look: [0.0, 4.0, -2.0], label: 'Дом со стороны бассейна', hold: 0.5 }
  ];

  // набор для модуля мебели и декора
  const kit = {
    THREE, M, MI, F0, F1, CG, CGB, C1, CC, IN, VX, VZ, W1, LZ, SX, RISE, slantX, sx, makeBatch, onWall, placed, solid, walk,
    toShape, toPath, rooms, lights, anim, night, xs: { XS, XL, ZA, ZB, landingTop }
  };
  return {
    root, views, tour, doors: [entryDoor], phys, rooms, lights, night, anim, kit,
    probes: { gf: [0.2, F0 + 1.7, -1.2], ff: [-0.5, F1 + 1.6, -3.6] },
    spawn: { pos: [0, 0.03, 13.5], yaw: 0 }
  };
}
