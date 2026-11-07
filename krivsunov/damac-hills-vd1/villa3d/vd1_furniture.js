// Мебель и аксессуары VD-1 в стиле «киберпанк / геймер»: модели реальных вещей — Poly Haven (CC0) и Sketchfab (CC BY,
// копии из открытого набора Objaverse; авторы и лицензии — furniture/credits.json и подвал сайта). Каждая модель обработана
// заранее (gltf-transform): метры и реальный размер, низ по центру в начале координат, упрощение, текстуры WebP. Геометрия
// без Draco: его декодер (воркер на WASM) ронял Safari 26.2 — ошибка JIT-компилятора WebKit; GLB и так уходят сжатыми (gzip).
// addFurniture(THREE, root, opts) → Promise<{ group, setLights(k) }>: ставит всё по комнатам, добавляет неоновые и RGB-ленты,
// экран телевизора, препятствия для прогулки (opts.phys.colliders). opts: { quality, F0, F1, colliders: true|false }
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE = new URL('./furniture/', import.meta.url).href;
const VER = 'vd1-furn2-20261107';

// модель: yaw0 — доворот, чтобы смотрела лицом на +Z (у части копий Sketchfab лицо на +X); glow — множитель своей яркости
// свечения (неон, RGB, экраны); col — препятствие для прогулки
const CAT = {
  bed: { col: 1 }, dining_set: { col: 1 }, sofa_02: { col: 1 }, pc_curved: { col: 1, glow: 3 }, desk_stand: { col: 1 },
  steel_frame_shelves_02: { col: 1 }, steel_frame_shelves_03: { col: 1 }, modern_wooden_cabinet: { col: 1 }, tv_flat: {},
  pc_setup: { yaw0: -90, col: 1, glow: 3 }, arcade: { col: 1, glow: 4 }, vending: { yaw0: -90, col: 1, glow: 3 },
  gaming_chair: { col: 1 }, modern_arm_chair_01: { col: 1 }, Ottoman_01: { col: 1 }, beanbag: { col: 1 },
  coffee_table_round_01: { col: 1 }, modern_coffee_table_01: { col: 1 }, side_table_01: { col: 1 }, potted_plant_02: { col: 1 },
  neon_billboard: { glow: 9 }, neon_street: { glow: 9 }, modern_ceiling_lamp_01: { glow: 2 }, lava_lamp: { glow: 6 },
  keyboard_rgb: { glow: 4 }, xbox: { glow: 3 }, ps5: {}, vr_headset: {}, gamepad: {}, katana_stand_01: {}, antique_katana_01: {},
  potted_plant_04: {}, ceramic_vase_01: {}, headset: {}, gaming_console: { glow: 2 }, curved_monitor: { glow: 2 },
  neon_palm: { glow: 9 }, neon_gaming: { glow: 9 }, neon_jp: { glow: 9 }, neon_cocktails: { glow: 9 }, neon_sushi: { glow: 9 },
  neon_heart: { glow: 9, emissiveOnly: 1 }, jukebox: { col: 1, glow: 4 }
};

// цвета подсветки: маджента, циан, фиолет, янтарь
const NEON = { m: [1.0, 0.1, 0.72], c: [0.05, 0.8, 1.0], v: [0.55, 0.18, 1.0], a: [1.0, 0.55, 0.12] };

