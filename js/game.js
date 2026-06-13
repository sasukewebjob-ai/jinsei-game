// ゲーム本体：ターン進行のステートマシン・マス効果の解決・精算・セーブ

const Game = (() => {
  const SAVE_KEY = "jinsei-game-save-v6";

  const hasJob = (p, name) => p.job && p.job.n === name;

  // ★ランクを反映した実効給料（★なし×1／★×1.3／★★×1.6）
  const PROMO_MULT = [1, 1, 1.3, 1.6];
  function effSalary(p) {
    if (!p.job) return SALARY_JOBLESS;
    return Math.round(p.job.s * PROMO_MULT[Math.min(p.jobLevel || 1, 3)] / 10000) * 10000;
  }
  const starsOf = p => "★".repeat(Math.max(0, (p.jobLevel || 1) - 1));
  // 🚀 宇宙飛行士は「重力からの解放」で約束手形の返済が割安（1枚¥1,000,000）
  const repayRate = p => hasJob(p, "宇宙飛行士") ? NOTE_VALUE : NOTE_REPAY;
  const earlyRate = p => hasJob(p, "宇宙飛行士") ? NOTE_VALUE : NOTE_EARLY;
  let st = null;   // { players, cur, round, goalCount, stockPrice, deck, discard, houseDeck }

  // ---------- ユーティリティ ----------
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickN(list, n) {
    return shuffle([...list]).slice(0, n);
  }

  // ---------- お金（強制支払いは10万単位で自動借金） ----------
  function gain(p, a) {
    p.money += a;
    Sound.play("coin");
    UI.toast(`💰 ${p.name} +${fmt(a)}`, "good");
    Board.floatText(p, `+${fmt(a)}`, "#5dff9e");
    Fx.bills(Fx.bankPos(), Board.tokenScreenPos(p), a);   // 銀行から紙幣が飛んでくる
    UI.renderSidebar(st);
  }

  function pay(p, a) {
    if (p.money < a) {
      // 約束手形を発行（1枚¥1,000,000・ゴール時1枚¥1,500,000で返済）
      const need = Math.ceil((a - p.money) / NOTE_VALUE);
      p.notes += need;
      p.money += need * NOTE_VALUE;
      p.stats = p.stats || {};
      p.stats.borrowed = (p.stats.borrowed || 0) + need * NOTE_VALUE;
      UI.toast(`🧾 ${p.name} 約束手形×${need}を発行…`, "bad");
      UI.log(`🧾 ${p.name}が約束手形を${need}枚発行（ゴール時に1枚${fmt(NOTE_REPAY)}で返済）`);
    }
    p.money -= a;
    Sound.play("pay");
    UI.toast(`💸 ${p.name} -${fmt(a)}`, "bad");
    Board.floatText(p, `-${fmt(a)}`, "#ff8a8a");
    Fx.bills(Board.tokenScreenPos(p), Fx.bankPos(), a);   // 銀行へ紙幣を支払う
    UI.renderSidebar(st);
  }

  function applyMoney(p, amount) {
    if (amount >= 0) gain(p, amount); else pay(p, -amount);
  }

  function paySalary(p, mult = 1) {
    let a = effSalary(p) * mult;
    const maneki = p.cards.filter(c => c === "maneki").length;
    a += maneki * 100000;
    gain(p, a);
    UI.log(`💴 ${p.name}の給料日 +${fmt(a)}${p.job ? "" : "（無職なのでバイト代）"}${mult > 1 ? "✨ダブル給料！" : ""}${maneki ? "🐱招き猫の御利益！" : ""}`);
  }

  // 総資産が全員の中で唯一の最下位か（ビリの意地の条件）
  function isUnderdog(p) {
    if (st.players.length < 3 || st.round < 3) return false;
    const mine = estimateAssets(st, p);
    return st.players.every(o => o.id === p.id || estimateAssets(st, o) > mine);
  }

  // ---------- ゲーム開始 ----------
  function newGame(defs) {
    const deck = [];
    Object.keys(CARD_DEFS).forEach(id => deck.push(id, id));   // 各2枚
    st = {
      players: defs.map((d, i) => createPlayer(i, d.name, d.color, d.gender)),
      cur: 0, round: 1, goalCount: 0,
      stockPrice: STOCK.start,
      deck: shuffle(deck), discard: [],
      houseDeck: shuffle(HOUSES.map((_, i) => i)),
      burned: [],
      layout: makeBoardLayout(),   // 毎ゲーム、章内でマス内容をシャッフル
    };
    applyBoardLayout(st.layout);
    startUI();
    UI.log("🏁 ゲームスタート！波乱万丈の人生へ！（マス配置は今回スペシャル）");
    (async () => { await decideOrder(); loop(); })();
  }

  // スタート順をルーレットで決める（出目の大きい人から先攻・同点はランダムでタイブレーク）
  async function decideOrder() {
    if (!st || st.players.length < 2) return;
    await UI.modal({ title: "🎲 スタート順を決めよう！", body: "全員が順番にルーレットを回して、出目の大きい人から先攻！\n（パス＆プレイ：端末を順番に回してね）" });
    const rolls = [];
    for (const p of st.players) {
      await UI.handoff(p);
      const n = await Roulette.spin(0, `🎲 ${p.name}のスタート順ルーレット（移動しません）`);
      rolls.push({ p, n, tie: Math.random() });
      UI.log(`🎲 ${p.name}のスタート順ルーレット：${n}`);
      await UI.modal({ title: `${p.name}：「${n}」！`, body: `スタート順を決める出目は ${n}！`, color: p.color });
    }
    rolls.sort((a, b) => b.n - a.n || a.tie - b.tie);
    const ordered = rolls.map(r => r.p);
    st.players.length = 0;
    ordered.forEach(p => st.players.push(p));   // 同じ配列を並べ替え（Boardの参照を維持）
    st.cur = 0;
    Sound.play("fanfare");
    await UI.modal({ title: "🏁 スタート順きまり！", body: rolls.map((r, i) => `${i + 1}番目　${r.p.name}（出目 ${r.n}）`).join("\n") });
    UI.log(`🏁 スタート順：${rolls.map(r => r.p.name).join(" → ")}`);
    UI.renderSidebar(st);
  }

  function startUI() {
    UI.showScreen("game");
    Board.build(st);
    UI.renderSidebar(st);
    Bgm.play("game");
  }

  // ---------- メインループ ----------
  async function loop() {
    while (st.players.some(p => !p.goaled)) {
      const p = st.players[st.cur];
      if (!p.goaled) {
        save();                       // ターン頭で自動セーブ（中断→再開用）
        await takeTurn(p);
        driftStock();
        UI.renderSidebar(st);
      }
      st.cur = (st.cur + 1) % st.players.length;
      if (st.cur === 0) st.round++;
    }
    showResults();
  }

  async function takeTurn(p) {
    UI.renderHeader(st, p);
    UI.renderSidebar(st);
    Board.setCurrent(p);
    await UI.handoff(p);
    Board.focusPlayer(p);

    if (p.skip) {
      p.skip = false;
      await UI.modal({ title: "😴 1回休み", body: `${p.name}は今回お休み…`, color: p.color });
      return;
    }

    // ルーレット前：カード使用・株売却など
    while (true) {
      const act = await UI.preroll();
      if (act === "assets") {
        await assetPanel(p);
        UI.renderSidebar(st);
        if (p.goaled) return;        // ワープたまごでゴールした場合
        continue;
      }
      break;
    }

    let n, usedTurbo = false;
    if (p.forceTen) {
      p.forceTen = false;
      usedTurbo = true;
      n = await Roulette.spin(8, `🚗 ${p.name}の移動ルーレット（ターボ）`);
      UI.log(`🚀 ${p.name}のターボチケット発動！出目は8！`);
    } else {
      n = await Roulette.spin(0, `🚗 ${p.name}の移動ルーレット`);
      UI.log(`🎡 ${p.name}：${n}が出た`);
      // サイコロの神様：出目を見てから振り直せる
      if (p.rerollReady) {
        const i = await UI.modal({
          title: "🎲 サイコロの神様",
          body: `出目は「${n}」。振り直す？（振り直したら2回目の出目で確定）`,
          buttons: ["🎲 振り直す！", "このままでいい（また今度）"],
        });
        if (i === 0) {
          p.rerollReady = false;
          n = await Roulette.spin(0, `🎲 ${p.name}の振り直しルーレット`);
          UI.log(`🎲 ${p.name}が振り直し！出目は${n}`);
        }
      } else if (isUnderdog(p)) {
        // ビリの意地：総資産最下位はもう1回回してどちらか選べる
        const i = await UI.modal({
          title: "🔥 ビリの意地！",
          body: `総資産ビリ特典：もう1回回して、好きな出目を選べる！\n1回目の出目：「${n}」`,
          buttons: ["🔥 もう1回回す！", "このままでいい"],
          color: p.color,
        });
        if (i === 0) {
          const n2 = await Roulette.spin(0, `🔥 ビリの意地：2回目のルーレット`);
          const j = await UI.modal({
            title: "どっちの出目を使う？",
            body: `1回目：「${n}」　2回目：「${n2}」`,
            buttons: [`${n}マス進む`, `${n2}マス進む`],
          });
          if (j === 1) n = n2;
          UI.log(`🔥 ${p.name}のビリの意地！${n}を選んだ`);
        }
      }
    }

    // ✈️ パイロット：移動の出目+1（毎ターン1マス多く進む。ターボの確定8には乗らない）
    if (!usedTurbo && hasJob(p, "パイロット")) {
      n += 1;
      UI.log(`✈️ ${p.name}はパイロット！出目+1で${n}マス進む`);
    }

    const res = await moveSteps(p, n, 0);
    if (res === "goal") return;
    await resolveSquare(p, SQUARES[p.pos], 0);
  }

  // ---------- 移動 ----------
  async function moveSteps(p, n, depth) {
    const banner = depth === 0;
    let taken = 0, stopped = false;
    if (banner) UI.moveBanner(`🎡 ${p.name}：出目 ${n}！`);
    for (let i = 0; i < n; i++) {
      const cur = SQUARES[p.pos];
      if (cur.t === "goal") break;
      const nid = await chooseNext(p, cur);
      // 論理位置を先に更新してからアニメーション（placeAllが旧位置に巻き戻すバグの修正）
      p.pos = nid;
      p.path.push(nid);
      await Board.stepToken(p, nid);
      taken++;
      const sq = SQUARES[nid];
      if (banner) UI.moveBanner(i < n - 1 ? `🎡 出目 ${n}：あと ${n - 1 - i} マス` : `🎡 出目 ${n}：${n}マス進んでとうちゃく！`);
      if (sq.t === "goal") { UI.moveBanner(null); await arriveGoal(p); return "goal"; }
      if (i < n - 1) {
        if (sq.pass) await passEffect(p, sq);
        if (sq.stop) {
          stopped = true;
          UI.moveBanner(`✋ 「${sq.label}」で完全停止！（残り ${n - 1 - i} マスは消滅）`, 2600);
          Sound.play("land");
          break;
        }
      }
    }
    if (banner && !stopped) UI.moveBanner(null, 1200);
    // 移動検証：出目どおり進めなかったのに正当な理由（停止マス/ゴール）がない場合はバグとして記録
    const landed = SQUARES[p.pos];
    if (taken < n && !landed.stop && landed.t !== "goal") {
      console.error(`[MOVE-BUG] 出目${n}に対して${taken}マスしか進んでいない（停止理由なし／位置id=${p.pos} ${landed.label}）`);
      UI.log(`⚠️ 移動検証エラー：出目${n}で${taken}マス（開発向けログ）`);
    }
    return "land";
  }

  // 分岐マスでは進む方向を選ぶ（選択は記憶される）
  async function chooseNext(p, sq) {
    if (sq.next.length === 1) return sq.next[0];
    if (p.chosen[sq.id] != null) return p.chosen[sq.id];
    const idx = await UI.modal({
      title: `🔀 ${sq.label}`,
      body: sq.text,
      buttons: sq.routes.map(r => r.label),
      color: p.color,
    });
    p.chosen[sq.id] = sq.routes[idx].next;
    UI.log(`🔀 ${p.name}は「${sq.routes[idx].label}」を選んだ`);
    return p.chosen[sq.id];
  }

  // 通過時にも発動するマス（給料日・学費）
  async function passEffect(p, sq) {
    if (sq.t === "payday") {
      paySalary(p);
    } else if (sq.t === "money") {
      applyMoney(p, sq.amount);
      UI.log(`${squareIcon(sq)} ${p.name} ${sq.label} ${fmt(sq.amount)}`);
    }
    await wait(420);
  }

  // 後ろに戻る（来た道を戻り、止まったマスの効果は発動）
  function moveBack(p, n) {
    for (let i = 0; i < n && p.path.length > 1; i++) p.path.pop();
    p.pos = p.path[p.path.length - 1];
    return Board.jump(p);
  }

  // ---------- マス効果の解決 ----------
  async function resolveSquare(p, sq, depth) {
    Board.focusPlayer(p);
    switch (sq.t) {
      case "start": break;

      case "money": {
        if (sq.childCost && p.children < 1) {
          Sound.play("click");
          Fx.bubble(Board.tokenScreenPos(p), sq.label, "子供がいないのでセーフ！", true);
          UI.log(`👶 ${p.name}は子供がいないので「${sq.label}」の出費なし`);
          await wait(1200);
          break;
        }
        let a = sq.amount, note = "";
        if (a < 0 && sq.scam && hasJob(p, "弁護士")) {
          a = -Math.round(-a / 2 / 10000) * 10000;
          note = `⚖️ 弁護士の腕で被害半減！（${fmt(a)}）`;
        }
        // 小さい金額はモーダルなしの吹き出しでテンポよく
        if (Math.abs(a) <= 300000 && !note) {
          Sound.play("land");
          Fx.bubble(Board.tokenScreenPos(p), sq.label, `${a > 0 ? "+" : ""}${fmt(a)}`, a > 0);
          applyMoney(p, a);
          UI.log(`${squareIcon(sq)} ${p.name} ${sq.label} ${fmt(a)}`);
          await wait(1400);
        } else {
          if (a >= 5000000) { Fx.cutin("💰", "大金GET！！"); await wait(1100); }
          await UI.eventModal(sq, p, note);
          applyMoney(p, a);
          UI.log(`${squareIcon(sq)} ${p.name} ${sq.label} ${fmt(a)}`);
        }
        if (a < 0 && hasJob(p, "ユーチューバー")) {
          gain(p, 200000);
          UI.log(`📹 ${p.name}「動画のネタになった」 +${fmt(200000)}`);
        }
        break;
      }

      case "payday": {
        const m = hasJob(p, "会社員") ? 3 : 2;
        await UI.eventModal(sq, p, m === 3 ? "💼 会社員の本領！止まったから給料3倍！！" : "✨ 止まったからダブル給料！！");
        paySalary(p, m);
        break;
      }

      case "card":
        await UI.eventModal(sq, p);
        await drawCard(p);
        break;

      case "move": {
        await UI.eventModal(sq, p);
        if (depth >= 5) break;       // 移動マスの連鎖は5回まで
        if (sq.steps > 0) {
          const r = await moveSteps(p, sq.steps, depth + 1);
          if (r === "goal") return;
        } else {
          if (hasJob(p, "宇宙飛行士")) {
            await UI.modal({ title: "🚀 宇宙飛行士の本領！", body: "ジェット噴射で踏みとどまった！戻らずに済んだ！" });
            UI.log(`🚀 ${p.name}は宇宙飛行士なので戻らない`);
            break;
          }
          await moveBack(p, -sq.steps);
          await wait(300);
        }
        await resolveSquare(p, SQUARES[p.pos], depth + 1);
        return;
      }

      case "skip":
        await UI.eventModal(sq, p);
        p.skip = true;
        break;

      case "branch":
        await chooseNext(p, sq);     // 次のターンに進む方向を先に選ぶ
        break;

      case "jobsq":     await jobLand(p, sq); break;
      case "jobfair":   await jobFair(p, sq.pool); break;
      case "jobchange": await jobChange(p); break;
      case "promo":     await promoSquare(p, sq); break;
      case "preclose":  await preClose(p); break;
      case "marriage":  await marriage(p); break;
      case "child":     await childBirth(p, sq.count); break;
      case "house":     await houseSquare(p, sq); break;
      case "insurance": await insuranceSquare(p); break;
      case "stock":     await stockSquare(p); break;

      case "casino":
        await UI.eventModal(sq, p);
        if (sq.kind === "highlow") await Casino.highLow(p);
        else await Casino.pickRoulette(p);
        break;

      case "lottery":
        await UI.eventModal(sq, p);
        await Casino.lottery(p, sq.premium);
        break;

      case "disaster": await disaster(p, sq); break;
      case "accident": await accident(p, sq); break;
      case "fire":     await fireEvent(p, sq); break;
      case "housedmg": await houseDamage(p, sq); break;
      case "layoff":   await layoff(p, sq); break;
      case "finalbet": await finalBet(p, sq); break;
      case "duel":     await duel(p, sq); break;
      case "choice":   await choiceEvent(p, sq); break;

      case "gift": {
        await UI.eventModal(sq, p);
        const os = st.players.filter(o => o.id !== p.id && !o.goaled);
        const per = hasJob(p, "板前") ? sq.amount * 2 : sq.amount;
        os.forEach(o => pay(o, per));
        if (os.length) gain(p, per * os.length);
        await UI.modal({ title: `🎁 ${sq.label}！`, body: `全員から ${fmt(per)} ずつ、合計 +${fmt(per * os.length)} もらった！${hasJob(p, "板前") ? "\n🍣 板前の本領！祝い膳を振る舞って2倍！" : ""}`, color: p.color });
        UI.log(`🎁 ${p.name}の${sq.label}！全員から合計 +${fmt(per * os.length)}`);
        break;
      }

      case "stockboom":
        await UI.eventModal(sq, p);
        st.stockPrice = Math.min(STOCK.max, Math.round(st.stockPrice * 2 / 1000) * 1000);
        await UI.modal({ title: "🚀 株価2倍！！", body: `株価 → ${fmt(st.stockPrice)}！株主は大喜び！` });
        UI.log(`🚀 株価大暴騰！ → ${fmt(st.stockPrice)}`);
        break;

      case "stockcrash":
        await UI.eventModal(sq, p);
        st.stockPrice = Math.max(STOCK.min, Math.round(st.stockPrice / 2 / 1000) * 1000);
        await UI.modal({ title: "📉 株価半分…", body: `株価 → ${fmt(st.stockPrice)}…株主は真っ青！` });
        UI.log(`📉 株価大暴落… → ${fmt(st.stockPrice)}`);
        break;
    }
    UI.renderSidebar(st);
  }

  // ---------- お宝カード ----------
  async function drawCard(p) {
    if (st.deck.length === 0) { st.deck = shuffle(st.discard); st.discard = []; }
    if (st.deck.length === 0) {
      await UI.modal({ title: "🃏 お宝カード", body: "山札が空だった…" });
      return;
    }
    const id = st.deck.pop();
    p.cards.push(id);
    const c = CARD_DEFS[id];
    Sound.play("win");
    await UI.modal({
      title: "🃏 お宝カードGET！",
      body: h("div", { class: "flip-scene" },
        h("div", { class: "flip-inner" },
          h("div", { class: "flip-face flip-back" }, Icons.el("giftbox", 56), h("small", {}, "お宝カード")),
          h("div", { class: "flip-face flip-front" },
            h("div", { class: "card-art" }, Icons.el(Icons.cardKey(id), 62)),
            h("div", { class: "card-name" }, c.n),
            h("div", { class: "card-desc" }, c.d + (c.passive ? "（自動発動）" : "")),
          ),
        ),
      ),
    });
    UI.log(`🃏 ${p.name}は「${c.n}」を手に入れた`);
  }

  function canUseCard(p, cid) {
    if (CARD_DEFS[cid].passive) return false;
    if (cid === "debthalf") return p.notes > 0;
    if (cid === "comeback") return st.players.every(o => o.id === p.id || estimateAssets(st, o) >= estimateAssets(st, p));
    if (cid === "sabotage" || cid === "swapseat") return st.players.some(o => o.id !== p.id && !o.goaled);
    if (cid === "tsukemawashi") return p.notes > 0 && st.players.some(o => o.id !== p.id && !o.goaled);
    if (cid === "reroll") return !p.rerollReady;
    return true;
  }

  async function useCard(p, i) {
    const cid = p.cards[i];
    const c = CARD_DEFS[cid];
    let used = true;
    switch (cid) {
      case "turbo":
        p.forceTen = true;
        await UI.modal({ title: "🚀 ターボチケット", body: "次のルーレットは必ず8！ぶっ飛ばせ！" });
        break;
      case "sabotage": {
        const ts = st.players.filter(o => o.id !== p.id && !o.goaled);
        const ti = await UI.modal({ title: "😴 サボり券", body: "誰を1回休みにする？", buttons: ts.map(t => t.name).concat("やめる") });
        if (ti === ts.length) { used = false; break; }
        ts[ti].skip = true;
        UI.log(`😴 ${p.name}が${ts[ti].name}を1回休みにした！`);
        break;
      }
      case "collect": {
        const os = st.players.filter(o => o.id !== p.id && !o.goaled);
        os.forEach(o => pay(o, 100000));
        gain(p, 100000 * os.length);
        await UI.modal({ title: "🙏 寄付のお願い", body: `全員から¥100,000ずつ、合計 ${fmt(100000 * os.length)} 集まった！` });
        break;
      }
      case "lucky7":
        gain(p, 700000);
        await UI.modal({ title: "🪙 七福神の小判", body: `御利益キター！ +${fmt(700000)}` });
        break;
      case "advance": {
        const a = p.job ? effSalary(p) : 200000;
        gain(p, a);
        await UI.modal({ title: "💴 給料前借り", body: `+${fmt(a)} 前借りした！来月の自分よ、すまん！` });
        break;
      }
      case "freeins": {
        const opts = Object.keys(INSURANCES).filter(k => !p.insurance[k]);
        if (opts.length === 0) {
          await UI.modal({ title: "🎫 保険タダ券", body: "もう両方の保険に入っていた！" });
          used = false;
          break;
        }
        const ii = await UI.modal({ title: "🎫 保険タダ券", body: "どっちに無料で入る？", buttons: opts.map(k => `${INSURANCES[k].e} ${INSURANCES[k].n}`).concat("やめる") });
        if (ii === opts.length) { used = false; break; }
        p.insurance[opts[ii]] = true;
        UI.log(`🎫 ${p.name}が${INSURANCES[opts[ii]].n}に無料加入`);
        break;
      }
      case "stockgift":
        p.stocks += 2;
        await UI.modal({ title: "📜 株主優待券", body: "株を2株タダでゲット！" });
        break;
      case "warp": {
        p.cards.splice(i, 1);
        st.discard.push(cid);
        UI.log(`🥚 ${p.name}が「ワープたまご」を使った`);
        await UI.modal({ title: "🥚 ワープたまご", body: "たまごが割れて3マス進む！" });
        const r = await moveSteps(p, 3, 1);
        if (r !== "goal") await resolveSquare(p, SQUARES[p.pos], 1);
        return;
      }
      case "debthalf": {
        const before = p.notes;
        p.notes = Math.floor(p.notes / 2);
        await UI.modal({ title: "📃 手形半減の証文", body: `約束手形 ${before}枚 → ${p.notes}枚 に！` });
        UI.renderSidebar(st);
        break;
      }
      case "comeback":
        gain(p, 2000000);
        await UI.modal({ title: "🃏 逆転の切り札", body: `どん底からの +${fmt(2000000)}！！まだ終わらんよ！` });
        break;
      case "swapseat": {
        const ts = st.players.filter(o => o.id !== p.id && !o.goaled);
        const ti = await UI.modal({ title: "🔁 入れ替えの号令", body: "誰と位置を入れ替える？", buttons: ts.map(t => t.name).concat("やめる") });
        if (ti === ts.length) { used = false; break; }
        const t = ts[ti];
        [p.pos, t.pos] = [t.pos, p.pos];
        [p.path, t.path] = [t.path, p.path];
        Board.placeAll();
        Board.focusPlayer(p);
        Sound.play("win");
        await UI.modal({ title: "🔁 入れ替え成立！", body: `${p.name} と ${t.name} の位置がそっくり入れ替わった！！` });
        UI.log(`🔁 ${p.name}が${t.name}と位置を入れ替えた！`);
        break;
      }
      case "reroll":
        p.rerollReady = true;
        await UI.modal({ title: "🎲 サイコロの神様", body: "次のルーレットから、出目を見て1回だけ振り直せる！（使うまで有効）" });
        break;
      case "tsukemawashi": {
        const ts = st.players.filter(o => o.id !== p.id && !o.goaled);
        const ti = await UI.modal({ title: "📨 ツケ回しの証文", body: `自分の約束手形1枚（返済 ${fmt(NOTE_REPAY)}）を誰に押し付ける？`, buttons: ts.map(t => t.name).concat("やめる") });
        if (ti === ts.length) { used = false; break; }
        const t = ts[ti];
        p.notes--;
        t.notes++;
        Sound.play("bad");
        await UI.modal({ title: "📨 ツケ回し成功！", body: `${t.name}に約束手形を1枚押し付けた！（${t.name}のゴール時返済 +${fmt(NOTE_REPAY)}）` });
        UI.log(`📨 ${p.name}が${t.name}に手形を押し付けた！`);
        break;
      }
    }
    if (used) {
      p.cards.splice(i, 1);
      st.discard.push(cid);
      UI.log(`🃏 ${p.name}が「${c.n}」を使った`);
    }
  }

  // お守りは災害時に自動で身代わりになる
  function consumeOmamori(p) {
    const i = p.cards.indexOf("omamori");
    if (i < 0) return false;
    p.cards.splice(i, 1);
    st.discard.push("omamori");
    Sound.play("win");
    return true;
  }

  function omamoriModal() {
    return UI.modal({ title: "🧿 平和のお守り発動！", body: "お守りが砕け散り、災いを無効化した！" });
  }

  // 手札ビュー：職業カード・保険証券・株券・約束手形・お宝カードを紙のカードで表示
  function paperCard(cls, iconKey, name, sub) {
    return h("div", { class: "paper-card pc-" + cls },
      Icons.el(iconKey, 32),
      h("div", { class: "pc-n" }, name),
      h("div", { class: "pc-s" }, sub),
    );
  }
  function handView(p) {
    const cards = [];
    if (p.job) cards.push(paperCard("job", Icons.jobKey(p.job.n), p.job.n + starsOf(p), `給料 ${fmt(effSalary(p))}`));
    if (p.insurance.life) cards.push(paperCard("ins", "shieldheart", "生命保険証券", "事故・入院を無効化"));
    if (p.insurance.fire) cards.push(paperCard("ins", "shieldflame", "火災保険証券", "火事から家を守る"));
    if (p.stocks > 0) cards.push(paperCard("stock", "scrollstock", `株券 ×${p.stocks}`, `時価 ${fmt(p.stocks * st.stockPrice)}`));
    if (p.notes > 0) cards.push(paperCard("note", "cutpaper", `約束手形 ×${p.notes}`, `要返済 ${fmt(p.notes * repayRate(p))}`));
    p.houses.forEach(hi => cards.push(paperCard("house", "houseicon", HOUSES[hi].n, "権利書")));
    p.cards.forEach(cid => cards.push(paperCard("treasure", Icons.cardKey(cid), CARD_DEFS[cid].n, CARD_DEFS[cid].passive ? "自動発動" : "使用可")));
    if (!cards.length) cards.push(h("div", { class: "hand-empty" }, "手持ちの紙はまだない…これからこれから！"));
    return h("div", { class: "hand-cards" }, cards);
  }

  // ---------- カード・資産パネル（ルーレット前） ----------
  async function assetPanel(p) {
    while (!p.goaled) {
      const items = [];
      p.cards.forEach((cid, i) => {
        const c = CARD_DEFS[cid];
        items.push({ label: `${c.e} ${c.n}${c.passive ? "（自動発動）" : ""}`, disabled: !canUseCard(p, cid), use: i });
      });
      if (p.stocks > 0) {
        items.push({ label: `📈 1株売る（+${fmt(st.stockPrice)}）`, sell: 1 });
        items.push({ label: `📈 全部売る（${p.stocks}株 → +${fmt(p.stocks * st.stockPrice)}）`, sell: p.stocks });
      }
      if (p.notes > 0) {
        items.push({ label: `🧾 手形を1枚早期返済（-${fmt(earlyRate(p))}・ゴール返済よりお得）`, disabled: p.money < earlyRate(p), repay: true });
      }
      items.push({ label: "閉じる", close: true });
      const idx = await UI.modal({
        title: `🎒 ${p.name}のカード・資産`,
        body: [
          handView(p),
          `所持金 ${fmt(p.money)}　株価 ${fmt(st.stockPrice)}\n` +
          (p.cards.length ? "使うカードを選んでね（灰色＝自動発動か条件未達成）" : ""),
        ],
        buttons: items.map(it => ({ label: it.label, disabled: it.disabled })),
        color: p.color,
      });
      const it = items[idx];
      if (it.close) return;
      if (it.repay) {
        pay(p, earlyRate(p));
        p.notes--;
        UI.log(`🧾 ${p.name}が手形を1枚早期返済（-${fmt(earlyRate(p))}）`);
        continue;
      }
      if (it.sell) {
        p.stocks -= it.sell;
        gain(p, it.sell * st.stockPrice);
        UI.log(`📈 ${p.name}が株を${it.sell}株売却`);
        continue;
      }
      if (it.use != null) await useCard(p, it.use);
      UI.renderSidebar(st);
    }
  }

  // ---------- 人生イベント ----------
  function jobCardsView(offers) {
    return h("div", { class: "job-cards" }, offers.map(j =>
      h("div", { class: "job-card" },
        h("div", { class: "jc-e" }, Icons.el(Icons.jobKey(j.n), 46)),
        h("div", { class: "jc-n" }, j.n),
        h("div", { class: "jc-s" }, `給料 ${fmt(j.s)}`),
        h("div", { class: "jc-d" }, j.d),
        h("div", { class: "jc-k" }, "⭐ " + j.k),
      )));
  }

  // その職業が他のプレイヤーに取られていないか（職業は早い者勝ちで1人1職）
  function jobTakenBy(jobName, except) {
    return st.players.find(o => o !== except && o.job && o.job.n === jobName) || null;
  }
  function freeJobs(pool, p) {
    const list = pool === "pro" ? JOBS_PRO : pool === "normal" ? JOBS_NORMAL : [...JOBS_NORMAL, ...JOBS_PRO];
    return list.filter(j => !jobTakenBy(j.n, p) && !(p.job && p.job.n === j.n));
  }
  // 就職フェア用：空いている職業のうち給料が低い順にn件（大学/就職どちらのコースでも全プールから）
  function lowestJobs(p, n) {
    return [...freeJobs("all", p)].sort((a, b) => a.s - b.s).slice(0, n);
  }
  function takeJob(p, j, isChange) {
    const hadStars = (p.jobLevel || 1) > 1;
    p.job = j;
    p.jobLevel = 1;   // 転職・就職で★はリセット
    if (isChange) { p.stats = p.stats || {}; p.stats.jobChanges = (p.stats.jobChanges || 0) + 1; }
    Sound.play("win");
    UI.log(`💼 ${p.name}は${j.n}に${isChange ? "転職" : "就職"}！（給料 ${fmt(j.s)}／特技：${j.k}）${hadStars ? "（★はリセット…）" : ""}`);
  }

  // 昇進マス：職業に★が付いて給料ランクUP（★★まで）
  async function promoSquare(p, sq) {
    await UI.eventModal(sq, p);
    if (!p.job) {
      gain(p, 100000);
      await UI.modal({ title: "⭐ 昇進…？", body: `無職に昇進はなかった…が、バイトリーダーに任命された！ +${fmt(100000)}` });
      UI.log(`⭐ ${p.name}はバイトリーダーに（+${fmt(100000)}）`);
      return;
    }
    if ((p.jobLevel || 1) >= 3) {
      gain(p, 500000);
      await UI.modal({ title: "🏆 もう頂点！", body: `${p.job.n}${starsOf(p)}はすでに頂点！特別表彰金 +${fmt(500000)}！` });
      UI.log(`🏆 ${p.name}は${p.job.n}の頂点として表彰 +${fmt(500000)}`);
      return;
    }
    p.jobLevel = (p.jobLevel || 1) + 1;
    Sound.play("fanfare");
    Fx.cutin("⭐", "昇進おめでとう！！");
    await wait(1100);
    await UI.modal({
      title: `⭐ 昇進！ ${p.job.e} ${p.job.n}${starsOf(p)}`,
      body: `給料ランクUP！ ${fmt(p.job.s)} → ${fmt(effSalary(p))}（×${PROMO_MULT[p.jobLevel]}）\n※転職すると★はリセットされるので注意！`,
      color: p.color,
    });
    UI.log(`⭐ ${p.name}が昇進！${p.job.n}${starsOf(p)}（給料 ${fmt(effSalary(p))}）`);
    UI.renderSidebar(st);
  }

  // 就職が決まったら職業ゾーンの残りを飛ばして就職フェアまで一気に進む（フェアの効果は発動しない）
  async function skipToFair(p) {
    let id = p.pos, guard = 0;
    const path = [];
    while (guard++ < 10 && SQUARES[id].next.length === 1) {
      id = SQUARES[id].next[0];
      path.push(id);
      if (SQUARES[id].t === "jobfair") break;
    }
    if (!path.length || SQUARES[path[path.length - 1]].t !== "jobfair") return;
    UI.toast("💼 就職が決まった！フェア会場まで一気に進む！", "info");
    await wait(450);
    for (const nid of path) {
      p.pos = nid;
      p.path.push(nid);
      await Board.stepToken(p, nid);
    }
    await wait(250);
  }

  // 職業マス：止まったら就職（職持ちなら転職もできる。先客がいたら就けない）
  async function jobLand(p, sq) {
    const j = sq.job;
    await UI.eventModal(sq, p);
    const holder = jobTakenBy(j.n, p);
    if (holder) {
      await UI.modal({ title: `${j.e} 先客がいた！`, body: `${j.n}の枠はすでに ${holder.name} のもの…！同じ職業には就けない。`, color: holder.color });
      return;
    }
    if (!p.job) {
      const i = await UI.modal({
        title: `${j.e} ${j.n}になる？`,
        body: `${j.d}\n給料 ${fmt(j.s)}（給料日にもらえる・止まれば2倍）\n⭐ 特技：${j.k}\n\nこのマスの「${j.n}」に就職する？見送れば無職のまま先へ進む（就職フェアで決められる）`,
        buttons: [`${j.n}になる！`, `${j.n}にならない（見送る）`],
        color: p.color,
      });
      if (i === 1) {
        Sound.play("click");
        await UI.modal({ title: "🙅 見送った", body: `「${j.n}」は今回見送った。無職のまま進む。` });
        UI.log(`🙅 ${p.name}は${j.n}を見送った（無職のまま進む）`);
        return;
      }
      takeJob(p, j, false);
      await UI.modal({ title: `${j.e} ${j.n}に就職！`, body: `${j.d}！\n給料 ${fmt(j.s)}（給料日マスでもらえる・止まれば2倍）\n⭐ 特技：${j.k}`, color: p.color });
      await skipToFair(p);
      return;
    }
    if (p.job.n === j.n) {
      await UI.modal({ title: `${j.e} 同業者と意気投合`, body: `${j.n}どうしで話が弾んだ。明日からも頑張ろう！` });
      return;
    }
    const i = await UI.modal({
      title: `${j.e} ${j.n}に転職する？`,
      body: `いまの仕事：${p.job.e} ${p.job.n}（給料 ${fmt(p.job.s)}／${p.job.k}）\n転職先：${j.e} ${j.n}（給料 ${fmt(j.s)}／${j.k}）`,
      buttons: [`${j.n}に転職する！`, "今のままでいい"],
    });
    if (i === 0) {
      takeJob(p, j, true);
      await skipToFair(p);
    }
  }

  // 就職フェア（止まるマス）：無職なら必ず就職、職持ちは転職チャンス（空いている職業のみ）
  async function jobFair(p, pool) {
    await UI.eventModal(SQUARES[p.pos], p);
    if (!p.job) { await jobSquare(p, pool); return; }
    const offers = lowestJobs(p, 3);
    if (!offers.length) {
      await UI.modal({ title: "💼 就職フェア", body: "求人はすべて出払っていた…今の仕事を頑張ろう！" });
      return;
    }
    const buttons = offers.map(j => `${j.e} ${j.n}（給料 ${fmt(j.s)}）`);
    buttons.push(`今のまま（${p.job.n}）`);
    const idx = await UI.modal({ title: "💼 就職フェア（給料が手ごろな求人3つ・転職してもOK）", body: jobCardsView(offers), buttons });
    if (idx === offers.length) return;
    takeJob(p, offers[idx], true);
  }

  async function jobSquare(p, pool) {
    const offers = lowestJobs(p, 3);
    const idx = await UI.modal({
      title: "💼 就職フェア（手ごろな求人から選ぶ）",
      body: [jobCardsView(offers), h("p", { class: "small" }, "給料が低めの空き求人を3つ提案。給料日マスを通るたびに給料がもらえる！")],
      buttons: offers.map(j => `${j.e} ${j.n}にする`),
    });
    takeJob(p, offers[idx], false);
    await UI.modal({ title: `${offers[idx].e} ${offers[idx].n}に就職！`, body: `⭐ 特技：${offers[idx].k}`, color: p.color });
  }

  async function jobChange(p) {
    await UI.eventModal(SQUARES[p.pos], p);
    const offers = pickN(freeJobs("all", p), 3);
    if (!offers.length) {
      await UI.modal({ title: "💼 転職フェア", body: "求人はすべて出払っていた…" });
      return;
    }
    const buttons = offers.map(j => `${j.e} ${j.n}（給料 ${fmt(j.s)}）`);
    buttons.push(p.job ? `今のまま（${p.job.n}）` : "やっぱりやめる");
    const idx = await UI.modal({ title: "💼 転職フェア", body: jobCardsView(offers), buttons });
    if (idx === offers.length) return;
    takeJob(p, offers[idx], true);
  }

  async function marriage(p) {
    if (p.married) {
      await UI.modal({ title: "💍 結婚記念日", body: "今日は結婚記念日！しあわせのお祝い金 +¥100,000" });
      gain(p, 100000);
      return;
    }
    p.married = true;
    Fx.cutin("💍", "結婚おめでとう！！");
    await wait(1100);
    Sound.play("fanfare");
    const others = st.players.filter(o => o.id !== p.id && !o.goaled);
    const per = hasJob(p, "板前") ? MARRIAGE_GIFT * 2 : MARRIAGE_GIFT;
    others.forEach(o => pay(o, per));
    const total = per * others.length;
    if (total > 0) gain(p, total);
    await UI.modal({
      title: "💍 結婚！！おめでとう！！",
      body: `運命の人と結ばれた！\n全員からご祝儀 ${fmt(per)} ずつ、合計 ${fmt(total)} もらった！${hasJob(p, "板前") ? "\n🍣 板前の本領！自前の料理でご祝儀2倍！" : ""}`,
      color: p.color,
    });
    UI.log(`💍 ${p.name}が結婚！ご祝儀 +${fmt(total)}`);
    if (hasJob(p, "美容師")) {
      gain(p, 500000);
      await UI.modal({ title: "✂️ 美容師の本領！", body: `式のヘアメイクは全部自分で！浮いた費用 +${fmt(500000)}` });
    }
    if (hasJob(p, "パティシエ")) {
      gain(p, 200000);
      await UI.modal({ title: "🍰 パティシエの本領！", body: `ウェディングケーキ特需！ +${fmt(200000)}` });
    }
  }

  async function childBirth(p, count) {
    p.children += count;
    Fx.cutin("👶", count > 1 ? "双子誕生！！" : "赤ちゃん誕生！！");
    await wait(1100);
    Sound.play("win");
    await UI.modal({
      title: count > 1 ? "👶👶 双子誕生！？" : "👶 赤ちゃん誕生！",
      body: `家族が${count}人増えた！（ゴール時に1人につき ${fmt(CHILD_BONUS)}）\n現在の子供：${"👶".repeat(p.children)}`,
      color: p.color,
    });
    UI.log(`👶 ${p.name}に子供が${count}人誕生（計${p.children}人）`);
    if (hasJob(p, "パティシエ")) {
      gain(p, 200000);
      await UI.modal({ title: "🍰 パティシエの本領！", body: `お祝いケーキ特需！ +${fmt(200000)}` });
    }
  }

  async function houseSquare(p, sq) {
    const forced = !!(sq && sq.forced);
    await UI.eventModal(SQUARES[p.pos], p);
    let offers = st.houseDeck.slice(0, 3);
    if (forced) {
      // 最初のマイホームは身の丈から：安い順3件
      offers = [...st.houseDeck].sort((a, b) => HOUSES[a].p - HOUSES[b].p).slice(0, 3);
    }
    if (offers.length === 0) {
      await UI.modal({ title: "🏠 完売御礼", body: "もう売り物件がない…" });
      return;
    }
    const carpenter = hasJob(p, "大工");
    const priceOf = hi => carpenter ? Math.round(HOUSES[hi].p * 0.8 / 10000) * 10000 : HOUSES[hi].p;
    const items = offers.map(hi => ({
      label: `${HOUSES[hi].e} ${HOUSES[hi].n}（${fmt(priceOf(hi))}）`,
      disabled: !forced && p.money < priceOf(hi),
      hi,
    }));
    if (!forced) items.push({ label: "買わない", close: true });
    const idx = await UI.modal({
      title: forced ? "🏠 マイホームを必ず1軒選ぼう！" : "🏠 どの家を買う？",
      body: `所持金 ${fmt(p.money)}\n家はゴール時の売却ルーレットで ×0.5〜×3 になる！（1〜2:×0.5／3〜6:×1.5／7〜8:×3）\n買った家はマップに実物が建って表札が付くぞ！${forced ? "\n※お金が足りなければ約束手形（1枚¥1,000,000）が自動で発行される" : ""}${carpenter ? "\n🔨 大工の本領！2割引で買える！" : ""}`,
      buttons: items.map(it => ({ label: it.label, disabled: it.disabled })),
    });
    const it = items[idx];
    if (it.close) return;
    pay(p, priceOf(it.hi));
    p.houses.push(it.hi);
    st.houseDeck = st.houseDeck.filter(x => x !== it.hi);
    p.stats = p.stats || {};
    p.stats.housesBought = (p.stats.housesBought || 0) + 1;
    Board.syncHouses(st);
    Fx.cutin("🏠", "マイホーム購入！！");
    await wait(1100);
    Sound.play("coin");
    await UI.modal({ title: "🏠 購入！", body: `${HOUSES[it.hi].e} ${HOUSES[it.hi].n} を手に入れた！\nマップに ${p.name} の表札が立った！` });
    UI.log(`🏠 ${p.name}が${HOUSES[it.hi].n}を購入（${fmt(priceOf(it.hi))}）`);
  }

  // ゴール前のプチ精算所：資産を整理してからゴールへ
  async function preClose(p) {
    await UI.eventModal(SQUARES[p.pos], p);
    while (true) {
      const houseVal = p.houses.reduce((s, hi) => s + HOUSES[hi].p, 0);
      const stockVal = p.stocks * st.stockPrice;
      const noteDue = p.notes * repayRate(p);
      const childBonus = p.children * CHILD_BONUS * (hasJob(p, "大学教授") ? 2 : 1);
      const projected = p.money + houseVal + stockVal + childBonus - noteDue;
      const items = [];
      if (p.stocks > 0) items.push({ label: `📈 株を全部売る（+${fmt(stockVal)}）`, sell: true });
      if (p.notes > 0) items.push({ label: `🧾 手形を1枚返済（-${fmt(earlyRate(p))}・ゴール返済よりお得）`, disabled: p.money < earlyRate(p), repay: true });
      items.push({ label: "✨ 準備OK！ゴールへ向かう", close: true });
      const idx = await UI.modal({
        title: "📋 人生のたな卸し",
        body: `💰 現金 ${fmt(p.money)}\n🏠 家（基準価値）${fmt(houseVal)}　📈 株 ${fmt(stockVal)}\n👶 子供ボーナス見込み +${fmt(childBonus)}${hasJob(p, "大学教授") ? "（🎓教授で2倍）" : ""}\n🧾 手形返済予定 -${fmt(noteDue)}\n――――――――――\n予想総資産（売却ルーレット・順位ボーナスを除く）：${fmt(projected)}`,
        buttons: items.map(it => ({ label: it.label, disabled: it.disabled })),
        color: p.color,
      });
      const it = items[idx];
      if (it.close) return;
      if (it.sell) {
        gain(p, stockVal);
        p.stocks = 0;
        UI.log(`📈 ${p.name}がたな卸しで株を全売却（+${fmt(stockVal)}）`);
      }
      if (it.repay) {
        pay(p, earlyRate(p));
        p.notes--;
        UI.log(`🧾 ${p.name}がたな卸しで手形を1枚返済`);
      }
    }
  }

  async function insuranceSquare(p) {
    await UI.eventModal(SQUARES[p.pos], p);
    const opts = Object.keys(INSURANCES).filter(k => !p.insurance[k]);
    if (opts.length === 0) {
      await UI.modal({ title: "🛡️ 保険の勧誘", body: "もう両方の保険に入っている。セールスは満足して帰っていった。" });
      return;
    }
    const items = opts.map(k => ({ label: `${INSURANCES[k].e} ${INSURANCES[k].n}に入る（${fmt(INSURANCES[k].p)}）`, disabled: p.money < INSURANCES[k].p, k }));
    items.push({ label: "入らない", close: true });
    const idx = await UI.modal({
      title: "🛡️ 保険に入る？",
      body: [
        h("div", { class: "ins-icons" }, opts.map(k => Icons.el(k === "life" ? "shieldheart" : "shieldflame", 44))),
        opts.map(k => `${INSURANCES[k].e} ${INSURANCES[k].n}：${INSURANCES[k].d}`).join("\n") + `\n所持金 ${fmt(p.money)}`,
      ],
      buttons: items.map(it => ({ label: it.label, disabled: it.disabled })),
    });
    const it = items[idx];
    if (it.close) return;
    pay(p, INSURANCES[it.k].p);
    p.insurance[it.k] = true;
    UI.log(`🛡️ ${p.name}が${INSURANCES[it.k].n}に加入`);
  }

  async function stockSquare(p) {
    await UI.eventModal(SQUARES[p.pos], p);
    while (true) {
      const canBuy = Math.floor(p.money / st.stockPrice);
      const items = [];
      if (canBuy >= 1) items.push({ label: `1株買う（${fmt(st.stockPrice)}）`, buy: 1 });
      if (canBuy >= 5) items.push({ label: `5株買う（${fmt(st.stockPrice * 5)}）`, buy: 5 });
      if (p.stocks >= 1) {
        items.push({ label: `1株売る（+${fmt(st.stockPrice)}）`, sell: 1 });
        items.push({ label: `全部売る（${p.stocks}株 → +${fmt(p.stocks * st.stockPrice)}）`, sell: p.stocks });
      }
      items.push({ label: "やめる", close: true });
      const idx = await UI.modal({
        title: "📈 株式市場",
        body: `現在の株価：${fmt(st.stockPrice)}\n保有 ${p.stocks}株　所持金 ${fmt(p.money)}\n株価は毎ターン変動。大暴騰（×2）・大暴落（÷2）イベントもある！`,
        buttons: items.map(it => it.label),
      });
      const it = items[idx];
      if (it.close) return;
      if (it.buy) {
        pay(p, st.stockPrice * it.buy);
        p.stocks += it.buy;
        UI.log(`📈 ${p.name}が株を${it.buy}株購入`);
        if (hasJob(p, "ITクリエイター")) {
          p.stocks += 1;
          UI.toast("💻 ITクリエイターの本領！1株おまけ", "good");
          UI.log(`💻 ${p.name}に株1株おまけ`);
        }
      }
      if (it.sell) { p.stocks -= it.sell; gain(p, st.stockPrice * it.sell); UI.log(`📈 ${p.name}が株を${it.sell}株売却`); }
    }
  }

  // ---------- 災害系 ----------
  async function disaster(p, sq) {
    await UI.eventModal(sq, p);
    if (p.money <= 0) {
      await UI.modal({ title: "😇 セーフ？", body: "取られるお金がなかった…！" });
      return;
    }
    if (consumeOmamori(p)) { await omamoriModal(); return; }
    const lawyer = sq.scam && hasJob(p, "弁護士");
    let loss = Math.floor(p.money / (lawyer ? 4 : 2) / 1000) * 1000;
    if (sq.cap) loss = Math.min(loss, sq.cap);
    p.money -= loss;
    Sound.play("bad");
    UI.toast(`💸 ${p.name} -${fmt(loss)}`, "bad");
    await UI.modal({ title: "🌋 大損害…", body: `${lawyer ? "⚖️ 弁護士の腕で被害を4分の1に抑えた！" : "所持金が半分に！"} -${fmt(loss)}…` });
    UI.log(`🌋 ${p.name}の所持金が${lawyer ? "1/4" : "半分"}に（-${fmt(loss)}）`);
    UI.renderSidebar(st);
    if (hasJob(p, "お笑い芸人")) {
      gain(p, 500000);
      await UI.modal({ title: "🎤 この不幸、ネタになる！", body: `不幸エピソードで営業が殺到！ +${fmt(500000)}` });
      UI.log(`🎤 ${p.name}は不幸をネタに +${fmt(500000)}`);
    }
  }

  async function accident(p, sq) {
    await UI.eventModal(sq, p);
    if (hasJob(p, "医者")) {
      Sound.play("win");
      await UI.modal({ title: "🩺 医者の本領発揮！", body: "自分でサクッと治療して支払いゼロ！むしろ健康になった！" });
      UI.log(`🩺 ${p.name}は医者なのでセーフ`);
      return;
    }
    if (p.insurance.life) {
      Sound.play("win");
      await UI.modal({ title: "🛡️ 生命保険発動！", body: "保険のおかげで支払いゼロ！入っててよかった〜" });
      UI.log(`🛡️ ${p.name}は生命保険でセーフ`);
      return;
    }
    if (consumeOmamori(p)) { await omamoriModal(); return; }
    pay(p, sq.amount);
    UI.log(`🚑 ${p.name} ${sq.label} -${fmt(sq.amount)}`);
  }

  async function fireEvent(p, sq) {
    await UI.eventModal(sq, p);
    if (hasJob(p, "消防士")) {
      Sound.play("win");
      await UI.modal({ title: "🚒 消防士の本領発揮！", body: "自ら消火活動！家は無傷だ！" });
      UI.log(`🚒 ${p.name}は消防士なのでセーフ`);
      return;
    }
    if (p.insurance.fire) {
      Sound.play("win");
      await UI.modal({ title: "🧯 火災保険発動！", body: "保険のおかげで家は無事！入っててよかった〜" });
      UI.log(`🧯 ${p.name}は火災保険でセーフ`);
      return;
    }
    if (p.houses.length === 0) {
      await UI.modal({ title: "🔥 もらい火", body: "家を持っていなかったのが不幸中の幸い…被害なし！" });
      return;
    }
    if (consumeOmamori(p)) { await omamoriModal(); return; }
    const i = Math.floor(Math.random() * p.houses.length);
    const hi = p.houses[i];
    const hs = HOUSES[hi];
    p.houses.splice(i, 1);
    st.burned = st.burned || [];
    st.burned.push(hi);
    Board.syncHouses(st);
    Sound.play("bad");
    await UI.modal({ title: "🔥 全焼…", body: `${hs.e} ${hs.n} が燃えてしまった…（${fmt(hs.p)}の損失）\nマップの家も黒こげに…` });
    UI.log(`🔥 ${p.name}の${hs.n}が全焼…`);
  }

  // 住宅被害：火災保険でセーフ／家なしなら雑費のみ／家ありは修理費
  async function houseDamage(p, sq) {
    await UI.eventModal(sq, p);
    if (hasJob(p, "農家")) {
      Sound.play("win");
      await UI.modal({ title: "🌾 農家は嵐に強い！", body: "嵐には慣れっこ。自力でサッと直してしまった！" });
      UI.log(`🌾 ${p.name}は農家なのでセーフ`);
      return;
    }
    if (p.insurance.fire) {
      Sound.play("win");
      await UI.modal({ title: "🧯 火災保険発動！", body: "保険が修理費を全額カバー！入っててよかった〜" });
      UI.log(`🧯 ${p.name}は火災保険でセーフ`);
      return;
    }
    if (p.houses.length === 0) {
      pay(p, 100000);
      await UI.modal({ title: "☔ 家がなくてラッキー？", body: `家を持っていないので被害は最小限。雑費 ${fmt(-100000)} で済んだ！` });
      return;
    }
    if (consumeOmamori(p)) { await omamoriModal(); return; }
    pay(p, sq.amount);
    await UI.modal({ title: "🌪️ 修理費が痛い…", body: `家の修理費 ${fmt(-sq.amount)} を支払った…` });
    UI.log(`🌪️ ${p.name} ${sq.label} -${fmt(sq.amount)}`);
  }

  // 決闘マス：好きな相手とルーレット勝負（大きい目が勝ち）
  async function duel(p, sq) {
    await UI.eventModal(sq, p);
    const ts = st.players.filter(o => o.id !== p.id && !o.goaled);
    if (!ts.length) {
      await UI.modal({ title: "⚔️ 決闘…？", body: "勝負できる相手がもう誰もいなかった…" });
      return;
    }
    const ti = ts.length === 1 ? 0 : await UI.modal({
      title: "⚔️ 決闘！", body: `誰と勝負する？（賭け金 ${fmt(sq.stake)}）`,
      buttons: ts.map(t => t.name), color: p.color,
    });
    const t = ts[ti];
    await UI.modal({ title: "⚔️ ルーレット勝負！", body: `${p.name} VS ${t.name}！\nまずは ${p.name} がルーレットを回す！\n※これは移動ではなく勝負のルーレット！`, color: p.color });
    const a = await Roulette.spin(0, `⚔️ 決闘：${p.name}の番（移動しません）`);
    await UI.modal({ title: `${p.name}の出目は「${a}」！`, body: `続いて ${t.name} の番！`, color: t.color });
    const b = await Roulette.spin(0, `⚔️ 決闘：${t.name}の番（移動しません）`);
    if (a === b) {
      await UI.modal({ title: `引き分け！（${a} vs ${b}）`, body: "勝負あずかり！互いの健闘を称え合った" });
      UI.log(`⚔️ ${p.name} vs ${t.name} は引き分け`);
      return;
    }
    const win = a > b ? p : t, lose = a > b ? t : p;
    pay(lose, sq.stake);
    gain(win, sq.stake);
    win.stats.duelWins = (win.stats.duelWins || 0) + 1;
    win.stats.gamble = (win.stats.gamble || 0) + sq.stake;
    lose.stats.gamble = (lose.stats.gamble || 0) - sq.stake;
    Sound.play(win === p ? "fanfare" : "bad");
    await UI.modal({ title: `${win.name}の勝ち！！（${a} vs ${b}）`, body: `${lose.name}は賭け金 ${fmt(sq.stake)} を支払った…`, color: win.color });
    UI.log(`⚔️ ${p.name} vs ${t.name} → ${win.name}の勝利！（${fmt(sq.stake)}）`);
  }

  // 選択式イベント：選んだ道で結果が変わる
  async function choiceEvent(p, sq) {
    await UI.eventModal(sq, p);
    const oi = await UI.modal({ title: `❓ ${sq.label}`, body: "どうする？", buttons: sq.opts.map(o => o.b), color: p.color });
    const outs = sq.opts[oi].out;
    const total = outs.reduce((s, o) => s + o.w, 0);
    let r = Math.random() * total, out = outs[outs.length - 1];
    for (const o of outs) { r -= o.w; if (r <= 0) { out = o; break; } }
    let m = out.m, note = "";
    if (m < 0 && out.scam && hasJob(p, "弁護士")) {
      m = -Math.round(-m / 2 / 10000) * 10000;
      note = "\n⚖️ 弁護士の腕で被害半減！";
    }
    Sound.play(m > 0 ? "win" : m < 0 ? "bad" : "click");
    await UI.modal({
      title: m > 0 ? "🎉 結果は…！" : m < 0 ? "😱 結果は…" : "😌 結果は…",
      body: out.t + (m !== 0 ? `\n${m > 0 ? "+" : ""}${fmt(m)}` : "") + note,
    });
    if (m !== 0) applyMoney(p, m);
    UI.log(`❓ ${p.name} ${sq.label}：${out.t}${m ? `（${fmt(m)}）` : ""}`);
  }

  // 人生最後の大勝負：ルーレット5以上で勝ち（1〜8なので五分）
  async function finalBet(p, sq) {
    await UI.eventModal(sq, p);
    const i = await UI.modal({
      title: "🎲 人生最後の大勝負",
      body: `ルーレットで5以上なら +${fmt(sq.stake)}、4以下なら ${fmt(-sq.stake)}！（五分の大勝負）`,
      buttons: ["🔥 挑む！", "やめておく"],
    });
    if (i === 1) { UI.log(`🎲 ${p.name}は大勝負を見送った`); return; }
    const k = await Roulette.spin(0, "🎲 人生最後の大勝負（移動しません）");
    p.stats = p.stats || {};
    p.stats.gamble = (p.stats.gamble || 0) + (k >= 5 ? sq.stake : -sq.stake);
    if (k >= 5) {
      Sound.play("fanfare");
      gain(p, sq.stake);
      await UI.modal({ title: `「${k}」！勝負あり！！`, body: `大勝負に勝った！ +${fmt(sq.stake)}！！` });
      UI.log(`🎲 ${p.name}が人生最後の大勝負に勝利！ +${fmt(sq.stake)}`);
    } else {
      Sound.play("bad");
      pay(p, sq.stake);
      await UI.modal({ title: `「${k}」…無念…`, body: `大勝負に敗北… ${fmt(-sq.stake)}…` });
      UI.log(`🎲 ${p.name}は人生最後の大勝負に敗北… -${fmt(sq.stake)}`);
    }
  }

  async function layoff(p, sq) {
    await UI.eventModal(sq, p);
    if (!p.job) {
      await UI.modal({ title: "📦 会社倒産", body: "もともと無職だった…痛くも痒くもない！" });
      return;
    }
    if (hasJob(p, "公務員")) {
      Sound.play("win");
      await UI.modal({ title: "🏛️ 公務員は倒産しない！", body: "役所は潰れない。今日も定時で帰ります。" });
      UI.log(`🏛️ ${p.name}は公務員なのでセーフ`);
      return;
    }
    UI.log(`📦 ${p.name}は${p.job.n}を失った…`);
    p.job = null;
    await UI.modal({ title: "📦 無職に…", body: `職を失った…給料日はバイト代 ${fmt(SALARY_JOBLESS)} のみ。\n転職フェアで再就職しよう！` });
  }

  // ---------- ゴール・精算 ----------
  async function arriveGoal(p) {
    p.goaled = true;
    p.goalOrder = ++st.goalCount;
    Fx.cutin("👑", `${p.name} ゴール！！`);
    await wait(1100);
    Sound.play("fanfare");

    const lines = [["💰 手持ちの現金", p.money]];
    let total = p.money;
    const bonus = GOAL_BONUS[p.goalOrder - 1] || 100000;
    lines.push([`🏁 ゴールボーナス（${p.goalOrder}位）`, bonus]); total += bonus;
    if (p.children > 0) {
      const prof = hasJob(p, "大学教授");
      const cb = p.children * CHILD_BONUS * (prof ? 2 : 1);
      lines.push([`👶 子供ボーナス（${p.children}人${prof ? "・🎓教授の教育力で2倍" : ""}）`, cb]); total += cb;
    }
    p.houses.forEach(hi => {
      const hs = HOUSES[hi];
      const r = 1 + Math.floor(Math.random() * 8);
      const m = r <= 2 ? 0.5 : r <= 6 ? 1.5 : 3;
      const v = Math.round(hs.p * m / 10000) * 10000;
      lines.push([`${hs.e} ${hs.n} 売却（ルーレット${r}→×${m}）`, v]); total += v;
    });
    if (p.stocks > 0) {
      const sv = p.stocks * st.stockPrice;
      lines.push([`📈 株 ${p.stocks}株 売却`, sv]); total += sv;
    }
    p.cards.filter(c => c === "appraise").forEach(() => {
      lines.push(["🏺 鑑定団の招待状", 1000000]); total += 1000000;
    });
    if (p.notes > 0) {
      const rr = repayRate(p);
      const d = -p.notes * rr;
      lines.push([`🧾 約束手形の返済（${p.notes}枚 × ${fmt(rr)}${hasJob(p, "宇宙飛行士") ? "・🚀重力からの解放で割安" : ""}）`, d]); total += d;
    }
    p.money = total;
    p.notes = 0; p.stocks = 0; p.cards = [];
    p.houses.forEach(hi => st.houseDeck.push(hi));   // 売却した家はまた売りに出る
    p.houses = [];
    Board.syncHouses(st);
    p.settle = lines;

    Fx.confetti(70);
    const dest = endingOf(total);
    const tbl = h("table", { class: "settle" },
      lines.map(([t, v]) => h("tr", {}, h("td", {}, t), h("td", { class: v < 0 ? "neg" : "" }, fmt(v)))),
      h("tr", { class: "settle-total" }, h("td", {}, "総資産"), h("td", {}, fmt(total))),
    );
    await UI.modal({
      title: `👑 ${p.name}、${p.goalOrder}位でゴール！！`,
      body: [tbl, h("div", { class: "settle-dest" }, `${dest.e} 老後の行き先：${dest.n}`, h("div", { class: "settle-dest-d" }, dest.d))],
      color: p.color,
    });
    UI.log(`👑 ${p.name}がゴール！（${p.goalOrder}位・総資産 ${fmt(total)}）`);
    UI.renderSidebar(st);
  }

  // プレイぶりに応じた称号
  function titleOf(p, rank, n) {
    const s = p.stats || {};
    if ((s.duelWins || 0) >= 2) return "⚔️ 無敗の決闘王";
    if ((s.gamble || 0) >= 3000000) return "🎰 ギャンブルの帝王";
    if ((s.gamble || 0) <= -3000000) return "🫠 カジノの養分";
    if ((s.borrowed || 0) >= 3000000) return "🧾 手形王";
    if (p.children >= 4) return "👶 子だくさん大家族";
    if ((s.housesBought || 0) >= 3) return "🏠 不動産王";
    if ((s.jobChanges || 0) >= 3) return "💼 自分探しの達人";
    if (rank === 0) return "👑 人生の大勝者";
    if (rank === n - 1 && n > 1) return "🌅 どん底を生き抜いた人";
    return p.married ? "🏡 堅実な人生の達人" : "🎒 自由気ままな旅人";
  }

  // 結果発表：ドラムロールで下位から順に発表（クリックでスキップ）
  async function showResults() {
    clearSave();
    Bgm.play("result");
    const ranked = [...st.players].sort((a, b) => b.money - a.money);
    const medal = ["🥇", "🥈", "🥉", "4位", "5位", "6位"];
    const el = document.getElementById("result-list");
    while (el.firstChild) el.removeChild(el.firstChild);
    const rows = ranked.map((p, i) => {
      const dest = endingOf(p.money);
      const row = h("div", { class: "result-row" + (i === 0 ? " result-win" : ""), style: `border-color:${p.color}` },
        h("div", { class: "result-rank" }, medal[i]),
        h("div", { class: "result-name", style: `color:${p.color}` },
          p.name,
          h("span", { class: "result-title" }, titleOf(p, i, ranked.length)),
          h("span", { class: "result-dest" }, `${dest.e} ${dest.n}行き`),
        ),
        h("div", { class: "result-money" }, fmt(p.money)),
        h("div", { class: "result-detail" }, (p.settle || []).map(([t, v]) => `${t} ${fmt(v)}`).join("　／　")),
      );
      el.appendChild(row);
      return row;
    });
    // シミュレーション用の結果出力（tests/sim.py が回収する）
    window.__gameResult = {
      round: st.round,
      players: st.players.map(p => ({
        name: p.name, money: p.money, goalOrder: p.goalOrder,
        job: p.job ? p.job.n : null,
        eduRoute: p.chosen[9] === 10 ? "univ" : p.chosen[9] === 21 ? "work" : null,
        midRoute: p.chosen[58] === 59 ? "stable" : p.chosen[58] === 66 ? "gamble" : null,
        careerRoute: p.chosen[86] === 98 ? "career" : p.chosen[86] === 87 ? "stay" : null,
        jobLevel: p.jobLevel || 0,
        children: p.children, married: p.married,
        borrowed: (p.stats || {}).borrowed || 0,
        gamble: (p.stats || {}).gamble || 0,
        housesBought: (p.stats || {}).housesBought || 0,
      })),
    };

    UI.showScreen("result");
    let skip = false;
    document.getElementById("screen-result").onclick = () => { skip = true; };
    for (let i = rows.length - 1; i >= 0; i--) {
      if (!skip) await wait(i === 0 ? 1300 : 850);
      Sound.play(i === 0 ? "fanfare" : "drum");
      rows[i].classList.add("revealed");
      if (i === 0) Fx.confetti(120);
    }
  }

  // ---------- 株価変動・セーブ ----------
  function driftStock() {
    const f = 0.85 + Math.random() * 0.3;
    st.stockPrice = Math.max(STOCK.min, Math.min(STOCK.max, Math.round(st.stockPrice * f / 1000) * 1000));
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { /* file://等で失敗しても無視 */ }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }
  // セーブの最小構造を検証（マス構成変更後の旧セーブによる破損・進行不能を防ぐ）
  function validSave(s) {
    return !!s && Array.isArray(s.players) && s.players.length >= 2
      && Array.isArray(s.layout) && s.layout.length === SQUARES.length
      && s.players.every(p => Number.isInteger(p.pos) && p.pos >= 0 && p.pos < SQUARES.length);
  }
  function hasSave() {
    try { return validSave(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch (e) { return false; }
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { s = null; }
    if (!validSave(s)) { clearSave(); UI.showScreen("title"); return; }
    st = s;
    st.burned = st.burned || [];
    st.players.forEach(p => {
      p.notes = p.notes || 0;
      p.jobLevel = p.jobLevel || (p.job ? 1 : 0);
      p.stats = p.stats || { gamble: 0, borrowed: 0, housesBought: 0, jobChanges: 0, duelWins: 0 };
    });
    applyBoardLayout(st.layout);   // セーブされたマス配置を復元
    startUI();
    UI.log("📂 セーブデータから再開");
    loop();
  }

  return {
    newGame, load, hasSave, clearSave, gain, pay,
    positions: () => { if (!st) return []; const a = []; st.players.forEach(p => { a[p.id] = p.pos; }); return a; },   // テスト用：論理位置をプレイヤーid順で（コマのDOM順と一致させる）
  };
})();
