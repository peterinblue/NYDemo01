import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------- Renderer / Scene ----------
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe6eaef);
scene.fog = new THREE.Fog(0xe6eaef, 360, 980);

const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.5, 2600);
camera.position.set(10, 125, 235);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 30;
controls.maxDistance = 480;
controls.target.set(0, 4, 0);

// ---------- Materials (match 2.5D bright white + blue glass + cyan strips) ----------
const MAT = {
  ground: new THREE.MeshStandardMaterial({ color: 0xd2d7de, roughness: 0.95, metalness: 0.02 }),
  road: new THREE.MeshStandardMaterial({ color: 0xc0c6ce, roughness: 0.9 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: 0xe6eaef, roughness: 0.92 }),
  body: new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.7, metalness: 0.04 }),
  bodyDim: new THREE.MeshStandardMaterial({ color: 0xe4e8ee, roughness: 0.75, metalness: 0.05 }),
  bodyDark: new THREE.MeshStandardMaterial({ color: 0xc9d0da, roughness: 0.8, metalness: 0.08 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0x7eb6e8, roughness: 0.28, metalness: 0.18,
    emissive: 0x2a5f96, emissiveIntensity: 0.2,
  }),
  glassDeep: new THREE.MeshStandardMaterial({
    color: 0x4d8fc9, roughness: 0.25, metalness: 0.25,
    emissive: 0x143d68, emissiveIntensity: 0.15,
  }),
  neon: new THREE.MeshStandardMaterial({
    color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.25, roughness: 0.35,
  }),
  solar: new THREE.MeshStandardMaterial({ color: 0x1a3f7a, roughness: 0.35, metalness: 0.55 }),
  solarFrame: new THREE.MeshStandardMaterial({ color: 0xd8dee6, roughness: 0.55, metalness: 0.3 }),
  tree: new THREE.MeshStandardMaterial({ color: 0x7eb5ad, roughness: 0.9 }),
  treeAlt: new THREE.MeshStandardMaterial({ color: 0x6aa39b, roughness: 0.9 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x8fa3b0, roughness: 0.95 }),
  grass: new THREE.MeshStandardMaterial({ color: 0xa8cfc7, roughness: 0.95 }),
  field: new THREE.MeshStandardMaterial({ color: 0x3d9e6f, roughness: 0.85 }),
  court: new THREE.MeshStandardMaterial({ color: 0x2f6f9e, roughness: 0.8 }),
  parking: new THREE.MeshStandardMaterial({ color: 0xb9c0c9, roughness: 0.92 }),
  charge: new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x1188aa, emissiveIntensity: 0.8 }),
  roofEquip: new THREE.MeshStandardMaterial({ color: 0xaeb6c2, roughness: 0.7, metalness: 0.2 }),
  windowBand: new THREE.MeshStandardMaterial({
    color: 0x4d96d8, roughness: 0.28, metalness: 0.35,
    emissive: 0x0b3564, emissiveIntensity: 0.1,
  }),
};

// ---------- Lights ----------
const hemi = new THREE.HemisphereLight(0xf8fbff, 0xc8d0da, 1.15);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.55);
sun.position.set(90, 150, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 480;
sun.shadow.camera.left = -240;
sun.shadow.camera.right = 240;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
sun.shadow.bias = -0.00025;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xdceaff, 0.4);
fill.position.set(-80, 60, -50);
scene.add(fill);

// ---------- Helpers ----------
const campus = new THREE.Group();
scene.add(campus);

const clickable = [];
const pois = [];

function box(w, h, d, mat, x = 0, y = h / 2, z = 0, cast = true, recv = true, parent = campus) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = recv;
  parent.add(m);
  return m;
}

function cyl(rt, rb, h, seg, mat, x = 0, y = h / 2, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  campus.add(m);
  return m;
}

function markClickable(mesh, info) {
  mesh.userData.info = info;
  clickable.push(mesh);
  return mesh;
}

