// 무량기원 · 바둑판 창 (2D) — 대국 · 관전 · 대국 준비 · 계가 표시
import { Board, PASS, BLACK, WHITE } from "./go_engine.js?v=1";

const COLS = "ABCDEFGHJKLMNOPQRST";
const STARS = { 9: [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]], 13: [[3, 3], [9, 3], [3, 9], [9, 9], [6, 6]], 19: [3, 9, 15].flatMap(x => [3, 9, 15].map(y => [x, y])) };
const coarse = () => matchMedia("(pointer:coarse)").matches;

export class GoPanel {
  constructor(host, cb) {
    this.cb = cb; this.state = null; this.board = new Board(19); this.me = 0; this.hover = null; this.pending = null; this.scoreView = null;
    const el = this.el = document.createElement("section"); el.className = "go-panel"; el.hidden = true; el.setAttribute("aria-label", "바둑판");
    el.innerHTML = `
      <div class="gp-head"><div><div class="gp-kicker">無量棋院 · BADUK</div><h2 class="gp-title">대국석</h2></div><button type="button" class="gp-x" aria-label="닫기">×</button></div>
      <div class="gp-setup" hidden>
        <p class="gp-lead">어떻게 두시겠어요?</p>
        <div class="gp-opt"><span>상대</span><div class="gp-seg" data-k="opp"><button data-v="ai" class="on">인공지능</button><button data-v="pvp">방문객 기다리기</button></div></div>
        <div class="gp-opt gp-ai-only"><span>기력</span><div class="gp-seg" data-k="lv"><button data-v="0">입문</button><button data-v="1" class="on">초급</button><button data-v="2">중급</button><button data-v="3">고급</button></div></div>
        <div class="gp-opt"><span>판 크기</span><div class="gp-seg" data-k="size"><button data-v="9">9줄</button><button data-v="13">13줄</button><button data-v="19" class="on">19줄</button></div></div>
        <div class="gp-opt"><span>내 돌</span><div class="gp-seg" data-k="col"><button data-v="1" class="on">흑 (먼저)</button><button data-v="2">백</button><button data-v="0">무작위</button></div></div>
        <p class="gp-note">한국 규칙 · 덤 6.5집 · 두 번 연속 패스하면 자동으로 계가합니다.</p>
        <div class="gp-row"><button type="button" class="outline-button gp-leave">일어나기</button><button type="button" class="solid-button gp-start">대국 시작</button></div>
      </div>
      <div class="gp-game">
        <div class="gp-players">
          <div class="gp-p" data-c="1"><i class="gp-stone b"></i><div><b class="gp-name">흑</b><small class="gp-cap">따낸 돌 0</small></div></div>
          <div class="gp-vs">VS</div>
          <div class="gp-p" data-c="2"><i class="gp-stone w"></i><div><b class="gp-name">백</b><small class="gp-cap">따낸 돌 0</small></div></div>
        </div>
        <div class="gp-board"><canvas aria-label="바둑판 (눌러서 착수)"></canvas></div>
        <div class="gp-status" aria-live="polite">대국을 기다리는 중</div>
        <div class="gp-actions">
          <button type="button" class="outline-button" data-a="pass">패스</button>
          <button type="button" class="outline-button" data-a="undo">무르기</button>
          <button type="button" class="outline-button" data-a="resign">기권</button>
          <button type="button" class="outline-button" data-a="new">새 대국</button>
          <button type="button" class="outline-button" data-a="leave">일어나기</button>
        </div>
      </div>`;
    host.appendChild(el);
    this.cv = el.querySelector("canvas"); this.ctx = this.cv.getContext("2d");
    this.opt = { opp: "ai", lv: 1, size: 19, col: 1 };
    el.querySelectorAll(".gp-seg").forEach(seg => seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return; seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      const k = seg.dataset.k, v = b.dataset.v; this.opt[k] = k === "opp" ? v : +v; el.querySelector(".gp-ai-only").hidden = this.opt.opp !== "ai";
    }));
    el.querySelector(".gp-x").addEventListener("click", () => cb.onClose && cb.onClose());
    el.querySelector(".gp-leave").addEventListener("click", () => cb.onLeave && cb.onLeave());
    el.querySelector(".gp-start").addEventListener("click", () => cb.onStart && cb.onStart({ ...this.opt }));
    el.querySelectorAll("[data-a]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.a; this.pending = null;
      if (a === "pass") cb.onPass && cb.onPass(); else if (a === "undo") cb.onUndo && cb.onUndo();
      else if (a === "resign") { if (b.dataset.sure) { delete b.dataset.sure; b.textContent = "기권"; cb.onResign && cb.onResign(); } else { b.dataset.sure = "1"; b.textContent = "정말 기권"; setTimeout(() => { delete b.dataset.sure; b.textContent = "기권"; }, 4000); } }
      else if (a === "new") cb.onNew && cb.onNew(); else if (a === "leave") cb.onLeave && cb.onLeave();
    }));
    const pt = e => { const r = this.cv.getBoundingClientRect(), n = this.board.n, g = this.geo; if (!g) return null; const x = Math.round(((e.clientX - r.left) * g.k - g.o) / g.s), y = Math.round(((e.clientY - r.top) * g.k - g.o) / g.s); return x >= 0 && y >= 0 && x < n && y < n ? [x, y] : null; };
    this.cv.addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; const p = pt(e); const h = p && this.canPlace(p) ? p : null; if (String(h) !== String(this.hover)) { this.hover = h; this.draw(); } });
    this.cv.addEventListener("pointerleave", () => { this.hover = null; this.draw(); });
    this.cv.addEventListener("click", e => {
      const p = pt(e); if (!p || !this.canPlace(p)) return;
      if (e.pointerType === "touch" || (e.pointerType === undefined && coarse())) { // 터치: 한 번 누르면 미리보기, 같은 자리를 다시 누르면 착수
        if (!this.pending || this.pending[0] !== p[0] || this.pending[1] !== p[1]) { this.pending = p; this.hover = p; this.setStatus("같은 자리를 한 번 더 누르면 착수합니다 · " + this.coord(p)); this.draw(); return; }
      }
      this.pending = null; this.hover = null; cb.onMove && cb.onMove(p[0], p[1]);
    });
    this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(this.cv);
    addEventListener("keydown", e => { if (this.el.hidden || (e.target.closest && e.target.closest("input,textarea"))) return; if (e.code === "Escape") cb.onClose && cb.onClose(); });
  }
  coord(p) { return COLS[p[0]] + (this.board.n - p[1]); }
  open(title) { this.el.querySelector(".gp-title").textContent = title; this.el.hidden = false; this.draw(); }
  close() { this.el.hidden = true; this.pending = null; this.hover = null; }
  get isOpen() { return !this.el.hidden; }
  setup(on, size) { this.el.querySelector(".gp-setup").hidden = !on; this.el.querySelector(".gp-game").hidden = on; if (on && size) { this.opt.size = size; this.el.querySelectorAll('[data-k="size"] button').forEach(b => b.classList.toggle("on", +b.dataset.v === size)); } if (!on) this.draw(); }
  setStatus(t) { this.el.querySelector(".gp-status").textContent = t; }
  canPlace(p) { const s = this.state; if (!s || s.status !== "play" || !this.me || this.board.turn !== this.me || s.thinking) return false; return this.board.legal(this.board.pos(p[0], p[1]), this.me); }
  // state: { size, moves, names:[,b,w], status, result, ai, me, thinking, score, title }
  update(state, board, me) {
    this.state = state; this.board = board; this.me = me; this.scoreView = state.score || null;
    if (this.pending && !this.canPlace(this.pending)) this.pending = null;
    const el = this.el;
    for (const c of [BLACK, WHITE]) { const p = el.querySelector(`.gp-p[data-c="${c}"]`); p.querySelector(".gp-name").textContent = state.names[c] || (state.status === "wait" ? "기다리는 중…" : "—"); p.querySelector(".gp-cap").textContent = "따낸 돌 " + board.cap[c] + (me === c ? " · 나" : ""); p.classList.toggle("turn", state.status === "play" && board.turn === c); }
    const A = k => el.querySelector(`[data-a="${k}"]`), playing = state.status === "play" && !!me, mine = playing && board.turn === me && !state.thinking;
    A("pass").hidden = !playing; A("pass").disabled = !mine; A("resign").hidden = !playing;
    A("undo").hidden = !(playing && state.ai); A("undo").disabled = !(state.moves.length >= 2 && !state.thinking);
    A("new").hidden = !(me && state.status === "end"); A("leave").hidden = !me;
    let st;
    if (state.status === "wait") st = me ? "맞은편에 다른 방문객이 앉으면 대국이 시작됩니다." : "대국 상대를 기다리고 있습니다. 비어 있는 자리에 앉으면 함께 둘 수 있어요.";
    else if (state.status === "end") st = state.result || "대국이 끝났습니다.";
    else if (state.scoring) st = "두 번 연속 패스 · 계가하는 중…";
    else if (state.thinking) st = (state.names[board.turn] || "인공지능") + " 생각하는 중…";
    else { const who = board.turn === BLACK ? "흑" : "백", lm = state.moves.length ? state.moves[state.moves.length - 1] : undefined; st = (mine ? "내 차례입니다 (" + who + ")" : who + " 차례 · " + (state.names[board.turn] || "")) + (lm === null ? " · 상대가 패스했습니다" : lm ? " · 직전 " + this.coord(lm) : ""); if (!me) st = "관전 중 · " + st; }
    this.setStatus(st); this.draw();
  }
  draw() {
    const cv = this.cv, r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(2.5, devicePixelRatio || 1), W = Math.round(r.width * dpr); if (cv.width !== W || cv.height !== W) { cv.width = cv.height = W; }
    const x = this.ctx, b = this.board, n = b.n, o = W * (n >= 19 ? .052 : .072), s = (W - 2 * o) / (n - 1); this.geo = { o, s, k: dpr };
    // 비자나무 판: 밝은 황색 + 은은한 결
    const g = x.createLinearGradient(0, 0, W, W); g.addColorStop(0, "#e9c27a"); g.addColorStop(.5, "#ddb064"); g.addColorStop(1, "#d3a257"); x.fillStyle = g; x.fillRect(0, 0, W, W);
    x.save(); x.globalAlpha = .09; let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 46; i++) { x.strokeStyle = rnd() < .5 ? "#8a5a20" : "#fff3d0"; x.lineWidth = .6 + rnd() * 2 * dpr; x.beginPath(); const y0 = rnd() * W; x.moveTo(0, y0); x.bezierCurveTo(W * .3, y0 + (rnd() - .5) * 40 * dpr, W * .7, y0 + (rnd() - .5) * 40 * dpr, W, y0 + (rnd() - .5) * 30 * dpr); x.stroke(); }
    x.restore();
    x.strokeStyle = "rgba(40,26,10,.85)"; x.lineWidth = Math.max(1, dpr * .9);
    for (let i = 0; i < n; i++) { const p = o + i * s; x.beginPath(); x.moveTo(o, p); x.lineTo(W - o, p); x.moveTo(p, o); x.lineTo(p, W - o); x.stroke(); }
    x.lineWidth = Math.max(1.5, dpr * 1.6); x.strokeRect(o, o, W - 2 * o, W - 2 * o);
    x.fillStyle = "rgba(40,26,10,.9)"; for (const [a, c] of STARS[n] || []) { x.beginPath(); x.arc(o + a * s, o + c * s, Math.max(2, s * .11), 0, 7); x.fill(); }
    // 좌표
    x.fillStyle = "rgba(60,38,14,.75)"; x.font = `600 ${Math.max(8, Math.min(o * .42, s * .42))}px Pretendard Variable, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
    for (let i = 0; i < n; i++) { x.fillText(COLS[i], o + i * s, o * .45); x.fillText(String(n - i), o * .45, o + i * s); }
    const sv = this.scoreView, dead = new Set(sv ? sv.dead.map(([a, c]) => a + "," + c) : []);
    // 집 표시(계가)
    if (sv && sv.terr) for (let i = 0; i < n * n; i++) { const t = sv.terr[i]; if (!t) continue; const a = i % n, c = Math.floor(i / n); x.fillStyle = t > 0 ? "rgba(20,20,20,.75)" : "rgba(250,250,250,.9)"; const q = s * .26; x.fillRect(o + a * s - q / 2, o + c * s - q / 2, q, q); }
    const stone = (a, c, col, alpha = 1) => {
      const cx = o + a * s, cy = o + c * s, R = s * .48; x.save(); x.globalAlpha = alpha;
      x.fillStyle = "rgba(0,0,0,.28)"; x.beginPath(); x.arc(cx + R * .1, cy + R * .14, R, 0, 7); x.fill();
      const gr = x.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
      if (col === BLACK) { gr.addColorStop(0, "#6a6a6a"); gr.addColorStop(.35, "#262626"); gr.addColorStop(1, "#060606"); } else { gr.addColorStop(0, "#ffffff"); gr.addColorStop(.6, "#eeece6"); gr.addColorStop(1, "#bdb9b0"); }
      x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill(); x.restore();
    };
    for (let c = 0; c < n; c++) for (let a = 0; a < n; a++) { const v = b.c[b.pos(a, c)]; if (v === BLACK || v === WHITE) stone(a, c, v, dead.has(a + "," + c) ? .45 : 1); }
    for (const k of dead) { const [a, c] = k.split(",").map(Number), cx = o + a * s, cy = o + c * s, q = s * .2; x.strokeStyle = "#d6453d"; x.lineWidth = Math.max(1.5, s * .07); x.beginPath(); x.moveTo(cx - q, cy - q); x.lineTo(cx + q, cy + q); x.moveTo(cx + q, cy - q); x.lineTo(cx - q, cy + q); x.stroke(); }
    if (b.last > 0) { const [a, c] = b.xy(b.last), v = b.c[b.last]; if (v === BLACK || v === WHITE) { x.strokeStyle = v === BLACK ? "#f4f1e8" : "#1d1d1d"; x.lineWidth = Math.max(1.5, s * .08); x.beginPath(); x.arc(o + a * s, o + c * s, s * .2, 0, 7); x.stroke(); } }
    if (this.hover && this.me) stone(this.hover[0], this.hover[1], this.me, this.pending ? .7 : .42);
  }
}
