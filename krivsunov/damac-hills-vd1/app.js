// Сайт виллы VD-1: обложка, 3D-модель с инструментами (время суток, рулетка, мини-карта, подписи комнат, снимок),
// галереи рендеров, фото, видео и планов с просмотром на весь экран.
import * as THREE from 'three';

const REL = (document.querySelector('meta[name="release"]') || {}).content || 'dev';
const $ = (s, el = document) => el.querySelector(s);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// ---------- шапка и обложка ----------
const top = $('#top');
addEventListener('scroll', () => top.classList.toggle('solid', scrollY > 40), { passive: true });
const hero = $('#hero');
let heroAuto = true;
for (const b of document.querySelectorAll('[data-hero]')) b.addEventListener('click', () => { heroAuto = false; setHero(b.dataset.hero); });
function setHero(mode) {
  hero.classList.toggle('is-dusk', mode === 'dusk');
  for (const b of document.querySelectorAll('[data-hero]')) b.classList.toggle('on', b.dataset.hero === mode);
}
setInterval(() => { if (heroAuto) setHero(hero.classList.contains('is-dusk') ? 'day' : 'dusk'); }, 9000);

// ---------- рендеры ----------
const RENDERS = [
  ['hero_golf', 'Вид с гольф-поля', 'ext'], ['facade_yard', 'Фасад со двора — как на фото риэлтора', 'ext'], ['aerial', 'С высоты: участок, соседи, гольф', 'ext'],
  ['street', 'Со стороны улицы: навес на 2 машины', 'ext'], ['balcony', 'Вид с балкона спальни хозяина на гольф', 'ext'],
  ['living', 'Гостиная и столовая: витраж на гольф', 'int'], ['living_back', 'Гостиная: вид к кухне и холлу', 'int'], ['hall', 'Входной холл: второй свет до крыши', 'int'],
  ['stair', 'Лестница с площадки у витража', 'int'], ['kitchen', 'Кухня', 'int'], ['master', 'Спальня хозяина: выход на балкон', 'int'], ['master_bath', 'Ванная хозяина', 'int'],
  ['hero_golf_dusk', 'Вид с гольфа вечером', 'dusk'], ['facade_yard_dusk', 'Фасад со двора вечером', 'dusk'], ['living_dusk', 'Гостиная вечером', 'dusk']
];
const lbItems = { renders: RENDERS.map(([id, cap]) => ({ src: `renders/${id}-2560.webp`, cap, dl: `renders/${id}-2560.webp` })) };
const renderGrid = $('#render-grid');
RENDERS.forEach(([id, cap, kind], i) => {
  const f = el('figure', 'card');
  f.dataset.kind = kind;
  const img = el('img'); img.src = `renders/${id}-1280.webp`; img.loading = 'lazy'; img.alt = cap;
  f.append(img, el('figcaption', null, cap));
  if (kind === 'dusk') f.append(el('span', 'badge', 'вечер'));
  f.addEventListener('click', () => openLb('renders', i));
  renderGrid.append(f);
});
for (const b of document.querySelectorAll('#render-tabs button')) b.addEventListener('click', () => {
  for (const x of document.querySelectorAll('#render-tabs button')) x.classList.toggle('on', x === b);
  for (const c of renderGrid.children) c.hidden = b.dataset.f !== 'all' && c.dataset.kind !== b.dataset.f;
});

// ---------- фото, видео, планы ----------
fetch(`media.json?v=${REL}`).then((r) => r.json()).then((media) => {
  const photos = media.filter((m) => m.kind === 'photos'), plans = media.filter((m) => m.kind === 'plans'), videos = media.filter((m) => m.kind === 'video');
  lbItems.photos = photos.map((m) => ({ src: m.src, cap: m.caption, dl: m.src }));
  lbItems.plans = plans.map((m) => ({ src: m.src, cap: m.caption, dl: m.src }));
  photos.forEach((m, i) => {
    const f = el('figure', 'card tall');
    const img = el('img'); img.src = m.thumb; img.loading = 'lazy'; img.alt = m.caption;
    img.addEventListener('load', () => { if (img.naturalWidth > img.naturalHeight) f.classList.remove('tall'); }, { once: true });
    f.append(img, el('figcaption', null, m.caption));
    f.addEventListener('click', () => openLb('photos', i));
    $('#photo-grid').append(f);
  });
  plans.forEach((m, i) => {
    const f = el('figure', 'card');
    const img = el('img'); img.src = m.thumb; img.loading = 'lazy'; img.alt = m.caption; img.style.objectFit = 'contain'; img.style.background = '#fff';
    f.append(img, el('figcaption', null, m.caption));
    f.addEventListener('click', () => openLb('plans', i));
    $('#plan-grid').append(f);
  });
  for (const m of videos) {
    const v = el('video');
    v.controls = true; v.preload = 'metadata'; v.playsInline = true; v.src = m.src; v.poster = 'photos/damac_hills_samantha_1558-2c7b85bf4e3dac.webp';
    $('#video-grid').append(v);
  }
});

