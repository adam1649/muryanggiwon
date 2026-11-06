// 무량사 · 품질 레이어
// - 월드 좌표 3면(트리플래너) 절차 질감: 풀밭·돌길·목재·마루·기와·회벽
// - 그라디언트 하늘 돔(해·달 번짐), 환경 반사(금속·물), 일렁이는 연못 물결
// - 바람에 흔들리는 풀·들꽃, 꽃잎·낙엽, 밤의 반딧불
// - 은은한 블룸(데스크톱 전용, 느리면 자동으로 꺼짐 · 주소 뒤에 ?fx=0 으로 끌 수 있음)
// 모든 기능은 실패해도 기존 화면이 그대로 나오도록 방어적으로 작성했습니다.
import * as THREE from "three";

const clamp01 = v => Math.max(0, Math.min(1, v));
const mixN = (a, b, t) => a + (b - a) * t;
const smooth = v => v * v * (3 - 2 * v);

// ---------- 타일 가능한 값 노이즈 ----------
function tileNoise(size, cx, cy, seed) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const g = new Float32Array(cx * cy); for (let i = 0; i < g.length; i++) g[i] = rnd();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = y / size * cy, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), ya = y0 % cy, yb = (y0 + 1) % cy;
    for (let x = 0; x < size; x++) {
      const fx = x / size * cx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), xa = x0 % cx, xb = (x0 + 1) % cx;
      const a = g[ya * cx + xa], b = g[ya * cx + xb], c = g[yb * cx + xa], d = g[yb * cx + xb];
      const top = a + (b - a) * sx, bot = c + (d - c) * sx;
      out[y * size + x] = top + (bot - top) * sy;
    }
  }
  return out;
}
function fbm(size, bx, by, oct, seed, gain = .5) {
  const out = new Float32Array(size * size); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const n = tileNoise(size, bx << o, by << o, seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
function greyTex(size, fn, aniso) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const ctx = c.getContext("2d"), img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = Math.max(0, Math.min(255, Math.round(fn(x, y) * 255))), k = (y * size + x) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = aniso; t.needsUpdate = true;
  return t;
}
function makeTextures(aniso) {
  const S = 256;
  const T = {};
  { const n = fbm(S, 4, 4, 5, 7), f = fbm(S, 32, 32, 2, 19); T.grass = greyTex(S, (x, y) => .5 + (n[y * S + x] - .5) * .62 + (f[y * S + x] - .5) * .16, aniso); }
  { // 돌길: 4×4 판석 + 틈새
    const n = fbm(S, 8, 8, 4, 31), P = 64, r = []; for (let i = 0; i < 16; i++) r.push((Math.sin(i * 12.9898) * 43758.5453) % 1);
    T.paver = greyTex(S, (x, y) => { const px = Math.floor(x / P), py = Math.floor(y / P), base = .52 + (r[py * 4 + px] % 1) * .09, lx = x % P, ly = y % P;
      const edge = Math.min(lx, ly, P - 1 - lx, P - 1 - ly), m = edge < 2 ? .5 + edge * .22 : edge < 4 ? .88 + (edge - 2) * .06 : 1;
      return (base + (n[y * S + x] - .5) * .3) * m; }, aniso); }
  { const n = fbm(S, 6, 6, 4, 43); T.rock = greyTex(S, (x, y) => .5 + (n[y * S + x] - .5) * .55, aniso); }
  { const n = fbm(S, 2, 26, 3, 53), r = fbm(S, 3, 3, 2, 59); T.wood = greyTex(S, (x, y) => .5 + (n[y * S + x] - .5) * .7 + (r[y * S + x] - .5) * .18, aniso); }
  { // 마루: 널 이음 + 결
    const n = fbm(S, 2, 24, 3, 67), P = 64;
    T.plank = greyTex(S, (x, y) => { const row = Math.floor(y / P), ly = y % P, off = (row % 2) * 90 + row * 37, lx = (x + off) % S, seam = ly < 2 ? .6 : lx < 2 ? .72 : 1, shade = .5 + ((Math.sin(row * 7.7 + Math.floor((x + off) / 128) * 3.3) * .5 + .5) - .5) * .12;
      return (shade + (n[y * S + x] - .5) * .5) * seam; }, aniso); }
  { // 기와: 가로 줄 + 골
    const n = fbm(S, 8, 8, 3, 71), R = 32, C = 16;
    T.tile = greyTex(S, (x, y) => { const row = Math.floor(y / R), ly = y % R, xx = (x + (row % 2) * C / 2) % C, ridge = Math.sin(xx / C * Math.PI * 2) * .5 + .5, drop = 1 - ly / R;
      return .36 + ridge * .22 + drop * .16 + (n[y * S + x] - .5) * .18 - (ly > R - 3 ? .12 : 0); }, aniso); }
  { const n = fbm(S, 12, 12, 3, 83); T.plaster = greyTex(S, (x, y) => .5 + (n[y * S + x] - .5) * .42, aniso); }
  return T;
}

// ---------- 월드 좌표 3면 질감 패치 ----------
function triplanar(mat, tex, scale, strength, large = 0, rough = .25) {
  mat.onBeforeCompile = shader => {
    shader.uniforms.tTri = { value: tex }; shader.uniforms.uTriS = { value: scale }; shader.uniforms.uTriK = { value: strength }; shader.uniforms.uTriL = { value: large }; shader.uniforms.uTriR = { value: rough };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTriP; varying vec3 vTriN;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec4 triWP = vec4(transformed, 1.0);
        vec3 triObjN = objectNormal;
        #ifdef USE_INSTANCING
          triWP = instanceMatrix * triWP; triObjN = mat3(instanceMatrix) * triObjN;
        #endif
        triWP = modelMatrix * triWP; vTriP = triWP.xyz; vTriN = normalize(mat3(modelMatrix) * triObjN);`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D tTri; uniform float uTriS; uniform float uTriK; uniform float uTriL; uniform float uTriR; varying vec3 vTriP; varying vec3 vTriN;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec3 triW = pow(abs(vTriN), vec3(4.0)); triW /= (triW.x + triW.y + triW.z + 1e-4);
        float triV = texture2D(tTri, vTriP.zy * uTriS).r * triW.x + texture2D(tTri, vTriP.xz * uTriS).r * triW.y + texture2D(tTri, vTriP.xy * uTriS).r * triW.z;
        triV *= 2.0;
        if (uTriL > 0.0) triV *= mix(1.0, texture2D(tTri, vTriP.xz * uTriS * 0.17 + 0.37).r * 2.0, uTriL * triW.y);
        diffuseColor.rgb *= mix(1.0, triV, uTriK);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n        roughnessFactor = clamp(roughnessFactor + (triV - 1.0) * uTriR, 0.04, 1.0);");
  };
  mat.customProgramCacheKey = () => "tri" + (large > 0 ? "L" : "");
  mat.needsUpdate = true;
}

// ---------- 하늘 돔 ----------
const SKY_V = "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SKY_F = `uniform vec3 uHor; uniform vec3 uTop; uniform vec3 uGnd; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uGlow; uniform vec3 uMoon; uniform float uMoonGlow; varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir); float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHor, uTop, pow(h, 0.55));
  col = mix(col, uGnd, smoothstep(0.0, -0.3, d.y));
  float s = max(dot(d, uSun), 0.0);
  col += uSunCol * (pow(s, 5.0) * 0.28 + pow(s, 36.0) * 0.55) * uGlow;
  float m = max(dot(d, uMoon), 0.0);
  col += vec3(0.55, 0.65, 1.0) * (pow(m, 40.0) * 0.35 + pow(m, 8.0) * 0.06) * uMoonGlow;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      uHor: { value: new THREE.Color("#c9d3c6") }, uTop: { value: new THREE.Color("#7fa6d4") }, uGnd: { value: new THREE.Color("#c9d3c6") },
      uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color("#ffe9a8") }, uGlow: { value: 0 },
      uMoon: { value: new THREE.Vector3(0, -1, 0) }, uMoonGlow: { value: 0 }
    },
    vertexShader: SKY_V, fragmentShader: SKY_F
  });
}

