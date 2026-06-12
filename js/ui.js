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
  function evAmount(sq) {
    let a = null, note = "";
    if (sq.t === "money") a = sq.amount;
    else if (sq.t === "accident") { a = -sq.amount; note = "（生命保険があればセーフ）"; }
    else if (sq.t === "housedmg") { a = -sq.amount; note = "（火災保険でセーフ／家なしなら-¥100,000）"; }
    else if (sq.t === "gift") { a = sq.amount; note = "× ほかの全員からもらう！"; }
    else if (sq.t === "finalbet") { a = sq.stake; note = "を賭けた大勝負！"; }
    if (a == null) return null;
    return h("div", { class: "ev-amt " + (a > 0 ? "plus" : "minus") },
      (a > 0 ? "+" : "") + fmt(a),
      note ? h("span", { class: "ev-amt-note" }, note) : null,
    );
  }

  function eventModal(sq, p, extra) {
    Sound.play("land");
    const body = [h("div", { class: "ev-text" }, sq.text)];
    const amt = evAmount(sq);
    if (amt) body.push(amt);
    if (extra) body.push(h("div", { class: "ev-note" }, extra));
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
        h("div", {}, `${p.job ? p.job.e + " " + p.job.n : "👤 無職"}${p.married ? "　💍" : ""}${p.children ? "　👶×" + p.children : ""}${p.cards.length ? "　🃏×" + p.cards.length : ""}`),
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

  function renderSidebarNow(st) {
    const wrap = $("#player-panels");
    clear(wrap);
    st.players.forEach((p, i) => {
      const icons1 = `${p.married ? "💍" : ""}${"👶".repeat(p.children)}`;
      const icons2 = `${p.houses.map(hi => HOUSES[hi].e).join("")}${p.stocks ? ` 📈${p.stocks}株` : ""}${p.insurance.life ? " 🛡️" : ""}${p.insurance.fire ? " 🧯" : ""}${p.cards.length ? ` 🃏${p.cards.length}` : ""}`;
      wrap.appendChild(h("div", {
        class: "pp" + (i === st.cur ? " pp-cur" : "") + (p.goaled ? " pp-goal" : ""),
        style: `border-color:${p.color}`,
      },
        h("div", { class: "pp-head" },
          h("span", { class: "pp-dot", style: `background:${p.color}` }, p.id + 1),
          h("span", { class: "pp-name" }, p.name),
          p.goaled ? h("span", { class: "pp-badge" }, `🏁 ${p.goalOrder}位`) : null,
        ),
        h("div", { class: "pp-moneyrow" },
          h("div", { class: "pp-money" }, fmt(p.money)),
          h("div", { class: "pp-bills" },
            Array.from({ length: p.money > 0 ? Math.min(9, 1 + Math.floor(p.money / 1500000)) : 0 },
              (_, i) => h("div", { class: "pp-bill", style: `background:${["#4a90d9", "#4cb86b", "#e8a514"][i % 3]}` })),
          ),
        ),
        p.notes ? h("div", { class: "pp-debt" }, `🧾 約束手形×${p.notes}（ゴール返済 ${fmt(p.notes * NOTE_REPAY)}）`) : null,
        h("div", { class: "pp-line" }, `${p.job ? p.job.e + p.job.n : "無職"}　${icons1}`),
        icons2.trim() ? h("div", { class: "pp-line" }, icons2) : null,
      ));
    });
    $("#stock-ticker").textContent = `📈 現在の株価 ${fmt(st.stockPrice)}`;
  }

  return { showScreen, modal, eventModal, handoff, preroll, toast, log, renderHeader, renderSidebar };
})();
