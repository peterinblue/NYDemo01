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
scene.fog = new THREE.Fog(0xe6eaef, 380, 1000);

const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.5, 2600);
camera.position.set(10, 130, 240);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 30;
controls.maxDistance = 480;
controls.target.set(0, 4, 0);

// ---------- Materials ----------
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
  path: new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.9 }),
};

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xf8fbff, 0xc8d0da, 1.15));
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

function cyl(rt, rb, h, seg, mat, x = 0, y = h / 2, z = 0, parent = campus) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function markClickable(mesh, info) {
  mesh.userData.info = info;
  clickable.push(mesh);
  return mesh;
}

/** White mass + blue glass band + cyan floor strips — density-matched campus block. */
function addBuilding({ x, z, w, d, h, style = "office", name, desc, floors = 4 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  campus.add(g);

  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.body);
  base.position.y = h / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  if (style === "office" || style === "glass") {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(w + 2.2, 1.0, d + 2.2), MAT.bodyDim);
    pod.position.y = 0.5;
    pod.castShadow = true;
    pod.receiveShadow = true;
    g.add(pod);
  }

  if (style === "glass" || style === "office") {
    const glassMat = style === "glass" ? MAT.glass : MAT.windowBand;
    const gh = Math.max(1.5, h * (style === "glass" ? 0.48 : 0.32));
    const gy = h * 0.58;
    const gw = w * (style === "glass" ? 0.82 : 0.7);
    box(gw, gh, 0.2, glassMat, 0, gy, d / 2 + 0.05, false, false, g);
    box(gw, gh, 0.2, glassMat, 0, gy, -d / 2 - 0.05, false, false, g);
    if (style === "glass" || h > 14) {
      const gd = d * (style === "glass" ? 0.78 : 0.65);
      box(0.2, gh, gd, glassMat, w / 2 + 0.05, gy, 0, false, false, g);
      box(0.2, gh, gd, glassMat, -w / 2 - 0.05, gy, 0, false, false, g);
    }
  }

  const bands = Math.max(2, Math.min(9, floors));
  for (let i = 1; i <= bands; i++) {
    const yy = (h / (bands + 1)) * i;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 0.15, d + 0.18), MAT.neon);
    strip.position.y = yy;
    g.add(strip);
  }

  if (style === "industrial") {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.26, d + 0.12), MAT.neon);
    strip.position.y = Math.min(2.2, h * 0.38);
    g.add(strip);
  }

  if (h > 8 && style !== "industrial") {
    const equip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.28, 1.0, d * 0.22), MAT.roofEquip);
    equip.position.set(w * 0.1, h + 0.5, -d * 0.1);
    equip.castShadow = true;
    g.add(equip);
  }

  markClickable(base, { title: name || "建筑", desc: desc || "航天城功能建筑", kind: "building" });
  return g;
}

/** Courtyard complex: perimeter wings around open center. */
function addCourtyard({ x, z, w, d, wing = 8, h = 10, style = "office", name, desc }) {
  const g = new THREE.Group();
  campus.add(g);
  // N / S / E / W wings
  addBuilding({ x, z: z - d / 2 + wing / 2, w, d: wing, h, style, name: name ? name + " 北翼" : undefined, desc });
  addBuilding({ x, z: z + d / 2 - wing / 2, w, d: wing, h: h * 0.9, style, name: name ? name + " 南翼" : undefined, desc });
  addBuilding({ x: x - w / 2 + wing / 2, z, w: wing, d: d - wing * 2, h: h * 0.85, style, name: name ? name + " 西翼" : undefined, desc });
  addBuilding({ x: x + w / 2 - wing / 2, z, w: wing, d: d - wing * 2, h: h * 0.85, style, name: name ? name + " 东翼" : undefined, desc });
  // courtyard green
  box(Math.max(4, w - wing * 2 - 2), 0.12, Math.max(4, d - wing * 2 - 2), MAT.grass, x, 0.08, z, false, true);
  for (let i = 0; i < 4; i++) {
    addTree(x - (w - wing * 2) * 0.25 + (i % 2) * (w - wing * 2) * 0.3, z - (d - wing * 2) * 0.2 + Math.floor(i / 2) * (d - wing * 2) * 0.25, 0.7);
  }
}

