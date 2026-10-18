(function (root) {
  const Features = root.MicroBuilderFeatures;
  const SESSION_BALANCE = window.MicroBuildersBalance.session;
  const TUNING = window.MicroBuildersBalance.tuning;

  function evalFormula(formula, x) {
    const js = formula.replace(/\^/g, '**');
    return new Function('x', 'Math', 'return (' + js + ');')(x, Math);
  }

  function sessionValue(kind, level) {
    const spec = SESSION_BALANCE[kind];
    const locked = spec.overrides[String(level)];
    if (locked !== undefined) return locked;
    return evalFormula(spec.formula, level);
  }
  const MATERIALS = [];

  // cell = mass of one mini-cube, grid = mini-cubes per edge (a cube is grid³ mini-cubes).
  // Mini-cube mass per grid: 1 → 2–100, 2 → 5–70, 3 → 10–120, 4 → 15–250, 5 → 25–800 kg.
  const MATERIAL_LADDER = [
    { id: 'ladder-stone', name: 'Камень', cell: 2, grid: 1, color: 0x9a947f, look: 'stone' },
    { id: 'ladder-sandstone', name: 'Песчаник', cell: 3, grid: 1, color: 0xd2b48a, look: 'sand' },
    { id: 'ladder-concrete', name: 'Бетон', cell: 4, grid: 1, color: 0xb7b7b2, look: 'concrete' },
    { id: 'ladder-pine', name: 'Сосна', cell: 5, grid: 1, color: 0xc4894a, look: 'wood' },
    { id: 'ladder-oak', name: 'Дуб', cell: 7, grid: 1, color: 0x8a5a32, look: 'wood' },
    { id: 'ladder-brick-yellow', name: 'Жёлтый кирпич', cell: 9, grid: 1, color: 0xd7a15a, look: 'brick' },
    { id: 'ladder-brick-red', name: 'Красный кирпич', cell: 12, grid: 1, color: 0xb64b3a, look: 'brick' },
    { id: 'ladder-brick-white', name: 'Белый кирпич', cell: 16, grid: 1, color: 0xe7e1d6, look: 'brick' },
    { id: 'ladder-bronze', name: 'Бронза', cell: 20, grid: 1, color: 0xb87333, look: 'metal' },
    { id: 'ladder-iron', name: 'Железо', cell: 26, grid: 1, color: 0x8d939b, look: 'metal' },
    { id: 'ladder-granite', name: 'Гранит', cell: 34, grid: 1, color: 0x6e655f, look: 'stone' },
    { id: 'ladder-steel', name: 'Сталь', cell: 44, grid: 1, color: 0xb9c0c7, look: 'metal' },
    { id: 'ladder-marble', name: 'Мрамор', cell: 58, grid: 1, color: 0xe6e1dc, look: 'marble' },
    { id: 'ladder-marble-white', name: 'Белый мрамор', cell: 75, grid: 1, color: 0xf4f1ec, look: 'marble' },
    { id: 'ladder-marble-black', name: 'Чёрный мрамор', cell: 100, grid: 1, color: 0x2c2a2e, look: 'marble' },
    { id: 'ladder-steel-stainless', name: 'Нержавеющая сталь', cell: 5, grid: 2, color: 0xd5dbe2, look: 'metal' },
    { id: 'ladder-steel-hard', name: 'Калёная сталь', cell: 7, grid: 2, color: 0x5e666e, look: 'metal' },
    { id: 'ladder-steel-mirror', name: 'Зеркальная сталь', cell: 11, grid: 2, color: 0xe8eef3, look: 'metal' },
    { id: 'ladder-marble-polished', name: 'Полированный мрамор', cell: 15, grid: 2, color: 0xf7f4ef, look: 'marble' },
    { id: 'ladder-marble-rose', name: 'Розовый мрамор', cell: 23, grid: 2, color: 0xe7c2c0, look: 'marble' },
    { id: 'ladder-silver', name: 'Серебро', cell: 33, grid: 2, color: 0xf2f4f7, look: 'metal' },
    { id: 'ladder-silver-pure', name: 'Чистое серебро', cell: 48, grid: 2, color: 0xffffff, look: 'metal' },
    { id: 'ladder-gold', name: 'Золото', cell: 70, grid: 2, color: 0xf0c14a, look: 'metal' },
    { id: 'ladder-malachite', name: 'Малахит', cell: 10, grid: 3, color: 0x1f8a4c, look: 'gem' },
    { id: 'ladder-jade', name: 'Нефрит', cell: 14, grid: 3, color: 0x6fbf8a, look: 'gem' },
    { id: 'ladder-onyx', name: 'Оникс', cell: 20, grid: 3, color: 0x1a1a1c, look: 'obsidian' },
    { id: 'ladder-obsidian', name: 'Обсидиан', cell: 29, grid: 3, color: 0x141018, look: 'obsidian' },
    { id: 'ladder-obsidian-black', name: 'Чёрный обсидиан', cell: 41, grid: 3, color: 0x07060a, look: 'obsidian' },
    { id: 'ladder-diamond', name: 'Алмаз', cell: 59, grid: 3, color: 0xd7f6ff, look: 'diamond', glow: 0x9adfff, glowStrength: 0.35 },
    { id: 'ladder-diamond-pure', name: 'Чистый алмаз', cell: 84, grid: 3, color: 0xffffff, look: 'diamond', glow: 0xffffff, glowStrength: 0.7 },
    { id: 'ladder-diamond-black', name: 'Чёрный алмаз', cell: 120, grid: 3, color: 0x1c2128, look: 'diamond', glow: 0xc5d4e8, glowStrength: 0.2 },
    { id: 'ladder-platinum', name: 'Платина', cell: 15, grid: 4, color: 0xe6e8ea, look: 'platinum' },
    { id: 'ladder-platinum-pure', name: 'Чистая платина', cell: 30, grid: 4, color: 0xf4f6f8, look: 'platinum' },
    { id: 'ladder-platinum-white', name: 'Белая платина', cell: 60, grid: 4, color: 0xffffff, look: 'platinum' },
    { id: 'ladder-platinum-mirror', name: 'Зеркальная платина', cell: 125, grid: 4, color: 0xf8fbff, look: 'platinum' },
    { id: 'ladder-platinum-black', name: 'Чёрная платина', cell: 250, grid: 4, color: 0x3a4048, look: 'platinum' },
    { id: 'ladder-platinum-royal', name: 'Королевская платина', cell: 25, grid: 5, color: 0xfff6df, look: 'platinum' },
    { id: 'ladder-platinum-imperial', name: 'Имперская платина', cell: 60, grid: 5, color: 0xf3e2a8, look: 'platinum' },
    { id: 'ladder-diamond-royal', name: 'Королевский алмаз', cell: 140, grid: 5, color: 0xffe7a8, look: 'diamond', glow: 0xffc14a, glowStrength: 0.4 },
    { id: 'ladder-diamond-imperial', name: 'Имперский алмаз', cell: 340, grid: 5, color: 0xf0b429, look: 'diamond', glow: 0xff9a1f, glowStrength: 0.55 },
    { id: 'ladder-diamond-final', name: 'Предельный алмаз', cell: 800, grid: 5, color: 0xfffaf2, look: 'diamond', glow: 0xfff1c4, glowStrength: 0.9 },
  ];

  // Glass of windows: its own pile on every site with windows; not on the ladder (levels never
  // shift it).
  const GLASS = { id: 'glass', name: 'Стекло', cell: 3, grid: 1, color: 0x8fd8ee, look: 'glass' };
  for (let i = 0; i < MATERIAL_LADDER.length; i++) {
    const item = MATERIAL_LADDER[i];
    item.weight = item.cell * item.grid * item.grid * item.grid;
    MATERIALS.push(item);
  }
  GLASS.weight = GLASS.cell;
  MATERIALS.push(GLASS);

  const MATERIAL = {};
  for (let i = 0; i < MATERIALS.length; i++) MATERIAL[MATERIALS[i].id] = MATERIALS[i];

  const SHIRTS = [0x2f6fed, 0xd4543c, 0x2f9d6c, 0xef8a2a, 0x7a5af5, 0xdb4f8a, 0x1f8a8a, 0xc6a15b];

  const BALANCE = TUNING.builders;

  const VEHICLE = {
    basePlan: TUNING.machines.planBase,
    planStep: TUNING.machines.planStep,
    baseReach: 4,
    reachStep: 1,
    baseHeight: 3,
    heightStep: 1,
    driveSpeed: 3.8,
    loadSeconds: TUNING.machines.loadSeconds,
    turnSpeed: 4.2,
    boomSpeed: TUNING.machines.craneBoomSpeed,
    craneClearance: TUNING.machines.craneClearance,
  };

  const UPGRADES = {
    builders: { base: 200, growth: 1.92 },
    speed: { base: 80, growth: 1.64 },
    carry: { base: 50, growth: 1.6 },
    horizontal: { base: 90, growth: 1.62 },
    vertical: { base: 100, growth: 1.68 },
    plan: { base: 80, growth: 1.6 },
    vehicles: { base: 600, growth: 2.15 },
    vehicleHeight: { base: 240, growth: 1.78 },
    vehicleReach: { base: 220, growth: 1.75 },
    scaffold: { base: 110, growth: 1.72 },
    kitchen: { base: 500, growth: 3.2 },
    pickup: { base: 70, growth: 1.58 },
    smokeRare: { base: 90, growth: 1.7 },
    smokeShort: { base: 90, growth: 1.7 },
    lightCarry: { base: 80, growth: 1.66 },
    cubePay: { base: 120, growth: 1.74 },
    cubeCapital: { base: 160, growth: 1.8 },
    payMultiplier: { base: 180, growth: 1.82 },
    floorPay: { base: 200, growth: 1.84 },
    freeBuy: { base: 220, growth: 1.9 },
    capitalChance: { base: 160, growth: 1.8 },
    triplePay: { base: 240, growth: 1.88 },
    triplePower: { base: 260, growth: 1.9 },
    budgetCapital: { base: 200, growth: 1.86 },
    engineers: { base: 280, growth: 1.92 },
    loaderSpeed: { base: 140, growth: 1.7 },
    boomSpeed: { base: 160, growth: 1.72 },
    gather: { base: 150, growth: 1.7 },
    droneSpeed: { base: 150, growth: 1.7 },
    droneBuild: { base: 160, growth: 1.72 },
    loaderMass: { base: 180, growth: 1.76 },
    patternHeight: { base: 170, growth: 1.74 },
    bucket: { base: 170, growth: 1.74 },
    helicopters: { base: 900, growth: 2.2 },
    heliSpeed: { base: 200, growth: 1.74 },
    heliMass: { base: 220, growth: 1.78 },
    heliWidth: { base: 210, growth: 1.76 },
    heliHeight: { base: 210, growth: 1.76 },
    elevators: { base: 500, growth: 2.05 },
    elevatorSpeed: { base: 160, growth: 1.7 },
    elevatorHeight: { base: 180, growth: 1.74 },
  };

  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const EMPTY_SET = new Set();
  const ROUTE_NONE = 0;
  const ROUTE_STARTED = 1;
  const ROUTE_WAITING = 2;
  const SURFACE_LADDER = 1;
  const SURFACE_DECK = 2;
  const SURFACE_STATE_COUNT = 4;

  const SCAFFOLD = {
    enabled: true,
    step: 1,
    erectSeconds: TUNING.scaffold.erectSeconds,
    horizontalPrice: TUNING.scaffold.horizontalPrice,
    verticalPrice: TUNING.scaffold.verticalPrice,
    shortcutRoutes: true,
    expansionBudget: 10000,
    ladderPrice: TUNING.scaffold.ladderPrice,
    deckPrice: TUNING.scaffold.deckPrice,
    passagePrice: TUNING.scaffold.passagePrice,
    elevatorFloorPrice: 0.35,
  };


  function cellKey(x, y, z) {
    return x + ',' + y + ',' + z;
  }

  function createBlueprint() {
    const cells = new Map();
    const seals = [];

    function put(x, y, z, materialId) {
      cells.set(cellKey(x, y, z), { x: x, y: y, z: z, materialId: materialId });
    }

    function feature(x, y, z, materialId, type, faceX, faceZ, style) {
      cells.set(cellKey(x, y, z), {
        x: x,
        y: y,
        z: z,
        materialId: materialId,
        feature: type,
        faceX: faceX,
        faceZ: faceZ,
        style: style,
      });
    }

    function paint(x, y, z, materialId) {
      const cell = cells.get(cellKey(x, y, z));
      if (!cell) return;
      cell.materialId = materialId;
    }

    function box(x0, y0, z0, x1, y1, z1, materialId) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          for (let x = x0; x <= x1; x++) put(x, y, z, materialId);
        }
      }
    }

    function walls(x0, y0, z0, x1, y1, z1, materialId) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          for (let x = x0; x <= x1; x++) {
            if (x === x0 || x === x1 || z === z0 || z === z1) put(x, y, z, materialId);
          }
        }
      }
    }

    function cut(x, y, z) {
      const key = cellKey(x, y, z);
      if (!cells.has(key)) return;
      cells.delete(key);
      seals.push({ x: x, y: y, z: z });
    }

    function carve(x, z, y0, height, width) {
      for (let w = 0; w < width; w++) {
        for (let i = 0; i < height; i++) cut(x + w, y0 + i, z);
      }
    }

    function post(x, z, y0, y1, materialId) {
      for (let y = y0; y <= y1; y++) put(x, y, z, materialId);
    }

    function gable(x0, x1, z0, z1, y, materialId) {
      let inset = 0;
      while (x0 + inset <= x1 - inset) {
        box(x0 + inset, y + inset, z0, x1 - inset, y + inset, z1, materialId);
        inset += 1;
      }
    }

    function pyramid(x0, x1, z0, z1, y, materialId) {
      let inset = 0;
      while (x0 + inset <= x1 - inset && z0 + inset <= z1 - inset) {
        box(x0 + inset, y + inset, z0 + inset, x1 - inset, y + inset, z1 - inset, materialId);
        inset += 1;
      }
    }

    function band(x0, x1, y, z0, z1, materialId) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) paint(x, y, z, materialId);
      }
    }

    function crenels(x0, x1, z0, z1, y, materialId) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const edge = x === x0 || x === x1 || z === z0 || z === z1;
          if (!edge || ((x + z) & 1) !== 0) continue;
          if (!cells.has(cellKey(x, y - 1, z))) continue;
          put(x, y, z, materialId);
        }
      }
    }

    function rampRun(x, z0, z1, steps, dx, materialId) {
      for (let i = 0; i < steps; i++) {
        const columnX = x + dx * i;
        for (let z = z0; z <= z1; z++) {
          for (let y = 0; y <= i; y++) put(columnX, y, z, materialId);
        }
      }
    }

    function rampRiseZ(z, x0, x1, steps, dz, materialId) {
      for (let i = 0; i < steps; i++) {
        const columnZ = z + dz * i;
        for (let x = x0; x <= x1; x++) {
          for (let y = 0; y <= i; y++) put(x, y, columnZ, materialId);
        }
      }
    }

    function lantern(y0, radii, materialId, hubId) {
      for (let i = 0; i < radii.length; i++) {
        const radius = radii[i];
        const y = y0 + i;
        walls(-radius, y, -radius, radius, y, radius, materialId);
        for (let x = -radius; x <= radius; x++) put(x, y, 0, hubId);
        for (let z = -radius; z <= radius; z++) put(0, y, z, hubId);
      }
    }

    function has(x, y, z) {
      return cells.has(cellKey(x, y, z));
    }

    function get(x, y, z) {
      return cells.get(cellKey(x, y, z));
    }

    const api = {
      cells: cells,
      seals: seals,
      has: has,
      get: get,
      put: put,
      paint: paint,
      box: box,
      walls: walls,
      cut: cut,
      carve: carve,
      post: post,
      gable: gable,
      pyramid: pyramid,
      band: band,
      crenels: crenels,
      rampRun: rampRun,
      rampRiseZ: rampRiseZ,
      lantern: lantern,
    };
    Features.installBlueprint(api, feature);
    return api;
  }

  function classifyShell(cells, seals) {
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (const cell of cells.values()) {
      if (cell.x < minX) minX = cell.x;
      if (cell.z < minZ) minZ = cell.z;
      if (cell.x > maxX) maxX = cell.x;
      if (cell.y > maxY) maxY = cell.y;
      if (cell.z > maxZ) maxZ = cell.z;
    }
    minX -= 1;
    minZ -= 1;
    maxX += 1;
    maxZ += 1;
    maxY += 1;
    const minY = -1;
    const blocked = new Set();
    for (const key of cells.keys()) blocked.add(key);
    for (let i = 0; i < seals.length; i++) {
      const seal = seals[i];
      blocked.add(cellKey(seal.x, seal.y, seal.z));
    }
    const outside = new Set();
    const queue = [];
    let head = 0;
    function visit(x, y, z) {
      if (x < minX || x > maxX || y < minY || y > maxY || z < minZ || z > maxZ) return;
      const key = cellKey(x, y, z);
      if (blocked.has(key) || outside.has(key)) return;
      outside.add(key);
      queue.push(x, y, z);
    }
    visit(minX, minY, minZ);
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const z = queue[head++];
      visit(x + 1, y, z);
      visit(x - 1, y, z);
      visit(x, y + 1, z);
      visit(x, y - 1, z);
      visit(x, y, z + 1);
      visit(x, y, z - 1);
    }
    const shell = new Set();
    for (const cell of cells.values()) {
      const exposed =
        outside.has(cellKey(cell.x + 1, cell.y, cell.z)) ||
        outside.has(cellKey(cell.x - 1, cell.y, cell.z)) ||
        outside.has(cellKey(cell.x, cell.y, cell.z + 1)) ||
        outside.has(cellKey(cell.x, cell.y, cell.z - 1)) ||
        outside.has(cellKey(cell.x, cell.y + 1, cell.z)) ||
        (cell.y > 0 && outside.has(cellKey(cell.x, cell.y - 1, cell.z)));
      if (exposed) shell.add(cellKey(cell.x, cell.y, cell.z));
    }
    return shell;
  }

  function finalizeBlocks(bp) {
    const shell = classifyShell(bp.cells, bp.seals);
    let cx = 0;
    let cz = 0;
    const total = bp.cells.size;
    for (const cell of bp.cells.values()) {
      cx += cell.x;
      cz += cell.z;
    }
    cx /= total;
    cz /= total;
    const blocks = [];
    let id = 0;
    for (const cell of bp.cells.values()) {
      const dist = Math.abs(cell.x - cx) + Math.abs(cell.z - cz);
      const isShell = shell.has(cellKey(cell.x, cell.y, cell.z));
      blocks.push({
        id: id,
        x: cell.x,
        y: cell.y,
        z: cell.z,
        materialId: cell.materialId,
        feature: cell.feature,
        faceX: cell.faceX,
        faceZ: cell.faceZ,
        style: cell.style,
        shell: isShell,
        priority: cell.y * 100000 + (isShell ? 5000 : 0) + dist * 10,
      });
      id += 1;
    }
    const byKey = new Map();
    for (let i = 0; i < blocks.length; i++) byKey.set(cellKey(blocks[i].x, blocks[i].y, blocks[i].z), blocks[i]);
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.feature) Features.finalize(block, byKey);
    }
    // A window cell is two cubes deep: first a plain cube of the wall material, then a glass cube
    // into the same cell (glassOf — the wall cube's id). The glass cube carries the window feature
    // and turns the cell into the window; it is not in the cell grids (the wall cube is).
    const count = blocks.length;
    for (let i = 0; i < count; i++) {
      const wall = blocks[i];
      if (wall.feature !== 'window') continue;
      const glass = Object.assign({}, wall, { id: blocks.length, materialId: GLASS.id, priority: wall.priority + 1, glassOf: wall.id });
      wall.feature = null;
      wall.glassId = glass.id;
      blocks.push(glass);
    }
    return blocks;
  }

  function validateSpecialBlocks(bp) {
    Features.validate(bp);
  }

  function rockPattern(index) {
    const patterns = [
      [[0, 0, 0], [1, 0, 0], [0, 0, 1], [0, 1, 0], [-1, 0, 0], [1, 1, 0], [0, 0, -1]],
      [[0, 0, 0], [-1, 0, 0], [0, 0, -1], [0, 1, 0], [1, 0, 1], [0, 2, 0], [1, 0, 0]],
      [[0, 0, 0], [1, 0, -1], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 1, 0], [1, 0, 0]],
      [[0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 1], [-1, 0, 1], [0, 1, 0], [-1, 0, 0]],
      [[0, 0, 0], [1, 0, 1], [-1, 0, -1], [0, 1, 0], [0, 2, 0], [1, 0, 0], [0, 0, -1]],
    ];
    return patterns[index % patterns.length];
  }

  function layoutSite(blocks, mineGap) {
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = 0;
    let maxZ = -Infinity;
    const occupied = new Set();
    const materialIds = [];
    const seen = new Set();
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.x < minX) minX = block.x;
      if (block.z < minZ) minZ = block.z;
      if (block.x > maxX) maxX = block.x;
      if (block.y > maxY) maxY = block.y;
      if (block.z > maxZ) maxZ = block.z;
      occupied.add(cellKey(block.x, block.y, block.z));
      if (!seen.has(block.materialId)) {
        seen.add(block.materialId);
        materialIds.push(block.materialId);
      }
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const baseRadius = Math.max(maxX - minX, maxZ - minZ) * 0.5 + mineGap;
    const mines = [];
    const rocks = [];
    for (let i = 0; i < materialIds.length; i++) {
      const spread = Math.PI * 0.95;
      const t = materialIds.length === 1 ? 0.5 : i / (materialIds.length - 1);
      const angle = Math.PI - spread / 2 + spread * t;
      let radius = baseRadius;
      let mx = 0;
      let mz = 0;
      let guard = 0;
      while (guard < 48) {
        mx = Math.round(cx + Math.sin(angle) * radius);
        mz = Math.round(cz + Math.cos(angle) * radius);
        let clear = true;
        for (let dz = -2; dz <= 2 && clear; dz++) {
          for (let dx = -2; dx <= 2 && clear; dx++) {
            for (let y = 0; y <= 2; y++) {
              if (occupied.has(cellKey(mx + dx, y, mz + dz))) {
                clear = false;
                break;
              }
            }
          }
        }
        if (clear) break;
        radius += 1;
        guard += 1;
      }
      const offsets = rockPattern(i);
      const rockKeys = new Set();
      const mineRocks = [];
      for (let r = 0; r < offsets.length; r++) {
        const ox = mx + offsets[r][0];
        const oy = offsets[r][1];
        const oz = mz + offsets[r][2];
        const key = cellKey(ox, oy, oz);
        rockKeys.add(key);
        occupied.add(key);
        const rock = { x: ox, y: oy, z: oz };
        mineRocks.push(rock);
        rocks.push(rock);
      }
      let stand = null;
      for (let ring = 2; ring <= 5 && !stand; ring++) {
        for (let dz = -ring; dz <= ring && !stand; dz++) {
          for (let dx = -ring; dx <= ring; dx++) {
            if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
            const sx = mx + dx;
            const sz = mz + dz;
            const key = cellKey(sx, 0, sz);
            if (rockKeys.has(key) || occupied.has(key)) continue;
            stand = [sx, 0, sz];
            break;
          }
        }
      }
      occupied.add(cellKey(stand[0], stand[1], stand[2]));
      mines.push({
        materialId: materialIds[i],
        x: mx,
        z: mz,
        standX: stand[0],
        standY: stand[1],
        standZ: stand[2],
        rocks: mineRocks,
      });
    }
    const elevators = elevatorPads(minX, maxX, minZ, maxZ, occupied);
    const spawnPoints = [];
    const spawnCenterX = Math.round(cx);
    let spawnZ = maxZ + 5;
    while (spawnPoints.length < 24) {
      for (let offsetX = -5; offsetX <= 5 && spawnPoints.length < 24; offsetX++) {
        const x = spawnCenterX + offsetX;
        if (occupied.has(cellKey(x, 0, spawnZ))) continue;
        spawnPoints.push([x, 0, spawnZ]);
        occupied.add(cellKey(x, 0, spawnZ));
      }
      spawnZ += 1;
    }
    let boundMinX = minX;
    let boundMaxX = maxX;
    let boundMinZ = minZ;
    let boundMaxZ = maxZ;
    for (let i = 0; i < rocks.length; i++) {
      boundMinX = Math.min(boundMinX, rocks[i].x);
      boundMaxX = Math.max(boundMaxX, rocks[i].x);
      boundMinZ = Math.min(boundMinZ, rocks[i].z);
      boundMaxZ = Math.max(boundMaxZ, rocks[i].z);
    }
    for (let i = 0; i < spawnPoints.length; i++) {
      boundMinX = Math.min(boundMinX, spawnPoints[i][0]);
      boundMaxX = Math.max(boundMaxX, spawnPoints[i][0]);
      boundMinZ = Math.min(boundMinZ, spawnPoints[i][2]);
      boundMaxZ = Math.max(boundMaxZ, spawnPoints[i][2]);
    }
    boundMinX = Math.min(boundMinX, minX - 44);
    boundMaxX = Math.max(boundMaxX, maxX + 44);
    boundMinZ = Math.min(boundMinZ, minZ - 44);
    boundMaxZ = Math.max(boundMaxZ, maxZ + 44);
    const minesByMaterial = {};
    for (let i = 0; i < mines.length; i++) minesByMaterial[mines[i].materialId] = mines[i];
    return {
      materialIds: materialIds,
      mines: mines,
      minesByMaterial: minesByMaterial,
      rocks: rocks,
      spawnPoints: spawnPoints,
      bounds: {
        minX: boundMinX - 4,
        maxX: boundMaxX + 4,
        minZ: boundMinZ - 4,
        maxZ: boundMaxZ + 4,
        maxY: maxY + 4,
      },
      footprint: { minX: minX, maxX: maxX, minZ: minZ, maxZ: maxZ, maxY: maxY },
      elevators: elevators,
    };
  }

  function padClear(x, z, occupied) {
    for (let dz = 0; dz < 3; dz++) {
      for (let dx = 0; dx < 3; dx++) {
        if (occupied.has(cellKey(x + dx, 0, z + dz))) return false;
      }
    }
    return true;
  }

  function elevatorPads(minX, maxX, minZ, maxZ, occupied) {
    const midX = Math.round((minX + maxX) / 2);
    const midZ = Math.round((minZ + maxZ) / 2);
    const sides = [
      { x: minX - 4, z: midZ - 1, exitX: minX - 1, exitZ: midZ, enterX: minX - 5, enterZ: midZ, along: 'z' },
      { x: maxX + 2, z: midZ - 1, exitX: maxX + 1, exitZ: midZ, enterX: maxX + 5, enterZ: midZ, along: 'z' },
      { x: midX - 1, z: minZ - 4, exitX: midX, exitZ: minZ - 1, enterX: midX, enterZ: minZ - 5, along: 'x' },
      { x: midX - 1, z: maxZ + 2, exitX: midX, exitZ: maxZ + 1, enterX: midX, enterZ: maxZ + 5, along: 'x' },
    ];
    const pads = [];
    for (let s = 0; s < sides.length; s++) {
      const side = sides[s];
      let placed = null;
      for (let shift = 0; shift <= 8 && !placed; shift++) {
        const delta = shift === 0 ? 0 : (shift % 2 === 0 ? shift / 2 : -Math.ceil(shift / 2));
        const x = side.along === 'x' ? side.x + delta : side.x;
        const z = side.along === 'z' ? side.z + delta : side.z;
        const exitX = side.along === 'x' ? side.exitX + delta : side.exitX;
        const exitZ = side.along === 'z' ? side.exitZ + delta : side.exitZ;
        const enterX = side.along === 'x' ? side.enterX + delta : side.enterX;
        const enterZ = side.along === 'z' ? side.enterZ + delta : side.enterZ;
        if (!padClear(x, z, occupied)) continue;
        if (occupied.has(cellKey(exitX, 0, exitZ)) || occupied.has(cellKey(enterX, 0, enterZ))) continue;
        placed = { x: x, z: z, exitX: exitX, exitZ: exitZ, enterX: enterX, enterZ: enterZ };
      }
      if (!placed) continue;
      pads.push(placed);
      for (let dz = 0; dz < 3; dz++) {
        for (let dx = 0; dx < 3; dx++) occupied.add(cellKey(placed.x + dx, 0, placed.z + dz));
      }
      occupied.add(cellKey(placed.exitX, 0, placed.exitZ));
      occupied.add(cellKey(placed.enterX, 0, placed.enterZ));
    }
    return pads;
  }

  const LEVEL_SPECS = root.MicroBuilderLevelSpecs;

  const HQ_LEVELS = {};
  root.MicroBuilderHqSpecs.forEach(function (spec) {
    const bp = createBlueprint();
    spec.build(bp);
    validateSpecialBlocks(bp);
    const blocks = finalizeBlocks(bp);
    const site = layoutSite(blocks, spec.mineGap);
    HQ_LEVELS[spec.id] = {
      index: 0,
      number: 'Штаб',
      name: spec.name,
      pace: spec.pace,
      blurb: spec.blurb,
      blocks: blocks,
      materialIds: site.materialIds,
      mines: site.mines,
      minesByMaterial: site.minesByMaterial,
      rocks: site.rocks,
      spawnPoints: site.spawnPoints,
      bounds: site.bounds,
      footprint: site.footprint,
      elevators: site.elevators,
    };
  });

  // Geometry stays fixed; every ten tiers advance the material palette.
  const SCHOOL_LEVELS = {}, SCHOOL_LEVEL_VARIANTS = {};
  const SCHOOL_MATERIAL_STAGES = root.MicroBuildersBalance.meta.school.materialStages;
  (root.MicroBuilderSchoolSpecs || []).forEach(function (spec, index) {
    SCHOOL_LEVEL_VARIANTS[spec.id] = SCHOOL_MATERIAL_STAGES.map(function (stage, phase) {
      const bp = createBlueprint();
      spec.build(bp);
      validateSpecialBlocks(bp);
      const blocks = finalizeBlocks(bp);
      shiftLevelMaterials(blocks, stage.top);
      const site = layoutSite(blocks, spec.mineGap);
      return {
        index: index, number: 'Испытание', name: spec.name, pace: spec.pace, blurb: spec.blurb,
        phase: phase + 1, materialTop: stage.top,
        blocks: blocks, materialIds: site.materialIds, mines: site.mines, minesByMaterial: site.minesByMaterial,
        rocks: site.rocks, spawnPoints: site.spawnPoints, bounds: site.bounds, footprint: site.footprint, elevators: site.elevators,
      };
    });
    SCHOOL_LEVELS[spec.id] = SCHOOL_LEVEL_VARIANTS[spec.id][0];
  });

  function schoolLevel(id, tier) {
    const variants = SCHOOL_LEVEL_VARIANTS[id];
    if (!variants) return null;
    tier = Math.max(1, Math.floor(tier || 1));
    let phase = 0;
    SCHOOL_MATERIAL_STAGES.forEach(function (stage, index) { if (tier >= stage.fromTier) phase = index; });
    return variants[phase];
  }

  // Shifts the level's materials up the ladder so the heaviest one becomes `topId`; the order of
  // materials inside the level (lighter / heavier parts of the building) stays the same.
  function shiftLevelMaterials(blocks, topId) {
    if (!topId) return;
    const ladder = MATERIAL_LADDER.map(function (item) { return item.id; });
    let heaviest = 0;
    for (let i = 0; i < blocks.length; i++) heaviest = Math.max(heaviest, ladder.indexOf(blocks[i].materialId));
    const shift = ladder.indexOf(topId) - heaviest;
    if (shift <= 0) return;
    for (let i = 0; i < blocks.length; i++) {
      const at = ladder.indexOf(blocks[i].materialId);
      if (at >= 0) blocks[i].materialId = ladder[Math.min(ladder.length - 1, at + shift)];
    }
  }

  const LEVEL_MATERIAL_TOPS = root.MicroBuilderLevelMaterialTops || {};

  const LEVELS = LEVEL_SPECS.map(function (spec, index) {
    const bp = createBlueprint();
    spec.build(bp);
    validateSpecialBlocks(bp);
    const blocks = finalizeBlocks(bp);
    shiftLevelMaterials(blocks, LEVEL_MATERIAL_TOPS[index + 1]);
    const site = layoutSite(blocks, spec.mineGap);
    return {
      index: index,
      number: index + 1,
      name: spec.name,
      pace: spec.pace,
      blurb: spec.blurb,
      blocks: blocks,
      materialIds: site.materialIds,
      mines: site.mines,
      minesByMaterial: site.minesByMaterial,
      rocks: site.rocks,
      spawnPoints: site.spawnPoints,
      bounds: site.bounds,
      footprint: site.footprint,
      elevators: site.elevators,
    };
  });

  function createIndex(bounds) {
    const minX = bounds.minX;
    const maxX = bounds.maxX;
    const minZ = bounds.minZ;
    const maxZ = bounds.maxZ;
    const maxY = bounds.maxY;
    const sx = maxX - minX + 1;
    const sz = maxZ - minZ + 1;
    const size = sx * (maxY + 1) * sz;
    return {
      size: size,
      minX: minX,
      maxX: maxX,
      minZ: minZ,
      maxZ: maxZ,
      maxY: maxY,
      inside: function (x, y, z) {
        return x >= minX && x <= maxX && z >= minZ && z <= maxZ && y >= 0 && y <= maxY;
      },
      id: function (x, y, z) {
        return (y * sz + (z - minZ)) * sx + (x - minX);
      },
      decode: function (n) {
        const x = minX + (n % sx);
        const rest = Math.floor(n / sx);
        const z = minZ + (rest % sz);
        const y = Math.floor(rest / sz);
        return [x, y, z];
      },
      decodeInto: function (n, out) {
        const rest = Math.floor(n / sx);
        out[0] = minX + (n % sx);
        out[1] = Math.floor(rest / sz);
        out[2] = minZ + (rest % sz);
      },
    };
  }

  function createHeap() {
    const items = [];
    return {
      get size() {
        return items.length / 2;
      },
      clear: function () {
        items.length = 0;
      },
      push: function (priority, value) {
        items.push(priority, value);
        let i = items.length / 2 - 1;
        while (i > 0) {
          const parent = (i - 1) >> 1;
          if (items[parent * 2] <= items[i * 2]) break;
          const parentPriority = items[parent * 2];
          const parentValue = items[parent * 2 + 1];
          items[parent * 2] = items[i * 2];
          items[parent * 2 + 1] = items[i * 2 + 1];
          items[i * 2] = parentPriority;
          items[i * 2 + 1] = parentValue;
          i = parent;
        }
      },
      pop: function () {
        const value = items[1];
        const lastPriority = items[items.length - 2];
        const lastValue = items[items.length - 1];
        items.length -= 2;
        if (items.length === 0) return value;
        items[0] = lastPriority;
        items[1] = lastValue;
        let i = 0;
        const count = items.length / 2;
        while (true) {
          const left = i * 2 + 1;
          const right = left + 1;
          let smallest = i;
          if (left < count && items[left * 2] < items[smallest * 2]) smallest = left;
          if (right < count && items[right * 2] < items[smallest * 2]) smallest = right;
          if (smallest === i) break;
          const swapPriority = items[smallest * 2];
          const swapValue = items[smallest * 2 + 1];
          items[smallest * 2] = items[i * 2];
          items[smallest * 2 + 1] = items[i * 2 + 1];
          items[i * 2] = swapPriority;
          items[i * 2 + 1] = swapValue;
          i = smallest;
        }
        return value;
      },
    };
  }

  function canStand(x, y, z, world) {
    const index = world.index;
    const grid = world.solidGrid;
    if (!index.inside(x, y, z)) return false;
    const id = index.id(x, y, z);
    if (grid[id] === 1) return false;
    if (world.waterGrid[id] === 1) return false;
    if (world.doorGrid[id] === 1) return true;
    if (world.elevatorPads && y >= 0 && y < elevatorFloors(world) && elevatorPadBy(world, x, z, 'lobby')) return true;
    if (y === 0) return true;
    if (world.mastGrid[id] === 1 || world.deckGrid[id] === 1) return true;
    if (index.inside(x, y - 1, z) && grid[index.id(x, y - 1, z)] === 1) return true;
    if (index.inside(x, y - 1, z) && world.bridgeGrid[index.id(x, y - 1, z)] === 1) return true;
    if (index.inside(x, y - 1, z) && world.doorGrid[index.id(x, y - 1, z)] === 1) return true;
    if (index.inside(x, y - 1, z) && world.mastGrid[index.id(x, y - 1, z)] === 1) return true;
    if (!SCAFFOLD.enabled) {
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (index.inside(nx, y, nz) && grid[index.id(nx, y, nz)] === 1) return true;
        if (index.inside(nx, y - 1, nz) && grid[index.id(nx, y - 1, nz)] === 1) return true;
      }
    }
    return false;
  }

  function deckCell(x, y, z, world) {
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    return world.deckGrid[index.id(x, y, z)] === 1;
  }

  function ladderColumn(x, y, z, world) {
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    const block = world.blockGrid[index.id(x, y, z)];
    if (block && block.feature === 'hatch') return true;
    if (world.mastGrid[index.id(x, y, z)] === 1) return true;
    if (y > 0 && index.inside(x, y - 1, z) && world.mastGrid[index.id(x, y - 1, z)] === 1) return true;
    return false;
  }

  function takeStamp(world) {
    world.searchStamp += 1;
    if (world.searchStamp === 4294967295) {
      world.xStamp.fill(0);
      world.searchStamp = 1;
    }
    return world.searchStamp;
  }

  function bumpNav(world) {
    world.navEpoch += 1;
    world.navSerial += 1;
    if (world.navEpoch === 4294967295) {
      world.navStamp.fill(0);
      world.navEpoch = 1;
    }
    world.navCursor = 0;
  }

  function invalidateNav(world, x, y, z) {
    const index = world.index;
    world.navSerial += 1;
    world.metrics.invalidations += 1;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          if (ny < 0 || !index.inside(nx, ny, nz)) continue;
          const id = index.id(nx, ny, nz);
          world.navStamp[id] = 0;
        }
      }
    }
  }

  function invalidateNavBatch(world, blocks) {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.x < minX) minX = block.x;
      if (block.y < minY) minY = block.y;
      if (block.z < minZ) minZ = block.z;
      if (block.x > maxX) maxX = block.x;
      if (block.y > maxY) maxY = block.y;
      if (block.z > maxZ) maxZ = block.z;
    }
    world.navSerial += 1;
    world.metrics.invalidations += 1;
    for (let y = minY - 2; y <= maxY + 2; y++) {
      for (let z = minZ - 2; z <= maxZ + 2; z++) {
        for (let x = minX - 2; x <= maxX + 2; x++) {
          if (y < 0 || !world.index.inside(x, y, z)) continue;
          world.navStamp[world.index.id(x, y, z)] = 0;
        }
      }
    }
  }

  function wakeVehicles(world) {
    world.vehicleWorkSerial += 1;
  }

  // A cell the body can pass through on the way: nothing solid, no door or other built feature.
  function passClear(x, y, z, world) {
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    const id = index.id(x, y, z);
    if (world.solidGrid[id] === 1 || world.doorGrid[id] === 1) return false;
    const block = world.blockGrid[id];
    return !(block && block.built && block.feature);
  }

  function hatchAt(x, y, z, world) {
    const index = world.index;
    if (!index.inside(x, y, z)) return false;
    const block = world.blockGrid[index.id(x, y, z)];
    return !!(block && block.feature === 'hatch');
  }

  // The space a move up or down really goes through (MB.builderPosition draws it the same way):
  // - straight up or down needs a ladder piece spanning the two floors (the piece at the lower one)
  //   or a hatch — a ladder that starts a floor higher can't be reached from the ground;
  // - onto a cube he climbs straight up in his own column first: that cell above him must be free;
  // - off a cube he steps to the edge and drops: the cell over the landing, at his height, must be
  //   free — no jumping down through a cube.
  function climbClear(x, y, z, nx, ny, nz, world) {
    if (!SCAFFOLD.enabled) return true;
    if (nx === x && nz === z) {
      const low = Math.min(y, ny);
      const index = world.index;
      return world.mastGrid[index.id(x, low, z)] === 1 || hatchAt(x, y, z, world) || hatchAt(x, ny, z, world);
    }
    return ny > y ? passClear(x, ny, z, world) : passClear(nx, y, nz, world);
  }

  function collectNeighbors(x, y, z, world) {
    const result = world.neighborIds;
    const index = world.index;
    const step = SCAFFOLD.step;
    result.length = 0;
    function add(nx, ny, nz) {
      if (!index.inside(nx, ny, nz)) return;
      if (Math.abs(ny - y) > step) return;
      if (ny !== y &&
          ((deckCell(x, y, z, world) && !ladderColumn(x, y, z, world)) ||
           (deckCell(nx, ny, nz, world) && !ladderColumn(nx, ny, nz, world)))) return;
      if ((nx !== x || nz !== z) && ny !== y && (ladderColumn(x, y, z, world) || ladderColumn(nx, ny, nz, world))) return;
      if (!canStand(nx, ny, nz, world)) return;
      if (!Features.allowsPassageStep(x, y, z, nx, ny, nz, world)) return;
      if (ny !== y && !climbClear(x, y, z, nx, ny, nz, world)) return;
      const id = index.id(nx, ny, nz);
      for (let n = 0; n < result.length; n++) if (result[n] === id) return;
      result.push(id);
    }
    let dy = 0;
    while (dy <= step) {
      if (dy !== 0) add(x, y + dy, z);
      if (dy !== 0) add(x, y - dy, z);
      for (let i = 0; i < DIRS.length; i++) {
        add(x + DIRS[i][0], y + dy, z + DIRS[i][1]);
        if (dy !== 0) add(x + DIRS[i][0], y - dy, z + DIRS[i][1]);
      }
      dy += 1;
    }
    return result;
  }

  function standNeighbors(x, y, z, world) {
    const index = world.index;
    const id = index.id(x, y, z);
    const result = world.neighborIds;
    if (world.navStamp[id] === world.navEpoch) {
      const start = world.navHead[id];
      const count = world.navCount[id];
      const pool = world.navPool;
      result.length = count;
      for (let i = 0; i < count; i++) result[i] = pool[start + i];
      return result;
    }
    collectNeighbors(x, y, z, world);
    const count = result.length;
    if (world.navCursor + count > world.navPool.length) bumpNav(world);
    const start = world.navCursor;
    const pool = world.navPool;
    for (let i = 0; i < count; i++) pool[start + i] = result[i];
    world.navCursor = start + count;
    world.navHead[id] = start;
    world.navCount[id] = count;
    world.navStamp[id] = world.navEpoch;
    return result;
  }

  function refreshSafeGround(world) {
    if (world.safeGroundSerial === world.navSerial) return;
    world.safeGroundEpoch += 1;
    if (world.safeGroundEpoch === 4294967295) {
      world.safeGroundStamp.fill(0);
      world.safeGroundEpoch = 1;
    }
    const epoch = world.safeGroundEpoch;
    const queue = world.safeGroundQueue;
    const stamp = world.safeGroundStamp;
    const index = world.index;
    queue.length = 0;
    for (let i = 0; i < world.level.spawnPoints.length; i++) {
      const spawn = world.level.spawnPoints[i];
      if (spawn[1] !== 0 || !canStand(spawn[0], 0, spawn[2], world)) continue;
      const id = index.id(spawn[0], 0, spawn[2]);
      if (stamp[id] === epoch) continue;
      stamp[id] = epoch;
      queue.push(id);
    }
    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      index.decodeInto(id, world.safeGroundCell);
      const x = world.safeGroundCell[0];
      const z = world.safeGroundCell[2];
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (!index.inside(nx, 0, nz) || !canStand(nx, 0, nz, world)) continue;
        if (!Features.allowsPassageStep(x, 0, z, nx, 0, nz, world)) continue;
        const nextId = index.id(nx, 0, nz);
        if (stamp[nextId] === epoch) continue;
        stamp[nextId] = epoch;
        queue.push(nextId);
      }
    }
    world.safeGroundSerial = world.navSerial;
  }

  function isSafeGround(cell, world) {
    if (cell[1] !== 0) return false;
    refreshSafeGround(world);
    const id = world.index.id(cell[0], 0, cell[2]);
    return world.safeGroundStamp[id] === world.safeGroundEpoch;
  }

  // Path prices are times, in flat steps at the crew's current speeds (refreshPathPrices): a step onto
  // or off a cube is a flat step plus the climb, a ladder floor is the climb alone. So going round a
  // cube beats climbing over it whenever walking round is actually quicker.
  function moveCost(x, y, z, nx, ny, nz) {
    if (ny === y) return SCAFFOLD.horizontalPrice;
    const climb = SCAFFOLD.verticalPrice * Math.abs(ny - y);
    if (nx === x && nz === z) return climb;
    // Off a cube he jumps: half the climb (segmentSpeed).
    return SCAFFOLD.horizontalPrice + (ny < y ? climb / JUMP_DOWN : climb);
  }

  function refreshPathPrices(world) {
    const walk = walkSpeedNow(world);
    const climb = climbSpeedNow(world);
    if (!(walk > 0) || !(climb > 0)) return;
    SCAFFOLD.horizontalPrice = 1;
    SCAFFOLD.verticalPrice = walk / climb;
    // Setting a ladder or deck piece: its erect time in flat steps.
    SCAFFOLD.ladderPrice = scaffoldSeconds(world.campaign, world.level.pace) * walk;
    SCAFFOLD.deckPrice = SCAFFOLD.ladderPrice;
    SCAFFOLD.elevatorFloorPrice = sessionValue('elevatorSpeed', world.campaign.purchases.elevatorSpeed) * walk;
  }

  function findPath(start, goalIds, world) {
    const started = performance.now();
    world.metrics.pathSearches += 1;
    const path = findRouteAStar(world, null, start, false, goalIds, Infinity, false, false);
    world.metrics.path += performance.now() - started;
    return path;
  }

  function buildSurfaceMode(x, y, z, world) {
    const id = world.index.id(x, y, z);
    let mode = 0;
    if (ladderColumn(x, y, z, world)) mode |= SURFACE_LADDER;
    if (world.deckGrid[id] === 1) mode |= SURFACE_DECK;
    return mode;
  }

  function hasSolidFloor(x, y, z, world) {
    if (y === 0) return true;
    const index = world.index;
    if (!index.inside(x, y - 1, z)) return false;
    const below = index.id(x, y - 1, z);
    return world.solidGrid[below] === 1 || world.bridgeGrid[below] === 1 || world.doorGrid[below] === 1;
  }

  function canBuildBlockFrom(x, y, z, mode, block, world) {
    const dx = block.x - x;
    const dy = block.y - y;
    const dz = block.z - z;
    if ((hasSolidFloor(x, y, z, world) || (!SCAFFOLD.enabled && canStand(x, y, z, world))) &&
        BuildPatterns.allows(0, dx, dy, dz)) return true;
    if ((mode & SURFACE_LADDER) !== 0 && BuildPatterns.allows(1, dx, dy, dz)) return true;
    if ((mode & SURFACE_DECK) !== 0 && BuildPatterns.allows(2, dx, dy, dz)) return true;
    return false;
  }

  function isSupported(block, world) {
    // Window glass goes into its wall cube: ready once that cube and the cube above it (the
    // lintel, if the plan has one) are built.
    if (block.glassOf !== undefined) {
      if (!world.blocks[block.glassOf].built) return false;
      const above = world.index.inside(block.x, block.y + 1, block.z) ? world.blockGrid[world.index.id(block.x, block.y + 1, block.z)] : null;
      return !above || above.built;
    }
    if (block.feature) return Features.supports(block, world);
    if (block.y === 0) return true;
    const index = world.index;
    const below = world.blockGrid[index.id(block.x, block.y - 1, block.z)];
    if (below && below.built && Features.canSupportSolid(below)) return true;
    for (let i = 0; i < DIRS.length; i++) {
      const x = block.x + DIRS[i][0];
      const z = block.z + DIRS[i][1];
      if (!index.inside(x, block.y, z)) continue;
      const neighbor = world.blockGrid[index.id(x, block.y, z)];
      if (neighbor && neighbor.built && Features.canSupportSolid(neighbor)) return true;
    }
    return false;
  }

  // Unbuilt cubes that can never get support: support spreads from built cubes through the unbuilt
  // ones by the real rules (isSupported for plain cubes, Features.supports for beams, slopes,
  // bridges…), treating every cube it reaches as built; whatever it never reaches floats.
  function unbuildableBlocks(world) {
    const index = world.index;
    const pending = world.blocks.filter(function (block) { return !block.built; });
    const reached = new Set();
    const virtual = Object.create(world);
    virtual.built = new Set(world.built);
    virtual.solidGrid = world.solidGrid.slice();
    function solidAt(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      const block = world.blockGrid[index.id(x, y, z)];
      return !!block && virtual.built.has(cellKey(x, y, z)) && Features.canSupportSolid(block);
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < pending.length; i++) {
        const block = pending[i];
        if (reached.has(block)) continue;
        let ok;
        if (block.glassOf !== undefined) {
          ok = virtual.built.has(cellKey(block.x, block.y, block.z)) &&
            (!world.blockByKey.has(cellKey(block.x, block.y + 1, block.z)) || virtual.built.has(cellKey(block.x, block.y + 1, block.z)));
        } else if (block.feature) {
          ok = Features.supports(block, virtual);
        } else {
          ok = block.y === 0 || solidAt(block.x, block.y - 1, block.z);
          for (let d = 0; d < DIRS.length && !ok; d++) ok = solidAt(block.x + DIRS[d][0], block.y, block.z + DIRS[d][1]);
        }
        if (ok) {
          reached.add(block);
          virtual.built.add(cellKey(block.x, block.y, block.z));
          if (!block.feature) virtual.solidGrid[index.id(block.x, block.y, block.z)] = 1;
          grew = true;
        }
      }
    }
    return pending.filter(function (block) { return !reached.has(block); });
  }

  function refreshReadyAround(world, x, y, z) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          if (ny < 0 || !world.index.inside(nx, ny, nz)) continue;
          const block = world.blockGrid[world.index.id(nx, ny, nz)];
          if (block && !block.built) {
            block.ready = isSupported(block, world);
          }
        }
      }
    }
    // Glass of this cell and of the window below (this cube may be its lintel).
    for (let dy = -1; dy <= 0; dy++) {
      const glass = world.glassByKey.get(cellKey(x, y + dy, z));
      if (glass && !glass.built) glass.ready = isSupported(glass, world);
    }
  }

  function refreshReadyBatch(world, blocks) {
    const affected = new Set();
    for (let i = 0; i < blocks.length; i++) {
      const source = blocks[i];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const x = source.x + dx;
            const y = source.y + dy;
            const z = source.z + dz;
            if (y < 0 || !world.index.inside(x, y, z)) continue;
            const block = world.blockGrid[world.index.id(x, y, z)];
            if (block && !block.built) affected.add(block);
          }
        }
      }
      for (let dy = -1; dy <= 0; dy++) {
        const glass = world.glassByKey.get(cellKey(source.x, source.y + dy, source.z));
        if (glass && !glass.built) affected.add(glass);
      }
    }
    for (const block of affected) block.ready = isSupported(block, world);
  }

  function sessionGain(kind, level) {
    return sessionValue(kind, level) - sessionValue(kind, 0);
  }

  function carryKg(campaign) {
    return sessionValue('carry', campaign.purchases.carry) * campaign.metaCarryScale + campaign.metaCarry;
  }

  function planCubeLimit(campaign) {
    return sessionValue('plan', campaign.purchases.plan) + campaign.metaPlan;
  }

  function vehiclePlanLimit(campaign) {
    return VEHICLE.basePlan + campaign.purchases.plan * VEHICLE.planStep;
  }

  function vehicleHeight(campaign) {
    return sessionValue('vehicleHeight', campaign.purchases.vehicleHeight);
  }

  function vehicleReach(campaign) {
    return sessionValue('vehicleReach', campaign.purchases.vehicleReach);
  }

  function scaffoldSeconds(campaign, pace) {
    return SCAFFOLD.erectSeconds * pace /
      sessionValue('scaffold', campaign.purchases.scaffold) /
      campaign.metaScaffold;
  }

  function buildSpeed(campaign, pace) {
    return sessionValue('speed', campaign.purchases.speed) *
      campaign.metaPlaceSpeed * campaign.environmentWorkMultiplier * campaign.foremanRush / pace;
  }

  function floorFactor(y, campaign) {
    const floor = y + 1;
    return 1 + (floor - 1) * BALANCE.heightStep * campaign.metaHeightPenalty;
  }

  function placeSeconds(campaign, pace, block) {
    // «Оконщица»: doors and windows go in at once.
    if (block.feature && campaign.foremen.glazier) return 0;
    // «Тяжеловес»: grid 2+ materials go in faster.
    const heavy = campaign.foremen.heavyMat && MATERIAL[block.materialId].grid >= 2 ? campaign.foremen.heavyMat.value : 1;
    const mass = MATERIAL[block.materialId].cell / heavy;
    return mass / buildSpeed(campaign, pace) * floorFactor(block.y, campaign);
  }

  // Pay is for mass: `units` mini-cubes of the block's material, each weighing one cell.
  // lucky / luckyMultiplier / capitalCoin report the two rolls for the view; the rolls themselves
  // (two Math.random calls per grant, always) are part of the calibrated simulation.
  function grantPlacePay(world, block, units) {
    const campaign = world.campaign;
    const mass = MATERIAL[block.materialId].cell;
    let coins = units * mass * BALANCE.coinPerKg * campaign.metaCoinMultiplier;
    const foremen = campaign.foremen;
    if (block.feature && foremen.glazier) coins *= foremen.glazier.value;
    if (campaign.badWeather && foremen.meteo) coins *= 2;
    if (foremen.earlyCoins && campaign.levelElapsed < 300) coins *= foremen.earlyCoins.value;
    coins *= sessionValue('cubePay', campaign.purchases.cubePay);
    coins *= sessionValue('payMultiplier', campaign.purchases.payMultiplier);
    const floor = block.y + 1;
    coins *= 1 + (floor - 1) * sessionValue('floorPay', campaign.purchases.floorPay);
    const lucky = Math.random() < sessionValue('triplePay', campaign.purchases.triplePay);
    const luckyMultiplier = lucky ? sessionValue('triplePower', campaign.purchases.triplePower) : 1;
    if (lucky) coins *= luckyMultiplier;
    const rounded = Math.round(coins);
    campaign.coins += rounded;
    campaign.coinsEarned = (campaign.coinsEarned || 0) + rounded;
    let capital = Math.round(rounded * sessionValue('budgetCapital', campaign.purchases.budgetCapital));
    const chance = sessionValue('cubeCapital', campaign.purchases.cubeCapital) +
      sessionValue('capitalChance', campaign.purchases.capitalChance);
    const capitalCoin = Math.random() < chance;
    if (capitalCoin) capital += 1;
    return {
      coins: rounded,
      capital: capital,
      lucky: lucky,
      luckyMultiplier: luckyMultiplier,
      capitalCoin: capitalCoin,
    };
  }

  function rollSmoke(campaign) {
    return rollSpan(BALANCE.smokeDesireMin, BALANCE.smokeDesireMax) *
      sessionValue('smokeRare', campaign.purchases.smokeRare) * campaign.metaSmoke;
  }

  function smokeDuration(campaign) {
    return BALANCE.smokeSeconds / sessionValue('smokeShort', campaign.purchases.smokeShort) / campaign.metaSmokeShort;
  }

  function carryWeight(campaign, materialId) {
    const heavy = campaign.foremen.heavyMat && MATERIAL[materialId].grid >= 2 ? campaign.foremen.heavyMat.value : 1;
    return MATERIAL[materialId].cell / sessionValue('lightCarry', campaign.purchases.lightCarry) / heavy;
  }

  function hungerFill(builder) {
    return builder.hunger < BALANCE.hungerMax ? builder.hunger / BALANCE.hungerMax : 1;
  }

  function workSeconds(builder, seconds) {
    seconds /= builder.timeEfficiency || 1;
    // «Повар артели»: a good meal makes the worker faster for a while.
    if (builder.fedLeft > 0) seconds /= builder.fedBoost;
    if (builder.hungerClock < builder.hungerGrace) return seconds;
    const debuff = BALANCE.hungerDebuffMin + (BALANCE.hungerDebuffMax - BALANCE.hungerDebuffMin) * hungerFill(builder);
    return seconds / (1 - debuff);
  }

  // A cube of a material with grid N is built from N³ mini-cubes; workers carry and set them one
  // by one (each one is an atomic placement). Machines and drones move whole cubes.
  function pourGrid(block) {
    return MATERIAL[block.materialId].grid;
  }

  function pourTotal(block) {
    const n = pourGrid(block);
    return n * n * n;
  }

  function pourCoord(index, n) {
    const layer = n * n;
    const y = (index / layer) | 0;
    const rest = index - y * layer;
    const z = (rest / n) | 0;
    const x = rest - z * n;
    return { x: x, y: y, z: z };
  }

  // Session upgrade value as it works on site, with company (meta) bonuses applied.
  function upgradeValue(campaign, kind, level) {
    const value = sessionValue(kind, level);
    if (kind === 'speed') return value * campaign.metaPlaceSpeed;
    if (kind === 'pickup') return value * campaign.metaPickupSpeed;
    if (kind === 'carry') return value * campaign.metaCarryScale + campaign.metaCarry;
    if (kind === 'plan') return value + campaign.metaPlan;
    if (kind === 'horizontal' || kind === 'vertical') return value * campaign.metaMovement;
    if (kind === 'scaffold') return value * campaign.metaScaffold;
    return value;
  }

  // Prices come from the balance (calibrated by pricing.js); the old curves are only a fallback.
  function upgradeCost(kind, purchases) {
    const prices = SESSION_BALANCE[kind] && SESSION_BALANCE[kind].prices;
    if (prices && prices.length > 0) return prices[Math.min(purchases, prices.length - 1)];
    const spec = UPGRADES[kind];
    return Math.round(spec.base * Math.pow(spec.growth, purchases));
  }

