(function (root) {
  function levelSign(bp) {
    bp.box(-2, 0, -2, 2, 0, 2, 'ladder-sandstone');
    bp.put(0, 0, 0, 'ladder-brick-white');
    bp.paint(-2, 0, -2, 'ladder-pine');
    bp.paint(2, 0, -2, 'ladder-pine');
    bp.paint(-2, 0, 2, 'ladder-pine');
    bp.paint(2, 0, 2, 'ladder-pine');
    bp.post(0, 0, 1, 3, 'ladder-stone');
    bp.put(0, 4, 0, 'ladder-brick-white');
    bp.put(0, 5, 0, 'ladder-concrete');
  }

function levelHut(bp) {
  bp.box(-1, 0, -1, 2, 0, 1, 'ladder-sandstone');
  bp.walls(-1, 1, -1, 2, 2, 1, 'ladder-pine');
  bp.band(-1, 2, 2, -1, 1, 'ladder-stone');
  bp.carve(0, 1, 1, 2, 1);
  bp.cut(-1, 1, 0);
  bp.post(1, 0, 1, 2, 'ladder-brick-white');
  bp.gable(-1, 2, -1, 1, 3, 'ladder-brick-red');
  bp.post(2, -1, 4, 6, 'ladder-brick-red');
  bp.put(0, 0, 2, 'ladder-sandstone');
  bp.put(1, 0, 2, 'ladder-sandstone');
}

function levelTower(bp) {
  bp.box(-1, 0, -1, 1, 0, 1, 'ladder-granite');
  bp.walls(-1, 1, -1, 1, 7, 1, 'ladder-brick-red');
  bp.band(-1, 1, 3, -1, 1, 'ladder-sandstone');
  bp.band(-1, 1, 6, -1, 1, 'ladder-brick-white');
  bp.carve(0, 1, 1, 2, 1);
  bp.cut(1, 4, 0);
  bp.cut(-1, 6, 0);
  bp.cut(0, 5, -1);
  bp.post(0, 0, 1, 7, 'ladder-brick-white');
  bp.box(-1, 8, -1, 1, 8, 1, 'ladder-sandstone');
  bp.put(0, 9, 0, 'ladder-brick-white');
  bp.put(0, 10, 0, 'ladder-stone');
}

function levelSmith(bp) {
  bp.box(-2, 0, -2, 2, 0, 2, 'ladder-sandstone');
  bp.walls(-2, 1, -2, 2, 3, 2, 'ladder-brick-red');
  bp.band(-2, 2, 2, -2, 2, 'ladder-pine');
  bp.carve(-1, 2, 1, 2, 2);
  bp.cut(-2, 2, 0);
  bp.cut(2, 2, 0);
  bp.cut(0, 2, -2);
  bp.post(-1, 0, 1, 3, 'ladder-brick-white');
  bp.post(1, 0, 1, 3, 'ladder-brick-white');
  bp.box(-2, 4, -2, 2, 4, 2, 'ladder-pine');
  bp.box(-1, 5, -2, 1, 5, 2, 'ladder-brick-red');
  bp.post(2, -2, 5, 8, 'ladder-granite');
  bp.put(-1, 0, 3, 'ladder-sandstone');
  bp.put(0, 0, 3, 'ladder-sandstone');
  bp.put(1, 0, 3, 'ladder-sandstone');
}

function levelChapel(bp) {
  bp.box(-2, 0, -4, 2, 0, 4, 'ladder-sandstone');
  bp.walls(-2, 1, -4, 2, 2, 4, 'ladder-oak');
  bp.band(-2, 2, 2, -4, 4, 'ladder-brick-yellow');
  bp.carve(0, 4, 1, 2, 1);
  bp.cut(-2, 2, -1);
  bp.cut(2, 2, -1);
  bp.cut(-2, 2, 2);
  bp.cut(2, 2, 2);
  bp.post(0, 0, 1, 2, 'ladder-brick-white');
  bp.post(0, -2, 1, 2, 'ladder-brick-white');
  bp.box(-2, 3, -4, 2, 3, 4, 'ladder-brick-red');
  bp.box(-1, 4, -1, 1, 4, 1, 'ladder-sandstone');
  bp.post(0, -4, 4, 9, 'ladder-brick-white');
  bp.put(-1, 9, -4, 'ladder-brick-white');
  bp.put(1, 9, -4, 'ladder-brick-white');
  bp.put(0, 10, -4, 'ladder-brick-yellow');
  bp.put(-1, 0, 5, 'ladder-sandstone');
  bp.put(0, 0, 5, 'ladder-sandstone');
  bp.put(1, 0, 5, 'ladder-sandstone');
}

function levelBarn(bp) {
  bp.box(-4, 0, -2, 4, 0, 2, 'ladder-pine');
  bp.walls(-4, 1, -2, 4, 3, 2, 'ladder-brick-red');
  bp.band(-4, 4, 2, -2, 2, 'ladder-sandstone');
  bp.carve(-1, 2, 1, 2, 3);
  bp.cut(-4, 2, 0);
  bp.cut(4, 2, 0);
  bp.cut(-2, 2, -2);
  bp.cut(2, 2, -2);
  bp.post(-2, 0, 1, 3, 'ladder-brick-white');
  bp.post(2, 0, 1, 3, 'ladder-brick-white');
  bp.box(-2, 3, -1, 2, 3, 1, 'ladder-brick-white');
  bp.box(-4, 4, -2, 4, 4, 2, 'ladder-stone');
  bp.box(-2, 5, -2, 2, 5, 2, 'ladder-brick-red');
  bp.post(-4, 2, 5, 7, 'ladder-granite');
  bp.post(4, 2, 5, 7, 'ladder-granite');
  bp.put(-1, 0, 3, 'ladder-sandstone');
  bp.put(0, 0, 3, 'ladder-sandstone');
  bp.put(1, 0, 3, 'ladder-sandstone');
}

function levelGate(bp) {
  function tower(x0, x1, coreX) {
    bp.box(x0, 0, -1, x1, 0, 1, 'ladder-granite');
    bp.walls(x0, 1, -1, x1, 6, 1, 'ladder-brick-red');
    bp.post(coreX, 0, 1, 6, 'ladder-brick-white');
    bp.box(x0, 7, -1, x1, 7, 1, 'ladder-sandstone');
    bp.put(coreX, 8, 0, 'ladder-brick-white');
    bp.put(coreX, 9, 0, 'ladder-brick-white');
    bp.crenels(x0, x1, -1, 1, 8, 'ladder-stone');
  }
  tower(-5, -3, -4);
  tower(3, 5, 4);
  bp.box(-2, 0, -1, 2, 4, 1, 'ladder-oak');
  bp.carve(0, -1, 1, 3, 1);
  bp.carve(0, 0, 1, 3, 1);
  bp.carve(0, 1, 1, 3, 1);
  bp.band(-2, 2, 4, -1, 1, 'ladder-brick-white');
  bp.crenels(-2, 2, -1, 1, 5, 'ladder-stone');
  bp.walls(-7, 1, -1, -6, 3, 1, 'ladder-brick-red');
  bp.walls(6, 1, -1, 7, 3, 1, 'ladder-brick-red');
  bp.box(-7, 0, -1, -6, 0, 1, 'ladder-granite');
  bp.box(6, 0, -1, 7, 0, 1, 'ladder-granite');
}

function levelManor(bp) {
  bp.box(-5, 0, -1, 2, 0, 3, 'ladder-sandstone');
  bp.walls(-5, 1, -1, 2, 3, 3, 'ladder-oak');
  bp.band(-5, 2, 2, -1, 3, 'ladder-brick-yellow');
  bp.carve(-2, 3, 1, 2, 2);
  bp.cut(-5, 2, 1);
  bp.cut(2, 2, 1);
  bp.cut(0, 2, -1);
  bp.post(-3, 1, 1, 3, 'ladder-brick-white');
  bp.post(0, 1, 1, 3, 'ladder-brick-white');
  bp.box(-5, 4, -1, 2, 4, 3, 'ladder-brick-red');
  bp.box(-3, 5, -1, 1, 5, 3, 'ladder-pine');
  bp.box(1, 0, -5, 4, 0, -2, 'ladder-pine');
  bp.walls(1, 1, -5, 4, 3, -2, 'ladder-brick-red');
  bp.band(1, 4, 2, -5, -2, 'ladder-sandstone');
  bp.carve(2, -2, 1, 2, 1);
  bp.cut(4, 2, -4);
  bp.post(3, -4, 1, 3, 'ladder-brick-white');
  bp.box(1, 4, -5, 4, 4, -2, 'ladder-pine');
  bp.box(-2, 0, -1, 0, 0, 1, 'ladder-granite');
  bp.walls(-2, 1, -1, 0, 6, 1, 'ladder-brick-yellow');
  bp.post(-1, 0, 1, 6, 'ladder-brick-white');
  bp.box(-2, 7, -1, 0, 7, 1, 'ladder-oak');
  bp.put(-1, 8, 0, 'ladder-brick-white');
  bp.put(-1, 9, 0, 'ladder-brick-white');
  bp.post(2, 3, 5, 7, 'ladder-brick-red');
  bp.box(-8, 0, -1, -6, 0, 2, 'ladder-sandstone');
  bp.walls(-8, 1, -1, -6, 2, 2, 'ladder-brick-red');
  bp.carve(-6, 0, 1, 2, 1);
  bp.post(-7, 1, 1, 2, 'ladder-brick-white');
  bp.box(-8, 3, -1, -6, 3, 2, 'ladder-pine');
  bp.post(-8, 2, 4, 6, 'ladder-brick-red');
}

function levelCitadel(bp) {
  bp.walls(-6, 0, -5, 6, 3, 5, 'ladder-brick-red');
  bp.band(-6, 6, 2, -5, 5, 'ladder-bronze');
  bp.band(-6, 6, 3, -5, 5, 'ladder-oak');
  bp.carve(-1, 5, 1, 3, 3);
  bp.crenels(-6, 6, -5, 5, 4, 'ladder-oak');
  bp.box(-1, 0, -1, 1, 0, 1, 'ladder-brick-white');
  function corner(x0, x1, z0, z1, coreX, coreZ) {
    bp.box(x0, 0, z0, x1, 0, z1, 'ladder-granite');
    bp.walls(x0, 1, z0, x1, 7, z1, 'ladder-brick-yellow');
    bp.post(coreX, coreZ, 1, 7, 'ladder-brick-white');
    bp.box(x0, 8, z0, x1, 8, z1, 'ladder-sandstone');
    bp.put(coreX, 9, coreZ, 'ladder-brick-white');
  }
  corner(-6, -4, -5, -3, -5, -4);
  corner(4, 6, -5, -3, 5, -4);
  corner(-6, -4, 3, 5, -5, 4);
  corner(4, 6, 3, 5, 5, 4);
  bp.post(0, -2, 0, 2, 'ladder-brick-white');
  bp.post(0, 2, 0, 2, 'ladder-brick-white');
}

function levelCathedral(bp) {
  bp.box(-2, 0, -6, 2, 0, 6, 'ladder-sandstone');
  bp.walls(-2, 1, -6, 2, 4, 6, 'ladder-oak');
  bp.band(-2, 2, 2, -6, 6, 'ladder-iron');
  bp.band(-2, 2, 4, -6, 6, 'ladder-brick-white');
  bp.carve(-1, 6, 1, 3, 2);
  bp.cut(-2, 3, -2);
  bp.cut(2, 3, -2);
  bp.cut(-2, 3, 2);
  bp.cut(2, 3, 2);
  bp.cut(0, 3, -6);
  bp.post(-1, -3, 1, 4, 'ladder-brick-white');
  bp.post(1, -3, 1, 4, 'ladder-brick-white');
  bp.post(-1, 1, 1, 4, 'ladder-brick-white');
  bp.post(1, 1, 1, 4, 'ladder-brick-white');
  bp.box(-2, 5, -6, 2, 5, 6, 'ladder-brick-red');
  bp.box(-1, 6, -6, 1, 6, 6, 'ladder-pine');
  bp.post(0, -6, 7, 12, 'ladder-brick-white');
  bp.put(-1, 12, -6, 'ladder-brick-white');
  bp.put(1, 12, -6, 'ladder-brick-white');
  bp.put(0, 13, -6, 'ladder-brick-yellow');
  bp.box(-6, 0, -1, -3, 0, 1, 'ladder-pine');
  bp.box(3, 0, -1, 6, 0, 1, 'ladder-pine');
  bp.walls(-6, 1, -1, -3, 3, 1, 'ladder-brick-red');
  bp.walls(3, 1, -1, 6, 3, 1, 'ladder-brick-red');
  bp.carve(-5, 1, 1, 2, 1);
  bp.carve(5, 1, 1, 2, 1);
  bp.post(-4, 0, 1, 3, 'ladder-brick-white');
  bp.post(4, 0, 1, 3, 'ladder-brick-white');
  bp.box(-6, 4, -1, -3, 4, 1, 'ladder-pine');
  bp.box(3, 4, -1, 6, 4, 1, 'ladder-pine');
  bp.box(-2, 0, 5, 0, 8, 7, 'ladder-brick-yellow');
  bp.box(0, 0, 5, 2, 8, 7, 'ladder-brick-yellow');
  bp.walls(-2, 1, 5, 0, 8, 7, 'ladder-brick-yellow');
  bp.walls(0, 1, 5, 2, 8, 7, 'ladder-brick-yellow');
  bp.post(-1, 6, 1, 8, 'ladder-brick-white');
  bp.post(1, 6, 1, 8, 'ladder-brick-white');
  bp.box(-2, 9, 5, 0, 9, 7, 'ladder-oak');
  bp.box(0, 9, 5, 2, 9, 7, 'ladder-oak');
  bp.put(-1, 10, 6, 'ladder-brick-white');
  bp.put(1, 10, 6, 'ladder-brick-white');
  bp.put(-1, 11, 6, 'ladder-brick-white');
  bp.put(1, 11, 6, 'ladder-brick-white');
  bp.put(0, 0, 7, 'ladder-sandstone');
  bp.put(-1, 0, 7, 'ladder-sandstone');
  bp.put(1, 0, 7, 'ladder-sandstone');
  bp.carve(-1, 5, 1, 3, 2);
  bp.carve(-1, 6, 1, 3, 2);
  bp.carve(-1, 7, 1, 3, 2);
}

function levelBridge(bp) {
  function gate(x0, x1, coreX) {
    bp.box(x0, 0, -2, x1, 4, 2, 'ladder-granite');
    bp.walls(x0, 5, -2, x1, 8, 2, 'ladder-brick-red');
    bp.post(coreX, 0, 5, 8, 'ladder-brick-white');
    bp.box(x0, 9, -2, x1, 9, 2, 'ladder-sandstone');
    bp.put(coreX, 10, 0, 'ladder-brick-white');
    bp.crenels(x0, x1, -2, 2, 10, 'ladder-stone');
    bp.carve(coreX, 2, 6, 2, 1);
  }
  gate(-10, -7, -8);
  gate(7, 10, 8);
  bp.box(-6, 4, -1, 6, 4, 1, 'ladder-granite');
  bp.box(-6, 5, -1, 6, 5, -1, 'ladder-pine');
  bp.box(-6, 5, 1, 6, 5, 1, 'ladder-pine');
  bp.put(0, 4, 0, 'ladder-brick-white');
  bp.put(0, 5, -1, 'ladder-brick-white');
  bp.put(0, 5, 1, 'ladder-brick-white');
  bp.rampRun(-15, -1, 1, 5, 1, 'ladder-sandstone');
  bp.rampRun(15, -1, 1, 5, -1, 'ladder-sandstone');
  bp.post(0, 0, 5, 7, 'ladder-concrete');
  bp.put(-1, 6, 0, 'ladder-brick-white');
  bp.put(1, 6, 0, 'ladder-brick-white');
}

function levelFoundry(bp) {
  bp.box(-8, 0, -4, 8, 0, 4, 'ladder-sandstone');
  bp.walls(-8, 1, -4, 8, 4, 4, 'ladder-steel');
  bp.band(-8, 8, 3, -4, 4, 'ladder-pine');
  bp.carve(-1, 4, 1, 3, 3);
  bp.cut(-8, 2, 0);
  bp.cut(8, 2, 0);
  bp.cut(-4, 2, -4);
  bp.cut(4, 2, -4);
  bp.cut(0, 2, -4);
  for (let x = -6; x <= 6; x += 4) {
    bp.post(x, -2, 1, 4, 'ladder-brick-white');
    bp.post(x, 2, 1, 4, 'ladder-brick-white');
  }
  bp.box(-1, 1, -1, 1, 2, 1, 'ladder-granite');
  bp.put(0, 3, 0, 'ladder-brick-white');
  bp.box(-8, 5, -4, 8, 5, 4, 'ladder-stone');
  for (let x = -7; x <= 7; x += 3) {
    bp.box(x, 6, -3, x, 6, 3, 'ladder-oak');
    bp.box(x, 7, -1, x, 7, 1, 'ladder-brick-yellow');
  }
  bp.post(-8, -4, 6, 12, 'ladder-granite');
  bp.post(8, -4, 6, 12, 'ladder-granite');
  bp.put(-8, 13, -4, 'ladder-concrete');
  bp.put(8, 13, -4, 'ladder-concrete');
  bp.box(9, 0, -2, 13, 0, 2, 'ladder-pine');
  bp.walls(9, 1, -2, 13, 3, 2, 'ladder-brick-red');
  bp.carve(9, 0, 1, 2, 1);
  bp.post(11, 0, 1, 3, 'ladder-brick-white');
  bp.box(9, 4, -2, 13, 4, 2, 'ladder-sandstone');
  bp.post(13, -2, 5, 9, 'ladder-granite');
  bp.put(13, 10, -2, 'ladder-brick-white');
}

function levelLighthouse(bp) {
  bp.box(-4, 0, -4, 4, 0, 4, 'ladder-granite');
  bp.walls(-4, 1, -4, 4, 2, 4, 'ladder-brick-red');
  bp.band(-4, 4, 2, -4, 4, 'ladder-sandstone');
  bp.box(-4, 3, -4, 4, 3, 4, 'ladder-sandstone');
  bp.walls(-3, 4, -3, 3, 8, 3, 'ladder-oak');
  bp.band(-3, 3, 6, -3, 3, 'ladder-pine');
  bp.post(0, 0, 1, 16, 'ladder-brick-white');
  bp.carve(0, 4, 1, 2, 1);
  bp.cut(0, 6, -3);
  bp.cut(3, 7, 0);
  bp.cut(-3, 7, 0);
  bp.box(-5, 9, -5, 5, 9, 5, 'ladder-stone');
  bp.crenels(-5, 5, -5, 5, 10, 'ladder-pine');
  bp.walls(-2, 10, -2, 2, 14, 2, 'ladder-brick-yellow');
  bp.cut(-2, 12, 0);
  bp.cut(2, 12, 0);
  bp.cut(0, 12, -2);
  bp.cut(0, 12, 2);
  bp.box(-2, 15, -2, 2, 15, 2, 'ladder-oak');
  bp.box(-1, 16, -1, 1, 16, 1, 'ladder-brick-white');
  bp.put(0, 17, 0, 'ladder-concrete');
}

function levelAqueduct(bp) {
  const piers = [-10, -5, 0, 5, 10];
  for (let i = 0; i < piers.length; i++) {
    const x = piers[i];
    bp.box(x, 0, -1, x + 1, 6, 1, 'ladder-granite');
    bp.post(x, 0, 1, 6, 'ladder-brick-white');
    bp.post(x + 1, 0, 1, 6, 'ladder-brick-white');
  }
  bp.box(-10, 7, -1, 11, 7, 1, 'ladder-oak');
  for (let x = -10; x <= 11; x++) bp.paint(x, 7, 0, 'ladder-concrete');
  for (let i = 0; i < piers.length - 1; i++) {
    const left = piers[i] + 2;
    const right = piers[i + 1] - 1;
    bp.put(left, 6, 0, 'ladder-pine');
    bp.put(right, 6, 0, 'ladder-pine');
    bp.put(left, 6, -1, 'ladder-pine');
    bp.put(right, 6, -1, 'ladder-pine');
    bp.put(left, 6, 1, 'ladder-pine');
    bp.put(right, 6, 1, 'ladder-pine');
    const mid = (left + right) >> 1;
    bp.put(mid, 7, 0, 'ladder-brick-white');
  }
  bp.box(-10, 8, -1, 11, 8, -1, 'ladder-brick-red');
  bp.box(-10, 8, 1, 11, 8, 1, 'ladder-brick-red');
  bp.box(-10, 9, -1, 11, 9, -1, 'ladder-brick-yellow');
  bp.box(-10, 9, 1, 11, 9, 1, 'ladder-brick-yellow');
  bp.box(-10, 8, 0, -10, 10, 0, 'ladder-brick-white');
  bp.box(11, 8, 0, 11, 10, 0, 'ladder-brick-white');
  bp.box(-14, 0, -2, -11, 0, 2, 'ladder-sandstone');
  bp.walls(-14, 1, -2, -11, 4, 2, 'ladder-brick-red');
  bp.post(-13, 0, 1, 4, 'ladder-brick-white');
  bp.box(-14, 5, -2, -11, 5, 2, 'ladder-stone');
  bp.carve(-11, 0, 1, 2, 1);
  bp.box(12, 0, -2, 15, 0, 2, 'ladder-sandstone');
  bp.walls(12, 1, -2, 15, 4, 2, 'ladder-brick-red');
  bp.post(14, 0, 1, 4, 'ladder-brick-white');
  bp.box(12, 5, -2, 15, 5, 2, 'ladder-stone');
  bp.carve(12, 0, 1, 2, 1);
  bp.put(-14, 6, -2, 'ladder-granite');
  bp.put(15, 6, -2, 'ladder-granite');
}

function levelFortress(bp) {
  bp.walls(-9, 0, -7, 9, 4, 7, 'ladder-brick-red');
  bp.band(-9, 9, 2, -7, 7, 'ladder-pine');
  bp.band(-9, 9, 4, -7, 7, 'ladder-oak');
  bp.carve(-1, 7, 1, 3, 3);
  bp.crenels(-9, 9, -7, 7, 5, 'ladder-stone');
  function tower(x0, x1, z0, z1, coreX, coreZ) {
    bp.box(x0, 0, z0, x1, 0, z1, 'ladder-granite');
    bp.walls(x0, 1, z0, x1, 9, z1, 'ladder-brick-yellow');
    bp.post(coreX, coreZ, 1, 9, 'ladder-brick-white');
    bp.box(x0, 10, z0, x1, 10, z1, 'ladder-sandstone');
    bp.put(coreX, 11, coreZ, 'ladder-brick-white');
    bp.crenels(x0, x1, z0, z1, 11, 'ladder-oak');
    bp.cut(coreX, 5, z0);
    bp.cut(coreX, 5, z1);
  }
  tower(-9, -6, -7, -4, -7, -5);
  tower(6, 9, -7, -4, 7, -5);
  tower(-9, -6, 4, 7, -7, 5);
  tower(6, 9, 4, 7, 7, 5);
  bp.box(-3, 0, -3, 3, 0, 3, 'ladder-sandstone');
  bp.walls(-3, 1, -3, 3, 7, 3, 'ladder-oak');
  bp.band(-3, 3, 4, -3, 3, 'ladder-brick-white');
  bp.post(0, 0, 1, 11, 'ladder-brick-white');
  bp.carve(0, 3, 1, 3, 1);
  bp.box(-3, 8, -3, 3, 8, 3, 'ladder-brick-red');
  bp.box(-2, 9, -2, 2, 9, 2, 'ladder-pine');
  bp.box(-1, 10, -1, 1, 10, 1, 'ladder-sandstone');
  bp.put(0, 12, 0, 'ladder-concrete');
  bp.box(-5, 0, 6, -4, 4, 9, 'ladder-granite');
  bp.box(4, 0, 6, 5, 4, 9, 'ladder-granite');
  bp.walls(-5, 5, 7, -4, 6, 9, 'ladder-brick-red');
  bp.walls(4, 5, 7, 5, 6, 9, 'ladder-brick-red');
  bp.put(-5, 7, 8, 'ladder-brick-white');
  bp.put(5, 7, 8, 'ladder-brick-white');
}

function levelTownHall(bp) {
  bp.box(-7, 0, -3, 5, 0, 4, 'ladder-sandstone');
  bp.walls(-7, 1, -3, 5, 4, 4, 'ladder-oak');
  bp.band(-7, 5, 3, -3, 4, 'ladder-brick-yellow');
  bp.carve(-2, 4, 1, 3, 3);
  bp.cut(-7, 2, 0);
  bp.cut(5, 2, 1);
  bp.cut(-4, 3, -3);
  bp.cut(2, 3, -3);
  bp.post(-4, 0, 1, 4, 'ladder-brick-white');
  bp.post(2, 0, 1, 4, 'ladder-brick-white');
  bp.post(-1, 1, 1, 4, 'ladder-brick-white');
  bp.box(-7, 5, -3, 5, 5, 4, 'ladder-brick-red');
  bp.box(-5, 6, -2, 3, 6, 3, 'ladder-pine');
  bp.box(-3, 0, 5, 2, 0, 7, 'ladder-stone');
  bp.post(-3, 6, 1, 4, 'ladder-oak');
  bp.post(2, 6, 1, 4, 'ladder-oak');
  bp.post(-3, 5, 1, 4, 'ladder-oak');
  bp.post(2, 5, 1, 4, 'ladder-oak');
  bp.box(-3, 5, 5, 2, 5, 7, 'ladder-pine');
  bp.put(-3, 6, 6, 'ladder-brick-white');
  bp.put(2, 6, 6, 'ladder-brick-white');
  bp.box(6, 0, -1, 9, 0, 2, 'ladder-granite');
  bp.walls(6, 1, -1, 9, 10, 2, 'ladder-brick-red');
  bp.post(7, 0, 1, 12, 'ladder-brick-white');
  bp.post(8, 1, 1, 12, 'ladder-brick-white');
  bp.band(6, 9, 6, -1, 2, 'ladder-brick-white');
  bp.carve(6, 0, 1, 3, 1);
  bp.cut(9, 4, 0);
  bp.cut(9, 8, 0);
  bp.box(6, 11, -1, 9, 11, 2, 'ladder-sandstone');
  bp.box(7, 12, 0, 8, 13, 1, 'ladder-brick-white');
  bp.put(7, 14, 0, 'ladder-concrete');
  bp.put(8, 14, 1, 'ladder-concrete');
  bp.box(-7, 0, -8, -3, 0, -4, 'ladder-pine');
  bp.walls(-7, 1, -8, -3, 3, -4, 'ladder-brick-red');
  bp.carve(-5, -4, 1, 2, 1);
  bp.post(-5, -6, 1, 3, 'ladder-brick-white');
  bp.box(-7, 4, -8, -3, 4, -4, 'ladder-sandstone');
  bp.post(-7, -8, 5, 8, 'ladder-granite');
  bp.put(-7, 9, -8, 'ladder-brick-white');
  bp.rampRun(13, 0, 1, 4, -1, 'ladder-sandstone');
}

function levelObservatory(bp) {
  bp.box(-5, 0, -5, 5, 0, 5, 'ladder-sandstone');
  bp.walls(-5, 1, -5, 5, 5, 5, 'ladder-oak');
  bp.band(-5, 5, 3, -5, 5, 'ladder-brick-yellow');
  bp.carve(-1, 5, 1, 3, 3);
  bp.cut(-5, 3, 0);
  bp.cut(5, 3, 0);
  bp.cut(0, 3, -5);
  bp.post(0, 0, 1, 14, 'ladder-brick-white');
  bp.lantern(6, [5, 4, 4, 3, 2, 2, 1], 'ladder-stone', 'ladder-brick-white');
  bp.put(0, 13, 0, 'ladder-concrete');
  bp.put(0, 14, 0, 'ladder-brick-white');
  bp.box(6, 0, -2, 11, 0, 3, 'ladder-pine');
  bp.walls(6, 1, -2, 11, 3, 3, 'ladder-brick-red');
  bp.carve(6, 1, 1, 2, 1);
  bp.post(9, 0, 1, 3, 'ladder-brick-white');
  bp.box(6, 4, -2, 11, 4, 3, 'ladder-sandstone');
  bp.box(8, 5, -1, 10, 5, 2, 'ladder-oak');
  bp.post(11, 3, 5, 8, 'ladder-granite');
  bp.box(-9, 0, -1, -6, 0, 2, 'ladder-granite');
  bp.walls(-9, 1, -1, -6, 7, 2, 'ladder-brick-yellow');
  bp.post(-7, 0, 1, 9, 'ladder-brick-white');
  bp.carve(-6, 0, 1, 2, 1);
  bp.cut(-9, 4, 0);
  bp.box(-9, 8, -1, -6, 8, 2, 'ladder-oak');
  bp.box(-8, 9, 0, -7, 10, 1, 'ladder-brick-white');
  bp.box(-13, 7, 0, -6, 7, 0, 'ladder-brick-red');
  bp.put(-13, 7, 0, 'ladder-brick-white');
  bp.put(-13, 8, 0, 'ladder-concrete');
}

function levelShipyard(bp) {
  bp.box(-8, 0, -8, -6, 0, 7, 'ladder-granite');
  bp.walls(-8, 1, -8, -6, 3, 7, 'ladder-brick-red');
  bp.band(-8, -6, 2, -8, 7, 'ladder-pine');
  bp.box(-8, 4, -8, -6, 4, 7, 'ladder-pine');
  bp.carve(-6, 2, 1, 2, 1);
  bp.carve(-6, -2, 1, 2, 1);
  bp.cut(-8, 2, 4);
  bp.box(6, 0, -8, 8, 0, 7, 'ladder-granite');
  bp.walls(6, 1, -8, 8, 3, 7, 'ladder-brick-red');
  bp.band(6, 8, 2, -8, 7, 'ladder-pine');
  bp.box(6, 4, -8, 8, 4, 7, 'ladder-pine');
  bp.carve(6, 1, 1, 2, 1);
  bp.box(-5, 0, -8, 5, 0, -6, 'ladder-sandstone');
  bp.walls(-5, 1, -8, 5, 3, -6, 'ladder-brick-red');
  bp.box(-5, 4, -8, 5, 4, -6, 'ladder-stone');
  bp.carve(-1, -6, 1, 2, 3);
  bp.post(-2, -7, 1, 3, 'ladder-brick-white');
  bp.post(2, -7, 1, 3, 'ladder-brick-white');
  bp.box(0, 0, -3, 0, 0, 5, 'ladder-granite');
  bp.box(-1, 1, -2, 1, 1, 4, 'ladder-brick-red');
  bp.box(-2, 2, -1, 2, 2, 3, 'ladder-pine');
  bp.box(-1, 3, 0, 1, 4, 2, 'ladder-sandstone');
  bp.walls(-1, 4, 3, 1, 5, 5, 'ladder-oak');
  bp.box(-1, 6, 3, 1, 6, 5, 'ladder-brick-red');
  bp.post(0, 1, 5, 12, 'ladder-brick-white');
  bp.box(-3, 8, 1, 3, 8, 1, 'ladder-stone');
  bp.put(-3, 8, 1, 'ladder-brick-white');
  bp.put(3, 8, 1, 'ladder-brick-white');
  bp.put(0, 13, 1, 'ladder-concrete');
  bp.post(7, 2, 5, 11, 'ladder-granite');
  bp.box(3, 9, 2, 7, 9, 2, 'ladder-brick-red');
  bp.put(3, 9, 2, 'ladder-brick-white');
  bp.post(7, -6, 5, 8, 'ladder-brick-yellow');
  bp.post(7, 6, 5, 8, 'ladder-brick-yellow');
  bp.put(-8, 5, 7, 'ladder-brick-white');
  bp.put(8, 5, 7, 'ladder-brick-white');
}

function levelMonastery(bp) {
  function range(x0, x1, z0, z1) {
    bp.box(x0, 0, z0, x1, 0, z1, 'ladder-sandstone');
    bp.walls(x0, 1, z0, x1, 3, z1, 'ladder-brick-red');
    bp.band(x0, x1, 2, z0, z1, 'ladder-pine');
    bp.box(x0, 4, z0, x1, 4, z1, 'ladder-pine');
  }
  range(-7, 7, 5, 7);
  range(-7, 7, -7, -5);
  range(-7, -5, -4, 4);
  range(5, 7, -4, 4);
  bp.carve(-1, 7, 1, 2, 3);
  bp.carve(0, 5, 1, 2, 1);
  bp.carve(-7, 0, 1, 2, 1);
  bp.carve(7, 0, 1, 2, 1);
  bp.carve(0, -5, 1, 2, 1);
  bp.cut(-4, 2, 5);
  bp.cut(-2, 2, 5);
  bp.cut(2, 2, 5);
  bp.cut(4, 2, 5);
  bp.cut(-5, 2, -2);
  bp.cut(-5, 2, 2);
  bp.cut(5, 2, -2);
  bp.cut(5, 2, 2);
  bp.box(-3, 0, -13, 3, 0, -6, 'ladder-oak');
  bp.walls(-3, 1, -13, 3, 6, -6, 'ladder-brick-yellow');
  bp.band(-3, 3, 4, -13, -6, 'ladder-brick-white');
  bp.post(-1, -9, 1, 6, 'ladder-brick-white');
  bp.post(1, -9, 1, 6, 'ladder-brick-white');
  bp.carve(0, -6, 1, 3, 1);
  bp.cut(-3, 3, -10);
  bp.cut(3, 3, -10);
  bp.box(-3, 7, -13, 3, 7, -6, 'ladder-brick-red');
  bp.box(-1, 8, -13, 1, 8, -8, 'ladder-pine');
  bp.post(0, -13, 8, 14, 'ladder-brick-white');
  bp.put(-1, 14, -13, 'ladder-brick-white');
  bp.put(1, 14, -13, 'ladder-brick-white');
  bp.put(0, 15, -13, 'ladder-concrete');
  bp.walls(-1, 0, -1, 1, 2, 1, 'ladder-stone');
  bp.put(0, 0, 0, 'ladder-brick-white');
  bp.put(0, 1, 0, 'ladder-concrete');
  bp.box(-1, 3, -1, 1, 3, 1, 'ladder-oak');
  bp.put(0, 4, 0, 'ladder-brick-white');
  bp.post(-7, 7, 5, 7, 'ladder-granite');
  bp.post(7, 7, 5, 7, 'ladder-granite');
  bp.put(-7, 8, 7, 'ladder-brick-white');
  bp.put(7, 8, 7, 'ladder-brick-white');
}

function levelPalace(bp) {
  bp.walls(-12, 0, -9, 12, 3, 9, 'ladder-brick-red');
  bp.band(-12, 12, 2, -9, 9, 'ladder-pine');
  bp.box(-12, 0, -1, 12, 0, 1, 'ladder-sandstone');
  bp.box(-1, 0, -9, 1, 0, 9, 'ladder-sandstone');
  bp.carve(-1, 9, 1, 3, 3);
  bp.crenels(-12, 12, -9, 9, 4, 'ladder-oak');
  bp.walls(-6, 0, -5, 6, 1, 4, 'ladder-granite');
  bp.post(0, 0, 0, 16, 'ladder-brick-white');
  bp.post(-3, -2, 0, 8, 'ladder-brick-white');
  bp.post(3, -2, 0, 8, 'ladder-brick-white');
  bp.post(-3, 2, 0, 8, 'ladder-brick-white');
  bp.post(3, 2, 0, 8, 'ladder-brick-white');
  bp.box(-6, 2, -5, 6, 2, 4, 'ladder-sandstone');
  bp.walls(-6, 3, -5, 6, 8, 4, 'ladder-oak');
  bp.band(-6, 6, 6, -5, 4, 'ladder-brick-white');
  bp.carve(-1, 4, 3, 3, 3);
  bp.cut(-6, 5, 0);
  bp.cut(6, 5, 0);
  bp.cut(0, 5, -5);
  bp.lantern(9, [6, 5, 4, 3, 2, 1], 'ladder-stone', 'ladder-brick-white');
  bp.put(0, 15, 0, 'ladder-brick-white');
  bp.put(0, 16, 0, 'ladder-concrete');
  function minaret(x, z) {
    bp.box(x, 0, z, x + 1, 0, z + 1, 'ladder-granite');
    bp.walls(x, 1, z, x + 1, 12, z + 1, 'ladder-brick-yellow');
    bp.post(x, z, 1, 12, 'ladder-brick-white');
    bp.box(x - 1, 13, z - 1, x + 2, 13, z + 2, 'ladder-sandstone');
    bp.walls(x, 14, z, x + 1, 16, z + 1, 'ladder-oak');
    bp.put(x, 17, z, 'ladder-brick-white');
    bp.put(x + 1, 17, z + 1, 'ladder-brick-white');
    bp.cut(x, 6, z);
    bp.cut(x + 1, 9, z + 1);
  }
  minaret(-11, -8);
  minaret(9, -8);
  minaret(-11, 6);
  minaret(9, 6);
  bp.box(-10, 6, -7, -6, 6, -7, 'ladder-oak');
  bp.box(-6, 6, -6, -6, 6, -6, 'ladder-oak');
  bp.box(6, 6, -7, 9, 6, -7, 'ladder-oak');
  bp.box(6, 6, -6, 6, 6, -6, 'ladder-oak');
  bp.box(-10, 6, 6, -6, 6, 6, 'ladder-oak');
  bp.box(-6, 6, 5, -6, 6, 5, 'ladder-oak');
  bp.box(6, 6, 6, 9, 6, 6, 'ladder-oak');
  bp.box(6, 6, 5, 6, 6, 5, 'ladder-oak');
  bp.rampRiseZ(9, -2, 2, 5, -1, 'ladder-sandstone');
  function pavilion(x0, x1, z0, z1, doorX) {
    bp.box(x0, 0, z0, x1, 0, z1, 'ladder-pine');
    bp.walls(x0, 1, z0, x1, 4, z1, 'ladder-brick-red');
    bp.post(x0 + 1, z0 + 1, 1, 4, 'ladder-brick-white');
    bp.box(x0, 5, z0, x1, 5, z1, 'ladder-stone');
    bp.put(x0 + 1, 6, z0 + 1, 'ladder-brick-white');
    bp.carve(doorX, 0, 1, 2, 1);
  }
  pavilion(-16, -13, -2, 2, -13);
  pavilion(13, 16, -2, 2, 13);
  bp.box(-16, 3, 0, -12, 3, 0, 'ladder-brick-white');
  bp.box(12, 3, 0, 16, 3, 0, 'ladder-brick-white');
}

function panoramaX(bp, x0, x1, y0, y1, z, materialId, faceZ) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) bp.window(x, y, z, materialId, 0, faceZ, 'panorama');
  }
}