function addSolarFarm({ x, z, w, d, rows = 5, cols = 12, label, name, desc }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  campus.add(g);
  const plat = new THREE.Mesh(new THREE.BoxGeometry(w + 3.5, 0.32, d + 3.5), MAT.sidewalk);
  plat.position.y = 0.16;
  plat.receiveShadow = true;
  g.add(plat);

  const panelW = (w - 1.5) / cols;
  const panelD = (d - 1.5) / rows;
  const geo = new THREE.BoxGeometry(panelW * 0.84, 0.12, panelD * 0.74);
  const frameGeo = new THREE.BoxGeometry(panelW * 0.92, 0.08, panelD * 0.82);
  const panels = new THREE.InstancedMesh(geo, MAT.solar, rows * cols);
  const frames = new THREE.InstancedMesh(frameGeo, MAT.solarFrame, rows * cols);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = -w / 2 + 0.8 + panelW * (c + 0.5);
      const pz = -d / 2 + 0.8 + panelD * (r + 0.5);
      dummy.position.set(px, 0.55, pz);
      dummy.rotation.set(-0.32, 0, 0);
      dummy.updateMatrix();
      panels.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.42;
      dummy.updateMatrix();
      frames.setMatrixAt(i, dummy.matrix);
      i++;
    }
  }
  panels.castShadow = true;
  g.add(panels, frames);

  if (label) {
    const plaque = box(10, 2.2, 0.35, new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0ea5b7, emissiveIntensity: 0.95 }), 0, 1.9, -d / 2 - 0.6, true, false, g);
    for (let t = 0; t < 3; t++) {
      box(7.5 - t * 0.6, 0.16, 0.08, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 }), -0.2, 1.45 + t * 0.35, -d / 2 - 0.85, false, false, g);
    }
  }

  markClickable(plat, { title: name || label || "光伏区", desc: desc || "地面光伏阵列", kind: "solar" });
  return g;
}

/** Long industrial hall with full roof solar — matches original warehouse strips. */
function addSolarHall({ x, z, w, d, h = 5, name, desc }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  campus.add(g);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.body);
  base.position.y = h / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);
  // neon edge
  const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.22, d + 0.1), MAT.neon);
  strip.position.y = Math.min(1.8, h * 0.4);
  g.add(strip);
  // roof solar
  const cols = Math.max(3, Math.floor(w / 2.2));
  const rows = Math.max(2, Math.floor(d / 2.4));
  const geo = new THREE.BoxGeometry(1.6, 0.1, 1.7);
  const mesh = new THREE.InstancedMesh(geo, MAT.solar, cols * rows);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dummy.position.set(-w / 2 + 1.2 + c * 2.1, h + 0.25, -d / 2 + 1.3 + r * 2.2);
      dummy.rotation.set(-0.28, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    }
  }
  mesh.castShadow = true;
  g.add(mesh);
  markClickable(base, { title: name || "光伏厂房", desc: desc || "屋顶光伏工业厂房", kind: "building" });
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
  const stall = 2.15;
  const cols = Math.floor(w / stall);
  for (let r = 0; r < rows; r++) {
    const zz = z - d / 2 + 2.2 + r * (d - 3.5) / Math.max(1, rows - 1 || 1);
    for (let c = 0; c < cols; c++) {
      const xx = x - w / 2 + 1.3 + c * stall;
      box(1.5, 0.48, 2.9, MAT.bodyDim, xx, 0.3, zz, true, true);
      if (ev && c % 3 === 0) box(0.2, 0.95, 0.2, MAT.charge, xx + 1.0, 0.48, zz - 1.25, false, false);
    }
  }
  return pad;
}

