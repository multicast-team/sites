// Вариант 1 без WebGPU (iPhone до iOS 26, Firefox, старые браузеры): та же трассировка путей three-gpu-pathtracer, но на
// WebGL 2. Медленнее и без шумодава OIDN (он есть только на WebGPU), зато открывается везде. Небо — HDRI рендеров Cycles
// в люксах, экспозиция по EV и тонмаппинг AgX «Medium High Contrast» — как в варианте на WebGPU.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { MAIN, LAB_CSS, HDRI, hdriStrength, hdriRotation, evToExposure, EV, PHONE, dprFor, fitStart, shrinkTextures, loadCams, loadModel, texturesReady, ptMaterials, setCam, compareUI, navUI, $ } from '../shared/lab.js?v=vd1-ios-20261107';

const style = document.createElement('style'); style.textContent = LAB_CSS; document.head.append(style);
const status = $('#status'), stage = $('#stage');
const say = (t) => { status.textContent = t; };
const why = new URLSearchParams(location.search).get('why');

// AgX Blender с look «Medium High Contrast»: контраст 1,2 вокруг средне-серого (0,606 в 16,5-ступенчатой шкале three.js)
{
  const pars = THREE.ShaderChunk.tonemapping_pars_fragment;
  const agx = pars.match(/vec3 AgXToneMapping\( vec3 color \) \{[\s\S]*?\n\}/)[0];
  const mhc = agx.replace('AgXToneMapping', 'CustomToneMapping')
    .replace('color = agxDefaultContrastApprox( color );', 'color = clamp( ( color - 0.6060606 ) * 1.2 + 0.6060606, 0.0, 1.0 );\n\tcolor = agxDefaultContrastApprox( color );');
  THREE.ShaderChunk.tonemapping_pars_fragment = pars.replace('vec3 CustomToneMapping( vec3 color ) { return color; }', mhc);
}

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(PHONE ? 1 : dprFor(2));
renderer.setSize(innerWidth, innerHeight);
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
if (PHONE) shrinkTextures(model.root, 512);
// WebGL-трассировщик не знает экземпляров: InstancedMesh (соседи, трава) он берёт одной копией в начале координат —
// разворачиваем каждый в обычную сетку, цвет экземпляра — в цвет вершин
{
  const list = [], m4 = new THREE.Matrix4(), col = new THREE.Color();
  model.root.traverse((o) => { if (o.isInstancedMesh) list.push(o); });
  for (const im of list) {
    const geos = [];
    for (let i = 0; i < im.count; i++) {
      im.getMatrixAt(i, m4);
      const g = im.geometry.clone().applyMatrix4(m4);
      if (im.instanceColor) {
        im.getColorAt(i, col);
        const n = g.attributes.position.count, c = new Float32Array(n * 3);
        for (let v = 0; v < n; v++) col.toArray(c, v * 3);
        g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      }
      geos.push(g);
    }
    const merged = geos.length && mergeGeometries(geos, false);
    if (!merged) continue;
    const mat = im.instanceColor ? Object.assign(im.material.clone(), { vertexColors: true }) : im.material;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = im.name; mesh.visible = im.visible;
    mesh.position.copy(im.position); mesh.quaternion.copy(im.quaternion); mesh.scale.copy(im.scale);
    im.parent.add(mesh); im.removeFromParent();
  }
}
scene.add(model.root);
const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: 0x9a9a6c, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03;
scene.add(ground);

// небо: HDRI в half-float — на iPhone нет линейной фильтрации 32-битных текстур, half-float фильтруется везде
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

const pt = new WebGLPathTracer(renderer);
Object.assign(pt, { bounces: PHONE ? 5 : 8, transmissiveBounces: 6, filterGlossyFactor: 0.5, minSamples: 2, renderDelay: 80, fadeDuration: 300, dynamicLowRes: true, lowResScale: 0.25, renderScale: PHONE ? 0.75 : 1 });
pt.tiles.set(2, 2);
pt.textureSize.set(PHONE ? 512 : 1024, PHONE ? 512 : 1024);
let maxSamples = PHONE ? 64 : 256;
say('Строю ускоряющую структуру (BVH)…');
await new Promise((r) => setTimeout(r, 30));
const t0 = performance.now();
pt.setScene(scene, camera);
const buildMs = Math.round(performance.now() - t0);

