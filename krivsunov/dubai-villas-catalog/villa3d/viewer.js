// Просмотр 3D-модели виллы: небо, солнце с тенями, вращение мышью/пальцем, готовые ракурсы.
// mount(container, build) — build(THREE) возвращает { root, views, focus }.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SKY_TOP = new THREE.Color(0x5f93cc);
const SKY_HORIZON = new THREE.Color(0xe4ebef);
const SKY_GROUND = new THREE.Color(0xcdb38d);

function skyDome() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: SKY_TOP }, horizon: { value: SKY_HORIZON }, ground: { value: SKY_GROUND } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; varying vec3 vDir;
      void main(){ float h = vDir.y;
        vec3 c = h > 0.0 ? mix(horizon, top, pow(min(h * 1.5, 1.0), 0.65)) : mix(horizon, ground, min(-h * 5.0, 1.0));
        gl_FragColor = vec4(c, 1.0); }`
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), material);
  dome.frustumCulled = false;
  return dome;
}

function noiseTexture(color, spread, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size * 0.35; i++) {
    const v = (Math.random() - 0.5) * spread;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function mount(container, build, options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!options.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(skyDome());
  scene.fog = new THREE.Fog(SKY_HORIZON, 230, 820);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(skyDome());
  const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(60, 16, 8), new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
  sunGlow.position.set(-420, 520, 320);
  envScene.add(sunGlow);
  const envTarget = pmrem.fromScene(envScene, 0.02, 0.1, 2000); // купол неба дальше стандартных 100 м
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.8;

  scene.add(new THREE.HemisphereLight(0xdde9f4, 0xc7a57a, 0.8));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.8);
  sun.position.set(-42, 58, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 180 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(800, 48), new THREE.MeshStandardMaterial({ color: 0xd6ba8f, roughness: 1, map: noiseTexture('#d6ba8f', 0.22) }));
  ground.material.map.repeat.set(250, 250);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  const model = build(THREE);
  model.root.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = !node.userData.noCast;
      node.receiveShadow = true;
    }
  });
  scene.add(model.root);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.3, 1500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 170;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 0.6;

  const views = model.views || {};
  let tween = null;
  function setView(name, instant) {
    const view = views[name] || views.start;
    if (!view) return;
    const from = { pos: camera.position.clone(), target: controls.target.clone() };
    const to = { pos: new THREE.Vector3(...view.pos), target: new THREE.Vector3(...view.target) };
    if (instant) {
      camera.position.copy(to.pos);
      controls.target.copy(to.target);
      controls.update();
      return;
    }
    tween = { from, to, start: performance.now(), duration: 900 };
  }

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  setView('start', true);

  let running = true;
  let frames = 0;
  function frame(now) {
    if (!running) return;
    if (tween) {
      const t = Math.min(1, (now - tween.start) / tween.duration);
      const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.lerpVectors(tween.from.pos, tween.to.pos, k);
      controls.target.lerpVectors(tween.from.target, tween.to.target, k);
      if (t >= 1) tween = null;
    }
    controls.update();
    renderer.render(scene, camera);
    frames += 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  renderer.render(scene, camera);

  return {
    setView,
    views: Object.keys(views),
    setAutoRotate(on) { controls.autoRotate = !!on; },
    get autoRotate() { return controls.autoRotate; },
    renderOnce() { controls.update(); renderer.render(scene, camera); },
    get frames() { return frames; },
    dispose() {
      running = false;
      observer.disconnect();
      controls.dispose();
      scene.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
        for (const material of materials) {
          for (const value of Object.values(material)) if (value && value.isTexture) value.dispose();
          material.dispose();
        }
      });
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
