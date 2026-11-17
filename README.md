# GLORIA XMB · 次世代 B 站启动器 v2.1.0

当前发布版本：**v2.1.0（2026-11-17）**。基于棉花糖 v2，加入实时视效主题、主题封面预览与一键确认返回主页，整理 GLORIA 照片及投稿，并新增「声音碎片收藏馆」。完整说明见 [CHANGELOG.md](CHANGELOG.md)。

运行入口：[哔哩哔哩 Toy](https://www.bilibili.com/toy/gloria-xmb/index.html)。v2.1.0 已于 2026-11-17 提交审核，提交时平台返回 `auditing`；[本次平台预览](https://www.bilibili.com/toy/preview/author_9fWqYMjn/index.html)和[发布校验记录](release-2.1.0.json)可供核对。审核通过前正式入口仍可能保留上一版；下方按日期保留早期开发与验证记录。

## 棉花糖 v2 基线

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

## 2026-11-15 星核绽放动态主题试用

在「设定 → 主题设定 → 主题」中选择「星核绽放 · 常驻盛放」。使用 `/Users/seasnake/liuma/星核绽放.html`（与 v18 相同）的原始 WebGL2 动画，主题现为持续盛放版，保留原作形态、材质与星尘，取消收回重播；原始目录没有修改。默认仍为棉花糖，所选主题沿用现有设置保存。

- 桌面与手机共用实时视效，隐藏原作品的控制条，导航仍由 XMB 接收。淡蓝文字和适度降低的背景亮度确保菜单可读。
- 按需加载背景；切换主题或选择黑色背景时卸载，切到作品封面、播放器或后台时暂停。系统「减少动态效果」显示固定的绽放画面。WebGL 不可用或上下文丢失时显示备用背景并提示。
- 星核主题限制设备像素比为 1，桌面最高约 25 帧、手机约 16 帧；实际流畅度取决于设备。浏览器手机尺寸检查不等于真实手机性能测试。
- `source/js/visual-themes.js` 管理背景生命周期；每个视效用单独的主题注册文件和 `source/themes/effects/` 下自包含的 HTML 接入。后续可沿用这个入口添加其他作品。现有 JSON 导入仍用于配色主题，不会执行任意 HTML。
- `source/themes/effects/stellar.html` 是适配副本，去掉了在线字体请求，增加暂停、静帧和故障通知。

本地预览与打包：

```sh
npm ci
npm run build
python3 tools/serve.py
```

打开 <http://127.0.0.1:8876/package/>。预览服务支持媒体 Range 和禁用缓存；构建使用项目锁定的压缩工具，检查主程序和视效脚本语法及背景文件引用。ZIP 位于 `gloria-xmb-cotton-v2.zip`。此版本只在本地试用，未上传或更新 B 站线上版本。

### 常驻盛放修订

主题形态固定在原作充分展开的阶段（7.35 秒），材质流动和星尘闪烁使用独立、持续递增的时间，速度降为原来的 35%。约 43 秒一次的轻微呼吸，尺寸变化仅 ±0.8%；关闭回收位移与镜头缩放，不再每 8.9 秒坍缩重播。暂停与减少动态效果会冻结当前细节时间，恢复后继续。独立打开适配 HTML（不带 `theme` 参数）仍可看原版循环，原始素材保持不变。

## 主题封面列表与蓝色体积云

「设定 → 主题设定 → 主题」现在是独立封面列表，与游戏栏目共用导航方式。方向键或点选切换焦点，停留 450 毫秒后预览真实背景；Enter 或再次点选应用并保存。返回、离开主题列表或手机主页会取消未应用的预览，恢复保存的主题。底部显示「预览中 / 已应用」，当前主题另有标记。选中黑色背景时也可以预览完整效果，确认主题后会恢复该主题背景。

新增「蓝色体积云 · liuma」：源自 seasnake 的 [liuma test](https://www.shadertoy.com/view/t3sXW8)，原作是 tmst 的 [Volumetric lighting](https://www.shadertoy.com/view/tdjBR1)。当前主题恢复实时体积密度与光照变化，镜头固定在原作 3.1 秒的朝向，不随时间旋转。云雾扩大到大部分画面，菜单区域仅适度压暗。体素网格由 128³ 降至 64³，每页只更新一个 512×512 纹理面，保留平滑插值；光照步长 0.055、视线步长 0.035。桌面上限 768×432、约 24 帧，手机上限 360×640、约 15 帧，时间速度为原作 90%。不支持浮点 WebGL2 的设备显示备用配色。可通过主题的选项菜单查看来源和作者。

- 所有主题有独立封面；实时视效封面直接从对应渲染画面截取。
- 快速切换会释放上一主题的图形上下文；取消预览不会改写已保存设置。
- `tools/import_shadertoy.py` 可从本机 `references/shadertoy/t3sXW8.json` 与 `noise.png` 重建离线制图页面 `references/shadertoy/render.html`，不会覆盖运行主题。下载参考文件不随仓库追踪；加 `--live` 会生成当前实时主题。构建发布包使用已生成的自包含 HTML。
- 构建会验证视效脚本语法及封面引用。此版本仍为本地试用，尚未上传 B 站。

### 静谧背景与性能修订（已被下方实时流动版取代）

- 蓝色体积云固定形状与视角：桌面主体放在右侧，左侧保持暗色；手机主体下移，顶部和菜单焦点留白。轻微纹理流动与亮度呼吸不改变主体朝向。
- 原体积云双缓冲立方体纹理约占 96 MiB（分配量，不含其他资源），现用一张 768×768 缓存纹理。运行时单次绘制，不再执行体积密度或光照遍历。
- 星核保持常驻盛放，主题模式使用低档采样与分辨率上限；桌面向右避让菜单，手机下移并降低亮度。独立原版循环模式保持原有画面与质量设置。
- 2026-11-15 同一浏览器 1280×720、各 2 秒样本：旧云 152 次绘制 / 127,572,992 视口像素，新云 48 次 / 24,883,200 像素。像素工作量约减少 80.5%，不是整机 CPU、GPU 占用或电池耗电测量；尚未做真实手机性能测试。
- 手机 393×852 无横向溢出；减少动态效果、播放器暂停状态均停止绘制，恢复后继续。构建检查包括背景 PNG 引用。

### 恢复明显流动与铺满屏幕

用户反馈缓存版看起来不动，因此已恢复原作的实时云层变化，取消上一版的缓存纹理摆动。固定相机不会旋转，但云层内部密度、光照随时间持续变化。星核也恢复全屏构图，细节速度从原作 35% 提升到 70%，仍保持常驻盛放、不坍缩。

2026-11-15 桌面 1280×720 的两秒样本：147 次绘制、41,947,136 视口像素；较最初 128³ 版本的 127,572,992 约减少 67%。这比缓存版开销高，但保留真实流动。该数字不是整机占用或耗电测试。已连续观察云层变化，并验证减少动态效果会停止绘制。

### 全屏填充构图（已被下方完整轮廓版取代）

最新反馈选择全屏填充：按横竖比例裁取云体中央区域（视野缩放 `.50 / max(1, aspect)`），让体积延伸出屏幕四边，避免半截立方体轮廓。只改构图，保留实时密度、光照流动和原有限帧；不恢复镜头旋转。

### 缩小云团、保留完整轮廓

根据最新反馈，取消全屏裁切。使用 `1.55 / min(1, aspect)` 的等比完整展示构图；桌面略向右，竖屏靠近中央，四周保留空隙以看清云体外形。相机方向、实时密度与光照、动画速度和性能设置保持不变。

### 星核清晰度恢复

此前星核叠加了 960×640 画布上限与 50% 内部渲染比例，1280×720 窗口的主体实际仅以 480×270 渲染，导致粒子与边缘模糊。现主题恢复高质量档：内部比例 100%、140 步采样；支持最高 1.5 倍设备像素比，总画布上限 1920×1080。保留桌面约 24 帧、手机约 15 帧，以及后台/作品预览暂停；不在主题模式中自动降回模糊分辨率。相比之前低档，清晰度恢复会增加 GPU 工作量。云雾主题不受影响。

## 2026-11-15 主题确认返回主页与内容整理

- 主题确认后先保存，再退出全部子菜单；桌面回到 XMB 分类界面，手机回到分类主页。手机主页按钮共用这一返回逻辑，未确认的主题预览仍会取消。
- 设定保留主题、颜色、背景、亮度、界面语言、时间显示、音效和恢复默认值。未接入的主机占位项，以及系统版本、插件清单、JSON 导入入口已注释保留，不再显示在菜单中。
- 原照片列表的 60 项替换为 GLORIA 成品合集中的 13 项：6 个表情作品、7 张风格图。包含叭叭叭、神降临、无语脸和原始摇摆 GIF；不包含被修订的初版、教程封面、动画底稿、精灵表和 GIF 的重复静帧。图像来自本机 `GLORIA-风格与提示词合集-2026-10-24`，保留原提示词，未改动原始归档。运行包中不再包含旧照片。
- 「我的投稿」从 `BV1RHhU63ESq`《Opus5.5 一句话生成 world.execute(me); mv （附对话过程记录）》起，包含该期，按发布时间倒序排列。2026-11-15 同步得到 25 条可公开读取的视频，新增 9 条、移除起始期之前的 26 条，最新为 Fable 5.2 建模测试。账号列表中的 `BV1QyJ86pEGr` 和 `BV16XpM6EEzZ` 当前公开详情返回 62012，未纳入播放列表；保留在同步报告中。空收藏文件夹已移除。
- `tools/sync_submissions.py` 单独刷新投稿，分页查到指定起始期后再筛选；找不到起始期或读取失败时不替换现有清单。`submission-sync-report.json` 记录范围与排除项。`tools/curate_photos.py` 从现有归档制作压缩运行图，需要 Pillow；`photo-curation-report.json` 保留源文件映射。两者均不修改音乐和游戏。
- 构建仍只复制当前内容引用的媒体；ZIP 已验证不存在旧相册图片和已移除投稿的封面。本次仍为本地试用，未更新 B 站线上包。

## 2026-11-16 声音碎片收藏馆

「网易云音乐片段」改名为「声音碎片收藏馆」，保留原有《宿醉》，加入《Color Your Night》（Lotus Juice / 高橋あず美）的原曲 2:43–3:32，共 49 秒。网易云公开接口当前不提供此曲的可播放地址，因此从用户下载目录中的同曲音频截取并打包为本地 AAC 片段；正式播放从片段起点开始，49 秒结束；停留试听仍沿用 30 秒上限。封面采用原专辑封面，保留网易云原曲入口。`sound-fragments-report.json` 记录音源、校验值及截取区间。
