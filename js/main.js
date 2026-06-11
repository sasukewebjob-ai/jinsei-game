// 起動・画面遷移・セットアップ画面の配線

(() => {
  const $ = s => document.querySelector(s);
  let count = 4;

  function renderCount() {
    const box = $("#count-buttons");
    while (box.firstChild) box.removeChild(box.firstChild);
    for (let n = 2; n <= 6; n++) {
      const b = h("button", { class: "btn btn-count" + (n === count ? " btn-primary" : "") }, `${n}人`);
      b.onclick = () => { Sound.play("click"); count = n; renderCount(); renderInputs(); };
      box.appendChild(b);
    }
  }

  function renderInputs() {
    const box = $("#player-inputs");
    const prev = [...box.querySelectorAll("input")].map(i => i.value);
    while (box.firstChild) box.removeChild(box.firstChild);
    for (let i = 0; i < count; i++) {
      const input = h("input", { type: "text", maxlength: "10", placeholder: `プレイヤー${i + 1}` });
      if (prev[i]) input.value = prev[i];
      box.appendChild(h("div", { class: "pinput-row" },
        h("span", { class: "pinput-dot", style: `background:${PLAYER_COLORS[i]}` }, i + 1),
        input,
      ));
    }
  }

  $("#btn-newgame").onclick = () => {
    Sound.play("click");
    Bgm.play("title");
    renderCount();
    renderInputs();
    UI.showScreen("setup");
  };

  $("#btn-continue").onclick = () => { Sound.play("click"); Game.load(); };

  $("#btn-back-title").onclick = () => { Sound.play("click"); UI.showScreen("title"); };

  $("#btn-start").onclick = () => {
    Sound.play("click");
    const defs = [...document.querySelectorAll("#player-inputs input")].map((inp, i) => ({
      name: inp.value.trim() || `プレイヤー${i + 1}`,
      color: PLAYER_COLORS[i],
    }));
    Game.newGame(defs);
  };

  $("#btn-zoom").onclick = () => {
    $("#btn-zoom").textContent = Board.toggleZoom() ? "🔍 プレイヤーへ" : "🗺️ 全体マップ";
  };

  $("#btn-sound").onclick = () => {
    const on = Sound.toggle();
    Bgm.toggle();
    $("#btn-sound").textContent = on ? "♪ ON" : "♪ OFF";
  };

  $("#btn-quit").onclick = () => {
    if (confirm("ゲームを中断してタイトルへ戻る？（このターンの頭から再開できます）")) location.reload();
  };

  $("#btn-to-title").onclick = () => location.reload();

  // 起動
  if (Game.hasSave()) $("#btn-continue").hidden = false;
  UI.showScreen("title");
})();
