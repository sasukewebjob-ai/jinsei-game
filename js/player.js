// プレイヤー生成と共通ヘルパー

const PLAYER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#16a0b8"];

function createPlayer(i, name, color) {
  return {
    id: i, name, color,
    pos: 0, path: [0],
    money: START_MONEY, debt: 0,
    job: null, married: false, children: 0,
    houses: [],                    // HOUSES のインデックス
    insurance: { life: false, fire: false },
    stocks: 0,
    cards: [],                     // CARD_DEFS のキー
    skip: false, forceTen: false,
    goaled: false, goalOrder: 0, settle: null,
    chosen: {},                    // 分岐マスで選んだ行き先 {squareId: nextId}
  };
}

// 総資産の概算（現金＋株＋家の定価−借金返済額）
function estimateAssets(st, p) {
  let a = p.money + p.stocks * st.stockPrice - Math.floor(p.debt * 1.5);
  p.houses.forEach(hi => { a += HOUSES[hi].p; });
  return a;
}

function fmt(n) {
  const a = Math.abs(Math.round(n));
  return (n < 0 ? "-¥" : "¥") + a.toLocaleString("ja-JP");
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
