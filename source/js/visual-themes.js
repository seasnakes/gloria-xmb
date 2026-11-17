/* Local artwork adapters. Only bundled themes can register executable backgrounds;
 * JSON theme imports remain palette-only. Remove the frame to release its GPU state. */
(function () {
  const X = window.XMB, registry = new Map();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let current = null, frame = null, timer = 0, lastState = '', ready = false;
  function update() {
    if (!frame) return;
    const paused = document.hidden || document.body.classList.contains('has-preview') || document.body.classList.contains('viewing');
    const state = JSON.stringify({type: 'xmb-visual-state', paused, reduced: reduce.matches});
    if (state !== lastState) {
      clearTimeout(timer);
      if (!paused && !ready) timer = setTimeout(fail, 45000);
      frame.contentWindow?.postMessage(JSON.parse(state), location.origin);
      lastState = state;
    }
  }
  function dispose() {
    clearTimeout(timer);
    // Explicitly release the previous GPU context during rapid theme browsing.
    try { frame?.contentDocument?.querySelector('canvas')?.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(); } catch (_) {}
    frame?.remove();
    frame = null;
    ready = false;
    lastState = '';
    document.body.classList.remove('visual-theme');
  }
  function fail() {
    dispose();
    X.ui?.toast(X.t({zh: '动态主题暂不可用，已显示备用背景。', en: 'Visual theme unavailable. Showing the fallback background.'}));
  }
  X.visualThemes = {
    register(id, src) { registry.set(id, src); },
    sync(id) {
      const next = registry.has(id) ? id : null;
      if (next === current) return;
      dispose();
      current = next;
      if (!next) return;
      frame = document.createElement('iframe');
      frame.id = 'visual-theme';
      frame.title = '动态主题背景';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('inert', '');
      frame.src = registry.get(next) + '?theme=1';
      document.getElementById('pic1').before(frame);
      document.body.classList.add('visual-theme');
      update();
    },
  };
  addEventListener('message', e => {
    if (!frame || e.source !== frame.contentWindow || e.origin !== location.origin) return;
    if (e.data?.type === 'xmb-visual-loaded') { lastState = ''; update(); }
    if (e.data?.type === 'xmb-visual-ready') { ready = true; clearTimeout(timer); }
    if (e.data?.type === 'xmb-visual-error') fail();
  });
  new MutationObserver(update).observe(document.body, {attributes: true, attributeFilter: ['class']});
  document.addEventListener('visibilitychange', update);
  reduce.addEventListener('change', update);
})();
