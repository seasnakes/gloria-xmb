/* 查看器：
 * - 框架查看器：toy（带 PS3 开游戏的过场）和 B 站视频，全屏 iframe，顶部细条可以返回 / 新标签页打开
 * - 照片查看器：左右翻页、↑ 看提示词、△ 复制提示词 / 幻灯片放映
 * - 音乐播放器：在 XMB 里后台播放，正在播放的曲目右侧显示进度（和实机一样）
 * 打开查看器时 XMB 进入 viewer 模式，按键交给 XMB.viewer.handle(动作)。 */
(function () {
  const X = window.XMB;
  const $ = (s) => document.querySelector(s);
  const T = (zh, en) => ({ zh, en });
  const tx = (o) => X.t(o);
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const TEXT = {
    back: T('返回 XMB', 'Back to XMB'),
    ext: T('在新标签页打开', 'Open in New Tab'),
    hintFrame: T('按 Esc 或点左上角返回', 'Press Esc or click top-left to return'),
    prompt: T('提示词', 'Prompt'),
    showPrompt: T('显示提示词', 'Show Prompt'),
    hidePrompt: T('隐藏提示词', 'Hide Prompt'),
    copy: T('复制提示词', 'Copy Prompt'),
    copied: T('已复制提示词', 'Prompt copied'),
    copyFail: T('复制失败，请手动选择文字', 'Copy failed'),
    slideOn: T('幻灯片放映', 'Slideshow'),
    slideOff: T('停止幻灯片放映', 'Stop Slideshow'),
    original: T('在新标签页打开原图', 'Open Original'),
    refs: T('参考图：', 'References: '),
    noPrompt: T('（这张没有记录提示词）', '(No prompt recorded)'),
    cantPlay: T('无法播放这首（可能需要会员或已下架），可以在网易云里打开。', "Can't play this track. Try opening it in NetEase."),
    hintPhoto: T('← → 翻页　↑ 提示词　△ 选项　○ 返回', '← → Page　↑ Prompt　△ Options　○ Back'),
  };

  let root = null;
  let mode = null; // 'frame' | 'photo'
  let fopts = null;

  function setup() {
    root = $('#viewer');
    root.innerHTML =
      `<div class="vf"><div class="vbar"><button class="vback"><i>◀</i><span></span></button><div class="vtitle"></div>` +
      `<button class="vext"><span></span><i>↗</i></button></div><iframe allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media; picture-in-picture"></iframe><video class="sim-video" controls playsinline preload="metadata"></video><div class="sim-caption"></div>` +
      `<div class="vload"><i></i><i></i><i></i></div><div class="vhint"></div></div>` +
      `<div class="vp"><div class="pv-stage"><img class="pa" alt=""><img class="pb" alt=""></div>` +
      `<div class="pv-bar"><span class="pv-title"></span><span class="pv-idx"></span><span class="pv-date"></span></div>` +
      `<div class="pv-prompt"><div class="pv-h"></div><div class="pv-txt"></div><div class="pv-refs"></div></div><div class="pv-hint"></div></div>`;
    root.querySelector('.vback').addEventListener('click', (e) => {
      e.stopPropagation();
      close();
    });
    root.querySelector('.vext').addEventListener('click', (e) => {
      e.stopPropagation();
      if (fopts) window.open(fopts.external || fopts.url, '_blank', 'noopener');
    });
    root.querySelector('.vp').addEventListener('click', (e) => {
      e.stopPropagation();
      wake();
      if (e.target.closest('.pv-prompt')) return;
      const x = e.clientX / innerWidth;
      if (x < 0.28) step(-1);
      else if (x > 0.72) step(1);
      else togglePrompt();
    });
    const iframe = root.querySelector('iframe');
    iframe.addEventListener('load', () => {
      if (iframe.src && iframe.src !== 'about:blank') root.classList.remove('loading');
    });
  }

  function labels() {
    root.querySelector('.vback span').textContent = tx(TEXT.back);
    root.querySelector('.vext span').textContent = tx(TEXT.ext);
    root.querySelector('.vhint').textContent = tx(TEXT.hintFrame);
    root.querySelector('.pv-h').textContent = tx(TEXT.prompt);
    root.querySelector('.pv-hint').textContent = tx(TEXT.hintPhoto);
  }

  // ---------- 框架查看器（toy / 视频） ----------
  function openFrame(o) {
    fopts = o;
    mode = 'frame';
    labels();
    const toy = o.kind === 'toy';
    root.querySelector('.vtitle').textContent = o.title || '';
    document.body.classList.add('viewing', 'launching');
    if (toy) {
      document.body.classList.add('gameboot');
      setTimeout(() => document.body.classList.remove('gameboot'), 1600);
    }
    X.sound.play(toy ? 'gameboot' : 'ok');
    X.setMode('viewer');
    root.className = 'open frame loading' + (toy ? ' toy' : '');
    const iframe = root.querySelector('iframe');
    setTimeout(() => {
      if (mode === 'frame' && fopts === o) iframe.src = o.url;
    }, toy ? 1000 : 300);
  }

  function openClip(g){
    fopts={url:g.clip,external:g.clip};mode='clip';labels();
    root.querySelector('.vtitle').textContent=X.t({zh:g.title,en:g.en});
    root.querySelector('.sim-caption').textContent=X.t({zh:'GLORIA · 多元宇宙 / '+g.title,en:'GLORIA · Multiverse / '+g.en});
    document.body.classList.add('viewing');root.className='open clip';
    X.setMode('viewer');
    if(X.player.track&&!X.player.paused)X.player.toggle();
    const v=root.querySelector('.sim-video');v.poster=g.bg;v.src=g.clip;v.muted=!X.settings().sound;v.volume=.8;
    v.play().catch(()=>{v.muted=true;v.play().catch(()=>{})});
  }
  // ---------- 照片查看器 ----------
  let list = [], idx = 0, front = 'pa', promptOn = false, slideTimer = null, calmTimer = null;
  function openPhoto(items, i, { slideshow = false } = {}) {
    list = items;
    idx = Math.max(0, Math.min(i, items.length - 1));
    mode = 'photo';
    labels();
    promptOn = false;
    document.body.classList.add('viewing');
    root.className = 'open photo';
    X.setMode('viewer');
    X.sound.play('ok');
    root.querySelectorAll('.pv-stage img').forEach((im) => im.classList.remove('on'));
    render();
    setSlide(slideshow);
    wake();
  }
  function render() {
    const it = list[idx];
    const stage = root.querySelector('.pv-stage');
    const next = front === 'pa' ? 'pb' : 'pa';
    const img = stage.querySelector('.' + next);
    img.onload = () => {
      stage.querySelector('.' + front).classList.remove('on');
      img.classList.add('on');
      front = next;
    };
    img.src = it.src;
    root.querySelector('.pv-title').textContent = tx(it.title);
    root.querySelector('.pv-idx').textContent = `${idx + 1} / ${list.length}`;
    root.querySelector('.pv-date').textContent = it.date || '';
    root.querySelector('.pv-txt').textContent = it.prompt || tx(TEXT.noPrompt);
    root.querySelector('.pv-refs').textContent = it.refs && it.refs.length ? tx(TEXT.refs) + it.refs.join('、') : '';
    root.querySelector('.pv-prompt').scrollTop = 0;
    root.classList.toggle('prompt', promptOn);
  }
  function step(d, wrap) {
    let n = idx + d;
    if (wrap) n = (n + list.length) % list.length;
    if (n < 0 || n >= list.length) return;
    idx = n;
    X.sound.play('move');
    render();
  }
  function togglePrompt(v) {
    promptOn = v == null ? !promptOn : v;
    root.classList.toggle('prompt', promptOn);
    X.sound.play('move');
  }
  function setSlide(on) {
    clearInterval(slideTimer);
    slideTimer = on ? setInterval(() => step(1, true), 5000) : null;
    root.classList.toggle('slide', !!on);
  }
  // 照片信息条闲置 3 秒后淡出
  function wake() {
    root.classList.remove('calm');
    clearTimeout(calmTimer);
    calmTimer = setTimeout(() => root.classList.add('calm'), 3000);
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  function photoOptions() {
    const it = list[idx];
    const rows = [
      { label: promptOn ? TEXT.hidePrompt : TEXT.showPrompt, run: () => togglePrompt() },
      { label: TEXT.copy, run: async () => X.ui.toast(tx((await copy(it.prompt || '')) ? TEXT.copied : TEXT.copyFail)) },
      { label: slideTimer ? TEXT.slideOff : TEXT.slideOn, run: () => setSlide(!slideTimer) },
      { label: TEXT.original, run: () => window.open(it.src, '_blank', 'noopener') },
    ];
    X.ui.panel(rows, 0, (i) => {
      X.ui.closePanel(true);
      rows[i].run();
    });
  }

  function close() {
    if (!mode) return;
    if (mode === 'frame') {
      const iframe = root.querySelector('iframe');
      iframe.src = 'about:blank';
      fopts = null;
    }
    if(mode==='clip'){const v=root.querySelector('.sim-video');v.pause();v.removeAttribute('src');v.load();}
    setSlide(false);
    mode = null;
    root.className = '';
    document.body.classList.remove('viewing', 'launching', 'gameboot');
    X.setMode('xmb');
    X.sound.play('back');
  }

  function handle(a) {
    if (mode === 'photo') {
      wake();
      if (a === 'left') step(-1, !!slideTimer);
      else if (a === 'right') step(1, !!slideTimer);
      else if (a === 'up') togglePrompt(true);
      else if (a === 'down') togglePrompt(false);
      else if (a === 'ok') togglePrompt();
      else if (a === 'opt') photoOptions();
      else if (a === 'back') close();
      return;
    }
    if(mode==='clip'&&a==='ok'){const v=root.querySelector('.sim-video');if(v.paused)v.play().catch(()=>{});else v.pause();return;}
    if (mode === 'frame' || mode==='clip') {
      if (a === 'back') close();
      else if (a === 'opt')
        X.ui.panel([{ label: TEXT.back }, { label: TEXT.ext }], 0, (i) => {
          X.ui.closePanel(true);
          if (i === 0) close();
          else window.open(fopts.external || fopts.url, '_blank', 'noopener');
        });
    }
  }
  function onWheel(e) {
    if (mode === 'photo' && e.target.closest && e.target.closest('.pv-prompt')) return true; // 让提示词面板自己滚动
    return false;
  }

  X.viewer = { setup, openFrame, openClip, openPhoto, close, handle, onWheel, get mode() { return mode; } };

  // ---------- 音乐播放器（含试听和频谱） ----------
  // 本地音频走带分析器的那个 <audio>（能做真频谱）；外链音频走另一个（跨域音频接进 WebAudio 会被静音）
  const elLocal = new Audio(), elRemote = new Audio();
  elLocal.preload = elRemote.preload = 'auto';
  let el = elLocal, analyser = null, fadeTimer = null;
  const isLocal = (tr) => tr.local || !/^https?:/i.test(tr.audio) || tr.audio.startsWith(location.origin);
  function useEl(tr) {
    const next = isLocal(tr) ? elLocal : elRemote;
    if (next !== el) el.pause();
    el = next;
    if (el === elLocal) ensureAnalyser();
    return el;
  }
  function ensureAnalyser() {
    if (analyser) return;
    try {
      const ac = X.sound.ctx();
      const src = ac.createMediaElementSource(elLocal);
      analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.78;
      src.connect(analyser);
      analyser.connect(ac.destination);
    } catch (e) {
      console.warn('[xmb] 频谱分析不可用：', e);
    }
  }
  function fadeTo(vol, ms, done) {
    clearInterval(fadeTimer);
    const from = el.volume, t0 = performance.now(), e = el;
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      e.volume = from + (vol - from) * k;
      if (k >= 1) {
        clearInterval(fadeTimer);
        done && done();
      }
    }, 30);
  }
  function load(tr, at) {
    const e = useEl(tr);
    X.sound.unlock();
    if (e.getAttribute('src') !== tr.audio) e.src = tr.audio;
    const seek = () => {
      try {
        e.currentTime = at || 0;
      } catch (err) {}
    };
    if (e.readyState >= 1) seek();
    else e.addEventListener('loadedmetadata', seek, { once: true });
    return e;
  }

  const P = {
    track: null, // 正式播放的曲目
    previewing: null, // 试听中的曲目
    list: [],
    index: -1,
    play(lst, i) {
      P.previewing = null;
      clearInterval(fadeTimer);
      P.list = lst;
      P.index = i;
      P.track = lst[i];
      const e = load(P.track, P.track.start || 0);
      e.volume = 1;
      e.play().catch(() => {});
      X.emit('player', P);
    },
    // 选中停留时试听一段（像 PS3 停在游戏上响起的背景音乐），淡入淡出
    preview(tr) {
      if (P.track || !tr || !tr.audio) return;
      P.previewing = tr;
      const at = tr.preview != null ? tr.preview : Math.min(30, (tr.duration || 60) * 0.25);
      const e = load(tr, at);
      e.volume = 0;
      e.play().then(() => fadeTo(0.8, 900)).catch(() => {});
      clearTimeout(P._pvEnd);
      P._pvEnd = setTimeout(() => P.previewing === tr && P.stopPreview(), 30000);
      X.emit('player', P);
    },
    stopPreview() {
      if (!P.previewing) return;
      const tr = P.previewing;
      P.previewing = null;
      fadeTo(0, 350, () => {
        if (!P.track && !P.previewing) el.pause();
      });
      X.emit('player', P, tr);
    },
    toggle() {
      if (!P.track) return;
      if (el.paused) el.play().catch(() => {});
      else el.pause();
      X.emit('player', P);
    },
    stop() {
      el.pause();
      P.track = null;
      P.previewing = null;
      P.index = -1;
      X.emit('player', P);
    },
    next() {
      if (P.index >= 0 && P.index < P.list.length - 1) P.play(P.list, P.index + 1);
      else P.stop();
    },
    prev() {
      if (P.index > 0) P.play(P.list, P.index - 1);
    },
    get paused() {
      return el.paused;
    },
    get current() {
      return P.track || P.previewing;
    },
    get time() {
      return el.currentTime;
    },
    get active() {
      return !!(P.track || P.previewing) && !el.paused;
    },
    analyser: () => (el === elLocal ? analyser : null),
    is(track) {
      return !!P.track && P.track === track;
    },
    status(track) {
      if (P.previewing === track && !P.track) return '♪';
      if (!P.is(track)) return null;
      const end = P.track.end || el.duration || P.track.duration || 0;
      const cur = el.currentTime - (P.track.start || 0);
      return `${el.paused ? '❚❚' : '▶'}  ${fmt(cur)} / ${fmt(end - (P.track.start || 0))}`;
    },
  };
  for (const e of [elLocal, elRemote]) {
    e.addEventListener('ended', () => e === el && P.track && P.next());
    e.addEventListener('timeupdate', () => {
      if (e === el && P.track && P.track.end && e.currentTime >= P.track.end) P.next();
    });
    e.addEventListener('error', () => {
      if (e !== el || !e.getAttribute('src') || !(P.track || P.previewing)) return;
      const wasPlaying = !!P.track;
      P.track = P.previewing = null;
      X.emit('player', P);
      if (wasPlaying) X.ui.toast(tx(TEXT.cantPlay));
    });
  }
  X.player = P;
})();
