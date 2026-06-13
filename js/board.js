// SVG盤面の描画：曲線道路・風景・立体マス・車型コマ（家族ピン付き）・カメラ

const Board = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const FOLLOW_W = 1500;            // 追従カメラの表示幅（盤面座標系）
  let svg = null, gTokens = null, gFx = null;
  let tokenEls = {}, tokenXY = {}, houseEls = null, sqEls = {};
  let players = [], curPlayer = null;
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

    // 風景（旧2600x1700座標系のままスケーリングして配置）
    const gScenery = el("g", { transform: "translate(0,-5) scale(1.135 1.1667)" });
    Scenery.render(gScenery);
    svg.appendChild(gScenery);

    // 道（チェーンごとに滑らかな1本道：厚み→外縁→路面→センターライン）
    const gRoad = el("g", {});
    const chains = ROAD_CHAINS.map(c => smoothPath(c.map(id => SQUARES[id])));
    [["road-depth", "translate(0,8)"], ["road-outer", null], ["road-inner", null], ["road-center", null]].forEach(([cls, tr]) => {
      chains.forEach(d => gRoad.appendChild(el("path", Object.assign({ d, class: cls, fill: "none" }, tr ? { transform: tr } : {}))));
    });
    svg.appendChild(gRoad);

    // 物件（購入するとプレイヤーカラーの表札が付く）
    const gHouses = el("g", { transform: "translate(0,-5) scale(1.135 1.1667)" });
    svg.appendChild(gHouses);
    houseEls = Scenery.houses(gHouses);
    syncHouses(st);

    // マス（影→側面(2.5D押し出し)→本体→グロス→アイコン→ラベル）
    const gSq = el("g", {});
    sqEls = {};
    SQUARES.forEach(s => {
      const g = el("g", { transform: `translate(${s.x},${s.y})` });
      sqEls[s.id] = g;
      let cls = `sq sq-${s.t}`;
      if (s.t === "money") cls += s.amount > 0 ? " sq-plus" : " sq-minus";
      if (s.t === "move") cls += s.steps > 0 ? " sq-mvplus" : " sq-mvminus";
      g.appendChild(el("rect", { x: -53, y: -30, width: 118, height: 84, rx: 18, fill: "rgba(40,30,10,.22)" }));
      g.appendChild(el("rect", { x: -59, y: -34, width: 118, height: 84, rx: 18, class: cls }));
      g.appendChild(el("rect", { x: -59, y: -34, width: 118, height: 84, rx: 18, fill: "rgba(0,0,0,.32)" }));
      g.appendChild(el("rect", { x: -59, y: -42, width: 118, height: 84, rx: 18, class: cls }));
      g.appendChild(el("rect", { x: -59, y: -42, width: 118, height: 84, rx: 18, fill: "url(#sqGloss)", "pointer-events": "none" }));
      if (s.stop) g.appendChild(el("rect", { x: -59, y: -42, width: 118, height: 84, rx: 18, class: "sq-stopring", fill: "none" }));
      g.appendChild(Icons.gNode(Icons.squareKey(s), 42, 0, -11));
      const lb = el("text", { y: 28, class: "sq-label" + (s.t === "payday" ? " sq-label-dark" : "") });
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
      g.appendChild(el("ellipse", { rx: 44, ry: 32, class: "token-ring", fill: "none", stroke: p.color }));
      const car = el("g", { class: "car-flip" });
      car.appendChild(el("ellipse", { cx: 0, cy: 17, rx: 33, ry: 6, fill: "rgba(0,0,0,.25)" }));
      // キャビン（6人乗り：運転手＋配偶者＋子供4人のピンが全部見える）
      car.appendChild(el("rect", { x: -20, y: -24, width: 50, height: 17, rx: 6, fill: p.color, stroke: "rgba(0,0,0,.2)", "stroke-width": 1.6 }));
      car.appendChild(el("rect", { x: -17, y: -22, width: 44, height: 12, rx: 4, fill: "#cdeffd" }));
      const pins = el("g", { class: "car-pins" });
      car.appendChild(pins);
      car.appendChild(el("rect", { x: -33, y: -9, width: 66, height: 22, rx: 9, fill: p.color, stroke: "#fff", "stroke-width": 3 }));
      car.appendChild(el("circle", { cx: -19, cy: 13, r: 8.5, fill: "#2b2b33" }));
      car.appendChild(el("circle", { cx: 19, cy: 13, r: 8.5, fill: "#2b2b33" }));
      car.appendChild(el("circle", { cx: -19, cy: 13, r: 3.4, fill: "#ddd" }));
      car.appendChild(el("circle", { cx: 19, cy: 13, r: 3.4, fill: "#ddd" }));
      g.appendChild(car);
      const plate = el("g", {});
      plate.appendChild(el("rect", { x: -9, y: -5, width: 18, height: 15, rx: 3, fill: "#fff", stroke: "rgba(0,0,0,.25)", "stroke-width": 1.2 }));
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

  // 性別・結婚・子供に応じて車にピンを乗せる（運転手＋配偶者＋子供4人まで全員見える）
  const PIN_M = "#4a90d9", PIN_F = "#f06a9a", PIN_KID = "#ffd23e";
  function syncPins(p) {
    const g = tokenEls[p.id];
    if (!g) return;
    const pins = g.querySelector(".car-pins");
    while (pins.firstChild) pins.removeChild(pins.firstChild);
    const self = p.gender === "f" ? PIN_F : PIN_M;
    const spouse = p.gender === "f" ? PIN_M : PIN_F;
    const list = [{ c: self, s: 1 }];
    if (p.married) list.push({ c: spouse, s: 1 });
    for (let i = 0; i < Math.min(p.children, 4); i++) list.push({ c: PIN_KID, s: .8 });
    list.forEach((pin, i) => {
      const x = -13 + i * 7;
      pins.appendChild(el("circle", { cx: x, cy: -13.5 - 4 * pin.s, r: 3.6 * pin.s, fill: pin.c, stroke: "rgba(0,0,0,.25)", "stroke-width": 1 }));
      pins.appendChild(el("rect", { x: x - 2.8 * pin.s, y: -13.5, width: 5.6 * pin.s, height: 5.5 * pin.s, rx: 2.4, fill: pin.c }));
    });
    const extra = p.children > 4 ? p.children - 4 : 0;
    if (extra > 0) {
      const t = el("text", { x: 30, y: -26, class: "car-extra" });
      t.textContent = `+${extra}`;
      pins.appendChild(t);
    }
  }

  // 同じマスに複数コマがいるときのオフセット（マスの外にはみ出さない範囲で重ねる）
  const OFFS = [
    [[0, 0]],
    [[-16, -9], [16, 11]],
    [[-18, -12], [18, -4], [0, 15]],
    [[-18, -13], [18, -13], [-18, 14], [18, 14]],
    [[-20, -14], [20, -14], [-20, 15], [20, 15], [0, 0]],
    [[-20, -16], [20, -16], [-20, 16], [20, 16], [0, -25], [0, 25]],
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
      const t0 = performance.now(), dur = 240 / (window.TURBO || 1);
      function frame(now) {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 2);
        const x = from.x + (s.x - from.x) * e;
        const y = from.y + (s.y - from.y) * e - Math.sin(t * Math.PI) * 14;
        tokenEls[p.id].setAttribute("transform", `translate(${x},${y})`);
        if (t < 1) requestAnimationFrame(frame);
        else {
          tokenXY[p.id] = { x: s.x, y: s.y };
          placeAll();
          if (curPlayer && curPlayer.id === p.id) markSquare(toId);
          res();
        }
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
  // 目標に十分近づいたらスナップして書き換えを止める（毎フレームのサブピクセル再描画＝ちらつき防止）
  let lastVB = "";
  function startCam() {
    if (view) return;       // rAFループは1本だけ
    view = { x: 0, y: 0, w: BOARD_W, h: BOARD_H };
    target = { ...view };
    (function tick() {
      const d = Math.abs(target.x - view.x) + Math.abs(target.y - view.y)
              + Math.abs(target.w - view.w) + Math.abs(target.h - view.h);
      if (d > 0.8) {
        view.x += (target.x - view.x) * 0.12;
        view.y += (target.y - view.y) * 0.12;
        view.w += (target.w - view.w) * 0.12;
        view.h += (target.h - view.h) * 0.12;
      } else if (d > 0) {
        view = { ...target };   // スナップして静止
      }
      const vb = `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`;
      if (vb !== lastVB) {
        lastVB = vb;
        svg.setAttribute("viewBox", vb);
      }
      requestAnimationFrame(tick);
    })();
  }

  function aspect() {
    const r = svg.getBoundingClientRect();
    return r.width > 0 ? r.height / r.width : 0.6;
  }

  function focusXY(x, y, width) {
    lastXY = { x, y };
    if (zoomAll) return;
    const w = Math.min(width || FOLLOW_W, BOARD_W);
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

  function setZoomAll(flag) {
    zoomAll = flag;
    if (zoomAll) target = { x: 0, y: 0, w: BOARD_W, h: BOARD_H };
    else if (lastXY) focusXY(lastXY.x, lastXY.y);
    return zoomAll;
  }
  function toggleZoom() { return setZoomAll(!zoomAll); }

  function setCurrent(p) {
    curPlayer = p;
    players.forEach(o => tokenEls[o.id].classList.toggle("token-cur", o.id === p.id));
    markSquare();
  }

  // 手番プレイヤーが今いるマスを光らせる（どのマスに止まっているか一目で分かるように）
  function markSquare(idOverride) {
    for (const id in sqEls) sqEls[id].classList.remove("sq-here");
    const id = idOverride != null ? idOverride : (curPlayer ? curPlayer.pos : null);
    if (id != null && sqEls[id]) sqEls[id].classList.add("sq-here");
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
    build, placeAll, stepToken, focusPlayer, focusXY, setCurrent, toggleZoom, setZoomAll,
    floatText, tokenScreenPos, syncHouses,
    jump: p => stepToken(p, p.pos),
  };
})();
