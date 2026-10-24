/* XMB 音效：全部用 WebAudio 现场合成（不使用原版音频文件），尽量接近 PS3 那种轻、软的“嗒”。
 * 浏览器要求先有一次用户操作才能出声，第一次按键 / 点击时自动解锁。 */
(function () {
  const X = (window.XMB = window.XMB || {});
  let ctx = null, master = null, noiseBuf = null;
  let enabled = true;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(type, f0, f1, dur, vol, when = 0, attack = 0.002) {
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq, q, when = 0, type = 'bandpass', sweepTo) {
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  const SOUNDS = {
    // 上下移动：很短的木质轻响
    move() {
      tone('sine', 1650, 900, 0.045, 0.16);
      noise(0.03, 0.08, 3200, 1.2);
    },
    // 左右切换分类：比上下略低、略长
    cat() {
      tone('sine', 1250, 700, 0.06, 0.17);
      tone('triangle', 2500, 1400, 0.03, 0.05);
      noise(0.04, 0.07, 2400, 1.0);
    },
    ok() {
      tone('sine', 880, null, 0.32, 0.14, 0, 0.004);
      tone('sine', 1320, null, 0.36, 0.1, 0.045, 0.004);
      tone('sine', 1760, null, 0.3, 0.05, 0.09, 0.004);
    },
    back() {
      tone('sine', 1100, 620, 0.12, 0.14);
      noise(0.05, 0.05, 1800, 1.0);
    },
    open() {
      noise(0.22, 0.09, 600, 0.8, 0, 'bandpass', 2600);
      tone('sine', 700, 1050, 0.12, 0.06);
    },
    close() {
      noise(0.18, 0.07, 2400, 0.8, 0, 'bandpass', 700);
    },
    err() {
      tone('square', 196, 150, 0.16, 0.05);
      tone('sine', 220, 165, 0.18, 0.12);
    },
    // 启动游戏 / toy：上扬的和弦 + 气流声
    gameboot() {
      noise(1.1, 0.07, 300, 0.6, 0, 'bandpass', 4200);
      [392, 523.3, 659.3, 784, 1046.5].forEach((f, i) => tone('sine', f, null, 1.6, 0.045, 0.05 + i * 0.07, 0.12));
      tone('triangle', 1568, 2093, 0.5, 0.02, 0.35, 0.05);
    },
    boot() {
      [261.6, 329.6, 392, 523.3].forEach((f, i) => tone('sine', f, null, 2.4, 0.05, i * 0.08, 0.25));
      noise(1.6, 0.05, 400, 0.5, 0, 'bandpass', 3000);
    },
  };

  X.sound = {
    // 给可视化用：拿到（必要时创建）同一个 AudioContext
    ctx() {
      init();
      return ctx;
    },
    get unlocked() {
      return !!ctx && ctx.state === 'running';
    },
    unlock() {
      init();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    setEnabled(v) {
      enabled = v;
    },
    play(name) {
      if (!enabled || !ctx || ctx.state !== 'running') return;
      (SOUNDS[name] || SOUNDS.move)();
    },
  };
})();
