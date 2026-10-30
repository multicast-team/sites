// Страница игры (этап 6.33): DOM-обвязка вокруг ui/main/game.mjs — загрузка данных и пакета по fetch, растр ui/render,
// вывод ui/render/present, касания и мышь (касание = нажатие, протяжка = прокрутка, колесо = прокрутка), сохранение в
// localStorage, импорт и экспорт сейва. Параметры адреса: ?pack=gray|local&w=500|1000. Для тестов — window.game.
import { loadGame, createApp } from './game.mjs';
import { createRaster } from '../render/pick.mjs';
import { createPresenter, fitStyle } from '../render/present.mjs';

// корень проекта на сервере страницы: страница лежит в ui/main/, данные — data/, пакеты — skin/, skin-gray/, skin-local/
const ROOT = location.href.replace(/ui\/main\/[^/]*$/, '');
const qs = new URLSearchParams(location.search);
const pack = 'gray';
const W = qs.get('w') === '1000' ? 1000 : 500, H = W === 1000 ? 1920 : 960;
const $ = (id) => document.getElementById(id);
const status = (t) => { $('status').textContent = t; };

async function fetchJson(p) {
  const r = await fetch(new URL(p, ROOT));
  if (!r.ok) throw new Error(`${r.status} ${p}`);
  return r.json();
}

async function main() {
  $('pack').value = pack; $('size').value = String(W);
  for (const id of ['pack', 'size']) $(id).onchange = () => { location.search = `?pack=gray&w=${$('size').value}`; };
  const bins = new Map();
  const L = await loadGame({ pack, read: fetchJson, readBinary: (p) => { if (!bins.has(p)) throw new Error(`атлас не загружен: ${p}`); return bins.get(p); } });
  if (pack === 'local') {
    await Promise.all(Array.from({ length: L.sk.atlasCount }, async (_, i) => {
      const p = L.sk.atlasFile(i);
      const r = await fetch(new URL(p, ROOT));
      if (!r.ok) throw new Error(`${r.status} ${p}`);
      bins.set(p, new Uint8Array(await r.arrayBuffer()));
    }));
  }
  const app = createApp(L, { window: { w: W, h: H }, epochSeconds: Math.floor(Date.now() / 1000) });
  const canvas = $('game');
  const pres = createPresenter(canvas, W, H);
  const fit = () => Object.assign(canvas.style, fitStyle(W, H, Math.min(innerWidth - 12, W), Math.max(200, innerHeight - 80)));
  fit(); addEventListener('resize', fit);
  const { raster: R, kind } = createRaster(W, H);
  const storageKey = L.mainDoc.storageKey;

  let dirty = true, last = null, busy = false;
  async function draw() {
    if (busy) return; busy = true;
    const t0 = performance.now();
    last = app.render(R);
    await R.finish();
    pres.present(R.readFrame());
    last.ms = Math.round(performance.now() - t0);
    dirty = false; busy = false;
    status(`${pack} ${W}×${H} · экран ${last.screen} · кадр ${app.frame} · ${last.ms} мс`);
  }
  // часы игры: 60 кадров в секунду по реальному времени, рисуем по изменению (и хаб — для пульса плиток раз в 100 мс)
  let acc = 0, prev = performance.now(), pulse = 0;
  function loop(now) {
    acc += Math.min(1000, now - prev); prev = now;
    const n = Math.floor(acc * 60 / 1000);
    if (n > 0) { app.step(n); acc -= n * 1000 / 60; }
    if (app.screenName() === 'hub' && now - pulse > 100) { pulse = now; dirty = true; }
    if (dirty) draw();
    requestAnimationFrame(loop);
  }

  // касания: px окна игры = px canvas (W×H) с учётом масштаба CSS
  const toWin = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  const D = L.mainDoc.scroll;
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); down = { p: toWin(e), y: toWin(e)[1], moved: false }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const [, y] = toWin(e), dy = (down.y - y) * 960 / H;
    if (!down.moved && Math.abs(y - down.p[1]) * 960 / H < D.dragThreshold) return;
    down.moved = true; down.y = y; app.scrollBy(dy); dirty = true;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (down && !down.moved) {
      const [x, y] = down.p;
      if (x >= 0 && y >= 0 && x < W && y < H) app.tap(x, y);
    }
    down = null; dirty = true;
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); app.scrollBy(Math.sign(e.deltaY) * D.wheelStep); dirty = true; }, { passive: false });

  const save = () => { localStorage.setItem(storageKey, app.exportSave()); status('сохранено'); };
  const load = () => { const t = localStorage.getItem(storageKey); if (t) { app.importSave(t); dirty = true; return true; } status('сейва нет'); return false; };
  $('new').onclick = () => { app.newGame(); dirty = true; };
  $('save').onclick = save;
  $('load').onclick = load;
  $('export').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([app.exportSave()], { type: 'text/plain' }));
    a.download = 'obelisk-full-save.ini'; a.click();
  };
  $('import').onchange = async (e) => { const f = e.target.files[0]; if (f) { app.importSave(await f.text()); dirty = true; } };
  addEventListener('pagehide', save);

  if (localStorage.getItem(storageKey) && qs.get('fresh') !== '1') load();
  window.game = { app, pack, W, H, raster: kind, save, load, redraw: async () => { dirty = true; await draw(); return last; }, get last() { return last; } };
  await draw();
  requestAnimationFrame(loop);
  window.gameReady = true;
}

main().catch((e) => { status(`ошибка: ${e.message}`); window.gameError = String(e.stack || e); console.error(e); });
