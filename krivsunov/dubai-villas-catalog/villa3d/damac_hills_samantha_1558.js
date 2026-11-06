// DAMAC Hills · вилла у гольф-поля (предложение Samantha, 3 видео и 2 фото WhatsApp 01.11.2026) — тип DAMAC VD-1 «Golf View 1».
// Планировка — по поэтажным планам VD-1 с Bayut (Brookfield; тот же план у The Turf «D-1» и DAMAC Villas by Paramount)
// и по плану DAMAC «Villas at AKOYA», стр. 47. Размеры — по масштабу плана 3,0 см на пиксель, сверенному по площади дома
// (≈5 200 sqft по объявлениям VD-1), машине и дверям: дом 26,8 × 10,4 м, участок ≈41,7 × 16,8 м, этаж 3,7 м.
// Высоты, окна, лестница, отделка, двор и деревья — по видео и фото. Мебели нет: дом сдаётся пустым, как на видео.
// Оси: X — вдоль дома (минус — к гольфу, плюс — к улице), Z — поперёк (минус — сторона входа, плюс — южная сторона),
// Y — вверх, метры. Ориентация совпадает с планом Bayut: пилон и балкон спальни хозяина слева, если смотреть с гольфа.

export const info = {
  title: 'DAMAC Hills · вилла VD-1 у гольф-поля',
  note: 'Модель по планам VD-1 (Bayut и DAMAC) в масштабе и по трём видео и двум фото риэлтора: дом 26,8 × 10,4 м, участок ≈42 × 17 м, этаж 3,7 м, оба этажа с комнатами, лестницей и вторым светом у входа, двор без озеленения, гольф, озеро и деревья за оградой. Точность планировки ±0,2–0,3 м; соседние дома и дальний ряд вилл — упрощённо.'
};