function statsOf(campaign, pace) {
  const move = campaign.metaMovement * campaign.environmentMoveMultiplier;
  const current = buildSpeed(campaign, pace);
  const next = sessionValue('speed', campaign.purchases.speed + 1) *
    campaign.metaPlaceSpeed * campaign.environmentWorkMultiplier / pace;
  const horizontal = sessionValue('horizontal', campaign.purchases.horizontal) * move / pace;
  const vertical = sessionValue('vertical', campaign.purchases.vertical) * move / pace;
  return {
    builders: sessionValue('builders', campaign.purchases.builders),
    buildSpeed: current,
    carryKg: carryKg(campaign),
    nextBuilders: sessionValue('builders', campaign.purchases.builders + 1),
    nextBuildSpeed: next,
    nextCarryKg: sessionValue('carry', campaign.purchases.carry + 1) * campaign.metaCarryScale + campaign.metaCarry,
    horizontalSpeed: horizontal,
    nextHorizontalSpeed: sessionValue('horizontal', campaign.purchases.horizontal + 1) * move / pace,
    verticalSpeed: vertical,
    nextVerticalSpeed: sessionValue('vertical', campaign.purchases.vertical + 1) * move / pace,
    planCubes: planCubeLimit(campaign),
    nextPlanCubes: sessionValue('plan', campaign.purchases.plan + 1) + campaign.metaPlan,
    vehicles: sessionValue('vehicles', campaign.purchases.vehicles),
    nextVehicles: sessionValue('vehicles', campaign.purchases.vehicles + 1),
    vehicleHeight: vehicleHeight(campaign),
    nextVehicleHeight: sessionValue('vehicleHeight', campaign.purchases.vehicleHeight + 1),
    vehicleReach: vehicleReach(campaign),
    nextVehicleReach: sessionValue('vehicleReach', campaign.purchases.vehicleReach + 1),
    scaffoldSeconds: scaffoldSeconds(campaign, pace),
    nextScaffoldSeconds: SCAFFOLD.erectSeconds * pace /
      sessionValue('scaffold', campaign.purchases.scaffold + 1) /
      campaign.metaScaffold,
    kitchen: campaign.purchases.kitchen,
    nextKitchen: campaign.purchases.kitchen + 1,
  };
}

  function sealsOther(candidate, world, planned) {
    // Glass goes into a cell that is already solid: it closes nothing.
    if (candidate.glassOf !== undefined) return false;
    const index = world.index;
    const nearby = world.nearbyBlocks;
    nearby.length = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const block = world.blockByKey.get(cellKey(candidate.x + dx, candidate.y + dy, candidate.z + dz));
          if (block && block !== candidate && !block.built) {
            nearby.push(block);
          }
        }
      }
    }
    if (!SCAFFOLD.enabled) {
      for (let i = 0; i < nearby.length; i++) {
        const block = nearby[i];
        let open = false;
        for (let dy = -1; dy <= 1 && !open; dy++) {
          for (let dz = -1; dz <= 1 && !open; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              const x = block.x + dx;
              const y = block.y + dy;
              const z = block.z + dz;
              if (x === candidate.x && y === candidate.y && z === candidate.z) continue;
              if (y < 0 || !index.inside(x, y, z)) continue;
              const id = index.id(x, y, z);
              const future = world.blockGrid[id];
              if (world.solidGrid[id] === 1) continue;
              if (planned.has(id) || (future && future.reserved && !future.built)) continue;
              open = true;
              break;
            }
          }
        }
        if (!open) return true;
      }
      return false;
    }
    if (!canStand(candidate.x, candidate.y, candidate.z, world)) return false;
    for (let i = 0; i < nearby.length; i++) {
      const block = nearby[i];
      if (!block.ready) continue;
      let open = false;
      for (let dy = -1; dy <= 1 && !open; dy++) {
        for (let dz = -1; dz <= 1 && !open; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            const x = block.x + dx;
            const y = block.y + dy;
            const z = block.z + dz;
            if (x === candidate.x && y === candidate.y && z === candidate.z) continue;
            if (y < 0 || !index.inside(x, y, z)) continue;
            const id = index.id(x, y, z);
            const future = world.blockGrid[id];
            if (planned.has(id) || (future && future.reserved && !future.built)) continue;
            if (world.solidGrid[id] === 1) continue;
            const belowId = index.id(x, y - 1, z);
            const belowFuture = world.blockGrid[belowId];
            if (y === 0 ||
                world.mastGrid[id] === 1 ||
                world.deckGrid[id] === 1 ||
                world.solidGrid[index.id(x, y - 1, z)] === 1 ||
                world.bridgeGrid[index.id(x, y - 1, z)] === 1 ||
                world.doorGrid[index.id(x, y - 1, z)] === 1 ||
                (x === candidate.x && y - 1 === candidate.y && z === candidate.z) ||
                planned.has(belowId) ||
                (belowFuture && belowFuture.reserved && !belowFuture.built) ||
                world.mastGrid[index.id(x, y - 1, z)] === 1) {
              open = true;
              break;
            }
          }
        }
      }
      if (!open) return true;
    }
    return false;
  }

  function refreshPlan(builder) {
    const next = [];
    for (let i = 0; i < builder.plan.length; i++) {
      if (!builder.plan[i].built) next.push(builder.plan[i]);
    }
    builder.plan = next;
  }

  function planHasWork(builder) {
    refreshPlan(builder);
    return builder.plan.length > 0;
  }

  function canCompleteAfter(block, world, completed) {
    const index = world.index;

    function completedSolid(x, y, z) {
      if (!completed.has(cellKey(x, y, z))) return false;
      const completedBlock = world.blockByKey.get(cellKey(x, y, z));
      return completedBlock && Features.canSupportSolid(completedBlock);
    }

    function solidThere(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      if (completedSolid(x, y, z)) return true;
      const id = index.id(x, y, z);
      return world.solidGrid[id] === 1 || world.doorGrid[id] === 1;
    }

    if (block.glassOf !== undefined) return block.ready;
    if (block.ready || block.y === 0) return true;
    if (!block.feature) {
      if (completedSolid(block.x, block.y - 1, block.z)) return true;
      for (let i = 0; i < DIRS.length; i++) {
        if (completedSolid(block.x + DIRS[i][0], block.y, block.z + DIRS[i][1])) return true;
      }
      return false;
    }
    if (block.feature === 'door') {
      return solidThere(block.x + block.faceX, block.y - 1, block.z + block.faceZ) &&
        solidThere(block.x - block.faceX, block.y - 1, block.z - block.faceZ);
    }
    if (block.feature === 'balcony' || block.feature === 'greenery') {
      return completed.has(cellKey(block.x - block.faceX, block.y, block.z - block.faceZ)) ||
        world.built.has(cellKey(block.x - block.faceX, block.y, block.z - block.faceZ));
    }
    if (completed.has(cellKey(block.x, block.y - 1, block.z)) ||
        world.built.has(cellKey(block.x, block.y - 1, block.z))) return true;
    for (let i = 0; i < DIRS.length; i++) {
      const x = block.x + DIRS[i][0];
      const z = block.z + DIRS[i][1];
      if (completed.has(cellKey(x, block.y, z)) || world.built.has(cellKey(x, block.y, z))) return true;
    }
    return false;
  }

  // Carry limit of the next trip («Кладовщик»: every N-th trip of the crew carries double).
  function tripCapacity(world) {
    const storekeeper = world.campaign.foremen.storekeeper;
    const doubled = !!storekeeper && (world.foremanTrips + 1) % Math.round(storekeeper.value) === 0;
    return { kg: carryKg(world.campaign) * (doubled ? 2 : 1), doubled: doubled };
  }

  function cubeCarryWeight(world, block) {
    return (pourTotal(block) - block.poured) * carryWeight(world.campaign, block.materialId);
  }

  // A plan is one trip: up to «План работ» cubes and no heavier than the carry, so the worker never
  // comes back for a leftover. A cube heavier than the carry is a plan of its own and goes in parts.
  // builder.planReason (view): 'count' — the plan limit, 'weight' — the next cube would not fit,
  // 'front' — no more free cubes nearby, 'heavy' — one cube heavier than the carry.
  function reservePlan(builder, world) {
    const limit = planCubeLimit(world.campaign);
    const capacity = tripCapacity(world).kg;
    let load = 0;
    let weightBlocked = false;
    const chosen = [];
    const planned = new Set();
    const completed = new Set();
    const candidates = world.orderedBlocks;
    for (let i = 0; i < builder.plan.length; i++) {
      const block = builder.plan[i];
      if (block.built) continue;
      chosen.push(block);
      load += cubeCarryWeight(world, block);
      planned.add(world.index.id(block.x, block.y, block.z));
      completed.add(cellKey(block.x, block.y, block.z));
    }
    let anchor = chosen.length > 0 ? chosen[0] : null;
    if (!anchor && chosen.length < limit) {
      for (let i = 0; i < candidates.length; i++) {
        const block = candidates[i];
        if (block.built || block.reserved || block.failedNavSerial === world.navSerial) continue;
        if (block.owner !== -1) continue;
        if (!block.ready) continue;
        if (sealsOther(block, world, planned)) continue;
        anchor = block;
        chosen.push(block);
        load += cubeCarryWeight(world, block);
        planned.add(world.index.id(block.x, block.y, block.z));
        completed.add(cellKey(block.x, block.y, block.z));
        break;
      }
    }
    const heavy = anchor !== null && load > capacity;
    let added = anchor !== null && !heavy;
    while (added && chosen.length < limit) {
      added = false;
      for (let i = 0; i < candidates.length && chosen.length < limit; i++) {
        const block = candidates[i];
        if (block.built || block.reserved || block.failedNavSerial === world.navSerial) continue;
        if (block.owner !== -1) continue;
        const id = world.index.id(block.x, block.y, block.z);
        if (planned.has(id)) continue;
        if (Math.max(Math.abs(block.x - anchor.x), Math.abs(block.z - anchor.z)) > BALANCE.loadRadius) continue;
        const weight = cubeCarryWeight(world, block);
        if (load + weight > capacity) {
          weightBlocked = true;
          continue;
        }
        if (!canCompleteAfter(block, world, completed)) continue;
        if (sealsOther(block, world, planned)) continue;
        load += weight;
        chosen.push(block);
        planned.add(id);
        completed.add(cellKey(block.x, block.y, block.z));
        added = true;
      }
    }
    for (let i = 0; i < chosen.length; i++) {
      chosen[i].reserved = true;
      chosen[i].owner = builder.index;
    }
    builder.plan = chosen;
    builder.planReason = heavy ? 'heavy' : chosen.length >= limit ? 'count' : weightBlocked ? 'weight' : 'front';
  }

  // Fills the carry from the plan. Also notes for the view why the load stopped growing
  // (builder.haulLimit: 'carry' — the weight limit (the plan was sized by weight, or a cube heavier
  // than the carry goes in parts), 'heavy' — one oversized mini-cube, 'plan' — the plan limit,
  // 'front' — no more free cubes nearby, 'order' — the rest of the plan waits for support or order)
  // and the capacity it was packed against; startHaul turns that into the trip record.
  // The notes never feed back into the simulation.
  function haulFromPlan(builder, world) {
    refreshPlan(builder);
    const trip = tripCapacity(world);
    const doubled = trip.doubled;
    const capacity = trip.kg;
    let left = capacity;
    let split = null;
    const chosen = [];
    const finished = new Set();
    const plan = builder.plan;
    let heavy = null;
    let limit = 'plan';

    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < plan.length; i++) {
        const block = plan[i];
        const key = cellKey(block.x, block.y, block.z);
        if (block.built || finished.has(key) || block.failedNavSerial === world.navSerial) continue;
        if (!canCompleteAfter(block, world, finished)) continue;
        const weight = carryWeight(world.campaign, block.materialId);
        const need = pourTotal(block) - block.poured;
        const remainingWeight = need * weight;
        if (weight > left) {
          if (weight > capacity) {
            if (!heavy) heavy = block;
            continue;
          }
          limit = 'carry';
          grew = false;
          break;
        }
        if (remainingWeight > left && remainingWeight <= capacity) {
          limit = 'carry';
          grew = false;
          break;
        }
        let taken = 0;
        while (taken < need && weight <= left) {
          chosen.push(block);
          left -= weight;
          taken += 1;
        }
        // A cube heavier than the carry goes in parts: this is trip k of n for it.
        const total = pourTotal(block);
        if (taken > 0 && total * weight > capacity) {
          const perTrip = Math.max(1, Math.floor(capacity / weight));
          split = { trip: Math.floor(block.poured / perTrip) + 1, trips: Math.ceil(total / perTrip) };
        }
        if (taken < need) {
          limit = 'carry';
          grew = false;
          break;
        }
        finished.add(key);
        grew = true;
      }
    }
    // Nothing fits the carry limit: take one oversized cube and walk slower.
    if (chosen.length === 0 && heavy) {
      chosen.push(heavy);
      limit = 'heavy';
    } else if (limit === 'plan') {
      // The plan was not used up: an oversized cube stays for a trip of its own (the carry is the
      // limit), anything else waits for its support or the build order.
      for (let i = 0; i < plan.length; i++) {
        const block = plan[i];
        if (block.built || finished.has(cellKey(block.x, block.y, block.z))) continue;
        if (carryWeight(world.campaign, block.materialId) > capacity) {
          limit = 'carry';
          continue;
        }
        limit = 'order';
        break;
      }
    }
    // The whole plan fits by construction, so say what sized the plan: the cube count («План работ»),
    // the weight («Ноша») or the lack of free cubes nearby.
    if (limit === 'plan') {
      const reason = builder.planReason;
      limit = reason === 'weight' || (reason === 'heavy' && split) ? 'carry' : reason === 'front' ? 'front' : 'plan';
    }
    builder.haulLimit = limit;
    builder.haulCapacity = capacity;
    builder.haulDoubled = doubled;
    builder.haulSplit = split;
    return chosen;
  }

  function carriedWeight(builder, world) {
    let weight = 0;
    for (let i = 0; i < builder.carry.length; i++) {
      if (!builder.carry[i].built) weight += carryWeight(world.campaign, builder.carry[i].materialId);
    }
    return weight;
  }

  // Walking slowdown for a load: weight over the base carry limit (not the doubled storekeeper
  // capacity — that is how the trip timing was calibrated).
  function overloadFactor(weight, world) {
    const overload = Math.max(1, weight / carryKg(world.campaign));
    // «Тяжеловес» softens the slowdown of an overloaded trip.
    const soften = world.campaign.foremen.overload;
    return soften ? 1 + (overload - 1) * soften.value : overload;
  }

  function carryOverload(builder, world) {
    return overloadFactor(carriedWeight(builder, world), world);
  }

  // View: what the worker has in hands now. kg — real mini-cube weights («Снижение веса»,
  // «Тяжеловес» applied); capacity — the limit this trip was packed against (doubled on a
  // storekeeper trip), or the current carry limit between trips; fill = kg / capacity;
  // overload — the walking slowdown, the same number as carryOverload. Pass `out` to reuse an object.
  function carryLoad(builder, world, out) {
    const kg = carriedWeight(builder, world);
    const busy = builder.carry.length > 0 || builder.mineQueue.length > 0;
    const capacity = busy && builder.tripCapacity > 0 ? builder.tripCapacity : carryKg(world.campaign);
    const load = out || {};
    load.kg = kg;
    load.capacity = capacity;
    load.fill = capacity > 0 ? kg / capacity : 0;
    load.overload = overloadFactor(kg, world);
    return load;
  }

  function groupPlan(load, world) {
    const map = new Map();
    for (let i = 0; i < load.length; i++) {
      const block = load[i];
      let group = map.get(block.materialId);
      if (!group) {
        group = {
          materialId: block.materialId,
          blocks: [],
          mine: world.level.minesByMaterial[block.materialId],
        };
        map.set(block.materialId, group);
      }
      group.blocks.push(block);
    }
    return Array.from(map.values());
  }

  function createBuilder(index, cell) {
    return {
      index: index,
      shirt: SHIRTS[index % SHIRTS.length],
      homeCell: cell.slice(),
      cell: cell.slice(),
      from: cell.slice(),
      to: cell.slice(),
      segmentT: 1,
      phase: 'plan',
      wait: 0,
      blockedWalkAttempts: 0,
      path: null,
      pathIndex: 0,
      walkPurpose: '',
      needTrip: '',
      timer: BALANCE.planSeconds + index * BALANCE.planStagger,
      actionT: 0,
      carry: [],
      plan: [],
      loadBatchId: -1,
      mineQueue: [],
      erectPiece: null,
      passageBlock: null,
      passageVertical: false,
      routeId: -1,
      routeTargetId: -1,
      faceX: cell[0],
      faceZ: cell[2] + 1,
      hunger: 0,
      hungerClock: 0,
      hungerGrace: rollSpan(BALANCE.hungerGraceMin, BALANCE.hungerGraceMax),
      fatigue: index * 11,
      smokeNeed: 0,
      smokeThreshold: rollSpan(BALANCE.smokeDesireMin, BALANCE.smokeDesireMax),
      trade: 'builder',
      yardSlot: null,
      awayCell: null,
      mealCount: 0,
      restCount: 0,
      smokeCount: 0,
      breakKind: '',
      exitAfterPlace: false,
      forcePlace: false,
      // View-only bookkeeping (never read by the simulation): why the worker waits, the plan
      // it took, the current trip and what that trip has earned so far.
      waitReason: '',
      planTaken: 0,
      planLimit: 0,
      haulLimit: '',
      haulSplit: null,
      planReason: '',
      haulCapacity: 0,
      haulDoubled: false,
      tripLimit: '',
      tripCapacity: 0,
      tripKg: 0,
      tripLoad: 0,
      tripCoins: 0,
      tripCapital: 0,
      tripLucky: 0,
      tripCubes: 0,
      tripPours: 0,
      tripLuckyMultiplier: 1,
      tripBlock: null,
      carryVersion: 0,
    };
  }

  function beginPlanning(builder) {
    builder.waitReason = '';
    builder.needTrip = '';
    builder.phase = 'plan';
    builder.timer = workSeconds(builder, BALANCE.planSeconds);
    builder.actionT = 0;
    builder.faceX = builder.homeCell[0];
    builder.faceZ = builder.homeCell[2] + 1;
  }

  function spawnBuilder(world) {
    const index = world.builders.length;
    const cell = world.level.spawnPoints[index % world.level.spawnPoints.length];
    const builder = createBuilder(index, cell);
    // Only the workers brought by expertise have a rank. Recruits and session hires are regular.
    const ranks = world.campaign.metaWorkerRanks || [];
    builder.timeEfficiency = index < ranks.length ? ranks[index] : 1;
    builder.expertiseRank = index < ranks.length ? ranks[index] : 0;
    builder.timer /= builder.timeEfficiency;
    builder.smokeThreshold = rollSmoke(world.campaign);
    world.builders.push(builder);
    world.events.push({ type: 'spawn', builder: builder });
    return builder;
  }

  function createVehicle(index, cell) {
    return {
      index: index,
      ownerId: -index - 2,
      kind: 'loader',
      pattern: [],
      yard: null,
      flyX: cell[0],
      flyY: 0,
      flyZ: cell[2],
      homeCell: cell.slice(),
      cell: cell.slice(),
      from: cell.slice(),
      to: cell.slice(),
      segmentT: 1,
      phase: 'plan',
      timer: BALANCE.planSeconds,
      buildDuration: 0,
      actionT: 0,
      path: null,
      pathIndex: 0,
      drivePurpose: '',
      driveTarget: null,
      plan: [],
      mineQueue: [],
      parkingCell: null,
      currentBlock: null,
      payloadReady: false,
      payloadHookBlock: null,
      payloadMinY: 0,
      craneStowedHookY: 0,
      craneClearanceY: 0,
      craneLiftSeconds: 0,
      craneExtendSeconds: 0,
      craneLowerSeconds: 0,
      craneDockSeconds: 0,
      faceX: cell[0],
      faceZ: cell[2] + 1,
      currentSpeed: 0,
      heading: 0,
      headingReady: false,
      altitude: TUNING.machines.idleAltitude,
      cableLength: TUNING.machines.heliCarryCable,
      carryDrop: TUNING.machines.loaderCarryDrop,
      hookT: 0,
      carried: false,
      patternMaxY: 0,
      patternSpanX: 0,
      patternSpanZ: 0,
      destMinX: 0,
      destMinY: 0,
      destMinZ: 0,
    };
  }

  function spawnVehicle(world) {
    const index = world.vehicles.length;
    const spawnIndex = world.level.spawnPoints.length - 1 - ((index * 3) % world.level.spawnPoints.length);
    const vehicle = createVehicle(index, world.level.spawnPoints[spawnIndex]);
    world.vehicles.push(vehicle);
    world.events.push({ type: 'spawnVehicle', vehicle: vehicle });
    return vehicle;
  }

  function vehicleCanDrive(x, z, world) {
    const index = world.index;
    if (!index.inside(x, 0, z)) return false;
    const id = index.id(x, 0, z);
    if (world.solidGrid[id] === 1 || world.waterGrid[id] === 1) return false;
    return world.blockGrid[id] === undefined;
  }

  function vehiclePath(from, target, world) {
    const index = world.index;
    from = [Math.round(from[0]), 0, Math.round(from[2])];
    target = [Math.round(target[0]), 0, Math.round(target[2])];
    if (!vehicleCanDrive(target[0], target[2], world)) return null;
    world.vehiclePathEpoch += 1;
    if (world.vehiclePathEpoch === 4294967295) {
      world.vehiclePathStamp.fill(0);
      world.vehiclePathEpoch = 1;
    }
    const epoch = world.vehiclePathEpoch;
    const stamp = world.vehiclePathStamp;
    const previous = world.vehiclePrevious;
    const queue = world.vehicleQueue;
    const startId = index.id(from[0], 0, from[2]);
    const goalId = index.id(target[0], 0, target[2]);
    queue.length = 1;
    queue[0] = startId;
    stamp[startId] = epoch;
    previous[startId] = -1;
    let head = 0;
    while (head < queue.length && stamp[goalId] !== epoch) {
      const id = queue[head++];
      index.decodeInto(id, world.vehicleCell);
      for (let d = 0; d < DIRS.length; d++) {
        const x = world.vehicleCell[0] + DIRS[d][0];
        const z = world.vehicleCell[2] + DIRS[d][1];
        if (!vehicleCanDrive(x, z, world)) continue;
        const nextId = index.id(x, 0, z);
        if (stamp[nextId] === epoch) continue;
        stamp[nextId] = epoch;
        previous[nextId] = id;
        queue.push(nextId);
      }
    }
    if (stamp[goalId] !== epoch) return null;
    const path = [];
    let cursor = goalId;
    while (cursor !== -1) {
      const cell = [0, 0, 0];
      index.decodeInto(cursor, cell);
      path.push(cell);
      cursor = previous[cursor];
    }
    path.reverse();
    return path;
  }

  function vehicleCanReachBlock(parking, block, campaign) {
    const dx = block.x - parking[0];
    const dz = block.z - parking[2];
    const reach = vehicleReach(campaign);
    return dx * dx + dz * dz <= reach * reach &&
      block.y + 1 <= vehicleHeight(campaign);
  }

  function exteriorBlock(block, world) {
    return world.exteriorStamp[world.index.id(block.x, block.y, block.z)] === world.exteriorEpoch;
  }

  function bestVehicleParking(vehicle, anchor, world) {
    let best = null;
    let bestPath = null;
    const reach = vehicleReach(world.campaign);
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx * dx + dz * dz > reach * reach) continue;
        const cell = [anchor.x + dx, 0, anchor.z + dz];
        if (!vehicleCanDrive(cell[0], cell[2], world)) continue;
        const path = vehiclePath(vehicle.cell, cell, world);
        if (!path) continue;
        if (!bestPath || path.length < bestPath.length) {
          best = cell;
          bestPath = path;
        }
      }
    }
    return best ? { cell: best, path: bestPath } : null;
  }

  function touchesVehiclePlan(block, completed) {
    if (completed.has(cellKey(block.x, block.y - 1, block.z))) return true;
    if (completed.has(cellKey(block.x, block.y + 1, block.z))) return true;
    for (let d = 0; d < DIRS.length; d++) {
      if (completed.has(cellKey(block.x + DIRS[d][0], block.y, block.z + DIRS[d][1]))) return true;
    }
    return false;
  }

  function reserveVehiclePlan(vehicle, world) {
    refreshExteriorAir(world);
    const candidates = world.orderedBlocks;
    const limit = vehiclePlanLimit(world.campaign);
    let anchor = null;
    let parking = null;
    for (let i = 0; i < candidates.length; i++) {
      const block = candidates[i];
      if (block.built || block.reserved || block.owner !== -1 || !block.ready) continue;
      if (!exteriorBlock(block, world) || block.y + 1 > vehicleHeight(world.campaign)) continue;
      const candidateParking = bestVehicleParking(vehicle, block, world);
      if (!candidateParking) continue;
      anchor = block;
      parking = candidateParking;
      break;
    }
    if (!anchor) return false;
    const plan = [anchor];
    const completed = new Set([cellKey(anchor.x, anchor.y, anchor.z)]);
    let added = true;
    while (added && plan.length < limit) {
      added = false;
      for (let i = 0; i < candidates.length && plan.length < limit; i++) {
        const block = candidates[i];
        if (block.built || block.reserved || block.owner !== -1) continue;
        const key = cellKey(block.x, block.y, block.z);
        if (completed.has(key) || !touchesVehiclePlan(block, completed)) continue;
        if (!vehicleCanReachBlock(parking.cell, block, world.campaign)) continue;
        if (!exteriorBlock(block, world) || !canCompleteAfter(block, world, completed)) continue;
        plan.push(block);
        completed.add(key);
        added = true;
      }
    }
    for (let i = 0; i < plan.length; i++) {
      plan[i].reserved = true;
      plan[i].owner = vehicle.ownerId;
    }
    vehicle.plan = plan;
    vehicle.parkingCell = parking.cell;
    vehicle.mineQueue = groupPlan(plan, world);
    vehicle.mineQueue.sort(function (a, b) {
      const da = (a.mine.standX - vehicle.cell[0]) * (a.mine.standX - vehicle.cell[0]) +
        (a.mine.standZ - vehicle.cell[2]) * (a.mine.standZ - vehicle.cell[2]);
      const db = (b.mine.standX - vehicle.cell[0]) * (b.mine.standX - vehicle.cell[0]) +
        (b.mine.standZ - vehicle.cell[2]) * (b.mine.standZ - vehicle.cell[2]);
      return da - db;
    });
    return true;
  }

  function releaseVehiclePlan(vehicle) {
    for (let i = 0; i < vehicle.plan.length; i++) {
      const block = vehicle.plan[i];
      if (block.built || block.owner !== vehicle.ownerId) continue;
      block.reserved = false;
      block.owner = -1;
    }
    vehicle.plan = [];
    vehicle.pattern = [];
    vehicle.yard = null;
    vehicle.mineQueue = [];
    vehicle.parkingCell = null;
    vehicle.currentBlock = null;
    vehicle.payloadReady = false;
    vehicle.payloadHookBlock = null;
    if (vehicle.craneStages) {
      vehicle.craneStages = null;
      vehicle.cranePose = craneStow();
    }
    vehicle.carried = false;
  }

  function prepareVehiclePayload(vehicle) {
    let hook = vehicle.plan[0];
    let minY = hook.y;
    for (let i = 1; i < vehicle.plan.length; i++) {
      const block = vehicle.plan[i];
      if (block.y > hook.y) hook = block;
      if (block.y < minY) minY = block.y;
    }
    vehicle.payloadHookBlock = hook;
    vehicle.payloadMinY = minY;
    vehicle.currentBlock = hook;
    vehicle.craneStowedHookY = 0.65 + (hook.y - minY) + 0.55;
    vehicle.craneClearanceY = hook.y + 0.5 + VEHICLE.craneClearance;
  }

  function beginVehicleDrive(vehicle, path, purpose, target) {
    vehicle.path = path;
    vehicle.pathIndex = 0;
    vehicle.drivePurpose = purpose;
    vehicle.driveTarget = target.slice();
    vehicle.from = path[0].slice();
    vehicle.cell = path[0].slice();
    if (path.length === 1) {
      vehicle.to = path[0].slice();
      vehicle.segmentT = 1;
      arriveVehicle(vehicle);
      return;
    }
    vehicle.phase = 'drive';
    vehicle.to = path[1].slice();
    vehicle.segmentT = 0;
    vehicle.faceX = vehicle.to[0];
    vehicle.faceZ = vehicle.to[2];
  }

  // Driving route with as few turns as possible: Dijkstra over (cell, heading) with 8 headings,
  // where any change of heading costs more than any distance. Diagonal steps may not cut corners.
  const ROUTE_DIRS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];
  const ROUTE_TURN_COST = 1000;

  function vehicleRoute(from, target, world) {
    from = [Math.round(from[0]), 0, Math.round(from[2])];
    target = [Math.round(target[0]), 0, Math.round(target[2])];
    if (!vehicleCanDrive(target[0], target[2], world)) return null;
    if (from[0] === target[0] && from[2] === target[2]) return [from];
    const index = world.index;
    const startId = index.id(from[0], 0, from[2]);
    const goalId = index.id(target[0], 0, target[2]);
    const best = new Map();
    const parent = new Map();
    const heap = [];
    function push(cost, state) {
      heap.push([cost, state]);
      let i = heap.length - 1;
      while (i > 0) {
        const up = (i - 1) >> 1;
        if (heap[up][0] <= heap[i][0]) break;
        const swap = heap[up];
        heap[up] = heap[i];
        heap[i] = swap;
        i = up;
      }
    }
    function pop() {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          const swap = heap[m];
          heap[m] = heap[i];
          heap[i] = swap;
          i = m;
        }
      }
      return top;
    }
    const cell = [0, 0, 0];
    for (let d = 0; d < 8; d++) {
      const state = startId * 8 + d;
      best.set(state, 0);
      parent.set(state, -1);
      push(0, state);
    }
    let goal = -1;
    while (heap.length > 0) {
      const item = pop();
      const cost = item[0];
      const state = item[1];
      if (cost > best.get(state)) continue;
      const id = Math.floor(state / 8);
      const dir = state % 8;
      if (id === goalId) {
        goal = state;
        break;
      }
      index.decodeInto(id, cell);
      for (let d = 0; d < 8; d++) {
        const step = ROUTE_DIRS[d];
        const x = cell[0] + step[0];
        const z = cell[2] + step[1];
        if (!vehicleCanDrive(x, z, world)) continue;
        const diagonal = step[0] !== 0 && step[1] !== 0;
        if (diagonal && (!vehicleCanDrive(cell[0] + step[0], cell[2], world) || !vehicleCanDrive(cell[0], cell[2] + step[1], world))) continue;
        const next = index.id(x, 0, z) * 8 + d;
        const nextCost = cost + (diagonal ? Math.SQRT2 : 1) + (d === dir || parent.get(state) === -1 ? 0 : ROUTE_TURN_COST);
        const known = best.get(next);
        if (known !== undefined && known <= nextCost) continue;
        best.set(next, nextCost);
        parent.set(next, state);
        push(nextCost, next);
      }
    }
    if (goal < 0) return null;
    const path = [];
    for (let state = goal; state !== -1; state = parent.get(state)) {
      const p = [0, 0, 0];
      index.decodeInto(Math.floor(state / 8), p);
      path.push(p);
    }
    path.reverse();
    return path;
  }

  function driveVehicleTo(vehicle, target, purpose, world) {
    const path = vehicleRoute(vehicle.cell, target, world);
    if (!path) return false;
    vehicle.world = world;
    beginVehicleDrive(vehicle, path, purpose, target);
    return true;
  }

  function arriveVehicle(vehicle) {
    const world = vehicle.world;
    vehicle.cell = vehicle.to.slice();
    vehicle.from = vehicle.cell.slice();
    vehicle.segmentT = 1;
    if (vehicle.drivePurpose === 'mine') {
      const group = vehicle.mineQueue[0];
      vehicle.phase = 'load';
      vehicle.timer = group.blocks.length * VEHICLE.loadSeconds * world.level.pace;
      vehicle.actionT = 0;
      vehicle.faceX = group.mine.x;
      vehicle.faceZ = group.mine.z;
      return;
    }
    if (vehicle.drivePurpose === 'pickup') {
      beginHook(vehicle);
      return;
    }
    if (vehicle.drivePurpose === 'park') {
      if (vehicle.carried) beginLower(vehicle);
      else beginVehicleBuild(vehicle, world);
      return;
    }
    if (vehicle.drivePurpose === 'home') {
      beginCooldown(vehicle);
      return;
    }
    vehicle.phase = 'plan';
    vehicle.timer = BALANCE.planSeconds;
    vehicle.actionT = 0;
  }

  function driveVehicleToNextMine(vehicle, world) {
    const group = vehicle.mineQueue[0];
    const target = [group.mine.standX, 0, group.mine.standZ];
    if (driveVehicleTo(vehicle, target, 'mine', world)) return;
    releaseVehiclePlan(vehicle);
    driveVehicleHome(vehicle, world);
  }

  function beginCooldown(vehicle) {
    vehicle.phase = 'cooldown';
    vehicle.timer = TUNING.machines.cooldownSeconds;
    vehicle.actionT = 0;
    vehicle.currentSpeed = 0;
    vehicle.carried = false;
    vehicle.hookT = 0;
  }

  function driveVehicleHome(vehicle, world) {
    const home = vehicle.homeCell;
    if (vehicle.kind === 'heli') {
      if (Math.hypot(vehicle.cell[0] - home[0], vehicle.cell[2] - home[2]) < TUNING.machines.homeDistance) {
        beginCooldown(vehicle);
        return;
      }
      beginHeliFlight(vehicle, world, [home[0], 0, home[2]], TUNING.machines.heliReturnAltitude, 'return');
      return;
    }
    if (sameCell(vehicle.cell, home)) {
      beginCooldown(vehicle);
      return;
    }
    if (driveVehicleTo(vehicle, home, 'home', world)) return;
    beginCooldown(vehicle);
  }

  function patternLimits(vehicle, campaign) {
    if (vehicle.kind === 'heli') {
      return {
        mass: sessionValue('heliMass', campaign.purchases.heliMass),
        width: sessionValue('heliWidth', campaign.purchases.heliWidth),
        height: sessionValue('heliHeight', campaign.purchases.heliHeight),
        boom: false,
      };
    }
    return {
      mass: sessionValue('loaderMass', campaign.purchases.loaderMass),
      width: sessionValue('bucket', campaign.purchases.bucket),
      height: sessionValue('patternHeight', campaign.purchases.patternHeight),
      boom: true,
    };
  }

  function clusterSeed(block) {
    return !block.built && !block.reserved && block.owner === -1 && block.ready && !block.feature && block.poured === 0;
  }

  // Cubes a pattern may take besides its anchor: support may come from the pattern itself
  // (canCompleteAfter checks that), so `ready` is not required here.
  function clusterMember(block) {
    return !block.built && !block.reserved && block.owner === -1 && !block.feature && block.poured === 0;
  }

  // Loader parking straight in line with the pattern along X or Z, so the jib runs out along one
  // axis; the jib reach (vehicleReach) is the depth from the parking cell to the pattern centre.
  function axisParking(vehicle, box, world) {
    const reach = vehicleReach(world.campaign);
    const cx = (box.minX + box.maxX + 1) / 2;
    const cz = (box.minZ + box.maxZ + 1) / 2;
    const column = Math.floor(cx);
    const row = Math.floor(cz);
    const options = [];
    // Two cells of clearance keep the chassis (about two cells long) off the pattern footprint.
    for (let z = box.minZ - 2; Math.abs(z + 0.5 - cz) <= reach; z--) options.push([column, 0, z]);
    for (let z = box.maxZ + 2; Math.abs(z + 0.5 - cz) <= reach; z++) options.push([column, 0, z]);
    for (let x = box.minX - 2; Math.abs(x + 0.5 - cx) <= reach; x--) options.push([x, 0, row]);
    for (let x = box.maxX + 2; Math.abs(x + 0.5 - cx) <= reach; x++) options.push([x, 0, row]);
    const drivable = options.filter(function (cell) { return vehicleCanDrive(cell[0], cell[2], world); });
    // Prefer the spot closest to the pattern: a short jib, the machine works right at the wall.
    drivable.sort(function (a, b) {
      return Math.hypot(a[0] + 0.5 - cx, a[2] + 0.5 - cz) - Math.hypot(b[0] + 0.5 - cx, b[2] + 0.5 - cz);
    });
    for (let i = 0; i < drivable.length && i < 8; i++) {
      if (vehiclePath(vehicle.cell, drivable[i], world)) return drivable[i];
    }
    return null;
  }

  function selectCluster(vehicle, world) {
    const limits = patternLimits(vehicle, world.campaign);
    const blocks = world.orderedBlocks;
    const height = vehicleHeight(world.campaign);
    for (let i = 0; i < blocks.length; i++) {
      const anchor = blocks[i];
      if (!clusterSeed(anchor)) continue;
      if (limits.boom && anchor.y + 1 > height) continue;
      const cluster = [anchor];
      const done = new Set([cellKey(anchor.x, anchor.y, anchor.z)]);
      let mass = MATERIAL[anchor.materialId].weight;
      const box = { minX: anchor.x, maxX: anchor.x, minY: anchor.y, maxY: anchor.y, minZ: anchor.z, maxZ: anchor.z };
      let grew = true;
      while (grew) {
        grew = false;
        for (let n = 0; n < blocks.length; n++) {
          const block = blocks[n];
          const key = cellKey(block.x, block.y, block.z);
          if (!clusterMember(block) || done.has(key) || !touchesVehiclePlan(block, done)) continue;
          const nextMass = mass + MATERIAL[block.materialId].weight;
          if (nextMass > limits.mass) continue;
          const nMinX = Math.min(box.minX, block.x);
          const nMaxX = Math.max(box.maxX, block.x);
          const nMinY = Math.min(box.minY, block.y);
          const nMaxY = Math.max(box.maxY, block.y);
          const nMinZ = Math.min(box.minZ, block.z);
          const nMaxZ = Math.max(box.maxZ, block.z);
          if (nMaxX - nMinX + 1 > limits.width || nMaxZ - nMinZ + 1 > limits.width) continue;
          if (nMaxY - nMinY + 1 > limits.height) continue;
          if (limits.boom && block.y + 1 > height) continue;
          if (!canCompleteAfter(block, world, done)) continue;
          cluster.push(block);
          done.add(key);
          mass = nextMass;
          box.minX = nMinX;
          box.maxX = nMaxX;
          box.minY = nMinY;
          box.maxY = nMaxY;
          box.minZ = nMinZ;
          box.maxZ = nMaxZ;
          grew = true;
        }
      }
      let parking = null;
      if (limits.boom) {
        parking = axisParking(vehicle, box, world);
        if (!parking && cluster.length > 1) {
          cluster.length = 1;
          box.minX = box.maxX = anchor.x;
          box.minY = box.maxY = anchor.y;
          box.minZ = box.maxZ = anchor.z;
          parking = axisParking(vehicle, box, world);
        }
        if (!parking) continue;
      }
      return { blocks: cluster, parking: parking, minX: box.minX, minY: box.minY, minZ: box.minZ, width: limits.width };
    }
    return null;
  }

  function yardOrigin(world, vehicle, width) {
    const mine = world.level.mines[0];
    let slot = 0;
    for (let i = 0; i < world.vehicles.length; i++) {
      if (world.vehicles[i] === vehicle) break;
      if (world.vehicles[i].pattern.length > 0) slot += 1;
    }
    return {
      x: mine.x + 8 + slot * (width + 3),
      z: mine.z + 6,
      width: width,
    };
  }

  function beginPattern(vehicle, world) {
    if (sessionValue('engineers', world.campaign.purchases.engineers) < 1) return false;
    const cluster = selectCluster(vehicle, world);
    if (!cluster) return false;
    const yard = yardOrigin(world, vehicle, cluster.width);
    vehicle.yard = yard;
    vehicle.parkingCell = cluster.parking;
    vehicle.plan = cluster.blocks;
    vehicle.pattern = [];
    let maxX = 0;
    let maxY = 0;
    let maxZ = 0;
    for (let i = 0; i < cluster.blocks.length; i++) {
      const block = cluster.blocks[i];
      block.reserved = true;
      block.owner = vehicle.ownerId;
      const localX = block.x - cluster.minX;
      const localY = block.y - cluster.minY;
      const localZ = block.z - cluster.minZ;
      if (localX > maxX) maxX = localX;
      if (localY > maxY) maxY = localY;
      if (localZ > maxZ) maxZ = localZ;
      vehicle.pattern.push({
        block: block,
        localX: localX,
        localY: localY,
        localZ: localZ,
        wx: yard.x + localX,
        wy: localY,
        wz: yard.z + localZ,
        deck: block.y === cluster.minY,
        done: false,
        worker: -1,
        vehicleIndex: vehicle.index,
      });
    }
    vehicle.patternMaxY = maxY;
    vehicle.patternSpanX = maxX;
    vehicle.patternSpanZ = maxZ;
    vehicle.destMinX = cluster.minX;
    vehicle.destMinY = cluster.minY;
    vehicle.destMinZ = cluster.minZ;
    vehicle.phase = 'assemble';
    vehicle.timer = 0.3;
    vehicle.actionT = 0;
    world.events.push({ type: 'yardOpen', vehicle: vehicle, yard: yard });
    return true;
  }

  function beginHeliFlight(vehicle, world, target, altitude, phase) {
    const speed = sessionValue('heliSpeed', world.campaign.purchases.heliSpeed);
    const dx = target[0] - vehicle.cell[0];
    const dz = target[2] - vehicle.cell[2];
    vehicle.phase = phase;
    vehicle.flightSeconds = Math.max(Math.hypot(dx, dz), 0.5) / speed * world.level.pace;
    vehicle.segmentT = 0;
    vehicle.actionT = 0;
    vehicle.flyY = altitude;
    vehicle.flyX = target[0];
    vehicle.flyZ = target[2];
    vehicle.from = vehicle.cell.slice();
    vehicle.to = target.slice();
    vehicle.faceX = target[0];
    vehicle.faceZ = target[2];
    vehicle.world = world;
  }

  // ---------- loader crane ----------
  // A loader's crane moves in separate visible stages: the mast rises, the turret swings (a quick
  // ~1 s turn), the jib runs out, then the hook goes down on its cable. Folding runs them backwards.
  // Mast, jib and cable all travel at the same speed: boomSpeed seconds per cell. Short pauses sit
  // between stages; stages with nothing to move are skipped.
  const CRANE = {
    turretX: 0,
    turretY: 0.78,
    turretZ: -0.35,
    stowMast: 1.75,
    stowReach: 0.9,
    stowCable: 0.45,
    carryCable: 0.6,
    carryLift: 0.35,
    clearance: 2,
    minRaise: 0.8,
    turnSeconds: 1,
    pauseSeconds: 0.2,
  };

  function craneStow() {
    return { mast: CRANE.stowMast, yaw: 0, reach: CRANE.stowReach, cable: CRANE.stowCable, shiftX: 0, shiftZ: 0 };
  }

  function craneTurret(vehicle) {
    const h = vehicle.heading || 0;
    const cx = vehicle.cell[0] + 0.5;
    const cz = vehicle.cell[2] + 0.5;
    return {
      x: cx + CRANE.turretX * Math.cos(h) + CRANE.turretZ * Math.sin(h),
      z: cz - CRANE.turretX * Math.sin(h) + CRANE.turretZ * Math.cos(h),
    };
  }

  // The jib always runs along world X or Z. The turret slides a little on the chassis
  // (shift, in vehicle-local cells) so the jib line passes exactly over the target.
  function craneAim(vehicle, x, z, from) {
    const turret = craneTurret(vehicle);
    const h = vehicle.heading || 0;
    const dx = x - turret.x;
    const dz = z - turret.z;
    let angle = 0;
    let reach = 0;
    let offX = 0;
    let offZ = 0;
    if (Math.abs(dz) >= Math.abs(dx)) {
      angle = dz >= 0 ? 0 : Math.PI;
      reach = Math.abs(dz);
      offX = dx;
    } else {
      angle = dx >= 0 ? Math.PI / 2 : -Math.PI / 2;
      reach = Math.abs(dx);
      offZ = dz;
    }
    return {
      yaw: from.yaw + angleDelta(from.yaw, angle - h),
      reach: Math.max(CRANE.stowReach, reach),
      shiftX: offX * Math.cos(h) - offZ * Math.sin(h),
      shiftZ: offX * Math.sin(h) + offZ * Math.cos(h),
    };
  }

  function patternAnchorPoint(vehicle, atDest) {
    return {
      x: (atDest ? vehicle.destMinX : vehicle.yard.x) + vehicle.patternSpanX / 2 + 0.5,
      y: (atDest ? vehicle.destMinY : 0) + vehicle.patternMaxY + 1,
      z: (atDest ? vehicle.destMinZ : vehicle.yard.z) + vehicle.patternSpanZ / 2 + 0.5,
    };
  }

  function craneCarryPose(vehicle) {
    const front = 1.7 + Math.max(vehicle.patternSpanX, vehicle.patternSpanZ) / 2;
    return {
      mast: vehicle.patternMaxY + 1 + CRANE.carryLift + CRANE.carryCable,
      yaw: 0,
      reach: front - CRANE.turretZ,
      cable: CRANE.carryCable,
      shiftX: 0,
      shiftZ: 0,
    };
  }

  function craneReachPose(vehicle, anchor) {
    const from = vehicle.cranePose || craneStow();
    const aim = craneAim(vehicle, anchor.x, anchor.z, from);
    const mast = Math.max(from.mast + CRANE.minRaise, anchor.y + CRANE.clearance);
    return { mast: mast, yaw: aim.yaw, reach: aim.reach, cable: mast - anchor.y, shiftX: aim.shiftX, shiftZ: aim.shiftZ };
  }

  function beginCrane(vehicle, world, phase, target, unfold) {
    const from = vehicle.cranePose || craneStow();
    const secondsPerCell = sessionValue('boomSpeed', world.campaign.purchases.boomSpeed) * world.level.pace;
    const order = unfold ? ['mast', 'yaw', 'reach', 'cable'] : ['cable', 'reach', 'yaw', 'mast'];
    const stages = [];
    let total = 0;
    for (let i = 0; i < order.length; i++) {
      const kind = order[i];
      let seconds = 0;
      if (kind === 'yaw') {
        const turn = Math.abs(target.yaw - from.yaw);
        const slide = Math.hypot((target.shiftX || 0) - (from.shiftX || 0), (target.shiftZ || 0) - (from.shiftZ || 0));
        if (turn > 0.02 || slide > 0.02) seconds = CRANE.turnSeconds * (0.5 + 0.5 * Math.min(1, turn / Math.PI));
      } else {
        seconds = Math.abs(target[kind] - from[kind]) * secondsPerCell;
      }
      if (seconds < 0.01) continue;
      if (stages.length > 0) {
        stages.push({ kind: 'pause', seconds: CRANE.pauseSeconds });
        total += CRANE.pauseSeconds;
      }
      stages.push({ kind: kind, seconds: seconds });
      total += seconds;
    }
    vehicle.phase = phase;
    vehicle.craneFrom = from;
    vehicle.craneTo = target;
    vehicle.craneStages = stages;
    vehicle.timer = total;
    vehicle.actionT = 0;
    vehicle.currentSpeed = 0;
  }

  function easeStage(t) {
    const x = t < 0 ? 0 : t > 1 ? 1 : t;
    return x * x * (3 - 2 * x);
  }

  // Current crane pose, for the view: stages run one after another.
  function cranePose(vehicle) {
    if (!vehicle.craneStages) return vehicle.cranePose || craneStow();
    const from = vehicle.craneFrom;
    const to = vehicle.craneTo;
    const pose = {
      mast: from.mast,
      yaw: from.yaw,
      reach: from.reach,
      cable: from.cable,
      shiftX: from.shiftX || 0,
      shiftZ: from.shiftZ || 0,
    };
    let left = vehicle.actionT;
    for (let i = 0; i < vehicle.craneStages.length; i++) {
      const stage = vehicle.craneStages[i];
      const t = stage.seconds <= 0 ? 1 : easeStage(left / stage.seconds);
      if (stage.kind === 'yaw') {
        pose.shiftX = (from.shiftX || 0) + ((to.shiftX || 0) - (from.shiftX || 0)) * t;
        pose.shiftZ = (from.shiftZ || 0) + ((to.shiftZ || 0) - (from.shiftZ || 0)) * t;
      }
      if (stage.kind !== 'pause') pose[stage.kind] = from[stage.kind] + (to[stage.kind] - from[stage.kind]) * t;
      left -= stage.seconds;
      if (left < 0) break;
    }
    return pose;
  }

  function advanceCrane(vehicle, world, dt) {
    world.constructionStallElapsed = 0;
    vehicle.actionT += dt;
    if (vehicle.actionT < vehicle.timer) return;
    vehicle.cranePose = vehicle.craneTo;
    vehicle.craneStages = null;
    if (vehicle.phase === 'hook') {
      vehicle.carried = true;
      world.events.push({ type: 'yardRigClear', vehicle: vehicle });
      beginCrane(vehicle, world, 'lift', craneCarryPose(vehicle), false);
      return;
    }
    if (vehicle.phase === 'lift') {
      if (vehicle.parkingCell && driveVehicleTo(vehicle, vehicle.parkingCell, 'park', world)) return;
      releaseVehiclePlan(vehicle);
      vehicle.carried = false;
      vehicle.cranePose = craneStow();
      driveVehicleHome(vehicle, world);
      return;
    }
    if (vehicle.phase === 'lower') {
      finishVehicleBuild(vehicle, world);
      return;
    }
    if (vehicle.phase === 'fold') beginVehicleBuild(vehicle, world);
  }

  function patternCenter(vehicle, originX, originZ) {
    return [originX + vehicle.patternSpanX / 2, originZ + vehicle.patternSpanZ / 2];
  }

  function beginHook(vehicle) {
    if (vehicle.kind !== 'heli') {
      beginCrane(vehicle, vehicle.world, 'hook', craneReachPose(vehicle, patternAnchorPoint(vehicle, false)), true);
      vehicle.carried = false;
      return;
    }
    const travel = vehicle.kind === 'heli'
      ? Math.max(vehicle.altitude - vehicle.patternMaxY - TUNING.machines.heliHookGap, TUNING.machines.hookMinTravel)
      : TUNING.machines.loaderCarryDrop;
    vehicle.phase = 'hook';
    vehicle.timer = travel / TUNING.machines.hookSpeed;
    vehicle.actionT = 0;
    vehicle.hookT = 0;
    vehicle.carried = false;
    vehicle.currentSpeed = 0;
  }

  function beginLower(vehicle) {
    if (vehicle.kind !== 'heli') {
      beginCrane(vehicle, vehicle.world, 'lower', craneReachPose(vehicle, patternAnchorPoint(vehicle, true)), true);
      vehicle.carried = true;
      return;
    }
    vehicle.phase = 'lower';
    vehicle.timer = TUNING.machines.lowerSeconds;
    vehicle.actionT = 0;
    vehicle.hookT = 0;
    vehicle.carried = true;
    vehicle.currentSpeed = 0;
  }

  function beginHeliFetch(vehicle, world) {
    const center = patternCenter(vehicle, vehicle.yard.x, vehicle.yard.z);
    vehicle.payloadReady = false;
    vehicle.carried = false;
    vehicle.hookT = 0;
    beginHeliFlight(vehicle, world, [center[0], 0, center[1]], vehicle.patternMaxY + TUNING.machines.heliFetchExtra, 'fetch');
  }

  function beginHeliDrop(vehicle, world) {
    const center = patternCenter(vehicle, vehicle.destMinX, vehicle.destMinZ);
    vehicle.carried = true;
    vehicle.hookT = 1;
    vehicle.cableLength = TUNING.machines.heliCarryCable;
    const cruise = world.level.footprint.maxY + vehicle.patternMaxY + TUNING.machines.heliCruiseExtra;
    beginHeliFlight(vehicle, world, [center[0], 0, center[1]], cruise, 'fly');
  }

  function arriveHeli(vehicle, world) {
    vehicle.cell = vehicle.to.slice();
    vehicle.from = vehicle.cell.slice();
    vehicle.segmentT = 1;
    vehicle.altitude = vehicle.flyY;
    if (vehicle.phase === 'fetch') {
      beginHook(vehicle);
      return;
    }
    if (vehicle.phase === 'return') {
      beginCooldown(vehicle);
      return;
    }
    beginLower(vehicle);
  }

  function advanceHookPhase(vehicle, world, dt) {
    if (vehicle.kind !== 'heli') {
      advanceCrane(vehicle, world, dt);
      return;
    }
    world.constructionStallElapsed = 0;
    if (vehicle.phase === 'lift' && vehicle.kind === 'heli') {
      const cable = TUNING.machines.heliCarryCable;
      const reel = TUNING.machines.heliReelSpeed * dt;
      if (vehicle.cableLength > cable) {
        vehicle.cableLength = vehicle.cableLength - reel < cable ? cable : vehicle.cableLength - reel;
      }
      const cruise = world.level.footprint.maxY + vehicle.patternMaxY + TUNING.machines.heliCruiseExtra;
      if (vehicle.altitude < cruise) {
        const climb = TUNING.machines.heliClimbSpeed * dt;
        const room = cruise - vehicle.altitude;
        vehicle.altitude += climb < room ? climb : room;
      }
      vehicle.hookT = 1;
      vehicle.carried = true;
      if (vehicle.cableLength > cable || vehicle.altitude < cruise) return;
      beginHeliDrop(vehicle, world);
      return;
    }
    vehicle.actionT += dt;
    const raw = vehicle.actionT / vehicle.timer;
    const t = raw > 1 ? 1 : raw;
    if (vehicle.phase === 'hook') vehicle.hookT = t;
    else if (vehicle.phase === 'lift') {
      vehicle.carried = true;
      vehicle.hookT = 1 - t;
    } else vehicle.hookT = t;
    if (t < 1) return;
    if (vehicle.phase === 'hook') {
      vehicle.carryDrop = vehicle.kind === 'heli'
        ? Math.max(vehicle.altitude - vehicle.patternMaxY - TUNING.machines.heliHookGap, TUNING.machines.hookMinTravel)
        : TUNING.machines.loaderCarryDrop;
      vehicle.cableLength = vehicle.carryDrop;
      vehicle.liftTarget = vehicle.altitude + (vehicle.kind === 'heli' ? 2.5 : 0);
      vehicle.phase = 'lift';
      vehicle.timer = vehicle.carryDrop / TUNING.machines.hookSpeed;
      vehicle.actionT = 0;
      vehicle.carried = true;
      vehicle.hookT = 1;
      world.events.push({ type: 'yardRigClear', vehicle: vehicle });
      return;
    }
    if (vehicle.phase === 'lift') {
      vehicle.hookT = 0;
      if (vehicle.kind === 'heli') beginHeliDrop(vehicle, world);
      else if (vehicle.parkingCell && driveVehicleTo(vehicle, vehicle.parkingCell, 'park', world)) return;
      else releaseVehiclePlan(vehicle);
      return;
    }
    finishVehicleBuild(vehicle, world);
  }

  function advanceHeli(vehicle, world, dt) {
    world.constructionStallElapsed = 0;
    const dx = vehicle.to[0] - vehicle.cell[0];
    const dz = vehicle.to[2] - vehicle.cell[2];
    const dist = Math.hypot(dx, dz);
    const desired = dist > 0.2 ? Math.atan2(dx, dz) : vehicle.heading;
    const speed = moveSpeed(vehicle, world, dt, desired);
    const step = speed * dt;
    if (dist > 0.05) {
      const move = step < dist ? step : dist;
      vehicle.cell[0] += dx / dist * move;
      vehicle.cell[2] += dz / dist * move;
    }
    const dy = vehicle.flyY - vehicle.altitude;
    const climb = step < Math.abs(dy) ? step : Math.abs(dy);
    if (dy > 0) vehicle.altitude += climb;
    else vehicle.altitude -= climb;
    vehicle.faceX = vehicle.cell[0] + Math.sin(vehicle.heading);
    vehicle.faceZ = vehicle.cell[2] + Math.cos(vehicle.heading);
    if (dist > TUNING.machines.arriveDistance || Math.abs(vehicle.flyY - vehicle.altitude) > TUNING.machines.arriveDistance) return;
    arriveHeli(vehicle, world);
  }

  // Park in front of the yard so the pattern hangs right before the crane, not under the wheels.
  function driveToYardFront(vehicle, world) {
    const front = [vehicle.yard.x + Math.floor(vehicle.patternSpanX / 2), 0, vehicle.yard.z - 2];
    if (vehicleCanDrive(front[0], front[2], world) && driveVehicleTo(vehicle, front, 'pickup', world)) return true;
    return driveVehicleTo(vehicle, [vehicle.yard.x, 0, vehicle.yard.z], 'pickup', world);
  }

  function checkPattern(vehicle, world) {
    let pending = 0;
    for (let i = 0; i < vehicle.pattern.length; i++) {
      if (!vehicle.pattern[i].done) pending += 1;
    }
    if (pending > 0) {
      vehicle.phase = 'assemble';
      vehicle.timer = 0.25;
      return;
    }
    if (vehicle.kind === 'heli') beginHeliFetch(vehicle, world);
    else if (vehicle.yard && driveToYardFront(vehicle, world)) return;
    else {
      world.events.push({ type: 'yardClear', vehicle: vehicle });
      if (vehicle.parkingCell && driveVehicleTo(vehicle, vehicle.parkingCell, 'park', world)) return;
      releaseVehiclePlan(vehicle);
    }
  }

  function requestVehiclePlan(vehicle, world) {
    if (world.vehicleNoWorkSerial === world.vehicleWorkSerial) {
      vehicle.phase = 'idle';
      vehicle.timer = 0.5;
      return;
    }
    if (!beginPattern(vehicle, world)) {
      vehicle.phase = 'idle';
      vehicle.timer = 0.5;
    }
  }

  // ---------- construction drones ----------
  // Drones live on their own landing pads. Jobs, by priority:
  //  1. pattern: fetch a cube from its mine into the yard of a machine that is assembling;
  //  2. build: when no pattern is wanted and the drone sits on its pad, it carries one cube
  //     straight to the building and slowly sets it. A build job is never interrupted; the drone
  //     flies home afterwards and only then may take pattern work.
  const DRONE_LANE = 0.5;
  const DRONE_HOVER = 2.4;
  const DRONE_SPACING = 1.15;

  function droneOwnerId(builder) {
    return -100 - builder.index;
  }

  function droneLane(builder) {
    return (builder.droneSlot % 6) * DRONE_LANE;
  }

  function droneSpeedValue(world) {
    return sessionValue('droneSpeed', world.campaign.purchases.droneSpeed) * machineFactor(world) / world.level.pace;
  }

  function droneMineSpot(builder, mine) {
    const angle = builder.droneSlot * 2.399;
    const radius = 1.2 + (builder.droneSlot % 3) * 0.45;
    return [mine.x + 0.5 + Math.cos(angle) * radius, DRONE_HOVER + droneLane(builder) * 0.6, mine.z + 0.5 + Math.sin(angle) * radius];
  }

  function beginDroneFlight(builder, world, target, purpose, cruise) {
    builder.phase = 'fly';
    builder.flyTarget = target;
    builder.flyPurpose = purpose;
    builder.flyCruise = Math.max(cruise, builder.cell[1], target[1]);
    builder.timer = 0;
    builder.actionT = 0;
  }

  function droneBaseCruise(builder) {
    return 3.4 + droneLane(builder);
  }

  // Cargo clears the site three floors above the highest cube built so far (checked once per leg).
  function droneHighCruise(builder, world, block) {
    let top = block ? block.y : 0;
    for (let i = 0; i < world.blocks.length; i++) {
      const other = world.blocks[i];
      if (other.built && other.y > top) top = other.y;
    }
    return top + 3 + droneLane(builder);
  }

  // Smooth flight: climb to the cruise lane, accelerate, brake on approach, then descend.
  function droneFlyStep(builder, world, dt) {
    const target = builder.flyTarget;
    const dx = target[0] - builder.cell[0];
    const dz = target[2] - builder.cell[2];
    const flat = Math.hypot(dx, dz);
    const maxSpeed = droneSpeedValue(world);
    const accel = maxSpeed / 0.6;
    const wantY = flat > 0.9 ? builder.flyCruise : target[1];
    const dy = wantY - builder.cell[1];
    const climb = Math.max(1.2, maxSpeed * 0.7) * dt;
    builder.cell[1] += Math.abs(dy) <= climb ? dy : Math.sign(dy) * Math.min(climb, Math.abs(dy) * 6 * dt + 0.01);
    const cleared = Math.abs(builder.cell[1] - wantY) < 0.6 || flat <= 0.9;
    const brake = Math.sqrt(2 * accel * flat) + 0.15;
    const wanted = cleared ? Math.min(maxSpeed, brake) : 0;
    if (builder.currentSpeed < wanted) builder.currentSpeed = Math.min(wanted, builder.currentSpeed + accel * dt);
    else builder.currentSpeed = Math.max(wanted, builder.currentSpeed - accel * 1.6 * dt);
    if (flat > 0.02) {
      const desired = Math.atan2(dx, dz);
      builder.heading += angleDelta(builder.heading, desired) * Math.min(1, dt * 5);
      const step = Math.min(flat, builder.currentSpeed * dt);
      builder.cell[0] += dx / flat * step;
      builder.cell[2] += dz / flat * step;
    }
    builder.from = builder.cell.slice();
    builder.to = builder.cell.slice();
    return flat < 0.06 && Math.abs(builder.cell[1] - target[1]) < 0.06;
  }

  // Keep flying drones from merging into one point.
  function separateDrone(builder, world, dt) {
    for (let i = 0; i < world.builders.length; i++) {
      const other = world.builders[i];
      if (other === builder || other.trade !== 'engineer') continue;
      const dx = builder.cell[0] - other.cell[0];
      const dy = builder.cell[1] - other.cell[1];
      const dz = builder.cell[2] - other.cell[2];
      const dist = Math.hypot(dx, dy * 1.6, dz);
      if (dist >= DRONE_SPACING) continue;
      const push = (DRONE_SPACING - dist) * Math.min(1, dt * 10);
      if (dist < 0.001) {
        builder.cell[0] += push * Math.cos(builder.droneSlot);
        builder.cell[2] += push * Math.sin(builder.droneSlot);
        continue;
      }
      builder.cell[0] += dx / dist * push;
      builder.cell[2] += dz / dist * push;
      builder.cell[1] += dy / dist * push * 0.5;
    }
  }

  function freePatternSlot(world) {
    for (let v = 0; v < world.vehicles.length; v++) {
      const vehicle = world.vehicles[v];
      if (vehicle.phase !== 'assemble') continue;
      for (let i = 0; i < vehicle.pattern.length; i++) {
        const item = vehicle.pattern[i];
        if (!item.done && item.worker === -1) return item;
      }
    }
    return null;
  }

  function startPatternJob(builder, world, slot) {
    slot.worker = builder.index;
    builder.droneJob = 'pattern';
    builder.yardSlot = slot;
    builder.droneBlock = slot.block;
    const mine = world.level.minesByMaterial[slot.block.materialId] || world.level.mines[0];
    beginDroneFlight(builder, world, droneMineSpot(builder, mine), 'mine', droneBaseCruise(builder));
  }

  // Every machine keeps one drone free for its patterns; only the rest may take slow build jobs.
  function droneMayBuild(world) {
    let drones = 0;
    let building = 0;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade !== 'engineer') continue;
      drones += 1;
      if (builder.droneJob === 'build') building += 1;
    }
    return building < drones - Math.min(drones, world.vehicles.length);
  }

  // Flying builders only set a cube that stands on a built cube or the ground, sits at most two
  // floors above the lowest unbuilt cube, and has nothing built above it in its column (no filling
  // gaps under existing cubes).
  function droneBuildCandidate(world) {
    const blocks = world.orderedBlocks;
    let lowest = Infinity;
    for (let i = 0; i < blocks.length; i++) {
      if (!blocks[i].built && blocks[i].y < lowest) lowest = blocks[i].y;
    }
    const top = world.level.footprint.maxY;
    let best = null;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.built || block.reserved || block.owner !== -1 || !block.ready || block.feature || block.poured > 0) continue;
      if (block.y >= lowest + 3) continue;
      if (best && block.y <= best.y) continue;
      if (block.failedNavSerial === world.navSerial) continue;
      if (block.y > 0 && !world.built.has(cellKey(block.x, block.y - 1, block.z))) continue;
      let covered = false;
      for (let y = block.y + 1; y <= top && !covered; y++) covered = world.built.has(cellKey(block.x, y, block.z));
      if (covered) continue;
      if (sealsOther(block, world, EMPTY_SET)) continue;
      best = block;
    }
    return best;
  }

  function startBuildJob(builder, world, block) {
    block.reserved = true;
    block.owner = droneOwnerId(builder);
    builder.droneJob = 'build';
    builder.droneBlock = block;
    builder.yardSlot = null;
    const mine = world.level.minesByMaterial[block.materialId] || world.level.mines[0];
    beginDroneFlight(builder, world, droneMineSpot(builder, mine), 'mine', droneBaseCruise(builder));
  }

  function droneGoHome(builder, world) {
    builder.droneJob = '';
    builder.yardSlot = null;
    builder.droneBlock = null;
    beginDroneFlight(builder, world, builder.homeCell.slice(), 'home', droneBaseCruise(builder));
  }

  function droneSetBlock(builder, world, block) {
    if (block.built) return;
    const pay = grantPlacePay(world, block, pourTotal(block) - block.poured);
    block.poured = pourTotal(block);
    block.built = true;
    block.reserved = false;
    block.owner = -1;
    world.built.add(cellKey(block.x, block.y, block.z));
    occupyBuiltBlock(block, world);
    refreshReadyAround(world, block.x, block.y, block.z);
    invalidateNav(world, block.x, block.y, block.z);
    pullOut(world, block, builder);
    world.remaining -= 1;
    world.foremanBuilt.push(block);
    world.stats.droneBlocks = (world.stats.droneBlocks || 0) + 1;
    world.constructionStallElapsed = 0;
    wakeVehicles(world);
    world.events.push({
      type: 'place',
      block: block,
      gained: pay.coins,
      capital: pay.capital,
      builder: builder.index,
      drone: true,
      lucky: pay.lucky,
      luckyMultiplier: pay.luckyMultiplier,
      capitalCoin: pay.capitalCoin,
    });
    if (world.remaining === 0) finishLevel(world);
  }

  function arriveDrone(builder, world) {
    const purpose = builder.flyPurpose;
    builder.currentSpeed = 0;
    if (purpose === 'home') {
      builder.phase = 'home';
      builder.wait = 0.2;
      return;
    }
    if (purpose === 'mine') {
      const block = builder.droneBlock;
      if (!block || block.built) {
        droneGoHome(builder, world);
        return;
      }
      builder.phase = 'pick';
      builder.carryMaterial = block.materialId;
      builder.carryColor = MATERIAL[block.materialId].color;
      builder.timer = MATERIAL[block.materialId].weight /
        (sessionValue('gather', world.campaign.purchases.gather) * droneWork(world, 'droneGather')) * world.level.pace + 0.6;
      builder.actionT = 0;
      return;
    }
    if (purpose === 'slot') {
      builder.phase = 'drop';
      builder.timer = 0.55;
      builder.actionT = 0;
      return;
    }
    if (purpose === 'block') {
      const block = builder.droneBlock;
      builder.phase = 'place';
      builder.timer = MATERIAL[block.materialId].weight /
        (sessionValue('droneBuild', world.campaign.purchases.droneBuild) * droneWork(world, 'machines', true)) * world.level.pace;
      builder.actionT = 0;
    }
  }

  function updateEngineer(builder, world, dt) {
    if (builder.phase === 'fly') {
      if (droneFlyStep(builder, world, dt)) arriveDrone(builder, world);
      else separateDrone(builder, world, dt);
      return;
    }
    if (builder.phase === 'home') {
      builder.wait -= dt;
      if (builder.wait > 0) return;
      builder.wait = 0.3;
      if (world.remaining === 0) return;
      const slot = freePatternSlot(world);
      if (slot) {
        startPatternJob(builder, world, slot);
        return;
      }
      const block = droneMayBuild(world) ? droneBuildCandidate(world) : null;
      if (block) {
        startBuildJob(builder, world, block);
        return;
      }
      builder.wait = 1;
      return;
    }
    builder.timer -= dt;
    builder.actionT += dt;
    if (builder.droneJob === 'build') world.constructionStallElapsed = 0;
    if (builder.timer > 0) return;
    if (builder.phase === 'pick') {
      builder.carryingCube = true;
      builder.carryMaterial = builder.droneBlock.materialId;
      builder.carryColor = MATERIAL[builder.droneBlock.materialId].color;
      if (builder.droneJob === 'pattern') {
        const slot = builder.yardSlot;
        beginDroneFlight(builder, world, [slot.wx + 0.5, slot.wy + DRONE_HOVER, slot.wz + 0.5], 'slot', droneBaseCruise(builder));
      } else {
        const block = builder.droneBlock;
        beginDroneFlight(builder, world, [block.x + 0.5, block.y + DRONE_HOVER, block.z + 0.5], 'block', droneHighCruise(builder, world, block));
      }
      return;
    }
    if (builder.phase === 'drop') {
      const slot = builder.yardSlot;
      builder.carryingCube = false;
      let vehicle = null;
      for (let v = 0; v < world.vehicles.length; v++) {
        if (world.vehicles[v].pattern.indexOf(slot) >= 0) vehicle = world.vehicles[v];
      }
      if (vehicle) {
        slot.done = true;
        world.events.push({
          type: 'yardCube',
          vehicle: slot.vehicleIndex,
          x: slot.wx,
          y: slot.wy,
          z: slot.wz,
          materialId: slot.block.materialId,
        });
      }
      const next = freePatternSlot(world);
      if (next) startPatternJob(builder, world, next);
      else droneGoHome(builder, world);
      return;
    }
    if (builder.phase === 'place') {
      builder.carryingCube = false;
      droneSetBlock(builder, world, builder.droneBlock);
      droneGoHome(builder, world);
    }
  }

  function finishVehicleLoad(vehicle, world) {
    vehicle.mineQueue.shift();
    world.constructionStallElapsed = 0;
    if (vehicle.mineQueue.length > 0) {
      driveVehicleToNextMine(vehicle, world);
      return;
    }
    prepareVehiclePayload(vehicle);
    vehicle.payloadReady = true;
    if (!driveVehicleTo(vehicle, vehicle.parkingCell, 'park', world)) {
      releaseVehiclePlan(vehicle);
      driveVehicleHome(vehicle, world);
    }
  }

  function beginVehicleBuild(vehicle, world) {
    while (vehicle.plan.length > 0 && vehicle.plan[0].built) vehicle.plan.shift();
    if (vehicle.plan.length === 0) {
      releaseVehiclePlan(vehicle);
      driveVehicleHome(vehicle, world);
      return;
    }
    const block = vehicle.plan[0];
    if (!isSupported(block, world)) {
      releaseVehiclePlan(vehicle);
      driveVehicleHome(vehicle, world);
      return;
    }
    prepareVehiclePayload(vehicle);
    vehicle.payloadReady = true;
    vehicle.phase = 'build';
    const hook = vehicle.payloadHookBlock;
    const dx = hook.x - vehicle.cell[0];
    const dz = hook.z - vehicle.cell[2];
    const horizontalDistance = Math.hypot(dx, dz);
    vehicle.craneLiftSeconds =
      (vehicle.craneClearanceY - vehicle.craneStowedHookY) / VEHICLE.boomSpeed;
    vehicle.craneExtendSeconds = horizontalDistance / VEHICLE.boomSpeed;
    vehicle.craneLowerSeconds = VEHICLE.craneClearance / VEHICLE.boomSpeed;
    vehicle.craneDockSeconds = sessionValue('boomSpeed', world.campaign.purchases.boomSpeed) * vehicle.plan.length;
    vehicle.timer =
      vehicle.craneLiftSeconds +
      vehicle.craneExtendSeconds +
      vehicle.craneLowerSeconds +
      vehicle.craneDockSeconds;
    vehicle.buildDuration = vehicle.timer;
    vehicle.actionT = 0;
    vehicle.faceX = hook.x;
    vehicle.faceZ = hook.z;
  }

  function finishVehicleBuild(vehicle, world) {
    const plan = vehicle.plan.slice();
    const placed = [];
    let totalGained = 0;
    let totalCapital = 0;
    let luckyCount = 0;
    let luckyCoins = 0;
    let luckyMultiplier = 1;
    let capitalCoins = 0;
    for (let i = 0; i < plan.length; i++) {
      const block = plan[i];
      if (block.built || block.owner !== vehicle.ownerId) continue;
      const pay = grantPlacePay(world, block, pourTotal(block));
      const gained = pay.coins;
      if (pay.lucky) {
        luckyCount += 1;
        luckyCoins += gained;
        luckyMultiplier = pay.luckyMultiplier;
      }
      if (pay.capitalCoin) capitalCoins += 1;
      block.poured = pourTotal(block);
      block.built = true;
      block.reserved = false;
      block.owner = -1;
      totalGained += gained;
      totalCapital += pay.capital;
      world.built.add(cellKey(block.x, block.y, block.z));
      occupyBuiltBlock(block, world);
      world.remaining -= 1;
      world.foremanBuilt.push(block);
      world.stats.vehicleBlocks += 1;
      placed.push(block);
    }
    if (placed.length > 0) {
      refreshReadyBatch(world, placed);
      invalidateNavBatch(world, placed);
      pullOutBatch(world, placed);
      wakeVehicles(world);
      world.events.push({
        type: 'vehiclePlaceBatch',
        blocks: placed,
        gained: totalGained,
        capital: totalCapital,
        luckyCount: luckyCount,
        luckyCoins: luckyCoins,
        luckyMultiplier: luckyMultiplier,
        capitalCoins: capitalCoins,
      });
      world.constructionStallElapsed = 0;
    }
    vehicle.currentBlock = null;
    vehicle.payloadReady = false;
    vehicle.carried = false;
    vehicle.plan.length = 0;
    vehicle.pattern = [];
    vehicle.yard = null;
    world.events.push({ type: 'yardClear', vehicle: vehicle });
    if (world.remaining === 0) {
      releaseVehiclePlan(vehicle);
      vehicle.phase = 'idle';
      vehicle.timer = 0.5;
      finishLevel(world);
      return;
    }
    if (vehicle.kind !== 'heli') {
      beginCrane(vehicle, world, 'fold', craneStow(), false);
      return;
    }
    beginVehicleBuild(vehicle, world);
  }

  function driveRate(vehicle, world) {
    if (vehicle.kind === 'heli') return sessionValue('heliSpeed', world.campaign.purchases.heliSpeed) * machineFactor(world);
    return sessionValue('loaderSpeed', world.campaign.purchases.loaderSpeed) * machineFactor(world);
  }

  function angleDelta(from, to) {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function moveSpeed(vehicle, world, dt, desiredHeading) {
    if (!vehicle.headingReady) {
      vehicle.heading = desiredHeading;
      vehicle.headingReady = true;
    }
    const diff = angleDelta(vehicle.heading, desiredHeading);
    const maxTurn = (Math.PI / 2) / TUNING.machines.turnSeconds * dt;
    if (diff > maxTurn) vehicle.heading += maxTurn;
    else if (diff < -maxTurn) vehicle.heading -= maxTurn;
    else vehicle.heading += diff;
    const max = driveRate(vehicle, world);
    const accel = max / TUNING.machines.accelSeconds;
    const stillTurning = Math.abs(angleDelta(vehicle.heading, desiredHeading)) > TUNING.machines.turnAlign;
    if (stillTurning) vehicle.currentSpeed -= accel * dt;
    else vehicle.currentSpeed += accel * dt;
    if (vehicle.currentSpeed > max) vehicle.currentSpeed = max;
    if (vehicle.currentSpeed < 0) vehicle.currentSpeed = 0;
    return vehicle.currentSpeed;
  }

  function advanceVehicleDrive(vehicle, world, dt) {
    // At a corner the vehicle stops on its cell and turns toward the next waypoint before moving on.
    const waiting = vehicle.segmentT >= 1 && vehicle.pathIndex < vehicle.path.length - 1;
    const aim = waiting ? vehicle.path[vehicle.pathIndex + 1] : vehicle.to;
    const base = waiting ? vehicle.cell : vehicle.from;
    const desired = Math.atan2(aim[0] - base[0], aim[2] - base[2]);
    const rate = moveSpeed(vehicle, world, dt, desired);
    vehicle.faceX = vehicle.cell[0] + Math.sin(vehicle.heading);
    vehicle.faceZ = vehicle.cell[2] + Math.cos(vehicle.heading);
    if (waiting) {
      if (Math.abs(angleDelta(vehicle.heading, desired)) > 0.35) return;
      vehicle.from = vehicle.cell.slice();
      vehicle.to = aim.slice();
      vehicle.segmentT = 0;
    }
    if (rate <= 0) return;
    let left = dt;
    while (left > 0 && vehicle.phase === 'drive') {
      if (!vehicleCanDrive(vehicle.to[0], vehicle.to[2], world)) {
        const path = vehicleRoute(vehicle.cell, vehicle.driveTarget, world);
        if (!path) {
          releaseVehiclePlan(vehicle);
          driveVehicleHome(vehicle, world);
          return;
        }
        beginVehicleDrive(vehicle, path, vehicle.drivePurpose, vehicle.driveTarget);
        return;
      }
      const length = Math.hypot(vehicle.to[0] - vehicle.from[0], vehicle.to[2] - vehicle.from[2]) || 1;
      const remain = (1 - vehicle.segmentT) * length / rate;
      if (left < remain) {
        vehicle.segmentT += left * rate / length;
        return;
      }
      left -= remain;
      vehicle.segmentT = 1;
      vehicle.cell = vehicle.to.slice();
      vehicle.pathIndex += 1;
      world.constructionStallElapsed = 0;
      if (vehicle.pathIndex >= vehicle.path.length - 1) {
        vehicle.to = vehicle.cell.slice();
        arriveVehicle(vehicle);
        return;
      }
      const next = vehicle.path[vehicle.pathIndex + 1];
      const nextHeading = Math.atan2(next[0] - vehicle.cell[0], next[2] - vehicle.cell[2]);
      if (Math.abs(angleDelta(vehicle.heading, nextHeading)) > 0.35) return;
      vehicle.from = vehicle.cell.slice();
      vehicle.to = next.slice();
      vehicle.segmentT = 0;
      vehicle.faceX = vehicle.to[0];
      vehicle.faceZ = vehicle.to[2];
    }
  }

  function updateVehicle(vehicle, world, dt) {
    if (vehicle.phase === 'drive') {
      advanceVehicleDrive(vehicle, world, dt);
      return;
    }
    if (vehicle.phase === 'fetch' || vehicle.phase === 'fly' || vehicle.phase === 'return') {
      advanceHeli(vehicle, world, dt);
      return;
    }
    if (vehicle.phase === 'cooldown') {
      vehicle.timer -= dt;
      if (vehicle.timer > 0) return;
      requestVehiclePlan(vehicle, world);
      return;
    }
    if (vehicle.phase === 'hook' || vehicle.phase === 'lift' || vehicle.phase === 'lower' || vehicle.phase === 'fold') {
      advanceHookPhase(vehicle, world, dt);
      return;
    }
    if (vehicle.phase === 'idle' &&
        world.vehicleNoWorkSerial === world.vehicleWorkSerial) return;
    vehicle.timer -= dt;
    vehicle.actionT += dt;
    if (vehicle.timer > 0) {
      if (vehicle.phase === 'load' || vehicle.phase === 'build') world.constructionStallElapsed = 0;
      return;
    }
    if (vehicle.phase === 'load') finishVehicleLoad(vehicle, world);
    else if (vehicle.phase === 'build' || vehicle.phase === 'fly') finishVehicleBuild(vehicle, world);
    else if (vehicle.phase === 'assemble') checkPattern(vehicle, world);
    else requestVehiclePlan(vehicle, world);
  }

  function beginWalk(builder, path, purpose, world) {
    builder.walkPurpose = purpose;
    builder.path = path;
    builder.pathIndex = 0;
    builder.from = path[0].slice();
    builder.cell = path[0].slice();
    if (path.length === 1) {
      builder.to = path[0].slice();
      builder.segmentT = 1;
      arrive(builder, world);
      return;
    }
    builder.phase = 'walk';
    builder.to = path[1].slice();
    builder.segmentT = 0;
    builder.faceX = builder.to[0];
    builder.faceZ = builder.to[2];
  }

  function arrive(builder, world) {
    builder.cell = builder.to.slice();
    builder.from = builder.cell.slice();
    builder.segmentT = 1;
    if (builder.walkPurpose === 'mine') {
      const group = builder.mineQueue[0];
      builder.phase = 'mine';
      // Picking up goes by mass, like placing: every mini-cube of the group weighs one cell.
      let mass = 0;
      for (let i = 0; i < group.blocks.length; i++) mass += MATERIAL[group.blocks[i].materialId].cell;
      builder.timer = workSeconds(
        builder,
        mass * world.level.pace / (sessionValue('pickup', world.campaign.purchases.pickup) * world.campaign.metaPickupSpeed)
      );
      builder.actionT = 0;
      builder.faceX = group.mine.x;
      builder.faceZ = group.mine.z;
      return;
    }
    if (builder.walkPurpose === 'erect') {
      const piece = builder.erectPiece;
      builder.phase = 'erect';
      builder.timer = workSeconds(builder, scaffoldSeconds(world.campaign, world.level.pace));
      builder.actionT = 0;
      builder.faceX = piece.x;
      builder.faceZ = piece.z;
      return;
    }
    if (builder.walkPurpose === 'meal') {
      builder.phase = 'meal';
      builder.timer = BALANCE.mealSeconds;
      builder.actionT = 0;
      builder.faceX = builder.cell[0];
      builder.faceZ = builder.cell[2] + 1;
      return;
    }
    if (builder.walkPurpose === 'smoke') {
      builder.phase = 'break';
      builder.breakKind = 'smoke';
      builder.timer = smokeDuration(world.campaign);
      builder.actionT = 0;
      builder.faceX = builder.cell[0];
      builder.faceZ = builder.cell[2] + 1;
      return;
    }
    if (builder.walkPurpose === 'out') {
      beginPlanning(builder);
      return;
    }
    if (builder.walkPurpose === 'recover') {
      beginPlanning(builder);
      return;
    }
    if (builder.walkPurpose === 'route') {
      builder.phase = 'idle';
      builder.wait = 0;
      requestWork(builder, world);
      return;
    }
    const block = builder.carry[0];
    if (!block || (!block.built && !canPlaceHere(builder, block, world))) {
      cancelRoute(builder, world);
      continueAfterPlace(builder, world);
      return;
    }
    builder.phase = 'place';
    builder.actionT = 0;
    builder.faceX = block.x;
    builder.faceZ = block.z;
    builder.timer = block.poured >= pourTotal(block) ? 0 : workSeconds(builder, placeSeconds(world.campaign, world.level.pace, block));
  }

  function elevatorPadBy(world, x, z, side) {
    const pads = world.elevatorPads;
    if (!pads) return null;
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (side === 'enter' && pad.enterX === x && pad.enterZ === z) return pad;
      if (side === 'exit' && pad.exitX === x && pad.exitZ === z) return pad;
      if (side === 'lobby' && ((pad.enterX === x && pad.enterZ === z) || (pad.exitX === x && pad.exitZ === z))) return pad;
    }
    return null;
  }

  function elevatorFloors(world) {
    return sessionValue('elevatorHeight', world.campaign.purchases.elevatorHeight);
  }

  function isElevatorHop(from, to, world) {
    const pad = elevatorPadBy(world, from[0], from[2], 'enter');
    if (!pad) return false;
    if (to[0] !== pad.exitX || to[2] !== pad.exitZ) return false;
    if (from[1] === to[1]) return false;
    const height = elevatorFloors(world);
    return from[1] >= 0 && to[1] >= 0 && from[1] < height && to[1] < height;
  }

  function pushElevatorRides(world, x, y, z, price, state, push) {
    const pad = elevatorPadBy(world, x, z, 'enter');
    if (!pad) return;
    const height = elevatorFloors(world);
    if (y < 0 || y >= height) return;
    const index = world.index;
    for (let floor = 0; floor < height; floor++) {
      if (floor === y) continue;
      if (!index.inside(pad.exitX, floor, pad.exitZ)) continue;
      const nextId = index.id(pad.exitX, floor, pad.exitZ);
      const nextMode = buildSurfaceMode(pad.exitX, floor, pad.exitZ, world);
      push(nextId * SURFACE_STATE_COUNT + nextMode, price + Math.abs(floor - y) * SCAFFOLD.elevatorFloorPrice, state, null);
    }
  }

