// Общая часть тестовых страниц VD-1: модель и фотосканы основного сайта, ракурсы рендеров Cycles с их экспозицией,
// прогулка, сравнение кадра с рендером Cycles шторкой. Модель, текстуры и HDRI берутся с сайта виллы (тот же адрес),
// чтобы не дублировать их здесь.
const LOCAL = ['127.0.0.1', 'localhost'].includes(location.hostname);
export const LAB = new URL('../', import.meta.url);
export const MAIN = new URL(LOCAL ? '../villa-site-vd1/' : '../damac-hills-vd1/', LAB).href;
export const REL = 'vd1-ios-20261107';
export const $ = (s, r = document) => r.querySelector(s);

// телефон или планшет (палец вместо мыши): слабее видеокарта и меньше памяти вкладки — облегчённые настройки
export const PHONE = new URLSearchParams(location.search).has('phone') || matchMedia('(pointer: coarse)').matches;
export const dprFor = (max = 2) => Math.min(devicePixelRatio || 1, PHONE ? Math.min(max, 1.5) : max);
// стартовый облёт: в портретном экране угол по горизонтали узкий — камера отходит дальше, чтобы дом влез
export function fitStart(camera, controls, pos, target) {
  camera.position.set(...pos);
  controls.target.set(...target);
  const k = camera.aspect < 1 ? Math.min(1.6, 0.9 / camera.aspect) : 1;
  camera.position.sub(controls.target).multiplyScalar(k).add(controls.target);
  controls.update();
}
// уменьшить фотосканы и нарисованные текстуры до size по большей стороне (для трассировки на телефоне:
// трассировщик складывает все текстуры в атлас, на телефоне 1–2К не нужны, а память вкладки ограничена)
export function shrinkTextures(root, size = 512) {
  const done = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
      const t = m && m[k], img = t && t.image;
      if (!img || !(img.width > size || img.height > size) || done.has(t.source)) continue;
      const s = size / Math.max(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
      try { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); } catch { continue; }
      done.set(t.source, c);
    }
  });
  for (const [src, c] of done) { src.data = c; src.needsUpdate = true; }
  return done.size;
}

// фотосканы Poly Haven (CC0) — те же, что на сайте виллы (app.js), с теми же множителями альбедо
const T = MAIN + 'tex/';
export const IMAGES = {
  render: { base: T + 'beige_wall_001', meters: 3.0, tint: [1.85, 2.1, 2.3] },
  renderWhite: { base: T + 'plastered_wall_04', meters: 3.2, tint: [2.8, 2.85, 2.8] },
  stone: { base: T + 'stacked_stone_wall', meters: 1.2, disp: 0.045, tint: [1.9, 1.8, 2.0] },
  brick: { base: T + 'brick_wall_006', meters: 3.0, disp: 0.018, tint: [0.85, 0.9, 1.0] },
  concrete: { base: T + 'concrete_floor_02', meters: 2.0, disp: 0.004, tint: [1.85, 2.15, 3.0] },
  gravel: { base: T + 'gravel_floor_02', meters: 2.0, disp: 0.03, tint: [0.74, 0.75, 0.78] },
  pavers: { base: T + 'pavement_05', meters: 2.6, disp: 0.012, tint: [2.05, 2.5, 2.95] },
  asphalt: { base: T + 'asphalt_01', meters: 2.08, disp: 0.004, tint: [0.75, 0.9, 1.15] },
  sand: { base: T + 'sand_01', meters: 1.5, disp: 0.012, tint: [1.8, 1.9, 2.35] },
  rough: { base: T + 'withered_grass', meters: 3.0, disp: 0.03, tint: [0.95, 0.95, 0.85] },
  lawn: { base: T + 'leafy_grass', meters: 2.0, tint: [0.3, 0.5, 0.33] },
  soil: { base: T + 'aerial_ground_rock', meters: 3.0, disp: 0.04 },
  rust: { base: T + 'rust_coarse_01', meters: 2.2, disp: 0.003, tint: [1.6, 1.6, 1.8], normalScale: 0.5 },
  wenge: { base: T + 'dark_wood', meters: 2.0, tint: [0.45, 1.2, 2.4] },
  palmBark: { base: T + 'palm_tree_bark', meters: 1.3, disp: 0.012, tint: [0.8, 0.76, 0.72] }
};