// расстановка: [модель, x, y, z, куда смотрит лицо (°: 0 → +Z, 90 → +X, 180 → −Z, −90 → −X), доп.]
function layout(F0, F1) {
  const G = F0 + 0.004, U = F1 + 0.004;   // пол этажа (над плиткой)
  return [
    // ---- гостиная: ТВ-стена у северной стены (z −4,32) — тумба, ТВ 75", неоновая вывеска; приставки на тумбе
    ['modern_wooden_cabinet', -9.15, G, -4.05, 0],
    ['tv_flat', -9.15, F0 + 0.98, -4.29, 0, { screen: 'synth' }],
    ['ps5', -10.18, F0 + 0.68, -4.12, 0], ['xbox', -8.12, F0 + 0.68, -4.14, 0],
    ['gaming_console', -10.95, F0 + 0.68, -4.06, 0], ['gamepad', -8.9, F0 + 0.491, -2.62, 28],
    ['neon_palm', -9.15, F0 + 2.05, -4.29, 0],
    // диван, кресла и пуф вокруг мраморного столика; столик у дивана с лава-лампой; кресла-мешки у окна
    ['sofa_02', -9.15, G, -1.06, 180], ['coffee_table_round_01', -9.15, G, -2.52, 0],
    ['modern_arm_chair_01', -11.3, G, -2.45, 75], ['modern_arm_chair_01', -7.0, G, -2.45, -75], ['Ottoman_01', -11.2, G, -0.85, 90],
    ['side_table_01', -10.5, G, -0.98, 180], ['lava_lamp', -10.5, F0 + 0.551, -0.98, 200],
    ['beanbag', -12.2, G, -3.62, 50, { tint: NEON.v }], ['beanbag', -6.15, G, -3.55, -40, { tint: NEON.c }],
    ['potted_plant_02', -12.35, G, -0.15, 0], ['potted_plant_02', -5.85, G, 0.4, 0],
    // столовая: стол с мрамором на 4 места, два шара над ним
    ['dining_set', -9.3, G, 3.3, 90],
    ['modern_ceiling_lamp_01', -9.75, F0 + 1.62, 3.3, 0, { cord: F0 + 3.3 }], ['modern_ceiling_lamp_01', -8.85, F0 + 1.62, 3.3, 0, { cord: F0 + 3.3 }],
    ['ceramic_vase_01', -9.3, F0 + 0.755, 3.3, 0], ['neon_cocktails', -9.3, F0 + 2.05, 4.91, 180], ['jukebox', -5.56, G, 4.45, -90],
    // ---- кухня: суши-вывеска на кронштейне у восточной стены (x 0,72)
    ['neon_sushi', 0.70, F0 + 1.95, 3.8, 0],
    // ---- малая гостиная: игровая зона — ПК с изогнутым монитором у восточной стены (x 0,15), автоматы у южной (z 0,84)
    ['pc_curved', -0.36, G, -3.55, -90], ['gaming_chair', -1.38, G, -3.55, 90],
    ['arcade', -1.0, G, 0.37, 180], ['vending', -2.35, G, 0.47, 180],
    ['neon_street', -0.03, F0 + 2.0, -2.45, 180], ['neon_gaming', -1.65, F0 + 2.22, 0.825, 180],
    ['beanbag', -3.4, G, -1.5, 145, { tint: NEON.m }], ['beanbag', -2.15, G, -1.05, -165, { tint: NEON.v }],
    ['side_table_01', -2.75, G, -2.35, 0], ['vr_headset', -2.75, F0 + 0.551, -2.35, 35],
    ['steel_frame_shelves_02', -4.9, G, -4.73, 0], ['katana_stand_01', -4.9, F0 + 1.1, -4.68, 0],
    ['antique_katana_01', -4.4, F0 + 1.245, -4.66, 0, { rotZ: 90 }],
    // ---- гостевая спальня: кровать к северной стене (z −4,56), тумбы, ТВ на стене санузла (z −0,69), настенный стол с ПК
    ['bed', 9.35, G, -3.35, 0], ['side_table_01', 7.9, G, -4.32, 0], ['side_table_01', 10.8, G, -4.32, 0],
    ['lava_lamp', 7.9, F0 + 0.551, -4.32, 20], ['potted_plant_04', 10.8, F0 + 0.551, -4.32, 0],
    ['tv_flat', 10.4, F0 + 0.95, -0.725, 180, { screen: 'city' }],
    ['pc_setup', 7.13, F0 + 0.71, -1.55, 90], ['gaming_chair', 7.98, G, -1.55, -90],
    ['neon_billboard', 9.35, F0 + 1.75, -4.49, 0],
    // ---- спальня хозяина: кровать изголовьем к гардеробной (x −6,48), игровой стол у северной стены (z −4,91)
    ['bed', -7.7, U, -3.2, -90], ['side_table_01', -6.73, U, -4.64, -90], ['side_table_01', -6.73, U, -1.76, -90],
    ['lava_lamp', -6.73, F1 + 0.551, -1.76, -60],
    ['pc_curved', -10.45, U, -4.40, 0], ['gaming_chair', -10.45, U, -3.42, 180],
    ['neon_heart', -6.465, F1 + 1.45, -3.2, -90], ['neon_jp', -12.0, F1 + 1.3, -4.69, 0],
    ['beanbag', -11.95, U, -2.4, 70, { tint: NEON.m }], ['potted_plant_02', -12.2, U, -0.15, 0],
    // ---- спальня 2: кровать к южной стене (z 4,92), ТВ на северной (z 0,78), настенный стол с ПК в восточной части
    ['bed', -10.6, U, 3.72, 180], ['side_table_01', -12.05, U, 4.69, 180], ['side_table_01', -9.15, U, 4.69, 180],
    ['lava_lamp', -9.15, F1 + 0.551, 4.69, 160],
    ['tv_flat', -10.6, F1 + 0.95, 0.815, 0, { screen: 'synth' }], ['neon_palm', -12.15, F1 + 1.05, 0.81, 0],
    ['pc_setup', -5.95, F1 + 0.71, 1.19, 0], ['gaming_chair', -5.95, U, 2.05, 180],
    // ---- малая гостиная 2-го этажа: диван у окна, столик с геймпадом и гарнитурой, автомат и стеллаж у западной стены (x −4,17)
    ['sofa_02', -1.9, U, 4.55, 180], ['modern_coffee_table_01', -1.9, U, 3.55, 90],
    ['gamepad', -2.05, F1 + 0.391, 3.6, -20], ['headset', -1.55, F1 + 0.391, 3.45, 160],
    ['arcade', -3.71, U, 3.55, 90], ['steel_frame_shelves_02', -3.92, U, 4.55, 90],
    ['beanbag', -0.35, U, 3.35, -120, { tint: NEON.c }], ['potted_plant_02', 0.15, U, 4.55, 0],
    // ---- спальня 3: кровать изголовьем к стене санузла (x 6,77), стол с ПК у южной стены (z −0,8)
    ['bed', 7.98, U, -3.45, 90], ['side_table_01', 7.0, U, -2.0, 90], ['lava_lamp', 7.0, F1 + 0.551, -2.0, 40],
    ['pc_curved', 10.55, U, -1.30, 180], ['gaming_chair', 10.55, U, -2.28, 0],
    ['neon_billboard', 10.55, F1 + 1.5, -0.87, 180],
    // ---- спальня 4: кровать к южной стене (z 4,92), ТВ на северной (z −0,63), настенный стол с ПК у стены санузла (x 7,85)
    ['bed', 10.0, U, 3.72, 180], ['side_table_01', 8.56, U, 4.69, 180], ['side_table_01', 11.44, U, 4.69, 180],
    ['lava_lamp', 11.44, F1 + 0.551, 4.69, 200],
    ['tv_flat', 10.0, F1 + 0.95, -0.595, 0, { screen: 'city' }],
    ['pc_setup', 8.26, F1 + 0.71, 1.95, 90], ['gaming_chair', 9.1, U, 1.95, -90], ['neon_gaming', 7.865, F1 + 1.55, 1.95, 90]
  ];
}