/** White body + blue glass curtain on long faces + cyan floor strips (matches source style). */
function addBuilding({ x, z, w, d, h, style = "office", name, desc, floors = 4 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  campus.add(g);

  // main mass: always light white body
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.body);
  base.position.y = h / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // podium plinth
  if (style === "office" || style === "glass") {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, 1.1, d + 2.4), MAT.bodyDim);
    pod.position.y = 0.55;
    pod.castShadow = true;
    pod.receiveShadow = true;
    g.add(pod);
  }

  // blue glass bands on long faces — keep majority white body visible
  if (style === "glass" || style === "office") {
    const glassMat = style === "glass" ? MAT.glass : MAT.windowBand;
    const gh = Math.max(1.6, h * (style === "glass" ? 0.48 : 0.32));
    const gy = h * 0.58;
    const gw = w * (style === "glass" ? 0.82 : 0.7);
    box(gw, gh, 0.22, glassMat, 0, gy, d / 2 + 0.06, false, false, g);
    box(gw, gh, 0.22, glassMat, 0, gy, -d / 2 - 0.06, false, false, g);
    if (style === "glass" || h > 14) {
      const gd = d * (style === "glass" ? 0.78 : 0.65);
      box(0.22, gh, gd, glassMat, w / 2 + 0.06, gy, 0, false, false, g);
      box(0.22, gh, gd, glassMat, -w / 2 - 0.06, gy, 0, false, false, g);
    }
  }

  // cyan neon floor bands
  const bands = Math.max(2, Math.min(9, floors));
  for (let i = 1; i <= bands; i++) {
    const yy = (h / (bands + 1)) * i;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.16, d + 0.2), MAT.neon);
    strip.position.y = yy;
    g.add(strip);
  }

  // industrial: lower, more solid, fewer windows
  if (style === "industrial") {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.28, d + 0.15), MAT.neon);
    strip.position.y = Math.min(2.4, h * 0.38);
    g.add(strip);
    box(w * 0.55, 0.35, d * 0.2, MAT.bodyDark, 0, h + 0.18, 0, true, true, g);
  }

  // roof equipment
  if (h > 9 && style !== "industrial") {
    const equip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 1.2, d * 0.24), MAT.roofEquip);
    equip.position.set(w * 0.1, h + 0.6, -d * 0.12);
    equip.castShadow = true;
    g.add(equip);
  }

  markClickable(base, {
    title: name || "建筑",
    desc: desc || "航天城功能建筑",
    kind: "building",
  });

  return g;
}

function addSolarFarm({ x, z, w, d, rows = 5, cols = 12, label, name, desc }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  campus.add(g);

  const plat = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 0.35, d + 4), MAT.sidewalk);
  plat.position.y = 0.18;
  plat.receiveShadow = true;
  g.add(plat);

  const panelW = (w - 2) / cols;
  const panelD = (d - 2) / rows;
  const geo = new THREE.BoxGeometry(panelW * 0.84, 0.12, panelD * 0.74);
  const frameGeo = new THREE.BoxGeometry(panelW * 0.92, 0.08, panelD * 0.82);
  const panels = new THREE.InstancedMesh(geo, MAT.solar, rows * cols);
  const frames = new THREE.InstancedMesh(frameGeo, MAT.solarFrame, rows * cols);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = -w / 2 + 1 + panelW * (c + 0.5);
      const pz = -d / 2 + 1 + panelD * (r + 0.5);
      dummy.position.set(px, 0.58, pz);
      dummy.rotation.set(-0.32, 0, 0);
      dummy.updateMatrix();
      panels.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.44;
      dummy.updateMatrix();
      frames.setMatrixAt(i, dummy.matrix);
      i++;
    }
  }
  panels.castShadow = true;
  frames.castShadow = true;
  g.add(panels, frames);

  if (label) {
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(11, 2.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0ea5b7, emissiveIntensity: 0.95 })
    );
    plaque.position.set(0, 2.0, -d / 2 - 0.8);
    plaque.castShadow = true;
    g.add(plaque);
    for (let t = 0; t < 3; t++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(8.2 - t * 0.7, 0.18, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.45 })
      );
      bar.position.set(-0.3, 1.55 + t * 0.38, -d / 2 - 1.05);
      g.add(bar);
    }
  }

  markClickable(plat, {
    title: name || label || "光伏区",
    desc: desc || "地面光伏阵列，对应平面图 A/B/C 区",
    kind: "solar",
  });
  return g;
}

