// SVG盤面の描画・コマ移動アニメ・カメラ（追従/全体/ドラッグ）

const Board = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const FOLLOW_W = 1500;            // 追従カメラの表示幅（盤面座標系）
  let svg = null, gTokens = null;
  let tokenEls = {}, tokenXY = {};
  let players = [];
  let view = null, target = null, zoomAll = false, lastXY = null;

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function build(st) {
    players = st.players;
    svg = document.getElementById("board-svg");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", `0 0 ${BOARD_W} ${BOARD_H}`);

    // 道（外枠＋内側の2重ライン）
    const gRoad = el("g", {});
    ["road-outer", "road-inner"].forEach(cls => {
      SQUARES.forEach(s => s.next.forEach(n => {
        const t = SQUARES[n];
        gRoad.appendChild(el("line", { x1: s.x, y1: s.y, x2: t.x, y2: t.y, class: cls }));
      }));
    });
    svg.appendChild(gRoad);

    // マス
    const gSq = el("g", {});
    SQUARES.forEach(s => {
      const g = el("g", { transform: `translate(${s.x},${s.y})` });
      let cls = `sq sq-${s.t}`;
      if (s.t === "money") cls += s.amount > 0 ? " sq-plus" : " sq-minus";
      if (s.t === "move") cls += s.steps > 0 ? " sq-mvplus" : " sq-mvminus";
      if (s.stop) cls += " sq-stop";
      g.appendChild(el("rect", { x: -48, y: -34, width: 96, height: 68, rx: 14, class: cls }));
      const ic = el("text", { y: -6, class: "sq-icon" });
      ic.textContent = squareIcon(s);
      g.appendChild(ic);
      const lb = el("text", { y: 22, class: "sq-label" + (s.t === "payday" ? " sq-label-dark" : "") });
      lb.textContent = s.label;
      g.appendChild(lb);
      const tt = el("title", {});
      tt.textContent = s.text;
      g.appendChild(tt);
      gSq.appendChild(g);
    });
    svg.appendChild(gSq);

    // コマ
    gTokens = el("g", {});
    svg.appendChild(gTokens);
    tokenEls = {}; tokenXY = {};
    players.forEach(p => {
      const g = el("g", { class: "token" });
      g.appendChild(el("circle", { r: 20, class: "token-ring", fill: "none", stroke: p.color }));
      g.appendChild(el("circle", { r: 14, fill: p.color, stroke: "#fff", "stroke-width": 3 }));
      const t = el("text", { class: "token-num" });
      t.textContent = p.id + 1;
      g.appendChild(t);
      gTokens.appendChild(g);
      tokenEls[p.id] = g;
    });
    placeAll();
    startCam();
    enableDrag();
  }

  // 同じマスに複数コマがいるときのオフセット
  const OFFS = [
    [[0, 0]],
    [[-15, 0], [15, 0]],
    [[-16, -12], [16, -12], [0, 14]],
    [[-16, -14], [16, -14], [-16, 14], [16, 14]],
    [[-18, -14], [18, -14], [-18, 14], [18, 14], [0, 0]],
    [[-18, -16], [18, -16], [-18, 16], [18, 16], [0, -30], [0, 30]],
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
  }

  // 1マスぶんのぴょん移動アニメ
  function stepToken(p, toId) {
    const s = SQUARES[toId];
    const from = tokenXY[p.id] || { x: s.x, y: s.y };
    Sound.play("step");
    focusXY(s.x, s.y);
    return new Promise(res => {
      const t0 = performance.now(), dur = 240;
      function frame(now) {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 2);
        const x = from.x + (s.x - from.x) * e;
        const y = from.y + (s.y - from.y) * e - Math.sin(t * Math.PI) * 22;
        tokenEls[p.id].setAttribute("transform", `translate(${x},${y})`);
        if (t < 1) requestAnimationFrame(frame);
        else { tokenXY[p.id] = { x: s.x, y: s.y }; placeAll(); res(); }
      }
      requestAnimationFrame(frame);
    });
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
    jump: p => stepToken(p, p.pos),
  };
})();
