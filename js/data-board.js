// 盤面データ v3：全143マス。座標は「うねる曲線レイアウト」で自動計算する
// コース：幼少期 → 進路分岐(stop) → 大学/就職(職業ゾーン) → 青春の街 → マイホーム街道(家購入は強制)
//        → ギャンブル横丁への寄り道分岐(stop) → 波乱の40代 → 熟年の階段 → 黄金ロード → フィナーレ(ゴール前にたな卸し) → ゴール
// 「sg」が付いたマスは章内で毎ゲーム内容シャッフルされる（fixed=構造マスは固定）

const BOARD_W = 2950;
const BOARD_H = 1930;

function squareIcon(sq) {
  switch (sq.t) {
    case "start":      return "🏁";
    case "money":      return sq.amount > 0 ? "💰" : "💸";
    case "payday":     return "💴";
    case "card":       return "🃏";
    case "move":       return sq.steps > 0 ? "⚡" : "↩️";
    case "skip":       return "😪";
    case "branch":     return "🔀";
    case "jobsq":      return sq.job.e;
    case "jobfair":    return "💼";
    case "jobchange":  return "💼";
    case "marriage":   return "💍";
    case "child":      return "👶";
    case "house":      return "🏠";
    case "insurance":  return "🛡️";
    case "stock":      return "📈";
    case "casino":     return "🎰";
    case "lottery":    return sq.premium ? "💎" : "🎟️";
    case "disaster":   return "🌋";
    case "accident":   return "🚑";
    case "fire":       return "🔥";
    case "housedmg":   return "🌪️";
    case "layoff":     return "📦";
    case "stockboom":  return "🚀";
    case "stockcrash": return "📉";
    case "gift":       return "🎁";
    case "finalbet":   return "🎲";
    case "duel":       return "⚔️";
    case "choice":     return "❓";
    case "preclose":   return "📋";
    case "goal":       return "👑";
  }
  return "⬜";
}

