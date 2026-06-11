// ゲーム本体：ターン進行のステートマシン・マス効果の解決・精算・セーブ

const Game = (() => {
  const SAVE_KEY = "jinsei-game-save-v1";
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
    UI.renderSidebar(st);
  }

  function pay(p, a) {
    if (p.money < a) {
      const borrow = Math.ceil((a - p.money) / 100000) * 100000;
      p.debt += borrow;
      p.money += borrow;
      UI.toast(`🏦 ${p.name} ${fmt(borrow)}を借金…`, "bad");
      UI.log(`🏦 ${p.name}が${fmt(borrow)}の借金をした（ゴール時に1.5倍返済）`);
    }
    p.money -= a;
    Sound.play("pay");
    UI.toast(`💸 ${p.name} -${fmt(a)}`, "bad");
    UI.renderSidebar(st);
  }

  function applyMoney(p, amount) {
    if (amount >= 0) gain(p, amount); else pay(p, -amount);
  }

  function paySalary(p) {
    const a = p.job ? p.job.s : SALARY_JOBLESS;
    gain(p, a);
    UI.log(`💴 ${p.name}の給料日 +${fmt(a)}${p.job ? "" : "（無職なのでバイト代）"}`);
  }

  // ---------- ゲーム開始 ----------
  function newGame(defs) {
    const deck = [];
    Object.keys(CARD_DEFS).forEach(id => deck.push(id, id));   // 各2枚
    st = {
      players: defs.map((d, i) => createPlayer(i, d.name, d.color)),
      cur: 0, round: 1, goalCount: 0,
      stockPrice: STOCK.start,
      deck: shuffle(deck), discard: [],
      houseDeck: shuffle(HOUSES.map((_, i) => i)),
    };
    startUI();
    UI.log("🏁 ゲームスタート！波乱万丈の人生へ！");
    loop();
  }

  function startUI() {
    UI.showScreen("game");
    Board.build(st);
    UI.renderSidebar(st);
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

    let n;
    if (p.forceTen) {
      p.forceTen = false;
      n = await Roulette.spin(10);
      UI.log(`🚀 ${p.name}のターボチケット発動！出目は10！`);
    } else {
      n = await Roulette.spin();
      UI.log(`🎡 ${p.name}：${n}が出た`);
    }

    const res = await moveSteps(p, n, 0);
    if (res === "goal") return;
    await resolveSquare(p, SQUARES[p.pos], 0);
  }

  // ---------- 移動 ----------
  async function moveSteps(p, n, depth) {
    for (let i = 0; i < n; i++) {
      const cur = SQUARES[p.pos];
      if (cur.t === "goal") break;
      const nid = await chooseNext(p, cur);
      await Board.stepToken(p, nid);
      p.pos = nid;
      p.path.push(nid);
      const sq = SQUARES[nid];
      if (sq.t === "goal") { await arriveGoal(p); return "goal"; }
      if (i < n - 1) {
        if (sq.pass) await passEffect(p, sq);
        if (sq.stop) { UI.toast("✋ 止まるマス！", "info"); break; }
      }
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

      case "money":
        await UI.eventModal(sq, p);
        applyMoney(p, sq.amount);
        UI.log(`${squareIcon(sq)} ${p.name} ${sq.label} ${fmt(sq.amount)}`);
        break;

      case "payday":
        await UI.eventModal(sq, p);
        paySalary(p);
        break;

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

      case "job":       await jobSquare(p, sq.pool); break;
      case "jobchange": await jobChange(p); break;
      case "marriage":  await marriage(p); break;
      case "child":     await childBirth(p, sq.count); break;
      case "house":     await houseSquare(p); break;
      case "insurance": await insuranceSquare(p); break;
      case "stock":     await stockSquare(p); break;

      case "casino":
        await UI.eventModal(sq, p);
        if (sq.kind === "highlow") await Casino.highLow(p);
        else await Casino.pickRoulette(p);
        break;

      case "lottery":
        await UI.eventModal(sq, p);
        await Casino.lottery(p);
        break;

      case "disaster": await disaster(p, sq); break;
      case "accident": await accident(p, sq); break;
      case "fire":     await fireEvent(p, sq); break;
      case "layoff":   await layoff(p, sq); break;

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
      body: h("div", { class: "card-show" },
        h("div", { class: "card-emoji" }, c.e),
        h("div", { class: "card-name" }, c.n),
        h("div", { class: "card-desc" }, c.d + (c.passive ? "（自動発動）" : "")),
      ),
    });
    UI.log(`🃏 ${p.name}は「${c.n}」を手に入れた`);
  }

  function canUseCard(p, cid) {
    if (CARD_DEFS[cid].passive) return false;
    if (cid === "debthalf") return p.debt > 0;
    if (cid === "comeback") return st.players.every(o => o.id === p.id || estimateAssets(st, o) >= estimateAssets(st, p));
    if (cid === "sabotage") return st.players.some(o => o.id !== p.id && !o.goaled);
    return true;
  }

  async function useCard(p, i) {
    const cid = p.cards[i];
    const c = CARD_DEFS[cid];
    let used = true;
    switch (cid) {
      case "turbo":
        p.forceTen = true;
        await UI.modal({ title: "🚀 ターボチケット", body: "次のルーレットは必ず10！ぶっ飛ばせ！" });
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
        const a = p.job ? p.job.s : 200000;
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
        const before = p.debt;
        p.debt = Math.floor(p.debt / 2 / 10000) * 10000;
        await UI.modal({ title: "📃 借金半額の証文", body: `借金 ${fmt(before)} → ${fmt(p.debt)} に！` });
        UI.renderSidebar(st);
        break;
      }
      case "comeback":
        gain(p, 2000000);
        await UI.modal({ title: "🃏 逆転の切り札", body: `どん底からの +${fmt(2000000)}！！まだ終わらんよ！` });
        break;
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
      items.push({ label: "閉じる", close: true });
      const idx = await UI.modal({
        title: `🎒 ${p.name}のカード・資産`,
        body: `所持金 ${fmt(p.money)}${p.debt ? `　借金 ${fmt(p.debt)}` : ""}　株価 ${fmt(st.stockPrice)}\n` +
              (p.cards.length ? "使うカードを選んでね（灰色＝自動発動か条件未達成）" : "お宝カードは持っていない"),
        buttons: items.map(it => ({ label: it.label, disabled: it.disabled })),
        color: p.color,
      });
      const it = items[idx];
      if (it.close) return;
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
        h("div", { class: "jc-e" }, j.e),
        h("div", { class: "jc-n" }, j.n),
        h("div", { class: "jc-s" }, `給料 ${fmt(j.s)}`),
        h("div", { class: "jc-d" }, j.d),
      )));
  }

  async function jobSquare(p, pool) {
    await UI.eventModal(SQUARES[p.pos], p);
    const list = pool === "pro" ? JOBS_PRO : JOBS_NORMAL;
    const offers = pickN(list, 3);
    const idx = await UI.modal({
      title: pool === "pro" ? "💼 就職活動（エリート編）" : "💼 就職！",
      body: [jobCardsView(offers), h("p", { class: "small" }, "給料日マスを通るたびに給料がもらえる！")],
      buttons: offers.map(j => `${j.e} ${j.n}にする`),
    });
    p.job = offers[idx];
    Sound.play("win");
    UI.log(`💼 ${p.name}は${p.job.n}になった（給料 ${fmt(p.job.s)}）`);
  }

  async function jobChange(p) {
    await UI.eventModal(SQUARES[p.pos], p);
    const offers = pickN([...JOBS_NORMAL, ...JOBS_PRO], 3);
    const buttons = offers.map(j => `${j.e} ${j.n}（給料 ${fmt(j.s)}）`);
    buttons.push(p.job ? `今のまま（${p.job.n}）` : "やっぱりやめる");
    const idx = await UI.modal({ title: "💼 転職フェア", body: jobCardsView(offers), buttons });
    if (idx === offers.length) return;
    p.job = offers[idx];
    Sound.play("win");
    UI.log(`💼 ${p.name}は${p.job.n}に転職！（給料 ${fmt(p.job.s)}）`);
  }

  async function marriage(p) {
    if (p.married) {
      await UI.modal({ title: "💍 結婚記念日", body: "今日は結婚記念日！しあわせのお祝い金 +¥100,000" });
      gain(p, 100000);
      return;
    }
    p.married = true;
    Sound.play("fanfare");
    const others = st.players.filter(o => o.id !== p.id && !o.goaled);
    others.forEach(o => pay(o, MARRIAGE_GIFT));
    const total = MARRIAGE_GIFT * others.length;
    if (total > 0) gain(p, total);
    await UI.modal({
      title: "💍 結婚！！おめでとう！！",
      body: `運命の人と結ばれた！\n全員からご祝儀 ${fmt(MARRIAGE_GIFT)} ずつ、合計 ${fmt(total)} もらった！`,
      color: p.color,
    });
    UI.log(`💍 ${p.name}が結婚！ご祝儀 +${fmt(total)}`);
  }

  async function childBirth(p, count) {
    p.children += count;
    Sound.play("win");
    await UI.modal({
      title: count > 1 ? "👶👶 双子誕生！？" : "👶 赤ちゃん誕生！",
      body: `家族が${count}人増えた！（ゴール時に1人につき ${fmt(CHILD_BONUS)}）\n現在の子供：${"👶".repeat(p.children)}`,
      color: p.color,
    });
    UI.log(`👶 ${p.name}に子供が${count}人誕生（計${p.children}人）`);
  }

  async function houseSquare(p) {
    await UI.eventModal(SQUARES[p.pos], p);
    const offers = st.houseDeck.slice(0, 3);
    if (offers.length === 0) {
      await UI.modal({ title: "🏠 完売御礼", body: "もう売り物件がない…" });
      return;
    }
    const items = offers.map(hi => ({ label: `${HOUSES[hi].e} ${HOUSES[hi].n}（${fmt(HOUSES[hi].p)}）`, disabled: p.money < HOUSES[hi].p, hi }));
    items.push({ label: "買わない", close: true });
    const idx = await UI.modal({
      title: "🏠 どの家を買う？",
      body: `所持金 ${fmt(p.money)}\n家はゴール時の売却ルーレットで ×0.5〜×3 になる！（1〜3:×0.5／4〜7:×1.5／8〜10:×3）`,
      buttons: items.map(it => ({ label: it.label, disabled: it.disabled })),
    });
    const it = items[idx];
    if (it.close) return;
    pay(p, HOUSES[it.hi].p);
    p.houses.push(it.hi);
    st.houseDeck = st.houseDeck.filter(x => x !== it.hi);
    Sound.play("coin");
    await UI.modal({ title: "🏠 購入！", body: `${HOUSES[it.hi].e} ${HOUSES[it.hi].n} を手に入れた！` });
    UI.log(`🏠 ${p.name}が${HOUSES[it.hi].n}を購入（${fmt(HOUSES[it.hi].p)}）`);
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
      body: opts.map(k => `${INSURANCES[k].e} ${INSURANCES[k].n}：${INSURANCES[k].d}`).join("\n") + `\n所持金 ${fmt(p.money)}`,
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
      if (it.buy) { pay(p, st.stockPrice * it.buy); p.stocks += it.buy; UI.log(`📈 ${p.name}が株を${it.buy}株購入`); }
      if (it.sell) { p.stocks -= it.sell; gain(p, st.stockPrice * it.sell); UI.log(`📈 ${p.name}が株を${it.sell}株売却`); }
    }
  }

  // ---------- 災害系 ----------
  async function disaster(p, sq) {
    await UI.eventModal(sq, p);
    if (consumeOmamori(p)) { await omamoriModal(); return; }
    if (p.money <= 0) {
      await UI.modal({ title: "😇 セーフ？", body: "取られるお金がなかった…！" });
      return;
    }
    const loss = Math.floor(p.money / 2 / 1000) * 1000;
    p.money -= loss;
    Sound.play("bad");
    UI.toast(`💸 ${p.name} -${fmt(loss)}`, "bad");
    await UI.modal({ title: "🌋 大損害…", body: `所持金が半分に！ -${fmt(loss)}…` });
    UI.log(`🌋 ${p.name}の所持金が半分に（-${fmt(loss)}）`);
    UI.renderSidebar(st);
  }

  async function accident(p, sq) {
    await UI.eventModal(sq, p);
    if (consumeOmamori(p)) { await omamoriModal(); return; }
    if (p.insurance.life) {
      Sound.play("win");
      await UI.modal({ title: "🛡️ 生命保険発動！", body: "保険のおかげで支払いゼロ！入っててよかった〜" });
      UI.log(`🛡️ ${p.name}は生命保険でセーフ`);
      return;
    }
    pay(p, sq.amount);
    UI.log(`🚑 ${p.name} ${sq.label} -${fmt(sq.amount)}`);
  }

  async function fireEvent(p, sq) {
    await UI.eventModal(sq, p);
    if (consumeOmamori(p)) { await omamoriModal(); return; }
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
    const i = Math.floor(Math.random() * p.houses.length);
    const hs = HOUSES[p.houses[i]];
    p.houses.splice(i, 1);
    Sound.play("bad");
    await UI.modal({ title: "🔥 全焼…", body: `${hs.e} ${hs.n} が燃えてしまった…（${fmt(hs.p)}の損失）` });
    UI.log(`🔥 ${p.name}の${hs.n}が全焼…`);
  }

  async function layoff(p, sq) {
    await UI.eventModal(sq, p);
    if (!p.job) {
      await UI.modal({ title: "📦 会社倒産", body: "もともと無職だった…痛くも痒くもない！" });
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
    Sound.play("fanfare");

    const lines = [["💰 手持ちの現金", p.money]];
    let total = p.money;
    const bonus = GOAL_BONUS[p.goalOrder - 1] || 100000;
    lines.push([`🏁 ゴールボーナス（${p.goalOrder}位）`, bonus]); total += bonus;
    if (p.children > 0) {
      const cb = p.children * CHILD_BONUS;
      lines.push([`👶 子供ボーナス（${p.children}人）`, cb]); total += cb;
    }
    p.houses.forEach(hi => {
      const hs = HOUSES[hi];
      const r = 1 + Math.floor(Math.random() * 10);
      const m = r <= 3 ? 0.5 : r <= 7 ? 1.5 : 3;
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
    if (p.debt > 0) {
      const d = -Math.floor(p.debt * 1.5);
      lines.push([`🏦 借金返済（${fmt(p.debt)}×1.5）`, d]); total += d;
    }
    p.money = total;
    p.debt = 0; p.stocks = 0; p.houses = []; p.cards = [];
    p.settle = lines;

    const tbl = h("table", { class: "settle" },
      lines.map(([t, v]) => h("tr", {}, h("td", {}, t), h("td", { class: v < 0 ? "neg" : "" }, fmt(v)))),
      h("tr", { class: "settle-total" }, h("td", {}, "総資産"), h("td", {}, fmt(total))),
    );
    await UI.modal({ title: `👑 ${p.name}、${p.goalOrder}位でゴール！！`, body: tbl, color: p.color });
    UI.log(`👑 ${p.name}がゴール！（${p.goalOrder}位・総資産 ${fmt(total)}）`);
    UI.renderSidebar(st);
  }

  function showResults() {
    clearSave();
    const ranked = [...st.players].sort((a, b) => b.money - a.money);
    const medal = ["🥇", "🥈", "🥉", "4位", "5位", "6位"];
    const el = document.getElementById("result-list");
    while (el.firstChild) el.removeChild(el.firstChild);
    ranked.forEach((p, i) => {
      el.appendChild(h("div", { class: "result-row" + (i === 0 ? " result-win" : ""), style: `border-color:${p.color}` },
        h("div", { class: "result-rank" }, medal[i]),
        h("div", { class: "result-name", style: `color:${p.color}` }, p.name),
        h("div", { class: "result-money" }, fmt(p.money)),
        h("div", { class: "result-detail" }, (p.settle || []).map(([t, v]) => `${t} ${fmt(v)}`).join("　／　")),
      ));
    });
    UI.showScreen("result");
    Sound.play("fanfare");
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
  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }
  function load() {
    try { st = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { st = null; }
    if (!st) return;
    startUI();
    UI.log("📂 セーブデータから再開");
    loop();
  }

  return { newGame, load, hasSave, clearSave, gain, pay };
})();
