// Вариант 3: запечённый свет Cycles. Дом, интерьер и участок взяты из Blender со вторым каналом развёртки и картами
// освещения (Cycles, 384 прохода: солнце и небо HDRI, все отражения света); сайт умножает их на свои фотосканы.
// Блики — от HDRI неба снаружи и от «комнаты» внутри; соседи, гольф, деревья и трава — живой свет (солнце HDRI с тенями).
// Тонмаппинг AgX «Medium High Contrast» и экспозиция EV — как у рендеров Cycles. Работает везде, где есть WebGL 2.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MAIN, LAB, LAB_CSS, HDRI, hdriStrength, hdriRotation, evToExposure, EV, PHONE, dprFor, fitStart, loadCams, loadModel, setCam, compareUI, navUI, $ } from '../shared/lab.js?v=vd1-furn-20261107';

const style = document.createElement('style'); style.textContent = LAB_CSS; document.head.append(style);
const status = $('#status'), stage = $('#stage');
const say = (t) => { status.textContent = t; };

// AgX Blender с look «Medium High Contrast»: контраст 1,2 вокруг средне-серого (0,4 в 25-ступенчатом AgX Log Blender =
// 0,606 в 16,5-ступенчатой шкале three.js), как у рендеров Cycles
{
  const pars = THREE.ShaderChunk.tonemapping_pars_fragment;
  const agx = pars.match(/vec3 AgXToneMapping\( vec3 color \) \{[\s\S]*?\n\}/)[0];
  const mhc = agx.replace('AgXToneMapping', 'CustomToneMapping')
    .replace('color = agxDefaultContrastApprox( color );', 'color = clamp( ( color - 0.6060606 ) * 1.2 + 0.6060606, 0.0, 1.0 );\n\tcolor = agxDefaultContrastApprox( color );');
  THREE.ShaderChunk.tonemapping_pars_fragment = pars.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', mhc);
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(dprFor(2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.CustomToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
stage.append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
fitStart(camera, controls, [-41, 15, -12], [-4, 3.4, 0.5]);

say('Собираю дом, участок и гольф…');
const model = await loadModel(THREE);
scene.add(model.root);
const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: 0x9a9a6c, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; ground.receiveShadow = true;
scene.add(ground);

// небо дня рендеров Cycles: фон — HDRI как есть, блики и рассеянный свет живых объектов — HDRI без солнца
// (солнце светит направленным светом с тенями), всё в единицах Blender
const h = HDRI.day, k = hdriStrength(h), rot = hdriRotation(h);
say('Загружаю небо…');
// небо читается в 32 бита (обрезать солнце), а на видеокарту идёт в half-float: на iPhone нет линейной фильтрации
// 32-битных текстур (OES_texture_float_linear), такое небо и отражения были бы чёрными
const hdr = await new HDRLoader().setDataType(THREE.FloatType).loadAsync(h.url);
const toHalf = (f) => { const u = new Uint16Array(f.length); for (let i = 0; i < f.length; i++) u[i] = THREE.DataUtils.toHalfFloat(f[i]); return u; };
const halfTex = (data) => Object.assign(new THREE.DataTexture(toHalf(data), hdr.image.width, hdr.image.height, THREE.RGBAFormat, THREE.HalfFloatType),
  { mapping: THREE.EquirectangularReflectionMapping, colorSpace: THREE.LinearSRGBColorSpace, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, flipY: hdr.flipY, needsUpdate: true });
scene.background = halfTex(hdr.image.data);
scene.backgroundIntensity = k;
scene.backgroundRotation.set(0, rot, 0);
let noSun;
{
  const d = new Float32Array(hdr.image.data), n = d.length / 4;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  const sorted = Float32Array.from(lum).sort();
  const cap = sorted[Math.floor(n * 0.995)] * 4;   // солнце и ореол — выше четырёх 99,5-х процентилей неба
  for (let i = 0; i < n; i++) if (lum[i] > cap) { const s = cap / lum[i]; d[i * 4] *= s; d[i * 4 + 1] *= s; d[i * 4 + 2] *= s; }
  noSun = halfTex(d);
}
const pmrem = new THREE.PMREMGenerator(renderer);
const envSky = pmrem.fromEquirectangular(noSun).texture;
scene.environment = envSky;
scene.environmentIntensity = k;
scene.environmentRotation.set(0, rot, 0);
const sunDir = new THREE.Vector3();
{ const a = h.sun.azimuth * Math.PI / 180, e = h.sun.elevation * Math.PI / 180; sunDir.set(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)); }
const sun = new THREE.DirectionalLight(new THREE.Color(1.054, 0.993, 0.909), h.sunY * k / h.scale);
sun.position.copy(sunDir).multiplyScalar(90);
sun.castShadow = true;
sun.shadow.mapSize.set(PHONE ? 2048 : 4096, PHONE ? 2048 : 4096);
sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.025;
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 20, far: 200 });
scene.add(sun, sun.target);

