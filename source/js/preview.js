/* 选中预览（照 PS3：在一个游戏上停一会儿，背景换成它的大图 PIC1、图标换成预览视频 ICON1、响起背景音乐 SND0）。
 * 条目字段：bg（背景大图）、bgBlur（小图做背景时模糊）、preview（图标里循环播放的视频片段，带声音）、track（音乐试听）。
 * 另外负责：音乐的频谱可视化（本地音频是真频谱，外链音频用模拟律动）和双语歌词。 */
(function () {
  const X = window.XMB;
  const $ = (s) => document.querySelector(s);
  const DELAY = 900; // 停留多久开始预览（毫秒）

  // ---------- 背景大图（两层交叉淡入） ----------
  let pic, layers, front = 0, picOn = false, bgRequest = 0;
  function showBg(url, blur) {
    const request = ++bgRequest;
    const next = layers[1 - front];
    const img = new Image();
    img.onload = () => {
      if (!picOn || request !== bgRequest) return;
      next.style.backgroundImage = `url("${url}")`;
      next.classList.toggle('blur', !!blur);
      layers[front].classList.remove('on');
      next.classList.add('on');
      front = 1 - front;
      pic.classList.add('on');
      document.body.classList.add('has-preview');
    };
    picOn = true;
    img.src = url;
  }
  function hideBg() {
    ++bgRequest;
    picOn = false;
    pic.classList.remove('on');
    document.body.classList.remove('has-preview');
    layers.forEach((l) => l.classList.remove('on'));
  }

  // ---------- 图标里的预览视频 ----------
  let vid = null, soundButton = null, previewMutedByUser = false;
  function unlockAudio(){
    if(!navigator.userActivation || !navigator.userActivation.isActive)return;
    if(!vid||previewMutedByUser||!X.settings().sound||(X.player.track&&!X.player.paused))return;
    const v=vid;v.muted=false;
    v.play().catch(()=>{if(vid===v)v.muted=true});
  }
  function playClip(node, src) {
    const box = node && node.ic;
    if (!box) return;
    const v = vid = document.createElement('video');
    v.className = 'clip';
    v.src = src;
    v.loop = true;
    v.playsInline = true;
    v.muted = previewMutedByUser || !X.sound.unlocked || !X.settings().sound || !!(X.player.track && !X.player.paused);
    v.volume = 0.6;
    const button = document.createElement('button');
    function sync() {
      if (!button) return;
      const label = X.t(v.muted ? {zh:'开启预览声音',en:'Enable preview sound'} : {zh:'静音预览',en:'Mute preview'});
      button.setAttribute('aria-label', label);
      button.title = label;
      button.setAttribute('aria-pressed', String(!v.muted));
      button.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M7 25H19L34 12V52L19 39H7Z" fill="url(#xg)"/>' + (v.muted ? '<path d="M44 24L57 40M57 24L44 40" fill="none" stroke="url(#xg)" stroke-width="5" stroke-linecap="round"/>' : '<path d="M43 23Q53 32 43 41M49 15Q67 32 49 49" fill="none" stroke="url(#xg)" stroke-width="4.5" stroke-linecap="round"/>') + '</svg>';
    }
    if (button) {
      soundButton = button;
      button.type = 'button';
      button.className = 'clip-sound';
      button.addEventListener('pointerdown', e => e.stopPropagation());
      button.addEventListener('click', e => {
        e.stopPropagation();
        if (vid !== v) return;
        X.sound.unlock();
        const enable = v.muted; previewMutedByUser = !enable;
        if (enable && X.player.track && !X.player.paused) X.player.toggle();
        v.muted = !enable;
        sync();
        if (enable) v.play().catch(() => {
          if (vid !== v) return;
          v.muted = true;
          sync();
          X.ui.toast(X.t({zh:'请再点一次声音图标开启声音',en:'Tap the sound icon again to enable audio'}));
        });
      });
      v.addEventListener('volumechange', sync);
      sync();
    }
    v.addEventListener('playing', () => {
      if (vid === v) v.classList.add('on');
      sync();
    }, { once: true });
    box.append(v);
    if (button) box.append(button);
    v.play().catch(() => {
      if (vid !== v) return;
      v.muted = true;
      sync();
      v.play().catch(() => {});
    });
  }
  function stopClip() {
    if (soundButton) { soundButton.remove(); soundButton = null; }
    if (!vid) return;
    const v = vid;
    vid = null;
    v.muted = true;
    v.classList.remove('on');
    setTimeout(() => {
      v.pause();
      v.removeAttribute('src');
      v.load();
      v.remove();
    }, 300);
  }

  // ---------- 预览调度 ----------
  let timer = null, active = null;
  function schedule(item, node) {
    stop();
    if (!item || !(item.bg || item.preview || item.track)) return;
    timer = setTimeout(() => start(item, node), DELAY);
  }
  function start(item, node) {
    active = item;
    if (item.bg) showBg(innerWidth<700&&innerHeight>innerWidth&&item.bgMobile?item.bgMobile:item.bg, item.bgBlur);
    if (item.preview) playClip(node, item.preview);
    if (item.track) X.player.preview(item.track);
  }
  function stop() {
    clearTimeout(timer);
    if (!active) return;
    active = null;
    hideBg();
    stopClip();
    X.player.stopPreview();
  }

  // ---------- 频谱可视化 + 歌词 ----------
  let cv, g2, lyr, lyrA, lyrB, bins = null, wave = null, vizAmt = 0, lastLine = -1;
  const N = 48;
  const smooth = new Float32Array(N);
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * dpr);
    cv.height = Math.round(innerHeight * dpr);
  }
  function levels(t) {
    const an = X.player.analyser && X.player.analyser();
    if (an && X.player.active) {
      if (!bins || bins.length !== an.frequencyBinCount) {
        bins = new Uint8Array(an.frequencyBinCount);
        wave = new Uint8Array(an.fftSize);
      }
      an.getByteFrequencyData(bins);
      an.getByteTimeDomainData(wave);
      // 对数分频：低频细、高频粗
      for (let i = 0; i < N; i++) {
        const a = Math.floor(Math.pow(i / N, 1.7) * bins.length * 0.72), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / N, 1.7) * bins.length * 0.72));
        let m = 0;
        for (let k = a; k < b; k++) m = Math.max(m, bins[k]);
        smooth[i] += (m / 255 - smooth[i]) * 0.5;
      }
      return true;
    }
    // 外链音频拿不到频谱：用节奏感的模拟律动
    const on = X.player.active ? 1 : 0;
    for (let i = 0; i < N; i++) {
      const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 7.2), 6);
      const v = on * (0.18 + 0.32 * Math.abs(Math.sin(t * (1.3 + i * 0.17) + i)) * (1 - i / N) + 0.35 * beat * (1 - i / N));
      smooth[i] += (v - smooth[i]) * 0.2;
    }
    wave = null;
    return false;
  }
  // 在音乐分类里、或者 XMB 闲置时全亮；在别的分类里只留淡淡的律动，不压住条目文字
  const vizLevel = () => {
    const S = X.state;
    const cat = X.data.categories[S.cat];
    return S.idle || (cat && cat.id === 'music') ? 1 : 0.28;
  };
  function drawViz(dt, t) {
    const target = X.player.active ? vizLevel() : 0;
    vizAmt += (target - vizAmt) * Math.min(1, dt * 3);
    const W = cv.width, H = cv.height;
    g2.clearRect(0, 0, W, H);
    if (vizAmt < 0.01) {
      if (X.bg) X.bg.setEnergy(0);
      return;
    }
    levels(t);
    const base = H * 0.9, span = Math.min(W * 0.56, H * 1.3), x0 = (W - span) / 2, bw = span / N;
    g2.save();
    g2.globalAlpha = vizAmt;
    g2.shadowColor = 'rgba(255,255,255,0.65)';
    g2.shadowBlur = 12 * (H / 720);
    g2.fillStyle = 'rgba(255,255,255,0.78)';
    let bass = 0;
    for (let i = 0; i < N; i++) {
      const v = smooth[i];
      if (i < 6) bass += v / 6;
      const h = Math.max(2, v * H * 0.12);
      const x = x0 + i * bw + bw * 0.22, w = bw * 0.56;
      g2.globalAlpha = vizAmt * (0.4 + 0.45 * v);
      g2.fillRect(x, base - h, w, h);
      g2.globalAlpha = vizAmt * 0.18 * (0.55 + 0.45 * v);
      g2.fillRect(x, base + 3, w, h * 0.45); // 倒影
    }
    // 波形细线
    if (wave) {
      g2.globalAlpha = vizAmt * 0.28;
      g2.shadowBlur = 6;
      g2.strokeStyle = 'rgba(255,255,255,0.9)';
      g2.lineWidth = Math.max(1, H / 600);
      g2.beginPath();
      const step = Math.max(1, Math.floor(wave.length / 256));
      for (let i = 0, j = 0; i < wave.length; i += step, j++) {
        const x = x0 + (i / wave.length) * span, y = base - H * 0.155 + ((wave[i] - 128) / 128) * H * 0.04;
        j ? g2.lineTo(x, y) : g2.moveTo(x, y);
      }
      g2.stroke();
    }
    g2.restore();
    if (X.bg) X.bg.setEnergy(bass * vizAmt);
  }
  function drawLyrics() {
    const tr = X.player.current;
    const L = tr && tr.lyrics;
    let idx = -1;
    if (L && X.player.active && vizLevel() === 1) {
      const tm = X.player.time;
      for (let i = 0; i < L.length; i++) if (tm >= L[i][0] - 0.05 && tm < (L[i + 1] ? L[i + 1][0] : L[i][1] + 2)) idx = i;
    }
    if (idx === lastLine) return;
    lastLine = idx;
    lyr.classList.toggle('on', idx >= 0);
    if (idx >= 0) {
      lyrA.textContent = L[idx][2];
      lyrB.textContent = L[idx][3];
      lyr.classList.remove('pop');
      void lyr.offsetWidth;
      lyr.classList.add('pop');
    }
  }

  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    drawViz(dt, now / 1000);
    drawLyrics();
    requestAnimationFrame(frame);
  }

  function setup() {
    pic = $('#pic1');
    pic.innerHTML = '<div class="pl"></div><div class="pl"></div><div class="shade"></div>';
    layers = [...pic.querySelectorAll('.pl')];
    cv = $('#viz');
    g2 = cv.getContext('2d');
    lyr = $('#lyrics');
    lyr.innerHTML = '<div class="la"></div><div class="lb"></div>';
    lyrA = lyr.querySelector('.la');
    lyrB = lyr.querySelector('.lb');
    resize();
    addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  X.preview = { unlockAudio, setup, schedule, stop, get active() { return active; } };
})();
