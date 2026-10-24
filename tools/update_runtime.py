from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'source'
def patch(rel,old,new):
 p=SRC/rel;s=p.read_text();assert old in s,(rel,old[:70]);p.write_text(s.replace(old,new))
# Start at the top-level user category on desktop, category grid on phones.
patch('js/data.js',"start: 'game'","start: 'users'")
patch('js/xmb.js',"{theme:'gloria',lang:'zh'}","{theme:'cotton',lang:'zh'}")
patch('js/xmb.js',"const qs = new URLSearchParams(location.search);", """// Migrate the previous built-in GLORIA theme once, preserving explicit custom themes.
  try {if(!localStorage.getItem('xmb.cotton.v2')){if(settings.theme==='gloria'||settings.theme==='original')settings.theme='cotton';saveSettings();localStorage.setItem('xmb.cotton.v2','1')}}catch(e){}
  const qs = new URLSearchParams(location.search);""")
patch('js/xmb.js',"initial==='music'?'music':data.start", "initial==='music'?'music':initial==='game'?'game':initial==='settings'?'settings':data.start")
patch('js/xmb.js',"    X.sound.unlock();\n    S.lastInput", "    X.sound.unlock();\n    X.preview.unlockAudio();\n    S.lastInput")
patch('js/xmb.js',"    const th = X.theme.compute", "    if(X.cotton)X.cotton.sync(settings.theme==='cotton'&&settings.background!=='black');\n    const th = X.theme.compute")
patch('js/xmb.js',"    if (bg) bg.render(dt);", "    if (bg && !document.body.classList.contains('cotton')) bg.render(dt);")
# Synchronous initial mode: no dead first click during a timed boot gate.
patch('js/xmb.js',"    setTimeout(() => (S.mode = 'xmb'), 200);", "    S.mode='xmb';tickFocus();")
# Bind navigation at all widths: platform iframes can initialize at desktop width.
patch('js/xmb.js',"    if(MOBILE){$('#mobile-back').onclick", "    {$('#mobile-back').onclick")
# Take the first real activation in capture phase without swallowing the navigation action.
patch('js/xmb.js',"  // 触摸滑动", """  addEventListener('pointerdown',e=>{if(e.isTrusted){X.sound.unlock();X.preview.unlockAudio();}},{capture:true,passive:true});
  addEventListener('keydown',e=>{if(e.isTrusted){X.sound.unlock();X.preview.unlockAudio();}},{capture:true});
  // 触摸滑动""")
# Same media element is resumed on the first real interaction; a user mute stays muted.
patch('js/preview.js',"  function playClip(node, src) {", """  function unlockAudio(){
    if(!navigator.userActivation || !navigator.userActivation.isActive)return;
    if(!vid||previewMutedByUser||!X.settings().sound||(X.player.track&&!X.player.paused))return;
    const v=vid;v.muted=false;
    v.play().catch(()=>{if(vid===v)v.muted=true});
  }
  function playClip(node, src) {""")
patch('js/preview.js',"const button = innerWidth < 700 && innerHeight > innerWidth ? document.createElement('button') : null;", "const button = document.createElement('button');")
patch('js/preview.js',"      pic.classList.add('on');", "      pic.classList.add('on');\n      document.body.classList.add('has-preview');")
patch('js/preview.js',"    pic.classList.remove('on');", "    pic.classList.remove('on');\n    document.body.classList.remove('has-preview');")
patch('js/preview.js',"if (item.bg) showBg(item.bg, item.bgBlur);", "if (item.bg) showBg(innerWidth<700&&innerHeight>innerWidth&&item.bgMobile?item.bgMobile:item.bg, item.bgBlur);")
p=SRC/'js/preview.js';s=p.read_text();print(s[s.rfind('X.preview ='):]);s=s.replace('X.preview = {','X.preview = { unlockAudio,');p.write_text(s)
# Native in-page simulation player keeps trusted click activation, and preserves the whole frame.
patch('js/viewers.js','</iframe>` +','</iframe><video class="sim-video" controls playsinline preload="metadata"></video><div class="sim-caption"></div>` +')
patch('js/viewers.js',"  // ---------- 照片查看器 ----------", """  function openClip(g){
    fopts={url:g.clip,external:g.clip};mode='clip';labels();
    root.querySelector('.vtitle').textContent=X.t({zh:g.title,en:g.en});
    root.querySelector('.sim-caption').textContent=X.t({zh:'GLORIA · 多元宇宙 / '+g.title,en:'GLORIA · Multiverse / '+g.en});
    document.body.classList.add('viewing');root.className='open clip';
    X.setMode('viewer');
    if(X.player.track&&!X.player.paused)X.player.toggle();
    const v=root.querySelector('.sim-video');v.poster=g.bg;v.src=g.clip;v.muted=!X.settings().sound;v.volume=.8;
    v.play().catch(()=>{v.muted=true;v.play().catch(()=>{})});
  }
  // ---------- 照片查看器 ----------""")
