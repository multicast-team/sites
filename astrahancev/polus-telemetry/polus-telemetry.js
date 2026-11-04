(function () {
  'use strict';

  const STORAGE_KEY = 'polus_telemetry_state_v1';
  const CHANNEL_NAME = 'polus_telemetry_channel_v1';
  const MAX_EVENTS = 400;
  const MAX_FPS_SAMPLES = 180; // 3 minutes of 1s buckets

  // Slavik & Anton call specifications:
  // - Offer schedule: first at 60s active play, visible for 10s, cooldown 20s after miss/skip, or 60s cadence after reward
  // - Target benchmarks: Playtime D0 >= 30-35 min, R1 >= 25-30%, reward_show ~ 1 per 5-7 min (5-7 per 35m session), FPS >= 60 (1% low >= 30-50 on mobile)
  const RV_FIRST_SEC = 60;
  const RV_DURATION_SEC = 10;
  const RV_RETRY_GAP_SEC = 20;
  const RV_REWARD_GAP_SEC = 60;
  const RV_WATCH_SIM_SEC = 5; // Simulated rewarded video duration in test mode

  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  function defaultState() {
    return {
      sessionId: 'sess_' + Date.now().toString(36),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      activeSec: 0,
      idleSec: 0,
      adTimeSec: 0,
      bootTimeMs: null,
      readyActors: 0,
      readyTrees: 0,
      fps: {
        current: 60,
        avg: 60,
        low1: 60,
        worstMs: 16.7,
        p99Ms: 16.7,
        samples: [] // {t, fps, low1, worstMs}
      },
      input: {
        clicks: 0,
        swings: 0,
        keyPresses: 0,
        wheelSteps: 0,
        distanceWalkedEst: 0,
        lastSlot: '1'
      },
      gameplay: {
        woodStrikes: 0,
        woodVolumeChippedL: 0,
        treesFelled: 0,
        branchesCut: 0,
        logsBucked: 0,
        logsSplit: 0,
        stoneChunks: 0,
        stoneVolumeL: 0,
        stonesThrown: 0,
        soilScoops: 0,
        berriesPicked: 0,
        berriesEaten: 0,
        buildsPlaced: 0,
        builtVolumeM3: 0,
        lootPicked: 0,
        lootKg: 0,
        liquidScoopsL: 0,
        noEffectHits: 0
      },
      rpm: {
        woodLPerMin: 0,
        stoneLPerMin: 0,
        berriesPerMin: 0,
        actionsPerMin: 0,
        totalValueScore: 0,
        valuePerMin: 0,
        reward5MinEquivText: '2.5 л древесины + 1.5 л камня + 6 ягод'
      },
      rv: {
        enabled: true,
        cadenceMode: 'call_60_10_20', // 60s start, 10s show, 20s cooldown
        state: 'waiting_first', // waiting_first | offered | watching | cooldown
        timerSec: RV_FIRST_SEC,
        offersShown: 0,
        offersAccepted: 0,
        offersSkipped: 0,
        offersExpired: 0,
        rewardsCompleted: 0,
        estEcpmUsd: 18.0,
        estRevenueUsd: 0.0,
        currentOffer: null
      },
      funnel: {
        page_loaded: true,
        engine_ready: false,
        first_input: false,
        first_strike: false,
        first_tree_felled: false,
        first_stone_or_loot: false,
        first_build: false,
        first_rv_offered: false,
        first_rv_watched: false
      },
      sdkSim: {
        adjustEvents: 0,
        appMetricaEvents: 0,
        applovinImpressions: 0,
        fbAdImpressions: 0
      },
      events: [] // {id, ts, sec, cat, name, detail, data}
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.sessionId) {
          return Object.assign(defaultState(), parsed);
        }
      }
    } catch (e) {}
    return defaultState();
  }

  function saveState() {
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
    if (bc) {
      try {
        bc.postMessage({ type: 'state_update', state: state });
      } catch (e) {}
    }
  }

  function logEvent(cat, name, detail, data) {
    const ev = {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      ts: new Date().toISOString().slice(11, 19),
      sec: Math.round(state.activeSec),
      cat: cat, // 'engine' | 'gameplay' | 'rv' | 'sdk' | 'perf'
      name: name,
      detail: detail || '',
      data: data || {}
    };
    state.events.unshift(ev);
    if (state.events.length > MAX_EVENTS) {
      state.events.length = MAX_EVENTS;
    }
    state.sdkSim.appMetricaEvents++;
    if (cat === 'rv' || cat === 'sdk' || name.startsWith('first_')) {
      state.sdkSim.adjustEvents++;
    }
    updateUI();
    saveState();
  }

  function unlockFunnel(stepKey, label) {
    if (!state.funnel[stepKey]) {
      state.funnel[stepKey] = true;
      logEvent('sdk', 'funnel_' + stepKey, 'Воронка: ' + label, { step: stepKey });
    }
  }

  // Parse Godot stdout lines from onPrint & console.log
  function handleEngineLine(rawLine) {
    if (!rawLine || typeof rawLine !== 'string') return;
    const line = rawLine.trim();
    if (!line) return;

    // 1. Engine Ready
    if (line.includes('POLUS_READY')) {
      const m = line.match(/actors=(\d+)\s+trees=(\d+)\s+t=(\d+)\s*ms/);
      if (m) {
        state.readyActors = parseInt(m[1], 10);
        state.readyTrees = parseInt(m[2], 10);
        state.bootTimeMs = parseInt(m[3], 10);
      }
      unlockFunnel('engine_ready', 'Мир POLUS загружен');
      logEvent('engine', 'POLUS_READY', line);
      return;
    }

    // 2. Wood strike: CHOP_STRIKE id=12 h=1.05 dir=-45 gain_mm=18.2 dv=0.3120L total=1.4200L stress=0.35 stump=0.80
    if (line.startsWith('CHOP_STRIKE')) {
      state.gameplay.woodStrikes++;
      const dvMatch = line.match(/dv=([\d.]+)L/);
      const gainMatch = line.match(/gain_mm=([\d.]+)/);
      const stressMatch = line.match(/stress=([\d.]+)/);
      const dv = dvMatch ? parseFloat(dvMatch[1]) : 0;
      state.gameplay.woodVolumeChippedL = +(state.gameplay.woodVolumeChippedL + dv).toFixed(4);
      unlockFunnel('first_strike', 'Первый результативный удар по дереву');
      logEvent('gameplay', 'chop_strike', `Удар по стволу: +${dv.toFixed(3)} л щепы (${gainMatch ? gainMatch[1] : '?'} мм, напр. ${stressMatch ? stressMatch[1] : '0'})`, { dv });
      recalcRpm();
      return;
    }

    // 3. Tree felled: TREE_FELLED id=12 pine dir=90 lean_dir=88 D=34cm
    if (line.startsWith('TREE_FELLED')) {
      state.gameplay.treesFelled++;
      unlockFunnel('first_tree_felled', 'Первое поваленное дерево');
      logEvent('gameplay', 'tree_felled', `Дерево повалено! (${line.replace('TREE_FELLED ', '')})`);
      recalcRpm();
      return;
    }

    // 4. Branch blow: BRANCH_BLOW tree=12 branch=3 dv=0.0004500 m3 severed=true by=1
    if (line.startsWith('BRANCH_BLOW')) {
      if (line.includes('severed=true')) {
        state.gameplay.branchesCut++;
      }
      logEvent('gameplay', 'branch_blow', line.replace('BRANCH_BLOW ', ''));
      recalcRpm();
      return;
    }

    // 5. Buck / Log split
    if (line.startsWith('BUCK ')) {
      state.gameplay.logsBucked++;
      logEvent('gameplay', 'log_buck', line.slice(0, 90));
      recalcRpm();
      return;
    }
    if (line.startsWith('LOG_SPLIT ')) {
      state.gameplay.logsSplit++;
      logEvent('gameplay', 'log_split', line.slice(0, 90));
      recalcRpm();
      return;
    }

    // 6. Stone chunk / hold / throw
    if (line.startsWith('STONE_CHUNK')) {
      state.gameplay.stoneChunks++;
      const volM = line.match(/vol=([\d.]+)\s*L/);
      const kindM = line.match(/kind=(\w+)/);
      const v = volM ? parseFloat(volM[1]) : 0;
      state.gameplay.stoneVolumeL = +(state.gameplay.stoneVolumeL + v).toFixed(3);
      unlockFunnel('first_stone_or_loot', 'Добыт первый кусок камня / ресурс');
      logEvent('gameplay', 'stone_chunk', `Откалывание камня (${kindM ? kindM[1] : 'rock'}): ${v.toFixed(2)} л`, { v });
      recalcRpm();
      return;
    }
    if (line.startsWith('CARRY_THROW')) {
      state.gameplay.stonesThrown++;
      logEvent('gameplay', 'carry_throw', line.replace('CARRY_THROW ', ''));
      return;
    }

    // 7. Loot pick
    if (line.startsWith('LOOT_PICK')) {
      state.gameplay.lootPicked++;
      const massM = line.match(/mass=([\d.]+)\s*kg/);
      const kg = massM ? parseFloat(massM[1]) : 0;
      state.gameplay.lootKg = +(state.gameplay.lootKg + kg).toFixed(2);
      unlockFunnel('first_stone_or_loot', 'Подобран первый предмет в мире');
      logEvent('gameplay', 'loot_pick', `Подобран ресурс (${kg.toFixed(2)} кг): ${line.replace('LOOT_PICK ', '').slice(0, 65)}`);
      recalcRpm();
      return;
    }

    // 8. Berries picked / eaten
    if (line.startsWith('BERRIES_PICKED')) {
      const cM = line.match(/count=(\d+)/);
      const c = cM ? parseInt(cM[1], 10) : 6;
      state.gameplay.berriesPicked += c;
      unlockFunnel('first_stone_or_loot', 'Собраны ягоды с куста');
      logEvent('gameplay', 'berries_picked', `Собрано ягод: +${c} шт.`);
      recalcRpm();
      return;
    }
    if (line.startsWith('BERRIES_EATEN')) {
      const cM = line.match(/count=(\d+)/);
      const c = cM ? parseInt(cM[1], 10) : 6;
      state.gameplay.berriesEaten += c;
      logEvent('gameplay', 'berries_eaten', `Съедено ягод: ${c} шт.`);
      return;
    }

    // 9. Build placed
    if (line.startsWith('BUILD ')) {
      state.gameplay.buildsPlaced++;
      const bM = line.match(/built=([\d.]+)\s*m3/);
      const b = bM ? parseFloat(bM[1]) : 0;
      state.gameplay.builtVolumeM3 = +(state.gameplay.builtVolumeM3 + b).toFixed(4);
      unlockFunnel('first_build', 'Первая постройка в мире');
      logEvent('gameplay', 'build_placed', `Построена деталь (${b.toFixed(4)} м³): ${line.slice(0, 75)}`);
      recalcRpm();
      return;
    }

    // 10. Liquid scoop / pour
    if (line.startsWith('LIQUID_SCOOP') || line.startsWith('LIQUID_POUR')) {
      const lM = line.match(/(\d+)\s*L/);
      if (line.startsWith('LIQUID_SCOOP') && lM) {
        state.gameplay.liquidScoopsL += parseInt(lM[1], 10);
      }
      logEvent('gameplay', 'liquid_action', line);
      return;
    }

    // 11. No effect strike (diagnostic)
    if (line.startsWith('CHOP_NOEFFECT')) {
      state.gameplay.noEffectHits++;
      logEvent('engine', 'chop_noeffect', line.replace('CHOP_NOEFFECT ', ''));
      return;
    }
  }

  // Intercept console.log to catch Godot prints even if EngineConfig.onPrint isn't overridden
  const origConsoleLog = console.log;
  console.log = function () {
    origConsoleLog.apply(console, arguments);
    try {
      const joined = Array.prototype.slice.call(arguments).join(' ');
      handleEngineLine(joined);
    } catch (e) {}
  };

  function recalcRpm() {
    const mins = Math.max(state.activeSec / 60, 0.25); // avoid huge spikes in first 15s
    const g = state.gameplay;
    state.rpm.woodLPerMin = +(g.woodVolumeChippedL / mins).toFixed(2);
    state.rpm.stoneLPerMin = +(g.stoneVolumeL / mins).toFixed(2);
    state.rpm.berriesPerMin = +(g.berriesPicked / mins).toFixed(1);
    const totalActions = g.woodStrikes + g.treesFelled * 5 + g.stoneChunks * 2 + g.lootPicked + g.berriesPicked + g.buildsPlaced * 5;
    state.rpm.actionsPerMin = +(totalActions / mins).toFixed(1);

    // Composite value score (wood L * 10 + felled * 50 + stone L * 15 + berries * 5 + lootKg * 8 + builds * 80)
    const score = g.woodVolumeChippedL * 10 + g.treesFelled * 50 + g.stoneVolumeL * 15 + g.berriesPicked * 5 + g.lootKg * 8 + g.buildsPlaced * 80;
    state.rpm.totalValueScore = Math.round(score);
    state.rpm.valuePerMin = +(score / mins).toFixed(1);

    // 5-minute RPM reward package (Anton & Slavik formula: 5 min of player's RPM, with sensible floor)
    const rWood = Math.max(2.5, +(state.rpm.woodLPerMin * 5).toFixed(1));
    const rStone = Math.max(1.5, +(state.rpm.stoneLPerMin * 5).toFixed(1));
    const rBerries = Math.max(6, Math.round(state.rpm.berriesPerMin * 5));
    state.rpm.reward5MinEquivText = `${rWood} л отборной древесины + ${rStone} л камня + ${rBerries} ягод (×2 темп рубки на 60с)`;
  }

  // --- FPS & Frame Timing Tracker (1% low, worst frame ms, p99 ms) ---
  let frameDeltas = [];
  let lastFrameTs = performance.now();
  let lastUserActivityTs = performance.now();

  function onAnimationFrame(now) {
    const dt = now - lastFrameTs;
    lastFrameTs = now;
    if (dt > 0 && dt < 2000) {
      frameDeltas.push(dt);
    }
    requestAnimationFrame(onAnimationFrame);
  }
  requestAnimationFrame(onAnimationFrame);

  // Input listeners for telemetry
  window.addEventListener('pointerdown', function (e) {
    if (e.target && e.target.closest && e.target.closest('#polus-telemetry-root')) return;
    lastUserActivityTs = performance.now();
    state.input.clicks++;
    if (e.button === 0) state.input.swings++;
    unlockFunnel('first_input', 'Первый клик / захват управления');
  }, true);

  window.addEventListener('keydown', function (e) {
    if (e.target && e.target.closest && e.target.closest('#polus-telemetry-root')) return;
    lastUserActivityTs = performance.now();
    if (!e.repeat) {
      state.input.keyPresses++;
      if (/^Digit[0-9]$/.test(e.code)) {
        state.input.lastSlot = e.code.replace('Digit', '');
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        state.input.distanceWalkedEst = +(state.input.distanceWalkedEst + 0.35).toFixed(1);
      }
    }
    if (e.code === 'F8') {
      e.preventDefault();
      toggleHudPanel();
    }
  }, true);

  window.addEventListener('wheel', function () {
    lastUserActivityTs = performance.now();
    state.input.wheelSteps++;
  }, { capture: true, passive: true });

  // --- Rewarded Offer (RV) State Machine (Slavik & Anton Formula) ---
  // No interstitials, no banners! Only Rewarded offers:
  // Starts at 60s, stays on shelf for 10s, cooldown 20s if ignored, or 60s after watched.
  function tickRvMachine() {
    const rv = state.rv;
    if (!rv.enabled) return;

    if (rv.state === 'watching') {
      state.adTimeSec += 1;
      rv.timerSec -= 1;
      if (rv.timerSec <= 0) {
        completeRewardedAd();
      }
      return;
    }

    rv.timerSec -= 1;
    if (rv.timerSec > 0) return;

    if (rv.state === 'waiting_first' || rv.state === 'cooldown') {
      triggerRewardedOffer(false);
    } else if (rv.state === 'offered') {
      // Offer expired after 10s
      rv.offersExpired++;
      rv.state = 'cooldown';
      rv.timerSec = RV_RETRY_GAP_SEC;
      rv.currentOffer = null;
      logEvent('rv', 'rv_offer_expired', `Оффер истёк (10с без клика) → пауза ${RV_RETRY_GAP_SEC}с`);
    }
  }

  function triggerRewardedOffer(manual) {
    const rv = state.rv;
    recalcRpm();
    rv.offersShown++;
    rv.state = 'offered';
    rv.timerSec = RV_DURATION_SEC;
    rv.currentOffer = {
      id: 'rv_' + rv.offersShown,
      title: 'Дар Поляны (5 мин RPM)',
      rewardText: state.rpm.reward5MinEquivText,
      manual: !!manual
    };
    unlockFunnel('first_rv_offered', 'Показан первый Rewarded-оффер (1 мин)');
    logEvent('rv', 'rv_offer_shown', `Показан оффер #${rv.offersShown} на 10с: ${state.rpm.reward5MinEquivText}`, rv.currentOffer);
    updateUI();
    saveState();
  }

  function acceptRewardedOffer() {
    const rv = state.rv;
    if (rv.state !== 'offered') {
      triggerRewardedOffer(true);
    }
    rv.offersAccepted++;
    rv.state = 'watching';
    rv.timerSec = RV_WATCH_SIM_SEC;
    logEvent('rv', 'rv_watch_start', `Игрок нажал «Смотреть ролик» (симуляция MAX SDK ${RV_WATCH_SIM_SEC}с)`);
    updateUI();
    saveState();
  }

  function skipRewardedOffer() {
    const rv = state.rv;
    if (rv.state !== 'offered') return;
    rv.offersSkipped++;
    rv.state = 'cooldown';
    rv.timerSec = RV_RETRY_GAP_SEC;
    rv.currentOffer = null;
    logEvent('rv', 'rv_offer_skipped', `Оффер закрыт игроком → повтор через ${RV_RETRY_GAP_SEC}с`);
    updateUI();
    saveState();
  }

  function completeRewardedAd() {
    const rv = state.rv;
    rv.rewardsCompleted++;
    const revDelta = +(rv.estEcpmUsd / 1000).toFixed(4);
    rv.estRevenueUsd = +(rv.estRevenueUsd + revDelta).toFixed(4);
    state.sdkSim.applovinImpressions++;
    state.sdkSim.fbAdImpressions++;
    state.sdkSim.adjustEvents += 2; // AdImpression + reward_completed
    rv.state = 'cooldown';
    rv.timerSec = RV_REWARD_GAP_SEC;
    const rewardGiven = rv.currentOffer ? rv.currentOffer.rewardText : state.rpm.reward5MinEquivText;
    rv.currentOffer = null;
    unlockFunnel('first_rv_watched', 'Первый просмотренный Rewarded-ролик (AdROAS event)');
    logEvent('sdk', 'AD_IMPRESSION', `MAX SDK AdImpression → Adjust / AppLovin / Meta (+$${revDelta.toFixed(3)}, награда: ${rewardGiven})`, {
      network: 'AppLovin MAX',
      ad_unit: 'rewarded_shelf_5min_rpm',
      revenue: revDelta,
      currency: 'USD'
    });
    updateUI();
    saveState();
  }

  // 1-second heartbeat loop
  setInterval(function () {
    const now = performance.now();
    const isVisible = !document.hidden;
    const isActive = isVisible && (now - lastUserActivityTs < 30000);

    if (isActive || state.rv.state === 'watching') {
      state.activeSec += 1;
    } else {
      state.idleSec += 1;
    }

    // Compute FPS metrics over the last second + rolling window
    if (frameDeltas.length > 0) {
      const count = frameDeltas.length;
      const sumMs = frameDeltas.reduce((a, b) => a + b, 0);
      const instFps = Math.round((count * 1000) / Math.max(sumMs, 1));
      const sorted = frameDeltas.slice().sort((a, b) => a - b);
      const worstMs = +sorted[sorted.length - 1].toFixed(1);
      const p99Ms = +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))].toFixed(1);
      const low1Fps = Math.round(1000 / Math.max(p99Ms, 1));

      state.fps.current = instFps;
      state.fps.worstMs = worstMs;
      state.fps.p99Ms = p99Ms;
      state.fps.low1 = low1Fps;
      state.fps.samples.push({
        t: Math.round(state.activeSec),
        fps: instFps,
        low1: low1Fps,
        worstMs: worstMs
      });
      if (state.fps.samples.length > MAX_FPS_SAMPLES) {
        state.fps.samples.shift();
      }
      const avgSum = state.fps.samples.reduce((acc, s) => acc + s.fps, 0);
      state.fps.avg = Math.round(avgSum / state.fps.samples.length);
      frameDeltas = [];
    }

    recalcRpm();
    tickRvMachine();
    updateUI();
    saveState();
  }, 1000);

  // --- Inject Overlay UI (Non-intrusive Top-Right Pill + Expandable Drawer + RV Shelf Offer) ---
  let rootEl = null;
  let pillEl = null;
  let drawerEl = null;
  let rvToastEl = null;
  let drawerOpen = false;

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }

  function createOverlayUI() {
    if (document.getElementById('polus-telemetry-root')) return;

    const style = document.createElement('style');
    style.textContent = `
      #polus-telemetry-root {
        position: fixed;
        top: 0;
        left: 0;
        width: 0;
        height: 0;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
        user-select: none;
        pointer-events: none;
      }
      .pt-pill {
        position: fixed;
        top: 10px;
        right: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(14, 18, 15, 0.88);
        border: 1px solid rgba(110, 160, 115, 0.45);
        border-radius: 999px;
        padding: 6px 14px;
        color: #eef5ee;
        font-size: 12.5px;
        font-weight: 600;
        box-shadow: 0 4px 16px rgba(0,0,0,0.45);
        backdrop-filter: blur(8px);
        pointer-events: auto;
        cursor: pointer;
        transition: border-color 0.15s, transform 0.15s;
      }
      .pt-pill:hover {
        border-color: #7cd982;
        transform: translateY(-1px);
      }
      .pt-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4ade80;
        box-shadow: 0 0 8px #4ade80;
      }
      .pt-badge {
        background: rgba(255,255,255,0.1);
        padding: 2px 7px;
        border-radius: 6px;
        font-variant-numeric: tabular-nums;
      }
      .pt-btn-dash {
        background: #2563eb;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
      }
      .pt-btn-dash:hover {
        background: #3b82f6;
      }
      /* Rewarded Offer Shelf (Slavik 1-min / 10s / 20s rule) */
      .pt-rv-shelf {
        position: fixed;
        top: 52px;
        right: 12px;
        width: 310px;
        background: linear-gradient(145deg, rgba(24, 34, 25, 0.95), rgba(15, 22, 16, 0.96));
        border: 1.5px solid #f59e0b;
        border-radius: 12px;
        padding: 12px 14px;
        color: #f8fafc;
        box-shadow: 0 8px 28px rgba(0,0,0,0.6), 0 0 18px rgba(245, 158, 11, 0.22);
        pointer-events: auto;
        display: none;
        animation: ptSlideIn 0.22s ease-out;
      }
      @keyframes ptSlideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .pt-rv-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        font-weight: 700;
        color: #fbbf24;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 6px;
      }
      .pt-rv-body {
        font-size: 12.5px;
        color: #e2e8f0;
        line-height: 1.35;
        margin-bottom: 10px;
      }
      .pt-rv-actions {
        display: flex;
        gap: 8px;
      }
      .pt-rv-watch {
        flex: 1;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #111827;
        border: none;
        border-radius: 8px;
        padding: 7px 10px;
        font-weight: 800;
        font-size: 12.5px;
        cursor: pointer;
      }
      .pt-rv-watch:hover {
        filter: brightness(1.08);
      }
      .pt-rv-skip {
        background: rgba(255,255,255,0.08);
        color: #94a3b8;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      /* Expandable Live Drawer */
      .pt-drawer {
        position: fixed;
        top: 52px;
        right: 12px;
        width: 375px;
        max-height: calc(100vh - 70px);
        overflow-y: auto;
        background: rgba(13, 17, 15, 0.94);
        border: 1px solid rgba(110, 160, 115, 0.4);
        border-radius: 12px;
        padding: 14px;
        color: #e2e8f0;
        font-size: 12px;
        box-shadow: 0 12px 36px rgba(0,0,0,0.65);
        backdrop-filter: blur(10px);
        pointer-events: auto;
        display: none;
      }
      .pt-drawer h4 {
        margin: 0 0 8px 0;
        font-size: 12.5px;
        color: #86efac;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        padding-bottom: 4px;
      }
      .pt-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-bottom: 12px;
      }
      .pt-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 8px;
        padding: 7px 9px;
      }
      .pt-card-label {
        font-size: 10.5px;
        color: #94a3b8;
      }
      .pt-card-val {
        font-size: 14px;
        font-weight: 700;
        color: #f8fafc;
        margin-top: 2px;
        font-variant-numeric: tabular-nums;
      }
      .pt-log {
        max-height: 150px;
        overflow-y: auto;
        background: rgba(0,0,0,0.35);
        border-radius: 6px;
        padding: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
      }
      .pt-log-row {
        padding: 2px 0;
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      .pt-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
      }
      .pt-ctrl-btn {
        background: rgba(255,255,255,0.09);
        color: #e2e8f0;
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 6px;
        padding: 5px 8px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      }
      .pt-ctrl-btn:hover {
        background: rgba(255,255,255,0.16);
      }
    `;
    document.head.appendChild(style);

    rootEl = document.createElement('div');
    rootEl.id = 'polus-telemetry-root';

    pillEl = document.createElement('div');
    pillEl.className = 'pt-pill';
    pillEl.title = 'Кликни (или F8), чтобы открыть живую панель метрик и рекламы';
    pillEl.innerHTML = `
      <span class="pt-dot" id="pt-fps-dot"></span>
      <span class="pt-badge" id="pt-pill-fps">60 FPS (1% 60)</span>
      <span class="pt-badge" id="pt-pill-time">00:00</span>
      <span class="pt-badge" id="pt-pill-rv">RV: 0/0 (60с)</span>
      <a class="pt-btn-dash" href="dashboard.html" target="_blank" id="pt-open-dash">Дашборд ↗</a>
    `;
    pillEl.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'pt-open-dash') return;
      toggleHudPanel();
    });

    rvToastEl = document.createElement('div');
    rvToastEl.className = 'pt-rv-shelf';
    rvToastEl.innerHTML = `
      <div class="pt-rv-header">
        <span>⚡ Rewarded-оффер (Полочка)</span>
        <span id="pt-rv-countdown">10с</span>
      </div>
      <div class="pt-rv-body" id="pt-rv-desc">
        Награда (5 мин RPM): 2.5 л древесины + 1.5 л камня + 6 ягод
      </div>
      <div class="pt-rv-actions">
        <button class="pt-rv-watch" id="pt-rv-btn-watch">🎬 Забрать за ролик</button>
        <button class="pt-rv-skip" id="pt-rv-btn-skip">Пропуск</button>
      </div>
    `;

    drawerEl = document.createElement('div');
    drawerEl.className = 'pt-drawer';
    drawerEl.innerHTML = `
      <h4>📊 Метрики сессии & AdROAS (F8)</h4>
      <div class="pt-controls">
        <button class="pt-ctrl-btn" id="pt-act-force-rv">⚡ Вызвать RV-оффер</button>
        <button class="pt-ctrl-btn" id="pt-act-sim-rv">🎬 Засчитать просмотр RV</button>
        <button class="pt-ctrl-btn" id="pt-act-toggle-rv">🔔 Авто-офферы: ВКЛ</button>
        <button class="pt-ctrl-btn" id="pt-act-reset">🗑️ Сброс</button>
      </div>
      <div class="pt-grid">
        <div class="pt-card">
          <div class="pt-card-label">Playtime D0 (акт / ад)</div>
          <div class="pt-card-val" id="pt-d-playtime">00:00</div>
        </div>
        <div class="pt-card">
          <div class="pt-card-label">FPS / 1% Low / Worst</div>
          <div class="pt-card-val" id="pt-d-fps">60 / 60 / 16мс</div>
        </div>
        <div class="pt-card">
          <div class="pt-card-label">Rewarded (Показ / Просм)</div>
          <div class="pt-card-val" id="pt-d-rv">0 / 0 ($0.000)</div>
        </div>
        <div class="pt-card">
          <div class="pt-card-label">Симулятор RPM (в мин)</div>
          <div class="pt-card-val" id="pt-d-rpm">0.0 ед/мин</div>
        </div>
        <div class="pt-card">
          <div class="pt-card-label">Дерево (удары / повалено)</div>
          <div class="pt-card-val" id="pt-d-wood">0 уд / 0 дер</div>
        </div>
        <div class="pt-card">
          <div class="pt-card-label">Камень / Ягоды / Стройка</div>
          <div class="pt-card-val" id="pt-d-other">0 к / 0 яг / 0 стр</div>
        </div>
      </div>
      <h4>📡 Последние события (Adjust / AppMetrica / Godot)</h4>
      <div class="pt-log" id="pt-d-log"></div>
    `;

    rootEl.appendChild(pillEl);
    rootEl.appendChild(rvToastEl);
    rootEl.appendChild(drawerEl);
    document.body.appendChild(rootEl);

    document.getElementById('pt-rv-btn-watch').addEventListener('click', function (e) {
      e.stopPropagation();
      acceptRewardedOffer();
    });
    document.getElementById('pt-rv-btn-skip').addEventListener('click', function (e) {
      e.stopPropagation();
      skipRewardedOffer();
    });
    document.getElementById('pt-act-force-rv').addEventListener('click', function () {
      triggerRewardedOffer(true);
    });
    document.getElementById('pt-act-sim-rv').addEventListener('click', function () {
      acceptRewardedOffer();
    });
    document.getElementById('pt-act-toggle-rv').addEventListener('click', function () {
      state.rv.enabled = !state.rv.enabled;
      this.textContent = state.rv.enabled ? '🔔 Авто-офферы: ВКЛ' : '🔕 Авто-офферы: ВЫКЛ';
      saveState();
      updateUI();
    });
    document.getElementById('pt-act-reset').addEventListener('click', function () {
      state = defaultState();
      logEvent('engine', 'session_reset', 'Метрики сессии сброшены вручную');
      saveState();
      updateUI();
    });

    updateUI();
  }

  function toggleHudPanel() {
    drawerOpen = !drawerOpen;
    if (drawerEl) {
      drawerEl.style.display = drawerOpen ? 'block' : 'none';
    }
    updateUI();
  }

  function updateUI() {
    if (!pillEl) return;
    const f = state.fps;
    const rv = state.rv;
    const g = state.gameplay;

    const dot = document.getElementById('pt-fps-dot');
    if (dot) {
      const col = f.current >= 50 ? '#4ade80' : (f.current >= 30 ? '#facc15' : '#f87171');
      dot.style.background = col;
      dot.style.boxShadow = '0 0 8px ' + col;
    }

    const fpsEl = document.getElementById('pt-pill-fps');
    if (fpsEl) fpsEl.textContent = `${f.current} FPS (1% ${f.low1})`;

    const timeEl = document.getElementById('pt-pill-time');
    if (timeEl) timeEl.textContent = `⏱ ${formatTime(state.activeSec)}`;

    const rvEl = document.getElementById('pt-pill-rv');
    if (rvEl) {
      const stLabel = rv.state === 'offered' ? `ОФФЕР ${rv.timerSec}с!` :
                      rv.state === 'watching' ? `РОЛИК ${rv.timerSec}с` :
                      `${rv.timerSec}с`;
      rvEl.textContent = `🎬 RV: ${rv.rewardsCompleted}/${rv.offersShown} (${stLabel})`;
    }

    // RV Shelf visibility
    if (rvToastEl) {
      if (rv.state === 'offered' || rv.state === 'watching') {
        rvToastEl.style.display = 'block';
        if (drawerOpen && drawerEl) {
          drawerEl.style.top = '185px';
        }
        const cd = document.getElementById('pt-rv-countdown');
        const desc = document.getElementById('pt-rv-desc');
        const btnW = document.getElementById('pt-rv-btn-watch');
        if (rv.state === 'watching') {
          if (cd) cd.textContent = `Идёт показ: ${rv.timerSec}с`;
          if (desc) desc.textContent = `Воспроизведение Rewarded Video (AppLovin MAX SDK)...`;
          if (btnW) btnW.textContent = `⏳ Смотрим (${rv.timerSec}с)...`;
        } else {
          if (cd) cd.textContent = `Осталось ${rv.timerSec}с`;
          if (desc) desc.textContent = `Награда (5 мин RPM): ${rv.currentOffer ? rv.currentOffer.rewardText : state.rpm.reward5MinEquivText}`;
          if (btnW) btnW.textContent = `🎬 Забрать за ролик (+5 мин RPM)`;
        }
      } else {
        rvToastEl.style.display = 'none';
        if (drawerEl) drawerEl.style.top = '52px';
      }
    }

    if (drawerOpen) {
      const dPlay = document.getElementById('pt-d-playtime');
      if (dPlay) dPlay.textContent = `${formatTime(state.activeSec)} (ад: ${state.adTimeSec}с)`;
      const dFps = document.getElementById('pt-d-fps');
      if (dFps) dFps.textContent = `${f.current} / ${f.low1} / ${f.worstMs}мс`;
      const dRv = document.getElementById('pt-d-rv');
      if (dRv) dRv.textContent = `${rv.offersShown} / ${rv.rewardsCompleted} ($${rv.estRevenueUsd.toFixed(3)})`;
      const dRpm = document.getElementById('pt-d-rpm');
      if (dRpm) dRpm.textContent = `${state.rpm.valuePerMin} очк/м (${state.rpm.woodLPerMin}л дер/м)`;
      const dWood = document.getElementById('pt-d-wood');
      if (dWood) dWood.textContent = `${g.woodStrikes} уд (${g.woodVolumeChippedL.toFixed(1)}л) / ${g.treesFelled} дер`;
      const dOther = document.getElementById('pt-d-other');
      if (dOther) dOther.textContent = `${g.stoneChunks} кам / ${g.berriesPicked} яг / ${g.buildsPlaced} стр`;

      const logBox = document.getElementById('pt-d-log');
      if (logBox) {
        logBox.innerHTML = state.events.slice(0, 18).map(ev =>
          `<div class="pt-log-row"><span style="color:#64748b">[${ev.ts}]</span> <b style="color:#93c5fd">${ev.name}</b>: ${ev.detail}</div>`
        ).join('');
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createOverlayUI);
  } else {
    createOverlayUI();
  }

  logEvent('engine', 'telemetry_init', 'Телеметрия POLUS + симулятор RPM/Rewarded запущены');

  window.__polusTelemetry = {
    getState: () => state,
    triggerOffer: () => triggerRewardedOffer(true),
    watchOffer: () => acceptRewardedOffer(),
    skipOffer: () => skipRewardedOffer(),
    reset: () => {
      state = defaultState();
      saveState();
      updateUI();
    }
  };
})();