function panoramaZ(bp, z0, z1, y0, y1, x, materialId, faceX) {
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) bp.window(x, y, z, materialId, faceX, 0, 'panorama');
  }
}

function shapedWindow(bp, x, y, z, materialId, faceX, faceZ, style) {
  bp.window(x, y, z, materialId, faceX, faceZ, style);
}

function windowShapeOffsets(style, radius) {
  const offsets = [];
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      let inside = false;
      if (style === 'round' || style === 'rose') inside = x * x + y * y <= radius * radius + 0.25;
      if (style === 'diamond') inside = Math.abs(x) + Math.abs(y) <= radius;
      if (style === 'triangle') inside = Math.abs(x) <= Math.floor((radius - y) / 2);
      if (style === 'arch') inside = y <= 0 || x * x + y * y <= radius * radius + 0.25;
      if (style === 'slit') inside = x === 0;
      if (inside) offsets.push([x, y]);
    }
  }
  return offsets;
}

function windowMosaicX(bp, centerX, centerY, z, materialId, faceZ, style, radius) {
  const offsets = windowShapeOffsets(style, radius);
  for (let i = 0; i < offsets.length; i++) {
    bp.window(centerX + offsets[i][0], centerY + offsets[i][1], z, materialId, 0, faceZ, style);
  }
}

function windowMosaicZ(bp, centerZ, centerY, x, materialId, faceX, style, radius) {
  const offsets = windowShapeOffsets(style, radius);
  for (let i = 0; i < offsets.length; i++) {
    bp.window(x, centerY + offsets[i][1], centerZ + offsets[i][0], materialId, faceX, 0, style);
  }
}

