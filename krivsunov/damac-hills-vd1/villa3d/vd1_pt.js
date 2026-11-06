// Режим «как в Cycles»: трассировка путей прямо в браузере (three-gpu-pathtracer 0.0.23 на WebGL2).
// Сцена для трассировки собирается из модели один раз: стекло — с физическим пропусканием и прозрачное для лучей теней
// (как в рендерах Cycles), копии соседей и трава раскрыты из InstancedMesh. Утром и днём небо и солнце — те же HDRI,
// что у рендеров Cycles (src.hdri), повёрнутые к солнцу просмотрщика; вечером и ночью — небо и солнце просмотрщика.
// Пока камера движется, виден обычный кадр; стоит — кадр дособирается проходами и плавно сменяет обычный.
import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Denoiser } from './vd1_denoise.js?v=vd1-cy-20261106';

// своя копия геометрии для трассировки (исходную генератор не трогает): цвет вершин — всегда RGBA,
// индекс, касательные и недостающие атрибуты генератор добавляет сам
function ptGeometry(src) {
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) if (src.attributes[k]) g.setAttribute(k, src.attributes[k]);
  if (src.index) g.setIndex(src.index);
  const c = src.attributes.color;
  if (c) {
    const a = new Float32Array(c.count * 4);
    for (let i = 0; i < c.count; i++) { a[i * 4] = c.getX(i); a[i * 4 + 1] = c.getY(i); a[i * 4 + 2] = c.getZ(i); a[i * 4 + 3] = c.itemSize > 3 ? c.getW(i) : 1; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 4));
  }
  return g;
}

// InstancedMesh → одна сетка в мировых координатах (тон каждого экземпляра — цветом вершин)
function expandInstanced(o) {
  const src = o.geometry, n = o.count, pos = src.attributes.position, nor = src.attributes.normal, uv = src.attributes.uv, idx = src.index;
  const vc = pos.count, P = new Float32Array(vc * n * 3), N = nor ? new Float32Array(vc * n * 3) : null, U = uv ? new Float32Array(vc * n * 2) : null;
  const C = o.instanceColor ? new Float32Array(vc * n * 4) : null, I = idx ? new Uint32Array(idx.count * n) : null;
  const mi = new THREE.Matrix4(), mw = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3(), col = new THREE.Color();
  for (let k = 0; k < n; k++) {
    o.getMatrixAt(k, mi); mw.multiplyMatrices(o.matrixWorld, mi); nm.getNormalMatrix(mw);
    if (C) o.getColorAt(k, col);
    for (let i = 0; i < vc; i++) {
      const j = k * vc + i;
      v.fromBufferAttribute(pos, i).applyMatrix4(mw); P[j * 3] = v.x; P[j * 3 + 1] = v.y; P[j * 3 + 2] = v.z;
      if (N) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N[j * 3] = v.x; N[j * 3 + 1] = v.y; N[j * 3 + 2] = v.z; }
      if (U) { U[j * 2] = uv.getX(i); U[j * 2 + 1] = uv.getY(i); }
      if (C) { C[j * 4] = col.r; C[j * 4 + 1] = col.g; C[j * 4 + 2] = col.b; C[j * 4 + 3] = 1; }
    }
    if (I) for (let t = 0; t < idx.count; t++) I[k * idx.count + t] = idx.getX(t) + k * vc;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  if (N) g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  if (U) g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  if (C) g.setAttribute('color', new THREE.BufferAttribute(C, 4));
  if (I) g.setIndex(new THREE.BufferAttribute(I, 1));
  return g;
}

