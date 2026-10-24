/* 内容插件：把 content/data.js 里的内容挂到 XMB 上（内置内容本身也是一个插件，第三方插件照这个写）。
 * 游戏 = toy（全屏启动）　照片 = GLORIA 生成图 + 提示词　音乐 = 网易云片段　视频 = B 站　网络 = 常用链接 */
XMB.use({
  id: 'gloria-content',
  name: '光彩跃然内容',
  version: '0.1',
  setup(api) {
    const C = XMB.content;
    if (!C) return console.warn('[gloria-content] 没有 content/data.js，先运行 tools/build_content.py');
    const T = (zh, en) => ({ zh, en: en || zh });
    const tx = (o) => XMB.t(o);
    const open = (url) => window.open(url, '_blank', 'noopener');
    const dur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const ymd = (ts) => {
      const d = new Date(ts * 1000);
      return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    };
    const views = (n) => (n >= 1e4 ? (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万' : String(n));
    const INFO = T('信息', 'Information');
    const NEWTAB = T('在新标签页打开', 'Open in New Tab');

    // ---------- 游戏：toy ----------
    api.category('game').items=[];api.category('game').sel=0;
    const toys = (C.games || []).map((g) => ({
      id: 'toy-' + g.id,
      icon: 'toy',
      thumb: g.thumb,
      thumbKind: 'wide',
      title: T(g.title, g.en),
      desc: T(g.desc,g.descEn),
      action: 'openToy',
      toy: g,
      bgMobile:g.bgMobile,
      bg: g.bg, // 选中停留：背景换成封面大图（PIC1）
      preview: g.preview, // 图标里播放 GLORIA 多元宇宙的片段（ICON1 + SND0）
      options: [
        { label: T('启动', 'Start'), run: (it) => XMB.actions.openToy(it) },
        { label: NEWTAB, run: () => open(g.url) },
        g.repo && { label: T('查看源码', 'View Source'), run: () => open('https://github.com/' + g.repo) },
        { label: INFO, run: (it, ctx) => ctx.dialog(`${tx(it.title)}\n${g.desc}\n${g.url}`, ['ok']) },
      ].filter(Boolean),
    }));
    if (toys.length) api.addItems('game', toys, { at: 'end', select: api.category('game').items.length });
    api.registerAction('openToy', (it) => it.toy.kind==='simulation'?XMB.viewer.openClip(it.toy):XMB.viewer.openFrame({kind:'toy',url:it.toy.url,title:tx(it.title),external:it.toy.url}));
    if(C.tools&&C.tools.length)api.addItems('network',[{id:'creative-tools',icon:'folder-game',title:T('创作工具','Creative Tools'),desc:T('原来的网页玩具与工具','Web toys and creative tools'),children:C.tools.map(g=>({id:'tool-'+g.id,icon:'toy',thumb:g.thumb,thumbKind:'wide',title:T(g.title,g.en),desc:T(g.desc),action:'openToy',toy:g}))}],{at:'end'});

    // ---------- 照片：GLORIA 生成图 + 提示词 ----------
    const albums = ((C.photos && C.photos.albums) || []).filter((a) => a.items.length);
    const all = albums.flatMap((a) => a.items);
    if (all.length) {
      const photoItem = (p, list, i) => ({
        id: 'ph-' + p.id,
        icon: 'gallery',
        thumb: p.thumb,
        thumbKind: 'photo',
        title: T(p.title, p.en),
        desc: T(p.date),
        action: 'openPhoto',
        photo: p,
        bg: p.thumb, // 停留时用照片本身做模糊背景
        bgBlur: true,
        list,
        index: i,
        options: [
          { label: T('查看', 'View'), run: (it) => XMB.actions.openPhoto(it) },
          { label: T('从这张开始放映', 'Slideshow from Here'), run: (it) => XMB.viewer.openPhoto(it.list, it.index, { slideshow: true }) },
          { label: INFO, run: (it, ctx) => ctx.dialog(`${tx(it.title)}\n${p.file} · ${p.w}×${p.h} · ${p.date}`, ['ok']) },
        ],
      });
      api.addItems(
        'photo',
        [
          { id: 'slideshow', icon: 'slideshow', title: T('幻灯片放映', 'Slideshow'), desc: T(`全部 ${all.length} 张`, `All ${all.length} photos`), action: 'slideshowAll' },
          ...albums.map((a) => ({
            id: 'album-' + a.en,
            icon: 'folder-photo',
            title: T(a.name, a.en),
            desc: T(`${a.items.length} 张`, `${a.items.length} photos`),
            children: a.items.map((p, i) => photoItem(p, a.items, i)),
          })),
        ],
        { select: 1 }
      );
      api.registerAction('openPhoto', (it) => XMB.viewer.openPhoto(it.list, it.index));
      api.registerAction('slideshowAll', () => XMB.viewer.openPhoto(all, 0, { slideshow: true }));
    }

    // ---------- 音乐：网易云片段（后台播放） ----------
    const P = () => XMB.player;
    const trackItem = (tr, list, i) => ({
      id: 'tr-' + tr.id,
      icon: 'track',
      thumb: tr.cover,
      thumbKind: 'square',
      title: T(tr.title),
      desc: T([tr.artist, tr.externalOnly?'网易云收听':tr.clip || tr.album].filter(Boolean).join(' · '),[tr.artist,tr.externalOnly?'Listen on NetEase':tr.clip || tr.album].filter(Boolean).join(' · ')),
      action: tr.externalOnly?'openNetease':'playTrack',
      track: tr, // 选中停留会试听一段
      bg: tr.bg || tr.cover,
      bgBlur: tr.bg ? !!tr.bgBlur : true,
      list,
      index: i,
      live: () => P().status(tr),
      options: () => {
        const playing = P().is(tr);
        return [
          !tr.externalOnly && { label: playing ? (P().paused ? T('继续', 'Resume') : T('暂停', 'Pause')) : T('播放', 'Play'), run: (it) => XMB.actions.playTrack(it) },
          playing && { label: T('停止', 'Stop'), run: () => P().stop() },
          playing && { label: T('下一首', 'Next'), run: () => P().next() },
          tr.url && { label: T('在网易云打开', 'Open in NetEase'), run: () => open(tr.url) },
        ].filter(Boolean);
      },
    });
    const mgroups = (C.music && C.music.groups) || [];
    api.addItems(
      'music',
      mgroups.map((g) => ({
        id: 'mg-' + g.en,
        icon: 'folder-music',
        title: T(g.name, g.en),
        desc: g.items.length ? T(`${g.items.length} 首`, `${g.items.length} tracks`) : T('还没有曲目', 'No tracks yet'),
        children: g.items.map((tr) => {const playable=g.items.filter(t=>!t.externalOnly);return trackItem(tr,playable,playable.indexOf(tr));}),
      }))
    );
    api.registerAction('openNetease',(it)=>open(it.track.url));
    api.registerAction('playTrack', (it) => (P().is(it.track) ? P().toggle() : P().play(it.list, it.index)));

    // ---------- 视频：B 站 ----------
    const videoItem = (v) => ({
      id: 'bv-' + v.bvid,
      icon: 'play',
      thumb: v.cover,
      thumbKind: 'wide',
      title: T(v.title),
      desc: T(`${ymd(v.pubdate)} · ${dur(v.duration)} · ${views(v.views)} 播放`, `${ymd(v.pubdate)} · ${dur(v.duration)} · ${v.views} views`),
      action: 'openVideo',
      video: v,
      bg: v.cover,
      bgBlur: true,
      options: [
        { label: T('播放', 'Play'), run: (it) => XMB.actions.openVideo(it) },
        { label: T('在 B 站打开', 'Open on Bilibili'), run: () => open('https://www.bilibili.com/video/' + v.bvid) },
        { label: INFO, run: (it, ctx) => ctx.dialog(`${v.title}\nUP：${v.owner} · ${ymd(v.pubdate)} · ${dur(v.duration)}\n${v.bvid}`, ['ok']) },
      ],
    });
    const vgroups = (C.videos && C.videos.groups) || [];
    api.addItems(
      'video',
      vgroups.map((g) => ({
        id: 'vg-' + g.en,
        icon: 'folder-video',
        title: T(g.name, g.en),
        desc: g.items.length ? T(`${g.items.length} 个视频`, `${g.items.length} videos`) : T('还没有视频', 'No videos yet'),
        children: g.items.map(videoItem),
      }))
    );
    api.registerAction('openVideo', (it) =>
      XMB.viewer.openFrame({
        kind: 'video',
        url: `https://player.bilibili.com/player.html?bvid=${it.video.bvid}&autoplay=1&high_quality=1&danmaku=0`,
        title: it.video.title,
        external: 'https://www.bilibili.com/video/' + it.video.bvid,
      })
    );

    // ---------- 网络：常用链接 ----------
    const LINK_ICON = { garden: 'manual', vi: 'browser', bilibili: 'play', github: 'github' };
    const links = (C.links || []).map((l) => ({
      id: 'ln-' + l.id,
      icon: LINK_ICON[l.id] || 'browser',
      title: T(l.title, l.en),
      desc: T(l.desc),
      action: 'openLink',
      link: l,
      options: [{ label: NEWTAB, run: () => open(l.url) }],
    }));
    if (links.length) api.addItems('network', links, { at: 'start', select: 0 });
    api.registerAction('openLink', (it) => open(it.link.url));
  },
});
