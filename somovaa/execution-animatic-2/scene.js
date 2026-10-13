// 3D blocking scene for both parts. Part A: execution on the square. Part B: street → workshop → Pudge is born.
const RENDER = new URLSearchParams(location.search).get('render') === '1';
const RW = RENDER ? 540 : 360, RH = RENDER ? 960 : 640;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, eo = t => 1 - Math.pow(1 - t, 3);
const V = (x, y, z) => new THREE.Vector3(x, y, z), PI = Math.PI;

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(RENDER ? 1 : Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(RW, RH, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xd5d9de); scene.fog = new THREE.Fog(0xd5d9de, 18, 45);
const cam = new THREE.PerspectiveCamera(45, 9 / 16, .03, 200);

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, .5));
const sun = new THREE.DirectionalLight(0xffffff, .62); sun.castShadow = true; scene.add(sun, sun.target);
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0008; sun.shadow.normalBias = .02;
Object.assign(sun.shadow.camera, {left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40});

// neutral greys only: characters differ by shape and size, not by colour
const C = {ground: 0xb8b3a9, street: 0xaaa59b, house: 0x9c988f, roof: 0x85817a, peasant: 0x95979c, miss: 0xa9abb0, knight: 0x72767d, helm: 0x666a71,
  wood: 0x6b655d, steel: 0xc9cdd3, rope: 0x4a4744, stump: 0x7c756b, wall: 0xa49f96, floor: 0x8f897f, mask: 0xd8d8d5, dark: 0x3d4046};
const mat = c => new THREE.MeshLambertMaterial({color: c});
function mesh(geo, c, parent, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat(c)); m.castShadow = m.receiveShadow = true; m.position.set(x, y, z); (parent || scene).add(m); return m; }
const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); (parent || scene).add(g); return g; };
const cap = (r, len) => new THREE.CapsuleGeometry(r, Math.max(.001, len - 2 * r), 4, 10);

const ground = mesh(new THREE.PlaneGeometry(200, 200), C.ground); ground.rotation.x = -PI / 2;
function house(x, z, w, h, d = 4) {
  mesh(new THREE.BoxGeometry(w, h, d), C.house, null, x, h / 2, z);
  const roof = mesh(new THREE.CylinderGeometry(0, w * .72, 2.2, 4, 1), C.roof, null, x, h + 1.1, z); roof.rotation.y = PI / 4; roof.scale.z = d / w * .7;
}