function addRoad(w, d, x, z) { return box(w, 0.08, d, MAT.road, x, 0.04, z, false, true); }
function addSidewalk(w, d, x, z) { return box(w, 0.14, d, MAT.sidewalk, x, 0.07, z, false, true); }

function addPOI(num, x, z, name, desc) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.0, 8), MAT.neon);
  pole.position.y = 1.0;
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.5, transparent: true, opacity: 0.88 })
  );
  halo.position.y = 2.3;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.05, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.1 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  g.add(pole, halo, ring);
  campus.add(g);
  markClickable(halo, { title: `${String(num).padStart(2, "0")} · ${name}`, desc, kind: "poi", num });
  pois.push({ g, halo, ring, num });
  return g;
}

// ============================================================
// CAMPUS — density-matched to 航天城平面图demoV4
// Layout: very wide E-W strip. Four building bands N→S.
// ============================================================

box(430, 1, 160, MAT.ground, 0, -0.5, 0, false, true);

// perimeter
addSidewalk(420, 4.5, 0, -64);
addSidewalk(420, 4.5, 0, 64);
addSidewalk(4.5, 128, -202, 0);
addSidewalk(4.5, 128, 202, 0);
addRoad(410, 8, 0, -56);
addRoad(410, 8, 0, 56);
addRoad(8, 112, -192, 0);
addRoad(8, 112, 192, 0);

// cross avenues (denser, matches original block grid)
[-160, -120, -80, -40, 0, 40, 80, 120, 160].forEach((x) => addRoad(5.5, 108, x, 0));
// east-west internal roads
addRoad(400, 5, 0, -28);
addRoad(400, 5, 0, -2);
addRoad(400, 5, 0, 24);

// roadside green medians
for (let x = -185; x <= 185; x += 16) {
  box(7, 0.16, 2, MAT.grass, x, 0.08, -56, false, true);
  box(7, 0.16, 2, MAT.grass, x, 0.08, 56, false, true);
}
plantTreeLine(-190, -60, 190, -60, 42, 1);
plantTreeLine(-190, 60, 190, 60, 42, 1);
plantTreeLine(-196, -50, -196, 50, 16, 0.95);
plantTreeLine(196, -50, 196, 50, 16, 0.95);

// ---------- WEST: 环岛 / A区 / 乾都 / B区 / 体育 / 西研发群 ----------
const plazaBase = cyl(13, 13, 0.25, 48, MAT.sidewalk, -174, 0.12, -16);
const plazaRing = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.5, 10, 40), MAT.bodyDim);
plazaRing.rotation.x = Math.PI / 2;
plazaRing.position.set(-174, 0.28, -16);
campus.add(plazaRing);
const plazaRing2 = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.35, 10, 36), MAT.path);
plazaRing2.rotation.x = Math.PI / 2;
plazaRing2.position.set(-174, 0.32, -16);
campus.add(plazaRing2);
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2;
  addTree(-174 + Math.cos(a) * 11, -16 + Math.sin(a) * 11, 0.8);
}
markClickable(plazaBase, { title: "西门环岛广场", desc: "园区西侧主入口环形景观广场", kind: "landmark" });

// A区光伏 (SW, large)
addSolarFarm({ x: -160, z: 32, w: 52, d: 38, rows: 7, cols: 16, label: "A", name: "A 区光伏阵列", desc: "西南侧大型地面光伏" });

// 乾都10KV — distinctive striped building near plaza
addBuilding({ x: -150, z: -6, w: 26, d: 16, h: 9, style: "industrial", name: "乾都 10KV", desc: "西侧 10KV 变配电", floors: 3 });
// secondary volume of 乾都
addBuilding({ x: -150, z: -20, w: 18, d: 10, h: 6, style: "industrial", name: "乾都 10KV 配套", desc: "乾都配电配套用房", floors: 2 });

// park west of sports
for (let i = 0; i < 22; i++) {
  addTree(-155 + (i % 6) * 3.0, -32 - Math.floor(i / 6) * 3.2, 0.75 + (i % 3) * 0.06, i % 2 === 0);
}

