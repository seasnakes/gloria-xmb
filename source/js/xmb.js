/* XMB 主引擎：布局、动画、输入（键盘 / 手柄 / 鼠标 / 触摸）、选项菜单、对话框、时钟。
 * 所有坐标都按 1280×720 来写（照 PS3 720p 实机截图量的），窗口大小变化时整体缩放。 */
(function () {
  const X = window.XMB;
  const $ = (s) => document.querySelector(s);
  const el = (cls, html) => {
    const d = document.createElement('div');
    d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  };

  // ---------- 版式（720p 实测） ----------
  const L = {
    colX: 381, // 当前分类那一列的中心 x
    catY: 193, // 分类图标中心 y
    catGap: 136, // 分类间距
    catSelGap: 6, // 选中分类两侧多出的间距
    catBox: 84,
    catScale: 0.72,
    selY: 336, // 选中条目中心 y
    belowY: 452, // 下方第一条
    aboveY: 80, // 上方第一条（在分类栏上面）
    gap: 53, // 条目间距
    itemBox: 84,
    itemScale: 0.5,
    cBox: 42, // 设定类子菜单（菱形）
    cScale: 0.46,
    thScale: 0.62, // 缩略图（游戏图标 / 封面 / 照片）未选中时的缩放
    textX: 72,
    cTextX: 41,
    subX: 377, // 子菜单列 x
    parentX: 200, // 进入子菜单后，上一级退到的位置
    arrowX: 294,
    valueX: 871,
  };
  const RATE = 16; // 动画收敛速度（约 0.19 秒到位）

  // ---------- 设定 ----------
  let settings = Object.assign({}, X.settingDefaults, {theme:'cotton',lang:'zh'});
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem('xmb.settings') || '{}'));
  } catch (e) {}
  const saveSettings = () => {
    try {
      localStorage.setItem('xmb.settings', JSON.stringify(settings));
    } catch (e) {}
  };
  // Migrate the previous built-in GLORIA theme once, preserving explicit custom themes.
  try {if(!localStorage.getItem('xmb.cotton.v2')){if(settings.theme==='gloria'||settings.theme==='original')settings.theme='cotton';saveSettings();localStorage.setItem('xmb.cotton.v2','1')}}catch(e){}
  const qs = new URLSearchParams(location.search);
  let MOBILE = innerWidth < 700 && innerHeight > innerWidth;
  let mobileHome = !qs.has('screen');
  const debugMonth = qs.has('month') ? +qs.get('month') : null;
  const debugHour = qs.has('hour') ? +qs.get('hour') : null;

  const t = (o) => (o ? (typeof o === 'string' ? o : o[settings.lang] ?? o.zh) : '');
  const choiceOf = (key) => {
    const def = X.settingDefs[key];
    return def.choices.find((c) => c.v === settings[key]) || def.choices[0];
  };

  // ---------- 状态 ----------
  const S = {
    cat: 0,
    stack: [], // 子菜单：[{ item, level }]
    mode: 'boot', // xmb | panel | dialog | off
    idle: false,
    lastInput: performance.now(),
  };
  const ui = $('#ui');
  const layer = $('#xmb');
  const cats = [];
  const roots = [];
  let bg = null;

  // 动画节点：cur 当前值、tgt 目标值，每帧指数逼近
  function node(elm, ic, init) {
    const n = { el: elm, ic, cur: Object.assign({}, init), tgt: Object.assign({}, init), last: {} };
    return n;
  }
  function stepNode(n, k) {
    const c = n.cur, g = n.tgt;
    for (const key in g) c[key] += (g[key] - c[key]) * k;
    const tr = `translate3d(${c.x.toFixed(2)}px,${c.y.toFixed(2)}px,0)`;
    if (tr !== n.last.tr) n.el.style.transform = n.last.tr = tr;
    const o = Math.round(c.o * 1000) / 1000;
    if (o !== n.last.o) {
      n.el.style.opacity = n.last.o = o;
      n.el.style.visibility = o < 0.004 ? 'hidden' : '';
    }
    if (n.ic) {
      const s = Math.round(c.s * 1000) / 1000;
      if (s !== n.last.s) n.ic.style.transform = `scale(${(n.last.s = s)})`;
    }
  }

  // ---------- 构建 DOM ----------
  function buildCategory(cat, i) {
    const d = el('cat');
    const ic = el('ic', X.icon(cat.icon));
    const lb = el('lb', t(cat.label));
    d.append(ic, lb);
    d.addEventListener('click', (e) => {
      e.stopPropagation();
      input('pointer');
      if (S.mode !== 'xmb') return;
      if(MOBILE && mobileHome){S.cat=i;mobileHome=false;input('pointer');layout();return;}
      if (S.stack.length) return back();
      if (i !== S.cat) setCat(i);
    });
    layer.append(d);
    const n = node(d, ic, { x: L.colX + (i - S.cat) * L.catGap, y: L.catY, s: L.catScale, o: 0 });
    n.cat = cat;
    n.lb = lb;
    return n;
  }

  function buildLevel(items, opts) {
    const lv = { items, sel: opts.sel || 0, compact: !!opts.compact, nodes: [], depth: opts.depth || 0 };
    const list = items.length ? items : [{ id: '__empty', icon: 'empty', title: X.text.empty, empty: true }];
    lv.items = list;
    if (lv.sel >= list.length) lv.sel = 0;
    list.forEach((it, j) => {
      const kind = it.thumb ? it.thumbKind || 'wide' : '';
      const d = el('item' + (lv.compact ? ' compact' : '') + (it.empty ? ' empty' : '') + (kind ? ' has-th' : '') + (it.themeId ? ' theme-card' : ''));
      const ic = el('ic' + (kind ? ' th th-' + kind : ''), it.empty ? '' : kind ? `<img data-src="${it.thumb}" alt="" decoding="async" draggable="false">` : X.icon(it.icon));
      if(it.toy?.kind==='simulation'&&!['life','dbh','ut','dr'].includes(it.toy.id)) ic.append(el('cover-name',esc(t(it.title))));
      const tx = el('tx');
      const tt = el('t', esc(t(it.title)));
      const dd = el('d', esc(t(it.desc)));
      tx.append(tt, dd);
      const v = el('v', esc(valueText(it)));
      d.append(ic, tx, v);
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        input('pointer');
        if (S.mode !== 'xmb') return;
        clickItem(lv, j);
      });
      layer.append(d);
      const n = node(d, ic, { x: opts.x ?? L.colX, y: L.selY, s: lv.compact ? L.cScale : kind ? L.thScale : L.itemScale, o: 0 });
      n.item = it;
      n.tt = tt;
      n.dd = dd;
      n.v = v;
      lv.nodes.push(n);
    });
    return lv;
  }

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const valueText = (it) => (it.setting ? t(choiceOf(it.setting).label) : it.live ? t(it.live()) || '' : it.value ? t(it.value) : '');

  function refreshText() {
    document.documentElement.lang = settings.lang === 'en' ? 'en' : 'zh-CN';
    cats.forEach((c) => (c.lb.textContent = t(c.cat.label)));
    const all = roots.concat(S.stack.map((s) => s.level));
    all.forEach((lv) =>
      lv.nodes.forEach((n) => {
        n.tt.textContent = t(n.item.title);
        const cover=n.el?.querySelector?.(".cover-name")||n.ic?.querySelector?.(".cover-name");if(cover)cover.textContent=t(n.item.title);
        n.dd.textContent = t(n.item.desc);
        n.v.textContent = valueText(n.item);
      })
    );
    updateClock(true);
    if(MOBILE)layoutMobile();
  }

  // ---------- 布局 ----------
  function layout() {
    if(MOBILE)return layoutMobile();
    const depth = S.stack.length;
    const shift = depth ? L.parentX - L.colX : 0;
    const colXof = (d) => L.colX + d * L.catGap + Math.sign(d) * L.catSelGap + shift;

    cats.forEach((c, i) => {
      const d = i - S.cat;
      c.tgt.x = colXof(d);
      c.tgt.y = L.catY;
      c.tgt.s = d === 0 ? 1 : L.catScale;
      c.tgt.o = depth ? (d === 0 ? 1 : 0) : d === 0 ? 1 : 0.82;
      c.el.classList.toggle('sel', d === 0 && !depth);
    });

    roots.forEach((lv, i) => {
      const d = i - S.cat;
      const role = d !== 0 ? 'off' : depth === 0 ? 'active' : depth === 1 ? 'parent' : 'gone';
      layoutLevel(lv, colXof(d), role);
    });
    S.stack.forEach((s, k) => {
      const role = k === depth - 1 ? 'active' : k === depth - 2 ? 'parent' : 'gone';
      const x = role === 'active' ? L.subX : role === 'parent' ? L.parentX : L.parentX - 181;
      layoutLevel(s.level, x, role);
    });
    $('#arrow').classList.toggle('on', depth > 0);
  }

  function layoutLevel(lv, x, role) {
    lv.nodes.forEach((n, j) => {
      const d = j - lv.sel;
      // 实机上，上一级里没选中的条目只退到 x≈300，淡淡地留着
      n.tgt.x = role === 'parent' && d !== 0 ? x + 100 : x;
      n.tgt.y = d === 0 ? L.selY : d < 0 ? L.aboveY + (d + 1) * L.gap : L.belowY + (d - 1) * L.gap;
      n.tgt.s = d === 0 ? 1 : lv.compact ? L.cScale : n.item.thumb ? L.thScale : L.itemScale;
      n.tgt.o = role === 'active' ? 1 : role === 'parent' ? (d === 0 ? 1 : 0.16) : 0;
      n.el.classList.toggle('sel', d === 0 && role === 'active');
      n.el.classList.toggle('parent', role === 'parent');
      // Only request thumbnails in the active column near the viewport.
      // All rows initially overlap before layout, so native lazy loading is insufficient.
      const img = n.ic && n.ic.querySelector('img[data-src]');
      if (img && (role === 'active' || role === 'parent') && n.tgt.y > -100 && n.tgt.y < 820) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  }


  function layoutMobile(){
    document.body.classList.toggle('mobile-home',mobileHome);
    const depth=S.stack.length;
    const cat=X.data.categories[S.cat];
    const heading=mobileHome?(settings.lang==='en'?'Home Menu':'主菜单'):t(depth?S.stack[depth-1].item.title:cat.label);
    $('#mobile-title').textContent=heading;
    $('#mobile-back').setAttribute('aria-label',settings.lang==='en'?'Back':'返回');
    $('#mobile-home').setAttribute('aria-label',settings.lang==='en'?'Home':'主页');
    $('#mobile-opt').setAttribute('aria-label',settings.lang==='en'?'Options':'选项');
    const sc=innerWidth/360;
    const availableHeight=Math.min(innerHeight,window.visualViewport?.height||innerHeight)/sc;
    const firstRow=Math.max(128,100/sc+36);
    const lastRow=availableHeight-64/sc-66;
    const rowGap=Math.max(72,Math.min(144,(lastRow-firstRow)/2));
    cats.forEach((c,i)=>{
      c.tgt.x=68+(i%3)*112;c.tgt.y=firstRow+Math.floor(i/3)*rowGap;
      c.tgt.s=.92;c.tgt.o=mobileHome?1:0;
      c.el.classList.toggle('sel',i===S.cat&&mobileHome);
    });
    const active=mobileHome?null:activeLevel();
    [...roots,...S.stack.map(s=>s.level)].forEach(lv=>{
      lv.nodes.forEach((n,j)=>{
        const d=j-lv.sel;
        n.tgt.x=90;n.tgt.y=d===0?270:d<0?150+(d+1)*76:402+(d-1)*82;
        n.tgt.s=d===0?1:lv.compact?.65:.68;
        n.tgt.o=lv===active&&n.tgt.y>=125&&n.tgt.y<innerHeight/(innerWidth/360)-65?1:0;
        n.el.classList.toggle('sel',d===0&&lv===active);
        n.el.classList.remove('parent');
        const img=n.ic&&n.ic.querySelector('img[data-src]');
        if(img&&n.tgt.o){img.src=img.dataset.src;img.removeAttribute('data-src')}
      });
    });
    $('#arrow').classList.remove('on');
  }

  // ---------- 导航 ----------
  const activeLevel = () => (S.stack.length ? S.stack[S.stack.length - 1].level : roots[S.cat]);
  const activeItem = () => {
    const lv = activeLevel();
    return lv.items[lv.sel];
  };

  function setCat(i) {
    if (i < 0 || i >= cats.length || i === S.cat) return false;
    const dir = Math.sign(i - S.cat);
    S.cat = i;
    X.sound.play('cat');
    bg && bg.impulse(-0.05 * dir, 0);
    layout();
    return true;
  }

  function move(dy) {
    const lv = activeLevel();
    const n = lv.sel + dy;
    if (n < 0 || n >= lv.items.length) return false;
    lv.sel = n;
    X.sound.play('move');
    bg && bg.impulse(0, 0.025 * dy);
    layout();
    return true;
  }

  function enter(it) {
    if (it.id === 'theme-gallery') it.sel = Math.max(0,it.children.findIndex(x=>x.themeId===settings.theme));
    const lv = buildLevel(it.children || [], { compact: it.compact, sel: it.sel || 0, depth: S.stack.length + 1, x: L.subX + 70 });
    S.stack.push({ item: it, level: lv });
    X.sound.play('ok');
    layout();
  }

  function back(silent = false) {
    if(MOBILE&&!S.stack.length){mobileHome=true;focusItem=null;X.preview.stop();scheduleThemePreview(null);layout();return true;}
    if (!S.stack.length) return false;
    const s = S.stack.pop();
    if (!silent) X.sound.play('back');
    s.level.nodes.forEach((n) => {
      n.tgt.x += 70;
      n.tgt.o = 0;
      n.dead = true;
    });
    dying.push(...s.level.nodes);
    setTimeout(() => {
      s.level.nodes.forEach((n) => n.el.remove());
      dying = dying.filter((n) => !n.dead || n.el.isConnected);
    }, 450);
    layout();
    return true;
  }
  let dying = [];


  // Return to the category screen in one action, clearing every nested preview.
  function goHome() {
    if (S.mode === 'viewer') X.viewer.close();
    if (S.mode === 'dialog') pickDialog(true);
    closePanel(true);
    while (S.stack.length) back(true);
    mobileHome = true;
    focusItem = null;
    X.preview.stop();
    scheduleThemePreview(null);
    S.mode = 'xmb';
    input();
    layout();
  }

  function ok() {
    const it = activeItem();
    if (!it || it.empty) return X.sound.play('err');
    if (it.children) return enter(it);
    if (it.setting) return chooseSetting(it);
    const fn = it.action && (X.actions[it.action] || ACTIONS[it.action]);
    if (fn) return fn(it, ctx(it));
    X.sound.play('err');
  }

  // 传给动作 / 选项的上下文
  function ctx(item) {
    return { item, dialog, panel: openPanel, closePanel, toast, t, settings, refresh: refreshText, sound: X.sound, viewer: X.viewer, player: X.player };
  }

  function options() {
    const it = activeItem();
    if (!it || it.empty || it.setting) return;
    let opts = typeof it.options === 'function' ? it.options(ctx(it)) : it.options;
    opts = opts || (it.children ? null : ['info']);
    if (!opts || !opts.length) return;
    const rows = opts.map((o) => (typeof o === 'string' ? { label: X.text[o] || o, key: o } : o));
    openPanel(rows, 0, (i) => {
      const r = rows[i];
      closePanel(true);
      if (r.run) r.run(it, ctx(it));
      else if (r.key === 'info') dialog(`${t(it.title)}${it.desc ? '\n' + t(it.desc) : ''}`, ['ok']);
      else if (r.key === 'del') dialog(t(X.text.delNo), ['ok']);
    });
  }

  function clickItem(lv, j) {
    const isActive = lv === activeLevel();
    if (!isActive) {
      if (S.stack.length && S.stack[S.stack.length - 1].level !== lv) back();
      return;
    }
    if (j === lv.sel) return ok();
    lv.sel = j;
    X.sound.play('move');
    layout();
  }

  // ---------- 设定 ----------
  function chooseSetting(it) {
    const def = X.settingDefs[it.setting];
    const rows = def.choices.map((c) => ({ label: c.label, swatch: c.swatch }));
    const cur = Math.max(0, def.choices.findIndex((c) => c.v === settings[it.setting]));
    openPanel(rows, cur, (i) => {
      settings[it.setting] = def.choices[i].v;
      saveSettings();
      applySettings();
      closePanel(true);
    });
  }

  function applySettings() {
    X.sound.setEnabled(settings.sound);
    applyTheme();
    refreshText();
  }

  let previewThemeId = null, themePreviewTimer = null;
  function themeHint() {
    const hint = $('#theme-hint');
    if (!previewThemeId) { hint.textContent = ''; return; }
    const applied = settings.theme === previewThemeId && settings.background !== 'black';
    const name = t(X.themes[previewThemeId].name);
    hint.textContent = (applied ? t({zh:'已应用',en:'Applied'}) : t({zh:'预览中',en:'Preview'})) + ' · ' + name + '  /  ' +
      t(MOBILE ? {zh:'再次点选应用 · 返回取消预览',en:'Tap again to apply · Back to leave preview'} : {zh:'Enter 应用 · Esc 返回',en:'Enter to apply · Esc to return'});
  }
  function scheduleThemePreview(id) {
    clearTimeout(themePreviewTimer);
    document.body.classList.toggle('theme-browse',!!id);
    if (!id) {
      if (previewThemeId) { previewThemeId = null; applyTheme(); }
      themeHint();
      return;
    }
    if (id === previewThemeId) return;
    themePreviewTimer = setTimeout(() => {
      previewThemeId = id;
      applyTheme();
      themeHint();
    },450);
  }
  function applyTheme(snap) {
    const now = new Date();
    if (debugMonth) now.setMonth(debugMonth - 1, Math.min(now.getDate(), 20));
    const hour = debugHour != null ? debugHour : X.theme.hourOf(now, settings.time);
    const theme = X.themes[previewThemeId || settings.theme] || X.themes.original;
    const black = !previewThemeId && settings.background === 'black';
    if(X.cotton)X.cotton.sync(theme.id==='cotton'&&!black,hour);
    if (X.visualThemes) X.visualThemes.sync(black ? null : theme.id);
    const th = X.theme.compute(now, { fixed: settings.color, hour, black, theme });
    if (bg) {
      bg.setTheme(th);
      if (snap) bg.snap();
    }
    const hi = th.icon.map((v) => Math.round(Math.min(1, v) * 255));
    const lo = th.icon.map((v) => Math.round(Math.min(1, v) * 188));
    document.documentElement.style.setProperty('--icon-hi', `rgb(${hi})`);
    document.documentElement.style.setProperty('--icon-lo', `rgb(${lo})`);
  }

  const ACTIONS = {
    applyThemeItem: (it) => {
      clearTimeout(themePreviewTimer);
      previewThemeId = it.themeId;
      settings.theme = it.themeId;
      settings.background = 'original';
      saveSettings();
      applySettings();
      goHome();
      toast(t({zh:'已应用主题：',en:'Theme applied: '}) + t(X.themes[it.themeId].name));
    },
    na: () => dialog(t(X.text.na), ['ok']),
    sysinfo: () => dialog(t(X.text.sysinfo), ['ok']),
    reset: () =>
      dialog(t(X.text.reset), ['yes', 'no'], (i) => {
        if (i !== 0) return;
        settings = Object.assign({}, X.settingDefaults);
        saveSettings();
        applySettings();
        setTimeout(() => dialog(t(X.text.resetDone), ['ok']), 260);
      }),
    powerOff: () => dialog(t(X.text.powerOff), ['yes', 'no'], (i) => i === 0 && powerOff()),
    manual: () => dialog(t(X.text.manual), ['ok']),
    plugins: () =>
      dialog(`${t(X.text.pluginList)}\n` + (X.plugins.map((p) => `${p.name}${p.version ? ' ' + p.version : ''}`).join('\n') || '—') +
        `\n\n${t(X.settingDefs.theme.title)}：` + Object.values(X.themes).map((th) => t(th.name)).join('、'), ['ok']),
    importTheme: () => importTheme(),
  };

  // 从 JSON 文件导入主题，存进 localStorage，下次启动自动恢复
  function importTheme() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        const th = JSON.parse(await f.text());
        const n = X.registerTheme(th);
        let saved = [];
        try {
          saved = JSON.parse(localStorage.getItem('xmb.userThemes') || '[]').filter((x) => x.id !== n.id);
          saved.push(th);
          localStorage.setItem('xmb.userThemes', JSON.stringify(saved));
        } catch (e) {}
        fillThemeChoices();
        settings.theme = n.id;
        saveSettings();
        applySettings();
        dialog(t(X.text.themeOk).replace('{name}', t(n.name)), ['ok']);
      } catch (e) {
        dialog(t(X.text.themeBad).replace('{err}', e.message), ['ok']);
      }
    };
    inp.click();
  }
  function themeCover(th) {
    const fallback = {original:'themes/thumbnails/original.svg',gloria:'themes/thumbnails/gloria.svg',cotton:'themes/thumbnails/cotton.webp'};
    if (fallback[th.id]) return fallback[th.id];
    const valid = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#243450';
    const colors = th.gradient?.day;
    const a = valid(Array.isArray(colors?.[0]) ? colors[0][0] : colors?.[0]);
    const b = valid(Array.isArray(colors?.[0]) ? colors[0][3] : colors?.[3]);
    return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 144"><defs><linearGradient id="g"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="256" height="144" rx="12" fill="url(#g)"/><path d="M0 105Q64 15 128 75T256 38" fill="none" stroke="white" stroke-opacity=".6" stroke-width="3"/></svg>`);
  }
  function fillThemeChoices() {
    X.settingDefs.theme.choices = Object.values(X.themes).map((th) => ({ v: th.id, label: th.name }));
    const folder = X.data.categories.find(c=>c.id==='settings').items.find(i=>i.id==='themeset').children.find(i=>i.id==='theme-gallery');
    folder.children = Object.values(X.themes).map(th=>({
      id:'theme-'+th.id, themeId:th.id, title:th.name,
      desc:th.description || {zh:'停留预览 · 确认后应用',en:'Preview on focus · Confirm to apply'},
      thumb:/^themes\/thumbnails\/[a-z0-9-]+\.(png|webp|svg)$/i.test(th.thumbnail || '') ? th.thumbnail : themeCover(th), thumbKind:'wide', action:'applyThemeItem',
      options:th.source ? [{label:{zh:'来源与作者',en:'Source and credits'},run:()=>dialog(t(th.name)+'\n'+th.author+'\n'+th.source, ['ok'])}] : ['info'],
      live:()=>settings.theme===th.id ? {zh:'✓ 当前主题',en:'✓ Current theme'} : '',
    }));
  }

  // ---------- △ 侧边选项菜单 ----------
  const panel = { el: null, rows: [], sel: 0, onPick: null };
  function openPanel(rows, sel, onPick) {
    const p = $('#panel');
    const list = p.querySelector('.plist');
    list.innerHTML = '';
    const RH = 36;
    const top = Math.max(64, Math.min(L.selY - 18 - sel * RH, 690 - rows.length * RH));
    const startTop = Math.max(64, Math.min(L.selY - (rows.length * RH) / 2, 690 - rows.length * RH));
    const base = rows.length > 8 ? top : startTop;
    panel.rows = rows.map((r, i) => {
      const d = el('po', (r.swatch ? `<i class="sw" style="background:#${X.theme.MONTH_HEX[r.swatch - 1]}"></i>` : '') + `<span>${esc(t(r.label))}</span>`);
      d.style.top = stageOY + base + i * RH + 'px';
      d.addEventListener('click', (e) => {
        e.stopPropagation();
        input('pointer');
        if (panel.sel === i) return pickPanel();
        panel.sel = i;
        X.sound.play('move');
        drawPanel();
      });
      list.append(d);
      return d;
    });
    panel.base = base;
    panel.RH = RH;
    panel.sel = sel;
    panel.onPick = onPick;
    drawPanel(true);
    p.classList.add('open');
    if (S.mode !== 'panel') panel.prev = S.mode;
    S.mode = 'panel';
    X.sound.play('open');
  }
  function drawPanel(instant) {
    const f = $('#panel .pfocus');
    if (instant) f.style.transition = 'none';
    f.style.top = stageOY + panel.base + panel.sel * panel.RH + 'px';
    if (instant) requestAnimationFrame(() => (f.style.transition = ''));
    panel.rows.forEach((r, i) => r.classList.toggle('on', i === panel.sel));
  }
  function pickPanel() {
    X.sound.play('ok');
    panel.onPick && panel.onPick(panel.sel);
  }
  function closePanel(silent) {
    $('#panel').classList.remove('open');
    if (!silent) X.sound.play('close');
    if (S.mode === 'panel') S.mode = panel.prev || 'xmb';
  }

  // ---------- 对话框 ----------
  const dlg = { sel: 0, btns: [], onPick: null };
  function dialog(text, buttons, onPick, sel = 0) {
    const d = $('#dialog');
    d.querySelector('.msg').innerHTML = esc(text).replace(/\n/g, '<br>');
    const row = d.querySelector('.btns');
    row.innerHTML = '';
    dlg.btns = buttons.map((b, i) => {
      const e = el('btn', esc(t(X.text[b] || b)));
      e.addEventListener('click', (ev) => {
        ev.stopPropagation();
        input('pointer');
        dlg.sel = i;
        pickDialog();
      });
      row.append(e);
      return e;
    });
    dlg.sel = sel;
    dlg.onPick = onPick;
    dlg.cancel = buttons.length - 1;
    drawDialog();
    d.classList.add('open');
    document.body.classList.add('dialog');
    if (S.mode !== 'dialog') dlg.prev = S.mode === 'panel' ? panel.prev || 'xmb' : S.mode;
    S.mode = 'dialog';
    X.sound.play('open');
  }
  function drawDialog() {
    dlg.btns.forEach((b, i) => b.classList.toggle('on', i === dlg.sel));
  }
  function pickDialog(cancel) {
    const i = cancel ? dlg.cancel : dlg.sel;
    $('#dialog').classList.remove('open');
    document.body.classList.remove('dialog');
    S.mode = dlg.prev || 'xmb';
    X.sound.play(cancel || dlg.btns.length > 1 && i === dlg.cancel ? 'back' : 'ok');
    dlg.onPick && dlg.onPick(i);
  }

  // ---------- 右上角通知 ----------
  let toastTimer = null;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('on');
    X.sound.play('open');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
  }

  // ---------- 关机 / 开机 ----------
  function powerOff() {
    S.mode = 'off';
    $('#black .hint').textContent = t(X.text.pressAny);
    document.body.classList.add('off');
    setTimeout(() => {
      if (S.mode === 'off') $('#black .hint').classList.add('on');
    }, 2200);
  }
  function powerOn() {
    $('#black .hint').classList.remove('on');
    document.body.classList.remove('off');
    S.mode = 'boot';
    X.sound.play('boot');
    setTimeout(() => (S.mode = 'xmb'), 900);
  }

  // ---------- 时钟 ----------
  let lastClock = '';
  function updateClock(force) {
    const d = new Date();
    const M = d.getMonth() + 1, D = d.getDate(), h = d.getHours(), m = d.getMinutes();
    const mm = String(m).padStart(2, '0');
    let time;
    if (settings.clock === 12) {
      const h12 = h % 12 || 12;
      time = settings.lang === 'en' ? `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}` : `${h < 12 ? '上午' : '下午'} ${h12}:${mm}`;
    } else time = `${h}:${mm}`;
    const s = `${M}/${D} ${time}`;
    if (s === lastClock && !force) return;
    lastClock = s;
    $('#clock .time').textContent = s;
    $('#clock .clk').innerHTML = X.clockIcon(h, m);
  }

  // ---------- 输入 ----------
  function input(kind) {
    X.sound.unlock();
    X.preview.unlockAudio();
    S.lastInput = performance.now();
    if (S.idle) {
      S.idle = false;
      document.body.classList.remove('idle');
    }
  }

  function act(a) {
    input();
    if(MOBILE&&mobileHome&&S.mode==='xmb'){if(a==='ok'){mobileHome=false;layout();}else if(['left','right','up','down'].includes(a)){const d={left:-1,right:1,up:-3,down:3}[a];S.cat=Math.max(0,Math.min(cats.length-1,S.cat+d));layout();}return;}
    if (S.mode === 'off') return powerOn();
    if (S.mode === 'boot') return;
    if (S.mode === 'viewer') return X.viewer.handle(a);
    if (S.mode === 'dialog') {
      if (a === 'left' || a === 'right') {
        const n = dlg.sel + (a === 'left' ? -1 : 1);
        if (n >= 0 && n < dlg.btns.length) {
          dlg.sel = n;
          X.sound.play('move');
          drawDialog();
        }
      } else if (a === 'ok') pickDialog();
      else if (a === 'back') pickDialog(true);
      return;
    }
    if (S.mode === 'panel') {
      if (a === 'up' || a === 'down') {
        const n = panel.sel + (a === 'up' ? -1 : 1);
        if (n >= 0 && n < panel.rows.length) {
          panel.sel = n;
          X.sound.play('move');
          drawPanel();
        }
      } else if (a === 'ok') pickPanel();
      else if (a === 'back' || a === 'opt' || a === 'left') closePanel();
      return;
    }
    switch (a) {
      case 'left':
        if (S.stack.length) back();
        else setCat(S.cat - 1);
        break;
      case 'right':
        if (S.stack.length) {
          const it = activeItem();
          if (it && it.children) enter(it);
        } else setCat(S.cat + 1);
        break;
      case 'up':
        move(-1);
        break;
      case 'down':
        move(1);
        break;
      case 'ok':
        ok();
        break;
      case 'back':
        back();
        break;
      case 'opt':
        options();
        break;
    }
  }

  // 方向键长按连发：首次 0.36 秒后开始，越按越快
  const held = { dir: null, next: 0, n: 0, src: null };
  function hold(dir, src) {
    act(dir);
    held.dir = dir;
    held.src = src;
    held.n = 0;
    held.next = performance.now() + 360;
  }
  function release(src) {
    if (held.src === src) held.dir = null;
  }
  function tickHold(now) {
    if (!held.dir || now < held.next) return;
    act(held.dir);
    held.n++;
    held.next = now + Math.max(55, 120 - held.n * 8);
  }

  const KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    Enter: 'ok', ' ': 'ok', x: 'ok', X: 'ok', k: 'ok',
    Escape: 'back', Backspace: 'back', o: 'back', O: 'back', l: 'back',
    t: 'opt', T: 'opt', i: 'opt',
    a: 'left', d: 'right', w: 'up', s: 'down',
  };
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const a = KEYS[e.key];
    if (!a) {
      if (S.mode === 'off') act('ok');
      return;
    }
    e.preventDefault();
    if (e.repeat) return;
    if (a === 'left' || a === 'right' || a === 'up' || a === 'down') hold(a, 'k:' + e.key);
    else act(a);
  });
  addEventListener('keyup', (e) => release('k:' + e.key));
  addEventListener('blur', () => (held.dir = null));

  // 手柄（标准映射：0=✕ 1=○ 3=△，12-15=十字键）
  const padPrev = {};
  function pollPads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      const dirs = {
        up: b(12) || ay < -0.6,
        down: b(13) || ay > 0.6,
        left: b(14) || ax < -0.6,
        right: b(15) || ax > 0.6,
      };
      const prev = padPrev[p.index] || {};
      for (const k in dirs) {
        if (dirs[k] && !prev[k]) hold(k, 'p' + p.index + k);
        if (!dirs[k] && prev[k]) release('p' + p.index + k);
      }
      const btn = { ok: b(0), back: b(1), opt: b(3) };
      for (const k in btn) if (btn[k] && !prev[k]) act(k);
      padPrev[p.index] = Object.assign(dirs, btn);
    }
  }

  // 滚轮 / 触控板
  let wheelAcc = 0, wheelAccX = 0, wheelLast = 0;
  addEventListener(
    'wheel',
    (e) => {
      if (S.mode === 'viewer' && X.viewer.onWheel(e)) return;
      e.preventDefault();
      const now = performance.now();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) wheelAccX += e.deltaX;
      else wheelAcc += e.shiftKey ? 0 : e.deltaY;
      if (e.shiftKey) wheelAccX += e.deltaY;
      if (now - wheelLast < 65) return;
      if (Math.abs(wheelAcc) >= 36) {
        act(wheelAcc > 0 ? 'down' : 'up');
        wheelAcc = 0;
        wheelLast = now;
      } else if (Math.abs(wheelAccX) >= 46) {
        act(wheelAccX > 0 ? 'right' : 'left');
        wheelAccX = 0;
        wheelLast = now;
      }
    },
    { passive: false }
  );
  addEventListener('contextmenu', (e) => {
    e.preventDefault();
    act('opt');
  });
  addEventListener('click', () => {
    input('pointer');
    if (S.mode === 'panel') closePanel();
    else if (S.mode === 'off') act('ok');
  });

  addEventListener('pointerdown',e=>{if(e.isTrusted){X.sound.unlock();X.preview.unlockAudio();}},{capture:true,passive:true});
  addEventListener('keydown',e=>{if(e.isTrusted){X.sound.unlock();X.preview.unlockAudio();}},{capture:true});
  // 触摸滑动
  let touch = null;
  addEventListener('touchstart', (e) => {touch=e.target.closest('.pv-prompt')?null:{x:e.touches[0].clientX,y:e.touches[0].clientY};}, {passive:true});
  addEventListener(
    'touchend',
    (e) => {
      if (!touch) return;
      const p = e.changedTouches[0];
      const sc = innerHeight / 720;
      const dx = (p.clientX - touch.x) / sc, dy = (p.clientY - touch.y) / sc;
      touch = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        const n = Math.max(1, Math.round(Math.abs(dx) / 110));
        for (let i = 0; i < n; i++) act(dx < 0 ? 'right' : 'left');
      } else {
        const n = Math.max(1, Math.round(Math.abs(dy) / 60));
        for (let i = 0; i < n; i++) act(dy < 0 ? 'down' : 'up');
      }
    },
    { passive: true }
  );

  // ---------- 缩放 ----------
  let stageOY = 0;
  function snapLayout(){for(const n of cats.concat(...roots.map(r=>r.nodes),...S.stack.map(s=>s.level.nodes))){Object.assign(n.cur,n.tgt);stepNode(n,1)}}
  function resize() {
    const previousMobile=MOBILE;MOBILE=innerWidth<700&&innerHeight>innerWidth;document.body.classList.toggle('mobile',MOBILE);if(previousMobile!==MOBILE){focusItem=null;X.preview.stop();scheduleThemePreview(null);if(!MOBILE)document.body.classList.remove('mobile-home');}if(MOBILE){const sc=innerWidth/360;ui.style.width='360px';ui.style.height=innerHeight/sc+'px';ui.style.transform=`scale(${sc})`;stageOY=0;if(bg)bg.setBand(1,0);layout();if(previousMobile!==MOBILE)snapLayout();return;}ui.style.height='';
    const s = Math.min(innerHeight / 720, innerWidth / 980);
    const W = innerWidth / s, H = innerHeight / s;
    // 竖屏 / 窄窗口：XMB 主体放在 28% 高度附近，时钟和侧边菜单仍贴住整屏
    const oy = H > 720 ? Math.max(0, Math.min((H - 720) / 2, H * 0.28 - L.catY)) : 0;
    ui.style.width = W + 'px';
    ui.style.transform = `scale(${s}) translateY(${oy}px)`;
    stageOY = oy;
    if (bg) bg.setBand((720 * s) / innerHeight, 1 - (2 * (oy + 360) * s) / innerHeight);
    $('#clock').style.transform = `translateY(${-oy}px)`;
    const p = $('#panel');
    p.style.top = -oy + 'px';
    p.style.height = Math.max(720, H) + 'px';
    layout();
    if(previousMobile!==MOBILE)snapLayout();
  }

  // ---------- 动态文字（正在播放的进度等），每 0.25 秒刷新 ----------
  let liveLast = 0;
  function tickLive(now) {
    if (now - liveLast < 250) return;
    liveLast = now;
    const lv = activeLevel();
    const levels = [lv];
    if (S.stack.length) levels.push(S.stack.length > 1 ? S.stack[S.stack.length - 2].level : roots[S.cat]);
    for (const l of levels)
      for (const n of l.nodes) {
        if (!n.item.live) continue;
        const v = valueText(n.item);
        if (v !== n.lastLive) n.v.textContent = n.lastLive = v;
      }
    const P = X.player;
    const np = P && P.track ? `♪ ${P.track.title}` : '';
    if (np !== tickLive.np) {
      tickLive.np = np;
      $('#clock .np').textContent = np;
      $('#clock').classList.toggle('playing', !!np);
    }
  }

  // ---------- 选中预览：焦点停在同一项上就交给 XMB.preview ----------
  let focusItem = null;
  function tickFocus() {
    let it = null, node = null;
    if ((!MOBILE||!mobileHome)&&(S.mode === 'xmb' || S.mode === 'panel')) {
      const lv = activeLevel();
      it = lv.items[lv.sel];
      node = lv.nodes[lv.sel];
    }
    if (it === focusItem) return;
    focusItem = it;
    if (S.mode === 'panel') return; // 打开 △ 菜单时保持当前预览
    X.preview.schedule(it, node);
    scheduleThemePreview(it?.themeId || null);
  }

  // ---------- 主循环 ----------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    pollPads();
    tickHold(now);
    tickLive(now);
    tickFocus();
    if (!MOBILE && !S.idle && S.mode === 'xmb' && now - S.lastInput > 4500) {
      S.idle = true;
      document.body.classList.add('idle');
    }
    const k = 1 - Math.exp(-dt * RATE);
    for (const c of cats) stepNode(c, k);
    for (const lv of roots) for (const n of lv.nodes) stepNode(n, k);
    for (const s of S.stack) for (const n of s.level.nodes) stepNode(n, k);
    for (const n of dying) stepNode(n, k);
    if (bg && !document.hidden && !document.body.classList.contains('cotton') && !document.body.classList.contains('visual-theme')) bg.render(dt);
    requestAnimationFrame(frame);
  }

  // ---------- 启动 ----------
  function init() {
    fillThemeChoices();
    if(MOBILE)document.body.classList.add('mobile');
    if (!X.themes[settings.theme]) settings.theme = 'original';
    X.viewer.setup();
    X.preview.setup();
    const data = X.data;
    const initial=qs.get('screen');
    S.cat = Math.max(0, data.categories.findIndex(c=>c.id===(initial==='photos'?'photo':initial==='music'?'music':initial==='game'?'game':initial==='settings'?'settings':data.start)));
    data.categories.forEach((c, i) => {
      cats.push(buildCategory(c, i));
      roots.push(buildLevel(c.items, { sel: c.sel, x: L.colX + (i - S.cat) * L.catGap }));
    });
    try {
      bg = X.bg = new X.Background($('#bg'));
    } catch (e) {
      console.warn('[xmb] WebGL 背景不可用：', e);
      document.body.classList.add('nogl');
    }
    $('#clock .me').innerHTML = X.icon('cat-users');
    $('#clock .fr').innerHTML = X.icon('cat-friends');
    $('#panel').addEventListener('click', (e) => e.stopPropagation());
    X.sound.setEnabled(settings.sound);
    applyTheme(true);
    refreshText();
    resize();
    addEventListener('resize', resize);
    if(MOBILE&&window.visualViewport)window.visualViewport.addEventListener('resize',resize);
    layout();
    if(MOBILE&&qs.get('screen')==='photos'){const folder=roots[S.cat].items.find(it=>it.children&&it.children.length);if(folder)enter(folder)}
    if(MOBILE&&qs.get('screen')==='music'){const folder=roots[S.cat].items.find(it=>it.children&&it.children.length);if(folder)enter(folder)}
    {$('#mobile-back').onclick=e=>{e.stopPropagation();act('back')};$('#mobile-opt').onclick=e=>{e.stopPropagation();act('opt')};$('#mobile-home').onclick=e=>{e.stopPropagation();goHome()};}
    // 初始状态直接到位，不要从屏幕外飞进来
    const all = cats.concat(...roots.map((r) => r.nodes));
    all.forEach(n=>{Object.assign(n.cur,n.tgt);stepNode(n,1)});
    setInterval(() => updateClock(), 1000);
    setInterval(() => applyTheme(), 60 * 1000);
    requestAnimationFrame(frame);
    setTimeout(() => document.body.classList.add('ready'), 30);
    S.mode='xmb';tickFocus();
  }

  X.L = L;
  X.state = S;
  X.settings = () => settings;
  X.act = act;
  X.t = t;
  X.ui = { dialog, panel: openPanel, closePanel, toast };
  X.setMode = (m) => {
    S.mode = m;
    if (m === 'viewer') X.preview.stop();
    if (m === 'xmb') input();
  };
  X.start = init;
})();
