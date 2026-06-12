// 統一タッチの手描きSVGアイコン集（絵文字の置き換え）
// 設計キャンバスは40x40（中心0,0）。Icons.gNode()=盤面用 / Icons.el()=HTML用

const Icons = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const I = "#3b2d23";                       // 共通アウトライン色
  const O  = { stroke: I, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" };
  const O3 = { stroke: I, "stroke-width": 2.6, "stroke-linejoin": "round", "stroke-linecap": "round" };

  function el(n, a) { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; }
  const P  = (d, fill, ex) => el("path", Object.assign({ d, fill }, O, ex));
  const R  = (x, y, w, h, rx, fill, ex) => el("rect", Object.assign({ x, y, width: w, height: h, rx, fill }, O, ex));
  const Ci = (cx, cy, r, fill, ex) => el("circle", Object.assign({ cx, cy, r, fill }, O, ex));
  const E  = (cx, cy, rx, ry, fill, ex) => el("ellipse", Object.assign({ cx, cy, rx, ry, fill }, O, ex));
  const L  = (x1, y1, x2, y2, w, ex) => el("line", Object.assign({ x1, y1, x2, y2, stroke: I, "stroke-width": w || 2, "stroke-linecap": "round" }, ex));
  const T  = (t, x, y, size, fill, ex) => { const e = el("text", Object.assign({ x, y, "font-size": size, "font-weight": 900, fill, "text-anchor": "middle", stroke: "none" }, ex)); e.textContent = t; return e; };
  const G  = (tr, ...kids) => { const g = el("g", tr ? { transform: tr } : {}); kids.forEach(k => g.appendChild(k)); return g; };

  const GOLD = "#f6c945", GOLDD = "#d99a1e", RED = "#e2554a", REDD = "#b13a31";
  const BLUE = "#4a90d9", GREEN = "#4cb86b", PINK = "#f06a9a", CREAM = "#fff8ee";
  const GREY = "#9aa3ad", SILVER = "#cfd6dd", BROWN = "#9a6a44", SKIN = "#ffd9b0";

  function star(cx, cy, s, fill) {
    let d = "";
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * .45 : s;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      d += (i ? "L" : "M") + (cx + Math.cos(a) * r).toFixed(1) + "," + (cy + Math.sin(a) * r).toFixed(1);
    }
    return P(d + "Z", fill, { "stroke-width": 1.6 });
  }
  function pip(cx, cy) { return Ci(cx, cy, 2, REDD, { stroke: "none" }); }

  // ---------- アイコン定義 ----------
  const DEFS = {
    // ◆ マス用
    flag: g => g.append(
      L(-10, 17, -10, -16, 4),
      R(-10, -16, 24, 15, 2, "#fff"),
      R(-10, -16, 6, 7.5, 0, I, { stroke: "none" }), R(2, -16, 6, 7.5, 0, I, { stroke: "none" }),
      R(-4, -8.5, 6, 7.5, 0, I, { stroke: "none" }), R(8, -8.5, 6, 7.5, 0, I, { stroke: "none" }),
    ),
    coins: g => g.append(
      E(0, 9, 12, 5, GOLDD), E(0, 3, 12, 5, GOLD), E(0, -3, 12, 5, GOLDD), E(0, -9, 12, 5, GOLD),
      T("¥", 0, -6, 9, I),
    ),
    moneyfly: g => g.append(
      P("M-10,-2 q-8,-9 -15,-3 q5,1 7,4 q-4,0 -6,3 q9,3 14,-1 z", "#fff"),
      G("rotate(-8)", R(-9, -6, 20, 13, 2, "#cfe8cf"), Ci(1, .5, 4, "#a9d3a9"), T("¥", 1, 3.5, 8, I)),
      L(13, 10, 17, 13, 2, { opacity: .6 }), L(11, 14, 14, 16, 2, { opacity: .6 }),
    ),
    payenv: g => g.append(
      R(-13, -9, 26, 19, 3, "#f0e6d2"),
      P("M-13,-9 L0,3 L13,-9", "none"),
      Ci(0, 6, 6, GOLD), T("¥", 0, 9, 8, I),
    ),
    cardgift: g => g.append(
      G("rotate(9)", R(-8, -12, 17, 25, 3, "#ffe9c2")),
      G("rotate(-10)", R(-10, -13, 18, 26, 3, "#fff"), star(-1, -3, 6, GOLD)),
      star(13, -11, 3.5, "#fff"),
    ),
    arrowfwd: g => g.append(
      L(-16, -5, -10, -5, 2.5, { opacity: .6 }), L(-17, 3, -12, 3, 2.5, { opacity: .6 }),
      P("M-8,-6 L4,-6 L4,-12 L16,0 L4,12 L4,6 L-8,6 Z", GREEN),
    ),
    arrowback: g => g.append(
      P("M8,-6 L-4,-6 L-4,-12 L-16,0 L-4,12 L-4,6 L8,6 Z", "#fb7185"),
      L(12, -5, 17, -5, 2.5, { opacity: .6 }), L(13, 3, 18, 3, 2.5, { opacity: .6 }),
    ),
    sleep: g => g.append(
      P("M-2,14 a11,11 0 0 1 -2,-21 a9,9 0 0 0 8,16 a11,11 0 0 1 -6,5 z", GOLD),
      P("M2,-14 h8 l-8,8 h8", "none", { "stroke-width": 2.6 }),
      P("M12,-4 h5.5 l-5.5,5.5 h5.5", "none", { "stroke-width": 2.2 }),
    ),
    signpost: g => g.append(
      L(0, 17, 0, -15, 4),
      P("M-17,-14 h13 l4,4.5 l-4,4.5 h-13 z", RED),
      P("M17,-2 h-13 l-4,4.5 l4,4.5 h13 z", BLUE),
    ),
    briefcase: g => g.append(
      P("M-5,-7 v-4 h10 v4", "none", { "stroke-width": 2.4 }),
      R(-13, -7, 26, 18, 3, BROWN),
      L(-13, 0, 13, 0, 2),
      R(-3, -2, 6, 6, 1.5, GOLD),
    ),
    ring: g => g.append(
      Ci(0, 4, 9, "none", { stroke: I, "stroke-width": 7.5 }),
      Ci(0, 4, 9, "none", { stroke: GOLD, "stroke-width": 4 }),
      P("M0,-13 L5,-8 L0,-3 L-5,-8 Z", "#bfe9ff"),
      L(-2, -10, -1, -9, 1.4, { stroke: "#fff" }),
    ),
    baby: g => g.append(
      Ci(0, 0, 12, SKIN),
      P("M-2,-11 q2,-4 6,-3", "none", { "stroke-width": 2.4 }),
      Ci(-4.5, -2, 1.6, I, { stroke: "none" }), Ci(4.5, -2, 1.6, I, { stroke: "none" }),
      Ci(0, 6, 3.4, PINK), Ci(0, 6, 1.4, "#fff", { "stroke-width": 1.2 }),
    ),
    houseicon: g => g.append(
      R(-10, -2, 20, 16, 2, CREAM),
      P("M-14,-2 L0,-14 L14,-2 Z", RED),
      R(-3, 5, 6, 9, 1, BROWN),
      R(5, 2, 5, 5, 1, "#aadcf5"),
    ),
    shield: g => g.append(
      P("M0,-14 C8,-11 12,-10 12,-4 C12,6 6,12 0,15 C-6,12 -12,6 -12,-4 C-12,-10 -8,-11 0,-14 Z", BLUE),
      P("M-5,0 L-1,4 L6,-5", "none", { stroke: "#fff", "stroke-width": 3.4 }),
    ),
    shieldheart: g => g.append(
      P("M0,-14 C8,-11 12,-10 12,-4 C12,6 6,12 0,15 C-6,12 -12,6 -12,-4 C-12,-10 -8,-11 0,-14 Z", BLUE),
      P("M0,7 C-7,1 -6,-5 -2,-5 C0,-5 0,-3 0,-3 C0,-3 0,-5 2,-5 C6,-5 7,1 0,7 Z", PINK, { "stroke-width": 1.6 }),
    ),
    shieldflame: g => g.append(
      P("M0,-14 C8,-11 12,-10 12,-4 C12,6 6,12 0,15 C-6,12 -12,6 -12,-4 C-12,-10 -8,-11 0,-14 Z", GREY),
      P("M0,-7 C3,-3 5.5,-1 5.5,3 C5.5,7 3,9 0,9 C-3,9 -5.5,7 -5.5,3 C-5.5,-1 -2.5,-3 0,-7 Z", "#ff7b2e", { "stroke-width": 1.6 }),
    ),
    chartup: g => g.append(
      L(-13, 13, 14, 13, 2.4), L(-13, 13, -13, -13, 2.4),
      P("M-10,9 L-3,2 L2,6 L11,-6", "none", { stroke: GREEN, "stroke-width": 3.4 }),
      P("M11,-6 L4,-8 L9,-13 Z", GREEN, { "stroke-width": 1.6 }),
    ),
    sloticon: g => g.append(
      R(-12, -14, 24, 24, 4, "#8e44ad"),
      R(-8, -10, 16, 9, 2, "#fff8dc"),
      T("777", 0, -3.4, 7, REDD),
      L(12, -8, 16.5, -13, 2.6), Ci(16.5, -14, 2.6, RED),
      R(-6, 2, 12, 5, 1.5, GOLD),
    ),
    ticket: g => g.append(
      G("rotate(-6)", R(-14, -8, 28, 17, 3, GOLD),
        L(4, -8, 4, 9, 1.6, { "stroke-dasharray": "2.5 2.5" }),
        star(-5, .5, 5, "#fff")),
    ),
    ticketgem: g => g.append(
      G("rotate(-6)", R(-14, -8, 28, 17, 3, "#cfd8e8"),
        L(4, -8, 4, 9, 1.6, { "stroke-dasharray": "2.5 2.5" })),
      P("M-5,-6 L0,-11 L5,-6 L0,3 Z M-5,-6 h10", "#7cf5ff", { "stroke-width": 1.8 }),
      star(11, 8, 3.5, "#fff"),
    ),
    storm: g => g.append(
      Ci(-6, -7, 6.5, "#6b7686"), Ci(3, -9, 7.5, "#7d8898"), E(0, -4, 12, 6, "#6b7686"),
      P("M2,1 L-4,9 h4 l-2,8 L7,7 h-4 l3,-6 z", GOLD, { "stroke-width": 1.8 }),
    ),
    medcross: g => g.append(
      R(-12, -12, 24, 24, 6, "#fff"),
      P("M-3,-9 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 z", RED, { "stroke-width": 1.8 }),
    ),
    flame: g => g.append(
      P("M0,-14 C5,-8 10,-3 10,4 C10,11 5,15 0,15 C-5,15 -10,11 -10,4 C-10,-3 -5,-7 0,-14 Z", "#ff7b2e"),
      P("M0,-3 C2.5,0 5,2 5,6 C5,10 2.5,12 0,12 C-2.5,12 -5,10 -5,6 C-5,2 -2.5,0 0,-3 Z", GOLD, { "stroke-width": 1.4 }),
    ),
    tornado: g => g.append(
      E(0, -9, 12, 4.5, "#8a97a8"),
      E(-1, -2, 8.5, 3.5, "#9aa7b8"),
      E(-3, 4.5, 5.5, 2.8, "#aab4c4"),
      P("M-5,8 q-2,4 -7,5", "none", { "stroke-width": 2.4 }),
    ),
    boxicon: g => g.append(
      R(-11, -2, 22, 16, 2, "#c9a06a"),
      P("M-11,-2 l-5,-7 l10,0 z", "#b8895a"), P("M11,-2 l5,-7 l-10,0 z", "#b8895a"),
      R(-5, -8, 10, 6, 1, "#fff"),
      L(-11, 5, 11, 5, 1.6, { opacity: .5 }),
    ),
    rocket: g => g.append(
      P("M0,-16 C5,-11 7,-4 7,3 L-7,3 C-7,-4 -5,-11 0,-16 Z", "#fff"),
      Ci(0, -6, 3.4, "#aadcf5"),
      P("M-7,-1 L-12,6 L-7,6 Z", RED), P("M7,-1 L12,6 L7,6 Z", RED),
      P("M-3,4 C-3,9 3,9 3,4 L0,11 Z", GOLD, { "stroke-width": 1.6 }),
    ),
    rocketup: g => g.append(
      G("rotate(38)",
        P("M0,-14 C4,-10 5.5,-4 5.5,2 L-5.5,2 C-5.5,-4 -4,-10 0,-14 Z", "#fff"),
        Ci(0, -5, 2.6, "#aadcf5"),
        P("M-5.5,-1 L-9,5 L-5.5,5 Z", RED), P("M5.5,-1 L9,5 L5.5,5 Z", RED)),
      P("M-13,11 L-9,7 M-9,13 L-5,9", "none", { stroke: GOLD, "stroke-width": 2.6 }),
      star(12, -12, 3.5, GOLD),
    ),
    chartdown: g => g.append(
      L(-13, 13, 14, 13, 2.4), L(-13, -13, -13, 13, 2.4),
      P("M-10,-9 L-3,-2 L2,-6 L11,4", "none", { stroke: RED, "stroke-width": 3.4 }),
      P("M11,4 L4,5 L10,10 Z", RED, { "stroke-width": 1.6 }),
    ),
    giftbox: g => g.append(
      R(-11, -3, 22, 16, 2, RED),
      R(-13, -9, 26, 7, 2, REDD),
      R(-2.5, -9, 5, 22, 0, GOLD, { "stroke-width": 1.6 }),
      P("M0,-9 C-3,-16 -10,-15 -8,-10 C-7,-8 -3,-8 0,-9 Z", GOLD, { "stroke-width": 1.6 }),
      P("M0,-9 C3,-16 10,-15 8,-10 C7,-8 3,-8 0,-9 Z", GOLD, { "stroke-width": 1.6 }),
    ),
    dicepair: g => g.append(
      G("rotate(-10)", R(-14, -10, 16, 16, 4, "#fff"), pip(-9.5, -5.5), pip(-3.5, 1), pip(-9.5, 1), pip(-3.5, -5.5)),
      G("rotate(12)", R(1, -3, 14, 14, 3.5, "#fff"), pip(5, 1), pip(11, 7)),
    ),
    swords: g => {
      const blade = rot => G(`rotate(${rot})`,
        P("M0,-16 L3,-12 L2.5,5 L-2.5,5 L-3,-12 Z", SILVER),
        R(-6, 5, 12, 3.4, 1.5, GOLDD),
        R(-2, 8.4, 4, 7, 1.5, BROWN),
      );
      g.append(blade(-38), blade(38));
    },
    crown: g => g.append(
      P("M-13,7 L-13,-5 L-6,1 L0,-11 L6,1 L13,-5 L13,7 Z", GOLD),
      R(-13, 7, 26, 5.5, 1.5, GOLDD),
      Ci(0, -11, 2.2, RED, { "stroke-width": 1.6 }), Ci(-13, -5, 2, BLUE, { "stroke-width": 1.6 }), Ci(13, -5, 2, BLUE, { "stroke-width": 1.6 }),
    ),

    // ◆ 職業
    stetho: g => g.append(
      P("M-9,-13 v8 a9,9 0 0 0 18,0 v-8", "none", O3),
      P("M0,4 v4 a7,7 0 0 0 11,3", "none", { "stroke-width": 2.6 }),
      Ci(13, 8, 4.5, SILVER),
      Ci(-9, -14, 2.2, I, { stroke: "none" }), Ci(9, -14, 2.2, I, { stroke: "none" }),
    ),
    scale: g => g.append(
      L(0, -13, 0, 11, 2.6), L(-12, -9, 12, -9, 2.6),
      P("M-17,-2 a5.5,5.5 0 0 0 11,0 z", GOLD, { "stroke-width": 1.8 }),
      P("M6,-2 a5.5,5.5 0 0 0 11,0 z", GOLD, { "stroke-width": 1.8 }),
      L(-12, -9, -11.5, -3, 1.4), L(12, -9, 11.5, -3, 1.4),
      P("M-7,15 h14 l-3,-4 h-8 z", BROWN),
    ),
    wingsbadge: g => g.append(
      P("M-5,0 q-9,-7 -16,-3 q4,1.5 5.5,3.5 q-3.5,0 -5.5,2 q8,3.5 16,-.5 z", SILVER),
      P("M5,0 q9,-7 16,-3 q-4,1.5 -5.5,3.5 q3.5,0 5.5,2 q-8,3.5 -16,-.5 z", SILVER),
      Ci(0, 0, 6, GOLD),
      star(0, 0.5, 3.4, "#fff"),
    ),
    laptop: g => g.append(
      R(-10, -13, 20, 14, 2, "#4a5568"),
      R(-8, -11, 16, 10, 1, "#7cc6f0"),
      P("M-13,1 h26 l4,7 h-34 z", GREY),
      L(-4, 4.5, 4, 4.5, 1.8),
    ),
    mortar: g => g.append(
      P("M0,-12 L17,-5 L0,2 L-17,-5 Z", "#3d4451"),
      P("M-7,-2 v6 c0,3 14,3 14,0 v-6", "#3d4451"),
      L(15, -5, 15, 6, 1.8), Ci(15, 8, 2.2, GOLD, { "stroke-width": 1.6 }),
    ),
    gamepad: g => g.append(
      P("M-9,-8 h18 a8,8 0 0 1 8,7 l1,6 a4.5,4.5 0 0 1 -8,3.5 l-3,-3.5 h-14 l-3,3.5 a4.5,4.5 0 0 1 -8,-3.5 l1,-6 a8,8 0 0 1 8,-7 z", "#6a5acd"),
      P("M-10,-3 v6 M-13,0 h6", "none", { stroke: "#fff", "stroke-width": 2.6 }),
      Ci(8, -2, 2.2, GOLD, { "stroke-width": 1.4 }), Ci(13, 2, 2.2, RED, { "stroke-width": 1.4 }),
    ),
    astro: g => g.append(
      Ci(0, 0, 13, "#fff"),
      P("M-8,-5 a8,8 0 0 1 16,0 v4 a8,6 0 0 1 -16,0 z", "#7cc6f0"),
      L(-3, -6, 3, -6, 2, { stroke: "#fff", opacity: .9 }),
      R(-4, 11, 8, 5, 2, GREY),
    ),
    necktie: g => g.append(
      P("M-9,-14 L0,-5 L9,-14 L5,-15 L0,-10 L-5,-15 Z", "#fff"),
      P("M0,-5 L4.5,-1 L2,12 L0,15.5 L-2,12 L-4.5,-1 Z", RED),
      L(-1.5, -1, 1.5, -1, 1.6),
    ),
    govbld: g => g.append(
      P("M-15,-5 L0,-13 L15,-5 Z", CREAM),
      R(-12, -5, 5, 14, 1, "#e6dcc4"), R(-2.5, -5, 5, 14, 1, "#e6dcc4"), R(7, -5, 5, 14, 1, "#e6dcc4"),
      R(-15, 9, 30, 5, 1.5, CREAM),
    ),
    hammer: g => g.append(
      G("rotate(-40)",
        R(-2, -4, 4, 19, 2, BROWN),
        R(-9, -13, 18, 9, 2.5, GREY),
        L(-9, -8.5, 9, -8.5, 1.4, { opacity: .4 })),
    ),
    scissors: g => g.append(
      L(-9, -13, 7, 6, 3.4, { stroke: SILVER }), L(9, -13, -7, 6, 3.4, { stroke: SILVER }),
      L(-9, -13, 7, 6, 1.2), L(9, -13, -7, 6, 1.2),
      Ci(0, -2.5, 2, GOLD, { "stroke-width": 1.6 }),
      Ci(-8.5, 10, 4.4, "none", { stroke: RED, "stroke-width": 3.2 }),
      Ci(8.5, 10, 4.4, "none", { stroke: RED, "stroke-width": 3.2 }),
    ),
    wheat: g => {
      g.append(P("M0,16 C0,8 0,0 0,-12", "none", O3));
      [[-1, -12], [-1, -6], [-1, 0]].forEach(([x, y]) => {
        g.append(E(x - 4.5, y, 4.5, 2.4, GOLD, { transform: `rotate(-32 ${x - 4.5} ${y})`, "stroke-width": 1.6 }));
        g.append(E(x + 5.5, y, 4.5, 2.4, GOLD, { transform: `rotate(32 ${x + 5.5} ${y})`, "stroke-width": 1.6 }));
      });
      g.append(P("M0,-12 q1,-4 4,-6", "none", { "stroke-width": 2 }));
    },
    mic: g => g.append(
      Ci(0, -8, 7.5, "#5a6470"),
      P("M-5,-13 L5,-3 M-7,-8 L0,-1", "none", { stroke: "#828c98", "stroke-width": 1.6 }),
      P("M-3.5,-1 h7 l-1.5,12 h-4 z", GREY),
      L(0, 11, 0, 14, 2.4), L(-5, 15.5, 5, 15.5, 2.6),
    ),
    playcam: g => g.append(
      R(-13, -10, 26, 20, 5, RED),
      P("M-3.5,-6 L7,0 L-3.5,6 Z", "#fff", { "stroke-width": 1.8 }),
      Ci(9.5, -6.5, 1.6, "#fff", { stroke: "none", opacity: .7 }),
    ),
    sushi: g => g.append(
      E(0, 5, 11.5, 6.5, "#fff"),
      P("M-11,1 a11,6.5 0 0 1 22,0 l-1.5,3 a9.5,5 0 0 0 -19,0 z", "#ff9466"),
      L(-6, 0, -4, 2, 1.4, { stroke: "#fff" }), L(0, -1, 2, 1, 1.4, { stroke: "#fff" }), L(6, 0, 8, 2, 1.4, { stroke: "#fff" }),
    ),
    firehelm: g => g.append(
      P("M-11,2 a11,11 0 0 1 22,0 z", RED),
      E(0, 3, 15, 4, REDD),
      P("M-3,-9 h6 v5 h-6 z", GOLD, { "stroke-width": 1.6 }),
    ),
    cake: g => g.append(
      P("M-11,13 L11,13 L11,1 Q0,-3 -11,1 Z", "#ffe9c2"),
      P("M-11,1 Q0,-3 11,1 L11,5 Q0,1 -11,5 Z", "#fff", { "stroke-width": 1.6 }),
      Ci(0, -7, 4.4, RED),
      P("M0,-11 q3,-2 4,0", "none", { stroke: GREEN, "stroke-width": 2 }),
    ),

    // ◆ お宝カード
    pillow: g => g.append(
      G("rotate(-6)", P("M-12,-3 q12,-5 24,0 q3,7 0,12 q-12,5 -24,0 q-3,-7 0,-12 z", "#cdeffd")),
      P("M0,-14 h7 l-7,7 h7", "none", { "stroke-width": 2.4 }),
    ),
    donate: g => g.append(
      R(-11, -1, 22, 15, 2, RED),
      L(-5, 3.5, 5, 3.5, 2.6),
      Ci(0, -10, 5.5, GOLD), T("¥", 0, -7, 7, I),
      L(0, -3.5, 0, 0, 1.8, { opacity: .6 }),
    ),
    koban: g => g.append(
      E(0, 0, 9.5, 13.5, GOLD),
      E(0, 0, 6, 9.5, "none", { stroke: GOLDD, "stroke-width": 1.6 }),
      T("七", 0, 4, 9, I),
    ),
    payfast: g => g.append(
      L(-18, -3, -12, -3, 2.4, { opacity: .6 }), L(-19, 4, -13, 4, 2.4, { opacity: .6 }),
      G("translate(3,0)", R(-12, -9, 24, 18, 3, "#f0e6d2"), P("M-12,-9 L0,2 L12,-9", "none"), Ci(0, 5, 5, GOLD), T("¥", 0, 7.6, 7, I)),
    ),
    shieldticket: g => g.append(
      P("M0,-14 C8,-11 12,-10 12,-4 C12,6 6,12 0,15 C-6,12 -12,6 -12,-4 C-12,-10 -8,-11 0,-14 Z", GREEN),
      G("rotate(-8)", R(-7, -3, 14, 9, 2, GOLD, { "stroke-width": 1.6 }), L(2, -3, 2, 6, 1.2, { "stroke-dasharray": "1.8 1.8" })),
    ),
    scrollstock: g => g.append(
      R(-9, -13, 18, 26, 3, "#fff8dc"),
      R(-9, -2, 18, 5, 0, RED, { "stroke-width": 1.6 }),
      P("M-5,-6 L-1,-9 L2,-7 L6,-11", "none", { stroke: GREEN, "stroke-width": 2.2 }),
      L(-5, 8, 5, 8, 1.6, { opacity: .5 }),
    ),
    egg: g => g.append(
      E(0, 0, 10.5, 13.5, "#fff8dc"),
      P("M-10,-1 l4,3 l4,-4 l4,4 l4,-3", "none", { "stroke-width": 1.8 }),
      star(12, -10, 3.5, GOLD),
    ),
    cutpaper: g => g.append(
      R(-9, -13, 18, 25, 2, "#fff"),
      L(-5, -7, 5, -7, 1.6, { opacity: .5 }), L(-5, -2, 5, -2, 1.6, { opacity: .5 }),
      L(-12, 5, 12, 5, 1.8, { "stroke-dasharray": "3 2.5", stroke: RED }),
      P("M-14,1 l5,4 l-5,4", "none", { stroke: RED, "stroke-width": 2.2 }),
    ),
    vase: g => g.append(
      P("M-3.5,-14 h7 c0,3.5 4.5,4.5 4.5,9 c0,7 -4.5,10.5 -8,10.5 c-3.5,0 -8,-3.5 -8,-10.5 c0,-4.5 4.5,-5.5 4.5,-9 z", "#2f6cb0"),
      P("M-6,-1 q3,3 6,0 q3,-3 6,0", "none", { stroke: GOLD, "stroke-width": 1.8 }),
    ),
    acecard: g => g.append(
      G("rotate(-7)", R(-9, -13, 18, 26, 3, "#fff"), T("A", 0, 4, 15, RED), T("♥", -5.5, -7, 6, RED)),
      star(12, -11, 3.5, GOLD),
    ),
    omamori: g => g.append(
      P("M-8,-7 C-8,-13 8,-13 8,-7 L7,10 C7,14 -7,14 -7,10 Z", RED),
      Ci(-2, -10.5, 1.8, GOLD, { "stroke-width": 1.4 }), Ci(2, -10.5, 1.8, GOLD, { "stroke-width": 1.4 }),
      T("守", 0, 5, 9, GOLD),
    ),
  };

  // ---------- マス種別 → アイコンキー ----------
  const JOB_KEYS = {
    "医者": "stetho", "弁護士": "scale", "パイロット": "wingsbadge", "ITクリエイター": "laptop",
    "大学教授": "mortar", "プロゲーマー": "gamepad", "宇宙飛行士": "astro",
    "会社員": "necktie", "公務員": "govbld", "大工": "hammer", "美容師": "scissors",
    "農家": "wheat", "お笑い芸人": "mic", "ユーチューバー": "playcam", "板前": "sushi",
    "消防士": "firehelm", "パティシエ": "cake",
  };
  const CARD_KEYS = {
    turbo: "rocket", sabotage: "pillow", collect: "donate", lucky7: "koban",
    advance: "payfast", freeins: "shieldticket", stockgift: "scrollstock", warp: "egg",
    debthalf: "cutpaper", appraise: "vase", comeback: "acecard", omamori: "omamori",
  };

  function squareKey(sq) {
    switch (sq.t) {
      case "start":      return "flag";
      case "money":      return sq.amount > 0 ? "coins" : "moneyfly";
      case "payday":     return "payenv";
      case "card":       return "cardgift";
      case "move":       return sq.steps > 0 ? "arrowfwd" : "arrowback";
      case "skip":       return "sleep";
      case "branch":     return "signpost";
      case "jobsq":      return JOB_KEYS[sq.job.n] || "briefcase";
      case "jobfair":    return "briefcase";
      case "jobchange":  return "briefcase";
      case "marriage":   return "ring";
      case "child":      return "baby";
      case "house":      return "houseicon";
      case "insurance":  return "shield";
      case "stock":      return "chartup";
      case "casino":     return "sloticon";
      case "lottery":    return sq.premium ? "ticketgem" : "ticket";
      case "disaster":   return "storm";
      case "accident":   return "medcross";
      case "fire":       return "flame";
      case "housedmg":   return "tornado";
      case "layoff":     return "boxicon";
      case "stockboom":  return "rocketup";
      case "stockcrash": return "chartdown";
      case "gift":       return "giftbox";
      case "finalbet":   return "dicepair";
      case "duel":       return "swords";
      case "choice":     return "signpost2";
      case "goal":       return "crown";
    }
    return "flag";
  }

  function node(key) {
    const g = el("g", {});
    (DEFS[key] || DEFS.flag)(g);
    return g;
  }
  // 盤面（SVG内）用：translate+scale済みの<g>
  function gNode(key, size = 30, x = 0, y = 0) {
    const w = el("g", { transform: `translate(${x},${y}) scale(${(size / 40).toFixed(3)})` });
    w.appendChild(node(key));
    return w;
  }
  // HTML（モーダル等）用：<svg>要素
  function htmlEl(key, size = 40) {
    const s = el("svg", { viewBox: "-21 -21 42 42", width: size, height: size, class: "icon" });
    s.appendChild(node(key));
    return s;
  }

  // 選択式イベント用：？マーク
  DEFS.signpost2 = g => g.append(
    Ci(0, 0, 13, "#a78bfa"),
    P("M-4,-4 a4.5,5 0 1 1 7,4 q-2.5,1.5 -2.5,4", "none", { stroke: "#fff", "stroke-width": 3.4 }),
    Ci(0, 9.5, 2, "#fff", { stroke: "none" }),
  );

  return {
    gNode, el: htmlEl, squareKey,
    jobKey: n => JOB_KEYS[n] || "briefcase",
    cardKey: id => CARD_KEYS[id] || "cardgift",
  };
})();
