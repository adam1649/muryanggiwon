// 무량기원(無量棋院) · MURYANG BADUK INSTITUTE
// 무량사 3D 엔진(아바타 · 실시간 방문객 · 카메라 · 낮밤 · 품질 레이어)을 그대로 이어받아,
// 현대식 바둑 전문 기관 건물과 실제로 둘 수 있는 바둑(인공지능 · 방문객끼리 · 관전)을 얹었습니다.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { initQuality } from "./quality.js?v=1";
import { Board, fromMoves, think, ownership, finalScore, PASS, BLACK, WHITE, KOMI } from "./go_engine.js?v=1";
import { GoPanel } from "./baduk_ui.js?v=2";
import { KiboPanel, saveRecord, mergeArchive, shareList } from "./kibo.js?v=2";
import { LessonPanel } from "./lessons.js?v=2";
{ const _sm = HTMLDialogElement.prototype.showModal; HTMLDialogElement.prototype.showModal = function () { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} return _sm.apply(this, arguments); }; }
let selfId = "local-" + Math.random().toString(36).slice(2, 10);
const trysteroReady = import("trystero").then(m => { if (m.selfId) selfId = m.selfId; return m.joinRoom; }).catch(err => { console.warn("실시간 모듈을 불러오지 못했습니다", err); return null; });

// 무량사 주소를 넣으면 메뉴·설정에 '무량사 가기'가 나타납니다. (예: "https://계정.github.io/muryangsa/")
const MURYANGSA_URL = "";

const $ = s => document.querySelector(s);
const root = $("#muryang-root");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#c4d2d8");
scene.fog = new THREE.FogExp2("#c4d2d8", 0.0036);

let FOV_FP = 70; const FOV_3P = 42, camera = new THREE.PerspectiveCamera(FOV_3P, innerWidth / innerHeight, 0.3, 900);
const COARSE = matchMedia("(pointer:coarse)").matches, LOWQ = (() => { try { return localStorage.getItem("muryang-lowq") !== "0"; } catch (e) { return true; } })(), LQ = COARSE || LOWQ; let prScale = 1; const PR = () => Math.min(devicePixelRatio || 1, LQ ? 1.25 : 1.8) * prScale;
COARSE ? camera.position.set(-78, 52, 112) : camera.position.set(-46, 30, 70);
const renderer = new THREE.WebGLRenderer({ antialias: !LQ, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
renderer.setPixelRatio(PR());
renderer.setSize(root.clientWidth, root.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = LQ ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
root.insertBefore(renderer.domElement, root.firstChild);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 7, -6);
controls.enableDamping = true; controls.dampingFactor = 0.055;
controls.minDistance = 2.2; controls.maxDistance = 240;
controls.maxPolarAngle = Math.PI / 2 + .085; let lookUp = 0;
controls.autoRotate = true; controls.autoRotateSpeed = 0.2;
controls.enablePan = false;
let MOVE_BTN = 0, LOOK_MASK = 2, MOUSE_SWAP = false; try { MOUSE_SWAP = localStorage.getItem("muryang-mouse") === "swap"; } catch (e) {}
const isMoveBtn = e => e.pointerType === "mouse" ? e.button === MOVE_BTN : e.button === 0;
function applyMouse() { MOVE_BTN = MOUSE_SWAP ? 2 : 0; LOOK_MASK = MOUSE_SWAP ? 1 : 3; controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: MOUSE_SWAP ? -1 : THREE.MOUSE.ROTATE }; }
applyMouse();

const hemi = new THREE.HemisphereLight("#fff3dd", "#59634f", 1.7); scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff0d4", 3.0);
sun.position.set(-26, 38, 24); sun.castShadow = true;
sun.shadow.mapSize.set(LQ ? 1024 : 2048, LQ ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, far: 160 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = .05; scene.add(sun);
const fill = new THREE.DirectionalLight("#d8d9c8", 0.7); fill.position.set(22, 14, -20); scene.add(fill);

const mat = (c, r = .86, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const M = {
  ground: mat("#9fae86"), stone: mat("#c9c4b8"), stone2: mat("#7f8277"),
  wood: mat("#7a5a3e"), wood2: mat("#b58a5c"), woodDark: mat("#3a2c22"),
  roof: mat("#3a4540"), roof2: mat("#52615a"), gold: mat("#c9a55f", .35, .7), goldL: mat("#e6c783", .3, .6),
  paper: mat("#eadfc6"), green: mat("#5f7f55"), green2: mat("#7f9a63"),
  skin: mat("#d8b99b"), ink: mat("#22242a"),
  plaster: mat("#ece9e2"), pillar: mat("#8a6a4a"), red: mat("#98322b"),
  floor: mat("#a78058", .62), floorDark: mat("#5b4433"),
  granite: mat("#cfcabe", .92), board: mat("#25362d"),
  water: new THREE.MeshPhysicalMaterial({ color: "#5f8a86", roughness: .2, metalness: .18, clearcoat: .7, transparent: true, opacity: .9 }),
  // 현대식 기관 건물
  lime: mat("#e4ddcc", .78), lime2: mat("#d6cdb9", .8), metal: mat("#2c3136", .42, .75), metal2: mat("#4a5158", .4, .7), steel: mat("#9aa1a6", .3, .85),
  glass: new THREE.MeshStandardMaterial({ color: "#41596a", roughness: .06, metalness: .85 }),
  glassLit: new THREE.MeshStandardMaterial({ color: "#56707e", roughness: .08, metalness: .7, emissive: "#ffcf91", emissiveIntensity: 0 }),
  glassIn: new THREE.MeshPhysicalMaterial({ color: "#dfeff2", roughness: .05, metalness: 0, transmission: 0, transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide }),
  frost: new THREE.MeshStandardMaterial({ color: "#f3f4f0", roughness: .4, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }),
  asphalt: mat("#4a4d50", .95), curb: mat("#bdb8ac", .9), carpet: mat("#3b4a4e", 1), carpet2: mat("#7b2f2a", 1), white: mat("#f4f2ec", .6),
  goban: mat("#dcae63", .5), gobanSide: mat("#c08f45", .55), table: mat("#2e2620", .5), leather: mat("#2f2a27", .7), sofa: mat("#7d8a83", .95), sofa2: mat("#c8b89a", .95),
  screen: new THREE.MeshBasicMaterial({ color: "#10161a" }), lampOn: new THREE.MeshBasicMaterial({ color: "#fff4dc" }), plant: mat("#4f7a45", .9), pot: mat("#d9d3c6", .7)
};
const glow = c => new THREE.MeshBasicMaterial({ color: c });
const world = new THREE.Group(); scene.add(world);
function add(parent, geometry, material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geometry, material); o.position.set(x, y, z);
  o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
const box = (p, x, y, z, w, h, d, m) => add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
function sphere(p, x, y, z, sx, sy, sz, m, detail = 1) { const o = add(p, new THREE.IcosahedronGeometry(1, detail), m, x, y, z); o.scale.set(sx, sy, sz); return o; }
const cylinder = (p, x, y, z, rt, rb, h, m, n = 12) => add(p, new THREE.CylinderGeometry(rt, rb, h, n), m, x, y, z);
const nightLights = [], nightMats = []; // 밤에 더 밝아지는 조명 · 창
function warmLight(p, x, y, z, i = 6, d = 14, c = "#ffd9a8") { const l = new THREE.PointLight(c, i, d); l.position.set(x, y, z); p.add(l); nightLights.push({ l, base: i }); return l; }
// 글자 판(간판·현판): 투명 바탕에 글자만. 웹글꼴이 늦게 와도 다시 그린다
const SIGNS = [];
function textSign(lines, w, h, o = {}) {
  const c = document.createElement("canvas"), S = o.res || 1024; c.width = S; c.height = Math.max(32, Math.round(S * h / w)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const draw = () => {
    const x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height);
    if (o.bg) { x.fillStyle = o.bg; x.fillRect(0, 0, c.width, c.height); }
    if (o.frame) { const m = c.height * .05; x.strokeStyle = o.frame; x.lineWidth = c.height * .03; x.strokeRect(m, m, c.width - 2 * m, c.height - 2 * m); }
    x.textAlign = "center"; x.textBaseline = "middle";
    if (o.vertical) { const L = lines[0], n = [...L].length, cell = c.height / (n + .4); x.fillStyle = o.color || "#c9a55f"; x.font = `${o.weight || 700} ${Math.min(cell * .86, c.width * .86)}px ${o.font || "'Noto Serif KR', serif"}`; [...L].forEach((ch, i) => x.fillText(ch, c.width / 2, cell * (i + .7))); }
    else lines.forEach(([txt, size, col, font, ls], i) => { x.fillStyle = col || o.color || "#c9a55f"; x.font = `${font || "700"} ${size * c.height}px ${o.font || "'Noto Serif KR', serif"}`; if (ls && "letterSpacing" in x) x.letterSpacing = ls * size * c.height + "px"; else if ("letterSpacing" in x) x.letterSpacing = "0px"; const y = lines.length === 1 ? .52 : (o.ys ? o.ys[i] : (i + .5) / lines.length); x.fillText(txt, c.width / 2, y * c.height); });
    t.needsUpdate = true;
  };
  draw(); SIGNS.push(draw);
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .25, roughness: o.rough ?? .35, metalness: o.metal ?? .55, emissive: o.glow || "#000000", emissiveMap: o.glow ? t : null, emissiveIntensity: 0, side: THREE.DoubleSide });
  if (o.glow) nightMats.push({ m, base: o.glowK || .9 });
  const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); me.castShadow = false; me.receiveShadow = false; return me;
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => SIGNS.forEach(f => f())).catch(() => {});
setTimeout(() => SIGNS.forEach(f => f()), 3500);

// ---------- 땅 · 주변 도시 · 먼 산 ----------
const ground = add(world, new THREE.CircleGeometry(360, 72), M.ground, 0, -.02, 0);
ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
const Q = initQuality({ scene, renderer, camera, sun, M, ground });
M.ground.color.set("#9cc07c"); M.ground.polygonOffset = true; M.ground.polygonOffsetFactor = 2; M.ground.polygonOffsetUnits = 2;
const WIN_TEX = (() => { // 도시 건물 창: 낮에는 유리, 밤에는 일부만 불이 켜진다
  const c = document.createElement("canvas"); c.width = 128; c.height = 256; const x = c.getContext("2d"), e = document.createElement("canvas"); e.width = 128; e.height = 256; const y = e.getContext("2d"); let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  x.fillStyle = "#d9d6cf"; x.fillRect(0, 0, 128, 256); y.fillStyle = "#000"; y.fillRect(0, 0, 128, 256);
  for (let r = 0; r < 16; r++) for (let k = 0; k < 8; k++) { const px = 4 + k * 15.5, py = 4 + r * 15.8; x.fillStyle = `rgb(${70 + rnd() * 30},${90 + rnd() * 30},${105 + rnd() * 30})`; x.fillRect(px, py, 11, 10); if (rnd() < .38) { y.fillStyle = `rgb(255,${200 + rnd() * 40},${130 + rnd() * 60})`; y.fillRect(px, py, 11, 10); } }
  const t = new THREE.CanvasTexture(c), te = new THREE.CanvasTexture(e); t.colorSpace = te.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = te.wrapS = te.wrapT = THREE.RepeatWrapping; return [t, te]; })();
{
  let s = 17; const rng = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const tints = ["#d8d4cb", "#c9ccd0", "#e2dccf", "#b8bfc4", "#d2c6b4"], mats = tints.map(c => { const m = new THREE.MeshStandardMaterial({ color: c, map: WIN_TEX[0], emissive: "#ffd7a0", emissiveMap: WIN_TEX[1], emissiveIntensity: 0, roughness: .7 }); nightMats.push({ m, base: .85 }); return m; });
  const geo = new THREE.BoxGeometry(1, 1, 1); { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i)); }
  const pos = []; for (let gx = -270; gx <= 270; gx += 26) for (let gz = -270; gz <= 270; gz += 26) { const x = gx + (rng() - .5) * 8, z = gz + (rng() - .5) * 8, r = Math.hypot(x, z); if (r > 250 || (Math.abs(x) < 108 && z < 92 && z > -108) || (z > 44 && z < 84) || rng() < .3) continue; pos.push([x, z, rng()]); }
  const per = mats.map(() => []); pos.forEach(p => per[Math.floor(p[2] * 997) % mats.length].push(p));
  per.forEach((list, mi) => {
    const im = new THREE.InstancedMesh(geo, mats[mi], list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    list.forEach(([x, z, k], i) => { const r = Math.hypot(x, z), h = 7 + rng() * 13 + (r > 150 ? rng() * 30 : 0) + (r > 200 ? rng() * 25 : 0), w = 12 + rng() * 9, d = 12 + rng() * 9; im.setMatrixAt(i, m4.compose(ps.set(x, h / 2 - .1, z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.round(rng()) * Math.PI / 2), sc.set(w, h, d))); });
    im.castShadow = false; im.receiveShadow = false; world.add(im);
  });
  WIN_TEX[0].repeat.set(2, 3); WIN_TEX[1].repeat.set(2, 3);
  const cols = ["#4d7a55", "#5f8c5d", "#6f9b66", "#7f9d6f", "#8fa66f", "#5a8077"], cache = {}, mm = c => cache[c] || (cache[c] = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 1 })), haze = new THREE.Color("#a9bfc8");
  for (let ring = 0; ring < 2; ring++) { const R = 300 + ring * 50, n = 30 + ring * 8; for (let i = 0; i < n; i++) { const a = (i + rng() * .6) / n * Math.PI * 2; if (ring === 0 && Math.sin(a) > .55) continue; const h = (55 + rng() * 50) * (1 + ring * .3), r = (34 + rng() * 22) * (1 + ring * .25), base = new THREE.Color(cols[Math.floor(rng() * cols.length)]).lerp(haze, .35 + ring * .3), sides = 5 + Math.floor(rng() * 3); const m1 = add(world, new THREE.ConeGeometry(r, h, sides), mm("#" + base.getHexString()), Math.cos(a) * R, h / 2 - 8, Math.sin(a) * R); m1.castShadow = false; m1.rotation.y = rng() * 3; m1.scale.z = .85; } }
}

// ---------- 충돌 · 높이 ----------
const walls = [], circles = [], halls = [], seats = [];
const IX = 600, IX2 = 800, HALL = { key: "giwon_in", x: IX, z: 0, w: 56, d: 44, H: 6.4, s: 1, rot: 0 }; halls.push(HALL); // 실내는 x=600 쪽 별도 공간(무량사와 같은 방식)
const BLD = { x: 0, z: -12, w: 44, d: 26 }, FRONT = BLD.z + BLD.d / 2; // 건물 앞면 z = 1
const wallBox = (x0, x1, z0, z1, my) => walls.push([Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1), my]);
const hl = (h, x, z) => [(x - h.x) / (h.s || 1), (z - h.z) / (h.s || 1)];
const TER = { x0: -15, x1: 15, z0: FRONT, z1: FRONT + 4.4, y: .9 }; // 정문 앞 넓은 단(테라스)과 계단
function groundY(x, z) {
  if (x > 500) { if (x > 700 && x > IX2 - 14 && x < IX2 + 14 && z > -21.6 && z < -11.6) return .3; return 0; } // 2층 대회실 무대
  if (x > TER.x0 && x < TER.x1 && z > TER.z0 - .5) { if (z < TER.z1) return TER.y; if (z < TER.z1 + .8) return .6; if (z < TER.z1 + 1.6) return .3; }
  return 0;
}
const AV_R = .32;
const blocked = (x, z, y = 0) =>
  walls.some(([a, b, c, d, my]) => (my === undefined || y > my) && x > a - AV_R && x < b + AV_R && z > c - AV_R && z < d + AV_R) ||
  circles.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r + AV_R);