function levelGlassFoundry(bp) {
  bp.box(-5, 0, -4, 5, 0, 4, 'ladder-brick-red');
  bp.walls(-5, 1, -4, 5, 5, 4, 'ladder-sandstone');
  bp.box(-5, 6, -4, 5, 6, 4, 'ladder-stone');
  panoramaX(bp, -4, 4, 2, 4, -4, 'ladder-oak', -1);
  panoramaX(bp, -4, 4, 2, 4, 4, 'ladder-oak', 1);
  panoramaZ(bp, -2, 2, 2, 4, -5, 'ladder-oak', -1);
  panoramaZ(bp, -2, 2, 2, 4, 5, 'ladder-oak', 1);
  bp.post(-3, 0, 7, 10, 'ladder-granite');
  bp.post(3, 0, 7, 10, 'ladder-granite');
}

function levelWinterGallery(bp) {
  bp.box(-6, 0, -3, 6, 0, 3, 'ladder-pine');
  bp.walls(-6, 1, -3, 6, 6, 3, 'ladder-brick-red');
  bp.box(-6, 7, -3, 6, 7, 3, 'ladder-oak');
  panoramaX(bp, -5, 5, 2, 5, -3, 'ladder-brick-yellow', -1);
  panoramaX(bp, -5, 5, 2, 5, 3, 'ladder-brick-yellow', 1);
  panoramaZ(bp, -2, 2, 2, 5, -6, 'ladder-brick-yellow', -1);
  panoramaZ(bp, -2, 2, 2, 5, 6, 'ladder-brick-yellow', 1);
}

function levelGuildHouse(bp) {
  bp.box(-5, 0, -4, 5, 0, 4, 'ladder-sandstone');
  bp.box(-1, 0, -6, 1, 0, -5, 'ladder-sandstone');
  bp.box(-1, 0, 5, 1, 0, 6, 'ladder-sandstone');
  bp.walls(-5, 1, -4, 5, 5, 4, 'ladder-pine');
  bp.box(-5, 6, -4, 5, 6, 4, 'ladder-brick-red');
  bp.door(0, 1, -4, 'ladder-brick-white', 0, -1);
  bp.door(0, 1, 4, 'ladder-brick-white', 0, 1);
  bp.box(-5, 1, 0, 5, 3, 0, 'ladder-stone');
  bp.door(-3, 1, 0, 'ladder-brick-white', 0, 1);
  bp.door(3, 1, 0, 'ladder-brick-white', 0, 1);
  bp.door(0, 1, 0, 'ladder-brick-white', 0, 1);
}

function levelFourCourts(bp) {
  bp.box(-6, 0, -3, 6, 0, 3, 'ladder-granite');
  bp.box(-4, 0, -5, -2, 0, -4, 'ladder-granite');
  bp.box(2, 0, -5, 4, 0, -4, 'ladder-granite');
  bp.box(-4, 0, 4, -2, 0, 5, 'ladder-granite');
  bp.box(2, 0, 4, 4, 0, 5, 'ladder-granite');
  bp.walls(-6, 1, -3, 6, 5, 3, 'ladder-brick-red');
  bp.box(-6, 6, -3, 6, 6, 3, 'ladder-pine');
  bp.box(0, 1, -3, 0, 4, 3, 'ladder-oak');
  bp.door(-3, 1, -3, 'ladder-brick-white', 0, -1);
  bp.door(3, 1, -3, 'ladder-brick-white', 0, -1);
  bp.door(-3, 1, 3, 'ladder-brick-white', 0, 1);
  bp.door(3, 1, 3, 'ladder-brick-white', 0, 1);
  bp.door(0, 1, -1, 'ladder-brick-white', 1, 0);
  bp.door(0, 1, 2, 'ladder-brick-white', 1, 0);
}

function bridgeTower(bp, x0, x1, z0, z1, height, materialId) {
  bp.box(x0, 0, z0, x1, 0, z1, materialId);
  bp.walls(x0, 1, z0, x1, height - 1, z1, 'ladder-brick-red');
  bp.box(x0, height, z0, x1, height, z1, 'ladder-pine');
}

function levelIronCrossing(bp) {
  bridgeTower(bp, -8, -4, -3, 3, 7, 'ladder-granite');
  bridgeTower(bp, 4, 8, -3, 3, 7, 'ladder-granite');
  for (let x = -3; x <= 3; x++) {
    for (let z = -1; z <= 1; z++) bp.bridge(x, 7, z, 'ladder-brick-red', 'metal');
  }
  bp.post(-6, 0, 8, 12, 'ladder-brick-white');
  bp.post(6, 0, 8, 12, 'ladder-brick-white');
}

function levelCrystalViaduct(bp) {
  bridgeTower(bp, -3, 3, -9, -5, 6, 'ladder-brick-yellow');
  bridgeTower(bp, -3, 3, 5, 9, 6, 'ladder-brick-yellow');
  for (let z = -4; z <= 4; z++) {
    for (let x = -1; x <= 1; x++) bp.bridge(x, 6, z, 'ladder-oak', 'glass');
  }
  bp.post(-3, -7, 7, 10, 'ladder-oak');
  bp.post(3, -7, 7, 10, 'ladder-oak');
  bp.post(-3, 7, 7, 10, 'ladder-oak');
  bp.post(3, 7, 7, 10, 'ladder-oak');
}

function levelRoyalExchange(bp) {
  bp.box(-8, 0, -6, 8, 0, 6, 'ladder-granite');
  bp.box(-5, 0, -8, 5, 0, -7, 'ladder-granite');
  bp.box(-5, 0, 7, 5, 0, 8, 'ladder-granite');
  bp.walls(-8, 1, -6, 8, 7, 6, 'ladder-brick-red');
  bp.box(-8, 8, -6, 8, 8, 6, 'ladder-pine');
  bp.box(0, 1, -6, 0, 6, 6, 'ladder-sandstone');
  bp.door(-3, 1, -6, 'ladder-brick-white', 0, -1);
  bp.door(3, 1, -6, 'ladder-brick-white', 0, -1);
  bp.door(-3, 1, 6, 'ladder-brick-white', 0, 1);
  bp.door(3, 1, 6, 'ladder-brick-white', 0, 1);
  bp.door(0, 1, -2, 'ladder-brick-white', 1, 0);
  bp.door(0, 1, 3, 'ladder-brick-white', 1, 0);
  panoramaX(bp, -6, 6, 3, 6, -6, 'ladder-oak', -1);
  panoramaX(bp, -6, 6, 3, 6, 6, 'ladder-oak', 1);
  panoramaZ(bp, -4, 4, 3, 6, -8, 'ladder-oak', -1);
  panoramaZ(bp, -4, 4, 3, 6, 8, 'ladder-oak', 1);
  for (let x = -3; x <= 3; x++) bp.bridge(x, 8, 0, 'ladder-oak', 'glass');
  bp.walls(-5, 9, -4, 5, 12, 4, 'ladder-sandstone');
  bp.box(-5, 13, -4, 5, 13, 4, 'ladder-stone');
  bp.post(-6, -4, 9, 13, 'ladder-brick-white');
  bp.post(6, -4, 9, 13, 'ladder-brick-white');
  bp.post(-6, 4, 9, 13, 'ladder-brick-white');
  bp.post(6, 4, 9, 13, 'ladder-brick-white');
}

function levelSkyPalace(bp) {
  bp.box(-10, 0, -7, 10, 0, 7, 'ladder-sandstone');
  bp.box(-6, 0, -9, 6, 0, -8, 'ladder-sandstone');
  bp.box(-6, 0, 8, 6, 0, 9, 'ladder-sandstone');
  bp.walls(-10, 1, -7, 10, 8, 7, 'ladder-brick-yellow');
  bp.box(-10, 9, -7, 10, 9, 7, 'ladder-brick-red');
  bp.box(-6, 1, 0, 6, 6, 0, 'ladder-pine');
  bp.box(0, 1, -5, 0, 6, 5, 'ladder-pine');
  bp.door(-4, 1, -7, 'ladder-brick-white', 0, -1);
  bp.door(4, 1, -7, 'ladder-brick-white', 0, -1);
  bp.door(-4, 1, 7, 'ladder-brick-white', 0, 1);
  bp.door(4, 1, 7, 'ladder-brick-white', 0, 1);
  bp.door(-3, 1, 0, 'ladder-brick-white', 0, 1);
  bp.door(4, 1, 0, 'ladder-brick-white', 0, 1);
  bp.door(0, 1, -3, 'ladder-brick-white', 1, 0);
  bp.door(0, 1, 4, 'ladder-brick-white', 1, 0);
  panoramaX(bp, -8, 8, 3, 7, -7, 'ladder-oak', -1);
  panoramaX(bp, -8, 8, 3, 7, 7, 'ladder-oak', 1);
  panoramaZ(bp, -5, 5, 3, 7, -10, 'ladder-oak', -1);
  panoramaZ(bp, -5, 5, 3, 7, 10, 'ladder-oak', 1);
  for (let x = -5; x <= 5; x++) bp.bridge(x, 9, 0, 'ladder-brick-red', 'metal');
  for (let z = -4; z <= 4; z++) bp.bridge(0, 9, z, 'ladder-oak', 'glass');
  bp.lantern(10, [5, 4, 3, 2, 1], 'ladder-stone', 'ladder-brick-white');
  bp.post(-8, -5, 10, 15, 'ladder-brick-white');
  bp.post(8, -5, 10, 15, 'ladder-brick-white');
  bp.post(-8, 5, 10, 15, 'ladder-brick-white');
  bp.post(8, 5, 10, 15, 'ladder-brick-white');
}

function architecturalHall(bp, x0, z0, x1, z1, y0, y1, floorId, wallId, roofId) {
  bp.box(x0, y0, z0, x1, y0, z1, floorId);
  bp.walls(x0, y0 + 1, z0, x1, y1 - 1, z1, wallId);
  bp.box(x0, y1, z0, x1, y1, z1, roofId);
}

function bridgeStripX(bp, x0, x1, y, z0, z1, materialId, style) {
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) bp.bridge(x, y, z, materialId, style);
  }
}

function bridgeStripZ(bp, z0, z1, y, x0, x1, materialId, style) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) bp.bridge(x, y, z, materialId, style);
  }
}

function levelCascadeForum(bp) {
  architecturalHall(bp, -18, -5, -4, 7, 0, 6, 'ladder-granite', 'ladder-brick-red', 'ladder-pine');
  architecturalHall(bp, 5, -8, 17, 2, 0, 8, 'ladder-sandstone', 'ladder-brick-yellow', 'ladder-oak');
  architecturalHall(bp, -2, 7, 6, 15, 0, 14, 'ladder-pine', 'ladder-brick-red', 'ladder-brick-white');
  architecturalHall(bp, -8, -16, 10, -10, 0, 4, 'ladder-brick-red', 'ladder-sandstone', 'ladder-stone');

  architecturalHall(bp, -15, -2, -7, 4, 7, 11, 'ladder-pine', 'ladder-oak', 'ladder-brick-white');
  architecturalHall(bp, 8, -5, 14, 0, 9, 13, 'ladder-oak', 'ladder-brick-red', 'ladder-sandstone');
  architecturalHall(bp, 0, 9, 4, 13, 15, 20, 'ladder-brick-white', 'ladder-brick-yellow', 'ladder-stone');

  bridgeStripX(bp, -3, 4, 6, -1, 1, 'ladder-brick-red', 'metal');
  bridgeStripZ(bp, 3, 6, 8, 3, 5, 'ladder-oak', 'glass');
  bridgeStripZ(bp, -9, -6, 4, -6, -4, 'ladder-pine', 'stone');
  bridgeStripX(bp, -6, 0, 11, 3, 4, 'ladder-oak', 'glass');
  bridgeStripZ(bp, 5, 6, 11, -1, 0, 'ladder-oak', 'glass');

  bp.box(-20, 0, -2, -19, 0, 2, 'ladder-granite');
  bp.door(-18, 1, 0, 'ladder-brick-white', -1, 0);
  bp.box(18, 0, -5, 19, 0, -1, 'ladder-sandstone');
  bp.door(17, 1, -3, 'ladder-brick-white', 1, 0);
  bp.box(-1, 0, 16, 3, 0, 17, 'ladder-pine');
  bp.door(1, 1, 15, 'ladder-brick-white', 0, 1);
  bp.box(-3, 0, -18, 3, 0, -17, 'ladder-brick-red');
  bp.door(0, 1, -16, 'ladder-brick-white', 0, -1);

  panoramaZ(bp, -3, 5, 2, 4, -18, 'ladder-oak', -1);
  panoramaX(bp, -15, -7, 2, 4, 7, 'ladder-oak', 1);
  panoramaZ(bp, -6, 0, 2, 6, 17, 'ladder-oak', 1);
  panoramaX(bp, 7, 15, 3, 6, 2, 'ladder-oak', 1);
  panoramaX(bp, 0, 4, 3, 11, 15, 'ladder-brick-yellow', 1);
  panoramaZ(bp, 9, 13, 5, 11, 6, 'ladder-brick-yellow', 1);
  panoramaX(bp, -5, 6, 2, 3, -16, 'ladder-oak', -1);

  for (let i = 0; i < 3; i++) {
    bp.box(-16 + i, 12 + i, -1, -7 + i, 12 + i, 3, i % 2 === 0 ? 'ladder-sandstone' : 'ladder-stone');
  }
  bp.post(-17, -4, 7, 13, 'ladder-brick-white');
  bp.post(16, 1, 9, 16, 'ladder-brick-white');
  bp.post(-1, 14, 15, 23, 'ladder-oak');
}

function levelPrismaticAcademy(bp) {
  architecturalHall(bp, -14, -6, 8, 5, 0, 6, 'ladder-granite', 'ladder-brick-yellow', 'ladder-pine');
  architecturalHall(bp, -7, 6, 8, 12, 0, 6, 'ladder-sandstone', 'ladder-brick-red', 'ladder-oak');
  architecturalHall(bp, 10, -10, 17, -1, 0, 8, 'ladder-pine', 'ladder-oak', 'ladder-brick-white');
  architecturalHall(bp, -18, -12, -11, -4, 0, 7, 'ladder-brick-red', 'ladder-sandstone', 'ladder-stone');

  architecturalHall(bp, -10, -3, 1, 3, 7, 11, 'ladder-pine', 'ladder-oak', 'ladder-brick-white');
  architecturalHall(bp, -4, 8, 5, 12, 7, 11, 'ladder-oak', 'ladder-brick-yellow', 'ladder-stone');
  architecturalHall(bp, 12, -8, 16, -2, 9, 15, 'ladder-brick-white', 'ladder-brick-red', 'ladder-sandstone');
  architecturalHall(bp, -17, -10, -12, -5, 8, 13, 'ladder-stone', 'ladder-brick-yellow', 'ladder-oak');

  bridgeStripZ(bp, 2, 5, 6, 4, 6, 'ladder-brick-red', 'metal');
  bridgeStripX(bp, 2, 11, 11, -2, 0, 'ladder-oak', 'glass');
  bridgeStripX(bp, -11, -9, 9, -9, -7, 'ladder-pine', 'stone');
  bridgeStripZ(bp, -6, -4, 9, -10, -9, 'ladder-pine', 'stone');
  bridgeStripZ(bp, 4, 7, 11, -2, 0, 'ladder-oak', 'glass');
  bridgeStripX(bp, 6, 11, 11, 9, 10, 'ladder-brick-red', 'metal');
  bridgeStripZ(bp, -2, 8, 11, 10, 11, 'ladder-brick-red', 'metal');

  bp.box(-16, 0, -1, -15, 0, 3, 'ladder-granite');
  bp.door(-14, 1, 1, 'ladder-brick-white', -1, 0);
  bp.box(12, 0, 0, 16, 0, 1, 'ladder-pine');
  bp.door(14, 1, -1, 'ladder-brick-white', 0, 1);
  bp.box(-17, 0, -14, -13, 0, -13, 'ladder-brick-red');
  bp.door(-15, 1, -12, 'ladder-brick-white', 0, -1);
  bp.box(-2, 0, 13, 4, 0, 14, 'ladder-sandstone');
  bp.door(1, 1, 12, 'ladder-brick-white', 0, 1);

  panoramaZ(bp, 2, 4, 2, 5, 8, 'ladder-oak', 1);
  panoramaX(bp, -9, 5, 2, 5, -6, 'ladder-oak', -1);
  panoramaX(bp, -5, 6, 2, 5, 12, 'ladder-brick-yellow', 1);
  panoramaZ(bp, -8, -2, 2, 7, 17, 'ladder-brick-yellow', 1);
  panoramaX(bp, 11, 16, 3, 7, -10, 'ladder-oak', -1);
  panoramaZ(bp, -10, -5, 2, 6, -18, 'ladder-oak', -1);
  panoramaX(bp, -17, -12, 3, 6, -12, 'ladder-brick-yellow', -1);

  for (let i = 0; i < 2; i++) {
    bp.box(-12 + i, 12 + i, -4 + i, -12 + i, 12 + i, 4 + i, i % 2 === 0 ? 'ladder-stone' : 'ladder-oak');
  }
  for (let i = 0; i < 6; i++) {
    bp.box(-18 + i, 14 + i, -11 + i, -10 + i, 14 + i, -11 + i, i % 2 === 0 ? 'ladder-brick-white' : 'ladder-pine');
  }
  bp.post(16, -9, 9, 19, 'ladder-brick-white');
  bp.post(-12, 11, 7, 15, 'ladder-brick-white');
}

function patternedWindowsX(bp, x0, x1, y, z, materialId, faceZ, styles) {
  for (let x = x0; x <= x1; x += 2) {
    shapedWindow(bp, x, y, z, materialId, 0, faceZ, styles[Math.abs(x - x0) % styles.length]);
  }
}

function patternedWindowsZ(bp, z0, z1, y, x, materialId, faceX, styles) {
  for (let z = z0; z <= z1; z += 2) {
    shapedWindow(bp, x, y, z, materialId, faceX, 0, styles[Math.abs(z - z0) % styles.length]);
  }
}

function ellipseLayer(bp, cx, cz, y, rx, rz, thickness, materialId) {
  const innerX = rx - thickness;
  const innerZ = rz - thickness;
  for (let z = -rz; z <= rz; z++) {
    for (let x = -rx; x <= rx; x++) {
      const outer = x * x / (rx * rx) + z * z / (rz * rz);
      const inner = x * x / (innerX * innerX) + z * z / (innerZ * innerZ);
      if (outer <= 1 && inner >= 1) bp.put(cx + x, y, cz + z, materialId);
    }
  }
}

function taperTower(bp, cx, cz, y0, height, radius, materialId, capId) {
  for (let y = 0; y < height; y++) {
    const r = Math.max(1, radius - Math.floor(y * radius / height));
    for (let z = -r; z <= r; z++) {
      for (let x = -r; x <= r; x++) {
        const distance = x * x + z * z;
        if (distance <= r * r && distance >= (r - 1) * (r - 1)) bp.put(cx + x, y0 + y, cz + z, materialId);
      }
    }
  }
  bp.post(cx, cz, y0 + height, y0 + height + 3, capId);
}

function levelCelestialGallery(bp) {
  architecturalHall(bp, -11, -6, 3, 6, 0, 7, 'ladder-granite', 'ladder-brick-yellow', 'ladder-oak');
  architecturalHall(bp, 4, -2, 13, 10, 0, 5, 'ladder-sandstone', 'ladder-brick-red', 'ladder-pine');
  architecturalHall(bp, -6, 7, 1, 13, 0, 9, 'ladder-pine', 'ladder-oak', 'ladder-brick-white');
  bridgeStripX(bp, 2, 3, 5, 7, 9, 'ladder-oak', 'glass');
  bridgeStripZ(bp, 4, 6, 7, -3, -1, 'ladder-brick-red', 'metal');
  bp.box(-13, 0, -2, -12, 0, 2, 'ladder-granite');
  bp.door(-11, 1, 0, 'ladder-brick-white', -1, 0);
  bp.box(8, 0, 11, 12, 0, 12, 'ladder-sandstone');
  bp.door(10, 1, 10, 'ladder-brick-white', 0, 1);
  windowMosaicX(bp, -7, 4, -6, 'ladder-oak', -1, 'round', 2);
  windowMosaicX(bp, 0, 4, -6, 'ladder-oak', -1, 'triangle', 2);
  windowMosaicZ(bp, 0, 4, -11, 'ladder-oak', -1, 'arch', 2);
  windowMosaicZ(bp, 4, 3, 13, 'ladder-brick-yellow', 1, 'diamond', 1);
  windowMosaicX(bp, -2, 5, 13, 'ladder-oak', 1, 'rose', 2);
}

