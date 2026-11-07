// Вариант 1: трассировка путей прямо в браузере на WebGPU (three-gpu-pathtracer 0.0.28, волновой трассировщик на
// вычислительных шейдерах) с шумодавом OIDN — тем же, что у Blender. Небо и солнце — HDRI рендеров Cycles в люксах,
// экспозиция по EV, как у тех рендеров, тонмаппинг AgX «Medium High Contrast». Пока камера движется — грубый кадр
// трассировки, стоит — кадр дособирается до заданного числа проходов и чистится OIDN.
import * as THREE from 'three/webgpu';
import { Fn, vec3, mat3, float, max, log2, clamp, pow } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { WebGPUPathTracer, OIDNDenoiser } from 'three-gpu-pathtracer/webgpu';
import { initUNetFromURL } from 'oidn-webgpu';
import { MAIN, LAB, LAB_CSS, HDRI, hdriStrength, hdriRotation, evToExposure, EV, PHONE, fitStart, shrinkTextures, loadCams, loadModel, texturesReady, ptMaterials, setCam, compareUI, navUI, $ } from '../shared/lab.js?v=vd1-ios-20261107';

const style = document.createElement('style'); style.textContent = LAB_CSS; document.head.append(style);
const status = $('#status'), stage = $('#stage');
const say = (t) => { status.textContent = t; };

// без WebGPU (iPhone до iOS 26, Firefox) и после сбоя — та же трассировка на WebGL 2 (webgl.html). Сбой ловится и тогда,
// когда вкладка падает целиком (на телефоне — от нехватки памяти): метка запуска снимается только после первых проходов
const GUARD = 'vd1-webgpu-start', params = new URLSearchParams(location.search);
let started = false;
function toGL(why) {
  localStorage.removeItem(GUARD);
  location.replace(`./webgl.html?why=${encodeURIComponent(why)}`);
  throw new Error(`WebGPU: ${why}`);
}
if (params.has('gl')) toGL('выбрано вручную');
const crashed = +localStorage.getItem(GUARD);
if (crashed && Date.now() - crashed < 15 * 60e3 && !params.has('gpu')) toGL('прошлый запуск оборвался');
const adapter = navigator.gpu ? await navigator.gpu.requestAdapter().catch(() => null) : null;
if (!adapter) toGL(navigator.gpu ? 'видеокарта не отдала адаптер' : 'в этом браузере его нет');
localStorage.setItem(GUARD, String(Date.now()));
const onFail = (e) => { if (!started) { console.error(e); toGL('ошибка запуска'); } };
addEventListener('error', (e) => onFail(e.error || e.message));
addEventListener('unhandledrejection', (e) => onFail(e.reason));
addEventListener('pagehide', () => { if (!started) localStorage.removeItem(GUARD); });   // ушли сами — это не сбой

// AgX Blender с look «Medium High Contrast» (как у рендеров Cycles): контраст 1,2 вокруг средне-серого (0,4 в 25-ступенчатом
// AgX Log Blender = 0,606 в 16,5-ступенчатой шкале three.js)
const agxMHC = Fn(([color, exposure]) => {
  const inset = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const outset = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  const toRec2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
  const toSRGB = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
  const c = vec3(color).mul(exposure).toVar();
  c.assign(inset.mul(toRec2020.mul(c)));
  c.assign(clamp(log2(max(c, 1e-10)).add(12.47393).div(16.499999), 0.0, 1.0));
  c.assign(clamp(c.sub(0.6060606).mul(1.2).add(0.6060606), 0.0, 1.0));
  const x2 = c.mul(c).toVar(), x4 = x2.mul(x2).toVar();
  c.assign(float(15.5).mul(x4.mul(x2)).sub(x4.mul(c).mul(40.14)).add(x4.mul(31.96)).sub(x2.mul(c).mul(6.868)).add(x2.mul(0.4298)).add(c.mul(0.1191)).sub(0.00232));
  c.assign(pow(max(vec3(0.0), outset.mul(c)), vec3(2.2)));
  return clamp(toSRGB.mul(c), 0.0, 1.0);
}, { color: 'vec3', exposure: 'float', return: 'vec3' });

