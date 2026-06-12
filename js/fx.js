// 画面エフェクト：コイン飛散・紙吹雪（HTMLオーバーレイ、DOM APIのみ）

const Fx = (() => {
  // pos（画面座標）からコインが弾け飛ぶ。good=false なら下に落ちる灰コイン
  function coins(pos, good = true, n = 10) {
    if (!pos) pos = { x: innerWidth / 2, y: innerHeight / 2 };
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      c.className = "fx-coin" + (good ? "" : " fx-coin-bad");
      c.style.left = pos.x + "px";
      c.style.top = pos.y + "px";
      const dx = (Math.random() - .5) * 170;
      const dy = good ? -(60 + Math.random() * 130) : (50 + Math.random() * 110);
      c.style.setProperty("--dx", dx + "px");
      c.style.setProperty("--dy", dy + "px");
      c.style.animationDelay = (Math.random() * .12) + "s";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1300);
    }
  }

  // 紙吹雪
  function confetti(count = 100) {
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#ffd23e", "#f06a9a"];
    for (let i = 0; i < count; i++) {
      const c = document.createElement("div");
      c.className = "fx-confetti" + (i % 2 ? " fx-confetti-b" : "");
      c.style.left = (Math.random() * 100) + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (2.4 + Math.random() * 2.2) + "s";
      c.style.animationDelay = (Math.random() * .9) + "s";
      c.style.width = (7 + Math.random() * 7) + "px";
      c.style.height = (12 + Math.random() * 8) + "px";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 6000);
    }
  }

  // 銀行バッジの画面位置（紙幣の飛び先/飛び元）
  function bankPos() {
    const e = document.getElementById("bank-badge");
    if (!e) return { x: innerWidth - 160, y: 80 };
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // 紙幣が from → to へ飛ぶ（金額を金種に分解して最大10枚）
  const BILL_KINDS = [
    { v: 10000000, c: "#c2548c" },
    { v: 5000000,  c: "#9b59b6" },
    { v: 1000000,  c: "#e8a514" },
    { v: 500000,   c: "#4cb86b" },
    { v: 100000,   c: "#4a90d9" },
  ];
  function bills(from, to, amount) {
    if (!from || !to) return;
    const notes = [];
    let rest = Math.abs(amount);
    for (const b of BILL_KINDS) {
      while (rest >= b.v && notes.length < 10) { notes.push(b.c); rest -= b.v; }
    }
    if (!notes.length) notes.push("#4a90d9");
    notes.forEach((c, i) => {
      const d = document.createElement("div");
      d.className = "fx-bill";
      d.style.left = from.x + "px";
      d.style.top = from.y + "px";
      d.style.background = c;
      d.style.setProperty("--tx", (to.x - from.x + (Math.random() * 44 - 22)) + "px");
      d.style.setProperty("--ty", (to.y - from.y + (Math.random() * 30 - 15)) + "px");
      d.style.animationDelay = (i * 0.055) + "s";
      d.textContent = "¥";
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 1200 + i * 60);
    });
  }

  // 軽いイベント用：コマの上に出る吹き出し（モーダルなしでテンポUP）
  function bubble(pos, title, amountText, good) {
    if (!pos) return;
    const d = document.createElement("div");
    d.className = "fx-bubble";
    const t = document.createElement("div");
    t.className = "fx-bubble-t";
    t.textContent = title;
    d.appendChild(t);
    if (amountText) {
      const a = document.createElement("div");
      a.className = "fx-bubble-a " + (good ? "good" : "bad");
      a.textContent = amountText;
      d.appendChild(a);
    }
    d.style.left = pos.x + "px";
    d.style.top = (pos.y - 56) + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1500);
  }

  // 画面を横切るお祝いカットイン
  function cutin(emojiStr, text) {
    const w = document.createElement("div");
    w.className = "fx-cutin";
    const inner = document.createElement("div");
    inner.className = "fx-cutin-inner";
    const e1 = document.createElement("span");
    e1.className = "fx-cutin-emoji";
    e1.textContent = emojiStr;
    const e2 = document.createElement("span");
    e2.textContent = text;
    const e3 = document.createElement("span");
    e3.className = "fx-cutin-emoji";
    e3.textContent = emojiStr;
    inner.append(e1, e2, e3);
    w.appendChild(inner);
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 2100);
  }

  return { coins, confetti, cutin, bills, bubble, bankPos };
})();