/* humanoid mannequin. Local +z = forward; rotation.x > 0 on spine = bend forward, on limbs = swing back. */
function humanoid(p, c) {
  const root = grp(), pelvis = grp(root, 0, p.thigh + p.shin, 0), fat = [];
  mesh(new THREE.SphereGeometry(p.hipW * .55, 14, 10), c, pelvis).scale.set(1.25, .8, 1);
  const spine = grp(pelvis);
  const chest = mesh(cap(p.chest, p.torso), c, spine, 0, p.torso / 2, 0); chest.scale.set(p.chestX || 1.25, 1, p.chestZ || .9);
  const belly = mesh(new THREE.SphereGeometry(1, 16, 12), c, spine, 0, p.torso * .38, 0); belly.scale.setScalar(p.belly || .001);
  const neck = grp(spine, 0, p.torso, 0);
  const head = grp(neck, 0, p.head + .03, 0);
  mesh(new THREE.SphereGeometry(p.head, 18, 14), c, head);
  const nose = mesh(new THREE.BoxGeometry(p.head * .3, p.head * .45, p.head * .5), c, head, 0, -p.head * .05, p.head * .9); // shows where the face points
  const limb = (parent, x, y, l1, l2, r) => {
    const a = grp(parent, x, y, 0); fat.push(mesh(cap(r, l1), c, a, 0, -l1 / 2, 0));
    const b = grp(a, 0, -l1, 0); fat.push(mesh(cap(r * .9, l2), c, b, 0, -l2 / 2, 0));
    const end = grp(b, 0, -l2, 0); return {a, b, end};
  };
  const sh = p.torso - p.chest * .6;
  const armL = limb(spine, p.shoulder, sh, p.upper, p.fore, p.armR), armR = limb(spine, -p.shoulder, sh, p.upper, p.fore, p.armR);
  const legL = limb(pelvis, p.hipW * .45, 0, p.thigh, p.shin, p.legR), legR = limb(pelvis, -p.hipW * .45, 0, p.thigh, p.shin, p.legR);
  for (const l of [legL, legR]) mesh(new THREE.BoxGeometry(p.legR * 1.8, p.legR * .9, p.legR * 3), c, l.end, 0, 0, p.legR * .9);
  for (const a of [armL, armR]) mesh(new THREE.SphereGeometry(p.armR * 1.1, 10, 8), c, a.end);
  return {root, pelvis, spine, neck, head, nose, armL, armR, legL, legR, chest, belly, fat, p};
}
const setLimb = (l, ax, az, bx) => { l.a.rotation.set(ax, 0, az); l.b.rotation.set(bx, 0, 0); };
function legsStand(h) { setLimb(h.legL, 0, 0, 0); setLimb(h.legR, 0, 0, 0); h.pelvis.position.y = h.p.thigh + h.p.shin; }
function walkLegs(h, ph) { const a = Math.sin(ph) * .55; setLimb(h.legL, -a, 0, Math.max(0, a) * .8); setLimb(h.legR, a, 0, Math.max(0, -a) * .8); h.pelvis.position.y = h.p.thigh + h.p.shin - Math.abs(Math.sin(ph)) * .015; }
function hugArms(h) { setLimb(h.armL, -1.05, -.55, -1.1); setLimb(h.armR, -1.05, .55, -1.1); }

/* knight ≈ 1.85 m */
const KN = {thigh: .46, shin: .45, torso: .6, chest: .2, head: .13, hipW: .32, shoulder: .25, upper: .3, fore: .28, armR: .06, legR: .075};
function knight(x, z, ry) {
  const k = humanoid(KN, C.knight); k.root.position.set(x, 0, z); k.root.rotation.y = ry;
  mesh(new THREE.CylinderGeometry(.15, .15, .3, 14), C.helm, k.head, 0, .03, 0);
  mesh(new THREE.BoxGeometry(.32, .03, .03), C.dark, k.head, 0, .05, .15);
  return k;
}
/* peasant ≈ 1.8 m, plain tunic */
const PEA = {thigh: .44, shin: .43, torso: .58, chest: .19, head: .14, hipW: .3, shoulder: .24, upper: .29, fore: .27, armR: .06, legR: .075};
function peasant() { const r = humanoid(PEA, C.peasant); mesh(new THREE.CylinderGeometry(.2, .27, .32, 14, 1, true), C.peasant, r.pelvis, 0, -.08, 0); return r; }
const HR = PEA.head;
/* Miss Pudge: a little shorter than the knights (≈ 1.65 m), big head, dress */
const MPS = 1.28;
const MP = humanoid({thigh: .27, shin: .26, torso: .36, chest: .14, head: .19, hipW: .22, shoulder: .17, upper: .18, fore: .17, armR: .045, legR: .055}, C.miss);
MP.root.scale.setScalar(MPS);
mesh(new THREE.ConeGeometry(.3, .45, 14, 1, true), C.miss, MP.pelvis, 0, -.15, 0);
mesh(new THREE.SphereGeometry(.2, 14, 10, 0, PI * 2, 0, PI * .55), C.miss, MP.head, 0, .03, -.03);
const needle = mesh(new THREE.CylinderGeometry(.006, .006, .14, 6), C.steel, MP.armR.end, 0, -.05, .04); needle.rotation.x = .9;
const chestPoint = () => MP.spine.localToWorld(V(0, .2, .26));

