// Вариант 2: гауссов сплат, обученный на 2411 кадрах Cycles (те же сцена, свет и материалы, что у рендеров сайта;
// Brush 0.3, 30 000 шагов, ≈895 тыс. гауссиан). Кадры обучения — в лог-кодировке AgX (16,5 ступени при EV 12,4), поэтому
// сплат хранит не готовую картинку, а свет: здесь он раскодируется, получает экспозицию по EV (в доме 10,4, снаружи 14,6,
// у ракурсов рендеров — их EV) и тонмаппинг AgX «Medium High Contrast», как у Cycles. Рендерер — Spark 2.4 (WebGL 2).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import { LAB, LAB_CSS, HDRI, hdriStrength, hdriRotation, evToExposure, EV, loadCams, loadModel, setCam, compareUI, navUI, $ } from '../shared/lab.js';

const style = document.createElement('style'); style.textContent = LAB_CSS; document.head.append(style);
const status = $('#status'), stage = $('#stage');
const say = (t) => { status.textContent = t; };
const EV_DATA = 12.4;                       // экспозиция кадров обучения
const K_DATA = evToExposure(EV_DATA);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
stage.append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 3000);
camera.position.set(-30, 8, -14);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-6, 2.5, 0);
controls.enableDamping = true;
controls.update();

// кадр сплата — в цель с плавающей точкой: там лог-кодировка, её раскодирует и покажет итоговый проход
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
rt.texture.colorSpace = THREE.SRGBColorSpace;   // Spark пишет цвета сплата как есть (без перевода в линейный)
const resize = () => {
  renderer.setSize(innerWidth, innerHeight);
  const pr = renderer.getPixelRatio();
  rt.setSize(Math.round(innerWidth * pr), Math.round(innerHeight * pr));
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
};
resize();

// небо за пределами сплата — тот же HDRI, закодированный так же, как кадры обучения
say('Загружаю небо…');
const h = HDRI.day;
const hdr = await new HDRLoader().loadAsync(h.url);
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 64, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, toneMapped: false,
  uniforms: { map: { value: hdr }, k: { value: hdriStrength(h) * K_DATA }, rot: { value: hdriRotation(h) } },
  vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D map; uniform float k; uniform float rot; varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float c = cos(rot), s = sin(rot);
      d = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
      vec2 uv = vec2(atan(d.z, d.x) / 6.28318531 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
      vec3 x = texture2D(map, uv).rgb * k;
      gl_FragColor = vec4(clamp((log2(max(x, vec3(1e-10))) + 12.47393) / 16.5, 0.0, 1.0), 1.0);
    }`
}));
sky.renderOrder = -1;
sky.frustumCulled = false;
scene.add(sky);

say('Загружаю сплат (≈14 МБ)…');
const spark = new SparkRenderer({ renderer });
scene.add(spark);
const splat = new SplatMesh({ url: new URL('splat/vd1.sog', LAB).href });
scene.add(splat);
await splat.initialized;

// итоговый проход: лог → свет × экспозиция → AgX «Medium High Contrast» (контраст 1,2 вокруг средне-серого)
const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, toneMapped: false,
  uniforms: { tex: { value: rt.texture }, gain: { value: 1 }, linear: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tex; uniform float gain; uniform float linear; varying vec2 vUv;
    vec3 agxMHC(vec3 color) {
      const mat3 SRGB_TO_REC2020 = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
      const mat3 REC2020_TO_SRGB = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
      const mat3 INSET = mat3(vec3(0.856627153315983, 0.137318972929847, 0.11189821299995), vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903), vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
      const mat3 OUTSET = mat3(vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826), vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294), vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
      color = INSET * (SRGB_TO_REC2020 * color);
      color = clamp((log2(max(color, 1e-10)) + 12.47393) / 16.499999, 0.0, 1.0);
      color = clamp((color - 0.6060606) * 1.2 + 0.6060606, 0.0, 1.0);
      vec3 x2 = color * color, x4 = x2 * x2;
      color = 15.5 * x4 * x2 - 40.14 * x4 * color + 31.96 * x4 - 6.868 * x2 * color + 0.4298 * x2 + 0.1191 * color - 0.00232;
      color = pow(max(vec3(0.0), OUTSET * color), vec3(2.2));
      return clamp(REC2020_TO_SRGB * color, 0.0, 1.0);
    }
    void main() {
      vec4 t = texture2D(tex, vUv);
      vec3 v = linear > 0.5 ? pow(max(t.rgb, vec3(0.0)), vec3(1.0 / 2.2)) : t.rgb;   // если Spark перевёл цвета в линейные
      vec3 x = exp2(v * 16.5 - 12.47393) * gain;
      gl_FragColor = vec4(agxMHC(x), 1.0);
      #include <colorspace_fragment>
    }`
}));
post.frustumCulled = false;
const postScene = new THREE.Scene(); postScene.add(post);
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// прогулка: столкновения и комнаты — из процедурной модели (без фотосканов, в сцену не добавляется)
say('Готовлю прогулку…');
const model = await loadModel(THREE, 'low', false);
const { Walker } = await import(`${(await import('../shared/lab.js')).MAIN}villa3d/walk.js?v=vd1-fix-20261106`);
const walker = new Walker(camera, renderer.domElement, () => model.phys, {});
let mode = 'orbit', evPreset = null, evShift = 0;
const cmp = compareUI(stage);
const cams = await loadCams();
const resetCam = () => { camera.clearViewOffset(); camera.fov = 60; camera.updateProjectionMatrix(); };
const ui = navUI({
  title: 'Вариант 2 · сплат из Cycles',
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
addEventListener('resize', resize);

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (mode === 'walk') walker.update(dt); else if (controls.enabled) controls.update();
  sky.position.copy(camera.position);
  const ev = (evPreset ?? (model.inside(camera.position) ? EV.inside : EV.outside)) - evShift;
  post.material.uniforms.gain.value = evToExposure(ev) / K_DATA;
  if (window.__raw) { sky.visible = false; renderer.setRenderTarget(null); renderer.render(scene, camera); sky.visible = true; return; }   // отладка: сплат как есть
  renderer.setRenderTarget(rt);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  const u = spark.uniforms || (spark.material && spark.material.uniforms);
  post.material.uniforms.linear.value = u && u.encodeLinear && u.encodeLinear.value ? 1 : 0;
  renderer.render(postScene, postCam);
}
renderer.setAnimationLoop(frame);
say(`Сплат: ${(splat.numSplats ?? splat.packedSplats?.numSplats ?? 0).toLocaleString('ru')} гауссиан · обучен на 2411 кадрах Cycles`);
window.__lab = {
  THREE, renderer, scene, camera, controls, spark, splat, model, cams, frame,
  view(name) { ui.select.value = name; ui.select.dispatchEvent(new Event('change')); },
  pose(c) { setCam(camera, { lens: 18, straight: false, ...c }, innerWidth, innerHeight); controls.enabled = false; },
  setEV(v) { evPreset = v; },
  snap(type = 'image/jpeg', q = 0.9) { frame(performance.now()); return renderer.domElement.toDataURL(type, q); },
  get stage() { return 'splat'; }, get samples() { return 1; }, get complete() { return true; }, buildMs: 0, nTex: 0
};