function levelHouseOfFacets(bp) {
  architecturalHall(bp, -13, -4, -2, 7, 0, 6, 'ladder-brick-red', 'ladder-sandstone', 'ladder-pine');
  architecturalHall(bp, -1, -8, 10, 3, 0, 8, 'ladder-granite', 'ladder-brick-yellow', 'ladder-oak');
  architecturalHall(bp, 6, 4, 12, 10, 0, 4, 'ladder-sandstone', 'ladder-brick-red', 'ladder-brick-white');
  architecturalHall(bp, -6, 8, 0, 12, 0, 3, 'ladder-pine', 'ladder-oak', 'ladder-stone');
  bridgeStripX(bp, -1, 4, 6, 0, 2, 'ladder-brick-red', 'metal');
  bridgeStripZ(bp, 4, 7, 5, 7, 9, 'ladder-oak', 'glass');
  bp.box(-15, 0, 0, -14, 0, 4, 'ladder-brick-red');
  bp.door(-13, 1, 2, 'ladder-brick-white', -1, 0);
  bp.box(11, 0, -5, 12, 0, -1, 'ladder-granite');
  bp.door(10, 1, -3, 'ladder-brick-white', 1, 0);
  windowMosaicZ(bp, 1, 3, -13, 'ladder-oak', -1, 'triangle', 2);
  windowMosaicZ(bp, -3, 4, 10, 'ladder-oak', 1, 'round', 2);
  windowMosaicX(bp, 9, 2, 10, 'ladder-brick-yellow', 1, 'diamond', 1);
  windowMosaicX(bp, -3, 2, 12, 'ladder-oak', 1, 'arch', 1);
  for (let i = 0; i < 8; i++) bp.box(-11 + i, 7 + i, 5 - i, -4 + i, 7 + i, 5 - i, i % 2 === 0 ? 'ladder-stone' : 'ladder-brick-white');
}

function levelEiffelTower(bp) {
  bp.box(-11, 0, -11, 11, 0, 11, 'ladder-granite');
  for (let y = 1; y <= 25; y++) {
    const spread = Math.max(2, 9 - Math.floor(y * 7 / 25));
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        const x = sx * spread;
        const z = sz * spread;
        bp.box(x - 1, y, z - 1, x + 1, y, z + 1, 'ladder-brick-red');
      }
    }
    if (y % 3 === 0) {
      bp.box(-spread, y, -spread, spread, y, -spread, 'ladder-pine');
      bp.box(-spread, y, spread, spread, y, spread, 'ladder-pine');
      bp.box(-spread, y, -spread, -spread, y, spread, 'ladder-pine');
      bp.box(spread, y, -spread, spread, y, spread, 'ladder-pine');
    }
  }
  bp.box(-9, 7, -9, 9, 7, 9, 'ladder-pine');
  bp.box(-5, 15, -5, 5, 15, 5, 'ladder-oak');
  bp.box(-3, 25, -3, 3, 25, 3, 'ladder-brick-white');
  taperTower(bp, 0, 0, 26, 8, 2, 'ladder-brick-red', 'ladder-brick-white');
  bp.post(0, 0, 34, 40, 'ladder-brick-white');
  bridgeStripX(bp, -8, 8, 7, -1, 1, 'ladder-brick-red', 'metal');
}

function levelMsu(bp) {
  architecturalHall(bp, -20, -3, 20, 3, 0, 4, 'ladder-granite', 'ladder-brick-red', 'ladder-pine');
  architecturalHall(bp, -10, -6, 10, 6, 0, 9, 'ladder-sandstone', 'ladder-brick-yellow', 'ladder-oak');
  architecturalHall(bp, -7, -5, 7, 5, 10, 15, 'ladder-pine', 'ladder-brick-red', 'ladder-brick-white');
  architecturalHall(bp, -4, -3, 4, 3, 16, 21, 'ladder-oak', 'ladder-brick-yellow', 'ladder-stone');
  architecturalHall(bp, -2, -2, 2, 2, 22, 26, 'ladder-brick-white', 'ladder-brick-red', 'ladder-oak');
  bp.box(-22, 0, -2, -21, 0, 2, 'ladder-granite');
  bp.door(-20, 1, 0, 'ladder-brick-white', -1, 0);
  patternedWindowsX(bp, -18, -12, 2, -3, 'ladder-oak', -1, ['slit', 'arch']);
  patternedWindowsX(bp, 12, 18, 2, -3, 'ladder-oak', -1, ['arch', 'slit']);
  patternedWindowsX(bp, -8, 8, 4, -6, 'ladder-oak', -1, ['arch', 'round']);
  patternedWindowsX(bp, -6, 6, 12, -5, 'ladder-oak', -1, ['slit', 'diamond']);
  windowMosaicX(bp, 0, 19, -3, 'ladder-brick-white', -1, 'rose', 2);
  bp.post(0, 0, 27, 39, 'ladder-brick-white');
  bp.put(-1, 36, 0, 'ladder-brick-white');
  bp.put(1, 36, 0, 'ladder-brick-white');
}

function levelColosseum(bp) {
  for (let y = 0; y <= 10; y++) {
    const broken = y > 7;
    const materialId = y < 3 ? 'ladder-granite' : y < 7 ? 'ladder-brick-red' : 'ladder-pine';
    ellipseLayer(bp, 0, 0, y, 19, 13, 2, materialId);
    if (broken) {
      for (let z = 3; z <= 13; z++) {
        for (let x = 8; x <= 19; x++) bp.cut(x, y, z);
      }
    }
  }
  for (let y = 2; y <= 8; y += 3) {
    for (let z = -9; z <= 9; z += 3) {
      const edgeX = Math.round(19 * Math.sqrt(1 - z * z / 169));
      shapedWindow(bp, -edgeX, y, z, 'ladder-oak', -1, 0, y === 8 ? 'round' : 'arch');
      shapedWindow(bp, edgeX, y, z, 'ladder-oak', 1, 0, y === 8 ? 'round' : 'arch');
    }
    for (let x = -12; x <= 12; x += 3) {
      const edgeZ = Math.round(13 * Math.sqrt(1 - x * x / 361));
      shapedWindow(bp, x, y, -edgeZ, 'ladder-oak', 0, -1, y === 8 ? 'round' : 'arch');
    }
  }
  bp.box(-2, 0, -16, 2, 0, -14, 'ladder-granite');
  bp.door(0, 1, -13, 'ladder-brick-white', 0, -1);
  bp.cut(0, 1, -12);
}

function levelSagrada(bp) {
  architecturalHall(bp, -6, -13, 6, 10, 0, 8, 'ladder-granite', 'ladder-brick-red', 'ladder-pine');
  architecturalHall(bp, -11, -3, 11, 4, 0, 7, 'ladder-sandstone', 'ladder-brick-yellow', 'ladder-oak');
  const towers = [
    [-8, -11, 21], [8, -11, 23], [-9, 3, 25], [9, 3, 27],
    [-5, 8, 29], [5, 8, 31], [-3, -4, 33], [3, -4, 35],
  ];
  for (let i = 0; i < towers.length; i++) {
    taperTower(bp, towers[i][0], towers[i][1], 0, towers[i][2], 2, i % 2 === 0 ? 'ladder-sandstone' : 'ladder-pine', 'ladder-brick-white');
  }
  bp.box(-3, 0, -16, 3, 0, -14, 'ladder-granite');
  bp.door(0, 1, -13, 'ladder-brick-white', 0, -1);
  windowMosaicX(bp, 0, 5, -13, 'ladder-brick-white', -1, 'rose', 2);
  windowMosaicX(bp, -5, 3, -13, 'ladder-oak', -1, 'arch', 1);
  windowMosaicX(bp, 5, 3, -13, 'ladder-oak', -1, 'arch', 1);
  for (let inset = 0; inset < 6; inset++) {
    bp.box(-6 + inset, 9 + inset, -12 + inset, 6 - inset, 9 + inset, -11 + inset, inset % 2 === 0 ? 'ladder-stone' : 'ladder-brick-white');
  }
}

const PLAN_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function enclosedInPlan(inside, x, z) {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!inside(x + dx, z + dz)) return false;
    }
  }
  return true;
}

function shapeLayer(x0, x1, z0, z1, inside, hollow, visit) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      if (!inside(x, z)) continue;
      if (hollow && enclosedInPlan(inside, x, z)) continue;
      visit(x, z);
    }
  }
}

function solidLayer(bp, y, x0, x1, z0, z1, inside, hollow, materialId) {
  shapeLayer(x0, x1, z0, z1, inside, hollow, function (x, z) {
    bp.put(x, y, z, materialId);
  });
}

function deckLayer(bp, y, x0, x1, z0, z1, inside, materialId, style) {
  shapeLayer(x0, x1, z0, z1, inside, false, function (x, z) {
    bp.bridge(x, y, z, materialId, style);
  });
}

function disk(cx, cz, radius) {
  return function (x, z) {
    return (x - cx) * (x - cx) + (z - cz) * (z - cz) <= radius * radius;
  };
}

function annulus(cx, cz, inner, outer) {
  return function (x, z) {
    const distance = Math.hypot(x - cx, z - cz);
    return distance >= inner && distance <= outer;
  };
}

function ringSector(cx, cz, inner, outer, gapFrom, gapTo) {
  const ring = annulus(cx, cz, inner, outer);
  return function (x, z) {
    if (!ring(x, z)) return false;
    const angle = Math.atan2(z - cz, x - cx);
    return angle <= gapFrom || angle >= gapTo;
  };
}

function superEllipse(cx, cz, rx, rz, power) {
  return function (x, z) {
    return Math.pow(Math.abs(x - cx) / rx, power) + Math.pow(Math.abs(z - cz) / rz, power) <= 1;
  };
}

function squircle(cx, cz, half, angle, power) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return function (x, z) {
    const dx = x - cx;
    const dz = z - cz;
    const u = (dx * c + dz * s) / half;
    const v = (dz * c - dx * s) / half;
    return Math.pow(Math.abs(u), power) + Math.pow(Math.abs(v), power) <= 1;
  };
}

function exposedInSpace(inside, x, y, z) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 2) continue;
        if (!inside(x + dx, y + dy, z + dz)) return true;
      }
    }
  }
  return false;
}

function implicitShell(bp, x0, x1, y0, y1, z0, z1, inside, materialId) {
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (inside(x, y, z) && exposedInSpace(inside, x, y, z)) bp.put(x, y, z, materialId);
      }
    }
  }
}

function sail(spec, base) {
  return function (x, y, z) {
    const depth = (z - spec.mouthZ) * spec.dir;
    if (depth < 0) return false;
    const rise = Math.max(y, base) - base;
    return Math.pow(Math.abs(x - spec.cx) / spec.half, 1.5) +
      Math.pow(rise / spec.height, 1.4) +
      Math.pow(depth / spec.length, 2) <= 1;
  };
}

function unionShapes(shapes) {
  return function (x, y, z) {
    for (let i = 0; i < shapes.length; i++) {
      if (shapes[i](x, y, z)) return true;
    }
    return false;
  };
}

function clearAhead(bp, cell, dx, dz) {
  for (let step = 1; step <= 5; step++) {
    if (bp.has(cell.x + dx * step, cell.y, cell.z + dz * step)) return false;
  }
  return true;
}

function glaze(bp, materialId, accept) {
  const picks = [];
  for (const cell of bp.cells.values()) {
    if (cell.feature) continue;
    for (let i = 0; i < PLAN_DIRS.length; i++) {
      const dx = PLAN_DIRS[i][0];
      const dz = PLAN_DIRS[i][1];
      if (!accept(cell, dx, dz)) continue;
      if (!clearAhead(bp, cell, dx, dz)) continue;
      if (!bp.has(cell.x - dz, cell.y, cell.z + dx) || !bp.has(cell.x + dz, cell.y, cell.z - dx)) continue;
      if (!bp.has(cell.x, cell.y + 1, cell.z) || !bp.has(cell.x, cell.y - 1, cell.z)) continue;
      picks.push([cell.x, cell.y, cell.z, dx, dz]);
      break;
    }
  }
  for (let i = 0; i < picks.length; i++) {
    const pick = picks[i];
    bp.window(pick[0], pick[1], pick[2], materialId, pick[3], pick[4], 'panorama');
  }
}

function catenaryArch(bp, cx, z0, z1, y0, half, rise, thickness, materialId) {
  const curve = 1.4;
  const norm = Math.cosh(curve) - 1;
  function crown(x) {
    return y0 + Math.round(rise * (Math.cosh(curve) - Math.cosh(curve * (x - cx) / half)) / norm);
  }
  for (let x = cx - half; x <= cx + half; x++) {
    const top = crown(x);
    const left = x > cx - half ? crown(x - 1) : y0;
    const right = x < cx + half ? crown(x + 1) : y0;
    const bottom = Math.max(y0, Math.min(top - thickness + 1, left, right));
    for (let y = bottom; y <= top; y++) {
      for (let z = z0; z <= z1; z++) bp.put(x, y, z, materialId);
    }
  }
}

function balcony(bp, cx, cz, y, dirX, dirZ, halfWidth, depth, reach, materialId, style) {
  for (let side = -halfWidth; side <= halfWidth; side++) {
    const baseX = cx - dirZ * side;
    const baseZ = cz + dirX * side;
    for (let step = reach; step >= 0; step--) {
      const x = baseX + dirX * step;
      const z = baseZ + dirZ * step;
      if (!bp.has(x, y, z)) continue;
      for (let out = 1; out <= depth; out++) bp.bridge(x + dirX * out, y, z + dirZ * out, materialId, style);
      break;
    }
  }
}

function helixCampanile(bp, cx, cz, y0, y1, coreId, rampId, capId) {
  const core = disk(cx, cz, 1.6);
  for (let y = y0; y <= y1; y++) solidLayer(bp, y, cx - 2, cx + 2, cz - 2, cz + 2, core, y < y1, coreId);
  const sweep = Math.PI / 4;
  for (let y = y0; y < y1; y++) {
    const from = (y - y0) * sweep;
    const ramp = function (x, z) {
      const distance = Math.hypot(x - cx, z - cz);
      if (distance < 2 || distance > 3.6) return false;
      const turn = ((Math.atan2(z - cz, x - cx) - from) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return turn < sweep * 1.5;
    };
    solidLayer(bp, y, cx - 4, cx + 4, cz - 4, cz + 4, ramp, false, rampId);
  }
  bp.post(cx, cz, y1 + 1, y1 + 6, capId);
}

function levelSilkSpindle(bp) {
  const top = 34;
  const bands = new Set([6, 12, 18, 24, 30, top]);
  for (let y = 0; y <= top; y++) {
    const band = bands.has(y);
    const half = 4.6 - 2 * y / top + (band ? 0.7 : 0);
    const twist = Math.PI / 2 * y / top;
    solidLayer(bp, y, -7, 7, -7, 7, squircle(0, 0, half, twist, 4), !band, band ? 'ladder-pine' : 'ladder-oak');
  }

  const podium = ringSector(0, 0, 7.5, 11.4, -Math.PI * 5 / 6, -Math.PI / 6);
  solidLayer(bp, 0, -12, 12, -12, 12, podium, false, 'ladder-granite');
  for (let y = 1; y <= 3; y++) solidLayer(bp, y, -12, 12, -12, 12, podium, true, 'ladder-stone');
  solidLayer(bp, 4, -12, 12, -12, 12, podium, false, 'ladder-pine');
  shapeLayer(-12, 12, -12, 12, ringSector(0, 0, 8.6, 10.3, -Math.PI * 5 / 6, -Math.PI / 6), false, function (x, z) {
    bp.paint(x, 4, z, 'ladder-concrete');
  });

  for (let i = 0; i < PLAN_DIRS.length; i++) {
    for (let step = 0; step <= 8; step++) {
      const x = PLAN_DIRS[i][0] * step;
      const z = PLAN_DIRS[i][1] * step;
      if (!bp.has(x, 24, z)) bp.bridge(x, 24, z, 'ladder-brick-red', 'metal');
    }
  }
  deckLayer(bp, 24, -10, 10, -10, 10, annulus(0, 0, 7.9, 9.3), 'ladder-oak', 'glass');

  const spiral = [0, 2, 1, 3];
  for (let k = 0; k < 11; k++) {
    const dir = PLAN_DIRS[spiral[k % 4]];
    balcony(bp, 0, 0, 2 + 3 * k, dir[0], dir[1], 1, 2, 6, 'ladder-oak', 'glass');
  }

  const lensRadii = [2.3, 3.3, 4.3, 4.3, 3.3, 2.3];
  for (let i = 0; i < lensRadii.length; i++) {
    solidLayer(bp, 2 + i, 14, 24, -2, 8, disk(19, 3, lensRadii[i]), i > 0 && i < lensRadii.length - 1, 'ladder-oak');
  }
  shapeLayer(14, 24, -2, 8, disk(19, 3, 4.3), true, function (x, z) {
    bp.paint(x, 4, z, 'ladder-brick-white');
  });
  bp.post(18, 2, 0, 1, 'ladder-brick-white');
  bp.post(20, 2, 0, 1, 'ladder-brick-white');
  bp.post(18, 4, 0, 1, 'ladder-brick-white');
  bp.post(20, 4, 0, 1, 'ladder-brick-white');
  for (let x = 9; x <= 15; x++) {
    for (let z = 2; z <= 4; z++) {
      if (!bp.has(x, 4, z)) bp.bridge(x, 4, z, 'ladder-oak', 'glass');
    }
  }

  catenaryArch(bp, 0, -15, -14, 0, 6, 14, 2, 'ladder-sandstone');
  catenaryArch(bp, 0, -20, -19, 0, 5, 11, 2, 'ladder-sandstone');
  catenaryArch(bp, 0, -25, -24, 0, 4, 8, 2, 'ladder-sandstone');
  bp.box(-1, 0, -27, 1, 0, -6, 'ladder-granite');

  bp.post(0, 0, top + 1, top + 7, 'ladder-brick-white');
  bp.post(2, 2, top + 1, top + 3, 'ladder-oak');
  bp.post(-2, 2, top + 1, top + 3, 'ladder-oak');
  bp.post(2, -2, top + 1, top + 3, 'ladder-oak');
  bp.post(-2, -2, top + 1, top + 3, 'ladder-oak');

  glaze(bp, 'ladder-brick-yellow', function (cell, dx, dz) {
    return Math.hypot(cell.x, cell.z) <= 6.5 &&
      cell.y > 0 &&
      cell.y < top &&
      !bands.has(cell.y) &&
      cell.x * dx + cell.z * dz > 0;
  });
  glaze(bp, 'ladder-brick-yellow', function (cell, dx, dz) {
    return cell.y >= 1 && cell.y <= 3 && Math.hypot(cell.x, cell.z) >= 10 && cell.x * dx + cell.z * dz > 0;
  });

  bp.box(12, 0, -1, 13, 0, 1, 'ladder-granite');
  bp.box(-13, 0, -1, -12, 0, 1, 'ladder-granite');
  bp.box(-1, 0, 12, 1, 0, 13, 'ladder-granite');
  bp.door(11, 1, 0, 'ladder-brick-white', 1, 0);
  bp.door(-11, 1, 0, 'ladder-brick-white', -1, 0);
  bp.door(0, 1, 11, 'ladder-brick-white', 0, 1);
}

function levelShellOpera(bp) {
  solidLayer(bp, 0, -17, 17, -16, 14, superEllipse(0, -1, 16.4, 14.4, 4), false, 'ladder-pine');
  bp.band(-15, -13, 0, -8, 6, 'ladder-brick-yellow');
  bp.band(14, 15, 0, -4, 6, 'ladder-brick-yellow');
  bp.band(-1, 1, 0, -14, -6, 'ladder-brick-yellow');

  const shells = [
    { cx: -6, mouthZ: -9, dir: 1, half: 4.5, height: 8, length: 7, door: true },
    { cx: -6, mouthZ: -5, dir: 1, half: 5.5, height: 13, length: 9, door: false },
    { cx: -6, mouthZ: 8, dir: -1, half: 4, height: 7, length: 6, door: true },
    { cx: 7, mouthZ: -6, dir: 1, half: 4, height: 7, length: 6, door: true },
    { cx: 7, mouthZ: -2, dir: 1, half: 5, height: 11, length: 8, door: false },
    { cx: 7, mouthZ: 9, dir: -1, half: 3.5, height: 6, length: 5, door: true },
    { cx: 13, mouthZ: -11, dir: 1, half: 2.5, height: 5, length: 4, door: true },
  ];
  implicitShell(bp, -13, 17, 1, 15, -13, 11, unionShapes(shells.map(function (spec) {
    return sail(spec, 1);
  })), 'ladder-oak');

  for (let i = 0; i < shells.length; i++) {
    const spec = shells[i];
    glaze(bp, 'ladder-brick-yellow', function (cell, dx, dz) {
      return cell.z === spec.mouthZ &&
        dz === -spec.dir &&
        Math.abs(cell.x - spec.cx) <= spec.half &&
        (cell.x - spec.cx) % 3 !== 0;
    });
    for (let y = 1; y <= spec.height + 1; y++) {
      for (let x = Math.ceil(spec.cx - spec.half); x <= spec.cx + spec.half; x++) {
        if ((x - spec.cx) % 3 !== 0) continue;
        const left = bp.get(x - 1, y, spec.mouthZ);
        const right = bp.get(x + 1, y, spec.mouthZ);
        if (left && right && left.feature === 'window' && right.feature === 'window') bp.paint(x, y, spec.mouthZ, 'ladder-brick-white');
      }
    }
    if (spec.door) bp.door(spec.cx, 1, spec.mouthZ, 'ladder-brick-white', 0, -spec.dir);
  }

  for (let z = -26; z <= -17; z += 3) catenaryArch(bp, -6, z, z, 0, 4, 9, 1, 'ladder-stone');
  for (let z = -26; z <= -17; z++) {
    if (!bp.has(-6, 9, z)) bp.bridge(-6, 9, z, 'ladder-oak', 'glass');
  }

  helixCampanile(bp, -14, 10, 1, 24, 'ladder-oak', 'ladder-brick-white', 'ladder-brick-white');
}

function torus(bp, cx, cy, cz, axis, radius, outer, inner, materialId) {
  const reach = Math.ceil(radius + outer);
  for (let y = cy - reach; y <= cy + reach; y++) {
    for (let z = cz - reach; z <= cz + reach; z++) {
      for (let x = cx - reach; x <= cx + reach; x++) {
        let planar = Math.hypot(y - cy, z - cz);
        let offset = x - cx;
        if (axis === 'z') {
          planar = Math.hypot(x - cx, y - cy);
          offset = z - cz;
        } else if (axis === 'y') {
          planar = Math.hypot(x - cx, z - cz);
          offset = y - cy;
        }
        const dist = Math.hypot(planar - radius, offset);
        if (dist <= outer && dist >= inner) bp.put(x, y, z, materialId);
      }
    }
  }
}

function strut(bp, x0, y0, z0, x1, y1, z1, materialId) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  let x = x0;
  let y = y0;
  let z = z0;
  bp.put(x, y, z, materialId);
  for (let i = 1; i <= steps; i++) {
    const nx = Math.round(x0 + (x1 - x0) * i / steps);
    const ny = Math.round(y0 + (y1 - y0) * i / steps);
    const nz = Math.round(z0 + (z1 - z0) * i / steps);
    const sx = nx > x ? 1 : -1;
    for (let ix = x; ix !== nx; ix += sx) bp.put(ix, y, z, materialId);
    bp.put(nx, y, z, materialId);
    const sy = ny > y ? 1 : -1;
    for (let iy = y; iy !== ny; iy += sy) bp.put(nx, iy, z, materialId);
    bp.put(nx, ny, z, materialId);
    const sz = nz > z ? 1 : -1;
    for (let iz = z; iz !== nz; iz += sz) bp.put(nx, ny, iz, materialId);
    bp.put(nx, ny, nz, materialId);
    x = nx;
    y = ny;
    z = nz;
  }
}

