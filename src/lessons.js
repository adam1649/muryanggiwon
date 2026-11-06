// 무량기원 교육원 · 입문 강좌 (9줄 판으로 한 단계씩 직접 두어 보며 배운다)
import { Board, PASS, BLACK, WHITE } from "./go_engine.js?v=1";
import { paintBoard, boardPoint, COORD } from "./baduk_ui.js?v=2";

// 좌표 [x, y]: x는 왼쪽부터, y는 위쪽부터 0. 배우는 사람은 언제나 흑.
// task: free(아무 곳) · move(정답 자리) · capture(백을 n개 따낼 때까지, 백은 응수하지 않음) · illegal(둘 수 없는 곳 눌러 보기) · read(읽기만)
export const LESSONS = [
  { t: "바둑판과 돌", steps: [
    { text: "바둑은 흑과 백이 번갈아 가며 줄과 줄이 만나는 점(교차점)에 돌을 하나씩 놓는 놀이입니다. 흑이 먼저 둡니다. 한 번 놓은 돌은 옮기지 않아요.\n아무 교차점에나 흑돌을 하나 놓아 보세요.", task: { type: "free" } },
    { text: "판 위의 굵은 점을 화점이라고 합니다. 처음에는 귀(모서리) 가까운 화점부터 두는 일이 많아요.\n화점 중 한 곳에 놓아 보세요.", task: { type: "move", ans: [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]], ok: "좋습니다. 귀 → 변 → 가운데 순서로 넓혀 가는 것이 기본입니다." } }] },
  { t: "활로(숨)", steps: [
    { text: "돌과 줄로 바로 이어진 빈 점을 「활로」 또는 「숨」이라고 합니다. 가운데 백돌은 위·아래·왼쪽·오른쪽 네 개의 활로가 있어요.\n흑을 번갈아 놓아 백돌의 활로를 모두 막아 보세요. (백은 두지 않고 기다립니다)", setup: { w: [[4, 4]] }, task: { type: "capture", n: 1, max: 6, ok: "활로가 하나도 남지 않은 돌은 판에서 들어냅니다. 이것을 「따낸다」고 해요." } },
    { text: "흑이 세 방향을 이미 막았습니다. 백돌에게 남은 마지막 활로 한 곳을 막아 따내 보세요.", setup: { b: [[4, 3], [3, 4], [5, 4]], w: [[4, 4]] }, task: { type: "move", ans: [[4, 5]], ok: "따냈습니다! 따낸 돌은 계가할 때 내 점수가 됩니다." } }] },
  { t: "따내기 연습", steps: [
    { text: "이어진 돌은 한 덩어리로 활로를 셉니다. 백 두 점의 활로가 하나 남았어요. 따내 보세요.", setup: { b: [[3, 4], [6, 4], [4, 3], [5, 3], [4, 5]], w: [[4, 4], [5, 4]] }, task: { type: "move", ans: [[5, 5]], ok: "두 점을 한 번에 따냈습니다." } },
    { text: "변(가장자리)에서는 판 밖이 활로가 아니므로 활로가 더 적습니다. 백돌을 따내 보세요.", setup: { b: [[0, 3], [1, 4]], w: [[0, 4]] }, task: { type: "move", ans: [[0, 5]], ok: "변의 돌은 활로가 셋, 귀의 돌은 둘뿐이에요." } },
    { text: "귀(모서리)의 백돌입니다. 활로는 두 개뿐이고 하나는 이미 막혔어요. 따내 보세요.", setup: { b: [[1, 0]], w: [[0, 0]] }, task: { type: "move", ans: [[0, 1]], ok: "잘했습니다!" } }] },
  { t: "단수와 도망", steps: [
    { text: "활로가 하나만 남은 상태를 「단수」라고 합니다. 가운데 흑돌이 단수에 걸렸어요! 돌을 이어 뻗어 활로를 늘려 살려 보세요.", setup: { b: [[4, 4]], w: [[4, 3], [3, 4], [5, 4]] }, task: { type: "move", ans: [[4, 5]], ok: "이어 뻗으니 활로가 셋으로 늘었습니다. 단수에 걸리면 먼저 도망칠 길이 있는지 봅니다." } },
    { text: "이번에는 상대를 단수 쳐 볼까요? 백돌의 활로가 둘 남았습니다. 하나를 막아 단수를 쳐 보세요.", setup: { b: [[4, 3], [3, 4]], w: [[4, 4]] }, task: { type: "move", ans: [[5, 4], [4, 5]], ok: "단수! 상대는 이제 도망치거나 잡히게 됩니다." } }] },
  { t: "둘 수 없는 곳(자충수)", steps: [
    { text: "놓자마자 활로가 하나도 없어지는 자리에는 둘 수 없습니다(자충수). 백돌에 둘러싸인 가운데(E5)를 눌러 보세요.", setup: { w: [[4, 3], [3, 4], [5, 4], [4, 5]] }, task: { type: "illegal", ans: [[4, 4]], ok: "그렇죠, 그곳은 둘 수 없는 곳입니다." } },
    { text: "단, 놓으면서 상대 돌을 따낼 수 있다면 둘 수 있어요. 오른쪽 백돌(F5)은 활로가 E5 하나뿐입니다. E5에 두어 따내 보세요.", setup: { b: [[6, 4], [5, 3], [5, 5]], w: [[4, 3], [3, 4], [4, 5], [5, 4]] }, task: { type: "move", ans: [[4, 4]], ok: "상대를 따내면 활로가 생기므로 둘 수 있습니다." } }] },
  { t: "패", steps: [
    { text: "서로 한 점씩 끝없이 따낼 수 있는 모양을 「패」라고 합니다. 먼저 백 한 점(E5)을 따내 보세요.", setup: { b: [[4, 3], [3, 4], [4, 5]], w: [[4, 4], [5, 3], [6, 4], [5, 5]] }, task: { type: "move", ans: [[5, 4]], ok: "패를 따냈습니다." } },
    { text: "패를 따낸 바로 다음에 상대는 곧장 되따낼 수 없습니다. 다른 곳에 한 수(팻감)를 둔 뒤에야 다시 따낼 수 있어요. 이렇게 해야 같은 모양이 끝없이 반복되지 않습니다.", task: { type: "read" } }] },
  { t: "집", steps: [
    { text: "내 돌로 둘러싼 빈 점을 「집」이라고 합니다. 아래쪽을 흑이 거의 둘러쌌는데 오른쪽 끝(J3)이 비어 있어요. 마지막 한 수로 집을 완성해 보세요.", setup: { b: [[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6]], w: [[1, 4], [3, 4], [5, 4], [7, 4]] }, task: { type: "move", ans: [[8, 6]], ok: "아래 두 줄, 18집이 흑의 집이 되었습니다." } },
    { text: "대국이 끝나면 「집 + 따낸 돌」이 많은 쪽이 이깁니다(한국 규칙). 먼저 두는 흑이 유리하므로 백에게 덤 6.5집을 더 줍니다.", task: { type: "read" } }] },
  { t: "삶과 죽음 (두 눈)", steps: [
    { text: "돌 무리 안에 따로 떨어진 빈 점(눈)이 두 개 있으면 상대가 절대 잡을 수 없습니다. 귀의 흑은 안쪽 빈 점이 세 칸입니다. 한가운데(급소)에 두어 두 눈을 만들어 살려 보세요.", setup: { b: [[0, 7], [1, 7], [2, 7], [3, 7], [3, 8]], w: [[0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [4, 7], [4, 8]] }, task: { type: "move", ans: [[1, 8]], ok: "두 눈이 생겨 완전히 살았습니다. 이 자리를 백이 먼저 두면 흑은 한 눈뿐이라 죽어요." } }] },
  { t: "축 (몰아 잡기)", steps: [
    { text: "단수를 계속 쳐서 판 끝까지 몰아 잡는 기술을 「축」이라고 합니다. 백돌의 활로가 둘 남았어요. 단수를 쳐서 몰기 시작해 보세요.", setup: { b: [[4, 3], [3, 4]], w: [[4, 4]] }, task: { type: "move", ans: [[5, 4], [4, 5]], ok: "백이 도망쳐도 계속 같은 방향으로 단수를 치면 결국 판 끝에서 잡힙니다. 다만 도망치는 길에 상대 돌(축머리)이 있으면 실패하니 조심!" } }] },
  { t: "첫 대국", steps: [
    { text: "축하합니다! 기본 규칙을 모두 배웠습니다. 두 번 연속 패스하면 끝나고 자동으로 계가합니다.\n이제 교육원 9줄 판에서 「입문」 인공지능과 첫 대국을 해 보세요.", task: { type: "read", cta: "9줄 첫 대국 하기" } }] }
];