// B区光伏 (NW)
addSolarFarm({ x: -150, z: -42, w: 44, d: 28, rows: 5, cols: 14, label: "B", name: "B 区光伏阵列", desc: "西北侧光伏阵列" });

// sports: football + courts + path
const field = box(30, 0.15, 18, MAT.field, -112, 0.1, -44, false, true);
for (let i = 0; i < 5; i++) box(28, 0.02, 0.22, new THREE.MeshStandardMaterial({ color: 0xe8f7ef }), -112, 0.18, -52 + i * 4, false, false);
box(0.22, 0.02, 16, new THREE.MeshStandardMaterial({ color: 0xe8f7ef }), -112, 0.18, -44, false, false);
const centerCircle = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.4, 24), new THREE.MeshStandardMaterial({ color: 0xe8f7ef, side: THREE.DoubleSide }));
centerCircle.rotation.x = -Math.PI / 2;
centerCircle.position.set(-112, 0.19, -44);
campus.add(centerCircle);
markClickable(field, { title: "足球场", desc: "园区体育中心标准足球场", kind: "sport" });
// curved path around field (from original)
const pathRing = new THREE.Mesh(new THREE.RingGeometry(16, 18.5, 40, 1, 0.2, Math.PI * 0.85), MAT.path);
pathRing.rotation.x = -Math.PI / 2;
pathRing.position.set(-118, 0.08, -48);
campus.add(pathRing);

for (let i = 0; i < 2; i++) {
  const bx = -104 + i * 12;
  const court = box(9, 0.12, 13, MAT.court, bx, 0.08, -28, false, true);
  markClickable(court, { title: `篮球场 ${i + 1}`, desc: "体育中心室外篮球场", kind: "sport" });
  box(0.12, 2.2, 0.12, MAT.bodyDark, bx, 1.1, -28 - 5.2);
  box(0.12, 2.2, 0.12, MAT.bodyDark, bx, 1.1, -28 + 5.2);
}
// trees around sports
for (let i = 0; i < 12; i++) addTree(-128 + i * 3.2, -52, 0.8, i % 2);
for (let i = 0; i < 8; i++) addTree(-130, -40 + i * 3, 0.75, i % 2);

// west research cluster — denser (6 buildings)
addCourtyard({ x: -118, z: 8, w: 28, d: 22, wing: 7, h: 14, style: "glass", name: "西研发", desc: "西侧科研办公院落" });
addBuilding({ x: -96, z: 14, w: 14, d: 12, h: 20, style: "glass", name: "西区研发塔 A", desc: "蓝玻璃科研塔楼", floors: 6 });
addBuilding({ x: -96, z: -4, w: 13, d: 11, h: 12, style: "office", name: "西区配套楼", desc: "办公配套", floors: 3 });
addBuilding({ x: -136, z: 16, w: 14, d: 12, h: 11, style: "office", name: "西服务楼", desc: "西侧服务楼", floors: 3 });
addBuilding({ x: -136, z: -6, w: 12, d: 10, h: 8, style: "office", name: "西后勤楼", desc: "后勤保障", floors: 2 });
addBuilding({ x: -88, z: 4, w: 12, d: 16, h: 16, style: "glass", name: "西研发塔 B", desc: "西侧玻璃塔楼", floors: 5 });

// southern edge buildings near A
addBuilding({ x: -148, z: 48, w: 16, d: 10, h: 7, style: "office", name: "西南附属楼", desc: "西南侧附属用房", floors: 2 });
addBuilding({ x: -120, z: 48, w: 14, d: 10, h: 8, style: "office", name: "西南配套楼", desc: "西南侧配套", floors: 2 });

// ---------- CENTER-WEST: 光伏厂房带 / 八部10KV / 停车 ----------
// multi hall with roof solar (matches original long strips)
addSolarHall({ x: -70, z: -42, w: 36, d: 16, h: 5.5, name: "北侧光伏厂房 1", desc: "屋顶光伏工业厂房" });
addSolarHall({ x: -70, z: -22, w: 32, d: 14, h: 5, name: "北侧光伏厂房 2", desc: "屋顶光伏工业厂房" });
addSolarHall({ x: -48, z: -48, w: 24, d: 12, h: 5, name: "北侧光伏厂房 3", desc: "屋顶光伏工业厂房" });

