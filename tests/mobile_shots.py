# スマホ表示の見た目確認：iPhone相当(390x844)で各画面のスクショを撮る
# 使い方: python tests/mobile_shots.py
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
        page = browser.new_page(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2, is_mobile=True, has_touch=True,
        )
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.goto(URL)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=str(SHOTS / "m1_title.png"))

        page.click("#btn-newgame")
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / "m2_setup.png"))

        page.click("#count-buttons button:nth-child(2)")  # 3人
        page.click("#btn-start")
        page.wait_for_timeout(1000)

        # 開いているオーバーレイ（手番交代・スタート順モーダル等）を片付けてゲーム画面へ
        def clear_overlays(n=20):
            for _ in range(n):
                if page.is_visible("#overlay-handoff"):
                    page.click("#btn-handoff-go"); page.wait_for_timeout(500); continue
                if page.is_visible("#overlay-roulette"):
                    b = page.query_selector("#btn-do-spin")
                    if b and not b.is_disabled():
                        b.click()
                    page.wait_for_timeout(1500); continue
                if page.is_visible("#overlay-modal"):
                    btns = page.query_selector_all("#modal-buttons button")
                    if btns:
                        btns[0].click(); page.wait_for_timeout(500); continue
                break

        if page.is_visible("#overlay-handoff"):
            page.screenshot(path=str(SHOTS / "m3_handoff.png"))
        clear_overlays()
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS / "m4_game_drawer_closed.png"))

        # ドロワーを開く
        page.click("#btn-drawer")
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS / "m5_game_drawer_open.png"))
        # 背景の左上（サイドバーに覆われない位置）をタップして閉じる
        page.click("#drawer-backdrop", position={"x": 20, "y": 20})
        page.wait_for_timeout(500)

        # ルーレットを開く
        if not page.is_visible("#action-bar"):
            page.wait_for_timeout(600)
        page.click("#btn-spin")
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS / "m6_roulette.png"))

        print("JS ERRORS:", "none" if not errors else errors[:10])
        browser.close()


if __name__ == "__main__":
    run()
