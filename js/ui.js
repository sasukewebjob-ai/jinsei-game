// 汎用UI：DOMビルダー / モーダル(Promise) / 手番交代 / サイドバー / ログ / トースト

// 小さなDOMビルダー。文字列の子要素はテキストノードになる（自動エスケープ）
function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === "class") el.className = attrs[k];
    else if (k === "style") el.style.cssText = attrs[k];
    else if (k.startsWith("on")) el[k] = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  children.flat(9).forEach(c => {
    if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  });
  return el;
}

const UI = (() => {
  const $ = s => document.querySelector(s);
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function showScreen(name) {
    ["title", "setup", "game", "result"].forEach(n => {
      document.getElementById("screen-" + n).hidden = (n !== name);
    });
    const peek = document.getElementById("btn-map-peek");
    if (peek) peek.hidden = (name !== "game");
    const hud = document.getElementById("money-hud");
    if (hud && name !== "game") hud.hidden = true;
    if (name !== "game") document.body.classList.remove("map-peek");
    document.body.classList.remove("drawer-open");
  }

  // title/body: 文字列 / Node / その配列。文字列内の改行はそのまま表示される（CSSのpre-line）
  // buttons: 文字列 or {label, disabled} の配列。押されたボタンのindexでresolve
  function modal({ title = "", body = "", buttons = ["OK"], color = "" }) {
    return new Promise(res => {
      const ov = $("#overlay-modal");
      const bd = $("#modal-body"), bb = $("#modal-buttons");
      const tl = $("#modal-title");
      clear(tl);
      (Array.isArray(title) ? title : [title]).forEach(c => {
        if (c != null) tl.append(c.nodeType ? c : String(c));
      });
      clear(bd);
      (Array.isArray(body) ? body : [body]).forEach(c => {
        if (c != null) bd.append(c.nodeType ? c : String(c));
      });
      clear(bb);
      buttons.forEach((b, i) => {
        const def = typeof b === "string" ? { label: b } : b;
        const btn = h("button", { class: "btn" + (i === 0 ? " btn-primary" : "") }, def.label);
        btn.disabled = !!def.disabled;
        btn.onclick = () => { Sound.play("click"); ov.hidden = true; res(i); };
        bb.appendChild(btn);
      });
      const box = $("#modal-box");
      box.style.borderColor = color || "#5b4636";
      box.classList.remove("modal-pop");
      void box.offsetWidth;            // アニメ再トリガー
      box.classList.add("modal-pop");
      ov.hidden = false;
    });
  }

  // マスに止まったときのイベント表示（増減額を大きく表示）
  // override（数値）が渡されたら実際に適用した増減額を優先表示する
  function evAmount(sq, override) {
    let a = null, note = "";
    if (override !== undefined) {
      a = override;
      if (sq.t === "accident") note = "（生命保険があればセーフ）";
      else if (sq.t === "housedmg") note = "（火災保険でセーフ／家なしなら-¥100,000）";
      else if (sq.t === "gift") note = "× ほかの全員からもらう！";
    } else if (sq.t === "money") a = sq.amount;
    else if (sq.t === "accident") { a = -sq.amount; note = "（生命保険があればセーフ）"; }
    else if (sq.t === "housedmg") { a = -sq.amount; note = "（火災保険でセーフ／家なしなら-¥100,000）"; }
    else if (sq.t === "gift") { a = sq.amount; note = "× ほかの全員からもらう！"; }
    else if (sq.t === "finalbet") { a = sq.stake; note = "を賭けた大勝負！"; }
    if (a == null || a === 0) return null;
    return h("div", { class: "ev-amt " + (a > 0 ? "plus" : "minus") },
      (a > 0 ? "+" : "") + fmt(a),
      note ? h("span", { class: "ev-amt-note" }, note) : null,
    );
  }

  // delta を明示で渡すと「実際の増減額＋結果の総額」を表示する（金額が確定済みのとき用）
  function eventModal(sq, p, extra, delta) {
    Sound.play("land");
    const body = [h("div", { class: "ev-text" }, sq.text)];
    const amt = evAmount(sq, delta);
    if (amt) body.push(amt);
    if (extra) body.push(h("div", { class: "ev-note" }, extra));
    if (p && delta !== undefined) {
      body.push(h("div", { class: "ev-total" },
        "所持金 → ", h("b", {}, fmt(p.money)),
        p.notes ? h("span", { class: "ev-total-note" }, `　🧾手形×${p.notes}`) : null,
      ));
    }
    return modal({
      title: [Icons.el(Icons.squareKey(sq), 30), " " + sq.label],
      body,
      color: p ? p.color : "",
    });
  }

  // 手番交代画面（パス＆プレイ用）
  function handoff(p) {
    return new Promise(res => {
      const ov = $("#overlay-handoff");
      const nm = $("#handoff-name");
      nm.textContent = `${p.name} の番`;
      nm.style.color = p.color;
      const info = $("#handoff-info");
      clear(info);
      info.append(
        h("div", {}, `💰 所持金 ${fmt(p.money)}${p.notes ? `　🧾 手形×${p.notes}` : ""}`),
        h("div", {}, `${p.job ? p.job.e + " " + p.job.n + "★".repeat(Math.max(0, (p.jobLevel || 1) - 1)) : "👤 無職"}${p.married ? "　💍" : ""}${p.children ? "　👶×" + p.children : ""}`),
        p.cards.length
          ? h("div", { class: "handoff-cards" }, `🃏 手札：${p.cards.map(c => CARD_DEFS[c].e + CARD_DEFS[c].n).join("、")}`)
          : h("div", { class: "handoff-cards handoff-cards-empty" }, "🃏 手札：なし"),
      );
      $("#btn-handoff-go").onclick = () => { Sound.play("click"); ov.hidden = true; res(); };
      ov.hidden = false;
    });
  }

  // ルーレット前の行動選択（回す or カード・資産）
  function preroll() {
    return new Promise(res => {
      const bar = $("#action-bar");
      bar.hidden = false;
      $("#btn-spin").onclick = () => { Sound.play("click"); bar.hidden = true; res("spin"); };
      $("#btn-assets").onclick = () => { Sound.play("click"); bar.hidden = true; res("assets"); };
    });
  }

  // 移動バナー：出目と残り歩数を常時表示（停止理由も明示）
  let bannerTimer = null;
  function moveBanner(text, holdMs) {
    const elB = $("#move-banner");
    if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
    if (text != null) {
      elB.textContent = text;
      elB.hidden = false;
      if (holdMs) bannerTimer = setTimeout(() => { elB.hidden = true; }, holdMs);
    } else {
      bannerTimer = setTimeout(() => { elB.hidden = true; }, holdMs || 0);
    }
  }

  function toast(text, type = "") {
    const area = $("#toast-area");
    const t = h("div", { class: "toast " + type }, text);
    area.appendChild(t);
    setTimeout(() => { t.classList.add("toast-out"); setTimeout(() => t.remove(), 400); }, 2200);
  }

  function log(text) {
    const list = $("#log-list");
    list.prepend(h("div", { class: "log-item" }, text));
    while (list.childNodes.length > 100) list.lastChild.remove();
  }

  function renderHeader(st, p) {
    const el = $("#header-turn");
    clear(el);
    el.append(
      `ラウンド${st.round}　`,
      h("span", { class: "turn-dot", style: `background:${p.color}` }),
      ` ${p.name}の番`,
    );
  }

  // 連発される再描画を1フレーム1回に集約（ちらつき防止）
  let sbPending = false, sbState = null;
  function renderSidebar(st) {
    sbState = st;
    if (sbPending) return;
    sbPending = true;
    requestAnimationFrame(() => {
      sbPending = false;
      renderSidebarNow(sbState);
    });
  }

  // パネルを一度だけ作り、以降は値だけ差分更新する（毎回全消去→全再生成によるちらつきを防止）
  const BILL_COLORS = ["#4a90d9", "#4cb86b", "#e8a514"];
  let ppCache = null;
  function buildPanel(p) {
    const dot = h("span", { class: "pp-dot" });
    const name = h("span", { class: "pp-name" });
    const rank = h("span", { class: "pp-rank" });
    const badge = h("span", { class: "pp-badge" });
    const money = h("div", { class: "pp-money" });
    const bills = h("div", { class: "pp-bills" });
    const debt = h("div", { class: "pp-debt" });
    const line1 = h("div", { class: "pp-line" });
    const line2 = h("div", { class: "pp-line" });
    const el = h("div", { class: "pp" },
      h("div", { class: "pp-head" }, dot, name, rank, badge),
      h("div", { class: "pp-moneyrow" }, money, bills),
      debt, line1, line2,
    );
    return { el, dot, name, rank, badge, money, bills, billCount: -1, debt, line1, line2 };
  }
  function updatePanel(row, p, st, i, rank) {
    row.el.className = "pp" + (i === st.cur ? " pp-cur" : "") + (p.goaled ? " pp-goal" : "");
    row.el.style.borderColor = p.color;
    row.dot.textContent = p.id + 1;
    row.dot.style.background = p.color;
    row.name.textContent = p.name;
    row.rank.textContent = (!p.goaled && rank) ? `💰${rank}位` : "";
    row.rank.hidden = p.goaled || !rank;
    row.rank.className = "pp-rank" + (rank === 1 ? " pp-rank-top" : "");
    row.badge.textContent = p.goaled ? `🏁 ${p.goalOrder}位` : "";
    row.badge.hidden = !p.goaled;
    row.money.textContent = fmt(p.money);
    const bc = p.money > 0 ? Math.min(9, 1 + Math.floor(p.money / 1500000)) : 0;
    if (bc !== row.billCount) {
      row.billCount = bc;
      clear(row.bills);
      for (let k = 0; k < bc; k++) row.bills.appendChild(h("div", { class: "pp-bill", style: `background:${BILL_COLORS[k % 3]}` }));
    }
    const repay = p.job && p.job.n === "宇宙飛行士" ? NOTE_VALUE : NOTE_REPAY;
    row.debt.textContent = p.notes ? `🧾 約束手形×${p.notes}（ゴール返済 ${fmt(p.notes * repay)}）` : "";
    row.debt.hidden = !p.notes;
    const stars = "★".repeat(Math.max(0, (p.jobLevel || 1) - 1));
    row.line1.textContent = `${p.job ? p.job.e + p.job.n + stars : "無職"}　${p.married ? "💍" : ""}${"👶".repeat(p.children)}`;
    const icons2 = `${p.houses.map(hi => HOUSES[hi].e).join("")}${p.stocks ? ` 📈${p.stocks}株` : ""}${p.insurance.life ? " 🛡️" : ""}${p.insurance.fire ? " 🧯" : ""}${p.cards.length ? ` 🃏${p.cards.length}` : ""}`.trim();
    row.line2.textContent = icons2;
    row.line2.hidden = !icons2;
  }
  function renderSidebarNow(st) {
    const wrap = $("#player-panels");
    if (!ppCache || ppCache.count !== st.players.length) {
      clear(wrap);
      ppCache = { count: st.players.length, rows: st.players.map(p => { const r = buildPanel(p); wrap.appendChild(r.el); return r; }) };
    }
    // 見た目の資産（現金−手形・家/株を除く）で順位付け
    const va = p => p.money - p.notes * (p.job && p.job.n === "宇宙飛行士" ? NOTE_VALUE : NOTE_REPAY);
    const ranked = [...st.players].sort((a, b) => va(b) - va(a));
    const rankOf = {};
    ranked.forEach((p, idx) => { rankOf[p.id] = idx + 1; });
    st.players.forEach((p, i) => updatePanel(ppCache.rows[i], p, st, i, rankOf[p.id]));
    $("#stock-ticker").textContent = `📈 現在の株価 ${fmt(st.stockPrice)}`;
    renderHud(st);
  }

  // 盤面に常時表示する所持金HUD（ドロワーを開かなくても現手番の総額が見える）
  function renderHud(st) {
    const el = $("#money-hud");
    if (!el) return;
    const p = st && st.players && st.players[st.cur];
    if (!p) { el.hidden = true; return; }
    clear(el);
    const stars = "★".repeat(Math.max(0, (p.jobLevel || 1) - 1));
    const parts = [
      h("span", { class: "mh-dot", style: `background:${p.color}` }, p.id + 1),
      h("span", { class: "mh-name" }, p.name),
      h("span", { class: "mh-money" }, fmt(p.money)),
    ];
    if (p.notes) parts.push(h("span", { class: "mh-note" }, `🧾×${p.notes}`));
    if (p.job) parts.push(h("span", { class: "mh-job" }, p.job.e + stars));
    el.append(...parts);
    el.hidden = false;
  }

  return { showScreen, modal, eventModal, handoff, preroll, toast, log, renderHeader, renderSidebar, moveBanner };
})();
