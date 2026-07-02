# レイアウト検証：マス同士の重なり（SAT判定）とマス長の統計を出す
# 使い方: python tests/layout_check.py
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = ROOT.joinpath("index.html").as_uri()

JS = r"""
() => {
  // 隣接（同一セグメント内の前後・分岐/合流でつながるマス）は接していて当然なので除外
  const adj = new Set();
  SQUARES.forEach(s => (s.next || []).forEach(n => { adj.add(s.id + "-" + n); adj.add(n + "-" + s.id); }));
  // 分岐元を共有する2ルートの先頭同士・合流先を共有する2ルートの末尾同士も接するので除外
  [["10-21"], ["20-31"], ["59-66"], ["65-77"], ["87-98"], ["97-105"]].flat()
    .forEach(k => { const [a, b] = k.split("-"); adj.add(a + "-" + b); adj.add(b + "-" + a); });

  function axes(q) {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      out.push([-dy / L, dx / L]);
    }
    return out;
  }
  function overlapOnAxis(q1, q2, ax) {
    const p1 = q1.map(p => p[0] * ax[0] + p[1] * ax[1]);
    const p2 = q2.map(p => p[0] * ax[0] + p[1] * ax[1]);
    return Math.min(Math.max(...p1), Math.max(...p2)) - Math.max(Math.min(...p1), Math.min(...p2));
  }
  function satDepth(q1, q2) {
    let m = Infinity;
    for (const ax of [...axes(q1), ...axes(q2)]) {
      const o = overlapOnAxis(q1, q2, ax);
      if (o <= 0) return 0;
      m = Math.min(m, o);
    }
    return m;
  }

  const hits = [];
  for (let i = 0; i < SQUARES.length; i++) {
    for (let j = i + 1; j < SQUARES.length; j++) {
      if (adj.has(i + "-" + j)) continue;
      const a = SQUARES[i], b = SQUARES[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) > 300) continue;
      const d = satDepth(a.quad, b.quad);
      if (d > 2) hits.push({ i, j, li: a.label, lj: b.label, depth: Math.round(d), xi: a.x, yi: a.y, xj: b.x, yj: b.y });
    }
  }

  // マス長（進行方向）の統計
  const lens = SQUARES.map(s => {
    const q = s.quad;
    const m01 = [(q[0][0] + q[3][0]) / 2, (q[0][1] + q[3][1]) / 2];
    const m23 = [(q[1][0] + q[2][0]) / 2, (q[1][1] + q[2][1]) / 2];
    return Math.round(Math.hypot(m23[0] - m01[0], m23[1] - m01[1]));
  });
  const long = lens.map((L, i) => ({ i, L, lb: SQUARES[i].label })).filter(o => o.L > 155 || o.L < 60);
  return { hits, min: Math.min(...lens), max: Math.max(...lens), outliers: long };
}
"""


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(URL)
        page.wait_for_load_state("networkidle")
        r = page.evaluate(JS)
        print(f"マス長 min={r['min']} max={r['max']}")
        print(f"長すぎ/短すぎ({len(r['outliers'])}件):")
        for o in r["outliers"]:
            print(f"  id{o['i']} {o['lb']} len={o['L']}")
        print(f"重なり({len(r['hits'])}件):")
        for h in r["hits"]:
            print(f"  id{h['i']}({h['li']}) x id{h['j']}({h['lj']}) depth={h['depth']} at ({h['xi']},{h['yi']})-({h['xj']},{h['yj']})")
        browser.close()


if __name__ == "__main__":
    run()
