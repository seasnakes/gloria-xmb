/* 星核绽放 v18 — /Users/seasnake/liuma/星核绽放.html, adapted for XMB. */
XMB.registerTheme({
  id: 'stellar',
  name: {zh: '星核绽放 · 常驻盛放', en: 'Stellar Bloom · Ambient'},
  author: 'SEASNAKE',
  thumbnail:'themes/thumbnails/stellar.png',
  description:{zh:'持续盛放的蓝色星核，轻微呼吸与星尘流动。',en:'An open blue bloom with a gentle breath and drifting stardust.'},
  gradient: {day: ['#01030a', '#071126', '#020610', '#091a37']},
  icon: '#dcecff',
  wave: {tint: '#8fc4ff', brightness: 0.35},
});
XMB.visualThemes.register('stellar', 'themes/effects/stellar.html');
