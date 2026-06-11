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

  function balloon(x, y, color) {
    const g = grp(x, y, 1, "sc-bob");
    g.append(
      path("M0,-12 q5,10 0,20", "none", { stroke: "#888", "stroke-width": 1.5 }),
      ell(0, -26, 12, 15, color, { stroke: "rgba(0,0,0,.15)", "stroke-width": 2 }),
      path("M-3,-12 L3,-12 L0,-7 Z", color),
    );
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

  // ---------- 描画 ----------
  function render(parent) {
    // エリア背景帯
    const zones = el("g", { opacity: 1 });
    zones.append(
      rect(30, 50, 2540, 195, 70, "#bfe89f", { opacity: .45 }),     // 幼少期：公園
      rect(30, 250, 2540, 270, 70, "#bcd9f2", { opacity: .4 }),     // 学生：キャンパス
      rect(30, 530, 2540, 160, 70, "#ffe2b8", { opacity: .42 }),    // 社会人：街
      rect(30, 695, 2540, 145, 70, "#c4ecba", { opacity: .45 }),    // 安定：郊外
      rect(30, 845, 2540, 162, 60, "#241638", { opacity: .88 }),    // ギャンブル：夜の街
      rect(30, 1012, 2540, 130, 60, "#f6d5e2", { opacity: .4 }),    // 終盤：夕暮れの街
      rect(30, 1147, 2540, 200, 60, "#ffc489", { opacity: .5 }),    // ラスト：夕焼けの丘
    );
    parent.append(zones);

    const d = el("g", {});
    // --- 空 ---
    d.append(
      sun(2490, 95),
      cloud(330, 62, 1), cloud(820, 80, .8), cloud(1450, 58, 1.1), cloud(2080, 88, .85),
    );
    // --- 幼少期：公園＆遊園地 ---
    d.append(
      startArch(170, 108, 1),
      rainbow(680, 92, .85),
      tree(480, 242, .9), tree(1090, 95, .75),
      emoji(360, 238, "🌷", 20), emoji(560, 110, "🌻", 20), emoji(950, 240, "🌷", 18),
      // 右上の大きな空き地＝遊園地
      ferris(2090, 300, 1.25),
      balloon(1880, 215, "#e0635f"), balloon(2300, 190, "#5aa9dd"), balloon(1980, 440, "#6cc24a"),
      pond(1660, 430, 1, true),
      tree(1480, 300, 1), sakura(1820, 470, .9), tree(2380, 450, 1.1),
      emoji(2210, 462, "🎪", 40),
    );
    // --- 学生：キャンパス ---
    d.append(
      school(150, 392, 1),
      sakura(430, 398, .95), sakura(990, 400, .85), sakura(700, 252, .8),
      emoji(860, 396, "📚", 24),
      office(540, 548, .7, "#9fb6c9"), office(800, 545, .6, "#c9a9b0"),
    );
    // --- 社会人：街 ---
    d.append(
      office(620, 712, .7, "#9fb6c9"), office(1530, 710, .8, "#cbb59b"), office(2080, 712, .65, "#a9c0a0"),
      emoji(1250, 548, "💒", 44),
      emoji(330, 545, "🚏", 28),
      lamp(1750, 560, .8),
    );
    // --- 安定：郊外 ---
    d.append(
      pond(190, 705, .9, true),
      house(520, 856, .95, "#fff3df", "#e0635f"), house(930, 852, .85, "#eef7e0", "#5aa9dd"),
      house(1620, 854, .95, "#fdeede", "#6cc24a"), house(2120, 850, .9, "#fff3df", "#f4b630"),
      tree(1900, 695, .8), tree(720, 690, .7),
      emoji(1230, 848, "🐕", 22), emoji(2350, 845, "🌻", 20),
    );
    // --- ギャンブル：夜の街 ---
    d.append(
      moon(2480, 885, 1),
      sparkle(420, 872, 1), sparkle(940, 958, .8), sparkle(1480, 868, 1.1), sparkle(1990, 952, .9), sparkle(2330, 958, .8), sparkle(700, 880, .7),
      neonSign(1180, 992, 1),
      dice(330, 985, 1, -15), dice(2070, 988, .9, 18),
      playCards(840, 986, 1),
      slot(1620, 988, 1),
      lamp(140, 960, .9), lamp(2480, 990, .9),
    );
    // --- 終盤：夕暮れの街 ---
    d.append(
      office(700, 1160, .7, "#b9a9c9"), office(1850, 1158, .8, "#c9b59b", "#ffd9a8"),
      emoji(420, 1152, "🏥", 32), emoji(2280, 1150, "🏦", 30),
      tree(1240, 1154, .8),
    );
    // --- ラスト：夕焼けの丘 ---
    d.append(
      mountains(2270, 1195, 1),
      mountains(1450, 1190, .7, "#9db8d4", "#bccfe4"),
      palace(180, 1322, 1.1),
      torii(950, 1322, 1),
      onsen(1540, 1320, 1),
      tree(640, 1325, .9), sakura(2050, 1322, .9),
      emoji(1200, 1328, "🌾", 22), emoji(1820, 1330, "🍵", 20),
    );
    parent.append(d);
  }

  return { render };
})();