// «комната» для бликов внутри дома (полы под лаком, стекло, металл): тёплые стены, светлые окна
const roomScene = new THREE.Scene();
{
  const tone = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.BackSide });
  const walls = tone(0.62, 0.58, 0.52);
  roomScene.add(new THREE.Mesh(new THREE.BoxGeometry(16, 5, 16), [walls, walls, tone(0.74, 0.72, 0.68), tone(0.55, 0.47, 0.36), walls, walls]));
  for (const [x, z, ry] of [[0, -7.9, 0], [7.9, 0, -Math.PI / 2]]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5.4, 5.8) }));
    win.position.set(x, 0.3, z); win.rotation.y = ry; roomScene.add(win);
  }
}
const envRoom = pmrem.fromScene(roomScene, 0.03).texture;
// мебель (живой свет, её нет в запечённой сцене): рассеянный свет и блики — от «комнаты», яркость — как у запечённого интерьера
model.root.traverse((o) => {
  if (o.isMesh) for (const m of [].concat(o.material)) if (/^f_/.test(m.name || '')) { m.envMap = envRoom; m.envMapIntensity = 3; }
});

// процедурные части, которые заменяет запечённая сцена: всё, что запекалось в Blender (участок, дом, интерьер, двери)
const SKIP_MAT = /^(x_glass|x_glassFar|x_glassRefl|x_railGlass|i_glass|x_lamp|i_led|i_downlight|x_water|x_poolWater|p_|g_)/;
const LIVE_OB = /^(neighbors_|env_|plants_|furniture)/;   // мебели нет в запечённой сцене — у неё живой свет
const HUGE = /^ground_x_(rough|fairway|lawn|sand|asphalt|green)$/;
const mats = new Map();
const box = new THREE.Box3(), c = new THREE.Vector3();
const live = (o) => { for (let p = o; p; p = p.parent) if (LIVE_OB.test(p.name || '')) return true; return false; };
model.root.traverse((o) => {
  if (!o.isMesh) return;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (m && m.name && !mats.has(m.name)) mats.set(m.name, m);
  o.castShadow = !o.userData.noCast; o.receiveShadow = true;
  if (o.isInstancedMesh || live(o) || HUGE.test(o.name) || (m && SKIP_MAT.test(m.name || ''))) return;
  box.setFromObject(o).getCenter(c);
  if (Math.abs(c.z) > 9.5 || c.x > 21.5) return;
  o.visible = false;
});

say('Загружаю запечённую сцену и карты освещения…');
const BAKED = new URL('baked/', LAB);
const man = await (await fetch(new URL('manifest.json', BAKED))).json();
const byName = new Map(man.objects.map((o) => [THREE.PropertyBinding.sanitizeNodeName(o.object), o]));   // GLTFLoader убирает точки из имён
const draco = new DRACOLoader().setDecoderPath(new URL('vendor/three/examples/jsm/libs/draco/gltf/', LAB).href);
const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(new URL('vd1_baked.glb', BAKED).href);
const texLoader = new THREE.TextureLoader();
const bakedMats = [], loads = [];
let nBaked = 0;
// запечённый материал: свет только из карты освещения (без солнца и рассеянного неба — они уже в карте), блики живые
const bakePatch = (m) => {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_fragment_begin>', '#undef RE_Direct\n#include <lights_fragment_begin>')
      .replace('#include <lights_fragment_maps>', THREE.ShaderChunk.lights_fragment_maps.replace(/iblIrradiance \+= getIBLIrradiance\( geometryNormal \);/, ''));
  };
  m.customProgramCacheKey = () => 'baked';
};
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  const info = byName.get(o.name) || byName.get(o.parent && o.parent.name);
  const srcName = (o.material.name || '').split('.')[0];
  const src = mats.get(srcName);
  if (!info || !src) { o.visible = false; return; }
  const m = src.clone();
  m.name = srcName;
  let done; loads.push(new Promise((r) => { done = r; }));
  const lm = texLoader.load(new URL(info.file, BAKED).href, done, undefined, done);
  lm.colorSpace = THREE.SRGBColorSpace; lm.flipY = false; lm.channel = 1;
  m.lightMap = lm;
  m.lightMapIntensity = Math.PI * info.scale;
  m.envMap = srcName.startsWith('i_') ? envRoom : null;   // в доме — блики «комнаты», снаружи — неба (scene.environment)
  m.envMapIntensity = srcName.startsWith('i_') ? 1 : 1;
  bakePatch(m);
  o.material = m;
  o.castShadow = true; o.receiveShadow = false;
  bakedMats.push(m);
  nBaked++;
});
scene.add(gltf.scene);
await Promise.all(loads);
const { texturesReady } = await import('../shared/lab.js?v=vd1-furn-20261107');
const nTex = await texturesReady(model.root);

