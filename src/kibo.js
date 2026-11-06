// 무량기원 · 기보: 저장(이 브라우저) · SGF · 명국 기보 · 기보 열람/놓아보기 창
import { Board, fromMoves, PASS, BLACK, WHITE } from "./go_engine.js?v=1";
import { paintBoard, boardPoint, COORD } from "./baduk_ui.js?v=2";

// 명국 기보: 공개 기보 데이터(computer-go-dataset)의 SGF를 그대로 옮겼다. m = SGF 좌표 두 글자씩(흑부터 번갈아)
export const FAMOUS = [{"id": "famous-ing1989_g5", "title": "1989 제1회 응씨배 결승 제5국", "pb": "조훈현", "pw": "녜웨이핑", "date": "1989-09-05", "result": "흑 불계승", "desc": "한국 바둑이 처음으로 세계 정상에 선 대국. 조훈현 九단이 녜웨이핑 九단을 꺾고 3승 2패로 초대 응씨배를 차지했습니다. 덤 8점(응씨 규칙).", "size": 19, "komi": 8.0, "m": "pddppqddqojpcnclcqdqcpdobnemfcdficnqlqlpkqkpjqiqmqmpnrnpirorhqipmsoqqljfjigfliokpmnlhiqkrkqjjgifkfkelekddbcclfidjckchdhegdrjcjbldgefcgcfejdkfgffcrdjdicbkblbjaqqrqqrrrmcrlqcqdpcodocqgnhjkcibieichfigjfjfkekflegbgiljlhkhlglhmgkikgmimlhmimhkhneofmercrerdrgqfrfndmdncnbqbpaniohqhrhpioipjpkojnjmg"}, {"id": "famous-lee_gu_2014_g1", "title": "2014 이세돌·구리 10번기 제1국", "pb": "이세돌", "pw": "구리", "date": "2014-01-26", "result": "흑 불계승", "desc": "한·중 최강자가 맞붙은 10번기의 첫 판. 이세돌 九단이 흑으로 불계승을 거두었습니다.", "size": 19, "komi": 3.8, "m": "pddpqpdcfqdnlqeqfpipcickceoplogoqnjqendmemgmdocoeodlflfrhqimcpcqbpbobqcrbrbseresgrfsfjhjklqqrqlnmnlmmodijngpgqglgkhkfirrinhnhpjmhokokmkniokpillppqnqqrjljkhmkkiiikhlmknlnkolmlmmonnnokplpkqlhhjhqkrljflhlfnhphmfleigkikhmgghgihigghgfhheedhcecngmhmilgoilindmdpiqiqhrjncmcriqjneofpfqgkcidhdjbebfbgbdbjcnbobmbpcicibkbjakafceafdfeffeegfifhfdhialciejdjekdgaqdqcrdpgrhoebjbklroomqmprbrcscqbdjorepdqjrprqsirkriqisqfrfpnpopmjggebmblgsdrcjelfmekfkegeffgdgrornsnsmsoqormnroqspslrpsmghihsrohqhbnnsajaiaksboaejradkmeap"}, {"id": "famous-ag_g1", "title": "2016 알파고 대 이세돌 제1국", "pb": "이세돌", "pw": "AlphaGo", "date": "2016-03-09", "result": "백 불계승", "desc": "구글 딥마인드 챌린지 매치 첫 대국. 인공지능이 처음으로 최정상급 프로를 공식 대국에서 이겼습니다. 덤 7.5(중국 규칙).", "size": 19, "komi": 7.5, "m": "qddppqddfccfqlodldqcrcpcreofpgogphidlfohpilhkhkelelgkgkfneoejcicjdiejejfifjglimihfihmbgdkimjkkibobmllmncnbkblcmmlnkllllkjjjlhjhigjgfiijhijmnlomolpmplqmqimqofqggcndndmfpgpgqfrcoendoepcmdllrkrrbjbjamfmhndqjpjqkplpkokrhrlqfrirfpfqeqhccbnbmblborgmrpojrkqpnooqponppopqqorproqpdqrrrpsrsrnroqnsoclanksomolcihhhgdrdjbqcqcrbpdqbrcpapekfibjbipbqbsfrdaiahajbhgifjfkocmcnmpmcjalaqghfh"}, {"id": "famous-ag_g2", "title": "2016 알파고 대 이세돌 제2국 (37수)", "pb": "AlphaGo", "pw": "이세돌", "date": "2016-03-10", "result": "흑 불계승", "desc": "흑 37수 P10, 5선 어깨짚기는 사람이라면 두지 않을 수로 꼽히며 바둑계를 놀라게 했습니다. 덤 7.5(중국 규칙).", "size": 19, "komi": 7.5, "m": "pddpcdqpopoqnqpqcnfqmpqnicdjpoqocpcqbqcobpbodobndqepdrcmjpcgedqfqepfndpiojoinjmhgpgqdndmfohphoeoenfnemelfmgnflgoekdkdlclehdipjqirfrgkdhnomrerdsffigkhminhlkokpgcdfidjcgedgcfchbhdhbihdhegdfdhcfeecghfcgiiihkikilimijjljjifkmklljlklolikjcicjmjnrmrlqlpmqnplrlmkhhgqcqdrcpcsdggcebdqbhijghjobpbpanbdeeegjhhejnfmfmerkfhelnhnglglhmgogkgnijhnakimijincmbodmcockrmsioipjojnirhrqlrlqmrmaobmlnknmobeaeafadmalaoaddbglbpnonercrfpiqhqqjrjks"}, {"id": "famous-ag_g4", "title": "2016 알파고 대 이세돌 제4국 (78수)", "pb": "AlphaGo", "pw": "이세돌", "date": "2016-03-13", "result": "백 불계승", "desc": "백 78수 L11 끼움수, 이른바 「신의 한 수」. 이세돌 九단이 인공지능에게 거둔 유일한 승리입니다. 덤 7.5(중국 규칙).", "size": 19, "komi": 7.5, "m": "pddpcdqpopoqnqpqcnfqmppoiqechdcgedcjdcbpncqiepeodkfpckdjejeifiehfhbjfkfgggffgfmcmdlcnbidhcjgpjpiojoininhmhngmgminjmflinendmjlfmkmenflhqjkkikjighhjgehefdfckijjljkhjhmlnkolokpkplqknlkjiirkompgqlcpcooerlskrjhgijkmgifjjlklglflgmcheeebbgdgegenfodfdhimhkbnifgdfehfihbhcihogoorrgdncqprqrrfqgqfjcgrsfsesgrdblbkakclhninhpfreresdsahaikdiekckbgkibqhrhqsrsohslofsjninjoojp"}];
export const famousRec = f => ({ ...f, moves: (f.m.match(/../g) || []).map(t => [t.charCodeAt(0) - 97, t.charCodeAt(1) - 97]), famous: 1 });