function addTree(x, z, s = 1, alt = false) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 1.5 * s, 6), MAT.trunk);
  trunk.position.y = 0.75 * s;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.1 * s, 2.7 * s, 7), alt ? MAT.treeAlt : MAT.tree);
  canopy.position.y = 2.5 * s;
  trunk.castShadow = canopy.castShadow = true;
  canopy.receiveShadow = true;
  g.add(trunk, canopy);
  g.position.set(x, 0, z);
  campus.add(g);
  return g;
}

function plantTreeLine(x0, z0, x1, z1, count, s = 1) {
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    addTree(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, s * (0.85 + ((i * 17) % 5) * 0.04), i % 3 === 0);
  }
}

function addParking({ x, z, w, d, rows = 2, ev = false }) {
  const pad = box(w, 0.12, d, MAT.parking, x, 0.06, z, false, true);
  markClickable(pad, {
    title: ev ? "充电停车场" : "停车场",
    desc: ev ? "含充电桩的园区停车区" : "园区地面停车场",
    kind: "parking",
  });
  const stall = 2.2;
  const cols = Math.floor(w / stall);
  for (let r = 0; r < rows; r++) {
    const zz = z - d / 2 + 2.5 + r * (d - 4) / Math.max(1, rows - 1 || 1);
    for (let c = 0; c < cols; c++) {
      const xx = x - w / 2 + 1.5 + c * stall;
      const car = box(1.55, 0.5, 3.0, MAT.bodyDim, xx, 0.32, zz, true, true);
      car.scale.set(0.85 + ((c + r) % 3) * 0.05, 0.9, 1);
      if (ev && c % 3 === 0) {
        box(0.22, 1.0, 0.22, MAT.charge, xx + 1.05, 0.5, zz - 1.3, false, false);
      }
    }
  }
  return pad;
}

function addRoad(w, d, x, z) {
  return box(w, 0.08, d, MAT.road, x, 0.04, z, false, true);
}

function addSidewalk(w, d, x, z) {
  return box(w, 0.14, d, MAT.sidewalk, x, 0.07, z, false, true);
}

function addPOI(num, x, z, name, desc) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.0, 8), MAT.neon);
  pole.position.y = 1.0;
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 14, 14),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.88,
    })
  );
  halo.position.y = 2.4;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.055, 8, 22),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.1 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  g.add(pole, halo, ring);
  campus.add(g);
  markClickable(halo, {
    title: `${String(num).padStart(2, "0")} · ${name}`,
    desc,
    kind: "poi",
    num,
  });
  pois.push({ g, halo, ring, num, baseY: 2.4 });
  return g;
}

// ---------- Ground & Roads ----------
box(430, 1, 160, MAT.ground, 0, -0.5, 0, false, true);

addSidewalk(420, 5, 0, -64);
addSidewalk(420, 5, 0, 64);
addSidewalk(5, 128, -202, 0);
addSidewalk(5, 128, 202, 0);

addRoad(410, 8, 0, -56);
addRoad(410, 8, 0, 56);
addRoad(8, 112, -192, 0);
addRoad(8, 112, 192, 0);

[-145, -75, -5, 65, 135].forEach((x) => addRoad(6.5, 108, x, 0));
addRoad(400, 5.5, 0, -20);
addRoad(400, 5.5, 0, 22);

for (let x = -185; x <= 185; x += 18) {
  box(8, 0.16, 2.2, MAT.grass, x, 0.08, -56, false, true);
  box(8, 0.16, 2.2, MAT.grass, x, 0.08, 56, false, true);
}

plantTreeLine(-190, -60, 190, -60, 40, 1);
plantTreeLine(-190, 60, 190, 60, 40, 1);
plantTreeLine(-196, -50, -196, 50, 16, 0.95);
plantTreeLine(196, -50, 196, 50, 16, 0.95);