// ---------- просмотр на весь экран ----------
const lb = $('#lb');
let lbList = [], lbI = 0;
function openLb(list, i) { lbList = lbItems[list] || []; lbI = i; showLb(); if (!lb.open) lb.showModal(); }
function showLb() {
  const it = lbList[lbI];
  if (!it) return;
  $('.lb-img img', lb).src = it.src;
  $('.lb-cap', lb).textContent = `${it.cap} · ${lbI + 1} из ${lbList.length}`;
  $('.lb-dl', lb).href = it.dl;
}
$('.lb-x', lb).addEventListener('click', () => lb.close());
$('.lb-prev', lb).addEventListener('click', () => { lbI = (lbI - 1 + lbList.length) % lbList.length; showLb(); });
$('.lb-next', lb).addEventListener('click', () => { lbI = (lbI + 1) % lbList.length; showLb(); });
lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') $('.lb-prev', lb).click(); if (e.key === 'ArrowRight') $('.lb-next', lb).click(); });
lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-img')) lb.close(); });

// ---------- 3D ----------
const T = 'tex/';
// фотоскан-текстуры Poly Haven (CC0) и подгонка альбедо под фото дома (те же множители, что в рендерах Cycles)
const IMAGES = {
  render: { base: T + 'beige_wall_001', meters: 3.0, tint: [1.85, 2.1, 2.3] },
  renderWhite: { base: T + 'plastered_wall_04', meters: 3.2, tint: [2.8, 2.85, 2.8] },
  stone: { base: T + 'stacked_stone_wall', meters: 1.2, tint: [1.9, 1.8, 2.0] },
  brick: { base: T + 'brick_wall_006', meters: 3.0, tint: [0.85, 0.9, 1.0] },
  concrete: { base: T + 'concrete_floor_02', meters: 2.0, tint: [1.85, 2.15, 3.0] },
  gravel: { base: T + 'gravel_floor_02', meters: 2.0, tint: [0.74, 0.75, 0.78] },
  pavers: { base: T + 'pavement_05', meters: 2.6, tint: [2.05, 2.5, 2.95] },
  asphalt: { base: T + 'asphalt_01', meters: 2.08, tint: [0.75, 0.9, 1.15] },
  sand: { base: T + 'sand_01', meters: 1.5, tint: [1.8, 1.9, 2.35] },
  rough: { base: T + 'withered_grass', meters: 3.0, tint: [0.95, 0.95, 0.85] },
  lawn: { base: T + 'leafy_grass', meters: 2.0, tint: [0.3, 0.5, 0.33] },
  soil: { base: T + 'aerial_ground_rock', meters: 3.0 },
  rust: { base: T + 'rust_coarse_01', meters: 2.2, tint: [1.6, 1.6, 1.8], normalScale: 0.5 },
  wenge: { base: T + 'dark_wood', meters: 2.0, tint: [0.45, 1.2, 2.4] },
  palmBark: { base: T + 'palm_tree_bark', meters: 1.3, tint: [0.8, 0.76, 0.72] }
};
const SUNS = { morning: { azimuth: 40, elevation: 24, lights: 0 }, day: { azimuth: 145, elevation: 38, lights: 0 }, sunset: { azimuth: 160, elevation: 4, lights: 0.7 }, night: { azimuth: 168, elevation: -7, lights: 1 } };
const VIEWS = [['start', 'Обзор'], ['golf', 'С гольфа'], ['street', 'С улицы'], ['back', 'Терраса'], ['top', 'Сверху'], ['gf', 'План 1 эт.'], ['ff', 'План 2 эт.']];
const stage = $('#stage');
let viewer = null, loading = false;

for (const a of document.querySelectorAll('[data-open3d]')) a.addEventListener('click', () => open3d(a.dataset.open3d));
$('#open3d').addEventListener('click', () => open3d());

