// 盤面の風景レイヤー：エリアごとの背景帯と装飾（木・建物・観覧車・ネオン街・夕焼けの山…）
// Board.build() から Scenery.render(parent) で呼ばれる。すべてDOM APIで構築（innerHTML不使用）

const Scenery = (() => {
  const NS = "http://www.w3.org/2000/svg";

  function el(name, attrs, ...kids) {
    const e = document.createElementNS(NS, name);
    for (const k in (attrs || {})) e.setAttribute(k, attrs[k]);
    kids.forEach(c => e.appendChild(c));
    return e;
  }
  function grp(x, y, s, cls) {
    const a = { transform: `translate(${x},${y})` + (s && s !== 1 ? ` scale(${s})` : "") };
    if (cls) a.class = cls;
    return el("g", a);
  }
  function txt(t, attrs) {
    const e = el("text", Object.assign({ "text-anchor": "middle" }, attrs));
    e.textContent = t;
    return e;
  }
  const rect = (x, y, w, hh, rx, fill, extra) => el("rect", Object.assign({ x, y, width: w, height: hh, rx, fill }, extra || {}));
  const circ = (cx, cy, r, fill, extra) => el("circle", Object.assign({ cx, cy, r, fill }, extra || {}));
  const ell  = (cx, cy, rx, ry, fill, extra) => el("ellipse", Object.assign({ cx, cy, rx, ry, fill }, extra || {}));
  const path = (d, fill, extra) => el("path", Object.assign({ d, fill }, extra || {}));

  // ---------- 装飾パーツ ----------
  function tree(x, y, s, leaf = "#3fa34d", leaf2 = "#57bb63") {
    const g = grp(x, y, s);
    g.append(
      rect(-4, -16, 8, 18, 3, "#8a5a33"),
      circ(0, -30, 16, leaf),
      circ(-12, -20, 11, leaf2),
      circ(12, -20, 11, leaf2),
    );
    return g;
  }
  const sakura = (x, y, s) => tree(x, y, s, "#f49ac1", "#f7b8d4");

  function cloud(x, y, s) {
    const g = grp(x, y, s, "sc-cloud");
    g.append(
      ell(0, 0, 30, 15, "#ffffff", { opacity: .92 }),
      ell(-22, 5, 17, 10, "#ffffff", { opacity: .92 }),
      ell(22, 5, 17, 10, "#ffffff", { opacity: .92 }),
    );
    return g;
  }

  function sun(x, y) {
    const g = grp(x, y, 1);
    const rays = grp(0, 0, 1, "sc-spin");
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      rays.append(el("line", {
        x1: Math.cos(a) * 32, y1: Math.sin(a) * 32,
        x2: Math.cos(a) * 44, y2: Math.sin(a) * 44,
        stroke: "#ffd23e", "stroke-width": 7, "stroke-linecap": "round",
      }));
    }
    g.append(rays, circ(0, 0, 27, "#ffd23e", { stroke: "#ffae00", "stroke-width": 3 }));
    return g;
  }

  function rainbow(x, y, s) {
    const g = grp(x, y, s);
    [["#ef6a6a", 62], ["#ffd23e", 52], ["#7cc6f0", 42]].forEach(([c, r]) => {
      g.append(path(`M${-r},0 A${r},${r} 0 0 1 ${r},0`, "none", { stroke: c, "stroke-width": 9, opacity: .8 }));
    });
    return g;
  }

  function rainCloud(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 0, 28, 14, "#9aa7b8"),
      ell(-20, 5, 16, 10, "#8a97a8"),
      ell(20, 5, 16, 10, "#a8b4c4"),
    );
    [-14, 0, 14].forEach((rx, i) => g.append(el("line", {
      x1: rx, y1: 16, x2: rx - 5, y2: 30,
      stroke: "#7fa8d0", "stroke-width": 3, "stroke-linecap": "round", opacity: .8 - i * .1,
    })));
    return g;
  }

  function ferris(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      path("M-8,8 L-30,66 L-18,66 L0,18 L18,66 L30,66 L8,8 Z", "#9a7b4f"),
      ell(0, 68, 38, 6, "rgba(0,0,0,.12)"),
    );
    const wheel = grp(0, 0, 1, "sc-spin-slow");
    wheel.append(circ(0, 0, 46, "none", { stroke: "#e0635f", "stroke-width": 5 }));
    const cabCol = ["#f4b630", "#6cc24a", "#5aa9dd", "#e0635f", "#a06cd5", "#f08bb4"];
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const cx = Math.cos(a) * 46, cy = Math.sin(a) * 46;
      wheel.append(
        el("line", { x1: 0, y1: 0, x2: cx, y2: cy, stroke: "#e0635f", "stroke-width": 3 }),
        circ(cx, cy, 8, cabCol[i], { stroke: "#fff", "stroke-width": 2 }),
      );
    }
    wheel.append(circ(0, 0, 6, "#c0504d"));
    g.append(wheel);
    return g;
  }

  function school(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      rect(-72, -52, 144, 52, 4, "#f3e9d6", { stroke: "#c9b89a", "stroke-width": 2 }),
      path("M-82,-52 L0,-88 L82,-52 Z", "#c0504d"),
      circ(0, -66, 9, "#fff", { stroke: "#9a8a6a", "stroke-width": 2 }),
      el("line", { x1: 0, y1: -66, x2: 0, y2: -71, stroke: "#666", "stroke-width": 1.5 }),
      el("line", { x1: 0, y1: -66, x2: 4, y2: -64, stroke: "#666", "stroke-width": 1.5 }),
    );
    [-52, -26, 14, 40].forEach(cx => g.append(rect(cx - 5, -42, 10, 42, 2, "#e0d4ba")));
    g.append(rect(-12, -34, 24, 34, 3, "#8a6a4a"));
    return g;
  }

  function office(x, y, s, color, win = "#ffe9a8") {
    const g = grp(x, y, s);
    g.append(rect(-26, -84, 52, 84, 3, color, { stroke: "rgba(0,0,0,.18)", "stroke-width": 2 }));
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      g.append(rect(-18 + c * 14, -76 + r * 15, 9, 9, 1.5, win, { opacity: .85 }));
    }
    return g;
  }

  function house(x, y, s, body = "#fff3df", roof = "#e0635f") {
    const g = grp(x, y, s);
    g.append(
      rect(-24, -28, 48, 28, 3, body, { stroke: "rgba(0,0,0,.14)", "stroke-width": 2 }),
      path("M-30,-28 L0,-50 L30,-28 Z", roof),
      rect(-7, -18, 14, 18, 2, "#9a6a44"),
      rect(10, -22, 10, 10, 2, "#aadcf5", { stroke: "#88b", "stroke-width": 1.5 }),
    );
    return g;
  }

  function neonSign(x, y, s) {
    const g = grp(x, y, s, "sc-neon");
    g.append(
      rect(-92, -32, 184, 64, 14, "#1d1133", { stroke: "#ff3df0", "stroke-width": 4 }),
      txt("CASINO", { y: 12, "font-size": 34, "font-weight": 900, fill: "#ffe14d", "letter-spacing": 4, stroke: "#ff7b00", "stroke-width": 1 }),
      circ(-78, -18, 4, "#7cf5ff"), circ(78, -18, 4, "#7cf5ff"),
      circ(-78, 18, 4, "#ff7bd5"), circ(78, 18, 4, "#ff7bd5"),
    );
    return g;
  }

  function dice(x, y, s, rot) {
    const g = el("g", { transform: `translate(${x},${y}) rotate(${rot}) scale(${s})` });
    g.append(rect(-15, -15, 30, 30, 6, "#fff", { stroke: "#ccc", "stroke-width": 2 }));
    [[-7, -7], [7, 7], [0, 0], [-7, 7], [7, -7]].forEach(([px, py]) => g.append(circ(px, py, 3.2, "#d04a4a")));
    return g;
  }

  function playCards(x, y, s) {
    const g = grp(x, y, s);
    const c1 = el("g", { transform: "rotate(-14)" });
    c1.append(rect(-13, -18, 26, 36, 4, "#fff", { stroke: "#bbb", "stroke-width": 1.5 }), txt("♠", { y: 7, "font-size": 20, fill: "#222" }));
    const c2 = el("g", { transform: "translate(16,3) rotate(13)" });
    c2.append(rect(-13, -18, 26, 36, 4, "#fff", { stroke: "#bbb", "stroke-width": 1.5 }), txt("♥", { y: 7, "font-size": 20, fill: "#d04a4a" }));
    g.append(c1, c2);
    return g;
  }

  function slot(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      rect(-22, -38, 44, 50, 6, "#8e44ad", { stroke: "#6a2d8a", "stroke-width": 2 }),
      rect(-16, -30, 32, 16, 3, "#fff8dc"),
      txt("777", { y: -18, "font-size": 13, "font-weight": 900, fill: "#d04a4a" }),
      el("line", { x1: 24, y1: -30, x2: 32, y2: -42, stroke: "#666", "stroke-width": 3, "stroke-linecap": "round" }),
      circ(32, -44, 4.5, "#e0635f"),
      rect(-10, -8, 20, 8, 2, "#ffd23e"),
    );
    return g;
  }

  function moon(x, y, s) {
    const g = grp(x, y, s);
    g.append(path("M0,-22 A22,22 0 1 1 0,22 A28,28 0 1 0 0,-22 Z", "#fff3b0", { opacity: .95 }));
    return g;
  }

  function sparkle(x, y, s) {
    const g = grp(x, y, s, "sc-twinkle");
    g.append(path("M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z", "#fff8c9"));
    return g;
  }

  function lamp(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      circ(0, -44, 16, "#fff3b0", { opacity: .25 }),
      rect(-2.5, -40, 5, 42, 2, "#4a4a5a"),
      circ(0, -44, 7, "#ffe9a8", { stroke: "#c9b88a", "stroke-width": 2 }),
    );
    return g;
  }

  function mountains(x, y, s, near = "#7da6c9", far = "#a9c4dd") {
    const g = grp(x, y, s);
    g.append(
      path("M-180,0 L-90,-78 L-10,0 Z", far),
      path("M-60,0 L40,-105 L150,0 Z", near),
      path("M16,-78 L40,-105 L66,-78 L52,-70 L40,-78 L28,-70 Z", "#fff"),
    );
    return g;
  }

  function torii(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      rect(-26, -38, 7, 38, 2, "#d04a3a"),
      rect(19, -38, 7, 38, 2, "#d04a3a"),
      rect(-36, -48, 72, 8, 3, "#d04a3a"),
      rect(-28, -34, 56, 5, 2, "#d04a3a"),
    );
    return g;
  }

  function pond(x, y, s, withDuck) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 0, 48, 18, "#7ec8f5", { stroke: "#5aa9dd", "stroke-width": 3 }),
      ell(-12, -3, 18, 6, "#b9e4fb"),
    );
    if (withDuck) g.append(txt("🦆", { y: 2, "font-size": 18 }));
    return g;
  }

  function onsen(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 0, 40, 15, "#9fd8ef", { stroke: "#76b9d8", "stroke-width": 3 }),
      circ(-46, 2, 8, "#9a9aa5"), circ(46, 0, 10, "#8a8a95"),
      txt("♨️", { y: -18, "font-size": 26 }),
    );
    return g;
  }

  // ゴールの御殿
  function palace(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      rect(-70, -8, 140, 14, 3, "#cdb98a"),
      rect(-52, -42, 104, 36, 3, "#f6d96b", { stroke: "#caa53a", "stroke-width": 2 }),
      path("M-64,-42 Q0,-66 64,-42 L52,-42 Q0,-58 -52,-42 Z", "#b3452e"),
      rect(-36, -74, 72, 30, 3, "#f6d96b", { stroke: "#caa53a", "stroke-width": 2 }),
      path("M-48,-74 Q0,-96 48,-74 L38,-74 Q0,-88 -38,-74 Z", "#b3452e"),
      rect(-20, -102, 40, 26, 3, "#f6d96b", { stroke: "#caa53a", "stroke-width": 2 }),
      path("M-30,-102 Q0,-122 30,-102 L22,-102 Q0,-114 -22,-102 Z", "#b3452e"),
      el("line", { x1: 0, y1: -116, x2: 0, y2: -148, stroke: "#8a6a3a", "stroke-width": 4 }),
      path("M0,-148 L34,-140 L0,-130 Z", "#e0432e"),
      txt("GOAL", { x: 14, y: -136, "font-size": 10, "font-weight": 900, fill: "#fff" }),
      rect(-8, -28, 16, 20, 2, "#8a5a33"),
    );
    return g;
  }

  // スタートのアーチ
  function startArch(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      rect(-66, -78, 11, 92, 4, "#e8590c"),
      rect(55, -78, 11, 92, 4, "#e8590c"),
      path("M-66,-72 Q0,-112 66,-72 L66,-58 Q0,-98 -66,-58 Z", "#ffd23e", { stroke: "#e8590c", "stroke-width": 3 }),
      txt("START!", { y: -72, "font-size": 21, "font-weight": 900, fill: "#e8590c", transform: "rotate(0)" }),
    );
    return g;
  }

  function emoji(x, y, t, size, cls) {
    return txt(t, Object.assign({ x, y, "font-size": size }, cls ? { class: cls } : {}));
  }

  // ---------- 章タイトル看板 ----------
  function signboard(x, y, s, small, big) {
    const g = grp(x, y, s);
    g.append(
      rect(-44, -56, 6, 56, 2, "#8a5a33"), rect(38, -56, 6, 56, 2, "#8a5a33"),
      rect(-58, -88, 116, 40, 8, "#b8895a", { stroke: "#7a4a23", "stroke-width": 3 }),
      txt(small, { y: -74, "font-size": 11, "font-weight": 900, fill: "#fff3df" }),
      txt(big, { y: -57, "font-size": 14, "font-weight": 900, fill: "#fff" }),
    );
    return g;
  }

  // ---------- 動く住人 ----------
  function walker(x, y, t, size, dur) {
    const g = grp(x, y, 1);
    const e = txt(t, { "font-size": size, class: "sc-walker" });
    e.style.animationDuration = dur + "s";
    g.append(e);
    return g;
  }

  function birds(x, y, s, color, dur) {
    const g = grp(x, y, s, "sc-fly");
    g.style.animationDuration = dur + "s";
    [[0, 0], [26, -10], [52, 4]].forEach(([bx, by]) =>
      g.append(path(`M${bx - 9},${by} Q${bx - 4},${by - 7} ${bx},${by} Q${bx + 4},${by - 7} ${bx + 9},${by}`,
        "none", { stroke: color, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" })));
    return g;
  }

  // ---------- 物件スプライト（マップに実在する家。原点＝地面） ----------
  function palm(px, py, s = 1) {
    const g = grp(px, py, s);
    g.append(
      path("M0,0 Q4,-14 2,-26", "none", { stroke: "#8a5a33", "stroke-width": 5, "stroke-linecap": "round" }),
      path("M2,-26 Q-12,-34 -20,-28", "none", { stroke: "#3fa34d", "stroke-width": 4, "stroke-linecap": "round" }),
      path("M2,-26 Q16,-34 24,-28", "none", { stroke: "#3fa34d", "stroke-width": 4, "stroke-linecap": "round" }),
      path("M2,-26 Q0,-40 -6,-44", "none", { stroke: "#57bb63", "stroke-width": 4, "stroke-linecap": "round" }),
      path("M2,-26 Q8,-40 14,-42", "none", { stroke: "#57bb63", "stroke-width": 4, "stroke-linecap": "round" }),
    );
    return g;
  }

  const HOUSE_SPRITES = [
    // 0 山小屋
    () => { const g = grp(0, 0, 1); g.append(path("M-22,0 L0,-34 L22,0 Z", "#8a5a33"), path("M-14,0 L0,-22 L14,0 Z", "#b8895a"), rect(-4, -11, 8, 11, 1, "#5a3a1a")); return g; },
    // 1 古民家
    () => { const g = grp(0, 0, 1); g.append(rect(-26, -20, 52, 20, 2, "#d9c7a8", { stroke: "#9a8a6a", "stroke-width": 2 }), path("M-34,-20 L0,-40 L34,-20 Z", "#5a4a3a"), rect(-6, -14, 12, 14, 1, "#7a5a3a"), rect(12, -16, 9, 8, 1, "#e8dcc0")); return g; },
    // 2 トレーラーハウス
    () => { const g = grp(0, 0, 1); g.append(rect(-28, -26, 52, 20, 7, "#e8e0d0", { stroke: "#b8a888", "stroke-width": 2 }), rect(-28, -16, 52, 4, 0, "#e0635f"), rect(-18, -23, 12, 8, 2, "#aadcf5"), rect(4, -23, 12, 8, 2, "#aadcf5"), circ(-14, -4, 5, "#2b2b33"), circ(12, -4, 5, "#2b2b33")); return g; },
    // 3 アパート一室
    () => { const g = grp(0, 0, 1); g.append(rect(-20, -42, 40, 42, 3, "#d8d8e8", { stroke: "#a8a8c0", "stroke-width": 2 }), rect(-14, -36, 10, 9, 1, "#ffe9a8"), rect(5, -36, 10, 9, 1, "#aab8d0"), rect(-14, -20, 10, 9, 1, "#aab8d0"), rect(5, -20, 10, 9, 1, "#ffe9a8"), rect(-5, -10, 10, 10, 1, "#7a6a5a")); return g; },
    // 4 ツリーハウス
    () => { const g = grp(0, 0, 1); g.append(rect(-4, -26, 8, 26, 2, "#8a5a33"), circ(0, -46, 18, "#3fa34d"), circ(-14, -36, 12, "#57bb63"), circ(14, -36, 12, "#57bb63"), rect(-12, -34, 24, 14, 3, "#c9a06a", { stroke: "#8a5a33", "stroke-width": 2 }), rect(-4, -31, 8, 7, 1, "#5a3a1a")); return g; },
    // 5 ログハウス
    () => { const g = grp(0, 0, 1); g.append(rect(-24, -22, 48, 22, 4, "#b8895a", { stroke: "#8a5a33", "stroke-width": 2 }), el("line", { x1: -24, y1: -15, x2: 24, y2: -15, stroke: "#8a5a33", "stroke-width": 1.6 }), el("line", { x1: -24, y1: -8, x2: 24, y2: -8, stroke: "#8a5a33", "stroke-width": 1.6 }), path("M-30,-22 L0,-40 L30,-22 Z", "#6a4a2a"), rect(-5, -13, 10, 13, 1, "#5a3a1a")); return g; },
    // 6 郊外の一軒家
    () => { const g = grp(0, 0, 1); g.append(rect(-24, -26, 48, 26, 3, "#fff3df", { stroke: "rgba(0,0,0,.14)", "stroke-width": 2 }), path("M-30,-26 L0,-46 L30,-26 Z", "#e0635f"), rect(-7, -16, 14, 16, 2, "#9a6a44"), rect(10, -21, 10, 9, 2, "#aadcf5")); return g; },
    // 7 デザイナーズマンション
    () => { const g = grp(0, 0, 1); g.append(rect(-18, -62, 36, 62, 3, "#cfd8e8", { stroke: "#9aa8c0", "stroke-width": 2 })); for (let r = 0; r < 4; r++) g.append(rect(-12, -56 + r * 14, 24, 8, 1, r % 2 ? "#ffe9a8" : "#aab8d0")); return g; },
    // 8 海辺の別荘
    () => { const g = grp(0, 0, 1); g.append(ell(0, 2, 44, 11, "#7ec8f5", { opacity: .8 }), ell(2, 0, 34, 8, "#f4e2b8"), rect(-16, -24, 30, 24, 3, "#ffffff", { stroke: "#c0d0e0", "stroke-width": 2 }), path("M-20,-24 L-1,-36 L18,-24 Z", "#5aa9dd"), rect(-8, -16, 8, 16, 1, "#9a8a6a"), palm(24, 0, .9)); return g; },
    // 9 タワマン最上階
    () => { const g = grp(0, 0, 1); g.append(rect(-16, -84, 32, 84, 3, "#9fb0c9", { stroke: "#7a8aa8", "stroke-width": 2 })); for (let r = 0; r < 6; r++) g.append(rect(-11, -78 + r * 13, 22, 7, 1, r === 0 ? "#ffe14d" : "#d8e4f0")); g.append(el("line", { x1: 0, y1: -84, x2: 0, y2: -98, stroke: "#7a8aa8", "stroke-width": 2.5 }), circ(0, -99, 2.5, "#e0635f")); return g; },
    // 10 温泉付き豪邸
    () => { const g = grp(0, 0, 1); g.append(rect(-32, -26, 64, 26, 3, "#f6e9d0", { stroke: "#c9b89a", "stroke-width": 2 }), path("M-38,-26 Q0,-46 38,-26 Z", "#8a4a3a"), rect(-22, -18, 12, 10, 1, "#ffe9a8"), rect(10, -18, 12, 10, 1, "#aadcf5"), rect(-5, -14, 10, 14, 1, "#7a5a3a"), txt("♨️", { x: 30, y: -34, "font-size": 16 })); return g; },
    // 11 無人島のヴィラ
    () => { const g = grp(0, 0, 1); g.append(ell(0, 2, 48, 13, "#7ec8f5", { opacity: .85 }), ell(0, 0, 32, 9, "#f4e2b8"), path("M-16,-2 L-4,-20 L8,-2 Z", "#c9a06a"), rect(-7, -8, 7, 8, 1, "#8a5a33"), palm(18, -2, .85)); return g; },
    // 12 お城
    () => { const g = grp(0, 0, 1); g.append(ell(0, 2, 52, 13, "#8fd17e"), rect(-34, -34, 16, 34, 2, "#e8e0d8", { stroke: "#b0a898", "stroke-width": 2 }), path("M-36,-34 L-26,-50 L-16,-34 Z", "#5a6a9a"), rect(18, -34, 16, 34, 2, "#e8e0d8", { stroke: "#b0a898", "stroke-width": 2 }), path("M16,-34 L26,-50 L36,-34 Z", "#5a6a9a"), rect(-14, -44, 28, 44, 2, "#f0e8e0", { stroke: "#b0a898", "stroke-width": 2 }), path("M-16,-44 L0,-62 L16,-44 Z", "#5a6a9a"), el("line", { x1: 0, y1: -62, x2: 0, y2: -74, stroke: "#8a7a6a", "stroke-width": 2 }), path("M0,-74 L12,-70 L0,-66 Z", "#e0432e"), rect(-6, -14, 12, 14, 6, "#6a5a4a")); return g; },
    // 13 月の土地付きドーム
    () => { const g = grp(0, 0, 1); g.append(ell(0, 0, 42, 11, "#cfcfe0", { stroke: "#a8a8c0", "stroke-width": 2 }), circ(-22, -2, 4, "#b0b0c8"), circ(16, 1, 3, "#b0b0c8"), path("M-24,0 A24,24 0 0 1 24,0 Z", "rgba(170,220,245,.55)", { stroke: "#8ac0e0", "stroke-width": 2.5 }), rect(-6, -10, 12, 10, 2, "#e8e8f0"), el("line", { x1: 30, y1: 0, x2: 30, y2: -22, stroke: "#a8a8c0", "stroke-width": 2 }), path("M30,-22 L42,-18 L30,-14 Z", "#5aa9dd")); return g; },
  ];

  // 物件の設置場所（似合うエリアに点在）
  const HOUSE_SPOTS = [
    { hi: 0,  x: 2520, y: 1438, s: 1 },    // 山小屋→山のふもと
    { hi: 1,  x: 440,  y: 1604, s: 1 },    // 古民家→夕焼けの里
    { hi: 2,  x: 245,  y: 240,  s: 1 },    // トレーラー→公園わき
    { hi: 3,  x: 980,  y: 690,  s: 1 },    // アパート→青春の街
    { hi: 4,  x: 1230, y: 300,  s: 1 },    // ツリーハウス→遊園地の森
    { hi: 5,  x: 380,  y: 836,  s: 1 },    // ログハウス→郊外
    { hi: 6,  x: 1320, y: 834,  s: 1 },    // 一軒家→郊外
    { hi: 7,  x: 1800, y: 690,  s: 1 },    // マンション→青春の街
    { hi: 8,  x: 2520, y: 760,  s: .95 },  // 海辺の別荘→東の浜辺
    { hi: 9,  x: 560,  y: 966,  s: 1 },    // タワマン→夜の街
    { hi: 10, x: 1730, y: 1600, s: 1 },    // 温泉付き豪邸→温泉郷
    { hi: 11, x: 2520, y: 1620, s: 1 },    // 無人島ヴィラ→南東の海
    { hi: 12, x: 120,  y: 1268, s: .95 },  // お城→丘の上
    { hi: 13, x: 1800, y: 120,  s: 1 },    // 月ドーム→空の彼方
  ];

  function saleFlag() {
    const g = el("g", { class: "hs-flag" });
    g.append(
      el("line", { x1: 34, y1: 0, x2: 34, y2: -36, stroke: "#8a5a33", "stroke-width": 3 }),
      rect(34, -36, 24, 17, 3, "#fff", { stroke: "#e8590c", "stroke-width": 2 }),
      txt("売", { x: 46, y: -23, "font-size": 12, "font-weight": 900, fill: "#e8590c" }),
    );
    return g;
  }

  // 物件レイヤーを構築し、状態更新用の要素辞書を返す
  function houses(parent) {
    const out = {};
    HOUSE_SPOTS.forEach(({ hi, x, y, s }) => {
      const g = grp(x, y, s, "hs hs-sale");
      g.appendChild(HOUSE_SPRITES[hi]());
      g.appendChild(saleFlag());
      const plateG = el("g", { class: "hs-plate", display: "none" });
      const plateBg = rect(-36, 8, 72, 19, 7, "#888", { stroke: "#fff", "stroke-width": 2 });
      const plateTx = txt("", { y: 22, "font-size": 11, "font-weight": 900, fill: "#fff" });
      plateG.append(plateBg, plateTx);
      g.appendChild(plateG);
      const tt = el("title", {});
      tt.textContent = `${HOUSES[hi].e} ${HOUSES[hi].n}（¥${HOUSES[hi].p.toLocaleString()}）`;
      g.appendChild(tt);
      parent.appendChild(g);
      out[hi] = { g, plateG, plateBg, plateTx };
    });
    return out;
  }

  // ---------- 描画（10行レイアウト：行y=150,300,…,1500） ----------
  function render(parent) {
    // エリア背景帯
    const zones = el("g", { opacity: 1 });
    zones.append(
      rect(30, 55, 2540, 170, 70, "#bfe89f", { opacity: .45 }),     // 幼少期：公園
      rect(30, 230, 2540, 290, 70, "#bcd9f2", { opacity: .4 }),     // 学生＆就職：キャンパス
      rect(30, 525, 2540, 150, 70, "#ffe2b8", { opacity: .42 }),    // 社会人：青春の街
      rect(30, 680, 2540, 142, 70, "#c4ecba", { opacity: .45 }),    // 安定：郊外
      rect(30, 827, 2540, 148, 60, "#241638", { opacity: .88 }),    // ギャンブル：夜の街
      rect(30, 980, 2540, 142, 60, "#c9d8e8", { opacity: .45 }),    // 波乱の40代：嵐の街
      rect(30, 1127, 2540, 145, 60, "#e3d9f0", { opacity: .45 }),   // 熟年の階段
      rect(30, 1277, 2540, 145, 60, "#ffe08a", { opacity: .5 }),    // 黄金のラストスパート
      rect(30, 1427, 2540, 225, 60, "#ffc489", { opacity: .5 }),    // 夕焼けのフィナーレ
    );
    parent.append(zones);

    const d = el("g", {});
    // --- 空 ---
    d.append(
      sun(2490, 95),
      cloud(330, 62, 1), cloud(820, 80, .8), cloud(1450, 58, 1.1), cloud(2080, 88, .85),
    );
    // --- 幼少期：公園 ---
    d.append(
      startArch(170, 108, 1),
      rainbow(680, 92, .85),
      tree(480, 238, .9), tree(1090, 95, .75),
      emoji(360, 234, "🌷", 20), emoji(560, 110, "🌻", 20), emoji(950, 236, "🌷", 18),
    );
    // --- 右の大きな空き地＝遊園地（学生行の右側） ---
    d.append(
      ferris(2090, 400, 1.25),
      pond(1500, 480, 1, true),
      tree(1350, 300, 1), sakura(1900, 290, .9), tree(2380, 480, 1.1),
      emoji(1750, 500, "🎪", 40),
    );
    // --- 学生：キャンパス／就職：オフィス ---
    d.append(
      school(140, 395, 1),
      sakura(650, 378, .9), sakura(980, 372, .8),
      emoji(820, 380, "📚", 24),
      office(560, 540, .6, "#9fb6c9"), office(760, 535, .55, "#c9a9b0"),
    );
    // --- 社会人：青春の街 ---
    d.append(
      office(620, 688, .65, "#9fb6c9"), office(1530, 686, .7, "#cbb59b"), office(2080, 688, .6, "#a9c0a0"),
      emoji(1240, 537, "💒", 44),
      emoji(330, 535, "🚏", 28),
      lamp(1750, 545, .8),
    );
    // --- 安定：郊外 ---
    d.append(
      pond(190, 690, .85, true),
      house(930, 834, .85, "#eef7e0", "#5aa9dd"), house(2120, 832, .85, "#fff3df", "#f4b630"),
      tree(720, 680, .7), tree(1900, 683, .75),
      emoji(2350, 828, "🌻", 20),
    );
    // --- ギャンブル：夜の街 ---
    d.append(
      moon(2480, 870, 1),
      sparkle(420, 858, 1), sparkle(940, 962, .8), sparkle(1480, 855, 1.1), sparkle(1990, 958, .9), sparkle(2330, 962, .8), sparkle(700, 866, .7),
      neonSign(1180, 968, 1),
      dice(330, 962, 1, -15), dice(2070, 964, .9, 18),
      playCards(840, 962, 1),
      slot(1620, 963, 1),
      lamp(140, 945, .9), lamp(2480, 968, .9),
    );
    // --- 波乱の40代：嵐の街 ---
    d.append(
      rainCloud(2300, 1005, .95), rainCloud(550, 1000, .8),
      emoji(420, 1132, "🏥", 32), emoji(1000, 1130, "🚒", 30),
      office(700, 1140, .6, "#b9a9c9"), office(1850, 1138, .65, "#c9b59b", "#ffd9a8"),
      tree(1240, 1133, .75),
    );
    // --- 熟年の階段 ---
    d.append(
      emoji(600, 1282, "⛳", 30), emoji(1100, 1280, "🪴", 26), emoji(1700, 1278, "🏦", 30),
      tree(350, 1283, .85), tree(2200, 1280, .8),
      lamp(2480, 1262, .8),
    );
    // --- 黄金のラストスパート ---
    d.append(
      sparkle(400, 1292, 1), sparkle(900, 1424, .9), sparkle(1500, 1290, 1.1), sparkle(2000, 1426, .9), sparkle(2350, 1292, .8),
      emoji(650, 1432, "🏆", 34), emoji(1750, 1430, "💰", 30), emoji(1200, 1292, "👑", 26),
    );
    // --- 夕焼けのフィナーレ ---
    d.append(
      mountains(2280, 1462, 1),
      mountains(1450, 1458, .7, "#9db8d4", "#bccfe4"),
      palace(170, 1597, 1.1),
      torii(950, 1597, 1),
      onsen(1540, 1595, 1),
      tree(640, 1600, .9), sakura(2050, 1597, .9),
      emoji(1200, 1604, "🌾", 22), emoji(1880, 1606, "🍵", 20),
    );
    // --- 章タイトル看板 ---
    d.append(
      signboard(330, 100, 1, "第1章", "はじまりの公園"),
      signboard(1290, 258, .9, "第2章", "進路の選択"),
      signboard(430, 538, .9, "第3章", "青春の街"),
      signboard(2330, 695, .9, "第4章", "人生の岐路"),
      signboard(240, 1132, .9, "第5章", "波乱の40代"),
      signboard(2350, 1138, .9, "第6章", "熟年の階段"),
      signboard(330, 1292, .95, "第7章", "黄金ロード"),
      signboard(1900, 1438, .95, "終章", "フィナーレ"),
    );
    // --- 動く住人 ---
    d.append(
      walker(1180, 830, "🐕", 22, 13),
      walker(1400, 1282, "🐈", 20, 17),
      walker(1860, 966, "🕴️", 26, 21),
      birds(300, 80, 1, "#5a7a9a", 34),
      birds(500, 1448, .8, "#8a5a4a", 44),
    );
    parent.append(d);
  }

  return { render, houses };
})();
