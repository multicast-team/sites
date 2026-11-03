// Киберпанк-интерьер виллы Al Warqa 4: мебель, неон, экраны с анимацией, голограммы, цветной свет по комнатам.
// Всё собрано в одну группу — кнопка «Мебель и декор» скрывает её, и дом становится пустым, как на фото.
// build(kit, { tex }) → { group, phys, lights, anim, night, setMode }.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function build(kit, opts = {}) {
  const { M, MI, F0, F1, C1, CC, IN, VX, VZ, W1, LZ, SX, CG } = kit;
  const tex = opts.tex || (() => null);
  const group = new THREE.Group();
  group.name = 'cyber';
  const phys = { colliders: [], walkables: [], polys: [] };
  const lights = [];
  const anim = [];
  const night = [];
  const b = kit.makeBatch();
  const solid = (x0, x1, y0, y1, z0, z1) => phys.colliders.push([Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)]);
  // неоновый свет — местный акцент: сила и радиус небольшие, днём просмотрщик ещё приглушает
  const light = (room, x, y, z, color, intensity = 10, distance = 7) => lights.push({ pos: [x, y, z], color, intensity: intensity * 0.34, distance: Math.min(distance, 6) * 0.85, room, set: 'cyber' });

  // ---------- материалы ----------
  function pbr(name, mpt, params = {}, o = {}) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 1, metalness: 0 }, params));
    const t = tex(name, mpt, o.rotate || 0);
    if (t) {
      m.map = t.map;
      if (t.normal) { m.normalMap = t.normal; m.normalScale = new THREE.Vector2(o.normal ?? 0.8, o.normal ?? 0.8); }
      if (t.orm) { m.roughnessMap = t.orm; m.aoMap = t.orm; m.aoMapIntensity = 0.6; if (params.metalness) m.metalnessMap = t.orm; }
    }
    m.userData.room = 'gf';
    return m;
  }
  const C = {
    leather: pbr('leather_black', 0.45, { color: 0x2a2a30, roughness: 1.6 }, { normal: 0.7 }),
    tufted: pbr('leather_tufted', 0.4, { color: 0x4a2a52, roughness: 1.4 }, { normal: 1.0 }),
    tuftedRed: pbr('leather_tufted', 0.4, { color: 0x6a1622, roughness: 1.4 }, { normal: 1.0 }),
    fabric: pbr('fabric_grey', 0.5, { color: 0x4a4e5c }, { normal: 0.8 }),
    fabricDark: pbr('fabric_grey', 0.5, { color: 0x24262e }, { normal: 0.8 }),
    rug: pbr('carpet_dark', 0.9, { color: 0x2d3040 }, { normal: 0.8 }),
    rugViolet: pbr('carpet_dark', 0.9, { color: 0x3a2850 }, { normal: 0.8 }),
    steel: pbr('metal_brushed', 0.8, { color: 0xd2d6dc, metalness: 1 }, { normal: 0.3 }),
    black: pbr('metal_black', 1.0, { color: 0x2c2e33, metalness: 1 }, { normal: 0.3 }),
    plate: pbr('diamond', 0.6, { color: 0xa2a8b0, metalness: 1 }, { normal: 0.8 }),
    concrete: pbr('concrete_dark', 2.0, { color: 0x75777e }, { normal: 0.6 }),
    plastic: pbr('plastic_black', 1.0, { color: 0x16171b }),
    wood: pbr('wood_dark', 1.2, { color: 0x8c6c55 }, { normal: 0.5 }),
    glossy: new THREE.MeshPhysicalMaterial({ color: 0x0d0e12, roughness: 0.07, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xc4102c, roughness: 0.22, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.04 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 }), // матовый: и табло вывесок не бликует от своего неона
    chrome: MI.chrome,
    glass: new THREE.MeshStandardMaterial({ color: 0x0a1014, roughness: 0.04, transparent: true, opacity: 0.25, depthWrite: false, envMapIntensity: 1.5 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x1f3d2a, roughness: 0.55 })
  };
  for (const m of [C.glossy, C.red, C.rubber, C.glass, C.leaf]) m.userData.room = 'gf';
  C.glass.userData.noCast = true;
  const neonMat = (color, intensity = 5) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
    m.userData.noCast = true;
    m.userData.noAO = true;
    return m;
  };
  const N = {
    pink: neonMat(0xff2bd6), cyan: neonMat(0x00e5ff), violet: neonMat(0x8a3bff, 6), amber: neonMat(0xffa000, 4),
    red: neonMat(0xff2244), lime: neonMat(0x7dff3a, 4), white: neonMat(0xdff3ff, 3), green: neonMat(0x30ff7a, 3)
  };

  // ---------- геометрия ----------
  const rbox = (w, h, d, r, x, y, z, mat, ry = 0, rx = 0) => {
    const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    b.geo(g, mat);
  };
  const box = (x0, x1, y0, y1, z0, z1, mat) => b.box(Math.min(x0, x1), Math.max(x0, x1), y0, y1, Math.min(z0, z1), Math.max(z0, z1), mat);
  const cyl = (rt, rb, h, x, y, z, mat, seg = 24, rx = 0, rz = 0) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    b.geo(g, mat);
  };
  const tube = (pts, r, mat, seg = 40) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    b.geo(new THREE.TubeGeometry(curve, seg, r, 8, false), mat);
  };
  const torus = (R, r, x, y, z, mat, rx = Math.PI / 2, ry = 0, arc = Math.PI * 2) => {
    const g = new THREE.TorusGeometry(R, r, 10, 64, arc);
    g.rotateX(rx);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    b.geo(g, mat);
  };
  // поворот точки (u, v) вокруг центра — для мебели под углом
  const rot = (cx, cz, a) => (u, v) => [cx + u * Math.cos(a) + v * Math.sin(a), cz - u * Math.sin(a) + v * Math.cos(a)];

  // ---------- шейдеры экранов и голограмм ----------
  const screens = [];
  const SH = {
    city: `float h1(float n){return fract(sin(n)*43758.5453);}
      void main(){ vec2 uv=vUv; vec3 col=mix(vec3(0.05,0.0,0.14),vec3(0.75,0.08,0.5),pow(1.0-uv.y,3.0));
        col+=vec3(1.0,0.4,0.8)*0.25*smoothstep(0.02,0.0,abs(uv.y-0.62-0.02*sin(uv.x*30.0)));
        for(int l=0;l<3;l++){ float fl=float(l); float k=5.0+fl*5.0; float x=uv.x*k+time*(0.03+fl*0.04)*k; float id=floor(x);
          float h=(0.22+0.55*h1(id*1.7+fl*17.0))*(1.0-fl*0.22);
          if(uv.y<h){ vec2 w=vec2(fract(x)*7.0,uv.y*48.0);
            float lit=step(0.62,h1(floor(w.x)+floor(w.y)*7.0+id*13.0))*step(0.25,fract(w.x))*step(0.35,fract(w.y));
            vec3 wc=mix(vec3(0.0,0.9,1.0),vec3(1.0,0.25,0.85),h1(id+fl));
            col=vec3(0.015,0.01,0.04)*(1.0+fl)+wc*lit*(0.55+0.45*sin(time*1.7+id*3.1)); } }
        float car=fract(time*0.09); col+=vec3(1.0,0.9,0.6)*smoothstep(0.004,0.0,abs(uv.y-0.74))*smoothstep(0.03,0.0,abs(uv.x-car));
        col*=0.86+0.14*sin(uv.y*500.0); gl_FragColor=vec4(col*1.7,1.0); }`,
    code: `float h1(float n){return fract(sin(n)*43758.5453);}
      void main(){ vec2 uv=vUv; float rows=26.0; float y=uv.y*rows+time*1.6; float r=floor(y); float c=floor(uv.x*52.0);
        float len=6.0+40.0*h1(r*3.1); float on=step(0.45,h1(r*31.0+c))*step(fract(y),0.72)*step(c,len)*step(0.06,fract(uv.x*52.0));
        vec3 col=vec3(0.0,0.06,0.05)+mix(vec3(0.1,1.0,0.6),vec3(0.0,0.8,1.0),h1(r))*on;
        col+=vec3(0.0,0.4,0.3)*smoothstep(0.02,0.0,abs(fract(time*0.2)-uv.y));
        gl_FragColor=vec4(col*1.5,1.0); }`,
    bars: `void main(){ vec2 uv=vUv; float n=40.0; float i=floor(uv.x*n);
        float h=0.12+0.8*abs(sin(time*2.3+i*0.7)*sin(time*1.1+i*0.23));
        float on=step(uv.y,h)*step(0.2,fract(uv.x*n))*step(0.25,fract(uv.y*30.0));
        vec3 c=mix(vec3(0.0,0.9,1.0),vec3(1.0,0.1,0.8),uv.y);
        gl_FragColor=vec4(c*on*1.9+vec3(0.03,0.0,0.06),1.0); }`,
    game: `float h1(float n){return fract(sin(n)*43758.5453);}
      void main(){ vec2 uv=vUv; vec3 col=vec3(0.02,0.0,0.06); float t=time*0.6;
        vec2 p=vec2(uv.x-0.5,uv.y-0.38); float z=0.1/max(0.02,-p.y+0.001);
        if(p.y<0.0){ vec2 g=vec2(p.x*z*4.0,z+t*3.0); float l=smoothstep(0.06,0.0,abs(fract(g.x)-0.5)-0.44)+smoothstep(0.06,0.0,abs(fract(g.y)-0.5)-0.44);
          col+=vec3(1.0,0.1,0.9)*l*0.8*smoothstep(-0.38,0.0,p.y); }
        float sunr=length(vec2(p.x,p.y-0.17)); col+=mix(vec3(1.0,0.8,0.1),vec3(1.0,0.1,0.6),uv.y*1.5)*step(sunr,0.17)*step(0.3,fract(uv.y*28.0-t))*step(0.0,p.y);
        gl_FragColor=vec4(col*1.7,1.0); }`,
    rack: `float h1(float n){return fract(sin(n)*43758.5453);}
      void main(){ vec2 uv=vUv; vec2 g=uv*vec2(6.0,40.0); vec2 id=floor(g); vec2 f=fract(g);
        float led=step(0.25,f.x)*step(f.x,0.55)*step(0.3,f.y)*step(f.y,0.7);
        float blink=step(0.5,fract(time*(0.5+2.0*h1(id.x+id.y*7.0))+h1(id.y*3.0+id.x)));
        vec3 c=mix(vec3(0.1,1.0,0.4),vec3(0.0,0.7,1.0),step(0.7,h1(id.x*11.0+id.y)));
        vec3 col=vec3(0.02)+c*led*blink*1.8; col+=vec3(0.04)*step(0.92,f.y);
        gl_FragColor=vec4(col,1.0); }`
  };
  function screenMaterial(kind) {
    const m = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float time; varying vec2 vUv;\n${SH[kind]}`
    });
    screens.push(m);
    return m;
  }
  // экран на стене: центр (x, y, z), ширина, высота, поворот (куда смотрит), вид картинки
  function screen(x, y, z, w, h, ry, kind, bezel = 0.03) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMaterial(kind));
    s.position.set(x, y, z);
    s.rotation.y = ry;
    s.userData.noCast = true;
    s.userData.noAO = true;
    group.add(s);
    const g = new THREE.BoxGeometry(w + bezel * 2, h + bezel * 2, 0.03);
    g.translate(0, 0, -0.018);
    g.rotateY(ry);
    g.translate(x, y, z);
    b.geo(g, C.glossy);
    return s;
  }
  const holoMats = [];
  function holoMaterial(color) {
    const m = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); vY = wp.y;
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform float time; uniform vec3 color; varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); float scan = 0.55 + 0.45 * sin(vY * 70.0 - time * 7.0);
          float flick = 0.85 + 0.15 * sin(time * 23.0); gl_FragColor = vec4(color * (0.12 + f * 1.6) * scan * flick * 2.2, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    holoMats.push(m);
    return m;
  }
  function beam(x, y0, y1, z, r, color) { // световой конус над проектором голограммы
    const g = new THREE.CylinderGeometry(r, 0.06, y1 - y0, 32, 1, true);
    g.translate(x, (y0 + y1) / 2, z);
    const m = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, y0: { value: y0 }, y1: { value: y1 } },
      vertexShader: 'varying float vY; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vY = wp.y; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'uniform vec3 color; uniform float y0; uniform float y1; varying float vY; void main(){ float t = clamp((vY - y0) / (y1 - y0), 0.0, 1.0); gl_FragColor = vec4(color * (1.0 - t) * 0.35, 1.0); }',
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.userData.noCast = true;
    mesh.userData.noAO = true;
    group.add(mesh);
  }
  // неоновая надпись: светится только текст, фон прозрачный
  function neonText(text, x, y, z, w, h, ry, color, { vertical = false, font = '700 150px "Segoe UI", "Yu Gothic", "Meiryo", sans-serif', intensity = 5 } = {}) {
    const cw = vertical ? 256 : 1024, ch = vertical ? 1024 : 256;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 18;
    if (vertical) {
      const chars = [...text];
      const step = ch / (chars.length + 0.5);
      chars.forEach((c, i) => ctx.fillText(c, cw / 2, step * (i + 0.75)));
    } else {
      let size = 150;
      while (size > 40 && ctx.measureText(text).width > cw * 0.92) { size -= 8; ctx.font = font.replace(/\d+px/, `${size}px`); }
      ctx.fillText(text, cw / 2, ch / 2 + 6);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16; // при взгляде снизу мелкий уровень мипмапа усредняет буквы в сплошную светящуюся табличку
    // чёрный металл не отражает ни ламп, ни неба: светятся только буквы, без светлой «таблички» под ними
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1, roughness: 1, emissive: color, emissiveMap: t, emissiveIntensity: intensity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.userData.noCast = true;
    mesh.userData.noAO = true;
    group.add(mesh);
    return m;
  }

  // ---------- мебель ----------
  // диван-модуль: сиденье с подушками, спинка, подсветка снизу; (x, z) — центр сиденья, ry — куда смотрит
  function sofa(x, z, len, ry, mat = C.leather, glow = N.pink) {
    const P = rot(x, z, ry);
    const put = (w, h, d, u, y, v, m, r = 0.06) => { const [px, pz] = P(u, v); rbox(w, h, d, r, px, y, pz, m, ry); };
    put(len, 0.2, 0.95, 0, F + 0.18, 0, C.black, 0.03);
    const n = Math.max(1, Math.round(len / 0.95));
    for (let i = 0; i < n; i++) {
      const u = -len / 2 + (i + 0.5) * (len / n);
      put(len / n - 0.03, 0.2, 0.86, u, F + 0.38, 0.04, mat, 0.08);
      put(len / n - 0.05, 0.48, 0.2, u, F + 0.7, -0.38, mat, 0.08);
    }
    put(len + 0.1, 0.62, 0.16, 0, F + 0.55, -0.48, mat, 0.05);
    const [gx, gz] = P(0, 0.42);
    rbox(len - 0.1, 0.02, 0.02, 0.009, gx, F + 0.07, gz, glow, ry);
    const [ax, az] = P(-len / 2 - 0.08, 0), [bx, bz] = P(len / 2 + 0.08, 0);
    rbox(0.16, 0.55, 0.95, 0.05, ax, F + 0.42, az, mat, ry);
    rbox(0.16, 0.55, 0.95, 0.05, bx, F + 0.42, bz, mat, ry);
    const ext = [P(-len / 2 - 0.16, -0.56), P(len / 2 + 0.16, 0.48)];
    solid(ext[0][0], ext[1][0], F, F + 0.85, ext[0][1], ext[1][1]);
  }
  let F = F0;
  const at = (floor) => { F = floor; };
  function rug(x0, x1, z0, z1, mat = C.rug, edge = null) {
    box(x0, x1, F + 0.012, F + 0.026, z0, z1, mat);
    if (edge) {
      for (const [a0, a1, c0, c1] of [[x0, x1, z0, z0 + 0.02], [x0, x1, z1 - 0.02, z1], [x0, x0 + 0.02, z0, z1], [x1 - 0.02, x1, z0, z1]]) box(a0, a1, F + 0.026, F + 0.03, c0, c1, edge);
    }
  }
  function table(x, z, w, d, h, top = C.glossy, edge = N.cyan, base = C.black) {
    rbox(w, 0.05, d, 0.02, x, F + h - 0.025, z, top);
    rbox(w * 0.7, h - 0.05, d * 0.5, 0.02, x, F + (h - 0.05) / 2, z, base);
    if (edge) box(x - w / 2 + 0.04, x + w / 2 - 0.04, F + h - 0.06, F + h - 0.05, z - d / 2 - 0.004, z + d / 2 + 0.004, edge);
    solid(x - w / 2, x + w / 2, F, F + h, z - d / 2, z + d / 2);
  }
  function roundTable(x, z, r, h, top = C.glossy, ring = N.cyan) {
    cyl(r, r, 0.05, x, F + h - 0.025, z, top, 40);
    cyl(0.06, 0.06, h - 0.05, x, F + (h - 0.05) / 2, z, C.steel, 16);
    cyl(r * 0.6, r * 0.6, 0.02, x, F + 0.01, z, C.black, 32);
    if (ring) torus(r + 0.004, 0.008, x, F + h - 0.03, z, ring);
    solid(x - r, x + r, F, F + h, z - r, z + r);
  }
  function chair(x, z, ry, seat = C.leather, frame = C.black) { // угловатый стул
    const P = rot(x, z, ry);
    rbox(0.48, 0.06, 0.48, 0.02, x, F + 0.46, z, seat, ry);
    const [bx, bz] = P(0, -0.22);
    rbox(0.48, 0.5, 0.05, 0.02, bx, F + 0.78, bz, seat, ry, -0.1);
    for (const [u, v] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const [lx, lz] = P(u, v); cyl(0.015, 0.015, 0.45, lx, F + 0.225, lz, frame, 8); }
    solid(x - 0.27, x + 0.27, F, F + 1.0, z - 0.27, z + 0.27);
  }
  function stool(x, z, seat = C.leather) {
    cyl(0.2, 0.18, 0.08, x, F + 0.76, z, seat, 24);
    cyl(0.025, 0.025, 0.72, x, F + 0.36, z, C.chrome, 10);
    cyl(0.2, 0.22, 0.02, x, F + 0.01, z, C.chrome, 24);
    torus(0.17, 0.012, x, F + 0.3, z, C.chrome);
    solid(x - 0.22, x + 0.22, F, F + 0.8, z - 0.22, z + 0.22);
  }
  function eggChair(x, z, ry, shell = C.glossy, inner = C.tufted) {
    const g = new THREE.SphereGeometry(0.55, 32, 20, Math.PI * 0.25, Math.PI * 1.5, 0, Math.PI * 0.82);
    g.scale(1, 1.25, 1);
    g.rotateY(ry + Math.PI);
    g.translate(x, F + 0.95, z);
    b.geo(g, shell);
    const c = new THREE.SphereGeometry(0.5, 28, 16, Math.PI * 0.25, Math.PI * 1.5, 0, Math.PI * 0.8);
    c.scale(1, 1.2, 1);
    c.rotateY(ry + Math.PI);
    c.translate(x, F + 0.95, z);
    b.geo(c, inner);
    cyl(0.04, 0.05, 0.3, x, F + 0.15, z, C.steel, 12);
    cyl(0.32, 0.34, 0.02, x, F + 0.01, z, C.steel, 32);
    solid(x - 0.55, x + 0.55, F, F + 1.6, z - 0.55, z + 0.55);
  }
  function bed(hx, hz, ry, L = 2.2, W = 2.0, duvet = C.fabric, head = C.tufted, glow = N.violet, neon = N.pink) {
    // hx, hz — середина стены у изголовья; ry: 0 — кровать уходит в +z, PI/2 — в +x, -PI/2 — в -x
    const P = rot(hx, hz, ry);
    const at2 = (u, v) => P(u, v);
    const put = (w, h, d, u, y, v, m, r = 0.04) => { const [x, z] = at2(u, v); rbox(w, h, d, r, x, F + y, z, m, ry); };
    put(W - 0.24, 0.22, L - 0.12, 0, 0.19, L / 2 + 0.06, C.black, 0.02);
    put(W - 0.4, 0.012, L - 0.4, 0, 0.045, L / 2 + 0.1, glow, 0.005);
    put(W - 0.08, 0.22, L - 0.1, 0, 0.42, L / 2 + 0.05, C.fabricDark, 0.06);
    put(W + 0.04, 0.08, L - 0.6, 0, 0.56, L / 2 + 0.28, duvet, 0.04);
    for (const s of W > 1.6 ? [-1, 1] : [0]) put(W > 1.6 ? 0.72 : 0.78, 0.16, 0.2, s * 0.42, 0.6, 0.32, C.fabric, 0.07);
    put(W + 0.5, 1.05, 0.1, 0, 0.95, 0.05, head, 0.04);
    put(W + 0.6, 0.03, 0.012, 0, 1.53, 0.012, neon, 0.004);
    const a = at2(-W / 2, 0), c = at2(W / 2, L);
    solid(a[0], c[0], F, F + 0.6, a[1], c[1]);
  }
  function nightstand(x, z, lamp = N.cyan) {
    rbox(0.45, 0.4, 0.4, 0.03, x, F + 0.35, z, C.glossy);
    box(x - 0.2, x + 0.2, F + 0.14, F + 0.15, z - 0.17, z + 0.17, lamp);
    cyl(0.05, 0.07, 0.3, x, F + 0.7, z, C.black, 16);
    cyl(0.045, 0.045, 0.14, x, F + 0.9, z, lamp, 16);
    solid(x - 0.23, x + 0.23, F, F + 0.6, z - 0.2, z + 0.2);
  }
  function neonLamp(x, z, h, mat) { // напольный неоновый торшер-трубка
    cyl(0.12, 0.14, 0.04, x, F + 0.02, z, C.black, 24);
    cyl(0.022, 0.022, h, x, F + 0.04 + h / 2, z, mat, 12);
    solid(x - 0.15, x + 0.15, F, F + h, z - 0.15, z + 0.15);
  }
  function plant(x, z, h = 1.4) { // кадка и острые листья со светящимися кончиками
    rbox(0.5, 0.55, 0.5, 0.05, x, F + 0.275, z, C.concrete);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, tilt = 0.35 + (i % 3) * 0.15;
      const len = h * (0.7 + (i % 4) * 0.1);
      const tip = [x + Math.sin(a) * Math.sin(tilt) * len, F + 0.55 + Math.cos(tilt) * len, z + Math.cos(a) * Math.sin(tilt) * len];
      tube([[x, F + 0.5, z], [(x + tip[0]) / 2, (F + 0.55 + tip[1]) / 2 + 0.1, (z + tip[2]) / 2], tip], 0.02, C.leaf, 10);
      cyl(0.012, 0.012, 0.08, tip[0], tip[1], tip[2], N.cyan, 6);
    }
    solid(x - 0.27, x + 0.27, F, F + 0.6, z - 0.27, z + 0.27);
  }
  function wallNeonLine(pts, mat, r = 0.012) { tube(pts, r, mat, 64); }

  // ===================== 1-й ЭТАЖ =====================
  at(F0);
  // ----- холл: мотоцикл на подиуме, неоновая инсталляция во втором свете, голограмма у бассейна -----
  {
    const px = 1.5, pz = 2.9;
    cyl(1.0, 1.05, 0.12, px, F + 0.06, pz, C.plate, 48);
    torus(1.03, 0.014, px, F + 0.02, pz, N.cyan);
    torus(0.98, 0.01, px, F + 0.125, pz, N.pink);
    solid(px - 1.05, px + 1.05, F, F + 1.2, pz - 1.05, pz + 1.05);
    phys.walkables.push([px - 1.0, pz - 1.0, px + 1.0, pz + 1.0, F + 0.12]);
    // мотоцикл в духе «Акиры»: низкий, длинный, красный обтекатель
    const ry = 0.6, P = rot(px, pz, ry), y0 = F + 0.12;
    for (const u of [-0.72, 0.72]) {
      const [wx, wz] = P(u, 0);
      const tyre = new THREE.TorusGeometry(0.31, 0.085, 14, 40);
      tyre.rotateY(ry);
      tyre.translate(wx, y0 + 0.4, wz);
      b.geo(tyre, C.rubber);
      const disc = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 32);
      disc.rotateX(Math.PI / 2);
      disc.rotateY(ry);
      disc.translate(wx, y0 + 0.4, wz);
      b.geo(disc, C.black);
      const rim = new THREE.TorusGeometry(0.235, 0.012, 8, 40);
      rim.rotateY(ry);
      rim.translate(wx, y0 + 0.4, wz);
      b.geo(rim, N.red);
    }
    const body = (w, h, d, u, y, v, m, r = 0.08, tilt = 0) => { const [bx, bz] = P(u, v); rbox(w, h, d, r, bx, y0 + y, bz, m, ry, 0); };
    body(1.35, 0.32, 0.36, 0.05, 0.62, 0, C.red, 0.12);
    body(0.55, 0.3, 0.34, 0.6, 0.82, 0, C.red, 0.12);
    body(0.6, 0.1, 0.3, -0.42, 0.86, 0, C.leather, 0.05);
    body(0.4, 0.18, 0.3, -0.75, 0.78, 0, C.red, 0.06);
    body(0.12, 0.2, 0.2, 0.88, 0.78, 0, C.glossy, 0.04);
    body(0.03, 0.1, 0.16, 0.95, 0.8, 0, N.white, 0.01);
    body(0.03, 0.06, 0.22, -0.96, 0.8, 0, N.red, 0.01);
    const [hx, hz] = P(0.6, 0);
    const bar = new THREE.CylinderGeometry(0.018, 0.018, 0.7, 8);
    bar.rotateX(Math.PI / 2);
    bar.rotateY(ry);
    bar.translate(hx, y0 + 1.02, hz);
    b.geo(bar, C.black);
    const [ex, ez] = P(0, 0);
    box(ex - 0.5, ex + 0.5, y0 + 0.36, y0 + 0.4, ez - 0.06, ez + 0.06, C.chrome);
    light('foyer', px, F + 0.5, pz, 0x00e5ff, 6, 4);
    // неоновые трубки, висящие во втором свете
    const colors = [N.cyan, N.pink, N.violet];
    let k = 0;
    for (let ix = 0; ix < 5; ix++) for (let iz = 0; iz < 3; iz++) {
      const x = -1.5 + ix * 0.75 + (iz % 2) * 0.3, z = 1.1 + iz * 1.2 + (ix % 2) * 0.25;
      const len = 1.1 + ((ix * 7 + iz * 3) % 5) * 0.32;
      const top = CC - 0.02, y1 = top - 1.1 - len * 0.6;
      cyl(0.004, 0.004, top - (y1 + len), x, (top + y1 + len) / 2, z, C.black, 4);
      cyl(0.024, 0.024, len, x, y1 + len / 2, z, colors[k++ % 3], 10);
    }
    light('foyer', -0.6, 6.4, 2.0, 0x00e5ff, 16, 9);
    light('foyer', 0.8, 6.1, 3.0, 0xff2bd6, 16, 9);
    // вертикальная вывеска над левой галереей
    box(-IN, -IN + 0.06, F1 + 1.0, F1 + 3.8, 2.55, 4.05, C.rubber);
    neonText('アルワルカ', -IN + 0.07, F1 + 2.4, 3.3, 1.35, 2.6, Math.PI / 2, 0xff2bd6, { vertical: true, font: '700 170px "Yu Gothic", "Meiryo", "MS Gothic", "Noto Sans JP", sans-serif', intensity: 3.5 });
    light('foyer', -2.5, F1 + 2.4, 3.3, 0xff2bd6, 10, 6); // свет вывески — в метре от табло, иначе табло горит сплошным пятном
    // подсветка торцов галерей и малой гостиной
    for (const s of [1, -1]) box(s * VX - s * 0.04, s * VX, CG - 0.025, CG, VZ, kit.IN + 0.6, N.cyan);
    box(-VX, VX, CG - 0.025, CG, VZ - 0.04, VZ, N.cyan);
    // голограмма у витража к бассейну
    cyl(0.32, 0.38, 0.9, 0, F + 0.45, -5.1, C.black, 32);
    torus(0.33, 0.012, 0, F + 0.9, -5.1, N.cyan);
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.07, 160, 16, 2, 3), holoMaterial(0x22ddff));
    knot.position.set(0, F + 1.65, -5.1);
    knot.userData.noCast = true;
    knot.userData.noAO = true;
    group.add(knot);
    anim.push((t) => { knot.rotation.y = t * 0.6; knot.rotation.x = Math.sin(t * 0.4) * 0.3; });
    beam(0, F + 0.92, F + 2.3, -5.1, 0.55, 0x22ddff);
    solid(-0.4, 0.4, F, F + 2.2, -5.5, -4.7);
    light('rear', 0, F + 1.6, -5.0, 0x22ddff, 10, 6);
    // кресла у витража
    for (const s of [-1, 1]) { eggChair(s * 3.0, -5.25, s > 0 ? 0.5 : -0.5); roundTable(s * 2.05, -5.4, 0.28, 0.5); }
  }

  // ----- большая гостиная (левое крыло) -----
  {
    rug(-10.9, -6.2, -6.3, -2.0, C.rugViolet, N.violet);
    sofa(-8.55, -5.62, 3.8, 0);
    sofa(-9.95, -3.9, 2.2, Math.PI / 2);
    table(-8.3, -3.9, 1.5, 0.85, 0.4);
    // медиаконсоль и большой экран на перегородке
    box(-10.4, -7.0, F + 0.28, F + 0.62, 0.1, 0.55, C.glossy);
    box(-10.3, -7.1, F + 0.24, F + 0.25, 0.14, 0.5, N.pink);
    solid(-10.4, -7.0, F, F + 0.62, 0.1, 0.55);
    screen(-8.7, F + 1.85, 0.52, 3.0, 1.6, Math.PI, 'city');
    eggChair(-5.2, -5.7, -0.6);
    eggChair(-5.25, -1.35, 0.9 + Math.PI);
    neonLamp(-11.3, -6.35, 1.9, N.cyan);
    neonLamp(-11.3, 0.1, 1.9, N.pink);
    plant(-6.1, -6.35, 1.5);
    // неоновая волна и надпись на стене у холла
    const wx = -4.27;
    wallNeonLine([[wx, F + 2.0, 0.3], [wx, F + 2.5, -0.3], [wx, F + 2.1, -0.9], [wx, F + 2.7, -1.5], [wx, F + 2.25, -2.2]], N.cyan, 0.014);
    neonText('2077', wx - 0.005, F + 3.3, -0.95, 1.6, 0.5, -Math.PI / 2, 0xff2bd6, { intensity: 5 });
    light('living', -8.7, F + 1.8, -0.4, 0x00e5ff, 14, 8);
    light('living', -8.5, F + 0.4, -5.4, 0xff2bd6, 10, 6);
    light('living', -11.0, F + 1.6, -6.0, 0x00e5ff, 8, 6);
    light('living', -11.0, F + 1.6, 0.0, 0xff2bd6, 8, 6);
    light('living', -4.7, F + 2.7, -1.0, 0x8a3bff, 8, 6);
  }

  // ----- столовая и бар (правое крыло) -----
  {
    const tx = 8.6, tz = -4.6;
    rbox(3.2, 0.06, 1.1, 0.02, tx, F + 0.77, tz, C.glossy);
    tube([[tx - 1.55, F + 0.802, tz + 0.1], [tx - 0.6, F + 0.802, tz - 0.15], [tx + 0.4, F + 0.802, tz + 0.12], [tx + 1.55, F + 0.802, tz - 0.08]], 0.02, N.cyan, 60);
    for (const s of [-1, 1]) rbox(0.08, 0.72, 0.9, 0.02, tx + s * 1.2, F + 0.37, tz, C.black);
    solid(tx - 1.6, tx + 1.6, F, F + 0.8, tz - 0.55, tz + 0.55);
    for (const x of [7.4, 8.2, 9.0, 9.8]) { chair(x, tz - 0.78, 0, C.tuftedRed); chair(x, tz + 0.78, Math.PI, C.tuftedRed); }
    torus(1.05, 0.03, tx, F + 2.55, tz, N.pink);
    torus(0.7, 0.02, tx, F + 2.7, tz, N.violet);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; cyl(0.004, 0.004, 1.65, tx + Math.cos(a) * 1.05, F + 3.38, tz + Math.sin(a) * 1.05, C.black, 4); }
    light('dining', tx, F + 2.3, tz, 0xff2bd6, 16, 8);
    // бар у перегородки: стойка, полки со светящимися бутылками, три табурета
    box(6.1, 9.2, F, F + 1.05, 0.0, 0.55, C.glossy);
    box(6.1, 9.2, F + 1.05, F + 1.09, -0.12, 0.55, C.steel);
    for (let x = 6.3; x < 9.1; x += 0.35) box(x, x + 0.02, F + 0.08, F + 0.98, -0.005, 0.0, N.cyan);
    solid(6.1, 9.2, F, F + 1.1, -0.12, 0.55);
    for (const y of [F + 1.55, F + 2.1]) box(6.3, 9.0, y, y + 0.03, 0.3, 0.55, C.glossy);
    const bottleColors = [N.amber, N.pink, N.cyan, N.lime, N.violet];
    let bi = 0;
    for (const y of [F + 1.58, F + 2.13]) for (let x = 6.45; x < 8.9; x += 0.22) {
      const h = 0.24 + ((bi * 37) % 7) * 0.02;
      cyl(0.035, 0.04, h, x, y + h / 2, 0.43, bottleColors[bi % 5], 12);
      cyl(0.014, 0.014, 0.06, x, y + h + 0.03, 0.43, C.black, 8);
      bi++;
    }
    box(6.3, 9.0, F + 2.5, F + 2.52, 0.5, 0.55, N.violet);
    for (const x of [6.8, 7.7, 8.6]) stool(x, -0.45);
    light('dining', 7.6, F + 1.6, -0.1, 0x00e5ff, 10, 6);
    // буфет у торцевого окна и экран-визуализатор на стене у холла
    box(11.2, 11.75, F + 0.15, F + 0.8, -6.2, -4.0, C.glossy);
    box(11.18, 11.2, F + 0.16, F + 0.17, -6.15, -4.05, N.pink);
    solid(11.2, 11.75, F, F + 0.8, -6.2, -4.0);
    screen(4.27, F + 2.1, -0.95, 2.4, 1.35, Math.PI / 2, 'bars');
    light('dining', 4.7, F + 2.1, -0.95, 0x8a3bff, 9, 6);
  }

  // ----- гостевая спальня -----
  {
    bed(-9.6, 0.75, 0, 2.15, 1.8, C.fabric, C.tufted, N.violet, N.pink);
    nightstand(-10.95, 1.0, N.violet);
    nightstand(-8.25, 1.0, N.violet);
    // стол у окна с монитором и стулом
    box(-10.9, -9.2, F + 0.72, F + 0.76, 5.15, 5.72, C.wood);
    for (const x of [-10.85, -9.25]) box(x - 0.03, x + 0.03, F, F + 0.72, 5.2, 5.68, C.black);
    solid(-10.9, -9.2, F, F + 0.78, 5.15, 5.75);
    screen(-10.05, F + 1.1, 5.5, 0.6, 0.35, Math.PI, 'code', 0.015);
    chair(-10.05, 4.55, Math.PI, C.leather);
    light('guest', -9.6, F + 1.0, 1.2, 0x8a3bff, 7, 5);
    light('guest', -10.0, F + 1.4, 5.2, 0x00e5ff, 5, 4);
  }

  // ===================== 2-й ЭТАЖ =====================
  at(F1);
  // ----- малая гостиная с пантри -----
  {
    sofa(0, -2.75, 3.2, Math.PI, C.leather, N.cyan);
    roundTable(0, -3.75, 0.42, 0.38);
    // аркадный автомат у правой стены
    const ax = IN - 0.38, az = -5.0;
    rbox(0.72, 1.75, 0.7, 0.03, ax, F + 0.875, az, C.glossy);
    screen(ax - 0.36, F + 1.25, az, 0.52, 0.42, -Math.PI / 2, 'game', 0.02);
    box(ax - 0.37, ax - 0.35, F + 1.62, F + 1.72, az - 0.3, az + 0.3, N.pink);
    box(ax - 0.5, ax - 0.34, F + 0.92, F + 0.96, az - 0.3, az + 0.3, C.black);
    for (const s of [-1, 1]) box(ax - 0.37, ax - 0.35, F + 0.1, F + 1.7, az + s * 0.35 - 0.01, az + s * 0.35 + 0.01, N.cyan);
    solid(ax - 0.4, IN, F, F + 1.8, az - 0.36, az + 0.36);
    // кресла-мешки и голографический глобус
    for (const [x, z, m] of [[-2.7, -5.15, C.tufted], [-1.6, -5.3, C.fabricDark]]) {
      const g = new THREE.SphereGeometry(0.45, 28, 18);
      g.scale(1, 0.6, 1);
      g.translate(x, F + 0.27, z);
      b.geo(g, m);
      solid(x - 0.45, x + 0.45, F, F + 0.55, z - 0.45, z + 0.45);
    }
    roundTable(1.5, -5.25, 0.3, 0.55, C.glossy, N.cyan);
    const globe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 2), holoMaterial(0x33e0ff));
    globe.position.set(1.5, F + 0.95, -5.25);
    globe.userData.noAO = true;
    group.add(globe);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.27, 1)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.4, 2.0, 2.4), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    wire.position.copy(globe.position);
    group.add(wire);
    anim.push((t) => { globe.rotation.y = t * 0.5; wire.rotation.y = t * 0.5; });
    beam(1.5, F + 0.56, F + 1.3, -5.25, 0.32, 0x33e0ff);
    // вывеска над пантри
    box(-IN, -IN + 0.05, F + 2.3, F + 3.15, -4.95, -3.05, C.rubber);
    neonText('ラーメン 24/7', -IN + 0.06, F + 2.72, -4.0, 1.85, 0.6, Math.PI / 2, 0xff2bd6, { intensity: 6, font: '700 150px "Yu Gothic", "Meiryo", "Segoe UI", sans-serif' });
    box(-IN + 0.02, -IN + 0.05, F + 0.86, F + 0.88, -5.4, -2.6, N.cyan);
    light('mezz', -2.4, F + 2.6, -4.0, 0xff2bd6, 10, 6);
    light('mezz', 3.0, F + 1.4, -4.95, 0x00e5ff, 8, 5);
    light('mezz', 0, F + 0.4, -2.8, 0x00e5ff, 7, 5);
    light('mezz', 1.5, F + 1.2, -5.25, 0x33e0ff, 6, 4);
  }

  // ----- спальня хозяина (правое крыло, у бассейна) -----
  {
    rug(4.9, 7.7, -5.6, -2.2, C.rug, null);
    bed(W1, -3.9, Math.PI / 2, 2.25, 2.0, C.fabric, C.tufted, N.violet, N.pink);
    nightstand(4.75, -5.35, N.cyan);
    nightstand(4.75, -2.45, N.cyan);
    screen(10.73, F + 1.4, -2.05, 1.2, 0.68, -Math.PI / 2, 'city');
    eggChair(9.6, -5.85, Math.PI * 0.85);
    neonLamp(10.4, -6.3, 1.8, N.violet);
    light('master', 5.0, F + 1.6, -3.9, 0xff2bd6, 10, 6);
    light('master', 5.6, F + 0.2, -3.9, 0x8a3bff, 6, 4);
    light('master', 9.9, F + 1.6, -6.0, 0x8a3bff, 8, 6);
    light('master', 10.4, F + 1.4, -2.1, 0x00e5ff, 6, 5);
  }
  // ----- ванная хозяина: подсветка ванны -----
  {
    torus(0.42, 0.014, 11.8, F + 0.03, -5.45, N.cyan);
    light('masterBath', 11.8, F + 0.5, -5.45, 0x00e5ff, 7, 4);
  }

  // ----- спальня 2 — игровая -----
  {
    bed(W1, 3.4, Math.PI / 2, 2.15, 1.8, C.fabricDark, C.tuftedRed, N.red, N.lime);
    nightstand(4.75, 1.95, N.red);
    // стол с тремя мониторами у перегородки санузла (x = 9.15)
    const dx = 9.15;
    box(dx - 0.8, dx, F + 0.72, F + 0.76, 2.1, 4.7, C.wood);
    box(dx - 0.8, dx - 0.78, F + 0.7, F + 0.72, 2.1, 4.7, N.red);
    for (const z of [2.2, 4.6]) box(dx - 0.75, dx - 0.05, F, F + 0.72, z - 0.03, z + 0.03, C.black);
    solid(dx - 0.8, dx, F, F + 0.78, 2.1, 4.7);
    const kinds = ['code', 'game', 'bars'];
    [3.4 - 0.6, 3.4, 3.4 + 0.6].forEach((z, i) => {
      const ry = -Math.PI / 2 + (i - 1) * -0.35;
      screen(dx - 0.35 - Math.abs(i - 1) * 0.07, F + 1.1, z, 0.56, 0.33, ry, kinds[i], 0.015);
    });
    box(dx - 0.36, dx - 0.3, F + 0.76, F + 0.9, 3.35, 3.45, C.black);
    rbox(0.22, 0.5, 0.45, 0.02, dx - 0.4, F + 0.25, 4.95, C.glossy);
    for (const y of [F + 0.15, F + 0.3, F + 0.45]) torus(0.07, 0.008, dx - 0.52, y, 4.95, [N.cyan, N.pink, N.violet][Math.round((y - F) / 0.15) % 3], 0, Math.PI / 2);
    solid(dx - 0.52, dx - 0.28, F, F + 0.5, 4.7, 5.2);
    // игровое кресло
    const cx = 7.75, cz = 3.4;
    rbox(0.55, 0.12, 0.55, 0.05, cx, F + 0.5, cz, C.tuftedRed);
    rbox(0.12, 0.8, 0.55, 0.05, cx - 0.3, F + 0.95, cz, C.tuftedRed, 0);
    for (const s of [-1, 1]) box(cx - 0.37, cx - 0.35, F + 0.62, F + 1.3, cz + s * 0.2 - 0.012, cz + s * 0.2 + 0.012, N.red);
    cyl(0.04, 0.04, 0.45, cx, F + 0.23, cz, C.black, 10);
    cyl(0.32, 0.32, 0.03, cx, F + 0.04, cz, C.black, 5);
    solid(cx - 0.36, cx + 0.3, F, F + 1.35, cz - 0.3, cz + 0.3);
    box(dx - 0.06, dx - 0.04, F + 1.85, F + 2.65, 2.45, 4.35, C.rubber);
    neonText('LEVEL UP', dx - 0.065, F + 2.25, 3.4, 1.8, 0.55, -Math.PI / 2, 0x7dff3a, { intensity: 2.2 }); // зелёный в 2 раза ярче розового: при 5 ореол заливал табло
    light('bed2', 8.6, F + 1.2, 3.4, 0x00e5ff, 8, 5);
    light('bed2', 7.9, F + 2.3, 3.4, 0x7dff3a, 8, 5);
    light('bed2', 5.5, F + 0.2, 3.4, 0xff2244, 6, 4);
  }

  // ----- кабинет за решёткой: стол с мониторами и серверная стойка -----
  {
    const wx = LZ;
    box(wx, wx + 0.65, F + 0.72, F + 0.76, 2.0, 4.2, C.wood);
    for (const z of [2.1, 4.1]) box(wx + 0.05, wx + 0.6, F, F + 0.72, z - 0.03, z + 0.03, C.black);
    solid(wx, wx + 0.65, F, F + 0.78, 2.0, 4.2);
    screen(wx + 0.12, F + 1.15, 2.75, 0.62, 0.36, Math.PI / 2, 'code', 0.015);
    screen(wx + 0.12, F + 1.15, 3.45, 0.62, 0.36, Math.PI / 2, 'bars', 0.015);
    chair(wx + 1.1, 3.1, -Math.PI / 2, C.leather);
    box(wx + 0.05, wx + 0.75, F, F + 2.0, 0.95, 1.65, C.black);
    screen(wx + 0.76, F + 1.0, 1.3, 0.62, 1.85, Math.PI / 2, 'rack', 0.0);
    solid(wx, wx + 0.8, F, F + 2.0, 0.9, 1.7);
    light('study', wx + 0.5, F + 1.3, 3.1, 0x00e5ff, 6, 4);
    light('study', wx + 0.9, F + 1.2, 1.3, 0x30ff7a, 6, 4);
  }

  // ----- спальня 3 (левое крыло, у бассейна) -----
  {
    rug(-7.7, -4.9, -5.6, -2.2, C.rugViolet, null);
    bed(-W1, -3.9, -Math.PI / 2, 2.25, 2.0, C.fabric, C.tufted, N.cyan, N.violet);
    nightstand(-4.75, -5.35, N.violet);
    nightstand(-4.75, -2.45, N.violet);
    eggChair(-9.8, -5.85, -Math.PI * 0.85, C.glossy, C.tuftedRed);
    roundTable(-9.0, -5.3, 0.25, 0.5, C.glossy, N.amber);
    const g2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 2), holoMaterial(0xffa000));
    g2.position.set(-9.0, F + 0.8, -5.3);
    g2.userData.noAO = true;
    group.add(g2);
    anim.push((t) => { g2.rotation.y = -t * 0.7; });
    light('bed3', -5.0, F + 1.6, -3.9, 0x8a3bff, 9, 6);
    light('bed3', -9.6, F + 1.4, -5.7, 0xffa000, 7, 5);
  }

  // ----- спальня 4: кровать, зеркало с неоном, груша, стойка VR -----
  {
    bed(-W1, 3.4, -Math.PI / 2, 2.15, 1.8, C.fabricDark, C.tuftedRed, N.cyan, N.cyan);
    nightstand(-4.75, 1.95, N.violet);
    const mx = -10.75 + 0.02;
    box(mx, mx + 0.02, F + 0.3, F + 2.3, 1.2, 2.9, MI.mirror);
    for (const [y0, y1, z0, z1] of [[F + 0.28, F + 0.3, 1.18, 2.92], [F + 2.3, F + 2.32, 1.18, 2.92], [F + 0.28, F + 2.32, 1.18, 1.2], [F + 0.28, F + 2.32, 2.9, 2.92]]) box(mx + 0.02, mx + 0.035, y0, y1, z0, z1, N.cyan);
    cyl(0.17, 0.17, 0.95, -9.4, F + 1.2, 3.0, C.leather, 24);
    for (const y of [F + 0.8, F + 1.6]) torus(0.172, 0.008, -9.4, y, 3.0, N.cyan);
    cyl(0.005, 0.005, C1 - F - 1.68, -9.4, (F + 1.68 + C1) / 2, 3.0, C.black, 4);
    solid(-9.6, -9.2, F + 0.7, F + 1.7, 2.8, 3.2);
    cyl(0.2, 0.24, 1.0, -8.2, F + 0.5, 4.9, C.glossy, 24);
    torus(0.21, 0.01, -8.2, F + 1.0, 4.9, N.cyan);
    rbox(0.22, 0.1, 0.12, 0.03, -8.2, F + 1.07, 4.9, C.plastic);
    solid(-8.45, -7.95, F, F + 1.1, 4.65, 5.15);
    light('bed4', -10.3, F + 1.6, 2.05, 0x00e5ff, 9, 5);
    light('bed4', -5.5, F + 0.2, 3.4, 0x8a3bff, 6, 4);
  }

  // ----- санузлы: подсветка под тумбами и за зеркалами -----
  const vanityGlow = (axis, at0, n, u0, u1, floor, color) => {
    const v = (a) => at0 + n * a, w = (a, c) => [Math.min(v(a), v(c)), Math.max(v(a), v(c))];
    const [t0, t1] = w(0.08, 0.5);
    if (axis === 'x') box(u0 + 0.05, u1 - 0.05, floor + 0.6, floor + 0.61, t0, t1, color);
    else box(t0, t1, floor + 0.6, floor + 0.61, u0 + 0.05, u1 - 0.05, color);
    const [m0, m1] = w(0.004, 0.012);
    if (axis === 'x') box(u0 + 0.01, u1 - 0.01, floor + 1.1, floor + 2.2, m0, m1, color);
    else box(m0, m1, floor + 1.1, floor + 2.2, u0 + 0.01, u1 - 0.01, color);
  };
  vanityGlow('x', 3.0, 1, 6.4, 7.4, F0, N.cyan);
  vanityGlow('z', -8.45, 1, 3.3, 4.6, F0, N.cyan);
  vanityGlow('z', LZ, 1, -3.0, -1.35, F1, N.cyan);
  vanityGlow('z', 10.75, -1, 2.3, 3.5, F1, N.pink);
  vanityGlow('z', -LZ, -1, -3.0, -1.6, F1, N.violet);
  vanityGlow('z', -LZ, -1, 1.2, 2.6, F1, N.cyan);

  // ----- снаружи: неон по борту бассейна, номер дома (видно вечером) -----
  const poolNeon = neonMat(0xff2bd6, 0);
  night.push({ mat: poolNeon, on: 4 });
  const houseNo = neonMat(0x00e5ff, 0);
  night.push({ mat: houseNo, on: 5 });
  {
    box(-4.4, 9.4, 0.065, 0.075, -7.86, -7.82, poolNeon); // вдоль ближнего к дому борта бассейна
    box(-3.25, -2.55, 0.25, 0.85, 16.67, 16.69, C.plastic);
    night.push({ mat: neonText('4', -2.9, 0.55, 16.7, 0.5, 0.5, 0, 0x00e5ff, { intensity: 0 }), on: 5 });
    box(-3.25, -2.55, 0.24, 0.25, 16.67, 16.7, houseNo);
  }

  // ----- режим: в киберпанке подсветка дома холоднее и ярче, точечные светильники приглушены -----
  const base = {
    led: [MI.led.emissive.getHex(), MI.led.emissiveIntensity], riser: [MI.riser.emissive.getHex(), MI.riser.emissiveIntensity],
    down: MI.downlight.emissiveIntensity, facade: M.ledFacade.emissive.getHex()
  };
  function setMode(on) {
    MI.led.emissive.set(on ? 0x00e5ff : base.led[0]);
    MI.led.emissiveIntensity = on ? 3.2 : base.led[1];
    MI.riser.emissive.set(on ? 0xff2bd6 : base.riser[0]);
    MI.riser.emissiveIntensity = on ? 1.6 : base.riser[1];
    MI.downlight.emissiveIntensity = on ? 0.9 : base.down;
    M.ledFacade.emissive.set(on ? 0x00e5ff : base.facade);
  }
  anim.push((t) => {
    for (const m of screens) m.uniforms.time.value = t;
    for (const m of holoMats) m.uniforms.time.value = t;
    N.pink.emissiveIntensity = 5 * (0.96 + 0.04 * Math.sin(t * 31.0) * Math.sin(t * 7.3));
  });

  b.flush(group);
  return { group, phys, lights, anim, night, setMode };
}
