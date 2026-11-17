/* 插件清单：boot.js 会按顺序加载这里列的脚本，全部加载完才启动 XMB。路径相对 index.html。
 * 想加插件 / 主题：把文件放进 plugins/ 或 themes/，在下面加一行。 */
window.XMB = window.XMB || {};
XMB.manifest = [
  'content/data.js', // 内容数据（由 tools/build_content.py 生成）
  'plugins/gloria-content.js', // 把内容挂到 游戏 / 照片 / 音乐 / 视频 / 网络
  'themes/liuma-cloud.js', // Shadertoy t3sXW8：蓝色体积云
  'themes/stellar.js', // 本地视效主题：星核绽放
  'themes/gloria.js', // 示例第三方主题：光彩跃然
];
