/* 插件与主题接口。插件写法：
 *
 *   XMB.use({
 *     id: 'my-plugin', name: '我的插件',
 *     setup(api) {
 *       api.addItems('game', [{ id: 'x', icon: 'toy', title: { zh: '新玩具' }, action: 'myAction' }]);
 *       api.registerAction('myAction', (item, ctx) => ctx.dialog('你好'));
 *     },
 *   });
 *
 * 插件要在 XMB 启动前载入：把文件路径加进 plugins/plugins.js 的 XMB.manifest 即可（boot.js 会按顺序加载）。
 * 主题写法见 themes/gloria.js；也可以在「设定 → 主题设定 → 导入主题」里导入 JSON 主题。 */
(function () {
  const X = (window.XMB = window.XMB || {});
  X.actions = X.actions || {};
  X.themes = X.themes || {};
  X.plugins = X.plugins || [];
  const hooks = {};

  const findCat = (id) => X.data.categories.find((c) => c.id === id);
  const findPath = (cat, path) => {
    let items = cat.items;
    for (const id of path || []) {
      const it = items.find((x) => x.id === id);
      if (!it) return null;
      it.children = it.children || [];
      items = it.children;
    }
    return items;
  };

  // ---------- 主题 ----------
  const hex6 = (c) => {
    const s = String(c).replace('#', '');
    const f = s.length === 3 ? s.split('').map((x) => x + x).join('') : s.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  };
  // 四角颜色（左上、右上、左下、右下）→ 16×8 取样表（和 bgtex.js 同格式）
  const cornersToTex = (corners, w = 16, h = 8) => {
    const [tl, tr, bl, br] = corners.map(hex6);
    let s = '';
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / (w - 1), v = y / (h - 1);
        for (let k = 0; k < 3; k++) {
          const top = tl[k] + (tr[k] - tl[k]) * u, bot = bl[k] + (br[k] - bl[k]) * u;
          s += Math.round(top + (bot - top) * v).toString(16).padStart(2, '0');
        }
      }
    return s;
  };
  function normalizeTheme(th) {
    if (!th || !th.id) throw new Error('主题缺少 id');
    const out = Object.assign({ monthly: true }, th);
    out.name = typeof th.name === 'string' ? { zh: th.name, en: th.name } : th.name || { zh: th.id, en: th.id };
    if (!out.monthTex && th.gradient) {
      // gradient.day / gradient.night：四角颜色；也可以给 12 组（按月）
      const per = (g) => (Array.isArray(g[0]) ? g : Array(12).fill(g));
      const day = per(th.gradient.day), night = per(th.gradient.night || th.gradient.day);
      out.monthTex = { w: 16, h: 8, day: day.map((c) => cornersToTex(c)), night: night.map((c) => cornersToTex(c)) };
      out.monthly = Array.isArray(th.gradient.day[0]);
    }
    if (!out.monthTex) throw new Error('主题需要 monthTex 或 gradient');
    return out;
  }

  const api = {
    addCategory(cat, { after, before } = {}) {
      const cs = X.data.categories;
      const i = after ? cs.findIndex((c) => c.id === after) + 1 : before ? cs.findIndex((c) => c.id === before) : cs.length;
      cs.splice(i < 0 ? cs.length : i, 0, Object.assign({ items: [], sel: 0 }, cat));
    },
    removeCategory(id) {
      X.data.categories = X.data.categories.filter((c) => c.id !== id);
    },
    category: findCat,
    // path：要放进哪个文件夹（文件夹条目 id 的数组）；at：'start' | 'end' | 数字下标
    addItems(catId, items, { at = 'end', path, select } = {}) {
      const cat = findCat(catId);
      if (!cat) return console.warn('[xmb] 没有这个分类：', catId);
      const list = findPath(cat, path);
      if (!list) return console.warn('[xmb] 找不到文件夹：', path);
      const i = at === 'start' ? 0 : at === 'end' ? list.length : at;
      list.splice(i, 0, ...items);
      if (select != null && !path) cat.sel = typeof select === 'number' ? select : i;
    },
    setStart(catId) {
      X.data.start = catId;
    },
    registerIcon: (name, fn) => X.registerIcon(name, fn),
    registerAction(name, fn) {
      X.actions[name] = fn;
    },
    registerTheme(th) {
      const n = normalizeTheme(th);
      X.themes[n.id] = n;
      return n;
    },
    on(ev, fn) {
      (hooks[ev] = hooks[ev] || []).push(fn);
    },
  };

  X.api = api;
  X.registerTheme = api.registerTheme;
  X.on = api.on;
  X.emit = (ev, ...args) =>
    (hooks[ev] || []).forEach((f) => {
      try {
        f(...args);
      } catch (e) {
        console.error('[xmb] 事件出错', ev, e);
      }
    });
  X.use = (plugin) => {
    try {
      plugin.setup && plugin.setup(api);
      X.plugins.push({ id: plugin.id, name: plugin.name || plugin.id, version: plugin.version || '' });
    } catch (e) {
      console.error('[xmb] 插件出错：', plugin && plugin.id, e);
    }
  };

  // 原版主题（PS3 Original，按月变色）
  api.registerTheme({ id: 'original', name: { zh: '原版', en: 'Original' }, monthTex: X.monthTex, monthly: true });
})();