function bridgeRun(bp, x, z, x1, z1, y, materialId, style) {
  let px = x;
  let pz = z;
  while (px !== x1) {
    px += x1 > px ? 1 : -1;
    if (!bp.has(px, y, pz)) bp.bridge(px, y, pz, materialId, style);
  }
  while (pz !== z1) {
    pz += z1 > pz ? 1 : -1;
    if (!bp.has(px, y, pz)) bp.bridge(px, y, pz, materialId, style);
  }
}

function ringSkin(bp, faceX, faceZ, materialId, accept) {
  const picks = [];
  for (const cell of bp.cells.values()) {
    if (cell.feature || !accept(cell)) continue;
    let blocked = false;
    for (let step = 1; step <= 5; step++) {
      if (bp.has(cell.x + faceX * step, cell.y, cell.z + faceZ * step)) blocked = true;
    }
    if (blocked || bp.has(cell.x + faceX, cell.y, cell.z + faceZ)) continue;
    picks.push(cell);
  }
  for (let i = 0; i < picks.length; i++) {
    bp.window(picks[i].x, picks[i].y, picks[i].z, materialId, faceX, faceZ, 'panorama');
  }
}

function hyparUmbrella(bp, cx, cz, span, valley, rise, skin) {
  for (let u = -span; u <= span; u++) {
    for (let v = -span; v <= span; v++) {
      const y = valley + Math.round(Math.abs(u) * Math.abs(v) * rise / (span * span));
      const edge = Math.abs(u) === span || Math.abs(v) === span;
      const ruled = u % 5 === 0 || v % 5 === 0;
      bp.put(cx + u, y, cz + v, edge ? 'ladder-pine' : ruled ? 'ladder-brick-white' : skin);
      bp.put(cx + u, y - 1, cz + v, edge ? 'ladder-pine' : skin);
    }
  }
  bp.post(cx, cz, 0, valley + 1, 'ladder-brick-white');
}

function valleyWall(bp, x, z, faceX, faceZ, yTop) {
  for (let y = 1; y <= yTop; y++) bp.window(x, y, z, 'ladder-brick-yellow', faceX, faceZ, 'panorama');
}

function levelRingHall(bp) {
  torus(bp, 0, 14, 0, 'z', 12, 2.8, 1.35, 'ladder-oak');
  torus(bp, 8, 14, 0, 'y', 9, 2.5, 1.2, 'ladder-stone');
  torus(bp, 0, 8, -17, 'x', 6, 2.3, 1.15, 'ladder-sandstone');

  shapeLayer(-7, 7, -7, 7, disk(0, 0, 6.2), false, function (x, z) {
    if (!bp.has(x, 0, z)) bp.put(x, 0, z, 'ladder-granite');
  });

  const columnAngles = [-0.9, -0.45, 0, 0.45, 0.9];
  for (let i = 0; i < columnAngles.length; i++) {
    const x = Math.round(8 + 9 * Math.cos(columnAngles[i]));
    const z = Math.round(9 * Math.sin(columnAngles[i]));
    bp.box(x - 1, 0, z - 1, x + 1, 0, z + 1, 'ladder-granite');
    bp.post(x, z, 0, 12, 'ladder-brick-white');
  }

  let stairX = 0;
  let stairY = 0;
  let stairZ = 0;
  for (let y = 1; y <= 14; y++) {
    const turn = y / 14;
    const angle = -Math.PI / 2 - turn * Math.PI / 2;
    const radius = 3 + turn * 5;
    const x = Math.round(radius * Math.cos(angle));
    const z = Math.round(2.4 * Math.sin(turn * Math.PI));
    strut(bp, stairX, stairY, stairZ, x, y, z, 'ladder-brick-white');
    bp.put(x, y, z + 1, 'ladder-brick-white');
    stairX = x;
    stairY = y;
    stairZ = z;
  }
  bridgeRun(bp, stairX, stairZ, -1, 0, 14, 'ladder-oak', 'glass');
  bridgeRun(bp, stairX, stairZ + 1, -1, 1, 14, 'ladder-oak', 'glass');

  bridgeRun(bp, 8, -10, 0, -10, 12, 'ladder-oak', 'glass');

  const deck = [];
  for (const cell of bp.cells.values()) {
    if (cell.feature || cell.y < 15 || cell.y > 17) continue;
    const reach = Math.hypot(cell.x - 8, cell.z);
    if (reach < 6 || reach > 12) continue;
    if (bp.has(cell.x, cell.y + 1, cell.z)) continue;
    deck.push(cell);
  }
  for (let i = 0; i < deck.length; i++) {
    bp.bridge(deck[i].x, deck[i].y + 1, deck[i].z, 'ladder-oak', 'glass');
  }

  for (const cell of bp.cells.values()) {
    if (cell.feature) continue;
    if (Math.hypot(cell.x + 1, cell.y - 14, cell.z) <= 2.6) bp.paint(cell.x, cell.y, cell.z, 'ladder-brick-white');
  }

  bp.post(0, 0, 29, 34, 'ladder-brick-white');
  bp.post(2, 0, 28, 31, 'ladder-brick-white');
  bp.post(-2, 0, 28, 31, 'ladder-brick-white');

  ringSkin(bp, 0, 1, 'ladder-brick-yellow', function (cell) {
    return cell.y >= 18 && cell.z > 0 && Math.hypot(cell.x, cell.y - 14) >= 9;
  });
  ringSkin(bp, 0, -1, 'ladder-brick-yellow', function (cell) {
    return cell.z <= -20 && cell.y >= 4 && cell.y <= 12 && Math.abs(cell.x) <= 2;
  });

  bp.cut(0, 1, 1);
  bp.cut(0, 1, 0);
  bp.cut(0, 1, -1);
  bp.door(0, 1, 2, 'ladder-brick-white', 0, 1);
  bp.door(0, 1, -2, 'ladder-brick-white', 0, -1);
  bp.box(-1, 0, 3, 1, 0, 5, 'ladder-granite');
  bp.box(-1, 0, -5, 1, 0, -3, 'ladder-granite');

  bp.cut(0, 1, -20);
  bp.put(0, 0, -20, 'ladder-granite');
  bp.put(0, 0, -22, 'ladder-granite');
  bp.put(-1, 0, -22, 'ladder-granite');
  bp.put(1, 0, -22, 'ladder-granite');
  bp.door(0, 1, -21, 'ladder-brick-white', 0, -1);
}

function levelWindUmbrellas(bp) {
  shapeLayer(-10, 10, -10, 10, disk(0, 0, 9.2), false, function (x, z) {
    bp.put(x, 0, z, 'ladder-granite');
  });
  hyparUmbrella(bp, 0, 0, 11, 7, 11, 'ladder-oak');
  bp.post(0, 0, 9, 15, 'ladder-brick-white');
  for (let u = 3; u <= 8; u++) {
    valleyWall(bp, u, 0, 0, 1, 5);
    valleyWall(bp, -u, 0, 0, 1, 5);
    valleyWall(bp, 0, u, 1, 0, 5);
    valleyWall(bp, 0, -u, -1, 0, 5);
  }
  bp.door(5, 1, 0, 'ladder-brick-white', 0, 1);
  bp.door(-5, 1, 0, 'ladder-brick-white', 0, 1);
  bp.door(0, 1, 6, 'ladder-brick-white', 1, 0);
  bp.door(0, 1, -6, 'ladder-brick-white', -1, 0);
  bp.paint(1, 0, 0, 'ladder-concrete');
  bp.paint(-1, 0, 0, 'ladder-concrete');
  bp.paint(0, 0, 1, 'ladder-concrete');
  bp.paint(0, 0, -1, 'ladder-concrete');

  const ribs = [[11, 18, 11, 16, 16], [11, 18, -11, 16, -16], [-11, 18, 11, -16, 16], [-11, 18, -11, -16, -16]];
  for (let i = 0; i < ribs.length; i++) {
    const rib = ribs[i];
    bp.box(rib[3] - 1, 0, rib[4] - 1, rib[3] + 1, 0, rib[4] + 1, 'ladder-granite');
    strut(bp, rib[0], rib[1], rib[2], rib[3], 0, rib[4], 'ladder-brick-red');
    bp.post(rib[0], rib[2], 19, 22, 'ladder-brick-white');
  }

  bp.box(23, 0, 3, 25, 0, 8, 'ladder-granite');
  hyparUmbrella(bp, 24, 4, 5, 10, 5, 'ladder-sandstone');
  for (let z = 6; z <= 8; z++) valleyWall(bp, 24, z, 1, 0, 8);
  bp.post(24, 4, 12, 16, 'ladder-brick-white');

  bp.box(3, 0, 23, 8, 0, 25, 'ladder-granite');
  hyparUmbrella(bp, 4, 24, 5, 12, 5, 'ladder-stone');
  for (let x = 6; x <= 8; x++) valleyWall(bp, x, 24, 0, 1, 10);
  bp.post(4, 24, 14, 18, 'ladder-brick-white');

  bp.box(-23, 0, -10, -21, 0, -5, 'ladder-granite');
  hyparUmbrella(bp, -22, -6, 5, 8, 5, 'ladder-oak');
  for (let z = -10; z <= -8; z++) valleyWall(bp, -22, z, -1, 0, 6);
  bp.post(-22, -6, 10, 14, 'ladder-brick-white');
  bridgeRun(bp, 11, 0, 24, 4, 7, 'ladder-oak', 'glass');
  bridgeRun(bp, 0, 11, 4, 24, 7, 'ladder-oak', 'glass');
  bridgeRun(bp, -11, 0, -22, -6, 7, 'ladder-oak', 'glass');
}

function catenaryArchZ(bp, cz, x0, x1, y0, half, rise, thickness, materialId) {
  const curve = 1.4;
  const norm = Math.cosh(curve) - 1;
  function crown(z) {
    return y0 + Math.round(rise * (Math.cosh(curve) - Math.cosh(curve * (z - cz) / half)) / norm);
  }
  for (let z = cz - half; z <= cz + half; z++) {
    const top = crown(z);
    const lower = z > cz - half ? crown(z - 1) : y0;
    const upper = z < cz + half ? crown(z + 1) : y0;
    const bottom = Math.max(y0, Math.min(top - thickness + 1, lower, upper));
    for (let y = bottom; y <= top; y++) {
      for (let x = x0; x <= x1; x++) {
        bp.put(x, y, z, materialId);
      }
    }
  }
}

function towerDeck(bp, y, radius, materialId) {
  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
      if (Math.abs(x) === radius || Math.abs(z) === radius) {
        bp.put(x, y, z, 'ladder-pine');
      } else if (!bp.has(x, y, z)) {
        bp.bridge(x, y, z, materialId, 'metal');
      }
    }
  }
}

function eiffelBentLeg(bp, sx, sz) {
  const points = [
    [sx * 14, 0, sz * 14],
    [sx * 12, 5, sz * 12],
    [sx * 9, 12, sz * 9],
    [sx * 6, 20, sz * 6],
    [sx * 4, 28, sz * 4],
    [sx * 3, 36, sz * 3],
  ];
  for (let railX = 0; railX <= 1; railX++) {
    for (let railZ = 0; railZ <= 1; railZ++) {
      for (let i = 0; i < points.length - 1; i++) {
        strut(
          bp,
          points[i][0] + railX * sx,
          points[i][1],
          points[i][2] + railZ * sz,
          points[i + 1][0] + railX * sx,
          points[i + 1][1],
          points[i + 1][2] + railZ * sz,
          'ladder-brick-red'
        );
      }
    }
  }
  for (let i = 0; i < points.length - 1; i++) {
    strut(bp, points[i][0], points[i][1], points[i][2], points[i + 1][0] + sx, points[i + 1][1], points[i + 1][2] + sz, 'ladder-pine');
    strut(bp, points[i][0] + sx, points[i][1], points[i][2] + sz, points[i + 1][0], points[i + 1][1], points[i + 1][2], 'ladder-pine');
  }
}

function levelEiffelMasterwork(bp) {
  for (let sx = -1; sx <= 1; sx += 2) {
    for (let sz = -1; sz <= 1; sz += 2) {
      bp.box(sx * 16 - 2, 0, sz * 16 - 2, sx * 16 + 2, 0, sz * 16 + 2, 'ladder-granite');
      strut(bp, sx * 16, 0, sz * 16, sx * 14, 0, sz * 14, 'ladder-brick-red');
      eiffelBentLeg(bp, sx, sz);
    }
  }

  catenaryArch(bp, 0, -15, -13, 0, 13, 13, 2, 'ladder-brick-red');
  catenaryArch(bp, 0, 13, 15, 0, 13, 13, 2, 'ladder-brick-red');
  catenaryArchZ(bp, 0, -15, -13, 0, 13, 13, 2, 'ladder-brick-red');
  catenaryArchZ(bp, 0, 13, 15, 0, 13, 13, 2, 'ladder-brick-red');

  const stages = [
    [12, 9],
    [20, 6],
    [28, 4],
    [36, 3],
  ];
  for (let i = 0; i < stages.length; i++) {
    const y = stages[i][0];
    const radius = stages[i][1];
    towerDeck(bp, y, radius + (i === 0 ? 2 : 1), i === 2 ? 'ladder-oak' : 'ladder-brick-red');
    for (let edge = -radius; edge <= radius; edge++) {
      bp.put(edge, y, -radius, 'ladder-brick-red');
      bp.put(edge, y, radius, 'ladder-brick-red');
      bp.put(-radius, y, edge, 'ladder-brick-red');
      bp.put(radius, y, edge, 'ladder-brick-red');
    }
    for (let step = -radius; step <= radius; step += 3) {
      strut(bp, -radius, y, step, radius, y + 3, step, 'ladder-pine');
      strut(bp, step, y, -radius, step, y + 3, radius, 'ladder-pine');
    }
  }

  for (let y = 36; y <= 49; y++) {
    const radius = y < 42 ? 3 : y < 47 ? 2 : 1;
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        bp.put(sx * radius, y, sz * radius, 'ladder-brick-red');
      }
    }
    if (y % 3 === 0) {
      for (let x = -radius; x <= radius; x++) {
        bp.put(x, y, -radius, 'ladder-pine');
        bp.put(x, y, radius, 'ladder-pine');
      }
      for (let z = -radius; z <= radius; z++) {
        bp.put(-radius, y, z, 'ladder-pine');
        bp.put(radius, y, z, 'ladder-pine');
      }
    }
  }

  strut(bp, 3, 36, 3, 0, 36, 0, 'ladder-brick-red');
  bp.post(0, 0, 36, 61, 'ladder-brick-red');
  strut(bp, -3, 41, -3, -2, 42, -2, 'ladder-brick-red');
  strut(bp, -3, 41, 3, -2, 42, 2, 'ladder-brick-red');
  strut(bp, 3, 41, -3, 2, 42, -2, 'ladder-brick-red');
  strut(bp, 3, 41, 3, 2, 42, 2, 'ladder-brick-red');
  strut(bp, -2, 46, -2, -1, 47, -1, 'ladder-brick-red');
  strut(bp, -2, 46, 2, -1, 47, 1, 'ladder-brick-red');
  strut(bp, 2, 46, -2, 1, 47, -1, 'ladder-brick-red');
  strut(bp, 2, 46, 2, 1, 47, 1, 'ladder-brick-red');
  towerDeck(bp, 49, 2, 'ladder-oak');
  bp.post(0, 0, 50, 61, 'ladder-brick-white');
  bp.post(1, 0, 50, 54, 'ladder-brick-red');
  bp.post(-1, 0, 50, 54, 'ladder-brick-red');
  bp.post(0, 1, 50, 54, 'ladder-brick-red');
  bp.post(0, -1, 50, 54, 'ladder-brick-red');

  for (let y = 4; y <= 32; y += 4) {
    const radius = Math.round(14 - y * 11 / 36);
    strut(bp, -radius, y, -radius, radius, y + 2, -radius, 'ladder-pine');
    strut(bp, radius, y, -radius, -radius, y + 2, -radius, 'ladder-pine');
    strut(bp, -radius, y, radius, radius, y + 2, radius, 'ladder-pine');
    strut(bp, radius, y, radius, -radius, y + 2, radius, 'ladder-pine');
    strut(bp, -radius, y, -radius, -radius, y + 2, radius, 'ladder-pine');
    strut(bp, -radius, y, radius, -radius, y + 2, -radius, 'ladder-pine');
    strut(bp, radius, y, -radius, radius, y + 2, radius, 'ladder-pine');
    strut(bp, radius, y, radius, radius, y + 2, -radius, 'ladder-pine');
  }
}

