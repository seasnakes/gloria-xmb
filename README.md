# GLORIA XMB · 棉花糖多元宇宙 v2

2026-10-23。以已发布的 mobile v1.1 为基础，保留照片提示词面板修复。

- 正式 GLORIA 技能：`/Users/seasnake/.codex/skills/gloria-character/SKILL.md` 与 `references/visual-system.md`。
- 背景复用 v19/FOMO 的棉花糖流体 daylight 序列，8 秒低码率往返循环。后台、打开播放器和进入封面时暂停；减少动态效果偏好使用静帧。
- 10 个游戏世界对应多元宇宙 v4 的 8 秒完整段落，首四项为饥荒、人森（朋友收集/梦想生活）、底特律、女神异闻录。人森沿用旧片中名为 `w1_ac` 的生活模拟段落，本次没有重渲染该段剧情。
- 重新生成 10 张封面，保留原生成图；每张输出 1280/720/384 宽 WebP。手机封面完整宽度展示，播放器保持原始横屏画面。
- 旧 7 个网页玩具移到网络 → 创作工具；60 张照片、38 个视频入口与音乐内容保留。
- 默认顶层入口：桌面用户分类、手机分类主页，不默认停在游戏项。
- 第一回真实 pointerdown/keydown 既解锁音频也继续原导航；已静音预览同步恢复，用户手动静音会保留。无操作自动有声播放仍受浏览器限制。
- 游戏完整片段使用同一页面的原生 video 播放器，在点击事件内播放，避免跨 iframe 或延迟启动丢失激活。

## 继续修改

`source/` 是本版本唯一编辑源。`build_release.py` 不会覆盖源文件，按内容引用重建 `package/` 和 ZIP，移除旧包里未引用媒体。

```sh
python3 /Users/seasnake/gloria/publish/xmb/cotton-v2/build_release.py
```

`tools/prepare_media.py` 可从原片和生成图重新压缩媒体；会更新内容清单，但保留旧工具列表。`tools/update_runtime.py` 是一次性的 v1.1 → v2 修改记录，不能在本版本重复执行。

## 校验

- `media-checks.json`：21 段完整解码（10 正片段 + 10 预览 + 1 背景）。
- `build-report.json`：包体字节、内容数量、哈希及媒体引用检查。
- 手机 320/393 宽检查无横向溢出；平台 iframe 冷启动回主界面；第一次点击游戏即播放带声预览；完整片段播放到 8 秒结束，主页按钮可返回并停止播放器。
- 新包不在首页预加载完整游戏片段；首页唯一视频请求为棉花糖背景。

平台草稿预览：https://www.bilibili.com/toy/preview/author_ja3hAfoq/index.html
本次先交付预览，尚未提交新审核。

## 2026-10-23 night and cover revision
- Cotton fluid now follows existing time setting (automatic/dawn/day/dusk/night), with smooth brightness grading and matching light nighttime icons/text. Reuses the loop without another video payload.
- Rebuilt life/dbh/ut/dr covers with readable game titles and actual Mii / android / pixel battle / class-trial visual references. Updated preparation script and media manifest to preserve new assets.
- Added localized thumbnail title overlays for the remaining six games.
- Desktop night and mobile day/night/game screens visually checked; package syntax and all referenced media verified by builder. Package remains about 22.3 MB.
- Draft preview: https://www.bilibili.com/toy/preview/author_78yUCcwI/index.html (not submitted for review).
- Life video still uses the existing v4 life-simulation segment; this revision replaces its cover, not the original movie footage.

## 2026-10-23 music and submissions
- Imported all 9 tracks in NetEase playlist 18506316853, preserving its order. Public outer playback works for 6 at verification; world.execute(me), I Hate Myself for Loving You and Fades Away use explicit NetEase links. External-only entries are excluded from the continuous play queue.
- Kept the existing music excerpt group. Music is streamed, not bundled; availability may change on NetEase.
- Added the 4 newer published uploads to 我的投稿, now 42 videos sorted newest first.
- Reproducible metadata/cover refresh: tools/sync_music_videos.py. Source backup before import: before-playlist-data.js.
- Verified mobile folder/list displays and natural GO GHOST playback on localhost and actual bilibilitoy preview (active true, playback advanced to 44.9s). Build verifies syntax and all asset references. Package about 22.65 MB.

## Git 版本管理（2026-10-24）

当前项目以本目录为 Git 仓库根目录，后续修改以 `source/` 为准。`/Users/seasnake/gloria/xmb` 是旧工程，`optimization/mobile-live` 是预览副本。

- 跟踪源代码、内容数据、构建与同步脚本，以及网页运行必需的压缩图片、音视频。当前运行素材约 25 MB，单文件最大约 1.2 MB，随代码保存，保证检出版本后素材一致。
- `package/` 和 ZIP 是构建产物，截图、参考下载、缓存和本地环境文件也被忽略。原始大视频和生成图片母版留在原素材目录，通过 `media-manifest.json` 记录来源。
- 初始提交保存当前棉花糖昼夜主题、移动端适配、游戏封面、网易云歌单和 42 条视频投稿这一版；更早的修改没有补造提交历史。
- 构建发布包：`python3 build_release.py`。重新制作媒体需要本机原始素材及 `tools/prepare_media.py` 中所列依赖；构建发布包只使用已跟踪的运行素材。
- 这是本地 Git 仓库，尚未配置远端。后续修改用提交记录保存；发布操作及审核状态与 Git 提交分开管理。