const KEY = "giwon-kibo-v1", MAX = 200;
export function loadArchive() { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.filter(okRec) : []; } catch (e) { return []; } }
function saveArchive(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {} }
export function okRec(r) {
  return !!r && typeof r.id === "string" && r.id.length <= 40 && [9, 13, 19].includes(r.size) && Array.isArray(r.moves) && r.moves.length <= 900 &&
    r.moves.every(m => m === null || (Array.isArray(m) && m.length === 2 && m.every(v => Number.isInteger(v) && v >= 0 && v < r.size))) &&
    ["pb", "pw", "result", "place", "date"].every(k => r[k] === undefined || (typeof r[k] === "string" && r[k].length <= 160));
}
export function saveRecord(r, mine) { // 같은 대국(id)은 한 번만. 내가 둔 대국이면 mine 표시를 남긴다
  if (!okRec(r)) return false; const a = loadArchive(), i = a.findIndex(x => x.id === r.id);
  if (i >= 0) { if (mine && !a[i].mine) { a[i].mine = 1; saveArchive(a); } return false; }
  a.unshift({ ...r, mine: mine ? 1 : 0 }); saveArchive(a); return true;
}
export function mergeArchive(list) { let n = 0; if (!Array.isArray(list)) return 0; for (const r of list.slice(0, 30)) { const c = { id: r.id, size: r.size, moves: r.moves, pb: r.pb, pw: r.pw, result: r.result, place: r.place, date: r.date, komi: typeof r.komi === "number" ? r.komi : 6.5 }; if (saveRecord(c, false)) n++; } return n; }
export const shareList = () => loadArchive().slice(0, 20).map(({ mine, ...r }) => r);
export function toSGF(r) {
  const esc = s => String(s || "").replace(/[\\\]]/g, "\\$&"), c = v => String.fromCharCode(97 + v);
  let s = `(;GM[1]FF[4]CA[UTF-8]AP[MuryangGiwon]SZ[${r.size}]KM[${r.komi ?? 6.5}]PB[${esc(r.pb)}]PW[${esc(r.pw)}]DT[${esc(r.date)}]RE[${esc(r.result)}]GN[${esc(r.title || r.place)}]`;
  r.moves.forEach((m, i) => { s += `;${i % 2 ? "W" : "B"}[${m ? c(m[0]) + c(m[1]) : ""}]`; }); return s + ")";
}
const fmtDate = d => { try { const t = new Date(d); if (isNaN(t)) return d || ""; const z = n => String(n).padStart(2, "0"); return `${t.getFullYear()}.${z(t.getMonth() + 1)}.${z(t.getDate())} ${z(t.getHours())}:${z(t.getMinutes())}`; } catch (e) { return d || ""; } };