// mid-west offices between halls and south
addBuilding({ x: -78, z: 8, w: 16, d: 14, h: 12, style: "office", name: "中西一号楼", desc: "中西部办公", floors: 4 });
addBuilding({ x: -60, z: 8, w: 14, d: 12, h: 10, style: "office", name: "中西二号楼", desc: "中西部办公", floors: 3 });
addBuilding({ x: -78, z: 28, w: 15, d: 12, h: 9, style: "office", name: "中西三号楼", desc: "中西部服务", floors: 3 });
addBuilding({ x: -60, z: 28, w: 13, d: 11, h: 11, style: "glass", name: "中西玻璃楼", desc: "中西部科研", floors: 3 });

// 八部10KV complex
addBuilding({ x: -40, z: -12, w: 24, d: 18, h: 8, style: "industrial", name: "八部 10KV", desc: "中部 10KV 变电站", floors: 2 });
addBuilding({ x: -40, z: -28, w: 16, d: 10, h: 5, style: "industrial", name: "八部 10KV 配套", desc: "八部配电配套", floors: 1 });
// cylindrical tanks (multiple as in original)
cyl(4.0, 4.0, 5.2, 24, MAT.glassDeep, -28, 2.6, 6);
cyl(3.0, 3.0, 4.0, 24, MAT.bodyDim, -22, 2.0, 2);
cyl(2.6, 2.6, 3.5, 20, MAT.bodyDim, -18, 1.75, 8);

// EV parking (large, multi-row like original)
addParking({ x: -40, z: 36, w: 40, d: 18, rows: 3, ev: true });
addParking({ x: -8, z: 36, w: 28, d: 14, rows: 2, ev: true });
addParking({ x: -8, z: 18, w: 24, d: 12, rows: 2, ev: false });

// ---------- CENTER: 高塔 / 综合楼 / 北研发 ----------
addBuilding({ x: -20, z: -6, w: 20, d: 15, h: 13, style: "office", name: "中部综合楼", desc: "园区中部综合服务楼", floors: 4 });
addBuilding({ x: 2, z: -6, w: 16, d: 13, h: 11, style: "office", name: "中部实验楼", desc: "实验与检测", floors: 3 });
addBuilding({ x: -20, z: 14, w: 17, d: 13, h: 15, style: "glass", name: "中部办公楼", desc: "中部蓝玻璃办公", floors: 5 });
addBuilding({ x: 2, z: 14, w: 14, d: 12, h: 12, style: "glass", name: "中部科研楼", desc: "中部科研建筑", floors: 4 });

// landmark tower + neighbors
addBuilding({ x: 16, z: -36, w: 13, d: 13, h: 40, style: "glass", name: "航天城地标高塔", desc: "园区中部最高蓝玻地标塔", floors: 13 });
box(11, 2.6, 11, MAT.body, 16, 40 + 1.3, -36);
addBuilding({ x: 30, z: -36, w: 12, d: 12, h: 18, style: "glass", name: "地标附楼", desc: "地标塔附楼", floors: 5 });
addBuilding({ x: 16, z: -22, w: 14, d: 10, h: 12, style: "office", name: "地标裙楼", desc: "地标裙房", floors: 3 });

// north R&D row (denser)
addCourtyard({ x: -28, z: -48, w: 26, d: 16, wing: 6, h: 9, style: "office", name: "北研发西院", desc: "北部研发院落" });
addBuilding({ x: 0, z: -48, w: 18, d: 12, h: 11, style: "office", name: "北研发一号楼", desc: "北部研发", floors: 3 });
addBuilding({ x: 20, z: -48, w: 16, d: 12, h: 12, style: "office", name: "北研发二号楼", desc: "北部研发", floors: 3 });
addBuilding({ x: 40, z: -48, w: 15, d: 14, h: 16, style: "glass", name: "北研发三号楼", desc: "北部蓝玻研发", floors: 4 });
addBuilding({ x: 58, z: -46, w: 14, d: 16, h: 12, style: "office", name: "北配套楼", desc: "北部配套", floors: 3 });
addBuilding({ x: 40, z: -32, w: 12, d: 10, h: 8, style: "office", name: "北服务楼", desc: "北部服务", floors: 2 });

