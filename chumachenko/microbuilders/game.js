(function () {
  const MB = MicroBuilders;
  const Meta = MicroBuildersMeta;
  const Features = MicroBuilderFeatures;
  const view = document.getElementById('view');
  const mobileRendering = new URLSearchParams(window.location.search).get('render') === 'mobile';
  const renderer = new THREE.WebGLRenderer({ canvas: view, antialias: !mobileRendering });
  // The framed desktop preview is CSS-scaled, so render at the scaled resolution to stay sharp.
  function renderPixelRatio() {
    return mobileRendering ? 1 : Math.min(3, window.devicePixelRatio * MicroBuildersStage.scale());
  }
  renderer.setPixelRatio(renderPixelRatio());
  renderer.setSize(MicroBuildersStage.width(), MicroBuildersStage.height());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xb7cfe0, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb7cfe0, 36, 120);
  const clock = new THREE.Clock();
  const dummy = new THREE.Object3D();
  const vehicleUp = new THREE.Vector3(0, 1, 0);
  const levelRoot = new THREE.Group();
  let yardRoot = null;
  let elevatorRoot = null;
  scene.add(levelRoot);
  // Blue preview of every pattern being assembled in a yard: the slots drones have not filled yet.
  const patternGhosts = new THREE.Group();
  scene.add(patternGhosts);
  const patternGhostGeometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
  const patternGhostEdges = new THREE.EdgesGeometry(patternGhostGeometry);
  const patternGhostFill = new THREE.MeshBasicMaterial({ color: 0x3d8bff, transparent: true, opacity: 0.3, depthWrite: false });
  const patternGhostLine = new THREE.LineBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0.85 });
  let patternGhostSignature = '';
  // Carried cubes: one unit box scaled per slot (the size depends on the material grid only).
  const carryGeometry = new THREE.BoxGeometry(1, 1, 1);
  const CARRY_SLOTS = 6;
  const cityRoot = new THREE.Group();
  cityRoot.visible = false;
  scene.add(cityRoot);
  const cityRecords = new Map();
  const cityDecor = {};
  // The quarter (docs/gdd/16-ux-flow.md §8): a boulevard from the camera (+z) into −z, lots in two
  // columns (Meta.CITY row/col) with every facade facing the camera, the expansion zone at the far end.
  const CITY_LOT = { width: 10, depth: 8 };
  const CITY_GRID = { colX: 7.4, rowPitch: 12.5 };
  const CITY_AVENUE = { width: 3.2, walk: 0.8, near: 11 };
  const CITY_ZONE_ROW = 4;
  // Camera box of the whole quarter (setMode('city')): the pivot rides the avenue and may slide over a lot.
  const CITY_CAMERA = {
    mode: 'city',
    key: 'city:boulevard',
    minX: -12.6, maxX: 12.6, minZ: -55.1, maxZ: 6.5, topY: 5.5,
    rail: { from: { x: 0, z: 6 }, to: { x: 0, z: -50.5 }, halfWidth: 7.6 },
  };
  const cityMat = {
    asphalt: new THREE.MeshStandardMaterial({ color: 0x3d4146, roughness: 0.95 }),
    walk: new THREE.MeshStandardMaterial({ color: 0xc9bfae, roughness: 0.95 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xa69e90, roughness: 0.9 }),
    lane: new THREE.MeshBasicMaterial({ color: 0xf2efe6 }),
    paving: new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 1 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x9c8460, roughness: 1 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x79a356, roughness: 1 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x4a7f3a, roughness: 0.9 }),
    blueprint: new THREE.MeshStandardMaterial({ color: 0x8fc4ff, transparent: true, opacity: 0.32, roughness: 0.6, depthWrite: false }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x6b4128, roughness: 0.9 }),
    leaves: [0x4f8f3e, 0x5f9f44, 0x3f7d3a].map(function (color) {
      return new THREE.MeshStandardMaterial({ color: color, roughness: 0.85 });
    }),
    pole: new THREE.MeshStandardMaterial({ color: 0x2c3136, metalness: 0.5, roughness: 0.4 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xffe1a0, emissive: 0xffc46b, emissiveIntensity: 0.8 }),
    fence: new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: 0.6 }),
    fenceWhite: new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6 }),
    crate: new THREE.MeshStandardMaterial({ color: 0xb98a52, roughness: 0.85 }),
    ring: new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.85, depthWrite: false }),
  };
  const citySigns = new Map();
  const citySignPoint = new THREE.Vector3();
  let cityNewBuilding = null; // just revealed: its card reads «Новое здание: …»
  let cityReveal = null; // { id, phase: 'fly' | 'grow', t }: camera on a new building, then it grows
  let cityRefreshKey = '';
  let cityCardHtml = '';
  let cityWalletHtml = '';
  let cityCovers = []; // HQ top bars (wallet pills, site chip) in stage px: signs never show under them
  // Camera per screen (docs/gdd/16-ux-flow.md §7): the view of every site the player left, the city view.
  const cameraStates = { site: {}, city: null };
  let siteBuiltTop = 0;
  let cameraHint = null;
  let cameraHintChecked = false;
  let safeAreaKey = '';
  let safeAreaQueued = false;

  const hemi = new THREE.HemisphereLight(0xe4f0ff, 0x7c8a57, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b4, 1.45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobileRendering ? 1024 : 2048, mobileRendering ? 1024 : 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  scene.add(sun);
  scene.add(sun.target);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vPos; void main(){ float h = normalize(vPos).y; vec3 top = vec3(0.47, 0.69, 0.84); vec3 hor = vec3(0.96, 0.84, 0.70); gl_FragColor = vec4(mix(hor, top, smoothstep(-0.08, 0.55, h)), 1.0); }',
    })
  );
  scene.add(sky);

  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(90, 64),
    new THREE.MeshStandardMaterial({ color: 0x7ea15d, roughness: 1, map: grassTexture() })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  let campaign = null;
  let world = null;
  let meta = null;
  let currentScreen = 'build';
  let cityBuilding = null;
  // Company panels (#meta-panel): every screen but the site and the quarter. The office and the
  // recruiting center open from their buildings, the rest from the nav (the exchange from both).
  // × goes back where the panel was opened from: panelReturn {screen, building (the lot selected)}.
  const PANEL_SCREENS = ['foremen', 'exchange', 'contract', 'office', 'tech', 'recruiting'];
  let panelReturn = { screen: 'build', building: null };
  let panelKey = ''; // what the open panel shows (refreshPanel re-renders when it changes)
  let panelCheckedAt = 0;
  let officeTab = 'Рабочая сила';
  let foremanFocus = null;
  let foremanGridScroll = 0; // «← Бригадиры» comes back to the same place in the grid
  let snapshotElapsed = 0;
  let timeScale = 1;
  let soundOn = true;
  let audioCtx = null;
  let music = null; // background music (startMusic): { gain, timer, step, next, noise }
  let hudElapsed = 0;
  // Session HUD (docs/gdd/16-ux-flow.md §5). The dock cards are rebuilt only when something changed
  // (hudDirty) or the coins crossed a card price (dockRange); the coin counter tweens to
  // campaign.coins and sums gains into «+1 240» once a second; the rate is the last minute of pay.
  let hudDirty = true;
  const dockRange = { campaign: null, low: 0, high: Infinity };
  const hudCoins = { campaign: null, shown: 0, from: 0, to: 0, t: 1, gain: 0, gainSince: 0, pulseAt: 0 };
  const coinRate = { campaign: null, samples: [], text: '' };
  const envView = { campaign: null, night: false, weather: '' };
  const chestAnnounced = new WeakMap(); // campaign → thresholds already announced («Сундук 25% готов!»)
  const chestToasts = {}; // threshold → that toast's handle: it goes once the chest is claimed any other way
  const contractWarned = new WeakSet(); // campaigns that got «Минута до конца контракта!»
  let crewSignature = '';
  let bannerToast = null; // the start card toast (showBanner), replaced by the next start
  // Weather badge of the day clock (names from Meta.applyEnvironment).
  const WEATHER_ICONS = { 'Снег': 'snow', 'Жара': 'heat', 'Дождь': 'rain', 'Шторм': 'storm', 'Сейсмическая активность': 'quake' };
  let luckyPop = null; // the golden cube / jackpot popup on screen: { key, count, coins, capital, timer }
  // Construction sites (docs/gdd/16-ux-flow.md §1-3): the world in memory belongs to the registry
  // slot `liveKey` (Meta.site(meta, key)); it is simulated only while the player looks at it.
  const UI = window.MicroBuildersUI;
  const SITE_KEYS = Meta.SITE_KEYS;
  const RETURN_DIALOG_SECONDS = 60;
  const RESUME_CATCH_UP_SECONDS = 30;
  const ICONS = window.MicroBuildersIcons;
  // Sites that are not on screen catch up once they have been left this long (shorter gaps add up).
  const INACTIVE_CATCH_UP_SECONDS = 20;
  // The site on screen is rebuilt from its snapshot to catch up (its workers start over), so its
  // shorter absences are banked (snap.awayBank) until together they reach this.
  const ACTIVE_CATCH_UP_SECONDS = 60;
  let liveKey = null;
  let hiddenAt = 0;
  // Pre-start briefing (docs/gdd/16-ux-flow.md §4): the draft crew of the briefing that is open.
  let briefing = null;
  // Where a foreman works, by run mode («Ещё на основной стройке», «Работает на контракте»).
  let schoolTab = 'trials';
  const CREW_PLACES = { school: 'на испытании школы', campaign: 'на основной стройке', contract: 'на контракте', exchange: 'на заказе биржи' };
  const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };
  // Machines are useless without drones to assemble their patterns, so their tabs wait for the first drone.
  const DRONE_GATED_GROUPS = ['loaders', 'helicopters'];

  // Session simulator estimate shown in the level info sheet: refreshed after every purchase
  // and every SIM_REFRESH_SECONDS of real time.
  const SIM_REFRESH_SECONDS = 10;
  const simSummaries = new WeakMap();
  let simEstimate = null;
  let simElapsed = 0;
  const stickViews = new Map();
  const vehicleViews = new Map();
  const planningDesks = new Set();
  const blockViews = new Map();
  const pourViews = new Map();
  // Status icons over workers and drones (docs/gdd/16-ux-flow.md §6): the icon shows the intent,
  // not the raw phase, and switches with hysteresis in real seconds so it never blinks. All icons
  // come from one glyph atlas with shared materials; rings are prebuilt geometry + drawRange.
  const BADGE_COLORS = {
    plan: '#4a6b5a',
    fetch: '#6b4f2e',
    haul: '#2f6f8f',
    build: '#8a6a2b',
    meal: '#e07a32',
    smoke: '#5c534c',
    rest: '#3c4d86',
    front: '#6b6f75',
    path: '#b5651d',
    lost: '#c0392b',
    overload: '#b3261e',
  };
  const BADGE_URGENT = { overload: true, path: true, lost: true };
  const BADGE_TIMED_PHASES = { plan: true, mine: true, place: true, erect: true, passage: true, meal: true, break: true, pick: true };
  const BADGE_PENDING = 0.2; // a new state must last this long (real s) before the icon switches
  const BADGE_HOLD = 0.5; // the icon on screen stays at least this long
  // Plans, picks and cubes have known timings: one that will take under this (real s) gets no icon.
  const BADGE_QUICK = 1;
  const BADGE_PREDICTABLE = { plan: true, fetch: true, haul: true };
  const BADGE_SECONDS_MIN = 1.5; // «12 с» on the ring only for actions at least this long in real seconds
  const BADGE_SIZE = 0.72;
  const BADGE_RING_SEGMENTS = 48;
  const BADGE_LOD_PX = 16; // smaller on screen than this: only urgent icons…
  const BADGE_MIN_PX = 12; // …and those are kept at least this big
  const BADGE_MAX_PX = 44; // close up (worker view) icons stop growing
  const BADGE_LABEL_PX = 20; // labels («×1,6», «3/8») are at least this tall on screen: text ≈ 11 px
  const BADGE_LABEL_MIN_PX = 26; // icons smaller than this keep only urgent and selected labels
  const badgeRoot = new THREE.Group();
  scene.add(badgeRoot);
  const badgeRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x3dce67, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  });
  const badgeLodState = { urgentOnly: false, scale: 1, px: 30 };
  let badgeAtlas = null;
  // World-anchored feedback in #fx-layer (§5 «Отклик», §6): pooled coin floaters and worker chips.
  const FX_FLOAT_MAX = 12;
  const FX_ICONS = {
    coin: 'icons/icon-coins.jpg?v=2',
    lucky: 'icons/icon-coins.jpg?v=2',
    gold: 'icons/icon-coins.jpg?v=2',
    capital: 'icons/icon-capital.jpg?v=2',
  };
  const FX_CHIP_MAX = 3;
  // tripChipKind → chip tone: green — «План работ» sized the trip, gold — the carry, red — overload.
  const TRIP_CHIP_TONES = { count: 'plan', weight: 'carry', parts: 'carry', split: 'carry', front: 'warn', order: 'warn', heavy: 'bad' };
  const FX_AGGREGATE_SECONDS = 0.6; // at ×5 coin floaters are merged over this much real time
  const fxFloats = [];
  const fxChips = [];
  const fxPoint = new THREE.Vector3();
  const fxStack = []; // boxes of the floaters and chips placed this frame (stage px)
  const fxOrder = [];
  let fxTop = 0; // stage px under the top HUD bars
  const fxAggregate = { coins: 0, x: 0, y: 0, z: 0, t: 0 };
  let fxTime = 0;
  let fxChipLog = null; // dev: every chip asked for, on screen or not (MicroBuildersDebug.chipLog)
  const workerCard = { nodes: null };

  const pops = [];
  const sparks = [];
  const graphStates = {}; // upgrade graph node states (paintUpgradeGraph), filled on every dock paint
  const TURN_SPEED = 9; // rad/s a worker turns at (visual)
  // On a ladder he stands this far from his cell's centre toward the wall: the ladder hangs 0.14
  // toward it, so a negative value keeps him just in front of the rungs.
  const LADDER_STAND = -0.1;
  // Worker figure scale (was 1.2, −15%).
  // Direction from a cube being poured to what it leans on: floor, a side neighbour, the ceiling.
  const POUR_FLOOR = [0, -1, 0];
  const POUR_SIDES = [[-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]];
  const POUR_CEILING = [0, 1, 0];
  const STICK_SCALE = 1.02;
  // Workers brought by expertise: a vest per rank and ±10% height (junior 0.8, middle 1, senior 1.2).
  const RANK_LOOKS = {
    junior: { vest: 0x7cc243, size: 0.9 },
    middle: { vest: 0x2f7fe0, size: 1 },
    senior: { vest: 0xb8322a, size: 1.1 },
  };
  const NO_SHIFT = [0, 0];
  const cubeCoins = new Map(); // coins poured into a cube so far → one «+N» when it is done (onPour/onPlace)
  // Mini-cubes flying from a worker's hands into the cube he builds: one instanced mesh, pooled slots.
  const FLY_SLOTS = 96;
  const flyCubes = [];
  let flyMesh = null;
  const flyColor = new THREE.Color();
  let solidMeshes = [];
  let ghostMaterials = [];
  let ghostMeshes = [];
  let featureState = Features.createState();
  let ghostsOn = false;
  let scaffoldLookup = new Map();
  let scaffoldMeshes = [];
  const scaffoldDirty = new Set();
  const workerRaycaster = new THREE.Raycaster();
  const workerPointer = new THREE.Vector2();
  const workerPlan = new THREE.Group();
  let selectedBuilder = null;
  let workerPlanSignature = '';
  scene.add(workerPlan);

  const cameraController = MicroBuildersCamera.create({
    view: view,
    getWorld: function () {
      return world;
    },
    getSelectedBuilder: function () {
      return selectedBuilder;
    },
    getStickView: function (builder) {
      return stickViews.get(builder);
    },
    onClick: function (event) {
      selectWorker(event);
    },
    onInteract: onCameraInteract,
    onWorkerViewChange: updateWorkerViewButton,
  });
  const camera = cameraController.camera;
  watchSafeArea();
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', markAbsent);
  window.addEventListener('pagehide', markAbsent);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') markAbsent();
    else onPageVisible();
  });

  document.getElementById('interface-toggle').addEventListener('click', function (event) {
    const hidden = document.body.classList.toggle('interface-hidden');
    event.currentTarget.classList.toggle('on', hidden);
    event.currentTarget.setAttribute('aria-label', hidden ? 'Показать интерфейс' : 'Скрыть интерфейс');
    event.currentTarget.title = hidden ? 'Показать интерфейс' : 'Скрыть интерфейс';
  });
  document.getElementById('camera-home').addEventListener('click', recenterCamera);
  document.getElementById('city-signs').addEventListener('click', function (event) {
    const sign = event.target.closest('.city-sign');
    if (sign) selectCityLot(sign.dataset.id);
  });
  document.getElementById('restart').addEventListener('click', confirmRestart);
  document.getElementById('reset-company').addEventListener('click', confirmReset);
  document.getElementById('abandon-run').addEventListener('click', confirmAbandon);
  document.getElementById('site-chip').addEventListener('click', function () { openScreen('build'); });
  document.getElementById('next-cta').addEventListener('click', onNextCta);
  document.getElementById('level-prev').addEventListener('click', function () { jumpTo(world.level.index - 1); });
  document.getElementById('level-next').addEventListener('click', function () { jumpTo(world.level.index + 1); });
  document.getElementById('level-pick').addEventListener('change', function (event) {
    jumpTo(Number(event.target.value));
  });
  document.getElementById('ghost-toggle').addEventListener('change', function (event) {
    ghostsOn = event.target.checked;
    applyGhostVisibility();
  });
  document.getElementById('scaffold-toggle').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-step').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-erect').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-shortcut-routes').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-expansion-budget').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-horizontal-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-vertical-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-ladder-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-deck-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('scaffold-passage-price').addEventListener('change', applyScaffoldTuning);
  document.getElementById('free-purchases').addEventListener('change', function (event) {
    campaign.freePurchases = event.target.checked;
    paintHud();
  });
  document.getElementById('mute').addEventListener('click', function () {
    soundOn = !soundOn;
    meta.settings.sound = soundOn;
    Meta.save(meta);
    paintMute();
    setMusicVolume();
  });
  // Browsers start audio only from a gesture: the first touch anywhere unlocks it and starts the music.
  document.addEventListener('pointerdown', function () {
    ensureAudio();
    if (audioCtx.state === 'suspended' && document.visibilityState === 'visible') audioCtx.resume();
    startMusic();
  });
  document.addEventListener('visibilitychange', function () {
    if (!audioCtx) return;
    if (document.visibilityState === 'hidden') audioCtx.suspend();
    else audioCtx.resume();
  });
  document.querySelectorAll('[data-dev-group]').forEach(function (box) {
    box.addEventListener('change', function () {
      campaign.devGroups[box.dataset.devGroup] = box.checked;
      if (box.dataset.devGroup === 'all') {
        document.querySelectorAll('[data-dev-group]').forEach(function (other) {
          other.checked = box.checked;
          campaign.devGroups[other.dataset.devGroup] = box.checked;
        });
      }
      paintHud();
    });
  });
  document.getElementById('upgrade-dock').addEventListener('click', function (event) {
    const button = event.target.closest('.upgrade');
    if (!button) return;
    tapUpgrade(button.id.slice(3));
  });
  document.querySelectorAll('#app-nav [data-screen]').forEach(function (button) {
    button.addEventListener('click', function () {
      const screen = button.dataset.screen;
      if (screen !== 'build' && contractLocked()) return;
      // Tabs never disappear: a closed one says what opens it.
      const lock = navLock(screen);
      if (lock) {
        UI.toast({ text: lock, icon: 'lock', key: 'nav-lock:' + screen });
        return;
      }
      if (screen === 'hq') cityBuilding = null;
      openScreen(screen);
    });
  });
  // The site's only way out: the quarter, where the rest of the navigation lives.
  document.getElementById('hq-btn').addEventListener('click', function () {
    if (contractLocked()) return;
    cityBuilding = null;
    openScreen('hq');
  });
  document.getElementById('chest-25').addEventListener('click', function () { tapChest(25); });
  document.getElementById('chest-50').addEventListener('click', function () { tapChest(50); });
  // ui.js toggles the popover first; its lines are painted right away, then every HUD tick.
  document.getElementById('day-clock').addEventListener('click', paintDayPop);
  document.getElementById('hide-interface').addEventListener('click', function () {
    document.getElementById('interface-toggle').click();
  });
  // Dev: «CPU» (cpu-profiler.js) joins «Рабочие» inside the Dev panel, off the dock.
  if (document.getElementById('cpu-profiler-toggle')) {
    document.getElementById('dev-buttons').appendChild(document.getElementById('cpu-profiler-toggle'));
  }
  document.getElementById('level-info-toggle').addEventListener('click', function () { setLevelInfo(true); });
  document.getElementById('level-info-tabs').addEventListener('click', function (event) {
    const tab = event.target.dataset && event.target.dataset.tab;
    if (tab) setLevelInfoTab(tab);
  });
  document.getElementById('material-row').addEventListener('click', toggleMaterialRow);
  document.getElementById('panel-close').addEventListener('click', closePanel);
  document.getElementById('meta-content').addEventListener('click', onMetaAction);
  document.getElementById('city-card').addEventListener('click', onCityCardAction);
  document.querySelectorAll('.tempo button[data-tempo]').forEach(function (button) {
    button.addEventListener('click', function () {
      // The speed row is a playtest tool open to everyone for now (§5); it goes before release.
      // A contract's clock never stops (docs/gdd/16-ux-flow.md §1): no pause while it runs.
      if (Number(button.dataset.tempo) === 0 && contractRunning()) {
        UI.toast({ text: 'Таймер испытания не останавливается', icon: 'clock', tone: 'warn', key: 'contract-pause' });
        return;
      }
      timeScale = Number(button.dataset.tempo);
      if (timeScale === 20) settleAcceleratedVisuals();
      paintTempo();
    });
  });
  window.addEventListener('keydown', function (event) {
    if (BuildPatternEditor.opened) return;
    // Windows stop keys before they get here; with none open Escape closes the top layer (a HUD
    // popover, a company panel, the HQ lot card) — the same as Back.
    if (event.key === 'Escape') {
      UI.layer.back();
      return;
    }
    if (document.body.classList.contains('has-modal') || currentScreen !== 'build') return;
    if (event.key === '1') buy('builders');
    if (event.key === '2') buy('speed');
    if (event.key === '3') buy('carry');
    if (event.key === '4') buy('horizontal');
    if (event.key === '5') buy('vertical');
    if (event.key === '6') buy('plan');
    if (event.key === '7') buy('vehicles');
    if (event.key === '8') buy('vehicleHeight');
    if (event.key === '9') buy('vehicleReach');
    if (event.key === '0') buy('kitchen');
  });

  const machineMat = {
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2b91f, roughness: 0.45, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.7, metalness: 0.3 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.35, metalness: 0.7 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x1d1f21, roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x8cc7da, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.6 }),
    light: new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xfff0b0, emissiveIntensity: 0.6 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.6 }),
    heli: new THREE.MeshStandardMaterial({ color: 0xd8402f, roughness: 0.38, metalness: 0.35 }),
    heliWhite: new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.4, metalness: 0.3 }),
    blur: new THREE.MeshBasicMaterial({ color: 0x1d2024, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
  };

  const workerMat = {
    skin: new THREE.MeshStandardMaterial({ color: 0xf0b48a, roughness: 0.55 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.62 }),
    vest: new THREE.MeshStandardMaterial({ color: 0xf07820, roughness: 0.46 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xf6d34a, roughness: 0.38, emissive: 0x8a6a12, emissiveIntensity: 0.15 }),
    hat: new THREE.MeshStandardMaterial({ color: 0xf5c53a, roughness: 0.28, metalness: 0.22 }),
    eye: new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.4 }),
    pick: new THREE.MeshStandardMaterial({ color: 0xb7c0c8, metalness: 0.7, roughness: 0.35 }),
  };
  const workerGeo = {
    head: new THREE.SphereGeometry(0.16, 16, 12),
    helmet: new THREE.SphereGeometry(0.185, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    brim: new THREE.CylinderGeometry(0.24, 0.24, 0.045, 18),
    torso: new THREE.CapsuleGeometry(0.13, 0.18, 4, 8),
    vest: new THREE.BoxGeometry(0.32, 0.26, 0.2),
    stripe: new THREE.BoxGeometry(0.33, 0.055, 0.21),
    leg: new THREE.CapsuleGeometry(0.06, 0.12, 3, 8),
    arm: new THREE.CapsuleGeometry(0.048, 0.1, 3, 8),
    hand: new THREE.SphereGeometry(0.058, 8, 6),
    eye: new THREE.SphereGeometry(0.026, 8, 6),
  };

  const LOOK = {
    stone: { roughness: 0.92, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
    sand: { roughness: 0.88, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
    concrete: { roughness: 0.84, metalness: 0.04, emissive: 0x000000, emissiveIntensity: 0 },
    wood: { roughness: 0.78, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
    brick: { roughness: 0.82, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
    metal: { roughness: 0.32, metalness: 0.82, emissive: 0x000000, emissiveIntensity: 0 },
    marble: { roughness: 0.28, metalness: 0.08, emissive: 0x000000, emissiveIntensity: 0 },
    gem: { roughness: 0.22, metalness: 0.18, emissive: 0x000000, emissiveIntensity: 0 },
    obsidian: { roughness: 0.12, metalness: 0.55, emissive: 0x120818, emissiveIntensity: 0.25 },
    diamond: { roughness: 0.04, metalness: 0.12, emissive: 0xb9f6ff, emissiveIntensity: 0.45 },
    platinum: { roughness: 0.16, metalness: 0.92, emissive: 0x000000, emissiveIntensity: 0 },
    glass: { roughness: 0.08, metalness: 0.1, emissive: 0x123c4a, emissiveIntensity: 0.35 },
  };
  const blockSurfaceCache = {};

  BuildPatternEditor.init(applyScaffoldTuning);
  MicroBuildersWorkerLog.bind(focusWorker);
  boot();

  // Dev-mode helpers for testing machines and drones: buy every upgrade, fast-forward the site.
  if (document.body.classList.contains('dev-mode')) {
    window.MicroBuildersDebug = {
      maxUpgrades: function () {
        campaign.freePurchases = true;
        campaign.devGroups.all = true;
        Object.keys(window.MicroBuildersBalance.session).forEach(function (kind) {
          let guard = 0;
          while (guard < 40 && buy(kind)) guard += 1;
        });
        paintHud();
      },
      // slice: sim seconds per frame (default 0.05; 1/60 imitates the real 60 fps loop at ×1).
      step: function (seconds, slice) {
        const dt = slice || 0.05;
        for (let t = 0; t < seconds && campaign.status === 'play'; t += dt) {
          MB.beginFrame(world);
          MB.stepWorld(world, dt);
          consumeEvents();
        }
        paintHud();
      },
      world: function () { return world; },
      meta: function () { return meta; },
      campaign: function () { return campaign; },
      // Presence flow: away(seconds) pretends the app spent that long in the background (from the
      // current screen) and runs the return; screen(name) is a nav tap; finish() completes the site.
      away: function (seconds) { simulateAway(seconds); },
      screen: function (name) { openScreen(name); },
      finish: function () {
        if (campaign.status !== 'play') return;
        MB.applyOfflineMass(world, Infinity);
        consumeEvents();
        paintHud();
      },
      sites: function () { return meta.sites; },
      liveSite: function () { return liveKey; },
      overlays: function () {
        return Array.prototype.map.call(document.querySelectorAll('#overlay-root .overlay'), function (el) { return el.dataset.overlay; });
      },
      requestRun: function (spec) { requestRun(spec); },
      briefing: function () { return briefing; },
      switchSite: function (key) { switchSite(key); },
      city: function () { syncCity(); paintCityCard(); paintCityWallet(); placeCitySigns(); },
      // City animations, the camera and the signs advance together (headless tests have no rAF).
      cityTick: function (seconds) {
        for (let t = 0; t < seconds; t += 0.05) {
          tickCityBuild(0.05);
          cameraController.update(0.05, campaign ? campaign.status : '');
        }
        refreshCity();
        placeCitySigns();
      },
      cityRecords: function () { return cityRecords; },
      pickCity: function (id) { cityBuilding = id; paintCityCard(); },
      selectCity: function (id) { selectCityLot(id); },
      // The building's window as if opened from its card in the HQ (× leads back to that card).
      openOffice: function (tab) {
        if (tab) officeTab = tab;
        if (currentScreen !== 'hq') openScreen('hq');
        openBuildingPanel('office');
      },
      showCard: function (card) { showCardReveal(card, 'chest50'); },
      openCityBuilding: function (id) {
        if (currentScreen !== 'hq') openScreen('hq');
        if (!openBuildingPanel(id)) selectCityLot(id);
      },
      panel: function () { return { screen: currentScreen, back: panelReturn, layer: UI.layer.top(), scroll: document.getElementById('meta-panel').scrollTop }; },
      panelTick: function () { refreshPanel(true); },
      // Camera: the controller, a synchronous safe-area measure and the recenter button / hint paint.
      camera: function () { return cameraController; },
      safeArea: function () { refreshSafeArea({ snap: true }); return cameraController.getSafeArea(); },
      cameraUi: function () { paintCameraButton(); maybeCameraHint(); },
      // The HUD without rAF (headless tests): per-frame HUD effects (coin tween, «+N» sums, popup
      // timers run on setTimeout anyway) for `seconds`, then one regular HUD tick.
      hudTick: function (seconds) {
        for (let t = 0; t < (seconds || 0.25); t += 0.05) tickHudFx(0.05);
        paintHud(true);
        paintDayPop();
      },
      stepUntil: function (test, maxSeconds) {
        for (let t = 0; t < maxSeconds && campaign.status === 'play'; t += 0.05) {
          MB.beginFrame(world);
          MB.stepWorld(world, 0.05);
          consumeEvents();
          if (test(world)) break;
        }
        paintHud();
      },
      buy: function (kind, times) {
        campaign.freePurchases = true;
        campaign.devGroups.all = true;
        for (let i = 0; i < times; i++) buy(kind);
        paintHud();
      },
      look: function (x, z, radius) {
        cameraController.framePoint(x, 1, z, radius || 8);
        cameraController.snap();
      },
      lookVehicle: function (index, radius) {
        const vehicle = world.vehicles[index];
        if (vehicle) cameraController.framePoint(vehicle.cell[0] + 0.5, 1, vehicle.cell[2] + 0.5, radius || 7);
        cameraController.snap();
      },
      lookDrone: function (index, radius) {
        const drone = world.builders.filter(function (builder) { return builder.trade === 'engineer'; })[index];
        if (drone) cameraController.framePoint(drone.cell[0], drone.cell[1], drone.cell[2], radius || 4);
        cameraController.snap();
      },
      follow: function (trade, nth) {
        const list = world.builders.filter(function (builder) { return builder.trade === trade; });
        const builder = list[nth || 0];
        if (!builder) return;
        focusWorker(builder);
        cameraController.setWorkerView(true);
        updateWorkerViewButton();
      },
      // Worker views without rAF (headless tests): one view frame with a fixed real dt;
      // render: true also draws the scene.
      viewFrame: function (realDt, render) {
        const dt = realDt === undefined ? 1 / 30 : realDt;
        updatePours();
        updatePops(dt);
        updateSparks(dt);
        updateFlyCubes(dt);
        updateSticks(clock.elapsedTime, dt);
        updateWorkerPlan(clock.elapsedTime);
        cameraController.update(dt, campaign ? campaign.status : '');
        updateWorldFx(dt);
        paintWorkerCard();
        if (render) renderer.render(scene, camera);
      },
      // Shown status icon per worker: kind, number of switches so far, on screen or not.
      badges: function () {
        const list = [];
        stickViews.forEach(function (viewState, builder) {
          const badge = viewState.badge;
          list.push({
            index: builder.index,
            trade: builder.trade,
            shown: badge.shown,
            icon: badge.group.visible ? badge.shown : '',
            changes: badge.changes,
            label: badge.labelText,
            labelShown: !!(badge.label && badge.label.visible && badge.group.visible),
            labelPx: badge.label ? Math.round(badge.label.scale.y * badgeLodState.px * badge.size / BADGE_SIZE) : 0,
            ring: badge.ring.visible ? badge.segments : 0,
          });
        });
        return list;
      },
      pickWorker: function (nth) {
        const list = world.builders.filter(function (builder) { return builder.trade !== 'engineer'; });
        focusWorker(list[nth || 0] || null);
      },
      fx: function () {
        return {
          floats: fxFloats.filter(function (fx) { return fx.life > 0; }).map(function (fx) { return fx.text.data + (fx.caption.data ? ' | ' + fx.caption.data : ''); }),
          chips: fxChips.filter(function (fx) { return fx.life > 0; }).map(function (fx) { return fx.text.data; }),
        };
      },
      // Start (true) or stop recording every chip text asked for; returns the live list.
      chipLog: function (on) {
        fxChipLog = on ? [] : null;
        return fxChipLog;
      },
    };
  }

  function boot() {
    fillLevelPick();
    meta = Meta.load();
    soundOn = meta.settings.sound !== false;
    paintMute();
    // The absence started when the page was hidden (or, after a crash, at the last save).
    const company = Meta.claimAway(meta, meta.hiddenAt || meta.lastSeenAt, true);
    const key = Meta.activeSite(meta);
    const returning = !!Meta.site(meta, key) || meta.completed.length > 0 || meta.campaignLevel > 0;
    if (!returning) {
      // The very first launch: level 1 waits behind the title card.
      campaign = MB.createCampaign();
      Meta.configureNewCampaign(meta, campaign, 'campaign', 0, null);
      world = MB.startLevel(campaign);
      campaign.status = 'title';
      world.events.length = 0;
      liveKey = null;
      buildLevelView();
      paintHud();
      buildCity();
      openScreen('build', { silent: true });
      showTitle();
      requestAnimationFrame(frame);
      return;
    }
    document.body.classList.add('playing');
    buildCity();
    if (Meta.site(meta, key)) {
      // A returning player lands on the site: every site catches up, then the return window.
      enterSites({ seconds: company.seconds, company: company, boot: true });
    } else {
      // Progress but no site (old saves, end of the campaign): the next story order.
      campaign = MB.createCampaign();
      Meta.configureNewCampaign(meta, campaign, 'campaign', meta.campaignLevel, null);
      world = MB.startLevel(campaign);
      campaign.status = 'title';
      world.events.length = 0;
      buildLevelView();
      openScreen('build', { silent: true });
      requestRun({ mode: 'campaign', levelIndex: meta.campaignLevel, reason: 'boot' });
    }
    paintHud();
    requestAnimationFrame(frame);
  }

  // First launch only (docs/gdd/16-ux-flow.md §3): starting level 1 needs no briefing.
  function showTitle() {
    UI.overlay.open({
      id: 'title',
      className: 'title-card',
      closable: false,
      kicker: 'Строительная компания',
      title: 'MicroBuilders',
      body: '<p>Ваш первый заказ — маленький каменный дом. Бригада построит его сама, а вы помогайте прокачками.</p>',
      actions: [{ id: 'start', label: 'Начать стройку', primary: true, onClick: beginShift }],
    });
  }

  function beginShift() {
    ensureAudio();
    UI.overlay.close('title');
    campaign.status = 'play';
    liveKey = Meta.siteKey(campaign.runMode);
    Meta.saveSite(meta, liveKey, campaign, world, { awaySince: null, awayBank: 0 });
    Meta.setActiveSite(meta, liveKey);
    document.body.classList.add('playing');
    showBanner();
    paintHud();
    // The HUD just appeared: frame the free band, then the entry fly-in.
    refreshSafeArea({ snap: true });
    cameraController.frameHome({ intro: true });
  }

  function paintMute() {
    document.getElementById('mute').textContent = soundOn ? 'Звук: вкл' : 'Звук: выкл';
  }

  // Saves the live site; `extra` goes to Meta.saveSite (status, awaySince, reward).
  function saveLive(extra) {
    if (meta === null || campaign === null || world === null || liveKey === null) return;
    if (campaign.status !== 'play' && campaign.status !== 'complete') return;
    Meta.saveSite(meta, liveKey, campaign, world, extra);
  }

  function timedMode(mode) { return mode === 'contract' || mode === 'school'; }

  function trialLimit(c) { return c.runMode === 'school' ? Meta.schoolLimitSeconds(c) : Meta.contractLimitSeconds(meta); }

  function contractRunning() {
    return !!campaign && liveKey === 'side' && timedMode(campaign.runMode) && campaign.status === 'play';
  }

  // A contract is a timed trial: the player stays on its site until it is handed over or dropped
  // (menu «Бросить контракт»). Every way out (nav, other sites' windows, new runs) asks here.
  function contractLocked() {
    if (!contractRunning()) return false;
    UI.toast({ text: campaign.runMode === 'school' ? 'Завершите или бросьте испытание школы' : 'Во время контракта уйти нельзя — сдайте или бросьте контракт', icon: 'contract', tone: 'warn', key: 'contract-lock' });
    return true;
  }

  function applyScaffoldTuning() {
    if (campaign && campaign.runMode === 'school') return;
    MB.SCAFFOLD.enabled = document.getElementById('scaffold-toggle').checked;
    MB.SCAFFOLD.step = Number(document.getElementById('scaffold-step').value);
    MB.SCAFFOLD.erectSeconds = Number(document.getElementById('scaffold-erect').value);
    MB.SCAFFOLD.shortcutRoutes = document.getElementById('scaffold-shortcut-routes').checked;
    MB.SCAFFOLD.expansionBudget = Number(document.getElementById('scaffold-expansion-budget').value);
    MB.SCAFFOLD.horizontalPrice = Number(document.getElementById('scaffold-horizontal-price').value);
    MB.SCAFFOLD.verticalPrice = Number(document.getElementById('scaffold-vertical-price').value);
    MB.SCAFFOLD.ladderPrice = Number(document.getElementById('scaffold-ladder-price').value);
    MB.SCAFFOLD.deckPrice = Number(document.getElementById('scaffold-deck-price').value);
    MB.SCAFFOLD.passagePrice = Number(document.getElementById('scaffold-passage-price').value);
    if (!world || !campaign) return;
    const status = campaign.status;
    disposeLevel();
    world = MB.startLevel(campaign);
    if (status === 'title') {
      campaign.status = 'title';
      world.events.length = 0;
    }
    SITE_KEYS.forEach(function (key) { UI.overlay.close('complete-' + key); });
    buildLevelView();
    paintHud();
  }

  function resetCompany() {
    UI.overlay.closeAll();
    disposeLevel();
    Meta.clearSave();
    meta = Meta.createState();
    Meta.save(meta);
    cityBuilding = null;
    liveKey = null;
    timeScale = 1;
    paintTempo();
    campaign = MB.createCampaign();
    Meta.configureNewCampaign(meta, campaign, 'campaign', 0, null);
    campaign.freePurchases = document.getElementById('free-purchases').checked;
    world = MB.startLevel(campaign);
    campaign.status = 'title';
    world.events.length = 0;
    document.body.classList.remove('playing');
    openScreen('build', { silent: true });
    buildLevelView();
    paintHud();
    syncCity();
    showTitle();
  }

  // «Начать заказ заново» restarts the run on screen with its own mode and payload.
  function restartRun() {
    if (campaign.runMode === 'school') return;
    requestRun({ mode: campaign.runMode, levelIndex: campaign.levelIndex, payload: campaign.runPayload, reason: 'restart' });
  }

  function confirmRestart() {
    if (!world || campaign.status === 'title') return;
    UI.overlay.open({
      id: 'confirm-restart',
      kicker: siteKicker(campaign.runMode, campaign.levelIndex),
      title: 'Начать заказ заново?',
      body: '<p>Прогресс этой стройки и купленные прокачки пропадут.</p>',
      actions: [
        { label: 'Начать заново', primary: true, danger: true, onClick: restartRun },
        { label: 'Отмена' },
      ],
    });
  }

  function confirmReset() {
    UI.overlay.open({
      id: 'confirm-reset',
      kicker: 'Опасная зона',
      title: 'Сбросить всю компанию?',
      body: '<p>Удалятся все стройки, офис, бригадиры, валюты и штаб. Отменить нельзя.</p>',
      actions: [
        { label: 'Удерживайте, чтобы сбросить', primary: true, danger: true, hold: 1500, onClick: resetCompany },
        { label: 'Отмена' },
      ],
    });
  }

  // Dropping a side order from the menu (a contract can be left only this way).
  function confirmAbandon() {
    const side = Meta.site(meta, 'side');
    if (!side || side.status !== 'play') return;
    const contract = side.runMode === 'contract';
    const school = side.runMode === 'school';
    UI.overlay.open({
      id: 'confirm-abandon',
      kicker: school ? 'Школа бригадиров' : contract ? 'Контракт ' + (meta.contract.index + 1) : 'Заказ биржи',
      title: school ? 'Бросить испытание?' : contract ? 'Бросить контракт?' : 'Бросить заказ биржи?',
      body: school ? '<p>Попытка потрачена. Полученный опыт сохраняется.</p>' : contract
        ? '<p>Прогресс пропадёт, перезарядка 5 мин.</p>'
        : '<p>Прогресс этой стройки пропадёт. Заказ останется на бирже.</p>',
      actions: [
        { label: school ? 'Бросить испытание' : contract ? 'Бросить контракт' : 'Бросить заказ', primary: true, danger: true, onClick: abandonSide },
        { label: 'Отмена' },
      ],
    });
  }

  function abandonSide() {
    const side = Meta.site(meta, 'side');
    if (!side) return;
    if (side.runMode === 'school') Meta.failSchoolTrial(meta);
    else if (side.runMode === 'contract') Meta.failContract(meta);
    else Meta.clearSite(meta, 'side');
    if (liveKey === 'side') {
      liveKey = null;
      switchSite(Meta.activeSite(meta), { toHq: !Meta.site(meta, Meta.activeSite(meta)) });
    } else {
      renderMetaScreen();
    }
  }

  function sessionUpgradeOpen(kind) {
    const button = document.getElementById('up-' + kind);
    return upgradeLineOpen(kind, button.dataset.group);
  }

  function upgradeLineOpen(kind, group) {
    if (campaign.devGroups.all === true || campaign.devGroups[group] === true) return true;
    if (DRONE_GATED_GROUPS.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return false;
    return Meta.sessionLineOpen(meta, kind);
  }

  function buy(kind) {
    if (!world || campaign.status !== 'play') return false;
    if (!sessionUpgradeOpen(kind)) return false;
    // The graph: a line opens once its parent has a level.
    const parent = window.MicroBuildersUpgradeGraph.parent(kind);
    if (parent && campaign.purchases[parent] < 1 && campaign.devGroups.all !== true) return false;
    const bought = MB.buyUpgrade(campaign, world, kind);
    if (!bought) return false;
    tone(kind === 'builders' ? 520 : 680, 0.09);
    // The purchase's own events go through the normal dispatch instead of the bin: new workers and
    // machines, elevators, the «Счастливчик» toast and the 'upgrade' feedback on the card.
    consumeEvents();
    refreshSimEstimate();
    paintHud();
    return true;
  }

  // A tap on a card buys it or says why not: the card shakes, «Не хватает 1,2 тыс».
  function tapUpgrade(kind) {
    if (buy(kind)) return;
    const button = document.getElementById('up-' + kind);
    if (button.classList.contains('locked') && !sessionUpgradeOpen(kind)) {
      // A locked card (paintLockedUpgrade) names the office node that opens it.
      shake(button);
      UI.toast({ text: button.title, icon: 'lock', key: 'upgrade-locked', duration: 2400 });
      return;
    }
    if (!world || campaign.status !== 'play' || !sessionUpgradeOpen(kind)) return;
    shake(button);
    if (campaign.purchases[kind] >= window.MicroBuildersBalance.session[kind].max) {
      UI.toast({ text: upgradeName(kind) + ': максимальный уровень', icon: 'lock', key: 'upgrade-max', duration: 1600 });
      return;
    }
    const cost = MB.upgradeCost(kind, campaign.purchases[kind]);
    if (campaign.coins < cost) {
      UI.toast({ text: 'Не хватает ' + formatShort(cost - campaign.coins), icon: 'icons/icon-coins.jpg?v=2', tone: 'warn', key: 'upgrade-short', duration: 1600 });
      const coins = document.getElementById('coins');
      coins.classList.add('short');
      clearTimeout(coins.shortTimer);
      coins.shortTimer = setTimeout(function () { coins.classList.remove('short'); }, 600);
    }
  }

  function shake(el) {
    if (!el || !el.animate) return;
    el.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' },
    ], { duration: 320, easing: 'ease-out' });
  }

  function frame() {
    requestAnimationFrame(frame);
    const wallDt = clock.getDelta();
    const realDt = Math.min(wallDt, 0.05);
    tickCityBuild(realDt);
    // Presence rule: the site lives only while the player looks at it (the build screen, page on screen).
    const present = currentScreen === 'build' && document.visibilityState !== 'hidden';
    if (world && campaign.status === 'play' && present && !BuildPatternEditor.opened) {
      const simulationStarted = performance.now();
      const worldStarted = performance.now();
      MB.beginFrame(world);
      const elapsedBefore = campaign.levelElapsed;
      const totalBefore = campaign.totalElapsed;
      let budget = realDt * timeScale;
      if (timedMode(campaign.runMode)) budget = Math.min(budget, Math.max(0, trialLimit(campaign) - elapsedBefore));
      let guard = 0;
      while (budget > 0 && guard < 40) {
        const slice = Math.min(budget, 0.05);
        MB.stepWorld(world, slice);
        budget -= slice;
        guard += 1;
      }
      const environment = Meta.applyEnvironment(meta, campaign);
      applyEnvironmentView(environment);
      if (campaign.runMode === 'school') {
        // The playtest tempo advances the trial clock with construction; a slow frame still
        // spends real time. Accelerating workers alone must not make a timed tier easier.
        const elapsed = Math.min(Math.max(wallDt, campaign.levelElapsed - elapsedBefore), Math.max(0, trialLimit(campaign) - elapsedBefore));
        campaign.levelElapsed = elapsedBefore + elapsed;
        campaign.totalElapsed = totalBefore + elapsed;
      }
      MicroBuildersProfiler.add('worldStep', performance.now() - worldStarted);
      const eventsStarted = performance.now();
      consumeEvents();
      if (timedMode(campaign.runMode) && campaign.status === 'play' && campaign.levelElapsed >= trialLimit(campaign)) failLiveContract();
      MicroBuildersProfiler.add('eventView', performance.now() - eventsStarted);
      MicroBuildersProfiler.add('simulation', performance.now() - simulationStarted);
      MicroBuildersProfiler.add('scheduler', world.metrics.scheduler);
      MicroBuildersProfiler.add('path', world.metrics.path);
      MicroBuildersProfiler.add('scaffoldSearch', world.metrics.scaffoldSearch);
      MicroBuildersProfiler.count('assignments', world.metrics.assignments);
      MicroBuildersProfiler.count('pathSearches', world.metrics.pathSearches);
      MicroBuildersProfiler.count('aStarSearches', world.metrics.aStarSearches);
      MicroBuildersProfiler.count('scaffoldExpansions', world.metrics.scaffoldExpansions);
      MicroBuildersProfiler.count('invalidations', world.metrics.invalidations);
      if (world.metrics.aStarPeak) MicroBuildersProfiler.astar(world.metrics.aStarPeak);
      snapshotElapsed += realDt;
      if (snapshotElapsed >= 5 && campaign.status === 'play') {
        snapshotElapsed = 0;
        saveLive({ awaySince: null });
      }
    }
    if (contractRunning() && campaign.runMode === 'school' && present && BuildPatternEditor.opened) {
      campaign.levelElapsed += wallDt;
      campaign.totalElapsed += wallDt;
      if (campaign.levelElapsed >= trialLimit(campaign)) failLiveContract();
    }
    const time = clock.elapsedTime;
    let viewStarted = performance.now();
    updatePours();
    if (timeScale !== 20) {
      updatePops(realDt);
      updateSparks(realDt);
      updateFlyCubes(realDt);
      ghostMaterials.forEach(function (material) {
        material.opacity = 0.24 + Math.sin(time * 2.2) * 0.04;
      });
    }
    MicroBuildersProfiler.add('effectsView', performance.now() - viewStarted);
    viewStarted = performance.now();
    updateSticks(time, realDt);
    updateVehicles(realDt);
    MicroBuildersProfiler.add('workersView', performance.now() - viewStarted);
    viewStarted = performance.now();
    updateWorkerPlan(time);
    MicroBuildersProfiler.add('planView', performance.now() - viewStarted);
    viewStarted = performance.now();
    if (timeScale !== 20) {
      updateFeatures(realDt, time);
    }
    MicroBuildersProfiler.add('featuresView', performance.now() - viewStarted);
    viewStarted = performance.now();
    cameraController.update(realDt, campaign ? campaign.status : '');
    if (cityRoot.visible) placeCitySigns();
    updateWorldFx(realDt);
    MicroBuildersProfiler.add('cameraView', performance.now() - viewStarted);
    const renderStarted = performance.now();
    renderer.render(scene, camera);
    MicroBuildersProfiler.add('render', performance.now() - renderStarted);
    MicroBuildersProfiler.count('drawCalls', renderer.info.render.calls);
    MicroBuildersProfiler.count('triangles', renderer.info.render.triangles);
    tickHudFx(realDt);
    hudElapsed += realDt;
    simElapsed += realDt;
    if (world && simElapsed >= SIM_REFRESH_SECONDS) refreshSimEstimate();
    if (campaign && campaign.status !== 'title' && hudElapsed >= 0.25) {
      hudElapsed = 0;
      const hudStarted = performance.now();
      paintHud(true);
      paintDayPop();
      paintLevelInfo();
      MicroBuildersWorkerLog.paint(world, selectedBuilder);
      paintWorkerCard();
      paintCameraButton();
      maybeCameraHint();
      refreshCity();
      refreshPanel();
      MicroBuildersProfiler.add('hudView', performance.now() - hudStarted);
    }
  }

  function consumeEvents() {
    const events = world.events;
    let scaffoldRefreshNeeded = false;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.capital) meta.capital += event.capital;
      if (event.type === 'pour') onPour(event);
      if (event.type === 'place') {
        const placed = Meta.onBlocksPlaced(meta, campaign, world, [event.block]);
        showPlacementRewards(placed);
        floatFinds(placed.finds);
        if (onPlace(event)) scaffoldRefreshNeeded = true;
        noteBuiltTop([event.block]);
      }
      if (event.type === 'vehiclePlaceBatch') {
        const placed = Meta.onBlocksPlaced(meta, campaign, world, event.blocks);
        showPlacementRewards(placed);
        floatFinds(placed.finds);
        if (onVehiclePlaceBatch(event)) scaffoldRefreshNeeded = true;
        noteBuiltTop(event.blocks);
      }
      if (event.type === 'plan' || event.type === 'trip' || event.type === 'tripDone' || event.type === 'abandon') {
        onWorkerEvent(event);
      }
      if (event.type === 'foreman' && event.block) floatForeman(event);
      if (event.type === 'autofill') {
        showPlacementRewards({ expertise: Meta.gainForemanExperience(meta, campaign, world, event.blocks, false) });
        onAutofill(event);
        noteBuiltTop(event.blocks);
      }
      if (event.type === 'foreman') onForemanEvent(event);
      if (event.type === 'upgrade') onUpgradeEvent(event);
      if (event.type === 'retrofitDoor') onRetrofitDoor(event);
      if (event.type === 'scaffold') {
        onScaffold(event);
        if (scaffoldLookup.has(event.ids[0])) {
          revealScaffold(event.ids[0]);
        } else {
          scaffoldRefreshNeeded = true;
        }
      }
      if (event.type === 'strip') scaffoldRefreshNeeded = true;
      if (event.type === 'spawn') syncSticks();
      if (event.type === 'spawnVehicle') syncVehicles();
      if (event.type === 'elevators') syncElevators();
      if (event.type === 'yardOpen') openYard(event);
      if (event.type === 'yardDeck') addYardBoard(event);
      if (event.type === 'yardCube') addYardCube(event);
      if (event.type === 'yardRigClear') clearYardRig(event.vehicle);
      if (event.type === 'yardClear') clearYard(event.vehicle);
      if (event.type === 'blocked') {
        // A stalled school site still spends real time and keeps its attempt.
        if (campaign.runMode === 'school') campaign.status = 'play';
        openBlocked(event);
      }
      if (event.type === 'complete') onLiveComplete();
    }
    if (scaffoldRefreshNeeded) refreshScaffoldView();
    events.length = 0;
    flushScaffold();
  }

  // Foreman triggers: a toast with the portrait in the lane (the same trigger again adds «×N») and
  // the card's avatar in the level strip flashes. «Золотой куб!» and «Джекпот ×10!» get the big
  // popup instead. The golden cube's capital find is granted here whether or not anything shows.
  function onForemanEvent(event) {
    const card = Meta.CARDS[event.card];
    const found = event.card === 'golden' ? Meta.goldenFind(meta, event.block) : 0;
    // A trigger can change what the cards read (the recruiter's extra worker: «1 → 2»).
    hudDirty = true;
    pulseCrew(event.card);
    if (event.card === 'golden' || event.jackpot) {
      showLuckyPop(event, found);
      return;
    }
    let text = '';
    let key = 'foreman:' + event.card;
    if (event.card === 'recruiter') text = '+1 рабочий до конца заказа';
    else if (event.card === 'mechanic') text = '+1 дрон до конца заказа';
    else if (event.card === 'contractor') text = 'Подарок: ' + upgradeName(event.kind) + ' +1';
    else if (event.card === 'lucky' || event.card === 'banker') text = 'Бесплатно: ' + upgradeName(event.kind);
    else if (event.card === 'surveyor') text = 'Этаж готов — бригада +' + Math.round(event.stack * 100) + '% до конца заказа';
    else if (event.card === 'crane') text = 'Кран поставил ' + event.count + ' ' + UI.plural(event.count, 'куб', 'куба', 'кубов');
    if (!text) return;
    // A free or gifted level flashes on its own card («Бесплатно!» / «Подарок!», onUpgradeEvent)
    // and the portrait in the strip flashes: a toast saying the same is only for a card off screen.
    if (event.kind && dockCardShown(event.kind)) return;
    if (event.kind) key += ':' + event.kind;
    UI.toast({
      title: card.name,
      text: text,
      icon: 'icons/icon-foreman-' + event.card + '.jpg?v=3',
      className: 'toast-foreman rarity-' + card.rarity,
      tone: event.free ? 'good' : 'info',
      key: key,
    });
  }

  // A dock card the player can see right now: its tab is open and it is scrolled into the dock.
  function dockCardShown(kind) {
    const button = document.getElementById('up-' + kind);
    const body = document.body.classList;
    if (!button || button.hidden || currentScreen !== 'build' || body.contains('interface-hidden') || body.contains('has-modal')) return false;
    if (!button.closest('.upgrade-group.active')) return false;
    const box = button.getBoundingClientRect();
    const dock = document.getElementById('upgrade-dock').getBoundingClientRect();
    return box.width > 0 && box.right > dock.left + 8 && box.left < dock.right - 8;
  }

  function upgradeName(kind) {
    let name = kind;
    (window.MicroBuildersUpgradeGroups || []).forEach(function (group) {
      group.items.forEach(function (item) { if (item[0] === kind) name = item[1]; });
    });
    return name;
  }

  // «Золотой куб!» / «Джекпот ×10!»: a big popup with the portrait for 1.6 s; more of the same
  // meanwhile add up («Золотой куб ×2!»). At ×20 (no visuals) a gold toast says it instead.
  function showLuckyPop(event, found) {
    const card = Meta.CARDS[event.card];
    const key = event.jackpot ? 'jackpot' : 'golden';
    if (timeScale === 20 || currentScreen !== 'build') {
      UI.toast({
        title: event.jackpot ? 'Джекпот ×' + foremanValueText('number', event.jackpotMultiplier || 10) : 'Золотой куб',
        text: luckyText(event.gained, found),
        icon: 'icons/icon-foreman-' + event.card + '.jpg?v=3',
        className: 'toast-foreman rarity-' + card.rarity,
        tone: 'gold',
        priority: 2,
        key: 'lucky-' + key,
      });
      return;
    }
    const pop = document.getElementById('lucky-pop');
    const fresh = !luckyPop || luckyPop.key !== key || pop.hidden;
    if (fresh) {
      if (luckyPop) clearTimeout(luckyPop.timer);
      luckyPop = { key: key, count: 0, coins: 0, capital: 0, timer: 0 };
    }
    luckyPop.count += 1;
    luckyPop.coins += event.gained || 0;
    luckyPop.capital += found;
    document.getElementById('lucky-pop-img').src = 'icons/icon-foreman-' + event.card + '.jpg?v=3';
    document.getElementById('lucky-pop-title').textContent = event.jackpot
      ? 'Джекпот ×' + foremanValueText('number', event.jackpotMultiplier || 10) + '!'
      : (luckyPop.count > 1 ? 'Золотой куб ×' + luckyPop.count + '!' : 'Золотой куб!');
    document.getElementById('lucky-pop-text').textContent =
      (event.jackpot && luckyPop.count > 1 ? luckyPop.count + ' раза: ' : '') + luckyText(luckyPop.coins, luckyPop.capital);
    pop.hidden = false;
    if (pop.animate) {
      pop.animate([
        { transform: 'scale(' + (fresh ? 0.55 : 1.12) + ')', opacity: fresh ? 0 : 1 },
        { transform: 'scale(1.06)', opacity: 1, offset: 0.6 },
        { transform: 'scale(1)', opacity: 1 },
      ], { duration: 320, easing: 'cubic-bezier(0.2, 1.4, 0.4, 1)' });
    }
    if (timeScale === 1) {
      tone(880, 0.07);
      setTimeout(function () { tone(1320, 0.12); }, 90);
    }
    clearTimeout(luckyPop.timer);
    luckyPop.timer = setTimeout(hideLuckyPop, 1600);
  }

  function luckyText(coins, capital) {
    return '+' + formatShort(coins) + ' монет' + (capital > 0 ? ' · находка +' + capital + ' капитала' : '');
  }

  function hideLuckyPop() {
    const pop = document.getElementById('lucky-pop');
    luckyPop = null;
    if (!pop.animate) {
      pop.hidden = true;
      return;
    }
    pop.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(0.96)' }], { duration: 220 })
      .onfinish = function () { if (!luckyPop) pop.hidden = true; };
  }

  function onPour(event) {
    const record = ensurePour(event.block);
    setPourScale(record, event.block, event.index, 1);
    // A worker's cube pays per mini-cube; its «+N» floats once the whole cube is set (onPlace).
    if (event.gained > 0) {
      const sum = cubeCoins.get(event.block.id) || { coins: 0, lucky: 0, multiplier: 0 };
      sum.coins += event.gained;
      if (event.lucky) {
        sum.lucky += 1;
        sum.multiplier = event.luckyMultiplier;
      }
      cubeCoins.set(event.block.id, sum);
    }
    if (event.capitalCoin) noteCapitalCoin(event.builder);
    if (timeScale !== 20 && event.gained > 0) pulseCoins();
  }

  function onPlace(event) {
    clearPour(event.block.id);
    setBlockVisualScale(blockViews.get(event.block.id), 1, 0.001);
    popBlock(event.block.id);
    if (event.drone) floatDronePlace(event);
    const sum = cubeCoins.get(event.block.id);
    if (sum) {
      cubeCoins.delete(event.block.id);
      const b = event.block;
      if (sum.lucky > 0) floatLucky(b.x + 0.5, b.y + 1.1, b.z + 0.5, sum.multiplier, sum.coins);
      else floatWorldCoins(b.x + 0.5, b.y + 1.1, b.z + 0.5, sum.coins);
    }
    if (timeScale !== 20) {
      burst(event.block.x + 0.5, event.block.y + 0.6, event.block.z + 0.5, MB.MATERIAL[event.block.materialId].color, 7);
    }
    if (timeScale === 1) tone(180 + event.block.y * 18, 0.05);
    const scaffoldChanged = hasAdjacentDeck(event.block);
    if (timeScale !== 20 && event.gained > 0) pulseCoins();
    return scaffoldChanged;
  }

  function onVehiclePlaceBatch(event) {
    let x = 0;
    let y = 0;
    let z = 0;
    let scaffoldChanged = false;
    for (let i = 0; i < event.blocks.length; i++) {
      const block = event.blocks[i];
      clearPour(block.id);
      setBlockVisualScale(blockViews.get(block.id), 1, 0.001);
      popBlock(block.id);
      x += block.x + 0.5;
      y += block.y + 0.5;
      z += block.z + 0.5;
      if (hasAdjacentDeck(block)) scaffoldChanged = true;
    }
    floatVehicleBatch(event, x / event.blocks.length, y / event.blocks.length, z / event.blocks.length);
    if (timeScale !== 20) {
      const count = event.blocks.length;
      burst(
        x / count,
        y / count,
        z / count,
        MB.MATERIAL[event.blocks[0].materialId].color,
        12
      );
    }
    if (timeScale === 1) tone(230, 0.08);
    if (timeScale !== 20 && event.gained > 0) pulseCoins();
    return scaffoldChanged;
  }

  function hasAdjacentDeck(block) {
    const floors = [block.y, block.y + 1];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let floor = 0; floor < floors.length; floor++) {
      for (let i = 0; i < dirs.length; i++) {
        const x = block.x + dirs[i][0];
        const z = block.z + dirs[i][1];
        if (!world.index.inside(x, floors[floor], z)) continue;
        if (world.deckGrid[world.index.id(x, floors[floor], z)] !== 1) continue;
        return true;
      }
    }
    return false;
  }

  function onAutofill(event) {
    for (let i = 0; i < event.blocks.length; i++) {
      clearPour(event.blocks[i].id);
      const record = blockViews.get(event.blocks[i].id);
      setBlockVisualScale(record, 1, 0.001);
    }
  }

  // What a feature sees in a cell (window frames join their neighbours): a window's glass cube
  // stands for its cell, otherwise the cube there.
  function featureBlockAt(x, y, z) {
    const key = MB.cellKey(x, y, z);
    return world.glassByKey.get(key) || world.blockByKey.get(key);
  }

  function onRetrofitDoor(event) {
    const block = event.block;
    const record = blockViews.get(block.id);
    setBlockVisualScale(record, 0.001, 0.001);
    const feature = Features.build(block, {
      parent: levelRoot,
      getBlock: featureBlockAt,
    }, featureState);
    feature.scale.setScalar(1);
    record.feature = feature;
  }

  function hexColor(color) {
    return '#' + color.toString(16).padStart(6, '0');
  }

  function shade(color, amount) {
    const r = Math.round(((color >> 16) & 255) * amount);
    const g = Math.round(((color >> 8) & 255) * amount);
    const b = Math.round((color & 255) * amount);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function materialTexture(spec) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const look = spec.look;
    context.fillStyle = hexColor(spec.color);
    context.fillRect(0, 0, 128, 128);
    if (spec.grid === 1) {
      for (let i = 0; i < 24; i++) {
        context.fillStyle = shade(spec.color, i % 2 === 0 ? 0.94 : 1.06);
        context.fillRect((i * 41) % 128, (i * 23) % 128, 2, 2);
      }
    } else if (look === 'stone' || look === 'sand' || look === 'concrete') {
      for (let i = 0; i < (look === 'concrete' ? 420 : 180); i++) {
        context.fillStyle = i % 3 === 0 ? shade(spec.color, 0.72) : shade(spec.color, 1.18);
        const size = look === 'sand' ? 2 : 3 + (i % 4);
        context.fillRect((i * 37) % 128, (i * 19) % 128, size, size);
      }
    } else if (look === 'wood') {
      for (let y = 0; y < 128; y += 7) {
        context.fillStyle = y % 14 === 0 ? shade(spec.color, 0.72) : shade(spec.color, 1.12);
        context.fillRect(0, y, 128, 3);
      }
      context.strokeStyle = shade(spec.color, 0.55);
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(28, 0);
      context.bezierCurveTo(40, 40, 18, 80, 34, 128);
      context.stroke();
    } else if (look === 'brick') {
      context.fillStyle = shade(spec.color, 0.55);
      context.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 4; row++) {
        const offset = row % 2 === 0 ? 0 : 32;
        for (let col = -1; col < 3; col++) {
          context.fillStyle = row % 2 === 0 ? hexColor(spec.color) : shade(spec.color, 0.9);
          context.fillRect(col * 64 + offset + 3, row * 32 + 3, 58, 26);
        }
      }
    } else if (look === 'metal' || look === 'platinum') {
      for (let i = 0; i < 18; i++) {
        context.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(0, i * 8);
        context.lineTo(128, i * 8 - 24);
        context.stroke();
      }
    } else if (look === 'marble') {
      context.strokeStyle = shade(spec.color, 0.62);
      context.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        context.beginPath();
        context.moveTo(-10, 20 + i * 22);
        context.bezierCurveTo(30, 10 + i * 18, 70, 50 + i * 12, 140, 16 + i * 20);
        context.stroke();
      }
    } else if (look === 'gem') {
      for (let i = 0; i < 7; i++) {
        context.fillStyle = i % 2 === 0 ? shade(spec.color, 1.25) : shade(spec.color, 0.65);
        context.beginPath();
        context.ellipse(20 + (i * 17) % 100, 24 + (i * 29) % 90, 18, 10, i, 0, Math.PI * 2);
        context.fill();
      }
    } else if (look === 'obsidian') {
      context.strokeStyle = 'rgba(210, 180, 255, 0.55)';
      context.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        context.beginPath();
        context.moveTo(10 + i * 18, 0);
        context.lineTo(40 + i * 12, 128);
        context.stroke();
      }
    } else if (look === 'diamond') {
      paintDiamond(context, spec);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function paintFacet(context, x, y, size, fill, stroke) {
    context.fillStyle = fill;
    context.strokeStyle = stroke;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + size / 2, y);
    context.lineTo(x + size, y + size / 2);
    context.lineTo(x + size / 2, y + size);
    context.lineTo(x, y + size / 2);
    context.closePath();
    context.fill();
    context.stroke();
  }

  function paintDiamond(context, spec) {
    const id = spec.id;
    if (id === 'ladder-diamond') {
      paintFacet(context, 16, 8, 96, 'rgba(255,255,255,0.72)', 'rgba(120, 210, 255, 0.95)');
      paintFacet(context, 36, 28, 56, 'rgba(186, 236, 255, 0.55)', 'rgba(255,255,255,0.9)');
    } else if (id === 'ladder-diamond-pure') {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          paintFacet(context, x * 16, y * 16, 16, (x + y) % 2 === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(230,248,255,0.7)', 'rgba(255,255,255,0.95)');
        }
      }
    } else if (id === 'ladder-diamond-black') {
      context.fillStyle = '#12151a';
      context.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 5; i++) {
        paintFacet(context, 8 + i * 22, 18 + (i % 2) * 36, 28, 'rgba(40,48,58,0.9)', 'rgba(230,240,255,0.85)');
      }
    } else if (id === 'ladder-diamond-royal') {
      context.fillStyle = '#f2c14a';
      context.fillRect(0, 0, 128, 128);
      paintFacet(context, 8, 8, 112, 'rgba(255,248,220,0.55)', 'rgba(255,220,120,1)');
      paintFacet(context, 34, 34, 60, 'rgba(255,255,255,0.65)', 'rgba(255,196,64,1)');
    } else if (id === 'ladder-diamond-imperial') {
      context.fillStyle = '#c47a12';
      context.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 3; i++) {
        paintFacet(context, 6 + i * 38, 20, 40, 'rgba(255,214,120,0.75)', 'rgba(255,244,200,0.95)');
        paintFacet(context, 24 + i * 38, 68, 40, 'rgba(255,160,40,0.8)', 'rgba(255,236,180,0.95)');
      }
    } else {
      context.fillStyle = '#fffaf2';
      context.fillRect(0, 0, 128, 128);
      context.strokeStyle = 'rgba(255, 214, 120, 0.95)';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(64, 4);
      context.lineTo(64, 124);
      context.moveTo(4, 64);
      context.lineTo(124, 64);
      context.moveTo(18, 18);
      context.lineTo(110, 110);
      context.moveTo(110, 18);
      context.lineTo(18, 110);
      context.stroke();
      paintFacet(context, 40, 40, 48, 'rgba(255,255,255,0.8)', 'rgba(255, 196, 64, 1)');
    }
  }

  function blockSurface(materialId, ghost) {
    const key = materialId + (ghost ? ':ghost' : '');
    if (blockSurfaceCache[key]) return blockSurfaceCache[key];
    const spec = MB.MATERIAL[materialId];
    const finish = LOOK[spec.look];
    // Window glass is see-through blue in the pile, on the back and while it is being set.
    const glass = spec.look === 'glass';
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: materialTexture(spec),
      roughness: finish.roughness,
      metalness: finish.metalness,
      emissive: spec.look === 'diamond' ? spec.glow : finish.emissive,
      emissiveIntensity: spec.look === 'diamond' ? spec.glowStrength : finish.emissiveIntensity,
      transparent: ghost || glass,
      opacity: ghost ? 0.16 : glass ? 0.8 : 1,
      depthWrite: !ghost && !glass,
    });
    blockSurfaceCache[key] = material;
    return material;
  }

  let materialRow = null;

  function materialLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(20, 16, 12, 0.82)';
    context.fillRect(0, 8, 256, 48);
    context.fillStyle = '#f6efe4';
    context.font = '700 22px Manrope, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(1.6, 0.4, 1);
    return sprite;
  }

  function toggleMaterialRow() {
    const button = document.getElementById('material-row');
    if (materialRow) {
      scene.remove(materialRow);
      materialRow = null;
      button.textContent = 'Материалы';
      return;
    }
    const row = new THREE.Group();
    const ladder = MB.MATERIAL_LADDER;
    const footprint = world.level.footprint;
    const originX = footprint.minX;
    const originZ = footprint.maxZ + 8;
    for (let i = 0; i < ladder.length; i++) {
      const spec = ladder[i];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.96), blockSurface(spec.id, false));
      mesh.position.set(originX + i * 1.45 + 0.5, 1.2, originZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const label = materialLabel(spec.name);
      label.position.set(mesh.position.x, 2.15, originZ);
      row.add(mesh);
      row.add(label);
    }
    scene.add(row);
    materialRow = row;
    button.textContent = 'Скрыть материалы';
    const mid = originX + (ladder.length - 1) * 1.45 * 0.5;
    cameraController.framePoint(mid, 1.2, originZ, 28);
  }

  function buildLevelView() {
    simEstimate = null;
    disposeLevel();
    const level = world.level;
    const footprint = level.footprint;
    const cx = (footprint.minX + footprint.maxX) / 2 + 0.5;
    const cz = (footprint.minZ + footprint.maxZ) / 2 + 0.5;
    // The site ground: trodden earth, darker in the middle, its edge fading softly into the grass.
    const padRadius = Math.max(footprint.maxX - footprint.minX, footprint.maxZ - footprint.minZ) * 0.85 + 4;
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(padRadius * 1.18, 64),
      new THREE.MeshStandardMaterial({ map: groundPatchTexture('site'), transparent: true, depthWrite: false, roughness: 1 })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(cx, 0.02, cz);
    pad.receiveShadow = true;
    levelRoot.add(pad);
    addScenery(level, cx, cz, padRadius);

    const buckets = {};
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (block.feature) continue;
      if (!buckets[block.materialId]) buckets[block.materialId] = [];
      buckets[block.materialId].push(block);
    }
    solidMeshes = [];
    ghostMaterials = [];
    ghostMeshes = [];
    Object.keys(buckets).forEach(function (materialId) {
      const list = buckets[materialId];
      const solidMat = blockSurface(materialId, false);
      const ghostMat = blockSurface(materialId, true);
      ghostMaterials.push(ghostMat);
      const geo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
      const solid = new THREE.InstancedMesh(geo, solidMat, list.length);
      const ghost = new THREE.InstancedMesh(geo, ghostMat, list.length);
      solid.castShadow = true;
      solid.receiveShadow = true;
      solid.frustumCulled = false;
      ghost.castShadow = false;
      ghost.frustumCulled = false;
      ghost.visible = ghostsOn;
      ghostMeshes.push(ghost);
      for (let i = 0; i < list.length; i++) {
        const block = list[i];
        dummy.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
        dummy.scale.setScalar(0.001);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        solid.setMatrixAt(i, dummy.matrix);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        ghost.setMatrixAt(i, dummy.matrix);
        blockViews.set(block.id, { solid: solid, ghost: ghost, index: i });
      }
      solid.instanceMatrix.needsUpdate = true;
      ghost.instanceMatrix.needsUpdate = true;
      levelRoot.add(solid);
      levelRoot.add(ghost);
      solidMeshes.push(solid);
    });

    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (!block.feature) continue;
      const feature = Features.build(block, {
        parent: levelRoot,
        getBlock: featureBlockAt,
      }, featureState);
      const record = blockViews.get(block.id);
      if (record) {
        record.feature = feature;
        continue;
      }
      // Window glass: no ghost of its own (its wall cube has one); once set, the window replaces it.
      if (block.glassOf !== undefined) {
        blockViews.set(block.id, { feature: feature, wall: blockViews.get(block.glassOf) });
        continue;
      }
      const ghostMaterial = blockSurface(block.materialId, true);
      const ghost = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.96), ghostMaterial);
      ghost.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
      ghost.visible = ghostsOn;
      levelRoot.add(ghost);
      ghostMaterials.push(ghostMaterial);
      ghostMeshes.push(ghost);
      blockViews.set(block.id, { feature: feature, ghostObject: ghost });
    }

    for (let i = 0; i < world.blocks.length; i++) {
      if (world.blocks[i].built) setBlockVisualScale(blockViews.get(world.blocks[i].id), 1, 0.001);
    }

    for (let i = 0; i < level.mines.length; i++) addMine(level.mines[i], cx, cz);
    buildScaffoldView();
    setSiteCamera(level, cx, cz);
    syncSticks();
    syncVehicles();
    syncElevators();
    paintLevelInfo();
    applySceneLighting();
  }

  // ---------- camera (docs/tech/camera.md, «Подключение в game.js») ----------
  // Camera key of the site on screen: its slot, run and level, so a view is never restored on another site.
  function siteCameraKey() {
    if (!campaign) return 'site:none';
    const payload = campaign.runPayload;
    return 'site:' + Meta.siteKey(campaign.runMode) + ':' + campaign.runMode + ':' + (payload && payload.projectId ? payload.projectId : campaign.levelIndex);
  }

  // Site bounds for the level just built, with what is already built (offline progress, restores).
  // The camera lands at home; launches, switches and returns then fly in or restore their own view.
  // While the city is on screen the city camera stays; hideCity brings the site view back.
  function setSiteCamera(level, cx, cz) {
    siteBuiltTop = 0;
    for (let i = 0; i < world.blocks.length; i++) {
      if (world.blocks[i].built) siteBuiltTop = Math.max(siteBuiltTop, world.blocks[i].y + 1);
    }
    const bounds = MicroBuildersCamera.siteBounds(level, cx, cz);
    bounds.key = siteCameraKey();
    bounds.builtTop = siteBuiltTop;
    cameraController.setBounds(bounds);
    cameraController.setActivity({ builtTop: siteBuiltTop });
    if (cityRoot.visible) cameraController.setMode('city');
    else cameraController.frameHome();
  }

  // The view the player left on this site, if any (switches and returns from the HQ).
  function restoreSiteCamera(opts) {
    const saved = cameraStates.site[siteCameraKey()];
    return !!saved && cameraController.restoreState(saved, opts);
  }

  // Entering a new site (or one without a remembered view): a short fly-in onto its home.
  function introSiteCamera() {
    delete cameraStates.site[siteCameraKey()];
    if (cityRoot.visible) return;
    refreshSafeArea({ snap: true });
    cameraController.frameHome({ intro: true });
  }

  // Auto-follow of the growing floor: the top of the highest placed cube, reported only when it rises.
  function noteBuiltTop(blocks) {
    let top = siteBuiltTop;
    for (let i = 0; i < blocks.length; i++) top = Math.max(top, blocks[i].y + 1);
    if (top === siteBuiltTop) return;
    siteBuiltTop = top;
    cameraController.setActivity({ builtTop: top });
  }

  // Sun, shadow box, fog and ground sized from the active camera bounds (site or city) and the
  // zoom range, so zooming out to maxDistance never greys the building. Re-run after resize and
  // safe-area changes: maxDistance depends on the screen shape.
  function applySceneLighting() {
    const info = cameraController.getBounds();
    if (!info) return;
    const reach = info.radius + 6;
    const cx = info.center.x;
    const cz = info.center.z;
    sun.target.position.set(cx, 0, cz);
    sun.position.set(cx + reach * 0.7, reach * 1.15, cz + reach * 0.35);
    sun.shadow.camera.left = -reach;
    sun.shadow.camera.right = reach;
    sun.shadow.camera.top = reach;
    sun.shadow.camera.bottom = -reach;
    sun.shadow.camera.far = Math.max(160, reach * 2.8);
    sun.shadow.camera.updateProjectionMatrix();
    scene.fog.near = cameraController.maxDistance + reach * 0.5;
    scene.fog.far = scene.fog.near + reach * 3;
    // The grass disc reaches past the farthest zoom, and its texture keeps the same grain.
    const ground = Math.min(175, Math.max(90, cameraController.maxDistance + reach + 30)) / 90;
    grass.scale.set(ground, ground, 1);
    grass.material.map.repeat.set(18 * ground, 18 * ground);
  }

  // Free band between the top HUD and the dock / nav (or, in the HQ, between the company wallet and
  // the card) in stage px. Bars spanning half the stage count at the top and bottom; narrower ones
  // (the landscape nav rail, the city card as a side sheet) are side insets, so the scene centres
  // right of them. In the HQ it also records the wallet pills and the site chip for the signs.
  function measureSafeArea() {
    const body = document.body;
    const area = { top: 0, bottom: 0, left: 0, right: 0 };
    cityCovers = [];
    if (!body.classList.contains('playing') || body.classList.contains('interface-hidden')) return area;
    const scale = MicroBuildersStage.scale() || 1;
    const viewRect = view.getBoundingClientRect();
    const minWidth = MicroBuildersStage.width() * 0.5;
    const city = currentScreen === 'hq' && cityRoot.visible;
    function bar(selector, wide) {
      const el = document.querySelector(selector);
      if (!el || el.hidden) return null;
      const rect = el.getBoundingClientRect();
      if (rect.height < 1 || rect.width < 1 || (wide && rect.width / scale < minWidth)) return null;
      return rect;
    }
    function cover(rect) {
      if (rect && rect.width >= 1) {
        cityCovers.push({
          left: (rect.left - viewRect.left) / scale, right: (rect.right - viewRect.left) / scale,
          top: (rect.top - viewRect.top) / scale, bottom: (rect.bottom - viewRect.top) / scale,
        });
      }
    }
    (city ? ['#city-wallet', '#site-chip'] : ['#hud .top']).forEach(function (selector) {
      const rect = bar(selector, false);
      if (rect) area.top = Math.max(area.top, (rect.bottom - viewRect.top) / scale);
    });
    (city ? ['#city-card', '#app-nav'] : ['#hud .bottom', '#app-nav']).forEach(function (selector) {
      const rect = bar(selector, false);
      if (!rect) return;
      if (rect.width / scale >= minWidth) {
        area.bottom = Math.max(area.bottom, (viewRect.bottom - rect.top) / scale);
      } else if (selector === '#hud .bottom') {
        // A collapsed dock in a corner is not a bar.
      } else if ((rect.left + rect.right) / 2 < (viewRect.left + viewRect.right) / 2) {
        area.left = Math.max(area.left, (rect.right - viewRect.left) / scale);
      } else {
        area.right = Math.max(area.right, (viewRect.right - rect.left) / scale);
      }
    });
    if (city) {
      // The wallet bar spans the stage; only its pills cover anything.
      const pills = document.querySelectorAll('#city-wallet .pill');
      if (pills.length && bar('#city-wallet', false)) {
        const first = pills[0].getBoundingClientRect();
        const last = pills[pills.length - 1].getBoundingClientRect();
        cover({ left: first.left, right: last.right, top: Math.min(first.top, last.top), bottom: Math.max(first.bottom, last.bottom), width: last.right - first.left });
      }
      cover(bar('#site-chip', false));
    }
    ['top', 'bottom', 'left', 'right'].forEach(function (side) { area[side] = Math.max(0, Math.round(area[side])); });
    return area;
  }

  function refreshSafeArea(opts) {
    safeAreaQueued = false;
    const area = measureSafeArea();
    const key = area.top + ',' + area.bottom + ',' + area.left + ',' + area.right;
    if (key === safeAreaKey && !(opts && opts.snap)) return;
    safeAreaKey = key;
    cameraController.setSafeArea(area, opts);
    applySceneLighting();
  }

  function queueSafeArea() {
    if (safeAreaQueued) return;
    safeAreaQueued = true;
    Promise.resolve().then(function () { if (safeAreaQueued) refreshSafeArea(); });
  }

  // The HUD bars resize (dock collapse, panels, the city card) and body classes switch layouts
  // (city view, hidden interface, title, away): both re-measure the band once per change.
  function watchSafeArea() {
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(queueSafeArea);
      ['#hud .top', '#hud .bottom', '#app-nav', '#city-wallet', '#site-chip', '#city-card'].forEach(function (selector) {
        const el = document.querySelector(selector);
        if (el) observer.observe(el);
      });
    }
    if (window.MutationObserver) {
      new MutationObserver(queueSafeArea).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // «◎» while the camera is away from home: back to the site, in the HQ to the whole quarter. A lot
  // card has its own «×» for that (and the reveal flight is not the player's), so the HQ shows it
  // only over the overview card.
  function paintCameraButton() {
    const button = document.getElementById('camera-home');
    const city = currentScreen === 'hq' && cityRoot.visible;
    const cityFree = city && !cityBuilding && !cityReveal;
    const show = !!campaign && campaign.status !== 'title' && (currentScreen === 'build' || cityFree) &&
      !cameraController.isWorkerView() && cameraController.isAwayFromHome();
    if (button.hidden === !show) return;
    button.hidden = !show;
    const label = city ? 'Весь квартал' : 'Вернуть камеру';
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function recenterCamera() {
    if (currentScreen === 'hq' && cityRoot.visible) {
      closeCityCard();
      return;
    }
    cameraController.frameHome({ animate: true });
    paintCameraButton();
  }

  // One-time hint on how to move the camera (localStorage, not the company save).
  function maybeCameraHint() {
    if (cameraHintChecked || currentScreen !== 'build' || !campaign || campaign.status !== 'play') return;
    if (document.body.classList.contains('has-modal')) return;
    cameraHintChecked = true;
    try {
      if (window.localStorage.getItem('mb.cameraHint')) return;
      window.localStorage.setItem('mb.cameraHint', '1');
    } catch (error) {
      return;
    }
    const desktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    cameraHint = UI.toast({
      text: desktop
        ? 'Тяните мышью или листайте тачпадом: влево-вправо — облёт, вверх-вниз — этажи. Щипок или колесо — масштаб. Двойной клик — вернуть вид.'
        : 'Ведите пальцем: влево-вправо — облёт, вверх-вниз — этажи. Два пальца — приблизить. Двойной тап — вернуть вид.',
      icon: 'eye',
      key: 'camera-hint',
      priority: 0,
      duration: 9000,
    });
  }

  function onCameraInteract(kind) {
    if (cameraHint) {
      cameraHint.close();
      cameraHint = null;
    }
    // Double tap / F in the HQ: the controller flies back to the quarter, the lot card goes with it.
    if (kind === 'home' && currentScreen === 'hq' && cityRoot.visible && cityBuilding && !cityReveal) clearCitySelection();
  }

  function addMine(mine, cx, cz) {
    const material = MB.MATERIAL[mine.materialId];
    const group = new THREE.Group();
    for (let i = 0; i < mine.rocks.length; i++) {
      const rock = mine.rocks[i];
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.46 + (i % 3) * 0.06, 0),
        blockSurface(mine.materialId, false)
      );
      mesh.position.set(rock.x + 0.5, rock.y + 0.32, rock.z + 0.5);
      mesh.scale.y = 0.82;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    const label = makeLabel(material.name);
    label.position.set(mine.x + 0.5, 2.7, mine.z + 0.5);
    group.add(label);
    // A patch of gravel in the stone's colour under the pile, soft at the edge.
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 32),
      new THREE.MeshStandardMaterial({ map: groundPatchTexture('gravel'), color: new THREE.Color(material.color).lerp(new THREE.Color(0xb8ac98), 0.55), transparent: true, depthWrite: false, roughness: 1 })
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(mine.x + 0.5, 0.03, mine.z + 0.5);
    patch.receiveShadow = true;
    group.add(patch);
    levelRoot.add(group);
  }

  // Soft-edged ground decals, made once: 'site' — earth with grain, darker in the middle;
  // 'gravel' — light speckled grey (tinted by the material colour) for the quarry piles.
  function groundPatchTexture(kind) {
    const cache = groundPatchTexture.cache || (groundPatchTexture.cache = {});
    if (cache[kind]) return cache[kind];
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const c = size / 2;
    const fill = context.createRadialGradient(c, c, 0, c, c, c);
    if (kind === 'site') {
      fill.addColorStop(0, 'rgba(164, 138, 98, 1)');
      fill.addColorStop(0.55, 'rgba(196, 172, 132, 1)');
      fill.addColorStop(0.8, 'rgba(198, 176, 137, 0.95)');
      fill.addColorStop(1, 'rgba(198, 176, 137, 0)');
    } else {
      fill.addColorStop(0, 'rgba(255, 255, 255, 1)');
      fill.addColorStop(0.6, 'rgba(240, 240, 240, 0.9)');
      fill.addColorStop(1, 'rgba(230, 230, 230, 0)');
    }
    context.fillStyle = fill;
    context.fillRect(0, 0, size, size);
    // Grain: small darker and lighter specks, only where the patch is solid.
    context.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < (kind === 'site' ? 1400 : 900); i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * c;
      const dark = Math.random() < 0.5;
      context.fillStyle = kind === 'site'
        ? (dark ? 'rgba(120, 98, 66, 0.35)' : 'rgba(226, 206, 168, 0.35)')
        : (dark ? 'rgba(90, 90, 90, 0.45)' : 'rgba(255, 255, 255, 0.5)');
      const d = kind === 'site' ? 2 : 3;
      context.fillRect(c + Math.cos(a) * r, c + Math.sin(a) * r, d, d);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    cache[kind] = texture;
    return texture;
  }

  // The far plan: a loose ring of low-poly trees and gentle green hills outside the site, so the
  // grass ends at a horizon instead of an empty fog. Seeded by the level, so it never jumps.
  function addScenery(level, cx, cz, padRadius) {
    let reach = padRadius;
    for (let i = 0; i < level.mines.length; i++) {
      reach = Math.max(reach, Math.hypot(level.mines[i].x + 0.5 - cx, level.mines[i].z + 0.5 - cz) + 3);
    }
    let seed = (level.index || 0) * 9301 + 49297;
    const rand = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), 90);
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.24, 1, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }), 90);
    const green = [0x4f7a3a, 0x5e8a42, 0x45703a, 0x6a9449];
    const color = new THREE.Color();
    let n = 0;
    for (let i = 0; i < 90; i++) {
      const a = rand() * Math.PI * 2;
      const r = reach + 10 + rand() * 26;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const h = 2.2 + rand() * 2.4;
      const w = 0.9 + rand() * 0.7;
      dummy.position.set(x, 0.55 * h * 0.35 + h * 0.5, z);
      dummy.quaternion.identity();
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      crowns.setMatrixAt(n, dummy.matrix);
      crowns.setColorAt(n, color.setHex(green[Math.floor(rand() * green.length)]));
      dummy.position.set(x, h * 0.2, z);
      dummy.scale.set(1, h * 0.4, 1);
      dummy.updateMatrix();
      trunks.setMatrixAt(n, dummy.matrix);
      n += 1;
    }
    // Instances spread far from the geometry's own bounds: never cull them as one small box.
    crowns.frustumCulled = false;
    trunks.frustumCulled = false;
    crowns.castShadow = true;
    crowns.receiveShadow = true;
    trunks.castShadow = true;
    levelRoot.add(crowns, trunks);
    const hills = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), 14);
    const hillGreen = [0x6f9a52, 0x7aa35a, 0x668f4b];
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + rand() * 0.3;
      const r = reach + 44 + rand() * 22;
      const size = 9 + rand() * 9;
      dummy.position.set(cx + Math.cos(a) * r, -size * 0.55, cz + Math.sin(a) * r);
      dummy.quaternion.identity();
      dummy.scale.set(size * 1.6, size, size * 1.3);
      dummy.updateMatrix();
      hills.setMatrixAt(i, dummy.matrix);
      hills.setColorAt(i, color.setHex(hillGreen[i % hillGreen.length]));
    }
    hills.frustumCulled = false;
    hills.receiveShadow = true;
    levelRoot.add(hills);
  }

  function syncSticks() {
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      const homeKey = MB.cellKey(builder.homeCell[0], builder.homeCell[1], builder.homeCell[2]);
      if (builder.trade !== 'engineer' && !planningDesks.has(homeKey)) {
        addPlanningDesk(builder.homeCell);
        planningDesks.add(homeKey);
      }
      if (stickViews.has(builder)) continue;
      if (builder.trade === 'engineer') addDronePad(builder.homeCell);
      const look = rankLook(builder.expertiseRank);
      const group = builder.trade === 'engineer' ? createDrone() : createStick(builder.shirt, look ? look.vest : null, look ? look.size : 1);
      group.userData.builder = builder;
      levelRoot.add(group);
      stickViews.set(builder, {
        group: group,
        badge: createWorkerBadge(builder.trade === 'engineer'),
        load: { kg: 0, capacity: 0, fill: 0, overload: 1 },
        gait: 0,
        carryVersion: -1,
        carryCap: -1,
        carryColor: 0,
        lastTripCoins: 0,
        capitalCoins: 0,
        planEvent: null, // the 'plan' event waiting for its trip in the same batch
      });
    }
  }

  function syncVehicles() {
    for (let i = 0; i < world.vehicles.length; i++) {
      const vehicle = world.vehicles[i];
      if (vehicleViews.has(vehicle)) continue;
      const group = vehicle.kind === 'heli' ? createHeliView() : createVehicleView();
      group.userData.displayX = vehicle.cell[0] + 0.5;
      group.userData.displayZ = vehicle.cell[2] + 0.5;
      group.position.set(group.userData.displayX, 0, group.userData.displayZ);
      levelRoot.add(group);
      vehicleViews.set(vehicle, group);
    }
  }

  function vehicleBox(parent, material, size, position) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function vehicleCylinder(parent, material, radius, length, position, axis) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14), material);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Mobile crane: chassis with steering front wheels, cab, rotating turret with a telescopic boom,
  // outriggers that drop to the ground while lifting, and a hook on a cable.
  function createVehicleView() {
    const group = new THREE.Group();
    const m = machineMat;
    vehicleBox(group, m.dark, [1.1, 0.18, 1.9], [0, 0.36, 0]);
    vehicleBox(group, m.yellow, [1.16, 0.3, 1.5], [0, 0.6, -0.1]);
    vehicleBox(group, m.stripe, [1.18, 0.06, 0.06], [0, 0.48, 0.66]);
    vehicleBox(group, m.yellow, [0.52, 0.5, 0.56], [-0.3, 0.98, 0.58]);
    vehicleBox(group, m.dark, [0.56, 0.05, 0.6], [-0.3, 1.25, 0.58]);
    vehicleBox(group, m.glass, [0.46, 0.32, 0.02], [-0.3, 1.02, 0.865]);
    vehicleBox(group, m.glass, [0.02, 0.3, 0.42], [-0.565, 1.02, 0.58]);
    vehicleBox(group, m.dark, [1.0, 0.36, 0.3], [0, 0.72, -0.86]);
    vehicleCylinder(group, m.dark, 0.035, 0.42, [0.42, 1.0, -0.62], 'y');
    const lights = [];
    for (let side = -1; side <= 1; side += 2) {
      lights.push(vehicleBox(group, m.light, [0.14, 0.08, 0.03], [side * 0.42, 0.6, 0.855]));
    }
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0xff8a1c, emissive: 0xff6a00, emissiveIntensity: 0.2 })
    );
    beacon.position.set(-0.3, 1.31, 0.58);
    group.add(beacon);
    const wheels = [];
    const steer = [];
    for (let end = -1; end <= 1; end += 2) {
      for (let side = -1; side <= 1; side += 2) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.6, 0.27, end * 0.62);
        const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.2, 16), m.tyre);
        tyre.rotation.z = Math.PI / 2;
        tyre.castShadow = true;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.21, 10), m.steel);
        rim.rotation.z = Math.PI / 2;
        const spin = new THREE.Group();
        spin.add(tyre, rim);
        pivot.add(spin);
        group.add(pivot);
        wheels.push(spin);
        if (end > 0) steer.push(pivot);
      }
    }
    const outriggers = [];
    for (let end = -1; end <= 1; end += 2) {
      for (let side = -1; side <= 1; side += 2) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.6, 0.42, end * 0.9);
        const beam = vehicleBox(leg, m.yellow, [0.3, 0.08, 0.1], [side * 0.15, 0, 0]);
        const foot = vehicleBox(leg, m.dark, [0.08, 0.36, 0.08], [side * 0.28, -0.18, 0]);
        const pad = vehicleBox(leg, m.dark, [0.18, 0.03, 0.18], [side * 0.28, -0.36, 0]);
        leg.userData = { side: side, beam: beam, foot: foot, pad: pad };
        group.add(leg);
        outriggers.push(leg);
      }
    }
    // Tower crane rig: turret → vertical mast → horizontal jib (with counter-jib) → trolley → cable → hook.
    const turret = new THREE.Group();
    turret.position.set(MB.CRANE.turretX, MB.CRANE.turretY, MB.CRANE.turretZ);
    group.add(turret);
    vehicleCylinder(turret, m.dark, 0.3, 0.12, [0, 0.06, 0], 'y');
    vehicleBox(turret, m.yellow, [0.4, 0.3, 0.44], [0, 0.27, -0.04]);
    const mast = vehicleBox(turret, m.yellow, [0.2, 1, 0.2], [0, 0.5, 0]);
    const mastInner = vehicleBox(turret, m.steel, [0.13, 1, 0.13], [0, 0.5, 0]);
    const head = new THREE.Group();
    turret.add(head);
    vehicleBox(head, m.dark, [0.26, 0.16, 0.26], [0, 0.04, 0]);
    const jib = vehicleBox(head, m.yellow, [0.16, 0.14, 1], [0, 0.12, 0.5]);
    vehicleBox(head, m.yellow, [0.14, 0.12, 0.55], [0, 0.12, -0.3]);
    vehicleBox(head, m.dark, [0.26, 0.2, 0.18], [0, 0.08, -0.55]);
    const trolley = vehicleBox(head, m.dark, [0.2, 0.08, 0.16], [0, 0.02, 1]);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), m.dark);
    head.add(cable);
    const hook = new THREE.Group();
    vehicleBox(hook, m.yellow, [0.22, 0.16, 0.14], [0, 0.04, 0]);
    vehicleBox(hook, m.dark, [0.05, 0.16, 0.05], [0, -0.1, 0]);
    head.add(hook);
    const payload = new THREE.Group();
    payload.visible = false;
    hook.add(payload);
    group.userData = {
      wheels: wheels,
      steer: steer,
      outriggers: outriggers,
      deploy: 0,
      steerAngle: 0,
      lastHeading: 0,
      turret: turret,
      mast: mast,
      mastInner: mastInner,
      head: head,
      jib: jib,
      trolley: trolley,
      cable: cable,
      hook: hook,
      beacon: beacon,
      payload: payload,
      payloadSignature: '',
      target: new THREE.Vector3(),
      payloadQuaternion: new THREE.Quaternion(),
      displayX: 0,
      displayZ: 0,
      heading: 0,
    };
    return group;
  }

  // Cargo helicopter: tilting body with canopy, tail boom and tail rotor, skids, two-blade main
  // rotor; the winch cable hangs from the fixed mount so the hook math stays level.
  function createHeliView() {
    const group = new THREE.Group();
    const m = machineMat;
    const body = new THREE.Group();
    group.add(body);
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.9, 6, 14), m.heli);
    hull.rotation.x = Math.PI / 2;
    hull.position.set(0, 0.45, 0.05);
    hull.castShadow = true;
    body.add(hull);
    const belly = vehicleBox(body, m.heliWhite, [0.5, 0.12, 1.1], [0, 0.18, 0.05]);
    belly.castShadow = true;
    const canopy = vehicleBox(body, m.glass, [0.5, 0.26, 0.34], [0, 0.56, 0.58]);
    canopy.rotation.x = -0.35;
    vehicleBox(body, m.heliWhite, [0.52, 0.04, 0.5], [0, 0.72, 0.32]);
    const boomTail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 1.3, 10), m.heli);
    boomTail.rotation.x = Math.PI / 2;
    boomTail.position.set(0, 0.55, -1.0);
    boomTail.castShadow = true;
    body.add(boomTail);
    vehicleBox(body, m.heliWhite, [0.04, 0.42, 0.26], [0, 0.78, -1.58]);
    vehicleBox(body, m.heli, [0.5, 0.04, 0.16], [0, 0.6, -1.45]);
    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.07, 0.72, -1.6);
    vehicleBox(tailRotor, m.dark, [0.02, 0.5, 0.06], [0, 0, 0]);
    vehicleBox(tailRotor, m.dark, [0.02, 0.06, 0.5], [0, 0, 0]);
    body.add(tailRotor);
    for (let side = -1; side <= 1; side += 2) {
      vehicleCylinder(body, m.dark, 0.03, 1.3, [side * 0.34, 0.02, 0.05], 'z');
      vehicleBox(body, m.dark, [0.03, 0.2, 0.03], [side * 0.3, 0.1, 0.35]);
      vehicleBox(body, m.dark, [0.03, 0.2, 0.03], [side * 0.3, 0.1, -0.25]);
    }
    vehicleCylinder(body, m.dark, 0.06, 0.18, [0, 0.86, 0.05], 'y');
    const rotor = new THREE.Group();
    rotor.position.set(0, 0.96, 0.05);
    vehicleBox(rotor, m.dark, [2.7, 0.025, 0.12], [0, 0, 0]);
    vehicleBox(rotor, m.dark, [0.12, 0.025, 2.7], [0, 0, 0]);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.35, 32), m.blur);
    disc.rotation.x = -Math.PI / 2;
    rotor.add(disc);
    body.add(rotor);
    vehicleBox(body, m.dark, [0.16, 0.12, 0.16], [0, 0.08, 0.05]);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), m.dark);
    cable.position.y = 0.2;
    group.add(cable);
    const hook = new THREE.Group();
    vehicleBox(hook, m.yellow, [0.22, 0.14, 0.14], [0, 0.04, 0]);
    vehicleBox(hook, m.dark, [0.05, 0.16, 0.05], [0, -0.1, 0]);
    group.add(hook);
    const payload = new THREE.Group();
    payload.position.y = -0.8;
    payload.visible = false;
    group.add(payload);
    group.userData = {
      wheels: [],
      body: body,
      rotor: rotor,
      tailRotor: tailRotor,
      cable: cable,
      hook: hook,
      payload: payload,
      payloadSignature: '',
      target: new THREE.Vector3(),
      payloadQuaternion: new THREE.Quaternion(),
      displayX: 0,
      displayZ: 0,
      heading: 0,
      pitch: 0,
      roll: 0,
      lastHeading: 0,
      heli: true,
    };
    return group;
  }

  function sceneRoots() {
    if (!yardRoot) {
      yardRoot = new THREE.Group();
      levelRoot.add(yardRoot);
    }
    if (!elevatorRoot) {
      elevatorRoot = new THREE.Group();
      levelRoot.add(elevatorRoot);
    }
  }

  function syncElevators() {
    if (!world) return;
    sceneRoots();
    while (elevatorRoot.children.length > 0) {
      const child = elevatorRoot.children[0];
      child.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
      });
      elevatorRoot.remove(child);
    }
    const pads = world.elevatorPads || [];
    const floors = MB.upgradeValue(world.campaign, 'elevatorHeight', world.campaign.purchases.elevatorHeight);
    const wall = new THREE.MeshStandardMaterial({ color: 0x6e787f, roughness: 0.72, metalness: 0.22 });
    const exitDoor = new THREE.MeshStandardMaterial({ color: 0xd7c4a2, roughness: 0.55, metalness: 0.08 });
    const enterDoor = new THREE.MeshStandardMaterial({ color: 0x2e3438, roughness: 0.6, metalness: 0.18 });
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      const group = new THREE.Group();
      const height = floors + 1;
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(3, height, 3), wall);
      shaft.position.set(pad.x + 1.5, height / 2, pad.z + 1.5);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      group.add(shaft);
      for (let floor = 0; floor < floors; floor++) {
        group.add(elevatorOpening(pad, pad.exitX, pad.exitZ, floor, exitDoor));
        group.add(elevatorOpening(pad, pad.enterX, pad.enterZ, floor, enterDoor));
      }
      elevatorRoot.add(group);
    }
  }

  function elevatorOpening(pad, cellX, cellZ, floor, material) {
    const dx = cellX + 0.5 - (pad.x + 1.5);
    const dz = cellZ + 0.5 - (pad.z + 1.5);
    const alongX = Math.abs(dx) >= Math.abs(dz);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? 0.08 : 0.7, 0.7, alongX ? 0.7 : 0.08),
      material
    );
    mesh.position.set(
      alongX ? pad.x + (dx > 0 ? 3 : 0) : cellX + 0.5,
      floor + 0.55,
      alongX ? cellZ + 0.5 : pad.z + (dz > 0 ? 3 : 0)
    );
    return mesh;
  }

  function yardGroup(vehicle) {
    sceneRoots();
    let group = yardRoot.getObjectByName('yard-' + vehicle.index);
    if (!group) {
      group = new THREE.Group();
      group.name = 'yard-' + vehicle.index;
      yardRoot.add(group);
    }
    return group;
  }

  function openYard(event) {
    const group = yardGroup(event.vehicle);
    while (group.children.length > 0) group.remove(group.children[0]);
    const yard = event.yard;
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.8 });
    const post = new THREE.BoxGeometry(0.12, 1.2, 0.12);
    const corners = [
      [yard.x, yard.z],
      [yard.x + yard.width, yard.z],
      [yard.x, yard.z + yard.width],
      [yard.x + yard.width, yard.z + yard.width],
    ];
    for (let i = 0; i < corners.length; i++) {
      const mesh = new THREE.Mesh(post, wood);
      mesh.position.set(corners[i][0], 0.6, corners[i][1]);
      group.add(mesh);
    }
  }

  function addYardBoard(event) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.08, 0.92),
      new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.9 })
    );
    mesh.position.set(event.x + 0.5, event.y + 0.04, event.z + 0.5);
    mesh.name = 'deck-' + event.vehicle;
    yardRoot.add(mesh);
  }

  function addYardCube(event) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      blockSurface(event.materialId, false)
    );
    mesh.position.set(event.x + 0.5, event.y + 0.5, event.z + 0.5);
    mesh.name = 'pattern-' + event.vehicle;
    mesh.userData.rest = mesh.position.clone();
    yardRoot.add(mesh);
  }

  function clearYardRig(vehicle) {
    if (!yardRoot) return;
    const fence = yardRoot.getObjectByName('yard-' + vehicle.index);
    if (fence) yardRoot.remove(fence);
    for (let i = yardRoot.children.length - 1; i >= 0; i--) {
      const child = yardRoot.children[i];
      if (child.name === 'deck-' + vehicle.index) yardRoot.remove(child);
    }
  }

  function clearYard(vehicle) {
    clearYardRig(vehicle);
    if (!yardRoot) return;
    for (let i = yardRoot.children.length - 1; i >= 0; i--) {
      const child = yardRoot.children[i];
      if (child.name === 'pattern-' + vehicle.index) yardRoot.remove(child);
    }
  }

  function patternMeshes(vehicle) {
    if (!yardRoot) return [];
    const meshes = [];
    for (let i = 0; i < yardRoot.children.length; i++) {
      const child = yardRoot.children[i];
      if (child.name === 'pattern-' + vehicle.index) meshes.push(child);
    }
    return meshes;
  }

  function mountWorld(group, vehicle) {
    return group.localToWorld(new THREE.Vector3(0, 0.05, 0));
  }

  function patternAnchor(vehicle, atDest) {
    const x = atDest ? vehicle.destMinX : vehicle.yard.x;
    const y = atDest ? vehicle.destMinY : 0;
    const z = atDest ? vehicle.destMinZ : vehicle.yard.z;
    return new THREE.Vector3(
      x + vehicle.patternSpanX / 2 + 0.5,
      y + vehicle.patternMaxY + 1,
      z + vehicle.patternSpanZ / 2 + 0.5
    );
  }

  function smoothStep(t) {
    const x = t < 0 ? 0 : t > 1 ? 1 : t;
    return x * x * (3 - 2 * x);
  }

  function hookWorld(group, vehicle) {
    if (vehicle.kind === 'heli') {
      const mount = mountWorld(group, vehicle);
      const stow = mount.clone();
      stow.y -= window.MicroBuildersBalance.tuning.machines.stowDrop;
      if (!vehicle.yard) return stow;
      const yard = patternAnchor(vehicle, false);
      const dest = patternAnchor(vehicle, true);
      const hung = mount.clone();
      hung.y -= vehicle.cableLength;
      if (vehicle.phase === 'hook') return stow.lerp(yard, smoothStep(vehicle.hookT));
      if (vehicle.phase === 'lift' || (vehicle.carried && vehicle.phase !== 'lower')) return hung;
      if (vehicle.phase === 'lower') return hung.lerp(dest, smoothStep(vehicle.hookT));
      return stow;
    }
    return group.userData.hook.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.12, 0));
  }

  function drawLink(group, cable, hook, fromWorld, toWorld) {
    group.updateWorldMatrix(true, false);
    const a = group.worldToLocal(fromWorld.clone());
    const b = group.worldToLocal(toWorld.clone());
    cable.position.copy(a).lerp(b, 0.5);
    cable.scale.set(1, Math.max(a.distanceTo(b), 0.05), 1);
    cable.quaternion.identity();
    const dir = b.clone().sub(a);
    if (dir.lengthSq() > 0.0001) {
      cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
    if (hook) hook.position.copy(b);
  }

  function pinPattern(vehicle, hookPoint) {
    const meshes = patternMeshes(vehicle);
    if (!vehicle.yard || meshes.length === 0) return;
    const anchor = patternAnchor(vehicle, false);
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      const rest = mesh.userData.rest || mesh.position;
      if (!vehicle.carried) {
        mesh.position.copy(rest);
      } else {
        mesh.position.set(
          hookPoint.x + (rest.x - anchor.x),
          hookPoint.y + (rest.y - anchor.y),
          hookPoint.z + (rest.z - anchor.z)
        );
      }
    }
  }

  function patternTop(meshes) {
    let top = meshes[0].position.clone();
    for (let i = 1; i < meshes.length; i++) {
      if (meshes[i].position.y > top.y) top = meshes[i].position.clone();
    }
    let x = 0;
    let z = 0;
    for (let i = 0; i < meshes.length; i++) {
      x += meshes[i].position.x;
      z += meshes[i].position.z;
    }
    top.x = x / meshes.length;
    top.z = z / meshes.length;
    top.y += 0.45;
    return top;
  }

  function syncVehiclePayload(group, vehicle) {
    const payload = group.userData.payload;
    const signature = vehicle.plan.map(function (block) { return block.id; }).join(',');
    if (signature === group.userData.payloadSignature) return;
    group.userData.payloadSignature = signature;
    while (payload.children.length > 0) payload.remove(payload.children[0]);
    const anchor = vehicle.payloadHookBlock;
    for (let i = 0; i < vehicle.plan.length; i++) {
      const block = vehicle.plan[i];
      const voxel = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.9, 0.9),
        blockSurface(block.materialId, false)
      );
      voxel.position.set(block.x - anchor.x, block.y - anchor.y, block.z - anchor.z);
      voxel.castShadow = true;
      voxel.receiveShadow = true;
      payload.add(voxel);
    }
  }

  function updatePatternGhosts() {
    const slots = [];
    if (world) {
      for (let v = 0; v < world.vehicles.length; v++) {
        const vehicle = world.vehicles[v];
        if (!vehicle.yard || vehicle.phase !== 'assemble') continue;
        for (let i = 0; i < vehicle.pattern.length; i++) {
          if (!vehicle.pattern[i].done) slots.push(vehicle.pattern[i]);
        }
      }
    }
    const signature = slots.map(function (slot) { return slot.block.id; }).join(',');
    if (signature === patternGhostSignature) return;
    patternGhostSignature = signature;
    while (patternGhosts.children.length > 0) patternGhosts.remove(patternGhosts.children[0]);
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const fill = new THREE.Mesh(patternGhostGeometry, patternGhostFill);
      fill.position.set(slot.wx + 0.5, slot.wy + 0.5, slot.wz + 0.5);
      fill.renderOrder = 2;
      const edge = new THREE.LineSegments(patternGhostEdges, patternGhostLine);
      edge.position.copy(fill.position);
      patternGhosts.add(fill, edge);
    }
  }

  function updateVehicles(realDt) {
    updatePatternGhosts();
    const visualDt = realDt * Math.min(4, Math.sqrt(Math.max(timeScale, 0)));
    vehicleViews.forEach(function (group, vehicle) {
      const t = vehicle.segmentT;
      const targetX = vehicle.kind === 'heli'
        ? vehicle.cell[0] + 0.5
        : vehicle.from[0] + (vehicle.to[0] - vehicle.from[0]) * t + 0.5;
      const targetZ = vehicle.kind === 'heli'
        ? vehicle.cell[2] + 0.5
        : vehicle.from[2] + (vehicle.to[2] - vehicle.from[2]) * t + 0.5;
      const previousX = group.userData.displayX;
      const previousZ = group.userData.displayZ;
      group.userData.displayX = targetX;
      group.userData.displayZ = targetZ;
      const moved = Math.hypot(targetX - previousX, targetZ - previousZ);
      const altitude = vehicle.kind === 'heli' ? vehicle.altitude : 0;
      group.position.set(targetX, altitude, targetZ);
      if (vehicle.headingReady) group.rotation.y = vehicle.heading;
      const turn = vehicle.headingReady ? angleBetween(group.userData.lastHeading, vehicle.heading) : 0;
      group.userData.lastHeading = vehicle.headingReady ? vehicle.heading : group.userData.lastHeading;
      if (vehicle.kind === 'heli') {
        updateHeliView(group, vehicle, visualDt, moved, turn);
        return;
      }
      updateLoaderView(group, vehicle, visualDt, moved, turn);
    });
  }

  function angleBetween(from, to) {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function approach(current, target, rate) {
    return current + (target - current) * Math.min(1, rate);
  }

  function updateHeliView(group, vehicle, dt, moved, turn) {
    const data = group.userData;
    const frameDt = Math.max(dt, 1e-3);
    const speed = timeScale === 0 ? 0 : moved / frameDt;
    const maxSpeed = MB.upgradeValue(world.campaign, 'heliSpeed', world.campaign.purchases.heliSpeed);
    data.pitch = approach(data.pitch, Math.min(0.28, speed / Math.max(maxSpeed, 1) * 0.28), dt * 3);
    data.roll = approach(data.roll, Math.max(-0.3, Math.min(0.3, -turn / frameDt * 0.12)), dt * 3);
    data.body.rotation.set(data.pitch, 0, data.roll, 'YXZ');
    const bob = timeScale === 20 ? 0 : Math.sin(performance.now() * 0.0021 + vehicle.index) * 0.05;
    data.body.position.y = bob;
    data.rotor.rotation.y += dt * 26;
    data.tailRotor.rotation.x += dt * 38;
    const point = hookWorld(group, vehicle);
    pinPattern(vehicle, point);
    drawLink(group, data.cable, data.hook, mountWorld(group, vehicle), point);
    data.payload.visible = false;
  }

  function updateLoaderView(group, vehicle, dt, moved, turn) {
    const data = group.userData;
    const frameDt = Math.max(dt, 1e-3);
    for (let i = 0; i < data.wheels.length; i++) data.wheels[i].rotation.x += moved / 0.27;
    data.steerAngle = approach(data.steerAngle, Math.max(-0.5, Math.min(0.5, turn / frameDt * 0.35)), dt * 6);
    for (let i = 0; i < data.steer.length; i++) data.steer[i].rotation.y = data.steerAngle;
    const lifting = vehicle.phase === 'hook' || vehicle.phase === 'lift' || vehicle.phase === 'lower' ||
      vehicle.phase === 'fold' || vehicle.phase === 'build';
    data.deploy = approach(data.deploy, lifting ? 1 : 0, dt * 3);
    for (let i = 0; i < data.outriggers.length; i++) {
      const leg = data.outriggers[i];
      leg.userData.beam.position.x = leg.userData.side * (0.15 + 0.22 * data.deploy);
      leg.userData.foot.position.x = leg.userData.side * (0.28 + 0.44 * data.deploy);
      leg.userData.pad.position.x = leg.userData.foot.position.x;
      leg.userData.foot.position.y = -0.1 - 0.08 * data.deploy;
      leg.userData.pad.position.y = -0.2 - 0.16 * data.deploy;
    }
    const busy = vehicle.phase === 'drive' || lifting;
    data.beacon.material.emissiveIntensity = busy ? (Math.sin(performance.now() * 0.012) > 0 ? 1.4 : 0.15) : 0.15;

    poseCrane(group, MB.cranePose(vehicle));
    group.updateMatrixWorld(true);
    const hookPoint = hookWorld(group, vehicle);
    const patternJob = !!vehicle.yard && (vehicle.carried || vehicle.phase === 'lift' || vehicle.phase === 'lower');
    if (patternJob) pinPattern(vehicle, hookPoint);
    if (vehicle.payloadReady && !vehicle.yard) syncVehiclePayload(group, vehicle);
    data.payload.visible = vehicle.payloadReady && !vehicle.yard;
    if (data.payload.visible) {
      data.hook.getWorldQuaternion(data.payloadQuaternion);
      data.payload.quaternion.copy(data.payloadQuaternion.invert());
    }
  }

  // Lay the crane out from a logic pose: mast height, jib swing and reach, cable length.
  function poseCrane(group, pose) {
    const data = group.userData;
    const top = Math.max(0.5, pose.mast - MB.CRANE.turretY);
    data.mast.scale.y = Math.min(top, 1.4);
    data.mast.position.y = data.mast.scale.y / 2;
    data.mastInner.scale.y = top;
    data.mastInner.position.y = top / 2;
    data.turret.rotation.y = pose.yaw;
    data.turret.position.set(MB.CRANE.turretX + (pose.shiftX || 0), MB.CRANE.turretY, MB.CRANE.turretZ + (pose.shiftZ || 0));
    data.head.position.y = top;
    data.jib.scale.z = pose.reach + 0.1;
    data.jib.position.z = (pose.reach + 0.1) / 2;
    data.trolley.position.z = pose.reach;
    data.cable.scale.y = Math.max(0.05, pose.cable);
    data.cable.position.set(0, -pose.cable / 2, pose.reach);
    data.hook.position.set(0, -pose.cable - 0.12, pose.reach);
  }

  function addPlanningDesk(cell) {
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6f4427, roughness: 0.78 });
    const edge = new THREE.MeshStandardMaterial({ color: 0x3e281b, roughness: 0.72 });
    const paper = new THREE.MeshStandardMaterial({ color: 0x5b9bc4, roughness: 0.9, side: THREE.DoubleSide });
    const ink = new THREE.MeshStandardMaterial({ color: 0xe8dfbd, roughness: 0.85 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.46), wood);
    top.position.set(0, 0.48, 0.64);
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);
    const legPositions = [
      [-0.3, 0.24, 0.49],
      [0.3, 0.24, 0.49],
      [-0.3, 0.24, 0.79],
      [0.3, 0.24, 0.79],
    ];
    for (let i = 0; i < legPositions.length; i++) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.07), edge);
      leg.position.set(legPositions[i][0], legPositions[i][1], legPositions[i][2]);
      leg.castShadow = true;
      group.add(leg);
    }
    const blueprint = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.3), paper);
    blueprint.rotation.x = -Math.PI / 2;
    blueprint.position.set(0, 0.525, 0.64);
    group.add(blueprint);
    const lines = [
      [0, 0.535, 0.58, 0.4, 0.012, 0.018],
      [-0.12, 0.536, 0.68, 0.012, 0.014, 0.16],
      [0.11, 0.536, 0.67, 0.18, 0.014, 0.014],
      [0.08, 0.536, 0.73, 0.24, 0.014, 0.014],
    ];
    for (let i = 0; i < lines.length; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(lines[i][3], lines[i][4], lines[i][5]), ink);
      line.position.set(lines[i][0], lines[i][1], lines[i][2]);
      group.add(line);
    }
    group.position.set(cell[0] + 0.5, 0, cell[2] + 0.5);
    levelRoot.add(group);
  }

  function focusWorker(builder) {
    if (cameraController.isWorkerView()) cameraController.setWorkerView(false);
    selectedBuilder = builder === selectedBuilder ? null : builder;
    workerPlanSignature = '';
    stickViews.forEach(function (viewState, candidate) {
      // Drones have no selection ring (they are not selectable).
      const ring = viewState.group.userData.selection;
      if (ring) ring.visible = candidate === selectedBuilder;
    });
    if (!selectedBuilder) clearWorkerPlan();
    updateWorkerViewButton();
    MicroBuildersWorkerLog.paint(world, selectedBuilder);
    paintWorkerCard();
  }

  function selectWorker(event) {
    if (currentScreen === 'hq') {
      pickCity(event);
      return;
    }
    const rect = view.getBoundingClientRect();
    workerPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    workerRaycaster.setFromCamera(workerPointer, camera);
    const targets = [];
    stickViews.forEach(function (viewState, builder) {
      if (builder.trade !== 'engineer') targets.push(viewState.group);
    });
    const hits = workerRaycaster.intersectObjects(targets, true);
    let builder = null;
    if (hits.length > 0) {
      let object = hits[0].object;
      while (object && !object.userData.builder) object = object.parent;
      if (object) builder = object.userData.builder;
    }
    focusWorker(builder);
  }

  // «Следовать» on the worker card shows whether the camera follows the selected worker.
  function updateWorkerViewButton() {
    const follow = document.getElementById('worker-card-follow');
    const on = cameraController.isWorkerView();
    follow.classList.toggle('on', on);
    follow.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  // ---------- status icons (docs/gdd/16-ux-flow.md §6) ----------

  // One canvas holds every glyph twice (plain and with the hunger pip) plus the lone pip. Each cell
  // gets its own SpriteMaterial over a clone of the texture: the clones share the canvas, so it is
  // uploaded once and nothing is ever repainted.
  function badgeMaterials() {
    if (badgeAtlas) return badgeAtlas;
    const cols = 8;
    const rows = 4;
    const canvas = document.createElement('canvas');
    canvas.width = cols * 128;
    canvas.height = rows * 128;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const materials = {};
    let cell = 0;
    function addCell(kind, pip) {
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      cell += 1;
      context.save();
      context.translate(col * 128, row * 128);
      drawBadgeCell(context, kind, pip);
      context.restore();
      const map = texture.clone();
      map.repeat.set(1 / cols, 1 / rows);
      map.offset.set(col / cols, 1 - (row + 1) / rows);
      return new THREE.SpriteMaterial({ map: map, transparent: true, depthTest: false, depthWrite: false });
    }
    Object.keys(BADGE_COLORS).forEach(function (kind) {
      materials[kind] = [addCell(kind, false), addCell(kind, true)];
    });
    materials.hunger = [null, addCell('', true)];
    texture.needsUpdate = true;
    badgeAtlas = { texture: texture, materials: materials };
    return badgeAtlas;
  }

  function drawBadgeCell(context, kind, pip) {
    context.save();
    // A margin inside every cell keeps the mipmaps of neighbouring glyphs apart.
    context.translate(64, 64);
    context.scale(0.92, 0.92);
    context.translate(-64, -64);
    if (kind) {
      context.beginPath();
      context.arc(64, 64, 48, 0, Math.PI * 2);
      context.fillStyle = BADGE_COLORS[kind];
      context.fill();
      drawNeedGlyph(context, kind);
      // The faint track under the progress ring (the ring itself is a mesh, see createWorkerBadge).
      context.beginPath();
      context.arc(64, 64, 56, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(255,248,238,0.28)';
      context.lineWidth = 8;
      context.stroke();
    }
    if (pip) {
      context.beginPath();
      context.arc(104, 24, 14, 0, Math.PI * 2);
      context.fillStyle = '#ff3b3b';
      context.fill();
      context.strokeStyle = '#fff8ee';
      context.lineWidth = 4;
      context.stroke();
    }
    context.restore();
  }

  function drawNeedGlyph(context, kind) {
    if (kind === 'meal') {
      context.fillStyle = '#c0392b';
      context.beginPath();
      context.arc(64, 58, 18, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#2f8f46';
      context.beginPath();
      context.ellipse(78, 44, 10, 6, -0.7, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#6b3a16';
      context.lineWidth = 4;
      context.lineCap = 'butt';
      context.beginPath();
      context.moveTo(64, 42);
      context.lineTo(64, 32);
      context.stroke();
    } else if (kind === 'rest') {
      context.fillStyle = '#f7f3ea';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '800 58px Manrope, sans-serif';
      context.fillText('Z', 48, 74);
      context.font = '800 34px Manrope, sans-serif';
      context.fillText('z', 84, 46);
    } else if (kind === 'haul') {
      context.fillStyle = '#e9d3a8';
      context.beginPath();
      context.moveTo(64, 34);
      context.lineTo(92, 48);
      context.lineTo(64, 62);
      context.lineTo(36, 48);
      context.closePath();
      context.fill();
      context.fillStyle = '#c99b5c';
      context.beginPath();
      context.moveTo(36, 48);
      context.lineTo(64, 62);
      context.lineTo(64, 94);
      context.lineTo(36, 80);
      context.closePath();
      context.fill();
      context.fillStyle = '#a5753c';
      context.beginPath();
      context.moveTo(92, 48);
      context.lineTo(64, 62);
      context.lineTo(64, 94);
      context.lineTo(92, 80);
      context.closePath();
      context.fill();
    } else if (kind === 'fetch') {
      context.strokeStyle = '#c9a26b';
      context.lineWidth = 7;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(46, 90);
      context.lineTo(80, 44);
      context.stroke();
      context.strokeStyle = '#d9dde2';
      context.lineWidth = 8;
      context.beginPath();
      context.arc(80, 70, 34, -2.3, -0.75);
      context.stroke();
    } else if (kind === 'build') {
      context.strokeStyle = '#c9a26b';
      context.lineWidth = 8;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(48, 92);
      context.lineTo(76, 52);
      context.stroke();
      context.save();
      context.translate(78, 48);
      context.rotate(0.6);
      context.fillStyle = '#d9dde2';
      context.fillRect(-22, -9, 44, 18);
      context.restore();
    } else if (kind === 'plan') {
      context.fillStyle = '#f4efe6';
      context.fillRect(42, 36, 44, 56);
      context.fillStyle = '#8a6a2b';
      context.fillRect(54, 30, 20, 10);
      context.fillStyle = '#7a8a80';
      context.fillRect(50, 52, 28, 5);
      context.fillRect(50, 64, 28, 5);
      context.fillRect(50, 76, 18, 5);
    } else if (kind === 'front') {
      // Grey hourglass: no free cubes, the worker waits at the desk.
      context.fillStyle = '#ece8e0';
      context.fillRect(40, 30, 48, 8);
      context.fillRect(40, 90, 48, 8);
      context.beginPath();
      context.moveTo(46, 38);
      context.lineTo(82, 38);
      context.lineTo(66, 64);
      context.lineTo(82, 90);
      context.lineTo(46, 90);
      context.lineTo(62, 64);
      context.closePath();
      context.fillStyle = '#c9c4ba';
      context.fill();
      context.fillStyle = '#8f8a80';
      context.beginPath();
      context.moveTo(52, 90);
      context.lineTo(76, 90);
      context.lineTo(64, 76);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(54, 42);
      context.lineTo(74, 42);
      context.lineTo(64, 56);
      context.closePath();
      context.fill();
    } else if (kind === 'path') {
      // Road barrier: the way ahead is closed for now.
      context.fillStyle = '#3a2a1c';
      context.fillRect(38, 58, 8, 36);
      context.fillRect(82, 58, 8, 36);
      context.fillStyle = '#f4efe6';
      context.fillRect(28, 46, 72, 18);
      context.fillStyle = '#d64535';
      for (let i = 0; i < 4; i++) {
        context.beginPath();
        context.moveTo(32 + i * 18, 64);
        context.lineTo(42 + i * 18, 46);
        context.lineTo(50 + i * 18, 46);
        context.lineTo(40 + i * 18, 64);
        context.closePath();
        context.fill();
      }
    } else if (kind === 'lost') {
      context.fillStyle = '#fff8ee';
      context.fillRect(57, 30, 14, 44);
      context.beginPath();
      context.arc(64, 90, 8, 0, Math.PI * 2);
      context.fill();
    } else if (kind === 'overload') {
      // Kettlebell: a wide handle loop over a round body on a flat foot.
      context.strokeStyle = '#f4efe6';
      context.lineWidth = 8;
      context.lineCap = 'round';
      context.beginPath();
      context.arc(64, 52, 17, Math.PI * 0.82, Math.PI * 2.18);
      context.stroke();
      context.fillStyle = '#f4efe6';
      context.beginPath();
      context.ellipse(64, 76, 25, 21, 0, 0, Math.PI * 2);
      context.fill();
      context.fillRect(48, 90, 32, 7);
    } else {
      context.fillStyle = '#f4efe6';
      context.fillRect(30, 68, 54, 14);
      context.fillStyle = '#e07a32';
      context.fillRect(80, 68, 16, 14);
      context.fillStyle = 'rgba(255,255,255,0.92)';
      context.beginPath();
      context.arc(74, 46, 12, 0, Math.PI * 2);
      context.arc(96, 30, 8, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Per worker: the icon sprite (a shared atlas material), the progress ring (own geometry, drawn
  // partly with drawRange) and a text label made on first use. They live in badgeRoot, outside the
  // worker group, so the lean and scale of the body do not tilt them.
  function createWorkerBadge(drone) {
    const atlas = badgeMaterials();
    const group = new THREE.Group();
    const icon = new THREE.Sprite(atlas.materials.plan[0]);
    icon.renderOrder = 40;
    // Radii match the track drawn in the atlas cell (56 ± 4 px of 128, scaled by 0.92).
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.374, 0.431, BADGE_RING_SEGMENTS, 1, Math.PI / 2, Math.PI * 2),
      badgeRingMaterial
    );
    ring.scale.x = -1; // clockwise from the top
    ring.renderOrder = 41;
    ring.visible = false;
    ring.geometry.setDrawRange(0, 0);
    group.add(icon, ring);
    group.visible = false;
    badgeRoot.add(group);
    return {
      group: group,
      icon: icon,
      ring: ring,
      label: null,
      labelText: '',
      size: drone ? 0.6 : BADGE_SIZE,
      lift: drone ? 0.72 : 1.62,
      shown: '',
      shownT: BADGE_HOLD,
      pending: '',
      pendingT: 0,
      changes: 0,
      segments: 0,
      pop: 1,
      alertUntil: 0,
    };
  }

  // What the worker is about, as one icon kind ('' — plain walking: no icon).
  function workerIntent(builder, load, badge) {
    const phase = builder.phase;
    const purpose = phase === 'walk' ? builder.walkPurpose : '';
    if (badge.alertUntil > fxTime || phase === 'recover' || purpose === 'recover') return 'lost';
    if (phase === 'meal' || purpose === 'meal') return 'meal';
    if (phase === 'break') return builder.breakKind === 'rest' ? 'rest' : 'smoke';
    if (purpose === 'smoke') return 'smoke';
    if (phase === 'idle' && builder.waitReason === 'path') return 'path';
    if ((phase === 'plan' || phase === 'idle') && builder.waitReason === 'front') return 'front';
    if (phase === 'plan') return 'plan';
    if (phase === 'mine') return 'fetch';
    if (phase === 'place') return 'haul';
    if (phase === 'erect' || phase === 'passage') return 'build';
    if (builder.carry.length > 0 && load.overload > 1.05) return 'overload';
    return '';
  }

  function droneIntent(builder) {
    if (builder.phase === 'place') return 'haul';
    if (builder.phase === 'pick') return 'fetch';
    return '';
  }

  // Game seconds the current plan, pick or cube takes in full (a cube: all its mini-cubes, as its ring).
  function predictedSeconds(builder, kind) {
    const per = builder.actionT + builder.timer;
    if (kind === 'haul' && builder.trade !== 'engineer' && builder.carry[0]) return per * MB.pourTotal(builder.carry[0]);
    return per;
  }

  // Hysteresis: a new kind must hold BADGE_PENDING real seconds and the shown one must have been up
  // BADGE_HOLD seconds. Urgent kinds (overload, no path, lost) skip the wait, but whatever has just
  // appeared or gone stays BADGE_PENDING (an urgent icon BADGE_HOLD): otherwise a worker inching along
  // a scaffold route would strobe between «Ждёт проход», the kettlebell and nothing.
  function settleBadge(badge, want, dt) {
    badge.shownT += dt;
    if (want === badge.shown || want !== badge.pending) {
      badge.pending = want;
      badge.pendingT = 0;
    } else {
      badge.pendingT += dt;
    }
    const urgent = BADGE_URGENT[want] && badge.shownT >= (BADGE_URGENT[badge.shown] ? BADGE_HOLD : BADGE_PENDING);
    if (want !== badge.shown &&
        (urgent || (badge.pendingT >= BADGE_PENDING && badge.shownT >= BADGE_HOLD))) {
      badge.shown = want;
      badge.shownT = 0;
      badge.pendingT = 0;
      badge.pop = 0;
      badge.changes += 1;
    }
    return badge.shown;
  }

  // Far from the camera icons are dots: only urgent ones stay, kept at a readable size; close up
  // (worker view) they stop growing.
  function updateBadgeLod() {
    // The follow view keeps the orbit radius saved: there the eye is as far as the followed worker.
    const followed = cameraController.isWorkerView() && selectedBuilder ? stickViews.get(selectedBuilder) : null;
    const distance = Math.max(1, followed ? camera.position.distanceTo(followed.group.position) : cameraController.radius);
    const px = BADGE_SIZE * MicroBuildersStage.height() / (2 * distance * Math.tan(camera.fov * Math.PI / 360));
    badgeLodState.urgentOnly = px < BADGE_LOD_PX;
    badgeLodState.scale = px < BADGE_MIN_PX ? BADGE_MIN_PX / px : px > BADGE_MAX_PX ? BADGE_MAX_PX / px : 1;
    badgeLodState.px = px * badgeLodState.scale;
  }

  function updateBadge(viewState, builder, want, dt, load) {
    const badge = viewState.badge;
    // At ×20 only urgent icons, and the others go at once; while paused (dt 0) everything stays.
    if (timeScale === 20 && !BADGE_URGENT[want]) want = '';
    if (timeScale === 20 && badge.shown && !BADGE_URGENT[badge.shown]) {
      badge.shown = '';
      badge.shownT = BADGE_PENDING;
      badge.changes += 1;
    }
    // Hunger ≥ 50% is a status of its own, like a smoke break: the meal icon when nothing else is
    // shown (no pip on other icons).
    if (BADGE_PREDICTABLE[want] && predictedSeconds(builder, want) / Math.max(1, timeScale) < BADGE_QUICK) want = '';
    const hungry = builder.trade !== 'engineer' && timeScale !== 20 && builder.hunger >= MB.BALANCE.hungerMax * 0.5;
    const hungerOnly = !want && hungry;
    if (hungerOnly) want = 'meal';
    const kind = dt > 0 ? settleBadge(badge, want, dt) : badge.shown;
    const selected = builder === selectedBuilder;
    if (!kind || !levelRoot.visible || (badgeLodState.urgentOnly && !BADGE_URGENT[kind] && !selected)) {
      if (badge.group.visible) badge.group.visible = false;
      return;
    }
    const material = badgeAtlas.materials[kind][0];
    if (badge.icon.material !== material) badge.icon.material = material;
    if (kind === 'meal' && builder.phase !== 'meal') {
      // Hungry or on the way to eat: just the icon, no timer ring.
      badge.ring.visible = false;
      paintBadgeLabel(badge, '', false);
    } else if (kind === want) {
      // While a new state is pending the ring and the label hold still.
      measureBadge(badge, builder, kind, load, selected);
    }
    if (dt > 0 && badge.pop < 1) badge.pop = Math.min(1, badge.pop + dt / 0.15);
    const size = badge.size * badgeLodState.scale;
    const shown = size * (0.7 + 0.3 * badge.pop);
    badge.group.scale.set(shown, shown, shown);
    // The bottom of the icon stays just over the head whatever its size.
    const p = viewState.group.position;
    badge.group.position.set(p.x, p.y + badge.lift + (size - badge.size) / 2, p.z);
    if (badge.labelText) placeBadgeLabel(badge, kind, selected);
    badge.group.visible = true;
  }

  // Labels stay readable (BADGE_LABEL_PX tall on screen) however small the icon is; on small icons
  // only the urgent ones («×1,6», «Ждёт проход») and the selected worker's keep theirs.
  function placeBadgeLabel(badge, kind, selected) {
    const iconPx = badgeLodState.px * badge.size / BADGE_SIZE;
    const show = selected || !!BADGE_URGENT[kind] || iconPx >= BADGE_LABEL_MIN_PX;
    if (badge.label.visible !== show) badge.label.visible = show;
    if (!show) return;
    const height = Math.max(0.55, BADGE_LABEL_PX / iconPx);
    if (Math.abs(badge.label.scale.y - height) > 0.01) {
      badge.label.scale.set(height * 4, height, 1);
      badge.label.position.y = 0.52 + height / 2;
    }
  }

  // The ring (whole-cube progress for a grid ≥ 2 cube, «3/8») on every timed action; the selected
  // worker also gets whole seconds left on actions of at least BADGE_SECONDS_MIN real seconds.
  function measureBadge(badge, builder, kind, load, selected) {
    const scale = Math.max(1, timeScale);
    let ratio = -1;
    let duration = 0;
    let left = 0;
    let text = '';
    let warn = false;
    if (kind === 'haul' && builder.trade !== 'engineer' && builder.carry[0]) {
      const block = builder.carry[0];
      const total = MB.pourTotal(block);
      const per = builder.actionT + builder.timer;
      const part = per > 0 ? Math.min(1, builder.actionT / per) : 0;
      duration = per * total;
      ratio = (block.poured + part) / total;
      // Seconds left for the pieces of this cube in hand (a big cube takes several trips).
      let inHand = 0;
      while (inHand < builder.carry.length && builder.carry[inHand] === block) inHand += 1;
      left = (inHand - part) * per;
      if (total > 1) text = block.poured + '/' + total;
    } else if (kind === 'overload') {
      text = '×' + formatFactor(load.overload);
      warn = true;
    } else if (kind === 'path') {
      text = 'Ждёт проход';
      warn = true;
    } else if (kind !== 'front' && kind !== 'lost' && BADGE_TIMED_PHASES[builder.phase] && builder.timer > 0) {
      duration = builder.actionT + builder.timer;
      ratio = builder.actionT / duration;
      left = builder.timer;
    }
    // The ring shows on every timed action, however quick; the seconds only on long ones.
    const ring = ratio >= 0 && duration > 0;
    const long = ring && duration / scale >= BADGE_SECONDS_MIN - 0.01;
    if (selected && long && left / scale >= 1) text = (text ? text + ' · ' : '') + Math.ceil(left / scale) + ' с';
    const segments = ring ? Math.round(Math.min(1, Math.max(0, ratio)) * BADGE_RING_SEGMENTS) : 0;
    if (segments !== badge.segments) {
      badge.segments = segments;
      badge.ring.geometry.setDrawRange(0, segments * 6);
    }
    badge.ring.visible = segments > 0;
    paintBadgeLabel(badge, text, warn);
  }

  // A small canvas made on first use, repainted only when its text changes.
  function paintBadgeLabel(badge, text, warn) {
    if (badge.labelText === text) return;
    badge.labelText = text;
    if (!text) {
      if (badge.label) badge.label.visible = false;
      return;
    }
    if (!badge.label) {
      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 48;
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: map, transparent: true, depthTest: false, depthWrite: false }));
      label.scale.set(2.2, 0.55, 1); // placeBadgeLabel sizes it to the screen
      label.position.set(0, 0.8, 0);
      label.renderOrder = 42;
      label.userData.canvas = canvas;
      badge.group.add(label);
      badge.label = label;
    }
    const canvas = badge.label.userData.canvas;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, 192, 48);
    context.font = '800 27px Manrope, sans-serif';
    const width = Math.min(188, context.measureText(text).width + 22);
    context.fillStyle = warn ? 'rgba(179,38,30,0.94)' : 'rgba(32,28,24,0.84)';
    context.beginPath();
    context.roundRect(96 - width / 2, 4, width, 40, 20);
    context.fill();
    context.fillStyle = '#fff8ee';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 96, 25);
    badge.label.material.map.needsUpdate = true;
    badge.label.visible = true;
  }

  // The cubes in hands: as many pre-made slots as the load fills by weight (never more than the
  // pieces carried), one size per material grid, so the stack never jumps.
  function paintCarryStack(viewState, builder, load, inHands) {
    const slots = viewState.group.userData.carry.children;
    // The back holds what is left once the cube in the hands (all its mini-cubes) is taken off.
    const back = inHands ? builder.carry.filter(function (block) { return block !== inHands; }) : builder.carry;
    const length = back.length;
    const fill = builder.carry.length > 0 ? load.fill * length / builder.carry.length : 0;
    const count = length === 0 ? 0 : Math.min(length, CARRY_SLOTS, Math.max(1, Math.ceil(fill * CARRY_SLOTS - 0.001)));
    const size = count > 0 && MB.MATERIAL[back[0].materialId].grid >= 2 ? 0.18 : 0.26;
    for (let i = 0; i < CARRY_SLOTS; i++) {
      const cube = slots[i];
      cube.visible = i < count;
      if (i >= count) continue;
      const materialId = back[Math.min(length - 1, Math.floor(i * length / count))].materialId;
      cube.material = blockSurface(materialId, false);
      cube.scale.setScalar(size);
      const lone = i === count - 1 && count % 2 === 1;
      cube.position.set(lone ? 0 : ((i % 2) - 0.5) * (size + 0.03), Math.floor(i / 2) * (size + 0.03), 0);
    }
    if (count > 0) viewState.carryColor = MB.MATERIAL[back[0].materialId].color;
  }

  function clearWorkerViews() {
    for (let i = badgeRoot.children.length - 1; i >= 0; i--) {
      const group = badgeRoot.children[i];
      group.traverse(function (object) {
        // The ring geometry and the label are the worker's own; icon materials are shared.
        if (object.isMesh) object.geometry.dispose();
        if (object.userData.canvas) {
          object.material.map.dispose();
          object.material.dispose();
        }
      });
      badgeRoot.remove(group);
    }
    for (let i = 0; i < fxFloats.length; i++) retireFx(fxFloats[i]);
    for (let i = 0; i < fxChips.length; i++) retireFx(fxChips[i]);
    fxAggregate.coins = 0;
    fxAggregate.t = 0;
    paintWorkerCard();
  }

  // ---------- world-anchored feedback (#fx-layer) ----------

  function fxShown() {
    return currentScreen === 'build' && levelRoot.visible && !document.body.classList.contains('interface-hidden');
  }

  // Stage px of a world point into fxPoint; false when it is behind the camera or off screen.
  function fxProject(x, y, z) {
    fxPoint.set(x, y, z).project(camera);
    if (fxPoint.z < -1 || fxPoint.z > 1 || Math.abs(fxPoint.x) > 1.05 || Math.abs(fxPoint.y) > 1.05) return false;
    fxPoint.x = (fxPoint.x + 1) / 2 * MicroBuildersStage.width();
    fxPoint.y = (1 - fxPoint.y) / 2 * MicroBuildersStage.height();
    return true;
  }

  function makeFx(className) {
    const el = document.createElement('div');
    el.className = className;
    el.hidden = true;
    const icon = document.createElement('img');
    icon.alt = '';
    icon.hidden = true;
    const text = document.createElement('b');
    const caption = document.createElement('small');
    el.append(icon, text, caption);
    document.getElementById('fx-layer').appendChild(el);
    return {
      el: el,
      icon: icon,
      iconSrc: '',
      text: text.appendChild(document.createTextNode('')),
      caption: caption.appendChild(document.createTextNode('')),
      captionEl: caption,
      base: className,
      tone: '',
      life: 0,
      t: 0,
      x: 0,
      y: 0,
      z: 0,
      rise: 0,
      big: false,
      builder: null,
      width: 0,
      height: 0,
    };
  }

  function retireFx(fx) {
    fx.life = 0;
    fx.builder = null;
    if (!fx.el.hidden) fx.el.hidden = true;
  }

  function dressFx(fx, text, tone, caption) {
    if (fx.tone !== tone) {
      fx.tone = tone;
      fx.el.className = fx.base + ' fx-' + tone;
    }
    const src = FX_ICONS[tone] || '';
    if (fx.iconSrc !== src) {
      fx.iconSrc = src;
      if (src) fx.icon.src = src;
      fx.icon.hidden = !src;
    }
    fx.text.data = text;
    fx.caption.data = caption || '';
    fx.captionEl.hidden = !caption;
    fx.width = 0; // measured again once it is on screen
  }

  // A rising number at a world point. At most FX_FLOAT_MAX at once (the oldest is recycled); none
  // at ×20, off screen, behind the camera or with the interface hidden.
  function floatAt(x, y, z, text, tone, caption, delay) {
    if (timeScale === 20 || !fxShown() || !fxProject(x, y, z)) return;
    let slot = null;
    let oldest = null;
    for (let i = 0; i < fxFloats.length; i++) {
      const fx = fxFloats[i];
      if (fx.life <= 0) {
        if (!slot) slot = fx;
      } else if (!oldest || fx.t / fx.life > oldest.t / oldest.life) {
        oldest = fx;
      }
    }
    if (!slot && fxFloats.length < FX_FLOAT_MAX) {
      slot = makeFx('fx-float');
      fxFloats.push(slot);
    }
    if (!slot) slot = oldest;
    const coin = tone === 'coin';
    slot.serial = (slot.serial || 0) + 1;
    slot.icon.style.visibility = '';
    // Coins: the «+N» pops, then its coin icon itself leaves for the counter and the number stays a
    // little longer.
    if (coin) {
      const serial = slot.serial;
      const target = slot;
      setTimeout(function () { launchFloatCoin(target, serial); }, ((delay || 0) + 0.55) * 1000);
    }
    slot.t = -(delay || 0);
    slot.life = coin ? 1.9 : 2;
    slot.rise = coin ? 46 : 60;
    slot.big = !coin;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    dressFx(slot, text, tone, caption);
  }

  // From the floater's own coin icon: hide it there and send coins from exactly that spot.
  function launchFloatCoin(slot, serial) {
    if (slot.serial !== serial || slot.life <= 0 || slot.icon.hidden || !fxShown()) return;
    const rect = slot.icon.getBoundingClientRect();
    if (rect.width < 1) return;
    const scale = MicroBuildersStage.scale();
    const base = document.body.getBoundingClientRect();
    slot.icon.style.visibility = 'hidden';
    flyCoins((rect.left + rect.width / 2 - base.left) / scale, (rect.top + rect.height / 2 - base.top) / scale, 0, rect.width / scale);
  }

  // Three coin icons fly from a stage point into the coin pill, the first at the size it left with,
  // two smaller ones trailing; the pill pops as each lands. Pooled <img>s in #fx-layer, at most 18.
  function flyCoins(x, y, delay, size) {
    const layer = document.getElementById('fx-layer');
    const pill = document.querySelector('#coins .currency-icon') || document.getElementById('coins');
    if (!layer || !pill || !layer.animate) return;
    const pool = flyCoins.pool || (flyCoins.pool = []);
    const scale = MicroBuildersStage.scale();
    const base = document.body.getBoundingClientRect();
    const target = pill.getBoundingClientRect();
    const tx = (target.left + target.width / 2 - base.left) / scale - 9;
    const ty = (target.top + target.height / 2 - base.top) / scale - 9;
    for (let i = 0; i < 3; i++) {
      let coin = null;
      for (let j = 0; j < pool.length; j++) if (!pool[j].busy) { coin = pool[j]; break; }
      if (!coin) {
        if (pool.length >= 18) return;
        const el = document.createElement('img');
        el.className = 'fly-coin';
        el.alt = '';
        el.src = 'icons/icon-coins.jpg?v=2';
        layer.appendChild(el);
        coin = { el: el, busy: false };
        pool.push(coin);
      }
      coin.busy = true;
      const sx = x - 9;
      const sy = y - 9;
      const start = (size || 18) / 18 * (i === 0 ? 1 : 0.7);
      // A soft arc: up and a little sideways first, then into the counter.
      const mx = sx + (tx - sx) * 0.35 + (i - 1) * 14;
      const my = Math.min(sy, ty) - 36 - i * 6;
      const anim = coin.el.animate([
        { opacity: i === 0 ? 1 : 0, transform: 'translate(' + sx + 'px, ' + sy + 'px) scale(' + start.toFixed(2) + ')' },
        { opacity: 1, transform: 'translate(' + mx.toFixed(1) + 'px, ' + my.toFixed(1) + 'px) scale(' + (start * 0.95).toFixed(2) + ')', offset: 0.4 },
        { opacity: 1, transform: 'translate(' + tx + 'px, ' + ty + 'px) scale(0.85)' },
      ], { duration: 820, delay: delay + i * 90, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'both' });
      anim.onfinish = function () {
        coin.busy = false;
        coin.el.style.opacity = '0';
        anim.cancel();
        pulseCoins();
      };
    }
  }

  // A one-line chip over a worker for 1.6 s (plan taken, why the trip left, abandon). Only for
  // workers on screen, at most FX_CHIP_MAX at once; the selected worker always gets his.
  function chipFor(builder, text, tone) {
    if (fxChipLog) fxChipLog.push(text);
    if (timeScale === 20 || !fxShown()) return;
    const viewState = stickViews.get(builder);
    if (!viewState) return;
    const selected = builder === selectedBuilder;
    const p = viewState.group.position;
    if (!fxProject(p.x, p.y + 2.3, p.z) && !selected) return;
    let slot = null;
    let free = null;
    let oldest = null;
    let active = 0;
    for (let i = 0; i < fxChips.length; i++) {
      const chip = fxChips[i];
      if (chip.life <= 0) {
        if (!free) free = chip;
        continue;
      }
      active += 1;
      if (chip.builder === builder) slot = chip;
      if (chip.builder !== selectedBuilder && (!oldest || chip.t > oldest.t)) oldest = chip;
    }
    if (!slot) {
      if (active >= FX_CHIP_MAX) {
        if (!selected || !oldest) return;
        slot = oldest;
      } else if (free) {
        slot = free;
      } else {
        slot = makeFx('fx-chip');
        fxChips.push(slot);
      }
    }
    slot.builder = builder;
    slot.t = 0;
    slot.life = 1.6;
    dressFx(slot, text, tone, '');
  }

  // After the camera moved: rings face it, floaters and chips follow their anchors on screen.
  function updateWorldFx(realDt) {
    fxTime += realDt;
    stickViews.forEach(function (viewState) {
      const badge = viewState.badge;
      if (badge.group.visible) badge.group.quaternion.copy(camera.quaternion);
    });
    if (fxAggregate.coins > 0) {
      fxAggregate.t += realDt;
      if (fxAggregate.t >= FX_AGGREGATE_SECONDS || timeScale !== 5) flushFxAggregate();
    }
    if (fxFloats.length === 0 && fxChips.length === 0) return;
    const shown = fxShown();
    const layer = document.getElementById('fx-layer');
    if (layer.hidden === shown) layer.hidden = !shown;
    camera.updateMatrixWorld();
    fxTop = cameraController.getSafeArea().top + 4;
    // Oldest first: a newer number that would cover an older one is placed under it.
    fxOrder.length = 0;
    for (let i = 0; i < fxFloats.length; i++) {
      const fx = fxFloats[i];
      if (fx.life <= 0) continue;
      fx.t += realDt;
      if (fx.t >= fx.life || !shown) retireFx(fx);
      else if (fx.t < 0) {
        if (!fx.el.hidden) fx.el.hidden = true;
      } else fxOrder.push(fx);
    }
    fxOrder.sort(function (a, b) { return b.t - a.t; });
    let placed = 0;
    for (let i = 0; i < fxOrder.length; i++) {
      if (placeFx(fxOrder[i], fxOrder[i].x, fxOrder[i].y, fxOrder[i].z, placed, false)) placed += 1;
    }
    for (let i = 0; i < fxChips.length; i++) {
      const chip = fxChips[i];
      if (chip.life <= 0) continue;
      chip.t += realDt;
      const viewState = chip.builder && stickViews.get(chip.builder);
      if (chip.t >= chip.life || !shown || !viewState) retireFx(chip);
      else if (placeFx(chip, viewState.group.position.x, viewState.group.position.y + 2.3, viewState.group.position.z, placed, true)) placed += 1;
    }
  }

  // Positions one floater or chip (stage px, kept inside the screen). One that overlaps a box placed
  // before it in this frame moves above it (chips, `up`) or below it (numbers).
  function placeFx(fx, x, y, z, stackIndex, up) {
    if (!fxProject(x, y, z)) {
      if (!fx.el.hidden) fx.el.hidden = true;
      return false;
    }
    if (fx.el.hidden) fx.el.hidden = false;
    if (!fx.width) {
      fx.width = fx.el.offsetWidth || 1;
      fx.height = fx.el.offsetHeight;
    }
    const u = fx.t / fx.life;
    const rise = fx.rise * (1 - (1 - u) * (1 - u) * (1 - u));
    const half = fx.width / 2;
    let sx = Math.min(Math.max(fxPoint.x, half + 4), MicroBuildersStage.width() - half - 4);
    // Never under the top HUD bars: a chip of a worker up there waits at their edge.
    let sy = Math.max(fxPoint.y - rise, fxTop + fx.height);
    for (let i = 0; i < stackIndex; i++) {
      const other = fxStack[i];
      if (Math.abs(other.x - sx) < other.half + half + 4 && sy > other.y - other.height - 2 && sy - fx.height < other.y + 2) {
        // Chips stack upward, but not under the top HUD: there they go below instead.
        const above = other.y - other.height - 3;
        sy = up && above - fx.height >= fxTop ? above : other.y + fx.height + 3;
      }
    }
    const slot = fxStack[stackIndex] || (fxStack[stackIndex] = {});
    slot.x = sx;
    slot.y = sy;
    slot.half = half;
    slot.height = fx.height;
    // Big floaters (luck, finds) start a little larger and settle.
    const pop = fx.big ? 1 + 0.35 * Math.pow(Math.max(0, 1 - u * 5), 2) : 1;
    fx.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) +
      'px,0) translate(-50%,-100%) scale(' + pop.toFixed(3) + ')';
    fx.el.style.opacity = (u < 0.08 ? u / 0.08 : u > 0.72 ? (1 - u) / 0.28 : 1).toFixed(2);
    return true;
  }

  // At ×5 plain coin floaters merge for FX_AGGREGATE_SECONDS into one at the latest spot.
  function floatWorldCoins(x, y, z, coins) {
    if (coins <= 0) return;
    if (timeScale !== 5) {
      floatAt(x, y, z, '+' + formatCompact(coins), 'coin');
      return;
    }
    fxAggregate.coins += coins;
    fxAggregate.x = x;
    fxAggregate.y = y;
    fxAggregate.z = z;
  }

  function flushFxAggregate() {
    const coins = fxAggregate.coins;
    fxAggregate.coins = 0;
    fxAggregate.t = 0;
    floatAt(fxAggregate.x, fxAggregate.y, fxAggregate.z, '+' + formatCompact(coins), 'coin');
  }

  function floatLucky(x, y, z, multiplier, coins) {
    floatAt(x, y, z, 'Удача ×' + multiplier + '! +' + formatCompact(coins), 'lucky');
    burst(x, y - 0.4, z, 0xffd34a, 16);
  }

  // A find follows the trip's coins by a moment, so the two numbers do not cover each other.
  function floatCapital(x, y, z, value) {
    floatAt(x, y, z, 'Находка! +' + value + ' капитала', 'capital', 'в казну компании', 0.45);
    burst(x, y - 0.5, z, 0xf2c75c, 6);
  }

  // The view's events from the logic (docs/tech/workers.md «Данные для вида»).
  function onWorkerEvent(event) {
    const builder = world.builders[event.builder];
    const viewState = builder && stickViews.get(builder);
    if (!viewState) return;
    if (event.type === 'plan') {
      // A plan is one trip, and the trip usually leaves in the same step: then the trip's chip
      // says both. Alone only when he first goes to eat or smoke.
      if (timeScale === 20 || !fxShown()) return;
      viewState.planEvent = event;
      if (!tripFollows(event)) {
        const kind = tripChipKind(event, null, builder);
        chipFor(builder, tripChipText(kind, event, null), TRIP_CHIP_TONES[kind] || 'plan');
        viewState.planEvent = null;
      }
    } else if (event.type === 'trip') {
      const plan = viewState.planEvent;
      viewState.planEvent = null;
      const kind = tripChipKind(plan, event, builder);
      chipFor(builder, tripChipText(kind, plan, event), TRIP_CHIP_TONES[kind] || 'plan');
    } else if (event.type === 'tripDone') {
      floatTrip(viewState, event);
    } else if (event.type === 'abandon') {
      // The cubes fall out of his hands: a burst, «!» for 2 s and the reason.
      viewState.badge.alertUntil = fxTime + 2;
      burst(event.x + 0.5, event.y + 0.8, event.z + 0.5, viewState.carryColor || 0xd9534f, 10);
      chipFor(builder, event.kind === 'stall' ? 'Стройка встала — назад к столу' : 'Нет пути — назад к столу', 'bad');
    }
  }

  function tripFollows(plan) {
    const events = world.events;
    for (let i = events.indexOf(plan) + 1; i < events.length; i++) {
      if (events[i].type === 'trip' && events[i].builder === plan.builder) return true;
    }
    return false;
  }

  // What sized this trip (plan = one trip, docs/gdd/02 «План и ноша»): a heavy cube carried in
  // parts, one mini-cube over the carry, cubes waiting for support, or the plan's own reason
  // ('count' «План работ», 'weight' «Ноша», 'front' no free cubes nearby).
  function tripChipKind(plan, trip, builder) {
    if (trip) {
      if (trip.parts > 0) return 'parts';
      if (trip.limit === 'heavy' || trip.limit === 'order') return trip.limit;
    }
    const reason = (plan ? plan.reason : trip.planReason) || 'count';
    if (reason !== 'heavy') return reason;
    // A plan alone: one cube heavier than the carry goes in parts unless a single piece is too.
    const block = builder.plan[0];
    return block && MB.carryWeight(campaign, block.materialId) > stickViews.get(builder).load.capacity ? 'heavy' : 'split';
  }

  function tripChipText(kind, plan, trip) {
    const weight = trip ? fxKg(trip.kg) + '/' + fxKg(trip.capacity) + ' кг' : '';
    if (kind === 'parts') return 'Несёт частями: ' + trip.part + ' из ' + trip.parts + ' · ' + weight;
    if (kind === 'heavy') return 'Один тяжёлый кубик · перегруз' + (trip ? ' ×' + formatFactor(trip.overload) : '');
    if (kind === 'order') return 'Ждут опоры: часть плана позже';
    if (kind === 'split') return 'Тяжёлый куб · несёт частями';
    const cubes = plan ? plan.cubes : trip.cubes;
    const count = cubes + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов');
    if (kind === 'front') return 'План: ' + cubes + ' из ' + (plan ? plan.limit : MB.planCubeLimit(campaign)) + ' · мало свободных кубов';
    if (kind === 'weight') {
      // A big next cube can stop a light load: «полна» would be wrong then.
      if (trip && trip.kg < trip.capacity * 0.8) return 'План: ' + count + ' · следующий не влез · ' + weight;
      return 'План: ' + count + ' · ноша полна';
    }
    return 'План: ' + count + (trip ? ' · ' + weight : '');
  }

  // Per trip: «+1 240» at the last cube (luck: «Удача ×3! +3 720» with a gold burst), and the
  // trip's capital coins as one find.
  function floatTrip(viewState, event) {
    viewState.lastTripCoins = event.coins;
    const finds = viewState.capitalCoins;
    viewState.capitalCoins = 0;
    const x = event.x + 0.5;
    const y = event.y + 1.1;
    const z = event.z + 0.5;
    // The coins already floated cube by cube (onPlace); the trip only adds its capital find.
    if (finds > 0) floatCapital(x, y, z, finds);
  }

  function noteCapitalCoin(index) {
    const builder = world.builders[index];
    const viewState = builder && stickViews.get(builder);
    if (viewState) viewState.capitalCoins += 1;
  }

  // Office capital finds (Meta.onBlocksPlaced → finds [{block, value}]).
  function floatFinds(finds) {
    if (!finds) return;
    for (let i = 0; i < finds.length; i++) {
      const block = finds[i].block;
      floatCapital(block.x + 0.5, block.y + 1.1, block.z + 0.5, finds[i].value);
    }
  }

  function floatDronePlace(event) {
    const block = event.block;
    const x = block.x + 0.5;
    const y = block.y + 1.1;
    const z = block.z + 0.5;
    if (event.lucky && event.gained > 0) floatLucky(x, y, z, event.luckyMultiplier, event.gained);
    else floatWorldCoins(x, y, z, event.gained);
    if (event.capitalCoin) floatCapital(x, y, z, 1);
  }

  function floatVehicleBatch(event, x, y, z) {
    if (event.luckyCount > 0 && event.gained > 0) floatLucky(x, y + 0.8, z, event.luckyMultiplier, event.gained);
    else floatWorldCoins(x, y + 0.8, z, event.gained);
    if (event.capitalCoins > 0) floatCapital(x, y + 0.8, z, event.capitalCoins);
  }

  // Golden cube / jackpot: a gold burst and the bare «+N» at the cube. The centred popup
  // (showLuckyPop) names the event and the capital, so the world side never repeats the title.
  function floatForeman(event) {
    if (event.card !== 'golden' && !event.jackpot) return;
    const block = event.block;
    floatAt(block.x + 0.5, block.y + 1.2, block.z + 0.5, '+' + formatCompact(event.gained), 'gold');
    burst(block.x + 0.5, block.y + 0.8, block.z + 0.5, 0xffd34a, 18);
  }

  function fxKg(value) {
    return String(value >= 20 ? Math.round(value) : Math.round(value * 10) / 10).replace('.', ',');
  }

  function formatFactor(value) {
    return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
  }

  // ---------- worker card (§6) ----------

  function workerCardNodes() {
    if (workerCard.nodes) return workerCard.nodes;
    const nodes = { card: document.getElementById('worker-card'), planWidth: '', loadWidth: '', bottom: '', tight: false, legendHeight: 0 };
    ['title', 'status', 'plan', 'load', 'limit', 'pay', 'needs'].forEach(function (key) {
      const el = document.getElementById('worker-card-' + key);
      el.textContent = '';
      nodes[key] = el.appendChild(document.createTextNode(''));
    });
    nodes.limitRow = document.getElementById('worker-card-limit');
    nodes.legend = document.getElementById('worker-card-legend');
    nodes.planBar = document.getElementById('worker-card-plan-bar');
    nodes.loadBar = document.getElementById('worker-card-load-bar');
    nodes.loadMeter = document.getElementById('worker-card-load-meter');
    document.getElementById('worker-card-close').addEventListener('click', function () { focusWorker(null); });
    document.getElementById('worker-card-follow').addEventListener('click', function () {
      cameraController.setWorkerView(!cameraController.isWorkerView());
      updateWorkerViewButton();
    });
    workerCard.nodes = nodes;
    return nodes;
  }

  function setNodeText(node, text) {
    if (node.data !== text) node.data = text;
  }

  function setBarWidth(nodes, key, share) {
    const width = Math.round(Math.min(1, Math.max(0, share)) * 100) + '%';
    if (nodes[key + 'Width'] === width) return;
    nodes[key + 'Width'] = width;
    nodes[key + 'Bar'].style.width = width;
  }

  // The selected worker's card: built once, its text nodes refreshed on the HUD tick (4 Hz).
  function paintWorkerCard() {
    const nodes = workerCardNodes();
    const builder = selectedBuilder;
    const viewState = builder ? stickViews.get(builder) : null;
    const show = !!viewState && currentScreen === 'build' && !!campaign && campaign.status !== 'title';
    if (nodes.card.hidden === show) nodes.card.hidden = !show;
    if (!show) return;
    const load = viewState.load;
    const rank = builder.expertiseRank;
    const title = rank ? (rank < 1 ? 'Младший' : rank > 1 ? 'Старший' : 'Средний') + ' рабочий' : 'Рабочий';
    setNodeText(nodes.title, title + ' ' + workerNumber(builder) + (rank ? ' · ' + Math.round(rank * 100) + '%' : ''));
    setNodeText(nodes.status, workerStatusText(builder, load));
    const limit = MB.planCubeLimit(campaign);
    const left = uniqueCubes(builder.plan);
    setNodeText(nodes.plan, left > 0 ? 'План: ' + left + ' из ' + limit : 'План: нет');
    setBarWidth(nodes, 'plan', limit > 0 ? left / limit : 0);
    const over = builder.carry.length > 0 && load.overload > 1.05;
    setNodeText(nodes.load, 'Ноша: ' + fxKg(load.kg) + ' / ' + fxKg(load.capacity) + ' кг' +
      (over ? ' · Перегруз ×' + formatFactor(load.overload) : ''));
    setBarWidth(nodes, 'load', load.fill);
    if (nodes.loadMeter.classList.contains('over') !== over) nodes.loadMeter.classList.toggle('over', over);
    const limitText = workerLimitText(builder);
    setNodeText(nodes.limit, limitText);
    if (nodes.limitRow.hidden === !!limitText) nodes.limitRow.hidden = !limitText;
    const current = builder.tripPours > 0;
    const coins = current ? builder.tripCoins : viewState.lastTripCoins;
    let pay = coins > 0 ? 'За ходку: +' + formatCompact(coins) : 'За ходку: —';
    if (current && builder.tripLucky > 0) pay += ' · удача ×' + builder.tripLuckyMultiplier;
    setNodeText(nodes.pay, pay);
    setNodeText(nodes.needs, workerNeedsText(builder));
    const area = cameraController.getSafeArea();
    const bottom = Math.round(area.bottom + 8) + 'px';
    if (nodes.bottom !== bottom) {
      nodes.bottom = bottom;
      nodes.card.style.bottom = bottom;
    }
    // A low band (landscape phones) has no room for the legend: it goes first.
    if (!nodes.tight) nodes.legendHeight = nodes.legend.offsetHeight + 5;
    const room = MicroBuildersStage.height() - area.top - area.bottom - 16;
    const tight = nodes.card.offsetHeight + (nodes.tight ? nodes.legendHeight : 0) > room;
    if (tight !== nodes.tight) {
      nodes.tight = tight;
      nodes.card.classList.toggle('tight', tight);
    }
  }

  // What sized his current (or last) trip; a heavy cube says which part he carries.
  function workerLimitText(builder) {
    if (!builder.tripLimit) return '';
    const split = builder.haulSplit;
    if (split && builder.tripLimit === 'carry') return 'Тяжёлый куб несёт частями: ' + split.trip + ' из ' + split.trips;
    return MicroBuildersWorkerLog.tripLimitText(builder.tripLimit);
  }

  // Workers are numbered among builders only (drones share the builders array).
  function workerNumber(builder) {
    let number = 0;
    for (let i = 0; i < world.builders.length; i++) {
      if (world.builders[i].trade !== 'engineer') number += 1;
      if (world.builders[i] === builder) break;
    }
    return number;
  }

  function uniqueCubes(list) {
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].built || list.indexOf(list[i]) !== i) continue;
      count += 1;
    }
    return count;
  }

  function workerStatusText(builder, load) {
    const phase = builder.phase;
    const purpose = phase === 'walk' ? builder.walkPurpose : '';
    if (phase === 'recover' || purpose === 'recover') return 'Нет пути — возвращается к столу';
    if (phase === 'meal') return 'Обед';
    if (purpose === 'meal') return 'Идёт обедать';
    if (phase === 'break') return builder.breakKind === 'rest' ? 'Отдых' : 'Перекур';
    if (purpose === 'smoke') return 'Идёт на перекур';
    if (phase === 'idle' && builder.waitReason === 'path') return 'Ждёт проход';
    if ((phase === 'plan' || phase === 'idle') && builder.waitReason === 'front') return 'Ждёт: нет свободных кубов';
    if (phase === 'plan') return 'Получает план';
    if (phase === 'mine' && builder.mineQueue[0]) return 'Набирает: ' + MB.MATERIAL[builder.mineQueue[0].materialId].name;
    if (phase === 'place' && builder.carry[0]) {
      const total = MB.pourTotal(builder.carry[0]);
      return total > 1 ? 'Кладёт куб ' + builder.carry[0].poured + '/' + total : 'Кладёт куб';
    }
    if (phase === 'erect') return 'Ставит леса';
    if (phase === 'passage') return 'Пробивает проход';
    if (builder.carry.length > 0) {
      const cubes = uniqueCubes(builder.carry);
      return 'Несёт ' + cubes + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов') + (load.overload > 1.05 ? ' · идёт медленнее' : '');
    }
    if (purpose === 'mine') return 'Идёт к карьеру';
    if (purpose === 'out') return 'Возвращается к столу';
    return MicroBuildersWorkerLog.statusOf(builder);
  }

  function workerNeedsText(builder) {
    const hunger = Math.round(Math.min(1, builder.hunger / MB.BALANCE.hungerMax) * 100);
    let smoke = '';
    if (builder.phase === 'break' && builder.breakKind === 'smoke') smoke = 'перекур сейчас';
    else if (builder.phase === 'walk' && builder.walkPurpose === 'smoke') smoke = 'идёт на перекур';
    else {
      const left = builder.smokeThreshold - builder.smokeNeed;
      smoke = left > 0 ? 'перекур через ' + MB.formatClock(left) : 'скоро перекур';
    }
    return 'Голод ' + hunger + '% · ' + smoke;
  }

  function workerLimb(geometry) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, workerMat.cloth);
    mesh.position.y = -0.16;
    mesh.castShadow = true;
    const hand = new THREE.Mesh(workerGeo.hand, workerMat.cloth);
    hand.position.y = -0.3;
    hand.castShadow = true;
    pivot.add(mesh, hand);
    return pivot;
  }

  function rankLook(rank) {
    if (!rank) return null;
    return rank < 1 ? RANK_LOOKS.junior : rank > 1 ? RANK_LOOKS.senior : RANK_LOOKS.middle;
  }

  function createStick(shirt, vestColor, size) {
    const group = new THREE.Group();
    const accent = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.5 });
    const head = new THREE.Mesh(workerGeo.head, workerMat.skin);
    head.position.y = 0.74;
    head.castShadow = true;
    const helmet = new THREE.Mesh(workerGeo.helmet, workerMat.hat);
    helmet.position.y = 0.76;
    helmet.castShadow = true;
    const brim = new THREE.Mesh(workerGeo.brim, workerMat.hat);
    brim.position.y = 0.77;
    brim.castShadow = true;
    const eyeL = new THREE.Mesh(workerGeo.eye, workerMat.eye);
    eyeL.position.set(-0.06, 0.7, 0.155);
    const eyeR = new THREE.Mesh(workerGeo.eye, workerMat.eye);
    eyeR.position.set(0.06, 0.7, 0.155);
    const torso = new THREE.Mesh(workerGeo.torso, workerMat.cloth);
    torso.position.y = 0.46;
    torso.castShadow = true;
    const vestMaterial = vestColor === null ? workerMat.vest : new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.46 });
    const vest = new THREE.Mesh(workerGeo.vest, vestMaterial);
    vest.position.set(0, 0.48, 0.02);
    vest.castShadow = true;
    const stripe = new THREE.Mesh(workerGeo.stripe, workerMat.stripe);
    stripe.position.set(0, 0.44, 0.03);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.04), accent);
    patch.position.set(0.09, 0.55, 0.12);
    const leftLeg = new THREE.Mesh(workerGeo.leg, workerMat.cloth);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(workerGeo.leg, workerMat.cloth);
    rightLeg.castShadow = true;
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.08, 0.32, 0);
    leftLeg.position.set(0, -0.18, 0);
    leftLegPivot.add(leftLeg);
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.08, 0.32, 0);
    rightLeg.position.set(0, -0.18, 0);
    rightLegPivot.add(rightLeg);
    const leftArm = workerLimb(workerGeo.arm);
    leftArm.position.set(-0.2, 0.58, 0.02);
    leftArm.rotation.z = 0.28;
    const rightArm = workerLimb(workerGeo.arm);
    rightArm.position.set(0.2, 0.58, 0.02);
    rightArm.rotation.z = -0.28;
    const pick = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), workerMat.cloth);
    const headPick = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.06), workerMat.pick);
    headPick.position.y = 0.18;
    pick.add(handle, headPick);
    pick.position.set(0.02, -0.28, 0.04);
    pick.rotation.z = 0.7;
    rightArm.add(pick);
    pick.visible = false;
    const cigarette = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6),
      new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.6 })
    );
    const cigaretteTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 6, 5),
      new THREE.MeshStandardMaterial({ color: 0xe07a32, emissive: 0xe07a32, emissiveIntensity: 0.4 })
    );
    cigaretteTip.position.y = 0.08;
    cigarette.add(cigaretteTip);
    cigarette.position.set(0.03, -0.34, 0.05);
    cigarette.rotation.z = 1.1;
    cigarette.visible = false;
    rightArm.add(cigarette);
    // The load rides on the back as a stack (the worker faces +z); one cube goes to the hands to set.
    const carry = new THREE.Group();
    carry.position.set(0, 0.4, -0.27);
    const hand = new THREE.Mesh(carryGeometry, workerMat.cloth);
    hand.castShadow = true;
    hand.visible = false;
    hand.position.set(0, 0.42, 0.3);
    // Carry slots are made once; paintCarryStack only shows, sizes and dresses them.
    for (let i = 0; i < CARRY_SLOTS; i++) {
      const cube = new THREE.Mesh(carryGeometry, workerMat.cloth);
      cube.castShadow = true;
      cube.visible = false;
      carry.add(cube);
    }
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    const selection = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.32, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdf55, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false })
    );
    selection.rotation.x = -Math.PI / 2;
    selection.position.y = 0.025;
    selection.visible = false;
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
    );
    hit.position.y = 0.5;
    group.add(shadow, torso, vest, stripe, patch, head, eyeL, eyeR, helmet, brim, leftLegPivot, rightLegPivot, leftArm, rightArm, carry, hand, selection, hit);
    group.scale.setScalar(STICK_SCALE * (size || 1));
    group.rotation.order = 'YXZ';
    group.userData = {
      leftLeg: leftLegPivot,
      rightLeg: rightLegPivot,
      leftArm: leftArm,
      rightArm: rightArm,
      pick: pick,
      cigarette: cigarette,
      carry: carry,
      hand: hand,
      selection: selection,
    };
    return group;
  }

  // Compact construction quadcopter: body with a winch, four arms with spinning rotors, skids and
  // nav lights. The sling (cable + cube) is kept level while the body tilts in flight.
  function createDrone() {
    const group = new THREE.Group();
    group.rotation.order = 'YXZ';
    const m = machineMat;
    const shell = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4, metalness: 0.25 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: 0.45, metalness: 0.2 });
    const body = new THREE.Group();
    group.add(body);
    vehicleBox(body, shell, [0.34, 0.12, 0.42], [0, 0, 0]);
    vehicleBox(body, orange, [0.36, 0.04, 0.12], [0, 0.07, 0.1]);
    vehicleBox(body, m.dark, [0.16, 0.08, 0.16], [0, -0.09, 0]);
    vehicleBox(body, m.glass, [0.14, 0.06, 0.04], [0, 0.01, 0.22]);
    const rotors = [];
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + i * Math.PI / 2;
      const x = Math.sin(angle) * 0.34;
      const z = Math.cos(angle) * 0.34;
      const arm = vehicleBox(body, m.dark, [0.04, 0.03, 0.36], [x / 2, 0.02, z / 2]);
      arm.rotation.y = angle;
      vehicleCylinder(body, m.dark, 0.035, 0.07, [x, 0.05, z], 'y');
      const rotor = new THREE.Group();
      rotor.position.set(x, 0.1, z);
      vehicleBox(rotor, m.dark, [0.3, 0.01, 0.035], [0, 0, 0]);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.16, 18), m.blur);
      disc.rotation.x = -Math.PI / 2;
      rotor.add(disc);
      body.add(rotor);
      rotors.push(rotor);
    }
    for (let side = -1; side <= 1; side += 2) {
      vehicleBox(body, m.dark, [0.02, 0.12, 0.02], [side * 0.12, -0.12, 0.1]);
      vehicleBox(body, m.dark, [0.02, 0.12, 0.02], [side * 0.12, -0.12, -0.1]);
      vehicleBox(body, m.dark, [0.025, 0.025, 0.34], [side * 0.12, -0.18, 0]);
    }
    const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshBasicMaterial({ color: 0x4dff7a }));
    navGreen.position.set(0.18, 0, 0.18);
    const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff4d4d }));
    navRed.position.set(-0.18, 0, 0.18);
    body.add(navGreen, navRed);
    const sling = new THREE.Group();
    group.add(sling);
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.02), m.dark);
    cable.visible = false;
    sling.add(cable);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), blockSurface(MB.MATERIALS[0].id, false));
    cube.visible = false;
    cube.castShadow = true;
    sling.add(cube);
    group.userData = {
      drone: true,
      body: body,
      rotors: rotors,
      sling: sling,
      cable: cable,
      cube: cube,
      cubeMaterial: '',
      pitch: 0,
      lastX: 0,
      lastZ: 0,
    };
    return group;
  }

  function addDronePad(cell) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.05, 1.05),
      new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: 0.85 })
    );
    base.position.y = 0.025;
    base.receiveShadow = true;
    group.add(base);
    const mark = new THREE.MeshStandardMaterial({ color: 0xf2c75c, roughness: 0.6 });
    const bars = [[0.08, 0.46, -0.16, 0], [0.08, 0.46, 0.16, 0], [0.3, 0.08, 0, 0]];
    for (let i = 0; i < bars.length; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(bars[i][0], 0.012, bars[i][1]), mark);
      bar.position.set(bars[i][2], 0.056, bars[i][3]);
      group.add(bar);
    }
    group.position.set(cell[0], 0, cell[2]);
    levelRoot.add(group);
  }

  // Cable length below the drone for the current job step (lowering to rocks, slots and blocks).
  function droneSling(builder) {
    const total = Math.max(builder.actionT + builder.timer, 0.001);
    const p = builder.actionT / total;
    const carry = 0.5;
    if (builder.phase === 'pick') {
      const reach = Math.max(carry, builder.cell[1] - 1.1);
      const down = smoothStep(p / 0.35);
      const up = smoothStep((p - 0.65) / 0.35);
      return { length: carry + (reach - carry) * (down - up), cube: p > 0.4 };
    }
    if (builder.phase === 'drop' && builder.yardSlot) {
      const reach = Math.max(carry, builder.cell[1] - (builder.yardSlot.wy + 1) - 0.12);
      return { length: carry + (reach - carry) * smoothStep(p / 0.9), cube: true };
    }
    if (builder.phase === 'place' && builder.droneBlock) {
      const reach = Math.max(carry, builder.cell[1] - (builder.droneBlock.y + 1) - 0.12);
      return { length: carry + (reach - carry) * smoothStep(p / 0.15), cube: true };
    }
    return { length: carry, cube: builder.carryingCube === true };
  }

  function updateDroneView(viewState, builder, time, dt) {
    const group = viewState.group;
    const data = group.userData;
    const frozen = timeScale === 0;
    const airborne = builder.phase !== 'home' || builder.cell[1] > 0.45;
    const bob = airborne && timeScale !== 20 ? Math.sin(time * 3.1 + builder.index * 1.7) * 0.035 : 0;
    group.position.set(builder.cell[0], builder.cell[1] + bob, builder.cell[2]);
    data.lastX = builder.cell[0];
    data.lastZ = builder.cell[2];
    group.rotation.y = builder.heading || 0;
    const speedShare = builder.phase === 'fly' ? Math.min(1, (builder.currentSpeed || 0) / 6) : 0;
    data.pitch += (speedShare * 0.32 - data.pitch) * 0.15;
    data.body.rotation.x = data.pitch;
    const spin = frozen ? 0 : airborne ? 1.1 : 0.12;
    for (let i = 0; i < data.rotors.length; i++) data.rotors[i].rotation.y += i % 2 === 0 ? spin : -spin;
    // The load hangs level and square to the grid whatever way the drone faces.
    data.sling.rotation.y = -group.rotation.y;
    const sling = droneSling(builder);
    const material = builder.droneBlock ? builder.droneBlock.materialId : builder.carryMaterial;
    const showCube = sling.cube && material;
    data.cable.visible = airborne && (showCube || builder.phase === 'pick');
    data.cable.scale.y = sling.length;
    data.cable.position.y = -0.14 - sling.length / 2;
    data.cube.visible = !!showCube;
    if (showCube) {
      if (data.cubeMaterial !== material) {
        data.cubeMaterial = material;
        data.cube.material = blockSurface(material, false);
      }
      data.cube.position.y = -0.14 - sling.length - 0.45;
    }
    updateBadge(viewState, builder, droneIntent(builder), dt, viewState.load);
  }

  // realDt drives the status icons and the stride: both stand still while the game is paused.
  function updateSticks(time, realDt) {
    const dt = timeScale === 0 ? 0 : realDt || 0;
    badgeRoot.visible = levelRoot.visible;
    workerPlan.visible = levelRoot.visible;
    updateBadgeLod();
    stickViews.forEach(function (viewState, builder) {
      const group = viewState.group;
      if (builder.trade === 'engineer') {
        updateDroneView(viewState, builder, time, dt);
        return;
      }
      const pos = MB.builderPosition(builder, world, viewState.pos || (viewState.pos = {}));
      const t = pos.mode === 'ride' ? 0 : builder.segmentT;
      const x = pos.x;
      // Onto or off a cube the body follows a climbing / hopping curve, not the logic's straight line.
      const y = pos.mode === 'climb'
        ? builder.from[1] + (builder.to[1] - builder.from[1]) * climbLift(pos.climb) + climbDip(pos.climb)
        : pos.mode === 'descend'
          ? builder.from[1] + jumpHeight(pos.climb, builder.to[1] - builder.from[1]) + jumpDip(pos.climb)
          : pos.y;
      const z = pos.z;
      // On a ladder he stands in front of it, facing the wall it hangs on; elsewhere a worker with
      // no floor under him clings to the nearest wall.
      const w0 = mastDir(builder.from[0], builder.from[1], builder.from[2]);
      const w1 = mastDir(builder.to[0], builder.to[1], builder.to[2]);
      const wall = w1 || w0;
      const hanging = builder.phase !== 'walk' && !!wall && hangingAt(builder.cell);
      const cling = wall ? NO_SHIFT : clingShift(builder.to);
      const nudgeX = ((w0 ? w0[0] : 0) + ((w1 ? w1[0] : 0) - (w0 ? w0[0] : 0)) * t) * LADDER_STAND;
      const nudgeZ = ((w0 ? w0[1] : 0) + ((w1 ? w1[1] : 0) - (w0 ? w0[1] : 0)) * t) * LADDER_STAND;
      const sit = builder.phase === 'break' && builder.breakKind === 'rest' ? 0.12 : 0;
      group.position.set(x + 0.5 + cling[0] + nudgeX, y - sit, z + 0.5 + cling[1] + nudgeZ);
      let yawTarget = viewState.yaw === undefined ? group.rotation.y : viewState.yawTarget;
      if ((pos.mode === 'ladder' || hanging) && wall) {
        yawTarget = Math.atan2(wall[0], wall[1]);
      } else {
        const faceDx = builder.faceX + 0.5 - group.position.x;
        const faceDz = builder.faceZ + 0.5 - group.position.z;
        if (faceDx * faceDx + faceDz * faceDz > 0.0004) yawTarget = Math.atan2(faceDx, faceDz);
      }
      // He turns at a limited speed instead of snapping (visual only: the logic's timing is untouched).
      viewState.yawTarget = yawTarget;
      if (viewState.yaw === undefined || timeScale === 20) viewState.yaw = yawTarget;
      else if (dt > 0) {
        let turn = yawTarget - viewState.yaw;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        const step = TURN_SPEED * dt * Math.max(1, timeScale);
        viewState.yaw += Math.abs(turn) <= step ? turn : Math.sign(turn) * step;
      }
      group.rotation.y = viewState.yaw;
      const moving = builder.phase === 'walk';
      const load = MB.carryLoad(builder, world, viewState.load);
      const carrying = builder.carry.length > 0;
      const fill = carrying ? Math.min(load.fill, 1) : 0;
      const heavy = carrying && load.overload > 1;
      // A fuller load leans the worker forward and shortens and slows his stride; overload more so.
      if (moving && dt > 0 && timeScale !== 20) viewState.gait += dt * (heavy ? 5 : 11 - 4 * fill);
      const step = Math.sin(viewState.gait + builder.index);
      const swing = timeScale === 20
        ? 0
        : moving
          ? step * (heavy ? 0.4 : 0.75 - 0.25 * fill)
          : Math.sin(time * 2 + builder.index) * 0.04;
      group.rotation.x = carrying ? 0.04 + 0.1 * fill + (heavy ? 0.12 : 0) : 0;
      group.userData.carry.position.y = heavy ? 0.34 : 0.4;
      if (heavy && moving && timeScale !== 20) group.position.y -= Math.abs(step) * 0.05;
      group.userData.leftLeg.rotation.x = swing;
      group.userData.rightLeg.rotation.x = -swing;
      if (builder.phase === 'mine') {
        group.userData.rightArm.rotation.x = timeScale === 20
          ? -0.6
          : -0.6 + Math.sin(builder.actionT * 16) * 1.05;
        group.userData.leftArm.rotation.x = 0.35;
        if (timeScale !== 20 && Math.sin(builder.actionT * 16) > 0.92) {
          burst(builder.faceX + 0.5, 0.7, builder.faceZ + 0.5, MB.MATERIAL[builder.mineQueue[0].materialId].color, 2);
        }
      } else if (builder.phase === 'plan') {
        group.userData.rightArm.rotation.x = -1.05;
        group.userData.leftArm.rotation.x = -1.05;
      } else if (hanging) {
        // On a ladder, not climbing: hands on the rails, feet on a rung; setting the next ladder
        // piece, the right hand works above his head.
        const work = builder.phase === 'erect' && timeScale !== 20 ? Math.sin(builder.actionT * 14) : 0;
        group.userData.rightArm.rotation.x = builder.phase === 'erect' ? -2.75 + work * 0.35 : -2.45;
        group.userData.leftArm.rotation.x = -2.35;
        group.userData.rightLeg.rotation.x = -0.45;
        group.userData.leftLeg.rotation.x = -0.65;
        group.rotation.x = 0.12;
        if (timeScale === 1 && builder.phase === 'erect' && work > 0.92) {
          burst(group.position.x, builder.cell[1] + 1.4, group.position.z, 0xc2a36b, 2);
        }
      } else if (builder.phase === 'place') {
        // Both hands hold the cube that crumbles into the build.
        const shake = timeScale === 20 ? 0 : Math.sin(builder.actionT * 18) * 0.06;
        group.userData.rightArm.rotation.x = -1.25 + shake;
        group.userData.leftArm.rotation.x = -1.25 - shake;
      } else if (builder.phase === 'erect' || builder.phase === 'assist') {
        group.userData.rightArm.rotation.x = -1.15;
        group.userData.leftArm.rotation.x = -0.45;
        if (timeScale === 1 && builder.phase === 'erect' && Math.sin(builder.actionT * 14) > 0.92) {
          burst(builder.faceX + 0.5, builder.cell[1] + 0.9, builder.faceZ + 0.5, 0xc2a36b, 2);
        }
      } else if (moving && pos.mode === 'ladder') {
        // Hand over hand: one full arm-and-leg cycle per rung floor, in step with the height, so
        // it never runs ahead of the climb; a little chest-to-the-ladder lean and bob.
        const phase = (builder.from[1] + (builder.to[1] - builder.from[1]) * pos.climb) * Math.PI * 2 + builder.index;
        const k = timeScale === 20 ? 0 : Math.sin(phase);
        group.userData.rightArm.rotation.x = -2.5 + 0.5 * k;
        group.userData.leftArm.rotation.x = -2.5 - 0.5 * k;
        group.userData.rightLeg.rotation.x = -0.55 - 0.45 * k;
        group.userData.leftLeg.rotation.x = -0.55 + 0.45 * k;
        group.rotation.x = 0.12;
        group.position.y += 0.03 * Math.abs(Math.cos(phase));
      } else if (moving && pos.mode === 'climb') {
        poseClimbUp(group, timeScale === 20 ? 0.5 : pos.climb);
      } else if (moving && pos.mode === 'descend') {
        poseJumpDown(group, timeScale === 20 ? 0.6 : pos.climb);
      } else if (heavy) {
        // Bent under the load on the back, hands on the straps.
        const strain = timeScale === 20 ? 0 : Math.sin(time * 34 + builder.index) * 0.05;
        group.userData.leftArm.rotation.x = 0.3 + strain;
        group.userData.rightArm.rotation.x = 0.3 - strain;
      } else if (builder.carry.length > 0) {
        group.userData.leftArm.rotation.x = -swing * 0.55;
        group.userData.rightArm.rotation.x = swing * 0.55;
      } else {
        group.userData.leftArm.rotation.x = -swing * 0.85;
        group.userData.rightArm.rotation.x = swing * 0.85;
      }
      if (builder.phase === 'meal') {
        group.userData.leftArm.rotation.x = -2.15;
        group.userData.rightArm.rotation.x = -2.15;
      } else if (builder.phase === 'break' && builder.breakKind === 'rest') {
        group.userData.leftArm.rotation.x = 0.4;
        group.userData.rightArm.rotation.x = 0.4;
        group.userData.leftLeg.rotation.x = 1.15;
        group.userData.rightLeg.rotation.x = 1.15;
      } else if (builder.phase === 'break' && builder.breakKind === 'smoke') {
        const drag = timeScale === 20 ? 0 : Math.sin(builder.actionT * 3.2);
        group.userData.rightArm.rotation.x = -2.15 - drag * 0.28;
        group.userData.leftArm.rotation.x = 0.12;
        if (timeScale !== 20 && drag > 0.92) {
          burst(group.position.x, group.position.y + 1.05, group.position.z, 0xf7f4ee, 2);
        }
      }
      group.userData.cigarette.visible = builder.phase === 'break' && builder.breakKind === 'smoke';
      updateHandCube(viewState, builder, group, dt);
      updateBadge(viewState, builder, workerIntent(builder, load, viewState.badge), dt, load);
      group.userData.pick.visible = builder.phase === 'mine';
      // carryVersion changes with every change of the carry; the capacity with a new trip.
      // The cube being set is in the hands, not on the back: the stack shrinks as placing starts.
      const inHands = builder.phase === 'place' ? builder.carry[0] || null : null;
      if (viewState.carryVersion !== builder.carryVersion || viewState.carryHand !== inHands ||
          (carrying && viewState.carryCap !== load.capacity)) {
        viewState.carryVersion = builder.carryVersion;
        viewState.carryHand = inHands;
        viewState.carryCap = load.capacity;
        paintCarryStack(viewState, builder, load, inHands);
      }
    });
  }

  function updateWorkerPlan(time) {
    if (!selectedBuilder) return;
    const pieces = [];
    if (selectedBuilder.routeId >= 0) {
      const route = world.routes[selectedBuilder.routeId];
      for (let i = route.stepIndex; i < route.steps.length; i++) {
        const piece = route.steps[i].piece;
        if (piece && !piece.built && !piece.removed && !pieces.includes(piece)) pieces.push(piece);
      }
    }
    if (selectedBuilder.erectPiece && !pieces.includes(selectedBuilder.erectPiece)) {
      pieces.push(selectedBuilder.erectPiece);
    }
    const planBlocks = [];
    const seenPlan = new Set();
    for (let i = 0; i < selectedBuilder.plan.length; i++) {
      const block = selectedBuilder.plan[i];
      if (block.built || seenPlan.has(block.id)) continue;
      seenPlan.add(block.id);
      planBlocks.push(block);
    }
    const carryCounts = new Map();
    for (let i = 0; i < selectedBuilder.carry.length; i++) {
      const block = selectedBuilder.carry[i];
      if (block.built) continue;
      if (!carryCounts.has(block)) carryCounts.set(block, 0);
      carryCounts.set(block, carryCounts.get(block) + 1);
      if (!seenPlan.has(block.id)) {
        seenPlan.add(block.id);
        planBlocks.push(block);
      }
    }
    const routeCells = selectedRouteCells(selectedBuilder);
    const signature = selectedBuilder.index + '|' +
      planBlocks.map(function (block) {
        const hauled = carryCounts.has(block) ? carryCounts.get(block) : 0;
        return block.id + ':' + block.poured + ':' + hauled;
      }).join(',') + '|' +
      pieces.map(function (piece) { return piece.id; }).join(',') + '|' +
      routeCells.map(function (cell) { return cell[0] + ':' + cell[1] + ':' + cell[2]; }).join(',');
    const planChanged = signature !== workerPlanSignature;
    if (planChanged) {
      workerPlanSignature = signature;
      rebuildWorkerPlan(planBlocks, carryCounts, pieces, routeCells);
    }
    if (timeScale === 20) return;
    const wave = Math.sin(time * 5) * 0.13;
    workerPlan.traverse(function (object) {
      if (object.material && object.userData.blink !== undefined) {
        object.material.opacity = object.userData.blink + wave;
      }
    });
  }

  function selectedRouteCells(builder) {
    if (builder.routeId < 0) return [];
    const route = world.routes[builder.routeId];
    if (!route || route.complete) return [];
    const cells = [builder.cell];
    for (let i = route.stepIndex; i < route.steps.length; i++) {
      const cell = route.steps[i].cell;
      const prev = cells[cells.length - 1];
      if (prev[0] === cell[0] && prev[1] === cell[1] && prev[2] === cell[2]) continue;
      cells.push(cell);
    }
    return cells;
  }

  function addRouteLine(cells) {
    if (cells.length < 2) return;
    const positions = new Float32Array(cells.length * 3);
    for (let i = 0; i < cells.length; i++) {
      positions[i * 3] = cells[i][0] + 0.5;
      positions[i * 3 + 1] = cells[i][1] + 0.5;
      positions[i * 3 + 2] = cells[i][2] + 0.5;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
      color: 0x3dce67,
      transparent: true,
      opacity: 1,
      depthTest: false,
    }));
    line.renderOrder = 30;
    workerPlan.add(line);
  }

  function rebuildWorkerPlan(blocks, carryCounts, pieces, routeCells) {
    clearWorkerPlan();
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const total = MB.pourTotal(block);
      const hauled = carryCounts.has(block) ? carryCounts.get(block) : 0;
      let color = 0x4c8dff;
      let blink = 0.22;
      if (hauled > 0 && hauled < total - block.poured) {
        color = 0xf2c14a;
        blink = 0.36;
      } else if (hauled > 0) {
        color = 0x3dce67;
        blink = 0.36;
      }
      addWorkerPlanBox(
        block.x + 0.5,
        block.y + 0.5,
        block.z + 0.5,
        0.94,
        0.94,
        0.94,
        color,
        blink
      );
    }
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].deck) addWorkerPlanDeck(pieces[i]);
      else addWorkerPlanLadder(pieces[i]);
    }
    addRouteLine(routeCells);
  }

  function addWorkerPlanDeck(deck) {
    addWorkerPlanBox(deck.x + 0.5, deck.y + 0.07, deck.z + 0.5, 0.94, 0.1, 0.94, 0x4ce6e0, 0.25);
  }

  function addWorkerPlanLadder(piece) {
    const perpX = -piece.oz;
    const perpZ = piece.ox;
    const out = 0.14;
    const spread = 0.11;
    const x1 = piece.x + 0.5 + piece.ox * out + perpX * spread;
    const z1 = piece.z + 0.5 + piece.oz * out + perpZ * spread;
    const x2 = piece.x + 0.5 + piece.ox * out - perpX * spread;
    const z2 = piece.z + 0.5 + piece.oz * out - perpZ * spread;
    addWorkerPlanBox(x1, piece.y + 0.5, z1, 0.055, 1, 0.055, 0xffc84a, 0.25);
    addWorkerPlanBox(x2, piece.y + 0.5, z2, 0.055, 1, 0.055, 0xffc84a, 0.25);
    const spanX = x2 - x1;
    const spanZ = z2 - z1;
    const span = Math.hypot(spanX, spanZ);
    for (let i = 1; i <= 4; i++) {
      const rung = addWorkerPlanBox(
        (x1 + x2) * 0.5,
        piece.y + i / 5,
        (z1 + z2) * 0.5,
        0.045,
        span,
        0.045,
        0xffc84a,
        0.25
      );
      rung.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(spanX, 0, spanZ).normalize()
      );
    }
  }

  function addWorkerPlanBox(x, y, z, sx, sy, sz, color, blink) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: blink,
        depthWrite: false,
        depthTest: false,
      })
    );
    mesh.position.set(x, y, z);
    mesh.userData.blink = blink;
    mesh.renderOrder = 20;
    workerPlan.add(mesh);
    return mesh;
  }

  function clearWorkerPlan() {
    while (workerPlan.children.length > 0) {
      const child = workerPlan.children[workerPlan.children.length - 1];
      child.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
      workerPlan.remove(child);
    }
  }

  function updateFeatures(deltaTime, elapsedTime) {
    const walkers = [];
    stickViews.forEach(function (viewState, builder) {
      if (builder.phase === 'walk') walkers.push(builder);
    });
    Features.update(featureState, deltaTime, elapsedTime, walkers);
  }

  function clingShift(cell) {
    if (cell[1] === 0) return [0, 0];
    const index = world.index;
    if (!index.inside(cell[0], cell[1] - 1, cell[2])) return [0, 0];
    if (world.solidGrid[index.id(cell[0], cell[1] - 1, cell[2])] === 1) return [0, 0];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < dirs.length; i++) {
      const x = cell[0] + dirs[i][0];
      const z = cell[2] + dirs[i][1];
      if (!index.inside(x, cell[1], z)) continue;
      if (world.solidGrid[index.id(x, cell[1], z)] === 1) return [dirs[i][0] * 0.26, dirs[i][1] * 0.26];
    }
    return [0, 0];
  }

  // The wall a ladder at this cell (or the one he stands on below) hangs on: [ox, oz] or null.
  function mastDir(x, y, z) {
    const upper = world.rungByKey.get(MB.cellKey(x, y, z));
    if (upper && upper.built && !upper.removed) return upper.dir || (upper.dir = [upper.ox, upper.oz]);
    const lower = world.rungByKey.get(MB.cellKey(x, y - 1, z));
    if (lower && lower.built && !lower.removed) return lower.dir || (lower.dir = [lower.ox, lower.oz]);
    return null;
  }

  // No floor under him: he is on the ladder itself.
  function hangingAt(cell) {
    if (cell[1] === 0) return false;
    const index = world.index;
    if (!index.inside(cell[0], cell[1] - 1, cell[2])) return false;
    const below = index.id(cell[0], cell[1] - 1, cell[2]);
    return world.solidGrid[below] !== 1 && world.deckGrid[index.id(cell[0], cell[1], cell[2])] !== 1;
  }


  function onScaffold(event) {
    if (timeScale === 1) {
      burst(event.x + 0.5, event.y + 0.45, event.z + 0.5, 0xc2a36b, 4);
      tone(210, 0.045);
    }
  }

  function revealScaffold(id) {
    const list = scaffoldLookup.get(id);
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      item.mesh.setMatrixAt(item.index, item.matrix);
      scaffoldDirty.add(item.mesh);
    }
  }

  function flushScaffold() {
    scaffoldDirty.forEach(function (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
    });
    scaffoldDirty.clear();
  }

  function clearScaffoldView() {
    for (let i = 0; i < scaffoldMeshes.length; i++) {
      const mesh = scaffoldMeshes[i];
      levelRoot.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.dispose();
    }
    scaffoldMeshes = [];
    scaffoldLookup = new Map();
  }

  function refreshScaffoldView() {
    const started = performance.now();
    buildScaffoldView();
    for (let i = 0; i < world.scaffoldPieces.length; i++) {
      const piece = world.scaffoldPieces[i];
      if (piece.built && !piece.removed) revealScaffold(piece.id);
    }
    for (let i = 0; i < world.scaffoldDecks.length; i++) {
      const deck = world.scaffoldDecks[i];
      if (deck.built && !deck.removed) revealScaffold(deck.id);
    }
    flushScaffold();
    MicroBuildersProfiler.add('scaffoldView', performance.now() - started);
  }

  function buildScaffoldView() {
    clearScaffoldView();
    const pieces = world.scaffoldPieces.filter(function (piece) { return !piece.removed; });
    const decks = world.scaffoldDecks.filter(function (deck) { return !deck.removed; });
    if (pieces.length === 0 && decks.length === 0) return;
    const poles = [];
    const rungs = [];
    const braces = [];
    const plates = [];
    const planks = [];
    const rails = [];
    const posts = [];
    const couplers = [];
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    function stamp(list, id, px, py, pz, sx, sy, sz, dx, dy, dz, also) {
      dummy.position.set(px, py, pz);
      dummy.scale.set(sx, sy, sz);
      if (dx === 0 && dz === 0 && dy >= 0) dummy.quaternion.identity();
      else {
        dir.set(dx, dy, dz).normalize();
        dummy.quaternion.setFromUnitVectors(up, dir);
      }
      dummy.updateMatrix();
      list.push({ id: id, also: also || '', matrix: dummy.matrix.clone() });
    }
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const ox = piece.ox;
      const oz = piece.oz;
      const perpX = -oz;
      const perpZ = ox;
      const ladder = piece.ladder;
      const spread = ladder ? 0.11 : 0.17;
      const out = ladder ? 0.14 : 0.26;
      const x1 = piece.x + 0.5 + ox * out + perpX * spread;
      const z1 = piece.z + 0.5 + oz * out + perpZ * spread;
      const x2 = piece.x + 0.5 + ox * out - perpX * spread;
      const z2 = piece.z + 0.5 + oz * out - perpZ * spread;
      const radius = ladder ? 0.032 : 0.048;
      stamp(poles, piece.id, x1, piece.y + 0.5, z1, radius, 1, radius, 0, 1, 0);
      stamp(poles, piece.id, x2, piece.y + 0.5, z2, radius, 1, radius, 0, 1, 0);
      stamp(couplers, piece.id, x1, piece.y + 1, z1, 0.075, 0.075, 0.075, 0, 1, 0);
      stamp(couplers, piece.id, x2, piece.y + 1, z2, 0.075, 0.075, 0.075, 0, 1, 0);
      const spanX = x2 - x1;
      const spanZ = z2 - z1;
      const span = Math.hypot(spanX, spanZ);
      const rungCount = ladder ? 4 : 2;
      for (let r = 1; r <= rungCount; r++) {
        stamp(rungs, piece.id, (x1 + x2) / 2, piece.y + r / (rungCount + 1), (z1 + z2) / 2, 0.018, span, 0.018, spanX, 0, spanZ);
      }
      stamp(rungs, piece.id, (x1 + x2) / 2, piece.y + 1, (z1 + z2) / 2, 0.028, span, 0.028, spanX, 0, spanZ);
      if (!ladder && piece.y % 2 === 0) {
        stamp(braces, piece.id, (x1 + x2) / 2, piece.y + 0.5, (z1 + z2) / 2, 0.02, Math.hypot(spanX, 1, spanZ), 0.02, spanX, 1, spanZ);
        stamp(braces, piece.id, (x1 + x2) / 2, piece.y + 0.5, (z1 + z2) / 2, 0.02, Math.hypot(spanX, 1, spanZ), 0.02, -spanX, 1, -spanZ);
      }
      if (piece.y === 0) {
        const plateX = Math.abs(perpX) * 0.34 + 0.22;
        const plateZ = Math.abs(perpZ) * 0.34 + 0.22;
        stamp(plates, piece.id, (x1 + x2) / 2, 0.025, (z1 + z2) / 2, plateX, 0.05, plateZ, 0, 1, 0);
      }
    }
    const deckAt = new Set();
    const ladderBy = new Map();
    for (let i = 0; i < decks.length; i++) {
      deckAt.add(decks[i].x + ':' + decks[i].y + ':' + decks[i].z);
    }
    for (let i = 0; i < pieces.length; i++) {
      if (!pieces[i].ladder) continue;
      const key = pieces[i].x + ':' + (pieces[i].y + 1) + ':' + pieces[i].z;
      deckAt.add(key);
      ladderBy.set(key, pieces[i]);
    }
    function hasConnectedSide(x, y, z) {
      if (deckAt.has(x + ':' + y + ':' + z)) return true;
      if (!world.index.inside(x, y, z)) return false;
      if (world.solidGrid[world.index.id(x, y, z)] === 1) return true;
      if (y === 0) return true;
      if (!world.index.inside(x, y - 1, z)) return false;
      return world.solidGrid[world.index.id(x, y - 1, z)] === 1;
    }
    function layRail(id, y, x0, z0, x1, z1) {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const mx = (x0 + x1) * 0.5;
      const mz = (z0 + z1) * 0.5;
      const len = Math.hypot(dx, dz);
      stamp(braces, id, mx, y + 0.88, mz, 0.024, len, 0.024, dx, 0, dz);
      stamp(rails, id, mx, y + 0.5, mz, 0.018, len, 0.018, dx, 0, dz);
      stamp(posts, id, x0, y + 0.46, z0, 0.028, 0.86, 0.028, 0, 1, 0);
      stamp(posts, id, x1, y + 0.46, z1, 0.028, 0.86, 0.028, 0, 1, 0);
    }
    for (let i = 0; i < decks.length; i++) {
      const deck = decks[i];
      const east = hasConnectedSide(deck.x + 1, deck.y, deck.z);
      const west = hasConnectedSide(deck.x - 1, deck.y, deck.z);
      const north = hasConnectedSide(deck.x, deck.y, deck.z + 1);
      const south = hasConnectedSide(deck.x, deck.y, deck.z - 1);
      const minX = deck.x + 0.5 - (west ? 0.48 : 0.32);
      const maxX = deck.x + 0.5 + (east ? 0.48 : 0.32);
      const minZ = deck.z + 0.5 - (south ? 0.48 : 0.32);
      const maxZ = deck.z + 0.5 + (north ? 0.48 : 0.32);
      const px = (minX + maxX) * 0.5;
      const pz = (minZ + maxZ) * 0.5;
      const lenX = maxX - minX;
      const lenZ = maxZ - minZ;
      const ladder = ladderBy.get(deck.x + ':' + deck.y + ':' + deck.z);
      if (ladder) {
        const holeX = ladder.ox !== 0 ? 0.416 : 0.52;
        const holeZ = ladder.oz !== 0 ? 0.416 : 0.52;
        const holeCenterX = deck.x + 0.5 + ladder.ox * 0.14;
        const holeCenterZ = deck.z + 0.5 + ladder.oz * 0.14;
        const holeMinX = holeCenterX - holeX * 0.5;
        const holeMaxX = holeCenterX + holeX * 0.5;
        const holeMinZ = holeCenterZ - holeZ * 0.5;
        const holeMaxZ = holeCenterZ + holeZ * 0.5;
        stamp(planks, deck.id, (minX + holeMinX) * 0.5, deck.y + 0.055, pz, holeMinX - minX, 0.045, lenZ, 0, 1, 0);
        stamp(planks, deck.id, (holeMaxX + maxX) * 0.5, deck.y + 0.055, pz, maxX - holeMaxX, 0.045, lenZ, 0, 1, 0);
        stamp(planks, deck.id, holeCenterX, deck.y + 0.055, (minZ + holeMinZ) * 0.5, holeX, 0.045, holeMinZ - minZ, 0, 1, 0);
        stamp(planks, deck.id, holeCenterX, deck.y + 0.055, (holeMaxZ + maxZ) * 0.5, holeX, 0.045, maxZ - holeMaxZ, 0, 1, 0);
      } else {
        stamp(planks, deck.id, px, deck.y + 0.055, pz, lenX, 0.045, lenZ, 0, 1, 0);
      }
      if (!east) layRail(deck.id, deck.y, maxX, minZ, maxX, maxZ);
      if (!west) layRail(deck.id, deck.y, minX, minZ, minX, maxZ);
      if (!north) layRail(deck.id, deck.y, minX, maxZ, maxX, maxZ);
      if (!south) layRail(deck.id, deck.y, minX, minZ, maxX, minZ);
    }
    const byFloor = new Map();
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      let list = byFloor.get(piece.y);
      if (!list) {
        list = [];
        byFloor.set(piece.y, list);
      }
      list.push(piece);
    }
    function bayPoint(piece) {
      const ladder = piece.ladder;
      const out = ladder ? 0.14 : 0.26;
      return [piece.x + 0.5 + piece.ox * out, piece.z + 0.5 + piece.oz * out];
    }
    byFloor.forEach(function (list) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          if (dx !== 0 && dz !== 0) continue;
          const dist = Math.abs(dx) + Math.abs(dz);
          if (dist === 0 || dist > 2) continue;
          let blocked = false;
          for (let k = 0; k < list.length; k++) {
            const c = list[k];
            if (c === a || c === b) continue;
            if (a.x === b.x && c.x === a.x && c.z > Math.min(a.z, b.z) && c.z < Math.max(a.z, b.z)) blocked = true;
            if (a.z === b.z && c.z === a.z && c.x > Math.min(a.x, b.x) && c.x < Math.max(a.x, b.x)) blocked = true;
          }
          if (blocked) continue;
          const pa = bayPoint(a);
          const pb = bayPoint(b);
          const mx = (pa[0] + pb[0]) / 2;
          const mz = (pa[1] + pb[1]) / 2;
          const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
          stamp(rungs, a.id, mx, a.y + 1, mz, 0.026, len, 0.026, pb[0] - pa[0], 0, pb[1] - pa[1], b.id);
          if (a.y % 2 === 0) {
            stamp(braces, a.id, mx, a.y + 0.5, mz, 0.018, Math.hypot(pb[0] - pa[0], 1, pb[1] - pa[1]), 0.018, pb[0] - pa[0], 1, pb[1] - pa[1], b.id);
          }
        }
      }
    });
    const metal = new THREE.MeshStandardMaterial({ color: 0x9aa7b0, roughness: 0.38, metalness: 0.72 });
    const board = document.createElement('canvas');
    board.width = 64;
    board.height = 16;
    const paint = board.getContext('2d');
    paint.fillStyle = '#c4a36a';
    paint.fillRect(0, 0, 64, 16);
    paint.fillStyle = '#8d6840';
    paint.fillRect(15, 0, 2, 16);
    paint.fillRect(31, 0, 2, 16);
    paint.fillRect(47, 0, 2, 16);
    paint.fillStyle = '#d8bc88';
    paint.fillRect(0, 1, 64, 2);
    const boardTex = new THREE.CanvasTexture(board);
    boardTex.wrapS = THREE.RepeatWrapping;
    boardTex.wrapT = THREE.RepeatWrapping;
    const wood = new THREE.MeshStandardMaterial({ map: boardTex, color: 0xffffff, roughness: 0.84, metalness: 0.02 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xe07a2c, roughness: 0.55, metalness: 0.12 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x6d7680, roughness: 0.6, metalness: 0.4 });
    function makeInstances(geometry, material, parts, shadow) {
      if (parts.length === 0) return;
      const mesh = new THREE.InstancedMesh(geometry, material, parts.length);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      for (let i = 0; i < parts.length; i++) {
        let list = scaffoldLookup.get(parts[i].id);
        if (!list) {
          list = [];
          scaffoldLookup.set(parts[i].id, list);
        }
        const item = { mesh: mesh, index: i, matrix: parts[i].matrix };
        list.push(item);
        if (parts[i].also) {
          let extra = scaffoldLookup.get(parts[i].also);
          if (!extra) {
            extra = [];
            scaffoldLookup.set(parts[i].also, extra);
          }
          extra.push(item);
        }
        dummy.position.set(0, -40, 0);
        dummy.quaternion.identity();
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      levelRoot.add(mesh);
      scaffoldMeshes.push(mesh);
    }
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 6), metal, poles, true);
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 5), metal, rungs, false);
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 5), orange, braces, false);
    makeInstances(new THREE.BoxGeometry(1, 1, 1), plateMat, plates, true);
    makeInstances(new THREE.BoxGeometry(1, 1, 1), wood, planks, true);
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 5), metal, rails, false);
    makeInstances(new THREE.CylinderGeometry(1, 1, 1, 5), metal, posts, true);
    makeInstances(new THREE.SphereGeometry(1, 6, 5), metal, couplers, false);
  }

  function ensurePour(block) {
    let record = pourViews.get(block.id);
    if (record) return record;
    const n = MB.pourGrid(block);
    const total = n * n * n;
    const span = pourSpan(block);
    const cell = span / n;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(cell * 0.92, cell * 0.92, cell * 0.92),
      blockSurface(block.materialId, false),
      total
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const origin = (1 - span) * 0.5;
    const support = pourSupport(block);
    for (let i = 0; i < total; i++) {
      const coord = pourCell(support, i, n);
      dummy.position.set(
        block.x + origin + (coord.x + 0.5) * cell,
        block.y + origin + (coord.y + 0.5) * cell,
        block.z + origin + (coord.z + 0.5) * cell
      );
      dummy.quaternion.identity();
      dummy.scale.setScalar(i < block.poured ? 1 : 0.001);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    levelRoot.add(mesh);
    record = { mesh: mesh, particles: n, block: block, support: support };
    pourViews.set(block.id, record);
    return record;
  }

  // A cube under construction grows out of what holds it: the floor (ground or a cube below), else a
  // built side neighbour, else the ceiling — never out of thin air. Same support rule as placing.
  function pourSupport(block) {
    if (block.y === 0 || supportsPour(block.x, block.y - 1, block.z)) return POUR_FLOOR;
    for (let i = 0; i < POUR_SIDES.length; i++) {
      const side = POUR_SIDES[i];
      if (supportsPour(block.x + side[0], block.y, block.z + side[2])) return side;
    }
    if (supportsPour(block.x, block.y + 1, block.z)) return POUR_CEILING;
    return POUR_FLOOR;
  }

  function supportsPour(x, y, z) {
    const block = world.blockByKey.get(MB.cellKey(x, y, z));
    return !!(block && block.built && Features.canSupportSolid(block));
  }

  // Mini-cube `index` of a pour: layers go away from the support, inside a side layer rows go bottom-up.
  function pourCell(support, index, n) {
    const c = MB.pourCoord(index, n);
    const far = n - 1 - c.y;
    if (support[1] !== 0) return { x: c.x, y: support[1] < 0 ? c.y : far, z: c.z };
    if (support[0] !== 0) return { x: support[0] < 0 ? c.y : far, y: c.z, z: c.x };
    return { x: c.x, y: c.z, z: support[2] < 0 ? c.y : far };
  }

  // A growing mini-cube rises from the face toward its support (floor, side or ceiling) and widens a
  // bit, so a cube being built never hangs in the air.
  // Window glass goes over its wall cube, a touch bigger so it shows.
  function pourSpan(block) {
    return block.glassOf !== undefined ? 1.02 : 0.96;
  }

  function setPourScale(record, block, index, scale) {
    const n = record.particles;
    const span = pourSpan(block);
    const cell = span / n;
    const origin = (1 - span) * 0.5;
    const support = record.support;
    const coord = pourCell(support, index, n);
    const shift = cell * 0.92 * 0.5;
    const grow = scale >= 1 ? 1 : Math.max(0.001, scale);
    dummy.position.set(
      block.x + origin + (coord.x + 0.5) * cell + support[0] * shift * (1 - grow),
      block.y + origin + (coord.y + 0.5) * cell + support[1] * shift * (1 - grow),
      block.z + origin + (coord.z + 0.5) * cell + support[2] * shift * (1 - grow)
    );
    dummy.quaternion.identity();
    const wide = grow < 0.01 ? 0.001 : 0.55 + 0.45 * grow;
    dummy.scale.set(support[0] ? grow : wide, support[1] ? grow : wide, support[2] ? grow : wide);
    dummy.updateMatrix();
    record.mesh.setMatrixAt(index, dummy.matrix);
    record.mesh.instanceMatrix.needsUpdate = true;
  }

  function clearPour(blockId) {
    const record = pourViews.get(blockId);
    if (!record) return;
    record.mesh.geometry.dispose();
    levelRoot.remove(record.mesh);
    pourViews.delete(blockId);
  }

  function updatePours() {
    if (!world) return;
    const active = new Set();
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'engineer' || builder.phase !== 'place') continue;
      const block = builder.carry[0];
      if (!block || block.poured >= MB.pourTotal(block)) continue;
      active.add(block.id);
      const record = ensurePour(block);
      // An instant pour («Оконщица») has no time at all: the mini-cube is simply full.
      const span = builder.actionT + builder.timer;
      setPourScale(record, block, block.poured, span > 0 ? builder.actionT / span : 1);
    }
    pourViews.forEach(function (record, blockId) {
      if (!active.has(blockId) && !record.block.built && record.block.poured === 0) clearPour(blockId);
    });
  }

  // A placed cube bumps once over its full size (its pours already grew it); off at ×5 and ×20.
  function popBlock(id) {
    if (timeScale !== 1 || pops.length >= 32 || !blockViews.has(id)) return;
    pops.push({ id: id, t: 0 });
  }

  function updatePops(dt) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const pop = pops[i];
      pop.t += timeScale > 1 ? 1 : dt;
      const record = blockViews.get(pop.id);
      const u = pop.t / 0.36;
      const settled = u >= 1 || !record;
      const scale = settled ? 1 : 1 + 0.12 * Math.sin(Math.PI * u) * (1 - 0.5 * u);
      if (record) setBlockVisualScale(record, scale, 0.001);
      if (settled) pops.splice(i, 1);
    }
  }

  function settleAcceleratedVisuals() {
    for (let i = 0; i < pops.length; i++) {
      setBlockVisualScale(blockViews.get(pops[i].id), 1, 0.001);
    }
    pops.length = 0;
    for (let i = 0; i < sparks.length; i++) {
      sparks[i].life = 0;
      sparks[i].mesh.visible = false;
    }
    ghostMaterials.forEach(function (material) {
      material.opacity = 0.24;
    });
    workerPlan.traverse(function (object) {
      if (object.material) object.material.opacity = 0.25;
    });
    document.getElementById('coins').classList.remove('tick');
  }

  function setBlockVisualScale(record, solidScale, ghostScale) {
    // Set glass turns its wall cube into the window: the cube itself goes.
    if (record.wall && solidScale >= 1) setInstanceScale(record.wall.solid, record.wall.index, 0.001);
    if (record.solid) setInstanceScale(record.solid, record.index, solidScale);
    if (record.ghost) setInstanceScale(record.ghost, record.index, ghostScale);
    if (record.feature) record.feature.scale.setScalar(solidScale);
    if (record.ghostObject) record.ghostObject.scale.setScalar(ghostScale);
  }

  function setInstanceScale(mesh, index, scale) {
    mesh.getMatrixAt(index, dummy.matrix);
    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  function burst(x, y, z, color, count) {
    if (timeScale === 20) return;
    for (let i = 0; i < count; i++) {
      let spark = sparks.find(function (item) { return item.life <= 0; });
      if (!spark) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 0.08),
          new THREE.MeshBasicMaterial({ color: color })
        );
        scene.add(mesh);
        spark = { mesh: mesh, life: 0, vx: 0, vy: 0, vz: 0 };
        sparks.push(spark);
      }
      spark.mesh.material.color.setHex(color);
      spark.mesh.position.set(x, y, z);
      spark.mesh.visible = true;
      spark.life = 0.35;
      spark.vx = (Math.random() - 0.5) * 2.4;
      spark.vy = 1.2 + Math.random() * 1.6;
      spark.vz = (Math.random() - 0.5) * 2.4;
    }
  }

  // ---- climbing onto and off a cube (MB.builderPosition modes 'climb' / 'descend', c = 0..1) ----

  function climbStage(c, from, to) {
    const t = Math.min(1, Math.max(0, (c - from) / (to - from)));
    return t * t * (3 - 2 * t);
  }

  // Share of the step's height reached at c going up: a short reach (barely rising), the pull-up,
  // then the step over the edge.
  function climbLift(c) {
    return 0.04 * climbStage(c, 0, 0.2) + 0.86 * climbStage(c, 0.2, 0.78) + 0.1 * climbStage(c, 0.78, 1);
  }

  // A little crouch before the pull-up.
  function climbDip(c) {
    return -0.06 * Math.sin(Math.PI * Math.min(1, c / 0.2));
  }

  // Jumping off a cube: a crouch (0–0.25), then a parabola from the edge with a small hop up
  // (apex 0.15) to the landing at 0.85, then the knees give (0.85–1). Height relative to the start (dy < 0).
  function jumpHeight(c, dy) {
    if (c <= 0.25) return 0;
    if (c >= 0.85) return dy;
    const apex = 0.15;
    const q = (c - 0.25) / 0.6;
    const b = 2 * apex + Math.sqrt(4 * apex * apex - 4 * apex * dy);
    return (dy - b) * q * q + b * q;
  }

  function jumpDip(c) {
    if (c < 0.25) return -0.12 * climbStage(c, 0, 0.25);
    if (c < 0.32) return -0.12 * (1 - climbStage(c, 0.25, 0.32));
    if (c < 0.85) return 0;
    return -0.14 * Math.sin(Math.PI * (c - 0.85) / 0.15);
  }

  // The jump's body: knees bend and arms swing back, the push-off straightens him with the arms
  // swinging up, legs tuck a little in the air and reach for the ground, the landing bends the knees.
  function poseJumpDown(group, c) {
    const crouch = climbStage(c, 0, 0.25);
    const push = climbStage(c, 0.25, 0.36);
    const air = climbStage(c, 0.36, 0.85);
    const land = c > 0.85 ? Math.sin(Math.PI * (c - 0.85) / 0.15) : 0;
    const legs = -1.0 * crouch * (1 - push) - 0.5 * push * (1 - air) - 0.2 * air - 0.9 * land;
    group.userData.leftLeg.rotation.x = legs - 0.15 * push * (1 - air);
    group.userData.rightLeg.rotation.x = legs + 0.15 * push * (1 - air);
    const arms = 0.6 * crouch * (1 - push) - 1.8 * push * (1 - air) - 1.2 * air * (1 - land) - 0.7 * land;
    group.userData.rightArm.rotation.x = arms;
    group.userData.leftArm.rotation.x = arms;
    group.rotation.x = 0.3 * crouch * (1 - push) + 0.08 + 0.22 * land;
  }

  // Up a cube face: both hands go up onto the edge, he pulls himself up with a knee over the edge
  // and the arms pushing down, then the trailing leg steps up and he straightens.
  function poseClimbUp(group, c) {
    const reach = climbStage(c, 0, 0.2);
    const pull = climbStage(c, 0.2, 0.78);
    const mount = climbStage(c, 0.78, 1);
    const arms = -1 - 1.9 * reach + 2.3 * pull + 0.3 * mount;
    group.userData.rightArm.rotation.x = arms - 0.12 * reach * (1 - pull);
    group.userData.leftArm.rotation.x = arms + 0.12 * reach * (1 - pull);
    group.userData.rightLeg.rotation.x = -0.4 * reach * (1 - pull) - 1.6 * pull * (1 - mount);
    group.userData.leftLeg.rotation.x = 0.25 * pull * (1 - mount) - 1.0 * Math.sin(Math.PI * mount);
    group.rotation.x = 0.06 + 0.12 * reach * (1 - pull) + 0.3 * pull * (1 - mount);
  }

  // The cube in a placing worker's hands shrinks as the cube he builds grows, and crumbles into
  // mini-cubes flying over (none at ×20, where the fill is instant anyway).
  function updateHandCube(viewState, builder, group, dt) {
    const hand = group.userData.hand;
    const block = builder.phase === 'place' ? builder.carry[0] : null;
    if (!block || block.built) {
      hand.visible = false;
      return;
    }
    const total = MB.pourTotal(block);
    const step = builder.actionT + builder.timer > 0 ? builder.actionT / (builder.actionT + builder.timer) : 0;
    const left = 1 - Math.min(1, (block.poured + step) / total);
    const size = MB.MATERIAL[block.materialId].grid >= 2 ? 0.3 : 0.26;
    hand.visible = left > 0.02;
    if (hand.material !== blockSurface(block.materialId, false)) hand.material = blockSurface(block.materialId, false);
    hand.scale.setScalar(size * (0.25 + 0.75 * left));
    if (timeScale === 20 || dt <= 0 || !levelRoot.visible) return;
    viewState.flyClock = (viewState.flyClock || 0) + dt;
    if (viewState.flyClock < 0.09) return;
    viewState.flyClock = 0;
    // From the hands (0.42 up, 0.3 ahead, × the figure scale) to the mini-cube being poured.
    const yaw = group.rotation.y;
    const n = MB.pourGrid(block);
    const pour = pourViews.get(block.id);
    const support = pour ? pour.support : POUR_FLOOR;
    const coord = pourCell(support, Math.min(block.poured, total - 1), n);
    const cell = 0.96 / n;
    // Aim at the part of the mini-cube next to its support.
    const aim = function (k) { return support[k] ? 0.5 + 0.2 * support[k] : 0.2 + Math.random() * 0.6; };
    emitFlyCube(
      group.position.x + Math.sin(yaw) * 0.3 * group.scale.x, group.position.y + 0.42 * group.scale.x, group.position.z + Math.cos(yaw) * 0.3 * group.scale.x,
      block.x + 0.02 + (coord.x + aim(0)) * cell,
      block.y + 0.02 + (coord.y + aim(1)) * cell,
      block.z + 0.02 + (coord.z + aim(2)) * cell,
      MB.MATERIAL[block.materialId].color
    );
  }

  function emitFlyCube(x0, y0, z0, x1, y1, z1, color) {
    if (!flyMesh) {
      flyMesh = new THREE.InstancedMesh(carryGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }), FLY_SLOTS);
      flyMesh.frustumCulled = false;
      dummy.position.set(0, -50, 0);
      dummy.quaternion.identity();
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      for (let i = 0; i < FLY_SLOTS; i++) {
        flyMesh.setMatrixAt(i, dummy.matrix);
        flyMesh.setColorAt(i, flyColor.setHex(0xffffff));
        flyCubes.push({ life: 0, x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, spin: 0 });
      }
      scene.add(flyMesh);
    }
    let slot = -1;
    for (let i = 0; i < FLY_SLOTS; i++) {
      if (flyCubes[i].life <= 0) {
        slot = i;
        break;
      }
    }
    if (slot < 0) return;
    const fly = flyCubes[slot];
    fly.life = 1;
    fly.x0 = x0; fly.y0 = y0; fly.z0 = z0;
    fly.x1 = x1; fly.y1 = y1; fly.z1 = z1;
    fly.spin = Math.random() * 6;
    flyMesh.setColorAt(slot, flyColor.setHex(color));
    flyMesh.instanceColor.needsUpdate = true;
  }

  // Each flight lasts 0.3 s along a low arc and shrinks as it lands.
  function updateFlyCubes(dt) {
    if (!flyMesh) return;
    let changed = false;
    for (let i = 0; i < FLY_SLOTS; i++) {
      const fly = flyCubes[i];
      if (fly.life <= 0) continue;
      fly.life -= timeScale === 20 ? 1 : dt / 0.3;
      const u = 1 - Math.max(0, fly.life);
      if (fly.life <= 0) {
        dummy.position.set(0, -50, 0);
        dummy.scale.setScalar(0.001);
      } else {
        dummy.position.set(
          fly.x0 + (fly.x1 - fly.x0) * u,
          fly.y0 + (fly.y1 - fly.y0) * u + Math.sin(Math.PI * u) * 0.35,
          fly.z0 + (fly.z1 - fly.z0) * u
        );
        dummy.scale.setScalar(0.085 * (1 - 0.45 * u));
      }
      dummy.rotation.set(fly.spin * u, fly.spin * u * 0.7, 0);
      dummy.updateMatrix();
      flyMesh.setMatrixAt(i, dummy.matrix);
      changed = true;
    }
    dummy.rotation.set(0, 0, 0); // dummy is shared: other users expect no rotation
    if (changed) flyMesh.instanceMatrix.needsUpdate = true;
    flyMesh.visible = levelRoot.visible;
  }

  function updateSparks(dt) {
    for (let i = 0; i < sparks.length; i++) {
      const spark = sparks[i];
      if (spark.life <= 0) continue;
      spark.life -= dt;
      spark.vy -= dt * 6;
      spark.mesh.position.x += spark.vx * dt;
      spark.mesh.position.y += spark.vy * dt;
      spark.mesh.position.z += spark.vz * dt;
      if (spark.life <= 0) spark.mesh.visible = false;
    }
  }

  // Session HUD (docs/gdd/16-ux-flow.md §5): every 0.25 s from frame() (`fromTick`) and right after
  // any change. Away from the site (HQ, panels) only the nav and the site state are painted (the
  // panels and the HQ have their own wallets); the dock is rebuilt only when hudDirty or the coins
  // crossed a card price.
  function paintHud(fromTick) {
    if (!fromTick) hudDirty = true;
    refreshNav();
    paintSiteState();
    if (currentScreen !== 'build') {
      hudDirty = true; // the dock is rebuilt on the way back
      return;
    }
    const level = world.level;
    const total = level.blocks.length;
    const done = total - world.remaining;
    if (campaign.status !== 'title') applyEnvironmentView(Meta.applyEnvironment(meta, campaign));
    paintLevelStrip(level, done, total);
    paintDayClock();
    paintCoinRate();
    if (!fromTick) snapCoins();
    setText('total-time', UI.formatDuration(campaign.totalElapsed));
    paintDock();
    const pick = document.getElementById('level-pick');
    const wanted = String(level.index);
    if (pick.value !== wanted) pick.value = wanted;
    document.getElementById('level-prev').disabled = level.index === 0;
    document.getElementById('level-next').disabled = level.index === MB.LEVELS.length - 1;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el.textContent !== text) el.textContent = text;
  }

  // Short money for HUD captions: «840», «1,2 тыс», «24 тыс», then formatCompact («3,2 млн»).
  function formatShort(value) {
    const number = Math.round(value);
    if (number < 1000 || number >= 1e4) return formatCompact(number);
    return (number / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '') + ' тыс';
  }

  // ---- coins: counter tween, «+1 240» once a second, «−1,2 тыс» on a purchase, the rate ----

  // Every frame: the counter runs to campaign.coins in 0.4 s and gains add up into one «+N» per
  // second. A drop (a purchase, another site) snaps at once.
  function tickHudFx(dt) {
    if (!campaign || !world) return;
    const c = hudCoins;
    const coins = campaign.coins;
    if (c.campaign !== campaign) {
      snapCoins();
      return;
    }
    if (coins < c.to) {
      snapCoins();
    } else if (coins > c.to) {
      if (c.gain === 0) c.gainSince = 0;
      c.gain += coins - c.to;
      c.from = c.shown;
      c.to = coins;
      c.t = 0;
    }
    if (c.t < 1 && dt > 0) {
      c.t = Math.min(1, c.t + dt / 0.4);
      const k = 1 - Math.pow(1 - c.t, 3);
      c.shown = c.from + (c.to - c.from) * k;
      paintCoinValue();
    }
    if (c.gain > 0) {
      c.gainSince += dt;
      if (c.gainSince >= 1) {
        // Gains are shown where they are earned (the «+N» over the cubes and the coins flying up),
        // not repeated under the pill.
        c.gain = 0;
      }
    }
  }

  // An explicit repaint shows the exact coins (gains already counted keep their «+N»).
  function snapCoins() {
    const c = hudCoins;
    if (!campaign) return;
    if (c.campaign !== campaign) c.gain = 0;
    else if (campaign.coins > c.to) c.gain += campaign.coins - c.to;
    c.campaign = campaign;
    c.shown = c.from = c.to = campaign.coins;
    c.t = 1;
    paintCoinValue();
  }

  function paintCoinValue() {
    setText('coin-value', formatCompact(hudCoins.shown));
  }

  // The pill pops on income, at most 4 times a second, as a Web Animation (no forced reflow).
  function pulseCoins() {
    const now = performance.now();
    if (now - hudCoins.pulseAt < 250) return;
    hudCoins.pulseAt = now;
    const coins = document.getElementById('coins');
    if (coins.animate) {
      coins.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
    }
  }

  // «+1 240» / «−1,2 тыс» floating out under the coin pill (at most three at a time).
  function floatCoins(text, kind) {
    const host = document.getElementById('coin-fx');
    const tag = document.createElement('span');
    tag.className = 'coin-float ' + kind;
    tag.textContent = text;
    host.appendChild(tag);
    while (host.childNodes.length > 3) host.removeChild(host.firstChild);
    if (!tag.animate) {
      setTimeout(function () { tag.remove(); }, 1000);
      return;
    }
    // Gains rise, spends sink.
    const from = kind === 'spend' ? -4 : 8;
    const to = kind === 'spend' ? 14 : -10;
    const anim = tag.animate([
      { opacity: 0, transform: 'translateY(' + from + 'px) scale(0.9)' },
      { opacity: 1, transform: 'translateY(' + (from * 0.6 + to * 0.4) + 'px) scale(1.06)', offset: 0.18 },
      { opacity: 1, transform: 'translateY(' + (from * 0.2 + to * 0.8) + 'px) scale(1)', offset: 0.7 },
      { opacity: 0, transform: 'translateY(' + to + 'px) scale(1)' },
    ], { duration: kind === 'spend' ? 1200 : 1000, easing: 'ease-out' });
    anim.onfinish = function () { tag.remove(); };
  }

  // «+2,4 тыс/мин»: pay over the last minute of level time; until 15 s of history exist, the
  // session simulator's estimate for the current upgrades.
  function paintCoinRate() {
    const rate = coinRate;
    const now = campaign.levelElapsed;
    const earned = campaign.coinsEarned || 0;
    const samples = rate.samples;
    if (rate.campaign !== campaign || (samples.length && now < samples[samples.length - 1].t)) {
      rate.campaign = campaign;
      samples.length = 0;
    }
    const last = samples[samples.length - 1];
    if (!last || now - last.t >= 1) samples.push({ t: now, e: earned });
    while (samples.length > 2 && now - samples[1].t >= 60) samples.shift();
    const first = samples[0];
    let perMinute = 0;
    if (first && now - first.t >= 15) perMinute = (earned - first.e) / (now - first.t) * 60;
    else if (simEstimate && campaign.status === 'play') perMinute = simEstimate.coinsPerMinute;
    const text = perMinute >= 1 ? '+' + formatShort(perMinute) + '/мин' : '';
    if (text !== rate.text) {
      rate.text = text;
      setText('coin-rate', text);
    }
  }

  // ---- the level strip: «Ур. 7 · Медный знак», crew, progress with chests, floors and cubes ----

  function paintLevelStrip(level, done, total) {
    const mode = campaign.runMode;
    let kicker = '';
    let urgent = false;
    if (timedMode(mode)) {
      const left = Math.max(0, trialLimit(campaign) - campaign.levelElapsed);
      kicker = (mode === 'school' ? 'Школа · ступень ' + campaign.runPayload.tier : 'Контракт') + ' · осталось ' + MB.formatClock(Math.ceil(left));
      urgent = left < 60;
      if (urgent && left > 0 && campaign.status === 'play' && !contractWarned.has(campaign)) {
        contractWarned.add(campaign);
        UI.toast({ text: mode === 'school' ? 'Минута до конца испытания!' : 'Минута до конца контракта!', icon: 'clock', tone: 'bad', priority: 3, duration: 3200, key: 'contract-minute' });
      }
    } else if (mode === 'exchange') {
      kicker = 'Заказ биржи';
    } else if (mode === 'hq') {
      kicker = 'Стройка штаба';
    }
    const kickerEl = document.getElementById('level-kicker');
    if (kickerEl.hidden !== !kicker) {
      kickerEl.hidden = !kicker;
      document.body.classList.toggle('hud-kicker', !!kicker);
    }
    setText('level-kicker', kicker);
    kickerEl.classList.toggle('urgent', urgent);
    setText('level-number', mode === 'campaign' ? 'Ур. ' + level.number : '');
    setText('level-title', hudLevelTitle());
    paintCrewStrip();
    const width = (done / total * 100).toFixed(2) + '%';
    const fill = document.getElementById('bar-fill');
    if (fill.style.width !== width) fill.style.width = width;
    setText('level-pct', percentOf(done, total) + '%');
    setText('focus-label', floorText(done, total));
    setText('block-count', done.toLocaleString('ru-RU') + ' / ' + total.toLocaleString('ru-RU'));
    const storyChest = mode === 'campaign' && Meta.chestsOpen(level.index);
    document.getElementById('level-strip').classList.toggle('no-chests', !storyChest);
    paintChest(document.getElementById('chest-25'), 25, done, storyChest);
    paintChest(document.getElementById('chest-50'), 50, done, storyChest);
  }

  function hudLevelTitle() {
    return campaign.runMode === 'hq' ? Meta.PROJECTS[campaign.runPayload.projectId].name : world.level.name;
  }

  // Under the bar only a state worth saying: done or stopped (floors are not written — clean strip).
  function floorText(done, total) {
    if (world.blocked) return 'Строительство остановлено';
    return done >= total ? 'Готово' : '';
  }

  // Up to five small portraits of the run's crew; a trigger flashes its card (pulseCrew).
  function paintCrewStrip() {
    const crew = (campaign.crew || []).filter(function (id) { return !!Meta.CARDS[id]; }).slice(0, 5);
    const signature = crew.join(',');
    if (signature === crewSignature) return;
    crewSignature = signature;
    document.getElementById('crew-strip').innerHTML = crew.map(function (id) {
      const card = Meta.CARDS[id];
      return '<span class="crew-chip rarity-' + card.rarity + '" data-card="' + id + '" title="' + UI.escapeHtml(card.name) + '">' +
        '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt=""></span>';
    }).join('');
  }

  function pulseCrew(id) {
    const chip = document.querySelector('#crew-strip [data-card="' + id + '"]');
    if (!chip || !chip.animate) return;
    chip.animate([
      { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 224, 138, 0)' },
      { transform: 'scale(1.35)', boxShadow: '0 0 0 4px rgba(255, 224, 138, 0.85)', offset: 0.3 },
      { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 224, 138, 0)' },
    ], { duration: 700, easing: 'ease-out' });
  }

  // ---- the day clock and its popover ----

  function paintDayClock() {
    const ENV = MicroBuildersSim.ENVIRONMENT;
    const elapsed = campaign.levelElapsed;
    const cycle = elapsed % ENV.cycleSeconds;
    const dial = document.getElementById('day-dial');
    dial.classList.toggle('is-night', cycle >= ENV.nightFrom);
    const turn = 'rotate(' + Math.round(cycle / ENV.cycleSeconds * 360) + ' 18 18)';
    const marker = document.getElementById('dial-marker');
    if (marker.getAttribute('transform') !== turn) marker.setAttribute('transform', turn);
    setText('level-time', elapsed < 3600 ? MB.formatClock(elapsed) : UI.formatDuration(elapsed));
    const weather = envView.campaign === campaign ? envView.weather : 'Ясно';
    const badge = document.getElementById('day-weather');
    const icon = WEATHER_ICONS[weather] || '';
    if (badge.dataset.icon !== icon) {
      badge.dataset.icon = icon;
      badge.hidden = !icon;
      badge.className = 'day-weather ' + icon;
      badge.innerHTML = icon ? ICONS[icon] : '';
      badge.title = icon ? weather : '';
    }
  }

  // Night and weather effects of this run: the base penalties, softened by the office's night
  // relief, or the boosts of «Ночной прораб» / «Метеоролог» (as Meta.applyEnvironment applies them).
  function environmentEffects(weather) {
    const ENV = MicroBuildersSim.ENVIRONMENT;
    const foremen = campaign.foremen || {};
    const relief = campaign.metaNightRelief || 0;
    const nightWork = ENV.nightWork + (1 - ENV.nightWork) * relief;
    const phase = Math.floor(campaign.levelElapsed / ENV.weatherPhaseSeconds) % 4;
    const bad = weather && weather !== 'Ясно' ? (phase === ENV.storm.phase ? ENV.storm : ENV.weather) : null;
    return {
      nightSlow: foremen.nightBoost ? 0 : Math.round((1 - nightWork) * 100),
      nightFast: foremen.nightBoost ? Math.round(foremen.nightBoost.value * 100) : 0,
      weatherSlow: bad && !foremen.meteo ? Math.round((1 - bad.work) * 100) : 0,
      weatherFast: bad && foremen.meteo ? Math.round(foremen.meteo.value * 100) : 0,
    };
  }

  function nightLine(effects) {
    if (effects.nightFast > 0) return 'Ночью бригада работает на ' + effects.nightFast + '% быстрее · Ночной прораб';
    if (effects.nightSlow > 0) return 'Ночью бригада работает на ' + effects.nightSlow + '% медленнее';
    return 'Ночью бригада работает как днём';
  }

  function weatherEffect(effects) {
    if (effects.weatherFast > 0) return 'Метеоролог: работа +' + effects.weatherFast + '%';
    return 'работа −' + effects.weatherSlow + '%';
  }

  // «День · ещё 3:12 до ночи», the night penalty, the weather, «Стройка идёт 1 ч 02 мин», speed.
  function paintDayPop() {
    const pop = document.getElementById('day-pop');
    if (pop.hidden || !campaign || !world) return;
    const ENV = MicroBuildersSim.ENVIRONMENT;
    const elapsed = campaign.levelElapsed;
    const cycle = elapsed % ENV.cycleSeconds;
    const night = cycle >= ENV.nightFrom;
    const weather = envView.campaign === campaign ? envView.weather : 'Ясно';
    const effects = environmentEffects(weather);
    setText('day-pop-phase', night
      ? 'Ночь · ещё ' + MB.formatClock(Math.ceil(ENV.cycleSeconds - cycle)) + ' до утра'
      : 'День · ещё ' + MB.formatClock(Math.ceil(ENV.nightFrom - cycle)) + ' до ночи');
    setText('day-pop-night', nightLine(effects));
    setText('day-pop-weather', weather === 'Ясно' ? 'Погода: ясно' : 'Погода: ' + weather.toLowerCase() + ' — ' + weatherEffect(effects));
    let time = 'Стройка идёт ' + formatSpan(elapsed);
    if (timedMode(campaign.runMode)) {
      time += ' · осталось ' + MB.formatClock(Math.ceil(Math.max(0, trialLimit(campaign) - elapsed)));
    }
    setText('day-pop-time', time);
  }

  // Night and weather repaint the sky only when they change. A change during the run also gets a
  // toast («Наступила ночь — бригада медленнее на 28%», «Погода наладилась»); a new site starts quiet.
  function applyEnvironmentView(value) {
    const fresh = envView.campaign !== campaign;
    if (!fresh && envView.night === value.night && envView.weather === value.weather) return;
    const wasNight = envView.night;
    const wasWeather = envView.weather;
    envView.campaign = campaign;
    envView.night = value.night;
    envView.weather = value.weather;
    const skyColor = value.night ? 0x17243a : 0xb7cfe0;
    renderer.setClearColor(skyColor, 1);
    scene.fog.color.setHex(skyColor);
    hemi.intensity = value.night ? 0.34 : 0.9;
    sun.intensity = value.night ? 0.22 : 1.45;
    if (fresh || campaign.status !== 'play') return;
    const effects = environmentEffects(value.weather);
    if (value.night !== wasNight) {
      let text = 'Утро — работа в полную силу';
      if (value.night) {
        text = effects.nightFast > 0 ? 'Наступила ночь — Ночной прораб: бригада быстрее на ' + effects.nightFast + '%'
          : effects.nightSlow > 0 ? 'Наступила ночь — бригада медленнее на ' + effects.nightSlow + '%'
            : 'Наступила ночь — бригада работает как днём';
      }
      UI.toast({ text: text, icon: value.night ? 'moon' : 'sun', tone: value.night ? 'info' : 'good', priority: 1, key: 'env-day' });
    }
    if (value.weather !== wasWeather) {
      const bad = value.weather !== 'Ясно';
      const feminine = value.weather === 'Жара' || value.weather === 'Сейсмическая активность';
      UI.toast({
        text: bad ? (feminine ? 'Началась ' : 'Начался ') + value.weather.toLowerCase() + ': ' + weatherEffect(effects) : 'Погода наладилась',
        icon: bad ? WEATHER_ICONS[value.weather] : 'sun',
        tone: bad ? 'warn' : 'good',
        priority: 1,
        key: 'env-weather',
      });
    }
  }

  // ---- the upgrade dock ----

  function paintDock() {
    const coins = campaign.coins;
    const stale = hudDirty || dockRange.campaign !== campaign || coins < dockRange.low || coins >= dockRange.high;
    if (stale) {
      hudDirty = false;
      dockRange.campaign = campaign;
      let low = 0;
      let high = Infinity;
      document.querySelectorAll('#upgrade-dock .upgrade-group').forEach(function (column) {
        let any = false;
        // The closed line of this tab that the tech center opens soonest stays as a locked card naming
        // its technology («Ноша» — «Грузовые ремни»), so the player knows where the next line comes from.
        let beacon = null;
        let beaconNode = '';
        const closed = [];
        column.querySelectorAll('.upgrade').forEach(function (button) {
          const kind = button.id.slice(3);
          const open = upgradeLineOpen(kind, button.dataset.group);
          if (!open) {
            closed.push(button);
            const node = dockLockNode(kind, button.dataset.group);
            if (node && (!beaconNode || Meta.TECH[node].from < Meta.TECH[beaconNode].from)) {
              beacon = button;
              beaconNode = node;
            }
            return;
          }
          if (button.hidden) button.hidden = false;
          any = true;
          const cost = MB.upgradeCost(kind, campaign.purchases[kind]);
          paintUpgrade(kind, upgradeLabel(kind), cost);
          if (campaign.freePurchases || campaign.purchases[kind] >= window.MicroBuildersBalance.session[kind].max) return;
          if (cost <= coins) low = Math.max(low, cost);
          else high = Math.min(high, cost);
        });
        // A tab with nothing open yet stays hidden, beacon and all.
        closed.forEach(function (button) {
          const shown = any && button === beacon;
          if (button.hidden === shown) button.hidden = !shown;
          if (shown) paintLockedUpgrade(button.id.slice(3), beaconNode);
        });
        if (column.hidden === any) column.hidden = !any;
      });
      // Repaint again once the coins reach the next price or drop under a bought one.
      dockRange.low = low;
      dockRange.high = high;
      window.MicroBuildersSyncUpgradeTabs();
    }
    paintDockFill(coins);
    paintUpgradeGraph();
  }

  // The graph shows the same lines as the cards: open or not, level, affordable, what opens a closed one.
  function paintUpgradeGraph() {
    const session = window.MicroBuildersBalance.session;
    Object.keys(session).forEach(function (kind) {
      const button = document.getElementById('up-' + kind);
      if (!button) return;
      const group = button.dataset.group;
      const open = upgradeLineOpen(kind, group);
      const s = graphStates[kind] || (graphStates[kind] = {});
      s.state = open ? 'open' : 'office';
      s.level = campaign.purchases[kind];
      s.maxed = s.level >= session[kind].max;
      s.ready = open && button.classList.contains('ready');
      s.lockText = open ? '' : upgradeLockText(kind, group);
    });
    window.MicroBuildersUpgradeGraph.paint(graphStates);
  }

  function upgradeLockText(kind, group) {
    if (DRONE_GATED_GROUPS.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return 'после первого дрона';
    const source = Meta.SESSION_LINE[kind];
    const tech = techOf(source);
    if (tech) return 'в техцентре: «' + Meta.TECH[tech].name + '»';
    if (source && source.indexOf('hq:') === 0 && Meta.PROJECTS[source.slice(3)]) return 'после постройки «' + Meta.PROJECTS[source.slice(3)].name + '»';
    return '';
  }

  // The cost pill fills up as the coins save up toward the price.
  function paintDockFill(coins) {
    const cards = document.querySelectorAll('#upgrade-dock .upgrade:not([hidden])');
    for (let i = 0; i < cards.length; i++) {
      const button = cards[i];
      const cost = Number(button.dataset.cost);
      const fill = !cost || button.classList.contains('ready') ? '100%' : Math.min(100, Math.floor(coins / cost * 100)) + '%';
      if (button.dataset.fill === fill) continue;
      button.dataset.fill = fill;
      button.querySelector('em').style.setProperty('--fill', fill);
    }
  }

  // Big values drop their decimals («298,7» → «299») so the pair fits a card.
  function upgradeNumber(value, digits, trim) {
    const text = value.toFixed(Math.abs(value) >= 100 ? 0 : digits).replace('.', ',');
    return trim && text.indexOf(',') >= 0 ? text.replace(/0+$/, '').replace(/,$/, '') : text;
  }

  // «было → станет единица» with meta applied: «12 → 18 кг», «×1,2 → ×1,4», «2,0 → 2,5 кг/с».
  // A maxed line shows only its value.
  function upgradeLabel(kind) {
    const level = campaign.purchases[kind];
    const maxed = level >= window.MicroBuildersBalance.session[kind].max;
    let current = MB.upgradeValue(campaign, kind, level);
    let next = MB.upgradeValue(campaign, kind, level + 1);
    let digits = 2;
    let trim = true;
    let prefix = '';
    let unit = '';
    if (kind === 'builders' || kind === 'vehicles') {
      const count = kind === 'builders' ? campaign.builderCount : campaign.vehicleCount;
      next = count + next - current;
      current = count;
      digits = 0;
    } else if (kind === 'scaffold') {
      current = MB.SCAFFOLD.erectSeconds / current;
      next = MB.SCAFFOLD.erectSeconds / next;
      digits = 1;
      trim = false;
      unit = ' с';
    } else if (kind === 'kitchen') {
      digits = 0;
      prefix = 'ур. ';
    } else if (kind === 'speed' || kind === 'gather' || kind === 'droneBuild' || kind === 'pickup') {
      digits = 1;
      trim = false;
      unit = ' кг/с';
    } else if (kind === 'horizontal' || kind === 'vertical' || kind === 'loaderSpeed' || kind === 'heliSpeed' || kind === 'droneSpeed') {
      digits = 1;
      trim = false;
      unit = ' м/с';
    } else if (kind === 'boomSpeed' || kind === 'elevatorSpeed') {
      trim = false;
      unit = ' с';
    } else if (kind === 'carry' || kind === 'loaderMass' || kind === 'heliMass') {
      digits = 0;
      unit = ' кг';
    } else if (kind === 'freeBuy' || kind === 'cubeCapital' || kind === 'capitalChance' || kind === 'triplePay' || kind === 'budgetCapital' || kind === 'floorPay') {
      current *= 100;
      next *= 100;
      digits = 1;
      unit = '%';
    } else if (kind === 'plan') {
      digits = 0;
      unit = ' ' + UI.plural(maxed ? current : next, 'куб', 'куба', 'кубов');
    } else if (kind === 'vehicleHeight' || kind === 'elevatorHeight') {
      digits = 0;
      unit = ' эт.';
    } else if (kind === 'engineers' || kind === 'helicopters' || kind === 'elevators' || kind === 'patternHeight' || kind === 'bucket' || kind === 'vehicleReach' || kind === 'heliWidth' || kind === 'heliHeight') {
      digits = 0;
    } else {
      prefix = '×';
    }
    const now = prefix + upgradeNumber(current, digits, trim);
    return maxed ? now + unit : now + ' → ' + prefix + upgradeNumber(next, digits, trim) + unit;
  }

  // Unaffordable and maxed cards stay tappable (aria-disabled) so a tap can say why.
  function paintUpgrade(kind, label, cost) {
    const max = window.MicroBuildersBalance.session[kind].max;
    const level = campaign.purchases[kind];
    const maxed = level >= max;
    setUpgradeLabel(kind, label);
    setText(kind + '-cost', maxed ? 'Максимум' : campaign.freePurchases ? '0' : formatCompact(cost));
    // The level sits as a small number in the icon's corner (none before the first level).
    setText(kind + '-level', level > 0 ? String(level) : '');
    const button = document.getElementById('up-' + kind);
    if (button.classList.contains('locked')) {
      button.classList.remove('locked');
      button.title = '';
    }
    const ready = (campaign.freePurchases || campaign.coins >= cost) && campaign.status !== 'won' && !maxed;
    button.classList.toggle('ready', ready);
    button.classList.toggle('maxed', maxed);
    const disabled = ready ? 'false' : 'true';
    if (button.getAttribute('aria-disabled') !== disabled) button.setAttribute('aria-disabled', disabled);
    button.dataset.cost = maxed ? '' : String(cost);
    if (button.disabled) button.disabled = false;
  }

  // «33 → 39 кг» with the value after the purchase in green.
  function setUpgradeLabel(kind, label) {
    const el = document.getElementById(kind + '-label');
    if (!el || (el.dataset.raw === label && el.textContent === label)) return;
    el.dataset.raw = label;
    const parts = label.split(' → ');
    if (parts.length === 2) el.innerHTML = UI.escapeHtml(parts[0]) + ' → <b class="up-next">' + UI.escapeHtml(parts[1]) + '</b>';
    else el.textContent = label;
  }

  // The technology that opens a closed dock line (Meta.SESSION_LINE), or '' when an HQ building
  // opens it, nothing does yet, or its machine tab still waits for the first drone.
  function dockLockNode(kind, group) {
    if (DRONE_GATED_GROUPS.indexOf(group) >= 0 && campaign.purchases.engineers < 1) return '';
    return techOf(Meta.SESSION_LINE[kind]);
  }

  // 'tech:routes' → 'routes'; '' for any other source.
  function techOf(source) {
    return source && source.indexOf('tech:') === 0 ? source.slice(5) : '';
  }

  // A closed line as a locked card: «Ноша · «Грузовые ремни» · 🔒 Техцентр». A tap says it in full.
  function paintLockedUpgrade(kind, node) {
    const button = document.getElementById('up-' + kind);
    setText(kind + '-label', '«' + Meta.TECH[node].name + '»');
    setText(kind + '-level', '');
    setText(kind + '-cost', 'Техцентр');
    button.classList.remove('ready', 'maxed');
    button.classList.add('locked');
    if (button.getAttribute('aria-disabled') !== 'true') button.setAttribute('aria-disabled', 'true');
    button.dataset.cost = '';
    button.title = upgradeName(kind) + ' откроется в техцентре: «' + Meta.TECH[node].name + '»';
  }

  // A bought level: the card flashes gold and «−1,2 тыс» floats from the coin counter; a level that
  // cost nothing flashes green «Бесплатно!» («Подарок!» from «Подрядчик»).
  function onUpgradeEvent(event) {
    hudDirty = true;
    const button = document.getElementById('up-' + event.kind);
    if (event.free) {
      flashCard(button, event.freeBy === 'gift' ? 'Подарок!' : 'Бесплатно!', 'free');
      return;
    }
    flashCard(button, '', 'paid');
    if (!campaign.freePurchases && event.cost > 0) floatCoins('−' + formatShort(event.cost), 'spend');
  }

  function flashCard(button, label, kind) {
    if (!button || !button.animate) return;
    const glow = kind === 'free' ? '143, 227, 159' : '255, 214, 120';
    button.animate([
      { boxShadow: '0 0 0 3px rgba(' + glow + ', 1), 0 0 24px rgba(' + glow + ', 0.9)', filter: 'brightness(1.4)' },
      { boxShadow: '0 3px 0 rgba(0, 0, 0, 0.35)', filter: 'brightness(1)' },
    ], { duration: 650, easing: 'ease-out' });
    if (!label) return;
    const tag = document.createElement('b');
    tag.className = 'upgrade-flash';
    tag.textContent = label;
    button.appendChild(tag);
    const anim = tag.animate([
      { opacity: 0, transform: 'translate(-50%, -30%) scale(0.6)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1.1)', offset: 0.18 },
      { opacity: 1, transform: 'translate(-50%, -62%) scale(1)', offset: 0.75 },
      { opacity: 0, transform: 'translate(-50%, -95%) scale(1)' },
    ], { duration: 1200, easing: 'ease-out' });
    anim.onfinish = function () { tag.remove(); };
  }

  // Office capital finds (Meta.onBlocksPlaced) go straight to the treasury; the session HUD shows
  // no company currencies, and chests announce themselves in paintChest.
  function showPlacementRewards(result) {
    (result.expertise || []).forEach(function (change) {
      UI.toast({ text: Meta.CARDS[change.id].name + ': экспертиза ' + change.level,
        icon: 'icons/icon-foreman-' + change.id + '.jpg?v=3', key: 'expertise:' + change.id, duration: 2400 });
      hudDirty = true;
    });
    return result;
  }

  // ---- chests 25% / 50% ----

  function paintChest(el, threshold, done, storyChest) {
    const claimed = meta.claimedChests[world.level.index + ':' + threshold] === 1;
    const ready = storyChest && !claimed && done * 100 >= world.level.blocks.length * threshold;
    if (el.hidden === storyChest) el.hidden = !storyChest;
    el.classList.toggle('ready', ready);
    el.classList.toggle('claimed', claimed);
    el.classList.toggle('locked', storyChest && !ready && !claimed);
    el.disabled = claimed;
    if (ready) announceChest(el, threshold);
    if (claimed && chestToasts[threshold]) {
      chestToasts[threshold].close();
      chestToasts[threshold] = null;
    }
  }

  // A chest that just got ready bounces and says so once per run: «Сундук 25% готов!» · «Открыть».
  function announceChest(el, threshold) {
    let announced = chestAnnounced.get(campaign);
    if (!announced) {
      announced = [];
      chestAnnounced.set(campaign, announced);
    }
    if (announced.indexOf(threshold) >= 0 || currentScreen !== 'build' || UI.overlay.count() > 0) return;
    announced.push(threshold);
    if (el.animate) {
      el.animate([
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: 'translate(-50%, -78%) scale(1.3)', offset: 0.35 },
        { transform: 'translate(-50%, -50%) scale(0.92)', offset: 0.7 },
        { transform: 'translate(-50%, -50%) scale(1)' },
      ], { duration: 700, iterations: 3, easing: 'ease-out' });
    }
    tone(660, 0.08);
    setTimeout(function () { tone(990, 0.1); }, 110);
    const owner = campaign;
    chestToasts[threshold] = UI.toast({
      text: 'Сундук ' + threshold + '% готов!',
      icon: 'icons/icon-chest-' + threshold + '.jpg',
      className: 'toast-chest',
      tone: 'gold',
      priority: 2,
      duration: 6000,
      key: 'chest-' + threshold,
      action: { label: 'Открыть', onClick: function () { if (campaign === owner) openChest(threshold); } },
    });
  }

  // A tap on a chest opens it; a closed one says when it opens: «Откроется на 25% стройки».
  function tapChest(threshold) {
    if (!world || campaign.runMode !== 'campaign' || !Meta.chestsOpen(world.level.index)) return;
    if (meta.claimedChests[world.level.index + ':' + threshold] === 1) return;
    if ((world.level.blocks.length - world.remaining) * 100 < world.level.blocks.length * threshold) {
      shake(document.getElementById('chest-' + threshold));
      UI.toast({ text: 'Откроется на ' + threshold + '% стройки', icon: 'icons/icon-chest-' + threshold + '.jpg', className: 'toast-chest', key: 'chest-locked', duration: 1800 });
      return;
    }
    openChest(threshold);
  }

  function openChest(threshold) {
    const reward = Meta.claimChest(meta, world.level.index, threshold);
    if (!reward) return;
    tone(523, 0.08);
    showChestReveal('chest-' + threshold, 'Сундук ' + threshold + '%', 'Сундук открыт', chestPrizes(reward));
    paintHud();
  }

  function chestPrizes(reward) {
    return '<div class="chest-prizes">' +
      '<div class="prize-fly prize-capital"><img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt=""><b>+' + reward.capital + '</b><small>капитала</small></div>' +
      (reward.card ? cardPrize(reward) : '') + '</div>' +
      '<p class="complete-note">Капитал уже в казне компании.</p>';
  }

  // The crew of a running order is locked, so the very first card (level 3) starts with the next one.
  function cardPrize(card) {
    const note = card.first ? '' : ' · ' + (card.isNew ? 'новый!' : '+1 копия');
    return '<div class="prize-fly prize-card rarity-' + card.rarity + '"><img src="icons/icon-foreman-' + card.cardId + '.jpg?v=3" alt=""><b>' + card.cardName +
      '</b><small>' + card.rarityName + note + '</small>' +
      (card.first ? '<small class="prize-note">Первый бригадир! Выйдет на смену со следующего заказа</small>' : '') + '</div>';
  }

  // Chest and recruit reveals are windows of the overlay system; two at once wait in the queue.
  function showChestReveal(id, kicker, title, html) {
    UI.overlay.open({
      id: id,
      type: 'dialog',
      className: 'chest-reveal',
      queue: true,
      kicker: kicker,
      title: title,
      body: html,
      actions: [{ label: 'Забрать', primary: true }],
    });
  }

  // source: 'recruiting' (the recruiting center), 'chest25' / 'chest50'.
  function showCardReveal(card, source) {
    const recruit = source === 'recruiting';
    showChestReveal(recruit ? 'recruit-reveal' : 'chest-card', recruit ? 'Новый бригадир' : 'Сундук ' + (source === 'chest25' ? 25 : 50) + '%',
      recruit ? 'Бригадир нанят' : 'Сундук открыт', '<div class="chest-prizes">' + cardPrize(card) + '</div>');
  }

  // Level info sheet: every material of the level with cube weight and built / total counts,
  // heaviest first.
  function paintLevelInfo() {
    const panel = document.getElementById('level-info');
    if (!world || panel.hidden) return;
    const level = world.level;
    const counts = new Map();
    const byWeight = level.materialIds.slice().sort(function (a, b) { return MB.MATERIAL[b].weight - MB.MATERIAL[a].weight; });
    for (let i = 0; i < byWeight.length; i++) {
      counts.set(byWeight[i], { total: 0, built: 0 });
    }
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (!counts.has(block.materialId)) counts.set(block.materialId, { total: 0, built: 0 });
      const count = counts.get(block.materialId);
      count.total += 1;
      if (block.built) count.built += 1;
    }
    let totalCubes = 0;
    let builtCubes = 0;
    let totalMass = 0;
    let builtMass = 0;
    let rows = '';
    counts.forEach(function (count, materialId) {
      if (count.total === 0) return;
      const material = MB.MATERIAL[materialId];
      totalCubes += count.total;
      builtCubes += count.built;
      totalMass += count.total * material.weight;
      builtMass += count.built * material.weight;
      const done = count.built === count.total;
      rows += '<li' + (done ? ' class="done"' : '') + '>' +
        '<i style="background:#' + material.color.toString(16).padStart(6, '0') + '"></i>' +
        '<span class="level-info-name"><b>' + material.name + '</b><small>' + material.weight + ' кг за куб</small></span>' +
        '<span class="level-info-count"><b>' + count.built + '</b> / ' + count.total + '</span>' +
        '<span class="level-info-bar"><em style="width:' + (count.built / count.total * 100) + '%"></em></span>' +
        '</li>';
    });
    const title = document.querySelector('[data-overlay="level-info"] .overlay-head h2');
    if (title && title.textContent !== hudLevelTitle()) title.textContent = hudLevelTitle();
    if (!document.getElementById('level-info-time').hidden) paintLevelTimings();
    document.getElementById('level-info-summary').innerHTML =
      '<span>Построено <b>' + builtCubes + ' / ' + totalCubes + '</b> кубов</span>' +
      '<span>Масса <b>' + builtMass.toLocaleString('ru-RU') + ' / ' + totalMass.toLocaleString('ru-RU') + '</b> кг</span>';
    document.getElementById('level-info-rows').innerHTML = rows;
    if (!simEstimate) refreshSimEstimate();
    document.getElementById('level-info-sim').innerHTML =
      '<span class="sim-coins"><img class="currency-icon" src="icons/icon-coins.jpg?v=2" alt=""><b>' +
      formatRate(simEstimate.coinsPerMinute) + '</b> монет/мин</span>' +
      '<span><b>' + formatRate(simEstimate.massPerMinute) + '</b> кг/мин</span>';
  }

  function setLevelInfoTab(tab) {
    const buttons = document.querySelectorAll('#level-info-tabs button');
    for (let i = 0; i < buttons.length; i++) buttons[i].classList.toggle('on', buttons[i].dataset.tab === tab);
    document.getElementById('level-info-main').hidden = tab !== 'main';
    document.getElementById('level-info-time').hidden = tab !== 'time';
    paintLevelInfo();
  }

  // «Тайминги»: worker-seconds per state and sub-state from logic's time ledger, biggest first.
  function paintLevelTimings() {
    const ledger = world.timeLedger;
    const states = [];
    let total = 0;
    Object.keys(ledger).forEach(function (name) {
      const subs = Object.keys(ledger[name]).map(function (sub) {
        return { name: sub, seconds: ledger[name][sub] };
      }).sort(function (a, b) { return b.seconds - a.seconds; });
      let seconds = 0;
      for (let i = 0; i < subs.length; i++) seconds += subs[i].seconds;
      total += seconds;
      states.push({ name: name, seconds: seconds, subs: subs });
    });
    states.sort(function (a, b) { return b.seconds - a.seconds; });
    let crew = 0;
    for (let i = 0; i < world.builders.length; i++) if (world.builders[i].trade !== 'engineer') crew += 1;
    document.getElementById('level-info-time-summary').innerHTML =
      '<span>Стройка идёт <b>' + formatSpan(campaign.levelElapsed) + '</b></span>' +
      '<span>Рабочих <b>' + crew + '</b></span>' +
      '<span>Всего <b>' + formatSpan(total) + '</b> рабочего времени</span>';
    const share = function (seconds) {
      return total > 0 ? (seconds / total * 100).toFixed(1).replace('.', ',') + '%' : '—';
    };
    let rows = '';
    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      let subs = '';
      for (let j = 0; j < state.subs.length; j++) {
        const sub = state.subs[j];
        subs += '<li><b>' + sub.name + '</b><span>' + formatSpan(sub.seconds) + '</span><em>' + share(sub.seconds) + '</em></li>';
      }
      rows += '<li>' +
        '<div class="level-time-head"><b>' + state.name + '</b><span>' + formatSpan(state.seconds) + '</span><em>' + share(state.seconds) + '</em></div>' +
        '<div class="level-time-bar"><i style="width:' + (total > 0 ? state.seconds / total * 100 : 0) + '%"></i></div>' +
        '<ul class="level-time-sub">' + subs + '</ul>' +
        '</li>';
    }
    document.getElementById('level-info-time-rows').innerHTML = rows || '<li>Рабочие ещё не начали</li>';
  }

  // Durations: «45 с», «12 мин 05 с», «2 ч 07 мин».
  function formatSpan(seconds) {
    const whole = Math.round(seconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor(whole % 3600 / 60);
    const rest = whole % 60;
    const pad = function (value) { return (value < 10 ? '0' : '') + value; };
    if (hours > 0) return hours + ' ч ' + pad(minutes) + ' мин';
    if (minutes > 0) return minutes + ' мин ' + pad(rest) + ' с';
    return rest + ' с';
  }

  function refreshSimEstimate() {
    simElapsed = 0;
    if (!world) return;
    let summary = simSummaries.get(world.level);
    if (!summary) {
      summary = MicroBuildersSim.summarizeLevel(world.level);
      simSummaries.set(world.level, summary);
    }
    simEstimate = MicroBuildersSim.estimate(summary, campaign);
  }

  // Big idle numbers: 9 999 as is, then «12,5 тыс», «3,2 млн», «1,6 млрд», «4 трлн».
  function formatCompact(value) {
    const COMPACT_UNITS = [[1e12, 'трлн'], [1e9, 'млрд'], [1e6, 'млн'], [1e4, 'тыс']];
    const number = Math.round(value);
    for (let i = 0; i < COMPACT_UNITS.length; i++) {
      const unit = COMPACT_UNITS[i];
      const divisor = unit[0] === 1e4 ? 1e3 : unit[0];
      if (number >= unit[0]) {
        const scaled = number / divisor;
        const digits = scaled >= 100 ? 0 : 1;
        return scaled.toFixed(digits).replace('.', ',').replace(/,0$/, '') + ' ' + unit[1];
      }
    }
    return number.toLocaleString('ru-RU');
  }

  function formatRate(value) {
    if (value >= 100) return formatCompact(value);
    return value.toFixed(1).replace('.', ',');
  }

  // «Об уровне» is a window of the overlay system around the #level-info content. Between openings
  // the content waits hidden in the page, so the HUD tick finds it by id while the window is open.
  function setLevelInfo(open) {
    const content = document.getElementById('level-info');
    if (!open) {
      UI.overlay.close('level-info');
      return;
    }
    UI.overlay.open({
      id: 'level-info',
      type: 'sheet',
      className: 'level-info-window',
      kicker: 'Об уровне',
      title: hudLevelTitle(),
      body: function (bodyEl) {
        content.hidden = false;
        bodyEl.appendChild(content);
      },
      onClose: function () {
        content.hidden = true;
        document.body.appendChild(content);
      },
    });
    paintLevelInfo();
  }

  // Start card: one line under the HUD for a few seconds, a tap dismisses it.
  // «Ур. 9 · Цитадель · 442 куба», «Контракт 4 · Цитадель · лимит 18:00», «Стройка штаба · Биржа — …».
  function showBanner() {
    const level = world.level;
    const cubes = level.blocks.length;
    const size = '· ' + cubes.toLocaleString('ru-RU') + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов');
    let spec = { title: 'Ур. ' + level.number + ' · ' + level.name, text: size };
    if (campaign.runMode === 'hq') {
      const project = Meta.PROJECTS[campaign.runPayload.projectId];
      spec = {
        title: 'Стройка штаба · ' + project.name,
        text: (project.opened ? '— откроет ' + project.opened + '. ' : '— ') + 'Основной заказ подождёт.',
      };
    } else if (campaign.runMode === 'contract') {
      spec = { title: siteKicker('contract', campaign.levelIndex) + ' · ' + level.name, text: '· лимит ' + MB.formatClock(Meta.contractLimitSeconds(meta)) };
    } else if (campaign.runMode === 'school') {
      spec = { title: 'Школа · ' + level.name, text: 'Ступень ' + campaign.runPayload.tier + ' · лимит ' + MB.formatClock(trialLimit(campaign)) };
    } else if (campaign.runMode === 'exchange') {
      spec = { title: 'Заказ биржи · ' + level.name, text: size };
    }
    if (bannerToast) bannerToast.close();
    bannerToast = UI.toast(Object.assign(spec, { icon: 'build', className: 'toast-banner', priority: 2, duration: 3200, key: 'start-banner' }));
  }

  // ---------- completion ----------
  // A finished site is settled at once, wherever it finished (live or while the player was away):
  // chests nobody opened are claimed first (Meta.onLevelComplete stops reporting them), the rewards
  // are paid, and the slot keeps the site as 'complete' with the reward summary. So a finished site
  // is never restored as a running one and is never paid twice.
  function settleCompletion(key, c, w, offline) {
    const chests = [];
    if (c.runMode === 'campaign' && Meta.chestsOpen(w.level.index)) {
      [25, 50].forEach(function (threshold) {
        const prize = Meta.claimChest(meta, w.level.index, threshold);
        if (prize) chests.push(Object.assign({ threshold: threshold }, prize));
      });
    }
    const reward = Meta.onLevelComplete(meta, c, w);
    reward.key = key;
    reward.chests = chests;
    reward.runMode = c.runMode;
    reward.levelIndex = c.levelIndex;
    reward.projectId = c.runPayload && c.runPayload.projectId || null;
    reward.contractNumber = c.runMode === 'contract' && c.runPayload ? c.runPayload.contractIndex + 1 : 0;
    reward.name = Meta.siteName(c.runMode, c.levelIndex, c.runPayload);
    // Contracts count real time in levelElapsed; other runs add the time they were built without the player.
    reward.levelElapsed = c.levelElapsed + (c.awayElapsed || 0);
    reward.offline = !!offline;
    reward.autoCompleted = w.autoCompleted || 0;
    reward.total = w.blocks.length;
    reward.stats = Object.assign({}, w.stats);
    reward.last = c.runMode === 'campaign' && c.levelIndex >= MB.LEVELS.length - 1;
    c.status = 'complete';
    w.completed = true;
    Meta.saveSite(meta, key, c, w, { status: 'complete', reward: reward });
    return reward;
  }

  function onLiveComplete() {
    tone(523, 0.08);
    setTimeout(function () { tone(659, 0.1); }, 90);
    const reward = settleCompletion(liveKey || Meta.siteKey(campaign.runMode), campaign, world, false);
    syncCity();
    paintHud();
    openCompleteDialog(reward);
  }

  function rewardTile(icon, value, label, extraClass) {
    return '<div class="reward-tile' + (extraClass ? ' ' + extraClass : '') + '"><img src="' + icon + '" alt=""><b>' + value + '</b><small>' + label + '</small></div>';
  }

  function cardTile(card) {
    const note = card.milestone ? 'За ' + card.milestone + ' ' + UI.plural(card.milestone, 'победу', 'победы', 'побед') + ' · ' + (card.isNew ? 'новый!' : '+1 копия') : card.first ? 'Первый бригадир! Выйдет на смену со следующего заказа' : (card.isNew ? 'новый!' : '+1 копия');
    return '<div class="reward-tile card rarity-' + card.rarity + '"><img src="icons/icon-foreman-' + card.cardId + '.jpg?v=3" alt=""><b>' +
      UI.escapeHtml(card.cardName) + '</b><small>' + card.rarityName + ' · ' + note + '</small></div>';
  }

  function rewardTiles(reward) {
    const tiles = [];
    if (reward.runMode === 'hq') {
      tiles.push('<div class="reward-tile building">' + ICONS.hq + '<b>' + UI.escapeHtml(reward.name) + '</b><small>новое здание в штабе</small></div>');
    }
    if (reward.capital > 0) tiles.push(rewardTile('icons/icon-capital.jpg?v=2', '+' + formatCompact(reward.capital), 'капитала'));
    if (reward.seals > 0) tiles.push(rewardTile('icons/icon-seals.jpg?v=2', '+' + reward.seals, UI.plural(reward.seals, 'печать', 'печати', 'печатей')));
    if (reward.rare) tiles.push(rewardTile('icons/icon-rare-' + reward.rare.key + '.jpg?v=2', '+' + reward.rare.amount, Meta.RARE_NAMES[reward.rare.key]));
    if (reward.diplomas > 0) tiles.push(rewardTile('icons/icon-diplomas.svg', '+' + reward.diplomas, UI.plural(reward.diplomas, 'диплом', 'диплома', 'дипломов')));
    if (reward.smallChest) tiles.push(rewardTile('icons/icon-chest-25.jpg', 'Малый сундук', '1 бригадир'));
    (reward.milestoneCards || []).forEach(function (card) { tiles.push(cardTile(card)); });
    if (reward.card) tiles.push(cardTile(reward.card));
    (reward.chests || []).forEach(function (chest) {
      tiles.push(rewardTile('icons/icon-chest-' + chest.threshold + '.jpg', 'Сундук ' + chest.threshold + '%',
        '+' + chest.capital + ' капитала', 'chest'));
      if (chest.card) tiles.push(cardTile(chest));
    });
    if (reward.carryCoins > 0) tiles.push(rewardTile('icons/icon-coins.jpg?v=2', '+' + formatCompact(reward.carryCoins), 'монет на следующий заказ'));
    return tiles;
  }

  // «Объект сдан!» (docs/gdd/16-ux-flow.md §9): reward tiles, the time, statistics under «Подробнее».
  // `queue` waits for the windows already open (the return window first).
  function openCompleteDialog(reward, opts) {
    const options = opts || {};
    const key = reward.key;
    const story = reward.runMode === 'campaign';
    const onScreen = key === liveKey;
    const stats = reward.stats || {};
    const details = [
      ['Лестницы', stats.ladders], ['Настилы', stats.decks], ['Дополнительные двери', stats.additionalDoors],
      ['Вертикальные люки', stats.verticalHatches], ['Машиной построено', stats.vehicleBlocks],
    ].filter(function (row) { return row[1] !== undefined; });
    if (reward.autoCompleted > 0) details.push(['Достроено автоматически', reward.autoCompleted + ' ' + UI.plural(reward.autoCompleted, 'куб', 'куба', 'кубов')]);
    const body = '<p class="complete-name">' + UI.escapeHtml(reward.name) + '</p>' +
      '<div class="reward-tiles">' + rewardTiles(reward).join('') + '</div>' +
      '<div class="complete-meta"><span class="complete-chip">' + ICONS.clock + 'Время ' + UI.formatDuration(reward.levelElapsed || 0) + '</span>' +
      (reward.offline ? '<span class="complete-chip">Достроено без вас</span>' : '') + '</div>' +
      (details.length ? '<details class="complete-details"><summary>Подробнее</summary><ul>' + details.map(function (row) {
        return '<li><span>' + row[0] + '</span><b>' + row[1] + '</b></li>';
      }).join('') + '</ul></details>' : '');
    const actions = [];
    let note = '';
    if (!onScreen && contractRunning()) {
      // Another site finished during a contract: its rewards are in, the next step waits for the contract.
      actions.push({ label: 'Понятно', primary: true });
      note = '<p class="complete-note">' + (story ? 'Следующий заказ — после контракта.' : 'Посмотреть можно после контракта.') + '</p>';
    } else if (story) {
      actions.push(reward.last
        ? { label: 'Итог кампании', primary: true, onClick: openSummary }
        : { label: 'Следующий заказ', primary: true, onClick: goNext });
      actions.push(onScreen
        ? { label: 'В штаб', onClick: function () { openScreen('hq'); } }
        : { label: 'Позже' });
    } else if (onScreen && reward.runMode === 'school') {
      actions.push({ label: 'Вернуться в школу', primary: true, onClick: function () { finishSite(key, { toHq: true }); openScreen('recruiting', { silent: true }); } });
    } else if (onScreen) {
      actions.push({ label: 'Вернуться на основную стройку', primary: true, onClick: function () { finishSite(key); } });
      actions.push({ label: reward.runMode === 'hq' ? 'Смотреть в штабе' : 'В штаб', onClick: function () {
        finishSite(key, { toHq: true, building: reward.projectId });
      } });
    } else {
      actions.push({ label: 'Понятно', primary: true });
      if (reward.runMode === 'hq') {
        actions.push({ label: 'Смотреть в штабе', onClick: function () {
          cityBuilding = reward.projectId;
          openScreen('hq');
        } });
      }
    }
    UI.overlay.open({
      id: 'complete-' + key,
      queue: !!options.queue,
      kicker: siteKicker(reward.runMode, reward.levelIndex, reward.contractNumber),
      title: 'Объект сдан!',
      body: body + note,
      actions: actions,
      onClose: function () {
        // A side or HQ site finished while the player was elsewhere: nothing to come back to.
        if (!story && key !== liveKey) {
          const snap = Meta.site(meta, key);
          if (snap && snap.status === 'complete') Meta.clearSite(meta, key);
        }
      },
    });
  }

  function onNextCta() {
    if (!campaign || campaign.status !== 'complete') return;
    if (campaign.runMode !== 'campaign') finishSite(liveKey);
    else if (campaign.levelIndex >= MB.LEVELS.length - 1) openSummary();
    else goNext();
  }

  // Leave a finished side or HQ site: its slot is emptied and the main site takes the screen.
  function finishSite(key, opts) {
    const options = opts || {};
    const snap = Meta.site(meta, key);
    if (key !== 'campaign' && snap && snap.status === 'complete') Meta.clearSite(meta, key);
    if (key === liveKey) {
      liveKey = null;
      switchSite(Meta.activeSite(meta), options);
    } else if (options.toHq) {
      cityBuilding = options.building || null;
      openScreen('hq');
    }
  }

  function openBlocked(event) {
    const total = world.level.blocks.length;
    UI.overlay.open({
      id: 'blocked',
      kicker: 'Строительство остановлено',
      title: 'Нет достижимых кубов',
      body: '<p>Осталось ' + event.remaining + ' из ' + total + ' ' + UI.plural(total, 'куба', 'кубов', 'кубов') + ' (' + formatPercent(event.remaining / total) +
        '). Автозавершение применяется, только когда осталось менее 2%.</p>',
      actions: campaign.runMode === 'school' ? [{ label: 'Закрыть', primary: true }, { label: 'Бросить испытание', danger: true, onClick: confirmAbandon }] : [{ label: 'Перезапустить заказ', primary: true, onClick: restartRun }, { label: 'Закрыть' }],
    });
  }

  function goNext() {
    const snap = Meta.site(meta, 'campaign');
    const nextIndex = snap ? snap.levelIndex + 1 : meta.campaignLevel;
    if (nextIndex >= MB.LEVELS.length) {
      openSummary();
      return;
    }
    requestRun({ mode: 'campaign', levelIndex: nextIndex, reason: 'next' });
  }

  // Dev level picker.
  function jumpTo(index) {
    if (!campaign || campaign.status === 'title' || !world) return;
    if (index < 0 || index >= MB.LEVELS.length) return;
    if (index === world.level.index && campaign.status === 'play' && campaign.runMode === 'campaign') return;
    requestRun({ mode: 'campaign', levelIndex: index, reason: 'jump' });
  }

  function fillLevelPick() {
    const select = document.getElementById('level-pick');
    for (let i = 0; i < MB.LEVELS.length; i++) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = MB.LEVELS[i].number + '. ' + MB.LEVELS[i].name;
      select.appendChild(option);
    }
  }

  // ---------- company quarter (Штаб) ----------
  // A boulevard from the camera into the distance (docs/gdd/16-ux-flow.md §8): lots in two columns in
  // unlock order, every facade facing the camera, the buildings that are not in the game yet behind
  // one fence at the far end. A lot shows bare soil while locked, a blue silhouette of the real voxel
  // building once it can be bought, the built cubes inside a fence while under construction and the
  // full building (the same blocks, doors and windows as its HQ level) once it works. Names and
  // states are DOM signs above the lots, projected once per frame while the city is on screen.

  function cityBox(parent, material, size, position) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cityFlat(parent, material, width, depth, x, z, y) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cityRowZ(row) {
    return -row * CITY_GRID.rowPitch;
  }

  // Front of the expansion zone: the avenue ends at its gate.
  function cityZoneFront() {
    return cityRowZ(CITY_ZONE_ROW) + CITY_LOT.depth / 2 + 0.6;
  }

  // Centre of a lot (or of the expansion zone) and the height of its roof.
  function cityLotSpot(id) {
    if (id === 'expansion') return { x: 0, z: cityRowZ(CITY_ZONE_ROW), top: 2.4 };
    const spec = cityRecords.get(id).spec;
    const level = MB.HQ_LEVELS[id];
    return { x: spec.col * CITY_GRID.colX, z: cityRowZ(spec.row), top: level ? level.footprint.maxY + 1 : 1 };
  }

  function cityIcon(id) {
    const keys = { office: 'office', tech: 'gear', personnel: 'personnel', exchange: 'exchange', recruiting: 'foremen', garage: 'truck', contracts: 'contract', expansion: 'crane' };
    return ICONS[keys[id]] || ICONS.hq;
  }

  function buildCity() {
    // Past the fog in every direction, also with the view shifted beside a side sheet.
    cityFlat(cityRoot, cityMat.lawn, 600, 600, 0, -18, 0);
    Meta.CITY.forEach(function (spec) {
      if (spec.zone || !MB.HQ_LEVELS[spec.id]) return;
      cityRecords.set(spec.id, makeCityLot(spec));
    });
    buildCityStreets();
    buildCityGreenery();
    cityDecor.expansion = makeCityExpansion();
    cityDecor.ring = makeCityRing();
    cityDecor.cars = [];
    const colors = [0xd8402f, 0x2f6fed, 0xf2b91f, 0xf4f1ea];
    const span = CITY_AVENUE.near - cityZoneFront();
    for (let i = 0; i < colors.length; i++) {
      const car = makeCityCar(colors[i]);
      car.userData.lane = i % 2 === 0 ? 1 : -1;
      car.userData.speed = 3.2 + i * 0.6;
      car.userData.z = cityZoneFront() + ((i * 0.29 + 0.1) % 1) * span;
      cityRoot.add(car);
      cityDecor.cars.push(car);
    }
    buildCitySigns();
    syncCity();
  }

  // The avenue from the camera to the expansion gate, a paved forecourt in front of every row.
  function buildCityStreets() {
    const far = cityZoneFront();
    const near = CITY_AVENUE.near;
    const length = near - far;
    const mid = (near + far) / 2;
    const half = CITY_AVENUE.width / 2;
    cityFlat(cityRoot, cityMat.asphalt, CITY_AVENUE.width, length, 0, mid, 0.03);
    for (let side = -1; side <= 1; side += 2) {
      cityBox(cityRoot, cityMat.walk, [CITY_AVENUE.walk, 0.12, length], [side * (half + CITY_AVENUE.walk / 2), 0.06, mid]);
      cityBox(cityRoot, cityMat.curb, [0.12, 0.14, length], [side * half, 0.07, mid]);
    }
    for (let z = far + 1.5; z < near - 1; z += 3) cityFlat(cityRoot, cityMat.lane, 0.12, 1.4, 0, z, 0.04);
    const width = CITY_GRID.colX * 2 + CITY_LOT.width;
    for (let row = 0; row < CITY_ZONE_ROW; row++) {
      const z = cityRowZ(row) + CITY_LOT.depth / 2 + 1.1;
      cityBox(cityRoot, cityMat.walk, [width, 0.1, 2.2], [0, 0.05, z]);
      for (let side = -1; side <= 1; side += 2) cityRoot.add(makeCityLamp(side * (half + CITY_AVENUE.walk + 0.3), z + 1.2, side));
    }
  }

  // Structured greenery: a hedge behind every lot, trees between the rows along the avenue and two
  // straight alleys on the outer edges of the quarter.
  function buildCityGreenery() {
    const random = seededRandom(97);
    cityRecords.forEach(function (record) {
      const x = record.spec.col * CITY_GRID.colX;
      cityBox(cityRoot, cityMat.hedge, [CITY_LOT.width - 0.4, 0.7, 0.6], [x, 0.35, cityRowZ(record.spec.row) - CITY_LOT.depth / 2 - 0.4]);
    });
    for (let row = 0; row < CITY_ZONE_ROW; row++) {
      const z = cityRowZ(row) - CITY_LOT.depth / 2 - 1.3;
      for (let side = -1; side <= 1; side += 2) {
        cityRoot.add(makeCityTree(side * (CITY_AVENUE.width / 2 + 0.5), z, 0.62, row * 2 + (side > 0 ? 1 : 0)));
      }
    }
    const outer = CITY_GRID.colX + CITY_LOT.width / 2 + 2.6;
    for (let z = CITY_AVENUE.near - 4; z > cityRowZ(CITY_ZONE_ROW) - CITY_LOT.depth; z -= 4.4) {
      for (let side = -1; side <= 1; side += 2) {
        cityRoot.add(makeCityTree(side * (outer + random() * 0.4), z, 0.85 + random() * 0.25, Math.round(z) + side * 3));
        cityRoot.add(makeCityTree(side * (outer + 3.4 + random() * 0.6), z - 2.2, 0.9 + random() * 0.3, Math.round(z) + side * 5));
      }
    }
  }

  function seededRandom(seed) {
    let value = seed;
    return function () {
      value = (value * 16807) % 2147483647;
      return value / 2147483647;
    };
  }

  function makeCityTree(x, z, size, seed) {
    const group = new THREE.Group();
    cityBox(group, cityMat.trunk, [0.32, 1.1, 0.32], [0, 0.55, 0]);
    const leaves = cityMat.leaves[Math.abs(seed) % cityMat.leaves.length];
    cityBox(group, leaves, [1.6, 1.2, 1.6], [0, 1.6, 0]);
    cityBox(group, leaves, [1.1, 0.8, 1.1], [0, 2.5, 0]);
    group.position.set(x, 0, z);
    group.scale.setScalar(size);
    group.rotation.y = (Math.abs(seed) % 7) * 0.4;
    return group;
  }

  // A street lamp; `side` turns its arm over the avenue.
  function makeCityLamp(x, z, side) {
    const group = new THREE.Group();
    cityBox(group, cityMat.pole, [0.12, 2.6, 0.12], [0, 1.3, 0]);
    cityBox(group, cityMat.pole, [0.5, 0.08, 0.12], [-side * 0.2, 2.6, 0]);
    cityBox(group, cityMat.bulb, [0.22, 0.14, 0.22], [-side * 0.42, 2.52, 0]);
    group.position.set(x, 0, z);
    return group;
  }

  function makeCityCar(color) {
    const group = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.3 });
    cityBox(group, body, [0.9, 0.36, 1.7], [0, 0.38, 0]);
    cityBox(group, body, [0.8, 0.32, 0.9], [0, 0.72, -0.1]);
    cityBox(group, machineMat.glass, [0.82, 0.24, 0.92], [0, 0.73, -0.1]);
    cityBox(group, machineMat.light, [0.7, 0.08, 0.04], [0, 0.4, 0.86]);
    for (let side = -1; side <= 1; side += 2) {
      for (let end = -1; end <= 1; end += 2) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 10), machineMat.tyre);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.45, 0.18, end * 0.55);
        group.add(wheel);
      }
    }
    return group;
  }

  // A lot: soil or paving, the HQ building in voxels (solid + blueprint silhouette), a site fence.
  // Every HQ level has its door at local +z, so with no rotation the facade faces the camera.
  function makeCityLot(spec) {
    const lot = new THREE.Group();
    lot.position.set(spec.col * CITY_GRID.colX, 0, cityRowZ(spec.row));
    lot.userData.buildingId = spec.id;
    cityRoot.add(lot);
    const soil = cityFlat(lot, cityMat.soil, CITY_LOT.width, CITY_LOT.depth, 0, 0, 0.05);
    const paving = cityFlat(lot, cityMat.paving, CITY_LOT.width, CITY_LOT.depth, 0, 0, 0.06);
    const record = { id: spec.id, spec: spec, lot: lot, soil: soil, paving: paving, blocks: [], solids: [], ghosts: [], features: [], fence: makeCityFence(lot, CITY_LOT.width, CITY_LOT.depth, 0), reveal: -1, total: 0 };
    addCityBuilding(record, MB.HQ_LEVELS[spec.id]);
    return record;
  }

  function addCityBuilding(record, level) {
    const fp = level.footprint;
    const inner = new THREE.Group();
    inner.position.set(-(fp.minX + fp.maxX + 1) / 2, 0.06, -(fp.minZ + fp.maxZ + 1) / 2);
    record.lot.add(inner);
    const byMaterial = {};
    const order = level.blocks.slice().sort(function (a, b) { return a.y - b.y || a.z - b.z || a.x - b.x; });
    order.forEach(function (block) {
      if (!byMaterial[block.materialId]) byMaterial[block.materialId] = [];
      byMaterial[block.materialId].push(block);
    });
    const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    Object.keys(byMaterial).forEach(function (materialId) {
      const list = byMaterial[materialId];
      const solid = new THREE.InstancedMesh(geometry, blockSurface(materialId, false), list.length);
      const ghost = new THREE.InstancedMesh(geometry, cityMat.blueprint, list.length);
      solid.castShadow = true;
      solid.receiveShadow = true;
      solid.userData.buildingId = ghost.userData.buildingId = record.id;
      list.forEach(function (block, index) {
        record.blocks.push({ block: block, solid: solid, ghost: ghost, index: index, order: order.indexOf(block) });
      });
      inner.add(solid, ghost);
      record.solids.push(solid);
      record.ghosts.push(ghost);
    });
    const byKey = new Map();
    level.blocks.forEach(function (block) { byKey.set(MB.cellKey(block.x, block.y, block.z), block); });
    const state = Features.createState();
    level.blocks.forEach(function (block) {
      if (!block.feature) return;
      const feature = Features.build(block, {
        parent: inner,
        getBlock: function (x, y, z) { return byKey.get(MB.cellKey(x, y, z)); },
      }, state);
      feature.traverse(function (object) { object.userData.buildingId = record.id; });
      record.features.push({ block: block, object: feature, order: order.indexOf(block) });
    });
    record.total = level.blocks.length;
  }

  // Orange-and-white site fence around a width × depth box; `gate` leaves an opening that wide in
  // the front (+z) side.
  function makeCityFence(parent, width, depth, gate) {
    const fence = new THREE.Group();
    const halfW = width / 2 - 0.3;
    const halfD = depth / 2 - 0.3;
    for (let i = -halfW; i <= halfW + 0.01; i += 1.2) {
      [-halfD, halfD].forEach(function (z, k) {
        if (k === 1 && Math.abs(i) < gate / 2) return;
        cityBox(fence, (Math.round(i / 1.2) + k) % 2 ? cityMat.fence : cityMat.fenceWhite, [1.1, 0.28, 0.06], [i, 0.42, z]);
      });
    }
    for (let i = -halfD; i <= halfD + 0.01; i += 1.2) {
      [-halfW, halfW].forEach(function (x, k) {
        cityBox(fence, (Math.round(i / 1.2) + k) % 2 ? cityMat.fence : cityMat.fenceWhite, [0.06, 0.28, 1.1], [x, 0.42, i]);
      });
    }
    fence.visible = false;
    parent.add(fence);
    return fence;
  }

  // The buildings that are not in the game yet: one fenced field with a gate at the end of the
  // avenue, a crane and building materials — «Скоро · ещё N зданий».
  function makeCityExpansion() {
    const group = new THREE.Group();
    const width = CITY_GRID.colX * 2 + CITY_LOT.width;
    const depth = CITY_LOT.depth + 1;
    group.position.set(0, 0, cityRowZ(CITY_ZONE_ROW));
    group.userData.buildingId = 'expansion';
    cityRoot.add(group);
    cityFlat(group, cityMat.soil, width, depth, 0, 0, 0.05);
    makeCityFence(group, width, depth, CITY_AVENUE.width + 0.4).visible = true;
    for (let side = -1; side <= 1; side += 2) cityBox(group, cityMat.pole, [0.22, 1.4, 0.22], [side * (CITY_AVENUE.width / 2 + 0.3), 0.7, depth / 2 - 0.3]);
    // Tower crane over the field.
    cityBox(group, machineMat.yellow, [0.4, 6.2, 0.4], [5.5, 3.1, -1.5]);
    cityBox(group, machineMat.yellow, [9, 0.3, 0.3], [3.2, 6.1, -1.5]);
    cityBox(group, machineMat.dark, [1.4, 0.7, 0.7], [7.8, 5.9, -1.5]);
    cityBox(group, machineMat.dark, [0.04, 2.4, 0.04], [0.6, 4.8, -1.5]);
    // Stacks of material and pallets.
    [[-7, 1.5], [-5.6, 1.6], [-7.6, -1.6], [3, 2], [8, 1.8]].forEach(function (spot, i) {
      const height = 0.5 + (i % 3) * 0.35;
      cityBox(group, i % 2 ? cityMat.crate : machineMat.steel, [1.2, height, 1.1], [spot[0], height / 2 + 0.05, spot[1]]);
    });
    return group;
  }

  // Gold outline around the selected lot.
  function makeCityRing() {
    const ring = new THREE.Group();
    const w = CITY_LOT.width + 0.6;
    const d = CITY_LOT.depth + 0.6;
    [[w, 0.24, 0, d / 2], [w, 0.24, 0, -d / 2], [0.24, d, w / 2, 0], [0.24, d, -w / 2, 0]].forEach(function (part) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(part[0], 0.05, part[1]), cityMat.ring);
      strip.position.set(part[2], 0.12, part[3]);
      ring.add(strip);
    });
    ring.visible = false;
    cityRoot.add(ring);
    return ring;
  }

  function placeCityRing() {
    const ring = cityDecor.ring;
    if (!ring) return;
    const id = cityBuilding;
    ring.visible = !!id && (id === 'expansion' || cityRecords.has(id));
    if (!ring.visible) return;
    const spot = cityLotSpot(id);
    const zone = id === 'expansion';
    ring.position.set(spot.x, 0, spot.z);
    ring.scale.set(zone ? (CITY_GRID.colX * 2 + CITY_LOT.width + 0.6) / (CITY_LOT.width + 0.6) : 1, 1, zone ? (CITY_LOT.depth + 1.6) / (CITY_LOT.depth + 0.6) : 1);
  }

  // Ids of HQ blocks already built: the HQ site on screen, or its saved slot.
  function cityBuiltIds(id) {
    if (liveKey === 'hq' && campaign && campaign.runPayload && campaign.runPayload.projectId === id && world) {
      return new Set(world.blocks.filter(function (block) { return block.built; }).map(function (block) { return block.id; }));
    }
    const saved = Meta.site(meta, 'hq');
    return new Set(saved && saved.runPayload && saved.runPayload.projectId === id ? saved.builtIds : []);
  }

  function cityBuildPercent(id) {
    if (liveKey === 'hq' && campaign && campaign.runPayload && campaign.runPayload.projectId === id && world) {
      return percentOf(world.blocks.length - world.remaining, world.blocks.length);
    }
    const saved = Meta.site(meta, 'hq');
    return saved && saved.runPayload && saved.runPayload.projectId === id ? percentOf(saved.built, saved.total) : 0;
  }

  function setCityInstance(mesh, index, block, scale) {
    dummy.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
    dummy.quaternion.identity();
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  function showCityBlocks(record, built, silhouette, revealT) {
    record.blocks.forEach(function (item) {
      const isBuilt = built === true || (built && built.has(item.block.id));
      let scale = isBuilt ? 1 : 0;
      if (isBuilt && revealT >= 0) {
        const start = item.order / record.total * 0.8;
        const u = Math.max(0, Math.min(1, (revealT - start) / 0.2));
        scale = 1 - Math.pow(1 - u, 3);
      }
      const glassId = item.block.glassId;
      const glazed = glassId !== undefined && (built === true || (built && built.has(glassId)));
      setCityInstance(item.solid, item.index, item.block, item.block.feature || glazed ? 0.0001 : Math.max(scale, 0.0001));
      setCityInstance(item.ghost, item.index, item.block, !isBuilt && silhouette && item.block.glassOf === undefined ? 1 : 0.0001);
    });
    record.solids.forEach(function (mesh) { mesh.instanceMatrix.needsUpdate = true; });
    record.ghosts.forEach(function (mesh) { mesh.instanceMatrix.needsUpdate = true; });
    record.features.forEach(function (item) {
      const isBuilt = built === true || (built && built.has(item.block.id));
      let scale = isBuilt ? 1 : 0.001;
      if (isBuilt && revealT >= 0) scale = revealT >= item.order / record.total * 0.8 + 0.2 ? 1 : 0.001;
      item.object.scale.setScalar(scale);
    });
  }

  function syncCity() {
    cityRecords.forEach(function (record, id) {
      const state = cityState(id);
      const open = state !== 'locked';
      record.paving.visible = open;
      record.soil.visible = !open;
      record.fence.visible = state === 'building';
      // A building the player has not seen yet stays empty until its reveal grows it (showCity).
      const waiting = !meta.citySeen[id] || (cityReveal && cityReveal.id === id);
      if (state === 'live') showCityBlocks(record, true, false, record.reveal >= 0 ? record.reveal : (waiting ? 0 : -1));
      else if (state === 'building') showCityBlocks(record, cityBuiltIds(id), true, -1);
      else showCityBlocks(record, null, state === 'plot' || state === 'ready', -1);
    });
    paintCitySigns();
    placeCityRing();
  }

  // ---- what to do next, prices ----

  function cityIdsByUnlock() {
    return Array.from(cityRecords.keys()).sort(function (a, b) { return Meta.PROJECTS[a].unlock - Meta.PROJECTS[b].unlock; });
  }

  // What the company still lacks to buy the plot: ['70 капитала', '3 печатей'] (empty when it can).
  function cityShortfall(id) {
    const project = Meta.PROJECTS[id];
    const missing = [];
    const capital = project.capital - meta.capital;
    const seals = (project.seals || 0) - meta.seals;
    if (capital > 0) missing.push(capital.toLocaleString('ru-RU') + ' капитала');
    if (seals > 0) missing.push(seals + ' ' + UI.plural(seals, 'печати', 'печатей', 'печатей'));
    return missing;
  }

  function joinAnd(parts) {
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' и ' + parts[parts.length - 1] : parts.join('');
  }

  // The step the arrow points at, in unlock order: the HQ site under way, a bought plot, then the
  // first plot the company can pay for (capital and seals, like Meta.buyPlot).
  function cityNextStep() {
    if (meta.hqSite && cityRecords.has(meta.hqSite.id)) return meta.hqSite.id;
    const ids = cityIdsByUnlock();
    for (let i = 0; i < ids.length; i++) if (cityState(ids[i]) === 'ready') return ids[i];
    for (let i = 0; i < ids.length; i++) if (cityState(ids[i]) === 'plot' && cityShortfall(ids[i]).length === 0) return ids[i];
    return null;
  }

  // The line of the default card: the next step, or what the next building waits for.
  function cityAdvice() {
    const next = cityNextStep();
    if (next) {
      const name = Meta.PROJECTS[next].name;
      const state = cityState(next);
      if (state === 'building') return { id: next, html: '<b>Идёт стройка:</b> «' + UI.escapeHtml(name) + '» · ' + cityBuildPercent(next) + '%' };
      if (state === 'ready') return { id: next, html: '<b>Можно строить:</b> ' + UI.escapeHtml(name) };
      return { id: next, html: '<b>Можно купить участок:</b> ' + UI.escapeHtml(name) };
    }
    const ids = cityIdsByUnlock();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const state = cityState(id);
      if (state === 'live') continue;
      const project = Meta.PROJECTS[id];
      const reason = state === 'locked' ? 'с уровня ' + (project.unlock + 1) : 'не хватает ' + joinAnd(cityShortfall(id));
      return { id: id, html: '<b>Дальше:</b> ' + UI.escapeHtml(project.name) + ' — ' + reason };
    }
    return null;
  }

  // Can the company buy anything in the office right now (the «!» on its sign)?
  function officeAffordable() {
    return Object.keys(Meta.OFFICE).some(function (id) {
      const level = meta.office[id];
      if (!Meta.officeUnlocked(meta, id) || level >= Meta.OFFICE[id].max) return false;
      return meta.capital >= Meta.officeCost(id, level) && meta.seals >= Meta.officeSeals(id, level);
    });
  }

  // Can the company open the next technology right now (the «!» on the tech center's sign)?
  function techAffordable() {
    return Meta.TECH_ORDER.some(function (id) {
      return Meta.techUnlocked(meta, id) && meta.capital >= Meta.techCost(id) && meta.seals >= Meta.techSeals(id);
    });
  }

  function schoolAffordable() {
    return meta.hq.recruiting > 0 && Object.keys(Meta.SCHOOL.upgrades).some(function (id) {
      const price = Meta.schoolUpgradeCost(meta, id);
      return price && !Meta.schoolUpgradeReason(meta, id) && meta.capital >= price.capital && meta.diplomas >= price.diplomas;
    });
  }

  function contractReadyNow() {
    return Meta.contractReady(meta) && Date.now() >= (meta.contract.cooldownUntil || 0);
  }

  // Session lines a building opens, by name; a whole dock tab is named as the tab.
  // form 'acc' — «Открывает: вкладку …», 'nom' — «Открыто: вкладка …».
  function cityOpensNames(id, form) {
    const opens = Meta.PROJECTS[id].opens || [];
    const names = [];
    (window.MicroBuildersUpgradeGroups || []).forEach(function (group) {
      const items = group.items.filter(function (item) { return opens.indexOf(item[0]) >= 0; });
      if (!items.length) return;
      if (items.length === group.items.length && items.length > 2) names.push((form === 'acc' ? 'вкладку' : 'вкладка') + ' «' + group.title + '»');
      else items.forEach(function (item) { names.push(item[1]); });
    });
    return names;
  }

  function cityGives(id) {
    const project = Meta.PROJECTS[id];
    const parts = [];
    const lines = cityOpensNames(id, 'acc');
    if (lines.length) parts.push('Открывает на стройке: ' + lines.join(', '));
    if (project.gives) parts.push(project.gives);
    if (project.rewardSeals && !(meta.hq[id] > 0)) parts.push('При постройке: +' + project.rewardSeals + ' ' + UI.plural(project.rewardSeals, 'печать', 'печати', 'печатей'));
    return parts.join('. ');
  }

  // ---- floating signs ----

  function buildCitySigns() {
    const layer = document.getElementById('city-signs');
    layer.innerHTML = '';
    layer.hidden = true;
    citySigns.clear();
    cityRecords.forEach(function (record, id) { citySigns.set(id, makeCitySign(layer, id)); });
    citySigns.set('expansion', makeCitySign(layer, 'expansion'));
  }

  function makeCitySign(layer, id) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'city-sign';
    el.dataset.id = id;
    el.hidden = true;
    layer.appendChild(el);
    // Anchored over the back edge of the roof: from the boulevard's raised camera the sign then
    // sits above the building, not over its facade.
    const spot = cityLotSpot(id);
    const back = id === 'expansion' ? 0 : CITY_LOT.depth / 2 - 1.2;
    return { id: id, el: el, anchor: new THREE.Vector3(spot.x, spot.top + 0.9, spot.z - back), key: '', x: NaN, y: NaN, z: '', shown: false, visible: false, tail: 0, w: 0, h: 0, sx: 0, sy: 0, depth: 0 };
  }

  function priceChip(icon, alt, need, have) {
    return '<span class="city-price ' + (have >= need ? 'ok' : 'short') + '"><img src="icons/icon-' + icon + '.jpg?v=2" alt="' + alt + '">' + formatCompact(need) + '</span>';
  }

  // Badges of a working building: «!» in the office, «Найм готов», the number of orders, «Контракт готов».
  function cityBadges(id) {
    if (id === 'office' && officeAffordable()) return ['<em class="city-badge alert" title="Есть прокачки по карману">!</em>'];
    if (id === 'tech' && techAffordable()) return ['<em class="city-badge alert" title="Можно открыть новую прокачку">!</em>'];
    if (id === 'recruiting' && schoolAffordable()) return ['<em class="city-badge">Обучение доступно</em>'];
    if (id === 'recruiting' && Meta.refreshRecruiting(meta).stock > 0) return ['<em class="city-badge">Найм готов</em>'];
    if (id === 'exchange' && meta.exchange.orders.length > 0) {
      const count = meta.exchange.orders.length;
      return ['<em class="city-badge">' + count + ' ' + UI.plural(count, 'заказ', 'заказа', 'заказов') + '</em>'];
    }
    if (id === 'contracts' && contractReadyNow()) return ['<em class="city-badge">Контракт готов</em>'];
    return [];
  }

  function citySignView(id) {
    if (id === 'expansion') {
      const count = Meta.CITY.filter(function (spec) { return spec.zone === 'expansion'; }).length;
      const text = 'Скоро · ещё ' + count + ' ' + UI.plural(count, 'здание', 'здания', 'зданий');
      return { cls: 'is-soon', label: 'Зона расширения: ' + text, html: '<span class="city-sign-main">' + ICONS.crane + '<b>' + text + '</b></span>' };
    }
    const spec = cityRecords.get(id).spec;
    const project = Meta.PROJECTS[id];
    const state = cityState(id);
    const name = UI.escapeHtml(spec.sign);
    let icon = cityIcon(id);
    let extra = '';
    let line = '';
    let cls = 'is-' + state;
    let label = project.name;
    if (state === 'live') {
      extra = '<i class="city-dot" aria-hidden="true"></i>' + cityBadges(id).join('');
      label += ': работает';
    } else if (state === 'building') {
      const pct = cityBuildPercent(id);
      line = '<span class="city-sign-line">Стройка ' + pct + '%</span><span class="city-sign-bar"><i style="width:' + pct + '%"></i></span>';
      label += ': стройка ' + pct + '%';
    } else if (state === 'ready') {
      line = '<span class="city-sign-line">Можно строить</span>';
      label += ': можно строить';
    } else if (state === 'plot') {
      const can = cityShortfall(id).length === 0;
      cls += can ? ' is-afford' : '';
      line = '<span class="city-sign-line">' + priceChip('capital', 'капитал', project.capital, meta.capital) +
        (project.seals ? priceChip('seals', 'печати', project.seals, meta.seals) : '') + '</span>';
      label += can ? ': можно купить участок' : ': участок, не хватает ресурсов';
    } else {
      icon = ICONS.lock;
      line = '<span class="city-sign-line">с уровня ' + (project.unlock + 1) + '</span>';
      label += ': откроется с уровня ' + (project.unlock + 1);
    }
    return { cls: cls, label: label, html: '<span class="city-sign-main">' + icon + '<b>' + name + '</b>' + extra + '</span>' + line };
  }

  // The arrow: the next step, otherwise the building to save up for (never a locked one).
  function cityArrowTarget() {
    const advice = cityAdvice();
    return advice && cityState(advice.id) !== 'locked' ? advice.id : null;
  }

  function paintCitySigns() {
    const next = cityArrowTarget();
    citySigns.forEach(function (sign, id) {
      const view = citySignView(id);
      const cls = 'city-sign ' + view.cls + (id === next ? ' is-next' : '') + (id === cityBuilding ? ' is-selected' : '');
      const html = view.html + (id === next ? '<span class="city-sign-next" aria-hidden="true">' + ICONS.chevron + '</span>' : '');
      const key = cls + '|' + html;
      if (sign.key === key) return;
      sign.key = key;
      sign.el.className = cls;
      sign.el.innerHTML = html;
      sign.el.setAttribute('aria-label', view.label);
      sign.w = 0; // measured again on its next placement
    });
  }

  // Signs follow their lots on screen (stage px), nearer ones on top; a lot off screen hides its
  // sign. A sign that would cover a nearer one slides sideways or climbs above it, whichever moves
  // it less (the far rows crowd on wide screens); with no room a locked or «Скоро» sign steps
  // aside. Signs never show under the wallet and the site chip or past the screen edges.
  function placeCitySigns() {
    const layer = document.getElementById('city-signs');
    const visible = cityRoot.visible && currentScreen === 'hq';
    if (layer.hidden === visible) layer.hidden = !visible;
    if (!visible) return;
    const width = MicroBuildersStage.width();
    const height = MicroBuildersStage.height();
    camera.updateMatrixWorld();
    const shown = [];
    citySigns.forEach(function (sign) {
      citySignPoint.copy(sign.anchor).project(camera);
      sign.visible = citySignPoint.z > -1 && citySignPoint.z < 1 && Math.abs(citySignPoint.x) < 1 && citySignPoint.y < 1 && citySignPoint.y > -1.05;
      if (!sign.visible) return;
      if (!sign.w) {
        if (!sign.shown) {
          sign.shown = true;
          sign.el.hidden = false;
        }
        sign.w = sign.el.offsetWidth;
        sign.h = sign.el.offsetHeight + (sign.el.classList.contains('is-next') ? 26 : 0) + 8;
      }
      sign.depth = citySignPoint.z;
      sign.sx = Math.round((citySignPoint.x + 1) / 2 * width);
      sign.sy = Math.round((1 - citySignPoint.y) / 2 * height);
      shown.push(sign);
    });
    shown.sort(function (a, b) { return a.depth - b.depth; });
    const minTop = cameraController.getSafeArea().top;
    const placed = [];
    function hitAt(sign, x, y) {
      return placed.find(function (other) {
        return Math.abs(other.x - x) * 2 < other.w + sign.w + 4 && y > other.y - other.h && y - sign.h < other.y;
      });
    }
    function covered(sign, x, y) {
      const top = y - sign.h + 8;
      return top < 0 || cityCovers.some(function (cover) {
        return x + sign.w / 2 > cover.left && x - sign.w / 2 < cover.right && y > cover.top && top < cover.bottom;
      });
    }
    shown.forEach(function (sign) {
      const half = sign.w / 2;
      let x = Math.min(Math.max(sign.sx, half + 4), width - half - 4);
      let y = sign.sy;
      const hit = hitAt(sign, x, y);
      if (hit) {
        let best = null;
        // Sideways off the nearer sign, as far as the tail can still point at the lot.
        const side = hit.x + (sign.sx >= hit.x ? 1 : -1) * ((hit.w + sign.w) / 2 + 3);
        if (Math.abs(side - sign.sx) <= half - 14 && side >= half + 4 && side <= width - half - 4 && !hitAt(sign, side, y)) {
          best = { x: side, y: y, move: Math.abs(side - x) };
        }
        // Up above it, only within the free band.
        let up = y;
        let upHit = hit;
        for (let pass = 0; upHit && pass < placed.length; pass++) {
          up = upHit.y - upHit.h - 2;
          upHit = hitAt(sign, x, up);
        }
        if (!upHit && up - sign.h >= minTop && (!best || y - up < best.move)) best = { x: x, y: up, move: y - up };
        if (best) {
          x = best.x;
          y = best.y;
        } else if (sign.id === 'expansion' || cityState(sign.id) === 'locked') {
          sign.visible = false;
          return;
        }
      }
      if (covered(sign, x, y)) {
        sign.visible = false;
        return;
      }
      placed.push({ x: x, y: y, w: sign.w, h: sign.h });
      if (x !== sign.x || y !== sign.y) {
        sign.x = x;
        sign.y = y;
        sign.el.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -100%)';
      }
      // The tail keeps pointing at the lot when the sign moved sideways.
      const tail = Math.max(-(half - 12), Math.min(half - 12, sign.sx - x));
      if (tail !== sign.tail) {
        sign.tail = tail;
        sign.el.style.setProperty('--tail', tail + 'px');
      }
      const z = String(Math.round((1 - sign.depth) * 2000));
      if (sign.z !== z) {
        sign.z = z;
        sign.el.style.zIndex = z;
      }
    });
    citySigns.forEach(function (sign) {
      if (sign.shown === sign.visible) return;
      sign.shown = sign.visible;
      sign.el.hidden = !sign.visible;
    });
  }

  // ---- animation, showing and leaving the city ----

  function tickCityBuild(dt) {
    if (!cityRoot.visible) return;
    if (cityDecor.cars) {
      const far = cityZoneFront();
      const near = CITY_AVENUE.near;
      cityDecor.cars.forEach(function (car) {
        const lane = car.userData.lane;
        // Right-hand traffic: the right lane drives away from the camera, the left one towards it.
        car.userData.z -= lane * car.userData.speed * dt;
        if (car.userData.z < far) car.userData.z += near - far;
        if (car.userData.z > near) car.userData.z -= near - far;
        const edge = Math.min(car.userData.z - far, near - car.userData.z);
        car.position.set(lane * CITY_AVENUE.width / 4, 0, car.userData.z);
        car.rotation.y = lane > 0 ? Math.PI : 0;
        car.scale.setScalar(Math.max(0.001, Math.min(1, edge / 1.5)));
      });
    }
    if (cityDecor.ring && cityDecor.ring.visible) {
      cityDecor.ring.userData.t = (cityDecor.ring.userData.t || 0) + dt;
      cityMat.ring.opacity = 0.6 + Math.sin(cityDecor.ring.userData.t * Math.PI * 3) * 0.3;
    }
    if (cityReveal) {
      cityReveal.t += dt;
      const record = cityRecords.get(cityReveal.id);
      if (cityReveal.phase === 'fly' && cityReveal.t >= 0.9) {
        cityReveal.phase = 'grow';
        record.reveal = 0;
      } else if (cityReveal.phase === 'grow' && record.reveal < 0) {
        finishCityReveal();
      }
    }
    cityRecords.forEach(function (record) {
      if (record.reveal < 0) return;
      record.reveal += dt / 2.2;
      if (record.reveal >= 1.05) record.reveal = -1;
      showCityBlocks(record, true, false, record.reveal);
    });
  }

  // A working building the player has not seen yet (the one asked for first).
  function cityFreshBuilding() {
    if (cityBuilding && cityRecords.has(cityBuilding) && meta.hq[cityBuilding] > 0 && !meta.citySeen[cityBuilding]) return cityBuilding;
    const ids = cityIdsByUnlock();
    for (let i = 0; i < ids.length; i++) if (meta.hq[ids[i]] > 0 && !meta.citySeen[ids[i]]) return ids[i];
    return null;
  }

  // A building finished while the HQ is already open (a catch-up, «Смотреть в штабе» from there):
  // its reveal starts as soon as no window covers the city.
  function revealFreshBuilding() {
    if (cityReveal || document.body.classList.contains('has-modal')) return;
    const fresh = cityFreshBuilding();
    if (fresh) startCityReveal(fresh);
  }

  // A new building: the camera flies to its lot, it grows cube by cube, then its card «Новое здание: …».
  function startCityReveal(id) {
    meta.citySeen[id] = true;
    Meta.save(meta);
    cityReveal = { id: id, phase: 'fly', t: 0 };
    cityBuilding = id;
    cityNewBuilding = null;
    syncCity();
    paintCityCard();
    flyToCityLot(id, 0.9);
  }

  function finishCityReveal() {
    const id = cityReveal.id;
    cityReveal = null;
    cityRecords.get(id).reveal = -1;
    // Other buildings finished meanwhile appear at once.
    cityRecords.forEach(function (record, other) {
      if (meta.hq[other] > 0 && !meta.citySeen[other]) meta.citySeen[other] = true;
    });
    Meta.save(meta);
    cityBuilding = id;
    cityNewBuilding = id;
    syncCity();
    paintCityCard();
  }

  function flyToCityLot(id, seconds) {
    const spot = cityLotSpot(id);
    const zone = id === 'expansion';
    cameraController.flyTo({
      target: { x: spot.x, y: Math.max(1, spot.top * 0.4), z: spot.z + 0.5 },
      distance: cameraController.homeDistance * (zone ? 0.62 : 0.5),
      azimuth: 0,
      polar: 0.98,
    }, seconds);
  }

  // Entering the HQ shows the whole quarter. Opening and closing a building's window over the
  // city (office, exchange, recruiting) keeps the camera where it is.
  function showCity() {
    if (cityRoot.visible) {
      syncCity();
      paintCityWallet();
      placeCitySigns();
      revealFreshBuilding();
      return;
    }
    if (world && campaign && campaign.status !== 'title') cameraStates.site[siteCameraKey()] = cameraController.saveState();
    if (cameraController.isWorkerView()) cameraController.setWorkerView(false);
    levelRoot.visible = false;
    grass.visible = false;
    cityRoot.visible = true;
    cityRefreshKey = '';
    cameraController.setMode('city', cityCameraBounds());
    paintCityWallet();
    paintSiteChip(); // its height is part of the band measured below
    syncCity();
    paintCityCard();
    refreshSafeArea({ snap: true });
    cameraController.frameHome();
    applySceneLighting();
    revealFreshBuilding();
    if (!cityReveal && cityBuilding) selectCityLot(cityBuilding);
    placeCitySigns();
  }

  function hideCity() {
    const wasCity = cityRoot.visible;
    cityRoot.visible = false;
    levelRoot.visible = true;
    grass.visible = true;
    if (!wasCity) return;
    if (cityReveal) {
      cityRecords.get(cityReveal.id).reveal = -1;
      cityReveal = null;
    }
    cityBuilding = null;
    cityNewBuilding = null;
    placeCitySigns();
    paintCityWallet();
    placeCityRing();
    cameraStates.city = cameraController.saveState();
    if (!cameraController.setMode('site')) return;
    // Back from the city: the view the player left on this site, otherwise its home.
    refreshSafeArea({ snap: true });
    if (!world || !restoreSiteCamera()) cameraController.frameHome();
    applySceneLighting();
  }

  // The quarter's camera box; a wide (landscape) screen looks more from above, otherwise the far
  // rows squeeze into a thin strip and their signs overlap.
  function cityCameraBounds() {
    const wide = MicroBuildersStage.width() > MicroBuildersStage.height();
    return Object.assign({}, CITY_CAMERA, { polar: wide ? 0.62 : 0.85 });
  }

  // A tap in the city: only lots and the expansion zone count (trees, lamps and cars do not).
  function pickCity(event) {
    const rect = view.getBoundingClientRect();
    workerPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    workerRaycaster.setFromCamera(workerPointer, camera);
    const targets = [];
    cityRecords.forEach(function (record) { targets.push(record.lot); });
    if (cityDecor.expansion) targets.push(cityDecor.expansion);
    const hits = workerRaycaster.intersectObjects(targets, true);
    let id = null;
    if (hits.length > 0) {
      let object = hits[0].object;
      while (object && !object.userData.buildingId) object = object.parent;
      if (object) id = object.userData.buildingId;
    }
    if (id) {
      selectCityLot(id);
    } else if (cityBuilding && !cityReveal) {
      // Empty ground closes the card; the camera stays («◎» brings the quarter back).
      clearCitySelection();
      paintCameraButton();
    }
  }

  // Tap on a lot or its sign, «Показать»: the camera flies to it, the lot lights up, its card opens.
  function selectCityLot(id) {
    if (!id || (id !== 'expansion' && !cityRecords.has(id)) || !cityRoot.visible || cityReveal) return;
    if (cityNewBuilding !== id) cityNewBuilding = null;
    cityBuilding = id;
    paintCitySigns();
    placeCityRing();
    // The card first: it re-measures the band, and the close-up distance comes from the band above
    // this lot's card (not the card shown before).
    paintCityCard();
    flyToCityLot(id, 0.6);
    paintCameraButton();
  }

  // The overview card again: no selected lot, no outline.
  function clearCitySelection() {
    cityBuilding = null;
    cityNewBuilding = null;
    paintCitySigns();
    placeCityRing();
    paintCityCard();
  }

  function closeCityCard() {
    if (cityReveal) return;
    cameraController.frameHome({ animate: true });
    clearCitySelection();
    paintCameraButton();
  }

  // Currencies, timers and the HQ site change under an open city: signs, card and wallet follow.
  function refreshCity() {
    if (!cityRoot.visible || currentScreen !== 'hq') return;
    revealFreshBuilding();
    const recruit = meta.hq.recruiting > 0 ? Meta.refreshRecruiting(meta) : null;
    const saved = Meta.site(meta, 'hq');
    const key = [
      meta.capital, meta.seals, meta.campaignLevel, JSON.stringify(meta.rare), JSON.stringify(meta.hq), JSON.stringify(meta.plots),
      meta.hqSite ? meta.hqSite.id : '', saved ? saved.built : 0, liveKey === 'hq' && world ? world.remaining : 0,
      recruit ? recruit.stock + ':' + Math.floor((recruit.nextAt - Date.now()) / 60000) : '',
      meta.exchange.orders.length, contractReadyNow() ? 1 : 0, officeAffordable() ? 1 : 0, schoolAffordable() ? 1 : 0, meta.diplomas, liveKey,
    ].join('|');
    if (key === cityRefreshKey) return;
    cityRefreshKey = key;
    syncCity();
    paintCityCard();
    paintCityWallet();
  }

  // ---- company wallet and the building card ----

  function paintCityWallet() {
    const wallet = document.getElementById('city-wallet');
    const show = currentScreen === 'hq' && cityRoot.visible;
    if (wallet.hidden === show) wallet.hidden = !show;
    if (!show) return;
    const items = [['capital', 'Капитал', meta.capital], ['seals', 'Печати', meta.seals], ['diplomas', 'Дипломы', meta.diplomas]];
    Object.keys(meta.rare).forEach(function (key) {
      // Rare resources once the player has some: no row of zeros.
      if (meta.rare[key] > 0) items.push(['rare-' + key, Meta.RARE_NAMES[key], meta.rare[key]]);
    });
    const html = items.map(function (item) {
      return '<span class="pill" title="' + item[1] + '"><img class="game-icon currency-icon" src="icons/icon-' + (item[0] === 'diplomas' ? 'diplomas.svg' : item[0] + '.jpg?v=2') + '" alt="' + item[1] + '"><b>' + formatCompact(item[2]) + '</b></span>';
    }).join('');
    if (html === cityWalletHtml) return;
    cityWalletHtml = html;
    wallet.innerHTML = html;
    queueSafeArea(); // the pills' span is a cover for the signs
  }

  function cityCardHead(icon, kicker, title, chip, closable) {
    return '<header class="city-card-head"><span class="city-card-icon">' + icon + '</span>' +
      '<div class="city-card-titles"><p class="kicker">' + kicker + '</p><h3>' + title + '</h3>' +
      (chip ? '<span class="city-chip ' + chip.tone + '">' + chip.text + '</span>' : '') + '</div>' +
      (closable ? '<button type="button" class="city-card-close" data-action="city-close" aria-label="Закрыть">×</button>' : '') + '</header>';
  }

  function cityStateChip(id, state) {
    const project = Meta.PROJECTS[id];
    if (state === 'live') return { text: 'Работает', tone: 'ok' };
    if (state === 'building') return { text: 'Стройка · ' + cityBuildPercent(id) + '%', tone: 'warn' };
    if (state === 'ready') return { text: 'Участок куплен', tone: 'info' };
    if (state === 'plot') return cityShortfall(id).length ? { text: 'Не хватает ресурсов', tone: 'bad' } : { text: 'Можно купить', tone: 'info' };
    return { text: 'Откроется с уровня ' + (project.unlock + 1), tone: 'muted' };
  }

  // «Капитал 250 (есть 180)» per currency of the plot price.
  function cityCostRows(id) {
    const project = Meta.PROJECTS[id];
    const rows = [['capital', 'Капитал', project.capital, meta.capital]];
    if (project.seals) rows.push(['seals', 'Печати', project.seals, meta.seals]);
    return '<ul class="city-cost">' + rows.map(function (row) {
      return '<li class="' + (row[3] >= row[2] ? 'ok' : 'short') + '"><img class="currency-icon" src="icons/icon-' + row[0] + '.jpg?v=2" alt="">' +
        '<span>' + row[1] + ' <b>' + row[2].toLocaleString('ru-RU') + '</b></span><small>(есть ' + row[3].toLocaleString('ru-RU') + ')</small></li>';
    }).join('') + '</ul>';
  }

  // The one main button of a lot card; a button that cannot be pressed says why.
  function cityAction(id, state) {
    const other = meta.hqSite && meta.hqSite.id !== id ? Meta.PROJECTS[meta.hqSite.id].name : '';
    if (state === 'plot') {
      if (other) return { label: 'Сначала достройте «' + other + '»', disabled: true };
      const missing = cityShortfall(id);
      if (missing.length) return { label: 'Не хватает ' + joinAnd(missing), disabled: true };
      return { label: 'Купить участок и строить', action: 'take-build' };
    }
    if (state === 'ready') return other ? { label: 'Сначала достройте «' + other + '»', disabled: true } : { label: 'Начать стройку', action: 'take-build' };
    if (state === 'building') return { label: liveKey === 'hq' ? 'Вернуться на стройку' : 'Продолжить стройку', action: 'take-build' };
    if (state === 'locked') return { label: 'Откроется с уровня ' + (Meta.PROJECTS[id].unlock + 1), disabled: true };
    if (id === 'office') return { label: 'Открыть отделы', action: 'city-open', note: officeAffordable() ? 'Есть прокачки, на которые хватает капитала' : '' };
    if (id === 'tech') {
      const opened = Meta.TECH_ORDER.filter(function (tech) { return meta.tech[tech] > 0; }).length;
      return { label: 'Открыть техцентр', action: 'city-open', note: 'Открыто технологий: ' + opened + ' из ' + Meta.TECH_ORDER.length };
    }
    if (id === 'exchange') {
      const count = meta.exchange.orders.length;
      return { label: 'Открыть биржу', action: 'city-open', note: 'Заказы на бирже: ' + count + ' из ' + Meta.exchangeCapacity(meta) };
    }
    if (id === 'recruiting') return { label: 'Открыть школу', action: 'city-open', note: 'Попытки сегодня: ' + Meta.schoolAttempts(meta).left + ' / 5' };
    if (id === 'contracts') return { label: 'Открыть контракты', action: 'city-contracts' };
    return null;
  }

  function cityActionHtml(id, action) {
    if (!action) return '';
    return '<button type="button" class="primary city-action"' + (action.action ? ' data-action="' + action.action + '" data-id="' + id + '"' : '') +
      (action.disabled ? ' disabled' : '') + '>' + UI.escapeHtml(action.label) + '</button>' +
      (action.note ? '<p class="city-note">' + UI.escapeHtml(action.note) + '</p>' : '');
  }

  function cityLotCard(id) {
    const project = Meta.PROJECTS[id];
    const state = cityState(id);
    const fresh = cityNewBuilding === id && state === 'live';
    let html = cityCardHead(cityIcon(id), fresh ? 'Новое здание' : 'Штаб', UI.escapeHtml(fresh ? 'Новое здание: ' + project.name : project.name), cityStateChip(id, state), true);
    if (fresh) {
      const lines = cityOpensNames(id, 'nom');
      html += '<p class="city-opened"><b>Открыто:</b> ' + UI.escapeHtml(project.opened || project.text) + '</p>' +
        (lines.length ? '<p class="city-opened"><b>На стройке:</b> ' + UI.escapeHtml(lines.join(', ')) + '</p>' : '');
    } else {
      html += '<section class="city-gives"><h4>Что даёт</h4><p>' + UI.escapeHtml(cityGives(id)) + '</p></section>';
    }
    if (state === 'plot' || state === 'locked') html += cityCostRows(id);
    if (state === 'building') {
      const pct = cityBuildPercent(id);
      html += '<div class="city-progress"><i style="width:' + pct + '%"></i></div>';
    }
    return html + cityActionHtml(id, cityAction(id, state));
  }

  function cityZoneCard() {
    const specs = Meta.CITY.filter(function (spec) { return spec.zone === 'expansion'; });
    return cityCardHead(ICONS.crane, 'Штаб', 'Зона расширения', { text: 'Скоро', tone: 'muted' }, true) +
      '<ul class="city-soon">' + specs.map(function (spec) {
        const project = Meta.PROJECTS[spec.id];
        return '<li><b>' + UI.escapeHtml(project.name) + '</b><span>' + UI.escapeHtml(project.text) + '</span></li>';
      }).join('') + '</ul><p class="city-note">Здания появятся в следующих обновлениях.</p>';
  }

  // Nothing selected: how far the quarter is and the next step with «Показать».
  function cityOverviewCard() {
    const ids = cityIdsByUnlock();
    const built = ids.filter(function (id) { return meta.hq[id] > 0; }).length;
    const advice = cityAdvice();
    let html = cityCardHead(ICONS.hq, 'Штаб', 'Построено ' + built + ' из ' + ids.length, null, false);
    if (advice) {
      html += '<div class="city-next-row"><p class="city-next">' + advice.html + '</p>' +
        '<button type="button" class="primary city-action" data-action="city-show" data-id="' + advice.id + '">Показать</button></div>';
    } else {
      html += '<p class="city-next">Все здания построены. Новые появятся в зоне расширения.</p>';
    }
    // The chip leads back to the site on screen; the main order gets its own way back.
    const main = Meta.site(meta, 'campaign');
    if (liveKey && liveKey !== 'campaign' && main) {
      html += '<button type="button" class="city-text-btn" data-action="site-switch" data-id="campaign">Основная стройка · ' + UI.escapeHtml(main.name) + ' ›</button>';
    }
    return html;
  }

  // The bottom sheet of the city: a lot's card, the expansion zone, or the overview.
  function paintCityCard() {
    const card = document.getElementById('city-card');
    const show = currentScreen === 'hq' && cityRoot.visible && !cityReveal;
    if (card.hidden === show) card.hidden = !show;
    const focus = show && (cityBuilding === 'expansion' || cityRecords.has(cityBuilding)) ? cityBuilding : null;
    if (show) {
      const html = focus === 'expansion' ? cityZoneCard() : focus ? cityLotCard(focus) : cityOverviewCard();
      card.classList.toggle('is-overview', !focus);
      if (html !== cityCardHtml) {
        cityCardHtml = html;
        card.innerHTML = html;
      }
    }
    // Back and Escape close a lot card; the overview card is the quarter itself and stays.
    UI.layer.set('city-card', focus ? closeCityCard : null);
    refreshSafeArea();
  }

  function onCityCardAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'city-close') {
      closeCityCard();
    } else if (action === 'city-show') {
      selectCityLot(id);
    } else if (action === 'city-open' || action === 'city-contracts') {
      openBuildingPanel(id);
    } else if (action === 'take-build') {
      takeBuild(id);
    } else if (action === 'site-switch') {
      switchSite(id);
    }
  }

  // Something new among the foremen: an unseen card or one ready to level up.
  function foremenNews() {
    return Object.keys(Meta.CARDS).some(function (id) {
      return (meta.cards[id].level > 0 && meta.cardsSeen[id] !== true) || foremanCanUpgrade(id);
    });
  }

  // Why a nav tab is still closed, '' when it is open. Tabs never disappear (§9): a closed one shows
  // a lock and says this in a toast.
  function navLock(screen) {
    if (screen === 'foremen' && !Object.keys(Meta.CARDS).some(function (id) { return meta.cards[id].level > 0; })) {
      return 'Появится с первым бригадиром';
    }
    if (screen === 'exchange' && !(meta.hq.exchange > 0)) return 'Откроется после постройки Биржи';
    // Contracts open with the story (Meta.contractBoardOpen), long before the contract bureau.
    if (screen === 'contract' && !Meta.contractBoardOpen(meta)) return 'Откроется после заказа 2';
    return '';
  }

  function refreshNav() {
    document.querySelectorAll('#app-nav [data-screen]').forEach(function (button) {
      const lock = navLock(button.dataset.screen);
      if (button.classList.contains('locked') !== !!lock) {
        button.classList.toggle('locked', !!lock);
        button.setAttribute('aria-disabled', lock ? 'true' : 'false');
      }
      if (button.title !== lock) button.title = lock;
    });
    document.querySelector('#app-nav [data-screen="foremen"]').classList.toggle('has-news', !navLock('foremen') && foremenNews());
    // «Стройка» says where it leads: the site the player builds now.
    const snap = Meta.site(meta, Meta.activeSite(meta));
    setText('nav-site', snap ? snap.name : '');
    // The nav is the quarter's: hidden on the site (it has the «Штаб» button) and while nothing
    // behind it is open yet.
    const anyOpen = !navLock('foremen') || !navLock('exchange') || !navLock('contract');
    document.body.classList.toggle('nav-off', currentScreen === 'build' || !anyOpen);
    const hqButton = document.getElementById('hq-btn');
    hqButton.classList.toggle('locked', contractRunning());
    // The very first level has no way out: the quarter opens with its reward.
    hqButton.hidden = !!(campaign && world && campaign.runMode === 'campaign' && world.level.index === 0 && campaign.status === 'play');
    hqButton.classList.toggle('has-news', currentScreen === 'build' && hqNews());
  }

  // Something waits in the quarter: a new or upgradable foreman, a buildable plot or a finished-to-
  // start building, an affordable office line, a recruit, an exchange order, a ready contract.
  function hqNews() {
    if (!navLock('foremen') && foremenNews()) return true;
    const next = cityRecords.size ? cityNextStep() : null;
    if (next && cityState(next) !== 'building') return true;
    if (meta.hq.office > 0 && officeAffordable()) return true;
    if (schoolAffordable() || (meta.hq.recruiting > 0 && Meta.schoolHasUpgrade(meta, 'recruiting') && meta.recruit && meta.recruit.stock > 0)) return true;
    if (meta.hq.exchange > 0 && meta.exchange.orders.length > 0) return true;
    return Meta.contractBoardOpen(meta) && contractReadyNow();
  }

  function isPanel(screen) {
    return PANEL_SCREENS.indexOf(screen) >= 0;
  }

  // A working HQ building's own panel, from its card: the office, recruiting, contracts and the
  // exchange (the same screen as its nav tab). × comes back to this card. False: no panel (yet).
  function openBuildingPanel(id) {
    const screen = { office: 'office', tech: 'tech', exchange: 'exchange', recruiting: 'recruiting', contracts: 'contract' }[id];
    if (!screen || !(meta.hq[id] > 0)) return false;
    cityBuilding = id;
    return openScreen(screen);
  }

  // ×, Back and Escape of a company panel: back where it was opened from — the site, or the quarter
  // with the same lot card.
  function closePanel() {
    if (!isPanel(currentScreen)) return;
    if (panelReturn.screen === 'hq') {
      cityBuilding = panelReturn.building;
      openScreen('hq');
    } else {
      openScreen('build');
    }
  }

  // Back inside «Бригадиры» goes from a card's detail to the grid first.
  function onPanelBack() {
    if (currentScreen === 'foremen' && foremanFocus) {
      showForemanGrid();
      UI.layer.set('panel', onPanelBack);
    } else {
      closePanel();
    }
  }

  // Every screen change goes through here. Leaving the build screen leaves the site (it goes on
  // without the player); coming back catches every site up and shows the return window.
  // opts.silent: no leave / return (launches, restores and the boot do their own).
  function openScreen(screen, opts) {
    const from = currentScreen;
    const silent = !!(opts && opts.silent);
    if (!silent && from === 'build' && screen !== 'build' && contractLocked()) return false;
    // A panel's × leads back where the first panel was opened (panel to panel keeps it).
    if (isPanel(screen) && !isPanel(from)) panelReturn = { screen: from, building: from === 'hq' ? cityBuilding : null };
    // Before showScreen: the HQ and the site measure the free band for the camera there, and
    // `away` hides or shows the dock and the site chip.
    document.body.classList.toggle('away', screen !== 'build');
    showScreen(screen);
    paintSiteChip();
    if (silent) return true;
    if (from === 'build' && screen !== 'build') leaveSite();
    else if (from !== 'build' && screen === 'build') returnToSite();
    return true;
  }

  // Chip «Цитадель · 63% · без вас ›» while the player is in the HQ or a panel.
  function paintSiteChip() {
    const chip = document.getElementById('site-chip');
    const show = currentScreen !== 'build' && !!liveKey && !!world && !!campaign && campaign.status !== 'title';
    chip.hidden = !show;
    if (!show) return;
    const done = world.blocks.length - world.remaining;
    const state = campaign.status === 'complete' ? 'сдан' : 'без вас';
    const pct = percentOf(done, world.blocks.length);
    document.getElementById('site-chip-text').textContent =
      Meta.siteName(campaign.runMode, campaign.levelIndex, campaign.runPayload) + ' · ' + pct + '% · ' + state;
    // The thin bar along the chip's bottom edge.
    chip.style.setProperty('--site-pct', pct + '%');
    chip.classList.toggle('is-done', campaign.status === 'complete');
  }

  // Sticky «Следующий заказ ▸» on a finished site, the contract lock and the run-specific menu items.
  function paintSiteState() {
    const complete = !!liveKey && campaign.status === 'complete';
    document.body.classList.toggle('site-complete', complete);
    const cta = document.getElementById('next-cta');
    cta.hidden = !complete;
    if (complete) {
      cta.textContent = campaign.runMode !== 'campaign' ? 'На основную стройку ▸'
        : (campaign.levelIndex >= MB.LEVELS.length - 1 ? 'Итог кампании ▸' : 'Следующий заказ ▸');
    }
    document.body.classList.toggle('contract-lock', contractRunning());
    document.getElementById('restart').hidden = timedMode(campaign.runMode) || campaign.status === 'title' || campaign.status === 'complete';
    const abandon = document.getElementById('abandon-run');
    const side = liveKey === 'side' && campaign.status === 'play';
    abandon.hidden = !side;
    if (side) abandon.textContent = campaign.runMode === 'school' ? 'Бросить испытание' : campaign.runMode === 'contract' ? 'Бросить контракт' : 'Бросить заказ биржи';
  }

  function showScreen(screen) {
    const changed = screen !== currentScreen;
    if (changed) {
      // «новый» on a card goes when its detail opens or the player leaves the tab.
      if (currentScreen === 'foremen') markForemenSeen();
      foremanFocus = null;
    }
    currentScreen = screen;
    refreshNav();
    // The office, the tech center and recruiting belong to the quarter: its tab stays lit.
    const tab = screen === 'office' || screen === 'tech' || screen === 'recruiting' ? 'hq' : screen;
    document.querySelectorAll('#app-nav [data-screen]').forEach(function (button) {
      button.classList.toggle('on', button.dataset.screen === tab);
    });
    const panel = document.getElementById('meta-panel');
    const panelScreen = isPanel(screen);
    document.body.classList.toggle('city-view', screen === 'hq');
    document.body.classList.toggle('panel-open', panelScreen);
    if (screen !== 'hq') {
      hideCity();
      document.getElementById('city-card').hidden = true;
      UI.layer.set('city-card', null);
    }
    panel.classList.toggle('hidden', !panelScreen);
    if (screen === 'hq') {
      showCity();
      paintCityCard();
    }
    if (panelScreen) {
      if (changed) panel.scrollTop = 0;
      renderMetaScreen();
    }
    UI.layer.set('panel', panelScreen ? onPanelBack : null);
  }

  // Header of each company panel: kicker and title (the × and the wallet are the same for all).
  function panelHead(screen) {
    if (screen === 'foremen') {
      const ids = Object.keys(Meta.CARDS);
      const owned = ids.filter(function (id) { return meta.cards[id].level > 0; }).length;
      return { kicker: 'Ваши карты · ' + owned + ' из ' + ids.length, title: 'Бригадиры' };
    }
    if (screen === 'exchange') return { kicker: 'Штаб · старые заказы', title: 'Биржа' };
    if (screen === 'contract') return { kicker: 'Штаб · заказы на время', title: 'Контракты' };
    if (screen === 'office') return { kicker: 'Штаб · отделы', title: 'Главный офис' };
    if (screen === 'tech') return { kicker: 'Штаб · новые прокачки', title: 'Технологический центр' };
    return { kicker: 'Штаб · бригадиры', title: 'Школа бригадиров' };
  }

  function renderMetaScreen() {
    if (!isPanel(currentScreen)) return;
    const content = document.getElementById('meta-content');
    content.innerHTML = '';
    const side = Meta.site(meta, 'side');
    if (currentScreen === 'exchange' && side && side.status === 'play' && side.runMode === 'exchange') {
      content.insertAdjacentHTML('beforeend',
        '<article class="meta-card panel-wide"><h3>Идёт заказ биржи · ' + UI.escapeHtml(side.name) + '</h3>' +
        '<p>' + percentOf(side.built, side.total) + '% готово. Основная стройка строится без вас.</p>' +
        '<button data-action="continue-order">К заказу</button><button data-action="abandon">Бросить заказ</button></article>'
      );
    }
    if (currentScreen === 'foremen') renderForemen(content);
    if (currentScreen === 'exchange') renderExchange(content);
    if (currentScreen === 'contract') renderContract(content);
    if (currentScreen === 'office') renderOffice(content);
    if (currentScreen === 'tech') renderTech(content);
    if (currentScreen === 'recruiting') renderRecruiting(content);
    const head = panelHead(currentScreen);
    setText('meta-kicker', head.kicker);
    setText('meta-title', head.title);
    paintPanelWallet(!!content.querySelector('img[src*="icon-seals"]'));
    panelKey = panelSignature();
  }

  // Only the currencies this panel spends or pays: capital, seals once the player has some or a
  // price here asks for them, the rare resources the exchange pays out (no rows of zeros).
  function paintPanelWallet(sealsShown) {
    const items = [];
    items.push(['capital', 'Капитал', meta.capital]);
    if (currentScreen === 'recruiting') items.push(['diplomas', 'Дипломы', meta.diplomas]);
    if (currentScreen !== 'recruiting' && (meta.seals > 0 || sealsShown)) items.push(['seals', 'Печати', meta.seals]);
    if (currentScreen === 'exchange') {
      Object.keys(meta.rare).forEach(function (key) {
        if (meta.rare[key] > 0) items.push(['rare-' + key, Meta.RARE_NAMES[key], meta.rare[key]]);
      });
    }
    const wallet = document.getElementById('panel-wallet');
    wallet.hidden = items.length === 0;
    wallet.innerHTML = items.map(function (item) {
      return '<span class="pill" title="' + item[1] + '"><img class="game-icon currency-icon" src="icons/icon-' + (item[0] === 'diplomas' ? 'diplomas.svg' : item[0] + '.jpg?v=2') + '" alt="' + item[1] + '"><b>' + formatCompact(item[2]) + '</b></span>';
    }).join('');
  }

  // What an open panel shows that changes by itself: the wallet, recruits, orders, cooldowns and
  // the minute-rounded waits («новый через 12 мин»).
  function panelSignature() {
    const now = Date.now();
    function minutes(at) {
      return at > now ? Math.ceil((at - now) / 60000) : 0;
    }
    if (currentScreen === 'exchange' && meta.hq.exchange > 0) Meta.fillExchange(meta);
    const recruit = meta.hq.recruiting > 0 ? Meta.refreshRecruiting(meta) : null;
    const side = Meta.site(meta, 'side');
    return [
      currentScreen, officeTab, schoolTab, meta.diplomas, JSON.stringify(meta.school), currentScreen === 'recruiting' ? minutes(Meta.schoolAttempts(meta).resetAt) : '', foremanFocus, meta.capital, meta.seals, JSON.stringify(meta.rare),
      currentScreen === 'foremen' ? JSON.stringify(meta.cards) : '',
      recruit ? recruit.stock + ':' + minutes(recruit.nextAt) : '',
      meta.exchange.orders.length, minutes(meta.exchange.nextOrderAt),
      meta.contract.index, minutes(meta.contract.cooldownUntil), Meta.contractReady(meta) ? 1 : 0,
      side ? side.runMode + ':' + side.status + ':' + side.built : '',
    ].join('|');
  }

  // Panels stay live while open (§9): checked about once a second, re-rendered only when the
  // signature changed, at the same scroll position.
  function refreshPanel(force) {
    if (!isPanel(currentScreen)) return;
    const now = performance.now();
    if (!force && now - panelCheckedAt < 1000) return;
    panelCheckedAt = now;
    if (panelSignature() === panelKey) return;
    rerenderPanel();
  }

  function rerenderPanel() {
    const panel = document.getElementById('meta-panel');
    const scroll = panel.scrollTop;
    renderMetaScreen();
    panel.scrollTop = scroll;
  }

  // Why a capital / seal price cannot be paid: «Не хватает 120 капитала · нужно ещё 2 печати».
  function shortfallText(capital, seals) {
    const parts = [];
    if (meta.capital < capital) parts.push('Не хватает ' + formatCompact(capital - meta.capital) + ' капитала');
    if (meta.seals < seals) {
      const need = seals - meta.seals;
      parts.push((parts.length ? 'нужно' : 'Нужно') + ' ещё ' + need + ' ' + UI.plural(need, 'печать', 'печати', 'печатей'));
    }
    return parts.join(' · ');
  }

  function reasonHtml(text) {
    return text ? '<small class="panel-reason">' + UI.escapeHtml(text) + '</small>' : '';
  }

  function cityState(id) {
    if (meta.hq[id] > 0) return 'live';
    const project = Meta.PROJECTS[id];
    if (!project || !project.live || meta.campaignLevel < project.unlock) return 'locked';
    if (meta.hqSite && meta.hqSite.id === id) return 'building';
    if (meta.plots[id] === 1) return 'ready';
    return 'plot';
  }

  function renderOffice(content) {
    const tabs =['Рабочая сила', 'Экономика', 'Организация'];
    let html = '<div class="office-tabs">';
    tabs.forEach(function (section) {
      html += '<button type="button" data-action="office-tab" data-id="' + section + '"' +
        (officeTab === section ? ' class="on"' : '') + '>' + section + '</button>';
    });
    html += '</div>';
    const rows = Meta.officeChain(officeTab);
    let lockedShown = 0;
    let hiddenCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i];
      const spec = Meta.OFFICE[id];
      const level = meta.office[id];
      if (!Meta.officeUnlocked(meta, id)) {
        // Beacons: the next two closed lines of the tab and the story level that opens them.
        if (lockedShown >= 2) {
          hiddenCount += 1;
          continue;
        }
        lockedShown += 1;
        html += lockedCard(spec.name, 'Откроется с уровня ' + ((spec.level || 0) + 1));
        continue;
      }
      const maxed = level >= spec.max;
      const cost = Meta.officeCost(id, level);
      const seals = Meta.officeSeals(id, level);
      const now = officeValueText(spec, Meta.officeValue(id, level), level);
      const next = maxed ? '' : ' → <b class="value-next">' + officeValueText(spec, Meta.officeValue(id, level + 1), level + 1) + '</b>';
      html += compactUpgradeCard({
        id: id, name: spec.name, icon: officeIcon(id), className: 'office-item', level: level, max: spec.max,
        body: '<p>' + UI.escapeHtml(spec.text) + ': ' + now + next + '</p>',
        action: 'office', capital: cost, seals: seals, status: maxed ? 'Максимум' : '',
      });
    }
    if (hiddenCount > 0) html += '<p class="tech-more panel-wide office-more">Ещё ' + hiddenCount + ' ' + UI.plural(hiddenCount, 'улучшение', 'улучшения', 'улучшений') + '</p>';
    content.insertAdjacentHTML('beforeend', html);
  }

  // One compact card for office upgrades, technologies and the next locked office lines.
  function compactUpgradeCard(spec) {
    const level = spec.level === undefined ? '' : ' <small>' + spec.level + ' / ' + spec.max + '</small>';
    const icon = spec.iconMarkup || '<img class="game-icon" src="icons/' + spec.icon + '" alt="">';
    let html = '<article class="meta-card office-upgrade compact-upgrade ' + spec.className + '">' + icon +
      '<div class="upgrade-copy"><h3>' + UI.escapeHtml(spec.name) + level + '</h3>' + spec.body + '</div>';
    if (spec.status) {
      html += '<div class="upgrade-purchase"><small class="upgrade-status">' + UI.escapeHtml(spec.status) + '</small></div>';
    } else if (spec.action) {
      const capitalShort = meta.capital < spec.capital;
      const sealsShort = meta.seals < spec.seals;
      const diplomasShort = meta.diplomas < (spec.diplomas || 0);
      const label = (spec.action === 'office' ? 'Улучшить' : 'Изучить') + ' «' + spec.name + '»: ' + spec.capital.toLocaleString('ru-RU') + ' капитала' +
        (spec.seals ? ' и ' + spec.seals + ' ' + UI.plural(spec.seals, 'печать', 'печати', 'печатей') : '') +
        (spec.diplomas ? ' и ' + spec.diplomas + ' ' + UI.plural(spec.diplomas, 'диплом', 'диплома', 'дипломов') : '');
      html += '<div class="upgrade-purchase">';
      if (spec.diplomas > 0) html += '<small class="upgrade-price' + (diplomasShort ? ' short' : '') + '"><img class="currency-icon" src="icons/icon-diplomas.svg" alt="дипломы">' + spec.diplomas + '</small>';
      if (spec.seals > 0) html += '<small class="upgrade-price upgrade-seals' + (sealsShort ? ' short' : '') + '"><img class="currency-icon" src="icons/icon-seals.jpg?v=2" alt="печати">' + spec.seals + '</small>';
      html += '<button class="upgrade-price' + (capitalShort ? ' short' : '') + '" data-action="' + spec.action + '" data-id="' + spec.id + '" aria-label="' + UI.escapeHtml(label) + '"' +
        (spec.disabled || capitalShort || sealsShort || diplomasShort ? ' disabled' : '') + '><img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt="">' + spec.capital.toLocaleString('ru-RU') + '</button></div>';
    }
    if (spec.prerequisite) html += '<small class="upgrade-prerequisite">' + UI.escapeHtml(spec.prerequisite) + '</small>';
    return html + '</article>';
  }

  function renderTech(content) {
    let html = '';
    Meta.TECH_ORDER.forEach(function (id) {
      const spec = Meta.TECH[id];
      const owned = meta.tech[id] > 0;
      const missing = Meta.missingTechPrerequisites(meta, id);
      html += compactUpgradeCard({
        id: id, name: spec.name, icon: officeIcon(id), className: 'tech-upgrade' + (owned ? ' tech-owned' : ''),
        body: '<p>' + UI.escapeHtml(spec.text) + '</p>',
        action: 'tech', capital: Meta.techCost(id), seals: Meta.techSeals(id), disabled: !Meta.techUnlocked(meta, id),
        status: owned ? 'Открыто' : '',
        prerequisite: !owned && missing.length ? 'Сначала разблокируйте ' + missing.map(function (before) { return '«' + Meta.TECH[before].name + '»'; }).join(', ') : '',
      });
    });
    content.insertAdjacentHTML('beforeend', html);
  }

  // Capital price with the seal part when there is one.
  function priceHtml(capital, seals) {
    return '<img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt="капитал">' + capital.toLocaleString('ru-RU') +
      (seals > 0 ? ' <img class="currency-icon" src="icons/icon-seals.jpg?v=2" alt="печати">' + seals : '');
  }

  function lockedCard(name, note) {
    return compactUpgradeCard({
      name: name, className: 'office-locked',
      iconMarkup: '<svg class="office-lock" viewBox="0 0 48 48" aria-hidden="true"><rect x="11" y="22" width="26" height="18" rx="4"></rect><path d="M16 22v-7a8 8 0 0 1 16 0v7"></path></svg>',
      body: '<small class="upgrade-lock-note">' + UI.escapeHtml(note) + '</small>',
    });
  }

  // Office values in player units: +2 рабочих, ×1,3, 12%, 2 500 монет.
  function officeValueText(spec, value, level) {
    if (spec.format === 'skip') return Math.round(value).toLocaleString('ru-RU') + ' монет';
    if (spec.format === 'plus') return '+' + value;
    if (spec.format === 'mult') return '×' + value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    if (spec.format === 'percent') return (value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%';
    if (spec.format === 'coins') return Math.round(value).toLocaleString('ru-RU');
    return String(value);
  }

  function officeIcon(id) {
    const names = {
      plan: 'icon-office-planning.jpg',
      crew: 'icon-office-crew.jpg',
      speed: 'icon-office-speed.jpg',
      carry: 'icon-office-carry.jpg',
      routes: 'icon-office-routes.jpg',
      heights: 'icon-office-heights.jpg',
      harness: 'icon-up-carry.jpg',
      capitalChance: 'icon-office-capital-chance.jpg',
      startCoins: 'icon-office-start-coins.jpg',
      income: 'icon-office-income.jpg',
      capitalValue: 'icon-office-capital-value.jpg',
      offline: 'icon-office-offline.jpg',
      foremanSlots: 'icon-office-foreman-slots.jpg',
      machines: 'icon-office-machines.jpg',
      loaders: 'icon-office-machines.jpg',
      // Placeholders until these nodes get their own icons.
      tools: 'icon-up-builders.jpg',
      pickSkill: 'icon-office-speed.jpg',
      rigging: 'icon-up-carry.jpg',
      lifts: 'icon-office-heights.jpg',
      cubeBonus: 'icon-coins.jpg',
      rates: 'icon-office-income.jpg',
      capitalLines: 'icon-capital.jpg',
      bonuses: 'icon-chest-50.jpg',
      aviation: 'icon-office-machines.jpg',
    };
    return names[id] || 'icon-office-speed.jpg';
  }

  // «Бригадиры» (docs/gdd/16-ux-flow.md §4): who works where — crews are locked per site and picked
  // in the briefing — then the collection: cards on sites first, then ones ready to level up, owned,
  // droppable and still locked. A tap opens the card (effect now → next level, upgrade).
  function renderForemen(content) {
    const sites = Meta.cardSites(meta, null);
    if (foremanFocus) {
      content.insertAdjacentHTML('beforeend', foremanDetail(foremanFocus, sites));
      return;
    }
    let html = '';
    const runs = Meta.activeRuns(meta);
    if (runs.length) {
      html += '<article class="meta-card crew-sites"><h3>Сейчас на объектах</h3>';
      runs.forEach(function (run) {
        html += '<div class="crew-site"><p><small>' + siteLabel(run.runMode) + '</small><b>' + UI.escapeHtml(run.name) + '</b></p><div class="crew-faces">' +
          (run.crew.length ? run.crew.map(function (id) {
            return '<button type="button" class="crew-face rarity-' + Meta.CARDS[id].rarity + '" data-action="foreman-open" data-id="' + id + '" aria-label="' + Meta.CARDS[id].name + '">' +
              '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt=""><b class="foreman-level">' + meta.cards[id].level + '</b></button>';
          }).join('') : '<span class="crew-none">Без бригадиров</span>') + '</div></div>';
      });
      html += '<p class="crew-lock-note">' + ICONS.lock + '<span>Состав закреплён до сдачи объекта. Сменить бригадиров можно перед следующим заказом.</span></p></article>';
    }
    html += '<div class="foreman-grid">';
    Object.keys(Meta.CARDS).map(function (id) {
      const card = meta.cards[id];
      let group = 4;
      if (card.level > 0 && sites[id]) group = 0;
      else if (card.level > 0 && foremanCanUpgrade(id)) group = 1;
      else if (card.level > 0) group = 2;
      else if (Meta.cardInPool(meta, id)) group = 3;
      return { id: id, group: group };
    }).sort(function (a, b) {
      return a.group - b.group || RARITY_ORDER[Meta.CARDS[b.id].rarity] - RARITY_ORDER[Meta.CARDS[a.id].rarity] || Meta.CARDS[a.id].unlockWins - Meta.CARDS[b.id].unlockWins;
    }).forEach(function (item) {
      const id = item.id;
      const spec = Meta.CARDS[id];
      const card = meta.cards[id];
      const owned = card.level > 0;
      const classes = ['foreman-tile', 'rarity-' + spec.rarity];
      if (item.group === 0) classes.push('equipped');
      if (owned && foremanCanUpgrade(id)) classes.push('ready');
      if (!owned) classes.push(Meta.cardInPool(meta, id) ? 'missing' : 'locked');
      const need = Meta.cardCopiesRequired(card);
      const maxed = card.level >= Meta.cardMaxLevel(id);
      let footer = '';
      if (owned) {
        footer = maxed ? '<i class="foreman-copies full"><span style="width:100%"></span></i>'
          : '<i class="foreman-copies"><span style="width:' + Math.min(100, card.copies / need * 100) + '%"></span></i>';
      } else {
        footer = '<small>' + (Meta.cardInPool(meta, id) ? 'В сундуках' : 'Побед в испытаниях: ' + spec.unlockWins) + '</small>';
      }
      html += '<button type="button" class="' + classes.join(' ') + '" data-action="foreman-open" data-id="' + id + '">' +
        '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt="">' +
        (owned ? '<b class="foreman-level">' + card.level + '</b>' : '') +
        (owned && meta.cardsSeen[id] !== true ? '<em class="foreman-new">новый</em>' : '') +
        '<strong>' + spec.name + '</strong><span class="foreman-short">' + foremanEffect(id, card.level, true) + '</span>' +
        (owned ? '<small class="foreman-expertise-label">Экспертиза ' + Meta.expertiseLevel(card) + '</small>' : '') + footer + '</button>';
    });
    html += '</div>';
    content.insertAdjacentHTML('beforeend', html);
  }

  // A card's detail: it counts as seen now; the grid's scroll is kept for «← Бригадиры».
  function openForemanDetail(id) {
    const panel = document.getElementById('meta-panel');
    if (!foremanFocus) foremanGridScroll = panel.scrollTop;
    foremanFocus = id;
    if (meta.cards[id].level > 0 && meta.cardsSeen[id] !== true) {
      meta.cardsSeen[id] = true;
      Meta.save(meta);
    }
    renderMetaScreen();
    panel.scrollTop = 0;
  }

  function showForemanGrid() {
    foremanFocus = null;
    renderMetaScreen();
    document.getElementById('meta-panel').scrollTop = foremanGridScroll;
  }

  // Leaving «Бригадиры»: the «новый» marks have been looked at.
  function markForemenSeen() {
    let changed = false;
    Object.keys(Meta.CARDS).forEach(function (id) {
      if (meta.cards[id].level > 0 && meta.cardsSeen[id] !== true) {
        meta.cardsSeen[id] = true;
        changed = true;
      }
    });
    if (changed) Meta.save(meta);
  }

  function foremanCanUpgrade(id) {
    const card = meta.cards[id];
    return card.level > 0 && card.level < Meta.cardMaxLevel(id) && card.copies >= Meta.cardCopiesRequired(card) &&
      meta.capital >= Meta.cardUpgradeCost(card, id) && meta.seals >= Meta.cardSeals(card);
  }

  // Why «Повысить» is off: copies first, then capital, then seals.
  function foremanUpgradeBlock(id) {
    const card = meta.cards[id];
    const copies = Meta.cardCopiesRequired(card) - card.copies;
    if (copies > 0) return 'Нужно ещё ' + copies + ' ' + UI.plural(copies, 'копия', 'копии', 'копий');
    const capital = Meta.cardUpgradeCost(card, id) - meta.capital;
    if (capital > 0) return 'Не хватает ' + formatCompact(capital) + ' капитала';
    const seals = Meta.cardSeals(card) - meta.seals;
    if (seals > 0) return 'Нужно ещё ' + seals + ' ' + UI.plural(seals, 'печать', 'печати', 'печатей');
    return '';
  }

  // Effect text with values: the current one and, if the card can still level up, the next one in
  // green — «Укладка +30% → +40%», «Каждые 94 → 86 кубов — +1 рабочий». Cards not hired yet show
  // their first level. `short` is the compact line of the grid tile; `passive` the card's passive;
  // `plain` — the current value only (the briefing: what this crew does now).
  function foremanEffect(id, level, short, passive, plain) {
    const spec = Meta.CARDS[id];
    const shown = passive ? Meta.expertiseLevel(meta.cards[id]) : Math.max(1, level);
    const maximum = passive ? Meta.FOREMEN.expertise.levels.length : Meta.cardMaxLevel(id);
    const nextLevel = !plain && level > 0 && shown < maximum ? shown + 1 : 0;
    function text(format, at) {
      const now = foremanValueText(format, at(shown));
      const next = nextLevel ? foremanValueText(format, at(nextLevel)) : now;
      return '<b class="value-now">' + now + '</b>' +
        (next !== now ? ' → <b class="value-next">' + next + '</b>' : '');
    }
    if (passive) {
      function passiveValue(l) {
        return spec.passive.startCoinMinutes ? Meta.passiveStartCoins(meta, id, l) : Meta.cardPassive(id, l);
      }
      const format = spec.passive.startCoinMinutes ? 'number' : spec.passive.format;
      if (shown === 0) {
        const first = spec.passive.effect === 'startBuilders' ? expertiseWorkerText(1)
          : spec.passive.line.replace('{p}', foremanValueText(format, passiveValue(1)))
            .replace('{p2}', foremanValueText(spec.passive.format2, Meta.cardPassive(id, 1, true)));
        return '<b class="value-next">' + first + '</b>';
      }
      if (spec.passive.effect === 'startBuilders') {
        return '<b class="value-now">' + expertiseWorkerText(shown) + '</b>' +
          (nextLevel ? ' → <b class="value-next">' + expertiseWorkerText(nextLevel) + '</b>' : '');
      }
      return spec.passive.line.replace('{p}', text(format, passiveValue))
        .replace('{p2}', spec.passive.formula2 ? text(spec.passive.format2, function (l) { return Meta.cardPassive(id, l, true); }) : '');
    }
    const template = short ? spec.short : spec.line;
    return template
      .replace('{v2}', spec.formula2 ? text(spec.format2 || spec.format, function (l) { return Meta.cardValue(id, l, true); }) : '')
      .replace('{v}', text(spec.format, function (l) { return Meta.cardValue(id, l); }));
  }

  function expertiseWorkerText(level) {
    const ranks = Meta.expertiseWorkers(level);
    if (!ranks.length) return 'Нет дополнительных рабочих';
    const senior = ranks.filter(function (rank) { return rank === 1.2; }).length;
    const parts = [];
    if (senior) parts.push(senior + ' ' + UI.plural(senior, 'старший', 'старших', 'старших'));
    if (level % 3) parts.push(level % 3 === 1 ? '1 младший' : '1 средний');
    return '+' + parts.join(' + ') + ' на старте';
  }

  function foremanExpertise(id, plain) {
    const progress = Meta.expertiseProgress(meta.cards[id]);
    const next = progress.level < progress.max;
    const experience = function (value) { return Math.floor(value).toLocaleString('ru-RU'); };
    const card = meta.cards[id];
    return '<section class="foreman-expertise' + (progress.level ? '' : ' dormant') + '">' +
      '<div class="foreman-expertise-head"><strong>Экспертиза <span>' + progress.level + ' / ' + progress.max + '</span></strong>' +
      '<span>' + (next ? experience(progress.current) + ' / ' + experience(progress.required) : 'Максимум') + '</span></div>' +
      '<i class="foreman-expertise-bar"><span style="width:' + (progress.fraction * 100).toFixed(2) + '%"></span></i>' +
      (!Meta.schoolHasUpgrade(meta, 'expertise') ? '<small class="school-lock">Опыт: изучите «Производственная практика» в школе</small>' : '') +
      '<small class="foreman-passive-scope">Для всех строек' + (progress.level ? '' : ' · с ур. 1') + '</small>' +
      '<p class="foreman-passive">' + foremanEffect(id, card.level, false, true, plain) + '</p>' +
      '<details class="foreman-help"><summary aria-label="Как развивать бригадира">i</summary><div>' +
      '<p>Звёзды усиливают способность в бригаде и набор опыта' + (card.level ? ' — сейчас ×' + Meta.cardExperienceMultiplier(card.level) : '') + '.</p>' +
      '<p>Экспертиза растёт за кубы в бригаде, в том числе оффлайн. Пассивка действует на всех стройках.</p>' +
      (id === 'shift' ? '<p>Рабочие: младший 80% → средний 100% → старший 120%.</p>' : '') +
      '<p>Стартовые бонусы — со следующего заказа.</p></div></details></section>';
  }

  function foremanValueText(format, value) {
    const percent = function (number) { return number.toLocaleString('ru-RU', { maximumFractionDigits: 1 }); };
    if (format === 'startCoins') return Meta.startCoinBonus(meta, value).toLocaleString('ru-RU');
    if (format === 'plus%') return '+' + percent((value - 1) * 100) + '%';
    if (format === 'pct') return percent(value * 100) + '%';
    if (format === 'plus%r') return '+' + percent(value * 100) + '%';
    if (format === 'less%') return percent((1 - value) * 100) + '%';
    if (format === 'sec') return Math.round(value) + ' с';
    if (format === 'mult') return '×' + value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    if (format === 'number') return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
    return String(Math.round(value));
  }

  // The card in the «Бригадиры» screen: where it works (crews are not changed here), the upgrade.
  function foremanDetail(id, sites) {
    const spec = Meta.CARDS[id];
    const card = meta.cards[id];
    const owned = card.level > 0;
    const need = Meta.cardCopiesRequired(card);
    const maxed = card.level >= Meta.cardMaxLevel(id);
    const cost = Meta.cardUpgradeCost(card, id);
    const seals = Meta.cardSeals(card);
    const where = owned ? (sites[id] ? 'Работает ' + placesText(sites[id]) : 'Не назначен')
      : (Meta.cardInPool(meta, id) ? 'В сундуках, контрактах и школе' : 'Побед в испытаниях: ' + spec.unlockWins);
    let upgrade = '';
    if (owned && !maxed) {
      const can = foremanCanUpgrade(id);
      upgrade = '<div class="foreman-upgrade"><span class="foreman-copy-count' + (card.copies >= need ? ' ready' : '') + '">Копии ' + card.copies + ' / ' + need + '</span>' +
        '<button type="button" data-action="card-upgrade" data-id="' + id + '"' + (can ? '' : ' disabled') + '>Повысить · ' + priceHtml(cost, seals) + '</button></div>';
      if (!can && card.copies >= need) upgrade += reasonHtml(foremanUpgradeBlock(id));
    }
    return '<button type="button" class="foreman-back" data-action="foreman-back">← Бригадиры</button>' +
      '<article class="meta-card foreman-detail rarity-' + spec.rarity + (owned ? '' : ' missing') + '">' +
      '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt="">' +
      '<b class="rarity-mark">' + Meta.RARITY_NAMES[spec.rarity] + '</b>' +
      '<div class="foreman-heading"><h3>' + spec.name + '</h3>' +
      (owned ? '<span class="foreman-star-level">Ур. ' + card.level + ' / ' + Meta.cardMaxLevel(id) + '</span>' : '') + '</div>' +
      '<div class="foreman-context"><span>' + where + '</span></div>' +
      '<div class="foreman-ability"><p class="foreman-effect">' + foremanEffect(id, card.level) + '</p>' + upgrade + '</div>' +
      foremanExpertise(id) + '</article>';
  }

  // School departments share the existing recruiting building and panel.
  function renderRecruiting(content) {
    const attempts = Meta.schoolAttempts(meta);
    let html = '<div class="office-tabs school-tabs" role="tablist" aria-label="Школа бригадиров">' +
      [['trials', 'Испытания'], ['training', 'Обучение'], ['recruit', 'Найм']].map(function (tab) {
        const on = schoolTab === tab[0];
        return '<button type="button" role="tab" aria-selected="' + on + '"' + (on ? ' class="on"' : '') + ' data-action="school-tab" data-id="' + tab[0] + '">' + tab[1] + '</button>';
      }).join('') + '</div>';
    if (schoolTab === 'trials') {
      // One row of pills: attempts left (with the refill wait once some are used) and what the next win brings.
      const milestone = Meta.schoolMilestoneCards(meta);
      html += '<div class="school-summary"><span>Попытки <b>' + attempts.left + ' / ' + attempts.limit + '</b>' +
        (attempts.left < attempts.limit ? ' · ' + ICONS.clock + formatWait(attempts.resetAt - Date.now()) : '') + '</span>' +
        (milestone.length ? '<span class="next">За победу: ' + milestone.map(function (id) { return UI.escapeHtml(Meta.CARDS[id].name); }).join(', ') + '</span>' : '') +
        '<button type="button" class="info-btn school-info" data-action="school-info" aria-label="Бригадиры за победы">i</button></div>';
      Object.keys(Meta.SCHOOL.bosses).forEach(function (id) {
        const boss = Meta.schoolBoss(meta, id);
        const lock = Meta.schoolBossLock(meta, id);
        const icon = '<img class="game-icon school-icon" src="icons/icon-school-' + id + '.jpg" alt="">';
        if (lock) {
          html += '<article class="meta-card school-trial locked">' + icon + '<div><h3>' + UI.escapeHtml(boss.name) + '</h3><small>' + ICONS.lock + lock + '</small></div></article>';
          return;
        }
        const side = Meta.site(meta, 'side');
        const active = sideBusy() && side.runMode === 'school' && side.runPayload && side.runPayload.bossId === id;
        const disabled = boss.complete || attempts.left <= 0 || sideBusy();
        html += '<article class="meta-card school-trial">' + icon + '<div><h3>' + UI.escapeHtml(boss.name) + '</h3><small>' +
          (boss.complete ? 'Все ступени пройдены' : 'Ступень ' + boss.tier + ' · ' + ICONS.clock + MB.formatClock(boss.limit)) + '</small>' +
          (boss.complete ? '' : '<p class="school-reward"><img src="icons/icon-diplomas.svg" alt="дипломы">+' + boss.diplomas +
            '<img src="icons/icon-chest-25.jpg" alt="Малый сундук" title="Малый сундук"></p>') + '</div>' +
          '<button data-action="' + (active ? 'school-resume' : 'school-trial') + '" data-id="' + id + '"' + (disabled && !active ? ' disabled' : '') + '>' +
          (active ? 'Продолжить' : boss.complete ? 'Пройдено' : sideBusy() ? 'Слот занят' : attempts.left <= 0 ? 'Нет попыток' : 'Начать') + '</button></article>';
      });
    } else if (schoolTab === 'training') {
      Object.keys(Meta.SCHOOL.upgrades).forEach(function (id) {
        const spec = Meta.SCHOOL.upgrades[id];
        const level = Meta.schoolUpgradeLevel(meta, id);
        const price = Meta.schoolUpgradeCost(meta, id);
        const reason = Meta.schoolUpgradeReason(meta, id);
        html += compactUpgradeCard({ id: id, action: price ? 'school-upgrade' : '', name: spec.name,
          iconMarkup: '<img class="game-icon" src="icons/icon-diplomas.svg" alt="">',
          className: 'school-upgrade', level: level, max: spec.max, body: '<p>' + schoolUpgradeText(id, level) + '</p>',
          capital: price ? price.capital : 0, diplomas: price ? price.diplomas : 0, seals: 0,
          status: price ? '' : 'Изучено', disabled: !!reason, prerequisite: price ? reason : '' });
      });
    } else if (!Meta.schoolHasUpgrade(meta, 'recruiting')) {
      html += lockedCard('Найм', 'Откроется программой «Приёмная комиссия» в «Обучении»');
    } else {
      const recruit = Meta.refreshRecruiting(meta);
      const cap = Meta.recruitCapacity(meta);
      html += '<article class="meta-card school-trial"><div><h3>Кандидаты ' + recruit.stock + ' / ' + cap + '</h3><small>' +
        (recruit.stock < cap ? 'Новый через ' + formatWait(recruit.nextAt - Date.now()) : 'Все места заняты') + '</small></div><button data-action="recruit"' + (recruit.stock > 0 ? '' : ' disabled') + '>Нанять</button></article>';
      if (Meta.schoolHasUpgrade(meta, 'profile')) {
        const preferred = meta.school.preferredCard;
        html += '<article class="meta-card school-focus"><h3>Профильный поиск · ×' + (1 + Meta.schoolUpgradeLevel(meta, 'profile')) + '</h3>' +
          '<label><select id="school-focus" aria-label="Профильный бригадир"><option value="">Любой</option>' + Object.keys(Meta.CARDS).filter(function (id) { return Meta.cardInPool(meta, id); }).map(function (id) {
            return '<option value="' + id + '"' + (id === preferred ? ' selected' : '') + '>' + UI.escapeHtml(Meta.CARDS[id].name) + ' · ' + Meta.RARITY_NAMES[Meta.CARDS[id].rarity] + '</option>';
          }).join('') + '</select></label></article>';
        const cost = Meta.targetRecruitCost(meta);
        if (Meta.schoolHasUpgrade(meta, 'targeted')) html += '<article class="meta-card school-trial"><div><h3>Персональное приглашение</h3>' +
          (cost ? '<p class="school-reward"><img src="icons/icon-capital.jpg?v=2" alt="капитал">' + formatCompact(cost.capital) + '<img src="icons/icon-diplomas.svg" alt="дипломы">' + cost.diplomas + '</p>' : '<small>Выберите бригадира в поиске</small>') +
          '</div><button data-action="school-target"' + (!cost || recruit.stock <= 0 || meta.capital < cost.capital || meta.diplomas < cost.diplomas ? ' disabled' : '') + '>Пригласить</button></article>';
      }
    }
    content.insertAdjacentHTML('beforeend', html);
    const focus = content.querySelector('#school-focus');
    if (focus) focus.addEventListener('change', function () { Meta.setRecruitFocus(meta, focus.value); renderMetaScreen(); });
  }

  // «i» on the trials tab: which foreman joins the pool after how many trial wins in total.
  function showSchoolUnlocks() {
    const wins = Meta.schoolTotalWins(meta);
    const ids = Object.keys(Meta.CARDS).sort(function (a, b) { return Meta.CARDS[a].unlockWins - Meta.CARDS[b].unlockWins; });
    const next = ids.find(function (id) { return Meta.CARDS[id].unlockWins > wins; });
    const rows = ids.map(function (id) {
      const spec = Meta.CARDS[id];
      const state = spec.unlockWins <= wins ? 'open' : id === next ? 'next' : '';
      // The frame colour of the portrait tells the rarity.
      return '<tr class="' + state + '"><td>' + spec.unlockWins + '</td><td><span class="school-unlock-name">' +
        '<img class="rarity-' + spec.rarity + '" src="icons/icon-foreman-' + id + '.jpg?v=3" alt="" title="' + Meta.RARITY_NAMES[spec.rarity] + '">' +
        UI.escapeHtml(spec.name) + '</span></td></tr>';
    }).join('');
    UI.overlay.open({
      id: 'school-unlocks',
      type: 'sheet',
      kicker: 'Школа · побед: ' + wins,
      title: 'Бригадиры за победы',
      body: '<table class="school-unlocks"><thead><tr><th>Побед</th><th>Бригадир</th></tr></thead><tbody>' + rows + '</tbody></table>',
    });
  }

  function schoolUpgradeText(id, level) {
    const spec = Meta.SCHOOL.upgrades[id];
    const next = Math.min(spec.max, level + 1);
    function change(before, after) {
      return before + (next > level ? ' → <b class="value-next">' + after + '</b>' : '');
    }
    if (id === 'mentoring') return 'Опыт учеников до ' + change('×' + foremanValueText('number', 1 + level * 0.4), '×' + foremanValueText('number', 1 + next * 0.4));
    if (id === 'practice') return 'Опыт на испытаниях ' + change('+' + level * 10 + '%', '+' + next * 10 + '%');
    if (id === 'recruitStock') return 'Запас кандидатов ' + change(Meta.FOREMEN.recruiting.stock + level, Meta.FOREMEN.recruiting.stock + next);
    if (id === 'recruitSpeed') return 'Кандидат каждые ' + change(UI.formatDuration(Meta.FOREMEN.recruiting.hours * 3600 / (1 + level * 0.15)), UI.formatDuration(Meta.FOREMEN.recruiting.hours * 3600 / (1 + next * 0.15)));
    if (id === 'profile') return 'Вес выбранной карты ' + change('×' + (1 + level), '×' + (1 + next)) + ' внутри редкости';
    return UI.escapeHtml(spec.text);
  }

  // Exchange: the board of old orders (reward and one button each), then its upgrades.
  function renderExchange(content) {
    if (meta.hq.exchange === 0) {
      content.insertAdjacentHTML('beforeend', '<article class="meta-card"><h3>Биржа не построена</h3><p>Её участок — в штабе.</p></article>');
      return;
    }
    Meta.fillExchange(meta);
    const capacity = Meta.exchangeCapacity(meta);
    const orders = meta.exchange.orders.slice().sort(function (a, b) { return a.levelIndex - b.levelIndex; });
    const side = Meta.site(meta, 'side');
    const sideRun = sideBusy();
    let html = '<p class="exchange-status">Заказы ' + orders.length + ' / ' + capacity +
      (orders.length < capacity ? ' · новый через ' + formatWait(meta.exchange.nextOrderAt - Date.now()) : '') + '</p>';
    orders.forEach(function (order) {
      const level = MB.LEVELS[order.levelIndex];
      const reward = Meta.exchangeReward(meta, order.levelIndex);
      const active = sideRun && side.runMode === 'exchange' && side.runPayload && side.runPayload.orderId === order.id;
      let button = '<button data-action="order" data-id="' + order.id + '">Взять</button>';
      if (active) button = '<button data-action="continue-order">Продолжить</button>';
      else if (sideRun) button = '<button disabled>Идёт другой заказ</button>';
      html += '<article class="meta-card exchange-order"><div><h3>' + level.name + '</h3>' +
        '<small>Заказ ' + (order.levelIndex + 1) + ' · ' + cubesText(level.blocks.length) + '</small>' +
        '<p class="exchange-reward"><img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt="капитал">' +
        reward.capital.toLocaleString('ru-RU') + ' <img class="currency-icon" src="icons/icon-rare-' + reward.rare + '.jpg?v=2" alt="' +
        Meta.RARE_NAMES[reward.rare] + '">+' + reward.rareAmount + '</p></div>' + button + '</article>';
    });
    if (orders.length === 0) html += '<article class="meta-card"><p>Заказы разобраны. Новый придёт через ' + formatWait(meta.exchange.nextOrderAt - Date.now()) + '.</p></article>';
    html += '<h3 class="exchange-heading">Улучшения биржи</h3>';
    let lockedShown = false;
    Object.keys(Meta.EXCHANGE_UPGRADES).sort(function (a, b) {
      return Meta.EXCHANGE_UPGRADES[a].from - Meta.EXCHANGE_UPGRADES[b].from;
    }).forEach(function (kind) {
      const spec = Meta.EXCHANGE_UPGRADES[kind];
      if (!Meta.exchangeUnlocked(meta, kind)) {
        if (!lockedShown) {
          const after = Meta.EXCHANGE_UPGRADES[spec.after];
          const level = spec.afterLevel || 1;
          html += lockedCard(spec.name, 'Откроется после «' + after.name + '»' + (level > 1 ? ' ' + level + ' ур.' : ''));
        }
        lockedShown = true;
        return;
      }
      const level = meta.exchange[kind];
      const maxed = level >= spec.max;
      const cost = Meta.exchangeUpgradeCost(meta, kind);
      const seals = Meta.exchangeSeals(kind, level);
      const short = meta.capital < cost || meta.seals < seals;
      const now = exchangeValueText(spec, Meta.exchangeValue(meta, kind, level));
      const next = maxed ? '' : ' → <b class="value-next">' + exchangeValueText(spec, Meta.exchangeValue(meta, kind, level + 1)) + '</b>';
      html += '<article class="meta-card office-upgrade"><div><h3>' + spec.name + ' <small>' + level + ' / ' + spec.max + '</small></h3>' +
        '<p>' + spec.text + ': ' + now + next + '</p>' +
        (maxed ? '<button disabled>Максимум</button>'
          : '<button data-action="exchange-upgrade" data-id="' + kind + '"' + (short ? ' disabled' : '') + '>Улучшить · ' +
            priceHtml(cost, seals) + '</button>' + (short ? reasonHtml(shortfallText(cost, seals)) : '')) +
        '</div></article>';
    });
    content.insertAdjacentHTML('beforeend', html);
  }

  // «43 куба», «1 240 кубов».
  function cubesText(count) {
    return count.toLocaleString('ru-RU') + ' ' + UI.plural(count, 'куб', 'куба', 'кубов');
  }

  function exchangeValueText(spec, value) {
    if (spec.format === 'wait') return formatWait(value * 60000);
    return officeValueText(spec, value);
  }

  // «2 ч», «1 ч 36 мин», «12 мин», «меньше минуты».
  function formatWait(ms) {
    const minutes = Math.ceil(Math.max(0, ms) / 60000);
    if (minutes < 1) return 'меньше минуты';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return rest + ' мин';
    return hours + ' ч' + (rest ? ' ' + rest + ' мин' : '');
  }

  // Contracts: one at a time, in order. Building, time limit and reward come from the calibrated list.
  function renderContract(content) {
    const contract = Meta.currentContract(meta);
    if (!contract) {
      content.insertAdjacentHTML('beforeend', '<article class="meta-card"><h3>Все контракты выполнены</h3></article>');
      return;
    }
    const level = MB.LEVELS[contract.level];
    const ready = Meta.contractReady(meta);
    const cooling = Date.now() < meta.contract.cooldownUntil;
    const side = Meta.site(meta, 'side');
    const active = sideBusy() && side.runMode === 'contract';
    let button = '<button data-action="contract">Начать</button>';
    if (active) button = '<button data-action="continue-order">Продолжить</button>';
    else if (!ready) button = '<button disabled>Откроется после заказа ' + (contract.level + 1) + '</button>';
    else if (cooling) button = '<button disabled>Перезарядка ' + formatWait(meta.contract.cooldownUntil - Date.now()) + '</button>';
    else if (sideBusy()) button = '<button disabled>Идёт заказ биржи</button>';
    content.insertAdjacentHTML('beforeend',
      '<article class="meta-card exchange-order"><div><h3>Контракт ' + (meta.contract.index + 1) + ' · ' + level.name + '</h3>' +
      '<small>Лимит ' + MB.formatClock(contract.limit) + ' · ' + cubesText(level.blocks.length) + '</small>' +
      '<p class="exchange-reward"><img class="currency-icon" src="icons/icon-seals.jpg?v=2" alt="печати">+' + contract.seals +
      ' <img class="currency-icon" src="icons/icon-capital.jpg?v=2" alt="капитал">' + contract.capital.toLocaleString('ru-RU') + '</p></div>' +
      button + '</article>' +
      '<p class="exchange-status">Своя стройка с нуля. Бригадиров выберете перед стартом. Таймер идёт и без вас: не успели — перезарядка 5 мин.</p>'
    );
  }

  // A lot in the HQ: go back to its running site, start a bought plot, or buy the plot (confirmed).
  // Buying and starting the project happen only when the run actually starts (spec.prepare).
  function takeBuild(id) {
    const hqSite = Meta.site(meta, 'hq');
    if (hqSite && hqSite.status === 'play' && hqSite.runPayload && hqSite.runPayload.projectId === id) {
      cityBuilding = null;
      switchSite('hq');
      return;
    }
    const spec = { mode: 'hq', levelIndex: 0, payload: { projectId: id }, reason: 'hq' };
    if (meta.hqSite && meta.hqSite.id === id) {
      requestRun(spec);
      return;
    }
    if (meta.plots[id] === 1) {
      spec.prepare = function () { return Meta.startHqProject(meta, id); };
      requestRun(spec);
      return;
    }
    const project = Meta.PROJECTS[id];
    const parts = [project.capital + ' капитала'];
    if (project.seals) parts.push(project.seals + ' ' + UI.plural(project.seals, 'печать', 'печати', 'печатей'));
    const price = parts.length > 2 ? parts.slice(0, -1).join(', ') + ' и ' + parts[parts.length - 1] : parts.join(' и ');
    UI.overlay.open({
      id: 'confirm-plot',
      kicker: project.name,
      title: 'Купить участок за ' + price + '?',
      body: '<p>Стройка здания начнётся сразу. ' + (liveKey ? 'Текущая стройка продолжит без вас.' : '') + '</p>',
      actions: [
        { label: 'Купить и строить', primary: true, onClick: function () {
          spec.prepare = function () {
            return (meta.plots[id] === 1 || Meta.buyPlot(meta, id)) && Meta.startHqProject(meta, id);
          };
          requestRun(spec);
        } },
        { label: 'Отмена' },
      ],
    });
  }

  function onMetaAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (button.disabled) return;
    if (action === 'school-tab') { schoolTab = id; renderMetaScreen(); return; }
    if (action === 'school-info') { showSchoolUnlocks(); return; }
    if (action === 'school-resume') { switchSite('side'); return; }
    if (action === 'school-trial') {
      const boss = Meta.schoolBoss(meta, id);
      if (!boss || boss.complete || sideBusy() || Meta.schoolAttempts(meta).left <= 0) return;
      const spec = { mode: 'school', levelIndex: 0, reason: 'school', payload: { bossId: id, tier: boss.tier, limit: boss.limit, diplomas: boss.diplomas } };
      spec.prepare = function () { const payload = Meta.startSchoolTrial(meta, id); if (!payload) return false; spec.payload = payload; return true; };
      requestRun(spec);
      return;
    }
    if (action === 'school-upgrade') { Meta.buySchoolUpgrade(meta, id); renderMetaScreen(); syncCity(); return; }
    if (action === 'school-target') { const card = Meta.claimRecruit(meta, true); if (card) showCardReveal(card, 'recruiting'); renderMetaScreen(); return; }
    // Moving inside a panel starts at the top (the grid remembers its place for «← Бригадиры»).
    if (action === 'foreman-open') {
      openForemanDetail(id);
      return;
    }
    if (action === 'foreman-back') {
      showForemanGrid();
      return;
    }
    if (action === 'office-tab') {
      officeTab = id;
      renderMetaScreen();
      document.getElementById('meta-panel').scrollTop = 0;
      return;
    }
    if (action === 'tech' && Meta.buyTech(meta, id)) {
      Meta.applyLive(meta, campaign);
      hudDirty = true;
      paintHud();
      UI.toast({ text: 'Открыто: «' + Meta.TECH[id].name + '»', icon: 'gear', tone: 'good', key: 'tech-open' });
    }
    if (action === 'office' && Meta.buyOffice(meta, id)) {
      Meta.applyLive(meta, campaign);
      paintHud();
      // Crews are locked per run: a new foreman slot shows up in the next briefing.
      if (id === 'foremanSlots' && Meta.activeRuns(meta).length) UI.toast({ text: 'Новый слот бригадира — со следующего заказа', icon: 'foremen', tone: 'good', key: 'crew-slot-new' });
    }
    if (action === 'recruit') {
      const card = Meta.claimRecruit(meta);
      if (card) showCardReveal(card, 'recruiting');
    }
    if (action === 'card-upgrade') {
      // The running crews keep their cards; the new level counts at once where the card works.
      if (Meta.upgradeCard(meta, id) && campaign && campaign.crew) Meta.applyLive(meta, campaign);
    }
    if (action === 'exchange-upgrade') Meta.buyExchangeUpgrade(meta, id);
    if (action === 'abandon') {
      confirmAbandon();
      return;
    }
    if (action === 'order') {
      const order = meta.exchange.orders.find(function (item) { return item.id === id; });
      if (!order || sideBusy()) return;
      cityBuilding = null;
      requestRun({ mode: 'exchange', levelIndex: order.levelIndex, payload: { orderId: order.id }, reason: 'order' });
      return;
    }
    if (action === 'continue-order') {
      cityBuilding = null;
      switchSite('side');
      return;
    }
    if (action === 'contract') {
      if (!Meta.contractReady(meta) || Date.now() < meta.contract.cooldownUntil) return;
      if (sideBusy()) return;
      requestRun({ mode: 'contract', levelIndex: Meta.contractLevelIndex(meta), payload: { contractIndex: meta.contract.index }, reason: 'contract' });
      return;
    }
    // A purchase re-renders in place: the card the player pressed stays under the finger.
    rerenderPanel();
    paintHud();
  }

  // ---------- one launcher for every new run ----------
  // spec: { mode: 'campaign' | 'hq' | 'contract' | 'exchange', levelIndex, payload, reason ('boot',
  // 'next', 'restart', 'jump', 'contract', 'order', 'hq'), prepare () → false cancels the start
  // (side effects such as buying a plot run only after the player confirmed) }.
  // Restores of existing sites never come here: they go through switchSite / enterSites.
  function requestRun(spec) {
    if (spec.mode === 'school' && (!spec.prepare || spec.reason !== 'school')) return;
    if (contractLocked()) return;
    openBriefing(spec, function (crew) { launchRun(spec, crew); });
  }

  // ---------- briefing before every new run (docs/gdd/16-ux-flow.md §4) ----------
  // A full-screen window: what the order is (size, rewards, the contract limit) and who goes. The
  // crew is a draft until «Начать стройку»: Cancel changes nothing (spec.prepare — buying a plot —
  // runs only in launchRun). Any owned card can go: the same card may work on several sites at
  // once, a small label only reminds where it already works. HQ buildings go without foremen.
  // onConfirm(crew): card ids, locked for the run.
  function openBriefing(spec, onConfirm) {
    const key = Meta.siteKey(spec.mode);
    if (spec.reason === 'jump') {
      // Dev level picker: straight in with the prefilled crew.
      onConfirm(prefillCrew(spec.mode));
      return;
    }
    const state = { spec: spec, key: key, elsewhere: Meta.cardSites(meta, key), crew: prefillCrew(spec.mode), body: null, handle: null, hold: 0, held: false, press: null };
    briefing = state;
    // Without a crew to pick it is just the entry to the site: a small bottom sheet over the scene.
    const withCrew = briefingHasCrew(spec);
    UI.overlay.open({
      id: 'briefing',
      type: withCrew ? 'screen' : 'sheet',
      className: withCrew ? 'briefing' : 'briefing briefing-compact',
      kicker: briefingKicker(spec),
      title: Meta.siteName(spec.mode, spec.levelIndex || 0, spec.payload || null),
      // The boot without a site has nothing behind the briefing to go back to.
      closable: spec.reason !== 'boot' && !(campaign && campaign.status === 'title'),
      body: function (body, handle) {
        state.body = body;
        state.handle = handle;
        body.addEventListener('click', function (event) { onBriefingClick(state, event); });
        body.addEventListener('pointerdown', function (event) { onBriefingPress(state, event); });
        body.addEventListener('pointermove', function (event) {
          if (state.press && Math.abs(event.clientX - state.press[0]) + Math.abs(event.clientY - state.press[1]) > 12) stopBriefingPress(state);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
          body.addEventListener(type, function () { stopBriefingPress(state); });
        });
        body.addEventListener('contextmenu', function (event) {
          if (event.target.closest('[data-brief="card"]')) event.preventDefault();
        });
        const away = briefingAwayLine(key);
        const foot = handle.el && handle.el.querySelector('.overlay-actions');
        if (foot && away) foot.insertAdjacentHTML('afterbegin', '<p class="briefing-away">' + ICONS.clock + '<span>' + away + '</span></p>');
        paintBriefing(state);
      },
      actions: [{ id: 'briefing-start', label: 'Начать стройку', primary: true, onClick: function () { confirmBriefing(state, onConfirm); } }],
      onClose: function (reason) {
        if (briefing === state) briefing = null;
        stopBriefingPress(state);
        UI.overlay.close('briefing-card');
        if (reason !== 'action') cancelBriefing();
      },
    });
  }

  function confirmBriefing(state, onConfirm) {
    const crew = briefingHasCrew(state.spec) ? state.crew.slice() : [];
    if (briefingHasCrew(state.spec)) {
      // «Как в прошлый раз» and the next prefill of this mode.
      Meta.saveCrewPreset(meta, state.spec.mode, crew);
      if (!meta.flags.crewCoach) {
        meta.flags.crewCoach = true;
        Meta.save(meta);
      }
    }
    onConfirm(crew);
  }

  // Cancelled with nothing running behind the briefing (a failed contract, no site): the HQ.
  function cancelBriefing() {
    if (currentScreen !== 'build' || (liveKey && campaign && campaign.status !== 'failed')) return;
    cityBuilding = null;
    document.body.classList.add('playing');
    openScreen('hq', { silent: true });
  }

  function ownedCards() {
    return Object.keys(Meta.CARDS).filter(function (id) { return meta.cards[id].level > 0; });
  }

  // The crew block is shown when the player owns a card and the run takes foremen (not HQ buildings).
  function briefingHasCrew(spec) {
    return Meta.modeHasCrew(spec.mode) && ownedCards().length > 0;
  }

  // «на основной стройке и на контракте» for the slots a card works on.
  function placesText(keys) {
    return keys.map(function (key) {
      const snap = Meta.site(meta, key);
      return CREW_PLACES[snap ? snap.runMode : 'campaign'] || CREW_PLACES.campaign;
    }).join(' и ');
  }

  function runLevel(spec) {
    return spec.mode === 'school' ? MB.schoolLevel(spec.payload && spec.payload.bossId, spec.payload && spec.payload.tier) : spec.mode === 'hq' ? MB.HQ_LEVELS[spec.payload && spec.payload.projectId] : MB.LEVELS[spec.levelIndex || 0];
  }

  function briefingKicker(spec) {
    if (spec.mode !== 'contract') return siteKicker(spec.mode, spec.levelIndex || 0);
    const number = spec.payload ? spec.payload.contractIndex + 1 : meta.contract.index + 1;
    return 'Контракт ' + number + ' · лимит ' + MB.formatClock(Meta.contractLimitSeconds(meta));
  }

  // The site on screen keeps building without the player once this run starts.
  function briefingAwayLine(key) {
    if (!liveKey || liveKey === key || !campaign || campaign.status !== 'play') return '';
    return siteLabel(campaign.runMode) + ' продолжит без вас — ' + Math.round(Meta.offlineEfficiency(meta) * 100) + '% скорости';
  }

  // The mode's preset; a mode that never had a crew (the first contract or exchange order) gets the
  // strongest cards instead. HQ buildings: nobody.
  function prefillCrew(mode) {
    if (!Meta.modeHasCrew(mode)) return [];
    const preset = Meta.cleanCrew(meta, Meta.crewOf(meta, mode));
    if (preset.length > 0 || mode === 'campaign') return preset;
    return autoCrew();
  }

  // «Автоподбор»: the strongest owned cards (rarity, then level) in every slot.
  function autoCrew() {
    return ownedCards().sort(function (a, b) {
      return RARITY_ORDER[Meta.CARDS[b].rarity] - RARITY_ORDER[Meta.CARDS[a].rarity] ||
        meta.cards[b].level - meta.cards[a].level || Meta.CARDS[a].unlockWins - Meta.CARDS[b].unlockWins;
    }).slice(0, Meta.foremanSlots(meta));
  }

  function paintBriefing(state) {
    const body = state.body;
    if (!body) return;
    const spec = state.spec;
    const level = runLevel(spec);
    const withCrew = briefingHasCrew(spec);
    let html = '<section class="briefing-order">' + (level ? briefingFacts(spec, level) : '') + briefingRewards(spec) + '</section>';
    if (withCrew) html += briefingCrew(state) + briefingCards(state, ownedCards());
    const scroll = body.scrollTop;
    body.innerHTML = html;
    body.scrollTop = scroll;
    const start = state.handle && state.handle.el ? state.handle.el.querySelector('#briefing-start span') : null;
    if (start) start.textContent = withCrew && state.crew.length === 0 ? 'Начать без бригадиров' : 'Начать стройку';
  }

  function briefingFacts(spec, level) {
    const cubes = level.blocks.length;
    const rows = {};
    level.blocks.forEach(function (block) { rows[block.y] = true; });
    const floors = Object.keys(rows).length;
    let html = '<div class="briefing-facts">' +
      '<span class="briefing-chip">' + ICONS.build + cubes.toLocaleString('ru-RU') + ' ' + UI.plural(cubes, 'куб', 'куба', 'кубов') + '</span>' +
      '<span class="briefing-chip">' + floors + ' ' + UI.plural(floors, 'этаж', 'этажа', 'этажей') + '</span>';
    if (timedMode(spec.mode)) {
      html += '<span class="briefing-chip limit">' + ICONS.clock + 'Лимит ' + MB.formatClock(spec.mode === 'school' ? spec.payload.limit : Meta.contractLimitSeconds(meta)) + '</span>';
    }
    html += '</div>';
    if (spec.mode === 'school') html += '<p class="briefing-note">Попытка спишется после старта. Таймер идёт без пауз, в том числе оффлайн. При поражении опыт сохраняется.</p>';
    if (spec.mode === 'contract') html += '<p class="briefing-note">Таймер идёт и без вас. Уйти с контракта можно, только бросив его.</p>';
    return html;
  }

  // «Награда» block: icons and amounts only (the icons name the currencies); chests are the site's
  // own business and are not promised here.
  function briefingRewards(spec) {
    const items = [];
    const img = function (src) { return '<img src="' + src + '" alt="">'; };
    const add = function (icon, text) {
      items.push('<span class="briefing-reward">' + icon + '<b>' + text + '</b></span>');
    };
    let note = '';
    if (spec.mode === 'campaign') {
      const reward = Meta.storyReward(meta, spec.levelIndex || 0);
      if (reward.capital > 0) add(img('icons/icon-capital.jpg?v=2'), '+' + formatCompact(reward.capital));
      if (reward.done) note = 'Награда за этот объект уже получена.';
    } else if (spec.mode === 'exchange') {
      const reward = Meta.exchangeReward(meta, spec.levelIndex || 0);
      add(img('icons/icon-rare-' + reward.rare + '.jpg?v=2'), '+' + reward.rareAmount);
      if (reward.capital > 0) add(img('icons/icon-capital.jpg?v=2'), '+' + formatCompact(reward.capital));
    } else if (spec.mode === 'contract') {
      const contract = Meta.currentContract(meta);
      if (contract) {
        add(img('icons/icon-seals.jpg?v=2'), '+' + contract.seals);
        if (contract.capital > 0) add(img('icons/icon-capital.jpg?v=2'), '+' + formatCompact(contract.capital));
        if ((meta.contract.index + 1) % Meta.FOREMEN.contractEvery === 0) add(ICONS.foremen, '+1');
      }
    } else if (spec.mode === 'school') {
      add(img('icons/icon-diplomas.svg'), '+' + spec.payload.diplomas);
      add(img('icons/icon-chest-25.jpg'), 'Малый сундук · 1 бригадир');
      Meta.schoolMilestoneCards(meta).forEach(function (id) {
        add(img('icons/icon-foreman-' + id + '.jpg?v=3'), '+1 ' + UI.escapeHtml(Meta.CARDS[id].name));
      });
    } else if (spec.mode === 'hq') {
      const project = Meta.PROJECTS[spec.payload && spec.payload.projectId];
      add(ICONS.hq, 'Новое здание');
      if (project) {
        note = project.text;
        if (project.rewardSeals && !(meta.hq[spec.payload.projectId] > 0)) add(img('icons/icon-seals.jpg?v=2'), '+' + project.rewardSeals);
      }
    }
    if (items.length === 0 && !note) return '';
    return '<div class="briefing-prize"><p class="briefing-prize-label">Награда</p>' +
      (items.length ? '<div class="briefing-rewards">' + items.join('') + '</div>' : '') +
      (note ? '<p class="briefing-note">' + UI.escapeHtml(note) + '</p>' : '') + '</div>';
  }

  function briefingCrew(state) {
    const slots = Meta.foremanSlots(meta);
    const maxSlots = Meta.foremanSlotsMax();
    let html = '<section class="briefing-crew">';
    if (!meta.flags.crewCoach) {
      html += '<p class="briefing-coach">' + ICONS.foremen + '<span>Бригадиры усиливают всю стройку. Выберите состав — после старта его не поменять.</span></p>';
    }
    html += '<h3 class="briefing-label">Бригадиры на этот заказ <b>· ' + state.crew.length + ' / ' + slots + '</b></h3><div class="briefing-slots">';
    for (let i = 0; i < maxSlots; i++) {
      const id = state.crew[i];
      if (i >= slots) {
        html += '<button type="button" class="briefing-slot locked" data-brief="slot-locked" aria-label="Слот закрыт">' + ICONS.lock + '</button>';
      } else if (id) {
        html += '<button type="button" class="briefing-slot filled rarity-' + Meta.CARDS[id].rarity + '" data-brief="slot" data-id="' + id + '" aria-label="Убрать «' + Meta.CARDS[id].name + '»">' +
          (i === 0 && Meta.schoolHasUpgrade(meta, 'mentoring') ? '<small class="mentor-label">Наставник</small>' : '') + '<img src="icons/icon-foreman-' + id + '.jpg?v=3" alt=""><b class="foreman-level">' + meta.cards[id].level + '</b><i class="briefing-x" aria-hidden="true">×</i></button>';
      } else {
        html += '<button type="button" class="briefing-slot empty" data-brief="slot-empty" aria-label="Свободный слот">+</button>';
      }
    }
    html += '</div>';
    if (Meta.schoolHasUpgrade(meta, 'mentoring')) html += '<p class="briefing-hint">Первый слот — Наставник. Повышает опыт бригадиров с меньшей экспертизой; свой опыт не теряет.</p>';
    if (slots < maxSlots) html += '<p class="briefing-hint">' + ICONS.lock + '<span>Ещё слот — «Штат управления» в офисе</span></p>';
    const chips = crewChips(state.spec.mode, state.crew);
    if (chips.length) html += '<div class="briefing-effects">' + chips.map(function (chip) { return '<span class="briefing-effect">' + chip + '</span>'; }).join('') + '</div>';
    html += '<p class="briefing-lock">' + ICONS.lock + '<span>После старта состав не меняется до сдачи объекта</span></p>';
    const preset = Meta.cleanCrew(meta, Meta.crewOf(meta, state.spec.mode));
    html += '<div class="briefing-tools"><button type="button" class="ghost-btn" data-brief="auto">Автоподбор</button>' +
      '<button type="button" class="ghost-btn" data-brief="last"' + (preset.length ? '' : ' disabled') + '>Как в прошлый раз</button></div>';
    return html + '</section>';
  }

  // Owned cards only: in the crew → the rest (rarity, level). A card that already works on another
  // site is not taken from there; the label only reminds where else it works.
  function briefingCards(state, owned) {
    const inCrew = function (id) { return state.crew.indexOf(id) >= 0; };
    const order = owned.slice().sort(function (a, b) {
      if (inCrew(a) !== inCrew(b)) return inCrew(a) ? -1 : 1;
      if (inCrew(a)) return state.crew.indexOf(a) - state.crew.indexOf(b);
      return RARITY_ORDER[Meta.CARDS[b].rarity] - RARITY_ORDER[Meta.CARDS[a].rarity] ||
        meta.cards[b].level - meta.cards[a].level || Meta.CARDS[a].unlockWins - Meta.CARDS[b].unlockWins;
    });
    let html = '<section class="briefing-cards"><h3 class="briefing-label">Ваши бригадиры</h3><div class="foreman-grid briefing-grid">';
    order.forEach(function (id) {
      const spec = Meta.CARDS[id];
      const classes = ['foreman-tile', 'briefing-tile', 'rarity-' + spec.rarity];
      if (inCrew(id)) classes.push('equipped');
      const also = state.elsewhere[id];
      html += '<button type="button" class="' + classes.join(' ') + '" data-brief="card" data-id="' + id + '">' +
        // In the crew: a green frame and a check in the portrait's bottom-right corner (off the face).
        '<span class="briefing-face"><img src="icons/icon-foreman-' + id + '.jpg?v=3" alt="">' +
        (inCrew(id) ? '<i class="briefing-check" aria-label="В бригаде">' + ICONS.check + '</i>' : '') + '</span>' +
        '<b class="foreman-level">' + meta.cards[id].level + '</b>' +
        '<span class="briefing-i" data-brief="info" data-id="' + id + '" role="button" aria-label="Подробнее">i</span>' +
        '<strong>' + spec.name + '</strong><span class="foreman-short">' + foremanEffect(id, meta.cards[id].level, true, false, true) + '</span>' +
        (also ? '<small class="briefing-also">Ещё ' + placesText(also) + '</small>' : '') + '</button>';
    });
    return html + '</div></section>';
  }

  // Total effect of a crew: summed numbers first, then the cards whose effect is a trigger.
  function crewChips(mode, crew) {
    const bonus = Meta.equippedBonuses(meta, mode, crew);
    const chips = [];
    const up = function (value, label) {
      const pct = Math.round((value - 1) * 100);
      if (pct > 0) chips.push(label + ' +' + pct + '%');
    };
    up(bonus.placeSpeed, 'Укладка');
    up(bonus.carryScale, 'Ноша');
    up(bonus.movement, 'Ходьба');
    up(bonus.climb, 'Подъём');
    up(bonus.pickupSpeed, 'Набор');
    up(bonus.scaffold, 'Леса');
    up(bonus.coinMultiplier, 'Доход');
    up(bonus.hunger, 'Сытость');
    up(bonus.smoke, 'Реже перекуры');
    up(bonus.smokeShort, 'Перекуры короче');
    if (bonus.heightPenalty < 1) chips.push('Штраф высоты −' + Math.round((1 - bonus.heightPenalty) * 100) + '%');
    if (bonus.nightRelief > 0) chips.push('Ночной штраф −' + Math.round(bonus.nightRelief * 100) + '%');
    const builders = Math.round(bonus.startBuilders);
    if (builders > 0) chips.push(expertiseWorkerText(Meta.expertiseLevel(meta.cards.shift)));
    if (bonus.skipMinutes > 0) chips.push('+' + Meta.startCoinBonus(meta, bonus.skipMinutes).toLocaleString('ru-RU') + ' монет на старте');
    if (bonus.startCoinGrant > 0) chips.push('+' + bonus.startCoinGrant.toLocaleString('ru-RU') + ' монет от коллекции на старте');
    if (bonus.plan > 0) chips.push('План +' + Math.round(bonus.plan));
    if (bonus.capitalChance > 0) chips.push('Шанс находки +' + Math.round(bonus.capitalChance * 100) + '%');
    Object.keys(bonus.triggers).forEach(function (effect) {
      const id = bonus.triggers[effect].card;
      if (!Meta.CARDS[id]) return;
      const main = Meta.CARDS[id].effect === effect;
      chips.push(foremanEffect(id, meta.cards[id].level, main, !main, true));
    });
    return chips;
  }

  function onBriefingClick(state, event) {
    const el = event.target.closest('[data-brief]');
    if (state.held) {
      // The long press already opened the card.
      state.held = false;
      return;
    }
    if (!el || el.disabled) return;
    const id = el.dataset.id;
    const action = el.dataset.brief;
    if (action === 'info') openBriefingCard(state, id);
    else if (action === 'card') tapBriefingCard(state, id);
    else if (action === 'slot') removeFromCrew(state, id);
    else if (action === 'slot-empty') {
      const grid = state.body.querySelector('.briefing-cards');
      if (grid && grid.scrollIntoView) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'slot-locked') {
      UI.toast({ text: 'Ещё слот — «Штат управления» в офисе', icon: 'lock', key: 'crew-slot' });
    } else if (action === 'auto') {
      const next = autoCrew();
      if (next.join(',') === state.crew.join(',')) {
        UI.toast({ text: 'Сильнейший состав уже выбран', icon: 'foremen', key: 'crew-auto' });
        return;
      }
      state.crew = next;
      paintBriefing(state);
    } else if (action === 'last') {
      state.crew = Meta.cleanCrew(meta, Meta.crewOf(meta, state.spec.mode));
      paintBriefing(state);
    }
  }

  // Long press on a card opens its details (like the «i» corner).
  function onBriefingPress(state, event) {
    stopBriefingPress(state);
    state.held = false;
    const tile = event.target.closest('[data-brief="card"]');
    if (!tile || (event.button !== undefined && event.button !== 0)) return;
    state.press = [event.clientX, event.clientY];
    state.hold = setTimeout(function () {
      state.hold = 0;
      state.press = null;
      state.held = true;
      openBriefingCard(state, tile.dataset.id);
    }, 450);
  }

  function stopBriefingPress(state) {
    if (state.hold) clearTimeout(state.hold);
    state.hold = 0;
    state.press = null;
  }

  function tapBriefingCard(state, id) {
    if (state.crew.indexOf(id) >= 0) {
      removeFromCrew(state, id);
      return;
    }
    if (state.crew.length >= Meta.foremanSlots(meta)) {
      crewFull(state);
      return;
    }
    state.crew.push(id);
    paintBriefing(state);
  }

  function removeFromCrew(state, id) {
    state.crew = state.crew.filter(function (cardId) { return cardId !== id; });
    paintBriefing(state);
  }

  function crewFull(state) {
    const row = state.body ? state.body.querySelector('.briefing-slots') : null;
    if (row) {
      row.classList.remove('shake');
      void row.offsetWidth;
      row.classList.add('shake');
    }
    UI.toast({ text: 'Все места заняты — уберите кого-нибудь', icon: 'foremen', tone: 'warn', key: 'crew-full' });
  }

  function openBriefingCard(state, id) {
    const spec = Meta.CARDS[id];
    const card = meta.cards[id];
    const inCrew = state.crew.indexOf(id) >= 0;
    const also = state.elsewhere[id];
    const status = (inCrew ? 'В бригаде' : 'Не выбран') + (also ? ' · ещё ' + placesText(also) : '');
    const action = inCrew
      ? { label: 'Убрать из бригады', primary: true, onClick: function () { removeFromCrew(state, id); } }
      : { label: 'В бригаду', primary: true, onClick: function () { tapBriefingCard(state, id); } };
    UI.overlay.open({
      id: 'briefing-card',
      type: 'sheet',
      className: 'briefing-card-sheet',
      kicker: Meta.RARITY_NAMES[spec.rarity] + ' · уровень ' + card.level,
      title: spec.name,
      body: '<div class="briefing-card rarity-' + spec.rarity + '"><img src="icons/icon-foreman-' + id + '.jpg?v=3" alt="">' +
        '<p class="foreman-effect">' + foremanEffect(id, card.level, false, false, true) + '</p>' +
        foremanExpertise(id, true) +
        '<p class="briefing-card-status">' + status + '</p></div>',
      actions: [action, { label: 'Закрыть' }],
    });
  }

  // Start `spec` on its slot and put it on screen; the site that was on screen goes on without the
  // player. `crew` (card ids from the briefing, locked until the run ends; null — the mode's preset).
  function launchRun(spec, crew) {
    if (spec.prepare && spec.prepare() === false) {
      UI.toast({ text: 'Не получилось начать: не хватает ресурсов', icon: 'hq', tone: 'bad' });
      syncCity();
      if (currentScreen === 'hq') paintCityCard();
      return false;
    }
    const key = Meta.siteKey(spec.mode);
    UI.overlay.close('title');
    const chosen = Array.isArray(crew) ? crew : null;
    if (liveKey && liveKey !== key && world && campaign) {
      if (campaign.status === 'play') {
        const prev = Meta.site(meta, liveKey);
        saveLive({ awaySince: prev && prev.awaySince ? prev.awaySince : Date.now() });
      } else if (campaign.status === 'complete' && liveKey !== 'campaign') {
        Meta.clearSite(meta, liveKey);
      }
    }
    const freePurchases = document.getElementById('free-purchases').checked;
    disposeLevel();
    campaign = MB.createCampaign();
    Meta.configureNewCampaign(meta, campaign, spec.mode, spec.levelIndex || 0, spec.payload || null, chosen);
    campaign.freePurchases = freePurchases;
    world = MB.startLevel(campaign);
    liveKey = key;
    Meta.saveSite(meta, key, campaign, world, { status: 'play', awaySince: null, awayBank: 0, reward: null });
    Meta.setActiveSite(meta, key);
    timeScale = 1;
    paintTempo();
    cityBuilding = null;
    document.body.classList.add('playing');
    openScreen('build', { silent: true });
    buildLevelView();
    introSiteCamera();
    showBanner();
    paintHud();
    syncCity();
    return true;
  }

  // ---------- presence: away and return ----------
  function siteLabel(runMode) {
    if (runMode === 'hq') return 'Стройка штаба';
    if (runMode === 'school') return 'Испытание школы';
    if (runMode === 'contract') return 'Контракт';
    if (runMode === 'exchange') return 'Заказ биржи';
    return 'Основная стройка';
  }

  function siteKicker(runMode, levelIndex, contractNumber) {
    if (runMode === 'hq') return 'Стройка штаба';
    if (runMode === 'exchange') return 'Заказ биржи';
    if (runMode === 'school') return 'Школа бригадиров';
    if (runMode === 'contract') return 'Контракт ' + (contractNumber || meta.contract.index + 1);
    return 'Заказ ' + (levelIndex + 1);
  }

  function percentOf(done, total) {
    return total > 0 ? Math.floor(done / total * 100) : 0;
  }

  function sideBusy() {
    const side = Meta.site(meta, 'side');
    return !!side && side.status === 'play';
  }

  // The speed row in the day clock's popover and the «×5» / «⏸» tag on the clock itself.
  function paintTempo() {
    document.querySelectorAll('.tempo button[data-tempo]').forEach(function (button) {
      button.classList.toggle('on', Number(button.dataset.tempo) === timeScale);
    });
    const tag = document.getElementById('day-tempo');
    tag.hidden = timeScale === 1;
    tag.classList.toggle('paused', timeScale === 0);
    tag.innerHTML = timeScale === 0 ? ICONS.pause : '×' + timeScale;
  }

  function simSummary(level) {
    let summary = simSummaries.get(level);
    if (!summary) {
      summary = MicroBuildersSim.summarizeLevel(level);
      simSummaries.set(level, summary);
    }
    return summary;
  }

  // Rebuild a site from its snapshot without a view (MB.startLevel only). A finished site comes back
  // finished, so it can never complete (and pay) a second time.
  function restoreSiteWorld(snap) {
    const c = MB.createCampaign();
    Meta.restoreCampaign(meta, c, snap);
    c.freePurchases = document.getElementById('free-purchases').checked;
    const w = MB.startLevel(c);
    Meta.applySiteRuntime(c, w, snap);
    const paid = c.runMode === 'campaign' && meta.completed.indexOf(c.levelIndex) >= 0;
    if (snap.status === 'complete' || (w.remaining === 0 && paid)) {
      c.status = 'complete';
      w.completed = true;
    }
    w.events.length = 0;
    return { campaign: c, world: w };
  }

  // Swap the world on screen for a restored one (the view is rebuilt from scratch).
  function adoptSite(key, restored) {
    const same = liveKey === key && !!world;
    const view = same && cameraController.getView ? cameraController.getView() : null;
    // The snapshot does not keep the dev time ledger: it stays with the site across the rebuild.
    if (same) restored.world.timeLedger = world.timeLedger;
    disposeLevel();
    campaign = restored.campaign;
    world = restored.world;
    liveKey = key;
    buildLevelView();
    // The same site rebuilt by a catch-up keeps the view; another site gets the view the player left
    // there, or flies in. In the HQ the city camera stays (hideCity restores the site view later).
    if (cityRoot.visible) return;
    if (view) cameraController.setView(view);
    else if (!restoreSiteCamera()) introSiteCamera();
  }

  // What a site does without the player: the session simulator's mass rate × «Удалённый контроль»
  // for the absence (at most offlineCapHours), placed as whole cubes in build order. A contract's
  // clock runs on real time, so it only builds within the time it had left.
  function catchUpWorld(key, c, w, seconds) {
    const capSeconds = Meta.offlineCapSeconds();
    const efficiency = Meta.offlineEfficiency(meta);
    const contract = timedMode(c.runMode);
    const limit = contract ? trialLimit(c) : 0;
    let work = Math.min(seconds, capSeconds);
    if (contract) work = Math.min(work, Math.max(0, limit - c.levelElapsed));
    const total = w.blocks.length;
    const before = total - w.remaining;
    const coinsBefore = c.coins;
    let built = [];
    let worked = 0;
    if (work > 0 && w.remaining > 0 && c.status === 'play') {
      const estimate = MicroBuildersSim.estimate(simSummary(w.level), c);
      const rate = estimate.massPerMinute / 60 * efficiency;
      built = MB.applyOfflineMass(w, rate * work);
      worked = work;
      if (w.completed && rate > 0) {
        // Finished early: only the time the last cubes needed counts toward the order's time.
        let mass = 0;
        for (let i = 0; i < built.length; i++) mass += MB.MATERIAL[built[i].materialId].weight;
        worked = Math.min(work, mass / rate);
      }
    }
    // Capital: the cubes' own pay plus the office find rolls. The 'autofill' event carries the same
    // capital, so the events are dropped here (consumeEvents would count it a second time).
    let capital = 0;
    for (let i = 0; i < built.length; i++) capital += built[i].capitalPay || 0;
    meta.capital += capital;
    capital += Meta.onBlocksPlaced(meta, c, w, built, { offline: true }).capital;
    w.events.length = 0;
    const after = total - w.remaining;
    let elapsed = 0;
    if (contract) {
      elapsed = w.completed ? worked : seconds;
      c.levelElapsed += elapsed;
      c.totalElapsed += elapsed;
    } else if (built.length > 0) {
      c.awayElapsed = (c.awayElapsed || 0) + worked;
    }
    const chests = [];
    if (c.runMode === 'campaign' && Meta.chestsOpen(c.levelIndex) && !w.completed) {
      [25, 50].forEach(function (threshold) {
        if (before * 100 < total * threshold && after * 100 >= total * threshold) chests.push(threshold);
      });
    }
    return {
      key: key,
      runMode: c.runMode,
      name: Meta.siteName(c.runMode, c.levelIndex, c.runPayload),
      seconds: seconds,
      capped: !contract && seconds > capSeconds,
      before: before,
      after: after,
      total: total,
      blocks: built.length,
      coins: Math.max(0, c.coins - coinsBefore),
      capital: capital,
      elapsed: elapsed,
      completed: !!w.completed,
      failed: contract && !w.completed && c.levelElapsed >= limit,
      timeLeft: contract ? Math.max(0, limit - c.levelElapsed) : 0,
      chests: chests,
    };
  }

  // Bring every running site up to now and show the active one. opts:
  //   seconds  — length of the absence (the return window title), company — Meta.claimAway result;
  //   stay     — keep the current screen (the page came back while the player was in the HQ);
  //   toHq / building — land in the HQ (the active site stays «без игрока»).
  // Short gaps are never lost: a site off screen keeps its away mark until a catch-up actually builds
  // something, and the site on screen banks its short absences (awayBank) until they add up.
  function enterSites(opts) {
    const options = opts || {};
    const now = Date.now();
    const activeKey = Meta.activeSite(meta);
    const report = { seconds: options.seconds || 0, sites: [], company: options.company || null, completions: [], failed: null };
    let activeCatchUp = null;
    let activeBank = 0;
    SITE_KEYS.forEach(function (slot) {
      const snap = Meta.site(meta, slot);
      if (!snap || snap.status !== 'play') return;
      const active = slot === activeKey;
      const contract = timedMode(snap.runMode);
      const away = snap.awaySince ? Math.max(0, (now - snap.awaySince) / 1000) : (slot === liveKey && world ? 0 : Math.max(0, (now - snap.savedAt) / 1000));
      const seconds = (contract ? 0 : snap.awayBank || 0) + away;
      // Rebuilding the site on screen restarts its workers: only a real absence is worth it there.
      const onScreen = slot === liveKey && !!world && campaign.status === 'play';
      const threshold = snap.runMode === 'school' ? 0 : !active ? INACTIVE_CATCH_UP_SECONDS : (onScreen && !contract ? ACTIVE_CATCH_UP_SECONDS : 1);
      if (active) activeBank = contract ? 0 : Math.min(seconds, Meta.offlineCapSeconds());
      if (seconds < threshold) return;
      const restored = restoreSiteWorld(snap);
      const result = catchUpWorld(slot, restored.campaign, restored.world, seconds);
      if (active) activeCatchUp = { restored: restored, result: result };
      if (result.completed) {
        report.completions.push(settleCompletion(slot, restored.campaign, restored.world, true));
      } else if (!result.failed && (result.blocks > 0 || result.elapsed > 0)) {
        Meta.saveSite(meta, slot, restored.campaign, restored.world, { awaySince: now, awayBank: 0 });
      }
      if (active && result.blocks > 0) activeBank = 0;
      if (result.blocks > 0 || result.completed || result.failed) report.sites.push(result);
      if (result.failed) report.failed = result;
    });
    let toHq = !!options.toHq;
    if (report.failed) {
      // Time ran out while the player was away: the contract is gone, the player lands in the HQ.
      if (report.failed.runMode === 'school') Meta.failSchoolTrial(meta);
      else Meta.failContract(meta);
      if (liveKey === 'side') liveKey = null;
      toHq = true;
    }
    const key = Meta.activeSite(meta);
    const snap = Meta.site(meta, key);
    if (!snap) {
      // Nothing left to show (no main order yet): the next story order.
      requestRun({ mode: 'campaign', levelIndex: meta.campaignLevel, reason: 'next' });
    } else if (activeCatchUp && activeCatchUp.result.key === key &&
        (activeCatchUp.result.blocks > 0 || activeCatchUp.result.completed || liveKey !== key || !world)) {
      adoptSite(key, activeCatchUp.restored);
    } else if (liveKey !== key || !world) {
      adoptSite(key, restoreSiteWorld(snap));
    } else if (activeCatchUp && activeCatchUp.result.elapsed > 0) {
      // Nothing was built, but the contract clock ran on.
      campaign.levelElapsed = activeCatchUp.restored.campaign.levelElapsed;
      campaign.totalElapsed = activeCatchUp.restored.campaign.totalElapsed;
    }
    // A different site may have trained a collection passive after this site's restore.
    if (campaign && campaign.crew) Meta.applyLive(meta, campaign);
    document.body.classList.add('playing');
    // Back on the site: the absence is over; what it did not turn into cubes yet stays in the bank.
    if (snap && !toHq && !options.stay && campaign.status === 'play') saveLive({ awaySince: null, awayBank: key === activeKey ? activeBank : 0 });
    if (toHq) {
      cityBuilding = options.building || null;
      openScreen('hq', { silent: true });
    } else if (!options.stay) {
      openScreen('build', { silent: true });
    } else {
      paintSiteChip();
    }
    paintHud();
    showReturnReport(report);
    if (report.failed) openContractFailed(true, report.failed.runMode);
    report.completions.forEach(function (reward) { openCompleteDialog(reward, { queue: true }); });
    return report;
  }

  // Put another existing site on screen (no briefing). The site that was on screen goes on without
  // the player; the target and the others catch up first. opts: toHq / building — land in the HQ.
  function switchSite(key, opts) {
    const options = opts || {};
    const snap = Meta.site(meta, key);
    if (!snap) {
      requestRun({ mode: 'campaign', levelIndex: meta.campaignLevel, reason: 'next' });
      return;
    }
    if (key === liveKey && world) {
      if (options.toHq) {
        cityBuilding = options.building || null;
        openScreen('hq');
      } else {
        openScreen('build');
      }
      return;
    }
    if (contractLocked()) return;
    if (liveKey && world && campaign.status === 'play') {
      const prev = Meta.site(meta, liveKey);
      saveLive({ awaySince: prev && prev.awaySince ? prev.awaySince : Date.now() });
    }
    liveKey = null;
    timeScale = 1;
    paintTempo();
    Meta.setActiveSite(meta, key);
    const seconds = snap.status === 'play' ? Math.max(0, (Date.now() - (snap.awaySince || snap.savedAt)) / 1000) : 0;
    enterSites({ seconds: seconds, company: Meta.claimAway(meta, snap.awaySince || Date.now(), false), toHq: options.toHq, building: options.building });
  }

  // The player turned to another screen: the live site goes on «без игрока» from now on.
  function leaveSite() {
    if (timeScale !== 1) {
      timeScale = 1;
      paintTempo();
    }
    if (!liveKey || !world || campaign.status !== 'play') return;
    saveLive({ awaySince: Date.now() });
    const efficiency = Math.round(Meta.offlineEfficiency(meta) * 100);
    if (!meta.flags.awayExplained) {
      meta.flags.awayExplained = true;
      Meta.save(meta);
      const hours = Math.round(Meta.offlineCapSeconds() / 3600);
      UI.overlay.open({
        id: 'away-explained',
        kicker: 'Без вас',
        title: 'Стройка не останавливается',
        body: '<p>Когда вы не смотрите на стройку, бригада работает сама — медленнее: ' + efficiency +
          '% скорости. Прокачайте «Удалённый контроль» в офисе, чтобы без вас строилось быстрее. Максимум — ' +
          hours + ' ' + UI.plural(hours, 'час', 'часа', 'часов') + ' за отлучку.</p>',
        actions: [{ label: 'Понятно', primary: true }],
      });
      return;
    }
    UI.toast({
      title: '«' + Meta.siteName(campaign.runMode, campaign.levelIndex, campaign.runPayload) + '» строится без вас',
      text: '· ' + efficiency + '% скорости',
      icon: 'clock',
      key: 'away-leave',
    });
  }

  // Back on the build screen from the HQ or a panel.
  function returnToSite() {
    const key = Meta.activeSite(meta);
    const snap = Meta.site(meta, key);
    if (!snap || !world || campaign.status === 'title') return;
    const since = snap.status === 'play' && snap.awaySince ? snap.awaySince : 0;
    const company = Meta.claimAway(meta, since || Date.now(), false);
    enterSites({ seconds: since ? (Date.now() - since) / 1000 : 0, company: company });
  }

  // The page goes to the background or away (tab switch, app switch, close): the absence starts now.
  function markAbsent() {
    if (!meta) return;
    if (!hiddenAt) hiddenAt = Date.now();
    if (!meta.hiddenAt) meta.hiddenAt = hiddenAt;
    if (currentScreen === 'build' && liveKey && world && campaign.status === 'play') {
      const snap = Meta.site(meta, liveKey);
      saveLive({ awaySince: snap && snap.awaySince ? snap.awaySince : hiddenAt });
    } else {
      Meta.save(meta);
    }
  }

  // The page is back. After a real absence (30+ s) everything catches up like a cold start; a
  // contract's clock always catches up, it runs on real time.
  function onPageVisible() {
    if (!meta || !hiddenAt) return;
    const since = meta.hiddenAt || hiddenAt;
    const seconds = Math.max(0, (Date.now() - since) / 1000);
    hiddenAt = 0;
    if (!liveKey || !campaign || campaign.status === 'title') {
      meta.hiddenAt = null;
      Meta.save(meta);
      return;
    }
    const company = Meta.claimAway(meta, since, true);
    if (seconds < RESUME_CATCH_UP_SECONDS && !contractRunning()) {
      // A short background trip: the site stays as it is, the time goes to its bank.
      if (currentScreen === 'build' && campaign.status === 'play') bankLiveAbsence();
      return;
    }
    enterSites({ seconds: seconds, company: company, stay: currentScreen !== 'build' });
  }

  // The site on screen is looked at again without a catch-up: its absence goes to the bank.
  function bankLiveAbsence() {
    const snap = Meta.site(meta, liveKey);
    if (!snap) return;
    const away = snap.awaySince ? Math.max(0, (Date.now() - snap.awaySince) / 1000) : 0;
    saveLive({ awaySince: null, awayBank: Math.min((snap.awayBank || 0) + away, Meta.offlineCapSeconds()) });
  }

  // Dev: pretend the page spent `seconds` in the background, then bring it back.
  function simulateAway(seconds) {
    markAbsent();
    const shift = seconds * 1000;
    hiddenAt -= shift;
    meta.hiddenAt = hiddenAt;
    SITE_KEYS.forEach(function (key) {
      const snap = Meta.site(meta, key);
      if (!snap) return;
      if (snap.awaySince) snap.awaySince -= shift;
      snap.savedAt -= shift;
    });
    Meta.save(meta);
    onPageVisible();
  }

  // ---------- return window ----------
  function returnRow(icon, html, extraClass) {
    return '<li' + (extraClass ? ' class="' + extraClass + '"' : '') + '>' + icon + '<span>' + html + '</span></li>';
  }

  function countUp(value, suffix, compact) {
    return '<span data-count="' + value + '"' + (compact ? ' data-compact="1"' : '') + ' data-suffix="' + UI.escapeHtml(suffix) + '">+0' + UI.escapeHtml(suffix) + '</span>';
  }

  function returnSiteCard(result) {
    const from = percentOf(result.before, result.total);
    const to = result.completed ? 100 : percentOf(result.after, result.total);
    const rows = [];
    // A failed contract's cubes and coins are gone with it; only capital finds stay with the company.
    if (result.blocks > 0 && !result.failed) rows.push(returnRow(ICONS.build, countUp(result.blocks, ' ' + UI.plural(result.blocks, 'куб', 'куба', 'кубов'))));
    if (result.coins > 0 && !result.failed) rows.push(returnRow('<img src="icons/icon-coins.jpg?v=2" alt="">', countUp(Math.round(result.coins), ' монет', true)));
    if (result.capital > 0) rows.push(returnRow('<img src="icons/icon-capital.jpg?v=2" alt="">', countUp(result.capital, ' капитала', true)));
    result.chests.forEach(function (threshold) {
      rows.push(returnRow('<img src="icons/icon-chest-' + threshold + '.jpg" alt="">', 'Сундук ' + threshold + '% готов'));
    });
    if (result.completed) rows.push(returnRow(ICONS.hq, 'Объект достроен — награда ждёт', 'note'));
    else if (result.failed) rows.push(returnRow(ICONS.clock, result.runMode === 'school' ? 'Время вышло — испытание проиграно' : 'Время вышло — контракт провален', 'bad'));
    else if (timedMode(result.runMode)) rows.push(returnRow(ICONS.clock, 'Осталось ' + MB.formatClock(result.timeLeft)));
    return '<article class="return-site"><p class="kicker">' + siteLabel(result.runMode) + '</p><h3>' + UI.escapeHtml(result.name) + '</h3>' +
      '<div class="return-bar"><i class="gain" style="width:' + from + '%" data-to="' + to + '"></i><i class="was" style="width:' + from + '%"></i></div>' +
      '<div class="return-pct"><span>' + from + '% → <b>' + to + '%</b></span></div>' +
      '<ul class="return-rows">' + rows.join('') + '</ul></article>';
  }

  function companyRows(company) {
    if (!company) return [];
    const rows = [];
    if (company.recruitsNew > 0) rows.push(returnRow(ICONS.foremen, 'Кандидаты в школе: ' + company.recruits));
    if (company.ordersNew > 0) {
      rows.push(returnRow(ICONS.exchange, 'Биржа: +' + company.ordersNew + ' ' + UI.plural(company.ordersNew, 'заказ', 'заказа', 'заказов')));
    }
    if (company.contractReady) rows.push(returnRow(ICONS.contract, 'Контракт снова доступен'));
    return rows;
  }

  // «С возвращением!» (docs/gdd/16-ux-flow.md §3) after a minute or more away, or when a site
  // finished or failed; a shorter absence that built something gets a toast.
  function showReturnReport(report) {
    const rows = companyRows(report.company);
    const blocks = report.sites.reduce(function (sum, item) { return sum + item.blocks; }, 0);
    const big = report.seconds >= RETURN_DIALOG_SECONDS || report.completions.length > 0 || !!report.failed;
    if (big && (report.sites.length > 0 || rows.length > 0)) {
      openReturnDialog(report, rows);
      return;
    }
    if (blocks > 0) {
      UI.toast({ title: 'Без вас:', text: '+' + blocks + ' ' + UI.plural(blocks, 'куб', 'куба', 'кубов'), icon: 'build', tone: 'good', key: 'away-gain' });
    }
  }

  function openReturnDialog(report, rows) {
    const efficiency = Math.round(Meta.offlineEfficiency(meta) * 100);
    const hours = Math.round(Meta.offlineCapSeconds() / 3600);
    const capped = report.sites.some(function (item) { return item.capped; });
    const body = (report.sites.length ? '<div class="return-sites">' + report.sites.map(returnSiteCard).join('') + '</div>' : '') +
      (rows.length ? '<section class="return-company"><h4>Компания</h4><ul class="return-rows">' + rows.join('') + '</ul></section>' : '') +
      '<p class="return-note' + (capped ? ' capped' : '') + '">' + (capped
        ? 'Лимит ' + hours + ' ч исчерпан — прокачайте «Удалённый контроль»'
        : 'Без вас бригада работает на ' + efficiency + '% скорости. Лимит — ' + hours + ' ч за отлучку.') + '</p>';
    UI.overlay.open({
      id: 'return',
      kicker: 'С возвращением!',
      title: 'Вас не было ' + UI.formatDuration(report.seconds),
      body: body,
      actions: [{ label: 'Продолжить', primary: true, onClick: ensureAudio }],
      onOpen: function (handle) { animateReturn(handle.body); },
    });
  }

  // Bars grow from «before» to «after» and the numbers run up.
  function animateReturn(root) {
    setTimeout(function () {
      root.querySelectorAll('.return-bar .gain').forEach(function (bar) { bar.style.width = bar.dataset.to + '%'; });
    }, 80);
    const counters = root.querySelectorAll('[data-count]');
    if (counters.length === 0) return;
    const started = performance.now();
    function step(now) {
      const t = Math.min(1, (now - started) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      counters.forEach(function (el) {
        const value = Number(el.dataset.count) * eased;
        el.textContent = '+' + (el.dataset.compact ? formatCompact(value) : Math.round(value).toLocaleString('ru-RU')) + el.dataset.suffix;
      });
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- contract failure, campaign end ----------
  function failLiveContract() {
    UI.overlay.close('blocked');
    const mode = campaign.runMode;
    if (mode === 'school') Meta.failSchoolTrial(meta);
    else Meta.failContract(meta);
    campaign.status = 'failed';
    liveKey = null;
    openContractFailed(false, mode);
  }

  function openContractFailed(away, mode) {
    const school = mode === 'school';
    const toMain = { label: 'Вернуться на основную стройку', primary: true, onClick: function () { switchSite(Meta.activeSite(meta)); } };
    const toHq = { label: 'В штаб', onClick: function () { switchSite(Meta.activeSite(meta), { toHq: true }); } };
    UI.overlay.open({
      id: 'contract-failed',
      queue: !!away,
      closable: !!away,
      kicker: school ? 'Школа бригадиров' : 'Контракт ' + (meta.contract.index + 1),
      title: school ? 'Испытание проиграно' : 'Контракт провален',
      body: school ? '<p>Время вышло. Попытка потрачена; полученный опыт сохраняется.</p>' : away
        ? '<p>Время вышло, пока вас не было. Перезарядка 5 мин.</p>'
        : '<p>Время вышло. Перезарядка 5 мин. Прогресс этой стройки пропал.</p>',
      actions: school ? [{ label: 'Вернуться в школу', primary: true, onClick: function () { switchSite(Meta.activeSite(meta), { toHq: true }); openScreen('recruiting', { silent: true }); } }] : away ? [{ label: 'Понятно', primary: true }] : [toMain, toHq],
    });
  }

  function applyGhostVisibility() {
    for (let i = 0; i < ghostMeshes.length; i++) ghostMeshes[i].visible = ghostsOn;
  }

  function openSummary() {
    UI.overlay.open({
      id: 'summary',
      kicker: 'Кампания',
      title: 'Кампания завершена',
      body: '<p>Все ' + MB.LEVELS.length + ' объектов сданы. Штаб, биржа и контракты остаются доступны.</p>',
      actions: [{ label: 'В штаб', primary: true, onClick: function () { openScreen('hq'); } }],
    });
  }

  function disposeLevel() {
    if (cameraController.isWorkerView()) cameraController.setWorkerView(false);
    selectedBuilder = null;
    workerPlanSignature = '';
    updateWorkerViewButton();
    clearWorkerPlan();
    clearWorkerViews();
    stickViews.clear();
    vehicleViews.clear();
    planningDesks.clear();
    blockViews.clear();
    pourViews.clear();
    cubeCoins.clear();
    pops.length = 0;
    solidMeshes = [];
    ghostMaterials = [];
    ghostMeshes = [];
    Features.reset(featureState);
    scaffoldLookup = new Map();
    scaffoldMeshes = [];
    scaffoldDirty.clear();
    for (let i = levelRoot.children.length - 1; i >= 0; i--) {
      const child = levelRoot.children[i];
      child.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach(function (material) { material.dispose(); });
          else object.material.dispose();
        }
      });
      levelRoot.remove(child);
    }
    yardRoot = null;
    elevatorRoot = null;
  }

  function resize() {
    MicroBuildersStage.fit();
    renderer.setPixelRatio(renderPixelRatio());
    cameraController.resize(MicroBuildersStage.width(), MicroBuildersStage.height());
    renderer.setSize(MicroBuildersStage.width(), MicroBuildersStage.height());
    // The layout of the HUD changes with the screen shape: new band, zoom range, fog and shadows.
    if (cityRoot.visible) cameraController.setMode('city', cityCameraBounds());
    refreshSafeArea({ snap: true });
    applySceneLighting();
    placeCitySigns();
  }

  function grassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#7ea15d';
    context.fillRect(0, 0, 256, 256);
    // Soft lighter and darker blotches first (wrapped so the tile stays seamless), then blades.
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 30 + Math.random() * 50;
      const tint = i % 2 === 0 ? 'rgba(150, 186, 104, 0.35)' : 'rgba(92, 128, 70, 0.3)';
      for (let ox = -256; ox <= 256; ox += 256) {
        for (let oy = -256; oy <= 256; oy += 256) {
          const g = context.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          g.addColorStop(0, tint);
          g.addColorStop(1, 'rgba(0, 0, 0, 0)');
          context.fillStyle = g;
          context.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }
    for (let i = 0; i < 700; i++) {
      context.fillStyle = i % 2 === 0 ? '#6d9150' : '#8aaf68';
      context.fillRect(Math.random() * 256, Math.random() * 256, 2, 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18, 18);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function makeLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(28, 22, 16, 0.78)';
    roundRect(context, 8, 8, 240, 48, 16);
    context.fill();
    context.fillStyle = '#f6efe4';
    context.font = '700 28px Manrope, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 34);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false }));
    sprite.center.set(0.5, 0);
    sprite.scale.set(2.15, 0.54, 1);
    return sprite;
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function formatSeconds(value) {
    return value.toFixed(1).replace('.', ',') + ' с';
  }

  function formatSpeed(value) {
    return value.toFixed(1).replace('.', ',') + ' м/с';
  }

  function formatPercent(value) {
    return (value * 100).toFixed(1).replace('.', ',') + '%';
  }

  function ensureAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }

  // ---------- background music: a soft generative loop, no files ----------
  // 84 BPM in eighths, four bars Cmaj7 – Am7 – Fmaj7 – G6: a pad per bar, bass on 1 and 3, a plucked
  // arpeggio that drops a few notes by a fixed pattern (so loops differ a little), a quiet shaker on
  // the off-beats and a soft kick on the bar. Scheduled ahead on the audio clock.
  function startMusic() {
    if (music || !audioCtx) return;
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    gain.connect(audioCtx.destination);
    const length = Math.floor(audioCtx.sampleRate * 0.06);
    const noise = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    music = { gain: gain, step: 0, next: audioCtx.currentTime + 0.1, noise: noise, timer: 0 };
    music.timer = setInterval(scheduleMusic, 100);
    setMusicVolume();
  }

  function setMusicVolume() {
    if (!music) return;
    music.gain.gain.setTargetAtTime(soundOn ? 1 : 0, audioCtx.currentTime, 0.4);
  }

  function midiFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function musicNote(type, note, at, length, level, attack) {
    const osc = audioCtx.createOscillator();
    const env = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = midiFreq(note);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(level, at + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(env);
    env.connect(music.gain);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }

  function scheduleMusic() {
    if (!music || audioCtx.state !== 'running') return;
    const CHORDS = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 64]];
    const ARP = [0, 2, 1, 3, 2, 1, 3, 2];
    const eighth = 60 / 84 / 2;
    while (music.next < audioCtx.currentTime + 0.3) {
      const at = music.next;
      const step = music.step;
      const beat = step % 8;
      const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
      if (beat === 0) {
        for (let i = 1; i < 4; i++) musicNote('sine', chord[i], at, eighth * 9, 0.035, 0.6);
        musicNote('sine', chord[0] - 12, at, eighth * 3, 0.05, 0.02);
        // soft kick
        const osc = audioCtx.createOscillator();
        const env = audioCtx.createGain();
        osc.frequency.setValueAtTime(110, at);
        osc.frequency.exponentialRampToValueAtTime(45, at + 0.18);
        env.gain.setValueAtTime(0.07, at);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
        osc.connect(env);
        env.connect(music.gain);
        osc.start(at);
        osc.stop(at + 0.25);
      }
      if (beat === 4) musicNote('triangle', chord[0] - 12, at, eighth * 3, 0.045, 0.02);
      // The arpeggio skips a note now and then by a fixed 37-step pattern: loops vary, never repeat exactly.
      if ((step * 7 + 3) % 37 > 8) musicNote('triangle', chord[ARP[beat]] + 12, at, eighth * 1.8, 0.022, 0.01);
      if (beat % 2 === 1) {
        const hat = audioCtx.createBufferSource();
        const filter = audioCtx.createBiquadFilter();
        const env = audioCtx.createGain();
        hat.buffer = music.noise;
        filter.type = 'highpass';
        filter.frequency.value = 7000;
        env.gain.value = 0.018;
        hat.connect(filter);
        filter.connect(env);
        env.connect(music.gain);
        hat.start(at);
      }
      music.step += 1;
      music.next += eighth;
    }
  }

  function tone(freq, duration) {
    if (!soundOn || !audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = freq;
    gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  }
})();
