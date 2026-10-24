/* 启动：依次加载 plugins/plugins.js 里列的插件 / 主题 / 内容，再恢复用户导入过的主题，最后启动 XMB。 */
(function () {
  const X = window.XMB;
  const list = (X.manifest || []).slice();
  const next = () => {
    if (!list.length) return start();
    const s = document.createElement('script');
    s.src = list.shift();
    s.onload = next;
    s.onerror = () => {
      console.warn('[xmb] 加载失败：', s.src);
      next();
    };
    document.head.appendChild(s);
  };
  function start() {
    try {
      JSON.parse(localStorage.getItem('xmb.userThemes') || '[]').forEach((th) => {
        try {
          X.registerTheme(th);
        } catch (e) {
          console.warn('[xmb] 导入的主题无效：', th && th.id, e);
        }
      });
    } catch (e) {}
    X.start();
  }
  next();
})();