// ---------- 기보 창: 목록(무량기원 대국 · 내 대국 · 명국) + 놓아보기(차례로 보기 / 다음 수 맞히기) ----------
export class KiboPanel {
  constructor(host, cb = {}) {
    this.cb = cb; this.rec = null; this.idx = 0; this.guess = false; this.tries = 0; this.timer = 0; this.mode = "pc";
    const el = this.el = document.createElement("section"); el.className = "go-panel kibo-panel"; el.hidden = true;
    el.innerHTML = `
      <div class="gp-head"><div><div class="gp-kicker">無量棋院 · 棋譜</div><h2 class="gp-title">기보 열람</h2></div><button type="button" class="gp-x" aria-label="닫기">×</button></div>
      <div class="kb-list-view">
        <div class="gp-seg kb-tabs"><button data-tab="mine" class="on">내 기보</button><button data-tab="giwon">무량기원 대국</button><button data-tab="famous">명국 기보</button></div>
        <div class="kb-list" role="list"></div>
        <p class="gp-note kb-note"></p>
      </div>
      <div class="kb-view" hidden>
        <div class="kb-info"><b class="kb-t"></b><small class="kb-s"></small></div>
        <div class="gp-board"><canvas aria-label="기보 바둑판"></canvas></div>
        <div class="gp-status kb-status"></div>
        <input type="range" class="kb-slider" min="0" value="0" aria-label="수순">
        <div class="gp-actions kb-ctl">
          <button type="button" class="outline-button" data-k="first" title="처음">⏮</button><button type="button" class="outline-button" data-k="prev10" title="10수 뒤로">−10</button><button type="button" class="outline-button" data-k="prev" title="한 수 뒤로">◀</button><button type="button" class="outline-button" data-k="next" title="한 수 앞으로">▶</button><button type="button" class="outline-button" data-k="next10" title="10수 앞으로">+10</button><button type="button" class="outline-button" data-k="last" title="끝">⏭</button>
        </div>
        <div class="gp-actions">
          <button type="button" class="outline-button" data-k="play">▶ 자동 재생</button>
          <button type="button" class="outline-button" data-k="guess">🎯 다음 수 맞히기</button>
          <button type="button" class="outline-button" data-k="take" hidden>📚 이 기보 들고 가기</button>
          <button type="button" class="outline-button" data-k="sgf">SGF 내려받기</button>
          <button type="button" class="outline-button" data-k="back">목록으로</button>
        </div>
      </div>`;
    host.appendChild(el); this.cv = el.querySelector("canvas"); this.tab = "mine";
    el.querySelector(".gp-x").addEventListener("click", () => this.close(true));
    el.querySelectorAll(".kb-tabs button").forEach(b => b.addEventListener("click", () => this.showList(b.dataset.tab)));
    el.querySelector(".kb-slider").addEventListener("input", e => { this.stop(); this.go(+e.target.value); });
    el.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => this.act(b.dataset.k)));
    this.cv.addEventListener("click", e => { if (!this.guess || !this.rec) return; const p = boardPoint(this.cv, this.geo, this.rec.size, e); if (p) this.tryGuess(p); });
    new ResizeObserver(() => this.draw()).observe(this.cv);
    addEventListener("keydown", e => { if (this.el.hidden || (e.target.closest && e.target.closest("input,textarea"))) return; if (e.code === "Escape") this.close(true); else if (!this.el.querySelector(".kb-view").hidden) { if (e.code === "ArrowRight") { e.preventDefault(); this.act("next"); } else if (e.code === "ArrowLeft") { e.preventDefault(); this.act("prev"); } } });
  }
  get isOpen() { return !this.el.hidden; }
  open(mode = "pc", tab) { this.mode = mode; this.el.hidden = false; this.el.querySelector(".gp-title").textContent = mode === "shelf" ? "기보 서가 · 棋譜書架" : mode === "table" ? "기보 놓아보기" : "기보 열람"; this.showList(tab || (mode === "shelf" ? "famous" : "mine")); }
  close(user) { this.stop(); this.el.hidden = true; if (user && this.cb.onClose) this.cb.onClose(this.mode); }
  showList(tab) {
    this.stop(); this.tab = tab; const el = this.el; el.querySelector(".kb-list-view").hidden = false; el.querySelector(".kb-view").hidden = true;
    el.querySelectorAll(".kb-tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    const all = loadArchive(), list = tab === "famous" ? FAMOUS.map(famousRec) : tab === "mine" ? all.filter(r => r.mine) : all;
    const box = el.querySelector(".kb-list"); box.innerHTML = "";
    for (const r of list) {
      const b = document.createElement("button"); b.type = "button"; b.className = "kb-item"; b.setAttribute("role", "listitem");
      b.innerHTML = `<b></b><span></span><small></small>`; b.querySelector("b").textContent = r.title || `${r.pb || "흑"} (흑) vs ${r.pw || "백"} (백)`;
      b.querySelector("span").textContent = r.title ? `${r.pb} (흑) vs ${r.pw} (백) · ${r.result}` : `${r.result || "결과 없음"}`;
      b.querySelector("small").textContent = `${r.famous ? r.date : fmtDate(r.date)} · ${r.size}줄 · ${r.moves.length}수${r.place ? " · " + r.place : ""}`;
      b.addEventListener("click", () => this.view(r)); box.appendChild(b);
    }
    el.querySelector(".kb-note").textContent = tab === "famous" ? "실제 대국 기보입니다. 연구·분석실의 기보 서가에서 꺼내 들고 빈 바둑판에 앉으면 직접 놓아 볼 수 있어요." : tab === "mine" ? (list.length ? "내가 둔 대국은 끝날 때 자동으로 이 브라우저에 저장됩니다." : "아직 저장된 내 기보가 없습니다. 한 판을 끝까지 두면(계가·기권) 자동으로 저장됩니다.") : (list.length ? "기원에서 끝난 대국을 함께 있던 방문객끼리 나누어 보관합니다(최근 200판)." : "아직 기원에서 끝난 대국이 없습니다.");
  }
  view(r, startIdx) {
    this.rec = r; this.guess = false; this.tries = 0; const el = this.el; el.querySelector(".kb-list-view").hidden = true; el.querySelector(".kb-view").hidden = false;
    el.querySelector(".kb-t").textContent = r.title || `${r.pb} vs ${r.pw}`; el.querySelector(".kb-s").textContent = (r.desc ? r.desc + " " : "") + `흑 ${r.pb} · 백 ${r.pw} · ${r.result || ""} · 덤 ${r.komi ?? 6.5}`;
    const sl = el.querySelector(".kb-slider"); sl.max = r.moves.length;
    el.querySelector('[data-k="take"]').hidden = this.mode !== "shelf"; el.querySelector('[data-k="back"]').hidden = this.mode === "table";
    this.go(startIdx ?? (this.mode === "table" ? 0 : r.moves.length)); this.syncGuess();
  }
  go(i) {
    const r = this.rec; if (!r) return; i = Math.max(0, Math.min(r.moves.length, i)); this.idx = i;
    this.board = fromMoves(r.size, r.moves.slice(0, i)) || new Board(r.size); this.el.querySelector(".kb-slider").value = i;
    const lm = i ? r.moves[i - 1] : undefined;
    this.el.querySelector(".kb-status").textContent = this.guess ? (i >= r.moves.length ? "끝까지 다 맞혔습니다! 👏" : `${i + 1}수째 · ${i % 2 ? "백" : "흑"}은 어디에 두었을까요? 판을 눌러 맞혀 보세요.`) : `${i} / ${r.moves.length}수` + (lm ? ` · ${i % 2 ? "흑" : "백"} ${COORD(lm, r.size)}` : lm === null ? " · 패스" : "") + ` · 따낸 돌 흑 ${this.board.cap[BLACK]} · 백 ${this.board.cap[WHITE]}`;
    this.draw(); if (this.cb.onPosition) this.cb.onPosition(this.board, r, i, this.mode);
  }
  draw(marks) { if (!this.board || this.el.hidden) return; this.geo = paintBoard(this.cv, this.board, { marks: marks || this.marks }); }
  act(k) {
    const r = this.rec, i = this.idx; if (k !== "play") this.stop();
    if (k === "first") this.go(0); else if (k === "last") this.go(r.moves.length); else if (k === "prev") this.go(i - 1); else if (k === "next") { this.go(i + 1); if (this.cb.sound && r.moves[i]) this.cb.sound(); } else if (k === "prev10") this.go(i - 10); else if (k === "next10") this.go(i + 10);
    else if (k === "play") { if (this.timer) { this.stop(); return; } if (this.idx >= r.moves.length) this.go(0); this.el.querySelector('[data-k="play"]').textContent = "⏸ 멈춤"; this.timer = setInterval(() => { if (this.idx >= this.rec.moves.length) { this.stop(); return; } this.go(this.idx + 1); if (this.cb.sound) this.cb.sound(); }, 900); }
    else if (k === "guess") { this.guess = !this.guess; this.tries = 0; this.marks = null; if (this.guess && this.idx >= r.moves.length) this.go(0); else this.go(this.idx); this.syncGuess(); }
    else if (k === "take") { if (this.cb.onTake) this.cb.onTake(r); }
    else if (k === "sgf") { const blob = new Blob([toSGF(r)], { type: "application/x-go-sgf" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (r.title || `${r.pb}_vs_${r.pw}`).replace(/[\\/:*?"<>|\s]+/g, "_") + ".sgf"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }
    else if (k === "back") this.showList(this.tab);
  }
  syncGuess() { const b = this.el.querySelector('[data-k="guess"]'); b.classList.toggle("on", this.guess); b.textContent = this.guess ? "🎯 맞히기 끝내기" : "🎯 다음 수 맞히기"; }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = 0; const b = this.el.querySelector('[data-k="play"]'); if (b) b.textContent = "▶ 자동 재생"; } }
  tryGuess(p) {
    const r = this.rec, m = r.moves[this.idx]; if (!m) { if (m === null) this.go(this.idx + 1); return; }
    if (m[0] === p[0] && m[1] === p[1]) { this.tries = 0; this.marks = null; this.go(this.idx + 1); if (this.cb.sound) this.cb.sound(); this.el.querySelector(".kb-status").textContent = "정답! " + this.el.querySelector(".kb-status").textContent; return; }
    this.tries++; const near = Math.abs(m[0] - p[0]) + Math.abs(m[1] - p[1]) <= 2;
    if (this.tries >= 3) { this.marks = [[m[0], m[1], "○", "#2f7de0"]]; this.draw(); this.el.querySelector(".kb-status").textContent = "정답은 파란 동그라미 자리입니다 (" + COORD(m, r.size) + "). 그곳을 눌러 계속하세요."; }
    else { this.marks = [[p[0], p[1], "×"]]; this.draw(); this.el.querySelector(".kb-status").textContent = (near ? "가까워요! " : "아쉽습니다. ") + (3 - this.tries) + "번 더 기회가 있어요."; }
  }
}