async function open3d(then) {
  if (viewer) { act(then); return; }
  if (loading) return;
  loading = true;
  stage.innerHTML = '';
  const status = el('div', 'status', 'Загружаю 3D-модель…');
  stage.append(status);
  THREE.DefaultLoadingManager.onProgress = (url, n, total) => { status.textContent = `Текстуры ${n} из ${total}…`; if (n >= total) setTimeout(() => status.remove(), 300); };
  try {
    const [lib, model] = await Promise.all([import(`./villa3d/viewer.js?v=${REL}`), import(`./villa3d/damac_hills_samantha_1558.js?v=${REL}`)]);
    status.textContent = 'Собираю дом, участок и гольф…';
    await new Promise((r) => setTimeout(r, 30));
    viewer = lib.mount(stage, model.build, { onTour: onTour, onWalk: onWalk, buildOptions: { images: IMAGES } });
    buildUI(viewer);
    window.__vd1 = viewer;   // для проверок
    act(then);
  } catch (e) {
    status.textContent = 'Не удалось открыть 3D: ' + (e && e.message || e);
    console.error(e);
  }
  loading = false;
}
function act(then) {
  if (!viewer) return;
  if (then === 'tour' && viewer.tour) viewer.tour.start();
  if (then === 'walk' && viewer.walk) viewer.walk.start('entry');
}

