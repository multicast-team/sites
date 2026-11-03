// Просмотр 3D-модели виллы: небо, солнце с тенями, вращение мышью/пальцем, готовые ракурсы и пролёт по дому.
// mount(container, build, { onTour }) — build(THREE) возвращает { root, views, tour?, doors? }.
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

// Маршрут пролёта: сплайн через точки камеры и отдельный сплайн через точки взгляда с тем же параметром.
// Скорость ровная по длине пути (speed на участке, м/с), hold — остановка в точке, плавный разгон и торможение у остановок.
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

  // Внутри дома отражения и рассеянный свет — от светлой тёплой комнаты с окнами, а не от неба:
  // материалы модели с userData.room получают эту среду вместо общей.
  const roomScene = new THREE.Scene();
  const tone = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.BackSide });
  const walls = tone(0.86, 0.79, 0.69);
  roomScene.add(new THREE.Mesh(new THREE.BoxGeometry(16, 5, 16), [walls, walls, tone(0.96, 0.94, 0.9), tone(0.8, 0.66, 0.48), walls, walls]));
  for (const [x, z, ry] of [[0, -7.9, 0], [7.9, 0, -Math.PI / 2]]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 2.2, 2.5) }));
    win.position.set(x, 0.3, z);
    win.rotation.y = ry;
    roomScene.add(win);
  }
  const roomTarget = pmrem.fromScene(roomScene, 0.03);

  const model = build(THREE);
  model.root.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = !node.userData.noCast;
      node.receiveShadow = true;
      for (const material of [].concat(node.material)) if (material.userData.room) material.envMap = roomTarget.texture;
    }
  });
  scene.add(model.root);

  const ORBIT_FOV = 40, TOUR_FOV = 58;
  const camera = new THREE.PerspectiveCamera(ORBIT_FOV, 1, 0.3, 1500);
  const controls = new OrbitControls(camera, renderer.domElement);
  const ORBIT = { minDistance: 5, maxDistance: 170, enableZoom: true, enablePan: true };
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  Object.assign(controls, ORBIT);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 0.6;

  const views = model.views || {};
  let tween = null;

  // ---------- пролёт ----------
  const route = Array.isArray(model.tour) && model.tour.length > 1 ? makeTour(model.tour) : null;
  const doors = (model.doors || []).map((obj) => ({ obj, open: obj.userData.openAngle || 0, target: 0 }));
  let tourState = 'idle';
  let tourTime = 0;
  let tourLabel = '';
  let lastNotice = 0;
  const lookAt = new THREE.Vector3();
  const notify = () => {
    if (typeof options.onTour === 'function') options.onTour({ state: tourState, label: tourLabel, progress: route ? tourTime / route.duration : 0, time: tourTime, duration: route ? route.duration : 0 });
  };
  const inside = (p) => Math.abs(p.x) < 13.5 && Math.abs(p.z) < 8.2 && p.y < 10;
  function setNear(value, fov = camera.fov) {
    if (camera.near !== value || camera.fov !== fov) { camera.near = value; camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  function applyTour() {
    const pose = route.pose(tourTime);
    camera.position.copy(pose.pos);
    lookAt.copy(pose.look);
    camera.lookAt(lookAt);
    setNear(inside(pose.pos) ? 0.05 : 0.3, TOUR_FOV); // в комнатах — широкий угол, как у архитектурной съёмки
    if (pose.label !== tourLabel) { tourLabel = pose.label; notify(); }
  }
  function freeLook() { // на паузе можно оглядеться на месте: цель вращения в 5 см перед камерой
    const dir = lookAt.clone().sub(camera.position).normalize();
    controls.target.copy(camera.position).addScaledVector(dir, 0.05);
    Object.assign(controls, { minDistance: 0.01, maxDistance: 0.2, enableZoom: false, enablePan: false, enabled: true });
    controls.update();
  }
  function orbitMode() {
    Object.assign(controls, ORBIT, { enabled: true });
    setNear(0.3, ORBIT_FOV);
  }
  const tour = route && {
    get duration() { return route.duration; },
    get state() { return tourState; },
    get time() { return tourTime; },
    start() {
      tween = null;
      controls.autoRotate = false;
      controls.enabled = false;
      tourTime = 0;
      tourState = 'playing';
      for (const door of doors) door.target = door.open;
      applyTour();
      notify();
    },
    pause() {
      if (tourState !== 'playing') return;
      tourState = 'paused';
      freeLook();
      notify();
    },
    resume() {
      if (tourState !== 'paused') return;
      controls.enabled = false;
      tourState = 'playing';
      notify();
    },
    stop(toView = 'start') {
      if (tourState === 'idle') return;
      tourState = 'idle';
      tourLabel = '';
      for (const door of doors) door.target = 0;
      orbitMode();
      if (toView) setView(toView);
      notify();
    },
    seek(time) { // для проверок: поставить момент пролёта и нарисовать кадр
      tourTime = Math.min(route.duration, Math.max(0, time));
      for (const door of doors) { door.target = door.open; door.obj.rotation.y = door.open; }
      applyTour();
      renderer.render(scene, camera);
      return tourLabel;
    }
  };
  // нажатие на модель во время пролёта — пауза; слушатель на перехвате, чтобы тем же движением сразу оглядеться
  renderer.domElement.addEventListener('pointerdown', () => { if (tour && tourState === 'playing') tour.pause(); }, { capture: true });

  function setView(name, instant) {
    const view = views[name] || views.start;
    if (!view) return;
    if (tour && tourState !== 'idle') { tourState = 'idle'; tourLabel = ''; for (const door of doors) door.target = 0; notify(); }
    orbitMode();
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
  let last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    for (const door of doors) {
      const r = door.obj.rotation;
      if (r.y !== door.target) r.y += Math.sign(door.target - r.y) * Math.min(Math.abs(door.target - r.y), dt * 1.6);
    }
    if (tourState === 'playing') {
      tourTime += dt;
      if (tourTime >= route.duration) {
        tourTime = route.duration;
        applyTour();
        tourState = 'idle';
        tourLabel = '';
        for (const door of doors) door.target = 0;
        orbitMode();
        controls.target.copy(lookAt);
        controls.update();
        notify();
      } else {
        applyTour();
        if (now - lastNotice > 250) { lastNotice = now; notify(); }
      }
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
    renderer.render(scene, camera);
    frames += 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  renderer.render(scene, camera);

  return {
    setView,
    views: Object.keys(views),
    tour,
    setAutoRotate(on) {
      if (on && tour) tour.stop();
      controls.autoRotate = !!on;
    },
    get autoRotate() { return controls.autoRotate; },
    renderOnce() { controls.update(); renderer.render(scene, camera); },
    get frames() { return frames; },
    debug: { renderer, scene, camera, controls },
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
      roomTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  };
}