/* ===== Part A set: town square ===== */
[[-7, -13, 4, 4.5], [-2.2, -14, 4.5, 6], [3, -13, 4, 4], [8, -14, 5, 5.5], [13, -11, 4, 4.5], [-12, -10, 4, 5], [8.5, -2.6, 4, 4.5], [8.5, 4.6, 4, 5]].forEach(a => house(...a));
const PE = peasant();
PE.root.rotation.y = PI / 2; PE.pelvis.position.y = PEA.thigh + .07;
setLimb(PE.legL, 0, 0, PI / 2); setLimb(PE.legR, 0, 0, PI / 2);
PE.legL.end.children[0].rotation.x = PI / 2; PE.legR.end.children[0].rotation.x = PI / 2;
PE.spine.rotation.x = 1.2; PE.neck.rotation.x = .4;
// wrists tied on the small of the back
PE.armL.a.rotation.set(-.35, 0, -.25); PE.armL.b.rotation.set(-1.5, 0, 0);
PE.armR.a.rotation.set(-.35, 0, .25); PE.armR.b.rotation.set(-1.5, 0, 0);
scene.updateMatrixWorld(true);
{ const w = PE.armL.end.getWorldPosition(V()).add(PE.armR.end.getWorldPosition(V())).multiplyScalar(.5);
  const r = mesh(new THREE.TorusGeometry(.075, .025, 6, 14), C.rope, null, w.x, w.y, w.z); r.rotation.y = PI / 2; }
const HEAD0 = PE.head.getWorldPosition(V());
const STUMP = V(HEAD0.x - .02, 0, 0), STUMP_H = HEAD0.y - HR * .95;
mesh(new THREE.CylinderGeometry(.3, .36, STUMP_H, 14), C.stump, null, STUMP.x, STUMP_H / 2, 0);
const EX = knight(STUMP.x - .1, -1.25, 0);
const axe = grp(EX.armR.end);
mesh(new THREE.CylinderGeometry(.03, .035, 1.15, 8), C.wood, axe, 0, -.42, 0);
mesh(new THREE.BoxGeometry(.04, .38, .34), C.steel, axe, 0, -.88, .18);
function poseEx(raise, lean) {
  for (const [arm, s] of [[EX.armL, 1], [EX.armR, -1]]) { arm.a.rotation.set(raise, 0, s * -.32); arm.b.rotation.set(-.35, 0, s * .1); }
  EX.spine.rotation.x = lean; EX.legL.a.rotation.x = -.15; EX.legR.a.rotation.x = .2;
  EX.pelvis.position.y = KN.thigh + KN.shin - Math.max(0, lean) * .12;
}
const MP0 = V(STUMP.x + .6, 0, -3.4);
const KL = knight(MP0.x + .7, MP0.z - .25, 0), KR = knight(MP0.x - .7, MP0.z - .25, 0);

/* free head (cut off → rolls away → found → carried → sewn back), nose on local +x of fh */
const freeHead = grp(), fh = grp(freeHead);
mesh(new THREE.SphereGeometry(HR, 18, 14), C.peasant, fh);
mesh(new THREE.BoxGeometry(HR * .45, HR * .5, HR * .3), C.peasant, fh, HR * .9, -HR * .05, 0);

/* ===== Part B set: a street, then the workshop interior ===== */
const S = V(-40, 0, 0);
mesh(new THREE.BoxGeometry(30, .02, 3.2), C.street, null, S.x, .01, S.z + .4);
[[-9, 4.2, 4.5], [-4.6, 4, 4], [-.2, 4.4, 5], [4.6, 4.2, 4.5], [9, 4, 4]].forEach(([x, w, h]) => house(S.x + x, S.z - 3.0, w, h));
[[-7, 4.2, 4.5], [-2.6, 4, 5], [1.8, 4.2, 4], [6.2, 4.4, 4.5]].forEach(([x, w, h]) => house(S.x + x, S.z + 4.2, w, h));
const H = V(S.x + .6, HR, S.z + .35);                      // where the head stops on the street
const DOOR = V(S.x + 3.0, 0, S.z - 1.0);              // workshop door in the house front (z = -1.0)
const doorPivot = grp(null, DOOR.x - .45, 0, DOOR.z + .02);
mesh(new THREE.BoxGeometry(.9, 1.7, .06), C.wood, doorPivot, .45, .85, 0);

