// 盤面の風景レイヤー（本家風）：全面芝生・モコモコ樹木・立体の丘・池・建物・中央ルーレット
// Board.build() から Scenery.render(parent) で呼ばれる。座標系は盤面そのまま（3000x2300）

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
  // 本家風のモコモコの木（影付き・丸3つ）
  function tree(x, y, s, leaf = "#2f8f3f", leaf2 = "#43a34f") {
    const g = grp(x, y, s);
    g.append(
      ell(2, 4, 20, 7, "rgba(20,60,20,.25)"),
      rect(-4, -16, 8, 18, 3, "#8a5a33"),
      circ(0, -32, 17, leaf),
      circ(-13, -20, 12, leaf2),
      circ(13, -20, 12, leaf2),
      circ(-4, -38, 8, leaf2),
    );
    return g;
  }
  const sakura = (x, y, s) => tree(x, y, s, "#f49ac1", "#f7b8d4");

  // 木の群生（本家の森。決め打ち配置でチラつきなし）
  function forest(x, y, list) {
    const g = grp(x, y, 1);
    list.forEach(([dx, dy, s, kind]) => g.append(kind === "s" ? sakura(dx, dy, s) : tree(dx, dy, s)));
    return g;
  }

  // 立体の緑の丘（本家の緑のプラ製の山）
  function hill3d(x, y, s, rot = 0) {
    const g = el("g", { transform: `translate(${x},${y}) rotate(${rot}) scale(${s})` });
    g.append(
      ell(8, 34, 150, 40, "rgba(20,60,20,.28)"),
      path("M-150,30 Q-140,-40 -70,-58 Q-20,-90 40,-70 Q120,-78 140,-14 Q160,20 120,34 Q40,52 -60,44 Q-130,50 -150,30 Z", "#1f6e30", { stroke: "#175a26", "stroke-width": 3 }),
      path("M-130,18 Q-120,-30 -60,-48 Q-15,-76 38,-58 Q105,-64 122,-12 Q100,10 40,4 Q-40,20 -130,18 Z", "#2f8f3f"),
      path("M-70,-40 Q-20,-64 30,-50 Q0,-36 -40,-30 Z", "#4aa856", { opacity: .8 }),
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
      ell(0, 4, 90, 14, "rgba(20,60,20,.22)"),
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
    g.append(
      ell(0, 3, 34, 8, "rgba(20,60,20,.22)"),
      rect(-26, -84, 52, 84, 3, color, { stroke: "rgba(0,0,0,.18)", "stroke-width": 2 }),
    );
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      g.append(rect(-18 + c * 14, -76 + r * 15, 9, 9, 1.5, win, { opacity: .85 }));
    }
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

  // ---------- 手描きSVGミニスプライト（絵文字の置き換え） ----------
  function flowerTulip(x, y, s, color = "#e0635f") {
    const g = grp(x, y, s);
    g.append(
      el("line", { x1: 0, y1: 0, x2: 0, y2: -12, stroke: "#3fa34d", "stroke-width": 2.5 }),
      path("M0,-6 Q-7,-8 -8,-14 Q-2,-13 0,-8 Z", "#57bb63"),
      path("M0,-6 Q7,-8 8,-14 Q2,-13 0,-8 Z", "#57bb63"),
      path("M-6,-16 L-6,-24 Q-3,-20 0,-24 Q3,-20 6,-24 L6,-16 Q6,-10 0,-10 Q-6,-10 -6,-16 Z", color, { stroke: "rgba(0,0,0,.15)", "stroke-width": 1.5 }),
    );
    return g;
  }
  function flowerSun(x, y, s) {
    const g = grp(x, y, s);
    g.append(el("line", { x1: 0, y1: 0, x2: 0, y2: -14, stroke: "#3fa34d", "stroke-width": 2.5 }),
      path("M0,-8 Q-8,-10 -9,-16 Q-2,-15 0,-9 Z", "#57bb63"));
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      g.append(ell(Math.cos(a) * 7, -20 + Math.sin(a) * 7, 4.5, 3, "#ffd23e", { transform: `rotate(${i * 45} ${Math.cos(a) * 7} ${-20 + Math.sin(a) * 7})` }));
    }
    g.append(circ(0, -20, 4.5, "#8a5a33"));
    return g;
  }
  function busStop(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 2, 10, 3, "rgba(20,60,20,.22)"),
      rect(-1.5, -42, 3, 42, 1, "#5a5a6a"),
      rect(-15, -60, 30, 20, 4, "#2e9be6", { stroke: "#1d6fa8", "stroke-width": 2 }),
      rect(-10, -56, 20, 9, 2, "#fff"),
      circ(-5, -45.5, 2, "#2b2b33"), circ(5, -45.5, 2, "#2b2b33"),
    );
    return g;
  }
  function chapel(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 3, 20, 5, "rgba(20,60,20,.22)"),
      rect(-16, -26, 32, 26, 2, "#fff", { stroke: "#d8c9d0", "stroke-width": 2 }),
      path("M-20,-26 L0,-42 L20,-26 Z", "#f08bb4"),
      rect(-5, -14, 10, 14, 5, "#c9a0b8"),
      path("M0,-56 q-4,-6 -8,-2 q-3,3 8,10 q11,-7 8,-10 q-4,-4 -8,2 Z", "#e0435f"),
      el("line", { x1: 0, y1: -48, x2: 0, y2: -42, stroke: "#b89aa8", "stroke-width": 2 }),
    );
    return g;
  }
  function hospital(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 3, 24, 6, "rgba(20,60,20,.22)"),
      rect(-21, -36, 42, 36, 2, "#f4f4f8", { stroke: "#c0c8d8", "stroke-width": 2 }),
      rect(-21, -36, 42, 6, 2, "#cfd8e8"),
      rect(-4, -26, 8, 18, 1, "#e0432e"), rect(-9, -21, 18, 8, 1, "#e0432e"),
      rect(-16, -12, 8, 12, 1, "#aadcf5"), rect(8, -12, 8, 12, 1, "#aadcf5"),
    );
    return g;
  }
  function fireTruck(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 5, 22, 4, "rgba(20,60,20,.22)"),
      rect(-20, -16, 40, 16, 3, "#e0432e", { stroke: "#a82a1e", "stroke-width": 2 }),
      rect(8, -24, 12, 10, 2, "#e0432e", { stroke: "#a82a1e", "stroke-width": 2 }),
      rect(10.5, -21.5, 7, 6, 1, "#aadcf5"),
      el("line", { x1: -18, y1: -18, x2: 4, y2: -18, stroke: "#f4f2ea", "stroke-width": 3 }),
      el("line", { x1: -15, y1: -21, x2: 1, y2: -21, stroke: "#f4f2ea", "stroke-width": 3 }),
      circ(-11, 0, 5.5, "#2b2b33"), circ(11, 0, 5.5, "#2b2b33"),
      circ(-11, 0, 2.2, "#ddd"), circ(11, 0, 2.2, "#ddd"),
    );
    return g;
  }
  function golf(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 0, 16, 5, "#57bb63"),
      ell(6, 0, 3.2, 1.6, "#3a3a3a"),
      el("line", { x1: 6, y1: 0, x2: 6, y2: -30, stroke: "#e8e0d0", "stroke-width": 2.5 }),
      path("M6,-30 L-10,-24 L6,-18 Z", "#e0432e"),
    );
    return g;
  }
  function bonsai(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      path("M-12,0 L12,0 L8,-8 L-8,-8 Z", "#c96f4a", { stroke: "#a85a38", "stroke-width": 1.5 }),
      path("M0,-8 Q-2,-16 4,-20", "none", { stroke: "#8a5a33", "stroke-width": 3, "stroke-linecap": "round" }),
      circ(5, -23, 6, "#3fa34d"), circ(-3, -19, 5, "#57bb63"), circ(10, -18, 4, "#57bb63"),
    );
    return g;
  }
  function bank(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 3, 26, 6, "rgba(20,60,20,.22)"),
      rect(-24, -4, 48, 5, 1, "#cfc4ae"),
      rect(-20, -26, 40, 22, 1, "#efe6d2", { stroke: "#c9b89a", "stroke-width": 2 }),
      path("M-24,-26 L0,-38 L24,-26 Z", "#e0d4ba", { stroke: "#c9b89a", "stroke-width": 2 }),
    );
    [-13, -4.5, 4.5, 13].forEach(cx => g.append(rect(cx - 2.5, -22, 5, 18, 1, "#d8ccb4")));
    return g;
  }
  function trophy(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      path("M-10,-30 L10,-30 L10,-22 Q10,-12 0,-10 Q-10,-12 -10,-22 Z", "#f4b630", { stroke: "#c98a1e", "stroke-width": 2 }),
      path("M-10,-28 Q-17,-27 -15,-20 Q-13,-16 -9,-17", "none", { stroke: "#c98a1e", "stroke-width": 2.5 }),
      path("M10,-28 Q17,-27 15,-20 Q13,-16 9,-17", "none", { stroke: "#c98a1e", "stroke-width": 2.5 }),
      rect(-2.5, -10, 5, 6, 1, "#c98a1e"),
      rect(-8, -4, 16, 4, 1, "#8a5a33"),
      ell(-4, -25, 2, 3.5, "rgba(255,255,255,.55)"),
    );
    return g;
  }
  function moneyBag(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      path("M-5,-24 Q0,-20 5,-24 L8,-19 Q16,-12 14,-4 Q12,2 0,2 Q-12,2 -14,-4 Q-16,-12 -8,-19 Z", "#c9a06a", { stroke: "#9a7444", "stroke-width": 2 }),
      rect(-6, -26, 12, 4, 2, "#9a7444"),
      txt("¥", { y: -5, "font-size": 13, "font-weight": 900, fill: "#6a4a1a" }),
    );
    return g;
  }
  function crown(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      path("M-14,0 L-15,-14 L-7,-6 L0,-17 L7,-6 L15,-14 L14,0 Z", "#f4c81e", { stroke: "#c99a1e", "stroke-width": 2 }),
      circ(-8, -3.5, 1.8, "#e0435f"), circ(0, -4.5, 1.8, "#2e9be6"), circ(8, -3.5, 1.8, "#57bb63"),
    );
    return g;
  }
  function riceGrass(x, y, s) {
    const g = grp(x, y, s);
    [[-6, -1], [0, 0], [6, -1]].forEach(([dx, k]) => {
      g.append(path(`M${dx},0 Q${dx + 2},-10 ${dx + 4 + k},-18`, "none", { stroke: "#caa53a", "stroke-width": 2, "stroke-linecap": "round" }));
      [[3, -14], [4.5, -16.5], [2, -11]].forEach(([ex, ey]) => g.append(ell(dx + ex + k, ey, 2, 1.2, "#e8c86a")));
    });
    return g;
  }
  function steam(x, y, s, color = "#e0635f") {
    const g = grp(x, y, s);
    [-8, 0, 8].forEach(dx => g.append(
      path(`M${dx},0 q-4,-6 0,-11 q4,-5 0,-11`, "none", { stroke: color, "stroke-width": 3, "stroke-linecap": "round", opacity: .85 })));
    return g;
  }
  function duckSprite(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 0, 10, 6.5, "#ffd23e", { stroke: "#d8a51e", "stroke-width": 1.5 }),
      path("M2,-2 Q10,-4 8,1 Q4,3 0,1 Z", "#f4c020"),
      circ(-7, -7, 4.5, "#ffd23e", { stroke: "#d8a51e", "stroke-width": 1.5 }),
      path("M-11,-7 L-16,-5.5 L-11,-4.5 Z", "#f4841e"),
      circ(-8, -8, 1, "#2b2b33"),
    );
    return g;
  }
  const dogSprite = () => {
    const g = grp(0, 0, 1);
    g.append(
      ell(0, -7, 11, 6.5, "#c9a06a", { stroke: "#9a7444", "stroke-width": 1.5 }),
      circ(10, -13, 5.5, "#c9a06a", { stroke: "#9a7444", "stroke-width": 1.5 }),
      path("M6,-17 L4,-23 L9,-19 Z", "#9a7444"), path("M13,-18 L15,-23 L16,-17 Z", "#9a7444"),
      path("M-10,-10 Q-16,-16 -12,-18", "none", { stroke: "#9a7444", "stroke-width": 2.5, "stroke-linecap": "round" }),
      rect(-7, -3, 3, 4, 1, "#b8895a"), rect(4, -3, 3, 4, 1, "#b8895a"),
      circ(12, -14, 1, "#2b2b33"), circ(15.5, -11.5, 1.2, "#3a3a3a"),
    );
    return g;
  };
  const catSprite = () => {
    const g = grp(0, 0, 1);
    g.append(
      ell(0, -6, 10, 6, "#9aa0ab", { stroke: "#6a707b", "stroke-width": 1.5 }),
      circ(9, -12, 5, "#9aa0ab", { stroke: "#6a707b", "stroke-width": 1.5 }),
      path("M5,-15 L4,-21 L9,-17 Z", "#9aa0ab", { stroke: "#6a707b", "stroke-width": 1.2 }),
      path("M11,-17 L14,-21 L14.5,-15 Z", "#9aa0ab", { stroke: "#6a707b", "stroke-width": 1.2 }),
      path("M-9,-8 Q-16,-10 -15,-18", "none", { stroke: "#6a707b", "stroke-width": 2.5, "stroke-linecap": "round" }),
      rect(-6, -2.5, 3, 3.5, 1, "#8a909b"), rect(3, -2.5, 3, 3.5, 1, "#8a909b"),
      circ(8, -13, 1, "#2b2b33"), circ(11.5, -13, 1, "#2b2b33"),
    );
    return g;
  };
  const personSprite = () => {
    const g = grp(0, 0, 1);
    g.append(
      circ(0, -28, 5, "#f2c9a0"),
      path("M-5,-33 Q0,-38 5,-33 L5,-31 L-5,-31 Z", "#3a3a44"),
      path("M-6,-22 L6,-22 L4,-8 L-4,-8 Z", "#3a3a44"),
      rect(-4, -8, 3, 8, 1, "#2b2b33"), rect(1, -8, 3, 8, 1, "#2b2b33"),
      rect(6, -12, 7, 6, 1, "#8a5a33"),
      el("line", { x1: 5, y1: -20, x2: 8, y2: -12, stroke: "#3a3a44", "stroke-width": 2.5 }),
    );
    return g;
  };

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
      path("M-90,0 Q-96,-38 -40,-46 Q10,-62 60,-40 Q104,-28 92,8 Q76,40 10,38 Q-70,42 -90,0 Z", "#7ec8f5", { stroke: "#5aa9dd", "stroke-width": 4 }),
      ell(-24, -8, 30, 9, "#b9e4fb"),
      ell(40, 10, 16, 5, "#b9e4fb", { opacity: .8 }),
    );
    if (withDuck) g.append(duckSprite(20, -8, 1.1));
    return g;
  }

  function onsen(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 0, 40, 15, "#9fd8ef", { stroke: "#76b9d8", "stroke-width": 3 }),
      circ(-46, 2, 8, "#9a9aa5"), circ(46, 0, 10, "#8a8a95"),
      steam(0, -14, 1),
    );
    return g;
  }

  // ゴールの御殿
  function palace(x, y, s) {
    const g = grp(x, y, s);
    g.append(
      ell(0, 4, 84, 14, "rgba(20,60,20,.25)"),
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
      txt("START!", { y: -72, "font-size": 21, "font-weight": 900, fill: "#e8590c" }),
    );
    return g;
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
  function walker(x, y, builder, dur) {
    const g = grp(x, y, 1);
    const e = builder();
    e.classList.add("sc-walker");
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

  // ---------- 中央の大型ルーレット（本家の緑の台座＋円盤。タップで実際に回す） ----------
  const WHEEL_C = { x: 1750, y: 1490 };
  const WHEEL_COLORS = ["#e8433e", "#f4841e", "#ffd23e", "#57b947", "#2f9bd8", "#3b58c9", "#8e44ad", "#e84393"];

  function wheel(parent) {
    const g = grp(WHEEL_C.x, WHEEL_C.y, 1, "big-wheel");

    // 緑の台座（有機的なブロブ）
    g.append(
      path("M-420,40 Q-440,-160 -300,-260 Q-160,-390 40,-370 Q260,-400 360,-260 Q450,-140 410,30 Q380,220 180,300 Q-20,380 -240,300 Q-400,230 -420,40 Z",
        "#237a33", { stroke: "#1a5f27", "stroke-width": 5 }),
      path("M-390,30 Q-405,-150 -280,-240 Q-150,-360 40,-340 Q245,-370 335,-240 Q415,-130 380,25 Q350,195 165,270 Q-15,345 -225,272 Q-370,210 -390,30 Z",
        "#2f8f3f"),
      path("M-300,-180 Q-160,-300 40,-290 Q120,-296 190,-260 Q60,-290 -80,-260 Q-220,-230 -300,-180 Z", "#4aa856", { opacity: .7 }),
    );

    // 白い外輪
    g.append(
      circ(0, 8, 305, "rgba(0,0,0,.25)"),
      circ(0, 0, 305, "#f4f2ea", { stroke: "#c9c4b4", "stroke-width": 5 }),
    );
    // 外輪のペグ
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12;
      g.append(circ(Math.cos(a) * 288, Math.sin(a) * 288, 7, "#dedacb", { stroke: "#b8b2a0", "stroke-width": 2 }));
    }

    // 数字盤（ゆっくり回る）
    const disc = grp(0, 0, 1, "wheel-idle");
    for (let i = 0; i < 8; i++) {
      const a0 = (i * 45 - 90 - 22.5) * Math.PI / 180;
      const a1 = (i * 45 - 90 + 22.5) * Math.PI / 180;
      const r = 268;
      disc.append(path(
        `M0,0 L${(Math.cos(a0) * r).toFixed(1)},${(Math.sin(a0) * r).toFixed(1)} A${r},${r} 0 0 1 ${(Math.cos(a1) * r).toFixed(1)},${(Math.sin(a1) * r).toFixed(1)} Z`,
        WHEEL_COLORS[i], { stroke: "#fff", "stroke-width": 5 }));
      const am = (i * 45 - 90) * Math.PI / 180;
      const nx = Math.cos(am) * 205, ny = Math.sin(am) * 205;
      disc.append(txt(String(i + 1), {
        x: nx, y: ny, "font-size": 96, "font-weight": 900, fill: "#fff",
        "dominant-baseline": "central", "paint-order": "stroke",
        stroke: "rgba(0,0,0,.35)", "stroke-width": 8,
        transform: `rotate(${i * 45} ${nx.toFixed(1)} ${ny.toFixed(1)})`,
      }));
    }
    g.append(disc);

    // 中央のスピナー（十字の腕＋つまみ）
    const arms = grp(0, 0, 1);
    arms.append(
      rect(-14, -150, 28, 300, 12, "rgba(255,255,255,.85)", { stroke: "#d0ccc0", "stroke-width": 2 }),
      rect(-150, -14, 300, 28, 12, "rgba(255,255,255,.85)", { stroke: "#d0ccc0", "stroke-width": 2 }),
      circ(0, 0, 46, "#fff", { stroke: "#c9c4b4", "stroke-width": 4 }),
      circ(0, 0, 22, "#e8433e", { stroke: "#b3261e", "stroke-width": 3 }),
      ell(-7, -8, 8, 5, "rgba(255,255,255,.7)"),
    );
    g.append(arms);

    // タップで実際のルーレットを回す
    g.style.cursor = "pointer";
    g.addEventListener("click", () => {
      const b = document.getElementById("btn-spin");
      if (b && !b.closest("[hidden]") && !b.disabled) b.click();
    });
    const tt = el("title", {});
    tt.textContent = "ルーレット（タップで回す）";
    g.appendChild(tt);

    parent.append(g);
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
    () => { const g = grp(0, 0, 1); g.append(rect(-32, -26, 64, 26, 3, "#f6e9d0", { stroke: "#c9b89a", "stroke-width": 2 }), path("M-38,-26 Q0,-46 38,-26 Z", "#8a4a3a"), rect(-22, -18, 12, 10, 1, "#ffe9a8"), rect(10, -18, 12, 10, 1, "#aadcf5"), rect(-5, -14, 10, 14, 1, "#7a5a3a"), steam(32, -32, .55)); return g; },
    // 11 無人島のヴィラ
    () => { const g = grp(0, 0, 1); g.append(ell(0, 2, 48, 13, "#7ec8f5", { opacity: .85 }), ell(0, 0, 32, 9, "#f4e2b8"), path("M-16,-2 L-4,-20 L8,-2 Z", "#c9a06a"), rect(-7, -8, 7, 8, 1, "#8a5a33"), palm(18, -2, .85)); return g; },
    // 12 お城
    () => { const g = grp(0, 0, 1); g.append(ell(0, 2, 52, 13, "#8fd17e"), rect(-34, -34, 16, 34, 2, "#e8e0d8", { stroke: "#b0a898", "stroke-width": 2 }), path("M-36,-34 L-26,-50 L-16,-34 Z", "#5a6a9a"), rect(18, -34, 16, 34, 2, "#e8e0d8", { stroke: "#b0a898", "stroke-width": 2 }), path("M16,-34 L26,-50 L36,-34 Z", "#5a6a9a"), rect(-14, -44, 28, 44, 2, "#f0e8e0", { stroke: "#b0a898", "stroke-width": 2 }), path("M-16,-44 L0,-62 L16,-44 Z", "#5a6a9a"), el("line", { x1: 0, y1: -62, x2: 0, y2: -74, stroke: "#8a7a6a", "stroke-width": 2 }), path("M0,-74 L12,-70 L0,-66 Z", "#e0432e"), rect(-6, -14, 12, 14, 6, "#6a5a4a")); return g; },
    // 13 月の土地付きドーム
    () => { const g = grp(0, 0, 1); g.append(ell(0, 0, 42, 11, "#cfcfe0", { stroke: "#a8a8c0", "stroke-width": 2 }), circ(-22, -2, 4, "#b0b0c8"), circ(16, 1, 3, "#b0b0c8"), path("M-24,0 A24,24 0 0 1 24,0 Z", "rgba(170,220,245,.55)", { stroke: "#8ac0e0", "stroke-width": 2.5 }), rect(-6, -10, 12, 10, 2, "#e8e8f0"), el("line", { x1: 30, y1: 0, x2: 30, y2: -22, stroke: "#a8a8c0", "stroke-width": 2 }), path("M30,-22 L42,-18 L30,-14 Z", "#5aa9dd")); return g; },
  ];

  // 物件の設置場所（新レイアウトの空き地に点在）
  const HOUSE_SPOTS = [
    { hi: 0,  x: 560,  y: 2060, s: 1 },    // 山小屋→ふもとの里（左下）
    { hi: 1,  x: 2300, y: 1630, s: 1 },    // 古民家→熟年の里（右）
    { hi: 2,  x: 300,  y: 415,  s: 1 },    // トレーラー→公園わき（左上）
    { hi: 3,  x: 720,  y: 480,  s: 1 },    // アパート→左上の住宅地
    { hi: 4,  x: 900,  y: 1260, s: 1 },    // ツリーハウス→中央の森
    { hi: 5,  x: 510,  y: 445,  s: 1 },    // ログハウス→左上の住宅地
    { hi: 6,  x: 620,  y: 1190, s: 1 },    // 一軒家→中央の住宅地
    { hi: 7,  x: 2480, y: 280,  s: 1 },    // マンション→右上の街
    { hi: 8,  x: 780,  y: 1680, s: .95 },  // 海辺の別荘→池のほとり
    { hi: 9,  x: 1160, y: 1320, s: 1 },    // タワマン→ルーレット西の街
    { hi: 10, x: 2530, y: 1470, s: 1 },    // 温泉付き豪邸→温泉郷
    { hi: 11, x: 320,  y: 1690, s: 1 },    // 無人島ヴィラ→西の湖畔
    { hi: 12, x: 260,  y: 1370, s: .95 },  // お城→丘の上
    { hi: 13, x: 2880, y: 200,  s: 1 },    // 月ドーム→右上の彼方
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
      const g = grp(x, y, s * 1.5, "hs hs-sale");   // マップ上の家を大きく表示
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

  // ---------- 描画 ----------
  function render(parent) {
    // 芝生の濃淡（本家の芝マット感）
    const gGrass = el("g", {});
    [
      [420, 350, 330, 200], [1500, 220, 420, 160], [2550, 500, 340, 220],
      [600, 900, 380, 220], [1700, 620, 460, 180], [2500, 1100, 300, 260],
      [400, 1500, 420, 280], [1300, 1550, 320, 260], [2400, 1900, 380, 240],
      [900, 2050, 360, 180], [1900, 1250, 300, 200], [150, 1000, 260, 240],
    ].forEach(([cx, cy, rx, ry]) => gGrass.append(ell(cx, cy, rx, ry, "#86c964", { opacity: .55 })));
    // 芝の刈り込みストライプ（うっすら）
    for (let i = 0; i < 8; i++) {
      gGrass.append(el("rect", { x: 0, y: i * 300, width: 3000, height: 150, fill: "#70b350", opacity: .18 }));
    }
    parent.append(gGrass);

    const d = el("g", {});

    // --- 立体の丘（本家の緑のプラ山） ---
    d.append(
      hill3d(210, 105, .9, -6),
      hill3d(2620, 690, .8, 8),
      hill3d(180, 1180, 1.05, 4),
      hill3d(300, 1980, .9, -4),
      hill3d(1240, 1700, .7, 10),
    );

    // --- 森（木の群生を盤のあちこちに） ---
    d.append(
      forest(360, 120, [[-60, 0, .9], [0, 18, 1.05], [70, 4, .85], [130, 20, .95]]),                 // 上辺左
      forest(1400, 105, [[-50, 0, .85], [20, 14, 1], [90, 2, .8]]),                                   // 上辺中央
      forest(2300, 120, [[-40, 8, .9], [30, 0, 1], [100, 16, .85], [-110, 14, .8]]),                  // 上辺右
      forest(180, 640, [[0, 0, .95], [55, 22, .8], [-15, 40, .85]]),                                  // 左辺
      forest(880, 330, [[0, 0, .8, "s"], [60, 14, .9], [-55, 16, .85, "s"]]),                         // 左上住宅地の桜
      forest(2780, 420, [[0, 0, .9], [-40, 30, .8], [30, 40, .95]]),                                  // 右上
      forest(1350, 770, [[0, 0, .85], [60, 10, .75], [-60, 12, .8]]),                                 // 中央上
      forest(500, 1120, [[0, 0, .9], [70, 18, 1], [-60, 20, .8], [10, 44, .85]]),                     // 中央左の森
      forest(950, 1420, [[0, 0, .9], [60, 16, .8], [-55, 10, .85]]),                                  // 中央の森
      forest(2680, 1250, [[0, 0, .85], [-45, 26, .95], [40, 34, .8]]),                                // 右の森
      forest(2150, 1350, [[0, 0, .8], [55, 12, .9]]),                                                 // ルーレット東
      forest(150, 1850, [[0, 0, .9], [60, 10, .8]]),                                                  // 左下
      forest(700, 1940, [[0, 0, .85, "s"], [60, 18, .75, "s"]]),                                      // ふもとの桜
      forest(1600, 2020, [[0, 0, .8], [65, 8, .9], [-60, 14, .75]]),                                  // 下辺中央
      forest(2900, 950, [[0, 0, .85], [-30, 40, .75]]),                                               // 右辺
      forest(2880, 1900, [[0, 0, .9], [-50, 20, .8]]),                                                // 右下
    );

    // --- 池（左中央の湖畔） ---
    d.append(pond(650, 1620, 1.15, true));

    // --- 各エリアの建物・小物 ---
    d.append(
      // スタート＆公園
      startArch(230, 138, .9),
      flowerTulip(420, 300, 1), flowerSun(600, 292, 1), flowerTulip(180, 320, .9, "#f4b630"),
      // 大学ルートの学び舎（B1ループの内側）
      school(1560, 350, .85),
      sakura(1380, 330, .8), sakura(1720, 340, .75),
      // 就職ルートのオフィス街（B2の下）
      office(1240, 560, .55, "#9fb6c9"), office(1330, 555, .5, "#c9a9b0"),
      // 青春の街（C東側の内側ポケット）
      office(2050, 580, .45, "#cbb59b"),
      chapel(2160, 578, .7),
      // 左上の住宅地
      busStop(620, 405, .9),
      // ギャンブル横丁（D2ループまわり）
      neonSign(700, 690, .55),
      dice(540, 720, .7, -15), playCards(830, 735, .8),
      sparkle(640, 660, .9), sparkle(880, 700, .8), sparkle(500, 900, .8),
      lamp(180, 1020, .8),
      // 波乱の40代（Eの下）
      hospital(430, 1125, .95), fireTruck(760, 1130, .95),
      // 中央西の街（ルーレット左）
      office(1120, 1520, .6, "#b9a9c9"), golf(1210, 1565, 1),
      // 熟年の里（右コリドー内側）
      torii(2380, 1320, 1),
      onsen(2500, 1560, .95),
      bonsai(2250, 1255, 1), bank(2600, 1185, .9),
      // 黄金ロード（下辺の内側）
      sparkle(1200, 1990, 1), sparkle(1800, 1960, .9), sparkle(2300, 2000, 1.1), sparkle(2600, 1930, .8),
      trophy(1400, 1980, 1), moneyBag(2050, 1985, 1), crown(2450, 1945, 1),
      slot(2470, 1965, .8),
      lamp(1100, 2000, .8), lamp(2200, 1950, .8),
      // フィナーレ＆ゴール
      mountains(430, 1900, .9),
      palace(2880, 2010, .95),
      riceGrass(2680, 1958, 1),
    );

    // --- 章タイトル看板 ---
    d.append(
      signboard(450, 325, .95, "第1章", "はじまりの公園"),
      signboard(990, 150, .85, "第2章", "進路の選択"),
      signboard(2680, 330, .85, "第3章", "青春の街"),
      signboard(1180, 1235, .85, "第4章", "人生の岐路"),
      signboard(520, 1200, .9, "第5章", "波乱の40代"),
      signboard(2620, 1080, .85, "第6章", "熟年の階段"),
      signboard(1700, 2010, .9, "第7章", "黄金ロード"),
      signboard(2640, 2005, .9, "終章", "フィナーレ"),
    );

    // --- 動く住人 ---
    d.append(
      walker(560, 1470, dogSprite, 13),
      walker(1850, 1990, catSprite, 17),
      walker(760, 940, personSprite, 21),
      birds(300, 80, 1, "#5a7a9a", 34),
      birds(1500, 1150, .8, "#8a5a4a", 44),
    );
    parent.append(d);

    // --- 中央の大型ルーレット ---
    wheel(parent);
  }

  return { render, houses };
})();