let evPreset = null, evShift = 0;
function applyExposure() {
  const base = evPreset ?? (model.inside(camera.position) ? EV.inside : EV.outside);
  renderer.toneMappingExposure = evToExposure(base - evShift);
}
const { Walker } = await import(`${MAIN}villa3d/walk.js?v=vd1-fix-20261106`);
const walker = new Walker(camera, renderer.domElement, () => model.phys, {});
let mode = 'orbit';
const cmp = compareUI(stage);
const cams = await loadCams();
const resetCam = () => { camera.clearViewOffset(); camera.fov = 60; camera.updateProjectionMatrix(); };
const ui = navUI({
  title: 'Вариант 3 · запечённый свет Cycles',
  cams,
  onCam(cm) {
    if (mode === 'walk') { walker.stop(); mode = 'orbit'; }
    const look = setCam(camera, cm, innerWidth, innerHeight);
    controls.target.set(...look); controls.enabled = false;
    evPreset = cm.ev; cmp.show(cm.name);
  },
  onOrbit() { if (mode === 'walk') walker.stop(); mode = 'orbit'; evPreset = null; cmp.hide(); resetCam(); controls.enabled = true; ui.select.value = ''; },
  onWalk() { cmp.hide(); evPreset = null; ui.select.value = ''; resetCam(); controls.enabled = false; walker.start(model.spawns.living); mode = 'walk'; },
  extra: (() => {
    const ev = document.createElement('select');
    ev.innerHTML = [-2, -1, -0.5, 0, 0.5, 1, 2].map((v) => `<option value="${v}"${v === 0 ? ' selected' : ''}>экспозиция ${v > 0 ? '+' : ''}${v}</option>`).join('');
    ev.addEventListener('change', () => { evShift = +ev.value; });
    return [ev];
  })()
});
addEventListener('pointerdown', (e) => { if (!controls.enabled && mode === 'orbit' && !e.target.closest('.panel') && !e.target.closest('.cmp input')) { controls.enabled = true; cmp.hide(); evPreset = null; ui.select.value = ''; resetCam(); } });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

// слой отражений стекла: снаружи — небо по Френелю, изнутри стекло отражает тёмную комнату, а не небо — слой выключен
const reflMeshes = [];
model.root.traverse((o) => {
  if (!o.isMesh) return;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (/Refl$/.test(m.name || '')) reflMeshes.push(o);
  // тонировка фасадного стекла — как у камеры Cycles сквозь два слоя бронзового стекла (0,8·0,74·0,64 на слой)
  if (m.isMeshBasicMaterial && m.blending === THREE.MultiplyBlending) m.color.setRGB(0.64, 0.55, 0.41);
});
let lastT = performance.now(), shadowsDone = false;
renderer.shadowMap.autoUpdate = false;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (mode === 'walk') walker.update(dt); else if (controls.enabled) controls.update();
  model.update(dt, now / 1000, { mode: 'pt' });
  applyExposure();
  const inHouse = model.inside(camera.position);
  for (const o of reflMeshes) o.visible = !inHouse;
  if (!shadowsDone) { renderer.shadowMap.needsUpdate = true; shadowsDone = true; }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);
say(`Запечено объектов: ${nBaked} · карт освещения ${man.objects.length} · ${man.samples} проходов Cycles`);
window.__lab = {
  THREE, renderer, scene, camera, controls, model, cams, frame, bakedMats,
  view(name) { ui.select.value = name; ui.select.dispatchEvent(new Event('change')); },
  pose(c) { setCam(camera, { lens: 18, straight: false, ...c }, innerWidth, innerHeight); controls.enabled = false; },
  setEV(v) { evPreset = v; },
  snap(type = 'image/jpeg', q = 0.9) { frame(performance.now()); return renderer.domElement.toDataURL(type, q); },
  get stage() { return 'raster'; }, get samples() { return 1; }, get complete() { return true; }, buildMs: 0, nTex
};