const W = V(40, 0, 0);
mesh(new THREE.BoxGeometry(9, 3.6, .2), C.wall, null, W.x, 1.8, W.z - 2.4);
mesh(new THREE.BoxGeometry(.2, 3.6, 5.5), C.wall, null, W.x - 3.6, 1.8, W.z);
mesh(new THREE.BoxGeometry(9, .02, 6), C.floor, null, W.x, .01, W.z);
for (const [x, y] of [[-2.2, 1.4], [-2.2, 2.0], [.4, 1.6], [1.9, 1.6]]) mesh(new THREE.BoxGeometry(1.1, .06, .35), C.wood, null, W.x + x, y, W.z - 2.15);
for (const [x, y, s] of [[-2.5, 1.55, .2], [-2.0, 1.53, .16], [.2, 1.74, .22], [.7, 1.72, .18], [-2.35, 2.15, .2], [2.1, 1.72, .2]]) mesh(new THREE.BoxGeometry(s, s * 1.3, s), C.house, null, W.x + x, y, W.z - 2.15);

/* body on the table, on its back, head toward -x. It grows around the head (head stays where it was sewn). */
const TBL_Y = .8;
const bodyP = grp(null, 0, TBL_Y + .17, W.z); bodyP.rotation.y = PI / 2;
const PB = peasant(); bodyP.add(PB.root); PB.root.rotation.x = -PI / 2;
bodyP.position.x = 0; scene.updateMatrixWorld(true);
const LHEAD = -PB.head.getWorldPosition(V()).x;        // feet → head distance along -x at scale 1
const HEADW = V(W.x - 1.4, 0, W.z);                     // sewn head x
const SCALE_PUDGE = 2.05;                               // Pudge ≈ 2× a knight
const TBL = {x0: HEADW.x - .3, x1: HEADW.x + LHEAD * SCALE_PUDGE + .3, d: .9};
mesh(new THREE.BoxGeometry(TBL.x1 - TBL.x0, .08, TBL.d), C.wood, null, (TBL.x0 + TBL.x1) / 2, TBL_Y - .04, W.z);
for (const x of [TBL.x0 + .1, (TBL.x0 + TBL.x1) / 2, TBL.x1 - .1]) for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(.08, TBL_Y - .08, .08), C.wood, null, x, (TBL_Y - .08) / 2, W.z + sz * (TBL.d / 2 - .08));
const FAT0 = PB.fat.map(m => m.scale.clone());
const MPW = V(HEADW.x - .62, 0, W.z);                   // Miss Pudge at the head end of the table, facing +x

/* Pudge mask: half shell over the face (+z of the head) with eye holes */
const mask = grp(); mask.matrixAutoUpdate = false;
const shell = mesh(new THREE.SphereGeometry(1, 18, 12, 0, PI, 0, PI), C.mask, mask); shell.material.side = THREE.DoubleSide; shell.scale.setScalar(HR * 1.08); shell.castShadow = false;
for (const x of [-.38, .38]) mesh(new THREE.SphereGeometry(HR * .16, 10, 8), C.dark, mask, x * HR, HR * .22, HR * .99);
mesh(new THREE.BoxGeometry(HR * .8, HR * .07, HR * .1), C.dark, mask, 0, -HR * .42, HR * .96);

/* ===== timeline marks ===== */
const TA = {raise0: 2.45, raise1: 3.1, strike0: 3.48, strike1: 3.8, cut: SHOTS_A[4].start};
const TB = {pick: SHOTS_B[1].start, walk: SHOTS_B[2].start, shop: SHOTS_B[3].start, mask: SHOTS_B[4].start, grow: SHOTS_B[5].start, joy: SHOTS_B[6].start};

