// 무량기원 · 바둑 인공지능 작업자(화면이 멈추지 않도록 따로 생각한다)
import { fromMoves, think, ownership, finalScore, PASS, KOMI } from "./go_engine.js?v=1";

onmessage = e => {
  const d = e.data || {};
  try {
    const b = fromMoves(d.size, d.moves || []);
    if (!b) { postMessage({ id: d.id, error: "bad-moves" }); return; }
    if (d.type === "score") {
      const own = ownership(b, d.size >= 19 ? 90 : 160);
      postMessage({ id: d.id, score: finalScore(b, own, d.komi ?? KOMI) });
      return;
    }
    const r = think(b, d.level | 0, d.komi ?? KOMI);
    const mv = r.move === "resign" ? "resign" : r.move === PASS ? null : b.xy(r.move);
    postMessage({ id: d.id, move: mv, wr: r.wr, iters: r.iters || 0 });
  } catch (err) { postMessage({ id: d.id, error: String(err && err.message || err) }); }
};