// courtyard green center
box(16, 0.12, 6, MAT.grass, -4, 0.08, -36, false, true);
for (let i = 0; i < 8; i++) addTree(-12 + i * 2.4, -36, 0.72);

// mid-east cluster
addCourtyard({ x: 42, z: 6, w: 30, d: 24, wing: 7, h: 14, style: "glass", name: "中东研发", desc: "中东部科研院落" });
addBuilding({ x: 62, z: 18, w: 14, d: 12, h: 11, style: "office", name: "东综合楼", desc: "中东部综合", floors: 3 });
addBuilding({ x: 28, z: 20, w: 13, d: 11, h: 9, style: "office", name: "东服务楼", desc: "服务与后勤", floors: 2 });
addBuilding({ x: 62, z: -8, w: 15, d: 14, h: 18, style: "glass", name: "东研发楼", desc: "中东部科研塔", floors: 5 });

addParking({ x: 20, z: 36, w: 30, d: 14, rows: 2, ev: false });
addParking({ x: 55, z: 36, w: 26, d: 12, rows: 2, ev: true });

// ---------- EAST: 35KV / 803 / C区 / 804 / 产业群 ----------
addBuilding({ x: 88, z: -42, w: 16, d: 12, h: 6.5, style: "industrial", name: "35KV 站", desc: "园区 35KV 变电站", floors: 2 });
addBuilding({ x: 88, z: -28, w: 12, d: 8, h: 5, style: "industrial", name: "35KV 配套", desc: "35KV 配套", floors: 1 });

addBuilding({ x: 102, z: -12, w: 20, d: 14, h: 7, style: "industrial", name: "803 所 10KV", desc: "803 所区域 10KV", floors: 2 });
addBuilding({ x: 118, z: -12, w: 14, d: 12, h: 6, style: "industrial", name: "803 配套", desc: "803 配套用房", floors: 2 });

// C区光伏 (SE, large)
addSolarFarm({ x: 115, z: 32, w: 50, d: 36, rows: 7, cols: 15, label: "C", name: "C 区光伏阵列", desc: "东侧大型光伏阵列" });

// more industrial halls east (from original long strips)
addSolarHall({ x: 100, z: -46, w: 28, d: 14, h: 5, name: "东北光伏厂房", desc: "屋顶光伏厂房" });
addSolarHall({ x: 130, z: -46, w: 30, d: 14, h: 5.5, name: "东北光伏厂房 2", desc: "屋顶光伏厂房" });

// 804所
addBuilding({ x: 158, z: -28, w: 24, d: 16, h: 8, style: "industrial", name: "804 所 10KV", desc: "804 所区域 10KV", floors: 2 });
addBuilding({ x: 158, z: -44, w: 16, d: 10, h: 5, style: "industrial", name: "804 配套", desc: "804 配套", floors: 1 });