function exAt(t) {
  if (PART !== 'A') return;
  const r = eio(seg(t, TA.raise0, TA.raise1)), s = Math.pow(seg(t, TA.strike0, TA.strike1), 2);
  let raise = lerp(-.55, -3.35, r), lean = lerp(.05, -.18, r);
  if (t > TA.raise1 && t < TA.strike0) raise += Math.sin((t - TA.raise1) * 9) * .02;
  poseEx(lerp(raise, -.55, s), lerp(lean, .5, s));
}
function knightsAt(t) {
  const pull = .5 + .5 * Math.sin(t * 3.1);
  for (const [k, s] of [[KL, 1], [KR, -1]]) {
    const inner = s > 0 ? k.armR : k.armL, outer = s > 0 ? k.armL : k.armR;
    k.spine.rotation.x = -.08 - .05 * pull; k.root.position.z = MP0.z - .3 + .1 * pull;
    setLimb(inner, -.95, s * -.2, -.45); setLimb(outer, -.8, s * -.7, -.8); k.head.rotation.y = s * -.25;
  }
}

function missAt(t) {
  MP.root.rotation.set(0, 0, 0); MP.root.position.y = 0; MP.spine.rotation.set(0, 0, 0); MP.neck.rotation.set(0, 0, 0); MP.head.rotation.set(0, 0, 0); legsStand(MP);
  needle.visible = false; MP.root.visible = true;
  if (PART === 'A') { // held by the knights, sobbing
    const sob = Math.sin(t * 19) * .05, pull = .5 + .5 * Math.sin(t * 3.1), strain = t > 1.4 ? .25 : .12;
    MP.spine.rotation.x = .2 + strain * pull + sob; MP.neck.rotation.x = .35 + sob * 1.6; MP.head.rotation.y = Math.sin(t * 2.3) * .15;
    MP.root.position.set(MP0.x, 0, MP0.z + strain * pull * .25);
    setLimb(MP.armL, .6, .55, -.2); setLimb(MP.armR, .6, -.55, -.2);
    return;
  }
  if (t < TB.pick) { MP.root.visible = false; return; }
  if (t < TB.walk) { // walks up from the right, crouches, lifts the head, hugs it
    const arrive = seg(t, TB.pick, TB.pick + .55), stand = V(H.x + .5, 0, H.z);
    MP.root.rotation.y = -PI / 2; MP.root.position.set(lerp(H.x + 2.2, stand.x, arrive), 0, H.z);
    if (arrive < 1) { walkLegs(MP, (t - TB.pick) * 14); setLimb(MP.armL, Math.sin((t - TB.pick) * 14) * .3, 0, -.2); setLimb(MP.armR, -Math.sin((t - TB.pick) * 14) * .3, 0, -.2); return; }
    const down = eio(seg(t, TB.pick + .55, TB.pick + .9)) * (1 - eio(seg(t, TB.pick + 1.0, TB.pick + 1.3)));
    setLimb(MP.legL, -1.3 * down, 0, 1.6 * down); setLimb(MP.legR, -1.3 * down, 0, 1.6 * down);
    MP.pelvis.position.y = lerp(.53, .3, down); MP.spine.rotation.x = .7 * down; MP.neck.rotation.x = .3 * down;
    const hug = eio(seg(t, TB.pick + 1.0, TB.pick + 1.35));
    setLimb(MP.armL, lerp(-1.1, -1.05, hug), lerp(-.25, -.55, hug), lerp(-.3, -1.1, hug)); setLimb(MP.armR, lerp(-1.1, -1.05, hug), lerp(.25, .55, hug), lerp(-.3, -1.1, hug));
    MP.head.rotation.x = .2 * hug;
    return;
  }
  if (t < TB.shop) { // carries it to the workshop door and goes in
    const u = seg(t, TB.walk, TB.shop - .05), a = V(H.x + .5, 0, H.z), b = V(DOOR.x, 0, DOOR.z - .2);
    MP.root.position.copy(a.lerp(b, u)); MP.root.rotation.y = Math.atan2(b.x - (H.x + .5), b.z - H.z);
    walkLegs(MP, (t - TB.walk) * 14); hugArms(MP); MP.spine.rotation.x = .12; MP.head.rotation.x = .15;
    return;
  }
  // workshop: at the head end of the table, facing along the body (+x)
  MP.root.position.copy(MPW); MP.root.rotation.y = PI / 2;
  if (t < TB.grow) {
    MP.spine.rotation.x = .38; MP.neck.rotation.x = .35; MP.head.rotation.x = .25;
    if (t < TB.shop + .55) { const pl = eio(seg(t, TB.shop + .05, TB.shop + .5)); setLimb(MP.armL, lerp(-1.05, -1.0, pl), lerp(-.55, -.25, pl), lerp(-1.1, -.3, pl)); setLimb(MP.armR, lerp(-1.05, -1.0, pl), lerp(.55, .25, pl), lerp(-1.1, -.3, pl)); }
    else if (t < TB.mask) { needle.visible = true; const st = Math.sin((t - TB.shop) * 12); setLimb(MP.armL, -.95, -.15, -.4); setLimb(MP.armR, -1.05 + st * .28, .3 + st * .15, -.5 - st * .35); }
    else { const lo = eio(seg(t, TB.mask + .3, TB.mask + .7)); setLimb(MP.armL, lerp(-1.7, -1.0, lo), -.25, lerp(-.5, -.25, lo)); setLimb(MP.armR, lerp(-1.7, -1.0, lo), .25, lerp(-.5, -.25, lo)); }
  } else if (t < TB.joy) { // steps back, hands to her mouth
    const b = eio(seg(t, TB.grow + .1, TB.grow + .6));
    MP.root.position.x = MPW.x - .55 * b;
    MP.spine.rotation.x = lerp(.55, -.12, b); setLimb(MP.armL, -2.2 * b, -.5 * b, -2.0 * b); setLimb(MP.armR, -2.2 * b, .5 * b, -2.0 * b);
  } else { // jumps for joy, then runs to his side and hugs him
    const j = t - TB.joy, jump = j < .6 ? Math.max(0, Math.sin(j / .3 * PI)) * .22 : 0;
    const go = eio(seg(t, TB.joy + .6, TB.joy + 1.0));
    const P = PB.pelvis.getWorldPosition(V());
    const side = V(P.x + .25, 0, W.z + TBL.d / 2 + .32); // camera side of the table
    MP.root.position.set(lerp(MPW.x - .55, side.x, go), jump * MPS, lerp(MPW.z, side.z, go));
    MP.root.rotation.y = lerp(PI / 2, PI, go);
    if (go < .01) { setLimb(MP.armL, -2.9, -.4, -.2); setLimb(MP.armR, -2.9, .4, -.2); const k = jump * 4; setLimb(MP.legL, -.3 * k, 0, .6 * k); setLimb(MP.legR, -.3 * k, 0, .6 * k); }
    else { setLimb(MP.armL, -1.5, -.8, -1.1); setLimb(MP.armR, -1.5, .8, -1.1); MP.spine.rotation.x = .1; MP.head.rotation.x = -.35; }
  }
}