patch('js/viewers.js',"    setSlide(false);\n    mode = null;", "    if(mode==='clip'){const v=root.querySelector('.sim-video');v.pause();v.removeAttribute('src');v.load();}\n    setSlide(false);\n    mode = null;")
patch('js/viewers.js',"    if (mode === 'frame') {\n      if (a === 'back')", "    if(mode==='clip'&&a==='ok'){const v=root.querySelector('.sim-video');if(v.paused)v.play().catch(()=>{});else v.pause();return;}\n    if (mode === 'frame' || mode==='clip') {\n      if (a === 'back')")
patch('js/viewers.js',"X.viewer = { setup, openFrame, openPhoto", "X.viewer = { setup, openFrame, openClip, openPhoto")
# Localized game entries, clean game list, old tools still accessible in Network.
patch('plugins/gloria-content.js',"    const toys = (C.games || []).map", "    api.category('game').items=[];api.category('game').sel=0;\n    const toys = (C.games || []).map")
patch('plugins/gloria-content.js',"      desc: T(g.desc),", "      desc: T(g.desc,g.descEn),")
patch('plugins/gloria-content.js',"      bg: g.bg,", "      bgMobile:g.bgMobile,\n      bg: g.bg,")
patch('plugins/gloria-content.js',"api.registerAction('openToy', (it) => XMB.viewer.openFrame({ kind: 'toy', url: it.toy.url, title: tx(it.title), external: it.toy.url }));", """api.registerAction('openToy', (it) => it.toy.kind==='simulation'?XMB.viewer.openClip(it.toy):XMB.viewer.openFrame({kind:'toy',url:it.toy.url,title:tx(it.title),external:it.toy.url}));
    if(C.tools&&C.tools.length)api.addItems('network',[{id:'creative-tools',icon:'folder-game',title:T('创作工具','Creative Tools'),desc:T('原来的网页玩具与工具','Web toys and creative tools'),children:C.tools.map(g=>({id:'tool-'+g.id,icon:'toy',thumb:g.thumb,thumbKind:'wide',title:T(g.title,g.en),desc:T(g.desc),action:'openToy',toy:g}))}],{at:'end'});""")
# Append a theme instead of overwriting the original selectable theme.
p=SRC/'themes/gloria.js';p.write_text(p.read_text()+"""
XMB.registerTheme({id:'cotton',name:{zh:'棉花糖 · 光彩跃然',en:'Cotton Candy · GLORIA'},author:'SEASNAKE',gradient:{day:['#f6d4e9','#d8d2fa','#c1e7eb','#fff5e0'],night:['#f6d4e9','#d8d2fa','#c1e7eb','#fff5e0']},icon:'#fff3fa',wave:{tint:'#fff8fd',brightness:1}});
""")
p=SRC/'index.html';s=p.read_text().replace('<title>GLORIA XMB</title>','<title>GLORIA · 棉花糖多元宇宙</title>').replace('<link rel="stylesheet" href="css/mobile.css">','<link rel="stylesheet" href="css/mobile.css"><link rel="stylesheet" href="css/cotton.css">').replace('<canvas id="bg"></canvas>','<canvas id="bg"></canvas><video id="cotton-bg" muted loop playsinline preload="none" aria-hidden="true"></video>').replace('<script src="js/xmb.js"></script>','<script src="js/cotton.js"></script><script src="js/xmb.js"></script>');p.write_text(s)