function spriteTex(draw, size = 64) {
  const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function initQuality({ scene, renderer, camera, sun, M, ground }) {
  const touch = matchMedia("(pointer:coarse)").matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (() => { try { return localStorage.getItem("muryang-lowq") === "1"; } catch (e) { return false; } })();
  const qs = new URLSearchParams(location.search), fxParam = qs.get("fx");
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 2;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const API = { sky() {}, tick() {}, render() { renderer.render(scene, camera); }, resize() {}, addGrass() {} };
  let skyDome = null, skyMat = null;

  try { // 1) 절차 질감
    const T = makeTextures(aniso);
    triplanar(M.ground, T.grass, 1 / 6, .95, .55, .15);
    triplanar(M.stone, T.paver, .25, .9, 0, .2);
    triplanar(M.stone2, T.rock, .35, .75, 0, .2);
    triplanar(M.granite, T.rock, .5, .5, 0, .12);
    for (const k of ["wood", "wood2", "woodDark"]) triplanar(M[k], T.wood, .5, .8, 0, .2);
    triplanar(M.pillar, T.wood, .7, .45, 0, .15);
    for (const k of ["floor", "floorDark"]) triplanar(M[k], T.plank, .33, .85, 0, .2);
    for (const k of ["roof", "roof2"]) triplanar(M[k], T.tile, .33, .9, 0, .18);
    triplanar(M.plaster, T.plaster, .5, .6, 0, .1);
  } catch (e) { console.warn("질감 레이어를 건너뜁니다", e); }

  try { // 2) 하늘 돔 + 환경 반사
    skyMat = skyMaterial();
    skyDome = new THREE.Mesh(new THREE.SphereGeometry(480, 32, 20), skyMat);
    skyDome.renderOrder = -1000; skyDome.frustumCulled = false; scene.add(skyDome);
    const envMat = skyMaterial(); envMat.uniforms.uHor.value.set("#dfe9ee"); envMat.uniforms.uTop.value.set("#6f9fd6"); envMat.uniforms.uGnd.value.set("#6f7a5c");
    envMat.uniforms.uSun.value.set(-.5, .8, .35).normalize(); envMat.uniforms.uSunCol.value.set("#fff0d0"); envMat.uniforms.uGlow.value = 1.6;
    const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), envMat));
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(envScene, .04, .1, 100);
    scene.environment = rt.texture; scene.environmentIntensity = .22; pm.dispose(); envMat.dispose();
  } catch (e) { console.warn("하늘·환경 반사를 건너뜁니다", e); }

  try { // 3) 연못 물결
    const S = 256, h = fbm(S, 5, 5, 4, 97), c = document.createElement("canvas"); c.width = c.height = S;
    const ctx = c.getContext("2d"), img = ctx.createImageData(S, S), at = (x, y) => h[((y + S) % S) * S + ((x + S) % S)];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 6, dy = (at(x, y + 1) - at(x, y - 1)) * 6, l = Math.hypot(dx, dy, 1), k = (y * S + x) * 4;
      img.data[k] = (-dx / l * .5 + .5) * 255; img.data[k + 1] = (-dy / l * .5 + .5) * 255; img.data[k + 2] = (1 / l * .5 + .5) * 255; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const nm = new THREE.CanvasTexture(c); nm.wrapS = nm.wrapT = THREE.RepeatWrapping; nm.colorSpace = THREE.NoColorSpace; nm.repeat.set(2.5, 2.5); nm.anisotropy = aniso;
    M.water.normalMap = nm; M.water.normalScale.set(.35, .35); M.water.envMapIntensity = 2.2; M.water.needsUpdate = true;
    API._water = nm;
  } catch (e) { console.warn("물결을 건너뜁니다", e); }

  // 4) 그림자 해상도(데스크톱)
  if (!touch && !lowEnd && renderer.capabilities.maxTextureSize >= 8192) sun.shadow.mapSize.set(4096, 4096);

  // 5) 꽃잎 · 낙엽 · 반딧불
  const field = (n, mk) => { const pos = new Float32Array(n * 3), ph = new Float32Array(n * 2); for (let i = 0; i < n; i++) { mk(pos, i); ph[i * 2] = Math.random() * 6.28; ph[i * 2 + 1] = .5 + Math.random(); } return { pos, ph }; };
  const pts = (f, tex, size, color, additive) => {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(f.pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, size, sizeAttenuation: true, transparent: true, depthWrite: false, color, opacity: 0, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    p.frustumCulled = false; scene.add(p); return p;
  };
  const petalTex = spriteTex((x, s) => { x.translate(s / 2, s / 2); x.rotate(-.6); const g = x.createRadialGradient(0, 0, 0, 0, 0, s * .42); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)"); x.scale(1, .5); x.fillStyle = g; x.beginPath(); x.arc(0, 0, s * .42, 0, 7); x.fill(); });
  const dotTex = spriteTex((x, s) => { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, s, s); });
  const spawn = (pos, i, hi) => { pos[i * 3] = (Math.random() - .5) * 140; pos[i * 3 + 1] = hi ? 20 + Math.random() * 6 : Math.random() * 22; pos[i * 3 + 2] = (Math.random() - .5) * 120; };
  const nP = touch ? 70 : 150, nL = touch ? 30 : 60, nF = touch ? 40 : 80;
  const petals = field(nP, (p, i) => spawn(p, i, false)), leaves = field(nL, (p, i) => spawn(p, i, false));
  const flies = field(nF, (p, i) => { p[i * 3] = (Math.random() - .5) * 110; p[i * 3 + 1] = .6 + Math.random() * 2.6; p[i * 3 + 2] = (Math.random() - .5) * 100; });
  const flyBase = Float32Array.from(flies.pos);
  const petalPts = pts(petals, petalTex, .55, "#ffd3de", false), leafPts = pts(leaves, petalTex, .6, "#e0a050", false), flyPts = pts(flies, dotTex, .42, "#e4ff9a", true);
  let dayF = 1, night = 0, ind = 0;

  API.sky = o => {
    dayF = o.dayF; night = o.night; ind = o.ind;
    if (skyMat) {
      const u = skyMat.uniforms; u.uHor.value.copy(o.hor); u.uGnd.value.copy(o.hor);
      u.uTop.value.copy(o.hor).lerp(TOP_DAY, dayF * .75).multiplyScalar(mixN(.55, 1, dayF));
      u.uSun.value.copy(o.sunDir); u.uSunCol.value.copy(o.sunCol); u.uGlow.value = smooth(clamp01((o.e + .2) / .4)) * (1 - o.ind);
      u.uMoon.value.copy(o.sunDir).negate(); u.uMoonGlow.value = night * (1 - o.ind);
    }
    scene.environmentIntensity = (.05 + .2 * dayF) * (1 - .85 * o.ind);
    o.sunCol.multiplyScalar(fx.on ? 2.4 : 1);
  };
  const TOP_DAY = new THREE.Color("#4f86c9");

  API.tick = (t, dt) => {
    if (skyDome) skyDome.position.copy(camera.position);
    if (API._water) { API._water.offset.set(t * .012, t * .008); }
    const vis = 1 - ind;
    // 꽃잎 · 낙엽
    petalPts.material.opacity = .85 * dayF * vis; leafPts.material.opacity = .8 * dayF * vis; petalPts.visible = leafPts.visible = dayF * vis > .02;
    if (petalPts.visible) {
      for (const [f, p, sp] of [[petals, petalPts, .7], [leaves, leafPts, 1.05]]) {
        const a = f.pos, n = a.length / 3;
        for (let i = 0; i < n; i++) {
          const ph = f.ph[i * 2], k = f.ph[i * 2 + 1];
          a[i * 3] += (Math.sin(t * .6 + ph) * .7 + .55) * dt * k; a[i * 3 + 2] += Math.cos(t * .5 + ph * 1.3) * .5 * dt * k;
          a[i * 3 + 1] -= sp * k * dt * .8;
          if (a[i * 3 + 1] < .05 || a[i * 3] > 72) spawn(a, i, true);
        }
        p.geometry.attributes.position.needsUpdate = true;
      }
    }
    // 반딧불
    const fo = night * vis; flyPts.visible = fo > .02;
    if (flyPts.visible) {
      flyPts.material.opacity = fo * (.65 + .3 * Math.sin(t * 2.3));
      const a = flies.pos;
      for (let i = 0; i < nF; i++) { const ph = flies.ph[i * 2], k = flies.ph[i * 2 + 1]; a[i * 3] = flyBase[i * 3] + Math.sin(t * .31 * k + ph) * 1.8; a[i * 3 + 1] = flyBase[i * 3 + 1] + Math.sin(t * .5 * k + ph * 2) * .6; a[i * 3 + 2] = flyBase[i * 3 + 2] + Math.cos(t * .27 * k + ph) * 1.8; }
      flyPts.geometry.attributes.position.needsUpdate = true;
    }
    if (grassU) grassU.uTime.value = t;
  };

  // 6) 풀 · 들꽃 (배치 가능 여부는 main.js가 넘겨 준다)
  let grassU = null;
  API.addGrass = canPlace => {
    try {
      const NB = 0, NF = touch ? 150 : 380; // 뾰족한 풀잎은 없애고, 잔디는 깎은 잔디밭 질감으로 깔았다
      const bg = new THREE.ConeGeometry(.055, .5, 3, 1, true); bg.translate(0, .25, 0);
      const gm = new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide });
      grassU = { uTime: { value: 0 } };
      gm.onBeforeCompile = sh => {
        sh.uniforms.uTime = grassU.uTime;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;")
          .replace("#include <begin_vertex>", `#include <begin_vertex>
            float gh = position.y / 0.5; vec4 gw = instanceMatrix[3];
            transformed.x += sin(uTime * 1.6 + gw.x * 0.6 + gw.z * 0.4) * 0.09 * gh * gh;
            transformed.z += cos(uTime * 1.3 + gw.z * 0.5) * 0.06 * gh * gh;`);
      };
      gm.customProgramCacheKey = () => "grass";
      const blades = new THREE.InstancedMesh(bg, gm, NB), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
      const greens = ["#7f9a5c", "#93ad66", "#6e8b52", "#a2b56d", "#86a05f"];
      let n = 0, tries = 0;
      while (n < NB && tries++ < NB * 6) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 72, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!canPlace(x, z)) continue;
        const s = .6 + Math.random() * .9;
        e.set((Math.random() - .5) * .3, Math.random() * 6.28, (Math.random() - .5) * .3); q.setFromEuler(e);
        blades.setMatrixAt(n, m4.compose(ps.set(x, 0, z), q, sc.set(s, s * (.7 + Math.random() * .8), s)));
        blades.setColorAt(n, col.set(greens[Math.floor(Math.random() * greens.length)]).offsetHSL(0, 0, (Math.random() - .5) * .06)); n++;
      }
      blades.count = n; blades.castShadow = false; blades.receiveShadow = true; blades.frustumCulled = false; scene.add(blades);
      const fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshStandardMaterial({ roughness: .8 }), NF);
      const fc = ["#ffffff", "#fff2a8", "#ffc9d6", "#e8d9ff"]; let k = 0; tries = 0;
      while (k < NF && tries++ < NF * 20) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 70, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (!canPlace(x, z)) continue;
        fl.setMatrixAt(k, m4.compose(ps.set(x, .22 + Math.random() * .12, z), q.identity(), sc.set(1, .8, 1)));
        fl.setColorAt(k, col.set(fc[Math.floor(Math.random() * fc.length)])); k++;
      }
      fl.count = k; fl.castShadow = false; fl.frustumCulled = false; scene.add(fl);
    } catch (e) { console.warn("풀 레이어를 건너뜁니다", e); }
  };

  // 7) 블룸 (데스크톱 · 비동기 로딩 · 느리면 자동 해제)
  const fx = { on: false };
  let composer = null, bloom = null, frames = 0, acc = 0, last = 0;
  const wantFX = fxParam !== "0" && !touch && !lowEnd;
  if (wantFX) {
    Promise.all([
      import("three/addons/postprocessing/EffectComposer.js"), import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"), import("three/addons/postprocessing/OutputPass.js")
    ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }]) => {
      const sz = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
      const target = new THREE.WebGLRenderTarget(sz.x * pr, sz.y * pr, { type: THREE.HalfFloatType, samples: 4 });
      composer = new EffectComposer(renderer, target); composer.setPixelRatio(pr); composer.setSize(sz.x, sz.y);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(sz.x, sz.y), .28, .6, 1.0); composer.addPass(bloom);
      composer.addPass(new OutputPass());
      fx.on = true; frames = 0; acc = 0; last = 0;
    }).catch(e => console.warn("블룸을 건너뜁니다", e));
  }
  API.render = () => {
    if (fx.on && composer) {
      const now = performance.now();
      if (last) { acc += now - last; frames++; if (frames === 150) { if (acc / frames > 36) { fx.on = false; console.info("화면이 무거워 블룸을 껐습니다"); } } }
      last = now;
      if (bloom) bloom.strength = .26 + .2 * night;
      composer.render();
    } else renderer.render(scene, camera);
  };
  API.resize = (w, h) => { if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } };
  return API;
}
