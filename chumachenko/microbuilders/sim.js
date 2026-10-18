(function (root) {
  // Session simulator: steady-state coins / mass / capital per minute from session stats.
  //
  // Heuristic and cheap on purpose — no pathfinding, no graph search. A level is reduced once to a
  // static topology summary (cubes per material and floor, average distances to mines, elevator pads
  // and the building edge), so the estimate depends on the building's shape but never on what is
  // already built: online and offline always agree.
  //
  // Every session upgrade enters the formulas so that buying it can never lower the result
  // (see checkMonotonic). Weather and other temporary environment effects are left out.
  //
  // Needs only window.MicroBuildersBalance, so the balance tool can use it too:
  //   const summary = MicroBuildersSim.summarizeLevel(level);   // once per level
  //   const result = MicroBuildersSim.estimate(summary, stats); // stats: campaign-like object
  const BALANCE = root.MicroBuildersBalance;
  const SESSION = BALANCE.session;
  const TUNING = BALANCE.tuning;
  const WORK = TUNING.builders;
  const MACHINE = TUNING.machines;
  const DRONE = TUNING.drones;

  const HEURISTIC = {
    // Fitted to 56 headless runs of the campaign (28 levels × end-of-level and half purchases,
    // tools/simfit): setting and picking match the game exactly; walking, planning and
    // crew size are the fudge. Builder cases land within 0.7–1.4 of the real rate (most 0.85–1.2).
    crewEfficiency: 1.2,        // overall crew factor
    crewPower: 0.91,            // crew output grows as builders^crewPower: a big crew replans and waits more
    machineEfficiency: 0.3,     // machines: waiting for free clusters, parking search, cooldowns
    tripLatency: 0,             // fixed seconds per trip: job choice, route requests, short waits
    cubeLatency: 0.23,          // fixed seconds per cube that no upgrade removes
    frontierShare: 2.1,         // useful builders per cube of an average floor (only open cubes can be set)
    walkDetour: 1.23,           // grid paths around the site are longer than a straight line
    floorWalk: 1.45,            // extra cells walked per floor of height (along decks to the cube)
    scaffoldPiecesPerCube: 0.3, // ladder / deck pieces a cube above ground costs on average
    patternFill: 0.6,           // share of the pattern box a real cube cluster fills
    driveOverhead: 1.5,         // acceleration and turning per machine drive, seconds
    droneOverhead: 1.2,         // drone take-off and alignment per cube, seconds
    heliHookTravel: 5,          // cable travel to hook a pattern, cells
    craneCells: 16,             // loader crane travel per pattern (4 three-stage moves), cells
    craneFixedSeconds: 7,       // turret turns (~1 s) and pauses between crane stages per pattern
    edgeBuckets: 24,            // edge-distance histogram size (vehicle reach is far below it)
  };


  const formulaCache = {};
  function sessionValue(kind, level) {
    const spec = SESSION[kind];
    const locked = spec.overrides && spec.overrides[String(level)];
    if (locked !== undefined) return locked;
    // Keyed by the formula text, so edits in the balance tool take effect at once.
    let fn = formulaCache[spec.formula];
    if (!fn) {
      fn = new Function('x', 'Math', 'return (' + spec.formula.replace(/\^/g, '**') + ');');
      formulaCache[spec.formula] = fn;
    }
    return fn(level, Math);
  }

  // Material stats the simulator needs: whole cube weight, mini-cube (cell) weight and grid.
  function defaultMaterial(materialId) {
    const material = root.MicroBuilders.MATERIAL[materialId];
    return { weight: material.weight, cell: material.cell, grid: material.grid };
  }

  // ---------- static topology summary ----------

  // materialOf(id) → { weight, cell, grid } (defaults to MicroBuilders.MATERIAL).
  function summarizeLevel(level, materialOf) {
    const materialStats = materialOf || defaultMaterial;
    const fp = level.footprint;
    const centerX = (fp.minX + fp.maxX) / 2 + 0.5;
    const centerZ = (fp.minZ + fp.maxZ) / 2 + 0.5;
    const pads = (level.elevators || []).map(function (pad) { return [pad.x + 1.5, pad.z + 1.5]; });
    const home = level.spawnPoints[0];
    const firstMine = level.mines[0];
    const yardX = firstMine.x + 8;
    const yardZ = firstMine.z + 6;
    const groups = new Map();
    let droneDistSum = 0;
    let droneCubes = 0;
    let siteToEdge = Math.max(fp.maxX - fp.minX, fp.maxZ - fp.minZ) / 2;

    for (let i = 0; i < level.blocks.length; i++) {
      const block = level.blocks[i];
      const key = block.materialId + '|' + block.y;
      let group = groups.get(key);
      if (!group) {
        const stats = materialStats(block.materialId);
        group = {
          materialId: block.materialId,
          weight: stats.weight,
          part: stats.cell,
          parts: stats.grid * stats.grid * stats.grid,
          y: block.y,
          cubes: 0,
          machineCubes: 0,
          mineDistSum: 0,
          padDistSum: pads.map(function () { return 0; }),
          edgeHist: new Array(HEURISTIC.edgeBuckets).fill(0),
        };
        groups.set(key, group);
      }
      const mine = level.minesByMaterial[block.materialId] || firstMine;
      group.cubes += 1;
      group.mineDistSum += Math.hypot(block.x + 0.5 - mine.standX - 0.5, block.z + 0.5 - mine.standZ - 0.5);
      // Distance to the nearest of the first n elevator pads, for every n.
      let nearest = Infinity;
      for (let p = 0; p < pads.length; p++) {
        nearest = Math.min(nearest, Math.hypot(block.x + 0.5 - pads[p][0], block.z + 0.5 - pads[p][1]));
        group.padDistSum[p] += nearest;
      }
      if (!block.feature) {
        const edge = Math.min(block.x - fp.minX, fp.maxX - block.x, block.z - fp.minZ, fp.maxZ - block.z);
        group.machineCubes += 1;
        group.edgeHist[Math.min(HEURISTIC.edgeBuckets - 1, edge)] += 1;
        droneDistSum += Math.hypot(mine.x - yardX, mine.z - yardZ);
        droneCubes += 1;
      }
    }

    const list = [];
    groups.forEach(function (group) {
      list.push({
        materialId: group.materialId,
        weight: group.weight,
        part: group.part,
        parts: group.parts,
        y: group.y,
        cubes: group.cubes,
        machineCubes: group.machineCubes,
        mineDist: group.mineDistSum / group.cubes,
        padDist: group.padDistSum.map(function (sum) { return sum / group.cubes; }),
        edgeHist: group.edgeHist,
      });
    });
    let machineMass = 0;
    let machineCubes = 0;
    for (let i = 0; i < list.length; i++) {
      machineMass += list[i].machineCubes * list[i].weight;
      machineCubes += list[i].machineCubes;
    }
    const floors = new Set();
    for (let i = 0; i < list.length; i++) floors.add(list[i].y);
    return {
      pace: level.pace || 1,
      chapter: Math.floor((level.index || 0) / 10),
      maxY: fp.maxY,
      floors: Math.max(1, floors.size),
      groups: list,
      homeDist: Math.hypot(home[0] + 0.5 - centerX, home[2] + 0.5 - centerZ),
      yardHomeDist: Math.hypot(yardX - home[0], yardZ - home[2]),
      yardSiteDist: Math.max(0, Math.hypot(yardX - centerX, yardZ - centerZ) - siteToEdge),
      droneDist: droneCubes > 0 ? droneDistSum / droneCubes : 0,
      machineWeight: machineCubes > 0 ? machineMass / machineCubes : 0,
    };
  }

  // ---------- stats ----------

  function readStats(stats) {
    const p = stats.purchases;
    function v(kind) { return sessionValue(kind, p[kind] || 0); }
    function meta(name, fallback) { return stats[name] === undefined ? fallback : stats[name]; }
    const builders = meta('builderCount', v('builders'));
    const ranks = meta('metaWorkerRanks', []);
    // Ranked starting workers are already included in the total crew; later hires have rank 1.
    const timeEfficiency = builders > 0
      ? (builders - ranks.length + ranks.reduce(function (sum, rank) { return sum + rank; }, 0)) / builders
      : 1;
    return {
      v: v,
      level: function (kind) { return p[kind] || 0; },
      builders: builders,
      timeEfficiency: timeEfficiency,
      loaders: meta('vehicleCount', v('vehicles')),
      placeSpeed: meta('metaPlaceSpeed', 1),
      pickupSpeed: meta('metaPickupSpeed', 1),
      carry: meta('metaCarry', 0),
      carryScale: meta('metaCarryScale', 1),
      movement: meta('metaMovement', 1),
      scaffold: meta('metaScaffold', 1),
      plan: meta('metaPlan', 0),
      coin: meta('metaCoinMultiplier', 1),
      heightPenalty: meta('metaHeightPenalty', 1),
      hunger: meta('metaHunger', 1),
      smoke: meta('metaSmoke', 1),
      smokeShort: meta('metaSmokeShort', 1),
      overload: stats.foremen && stats.foremen.overload ? stats.foremen.overload.value : 1,
      droneGather: stats.foremen && stats.foremen.droneGather ? stats.foremen.droneGather.value : 1,
      restInterval: meta('restInterval', WORK.restInterval),
      restSeconds: meta('restSeconds', WORK.restSeconds),
      mealKitchenSeconds: meta('mealKitchenSeconds', WORK.mealKitchenSeconds),
      nightRelief: meta('metaNightRelief', 0),
    };
  }

  // Share of wall time a builder spends working, folding in smoke, rest and meal breaks plus the
  // hunger slowdown before a meal.
  function builderAvailability(s, walkSpeed) {
    const detour = HEURISTIC.walkDetour;
    const smokeEvery = (WORK.smokeDesireMin + WORK.smokeDesireMax) / 2 * s.v('smokeRare') * s.smoke;
    const smokeTrip = 2 * (WORK.smokeMinSquares + WORK.smokeMaxSquares) / 2 * detour / walkSpeed;
    const smokeBreak = smokeTrip + WORK.smokeSeconds / (s.v('smokeShort') * s.smokeShort);
    const grace = (WORK.hungerGraceMin + WORK.hungerGraceMax) / 2 * s.hunger;
    const hungry = WORK.hungerMax;
    const mealTrip = 2 * (WORK.mealMinSquares + WORK.mealMaxSquares) / 2 * detour / walkSpeed + WORK.mealSeconds;
    const mealBreak = s.level('kitchen') > 0
      ? Math.min(mealTrip, s.mealKitchenSeconds / s.v('kitchen'))
      : mealTrip;
    const debuff = (WORK.hungerDebuffMin + WORK.hungerDebuffMax) / 2;
    const productivity = (grace + hungry * (1 - debuff)) / (grace + hungry);
    const breaks = smokeBreak / smokeEvery + s.restSeconds / s.restInterval + mealBreak / (grace + hungry);
    return productivity / (1 + breaks);
  }

  function coinsPerCube(s, weight, y) {
    const lucky = 1 + s.v('triplePay') * (s.v('triplePower') - 1);
    return weight * WORK.coinPerKg * s.coin * s.v('cubePay') * s.v('payMultiplier') *
      (1 + y * s.v('floorPay')) * lucky;
  }

  // ---------- environment ----------

  // Night and weather of a site (meta.js → environment reads these too). A 20-minute day cycle
  // with night in its second half; weather phases of 3 minutes, bad weather from chapter 1 and a
  // storm from chapter 3.
  const ENVIRONMENT = {
    cycleSeconds: 1200,
    nightFrom: 600,
    nightWork: 0.72,
    nightMove: 0.82,
    weatherPhaseSeconds: 180,
    weather: { phase: 2, chapter: 1, work: 0.82, move: 0.86 },
    storm: { phase: 3, chapter: 3, work: 0.68, move: 0.75 },
  };

  function environmentAt(chapter, seconds, relief) {
    const night = seconds % ENVIRONMENT.cycleSeconds >= ENVIRONMENT.nightFrom;
    const phase = Math.floor(seconds / ENVIRONMENT.weatherPhaseSeconds) % 4;
    let work = night ? ENVIRONMENT.nightWork + (1 - ENVIRONMENT.nightWork) * relief : 1;
    let move = night ? ENVIRONMENT.nightMove + (1 - ENVIRONMENT.nightMove) * relief : 1;
    [ENVIRONMENT.weather, ENVIRONMENT.storm].forEach(function (bad) {
      if (phase === bad.phase && chapter >= bad.chapter) {
        work *= bad.work;
        move *= bad.move;
      }
    });
    return { night: night, phase: phase, work: work, move: move };
  }

  // Average work / move multipliers over the first `seconds` of a level: the schedule repeats every
  // hour, so whole hours use one precomputed integral and the rest is integrated in 10 s slices.
  // Within the first hour the average is taken as its running minimum: a shorter build never gets a
  // worse average, so an upgrade that speeds the site up can't lower the estimate.
  const environmentCache = {};
  function environmentAverage(chapter, seconds, relief) {
    const key = Math.min(chapter, 3) + '|' + relief;
    let table = environmentCache[key];
    if (!table) {
      table = { work: [0], move: [0] };
      for (let t = 0; t < 3600; t += 10) {
        const value = environmentAt(chapter, t + 5, relief);
        table.work.push(table.work[table.work.length - 1] + value.work * 10);
        table.move.push(table.move[table.move.length - 1] + value.move * 10);
      }
      table.minWork = [1];
      table.minMove = [1];
      for (let i = 1; i <= 360; i++) {
        table.minWork.push(Math.min(table.minWork[i - 1], table.work[i] / (i * 10)));
        table.minMove.push(Math.min(table.minMove[i - 1], table.move[i] / (i * 10)));
      }
      environmentCache[key] = table;
    }
    const span = Math.max(10, seconds);
    const hours = Math.floor(span / 3600);
    const slot = Math.min(360, Math.round((span - hours * 3600) / 10));
    const firstHour = hours > 0 ? 360 : Math.max(1, slot);
    return {
      work: Math.min(table.minWork[firstHour], (hours * table.work[360] + table.work[slot]) / (hours * 3600 + slot * 10)),
      move: Math.min(table.minMove[firstHour], (hours * table.move[360] + table.move[slot]) / (hours * 3600 + slot * 10)),
    };
  }

  // ---------- estimate ----------

  // Builders: seconds of crew work per cube, mass, coins and capital over the whole building.
  // `work` and `move` scale setting and walking (night and weather).
  function builderPass(summary, s, work, move) {
    const pace = summary.pace;
    const detour = HEURISTIC.walkDetour;
    // Average rank speeds up worker actions and walking, but not elevator travel or machines.
    const efficiency = s.timeEfficiency;
    const walk = s.v('horizontal') * s.movement * move * efficiency / pace;
    const climb = s.v('vertical') * s.movement * move * efficiency / pace;
    const build = s.v('speed') * s.placeSpeed * work * efficiency / pace;
    const capacity = s.v('carry') * s.carryScale + s.carry;
    const lighter = s.v('lightCarry');
    const planLimit = Math.max(1, Math.floor(s.v('plan') + s.plan));
    const pickup = s.v('pickup') * s.pickupSpeed * efficiency / pace;
    const scaffoldSeconds = TUNING.scaffold.erectSeconds * pace / (s.v('scaffold') * s.scaffold * efficiency);
    const elevatorCount = Math.min(s.v('elevators'), summary.groups.length ? summary.groups[0].padDist.length : 0);
    const elevatorTop = s.v('elevatorHeight');
    const perFloor = s.v('elevatorSpeed');
    // One desk visit per plan; how many cubes a plan holds depends on the material (see below).
    const planVisit = 2 * summary.homeDist * detour / walk + WORK.planSeconds / efficiency;
    const result = { mass: 0, cubes: 0, coins: 0, capital: 0, experience: 0, seconds: 0, walk: walk };
    const capitalChance = s.v('cubeCapital') + s.v('capitalChance');
    const budgetCapital = s.v('budgetCapital');

    // Workers carry and set mini-cubes (grid³ per cube, each one cell of mass). A plan is one trip:
    // up to planLimit whole cubes and no heavier than the carry. A cube heavier than the carry is a
    // plan of its own and goes in parts (ceil(parts / per trip) trips); a single mini-cube heavier
    // than the carry goes alone, overloaded.
    for (let i = 0; i < summary.groups.length; i++) {
      const g = summary.groups[i];
      const carried = g.part / lighter;
      const cubeWeight = carried * g.parts;
      let perTrip;
      let tripsPerCube;
      let cubesPerPlan = 1;
      if (carried > capacity) {
        perTrip = 1;
        tripsPerCube = g.parts;
      } else if (cubeWeight > capacity) {
        perTrip = Math.floor(capacity / carried);
        tripsPerCube = Math.ceil(g.parts / perTrip);
      } else {
        cubesPerPlan = Math.max(1, Math.min(planLimit, Math.floor(capacity / cubeWeight)));
        perTrip = cubesPerPlan * g.parts;
        tripsPerCube = 1 / cubesPerPlan;
      }
      const planOverhead = planVisit / cubesPerPlan;
      const overload = 1 + (Math.max(1, carried * perTrip / capacity) - 1) * s.overload;
      const flat = (g.mineDist + g.y * HEURISTIC.floorWalk) * detour / walk;
      const ladder = g.y / climb;
      let up = ladder * overload;
      let down = ladder;
      if (elevatorCount > 0 && g.y <= elevatorTop) {
        const toPad = g.padDist[elevatorCount - 1] / walk;
        up = Math.min(up, toPad * overload + g.y * perFloor);
        down = Math.min(down, toPad + g.y * perFloor);
      }
      const place = g.part / build * (1 + g.y * WORK.heightStep * s.heightPenalty);
      const scaffold = g.y > 0 ? HEURISTIC.scaffoldPiecesPerCube * scaffoldSeconds : 0;
      const mine = g.part / pickup;
      const walks = flat + flat * overload + up + down + HEURISTIC.tripLatency / efficiency;
      result.seconds += g.cubes * (tripsPerCube * walks + g.parts * (mine + place) + scaffold + HEURISTIC.cubeLatency / efficiency + planOverhead);
      const pay = coinsPerCube(s, g.weight, g.y);
      result.mass += g.cubes * g.weight;
      result.cubes += g.cubes;
      // Base XP is cbrt(full mass) per whole cube, independent of grid subdivisions and construction method.
      result.experience += g.cubes * Math.cbrt(g.weight);
      result.coins += g.cubes * pay;
      result.capital += g.cubes * (pay * budgetCapital + capitalChance);
    }
    return result;
  }

  // Level seconds for a builder pass plus machines.
  function levelSeconds(summary, s, pass, machines) {
    const availability = builderAvailability(s, pass.walk);
    // Only cubes whose support is already built can be set, so a crew larger than the open
    // frontier of a floor adds less and less.
    const frontier = Math.max(1, HEURISTIC.frontierShare * pass.cubes / summary.floors);
    const crew = Math.pow(s.builders, HEURISTIC.crewPower) * frontier / (s.builders + frontier);
    const builderMassRate = crew * availability * HEURISTIC.crewEfficiency * pass.mass / pass.seconds;
    const pool = Math.min(pass.mass, machines.poolMass);
    // Machines only take the cubes they can reach; builders finish the rest.
    const seconds = Math.max(
      pass.mass / (builderMassRate + machines.massRate),
      (pass.mass - pool) / builderMassRate
    );
    return { seconds: seconds, availability: availability, builderMassRate: builderMassRate, pool: pool };
  }

  function estimate(summary, stats) {
    const s = readStats(stats);
    let pass = builderPass(summary, s, 1, 1);
    if (pass.cubes === 0) {
      return { coinsPerMinute: 0, massPerMinute: 0, capitalPerMinute: 0, effectiveCoinsPerMinute: 0, cubesPerMinute: 0, experiencePerMinute: 0 };
    }
    const machines = machineRate(summary, s);
    let level = levelSeconds(summary, s, pass, machines);
    // Night and weather, averaged over the time this building takes (stats.environment === false
    // turns them off, e.g. to compare with headless runs that skip the environment;
    // stats.environmentSeconds averages over a given span instead, e.g. the session time so far).
    if (stats.environment !== false) {
      const span = stats.environmentSeconds || level.seconds;
      const environment = environmentAverage(summary.chapter || 0, span, s.nightRelief);
      pass = builderPass(summary, s, environment.work, environment.move);
      level = levelSeconds(summary, s, pass, machines);
    }
    const seconds = level.seconds;
    const perMinute = 60 / seconds;
    const freeBuy = Math.min(0.95, s.v('freeBuy'));
    return {
      coinsPerMinute: pass.coins * perMinute,
      massPerMinute: pass.mass * perMinute,
      cubesPerMinute: pass.cubes * perMinute,
      experiencePerMinute: pass.experience * perMinute,
      capitalPerMinute: pass.capital * perMinute,
      // Free purchases stretch the budget: coins worth of upgrades bought per minute.
      effectiveCoinsPerMinute: pass.coins * perMinute / (1 - freeBuy),
      levelSeconds: seconds,
      builders: {
        count: s.builders,
        availability: level.availability,
        secondsPerCube: pass.seconds / pass.cubes,
        massPerMinute: level.builderMassRate * 60,
      },
      machines: {
        massPerMinute: machines.massRate * 60,
        poolMass: level.pool,
      },
    };
  }

  // Share of machine-placeable mass a loader's boom can reach (height and radius upgrades).
  function loaderReachShare(summary, s) {
    const reach = s.v('vehicleReach');
    const height = s.v('vehicleHeight');
    let reachable = 0;
    let total = 0;
    for (let i = 0; i < summary.groups.length; i++) {
      const g = summary.groups[i];
      total += g.machineCubes * g.weight;
      if (g.y + 1 > height) continue;
      let cubes = 0;
      for (let d = 0; d < g.edgeHist.length && d + 1 <= reach; d++) cubes += g.edgeHist[d];
      reachable += cubes * g.weight;
    }
    return total > 0 ? reachable / total : 0;
  }

  // Construction drones assemble patterns for loaders and helicopters; whatever drone time the
  // machines leave unused goes into slow direct building (fly a cube to the site and set it).
  // A drone-second spent on patterns always yields at least as much as one spent building directly,
  // so buying machines never lowers the estimate.
  function machineRate(summary, s) {
    const drones = s.v('engineers');
    const loaders = s.loaders;
    const helis = s.v('helicopters');
    const none = { massRate: 0, poolMass: 0 };
    if (drones < 1 || summary.machineWeight <= 0) return none;
    const pace = summary.pace;
    const weight = summary.machineWeight;
    const flySpeed = s.v('droneSpeed') / pace;
    const gather = weight / (s.v('gather') * s.droneGather) * pace + 0.6;
    const climb = 2 * 3.4 / Math.max(1.2, flySpeed * 0.7);
    const patternCube = 2 * summary.droneDist / flySpeed + gather + 0.55 + climb + HEURISTIC.droneOverhead;
    const directCube = Math.max(
      patternCube,
      2 * (summary.droneDist + summary.yardSiteDist) / flySpeed + gather +
        weight / s.v('droneBuild') * pace +
        2 * (summary.maxY + 2.2) / Math.max(1.2, flySpeed * 0.7) + HEURISTIC.droneOverhead
    );
    const assemblePerCube = patternCube / drones;
    const route = summary.yardHomeDist + summary.yardSiteDist + summary.homeDist;

    let patternRate = 0;
    if (loaders >= 1) {
      const size = Math.max(1, Math.min(
        Math.floor(s.v('loaderMass') / weight),
        Math.floor(s.v('bucket') * s.v('bucket') * s.v('patternHeight') * HEURISTIC.patternFill)
      ));
      const cycle = route * HEURISTIC.walkDetour / s.v('loaderSpeed') * pace +
        3 * HEURISTIC.driveOverhead +
        (HEURISTIC.craneCells + summary.maxY * 0.5) * s.v('boomSpeed') * pace +
        HEURISTIC.craneFixedSeconds +
        MACHINE.cooldownSeconds;
      patternRate += loaders * size / (cycle + size * assemblePerCube) * loaderReachShare(summary, s);
    }
    if (helis >= 1) {
      const size = Math.max(1, Math.min(
        Math.floor(s.v('heliMass') / weight),
        Math.floor(s.v('heliWidth') * s.v('heliWidth') * s.v('heliHeight') * HEURISTIC.patternFill)
      ));
      const cycle = route / s.v('heliSpeed') * pace +
        3 * HEURISTIC.driveOverhead +
        HEURISTIC.heliHookTravel / MACHINE.hookSpeed +
        summary.maxY / MACHINE.heliClimbSpeed +
        MACHINE.lowerSeconds + MACHINE.cooldownSeconds;
      patternRate += helis * size / (cycle + size * assemblePerCube);
    }
    // In the game every machine keeps one drone for patterns and the others build directly.
    // Take the best reserve up to the machine count, so adding a machine never lowers the result.
    const machines = (loaders >= 1 ? loaders : 0) + (helis >= 1 ? helis : 0);
    let cubeRate = drones / directCube;
    for (let reserve = 1; reserve <= Math.min(drones, machines); reserve++) {
      const rate = Math.min(patternRate, reserve / patternCube) + (drones - reserve) / directCube;
      if (rate > cubeRate) cubeRate = rate;
    }

    // Drones can set any regular cube, so with drones the whole non-feature mass is open to machines.
    let poolMass = 0;
    for (let i = 0; i < summary.groups.length; i++) poolMass += summary.groups[i].machineCubes * summary.groups[i].weight;
    return { massRate: cubeRate * weight * HEURISTIC.machineEfficiency, poolMass: poolMass };
  }

  // Dev check: buying one more level of any upgrade must not lower coins per minute.
  function checkMonotonic(summary, stats) {
    const base = estimate(summary, stats).coinsPerMinute;
    const failures = [];
    Object.keys(SESSION).forEach(function (kind) {
      const level = stats.purchases[kind] || 0;
      if (level >= SESSION[kind].max) return;
      const purchases = Object.assign({}, stats.purchases);
      purchases[kind] = level + 1;
      const next = Object.assign({}, stats, { purchases: purchases });
      if (kind === 'builders' && stats.builderCount !== undefined) {
        next.builderCount = stats.builderCount + sessionValue('builders', level + 1) - sessionValue('builders', level);
      }
      if (kind === 'vehicles' && stats.vehicleCount !== undefined) {
        next.vehicleCount = stats.vehicleCount + sessionValue('vehicles', level + 1) - sessionValue('vehicles', level);
      }
      const value = estimate(summary, next).coinsPerMinute;
      if (value < base - 1e-9) failures.push({ kind: kind, from: base, to: value });
    });
    return failures;
  }

  root.MicroBuildersSim = {
    HEURISTIC: HEURISTIC,
    ENVIRONMENT: ENVIRONMENT,
    environmentAt: environmentAt,
    environmentAverage: environmentAverage,
    sessionValue: sessionValue,
    summarizeLevel: summarizeLevel,
    estimate: estimate,
    checkMonotonic: checkMonotonic,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
