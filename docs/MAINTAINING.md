# 维护说明

`source/` 是本仓库唯一的源码编辑目录。`package/`、`gloria-xmb-cotton-v2.zip` 和 `build-report.json` 均由构建脚本生成，不要直接手改 `package/` 里的文件。

## 构建与本地预览

安装依赖并生成发布包：

```bash
npm ci
npm run build
```

`npm run build` 会运行 `build_release.py`：

1. 按 `source/content/data.js` 实际引用的 `content/media/*` 路径复制媒体，自动剔除未引用的旧文件。
2. 复制 `source/themes/effects/` 与 `source/themes/thumbnails/`。
3. 按 `source/index.html` 和 `source/plugins/plugins.js` 的加载顺序合并脚本，用锁定的 `terser` 压缩并生成带哈希的 `assets/app.<hash>.js` 与 `assets/xmb.<hash>.css`。
4. 用 `node --check` 校验主脚本和各动态主题内联脚本的语法，核对所有视效与缩略图引用存在。
5. 写入 `package/version.json`、`build-report.json`，并打包 `gloria-xmb-cotton-v2.zip`。

本地启动预览：

```bash
python3 tools/serve.py
```

默认监听 `http://127.0.0.1:8876/package/`（也可传入自定义端口号，如 `python3 tools/serve.py 9000`）。开发调试未压缩源码时，也可以在同一服务下访问 `/source/`。

## 常用修改入口

- **菜单与内置设定**：`source/js/data.js`、`source/js/xmb.js`
- **内容挂载与卡片动作**：`source/plugins/gloria-content.js`
- **内容数据清单**：`source/content/data.js`
- **动态主题生命周期**：`source/js/visual-themes.js`（仅内置注册的主题可加载独立视效 iframe）
- **新增主题**：在 `source/themes/` 下新增主题注册脚本（实时视效页面放入 `source/themes/effects/`，缩略图放入 `source/themes/thumbnails/`），随后在 `source/plugins/plugins.js` 的 `XMB.manifest` 中加入对应路径，重新执行 `npm run build`。

## 离线维护脚本

仓库已包含压缩后的运行媒体，常规界面修改和打包不需要运行以下脚本。仅在更新外部内容或从原始母版重制素材时按需使用：

| 脚本 | 用途 | 前置条件 |
|---|---|---|
| `tools/sync_submissions.py` | 从指定起始期（`BV1RHhU63ESq`）起刷新可公开读取的 B 站投稿列表与封面，生成 `submission-sync-report.json` | 本机已安装并登录 `toy` CLI，且有 `cwebp` |
| `tools/sync_music_videos.py` | 同步公开网易云歌单曲目外链状态与新增投稿封面 | 网络可访问网易云 / B 站公开接口，`toy` CLI、`cwebp` |
| `tools/curate_photos.py` | 从本地 GLORIA 作品归档目录筛选并压缩表情与风格图（支持 `--archive <目录>` 指定路径） | Python `Pillow`、本地原图归档 |
| `tools/prepare_media.py` | 从原始长片和封面原图切分、压缩 10 段游戏世界短片与预览 | `ffmpeg`、`cwebp` 及本机母版素材 |
| `tools/import_shadertoy.py` | 从本地 `references/shadertoy/` 导出的 JSON 与噪声贴图生成离线参考页，加 `--live` 生成运行版体积云主题 | 本地 `references/shadertoy/` 素材 |

> `tools/update_runtime.py` 是早期一次性迁移脚本，不要在当前版本上重复运行。