// ---------- West Zone ----------
const plazaBase = cyl(14, 14, 0.25, 48, MAT.sidewalk, -172, 0.12, -18);
const plazaRing = new THREE.Mesh(new THREE.TorusGeometry(9, 0.55, 10, 40), MAT.bodyDim);
plazaRing.rotation.x = Math.PI / 2;
plazaRing.position.set(-172, 0.3, -18);
plazaRing.receiveShadow = true;
campus.add(plazaRing);
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  addTree(-172 + Math.cos(a) * 12, -18 + Math.sin(a) * 12, 0.85);
}
markClickable(plazaBase, {
  title: "西门环岛广场",
  desc: "园区西侧主入口环形景观广场",
  kind: "landmark",
});

addSolarFarm({
  x: -158, z: 30, w: 50, d: 36, rows: 6, cols: 15,
  label: "A", name: "A 区光伏阵列",
  desc: "西南侧大型地面光伏，对应平面图 A 区",
});

addBuilding({
  x: -142, z: -8, w: 24, d: 15, h: 7.5, style: "industrial",
  name: "乾都 10KV", desc: "西侧 10KV 变配电设施", floors: 2,
});
addPOI(1, -180, -8, "西门岗亭", "园区西侧入口门禁点位");
addPOI(2, -174, -30, "西侧巡更", "西侧道路巡更与安防点位");
addPOI(8, -180, 36, "A区西端", "A 区光伏西端观测点");
addPOI(3, -144, 40, "A区东南", "A 区光伏东南角");
addPOI(41, -168, -2, "西景观节点", "环岛与绿地景观节点");
addPOI(48, -158, -24, "西服务点", "西侧服务与后勤节点");

for (let i = 0; i < 18; i++) {
  addTree(-152 + (i % 6) * 3.2, -34 - Math.floor(i / 6) * 3.5, 0.8 + (i % 3) * 0.08, i % 2 === 0);
}

addSolarFarm({
  x: -148, z: -40, w: 42, d: 28, rows: 5, cols: 13,
  label: "B", name: "B 区光伏阵列",
  desc: "西北侧光伏阵列，对应平面图 B 区",
});
addPOI(9, -124, -38, "B区东缘", "B 区光伏东侧边界点");

// sports
const field = box(30, 0.15, 18, MAT.field, -108, 0.1, -42, false, true);
for (let i = 0; i < 5; i++) {
  box(28, 0.02, 0.25, new THREE.MeshStandardMaterial({ color: 0xe8f7ef }), -108, 0.18, -50 + i * 4, false, false);
}
box(0.25, 0.02, 16, new THREE.MeshStandardMaterial({ color: 0xe8f7ef }), -108, 0.18, -42, false, false);
const centerCircle = new THREE.Mesh(
  new THREE.RingGeometry(2.2, 2.5, 24),
  new THREE.MeshStandardMaterial({ color: 0xe8f7ef, side: THREE.DoubleSide })
);
centerCircle.rotation.x = -Math.PI / 2;
centerCircle.position.set(-108, 0.19, -42);
campus.add(centerCircle);
markClickable(field, { title: "足球场", desc: "园区体育中心标准足球场", kind: "sport" });

for (let i = 0; i < 2; i++) {
  const bx = -100 + i * 12;
  const court = box(9, 0.12, 14, MAT.court, bx, 0.08, -28, false, true);
  markClickable(court, { title: `篮球场 ${i + 1}`, desc: "体育中心室外篮球场", kind: "sport" });
  box(0.15, 2.4, 0.15, MAT.bodyDark, bx, 1.2, -28 - 5.5);
  box(0.15, 2.4, 0.15, MAT.bodyDark, bx, 1.2, -28 + 5.5);
}
addPOI(44, -114, -44, "体育中心", "足球场与篮球场综合体育设施");