// неоновые и RGB-ленты: [x0, x1, y0, y1, z0, z1, цвет, яркость] — тонкие светящиеся бруски
function strips(F0, F1) {
  const G = F0 + 0.006, U = F1 + 0.006;
  function under(x, y, z, w, d, c) {   // неоновый контур на полу вокруг кровати (w — вдоль x, d — вдоль z, чуть шире кровати)
    return [[x - w / 2, x + w / 2, y, y + 0.015, z - d / 2 - 0.03, z - d / 2, c, 3], [x - w / 2, x + w / 2, y, y + 0.015, z + d / 2, z + d / 2 + 0.03, c, 3],
      [x - w / 2 - 0.03, x - w / 2, y, y + 0.015, z - d / 2, z + d / 2, c, 3], [x + w / 2, x + w / 2 + 0.03, y, y + 0.015, z - d / 2, z + d / 2, c, 3]];
  }
  return [
    // гостиная: карниз под потолком над ТВ-стеной (циан), контур за телевизором (маджента)
    [-12.9, -5.4, F0 + 3.27, F0 + 3.30, -4.32, -4.30, NEON.c, 4],
    [-10.06, -8.24, F0 + 0.95, F0 + 0.97, -4.32, -4.305, NEON.m, 4], [-10.06, -8.24, F0 + 1.92, F0 + 1.94, -4.32, -4.305, NEON.m, 4],
    [-10.08, -10.06, F0 + 0.95, F0 + 1.94, -4.32, -4.305, NEON.m, 4], [-8.24, -8.22, F0 + 0.95, F0 + 1.94, -4.32, -4.305, NEON.m, 4],
    // малая гостиная: под столом с ПК и вдоль пола у автоматов
    [0.13, 0.15, F0 + 0.7, F0 + 1.6, -4.45, -2.65, NEON.v, 3], [-3.0, 0.6, G, G + 0.012, 0.82, 0.84, NEON.c, 4],
    // гостевая: за настенным столом
    [6.72, 6.735, F0 + 1.35, F0 + 1.37, -2.35, -0.75, NEON.c, 4],
    ...under(9.35, G, -3.35, 2.30, 2.48, NEON.m),
    // хозяйская: за монитором и под кроватью
    [-11.35, -9.55, F1 + 1.34, F1 + 1.36, -4.92, -4.905, NEON.m, 4], ...under(-7.7, U, -3.2, 2.48, 2.30, NEON.v),
    // спальня 2
    [-6.75, -5.15, F1 + 1.35, F1 + 1.37, 0.78, 0.795, NEON.m, 4], ...under(-10.6, U, 3.72, 2.30, 2.48, NEON.c),
    // гостиная 2-го этажа: вдоль пола у западной стены
    [-4.17, -4.155, U, U + 0.012, 3.0, 4.9, NEON.m, 4],
    // спальня 3
    [9.65, 11.45, F1 + 1.34, F1 + 1.36, -0.81, -0.795, NEON.c, 4], ...under(7.98, U, -3.45, 2.48, 2.30, NEON.m),
    // спальня 4
    [7.85, 7.865, F1 + 1.35, F1 + 1.37, 1.15, 2.75, NEON.v, 4], ...under(10.0, U, 3.72, 2.30, 2.48, NEON.v)
  ];
}

