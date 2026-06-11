// WebAudioの簡易シーケンサーBGM（音声ファイル不要・♪ボタンでON/OFF）

const Bgm = (() => {
  let ctx = null, timer = null, cur = null, on = true;
  let step = 0, nextTime = 0;

  // 16ステップ（8分音符×2小節）ループ。数値はMIDIノート、nullは休符
  const SONGS = {
    title: {
      bpm: 88,
      mel:  [67, null, 72, null, 76, null, 72, 74, 71, null, 67, null, 69, 71, 72, null],
      bass: [48, null, null, null, 53, null, null, null, 55, null, null, null, 48, null, null, null],
    },
    game: {
      bpm: 112,
      mel:  [72, 76, 79, null, 71, 74, 79, null, 72, 76, 81, 79, 77, 76, 74, 72],
      bass: [48, null, 48, null, 55, null, 55, null, 57, null, 57, null, 53, null, 55, null],
    },
    result: {
      bpm: 126,
      mel:  [72, 72, null, 72, null, 74, 76, null, 79, null, 76, null, 72, 74, 72, null],
      bass: [48, null, 55, null, 48, null, 55, null, 53, null, 55, null, 48, null, 43, null],
    },
  };

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function note(midi, time, dur, type, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = hz(midi);
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g).connect(ctx.destination);
    o.start(time);
    o.stop(time + dur + 0.02);
  }

  function tick() {
    const song = SONGS[cur];
    if (!song) return;
    const spb = 60 / song.bpm / 2;          // 8分音符1つの秒数
    while (nextTime < ctx.currentTime + 0.15) {
      const i = step % 16;
      if (song.mel[i] != null) note(song.mel[i], nextTime, spb * 1.7, "triangle", 0.035);
      if (song.bass[i] != null) note(song.bass[i], nextTime, spb * 0.9, "square", 0.022);
      nextTime += spb;
      step++;
    }
  }

  function play(name) {
    cur = name;
    if (!on) return;
    if (!ac()) return;
    stopTimer();
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(tick, 40);
  }

  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function toggle() {
    on = !on;
    if (!on) stopTimer();
    else if (cur) play(cur);
    return on;
  }

  return { play, toggle, stop: stopTimer };
})();
