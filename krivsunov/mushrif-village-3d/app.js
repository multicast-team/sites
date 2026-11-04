// Просмотрщик 3D-макета виллы Mushrif Village: обзор/прогулка, без мебели/геймерский, день/ночь, срез этажей.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const $ = (s) => document.querySelector(s);
const isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 500;
const Q = new URLSearchParams(location.search);
const state = { variant: Q.get('v') || 'empty', time: Q.get('t') || 'day', cut: 'all', mode: 'orbit' };

// ---------------------------------------------------------------- рендерер и сцена
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.35 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 700);
camera.position.set(38, 24, 32);
if (innerWidth < innerHeight) camera.position.set(11.5 + 26.5 * 1.7, 2.5 + 21.5 * 1.7, 1.5 + 30.5 * 1.7);

const controls = new OrbitControls(camera, canvas);
controls.target.set(11.5, 2.5, 1.5);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 2;
controls.maxDistance = 140;
controls.update();

// солнце: азимут 215°, высота 42° — как в рендерах
const az = THREE.MathUtils.degToRad(215), el = THREE.MathUtils.degToRad(42);
const sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.8);
const sunTarget = new THREE.Object3D();
sunTarget.position.set(12, 0, 2);
scene.add(sunTarget);
sun.target = sunTarget;
sun.position.copy(sunTarget.position).addScaledVector(sunDir, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(isMobile ? 2048 : 4096, isMobile ? 2048 : 4096);
const sc = sun.shadow.camera;
sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 5; sc.far = 160;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.035;
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xdfeaff, 0x8a7a66, 0.3);
scene.add(hemi);

