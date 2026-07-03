// SVG盤面の描画（本家風）：マス自体が道になる台形マス帯・芝生と風景・車型コマ・カメラ

const Board = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const FOLLOW_W = 1400;            // 追従カメラの表示幅（盤面座標系）
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

  // 中心線折れ線 → pathのd文字列
  function lineD(pts) {
    return "M" + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L");
  }

  // ラベルを2行に割る（5文字超は中央で分割）
  function splitLabel(label) {
    if (label.length <= 5) return [label];
    const h = Math.ceil(label.length / 2);
    return [label.slice(0, h), label.slice(h)];
  }

  // 金額の万表記（盤面用）
  function manStr(amount) {
    const man = Math.round(Math.abs(amount) / 10000);
    return (amount > 0 ? "＋" : "−") + man + "万";
  }

  // マス文字を上下逆さにしない回転角
  function uprightAngle(a) {
    let d = ((a % 360) + 360) % 360;
    return (d > 90 && d < 270) ? a + 180 : a;
  }

  // 文字を暗色にするマス（明るい地色）
  const DARK_TEXT = new Set(["money", "promo", "bridge", "goal", "lottery"]);

  // ストップ看板・祝バッジを置く側（盤の中心から遠い側の法線方向）
  function outwardNormal(s) {
    const rad = s.a * Math.PI / 180;
    let nx = -Math.sin(rad), ny = Math.cos(rad);
    const dot = nx * (s.x - BOARD_W / 2) + ny * (s.y - BOARD_H / 2);
    if (dot < 0) { nx = -nx; ny = -ny; }
    return { nx, ny };
  }

  // 本家風の黒い「ストップ」看板（マスの縁に密着）
  function stopSign(s) {
    const { nx, ny } = outwardNormal(s);
    const px = s.x + nx * (ROAD_W / 2 + 8), py = s.y + ny * (ROAD_W / 2 + 8);
    const g = el("g", { transform: `translate(${px.toFixed(1)},${py.toFixed(1)})`, class: "sq-stopsign" });
    g.appendChild(el("rect", { x: -44, y: -16, width: 88, height: 32, rx: 8, fill: "#17171c", stroke: "#e8433e", "stroke-width": 4 }));
    const t = el("text", { y: 6.5, class: "stopsign-txt" });
    t.textContent = "ストップ";
    g.appendChild(t);
    return g;
  }

  // お祝いマスの「祝」バッジ（マスの角に重ねる。ストップ看板と重ならないよう進行方向へずらす）
  function iwaiBadge(s) {
    const { nx, ny } = outwardNormal(s);
    const rad = s.a * Math.PI / 180;
    const tx = Math.cos(rad) * 66, ty = Math.sin(rad) * 66;
    const px = s.x + nx * (ROAD_W / 2 - 4) + tx, py = s.y + ny * (ROAD_W / 2 - 4) + ty;
    const g = el("g", { transform: `translate(${px.toFixed(1)},${py.toFixed(1)}) rotate(-12)` });
    g.appendChild(el("circle", { r: 16, fill: "#e8433e", stroke: "#fff", "stroke-width": 3 }));
    const t = el("text", { y: 6, class: "iwai-txt" });
    t.textContent = "祝";
    g.appendChild(t);
    return g;
  }

  function build(st) {
    players = st.players;
    svg = document.getElementById("board-svg");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", `0 0 ${BOARD_W} ${BOARD_H}`);

    // 芝生（本家の緑の大地）
    svg.appendChild(el("rect", { x: 0, y: 0, width: BOARD_W, height: BOARD_H, fill: "#79bd57" }));

    // 風景（芝生の模様・木・丘・池・建物・中央ルーレット）
    const gScenery = el("g", {});
    Scenery.render(gScenery);
    svg.appendChild(gScenery);

    // 道路の白帯（影 → 側面の厚み → 白い路面）。カーブで立体的に盛り上がって見える
    const gRoad = el("g", {});
    ROAD_LINES.forEach(pts => {
      const d = lineD(pts);
      gRoad.appendChild(el("path", { d, class: "rd-shadow", fill: "none", transform: "translate(6,20)" }));
      gRoad.appendChild(el("path", { d, class: "rd-side", fill: "none", transform: "translate(0,12)" }));
      gRoad.appendChild(el("path", { d, class: "rd-band", fill: "none" }));
    });
    svg.appendChild(gRoad);

    // マス（道に沿った台形。文字は進行方向に合わせて回転）
    const gSq = el("g", {});
    const gSigns = el("g", { "pointer-events": "none" });
    sqEls = {};
    SQUARES.forEach(s => {
      const g = el("g", {});
      sqEls[s.id] = g;
      let cls = `sq sq-${s.t}`;
      if (s.t === "money") cls += s.amount > 0 ? " sq-plus" : " sq-minus";
      const ptsStr = s.quad.map(p => p.join(",")).join(" ");
      g.appendChild(el("polygon", { points: ptsStr, class: cls }));

      // マス内の文字・アイコン（進行方向に回転／逆さ防止）
      const rot = uprightAngle(s.a);
      const c = el("g", { transform: `translate(${s.x},${s.y}) rotate(${rot.toFixed(1)})`, class: "sq-content" });
      const dark = DARK_TEXT.has(s.t);
      const lines = splitLabel(s.label);
      const hasAmt = (s.t === "money" || s.t === "accident") && s.amount;
      // 縦（道幅方向）配置：アイコン→ラベル→金額
      const iconY = -40;
      c.appendChild(Icons.gNode(Icons.squareKey(s), 30, 0, iconY));
      const lblCls = "sq-txt " + (dark ? "sqt-dark" : "sqt-light");
      if (lines.length === 1) {
        const t = el("text", { y: hasAmt ? 0 : 10, class: lblCls });
        t.textContent = lines[0];
        c.appendChild(t);
      } else {
        const t1 = el("text", { y: hasAmt ? -8 : -2, class: lblCls });
        t1.textContent = lines[0];
        const t2 = el("text", { y: hasAmt ? 10 : 16, class: lblCls });
        t2.textContent = lines[1];
        c.appendChild(t1);
        c.appendChild(t2);
      }
      if (hasAmt) {
        const amt = s.t === "accident" ? -Math.abs(s.amount) : s.amount;
        const ta = el("text", { y: 34, class: "sq-amt " + (amt > 0 ? "sq-amt-plus" : "sq-amt-minus") + (dark ? "" : " sq-amt-onlight") });
        ta.textContent = manStr(amt);
        c.appendChild(ta);
      }
      g.appendChild(c);

      // 完全停止マス＝黒いストップ看板／お祝いマス＝祝バッジ
      if (s.stop && s.t !== "branch") gSigns.appendChild(stopSign(s));
      if (s.t === "marriage" || s.t === "gift" || s.t === "child") gSigns.appendChild(iwaiBadge(s));

      const tt = el("title", {});
      tt.textContent = s.text;
      g.appendChild(tt);
      gSq.appendChild(g);
    });
    svg.appendChild(gSq);
    svg.appendChild(gSigns);

    // 物件（購入するとプレイヤーカラーの表札が付く）
    const gHouses = el("g", {});
    svg.appendChild(gHouses);
    houseEls = Scenery.houses(gHouses);
    syncHouses(st);

    // コマ（車）とエフェクト層
    gTokens = el("g", {});
    svg.appendChild(gTokens);
    gFx = el("g", { "pointer-events": "none" });
    svg.appendChild(gFx);

    tokenEls = {}; tokenXY = {};
    players.forEach(p => {
      const g = el("g", { class: "token" });
      g.appendChild(el("ellipse", { rx: 46, ry: 34, class: "token-ring", fill: "none", stroke: p.color }));
      // 本家風のワンカラー成形オープンカー（上面にピン穴6つ・家族の丸頭ピンを挿す）
      const car = el("g", { class: "car-flip" });
      car.appendChild(el("ellipse", { cx: 0, cy: 19, rx: 38, ry: 6.5, fill: "rgba(0,0,0,.25)" }));
      // ピン（車体の後ろに描くと隠れるので車体の前に置く）
      const pins = el("g", { class: "car-pins" });
      car.appendChild(pins);
      // 車体：低くて丸っこいオープンカー（前方がボンネット・後方が少し高い）
      car.appendChild(el("path", {
        d: "M-36,12 L-36,-4 Q-36,-13 -27,-13 L18,-13 Q24,-13 28,-9 L35,-6 Q39,-4 39,2 L39,12 Q39,16 33,16 L-30,16 Q-36,16 -36,12 Z",
        fill: p.color, stroke: "rgba(0,0,0,.3)", "stroke-width": 2,
      }));
      // フロントガラス（前方の小さな透明パネル）
      car.appendChild(el("path", { d: "M20,-12 L27,-23 L33,-20 L27,-11 Z", fill: "#cdeffd", stroke: "#fff", "stroke-width": 1.6 }));
      // 上面のピン穴（空席は穴が見える）
      CAR_HOLES.forEach(hx => car.appendChild(el("ellipse", { cx: hx, cy: -13, rx: 3.4, ry: 2, fill: "rgba(0,0,0,.38)" })));
      // ホイールも同色（本家のワンカラープラ成形感）
      [-22, 22].forEach(wx => {
        car.appendChild(el("circle", { cx: wx, cy: 14, r: 9, fill: p.color, stroke: "rgba(0,0,0,.35)", "stroke-width": 2 }));
        car.appendChild(el("circle", { cx: wx, cy: 14, r: 4, fill: "rgba(0,0,0,.3)" }));
      });
      // 車体のハイライト
      car.appendChild(el("path", { d: "M-32,-8 Q-33,-11 -27,-11 L0,-11", fill: "none", stroke: "rgba(255,255,255,.5)", "stroke-width": 2.5, "stroke-linecap": "round" }));
      g.appendChild(car);
      const plate = el("g", {});
      plate.appendChild(el("rect", { x: -9, y: -3, width: 18, height: 15, rx: 3, fill: "#fff", stroke: "rgba(0,0,0,.25)", "stroke-width": 1.2 }));
      const num = el("text", { y: 9, class: "car-num" });
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

  // 車のピン穴の位置（前から：運転手→配偶者→子供4人）
  const CAR_HOLES = [15, 6, -3, -12, -21, -30];

  // 性別・結婚・子供に応じて車に丸頭ピンを挿す（本家のひとピン。運転手が先頭）
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
    for (let i = 0; i < Math.min(p.children, 4); i++) list.push({ c: PIN_KID, s: .78 });
    list.forEach((pin, i) => {
      const x = CAR_HOLES[i];
      // 首（穴に挿さった棒）と丸頭
      pins.appendChild(el("rect", { x: x - 1.9 * pin.s, y: -13 - 8 * pin.s, width: 3.8 * pin.s, height: 8 * pin.s, rx: 1.6, fill: pin.c, stroke: "rgba(0,0,0,.25)", "stroke-width": 1 }));
      pins.appendChild(el("circle", { cx: x, cy: -13 - 9.5 * pin.s, r: 4.6 * pin.s, fill: pin.c, stroke: "rgba(0,0,0,.25)", "stroke-width": 1.2 }));
      pins.appendChild(el("ellipse", { cx: x - 1.4 * pin.s, cy: -14.5 - 9.5 * pin.s, rx: 1.5 * pin.s, ry: 1 * pin.s, fill: "rgba(255,255,255,.6)" }));
    });
    const extra = p.children > 4 ? p.children - 4 : 0;
    if (extra > 0) {
      const t = el("text", { x: 34, y: -20, class: "car-extra" });
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