function segmentSpeed(from, to, world) {
  if (isElevatorHop(from, to, world)) {
    const floors = Math.abs(to[1] - from[1]);
    const perFloor = sessionValue('elevatorSpeed', world.campaign.purchases.elevatorSpeed);
    return 1 / (floors * perFloor);
  }
  const walk = walkSpeedNow(world);
  const climb = climbSpeedNow(world);
  const vertical = from[0] === to[0] && from[2] === to[2];
  if (vertical) return climb;
  // Onto a cube: walk up to its face, climb it, step on — the honest sum, no diagonal. Off a cube
  // he jumps down: the drop takes half the climb's time.
  if (from[1] !== to[1]) return 1 / (1 / walk + Math.abs(to[1] - from[1]) / (to[1] > from[1] ? climb : climb * JUMP_DOWN));
  return walk;
}

// Cells per second on flat ground and on a climb (ladder, cube face), with meta, weather and foremen.
function walkSpeedNow(world) {
  const campaign = world.campaign;
  return sessionValue('horizontal', campaign.purchases.horizontal) *
    campaign.metaMovement * campaign.environmentMoveMultiplier * campaign.foremanRush / world.level.pace;
}

function climbSpeedNow(world) {
  const campaign = world.campaign;
  return sessionValue('vertical', campaign.purchases.vertical) *
    campaign.metaMovement * campaign.environmentMoveMultiplier * campaign.foremanRush * campaign.metaClimb / world.level.pace;
}