// east industrial / office dense cluster
addBuilding({ x: 132, z: -28, w: 22, d: 16, h: 11, style: "office", name: "东区厂房一号", desc: "东区生产/研发厂房", floors: 3 });
addBuilding({ x: 152, z: -8, w: 18, d: 15, h: 18, style: "glass", name: "东区研发塔", desc: "东区高层研发", floors: 6 });
addBuilding({ x: 172, z: -8, w: 16, d: 13, h: 14, style: "glass", name: "东区办公楼", desc: "东区办公", floors: 4 });
addCourtyard({ x: 176, z: 16, w: 28, d: 26, wing: 7, h: 16, style: "glass", name: "东区综合", desc: "东区综合研发院落" });
addBuilding({ x: 152, z: 20, w: 20, d: 12, h: 9, style: "office", name: "东区配套厂房", desc: "东区配套生产", floors: 2 });
addBuilding({ x: 132, z: 12, w: 16, d: 13, h: 12, style: "office", name: "东区中试楼", desc: "中试与集成", floors: 3 });
addBuilding({ x: 132, z: 28, w: 14, d: 10, h: 8, style: "office", name: "东区后勤楼", desc: "东区后勤", floors: 2 });
addBuilding({ x: 178, z: -28, w: 14, d: 12, h: 12, style: "glass", name: "东区玻璃附楼", desc: "东区玻璃建筑", floors: 3 });
addBuilding({ x: 192, z: 4, w: 12, d: 18, h: 15, style: "glass", name: "东端研发楼", desc: "东端科研", floors: 4 });
addBuilding({ x: 192, z: 28, w: 10, d: 12, h: 8, style: "office", name: "东端附属", desc: "东端附属", floors: 2 });

// green corridor + winding path (right side of original)
const green = box(18, 0.12, 50, MAT.grass, 148, 0.08, 8, false, true);
for (let i = 0; i < 14; i++) addTree(144 + (i % 3) * 3.5, -12 + i * 3.4, 0.85, i % 2);
// winding path
for (let i = 0; i < 10; i++) {
  const t = i / 9;
  box(3.5, 0.1, 4.5, MAT.path, 148 + Math.sin(t * Math.PI * 1.5) * 4, 0.05, -12 + t * 48, false, true);
}

addParking({ x: 148, z: 42, w: 36, d: 12, rows: 2, ev: true });
addParking({ x: 186, z: 42, w: 18, d: 10, rows: 1, ev: false });
addParking({ x: 100, z: 42, w: 24, d: 12, rows: 2, ev: false });

for (let i = 0; i < 18; i++) addTree(122 + (i % 5) * 4, -52 + Math.floor(i / 5) * 2.8, 0.85, i % 2);
for (let i = 0; i < 12; i++) addTree(198, -22 + i * 3.5, 0.9, i % 2);

// extra south strip buildings (densify like original front row)
addBuilding({ x: -88, z: 48, w: 18, d: 10, h: 7, style: "office", name: "南缘一号", desc: "南缘建筑", floors: 2 });
addBuilding({ x: -68, z: 48, w: 16, d: 10, h: 8, style: "office", name: "南缘二号", desc: "南缘建筑", floors: 2 });
addBuilding({ x: -30, z: 48, w: 20, d: 10, h: 7, style: "office", name: "南缘三号", desc: "南缘建筑", floors: 2 });
addBuilding({ x: 10, z: 48, w: 18, d: 10, h: 9, style: "office", name: "南缘四号", desc: "南缘建筑", floors: 2 });
addBuilding({ x: 40, z: 48, w: 16, d: 10, h: 7, style: "office", name: "南缘五号", desc: "南缘建筑", floors: 2 });
addBuilding({ x: 80, z: 48, w: 18, d: 10, h: 8, style: "office", name: "南缘六号", desc: "南缘建筑", floors: 2 });
addBuilding({ x: 110, z: 48, w: 14, d: 10, h: 7, style: "office", name: "南缘七号", desc: "南缘建筑", floors: 2 });

// fill some interior gaps
addBuilding({ x: -100, z: 28, w: 12, d: 10, h: 8, style: "office", name: "西中附属", desc: "西侧中部附属", floors: 2 });
addBuilding({ x: -100, z: 40, w: 11, d: 9, h: 6, style: "office", name: "西中服务", desc: "西侧中部服务", floors: 2 });
addBuilding({ x: 78, z: 4, w: 12, d: 10, h: 9, style: "office", name: "中东附属", desc: "中东部附属", floors: 2 });
addBuilding({ x: 90, z: 16, w: 11, d: 10, h: 7, style: "office", name: "东过渡楼", desc: "中部向东过渡", floors: 2 });
addBuilding({ x: -8, z: -20, w: 14, d: 10, h: 8, style: "office", name: "中心附属", desc: "中心区附属", floors: 2 });