addBuilding({ x: -110, z: 10, w: 17, d: 13, h: 16, style: "glass", name: "西区研发楼 A", desc: "多层科研办公楼", floors: 5 });
addBuilding({ x: -94, z: 12, w: 15, d: 14, h: 20, style: "glass", name: "西区研发楼 B", desc: "蓝玻璃幕墙科研楼", floors: 6 });
addBuilding({ x: -94, z: -6, w: 13, d: 11, h: 11, style: "office", name: "西区配套楼", desc: "办公配套建筑", floors: 3 });
addPOI(42, -120, 20, "西研发群", "西侧研发建筑群");

// ---------- Central ----------
addBuilding({
  x: -50, z: -10, w: 22, d: 17, h: 8, style: "industrial",
  name: "八部 10KV", desc: "中部 10KV 变电站，服务八部区域", floors: 2,
});
cyl(4.2, 4.2, 5.5, 24, MAT.glassDeep, -38, 2.75, 8);
cyl(3.2, 3.2, 4.2, 24, MAT.bodyDim, -32, 2.1, 4);
addPOI(31, -60, -4, "八部西点", "八部10KV 西侧点位");
addPOI(28, -42, -18, "八部北点", "八部10KV 北侧点位");
addPOI(30, -44, 14, "八部南点", "八部10KV 南侧点位");
addPOI(17, -56, 6, "中西联络", "中部西侧联络通道");

addParking({ x: -50, z: 34, w: 38, d: 16, rows: 2, ev: true });
addPOI(18, -64, 36, "充电桩区", "EV 充电停车区西段");
addPOI(19, -50, 42, "充电中心", "EV 充电停车区中段");
addPOI(20, -36, 36, "充电东段", "EV 充电停车区东段");

addBuilding({ x: -12, z: -8, w: 20, d: 15, h: 13, style: "office", name: "中部综合楼", desc: "园区中部综合服务楼", floors: 4 });
addBuilding({ x: 8, z: -12, w: 15, d: 13, h: 10, style: "office", name: "中部实验楼", desc: "实验与检测用房", floors: 3 });
addBuilding({ x: -14, z: 14, w: 17, d: 13, h: 15, style: "glass", name: "中部办公楼", desc: "中部蓝玻璃办公塔楼", floors: 5 });
addPOI(10, 0, -2, "中部节点", "中部园区核心节点");
addPOI(14, -20, 38, "中南口", "中部南侧出入口");
addPOI(21, -80, 36, "西中通道", "西区与中部连接点");

// landmark tower — white body + full blue glass + crown
const tower = addBuilding({
  x: 18, z: -32, w: 13, d: 13, h: 38, style: "glass",
  name: "航天城地标高塔", desc: "园区中部最高蓝玻地标塔",
  floors: 12,
});
box(11, 2.8, 11, MAT.body, 18, 38 + 1.4, -32);
box(11.2, 0.28, 0.3, MAT.neon, 18, 36, -25.5);
addPOI(12, 28, -36, "地标高塔", "中部最高建筑观测点");
addPOI(13, 30, -26, "塔东平台", "地标塔东侧平台");
addPOI(11, -10, -42, "北研发西", "北侧研发群西点");
addPOI(16, -20, -46, "北实验区", "北部实验建筑点位");
addPOI(15, 4, -44, "北研发中", "北部研发中点");

addBuilding({ x: -22, z: -42, w: 19, d: 13, h: 10, style: "office", name: "北研发一号楼", desc: "北部研发办公楼", floors: 3 });
addBuilding({ x: 4, z: -42, w: 17, d: 13, h: 11, style: "office", name: "北研发二号楼", desc: "北部研发办公楼", floors: 3 });
addBuilding({ x: 32, z: -42, w: 15, d: 15, h: 15, style: "glass", name: "北研发三号楼", desc: "北部蓝玻研发楼", floors: 4 });
addBuilding({ x: 50, z: -38, w: 13, d: 19, h: 12, style: "office", name: "北配套楼", desc: "北部配套服务建筑", floors: 3 });