const SQUARES = (() => {
  const sq = [];

  // 1行ぶんを x0→x1 に等間隔配置しつつ、サインカーブで上下にうねらせる
  function row(baseY, x0, x1, amp, waves, phase, sg, defs) {
    const n = defs.length;
    const step = n > 1 ? (x1 - x0) / (n - 1) : 0;
    defs.forEach((d, i) => {
      const t = n > 1 ? i / (n - 1) : 0;
      d.id = sq.length;
      d.x = Math.round(x0 + step * i);
      d.y = Math.round(baseY + amp * Math.sin(t * Math.PI * waves + phase));
      if (sg && !d.fixed) d.sg = sg;
      delete d.fixed;
      sq.push(d);
    });
  }

  // 短縮ヘルパー
  const M   = (amount, label, text) => ({ t: "money", amount, label, text });
  const PD  = () => ({ t: "payday", label: "給料日", text: "給料日！通過なら給料、止まったらなんとダブル給料！！", pass: true });
  const CD  = (text) => ({ t: "card", label: "お宝カード", text });
  const MV  = (steps, label, text) => ({ t: "move", steps, label, text });
  const JOB = (list, name) => ({ t: "jobsq", job: list.find(j => j.n === name), label: name, text: "", fixed: true });
  const ACC = (amount, label, text) => ({ t: "accident", amount, label, text });
  const CH  = (count, label, text) => ({ t: "child", count, label, text });

  // ---- 第1章 はじまりの公園（→） ----
  row(170, 190, 1340, 22, 1.6, 0.3, "g0", [
    { t: "start", label: "スタート", text: "いざ、波乱万丈の人生へ！", fixed: true },
    M(50000,  "お年玉",       "親戚が多くてお年玉ガッポリ！"),
    M(-30000, "衝動買い",     "おもちゃを衝動買いしてしまった…"),
    M(100000, "子役デビュー", "子役オーディションに合格！ギャラGET！"),
    M(-50000, "課金バレ",     "ゲームに課金しすぎてお小遣い没収…"),
    MV(2, "かけっこ1等", "かけっこで1等賞！勢いで2マス進む！"),
    M(-80000, "自転車激突",   "自転車で壁に激突。修理代を払う…"),
    CD("道ばたでキラリと光る何かを拾った！"),
    M(150000, "自由研究バズ", "夏休みの自由研究が大バズり！賞金GET！"),
    { t: "branch", stop: true, label: "進路選択", text: "人生最初の分かれ道！ここで完全停止。大学へ行く？すぐ働く？", fixed: true,
      routes: [
        { label: "🎓 大学ルート（学費¥3,500,000／高給のエリート職業ゾーンへ）", next: 0 },
        { label: "🏃 就職ルート（学費ゼロ＆給料が早い！個性派の手に職ゾーンへ）", next: 0 },
      ] },
  ]);

  // ---- 大学ルート＋エリート職業ゾーン（←） ----
  row(345, 1560, 260, 20, 1.2, 2.1, "gU", [
    Object.assign(M(-3500000, "大学入学", "大学に合格！学費を支払う（通過でも支払い）"), { pass: true, fixed: true }),
    M(-100000, "飲み会三昧", "サークルの飲み会が続いて金欠…"),
    { t: "skip", label: "留年危機", text: "単位を落として補習地獄！1回休み…" },
    M(300000,  "学会で表彰", "研究が学会で大絶賛！賞金GET！"),
    JOB(JOBS_PRO, "医者"),
    JOB(JOBS_PRO, "弁護士"),
    JOB(JOBS_PRO, "パイロット"),
    JOB(JOBS_PRO, "ITクリエイター"),
    JOB(JOBS_PRO, "大学教授"),
    JOB(JOBS_PRO, "宇宙飛行士"),
    { t: "jobfair", pool: "all", stop: true, label: "就職フェア", text: "合同就職フェア！全職業から選べる。まだ無職ならここで必ず就職！", fixed: true },
  ]);

  // ---- 就職ルート＋手に職ゾーン（←） ----
  row(520, 1490, 250, 20, 1.3, 4.2, "gW", [
    PD(),
    M(100000,  "バイト掛け持ち", "アルバイトを掛け持ちして稼ぐ！"),
    M(-150000, "同期と飲みすぎ", "同期と語り明かして財布が軽い…"),
    JOB(JOBS_NORMAL, "大工"),
    JOB(JOBS_NORMAL, "美容師"),
    JOB(JOBS_NORMAL, "ユーチューバー"),
    JOB(JOBS_NORMAL, "板前"),
    JOB(JOBS_NORMAL, "消防士"),
    JOB(JOBS_NORMAL, "パティシエ"),
    M(50000, "フリマ職人", "断捨離フリマでお小遣い稼ぎ！"),
    { t: "jobfair", pool: "all", stop: true, label: "就職フェア", text: "合同就職フェア！全職業から選べる。まだ無職ならここで必ず就職！", fixed: true },
  ]);

  // ---- 第2章 青春の街（→） ----
  row(695, 190, 2760, 24, 2.2, 1.0, "g3", [
    M(-100000, "一人暮らし", "一人暮らし開始！敷金礼金が痛い…"),
    PD(),
    M(500000,  "お宝鑑定",   "フリマで買った壺がまさかのお宝！"),
    ACC(200000, "食中毒", "屋台の生牡蠣にあたって入院…（生命保険があればセーフ）"),
    CD("謎の福引きで大当たりが出た！"),
    MV(3, "終電ダッシュ", "終電に間に合った！その勢いで3マス進む！"),
    { t: "insurance", label: "保険の勧誘", text: "腕利きの保険セールスが登場。保険に入れる！" },
    PD(),
    M(-300000, "ご祝儀ラッシュ", "友人の結婚式ラッシュ！ご祝儀貧乏…"),
    { t: "marriage", stop: true, label: "結婚！", text: "運命の出会い！結婚して全員からご祝儀をもらう！" },
    CH(1, "新居に天使", "新居に赤ちゃんがやってきた！（ゴールで1人につき¥500,000）"),
    M(200000,  "フォトコン入賞", "新婚旅行の写真がフォトコン入賞！"),
    { t: "stock", label: "株デビュー", text: "証券セミナーに参加。株を売買できる！" },
    ACC(250000, "スキーで骨折", "調子に乗ってジャンプ→着地失敗で骨折…（生命保険があればセーフ）"),
    M(-250000, "家電全滅",   "家電が一斉に寿命を迎えた…"),
    PD(),
    M(1000000, "特別ボーナス", "社内コンペで大金星！特別ボーナス！"),
    { t: "choice", label: "怪しい投資話", text: "「絶対に儲かる」という怪しい投資話を持ちかけられた…どうする？",
      opts: [
        { b: "💸 乗ってみる！", out: [
          { w: 1, m: 1500000,  t: "なんと本物だった！投資が大化け！！" },
          { w: 1, m: -1000000, t: "やっぱり詐欺だった…", scam: true },
        ] },
        { b: "🙅 きっぱり断る", out: [
          { w: 1, m: 0, t: "無難が一番。何ごともなく過ぎていった" },
        ] },
      ] },
    CD("怪しい骨董市で掘り出し物を発見！"),
    { t: "duel", stake: 500000, label: "運命のライバル", text: "運命のライバルが立ちはだかる！好きな相手を指名してルーレット勝負！（大きい目が勝ち・負けたら賭け金を支払う）" },
  ]);

  // ---- 第3章 マイホーム街道（←）…家の購入は強制！途中にギャンブル横丁への寄り道分岐 ----
  row(870, 2760, 390, 20, 1.7, 3.6, "g4", [
    M(100000,  "コツコツ貯金", "堅実な節約生活が実る！"),
    { t: "house", forced: true, stop: true, label: "マイホーム購入", text: "人生の一大イベント！ここで必ず家を買う！（お金が足りなければ約束手形で）", fixed: true },
    CH(1, "赤ちゃん誕生", "第一子…いや何人目でも嬉しい！家族が増えた！（ゴールで1人¥500,000）"),
    M(-150000, "ベビー用品",   "ベビーグッズを爆買い…"),
    M(200000,  "昇進",         "昇進して役職手当GET！"),
    { t: "insurance", label: "保険の見直し", text: "保険の見直し相談会。保険に入れる！" },
    { t: "branch", stop: true, label: "寄り道？", text: "ギャンブル横丁の入り口で完全停止。誘惑に乗る？それとも平穏な家路？", fixed: true,
      routes: [
        { label: "🏡 平穏な家路（そのまま家庭の章を進む）", next: 0 },
        { label: "🎰 ギャンブル横丁へ寄り道（カジノだらけの回り道！）", next: 0 },
      ] },
    CH(2, "双子誕生!?", "なんと双子が誕生！！家族が一気に2人増える！"),
    PD(),
    { t: "fire", label: "もらい火", text: "お隣のBBQが燃え移って火事！！（火災保険がなければ家を1軒失う）" },
    M(-100000, "PTA役員",      "PTA役員に任命され出費がかさむ…"),
    M(300000,  "副業ブログ",   "副業ブログが大当たり！"),
    CD("庭の物置から先代の遺品が出てきた！"),
    MV(1, "平穏な日々", "穏やかな日常。心晴れやかに1マス進む"),
  ]);

  // ---- ギャンブル横丁（←）…寄り道ルート ----
  row(1045, 1640, 320, 20, 1.9, 0.7, "g5", [
    { t: "casino", kind: "highlow", label: "ハイ＆ロー", text: "怪しいカジノを発見！ハイ＆ローで勝負できる！（勝てば2倍）" },
    Object.assign(M(-500000, "持ち逃げ", "ギャンブル仲間に有り金を持ち逃げされた…"), { scam: true }),
    { t: "lottery", label: "宝くじ売り場", text: "宝くじ売り場を発見！夢を買う？（1枚¥100,000）" },
    { t: "casino", kind: "roulette", label: "一点賭け", text: "カジノのルーレットで一点賭け！当たれば10倍！！" },
    PD(),
    M(1500000, "万馬券",       "競馬で万馬券的中！！"),
    M(-800000, "大負け",       "カジノで熱くなって大負け…"),
    CD("カジノのVIPルームで怪しい男から何かをもらった…"),
    { t: "casino", kind: "highlow", label: "ハイ＆ロー", text: "また怪しいカジノだ！ハイ＆ローで勝負できる！（勝てば2倍）" },
    M(2000000, "ポーカー優勝", "ポーカー大会で優勝！賞金ガッポリ！！"),
    M(2000000, "ジャックポット", "スロットでジャックポット！！コインの雨だ！！"),
    { t: "disaster", kind: "half", cap: 3000000, label: "身ぐるみ剥がし", text: "大勝負に負けて身ぐるみ剥がされた！所持金が半分に…！（被害は最大¥3,000,000）" },
  ]);

  // ---- 第4章 波乱の40代（→）…保険が輝く章 ----
  row(1220, 190, 2760, 24, 2.4, 2.8, "g6", [
    PD(),
    { t: "jobchange", stop: true, label: "転職フェア", text: "転職フェア開催中！ここで完全停止。職業を引き直せる！" },
    ACC(300000, "ぎっくり腰", "ぎっくり腰で入院…（生命保険があればセーフ）"),
    { t: "house", stop: true, label: "不動産屋", text: "腕利きの不動産屋と出会った。ここで完全停止。家を買える！" },
    { t: "stock", label: "株式市場", text: "株式市場が活況！株を売買できる！" },
    { t: "fire", label: "連続ボヤ騒ぎ", text: "近所で連続ボヤ騒ぎ！飛び火した！！（火災保険がなければ家を1軒失う）" },
    CH(1, "末っ子誕生", "末っ子が誕生！ますます賑やかに！"),
    M(500000,  "天才キッズ",   "子供（または甥っ子）がクイズ番組で優勝！賞金のおすそ分け！"),
    PD(),
    { t: "stockboom", label: "株価大暴騰", text: "好景気キター！！株価が2倍に！！" },
    M(-400000, "リフォーム詐欺", "リフォーム詐欺に引っかかった…"),
    { t: "choice", label: "庭に謎の老人", text: "庭に身なりのいい謎の老人が住み着いてしまった…どうする？",
      opts: [
        { b: "🧹 追い出す", out: [
          { w: 1, m: -300000, t: "逆ギレされて庭の物を壊された…" },
          { w: 1, m: 0,       t: "意外と素直に去っていった" },
        ] },
        { b: "🍵 住まわせてあげる", out: [
          { w: 2, m: 2000000,  t: "なんと大富豪だった！！莫大なお礼が！！" },
          { w: 3, m: -500000,  t: "ただのタダ飯食いだった…食費がかさむ…" },
        ] },
      ] },
    { t: "housedmg", amount: 800000, label: "台風直撃", text: "超大型台風で屋根が吹き飛んだ！（火災保険でセーフ／家なしなら雨宿り代だけ）" },
    { t: "layoff", label: "会社倒産", text: "まさかの会社倒産！無職になってしまう…" },
    M(3000000, "遺産相続",     "遠い親戚の遺産が転がり込んだ！"),
    ACC(500000, "もらい事故", "交差点でもらい事故！入院…（生命保険があればセーフ）"),
    { t: "stockcrash", label: "株価大暴落", text: "世界的不況！株価が半分に…" },
    PD(),
    M(-500000, "留学費用",     "子供（または甥っ子）の留学を全力支援！"),
    MV(-3, "人生に迷う", "ふと人生に迷い、来た道を3マス戻る…"),
  ]);

  // ---- 第5章 熟年の階段（←） ----
  row(1395, 2760, 260, 20, 1.5, 3.1, "g7", [
    PD(),
    M(2000000, "役員就任",   "子会社の役員に大抜擢！就任祝い金！"),
    M(-2000000, "子の結婚式", "子供（または甥っ子）の結婚式を盛大に挙げる！"),
    { t: "house", stop: true, label: "リゾート物件フェア", text: "リゾート物件の即売会！ここで完全停止。別荘を買える！" },
    ACC(150000, "人間ドック", "人間ドックで再検査続き…医療費が…（生命保険があればセーフ）"),
    { t: "stock", label: "証券窓口", text: "株を売買できる！" },
    M(1500000, "恩返し",     "昔世話した教え子が大成して恩返ししてくれた！"),
    CD("蔵の整理をしていたら古い木箱が出てきた！"),
    CH(1, "養子を迎える", "ひょんなご縁で養子を迎えることに！家族が増えた！"),
    { t: "lottery", label: "宝くじ売り場", text: "縁起のいい売り場を発見！夢を買う？（1枚¥100,000）" },
    M(1000000, "盆栽バブル", "丹精込めた盆栽が海外コレクターに高値で売れた！"),
    { t: "insurance", label: "最後の保険窓口", text: "保険に入るラストチャンス！この先は波乱が待っているぞ…" },
    { t: "duel", stake: 1000000, label: "同窓会の意地", text: "同窓会で昔のライバルと再会！互いに引けない意地のルーレット勝負！（大きい目が勝ち・負けたら賭け金を支払う）" },
    { t: "gift", amount: 100000, label: "金婚式", text: "金婚式のお祝い！全員からお祝い金をもらう！" },
    PD(),
    MV(2, "孫と山登り", "孫と山登りして大はしゃぎ！若返って2マス進む！"),
  ]);

  // ---- 第6章 黄金ロード（→）…大金が動く ----
  row(1570, 190, 2760, 20, 2.0, 0.5, "g8", [
    PD(),
    M(5000000, "退職金ガッポリ", "長年の勤めを終えて退職金がドーン！！"),
    M(-3000000, "孫の留学",  "孫の海外留学を全力支援！じいじ・ばあばの威厳！"),
    { t: "lottery", premium: true, label: "プラチナ宝くじ", text: "1枚¥1,000,000のプラチナ宝くじ！1等はまさかの¥50,000,000！！" },
    M(15000000, "会社売却！！", "副業で作った会社をIT大手が買収！！人生最大の臨時収入！！"),
    { t: "disaster", kind: "half", scam: true, label: "老後資金詐欺", text: "老後資金を狙う詐欺に遭った！所持金が半分に…！" },
    CD("旅先の市場で「絶対に儲かる壺」を断ったら、お礼に何かくれた"),
    { t: "casino", kind: "roulette", label: "ラストカジノ", text: "人生最後の大勝負！一点賭けルーレット（当たれば10倍）！" },
    Object.assign(M(-2000000, "ロマンス詐欺", "甘い言葉に騙されて大金を貢いでしまった…"), { scam: true }),
    M(5000000, "ベストセラー", "自叙伝がまさかの大ベストセラー！！"),
    { t: "gift", amount: 300000, label: "古希のお祝い", text: "古希のお祝い！全員からお祝い金をもらう！" },
    { t: "housedmg", amount: 600000, label: "ゲリラ豪雨", text: "観測史上最大のゲリラ豪雨で雨漏り！（火災保険でセーフ／家なしなら傘代だけ）" },
    { t: "stock", label: "最後の証券窓口", text: "株の手仕舞いどき？売買できるラストチャンス！" },
    M(3000000, "個展大成功", "趣味で描きためた絵の個展がまさかの大成功！！"),
  ]);

  // ---- 終章 夕焼けのフィナーレ（←）…ゴール前に人生のたな卸し ----
  row(1745, 2760, 390, 18, 1.5, 5.0, "g9", [
    M(-1000000, "世界一周",    "夫婦で世界一周旅行へ！心は豊かに、財布は軽く…"),
    M(5000000, "拾った宝くじ", "道で拾った宝くじがまさかの大当たり！！"),
    PD(),
    MV(2, "孫の運動会", "孫の運動会で全力疾走！若返って2マス進む！"),
    M(3000000, "畑から小判", "家庭菜園を耕していたら小判がザクザク出てきた！！"),
    { t: "finalbet", stake: 3000000, label: "人生最後の大勝負", text: "ルーレットで6以上なら+¥3,000,000、5以下なら-¥3,000,000！挑む？" },
    CD("人生の思い出を整理していたら、忘れていた何かが出てきた"),
    { t: "choice", label: "豪華客船の勧誘", text: "豪華客船クルーズ（¥800,000）の勧誘が来た！船上カジノもあるらしい…乗る？",
      opts: [
        { b: "🚢 乗船する！", out: [
          { w: 3, m: 3000000, t: "船上カジノで伝説の大勝ち！！旅費どころか大黒字！！" },
          { w: 7, m: -800000, t: "優雅で最高の旅だった…お財布以外は…" },
        ] },
        { b: "🏠 見送る", out: [
          { w: 1, m: 0, t: "家でのんびり。それもまた人生" },
        ] },
      ] },
    M(500000, "詐欺撃退",     "振り込め詐欺を撃退して警察から報奨金！"),
    M(200000, "老人会の会長", "老人会の会長に就任！みんなのまとめ役！"),
    M(-300000, "お年玉ラッシュ", "孫と親戚の子にお年玉を配りまくる！"),
    M(2000000, "庭が文化財!?", "自宅の庭がまさかの文化財登録！報奨金GET！"),
    { t: "preclose", stop: true, label: "人生のたな卸し", text: "ゴール前のプチ精算所で完全停止。資産を整理してゴールに備えよう！", fixed: true },
    MV(1, "健康優良シニア", "医者もびっくりの健康体！元気に1マス進む！"),
    { t: "goal", label: "ゴール", text: "ゴール！！悠々自適の御隠居ライフ！", fixed: true },
  ]);

  // つながり（デフォルトは次のID。分岐・合流だけ上書き）
  sq.forEach(s => { if (!s.next) s.next = s.t === "goal" ? [] : [s.id + 1]; });
  sq[9].next = [10, 21];  sq[9].routes[0].next = 10;  sq[9].routes[1].next = 21;
  sq[20].next = [32];
  sq[31].next = [32];
  sq[58].next = [59, 66]; sq[58].routes[0].next = 59; sq[58].routes[1].next = 66;
  sq[65].next = [78];
  sq[77].next = [78];

  // 職業マスの説明文
  sq.forEach(s => {
    if (s.t === "jobsq") {
      s.text = `${s.job.e} ${s.job.n}（給料 ¥${s.job.s.toLocaleString()}）になれるマス。無職なら即就職！職持ちなら転職もできる！`;
    }
  });

  return sq;
})();