const KEY = "giwon-lessons";
const loadDone = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) { return new Set(); } };
const saveDone = s => { try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch (e) {} };

export class LessonPanel {
  constructor(host, cb = {}) {
    this.cb = cb; this.li = 0; this.si = 0; this.done = loadDone();
    const el = this.el = document.createElement("section"); el.className = "go-panel lesson-panel"; el.hidden = true;
    el.innerHTML = `
      <div class="gp-head"><div><div class="gp-kicker">無量棋院 · 敎育院</div><h2 class="gp-title">바둑 입문 강좌</h2></div><button type="button" class="gp-x" aria-label="닫기">×</button></div>
      <div class="ls-list"><p class="gp-lead">한 단계씩 직접 두어 보며 배워요.</p><div class="ls-items"></div><p class="gp-note ls-prog"></p></div>
      <div class="ls-view" hidden>
        <div class="ls-head"><b class="ls-t"></b><small class="ls-n"></small></div>
        <p class="ls-text"></p>
        <div class="gp-board"><canvas aria-label="강의 바둑판"></canvas></div>
        <div class="gp-status ls-fb"></div>
        <div class="gp-actions"><button type="button" class="outline-button" data-k="list">목록</button><button type="button" class="outline-button" data-k="retry">다시</button><button type="button" class="outline-button" data-k="hint">힌트</button><button type="button" class="solid-button gp-start" data-k="next">다음 ▶</button></div>
      </div>`;
    host.appendChild(el); this.cv = el.querySelector("canvas");
    el.querySelector(".gp-x").addEventListener("click", () => this.close());
    el.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => this.act(b.dataset.k)));
    this.cv.addEventListener("click", e => { const p = boardPoint(this.cv, this.geo, 9, e); if (p) this.place(p); });
    new ResizeObserver(() => this.draw()).observe(this.cv);
    addEventListener("keydown", e => { if (!this.el.hidden && e.code === "Escape") this.close(); });
  }
  get isOpen() { return !this.el.hidden; }
  open() { this.el.hidden = false; this.showList(); }
  close() { this.el.hidden = true; if (this.cb.onClose) this.cb.onClose(); }
  showList() {
    const el = this.el; el.querySelector(".ls-list").hidden = false; el.querySelector(".ls-view").hidden = true; const box = el.querySelector(".ls-items"); box.innerHTML = "";
    LESSONS.forEach((L, i) => { const b = document.createElement("button"); b.type = "button"; b.className = "kb-item ls-item" + (this.done.has(i) ? " done" : ""); b.innerHTML = `<b>${i + 1}. </b><span></span><small>${this.done.has(i) ? "✓ 마침" : L.steps.length + "단계"}</small>`; b.querySelector("span").textContent = L.t; b.addEventListener("click", () => this.start(i)); box.appendChild(b); });
    el.querySelector(".ls-prog").textContent = `진도 ${this.done.size} / ${LESSONS.length}` + (this.done.size >= LESSONS.length ? " · 입문 과정을 모두 마쳤습니다 🎓" : "");
  }
  start(i, s = 0) { this.li = i; this.si = s; this.el.querySelector(".ls-list").hidden = true; this.el.querySelector(".ls-view").hidden = false; this.setup(); }
  get step() { return LESSONS[this.li].steps[this.si]; }
  setup() {
    const st = this.step, L = LESSONS[this.li], b = this.board = new Board(9); this.solved = st.task.type === "read"; this.moves = 0; this.marks = null;
    for (const [x, y] of (st.setup && st.setup.b) || []) { b.c[b.pos(x, y)] = BLACK; b._delEmp(b.pos(x, y)); }
    for (const [x, y] of (st.setup && st.setup.w) || []) { b.c[b.pos(x, y)] = WHITE; b._delEmp(b.pos(x, y)); }
    b.turn = BLACK; b.last = -1;
    const el = this.el; el.querySelector(".ls-t").textContent = `${this.li + 1}. ${L.t}`; el.querySelector(".ls-n").textContent = `${this.si + 1} / ${L.steps.length}`;
    el.querySelector(".ls-text").textContent = st.text; el.querySelector(".ls-fb").textContent = st.task.type === "read" ? "" : "판을 눌러 흑돌을 놓아 보세요.";
    el.querySelector('[data-k="hint"]').hidden = !st.task.ans; el.querySelector('[data-k="retry"]').hidden = st.task.type === "read";
    const nb = el.querySelector('[data-k="next"]'); nb.textContent = st.task.cta || (this.si + 1 < L.steps.length ? "다음 ▶" : this.li + 1 < LESSONS.length ? "다음 강의 ▶" : "마치기"); nb.disabled = !this.solved;
    this.draw();
  }
  draw() { if (this.board && !this.el.hidden) { this.geo = paintBoard(this.cv, this.board, { marks: this.marks }); if (this.cb.onPosition) this.cb.onPosition(this.board); } }
  win(msg) { this.solved = true; const el = this.el; el.querySelector(".ls-fb").textContent = "⭕ " + msg; el.querySelector('[data-k="next"]').disabled = false; if (this.cb.sound) this.cb.sound("ok"); }
  place(p) {
    if (this.solved && this.step.task.type !== "free") return; const t = this.step.task, b = this.board, pos = b.pos(p[0], p[1]), fb = this.el.querySelector(".ls-fb"); this.marks = null;
    if (t.type === "read") return;
    if (t.type === "illegal") { if (t.ans.some(a => a[0] === p[0] && a[1] === p[1]) && !b.legal(pos, BLACK)) { this.marks = [[p[0], p[1], "×"]]; this.draw(); this.win(t.ok); } else fb.textContent = "그곳은 둘 수 있어요. 백돌에 둘러싸인 가운데를 눌러 보세요."; return; }
    if (!b.legal(pos, BLACK)) { fb.textContent = "그곳은 둘 수 없는 자리예요 (이미 돌이 있거나 자충수)."; return; }
    if (t.type === "move" && !t.ans.some(a => a[0] === p[0] && a[1] === p[1])) { this.marks = [[p[0], p[1], "×"]]; this.draw(); fb.textContent = "아쉬워요. 다른 곳을 찾아보세요. (막히면 「힌트」)"; return; }
    b.play(pos, BLACK); b.turn = BLACK; this.moves++; if (this.cb.sound) this.cb.sound("stone"); this.draw();
    if (t.type === "free" || t.type === "move") { this.win(t.ok || "잘했습니다!"); return; }
    if (t.type === "capture") { if (b.cap[BLACK] >= t.n) this.win(t.ok); else if (this.moves >= t.max) fb.textContent = "백돌에 바로 붙여서 활로를 하나씩 막아 보세요. 「다시」를 눌러 처음부터!"; else fb.textContent = `백돌의 남은 활로를 세어 보세요. (${this.moves}수째)`; }
  }
  act(k) {
    if (k === "list") { this.showList(); return; }
    if (k === "retry") { this.setup(); return; }
    if (k === "hint") { const a = this.step.task.ans; if (a) { this.marks = a.map(([x, y]) => [x, y, "○", "#2f7de0"]); this.draw(); this.el.querySelector(".ls-fb").textContent = "파란 동그라미 자리를 눌러 보세요."; } return; }
    if (k === "next") {
      const L = LESSONS[this.li];
      if (this.si + 1 < L.steps.length) { this.si++; this.setup(); return; }
      this.done.add(this.li); saveDone(this.done);
      if (this.step.task.cta && this.cb.onCta) { this.close(); this.cb.onCta(); return; }
      if (this.li + 1 < LESSONS.length) this.start(this.li + 1); else this.showList();
    }
  }
}
