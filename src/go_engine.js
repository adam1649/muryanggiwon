// 무량기원 · 바둑 규칙 엔진
// - 착수 · 따내기 · 자충(자살수) 금지 · 패(단순 패) · 패스
// - 계가: 한국 규칙(집 + 따낸 돌 + 사석, 덤 6.5). 사석은 무작위 대국(플레이아웃)으로 소유를 추정해 자동 판정
// - 인공지능: 입문 · 초급(수읽기 휴리스틱) / 중급 · 고급(몬테카를로 트리 탐색)
export const EMPTY = 0, BLACK = 1, WHITE = 2, EDGE = 3, PASS = 0;
export const KOMI = 6.5;

export class Board {
  constructor(n = 19) {
    this.n = n; const W = this.W = n + 2, L = this.L = W * W;
    this.c = new Uint8Array(L).fill(EDGE);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) this.c[(y + 1) * W + x + 1] = EMPTY;
    this.dir = [1, -1, W, -W]; this.dia = [W + 1, W - 1, -W + 1, -W - 1];
    this.sc = { mark: new Int32Array(L), lmark: new Int32Array(L), stack: new Int32Array(L), stamp: 1 };
    this.ko = -1; this.cap = [0, 0, 0]; this.turn = BLACK; this.last = -1; this.last2 = -1; this.passes = 0; this.moveNo = 0;
    this.lastLib = -1; this.lastCap = 0; this.gsize = 0; this.capList = [];
    this.emp = []; this.empIdx = new Int32Array(L).fill(-1);
    for (let p = 0; p < L; p++) if (this.c[p] === EMPTY) { this.empIdx[p] = this.emp.length; this.emp.push(p); }
  }
  clone() {
    const b = Object.create(Board.prototype);
    b.n = this.n; b.W = this.W; b.L = this.L; b.c = this.c.slice(); b.dir = this.dir; b.dia = this.dia; b.sc = this.sc;
    b.ko = this.ko; b.cap = this.cap.slice(); b.turn = this.turn; b.last = this.last; b.last2 = this.last2; b.passes = this.passes; b.moveNo = this.moveNo;
    b.lastLib = -1; b.lastCap = 0; b.gsize = 0; b.capList = [];
    b.emp = this.emp.slice(); b.empIdx = this.empIdx.slice(); return b;
  }
  pos(x, y) { return (y + 1) * this.W + x + 1; }
  xy(p) { return [p % this.W - 1, Math.floor(p / this.W) - 1]; }
  line(p) { const [x, y] = this.xy(p), n = this.n; return Math.min(x, y, n - 1 - x, n - 1 - y); }
  _addEmp(p) { this.empIdx[p] = this.emp.length; this.emp.push(p); }
  _delEmp(p) { const i = this.empIdx[p], last = this.emp.pop(); if (last !== p) { this.emp[i] = last; this.empIdx[last] = i; } this.empIdx[p] = -1; }
  // 돌 무리의 활로 수 (limit에 닿으면 바로 멈춘다). gsize: 무리 크기(끝까지 센 경우만 정확)
  libs(p, limit = 999) {
    const c = this.c, col = c[p], sc = this.sc, st = ++sc.stamp, mark = sc.mark, lmark = sc.lmark, stack = sc.stack, dir = this.dir;
    let sp = 0, n = 0, g = 0; stack[sp++] = p; mark[p] = st;
    while (sp) {
      const q = stack[--sp]; g++;
      for (let k = 0; k < 4; k++) {
        const r = q + dir[k], v = c[r];
        if (v === EMPTY) { if (lmark[r] !== st) { lmark[r] = st; n++; this.lastLib = r; if (n >= limit) { this.gsize = g; return n; } } }
        else if (v === col && mark[r] !== st) { mark[r] = st; stack[sp++] = r; }
      }
    }
    this.gsize = g; return n;
  }
  remove(p) {
    const c = this.c, col = c[p], stack = this.sc.stack, dir = this.dir; let sp = 0, n = 0;
    stack[sp++] = p; c[p] = EMPTY; this._addEmp(p); this.capList.push(p);
    while (sp) { const q = stack[--sp]; n++; for (let k = 0; k < 4; k++) { const r = q + dir[k]; if (c[r] === col) { c[r] = EMPTY; this._addEmp(r); this.capList.push(r); stack[sp++] = r; } } }
    return n;
  }
  legal(p, col) {
    if (p === PASS) return true;
    const c = this.c; if (c[p] !== EMPTY || p === this.ko) return false;
    const dir = this.dir;
    for (let k = 0; k < 4; k++) if (c[p + dir[k]] === EMPTY) return true;
    for (let k = 0; k < 4; k++) { const r = p + dir[k], v = c[r]; if (v === col) { if (this.libs(r, 2) > 1) return true; } else if (v === 3 - col) { if (this.libs(r, 2) === 1) return true; } }
    return false;
  }
  play(p, col = this.turn) {
    this.capList = [];
    if (p === PASS) { this.passes++; this.ko = -1; this.last2 = this.last; this.last = PASS; this.turn = 3 - col; this.moveNo++; this.lastCap = 0; return true; }
    if (!this.legal(p, col)) return false;
    const c = this.c, opp = 3 - col, dir = this.dir; c[p] = col; this._delEmp(p);
    let capN = 0, capP = -1;
    for (let k = 0; k < 4; k++) { const r = p + dir[k]; if (c[r] === opp && this.libs(r, 1) === 0) { capP = r; capN += this.remove(r); } }
    this.ko = -1;
    if (capN === 1) { const L = this.libs(p, 2); if (L === 1 && this.gsize === 1) this.ko = capP; }
    this.cap[col] += capN; this.lastCap = capN; this.passes = 0; this.last2 = this.last; this.last = p; this.turn = opp; this.moveNo++;
    return true;
  }
  isEye(p, col) { // 자기 눈(메우면 손해인 자리)
    const c = this.c; for (let k = 0; k < 4; k++) { const v = c[p + this.dir[k]]; if (v !== col && v !== EDGE) return false; }
    let bad = 0, edge = 0; for (let k = 0; k < 4; k++) { const v = c[p + this.dia[k]]; if (v === EDGE) edge = 1; else if (v === 3 - col) bad++; }
    return edge ? bad === 0 : bad < 2;
  }
  selfAtari(p, col) { // 두면 단수가 되고 아무것도 못 잡는 자리(큰 무리일수록 나쁨). 반환: 0 아님 · 1 한 점 · 2 여러 점
    const c = this.c, opp = 3 - col, dir = this.dir; c[p] = col; let res = 0, cap = false;
    for (let k = 0; k < 4; k++) { const r = p + dir[k]; if (c[r] === opp && this.libs(r, 1) === 0) { cap = true; break; } }
    if (!cap) { const L = this.libs(p, 2); if (L < 2) res = this.gsize > 1 ? 2 : 1; }
    c[p] = EMPTY; return res;
  }
  tactical(col) { // 바로 앞 수에 대한 응수: 단수된 상대 돌 잡기 · 내 돌 단수 살리기
    const q = this.last; if (q <= 0) return PASS;
    const c = this.c, dir = this.dir;
    if (c[q] === 3 - col && this.libs(q, 2) === 1) { const L = this.lastLib; if (this.legal(L, col)) return L; }
    for (let k = 0; k < 4; k++) {
      const r = q + dir[k]; if (c[r] !== col || this.libs(r, 2) !== 1) continue;
      const L = this.lastLib; if (!this.legal(L, col)) continue;
      c[L] = col; const n2 = this.libs(L, 3); c[L] = EMPTY; if (n2 >= 2) return L;
    }
    return PASS;
  }
  areaScore() { // 흑 - 백 (덤 제외, 집+돌). 플레이아웃 끝 판정용
    const c = this.c, dir = this.dir, n = this.n, W = this.W; let s = 0;
    for (let y = 1; y <= n; y++) for (let x = 1; x <= n; x++) {
      const p = y * W + x, v = c[p];
      if (v === BLACK) s++; else if (v === WHITE) s--;
      else { let b = 0, w = 0; for (let k = 0; k < 4; k++) { const nv = c[p + dir[k]]; if (nv === BLACK) b = 1; else if (nv === WHITE) w = 1; } if (b && !w) s++; else if (w && !b) s--; }
    }
    return s;
  }
  owner(p) { const v = this.c[p]; if (v === BLACK) return 1; if (v === WHITE) return -1; let b = 0, w = 0; for (let k = 0; k < 4; k++) { const nv = this.c[p + this.dir[k]]; if (nv === BLACK) b = 1; else if (nv === WHITE) w = 1; } return b && !w ? 1 : w && !b ? -1 : 0; }
}

