// カジノ系ミニゲーム：ハイ＆ロー / 一点賭けルーレット / 宝くじ

const Casino = (() => {
  const rnd10 = () => 1 + Math.floor(Math.random() * 10);

  // 賭け金選択（10万単位）。やめたら null を返す
  async function betModal(p, title, note) {
    const max = Math.floor(p.money / 100000) * 100000;
    if (max < 100000) {
      await UI.modal({ title, body: "所持金が¥100,000未満では勝負できない…（見学だけして帰った）" });
      return null;
    }
    let bet = 100000;
    const amt = h("span", { class: "bet-amt" }, fmt(bet));
    const set = v => {
      bet = Math.max(100000, Math.min(max, Math.floor(v / 100000) * 100000));
      amt.textContent = fmt(bet);
    };
    const mk = (label, fn) => h("button", { class: "btn btn-small", onclick: () => { Sound.play("click"); fn(); } }, label);
    const body = h("div", { class: "bet-ui" },
      h("div", { class: "bet-note" }, note),
      h("div", { class: "bet-row" }, "賭け金：", amt),
      h("div", { class: "bet-btns" },
        mk("−10万", () => set(bet - 100000)),
        mk("＋10万", () => set(bet + 100000)),
        mk("×2", () => set(bet * 2)),
        mk("MAX", () => set(max)),
      ),
      h("div", { class: "bet-note" }, `所持金 ${fmt(p.money)}`),
    );
    const i = await UI.modal({ title, body, buttons: ["💥 勝負！", "やめる"] });
    return i === 0 ? bet : null;
  }

  async function highLow(p) {
    const bet = await betModal(p, "🎰 ハイ＆ロー", "次の数字(1〜10)が基準よりハイかローか当てれば2倍！同じ数字なら引き分け（返金）");
    if (bet == null) return;
    const base = rnd10();
    const g = await UI.modal({
      title: `基準の数字は…「${base}」！`,
      body: `次に出る数字（1〜10）は ${base} よりハイ？ロー？`,
      buttons: ["⬆️ ハイ", "⬇️ ロー"],
    });
    const nxt = rnd10();
    if (nxt === base) {
      await UI.modal({ title: `出た数字は「${nxt}」…引き分け！`, body: "賭け金はそのまま返ってきた。" });
      UI.log(`🎰 ${p.name}のハイ＆ローは引き分け`);
    } else if ((g === 0) === (nxt > base)) {
      const gamer = p.job && p.job.n === "プロゲーマー";
      const win = Math.round(bet * (gamer ? 1.5 : 1));
      Sound.play("win");
      Game.gain(p, win);
      p.stats && (p.stats.gamble = (p.stats.gamble || 0) + win);
      await UI.modal({ title: `出た数字は「${nxt}」！勝ち！！`, body: `+${fmt(win)}！${gamer ? "\n🎮 プロゲーマーの本領！勝ち額1.5倍！" : ""}` });
      UI.log(`🎰 ${p.name}がハイ＆ローで勝利！ +${fmt(win)}`);
    } else {
      Sound.play("bad");
      Game.pay(p, bet);
      p.stats && (p.stats.gamble = (p.stats.gamble || 0) - bet);
      await UI.modal({ title: `出た数字は「${nxt}」…負け…`, body: `賭け金 ${fmt(bet)} を失った…` });
      UI.log(`🎰 ${p.name}がハイ＆ローで敗北… -${fmt(bet)}`);
    }
  }

  async function pickRoulette(p) {
    const bet = await betModal(p, "🎰 一点賭けルーレット", "1〜10から1つ選んでルーレットを回す。当たれば賭け金が10倍！！");
    if (bet == null) return;
    const nums = [];
    for (let k = 1; k <= 10; k++) nums.push(String(k));
    nums.push("やめる");
    const pick = await UI.modal({ title: "🎯 どの数字に賭ける？", body: `賭け金：${fmt(bet)}`, buttons: nums });
    if (pick === 10) return;
    const k = await Roulette.spin(0, `🎰 一点賭けルーレット「${pick + 1}」に賭け中（移動しません）`);
    if (k === pick + 1) {
      const gamer = p.job && p.job.n === "プロゲーマー";
      const win = Math.round(bet * 9 * (gamer ? 1.5 : 1));
      Sound.play("fanfare");
      Game.gain(p, win);
      p.stats && (p.stats.gamble = (p.stats.gamble || 0) + win);
      await UI.modal({ title: `🎆 「${k}」！大的中！！！`, body: `+${fmt(win)}！！${gamer ? "\n🎮 プロゲーマーの本領！勝ち額1.5倍！" : ""}` });
      UI.log(`🎆 ${p.name}が一点賭けで大的中！！ +${fmt(win)}`);
    } else {
      Sound.play("bad");
      Game.pay(p, bet);
      p.stats && (p.stats.gamble = (p.stats.gamble || 0) - bet);
      await UI.modal({ title: `出たのは「${k}」…はずれ…`, body: `賭け金 ${fmt(bet)} を失った…` });
      UI.log(`🎰 ${p.name}の一点賭けははずれ… -${fmt(bet)}`);
    }
  }

  // premium=true はゴール前のプラチナ宝くじ（1枚100万・1等5000万）
  async function lottery(p, premium) {
    const price = premium ? 1000000 : LOTTERY_PRICE;
    const name = premium ? "💎 プラチナ宝くじ" : "🎟️ 宝くじ売り場";
    const odds = premium
      ? `1等 ¥50,000,000（2%）／2等 ¥5,000,000（8%）`
      : `1等 ¥10,000,000（1%）／2等 ¥500,000（5%）／3等 ¥150,000（14%）`;
    while (true) {
      if (p.money < price) {
        await UI.modal({ title: name, body: `所持金が足りない…（1枚 ${fmt(price)}）` });
        return;
      }
      const b = await UI.modal({
        title: name,
        body: `1枚 ${fmt(price)}。夢を買う？\n${odds}`,
        buttons: ["買う！", "やめる"],
      });
      if (b === 1) return;
      Game.pay(p, price);
      p.stats && (p.stats.gamble = (p.stats.gamble || 0) - price);
      const hit = a => { p.stats && (p.stats.gamble = (p.stats.gamble || 0) + a); Game.gain(p, a); };
      const r = Math.random();
      if (premium) {
        if (r < 0.02) {
          Fx.cutin("🎆", "プラチナ1等！！！");
          await new Promise(res => setTimeout(res, 1100));
          Sound.play("fanfare");
          hit(50000000);
          await UI.modal({ title: "🎆🎆🎆 プラチナ1等！！！ 🎆🎆🎆", body: `奇跡が起きた！！ +${fmt(50000000)}！！！\n伝説の億万長者誕生！！` });
          UI.log(`🎆 ${p.name}がプラチナ宝くじ1等 ${fmt(50000000)}！！！`);
        } else if (r < 0.10) {
          Sound.play("win");
          hit(5000000);
          await UI.modal({ title: "🎉 プラチナ2等！", body: `2等！ +${fmt(5000000)}！！` });
          UI.log(`🎉 ${p.name}がプラチナ宝くじ2等 +${fmt(5000000)}`);
        } else {
          Sound.play("bad");
          await UI.modal({ title: "😇 はずれ…", body: `${fmt(price)}が夜空に消えた…` });
        }
        continue;
      }
      if (r < 0.01) {
        Fx.cutin("🎆", "１等当選！！！");
        await new Promise(res => setTimeout(res, 1100));
        Sound.play("fanfare");
        hit(10000000);
        await UI.modal({ title: "🎆🎆 1等当選！！！ 🎆🎆", body: `まさかの1等！！ +${fmt(10000000)}！！人生大逆転！！` });
        UI.log(`🎆 ${p.name}が宝くじ1等 ${fmt(10000000)} を当てた！！`);
      } else if (r < 0.06) {
        Sound.play("win");
        hit(500000);
        await UI.modal({ title: "🎉 2等当選！", body: `2等！ +${fmt(500000)}！` });
        UI.log(`🎉 ${p.name}が宝くじ2等 +${fmt(500000)}`);
      } else if (r < 0.20) {
        Sound.play("coin");
        hit(150000);
        await UI.modal({ title: "😊 3等当選", body: `3等！ +${fmt(150000)}` });
        UI.log(`😊 ${p.name}が宝くじ3等 +${fmt(150000)}`);
      } else {
        Sound.play("bad");
        await UI.modal({ title: "😇 はずれ…", body: "夢は次回に持ち越し…" });
      }
    }
  }

  return { highLow, pickRoulette, lottery };
})();