// 道路を滑らかな1本道として描くためのマスIDチェーン（重複区間は重ね描きでOK）
const ROAD_CHAINS = (() => {
  const r = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  return [
    r(0, 9),
    [9, ...r(10, 20), 32],
    [9, ...r(21, 31), 32],
    r(32, 58),
    [58, ...r(59, 65), 78],
    [58, ...r(66, 77), 78],
    r(78, 142),
  ];
})();

// ---- 毎ゲームのマス内容シャッフル（章内のみ・構造マスは固定） ----
const SHUFFLE_FIELDS = ["t", "label", "text", "amount", "steps", "kind", "cap", "scam",
                        "premium", "count", "stake", "pool", "opts", "pass", "stop", "forced", "job", "routes"];
const BASE_CONTENT = SQUARES.map(s => {
  const o = {};
  SHUFFLE_FIELDS.forEach(f => { if (f in s) o[f] = s[f]; });
  return o;
});

// layout[i] = 位置iに置くBASE_CONTENTのインデックス
function makeBoardLayout() {
  const layout = SQUARES.map((_, i) => i);
  const groups = {};
  SQUARES.forEach((s, i) => { if (s.sg) (groups[s.sg] = groups[s.sg] || []).push(i); });
  for (const k in groups) {
    const idx = groups[k];
    const shuffled = [...idx];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    idx.forEach((pos, n) => { layout[pos] = shuffled[n]; });
  }
  return layout;
}

function applyBoardLayout(layout) {
  SQUARES.forEach((s, i) => {
    SHUFFLE_FIELDS.forEach(f => delete s[f]);
    Object.assign(s, BASE_CONTENT[(layout && layout[i] != null) ? layout[i] : i]);
  });
}