export function fromMoves(n, moves) { // moves: [[x,y] | null(패스)]
  const b = new Board(n);
  for (const m of moves) { const p = m ? b.pos(m[0], m[1]) : PASS; if (!b.play(p, b.turn)) return null; }
  return b;
}

// ---------- 플레이아웃: 무작위지만 눈은 메우지 않고, 바로 앞 수에는 응수한다 ----------
export function playout(b, maxMoves) {
  let col = b.turn, passes = b.passes; const emp = b.emp;
  for (let i = 0; i < maxMoves; i++) {
    let mv = PASS;
    if (b.last > 0 && Math.random() < .9) mv = b.tactical(col);
    if (mv === PASS) {
      const n = emp.length;
      if (n) { const k = (Math.random() * n) | 0; for (let j = 0; j < n; j++) { const p = emp[(k + j) % n]; if (!b.isEye(p, col) && b.legal(p, col) && b.selfAtari(p, col) !== 2) { mv = p; break; } } }
    }
    b.play(mv, col);
    if (mv === PASS) { if (++passes >= 2) break; } else passes = 0;
    col = 3 - col;
  }
  return b.areaScore();
}

// ---------- 사석 판정 + 한국식 계가 ----------
export function ownership(b, N = 120) {
  const own = new Float32Array(b.L), n = b.n, W = b.W;
  for (let i = 0; i < N; i++) { const t = b.clone(); t.passes = 0; playout(t, n * n * 3); for (let y = 1; y <= n; y++) for (let x = 1; x <= n; x++) { const p = y * W + x; own[p] += t.owner(p); } }
  for (let p = 0; p < own.length; p++) own[p] /= N;
  return own;
}
export function finalScore(b, own, komi = KOMI) {
  const t = b.clone(), n = b.n, W = b.W, c = t.c, dead = [];
  let capB = b.cap[BLACK], capW = b.cap[WHITE];
  for (let y = 1; y <= n; y++) for (let x = 1; x <= n; x++) { const p = y * W + x, v = c[p]; if (v === BLACK && own[p] < -.35) { dead.push(p); capW++; } else if (v === WHITE && own[p] > .35) { dead.push(p); capB++; } }
  for (const p of dead) c[p] = EMPTY;
  const terr = new Int8Array(b.L), seen = new Uint8Array(b.L), stack = []; let tB = 0, tW = 0;
  for (let y = 1; y <= n; y++) for (let x = 1; x <= n; x++) {
    const p0 = y * W + x; if (c[p0] !== EMPTY || seen[p0]) continue;
    const reg = []; let bb = 0, ww = 0; stack.push(p0); seen[p0] = 1;
    while (stack.length) { const q = stack.pop(); reg.push(q); for (const d of t.dir) { const r = q + d, v = c[r]; if (v === EMPTY && !seen[r]) { seen[r] = 1; stack.push(r); } else if (v === BLACK) bb = 1; else if (v === WHITE) ww = 1; } }
    if (bb && !ww) { tB += reg.length; for (const q of reg) terr[q] = 1; } else if (ww && !bb) { tW += reg.length; for (const q of reg) terr[q] = -1; }
  }
  const B = tB + capB, Wt = tW + capW + komi;
  return { black: B, white: Wt, terrB: tB, terrW: tW, capB, capW, komi, dead: dead.map(p => b.xy(p)), terr: Array.from({ length: n * n }, (_, i) => terr[(Math.floor(i / n) + 1) * W + (i % n) + 1]), winner: B > Wt ? BLACK : WHITE, margin: Math.abs(B - Wt) };
}

