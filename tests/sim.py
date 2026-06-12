# バランス測定シミュレーション：高速自動プレイをN回まわして統計レポートを出す
# 使い方: python tests/sim.py [ゲーム数=30] [人数=4]
import sys
import json
import pathlib
import statistics as stats
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = ROOT.joinpath("index.html").as_uri()

# ページ内オートプレイヤー（Playwright往復なしで高速にクリックし続ける）
AUTOPILOT = """() => {
  window.__auto = setInterval(() => {
    const q = s => document.querySelector(s);
    if (!q('#overlay-handoff').hidden) { q('#btn-handoff-go').click(); return; }
    if (!q('#overlay-roulette').hidden) {
      const b = q('#btn-do-spin');
      if (b && !b.disabled) b.click();
      return;
    }
    if (!q('#overlay-modal').hidden) {
      const btns = [...document.querySelectorAll('#modal-buttons button')].filter(b => !b.disabled);
      if (btns.length) btns[Math.floor(Math.random() * btns.length)].click();
      return;
    }
    if (!q('#action-bar').hidden) {
      if (Math.random() < 0.92) q('#btn-spin').click();
      else q('#btn-assets').click();
    }
  }, 12);
}"""


def run(games=30, players=4):
    samples = []
    rounds = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1200, "height": 700})
        page.add_init_script(
            "window.TURBO = 40;"
            "const _st = window.setTimeout;"
            "window.setTimeout = (fn, ms, ...a) => _st(fn, Math.min(ms || 0, 50), ...a);"
        )
        page.add_init_script("""addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style');
          s.textContent = '.fx-bill,.fx-coin,.fx-confetti,.fx-bubble,.fx-cutin{display:none!important}';
          document.head.appendChild(s);
        });""")
        for g in range(games):
            page.goto(URL)
            page.wait_for_load_state("domcontentloaded")
            page.click("#btn-newgame")
            page.click(f"#count-buttons button:nth-child({players - 1})")
            page.click("#btn-start")
            page.evaluate(AUTOPILOT)
            try:
                page.wait_for_function("() => window.__gameResult", timeout=240000)
            except Exception:
                print(f"game {g + 1}: TIMEOUT (skip)")
                continue
            r = page.evaluate("() => window.__gameResult")
            samples.extend(r["players"])
            rounds.append(r["round"])
            if (g + 1) % 5 == 0:
                print(f"  {g + 1}/{games} done")
        browser.close()

    # ---- 集計 ----
    def agg(group_fn):
        out = {}
        for s in samples:
            k = group_fn(s)
            if k is None:
                continue
            out.setdefault(k, []).append(s)
        return out

    def line(name, rows):
        n = len(rows)
        if n == 0:
            return f"  {name:<14} n=0"
        money = [s["money"] for s in rows]
        rank1 = sum(1 for s in rows if s.get("rank1"))
        return (f"  {name:<14} n={n:<4} 勝率={rank1 / n * 100:5.1f}%  "
                f"平均資産=¥{int(stats.mean(money)):>11,}  中央値=¥{int(stats.median(money)):>11,}")

    # 各ゲーム内で1位を判定
    by_game = {}
    for i, s in enumerate(samples):
        gi = i // players
        by_game.setdefault(gi, []).append(s)
    for g, rows in by_game.items():
        top = max(r["money"] for r in rows)
        for r in rows:
            r["rank1"] = r["money"] == top

    print("\n========== バランスレポート ==========")
    print(f"ゲーム数: {len(rounds)}  プレイヤーサンプル: {len(samples)}  平均ラウンド数: {stats.mean(rounds):.1f}")
    print("\n■ 進路ルート")
    for k, rows in sorted(agg(lambda s: s["eduRoute"]).items()):
        print(line({"univ": "大学ルート", "work": "就職ルート"}.get(k, k), rows))
    print("\n■ 中盤ルート")
    for k, rows in sorted(agg(lambda s: s["midRoute"]).items()):
        print(line({"stable": "安定ルート", "gamble": "ギャンブル"}.get(k, k), rows))
    print("\n■ 職業別（最終職業）")
    jobrows = agg(lambda s: s["job"])
    for k, rows in sorted(jobrows.items(), key=lambda kv: -stats.mean([r["money"] for r in kv[1]])):
        print(line(k or "無職", rows))
    print("\n■ お金まわり")
    print(f"  平均手形発行額: ¥{int(stats.mean([s['borrowed'] for s in samples])):,}")
    print(f"  平均ギャンブル収支: ¥{int(stats.mean([s['gamble'] for s in samples])):,}")
    print(f"  最終資産: 平均 ¥{int(stats.mean([s['money'] for s in samples])):,} / "
          f"最小 ¥{min(s['money'] for s in samples):,} / 最大 ¥{max(s['money'] for s in samples):,}")

    out = ROOT / "tests" / "sim_report.json"
    out.write_text(json.dumps({"rounds": rounds, "samples": samples}, ensure_ascii=False), encoding="utf-8")
    print(f"\n詳細: {out}")


if __name__ == "__main__":
    games = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    players = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    run(games, players)