function gaudiTower(bp, cx, cz, height, baseRadius, materialId, accentId) {
  for (let y = 0; y < height; y++) {
    const taper = baseRadius - y * (baseRadius - 1.2) / height;
    const pulse = 0.35 * Math.sin(y * 0.75 + cx * 0.3 + cz * 0.2);
    const radius = taper + pulse;
    for (let z = -baseRadius - 1; z <= baseRadius + 1; z++) {
      for (let x = -baseRadius - 1; x <= baseRadius + 1; x++) {
        const distance = Math.hypot(x, z);
        if (distance > radius || distance < radius - 1.45) {
          continue;
        }
        const material = (y + x - z) % 7 === 0 ? accentId : materialId;
        bp.put(cx + x, y, cz + z, material);
      }
    }
  }
  for (let y = 0; y <= 4; y++) {
    const radius = Math.max(0, 2 - Math.floor(y / 2));
    for (let z = -radius; z <= radius; z++) {
      for (let x = -radius; x <= radius; x++) {
        if (Math.abs(x) + Math.abs(z) <= radius + 1) {
          bp.put(cx + x, height + y, cz + z, y < 3 ? accentId : 'ladder-brick-white');
        }
      }
    }
  }
  bp.post(cx, cz, height + 5, height + 7, 'ladder-brick-white');
}

function branchingColumn(bp, x, z, top, spread, materialId) {
  bp.post(x, z, 0, top - 5, materialId);
  strut(bp, x, top - 5, z, x - spread, top, z - spread, materialId);
  strut(bp, x, top - 5, z, x + spread, top, z - spread, materialId);
  strut(bp, x, top - 5, z, x - spread, top, z + spread, materialId);
  strut(bp, x, top - 5, z, x + spread, top, z + spread, materialId);
}

function levelSagradaMasterwork(bp) {
  bp.box(-9, 0, -18, 9, 0, 15, 'ladder-granite');
  bp.box(-15, 0, -5, 15, 0, 6, 'ladder-granite');

  const columns = [
    [-5, -10], [0, -10], [5, -10],
    [-5, -3], [0, -3], [5, -3],
    [-5, 4], [0, 4], [5, 4],
    [-5, 11], [0, 11], [5, 11],
  ];
  for (let i = 0; i < columns.length; i++) {
    branchingColumn(bp, columns[i][0], columns[i][1], 15 + i % 3, 2, i % 2 === 0 ? 'ladder-stone' : 'ladder-oak');
  }

  for (let z = -15; z <= 13; z += 7) {
    bp.post(-9, z, 1, 9, 'ladder-sandstone');
    bp.post(9, z, 1, 9, 'ladder-sandstone');
    catenaryArch(bp, 0, z, z, 8, 8, 9, 2, 'ladder-pine');
    strut(bp, -8, 9, z, 0, 18, z + 3, 'ladder-brick-white');
    strut(bp, 8, 9, z, 0, 18, z + 3, 'ladder-brick-white');
  }
  for (let x = -12; x <= 12; x += 6) {
    bp.post(x, -5, 1, 8, 'ladder-sandstone');
    bp.post(x, 5, 1, 8, 'ladder-sandstone');
    catenaryArchZ(bp, 0, x, x, 7, 5, 8, 2, 'ladder-sandstone');
  }

  for (let z = -18; z <= 14; z++) {
    bp.put(-9, 1, z, 'ladder-brick-red');
    bp.put(9, 1, z, 'ladder-brick-red');
    if (z % 3 === 0) {
      bp.post(-9, z, 2, 7, 'ladder-sandstone');
      bp.post(9, z, 2, 7, 'ladder-sandstone');
    }
  }

  const apseCenterZ = 14;
  for (let y = 1; y <= 10; y++) {
    const radius = 9 - Math.floor(y / 5);
    for (let angle = 0; angle <= 12; angle++) {
      const theta = angle * Math.PI / 12;
      const x = Math.round(radius * Math.cos(theta));
      const z = Math.round(apseCenterZ + radius * Math.sin(theta));
      if (y === 5 || y === 10) {
        const previousRadius = radius + 1;
        const previousX = Math.round(previousRadius * Math.cos(theta));
        const previousZ = Math.round(apseCenterZ + previousRadius * Math.sin(theta));
        strut(bp, previousX, y - 1, previousZ, x, y, z, 'ladder-pine');
      }
      if (y === 1) {
        bp.put(x, 0, z, 'ladder-granite');
      }
      bp.put(x, y, z, y % 3 === 0 ? 'ladder-brick-white' : 'ladder-pine');
    }
  }

  bp.walls(-9, 1, -18, 9, 10, -17, 'ladder-sandstone');
  catenaryArch(bp, -5, -17, -17, 0, 3, 7, 2, 'ladder-pine');
  catenaryArch(bp, 0, -17, -17, 0, 3, 10, 2, 'ladder-brick-white');
  catenaryArch(bp, 5, -17, -17, 0, 3, 7, 2, 'ladder-pine');
  windowMosaicX(bp, 0, 7, -18, 'ladder-brick-yellow', -1, 'rose', 3);
  windowMosaicX(bp, -6, 5, -18, 'ladder-oak', -1, 'arch', 1);
  windowMosaicX(bp, 6, 5, -18, 'ladder-oak', -1, 'arch', 1);

  const towers = [
    [-11, -15, 30, 3, 'ladder-sandstone', 'ladder-brick-white'],
    [11, -15, 32, 3, 'ladder-sandstone', 'ladder-brick-white'],
    [-12, -6, 36, 3, 'ladder-pine', 'ladder-concrete'],
    [12, -6, 38, 3, 'ladder-pine', 'ladder-concrete'],
    [-10, 7, 40, 3, 'ladder-stone', 'ladder-brick-white'],
    [10, 7, 42, 3, 'ladder-stone', 'ladder-brick-white'],
    [-6, 15, 34, 3, 'ladder-sandstone', 'ladder-brick-yellow'],
    [6, 15, 36, 3, 'ladder-sandstone', 'ladder-brick-yellow'],
    [-4, 1, 46, 3, 'ladder-oak', 'ladder-brick-white'],
    [4, 1, 48, 3, 'ladder-oak', 'ladder-brick-white'],
  ];
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    gaudiTower(bp, tower[0], tower[1], tower[2], tower[3], tower[4], tower[5]);
  }

  gaudiTower(bp, 0, 6, 54, 4, 'ladder-oak', 'ladder-brick-white');
  bp.post(0, 6, 62, 68, 'ladder-brick-white');
  bp.put(-1, 66, 6, 'ladder-brick-white');
  bp.put(1, 66, 6, 'ladder-brick-white');
  bp.put(0, 66, 5, 'ladder-brick-white');
  bp.put(0, 66, 7, 'ladder-brick-white');

  bp.box(-2, 0, -22, 2, 0, -19, 'ladder-granite');
  bp.cut(0, 1, -19);
  bp.cut(0, 1, -17);
  bp.door(0, 1, -18, 'ladder-brick-white', 0, -1);
}

function levelElementPavilion(bp) {
  const pods = [[16, 6], [16, -6], [-16, 6], [-16, -6], [6, 16], [6, -16], [-6, 16], [-6, -16]];

  for (let z = -22; z <= 20; z++) {
    for (let x = -20; x <= 20; x++) {
      const distance = Math.hypot(x, z);
      if (distance <= 20) bp.put(x, 0, z, 'ladder-granite');
      if (distance <= 13) bp.put(x, 4, z, 'ladder-stone');
      if (distance >= 10.6 && distance <= 12.4) {
        for (let y = 1; y <= 3; y++) bp.put(x, y, z, 'ladder-oak');
      }
      if (distance >= 6.4 && distance <= 7.6) {
        for (let y = 1; y <= 3; y++) bp.put(x, y, z, 'ladder-oak');
      }
    }
  }
  for (let y = 1; y <= 3; y++) {
    for (let i = 4; i <= 10; i++) {
      bp.put(i, y, 0, 'ladder-oak');
      bp.put(-i, y, 0, 'ladder-oak');
      bp.put(0, y, i, 'ladder-oak');
      bp.put(0, y, -i, 'ladder-oak');
    }
  }

  for (let y = 0; y <= 34; y++) {
    for (let z = -4; z <= 4; z++) {
      for (let x = -4; x <= 4; x++) {
        const distance = Math.hypot(x, z);
        if (distance <= 3.35 && distance >= 2.2) bp.put(x, y, z, y % 6 === 0 ? 'ladder-brick-yellow' : 'ladder-oak');
      }
    }
  }

  for (let y = 5; y <= 8; y++) {
    for (let z = -12; z <= 12; z++) {
      for (let x = -12; x <= 12; x++) {
        const distance = Math.hypot(x, z);
        const gate = (Math.abs(x) <= 2 && Math.abs(z) >= 8) || (Math.abs(z) <= 2 && Math.abs(x) >= 8);
        if (distance >= 8.6 && distance <= 11.1 && !gate) bp.put(x, y, z, 'ladder-oak');
      }
    }
  }

  for (let x = -6; x <= 6; x++) {
    bp.beam(x, 9, -10, 'ladder-stone', 1, 0, 'square');
    bp.beam(x, 9, 10, 'ladder-stone', 1, 0, 'square');
    bp.beam(x, 9, -9, 'ladder-brick-yellow', 1, 0, 'round');
    bp.beam(x, 9, 9, 'ladder-brick-yellow', 1, 0, 'round');
  }
  for (let z = -6; z <= 6; z++) {
    bp.beam(-10, 9, z, 'ladder-stone', 0, 1, 'square');
    bp.beam(10, 9, z, 'ladder-stone', 0, 1, 'square');
  }

  bp.door(0, 5, -9, 'ladder-oak', 0, -1);
  bp.arch(-2, 5, -9, 'ladder-stone', 0, -1, 'round');
  bp.arch(2, 5, -9, 'ladder-stone', 0, -1, 'round');
  bp.arch(0, 5, 9, 'ladder-stone', 0, 1, 'round');
  bp.arch(-2, 5, 9, 'ladder-stone', 0, 1, 'pointed');
  bp.arch(2, 5, 9, 'ladder-stone', 0, 1, 'pointed');
  bp.arch(9, 5, 0, 'ladder-stone', 1, 0, 'round');
  bp.arch(-9, 5, 0, 'ladder-stone', -1, 0, 'round');

  for (const offset of [4, -4]) {
    bp.brace(11, 6, offset, 'ladder-brick-yellow', 1, 0, 'cross');
    bp.brace(-11, 6, offset, 'ladder-brick-yellow', -1, 0, 'cross');
    bp.brace(offset, 6, 11, 'ladder-brick-yellow', 0, 1, 'single');
    bp.brace(offset, 6, -11, 'ladder-brick-yellow', 0, -1, 'single');
  }
  for (let y = 6; y <= 30; y += 6) {
    bp.brace(4, y, 0, 'ladder-brick-yellow', 1, 0, 'cross');
    bp.brace(-4, y, 0, 'ladder-brick-yellow', -1, 0, 'cross');
    bp.brace(0, y, 4, 'ladder-brick-yellow', 0, 1, 'cross');
    bp.brace(0, y, -4, 'ladder-brick-yellow', 0, -1, 'cross');
  }

  for (let step = 0; step < 5; step++) {
    for (let x = -5; x <= 5; x++) bp.stair(x, 1 + step, -17 + step, 'ladder-stone', 0, 1, 'stone');
    bp.post(-6, -17 + step, 0, 1 + step, 'ladder-oak');
    bp.post(6, -17 + step, 0, 1 + step, 'ladder-oak');
  }
  bp.lamp(-7, 1, -17, 'ladder-oak', 'cold');
  bp.lamp(7, 1, -17, 'ladder-oak', 'cold');
  bp.lamp(-7, 1, -15, 'ladder-oak', 'cold');
  bp.lamp(7, 1, -15, 'ladder-oak', 'cold');

  for (let z = -14; z <= -8; z++) {
    for (let x = 8; x <= 14; x++) bp.water(x, 1, z, 'ladder-brick-yellow', 'pool');
  }

  for (let course = 0; course < 3; course++) {
    for (let side = -1; side <= 1; side++) {
      bp.slope(6 - course, 5 + course, side, 'ladder-oak', -1, 0, 'metal');
      bp.slope(-6 + course, 5 + course, side, 'ladder-oak', 1, 0, 'metal');
      bp.slope(side, 5 + course, 6 - course, 'ladder-oak', 0, -1, 'metal');
      bp.slope(side, 5 + course, -6 + course, 'ladder-oak', 0, 1, 'glass');
    }
  }

  for (let z = -6; z <= 6; z++) {
    for (let x = -6; x <= 6; x++) {
      const distance = Math.hypot(x, z);
      if (distance >= 4.5 && distance <= 6.2 && Math.abs(x) > 1 && Math.abs(z) > 1) {
        bp.water(x, 5, z, 'ladder-brick-yellow', distance > 5.6 ? 'cascade' : 'pool');
      }
    }
  }

  const plants = [[5, 3], [3, 5], [-5, 3], [-3, 5], [5, -3], [3, -5], [-5, -3], [-3, -5]];
  for (let i = 0; i < plants.length; i++) {
    const plant = plants[i];
    const dir = plant[0] > 0 ? 1 : -1;
    bp.put(plant[0], 5, plant[1], 'ladder-stone');
    bp.greenery(plant[0] + dir, 5, plant[1], 'ladder-concrete', dir, 0, i % 2 === 0 ? 'shrub' : 'vine');
  }

  const decks = [10, 16, 22, 28];
  for (let i = 0; i < decks.length; i++) {
    const y = decks[i];
    for (let side = -1; side <= 1; side++) {
      bp.balcony(4, y, side, 'ladder-stone', 1, 0, 'glass');
      bp.balcony(-4, y, side, 'ladder-stone', -1, 0, 'glass');
      bp.balcony(side, y, 4, 'ladder-stone', 0, 1, 'glass');
      bp.balcony(side, y, -4, 'ladder-stone', 0, -1, 'glass');
    }
  }
  for (let y = 8; y <= 26; y += 6) {
    bp.window(3, y, 0, 'ladder-brick-yellow', 1, 0, 'slit');
    bp.window(-3, y, 0, 'ladder-brick-yellow', -1, 0, 'slit');
    bp.window(0, y, 3, 'ladder-brick-yellow', 0, 1, 'slit');
    bp.window(0, y, -3, 'ladder-brick-yellow', 0, -1, 'slit');
  }
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? 3 : -3;
    const z = i < 2 ? 0 : 0;
    bp.lamp(i < 2 ? x : 0, 35, i < 2 ? z : (i === 2 ? 3 : -3), 'ladder-brick-yellow', 'cold');
  }

  for (let i = 0; i < pods.length; i++) {
    const pod = pods[i];
    for (let y = 1; y <= 4; y++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
          bp.put(pod[0] + dx, y, pod[1] + dz, 'ladder-oak');
        }
      }
    }
    bp.dome(pod[0], 5, pod[1], 'ladder-brick-yellow', 'glass');
    bp.lamp(pod[0] + 2, 1, pod[1], 'ladder-oak', 'cold');
    bp.lamp(pod[0], 5, pod[1] + 1, 'ladder-brick-yellow', 'cold');
    const anchorX = pod[0] > 0 ? 12 : -12;
    const anchorZ = pod[1] > 0 ? 12 : -12;
    if (Math.abs(pod[0]) > Math.abs(pod[1])) {
      bp.post(anchorX, pod[1], 4, 6, 'ladder-oak');
      for (let x = anchorX + (pod[0] > 0 ? 1 : -1); x !== pod[0]; x += pod[0] > 0 ? 1 : -1) {
        bp.cable(x, 6, pod[1], 'ladder-brick-yellow', 1, 0, 'straight');
      }
      const shedX0 = pod[0] > 0 ? pod[0] + 2 : pod[0] - 3;
    const shedX1 = pod[0] > 0 ? pod[0] + 3 : pod[0] - 2;
    bp.box(shedX0, 0, pod[1] - 1, shedX1, 3, pod[1] + 1, 'ladder-stone');
      for (let course = 0; course < 2; course++) {
        bp.slope(shedX0, 4 + course, pod[1] - 1 + course, 'ladder-oak', 0, 1, 'metal');
        bp.slope(shedX1, 4 + course, pod[1] - 1 + course, 'ladder-oak', 0, 1, 'metal');
      }
    } else {
      bp.post(pod[0], anchorZ, 4, 6, 'ladder-oak');
      for (let z = anchorZ + (pod[1] > 0 ? 1 : -1); z !== pod[1]; z += pod[1] > 0 ? 1 : -1) {
        bp.cable(pod[0], 6, z, 'ladder-brick-yellow', 0, 1, 'straight');
      }
    }
  }
}

function levelWindowLantern(bp) {
  bp.box(-6, 0, -6, 6, 0, 6, 'ladder-granite');
  bp.box(-6, 7, -6, 6, 7, 6, 'ladder-oak');
  for (let y = 1; y <= 6; y++) {
    bp.put(-6, y, -6, 'ladder-stone');
    bp.put(-6, y, 6, 'ladder-stone');
    bp.put(6, y, -6, 'ladder-stone');
    bp.put(6, y, 6, 'ladder-stone');
    for (let x = -5; x <= 5; x++) {
      bp.window(x, y, -6, 'ladder-brick-yellow', 0, -1, 'panorama');
      bp.window(x, y, 6, 'ladder-brick-yellow', 0, 1, 'panorama');
    }
    for (let z = -5; z <= 5; z++) {
      bp.window(-6, y, z, 'ladder-brick-yellow', -1, 0, 'panorama');
      bp.window(6, y, z, 'ladder-brick-yellow', 1, 0, 'panorama');
    }
  }
}

function levelDoorHouse(bp) {
  bp.box(-11, 0, -2, -8, 8, 2, 'ladder-pine');
  bp.box(8, 0, -2, 11, 8, 2, 'ladder-pine');
  bp.box(-7, 0, 0, 7, 7, 0, 'ladder-stone');
  bp.box(-7, 0, -1, 7, 0, -1, 'ladder-granite');
  bp.box(-7, 0, 1, 7, 0, 1, 'ladder-granite');
  bp.box(-7, 3, -1, 7, 3, -1, 'ladder-pine');
  bp.box(-7, 3, 1, 7, 3, 1, 'ladder-pine');
  for (let x = -6; x <= 6; x += 3) {
    bp.door(x, 1, 0, 'ladder-brick-white', 0, -1);
    bp.door(x, 4, 0, 'ladder-brick-white', 0, -1);
  }
  bp.box(-11, 9, -2, -8, 10, 2, 'ladder-brick-white');
  bp.box(8, 9, -2, 11, 10, 2, 'ladder-brick-white');
}

function levelBridgeCourt(bp) {
  bp.box(-8, 0, -4, 8, 0, 4, 'ladder-granite');
  bp.box(-8, 1, -1, -6, 7, 1, 'ladder-brick-red');
  bp.box(6, 1, -1, 8, 7, 1, 'ladder-brick-red');
  bp.box(-1, 0, -8, 1, 7, -6, 'ladder-brick-red');
  bp.box(-1, 0, 6, 1, 7, 8, 'ladder-brick-red');
  const decks = [[3, 'stone'], [5, 'metal'], [7, 'glass']];
  for (let i = 0; i < decks.length; i++) {
    for (let x = -5; x <= 5; x++) {
      for (let z = -1; z <= 1; z++) bp.bridge(x, decks[i][0], z, 'ladder-oak', decks[i][1]);
    }
    for (let z = -5; z <= 5; z++) {
      for (let x = -1; x <= 1; x++) bp.bridge(x, decks[i][0], z, 'ladder-stone', decks[i][1]);
    }
  }
}

function levelSlopeRoofs(bp) {
  bp.box(-8, 0, -6, 8, 0, 6, 'ladder-granite');
  bp.box(-8, 1, -6, 8, 3, -6, 'ladder-stone');
  bp.box(-8, 1, 6, 8, 3, 6, 'ladder-stone');
  bp.box(-8, 1, -5, -8, 3, 5, 'ladder-stone');
  bp.box(8, 1, -5, 8, 3, 5, 'ladder-stone');
  for (let course = 0; course < 5; course++) {
    for (let x = -7; x <= 7; x++) {
      bp.slope(x, 4 + course, -6 + course, 'ladder-oak', 0, 1, 'metal');
      bp.slope(x, 4 + course, 6 - course, 'ladder-oak', 0, -1, 'stone');
    }
  }
  bp.box(-7, 8, -1, 7, 9, 1, 'ladder-brick-white');
  for (let y = 4; y <= 8; y++) {
    const inset = y - 4;
    bp.box(-8, y, -5 + inset, -8, y, 5 - inset, 'ladder-pine');
    bp.box(8, y, -5 + inset, 8, y, 5 - inset, 'ladder-pine');
  }
}