// ---------- 바닥 포장 ----------
const PATHS = [];
const PAVE = (() => { const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d"); let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) { const v = 214 + rnd() * 18; x.fillStyle = `rgb(${v},${v - 3},${v - 9})`; x.fillRect(i * 128, j * 64, 128, 64); }
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rnd() < .5 ? "255,255,255" : "80,76,70"},${.05 + rnd() * .09})`; x.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2); }
  x.fillStyle = "#8d887d"; for (let j = 0; j <= 8; j++) x.fillRect(0, j * 64 - 1, 512, 2); for (let i = 0; i <= 4; i++) x.fillRect(i * 128 - 1, 0, 2, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
let pathN = 0;
function path(x, z, len, w, angle = 0, tint = null, y0 = 0) {
  PATHS.push([x, z, len, w, angle]); const t = PAVE.clone(); t.needsUpdate = true; t.repeat.set(w / 4.8, len / 4.8);
  const p = new THREE.Mesh(new THREE.BoxGeometry(w, .07, len), new THREE.MeshStandardMaterial({ map: t, color: tint || "#ffffff", roughness: .55, metalness: .02, polygonOffset: true, polygonOffsetFactor: -2 - (pathN % 5), polygonOffsetUnits: -2 - (pathN % 5) }));
  p.position.set(x, y0 + .035 + (pathN++ % 5) * .0015, z); p.rotation.y = angle; p.receiveShadow = true; world.add(p); return p;
}
path(0, 24.5, 39, 34);                 // 정문 앞 광장
path(0, 48.5, 8, 124, 0, "#e9e4dc");   // 보도
path(-28.5, 22, 34, 7, 0, "#efe6d6");  // 야외 대국석 산책로
path(0, -32, 14, 64, 0, "#e7e2d8");    // 건물 뒤 마당
path(26, -13, 26, 6); path(-26, -13, 26, 6); // 건물 옆길
{ // 차도 · 차선 · 건너편 보도
  const road = add(world, new THREE.PlaneGeometry(720, 13), M.asphalt, 0, .02, 59); road.rotation.x = -Math.PI / 2; road.castShadow = false;
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, .18), glow("#e8e4d6"), 120), m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), sc = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3();
  for (let i = 0; i < 120; i++) dash.setMatrixAt(i, m4.compose(ps.set(-357 + i * 6, .04, 59), q, sc)); world.add(dash);
  for (const z of [52.6, 65.4]) { box(world, 0, .09, z, 720, .18, .35, M.curb).castShadow = false; }
  const far = add(world, new THREE.PlaneGeometry(720, 8), M.curb, 0, .03, 69.6); far.rotation.x = -Math.PI / 2; far.castShadow = false;
}

// ---------- 바둑판 · 대국석 (실내 · 야외 공통) ----------
const TABLES = [], TABLE_HITS = [];
const STONE_GEO = new THREE.SphereGeometry(1, 18, 10); STONE_GEO.scale(1, .42, 1);
const STONE_B = new THREE.MeshStandardMaterial({ color: "#151515", roughness: .26, metalness: .12 }), STONE_W = new THREE.MeshStandardMaterial({ color: "#f4f2eb", roughness: .3 });
const GMARG = .06, GRID_TEX = {};
const STAR_PTS = { 9: [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]], 13: [[3, 3], [9, 3], [3, 9], [9, 9], [6, 6]], 19: [3, 9, 15].flatMap(x => [3, 9, 15].map(y => [x, y])) };
function gridTex(n) {
  if (GRID_TEX[n]) return GRID_TEX[n];
  const S = 512, c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, "#e6bd74"); g.addColorStop(1, "#d4a457"); x.fillStyle = g; x.fillRect(0, 0, S, S);
  let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; x.globalAlpha = .08; for (let i = 0; i < 40; i++) { x.strokeStyle = rnd() < .5 ? "#7a4a14" : "#fff2cc"; x.lineWidth = 1 + rnd() * 3; x.beginPath(); const y0 = rnd() * S; x.moveTo(0, y0); x.bezierCurveTo(S * .3, y0 + (rnd() - .5) * 30, S * .7, y0 + (rnd() - .5) * 30, S, y0 + (rnd() - .5) * 20); x.stroke(); } x.globalAlpha = 1;
  const o = S * GMARG, st = (S - 2 * o) / (n - 1); x.strokeStyle = "rgba(35,22,8,.9)"; x.lineWidth = n >= 19 ? 1.6 : 2.2;
  for (let i = 0; i < n; i++) { x.beginPath(); x.moveTo(o, o + i * st); x.lineTo(S - o, o + i * st); x.moveTo(o + i * st, o); x.lineTo(o + i * st, S - o); x.stroke(); }
  x.lineWidth = 3; x.strokeRect(o, o, S - 2 * o, S - 2 * o); x.fillStyle = "rgba(35,22,8,.95)"; for (const [a, b] of STAR_PTS[n] || []) { x.beginPath(); x.arc(o + a * st, o + b * st, n >= 19 ? 4.5 : 6, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return (GRID_TEX[n] = t);
}
const CHAIR = { seat: mat("#2f3438", .6), frame: mat("#1e2124", .4, .6), wood: mat("#8c6a48", .6) };
function chair(g, x, z, ry) { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c); box(c, 0, .44, 0, .62, .08, .58, CHAIR.seat); box(c, 0, .86, -.3, .62, .62, .07, CHAIR.seat); for (const sx of [-.27, .27]) for (const sz of [-.25, .25]) cylinder(c, sx, .22, sz, .022, .022, .44, CHAIR.frame, 6); return c; }
function regSeat(g, lx, ly, lz, ry, kind, extra) { g.updateWorldMatrix(true, false); const v = new THREE.Vector3(lx, ly, lz); g.localToWorld(v); const s = { x: v.x, y: v.y, z: v.z, ry, kind, ...extra }; s.id = seats.length; seats.push(s); return s; }
function makeGoTable(parent, x, z, o = {}) {
  const n = o.size || 19, kind = o.kind || "chair", ry = o.ry || 0, g = new THREE.Group(); g.position.set(x, o.y || 0, z); g.rotation.y = ry; parent.add(g); parent.updateWorldMatrix(true, false); { const wp = g.getWorldPosition(new THREE.Vector3()); x = wp.x; z = wp.z; }
  const bw = o.bw || (n >= 19 ? 1.02 : n >= 13 ? .86 : .72); let top, sd = 1.12, tw = 1.34;
  if (kind === "chair") { box(g, 0, .8, 0, tw, .06, tw, M.table); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylinder(g, sx * (tw / 2 - .1), .39, sz * (tw / 2 - .1), .035, .035, .78, M.metal, 8); box(g, 0, .9, 0, bw + .06, .14, bw + .06, M.gobanSide); top = .975; }
  else if (kind === "stool") { tw = 1.5; cylinder(g, 0, .36, 0, .32, .42, .72, M.granite, 16); box(g, 0, .76, 0, tw, .1, tw, M.granite); box(g, 0, .82, 0, bw + .08, .02, bw + .08, M.gobanSide); top = .832; sd = 1.18; }
  else { tw = bw + .1; box(g, 0, .3, 0, bw + .04, .26, bw + .04, M.gobanSide); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cylinder(g, sx * bw * .36, .085, sz * bw * .36, .07, .05, .17, M.woodDark, 10); top = .432; sd = 1.02; }
  const sw = bw * .96, surf = add(g, new THREE.PlaneGeometry(sw, sw), new THREE.MeshStandardMaterial({ map: gridTex(n), roughness: .55 }), 0, top + .002, 0); surf.rotation.x = -Math.PI / 2; surf.castShadow = false;
  const im = [STONE_B, STONE_W].map(m => { const k = new THREE.InstancedMesh(STONE_GEO, m, 361); k.count = 0; k.castShadow = false; k.receiveShadow = true; k.frustumCulled = false; k.userData.noFade = true; g.add(k); return k; });
  const T = { i: TABLES.length, g, nDef: n, n, kind, name: o.name || "대국석", zone: o.zone || "hall", top, sw, im, surf, seats: [], game: null, board: null, x, z, ry };
  surf.userData.table = T; TABLE_HITS.push(surf);
  for (const [k, sz] of [[0, sd], [1, -sd]]) {
    const sry = ry + (sz > 0 ? Math.PI : 0); // 판 쪽을 바라본다
    if (kind === "chair") chair(g, 0, sz, sz > 0 ? Math.PI : 0);
    else if (kind === "stool") cylinder(g, 0, .22, sz, .26, .3, .44, M.granite, 14);
    else { const cu = box(g, 0, .05, sz, .8, .1, .8, M.carpet2); cu.castShadow = false; }
    T.seats.push(regSeat(g, 0, 0, sz, sry, kind === "floor" ? "go-floor" : "go", { tb: T.i, side: k }));
  }
  const rw = Math.abs(Math.sin(ry)) > .5, hx = (rw ? tw : tw) / 2, hz = (rw ? tw : tw) / 2; wallBox(x - hx, x + hx, z - hz, z + hz);
  TABLES.push(T); return T;
}
const M4 = new THREE.Matrix4(), QI = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
function renderTable(T) {
  const b = T.board, n = b ? b.n : T.n;
  if (n !== T.n) { T.n = n; T.surf.material.map = gridTex(n); T.surf.material.needsUpdate = true; }
  const half = T.sw / 2, o = T.sw * GMARG, st = (T.sw - 2 * o) / (n - 1), r = st * .47; let kb = 0, kw = 0;
  if (b) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = b.c[b.pos(x, y)]; if (v !== BLACK && v !== WHITE) continue; M4.compose(V3.set(-half + o + x * st, T.top + r * .42, -half + o + y * st), QI, S3.set(r, r, r)); if (v === BLACK) T.im[0].setMatrixAt(kb++, M4); else T.im[1].setMatrixAt(kw++, M4); }
  T.im[0].count = kb; T.im[1].count = kw; T.im[0].instanceMatrix.needsUpdate = T.im[1].instanceMatrix.needsUpdate = true;
  if (T.onRender) T.onRender();
}

// ---------- 나무 · 화단 · 가로등 · 벤치 ----------
const LEAF = [mat("#5f8f4e"), mat("#6e9d58"), mat("#7aa663")].map(m => { m.flatShading = true; return m; }), BARK = mat("#5b4535"), PINE = [mat("#2f5a3d"), mat("#3a6b45")];
const GINK = [mat("#9fc65a"), mat("#b5cf62")].map(m => { m.flatShading = true; return m; });
function zelkova(x, z, s = 1) { // 느티나무: 넓고 둥근 수관
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g);
  cylinder(g, 0, 1.4, 0, .22, .32, 2.8, BARK, 8); for (const [a, b] of [[.5, .4], [-.5, .3]]) { const l = cylinder(g, a * .6, 2.9, b * .4, .08, .14, 1.4, BARK, 6); l.rotation.z = -a; }
  for (const [dx, dy, dz, r] of [[0, 4.3, 0, 2.2], [1.3, 3.8, .4, 1.5], [-1.3, 3.9, -.3, 1.6], [.2, 3.6, 1.3, 1.4], [-.3, 4.0, -1.2, 1.5]]) sphere(g, dx, dy, dz, r, r * .8, r, LEAF[(dx * 7 + dz * 3 & 7) % 3 | 0], 1);
  circles.push([x, z, .45 * s]); return g;
}
function streetGinkgo(x, z, s = 1) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g); cylinder(g, 0, 1.6, 0, .14, .2, 3.2, BARK, 7); sphere(g, 0, 4.2, 0, 1.3, 2.3, 1.3, GINK[0], 1); sphere(g, .2, 5.6, .1, .9, 1.3, .9, GINK[1], 1); circles.push([x, z, .35 * s]); }
function pine(x, z, s = 1) { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); world.add(g); const t = cylinder(g, 0, 1.6, 0, .13, .22, 3.2, BARK, 7); t.rotation.z = .08; for (const [dx, dy, dz, r] of [[.3, 3.4, 0, 1.4], [-.6, 2.7, .3, 1.1], [.5, 4.1, -.2, 1.0]]) { const c = sphere(g, dx, dy, dz, r * 1.3, r * .45, r * 1.1, PINE[(dx > 0) | 0], 1); c.rotation.y = dx; } circles.push([x, z, .4 * s]); }
function shrubBed(x, z, w, d, h = .55) { box(world, x, h / 2, z, w, h, d, M.lime2); for (let i = 0; i < Math.max(2, Math.round(w * d / 3)); i++) sphere(world, x + (Math.random() - .5) * (w - .8), h + .35, z + (Math.random() - .5) * (d - .8), .55 + Math.random() * .3, .4, .55, LEAF[i % 3], 1); wallBox(x - w / 2, x + w / 2, z - d / 2, z + d / 2); }
const LAMPS = [];
function lampPost(x, z, light = false) { const g = new THREE.Group(); g.position.set(x, 0, z); world.add(g); cylinder(g, 0, 2.3, 0, .06, .08, 4.6, M.metal, 8); box(g, 0, 4.62, .32, .2, .1, .9, M.metal); const lp = box(g, 0, 4.56, .36, .14, .02, .7, M.lampOn); lp.castShadow = false; LAMPS.push(lp); if (light) warmLight(g, 0, 4.2, .4, 2.2, 15, "#ffe2b8"); circles.push([x, z, .15]); }
function bench(x, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g); for (const sx of [-.8, .8]) box(g, sx, .2, 0, .12, .4, .5, M.granite); for (let i = 0; i < 4; i++) box(g, 0, .44, -.18 + i * .12, 2.0, .05, .09, M.wood2); for (const k of [-.5, .5]) regSeat(g, k, 0, 0, ry, "sofa"); const rw = Math.abs(Math.sin(ry)) > .5; wallBox(x - (rw ? .3 : 1.05), x + (rw ? .3 : 1.05), z - (rw ? 1.05 : .3), z + (rw ? 1.05 : .3)); }

// ---------- 무량기원 본관 (현대식 바둑 전문 기관) ----------
const building = new THREE.Group(); world.add(building);
const BW = BLD.w, BD = BLD.d, BZ = BLD.z, Y0 = TER.y, GF = 6, FL = 4.2, NF = 3, YT = Y0 + GF + FL * NF; // 1층 6m(로비 층고) + 위 3개 층
const GLASS_G = new THREE.MeshStandardMaterial({ color: "#a9c1c9", roughness: .04, metalness: .35, transparent: true, opacity: .3, depthWrite: false });
nightMats.push({ m: M.glassLit, base: .7 });
{ // 밤 창: 칸마다 불빛이 조금씩 다르게 (몇 칸은 꺼져 있다)
  const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d"); let sd = 29; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let r = 0; r < 3; r++) for (let k = 0; k < 24; k++) { const v = rnd() < .22 ? .08 : .45 + rnd() * .55; x.fillStyle = `rgb(${255 * v | 0},${214 * v | 0},${150 * v | 0})`; x.fillRect(k * 512 / 24, r * 32, 512 / 24, 32); }
  x.fillStyle = "#000"; for (let k = 0; k <= 24; k++) x.fillRect(k * 512 / 24 - 1, 0, 2, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(1.6, 1); M.glassLit.emissiveMap = t; M.glassLit.emissive.set("#ffffff"); M.glassLit.needsUpdate = true;
}
const LOBBY_TEX = (() => { // 1층 유리 너머로 보이는 로비 (밤엔 따뜻하게 빛난다)
  const c = document.createElement("canvas"); c.width = 1024; c.height = 160; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, "#f6efe2"); g.addColorStop(1, "#d9cdb8"); x.fillStyle = g; x.fillRect(0, 0, 1024, 160);
  for (let i = 0; i < 40; i++) { x.fillStyle = i % 2 ? "#cdb995" : "#bfa781"; x.fillRect(i * 25.6, 0, 3, 160); } // 목재 루버 벽
  x.fillStyle = "#24282b"; x.fillRect(372, 30, 280, 74); x.fillStyle = "#d9b56c"; x.font = "700 46px 'Noto Serif KR', serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("無量棋院", 512, 68);
  x.fillStyle = "rgba(255,240,210,.9)"; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(70 + i * 110, 12, 26, 5, 0, 0, 7); x.fill(); }
  x.fillStyle = "#3a3330"; for (const px of [150, 260, 760, 870]) { x.fillRect(px, 112, 60, 30); x.fillRect(px + 8, 104, 44, 10); } // 소파 실루엣
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
{
  const b = building;
  box(b, 0, Y0 / 2, BZ, BW + 2, Y0, BD + 2, M.stone2);                                        // 기단
  box(b, 0, Y0 / 2, (TER.z0 + TER.z1) / 2, TER.x1 - TER.x0, Y0, TER.z1 - TER.z0, M.granite); // 정문 테라스
  box(b, 0, .3, TER.z1 + .4, TER.x1 - TER.x0, .6, .8, M.granite); box(b, 0, .15, TER.z1 + 1.2, TER.x1 - TER.x0, .3, .8, M.granite); // 넓은 계단
  for (const sx of [-6.5, 6.5]) for (const dz of [.15, 1.45]) cylinder(b, sx, .55 - (dz > 1 ? .3 : 0), TER.z1 + dz, .06, .06, 1.1, M.steel, 8);
  for (const sx of [-1, 1]) { shrubBed(sx * 18.5, (TER.z0 + TER.z1) / 2 + .2, 7, 4.2, 1.0); } // 테라스 양옆 화단
  // 1층: 들여 쌓은 유리벽 + 그 너머 로비
  const gz = FRONT - 1.4, core = box(b, 0, Y0 + GF / 2, (BZ - BD / 2 + gz - 3.4) / 2, BW - .8, GF, (gz - 3.4) - (BZ - BD / 2), M.lime2); core.castShadow = true;
  const back = add(b, new THREE.PlaneGeometry(BW - 2, GF - .4), new THREE.MeshBasicMaterial({ map: LOBBY_TEX }), 0, Y0 + GF / 2 - .1, gz - 3.4 + .03); back.castShadow = back.receiveShadow = false; back.userData.noFade = true;
  box(b, 0, Y0 + .02, gz - 1.7, BW - 2, .04, 3.4, M.stone); box(b, 0, Y0 + GF - .1, gz - 1.7, BW - 2, .2, 3.4, M.white);
  for (const sx of [-1, 1]) box(b, sx * (BW / 2 - .7), Y0 + GF / 2, gz - 1.7, .4, GF, 3.4, M.lime2);
  const gl = add(b, new THREE.BoxGeometry(BW - 2, GF, .06), GLASS_G, 0, Y0 + GF / 2, gz); gl.castShadow = false; gl.userData.noFade = true;
  const mull = new THREE.InstancedMesh(new THREE.BoxGeometry(.09, GF, .16), M.metal, 24); let mi = 0; for (let i = 0; i <= 20; i++) { const x = -BW / 2 + 1 + i * (BW - 2) / 20; if (Math.abs(x) < 3.2) continue; mull.setMatrixAt(mi++, M4.compose(V3.set(x, Y0 + GF / 2, gz + .02), QI, S3.set(1, 1, 1))); } mull.count = mi; b.add(mull);
  box(b, 0, Y0 + 4.3, gz + .02, BW - 2, .12, .16, M.metal);
  for (const x of [-20.2, -12.6, 12.6, 20.2]) box(b, x, Y0 + GF / 2, FRONT - .45, .9, GF, .9, M.lime);  // 석재 열주
  // 정문: 자동 유리문 두 짝 + 금속 틀
  box(b, 0, Y0 + 3.0, gz + .05, 6.4, .3, .3, M.metal); for (const sx of [-3.1, 3.1]) box(b, sx, Y0 + 1.5, gz + .05, .22, 3, .3, M.metal);
  for (const sx of [-1.45, 1.45]) { const d = add(b, new THREE.BoxGeometry(2.7, 2.85, .05), GLASS_G, sx * 1.15, Y0 + 1.45, gz + .12); d.castShadow = false; box(b, sx * 1.15, Y0 + 1.45, gz + .14, 2.7, .08, .07, M.steel); }
  // 캐노피 + 기관명
  box(b, 0, Y0 + 5.0, (gz + FRONT + 4.4) / 2, 22, .38, FRONT + 4.4 - gz, M.metal);
  for (const sx of [-9.6, 9.6]) cylinder(b, sx, Y0 + 2.4, FRONT + 3.9, .09, .09, 4.8, M.steel, 10);
  for (let i = 0; i < 10; i++) { const d = cylinder(b, -9 + i * 2, Y0 + 4.8, FRONT + 1.4, .16, .16, .02, M.lampOn, 12); d.castShadow = false; }
  const fas = box(b, 0, Y0 + 5.0, FRONT + 4.42, 22, .62, .06, M.metal); fas.castShadow = false;
  const s1 = textSign([["無量棋院", .62, "#e2c27e"], ["MURYANG BADUK INSTITUTE", .2, "#cdb37c", "600"]], 9.6, .6, { glow: "#ffd28a", res: 1024, ys: [.4, .87] }); s1.position.set(0, Y0 + 5.02, FRONT + 4.46); b.add(s1);
  // 위 3개 층: 유리 띠창 + 석재 띠 + 세로 핀 (도는 띠창)
  box(b, 0, Y0 + GF + FL * NF / 2, BZ, BW - .6, FL * NF, BD - .6, M.glassLit);
  for (let k = 0; k <= NF; k++) { const y = Y0 + GF + k * FL, h = k === NF ? 1.3 : 1.25; box(b, 0, y + (k === NF ? h / 2 : h / 2 - .1), BZ, BW + .2, h, BD + .2, M.lime); }
  const finN = [], fin = new THREE.BoxGeometry(.22, FL - 1.25, .6);
  for (let k = 0; k < NF; k++) { const y = Y0 + GF + k * FL + 1.15 + (FL - 1.25) / 2; for (let i = 1; i < 20; i++) finN.push([-BW / 2 + i * BW / 20, y, FRONT - .05, 0]); for (let i = 1; i < 12; i++) for (const sx of [-1, 1]) finN.push([sx * (BW / 2 - .05), y, BZ - BD / 2 + i * BD / 12, Math.PI / 2]); }
  const fm = new THREE.InstancedMesh(fin, M.lime, finN.length), q2 = new THREE.Quaternion(); finN.forEach(([x, y, z, r], i) => fm.setMatrixAt(i, M4.compose(V3.set(x, y, z), q2.setFromAxisAngle(V3.clone().set(0, 1, 0), r), S3.set(1, 1, 1)))); fm.castShadow = true; b.add(fm);
  // 왼쪽 석재 탑 + 세로 현판 無量棋院
  box(b, -18.6, (Y0 + YT + 1.3) / 2, FRONT - .2, 6.8, YT + 1.3 - Y0, 1.4, M.lime);
  const vs = textSign(["無量棋院"], 2.4, 9.6, { vertical: true, color: "#d8b46a", glow: "#ffcf80", res: 256 }); vs.position.set(-18.6, Y0 + GF + 6.6, FRONT + .52); b.add(vs);
  const vs2 = textSign([["MURYANG", .42, "#bfa676", "600", .18], ["BADUK INSTITUTE", .3, "#bfa676", "600", .1]], 5.2, .9, { res: 512 }); vs2.position.set(-18.6, Y0 + GF + 1.2, FRONT + .52); b.add(vs2);
  // 오른쪽 유리 계단탑
  box(b, BW / 2 + 2, (Y0 + YT) / 2, BZ - 2, 4, YT - Y0, 12, M.glass);
  for (let k = 0; k < 8; k++) box(b, BW / 2 + 2, Y0 + 1.6 + k * 2.2, BZ - 2, 4.05, .14, 12.05, M.metal2);
  // 옥상
  box(b, 3, YT + 2.0, BZ - 4, 14, 2.6, 9, M.lime2); box(b, -10, YT + 1.6, BZ - 6, 6, 1.6, 5, M.metal2);
  wallBox(-BW / 2 - 1, BW / 2 + 4, BZ - BD / 2 - 1, FRONT + .1); wallBox(-22, -15.2, FRONT, FRONT + 1.2);
  for (const sx of [-9.6, 9.6]) circles.push([sx, FRONT + 3.9, .12]);
  warmLight(b, 0, Y0 + 4.2, FRONT + 2.4, 2.6, 13, "#ffe0b0");
}

// ---------- 정문 광장: 입간판 · 깃대 · 조형물 · 나무 ----------
{ // 기관명 입간판 (검은 화강석)
  const g = new THREE.Group(); g.position.set(-10.5, 0, 12.2); g.rotation.y = .32; world.add(g);
  box(g, 0, .15, 0, 5.6, .3, 1.6, M.granite); const pm = mat("#1d1f21", .25, .2); box(g, 0, 1.55, 0, 4.8, 2.5, .6, pm);
  const t = textSign([["無量棋院", .38, "#d9b874"], ["무 량 기 원", .17, "#e8dcc0", "600"], ["MURYANG BADUK INSTITUTE", .085, "#c4ad7f", "600", .1]], 4.4, 2.2, { res: 1024, ys: [.32, .63, .85], glow: "#ffd28a", glowK: .5 }); t.position.set(0, 1.58, .31); g.add(t);
  const t2 = textSign([["바둑의 깊이는 헤아릴 수 없다", .2, "#e8dcc0", "600"], ["無量之棋 · 無盡之道", .16, "#d9b874"]], 4.2, 1.2, { res: 1024, ys: [.38, .72] }); t2.position.set(0, 1.58, -.31); t2.rotation.y = Math.PI; g.add(t2);
  wallBox(-13.4, -7.6, 11, 13.4);
}
const EMBLEM = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 170; const x = c.getContext("2d"); x.fillStyle = "#f7f5ef"; x.fillRect(0, 0, 256, 170);
  x.fillStyle = "#181818"; x.beginPath(); x.arc(108, 85, 42, 0, 7); x.fill(); x.fillStyle = "#fff"; x.strokeStyle = "#181818"; x.lineWidth = 4; x.beginPath(); x.arc(150, 85, 42, 0, 7); x.fill(); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const FLAGS = [];
for (const [i, fx] of [11, 13.4, 15.8].entries()) { cylinder(world, fx, 4.6, 11.4, .05, .07, 9.2, M.steel, 8); const f = add(world, new THREE.PlaneGeometry(1.9, 1.26, 8, 1), new THREE.MeshStandardMaterial({ map: i === 1 ? EMBLEM : null, color: i === 1 ? "#ffffff" : ["#2c3a46", "", "#c9a55f"][i], side: THREE.DoubleSide, roughness: .8 }), fx + 1, 8.4, 11.4); f.castShadow = false; f.userData.noFade = true; FLAGS.push(f); circles.push([fx, 11.4, .1]); }
{ // 조형물 「흑백」: 큰 바둑돌 두 개
  const g = new THREE.Group(); g.position.set(21, 0, 21); world.add(g);
  cylinder(g, 0, .2, 0, 4.4, 4.6, .4, M.granite, 40); const lawn = cylinder(g, 0, .41, 0, 4.0, 4.0, .02, M.ground, 40); lawn.castShadow = false;
  const bk = add(g, new THREE.SphereGeometry(1, 40, 20), new THREE.MeshStandardMaterial({ color: "#121314", roughness: .18, metalness: .25 }), -.9, 1.25, -.5); bk.scale.set(2.3, .95, 2.3);
  const wt = add(g, new THREE.SphereGeometry(1, 40, 20), new THREE.MeshStandardMaterial({ color: "#f4f2ec", roughness: .28 }), 1.5, 1.75, .9); wt.scale.set(1.9, .8, 1.9); wt.rotation.set(.1, 0, .38);
  const pl = textSign([["흑백 黑白", .34, "#2a2a2a", "700"], ["두 돌이 만나 한 판의 우주가 된다", .2, "#4a463e", "600"]], 2.2, .7, { bg: "#d8d1c1", res: 512, metal: 0, rough: .8 }); pl.position.set(0, .7, 4.62); g.add(pl); box(g, 0, .35, 4.5, 2.3, .7, .2, M.granite);
  circles.push([21, 21, 4.6]);
}
// 광장 가장자리 나무 · 화단 · 가로등 · 벤치
for (const z of [14, 24, 34]) for (const sx of [-1, 1]) { if (sx > 0 && z === 24) continue; streetGinkgo(sx * 18.6, z, 1.05); }
for (const x of [-52, -40, -28, -16, 16, 28, 40, 52]) streetGinkgo(x, 45.3, 1.1);
for (const [x, z, li] of [[-17.2, 19, 1], [17.2, 29, 1], [-17.2, 29, 0], [17.2, 12, 0], [-30, 49, 0], [30, 49, 0], [-8, 49, 0], [8, 49, 0]]) lampPost(x, z, !!li);
bench(-14.6, 23, Math.PI / 2); bench(-14.6, 33, Math.PI / 2); bench(14.6, 31, -Math.PI / 2); bench(9, 40.5, Math.PI);
shrubBed(-9, 40.8, 6, 1.6); shrubBed(-23, 8.5, 6, 2.4);
// 야외 대국석 (서쪽 잔디, 느티나무 그늘 아래 돌 바둑판)
const PARK_T = [[-28.5, 12], [-28.5, 21], [-28.5, 30]].map(([x, z], i) => makeGoTable(world, x, z, { kind: "stool", ry: Math.PI / 2, name: `야외 대국석 ${i + 1}번`, zone: "park" }));
for (const [x, z, s] of [[-35, 9, 1.25], [-36, 19, 1.4], [-35, 29, 1.2], [-37, 38, 1.1], [-22.5, 39, .9]]) zelkova(x, z, s);
{ const sg = textSign([["야외 대국석", .4, "#2a2a28", "700"], ["누구나 앉아 한 판 둘 수 있습니다", .2, "#4a463e", "600"]], 2.4, .8, { bg: "#ebe5d6", res: 512, metal: 0, rough: .8 }); sg.position.set(-24.6, 1.3, 6.4); sg.rotation.y = .5; world.add(sg); box(world, -24.62, .55, 6.38, .1, 1.1, .1, M.metal); }
// 건물 뒤·옆 나무, 외곽 소나무
for (const [x, z, s] of [[-30, -6, 1.2], [-31, -20, 1.3], [30, -24, 1.2], [33, -6, 1.1], [-14, -35, 1.1], [0, -37, 1.2], [14, -35, 1.1], [-42, -30, 1.4], [44, -32, 1.3], [46, 6, 1.2], [44, 26, 1.3], [-46, 2, 1.2]]) zelkova(x, z, s);
for (const [x, z, s] of [[-52, -14, 1.5], [-55, 20, 1.6], [54, -16, 1.5], [56, 18, 1.4], [-48, 36, 1.3], [50, 38, 1.4], [-30, -42, 1.5], [30, -44, 1.4], [0, -50, 1.6]]) pine(x, z, s);

// ---------- 실내 (x=600 쪽): 안내·접견실 · 중앙 대국장 · 연구·분석실 · 교육원 ----------
const inner = new THREE.Group(); inner.position.set(IX, 0, 0); world.add(inner);
const RX = x => IX + x, IW = HALL.w, ID = HALL.d, IH = HALL.H, ZP = 6.5; // ZP: 앞쪽(로비·교육원·연구실)과 대국장 사이 칸막이
const inWall = (x0, x1, z0, z1) => wallBox(RX(x0), RX(x1), z0, z1);
const SCREENS = [];
function screenTex(w = 1024, h = 640) { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, t, x: c.getContext("2d") }; }
function drawGoban(x, b, n, X, Y, S, stones = true) { // 2D 바둑판 그리기 (전광판·자석판)
  x.fillStyle = "#dcae63"; x.fillRect(X, Y, S, S); const o = S * .055, st = (S - 2 * o) / (n - 1);
  x.strokeStyle = "#3a2810"; x.lineWidth = Math.max(1, S / 420); for (let i = 0; i < n; i++) { x.beginPath(); x.moveTo(X + o, Y + o + i * st); x.lineTo(X + S - o, Y + o + i * st); x.moveTo(X + o + i * st, Y + o); x.lineTo(X + o + i * st, Y + S - o); x.stroke(); }
  x.fillStyle = "#3a2810"; for (const [a, c] of STAR_PTS[n] || []) { x.beginPath(); x.arc(X + o + a * st, Y + o + c * st, Math.max(2, st * .1), 0, 7); x.fill(); }
  if (!stones || !b) return;
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) { const v = typeof b === "function" ? b(xx, yy) : b.c[b.pos(xx, yy)]; if (v !== BLACK && v !== WHITE) continue; const cx = X + o + xx * st, cy = Y + o + yy * st, R = st * .47, g = x.createRadialGradient(cx - R * .3, cy - R * .35, R * .1, cx, cy, R); if (v === BLACK) { g.addColorStop(0, "#666"); g.addColorStop(1, "#080808"); } else { g.addColorStop(0, "#fff"); g.addColorStop(1, "#c4c0b6"); } x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill(); }
  if (typeof b !== "function" && b.last > 0) { const [a, c] = b.xy(b.last); x.strokeStyle = "#e0453a"; x.lineWidth = Math.max(2, st * .12); x.beginPath(); x.arc(X + o + a * st, Y + o + c * st, st * .22, 0, 7); x.stroke(); }
}
const IM = { lobby: mat("#e7e1d6", .5), slat: mat("#b98f60", .6), slatD: mat("#6e4f36", .6), desk: mat("#f2efe8", .45), shelf: mat("#5b4636", .7) };
{
  const g = inner;
  // 바닥: 로비는 석재, 대국장은 카펫, 교육원·연구실은 마루
  const fl = add(g, new THREE.PlaneGeometry(IW, ID), M.stone, 0, 0, 0); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  box(g, 0, .01, (ZP - ID / 2) / 2, IW - .4, .02, ZP + ID / 2 - .2, M.carpet).castShadow = false;
  for (const sx of [-1, 1]) box(g, sx * 20.5, .01, (ZP + ID / 2) / 2, 15, .02, ID / 2 - ZP - .2, M.floor).castShadow = false;
  box(g, 0, .015, -18.6, 22, .02, 4.6, M.carpet2).castShadow = false;
  // 벽 · 천장 (안쪽만 보이는 면 → 밖에서 내려다보면 집 모형처럼 보인다)
  for (const [x, z, ry, w] of [[0, -ID / 2, 0, IW], [0, ID / 2, Math.PI, IW], [-IW / 2, 0, Math.PI / 2, ID], [IW / 2, 0, -Math.PI / 2, ID]]) { const wl = add(g, new THREE.PlaneGeometry(w, IH), M.plaster, x, IH / 2, z); wl.rotation.y = ry; wl.castShadow = false; wl.userData.noFade = true; const bs = add(g, new THREE.PlaneGeometry(w, .14), M.woodDark, x + Math.sin(ry) * .01, .07, z + Math.cos(ry) * .01); bs.rotation.y = ry; bs.castShadow = false; bs.userData.noFade = true; }
  const ce = add(g, new THREE.PlaneGeometry(IW, ID), M.white, 0, IH, 0); ce.rotation.x = Math.PI / 2; ce.castShadow = false; ce.userData.noFade = true;
  const lg = new THREE.BoxGeometry(.16, .05, 1), lines = []; for (const x of [-21, -12, -4, 4, 12, 21]) for (let z = -20; z <= 20; z += 2.6) lines.push([x, z]);
  const li = new THREE.InstancedMesh(lg, M.lampOn, lines.length); lines.forEach(([x, z], i) => li.setMatrixAt(i, M4.compose(V3.set(x, IH - .03, z), QI, S3.set(1, 1, 2.2)))); li.castShadow = false; li.userData.noFade = true; g.add(li);
  wallBox(RX(-IW / 2 - 1), RX(-IW / 2 + .2), -ID / 2 - 1, ID / 2 + 1); wallBox(RX(IW / 2 - .2), RX(IW / 2 + 1), -ID / 2 - 1, ID / 2 + 1); wallBox(RX(-IW / 2), RX(IW / 2), -ID / 2 - 1, -ID / 2 + .2); wallBox(RX(-IW / 2), RX(-3.2), ID / 2 - .2, ID / 2 + 1); wallBox(RX(3.2), RX(IW / 2), ID / 2 - .2, ID / 2 + 1);
  // 정문(안쪽): 유리 자동문 + 바닥 매트
  box(g, 0, 3.2, ID / 2 - .05, 7, .25, .2, M.metal); for (const sx of [-3.2, 3.2]) box(g, sx, 1.6, ID / 2 - .05, .2, 3.2, .2, M.metal);
  const dg = add(g, new THREE.PlaneGeometry(6.2, 3), new THREE.MeshBasicMaterial({ color: "#cfe0e6", transparent: true, opacity: .55 }), 0, 1.6, ID / 2 - .08); dg.rotation.y = Math.PI; dg.castShadow = false;
  box(g, 0, .02, ID / 2 - 1.6, 5, .03, 2.6, M.ink).castShadow = false;
  const ex = textSign([["나가는 곳 · EXIT", .5, "#3d6b4a", "700"]], 2.2, .4, { bg: "#f4f2ec", res: 512, metal: 0, rough: .8 }); ex.position.set(0, 3.6, ID / 2 - .1); ex.rotation.y = Math.PI; g.add(ex);
  // 칸막이: 유리 + 금속 틀 (통로는 비운다)
  const glassRun = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const p = add(g, new THREE.BoxGeometry(.05, 3.2, L), M.frost, cx, 1.6, cz); p.rotation.y = a; p.castShadow = false; for (const y of [.05, 3.2]) { const f = add(g, new THREE.BoxGeometry(.09, .1, L), M.metal, cx, y, cz); f.rotation.y = a; } for (let t = 0; t <= L + .01; t += 2.2) box(g, x0 + (x1 - x0) * t / L, 1.6, z0 + (z1 - z0) * t / L, .08, 3.2, .08, M.metal); inWall(Math.min(x0, x1) - .08, Math.max(x0, x1) + .08, Math.min(z0, z1) - .08, Math.max(z0, z1) + .08); };
  glassRun(-28, ZP, -19.5, ZP); glassRun(-14.5, ZP, -7.2, ZP); glassRun(7.2, ZP, 14.5, ZP); glassRun(19.5, ZP, 28, ZP);
  for (const sx of [-1, 1]) { glassRun(sx * 13, ZP, sx * 13, 12.8); glassRun(sx * 13, 16.4, sx * 13, 22); }
  const zsign = (txt, sub, x, z, ry, w = 4.2) => { const s = textSign([[txt, .5, "#2a2c2e", "700"], [sub, .26, "#8a7350", "600"]], w, .8, { bg: "rgba(244,242,236,.96)", res: 1024, metal: 0, rough: .8, ys: [.4, .8] }); s.position.set(x, 3.75, z); s.rotation.y = ry; g.add(s); return s; };
  zsign("중앙 대국장", "中央對局場 · MAIN PLAYING HALL", 0, ZP + .08, 0, 5.2); zsign("중앙 대국장", "中央對局場 · MAIN PLAYING HALL", 0, ZP - .08, Math.PI, 5.2);
  zsign("교육원", "敎育院 · ACADEMY", -20.5, ZP + .08, 0); zsign("연구 · 분석실", "硏究分析室 · RESEARCH", 20.5, ZP + .08, 0);
  zsign("교육원", "敎育院 · ACADEMY", -13.08, 14.6, -Math.PI / 2, 3.4); zsign("연구 · 분석실", "硏究分析室 · RESEARCH", 13.08, 14.6, Math.PI / 2, 3.4);
  // --- 안내 · 접견실 (로비) ---
  { const d = new THREE.Group(); d.position.set(0, 0, 11.6); g.add(d); // 안내 데스크
    box(d, 0, .52, 0, 6.4, 1.04, 1.0, IM.desk); box(d, 0, 1.08, .05, 6.6, .08, 1.15, M.wood2); box(d, 0, .3, .52, 6.2, .1, .02, M.gold); box(d, 2.2, 1.25, -.1, .5, .36, .04, M.screen); inWall(-3.4, 3.4, 11, 12.2); }
  { const w = new THREE.Group(); w.position.set(0, 0, 8.7); g.add(w); // 로고 벽: 짙은 목재 + 금빛 無量棋院
    box(w, 0, 2.3, 0, 8, 4.6, .32, M.woodDark); const t = textSign([["無量棋院", .5, "#e0bd72"], ["MURYANG BADUK INSTITUTE", .14, "#c9b083", "600", .12], ["바둑의 깊이는 헤아릴 수 없다", .12, "#d9cfba", "600"]], 7, 2.6, { res: 1024, ys: [.36, .7, .88], glow: "#ffcf80", glowK: .35 }); t.position.set(0, 3.0, .17); w.add(t); inWall(-4, 4, 8.5, 8.9);
    const t2 = textSign([["中央對局場 ↑", .5, "#e0bd72"]], 3.4, .6, { res: 512 }); t2.position.set(0, 3.2, -.17); t2.rotation.y = Math.PI; w.add(t2); }
  const sofa = (x, z, ry, n = 3) => { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); const L = n * .8; box(s, 0, .25, 0, L, .5, .9, M.sofa); box(s, 0, .62, -.38, L, .6, .2, M.sofa); for (const sx of [-1, 1]) box(s, sx * (L / 2 + .08), .4, 0, .16, .8, .9, M.sofa); const rw = Math.abs(Math.sin(ry)) > .5; inWall(x - (rw ? .5 : L / 2 + .2), x + (rw ? .5 : L / 2 + .2), z - (rw ? L / 2 + .2 : .5), z + (rw ? L / 2 + .2 : .5)); for (let i = 0; i < n; i++) regSeat(s, (i - (n - 1) / 2) * .8, 0, .12, ry, "sofa"); };
  for (const sx of [-1, 1]) { if (sx > 0) sofa(8.6, 19.6, Math.PI, 3); else sofa(-8.6, 14.9, 0, 3); /* 왼쪽(입구 쪽) 소파 자리에는 엘리베이터 */ sofa(sx * 11.4, 17, -sx * Math.PI / 2, 3); box(g, sx * 8.6, .22, 17.2, 2.4, .44, 1.2, M.wood2); inWall(sx * 8.6 - 1.2, sx * 8.6 + 1.2, 16.6, 17.8); cylinder(g, sx * 8.6, .5, 17.2, .14, .1, .16, M.white, 10); }
  const plantPot = (x, z, s = 1) => { cylinder(g, x, .4 * s, z, .34 * s, .26 * s, .8 * s, M.pot, 14); for (let i = 0; i < 5; i++) sphere(g, x + Math.cos(i * 1.3) * .2 * s, (1.1 + i * .15) * s, z + Math.sin(i * 1.3) * .2 * s, .38 * s, .3 * s, .38 * s, M.plant, 1); circles.push([RX(x), z, .4 * s]); };
  for (const [x, z, s] of [[-12, 21, 1.3], [12, 21, 1.3], [-5, 9.4, 1], [5, 9.4, 1], [-12, 7.4, 1.1], [12, 7.4, 1.1]]) plantPot(x, z, s);
  { const cab = new THREE.Group(); cab.position.set(-12.4, 0, 10.6); cab.rotation.y = Math.PI / 2; g.add(cab); box(cab, 0, .45, 0, 3, .9, .7, M.woodDark); const gb = add(cab, new THREE.BoxGeometry(3, 1.6, .66), M.frost, 0, 1.7, 0); gb.castShadow = false; for (let i = 0; i < 4; i++) { cylinder(cab, -1.1 + i * .73, 1.15, 0, .12, .06, .3, M.gold, 12); sphere(cab, -1.1 + i * .73, 1.42, 0, .16, .14, .16, M.gold, 2); } inWall(-12.8, -12, 9, 12.2);
    const tl = textSign([["역대 기전 우승컵", .5, "#2a2a28", "700"]], 2, .3, { bg: "#efe9dc", res: 512, metal: 0, rough: .8 }); tl.position.set(.0, 2.7, 0); tl.rotation.y = 0; cab.add(tl); }
  // (입구 안내판은 없앴다 — 안내 데스크의 안내원이 안내한다)
  { const tv = screenTex(), m = add(g, new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({ map: tv.t }), 8.6, 2.6, ID / 2 - .06); m.rotation.y = Math.PI; m.castShadow = false; box(g, 8.6, 2.6, ID / 2 - .03, 3.3, 2.1, .04, M.ink); SCREENS.push({ tv, small: true, m }); }
  for (const [x, z] of [[-6, 15], [6, 15], [0, 18.5]]) { cylinder(g, x, IH - .8, z, .01, .01, 1.6, M.ink, 4); const p = cylinder(g, x, IH - 1.7, z, .55, .7, .35, M.white, 20); p.castShadow = false; const lp = cylinder(g, x, IH - 1.9, z, .5, .5, .02, M.lampOn, 20); lp.castShadow = false; }
  // --- 중앙 대국장 ---
  const HALL_T = []; let tn = 1; for (const z of [1.6, -5.4, -12.4]) for (const x of [-18, -6, 6, 18]) HALL_T.push(makeGoTable(inner, x, z, { kind: "chair", name: `중앙 대국장 ${tn++}번 대국석`, zone: "hall" }));
  for (const T of HALL_T) { box(T.g, .52, .87, .52, .26, .1, .14, M.ink); box(T.g, .52, .875, .59, .2, .06, .02, glow("#ff7a5a")); } // 대국 시계
  { const tv = screenTex(), m = add(g, new THREE.PlaneGeometry(9.6, 6), new THREE.MeshBasicMaterial({ map: tv.t }), 0, 3.3, -ID / 2 + .1); m.castShadow = false; box(g, 0, 3.3, -ID / 2 + .05, 9.9, 6.3, .08, M.ink); SCREENS.push({ tv, m }); }
  for (const [sx, txt] of [[-9, "手談"], [9, "坐隱"]]) { const sc = textSign([txt], 1.3, 3.8, { vertical: true, color: "#1f1f1f", bg: "#efe6d2", res: 256, metal: 0, rough: .9 }); sc.position.set(sx, 3.3, -ID / 2 + .08); g.add(sc); box(g, sx, 5.25, -ID / 2 + .1, 1.5, .08, .08, M.woodDark); box(g, sx, 1.38, -ID / 2 + .1, 1.5, .08, .08, M.woodDark); }
  const slat = new THREE.InstancedMesh(new THREE.BoxGeometry(.12, IH - .6, .08), IM.slat, 80); let si = 0; for (let x = -27.4; x <= 27.4; x += .7) { if (Math.abs(x) < 10.4) continue; slat.setMatrixAt(si++, M4.compose(V3.set(x, (IH - .6) / 2 + .3, -ID / 2 + .06), QI, S3.set(1, 1, 1))); } slat.count = si; g.add(slat);
  for (const x of [-16, -8, 8, 16]) { const bn = new THREE.Group(); bn.position.set(x, 0, -18.4); g.add(bn); box(bn, 0, .42, 0, 3.6, .08, .6, M.wood2); for (const sx of [-1.5, 1.5]) box(bn, sx, .2, 0, .1, .4, .5, M.metal); for (let k = 0; k < 4; k++) regSeat(bn, -1.2 + k * .8, 0, 0, 0, "sofa"); inWall(x - 1.8, x + 1.8, -18.7, -18.1); } // 관전석 벤치
  const tl2 = textSign([["관전석", .5, "#3b3a36", "700"], ["조용히 지켜봐 주세요 · 觀戰席", .28, "#7a6a50", "600"]], 2.4, .6, { bg: "#efe9dc", res: 512, metal: 0, rough: .8, ys: [.38, .78] }); tl2.position.set(-24, 1.6, -18.2); g.add(tl2); box(g, -24, .75, -18.24, .08, 1.5, .08, M.metal);
  // --- 교육원 ---
  const EDU_T = []; let en = 1; for (const z of [10.6, 14.8, 19.0]) for (const x of [-23.2, -17.8]) EDU_T.push(makeGoTable(inner, x, z, { kind: "chair", size: 9, name: `교육원 ${en++}번 (9줄)`, zone: "edu", ry: Math.PI / 2 }));
  { const tv = screenTex(800, 800), m = add(g, new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: tv.t }), -IW / 2 + .14, 2.7, 14.8); m.rotation.y = Math.PI / 2; m.castShadow = false; box(g, -IW / 2 + .05, 2.7, 14.8, .06, 3.8, 3.8, M.ink);
    const J = [[3, 15, 1], [15, 3, 2], [15, 15, 1], [3, 3, 2], [2, 13, 1], [5, 16, 2], [16, 5, 1], [13, 2, 2], [2, 5, 1], [5, 2, 2], [9, 9, 1]]; const map = new Map(J.map(([a, b, v]) => [a + "," + b, v]));
    var EDU_TV = tv; const x = tv.x; x.fillStyle = "#e9e3d4"; x.fillRect(0, 0, 800, 800); drawGoban(x, (a, b) => map.get(a + "," + b) || 0, 19, 40, 40, 720); tv.t.needsUpdate = true;
    const t = textSign([["입문 강좌 · 화점과 소목", .55, "#2a2a28", "700"]], 3.6, .4, { bg: "#efe9dc", res: 512, metal: 0, rough: .8 }); t.position.set(-IW / 2 + .1, 4.85, 14.8); t.rotation.y = Math.PI / 2; g.add(t);
    box(g, -24.2, .55, 8.3, .8, 1.1, .6, M.wood2); inWall(-24.6, -23.8, 8, 8.6); } // 강사 탁자
  // --- 연구 · 분석실 ---
  const LAB_T = [makeGoTable(inner, 17.4, 11.2, { kind: "floor", name: "연구실 복기판 1", zone: "lab", ry: Math.PI / 2 }), makeGoTable(inner, 23.6, 11.2, { kind: "floor", name: "연구실 복기판 2", zone: "lab", ry: Math.PI / 2 })];
  for (const T of LAB_T) { const rug = box(T.g, 0, .012, 0, 2.2, .02, 3.4, mat("#d8ccb0", 1)); rug.castShadow = false; }
  { const d = new THREE.Group(); d.position.set(20.4, 0, 17.6); g.add(d); box(d, 0, .76, 0, 6.4, .06, 1.2, IM.desk); for (const sx of [-3, 3]) box(d, sx, .38, 0, .06, .76, 1.1, M.metal);
    for (const sx of [-2, 0, 2]) { box(d, sx, 1.25, .25, 1.3, .8, .05, M.ink); const sc = screenTex(256, 160); sc.x.fillStyle = "#14181b"; sc.x.fillRect(0, 0, 256, 160); drawGoban(sc.x, null, 19, 8, 8, 144, false); sc.x.fillStyle = "#7fb8e0"; for (let i = 0; i < 6; i++) sc.x.fillRect(166, 14 + i * 22, 30 + ((i * 37) % 50), 8); sc.t.needsUpdate = true; const pm = add(d, new THREE.PlaneGeometry(1.22, .72), new THREE.MeshBasicMaterial({ map: sc.t }), sx, 1.25, .22); pm.rotation.y = Math.PI; pm.castShadow = false; box(d, sx, .95, .3, .1, .3, .1, M.metal); chair(d, sx, -.8, 0); regSeat(d, sx, 0, -.8, 0, "pc"); }
    inWall(17.1, 23.7, 17, 18.3); }
  { const shelfG = new THREE.Group(); shelfG.position.set(IW / 2 - .35, 0, 14.6); g.add(shelfG); box(shelfG, 0, 1.6, 0, .6, 3.2, 12, IM.shelf); const books = []; for (let r = 0; r < 5; r++) for (let k = 0; k < 44; k++) books.push([r, k]);
    const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(.4, .42, .2), mat("#ffffff", .8), books.length), col = new THREE.Color(), cs = ["#7b2f2a", "#2f4a63", "#3b5a3a", "#c9a55f", "#e9e2d0", "#5b4636", "#1f2326"];
    books.forEach(([r, k], i) => { const h = .3 + ((k * 7 + r * 3) % 5) * .03; bm.setMatrixAt(i, M4.compose(V3.set(-.32, .35 + r * .62 + h / 2 - .21 + .02, -5.6 + k * .26), QI, S3.set(1, h / .42, 1))); bm.setColorAt(i, col.set(cs[(k * 3 + r) % cs.length])); });
    for (let r = 0; r < 6; r++) box(shelfG, -.32, .12 + r * .62, 0, .5, .04, 11.9, IM.shelf); g.add(bm); bm.position.set(IW / 2 - .35, 0, 14.6); inWall(IW / 2 - .8, IW / 2, 8.4, 20.8);
    const t = textSign([["기보 서가 · 棋譜書架", .55, "#2a2a28", "700"]], 3, .38, { bg: "#efe9dc", res: 512, metal: 0, rough: .8 }); t.position.set(IW / 2 - .7, 3.55, 14.6); t.rotation.y = -Math.PI / 2; g.add(t); }
  { const tv = screenTex(800, 800), m = add(g, new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: tv.t }), 20.4, 3.0, ID / 2 - .14); m.rotation.y = Math.PI; m.castShadow = false; box(g, 20.4, 3.0, ID / 2 - .05, 3.8, 3.8, .06, M.ink); SCREENS.push({ tv, lab: true, m }); }
  // 조명
  warmLight(g, 0, IH - .6, -8, LQ ? 5 : 4, 34, "#fff1dc"); warmLight(g, 0, IH - .6, 15, 3.2, 22, "#ffe6c4");
  if (!LQ) { warmLight(g, -20, IH - .6, 14, 2.4, 16, "#fff1dc"); warmLight(g, 20, IH - .6, 14, 2.4, 16, "#ffe6c4"); }
  var ZONE_T = { hall: HALL_T, edu: EDU_T, lab: LAB_T, park: PARK_T };
}
const fmat = (c, r = .9) => new THREE.MeshStandardMaterial({ color: c, roughness: r, flatShading: true }); // 각진 면이 그대로 보이는 저폴리 재질
// ---------- 아바타: 고화질 테두리 + 도트(하프톤) 셀 셰이딩 ----------
// 매끈한 공 모양 + 굵은 먹색 외곽선 + 3단 명암(디더링 점무늬) + 납작한 점 이목구비.
const AV = { uL: { value: new THREE.Vector3(-.4, .8, .45) }, uK: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } };
const AV_IN = new THREE.Vector3(.2, .9, .4), AV_MOON = new THREE.Vector3(), AV_NIGHT = new THREE.Color(.74, .84, 1.12), AV_DAY = new THREE.Color(1, 1, 1);
const TOON_V = `uniform vec3 uL; varying vec3 vN; varying vec3 vL;
#include <fog_pars_vertex>
void main(){ vN = normalize(normalMatrix * normal); vL = normalize((viewMatrix * vec4(uL, 0.0)).xyz);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const TOON_F = `uniform vec3 uC; uniform float uK; uniform vec3 uTint; varying vec3 vN; varying vec3 vL;
#include <fog_pars_fragment>
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float x0 = mod(q.x, 2.0), x1 = floor(q.x / 2.0), y0 = mod(q.y, 2.0), y1 = floor(q.y / 2.0);
  return (abs(x0 - y0) * 8.0 + y0 * 4.0 + abs(x1 - y1) * 2.0 + y1 + 0.5) / 16.0; } // 4x4 베이어 행렬(배열 없이 계산)
void main(){
  float nl = dot(normalize(vN), normalize(vL)) * 0.5 + 0.5;
  float t = nl + (bayer(gl_FragCoord.xy / 2.0) - 0.5) * 0.2;
  float band = t > 0.62 ? 1.0 : (t > 0.4 ? 0.82 : 0.64);
  gl_FragColor = vec4(uC * band * uTint * uK, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
const OUT_V = `uniform float uW;
#include <fog_pars_vertex>
void main(){ vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal);
  mvPosition.xyz += n * uW * (1.0 + (-mvPosition.z) * 0.02); gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const OUT_F = `uniform vec3 uC;
#include <fog_pars_fragment>
void main(){ gl_FragColor = vec4(uC, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
const OUT_M = new THREE.ShaderMaterial({ side: THREE.BackSide, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uC: { value: new THREE.Color("#2b1d18") }, uW: { value: .034 } }]), vertexShader: OUT_V, fragmentShader: OUT_F });
const TOON = {}, FLAT = {};
const tm = c => TOON[c] || (TOON[c] = (() => { const m = new THREE.ShaderMaterial({ fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uC: { value: new THREE.Color(c) } }]), vertexShader: TOON_V, fragmentShader: TOON_F }); m.uniforms.uL = AV.uL; m.uniforms.uK = AV.uK; m.uniforms.uTint = AV.uTint; return m; })());
const fl = c => FLAT[c] || (FLAT[c] = glow(c)); // 명암 없는 납작한 점
const avatarMat = () => tm(["#e8dcc0", "#a9c4a0", "#e2b88e", "#b9a7d0", "#e7a9a0", "#9cc0d6"][Math.floor(Math.random() * 6)]);
const HY = .55, GDUR = 2000, DOWN = new THREE.Vector3(0, -1, 0), EYE_W = .085, EYE_H = .125;
const GS = {}, GC = {}, GT = new THREE.TorusGeometry(.405, .055, 10, 32); // 아바타끼리 지오메트리를 공유한다
const hull = (o, g) => { const h = new THREE.Mesh(g, OUT_M); h.castShadow = h.receiveShadow = false; o.add(h); return o; };
function ball(p, x, y, z, sx, sy, sz, m, d = 3, line = true) { const g = GS[d] || (GS[d] = new THREE.IcosahedronGeometry(1, d)), o = add(p, g, m, x, y, z); o.scale.set(sx, sy, sz); return line ? hull(o, g) : o; }
function caps(p, x, y, z, r, len, m) { const k = r + "_" + len, g = GC[k] || (GC[k] = new THREE.CapsuleGeometry(r, len, 6, 14)); return hull(add(p, g, m, x, y, z), g); }
function makeAvatar(name, isLocal = false) { // 크고 둥근 머리 · 큼직한 점 눈 · 통통한 볼 — 매끈한 면과 굵은 외곽선
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = HY; g.add(body);
  const robe = isLocal ? avatarMat() : tm("#e8dcc0"), sash = tm("#8a5a3c"), skin = tm("#f6cfa8"), shoe = tm("#6b4a38"), robeMs = []; let sashM = null;
  robeMs.push(ball(body, 0, .6 - HY, 0, .42, .4, .36, robe, 4));                       // 통통한 몸통
  { const bt = sashM = add(body, GT, sash, 0, .52 - HY, 0); bt.rotation.x = Math.PI / 2; bt.scale.y = .88; }  // 허리띠
  ball(body, 0, .93 - HY, .18, .17, .1, .12, skin, 3, false);              // 옷깃 사이로 보이는 목
  ball(body, 0, 1.42 - HY, 0, .66, .6, .6, skin, 5);                       // 큰 머리
  const eyes = [-.24, .24].map(dx => { // 크고 반짝이는 점 눈: 하이라이트 두 점(눈 깜빡임에 같이 숨는다)
    const e = ball(body, dx, 1.385 - HY, .575, EYE_W, EYE_H, .04, fl("#2a1d18"), 3, false), h = new THREE.Group(); body.add(h);
    ball(h, dx + .03, 1.43 - HY, .622, .032, .04, .012, fl("#ffffff"), 2, false); ball(h, dx - .025, 1.34 - HY, .62, .015, .018, .01, fl("#ffffff"), 2, false);
    return { e, h };
  });
  for (const sx of [-1, 1]) { const br = ball(body, sx * .24, 1.56 - HY, .56, .075, .017, .02, fl("#2a1d18"), 2, false); br.rotation.z = sx * -.22; } // 살짝 올라간 눈썹
  const nose = ball(body, 0, 1.31 - HY, .62, .07, .055, .05, fl("#e8998a"), 3, false);   // 동글한 코
  for (const dx of [-.4, .4]) { ball(body, dx, 1.28 - HY, .49, .15, .085, .05, fl("#ff9d96"), 3, false); ball(body, dx * 1.6, 1.4 - HY, 0, .08, .11, .09, skin, 3); } // 통통한 볼 · 귀
  const dot = ball(body, 0, 1.68 - HY, .56, .034, .042, .025, fl("#f2c94c"), 2, false); // 이마의 금빛 점(백호)
  const mouth = ball(body, 0, 1.2 - HY, .59, .06, .026, .02, fl("#5a2a24"), 2, false);
  const arms = [-1, 1].map(sx => {
    const a = new THREE.Group(); a.position.set(sx * .38, .86 - HY, 0); body.add(a);
    robeMs.push(caps(a, 0, -.27, 0, .1, .3, robe)); a.userData.hand = ball(a, 0, -.54, 0, .105, .115, .105, skin, 3); // 짧고 통통한 팔 · 뭉툭한 손
    a.userData.sx = sx; a.userData.rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sx * .16));
    a.quaternion.copy(a.userData.rest); return a;
  });
  const legs = [-1, 1].map(sx => { const l = new THREE.Group(); l.userData.sx = sx; l.position.set(sx * .17, .2, 0); g.add(l);
    l.userData.foot = ball(l, 0, 0, .06, .16, .2, .22, shoe, 3);                                                    // 둥근 신발
    const th = caps(l, 0, 0, .23, .12, .22, robe); robeMs.push(th); th.rotation.x = Math.PI / 2; th.visible = false;               // 의자에 앉을 때만 보이는 허벅지
    const sh = caps(l, 0, -.15, .46, .1, .1, robe); robeMs.push(sh); sh.visible = false;                                           // 정강이
    l.userData.thigh = th; l.userData.shin = sh; return l; });
  Object.assign(g.userData, { displayName: name, isLocal, body, arms, legs, eyes, mouth, nose, dot, robeMs, sashM, walk: 0, walkS: 0 });
  return g;
}
const q16 = h => "#" + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) / 17).toString(16).repeat(2)).join(""); // 색을 16단계로 묶어 재질 수를 제한
const okOutfitOld = o => !!o && [o.r, o.s, o.c].every(c => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) && Number.isInteger(o.h) && o.h >= 0 && o.h <= 4095 && (o.b === undefined || (Number.isInteger(o.b) && o.b >= 0 && o.b <= 127)) && (o.k === undefined || (typeof o.k === "string" && /^#[0-9a-f]{6}$/i.test(o.k))) && ["e", "n", "m"].every(k => o[k] === undefined || (Number.isInteger(o[k]) && o[k] >= 0 && o[k] <= 6));
function setOutfitOld(av, o) { // h: 머리(1 삿갓 · 2 안경 · 4 리본), b: 몸통(1 목도리 · 2 염주 · 4 가사)
  const u = av.userData, monk = (o.b | 0) & 64, kasa = (o.b | 0) & 4, kc = /^#[0-9a-f]{6}$/i.test(o.k || "") ? o.k : "#a8402b", rm = monk ? tm("#a3a7aa") : kasa ? tm("#f2f0ea") : tm(q16(o.r)); u.robeMs.forEach(m => { m.material = rm; }); u.sashM.material = tm(q16(o.s)); u.sashM.visible = !(monk || kasa); for (const l of u.legs) { const lm = kasa ? tm(q16(kc)) : rm; l.userData.thigh.material = lm; l.userData.shin.material = lm; }
  if (u.armObjs) for (const a of u.armObjs) a.parent && a.parent.remove(a); u.armObjs = [];
  if (u.hatObj) { u.body.remove(u.hatObj); u.hatObj.traverse(m => { if (m.geometry) m.geometry.dispose(); }); u.hatObj = null; }
  if (u.faceObj) { u.body.remove(u.faceObj); u.faceObj.traverse(m => { if (m.geometry) m.geometry.dispose(); }); u.faceObj = null; }
  { // 얼굴: 눈 · 코 · 입 (0 = 기본)
    const E = [2, 3, 4, 5, 6].includes(o.e | 0) ? o.e | 0 : 0, N = [1, 2, 3, 4].includes(o.n | 0) ? o.n | 0 : 0, M = 0, DK = fl("#2a1d18"), fg = new THREE.Group(); u.body.add(fg); u.faceObj = fg;
    const ES = [[1, 1], [1.4, .95], [1, 1], [1, 1], [.55, .42], [1, 1.25]][E] || [1, 1]; u.ew = ES[0]; u.eh = ES[1]; u.eyeX = E === 2 || E === 3 || E === 6;
    for (const { e, h } of u.eyes) { e.visible = !u.eyeX; h.visible = !u.eyeX; if (!u.eyeX) e.scale.set(EYE_W * u.ew, EYE_H * u.eh, .04); }
    for (const sx of [-1, 1]) {
      if (E === 2) add(fg, new THREE.TorusGeometry(.085, .022, 6, 12, Math.PI), DK, sx * .24, 1.36 - HY, .59);
      if (E === 6) { const ar = add(fg, new THREE.TorusGeometry(.085, .022, 6, 12, Math.PI), DK, sx * .24, 1.4 - HY, .59); ar.rotation.z = Math.PI; } // 감은 눈 ‿
      if (E === 3) box(fg, sx * .24, 1.37 - HY, .585, .19, .03, .03, DK);
      if (E === 5) { const l = box(fg, sx * .34, 1.47 - HY, .58, .1, .022, .022, DK); l.rotation.z = -sx * .5; }
    }
    u.nose.visible = true; u.nose.material = fl("#e8998a"); u.nose.scale.set(.07, .055, .05); u.nose.position.set(0, 1.31 - HY, .62);
    if (N === 1) { u.nose.scale.set(.028, .028, .025); u.nose.material = fl("#5a2a24"); }
    else if (N === 2) { u.nose.scale.set(.11, .09, .08); u.nose.material = fl("#e0604f"); }
    else if (N === 3) { u.nose.scale.set(.05, .1, .1); u.nose.material = fl("#eab0a0"); u.nose.position.set(0, 1.3 - HY, .68); }
    else if (N === 4) u.nose.visible = false;
    else if (N === 5) { u.nose.visible = false; const c = add(fg, new THREE.ConeGeometry(.055, .06, 3), fl("#f08aa0"), 0, 1.33 - HY, .625); c.rotation.z = Math.PI; }
    u.mw = 1; u.mh = 1; u.mouth.visible = true; u.mouth.material = fl("#5a2a24");
    if (M === 1) { u.mw = 1.5; u.mh = 1.9; u.mouth.material = fl("#7a2a2a"); }
    else if (M === 2) { u.mw = .55; u.mh = .8; }
    else if (M === 3) { u.mw = .5; u.mh = 2.4; u.mouth.material = fl("#7a3a34"); }
    else if (M === 4) { u.mouth.visible = false; for (const sx of [-1, 1]) ball(fg, sx * .04, 1.2 - HY, .595, .045, .03, .02, DK, 2, false); box(fg, 0, 1.245 - HY, .6, .015, .05, .015, DK); }
    else if (M === 5) { u.mw = 1.1; ball(fg, 0, 1.15 - HY, .585, .045, .05, .02, fl("#ff8fa3"), 2, false); }
    u.dot.visible = !((o.h | 0) & 512);
  }
  const hb = o.h | 0, bb = o.b | 0; if (!hb && !bb) return; const hg = new THREE.Group(), c = tm(q16(o.c)), dark = tm("#26211c"); u.body.add(hg); u.hatObj = hg;
  if (hb & 1) { add(hg, new THREE.ConeGeometry(.95, .42, 28), tm("#d9b877"), 0, 2.0 - HY, 0); add(hg, new THREE.CylinderGeometry(.2, .3, .08, 12), tm("#8a6a3a"), 0, 2.2 - HY, 0); } // 삿갓
  if (hb & 2) { for (const sx of [-1, 1]) { add(hg, new THREE.TorusGeometry(.17, .022, 8, 24), dark, sx * .24, 1.385 - HY, .625); const arm = box(hg, sx * .45, 1.39 - HY, .46, .022, .022, .32, dark); arm.rotation.y = sx * .5; } box(hg, 0, 1.4 - HY, .63, .12, .022, .022, dark); } // 안경
  if (hb & 4) { const bx = .3, by = 1.94 - HY, bz = .31; // 리본: 통통한 두 날개 + 매듭 + 꼬리
    for (const k of [-1, 1]) { const lp = ball(hg, bx + .17 * k, by + .04 * k, bz, .17, .11, .06, c, 3, false); lp.rotation.z = k * .38; const tl = ball(hg, bx + .06 * k, by - .13, bz - .01, .05, .13, .03, c, 3, false); tl.rotation.z = k * .28; }
    ball(hg, bx, by, bz + .01, .065, .065, .06, tm("#fff6f0"), 3, false); }
  if (bb & 1) { const t = add(hg, new THREE.TorusGeometry(.3, .09, 8, 24), c, 0, .93 - HY, .01); t.rotation.x = Math.PI / 2; t.scale.set(1, .85, 1); box(hg, .1, .78 - HY, .33, .13, .36, .05, c).rotation.z = .08; } // 목도리
  if (bb & 2) { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, y = .92 - .22 * (.5 + .5 * Math.cos(a)), q = Math.sqrt(Math.max(.02, 1 - ((y - .6) / .4) ** 2)), big = i % 4 === 0; ball(hg, Math.sin(a) * (.42 * q + .035), y - HY, Math.cos(a) * (.36 * q + .035), big ? .05 : .034, big ? .05 : .034, big ? .05 : .034, big ? tm("#d9b04c") : tm("#5a3a22"), 2, false); } } // 염주
  if (hb & 8) { for (const sx of [-1, 1]) { // 토끼 귀: 길고 말랑한 귀 · 안쪽 분홍 · 살짝 바깥으로 기울어짐
      const gE = new THREE.Group(); gE.position.set(sx * .27, 1.98 - HY, -.02); gE.rotation.z = -sx * .2; gE.rotation.x = -.1; hg.add(gE);
      ball(gE, 0, .33, 0, .14, .38, .07, tm("#fbf6ee"), 4, true); ball(gE, 0, .3, .05, .075, .27, .03, tm("#f6a9c0"), 3, false); ball(gE, 0, .02, 0, .15, .08, .1, tm("#fbf6ee"), 3, false); }
  }
  if (hb & 16) { const cn = add(hg, new THREE.ConeGeometry(.4, .82, 28), c, 0, 2.38 - HY, -.02); cn.rotation.x = -.12; // 고깔: 끝이 살짝 뒤로 · 흰 띠와 물방울 · 방울
    const br = add(hg, new THREE.TorusGeometry(.39, .035, 8, 28), tm("#f8f3ea"), 0, 1.99 - HY, -.0); br.rotation.x = Math.PI / 2 - .12; br.scale.set(1, 1, 1);
    for (let i = 0; i < 7; i++) { const t = i / 7, a = t * Math.PI * 4.2, rr = .34 * (1 - t * .85), yy = 2.1 + t * .62; ball(hg, Math.sin(a) * rr, yy - HY, Math.cos(a) * rr - .1 * t, .035, .035, .03, tm("#f8f3ea"), 2, false); }
    ball(hg, 0, 2.82 - HY, -.1, .085, .085, .085, tm("#f8f3ea"), 3, false); }
  if (hb & 32) { const hl2 = add(hg, new THREE.TorusGeometry(.45, .035, 8, 32), fl("#ffd76a"), 0, 2.38 - HY, 0); hl2.rotation.x = Math.PI / 2 - .12; } // 엔젤링
  if (hb & 64) { // 화관: 이마 위에 얹힌 풀잎 고리 + 다섯 잎 꽃 + 작은 잎
    const fc = ["#f6bfd0", "#fff1f4", "#ffd76a", "#f2a0b8", "#fff1f4", "#c9b6f0"], lf = tm("#6aa04e"), y0 = 1.8 - HY, RX = .5, RZ = .46;
    const rg = add(hg, new THREE.TorusGeometry(1, .028, 6, 40), tm("#5f8a45"), 0, y0, 0); rg.rotation.x = Math.PI / 2; rg.scale.set(RX, RZ, 1); rg.rotation.x = Math.PI / 2 - .1;
    for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; if (Math.cos(a) < -.55) continue; const px = Math.sin(a) * (RX + .02), pz = Math.cos(a) * (RZ + .02), py = y0 - .05 * Math.cos(a) + (i % 2 ? .02 : 0), nx = Math.sin(a), nz = Math.cos(a), tx = Math.cos(a), tz = -Math.sin(a), col = tm(fc[i % fc.length]), pr = i % 2 ? .05 : .065;
      for (let k = 0; k < 5; k++) { const ph = k / 5 * Math.PI * 2; ball(hg, px + nx * .01 + (tx * Math.cos(ph)) * pr, py + Math.sin(ph) * pr, pz + nz * .01 + (tz * Math.cos(ph)) * pr, .042, .042, .03, col, 2, false); }
      ball(hg, px + nx * .03, py, pz + nz * .03, .03, .03, .028, fl("#f2b631"), 2, false);
      const lv = ball(hg, px + tx * .12, py - .03, pz + tz * .12, .07, .025, .03, lf, 2, false); lv.rotation.y = a; lv.rotation.z = -.3; }
  }
  if (hb & 128) { for (const sx of [-1, 1]) { // 고양이 귀: 통통한 둥근 삼각 · 안쪽 분홍 · 머리 모서리에 살짝 기울여
      const gE = new THREE.Group(); gE.position.set(sx * .37, 1.93 - HY, .02); gE.rotation.z = -sx * .42; gE.rotation.x = -.12; hg.add(gE);
      const o1 = add(gE, new THREE.ConeGeometry(.21, .42, 20), c, 0, .17, 0); o1.scale.set(1, 1, .5);
      ball(gE, 0, .39, 0, .05, .05, .035, c, 2, false);
      const i1 = add(gE, new THREE.ConeGeometry(.12, .27, 16), tm("#f6a9c0"), 0, .12, .055); i1.scale.set(1, 1, .4); } }
  if (hb & 256) { const gd = fl("#f0c94d"), gd2 = fl("#d9a928"); // 왕관: 금띠 + 둥근 끝 다섯 봉우리 + 보석
    add(hg, new THREE.CylinderGeometry(.36, .4, .14, 28), gd, 0, 2.06 - HY, 0); const bnd = add(hg, new THREE.TorusGeometry(.38, .02, 6, 28), gd2, 0, 2.0 - HY, 0); bnd.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, px = Math.sin(a) * .36, pz = Math.cos(a) * .36; add(hg, new THREE.ConeGeometry(.085, .28, 12), gd, px, 2.27 - HY, pz); ball(hg, px, 2.43 - HY, pz, .045, .045, .045, tm(["#d6453d", "#4f8fd6", "#5bbd7a", "#d6453d", "#4f8fd6"][i]), 3, false); }
    ball(hg, 0, 2.06 - HY, .405, .06, .07, .03, tm("#d6453d"), 3, false); }
  if (hb & 1024) { const hp = fl("#2b2b30"), hp2 = fl("#c9a45c"); add(hg, new THREE.TorusGeometry(.7, .045, 8, 28, Math.PI), hp, 0, 1.42 - HY, 0); for (const sx of [-1, 1]) { const cu = add(hg, new THREE.CylinderGeometry(.2, .2, .13, 16), hp, sx * .7, 1.4 - HY, 0); cu.rotation.z = Math.PI / 2; const pd = add(hg, new THREE.CylinderGeometry(.16, .16, .04, 16), hp2, sx * .77, 1.4 - HY, 0); pd.rotation.z = Math.PI / 2; } } // 헤드폰
  if (hb & 2048) { const wh = fl("#ffffff"); for (const sx of [-1, 1]) { ball(hg, sx * .7, 1.37 - HY, .05, .06, .06, .06, wh, 2, false); cylinder(hg, sx * .7, 1.26 - HY, .07, .018, .018, .2, wh, 6); } } // 에어팟
  if (bb & 64) { // 스님 복장: 회색 두루마기 — 흰 동정 V깃 · 오른쪽으로 여민 앞섶 · 고름 · 다리 중간까지 퍼지는 자락 · 넓은 소매
    const wh = tm("#faf8f2"), gl = tm("#7d8184"), gy = tm("#b9bcbe"), rdm = rm.clone(); rdm.side = THREE.DoubleSide;
    const zs = (x, y) => .36 * Math.sqrt(Math.max(.02, 1 - ((y - .6) / .4) ** 2 - (x / .42) ** 2)) + .018;
    const tube = (arr, rad, m) => add(hg, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arr.map(([x, y]) => new THREE.Vector3(x, y - HY, zs(x, y)))), 24, rad, 6, false), m, 0, 0, 0);
    tube([[-.15, .94], [-.11, .85], [-.06, .76], [0, .68]], .02, wh); tube([[.15, .94], [.11, .85], [.06, .76], [0, .68]], .02, wh); // 동정: 어깨에서 가슴 한가운데로 모이는 V
    tube([[0, .68], [-.08, .6], [-.18, .5], [-.29, .4]], .016, gl); // 오른쪽 섶이 왼쪽 옆구리로 비스듬히 덮이는 선
    const nk = add(hg, new THREE.TorusGeometry(.2, .04, 8, 24), wh, 0, .95 - HY, .05); nk.rotation.x = Math.PI / 2; // 목뒤 깃
    u.armObjs = u.arms.map(a => { const gA = new THREE.Group(); a.add(gA); const sg = new THREE.CylinderGeometry(.118, .165, .5, 18, 1, true); hull(add(gA, sg, rdm, 0, -.27, 0), sg); return gA; }); // 어깨에서 사선으로 자연스럽게 퍼지는 소매(손은 살짝 보인다)
  }
  if (bb & 8) { // 망토: 어깨에서 종아리까지 뒤로 드리운 둥근 망토 + 금 여밈
    const cm = tm(q16(kc)), cd = cm.clone(); cd.side = THREE.DoubleSide; const g4 = new THREE.SphereGeometry(1, 44, 22, Math.PI, Math.PI, .45, 2.0), p4 = g4.attributes.position;
    for (let k = 0; k < p4.count; k++) { const x = p4.getX(k), y = p4.getY(k), z = p4.getZ(k), lw = Math.max(0, .1 - y), kk = 1 + .22 * lw + .02 * Math.sin(Math.atan2(x, z) * 9) * lw; p4.setX(k, x * kk); p4.setZ(k, z * kk); } g4.computeVertexNormals();
    const mt = new THREE.Mesh(g4, cd); mt.scale.set(.56, .58, .5); mt.position.set(0, .5 - HY, -.02); hg.add(mt);
    const nk = add(hg, new THREE.TorusGeometry(.26, .05, 8, 24), cm, 0, .96 - HY, .02); nk.rotation.x = Math.PI / 2; nk.scale.set(1, .9, 1);
    for (const sx of [-1, 1]) ball(hg, sx * .15, .93 - HY, .2, .045, .045, .04, tm("#e0b958"), 2, false); box(hg, 0, .93 - HY, .215, .24, .014, .014, tm("#e0b958")); // 금 여밈 사슬
  }
  if (bb & 16) { ball(hg, 0, .6 - HY, -.5, .27, .27, .24, tm("#c9a45c"), 3); ball(hg, 0, .92 - HY, -.5, .09, .09, .09, tm("#c9a45c"), 2, false); } // 보따리
  if (bb & 32) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ball(hg, -.17 + Math.cos(a) * .045, .8 - HY + Math.sin(a) * .045, .33, .035, .035, .03, tm("#f6bfd0"), 2, false); } ball(hg, -.17, .8 - HY, .335, .03, .03, .03, fl("#ffd76a"), 2, false); } // 연꽃 브로치
  if (bb & 4) { // 가사: 흰 옷 위에 오른쪽 어깨 · 한쪽 팔 · 하의 전체를 덮는 붉은 천. 가장자리는 금빛 선으로 앞뒤 모두 깔끔하게
    const red = tm(q16(kc)), rd = red.clone(), tr = fl("#e0b958"); rd.side = THREE.DoubleSide;
    const sg = new THREE.SphereGeometry(1, 112, 56), pa = sg.attributes.position;
    for (let k = 0; k < pa.count; k++) { const x = pa.getX(k), y = pa.getY(k), z = pa.getZ(k), lw = Math.max(0, -y), kk = 1 + .03 * Math.sin(Math.atan2(x, z) * 10) * Math.min(1, lw * 2.4) + .07 * lw; pa.setX(k, x * kk); pa.setZ(k, z * kk); } sg.computeVertexNormals();
    const ix = sg.index.array, keep = []; for (let t = 0; t < ix.length; t += 3) { let cx = 0, cy = 0; for (let k = 0; k < 3; k++) { cx += pa.getX(ix[t + k]) * .445 / 3; cy += (.6 + pa.getY(ix[t + k]) * .425) / 3; } if (cy < .64 || (.755 * (cx + .42) - .655 * (cy - .35)) > 0) keep.push(ix[t], ix[t + 1], ix[t + 2]); }
    sg.setIndex(keep); const lo = new THREE.Mesh(sg, rd); lo.scale.set(.445, .425, .39); lo.position.set(0, .6 - HY, 0); hg.add(lo);
    { const fr = [], bk = []; for (let k = 0; k <= 40; k++) { const t = -.45 + 1.15 * k / 40, x = -.42 + .655 * t, y = .35 + .755 * t, q = 1 - ((y - .6) / .425) ** 2 - (x / .445) ** 2; if (q <= 0) continue; const zz = .39 * Math.sqrt(q) + .014; fr.push(new THREE.Vector3(x, y - HY, zz)); bk.push(new THREE.Vector3(x, y - HY, -zz)); }
      if (fr.length > 3) { const pts = fr.concat(bk.reverse()); add(hg, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, .019, 6, true), tr, 0, 0, 0); } } // 앞에서 뒤까지 이어지는 금빛 가장자리
    const ar = new THREE.Group(); u.arms[1].add(ar); u.armObjs = [ar]; caps(ar, 0, -.27, 0, .125, .32, red); // 한쪽 팔을 덮은 소매
  }
}
const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3();
const qH = new THREE.Quaternion(), TILT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), .35), M_PENCIL = new THREE.MeshStandardMaterial({ color: "#f2c14e", roughness: .6 });
const breathK = t => { const c = t % 10; return c < 4 ? .5 - .5 * Math.cos(c / 4 * Math.PI) : .5 + .5 * Math.cos((c - 4) / 6 * Math.PI); }; // 4초 들이쉬고 6초 내쉬는 숨

// ---------- v2 옷 · 머리: 현대 복장(정장 · 셔츠 · 니트 · 후드티 · 코트) + 머리 모양 + 소품 ----------
const HEX6 = /^#[0-9a-f]{6}$/i;
function cleanOutfit(o) {
  if (!o || typeof o !== "object") return null;
  const I = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  if (![o.r, o.p, o.k, o.hc].every(c => typeof c === "string" && HEX6.test(c))) return null;
  if (!I(o.t, 0, 4) || !I(o.hs, 0, 7) || !I(o.a, 0, 255) || !I(o.e | 0, 0, 6) || !I(o.n | 0, 0, 4)) return null;
  return { v: 3, t: o.t, r: o.r, p: o.p, k: o.k, hs: o.hs, hc: o.hc, a: o.a, e: o.e | 0, n: o.n | 0 };
}
const SUIT_C = ["#2b3547", "#3a3d42", "#4a4f57", "#2f3b33"], TIE_C = ["#8a2b2b", "#2f5a8a", "#c9a55f", "#3b6b4a", "#5a3a6e"], HAIR_C = ["#2a211c", "#3b2a20", "#1d1a18"];
const rpick = a => a[Math.floor(Math.random() * a.length)];
function defaultOutfit() { const r = rpick(SUIT_C); return { v: 3, t: 0, r, p: r, k: rpick(TIE_C), hs: 0, hc: rpick(HAIR_C), a: 0, e: 0, n: 0 }; }
const HAIR_G = {};
function hairGeo(style) { // 머리 덮개: 구를 앞 · 옆 · 뒤 머리선에서 잘라 낸다
  if (HAIR_G[style]) return HAIR_G[style];
  const P = { 0: [.36, .02, -.55], 1: [.4, .0, -.55], 2: [.4, -.28, -1.1], 3: [.42, -.5, -.8], 4: [.38, -.05, -.5], 6: [.32, -.08, -.55], 7: [.5, .12, -.3] }[style] || [.36, 0, -.5];
  const g = new THREE.SphereGeometry(1, 40, 26), pa = g.attributes.position, ix = g.index.array, keep = [];
  for (let t = 0; t < ix.length; t += 3) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { const v = ix[t + k]; x += pa.getX(v) / 3; y += pa.getY(v) / 3; z += pa.getZ(v) / 3; } const f = Math.max(0, z), bk = Math.max(0, -z), sd = 1 - f - bk; if (y > P[0] * f + P[1] * sd + P[2] * bk) keep.push(ix[t], ix[t + 1], ix[t + 2]); }
  g.setIndex(keep); return (HAIR_G[style] = g);
}
function bodyPatch(hg, inside, m, off = .012, x0 = -.42, x1 = .42, y0 = .2, y1 = 1.0, res = .018) { // 몸통 앞면에 딱 붙는 판(셔츠 · 넥타이 · 깃 · 주머니)
  const pos = [], idx = [], map = new Map();
  const V = (i, j) => { const k = i * 1000 + j; if (map.has(k)) return map.get(k); const x = x0 + i * res, y = y0 + j * res, q = 1 - ((y - .6) / .4) ** 2 - (x / .42) ** 2; if (q <= 0) { map.set(k, -1); return -1; } pos.push(x, y - HY, .36 * Math.sqrt(q) + off); const n = pos.length / 3 - 1; map.set(k, n); return n; };
  const nx = Math.round((x1 - x0) / res), ny = Math.round((y1 - y0) / res);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { if (!inside(x0 + (i + .5) * res, y0 + (j + .5) * res)) continue; const a = V(i, j), b = V(i + 1, j), c = V(i + 1, j + 1), d = V(i, j + 1); if (a < 0 || b < 0 || c < 0 || d < 0) continue; idx.push(a, b, c, a, c, d); }
  if (!idx.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const me = new THREE.Mesh(g, m); hg.add(me); return me;
}
const bz = (x, y) => .36 * Math.sqrt(Math.max(.02, 1 - ((y - .6) / .4) ** 2 - (x / .42) ** 2)); // 몸통 앞면 깊이
const shade = (h, k) => { const c = new THREE.Color(h).multiplyScalar(k); return "#" + c.getHexString(); };
const PANTS_G = new THREE.SphereGeometry(1, 28, 8, 0, Math.PI * 2, 1.95, Math.PI - 1.95);
function setOutfit(av, o0) {
  const o = cleanOutfit(o0) || defaultOutfit(), u = av.userData;
  setOutfitOld(av, { r: o.r, s: shade(o.r, .7), c: "#ffffff", h: 512, b: 0, e: o.e, n: o.n, m: 0, k: "#000000" }); // 얼굴(눈·코)과 기본 몸 색은 예전 방식 그대로
  if (u.modObj) { u.body.remove(u.modObj); u.modObj.traverse(m => { if (m.geometry && !Object.values(HAIR_G).includes(m.geometry) && m.geometry !== PANTS_G) m.geometry.dispose(); }); }
  const hg = new THREE.Group(); u.body.add(hg); u.modObj = hg; u.outfit = o; u.dot.visible = false;
  const top = tm(q16(o.r)), dark = tm(q16(shade(o.r, .72))), pants = tm(q16(o.p)), acc = tm(q16(o.k)), white = tm("#f5f3ee"), ink = tm("#26211c"), hair = tm(q16(o.hc));
  u.robeMs.forEach(m => { m.material = top; }); for (const l of u.legs) { l.userData.thigh.material = pants; l.userData.shin.material = pants; l.userData.foot.material = tm("#2b2725"); }
  u.sashM.visible = o.t === 2 || o.t === 4; u.sashM.material = o.t === 4 ? tm(q16(shade(o.r, .6))) : dark;
  if (o.t !== 4) { const pc = add(hg, PANTS_G, pants, 0, .6 - HY, 0); pc.scale.set(.428, .408, .368); pc.castShadow = false; }
  const t = o.t;
  if (t === 0 || t === 4) { // 정장 · 코트: V깃 + 셔츠 + (정장) 넥타이
    const k = t === 4 ? .7 : .62, lw = t === 4 ? .08 : .055;
    bodyPatch(hg, (x, y) => y > .6 && y < .97 && Math.abs(x) < (y - .6) * k, t === 4 ? acc : white, .012);
    bodyPatch(hg, (x, y) => y > .62 && y < .97 && Math.abs(x) >= (y - .6) * k && Math.abs(x) < (y - .6) * k + lw, dark, .018);
    if (t === 0) { bodyPatch(hg, (x, y) => y > .52 && y < .9 && Math.abs(x) < .024 + (.9 - y) * .07, acc, .022); ball(hg, 0, .895 - HY, bz(0, .895) + .03, .045, .035, .03, acc, 2, false); bodyPatch(hg, (x, y) => x > .17 && x < .27 && y > .72 && y < .77, white, .016); }
    for (const [x, y] of t === 0 ? [[0, .46], [0, .39]] : [[-.08, .52], [.08, .52], [-.08, .43], [.08, .43]]) ball(hg, x, y - HY, bz(x, y) + .015, .022, .022, .012, ink, 2, false);
    if (t === 4) { const fl = add(hg, new THREE.CylinderGeometry(.41, .48, .32, 28, 1, true), (() => { const m = top.clone(); m.side = THREE.DoubleSide; return m; })(), 0, .3 - HY, 0); fl.castShadow = false; }
  } else if (t === 1) { // 셔츠: 깃 · 단추 줄
    bodyPatch(hg, (x, y) => y > .86 && y < .97 && Math.abs(x) > .02 && Math.abs(x) < .16, dark, .016);
    bodyPatch(hg, (x, y) => Math.abs(x) < .016 && y > .42 && y < .86, dark, .014);
    for (const y of [.8, .7, .6, .5]) ball(hg, 0, y - HY, bz(0, y) + .016, .016, .016, .01, white, 2, false);
  } else if (t === 2) { // 니트: 둥근 목 · 가슴 줄무늬
    const nk = add(hg, new THREE.TorusGeometry(.2, .035, 8, 24), dark, 0, .93 - HY, .02); nk.rotation.x = Math.PI / 2;
    bodyPatch(hg, (x, y) => y > .66 && y < .71, acc, .012);
  } else if (t === 3) { // 후드티: 모자 · 끈 · 주머니
    const hd = add(hg, new THREE.TorusGeometry(.26, .09, 8, 20, Math.PI), top, 0, .97 - HY, -.06); hd.rotation.set(Math.PI / 2, 0, Math.PI); ball(hg, 0, 1.02 - HY, -.3, .3, .18, .12, top, 3, true);
    for (const sx of [-.07, .07]) { const s = cylinder(hg, sx, .82 - HY, bz(sx, .82) + .02, .012, .012, .16, white, 6); s.castShadow = false; }
    bodyPatch(hg, (x, y) => y > .38 && y < .53 && Math.abs(x) < .19 + (.53 - y) * .2, dark, .014);
  }
  // 머리 모양
  const hs = o.hs;
  if (hs !== 5) {
    const g = hairGeo(hs), hm = add(hg, g, hair, 0, 1.43 - HY, -.005); hm.scale.set(.695, .645, .645); hull(hm, g); hm.castShadow = false;
    if (hs === 0) for (const dx of [-.2, 0, .2]) { const f = ball(hg, dx, 1.68 - HY, .53, .17, .08, .1, hair, 2, false); f.rotation.z = dx * -.8; }
    if (hs === 1) { const f = ball(hg, -.16, 1.7 - HY, .5, .34, .11, .16, hair, 3, false); f.rotation.z = .38; }
    if (hs === 2) { ball(hg, 0, 1.1 - HY, -.36, .6, .6, .3, hair, 3); for (const sx of [-1, 1]) ball(hg, sx * .58, 1.15 - HY, .1, .13, .38, .2, hair, 3); }
    if (hs === 3) { for (const sx of [-1, 1]) ball(hg, sx * .6, 1.26 - HY, .08, .14, .24, .32, hair, 3); ball(hg, 0, 1.69 - HY, .52, .46, .1, .13, hair, 2, false); }
    if (hs === 4) { ball(hg, 0, 1.62 - HY, -.62, .13, .13, .13, acc, 2, false); ball(hg, 0, 1.32 - HY, -.72, .14, .32, .14, hair, 3); }
    if (hs === 6) for (let i = 0; i < 18; i++) { const a = i * 2.39996, el = .25 + (i / 18) * 1.1, x = Math.cos(a) * Math.sin(el) * .68, z = Math.sin(a) * Math.sin(el) * .64, y = Math.cos(el) * .64; if (z > .45 && y < .3) continue; ball(hg, x, 1.43 - HY + y, z - .01, .15, .15, .15, hair, 2, false); }
  }
  // 소품
  const a = o.a;
  if (a & 1) { for (const sx of [-1, 1]) { add(hg, new THREE.TorusGeometry(.17, .022, 8, 24), ink, sx * .24, 1.385 - HY, .625); const arm = box(hg, sx * .45, 1.39 - HY, .46, .022, .022, .32, ink); arm.rotation.y = sx * .5; } box(hg, 0, 1.4 - HY, .63, .12, .022, .022, ink); }
  if (a & 2) { const sg = fl("#141414"); for (const sx of [-1, 1]) { const l = ball(hg, sx * .24, 1.39 - HY, .63, .18, .13, .03, sg, 3, false); l.rotation.z = sx * .1; } box(hg, 0, 1.42 - HY, .64, .14, .03, .03, ink); }
  if (a & 4) { const cap = add(hg, new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), acc, 0, 1.6 - HY, -.02); cap.scale.set(.72, .5, .7); const br = box(hg, 0, 1.62 - HY, .62, .62, .04, .36, acc); br.rotation.x = .12; ball(hg, 0, 2.1 - HY, -.02, .05, .03, .05, acc, 2, false); }
  else if (a & 8) { ball(hg, 0, 1.66 - HY, -.02, .71, .47, .67, acc, 3); const f = add(hg, new THREE.TorusGeometry(.66, .07, 8, 30), acc, 0, 1.55 - HY, -.02); f.rotation.x = Math.PI / 2; f.scale.set(1.04, .98, 1); ball(hg, 0, 2.12 - HY, -.02, .1, .1, .1, white, 2, false); }
  if (a & 16) { const hp = fl("#2b2b30"), hp2 = fl("#c9a45c"); add(hg, new THREE.TorusGeometry(.72, .045, 8, 28, Math.PI), hp, 0, 1.42 - HY, 0); for (const sx of [-1, 1]) { const cu = add(hg, new THREE.CylinderGeometry(.2, .2, .13, 16), hp, sx * .7, 1.4 - HY, 0); cu.rotation.z = Math.PI / 2; const pd = add(hg, new THREE.CylinderGeometry(.16, .16, .04, 16), hp2, sx * .77, 1.4 - HY, 0); pd.rotation.z = Math.PI / 2; } }
  else if (a & 32) { for (const sx of [-1, 1]) { ball(hg, sx * .7, 1.37 - HY, .05, .06, .06, .06, fl("#ffffff"), 2, false); cylinder(hg, sx * .7, 1.26 - HY, .07, .018, .018, .2, fl("#ffffff"), 6); } }
  if (a & 64) { // 회원증 목걸이
    const strap = fl(q16(o.k === "#000000" ? "#2f5a8a" : "#2f5a8a"));
    for (const sx of [-1, 1]) add(hg, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[sx * .16, .95], [sx * .1, .82], [sx * .03, .7]].map(([x, y]) => new THREE.Vector3(x, y - HY, bz(x, y) + .03))), 10, .012, 5, false), strap, 0, 0, 0);
    const cd = box(hg, 0, .62 - HY, bz(0, .62) + .035, .17, .21, .012, fl("#f4f2ec")); cd.castShadow = false; box(hg, 0, .69 - HY, bz(0, .69) + .042, .17, .05, .005, fl("#c9a55f")); ball(hg, 0, .6 - HY, bz(0, .6) + .044, .035, .04, .005, fl("#2b3547"), 2, false);
  }
}

// ---------- 아바타 자세: 걷기 · 인사 · 바둑(sit 4) · 방석(sit 1) · 소파·벤치(sit 5) · 손에 든 것(컵 · 기보책) ----------
const PROP = { cup: new THREE.CylinderGeometry(.075, .058, .17, 14), top: new THREE.CircleGeometry(.068, 14), book: new THREE.BoxGeometry(.3, .38, .07) };
const PROP_M = { cup: new THREE.MeshStandardMaterial({ color: "#f4f1ea", roughness: .6 }), water: new THREE.MeshBasicMaterial({ color: "#bfe3f2" }), coffee: new THREE.MeshBasicMaterial({ color: "#8a5a32" }), book: new THREE.MeshStandardMaterial({ color: "#2f4a3a", roughness: .7 }), strip: new THREE.MeshStandardMaterial({ color: "#c9a55f", roughness: .4, metalness: .5 }) };
function heldProp(av) {
  const u = av.userData, h = u.hold | 0; if (u.propK === h) return; u.propK = h;
  if (u.prop) { u.prop.parent && u.prop.parent.remove(u.prop); u.prop = null; }
  if (!h) return; const a = u.arms[1], g = new THREE.Group(); g.position.set(0, -.62, .06); a.add(g); u.prop = g;
  if (h === 1 || h === 2) { const c = new THREE.Mesh(PROP.cup, PROP_M.cup); g.add(c); const tp = new THREE.Mesh(PROP.top, h === 2 ? PROP_M.coffee : PROP_M.water); tp.rotation.x = -Math.PI / 2; tp.position.y = .07; g.add(tp); }
  else { const b = new THREE.Mesh(PROP.book, PROP_M.book); b.rotation.x = .2; g.add(b); const s = new THREE.Mesh(new THREE.BoxGeometry(.31, .05, .072), PROP_M.strip); s.position.y = .1; s.rotation.x = .2; g.add(s); }
}
function pose(av, now, t) {
  const u = av.userData; let w = 0, bow = 0, hop = 0;
  if (u.gUntil && now < u.gUntil) {
    const p = 1 - (u.gUntil - now) / (u.gDur || GDUR);
    w = Math.min(1, Math.min(p, 1 - p) * 5);
    if (u.gType === "greet") bow = Math.sin(p * Math.PI); else hop = Math.sin(p * Math.PI * 2) * .5 + .5;
  }
  heldProp(av);
  const sit = u.sit || 0, sitW = sit && !w ? 1 : 0, chair = sit === 4 || sit === 5, sofa = sit === 5, reach = sit === 4 && u.reach && now < u.reach ? Math.sin((1 - (u.reach - now) / 750) * Math.PI) : 0;
  const hold = u.hold | 0, sipC = (t + (u.bo || 0)) % 7, sip = (hold === 1 || hold === 2) && sipC < 1.4 ? Math.sin(sipC / 1.4 * Math.PI) : 0; // 가끔 한 모금
  for (const a of u.arms) {
    const sx = a.userData.sx, holding = hold && sx > 0 && !w && !reach;
    if (w > 0 || sitW || holding) {
      if (holding) { if (hold === 3) tmpV.set(.16, .2, .42); else tmpV.set(.2 - .18 * sip, .22 + .46 * sip, .5 + .02 * sip); } // 컵은 가슴 앞에서 입으로, 책은 품에
      else if (sitW) {
        if (sit === 4) { if (sx > 0 && reach > 0) tmpV.set(.05 - .05 * reach, .12 + .1 * reach, .5 + .42 * reach); else tmpV.set(sx * .16, .04, .44); }
        else if (sofa) tmpV.set(sx * .2, -.08, .36); // 소파: 무릎 위에 손
        else tmpV.set(sx * .16, -.02, .34);
      }
      else if (u.gType === "greet") tmpV.set(sx * .04, .14, .38); else tmpV.set(sx * .3, .3, .5);
      tmpD.copy(tmpV).sub(a.position).normalize();
      tmpQ.setFromUnitVectors(DOWN, tmpD); a.quaternion.copy(a.userData.rest).slerp(tmpQ, holding ? 1 : (sitW || w));
    } else a.quaternion.copy(a.userData.rest);
    const hd = a.userData.hand; if (hd) { const o = w > 0 && u.gType === "greet" ? w : 0; hd.scale.set(.095 * (1 - .45 * o), .105 * (1 + .9 * o), .095 * (1 + .1 * o)); if (o > 0) { qH.copy(a.quaternion).invert().multiply(TILT); hd.quaternion.identity().slerp(qH, o); } else hd.quaternion.identity(); }
  }
  const thk = sit === 4 && !reach ? Math.sin(t * .5 + (u.bo || 0)) : 0;
  u.body.rotation.x = .42 * bow + (sit === 4 ? .16 + .03 * thk + .12 * reach : sofa ? -.1 : sit === 1 ? .1 : 0) - .08 * sip;
  u.body.rotation.z = sit === 4 ? .03 * Math.sin(t * .23 + (u.bo || 0)) : 0;
  u.body.position.y = HY + .12 * hop + (chair ? .2 : sit === 1 ? -.17 : 0);
  {
    const bo = u.bo === undefined ? (u.bo = Math.random() * 9) : u.bo, bl = (t + bo) % 4.3 >= .12 ? 1 : .12, op = (sit === 4 || sit === 1 ? .7 : 1) * bl;
    if (!u.eyeX) for (const { e, h } of u.eyes) { e.scale.set(EYE_W * (u.ew || 1), Math.max(.014, EYE_H * (u.eh || 1) * op), .04); h.visible = op > .5; }
    u.mouth.scale.set(.06 * (u.mw || 1), .026 * (u.mh || 1), .02);
  }
  u.walkS += (u.walk - u.walkS) * .25;
  const ph = t * 11 * (u.pace || 1), sw = Math.sin(ph) * .7 * u.walkS;
  u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw;
  for (const l of u.legs) {
    const lx = l.userData.sx;
    l.userData.thigh.visible = l.userData.shin.visible = chair; l.userData.foot.position.set(0, chair ? -.3 : 0, chair ? .5 : .06);
    if (sit === 1) { l.position.set(lx * .12, .15, .34); l.rotation.set(0, 0, -lx * 1.45); l.scale.set(1, 1.55, 1); }
    else { l.scale.set(1, 1, 1); l.rotation.z = 0; l.position.x = lx * .15; l.position.y = chair ? .5 : .2; l.position.z = chair ? .04 : 0; if (chair) l.rotation.x = 0; }
  }
  if (!w && !sit) { const sg = u.walkS > .05 ? sw * .5 : 0; u.arms[0].rotation.x = -sg; if (!hold) u.arms[1].rotation.x = sg; }
  if (u.tag) u.tag.position.y = (chair ? 2.62 : sit === 1 ? 2.25 : 2.42) + (u.outfit && (u.outfit.a & 12) ? .12 : 0);
}

// ---------- 나 · 다른 방문객 (Trystero: 브라우저끼리 직접 연결, 서버 없음) ----------
const namesA = ["고요한", "느긋한", "다정한", "맑은", "따뜻한", "산뜻한", "푸른", "깊은"], namesB = ["학", "바둑돌", "구름", "소나무", "달빛", "솔바람", "기러기", "오동"];
const pick = a => a[Math.floor(Math.random() * a.length)], nickname = () => pick(namesA) + " " + pick(namesB);
const MAX_VISITORS = 100;
const spawn = new THREE.Vector3((Math.random() - .5) * 10, 0, 42 + Math.random() * 2.5);
const NAME_KEY = "muryang-name", cleanName = n => String(n || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 12); // 무량사와 같은 이름을 이어 쓴다(같은 주소일 때)
let localName = ""; try { localName = cleanName(localStorage.getItem(NAME_KEY)); } catch (e) {} if (!localName) localName = nickname();
const localAvatar = makeAvatar(localName, true); world.add(localAvatar); localAvatar.position.copy(spawn); localAvatar.rotation.y = Math.PI;
$("#visitor-name").textContent = "방문객 · " + localName;
const nameOK = n => typeof n === "string" && n.length >= 1 && n.length <= 12 && cleanName(n) === n;
const okNum = (v, lim) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= lim;
const remoteAvatars = new Map(), lastAct = new Map(), peerOutfit = new Map();
let outfitSend = null, ixSend = null, currentGesture = null, room = null, gestureSend = null, moveSend = null, presenceSend = null, goSendFn = null;
const rawRoom = new URLSearchParams(location.search).get("room") || "";
const isPrivate = /^[a-z0-9-]{3,32}$/.test(rawRoom), currentRoomId = isPrivate ? rawRoom : "muryanggiwon-open"; // 무량사와 다른 방(서버)
let roomNumber = 0; const peers = new Set();
function showToast(message) { const el = $("#toast"); el.textContent = message; el.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove("show"), 2800); }
function updateCount() {
  $("#visitor-count").textContent = `${peers.size + 1} / ${MAX_VISITORS}명`;
  $("#top-chip").textContent = "👥 " + (peers.size + 1) + "명 · " + localName;
  $("#room-label").textContent = (isPrivate ? "친구 기원" : "무량기원") + (roomNumber ? ` · ${roomNumber + 1}관` : "");
}
function setLocalName(n) { n = cleanName(n); if (!n) return; localName = n; try { localStorage.setItem(NAME_KEY, n); } catch (e) {} $("#visitor-name").textContent = "방문객 · " + n; localAvatar.userData.displayName = n; updateCount(); try { presenceSend && presenceSend(myState()); } catch (e) {} for (const T of TABLES) { const G = T.game; if (G && G.host === selfId) { for (const c of [1, 2]) if (G.p[c] && G.p[c].id === selfId) G.p[c].name = n; goBroadcast(T); } } showToast("이름을 \"" + n + "\"(으)로 바꿨습니다."); }
{ const dlg = $("#name-dialog"), inp = $("#name-input"), open = () => { inp.value = localName; dlg.showModal(); setTimeout(() => inp.select(), 50); };
  $("#top-chip").addEventListener("click", open); $("#visitor-name").addEventListener("click", open); $("#visitor-name").title = "눌러서 이름 바꾸기";
  $("#name-cancel").addEventListener("click", () => dlg.close()); $("#name-random").addEventListener("click", () => { inp.value = nickname(); });
  $("#name-form").addEventListener("submit", e => { e.preventDefault(); setLocalName(inp.value); dlg.close(); }); }
let sitting = null;
const myState = () => ({ p: 0, name: localName, x: +localAvatar.position.x.toFixed(2), y: +localAvatar.position.y.toFixed(2), s: localAvatar.userData.sit || 0, q: sitting ? sitting.id : -1, h: localAvatar.userData.hold | 0, mb: member ? 1 : 0, z: +localAvatar.position.z.toFixed(2), r: +Math.atan2(Math.sin(localAvatar.rotation.y), Math.cos(localAvatar.rotation.y)).toFixed(2) });
const cooldown = (peerId, key, ms) => { const k = peerId + key, n = performance.now(); if (n - (lastAct.get(k) || 0) < ms) return false; lastAct.set(k, n); return true; };
const applyPeerState = (av, d) => { const u = av.userData; u.tx = d.x; u.tz = d.z; u.ty = okNum(d.y, 20) ? d.y : undefined; u.sit = d.s === 1 || d.s === 4 || d.s === 5 ? d.s : 0; u.hold = [1, 2, 3].includes(d.h) ? d.h : 0; setTag(av, d.mb ? d.name : null, "member"); u.q = Number.isInteger(d.q) && d.q >= 0 && d.q < seats.length ? d.q : -1; u.tr = okNum(d.r, 10) ? d.r : 0; u.tp = 0; };
async function makeRoom(roomId) {
  const joinedAt = Date.now();
  const joinRoom = await trysteroReady;
  if (!joinRoom) { showToast("실시간 연결을 불러오지 못했습니다. 인공지능과 대국할 수 있어요."); updateCount(); return; }
  try { room = joinRoom({ appId: "org.muryanggiwon.v1" }, roomId); } catch (err) { console.warn(err); showToast("실시간 연결을 시작하지 못했습니다. 인공지능과 대국할 수 있어요."); updateCount(); return; }
  const act = n => { const a = room.makeAction(n); return [(d, t) => Promise.resolve(a.send(d, t ? { target: t } : undefined)).catch(() => {}), fn => { a.onMessage = fn; }]; };
  const [sendOutfit, onOutfit] = act("outfit"); outfitSend = sendOutfit;
  onOutfit((d, { peerId }) => { const o = cleanOutfit(d); if (!o || !cooldown(peerId, "o", 500)) return; peerOutfit.set(peerId, o); const av = remoteAvatars.get(peerId); if (av) setOutfit(av, o); });
  const [sendPresence, onPresence] = act("presence"), [sendGesture, onGesture] = act("gesture"), [sendMove, onMove] = act("move"), [sendIx, onIx] = act("ix"), [sendGo, onGo] = act("go");
  presenceSend = sendPresence; gestureSend = sendGesture; moveSend = sendMove; ixSend = sendIx; goSendFn = sendGo;
  onPresence((d, { peerId }) => {
    if (!d || !nameOK(d.name) || !okNum(d.x, 1200) || !okNum(d.z, 1200)) return;
    let av = remoteAvatars.get(peerId);
    if (!av) { av = makeAvatar(d.name); av.position.set(d.x, groundY(d.x, d.z), d.z); world.add(av); remoteAvatars.set(peerId, av); setOutfit(av, peerOutfit.get(peerId) || defaultOutfit()); }
    av.userData.displayName = d.name; applyPeerState(av, d); peers.add(peerId); updateCount();
  });
  onMove((d, { peerId }) => { const av = remoteAvatars.get(peerId); if (!av || !d || !okNum(d.x, 1200) || !okNum(d.z, 1200) || !cooldown(peerId, "mv", 40)) return; applyPeerState(av, d); });
  onGesture((d, { peerId }) => {
    if (!d || !["greet", "warm", "place"].includes(d.type) || !cooldown(peerId, "g" + d.type, d.type === "place" ? 250 : 1500)) return;
    const av = remoteAvatars.get(peerId); if (!av) return;
    if (d.type === "place") { av.userData.reach = performance.now() + 750; return; }
    av.userData.gType = d.type; av.userData.gDur = GDUR; av.userData.gUntil = performance.now() + GDUR;
  });
  onIx((d, { peerId }) => {
    if (!d || !["greet", "say", "invite"].includes(d.type) || !cooldown(peerId, "ix", 700)) return;
    const av = remoteAvatars.get(peerId); if (!av) return; const nm = av.userData.displayName || "방문객";
    if (d.type === "say") { if (Number.isInteger(d.i) && IX_SAY[d.i]) { bubble(av, IX_SAY[d.i]); av.userData.gType = "greet"; av.userData.gDur = GDUR; av.userData.gUntil = performance.now() + GDUR; } return; }
    if (d.type === "invite") { bubble(av, "♟ 한 판 두실래요?", 5000); showToast(nm + "님이 한 판 청합니다. 비어 있는 대국석에 마주 앉아 보세요."); return; }
    av.userData.gType = "greet"; av.userData.gDur = GDUR; av.userData.gUntil = performance.now() + GDUR; bubble(av, "🙇", 2500); showToast(nm + "님이 인사합니다.");
  });
  onGo((d, { peerId }) => { if (d && d.t === "arch") { if (cooldown(peerId, "arch", 4000)) { const n = mergeArchive(d.list); if (n && kiboPanel.isOpen) kiboPanel.showList(kiboPanel.tab); } return; } try { goRecv(d, peerId); } catch (e) { console.warn("바둑 신호를 처리하지 못했습니다", e); } });
  room.onPeerJoin = peerId => {
    peers.add(peerId); updateCount(); sendPresence(myState(), peerId); try { if (myOutfit) outfitSend(myOutfit, peerId); } catch (e) {}
    for (const ms of [300, 2500]) setTimeout(() => { for (const T of TABLES) if (T.game && T.game.host === selfId) goBroadcast(T, peerId); }, ms);
    setTimeout(() => { try { goSendFn && goSendFn({ t: "arch", list: shareList() }, peerId); } catch (e) {} }, 3500); // 기원 기보 나누기 // 새로 온 방문객에게 진행 중인 대국을 알려 준다
    if (Date.now() - joinedAt < 7000 && peers.size >= MAX_VISITORS && roomNumber < 5) {
      const oldRoom = room; roomNumber += 1; showToast("기원이 붐벼 다음 관으로 안내합니다.");
      Promise.resolve(oldRoom.leave()).catch(() => {}); peers.clear(); remoteAvatars.forEach(a => world.remove(a)); remoteAvatars.clear();
      makeRoom(currentRoomId + "-hall-" + (roomNumber + 1));
    }
  };
  room.onPeerLeave = peerId => { peers.delete(peerId); const av = remoteAvatars.get(peerId); if (av) { world.remove(av); remoteAvatars.delete(peerId); } goPeerLeft(peerId); updateCount(); };
  setTimeout(() => { try { sendPresence(myState()); } catch (e) {} try { outfitSend(myOutfit); } catch (e) {} }, 1400);
  updateCount();
}
makeRoom(currentRoomId).catch(err => console.warn(err));

function gesture(type, quiet = false) {
  const now = performance.now();
  if (type === "place") { localAvatar.userData.reach = now + 750; if (gestureSend) gestureSend({ type }); return; }
  if (currentGesture && currentGesture.until > now) return;
  currentGesture = { type, until: now + GDUR + 300 }; localAvatar.userData.gType = type; localAvatar.userData.gDur = GDUR; localAvatar.userData.gUntil = now + GDUR;
  if (gestureSend && !quiet) gestureSend({ type });
  if (!quiet) showToast(type === "greet" ? "고개 숙여 인사했습니다." : "반가운 마음을 전했습니다.");
}
const IX_SAY = ["안녕하세요", "한 수 부탁드립니다", "잘 두셨습니다", "고맙습니다", "한 판 더 어떠세요?", "수고하셨습니다"];
function bubble(av, text, ms = 4500) {
  if (av.userData.bub) { av.remove(av.userData.bub); av.userData.bub.material.map.dispose(); av.userData.bub.material.dispose(); }
  const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d");
  x.fillStyle = "rgba(250,248,242,.95)"; x.beginPath(); x.roundRect ? x.roundRect(8, 8, 496, 100, 40) : x.rect(8, 8, 496, 100); x.fill();
  x.fillStyle = "#2b2c2e"; x.font = "600 50px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); sp.scale.set(2.8, .7, 1); sp.position.set(0, 3.15, 0); sp.renderOrder = 10; av.add(sp); av.userData.bub = sp;
  setTimeout(() => { if (av.userData.bub === sp) { av.remove(sp); t.dispose(); sp.material.dispose(); av.userData.bub = null; } }, ms);
}
const ixCard = $("#ix-card"); let ixTarget = null;
const peerOf = av => { for (const [id, a] of remoteAvatars) if (a === av) return id; return null; };
function openIx(av) { ixTarget = av ? peerOf(av) : null; $("#ix-title").textContent = av ? (av.userData.displayName || "방문객") + "님께" : "한마디 남기기"; ixCard.querySelectorAll("[data-ix-only]").forEach(b => { b.hidden = !av; }); ixCard.hidden = false; }
const faceTo = av => { if (av) localAvatar.rotation.y = Math.atan2(av.position.x - localAvatar.position.x, av.position.z - localAvatar.position.z); };
ixCard.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return; const k = b.dataset.ix, av = ixTarget && remoteAvatars.get(ixTarget);
  if (k === "close") { ixCard.hidden = true; return; }
  if (k === "greet" && ixTarget) { if (!sitting) faceTo(av); gesture("greet", true); ixSend && ixSend({ type: "greet" }, ixTarget); showToast("인사했습니다."); }
  else if (k === "invite" && ixTarget) { if (!sitting) faceTo(av); bubble(localAvatar, "♟ 한 판 두실래요?", 5000); ixSend && ixSend({ type: "invite" }, ixTarget); showToast("한 판 청했습니다. 비어 있는 대국석에 앉아 「방문객 기다리기」로 시작해 보세요."); }
  else if (k === "say") { const i = Number(b.dataset.i); if (IX_SAY[i]) { if (!sitting) faceTo(av); gesture("greet", true); bubble(localAvatar, IX_SAY[i]); ixSend && ixSend({ type: "say", i }); } }
  ixCard.hidden = true;
});
$("#talk-button").addEventListener("click", () => openIx(null));
$("#greet-button").addEventListener("click", () => gesture("greet"));
$("#warm-button").addEventListener("click", () => gesture("warm"));
// ---------- 카메라와 캐릭터 사이를 가리는 것(벽·천장·기둥·나무·탑 …)은 불투명도 20%까지 부드럽게 옅어진다 ----------
const FADE_MIN = .2, FADE_HOLD = 260, fadeStates = new Map(), fadeCache = new WeakMap(), fadeKeep = [], fRay = new THREE.Raycaster();
const fOff = [[0, 0], [.55, 0], [-.55, 0], [0, .6], [0, -.9], [.3, -.45], [-.3, -.45], [.3, .3], [-.3, .3], [.7, -.6], [-.7, -.6]], fR = new THREE.Vector3(), fU = new THREE.Vector3(), fZ = new THREE.Vector3(), fP = new THREE.Vector3(), fD = new THREE.Vector3();
let fadeList = null, fadeTick = 0, fadeBoot = 0; const fadePre = [], fadeSph = [], fadeCand = [], fS = new THREE.Vector3(), fQ = new THREE.Vector3(), fC = new THREE.Vector3();
const fadeUnder = (o, r) => { for (let q = o; q; q = q.parent) if (q === r) return true; return false; };
const fadeClone = m => { const c = m.clone(); c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; c.transparent = true; return c; }; // 질감 패치(onBeforeCompile)까지 그대로 물려준다
function buildFadeList() { // 가려질 수 있는 단단한 물체만 한 번 추려 둔다 (땅·풀·안개·작은 소품 제외)
  world.updateMatrixWorld(true);
  const list = [], bb = new THREE.Box3(), sz = new THREE.Vector3(), seen = new Set(), under = (o, r) => { for (let q = o; q; q = q.parent) if (q === r) return true; return false; };
  world.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.noFade || !o.material || !o.geometry || under(o, localAvatar)) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material]; if (ms.some(m => m.isShaderMaterial)) return;
    const pos = o.geometry.attributes.position; if (!pos || pos.count > 20000) return;
    bb.setFromObject(o); bb.getSize(sz); if (Math.max(sz.x, sz.z) > 45) return;
    if (ms.some(m => m.transparent && m.opacity < .7)) return; // 후광·불빛 번짐은 제외
    const hi = bb.min.y > .8; // 현판 · 처마등 · 창 · 들보처럼 높이 달린 것은 작아도 포함
    if (!o.castShadow && !hi) return;
    if (!(sz.y >= .7 || hi || (sz.x * sz.z >= 40 && bb.min.y > 2.5))) return; // 키 큰 것, 또는 높이 달린 넓은 판(천장·지붕)
    list.push(o); { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); fadeSph.push(new THREE.Sphere().copy(g.boundingSphere).applyMatrix4(o.matrixWorld)); } // 대략적인 위치(구)를 미리 적어 둔다
    const key = ms.map(m => m.uuid).join() + (o.receiveShadow ? "r" : "") + (o.geometry.attributes.color ? "c" : ""); if (!seen.has(key)) { seen.add(key); fadePre.push(o); }
  });
  fadeList = list;
}
function prewarmFade() { // 처음 옅어질 때 셰이더 컴파일로 끊기지 않도록, 반투명 버전을 미리 몇 개씩 컴파일해 둔다
  if (!fadePre.length) return; const tmp = [];
  try {
    for (let i = 0; i < 3 && fadePre.length; i++) {
      const o = fadePre.pop(), arr = Array.isArray(o.material), cl = (arr ? o.material : [o.material]).map(fadeClone); fadeKeep.push(...cl);
      const d = new THREE.Mesh(o.geometry, arr ? cl : cl[0]); d.receiveShadow = o.receiveShadow; d.castShadow = false; d.frustumCulled = false; d.position.set(0, -500, 0); scene.add(d); tmp.push(d);
    }
    renderer.compile(scene, camera);
  } catch (e) { fadePre.length = 0; }
  for (const d of tmp) scene.remove(d);
}
function startFade(o) {
  let c = fadeCache.get(o); if (!c) { const orig = o.material, arr = Array.isArray(orig), cl = (arr ? orig : [orig]).map(fadeClone); c = { orig, arr, cl, b: cl.map(m => m.opacity), w: cl.map(m => m.depthWrite) }; fadeCache.set(o, c); }
  const s = { c, a: 1, seen: 0, dc: 9 }; o.material = c.arr ? c.cl : c.cl[0]; fadeStates.set(o, s); return s;
}
function endFade(o, s) { o.material = s.c.orig; fadeStates.delete(o); }
function updateFade(dt) {
  if (!fadeList) { if (++fadeBoot > 50) buildFadeList(); return; }
  prewarmFade();
  const tNow = performance.now(), poi = false, on = !fp && walking && !flying; // 시작 화면 · 장소 소개에서는 건물을 투명하게 만들지 않는다 // 걸을 땐 캐릭터가, 장소 둘러보기·소개 시점에선 보고 있는 지점이 대상 (1인칭·걸을 때의 공중 이동은 제외)
  if (on && (fadeTick++ % (COARSE ? 3 : 2)) === 0) {
    const p = localAvatar.position, c = camera.position; camera.matrixWorld.extractBasis(fR, fU, fZ);
    if (poi) fC.copy(controls.target); else fC.set(p.x, p.y + 1.3, p.z); fS.subVectors(fC, c); const L2 = fS.lengthSq() || 1, kh = poi && curViewKey ? hallOf(curViewKey) : null, skipRoot = kh ? kh.g : null; fadeCand.length = 0; // 1차: 카메라~캐릭터 선분 가까이 있는 것만 추린다 (정밀 검사는 그 몇 개에만)
    for (let i = 0; i < fadeSph.length; i++) { const sp = fadeSph[i]; fQ.subVectors(sp.center, c); const t = Math.max(0, Math.min(1, fQ.dot(fS) / L2)); fQ.copy(fS).multiplyScalar(t).add(c); const r = sp.radius + 1.2; if (fQ.distanceToSquared(sp.center) < r * r) fadeCand.push(fadeList[i]); }
    if (fadeCand.length) for (const [ox, oy] of fOff) { // 캐릭터 가슴 둘레 다섯 군데로 쏘아, 몸이 조금이라도 가려지면 옅게
      fP.set(fC.x + fR.x * ox + fU.x * oy, fC.y + fR.y * ox + fU.y * oy, fC.z + fR.z * ox + fU.z * oy);
      fD.subVectors(fP, c); const dist = fD.length(); if (dist < (poi ? 9 : 1.2)) continue; fD.divideScalar(dist);
      fRay.set(c, fD); fRay.far = dist - (poi ? 8 : .35); // 장소 보기에서는 대상 8m 앞까지만 (목적지 건물 자체는 옅게 하지 않는다)
      for (const h of fRay.intersectObjects(fadeCand, false)) { if (skipRoot && fadeUnder(h.object, skipRoot)) continue; let s = fadeStates.get(h.object); if (!s) s = startFade(h.object); const dc = Math.max(0, dist - h.distance); s.dc = s.seen === tNow ? Math.min(s.dc, dc) : dc; s.seen = tNow; }
    }
  }
  const kOut = 1 - Math.exp(-dt * 8), kIn = 1 - Math.exp(-dt * 4); // 옅어질 땐 0.4초 안팎, 되돌아올 땐 조금 더 천천히
  for (const [o, s] of fadeStates) {
    const want = on && tNow - s.seen < FADE_HOLD ? .5 * Math.min(1, Math.max(0, s.dc) / 7) : 1; // 기본 50%, 캐릭터와 7m 안으로 가까워질수록 0%
    s.a += (want - s.a) * (want < s.a ? kOut : kIn);
    if (want === 1 && s.a > .985) { for (let i = 0; i < s.c.cl.length; i++) { s.c.cl[i].opacity = s.c.b[i]; s.c.cl[i].depthWrite = s.c.w[i]; } endFade(o, s); continue; }
    for (let i = 0; i < s.c.cl.length; i++) { const m = s.c.cl[i]; m.opacity = s.c.b[i] * s.a; m.depthWrite = s.c.w[i] && s.a > .85; }
  }
}


// ---------- 장소 안내 · 카메라 이동 ----------
const views = {
  intro: { title: "무량기원", desc: "바둑의 깊이는 헤아릴 수 없다. 전문성과 전통이 함께하는 가상의 바둑 기관입니다. 대국장에서 인공지능이나 다른 방문객과 실제로 한 판 둘 수 있습니다.", pos: COARSE ? [-78, 52, 112] : [-46, 30, 70], target: [0, 7, -6] },
  front: { title: "정문 · 광장", desc: "밝은 석재와 유리, 짙은 금속으로 지은 무량기원 본관입니다. 넓은 계단을 오르면 캐노피 아래 정문이 있고, 왼쪽에는 기관명 입간판, 오른쪽에는 조형물 「흑백」이 있습니다.", pos: [24, 9, 40], target: [0, 8, 0], enter: [0, 20, Math.PI] },
  park: { title: "야외 대국석", desc: "느티나무 그늘 아래 돌 바둑판입니다. 공원에서 두던 그 바둑처럼, 누구나 앉아 한 판 둘 수 있습니다.", pos: [-21.5, 6.2, 1.5], target: [-29, .8, 19], enter: [-25.2, 17, -Math.PI / 2] },
  lobby: { title: "안내 · 접견실", desc: "방문객 안내와 접수, 손님맞이를 하는 로비입니다. 안내 데스크 뒤 로고 벽을 돌아가면 중앙 대국장이 이어집니다.", pos: [IX + 9, 5.2, 21], target: [IX, 1.8, 9], enter: [IX, 16.2, Math.PI], inside: true },
  hall: { title: "중앙 대국장", desc: "열두 개의 대국석이 놓인 무량기원의 핵심 공간입니다. 빈 자리에 앉아(E) 인공지능과 두거나, 맞은편에 다른 방문객이 앉기를 기다려 함께 둘 수 있습니다. 뒷벽 전광판에는 지금 진행 중인 대국이 중계됩니다.", pos: [IX + 14, 5.6, 5.5], target: [IX, 1, -8], enter: [IX, -3.4, Math.PI], inside: true },
  lab: { title: "연구 · 분석실", desc: "기보 분석과 복기, 바둑 연구를 하는 공간입니다. 전통 바둑판 앞 방석에 앉아 둘 수 있고, 벽면에는 기보 서가와 분석 화면이 있습니다.", pos: [IX + 14.2, 4.6, 8.4], target: [IX + 21, 1, 15], enter: [IX + 20.5, 9.2, 0], inside: true },
  tour: { title: "2층 대회실", desc: "무대 위 대회 대국석 두 곳의 대국이 뒷벽 대형 전광판과 1층 대국장 전광판에 실시간으로 중계됩니다. 관객석에 앉아(E) 관전할 수 있어요. 로비 왼편 엘리베이터로 올라옵니다.", pos: [IX2 + 13, 6.2, 5], target: [IX2, 1.2, -15], enter: [IX2, 2.2, Math.PI], inside: true },
  room: { title: "2층 대국실", desc: "복도 양옆 네 칸의 조용한 대국실입니다. 전통 바둑판 앞 방석에 앉아 두는 곳이에요.", pos: [IX2 - 5, 5.4, 21], target: [IX2 - 20, .8, 9], enter: [IX2 - 6, 17.6, -Math.PI / 2], inside: true },
  edu: { title: "교육원", desc: "입문자 강좌와 단급별 교육을 하는 공간입니다. 9줄 바둑판이 놓여 있어 처음 배우는 분도 부담 없이 한 판 둘 수 있습니다.", pos: [IX - 14.2, 4.6, 8.4], target: [IX - 21, 1, 15], enter: [IX - 20.5, 8.6, 0], inside: true }
};
let flying = false, walking = false, flyId = 0, dest = null, curViewKey = null;
const hallOf = k => halls.find(h => h.key === k);
const hideHero = () => { $(".hero-copy").style.display = "none"; };
function flyTo(pos, tg, cb, maxMs = 2000) {
  flying = true; controls.autoRotate = false; const id = ++flyId;
  const from = camera.position.clone(), ft = controls.target.clone(), start = performance.now(), far = from.distanceTo(pos) > 150;
  const dur = far ? 10 : Math.max(900, Math.min(maxMs, 800 + from.distanceTo(pos) * 14 + ft.distanceTo(tg) * 6));
  function move(now) {
    if (id !== flyId) return;
    const t = Math.max(0, Math.min(1, (now - start) / dur)), e = t * t * t * (t * (t * 6 - 15) + 10);
    camera.position.lerpVectors(from, pos, e); controls.target.lerpVectors(ft, tg, e);
    if (t < 1) requestAnimationFrame(move); else { flying = false; if (cb) cb(); }
  }
  requestAnimationFrame(move);
}
const cardEl = $("#space-card");
function focus(key) {
  const v = views[key]; if (!v) return;
  walking = false; dest = null; marker.visible = false; hideHero();
  document.querySelectorAll(".nav-link[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === key));
  $("#card-title").textContent = v.title; $("#card-description").textContent = v.desc;
  cardEl.dataset.key = key; curViewKey = key; $("#card-focus").style.display = v.enter ? "" : "none";
  cardEl.classList.add("open");
  const go = () => flyTo(new THREE.Vector3(...v.pos), new THREE.Vector3(...v.target));
  if (!!v.inside !== (camera.position.x > 500)) cutThrough(() => { camera.position.set(...v.pos).add(new THREE.Vector3(0, 3, 3)); controls.target.set(...v.target); go(); }); else go();
}
function followCam(cb) { const tg = localAvatar.position.clone().add(new THREE.Vector3(0, 1.3, 0)), ry = localAvatar.rotation.y, d = localAvatar.position.x > 500 ? 5.5 : 7.5; flyTo(tg.clone().add(new THREE.Vector3(-Math.sin(ry) * d, localAvatar.position.x > 500 ? 3.2 : 4.6, -Math.cos(ry) * d)), tg, () => { walking = true; if (cb) cb(); }, 1400); }
function startWalk() {
  if (walking) return; hideHero(); cardEl.classList.remove("open");
  document.querySelectorAll(".nav-link[data-view]").forEach(b => b.classList.remove("active"));
  if ((camera.position.x > 500) !== (localAvatar.position.x > 500)) { snapCam(); return; } followCam();
}
function enter(key) {
  const v = views[key]; if (!v || !v.enter) return;
  const [x, z, r] = v.enter; teleport(x, z, r);
  showToast(v.title + "에 왔습니다. " + (key === "hall" || key === "edu" || key === "park" || key === "lab" ? "빈 자리 가까이 가서 E(바둑 두기)를 눌러 보세요." : "W A S D 또는 클릭으로 걸어 보세요."));
}
document.querySelectorAll(".nav-link[data-view]").forEach(b => b.addEventListener("click", () => { focus(b.dataset.view); $(".main-nav").classList.remove("open"); }));
$("#enter-world").addEventListener("click", () => { startWalk(); showToast(COARSE ? "무량기원에 오신 것을 환영합니다. 가고 싶은 곳을 터치하면 이동하고, 드래그하면 시선이 돌아갑니다." : "무량기원에 오신 것을 환영합니다. 클릭한 곳으로 걷고, 드래그로 시선을 돌립니다 (W A S D도 됩니다)."); });
$("#card-close").addEventListener("click", () => cardEl.classList.remove("open"));
$("#card-focus").addEventListener("click", () => cutThrough(() => enter(cardEl.dataset.key)));
$("#menu-toggle").addEventListener("click", () => $(".main-nav").classList.toggle("open"));
for (const id of ["muryangsa-link", "muryangsa-link2"]) { const a = $("#" + id); if (a && MURYANGSA_URL) { a.href = MURYANGSA_URL; a.hidden = false; if (id === "muryangsa-link2") $("#sp-muryangsa").hidden = false; } }

// ---------- 클릭 이동 · 바둑판 누르면 관전 ----------
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), dom = renderer.domElement;
const setPointer = e => { const r = dom.getBoundingClientRect(); pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1; pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1; raycaster.setFromCamera(pointer, camera); };
const marker = new THREE.Mesh(new THREE.RingGeometry(.32, .46, 28), new THREE.MeshBasicMaterial({ color: "#f3d58c", transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
dom.addEventListener("contextmenu", e => e.preventDefault());
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
let downPos = null, uiEat = false; dom.addEventListener("pointerdown", e => { downPos = [e.clientX, e.clientY]; });
function tryPickAvatar() {
  if (!remoteAvatars.size) return false;
  const hits = raycaster.intersectObjects([...remoteAvatars.values()], true); if (!hits.length) return false;
  let o = hits[0].object; while (o && !peerOf(o)) o = o.parent; if (!o) return false;
  if (Math.hypot(o.position.x - localAvatar.position.x, o.position.z - localAvatar.position.z) > 14) { showToast("조금 더 가까이 가서 인사해 보세요."); return true; }
  openIx(o); return true;
}
function tryPickBoard() {
  const h = raycaster.intersectObjects(TABLE_HITS, false); if (!h.length || h[0].distance > 24) return false;
  const T = h[0].object.userData.table; if (!T) return false;
  if (sitting && sitting.tb === T.i) { openPanel(T); return true; }
  watchTable(T); return true;
}
dom.addEventListener("pointerup", e => {
  if (uiEat || !isMoveBtn(e) || (downPos && Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 6 && !fpLocked())) return;
  if (fp && e.pointerType === "mouse") { if (!fpLocked()) { fpLock(); return; } pointer.set(0, 0); raycaster.setFromCamera(pointer, camera); } else setPointer(e);
  if (tryPickAvatar()) return;
  if (!walking && !fp && $(".hero-copy").style.display !== "none") { startWalk(); return; }
  if (walking && tryPickBoard()) return;
  if (sitting) return; // 앉아 있을 땐 화면을 눌러도 일어나지 않는다(바둑판 창을 쓰기 쉽게)
  plane.constant = -localAvatar.position.y;
  if (!raycaster.ray.intersectPlane(plane, hitP)) { if (!fp) return; const d = raycaster.ray.direction, hh = Math.hypot(d.x, d.z) || 1; hitP.set(localAvatar.position.x + d.x / hh * 8, plane.constant * -1, localAvatar.position.z + d.z / hh * 8); }
  if (Math.hypot(hitP.x - localAvatar.position.x, hitP.z - localAvatar.position.z) > 40) { const q = localAvatar.position, k = 40 / Math.hypot(hitP.x - q.x, hitP.z - q.z); hitP.set(q.x + (hitP.x - q.x) * k, hitP.y, q.z + (hitP.z - q.z) * k); }
  dest = { x: hitP.x, z: hitP.z }; marker.position.set(hitP.x, localAvatar.position.y + .06, hitP.z); marker.visible = true;
  if (!walking) startWalk();
});
dom.addEventListener("pointermove", e => { if (fp || e.buttons) return; setPointer(e); const h = raycaster.intersectObjects(TABLE_HITS, false); dom.style.cursor = h.length && h[0].distance < 24 ? "pointer" : ""; });

// ---------- 키보드 · 조이스틱 ----------
const keys = {};
const typing = e => e.target.closest && e.target.closest("textarea,input,dialog");
addEventListener("keydown", e => { if (typing(e)) return; if (/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Shift(Left|Right))$/.test(e.code)) { keys[e.code] = true; if (e.code.startsWith("Arrow")) e.preventDefault(); } });
addEventListener("keyup", e => { keys[e.code] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
const joy = { x: 0, y: 0 }; let joyRun = false;
(() => {
  const el = $("#joystick"), knob = $("#joy-knob"); let id = null;
  const set = e => { const r = el.getBoundingClientRect(), R = r.width * .34 || 46; let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / R; joy.y = -dy / R; };
  el.addEventListener("pointerdown", e => { e.preventDefault(); id = e.pointerId; el.setPointerCapture(id); set(e); });
  el.addEventListener("pointermove", e => { if (e.pointerId === id) set(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; knob.style.transform = ""; };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
})();
$("#share-button").addEventListener("click", async () => {
  const url = location.href.split(/[?#]/)[0], data = { title: "무량기원 | MURYANG BADUK INSTITUTE", text: "바둑의 깊이는 헤아릴 수 없다 — 3D 바둑 기관 무량기원에서 한 판 두어요", url };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  copyText(url).then(() => showToast("무량기원 주소를 복사했습니다. 함께 둘 분께 보내 보세요."));
});

// ---------- 걷기 ----------
const moveBasis = { on: false, fx: 0, fz: 1 };
const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), mvv = new THREE.Vector3();
const inB = (x, z) => x > 500 ? Math.abs(x - (x > 700 ? IX2 : IX)) < IW / 2 - .3 && Math.abs(z) < ID / 2 - .3 : Math.abs(x) < 64 && z > -48 && z < 51.5;
let lastSend = 0, dirty = false, inDimT = 0, inDim = 0;
function tryMove(vx, vz, dist, dt) {
  const p = localAvatar.position, nx = p.x + vx * dist, nz = p.z + vz * dist; let moved = false;
  if (!blocked(nx, p.z, p.y) && inB(nx, p.z)) { p.x = nx; moved = true; }
  if (!blocked(p.x, nz, p.y) && inB(p.x, nz)) { p.z = nz; moved = true; }
  if (moved) { let d = Math.atan2(vx, vz) - localAvatar.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); localAvatar.rotation.y += d * Math.min(1, dt * 12); }
  return moved;
}
function updateIndoor() { inDimT = (walking || fp ? localAvatar.position.x : camera.position.x) > 500 ? 1 : 0; } // 걷는 중엔 내 위치, 장소 소개 중엔 카메라 위치 기준
function stepWalk(dt) {
  let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), sd = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (panel.isOpen && !COARSE) { f = sd = 0; } // 바둑판 창이 열려 있으면 키보드는 판에 양보
  const jm = Math.hypot(joy.x, joy.y); if (!f && !sd && jm > .18) { f = joy.y; sd = joy.x; }
  if (!f && !sd) moveBasis.on = false; else { const sg = Math.sign(f) + "," + Math.sign(sd); if (sg !== moveBasis.sig) { moveBasis.sig = sg; moveBasis.on = false; } }
  const p = localAvatar.position; let moved = false, byDest = false; const run = keys.ShiftLeft || keys.ShiftRight || joyRun;
  if (sitting && (f || sd)) stand();
  if ((f || sd) && !flying && !sitting) {
    dest = null; marker.visible = false;
    if (!walking) startWalk();
    else {
      if (!moveBasis.on || camManual === Infinity) { fwd.subVectors(controls.target, camera.position); fwd.y = 0; fwd.normalize(); moveBasis.fx = fwd.x; moveBasis.fz = fwd.z; moveBasis.on = true; }
      fwd.set(moveBasis.fx, 0, moveBasis.fz); rgt.set(-fwd.z, 0, fwd.x);
      mvv.set(0, 0, 0).addScaledVector(fwd, f).addScaledVector(rgt, sd); const mg = Math.min(1, mvv.length()); mvv.normalize();
      camK = f < -.01 ? 0 : (Math.abs(sd) > .01 ? (f > .01 ? .55 : .3) : 1); moved = tryMove(mvv.x, mvv.z, (run ? 10.8 : 5.5) * dt * Math.max(.45, mg), dt);
    }
  } else if (dest && walking && !flying && !sitting) {
    byDest = true; camK = COARSE ? 0 : 1;
    const dx = dest.x - p.x, dz = dest.z - p.z, dist = Math.hypot(dx, dz);
    if (fp && dist > .6) { let da = Math.atan2(dx, dz) - fpYaw; da = Math.atan2(Math.sin(da), Math.cos(da)); fpYaw += da * Math.min(1, dt * 7); fpPitch *= Math.max(0, 1 - dt * 3); }
    if (dist < .15) { dest = null; marker.visible = false; }
    else { moved = tryMove(dx / dist, dz / dist, Math.min(dist, (dist > 20 ? 10.8 : 5.5) * dt), dt); if (!moved) { dest = null; marker.visible = false; } }
  }
  p.y += (groundY(p.x, p.z) - p.y) * Math.min(1, dt * 14);
  if (walking) {
    const ST = sitting && TABLES[sitting.tb], gx = ST ? ST.x : p.x, gy = ST ? p.y + ST.top + .25 : p.y + 1.3, gz = ST ? ST.z : p.z; // 앉으면 판(대국석 가운데)을 바라본다
    const kk = ST ? Math.min(1, dt * 4) : 1, dx = (gx - controls.target.x) * kk, dy = (gy - controls.target.y) * kk, dz = (gz - controls.target.z) * kk;
    controls.target.x += dx; controls.target.y += dy; controls.target.z += dz; camera.position.x += dx; camera.position.y += dy; camera.position.z += dz;
    if (!flying && !fp) followFacing(dt, moved, byDest);
  }
  localAvatar.userData.walk = moved ? 1 : 0;
  if (moved) dirty = true;
  updateIndoor();
  const now = performance.now();
  if (dirty && moveSend && now - lastSend > 100) { try { moveSend(myState()); } catch (e) {} lastSend = now; dirty = moved; }
}

// ---------- 앉기 (바둑 두기) ----------
let fp = false, fpYaw = Math.PI, fpPitch = 0;
const sitBtn = $("#sit-button"), boardBtn = $("#board-button"), watchBtn = $("#watch-button");
const seatTaken = s => { for (const av of remoteAvatars.values()) if (av.userData.sit && av.userData.q === s.id) return true; return false; };
function nearSeat(free = true) { const p = localAvatar.position; let best = null, bd = 1.9; for (const s of seats) { if (Math.abs(s.y - p.y) > 1.2 || (free && seatTaken(s))) continue; const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } } return best; }
function nearTable(r = 6) { const p = localAvatar.position; let best = null, bd = r; for (const T of TABLES) { const d = Math.hypot(T.x - p.x, T.z - p.z); if (d < bd) { bd = d; best = T; } } return best; }
function sit(s) {
  const T = TABLES[s.tb]; if (T && !goCanSit(T, s)) return;
  sitting = s; localAvatar.position.set(s.x, s.y, s.z); localAvatar.rotation.y = s.ry; fpYaw = s.ry; dest = null; marker.visible = false;
  localAvatar.userData.sit = s.kind === "go-floor" ? 1 : s.kind === "sofa" ? 5 : 4; dirty = true; if (s.kind === "pc") { kiboPanel.open("pc"); showToast("컴퓨터 앞에 앉았습니다. 기보를 골라 보세요."); } else if (s.kind === "sofa") showToast("편하게 앉았습니다. 움직이면 일어납니다."); if ((s.kind === "sofa" || s.kind === "pc") && !fp) { const fx = Math.sin(s.ry), fz = Math.cos(s.ry), k = s.kind === "sofa" ? 1 : -1; walking = true; flying = false; flyId++; controls.autoRotate = false; controls.target.set(s.x, s.y + 1.2, s.z); camera.position.set(s.x + fx * 3.6 * k + fz * 1.2, s.y + 2.6, s.z + fz * 3.6 * k - fx * 1.2); camArm = 1; } // 소파는 앞에서, 컴퓨터는 뒤에서 본다 try { moveSend && moveSend(myState()); } catch (e) {}
  if (T) { goSat(T, s); if (!fp) { const fx = Math.sin(s.ry), fz = Math.cos(s.ry), side = T.i % 2 ? -1 : 1; walking = true; flying = false; flyId++; controls.autoRotate = false; controls.target.set(T.x, s.y + T.top + .25, T.z); camera.position.set(T.x + fz * 4.4 * side - fx * 1.4, s.y + T.top + 2.9, T.z - fx * 4.4 * side - fz * 1.4); camArm = 1; } } // 중계 화면처럼 옆에서 두 사람과 판이 함께 보이게
}
function stand(quiet) {
  if (!sitting) return; const s = sitting; sitting = null; localAvatar.userData.sit = 0;
  const fw = s.kind === "sofa" ? 1 : -1; localAvatar.position.x += fw * Math.sin(s.ry) * .95; localAvatar.position.z += fw * Math.cos(s.ry) * .95; dirty = true; if (s.kind === "pc" && kiboPanel.isOpen) kiboPanel.close();
  const T = TABLES[s.tb]; if (T) goStood(T, quiet);
}
sitBtn.addEventListener("click", () => { if (sitting) stand(); else { const s = nearSeat(); if (s) sit(s); else if (nearSeat(false)) showToast("그 자리는 다른 방문객이 앉아 있습니다. 관전(F)해 보세요."); } });
boardBtn.addEventListener("click", () => { if (sitting) openPanel(TABLES[sitting.tb]); });
watchBtn.addEventListener("click", () => { const T = nearTable(); if (T) watchTable(T); });
setInterval(() => {
  const s = sitting || nearSeat(), T = !sitting && nearTable();
  sitBtn.hidden = !s; sitBtn.textContent = sitting ? "일어나기 (E)" : s && s.kind === "sofa" ? "앉기 (E)" : s && s.kind === "pc" ? "💻 컴퓨터 앞에 앉기 (E)" : "바둑 두기 (E)";
  boardBtn.hidden = !(sitting && !panel.isOpen); watchBtn.hidden = !T || !!sitting || (panel.isOpen && panelT === T);
  if (T && T.game) watchBtn.textContent = (T.game.status === "play" ? "관전하기 (F)" : "바둑판 보기 (F)"); else watchBtn.textContent = "바둑판 보기 (F)";
}, 300);

// ---------- 3인칭 카메라 ----------
let camManual = 0, camRecenter = 0, followW = 0, camArm = 1, camHide = false, camDown = null;
const camIdeal = new THREE.Vector3(), wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));
const camPtr = new Map();
dom.addEventListener("pointerdown", e => { camDown = [e.clientX, e.clientY]; camPtr.set(e.pointerId, [e.clientX, e.clientY]); });
dom.addEventListener("pointermove", e => { const s = camPtr.get(e.pointerId); if (s && ((e.buttons & LOOK_MASK) || (e.pointerType === "touch" && (e.buttons & 1))) && Math.hypot(e.clientX - s[0], e.clientY - s[1]) > 5) camManual = Infinity; });
const camRelease = e => { if (e && e.pointerId !== undefined) camPtr.delete(e.pointerId); if (camPtr.size) return; camDown = null; if (camManual === Infinity) camManual = performance.now() + 2000; };
addEventListener("pointerup", camRelease); addEventListener("pointercancel", camRelease); addEventListener("blur", () => { camPtr.clear(); camRelease(); }); document.addEventListener("visibilitychange", () => { camPtr.clear(); camRelease(); });
dom.addEventListener("wheel", () => { if (camManual !== Infinity) camManual = performance.now() + 1200; }, { passive: true });
let camK = 1;
function followFacing(dt, moved) {
  const t = controls.target, c = camera.position, ox = c.x - t.x, oz = c.z - t.z, r = Math.hypot(ox, oz); if (r < .4) return;
  const cur = Math.atan2(ox, oz), d = wrapPi(localAvatar.rotation.y + Math.PI - cur), ad = Math.abs(d);
  let goal = moved && !sitting && performance.now() > camManual ? 1 : 0, rate = COARSE ? .9 : 1.8, cap = COARSE ? .7 : 1.7;
  if (camRecenter > 0) { if (ad < .03) camRecenter = 0; else { goal = 1; rate = 3.4; cap = 3.2; } }
  followW += (goal - followW) * Math.min(1, dt * 2.4);
  let step = d * (1 - Math.exp(-dt * rate)) * camK * followW; const m = cap * dt; step = Math.max(-m, Math.min(m, step));
  if (Math.abs(step) < 1e-5) return;
  const a = cur + step; c.x = t.x + Math.sin(a) * r; c.z = t.z + Math.cos(a) * r;
}
function keepCamInside(dt) { // 실내: 카메라가 벽·천장 밖으로 나가지 않게
  const p = localAvatar.position; if (p.x < 500) { camArm += (1 - camArm) * Math.min(1, dt * 3); return false; }
  const t = controls.target, c = camera.position, Mg = .45, cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const OX = p.x > 700 ? IX2 : IX, x0 = OX - IW / 2 + Mg, x1 = OX + IW / 2 - Mg, z0 = -ID / 2 + Mg, z1 = ID / 2 - Mg, y0 = .5, y1 = IH - .5;
  const tx = cl(t.x, x0, x1), ty = cl(t.y, y0, y1 - .2), tz = cl(t.z, z0, z1), dx = c.x - tx, dy = c.y - ty, dz = c.z - tz; let s = 1;
  if (c.x > x1 && dx > 0) s = Math.min(s, (x1 - tx) / dx); else if (c.x < x0 && dx < 0) s = Math.min(s, (x0 - tx) / dx);
  if (c.z > z1 && dz > 0) s = Math.min(s, (z1 - tz) / dz); else if (c.z < z0 && dz < 0) s = Math.min(s, (z0 - tz) / dz);
  if (c.y > y1 && dy > 0) s = Math.min(s, (y1 - ty) / dy); else if (c.y < y0 && dy < 0) s = Math.min(s, (y0 - ty) / dy);
  s = Math.max(0, s); camArm += (s - camArm) * Math.min(1, dt * (s < camArm ? 16 : 2.4));
  const a = Math.min(1, camArm); c.set(tx + dx * a, ty + dy * a, tz + dz * a); c.x = cl(c.x, x0, x1); c.z = cl(c.z, z0, z1); c.y = cl(c.y, y0, y1);
  return true;
}
const cutEl = document.createElement("div"); cutEl.className = "cut-fade"; root.appendChild(cutEl); let cutBusy = false;
function cutThrough(fn) {
  if (cutBusy) return; cutBusy = true; cutEl.style.transition = "opacity .22s ease"; cutEl.style.opacity = "1";
  setTimeout(() => { try { fn(); } finally { requestAnimationFrame(() => { cutEl.style.transition = "opacity .75s ease"; cutEl.style.opacity = "0"; cutBusy = false; }); } }, 240);
}
function snapCam(d, h) { const inn = localAvatar.position.x > 500; d = d ?? (inn ? (COARSE ? 7 : 5.5) : (COARSE ? 10.5 : 7.5)); h = h ?? (inn ? (COARSE ? 4.2 : 3.2) : (COARSE ? 6.2 : 4.3)); walking = true; flying = false; flyId++; controls.autoRotate = false; const p = localAvatar.position, ry = localAvatar.rotation.y; controls.target.set(p.x, p.y + 1.3, p.z); camera.position.set(p.x - Math.sin(ry) * d, p.y + h, p.z - Math.cos(ry) * d); }
function teleport(x, z, ry) { if (sitting) stand(true); const p = localAvatar.position; p.set(x, groundY(x, z), z); localAvatar.rotation.y = ry; fpYaw = ry; fpPitch = 0; dest = null; marker.visible = false; dirty = true; cardEl.classList.remove("open"); hideHero(); snapCam(); updateIndoor(); }
// 정문 출입
const PORT_IN = { x: IX, z: ID / 2 - 2.4, ry: Math.PI }, PORT_OUT = { x: 0, z: FRONT + 3.2, ry: 0 };
let portalNow = null, snooze = ""; const portalCard = $("#portal-card");
const portalHit = () => { const p = localAvatar.position; if (p.x > 500) return Math.abs(p.x - IX) < 3.4 && p.z > ID / 2 - 1.6 ? "out" : null; return Math.abs(p.x) < 4.2 && p.z > FRONT && p.z < FRONT + 2.6 ? "in" : null; };
const doPortal = dir => cutThrough(() => { snooze = dir === "in" ? "out" : "in"; if (dir === "in") { teleport(PORT_IN.x, PORT_IN.z, PORT_IN.ry); showToast("무량기원 로비입니다. 안내 데스크 뒤로 돌아가면 중앙 대국장이 있습니다."); } else { teleport(PORT_OUT.x, PORT_OUT.z, PORT_OUT.ry); showToast("정문 밖으로 나왔습니다."); } });
setInterval(() => {
  const h = portalHit();
  if (h && !sitting && snooze !== h) { portalNow = h; $("#portal-text").textContent = h === "in" ? "무량기원에 입장하시겠습니까?" : "무량기원 밖으로 나가시겠습니까?"; $("#portal-yes").textContent = h === "in" ? "입장 (E)" : "나가기 (E)"; portalCard.hidden = false; }
  else { if (!h) snooze = ""; portalNow = null; portalCard.hidden = true; }
}, 250);
$("#portal-yes").addEventListener("click", () => { const h = portalNow; if (!h) return; portalCard.hidden = true; portalNow = null; doPortal(h); });
$("#portal-no").addEventListener("click", () => { if (portalNow) snooze = portalNow; portalNow = null; portalCard.hidden = true; });

// ---------- 1인칭 ----------
const fpLocked = () => document.pointerLockElement === dom;
const fpLock = () => { if (COARSE) return; try { const r = dom.requestPointerLock && dom.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
document.addEventListener("pointerlockchange", () => { if (fp && !fpLocked() && !panel.isOpen) showToast("마우스가 풀렸습니다. 화면을 클릭하면 다시 마우스로 둘러봅니다."); });
function setFP(on) {
  fp = on; camera.fov = on ? FOV_FP : FOV_3P; camera.updateProjectionMatrix(); localAvatar.visible = !on; controls.enabled = !on; $("#fp-toggle").classList.toggle("on", on); $("#fp-button").textContent = on ? "3인칭 (V/F5)" : "1인칭 (V/F5)"; hideHero(); cardEl.classList.remove("open");
  if (on) { walking = true; flying = false; const d = new THREE.Vector3(); camera.getWorldDirection(d); fpYaw = sitting ? sitting.ry : Math.atan2(d.x, d.z); fpPitch = sitting ? -.55 : 0; if (!panel.isOpen) fpLock(); showToast(COARSE ? "1인칭 시점 · 드래그하면 둘러보고, 터치하면 그쪽으로 걸어갑니다" : "1인칭 시점 · 마우스로 둘러보기 · Esc 마우스 풀기 · F5/V 해제"); }
  else { if (fpLocked()) document.exitPointerLock(); if (!sitting) localAvatar.rotation.y = fpYaw; snapCam(); }
}
$("#fp-toggle").textContent = COARSE ? "1" : "V"; $("#fp-toggle").addEventListener("click", () => setFP(!fp)); $("#fp-button").addEventListener("click", () => setFP(!fp));
const fpLook = (dx, dy) => { fpYaw -= dx * .0028; fpPitch = Math.max(-1.45, Math.min(1.45, fpPitch - dy * .0028)); };
document.addEventListener("mousemove", e => { if (fp && fpLocked()) fpLook(e.movementX, e.movementY); });
let fpTouch = null, fpTouch0 = null, fpTouchLook = false; dom.addEventListener("pointerdown", e => { fpTouch = e.pointerType === "touch" ? [e.clientX, e.clientY] : null; fpTouch0 = fpTouch; fpTouchLook = false; });
dom.addEventListener("pointermove", e => { if (!fp) return; if (e.pointerType === "touch") { if (fpTouch) { if (!fpTouchLook && Math.hypot(e.clientX - fpTouch0[0], e.clientY - fpTouch0[1]) > 6) { fpTouchLook = true; fpTouch = [e.clientX, e.clientY]; dest = null; marker.visible = false; } if (fpTouchLook) { fpLook((e.clientX - fpTouch[0]) * 2.4, (e.clientY - fpTouch[1]) * 2.4); fpTouch = [e.clientX, e.clientY]; } } } else if (!fpLocked() && (e.buttons & LOOK_MASK)) fpLook(e.movementX, e.movementY); });
dom.addEventListener("wheel", e => { if (!fp) return; e.preventDefault(); FOV_FP = Math.max(55, Math.min(100, FOV_FP + Math.sign(e.deltaY) * 4)); camera.fov = FOV_FP; camera.updateProjectionMatrix(); }, { passive: false });
dom.addEventListener("pointermove", e => { if (!fp && walking && ((e.buttons & LOOK_MASK) || (e.pointerType === "touch" && (e.buttons & 1)))) { const low = controls.getPolarAngle() >= controls.maxPolarAngle - .02; if (low && e.movementY < 0) lookUp = Math.min(1.3, lookUp - e.movementY * .004); else if (e.movementY > 0 || !low) lookUp = Math.max(0, lookUp - Math.abs(e.movementY) * .004 - (low ? 0 : .03)); } });

// ---------- 단축키 ----------
const HK = { KeyJ: "#live-button", KeyI: "#kibo-button", KeyU: "#water-button", KeyL: "#learn-button", KeyG: "#greet-button", KeyH: "#warm-button", KeyC: "#talk-button", KeyK: "#shot-toggle", KeyM: "#mute-toggle", KeyF: "#watch-button", KeyB: "#board-button" };
const VIEW_KEYS = [null, "front", "park", "lobby", "hall", "lab", "edu", "tour", "room"], keyHelp = $("#key-help");
const toggleHelp = on => { keyHelp.hidden = on === undefined ? !keyHelp.hidden : !on; };
$("#key-toggle").addEventListener("click", () => toggleHelp());
addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || typing(e)) return;
  const c = e.code;
  if (c === "F1" || c === "Slash") { e.preventDefault(); toggleHelp(); return; }
  if (c === "F5" || c === "KeyV") { e.preventDefault(); setFP(!fp); return; }
  if (c === "Escape") { if (panel.isOpen || kiboPanel.isOpen || lessonPanel.isOpen) return; if (!npcCard.hidden) { npcCard.hidden = true; return; } if (!liveCard.hidden) { liveCard.hidden = true; return; } if (!settingsPanel.hidden) settingsPanel.hidden = true; else if (!keyHelp.hidden) toggleHelp(false); else if (portalNow) $("#portal-no").click(); else if (!ixCard.hidden) ixCard.hidden = true; else if (cardEl.classList.contains("open")) $("#card-close").click(); return; }
  if (c === "KeyE") { if (portalNow) $("#portal-yes").click(); else if (!$("#elev-button").hidden) rideElevator(); else if (!$("#npc-button").hidden) $("#npc-button").click(); else if (!sitBtn.hidden) sitBtn.click(); return; }
  if (c === "KeyQ") { for (const id of ["#shelf-button", "#coffee-button", "#drop-button"]) { const b = $(id); if (b && !b.hidden) { b.click(); break; } } return; }
  const dm = !e.shiftKey && /^(?:Digit|Numpad)([1-9])$/.exec(c);
  if (dm) { const n = +dm[1] - 1; if (!ixCard.hidden) { const bs = [...ixCard.querySelectorAll('button[data-ix]:not([data-ix="close"])')].filter(b => !b.hidden); if (bs[n]) bs[n].click(); } else if (VIEW_KEYS[n]) focus(VIEW_KEYS[n]); return; }
  if (c === "Enter" && !(e.target.closest && e.target.closest("button,a,select")) && cardEl.classList.contains("open") && $("#card-focus").style.display !== "none") { $("#card-focus").click(); return; }
  if (c === "KeyZ") { if (walking && !fp) { camRecenter = 1; showToast("시선을 캐릭터가 보는 방향으로 맞춥니다."); } return; }
  const sel = !e.shiftKey && HK[c]; if (sel) { const b = $(sel); if (b && !b.hidden && !b.disabled) b.click(); }
});

// ---------- 바둑: 대국 상태 · 인공지능 · 방문객끼리 동기화 · 관전 ----------
// 대국 G = { gid, size, moves:[[x,y]|null], p:{1:{id,name,seat}|null, 2:…}, ai:-1|0~3, host, status:"wait"|"play"|"scoring"|"end", result, score, ts }
// 대국을 연 사람(host)이 판정의 기준이 되고, 바뀔 때마다 모두에게 전체 상태를 보낸다. 상대는 수를 보내면 host가 확인해 다시 알린다.
const AI_LV = ["입문", "초급", "중급", "고급"], aiName = lv => "무량 AI · " + AI_LV[lv];
const colName = c => c === BLACK ? "흑" : "백";
const newGid = () => Math.random().toString(36).slice(2, 10);
const myColor = T => { const G = T && T.game; if (!G) return 0; for (const c of [BLACK, WHITE]) if (G.p[c] && G.p[c].id === selfId) return c; return 0; };
const isHost = T => !!(T.game && T.game.host === selfId);
let featured = null, panelT = null;
function okGame(G) {
  if (!G || typeof G !== "object" || typeof G.gid !== "string" || G.gid.length > 12 || ![9, 13, 19].includes(G.size) || !Array.isArray(G.moves) || G.moves.length > 900) return false;
  if (!G.moves.every(m => m === null || (Array.isArray(m) && m.length === 2 && m.every(v => Number.isInteger(v) && v >= 0 && v < G.size)))) return false;
  if (!G.p || typeof G.p !== "object") return false;
  for (const c of [1, 2]) { const q = G.p[c]; if (q !== null && q !== undefined && (typeof q !== "object" || typeof q.id !== "string" || q.id.length > 64 || typeof q.name !== "string" || q.name.length > 24)) return false; }
  if (!["wait", "play", "scoring", "end", "review"].includes(G.status) || !Number.isInteger(G.ai) || G.ai < -1 || G.ai > 3 || typeof G.host !== "string" || typeof G.ts !== "number") return false;
  if (G.result && (typeof G.result !== "string" || G.result.length > 160)) return false;
  if (G.score && (!Array.isArray(G.score.terr) || G.score.terr.length !== G.size * G.size || !Array.isArray(G.score.dead))) return false;
  return true;
}
function setGame(T, G, quiet) {
  const prev = T.game, prevN = prev && prev.gid === (G && G.gid) ? prev.moves.length : -1;
  T.game = G; T.board = G ? fromMoves(G.size, G.moves) || new Board(G.size) : null; renderTable(T);
  if (G && G.moves.length > prevN && prevN >= 0 && !quiet) { const lm = G.moves[G.moves.length - 1], near = Math.hypot(T.x - localAvatar.position.x, T.z - localAvatar.position.z) < 18 || panelT === T; if (lm && near) Snd.stone(T.board.lastCap > 0 ? 1.25 : 1); }
  if (G && (G.moves.length || G.status !== "wait")) { T.activeAt = Date.now(); if (T.zone !== "lab") featured = T; }
  if (featured === T && !G) featured = TABLES.filter(t => t.game && t.zone !== "lab").sort((a, b) => (b.activeAt || 0) - (a.activeAt || 0))[0] || null;
  drawScreens(); refreshPanel();
  if (G && G.status === "end" && G.moves.length >= 2) { T.saved = T.saved || {}; if (!T.saved[G.gid]) { T.saved[G.gid] = 1; const mine = !!myColor(T), rec = { id: G.gid, size: G.size, moves: G.moves.slice(), pb: G.p[1] ? G.p[1].name : "흑", pw: G.p[2] ? G.p[2].name : "백", result: G.result || "", place: T.name, date: new Date().toISOString(), komi: KOMI }; if (saveRecord(rec, mine) && mine) setTimeout(() => showToast("기보가 자동 저장되었습니다 📜 「내 기보」(I)나 연구·분석실 컴퓨터에서 볼 수 있어요."), 3000); } }
  { const n = G ? G.moves.length : 0; if (G && G.host === selfId && G.status === "play" && G.ai >= 0 && T.board.turn !== myColor(T) && !(n >= 2 && G.moves[n - 1] === null && G.moves[n - 2] === null)) askAI(T); }
}
function goBroadcast(T, to) { if (!goSendFn) return; try { goSendFn({ t: "g", tb: T.i, G: T.game || null, gid: T.game ? T.game.gid : T.lastGid || "" }, to); } catch (e) {} }
function hostChanged(T) { T.game.ts = Date.now(); setGame(T, T.game); goBroadcast(T); }
function goRecv(d, peerId) {
  if (!d || !Number.isInteger(d.tb) || !TABLES[d.tb] || !cooldown(peerId, "go" + d.t + d.tb, d.t === "g" ? 60 : 150)) return;
  const T = TABLES[d.tb], G = T.game;
  if (d.t === "g") {
    if (d.G === null) { if (G && G.host === peerId) { setGame(T, null); if (sitting && sitting.tb === T.i) showToast("대국을 연 분이 자리를 정리했습니다."); } return; }
    const N = d.G; if (!okGame(N) || N.host !== peerId) return;
    if (G && G.gid !== N.gid) { // 같은 자리에 두 대국이 겹치면 먼저 연 대국이 남는다
      if (G.host === selfId && (G.ts < N.ts || (G.ts === N.ts && selfId < peerId)) && G.status !== "end") { goBroadcast(T, peerId); return; }
      if (G.host === selfId && myColor(T)) showToast("이 자리에 다른 대국이 먼저 열렸습니다.");
    }
    if (G && G.gid === N.gid && N.moves.length < G.moves.length && N.status === G.status && G.host !== peerId) return;
    setGame(T, N); return;
  }
  if (!G || d.gid !== G.gid) return;
  if (d.t === "join" && isHost(T) && G.status === "wait" && typeof d.name === "string" && nameOK(d.name)) {
    const c = !G.p[BLACK] ? BLACK : !G.p[WHITE] ? WHITE : 0; if (!c) return;
    G.p[c] = { id: peerId, name: d.name, seat: Number.isInteger(d.seat) ? d.seat : -1 }; G.status = "play"; hostChanged(T);
    showToast(d.name + "님이 마주 앉았습니다. 대국을 시작합니다. (" + colName(myColor(T)) + ")"); return;
  }
  if (d.t === "mv" && G.status === "play") {
    const b = T.board, who = b.turn; if (!G.p[who] || G.p[who].id !== peerId || d.n !== G.moves.length) return;
    const m = d.m === null ? null : Array.isArray(d.m) && d.m.length === 2 && d.m.every(v => Number.isInteger(v) && v >= 0 && v < G.size) ? d.m : undefined; if (m === undefined) return;
    if (!applyMove(T, m)) return;
    const av = remoteAvatars.get(peerId); if (av && m) av.userData.reach = performance.now() + 750;
    if (isHost(T)) afterMove(T); return;
  }
  if (d.t === "res" && G.status === "play") { const c = [BLACK, WHITE].find(c => G.p[c] && G.p[c].id === peerId); if (!c) return; if (isHost(T)) { endGame(T, `${colName(3 - c)} 불계승 · ${G.p[c].name}님 기권`); } return; }
  if (d.t === "bye" && isHost(T)) { const c = [BLACK, WHITE].find(c => G.p[c] && G.p[c].id === peerId); if (!c) return; if (G.status === "play") endGame(T, `${colName(3 - c)} 승 · ${G.p[c].name}님이 자리를 떠났습니다`); else { G.p[c] = null; if (G.status === "wait") hostChanged(T); else hostChanged(T); } }
}
function goPeerLeft(peerId) {
  for (const T of TABLES) { const G = T.game; if (!G) continue;
    if (G.host === peerId) { setGame(T, null); if (sitting && sitting.tb === T.i) showToast("상대가 기원을 떠나 대국이 끝났습니다."); continue; }
    if (isHost(T)) { const c = [BLACK, WHITE].find(c => G.p[c] && G.p[c].id === peerId); if (c) { if (G.status === "play") endGame(T, `${colName(3 - c)} 승 · 상대가 기원을 떠났습니다`); else { G.p[c] = null; hostChanged(T); } } } }
}
function applyMove(T, m) { // 모두가 같은 규칙으로 적용한다(로컬 확인)
  const G = T.game, b = T.board; const p = m ? b.pos(m[0], m[1]) : PASS;
  if (!b.legal(p, b.turn)) return false;
  G.moves.push(m); G.ts = Date.now(); setGame(T, G); return true;
}
function afterMove(T) { // host만: 두 번 연속 패스면 계가, 아니면 상대(인공지능)에게
  const G = T.game, n = G.moves.length;
  if (n >= 2 && G.moves[n - 1] === null && G.moves[n - 2] === null) { G.status = "scoring"; hostChanged(T); scoreGame(T); return; }
  hostChanged(T);
}
function endGame(T, result, score = null) { const G = T.game; G.status = "end"; G.result = result; G.score = score; T.thinking = 0; hostChanged(T); showToast(result); }
// 인공지능 · 계가는 따로 생각하는 작업자(Worker)에게 맡긴다 (안 되면 이 화면에서 짧게)
let worker = null, reqN = 0; const pending = new Map();
try { worker = new Worker(new URL("./go_worker.js?v=1", import.meta.url), { type: "module" }); worker.onmessage = e => { const r = pending.get(e.data.id); if (r) { pending.delete(e.data.id); r(e.data); } }; worker.onerror = e => { console.warn("작업자 오류 — 이 화면에서 계산합니다", e); worker = null; for (const r of pending.values()) r({ error: "worker" }); pending.clear(); }; } catch (e) { worker = null; }
function work(msg) {
  return new Promise(res => {
    const id = ++reqN;
    if (worker) { pending.set(id, res); worker.postMessage({ ...msg, id }); return; }
    setTimeout(() => { try { const b = fromMoves(msg.size, msg.moves); if (msg.type === "score") { res({ score: finalScore(b, ownership(b, 60), KOMI) }); return; } const r = think(b, Math.min(msg.level, 2), KOMI, 350); res({ move: r.move === "resign" ? "resign" : r.move === PASS ? null : b.xy(r.move) }); } catch (err) { res({ error: String(err) }); } }, 30);
  });
}
function askAI(T) {
  const G = T.game; if (!G || G.status !== "play" || G.ai < 0 || T.thinking) return;
  const aiC = [BLACK, WHITE].find(c => G.p[c] && G.p[c].id === "ai"); if (!aiC || T.board.turn !== aiC) return;
  const tok = T.thinking = ++reqN + 1e6, gid = G.gid, n = G.moves.length, t0 = Date.now(); refreshPanel();
  work({ type: "move", size: G.size, moves: G.moves, level: G.ai }).then(r => {
    const wait = Math.max(0, (G.ai <= 1 ? 650 : 250) - (Date.now() - t0));
    setTimeout(() => {
      if (T.thinking !== tok || !T.game || T.game.gid !== gid || T.game.moves.length !== n || T.game.status !== "play") return;
      T.thinking = 0;
      if (r.error) { showToast("인공지능이 잠시 쉬어 갑니다. 다시 시도해 주세요."); refreshPanel(); return; }
      if (r.move === "resign") { endGame(T, `${colName(3 - aiC)} 불계승 · 인공지능이 돌을 던졌습니다`); return; }
      if (!applyMove(T, r.move)) { applyMove(T, null); }
      if (r.move === null) showToast("인공지능이 패스했습니다. 끝내려면 패스, 더 두려면 착수하세요.");
      afterMove(T);
    }, wait);
  });
}
function scoreGame(T) {
  const G = T.game, gid = G.gid; refreshPanel();
  work({ type: "score", size: G.size, moves: G.moves }).then(r => {
    if (!T.game || T.game.gid !== gid) return;
    if (r.error || !r.score) { endGame(T, "계가하지 못했습니다. 무승부로 마칩니다."); return; }
    const s = r.score, w = s.winner === BLACK ? "흑" : "백", fmt = v => (Math.round(v * 10) / 10).toString();
    endGame(T, `계가 · 흑 ${fmt(s.black)}집, 백 ${fmt(s.white)}집(덤 ${s.komi}) → ${w} ${fmt(s.margin)}집 승`, { terr: s.terr, dead: s.dead });
  });
}
// ---------- 내 쪽 동작 ----------
function goCanSit(T, s) {
  const G = T.game, me = myColor(T);
  if (seatTaken(s)) { showToast("그 자리는 다른 방문객이 앉아 있습니다."); return false; }
  if (G && !me && G.status === "play" && G.host !== selfId) { const others = [BLACK, WHITE].filter(c => G.p[c]).length; if (others >= 2) { showToast("지금 대국 중인 자리입니다. 관전(F)해 보세요."); watchTable(T); return false; } }
  return true;
}
function goSat(T, s) {
  const G = T.game;
  if (localAvatar.userData.hold === 3 && heldRec && (!G || G.status === "end")) { // 기보책을 들고 앉으면 그 기보를 판에 놓아 본다
    const r = heldRec; const N = { gid: newGid(), size: r.size, moves: [], p: { 1: { id: selfId, name: (r.pb || "흑").slice(0, 20) }, 2: { id: "kibo", name: (r.pw || "백").slice(0, 20) } }, ai: -1, host: selfId, status: "review", result: (r.title || "기보").slice(0, 60), score: null, ts: Date.now() };
    setGame(T, N); goBroadcast(T); kiboPanel.open("table"); kiboPanel.view(r, 0); showToast("기보를 펼쳤습니다. ▶ 로 한 수씩 놓아 보거나 「다음 수 맞히기」를 해 보세요."); return;
  }
  if (pendingSetup && !G) { const o = pendingSetup; pendingSetup = null; openPanel(T); startGame(T, o); return; }
  if (G && G.status === "wait" && G.host !== selfId) { // 기다리던 분과 마주 앉기
    const ask = k => { if (!(sitting && sitting.id === s.id) || !T.game || T.game.gid !== G.gid || T.game.status !== "wait") return; goSendFn && goSendFn({ t: "join", tb: T.i, gid: G.gid, name: localName, seat: s.id }); if (k < 3) setTimeout(() => ask(k + 1), 2500); }; ask(0); openPanel(T); panel.setStatus("마주 앉았습니다. 대국을 여는 중…"); return;
  }
  if (G && myColor(T)) { openPanel(T); return; } // 내 대국으로 돌아옴
  if (G && G.host !== selfId && G.status === "end") { /* 끝난 남의 대국 자리 → 새로 시작 */ }
  openPanel(T, true); showToast(T.name + "에 앉았습니다. 어떻게 둘지 골라 주세요.");
}
function goStood(T, quiet) {
  const G = T.game, me = myColor(T);
  if (G && G.status === "review" && isHost(T)) { if (kiboPanel.isOpen) kiboPanel.close(); setGame(T, null); goBroadcast(T); if (!quiet) showToast("기보를 접고 일어났습니다."); return; }
  if (panelT === T) panel.close(); panelT = panelT === T ? null : panelT;
  if (!G) return;
  if (isHost(T)) {
    const human = [BLACK, WHITE].some(c => G.p[c] && G.p[c].id !== selfId && G.p[c].id !== "ai");
    if (human && G.status === "play") { endGame(T, `${colName(3 - me)} 승 · ${localName}님이 자리를 떠났습니다`); }
    T.lastGid = G.gid; T.thinking = 0; setTimeout(() => { if (T.game && T.game.gid === G.gid && !(sitting && sitting.tb === T.i)) { setGame(T, null); goBroadcast(T); } }, human ? 6000 : 0);
  } else if (me) { goSendFn && goSendFn({ t: "bye", tb: T.i, gid: G.gid }); }
  if (!quiet) showToast("자리에서 일어났습니다.");
}
function startGame(T, opt) {
  const seat = sitting; if (!seat || seat.tb !== T.i) { showToast("먼저 대국석에 앉아 주세요."); return; }
  const me = opt.col === 0 ? (Math.random() < .5 ? BLACK : WHITE) : opt.col, ai = opt.opp === "ai";
  const G = { gid: newGid(), size: opt.size, moves: [], p: { 1: null, 2: null }, ai: ai ? opt.lv : -1, host: selfId, status: ai ? "play" : "wait", result: "", score: null, ts: Date.now() };
  G.p[me] = { id: selfId, name: localName, seat: seat.id }; if (ai) G.p[3 - me] = { id: "ai", name: aiName(opt.lv) };
  T.thinking = 0; setGame(T, G); goBroadcast(T); panel.setup(false); refreshPanel();
  showToast(ai ? `${aiName(opt.lv)}와(과) ${opt.size}줄 대국을 시작합니다. 나는 ${colName(me)}입니다.` : "맞은편에 다른 방문객이 앉기를 기다립니다. 주소를 공유해 친구를 불러 보세요.");
}
function myMove(m) {
  const T = panelT, G = T && T.game, me = myColor(T); if (!G || G.status !== "play" || !me || T.board.turn !== me || T.thinking) return;
  const n = G.moves.length;
  if (!applyMove(T, m)) { showToast("둘 수 없는 자리입니다 (자충수 · 패)."); return; }
  if (m) gesture("place"); else showToast("패스했습니다.");
  if (isHost(T)) afterMove(T); else goSendFn && goSendFn({ t: "mv", tb: T.i, gid: G.gid, n, m });
}
// ---------- 바둑판 창 ----------
const panel = new GoPanel(root, {
  onMove: (x, y) => myMove([x, y]), onPass: () => myMove(null),
  onResign: () => { const T = panelT, G = T && T.game, me = myColor(T); if (!G || G.status !== "play" || !me) return; if (isHost(T)) endGame(T, `${colName(3 - me)} 불계승 · ${localName}님 기권`); else goSendFn && goSendFn({ t: "res", tb: T.i, gid: G.gid }); },
  onUndo: () => { const T = panelT, G = T && T.game, me = myColor(T); if (!G || !isHost(T) || G.ai < 0 || G.status !== "play" || !me) return; T.thinking = 0; let k = 0; while (G.moves.length && k < 2) { G.moves.pop(); k++; const b = fromMoves(G.size, G.moves); if (b && b.turn === me) break; } hostChanged(T); showToast("한 수 물렀습니다."); },
  onNew: () => { if (panelT) { panel.setup(true, panelT.game ? panelT.game.size : panelT.nDef); } },
  onStart: opt => { if (panelT) startGame(panelT, opt); },
  onLeave: () => stand(),
  onClose: () => { panel.close(); if (sitting && !COARSE) showToast("바둑판을 닫았습니다. B 키로 다시 열 수 있어요."); }
});
function openPanel(T, setup = false) {
  panelT = T; panel.open(T.name); if (fp && fpLocked()) document.exitPointerLock();
  if (setup) panel.setup(true, T.nDef); else { panel.setup(false); refreshPanel(); }
}
function watchTable(T) { panelT = T; panel.open(T.name + (myColor(T) ? "" : " · 관전")); panel.setup(false); refreshPanel(); }
function refreshPanel() {
  if (!panelT || !panel.isOpen) return; const T = panelT, G = T.game;
  if (!G) { panel.update({ size: T.nDef, moves: [], names: {}, status: "wait", ai: false }, new Board(T.nDef), 0); panel.setStatus(sitting && sitting.tb === T.i ? "대국 준비 중" : "비어 있는 대국석입니다. 가까이 가서 앉으면(E) 대국을 시작할 수 있어요."); return; }
  const me = myColor(T);
  panel.update({ size: G.size, moves: G.moves, names: { 1: G.p[1] && G.p[1].name, 2: G.p[2] && G.p[2].name }, status: G.status === "scoring" ? "play" : G.status, scoring: G.status === "scoring", result: G.result, reviewTitle: G.result, ai: G.ai >= 0 && isHost(T), thinking: !!T.thinking || G.status === "scoring", score: G.score }, T.board || new Board(G.size), me);
}
setInterval(() => { for (const T of TABLES) if (T.game && isHost(T)) goBroadcast(T); }, 9000); // 가끔 전체 상태를 다시 알린다

// ---------- 전광판 · 자석판: 지금 진행 중인 대국 중계 ----------
function drawScreens() {
  for (const S of SCREENS) {
    const tourOn = (ZONE_T.tour || []).filter(t => t.game && t.game.status !== "wait").sort((a, b) => (b.activeAt || 0) - (a.activeAt || 0))[0];
    const T = S.lab ? ZONE_T.lab.find(t => t.game) || null : S.tour !== undefined ? (ZONE_T.tour[S.tour].game ? ZONE_T.tour[S.tour] : null) : (tourOn || featured), x = S.tv.x, W = S.tv.c.width, H = S.tv.c.height;
    if (S.lab) { x.fillStyle = "#e9e3d4"; x.fillRect(0, 0, W, H); drawGoban(x, T ? T.board : null, T ? T.board.n : 19, 40, 40, W - 80); S.tv.t.needsUpdate = true; continue; }
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1a1f23"); g.addColorStop(1, "#0f1215"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const bs = H - 60; drawGoban(x, T ? T.board : null, T ? T.board.n : 19, 30, 30, bs);
    const X = bs + 70, tw = W - X - 30; x.textAlign = "left"; x.textBaseline = "alphabetic";
    x.fillStyle = "#c9a55f"; x.font = "700 30px 'Noto Serif KR', serif"; x.fillText(S.tour !== undefined ? `대회실 제${S.tour + 1} 대국석` : T && T.zone === "tour" ? "🏆 대회실 생중계" : "無量棋院 대국 중계", X, 74);
    x.fillStyle = "#8a8f93"; x.font = "500 20px sans-serif"; x.fillText("MURYANG BADUK INSTITUTE · LIVE", X, 104);
    if (!T || !T.game) { x.fillStyle = "#e9e4d8"; x.font = "600 28px sans-serif"; x.fillText("오늘의 대국을 기다립니다", X, 190); x.fillStyle = "#9da3a7"; x.font = "500 22px sans-serif"; x.fillText("빈 대국석에 앉아(E)", X, 236); x.fillText("한 판 시작해 보세요", X, 268); x.fillStyle = "#c9a55f"; x.font = "600 24px 'Noto Serif KR', serif"; x.fillText("無量之棋 · 無盡之道", X, H - 50); S.tv.t.needsUpdate = true; continue; }
    const G = T.game, b = T.board; x.fillStyle = "#e9e4d8"; x.font = "600 24px sans-serif"; x.fillText(T.name, X, 160);
    for (const [i, c] of [[0, BLACK], [1, WHITE]]) { const y = 220 + i * 74; x.fillStyle = c === BLACK ? "#111" : "#f2f0ea"; x.beginPath(); x.arc(X + 18, y - 9, 17, 0, 7); x.fill(); x.strokeStyle = "#777"; x.lineWidth = 2; x.stroke(); x.fillStyle = b.turn === c && G.status === "play" ? "#f0d18a" : "#e9e4d8"; x.font = "600 26px sans-serif"; x.fillText((G.p[c] ? G.p[c].name : "기다리는 중").slice(0, 12), X + 48, y); x.fillStyle = "#9da3a7"; x.font = "500 19px sans-serif"; x.fillText("따낸 돌 " + b.cap[c], X + 48, y + 28); }
    x.fillStyle = "#c9a55f"; x.font = "600 24px sans-serif"; x.fillText(G.status === "end" ? "대국 종료" : G.status === "wait" ? "상대를 기다리는 중" : G.status === "scoring" ? "계가 중" : `${G.moves.length}수 · ${colName(b.turn)} 차례`, X, 400);
    if (G.status === "end" && G.result) { x.fillStyle = "#e9e4d8"; x.font = "500 20px sans-serif"; const words = G.result.split(" "); let line = "", y = 440; for (const w of words) { if (x.measureText(line + w).width > tw) { x.fillText(line, X, y); line = ""; y += 28; } line += w + " "; } x.fillText(line, X, y); }
    if (G.status === "play" && typeof T.evalB === "number") { const y = H - 70, w = tw; x.fillStyle = "#f2f0ea"; x.fillRect(X, y, w, 18); x.fillStyle = "#111"; x.fillRect(X, y, w * T.evalB, 18); x.strokeStyle = "#777"; x.strokeRect(X, y, w, 18); x.fillStyle = "#9da3a7"; x.font = "500 18px sans-serif"; x.fillText(`형세 · 흑 ${Math.round(T.evalB * 100)}% : 백 ${100 - Math.round(T.evalB * 100)}%`, X, y - 10); }
    S.tv.t.needsUpdate = true;
  }
}
drawScreens();

// ---------- 소리: WebAudio 합성 (바깥 바람·새 / 실내 고요함과 먼 돌 소리 / 내 돌 놓는 소리) ----------
const Snd = (() => {
  let ac, master, fx, roomBus, nb, wind, leaf, room0, birdBus, started = false, muted = false, nextBird = 0, nextClack = 0;
  try { muted = localStorage.getItem("giwon-mute") === "1"; } catch (e) {}
  const VOL_DEF = { master: 1, nature: 1, room: .8, stone: 1 }, VOL = { ...VOL_DEF };
  try { const sv = JSON.parse(localStorage.getItem("giwon-vol") || "null"); if (sv) for (const k in VOL_DEF) if (typeof sv[k] === "number") VOL[k] = Math.max(0, Math.min(1, sv[k])); } catch (e) {}
  const saveVol = () => { try { localStorage.setItem("giwon-vol", JSON.stringify(VOL)); } catch (e) {} };
  const btn = $("#mute-toggle"), show = () => { btn.textContent = muted ? "🔇" : "🔊"; btn.setAttribute("aria-pressed", String(muted)); btn.title = muted ? "소리 켜기 (M)" : "소리 끄기 (M)"; }; show();
  const R = (a, b) => a + Math.random() * (b - a);
  const tone = (f, t, dur, v, dest, type = "sine", to) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05); };
  const noiseLoop = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = nb; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(master); s.start(); return g; };
  const clack = (t, v, pan = 0, dest = fx) => { // 바둑돌이 비자나무 판에 닿는 소리: 짧고 단단한 "딱"
    const out = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain(); if (out.pan) out.pan.value = pan; out.connect(dest);
    const s = ac.createBufferSource(); s.buffer = nb; const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = R(2600, 3300); bp.Q.value = 2.2; const g = ac.createGain(); g.gain.setValueAtTime(v * .9, t); g.gain.exponentialRampToValueAtTime(.0001, t + .045); s.connect(bp); bp.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + .06);
    tone(R(880, 1020), t, .07, v * .32, out, "triangle", 620); tone(170, t, .09, v * .5, out, "sine", 90); // 판 울림
  };
  function start() {
    ac = new (window.AudioContext || window.webkitAudioContext)(); nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    master = ac.createGain(); master.gain.value = muted ? 0 : .8 * VOL.master; master.connect(ac.destination);
    fx = ac.createGain(); fx.gain.value = VOL.stone; fx.connect(master); roomBus = ac.createGain(); roomBus.gain.value = VOL.room; roomBus.connect(master); birdBus = ac.createGain(); birdBus.gain.value = VOL.nature; birdBus.connect(master);
    wind = noiseLoop("lowpass", 420, .7); leaf = noiseLoop("highpass", 5000, .4); room0 = noiseLoop("lowpass", 180, .5); started = true;
  }
  function update() {
    if (!started) return; const t = ac.currentTime, indoor = localAvatar.position.x > 500;
    master.gain.setTargetAtTime(muted ? 0 : .8 * VOL.master, t, .15); fx.gain.setTargetAtTime(VOL.stone, t, .1); birdBus.gain.setTargetAtTime(indoor ? 0 : VOL.nature, t, .4);
    wind.gain.setTargetAtTime(indoor ? 0 : (.035 + .03 * Math.sin(t * .23) ** 2) * VOL.nature, t, 1.2); leaf.gain.setTargetAtTime(indoor ? 0 : (.006 + .01 * Math.sin(t * .31) ** 2) * VOL.nature, t, 1);
    room0.gain.setTargetAtTime(indoor ? .045 * VOL.room : 0, t, .8);
    if (t > nextBird && !indoor) { const f = R(2600, 4200); for (let i = 0; i < 2 + Math.floor(R(0, 3)); i++) tone(f * (1 + i * .08), t + i * .11, .09, .05, birdBus, "sine", f * R(1.1, 1.4)); nextBird = t + R(1.5, 5); }
    roomBus.gain.setTargetAtTime(VOL.room, t, .2);
    if (t > nextClack && indoor) { const inHall = localAvatar.position.z < 7; clack(t + .02, inHall ? .13 : .05, R(-.8, .8), roomBus); nextClack = t + R(inHall ? 2.5 : 5, inHall ? 8 : 14); } // 대국장 어딘가에서 들려오는 돌 소리
  }
  const kick = () => { try { if (!ac) start(); else if (ac.state === "suspended") ac.resume(); } catch (e) { console.warn("오디오를 시작하지 못했습니다", e); } };
  addEventListener("pointerdown", kick); addEventListener("keydown", kick);
  document.addEventListener("visibilitychange", () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
  btn.addEventListener("click", () => { muted = !muted; try { localStorage.setItem("giwon-mute", muted ? "1" : "0"); } catch (e) {} if (master) master.gain.setTargetAtTime(muted ? 0 : .8 * VOL.master, ac.currentTime, .08); show(); });
  setInterval(update, 250);
  return { vol: VOL, setVol: (k, v) => { if (k in VOL) { VOL[k] = Math.max(0, Math.min(1, v)); saveVol(); } }, resetVol: () => { Object.assign(VOL, VOL_DEF); saveVol(); }, stone: (v = 1) => { if (started && !muted) clack(ac.currentTime + .01, .55 * v); },
    ding: () => { if (!started || muted) return; const t = ac.currentTime + .02; tone(1318, t, .9, .12, fx); tone(1046, t + .32, 1.2, .1, fx); },
    pour: k => { if (!started || muted) return; const t = ac.currentTime + .02, s = ac.createBufferSource(); s.buffer = nb; const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = k === 2 ? 900 : 1500; f.Q.value = .8; const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .15); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4); s.connect(f); f.connect(g); g.connect(fx); s.start(t); s.stop(t + 1.5); if (k === 2) for (let i = 0; i < 4; i++) tone(2600 + i * 90, t + 1.5 + i * .18, .08, .05, fx, "triangle"); } };
})();

// ---------- 낮밤: 실제 시간 ----------
const clock = new THREE.Clock();
const clamp01 = v => Math.max(0, Math.min(1, v)), smooth = v => v * v * (3 - 2 * v), mixN = (a, b, t) => a + (b - a) * t;
const PHASES = [["심야", 1, "#0a1024"], ["새벽", 5, "#d8a3a0"], ["아침", 9, "#c4d6dc"], ["한낮", 13, "#bcd6e8"], ["노을", 17, "#f2a370"], ["밤", 21, "#161f3a"]].map(([name, h, c]) => ({ name, h, c: new THREE.Color(c) }));
const moonLight = new THREE.DirectionalLight("#9db4ff", 0); scene.add(moonLight);
const starPos = new Float32Array(900 * 3);
for (let i = 0; i < 900; i++) { const a = Math.random() * Math.PI * 2, u = Math.random() * .96 + .04, r = Math.sqrt(1 - u * u) * 430; starPos[i * 3] = Math.cos(a) * r; starPos[i * 3 + 1] = u * 430; starPos[i * 3 + 2] = Math.sin(a) * r; }
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: "#ffffff", size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(stars);
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffe9a8", fog: false }));
const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 12), new THREE.MeshBasicMaterial({ color: "#f4f2e6", fog: false })); scene.add(sunDisc, moonDisc);
const timeChip = document.createElement("div"); timeChip.className = "time-chip"; root.appendChild(timeChip);
let hourOverride = null, lastChipMin = -1, previewStep = -1; const qh = parseFloat(new URLSearchParams(location.search).get("hour")); if (Number.isFinite(qh)) hourOverride = ((qh % 24) + 24) % 24;
addEventListener("keydown", e => { if (e.code !== "KeyT" || (e.target.closest && e.target.closest("textarea,input,dialog"))) return; previewStep += 1; if (previewStep >= 6) { previewStep = -1; hourOverride = null; } else hourOverride = PHASES[previewStep].h; lastChipMin = -1; });
const sunDir = new THREE.Vector3(), tmpC = new THREE.Color(), C_WARM = new THREE.Color("#fff0d4"), C_SUNY = new THREE.Color("#ffe9a8"), C_HEMI = new THREE.Color("#fff3dd"), C_GRN = new THREE.Color("#59634f"), C_IN = new THREE.Color("#e9edf0");
function updateSky() {
  const d = new Date(), hr = hourOverride !== null ? hourOverride : d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const ang = Math.PI * (hr - 6) / 12, e = Math.sin(ang);
  sunDir.set(-Math.cos(ang) * .85, Math.sin(ang), .5).normalize();
  const dayF = smooth(clamp01((e + .1) / .45)), tint = smooth(clamp01(e * 2.6)), night = 1 - dayF;
  const t = hr < 1 ? hr + 24 : hr; let i = 5; for (let k = 0; k < 6; k++) if (t >= PHASES[k].h && t < PHASES[k].h + 4) { i = k; break; }
  inDim += (inDimT - inDim) * .08; const ind = inDim;
  tmpC.copy(PHASES[i].c).lerp(PHASES[(i + 1) % 6].c, smooth((t - PHASES[i].h) / 4)); scene.background.copy(tmpC); scene.fog.color.copy(tmpC);
  if (ind > .5) { scene.background.copy(C_IN).multiplyScalar(.85); scene.fog.color.copy(C_IN); scene.fog.density = .0016; } else scene.fog.density = .0036;
  sun.position.copy(sunDir).multiplyScalar(80); sun.intensity = 3.0 * smooth(clamp01((e + .03) / .3)); sun.color.set("#ff7a3d").lerp(C_WARM, tint); sun.castShadow = e > .04;
  moonLight.position.copy(sunDir).multiplyScalar(-70); moonLight.position.y = Math.max(8, moonLight.position.y); moonLight.intensity = 1.35 * smooth(clamp01((-e + .02) / .3));
  hemi.intensity = mixN(1.15, 1.7, dayF); hemi.color.set("#8294cc").lerp(C_HEMI, dayF); hemi.groundColor.set("#222a3a").lerp(C_GRN, dayF);
  fill.intensity = .7 * dayF; renderer.toneMappingExposure = mixN(1.18, 1.1, dayF);
  // 실내: 바깥 햇빛 대신 고르게 밝은 실내 조명 (밤낮과 관계없이)
  sun.intensity *= 1 - .95 * ind; moonLight.intensity *= 1 - .95 * ind; fill.intensity = mixN(fill.intensity, .9, ind);
  hemi.intensity = mixN(hemi.intensity, 1.9, ind); hemi.color.lerp(C_HEMI, ind); hemi.groundColor.lerp(C_GRN, ind); renderer.toneMappingExposure = mixN(renderer.toneMappingExposure, 1.12, ind);
  stars.material.opacity = clamp01((-e - .05) / .4) * (1 - ind);
  sunDisc.position.copy(sunDir).multiplyScalar(400); sunDisc.visible = e > -.12 && ind < .5; sunDisc.material.color.set("#ff9a55").lerp(C_SUNY, tint);
  moonDisc.position.copy(sunDir).multiplyScalar(-400); moonDisc.visible = e < .12 && ind < .5;
  { const md = e > -.02 ? sunDir : AV_MOON.copy(sunDir).negate(); AV.uL.value.copy(md).lerp(AV_IN, ind).normalize(); AV.uK.value = Math.max(.6, mixN(.9, 1, dayF) * (1 - .1 * ind) + .1 * ind); AV.uTint.value.copy(AV_NIGHT).lerp(AV_DAY, Math.max(dayF, ind)); }
  Q.sky({ hor: scene.background, sunDir, e, dayF, tint, night, ind, sunCol: sunDisc.material.color });
  for (const { m, base } of nightMats) m.emissiveIntensity = base * night;
  const lf = mixN(.6, 2.0, night); for (const n of nightLights) n.l.intensity = n.base * (n.l.parent === inner ? 1 : lf);
  for (const lp of LAMPS) lp.material.color.setScalar(.55 + .45 * night);
  const mins = Math.floor(hr * 60);
  if (mins !== lastChipMin) { lastChipMin = mins; const p2 = n => String(n).padStart(2, "0"); timeChip.textContent = `${PHASES[Math.floor(((hr + 1) % 24) / 4)].name} · ${p2(Math.floor(hr))}:${p2(Math.floor(hr % 1 * 60))}${hourOverride !== null ? " (미리보기)" : ""}`; }
}
updateSky();
Q.addGrass((x, z) => {
  if (Math.abs(x) > 62 || z < -46 || z > 44 || groundY(x, z) > .001 || blocked(x, z)) return false;
  for (const [px, pz, len, w, a] of PATHS) { const dx = x - px, dz = z - pz, c = Math.cos(a), sn = Math.sin(a), lx = dx * c - dz * sn, lz = dx * sn + dz * c; if (Math.abs(lx) < w / 2 + .5 && Math.abs(lz) < len / 2 + .5) return false; }
  if (Math.abs(x) < BLD.w / 2 + 6 && z > BLD.z - BLD.d / 2 - 3 && z < FRONT + 8) return false;
  return true;
});

// ---------- 스크린샷 · 설정 ----------
let shotReq = false; const shotFlash = document.createElement("div"); shotFlash.className = "shot-flash"; root.appendChild(shotFlash);
function doShot() {
  shotReq = false;
  try {
    const cv = document.createElement("canvas"); cv.width = dom.width; cv.height = dom.height; const x = cv.getContext("2d"); x.drawImage(dom, 0, 0);
    const fs = Math.max(12, Math.round(cv.height * .022)); x.font = `600 ${fs}px "Noto Serif KR", serif`; x.textAlign = "right"; x.fillStyle = "rgba(255,248,230,.88)"; x.shadowColor = "rgba(0,0,0,.65)"; x.shadowBlur = fs * .35; x.fillText("無量棋院 · MURYANG BADUK INSTITUTE", cv.width - fs, cv.height - fs);
    shotFlash.classList.remove("go"); void shotFlash.offsetWidth; shotFlash.classList.add("go");
    cv.toBlob(async blob => {
      if (!blob) { showToast("스크린샷을 만들지 못했습니다."); return; }
      const d = new Date(), z = n => String(n).padStart(2, "0"), name = `muryanggiwon_${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.png`;
      if (/iP(hone|ad|od)/.test(navigator.userAgent) && navigator.canShare) { try { const f = new File([blob], name, { type: "image/png" }); if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "무량기원" }); return; } } catch (e) { if (e && e.name === "AbortError") return; } }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); showToast("스크린샷을 저장했습니다. 📷");
    }, "image/png");
  } catch (e) { showToast("스크린샷을 만들지 못했습니다."); }
}
$("#shot-toggle").addEventListener("click", () => { shotReq = true; });
const settingsPanel = $("#settings-panel"), volRows = [...settingsPanel.querySelectorAll("input[data-vol]")];
const syncVol = () => volRows.forEach(r => { r.value = Math.round(Snd.vol[r.dataset.vol] * 100); r.nextElementSibling.textContent = r.value + "%"; r.style.setProperty("--pct", r.value + "%"); });
$("#settings-toggle").addEventListener("click", e => { e.stopPropagation(); settingsPanel.hidden = !settingsPanel.hidden; });
$("#settings-close").addEventListener("click", () => { settingsPanel.hidden = true; });
dom.addEventListener("pointerdown", () => { settingsPanel.hidden = true; });
volRows.forEach(r => { r.addEventListener("input", () => { Snd.setVol(r.dataset.vol, r.value / 100); r.nextElementSibling.textContent = r.value + "%"; r.style.setProperty("--pct", r.value + "%"); }); r.addEventListener("change", () => r.blur()); });
$("#vol-reset").addEventListener("click", () => { Snd.resetVol(); syncVol(); });
syncVol();

// ---------- 모바일: 행동 버튼은 하단 막대 ----------
const mqMob = matchMedia("(pointer:coarse), (max-width:760px)"), ctxHost = $("#ctx-actions"), actToggle = $("#act-toggle"), vPanel = $(".visitor-panel");
const G1 = ["elev-button", "npc-button", "sit-button", "board-button", "watch-button", "coffee-button", "water-button", "shelf-button", "drop-button", "learn-button", "greet-button"], G2 = ["warm-button", "talk-button", "live-button", "kibo-button", "fp-button", "main-quick"];
const ctxMarks = [...G1, ...G2].map(id => { const b = $("#" + id), m = document.createComment(id); b.parentNode.insertBefore(m, b); b.dataset.grp = G1.includes(id) ? "1" : "2"; return [b, m]; });
let actMode = 1;
function setActMode(m) { actMode = m; ctxHost.dataset.mode = String(m); actToggle.setAttribute("aria-expanded", String(m === 2)); const l = actToggle.querySelector("span"); if (l) l.textContent = m === 2 ? "접기" : "행동"; }
function layoutMobile() { const mob = mqMob.matches; for (const [b, m] of ctxMarks) { if (mob) ctxHost.appendChild(b); else m.parentNode.insertBefore(b, m.nextSibling); } if (mob) setActMode(1); vPanel.classList.remove("sheet-open"); }
layoutMobile(); if (mqMob.addEventListener) mqMob.addEventListener("change", layoutMobile); else if (mqMob.addListener) mqMob.addListener(layoutMobile);
actToggle.addEventListener("click", e => { e.stopPropagation(); setActMode(actMode === 1 ? 2 : actMode === 2 ? 0 : 1); });
ctxHost.addEventListener("click", e => { if (mqMob.matches && actMode === 2 && e.target.closest(".action-button[data-grp='2']")) setActMode(1); });
{ const nb = document.createElement("button"); nb.type = "button"; nb.className = "action-button action-primary"; nb.id = "near-enter"; nb.hidden = true; ctxHost.insertBefore(nb, ctxHost.firstChild); let dir = null;
  setInterval(() => { if (!mqMob.matches || sitting) { nb.hidden = true; return; } const p = localAvatar.position; dir = p.x > 500 ? (p.z > ID / 2 - 6 && Math.abs(p.x - IX) < 8 ? "out" : null) : (Math.abs(p.x) < 15 && p.z > FRONT - 1 && p.z < FRONT + 14 ? "in" : null); nb.hidden = !dir || !!portalNow; if (dir) nb.textContent = dir === "in" ? "🏛 무량기원 입장" : "↩ 밖으로 나가기"; }, 300);
  nb.addEventListener("click", () => { if (dir) doPortal(dir); }); }

// ---------- 바로 대국하기: 대국장의 빈 자리로 ----------
function goPlayNow() {
  $("#settings-panel").hidden = true;
  const free = ZONE_T.hall.find(T => !T.game && !T.seats.some(seatTaken)) || ZONE_T.hall.find(T => !T.game) || ZONE_T.hall[0];
  const s = free.seats[0];
  cutThrough(() => { teleport(s.x - Math.sin(s.ry) * 1.6, s.z - Math.cos(s.ry) * 1.6, s.ry); setTimeout(() => { if (!sitting) sit(s); }, 120); });
}
$("#enter-main").addEventListener("click", goPlayNow); $("#main-quick").addEventListener("click", goPlayNow);
// ---------- 버튼 패널 접기/펴기 (데스크톱) ----------
(() => {
  const btn = $("#panel-fold"), panel = $(".visitor-panel"); let folded = false;
  try { folded = localStorage.getItem("muryang-fold") === "1"; } catch (e) {}
  const apply = () => { panel.classList.toggle("folded", folded); btn.setAttribute("aria-expanded", String(!folded)); btn.textContent = folded ? "▴" : "▾"; btn.title = folded ? "행동 버튼 펴기" : "행동 버튼 접기"; };
  apply(); btn.addEventListener("click", e => { e.stopPropagation(); folded = !folded; apply(); try { localStorage.setItem("muryang-fold", folded ? "1" : "0"); } catch (e2) {} });
})();

// ---------- v30: UI 숨김 전체화면 (U) ----------
{
  const btn = document.getElementById("ui-toggle"), ex = document.getElementById("ui-exit"), el = document.documentElement;
  let on = false;
  const setUI = v => {
    on = v; if (!v) tapShow = false; document.body.classList.toggle("ui-off", v); ex.hidden = !v;
    try { if (v && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); else if (!v && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
  };
  btn.addEventListener("click", () => { if (true) { try { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => showToast("이 브라우저는 전체화면을 지원하지 않습니다.")); else showToast("이 브라우저는 전체화면을 지원하지 않습니다. 홈 화면에 추가하면 전체화면으로 열려요."); } catch (e) {} } }); ex.addEventListener("click", () => setUI(false));
  let tapShow = false; $("#ui-hide").addEventListener("click", () => { on = true; document.body.classList.add("ui-off"); ex.hidden = false; tapShow = true; });
  { let d0 = null; addEventListener("pointerdown", e => { d0 = [e.clientX, e.clientY]; }, true);
    addEventListener("pointerup", e => { if (!tapShow || !on) { tapShow = false; return; } if (e.target !== dom || (d0 && Math.hypot(e.clientX - d0[0], e.clientY - d0[1]) > 10)) return; tapShow = false; uiEat = true; setTimeout(() => { uiEat = false; }, 60); setUI(false); }, true); } // 모바일: 전체화면 없이 UI만 숨기기
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && on) setUI(false); });
  addEventListener("keydown", e => { if (e.code === "Escape" && on) setUI(false); });
}

// =====================================================================
// v2: 엘리베이터 · 2층(대국실 · 대회실) · 다과 코너 · 소파 · 안내 NPC · 회원 · 강좌 · 기보 · 중계
// =====================================================================
const RX2 = x => IX2 + x, inWall2 = (x0, x1, z0, z1) => wallBox(RX2(x0), RX2(x1), z0, z1);
const ELEV = { x: -8.6 }; // 로비 입구 왼편(안에서 출입문을 보면 오른쪽)
function elevator(g, label) { // 금속 문 두 짝 + 층 표시 + 호출 버튼
  const e = new THREE.Group(); e.position.set(ELEV.x, 0, ID / 2 - .02); e.rotation.y = Math.PI; g.add(e);
  box(e, 0, 1.55, -.02, 3.0, 3.1, .08, M.metal2); const doors = [];
  for (const sx of [-1, 1]) { const d = box(e, sx * .63, 1.42, .03, 1.24, 2.8, .05, M.steel); d.castShadow = false; doors.push(d); }
  box(e, 0, 1.42, .05, .02, 2.8, .02, M.metal); const ds = textSign([[label, .6, "#ff9a5a", "700"]], .7, .3, { bg: "#141618", res: 256, metal: 0, rough: .6, glow: "#ff8a4a", glowK: .2 }); ds.position.set(0, 3.35, .04); e.add(ds);
  box(e, 1.85, 1.2, .02, .16, .32, .04, M.steel); cylinder(e, 1.85, 1.27, .05, .035, .035, .02, glow("#ffd27a"), 12).rotation.x = Math.PI / 2; cylinder(e, 1.85, 1.13, .05, .035, .035, .02, glow("#ffd27a"), 12).rotation.x = Math.PI / 2;
  const sg = textSign([["🛗 엘리베이터 · ELEVATOR", .5, "#2a2c2e", "700"]], 2.2, .3, { bg: "rgba(244,242,236,.96)", res: 512, metal: 0, rough: .8 }); sg.position.set(0, 3.75, .04); e.add(sg);
  return { g: e, doors };
}
// ---------- 1층: 엘리베이터 · 다과 코너(정수기 · 믹스커피) ----------
const ELEV1 = elevator(inner, "1F");
{ const g = inner, tc = new THREE.Group(); tc.position.set(24, 0, 0); g.add(tc);
  box(tc, 0, .45, 5.9, 5, .9, .7, M.white); box(tc, 0, .92, 5.9, 5.1, .05, .78, M.wood2);
  // 정수기
  const wd = new THREE.Group(); wd.position.set(3.25, 0, 4.4); tc.add(wd); box(wd, 0, .6, 0, .46, 1.2, .46, mat("#f2f3f1", .4)); box(wd, 0, .95, .235, .3, .3, .02, mat("#d8dcdc", .3));
  const bt = add(wd, new THREE.CylinderGeometry(.19, .19, .52, 20), new THREE.MeshStandardMaterial({ color: "#7cc3e8", roughness: .1, transparent: true, opacity: .6 }), 0, 1.47, 0); bt.castShadow = false; cylinder(wd, 0, 1.75, 0, .08, .12, .08, mat("#7cc3e8", .2), 12);
  box(wd, -.07, .92, .25, .05, .05, .05, mat("#3a7bd5", .4)); box(wd, .07, .92, .25, .05, .05, .05, mat("#d5453a", .4)); box(wd, 0, .78, .2, .3, .03, .14, M.metal2);
  inWall(24 + 2.95, 24 + 3.55, 4.1, 4.7);
  // 믹스커피 상자 · 종이컵 · 전기포트
  const mix = box(tc, -1.2, 1.06, 5.85, .44, .24, .16, mat("#f2c43a", .6)); const ml = textSign([["믹스커피", .55, "#7a3a12", "800"]], .42, .12, { res: 256, metal: 0, rough: .7 }); ml.position.set(-1.2, 1.06, 5.94); tc.add(ml);
  for (let i = 0; i < 6; i++) { const s = cylinder(tc, -1.38 + i * .07, 1.25, 5.85, .012, .012, .12, mat("#f2c43a", .6), 5); s.rotation.z = (i - 2.5) * .05; }
  for (let i = 0; i < 4; i++) cylinder(tc, -.35, .98 + i * .045, 5.85, .065 - i * .001, .05, .1, PROP_M.cup, 12);
  cylinder(tc, .5, 1.08, 5.85, .12, .13, .26, mat("#2c3136", .3, .6), 16); box(tc, .5, 1.13, 5.72, .03, .14, .06, M.metal);
  cylinder(tc, 1.3, 1.0, 5.85, .16, .12, .08, M.white, 16); // 스틱 꽂이 접시
  const sg = textSign([["다과 코너 · 茶菓", .5, "#2a2c2e", "700"], ["정수기 · 믹스커피는 자유롭게 드세요", .26, "#7a6a50", "600"]], 3.4, .6, { bg: "rgba(244,242,236,.96)", res: 1024, metal: 0, rough: .8, ys: [.38, .78] }); sg.position.set(0, 2.2, 6.4); sg.rotation.y = Math.PI; tc.add(sg);
  inWall(21.4, 26.6, 5.5, 6.3);
}
const TEA = { x: IX + 24, z: 4.6 };
// 로비 왼쪽 소파 자리는 엘리베이터 앞이 되었으니, 소파를 탁자 안쪽으로 옮겼다 (설치 코드에서 처리)
// ---------- 2층 ----------
const up = new THREE.Group(); up.position.set(IX2, 0, 0); world.add(up);
const TOUR_T = [], ROOM_T = [];
{
  const g = up;
  const fl = add(g, new THREE.PlaneGeometry(IW, ID), M.floor, 0, 0, 0); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
  box(g, 0, .01, (4 - ID / 2) / 2, IW - .4, .02, 4 + ID / 2 - .2, mat("#2a3440", 1)).castShadow = false; // 대회실 카펫
  box(g, 0, .012, 13, 24, .02, 18, M.stone).castShadow = false; // 복도
  for (const [x, z, ry, w] of [[0, -ID / 2, 0, IW], [0, ID / 2, Math.PI, IW], [-IW / 2, 0, Math.PI / 2, ID], [IW / 2, 0, -Math.PI / 2, ID]]) { const wl = add(g, new THREE.PlaneGeometry(w, IH), M.plaster, x, IH / 2, z); wl.rotation.y = ry; wl.castShadow = false; wl.userData.noFade = true; const bs = add(g, new THREE.PlaneGeometry(w, .14), M.woodDark, x + Math.sin(ry) * .01, .07, z + Math.cos(ry) * .01); bs.rotation.y = ry; bs.castShadow = false; bs.userData.noFade = true; }
  const ce = add(g, new THREE.PlaneGeometry(IW, ID), M.white, 0, IH, 0); ce.rotation.x = Math.PI / 2; ce.castShadow = false; ce.userData.noFade = true;
  const lines = []; for (const x of [-20, -8, 0, 8, 20]) for (let z = -20; z <= 20; z += 2.6) lines.push([x, z]); const li = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .05, 1), M.lampOn, lines.length); lines.forEach(([x, z], i) => li.setMatrixAt(i, M4.compose(V3.set(x, IH - .03, z), QI, S3.set(1, 1, 2.2)))); li.castShadow = false; li.userData.noFade = true; g.add(li);
  wallBox(RX2(-IW / 2 - 1), RX2(-IW / 2 + .2), -ID / 2 - 1, ID / 2 + 1); wallBox(RX2(IW / 2 - .2), RX2(IW / 2 + 1), -ID / 2 - 1, ID / 2 + 1); wallBox(RX2(-IW / 2), RX2(IW / 2), -ID / 2 - 1, -ID / 2 + .2); wallBox(RX2(-IW / 2), RX2(IW / 2), ID / 2 - .2, ID / 2 + 1);
  const W2 = mat("#ebe6dc", .7), wall = (x0, z0, x1, z1, h = 3.4) => { const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0); const m = add(g, new THREE.BoxGeometry(.18, h, L), W2, (x0 + x1) / 2, h / 2, (z0 + z1) / 2); m.rotation.y = a; inWall2(Math.min(x0, x1) - .1, Math.max(x0, x1) + .1, Math.min(z0, z1) - .1, Math.max(z0, z1) + .1); };
  // 대회실과 앞쪽(복도·대국실) 사이 벽: 가운데 넓은 출입구
  wall(-28, 4, -4, 4); wall(4, 4, 28, 4);
  for (const sx of [-4, 4]) box(g, sx, 1.7, 4, .3, 3.4, .3, M.woodDark);
  const s1 = textSign([["대회실", .52, "#2a2c2e", "700"], ["大會室 · TOURNAMENT HALL", .26, "#8a7350", "600"]], 4.4, .8, { bg: "rgba(244,242,236,.96)", res: 1024, metal: 0, rough: .8, ys: [.4, .8] }); s1.position.set(0, 3.75, 4.12); g.add(s1);
  // 대국실 4칸 (복도 양옆, 전통 바둑판 · 방석)
  for (const sx of [-1, 1]) { wall(sx * 12, 4, sx * 12, 7.2); wall(sx * 12, 10.2, sx * 12, 16.2); wall(sx * 12, 19.2, sx * 12, 22); wall(sx * 12, 13, sx * 28, 13); }
  let rn = 1;
  for (const sx of [-1, 1]) for (const z of [8.6, 17.6]) {
    const x = sx * 20, T = makeGoTable(up, x, z, { kind: "floor", name: `2층 대국실 ${rn}`, zone: "room", ry: Math.PI / 2 }); ROOM_T.push(T);
    const mt = box(g, x, .012, z, 5.6, .02, 4.2, mat("#cfc29a", 1)); mt.castShadow = false; // 돗자리
    const sc = textSign([rn % 2 ? "手談" : "坐隱"], .9, 2.4, { vertical: true, color: "#1f1f1f", bg: "#efe6d2", res: 256, metal: 0, rough: .9 }); sc.position.set(sx * 27.85, 2.2, z); sc.rotation.y = -sx * Math.PI / 2; g.add(sc);
    const dz = z < 13 ? 8.7 : 17.7, ds = textSign([[`대국실 ${rn}`, .52, "#2a2c2e", "700"], ["對局室", .3, "#8a7350", "600"]], 1.5, .5, { bg: "rgba(244,242,236,.96)", res: 512, metal: 0, rough: .8, ys: [.38, .78] }); ds.position.set(sx * 11.88, 2.6, dz + (z < 13 ? 0 : 0) + 0); ds.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(ds);
    rn++;
  }
  // 대회실: 무대 · 대회 대국석 2 · 전광판 2 · 관객석
  const stage = box(g, 0, .15, -16.6, 28, .3, 10, mat("#3b2e26", .6)); stage.castShadow = false; box(g, 0, .305, -16.6, 26, .01, 8.6, mat("#7b2f2a", 1)).castShadow = false;
  for (const [i, x] of [-6.5, 6.5].entries()) { const T = makeGoTable(up, x, -16.4, { kind: "chair", name: `대회실 제${i + 1} 대국석`, zone: "tour", y: .3 }); TOUR_T.push(T); box(T.g, .52, .87, .52, .26, .1, .14, M.ink); box(T.g, .52, .875, .59, .2, .06, .02, glow("#ff7a5a")); }
  for (const [i, x] of [-6.5, 6.5].entries()) { const tv = screenTex(), m = add(g, new THREE.PlaneGeometry(8.4, 5.25), new THREE.MeshBasicMaterial({ map: tv.t }), x, 3.4, -ID / 2 + .12); m.castShadow = false; box(g, x, 3.4, -ID / 2 + .05, 8.7, 5.5, .08, M.ink); SCREENS.push({ tv, m, tour: i }); }
  const bn = textSign([["제1회 무량배 바둑대회", .4, "#e0bd72", "700"], ["無量杯 · MURYANG CUP", .24, "#c9b083", "600"]], 7, 1.1, { bg: "#1b1f22", res: 1024, metal: .2, rough: .5, ys: [.42, .8], glow: "#ffcf80", glowK: .3 }); bn.position.set(0, 5.6, -ID / 2 + .1); g.add(bn);
  for (const z of [-8.4, -5.6, -2.8, 0]) for (const x0 of [-7.5, 7.5]) { const bg = new THREE.Group(); bg.position.set(x0, 0, z); bg.rotation.y = Math.PI; g.add(bg); box(bg, 0, .42, 0, 9, .08, .6, M.wood2); box(bg, 0, .75, -.32, 9, .6, .06, M.wood2); for (const k of [-4.2, 0, 4.2]) box(bg, k, .2, 0, .1, .4, .5, M.metal); for (let k = 0; k < 9; k++) regSeat(bg, -4 + k, 0, .08, Math.PI, "sofa"); inWall2(x0 - 4.6, x0 + 4.6, z - .4, z + .4); }
  // 복도: 엘리베이터 · 층 안내
  const fd = textSign([["2F", .42, "#c9a55f", "800"], ["← 대국실 1·2   대국실 3·4 →", .16, "#f4f2ec", "600"], ["↑ 대회실 · 무량배", .16, "#f4f2ec", "600"]], 2.4, 1.3, { bg: "#24282b", res: 512, metal: .1, rough: .6, ys: [.26, .62, .84] }); fd.position.set(-4.4, 2.2, ID / 2 - .06); fd.rotation.y = Math.PI; g.add(fd);
  for (const x of [-9, 9]) { cylinder(g, x, .4, 21, .32, .25, .8, M.pot, 14); for (let i = 0; i < 5; i++) sphere(g, x + Math.cos(i * 1.3) * .2, 1.1 + i * .15, 21 + Math.sin(i * 1.3) * .2, .38, .3, .38, M.plant, 1); circles.push([RX2(x), 21, .4]); }
  warmLight(g, 0, IH - .6, -12, 4, 30, "#fff1dc"); if (!LQ) warmLight(g, 0, IH - .6, 13, 2.6, 22, "#ffe6c4");
}
const ELEV2 = elevator(up, "2F"); setTimeout(drawScreens, 0);
ZONE_T.tour = TOUR_T; ZONE_T.room = ROOM_T;
const STAGE = { x0: IX2 - 14, x1: IX2 + 14, z0: -21.6, z1: -11.6 };

// ---------- 소파 · 벤치에 앉기: 로비 소파와 바깥 벤치에도 앉는 자리 ----------
// (자리 등록은 설치 코드에 넣었다: kind "sofa")

// ---------- 회원 · 닉네임 · 머리 위 이름표 ----------
const MEM_KEY = "giwon-member", RANKS = ["입문 (처음 배워요)", "18급", "15급", "12급", "10급", "8급", "5급", "3급", "1급", "아마 초단", "아마 2단", "아마 3단", "아마 4단", "아마 5단 이상"];
let member = null; try { const m = JSON.parse(localStorage.getItem(MEM_KEY) || "null"); if (m && typeof m.no === "string") member = m; } catch (e) {}
const saveMember = () => { try { localStorage.setItem(MEM_KEY, JSON.stringify(member)); } catch (e) {} };
const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }; // 밤 12시(이 기기 시간) 기준
const canRename = () => !!member && member.nameDay !== dayKey();
function setTag(av, text, kind) {
  const u = av.userData; if (!text) { if (u.tag) { av.remove(u.tag); u.tag.material.map.dispose(); u.tag.material.dispose(); u.tag = null; } return; }
  if (u.tag && u.tagText === text + kind) return; setTag(av, null);
  const c = document.createElement("canvas"); c.width = 512; c.height = 96; const x = c.getContext("2d"); x.font = "700 44px 'Pretendard Variable', sans-serif"; const w = Math.min(500, x.measureText(text).width + (kind ? 76 : 40));
  x.fillStyle = kind === "staff" ? "rgba(40,52,64,.88)" : "rgba(22,26,30,.78)"; x.beginPath(); x.roundRect ? x.roundRect(256 - w / 2, 12, w, 70, 34) : x.rect(256 - w / 2, 12, w, 70); x.fill();
  if (kind) { x.fillStyle = kind === "staff" ? "#8fd0ff" : "#e6c47e"; x.font = "800 34px sans-serif"; x.textAlign = "left"; x.textBaseline = "middle"; x.fillText(kind === "staff" ? "✦" : "◆", 256 - w / 2 + 18, 48); }
  x.fillStyle = "#f6f2e8"; x.font = "700 44px 'Pretendard Variable', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, 256 + (kind ? 16 : 0), 49);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(2.2, .41, 1); sp.position.set(0, 2.42, 0); sp.renderOrder = 5; av.add(sp); u.tag = sp; u.tagText = text + kind;
}
const refreshMyTag = () => setTag(localAvatar, member ? localName : null, "member");
refreshMyTag();
function setLocalNameMember(n) {
  n = cleanName(n); if (!n || n.length < 2) { showToast("닉네임은 2~12자로 정해 주세요."); return false; }
  if (!member) { showToast("닉네임은 로비 안내 데스크에서 회원 등록 후 정할 수 있어요."); return false; }
  if (!canRename() && n !== localName) { showToast("닉네임은 하루에 한 번만 바꿀 수 있어요. 오늘 밤 12시가 지나면 다시 바꿀 수 있습니다."); return false; }
  member.name = n; member.nameDay = dayKey(); saveMember(); setLocalName(n); refreshMyTag(); return true;
}
{ // 이름 창: 비회원은 무작위 이름만, 회원은 하루 한 번 닉네임 변경
  const dlg = $("#name-dialog"), inp = $("#name-input"), note = document.createElement("p"); note.className = "gp-note name-note"; inp.closest(".field-row").after(note);
  const open = () => { inp.value = localName; const ok = canRename(); inp.disabled = !ok; $("#name-random").hidden = !!member; dlg.querySelector('button[type="submit"]').hidden = !ok && !!member;
    note.textContent = !member ? "닉네임은 로비 안내 데스크에서 무량기원 회원으로 등록하면 정할 수 있어요. 지금은 「무작위」로만 바꿀 수 있습니다." : ok ? "닉네임은 하루에 한 번 바꿀 수 있어요 (밤 12시 기준). 회원 닉네임은 머리 위에 표시됩니다." : "오늘은 이미 닉네임을 바꿨어요. 밤 12시가 지나면 다시 바꿀 수 있습니다.";
    dlg.showModal(); if (ok) setTimeout(() => inp.select(), 50); };
  for (const id of ["#top-chip", "#visitor-name"]) { const o = $(id), c = o.cloneNode(true); o.replaceWith(c); c.addEventListener("click", open); }
  const rb = $("#name-random"), rb2 = rb.cloneNode(true); rb.replaceWith(rb2); rb2.addEventListener("click", () => { if (member) return; const n = nickname(); setLocalName(n); dlg.close(); });
  const fm = $("#name-form"), fm2 = fm.cloneNode(true); fm.replaceWith(fm2);
  fm2.querySelector("#name-cancel").addEventListener("click", () => dlg.close()); fm2.querySelector("#name-random").addEventListener("click", () => { if (member) return; setLocalName(nickname()); dlg.close(); });
  fm2.addEventListener("submit", e => { e.preventDefault(); if (!member) { dlg.close(); return; } if (setLocalNameMember(fm2.querySelector("#name-input").value)) dlg.close(); });
  window.__openNameDlg = open;
}

// ---------- 안내 NPC (로비 안내원 · 교육원 사범) ----------
const NPCS = [];
function makeNPC(name, role, outfit, x, z, ry, opts) {
  const av = makeAvatar(name); av.position.set(x, 0, z); av.rotation.y = ry; world.add(av); setOutfit(av, outfit); setTag(av, name, "staff");
  const n = { av, name, role, x, z, ry, ...opts, greeted: 0 }; av.userData.npc = n; NPCS.push(n); return n;
}
const NPC_DESK = makeNPC("안내원 한결", "무량기원 안내 데스크", { t: 0, r: "#2b3547", p: "#2b3547", k: "#c9a55f", hs: 3, hc: "#3b2a20", a: 64, e: 2, n: 0 }, IX, 10.7, 0, { near: [IX, 12.9], r: 3.4, kind: "desk" });
const NPC_EDU = makeNPC("정 사범", "교육원 · 바둑 사범", { t: 2, r: "#6b5a43", p: "#3a3d42", k: "#c9a55f", hs: 1, hc: "#8f8a84", a: 1, e: 0, n: 0 }, IX - 25.4, 9.4, Math.PI / 2, { near: [IX - 24, 9.6], r: 3.4, kind: "edu" });
const nearNPC = () => { const p = localAvatar.position; if (sitting) return null; for (const n of NPCS) if (Math.hypot(p.x - n.near[0], p.z - n.near[1]) < n.r) return n; return null; };
const npcCard = document.createElement("section"); npcCard.className = "npc-card"; npcCard.hidden = true;
npcCard.innerHTML = `<div class="npc-head"><div><b class="npc-name"></b><small class="npc-role"></small></div><button type="button" class="gp-x" aria-label="닫기">×</button></div><p class="npc-text"></p><div class="npc-form" hidden></div><div class="npc-opts"></div>`;
root.appendChild(npcCard); npcCard.querySelector(".gp-x").addEventListener("click", () => { npcCard.hidden = true; });
let npcNow = null, typeT = 0;
function say(text) { const el = npcCard.querySelector(".npc-text"); clearInterval(typeT); let i = 0; el.textContent = ""; typeT = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(typeT); }, 18); }
function opts(list) { const box = npcCard.querySelector(".npc-opts"); box.innerHTML = ""; npcCard.querySelector(".npc-form").hidden = true; for (const [label, fn, primary] of list) { const b = document.createElement("button"); b.type = "button"; b.className = primary ? "solid-button gp-start" : "outline-button"; b.textContent = label; b.addEventListener("click", fn); box.appendChild(b); } }
const goPlace = (x, z, ry, msg) => { npcCard.hidden = true; cutThrough(() => { teleport(x, z, ry); if (msg) showToast(msg); }); };
const PLACES = [["중앙 대국장", () => goPlace(IX, -3.4, Math.PI, "중앙 대국장입니다. 빈 자리에서 E를 누르면 대국을 시작합니다.")], ["교육원", () => goPlace(IX - 20.5, 8.6, 0, "교육원입니다. 정 사범님께 말을 걸면 강좌를 들을 수 있어요.")], ["연구·분석실", () => goPlace(IX + 20.5, 9.2, 0, "연구·분석실입니다. 컴퓨터 앞에 앉으면 기보를, 기보 서가에서는 명국 기보를 볼 수 있어요.")], ["다과 코너", () => goPlace(TEA.x, 2.6, 0, "다과 코너입니다. 정수기와 믹스커피가 있어요 ☕")], ["2층 대회실", () => goPlace(IX2, 2.2, Math.PI, "2층 대회실입니다. 무대 위 대회 대국석의 대국은 전광판에 중계됩니다.")], ["2층 대국실", () => goPlace(IX2 - 6, 17.6, -Math.PI / 2, "2층 대국실입니다. 조용한 방에서 전통 바둑판으로 둘 수 있어요.")], ["야외 대국석", () => goPlace(-25.2, 17, -Math.PI / 2, "야외 대국석입니다.")]];
function memberCardHTML() { const m = member; return `<div class="mcard"><div class="mc-top"><span>無量棋院</span><small>MEMBER CARD</small></div><b></b><div class="mc-row"><span>회원번호</span><em>${m.no}</em></div><div class="mc-row"><span>기력</span><em class="mc-rank"></em></div><div class="mc-row"><span>주로 두는 판</span><em>${m.size}줄</em></div><div class="mc-row"><span>등록일</span><em>${m.joined}</em></div></div>`; }
function npcDesk(first) {
  const n = NPC_DESK; npcNow = n; npcCard.hidden = false; npcCard.querySelector(".npc-name").textContent = n.name; npcCard.querySelector(".npc-role").textContent = n.role;
  if (first) say(member ? `${member.name}님, 어서 오세요! 오늘도 좋은 대국 되세요. 무엇을 도와드릴까요?` : "어서 오세요, 무량기원입니다. 처음 오셨다면 회원 등록을 해 보세요. 닉네임을 정하면 머리 위에 이름이 보여요.");
  opts([[member ? "🪪 회원증 보기" : "🪪 회원 등록", () => member ? showCard() : regForm(), true], ...(member ? [["✏️ 닉네임 변경", () => renameForm()]] : []), ["🗺 시설 안내", () => placesMenu()], ["♟ 빈 대국석 안내", () => { npcCard.hidden = true; goPlayNow(); }], ["📺 대국 중계 보기", () => { npcCard.hidden = true; openLive(); }], ["📜 내 기보 보기", () => { npcCard.hidden = true; kiboPanel.open("pc", "mine"); }], ["ℹ 이용 안내", () => { say("무량기원은 24시간 열려 있습니다. 대국 중에는 조용히, 관전은 대국자 뒤에서 말없이 지켜봐 주세요. 대국이 끝나면 기보는 자동으로 저장되어 「내 기보」와 연구·분석실 컴퓨터에서 볼 수 있습니다. 2층 대회실 무대의 대국은 전광판으로 중계됩니다."); }], ["닫기", () => { npcCard.hidden = true; }]]);
}
function placesMenu() { say("어디로 모실까요? 바로 데려다 드릴게요."); opts([...PLACES.map(([l, f]) => [l + "으로", f]), ["← 처음으로", () => npcDesk(false)]]); }
function showCard() { say(`${member.name}님의 회원증입니다.`); opts([["← 처음으로", () => npcDesk(false)]]); const f = npcCard.querySelector(".npc-form"); f.hidden = false; f.innerHTML = memberCardHTML(); f.querySelector("b").textContent = member.name; f.querySelector(".mc-rank").textContent = member.rank; }
function regForm() {
  say("회원 등록을 도와드릴게요. 기원에서 쓰실 닉네임과 기력을 알려 주세요.");
  const f = npcCard.querySelector(".npc-form"); npcCard.querySelector(".npc-opts").innerHTML = ""; f.hidden = false;
  f.innerHTML = `<label class="field-row"><span>닉네임 (2~12자 · 머리 위에 표시)</span><input id="rg-name" maxlength="12" autocomplete="off"></label><label class="field-row"><span>기력</span><select id="rg-rank">${RANKS.map(r => `<option>${r}</option>`).join("")}</select></label><label class="field-row"><span>주로 두는 판</span><select id="rg-size"><option value="19">19줄</option><option value="13">13줄</option><option value="9">9줄</option></select></label><label class="check-row"><input type="checkbox" id="rg-ok"> 대국 예절을 지키고 상대를 존중하겠습니다</label><div class="form-warn" id="rg-warn" hidden></div><div class="dialog-actions"><button type="button" class="outline-button" id="rg-back">취소</button><button type="button" class="solid-button gp-start" id="rg-go">등록하기</button></div>`;
  f.querySelector("#rg-name").value = localName; f.querySelector("#rg-back").addEventListener("click", () => npcDesk(false));
  f.querySelector("#rg-go").addEventListener("click", () => {
    const nm = cleanName(f.querySelector("#rg-name").value), warn = f.querySelector("#rg-warn");
    if (!nm || nm.length < 2) { warn.hidden = false; warn.textContent = "닉네임을 2~12자로 적어 주세요."; return; }
    if (!f.querySelector("#rg-ok").checked) { warn.hidden = false; warn.textContent = "대국 예절에 동의해 주세요."; return; }
    const d = new Date(), z = v => String(v).padStart(2, "0");
    member = { no: `MG-${d.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`, name: nm, rank: f.querySelector("#rg-rank").value, size: +f.querySelector("#rg-size").value, joined: `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())}`, nameDay: dayKey() };
    saveMember(); setLocalName(nm); refreshMyTag(); if (!(myOutfit.a & 64)) { myOutfit.a |= 64; setOutfit(localAvatar, myOutfit); saveOutfit(); }
    try { presenceSend && presenceSend(myState()); } catch (e) {}
    gesture("greet", true); n_greet(NPC_DESK); showCard(); say(`환영합니다, ${nm}님! 회원증을 발급해 드렸어요. 목에 건 회원증 보이시죠? 이제 닉네임이 머리 위에 표시됩니다.`);
  });
}
function renameForm() {
  if (!canRename()) { say("죄송해요, 닉네임은 하루에 한 번만 바꿀 수 있어요. 오늘 밤 12시가 지나면 다시 바꿔 드릴게요."); opts([["← 처음으로", () => npcDesk(false)]]); return; }
  say("새 닉네임을 알려 주세요. 바꾼 뒤에는 내일(밤 12시 이후)까지 다시 바꿀 수 없어요.");
  const f = npcCard.querySelector(".npc-form"); npcCard.querySelector(".npc-opts").innerHTML = ""; f.hidden = false;
  f.innerHTML = `<label class="field-row"><span>새 닉네임 (2~12자)</span><input id="rn-name" maxlength="12" autocomplete="off"></label><div class="dialog-actions"><button type="button" class="outline-button" id="rn-back">취소</button><button type="button" class="solid-button gp-start" id="rn-go">바꾸기</button></div>`;
  f.querySelector("#rn-name").value = localName; f.querySelector("#rn-back").addEventListener("click", () => npcDesk(false));
  f.querySelector("#rn-go").addEventListener("click", () => { if (setLocalNameMember(f.querySelector("#rn-name").value)) { say(`${localName}님으로 바꿔 드렸어요.`); opts([["← 처음으로", () => npcDesk(false)]]); f.hidden = true; } });
}
function npcEdu(first) {
  const n = NPC_EDU; npcNow = n; npcCard.hidden = false; npcCard.querySelector(".npc-name").textContent = n.name; npcCard.querySelector(".npc-role").textContent = n.role;
  if (first) say(`반갑습니다${member ? ", " + member.name + "님" : ""}. 바둑은 규칙은 쉽고 깊이는 끝이 없지요. 무엇부터 해 볼까요?`);
  opts([["📖 입문 강좌 듣기", () => { npcCard.hidden = true; lessonPanel.open(); }, true], ["♟ 9줄 연습 대국 (입문 AI)", () => { npcCard.hidden = true; practiceGame(); }], ["💡 공부 방법", () => say("처음에는 9줄 판에서 많이 두어 보세요. 따내기와 단수에 익숙해지면 13줄, 19줄로 넓혀 갑니다. 연구·분석실의 명국 기보를 「다음 수 맞히기」로 따라 두면 큰 공부가 돼요.")], ["닫기", () => { npcCard.hidden = true; }]]);
}
function practiceGame() { const T = ZONE_T.edu.find(t => !t.game && !t.seats.some(seatTaken)) || ZONE_T.edu[0], s = T.seats[0]; pendingSetup = { opp: "ai", lv: 0, size: 9, col: 1 }; cutThrough(() => { teleport(s.x - Math.sin(s.ry) * 1.4, s.z - Math.cos(s.ry) * 1.4, s.ry); setTimeout(() => { if (!sitting) sit(s); }, 120); }); }
let pendingSetup = null;
function n_greet(n) { const u = n.av.userData; u.gType = "greet"; u.gDur = GDUR; u.gUntil = performance.now() + GDUR; }
function talkNPC(n) { if (!n) return; n_greet(n); localAvatar.rotation.y = Math.atan2(n.av.position.x - localAvatar.position.x, n.av.position.z - localAvatar.position.z); if (n.kind === "desk") npcDesk(true); else npcEdu(true); }

// ---------- 강좌 · 기보 창 ----------
const lessonPanel = new LessonPanel(root, { sound: k => Snd.stone(k === "ok" ? .7 : 1), onPosition: b => drawEduBoard(b), onCta: () => practiceGame() });
let heldRec = null;
const kiboPanel = new KiboPanel(root, {
  sound: () => Snd.stone(.8),
  onTake: r => { heldRec = r; localAvatar.userData.hold = 3; dirty = true; kiboPanel.close(); showToast("「" + (r.title || r.pb + " vs " + r.pw) + "」 기보를 들었습니다. 비어 있는 바둑판에 앉으면 놓아 볼 수 있어요. 📚"); },
  onPosition: (b, r, i, mode) => { if (mode !== "table" || !sitting) return; const T = TABLES[sitting.tb]; if (!T || !T.game || T.game.status !== "review" || !isHost(T)) return; T.game.moves = r.moves.slice(0, i); T.game.ts = Date.now(); setGame(T, T.game, true); clearTimeout(T.revT); T.revT = setTimeout(() => goBroadcast(T), 250); },
  onClose: mode => { if (mode === "table" || mode === "pc") { if (sitting) stand(); } }
});
function drawEduBoard(b) { const eduTV = EDU_TV; if (!eduTV || !b) return; const x = eduTV.x; x.fillStyle = "#e9e3d4"; x.fillRect(0, 0, 800, 800); drawGoban(x, b, b.n, 40, 40, 720); eduTV.t.needsUpdate = true; }

// ---------- 대국 중계 목록 ----------
const liveCard = document.createElement("section"); liveCard.className = "npc-card live-card"; liveCard.hidden = true;
liveCard.innerHTML = `<div class="npc-head"><div><b>📺 대국 중계</b><small>무량기원에서 지금 열려 있는 대국</small></div><button type="button" class="gp-x" aria-label="닫기">×</button></div><div class="live-list"></div>`;
root.appendChild(liveCard); liveCard.querySelector(".gp-x").addEventListener("click", () => { liveCard.hidden = true; });
function openLive() {
  const list = TABLES.filter(T => T.game).sort((a, b) => (b.zone === "tour") - (a.zone === "tour") || (b.activeAt || 0) - (a.activeAt || 0)), box = liveCard.querySelector(".live-list"); box.innerHTML = "";
  if (!list.length) box.innerHTML = `<p class="gp-note">지금 진행 중인 대국이 없습니다. 빈 대국석에 앉아 첫 대국을 열어 보세요.</p>`;
  for (const T of list) { const G = T.game, b = T.board, el = document.createElement("button"); el.type = "button"; el.className = "kb-item"; const st = G.status === "play" ? `${G.moves.length}수 · ${b.turn === BLACK ? "흑" : "백"} 차례` : G.status === "wait" ? "상대를 기다리는 중" : G.status === "review" ? "기보 놓아보기" : G.status === "scoring" ? "계가 중" : "대국 종료";
    el.innerHTML = `<b></b><span></span><small></small>`; el.querySelector("b").textContent = (T.zone === "tour" ? "🏆 " : "") + T.name; el.querySelector("span").textContent = `흑 ${G.p[1] ? G.p[1].name : "—"} vs 백 ${G.p[2] ? G.p[2].name : "—"}`; el.querySelector("small").textContent = st + (G.status === "end" && G.result ? " · " + G.result : "");
    el.addEventListener("click", () => { liveCard.hidden = true; watchTable(T); }); box.appendChild(el); }
  liveCard.hidden = false;
}
// ---------- 형세(승률) 판단: 관전할 때와 전광판에 ----------
let evalWorker = null, evalN = 0; const evalPend = new Map();
try { evalWorker = new Worker(new URL("./go_worker.js?v=2", import.meta.url), { type: "module" }); evalWorker.onmessage = e => { const r = evalPend.get(e.data.id); if (r) { evalPend.delete(e.data.id); r(e.data); } }; evalWorker.onerror = () => { evalWorker = null; }; } catch (e) { evalWorker = null; }
function requestEval(T) {
  const G = T.game; if (!evalWorker || !G || G.status !== "play" || G.moves.length < 2) return; const key = G.gid + ":" + G.moves.length; if (T.evalKey === key) return; T.evalKey = key;
  const id = ++evalN; evalPend.set(id, r => { if (T.evalKey !== key || typeof r.black !== "number") return; T.evalB = r.black; drawScreens(); if (panelT === T && !myColor(T)) panel.setWinrate(r.black); });
  evalWorker.postMessage({ id, type: "eval", size: G.size, moves: G.moves, ms: G.size >= 19 ? 900 : 600 });
}

// ---------- 손에 든 것 · 다과 코너 · 서가 · 엘리베이터 버튼 ----------
const actBtn = id => $("#" + id);
function drink(kind) {
  if (localAvatar.userData.hold === 3) { showToast("기보책을 들고 있어요. 먼저 내려놓아 주세요."); return; }
  localAvatar.userData.hold = kind; dirty = true; clearTimeout(drink.t); drink.t = setTimeout(() => { if (localAvatar.userData.hold === kind) { localAvatar.userData.hold = 0; dirty = true; showToast(kind === 2 ? "믹스커피를 다 마셨습니다. 종이컵은 분리수거 했어요." : "물을 다 마셨습니다."); } }, 90000);
  Snd.pour(kind); showToast(kind === 2 ? "종이컵에 믹스커피 한 봉을 털어 넣고 뜨거운 물을 부었습니다. 달달한 향이 퍼집니다 ☕" : "정수기에서 시원한 물을 한 잔 받았습니다 💧");
}
actBtn("coffee-button").addEventListener("click", () => drink(2)); actBtn("water-button").addEventListener("click", () => drink(1));
actBtn("shelf-button").addEventListener("click", () => kiboPanel.open("shelf"));
actBtn("drop-button").addEventListener("click", () => { const h = localAvatar.userData.hold; localAvatar.userData.hold = 0; heldRec = null; dirty = true; showToast(h === 3 ? "기보책을 서가에 꽂아 두었습니다." : "컵을 내려놓았습니다."); });
actBtn("learn-button").addEventListener("click", () => lessonPanel.open());
actBtn("live-button").addEventListener("click", () => openLive());
actBtn("kibo-button").addEventListener("click", () => kiboPanel.open("pc", "mine"));
actBtn("npc-button").addEventListener("click", () => talkNPC(nearNPC()));
const nearElev = () => { const p = localAvatar.position; if (sitting) return 0; if (p.x > 500 && p.x < 700 && Math.hypot(p.x - (IX + ELEV.x), p.z - (ID / 2 - .6)) < 2.6) return 1; if (p.x > 700 && Math.hypot(p.x - (IX2 + ELEV.x), p.z - (ID / 2 - .6)) < 2.6) return 2; return 0; };
let elevBusy = false;
function rideElevator() {
  const f = nearElev(); if (!f || elevBusy) return; elevBusy = true; const E = f === 1 ? ELEV1 : ELEV2, E2 = f === 1 ? ELEV2 : ELEV1; Snd.ding();
  const slide = (el, k) => { el.doors.forEach((d, i) => { d.position.x = (i ? 1 : -1) * (.63 + k * 1.15); }); };
  let t0 = performance.now(); const anim = (el, open, cb) => { const step = () => { const k = Math.min(1, (performance.now() - t0) / 600); slide(el, open ? k : 1 - k); if (k < 1) requestAnimationFrame(step); else cb && cb(); }; t0 = performance.now(); step(); };
  anim(E, true, () => setTimeout(() => cutThrough(() => {
    slide(E, 0); const ox = f === 1 ? IX2 : IX; teleport(ox + ELEV.x, ID / 2 - 2.4, Math.PI); slide(E2, 1); showToast(f === 1 ? "띵— 2층입니다. 대국실과 대회실이 있습니다." : "띵— 1층 로비입니다.");
    setTimeout(() => anim(E2, false, () => { elevBusy = false; }), 700);
  }), 250));
}
actBtn("elev-button").addEventListener("click", rideElevator);
const nearShelf = () => { const p = localAvatar.position; return !sitting && p.x > IX + 24.6 && p.x < 700 && p.z > 8.2 && p.z < 21; };
const nearTea = () => { const p = localAvatar.position; return !sitting && Math.hypot(p.x - TEA.x, p.z - TEA.z) < 3.4; };
const inEdu = () => { const p = localAvatar.position; return p.x > IX - 28 && p.x < IX - 13 && p.z > 6.5 && p.z < 22; };
setInterval(() => {
  const h = localAvatar.userData.hold | 0, e = nearElev(), n = nearNPC();
  actBtn("elev-button").hidden = !e; actBtn("elev-button").textContent = e === 1 ? "🛗 2층으로 (E)" : "🛗 1층으로 (E)";
  actBtn("npc-button").hidden = !n || !npcCard.hidden; if (n) actBtn("npc-button").textContent = "💬 " + n.name + "과(와) 대화 (E)";
  actBtn("coffee-button").hidden = !nearTea(); actBtn("water-button").hidden = !nearTea();
  actBtn("shelf-button").hidden = !nearShelf(); actBtn("drop-button").hidden = !h || sitting; actBtn("drop-button").textContent = h === 3 ? "📚 기보 내려놓기" : "🥤 컵 내려놓기";
  actBtn("learn-button").hidden = !inEdu() || lessonPanel.isOpen;
  // NPC: 가까이 오면 한 번 인사
  for (const m of NPCS) { const d = Math.hypot(localAvatar.position.x - m.x, localAvatar.position.z - m.z); if (d < 6 && !m.greeted) { m.greeted = 1; n_greet(m); } else if (d > 10) m.greeted = 0; }
}, 300);
setInterval(() => { // 승률 요청: 관전 중인 대국 · 전광판 대국
  for (const T of TABLES) if (T.game && T.game.status === "play" && (T.zone === "tour" || T === featured || (panelT === T && panel.isOpen && !myColor(T)))) requestEval(T);
  if (panelT && panel.isOpen) { const G = panelT.game; panel.setWinrate(G && G.status === "play" && !myColor(panelT) && typeof panelT.evalB === "number" ? panelT.evalB : null); }
}, 1500);

// ---------- 마우스 좌/우 바꾸기 ----------
{
  const lbl = $("#mouse-lbl"), tip = $("#hero-tip"), hint = document.querySelector(".interaction-hint");
  const refresh = () => {
    lbl.textContent = MOUSE_SWAP ? "우클릭 이동 · 좌클릭 드래그 시선" : "좌클릭 이동 · 좌클릭 드래그 시선";
    tip.innerHTML = matchMedia("(pointer:coarse)").matches ? "🖐 가고 싶은 곳을 <b>터치</b>하면 이동 · <b>드래그</b>하면 시선이 돌아갑니다" : (MOUSE_SWAP ? "🖱 <b>좌클릭 드래그</b>로 화면(시선)을 돌리고, <b>우클릭</b>으로 이동합니다" : "🖱 <b>좌클릭</b>하면 그곳으로 이동, <b>좌클릭 드래그</b>로 화면(시선)을 돌립니다");
    if (hint) hint.textContent = hint.textContent.replace(/(좌클릭 이동 · 좌클릭 드래그 시선|우클릭 이동 · 좌클릭 드래그 시선)/, MOUSE_SWAP ? "우클릭 이동 · 좌클릭 드래그 시선" : "좌클릭 이동 · 좌클릭 드래그 시선");
  };
  refresh();
  $("#mouse-swap").addEventListener("click", () => { MOUSE_SWAP = !MOUSE_SWAP; applyMouse(); try { localStorage.setItem("muryang-mouse", MOUSE_SWAP ? "swap" : "std"); } catch (e) {} refresh(); showToast(MOUSE_SWAP ? "우클릭=이동 · 좌클릭 드래그=시선" : "좌클릭=이동 · 좌클릭 드래그=시선"); });
}
// ---------- 옷 꾸미기 (현대 복장) ----------
const OUTFIT_KEY = "giwon-outfit-v2";
let myOutfit = null;
try { myOutfit = cleanOutfit(JSON.parse(localStorage.getItem(OUTFIT_KEY))); } catch (e) {}
if (!myOutfit) myOutfit = defaultOutfit(); // 처음엔 정장 + 짧은 머리
if (member && !(myOutfit.a & 64)) myOutfit.a |= 64;
const saveOutfit = () => { try { localStorage.setItem(OUTFIT_KEY, JSON.stringify(myOutfit)); } catch (e) {} try { outfitSend && outfitSend(myOutfit); } catch (e) {} };
setOutfit(localAvatar, myOutfit); saveOutfit();
{
  const dlg = $("#outfit-dialog");
  const TOPC = ["#2b3547", "#3a3d42", "#4a4f57", "#2f3b33", "#6b5a43", "#c8b08a", "#f4f2ec", "#9cb3c9", "#b8412e", "#c9a55f", "#5a3a6e", "#e7a9a0", "#7f9a63", "#1d1d1f"];
  const PANTC = ["#2b3547", "#3a3d42", "#1d1d1f", "#6b5a43", "#c8b08a", "#4a5a7a", "#7a7f86"], ACC = ["#8a2b2b", "#2f5a8a", "#c9a55f", "#3b6b4a", "#5a3a6e", "#e58fa8", "#f4f2ec", "#1d1d1f"];
  const HAIRC = ["#1d1a18", "#2a211c", "#3b2a20", "#6b4a2e", "#a87a4a", "#d8c08a", "#8f8a84", "#c95a4a"];
  let draft = null, snap = null;
  const sw = (box, list, key) => { box.innerHTML = ""; list.forEach(c => { const b = document.createElement("button"); b.type = "button"; b.className = "swatch"; b.style.background = c; b.setAttribute("aria-label", c); b.addEventListener("click", () => { draft[key] = c; apply(); }); box.appendChild(b); }); };
  const apply = () => { setOutfit(localAvatar, draft); for (const [id, k] of [["of-top", "r"], ["of-pants", "p"], ["of-acc", "k"], ["of-hair", "hc"]]) $("#" + id).value = draft[k];
    dlg.querySelectorAll("[data-t]").forEach(b => b.classList.toggle("on", draft.t === +b.dataset.t)); dlg.querySelectorAll("[data-hs]").forEach(b => b.classList.toggle("on", draft.hs === +b.dataset.hs));
    dlg.querySelectorAll("[data-a]").forEach(b => b.classList.toggle("on", !!(draft.a & +b.dataset.a))); for (const k of ["e", "n"]) dlg.querySelectorAll("[data-" + k + "]").forEach(b => b.classList.toggle("on", (draft[k] | 0) === +b.dataset[k])); };
  sw($("#of-top-sw"), TOPC, "r"); sw($("#of-pants-sw"), PANTC, "p"); sw($("#of-acc-sw"), ACC, "k"); sw($("#of-hair-sw"), HAIRC, "hc");
  for (const [id, k] of [["of-top", "r"], ["of-pants", "p"], ["of-acc", "k"], ["of-hair", "hc"]]) $("#" + id).addEventListener("input", e => { draft[k] = e.target.value; apply(); });
  dlg.querySelectorAll("[data-t]").forEach(b => b.addEventListener("click", () => { draft.t = +b.dataset.t; if (draft.t === 4 && !TOPC.slice(4, 6).includes(draft.r)) draft.r = "#c8b08a"; apply(); }));
  dlg.querySelectorAll("[data-hs]").forEach(b => b.addEventListener("click", () => { draft.hs = +b.dataset.hs; apply(); }));
  const EXA = [3, 12, 48]; // 안경·선글라스 / 야구모자·비니 / 헤드폰·에어팟 은 하나만
  dlg.querySelectorAll("[data-a]").forEach(b => b.addEventListener("click", () => { const bit = +b.dataset.a; let v = draft.a | 0; if (v & bit) v &= ~bit; else { for (const g of EXA) if (g & bit) v &= ~g; v |= bit; } draft.a = v; apply(); }));
  for (const k of ["e", "n"]) dlg.querySelectorAll("[data-" + k + "]").forEach(b => b.addEventListener("click", () => { draft[k] = +b.dataset[k]; apply(); }));
  const fitView = () => { try { if (!mqMob.matches || !dlg.open) { camera.clearViewOffset(); return null; } const W = root.clientWidth, H = root.clientHeight, f = Math.max(.25, Math.min(1, dlg.getBoundingClientRect().top / innerHeight)); camera.setViewOffset(W, H, 0, (1 - f) * H / 2, W, H); return f; } catch (e) { return null; } };
  dlg.addEventListener("close", () => { try { camera.clearViewOffset(); } catch (e) {} });
  const open = () => { snap = { ...myOutfit }; draft = { ...myOutfit }; apply(); $("#settings-panel").hidden = true; dlg.show(); fitView(); };
  $("#outfit-open").addEventListener("click", open);
  $("#of-cancel").addEventListener("click", () => { setOutfit(localAvatar, snap); dlg.close(); });
  $("#of-save").addEventListener("click", () => { const c = cleanOutfit(draft); if (!c) return; myOutfit = c; saveOutfit(); dlg.close(); showToast("옷을 갈아입었습니다."); });
  $("#of-front").addEventListener("click", () => { try { const p = localAvatar.position, y = localAvatar.rotation.y, f = fitView() ?? 1, d = Math.max(2.8, Math.min(9, 3.5 / (2 * Math.tan(camera.fov * Math.PI / 360) * Math.max(.3, f) * .92))); camera.position.set(p.x + Math.sin(y) * d, p.y + 1.55, p.z + Math.cos(y) * d); controls.target.set(p.x, p.y + 1.35, p.z); controls.update(); } catch (e) {} });
}

// ---------- 조이스틱 모드: 달리기 버튼 (누를 때마다 걷기 ↔ 달리기) ----------
{ const rb = $("#joy-run"); const paint = () => { rb.classList.toggle("on", joyRun); rb.textContent = joyRun ? "달리는 중" : "달리기"; };
  rb.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); rb._pd = true; joyRun = !joyRun; paint(); }); // 조이스틱을 잡은 채 다른 손가락으로 눌러도 바로 반응
  rb.addEventListener("click", () => { if (rb._pd) { rb._pd = false; return; } joyRun = !joyRun; paint(); }); paint(); }

// ---------- 모바일: 오래 다른 앱·탭을 보다 돌아오면 GPU 자원이 깨져 사람이 투명해지는 문제 — 돌아올 때 전부 다시 올린다 ----------
{ let hiddenAt = 0, lastFix = 0;
  const refreshGpu = () => { // 지오메트리·재질·텍스처를 한 번 폐기 → 다음 프레임에 새로 업로드·컴파일
    const now = performance.now(); if (now - lastFix < 3000) return; lastFix = now;
    const mats = new Set(), texs = new Set();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const mm of ms) { mats.add(mm); for (const k in mm) { const v = mm[k]; if (v && v.isTexture) texs.add(v); } if (mm.uniforms) for (const k in mm.uniforms) { const v = mm.uniforms[k] && mm.uniforms[k].value; if (v && v.isTexture) texs.add(v); } } });
    mats.forEach(mm => { mm.dispose(); mm.needsUpdate = true; }); texs.forEach(t => t.dispose());
    for (const o of [OUT_M]) { o.dispose(); o.needsUpdate = true; }
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden) hiddenAt = performance.now(); else if (hiddenAt && performance.now() - hiddenAt > 15000) { hiddenAt = 0; refreshGpu(); } });
  renderer.domElement.addEventListener("webglcontextrestored", () => { setTimeout(refreshGpu, 50); });
  addEventListener("pageshow", e => { if (e.persisted) refreshGpu(); });
}

// ---------- 그리기 ----------
let perfAcc = 0, perfN = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .1), t = clock.elapsedTime, now = performance.now();
  if (LQ && !document.hidden) { perfAcc += dt; if (++perfN >= 90) { const avg = perfAcc / perfN; perfAcc = perfN = 0; if (avg > .034 && prScale > .62) { prScale = Math.max(.62, prScale - .14); resize(); } else if (avg < .02 && prScale < 1) { prScale = Math.min(1, prScale + .1); resize(); } } }
  if (marker.visible) marker.scale.setScalar(1 + Math.sin(t * 6) * .12);
  FLAGS.forEach((f, i) => { f.rotation.y = Math.sin(t * 1.3 + i * 1.7) * .22; });
  updateSky();
  stepWalk(dt);
  remoteAvatars.forEach(av => {
    const u = av.userData; u.walk = 0;
    if (u.tx !== undefined) {
      const ox = av.position.x, oz = av.position.z, far = Math.hypot(u.tx - ox, u.tz - oz) > 30;
      if (far) { av.position.x = u.tx; av.position.z = u.tz; } else { av.position.x += (u.tx - ox) * .2; av.position.z += (u.tz - oz) * .2; }
      u.walk = Math.hypot(u.tx - ox, u.tz - oz) > .15 && !far ? 1 : 0; u.pace = 1;
      let d = u.tr - av.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); av.rotation.y += d * .2;
    }
    av.position.y += ((u.ty !== undefined ? u.ty : groundY(av.position.x, av.position.z)) - av.position.y) * .3; pose(av, now, t);
  });
  pose(localAvatar, now, t); for (const n of NPCS) { n.av.userData.walk = 0; pose(n.av, now, t); }
  if (fp) { const p = localAvatar.position, hy = p.y + (sitting ? (sitting.kind === "go-floor" ? 1.03 : 1.6) : 1.62), cp = Math.cos(fpPitch); camera.position.set(p.x, hy, p.z); controls.target.set(p.x + Math.sin(fpYaw) * cp, hy + Math.sin(fpPitch), p.z + Math.cos(fpYaw) * cp); camera.lookAt(controls.target); }
  else {
    controls.update();
    if (camera.position.y < .5) camera.position.y = .5;
    if (lookUp > .002) { const dx = controls.target.x - camera.position.x, dz = controls.target.z - camera.position.z, dh = Math.hypot(dx, dz) || 1; camera.lookAt(camera.position.x + dx / dh * 10, camera.position.y + Math.tan(lookUp) * 10, camera.position.z + dz / dh * 10); }
  }
  camIdeal.copy(camera.position); let camMod = false;
  if (!fp) { camMod = !flying && walking && keepCamInside(dt); const cd = camera.position.distanceTo(controls.target); if (camHide ? cd > 1.35 : cd < 1.0) camHide = !camHide; localAvatar.visible = !camHide; }
  updateFade(dt);
  Q.tick(t, dt); Q.render();
  if (shotReq) doShot();
  if (camMod) camera.position.copy(camIdeal);
}
const resize = () => { const w = root.clientWidth, h = root.clientHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); renderer.setPixelRatio(PR()); Q.resize(w, h); };
animate();
const loading = $("#scene-loading");
window.__muryangReady = true;
requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => loading.classList.add("hide"), 1800)));
const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root);
window.addEventListener("beforeunload", () => { try { for (const T of TABLES) if (T.game && isHost(T)) { T.game = null; goBroadcast(T); } } catch (e) {} resizeObserver.disconnect(); controls.dispose(); renderer.dispose(); if (room) room.leave().catch(() => {}); });
function copyText(t) { return (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (e) {} a.remove(); }); }
{ const joyLbl = $("#joy-lbl"); let joyOn = false; try { joyOn = localStorage.getItem("muryang-joy") === "1"; } catch (e) {}
  const joyApply = () => { document.body.classList.toggle("joy-on", joyOn); joyLbl.textContent = joyOn ? "이동: 조이스틱" : "이동: 화면 터치"; $("#joy-swap").textContent = joyOn ? "화면 터치로 전환" : "조이스틱 전환"; };
  joyApply(); $("#joy-swap").addEventListener("click", () => { joyOn = !joyOn; if (!joyOn) { joyRun = false; $("#joy-run").classList.remove("on"); } try { localStorage.setItem("muryang-joy", joyOn ? "1" : "0"); } catch (e) {} joyApply(); showToast(joyOn ? "조이스틱으로 이동합니다." : "화면을 터치해서 이동합니다."); }); }
{ const b = $("#lowq-swap"), l = $("#lowq-lbl"); b.textContent = LOWQ ? "고화질로 전환" : "최적화 화질로 전환"; l.textContent = LOWQ ? "화질: 최적화" : (COARSE ? "화질: 모바일 자동 최적화" : "화질: 고화질");
  b.addEventListener("click", () => { try { localStorage.setItem("muryang-lowq", LOWQ ? "0" : "1"); } catch (e) {} showToast(LOWQ ? "고화질로 다시 불러옵니다…" : "최적화 화질로 다시 불러옵니다…"); setTimeout(() => location.reload(), 700); }); }
setInterval(() => { document.body.classList.toggle("lobby", $(".hero-copy").style.display !== "none" || !loading.classList.contains("hide")); document.body.classList.toggle("go-open", panel.isOpen); }, 200);
document.body.classList.add("lobby");