export function createPathTracer(renderer, opts) {
  const { rasterize, getSources, getRaster } = opts;
  const pt = new WebGLPathTracer(renderer);
  // three r170: compileAsync без камеры у библиотеки 0.0.23 не завершается (currentProgram ещё нет) — компилируем сразу
  const cam0 = new THREE.PerspectiveCamera();
  for (const r of [pt._pathTracer, pt._lowResPathTracer]) {
    r.compileMaterial = function () { this._renderer.compile(this._fsQuad._mesh, cam0); return Promise.resolve(); };
    r._compilePromise = null;
  }
  Object.assign(pt, { bounces: 7, transmissiveBounces: 8, filterGlossyFactor: 0.5, renderDelay: 150, minSamples: 2, fadeDuration: 500, dynamicLowRes: false, rasterizeScene: true });
  pt.multipleImportanceSampling = true;
  pt.tiles.set(2, 2);
  pt.textureSize.set(1024, 1024);
  pt.rasterizeSceneCallback = () => rasterize();
  // шумоподавление по G-буферу растра (vd1_denoise.js); экспозиция кадра трассировки — своя (комнаты темнее улицы)
  const dn = new Denoiser(renderer);
  let needG = true;
  let gain = 1, gainShown = 1, metered = -1, firstMeter = true;
  const meterRT = new THREE.WebGLRenderTarget(64, 36, { type: THREE.FloatType });
  const meterQuad = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { map: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0); }',
    depthTest: false, depthWrite: false
  }));
  const meterBuf = new Float32Array(64 * 36 * 4);
  // Экспозиция как у рендеров Cycles: постоянная в доме и на улице (сверено по шести ракурсам рендеров сайта,
  // разброс ±0,5 ступени — как у ручных EV тех рендеров), к яркости кадра подстраивается лишь на четверть
  // (логарифмическое среднее кадра), не больше чем на ступень в любую сторону
  const EXPO = { inside: [1.86, 2.43], outside: [0.47, 2.05] };   // [множитель, типичная «полная» подстройка]
  // утром света меньше, чем днём: как фотограф, открываем экспозицию на отношение освещённости (днём — 1)
  const E_DAY = 6.34;   // освещённость горизонтали от солнца и неба HDRI дня (kloofendal, 42,9°) в единицах сцены
  let evScale = 1;
  function meter() {
    const og = renderer.getRenderTarget();
    meterQuad.material.uniforms.map.value = pt.target.texture;
    renderer.setRenderTarget(meterRT); meterQuad.render(renderer); renderer.setRenderTarget(og);
    renderer.readRenderTargetPixels(meterRT, 0, 0, 64, 36, meterBuf);
    let acc = 0, n = 0;
    for (let i = 0; i < meterBuf.length; i += 4) {
      const l = 0.2126 * meterBuf[i] + 0.7152 * meterBuf[i + 1] + 0.0722 * meterBuf[i + 2];
      if (l > 0 && Number.isFinite(l)) { acc += Math.log(l + 1e-4); n++; }
    }
    if (!n) return;
    const avg = Math.exp(acc / n), base = renderer.toneMappingExposure || 1;
    const full = 0.2 / (avg * base);
    if (!Number.isFinite(full)) return;
    const [g1, ref] = opts.inside && opts.inside() ? EXPO.inside : EXPO.outside, g0 = g1 * evScale;
    const want = Math.min(g0 * 2, Math.max(g0 / 2, g0 * Math.pow(Math.max(full, 1e-3) / (ref * evScale), 0.25)));
    gain = firstMeter ? want : gain + (want - gain) * 0.6;
    if (firstMeter) gainShown = want;
    firstMeter = false;
  }
  pt.renderToCanvasCallback = (target, r, quad) => {
    const s = pt.samples;
    if (s >= 3 && (metered < 0 || s - metered >= 24 || (s < 48 && s - metered >= 6))) { meter(); metered = s; }
    gainShown += (gain - gainShown) * 0.35;
    dn.setSize(target.width, target.height);
    if (needG) { const ras = getRaster(); dn.gbuffer(ras.scene, ras.camera); needG = false; }
    dn.present(target.texture, s, gainShown, quad.material.opacity, quad.material.blending);
  };

  const scene = new THREE.Scene();
  const mats = new Map();
  // стекло: свет солнца и неба проходит в дом тонированным (прозрачные тени, как у стекла рендеров Cycles), без шума каустик
  const glass = (tint) => new THREE.MeshPhysicalMaterial({ color: tint, metalness: 0, roughness: 0.015, transmission: 1, ior: 1.52, thickness: 0, side: THREE.DoubleSide });
  // материал для трассировки: стекло фасада и внутреннее — физическое, второй слой отражения не нужен
  function mapMaterial(mat, vertexColors) {
    const key = vertexColors ? `${mat.uuid}_vc` : mat.uuid;
    if (mats.has(key)) return mats.get(key);
    let out = mat;
    const name = mat.name || '';
    if (/Refl$/.test(name)) out = null;
    else if (mat.isMeshBasicMaterial && mat.blending === THREE.MultiplyBlending) out = glass(new THREE.Color(0.6, 0.52, 0.4));   // бронза: как два слоя стекла Cycles
    else if (mat.transparent && /glass/i.test(name)) out = glass(new THREE.Color(0.93, 0.97, 0.96));
    else if (!mat.isMeshStandardMaterial) out = null;
    if (out && vertexColors && !out.vertexColors) { out = out.clone(); out.vertexColors = true; }
    mats.set(key, out);
    return out;
  }
  let lights = [], envRTs = [], lightTok = 0;
  const hdris = new Map();
  const loadHdri = (url) => {
    if (!hdris.has(url)) hdris.set(url, new RGBELoader().loadAsync(url).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; return t; }));
    return hdris.get(url);
  };
  // небо: для освещения — без диска солнца (оно светит направленным светом), для фона — с диском
  const cube = (obj, size) => {
    const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType });
    const cam = new THREE.CubeCamera(0.5, 3000, rt);
    const tmp = new THREE.Scene(); tmp.add(obj); cam.update(renderer, tmp); tmp.remove(obj);
    return rt;
  };
  // свет сцены трассировки; HDRI грузится один раз, из двух быстрых смен времени суток побеждает последняя
  async function setLighting() {
    const src = getSources(), tok = ++lightTok;
    let hdr = null;
    if (src.hdri) try { hdr = await loadHdri(src.hdri.url); } catch (e) { console.warn('HDRI не загрузился, небо просмотрщика', e); }
    if (tok !== lightTok) return false;
    for (const l of lights) { scene.remove(l); if (l.target) scene.remove(l.target); }
    lights = [];
    if (!hdr && src.sun.intensity > 0) {
      const s = new THREE.DirectionalLight(src.sun.color, src.sun.intensity);
      s.position.copy(src.sun.position); s.target.position.copy(src.sun.target.position);
      scene.add(s, s.target); lights.push(s);
    }
    for (const p of src.points) { const l = new THREE.PointLight(p.color, p.intensity, p.distance, p.decay); l.position.copy(p.position); scene.add(l); lights.push(l); }
    for (const rt of envRTs) rt.dispose();
    envRTs = [];
    if (hdr) {
      // солнце HDRI — туда же, где солнце просмотрщика (азимут от +X к +Z), и той же силы, что направленный свет растра
      const h = src.hdri, c = src.sun.color, rot = THREE.MathUtils.degToRad(h.sunAz - src.sunAz);
      const kReal = src.sun.intensity * (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / h.sunY, k = (h.scale || 1) * kReal;
      evScale = h.sunEl ? E_DAY / (kReal * (h.sunY * Math.sin(THREE.MathUtils.degToRad(h.sunEl)) + (h.skyY || 0))) : 1;
      scene.environment = hdr; scene.background = hdr;
      scene.environmentRotation.set(0, rot, 0); scene.backgroundRotation.set(0, rot, 0);
      scene.environmentIntensity = k; scene.backgroundIntensity = k;
    } else {
      const sky = src.background();   // фон — небо просмотрщика с диском солнца; после снимка в куб оно не нужно
      envRTs = [cube(src.env, 512), cube(sky, 512)];
      sky.geometry.dispose(); sky.material.dispose();
      scene.environment = envRTs[0].texture; scene.background = envRTs[1].texture;
      scene.environmentRotation.set(0, 0, 0); scene.backgroundRotation.set(0, 0, 0);
      scene.environmentIntensity = src.envIntensity; scene.backgroundIntensity = 1;
      evScale = 1;   // вечер и ночь: экспозицию поднимает сам просмотрщик (toneMappingExposure)
    }
    return true;
  }
  let built = false;
  async function build() {
    const src = getSources();
    src.root.updateMatrixWorld(true);
    for (const c of [...scene.children]) if (c.isMesh) { scene.remove(c); c.geometry.dispose(); }
    let tris = 0;
    const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; scene.add(m); tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3; return m; };
    for (const top of [src.root, ...src.extra]) top.traverseVisible((o) => {
      if (!o.isMesh || o.userData.noPT) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (o.isInstancedMesh) {
        const pm = mapMaterial(mat, !!o.instanceColor);
        if (pm) add(expandInstanced(o), pm);
        return;
      }
      const pm = mapMaterial(mat, !!o.geometry.attributes.color && !!mat.vertexColors);
      if (!pm) return;
      const m = add(ptGeometry(o.geometry), pm);
      m.matrix.copy(o.matrixWorld); m.matrixWorld.copy(o.matrixWorld);
    });
    await setLighting();
    pt.setScene(scene, src.camera);
    built = true;
    return { triangles: Math.round(tris), meshes: scene.children.filter((c) => c.isMesh).length, materials: mats.size };
  }
  return {
    get built() { return built; },
    get samples() { return pt.samples; },
    build,
    // время суток: солнце, небо, свет в доме и яркость светильников
    async relight() { if (!built || !(await setLighting())) return; pt.updateMaterials(); pt.updateEnvironment(); pt.updateLights(); },
    setCamera(camera) { pt.setCamera(camera); needG = true; },
    updateCamera() { pt.updateCamera(); metered = -1; needG = true; },
    renderSample() { pt.renderSample(); },
    reset() { pt.reset(); },
    get gain() { return gainShown; },
    set renderScale(v) { pt.renderScale = v; },
    // показать готовый кадр трассировки на холсте прямо сейчас (для снимка)
    present() { const q = { material: { opacity: 1, blending: THREE.NoBlending } }; pt.renderToCanvasCallback(pt.target, renderer, q); },
    dispose() { pt.dispose && pt.dispose(); dn.dispose(); }
  };
}