function levelBeamCanopy(bp) {
  bp.box(-8, 0, -8, 8, 0, 8, 'ladder-granite');
  for (let z = -8; z <= 8; z += 4) {
    for (let x = -8; x <= 8; x += 4) bp.post(x, z, 1, 4, 'ladder-brick-red');
  }
  for (let z = -8; z <= 8; z += 4) {
    for (let x = -8; x <= 8; x++) bp.beam(x, 5, z, 'ladder-pine', 1, 0, 'square');
  }
  for (let x = -8; x <= 8; x += 4) {
    for (let z = -8; z <= 8; z++) bp.beam(x, 5, z, 'ladder-stone', 0, 1, 'round');
  }
}

function levelBraceTower(bp) {
  for (let y = 0; y <= 10; y++) {
    for (let z = 5; z <= 6; z++) {
      for (let x = 5; x <= 6; x++) {
        bp.put(x, y, z, 'ladder-brick-red');
        bp.put(-x, y, z, 'ladder-brick-red');
        bp.put(x, y, -z, 'ladder-brick-red');
        bp.put(-x, y, -z, 'ladder-brick-red');
      }
    }
  }
  for (let y = 1; y <= 9; y++) {
    for (let i = -4; i <= 4; i++) {
      bp.brace(i, y, 6, 'ladder-brick-white', 1, 0, y % 2 === 0 ? 'cross' : 'single');
      bp.brace(i, y, -6, 'ladder-brick-white', 1, 0, y % 2 === 0 ? 'cross' : 'single');
      bp.brace(6, y, i, 'ladder-brick-white', 0, 1, y % 2 === 0 ? 'cross' : 'single');
      bp.brace(-6, y, i, 'ladder-brick-white', 0, 1, y % 2 === 0 ? 'cross' : 'single');
    }
  }
  bp.box(-4, 0, -4, 4, 0, 4, 'ladder-granite');
}

function levelArchCloister(bp) {
  for (let z = -9; z <= 9; z++) {
    for (let x = -9; x <= 9; x++) {
      if (Math.abs(x) >= 6 || Math.abs(z) >= 6) bp.put(x, 0, z, 'ladder-granite');
    }
  }
  const lines = [
    [0, -7, -1],
    [0, 7, 1],
    [7, 0, 0],
    [-7, 0, 0],
  ];
  for (let i = 0; i < lines.length; i++) {
    const faceX = lines[i][0] === 0 ? 0 : (lines[i][0] > 0 ? 1 : -1);
    const faceZ = lines[i][1] === 0 ? 0 : (lines[i][1] > 0 ? 1 : -1);
    for (let n = -8; n <= 8; n++) {
      const x = lines[i][0] === 0 ? n : lines[i][0];
      const z = lines[i][1] === 0 ? n : lines[i][1];
      for (let y = 1; y <= 6; y++) bp.put(x, y, z, 'ladder-stone');
    }
    for (let n = -6; n <= 6; n += 3) {
      const x = lines[i][0] === 0 ? n : lines[i][0];
      const z = lines[i][1] === 0 ? n : lines[i][1];
      bp.arch(x, 1, z, 'ladder-pine', faceX, faceZ, 'round');
      bp.arch(x, 4, z, 'ladder-pine', faceX, faceZ, 'pointed');
    }
  }
}

function levelGrandStair(bp) {
  bp.box(-8, 0, -11, 8, 0, 4, 'ladder-granite');
  for (let step = 0; step < 7; step++) {
    for (let x = -5; x <= 5; x++) bp.stair(x, 1 + step, -9 + step, 'ladder-stone', 0, 1, 'stone');
    bp.post(-6, -9 + step, 0, 1 + step, 'ladder-pine');
    bp.post(6, -9 + step, 0, 1 + step, 'ladder-pine');
  }
  for (let step = 0; step < 5; step++) {
    for (let z = 0; z <= 3; z++) {
      bp.stair(-8 + step, 1 + step, z, 'ladder-oak', 1, 0, 'metal');
      bp.stair(8 - step, 1 + step, z, 'ladder-oak', -1, 0, 'glass');
    }
  }
  bp.box(-5, 7, -2, 5, 7, 3, 'ladder-brick-white');
  bp.post(-5, -2, 0, 6, 'ladder-pine');
  bp.post(5, -2, 0, 6, 'ladder-pine');
  bp.post(-5, 3, 0, 6, 'ladder-pine');
  bp.post(5, 3, 0, 6, 'ladder-pine');
  bp.box(-3, 8, 0, 3, 9, 2, 'ladder-pine');
}

function levelBalconyHouse(bp) {
  for (let y = 0; y <= 12; y++) {
    for (let z = -3; z <= 3; z++) {
      for (let x = -3; x <= 3; x++) {
        if (Math.abs(x) === 3 || Math.abs(z) === 3) bp.put(x, y, z, y % 4 === 0 ? 'ladder-brick-white' : 'ladder-stone');
      }
    }
  }
  bp.box(-2, 0, -2, 2, 0, 2, 'ladder-granite');
  bp.box(-3, 13, -3, 3, 13, 3, 'ladder-pine');
  for (let y = 2; y <= 12; y += 2) {
    for (let i = -2; i <= 2; i++) {
      bp.balcony(i, y, -4, 'ladder-oak', 0, -1, 'glass');
      bp.balcony(i, y, 4, 'ladder-oak', 0, 1, 'stone');
      bp.balcony(-4, y, i, 'ladder-oak', -1, 0, 'metal');
      bp.balcony(4, y, i, 'ladder-oak', 1, 0, 'glass');
    }
  }
}

function levelDomeField(bp) {
  bp.box(-8, 0, -8, 8, 0, 8, 'ladder-granite');
  bp.box(-8, 1, -8, 8, 1, 8, 'ladder-stone');
  const domes = [[-5, -5], [-5, 0], [-5, 5], [0, -5], [0, 5], [5, -5], [5, 0], [5, 5]];
  for (let i = 0; i < domes.length; i++) bp.dome(domes[i][0], 2, domes[i][1], 'ladder-brick-yellow', 'glass');
  bp.dome(0, 2, 0, 'ladder-brick-white', 'metal');
  bp.box(-1, 2, -1, 1, 2, -1, 'ladder-pine');
  bp.box(-1, 2, 1, 1, 2, 1, 'ladder-pine');
  bp.box(-1, 2, 0, -1, 2, 0, 'ladder-pine');
  bp.box(1, 2, 0, 1, 2, 0, 'ladder-pine');
}

function levelLampCourt(bp) {
  bp.box(-8, 0, -8, 8, 0, 8, 'ladder-granite');
  for (let y = 1; y <= 2; y++) {
    for (let i = -8; i <= 8; i++) {
      bp.put(i, y, -8, 'ladder-stone');
      bp.put(i, y, 8, 'ladder-stone');
      if (Math.abs(i) < 8) {
        bp.put(-8, y, i, 'ladder-stone');
        bp.put(8, y, i, 'ladder-stone');
      }
    }
  }
  for (let i = -7; i <= 7; i += 2) {
    bp.lamp(i, 3, -8, 'ladder-brick-white', 'warm');
    bp.lamp(i, 3, 8, 'ladder-brick-white', 'cold');
    bp.lamp(-8, 3, i, 'ladder-brick-white', 'warm');
    bp.lamp(8, 3, i, 'ladder-brick-white', 'cold');
  }
  for (let z = -6; z <= 6; z += 3) {
    for (let x = -6; x <= 6; x += 3) {
      bp.post(x, z, 1, 2, 'ladder-pine');
      bp.lamp(x, 3, z, 'ladder-oak', (x + z) % 6 === 0 ? 'cold' : 'warm');
    }
  }
}

function levelWaterBaths(bp) {
  bp.box(-10, 0, -8, 10, 0, 8, 'ladder-granite');
  for (let z = -4; z <= 4; z++) {
    for (let x = -6; x <= 6; x++) bp.water(x, 1, z, 'ladder-brick-yellow', 'pool');
  }
  for (let y = 1; y <= 2; y++) {
    for (let i = -10; i <= 10; i++) {
      bp.put(i, y, -8, 'ladder-stone');
      bp.put(i, y, 8, 'ladder-stone');
    }
    for (let i = -7; i <= 7; i++) {
      bp.put(-10, y, i, 'ladder-stone');
      bp.put(10, y, i, 'ladder-stone');
    }
  }
  bp.box(-4, 1, 6, 4, 2, 8, 'ladder-pine');
  for (let step = 0; step < 4; step++) {
    for (let x = -1; x <= 1; x++) {
      bp.put(x, step, 5 + step, 'ladder-stone');
      bp.water(x, step + 1, 5 + step, 'ladder-brick-yellow', 'cascade');
    }
  }
  for (let z = -3; z <= 3; z++) {
    bp.water(-8, 1, z, 'ladder-brick-yellow', 'pool');
    bp.water(8, 1, z, 'ladder-brick-yellow', 'pool');
  }
}

function levelHangingGarden(bp) {
  bp.box(-7, 0, -7, 7, 0, 7, 'ladder-granite');
  for (let y = 1; y <= 3; y++) {
    for (let i = -7; i <= 7; i++) {
      bp.put(i, y, -7, 'ladder-stone');
      bp.put(i, y, 7, 'ladder-pine');
      if (Math.abs(i) < 7) {
        bp.put(-7, y, i, 'ladder-stone');
        bp.put(7, y, i, 'ladder-pine');
      }
    }
    for (let i = -6; i <= 6; i++) {
      bp.greenery(i, y, -8, 'ladder-concrete', 0, -1, y % 2 === 0 ? 'vine' : 'shrub');
      bp.greenery(i, y, 8, 'ladder-concrete', 0, 1, y % 2 === 0 ? 'shrub' : 'vine');
      bp.greenery(-8, y, i, 'ladder-concrete', -1, 0, 'vine');
      bp.greenery(8, y, i, 'ladder-concrete', 1, 0, 'shrub');
    }
  }
}

