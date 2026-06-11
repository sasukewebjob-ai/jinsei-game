// ルーレット（1〜10）オーバーレイ。spin() が Promise<出目> を返す

const Roulette = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6",
                  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1"];
  let built = false, rotation = 0;

  function sv(name, attrs) {
    const el = document.createElementNS(NS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function build() {
    if (built) return;
    built = true;
    const svg = document.getElementById("roulette-svg");
    const g = sv("g", { id: "wheel" });
    const R = 100;
    for (let k = 1; k <= 10; k++) {
      // セクターkは上(12時)から時計回りに (k-1)*36°〜k*36° を占める
      const a0 = ((k - 1) * 36 - 90) * Math.PI / 180;
      const a1 = (k * 36 - 90) * Math.PI / 180;
      const am = ((k - 0.5) * 36 - 90) * Math.PI / 180;
      const x0 = (Math.cos(a0) * R).toFixed(2), y0 = (Math.sin(a0) * R).toFixed(2);
      const x1 = (Math.cos(a1) * R).toFixed(2), y1 = (Math.sin(a1) * R).toFixed(2);
      g.appendChild(sv("path", {
        d: `M0,0 L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`,
        fill: COLORS[k - 1], stroke: "#fff", "stroke-width": 2,
      }));
      const tx = (Math.cos(am) * 68).toFixed(2), ty = (Math.sin(am) * 68).toFixed(2);
      const num = sv("text", {
        x: tx, y: ty, "text-anchor": "middle", "dominant-baseline": "central",
        "font-size": 26, "font-weight": "bold", fill: "#fff",
        transform: `rotate(${(k - 0.5) * 36} ${tx} ${ty})`,
      });
      num.textContent = k;
      g.appendChild(num);
    }
    g.appendChild(sv("circle", { r: 18, fill: "#fff", stroke: "#ccc", "stroke-width": 2 }));
    svg.appendChild(g);
  }

  // force を渡すとその出目で止まる（ターボチケット用）
  function spin(force) {
    build();
    return new Promise(res => {
      const ov = document.getElementById("overlay-roulette");
      const wheel = document.getElementById("wheel");
      const btn = document.getElementById("btn-do-spin");
      const out = document.getElementById("roulette-result");
      out.hidden = true;
      btn.disabled = false;
      ov.hidden = false;
      btn.onclick = () => {
        btn.disabled = true;
        Sound.play("spin");
        const k = force || (1 + Math.floor(Math.random() * 10));
        // セクターkの中心を真上のポインタに合わせる回転量（±12°のゆらぎ付き）
        const desired = ((-(k - 0.5) * 36) % 360 + 360) % 360;
        const cur = ((rotation % 360) + 360) % 360;
        rotation += 360 * 5 + ((desired - cur + 360) % 360) + (Math.random() * 24 - 12);
        wheel.style.transition = "transform 2.6s cubic-bezier(.12,.75,.18,1)";
        wheel.style.transform = `rotate(${rotation}deg)`;
        setTimeout(() => {
          Sound.play("land");
          out.textContent = k;
          out.hidden = false;
          setTimeout(() => { ov.hidden = true; res(k); }, 1000);
        }, 2700);
      };
    });
  }

  return { spin };
})();
