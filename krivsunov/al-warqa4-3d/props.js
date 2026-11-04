// Мебель, растения и декор из моделей Poly Haven (CC0, app/models/<id>.glb — собирает max/models_pc.py).
// Модели в реальном масштабе, «лицом» к +z; точка опоры — середина низа. Всё ставится в группу мебели и декора,
// поэтому выключатель «Мебель и декор» убирает и их. Экспорт: PROPS (расстановка) и place() (сборка по загруженным).
const F0 = 0.9, F1 = 5.3, PI = Math.PI;

// id — модель; at — точка опоры [x, y, z]; ry — поворот; s — масштаб; col — препятствие для прогулки:
// 'box' — вся коробка, 'trunk' — только ствол у земли, без col — проходимо (мелочь на столах и полках)
export const PROPS = [
  // ----- 1-й этаж: холл -----
  { id: 'potted_plant_01', at: [-3.25, F0, 3.85], ry: 0.3, col: 'box' },
  { id: 'potted_plant_01', at: [3.3, F0, 3.9], ry: 2.1, col: 'box' },
  { id: 'potted_plant_02', at: [-3.3, F0, -1.5], ry: 0.8, col: 'box' },
  { id: 'potted_plant_02', at: [3.3, F0, -1.5], ry: 2.6, col: 'box' },
  // ----- большая гостиная -----
  { id: 'potted_plant_01', at: [-6.0, F0, -6.3], ry: 1.2, col: 'box' },
  { id: 'potted_plant_02', at: [-11.25, F0, -5.2], ry: 0.4, col: 'box' },
  { id: 'Ottoman_01', at: [-7.2, F0, -2.55], ry: 0.15, col: 'box' },
  { id: 'chess_set', at: [-8.75, F0 + 0.4, -3.9], ry: 0.25 },
  { id: 'ceramic_vase_03', at: [-7.8, F0 + 0.4, -3.72], ry: 0 },
  { id: 'gaming_console', at: [-9.7, F0 + 0.62, 0.3], ry: PI },
  { id: 'bull_head', at: [-7.45, F0 + 0.62, 0.32], ry: PI + 0.35 },
  // ----- столовая и бар: восемь стульев, ваза, чаша, вино -----
  ...[7.4, 8.2, 9.0, 9.8].flatMap((x) => [
    { id: 'dining_chair_02', at: [x, F0, -5.4], ry: 0, col: 'box' },
    { id: 'dining_chair_02', at: [x, F0, -3.8], ry: PI, col: 'box' }
  ]),
  { id: 'ceramic_vase_01', at: [8.6, F0 + 0.8, -4.62], ry: 0.4 },
  { id: 'wooden_bowl_01', at: [9.55, F0 + 0.8, -4.55], ry: 0 },
  { id: 'wine_bottles_01', at: [7.2, F0 + 1.09, 0.22], ry: 0 },
  { id: 'ceramic_vase_02', at: [11.47, F0 + 0.8, -5.75], ry: 0 },
  { id: 'standing_picture_frame_02', at: [11.5, F0 + 0.8, -4.45], ry: -PI / 2 - 0.25 },
  { id: 'wall_clock', at: [11.73, F0 + 1.95, -5.1], ry: -PI / 2 },
  // ----- коридоры и гостевая -----
  { id: 'potted_plant_02', at: [-5.1, F0, 5.3], ry: 1.9, col: 'box' },
  { id: 'potted_plant_02', at: [5.1, F0, 5.3], ry: 0.2, col: 'box' },
  { id: 'potted_plant_04', at: [-9.45, F0 + 0.76, 5.45], ry: 0.5 },
  { id: 'standing_picture_frame_01', at: [-10.6, F0 + 0.76, 5.55], ry: PI + 0.3 },
  // ----- 2-й этаж: малая гостиная и галерея -----
  { id: 'potted_plant_01', at: [-3.3, F1, -2.35], ry: 2.6, col: 'box' },
  { id: 'ceramic_vase_04', at: [0.18, F1 + 0.38, -3.7], ry: 0 },
  { id: 'marble_bust_01', at: [3.05, F1 + 1.05, 3.75], ry: -PI / 2 - 0.4 },
  // ----- спальня хозяина: кресло у экрана, комод, пуф в ногах -----
  { id: 'mid_century_lounge_chair', at: [8.9, F1, -2.35], ry: PI / 2 + 0.25, col: 'box' },
  { id: 'side_table_01', at: [7.95, F1, -2.35], ry: 0.1, col: 'box' },
  { id: 'modern_wooden_cabinet', at: [10.45, F1, -2.75], ry: -PI / 2, col: 'box' },
  { id: 'ceramic_vase_02', at: [10.45, F1 + 0.68, -3.6], ry: 0.3 },
  { id: 'Ottoman_01', at: [7.05, F1, -3.9], ry: PI / 2, col: 'box' },
  // ----- игровая и кабинет -----
  { id: 'gaming_console', at: [8.6, F1 + 0.76, 4.4], ry: -PI / 2 },
  { id: 'potted_plant_04', at: [8.6, F1 + 0.76, 2.3], ry: 0 },
  { id: 'book_encyclopedia_set_01', at: [11.28, F1 + 0.76, 3.95], ry: PI / 2 },
  { id: 'modern_arm_chair_01', at: [12.15, F1, 3.95], ry: -PI / 2 - 0.3, col: 'box' }, // у окна в лоджию
  // ----- спальни 3 и 4 -----
  { id: 'potted_plant_02', at: [-10.2, F1, -1.9], ry: 1.1, col: 'box' },
  { id: 'potted_plant_01', at: [-10.2, F1, 4.95], ry: 0.6, col: 'box' },
  // ----- задний двор: колчанные деревья, суккуленты, кусты, столик у бассейна -----
  { id: 'quiver_tree_01', at: [-8.6, 0.065, -14.6], ry: 0.7, col: 'trunk' },
  { id: 'quiver_tree_02', at: [13.7, 0.065, -9.8], ry: 2.2, col: 'trunk' },
  { id: 'cheiridopsis_succulent', at: [-10.4, 0.065, -11.3], ry: 0 },
  { id: 'othonna_cerarioides', at: [-12.2, 0.065, -15.4], ry: 0.4, s: 0.8 },
  { id: 'leipoldtia_schultzei', at: [11.8, 0.065, -11.0], ry: 1.2 },
  { id: 'crystalline_iceplant', at: [15.6, 0.065, -11.0], ry: 0.3 },
  { id: 'outdoor_table_chair_set_01', at: [-8.4, 0.75, -9.6], ry: PI / 2, col: 'box' }, // на террасе у бассейна
  // ----- боковые проходы: живая изгородь и деревья -----
  { id: 'shrub_02', at: [-15.6, 0.03, -3.0], ry: PI / 2, s: 0.8 },
  { id: 'quiver_tree_01', at: [-13.8, 0.03, 2.4], ry: 2.5, s: 0.85, col: 'trunk' },
  { id: 'quiver_tree_02', at: [-13.9, 0.03, -6.2], ry: 4.0, col: 'trunk' },
  // ----- передний двор и уличные клумбы -----
  { id: 'wild_rooibos_bush', at: [-13.6, 0.03, 15.6], ry: 0 },
  { id: 'wild_rooibos_bush', at: [14.0, 0.03, 15.6], ry: PI },
  { id: 'flower_gazania', at: [5.75, 0.15, 17.7], ry: 0.3, s: 0.7 },
  { id: 'flower_gazania', at: [11.9, 0.15, 18.35], ry: 2.0, s: 0.7 },
  { id: 'crystalline_iceplant', at: [-15.7, 0.03, 12.8], ry: 1.4 }
];

