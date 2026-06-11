# 自動通しプレイテスト：ボタンを押し続けて1ゲーム完走できるか＋JSエラー検出
# 使い方: python tests/autoplay.py [人数(2-6)] [最大反復回数]
import sys
import json
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = ROOT.joinpath("index.html").as_uri()
SHOTS = ROOT / "tests" / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)

AUTOCLICK_JS = """() => {
  const q = s => document.querySelector(s);
  // 手番交代
  if (!q('#overlay-handoff').hidden) { q('#btn-handoff-go').click(); return 'handoff'; }
  // ルーレット
  if (!q('#overlay-roulette').hidden) {
    const b = q('#btn-do-spin');
    if (b && !b.disabled) { b.click(); return 'spin'; }
    return null;
  }
  // 汎用モーダル：有効なボタンからランダムに選ぶ
  if (!q('#overlay-modal').hidden) {
    const btns = [...document.querySelectorAll('#modal-buttons button')].filter(b => !b.disabled);
    if (btns.length) { btns[Math.floor(Math.random() * btns.length)].click(); return 'modal'; }
    return null;
  }
  // ルーレット前の行動選択：9割回す・1割資産パネルを開く
  if (!q('#action-bar').hidden) {
    if (Math.random() < 0.9) { q('#btn-spin').click(); return 'roll'; }
    q('#btn-assets').click(); return 'assets';
  }
  return null;
}"""


def run(players=2, max_iters=4000):
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1600, "height": 900})
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        # アニメ系setTimeoutを80msに短縮して高速プレイ
        page.add_init_script(
            "const _st = window.setTimeout;"
            "window.setTimeout = (fn, ms, ...a) => _st(fn, Math.min(ms || 0, 80), ...a);"
        )
        page.goto(URL)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=str(SHOTS / "01_title.png"))

        page.click("#btn-newgame")
        page.click(f"#count-buttons button:nth-child({players - 1})")
        page.screenshot(path=str(SHOTS / "02_setup.png"))
        page.click("#btn-start")
        page.wait_for_timeout(800)
        page.screenshot(path=str(SHOTS / "03_game.png"))

        finished = False
        for i in range(max_iters):
            if page.is_visible("#screen-result"):
                page.screenshot(path=str(SHOTS / "09_result.png"), full_page=True)
                print(f"GAME FINISHED at iter {i}")
                finished = True
                break
            acted = page.evaluate(AUTOCLICK_JS)
            if i == 60:
                page.screenshot(path=str(SHOTS / "04_midgame.png"))
            page.wait_for_timeout(60 if acted else 200)
        if not finished:
            page.screenshot(path=str(SHOTS / "08_stuck.png"))
            state = page.evaluate("""() => ({
              handoff: !document.querySelector('#overlay-handoff').hidden,
              roulette: !document.querySelector('#overlay-roulette').hidden,
              modal: !document.querySelector('#overlay-modal').hidden,
              modalTitle: document.querySelector('#modal-title').textContent,
              bar: !document.querySelector('#action-bar').hidden,
            })""")
            print("STUCK / MAX ITERS REACHED:", json.dumps(state, ensure_ascii=False))
        if errors:
            print(f"JS ERRORS ({len(errors)}):")
            for e in errors[:15]:
                print("  ", e)
        else:
            print("JS ERRORS: none")
        browser.close()
    return 0 if (finished and not errors) else 1


if __name__ == "__main__":
    players = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    iters = int(sys.argv[2]) if len(sys.argv) > 2 else 4000
    sys.exit(run(players, iters))