// постобработка
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
let gtao = null;
if (!isMobile) {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.85;
  gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
  composer.addPass(gtao);
}
// страховка: NaN/Inf одного пикселя размываются свечением в чёрные прямоугольники — обнуляем их до свечения
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() { vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = vec4(min(c.rgb, vec3(48.0)), c.a); }`,
}));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.35, 1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const smaa = new SMAAPass(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio());
composer.addPass(smaa);

// ---------------------------------------------------------------- окружение
const pmrem = new THREE.PMREMGenerator(renderer);
const env = {};
function loadHDR(key, url) {
  return new Promise((res) => new RGBELoader().load(url, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    env[key] = { bg: t, env: pmrem.fromEquirectangular(t).texture };
    res();
  }, undefined, () => res()));
}

// ночной фон — тёмный градиент: у HDRI ночи светлый горизонт и луна, в окнах это давало молочную дымку
function nightSky() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#02040a'); gr.addColorStop(0.47, '#0b1424'); gr.addColorStop(0.5, '#121a2a'); gr.addColorStop(1, '#050608');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const nightBg = nightSky();

// ---------------------------------------------------------------- материалы
const GLASS = /^(glass|glass_rail|glass_smoke|g_glass_tint|g_acrylic)/;
const emissives = [];
let waterMats = [];
function waterNormal() {
  const N = 256, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N);
  const h = (x, y) => Math.sin(x * 0.11 + y * 0.05) * 0.6 + Math.sin(x * 0.04 - y * 0.13) * 0.8 + Math.sin((x + y) * 0.21) * 0.25;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
    const n = new THREE.Vector3(-dx, -dy, 2.0).normalize(), i = (y * N + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}
const wnTex = waterNormal();

const colliders = [];
const allMats = new Set();
const PLANT_MAT = /(leaves|leaf_|bark|trunk|branches|fern|grass_ornamental|palm|rachis|stem_green|island_tree|searsia|pachira|strelitzia)/;
const NO_COLLIDE = /^(CEIL_|WIN_glass|WIN_leaves|WIN_handles|DOOR_leaves|DOOR_handles|KIT_handles|WARD_handles|INT_switches|EXT_soffit|EXT_wall_lights|SITE_carport_dl|SITE_road|SITE_neighbor|SITE_pool_lamps|SITE_wall_lamps|SITE_step_led|BATH_led|STAIR_led|MAJ_led|WARD_led|TV_console_led|BR2_arch_led|MB_pendants|ROOF_slab|EXT_coping)/;
// излучение: [день, ночь] — абсолютная яркость в просмотрщике
const EM = { screen: [1.0, 1.35], neon: [2.2, 5.0], led: [1.1, 3.0], dl: [1.4, 4.0], pool: [0.4, 4.0] };
function emCat(m) {
  const n = m.name || '';
  if (m.emissiveMap) return 'screen';
  if (/neon/.test(n)) return 'neon';
  if (/downlight/.test(n)) return 'dl';
  if (/pool_light/.test(n)) return 'pool';
  return 'led';
}
function prep(root, group) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    let emissive = false, glass = false, plant = false;
    mats.forEach((m, i) => {
      const n = m.name || '';
      if (GLASS.test(n)) {
        glass = true;
        m.transparent = true;
        m.opacity = n.includes('smoke') ? 0.5 : (n.includes('tint') ? 0.35 : 0.12);
        m.depthWrite = false;
        m.roughness = 0.03; m.metalness = 0.0; m.envMapIntensity = 1.3;
      } else if (n === 'water') {
        const w = new THREE.MeshPhysicalMaterial({ name: 'water', color: 0x2aa6bd, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.8,
          normalMap: wnTex, normalScale: new THREE.Vector2(0.35, 0.35), clearcoat: 1, envMapIntensity: 1.4 });
        waterMats.push(w);
        if (Array.isArray(o.material)) o.material[i] = w; else o.material = w;
        m = w;
      } else if (m.emissive && (m.emissiveMap || m.emissive.r + m.emissive.g + m.emissive.b > 0.01) && m.emissiveIntensity > 0.01) {
        emissive = true;
        m.userData.cat = emCat(m);
        emissives.push(m);
      } else if (m.transparent || m.alphaTest > 0) {
        // листва: вырез по альфе вместо смешивания — без проблем сортировки
        m.transparent = false; m.alphaTest = 0.5; m.depthWrite = true; m.side = THREE.DoubleSide;
        m.color.multiplyScalar(1.45);
      }
      if (/^(mirror|chrome)$/.test(n)) { m.metalness = 1; m.roughness = n === 'mirror' ? 0.04 : 0.12; m.color.set(n === 'mirror' ? 0xc8ced6 : 0xffffff); }
      if (PLANT_MAT.test(n)) plant = true;
      if (m.anisotropy) m.anisotropy = 0;
      if (m.map) m.map.anisotropy = isMobile ? 4 : 8;
      m.userData.side0 = m.side;
      allMats.add(m);
    });
    o.castShadow = !glass && !emissive;
    o.receiveShadow = !emissive;
    if (!glass && !emissive && !plant && !NO_COLLIDE.test(o.name || '')) colliders.push({ mesh: o, group });
    else if (/^(RAIL_glass|STAIR_glass|BATH_glass|WARD_glass)/.test(o.name || '')) colliders.push({ mesh: o, group });
  });
}

// ---------------------------------------------------------------- свет ночью
const nightLights = new THREE.Group();
scene.add(nightLights);
const gamingLights = new THREE.Group();
scene.add(gamingLights);
// координаты Blender (x, y, z) → three (x, z, -y)
const B = (x, y, z) => [x, z, -y];
function addLight(g, x, y, z, color, cd, dist) {
  const l = new THREE.PointLight(color, cd, dist, 2);
  l.position.set(...B(x, y, z));
  g.add(l);
}
function setupNightLights(rooms) {
  const warm = 0xffdcb4;
  rooms.forEach((r) => {
    const [x0, y0, x1, y1] = r.rect, w = x1 - x0, d = y1 - y0, area = w * d;
    if (area < 9 && !/bath/.test(r.code)) return;
    if (isMobile && area < 20) return;
    // на высоте 2 м над полом: у потолка точечный свет даёт пересвеченное пятно
    const z = r.level === 'GF' ? (r.code === 'family' ? 3.6 : 2.6) : 6.5;
    // яркость: пол ~1, потолок над лампой ниже порога свечения (иначе засвет и дымка)
    const cd = 2.5 + area * 0.05, dist = Math.max(w, d) * 0.9 + 3;
    const n = Math.max(w, d) > 8.5 && !isMobile ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : (i ? 0.72 : 0.28);
      const cx = w >= d ? x0 + w * t : (x0 + x1) / 2, cy = w >= d ? (y0 + y1) / 2 : y0 + d * t;
      addLight(nightLights, cx, cy, z, warm, cd / n, dist);
    }
  });
  // бассейн, фасады, сад
  [[13.5, -5.7], [16.8, -5.7], [20.1, -5.7]].forEach(([x, y]) => addLight(nightLights, x, y, -0.3, 0x5fd4ff, 9, 7));
  [[4.0, 12.1, 0.3], [12.0, 14.0, 0.4], [21.0, 12.2, 0.3], [22.0, 16.5, 3.6], [24.4, -6.0, 0.3], [6.0, -12.2, 0.3], [16.0, -10.2, 0.3]]
    .forEach(([x, y, z]) => addLight(nightLights, x, y, z, 0xffcf9a, 7, 9));
  // неон геймерского варианта
  [[6.55, -3.6, 6.7, 0x00e5ff, 14], [22.6, 5.4, 2.0, 0xff2bd6, 10], [18.6, 5.5, 2.4, 0xb44cff, 8], [14.9, 2.0, 2.6, 0xff2bd6, 7],
   [10.9, 1.8, 5.6, 0x8a2be2, 7], [2.5, 9.8, 5.4, 0x00e5ff, 6], [5.2, -0.15, 0.9, 0x00e5ff, 6], [22.0, 2.9, 4.7, 0x8a2be2, 5]]
    .slice(0, isMobile ? 3 : 8).forEach(([x, y, z, c, cd]) => addLight(gamingLights, x, y, z, c, cd * 0.7, 7));
}

// ---------------------------------------------------------------- загрузка
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const prog = { arch: 0, gaming: 0 };
function bar() {
  const p = prog.arch * 0.72 + prog.gaming * 0.28;
  $('#pbar').style.width = (p * 100).toFixed(0) + '%';
}
function loadGLB(url, key) {
  return new Promise((res, rej) => loader.load(url, res, (e) => { if (e.total) { prog[key] = e.loaded / e.total; bar(); } }, rej));
}
let arch, gaming, rooms = [];

async function init() {
  const [a, g, r] = await Promise.all([loadGLB('models/arch.glb', 'arch'), loadGLB('models/gaming.glb', 'gaming'),
    fetch('data/rooms.json').then((x) => x.json()), loadHDR('day', 'env/kloofendal_48d_partly_cloudy_puresky_1k.hdr'),
    loadHDR('night', 'env/qwantani_night_puresky_1k.hdr')]);
  $('#ltxt').textContent = 'Готовлю материалы и свет…';
  arch = a.scene; gaming = g.scene;
  prep(arch, 'arch');
  prep(gaming, 'gaming');
  scene.add(arch, gaming);
  rooms = r.rooms;
  setupNightLights(rooms);
  buildRooms(r);
  buildInfo(r);
  apply();
  fetch('data/renders.json').then((x) => x.json()).then(buildGallery).catch(() => {});
  const l = $('#load');
  l.style.opacity = 0;
  setTimeout(() => l.remove(), 700);
}

// ---------------------------------------------------------------- переключатели
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
let cutOn = null;
function apply() {
  const night = state.time === 'night';
  gaming.visible = state.variant === 'gaming';
  gamingLights.visible = night && gaming.visible;
  nightLights.visible = night;
  const E = night ? env.night : env.day;
  if (E) { scene.environment = E.env; scene.background = night ? nightBg : E.bg; }
  scene.environmentIntensity = night ? 0.035 : 1.0;
  scene.backgroundIntensity = 1.0;
  sun.visible = !night;
  hemi.intensity = night ? 0.04 : 0.3;
  renderer.toneMappingExposure = night ? 1.35 : 1.0;
  emissives.forEach((m) => { m.emissiveIntensity = EM[m.userData.cat][night ? 1 : 0]; });
  bloom.enabled = night;
  bloom.strength = 0.45;
  bloom.threshold = 1.05;
  // срез этажа: локальные плоскости — срезаются и тени; стены двусторонние, чтобы срез выглядел сплошным
  const on = state.cut !== 'all';
  cutPlane.constant = state.cut === 'gf' ? 3.80 : 7.45;
  if (on !== cutOn) {
    cutOn = on;
    allMats.forEach((m) => {
      m.clippingPlanes = on ? [cutPlane] : null;
      m.clipShadows = true;
      if (!m.transparent) m.side = on ? THREE.DoubleSide : m.userData.side0;
      m.needsUpdate = true;
    });
  }
  document.querySelectorAll('.seg').forEach((sg) => sg.querySelectorAll('button').forEach((b) => {
    const key = { sVar: 'variant', sTime: 'time', sCut: 'cut', sMode: 'mode' }[sg.id];
    b.classList.toggle('on', state[key] === b.dataset.v);
  }));
}
function seg(id, key, cb) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state[key] = b.dataset.v;
    if (cb) cb(b.dataset.v);
    apply();
  });
}
seg('#sVar', 'variant');
seg('#sTime', 'time');
seg('#sCut', 'cut', () => { if (state.mode === 'walk') setMode('orbit'); });
seg('#sMode', 'mode', (v) => setMode(v));

// ---------------------------------------------------------------- прогулка
const player = { pos: new THREE.Vector3(10.5, 0.6, -14.6), yaw: Math.PI, pitch: 0, vy: 0 };
const keys = {};
const ray = new THREE.Raycaster();
const EYE = 1.62, RAD = 0.32;
let locked = false;
function activeColliders() {
  return colliders.filter((c) => c.group === 'arch' || gaming.visible).map((c) => c.mesh);
}
const orbitSave = { pos: new THREE.Vector3(), target: new THREE.Vector3(), has: false };
function setMode(m) {
  if (m === 'walk' && state.mode !== 'walk') { orbitSave.pos.copy(camera.position); orbitSave.target.copy(controls.target); orbitSave.has = true; }
  if (m === 'orbit' && state.mode === 'walk' && orbitSave.has) { camera.position.copy(orbitSave.pos); controls.target.copy(orbitSave.target); }
  state.mode = m;
  controls.enabled = m === 'orbit';
  $('#cross').style.display = m === 'walk' && !isMobile ? 'block' : 'none';
  $('#joy').style.display = m === 'walk' && isMobile ? 'block' : 'none';
  const hint = $('#hint');
  if (m === 'walk') {
    state.cut = 'all';
    hint.textContent = isMobile ? 'Джойстик — ходьба, свайп — взгляд' : 'Клик по сцене — захват мыши · WASD — ходьба · Shift — бег · Esc — выход';
    hint.style.display = 'block';
    setTimeout(() => { hint.style.display = 'none'; }, 6000);
    camera.fov = 70;
  } else {
    hint.style.display = 'none';
    camera.fov = 50;
    if (document.pointerLockElement) document.exitPointerLock();
  }
  camera.updateProjectionMatrix();
  apply();
}
canvas.addEventListener('click', () => { if (state.mode === 'walk' && !isMobile && !locked) canvas.requestPointerLock(); });
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
document.addEventListener('mousemove', (e) => {
  if (!locked) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * 0.0022, -1.35, 1.35);
});
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });
// касания: джойстик + свайп
const joy = { x: 0, y: 0, id: null };
const jEl = $('#joy'), jKnob = jEl.querySelector('i');
jEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; jEl.setPointerCapture(e.pointerId); });
jEl.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  const r = jEl.getBoundingClientRect();
  let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
  const l = Math.hypot(dx, dy);
  if (l > 1) { dx /= l; dy /= l; }
  joy.x = dx; joy.y = dy;
  jKnob.style.transform = `translate(${dx * 38}px,${dy * 38}px)`;
});
const jEnd = () => { joy.x = joy.y = 0; joy.id = null; jKnob.style.transform = ''; };
jEl.addEventListener('pointerup', jEnd);
jEl.addEventListener('pointercancel', jEnd);
let look = null;
canvas.addEventListener('pointerdown', (e) => { if (state.mode === 'walk' && isMobile) look = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointermove', (e) => {
  if (!look) return;
  player.yaw -= (e.clientX - look.x) * 0.005;
  player.pitch = THREE.MathUtils.clamp(player.pitch - (e.clientY - look.y) * 0.005, -1.3, 1.3);
  look = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => { look = null; });

const tmpV = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
function blocked(from, dir, dist, cols) {
  for (const h of [0.45, 0.95, 1.5]) {
    ray.set(tmpV.copy(from).setY(from.y + h), dir);
    ray.far = dist + RAD;
    if (ray.intersectObjects(cols, false).length) return true;
  }
  return false;
}
function walk(dt) {
  const cols = activeColliders();
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y;
  const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
  const speed = (keys.ShiftLeft || keys.ShiftRight ? 3.4 : 1.7) * dt;
  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const mv = fwd.multiplyScalar(f).add(right.multiplyScalar(s));
  if (mv.lengthSq() > 1e-6) {
    mv.normalize().multiplyScalar(speed);
    const len = mv.length();
    const dir = mv.clone().normalize();
    if (!blocked(player.pos, dir, len, cols)) player.pos.add(mv);
    else {
      for (const axis of [new THREE.Vector3(Math.sign(mv.x), 0, 0), new THREE.Vector3(0, 0, Math.sign(mv.z))]) {
        const comp = Math.abs(axis.x ? mv.x : mv.z);
        if (comp > 1e-4 && !blocked(player.pos, axis, comp, cols)) { player.pos.addScaledVector(axis, comp); break; }
      }
    }
  }
  // пол и ступени
  ray.set(tmpV.copy(player.pos).setY(player.pos.y + 0.55), down);
  ray.far = 6;
  const hit = ray.intersectObjects(cols, false)[0];
  if (hit && hit.point.y <= player.pos.y + 0.46) {
    if (hit.point.y < player.pos.y - 0.03) {
      player.vy -= 9.8 * dt;
      player.pos.y = Math.max(hit.point.y, player.pos.y + player.vy * dt);
    } else {
      player.pos.y = hit.point.y;
      player.vy = 0;
    }
  }
  camera.position.set(player.pos.x, player.pos.y + EYE, player.pos.z);
  camera.rotation.set(0, 0, 0, 'YXZ');
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
}

// ---------------------------------------------------------------- комнаты, планы, рендеры, справка
// точки обзора комнат (координаты Blender: x, y → цель x, y) — те же, что у рендеров; остальные комнаты — от центра
const VIEWS = {
  family: [6.2, -3.3, 6.4, 6.0], dining: [6.1, -4.5, 6.1, -10.3], kitchen: [4.9, 4.2, 1.2, 9.6], stairhall: [11.6, 4.4, 6.0, 9.0],
  foyer: [11.0, 1.6, 10.2, 11.0], majlis: [22.9, 5.3, 14.0, 5.0], gallery: [1.2, -3.6, 8.0, 2.5], master: [15.7, 2.9, 23.2, 2.9],
  mbath: [22.4, 6.0, 19.6, 9.9], br2: [14.6, 5.0, 11.0, 0.5], br3: [4.3, 6.2, 1.6, 10.6], br4: [7.9, -6.9, 5.2, -9.8], br5: [1.45, -10.35, 3.0, -6.2],
};
function placeAt(x, y, z, tx, ty) {
  setMode('walk');
  player.pos.set(...B(x, y, z));
  player.yaw = Math.atan2(-(tx - x), ty - y);
  player.pitch = -0.06;
  player.vy = 0;
}
function teleport(r) {
  const z = r.level === 'GF' ? 0.6 : 4.5, v = VIEWS[r.code];
  if (v) return placeAt(v[0], v[1], z, v[2], v[3]);
  const [x0, y0, x1, y1] = r.rect, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (x1 - x0 >= y1 - y0) placeAt(x0 + 0.6, cy, z, x1, cy); else placeAt(cx, y0 + 0.6, z, cx, y1);
}
function buildRooms(data) {
  const box = $('#rlist');
  ['GF', 'FF'].forEach((lev) => {
    const h = document.createElement('h3');
    h.textContent = lev === 'GF' ? '1 этаж' : '2 этаж';
    box.appendChild(h);
    data.rooms.filter((r) => r.level === lev && r.area > 4).forEach((r) => {
      const b = document.createElement('button');
      b.innerHTML = `${r.name}<span>${ru(r.area)} м²</span>`;
      b.onclick = () => { teleport(r); if (isMobile) $('#rooms').style.display = 'none'; };
      box.appendChild(b);
    });
  });
  const ext = document.createElement('button');
  ext.innerHTML = 'Двор и бассейн<span>участок</span>';
  ext.onclick = () => { placeAt(16.0, -8.7, 0.45, 15.0, 0.0); if (isMobile) $('#rooms').style.display = 'none'; };
  box.appendChild(ext);
}
$('#bRooms').onclick = () => { const r = $('#rooms'); r.style.display = r.style.display === 'block' ? 'none' : 'block'; };
function modal(id) { $(id).style.display = 'flex'; }
document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m || e.target.classList.contains('x')) m.style.display = 'none'; }));
$('#bPlans').onclick = () => modal('#plans');
$('#bGal').onclick = () => modal('#gal');
$('#bInfo').onclick = () => modal('#info');
function buildGallery(list) {
  const g = $('#ggrid');
  list.forEach((it) => {
    const f = document.createElement('figure');
    f.innerHTML = `<img loading="lazy" src="renders/${it.file}" alt=""><figcaption>${it.title}</figcaption>`;
    f.querySelector('img').onclick = () => { const lb = $('#lb'); lb.querySelector('img').src = 'renders/' + it.file; lb.style.display = 'flex'; };
    g.appendChild(f);
  });
}
$('#lb').onclick = () => { $('#lb').style.display = 'none'; };
const ru = (v) => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
function buildInfo(d) {
  const rows = [['Объявление', '<a style="color:#00d8ff" href="https://www.propertyfinder.ae/to/152855778/en" target="_blank" rel="noopener">Property Finder 152855778</a>'],
    ['Цена', '450 000 AED / год'], ['Район', 'Mushrif Village, Mirdif, Dubai'], ['Участок', `${ru(d.plot_m2)} м² (11 899 sqft)`],
    ['Дом (оценка)', `${ru(d.bua_m2)} м² ≈ ${ru(d.bua_sqft)} sqft`], ['1 этаж / 2 этаж', `${ru(d.gf_m2)} / ${ru(d.ff_m2)} м²`],
    ['Спальни', '5 + комната прислуги'], ['Санузлы', '6 по объявлению: 5 ванных при спальнях и гостевой, плюс санузел прислуги'], ['Высота', '1 эт. 3,3 м · 2 эт. 3,1 м · гостиная 7,0 м'],
    ['Бассейн', '11,5 × 4,6 м, свой'], ['Парковка', 'под навесом, 3 машины']];
  $('#itab').innerHTML = rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');
}

// ---------------------------------------------------------------- цикл
const clock = new THREE.Clock();
const api = {
  state, scene, camera, renderer, player, frames: 0, ready: false,
  // для проверок: set({variant, time, cut, room, walkAt:[x,y,z,tx,ty], orbit:[x,y,z,tx,ty,tz]}) — координаты Blender
  set(o) {
    if (o.variant) state.variant = o.variant;
    if (o.time) state.time = o.time;
    if (o.room) { const r = rooms.find((q) => q.code === o.room); if (r) teleport(r); }
    if (o.walkAt) placeAt(...o.walkAt);
    if (o.orbit) {
      setMode('orbit');
      camera.position.set(...B(o.orbit[0], o.orbit[1], o.orbit[2]));
      controls.target.set(...B(o.orbit[3], o.orbit[4], o.orbit[5]));
    }
    if (o.cut) state.cut = o.cut;
    apply();
    return api.frames;
  },
  show(re, vis) { let n = 0; scene.traverse((o) => { if (o.isMesh && new RegExp(re).test(o.name)) { o.visible = vis; n++; } }); return n; },
  info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geoms: renderer.info.memory.geometries, tex: renderer.info.memory.textures, colliders: colliders.length }; },
};
window.__villa = api;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === 'walk') walk(dt); else controls.update();
  waterMats.forEach((m) => { m.normalMap.offset.x += dt * 0.012; m.normalMap.offset.y += dt * 0.007; });
  composer.render();
  api.frames++;
  requestAnimationFrame(loop);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
init().then(() => { api.ready = true; loop(); }).catch((e) => { $('#ltxt').textContent = 'Ошибка загрузки: ' + e.message; console.error(e); });