// models: { id: gltf } → расставляет копии в group, препятствия добавляет в phys.colliders
export function place(THREE, models, group, phys) {
  const pivots = new Map();
  const roomMats = new Map(); // своя копия материалов на этаж: отражения берутся из зонда этого этажа
  const inside = (p) => Math.abs(p[0]) < 13.9 && p[2] > -7.1 && p[2] < 6.1 && p[1] > F0 - 0.2;
  const tmp = new THREE.Box3();
  let count = 0;
  for (const item of PROPS) {
    const gltf = models[item.id];
    if (!gltf) continue;
    if (!pivots.has(item.id)) {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const c = box.getCenter(new THREE.Vector3());
      pivots.set(item.id, new THREE.Vector3(c.x, box.min.y, c.z));
      gltf.scene.traverse((node) => {
        if (!node.isMesh) return;
        for (const m of [].concat(node.material)) {
          // листья с прозрачностью по маске: в проходе затенения их не видно, иначе на AO ложатся прямоугольники
          if (m.alphaTest > 0 || m.transparent) node.userData.noAO = true;
          m.envMapIntensity = 1;
        }
      });
    }
    const floor = inside(item.at) ? (item.at[1] < F1 - 0.5 ? 'gf' : 'ff') : null;
    const inner = gltf.scene.clone(true);
    inner.position.copy(pivots.get(item.id)).multiplyScalar(-1);
    if (floor) inner.traverse((node) => {
      if (!node.isMesh) return;
      node.material = [].concat(node.material).map((m) => {
        const key = `${m.uuid}:${floor}`;
        if (!roomMats.has(key)) { const c = m.clone(); c.userData.room = floor; roomMats.set(key, c); }
        return roomMats.get(key);
      });
      if (node.material.length === 1) node.material = node.material[0];
    });
    const outer = new THREE.Group();
    outer.add(inner);
    outer.position.set(...item.at);
    outer.rotation.y = item.ry || 0;
    outer.scale.setScalar(item.s || 1);
    outer.name = item.id;
    group.add(outer);
    outer.updateMatrixWorld(true);
    if (item.col === 'box') {
      tmp.setFromObject(outer);
      phys.colliders.push([tmp.min.x, tmp.min.y, tmp.min.z, tmp.max.x, tmp.max.y, tmp.max.z]);
    } else if (item.col === 'trunk') {
      const [x, y, z] = item.at;
      phys.colliders.push([x - 0.25, y, z - 0.25, x + 0.25, y + 2.2, z + 0.25]);
    }
    count++;
  }
  return count;
}
