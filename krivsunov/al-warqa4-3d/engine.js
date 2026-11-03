// Движок полной 3D-визуализации виллы: HDRI-небо и солнце по нему, мягкие тени, постобработка
// (затенение GTAO, свечение неона, тонмаппинг), пул цветного света по комнатам, зонды отражений в доме,
// режимы: обзор, пролёт по дому, прогулка от первого лица. Качество: ultra / high / medium.
// Мебель и декор: процедурная обстановка (cyber.js) и модели Poly Haven (props.js, models/*.glb); на «ультра»
// после первого кадра догружаются HD-текстуры (tex2k/: стены, камень и земля в 2K, мраморные полы в 4K).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Walker } from './walk.js';

export const QUALITY = {
  ultra: { label: 'Ультра', pixelRatio: 2, msaa: 4, ao: true, bloom: true, shadow: 4096, lights: 10, probe: 256 },
  high: { label: 'Высокое', pixelRatio: 1.5, msaa: 4, ao: true, bloom: true, shadow: 2048, lights: 7, probe: 256 },
  medium: { label: 'Среднее', pixelRatio: 1, msaa: 0, ao: false, bloom: true, shadow: 2048, lights: 4, probe: 128 }
};

export const TIMES = {
  // mean — средняя яркость неба, к которой приводится HDRI (ночные снимки Poly Haven нормализованы по экспозиции)
  day: { label: 'День', hdr: 'env/kloofendal_43d_clear_puresky_1k.hdr', exposure: 1.0, mean: 0, bg: 1.0, sun: 3.4, sunColor: 0xfff0dc, hemi: 0.45, bloom: [0.18, 0.35, 1.4], night: 0, neon: 0.15, fog: 0xd9e4ec },
  dusk: { label: 'Закат', hdr: 'env/qwantani_dusk_2_puresky_1k.hdr', exposure: 1.15, mean: 0.22, bg: 1.0, sun: 1.2, sunColor: 0xff9c63, hemi: 0.15, bloom: [0.4, 0.45, 0.95], night: 0.75, neon: 0.7, fog: 0x7d6a80 },
  night: { label: 'Ночь', hdr: 'env/qwantani_night_puresky_1k.hdr', exposure: 1.1, mean: 0.012, bg: 1.4, sun: 0.1, sunColor: 0xa6b8ff, hemi: 0.03, bloom: [0.65, 0.5, 0.65], night: 1, neon: 1, fog: 0x080b16 }
};

const TEXTURES = ['plaster', 'concrete_white', 'travertine', 'pavers', 'deck', 'asphalt', 'sand', 'grass', 'pool', 'gravel', 'bark', 'metal_black',
  'bath_stone', 'wall_paint', 'oak', 'walnut', 'leather_black', 'leather_tufted', 'carpet_dark', 'metal_brushed', 'diamond', 'concrete_dark',
  'plastic_black', 'fabric_grey', 'wood_dark', 'floor_cream', 'floor_taupe'];
// HD-набор (max/assets_pc.py --hd): тот же раскрой, большее разрешение
const HD_TEXTURES = ['plaster', 'concrete_white', 'travertine', 'pavers', 'deck', 'asphalt', 'sand', 'grass', 'pool', 'bath_stone',
  'wall_paint', 'concrete_dark', 'floor_cream', 'floor_taupe'];

