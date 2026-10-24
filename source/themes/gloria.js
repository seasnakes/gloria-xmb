/* 示例第三方主题：光彩跃然。棉花糖粉彩（粉 / 浅紫 / 长春花蓝），白天亮、夜里转成深紫。
 * gradient 给四角颜色：[左上, 右上, 左下, 右下]；也可以给 12 组让它按月变化，或者直接给 monthTex（同 js/bgtex.js 的格式）。 */
XMB.registerTheme({
  id: 'gloria',
  name: { zh: '光彩跃然', en: 'GLORIA' },
  author: 'SEASNAKE',
  gradient: {
    day: ['#f3b9d3', '#c8b4f1', '#9eb3f2', '#e3cdee'],
    night: ['#130e29', '#211946', '#55397f', '#86579a'],
  },
  icon: '#fff3fa',
  wave: { tint: '#fff8fd', brightness: 1.15 },
});

XMB.registerTheme({id:'cotton',name:{zh:'棉花糖 · 光彩跃然',en:'Cotton Candy · GLORIA'},author:'SEASNAKE',gradient:{day:['#f6d4e9','#d8d2fa','#c1e7eb','#fff5e0'],night:['#f6d4e9','#d8d2fa','#c1e7eb','#fff5e0']},icon:'#fff3fa',wave:{tint:'#fff8fd',brightness:1}});
