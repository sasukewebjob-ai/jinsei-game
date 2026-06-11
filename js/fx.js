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

  return { coins, confetti };
})();
