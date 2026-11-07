// Шумоподавление трассировки (схема SVGF без накопления во времени): свет кадра делится на альбедо из растрового
// G-буфера, пять проходов à-trous 5×5 с весами по нормали, глубине и яркости, затем умножается на альбедо обратно —
// текстуры остаются чёткими, шум уходит. Сила фильтра падает по мере накопления проходов.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const NRM_VS = `
#include <common>
#include <uv_pars_vertex>
varying vec3 vN;
void main() {
  #include <uv_vertex>
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vN = normalize(transformedNormal);
}`;
const NRM_FS = `
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
uniform float alphaTest;
varying vec3 vN;
void main() {
  #ifdef USE_MAP
    if (texture2D(map, vMapUv).a < alphaTest) discard;
  #endif
  vec3 n = normalize(vN);
  #ifdef DOUBLE_SIDED
    n *= gl_FrontFacing ? 1.0 : -1.0;
  #endif
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}`;
const DEMOD_FS = `
uniform sampler2D tColor; uniform sampler2D tAlbedo; uniform sampler2D tDepth; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  if (texture2D(tDepth, vUv).x >= 0.99999) { gl_FragColor = vec4(c, 1.0); return; }
  gl_FragColor = vec4(c / max(texture2D(tAlbedo, vUv).rgb, vec3(0.03)), 1.0);
}`;
const ATROUS_FS = `
#include <packing>
uniform sampler2D tIn; uniform sampler2D tNormal; uniform sampler2D tDepth;
uniform vec2 texel; uniform float stepw; uniform float sigmaL; uniform float cNear; uniform float cFar;
varying vec2 vUv;
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  vec4 c0 = texture2D(tIn, vUv);
  float d0 = texture2D(tDepth, vUv).x;
  if (d0 >= 0.99999) { gl_FragColor = c0; return; }
  float z0 = -perspectiveDepthToViewZ(d0, cNear, cFar);
  vec3 n0 = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
  float l0 = lum(c0.rgb);
  vec3 sum = vec3(0.0);
  float wsum = 0.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 uv = vUv + vec2(float(x), float(y)) * stepw * texel;
      float d = texture2D(tDepth, uv).x;
      if (d >= 0.99999) continue;
      float z = -perspectiveDepthToViewZ(d, cNear, cFar);
      vec3 n = texture2D(tNormal, uv).xyz * 2.0 - 1.0;
      vec3 c = texture2D(tIn, uv).rgb;
      float kx = x == 0 ? 0.375 : (abs(x) == 1 ? 0.25 : 0.0625);
      float ky = y == 0 ? 0.375 : (abs(y) == 1 ? 0.25 : 0.0625);
      float wn = pow(max(dot(n0, n), 0.0), 32.0);
      float wz = exp(-abs(z - z0) / (0.012 * z0 * stepw + 0.002));
      float wl = exp(-abs(lum(c) - l0) / (sigmaL * (l0 + 0.04)));
      float w = kx * ky * wn * wz * wl;
      sum += c * w;
      wsum += w;
    }
  }
  gl_FragColor = vec4(wsum > 1e-6 ? sum / wsum : c0.rgb, 1.0);
}`;
// тонмаппинг рендеров Cycles: AgX Blender с look «Medium High Contrast» — контраст 1,2 вокруг средне-серого (pivot −0,2
// у OCIO GradingPrimary = 0,4 в 25-ступенчатом AgX Log Blender = 0,606 в 16,5-ступенчатой шкале three.js), остальное — как AgXToneMapping
const FINAL_FS = `
uniform sampler2D tIn; uniform sampler2D tColor; uniform sampler2D tAlbedo; uniform sampler2D tDepth;
uniform float gain; uniform float opacity; uniform float exposure;
varying vec2 vUv;
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
  vec3 c = texture2D(tDepth, vUv).x >= 0.99999 ? texture2D(tColor, vUv).rgb : texture2D(tIn, vUv).rgb * max(texture2D(tAlbedo, vUv).rgb, vec3(0.03));
  gl_FragColor = vec4(agxMHC(c * gain * exposure), opacity);
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
}`;

export class Denoiser {
  constructor(renderer) {
    this.r = renderer;
    const rt = (opts = {}) => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter, ...opts });
    this.albedo = rt({ depthTexture: new THREE.DepthTexture(1, 1) });
    this.normal = rt();
    this.ping = rt({ depthBuffer: false });
    this.pong = rt({ depthBuffer: false });
    const shader = (fs, uniforms, extra = {}) => new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, ...extra }));
    this.demod = shader(DEMOD_FS, { tColor: { value: null }, tAlbedo: { value: null }, tDepth: { value: null } }, { toneMapped: false });
    this.atrous = shader(ATROUS_FS, { tIn: { value: null }, tNormal: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() }, stepw: { value: 1 }, sigmaL: { value: 1 }, cNear: { value: 0.1 }, cFar: { value: 1000 } }, { toneMapped: false });
    this.final = shader(FINAL_FS, { tIn: { value: null }, tColor: { value: null }, tAlbedo: { value: null }, tDepth: { value: null }, gain: { value: 1 }, opacity: { value: 1 }, exposure: { value: 1 } },
      { transparent: true, toneMapped: false, premultipliedAlpha: renderer.getContextAttributes().premultipliedAlpha });
    this.alb = new Map();
    this.nrm = new Map();
    this.ready = false;
  }

  setSize(w, h) {
    for (const t of [this.albedo, this.normal, this.ping, this.pong]) if (t.width !== w || t.height !== h) t.setSize(w, h);
    this.atrous.material.uniforms.texel.value.set(1 / w, 1 / h);
  }

  // альбедо и нормали растровой сцены: стекло, небо и слои прозрачности не попадают — за стеклом видно то, что за ним
  gbuffer(scene, camera) {
    const r = this.r, hidden = [], swapped = [];
    const skip = (m) => !m || m.isShaderMaterial || m.transparent || m.blending === THREE.MultiplyBlending || m.blending === THREE.AdditiveBlending || m.visible === false;
    scene.traverseVisible((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (skip(m)) { hidden.push(o); return; }
      swapped.push([o, o.material, m]);
    });
    for (const o of hidden) o.visible = false;
    const og = r.getRenderTarget(), ogColor = r.getClearColor(new THREE.Color()), ogAlpha = r.getClearAlpha(), ogAuto = r.autoClear, ogShadow = r.shadowMap.enabled;
    const ogBg = scene.background, ogFog = scene.fog, ogOverride = scene.overrideMaterial;
    scene.background = null; scene.fog = null; scene.overrideMaterial = null;
    r.shadowMap.enabled = false;
    r.setClearColor(0x000000, 0); r.autoClear = true;
    for (const [pass, cache, make, target] of [
      ['albedo', this.alb, (m) => new THREE.MeshBasicMaterial({ color: m.color ? m.color.clone() : 0xffffff, map: m.map || null, alphaTest: m.alphaTest || 0, side: m.side, vertexColors: !!m.vertexColors, toneMapped: false }), this.albedo],
      ['normal', this.nrm, (m) => {
        const s = new THREE.ShaderMaterial({ vertexShader: NRM_VS, fragmentShader: NRM_FS, side: m.side, uniforms: { alphaTest: { value: m.alphaTest || 0 }, map: { value: m.alphaTest > 0 && m.map ? m.map : null }, mapTransform: { value: new THREE.Matrix3() } } });
        if (m.alphaTest > 0 && m.map) { s.map = m.map; m.map.updateMatrix(); s.uniforms.mapTransform.value.copy(m.map.matrix); }
        return s;
      }, this.normal]
    ]) {
      for (const [o, , m] of swapped) { if (!cache.has(m)) cache.set(m, make(m)); o.material = cache.get(m); }
      r.setRenderTarget(target);
      r.clear();
      r.render(scene, camera);
      void pass;
    }
    for (const [o, orig] of swapped) o.material = orig;
    for (const o of hidden) o.visible = true;
    scene.background = ogBg; scene.fog = ogFog; scene.overrideMaterial = ogOverride;
    r.shadowMap.enabled = ogShadow;
    r.setClearColor(ogColor, ogAlpha); r.autoClear = ogAuto; r.setRenderTarget(og);
    this.atrous.material.uniforms.cNear.value = camera.near;
    this.atrous.material.uniforms.cFar.value = camera.far;
    this.ready = true;
  }

  // кадр трассировки → экран: демодуляция, à-trous, обратная модуляция и тонмаппинг AgX с усилением gain
  present(colorTex, samples, gain, opacity, blending) {
    const r = this.r, og = r.getRenderTarget(), ogAuto = r.autoClear;
    const dTex = this.albedo.depthTexture, aTex = this.albedo.texture;
    const d = this.demod.material.uniforms;
    d.tColor.value = colorTex; d.tAlbedo.value = aTex; d.tDepth.value = dTex;
    r.setRenderTarget(this.ping); this.demod.render(r);
    const u = this.atrous.material.uniforms;
    u.tNormal.value = this.normal.texture; u.tDepth.value = dTex;
    u.sigmaL.value = Math.min(2.5, Math.max(0.07, 5 / Math.sqrt(Math.max(1, samples))));
    let src = this.ping, dst = this.pong;
    const passes = samples > 2048 ? 3 : 5;
    for (let i = 0; i < passes; i++) {
      u.tIn.value = src.texture; u.stepw.value = 1 << i;
      r.setRenderTarget(dst); this.atrous.render(r);
      [src, dst] = [dst, src];
    }
    const f = this.final.material;
    f.uniforms.tIn.value = src.texture; f.uniforms.tColor.value = colorTex; f.uniforms.tAlbedo.value = aTex; f.uniforms.tDepth.value = dTex;
    f.uniforms.gain.value = gain; f.uniforms.opacity.value = opacity; f.uniforms.exposure.value = r.toneMappingExposure;
    f.blending = blending;
    r.setRenderTarget(og);
    r.autoClear = false;
    this.final.render(r);
    r.autoClear = ogAuto;
  }

  dispose() {
    for (const t of [this.albedo, this.normal, this.ping, this.pong]) t.dispose();
    for (const q of [this.demod, this.atrous, this.final]) { q.material.dispose(); q.dispose(); }
    for (const m of [...this.alb.values(), ...this.nrm.values()]) m.dispose();
  }
}