let ui = {};
function buildUI(v) {
  const model = v.debug.model;
  // ракурсы
  const views = el('div', 'bar top-left');
  const seg = el('div', 'seg');
  for (const [id, name] of VIEWS) {
    if (!v.views.includes(id)) continue;
    const b = el('button', id === 'start' ? 'on' : '', name);
    b.dataset.view = id;
    b.addEventListener('click', () => { v.setView(id); markView(id); });
    seg.append(b);
  }
  views.append(seg);
  // время суток, рулетка, снимок, качество, на весь экран
  const tools = el('div', 'bar top-right');
  const tseg = el('div', 'seg');
  for (const [id, name] of [['morning', 'Утро'], ['day', 'День'], ['sunset', 'Закат'], ['night', 'Ночь']]) {
    const b = el('button', id === 'day' ? 'on' : '', name);
    b.addEventListener('click', () => { v.setSun(SUNS[id]); for (const x of tseg.children) x.classList.toggle('on', x === b); });
    tseg.append(b);
  }
  const measureBtn = el('button', 'tool', '📏 Рулетка');
  const snapBtn = el('button', 'tool', '📷 Снимок');
  const qBtn = el('button', 'tool', v.quality === 'high' ? '✨ Высокое' : '⚡ Быстрое');
  const fsBtn = el('button', 'tool', '⛶');
  fsBtn.title = 'На весь экран';
  qBtn.title = 'Качество графики';
  tools.append(tseg, measureBtn, snapBtn, qBtn, fsBtn);
  qBtn.addEventListener('click', () => { v.setQuality(v.quality === 'high' ? 'low' : 'high'); qBtn.textContent = v.quality === 'high' ? '✨ Высокое' : '⚡ Быстрое'; });
  fsBtn.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen && stage.requestFullscreen(); });
  snapBtn.addEventListener('click', () => {
    const a = el('a');
    a.href = v.snapshot();
    a.download = `vd1-${v.viewName || 'view'}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.jpg`;
    a.click();
  });
  // пролёт и прогулка
  const bottom = el('div', 'bar bottom-left');
  const tourBtn = el('button', 'tool', '▶ Пролёт по дому');
  const tourInfo = el('div', 'tour-info'); tourInfo.hidden = true;
  const tourText = el('span', null, ''), tourP = el('div', 'p'), tourFill = el('span'); tourP.append(tourFill); tourInfo.append(tourText, tourP);
  const walkBtn = el('button', 'tool', '🚶 Прогулка');
  const spawn = el('select', 'tool');
  for (const s of (v.walk ? v.walk.spawns : [])) { const o = el('option', null, s.label); o.value = s.name; spawn.append(o); }
  const exitBtn = el('button', 'tool', '✕ Выйти'); exitBtn.hidden = true;
  bottom.append(tourBtn, tourInfo, walkBtn, spawn, exitBtn);
  tourBtn.addEventListener('click', () => {
    if (!v.tour) return;
    if (v.tour.state === 'playing') v.tour.pause(); else if (v.tour.state === 'paused') v.tour.resume(); else v.tour.start();
  });
  walkBtn.addEventListener('click', () => v.walk && v.walk.start(spawn.value));
  spawn.addEventListener('change', () => v.walk && v.walk.active && v.walk.start(spawn.value));
  exitBtn.addEventListener('click', () => v.walk && v.walk.stop());
  // подпись комнаты, подсказка, мини-карта
  const roomTag = el('div', 'room-tag'); roomTag.hidden = true;
  const help = el('div', 'help'); help.hidden = true;
  const mini = el('canvas', 'minimap'); mini.width = 480; mini.height = 264; mini.hidden = true;
  const miniCap = el('div', 'minimap-cap', 'мини-карта · щелчок — перейти'); miniCap.hidden = true;
  const labels = el('div', 'labels');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'measure-svg');
  stage.append(views, tools, bottom, roomTag, help, mini, miniCap, labels, svg);
  ui = { seg, tourBtn, tourInfo, tourText, tourFill, walkBtn, spawn, exitBtn, roomTag, help, mini, miniCap, labels, measureBtn, svg };

  function markView(id) { for (const b of seg.children) b.classList.toggle('on', b.dataset.view === id); renderRoomLabels(id); }
  ui.markView = markView;

  // подписи комнат на поэтажном плане
  const roomEls = [];
  function renderRoomLabels(id) {
    labels.innerHTML = '';
    roomEls.length = 0;
    const floor = id === 'gf' ? 1 : id === 'ff' ? 2 : 0;
    if (!floor) return;
    for (const r of model.rooms || []) {
      const [x0, x1, y0, , z0, z1] = r.box;
      const f = y0 < 2 ? 1 : 2;
      if (f !== floor || x1 - x0 > 30) continue;
      const d = el('div', 'rl', r.name.split(' · ')[0]);
      labels.append(d);
      roomEls.push({ d, p: [(x0 + x1) / 2, (f === 1 ? 0.3 : 4.0) + 0.2, (z0 + z1) / 2] });
    }
  }
  v.onFrame(() => {
    for (const r of roomEls) {
      const s = v.project(...r.p);
      r.d.hidden = !s;
      if (s) { r.d.style.left = `${s.x}px`; r.d.style.top = `${s.y}px`; }
    }
    drawMeasure();
    if (!mini.hidden) drawMini();
  });

  // рулетка: два щелчка по модели — расстояние в метрах
  let measuring = false, mPts = [], down = null;
  measureBtn.addEventListener('click', () => { measuring = !measuring; mPts = []; measureBtn.classList.toggle('on', measuring); stage.classList.toggle('measuring', measuring); help.hidden = !measuring; help.textContent = 'Рулетка: щёлкните по двум точкам модели. Третий щелчок — новый замер.'; });
  const cnv = stage.querySelector('canvas');
  cnv.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  cnv.addEventListener('pointerup', (e) => {
    if (!measuring || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    const p = v.pick(e.clientX, e.clientY);
    if (!p) return;
    if (mPts.length >= 2) mPts = [];
    mPts.push(p);
  });
  function drawMeasure() {
    if (!mPts.length) { svg.innerHTML = ''; return; }
    const s = mPts.map((p) => v.project(p.x, p.y, p.z));
    let html = '';
    s.forEach((q) => { if (q) html += `<circle cx="${q.x}" cy="${q.y}" r="5"/>`; });
    if (s.length === 2 && s[0] && s[1]) {
      const dist = mPts[0].distanceTo(mPts[1]);
      const mx = (s[0].x + s[1].x) / 2, my = (s[0].y + s[1].y) / 2, t = `${dist.toFixed(2).replace('.', ',')} м`;
      html += `<line x1="${s[0].x}" y1="${s[0].y}" x2="${s[1].x}" y2="${s[1].y}"/><rect x="${mx - 36}" y="${my - 14}" width="72" height="26" rx="6"/><text x="${mx}" y="${my + 5}" text-anchor="middle">${t}</text>`;
    }
    svg.innerHTML = html;
  }

  // мини-карта прогулки: стены текущего этажа из модели, точка и взгляд, щелчок — переход
  const X0 = -22.5, X1 = 21.5, Z0 = -9.5, Z1 = 9.5;
  const mctx = mini.getContext('2d');
  const sc = Math.min(mini.width / (X1 - X0), mini.height / (Z1 - Z0));
  const ox = (mini.width - (X1 - X0) * sc) / 2, oz = (mini.height - (Z1 - Z0) * sc) / 2;
  const toM = (x, z) => [ox + (x - X0) * sc, oz + (z - Z0) * sc];
  const plans = {};
  function planFor(floor) {
    if (plans[floor]) return plans[floor];
    const c = document.createElement('canvas'); c.width = mini.width; c.height = mini.height;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(210,178,119,0.08)';
    const [px0, pz0] = toM(-21.21, -8.16), [px1, pz1] = toM(20.2, 8.25);
    g.fillRect(px0, pz0, px1 - px0, pz1 - pz0);
    const fy = floor === 2 ? 4.0 : 0.3;
    g.fillStyle = 'rgba(238,233,223,0.9)';
    for (const b of model.phys.colliders) {
      const [x0, y0, z0, x1, y1, z1] = b;
      if (y0 > fy + 1.2 || y1 < fy + 0.8) continue;
      if (x1 < X0 || x0 > X1 || z1 < Z0 || z0 > Z1) continue;
      const [a0, b0] = toM(x0, z0), [a1, b1] = toM(x1, z1);
      g.fillRect(a0, b0, Math.max(1, a1 - a0), Math.max(1, b1 - b0));
    }
    plans[floor] = c;
    return c;
  }
  function drawMini() {
    const w = v.walkState;
    if (!w) return;
    const floor = w.y > 2.5 ? 2 : 1;
    mctx.clearRect(0, 0, mini.width, mini.height);
    mctx.drawImage(planFor(floor), 0, 0);
    const [mx, mz] = toM(w.x, w.z);
    const fx = -Math.sin(w.yaw), fz = -Math.cos(w.yaw), a = Math.atan2(fz, fx);
    mctx.fillStyle = 'rgba(210,178,119,0.35)';
    mctx.beginPath(); mctx.moveTo(mx, mz); mctx.arc(mx, mz, 34, a - 0.55, a + 0.55); mctx.closePath(); mctx.fill();
    mctx.fillStyle = '#d2b277'; mctx.beginPath(); mctx.arc(mx, mz, 6, 0, 7); mctx.fill();
    mctx.strokeStyle = '#1a1408'; mctx.lineWidth = 2; mctx.stroke();
    mctx.fillStyle = 'rgba(238,233,223,0.8)'; mctx.font = '20px system-ui'; mctx.fillText(floor === 2 ? '2-й этаж' : '1-й этаж', 10, 26);
  }
  mini.addEventListener('click', (e) => {
    const w = v.walkState;
    if (!w) return;
    const r = mini.getBoundingClientRect();
    const cx = (e.clientX - r.left) * (mini.width / r.width), cz = (e.clientY - r.top) * (mini.height / r.height);
    const x = X0 + (cx - ox) / sc, z = Z0 + (cz - oz) / sc;
    const insideHouse = x > -14 && x < 13.8 && z > -5.2 && z < 5.25;
    const y = insideHouse ? (w.y > 2.5 ? 4.0 : 0.3) : 0.03;
    v.teleport(x, y, z);
  });
}