// POIs — key numbered points from original
const POI_LIST = [
  [1, -182, -8, "西门岗亭", "西侧入口门禁"],
  [2, -176, -32, "西侧巡更", "西侧道路巡更"],
  [3, -146, 42, "A区东南", "A 区光伏东南"],
  [4, 100, 52, "中南路口", "中部南侧路口"],
  [5, 168, 46, "东环路", "东侧环路节点"],
  [6, 80, -48, "35KV 西", "35KV 站西侧"],
  [7, 96, -46, "35KV 东", "35KV 站东侧"],
  [8, -182, 36, "A区西端", "A 区光伏西端"],
  [9, -128, -40, "B区东缘", "B 区光伏东侧"],
  [10, 8, 0, "中部节点", "中部园区核心"],
  [11, -16, -50, "北研发西", "北侧研发西点"],
  [12, 26, -40, "地标高塔", "中部最高建筑"],
  [13, 36, -36, "塔东平台", "地标塔东侧"],
  [14, -12, 40, "中南口", "中部南侧出入口"],
  [15, 8, -50, "北研发中", "北部研发中点"],
  [16, -30, -52, "北实验区", "北部实验建筑"],
  [17, -52, 4, "中西联络", "中部西侧联络"],
  [18, -56, 36, "充电桩区", "EV 充电西段"],
  [19, -40, 42, "充电中心", "EV 充电中段"],
  [20, -24, 36, "充电东段", "EV 充电东段"],
  [21, -88, 36, "西中通道", "西区与中部连接"],
  [22, 88, 30, "中东南点", "中部东南区域"],
  [23, 80, -10, "东综合点", "东综合楼周边"],
  [24, 40, -24, "中东北点", "中部东北区域"],
  [25, 50, -24, "东研发西", "东研发西侧"],
  [26, 100, -4, "803点", "803 所区域"],
  [28, -40, -28, "八部北点", "八部10KV 北侧"],
  [29, -72, -18, "西中东侧", "西区中部东侧"],
  [30, -28, 14, "八部南点", "八部10KV 南侧"],
  [31, -56, -8, "八部西点", "八部10KV 西侧"],
  [41, -168, 0, "西景观节点", "环岛与绿地"],
  [42, -122, 22, "西研发群", "西侧研发建筑群"],
  [43, -100, 22, "西研发东", "西研发东侧"],
  [44, -118, -48, "体育中心", "足球场与篮球场"],
  [45, 186, 10, "东端点", "园区东端边界"],
  [46, 196, 36, "东南出口", "东南侧出口"],
  [47, 174, -24, "804 北点", "804 所区域北侧"],
  [48, -160, -26, "西服务点", "西侧服务与后勤"],
];
POI_LIST.forEach(([n, x, z, name, desc]) => addPOI(n, x, z, name, desc));

// ---------- Interaction ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const defaultPanel = { title: "航天城总览", desc: "拖拽旋转、滚轮缩放、右键平移。点击建筑或编号点位查看详情。" };
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
  canvas.style.cursor = pick(e) ? "pointer" : "grab";
});
canvas.addEventListener("click", (e) => {
  const obj = pick(e);
  setPanel(obj ? obj.userData.info : null);
});

// ---------- Camera presets ----------
const VIEWS = {
  overview: { pos: [5, 130, 240], target: [0, 4, 0] },
  west: { pos: [-150, 75, 105], target: [-150, 3, 0] },
  axis: { pos: [5, 95, 150], target: [5, 6, -5] },
  east: { pos: [140, 75, 115], target: [140, 4, 0] },
  sports: { pos: [-120, 55, 55], target: [-112, 2, -38] },
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
    p.halo.scale.setScalar(1 + Math.sin(t * 2.2 + i) * 0.12);
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
    camera.position.set(Math.cos(angle) * r, 115, Math.sin(angle) * r);
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