// картинка на экране ТВ: «synthwave» (закат с полосами над сеткой) или ночной город
function screenTexture(THREE, kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  if (kind === 'city') {
    const sky = g.createLinearGradient(0, 0, 0, 288); sky.addColorStop(0, '#060a22'); sky.addColorStop(1, '#3a0f4e');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 288);
    let r = 7;   // свой простой генератор: одинаковая картинка при каждом открытии
    for (let i = 0; i < 34; i++) {
      r = (r * 16807) % 2147483647; const w = 14 + r / 2147483647 * 30;
      r = (r * 16807) % 2147483647; const h = 60 + r / 2147483647 * 190;
      r = (r * 16807) % 2147483647; const x = r / 2147483647 * 512;
      g.fillStyle = '#0b0f1e'; g.fillRect(x, 288 - h, w, h);
      for (let k = 0; k < h / 9; k++) for (let j = 0; j < w / 7; j++) {
        r = (r * 16807) % 2147483647;
        if (r / 2147483647 < 0.35) { g.fillStyle = (r & 1) ? '#ff3fd0' : '#35e6ff'; g.fillRect(x + 2 + j * 7, 288 - h + 4 + k * 9, 3, 4); }
      }
    }
  } else {
    const sky = g.createLinearGradient(0, 0, 0, 170); sky.addColorStop(0, '#12002a'); sky.addColorStop(1, '#ff2f8f');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 170);
    const sun = g.createLinearGradient(0, 40, 0, 170); sun.addColorStop(0, '#ffd23f'); sun.addColorStop(1, '#ff2f8f');
    g.fillStyle = sun; g.beginPath(); g.arc(256, 150, 82, Math.PI, 0); g.fill();
    g.fillStyle = '#12002a'; for (let i = 0; i < 6; i++) g.fillRect(150, 100 + i * 12, 212, 2 + i * 1.3);
    g.fillStyle = '#0b0018'; g.fillRect(0, 170, 512, 118);
    g.strokeStyle = '#ff3fd0'; g.lineWidth = 2;
    for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(256 + i * 10, 170); g.lineTo(256 + i * 70, 288); g.stroke(); }
    for (let k = 0; k < 7; k++) { const y = 170 + Math.pow(k / 6, 2) * 118; g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function addFurniture(THREE, root, opts = {}) {
  const F0 = opts.F0 ?? 0.3, F1 = opts.F1 ?? 4.0, low = opts.quality === 'low';
  const group = new THREE.Group(); group.name = 'furniture';
  root.add(group);
  const loader = new GLTFLoader();
  const plan = layout(F0, F1);
  const keys = [...new Set(plan.map((p) => p[0]))];
  const src = new Map(), glowMats = [];
  // телефон: текстуры мебели не крупнее 512 px (память вкладки), стекло без отдельного прохода прозрачности
  const shrink = (tex) => {
    const img = tex && tex.image;
    if (!low || !img || !(img.width > 512 || img.height > 512)) return;
    const s = 512 / Math.max(img.width, img.height), c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    try { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); tex.image = c; tex.needsUpdate = true; } catch { /* оставить как есть */ }
  };
  // телефон: по одной модели с паузами и не сразу после дома — меньше пик памяти и нагрузки (на iOS 26 одновременный
  // разбор всех моделей во время загрузки дома ронял вкладку из-за ошибки JIT-компилятора WebKit)
  const one = async (k) => {
    try {
      const g = await loader.loadAsync(`${BASE}${k}.glb?v=${VER}`);
      const info = CAT[k] || {};
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        // чередующиеся атрибуты (бывают у упакованных цветов вершин) — в обычные: трассировка их не читает
        for (const name of Object.keys(o.geometry.attributes)) {
          const a = o.geometry.attributes[name];
          if (!a.isInterleavedBufferAttribute) continue;
          const out = new a.array.constructor(a.count * a.itemSize);
          for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) out[i * a.itemSize + j] = a.getComponent(i, j);
          o.geometry.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize, a.normalized));
        }
        if (info.emissiveOnly && ![].concat(o.material).some((m) => m.emissiveMap || (m.emissive && m.emissive.getHex() !== 0))) { o.visible = false; return; }
        const mats = [].concat(o.material).map((m) => {
          if (m.isMeshBasicMaterial) m = new THREE.MeshStandardMaterial({ map: m.map, color: m.color, roughness: 0.6, name: m.name });   // без «unlit»: трассировка знает только PBR
          // стекло без отдельного прохода пропускания: тёмное (столешницы, экраны) — глянцевое непрозрачное, светлое — полупрозрачное
          if (m.transmission > 0) {
            const lum = 0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b;
            if (lum < 0.3 || m.map) Object.assign(m, { transmission: 0, transparent: false, opacity: 1, depthWrite: true, roughness: 0.08, metalness: 0 });   // цвет из палитры — тонированное стекло
            else Object.assign(m, { transmission: 0, transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false });
          }
          for (const t of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) shrink(m[t]);
          if (info.glow && (m.emissiveMap || (m.emissive && m.emissive.getHex() !== 0))) { m.emissiveIntensity = (m.emissiveIntensity || 1) * info.glow; glowMats.push([m, m.emissiveIntensity]); }
          m.userData.room = true;   // отражения «комнаты» просмотрщика, а не неба
          m.name = `f_${k}_${m.name || ''}`;
          return m;
        });
        o.material = Array.isArray(o.material) ? mats : mats[0];
      });
      src.set(k, g.scene);
    } catch (e) { console.warn('мебель: не загрузилась', k, e && e.message); }
  };
  if (low) {
    await new Promise((r) => setTimeout(r, 1500));
    for (const k of keys) { await one(k); await new Promise((r) => setTimeout(r, 30)); }
  } else await Promise.all(keys.map(one));
  const tints = new Map(), box = new THREE.Box3();
  const cords = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, name: 'f_cord' }); cords.userData.room = true;
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i], k = p[0], x = p[1], y = p[2], z = p[3], yaw = p[4] || 0, o = p[5] || {};
    if (low && i % 6 === 5) await new Promise((r) => setTimeout(r, 16));   // телефон: порциями, чтобы не держать поток
    const s = src.get(k);
    if (!s) continue;
    const obj = s.clone();
    obj.name = `furn_${k}`;
    obj.position.set(x, y, z);
    obj.rotation.order = 'YXZ';
    obj.rotation.y = (yaw + ((CAT[k] || {}).yaw0 || 0)) * Math.PI / 180;
    if (o.rotZ) obj.rotation.z = o.rotZ * Math.PI / 180;
    if (o.tint) {   // кресла-мешки в цветах подсветки: своя копия материала с оттенком
      const key = k + o.tint.join();
      if (!tints.has(key)) tints.set(key, new Map());
      const cache = tints.get(key);
      obj.traverse((m) => {
        if (!m.isMesh) return;
        const base = m.material;
        if (!cache.has(base)) { const t = base.clone(); t.color.setRGB(o.tint[0] * 0.9 + 0.1, o.tint[1] * 0.9 + 0.1, o.tint[2] * 0.9 + 0.1); cache.set(base, t); }
        m.material = cache.get(base);
      });
    }
    if (o.screen) {   // «включённый» экран: картинка светится чуть впереди чёрного стекла
      const bb = new THREE.Box3().setFromObject(s), sz = bb.getSize(new THREE.Vector3());
      const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTexture(THREE, o.screen), emissiveIntensity: 1.6, roughness: 0.25, name: 'f_screen' });
      mat.userData.room = true;
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(sz.x * 0.955, sz.y * 0.9), mat);
      scr.position.set(0, sz.y * 0.5 + 0.005, bb.max.z + 0.002);
      obj.add(scr);
      glowMats.push([mat, mat.emissiveIntensity]);
    }
    group.add(obj);
    if (o.cord) {   // шнур подвеса до потолка
      obj.updateMatrixWorld(true);
      box.setFromObject(obj);
      const h = o.cord - box.max.y;
      if (h > 0.02) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, h, 6), cords); c.position.set(x, box.max.y + h / 2, z); c.name = 'furn_cord'; group.add(c); }
    }
  }
  // ленты подсветки: ленты одного цвета — одна сетка, вершины коробок пишутся напрямую (по сетке и BoxGeometry на каждую
  // ленту Safari 26.2 закрывал вкладку: ошибка его JIT-компилятора)
  const led = new Map();
  for (const st of strips(F0, F1)) {
    const key = st[6].join() + '|' + st[7];
    if (!led.has(key)) led.set(key, { c: st[6], k: st[7], pos: [], nrm: [], idx: [] });
    const L = led.get(key), x0 = st[0], x1 = Math.max(st[1], st[0] + 0.004), y0 = st[2], y1 = Math.max(st[3], st[2] + 0.004), z0 = st[4], z1 = Math.max(st[5], st[4] + 0.004);
    const faces = [   // 4 угла грани и нормаль
      [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]], [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], [-1, 0, 0]],
      [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]], [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0]],
      [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]]
    ];
    for (const f of faces) {
      const b = L.pos.length / 3;
      for (let i = 0; i < 4; i++) { L.pos.push(f[i][0], f[i][1], f[i][2]); L.nrm.push(f[4][0], f[4][1], f[4][2]); }
      L.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }
  for (const L of led.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(L.nrm, 3));
    g.setIndex(L.idx);
    g.computeBoundingSphere();
    const m = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: new THREE.Color(L.c[0], L.c[1], L.c[2]), emissiveIntensity: L.k, roughness: 0.4, name: 'f_led' });
    m.userData.room = true; glowMats.push([m, L.k]);
    const mesh = new THREE.Mesh(g, m);
    mesh.name = 'furn_led'; mesh.userData.noCast = true; mesh.castShadow = false;
    group.add(mesh);
  }
  // препятствия для прогулки: габарит предмета чуть меньше, чтобы проходы не сужались
  group.updateMatrixWorld(true);
  if (opts.phys && opts.colliders !== false) {
    for (const obj of group.children) {
      const k = obj.name.replace(/^furn_/, '');
      if (!(CAT[k] && CAT[k].col)) continue;
      box.setFromObject(obj);
      opts.phys.colliders.push([box.min.x + 0.04, box.min.y, box.min.z + 0.04, box.max.x - 0.04, box.max.y, box.max.z - 0.04]);
    }
  }
  return {
    group,
    count: group.children.length,
    // ночь: неон и экраны ярче (как остальные лампы модели)
    setLights(k) { for (const [m, base] of glowMats) m.emissiveIntensity = base * (1 + 2.5 * k); }
  };
}