function onTour(info) {
  if (!ui.tourBtn) return;
  ui.tourBtn.textContent = info.state === 'playing' ? '❚❚ Пауза' : info.state === 'paused' ? '▶ Продолжить' : '▶ Пролёт по дому';
  ui.tourInfo.hidden = info.state === 'idle';
  ui.tourText.textContent = info.label || '';
  ui.tourFill.style.width = `${Math.round((info.progress || 0) * 100)}%`;
  if (info.state !== 'idle' && ui.markView) for (const b of ui.seg.children) b.classList.remove('on');
}
function onWalk(info) {
  if (!ui.walkBtn) return;
  const on = !!info.active;
  ui.exitBtn.hidden = !on;
  ui.walkBtn.hidden = on;
  ui.roomTag.hidden = !on || !info.room;
  ui.roomTag.textContent = info.room || '';
  ui.mini.hidden = !on;
  ui.miniCap.hidden = !on;
  ui.help.hidden = !on;
  ui.help.textContent = info.coarse ? 'Джойстик слева — идти, правым пальцем — смотреть' : info.locked ? 'W A S D — идти · мышь — смотреть · Shift — быстрее · Esc — выйти' : 'Щёлкните по сцене, чтобы управлять мышью · W A S D — идти';
  if (on && ui.markView) for (const b of ui.seg.children) b.classList.remove('on');
  if (!on && ui.markView) ui.markView('start');
}

