// SVG盤面の描画：曲線道路・風景・立体マス・車型コマ（家族ピン付き）・カメラ

const Board = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const FOLLOW_W = 1500;            // 追従カメラの表示幅（盤面座標系）
  let svg = null, gTokens = null, gFx = null;
  let tokenEls = {}, tokenXY = {}, houseEls = null;
  let players = [];
  let view = null, target = null, zoomAll = false, lastXY = null;

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Catmull-Rom → ベジェ変換でマス中心を通る滑らかな道を作る
  function smoothPath(pts) {
    if (pts.length < 2) return "";
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
      const p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x},${p2.y}`;
    }
    return d;
  }

  function buildDefs() {
    const defs = el("defs", {});
    const sky = el("linearGradient", { id: "skyGrad", x1: 0, y1: 0, x2: 0, y2: 1 });
    [["0%", "#aee2ff"], ["30%", "#cfeec8"], ["100%", "#bfe5ab"]].forEach(([o, c]) =>
      sky.appendChild(el("stop", { offset: o, "stop-color": c })));
    const gloss = el("linearGradient", { id: "sqGloss", x1: 0, y1: 0, x2: 0, y2: 1 });
    [["0%", "rgba(255,255,255,.40)"], ["55%", "rgba(255,255,255,.06)"], ["100%", "rgba(255,255,255,0)"]].forEach(([o, c]) =>
      gloss.appendChild(el("stop", { offset: o, "stop-color": c })));
    defs.append(sky, gloss);
    return defs;
  }

  function build(st) {
    players = st.players;
    svg = document.getElementById("board-svg");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", `0 0 ${BOARD_W} ${BOARD_H}`);
    svg.appendChild(buildDefs());

    // 大地と空
    svg.appendChild(el("rect", { x: 0, y: 0, width: BOARD_W, height: BOARD_H, fill: "url(#skyGrad)" }));

    // 風景
    Scenery.render(svg);

    // 道（チェーンごとに滑らかな1本道：外縁→路面→センターライン）
    const gRoad = el("g", {});
    const chains = ROAD_CHAINS.map(c => smoothPath(c.map(id => SQUARES[id])));
    [["road-outer", null], ["road-inner", null], ["road-center", null]].forEach(([cls]) => {
      chains.forEach(d => gRoad.appendChild(el("path", { d, class: cls, fill: "none" })));
    });
    svg.appendChild(gRoad);

    // 物件（購入するとプレイヤーカラーの表札が付く）
    const gHouses = el("g", {});
    svg.appendChild(gHouses);
    houseEls = Scenery.houses(gHouses);
    syncHouses(st);

    // マス（影→本体→グロス→アイコン→ラベル）
    const gSq = el("g", {});
    SQUARES.forEach(s => {
      const g = el("g", { transform: `translate(${s.x},${s.y})` });
      let cls = `sq sq-${s.t}`;
      if (s.t === "money") cls += s.amount > 0 ? " sq-plus" : " sq-minus";
      if (s.t === "move") cls += s.steps > 0 ? " sq-mvplus" : " sq-mvminus";
      g.appendChild(el("rect", { x: -44, y: -28, width: 96, height: 68, rx: 16, fill: "rgba(40,30,10,.22)" }));
      g.appendChild(el("rect", { x: -48, y: -34, width: 96, height: 68, rx: 16, class: cls }));
      g.appendChild(el("rect", { x: -48, y: -34, width: 96, height: 68, rx: 16, fill: "url(#sqGloss)", "pointer-events": "none" }));
      if (s.stop) g.appendChild(el("rect", { x: -48, y: -34, width: 96, height: 68, rx: 16, class: "sq-stopring", fill: "none" }));
      const ic = el("text", { y: -4, class: "sq-icon" });
      ic.textContent = squareIcon(s);
      g.appendChild(ic);
      const lb = el("text", { y: 23, class: "sq-label" + (s.t === "payday" ? " sq-label-dark" : "") });
      lb.textContent = s.label;
      g.appendChild(lb);
      const tt = el("title", {});
      tt.textContent = s.text;
      g.appendChild(tt);
      gSq.appendChild(g);
    });
    svg.appendChild(gSq);

    // コマ（車）とエフェクト層
    gTokens = el("g", {});
    svg.appendChild(gTokens);
    gFx = el("g", { "pointer-events": "none" });
    svg.appendChild(gFx);

    tokenEls = {}; tokenXY = {};
    players.forEach(p => {
      const g = el("g", { class: "token" });
      g.appendChild(el("ellipse", { rx: 32, ry: 24, class: "token-ring", fill: "none", stroke: p.color }));
      const car = el("g", { class: "car-flip" });
      car.appendChild(el("ellipse", { cx: 0, cy: 13, rx: 24, ry: 5, fill: "rgba(0,0,0,.25)" }));
      car.appendChild(el("rect", { x: -13, y: -18, width: 26, height: 14, rx: 5, fill: p.color, stroke: "rgba(0,0,0,.2)", "stroke-width": 1.5 }));
      car.appendChild(el("rect", { x: -10, y: -16, width: 20, height: 9, rx: 3, fill: "#cdeffd" }));
      car.appendChild(el("rect", { x: -24, y: -7, width: 48, height: 17, rx: 7, fill: p.color, stroke: "#fff", "stroke-width": 2.5 }));
      const pins = el("g", { class: "car-pins" });
      car.appendChild(pins);
      car.appendChild(el("circle", { cx: -13, cy: 10, r: 6.5, fill: "#2b2b33" }));
      car.appendChild(el("circle", { cx: 13, cy: 10, r: 6.5, fill: "#2b2b33" }));
      car.appendChild(el("circle", { cx: -13, cy: 10, r: 2.6, fill: "#ddd" }));
      car.appendChild(el("circle", { cx: 13, cy: 10, r: 2.6, fill: "#ddd" }));
      g.appendChild(car);
      const plate = el("g", {});
      plate.appendChild(el("rect", { x: -7, y: -3, width: 14, height: 12, rx: 2.5, fill: "#fff", stroke: "rgba(0,0,0,.25)", "stroke-width": 1 }));
      const num = el("text", { y: 7, class: "car-num" });
      num.textContent = p.id + 1;
      plate.appendChild(num);
      g.appendChild(plate);
      gTokens.appendChild(g);
      tokenEls[p.id] = g;
    });
    placeAll();
    startCam();
    enableDrag();
  }

  // 物件の状態を反映（売出中＝グレー／所有＝表札／焼失＝黒こげ）
  function syncHouses(st) {
    if (!houseEls) return;
    const owner = {};
    st.players.forEach(p => p.houses.forEach(hi => { owner[hi] = p; }));
    const burned = new Set(st.burned || []);
    for (const hi in houseEls) {
      const e = houseEls[hi];
      const o = owner[hi];
      e.g.classList.toggle("hs-sale", !o && !burned.has(+hi));
      e.g.classList.toggle("hs-burned", burned.has(+hi));
      if (o) {
        e.plateTx.textContent = o.name.length > 6 ? o.name.slice(0, 6) + "…" : o.name;
        e.plateBg.setAttribute("fill", o.color);
        e.plateG.setAttribute("display", "");
      } else {
        e.plateG.setAttribute("display", "none");
      }
    }
  }

  // 結婚・子供に応じて車にピンを乗せる
  function syncPins(p) {
    const g = tokenEls[p.id];
    if (!g) return;
    const pins = g.querySelector(".car-pins");
    while (pins.firstChild) pins.removeChild(pins.firstChild);
    const list = [{ c: "#4a90d9", s: 1 }];                        // 本人
    if (p.married) list.push({ c: "#f06a9a", s: 1 });             // 配偶者
    for (let i = 0; i < Math.min(p.children, 2); i++) list.push({ c: "#ffd23e", s: .78 });
    list.forEach((pin, i) => {
      const x = -7 + i * 6.5;
      pins.appendChild(el("circle", { cx: x, cy: -19.5 - 3 * pin.s, r: 3 * pin.s, fill: pin.c }));
      pins.appendChild(el("rect", { x: x - 2.4 * pin.s, y: -19.5, width: 4.8 * pin.s, height: 5 * pin.s, rx: 2, fill: pin.c }));
    });
    const extra = p.children > 2 ? p.children - 2 : 0;
    if (extra > 0) {
      const t = el("text", { x: 17, y: -20, class: "car-extra" });
      t.textContent = `+${extra}`;
      pins.appendChild(t);
    }
  }

  // 同じマスに複数コマがいるときのオフセット
  const OFFS = [
    [[0, 0]],
    [[-20, -8], [20, 10]],
    [[-22, -12], [22, -6], [0, 14]],
    [[-22, -14], [22, -14], [-22, 14], [22, 14]],
    [[-24, -16], [24, -16], [-24, 14], [24, 14], [0, 0]],
    [[-24, -18], [24, -18], [-24, 16], [24, 16], [0, -32], [0, 30]],
  ];

  function setTokenXY(id, x, y) {
    tokenXY[id] = { x, y };
    tokenEls[id].setAttribute("transform", `translate(${x},${y})`);
  }

  function placeAll() {
    const bySq = {};
    players.forEach(p => { (bySq[p.pos] = bySq[p.pos] || []).push(p); });
    for (const sid in bySq) {
      const list = bySq[sid], s = SQUARES[sid], offs = OFFS[list.length - 1];
      list.forEach((p, i) => setTokenXY(p.id, s.x + offs[i][0], s.y + offs[i][1]));
    }
    players.forEach(syncPins);
  }

  // 1マスぶんの走行アニメ（進行方向に車が向く）
  function stepToken(p, toId) {
    const s = SQUARES[toId];
    const from = tokenXY[p.id] || { x: s.x, y: s.y };
    // 車を進行方向に向ける（左向きは反転して上下が逆さにならないように）
    const flip = tokenEls[p.id].querySelector(".car-flip");
    const ddx = s.x - from.x, ddy = s.y - from.y;
    if (Math.abs(ddx) > 2 || Math.abs(ddy) > 2) {
      const deg = Math.atan2(ddy, ddx) * 180 / Math.PI;
      flip.setAttribute("transform",
        (deg > 90 || deg < -90) ? `scale(-1,1) rotate(${(180 - deg).toFixed(1)})` : `rotate(${deg.toFixed(1)})`);
    }
    Sound.play("step");
    focusXY(s.x, s.y);
    return new Promise(res => {
      const t0 = performance.now(), dur = 240;
      function frame(now) {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 2);
        const x = from.x + (s.x - from.x) * e;
        const y = from.y + (s.y - from.y) * e - Math.sin(t * Math.PI) * 14;
        tokenEls[p.id].setAttribute("transform", `translate(${x},${y})`);
        if (t < 1) requestAnimationFrame(frame);
        else { tokenXY[p.id] = { x: s.x, y: s.y }; placeAll(); res(); }
      }
      requestAnimationFrame(frame);
    });
  }

  // コマ位置から浮き上がるテキスト（+¥500,000 など）
  function floatText(p, str, color) {
    if (!gFx || !tokenXY[p.id]) return;
    const { x, y } = tokenXY[p.id];
    const t = el("text", { class: "float-txt", fill: color || "#fff" });
    t.textContent = str;
    gFx.appendChild(t);
    const t0 = performance.now();
    (function frame(now) {
      const k = (now - t0) / 1100;
      if (k >= 1) { t.remove(); return; }
      t.setAttribute("transform", `translate(${x},${y - 38 - k * 46})`);
      t.setAttribute("opacity", k < .7 ? 1 : 1 - (k - .7) / .3);
      requestAnimationFrame(frame);
    })(t0);
  }

  // コマの画面上の位置（HTMLオーバーレイ演出用）
  function tokenScreenPos(p) {
    const xy = tokenXY[p.id];
    if (!xy || !svg.getScreenCTM) return null;
    const pt = new DOMPoint(xy.x, xy.y).matrixTransform(svg.getScreenCTM());
    return { x: pt.x, y: pt.y };
  }

  // ---- カメラ ----
  function startCam() {
    if (view) return;       // rAFループは1本だけ
    view = { x: 0, y: 0, w: BOARD_W, h: BOARD_H };
    target = { ...view };
    (function tick() {
      view.x += (target.x - view.x) * 0.12;
      view.y += (target.y - view.y) * 0.12;
      view.w += (target.w - view.w) * 0.12;
      view.h += (target.h - view.h) * 0.12;
      svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
      requestAnimationFrame(tick);
    })();
  }

  function aspect() {
    const r = svg.getBoundingClientRect();
    return r.width > 0 ? r.height / r.width : 0.6;
  }

  function focusXY(x, y) {
    lastXY = { x, y };
    if (zoomAll) return;
    const w = Math.min(FOLLOW_W, BOARD_W);
    const h = w * aspect();
    target = {
      x: clamp(x - w / 2, 0, Math.max(0, BOARD_W - w)),
      y: clamp(y - h / 2, 0, Math.max(0, BOARD_H - h)),
      w, h,
    };
  }

  function focusPlayer(p) {
    const s = SQUARES[p.pos];
    focusXY(s.x, s.y);
  }

  function toggleZoom() {
    zoomAll = !zoomAll;
    if (zoomAll) target = { x: 0, y: 0, w: BOARD_W, h: BOARD_H };
    else if (lastXY) focusXY(lastXY.x, lastXY.y);
    return zoomAll;
  }

  function setCurrent(p) {
    players.forEach(o => tokenEls[o.id].classList.toggle("token-cur", o.id === p.id));
  }

  function enableDrag() {
    let drag = null;
    svg.onpointerdown = e => {
      drag = { px: e.clientX, py: e.clientY, tx: target.x, ty: target.y };
      svg.setPointerCapture(e.pointerId);
    };
    svg.onpointermove = e => {
      if (!drag) return;
      const r = svg.getBoundingClientRect();
      const k = view.w / r.width;
      target.x = clamp(drag.tx - (e.clientX - drag.px) * k, -200, BOARD_W);
      target.y = clamp(drag.ty - (e.clientY - drag.py) * k, -200, BOARD_H);
    };
    svg.onpointerup = svg.onpointercancel = () => { drag = null; };
  }

  return {
    build, placeAll, stepToken, focusPlayer, setCurrent, toggleZoom,
    floatText, tokenScreenPos, syncHouses,
    jump: p => stepToken(p, p.pos),
  };
})();
