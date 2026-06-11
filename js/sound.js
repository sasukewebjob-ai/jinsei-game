// WebAudioで自前生成する効果音（音声ファイル不要）

const Sound = (() => {
  let ctx = null, on = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = "square", gain = 0.05, delay = 0) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    const t = c.currentTime + delay;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  const fx = {
    click:   () => tone(700, 0.06, "square", 0.03),
    step:    () => tone(520, 0.05, "triangle", 0.04),
    land:    () => { tone(392, 0.1, "triangle", 0.05); tone(523, 0.12, "triangle", 0.04, 0.08); },
    coin:    () => { tone(880, 0.07, "square", 0.04); tone(1318, 0.12, "square", 0.04, 0.07); },
    pay:     () => { tone(330, 0.09, "sawtooth", 0.03); tone(247, 0.12, "sawtooth", 0.03, 0.08); },
    bad:     () => { tone(220, 0.18, "sawtooth", 0.04); tone(165, 0.25, "sawtooth", 0.04, 0.15); },
    win:     () => { [523, 659, 784].forEach((f, i) => tone(f, 0.12, "square", 0.04, i * 0.09)); },
    fanfare: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.16, "square", 0.05, i * 0.13)); },
    spin:    () => { for (let i = 0; i < 18; i++) tone(600 + Math.random() * 300, 0.04, "square", 0.02, i * 0.13); },
  };

  return {
    play(name) { if (!on) return; try { fx[name] && fx[name](); } catch (e) { /* 音は失敗しても無視 */ } },
    toggle() { on = !on; return on; },
  };
})();
