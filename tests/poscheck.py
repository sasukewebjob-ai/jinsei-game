# コマの描画位置と論理位置の一致を検証するテスト（マスズレバグの再発防止）
# 使い方: python tests/poscheck.py [チェック回数=120]
import sys
import pathlib
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = ROOT.joinpath("index.html").as_uri()

AUTO = open(ROOT / "tests" / "autoplay.py", encoding="utf-8").read().split('AUTOCLICK_JS = """')[1].split('"""')[0]

# 手番交代画面が出ている瞬間（全アニメ完了済み）に、全コマの描画座標と論理マスの座標を比較
CHECK = """() => {
  if (document.querySelector('#overlay-handoff').hidden) return null;
  const pos = Game.positions();
  const tokens = [...document.querySelectorAll('#board-svg .token')];
  const bad = [];
  tokens.forEach((t, i) => {
    const m = (t.getAttribute('transform') || '').match(/translate\\(([-\\d.]+),([-\\d.]+)\\)/);
    if (!m) return;
    const x = +m[1], y = +m[2];
    const sq = SQUARES[pos[i]];
    const d = Math.hypot(x - sq.x, y - sq.y);
    if (d > 60) bad.push({ p: i + 1, drawnNear: x.toFixed(0) + ',' + y.toFixed(0), logical: pos[i] + ':' + sq.label, dist: d.toFixed(0) });
  });
  return bad;
}"""


def run(checks=120):
    fails = []
    done = 0
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        page = b.new_page(viewport={"width": 1600, "height": 900})
        page.add_init_script("const _st=window.setTimeout;window.setTimeout=(fn,ms,...a)=>_st(fn,Math.min(ms||0,80),...a);")
        page.goto(URL)
        page.wait_for_load_state("domcontentloaded")
        page.click("#btn-newgame")
        page.click("#count-buttons button:nth-child(2)")   # 3人
        page.click("#btn-start")
        for i in range(8000):
            if done >= checks or page.is_visible("#screen-result"):
                break
            bad = page.evaluate(CHECK)
            if bad is not None:
                done += 1
                if bad:
                    fails.append(bad)
                    print("MISMATCH:", bad)
            page.evaluate(AUTO)
            page.wait_for_timeout(60)
        b.close()
    print(f"検証 {done} 回 / ズレ検出 {len(fails)} 件 → {'NG' if fails else 'OK：描画位置と論理位置は常に一致'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(run(int(sys.argv[1]) if len(sys.argv) > 1 else 120))