// Маршрут пролёта: сплайн через точки камеры и сплайн через точки взгляда с тем же параметром.
function makeTour(stops) {
  const n = stops.length;
  const path = new THREE.CatmullRomCurve3(stops.map((s) => new THREE.Vector3(...s.pos)), false, 'centripetal');
  const lookPath = new THREE.CatmullRomCurve3(stops.map((s) => new THREE.Vector3(...s.look)), false, 'centripetal');
  const DIV = 24;
  path.arcLengthDivisions = (n - 1) * DIV;
  const lengths = path.getLengths(path.arcLengthDivisions);
  const total = lengths[lengths.length - 1];
  const at = stops.map((_, i) => lengths[i * DIV] / total);
  const segs = [];
  let t = 0;
  for (let i = 0; i < n; i++) {
    if (stops[i].hold) { segs.push({ i, start: t, end: t + stops[i].hold, hold: true }); t += stops[i].hold; }
    if (i === n - 1) break;
    const len = (at[i + 1] - at[i]) * total;
    const easeIn = i === 0 || !!stops[i].hold, easeOut = i === n - 2 || !!stops[i + 1].hold;
    const dur = Math.max(0.4, (len / (stops[i].speed || 1.8)) * (easeIn || easeOut ? 1.35 : 1));
    segs.push({ i, start: t, end: t + dur, u0: at[i], u1: at[i + 1], easeIn, easeOut });
    t += dur;
  }
  const labels = [];
  let current = '';
  for (const s of stops) { if (s.label) current = s.label; labels.push(current); }
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  return {
    duration: t,
    pose(time) {
      const seg = segs.find((s) => time < s.end) || segs[segs.length - 1];
      let u, index = seg.i;
      if (seg.hold) u = at[seg.i];
      else {
        let k = Math.min(1, Math.max(0, (time - seg.start) / (seg.end - seg.start)));
        if (seg.easeIn && seg.easeOut) k = k * k * (3 - 2 * k);
        else if (seg.easeIn) k = k * k * (2 - k);
        else if (seg.easeOut) k = k * (1 + k - k * k);
        u = seg.u0 + (seg.u1 - seg.u0) * k;
        if (k > 0.5) index = seg.i + 1;
      }
      const tt = path.getUtoTmapping(Math.min(1, Math.max(0, u)));
      path.getPoint(tt, pos);
      lookPath.getPoint(tt, look);
      return { pos, look, label: labels[index] };
    }
  };
}

// Направление на солнце в HDRI: центр самых ярких пикселей (данные в половинной точности).
function sunFromHDR(texture) {
  const { data, width, height } = texture.image;
  const half = data instanceof Uint16Array;
  const get = (i) => (half ? THREE.DataUtils.fromHalfFloat(data[i]) : data[i]);
  const ch = data.length / (width * height);
  let max = 0;
  const lum = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * ch;
    const l = 0.2126 * get(i) + 0.7152 * get(i + 1) + 0.0722 * get(i + 2);
    lum[y * width + x] = l;
    if (l > max) max = l;
  }
  let sx = 0, sy = 0, sz = 0, sum = 0;
  for (let i = 0; i < lum.length; i++) sum += lum[i];
  texture.userData.stats = { max, mean: sum / lum.length };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const l = lum[y * width + x];
    if (l < max * 0.5) continue;
    const az = ((x + 0.5) / width - 0.5) * Math.PI * 2;
    const el = (0.5 - (y + 0.5) / height) * Math.PI * (texture.flipY ? 1 : 1);
    sx += Math.cos(el) * Math.cos(az) * l;
    sy += Math.sin(el) * l;
    sz += Math.cos(el) * Math.sin(az) * l;
  }
  return new THREE.Vector3(sx, sy, sz).normalize();
}