// небо рендеров Cycles: азимут и сила солнца в HDRI (hdri/hdri.json), lux — освещённость горизонтали, как в Blender
export const HDRI = {
  day: { url: MAIN + 'hdri/kloofendal_43d_clear_puresky-2048.hdr', sunAz: 36.15, sunEl: 42.9, sunY: 6.1884, skyY: 1.2561, scale: 8, lux: 95000, sun: { azimuth: 145, elevation: 42.9 } },
  morning: { url: MAIN + 'hdri/syferfontein_18d_clear_puresky-2048.hdr', sunAz: 35.87, sunEl: 18.36, sunY: 13.4203, skyY: 0.5744, scale: 32, lux: 45000, sun: { azimuth: 40, elevation: 18.4 } }
};
// множитель данных HDRI до единиц Blender (W/м²/ср, 1 Вт = 683 лм): как strength у рендеров Cycles
export const hdriStrength = (h) => h.scale * h.lux / ((h.sunY * Math.sin(h.sunEl * Math.PI / 180) + h.skyY) * 683);
export const hdriRotation = (h) => (h.sunAz - h.sun.azimuth) * Math.PI / 180;   // солнце HDRI → азимут солнца сайта
// экспозиция камеры по EV100, как sc.view_settings.exposure у рендеров Cycles
export const evToExposure = (ev) => Math.pow(2, Math.log2(683 / 1.2) - ev);
export const EV = { inside: 10.4, outside: 14.6 };

export async function loadCams() { return (await fetch(new URL('shared/cams.json', LAB))).json(); }

// модель с фотосканами; двери открыты: сцена неподвижна, по дому можно пройти
export async function loadModel(THREE, quality = 'high', images = true) {
  const mod = await import(`${MAIN}villa3d/damac_hills_samantha_1558.js?v=${REL}`);
  const model = mod.build(THREE, { quality, images: images ? IMAGES : undefined });
  model.update(10, 0, { mode: 'pt' });
  model.root.updateMatrixWorld(true);
  return model;
}
// дождаться фотосканов (иначе трассировка соберёт сцену с нарисованными текстурами): у каждой загружаемой текстуры
// vd1_tex.js кладёт обещание userData.ready
export async function texturesReady(root) {
  const ps = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap']) {
      const t = m && m[k];
      if (t && t.userData && t.userData.ready) ps.add(t.userData.ready);
    }
  });
  await Promise.all(ps);
  return ps.size;
}

// материалы для трассировки: стекло фасада — физическое тонкое (бронза, как два слоя стекла Cycles), слой отражений
// растра убран, полупрозрачное стекло ограждений и душевых — прозрачное; остальное — как в модели
export function ptMaterials(THREE, root) {
  const glass = (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0, roughness: 0.015, transmission: 1, ior: 1.52, thickness: 0, side: THREE.DoubleSide });
  const facade = glass(new THREE.Color(0.6, 0.52, 0.4)), clear = glass(new THREE.Color(0.93, 0.97, 0.96));
  const drop = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (/_refl$/.test(o.name) || /Refl$/.test(m.name || '')) { drop.push(o); return; }
    if (m.isMeshBasicMaterial && m.blending === THREE.MultiplyBlending) o.material = facade;
    else if (m.transparent && /glass/i.test(m.name || '')) o.material = clear;
    else if (!m.isMeshStandardMaterial) drop.push(o);
  });
  for (const o of drop) o.visible = false;
}

// ракурс рендера Cycles: объектив по горизонтали (сенсор 36 мм), вертикали ровные сдвигом объектива
export function setCam(camera, cam, w, h) {
  const [x, y, z] = cam.pos, [tx, ty, tz] = cam.look;
  camera.fov = 2 * Math.atan(18 / cam.lens / (w / h)) * 180 / Math.PI;
  camera.position.set(x, y, z);
  let d = [tx - x, ty - y, tz - z]; const L = Math.hypot(...d); d = d.map((q) => q / L);
  camera.clearViewOffset();
  let look = [tx, ty, tz];
  if (cam.straight !== false) {
    const shift = cam.lens * Math.tan(Math.asin(d[1])) / 36;
    look = [x + d[0], y, z + d[2]];
    camera.setViewOffset(w, h, 0, -shift * w, w, h);
  }
  camera.lookAt(...look);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return look;
}

// шторка «сравнить с Cycles»: рендер того же ракурса поверх кадра, справа от ползунка
export function compareUI(stage) {
  const wrap = document.createElement('div');
  wrap.className = 'cmp';
  wrap.hidden = true;
  wrap.innerHTML = '<img alt="Рендер Cycles"><div class="bar"><span>Cycles</span></div><input type="range" min="0" max="100" value="50" aria-label="Шторка">';
  stage.append(wrap);
  const img = wrap.querySelector('img'), bar = wrap.querySelector('.bar'), range = wrap.querySelector('input');
  const apply = () => { img.style.clipPath = `inset(0 0 0 ${range.value}%)`; bar.style.left = `${range.value}%`; };
  range.addEventListener('input', apply);
  apply();
  return {
    show(name) { img.src = `${MAIN}renders/${name}-1920.webp?v=${REL}`; wrap.hidden = false; },
    hide() { wrap.hidden = true; },
    get visible() { return !wrap.hidden; }
  };
}