// Jumping off a cube is this many times faster than climbing it.
const JUMP_DOWN = 2;

// View: where a walking builder is within its segment. A step onto or off a cube is three parts in
// time — walk to the face (feet stay at the lower height going up, at the upper height going down),
// climb straight up or down at the face, then walk onto the cell — so nobody slides diagonally.
// Writes into `out` {x, y, z, mode: 'walk' | 'climb' | 'descend' | 'ladder' | 'ride', climb: 0..1}.
const FACE_GAP = 0.24;
function builderPosition(builder, world, out) {
  const from = builder.from;
  const to = builder.to;
  const t = builder.segmentT;
  out.climb = 0;
  if (builder.phase !== 'walk' || t >= 1) {
    out.x = to[0]; out.y = to[1]; out.z = to[2]; out.mode = 'walk';
    if (builder.phase !== 'walk') { out.x = builder.cell[0]; out.y = builder.cell[1]; out.z = builder.cell[2]; }
    return out;
  }
  if (isElevatorHop(from, to, world)) {
    out.x = from[0]; out.y = from[1]; out.z = from[2]; out.mode = 'ride';
    return out;
  }
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  if (dy === 0 || (dx === 0 && dz === 0)) {
    out.x = from[0] + dx * t; out.y = from[1] + dy * t; out.z = from[2] + dz * t;
    out.mode = dy === 0 ? 'walk' : 'ladder';
    out.climb = dy === 0 ? 0 : t;
    return out;
  }
  const flat = 1 / walkSpeedNow(world);
  const rise = Math.abs(dy) / (dy > 0 ? climbSpeedNow(world) : climbSpeedNow(world) * JUMP_DOWN);
  const total = flat + rise;
  let u;
  if (dy > 0) {
    // Up: he stops just short of the face, climbs straight up it, then steps onto the cell.
    const reach = 0.5 - FACE_GAP;
    const a = flat * reach / total;
    const b = a + rise / total;
    if (t < a) {
      u = reach * t / a;
      out.y = from[1];
      out.mode = 'walk';
    } else if (t < b) {
      u = reach;
      out.climb = (t - a) / (b - a);
      out.y = from[1] + dy * out.climb;
      out.mode = 'climb';
    } else {
      u = reach + (1 - reach) * (t - b) / (1 - b);
      out.y = to[1];
      out.mode = 'walk';
    }
  } else {
    // Down: he walks to the edge and jumps off, travelling FACE_GAP forward in the air (that bit's
    // walking time is part of the jump), then walks on at his usual pace.
    const a = flat * 0.5 / total;
    const b = a + (rise + flat * FACE_GAP) / total;
    if (t < a) {
      u = 0.5 * t / a;
      out.y = from[1];
      out.mode = 'walk';
    } else if (t < b) {
      out.climb = (t - a) / (b - a);
      u = 0.5 + FACE_GAP * out.climb;
      out.y = from[1] + dy * out.climb;
      out.mode = 'descend';
    } else {
      u = 0.5 + FACE_GAP + (0.5 - FACE_GAP) * (t - b) / (1 - b);
      out.y = to[1];
      out.mode = 'walk';
    }
  }
  out.x = from[0] + dx * u;
  out.z = from[2] + dz * u;
  return out;
}

  function canFollowPathStep(builder, from, to, world) {
    if (isElevatorHop(from, to, world)) return true;
    if (!world.index.inside(to[0], to[1], to[2])) return false;
    const nextId = world.index.id(to[0], to[1], to[2]);
    if (builder.walkPurpose === 'recover' &&
        Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]) + Math.abs(from[2] - to[2]) === 1 &&
        (world.solidGrid[nextId] === 1 || canStand(to[0], to[1], to[2], world))) {
      return true;
    }
    const neighbors = standNeighbors(from[0], from[1], from[2], world);
    for (let i = 0; i < neighbors.length; i++) {
      if (neighbors[i] === nextId) return true;
    }
    return false;
  }

  function replanWalk(builder, world) {
    let path = null;
    if (builder.walkPurpose === 'mine') {
      const group = builder.mineQueue[0];
      path = findPathToCell(builder.cell, [group.mine.standX, group.mine.standY, group.mine.standZ], world);
    } else if (builder.walkPurpose === 'erect') {
      const piece = builder.erectPiece;
      const stands = piece.deck ? deckErectStands(piece, world) : mastErectStands(piece, world);
      path = findPath(builder.cell, stands, world);
    } else if (builder.walkPurpose === 'route') {
      const route = builder.routeId >= 0 ? world.routes[builder.routeId] : null;
      if (route && !route.complete && route.stepIndex < route.steps.length) {
        path = findPathToCell(builder.cell, route.steps[route.stepIndex].cell, world);
      }
    } else if (builder.walkPurpose === 'meal' || builder.walkPurpose === 'smoke') {
      path = findPathToCell(builder.cell, builder.awayCell, world);
    } else {
      const spawn = world.level.spawnPoints[builder.index % world.level.spawnPoints.length];
      path = findPathToCell(builder.cell, spawn, world);
    }
    if (path) {
      beginWalk(builder, path, builder.walkPurpose, world);
      return;
    }
    if (sealCommittedCube(builder, world)) return;
    abandonJobAndRecover(builder, world, 'Повторный поиск пути не нашёл маршрут', 'path');
  }

  function advanceWalk(builder, world, dt) {
    let left = dt;
    let guard = 0;
    const overload = carryOverload(builder, world);
    while (left > 0 && builder.phase === 'walk' && guard < 16) {
      guard += 1;
      if (builder.segmentT === 0 && sameCell(builder.from, builder.to)) {
        builder.segmentT = 1;
      }
      if (builder.segmentT === 0 && !canFollowPathStep(builder, builder.from, builder.to, world)) {
        builder.blockedWalkAttempts += 1;
        if (builder.blockedWalkAttempts >= 2) {
          if (sealCommittedCube(builder, world)) return;
          abandonJobAndRecover(builder, world, 'Путь дважды заблокирован в начале шага', 'path');
          return;
        }
        replanWalk(builder, world);
        return;
      }
      const riding = isElevatorHop(builder.from, builder.to, world);
      const speed = segmentSpeed(builder.from, builder.to, world) /
        (riding ? 1 : overload) * haulFactor(builder, world) * (riding ? 1 : builder.timeEfficiency || 1);
      const remain = (1 - builder.segmentT) / speed;
      if (left < remain) {
        builder.segmentT += left * speed;
        builder.blockedWalkAttempts = 0;
        builder.faceX = builder.to[0];
        builder.faceZ = builder.to[2];
        return;
      }
      left -= remain;
      builder.segmentT = 1;
      builder.cell = builder.to.slice();
      builder.blockedWalkAttempts = 0;
      world.constructionStallElapsed = 0;
      builder.pathIndex += 1;
      if (builder.pathIndex >= builder.path.length - 1) {
        builder.to = builder.cell.slice();
        arrive(builder, world);
        return;
      }
      builder.from = builder.to.slice();
      const next = builder.path[builder.pathIndex + 1];
      if (!canFollowPathStep(builder, builder.from, next, world)) {
        builder.blockedWalkAttempts += 1;
        if (builder.blockedWalkAttempts >= 2) {
          if (sealCommittedCube(builder, world)) return;
          abandonJobAndRecover(builder, world, 'Следующая клетка пути дважды заблокирована', 'path');
          return;
        }
        replanWalk(builder, world);
        return;
      }
      builder.to = next.slice();
      builder.segmentT = 0;
      builder.faceX = builder.to[0];
      builder.faceZ = builder.to[2];
    }
  }

  function releaseUnpicked(builder) {
    for (let i = 0; i < builder.mineQueue.length; i++) {
      const blocks = builder.mineQueue[i].blocks;
      for (let j = 0; j < blocks.length; j++) {
        if (!blocks[j].built && blocks[j].owner !== builder.index) blocks[j].reserved = false;
      }
    }
    builder.mineQueue = [];
  }

  function findPathToCell(cell, target, world) {
    if (!world.index.inside(target[0], target[1], target[2])) return null;
    world.singleGoal[0] = world.index.id(target[0], target[1], target[2]);
    return findPath(cell, world.singleGoal, world);
  }

  function walkToNextMine(builder, world) {
    const group = builder.mineQueue[0];
    const stand = [group.mine.standX, group.mine.standY, group.mine.standZ];
    const path = findPathToCell(builder.cell, stand, world);
    if (!path) {
      root.MicroBuildersWorkerLog.record(builder, world, 'Не найден путь к карьеру; текущая ходка отменена');
      releaseUnpicked(builder);
      builder.carry.sort(function (a, b) {
        const ownedA = a.owner === builder.index ? 0 : 1;
        const ownedB = b.owner === builder.index ? 0 : 1;
        return ownedA - ownedB || a.priority - b.priority || a.id - b.id;
      });
      touchCarry(builder);
      if (builder.carry.length > 0) {
        requestWork(builder, world);
        return;
      }
      beginExit(builder, world);
      return;
    }
    beginWalk(builder, path, 'mine', world);
  }

  function clearScaffolds(world) {
    for (let i = 0; i < world.scaffoldPieces.length; i++) {
      const piece = world.scaffoldPieces[i];
      piece.reserved = false;
      piece.built = false;
      piece.removed = true;
      world.mastGrid[world.index.id(piece.x, piece.y, piece.z)] = 0;
    }
    for (let i = 0; i < world.scaffoldDecks.length; i++) {
      const deck = world.scaffoldDecks[i];
      deck.reserved = false;
      deck.built = false;
      deck.removed = true;
      world.deckGrid[world.index.id(deck.x, deck.y, deck.z)] = 0;
    }
    world.events.push({ type: 'strip' });
  }

  function finishLevel(world) {
    if (world.completed || world.remaining > 0) return;
    clearScaffolds(world);
    world.completed = true;
    world.campaign.status = 'complete';
    if (world.campaign.runMode !== 'hq') {
      world.campaign.levelTimes.push(world.campaign.levelElapsed);
      world.campaign.levelStats[world.level.index] = {
        ladders: world.stats.ladders,
        decks: world.stats.decks,
        additionalDoors: world.stats.additionalDoors,
        verticalHatches: world.stats.verticalHatches,
        vehicleBlocks: world.stats.vehicleBlocks,
      };
    }
    world.events.push({ type: 'complete' });
  }

  function hasActiveConstruction(world) {
    for (let i = 0; i < world.vehicles.length; i++) {
      const vehicle = world.vehicles[i];
      if (vehicle.plan.length > 0 || vehicle.mineQueue.length > 0) return true;
      if (vehicle.phase === 'drive' || vehicle.phase === 'load' || vehicle.phase === 'build' ||
          vehicle.phase === 'assemble' || vehicle.phase === 'fetch' || vehicle.phase === 'fly' ||
          vehicle.phase === 'return' || vehicle.phase === 'cooldown' ||
          vehicle.phase === 'hook' || vehicle.phase === 'lift' || vehicle.phase === 'lower' ||
          vehicle.phase === 'fold') return true;
    }
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'engineer') {
        if (builder.droneJob === 'build') return true;
        continue;
      }
      if (builder.carry.length > 0) return true;
      if (builder.mineQueue.length > 0 || builder.erectPiece || builder.routeId >= 0) return true;
      if (builder.phase === 'recover') return true;
      if (builder.phase !== 'idle' &&
          builder.phase !== 'plan' &&
          builder.walkPurpose !== 'out') return true;
    }
    for (let i = 0; i < world.orderedBlocks.length; i++) {
      const block = world.orderedBlocks[i];
      if (block.owner >= 0 && !block.built) return true;
    }
    return false;
  }

  function occupyBuiltBlock(block, world) {
    if (block.glassOf !== undefined) return;
    if (block.feature) Features.occupy(block, world);
    else world.solidGrid[world.index.id(block.x, block.y, block.z)] = 1;
  }

  function autoCompleteUnreachable(world) {
    const blocks = [];
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (block.built) continue;
      block.built = true;
      block.reserved = false;
      block.owner = -1;
      world.built.add(cellKey(block.x, block.y, block.z));
      occupyBuiltBlock(block, world);
      const pay = grantPlacePay(world, block, pourTotal(block) - block.poured);
      block.capitalPay = pay.capital;
      blocks.push(block);
    }
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      builder.carry = builder.carry.filter(function (block) { return !block.built; });
      touchCarry(builder);
    }
    world.autoCompleted = blocks.length;
    world.remaining = 0;
    let capital = 0;
    for (let i = 0; i < blocks.length; i++) capital += blocks[i].capitalPay;
    world.events.push({ type: 'autofill', blocks: blocks, capital: capital });
    finishLevel(world);
  }

  function resolveConstructionStall(world) {
    if (world.remaining === 0) return;
    if (hasActiveConstruction(world)) {
      if (world.constructionStallElapsed < BALANCE.constructionStallSeconds) return;
      for (let i = 0; i < world.vehicles.length; i++) {
        const vehicle = world.vehicles[i];
        if (vehicle.plan.length === 0 &&
            vehicle.mineQueue.length === 0 &&
            vehicle.phase !== 'drive' &&
            vehicle.phase !== 'load' &&
            vehicle.phase !== 'build') continue;
        releaseVehiclePlan(vehicle);
        driveVehicleHome(vehicle, world);
      }
      for (let i = 0; i < world.builders.length; i++) {
        const builder = world.builders[i];
        if (builder.trade === 'engineer') continue;
        if (builder.carry.length === 0 &&
            builder.mineQueue.length === 0 &&
            !builder.erectPiece &&
            builder.routeId < 0 &&
            (builder.phase === 'idle' ||
             builder.phase === 'plan' ||
             builder.walkPurpose === 'out')) continue;
        if (sealCommittedCube(builder, world)) continue;
        abandonJobAndRecover(builder, world, 'Строительство не продвинулось ' + BALANCE.constructionStallSeconds + ' секунд', 'stall');
      }
      world.constructionStallElapsed = 0;
      return;
    }
    if (world.constructionStallElapsed < BALANCE.constructionStallSeconds) return;
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.phase === 'walk' || builder.phase === 'recover') return;
    }
    for (let i = 0; i < world.vehicles.length; i++) {
      if ((world.vehicles[i].phase === 'plan' || world.vehicles[i].phase === 'idle') &&
          world.constructionStallElapsed < BALANCE.constructionStallSeconds) return;
    }
    // Only floating islands are left (nothing can ever support them), or just a sliver of the
    // building: finish it so the site never hangs.
    if (world.remaining / world.blocks.length < BALANCE.unreachableCompletionRatio ||
        unbuildableBlocks(world).length === world.remaining) {
      autoCompleteUnreachable(world);
      return;
    }
    if (world.campaign.runMode !== 'contract' && world.campaign.runMode !== 'school') {
      world.constructionStallElapsed = 0;
      return;
    }
    world.blocked = true;
    world.campaign.status = 'blocked';
    world.events.push({ type: 'blocked', remaining: world.remaining });
  }

  function completeRoute(builder, route, world) {
    route.complete = true;
    route.owner = -1;
    builder.routeId = -1;
  }

  function cancelRoute(builder, world) {
    if (builder.routeId >= 0) {
      completeRoute(builder, world.routes[builder.routeId], world);
    }
    builder.routeTargetId = -1;
  }

  function beginPlannedErect(builder, piece, world) {
    const stands = piece.deck ? deckErectStands(piece, world) : mastErectStands(piece, world);
    const builderId = world.index.id(builder.cell[0], builder.cell[1], builder.cell[2]);
    let canErect = false;
    for (let i = 0; i < stands.length; i++) {
      if (stands[i] === builderId) {
        canErect = true;
        break;
      }
    }
    if (!canErect) return false;
    piece.reserved = true;
    builder.erectPiece = piece;
    beginWalk(builder, [builder.cell.slice()], 'erect', world);
    return true;
  }

  // A built plain cube a passage may be cut through (not the wall cube of a window).
  function cuttableBlock(block) {
    return Boolean(block && block.built && !block.feature && block.glassId === undefined);
  }

  function beginPlannedPassage(builder, block, vertical, world) {
    if (!cuttableBlock(block)) return false;
    builder.passageBlock = block;
    builder.passageVertical = vertical;
    builder.phase = 'passage';
    builder.timer = workSeconds(builder, scaffoldSeconds(world.campaign, world.level.pace));
    builder.actionT = 0;
    builder.faceX = block.x;
    builder.faceZ = block.z;
    return true;
  }

  // View: bumped on every change of builder.carry, so the carried stack is rebuilt only then.
  function touchCarry(builder) {
    builder.carryVersion += 1;
  }

  function bringCarryForward(builder, block) {
    const mine = [];
    const rest = [];
    for (let i = 0; i < builder.carry.length; i++) {
      if (builder.carry[i] === block) mine.push(block);
      else rest.push(builder.carry[i]);
    }
    builder.carry = mine.concat(rest);
    touchCarry(builder);
  }

  function dropCarryBlock(builder, block) {
    const next = [];
    for (let i = 0; i < builder.carry.length; i++) {
      if (builder.carry[i] !== block) next.push(builder.carry[i]);
    }
    builder.carry = next;
    touchCarry(builder);
  }

  function carryHas(builder, block) {
    for (let i = 0; i < builder.carry.length; i++) {
      if (builder.carry[i] === block) return true;
    }
    return false;
  }

  function beginRoutePlacement(builder, route, world) {
    const targetIndex = builder.carry.findIndex(function (block) { return block.id === route.targetId; });
    if (targetIndex < 0) return false;
    const block = builder.carry[targetIndex];
    if (!block.ready || !canPlaceHere(builder, block, world)) return false;
    bringCarryForward(builder, block);
    beginWalk(builder, [builder.cell.slice()], 'place', world);
    return true;
  }

  function continueRoute(builder, world) {
    if (builder.routeId < 0) return ROUTE_NONE;
    const route = world.routes[builder.routeId];
    if (route.complete) {
      builder.routeId = -1;
      return ROUTE_NONE;
    }
    while (route.stepIndex < route.steps.length) {
      const step = route.steps[route.stepIndex];
      const piece = step.piece;
      if (step.passageBlock && step.passageBlock.built && !step.passageBlock.feature) {
        if (beginPlannedPassage(builder, step.passageBlock, step.passageVertical, world)) return ROUTE_STARTED;
        cancelRoute(builder, world);
        return ROUTE_NONE;
      }
      if (piece && (!piece.built || piece.removed)) {
        if (piece.reserved) {
          let reservationActive = false;
          for (let i = 0; i < world.builders.length; i++) {
            if (world.builders[i].erectPiece === piece) {
              reservationActive = true;
              break;
            }
          }
          if (reservationActive) return ROUTE_WAITING;
          piece.reserved = false;
        }
        if (beginPlannedErect(builder, piece, world)) return ROUTE_STARTED;
        root.MicroBuildersWorkerLog.record(builder, world, 'Не удалось начать установку элемента лесов; маршрут отменён');
        cancelRoute(builder, world);
        return ROUTE_NONE;
      }
      if (sameCell(builder.cell, step.cell)) {
        route.stepIndex += 1;
        continue;
      }
      beginWalk(builder, [builder.cell.slice(), step.cell.slice()], 'route', world);
      return ROUTE_STARTED;
    }
    completeRoute(builder, route, world);
    if (beginRoutePlacement(builder, route, world)) return ROUTE_STARTED;
    builder.routeTargetId = -1;
    return ROUTE_NONE;
  }

  function requestWork(builder, world) {
    const started = performance.now();
    const pathBefore = world.metrics.path;
    const scaffoldBefore = world.metrics.scaffoldSearch;
    world.metrics.assignments += 1;
    assignJob(builder, world);
    const nestedPath = world.metrics.path - pathBefore;
    const nestedScaffold = world.metrics.scaffoldSearch - scaffoldBefore;
    world.metrics.scheduler += performance.now() - started - nestedPath - nestedScaffold;
  }

  function carriedRouteTargets(builder, world) {
    const targets = new Set();
    for (let i = 0; i < builder.carry.length; i++) {
      const block = builder.carry[i];
      if (!block.ready || !isSupported(block, world)) continue;
      if (!SCAFFOLD.enabled && sealsOther(block, world, EMPTY_SET)) continue;
      targets.add(block.id);
    }
    return targets;
  }

  // View: the crew's last trips and what limited each load ('carry' | 'heavy' | 'plan' | 'order').
  const TRIP_STATS_SIZE = 20;

  function resetTripPay(builder) {
    builder.tripCoins = 0;
    builder.tripCapital = 0;
    builder.tripLucky = 0;
    builder.tripLuckyMultiplier = 1;
    builder.tripCubes = 0;
    builder.tripPours = 0;
    builder.tripBlock = null;
  }

  // View: a trip leaves — record its shape and the reason haulFromPlan stopped, announce it.
  function beginTrip(builder, world, load) {
    const campaign = world.campaign;
    let kg = 0;
    let cubes = 0;
    for (let i = 0; i < load.length; i++) {
      kg += carryWeight(campaign, load[i].materialId);
      if (i === 0 || load[i] !== load[i - 1]) cubes += 1;
    }
    builder.tripLimit = builder.haulLimit;
    builder.tripCapacity = builder.haulCapacity;
    builder.tripKg = kg;
    builder.tripLoad = load.length;
    resetTripPay(builder);
    if (!world.tripStats) world.tripStats = [];
    world.tripStats.push(builder.tripLimit);
    if (world.tripStats.length > TRIP_STATS_SIZE) world.tripStats.shift();
    world.events.push({
      type: 'trip',
      builder: builder.index,
      minis: load.length,
      cubes: cubes,
      kg: kg,
      capacity: builder.tripCapacity,
      limit: builder.tripLimit,
      // Why the plan (= this trip) is this big: 'count' | 'weight' | 'front' | 'heavy'.
      planReason: builder.planReason || '',
      // A cube heavier than the carry: this is trip `part` of `parts` for it, otherwise null.
      part: builder.haulSplit ? builder.haulSplit.trip : 0,
      parts: builder.haulSplit ? builder.haulSplit.trips : 0,
      overload: overloadFactor(kg, world),
      doubled: builder.haulDoubled,
    });
  }

  // View: the carry is empty after placing — one event with what the whole trip earned.
  function finishTrip(builder, world) {
    if (builder.tripPours > 0) {
      const block = builder.tripBlock;
      world.events.push({
        type: 'tripDone',
        builder: builder.index,
        coins: builder.tripCoins,
        // Not `capital`: consumers add every event's `capital` to the treasury, and the pours
        // already carried it.
        capitalFound: builder.tripCapital,
        lucky: builder.tripLucky,
        luckyMultiplier: builder.tripLuckyMultiplier,
        cubes: builder.tripCubes,
        minis: builder.tripPours,
        x: block.x,
        y: block.y,
        z: block.z,
      });
    }
    resetTripPay(builder);
  }

  // View: share of the crew's last `lastN` trips whose load was limited by `kind` ('carry' counts
  // the single oversized cube too, 'plan', 'order'). Returns { hits, total, share }.
  function tripLimitShare(world, kind, lastN) {
    const stats = world.tripStats || [];
    const total = lastN > 0 ? Math.min(lastN, stats.length) : stats.length;
    let hits = 0;
    for (let i = stats.length - total; i < stats.length; i++) {
      if (stats[i] === kind || (kind === 'carry' && stats[i] === 'heavy')) hits += 1;
    }
    return { hits: hits, total: total, share: total > 0 ? hits / total : 0 };
  }

  function startHaul(builder, world, load) {
    builder.waitReason = '';
    if (departIfNeeded(builder, world)) return;
    world.foremanTrips += 1;
    beginTrip(builder, world, load);
    builder.loadBatchId = world.nextLoadBatchId;
    world.nextLoadBatchId += 1;
    for (let i = 0; i < load.length; i++) {
      load[i].reserved = true;
      load[i].owner = builder.index;
      load[i].loadBatchId = builder.loadBatchId;
    }
    const groups = groupPlan(load, world);
    groups.sort(function (a, b) {
      const da = (a.mine.standX - builder.cell[0]) * (a.mine.standX - builder.cell[0]) + (a.mine.standZ - builder.cell[2]) * (a.mine.standZ - builder.cell[2]);
      const db = (b.mine.standX - builder.cell[0]) * (b.mine.standX - builder.cell[0]) + (b.mine.standZ - builder.cell[2]) * (b.mine.standZ - builder.cell[2]);
      return da - db;
    });
    builder.mineQueue = groups;
    walkToNextMine(builder, world);
  }

  function assignJob(builder, world) {
    builder.waitReason = '';
    if (builder.carry.length > 0) {
      const routeProgress = continueRoute(builder, world);
      if (routeProgress === ROUTE_STARTED) return;
      if (routeProgress === ROUTE_WAITING) {
        builder.phase = 'idle';
        builder.wait = 0.1;
        builder.waitReason = 'path';
        return;
      }
      const targets = carriedRouteTargets(builder, world);
      const route = requestRoute(builder, world, targets);
      if (route) {
        const nextProgress = continueRoute(builder, world);
        if (nextProgress === ROUTE_STARTED) return;
        if (nextProgress === ROUTE_WAITING) {
          builder.phase = 'idle';
          builder.wait = 0.1;
          builder.waitReason = 'path';
          return;
        }
      }
      const pending = collectRouteTargets(world, targets);
      const sealedResult = openSealedTarget(world, pending);
      if (sealedResult.opened > 0) {
        root.MicroBuildersWorkerLog.record(
          builder,
          world,
          'Для доступа к замурованным кубам добавлено дверей: ' + sealedResult.opened
        );
        const openedRoute = requestRoute(builder, world, targets);
        if (openedRoute) {
          const openedProgress = continueRoute(builder, world);
          if (openedProgress === ROUTE_STARTED) return;
          if (openedProgress === ROUTE_WAITING) {
            builder.phase = 'idle';
            builder.wait = 0.1;
            builder.waitReason = 'path';
            return;
          }
        }
      }
      abandonJobAndRecover(
        builder,
        world,
        'Не найден маршрут к кубам из ноши, включая аварийный маршрут; ' +
          sealedFailureText(sealedResult),
        'route'
      );
      return;
    }
    if (world.remaining > 0) {
      if (planHasWork(builder)) {
        const load = haulFromPlan(builder, world);
        if (load.length > 0) {
          startHaul(builder, world, load);
          return;
        }
        builder.phase = 'idle';
        builder.wait = 0.4;
        builder.waitReason = 'front';
        return;
      }
      if (!sameCell(builder.cell, builder.homeCell)) {
        beginExit(builder, world);
        return;
      }
      reservePlan(builder, world);
      builder.planTaken = builder.plan.length;
      builder.planLimit = planCubeLimit(world.campaign);
      if (builder.planTaken > 0) {
        world.events.push({ type: 'plan', builder: builder.index, cubes: builder.planTaken, limit: builder.planLimit, reason: builder.planReason });
      }
      const load = haulFromPlan(builder, world);
      if (load.length > 0) {
        startHaul(builder, world, load);
        return;
      }
      // Nothing free to carry: the same 2 s desk cycle as planning (the timing is calibrated),
      // but for the player it is waiting for a work front.
      beginPlanning(builder);
      builder.waitReason = 'front';
      return;
    }
    finishLevel(world);
    builder.phase = 'idle';
    builder.wait = 0.4;
  }

  function finishMine(builder, world) {
    const group = builder.mineQueue.shift();
    world.constructionStallElapsed = 0;
    if (group) {
      for (let i = 0; i < group.blocks.length; i++) builder.carry.push(group.blocks[i]);
      touchCarry(builder);
    }
    if (builder.mineQueue.length > 0) {
      walkToNextMine(builder, world);
      return;
    }
    builder.phase = 'idle';
    builder.wait = 0;
    builder.carry.sort(function (a, b) {
      const ownedA = a.owner === builder.index ? 0 : 1;
      const ownedB = b.owner === builder.index ? 0 : 1;
      return ownedA - ownedB || a.priority - b.priority || a.id - b.id;
    });
    touchCarry(builder);
    requestWork(builder, world);
  }

  function committedPlaceBlock(builder) {
    if ((builder.phase === 'place' || builder.walkPurpose === 'place') && builder.carry[0] && !builder.carry[0].built) {
      return builder.carry[0];
    }
    if (builder.walkPurpose !== 'route' || builder.routeTargetId < 0) return null;
    for (let i = 0; i < builder.carry.length; i++) {
      const block = builder.carry[i];
      if (block.id === builder.routeTargetId && !block.built) return block;
    }
    return null;
  }

  function sealCommittedCube(builder, world) {
    const block = committedPlaceBlock(builder);
    if (!block || !canPlaceHere(builder, block, world)) return false;
    if (builder.phase === 'place') return true;
    bringCarryForward(builder, block);
    builder.from = builder.cell.slice();
    builder.to = builder.cell.slice();
    builder.segmentT = 1;
    builder.path = null;
    builder.walkPurpose = '';
    builder.phase = 'place';
    builder.forcePlace = true;
    builder.actionT = 0;
    builder.faceX = block.x;
    builder.faceZ = block.z;
    builder.timer = workSeconds(builder, placeSeconds(world.campaign, world.level.pace, block));
    return true;
  }

  function continueAfterPlace(builder, world) {
    builder.forcePlace = false;
    builder.phase = 'idle';
    builder.walkPurpose = '';
    builder.path = null;
    if (builder.carry.length === 0) finishTrip(builder, world);
    if (builder.exitAfterPlace) {
      builder.exitAfterPlace = false;
      if (builder.carry.length === 0) builder.loadBatchId = -1;
      beginExit(builder, world);
      return;
    }
    if (builder.carry.length > 0) {
      requestWork(builder, world);
      return;
    }
    builder.loadBatchId = -1;
    returnForNewTask(builder, world);
  }

  function finishPlace(builder, world) {
    const block = builder.carry[0];
    // A failed route or a stale place state must never grant progress from outside build reach.
    if (!block || (!block.built && !canPlaceHere(builder, block, world))) {
      cancelRoute(builder, world);
      continueAfterPlace(builder, world);
      return;
    }
    if (block.built) {
      dropCarryBlock(builder, block);
      continueAfterPlace(builder, world);
      return;
    }
    const total = pourTotal(block);
    const index = block.poured;
    block.poured += 1;
    block.owner = builder.index;
    block.reserved = true;
    const pay = grantPlacePay(world, block, 1);
    const gained = pay.coins;
    world.events.push({
      type: 'pour',
      block: block,
      index: index,
      gained: gained,
      capital: pay.capital,
      builder: builder.index,
      lucky: pay.lucky,
      luckyMultiplier: pay.luckyMultiplier,
      capitalCoin: pay.capitalCoin,
    });
    builder.tripCoins += gained;
    builder.tripCapital += pay.capital;
    if (pay.lucky) {
      builder.tripLucky += 1;
      builder.tripLuckyMultiplier = pay.luckyMultiplier;
    }
    if (builder.tripBlock !== block) builder.tripCubes += 1;
    builder.tripBlock = block;
    builder.tripPours += 1;
    builder.carry.shift();
    touchCarry(builder);
    world.constructionStallElapsed = 0;
    if (block.poured < total) {
      if (builder.carry.length > 0 && builder.carry[0] === block) {
        builder.timer = workSeconds(builder, placeSeconds(world.campaign, world.level.pace, block));
        builder.actionT = 0;
        return;
      }
      if (!carryHas(builder, block) && builder.routeTargetId === block.id) builder.routeTargetId = -1;
      continueAfterPlace(builder, world);
      return;
    }
    if (builder.routeTargetId === block.id) builder.routeTargetId = -1;
    if (builder.routeId >= 0) {
      const route = world.routes[builder.routeId];
      if (route && route.targetId === block.id) completeRoute(builder, route, world);
    }
    dropCarryBlock(builder, block);
    block.built = true;
    block.reserved = false;
    block.owner = -1;
    world.built.add(cellKey(block.x, block.y, block.z));
    occupyBuiltBlock(block, world);
    refreshReadyAround(world, block.x, block.y, block.z);
    invalidateNav(world, block.x, block.y, block.z);
    pullOut(world, block, builder);
    world.remaining -= 1;
    world.foremanBuilt.push(block);
    wakeVehicles(world);
    world.events.push({ type: 'place', block: block, gained: 0, builder: builder.index });
    refreshPlan(builder);
    builder.blockedWalkAttempts = 0;
    continueAfterPlace(builder, world);
  }

  function returnForNewTask(builder, world) {
    if (planHasWork(builder)) {
      const load = haulFromPlan(builder, world);
      if (load.length > 0) {
        startHaul(builder, world, load);
        return;
      }
      builder.phase = 'idle';
      builder.wait = 0.4;
      builder.waitReason = 'front';
      return;
    }
    if (sameCell(builder.cell, builder.homeCell)) {
      beginPlanning(builder);
      return;
    }
    beginExit(builder, world);
  }

  function builderNeed(builder) {
    if (builder.phase === 'meal' || builder.walkPurpose === 'meal') return 'meal';
    if (builder.phase === 'break') return builder.breakKind;
    if (builder.walkPurpose === 'smoke') return 'smoke';
    return '';
  }

  function rollSpan(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pickPerimeterCell(world, minDist, maxDist) {
    const footprint = world.level.footprint;
    const dist = rollSpan(minDist, maxDist);
    const side = Math.floor(Math.random() * 4);
    const alongX = footprint.maxX - footprint.minX + 1 + dist * 2;
    const alongZ = footprint.maxZ - footprint.minZ + 1 + dist * 2;
    let x = footprint.minX - dist;
    let z = footprint.minZ - dist;
    if (side === 0) {
      x = footprint.minX - dist + Math.floor(Math.random() * alongX);
      z = footprint.maxZ + dist;
    } else if (side === 1) {
      x = footprint.minX - dist + Math.floor(Math.random() * alongX);
      z = footprint.minZ - dist;
    } else if (side === 2) {
      x = footprint.maxX + dist;
      z = footprint.minZ - dist + Math.floor(Math.random() * alongZ);
    } else {
      x = footprint.minX - dist;
      z = footprint.minZ - dist + Math.floor(Math.random() * alongZ);
    }
    return [x, 0, z];
  }

  function startNeedTrip(builder, world, kind) {
    const minDist = kind === 'meal' ? BALANCE.mealMinSquares : BALANCE.smokeMinSquares;
    const maxDist = kind === 'meal' ? BALANCE.mealMaxSquares : BALANCE.smokeMaxSquares;
    const cell = pickPerimeterCell(world, minDist, maxDist);
    builder.awayCell = cell;
    builder.needTrip = kind;
    const path = findPathToCell(builder.cell, cell, world);
    if (path) {
      beginWalk(builder, path, kind, world);
      return;
    }
    builder.phase = 'recover';
    builder.wait = 0.2;
  }

  function departIfNeeded(builder, world) {
    if (builder.carry.length > 0) return false;
    if (builder.hunger >= BALANCE.hungerMax) {
      if (world.campaign.purchases.kitchen > 0) {
        builder.needTrip = 'meal';
        builder.phase = 'meal';
        builder.walkPurpose = '';
        builder.timer = world.campaign.mealKitchenSeconds / sessionValue('kitchen', world.campaign.purchases.kitchen);
        builder.actionT = 0;
        return true;
      }
      startNeedTrip(builder, world, 'meal');
      return true;
    }
    if (builder.smokeNeed >= builder.smokeThreshold) {
      startNeedTrip(builder, world, 'smoke');
      return true;
    }
    return false;
  }

  // Level info «Тайминги»: worker-seconds of every state and sub-state, summed over the crew.
  function timeEntry(builder) {
    const phase = builder.phase;
    const purpose = builder.walkPurpose;
    const loaded = builder.carry.length > 0;
    if (phase === 'meal') return ['Обед', 'Еда'];
    if (phase === 'break') return builder.breakKind === 'rest' ? ['Отдых', 'Отдых'] : ['Перекур', 'Курение'];
    // An empty re-plan is the same desk cycle, but the worker is waiting for free cubes.
    if (phase === 'plan') return builder.waitReason === 'front' ? ['Ожидание', 'Нет свободных кубов'] : ['План работ', 'Получение плана'];
    if (phase === 'mine') return ['Набор материала', 'Набор в карьере'];
    if (phase === 'place') return ['Укладка', 'Установка куба'];
    if (phase === 'erect') return ['Леса и проходы', 'Установка лесов'];
    if (phase === 'passage') return ['Леса и проходы', 'Пробивка прохода'];
    if (phase === 'idle') {
      if (builder.waitReason === 'path') return ['Ожидание', 'Ждёт проход'];
      if (builder.waitReason === 'front') return ['Ожидание', 'Нет свободных кубов'];
      return ['Ожидание', loaded ? 'С грузом, ждёт место' : 'Без задачи'];
    }
    if (phase === 'recover') return ['Аварийный возврат', 'Поиск выхода'];
    if (phase !== 'walk') return ['Прочее', phase];
    if (purpose === 'meal') return ['Обед', 'Путь к месту обеда'];
    if (purpose === 'smoke') return ['Перекур', 'Путь на перекур'];
    if (purpose === 'mine') return ['Набор материала', loaded ? 'Переход между карьерами' : 'Путь к карьеру'];
    if (purpose === 'route') return loaded ? ['Укладка', 'Путь с грузом к месту'] : ['Леса и проходы', 'Путь по маршруту'];
    if (purpose === 'erect') return ['Леса и проходы', 'Путь к лесам'];
    if (purpose === 'recover') return ['Аварийный возврат', 'Путь к столу'];
    if (purpose === 'out') {
      if (builder.needTrip === 'meal') return ['Обед', 'Путь обратно'];
      if (builder.needTrip === 'smoke') return ['Перекур', 'Путь обратно'];
      return ['План работ', 'Путь к столу за планом'];
    }
    return ['Прочее', 'Ходьба'];
  }

  function recordTime(builder, world, dt) {
    const entry = timeEntry(builder);
    let state = world.timeLedger[entry[0]];
    if (!state) state = world.timeLedger[entry[0]] = {};
    state[entry[1]] = (state[entry[1]] || 0) + dt;
  }

  function updateBuilder(builder, world, dt) {
    if (builder.trade === 'engineer') {
      updateEngineer(builder, world, dt);
      return;
    }
    // waitReason describes a plan/idle wait only; any other phase means the wait is over.
    if (builder.waitReason !== '' && builder.phase !== 'plan' && builder.phase !== 'idle') builder.waitReason = '';
    recordTime(builder, world, dt);
    if (builder.fedLeft > 0) builder.fedLeft -= dt;
    if (builder.phase === 'meal' || builder.phase === 'break') {
      world.constructionStallElapsed = 0;
      builder.timer -= dt;
      builder.actionT += dt;
      if (builder.timer <= 0) {
        if (builder.phase === 'meal') {
          builder.hunger = 0;
          builder.hungerClock = 0;
          // «Повар артели»: after anyone's meal the whole crew works faster for a while.
          const feast = world.campaign.foremen.feast;
          if (feast) world.feastUntil = world.campaign.levelElapsed + feast.second;
          builder.hungerGrace = rollSpan(BALANCE.hungerGraceMin, BALANCE.hungerGraceMax) * world.campaign.metaHunger;
          builder.mealCount += 1;
          builder.awayCell = null;
          beginExit(builder, world);
        } else if (builder.breakKind === 'rest') {
          builder.fatigue = 0;
          builder.restCount += 1;
          refreshAfterBreak(builder, world);
          beginPlanning(builder);
        } else {
          builder.smokeNeed = 0;
          refreshAfterBreak(builder, world);
          builder.smokeThreshold = rollSmoke(world.campaign);
          builder.smokeCount += 1;
          builder.awayCell = null;
          beginExit(builder, world);
        }
      }
      return;
    }
    if (builder.walkPurpose !== 'meal') {
      builder.hungerClock += dt;
      builder.hunger = builder.hungerClock < builder.hungerGrace ? 0 : builder.hungerClock - builder.hungerGrace;
    }
    builder.fatigue += dt;
    if (builder.walkPurpose !== 'smoke') builder.smokeNeed += dt;
    if (builder.fatigue >= world.campaign.restInterval + builder.index * BALANCE.restStagger &&
        (builder.phase === 'idle' || builder.phase === 'plan') &&
        builder.carry.length === 0) {
      builder.waitReason = '';
      builder.phase = 'break';
      builder.breakKind = 'rest';
      builder.timer = world.campaign.restSeconds;
      builder.actionT = 0;
      return;
    }
    if (builder.phase === 'idle') {
      builder.wait -= dt;
      if (builder.wait <= 0) {
        requestWork(builder, world);
      }
      return;
    }
    if (builder.phase === 'recover') {
      builder.wait -= dt;
      if (builder.wait <= 0) continueRecovery(builder, world);
      return;
    }
    if (builder.phase === 'plan') {
      builder.actionT += dt;
      builder.timer -= dt;
      if (builder.timer <= 0) requestWork(builder, world);
      return;
    }
    if (builder.phase === 'walk') {
      advanceWalk(builder, world, dt);
      return;
    }
    builder.actionT += dt;
    builder.timer -= dt;
    if (builder.timer > 0) {
      world.constructionStallElapsed = 0;
      return;
    }
    if (builder.phase === 'mine') finishMine(builder, world);
    else if (builder.phase === 'erect') finishErect(builder, world);
    else if (builder.phase === 'passage') finishPassage(builder, world);
    else finishPlace(builder, world);
  }

  function canPlaceHere(builder, block, world) {
    const x = builder.cell[0];
    const y = builder.cell[1];
    const z = builder.cell[2];
    return canBuildBlockFrom(x, y, z, buildSurfaceMode(x, y, z, world), block, world);
  }

  function sameCell(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  function escapePath(from, target, world) {
    const index = world.index;
    const startId = index.id(from[0], from[1], from[2]);
    const goalId = index.id(target[0], target[1], target[2]);
    if (startId === goalId) return [from.slice()];
    const mark = takeStamp(world);
    const seen = world.xStamp;
    const prev = world.prev;
    const at = world.at;
    const grid = world.solidGrid;
    seen[startId] = mark;
    prev[startId] = -1;
    const queue = world.escapeQueue;
    queue.length = 1;
    queue[0] = startId;
    let head = 0;
    let found = false;
    function walkable(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      const id = index.id(x, y, z);
      if (grid[id] === 1) return true;
      return canStand(x, y, z, world);
    }
    while (head < queue.length) {
      const currentId = queue[head++];
      if (currentId === goalId) {
        found = true;
        break;
      }
      index.decodeInto(currentId, at);
      const x = at[0];
      const y = at[1];
      const z = at[2];
      const normalNeighbors = standNeighbors(x, y, z, world);
      for (let n = 0; n < normalNeighbors.length; n++) {
        const id = normalNeighbors[n];
        index.decodeInto(id, world.nxt);
        if (world.nxt[1] !== y &&
            !ladderColumn(x, y, z, world) &&
            !ladderColumn(world.nxt[0], world.nxt[1], world.nxt[2], world)) continue;
        if (seen[id] === mark) continue;
        seen[id] = mark;
        prev[id] = currentId;
        queue.push(id);
      }
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (!walkable(nx, y, nz)) continue;
        const id = index.id(nx, y, nz);
        if (seen[id] === mark) continue;
        seen[id] = mark;
        prev[id] = currentId;
        queue.push(id);
      }
      for (let direction = -1; direction <= 1; direction += 2) {
        const ny = y + direction;
        if (!walkable(x, ny, z)) continue;
        const id = index.id(x, ny, z);
        if (seen[id] === mark) continue;
        seen[id] = mark;
        prev[id] = currentId;
        queue.push(id);
      }
    }
    if (!found) return null;
    const path = [];
    let cursor = goalId;
    while (cursor !== -1) {
      const cell = [0, 0, 0];
      index.decodeInto(cursor, cell);
      path.push(cell);
      cursor = prev[cursor];
    }
    path.reverse();
    return path;
  }

  function releaseHands(builder) {
    builder.forcePlace = false;
    builder.exitAfterPlace = false;
    if (builder.erectPiece && !builder.erectPiece.removed) builder.erectPiece.reserved = false;
    builder.erectPiece = null;
    builder.passageBlock = null;
    builder.passageVertical = false;
    releaseUnpicked(builder);
  }

  // kind (view): 'path' — the way got blocked, 'route' — no route to the carried cubes,
  // 'stall' — the whole site stopped progressing.
  function releaseBuilderDuties(builder, world, reason, kind) {
    // View: what the broken trip already earned is reported as usual, then what was dropped.
    finishTrip(builder, world);
    let dropped = 0;
    for (let i = 0; i < builder.carry.length; i++) if (!builder.carry[i].built) dropped += 1;
    world.events.push({
      type: 'abandon',
      builder: builder.index,
      dropped: dropped,
      reason: reason,
      kind: kind || 'path',
      x: builder.cell[0],
      y: builder.cell[1],
      z: builder.cell[2],
    });
    let releasedPlanBlocks = 0;
    for (let i = 0; i < builder.plan.length; i++) {
      const block = builder.plan[i];
      if (!block.built && block.poured === 0 && block.owner === builder.index) releasedPlanBlocks += 1;
    }
    if (releasedPlanBlocks > 0) {
      root.MicroBuildersWorkerLog.record(
        builder,
        world,
        reason + '; снято из плана ' + releasedPlanBlocks + ' ' +
          (releasedPlanBlocks === 1 ? 'куб' : 'куба/кубов')
      );
    }
    releaseHands(builder);
    for (let i = 0; i < builder.carry.length; i++) {
      const block = builder.carry[i];
      if (!block.built) {
        block.loadBatchId = -1;
        if (block.owner !== builder.index) {
          block.reserved = false;
          block.failedNavSerial = world.navSerial;
        }
      }
    }
    builder.carry.length = 0;
    touchCarry(builder);
    builder.waitReason = '';
    const kept = [];
    for (let i = 0; i < builder.plan.length; i++) {
      const block = builder.plan[i];
      if (block.built) continue;
      if (block.poured > 0 && block.owner === builder.index) {
        kept.push(block);
        block.reserved = true;
      } else if (block.owner === builder.index) {
        block.reserved = false;
        block.owner = -1;
      }
    }
    builder.plan = kept;
    builder.planTaken = kept.length;
    if (releasedPlanBlocks > 0) wakeVehicles(world);
    builder.loadBatchId = -1;
    if (builder.routeId >= 0) {
      const route = world.routes[builder.routeId];
      if (!route.complete && route.owner === builder.index) {
        route.complete = true;
        route.owner = -1;
      }
    }
    builder.routeId = -1;
    builder.routeTargetId = -1;
  }

  function abandonJobAndRecover(builder, world, reason, kind) {
    releaseBuilderDuties(builder, world, reason, kind);
    continueRecovery(builder, world);
  }

  function continueRecovery(builder, world) {
    if (sameCell(builder.cell, builder.homeCell)) {
      beginPlanning(builder);
      return;
    }
    const path = escapePath(builder.cell, builder.homeCell, world);
    if (path && path.length > 1) {
      beginWalk(builder, path, 'recover', world);
      return;
    }
    builder.phase = 'recover';
    builder.wait = 0.1;
  }

  function beginExit(builder, world) {
    const spawn = builder.homeCell;
    if (sameCell(builder.cell, spawn)) {
      beginPlanning(builder);
      return;
    }
    releaseHands(builder);
    const clear = findPathToCell(builder.cell, spawn, world);
    if (clear && clear.length > 1) {
      beginWalk(builder, clear, 'out', world);
      return;
    }
    const through = escapePath(builder.cell, spawn, world);
    if (through && through.length > 1) {
      beginWalk(builder, through, 'out', world);
      return;
    }
    builder.phase = 'recover';
    builder.wait = 0.1;
  }

  function pullOut(world, block, placer) {
    const builders = world.builders;
    for (let i = 0; i < builders.length; i++) {
      const other = builders[i];
      if (other === placer || other.trade === 'engineer') continue;
      if (other.cell[0] !== block.x || other.cell[1] !== block.y || other.cell[2] !== block.z) continue;
      if (other.phase === 'place') {
        other.exitAfterPlace = true;
        continue;
      }
      beginExit(other, world);
    }
  }

  function pullOutBatch(world, blocks) {
    const occupied = new Set();
    for (let i = 0; i < blocks.length; i++) {
      occupied.add(cellKey(blocks[i].x, blocks[i].y, blocks[i].z));
    }
    for (let i = 0; i < world.builders.length; i++) {
      const builder = world.builders[i];
      if (builder.trade === 'engineer') continue;
      if (!occupied.has(cellKey(builder.cell[0], builder.cell[1], builder.cell[2]))) continue;
      if (builder.phase === 'place') {
        builder.exitAfterPlace = true;
        continue;
      }
      beginExit(builder, world);
    }
  }

  function mastErectStands(piece, world) {
    const ids = world.standIds;
    ids.length = 0;
    const index = world.index;
    if (!canStand(piece.x, piece.y, piece.z, world)) return ids;
    const id = index.id(piece.x, piece.y, piece.z);
    const hardFloor = piece.y === 0 ||
      world.deckGrid[id] === 1 ||
      world.solidGrid[index.id(piece.x, piece.y - 1, piece.z)] === 1 ||
      world.bridgeGrid[index.id(piece.x, piece.y - 1, piece.z)] === 1 ||
      world.doorGrid[index.id(piece.x, piece.y - 1, piece.z)] === 1;
    if (hardFloor || ladderColumn(piece.x, piece.y, piece.z, world)) ids.push(id);
    return ids;
  }

  function rungPiece(world, x, y, z) {
    const key = cellKey(x, y, z);
    const known = world.rungByKey.get(key);
    if (known) {
      if (known.removed) {
        known.removed = false;
        known.reserved = false;
        known.built = false;
      }
      return known;
    }
    const piece = {
      id: 'r:' + x + ':' + y + ':' + z,
      x: x,
      y: y,
      z: z,
      ox: 0,
      oz: 1,
      ladder: true,
      built: false,
      reserved: false,
      removed: false,
    };
    const index = world.index;
    if (index.inside(x - 1, y, z) && (world.solidGrid[index.id(x - 1, y, z)] === 1 || world.doorGrid[index.id(x - 1, y, z)] === 1)) {
      piece.ox = -1;
      piece.oz = 0;
    } else if (index.inside(x + 1, y, z) && (world.solidGrid[index.id(x + 1, y, z)] === 1 || world.doorGrid[index.id(x + 1, y, z)] === 1)) {
      piece.ox = 1;
      piece.oz = 0;
    } else if (index.inside(x, y, z + 1) && (world.solidGrid[index.id(x, y, z + 1)] === 1 || world.doorGrid[index.id(x, y, z + 1)] === 1)) {
      piece.ox = 0;
      piece.oz = 1;
    } else if (index.inside(x, y, z - 1) && (world.solidGrid[index.id(x, y, z - 1)] === 1 || world.doorGrid[index.id(x, y, z - 1)] === 1)) {
      piece.ox = 0;
      piece.oz = -1;
    }
    world.scaffoldPieces.push(piece);
    world.rungByKey.set(key, piece);
    return piece;
  }

  function deckPiece(world, x, y, z, ax, az) {
    const key = cellKey(x, y, z);
    const known = world.deckByKey.get(key);
    if (known) {
      if (known.removed) {
        known.removed = false;
        known.reserved = false;
        known.built = false;
      }
      return known;
    }
    const deck = {
      id: 'd:' + x + ':' + y + ':' + z,
      x: x,
      y: y,
      z: z,
      ox: -az,
      oz: ax,
      ax: ax,
      az: az,
      deck: true,
      built: false,
      reserved: false,
      removed: false,
    };
    world.scaffoldDecks.push(deck);
    world.deckByKey.set(key, deck);
    return deck;
  }

  function collectRouteTargets(world, targets) {
    const pending = [];
    const blocks = world.orderedBlocks;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.built || !block.ready) continue;
      if (targets ? !targets.has(block.id) : block.reserved) continue;
      pending.push(block);
    }
    return pending;
  }

  function refreshExteriorAir(world) {
    if (world.exteriorNavSerial === world.navSerial) return;
    world.exteriorEpoch += 1;
    if (world.exteriorEpoch === 4294967295) {
      world.exteriorStamp.fill(0);
      world.exteriorEpoch = 1;
    }
    const epoch = world.exteriorEpoch;
    const stamp = world.exteriorStamp;
    const queue = world.exteriorQueue;
    const index = world.index;
    queue.length = 0;

    function add(x, y, z) {
      if (!index.inside(x, y, z)) return;
      const id = index.id(x, y, z);
      if (stamp[id] === epoch || world.solidGrid[id] === 1) return;
      stamp[id] = epoch;
      queue.push(id);
    }

    for (let y = 0; y <= index.maxY; y++) {
      for (let z = index.minZ; z <= index.maxZ; z++) {
        add(index.minX, y, z);
        add(index.maxX, y, z);
      }
      for (let x = index.minX; x <= index.maxX; x++) {
        add(x, y, index.minZ);
        add(x, y, index.maxZ);
      }
    }
    for (let z = index.minZ; z <= index.maxZ; z++) {
      for (let x = index.minX; x <= index.maxX; x++) {
        add(x, 0, z);
        add(x, index.maxY, z);
      }
    }

    let head = 0;
    while (head < queue.length) {
      const id = queue[head++];
      index.decodeInto(id, world.exteriorCell);
      const x = world.exteriorCell[0];
      const y = world.exteriorCell[1];
      const z = world.exteriorCell[2];
      add(x + 1, y, z);
      add(x - 1, y, z);
      add(x, y + 1, z);
      add(x, y - 1, z);
      add(x, y, z + 1);
      add(x, y, z - 1);
    }
    world.exteriorNavSerial = world.navSerial;
  }

  function buildStandIds(block, world) {
    const ids = [];
    const index = world.index;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          if (!BuildPatterns.allows(0, -dx, -dy, -dz) &&
              !BuildPatterns.allows(1, -dx, -dy, -dz) &&
              !BuildPatterns.allows(2, -dx, -dy, -dz) &&
              !BuildPatterns.allows(3, -dx, -dy, -dz)) continue;
          const x = block.x + dx;
          const y = block.y + dy;
          const z = block.z + dz;
          if (!index.inside(x, y, z)) continue;
          ids.push(index.id(x, y, z));
        }
      }
    }
    return ids;
  }

  function sealedStandIds(block, world) {
    const ids = buildStandIds(block, world);
    const stamp = world.exteriorStamp;
    const epoch = world.exteriorEpoch;
    for (let i = 0; i < ids.length; i++) {
      if (world.solidGrid[ids[i]] !== 1 && stamp[ids[i]] === epoch) return null;
    }
    return ids;
  }

  function doorCutPath(goalIds, world) {
    const index = world.index;
    const distance = world.doorCutDistance;
    const previous = world.doorCutPrevious;
    distance.fill(Infinity);
    previous.fill(-1);
    const goals = new Set(goalIds);
    const heap = world.doorCutHeap;
    heap.clear();

    function cellCost(id) {
      if (world.solidGrid[id] !== 1) return 0;
      const block = world.blockGrid[id];
      if (!cuttableBlock(block)) return Infinity;
      return 1;
    }

    function push(id, price, from) {
      if (price >= distance[id]) return;
      distance[id] = price;
      previous[id] = from;
      heap.push(price, id);
    }

    index.decodeInto(goalIds[0], world.doorCutCell);
    const goalY = world.doorCutCell[1];
    for (let z = index.minZ; z <= index.maxZ; z++) {
      push(index.id(index.minX, goalY, z), 0, -2);
      push(index.id(index.maxX, goalY, z), 0, -2);
    }
    for (let x = index.minX; x <= index.maxX; x++) {
      push(index.id(x, goalY, index.minZ), 0, -2);
      push(index.id(x, goalY, index.maxZ), 0, -2);
    }

    let goal = -1;
    while (heap.size > 0) {
      const id = heap.pop();
      const price = distance[id];
      if (goals.has(id)) {
        goal = id;
        break;
      }
      index.decodeInto(id, world.doorCutCell);
      const x = world.doorCutCell[0];
      const z = world.doorCutCell[2];
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (!index.inside(nx, goalY, nz)) continue;
        const nextId = index.id(nx, goalY, nz);
        const cost = cellCost(nextId);
        if (cost === Infinity) continue;
        push(nextId, price + cost, id);
      }
    }
    if (goal < 0) return null;
    const path = [];
    let cursor = goal;
    while (cursor >= 0) {
      path.push(cursor);
      cursor = previous[cursor];
      if (cursor === -2) break;
    }
    path.reverse();
    return path;
  }

  function convertEmergencyDoors(path, world) {
    const index = world.index;
    let converted = 0;
    for (let i = 0; i < path.length; i++) {
      const id = path[i];
      if (world.solidGrid[id] !== 1) continue;
      const block = world.blockGrid[id];
      if (!cuttableBlock(block)) continue;
      const neighborId = i + 1 < path.length ? path[i + 1] : path[i - 1];
      index.decodeInto(id, world.doorCutCell);
      index.decodeInto(neighborId, world.doorCutNeighbor);
      block.feature = 'door';
      block.faceX = world.doorCutNeighbor[0] - world.doorCutCell[0];
      block.faceZ = world.doorCutNeighbor[2] - world.doorCutCell[2];
      block.style = 'wood';
      block.additionalDoor = true;
      world.solidGrid[id] = 0;
      world.doorGrid[id] = 1;
      world.stats.additionalDoors += 1;
      converted += 1;
      world.events.push({ type: 'retrofitDoor', block: block });
      invalidateNav(world, block.x, block.y, block.z);
    }
    return converted;
  }

  function openSealedTarget(world, pending) {
    refreshExteriorAir(world);
    let bestPath = null;
    const sealed = [];
    const exterior = [];
    for (let i = 0; i < pending.length; i++) {
      const standIds = sealedStandIds(pending[i], world);
      if (!standIds) {
        exterior.push(pending[i]);
        continue;
      }
      sealed.push(pending[i]);
      for (let stand = 0; stand < standIds.length; stand++) {
        const path = doorCutPath([standIds[stand]], world);
        if (!path) continue;
        let doors = 0;
        for (let p = 0; p < path.length; p++) {
          if (world.solidGrid[path[p]] === 1) doors += 1;
        }
        if (!bestPath || doors < bestPath.doors) bestPath = { ids: path, doors: doors };
      }
    }
    const opened = !bestPath || bestPath.doors === 0
      ? 0
      : convertEmergencyDoors(bestPath.ids, world);
    return { opened: opened, sealed: sealed, exterior: exterior };
  }

  function sealedFailureText(result) {
    const total = result.sealed.length + result.exterior.length;
    if (result.sealed.length === 0) {
      return 'проверка замурованности: нет, 0 из ' + total;
    }
    const cells = result.sealed.map(function (block) {
      return block.x + ',' + block.y + ',' + block.z;
    });
    return 'проверка замурованности: да, ' + result.sealed.length + ' из ' + total +
      ' (' + cells.join('; ') + ')';
  }

  function findRouteAStar(world, pending, start, allowScaffolds, exactGoalIds, maxCost, greedy, allowPassages) {
    const index = world.index;
    if (pending && pending.length === 0) return false;
    if (exactGoalIds && exactGoalIds.length === 0) return null;
    refreshPathPrices(world);
    const searchStarted = performance.now();
    const searchType = allowPassages
      ? 'маршрут с аварийными проходами'
      : greedy
      ? 'аварийный маршрут'
      : exactGoalIds
      ? 'путь'
      : allowScaffolds
        ? 'маршрут со срезами'
        : 'маршрут без лесов';
    let expansions = 0;
    let pushes = 0;
    let maxOpen = 0;
    function finishSearch(result, goal, steps) {
      const duration = performance.now() - searchStarted;
      let scaffoldSteps = 0;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].piece) scaffoldSteps += 1;
      }
      const info = {
        duration: duration,
        type: searchType,
        goals: exactGoalIds ? exactGoalIds.length : pending.length,
        expansions: expansions,
        pushes: pushes,
        maxOpen: maxOpen,
        success: goal >= 0,
        steps: steps.length,
        scaffoldSteps: scaffoldSteps,
        turns: goal >= 0 ? world.routeTurns[goal] : 0,
        cost: goal >= 0 ? world.routeDistance[goal] : 0,
        start: start.join(','),
        targetId: goal >= 0 && !exactGoalIds ? goalTargets.get(goal).id : -1,
        maxCost: maxCost,
        expansionBudget: allowScaffolds ? SCAFFOLD.expansionBudget : 0,
      };
      world.metrics.aStarSearches += 1;
      if (!world.metrics.aStarPeak || duration > world.metrics.aStarPeak.duration) {
        world.metrics.aStarPeak = info;
      }
      return result;
    }
    function free(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      const future = world.blockGrid[index.id(x, y, z)];
      if (future && future.feature !== 'door' && future.feature !== 'hatch' && future.feature !== 'bridge') return false;
      return world.solidGrid[index.id(x, y, z)] !== 1;
    }
    function canOpenPassageInto(x, y, z) {
      if (!index.inside(x, y, z)) return false;
      const block = world.blockGrid[index.id(x, y, z)];
      return cuttableBlock(block);
    }
    function touchesCube(x, y, z) {
      for (let d = 0; d < DIRS.length; d++) {
        const nx = x + DIRS[d][0];
        const nz = z + DIRS[d][1];
        if (!index.inside(nx, y, nz)) continue;
        const id = index.id(nx, y, nz);
        if (world.solidGrid[id] === 1 || world.doorGrid[id] === 1) return true;
      }
      return false;
    }
    function hardFloor(x, y, z) {
      if (y === 0) return true;
      const id = index.id(x, y, z);
      if (world.deckGrid[id] === 1) return true;
      const below = index.id(x, y - 1, z);
      return world.solidGrid[below] === 1 || world.bridgeGrid[below] === 1 || world.doorGrid[below] === 1;
    }
    function heuristic(x, y, z) {
      let best = Infinity;
      const count = exactGoalIds ? exactGoalIds.length : pending.length;
      for (let i = 0; i < count; i++) {
        let goalX;
        let goalY;
        let goalZ;
        let horizontalReach = 1;
        let verticalReach = 1;
        if (exactGoalIds) {
          index.decodeInto(exactGoalIds[i], world.goalCell);
          goalX = world.goalCell[0];
          goalY = world.goalCell[1];
          goalZ = world.goalCell[2];
          horizontalReach = 0;
          verticalReach = 0;
        } else {
          goalX = pending[i].x;
          goalY = pending[i].y;
          goalZ = pending[i].z;
        }
        const horizontalDistance = Math.max(0, Math.abs(goalX - x) + Math.abs(goalZ - z) - horizontalReach);
        const verticalDistance = Math.ceil(Math.max(0, Math.abs(goalY - y) - verticalReach) / SCAFFOLD.step);
        const sharedSteps = Math.min(horizontalDistance, verticalDistance);
        const verticalEstimate = SCAFFOLD.verticalPrice +
          (allowScaffolds && maxCost === Infinity ? SCAFFOLD.ladderPrice : 0);
        const estimate =
          verticalDistance * verticalEstimate +
          (horizontalDistance - sharedSteps) * SCAFFOLD.horizontalPrice;
        if (estimate < best) best = estimate;
      }
      return best;
    }
    const at = [0, 0, 0];
    const next = [0, 0, 0];
    const goalTargets = new Map();
    if (exactGoalIds) {
      for (let i = 0; i < exactGoalIds.length; i++) {
        index.decodeInto(exactGoalIds[i], at);
        const mode = buildSurfaceMode(at[0], at[1], at[2], world);
        goalTargets.set(exactGoalIds[i] * SURFACE_STATE_COUNT + mode, null);
      }
    } else {
      for (let p = 0; p < pending.length; p++) {
        const block = pending[p];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0 && dz === 0) continue;
              const x = block.x + dx;
              const y = block.y + dy;
              const z = block.z + dz;
              if (y < 0 || !index.inside(x, y, z)) continue;
              const id = index.id(x, y, z);
              for (let mode = 0; mode < SURFACE_STATE_COUNT; mode++) {
                if (!canBuildBlockFrom(x, y, z, mode, block, world)) continue;
                const state = id * SURFACE_STATE_COUNT + mode;
                if (!goalTargets.has(state)) goalTargets.set(state, block);
              }
            }
          }
        }
      }
    }
    const distance = world.routeDistance;
    const previous = world.routePrevious;
    const actionKind = world.routeActionKind;
    const actionAx = world.routeActionAx;
    const actionAz = world.routeActionAz;
    const turnCount = world.routeTurns;
    const direction = world.routeDirection;
    const seen = world.routeSeen;
    const settled = world.routeSettled;
    world.routeSearchStamp += 1;
    if (world.routeSearchStamp === 4294967295) {
      seen.fill(0);
      settled.fill(0);
      world.routeSearchStamp = 1;
    }
    const routeMark = world.routeSearchStamp;
    const heap = world.routeHeap;
    heap.clear();
    function push(state, price, from, action) {
      index.decodeInto(Math.floor(state / SURFACE_STATE_COUNT), next);
      let nextTurns = 0;
      let nextDirection = 0;
      if (from >= 0) {
        nextTurns = turnCount[from];
        index.decodeInto(Math.floor(from / SURFACE_STATE_COUNT), world.turnCell);
        const fromX = world.turnCell[0];
        const fromY = world.turnCell[1];
        const fromZ = world.turnCell[2];
        if (fromX === next[0] && fromY === next[1] && fromZ === next[2]) {
          nextDirection = direction[from];
        } else if (fromY === 0 && next[1] === 0) {
          if (next[0] > fromX) nextDirection = 1;
          else if (next[0] < fromX) nextDirection = 2;
          else if (next[2] > fromZ) nextDirection = 3;
          else if (next[2] < fromZ) nextDirection = 4;
          if (direction[from] !== 0 && nextDirection !== direction[from]) nextTurns += 1;
        }
      }
      if (seen[state] === routeMark &&
          (distance[state] < price ||
           (distance[state] === price && turnCount[state] <= nextTurns))) return;
      const estimate = heuristic(next[0], next[1], next[2]);
      if (price + estimate >= maxCost) return;
      seen[state] = routeMark;
      distance[state] = price;
      previous[state] = from;
      turnCount[state] = nextTurns;
      direction[state] = nextDirection;
      if (action) {
        if (action.kind === 'mast') {
          actionKind[state] = 1;
          actionAx[state] = action.ax;
          actionAz[state] = action.az;
        } else if (action.kind === 'deck') {
          actionKind[state] = 2;
          actionAx[state] = action.ax;
          actionAz[state] = action.az;
        } else if (action.kind === 'door') {
          actionKind[state] = 3;
          actionAx[state] = 0;
          actionAz[state] = 0;
        } else {
          actionKind[state] = 4;
          actionAx[state] = 0;
          actionAz[state] = 0;
        }
      } else {
        actionKind[state] = 0;
      }
      const priority = allowPassages
        ? estimate + price * 0.05 + nextTurns * 0.000001
        : greedy
          ? estimate + price * 0.000001 + nextTurns * 0.000000001
          : price + estimate + nextTurns * 0.000001;
      heap.push(priority, state);
      pushes += 1;
      if (heap.size > maxOpen) maxOpen = heap.size;
    }
    const startId = index.id(start[0], start[1], start[2]);
    const startMode = buildSurfaceMode(start[0], start[1], start[2], world);
    const rootState = startId * SURFACE_STATE_COUNT + startMode;
    push(rootState, 0, -2, null);
    let goal = -1;
    while (heap.size > 0) {
      const state = heap.pop();
      if (settled[state] === routeMark) continue;
      settled[state] = routeMark;
      expansions += 1;
      if (!exactGoalIds) world.metrics.scaffoldExpansions += 1;
      const id = Math.floor(state / SURFACE_STATE_COUNT);
      const mode = state % SURFACE_STATE_COUNT;
      index.decodeInto(id, at);
      const x = at[0];
      const y = at[1];
      const z = at[2];
      const price = distance[state];
      pushElevatorRides(world, x, y, z, price, state, push);
      if (goalTargets.has(state)) {
        goal = state;
        break;
      }
      if (!exactGoalIds && expansions >= SCAFFOLD.expansionBudget) break;
        const passageHere = actionKind[state] === 3 || actionKind[state] === 4;
        if (canStand(x, y, z, world) || passageHere) {
          const neighbors = collectNeighbors(x, y, z, world);
          for (let n = 0; n < neighbors.length; n++) {
            index.decodeInto(neighbors[n], next);
            const nextMode = buildSurfaceMode(next[0], next[1], next[2], world);
            const travelPrice = moveCost(x, y, z, next[0], next[1], next[2]);
            push(neighbors[n] * SURFACE_STATE_COUNT + nextMode, price + travelPrice, state, null);
          }
          if (allowPassages) {
            for (let d = 0; d < DIRS.length; d++) {
              const nx = x + DIRS[d][0];
              const nz = z + DIRS[d][1];
              if (!canOpenPassageInto(nx, y, nz)) continue;
              const nextId = index.id(nx, y, nz);
              const nextMode = buildSurfaceMode(nx, y, nz, world);
              push(
                nextId * SURFACE_STATE_COUNT + nextMode,
                price + SCAFFOLD.horizontalPrice + SCAFFOLD.passagePrice,
                state,
                { kind: 'door' }
              );
            }
            if ((mode & SURFACE_LADDER) !== 0 ||
                (allowScaffolds && ((mode & SURFACE_DECK) !== 0 || hardFloor(x, y, z)))) {
              for (let direction = -1; direction <= 1; direction += 2) {
                if (direction < 0 && (mode & SURFACE_LADDER) === 0) continue;
                const ny = y + direction;
                if (!canOpenPassageInto(x, ny, z)) continue;
                const nextId = index.id(x, ny, z);
                const nextMode = SURFACE_LADDER | (world.deckGrid[nextId] === 1 ? SURFACE_DECK : 0);
                push(
                  nextId * SURFACE_STATE_COUNT + nextMode,
                  price + SCAFFOLD.verticalPrice + SCAFFOLD.passagePrice,
                  state,
                  { kind: 'hatch' }
                );
              }
            }
          }
        } else if (mode !== 0) {
          for (let d = 0; d < DIRS.length; d++) {
            const nx = x + DIRS[d][0];
            const nz = z + DIRS[d][1];
            if (!index.inside(nx, y, nz) || !canStand(nx, y, nz, world)) continue;
            const nextId = index.id(nx, y, nz);
            const nextMode = buildSurfaceMode(nx, y, nz, world);
            push(nextId * SURFACE_STATE_COUNT + nextMode, price + SCAFFOLD.horizontalPrice, state, null);
          }
        }
        if (allowScaffolds &&
            (hardFloor(x, y, z) || mode !== 0) &&
            (free(x, y, z) || passageHere) &&
            touchesCube(x, y, z) &&
            free(x, y + 1, z)) {
          const ladderId = index.id(x, y, z);
          const mastPrice = world.mastGrid[ladderId] === 1 ? 0 : SCAFFOLD.ladderPrice;
          const nextId = index.id(x, y + 1, z);
          const action = world.mastGrid[ladderId] === 1 ? null : { kind: 'mast', ax: 0, az: 0 };
          const nextMode = SURFACE_LADDER | (world.deckGrid[nextId] === 1 ? SURFACE_DECK : 0);
          push(nextId * SURFACE_STATE_COUNT + nextMode, price + SCAFFOLD.verticalPrice + mastPrice, state, action);
        }
        if (allowScaffolds && (mode & SURFACE_LADDER) !== 0 && (mode & SURFACE_DECK) === 0) {
          if (free(x, y, z) || passageHere) {
            push(id * SURFACE_STATE_COUNT + (mode | SURFACE_DECK), price + SCAFFOLD.deckPrice, state, {
              kind: 'deck',
              x: x,
              y: y,
              z: z,
              ax: 0,
              az: 0,
            });
          }
          continue;
        }
        if (!allowScaffolds) continue;
        for (let d = 0; d < DIRS.length; d++) {
          const nx = x + DIRS[d][0];
          const nz = z + DIRS[d][1];
          if (!free(nx, y, nz)) continue;
          const nextId = index.id(nx, y, nz);
          if (canStand(nx, y, nz, world)) {
            const nextMode = buildSurfaceMode(nx, y, nz, world);
            push(nextId * SURFACE_STATE_COUNT + nextMode, price + SCAFFOLD.horizontalPrice, state, null);
            continue;
          }
          const deckPrice = world.deckGrid[nextId] === 1 ? 0 : SCAFFOLD.deckPrice;
          const action = world.deckGrid[nextId] === 1 ? null : {
            kind: 'deck',
            x: nx,
            y: y,
            z: nz,
            ax: DIRS[d][0],
            az: DIRS[d][1],
          };
          const nextMode = SURFACE_DECK | (ladderColumn(nx, y, nz, world) ? SURFACE_LADDER : 0);
          push(nextId * SURFACE_STATE_COUNT + nextMode, price + SCAFFOLD.horizontalPrice + deckPrice, state, action);
        }
      }
    if (goal < 0) return finishSearch(exactGoalIds ? null : false, goal, []);
    const steps = [];
    let cursor = goal;
    while (cursor >= 0) {
      const from = previous[cursor];
      if (from === -2) break;
      index.decodeInto(Math.floor(cursor / SURFACE_STATE_COUNT), at);
      let piece = null;
      if (actionKind[cursor] === 1) {
        index.decodeInto(Math.floor(from / SURFACE_STATE_COUNT), next);
        piece = rungPiece(world, next[0] + actionAx[cursor], next[1], next[2] + actionAz[cursor]);
      } else if (actionKind[cursor] === 2) {
        piece = deckPiece(world, at[0], at[1], at[2], actionAx[cursor], actionAz[cursor]);
      }
      const passageBlock = actionKind[cursor] === 3 || actionKind[cursor] === 4
        ? world.blockGrid[index.id(at[0], at[1], at[2])]
        : null;
      steps.push({
        cell: [at[0], at[1], at[2]],
        piece: piece,
        passageBlock: passageBlock,
        passageVertical: actionKind[cursor] === 4,
      });
      cursor = from;
    }
    steps.reverse();
    if (exactGoalIds) {
      const path = [start.slice()];
      for (let i = 0; i < steps.length; i++) path.push(steps[i].cell);
      return finishSearch(path, goal, steps);
    }
    const target = goalTargets.get(goal);
    const route = {
      id: world.routes.length,
      targetId: target.id,
      owner: -1,
      steps: steps,
      stepIndex: 0,
      complete: false,
      cost: distance[goal],
    };
    world.routes.push(route);
    return finishSearch(route, goal, steps);
  }

  function requestRoute(builder, world, targets) {
    const pending = collectRouteTargets(world, targets);
    if (pending.length === 0) {
      return null;
    }
    const search = {
      builderIndex: builder.index,
    };
    const started = performance.now();
    const ordinary = findRouteAStar(world, pending, builder.cell, false, null, Infinity, false, false);
    let result = ordinary;
    if (SCAFFOLD.enabled && (SCAFFOLD.shortcutRoutes || !ordinary)) {
      const maxCost = ordinary ? ordinary.cost : Infinity;
      const shortcut = findRouteAStar(world, pending, builder.cell, true, null, maxCost, false, false);
      if (shortcut) {
        if (ordinary) ordinary.complete = true;
        result = shortcut;
      }
    }
    if (!result) {
      result = findRouteAStar(world, pending, builder.cell, SCAFFOLD.enabled, null, Infinity, true, false);
    }
    if (!result) {
      result = findRouteAStar(world, pending, builder.cell, SCAFFOLD.enabled, null, Infinity, false, true);
    }
    world.metrics.scaffoldSearch += performance.now() - started;
    return finishRouteSearch(world, search, result);
  }

  function finishRouteSearch(world, search, result) {
    const builder = world.builders[search.builderIndex];
    if (result) {
      result.owner = builder.index;
      builder.routeId = result.id;
      builder.routeTargetId = result.targetId;
    }
    return result;
  }

  function deckErectStands(deck, world) {
    const ids = world.standIds;
    ids.length = 0;
    const index = world.index;
    const y = deck.y;
    if (ladderColumn(deck.x, y, deck.z, world) && canStand(deck.x, y, deck.z, world)) {
      ids.push(index.id(deck.x, y, deck.z));
    }
    for (let d = 0; d < DIRS.length; d++) {
      const x = deck.x + DIRS[d][0];
      const z = deck.z + DIRS[d][1];
      if (!index.inside(x, y, z)) continue;
      const id = index.id(x, y, z);
      if (!canStand(x, y, z, world)) continue;
      if (ladderColumn(x, y, z, world) && !deckCell(x, y, z, world)) continue;
      ids.push(id);
    }
    return ids;
  }

  function finishErect(builder, world) {
    const piece = builder.erectPiece;
    world.constructionStallElapsed = 0;
    builder.erectPiece = null;
    piece.reserved = false;
    piece.built = true;
    const id = world.index.id(piece.x, piece.y, piece.z);
    if (piece.deck) {
      world.deckGrid[id] = 1;
      world.stats.decks += 1;
    } else {
      world.mastGrid[id] = 1;
      world.stats.ladders += 1;
    }
    world.events.push({ type: 'scaffold', ids: [piece.id], x: piece.x, y: piece.y, z: piece.z });
    invalidateNav(world, piece.x, piece.y, piece.z);
    requestWork(builder, world);
  }

  function finishPassage(builder, world) {
    const block = builder.passageBlock;
    const vertical = builder.passageVertical;
    builder.passageBlock = null;
    builder.passageVertical = false;
    if (cuttableBlock(block)) {
      const id = world.index.id(block.x, block.y, block.z);
      block.feature = vertical ? 'hatch' : 'door';
      block.faceX = vertical ? 0 : block.x - builder.cell[0];
      block.faceZ = vertical ? 0 : block.z - builder.cell[2];
      block.style = 'wood';
      block.additionalDoor = true;
      world.solidGrid[id] = 0;
      world.doorGrid[id] = 1;
      invalidateNav(world, block.x, block.y, block.z);
      world.events.push({ type: 'retrofitDoor', block: block });
      if (vertical) world.stats.verticalHatches += 1;
      else world.stats.additionalDoors += 1;
      world.constructionStallElapsed = 0;
    }
    builder.phase = 'idle';
    builder.wait = 0;
    requestWork(builder, world);
  }

  function purchasesFromBalance() {
    const purchases = {};
    const kinds = Object.keys(SESSION_BALANCE);
    for (let i = 0; i < kinds.length; i++) purchases[kinds[i]] = 0;
    return purchases;
  }

  function activateElevators(world) {
    const count = sessionValue('elevators', world.campaign.purchases.elevators);
    const pads = world.level.elevators;
    world.elevatorPads = [];
    for (let i = 0; i < count && i < pads.length; i++) {
      const pad = pads[i];
      world.elevatorPads.push(pad);
      const shaftTop = sessionValue('elevatorHeight', world.campaign.purchases.elevatorHeight);
      for (let y = 0; y <= shaftTop; y++) {
        for (let dz = 0; dz < 3; dz++) {
          for (let dx = 0; dx < 3; dx++) {
            const x = pad.x + dx;
            const z = pad.z + dz;
            if (!world.index.inside(x, y, z)) continue;
            const id = world.index.id(x, y, z);
            if (world.blockGrid[id]) continue;
            world.solidGrid[id] = 1;
          }
        }
      }
    }
    world.navEpoch += 1;
    world.navSerial += 1;
    world.events.push({ type: 'elevators' });
  }

  function dronePad(world, slot) {
    const mine = world.level.mines[0];
    return [mine.x + 2.5 + (slot % 4) * 1.3, 0.32, mine.z - 2.5 - Math.floor(slot / 4) * 1.3];
  }

  function spawnEngineer(world) {
    const slot = countTrade(world, 'engineer');
    const pad = dronePad(world, slot);
    const builder = createBuilder(world.builders.length, pad);
    builder.trade = 'engineer';
    builder.shirt = 0x3d7ea6;
    builder.phase = 'home';
    builder.wait = 0.4 + slot * 0.15;
    builder.droneSlot = slot;
    builder.droneJob = '';
    builder.droneBlock = null;
    builder.currentSpeed = 0;
    builder.heading = 0;
    builder.headingReady = true;
    builder.smokeThreshold = rollSmoke(world.campaign);
    world.builders.push(builder);
    world.events.push({ type: 'spawn', builder: builder });
    return builder;
  }

  function spawnHelicopter(world) {
    const index = world.vehicles.length;
    const spawnIndex = world.level.spawnPoints.length - 1 - ((index * 3) % world.level.spawnPoints.length);
    const vehicle = createVehicle(index, world.level.spawnPoints[spawnIndex]);
    vehicle.kind = 'heli';
    world.vehicles.push(vehicle);
    world.events.push({ type: 'spawnVehicle', vehicle: vehicle });
    return vehicle;
  }

  function countTrade(world, trade) {
    let count = 0;
    for (let i = 0; i < world.builders.length; i++) {
      if (world.builders[i].trade === trade) count += 1;
    }
    return count;
  }

  function countKind(world, kind) {
    let count = 0;
    for (let i = 0; i < world.vehicles.length; i++) {
      if (world.vehicles[i].kind === kind) count += 1;
    }
    return count;
  }

  function createCampaign() {
    return {
      levelIndex: 0,
      coins: 0,
      builderCount: sessionValue('builders', 0),
      metaBuilders: sessionValue('builders', 0),
      metaWorkerRanks: [],
      vehicleCount: sessionValue('vehicles', 0),
      metaVehicles: sessionValue('vehicles', 0),
      purchases: purchasesFromBalance(),
      devGroups: {
        all: false,
        workers: false,
        cubes: false,
        economy: false,
        loaders: false,
        helicopters: false,
        elevators: false,
        site: false,
      },
      totalElapsed: 0,
      levelElapsed: 0,
      status: 'title',
      levelTimes: [],
      levelStats: [],
      freePurchases: false,
      runMode: 'campaign',
      runPayload: null,
      metaPlaceSpeed: 1,
      metaPickupSpeed: 1,
      metaHeightPenalty: 1,
      metaCarry: 0,
      metaCarryScale: 1,
      metaClimb: 1,
      metaSmokeShort: 1,
      metaHunger: 1,
      metaSmoke: 1,
      foremen: {},
      foremanKinds: [],
      foremanRush: 1,
      bonusDrones: 0,
      coinsEarned: 0,
      metaMovement: 1,
      metaScaffold: 1,
      metaPlan: 0,
      metaNightRelief: 0,
      metaCoinMultiplier: 1,
      environmentWorkMultiplier: 1,
      environmentMoveMultiplier: 1,
      mealInterval: 240,
      mealAwaySeconds: 60,
      mealKitchenSeconds: BALANCE.mealKitchenSeconds,
      restInterval: BALANCE.restInterval,
      restSeconds: BALANCE.restSeconds,
      smokeInterval: 120,
      smokeSeconds: BALANCE.smokeSeconds,
      kitchenUnlocked: false,
      resumeBuiltIds: [],
    };
  }

  function restoreBuiltBlocks(world, builtIds) {
    const blocksById = new Map();
    for (let i = 0; i < world.blocks.length; i++) blocksById.set(world.blocks[i].id, world.blocks[i]);
    for (let i = 0; i < builtIds.length; i++) {
      const block = blocksById.get(builtIds[i]);
      block.poured = pourTotal(block);
      block.built = true;
      block.reserved = false;
      block.owner = -1;
      world.built.add(cellKey(block.x, block.y, block.z));
      occupyBuiltBlock(block, world);
      world.remaining -= 1;
    }
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      block.ready = !block.built && isSupported(block, world);
    }
    world.constructionProgressRemaining = world.remaining;
  }

  // Offline work as mass (kg): whole cubes in build order while the budget lasts; a cube is set when
  // at least half of its remaining mass fits.
  function applyOfflineMass(world, mass) {
    return applyOfflineBlocks(world, Infinity, mass);
  }

  function applyOfflineBlocks(world, count, massBudget) {
    const built = [];
    let mass = massBudget === undefined ? Infinity : massBudget;
    while (count > 0 && world.remaining > 0 && mass > 0) {
      let block = null;
      for (let i = 0; i < world.orderedBlocks.length; i++) {
        const candidate = world.orderedBlocks[i];
        if (!candidate.built && isSupported(candidate, world)) {
          block = candidate;
          break;
        }
      }
      if (!block) break;
      const left = MATERIAL[block.materialId].weight * (1 - block.poured / pourTotal(block));
      if (left * 0.5 > mass) break;
      mass -= left;
      const pay = grantPlacePay(world, block, pourTotal(block) - block.poured);
      block.poured = pourTotal(block);
      block.built = true;
      block.reserved = false;
      block.owner = -1;
      world.built.add(cellKey(block.x, block.y, block.z));
      occupyBuiltBlock(block, world);
      world.remaining -= 1;
      block.capitalPay = pay.capital;
      built.push(block);
      count -= 1;
    }
    if (built.length > 0) {
      refreshReadyBatch(world, built);
      invalidateNavBatch(world, built);
      let capital = 0;
      for (let i = 0; i < built.length; i++) capital += built[i].capitalPay;
      world.events.push({ type: 'autofill', blocks: built, capital: capital });
    }
    if (world.remaining === 0) finishLevel(world);
    return built;
  }

  function startLevel(campaign) {
    const level = campaign.runMode === 'hq' ? HQ_LEVELS[campaign.runPayload.projectId]
      : campaign.runMode === 'school' ? schoolLevel(campaign.runPayload.bossId, campaign.runPayload.tier) : LEVELS[campaign.levelIndex];
    if (!level) throw Error('Unknown construction site: ' + campaign.runMode);
    campaign.status = 'play';
    campaign.levelElapsed = 0;
    const bounds = {
      minX: level.bounds.minX - 2,
      maxX: level.bounds.maxX + 2,
      minZ: level.bounds.minZ - 2,
      maxZ: level.bounds.maxZ + 2,
      maxY: level.bounds.maxY + 2,
    };
    const index = createIndex(bounds);
    const size = index.size;
    const world = {
      campaign: campaign,
      level: level,
      index: index,
      solidGrid: new Uint8Array(size),
      prev: new Int32Array(size),
      searchStamp: 0,
      xStamp: new Uint32Array(size),
      singleGoal: new Int32Array(1),
      vehicleCell: [0, 0, 0],
      vehicleQueue: [],
      vehiclePathStamp: new Uint32Array(size),
      vehiclePrevious: new Int32Array(size),
      vehiclePathEpoch: 0,
      neighborIds: [],
      standIds: [],
      escapeQueue: [],
      nearbyBlocks: [],
      at: [0, 0, 0],
      nxt: [0, 0, 0],
      goalCell: [0, 0, 0],
      turnCell: [0, 0, 0],
      safeGroundCell: [0, 0, 0],
      safeGroundQueue: [],
      safeGroundStamp: new Uint32Array(size),
      safeGroundSerial: 0,
      safeGroundEpoch: 0,
      exteriorCell: [0, 0, 0],
      exteriorQueue: [],
      exteriorStamp: new Uint32Array(size),
      exteriorEpoch: 0,
      exteriorNavSerial: -1,
      doorCutCell: [0, 0, 0],
      doorCutNeighbor: [0, 0, 0],
      doorCutDistance: new Float64Array(size),
      doorCutPrevious: new Int32Array(size),
      doorCutHeap: createHeap(),
      navEpoch: 1,
      navSerial: 1,
      navCursor: 0,
      navStamp: new Uint32Array(size),
      navHead: new Int32Array(size),
      navCount: new Uint8Array(size),
      navPool: new Int32Array(size * 16),
      routeDistance: new Float64Array(size * SURFACE_STATE_COUNT),
      routePrevious: new Int32Array(size * SURFACE_STATE_COUNT),
      routeActionKind: new Uint8Array(size * SURFACE_STATE_COUNT),
      routeActionAx: new Int8Array(size * SURFACE_STATE_COUNT),
      routeActionAz: new Int8Array(size * SURFACE_STATE_COUNT),
      routeTurns: new Uint16Array(size * SURFACE_STATE_COUNT),
      routeDirection: new Uint8Array(size * SURFACE_STATE_COUNT),
      routeSeen: new Uint32Array(size * SURFACE_STATE_COUNT),
      routeSettled: new Uint32Array(size * SURFACE_STATE_COUNT),
      routeSearchStamp: 0,
      routeHeap: createHeap(),
      routes: [],
      deckByKey: new Map(),
      blocks: level.blocks.map(function (block) {
        return {
          id: block.id,
          x: block.x,
          y: block.y,
          z: block.z,
          materialId: block.materialId,
          feature: block.feature,
          faceX: block.faceX,
          faceZ: block.faceZ,
          style: block.style,
          rails: block.rails,
          shell: block.shell,
          priority: block.priority,
          glassOf: block.glassOf,
          glassId: block.glassId,
          built: false,
          reserved: false,
          ready: false,
          failedNavSerial: -1,
          poured: 0,
          owner: -1,
        };
      }),
      built: new Set(),
      builders: [],
      vehicles: [],
      events: [],
      remaining: level.blocks.length,
      constructionProgressRemaining: level.blocks.length,
      timeLedger: {},
      foremanBuilt: [],
      foremanCubes: 0,
      foremanTrips: 0,
      tripStats: [],
      floorStack: 0,
      windowRushUntil: 0,
      feastUntil: 0,
      floorBlocks: [],
      floorsDone: [],
      constructionStallElapsed: 0,
      completed: false,
      autoCompleted: 0,
      blocked: false,
      scaffoldPieces: [],
      scaffoldDecks: [],
      mastGrid: new Uint8Array(size),
      deckGrid: new Uint8Array(size),
      doorGrid: new Uint8Array(size),
      bridgeGrid: new Uint8Array(size),
      waterGrid: new Uint8Array(size),
      rungByKey: new Map(),
      cubeSet: new Set(),
      blockByKey: new Map(),
      glassByKey: new Map(),
      blockGrid: new Array(size),
      orderedBlocks: [],
      nextLoadBatchId: 1,
      vehicleWorkSerial: 1,
      vehicleNoWorkSerial: 0,
      stats: {
        ladders: 0,
        decks: 0,
        additionalDoors: 0,
        verticalHatches: 0,
        vehicleBlocks: 0,
      },
      metrics: {
        scheduler: 0,
        path: 0,
        scaffoldSearch: 0,
        simulation: 0,
        scaffoldExpansions: 0,
        pathSearches: 0,
        aStarSearches: 0,
        aStarPeak: null,
        assignments: 0,
        invalidations: 0,
      },
    };
    world.orderedBlocks = world.blocks.slice();
    for (let i = 0; i < world.blocks.length; i++) {
      const y = world.blocks[i].y;
      (world.floorBlocks[y] = world.floorBlocks[y] || []).push(world.blocks[i]);
    }
    world.orderedBlocks.sort(function (a, b) {
      return a.priority - b.priority || a.id - b.id;
    });
    for (let i = 0; i < world.blocks.length; i++) {
      const block = world.blocks[i];
      if (block.glassOf !== undefined) {
        world.glassByKey.set(cellKey(block.x, block.y, block.z), block);
        continue;
      }
      world.cubeSet.add(cellKey(block.x, block.y, block.z));
      world.blockByKey.set(cellKey(block.x, block.y, block.z), block);
      world.blockGrid[index.id(block.x, block.y, block.z)] = block;
    }
    for (let i = 0; i < world.blocks.length; i++) {
      world.blocks[i].ready = isSupported(world.blocks[i], world);
    }
    // Mine piles are visual pickup points, not obstacles or scaffold supports.
    restoreBuiltBlocks(world, campaign.resumeBuiltIds);
    campaign.builderCount = campaign.metaBuilders + sessionGain('builders', campaign.purchases.builders);
    for (let i = 0; i < campaign.builderCount; i++) spawnBuilder(world);
    campaign.vehicleCount = campaign.metaVehicles + sessionGain('vehicles', campaign.purchases.vehicles);
    for (let i = 0; i < campaign.vehicleCount; i++) spawnVehicle(world);
    const engineers = sessionValue('engineers', campaign.purchases.engineers);
    for (let i = 0; i < engineers; i++) spawnEngineer(world);
    const helicopters = sessionValue('helicopters', campaign.purchases.helicopters);
    for (let i = 0; i < helicopters; i++) spawnHelicopter(world);
    activateElevators(world);
    // «Механик» brings drones from the start (they stay until the order is done).
    for (let i = 0; i < campaign.bonusDrones; i++) spawnEngineer(world);
    return world;
  }

  function advanceLevel(campaign) {
    campaign.levelIndex += 1;
    campaign.levelElapsed = 0;
    if (campaign.levelIndex >= LEVELS.length) {
      campaign.status = 'won';
      return null;
    }
    return startLevel(campaign);
  }

  function stepWorld(world, dt) {
    if (world.campaign.status !== 'play') return;
    const started = performance.now();
    world.campaign.totalElapsed += dt;
    world.campaign.levelElapsed += dt;
    world.campaign.foremanRush = foremanRush(world);
    const builders = world.builders;
    for (let i = 0; i < builders.length; i++) updateBuilder(builders[i], world, dt);
    const vehicles = world.vehicles;
    for (let i = 0; i < vehicles.length; i++) updateVehicle(vehicles[i], world, dt);
    if (world.remaining < world.constructionProgressRemaining) {
      world.constructionProgressRemaining = world.remaining;
      world.constructionStallElapsed = 0;
    } else {
      world.constructionStallElapsed += dt;
    }
    resolveConstructionStall(world);
    if (world.foremanBuilt.length > 0) stepForemen(world);
    world.metrics.simulation += performance.now() - started;
  }

  // ---------- foremen ----------
  // Equipped foremen with counters and conditions (meta.js → equippedBonuses → campaign.foremen).
  // Every cube a worker, drone or machine finishes counts; cubes the crane or offline work set do
  // not, so the crane never feeds itself.

  // Crew-wide speed from foremen: «Бригадир смены» at the start, «Главный геодезист» per finished
  // floor (it stacks), «Оконщица» after a door or window, «Повар артели» after a meal.
  function foremanRush(world) {
    const campaign = world.campaign;
    const foremen = campaign.foremen;
    const now = campaign.levelElapsed;
    let factor = 1 + world.floorStack;
    if (foremen.rush && now < foremen.rush.value) factor *= foremen.rush.factor;
    if (foremen.windowRush && now < world.windowRushUntil) factor *= 1 + foremen.windowRush.value;
    if (foremen.feast && now < world.feastUntil) factor *= 1 + foremen.feast.value;
    return factor;
  }

  // «Табельщик»: after a smoke or a rest the worker is fresh for a while.
  function refreshAfterBreak(builder, world) {
    const fresh = world.campaign.foremen.afterBreak;
    if (!fresh) return;
    builder.fedLeft = fresh.second;
    builder.fedBoost = 1 + fresh.value;
  }

  // «Кладовщик»: the way to the quarry and back with a load is shorter.
  function haulFactor(builder, world) {
    const haul = world.campaign.foremen.haul;
    if (!haul) return 1;
    return builder.walkPurpose === 'mine' || builder.carry.length > 0 ? haul.value : 1;
  }

  // «Механик»: drones gather and set cubes faster (`second` of «machines», passive «droneGather»).
  function droneWork(world, effect, second) {
    const trigger = world.campaign.foremen[effect];
    if (!trigger) return 1;
    return second ? trigger.second : trigger.value;
  }

  // «Механик»: drones and machines move faster.
  function machineFactor(world) {
    const machines = world.campaign.foremen.machines;
    return machines ? machines.value : 1;
  }

  function every(trigger, count, second) {
    if (!trigger) return false;
    return count % Math.max(1, Math.round(second ? trigger.second : trigger.value)) === 0;
  }

  // «Подрядчик» gifts the level the player would buy next: the open, unmaxed level with the
  // earliest minute in the reference session (balance → session → pricedTimings).
  function giftUpgrade(world) {
    const campaign = world.campaign;
    let best = null;
    let bestMinute = Infinity;
    for (let i = 0; i < campaign.foremanKinds.length; i++) {
      const kind = campaign.foremanKinds[i];
      const spec = SESSION_BALANCE[kind];
      if (campaign.purchases[kind] >= spec.max || (kind === 'kitchen' && !campaign.kitchenUnlocked)) continue;
      const minute = spec.pricedTimings ? spec.pricedTimings[campaign.purchases[kind]] : campaign.purchases[kind];
      if (minute < bestMinute) {
        bestMinute = minute;
        best = kind;
      }
    }
    return best && buyUpgrade(campaign, world, best, true) ? best : null;
  }

  function stepForemen(world) {
    const campaign = world.campaign;
    const foremen = campaign.foremen;
    const built = world.foremanBuilt;
    world.foremanBuilt = [];
    for (let i = 0; i < built.length && campaign.status === 'play'; i++) {
      const block = built[i];
      world.foremanCubes += 1;
      const count = world.foremanCubes;
      if (every(foremen.recruit, count)) {
        campaign.metaBuilders += 1;
        campaign.builderCount += 1;
        spawnBuilder(world);
        world.events.push({ type: 'foreman', card: foremen.recruit.card });
      }
      if (every(foremen.contractor, count)) {
        const kind = giftUpgrade(world);
        if (kind) world.events.push({ type: 'foreman', card: foremen.contractor.card, kind: kind });
      }
      if (every(foremen.golden, count)) {
        const pay = grantPlacePay(world, block, pourTotal(block) * 24);
        world.events.push({
          type: 'foreman', card: foremen.golden.card, block: block, gained: pay.coins, capital: pay.capital,
          lucky: pay.lucky, luckyMultiplier: pay.luckyMultiplier,
        });
      }
      if (every(foremen.jackpot, count)) {
        const pay = grantPlacePay(world, block, pourTotal(block) * ((foremen.jackpot.second || 10) - 1));
        world.events.push({
          type: 'foreman', card: foremen.jackpot.card, jackpot: true, jackpotMultiplier: foremen.jackpot.second || 10, block: block, gained: pay.coins, capital: pay.capital,
          lucky: pay.lucky, luckyMultiplier: pay.luckyMultiplier,
        });
      }
      if (foremen.windowRush && block.feature) world.windowRushUntil = campaign.levelElapsed + 45;
      if (foremen.floorStack && floorDone(world, block.y)) {
        world.floorStack += foremen.floorStack.value;
        world.events.push({ type: 'foreman', card: foremen.floorStack.card, stack: world.floorStack });
      }
      if (every(foremen.crane, count) && world.remaining > 0) {
        const placed = applyOfflineBlocks(world, Math.round(foremen.crane.second));
        world.events.push({ type: 'foreman', card: foremen.crane.card, count: placed.length });
      }
    }
  }

  function floorDone(world, y) {
    const floor = world.floorBlocks[y];
    if (!floor || world.floorsDone[y]) return false;
    for (let i = 0; i < floor.length; i++) if (!floor[i].built) return false;
    world.floorsDone[y] = true;
    return true;
  }

  function beginFrame(world) {
    world.metrics.scheduler = 0;
    world.metrics.path = 0;
    world.metrics.scaffoldSearch = 0;
    world.metrics.simulation = 0;
    world.metrics.scaffoldExpansions = 0;
    world.metrics.pathSearches = 0;
    world.metrics.aStarSearches = 0;
    world.metrics.aStarPeak = null;
    world.metrics.assignments = 0;
    world.metrics.invalidations = 0;
  }

  function buyUpgrade(campaign, world, kind, gift) {
    const devKitchen = campaign.devGroups.all === true || campaign.devGroups.site === true;
    if (kind === 'kitchen' && !campaign.kitchenUnlocked && !devKitchen) return false;
    if (campaign.purchases[kind] >= SESSION_BALANCE[kind].max) return false;
    const cost = upgradeCost(kind, campaign.purchases[kind]);
    let freeRoll = gift === true || Math.random() < sessionValue('freeBuy', campaign.purchases.freeBuy);
    // View: why this level cost nothing ('gift' «Подрядчик», 'roll' «Бесплатная покупка», 'lucky').
    let freeBy = gift === true ? 'gift' : freeRoll ? 'roll' : '';
    if (!campaign.freePurchases && !freeRoll && campaign.coins < cost) return false;
    // «Счастливчик»: a bought level is sometimes on the house.
    const lucky = campaign.foremen.lucky;
    let luckyEvent = null;
    if (!freeRoll && !campaign.freePurchases && lucky && Math.random() < lucky.value) {
      freeRoll = true;
      freeBy = 'lucky';
      luckyEvent = { type: 'foreman', card: lucky.card, kind: kind, free: true, cost: cost, level: 0 };
      if (world) world.events.push(luckyEvent);
    }
    if (campaign.freePurchases) freeBy = '';
    if (!campaign.freePurchases && !freeRoll) campaign.coins -= cost;
    campaign.purchases[kind] += 1;
    if (luckyEvent) luckyEvent.level = campaign.purchases[kind];
    if (kind === 'builders') {
      const before = campaign.builderCount;
      campaign.builderCount = campaign.metaBuilders + sessionGain('builders', campaign.purchases.builders);
      const add = campaign.builderCount - before;
      if (world && campaign.status !== 'title' && campaign.status !== 'won') {
        for (let i = 0; i < add; i++) spawnBuilder(world);
      }
    }
    if (kind === 'vehicles') {
      const before = campaign.vehicleCount;
      campaign.vehicleCount = campaign.metaVehicles + sessionGain('vehicles', campaign.purchases.vehicles);
      const add = campaign.vehicleCount - before;
      if (world && campaign.status !== 'title' && campaign.status !== 'won') {
        for (let i = 0; i < add; i++) spawnVehicle(world);
      }
    }
    if (kind === 'engineers' && world && campaign.status !== 'title' && campaign.status !== 'won') {
      const next = sessionValue('engineers', campaign.purchases.engineers) + campaign.bonusDrones;
      const add = next - countTrade(world, 'engineer');
      for (let i = 0; i < add; i++) spawnEngineer(world);
    }
    if (kind === 'helicopters' && world && campaign.status !== 'title' && campaign.status !== 'won') {
      const next = sessionValue('helicopters', campaign.purchases.helicopters);
      const add = next - countKind(world, 'heli');
      for (let i = 0; i < add; i++) spawnHelicopter(world);
    }
    if (world && (kind === 'elevators' || kind === 'elevatorHeight')) activateElevators(world);
    if (world && (kind === 'plan' || kind === 'vehicleHeight' || kind === 'vehicleReach' || kind === 'bucket' || kind === 'loaderMass' || kind === 'patternHeight' || kind === 'heliMass' || kind === 'heliWidth' || kind === 'heliHeight')) {
      wakeVehicles(world);
    }
    if (world) {
      world.events.push({
        type: 'upgrade',
        kind: kind,
        level: campaign.purchases[kind],
        cost: cost,
        // free: the player paid nothing thanks to a roll or a foreman (not the dev free mode).
        free: freeBy !== '',
        freeBy: freeBy,
      });
    }
    return true;
  }

  function focusBlock(world) {
    let best = null;
    const blocks = world.blocks;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.built) continue;
      if (!block.ready) continue;
      if (!best || block.priority < best.priority) best = block;
    }
    return best;
  }

  function formatClock(seconds) {
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const secs = whole % 60;
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;
  }

  root.MicroBuilders = {
    MATERIALS: MATERIALS,
    MATERIAL: MATERIAL,
    MATERIAL_LADDER: MATERIAL_LADDER,
    GLASS: GLASS,
    BALANCE: BALANCE,
    VEHICLE: VEHICLE,
    SCAFFOLD: SCAFFOLD,
    pourGrid: pourGrid,
    pourTotal: pourTotal,
    pourCoord: pourCoord,
    UPGRADES: UPGRADES,
    LEVELS: LEVELS,
    HQ_LEVELS: HQ_LEVELS,
    SCHOOL_LEVELS: SCHOOL_LEVELS,
    SCHOOL_LEVEL_VARIANTS: SCHOOL_LEVEL_VARIANTS,
    schoolLevel: schoolLevel,
    createCampaign: createCampaign,
    startLevel: startLevel,
    advanceLevel: advanceLevel,
    beginFrame: beginFrame,
    stepWorld: stepWorld,
    buyUpgrade: buyUpgrade,
    upgradeCost: upgradeCost,
    statsOf: statsOf,
    upgradeValue: upgradeValue,
    carryOverload: carryOverload,
    carryLoad: carryLoad,
    carryWeight: carryWeight,
    tripLimitShare: tripLimitShare,
    carryKg: carryKg,
    planCubeLimit: planCubeLimit,
    focusBlock: focusBlock,
    formatClock: formatClock,
    applyOfflineBlocks: applyOfflineBlocks,
    applyOfflineMass: applyOfflineMass,
    unbuildableBlocks: unbuildableBlocks,
    isSupported: isSupported,
    cellKey: cellKey,
    elevatorRide: isElevatorHop,
    builderPosition: builderPosition,
    builderNeed: builderNeed,
    cranePose: cranePose,
    CRANE: CRANE,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
