// プレイヤー生成と共通ヘルパー

const PLAYER_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#16a0b8"];

function createPlayer(i, name, color) {
  return {
    id: i, name, color,
    pos: 0, path: [0],
    money: START_MONEY,
    notes: 0,                      // 約束手形の枚数（1枚¥1,000,000・ゴール時¥1,500,000で返済）
    job: null, married: false, children: 0,
    houses: [],                    // HOUSES のインデックス
    insurance: { life: false, fire: false },
    stocks: 0,
    cards: [],                     // CARD_DEFS のキー
    skip: false, forceTen: false,
    goaled: false, goalOrder: 0, settle: null,
    chosen: {},                    // 分岐マスで選んだ行き先 {squareId: nextId}
    stats: { gamble: 0, borrowed: 0, housesBought: 0, jobChanges: 0, duelWins: 0 },
  };
}

// 総資産の概算（現金＋株＋家の定価−手形返済額）
function estimateAssets(st, p) {
  let a = p.money + p.stocks * st.stockPrice - p.notes * NOTE_REPAY;
  p.houses.forEach(hi => { a += HOUSES[hi].p; });
  return a;
}

function fmt(n) {
  const a = Math.abs(Math.round(n));
  return (n < 0 ? "-¥" : "¥") + a.toLocaleString("ja-JP");
}

// window.TURBO（シミュレーション用倍速係数）が立っていれば待ち時間を短縮
function wait(ms) { return new Promise(r => setTimeout(r, ms / (window.TURBO || 1))); }
