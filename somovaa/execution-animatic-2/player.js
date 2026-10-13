// Shared player: page provides window.renderAt(t) which draws into #view.
// ?render=1 → bare canvas + window.__renderFrame(t) returning a PNG data URL (used by render/capture.mjs).
function startPlayer(renderAt, canvas) {
  const qs = new URLSearchParams(location.search);
  if (qs.get('render') === '1') {
    document.body.innerHTML = ''; document.body.style.margin = '0'; document.body.appendChild(canvas);
    window.__renderFrame = t => { renderAt(t); return canvas.toDataURL('image/png'); };
    if (qs.get('frame')) renderAt(+qs.get('frame'));
    return;
  }
  const $ = id => document.getElementById(id);
  let T = 0, playing = false, speed = 1, last = performance.now(), showCap = true;
  const tl = $('timeline');
  SHOTS.forEach(s => { const d = document.createElement('div'); d.className = 'seg'; d.style.width = (s.dur / TOTAL * 100) + '%'; d.textContent = s.n; tl.insertBefore(d, $('playhead')); });
  const list = $('shots');
  SHOTS.forEach((s, i) => {
    const el = document.createElement('div'); el.className = 'shot';
    el.innerHTML = `<div class="head"><span class="num">#${s.n}</span><span class="title">${s.title}</span><span class="time">${s.start.toFixed(1)}–${(s.start + s.dur).toFixed(1)} с</span></div>
      <div class="grid"><div>Крупность</div><div>${s.frame}</div><div>Камера</div><div>${s.move}</div><div>Действие</div><div>${s.action}</div></div>`;
    el.onclick = () => { T = s.start + .001; setPlay(true); };
    list.appendChild(el);
  });
  function draw() {
    renderAt(T); const i = shotAt(T), s = SHOTS[i];
    $('capn').textContent = `#${s.n}  ${s.title}`; $('capd').textContent = `${s.frame} · ${s.move}`; $('capt').textContent = T.toFixed(2) + 's';
    $('cap').style.display = showCap ? 'block' : 'none';
    $('tc').textContent = `${T.toFixed(2)} / ${TOTAL.toFixed(2)}`; $('playhead').style.left = (T / TOTAL * 100) + '%';
    tl.querySelectorAll('.seg').forEach((el, j) => el.classList.toggle('cur', j === i));
    list.querySelectorAll('.shot').forEach((el, j) => el.classList.toggle('cur', j === i));
  }
  function frame(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; if (playing) { T += dt * speed; if (T >= TOTAL) T = 0; } draw(); requestAnimationFrame(frame); }
  const playBtn = $('play'); const setPlay = p => { playing = p; playBtn.textContent = p ? '❚❚ Pause' : '▶ Play'; };
  playBtn.onclick = () => setPlay(!playing);
  $('speed').onchange = e => speed = +e.target.value;
  $('bCap').onclick = e => { showCap = !showCap; e.target.classList.toggle('on', showCap); };
  const go = d => { T = SHOTS[(shotAt(T) + d + SHOTS.length) % SHOTS.length].start + .001; };
  $('prev').onclick = () => go(-1); $('next').onclick = () => go(1);
  document.addEventListener('keydown', e => { if (e.target.tagName === 'SELECT') return; if (e.code === 'Space') { e.preventDefault(); playBtn.click(); } if (e.code === 'ArrowRight') go(1); if (e.code === 'ArrowLeft') go(-1); });
  tl.addEventListener('pointerdown', e => { const r = tl.getBoundingClientRect(); T = Math.max(0, Math.min(.9999, (e.clientX - r.left) / r.width)) * TOTAL; });
  requestAnimationFrame(frame);
}