export const LAB_CSS = `
  html, body { margin: 0; height: 100%; background: #101214; color: #e8e6e1; font: 14px/1.4 system-ui, -apple-system, Segoe UI, sans-serif; }
  #stage { position: fixed; inset: 0; overflow: hidden; }
  #stage canvas { display: block; width: 100%; height: 100%; }
  .panel { position: fixed; left: 12px; top: 12px; z-index: 5; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; max-width: calc(100vw - 24px); }
  .panel b { margin-right: 6px; }
  .panel select, .panel button, .panel label { background: rgba(20,22,25,.82); color: inherit; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; padding: 6px 9px; font: inherit; }
  .panel button.on { background: #f1d9a8; color: #1b1a17; }
  .panel a { color: #f1d9a8; }
  .status { position: fixed; left: 12px; bottom: 12px; z-index: 5; background: rgba(20,22,25,.82); border-radius: 8px; padding: 6px 10px; }
  .note { position: fixed; inset: 0; display: grid; place-items: center; text-align: center; padding: 24px; }
  .cmp { position: absolute; inset: 0; pointer-events: none; }
  .cmp img { position: absolute; left: 0; top: 50%; width: 100%; transform: translateY(-50%); }
  .cmp .bar { position: absolute; top: 0; bottom: 0; width: 2px; background: #f1d9a8; }
  .cmp .bar span { position: absolute; top: 12px; left: 6px; background: rgba(20,22,25,.82); padding: 2px 6px; border-radius: 6px; white-space: nowrap; }
  .cmp input { position: absolute; left: 0; right: 0; bottom: 56px; width: 60%; margin: 0 auto; pointer-events: auto; }
  .walk-stick { position: fixed; left: 24px; bottom: 24px; width: 110px; height: 110px; border-radius: 50%; background: rgba(255,255,255,.12); z-index: 6; pointer-events: none; }
  .walk-stick span { position: absolute; left: 35px; top: 35px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,.35); }
  #stage canvas { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  .panel { top: max(12px, env(safe-area-inset-top)); left: max(12px, env(safe-area-inset-left)); }
  .status { bottom: max(12px, env(safe-area-inset-bottom)); max-width: calc(100vw - 24px); box-sizing: border-box; }
  .note a { color: #f1d9a8; }
  @media (max-width: 720px) {
    html, body { font-size: 13px; }
    .panel { gap: 4px; left: 8px; top: max(8px, env(safe-area-inset-top)); max-width: calc(100vw - 16px); }
    .panel b { flex-basis: 100%; margin: 0 0 2px; font-size: 13px; }
    .panel select, .panel button, .panel label { padding: 6px 8px; font-size: 13px; }
    .panel select { max-width: 46vw; }
    .status { left: 8px; bottom: max(8px, env(safe-area-inset-bottom)); font-size: 12px; padding: 5px 8px; }
    .cmp input { width: 84%; bottom: calc(64px + env(safe-area-inset-bottom)); }
    .cmp .bar span { top: auto; bottom: calc(100px + env(safe-area-inset-bottom)); }
  }
`;

// панель: кнопки ракурсов Cycles, облёт/прогулка, время суток
export function navUI({ title, cams, onCam, onWalk, onOrbit, onSun, extra = [] }) {
  const p = document.createElement('div');
  p.className = 'panel';
  const sel = document.createElement('select');
  sel.innerHTML = '<option value="">Ракурс рендера Cycles…</option>' + cams.map((c) => `<option value="${c.name}">${c.label}</option>`).join('');
  sel.addEventListener('change', () => { if (sel.value) onCam(cams.find((c) => c.name === sel.value)); });
  const btn = (text, fn) => { const b = document.createElement('button'); b.textContent = text; b.addEventListener('click', () => fn(b)); return b; };
  p.innerHTML = `<b>${title}</b>`;
  p.append(sel);
  if (onOrbit) p.append(btn('Облёт', onOrbit));
  if (onWalk) p.append(btn('Прогулка', onWalk));
  if (onSun) { p.append(btn('День', () => onSun('day')), btn('Утро', () => onSun('morning'))); }
  for (const e of extra) p.append(e);
  const back = document.createElement('a');
  back.href = LAB.href; back.textContent = '← все варианты';
  p.append(back);
  document.body.append(p);
  return { select: sel, panel: p, btn };
}
