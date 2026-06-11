// ルーレット（1〜10）。「回す！」ボタン or ドラッグで弾いて回す
// spin(force) が Promise<出目> を返す。force指定時はその出目で止まる（ボタンのみ）

const Roulette = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6",
                  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1"];
  let built = false, rotation = 0, wheel = null, svg = null;
  let busy = false;            // 回転中・結果表示中
  let resolveFn = null, forced = 0;
  let lastSector = 0;

  function sv(name, attrs) {
    const el = document.createElementNS(NS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function build() {
    if (built) return;
    built = true;
    svg = document.getElementById("roulette-svg");
    wheel = sv("g", { id: "wheel" });
    const R = 100;
    for (let k = 1; k <= 10; k++) {
      // セクターkは上(12時)から時計回りに (k-1)*36°〜k*36° を占める
      const a0 = ((k - 1) * 36 - 90) * Math.PI / 180;
      const a1 = (k * 36 - 90) * Math.PI / 180;
      const am = ((k - 0.5) * 36 - 90) * Math.PI / 180;
      const x0 = (Math.cos(a0) * R).toFixed(2), y0 = (Math.sin(a0) * R).toFixed(2);
      const x1 = (Math.cos(a1) * R).toFixed(2), y1 = (Math.sin(a1) * R).toFixed(2);
      wheel.appendChild(sv("path", {
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
      wheel.appendChild(num);
    }
    wheel.appendChild(sv("circle", { r: 18, fill: "#fff", stroke: "#ccc", "stroke-width": 2 }));
    svg.appendChild(wheel);
    enableDrag();
  }

  function applyRot() {
    wheel.setAttribute("transform", `rotate(${rotation})`);
    const sec = Math.floor(rotation / 36);
    if (sec !== lastSector) { lastSector = sec; Sound.play("tick"); }
  }

  // いまポインタ（真上）の下にあるセクター
  function sectorAtPointer() {
    return Math.floor((((-rotation) % 360) + 360) % 360 / 36) + 1;
  }

  // ---- ボタン回し：狙った出目に向かってイージング回転 ----
  function spinTo(k) {
    busy = true;
    Sound.play("spin");
    const desired = ((-(k - 0.5) * 36) % 360 + 360) % 360;
    const cur = ((rotation % 360) + 360) % 360;
    const targetRot = rotation + 360 * 5 + ((desired - cur + 360) % 360) + (Math.random() * 24 - 12);
    const startRot = rotation, t0 = performance.now(), dur = 2600;
    (function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      rotation = startRot + (targetRot - startRot) * e;
      applyRot();
      if (t < 1) requestAnimationFrame(frame);
      else finish(k);
    })(t0);
  }

  // ---- ドラッグで弾く ----
  function enableDrag() {
    let drag = null;
    const angleOf = e => {
      const r = svg.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    };
    svg.onpointerdown = e => {
      if (busy || forced) return;
      drag = { a: angleOf(e), hist: [{ t: performance.now(), rot: rotation }] };
      svg.setPointerCapture(e.pointerId);
    };
    svg.onpointermove = e => {
      if (!drag) return;
      const a = angleOf(e);
      let d = a - drag.a;
      if (d > 180) d -= 360; if (d < -180) d += 360;
      drag.a = a;
      rotation += d;
      applyRot();
      drag.hist.push({ t: performance.now(), rot: rotation });
      if (drag.hist.length > 12) drag.hist.shift();
    };
    svg.onpointerup = svg.onpointercancel = () => {
      if (!drag) return;
      const now = performance.now();
      const h = drag.hist.filter(s => now - s.t < 180);   // 直近の動きだけで速度を出す
      drag = null;
      if (h.length < 2) return;
      const dt = h[h.length - 1].t - h[0].t;
      let v = dt > 0 ? (h[h.length - 1].rot - h[0].rot) / dt : 0;   // deg/ms
      if (Math.abs(v) < 0.12) return;                               // 弱すぎたらノーカン
      v = Math.max(-1.5, Math.min(1.5, v * 1.35));                  // 弾き感ブースト
      busy = true;
      Sound.play("spin");
      let last = performance.now();
      (function frame(now) {
        const dms = Math.min(40, now - last);
        last = now;
        rotation += v * dms;
        v *= Math.pow(0.9935, dms);
        applyRot();
        if (Math.abs(v) > 0.012) requestAnimationFrame(frame);
        else finish(sectorAtPointer());
      })(last);
    };
  }

  function finish(k) {
    Sound.play("land");
    const out = document.getElementById("roulette-result");
    out.textContent = k;
    out.hidden = false;
    setTimeout(() => {
      document.getElementById("overlay-roulette").hidden = true;
      busy = false;
      const r = resolveFn;
      resolveFn = null;
      if (r) r(k);
    }, 1000);
  }

  function spin(force) {
    build();
    return new Promise(res => {
      resolveFn = res;
      forced = force || 0;
      busy = false;
      const ov = document.getElementById("overlay-roulette");
      const btn = document.getElementById("btn-do-spin");
      const out = document.getElementById("roulette-result");
      const hint = document.getElementById("roulette-hint");
      out.hidden = true;
      btn.disabled = false;
      hint.textContent = forced ? "🚀 ターボ発動中！ボタンで回そう" : "ホイールをドラッグで弾いてもOK！";
      ov.hidden = false;
      btn.onclick = () => {
        if (busy) return;
        btn.disabled = true;
        spinTo(forced || (1 + Math.floor(Math.random() * 10)));
      };
    });
  }

  return { spin };
})();