function bodyAt(t) {
  const g = PART === 'B' ? eio(seg(t, TB.grow + .15, TB.grow + 1.05)) : 0, s = lerp(1, SCALE_PUDGE, g);
  bodyP.scale.setScalar(s); bodyP.position.set(HEADW.x + LHEAD * s, TBL_Y + .17 * s, W.z);
  PB.chest.scale.set(lerp(1.25, 1.6, g), 1, lerp(.9, 1.05, g));
  PB.belly.scale.setScalar(lerp(.001, .27, g)); PB.belly.position.z = .09 * g;
  PB.fat.forEach((m, i) => m.scale.set(FAT0[i].x * lerp(1, 1.55, g), FAT0[i].y, FAT0[i].z * lerp(1, 1.55, g)));
  const twitch = t > TB.grow + 1.1 && t < TB.grow + 1.22 ? Math.sin((t - TB.grow - 1.1) * 60) * .06 : 0;
  const sit = PART === 'B' ? eio(seg(t, TB.grow + 1.2, TB.joy + .2)) : 0;
  PB.spine.rotation.x = sit * PI / 2 + twitch;
  setLimb(PB.armL, -.05 * sit, .08, 0); setLimb(PB.armR, -.05 * sit, -.08, 0);
  setLimb(PB.legL, 0, 0, 0); setLimb(PB.legR, 0, 0, 0);
  PB.head.rotation.y = PART === 'B' && t > TB.joy ? -.6 * eio(seg(t, TB.joy + .6, TB.joy + 1.0)) : 0; // looks down at Miss Pudge
  PB.head.visible = PART === 'B' && t >= TB.mask;
  PB.nose.visible = !(PART === 'B' && t >= TB.mask + .55); // hidden under the mask
}

