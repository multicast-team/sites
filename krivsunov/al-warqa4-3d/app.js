// Интерфейс полной 3D-визуализации виллы: кнопки, загрузка, подсказки, прогулка, пролёт, состояние в адресе страницы.
import { createEngine, QUALITY, TIMES } from './engine.js';
import * as villaModule from './villa.js';
import * as cyberModule from './cyber.js';
import * as propsModule from './props.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)').matches;
const small = Math.min(screen.width, screen.height) < 720;
const quality = QUALITY[params.get('quality')] ? params.get('quality') : (coarse || small ? 'medium' : 'ultra');
const time = TIMES[params.get('time')] ? params.get('time') : 'day';
const furniture = params.get('furniture') !== '0';

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function syncUrl(engine) {
  const s = engine.state;
  const q = new URLSearchParams();
  if (s.time !== 'day') q.set('time', s.time);
  if (!s.furniture) q.set('furniture', '0');
  if (params.get('quality')) q.set('quality', s.quality);
  history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}`);
}

async function main() {
  if (!webglOk()) {
    const div = document.createElement('div');
    div.className = 'error';
    div.textContent = 'Браузер не поддерживает WebGL — 3D-визуализация не откроется. Попробуйте Chrome, Safari или Edge последней версии.';
    $('app').append(div);
    return;
  }
  const bar = $('load-bar'), text = $('load-text');
  const roomChip = $('room'), roomText = $('room-text'), progress = $('tour-progress');
  let walking = false, touring = false;
  const showRoom = (label, prog = null) => {
    roomChip.hidden = !label;
    roomText.textContent = label || '';
    progress.hidden = prog === null;
    if (prog !== null) progress.firstElementChild.style.width = `${Math.round(prog * 100)}%`;
  };
  const engine = await createEngine($('stage'), {
    villaModule, cyberModule, propsModule, quality, time, furniture,
    onProgress: (k, url) => {
      bar.style.width = `${Math.round(k * 100)}%`;
      text.textContent = url ? decodeURIComponent(url.split('/').pop()) : '';
    },
    onTour: (info) => {
      touring = info.state !== 'idle';
      $('tour').setAttribute('aria-pressed', String(touring));
      $('tour').textContent = info.state === 'playing' ? '⏸ Пауза' : info.state === 'paused' ? '▶ Дальше' : '🎬 Пролёт';
      $('tour-stop').hidden = !touring;
      if (touring) showRoom(info.state === 'paused' ? `${info.label || ''} · пауза, можно осмотреться` : info.label, info.progress);
      else if (!walking) showRoom('');
    },
    onWalk: (info) => {
      walking = info.active;
      $('walk').setAttribute('aria-pressed', String(walking));
      $('walk').textContent = walking ? '✕ Выйти из прогулки' : '🚶 Прогулка';
      $('cross').hidden = !walking || info.coarse;
      $('lockmsg').hidden = !walking || info.coarse || info.locked;
      const hint = $('walk-hint');
      hint.hidden = !walking;
      hint.innerHTML = info.coarse
        ? 'Слева — <b>джойстик</b>, справа — <b>смотреть</b> пальцем'
        : '<b>WASD</b> или стрелки — идти · <b>мышь</b> — смотреть · <b>Shift</b> — бег · <b>Esc</b> — отпустить мышь';
      if (!walking) showRoom('');
    },
    onRoom: (name) => { if (walking) showRoom(name); }
  }).catch((error) => {
    const div = document.createElement('div');
    div.className = 'error';
    div.textContent = `Не удалось открыть 3D-визуализацию: ${error.message || error}`;
    $('app').append(div);
    throw error;
  });
  $('loader').classList.add('done');
  setTimeout(() => $('loader').remove(), 700);

  const timeButtons = [...document.querySelectorAll('[data-time]')];
  const markTime = () => timeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.time === engine.state.time)));
  markTime();
  $('quality').value = engine.state.quality;
  const setFurniture = (on) => {
    engine.setFurniture(on);
    $('furniture').setAttribute('aria-pressed', String(on));
    $('furniture').textContent = on ? '🛋 Мебель и декор' : '🛋 Пустой дом';
    syncUrl(engine);
  };
  setFurniture(engine.state.furniture);
  $('furniture').addEventListener('click', () => setFurniture(!engine.state.furniture));
  for (const b of timeButtons) b.addEventListener('click', async () => { await engine.setTime(b.dataset.time); markTime(); syncUrl(engine); });
  for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => engine.setView(b.dataset.view));
  $('spin').addEventListener('click', () => {
    engine.setAutoRotate(!engine.autoRotate);
    $('spin').setAttribute('aria-pressed', String(engine.autoRotate));
  });
  $('walk').addEventListener('click', () => (engine.walk.active ? engine.walk.stop() : engine.walk.start()));
  $('tour').addEventListener('click', () => {
    const t = engine.tour;
    if (t.state === 'playing') t.pause(); else if (t.state === 'paused') t.resume(); else t.start();
  });
  $('tour-stop').addEventListener('click', () => engine.tour.stop());
  $('quality').addEventListener('change', (e) => { engine.setQuality(e.target.value); syncUrl(engine); });
  $('fullscreen').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  $('help-toggle').addEventListener('click', () => {
    const open = $('help').hidden;
    $('help').hidden = !open;
    $('help-toggle').setAttribute('aria-expanded', String(open));
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, select, textarea')) return;
    if (e.code === 'KeyF') setFurniture(!engine.state.furniture);
    else if (e.code === 'KeyT' && !walking) $('tour').click();
    else if (e.code === 'KeyP') $('walk').click();
    else if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) timeButtons[Number(e.code.slice(-1)) - 1].click();
  });
  if (params.get('mode') === 'tour') engine.tour.start();
  if (params.get('mode') === 'walk') { // захват мыши требует нажатия — подсказка до первого клика
    $('lockmsg').hidden = false;
    $('lockmsg').firstElementChild.textContent = 'Нажмите на сцену, чтобы начать прогулку';
    $('stage').addEventListener('click', () => { if (!engine.walk.active) engine.walk.start(); }, { once: true });
  }
  window.__engine = engine;
}

main();