const renderer = new THREE.WebGPURenderer({ antialias: false, trackTimestamp: true });
await renderer.init();
if (!renderer.backend.isWebGPUBackend) toGL('движок перешёл на WebGL');
renderer.onDeviceLost = (info) => { if (info && info.reason !== 'destroyed') toGL('видеокарта сбросила WebGPU'); };
// телефон: кадр трассировки в 1× пикселях — в 4–9 раз меньше работы и памяти шумодава, чем в 2–3×
renderer.setPixelRatio(PHONE ? 1 : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.library.addToneMapping(agxMHC, THREE.CustomToneMapping);
renderer.toneMapping = THREE.CustomToneMapping;
stage.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 3000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
fitStart(camera, controls, [-41, 15, -12], [-4, 3.4, 0.5]);

say('Собираю дом и жду фотосканы…');
const model = await loadModel(THREE, PHONE ? 'low' : 'high');
const nTex = await texturesReady(model.root);
ptMaterials(THREE, model.root);
if (PHONE) shrinkTextures(model.root, 512);   // атлас текстур трассировщика на телефоне — в 4 раза меньше
scene.add(model.root);
const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: 0x9a9a6c, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03;
scene.add(ground);

const hdrs = {};
let sky = 'day', evPreset = null;
async function setSky(key) {
  const h = HDRI[key];
  if (!hdrs[key]) { const t = await new HDRLoader().loadAsync(h.url); t.mapping = THREE.EquirectangularReflectionMapping; hdrs[key] = t; }
  sky = key;
  scene.environment = scene.background = hdrs[key];
  const k = hdriStrength(h), r = hdriRotation(h);
  scene.environmentIntensity = scene.backgroundIntensity = k;
  scene.environmentRotation.set(0, r, 0); scene.backgroundRotation.set(0, r, 0);
}
await setSky('day');

const pt = new WebGPUPathTracer(renderer);
Object.assign(pt, { maxBounces: PHONE ? 6 : 10, filterGlossyFactor: 0.5, renderScale: 1, minSamples: 2, targetFrameTime: PHONE ? 30 : 16 });
// на телефоне — малая сеть OIDN: втрое легче, разница на экране телефона не видна
const denoiser = new OIDNDenoiser({ initUNetFromURL, auxWeightsUrl: new URL(`vendor/oidn/rt_hdr_alb_nrm${PHONE ? '_small' : ''}.tza`, LAB).href });
let maxSamples = PHONE ? 64 : 128;
pt.maxSamples = maxSamples;
pt.setDenoiser(denoiser);
let stageName = 'building', samples = 0;
pt.addEventListener('progress', (e) => {
  stageName = e.stage; if (e.samples) samples = e.samples.avg ?? e.samples;
  if (!started && samples >= 2) { started = true; localStorage.removeItem(GUARD); }
});
say('Строю ускоряющую структуру (BVH)…');
await new Promise((r) => setTimeout(r, 30));
const t0 = performance.now();
pt.setScene(scene, camera);
const buildMs = Math.round(performance.now() - t0);

// экспозиция: у ракурса рендера — его EV, иначе как у тех рендеров: в доме 10,4, снаружи 14,6; утром на ступень светлее
let evShift = 0;
function applyExposure() {
  const base = evPreset ?? (model.inside(camera.position) ? EV.inside : EV.outside);
  renderer.toneMappingExposure = evToExposure(base - (sky === 'morning' ? 1.0 : 0) - evShift);
}

// прогулка — та же, что на сайте виллы
const { Walker } = await import(`${MAIN}villa3d/walk.js?v=vd1-fix-20261106`);
const walker = new Walker(camera, renderer.domElement, () => model.phys, {});
let mode = 'orbit';
const cmp = compareUI(stage);
const cams = await loadCams();
const ui = navUI({
  title: 'Вариант 1 · трассировка WebGPU',
  cams,
  onCam(c) {
    if (mode === 'walk') { walker.stop(); mode = 'orbit'; }
    const look = setCam(camera, c, innerWidth, innerHeight);
    controls.target.set(...look);
    controls.enabled = false;
    evPreset = c.ev;
    cmp.show(c.name);
  },
  onOrbit() {
    if (mode === 'walk') walker.stop();
    mode = 'orbit'; evPreset = null; cmp.hide();
    camera.clearViewOffset(); camera.fov = 60; camera.updateProjectionMatrix();
    controls.enabled = true;
    ui.select.value = '';
  },
  onWalk() {
    cmp.hide(); evPreset = null; ui.select.value = '';
    camera.clearViewOffset(); camera.fov = 60; camera.updateProjectionMatrix();
    controls.enabled = false;
    walker.start(model.spawns.living);
    mode = 'walk';
  },
  async onSun(key) { await setSky(key); pt.updateEnvironment(); },
  extra: (() => {
    const s = document.createElement('select');
    s.innerHTML = [32, 64, 128, 256, 1024].map((n) => `<option value="${n}"${n === maxSamples ? ' selected' : ''}>${n} проходов, потом OIDN</option>`).join('') + '<option value="0">без предела, без OIDN</option>';
    s.addEventListener('change', () => { maxSamples = +s.value; pt.maxSamples = maxSamples; pt.reset(); });
    const ev = document.createElement('select');
    ev.innerHTML = [-2, -1, -0.5, 0, 0.5, 1, 2].map((v) => `<option value="${v}"${v === 0 ? ' selected' : ''}>экспозиция ${v > 0 ? '+' : ''}${v}</option>`).join('');
    ev.addEventListener('change', () => { evShift = +ev.value; });
    return [s, ev];
  })()
});
addEventListener('pointerdown', (e) => { if (!controls.enabled && mode === 'orbit' && !e.target.closest('.panel') && !e.target.closest('.cmp input')) { controls.enabled = true; cmp.hide(); evPreset = null; ui.select.value = ''; camera.clearViewOffset(); camera.fov = 60; camera.updateProjectionMatrix(); } });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

const lastM = new THREE.Matrix4(), lastP = new THREE.Matrix4();
let lastT = performance.now(), lastSay = 0, lastExp = -1;
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (mode === 'walk') walker.update(dt); else if (controls.enabled) controls.update();
  camera.updateMatrixWorld();
  if (!lastM.equals(camera.matrixWorld) || !lastP.equals(camera.projectionMatrix)) { lastM.copy(camera.matrixWorld); lastP.copy(camera.projectionMatrix); pt.updateCamera(); }
  applyExposure();
  if (renderer.toneMappingExposure !== lastExp) lastExp = renderer.toneMappingExposure;
  pt.renderSample();
  if (now - lastSay > 400) {
    lastSay = now;
    const st = pt.complete ? 'готово' : { building: 'строю сцену', compiling: 'компилирую шейдеры', rendering: 'трассирую', denoising: 'OIDN чистит шум' }[stageName] || stageName;
    say(`${st} · проходов ${Math.round(samples)}${maxSamples ? ' из ' + maxSamples : ''} · ${(pt.getRenderTime() / 1000).toFixed(1)} с · сцена ${buildMs} мс · фотосканов ${nTex}${PHONE ? ' · режим телефона' : ''}`);
  }
}
renderer.setAnimationLoop(frame);
// для проверок: ракурс рендера по имени и один кадр со снимком холста в той же задаче (WebGPU отдаёт кадр до показа)
window.__lab = {
  THREE, renderer, scene, camera, controls, pt, denoiser, model, cams, frame, setSky,
  view(name) { ui.select.value = name; ui.select.dispatchEvent(new Event('change')); },
  pose(c) { setCam(camera, { lens: 18, straight: false, ...c }, innerWidth, innerHeight); controls.enabled = false; },
  setEV(v) { evPreset = v; },
  snap(type = 'image/jpeg', q = 0.9) { frame(performance.now()); return renderer.domElement.toDataURL(type, q); },
  get stage() { return stageName; }, get samples() { return samples; }, get complete() { return pt.complete; }, buildMs, nTex
};