box(22, 0.12, 8, MAT.grass, 0, 0.08, -30, false, true);
for (let i = 0; i < 8; i++) addTree(-10 + i * 2.6, -30, 0.75);

addBuilding({ x: 50, z: -8, w: 17, d: 15, h: 16, style: "glass", name: "东研发楼", desc: "中东部科研办公楼", floors: 5 });
addBuilding({ x: 64, z: 8, w: 15, d: 13, h: 11, style: "office", name: "东综合楼", desc: "中东部综合建筑", floors: 3 });
addBuilding({ x: 42, z: 16, w: 13, d: 11, h: 9, style: "office", name: "东服务楼", desc: "服务与后勤", floors: 3 });
addPOI(24, 36, -20, "中东北点", "中部东北区域");
addPOI(25, 46, -20, "东研发西", "东研发西侧");
addPOI(22, 80, 30, "中东南点", "中部东南区域");
addPOI(23, 72, -8, "东综合点", "东综合楼周边");
addPOI(29, -74, -20, "西中东侧", "西区与中部东侧连接");

addParking({ x: 10, z: 30, w: 32, d: 14, rows: 2, ev: false });
addParking({ x: 72, z: 30, w: 28, d: 12, rows: 2, ev: true });

// ---------- East ----------
addBuilding({
  x: 90, z: -38, w: 15, d: 11, h: 6.5, style: "industrial",
  name: "35KV 站", desc: "园区 35KV 变电站", floors: 2,
});
addPOI(6, 82, -44, "35KV 西", "35KV 站西侧");
addPOI(7, 98, -42, "35KV 东", "35KV 站东侧");

addBuilding({
  x: 102, z: -12, w: 19, d: 13, h: 7, style: "industrial",
  name: "803 所 10KV", desc: "803 所区域 10KV 配电", floors: 2,
});

addSolarFarm({
  x: 112, z: 30, w: 46, d: 34, rows: 6, cols: 14,
  label: "C", name: "C 区光伏阵列",
  desc: "东侧大型光伏阵列，对应平面图 C 区",
});

addBuilding({
  x: 158, z: -30, w: 22, d: 15, h: 8, style: "industrial",
  name: "804 所 10KV", desc: "804 所区域 10KV 配电", floors: 2,
});
addPOI(47, 172, -24, "804 北点", "804 所区域北侧");

addBuilding({ x: 132, z: -32, w: 24, d: 17, h: 11, style: "office", name: "东区厂房一号", desc: "东区生产/研发厂房", floors: 3 });
addBuilding({ x: 152, z: -8, w: 19, d: 15, h: 18, style: "glass", name: "东区研发塔", desc: "东区高层研发楼", floors: 6 });
addBuilding({ x: 172, z: -8, w: 17, d: 13, h: 14, style: "glass", name: "东区办公楼", desc: "东区办公建筑", floors: 4 });
addBuilding({ x: 178, z: 16, w: 15, d: 22, h: 16, style: "glass", name: "东区蓝玻综合楼", desc: "东区综合研发", floors: 5 });
addBuilding({ x: 158, z: 22, w: 22, d: 13, h: 9, style: "office", name: "东区配套厂房", desc: "东区配套生产用房", floors: 3 });
addBuilding({ x: 132, z: 14, w: 17, d: 13, h: 12, style: "office", name: "东区中试楼", desc: "中试与集成楼", floors: 3 });

addPOI(45, 182, 10, "东端点", "园区东端边界");
addPOI(46, 192, 38, "东南出口", "东南侧出口点位");
addPOI(5, 164, 44, "东环路", "东侧环路节点");

addParking({ x: 148, z: 40, w: 36, d: 12, rows: 2, ev: true });
addParking({ x: 180, z: 40, w: 22, d: 10, rows: 1, ev: false });

for (let i = 0; i < 20; i++) {
  addTree(122 + (i % 5) * 4, -50 + Math.floor(i / 5) * 3, 0.85 + (i % 3) * 0.05, i % 2);
}
for (let i = 0; i < 14; i++) {
  addTree(188, -22 + i * 3.2, 0.9, i % 2 === 0);
}