export async function createEngine(container, opts) {
  const { villaModule, cyberModule, propsModule, onProgress = () => {}, onTour = () => {}, onWalk = () => {}, onRoom = () => {} } = opts;
  let qualityName = opts.quality || 'ultra';
  let Q = QUALITY[qualityName];
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.append(renderer.domElement);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // ---------- загрузка ----------
  const manager = new THREE.LoadingManager();
  manager.onProgress = (url, loaded, total) => onProgress(loaded / total, url);
  const texLoader = new THREE.TextureLoader(manager);
  const rgbe = new RGBELoader(manager);
  const base = {};
  const loadTex = (url, srgb) => new Promise((resolve) => texLoader.load(url, (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    resolve(t);
  }, undefined, () => resolve(null)));
  const hdrCache = {};
  const loadHDR = (url) => hdrCache[url] || (hdrCache[url] = new Promise((resolve, reject) => rgbe.load(url, resolve, undefined, reject)));
  const firstHDR = loadHDR(TIMES[opts.time || 'day'].hdr);
  // модели грузятся вместе с текстурами — одна полоса загрузки; ставятся после сборки дома
  const gltfLoader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  const propModels = {};
  const propsLoading = cyberModule && propsModule ? Promise.all([...new Set(propsModule.PROPS.map((p) => p.id))].map((id) =>
    gltfLoader.loadAsync(`models/${id}.glb`).then((g) => { propModels[id] = g; }, () => {}))) : Promise.resolve();
  await Promise.all(TEXTURES.map(async (name) => {
    const [map, normal, orm] = await Promise.all([loadTex(`tex/${name}_c.webp`, true), loadTex(`tex/${name}_n.webp`, false), loadTex(`tex/${name}_orm.webp`, false)]);
    base[name] = { map, normal, orm };
  }));
  const clones = {}; // копии базовых текстур по материалам: им HD-набор подменяет источник картинки
  function tex(name, mpt, rotate = 0) {
    const b = base[name];
    if (!b || !b.map) return null;
    const out = {};
    for (const key of ['map', 'normal', 'orm']) {
      if (!b[key]) continue;
      const t = b[key].clone();
      t.repeat.set(1 / mpt, 1 / mpt);
      t.rotation = rotate;
      t.needsUpdate = true;
      out[key] = t;
      ((clones[name] ||= {})[key] ||= []).push(t);
    }
    return out;
  }
  let hdDone = null;
  function upgradeTextures() { // по одной текстуре, без общего индикатора загрузки
    if (hdDone) return hdDone;
    const loader = new THREE.TextureLoader();
    hdDone = (async () => {
      let n = 0;
      for (const name of HD_TEXTURES) for (const [key, suffix] of [['map', 'c'], ['normal', 'n'], ['orm', 'orm']]) {
        if (!clones[name]?.[key]) continue;
        const t = await loader.loadAsync(`tex2k/${name}_${suffix}.webp`).catch(() => null);
        if (!t) continue;
        // другой размер картинки: старое неизменяемое хранилище текстуры освобождается, иначе WebGL не примет кадр
        for (const c of clones[name][key]) { c.dispose(); c.source = t.source; c.needsUpdate = true; }
        n++;
      }
      return n;
    })();
    return hdDone;
  }

  // ---------- сцена ----------
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hemi = new THREE.HemisphereLight(0xdfe9f3, 0xc9a77c, 0.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.4);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 5, far: 220 });
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);

  const villa = villaModule.build(THREE, { tex });
  const cyber = cyberModule ? cyberModule.build(villa.kit, { tex }) : null;
  scene.add(villa.root);
  if (cyber) scene.add(cyber.group);
  await propsLoading;
  const propsCount = cyber && propsModule ? propsModule.place(THREE, propModels, cyber.group, cyber.phys) : 0;
  const prepare = (root) => root.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = !node.userData.noCast;
      node.receiveShadow = true;
    }
  });
  prepare(villa.root);
  if (cyber) prepare(cyber.group);
  const thinGrass = () => villa.root.traverse((node) => { if (node.userData.grass) node.count = qualityName === 'medium' ? Math.floor(node.userData.grass / 3) : node.userData.grass; });
  thinGrass();
  const triangles = () => { // треугольники сцены (копии травинок — по числу копий)
    let n = 0;
    scene.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      const g = node.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3;
      n += node.isInstancedMesh ? t * node.count : t;
    });
    return Math.round(n);
  };

  // зонды отражений в доме: кубическая съёмка из холла 1-го этажа и малой гостиной 2-го
  const probes = {};
  const roomMaterials = new Set();
  const collectRoom = (root) => root.traverse((node) => {
    if (!node.isMesh) return;
    for (const m of [].concat(node.material)) if (m.userData.room) roomMaterials.add(m);
  });
  collectRoom(villa.root);
  if (cyber) collectRoom(cyber.group);
  const glowMats = new Set();
  const collectGlow = (root) => root.traverse((node) => {
    if (!node.isMesh) return;
    for (const m of [].concat(node.material)) if (m.emissive && m.emissive.getHex() !== 0) glowMats.add(m);
  });
  collectGlow(villa.root);
  if (cyber) collectGlow(cyber.group);
  function captureProbes() {
    const saved = [...glowMats].map((m) => [m, m.emissiveIntensity]);
    for (const [m, v] of saved) m.emissiveIntensity = v * 0.3;
    for (const [key, pos] of Object.entries(villa.probes)) {
      const rt = new THREE.WebGLCubeRenderTarget(Q.probe, { type: THREE.HalfFloatType });
      const cam = new THREE.CubeCamera(0.1, 300, rt);
      cam.position.set(...pos);
      cam.update(renderer, scene);
      const env = pmrem.fromCubemap(rt.texture);
      rt.dispose();
      if (probes[key]) probes[key].dispose();
      probes[key] = env;
    }
    for (const [m, v] of saved) m.emissiveIntensity = v;
    for (const m of roomMaterials) {
      const env = probes[m.userData.room] || probes.gf;
      if (env && m.envMap !== env.texture) { m.envMap = env.texture; m.needsUpdate = true; }
    }
  }

  // ---------- пул света ----------
  let pool = [];
  function buildPool() {
    for (const l of pool) scene.remove(l);
    pool = [];
    for (let i = 0; i < Q.lights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 2);
      l.userData.target = 0;
      scene.add(l);
      pool.push(l);
    }
  }
  buildPool();
  const state = { time: opts.time || 'day', furniture: opts.furniture !== false, mode: 'orbit' };
  const allEmitters = () => villa.lights.concat(cyber ? cyber.lights : []);
  const roomOf = (p) => {
    for (const r of villa.rooms) {
      if (p.x >= r.min[0] && p.x <= r.max[0] && p.y >= r.min[1] - 0.3 && p.y <= r.max[1] + 0.3 && p.z >= r.min[2] && p.z <= r.max[2]) return r;
    }
    return null;
  };
  const OPEN = new Set(['foyer', 'rear', 'mezz', 'living', 'dining']);
  let poolTimer = 0;
  let currentRoom = null;
  function assignPool(force = false) {
    const cam = camera.position;
    const r = roomOf(cam);
    if (r !== currentRoom) { currentRoom = r; onRoom(r ? r.name : ''); }
    const nightLevel = TIMES[state.time].night;
    const active = allEmitters().filter((e) => {
      if (e.set === 'cyber') return state.furniture;
      if (e.set === 'empty') return !state.furniture && nightLevel > 0;
      if (e.set === 'night') return nightLevel > 0;
      return true;
    });
    const here = r ? r.id : 'outside';
    const scored = active.map((e) => {
      const d = cam.distanceTo(new THREE.Vector3(...e.pos));
      let s = e.intensity / (1 + d * d * 0.08);
      if (e.room === here) s *= 6;
      else if (OPEN.has(here) && OPEN.has(e.room)) s *= 2.5;
      else if (here === 'outside' && (e.room === 'yard' || e.room === 'street')) s *= 3;
      return { e, s };
    }).sort((a, b) => b.s - a.s).slice(0, pool.length);
    pool.forEach((l, i) => {
      const item = scored[i];
      if (!item) { l.userData.target = 0; return; }
      const e = item.e;
      if (l.userData.emitter !== e) {
        l.userData.emitter = e;
        l.position.set(...e.pos);
        l.color.set(e.color);
        l.distance = e.distance;
        if (!force) l.intensity = 0;
      }
      l.userData.target = e.intensity * (e.set === 'empty' ? nightLevel : e.set === 'cyber' ? TIMES[state.time].neon : 1);
      if (force) l.intensity = l.userData.target;
    });
  }

  // ---------- камера, управление ----------
  const ORBIT_FOV = 40, TOUR_FOV = 60;
  const camera = new THREE.PerspectiveCamera(ORBIT_FOV, 1, 0.3, 2000);
  const controls = new OrbitControls(camera, renderer.domElement);
  const ORBIT = { minDistance: 4, maxDistance: 180, enableZoom: true, enablePan: true };
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  Object.assign(controls, ORBIT);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 0.5;
  const views = villa.views;
  let tween = null;
  function setLens(near, fov) {
    if (camera.near !== near || camera.fov !== fov) { camera.near = near; camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  function orbitMode() {
    Object.assign(controls, ORBIT, { enabled: true });
    setLens(0.3, ORBIT_FOV);
    state.mode = 'orbit';
  }

  // ---------- двери ----------
  const doors = (villa.doors || []).map((obj) => ({ obj, open: obj.userData.openAngle || 0, target: 0 }));

  // ---------- пролёт ----------
  const route = villa.tour && villa.tour.length > 1 ? makeTour(villa.tour) : null;
  let tourState = 'idle', tourTime = 0, tourLabel = '', lastNotice = 0;
  const lookAt = new THREE.Vector3();
  const notifyTour = () => onTour({ state: tourState, label: tourLabel, progress: route ? tourTime / route.duration : 0, duration: route ? route.duration : 0 });
  const insideHouse = (p) => Math.abs(p.x) < 13.5 && Math.abs(p.z) < 8.2 && p.y < 10;
  function applyTour() {
    const pose = route.pose(tourTime);
    camera.position.copy(pose.pos);
    lookAt.copy(pose.look);
    camera.lookAt(lookAt);
    setLens(insideHouse(pose.pos) ? 0.05 : 0.3, TOUR_FOV);
    if (pose.label !== tourLabel) { tourLabel = pose.label; notifyTour(); }
  }
  function freeLook() {
    const dir = lookAt.clone().sub(camera.position).normalize();
    controls.target.copy(camera.position).addScaledVector(dir, 0.05);
    Object.assign(controls, { minDistance: 0.01, maxDistance: 0.2, enableZoom: false, enablePan: false, enabled: true });
    controls.update();
  }
  const tour = route && {
    get duration() { return route.duration; },
    get state() { return tourState; },
    start() {
      walker.stop();
      tween = null;
      controls.autoRotate = false;
      controls.enabled = false;
      tourTime = 0;
      tourState = 'playing';
      state.mode = 'tour';
      for (const d of doors) d.target = d.open;
      applyTour();
      notifyTour();
    },
    pause() { if (tourState === 'playing') { tourState = 'paused'; freeLook(); notifyTour(); } },
    resume() { if (tourState === 'paused') { controls.enabled = false; tourState = 'playing'; notifyTour(); } },
    stop(toView = 'start') {
      if (tourState === 'idle') return;
      tourState = 'idle';
      tourLabel = '';
      for (const d of doors) d.target = 0;
      orbitMode();
      if (toView) setView(toView);
      notifyTour();
    },
    seek(time) {
      tourTime = Math.min(route.duration, Math.max(0, time));
      for (const d of doors) { d.target = d.open; d.obj.rotation.y = d.open; }
      applyTour();
      assignPool(true);
      render(0);
      return tourLabel;
    }
  };
  renderer.domElement.addEventListener('pointerdown', () => { if (tour && tourState === 'playing') tour.pause(); }, { capture: true });

  function setView(name, instant) {
    const view = views[name] || views.start;
    if (!view) return;
    walker.stop();
    if (tour && tourState !== 'idle') { tourState = 'idle'; tourLabel = ''; for (const d of doors) d.target = 0; notifyTour(); }
    orbitMode();
    const from = { pos: camera.position.clone(), target: controls.target.clone() };
    const to = { pos: new THREE.Vector3(...view.pos), target: new THREE.Vector3(...view.target) };
    if (instant) {
      camera.position.copy(to.pos);
      controls.target.copy(to.target);
      controls.update();
      return;
    }
    tween = { from, to, start: performance.now(), duration: 1100 };
  }

  // ---------- прогулка ----------
  let physCache = null;
  const physics = () => {
    if (physCache) return physCache;
    const p = villa.phys;
    physCache = !cyber || !state.furniture ? p
      : { colliders: p.colliders.concat(cyber.phys.colliders), walkables: p.walkables.concat(cyber.phys.walkables), polys: p.polys.concat(cyber.phys.polys) };
    return physCache;
  };
  const walker = new Walker(camera, renderer.domElement, physics, {
    onChange: (info) => {
      if (info.active) {
        tween = null;
        controls.enabled = false;
        state.mode = 'walk';
        setLens(0.05, 72);
      } else if (state.mode === 'walk' && !info.active) {
        orbitMode();
        controls.target.copy(camera.position).add(new THREE.Vector3(0, -1, -6).applyQuaternion(camera.quaternion).setY(0).normalize().multiplyScalar(6));
        setView('start');
      }
      onWalk(info);
    }
  });

  // ---------- постобработка ----------
  let composer, gtao, bloom;
  function buildComposer() {
    if (composer) composer.dispose();
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: Q.msaa });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    gtao = null;
    if (Q.ao && opts.debug?.ao !== false) {
      gtao = new GTAOPass(scene, camera, w, h);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 1.0;
      gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.2, thickness: 1.5, scale: 1.1, samples: 16 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: 16 });
      gtao.overrideVisibility = function () { // стекло, вода и неон не затеняют то, что за ними
        const cache = this._visibilityCache;
        this.scene.traverse((o) => {
          cache.set(o, o.visible);
          if (o.isPoints || o.isLine || o.isSprite || (o.isMesh && (o.material.transparent || o.userData.noAO))) o.visible = false;
        });
      };
      composer.addPass(gtao);
    }
    bloom = null;
    // пиковая яркость до свечения ограничена: от крошечных ярких точек не расползаются квадратные ореолы.
    // Зеркальный блик лампы на воде переполняет HalfFloat (Inf), а Inf·0 даёт NaN, который свечение размазывает
    // в чёрный квадрат, — поэтому Inf заменяется пределом, NaN — нулём (проверка по битам, её не съест оптимизатор)
    composer.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null }, maxValue: { value: 5.0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float maxValue; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          uvec3 b = floatBitsToUint(c.rgb) & uvec3(0x7fffffffu);
          c.rgb = mix(c.rgb, vec3(maxValue), equal(b, uvec3(0x7f800000u)));
          c.rgb = max(mix(c.rgb, vec3(0.0), greaterThan(b, uvec3(0x7f800000u))), vec3(0.0));
          float m = max(max(c.r, c.g), c.b);
          gl_FragColor = vec4(c.rgb * min(1.0, maxValue / max(m, 1e-4)), 1.0);
        }`
    }));
    if (Q.bloom && opts.debug?.bloom !== false) {
      bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.4, 0.6, 1.0);
      composer.addPass(bloom);
    }
    composer.addPass(new OutputPass());
    if (!Q.msaa) composer.addPass(new SMAAPass(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()));
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    applyTimeParams();
  }

  // ---------- время суток ----------
  let envTarget = null;
  function applyTimeParams() {
    const T = TIMES[state.time];
    renderer.toneMappingExposure = T.exposure;
    if (bloom) [bloom.strength, bloom.radius, bloom.threshold] = T.bloom;
  }
  async function setTime(name, recapture = true) {
    const T = TIMES[name];
    if (!T) return;
    state.time = name;
    const hdr = await loadHDR(T.hdr);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const sunDir = hdr.userData.sun || (hdr.userData.sun = sunFromHDR(hdr));
    // повернуть небо так, чтобы солнце светило с юго-запада на фасад (как на фото брошюры)
    const want = Math.atan2(-0.7, 0.55);
    const have = Math.atan2(sunDir.x, sunDir.z);
    const rot = want - have;
    scene.environmentRotation.set(0, rot, 0);
    scene.backgroundRotation.set(0, rot, 0);
    const d = sunDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    if (d.y < 0.12) d.y = 0.12;
    d.normalize();
    sun.position.copy(d).multiplyScalar(90);
    sun.target.position.set(0, 0, 0);
    sun.color.set(T.sunColor);
    sun.intensity = T.sun;
    hemi.intensity = T.hemi;
    if (envTarget) envTarget.dispose();
    envTarget = pmrem.fromEquirectangular(hdr);
    scene.environment = envTarget.texture;
    const scale = T.mean ? T.mean / hdr.userData.stats.mean : 1;
    scene.environmentIntensity = scale;
    scene.background = hdr;
    scene.backgroundIntensity = scale * T.bg;
    scene.fog = new THREE.Fog(T.fog, 260, 1200);
    for (const item of villa.night.concat(cyber ? cyber.night : [])) item.mat.emissiveIntensity = item.on * T.night;
    applyTimeParams();
    assignPool(true);
    if (recapture) captureProbes();
  }

  // ---------- мебель и декор ----------
  function setFurniture(on) {
    state.furniture = !!on;
    physCache = null;
    if (cyber) {
      cyber.group.visible = state.furniture;
      cyber.setMode?.(state.furniture);
    }
    assignPool(true);
    captureProbes();
  }

  // ---------- размеры, цикл ----------
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setSize(w, h);
      if (gtao) gtao.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    }
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  await firstHDR;
  await setTime(state.time, false);
  setFurniture(state.furniture);
  buildComposer();
  resize();
  setView('start', true);
  // таймер, а не кадр анимации: в фоновой вкладке кадры не идут, а догрузка нужна и проверочным снимкам
  const hdReady = new Promise((resolve) => setTimeout(() => resolve(qualityName === 'ultra' && opts.hd !== false ? upgradeTextures() : 0), 0));

  const anims = villa.anim.concat(cyber ? cyber.anim : []);
  let running = true, last = performance.now(), clock = 0, frames = 0;
  function render(dt) {
    clock += dt;
    for (const fn of anims) fn(clock, dt, camera);
    for (const door of doors) {
      const r = door.obj.rotation;
      if (state.mode === 'walk') {
        const [hx, hz] = door.obj.userData.hinge || [0, 0];
        door.target = Math.hypot(camera.position.x - hx, camera.position.z - hz) < 3.4 ? door.open : 0;
      }
      if (r.y !== door.target) r.y += Math.sign(door.target - r.y) * Math.min(Math.abs(door.target - r.y), dt * 1.8);
    }
    for (const l of pool) {
      const k = Math.min(1, dt * 4);
      l.intensity += (l.userData.target - l.intensity) * k;
    }
    composer.render(dt);
    frames += 1;
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (tourState === 'playing') {
      tourTime += dt;
      if (tourTime >= route.duration) {
        tourTime = route.duration;
        applyTour();
        tourState = 'idle';
        tourLabel = '';
        for (const d of doors) d.target = 0;
        orbitMode();
        controls.target.copy(lookAt);
        notifyTour();
      } else {
        applyTour();
        if (now - lastNotice > 250) { lastNotice = now; notifyTour(); }
      }
    } else if (state.mode === 'walk') {
      walker.update(dt);
    } else {
      if (tween) {
        const t = Math.min(1, (now - tween.start) / tween.duration);
        const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
        controls.target.lerpVectors(tween.from.target, tween.to.target, k);
        if (t >= 1) tween = null;
      }
      controls.update();
    }
    poolTimer -= dt;
    if (poolTimer <= 0) { poolTimer = 0.25; assignPool(); }
    render(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    THREE, scene, camera, renderer, controls, villa, cyber, views: Object.keys(views), tour,
    get state() { return { ...state, quality: qualityName, tour: tourState }; },
    setView,
    setTime,
    setFurniture,
    setQuality(name) {
      if (!QUALITY[name]) return;
      qualityName = name;
      Q = QUALITY[name];
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pixelRatio));
      sun.shadow.mapSize.set(Q.shadow, Q.shadow);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      buildPool();
      buildComposer();
      resize();
      thinGrass();
      assignPool(true);
      captureProbes();
      if (name === 'ultra' && opts.hd !== false) upgradeTextures();
    },
    setAutoRotate(on) { if (on) { tour?.stop(); walker.stop(); } controls.autoRotate = !!on; },
    get autoRotate() { return controls.autoRotate; },
    walk: {
      start(spawn) { tour?.stop(null); walker.start(spawn || villa.spawn); },
      stop() { walker.stop(); },
      get active() { return walker.active; },
      walker
    },
    renderOnce() { assignPool(true); controls.update(); render(0); },
    shot(pos, look, fov = 62) { // для проверок: кадр с заданной камеры
      walker.stop();
      controls.enabled = false;
      camera.position.set(...pos);
      camera.lookAt(...look);
      setLens(insideHouse(camera.position) ? 0.05 : 0.3, fov);
      assignPool(true);
      for (let i = 0; i < 12; i++) for (const l of pool) l.intensity = l.userData.target;
      render(0);
    },
    get frames() { return frames; },
    hdReady,
    info() { return { props: propsCount, sceneTriangles: triangles(), hdr: scene.background?.userData?.stats, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries }; },
    dispose() {
      running = false;
      observer.disconnect();
      walker.dispose();
      controls.dispose();
      composer?.dispose();
      scene.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        for (const material of [].concat(node.material || [])) {
          for (const value of Object.values(material)) if (value && value.isTexture) value.dispose();
          material.dispose();
        }
      });
      for (const p of Object.values(probes)) p.dispose();
      envTarget?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