// ---------- 후보수 휴리스틱 ----------
export function candidates(b, col, max = 60) {
  const n = b.n, c = b.c, dir = b.dir, opp = 3 - col, out = [], open = b.moveNo < n * n / 7, late = b.moveNo > n * n * .45;
  const [lx, ly] = b.last > 0 ? b.xy(b.last) : [-9, -9], [l2x, l2y] = b.last2 > 0 ? b.xy(b.last2) : [-9, -9];
  const inAtari = []; // 지금 단수에 몰린 내 무리
  for (const p of b.emp) {
    if (!b.legal(p, col) || b.isEye(p, col)) continue;
    let s = 0, ownN = 0, edgeN = 0; for (let k = 0; k < 4; k++) { const v = c[p + dir[k]]; if (v === col) ownN++; else if (v === EDGE) edgeN++; }
    if (late && ownN + edgeN === 4) continue; // 막바지에 자기 집 메우기는 하지 않는다
    // 둔 뒤의 모양을 잠깐 놓아 보고 따진다
    let save = 0; for (let k = 0; k < 4; k++) { const r = p + dir[k]; if (c[r] === col && b.libs(r, 2) === 1) save = Math.max(save, b.libs(r) && b.gsize); }
    c[p] = col; let capN = 0, ataris = 0;
    for (let k = 0; k < 4; k++) { const r = p + dir[k]; if (c[r] === opp) { const L = b.libs(r, 2); if (L === 0) { b.libs(r); capN += b.gsize; } else if (L === 1) { b.libs(r); ataris += Math.min(4, b.gsize); } } }
    const myL = b.libs(p, 4), myG = b.gsize; c[p] = EMPTY;
    if (capN) s += 4 + Math.min(10, capN * 1.6);
    if (save && myL >= 2) s += 3 + Math.min(8, save * 1.2);
    if (myL === 1 && !capN) s -= myG > 1 ? 7 : 2.5; else if (myL === 2 && !capN && myG > 3) s -= 1;
    if (ataris && myL >= 2) s += 1.2 + ataris * .35;
    const [x, y] = b.xy(p), line = Math.min(x, y, n - 1 - x, n - 1 - y);
    const d1 = Math.abs(x - lx) + Math.abs(y - ly), d2 = Math.abs(x - l2x) + Math.abs(y - l2y);
    if (d1 <= 2) s += 1.3 - d1 * .2; else if (d1 <= 4 && !open) s += .3; if (d2 <= 2) s += .5;
    if (line === 0) s -= open ? 2.2 : (capN || save ? 0 : 1.1); else if (line === 1) s -= open ? 1.1 : .25;
    if (open && n >= 9) { if (line === 2 || line === 3) s += 1; let near = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < n && yy < n && c[b.pos(xx, yy)] !== EMPTY) near++; } if (!near) s += n >= 13 ? 1.4 : .6; if (n >= 13 && b.moveNo < 10) { const cx = Math.min(x, n - 1 - x), cy = Math.min(y, n - 1 - y); if ((cx === 3 && cy === 3) || (cx === 2 && cy === 3) || (cx === 3 && cy === 2)) s += 1.6; } }
    if (!open && ownN >= 3) s -= .8; // 빈 삼각 · 뭉친 모양
    out.push([p, s + Math.random() * .25]);
  }
  out.sort((a, b2) => b2[1] - a[1]);
  if (out.length > max) out.length = max;
  void inAtari; return out;
}