const upQ = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), V(0, 1, 0));
function carryQ() { const f = MP.spine.localToWorld(V(0, 0, 1)).sub(MP.spine.getWorldPosition(V())).normalize(); return new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), f); }
function headAt(t) {
  fh.rotation.set(0, 0, 0); freeHead.rotation.set(0, 0, 0);
  if (PART === 'A') {
    PE.head.visible = t < TA.cut; freeHead.visible = t >= TA.cut;
    if (!freeHead.visible) return;
    // flies off the stump (behind the camera), lands in frame and rolls away through the gap between the houses
    const lt = t - TA.cut, x0 = STUMP.x + .35;
    let x, y, z;
    if (lt < .3) { const u = lt / .3; x = lerp(x0, STUMP.x + 3.0, u); y = lerp(STUMP_H + HR, HR, u) + Math.sin(u * PI) * .5; z = lerp(.1, .9, u); }
    else if (lt < .5) { const u = (lt - .3) / .2; x = lerp(STUMP.x + 3.0, STUMP.x + 3.5, u); y = HR + Math.sin(u * PI) * .12; z = lerp(.9, .85, u); }
    else { const u = (lt - .5) / .65; x = lerp(STUMP.x + 3.5, STUMP.x + 7.5, u); y = HR; z = lerp(.85, .4, u); }
    freeHead.position.set(x, y, z); fh.rotation.z = -(x - x0) / HR;
    return;
  }
  PE.head.visible = false; freeHead.visible = t < TB.mask;
  if (!freeHead.visible) return;
  if (t < TB.pick + .9) { // rolls in from the left along the street and stops
    const u = eo(seg(t, 0, 1.25)), x = lerp(H.x - 2.6, H.x, u);
    freeHead.position.set(x, HR, H.z); fh.rotation.z = -(x - H.x) / HR;
    freeHead.rotation.y = -PI / 2 * eio(seg(t, 1.0, 1.4)); // settles face-up toward the camera
    return;
  }
  const groundQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -PI / 2, 0));
  if (t < TB.shop) {
    const lift = eio(seg(t, TB.pick + .9, TB.pick + 1.3));
    freeHead.position.copy(V(H.x, HR, H.z).lerp(chestPoint(), lift));
    freeHead.quaternion.copy(groundQ.slerp(carryQ(), lift));
  } else {
    const place = eio(seg(t, TB.shop + .05, TB.shop + .5));
    freeHead.position.copy(chestPoint().lerp(PB.head.getWorldPosition(V()), place)); freeHead.quaternion.copy(carryQ().slerp(upQ, place));
  }
}

function maskAt(t) {
  mask.visible = PART === 'B' && t >= TB.mask;
  if (!mask.visible) return;
  const on = eio(seg(t, TB.mask + .3, TB.mask + .7));
  const hp = V(), hq = new THREE.Quaternion(), hs = V();
  PB.head.matrixWorld.decompose(hp, hq, hs);
  // held face-down above the head in both hands, then pressed onto the face, aligned with it
  const handP = MP.armL.end.getWorldPosition(V()).add(MP.armR.end.getWorldPosition(V())).multiplyScalar(.5);
  const held = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(0, -1, 0));
  mask.matrix.compose(handP.lerp(hp, on), held.slerp(hq, on), V(1, 1, 1).lerp(hs, on)); mask.matrixWorldNeedsUpdate = true;
}