let evShift = 0;
function applyExposure() {
  const base = evPreset ?? (model.inside(camera.position) ? EV.inside : EV.outside);
  renderer.toneMappingExposure = evToExposure(base - (sky === 'morning' ? 1.0 : 0) - evShift);
}

const { Walker } = await import(`${MAIN}villa3d/walk.js?v=vd1-fix-20261106`);
const walker = new Walker(camera, renderer.domElement, () => model.phys, {});
let mode = 'orbit';
const cmp = compareUI(stage);
const cams = await loadCams();
const resetCam = () => { camera.clearViewOffset(); camera.fov = 60; camera.updateProjectionMatrix(); };
const ui = navUI({
  title: 'Вариант 1 · трассировка (WebGL)',
  cams,
  onCam(c) {
    if (mode === 'walk') { walker.stop(); mode = 'orbit'; }
    const look = setCam(camera, c, innerWidth, innerHeight);
    controls.target.set(...look); controls.enabled = false;
    evPreset = c.ev; cmp.show(c.name);
  },
  onOrbit() { if (mode === 'walk') walker.stop(); mode = 'orbit'; evPreset = null; cmp.hide(); resetCam(); controls.enabled = true; ui.select.value = ''; },
  onWalk() { cmp.hide(); evPreset = null; ui.select.value = ''; resetCam(); controls.enabled = false; walker.start(model.spawns.living); mode = 'walk'; },
  async onSun(key) { await setSky(key); pt.updateEnvironment(); },
  extra: (() => {
    const s = document.createElement('select');
    s.innerHTML = [32, 64, 128, 256, 1024].map((n) => `<option value="${n}"${n === maxSamples ? ' selected' : ''}>${n} проходов</option>`).join('');
    s.addEventListener('change', () => { maxSamples = +s.value; });
    const ev = document.createElement('select');
    ev.innerHTML = [-2, -1, -0.5, 0, 0.5, 1, 2].map((v) => `<option value="${v}"${v === 0 ? ' selected' : ''}>экспозиция ${v > 0 ? '+' : ''}${v}</option>`).join('');
    ev.addEventListener('change', () => { evShift = +ev.value; });
    const retry = document.createElement('a');
    retry.href = './?gpu=1'; retry.textContent = 'попробовать WebGPU';
    return navigator.gpu ? [s, ev, retry] : [s, ev];
  })()
});
addEventListener('pointerdown', (e) => { if (!controls.enabled && mode === 'orbit' && !e.target.closest('.panel') && !e.target.closest('.cmp input')) { controls.enabled = true; cmp.hide(); evPreset = null; ui.select.value = ''; resetCam(); } });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); pt.updateCamera(); });

const lastM = new THREE.Matrix4(), lastP = new THREE.Matrix4();
let lastT = performance.now(), lastSay = 0;
const note = why ? `WebGPU недоступен (${why}) — трассировка на WebGL, без OIDN · ` : 'трассировка на WebGL, без OIDN · ';
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (mode === 'walk') walker.update(dt); else if (controls.enabled) controls.update();
  camera.updateMatrixWorld();
  if (!lastM.equals(camera.matrixWorld) || !lastP.equals(camera.projectionMatrix)) { lastM.copy(camera.matrixWorld); lastP.copy(camera.projectionMatrix); pt.updateCamera(); }
  applyExposure();
  if (pt.samples < maxSamples) pt.renderSample();
  else { pt.pausePathTracing = true; pt.renderSample(); pt.pausePathTracing = false; }
  if (now - lastSay > 400) {
    lastSay = now;
    say(`${note}проходов ${Math.floor(pt.samples)} из ${maxSamples}${pt.samples >= maxSamples ? ' · готово' : ''} · сцена ${buildMs} мс · фотосканов ${nTex}`);
  }
}
renderer.setAnimationLoop(frame);
window.__lab = {
  THREE, renderer, scene, camera, controls, pt, model, cams, frame, setSky,
  view(name) { ui.select.value = name; ui.select.dispatchEvent(new Event('change')); },
  pose(c) { setCam(camera, { lens: 18, straight: false, ...c }, innerWidth, innerHeight); controls.enabled = false; },
  setEV(v) { evPreset = v; },
  snap(type = 'image/jpeg', q = 0.9) { frame(performance.now()); return renderer.domElement.toDataURL(type, q); },
  get stage() { return pt.samples >= maxSamples ? 'done' : 'rendering'; }, get samples() { return pt.samples; }, get complete() { return pt.samples >= maxSamples; }, buildMs, nTex
};