// ---------- 360° тур: панорамы Cycles на сфере, метки переходов ----------
const LINKS = {
  p_terrace: ['p_living'], p_living: ['p_terrace', 'p_dining', 'p_family'], p_dining: ['p_living', 'p_kitchen'], p_family: ['p_living', 'p_hall'],
  p_kitchen: ['p_dining', 'p_hall'], p_hall: ['p_family', 'p_kitchen', 'p_landing'], p_landing: ['p_hall', 'p_gallery'], p_gallery: ['p_landing', 'p_family2'],
  p_family2: ['p_gallery', 'p_master', 'p_bed2'], p_master: ['p_family2', 'p_balcony'], p_balcony: ['p_master'], p_bed2: ['p_family2']
};
const START_YAW = { p_terrace: -Math.PI / 2, p_living: Math.PI / 2, p_dining: Math.PI / 2, p_family: 0, p_kitchen: 0, p_hall: Math.PI, p_landing: 0, p_gallery: 0, p_family2: Math.PI / 2, p_master: Math.PI / 2, p_balcony: Math.PI / 2, p_bed2: Math.PI / 2 };
fetch(`panos.json?v=${REL}`).then((r) => r.json()).then((panos) => {
  const box = $('#pano');
  const byId = Object.fromEntries(panos.map((p) => [p.id, p]));
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });   // кадр можно сохранить
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  box.prepend(renderer.domElement);
  const fade = el('div', 'pano-fade'), title = el('div', 'pano-title', '');
  box.append(fade, title);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  const tex = (id) => {
    if (!cache.has(id)) cache.set(id, new Promise((res) => loader.load(`panos/${id}-4096.webp`, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null))));
    return cache.get(id);
  };
  let cur = null, yaw = 0, pitch = 0, fov = 75, hots = [];
  async function go(id) {
    const p = byId[id];
    if (!p) return;
    fade.classList.add('on');
    const t = await tex(id);
    setTimeout(() => {
      if (t) scene.background = t;
      cur = p; yaw = START_YAW[id] ?? 0; pitch = 0;
      title.textContent = p.label;
      for (const h of hots) h.el.remove();
      hots = (LINKS[id] || []).map((to) => {
        const q = byId[to];
        const d = new THREE.Vector3(q.pos[0] - p.pos[0], q.pos[1] - p.pos[1] - 0.9, q.pos[2] - p.pos[2]).normalize();
        const b = el('button', 'hot'); b.append(el('i'), el('span', null, q.label));
        b.addEventListener('click', (e) => { e.stopPropagation(); go(to); });
        box.append(b);
        return { el: b, d };
      });
      for (const x of $('#pano-rooms').children) x.classList.toggle('on', x.dataset.id === id);
      fade.classList.remove('on');
      for (const to of LINKS[id] || []) tex(to);  // заранее подгрузить соседние
    }, 260);
  }
  for (const p of panos) {
    const b = el('button');
    b.dataset.id = p.id;
    const im = el('img'); im.src = `panos/${p.id}-thumb.webp`; im.loading = 'lazy'; im.alt = p.label;
    b.append(im, el('span', null, p.label));
    b.addEventListener('click', () => go(p.id));
    $('#pano-rooms').append(b);
  }
  let drag = null;
  box.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; box.setPointerCapture(e.pointerId); });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = (fov / 75) * 0.0042;
    yaw += (e.clientX - drag.x) * k; pitch = Math.max(-1.35, Math.min(1.35, pitch + (e.clientY - drag.y) * k));
    drag = { x: e.clientX, y: e.clientY };
  });
  box.addEventListener('pointerup', () => { drag = null; });
  box.addEventListener('wheel', (e) => { e.preventDefault(); fov = Math.max(35, Math.min(95, fov + e.deltaY * 0.04)); }, { passive: false });
  const v3 = new THREE.Vector3();
  let started = false;
  function loop() {
    const w = box.clientWidth, h = box.clientHeight;
    if (renderer.domElement.width !== Math.round(w * renderer.getPixelRatio())) { renderer.setSize(w, h, false); }
    camera.aspect = w / h; camera.fov = fov; camera.updateProjectionMatrix();
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    renderer.render(scene, camera);
    for (const hsp of hots) {
      v3.copy(hsp.d).multiplyScalar(10).project(camera);
      const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      hsp.el.hidden = !vis;
      if (vis) { hsp.el.style.left = `${(v3.x * 0.5 + 0.5) * w}px`; hsp.el.style.top = `${(-v3.y * 0.5 + 0.5) * h}px`; }
    }
    requestAnimationFrame(loop);
  }
  const io = new IntersectionObserver((ents) => { if (!started && ents.some((x) => x.isIntersecting)) { started = true; go('p_living'); loop(); } });
  io.observe(box);
}).catch(() => { $('#tour360').hidden = true; });