function doorAt(t) { doorPivot.rotation.y = PART === 'B' ? 1.6 * eio(seg(t, TB.walk + .4, TB.walk + .85)) : 0; }

/* cameras */
const tmp = V();
function camAt(t) {
  const i = shotAt(t), s = SHOTS[i], u = (t - s.start) / s.dur;
  let pos, look, fov = 45;
  const k = PART + s.n;
  if (k === 'A1') { pos = V(STUMP.x + .85, .62, 3.4).lerp(V(STUMP.x + .7, .6, 2.75), eio(u)); look = V(STUMP.x - .15, .62, -.6); fov = 50; }
  else if (k === 'A2') { const j = Math.sin(t * 23) * .006; pos = V(MP0.x + .5 + j, 1.45, MP0.z + 3.3); look = V(MP0.x, 1.1, MP0.z); fov = 42; }
  else if (k === 'A3') { pos = V(STUMP.x + 1.6, lerp(.3, .45, u), 1.8); look = V(STUMP.x - .1, lerp(1.3, 1.65, u), -1.1); fov = 50; }
  else if (k === 'A4') { const sh = seg(t, 3.78, 3.85) * Math.sin(t * 90) * .02; pos = V(STUMP.x + 1.5, 1.95 + sh, 1.6); look = V(STUMP.x - .1, 2.15 + sh, -1.1); fov = 42; }
  else if (k === 'A5') { pos = V(STUMP.x + 1.6, .3, 1.4); look = V(STUMP.x + 5, .3, .6); fov = 45; }
  else if (k === 'B1') { pos = V(H.x + .35, .2, H.z + 1.5); look = V(H.x - .15, .3, H.z - .3); fov = 48; }
  else if (k === 'B2') { pos = V(H.x + .5, .8, H.z + 3.0); look = V(H.x + .35, .7, H.z - .3); fov = 48; }
  else if (k === 'B3') { const p = MP.root.position; pos = V(p.x + .2, 1.3, H.z + 3.6); look = V(p.x + .3, .8, p.z - .3); fov = 48; }
  else if (k === 'B4') { pos = V(HEADW.x + .1, 1.6, W.z + 1.7).lerp(V(HEADW.x, 1.5, W.z + 1.35), eio(u)); look = V(HEADW.x - .2, TBL_Y + .3, W.z); fov = 45; }
  else if (k === 'B5') { const h = PB.head.getWorldPosition(tmp); pos = V(h.x + .2, h.y + .5, h.z + .8); look = V(h.x - .08, h.y + .12, h.z); fov = 40; }
  else if (k === 'B6') { pos = V(W.x - .9, 2.3, W.z + 3.6).lerp(V(W.x - .9, 2.5, W.z + 4.2), eio(u)); look = V(W.x - .9, .95, W.z - .2); fov = 50; }
  else { const p = PB.pelvis.getWorldPosition(tmp); pos = V(p.x + 3.6, 2.2, W.z + 3.0); look = V(p.x - .5, 1.5, W.z); fov = 50; }
  cam.position.copy(pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(look);
  sun.target.position.copy(look); sun.position.copy(look).add(k === 'A5' || k === 'B1' || k === 'B2' || k === 'B3' ? V(3, 14, 6) : V(6, 12, 8)); // high sun where houses would shade the action
}

function renderAt(t) {
  t = clamp(t, 0, TOTAL - 1e-4);
  exAt(t); knightsAt(t); missAt(t); bodyAt(t); doorAt(t);
  scene.updateMatrixWorld(true);
  headAt(t); maskAt(t); camAt(t);
  renderer.render(scene, cam);
}
startPlayer(renderAt, canvas);