function levelCableBridge(bp) {
  bp.box(-12, 0, -1, -9, 9, 1, 'ladder-brick-red');
  bp.box(9, 0, -1, 12, 9, 1, 'ladder-brick-red');
  bp.box(-14, 0, -3, -13, 0, 3, 'ladder-granite');
  bp.box(13, 0, -3, 14, 0, 3, 'ladder-granite');
  bp.box(-8, 0, -1, 8, 0, 1, 'ladder-granite');
  bp.box(-8, 4, -1, 8, 4, 1, 'ladder-pine');
  for (let z = -1; z <= 1; z++) {
    for (let x = -8; x <= 8; x++) {
      bp.cable(x, 9, z, 'ladder-brick-yellow', 1, 0, 'straight');
      bp.cable(x, 5, z, 'ladder-oak', 1, 0, 'sag');
    }
  }
  bp.box(-12, 10, -1, -9, 11, 1, 'ladder-brick-white');
  bp.box(9, 10, -1, 12, 11, 1, 'ladder-brick-white');
}

  // Compact sandstone office: 42 shell cubes, four window panes and four entrance cubes = 50.
  function levelHqOffice(bp) {
    bp.box(-2, 0, -1, 2, 0, 1, 'ladder-sandstone');
    bp.box(-1, 0, 2, 1, 0, 2, 'ladder-sandstone');
    bp.put(0, 0, 3, 'ladder-sandstone');
    bp.walls(-2, 1, -1, 2, 1, 1, 'ladder-sandstone');
    bp.door(0, 1, 1, 'ladder-sandstone', 0, 1);
    bp.window(-2, 1, 0, 'ladder-sandstone', -1, 0, 'panorama');
    bp.window(2, 1, 0, 'ladder-sandstone', 1, 0, 'panorama');
    bp.window(-1, 1, -1, 'ladder-sandstone', 0, -1, 'panorama');
    bp.window(1, 1, -1, 'ladder-sandstone', 0, -1, 'panorama');
    bp.box(-2, 2, -1, 2, 2, 1, 'ladder-sandstone');
  }

  // Tech center: a light concrete two-storey block with a glass band and a cold lamp on the roof.
  function levelHqTech(bp) {
    bp.box(-2, 0, -2, 2, 0, 2, 'ladder-sandstone');
    bp.put(0, 0, 3, 'ladder-sandstone');
    bp.walls(-2, 1, -2, 2, 2, 2, 'ladder-concrete');
    bp.door(0, 1, 2, 'ladder-concrete', 0, 1);
    bp.window(-1, 2, 2, 'ladder-concrete', 0, 1, 'panorama');
    bp.window(1, 2, 2, 'ladder-concrete', 0, 1, 'panorama');
    bp.window(-2, 2, 0, 'ladder-concrete', -1, 0, 'panorama');
    bp.window(2, 2, 0, 'ladder-concrete', 1, 0, 'panorama');
    bp.box(-2, 3, -2, 2, 3, 2, 'ladder-stone');
    bp.lamp(0, 4, 0, 'ladder-stone', 'cold');
  }

  function levelHqPersonnel(bp) {
    bp.box(-2, 0, -2, 2, 0, 2, 'ladder-sandstone');
    bp.put(0, 0, 3, 'ladder-sandstone');
    bp.walls(-2, 1, -2, 2, 1, 2, 'ladder-sandstone');
    bp.door(0, 1, 2, 'ladder-sandstone', 0, 1);
    bp.window(-2, 1, 0, 'ladder-stone', -1, 0, 'panorama');
    bp.window(2, 1, 0, 'ladder-stone', 1, 0, 'panorama');
    bp.box(-2, 2, -2, 2, 2, 2, 'ladder-stone');
  }

  function levelHqRecruiting(bp) {
    // Small classroom and a stepped practice tower beside the entrance.
    bp.box(-2, 0, -1, 2, 0, 1, 'ladder-sandstone');
    bp.put(0, 0, 2, 'ladder-sandstone');
    bp.walls(-2, 1, -1, 1, 1, 1, 'ladder-pine');
    bp.door(0, 1, 1, 'ladder-pine', 0, 1);
    bp.window(-2, 1, 0, 'ladder-sandstone', -1, 0, 'panorama');
    bp.window(0, 1, -1, 'ladder-sandstone', 0, -1, 'panorama');
    bp.box(-2, 2, -1, 1, 2, 1, 'ladder-stone');
    bp.box(2, 1, -1, 2, 2, 1, 'ladder-sandstone');
    bp.post(2, -1, 3, 4, 'ladder-pine');
    bp.put(2, 3, 0, 'ladder-sandstone');
  }

  // School plans stay independent of the campaign's material remapping. All challenge
  // cells are ordinary whole cubes: support spreads upward and across each storey.
  function schoolLanternTower(bp) {
    // A 44-storey needle with a visible spiral stair-ribbon around its narrow core.
    // Every step joins the shaft at its own storey; the path never has to cross
    // a sealed balcony to continue upward.
    bp.box(-2, 0, -2, 2, 0, 2, 'ladder-stone');
    bp.box(0, 1, 0, 1, 35, 1, 'ladder-sandstone');
    const stair = [[-1, 0], [-1, 1], [-1, 2], [0, 2], [1, 2], [2, 2],
      [2, 1], [2, 0], [2, -1], [1, -1], [0, -1], [-1, -1]];
    for (let y = 1; y <= 35; y++) {
      const p = stair[(y - 1) % stair.length];
      const material = y % 6 === 0 ? 'ladder-brick-yellow' : 'ladder-pine';
      bp.put(p[0], y, p[1], material);
      if ((p[0] === -1 || p[0] === 2) && (p[1] === -1 || p[1] === 2)) {
        bp.put(p[0] === -1 ? 0 : 1, y, p[1], material);
      }
      if (y % 9 === 0) bp.box(0, y, 0, 1, y, 1, 'ladder-brick-yellow');
    }
    // An offset open lantern and a fine spire finish the silhouette.
    bp.box(-1, 36, -1, 2, 36, 2, 'ladder-pine');
    for (const x of [-1, 2]) {
      for (const z of [-1, 2]) bp.post(x, z, 37, 39, 'ladder-sandstone');
    }
    bp.box(-1, 40, -1, 2, 40, 2, 'ladder-pine');
    bp.box(0, 41, 0, 1, 41, 1, 'ladder-brick-yellow');
    bp.post(0, 0, 42, 43, 'ladder-brick-yellow');
  }

  function schoolAqueduct(bp) {
    // A long, low five-storey aqueduct: four stepped arches support a working
    // water channel. Reinforced shoes, cutwaters and a small end basin give the
    // silhouette detail without turning it into another tall or cubic arena.
    const piers = [-12, -6, 0, 6, 12];
    piers.forEach(function (x) {
      bp.box(x - 1, 0, -2, x + 1, 0, 2, 'ladder-concrete');
      bp.box(x - 1, 1, -1, x + 1, 2, 1, 'ladder-stone');
      bp.put(x, 1, 2, 'ladder-concrete');
      bp.put(x, 1, -2, 'ladder-concrete');
    });
    for (let i = 0; i < piers.length - 1; i++) {
      // Haunches narrow the opening toward its crown, making real arch-shaped voids.
      bp.box(piers[i] + 2, 2, -1, piers[i] + 2, 2, 1, 'ladder-sandstone');
      bp.box(piers[i + 1] - 2, 2, -1, piers[i + 1] - 2, 2, 1, 'ladder-sandstone');
    }
    bp.box(-13, 3, -1, 13, 3, 1, 'ladder-concrete');
    for (let x = -13; x <= 13; x++) {
      bp.put(x, 4, -1, x % 6 === 0 ? 'ladder-brick-yellow' : 'ladder-sandstone');
      bp.put(x, 4, 1, x % 6 === 0 ? 'ladder-brick-yellow' : 'ladder-sandstone');
      bp.water(x, 4, 0, 'ladder-concrete', 'pool');
    }
    // An asymmetric receiving basin at one end, with a short visible cascade.
    bp.box(-16, 0, -3, -13, 0, 3, 'ladder-concrete');
    bp.walls(-16, 1, -3, -13, 2, 3, 'ladder-stone');
    bp.box(-15, 1, -2, -14, 1, 2, 'ladder-concrete');
    for (let x = -15; x <= -14; x++) {
      for (let z = -2; z <= 2; z++) bp.water(x, 2, z, 'ladder-concrete', 'pool');
    }
    bp.water(-14, 3, 0, 'ladder-concrete', 'cascade');
    // Offset maintenance steps at the dry end avoid a mirrored second abutment.
    bp.box(13, 0, 2, 15, 0, 3, 'ladder-concrete');
    bp.box(13, 1, 2, 14, 1, 3, 'ladder-sandstone');
    bp.box(13, 2, 2, 13, 2, 3, 'ladder-sandstone');
  }

  function schoolCubicMonument(bp) {
    // A nine-by-nine-by-nine cube with asymmetric cuts and offset material
    // panels. The outer volume stays cubic from every side, while the openings
    // reveal a small stepped sculpture inside instead of a solid generic box.
    const materials = ['ladder-sandstone', 'ladder-concrete', 'ladder-pine', 'ladder-brick-yellow'];
    for (let y = 0; y <= 8; y++) {
      for (let z = -4; z <= 4; z++) {
        for (let x = -4; x <= 4; x++) {
          if (Math.abs(x) !== 4 && Math.abs(z) !== 4 && y !== 0 && y !== 8) continue;
          if (z === 4 && x >= -2 && x <= 0 && y >= 1 && y <= 5) continue;
          if (x === 4 && z >= -1 && z <= 2 && y >= 3 && y <= 6) continue;
          if (z === -4 && x >= -1 && x <= 1 && y >= 2 && y <= 4) continue;
          if (x === -4 && z >= -1 && z <= 1 && y >= 1 && y <= 3) continue;
          if (y === 8 && x >= 0 && x <= 2 && z >= -2 && z <= 0) continue;
          const panel = (Math.floor((x + 4) / 3) + 2 * Math.floor(y / 3) + Math.floor((z + 4) / 3)) % materials.length;
          bp.put(x, y, z, y === 0 ? 'ladder-stone' : materials[panel]);
        }
      }
    }
    bp.box(-2, 1, -2, 2, 1, 1, 'ladder-stone');
    bp.box(-1, 2, -2, 2, 2, 0, 'ladder-concrete');
    bp.box(0, 3, -2, 2, 3, -1, 'ladder-sandstone');
    bp.post(2, -2, 4, 6, 'ladder-brick-yellow');
  }

  function levelHqExchange(bp) {
    bp.box(-3, 0, -2, 3, 0, 2, 'ladder-sandstone');
    bp.put(0, 0, 3, 'ladder-sandstone');
    bp.walls(-3, 1, -2, 3, 2, 2, 'ladder-pine');
    bp.door(0, 1, 2, 'ladder-pine', 0, 1);
    bp.window(-1, 2, 2, 'ladder-stone', 0, 1, 'panorama');
    bp.window(1, 2, 2, 'ladder-stone', 0, 1, 'panorama');
    bp.box(-3, 3, -2, 3, 3, 2, 'ladder-stone');
  }

  function levelHqGarage(bp) {
    bp.box(-4, 0, -2, 4, 0, 2, 'ladder-sandstone');
    bp.walls(-4, 1, -2, 4, 1, 2, 'ladder-sandstone');
    bp.carve(-1, 2, 1, 1, 3);
    bp.box(-4, 2, -2, 4, 2, 2, 'ladder-brick-red');
  }

  function levelHqContracts(bp) {
    bp.box(-2, 0, -2, 2, 0, 2, 'ladder-sandstone');
    bp.put(0, 0, 3, 'ladder-sandstone');
    bp.walls(-2, 1, -2, 2, 2, 2, 'ladder-brick-red');
    bp.door(0, 1, 2, 'ladder-brick-red', 0, 1);
    bp.window(-2, 1, 0, 'ladder-pine', -1, 0, 'panorama');
    bp.window(2, 1, 0, 'ladder-pine', 1, 0, 'panorama');
    bp.box(-2, 3, -2, 2, 3, 2, 'ladder-pine');
  }

  function levelHome(bp) {
    bp.box(-2, 0, -1, 2, 0, 1, 'ladder-stone');
    bp.put(0, 0, 2, 'ladder-stone');
    bp.walls(-2, 1, -1, 2, 1, 1, 'ladder-stone');
    bp.door(0, 1, 1, 'ladder-stone', 0, 1);
    bp.window(-2, 1, 0, 'ladder-stone', -1, 0, 'panorama');
    bp.window(2, 1, 0, 'ladder-stone', 1, 0, 'panorama');
    bp.window(0, 1, -1, 'ladder-stone', 0, -1, 'panorama');
    bp.box(-2, 2, -1, 2, 2, 1, 'ladder-stone');
  }

  function levelCottage(bp) {
    bp.box(-2, 0, -1, 2, 0, 2, 'ladder-stone');
    bp.walls(-2, 1, -1, 2, 2, 2, 'ladder-stone');
    bp.carve(0, 2, 1, 2, 1);
    bp.box(-2, 3, -1, 2, 3, 2, 'ladder-sandstone');
    bp.box(-1, 4, -1, 1, 4, 2, 'ladder-sandstone');
  }

  function levelPorchHouse(bp) {
    bp.box(-2, 0, -1, 2, 0, 2, 'ladder-stone');
    bp.walls(-2, 1, -1, 2, 2, 2, 'ladder-stone');
    bp.carve(-1, 2, 1, 2, 2);
    bp.box(-2, 3, -1, 2, 3, 2, 'ladder-sandstone');
    bp.box(-1, 4, -1, 1, 4, 2, 'ladder-sandstone');
    bp.box(-1, 0, 3, 1, 0, 3, 'ladder-concrete');
    bp.post(-1, 3, 1, 2, 'ladder-concrete');
    bp.post(1, 3, 1, 2, 'ladder-concrete');
    bp.box(-1, 3, 3, 1, 3, 3, 'ladder-concrete');
  }

  function levelChimneyHouse(bp) {
    bp.box(-2, 0, -2, 2, 0, 2, 'ladder-stone');
    bp.walls(-2, 1, -2, 2, 2, 2, 'ladder-stone');
    bp.band(-2, 2, 2, -2, 2, 'ladder-concrete');
    bp.carve(0, 2, 1, 2, 1);
    bp.box(-2, 3, -2, 2, 3, 2, 'ladder-sandstone');
    bp.box(-1, 4, -2, 1, 4, 2, 'ladder-sandstone');
    bp.post(2, -2, 4, 6, 'ladder-pine');
  }

  function levelGoldHouse(bp) {
    bp.box(-3, 0, -2, 3, 0, 2, 'ladder-stone');
    bp.walls(-3, 1, -2, 3, 3, 2, 'ladder-stone');
    bp.band(-3, 3, 1, -2, 2, 'ladder-concrete');
    bp.carve(-1, 2, 1, 2, 2);
    bp.box(-3, 4, -2, 3, 4, 2, 'ladder-sandstone');
    bp.box(-2, 5, -2, 2, 5, 2, 'ladder-sandstone');
    bp.box(-1, 6, -2, 1, 6, 2, 'ladder-oak');
    bp.post(-1, 2, 1, 2, 'ladder-oak');
    bp.post(1, 2, 1, 2, 'ladder-oak');
  }

  function levelWingHouse(bp) {
    bp.box(-3, 0, -1, 1, 0, 2, 'ladder-stone');
    bp.walls(-3, 1, -1, 1, 2, 2, 'ladder-stone');
    bp.carve(-1, 2, 1, 2, 1);
    bp.box(-3, 3, -1, 1, 3, 2, 'ladder-sandstone');
    bp.box(-2, 4, -1, 0, 4, 2, 'ladder-oak');
    bp.box(2, 0, -1, 4, 0, 1, 'ladder-stone');
    bp.walls(2, 1, -1, 4, 1, 1, 'ladder-concrete');
    bp.box(2, 2, -1, 4, 2, 1, 'ladder-brick-yellow');
  }

  function levelWorkshopHouse(bp) {
    bp.box(-3, 0, -2, 3, 0, 2, 'ladder-stone');
    bp.walls(-3, 1, -2, 3, 3, 2, 'ladder-stone');
    bp.band(-3, 3, 2, -2, 2, 'ladder-concrete');
    bp.carve(-2, 2, 1, 2, 2);
    bp.box(-3, 4, -2, 3, 4, 2, 'ladder-sandstone');
    bp.box(-1, 5, -2, 1, 5, 2, 'ladder-oak');
    bp.box(-3, 0, 3, 0, 0, 4, 'ladder-brick-red');
    bp.post(-3, 3, 1, 2, 'ladder-brick-red');
    bp.post(0, 3, 1, 2, 'ladder-brick-red');
    bp.box(-3, 3, 3, 0, 3, 4, 'ladder-brick-red');
  }

  function levelStoreHouse(bp) {
    bp.box(-5, 0, -2, 5, 0, 2, 'ladder-brick-white');
    bp.walls(-5, 1, -2, 5, 3, 2, 'ladder-stone');
    bp.band(-5, 5, 3, -2, 2, 'ladder-brick-red');
    bp.carve(-1, 2, 1, 3, 3);
    bp.box(-5, 4, -2, 5, 4, 2, 'ladder-sandstone');
    bp.box(-3, 5, -2, 3, 5, 2, 'ladder-oak');
  }

  const LEVEL_SPECS = [
    { name: 'Маленький дом', pace: 1, mineGap: 5, blurb: 'Низкий каменный дом: дверь, окна и крыша в три блока.', build: levelHome },
    { name: 'Изба', pace: 1, mineGap: 6, blurb: 'К каменному дому добавляется песчаниковая крыша.', build: levelCottage },
    { name: 'Дом с крыльцом', pace: 1, mineGap: 7, blurb: 'Бетонное крыльцо и наличники.', build: levelPorchHouse },
    { name: 'Дом с трубой', pace: 1.05, mineGap: 8, blurb: 'Сосновая труба над жилым домом.', build: levelChimneyHouse },
    { name: 'Дом старосты', pace: 1.08, mineGap: 9, blurb: 'Дубовая отделка двери и конька.', build: levelGoldHouse },
    { name: 'Жёлтый флигель', pace: 1.1, mineGap: 10, blurb: 'Жёлтый кирпич появляется на крыше флигеля.', build: levelWingHouse },
    { name: 'Мастерская', pace: 1.12, mineGap: 11, blurb: 'Красный кирпич на ставни и верстачный навес.', build: levelWorkshopHouse },
    { name: 'Амбар', pace: 1.15, mineGap: 12, blurb: 'Фундамент из белого кирпича.', build: levelStoreHouse },
    { name: 'Цитадель', pace: 0.98, mineGap: 12, blurb: 'Двор и четыре угловые башни', build: levelCitadel },
    { name: 'Собор рудокопов', pace: 1.14, mineGap: 12, blurb: 'Неф, трансепт и две башни', build: levelCathedral },
    { name: 'Рудный мост', pace: 1, mineGap: 10, blurb: 'Две башни и пролёт над пустотой', build: levelBridge },
    { name: 'Плавильный цех', pace: 1, mineGap: 10, blurb: 'Неф, печь и две трубы', build: levelFoundry },
    { name: 'Маяк старателей', pace: 1, mineGap: 10, blurb: 'Галерея и фонарная', build: levelLighthouse },
    { name: 'Акведук', pace: 1, mineGap: 10, blurb: 'Пять быков и русло', build: levelAqueduct },
    { name: 'Утёсная крепость', pace: 1, mineGap: 10, blurb: 'Стены, донжон и надвратные башни', build: levelFortress },
    { name: 'Ратуша', pace: 1, mineGap: 10, blurb: 'Портик, крыло и часовая башня', build: levelTownHall },
    { name: 'Обсерватория', pace: 1, mineGap: 10, blurb: 'Купол, крыло и зрительная труба', build: levelObservatory },
    { name: 'Верфь', pace: 1, mineGap: 10, blurb: 'Док, кран и корпус', build: levelShipyard },
    { name: 'Монастырь', pace: 1, mineGap: 10, blurb: 'Клуатр, часовня и колодец', build: levelMonastery },
    { name: 'Горный дворец', pace: 1, mineGap: 10, blurb: 'Террасы, минареты и купол', build: levelPalace },
    { name: 'Стекольная мануфактура', pace: 1, mineGap: 12, blurb: 'Высокие окна плавильного зала', build: levelGlassFoundry },
    { name: 'Зимняя галерея', pace: 1, mineGap: 12, blurb: 'Светлый зал с рядами окон', build: levelWinterGallery },
    { name: 'Дом гильдии', pace: 1, mineGap: 12, blurb: 'Связанные дверями внутренние залы', build: levelGuildHouse },
    { name: 'Четыре двора', pace: 1, mineGap: 12, blurb: 'Сквозные входы и поперечные проходы', build: levelFourCourts },
    { name: 'Железная переправа', pace: 1, mineGap: 13, blurb: 'Металлический мост между башнями', build: levelIronCrossing },
    { name: 'Хрустальный виадук', pace: 1, mineGap: 13, blurb: 'Стеклянный пролёт над дорогой', build: levelCrystalViaduct },
    { name: 'Королевская биржа', pace: 1, mineGap: 15, blurb: 'Окна, двери и стеклянный переход', build: levelRoyalExchange },
    { name: 'Небесный дворец', pace: 1, mineGap: 16, blurb: 'Большой комплекс со всеми типами проходов', build: levelSkyPalace },
    { name: 'Каскадный форум', pace: 1, mineGap: 18, blurb: 'Разновысотные корпуса, парящие галереи и веерные кровли', build: levelCascadeForum },
    { name: 'Призматическая академия', pace: 1, mineGap: 19, blurb: 'Асимметричный кампус с консольными башнями и стеклянными мостами', build: levelPrismaticAcademy },
    { name: 'Галерея созвездий', pace: 1, mineGap: 16, blurb: 'Круглые, треугольные и розеточные окна в каскадных объёмах', build: levelCelestialGallery },
    { name: 'Дом граней', pace: 1, mineGap: 16, blurb: 'Ломаные корпуса с арочными и ромбическими окнами', build: levelHouseOfFacets },
    { name: 'Эйфелева башня', pace: 1, mineGap: 19, blurb: 'Ажурная железная башня с тремя обзорными ярусами', build: levelEiffelTower },
    { name: 'Главное здание МГУ', pace: 1, mineGap: 20, blurb: 'Ступенчатая высотка с крыльями и золотым шпилем', build: levelMsu },
    { name: 'Колизей', pace: 1, mineGap: 20, blurb: 'Эллиптическая арена с аркадами и разрушенным сектором', build: levelColosseum },
    { name: 'Саграда Фамилия', pace: 1, mineGap: 21, blurb: 'Органические башни, роза и многослойный каменный лес', build: levelSagrada },
    { name: 'Шёлковое веретено', pace: 1, mineGap: 20, blurb: 'Закрученная стеклянная башня, небесный нимб и цепные арки', build: levelSilkSpindle },
    { name: 'Опера раковин', pace: 1, mineGap: 20, blurb: 'Паруса-оболочки, стеклянные устья и параболическая галерея', build: levelShellOpera },
    { name: 'Чертог колец', pace: 1, mineGap: 20, blurb: 'Сцепленные обручи, лестница в колесе и небесное кольцо', build: levelRingHall },
    { name: 'Зонты ветра', pace: 1, mineGap: 20, blurb: 'Седловые кровли на одной опоре, стеклянные долины и железные подкосы', build: levelWindUmbrellas },
    { name: 'Эйфелева башня — шедевр', pace: 1, mineGap: 22, blurb: 'Изогнутые опоры, гигантские арки, ажурная ферма и три обзорные площадки', build: levelEiffelMasterwork },
    { name: 'Саграда Фамилия — шедевр', pace: 1, mineGap: 23, blurb: 'Древесные колонны, нервюрные своды, скульптурный фасад и лес башен', build: levelSagradaMasterwork },
    { name: 'Кольцо биокуполов', pace: 1, mineGap: 18, blurb: 'Башня, кольцевой сад и стеклянные купола на светящихся трубах', build: levelElementPavilion },
    { name: 'Стеклянный фонарь', pace: 1, mineGap: 14, blurb: 'Четыре стены из сплошных панорамных окон', build: levelWindowLantern },
    { name: 'Воротный дом', pace: 1, mineGap: 14, blurb: 'Две башни и ряды дверей в два яруса', build: levelDoorHouse },
    { name: 'Мостовой двор', pace: 1, mineGap: 14, blurb: 'Каменные, металлические и стеклянные перекрёстные пролёты', build: levelBridgeCourt },
    { name: 'Дом кровель', pace: 1, mineGap: 14, blurb: 'Двускатная кровля из сплошных наклонных плит', build: levelSlopeRoofs },
    { name: 'Балочный навес', pace: 1, mineGap: 14, blurb: 'Два яруса перекрёстных балок на колоннах', build: levelBeamCanopy },
    { name: 'Башня ферм', pace: 1, mineGap: 14, blurb: 'Четыре решётчатые стены из раскосов', build: levelBraceTower },
    { name: 'Квадратная аркада', pace: 1, mineGap: 14, blurb: 'Двухъярусный клуатр из круглых и стрельчатых арок', build: levelArchCloister },
    { name: 'Парадный марш', pace: 1, mineGap: 14, blurb: 'Широкая лестница и два боковых марша', build: levelGrandStair },
    { name: 'Дом балконов', pace: 1, mineGap: 14, blurb: 'Башня с балконами на всех четырёх сторонах', build: levelBalconyHouse },
    { name: 'Поле куполов', pace: 1, mineGap: 16, blurb: 'Девять куполов на общем подиуме', build: levelDomeField },
    { name: 'Двор фонарей', pace: 1, mineGap: 14, blurb: 'Решётка тёплых и холодных фонарей', build: levelLampCourt },
    { name: 'Каменные бани', pace: 1, mineGap: 14, blurb: 'Большой бассейн, каналы и каскад', build: levelWaterBaths },
    { name: 'Висячие сады', pace: 1, mineGap: 14, blurb: 'Четыре яруса лиан и кустов на стенах', build: levelHangingGarden },
    { name: 'Вантовый мост', pace: 1, mineGap: 14, blurb: 'Прямые светящиеся канаты и провисшие гирлянды', build: levelCableBridge },
  ];

  // Heaviest material of a campaign level, by the calendar (docs/gdd/13-timeline.md): the level's
  // whole material set is shifted up the ladder so its heaviest material lands here. Levels 1–12
  // keep their hand-picked materials. Day 1: stone → white brick; day 2: bronze → steel; days 3–4:
  // marble; days 5–7: grid 2; days 8–12: grid 3; days 15–20: grid 4; days 25–30: grid 5.
  const LEVEL_MATERIAL_TOPS = {
    13: 'ladder-marble', 14: 'ladder-marble', 15: 'ladder-marble-white', 16: 'ladder-marble-white',
    17: 'ladder-marble-black', 18: 'ladder-marble-black', 19: 'ladder-steel-stainless',
    20: 'ladder-steel-hard', 21: 'ladder-steel-mirror', 22: 'ladder-marble-polished',
    23: 'ladder-marble-rose', 24: 'ladder-silver', 25: 'ladder-malachite', 26: 'ladder-malachite',
    27: 'ladder-jade', 28: 'ladder-jade', 29: 'ladder-onyx', 30: 'ladder-obsidian',
    31: 'ladder-obsidian', 32: 'ladder-obsidian-black', 33: 'ladder-diamond', 34: 'ladder-diamond',
    35: 'ladder-diamond-pure', 36: 'ladder-diamond-black', 37: 'ladder-platinum',
    38: 'ladder-platinum', 39: 'ladder-platinum-pure', 40: 'ladder-platinum-pure',
    41: 'ladder-platinum-white', 42: 'ladder-platinum-mirror', 43: 'ladder-platinum-mirror',
    44: 'ladder-platinum-black', 45: 'ladder-platinum-royal', 46: 'ladder-platinum-royal',
    47: 'ladder-platinum-imperial', 48: 'ladder-platinum-imperial', 49: 'ladder-platinum-imperial',
    50: 'ladder-diamond-royal', 51: 'ladder-diamond-royal', 52: 'ladder-diamond-royal',
    53: 'ladder-diamond-imperial', 54: 'ladder-diamond-imperial', 55: 'ladder-diamond-imperial',
    56: 'ladder-diamond-final', 57: 'ladder-diamond-final',
  };

  root.MicroBuilderLevelSpecs = LEVEL_SPECS;
  root.MicroBuilderLevelMaterialTops = LEVEL_MATERIAL_TOPS;
  root.MicroBuilderSchoolSpecs = [
    { id: 'tower', name: 'Ступенчатый маяк', pace: 1, mineGap: 5, blurb: 'Тонкая башня в 44 яруса, спиральная лестница и открытый фонарь. Испытание высотой.', build: schoolLanternTower },
    { id: 'foundation', name: 'Каменный акведук', pace: 1, mineGap: 5, blurb: 'Вытянутый акведук в пять этажей: четыре арки, водный канал и приёмный бассейн.', build: schoolAqueduct },
    { id: 'monument', name: 'Куб стихий', pace: 1, mineGap: 5, blurb: 'Кубический памятник 9 × 9 × 9 с асимметричными проёмами и панелями разных материалов.', build: schoolCubicMonument },
  ];
  root.MicroBuilderHqSpecs = [
    { id: 'office', name: 'Главный офис', pace: 1, mineGap: 5, blurb: 'Простой штаб компании. Пока его не сдадут, отделы не работают.', build: levelHqOffice },
    { id: 'tech', name: 'Технологический центр', pace: 1, mineGap: 6, blurb: 'Лаборатория новых прокачек стройки.', build: levelHqTech },
    { id: 'personnel', name: 'Центр персонала', pace: 1, mineGap: 6, blurb: 'Кухня и быт бригады.', build: levelHqPersonnel },
    { id: 'exchange', name: 'Биржа', pace: 1, mineGap: 7, blurb: 'Зал старых заказов.', build: levelHqExchange },
    { id: 'recruiting', name: 'Школа бригадиров', pace: 1, mineGap: 6, blurb: 'Учебный класс и тренировочная башня. Здесь бригады проходят испытания на время.', build: levelHqRecruiting },
    { id: 'garage', name: 'Гараж', pace: 1, mineGap: 6, blurb: 'Бокс для первой машины.', build: levelHqGarage },
    { id: 'contracts', name: 'Контрактное бюро', pace: 1, mineGap: 7, blurb: 'Дом испытаний.', build: levelHqContracts },
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
