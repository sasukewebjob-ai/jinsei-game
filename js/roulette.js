// ルーレット（1〜8）オーバーレイ。spin(force) が Promise<出目> を返す
// 盤の縁にペグ（突起）があり、回すと針がカタカタ弾かれる本家風ギミック付き

const Roulette = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const R = 100;                       // 盤の半径
  const PIVOT_Y = -123;                // 針の支点（盤の上）
  const SECTORS = 8;                   // 出目の数（1〜SECTORS）
  const SEG = 360 / SECTORS;           // 1セクターの角度
  const COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6",
                  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1"];
  let built = false, svg = null, rotG = null, needleG = null;
  let rotation = 0, busy = false, resolveFn = null, forced = 0;
  let lastSector = 0, needleAngle = 0;

  function sv(name, attrs) {
    const el = document.createElementNS(NS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function build() {
    if (built) return;
    built = true;
    svg = document.getElementById("roulette-svg");
    // 盤（回転部）：セクター＋数字＋縁のペグ
    rotG = sv("g", {});
    for (let k = 1; k <= SECTORS; k++) {
      // セクターkは上(12時)から時計回りに (k-1)*SEG°〜k*SEG° を占める
      const a0 = ((k - 1) * SEG - 90) * Math.PI / 180;
      const a1 = (k * SEG - 90) * Math.PI / 180;
      const am = ((k - 0.5) * SEG - 90) * Math.PI / 180;
      const x0 = (Math.cos(a0) * R).toFixed(2), y0 = (Math.sin(a0) * R).toFixed(2);
      const x1 = (Math.cos(a1) * R).toFixed(2), y1 = (Math.sin(a1) * R).toFixed(2);
      rotG.appendChild(sv("path", {
        d: `M0,0 L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`,
        fill: COLORS[k - 1], stroke: "#fff", "stroke-width": 2,
      }));
      const tx = (Math.cos(am) * 66).toFixed(2), ty = (Math.sin(am) * 66).toFixed(2);
      const num = sv("text", {
        x: tx, y: ty, "text-anchor": "middle", "dominant-baseline": "central",
        "font-size": 26, "font-weight": "bold", fill: "#fff",
        transform: `rotate(${(k - 0.5) * SEG} ${tx} ${ty})`,
      });
      num.textContent = k;
      rotG.appendChild(num);
      // セクター境界のペグ（針を弾く突起）
      const pa = (k * SEG - 90) * Math.PI / 180;
      rotG.appendChild(sv("circle", {
        cx: (Math.cos(pa) * (R + 7)).toFixed(2), cy: (Math.sin(pa) * (R + 7)).toFixed(2),
        r: 5, fill: "#5b4636", stroke: "#fff", "stroke-width": 1.5,
      }));
    }
    rotG.appendChild(sv("circle", { r: 18, fill: "#fff", stroke: "#ccc", "stroke-width": 2 }));
    svg.appendChild(rotG);
    // 針（支点を中心に弾かれて揺れる）
    needleG = sv("g", { transform: `translate(0,${PIVOT_Y})` });
    const needle = sv("g", { class: "needle-rot" });
    needle.appendChild(sv("path", {
      d: "M0,34 L6.5,4 L-6.5,4 Z",
      fill: "#ffd93d", stroke: "#5b4636", "stroke-width": 3, "stroke-linejoin": "round",
    }));
    needle.appendChild(sv("circle", { r: 8, fill: "#e8590c", stroke: "#5b4636", "stroke-width": 3 }));
    needleG.appendChild(needle);
    svg.appendChild(needleG);
  }

  function applyNeedle() {
    needleG.firstChild.setAttribute("transform", `rotate(${needleAngle.toFixed(2)})`);
  }

  // 回転を反映しつつ、ペグ通過で針を弾く
  function applyRot(dir) {
    rotG.setAttribute("transform", `rotate(${rotation})`);
    const sec = Math.floor(rotation / SEG);
    if (sec !== lastSector) {
      lastSector = sec;
      Sound.play("tick");
      needleAngle = (dir >= 0 ? 1 : -1) * 26;     // ペグに弾かれる！
    }
    needleAngle *= 0.82;                           // バネで戻る
    applyNeedle();
  }

  // 針の揺れ戻し（停止後）
  function relaxNeedle() {
    (function frame() {
      needleAngle *= 0.78;
      applyNeedle();
      if (Math.abs(needleAngle) > 0.4) requestAnimationFrame(frame);
      else { needleAngle = 0; applyNeedle(); }
    })();
  }

  // ---- 自分で止める方式：1回目のボタンで高速回転開始 → 2回目のボタンで減速停止 ----
  let phase = "idle";            // idle → spinning → stopping
  let autoTimer = 0;

  // 高速フリー回転（止めるまで回り続ける）
  function startFree() {
    phase = "spinning";
    Sound.play("spin");
    let last = performance.now();
    (function frame(now) {
      if (phase !== "spinning") return;
      const dt = Math.min(50, now - last);
      last = now;
      rotation += 0.55 * dt * (window.TURBO || 1);   // 約550度/秒
      applyRot(1);
      requestAnimationFrame(frame);
    })(last);
  }

  // 出目kに向かって減速停止
  function stopTo(k) {
    phase = "stopping";
    const desired = ((-(k - 0.5) * SEG) % 360 + 360) % 360;
    const cur = ((rotation % 360) + 360) % 360;
    const targetRot = rotation + 360 * 2 + ((desired - cur + 360) % 360) + (Math.random() * 24 - 12);
    const startRot = rotation, t0 = performance.now(), dur = 1800 / (window.TURBO || 1);
    (function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      rotation = startRot + (targetRot - startRot) * e;
      applyRot(1);
      if (t < 1) requestAnimationFrame(frame);
      else finish(k);
    })(t0);
  }

  function finish(k) {
    Sound.play("land");
    relaxNeedle();
    const out = document.getElementById("roulette-result");
    out.textContent = k;
    out.hidden = false;
    setTimeout(() => {
      document.getElementById("overlay-roulette").hidden = true;
      phase = "idle";
      const r = resolveFn;
      resolveFn = null;
      r && r(k);
    }, 1000 / (window.TURBO || 1));
  }

  // label: 何のためのルーレットか（移動/決闘/カジノ…）を盤上に明示する
  function spin(force, label) {
    build();
    return new Promise(res => {
      resolveFn = res;
      forced = force || 0;
      phase = "idle";
      const ov = document.getElementById("overlay-roulette");
      const btn = document.getElementById("btn-do-spin");
      const out = document.getElementById("roulette-result");
      const hint = document.getElementById("roulette-hint");
      document.getElementById("roulette-label").textContent = label || "ルーレット";
      out.hidden = true;
      btn.disabled = false;
      btn.textContent = "回す！";
      hint.textContent = forced ? "🚀 ターボ発動中！ボタンで回そう" : "ボタンを押して回そう！";
      ov.hidden = false;

      const stopNow = () => {
        if (phase !== "spinning") return;
        clearTimeout(autoTimer);
        btn.disabled = true;
        stopTo(forced || (1 + Math.floor(Math.random() * SECTORS)));
      };
      btn.onclick = () => {
        if (phase === "idle") {
          startFree();
          btn.textContent = "ストップ！";
          hint.textContent = "もう一度押して止めよう！";
          // 押されなくても6秒で自動停止（放置対策）
          autoTimer = setTimeout(stopNow, 6000 / (window.TURBO || 1));
        } else if (phase === "spinning") {
          stopNow();
        }
      };
    });
  }

  return { spin };
})();