export function build(THREE) {
  const root = new THREE.Group();
  root.name = 'vd1_villa';

  // ---------- текстуры ----------
  function canvasTexture(size, draw, metersPerTile, h = size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = h;
    draw(canvas.getContext('2d'), size, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.repeat.set(1 / metersPerTile, 1 / metersPerTile);
    return texture;
  }
  const rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  function speckle(ctx, w, amount, spread, h = w) {
    for (let i = 0; i < amount; i++) {
      const v = (rnd() - 0.5) * spread;
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  }
  function veins(ctx, s, n, color, width) {
    ctx.strokeStyle = color;
    for (let i = 0; i < n; i++) {
      ctx.lineWidth = width * (0.4 + rnd());
      ctx.beginPath();
      let x = rnd() * s, y = 0;
      ctx.moveTo(x, y);
      while (y < s) { x += (rnd() - 0.5) * s * 0.12; y += s * (0.04 + rnd() * 0.08); ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  // глянцевая кремовая плитка 1,2 × 0,6 м вразбежку (на видео — светлый полированный керамогранит)
  const floorTex = canvasTexture(512, (ctx, s) => {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const k = (rnd() - 0.5) * 8;
      ctx.fillStyle = `rgb(${Math.round(236 + k)},${Math.round(228 + k)},${Math.round(212 + k * 0.8)})`;
      ctx.fillRect(c * s / 2, r * s / 2, s / 2, s / 2);
    }
    speckle(ctx, s, 6000, 0.03);
    veins(ctx, s, 5, 'rgba(190,170,140,0.12)', 1.2);
    ctx.strokeStyle = 'rgba(165,145,115,0.55)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r <= 2; r++) { ctx.beginPath(); ctx.moveTo(0, r * s / 2); ctx.lineTo(s, r * s / 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, s); ctx.stroke();
  }, 1.2);
  const kitchenTex = canvasTexture(256, (ctx, s) => { // светло-серая плитка «под мрамор» 0,6 × 0,6 (кухня на видео)
    ctx.fillStyle = '#d9d8d4';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 5000, 0.05);
    veins(ctx, s, 7, 'rgba(120,120,125,0.25)', 1.1);
    ctx.strokeStyle = 'rgba(120,118,112,0.5)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
  }, 0.6);
  const bathTex = canvasTexture(256, (ctx, s) => { // бежевый мрамор санузлов 0,6 × 0,6
    ctx.fillStyle = '#d6c6a8';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, 5000, 0.06);
    veins(ctx, s, 6, 'rgba(150,125,95,0.3)', 1.0);
    ctx.strokeStyle = 'rgba(130,110,85,0.5)';
    ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
  }, 0.6);
  const renderTex = canvasTexture(256, (ctx, s) => { ctx.fillStyle = '#d3c6ac'; ctx.fillRect(0, 0, s, s); speckle(ctx, s, 9000, 0.05); }, 2.0);
  const stoneTex = canvasTexture(256, (ctx, s) => { // «рваный» камень тонкими рядами (пилон у гольфа, фото фасада)
    ctx.fillStyle = '#6e5d4f';
    ctx.fillRect(0, 0, s, s);
    let y = 0;
    while (y < s) {
      const h = 6 + rnd() * 11;
      let x = -rnd() * 50;
      while (x < s) {
        const w = 18 + rnd() * 95, t = rnd(), grey = rnd() < 0.35;
        const r = grey ? 128 + t * 40 : 118 + t * 48, g = grey ? 122 + t * 38 : 92 + t * 34, b = grey ? 112 + t * 36 : 72 + t * 26;
        ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
        ctx.fillRect(x + 1, y + 1, w - 1.5, h - 1.5);
        ctx.fillStyle = 'rgba(255,240,220,0.18)';
        ctx.fillRect(x + 1, y + 1, w - 1.5, 1.2);
        x += w;
      }
      y += h;
    }
    speckle(ctx, s, 9000, 0.2);
  }, 0.9);
  const brickTex = canvasTexture(256, (ctx, s) => { // облицовка «под кирпич» торца у улицы (как у VD-1 в Whitefield)
    ctx.fillStyle = '#6d4636';
    ctx.fillRect(0, 0, s, s);
    for (let r = 0; r < 12; r++) for (let c = -1; c < 5; c++) {
      const t = rnd();
      ctx.fillStyle = `rgb(${Math.round(132 + t * 40)},${Math.round(80 + t * 24)},${Math.round(60 + t * 18)})`;
      ctx.fillRect(c * 64 + (r % 2) * 32 + 2, r * (s / 12) + 2, 60, s / 12 - 4);
    }
    speckle(ctx, s, 5000, 0.12);
  }, 0.9);
  const soilTex = canvasTexture(256, (ctx, s) => { // голый двор: утрамбованный грунт с гравием (как на фото)
    ctx.fillStyle = '#a99479';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const t = rnd();
      ctx.fillStyle = `rgba(${Math.round(120 + t * 80)},${Math.round(105 + t * 70)},${Math.round(85 + t * 60)},0.8)`;
      ctx.beginPath(); ctx.arc(rnd() * s, rnd() * s, 0.6 + rnd() * 1.8, 0, 7); ctx.fill();
    }
    speckle(ctx, s, 9000, 0.14);
  }, 1.6);
  const paverTex = canvasTexture(256, (ctx, s) => { // серо-бежевая брусчатка 0,2 × 0,1
    ctx.fillStyle = '#7d776d';
    ctx.fillRect(0, 0, s, s);
    const u = s / 16;
    for (let r = 0; r < 32; r++) for (let c = -1; c < 9; c++) {
      const g = 150 + Math.floor(rnd() * 26);
      ctx.fillStyle = `rgb(${g},${g - 6},${g - 16})`;
      ctx.fillRect(c * u * 2 + (r % 2) * u + 1, r * u / 2 + 1, u * 2 - 2, u / 2 - 2);
    }
    speckle(ctx, s, 4000, 0.08);
  }, 1.6);
  const concreteTex = canvasTexture(256, (ctx, s) => { ctx.fillStyle = '#a8a49b'; ctx.fillRect(0, 0, s, s); speckle(ctx, s, 9000, 0.09); }, 2.0);
  function grassLike(base, blades, scale) {
    return canvasTexture(256, (ctx, s) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 9000; i++) {
        const [r, g, b] = blades(rnd());
        ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
        ctx.fillRect(rnd() * s, rnd() * s, 1, 2 + rnd() * 3);
      }
    }, scale);
  }
  const lawnTex = grassLike('#6c9248', (t) => [70 + t * 30, 120 + t * 45, 50 + t * 20], 1.5);
  const fairwayTex = grassLike('#73a04c', (t) => [85 + t * 30, 140 + t * 40, 60 + t * 20], 3.0);
  const roughTex = grassLike('#8f9a55', (t) => (t > 0.55 ? [180 + t * 40, 160 + t * 40, 90 + t * 30] : [90 + t * 40, 120 + t * 40, 50 + t * 20]), 2.0);
  const sandTex = canvasTexture(256, (ctx, s) => { ctx.fillStyle = '#d4b98c'; ctx.fillRect(0, 0, s, s); speckle(ctx, s, 14000, 0.14); }, 2.5);
  const asphaltTex = canvasTexture(256, (ctx, s) => { ctx.fillStyle = '#45484c'; ctx.fillRect(0, 0, s, s); speckle(ctx, s, 16000, 0.12); }, 3);
  const wengeTex = canvasTexture(128, (ctx, s) => { // тёмный венге дверей, шкафов и низа кухни
    ctx.fillStyle = '#3b2b23';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = rnd() > 0.5 ? `rgba(20,12,8,${0.08 + rnd() * 0.15})` : `rgba(120,90,70,${0.04 + rnd() * 0.08})`;
      ctx.fillRect(0, rnd() * s, s, 0.5 + rnd() * 1.4);
    }
  }, 0.6);
  const rustTex = canvasTexture(128, (ctx, s) => { // входная дверь: медно-ржавый металл (кадры видео у входа)
    ctx.fillStyle = '#8a4f3a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      const t = rnd();
      ctx.fillStyle = `rgba(${Math.round(150 + t * 60)},${Math.round(80 + t * 40)},${Math.round(55 + t * 30)},${0.1 + rnd() * 0.25})`;
      ctx.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 6 + rnd() * 30);
    }
  }, 1.0);

  // ---------- материалы ----------
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    render: std({ map: renderTex, roughness: 0.92 }),
    cap: std({ color: 0xd8ccb4, roughness: 0.85 }),
    dark: std({ color: 0x2c2f31, roughness: 0.55, metalness: 0.3 }),        // тёмные панели, софиты рамы
    stone: std({ map: stoneTex, roughness: 0.95 }),
    brick: std({ map: brickTex, roughness: 0.9 }),
    glass: std({ color: 0x27343b, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.6 }),
    black: std({ color: 0x1b1c1e, metalness: 0.35, roughness: 0.45 }),
    railGlass: std({ color: 0xbfd6d6, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    soil: std({ map: soilTex, roughness: 1 }),
    pavers: std({ map: paverTex, roughness: 0.9 }),
    concrete: std({ map: concreteTex, roughness: 0.9 }),
    lawn: std({ map: lawnTex, roughness: 1 }),
    fairway: std({ map: fairwayTex, roughness: 1 }),
    rough: std({ map: roughTex, roughness: 1 }),
    sand: std({ map: sandTex, roughness: 1 }),
    asphalt: std({ map: asphaltTex, roughness: 0.95 }),
    kerb: std({ color: 0xcfcac0, roughness: 0.85 }),
    water: std({ color: 0x5b8f93, metalness: 0.1, roughness: 0.04, envMapIntensity: 1.2, emissive: 0x16363a, emissiveIntensity: 0.35 }),
    poolWater: std({ color: 0x3fc6bd, metalness: 0.05, roughness: 0.05, envMapIntensity: 1.1, emissive: 0x0e4a44, emissiveIntensity: 0.45 }),
    white: std({ color: 0xf2f0ea, roughness: 0.6 }),
    rust: std({ map: rustTex, roughness: 0.55, metalness: 0.45 }),
    steel: std({ color: 0x2a2c2e, roughness: 0.5, metalness: 0.5 }),
    pole: std({ color: 0x8e9499, metalness: 0.6, roughness: 0.4 }),
    trunk: std({ color: 0x5f4e3d, roughness: 0.95 }),
    leaf: std({ color: 0x5a6f36, roughness: 0.9, flatShading: true }),
    leafDark: std({ color: 0x46592c, roughness: 0.9, flatShading: true }),
    palmTrunk: std({ color: 0x8a7458, roughness: 0.95 }),
    frond: std({ color: 0x4a7f33, roughness: 0.8, side: THREE.DoubleSide }),
    frondDry: std({ color: 0x8a8a44, roughness: 0.85, side: THREE.DoubleSide }),
    grassTuft: std({ color: 0xb2a46a, roughness: 1, flatShading: true }),
    shrub: std({ color: 0x6f7f45, roughness: 1, flatShading: true }),
    neighbor: std({ color: 0xe3ddd0, roughness: 0.9 }),
    neighborDark: std({ color: 0x48525a, roughness: 0.4, metalness: 0.5 }),
    ac: std({ color: 0xd9d9d4, roughness: 0.6 }),
    lamp: std({ color: 0xfff6dc, emissive: 0xffe6b0, emissiveIntensity: 0.6 })
  };
  M.glass.userData.noCast = true;
  M.railGlass.userData.noCast = true;
  M.water.userData.noCast = true;
  M.poolWater.userData.noCast = true;
  // Интерьер: материалы с userData.room берут «комнатную» среду отражений просмотрщика, потолок — неосвещаемый белый.
  const MI = {
    wall: std({ color: 0xf1ece3, roughness: 0.9 }),
    ceiling: new THREE.MeshBasicMaterial({ color: 0xe9e6df, toneMapped: false }),
    floor: std({ map: floorTex, roughness: 0.12 }),
    kitchenFloor: std({ map: kitchenTex, roughness: 0.18 }),
    bathFloor: std({ map: bathTex, roughness: 0.25 }),
    bathWall: std({ map: bathTex, roughness: 0.3 }),
    stoneStair: std({ color: 0xdcc8a8, roughness: 0.28 }),
    groove: std({ color: 0x9c8a6e, roughness: 0.6 }),
    wenge: std({ map: wengeTex, roughness: 0.55 }),
    gloss: std({ color: 0xf6f6f3, roughness: 0.08 }),
    counter: std({ color: 0xe9e6de, roughness: 0.22 }),
    splash: std({ color: 0xdfeae6, roughness: 0.04 }),
    steel: std({ color: 0xc3c7ca, metalness: 0.9, roughness: 0.25 }),
    porcelain: std({ color: 0xf7f6f2, roughness: 0.12 }),
    chrome: std({ color: 0xd5d9dc, metalness: 1, roughness: 0.2 }),
    mirror: std({ color: 0xc9d1d6, metalness: 1, roughness: 0.04 }),
    glass: std({ color: 0xcfe8ea, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    led: std({ color: 0xfff1d8, emissive: 0xffd49a, emissiveIntensity: 2.0 }),
    downlight: new THREE.MeshBasicMaterial({ color: 0xfffaf0, toneMapped: false }),
    slot: std({ color: 0x2f3236, roughness: 0.7 }),
    grille: std({ color: 0xdedbd4, roughness: 0.7 })
  };
  for (const key of ['led', 'downlight', 'glass']) MI[key].userData.noCast = true;
  for (const m of Object.values(MI)) if (m.isMeshStandardMaterial) m.userData.room = true;

  // ---------- физика прогулки ----------
  // colliders — коробки [x0,y0,z0,x1,y1,z1]; walkables — поверхности [x0,z0,x1,z1,высота]; polys — многоугольники.
  const phys = { colliders: [], walkables: [], polys: [] };
  const col = (x0, x1, y0, y1, z0, z1) => phys.colliders.push([Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)]);
  const walkOn = (x0, x1, z0, z1, top) => phys.walkables.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), top]);

  // ---------- помощники ----------
  const add = (obj, parent = root) => { parent.add(obj); return obj; };
  function boxMM(x0, x1, y0, y1, z0, z1, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return add(m, parent);
  }
  const toShape = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const toPath = (pts) => new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  function ground(ptsXZ, y, mat, holesXZ = [], parent) { // горизонтальная поверхность по точкам плана (x, z)
    const shape = toShape(ptsXZ.map(([x, z]) => [x, -z]));
    holesXZ.forEach((h) => shape.holes.push(toPath(h.map(([x, z]) => [x, -z]))));
    const geo = new THREE.ShapeGeometry(shape, 24);
    geo.rotateX(-Math.PI / 2);
    // развёртка по мировым метрам, чтобы текстура лежала в масштабе
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.userData.noCast = true;
    return add(m, parent);
  }
  const rectXZ = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  // Пакет: детали одного материала сливаются в одну сетку; развёртка — по мировым координатам в метрах.
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
      boxSplit(x0, x1, y0, y1, z0, z1, mat, innerMat, axis, sign) { // грань, смотрящая внутрь дома (axis, sign), — отделкой
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
            for (let i = 0; i < c; i++) {
              const ax = Math.abs(q[i * 3]), ay = Math.abs(q[i * 3 + 1]), az = Math.abs(q[i * 3 + 2]);
              const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
              uv[(o + i) * 2] = ay >= ax && ay >= az ? x : ax >= az ? z : x;
              uv[(o + i) * 2 + 1] = ay >= ax && ay >= az ? z : y;
            }
            o += c;
            g.dispose();
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
          geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          const mesh = new THREE.Mesh(geo, mat);
          if (mat.userData.noCast) mesh.userData.noCast = true;
          parent.add(mesh);
        }
        groups.clear();
      }
    };
  }
  const B = makeBatch();   // оболочка дома, участок, соседи
  const sliders = [];      // раздвижные створки: закрыты в обзоре, открываются при прогулке и пролёте
  const ib = makeBatch();  // интерьер

  // Стена с проёмами: along 'x' — стена вдоль X (толщина t0..t1 по Z), 'z' — вдоль Z (толщина по X);
  // holes — [a0, a1, y0, y1] вдоль стены. inner — [материал, знак] для грани, смотрящей в дом. Сплошные куски — препятствия.
  function wall(batch, along, a0, a1, y0, y1, t0, t1, holes, mat, inner = null, solid = true) {
    const cut = (vals, lo, hi) => [...new Set(vals)].filter((v) => v >= lo && v <= hi).sort((p, q) => p - q);
    const ua = cut([a0, a1, ...holes.flatMap((h) => [h[0], h[1]])], a0, a1);
    const uy = cut([y0, y1, ...holes.flatMap((h) => [h[2], h[3]])], y0, y1);
    for (let j = 0; j < uy.length - 1; j++) {
      const yc = (uy[j] + uy[j + 1]) / 2;
      let start = null;
      for (let i = 0; i < ua.length; i++) {
        const ac = i < ua.length - 1 ? (ua[i] + ua[i + 1]) / 2 : null;
        const filled = ac !== null && !holes.some(([h0, h1, hy0, hy1]) => ac > h0 && ac < h1 && yc > hy0 && yc < hy1);
        if (filled && start === null) start = ua[i];
        if (!filled && start !== null) {
          const b = along === 'x' ? [start, ua[i], uy[j], uy[j + 1], t0, t1] : [t0, t1, uy[j], uy[j + 1], start, ua[i]];
          if (inner) batch.boxSplit(...b, mat, inner[0], along === 'x' ? 'z' : 'x', inner[1]);
          else batch.box(...b, mat);
          if (solid) col(b[0], b[1], b[2], b[3], b[4], b[5]);
          start = null;
        }
      }
    }
  }
  // Остекление в плоскости стены: along 'x' — в плоскости z = at, 'z' — в плоскости x = at; out — куда смотрит наружу (±1).
  // Стекло снаружи тёмное зеркальное и не видно изнутри (односторонняя плоскость), переплёты — чёрный алюминий.
  // cols — число створок или массив координат стоек; rows — высоты горизонтальных профилей между y0 и y1.
  function glazing(along, a0, a1, at, y0, y1, cols, rows, out, opts = {}) {
    const bar = opts.bar || 0.06, deep = opts.deep || 0.1;
    // opts.open = [o0, o1] — сдвинутая створка раздвижной двери: проём без стекла, створка стоит за соседней
    const pane = (u0, u1, off = 0) => {
      const g = new THREE.PlaneGeometry(u1 - u0, y1 - y0);
      if (along === 'x') { if (out < 0) g.rotateY(Math.PI); g.translate((u0 + u1) / 2, (y0 + y1) / 2, at + out * (0.004 - off)); }
      else { g.rotateY(out > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(at + out * (0.004 - off), (y0 + y1) / 2, (u0 + u1) / 2); }
      B.geo(g, M.glass);
    };
    const spans = opts.open ? [[a0, opts.open[0]], [opts.open[1], a1]].filter(([u0, u1]) => u1 - u0 > 0.01) : [[a0, a1]];
    for (const [u0, u1] of spans) pane(u0, u1);
    if (opts.open) {
      const [o0, o1] = opts.open, w = o1 - o0, toLow = o0 - a0 >= w - 0.01, top = opts.doorTop || y1;
      if (top < y1 - 0.01) { // фрамуга над дверью остаётся неподвижной
        const g = new THREE.PlaneGeometry(w, y1 - top);
        if (along === 'x') { if (out < 0) g.rotateY(Math.PI); g.translate((o0 + o1) / 2, (top + y1) / 2, at + out * 0.004); }
        else { g.rotateY(out > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(at + out * 0.004, (top + y1) / 2, (o0 + o1) / 2); }
        B.geo(g, M.glass);
      }
      const leaf = new THREE.Group();
      const h = top - y0, c = (o0 + o1) / 2, d = -out * 0.07;          // створка ходит в 7 см за неподвижным стеклом
      const g = new THREE.PlaneGeometry(w, h);
      if (along === 'x') { if (out < 0) g.rotateY(Math.PI); } else g.rotateY(out > 0 ? Math.PI / 2 : -Math.PI / 2);
      const glass = new THREE.Mesh(g, M.glass);
      if (along === 'x') glass.position.z = out * 0.004; else glass.position.x = out * 0.004;
      leaf.add(glass);
      const fb = (u0, u1, v0, v1) => {
        const m = new THREE.Mesh(along === 'x' ? new THREE.BoxGeometry(u1 - u0, v1 - v0, 0.05) : new THREE.BoxGeometry(0.05, v1 - v0, u1 - u0), M.black);
        if (along === 'x') m.position.set((u0 + u1) / 2, (v0 + v1) / 2, 0); else m.position.set(0, (v0 + v1) / 2, (u0 + u1) / 2);
        leaf.add(m);
      };
      fb(-w / 2, w / 2, -h / 2, -h / 2 + 0.06); fb(-w / 2, w / 2, h / 2 - 0.06, h / 2);
      fb(-w / 2, -w / 2 + 0.06, -h / 2, h / 2); fb(w / 2 - 0.06, w / 2, -h / 2, h / 2);
      if (along === 'x') leaf.position.set(c, (y0 + top) / 2, at + d); else leaf.position.set(at + d, (y0 + top) / 2, c);
      leaf.userData.slide = along === 'x' ? [toLow ? -w : w, 0] : [0, toLow ? -w : w];
      add(leaf);
      sliders.push(leaf);
    }
    const stops = Array.isArray(cols) ? cols : Array.from({ length: cols + 1 }, (_, i) => a0 + (i * (a1 - a0)) / cols);
    const put = (u0, u1, v0, v1) => (along === 'x' ? B.box(u0, u1, v0, v1, at - deep / 2, at + deep / 2, M.black) : B.box(at - deep / 2, at + deep / 2, v0, v1, u0, u1, M.black));
    for (const u of stops) put(Math.max(a0, u - bar / 2), Math.min(a1, u + bar / 2), y0, y1);
    for (const v of [y0, y1, ...(rows || [])]) {
      if (opts.open && v === y0) { for (const [u0, u1] of spans) put(u0, u1, v - bar / 2, v + bar / 2); continue; }
      put(a0, a1, Math.max(y0, v - bar / 2), Math.min(y1, v + bar / 2));
    }
    if (opts.solid !== false) {
      for (const [u0, u1] of spans) {
        if (along === 'x') col(u0, u1, y0, y1, at - 0.05, at + 0.05); else col(at - 0.05, at + 0.05, y0, y1, u0, u1);
      }
    }
  }
  // Стеклянное ограждение 1,1 м: стекло, стойки-держатели и круглый поручень из нержавейки (как на лестнице на видео)
  function railing(along, a0, a1, at, y0, opts = {}) {
    const h = opts.h || 1.1, batch = opts.batch || ib, mat = opts.glass || MI.glass;
    if (along === 'x') batch.box(a0, a1, y0 + 0.08, y0 + h - 0.08, at - 0.006, at + 0.006, mat);
    else batch.box(at - 0.006, at + 0.006, y0 + 0.08, y0 + h - 0.08, a0, a1, mat);
    const len = a1 - a0, n = Math.max(1, Math.round(len / 1.1));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i * len) / n;
      if (along === 'x') batch.box(a - 0.02, a + 0.02, y0, y0 + h, at - 0.04, at + 0.04, opts.post || MI.chrome);
      else batch.box(at - 0.04, at + 0.04, y0, y0 + h, a - 0.02, a + 0.02, opts.post || MI.chrome);
    }
    const rail = new THREE.CylinderGeometry(0.025, 0.025, len, 10);
    rail.rotateZ(Math.PI / 2);
    if (along === 'z') rail.rotateY(Math.PI / 2);
    if (along === 'x') rail.translate((a0 + a1) / 2, y0 + h, at); else rail.translate(at, y0 + h, (a0 + a1) / 2);
    batch.geo(rail, opts.rail || MI.chrome);
    if (along === 'x') col(a0, a1, y0, y0 + h, at - 0.05, at + 0.05); else col(at - 0.05, at + 0.05, y0, y0 + h, a0, a1);
  }
  // наклонное ограждение марша вдоль Z: стекло-параллелограмм, стойки и поручень по уклону
  function slopeRail(x, z0, y0, z1, y1, h = 1.0) {
    const s = new THREE.Shape([new THREE.Vector2(z0, y0 + 0.1), new THREE.Vector2(z1, y1 + 0.1), new THREE.Vector2(z1, y1 + h - 0.06), new THREE.Vector2(z0, y0 + h - 0.06)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);        // плоскость (z, y) → стекло в плоскости x
    g.translate(x + 0.006, 0, 0);
    ib.geo(g, MI.glass);
    const n = Math.max(1, Math.round(Math.abs(z1 - z0) / 1.0));
    for (let i = 0; i <= n; i++) {
      const t = i / n, z = z0 + (z1 - z0) * t, y = y0 + (y1 - y0) * t;
      ib.box(x - 0.04, x + 0.04, y, y + h, z - 0.02, z + 0.02, MI.chrome);
    }
    const len = Math.hypot(z1 - z0, y1 - y0);
    const dir = new THREE.Vector3(0, y1 - y0, z1 - z0).normalize();
    const rail = new THREE.CylinderGeometry(0.025, 0.025, len, 10);
    rail.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    rail.translate(x, (y0 + y1) / 2 + h, (z0 + z1) / 2);
    ib.geo(rail, MI.chrome);
    col(x - 0.05, x + 0.05, Math.min(y0, y1), Math.max(y0, y1) + h, Math.min(z0, z1), Math.max(z0, z1));
  }
  // проём с наличниками и открытой створкой; hinge — у какого края петли (0 — a0, 1 — a1); swing — в какую сторону открыта
  function doorway(along, a0, a1, y0, h, t0, t1, swing, hinge = 0, leafMat = MI.wenge) {
    const w = 0.06, p = 0.012;
    const put = (aa0, aa1, yy0, yy1, tt0, tt1, mat = MI.wenge) => (along === 'x' ? ib.box(aa0, aa1, yy0, yy1, tt0, tt1, mat) : ib.box(tt0, tt1, yy0, yy1, aa0, aa1, mat));
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
    put(ah, ah + th, y0 + 0.01, y0 + h - 0.03, swing > 0 ? face : face - width, swing > 0 ? face + width : face, leafMat);
    // ручка-скоба
    const hy = y0 + 1.0, hz = swing > 0 ? face + width - 0.08 : face - width + 0.08;
    put(ah - 0.05, ah + th + 0.05, hy - 0.015, hy + 0.015, hz - 0.06, hz + 0.06, MI.chrome);
  }
  // перегородка с дверями: doors — [a0, a1, swing, hinge]; h — высота дверей
  function partition(along, a0, a1, t0, t1, y0, y1, doors = [], h = 2.2, mat = MI.wall) {
    wall(ib, along, a0, a1, y0, y1, t0, t1, doors.map(([d0, d1]) => [d0, d1, y0, y0 + h]), mat);
    for (const [d0, d1, sw = 1, hi = 0] of doors) doorway(along, d0, d1, y0, h, t0, t1, sw, hi);
  }
  function downlights(x0, x1, z0, z1, y, step = 1.6) {
    const nx = Math.max(1, Math.round((x1 - x0) / step)), nz = Math.max(1, Math.round((z1 - z0) / step));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const g = new THREE.CircleGeometry(0.05, 12);
      g.rotateX(Math.PI / 2);
      g.translate(x0 + (i + 0.5) * (x1 - x0) / nx, y - 0.003, z0 + (j + 0.5) * (z1 - z0) / nz);
      ib.geo(g, MI.downlight);
    }
  }
  // потолок: tray — ширина опуска по периметру (на видео — кессон с опуском ~0,5 м и тёмными щелями кондиционера)
  function ceiling(x0, x1, z0, z1, y, tray = 0, rise = 0.28, slots = true) {
    if (!tray) {
      ib.box(x0, x1, y, y + 0.04, z0, z1, MI.ceiling);
      downlights(x0 + 0.3, x1 - 0.3, z0 + 0.3, z1 - 0.3, y);
      return;
    }
    const d = tray, ty = y + rise;
    ib.box(x0, x1, y, y + 0.04, z0, z0 + d, MI.ceiling);
    ib.box(x0, x1, y, y + 0.04, z1 - d, z1, MI.ceiling);
    ib.box(x0, x0 + d, y, y + 0.04, z0 + d, z1 - d, MI.ceiling);
    ib.box(x1 - d, x1, y, y + 0.04, z0 + d, z1 - d, MI.ceiling);
    ib.box(x0 + d, x1 - d, ty, ty + 0.04, z0 + d, z1 - d, MI.ceiling);
    for (const [a, b, c, e] of [[x0 + d, x1 - d, z0 + d, z0 + d + 0.03], [x0 + d, x1 - d, z1 - d - 0.03, z1 - d], [x0 + d, x0 + d + 0.03, z0 + d, z1 - d], [x1 - d - 0.03, x1 - d, z0 + d, z1 - d]]) ib.box(a, b, y + 0.04, ty, c, e, MI.ceiling);
    const g = 0.07;
    for (const [a, b, c, e] of [[x0 + d - g, x1 - d + g, z0 + d - g, z0 + d - g + 0.025], [x0 + d - g, x1 - d + g, z1 - d + g - 0.025, z1 - d + g], [x0 + d - g, x0 + d - g + 0.025, z0 + d - g, z1 - d + g], [x1 - d + g - 0.025, x1 - d + g, z0 + d - g, z1 - d + g]]) ib.box(a, b, y + 0.05, y + 0.065, c, e, MI.led);
    if (slots && x1 - x0 > 3) ib.box(x0 + d * 0.3, x0 + d * 0.3 + 0.08, y - 0.01, y, z0 + d + 0.4, z1 - d - 0.4, MI.slot); // щель кондиционера
    downlights(x0 + d / 2 - 0.25, x1 - d / 2 + 0.25, z0 + d / 2 - 0.25, z0 + d / 2 + 0.25, y, 1.8);
    downlights(x0 + d / 2 - 0.25, x1 - d / 2 + 0.25, z1 - d / 2 - 0.25, z1 - d / 2 + 0.25, y, 1.8);
  }
  function grilleAC(x, z, y) { ib.box(x - 0.3, x + 0.3, y - 0.015, y, z - 0.3, z + 0.3, MI.grille); ib.box(x - 0.2, x + 0.2, y - 0.02, y - 0.012, z - 0.2, z + 0.2, MI.slot); }
  // «у стены»: u — вдоль стены, v — от стены в комнату; n — куда смотрит грань стены (±1)
  function onWall(along, at, n) {
    return {
      box(u0, u1, y0, y1, v0, v1, mat, solid = false) {
        const a = at + n * v0, b = at + n * v1;
        const t0 = Math.min(a, b), t1 = Math.max(a, b);
        if (along === 'x') { ib.box(u0, u1, y0, y1, t0, t1, mat); if (solid) col(u0, u1, y0, y1, t0, t1); }
        else { ib.box(t0, t1, y0, y1, u0, u1, mat); if (solid) col(t0, t1, y0, y1, u0, u1); }
      },
      at(u, v) { return along === 'x' ? [u, at + n * v] : [at + n * v, u]; },
      yaw: along === 'x' ? (n > 0 ? 0 : Math.PI) : (n > 0 ? Math.PI / 2 : -Math.PI / 2)
    };
  }
  function placed(geo, w, u, y, v, mat) { geo.rotateY(w.yaw); const [x, z] = w.at(u, v); geo.translate(x, y, z); ib.geo(geo, mat); }
  function vanity(w, u0, u1, y0, sinks = 1) { // тумба венге со столешницей, раковины, смесители, зеркало
    w.box(u0, u1, y0 + 0.45, y0 + 0.82, 0, 0.55, MI.wenge, true);
    w.box(u0, u1, y0 + 0.82, y0 + 0.85, 0, 0.56, MI.counter);
    w.box(u0 + 0.05, u1 - 0.05, y0 + 1.1, y0 + 2.1, 0.012, 0.025, MI.mirror);
    for (let k = 0; k < sinks; k++) {
      const u = u0 + ((k + 0.5) * (u1 - u0)) / sinks;
      placed(new THREE.CylinderGeometry(0.2, 0.17, 0.05, 24), w, u, y0 + 0.86, 0.3, MI.porcelain);
      placed(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 8), w, u, y0 + 0.98, 0.08, MI.chrome);
      w.box(u - 0.014, u + 0.014, y0 + 1.1, y0 + 1.13, 0.08, 0.2, MI.chrome);
    }
  }
  function toilet(w, u, y0) {
    const bowl = new THREE.SphereGeometry(0.2, 16, 10);
    bowl.scale(0.95, 0.75, 1.4);
    placed(bowl, w, u, y0 + 0.4, 0.32, MI.porcelain);
    w.box(u - 0.2, u + 0.2, y0 + 0.3, y0 + 0.82, 0, 0.16, MI.porcelain, true);
    w.box(u - 0.12, u + 0.12, y0 + 0.95, y0 + 1.1, 0, 0.012, MI.chrome);
  }
  function shower(x0, x1, z0, z1, y0, screen) { // поддон, стеклянная перегородка, лейка
    ib.box(x0, x1, y0, y0 + 0.03, z0, z1, MI.bathFloor);
    if (screen) {
      const [along, a0, a1, at] = screen;
      if (along === 'x') ib.box(a0, a1, y0 + 0.03, y0 + 2.0, at - 0.005, at + 0.005, MI.glass); else ib.box(at - 0.005, at + 0.005, y0 + 0.03, y0 + 2.0, a0, a1, MI.glass);
    }
    const hx = (x0 + x1) / 2, hz = (z0 + z1) / 2;
    const head = new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20);
    head.translate(hx, y0 + 2.15, hz);
    ib.geo(head, MI.chrome);
  }
  function wardrobe(along, a0, a1, at, n, y0, depth = 0.6, h = 2.5) { // встроенный шкаф венге с ручками-планками
    const w = onWall(along, at, n);
    w.box(a0, a1, y0, y0 + h, 0, depth, MI.wenge, true);
    const doors = Math.max(1, Math.round((a1 - a0) / 0.6));
    for (let i = 1; i < doors; i++) { const u = a0 + (i * (a1 - a0)) / doors; w.box(u - 0.004, u + 0.004, y0 + 0.02, y0 + h - 0.02, depth, depth + 0.004, MI.slot); }
    for (let i = 0; i < doors; i++) { const u = a0 + ((i + (i % 2 ? 0.12 : 0.88)) * (a1 - a0)) / doors; w.box(u - 0.01, u + 0.01, y0 + 0.9, y0 + 1.4, depth, depth + 0.025, MI.chrome); }
  }

  // ===================================================================================================================
  // ---------- уровни и размеры (метры) ----------
  const F0 = 0.30;             // чистый пол 1-го этажа (над двором одна ступень 0,15 и порог)
  const F1 = 4.00;             // чистый пол 2-го этажа: этаж 3,70 м, 21 подъём по 0,176 м
  const CG = F0 + 3.05;        // опуск потолка 1-го этажа ~3,05 м (оценка по дверям на видео)
  const CG_TOP = F0 + 3.35;    // низ плиты / кессон гостиной ~3,35 м
  const C1 = F1 + 3.0;         // опуск потолка 2-го этажа
  const C1_TOP = F1 + 3.25;    // низ плиты крыши
  const ROOF = C1_TOP + 0.35;  // верх плиты крыши
  const PARA = ROOF + 0.8;     // верх парапета и рамы
  const RISE = (F1 - F0) / 21;
  // 2-й этаж снят с плана Bayut и переведён в координаты 1-го этажа: по длине край рамы — над каменным пилоном,
  // восточные балконы — над торцом комнаты водителя (на фото под балконом виден софит со светильниками);
  // по ширине — по наружным граням. zf переводит координаты Z плана 2-го этажа.
  const zf = (z) => -5.19 + (z + 5.07) * 1.0211;
  // главные линии
  const XW = -13.0;            // витраж 1-го этажа к гольфу
  const XWF = -12.62;          // остекление 2-го этажа к гольфу
  const XB = -14.04;           // край балкона и рамы к гольфу (над пилоном)
  const ZN = -5.19, ZS = 5.25; // северная (вход) и южная наружные грани 2-го этажа
  const XE1 = 12.5;            // восточная наружная грань 2-го этажа
  const XEB = 13.8;            // край восточных балконов
  // участок
  const PX0 = -21.21, PX1 = 20.2, PZ0 = -8.16, PZ1 = 8.25;

  // ===================================================================================================================
  // ---------- окружение: гольф, озеро, улица ----------
  ground(rectXZ(-420, PX0 - 0.27, -320, 320), 0.004, M.rough);
  // ровные зелёные участки поля и холмики с песком и сухой травой у ограды (видео с балкона)
  const fairways = [
    [[-48, -40], [-120, -70], [-215, -60], [-250, -10], [-210, 40], [-120, 52], [-60, 30], [-44, -5]],
    [[-70, 60], [-150, 75], [-240, 95], [-260, 140], [-180, 150], [-90, 120], [-60, 90]],
    [[-260, -120], [-330, -110], [-360, -40], [-300, 0], [-262, -40]]
  ];
  for (const f of fairways) ground(f, 0.012, M.fairway);
  for (const b of [[-58, 8, 7, 3.5], [-92, -42, 9, 4], [-140, 30, 6, 3], [-44, -22, 5, 2.5], [-205, 70, 8, 3.5]]) {
    const pts = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push([b[0] + Math.cos(a) * b[2] * (0.85 + 0.3 * Math.sin(a * 3)), b[1] + Math.sin(a) * b[3]]); }
    ground(pts, 0.02, M.sand);
  }
  const moundGeo = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [x, z, sx, sz, h, mat] of [[-26, -4, 5, 3, 0.7, M.rough], [-29, 9, 6, 3.5, 0.9, M.rough], [-33, -16, 7, 4, 1.0, M.rough], [-24.5, 15, 4, 3, 0.6, M.sand], [-38, 2, 6, 4, 0.8, M.rough], [-25, -12, 3.5, 2.5, 0.5, M.sand]]) {
    const m = new THREE.Mesh(moundGeo, mat);
    m.scale.set(sx, h, sz);
    m.position.set(x, 0, z);
    m.userData.noCast = true;
    add(m);
  }
  // пучки сухой травы на «рафе» между оградой и полем
  {
    const tuft = new THREE.ConeGeometry(0.16, 0.55, 5);
    tuft.translate(0, 0.26, 0);
    const pos = [];
    for (let i = 0; i < 220; i++) pos.push([PX0 - 1.0 - rnd() * 20, (rnd() - 0.5) * 66]);
    const mesh = new THREE.InstancedMesh(tuft, M.grassTuft, pos.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    pos.forEach(([x, z], i) => { const k = 0.6 + rnd() * 0.9; s.set(k, k * (0.7 + rnd() * 0.8), k); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6); m4.compose(new THREE.Vector3(x, 0, z), q, s); mesh.setMatrixAt(i, m4); });
    mesh.userData.noCast = true;
    add(mesh);
  }
  // озеро на северо-западе: с балкона видно слева от большой акации, за ним — ряд вилл на другой стороне поля
  const lake = [[-78, -24], [-96, -30], [-124, -26], [-150, -38], [-162, -60], [-148, -82], [-118, -90], [-92, -78], [-80, -56], [-72, -38]];
  ground(lake.map(([x, z]) => [x + Math.sign(x + 115) * 3, z + Math.sign(z + 57) * 3]), 0.014, M.sand);
  ground(lake, 0.03, M.water);
  // прожекторы поля (видны на видео с балкона)
  function floodlight(x, z, h) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, h, 10), M.pole);
    pole.position.y = h / 2;
    g.add(pole);
    for (const s of [-1, 1]) boxMM(s * 0.15 - 0.35, s * 0.15 + 0.35, h - 0.1, h + 0.6, -0.25, 0.25, M.pole, g);
    g.position.set(x, 0, z);
    add(g);
  }
  floodlight(-44, -10, 18);
  floodlight(-71, 24, 18);
  floodlight(-102, -64, 18);
  floodlight(-150, 12, 18);
  // ряд вилл на другой стороне поля (на видео — белые дома с тёмными окнами вдали)
  for (let z = -230; z <= 230; z += 19) {
    const x = -285 - Math.abs(z) * 0.12, h = 7.5 + ((z / 19) % 2 ? 0.6 : 0);
    B.box(x - 13, x + 13, 0, h, z - 5.2, z + 5.2, M.neighbor);
    B.box(x - 13.5, x - 13.0, 0.6, h - 0.8, z - 4.6, z + 4.6, M.neighborDark);
  }
  // улица со стороны гаража
  ground(rectXZ(PX1 + 1.6, PX1 + 9.6, -140, 140), 0.01, M.asphalt);
  B.box(PX1, PX1 + 1.6, 0, 0.12, -140, 140, M.kerb);
  for (let z = -136; z < 140; z += 6) B.box(PX1 + 5.55, PX1 + 5.65, 0.011, 0.02, z, z + 3, M.white);
  for (let z = -102; z <= 102; z += 17) { // дома через улицу (упрощённо)
    B.box(PX1 + 22, PX1 + 48, 0, 7.6, z - 5.2, z + 5.2, M.neighbor);
    B.box(PX1 + 21.5, PX1 + 22, 1.0, 6.6, z - 3, z + 3, M.neighborDark);
  }

  // ---------- деревья ----------
  // акация/прозопис: развилка из 2–3 стволов и плоская «зонтичная» крона из нескольких комков
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const treeBatch = makeBatch();
  function acacia(x, z, h, r, seed = 1) {
    let s = seed * 9301 + 49297;
    const R = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const forks = 2 + Math.floor(R() * 2);
    for (let i = 0; i < forks; i++) {
      const a = (i / forks) * Math.PI * 2 + R();
      const lean = 0.35 + R() * 0.25, len = h * 0.62;
      const t = new THREE.CylinderGeometry(0.07, 0.13, len, 6);
      t.translate(0, len / 2, 0);
      t.rotateZ(lean);
      t.rotateY(a);
      t.translate(x, 0, z);
      treeBatch.geo(t, M.trunk);
    }
    const trunk = new THREE.CylinderGeometry(0.14, 0.2, h * 0.3, 7);
    trunk.translate(x, h * 0.15, z);
    treeBatch.geo(trunk, M.trunk);
    const n = 7 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = R() * r * 0.75;
      const g = blobGeo.clone();
      const k = r * (0.42 + R() * 0.3);
      g.scale(k, k * 0.42, k);
      g.translate(x + Math.cos(a) * d, h * (0.78 + R() * 0.18), z + Math.sin(a) * d);
      treeBatch.geo(g, i % 3 ? M.leaf : M.leafDark);
    }
    col(x - 0.25, x + 0.25, 0, h * 0.5, z - 0.25, z + 0.25);
  }
  const frondGeo = (() => { // лист пальмы: заострённая лопасть, прогнутая вниз к концу
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
  function palm(x, z, h, lean = 0.04) { // вашингтония: тонкий высокий ствол и шапка листьев
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h, 8), M.palmTrunk);
    trunk.position.y = h / 2;
    g.add(trunk);
    const n = 18, size = Math.min(2.4, 1.0 + h * 0.18);
    for (let i = 0; i < n; i++) {
      const frond = new THREE.Mesh(frondGeo, i % 4 === 3 ? M.frondDry : M.frond);
      frond.scale.setScalar(size * (0.85 + (i % 3) * 0.1));
      frond.position.set(0, h, 0);
      frond.rotation.set(0, (i / n) * Math.PI * 2 + (i % 2) * 0.17, 0, 'YXZ');
      frond.rotateX(-0.55 + (i % 3) * 0.35);
      g.add(frond);
    }
    g.position.set(x, 0, z);
    g.rotation.z = lean;
    col(x - 0.28, x + 0.28, 0, 3, z - 0.28, z + 0.28);
    return add(g);
  }
  // ближние деревья за оградой у гольфа — по видео с балкона и фото гостиной
  acacia(-24.4, -0.9, 6.8, 3.7, 1);   // большая акация почти напротив балкона
  acacia(-23.7, 6.4, 5.3, 2.9, 2);    // акация слева на фото гостиной
  acacia(-26.8, -12.6, 5.8, 3.2, 3);
  acacia(-27.6, 14.8, 5.0, 2.7, 4);
  acacia(-31.0, -3.5, 4.2, 2.2, 5);
  palm(-29.2, 3.6, 8.6, 0.03);        // пальма по центру вида из гостиной
  palm(-34.5, -7.4, 7.6, -0.04);
  palm(-31.5, 18.5, 9.0, 0.05);
  for (let i = 0; i < 10; i++) acacia(-46 - rnd() * 40, -70 + i * 15 + rnd() * 6, 4.5 + rnd() * 2, 2.4 + rnd(), 10 + i);
  for (const [x, z] of [[-22.6, -6.2], [-22.8, 2.6], [-22.4, 10.8], [-23.2, -15.5]]) {
    const g = blobGeo.clone();
    g.scale(0.9, 0.55, 0.9);
    g.translate(x, 0.45, z);
    treeBatch.geo(g, M.shrub);
  }
  palm(-9.5, -11.4, 7.0, 0.02);       // пальма у соседа за северной стеной (видна на фото фасада)
  treeBatch.flush(root);

  // ===================================================================================================================
  // ---------- участок: двор, дорожки, ограды ----------
  ground(rectXZ(PX0, PX1, PZ0, PZ1), 0.02, M.soil);                       // двор не озеленён (фото и видео)
  ground(rectXZ(-15.6, -5.31, ZN - 0.04, -4.59), 0.03, M.pavers);           // под нависанием 2-го этажа
  ground(rectXZ(-16.5, PX1, -7.25, ZN), 0.032, M.pavers);                   // дорожка вдоль северной стороны к входу
  ground(rectXZ(12.24, 13.65, -4.86, 0.9), 0.025, M.soil);                  // грядка у гостевой спальни
  ground(rectXZ(13.8, PX1, 0.9, PZ1), 0.034, M.pavers);                     // навес для двух машин
  ground(rectXZ(15.9, PX1, PZ0, -1.1), 0.035, M.lawn);                      // газон у улицы
  ground(rectXZ(13.65, PX1, -1.1, 0.9), 0.034, M.pavers);
  // бетонная терраса у витража гостиной (на фото — серая полоса и ступень)
  B.box(-15.0, XW, 0, 0.15, -4.59, ZS, M.concrete);
  walkOn(-15.0, XW, -4.59, ZS, 0.15);
  // задняя ограда к гольфу: низкая стенка, чёрная решётка, бежевые столбы (фото гостиной)
  B.box(PX0 - 0.27, PX0, 0, 0.5, PZ0 - 0.27, PZ1 + 0.27, M.render);
  B.box(PX0 - 0.3, PX0 + 0.03, 0.5, 0.56, PZ0 - 0.27, PZ1 + 0.27, M.cap);
  for (let z = PZ0; z <= PZ1 + 0.01; z += (PZ1 - PZ0) / 6) B.box(PX0 - 0.32, PX0 + 0.05, 0, 1.6, z - 0.18, z + 0.18, M.render);
  B.box(PX0 - 0.16, PX0 - 0.11, 1.42, 1.46, PZ0, PZ1, M.black);
  B.box(PX0 - 0.16, PX0 - 0.11, 0.62, 0.66, PZ0, PZ1, M.black);
  for (let z = PZ0 + 0.06; z < PZ1; z += 0.13) B.box(PX0 - 0.15, PX0 - 0.12, 0.56, 1.46, z - 0.012, z + 0.012, M.black);
  col(PX0 - 0.3, PX0 + 0.05, 0, 1.6, PZ0 - 0.3, PZ1 + 0.3);
  // боковые стены к соседям 2,0 м, у улицы — 1,0 м
  for (const [z0, z1] of [[-8.43, PZ0], [PZ1, 8.52]]) {
    wall(B, 'x', PX0 - 0.27, 13.8, 0, 2.0, z0, z1, [], M.render);
    B.box(PX0 - 0.27, 13.8, 2.0, 2.06, z0 - 0.02, z1 + 0.02, M.cap);
    wall(B, 'x', 13.8, PX1, 0, 1.0, z0, z1, [], M.render);
    B.box(13.8, PX1, 1.0, 1.06, z0 - 0.02, z1 + 0.02, M.cap);
  }
  // ниши для счётчиков у южной стены (на плане — П-образные выступы)
  for (const [x0, x1] of [[-2.58, -0.3], [17.91, 20.19]]) {
    B.box(x0, x1, 0, 1.8, 7.32, PZ1, M.render);
    B.box(x0 + 0.15, x1 - 0.15, 0.1, 1.6, 7.3, 7.32, M.dark);
    col(x0, x1, 0, 1.8, 7.32, PZ1);
  }
  // навес для машин: тёмный стальной каркас с плоской кровлей (как у VD-1 в Whitefield)
  for (const [x, z] of [[19.7, 1.2], [19.7, 7.9], [14.1, 7.9]]) { B.box(x - 0.09, x + 0.09, 0, 2.95, z - 0.09, z + 0.09, M.steel); col(x - 0.12, x + 0.12, 0, 2.95, z - 0.12, z + 0.12); }
  B.box(13.8, 19.9, 2.95, 3.1, 1.0, 8.1, M.steel);
  B.box(13.8, 19.9, 3.1, 3.13, 1.0, 8.1, M.dark);
  // ходим по двору, дорожкам и улице
  walkOn(PX0, PX1 + 9.6, PZ0, PZ1, 0.0);
  walkOn(PX1, PX1 + 9.6, -60, 60, 0.0);
  walkOn(PX1, PX1 + 1.6, -60, 60, 0.12);

  // ---------- соседи: тот же тип VD-1 упрощённо, участки по 16,95 м ----------
  function neighborHouse(dz, pool) {
    B.box(XW, 13.8, 0, F1, -4.59 + dz, ZS + dz, M.neighbor);
    B.box(XB, XEB, F1, PARA, ZN + dz, ZS + dz, M.neighbor);
    B.box(XB - 0.02, XWF, F1 + 0.1, C1_TOP, ZN + 0.3 + dz, ZS - 0.3 + dz, M.neighborDark); // глубокая рамка к гольфу
    B.box(XW - 0.02, XW + 0.02, 0.4, CG, -4.0 + dz, ZS - 0.1 + dz, M.neighborDark);
    B.box(0.9, 4.3, 0.5, C1_TOP, ZN - 0.02 + dz, ZN + 0.02 + dz, M.neighborDark);
    for (const x of [-10, -4, 6, 10]) B.box(x, x + 1.6, F1 + 0.6, C1, ZS + dz - 0.02, ZS + dz + 0.02, M.neighborDark);
    ground(rectXZ(PX0, PX1, -8.16 + dz, 8.25 + dz), 0.02, M.lawn);
    wall(B, 'x', PX0 - 0.27, PX1, 0, 2.0, (dz < 0 ? -8.43 : 8.25) + dz, (dz < 0 ? -8.16 : 8.52) + dz, [], M.render, null, false);
    if (pool) {
      const [px0, px1, pz0, pz1] = pool;
      ground(rectXZ(px0 - 0.6, px1 + 0.6, pz0 - 0.6, pz1 + 0.6), 0.04, M.cap);
      ground(rectXZ(px0, px1, pz0, pz1), 0.045, M.poolWater);
      // белая перголa над краем бассейна у дома (видна с балкона справа внизу)
      const gx0 = px1 - 2.3, gx1 = px1 + 0.4;
      for (const [x, z] of [[gx0, pz0 - 0.4], [gx0, pz1 + 0.4], [gx1, pz0 - 0.4], [gx1, pz1 + 0.4]]) B.box(x - 0.08, x + 0.08, 0, 2.7, z - 0.08, z + 0.08, M.white);
      B.box(gx0 - 0.1, gx1 + 0.1, 2.62, 2.78, pz0 - 0.5, pz1 + 0.5, M.white);
      for (let x = gx0; x <= gx1; x += 0.2) B.box(x - 0.03, x + 0.03, 2.78, 2.86, pz0 - 0.5, pz1 + 0.5, M.white);
    }
  }
  neighborHouse(-16.95, [-19.8, -14.6, -12.6, -9.3]);   // бассейн соседа у нашей стены (видео с балкона)
  neighborHouse(16.95, null);
  for (const dz of [-33.9, 33.9, -50.85, 50.85]) { // ещё дальше по ряду
    B.box(XW, 13.8, 0, F1, -4.59 + dz, ZS + dz, M.neighbor);
    B.box(XB, XEB, F1, PARA, ZN + dz, ZS + dz, M.neighbor);
    B.box(XB - 0.02, XWF, F1 + 0.1, C1_TOP, ZN + 0.3 + dz, ZS - 0.3 + dz, M.neighborDark);
    ground(rectXZ(PX0, PX1, -8.43 + dz, 8.52 + dz), 0.02, M.lawn);
  }

  // ===================================================================================================================
  // ---------- дом: перекрытия ----------
  // фундаментная плита с полом 1-го этажа (снаружи — бежевый цоколь)
  B.box(XW, 12.24, 0, F0, -4.59, ZS, M.render);
  B.box(-5.31, 0.15, 0, F0, ZN, -4.59, M.render);
  B.box(0.15, 12.24, 0, F0, ZN, -4.59, M.render);
  B.box(12.24, 13.8, 0, F0, 0.9, ZS, M.render);
  // крыльцо: ступень с дорожки и пол под двухсветным порталом
  B.box(0.87, 4.35, 0, F0 - 0.15, ZN - 0.36, ZN, M.concrete);
  walkOn(0.87, 4.35, ZN - 0.36, ZN, F0 - 0.15);
  walkOn(0.87, 4.35, ZN, -2.36, F0);
  // плита 2-го этажа (снаружи — бежевая кромка), без проёмов второго света над входом и над лестницей
  const slab = (x0, x1, z0, z1) => { B.box(x0, x1, F1 - 0.35, F1, z0, z1, M.render); };
  slab(XB, 0.87, ZN, ZS);           // запад: над гостиной, с выносом над террасой; спальня хозяина, спальня 2, малая гостиная
  slab(0.87, 4.26, -0.62, 0.85);    // галерея-мост между двумя вторыми светами
  slab(4.26, XE1, ZN, ZS);          // восток
  slab(XE1, XEB, 0.9, ZS);          // крыша комнаты водителя под юго-восточным балконом
  slab(XE1, XEB, ZN, zf(-0.457));   // консоль северо-восточного балкона
  // полы 2-го этажа и балконов
  walkOn(XWF, 0.87, ZN, ZS, F1);
  walkOn(0.87, 4.26, -0.62, 0.85, F1);
  walkOn(4.26, XE1, ZN, ZS, F1);
  walkOn(XB, XWF, zf(-4.58), zf(0.614), F1);
  walkOn(XE1, XEB, ZN, zf(-0.602), F1);
  walkOn(XE1, XEB, zf(1.03), ZS, F1);
  // крыша над всем домом, крыльцом и балконами: плита и парапет-рама
  B.box(XB, XEB, C1_TOP, ROOF, ZN, ZS, M.render);
  wall(B, 'x', XB, XEB, ROOF, PARA, ZN, ZN + 0.25, [], M.render, null, false);
  wall(B, 'x', XB, XEB, ROOF, PARA, ZS - 0.25, ZS, [], M.render, null, false);
  wall(B, 'z', ZN + 0.25, ZS - 0.25, ROOF, PARA, XB, XB + 0.25, [], M.render, null, false);
  wall(B, 'z', ZN + 0.25, ZS - 0.25, ROOF, PARA, XEB - 0.25, XEB, [], M.render, null, false);
  B.box(XB - 0.02, XEB + 0.02, PARA, PARA + 0.04, ZN - 0.02, ZS + 0.02, M.cap);
  // наружные кондиционеры и бак на крыше (видны на спутнике у всех домов)
  for (let i = 0; i < 5; i++) { B.box(3 + i * 1.3, 3.95 + i * 1.3, ROOF, ROOF + 0.85, 2.2, 2.6, M.ac); B.box(3.1 + i * 1.3, 3.85 + i * 1.3, ROOF + 0.2, ROOF + 0.65, 2.18, 2.2, M.dark); }
  { const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.5, 16), M.ac); tank.position.set(-2.5, ROOF + 0.75, 3.0); add(tank); }
  B.box(6.5, 7.6, ROOF, ROOF + 1.0, -2.0, -1.0, M.render);  // выход на крышу

  // ---------- дом: 1-й этаж, наружные стены ----------
  const IN = (s) => [MI.wall, s];
  // северная стена гостиной (сплошная, внутри — стена под телевизор) и пилон у гольфа в камне
  wall(B, 'x', -12.84, -5.31, F0 - 0.3, F1 - 0.35, -4.59, -4.32, [], M.render, IN(1));
  B.box(-14.04, -12.84, 0, F1 - 0.35, -4.59, -4.02, M.stone);
  col(-14.04, -12.84, 0, F1, -4.59, -4.02);
  // эркер малой гостиной с витражом к входной дорожке
  wall(B, 'z', ZN, -4.32, F0 - 0.3, F1 - 0.35, -5.31, -5.0, [], M.render, IN(1));
  wall(B, 'x', -5.0, -3.24, F0 - 0.3, F1 - 0.35, ZN, -4.92, [], M.render, IN(1));
  wall(B, 'x', -3.24, 0.15, CG, F1 - 0.35, ZN, -4.92, [], M.render, IN(1), false);
  glazing('x', -3.24, 0.15, -5.06, F0, CG, 3, [F0 + 2.45], -1);
  // стена-пилон слева от крыльца (до крыши) и стена справа (санузлы)
  wall(B, 'z', ZN, -2.28, 0, ROOF, 0.15, 0.87, [], M.render, null);
  wall(B, 'z', ZN, -0.57, 0, F1 - 0.35, 4.35, 4.62, [], M.render, IN(1));
  // санузел и умывальная у входа: стена к дорожке с узким окном
  wall(B, 'x', 4.62, 6.54, F0 - 0.3, F1 - 0.35, ZN, -4.86, [[5.76, 6.4, F0 + 1.75, F0 + 2.55]], M.render, IN(1));
  glazing('x', 5.76, 6.4, -5.03, F0 + 1.75, F0 + 2.55, 1, [], -1);
  // гостевая спальня: глухая стена к дорожке, окно в пол к восточной грядке
  wall(B, 'x', 6.54, 12.24, F0 - 0.3, F1 - 0.35, -4.86, -4.56, [], M.render, IN(1));
  wall(B, 'z', -4.86, 1.2, F0 - 0.3, F1 - 0.35, 11.94, 12.24, [[-3.18, -0.69, F0, CG], [0.39, 0.99, F0 + 1.7, F0 + 2.6]], M.render, IN(-1));
  glazing('z', -3.18, -0.69, 12.09, F0, CG, 2, [F0 + 2.45], 1);
  glazing('z', 0.39, 0.99, 12.09, F0 + 1.7, F0 + 2.6, 1, [], 1);
  // комната водителя у навеса: кирпичная облицовка снаружи
  wall(B, 'x', 12.24, 13.8, F0 - 0.3, F1 - 0.35, 0.9, 1.2, [], M.render, IN(1));
  wall(B, 'z', 0.9, ZS, F0 - 0.3, F1 - 0.35, 13.5, 13.8, [], M.brick, IN(-1));
  // южная стена: столовая, кухня (дверь и окно над мойкой), лестничный витраж, кладовая, прислуга, водитель
  wall(B, 'x', -11.58, 0.87, F0 - 0.3, F1 - 0.35, 4.98, ZS, [[-4.23, -3.24, F0, F0 + 2.4], [-2.85, -0.3, F0 + 1.05, F0 + 2.55]], M.render, IN(-1));
  glazing('x', -2.85, -0.3, 5.12, F0 + 1.05, F0 + 2.55, 2, [], 1);
  wall(B, 'x', 4.26, 13.8, F0 - 0.3, F1 - 0.35, 4.98, ZS, [[6.81, 7.5, F0 + 0.9, F0 + 2.6], [12.36, 13.35, F0, F0 + 2.3]], M.render, IN(-1));
  glazing('x', 6.81, 7.5, 5.12, F0 + 0.9, F0 + 2.6, 1, [], 1);
  doorway('x', -4.23, -3.24, F0, 2.4, 4.98, ZS, -1, 0);
  doorway('x', 12.36, 13.35, F0, 2.3, 4.98, ZS, -1, 1);
  // витраж гостиной к гольфу: две секции по сторонам колонны, фрамуга; угловое остекление к югу
  glazing('z', -4.02, ZS, XW, F0, CG, [-4.02, -2.84, -1.66, -0.48, 0.7, 1.84, 2.98, 4.12, 5.25], [F0 + 2.55], -1, { bar: 0.07, open: [-2.84, -1.66], doorTop: F0 + 2.55 });
  glazing('x', XW, -11.58, 5.12, F0, CG, 1, [F0 + 2.55], 1, { bar: 0.07 });
  B.box(XW, -11.58, CG, F1 - 0.35, 4.98, ZS, M.render);
  B.box(XW - 0.15, XW + 0.15, CG, F1 - 0.35, -4.02, ZS, M.render);       // ригель над витражом
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, CG - F0, 20), MI.wall); c.position.set(-12.72, (CG + F0) / 2, 0.7); add(c); col(-12.92, -12.52, F0, CG, 0.5, 0.9); }

  // ---------- дом: вход ----------
  // двухсветный витраж у входа (от пола до крыши) с поворотной медно-ржавой дверью
  glazing('x', 0.87, 2.7, -2.36, F0, F0 + 3.05, 1, [F0 + 2.55], -1);
  glazing('x', 0.87, 4.35, -2.36, F0 + 3.05, C1_TOP, [0.87, 2.03, 3.19, 4.35], [F1 + 0.5, F1 + 1.9], -1);
  B.box(2.7, 4.35, F0 + 3.0, F0 + 3.1, -2.42, -2.3, M.black);
  B.box(4.05, 4.35, F0, F0 + 3.05, -2.42, -2.3, M.black);
  const entryDoor = new THREE.Group();     // поворотная дверь 1,35 × 3,0 м, ось в 0,3 м от правого края
  entryDoor.position.set(3.75, 0, -2.36);
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.33, 3.0, 0.07), M.rust);
  doorLeaf.position.set(-0.36, F0 + 1.5, 0);
  entryDoor.add(doorLeaf);
  for (const z of [-0.06, 0.06]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), M.black); h.position.set(-0.86, F0 + 1.35, z); entryDoor.add(h); }
  entryDoor.userData.openAngle = 1.4;
  add(entryDoor);

  // ---------- дом: 2-й этаж, наружные стены ----------
  const RG = { batch: B, glass: M.railGlass, post: M.black, rail: M.black };
  // северная сторона глухая (спальня хозяина, гардеробная, ванная); стена продолжается до края рамы над балконом
  wall(B, 'x', XB, 0.87, F1 - 0.35, C1_TOP, ZN, zf(-4.80), [], M.render, IN(1));
  wall(B, 'x', 4.26, XE1, F1 - 0.35, C1_TOP, ZN, zf(-4.80), [], M.render, IN(1));
  B.box(XB, -12.31, F1, C1_TOP, zf(-4.80), zf(-4.58), M.render);               // торец рамы и угол у балкона
  B.box(-12.93, -12.31, F1, C1_TOP, zf(-4.58), zf(-4.05), M.render);
  col(XB, -12.31, F1, C1_TOP, ZN, zf(-4.05));
  // южная сторона: окно санузла спальни 2, окно малой гостиной в пол с наружным стеклом, глухо у спальни 4
  wall(B, 'x', XWF - 0.17, 0.87, F1 - 0.35, C1_TOP, zf(4.83), ZS, [[-7.22, -6.55, F1 + 1.4, F1 + 2.6], [-3.21, -0.62, F1, C1]], M.render, IN(-1));
  glazing('x', -7.22, -6.55, ZS - 0.12, F1 + 1.4, F1 + 2.6, 1, [], 1);
  glazing('x', -3.21, -0.62, ZS - 0.12, F1, C1, 2, [F1 + 2.45], 1);
  railing('x', -3.21, -0.62, ZS + 0.06, F1, RG);
  wall(B, 'x', 4.26, XE1, F1 - 0.35, C1_TOP, zf(4.83), ZS, [], M.render, IN(-1));
  // южная стенка рамы у гольфа
  B.box(XB, XWF - 0.17, F1, C1_TOP, zf(4.83), ZS, M.render);
  col(XB, XWF - 0.17, F1, C1_TOP, zf(4.83), ZS);
  // к гольфу: раздвижной витраж спальни хозяина на балкон и окно спальни 2 над карнизом с тёмной панелью по краю
  glazing('z', zf(-4.05), zf(0.614), XWF, F1, C1, 4, [F1 + 2.5], -1, { open: [zf(-4.05) + 2 * (zf(0.614) - zf(-4.05)) / 4, zf(-4.05) + 3 * (zf(0.614) - zf(-4.05)) / 4], doorTop: F1 + 2.5 });
  wall(B, 'z', zf(-4.05), zf(0.614), C1, C1_TOP, XWF - 0.17, XWF + 0.12, [], M.render, IN(1), false);
  wall(B, 'z', zf(0.614), zf(0.78), F1, C1_TOP, XWF - 0.17, XWF + 0.12, [], M.render, IN(1));
  wall(B, 'z', zf(0.78), zf(4.83), C1, C1_TOP, XWF - 0.17, XWF + 0.12, [], M.render, IN(1), false);
  glazing('z', zf(0.78), zf(4.83), XWF, F1 + 0.05, C1, 2, [F1 + 1.6], -1);
  B.box(XB, XB + 0.06, F1, F1 + 0.95, zf(0.78), zf(4.83), M.dark);
  col(XB, XWF - 0.17, F1, F1 + 1.1, zf(0.7), zf(4.83));
  B.box(XB, XWF - 0.17, C1_TOP - 0.06, C1_TOP, ZN, ZS, M.dark);                // тёмный софит рамы
  // вынос плиты над витражом гостиной: снизу светильники (на фото фасада — два круглых)
  for (const z of [-2.4, 0.9, 3.6]) { const d = new THREE.CircleGeometry(0.07, 14); d.rotateX(Math.PI / 2); d.translate(-13.55, F1 - 0.353, z); B.geo(d, MI.downlight); }
  // ламели-экран у северного края витража спальни хозяина (на фото фасада — слева за стеклом)
  for (let z = zf(-4.05) + 0.06; z < zf(-3.15); z += 0.11) B.box(XWF - 0.26, XWF - 0.2, F1, C1, z - 0.025, z + 0.025, M.dark);
  // балкон спальни хозяина: стеклянное ограждение с чёрным круглым поручнем
  railing('z', zf(-4.58), zf(0.614), XB + 0.08, F1, RG);
  railing('x', XB + 0.08, XWF - 0.17, zf(0.614), F1, RG);
  // восток (к улице): витражи спален 3 и 4 на балконы, стенка между балконами
  wall(B, 'z', ZN, zf(1.141), F1 - 0.35, C1_TOP, 12.17, XE1, [[zf(-3.145), zf(-0.602), F1, C1]], M.render, IN(-1));
  wall(B, 'z', zf(1.141), ZS, F1 - 0.35, C1_TOP, 12.17, XE1, [[zf(1.141), zf(4.83), F1, C1]], M.render, IN(-1));
  glazing('z', zf(-3.145), zf(-0.602), 12.33, F1, C1, 3, [F1 + 2.5], 1, { open: [zf(-3.145) + (zf(-0.602) - zf(-3.145)) / 3, zf(-3.145) + 2 * (zf(-0.602) - zf(-3.145)) / 3], doorTop: F1 + 2.5 });
  glazing('z', zf(1.141), zf(4.83), 12.33, F1, C1, 4, [F1 + 2.5], 1, { open: [zf(1.141) + (zf(4.83) - zf(1.141)) / 4, zf(1.141) + 2 * (zf(4.83) - zf(1.141)) / 4], doorTop: F1 + 2.5 });
  B.box(XE1, XEB, F1, C1_TOP, zf(-0.602), zf(-0.457), M.render);
  col(XE1, XEB, F1, C1_TOP, zf(-0.602), zf(-0.457));
  railing('z', ZN + 0.1, zf(-0.602), XEB - 0.08, F1, RG);
  railing('z', zf(1.03), ZS - 0.1, XEB - 0.08, F1, RG);
  railing('x', XE1, XEB, ZN + 0.12, F1, RG);
  railing('x', XE1, XEB, zf(1.03), F1, RG);
  railing('x', XE1, XEB, ZS - 0.12, F1, RG);
  B.box(XE1, XEB, C1_TOP - 0.06, C1_TOP, ZN, ZS, M.dark);
  // стенки второго света над входом
  wall(B, 'z', -2.36, -0.62, F1 - 0.35, C1_TOP, 0.36, 0.87, [], M.render, IN(-1));
  wall(B, 'z', ZN, -0.62, F1 - 0.35, C1_TOP, 4.26, 4.6, [], M.render, IN(1));
  B.box(0.87, 4.26, C1_TOP - 0.06, C1_TOP, ZN, -2.36, M.dark);
  // лестничный витраж на два этажа (южный фасад)
  glazing('x', 0.87, 4.26, 5.12, F0, C1_TOP, [0.87, 2.0, 3.13, 4.26], [F0 + 2.5, F1 - 0.2, F1 + 2.5], 1, { bar: 0.07 });
  wall(B, 'z', 4.98, ZS, 0, C1_TOP, 0.72, 0.87, [], M.render, null);
  B.box(0.72, 4.44, C1_TOP - 0.05, C1_TOP, 4.98, ZS, M.render);

  // ===================================================================================================================
  // ---------- интерьер 1-го этажа ----------
  const floorAt = (x0, x1, z0, z1, y, mat = MI.floor) => ib.box(x0, x1, y, y + 0.006, z0, z1, mat);
  floorAt(-12.84, 0.87, -4.32, 4.98, F0);           // гостиная, столовая, малая гостиная — единое пространство
  floorAt(-5.0, 0.15, -4.92, -4.32, F0);            // эркер
  floorAt(0.87, 4.35, -2.36, 4.98, F0);             // холл и лестница
  floorAt(4.62, 6.54, -0.57, 3.0, F0);              // коридор
  floorAt(6.72, 11.94, -4.56, 1.38, F0);            // гостевая спальня
  floorAt(4.44, 6.6, 3.0, 4.98, F0);                // кладовая
  floorAt(6.69, 8.82, 1.53, 4.98, F0);              // прислуга
  floorAt(11.07, 13.5, 1.2, 4.98, F0);              // водитель
  floorAt(-5.13, 0.72, 1.11, 4.98, F0 + 0.003, MI.kitchenFloor);
  for (const [x0, x1, z0, z1] of [[4.62, 6.54, -4.56, -0.6], [8.97, 11.94, -0.42, 1.38], [8.97, 10.86, 1.59, 3.18], [9.03, 10.92, 3.39, 4.98]]) floorAt(x0, x1, z0, z1, F0 + 0.004, MI.bathFloor);
  walkOn(XW, 12.24, -4.59, ZS, F0);
  walkOn(-5.31, 0.15, ZN, -4.59, F0);
  walkOn(4.62, 12.24, ZN, -4.59, F0);
  walkOn(12.24, 13.8, 0.9, ZS, F0);
  // перегородки 1-го этажа (толщины и проёмы — по плану)
  partition('x', -5.28, 0.87, 0.84, 1.11, F0, CG_TOP);                                        // кухня — гостиная (длинная стена на видео)
  partition('z', 1.11, 4.98, -5.28, -5.13, F0, CG_TOP, [[2.01, 3.0, -1, 0]]);                 // кухня — столовая
  partition('z', 1.11, 4.98, 0.72, 0.87, F0, F1, [[1.38, 2.38, -1, 0]], 2.05);                 // кухня — лестница (дверь под вторым маршем)
  partition('z', 1.02, 4.98, 4.26, 4.44, F0, F1);                                             // лестница — кладовые
  partition('x', 4.44, 5.22, 0.84, 0.99, F0, CG);                                             // шкафы у коридора
  partition('x', 4.44, 6.63, 2.85, 3.0, F0, CG, [[5.22, 6.18, -1, 1]]);                       // кладовая
  partition('z', 3.0, 4.98, 6.54, 6.69, F0, CG);
  partition('z', 0.63, 3.0, 6.54, 6.72, F0, CG, [[1.6, 2.5, 1, 0]]);                          // комната прислуги
  partition('x', 6.72, 11.94, 1.38, 1.53, F0, CG);
  partition('z', 1.53, 4.98, 8.82, 8.97, F0, CG, [[1.71, 2.58, 1, 0]]);                       // санузел прислуги
  partition('x', 8.97, 10.86, 3.18, 3.39, F0, CG);
  partition('z', 1.53, 4.98, 10.86, 11.07, F0, CG, [[3.9, 4.77, -1, 1]]);                     // санузел водителя
  partition('z', -4.56, 0.63, 6.54, 6.72, F0, CG, [[-0.36, 0.55, 1, 1]]);                     // гостевая спальня
  partition('x', 8.43, 11.94, -0.69, -0.42, F0, CG);
  partition('z', -0.42, 1.38, 8.82, 8.97, F0, CG, [[0.0, 0.85, 1, 0]]);
  partition('x', 4.62, 6.54, -2.58, -2.43, F0, CG, [[5.4, 6.3, 1, 0]]);                       // санузел у входа
  partition('x', 4.62, 5.31, -0.75, -0.57, F0, CG);
  partition('z', -0.6, 0.84, 4.35, 4.62, F0, CG, [[-0.57, 0.84, 0]], 2.6);                    // проход холл — коридор
  // кухня: длинный ряд у стены к гостиной — низ венге, белая глянцевая столешница-кварц, стекло, белые глянцевые верхние шкафы
  {
    const w = onWall('x', 1.11, 1);
    w.box(-4.95, 0.55, F0, F0 + 0.1, 0.05, 0.55, MI.slot);
    w.box(-4.95, 0.55, F0 + 0.1, F0 + 0.87, 0, 0.6, MI.wenge, true);
    w.box(-4.95, 0.55, F0 + 0.87, F0 + 0.91, 0, 0.62, MI.counter);
    w.box(-4.95, 0.55, F0 + 0.91, F0 + 1.5, 0, 0.012, MI.splash);
    w.box(-4.95, 0.55, F0 + 1.5, F0 + 2.3, 0, 0.36, MI.gloss);
    for (let u = -4.95; u < 0.5; u += 0.6) w.box(u + 0.297, u + 0.303, F0 + 1.52, F0 + 2.28, 0.36, 0.365, MI.slot);
    w.box(-0.75, -0.15, F0 + 1.55, F0 + 2.25, 0.362, 0.37, MI.glass);       // витрины со стеклом (видео)
    w.box(-1.35, -0.75, F0 + 1.55, F0 + 2.25, 0.362, 0.37, MI.glass);
    w.box(-3.6, -2.85, F0 + 0.91, F0 + 0.93, 0.06, 0.56, MI.steel);         // варочная панель
    w.box(-3.62, -2.83, F0 + 0.1, F0 + 0.8, 0.6, 0.61, MI.steel);           // духовка
    w.box(-3.55, -2.9, F0 + 1.45, F0 + 1.55, 0, 0.5, MI.steel);             // вытяжка
    for (let u = -4.95; u < 0.5; u += 0.6) w.box(u + 0.05, u + 0.55, F0 + 0.72, F0 + 0.74, 0.6, 0.615, MI.chrome);
  }
  { // ряд у окна: мойка под окном, колонна холодильника у стены столовой
    const w = onWall('x', 4.98, -1);
    w.box(-3.15, 0.55, F0, F0 + 0.87, 0, 0.6, MI.wenge, true);
    w.box(-3.15, 0.55, F0 + 0.87, F0 + 0.91, 0, 0.62, MI.counter);
    w.box(-2.0, -1.2, F0 + 0.86, F0 + 0.92, 0.12, 0.5, MI.steel);
    placed(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), w, -1.6, F0 + 1.05, 0.08, MI.chrome);
    w.box(-5.13 + 0.0, -4.4, F0, F0 + 2.3, 0, 0.65, MI.wenge, true);
  }
  // санузел у входа и умывальная с двумя раковинами (план), гостевой санузел, санузлы прислуги и водителя
  toilet(onWall('z', 4.62, 1), -4.2, F0);
  vanity(onWall('z', 4.62, 1), -3.6, -2.8, F0);
  vanity(onWall('z', 4.62, 1), -2.3, -0.9, F0, 2);
  for (const [x0, x1, z0, z1] of [[4.62, 6.54, -4.56, -2.58], [8.97, 11.94, -0.42, 1.38], [8.97, 10.86, 1.59, 3.18], [9.03, 10.92, 3.39, 4.98]]) ceiling(x0, x1, z0, z1, F0 + 2.7);
  vanity(onWall('x', -0.42, 1), 9.2, 10.2, F0);
  toilet(onWall('z', 11.94, -1), 0.8, F0);
  shower(10.6, 11.94, -0.42, 0.6, F0, ['x', 10.6, 11.94, 0.6]);
  vanity(onWall('z', 8.97, 1), 2.6, 3.1, F0);
  toilet(onWall('x', 1.59, 1), 9.6, F0);
  shower(9.9, 10.86, 2.2, 3.18, F0, ['z', 2.2, 3.18, 9.9]);
  vanity(onWall('z', 9.03, 1), 3.6, 4.1, F0);
  toilet(onWall('x', 4.98, -1), 9.7, F0);
  shower(10.0, 10.92, 3.39, 4.2, F0, ['x', 10.0, 10.92, 4.2]);
  // шкафы в коридоре (на плане — две складные двери), полки кладовой
  wardrobe('z', 1.0, 2.85, 4.44, 1, F0, 0.7, 2.4);
  for (const y of [0.6, 1.1, 1.6, 2.1]) { ib.box(4.5, 6.45, F0 + y, F0 + y + 0.03, 4.5, 4.95, MI.wenge); }
  col(4.5, 6.45, F0, F0 + 2.2, 4.5, 4.95);
  // потолки 1-го этажа: кессоны в гостиной и спальне, ровные в кухне, коридорах и санузлах
  ceiling(-12.84, -5.31, -4.32, 4.98, CG, 0.55, CG_TOP - CG - 0.05);
  ceiling(-5.31, 0.72, -4.92, 0.84, CG, 0.5, CG_TOP - CG - 0.05);
  ceiling(-5.13, 0.72, 1.11, 4.98, CG);
  ceiling(0.87, 4.35, -0.62, 0.85, CG);         // под галереей; остальное над холлом и лестницей — второй свет
  ceiling(4.62, 6.54, -2.43, 3.0, F0 + 2.85);
  ceiling(6.72, 11.94, -4.56, -0.69, CG, 0.45, 0.22);
  ceiling(6.72, 8.82, -0.69, 1.38, F0 + 2.85);
  ceiling(6.69, 8.82, 1.53, 4.98, F0 + 2.85);
  ceiling(11.07, 13.5, 1.53, 4.98, F0 + 2.85);
  ceiling(4.44, 6.54, 3.0, 4.98, F0 + 2.85);

  // ---------- лестница: П-образная, 21 подъём, светлый мрамор с бороздками, стекло и поручень из нержавейки ----------
  const T1 = 0.28, T2 = 0.257, Z1 = 0.9, ZL = Z1 + 9 * T1;   // первый марш на юг к витражу, площадка, второй марш на север
  const LAND = F0 + 10 * RISE;
  const FX = [3.15, 4.26], SX = [0.87, 2.1];                   // марши: первый у восточной стены, второй у кухни
  function stepBox(x0, x1, z0, z1, top) {
    ib.box(x0, x1, top - 0.03, top, z0, z1, MI.stoneStair);
    ib.box(x0, x1, top - RISE, top - 0.03, z0, z0 + 0.02, MI.stoneStair);
    ib.box(x0 + 0.05, x1 - 0.05, top + 0.0005, top + 0.002, z0 + 0.03, z0 + 0.06, MI.groove);
    walkOn(x0, x1, z0, z1, top);
  }
  for (let i = 1; i <= 9; i++) {                                // первый марш: ступени на сплошном основании
    const z0 = Z1 + (i - 1) * T1, top = F0 + i * RISE;
    stepBox(FX[0], FX[1], z0, z0 + T1, top);
    ib.box(FX[0], FX[1], F0, top - RISE, z0, z0 + T1, MI.wall);
  }
  ib.box(SX[0], FX[1], LAND - 0.25, LAND - 0.03, ZL, 4.98, MI.wall);   // площадка у витража
  ib.box(SX[0], FX[1], LAND - 0.03, LAND, ZL, 4.98, MI.stoneStair);
  walkOn(SX[0], FX[1], ZL, 4.98, LAND);
  for (let j = 1; j <= 10; j++) {                               // второй марш над дверью кухни: наклонная плита снизу
    const z1 = ZL - (j - 1) * T2, top = LAND + j * RISE;
    ib.box(SX[0], SX[1], top - 0.03, top, z1 - T2, z1, MI.stoneStair);
    ib.box(SX[0], SX[1], top - RISE, top - 0.03, z1 - 0.02, z1, MI.stoneStair);
    ib.box(SX[0] + 0.05, SX[1] - 0.05, top + 0.0005, top + 0.002, z1 - 0.06, z1 - 0.03, MI.groove);
    walkOn(SX[0], SX[1], z1 - T2, z1, top);
  }
  { // наклонная плита второго марша (белая штукатурка снизу — видна над дверью кухни)
    const zA = ZL, yA = LAND - 0.25, zB = ZL - 10 * T2, yB = F1 - 0.35;
    const s = new THREE.Shape([new THREE.Vector2(zA, yA), new THREE.Vector2(zB, yB), new THREE.Vector2(zB, F1 - 0.03), new THREE.Vector2(zA, LAND + 0.2)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: SX[1] - SX[0], bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    g.translate(SX[1], 0, 0);
    ib.geo(g, MI.wall);
  }
  // ограждения: вдоль колодца по обоим маршам и по краю площадки, по краям галереи над вторыми светами
  slopeRail(FX[0] + 0.03, Z1, F0, ZL, LAND - RISE);
  slopeRail(SX[1] - 0.03, ZL, LAND, ZL - 10 * T2, F1 - RISE);
  railing('x', SX[1], FX[0], ZL + 0.04, LAND);
  railing('x', 0.87, 4.26, -0.6, F1);                           // галерея ↔ второй свет над входом
  railing('x', SX[1], 4.26, 0.86, F1);                          // галерея ↔ проём над первым маршем
  railing('z', 1.84, 4.6, 0.8, F1);                             // малая гостиная ↔ проём лестницы
  ib.box(0.87, 4.26, F1 - 0.35, F1, -0.62, 0.85, MI.ceiling);   // торцы галереи

  // ===================================================================================================================
  // ---------- интерьер 2-го этажа ----------
  const Z = zf;
  floorAt(XWF + 0.12, 0.87, ZN + 0.27, ZS - 0.3, F1);
  floorAt(0.87, 4.26, -0.62, 0.85, F1);
  floorAt(4.26, 12.17, ZN + 0.27, ZS - 0.3, F1);
  for (const [x0, x1, z0, z1] of [[-2.94, 0.36, Z(-4.76), Z(-0.77)], [-7.24, -4.35, Z(3.03), ZS - 0.3], [4.6, 6.6, Z(-4.56), Z(-2.0)], [4.74, 7.62, Z(0.996), Z(2.866)]]) floorAt(x0, x1, z0, z1, F1 + 0.004, MI.bathFloor);
  ib.box(XB + 0.02, XWF - 0.17, F1 - 0.02, F1, Z(-4.58), Z(0.614), MI.bathFloor);   // плитка балконов
  ib.box(XE1, XEB - 0.02, F1 - 0.02, F1, ZN + 0.02, Z(-0.602), MI.bathFloor);
  ib.box(XE1, XEB - 0.02, F1 - 0.02, F1, Z(1.03), ZS - 0.02, MI.bathFloor);
  // спальня хозяина, гардеробная, ванная
  partition('x', XWF + 0.12, -4.4, Z(0.614), Z(0.778), F1, C1_TOP);                 // хозяйская — спальня 2
  partition('z', Z(-4.16), Z(-1.31), -6.48, -6.32, F1, C1_TOP);                      // гардеробная
  ib.box(-6.48, -5.4, F1, C1_TOP, ZN + 0.27, Z(-4.16), MI.wall); col(-6.48, -5.4, F1, C1_TOP, ZN, Z(-4.16));
  partition('x', -6.3, -5.63, Z(-1.456), Z(-1.31), F1, C1_TOP);
  partition('z', Z(-1.51), Z(-0.475), -4.35, -4.17, F1, C1_TOP);
  partition('z', Z(-0.475), Z(0.487), -4.35, -4.17, F1, C1_TOP, [[Z(-0.475), Z(0.487), -1, 1]], 2.2);  // дверь хозяйской
  partition('x', -4.17, -3.12, Z(-0.875), Z(-0.602), F1, C1_TOP);
  partition('z', Z(-4.76), Z(-0.6), -3.1, -2.94, F1, C1_TOP, [[Z(-3.126), Z(-2.255), 1, 0]]);
  partition('x', -2.93, 0.36, Z(-0.766), Z(-0.62), F1, C1_TOP);
  ib.box(-0.1, 0.63, F1, C1_TOP, ZN + 0.27, Z(-3.544), MI.wall); col(-0.1, 0.63, F1, C1_TOP, ZN, Z(-3.544));
  partition('z', Z(-3.53), Z(-0.62), 0.36, 0.63, F1, C1_TOP);
  wardrobe('z', Z(-4.16), Z(-1.46), -6.32, 1, F1, 0.6, 2.6);                         // шкафы венге (видео)
  wardrobe('x', -5.4, -3.12, Z(-4.80), 1, F1, 0.6, 2.6);
  { // ванная хозяина: ванна у восточной стены, душ и унитаз у северной, двойная тумба у южной
    ib.box(-0.62, 0.34, F1, F1 + 0.55, Z(-3.6), Z(-1.5), MI.bathWall);
    ib.box(-0.54, 0.26, F1 + 0.551, F1 + 0.556, Z(-3.52), Z(-1.58), MI.porcelain);
    col(-0.62, 0.36, F1, F1 + 0.55, Z(-3.6), Z(-1.5));
    shower(-1.0, 0.34, Z(-4.76), Z(-3.75), F1, ['x', -1.0, 0.34, Z(-3.75)]);
    toilet(onWall('x', Z(-4.76), 1), -2.2, F1);
    vanity(onWall('x', Z(-0.766), -1), -2.75, -1.25, F1, 2);
    onWall('z', 0.36, -1).box(Z(-4.76), Z(-0.77), F1, F1 + 2.6, 0, 0.012, MI.bathWall);
  }
  // спальня 2 и её санузел
  partition('z', Z(0.487), Z(1.813), -4.35, -4.17, F1, C1_TOP);
  partition('z', Z(1.813), Z(2.776), -4.35, -4.17, F1, C1_TOP, [[Z(1.813), Z(2.776), -1, 0]], 2.2);
  partition('z', Z(2.776), ZS - 0.3, -4.35, -4.17, F1, C1_TOP);
  partition('x', -7.4, -4.37, Z(2.884), Z(3.03), F1, C1_TOP, [[-6.42, -5.51, -1, 1]]);
  partition('z', Z(3.03), ZS - 0.3, -7.4, -7.24, F1, C1_TOP);
  vanity(onWall('z', -7.24, 1), Z(3.4), Z(4.2), F1);
  toilet(onWall('x', ZS - 0.3, -1), -5.9, F1);
  shower(-5.1, -4.35, Z(3.4), ZS - 0.3, F1, ['z', Z(3.4), ZS - 0.3, -5.1]);
  // малая гостиная 2-го этажа: опоры у проёма лестницы
  ib.box(0.57, 0.87, F1, C1_TOP, Z(0.687), Z(1.795), MI.wall); col(0.57, 0.87, F1, C1_TOP, Z(0.687), Z(1.795));
  ib.box(0.57, 0.87, F1, C1_TOP, Z(4.501), ZS - 0.3, MI.wall); col(0.57, 0.87, F1, C1_TOP, Z(4.501), ZS);
  // восточная часть: санузел 3, спальня 3, холл с бельевым шкафом, спальня 4 с санузлом и шкафом
  partition('z', Z(-3.853), Z(-0.602), 4.26, 4.6, F1, C1_TOP);
  ib.box(4.26, 5.06, F1, C1_TOP, ZN + 0.27, Z(-3.853), MI.wall); col(4.26, 5.06, F1, C1_TOP, ZN, Z(-3.853));
  partition('x', 4.6, 6.6, Z(-2.0), Z(-1.837), F1, C1_TOP, [[5.5, 6.41, -1, 1]]);
  partition('z', ZN + 0.27, Z(-1.855), 6.6, 6.77, F1, C1_TOP);
  partition('x', 4.6, 12.17, Z(-0.766), Z(-0.602), F1, C1_TOP, [[4.74, 5.77, -1, 0]]);
  partition('z', Z(-0.602), Z(0.996), 6.08, 6.29, F1, C1_TOP, [[Z(-0.44), Z(0.524), 1, 0]]);
  partition('x', 6.29, 7.85, Z(0.778), Z(0.996), F1, C1_TOP);
  partition('z', Z(0.996), Z(3.084), 7.62, 7.85, F1, C1_TOP);
  partition('x', 4.74, 7.62, Z(2.866), Z(3.084), F1, C1_TOP, [[5.83, 6.75, 1, 0]]);
  partition('z', Z(0.614), Z(3.193), 4.26, 4.74, F1, C1_TOP);                        // стена лестницы
  partition('z', Z(3.193), ZS - 0.3, 4.26, 4.49, F1, C1_TOP);
  wardrobe('z', Z(3.25), ZS - 0.35, 4.49, 1, F1, 0.6, 2.6);                          // шкаф спальни 4
  wardrobe('x', 4.78, 6.06, Z(0.996), -1, F1, 0.4, 2.4);                             // бельевой шкаф в холле
  shower(5.1, 6.5, Z(-4.56), Z(-3.85), F1, ['x', 5.1, 6.5, Z(-3.85)]);
  toilet(onWall('z', 6.6, -1), Z(-3.1), F1);
  vanity(onWall('z', 4.6, 1), Z(-3.6), Z(-2.6), F1);
  shower(6.75, 7.62, Z(1.0), Z(2.0), F1, ['z', Z(1.0), Z(2.0), 6.75]);
  toilet(onWall('x', Z(0.996), 1), 6.6, F1);
  vanity(onWall('z', 4.74, 1), Z(1.9), Z(2.7), F1);
  // потолки 2-го этажа: кессоны в спальнях и малой гостиной
  const R1 = C1_TOP - C1 - 0.05;
  ceiling(XWF + 0.12, -6.48, ZN + 0.27, Z(0.614), C1, 0.5, R1);
  ceiling(-6.32, -3.1, ZN + 0.27, Z(-1.31), F1 + 2.75);
  ceiling(-6.48, -4.35, Z(-1.31), Z(0.614), F1 + 2.75);
  ceiling(-2.94, 0.36, ZN + 0.27, Z(-0.766), F1 + 2.7);
  ceiling(XWF + 0.12, -4.35, Z(0.778), ZS - 0.3, C1, 0.45, R1 * 0.8);
  ceiling(-7.24, -4.35, Z(3.03), ZS - 0.3, F1 + 2.7);
  ceiling(-4.17, 0.57, Z(-0.602), ZS - 0.3, C1, 0.4, R1 * 0.8);
  ceiling(0.87, 4.26, -0.62, 0.85, C1);
  ceiling(4.6, 6.6, ZN + 0.27, Z(-2.0), F1 + 2.7);
  ceiling(6.77, 12.17, ZN + 0.27, Z(-0.766), C1, 0.45, R1 * 0.8);
  ceiling(4.6, 6.08, Z(-1.837), Z(0.614), F1 + 2.9);
  ceiling(4.74, 12.17, Z(0.996), ZS - 0.3, C1, 0.45, R1 * 0.8);
  ceiling(4.74, 7.62, Z(0.996), Z(2.866), F1 + 2.7);
  ib.box(0.87, 4.26, C1_TOP - 0.04, C1_TOP, -2.36, -0.62, MI.ceiling);    // потолок над вторым светом у входа
  ib.box(0.87, 4.26, C1_TOP - 0.04, C1_TOP, 0.85, 4.98, MI.ceiling);      // и над лестницей
  for (const [x, z, y] of [[2.6, 0.1, C1], [-1.8, 0.0, C1], [5.3, -0.1, F1 + 2.9]]) grilleAC(x, z, y);
  // плоские круглые плафоны второго света (видео)
  for (const [x, z] of [[2.6, -1.5], [2.6, 2.9]]) { const d = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20); d.translate(x, C1_TOP - 0.07, z); ib.geo(d, MI.downlight); }

  B.flush(root);
  ib.flush(root);

  // ---------- комнаты (подписи при прогулке) ----------
  const rooms = [
    { name: 'Гостиная и столовая · окна в пол на гольф', box: [XW, -5.31, F0, CG_TOP, -4.32, 4.98] },
    { name: 'Малая гостиная с эркером', box: [-5.31, 0.87, F0, CG_TOP, -4.92, 0.84] },
    { name: 'Кухня', box: [-5.13, 0.72, F0, CG_TOP, 1.11, 4.98] },
    { name: 'Входной холл · второй свет', box: [0.87, 4.35, F0, F1, -2.36, 0.9] },
    { name: 'Лестница · витраж на два этажа', box: [0.87, 4.26, F0, F1 + 0.5, 0.9, 4.98] },
    { name: 'Санузел и умывальная', box: [4.62, 6.54, F0, CG, -4.56, -0.6] },
    { name: 'Коридор, шкафы, кладовая', box: [4.44, 6.6, F0, CG, -0.6, 4.98] },
    { name: 'Гостевая спальня с санузлом', box: [6.72, 11.94, F0, CG, -4.56, 1.38] },
    { name: 'Комната прислуги с санузлом', box: [6.69, 10.86, F0, CG, 1.53, 4.98] },
    { name: 'Комната водителя', box: [10.86, 13.5, F0, CG, 1.53, 4.98] },
    { name: 'Крыльцо · вход', box: [0.87, 4.35, 0, 4, ZN - 0.4, -2.36] },
    { name: 'Терраса и двор к гольфу', box: [PX0, XW, 0, 3, PZ0, PZ1] },
    { name: 'Спальня хозяина · балкон на гольф', box: [XWF, -6.32, F1, C1_TOP, ZN, Z(0.614)] },
    { name: 'Гардеробная хозяина', box: [-6.48, -3.1, F1, C1_TOP, ZN, Z(0.614)] },
    { name: 'Ванная хозяина', box: [-3.1, 0.63, F1, C1_TOP, ZN, Z(-0.62)] },
    { name: 'Балкон спальни хозяина', box: [XB, XWF, F1, C1_TOP, ZN, Z(0.614)] },
    { name: 'Спальня 2 с санузлом', box: [XWF, -4.17, F1, C1_TOP, Z(0.778), ZS] },
    { name: 'Малая гостиная 2-го этажа', box: [-4.17, 0.87, F1, C1_TOP, Z(-0.602), ZS] },
    { name: 'Галерея между вторыми светами', box: [0.87, 4.26, F1, C1_TOP, -0.62, 0.86] },
    { name: 'Спальня 3 · балкон к улице', box: [4.6, XEB, F1, C1_TOP, ZN, Z(-0.602)] },
    { name: 'Спальня 4 · балкон к улице', box: [4.49, XEB, F1, C1_TOP, Z(-0.457), ZS] },
    { name: 'Навес для машин', box: [13.8, PX1, 0, 3.1, 0.9, PZ1] },
    { name: 'Двор вдоль дома', box: [-16, PX1, 0, 3, PZ0, PZ1] }
  ];
  // ---------- ракурсы, точки появления, пролёт ----------
  const views = {
    start: { pos: [-41, 15, -12], target: [-4, 3.4, 0.5] },
    golf: { pos: [-44, 5.5, -4], target: [-8, 4, 0] },
    street: { pos: [33, 5.5, -13], target: [6, 3.5, -1] },
    back: { pos: [-20.4, 1.7, -5.5], target: [-10, 4.2, 1] },
    top: { pos: [-0.5, 70, 0.1], target: [-0.5, 0, 0] },
    gf: { pos: [-0.4, 46, 15], target: [-0.4, 0, 1.5], clip: F0 + 2.3 },
    ff: { pos: [-0.4, 50, 15], target: [-0.4, 3.7, 1.5], clip: F1 + 2.3 }
  };
  const spawns = {
    entry: { pos: [3.35, 0.03, -7.2], yaw: Math.PI, label: 'у входа' },
    living: { pos: [-8.5, F0, 0.4], yaw: Math.PI / 2, label: 'в гостиной' },
    upstairs: { pos: [2.6, F1, 0.1], yaw: Math.PI / 2, label: 'на 2-м этаже' },
    balcony: { pos: [-13.4, F1, -2.0], yaw: Math.PI / 2, label: 'на балконе' },
    garden: { pos: [-18.5, 0.03, 2.0], yaw: -Math.PI / 2, label: 'во дворе' }
  };
  const E0 = F0 + 1.6, E1 = F1 + 1.6, st = (k) => F0 + k * RISE + 1.6;
  const tour = [
    { pos: [18.6, 1.7, -6.7], look: [6.0, 2.4, -6.2], label: 'Дорожка от улицы к входу', hold: 1.0 },
    { pos: [8.0, 1.7, -6.8], look: [3.0, 2.8, -4.5] },
    { pos: [3.4, 1.75, -6.4], look: [3.4, 3.6, -2.4], label: 'Крыльцо под двухсветным порталом' },
    { pos: [3.3, E0, -3.4], look: [3.2, 4.2, -1.0] },
    { pos: [3.0, E0, -1.4], look: [2.4, 6.5, 0.2], label: 'Входной холл · второй свет до крыши', hold: 1.2 },
    { pos: [1.4, E0, -1.2], look: [-4.0, 2.2, -1.5] },
    { pos: [-2.2, E0, -1.6], look: [-3.0, 2.2, -5.0], label: 'Малая гостиная с эркером' },
    { pos: [-5.0, E0, -1.2], look: [-12.0, 2.4, -0.5] },
    { pos: [-8.6, E0, -0.2], look: [-16.0, 2.6, 0.5], label: 'Гостиная: витраж на гольф и колонна', hold: 1.5 },
    { pos: [-10.6, E0, 2.6], look: [-14.0, 2.2, 6.0], label: 'Столовая · угловое остекление' },
    { pos: [-7.0, E0, 2.6], look: [-4.0, 2.2, 2.5] },
    { pos: [-5.4, E0, 2.5], look: [-2.0, 2.3, 1.6] },
    { pos: [-3.2, E0, 2.6], look: [-2.0, 2.0, 1.3], label: 'Кухня' },
    { pos: [-1.0, E0, 1.9], look: [2.0, 2.2, 1.9] },
    { pos: [0.8, E0, 1.9], look: [3.0, 2.4, 1.0] },
    { pos: [2.6, E0, 0.4], look: [3.7, 2.8, 3.0], label: 'Лестница к витражу' },
    { pos: [3.7, st(1.5), 1.1], look: [3.7, st(6), 3.4], speed: 0.9 },
    { pos: [3.7, st(8), 3.0], look: [3.0, st(10), 4.6], speed: 0.9 },
    { pos: [2.6, st(10), 4.3], look: [1.4, st(12), 3.0], speed: 0.9, label: 'Площадка у витража на два этажа' },
    { pos: [1.5, st(11), 3.3], look: [1.5, st(16), 1.2], speed: 0.9 },
    { pos: [1.5, st(18), 1.6], look: [1.5, E1, -0.6], speed: 0.9 },
    { pos: [1.6, E1, 0.1], look: [3.0, 5.5, -2.4], label: 'Галерея между вторыми светами', hold: 1.0 },
    { pos: [0.0, E1, 0.0], look: [-3.0, E1, 0.0] },
    { pos: [-3.4, E1, 0.0], look: [-6.0, E1, -0.5] },
    { pos: [-5.4, E1, -0.6], look: [-5.2, 5.4, -3.6], label: 'Гардеробная хозяина' },
    { pos: [-7.0, E1, -1.2], look: [-13.0, 5.6, -2.0] },
    { pos: [-11.0, E1, -2.0], look: [-21.0, 5.0, -1.5], label: 'Спальня хозяина · вид на гольф', hold: 1.2 },
    { pos: [-13.4, E1, -2.0], look: [-31.0, 4.2, -3.0], label: 'Балкон: гольф, акация, озеро справа', hold: 1.5 },
    { pos: [-10.6, E1, -1.0], look: [-6.5, E1, 0.0] },
    { pos: [-5.0, E1, 0.0], look: [-1.0, E1, 0.0] },
    { pos: [-3.2, E1, 0.6], look: [-1.6, 5.0, 4.5] },
    { pos: [-2.2, E1, 2.8], look: [-1.7, 5.0, 6.0], label: 'Малая гостиная 2-го этажа' },
    { pos: [-3.6, E1, 2.4], look: [-9.5, 5.3, 2.6] },
    { pos: [-5.8, E1, 2.6], look: [-12.0, 5.2, 3.0] },
    { pos: [-8.4, E1, 2.6], look: [-14.5, 5.2, 2.8], label: 'Спальня 2', hold: 0.8 },
    { pos: [-5.6, E1, 2.4], look: [-3.0, E1, 2.3] },
    { pos: [-3.4, E1, 1.4], look: [0.0, E1, 0.3] },
    { pos: [2.6, E1, 0.2], look: [6.0, E1, 0.2] },
    { pos: [5.4, E1, 0.1], look: [7.0, E1, 2.0] },
    { pos: [8.0, E1, 2.6], look: [14.0, 5.0, 3.0], label: 'Спальня 4 · балкон к улице', hold: 1.0 },
    { pos: [5.5, E1, 0.2], look: [5.3, E1, -2.0] },
    { pos: [6.6, E1, -1.4], look: [12.0, 5.2, -2.2], label: 'Спальня 3' },
    { pos: [11.0, E1, -2.2], look: [15.0, 4.6, -2.4] },
    { pos: [24.0, 12.0, -10.0], look: [4.0, 3.5, 0.0], label: 'Дом с улицы' },
    { pos: [2.0, 24.0, -30.0], look: [-2.0, 3.0, 0.0] },
    { pos: [-36.0, 12.0, -16.0], look: [-4.0, 3.0, 0.0], label: 'Дом со стороны гольфа', hold: 0.5 }
  ];
  const inside = (p) => p.x > XB - 0.3 && p.x < 13.9 && p.z > ZN - 0.3 && p.z < ZS + 0.3 && p.y < PARA;
  return { root, views, tour, doors: [entryDoor, ...sliders], phys, spawns, rooms, inside };
}