function roofSolar(x, z, w, d) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  campus.add(g);
  const cols = Math.floor(w / 1.6);
  const rows = Math.floor(d / 2.2);
  const geo = new THREE.BoxGeometry(1.2, 0.08, 1.6);
  const mesh = new THREE.InstancedMesh(geo, MAT.solar, cols * rows);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dummy.position.set(-w / 2 + 1 + c * 1.6, 0.15, -d / 2 + 1.2 + r * 2.2);
      dummy.rotation.set(-0.25, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    }
  }
  mesh.castShadow = true;
  g.add(mesh);
}
roofSolar(-22, -42, 14, 8);
roofSolar(4, -42, 12, 8);
roofSolar(132, -32, 16, 10);

// ---------- Interaction ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const defaultPanel = {
  title: "航天城总览",
  desc: "拖拽旋转、滚轮缩放、右键平移。点击建筑或编号点位查看详情。",
};
const panelTitle = document.getElementById("panel-title");
const panelDesc = document.getElementById("panel-desc");

function setPanel(info) {
  panelTitle.textContent = info?.title || defaultPanel.title;
  panelDesc.textContent = info?.desc || defaultPanel.desc;
}

function pick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickable, false);
  return hits.length ? hits[0].object : null;
}

canvas.addEventListener("pointermove", (e) => {
  const obj = pick(e);
  canvas.style.cursor = obj ? "pointer" : "grab";
});

canvas.addEventListener("click", (e) => {
  const obj = pick(e);
  if (!obj) {
    setPanel(null);
    return;
  }
  setPanel(obj.userData.info);
});

// ---------- Camera presets ----------
const VIEWS = {
  overview: { pos: [5, 125, 235], target: [0, 4, 0] },
  west: { pos: [-145, 70, 100], target: [-145, 3, 0] },
  axis: { pos: [5, 95, 150], target: [5, 6, -5] },
  east: { pos: [135, 75, 110], target: [135, 4, 0] },
  sports: { pos: [-118, 55, 55], target: [-108, 2, -35] },
};

let camTween = null;
let autoOrbit = false;

function flyTo(viewKey) {
  const v = VIEWS[viewKey];
  if (!v) return;
  camTween = {
    t: 0,
    fromPos: camera.position.clone(),
    toPos: new THREE.Vector3(...v.pos),
    fromT: controls.target.clone(),
    toT: new THREE.Vector3(...v.target),
  };
  autoOrbit = false;
  document.getElementById("btn-orbit").classList.remove("active");
}

document.querySelectorAll("#views button[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#views button[data-view]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    flyTo(btn.dataset.view);
  });
});

document.getElementById("btn-orbit").addEventListener("click", (e) => {
  autoOrbit = !autoOrbit;
  e.currentTarget.classList.toggle("active", autoOrbit);
  camTween = null;
});

// ---------- Animate ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  pois.forEach((p, i) => {
    const s = 1 + Math.sin(t * 2.2 + i) * 0.12;
    p.halo.scale.setScalar(s);
    p.ring.rotation.z = t * 0.6 + i;
    p.g.position.y = Math.sin(t * 1.5 + i * 0.4) * 0.08;
  });

  MAT.neon.emissiveIntensity = 1.1 + Math.sin(t * 1.8) * 0.22;

  if (camTween) {
    camTween.t = Math.min(1, camTween.t + 0.025);
    const e = 1 - Math.pow(1 - camTween.t, 3);
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, e);
    controls.target.lerpVectors(camTween.fromT, camTween.toT, e);
    if (camTween.t >= 1) camTween = null;
  } else if (autoOrbit) {
    const angle = t * 0.07;
    const r = 190;
    camera.position.x = Math.cos(angle) * r;
    camera.position.z = Math.sin(angle) * r;
    camera.position.y = 115;
    controls.target.set(0, 5, 0);
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

setTimeout(() => document.getElementById("hint").classList.add("hide"), 2800);
animate();
window.__campus = { scene, camera, controls, flyTo, VIEWS };
