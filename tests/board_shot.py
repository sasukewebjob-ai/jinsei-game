# 盤面デザイン確認用：ゲームを開始して全体マップのスクショを撮る
# 使い方: python tests/board_shot.py
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = ROOT.joinpath("index.html").as_uri()
SHOTS = ROOT / "tests" / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)


def run():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1500, "height": 1200}, device_scale_factor=1.5)
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.goto(URL)
        page.wait_for_load_state("networkidle")

        page.click("#btn-newgame")
        page.wait_for_timeout(300)
        page.click("#btn-start")
        page.wait_for_timeout(1200)

        # スタート順ルーレットや手番交代を片付ける
        for _ in range(25):
            if page.is_visible("#overlay-handoff"):
                page.click("#btn-handoff-go"); page.wait_for_timeout(400); continue
            if page.is_visible("#overlay-roulette"):
                b = page.query_selector("#btn-do-spin")
                if b and not b.is_disabled():
                    b.click()
                page.wait_for_timeout(1200); continue
            if page.is_visible("#overlay-modal"):
                btns = page.query_selector_all("#modal-buttons button")
                if btns:
                    btns[0].click(); page.wait_for_timeout(400); continue
            break

        # 全体マップ表示（カメラ静止を待つ）
        page.evaluate("Board.setZoomAll(true)")
        page.wait_for_timeout(1500)
        page.screenshot(path=str(SHOTS / "board_full.png"))

        # 追従ズーム（スタート付近）
        page.evaluate("Board.setZoomAll(false); Board.focusXY(700, 400)")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(SHOTS / "board_zoom_start.png"))

        # 中央ルーレット付近
        page.evaluate("Board.focusXY(1750, 1450)")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(SHOTS / "board_zoom_wheel.png"))

        # 下辺（黄金ロード〜ゴール）
        page.evaluate("Board.focusXY(2200, 2000)")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(SHOTS / "board_zoom_goal.png"))

        print("JS ERRORS:", "none" if not errors else errors[:10])
        browser.close()


if __name__ == "__main__":
    run()
