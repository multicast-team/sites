(function (root) {
  const STORAGE_KEY = 'microbuilders.meta.v1';
  const EXCHANGE_INTERVAL_MS = 2 * 60 * 60 * 1000;

  const RARE_KEYS = ['residential', 'industrial', 'highrise', 'landmark'];
  const RARE_NAMES = {
    residential: 'Жилой ресурс',
    industrial: 'Промышленный ресурс',
    highrise: 'Высотный ресурс',
    landmark: 'Ресурс памятников',
  };

  // Foremen: cards, drop chances, pity and upgrade costs live in balance.json → meta → foremen.
  const FOREMEN = root.MicroBuildersBalance.meta.foremen;
  const CARDS = FOREMEN.cards;
  const RARITIES = ['common', 'rare', 'epic', 'legendary'];
  const RARITY_NAMES = {
    common: 'Обычная',
    rare: 'Редкая',
    epic: 'Эпическая',
    legendary: 'Легендарная',
  };

  // Office, technologies, exchange upgrades and HQ projects come from balance.json → meta: the wanted
  // purchase time (minutes of active play), value formula, maximum and the prices calibrated for that
  // time (metasim.js → calibrate). An office line opens with the story level the scenario reaches by
  // its opening minute (`from / 2`; `level`, written by calibration). Technologies follow the session
  // graph branches; an exchange upgrade opens after the previous one (`after`).
  const META_BALANCE = root.MicroBuildersBalance.meta;
  const SCHOOL = META_BALANCE.school;
  const OFFICE = META_BALANCE.office;
  const OFFICE_SECTIONS = ['Рабочая сила', 'Экономика', 'Организация'];
  const OFFICE_ROWS = {};
  OFFICE_SECTIONS.forEach(function (section) {
    OFFICE_ROWS[section] = Object.keys(OFFICE)
      .filter(function (id) { return OFFICE[id].section === section; })
      .sort(function (x, y) { return (OFFICE[x].level || 0) - (OFFICE[y].level || 0) || OFFICE[x].from - OFFICE[y].from; });
  });
  const TECH = META_BALANCE.tech;
  const TECH_ORDER = Object.keys(TECH).sort(function (x, y) { return TECH[x].from - TECH[y].from; });

  const formulaCache = {};
  function evalFormula(formula, x) {
    let fn = formulaCache[formula];
    if (!fn) {
      fn = new Function('x', 'Math', 'return (' + formula.replace(/\^/g, '**') + ');');
      formulaCache[formula] = fn;
    }
    return fn(x, Math);
  }

  // Coins the reference session spends in its first `minutes` (session prices by their minutes):
  // «Аванс заказчика» hands them out at the start, so an order skips its first minutes.
  let skipQueue = null;
  function skipCoins(minutes) {
    if (!skipQueue) {
      skipQueue = [];
      const session = root.MicroBuildersBalance.session;
      Object.keys(session).forEach(function (kind) {
        (session[kind].prices || []).forEach(function (price, i) {
          skipQueue.push({ minute: session[kind].pricedTimings[i], price: price });
        });
      });
      skipQueue.sort(function (a, b) { return a.minute - b.minute; });
    }
    let coins = 0;
    for (let i = 0; i < skipQueue.length && skipQueue[i].minute <= minutes; i++) coins += skipQueue[i].price;
    return coins;
  }

  // The extra starting coins a crew adds on top of the current office advance. Convert the
  // combined reference time first: prices grow, so separately converted bonuses are not additive.
  function startCoinBonus(state, minutes) {
    const officeMinutes = OFFICE.startCoins.skipStep * state.office.startCoins;
    return skipCoins(officeMinutes + minutes) - skipCoins(officeMinutes);
  }

  // Value of an office line at a given level (unlock nodes: 0 or 1).
  function officeValue(id, level) {
    const spec = OFFICE[id];
    if (spec.skipStep) return skipCoins(spec.skipStep * level);
    if (!spec.formula) return level > 0 ? 1 : 0;
    return evalFormula(spec.formula, level);
  }

  // An exchange upgrade is open once the one before it has `afterLevel` levels.
  function lineUnlocked(levels, spec) {
    return !spec.after || levels[spec.after] >= (spec.afterLevel || 1);
  }

  // The quarter (game.js draws it, docs/gdd/16-ux-flow.md §8): a boulevard from the camera into
  // the distance, two columns of lots (col −1 left, +1 right of the avenue), rows in unlock order,
  // every facade facing the camera. Buildings that are not in the game yet (zone: 'expansion') wait
  // together behind one fence at the far end. sign — short name on the floating sign, accent — its colour.
  const CITY = [
    { id: 'office', row: 0, col: -1, sign: 'Офис', accent: '#e0a860' },
    { id: 'recruiting', row: 0, col: 1, sign: 'Школа', accent: '#7cc29a' },
    { id: 'tech', row: 1, col: -1, sign: 'Техцентр', accent: '#8f8cf0' },
    { id: 'personnel', row: 1, col: 1, sign: 'Персонал', accent: '#d9805a' },
    { id: 'exchange', row: 2, col: -1, sign: 'Биржа', accent: '#6fa3d8' },
    { id: 'garage', row: 2, col: 1, sign: 'Гараж', accent: '#e9c04a' },
    { id: 'contracts', row: 3, col: -1, sign: 'Контракты', accent: '#d07aa0' },
    { id: 'materials', zone: 'expansion', sign: 'Лаборатория' },
    { id: 'clinic', zone: 'expansion', sign: 'Клиника' },
    { id: 'logistics', zone: 'expansion', sign: 'Логистика' },
    { id: 'weather', zone: 'expansion', sign: 'Аварийная служба' },
    { id: 'subcontract', zone: 'expansion', sign: 'Субподряд' },
  ];

  // Which meta node opens each session upgrade: '' — open from the start, 'tech:<id>' — a technology
  // of the tech center, or 'hq:<project>' — a built HQ building. Lines nobody opens stay closed
  // (budgetCapital for now).
  const SESSION_LINE = { builders: '', speed: '', plan: '' };
  TECH_ORDER.forEach(function (id) {
    (TECH[id].opens || []).forEach(function (kind) { SESSION_LINE[kind] = 'tech:' + id; });
  });
  Object.keys(META_BALANCE.projects).forEach(function (id) {
    (META_BALANCE.projects[id].opens || []).forEach(function (kind) { SESSION_LINE[kind] = 'hq:' + id; });
  });

  // text — one line about the building; gives — «Что даёт» on its card (lines it opens on the site
  // are added from balance meta.projects[id].opens by game.js); opened — what the completion card
  // says it opened. live: false — no HQ level yet («Скоро» in the expansion zone).
  const PROJECTS = {
    office: { name: 'Главный офис', unlock: 1, capital: 20, text: 'Простой первый штаб. Внутри три отдела прокачек.', gives: 'Три отдела постоянных прокачек для всех строек', opened: 'отделы постоянных прокачек', live: true },
    tech: { name: 'Технологический центр', unlock: 3, capital: 40, text: 'Открывает новые прокачки стройки по веткам развития', gives: 'Все технологии стройки: ноша, маршруты, дроны, погрузчики, лифты и вертолёты — по веткам развития', opened: 'новые прокачки стройки', live: true },
    exchange: { name: 'Биржа', unlock: 12, capital: 200, text: 'Повторные старые заказы', gives: 'Повторные старые заказы за редкие ресурсы', opened: 'старые заказы', live: true },
    recruiting: { name: 'Школа бригадиров', unlock: 2, capital: 5, text: 'Испытания, обучение и найм бригадиров', gives: 'Бригадиры в сундуках, экспертиза, наставничество и испытания за дипломы', opened: 'школа бригадиров', live: true },
    garage: { name: 'Гараж', unlock: 26, capital: 900, text: 'Даёт дополнительную машину на старте после открытия технологии «Погрузчики»', gives: 'Машина на старте каждой стройки после открытия «Погрузчиков» в техцентре', opened: 'машина на старте после открытия «Погрузчиков»', live: true },
    materials: { name: 'Лаборатория материалов', unlock: 30, capital: 1600, text: 'Мелкая сетка и редкие материалы', live: false },
    logistics: { name: 'Логистический центр', unlock: 36, capital: 2800, text: 'Высота, лифты и краны', live: false },
    contracts: { name: 'Контрактное бюро', unlock: 42, capital: 5000, text: 'Испытания на время', gives: 'Контракты: испытания на время за печати', opened: 'контрактная ветка', live: true },
    subcontract: { name: 'Агентство субподряда', unlock: 50, capital: 9000, text: 'Автоматизация старых заказов', live: false },
    personnel: { name: 'Центр персонала', unlock: 10, capital: 80, text: 'Кухня и перекуры: открывает «Полевую кухню», «Реже перекуры» и «Короче перекуры»', gives: 'Кухня и перекуры бригады', opened: 'кухня и перекуры', live: true },
    clinic: { name: 'Клиника', unlock: 32, capital: 1900, text: 'Травмы и лечение', live: false },
    weather: { name: 'Аварийная служба', unlock: 44, capital: 6000, text: 'Погода, поломки и восстановление', live: false },
  };
  Object.keys(PROJECTS).forEach(function (id) {
    const tuned = META_BALANCE.projects[id];
    PROJECTS[id].opens = tuned && tuned.opens ? tuned.opens.slice() : [];
    if (!tuned) return;
    PROJECTS[id].unlock = tuned.unlock;
    if (tuned.capital !== undefined) PROJECTS[id].capital = tuned.capital;
    PROJECTS[id].seals = tuned.seals || 0;
    PROJECTS[id].rewardSeals = tuned.rewardSeals || 0;
  });

  function createState() {
    return {
      version: 2,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      campaignLevel: 0,
      capital: 0,
      seals: 0,
      diplomas: 0,
      school: createSchoolState(),
      rare: { residential: 0, industrial: 0, highrise: 0, landmark: 0 },
      completed: [],
      claimedChests: {},
      office: Object.keys(OFFICE).reduce(function (office, id) { office[id] = 0; return office; }, {}),
      tech: TECH_ORDER.reduce(function (tech, id) { tech[id] = 0; return tech; }, {}),
      hq: {
        office: 0,
        tech: 0,
        exchange: 0,
        recruiting: 0,
        garage: 0,
        materials: 0,
        logistics: 0,
        contracts: 0,
        subcontract: 0,
        personnel: 0,
        clinic: 0,
        weather: 0,
      },
      plots: {
        office: 0,
        tech: 0,
        personnel: 0,
        exchange: 0,
        recruiting: 0,
        garage: 0,
        materials: 0,
        logistics: 0,
        contracts: 0,
        subcontract: 0,
        clinic: 0,
        weather: 0,
      },
      cards: Object.keys(CARDS).reduce(function (cards, id) {
        cards[id] = { copies: 0, level: 0, experience: 0 };
        return cards;
      }, {}),
      cardPity: { epic: 0, legendary: 0 },
      cardsSeen: {},
      recruit: { stock: 0, nextAt: 0 },
      carryCoins: 0,
      // Crew presets: the crew last started per run mode («Как в прошлый раз» and the briefing's
      // prefill). The crew of a running site lives in its snapshot (sites.<key>.crew), locked.
      // HQ buildings are built without foremen, so they have no preset.
      equipped: [],
      contractEquipped: [],
      crewPresets: { exchange: [], school: [] },
      hqSite: null,
      citySeen: {},
      exchange: {
        capacity: 5,
        capacityLevel: 0,
        intervalLevel: 0,
        rewardLevel: 0,
        capitalLevel: 0,
        orders: [],
        nextOrderAt: Date.now(),
      },
      contract: {
        index: 0,
        cooldownUntil: 0,
      },
      // Construction sites (docs/gdd/16-ux-flow.md §1): the story order, an HQ building and a side
      // order (contract or exchange) each keep their own snapshot; `activeSite` is the one on screen.
      sites: { campaign: null, hq: null, side: null },
      activeSite: 'campaign',
      // The page went into the background at this time (null while it is on screen): the next claim
      // counts the absence from here, because every save moves lastSeenAt.
      hiddenAt: null,
      // crewCoach: the one-time hint of the first briefing with foremen was shown.
      flags: { awayExplained: false, crewCoach: false },
      settings: { sound: true },
    };
  }

  const SITE_KEYS = ['campaign', 'hq', 'side'];

  function siteKey(runMode) {
    if (runMode === 'hq') return 'hq';
    if (runMode === 'contract' || runMode === 'exchange' || runMode === 'school') return 'side';
    return 'campaign';
  }

  function siteLevel(runMode, levelIndex, payload) {
    const MB = root.MicroBuilders;
    if (runMode === 'hq') return payload && MB.HQ_LEVELS[payload.projectId] || null;
    if (runMode === 'school') return payload && MB.schoolLevel(payload.bossId, payload.tier) || null;
    return MB.LEVELS[levelIndex] || null;
  }

  function siteName(runMode, levelIndex, payload) {
    if (runMode === 'hq') return payload && PROJECTS[payload.projectId] ? PROJECTS[payload.projectId].name : 'Штаб';
    const level = siteLevel(runMode, levelIndex, payload);
    return level ? level.name : '';
  }

  // Save format v1 kept up to three runs in session / suspendedSession / hqSession; v2 puts them into
  // named slots. Runs once (version check) and also rescues the orphan left by older bugs: the main
  // run sitting in suspendedSession while session is empty.
  function migrateSites(state) {
    const sites = { campaign: null, hq: null, side: null };
    function put(snap) {
      if (!snap || !snap.builtIds) return;
      const key = siteKey(snap.runMode);
      const level = siteLevel(snap.runMode, snap.levelIndex, snap.runPayload);
      if (!level) return;
      const total = level.blocks.length;
      const complete = snap.builtIds.length >= total;
      // Finished runs were paid when they finished: a finished side or HQ run has nothing left to show.
      if (complete && key !== 'campaign') return;
      const prev = sites[key];
      // Two story runs (the old «Заново» bug, which could turn a contract into a story run that is
      // ahead of the story): keep the one at the player's story level, else the one further along.
      if (prev) {
        const fits = function (run, done) {
          return run.levelIndex === state.campaignLevel || (done && run.levelIndex + 1 === state.campaignLevel);
        };
        const prevFits = fits(prev, prev.status === 'complete');
        const snapFits = fits(snap, complete);
        if (prevFits && !snapFits) return;
        if (prevFits === snapFits && prev.levelIndex >= snap.levelIndex) return;
      }
      sites[key] = Object.assign({}, snap, {
        key: key,
        status: complete ? 'complete' : 'play',
        name: siteName(snap.runMode, snap.levelIndex, snap.runPayload),
        total: total,
        built: snap.builtIds.length,
        coinsEarned: snap.coinsEarned || 0,
        // v1 had two crews: contracts had their own, every other run used the story one.
        crew: (snap.runMode === 'contract' ? state.contractEquipped || [] : state.equipped || []).slice(),
        foreman: { cubes: 0, floorStack: 0, bonusBuilders: 0 },
        awaySince: null,
        awayBank: 0,
        awayElapsed: 0,
        reward: null,
      });
    }
    put(state.session);
    put(state.suspendedSession);
    put(state.hqSession);
    state.sites = sites;
    const activeKey = state.session ? siteKey(state.session.runMode) : 'campaign';
    state.activeSite = sites[activeKey] ? activeKey : 'campaign';
    delete state.session;
    delete state.suspendedSession;
    delete state.hqSession;
    delete state.offlineReport;
    state.version = 2;
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return createState();
    const state = JSON.parse(raw);
    const fresh = createState();
    if (!state.school) state.school = fresh.school;
    if (state.diplomas === undefined) state.diplomas = 0;
    Object.keys(fresh.cards).forEach(function (id) {
      if (!state.cards[id]) state.cards[id] = fresh.cards[id];
    });
    Object.keys(fresh.office).forEach(function (id) {
      if (state.office[id] === undefined) state.office[id] = 0;
    });
    if (!state.tech) state.tech = fresh.tech;
    if (!state.plots) state.plots = {};
    Object.keys(fresh.plots).forEach(function (id) {
      if (state.plots[id] === undefined) state.plots[id] = state.hq[id] > 0 ? 1 : 0;
    });
    if (!state.contractEquipped) state.contractEquipped = [];
    state.crewPresets = Object.assign({}, fresh.crewPresets, state.crewPresets || {});
    if (!state.cardPity) state.cardPity = { epic: 0, legendary: 0 };
    if (!state.cardsSeen) state.cardsSeen = {};
    if (!state.recruit) state.recruit = { stock: 0, nextAt: 0 };
    if (!state.carryCoins) state.carryCoins = 0;
    if (state.hqSite === undefined) state.hqSite = null;
    if (!state.citySeen) state.citySeen = {};
    if (!state.version || state.version < 2) migrateSites(state);
    if (!state.sites) state.sites = fresh.sites;
    SITE_KEYS.forEach(function (key) {
      if (state.sites[key] === undefined) state.sites[key] = null;
    });
    if (SITE_KEYS.indexOf(state.activeSite) < 0) state.activeSite = 'campaign';
    if (state.hiddenAt === undefined) state.hiddenAt = null;
    state.flags = Object.assign({}, fresh.flags, state.flags || {});
    state.settings = Object.assign({}, fresh.settings, state.settings || {});
    lockSiteCrews(state);
    return state;
  }

  // Every site keeps the crew it started with (older saves: the preset of its mode). The same card
  // may work on several sites at once; HQ buildings have no foremen.
  function lockSiteCrews(state) {
    SITE_KEYS.forEach(function (key) {
      const snap = state.sites[key];
      if (!snap) return;
      snap.crew = siteCrew(state, snap.runMode, snap.crew || crewOf(state, snap.runMode));
    });
  }

  function save(state) {
    state.lastSeenAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clearSave() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Price of the next level (level → level + 1).
  function officeCost(kind, level) {
    const prices = OFFICE[kind].prices;
    if (prices && prices.length > 0) return prices[Math.min(level, prices.length - 1)];
    return Math.round(10 * Math.pow(2, level));
  }

  // Value of a foreman's effect at a level (formula2 — the second number of two-part effects).
  function cardValue(id, level, second) {
    const spec = CARDS[id];
    return evalFormula(second ? spec.formula2 : spec.formula, level);
  }

  // Expertise has one baked XP ladder for every rarity. Star level only changes XP earned.
  function expertiseLevel(card) {
    const rows = FOREMEN.expertise.levels;
    const experience = card.experience || 0;
    let level = 0;
    while (level < rows.length && experience >= rows[level].experience) level++;
    return level;
  }

  function expertiseProgress(card) {
    const level = expertiseLevel(card);
    const rows = FOREMEN.expertise.levels;
    const previous = level ? rows[level - 1].experience : 0;
    const next = rows[level];
    return { level: level, max: rows.length, experience: card.experience || 0,
      current: next ? (card.experience || 0) - previous : 0,
      required: next ? next.experience - previous : 0,
      fraction: next ? Math.min(1, ((card.experience || 0) - previous) / (next.experience - previous)) : 1 };
  }

  function cardExperienceMultiplier(level) {
    if (level <= 0) return 0;
    const multipliers = FOREMEN.expertise.starMultipliers;
    return multipliers[Math.min(Math.floor(level), multipliers.length) - 1];
  }

  // Every three expertise levels finish one senior worker; the next worker grows junior → senior.
  function expertiseWorkers(level) {
    const ranks = [];
    for (let i = 0; i < Math.floor(level / 3); i++) ranks.push(1.2);
    if (level % 3) ranks.push(level % 3 === 1 ? 0.8 : 1);
    return ranks;
  }

  function cardPassive(id, level, second) {
    const passive = CARDS[id].passive;
    if (passive.effect === 'startBuilders') return expertiseWorkers(level).length;
    return second ? (passive.formula2 ? evalFormula(passive.formula2, level) : 0) : evalFormula(passive.formula, level);
  }

  // Interpolate actual coins, not reference minutes: skipCoins is a staircase of purchase prices.
  function passiveStartCoins(state, id, level, extraMinutes) {
    if (level <= 0) return 0;
    const range = CARDS[id].passive.startCoinMinutes;
    const base = OFFICE.startCoins.skipStep * state.office.startCoins + (extraMinutes || 0);
    const first = skipCoins(base + range[0]) - skipCoins(base);
    const last = skipCoins(base + range[1]) - skipCoins(base);
    return Math.round(first + (last - first) * (level - 1) / (FOREMEN.expertise.maxLevel - 1));
  }

  function gainForemanExperience(state, campaign, world, blocks, offline) {
    const tuning = FOREMEN.expertise;
    if (!schoolHasUpgrade(state, 'expertise') || !tuning.levels.length || !modeHasCrew(campaign.runMode) || (offline && !tuning.offline)) return [];
    let base = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block.built || block.experiencePaid) continue;
      block.experiencePaid = true;
      base += Math.cbrt(root.MicroBuilders.MATERIAL[block.materialId].weight);
    }
    if (!base) return [];
    const changed = [];
    const maximum = tuning.levels[tuning.levels.length - 1].experience;
    const crew = campaign.crew || [];
    // Read levels before this batch, so a mentor's own level-up cannot reorder XP within the batch.
    const mentorLevels = crew.map(function (id) { return state.cards[id] ? expertiseLevel(state.cards[id]) : 0; });
    crew.forEach(function (id, index) {
      if (crew.indexOf(id) !== index || !CARDS[id]) return;
      const card = state.cards[id];
      if (!card || card.level <= 0) return;
      const before = expertiseLevel(card);
      const mentorship = mentoringMultiplier(state, mentorLevels[0] || 0, mentorLevels[index] || 0, index);
      const practice = campaign.runMode === 'school' ? 1 + schoolUpgradeLevel(state, 'practice') * SCHOOL.practiceXPPerLevel : 1;
      card.experience = Math.min(maximum, (card.experience || 0) + base * cardExperienceMultiplier(card.level) * mentorship * practice);
      const after = expertiseLevel(card);
      if (after > before) changed.push({ id: id, before: before, level: after });
    });
    if (changed.length) applyCardStats(state, campaign);
    return changed;
  }

  function cardMaxLevel(id) {
    return FOREMEN.maxLevel[CARDS[id].rarity];
  }

  function cardUpgradeCost(card, id) {
    return FOREMEN.upgradeCapital[CARDS[id].rarity] * card.level * card.level;
  }

  function cardCopiesRequired(card) {
    return card.level + 1;
  }

  // Card availability follows unique school victories, never campaign progress.
  function cardInPool(state, id) {
    return schoolTotalWins(state) >= CARDS[id].unlockWins;
  }

  function foremanSlots(state) {
    return officeValue('foremanSlots', state.office.foremanSlots);
  }

  function foremanSlotsMax() {
    return officeValue('foremanSlots', OFFICE.foremanSlots.max);
  }

  // The crew preset of a run mode: what the last run of that mode started with (the briefing
  // prefills it). Story orders use `equipped`, contracts `contractEquipped` (older saves and the
  // balance tools set these two directly), exchange orders `crewPresets.exchange`. HQ buildings are
  // built without foremen: always an empty crew.
  function crewOf(state, mode) {
    if (mode === 'contract') return state.contractEquipped;
    if (mode === 'hq') return [];
    if (mode === 'exchange' || mode === 'school') {
      if (!state.crewPresets) state.crewPresets = {};
      if (!state.crewPresets[mode]) state.crewPresets[mode] = [];
      return state.crewPresets[mode];
    }
    return state.equipped;
  }

  // Whether a run of this mode takes foremen at all.
  function modeHasCrew(mode) {
    return mode !== 'hq';
  }

  // The crew a run of `mode` really gets.
  function siteCrew(state, mode, crew) {
    return modeHasCrew(mode) ? cleanCrew(state, crew) : [];
  }

  // Owned cards only, each once, no more than the slots.
  function cleanCrew(state, crew) {
    const out = [];
    const slots = foremanSlots(state);
    (crew || []).forEach(function (id) {
      if (out.length >= slots || out.indexOf(id) >= 0) return;
      if (!CARDS[id] || !state.cards[id] || state.cards[id].level <= 0) return;
      out.push(id);
    });
    return out;
  }

  // The briefing confirmed: this crew is the mode's preset from now on.
  function saveCrewPreset(state, mode, crew) {
    if (!modeHasCrew(mode)) return;
    const preset = crewOf(state, mode);
    preset.length = 0;
    cleanCrew(state, crew).forEach(function (id) { preset.push(id); });
    save(state);
  }

  // Where cards work now: { cardId: [siteKey…] } over running sites. A card may work on several
  // sites at once; the briefing only hints at it («Ещё на основной стройке»). `exceptKey` — the slot
  // a new run is about to take over.
  function cardSites(state, exceptKey) {
    const where = {};
    SITE_KEYS.forEach(function (key) {
      const snap = site(state, key);
      if (key === exceptKey || !snap || snap.status !== 'play') return;
      (snap.crew || []).forEach(function (id) { (where[id] = where[id] || []).push(key); });
    });
    return where;
  }

  // Running sites that take foremen, with their crews (the «Сейчас на объектах» block).
  function activeRuns(state) {
    return SITE_KEYS.map(function (key) { return site(state, key); }).filter(function (snap) {
      return !!snap && snap.status === 'play' && modeHasCrew(snap.runMode);
    }).map(function (snap) {
      return { key: snap.key, runMode: snap.runMode, levelIndex: snap.levelIndex, runPayload: snap.runPayload, name: snap.name, crew: (snap.crew || []).slice() };
    });
  }

  // Main abilities come from the locked crew; expertise passives come from the hired collection.
  // Plain effects become session multipliers or additions; the rest are `triggers` — counters and
  // conditions the construction logic runs (logic.js → foremen).
  const MULTIPLIERS = { place: 'placeSpeed', carry: 'carryScale', move: 'movement', climb: 'climb', scaffold: 'scaffold',
    income: 'coinMultiplier', pickup: 'pickupSpeed', height: 'heightPenalty', hunger: 'hunger', smoke: 'smoke', smokeShort: 'smokeShort' };
  const SUMS = { skip: 'skipMinutes', startBuilders: 'startBuilders', plan: 'plan', capChance: 'capitalChance' };

  function applyForemanEffect(result, effect, value, second, spec, id) {
    if (MULTIPLIERS[effect]) result[MULTIPLIERS[effect]] *= value;
    else if (SUMS[effect]) result[SUMS[effect]] += value;
    else if (effect === 'nightRelief') result.nightRelief = Math.max(result.nightRelief, value);
    else if (result.triggers[effect] && (effect === 'lucky' || effect === 'overload')) {
      // Two cards with the same chance or penalty stack: chances add up, penalties multiply.
      if (effect === 'lucky') result.triggers.lucky.value += value;
      else result.triggers.overload.value *= value;
    } else {
      result.triggers[effect] = { value: value, second: second || 0, factor: spec.factor || 1, card: id };
    }
  }

  // `crew` (card ids) — the crew of one run; without it, the preset of `mode` (balance tools).
  function equippedBonuses(state, mode, crew) {
    const result = {
      placeSpeed: 1,
      carryScale: 1,
      movement: 1,
      climb: 1,
      skipMinutes: 0,
      scaffold: 1,
      coinMultiplier: 1,
      pickupSpeed: 1,
      heightPenalty: 1,
      hunger: 1,
      smoke: 1,
      smokeShort: 1,
      nightRelief: 0,
      startBuilders: 0,
      workerRanks: [],
      startCoinGrant: 0,
      plan: 0,
      capitalChance: 0,
      triggers: {},
    };
    const list = Array.isArray(crew) ? crew : crewOf(state, mode);
    for (let i = 0; i < list.length; i++) {
      const id = list[i];
      if (!CARDS[id] || !state.cards[id]) continue;
      const level = state.cards[id].level;
      if (level <= 0) continue;
      const spec = CARDS[id];
      const second = spec.formula2 ? cardValue(id, level, true) : 0;
      applyForemanEffect(result, spec.effect, cardValue(id, level), second, spec, id);
      if (spec.effect === 'height') result.climb *= second;
      if (spec.effect === 'carry' && second) result.plan += second;
    }
    // Expertise passives belong to the whole hired collection, including HQ construction.
    Object.keys(CARDS).forEach(function (id) {
      if (!state.cards[id] || state.cards[id].level <= 0) return;
      const spec = CARDS[id];
      const expertise = expertiseLevel(state.cards[id]);
      if (!spec.passive || expertise <= 0) return;
      if (spec.passive.startCoinMinutes) result.startCoinGrant += passiveStartCoins(state, id, expertise, result.skipMinutes);
      else applyForemanEffect(result, spec.passive.effect, cardPassive(id, expertise), cardPassive(id, expertise, true), spec, id);
      if (spec.passive.effect === 'startBuilders') result.workerRanks = result.workerRanks.concat(expertiseWorkers(expertise));
    });
    return result;
  }

  // Everything the meta adds to a session: office lines, HQ buildings and equipped foremen.
  // The campaign simulator (metasim.js) reads the same numbers. `crew` — the run's own crew
  // (campaign.crew); without it the preset of `mode`.
  function metaStats(state, mode, crew) {
    const card = equippedBonuses(state, mode, crew);
    const office = state.office;
    return {
      builders: 1 + officeValue('crew', office.crew) + card.startBuilders,
      workerRanks: card.workerRanks,
      vehicles: state.hq.garage > 0 && state.tech.loaders > 0 ? 1 : 0,
      // «Аванс заказчика» and «Снабженец» both skip the first minutes of the reference session.
      startCoins: Math.round(skipCoins(OFFICE.startCoins.skipStep * office.startCoins + card.skipMinutes)) + card.startCoinGrant,
      placeSpeed: officeValue('speed', office.speed) * card.placeSpeed,
      pickupSpeed: officeValue('pickSkill', office.pickSkill) * card.pickupSpeed,
      carryScale: officeValue('carry', office.carry) * card.carryScale,
      carry: 0,
      movement: card.movement,
      climb: card.climb,
      scaffold: card.scaffold,
      plan: card.plan + officeValue('plan', office.plan),
      nightRelief: card.nightRelief,
      heightPenalty: card.heightPenalty,
      hunger: card.hunger,
      smoke: card.smoke,
      smokeShort: card.smokeShort,
      coinMultiplier: officeValue('income', office.income) * card.coinMultiplier,
      offline: officeValue('offline', office.offline),
      capitalChance: officeValue('capitalChance', office.capitalChance) + card.capitalChance,
      capitalValue: officeValue('capitalValue', office.capitalValue),
      triggers: card.triggers,
    };
  }

  // `crew` — the crew picked in the briefing (locked until the run ends); without it the mode's
  // preset (balance tools, dev jumps). HQ buildings get no crew.
  function configureNewCampaign(state, campaign, runMode, levelIndex, payload, crew) {
    campaign.crew = siteCrew(state, runMode, Array.isArray(crew) ? crew : crewOf(state, runMode));
    const stats = metaStats(state, runMode, campaign.crew);
    campaign.levelIndex = levelIndex;
    campaign.runMode = runMode;
    campaign.runPayload = payload;
    campaign.metaBuilders = stats.builders;
    // Builders the meta gives at the start; anything above it was recruited during the run.
    campaign.baseMetaBuilders = stats.builders;
    campaign.metaWorkerRanks = stats.workerRanks.slice();
    campaign.builderCount = campaign.metaBuilders;
    campaign.metaVehicles = stats.vehicles;
    campaign.vehicleCount = campaign.metaVehicles;
    // «Казначей» carries part of the last order's coins into this one.
    campaign.coins = stats.startCoins + (state.carryCoins || 0);
    state.carryCoins = 0;
    campaign.coinsEarned = 0;
    applyCardStats(state, campaign);
    campaign.bonusDrones = campaign.foremen.startDrones ? Math.round(campaign.foremen.startDrones.value) : 0;
    campaign.kitchenUnlocked = state.hq.personnel > 0;
    campaign.resumeBuiltIds = [];
  }

  // Live meta numbers: applied at the start of a run, on restore and after an office purchase or a
  // card upgrade. The run's own crew (campaign.crew) counts, never the preset, so a purchase in the
  // middle of a run re-applies the same crew with the new numbers.
  function applyCardStats(state, campaign) {
    const stats = metaStats(state, campaign.runMode, campaign.crew);
    campaign.metaPlaceSpeed = stats.placeSpeed;
    campaign.metaPickupSpeed = stats.pickupSpeed;
    campaign.metaHeightPenalty = stats.heightPenalty;
    campaign.metaClimb = stats.climb;
    campaign.metaHunger = stats.hunger;
    campaign.metaCarryScale = stats.carryScale;
    campaign.metaCarry = stats.carry;
    campaign.metaMovement = stats.movement;
    campaign.metaScaffold = stats.scaffold;
    campaign.metaPlan = stats.plan;
    campaign.metaNightRelief = stats.nightRelief;
    campaign.metaCoinMultiplier = stats.coinMultiplier;
    campaign.metaSmoke = stats.smoke;
    campaign.metaSmokeShort = stats.smokeShort;
    campaign.foremen = stats.triggers;
    // «Механик» needs drones; «Подрядчик» gifts levels of upgrades that are already open.
    if (!sessionLineOpen(state, 'engineers')) {
      delete campaign.foremen.machines;
      delete campaign.foremen.startDrones;
    }
    campaign.foremanKinds = Object.keys(root.MicroBuildersBalance.session).filter(function (kind) {
      return sessionLineOpen(state, kind) && kind !== 'budgetCapital';
    });
    campaign.environmentWorkMultiplier = 1;
    campaign.environmentMoveMultiplier = 1;
    const builders = window.MicroBuildersBalance.tuning.builders;
    campaign.mealInterval = 240;
    campaign.mealAwaySeconds = 60;
    campaign.mealKitchenSeconds = builders.mealKitchenSeconds;
    campaign.restInterval = builders.restInterval;
    campaign.restSeconds = builders.restSeconds;
    campaign.smokeInterval = 120;
    campaign.smokeSeconds = builders.smokeSeconds;
  }

  // ---------- construction sites ----------
  // A site snapshot: what restoreCampaign + MB.startLevel + applySiteRuntime need to rebuild the run,
  // plus what the HQ shows without loading it (name, built / total). `status` is 'play' or
  // 'complete' (rewards already paid, `reward` keeps the summary for the completion window).
  // `awaySince` — when the player stopped looking at this site (null while it is live on screen);
  // `awayBank` — seconds of earlier absences too short to catch up yet (they add to the next one);
  // `awayElapsed` — seconds this run was built without the player (part of its completion time);
  // `stats` — the run's construction counters (the «Подробнее» list of the completion window).
  function site(state, key) {
    return state.sites && state.sites[key] || null;
  }

  // The site the game shows: the saved active slot, else the first one that exists.
  function activeSite(state) {
    if (site(state, state.activeSite)) return state.activeSite;
    for (let i = 0; i < SITE_KEYS.length; i++) {
      if (site(state, SITE_KEYS[i])) return SITE_KEYS[i];
    }
    return 'campaign';
  }

  function setActiveSite(state, key) {
    state.activeSite = key;
    save(state);
  }

  function clearSite(state, key) {
    state.sites[key] = null;
    // The main run takes over when there is one (activeSite() looks up the slots in that order).
    if (state.activeSite === key) state.activeSite = activeSite(state);
    save(state);
  }

  function saveSite(state, key, campaign, world, extra) {
    const prev = site(state, key);
    const options = extra || {};
    const builtIds = [];
    for (let i = 0; i < world.blocks.length; i++) {
      if (world.blocks[i].built) builtIds.push(world.blocks[i].id);
    }
    const base = campaign.baseMetaBuilders !== undefined ? campaign.baseMetaBuilders : campaign.metaBuilders;
    const status = options.status || (campaign.status === 'complete' || world.completed ? 'complete' : 'play');
    const snap = {
      key: key,
      runMode: campaign.runMode,
      runPayload: campaign.runPayload,
      levelIndex: campaign.levelIndex,
      status: status,
      name: siteName(campaign.runMode, campaign.levelIndex, campaign.runPayload),
      total: world.blocks.length,
      built: builtIds.length,
      coins: campaign.coins,
      coinsEarned: campaign.coinsEarned || 0,
      builderCount: campaign.builderCount,
      startMetaBuilders: base,
      workerRanks: (campaign.metaWorkerRanks || []).slice(),
      vehicleCount: campaign.vehicleCount,
      purchases: Object.assign({}, campaign.purchases),
      totalElapsed: campaign.totalElapsed,
      levelElapsed: campaign.levelElapsed,
      builtIds: builtIds,
      crew: (campaign.crew || crewOf(state, campaign.runMode)).slice(),
      foreman: {
        cubes: world.foremanCubes || 0,
        floorStack: world.floorStack || 0,
        bonusBuilders: Math.max(0, campaign.metaBuilders - base),
      },
      stats: Object.assign({}, world.stats),
      awayElapsed: campaign.awayElapsed || 0,
      savedAt: Date.now(),
      awaySince: options.awaySince !== undefined ? options.awaySince : (prev ? prev.awaySince : null),
      awayBank: options.awayBank !== undefined ? options.awayBank : (prev ? prev.awayBank || 0 : 0),
      reward: options.reward !== undefined ? options.reward : (prev && status === 'complete' ? prev.reward : null),
    };
    state.sites[key] = snap;
    save(state);
    return snap;
  }

  // Old name: snapshot the run into its own slot.
  function snapshotSession(state, campaign, world) {
    return saveSite(state, siteKey(campaign.runMode), campaign, world);
  }

  // Meta side of a restore (before MB.startLevel). Returns seconds since the snapshot was written.
  function restoreCampaign(state, campaign, snap) {
    const session = snap || site(state, activeSite(state));
    // The crew is the site's own, locked at its start (older snapshots: the preset of the mode).
    campaign.crew = siteCrew(state, session.runMode, session.crew || crewOf(state, session.runMode));
    const stats = metaStats(state, session.runMode, campaign.crew);
    campaign.levelIndex = session.levelIndex;
    campaign.runMode = session.runMode;
    campaign.runPayload = session.runPayload;
    campaign.coins = session.coins;
    campaign.coinsEarned = session.coinsEarned || 0;
    campaign.builderCount = session.builderCount;
    campaign.vehicleCount = session.vehicleCount;
    campaign.purchases = Object.assign(campaign.purchases, session.purchases);
    campaign.baseMetaBuilders = session.startMetaBuilders === undefined ? stats.builders : session.startMetaBuilders;
    campaign.metaWorkerRanks = (session.workerRanks || []).slice();
    // «Вербовщик» recruits stay until the order is done.
    campaign.metaBuilders = campaign.baseMetaBuilders + (session.foreman ? session.foreman.bonusBuilders || 0 : 0);
    campaign.metaVehicles = stats.vehicles;
    campaign.totalElapsed = session.totalElapsed;
    campaign.levelElapsed = session.levelElapsed;
    campaign.awayElapsed = session.awayElapsed || 0;
    applyCardStats(state, campaign);
    campaign.bonusDrones = campaign.foremen.startDrones ? Math.round(campaign.foremen.startDrones.value) : 0;
    campaign.kitchenUnlocked = state.hq.personnel > 0;
    campaign.resumeBuiltIds = session.builtIds.slice();
    return (Date.now() - session.savedAt) / 1000;
  }

  // Run state that MB.startLevel resets (call right after it): clocks, foreman counters and construction stats.
  function applySiteRuntime(campaign, world, snap) {
    campaign.levelElapsed = snap.levelElapsed;
    campaign.totalElapsed = snap.totalElapsed;
    if (snap.foreman) {
      world.foremanCubes = snap.foreman.cubes || 0;
      world.floorStack = snap.foreman.floorStack || 0;
    }
    if (snap.stats) Object.assign(world.stats, snap.stats);
  }

  function offlineEfficiency(state) {
    return officeValue('offline', state.office.offline);
  }

  function offlineCapSeconds() {
    return META_BALANCE.profile.offlineCapHours * 3600;
  }

  function categoryForLevel(levelIndex) {
    return RARE_KEYS[levelIndex % RARE_KEYS.length];
  }

  // Guaranteed capital for handing over a story level: grows with the square root of its mass, so
  // heavier buildings pay more without the economy exploding with the material ladder.
  function levelMass(level) {
    if (level.totalMass === undefined) {
      let mass = 0;
      for (let i = 0; i < level.blocks.length; i++) mass += root.MicroBuilders.MATERIAL[level.blocks[i].materialId].weight;
      level.totalMass = mass;
    }
    return level.totalMass;
  }

  function levelCapital(level) {
    return Math.max(10, Math.round(META_BALANCE.capital.levelBonus * Math.sqrt(levelMass(level))));
  }

  // Capital found in one cube (office «Поиск ценностей» rolls the chance, «Оценка находок» scales it).
  function findValue(state, block) {
    const weight = root.MicroBuilders.MATERIAL[block.materialId].weight;
    const height = 1 + block.y * META_BALANCE.capital.findHeightStep;
    return Math.max(1, Math.round(Math.sqrt(weight) * height * officeValue('capitalValue', state.office.capitalValue)));
  }

  function capitalRoll(state, block, mode, crew) {
    const stats = metaStats(state, mode, crew);
    if (stats.capitalChance <= 0 || Math.random() >= stats.capitalChance) return 0;
    const value = findValue(state, block);
    const prospector = stats.triggers.prospector;
    return prospector && Math.random() < prospector.value ? value * 2 : value;
  }

  // ---------- foreman drops ----------
  // A drop rolls the rarity by the source's weights (balance → foremen → drops) among rarities that
  // already have cards in the pool, with pity: an epic at least every `pity.epic` drops and a
  // legendary every `pity.legendary`. The card is then picked evenly within the rarity.
  function rarityPool(state, rarity) {
    return Object.keys(CARDS).filter(function (id) {
      return CARDS[id].rarity === rarity && cardInPool(state, id);
    });
  }

  function rollCard(state, source, preferredId) {
    const pity = state.cardPity || (state.cardPity = { epic: 0, legendary: 0 });
    const open = {};
    RARITIES.forEach(function (rarity) { open[rarity] = rarityPool(state, rarity); });
    // Pity counts only while cards of that rarity can actually drop.
    if (open.epic.length > 0) pity.epic += 1;
    if (open.legendary.length > 0) pity.legendary += 1;
    let rarity = null;
    if (open.legendary.length > 0 && pity.legendary >= FOREMEN.pity.legendary) rarity = 'legendary';
    else if (open.epic.length > 0 && pity.epic >= FOREMEN.pity.epic) rarity = 'epic';
    else {
      const weights = FOREMEN.drops[source];
      let total = 0;
      RARITIES.forEach(function (r) { if (open[r].length > 0) total += weights[r]; });
      let roll = Math.random() * total;
      for (let i = RARITIES.length - 1; i >= 0 && !rarity; i--) {
        if (open[RARITIES[i]].length === 0) continue;
        roll -= weights[RARITIES[i]];
        if (roll < 0) rarity = RARITIES[i];
      }
      if (!rarity) rarity = 'common';
    }
    if (rarity === 'legendary') pity.legendary = 0;
    if (rarity === 'legendary' || rarity === 'epic') pity.epic = 0;
    const pool = open[rarity];
    const focus = preferredId && pool.indexOf(preferredId) >= 0 ? schoolUpgradeLevel(state, 'profile') : 0;
    const pick = Math.floor(Math.random() * (pool.length + focus));
    return grantCard(state, pick < pool.length ? pool[pick] : preferredId);
  }

  function grantCard(state, id) {
    const card = state.cards[id];
    const isNew = card.level === 0;
    if (isNew) card.level = 1;
    else card.copies += 1;
    return {
      cardId: id,
      cardName: CARDS[id].name,
      rarity: CARDS[id].rarity,
      rarityName: RARITY_NAMES[CARDS[id].rarity],
      isNew: isNew,
    };
  }

  // School: recruiting is one of the school's departments.
  function recruitPeriod(state) {
    return FOREMEN.recruiting.hours * 3600 * 1000 / (1 + schoolUpgradeLevel(state, 'recruitSpeed') * 0.15);
  }

  function recruitCapacity(state) {
    return FOREMEN.recruiting.stock + schoolUpgradeLevel(state, 'recruitStock');
  }

  function refreshRecruiting(state) {
    const recruit = state.recruit || (state.recruit = { stock: 0, nextAt: 0 });
    if (!schoolHasUpgrade(state, 'recruiting')) return recruit;
    const period = recruitPeriod(state), capacity = recruitCapacity(state);
    const now = Date.now();
    if (!recruit.nextAt) recruit.nextAt = now + period;
    while (recruit.stock < capacity && now >= recruit.nextAt) {
      recruit.stock += 1;
      recruit.nextAt += period;
    }
    if (recruit.stock >= capacity) recruit.nextAt = Math.max(recruit.nextAt, now);
    return recruit;
  }

  function claimRecruit(state, targeted) {
    if (!schoolHasUpgrade(state, 'recruiting')) return null;
    const recruit = refreshRecruiting(state);
    if (recruit.stock <= 0) return null;
    const preferred = state.school.preferredCard;
    if (targeted) {
      const price = targetRecruitCost(state);
      if (!price || state.capital < price.capital || state.diplomas < price.diplomas) return null;
      state.capital -= price.capital;
      state.diplomas -= price.diplomas;
    }
    if (recruit.stock >= recruitCapacity(state)) recruit.nextAt = Date.now() + recruitPeriod(state);
    recruit.stock -= 1;
    const card = targeted ? grantCard(state, preferred) : rollCard(state, 'recruiting', preferred);
    save(state);
    return card;
  }

  // ---------- school ----------
  function createSchoolState() {
    return { upgrades: Object.keys(SCHOOL.upgrades).reduce(function (out, id) { out[id] = 0; return out; }, {}),
      wins: { tower: 0, foundation: 0, monument: 0 }, bestSeconds: {},
      attempts: { day: '', used: 0 }, nextRunId: 1, activeAttempt: null, preferredCard: '' };
  }

  function schoolUpgradeLevel(state, id) {
    return state.school && state.school.upgrades[id] || 0;
  }

  function schoolHasUpgrade(state, id) {
    return state.hq.recruiting > 0 && schoolUpgradeLevel(state, id) > 0;
  }

  function schoolTotalWins(state) {
    return Object.keys(SCHOOL.bosses).reduce(function (sum, id) { return sum + (state.school && state.school.wins[id] || 0); }, 0);
  }

  function schoolUpgradeCost(state, id) {
    const spec = SCHOOL.upgrades[id], level = schoolUpgradeLevel(state, id);
    return spec && level < spec.max ? { capital: spec.capital[level], diplomas: spec.diplomas[level] } : null;
  }

  function schoolUpgradeReason(state, id) {
    const spec = SCHOOL.upgrades[id];
    if (!spec) return 'Нет такой программы';
    if (!state.hq.recruiting) return 'Сначала постройте школу бригадиров';
    if (state.campaignLevel + 1 < spec.level) return 'Откроется с уровня ' + spec.level;
    if (spec.after && !schoolHasUpgrade(state, spec.after)) return 'Сначала изучите «' + SCHOOL.upgrades[spec.after].name + '»';
    return '';
  }

  function buySchoolUpgrade(state, id) {
    const price = schoolUpgradeCost(state, id);
    if (!price || schoolUpgradeReason(state, id) || state.capital < price.capital || state.diplomas < price.diplomas) return false;
    const recruit = refreshRecruiting(state), now = Date.now(), oldPeriod = recruitPeriod(state);
    state.capital -= price.capital;
    state.diplomas -= price.diplomas;
    state.school.upgrades[id] += 1;
    if (id === 'recruiting') recruit.nextAt = now + recruitPeriod(state);
    // Preserve the fraction already earned, so buying speed never erases the wait.
    if (id === 'recruitSpeed' && recruit.nextAt > now) recruit.nextAt = now + (recruit.nextAt - now) * recruitPeriod(state) / oldPeriod;
    save(state);
    return true;
  }

  function mentoringMultiplier(state, mentorLevel, pupilLevel, slotIndex) {
    if (slotIndex === 0 || !schoolHasUpgrade(state, 'expertise')) return 1;
    const gap = Math.max(0, Math.min(SCHOOL.mentoringGapCap, mentorLevel - pupilLevel));
    return 1 + gap * schoolUpgradeLevel(state, 'mentoring') * SCHOOL.mentoringPerGapPerLevel;
  }

  function setRecruitFocus(state, id) {
    if (!schoolHasUpgrade(state, 'profile') || (id && (!CARDS[id] || !cardInPool(state, id)))) return false;
    state.school.preferredCard = id;
    save(state);
    return true;
  }

  function targetRecruitCost(state) {
    const id = state.school.preferredCard;
    if (!schoolHasUpgrade(state, 'targeted') || !id || !CARDS[id] || !cardInPool(state, id)) return null;
    return { capital: SCHOOL.targetHireCapital[CARDS[id].rarity], diplomas: SCHOOL.targetHireDiplomas[CARDS[id].rarity] };
  }

  function schoolAttempts(state, now) {
    now = now === undefined ? Date.now() : now;
    const date = new Date(now);
    const stamp = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    const attempts = state.school.attempts;
    // Local midnight; moving the clock backwards cannot refill today's attempts.
    if (stamp > attempts.day) { attempts.day = stamp; attempts.used = 0; }
    const reset = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    return { used: attempts.used, left: Math.max(0, SCHOOL.dailyAttempts - attempts.used), limit: SCHOOL.dailyAttempts, resetAt: reset };
  }

  function schoolBoss(state, id) {
    const spec = SCHOOL.bosses[id];
    if (!spec) return null;
    const won = state.school.wins[id] || 0, tier = won + 1;
    const row = SCHOOL.tables && SCHOOL.tables[id] && SCHOOL.tables[id][Math.min(tier, SCHOOL.maxTier) - 1];
    if (!row) throw new Error('Missing calibrated school tier: ' + id + ':' + tier);
    return Object.assign({}, row, { id: id, name: spec.name, tier: tier, won: won, complete: won >= SCHOOL.maxTier });
  }

  // Why a trial is still closed ('' — open): balance → school → bosses → requires {boss, tier}.
  function schoolBossLock(state, id) {
    const need = SCHOOL.bosses[id] && SCHOOL.bosses[id].requires;
    if (!need || (state.school.wins[need.boss] || 0) >= need.tier) return '';
    return 'Откроется после ' + need.tier + '-й ступени «' + SCHOOL.bosses[need.boss].name + '»';
  }

  function schoolMilestoneCards(state) {
    const wins = schoolTotalWins(state);
    return Object.keys(CARDS).filter(function (id) { return CARDS[id].unlockWins === wins + 1; });
  }

  function startSchoolTrial(state, id) {
    const boss = schoolBoss(state, id), side = site(state, 'side');
    if (!state.hq.recruiting || !boss || boss.complete || schoolBossLock(state, id) || (side && side.status === 'play') || state.school.activeAttempt || schoolAttempts(state).left <= 0) return null;
    const payload = { bossId: id, tier: boss.tier, limit: boss.limit, diplomas: boss.diplomas, runId: state.school.nextRunId++ };
    state.school.attempts.used += 1;
    state.school.activeAttempt = Object.assign({}, payload);
    save(state);
    return payload;
  }

  function schoolLimitSeconds(campaign) {
    return campaign && campaign.runMode === 'school' && campaign.runPayload ? campaign.runPayload.limit : 0;
  }

  function failSchoolTrial(state) {
    state.school.activeAttempt = null;
    const side = site(state, 'side');
    if (side && side.runMode === 'school') clearSite(state, 'side');
    else save(state);
  }

  function completeSchoolTrial(state, campaign) {
    const p = campaign.runPayload, active = state.school.activeAttempt;
    if (!p || !active || p.runId !== active.runId || p.bossId !== active.bossId || p.tier !== active.tier || campaign.levelElapsed > active.limit + 1e-6) return null;
    const boss = schoolBoss(state, p.bossId);
    if (!boss || p.tier !== boss.tier) return null;
    const milestoneIds = schoolMilestoneCards(state);
    state.school.activeAttempt = null;
    state.school.wins[p.bossId] = p.tier;
    state.school.bestSeconds[p.bossId] = Math.min(state.school.bestSeconds[p.bossId] || Infinity, campaign.levelElapsed);
    state.diplomas += active.diplomas;
    // Guaranteed milestone copies are separate from the small chest's random card.
    const milestoneCards = milestoneIds.map(function (id) {
      return Object.assign(grantCard(state, id), { milestone: schoolTotalWins(state) });
    });
    return { diplomas: active.diplomas, milestoneCards: milestoneCards, card: rollCard(state, 'school'), tier: p.tier, bossId: p.bossId, smallChest: true };
  }

  // `finds` lists every capital find by block ({block, value}) so the view can float it there.
  function onBlocksPlaced(state, campaign, world, blocks, options) {
    const expertise = gainForemanExperience(state, campaign, world, blocks, !!(options && options.offline));
    let capital = 0;
    const finds = [];
    for (let i = 0; i < blocks.length; i++) {
      const value = capitalRoll(state, blocks[i], campaign.runMode, campaign.crew);
      if (value <= 0) continue;
      capital += value;
      finds.push({ block: blocks[i], value: value });
    }
    state.capital += capital;

    const rewards = [];
    if (campaign.runMode === 'campaign' && state.completed.indexOf(world.level.index) === -1 && chestsOpen(world.level.index)) {
      const done = world.level.blocks.length - world.remaining;
      const thresholds = [25, 50];
      for (let i = 0; i < thresholds.length; i++) {
        const threshold = thresholds[i];
        const key = world.level.index + ':' + threshold;
        if (done * 100 >= world.level.blocks.length * threshold && state.claimedChests[key] !== 1) {
          rewards.push(threshold);
        }
      }
    }
    return { capital: capital, rewards: rewards, finds: finds, expertise: expertise };
  }

  // What handing over a story level pays the first time (the briefing shows it before the start).
  function storyReward(state, levelIndex) {
    const level = root.MicroBuilders.LEVELS[levelIndex];
    if (!level || state.completed.indexOf(levelIndex) >= 0) return { capital: 0, done: true };
    // The first level pays exactly for the office plot and its first upgrade.
    return { capital: levelIndex === 0 ? PROJECTS.office.capital + firstOfficePrice() : levelCapital(level), done: false };
  }

  function onLevelComplete(state, campaign, world) {
    const result = { capital: 0, seals: 0, rare: null, text: '', card: null };
    const treasurer = campaign.foremen && campaign.foremen.treasurer;
    if (treasurer) {
      state.carryCoins = Math.round((campaign.coinsEarned || 0) * treasurer.value);
      result.carryCoins = state.carryCoins;
    }
    if (campaign.runMode === 'campaign') {
      if (state.completed.indexOf(world.level.index) === -1) {
        const reward = storyReward(state, world.level.index);
        state.completed.push(world.level.index);
        result.capital = reward.capital;
        state.capital += result.capital;
      }
      const nextLevel = world.level.index + 1;
      if (nextLevel < root.MicroBuilders.LEVELS.length && nextLevel > state.campaignLevel) {
        state.campaignLevel = nextLevel;
      }
      result.text = 'Сюжетный заказ завершён';
    }
    if (campaign.runMode === 'exchange') {
      const reward = exchangeReward(state, world.level.index);
      result.rare = { key: reward.rare, amount: reward.rareAmount };
      result.capital = reward.capital;
      state.rare[reward.rare] += reward.rareAmount;
      state.capital += result.capital;
      const orderId = campaign.runPayload.orderId;
      state.exchange.orders = state.exchange.orders.filter(function (order) { return order.id !== orderId; });
      state.exchange.nextOrderAt = Date.now() + exchangeInterval(state);
      result.text = 'Старый заказ выполнен';
    }
    if (campaign.runMode === 'contract') {
      const contract = currentContract(state);
      result.seals = contract ? contract.seals : 1;
      result.capital = contract ? contract.capital : 0;
      state.seals += result.seals;
      state.capital += result.capital;
      state.contract.index += 1;
      if (state.contract.index % FOREMEN.contractEvery === 0) result.card = rollCard(state, 'contract');
      result.text = 'Контракт пройден';
    }
    if (campaign.runMode === 'school') {
      const schoolReward = completeSchoolTrial(state, campaign);
      if (schoolReward) Object.assign(result, schoolReward, { text: 'Испытание пройдено' });
    }
    if (campaign.runMode === 'hq') {
      const projectId = campaign.runPayload.projectId;
      const done = completeHqBuilding(state, projectId);
      result.seals = done.seals;
      if (done.card) result.card = done.card;
      result.text = PROJECTS[projectId].name + ' построен';
    }
    // The site slot is the game's business (it keeps the finished site until the player moves on).
    save(state);
    return result;
  }

  // The first office purchase the scenario wants right after the first level (balance → meta).
  function firstOfficePrice() {
    return officeCost(META_BALANCE.firstPurchase, 0);
  }

  // ---------- exchange of old orders ----------
  // Board upgrades: balance.json → meta → exchange (values, opening times, calibrated prices).
  const EXCHANGE_UPGRADES = META_BALANCE.exchange;

  function exchangeValue(state, kind, level) {
    return evalFormula(EXCHANGE_UPGRADES[kind].formula, level === undefined ? state.exchange[kind] : level);
  }

  function exchangeUnlocked(state, kind) {
    return lineUnlocked(state.exchange, EXCHANGE_UPGRADES[kind]);
  }

  function exchangeCapacity(state) {
    return exchangeValue(state, 'capacityLevel');
  }

  function exchangeInterval(state) {
    return exchangeValue(state, 'intervalLevel') * 60000;
  }

  // What an order pays: the story bonus of that level × «Капитал за заказ», and a rare resource of
  // its building type.
  function exchangeReward(state, levelIndex) {
    return {
      capital: Math.round(levelCapital(root.MicroBuilders.LEVELS[levelIndex]) * exchangeValue(state, 'capitalLevel')),
      rare: categoryForLevel(levelIndex),
      rareAmount: exchangeValue(state, 'rewardLevel'),
    };
  }

  function addExchangeOrder(state) {
    const candidates = state.completed.filter(function (levelIndex) {
      return !state.exchange.orders.some(function (order) { return order.levelIndex === levelIndex; });
    });
    if (candidates.length === 0) return false;
    const levelIndex = candidates[Math.floor(Math.random() * candidates.length)];
    state.exchange.orders.push({ id: Date.now() + ':' + levelIndex + ':' + state.exchange.orders.length, levelIndex: levelIndex });
    return true;
  }

  // A new exchange opens with a full board; after that an empty slot refills once per interval.
  function fillExchange(state) {
    if (state.hq.exchange === 0) return;
    const exchange = state.exchange;
    const capacity = exchangeCapacity(state);
    const now = Date.now();
    if (!exchange.stocked) {
      while (exchange.orders.length < capacity && addExchangeOrder(state)) { /* fill the board */ }
      exchange.stocked = true;
      exchange.nextOrderAt = now + exchangeInterval(state);
    }
    while (exchange.orders.length < capacity && now >= exchange.nextOrderAt) {
      if (!addExchangeOrder(state)) break;
      exchange.nextOrderAt += exchangeInterval(state);
    }
    if (exchange.orders.length >= capacity) exchange.nextOrderAt = Math.max(exchange.nextOrderAt, now);
    save(state);
  }

  // «Золотой прораб»: a golden cube always brings a capital find.
  function goldenFind(state, block) {
    const value = findValue(state, block);
    state.capital += value;
    return value;
  }

  // The company side of an absence that started at `since` (ms). Recruiting, exchange orders and
  // contract cooldowns run on the wall clock; refresh them for the return report. Sites are caught
  // up by the game (it needs the session simulator).
  function claimAway(state, since, offline) {
    const now = Date.now();
    const from = since || now;
    const seconds = Math.max(0, (now - from) / 1000);
    const recruitBefore = state.recruit ? state.recruit.stock : 0;
    const recruit = refreshRecruiting(state);
    const ordersBefore = state.exchange.orders.length;
    if (state.hq.exchange > 0) fillExchange(state);
    const cooldown = state.contract.cooldownUntil || 0;
    state.hiddenAt = null;
    save(state);
    return {
      seconds: seconds,
      offline: !!offline,
      recruitsNew: Math.max(0, recruit.stock - recruitBefore),
      recruits: recruit.stock,
      ordersNew: Math.max(0, state.exchange.orders.length - ordersBefore),
      contractReady: contractReady(state) && cooldown > from && cooldown <= now,
    };
  }

  // Old name: the cold-boot claim (absence since the page was hidden or last saved).
  function claimOffline(state) {
    return claimAway(state, state.hiddenAt || state.lastSeenAt, true);
  }

  function buyOffice(state, kind) {
    const level = state.office[kind];
    const cost = officeCost(kind, level);
    const seals = officeSeals(kind, level);
    if (!officeUnlocked(state, kind)) return false;
    if (state.capital < cost || state.seals < seals) return false;
    if (level >= OFFICE[kind].max) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.office[kind] += 1;
    save(state);
    return true;
  }

  function sessionLineOpen(state, kind) {
    const source = SESSION_LINE[kind];
    if (source === '') return true;
    if (source === undefined) return false;
    if (source.indexOf('hq:') === 0) return state.hq[source.slice(3)] > 0;
    if (source.indexOf('tech:') === 0) return state.tech[source.slice(5)] > 0;
    return false;
  }

  // An office line opens with its story level (`level` — completed story levels, set by the
  // calibration from half the line's wanted purchase minute).
  function officeUnlocked(state, id) {
    return state.campaignLevel >= (OFFICE[id].level || 0);
  }

  // ---------- tech center ----------
  // Display order follows target purchase times; availability follows the shared session graph.
  const SESSION_PARENTS = {};
  root.MicroBuildersBalance.upgradeTree.forEach(function (pair) { SESSION_PARENTS[pair[0]] = pair[1]; });

  function techPrerequisites(id) {
    const required = new Set();
    (TECH[id].opens || []).forEach(function (kind) {
      let parent = SESSION_PARENTS[kind];
      const visited = new Set();
      while (parent && !visited.has(parent)) {
        visited.add(parent);
        const source = SESSION_LINE[parent];
        if (source && source !== 'tech:' + id) {
          if (source.indexOf('tech:') === 0) required.add(source.slice(5));
          break;
        }
        parent = SESSION_PARENTS[parent];
      }
    });
    return Array.from(required);
  }

  function missingTechPrerequisites(state, id) {
    return techPrerequisites(id).filter(function (before) { return !(state.tech[before] > 0); });
  }

  function techUnlocked(state, id) {
    return !!TECH[id] && state.hq.tech > 0 && !(state.tech[id] > 0) && missingTechPrerequisites(state, id).length === 0;
  }

  function techCost(id) {
    return TECH[id].prices && TECH[id].prices.length ? TECH[id].prices[0] : 0;
  }

  function techSeals(id) {
    return Math.max(1, sealCost(TECH[id], 0));
  }

  function buyTech(state, id) {
    if (!techUnlocked(state, id)) return false;
    const cost = techCost(id);
    const seals = techSeals(id);
    if (state.capital < cost || state.seals < seals) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.tech[id] = 1;
    save(state);
    return true;
  }

  function contractBoardOpen(state) {
    return state.campaignLevel >= 2 || state.hq.contracts > 0;
  }

  // HQ buildings still to build (live ones only) in unlock order, up to `count` (default 3).
  function upcomingProjects(state, count) {
    return Object.keys(PROJECTS)
      .filter(function (id) { return PROJECTS[id].live && !(state.hq[id] > 0); })
      .sort(function (x, y) { return PROJECTS[x].unlock - PROJECTS[y].unlock; })
      .slice(0, count || 3);
  }

  function officeChain(section) {
    const rows = OFFICE_ROWS[section];
    return rows;
  }

  function buyPlot(state, id) {
    const project = PROJECTS[id];
    if (!project.live || state.hq[id] > 0 || state.plots[id] === 1) return false;
    if (state.campaignLevel < project.unlock) return false;
    if (state.capital < project.capital || state.seals < (project.seals || 0)) return false;
    state.capital -= project.capital;
    state.seals -= project.seals || 0;
    state.plots[id] = 1;
    save(state);
    return true;
  }

  // Both HQ completion paths use the built flag to pay a building's reward only once.
  // A finished HQ building: its seal reward once; the school also brings the first foreman.
  function completeHqBuilding(state, id) {
    const first = !(state.hq[id] > 0);
    const seals = first ? PROJECTS[id].rewardSeals || 0 : 0;
    state.seals += seals;
    state.hq[id] = 1;
    state.plots[id] = 1;
    state.hqSite = null;
    if (id === 'exchange') fillExchange(state);
    const card = first && id === 'recruiting' ? grantFirstCard(state) : null;
    return { seals: seals, card: card };
  }

  function finishCityBuilding(state) {
    const done = completeHqBuilding(state, state.hqSite.id);
    save(state);
    return done;
  }

  function startHqProject(state, id) {
    if (state.hqSite && state.hqSite.id === id) return true;
    const project = PROJECTS[id];
    if (!project.live || state.hqSite) return false;
    if (state.hq[id] > 0 || state.plots[id] !== 1) return false;
    state.hqSite = { id: id, levelIndex: 0, parts: 0 };
    save(state);
    return true;
  }

  // Chests open from the 2nd story level. Foreman drops require the school's chestCards research;
  // the first chest after studying guarantees Shift if no foreman has been hired from another source.
  function chestsOpen(levelIndex) {
    return levelIndex + 1 >= FOREMEN.intro.chestsFromLevel;
  }

  // The company's first foreman (balance → foremen → intro.firstCard, 0 wins in the school table).
  // The crew of the running level is locked: the card goes to the story preset and starts working
  // with the next order (its briefing comes prefilled). Null once the company has any foreman.
  function grantFirstCard(state) {
    if (Object.keys(CARDS).some(function (id) { return state.cards[id].level > 0; })) return null;
    const intro = FOREMEN.intro;
    const card = grantCard(state, intro.firstCard);
    const preset = crewOf(state, 'campaign');
    card.equipped = preset.indexOf(intro.firstCard) < 0 && preset.length < foremanSlots(state);
    if (card.equipped) preset.push(intro.firstCard);
    card.first = true;
    return card;
  }

  function chestCard(state, levelIndex, threshold) {
    if (!schoolHasUpgrade(state, 'chestCards')) return null;
    return grantFirstCard(state) || rollCard(state, threshold === 25 ? 'chest25' : 'chest50');
  }

  function claimChest(state, levelIndex, threshold) {
    const key = levelIndex + ':' + threshold;
    if (!chestsOpen(levelIndex) || state.claimedChests[key] === 1) return null;
    state.claimedChests[key] = 1;
    const level = root.MicroBuilders.LEVELS[levelIndex];
    const share = META_BALANCE.capital.chestShares[threshold === 25 ? 0 : 1];
    const capital = Math.max(5, Math.round(levelCapital(level) * share));
    state.capital += capital;
    const card = chestCard(state, levelIndex, threshold);
    save(state);
    return Object.assign({ capital: capital, card: !!card }, card || {});
  }

  // After an office purchase or a card upgrade: the running crew gets the new numbers at once
  // (start-of-run bonuses such as extra builders wait for the next order).
  function applyLive(state, campaign) {
    applyCardStats(state, campaign);
  }

  function upgradeCard(state, id) {
    const card = state.cards[id];
    const copies = cardCopiesRequired(card);
    const cost = cardUpgradeCost(card, id);
    if (card.level <= 0 || card.level >= cardMaxLevel(id)) return false;
    const seals = cardSeals(card);
    if (card.copies < copies || state.capital < cost || state.seals < seals) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.cards[id].copies -= copies;
    state.cards[id].level += 1;
    save(state);
    return true;
  }

  function exchangeUpgradeCost(state, kind) {
    const prices = EXCHANGE_UPGRADES[kind].prices;
    if (prices && prices.length > 0) return prices[Math.min(state.exchange[kind], prices.length - 1)];
    return Math.round(100 * Math.pow(3, state.exchange[kind]));
  }

  function buyExchangeUpgrade(state, kind) {
    const cost = exchangeUpgradeCost(state, kind);
    const seals = exchangeSeals(kind, state.exchange[kind]);
    if (!exchangeUnlocked(state, kind)) return false;
    if (state.capital < cost || state.seals < seals || state.exchange[kind] >= EXCHANGE_UPGRADES[kind].max) return false;
    state.capital -= cost;
    state.seals -= seals;
    state.exchange[kind] += 1;
    if (kind === 'capacityLevel') state.exchange.capacity = exchangeCapacity(state);
    fillExchange(state);
    return true;
  }

  // ---------- contracts ----------
  // The list is calibrated by the campaign simulator (balance.json → meta → contracts): contract k is
  // meant for day k/3 of the reference player — its building, time limit and reward.
  function currentContract(state) {
    return META_BALANCE.contracts.list[state.contract.index] || null;
  }

  function contractLevelIndex(state) {
    const contract = currentContract(state);
    return contract ? contract.level : 0;
  }

  function contractLimitSeconds(state) {
    const contract = currentContract(state);
    return contract ? contract.limit : 0;
  }

  // A contract opens once its building is part of the company's history (a finished story level).
  function contractReady(state) {
    const contract = currentContract(state);
    return !!contract && state.completed.indexOf(contract.level) >= 0;
  }

  // ---------- seals ----------
  // The tech center pays 2 starter seals on completion; further seals come from contracts.
  // Every technology and the key nodes cost capital and seals.
  function sealCost(spec, level) {
    if (!spec || !spec.seals) return 0;
    return spec.seals[Math.min(level, spec.seals.length - 1)] || 0;
  }

  function officeSeals(id, level) {
    return sealCost(OFFICE[id], level);
  }

  function exchangeSeals(kind, level) {
    return sealCost(EXCHANGE_UPGRADES[kind], level);
  }

  // Foremen: raising a card from level L costs L − 1 seals (level 1 → 2 is free).
  function cardSeals(card) {
    return Math.max(0, card.level - (META_BALANCE.foremen ? META_BALANCE.foremen.freeLevels : 1));
  }

  // A failed or abandoned contract: 5 minutes of cooldown, its site slot is emptied (the other sites
  // are untouched, so the main run is never lost).
  function failContract(state) {
    state.contract.cooldownUntil = Date.now() + 5 * 60 * 1000;
    const side = site(state, 'side');
    if (side && side.runMode === 'contract') clearSite(state, 'side');
    else save(state);
  }

  // Night and weather of the site now: the schedule and multipliers live in sim.js (ENVIRONMENT),
  // so the simulator averages exactly what the game applies.
  function environment(state, campaign) {
    const chapter = Math.floor(campaign.levelIndex / 10);
    const value = root.MicroBuildersSim.environmentAt(chapter, campaign.levelElapsed, campaign.metaNightRelief);
    let weather = 'Ясно';
    if (value.phase === 2 && chapter >= 1) weather = chapter === 1 ? 'Снег' : (chapter === 2 ? 'Жара' : 'Дождь');
    if (value.phase === 3 && chapter >= 3) weather = chapter === 3 ? 'Шторм' : 'Сейсмическая активность';
    return { night: value.night, weather: weather, work: value.work, move: value.move };
  }

  function applyEnvironment(state, campaign) {
    const value = environment(state, campaign);
    campaign.badWeather = value.weather !== 'Ясно';
    // «Ночной прораб»: at night the crew is faster than by day; «Метеоролог»: bad weather speeds it up.
    const foremen = campaign.foremen || {};
    if (value.night && foremen.nightBoost) {
      value.work *= (1 + foremen.nightBoost.value) / (root.MicroBuildersSim.ENVIRONMENT.nightWork + (1 - root.MicroBuildersSim.ENVIRONMENT.nightWork) * campaign.metaNightRelief);
      value.move = Math.max(value.move, 1);
    }
    if (campaign.badWeather && foremen.meteo) {
      const night = value.night && !foremen.nightBoost ? root.MicroBuildersSim.ENVIRONMENT.nightWork + (1 - root.MicroBuildersSim.ENVIRONMENT.nightWork) * campaign.metaNightRelief : 1;
      value.work = night * (1 + foremen.meteo.value);
      value.move = Math.max(value.move, 1 + foremen.meteo.value / 2);
    }
    campaign.environmentWorkMultiplier = value.work;
    campaign.environmentMoveMultiplier = value.move;
    return value;
  }

  root.MicroBuildersMeta = {
    CARDS: CARDS,
    SCHOOL: SCHOOL,
    schoolHasUpgrade: schoolHasUpgrade,
    schoolUpgradeLevel: schoolUpgradeLevel,
    schoolTotalWins: schoolTotalWins,
    schoolUpgradeCost: schoolUpgradeCost,
    schoolUpgradeReason: schoolUpgradeReason,
    buySchoolUpgrade: buySchoolUpgrade,
    mentoringMultiplier: mentoringMultiplier,
    schoolAttempts: schoolAttempts,
    schoolBoss: schoolBoss,
    schoolMilestoneCards: schoolMilestoneCards,
    schoolBossLock: schoolBossLock,
    startSchoolTrial: startSchoolTrial,
    schoolLimitSeconds: schoolLimitSeconds,
    failSchoolTrial: failSchoolTrial,
    recruitPeriod: recruitPeriod,
    recruitCapacity: recruitCapacity,
    setRecruitFocus: setRecruitFocus,
    targetRecruitCost: targetRecruitCost,
    FOREMEN: FOREMEN,
    RARITIES: RARITIES,
    cardValue: cardValue,
    cardPassive: cardPassive,
    passiveStartCoins: passiveStartCoins,
    expertiseLevel: expertiseLevel,
    expertiseProgress: expertiseProgress,
    expertiseWorkers: expertiseWorkers,
    cardExperienceMultiplier: cardExperienceMultiplier,
    gainForemanExperience: gainForemanExperience,
    cardMaxLevel: cardMaxLevel,
    cardInPool: cardInPool,
    rollCard: rollCard,
    refreshRecruiting: refreshRecruiting,
    claimRecruit: claimRecruit,
    goldenFind: goldenFind,
    RARITY_NAMES: RARITY_NAMES,
    OFFICE: OFFICE,
    OFFICE_ROWS: OFFICE_ROWS,
    TECH: TECH,
    TECH_ORDER: TECH_ORDER,
    techUnlocked: techUnlocked,
    techPrerequisites: techPrerequisites,
    missingTechPrerequisites: missingTechPrerequisites,
    techCost: techCost,
    techSeals: techSeals,
    buyTech: buyTech,
    CITY: CITY,
    PROJECTS: PROJECTS,
    RARE_NAMES: RARE_NAMES,
    createState: createState,
    load: load,
    save: save,
    clearSave: clearSave,
    officeCost: officeCost,
    cardUpgradeCost: cardUpgradeCost,
    cardCopiesRequired: cardCopiesRequired,
    foremanSlots: foremanSlots,
    officeUnlocked: officeUnlocked,
    sessionLineOpen: sessionLineOpen,
    SESSION_LINE: SESSION_LINE,
    officeValue: officeValue,
    metaStats: metaStats,
    levelCapital: levelCapital,
    levelMass: levelMass,
    findValue: findValue,
    contractBoardOpen: contractBoardOpen,
    upcomingProjects: upcomingProjects,
    startHqProject: startHqProject,
    finishCityBuilding: finishCityBuilding,
    buyPlot: buyPlot,
    officeChain: officeChain,
    claimChest: claimChest,
    chestsOpen: chestsOpen,
    applyLive: applyLive,
    configureNewCampaign: configureNewCampaign,
    crewOf: crewOf,
    SITE_KEYS: SITE_KEYS,
    siteKey: siteKey,
    siteName: siteName,
    site: site,
    activeSite: activeSite,
    setActiveSite: setActiveSite,
    saveSite: saveSite,
    clearSite: clearSite,
    snapshotSession: snapshotSession,
    restoreCampaign: restoreCampaign,
    applySiteRuntime: applySiteRuntime,
    offlineEfficiency: offlineEfficiency,
    offlineCapSeconds: offlineCapSeconds,
    categoryForLevel: categoryForLevel,
    onBlocksPlaced: onBlocksPlaced,
    onLevelComplete: onLevelComplete,
    fillExchange: fillExchange,
    claimAway: claimAway,
    claimOffline: claimOffline,
    buyOffice: buyOffice,
    buildProject: startHqProject,
    upgradeCard: upgradeCard,
    exchangeUpgradeCost: exchangeUpgradeCost,
    EXCHANGE_UPGRADES: EXCHANGE_UPGRADES,
    exchangeValue: exchangeValue,
    exchangeUnlocked: exchangeUnlocked,
    skipCoins: skipCoins,
    startCoinBonus: startCoinBonus,
    exchangeCapacity: exchangeCapacity,
    exchangeReward: exchangeReward,
    buyExchangeUpgrade: buyExchangeUpgrade,
    contractLevelIndex: contractLevelIndex,
    contractLimitSeconds: contractLimitSeconds,
    currentContract: currentContract,
    contractReady: contractReady,
    officeSeals: officeSeals,
    exchangeSeals: exchangeSeals,
    cardSeals: cardSeals,
    failContract: failContract,
    foremanSlotsMax: foremanSlotsMax,
    cleanCrew: cleanCrew,
    modeHasCrew: modeHasCrew,
    saveCrewPreset: saveCrewPreset,
    cardSites: cardSites,
    activeRuns: activeRuns,
    equippedBonuses: equippedBonuses,
    storyReward: storyReward,
    applyEnvironment: applyEnvironment,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
