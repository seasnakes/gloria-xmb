/* XMB 菜单数据。之后接入自己的 toy / 音乐 / 视频 / 照片，改这里（或者以后的插件）就行。
 *
 * 分类：{ id, icon, label:{zh,en}, sel(默认选中第几项), items:[...] }
 * 条目：{ id, icon, title:{zh,en}, desc?:{zh,en},
 *        children?:[...]      ✕ 进入子菜单（[] 表示空文件夹）
 *        compact?:true        子菜单用设定样式（小菱形图标）
 *        setting?:'key'       右侧显示当前值，✕ 弹出选项（定义见 settingDefs）
 *        value?:{zh,en}       右侧显示的固定值
 *        action?:'xxx'        ✕ 时执行的动作（见 xmb.js 里的 ACTIONS）
 *        options?:[...]       △ 选项菜单 }
 */
(function () {
  const X = (window.XMB = window.XMB || {});
  const T = (zh, en) => ({ zh, en: en || zh });

  const MONTHS_ZH = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  X.settingDefs = {
    theme: { title: T('主题', 'Theme'), choices: [] }, // 启动时按已注册的主题填充
    color: {
      title: T('颜色', 'Color'),
      choices: [{ v: 0, label: T('标准（随月份变化）', 'Standard (Changes Monthly)') }].concat(
        MONTHS_ZH.map((m, i) => ({ v: i + 1, label: T(m, MONTHS_EN[i]), swatch: i + 1 }))
      ),
    },
    background: { title: T('背景', 'Background'), choices: [{ v: 'original', label: T('原版', 'Original') }, { v: 'black', label: T('黑色', 'Black') }] },
    time: {
      title: T('亮度', 'Brightness'),
      choices: [
        { v: 'auto', label: T('自动（随时间变化）', 'Auto (Changes with Time)') },
        { v: 'dawn', label: T('黎明', 'Dawn') },
        { v: 'day', label: T('白天', 'Day') },
        { v: 'dusk', label: T('黄昏', 'Dusk') },
        { v: 'night', label: T('夜晚', 'Night') },
      ],
    },
    clock: { title: T('时间显示', 'Time Format'), choices: [{ v: 24, label: T('24 小时制', '24-Hour Clock') }, { v: 12, label: T('12 小时制', '12-Hour Clock') }] },
    lang: { title: T('系统语言', 'System Language'), choices: [{ v: 'zh', label: T('简体中文', '简体中文') }, { v: 'en', label: T('English', 'English') }] },
    sound: { title: T('XMB 音效', 'XMB Sounds'), choices: [{ v: true, label: T('开', 'On') }, { v: false, label: T('关', 'Off') }] },
  };

  X.settingDefaults = { theme: 'original', color: 0, background: 'original', time: 'auto', clock: 24, lang: 'zh', sound: true };

  const NA = T('这是界面复刻，此功能暂未接入。', "This is a UI replica. This feature isn't connected yet.");
  const leaf = (id, icon, zh, en, dz, de, extra) =>
    Object.assign({ id, icon, title: T(zh, en), desc: dz ? T(dz, de) : null, action: 'na' }, extra || {});
  const setting = (key) => ({ id: 'set-' + key, icon: 'diamond', title: X.settingDefs[key].title, setting: key });

  X.text = {
    empty: T('没有标题。', 'There are no titles.'),
    na: NA,
    yes: T('是', 'Yes'),
    no: T('否', 'No'),
    ok: T('确定', 'OK'),
    back: T('返回', 'Back'),
    info: T('信息', 'Information'),
    del: T('删除', 'Delete'),
    powerOff: T('要关闭系统吗？', 'Do you want to turn off the system?'),
    pressAny: T('按任意键开机', 'Press any button to turn on'),
    sysinfo: T('系统软件版本：4.90\nGLORIA XMB 复刻版 0.2', 'System Software Version: 4.90\nGLORIA XMB Replica 0.2'),
    reset: T('要将所有设定恢复为默认值吗？', 'Restore all settings to their default values?'),
    resetDone: T('已恢复默认设定。', 'Default settings have been restored.'),
    delNo: T('无法删除此项目。', 'This item cannot be deleted.'),
    themeOk: T('已导入主题「{name}」。', 'Theme "{name}" imported.'),
    themeBad: T('这个文件不是有效的主题：{err}', 'Not a valid theme: {err}'),
    pluginList: T('已安装的插件：', 'Installed plugins:'),
    manual: T('← → 切换分类　↑ ↓ 选择　✕ 确定　○ 返回　△ 选项\n键盘：方向键 / Enter / Esc / T，也支持手柄、滚轮和右键。\n内容在 content/sources.json，插件在 plugins/plugins.js。', '← → Category　↑ ↓ Select　✕ Confirm　○ Back　△ Options\nKeyboard: arrows / Enter / Esc / T. Gamepad, wheel and right-click work too.\nContent: content/sources.json · Plugins: plugins/plugins.js'),
  };

  X.data = {
    start: 'users',
    categories: [
      {
        id: 'users', icon: 'cat-users', label: T('用户', 'Users'), sel: 2,
        items: [
          leaf('poweroff', 'power', '关闭系统', 'Turn Off System', '关闭 PS3™ 系统。', 'Turns off the PS3™ system.', { action: 'powerOff' }),
          leaf('newuser', 'user-new', '新建用户', 'Create New User', '新建一个用户。', 'Creates a new user.'),
          { id: 'me', icon: 'user-avatar', title: T('GLORIA'), desc: T('光彩跃然', 'Glorious'), action: 'na' },
        ],
      },
      {
        id: 'settings', icon: 'cat-settings', label: T('设定', 'Settings'), sel: 1,
        items: [
          // 未接入的主机占位项保留在源码中，运行菜单只显示可用设定。
          // leaf('update', 'set-update', '系统更新', 'System Update', '更新 PS3™ 系统软件。', 'Updates the PS3™ system software.'),
          // leaf('gameset', 'set-game', '游戏设定', 'Game Settings', '调整游戏相关的设定。', 'Adjusts settings for games.'),
          // leaf('videoset', 'set-video', '视频设定', 'Video Settings', '调整 BD/DVD 视频播放的设定。', 'Adjusts settings for BD and DVD video.'),
          // leaf('musicset', 'set-music', '音乐设定', 'Music Settings', '调整音乐播放的设定。', 'Adjusts settings for music.'),
          // leaf('chatset', 'set-chat', '聊天设定', 'Chat Settings', '调整聊天相关的设定。', 'Adjusts settings for chat.'),
          {
            id: 'sysset', icon: 'set-system', title: T('系统设定', 'System Settings'), desc: T('设置界面语言，或恢复默认设定。', 'Set the interface language or restore default settings.'),
            compact: true,
            children: [
              setting('lang'),
              // { id: 'sysinfo', icon: 'diamond', title: T('系统信息', 'System Information'), action: 'sysinfo' },
              // { id: 'plugins', icon: 'diamond', title: T('已安装的插件', 'Installed Plugins'), action: 'plugins' },
              { id: 'reset', icon: 'diamond', title: T('恢复默认设定', 'Restore Default Settings'), action: 'reset' },
            ],
          },
          {
            id: 'themeset', icon: 'set-theme', title: T('主题设定', 'Theme Settings'), desc: T('调整主题、颜色和背景等设定。', 'Adjusts settings for themes, colors and backgrounds.'),
            compact: true,
            children: [
              {id:'theme-gallery',icon:'set-theme',title:T('主题', 'Themes'),desc:T('浏览主题图标，停留预览，确认应用。', 'Browse theme covers, preview, then confirm to apply.'),children:[]},
              // { id: 'importTheme', icon: 'diamond', title: T('导入主题…', 'Import Theme…'), desc: T('从 JSON 文件导入第三方主题。', 'Import a third-party theme from a JSON file.'), action: 'importTheme' },
              Object.assign(setting('color'), { desc: T('设定 XMB 的背景颜色。', 'Sets the background color of the XMB.') }),
              Object.assign(setting('background'), { desc: T('设定 XMB 的背景。', 'Sets the background of the XMB.') }),
              Object.assign(setting('time'), { desc: T('设定背景随时间变化的亮度。', 'Sets how the background brightness changes with time.') }),
            ],
          },
          {
            id: 'dateset', icon: 'set-datetime', title: T('日期和时间设定', 'Date and Time Settings'), desc: T('调整日期和时间的显示。', 'Adjusts settings for the date and time.'),
            compact: true,
            children: [setting('clock')],
          },
          // leaf('powerset', 'set-power', '省电设定', 'Power Save Settings', '调整省电相关的设定。', 'Adjusts settings for power saving.'),
          // leaf('accset', 'set-accessory', '周边设备设定', 'Accessory Settings', '调整周边设备的设定。', 'Adjusts settings for accessories.'),
          // leaf('dispset', 'set-display', '显示设定', 'Display Settings', '调整视频输出的设定。', 'Adjusts settings for video output.'),
          {
            id: 'soundset', icon: 'set-sound', title: T('声音设定', 'Sound Settings'), desc: T('调整声音输出的设定。', 'Adjusts settings for audio output.'),
            compact: true,
            children: [setting('sound')],
          },
          // leaf('secset', 'set-security', '安全设定', 'Security Settings', '调整安全相关的设定。', 'Adjusts settings for security.'),
          // leaf('rpset', 'set-remote', '遥控游玩设定', 'Remote Play Settings', '调整遥控游玩的设定。', 'Adjusts settings for Remote Play.'),
          // leaf('netset', 'set-network', '网络设定', 'Network Settings', '调整网络连接的设定。', 'Adjusts settings for network connections.'),
        ],
      },
      {
        id: 'photo', icon: 'cat-photo', label: T('照片', 'Photo'), sel: 0,
        items: [],
      },
      {
        id: 'music', icon: 'cat-music', label: T('音乐', 'Music'), sel: 0,
        items: [],
      },
      {
        id: 'video', icon: 'cat-video', label: T('视频', 'Video'), sel: 0,
        items: [],
      },
      {
        id: 'game', icon: 'cat-game', label: T('游戏', 'Game'), sel: 0,
        items: [
          leaf('gamedata', 'folder-game', '游戏数据管理工具', 'Game Data Utility', '管理已安装的游戏数据。', 'Manage installed game data.'),
          leaf('trophy', 'trophy', '奖杯收藏', 'Trophy Collection', '查看获得的奖杯。', 'View your trophies.'),
        ],
      },
      {
        id: 'network', icon: 'cat-network', label: T('网络', 'Network'), sel: 0,
        items: [
          leaf('manual', 'manual', '在线说明书', 'Online Instruction Manuals', '查看这个 XMB 的使用说明。', 'How to use this XMB.', { action: 'manual' }),
        ],
      },
      {
        id: 'friends', icon: 'cat-friends', label: T('好友', 'Friends'), sel: 0,
        items: [
          leaf('addfriend', 'friend-add', '添加好友', 'Add Friend', '向其他玩家发送好友请求。', 'Send a friend request to another player.'),
          leaf('players', 'players', '已遇见的玩家', 'Players Met', '查看最近一起游戏的玩家。', "View players you've played with recently."),
          leaf('messages', 'message', '留言', 'Messages', '查看收到的留言。', 'View your messages.'),
        ],
      },
    ],
  };
})();