// ---------- 인공지능 ----------
const softPick = (list, k, temp) => { const top = list.slice(0, k); if (!top.length) return PASS; const m = top[0][1], ws = top.map(([, s]) => Math.exp((s - m) / temp)); let r = Math.random() * ws.reduce((a, v) => a + v, 0); for (let i = 0; i < top.length; i++) { r -= ws[i]; if (r <= 0) return top[i][0]; } return top[0][0]; };

export function think(b, level = 2, komi = KOMI, budget = 0) {
  const col = b.turn, n = b.n;
  const cands = candidates(b, col, n >= 19 ? 42 : 60);
  if (!cands.length) return { move: PASS, wr: .5 };
  if (level <= 1) { // 입문 · 초급
    if (b.last === PASS && b.moveNo > n * n * .4) return { move: PASS, wr: .5 };
    if (cands[0][1] < -1.5 && b.moveNo > n * n * .35) return { move: PASS, wr: .5 };
    return { move: level === 0 ? softPick(cands, 14, 1.8) : softPick(cands, 5, .55), wr: .5 };
  }
  // 중급 · 고급: 몬테카를로 트리 탐색(후보를 차츰 넓혀 가며 본다)
  const ms = budget || (level === 2 ? (n >= 19 ? 1500 : 1000) : (n >= 19 ? 3600 : 2600));
  const t0 = Date.now(), maxM = n * n * 2 + 20;
  const withPass = b.last === PASS || b.moveNo > n * n * .5;
  const mk = (m, colMoved, prior) => ({ m, col: colMoved, n: 0, w: 0, prior, kids: [], cands: null });
  const pri = s => 1 / (1 + Math.exp(-s / 2.5));
  const root = mk(-1, 3 - col, 1); root.cands = cands.map(([p, s]) => [p, pri(s)]); if (withPass) root.cands.push([PASS, .35]);
  let iters = 0;
  while (Date.now() - t0 < ms || iters < 40) {
    iters++;
    const t = b.clone(), path = [root]; let node = root;
    for (;;) {
      if (!node.cands) { const cc = candidates(t, t.turn, 24); node.cands = cc.map(([p, s]) => [p, pri(s)]); if (!node.cands.length) node.cands.push([PASS, .5]); }
      const allow = Math.min(node.cands.length, 2 + Math.floor(Math.sqrt(node.n) * 1.3));
      if (node.kids.length < allow) {
        const [m, pr] = node.cands[node.kids.length], who = t.turn;
        if (!t.play(m, who)) { node.cands.splice(node.kids.length, 1); continue; }
        const kid = mk(m, who, pr); node.kids.push(kid); path.push(kid); break;
      }
      if (!node.kids.length) break;
      const lnN = Math.log(node.n + 1); let best = null, bv = -1e9;
      for (const k of node.kids) { const v = (k.n ? k.w / k.n : .5) + .9 * Math.sqrt(lnN / (k.n + 1)) + k.prior / (k.n + 1); if (v > bv) { bv = v; best = k; } }
      t.play(best.m, t.turn); node = best; path.push(node);
      if (t.passes >= 2) break;
    }
    const sc = (t.passes >= 2 ? t.areaScore() : playout(t, maxM)) - komi, win = sc > 0 ? BLACK : WHITE;
    for (const nd of path) { nd.n++; if (nd.col === win) nd.w++; }
  }
  let best = null; for (const k of root.kids) if (!best || k.n > best.n) best = k;
  if (!best) return { move: cands[0][0], wr: .5, iters };
  const wr = best.w / Math.max(1, best.n);
  if (wr < .04 && b.moveNo > n * n / 4 && root.n > 300) return { move: "resign", wr, iters };
  if (b.last === PASS) { const pk = root.kids.find(k => k.m === PASS); if (pk && pk.n > 10 && pk.w / pk.n > .55) return { move: PASS, wr: pk.w / pk.n, iters }; }
  return { move: best.m, wr, iters };
}
