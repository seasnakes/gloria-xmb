/* XMB 图标库 —— 全部手绘 SVG，风格参照 LumaXMB 复刻版（seasnakes/lumaxmb-replica）：
 * 厚实的块面、大圆角，负空间直接镂空透出背景；填充统一用 #xg 渐变（白 → 浅灰，随主题轻微染色）。
 * 设定类图标 = 左上角带扳手的小圆章 + 右下角主图形。
 * 每个图标画在 64×64 的格子里；新图标用 XMB.registerIcon(name, fn) 注册，fn 返回 <svg> 内部内容。 */
(function () {
  const X = (window.XMB = window.XMB || {});
  const F = 'url(#xg)';
  let uid = 0;

  // ---------- 路径工具 ----------
  const rr = (x, y, w, h, r) =>
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const circ = (cx, cy, r) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
  const P = (d, extra = '') => `<path d="${d}" fill="${F}" fill-rule="evenodd" ${extra}/>`;
  const S = (d, w, extra = '') =>
    `<path d="${d}" fill="none" stroke="${F}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  // 蒙版：white 里的形状保留、black 里的形状镂空；整块用渐变填充
  const masked = (white, black) => {
    const id = 'xm' + ++uid;
    return (
      `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-4" y="-4" width="72" height="72">` +
      `<rect x="-4" y="-4" width="72" height="72" fill="#000"/><g fill="#fff" stroke="#fff">${white}</g><g fill="#000" stroke="#000">${black}</g></mask></defs>` +
      `<rect x="-4" y="-4" width="72" height="72" fill="${F}" mask="url(#${id})"/>`
    );
  };
  const line = (d, w) => `<path d="${d}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const fill = (d) => `<path d="${d}" stroke="none"/>`;
  const g = (inner, tx, ty, s) => `<g transform="translate(${tx} ${ty}) scale(${s})">${inner}</g>`;

  // ---------- 基础图形（64 格） ----------
  const PAD =
    'M17 14C21 13 25 15 32 15C39 15 43 13 47 14C55 15.5 59 24 61 36C62.5 45 60 51.5 55 52C51 52.5 48 48.5 45 44' +
    'C44 42.5 42.5 41.5 40.5 41.5H23.5C21.5 41.5 20 42.5 19 44C16 48.5 13 52.5 9 52C4 51.5 1.5 45 3 36C5 24 9 15.5 17 14Z';
  const FOLDER = 'M6 17A5 5 0 0 1 11 12H23.5C24.8 12 26 12.6 26.8 13.6L30 18H53A5 5 0 0 1 58 23V48A5 5 0 0 1 53 53H11A5 5 0 0 1 6 48Z';
  const face = (x, y, s, k = 1) => {
    // 圆角方块笑脸（eyes/mouth 镂空），x,y 为左上角，s 为边长
    const r = s * 0.28, ex = s * 0.32, ey = s * 0.4, er = s * 0.088 * k;
    return {
      white: fill(rr(x, y, s, s, r)),
      black:
        fill(circ(x + ex, y + ey, er) + circ(x + s - ex, y + ey, er)) +
        line(`M${x + s * 0.28} ${y + s * 0.62}Q${x + s / 2} ${y + s * 0.84} ${x + s * 0.72} ${y + s * 0.62}`, s * 0.11),
    };
  };
  const faceIcon = () => {
    const f = face(7, 7, 50);
    return masked(f.white, f.black);
  };
  const notes = () =>
    P(rr(20.5, 12, 5, 36.5, 1.5)) + P(rr(48, 7.5, 5, 36.5, 1.5)) +
    P('M20.5 11C30 14.5 41 13 53 7V15.5C41 21.5 30 23 20.5 19.5Z') +
    `<ellipse cx="15.5" cy="48.5" rx="8" ry="6.2" transform="rotate(-18 15.5 48.5)" fill="${F}"/>` +
    `<ellipse cx="43" cy="44" rx="8" ry="6.2" transform="rotate(-18 43 44)" fill="${F}"/>`;
  const film = () => {
    let d = rr(4, 12, 56, 40, 3.5);
    for (let i = 0; i < 4; i++) d += rr(8, 16.5 + i * 8.5, 6, 5.5, 1.6) + rr(50, 16.5 + i * 8.5, 6, 5.5, 1.6);
    return P(d + rr(18.5, 17, 27, 30, 1.5));
  };
  const globeMask = (cx, cy, r, w) => ({
    white: fill(circ(cx, cy, r)),
    black: line(
      `M${cx - r} ${cy}H${cx + r}M${cx} ${cy - r}V${cy + r}` +
        `M${cx - r * 0.84} ${cy - r * 0.47}Q${cx} ${cy - r * 0.25} ${cx + r * 0.84} ${cy - r * 0.47}` +
        `M${cx - r * 0.84} ${cy + r * 0.47}Q${cx} ${cy + r * 0.25} ${cx + r * 0.84} ${cy + r * 0.47}` +
        `M${cx} ${cy - r}C${cx - r * 0.62} ${cy - r * 0.6} ${cx - r * 0.62} ${cy + r * 0.6} ${cx} ${cy + r}` +
        `M${cx} ${cy - r}C${cx + r * 0.62} ${cy - r * 0.6} ${cx + r * 0.62} ${cy + r * 0.6} ${cx} ${cy + r}`,
      w
    ),
  });
  // 小圆章 + 镂空扳手（设定类左上角）
  const badge = (cx, cy, r) => ({
    white: fill(circ(cx, cy, r)),
    black:
      line(`M${cx - r * 0.42} ${cy + r * 0.42}L${cx + r * 0.16} ${cy - r * 0.16}`, r * 0.3) +
      fill(circ(cx + r * 0.3, cy - r * 0.3, r * 0.34)),
    notch: `<path d="M${cx + r * 0.3} ${cy - r * 0.3}L${cx + r * 0.62} ${cy - r * 0.62}" fill="none" stroke-width="${r * 0.2}" stroke-linecap="round"/>`,
  });
  const person = (cx, cy, s = 1) =>
    fill(circ(cx, cy - 13 * s, 8.5 * s)) + fill(`M${cx - 16 * s} ${cy + 19 * s}Q${cx - 16 * s} ${cy + 0.5 * s} ${cx} ${cy + 0.5 * s}Q${cx + 16 * s} ${cy + 0.5 * s} ${cx + 16 * s} ${cy + 19 * s}Z`);

  // 分类图标使用圆弧 / 贝塞尔曲线，避免截图描摹的密集折线在放大时显出锯齿。
  // 与菜单图标共用基础几何、镂空和渐变，保持 XMB 的厚实块面风格。
  const category = (inner) => g(inner, 5.12, 5.12, 0.84);
  const camera = () => P(
    'M12 21H21L24 14Q25 12 28 12H36Q39 12 40 14L43 21H52' +
    'Q57 21 57 26V47Q57 52 52 52H12Q7 52 7 47V26Q7 21 12 21Z' +
    circ(32, 36, 12) + circ(32, 36, 7)
  );
  const toolbox = () => P(
    rr(8, 26, 48, 24, 5) + rr(13, 30, 38, 3, 1.5) +
    rr(19, 29, 6, 9, 2) + rr(39, 29, 6, 9, 2)
  ) + S('M23 23V21Q23 16 28 16H36Q41 16 41 21V23', 4.5);

  // ---------- 设定类主图形（64 格，画好后缩到右下角） ----------
  const GLYPH = {
    update: () => {
      // 两段顺时针圆弧 + 箭头，中心 (32,32) 半径 19
      const R = 19, pt = (deg, r = R) => [32 + r * Math.cos((deg * Math.PI) / 180), 32 + r * Math.sin((deg * Math.PI) / 180)];
      let out = '';
      for (const a0 of [160, 340]) {
        const a1 = a0 + 105;
        const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
        out += S(`M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`, 7);
        const tip = pt(a1 + 24, R), o = pt(a1, R + 9), i = pt(a1, R - 9);
        out += P(`M${o[0].toFixed(2)} ${o[1].toFixed(2)}L${tip[0].toFixed(2)} ${tip[1].toFixed(2)}L${i[0].toFixed(2)} ${i[1].toFixed(2)}Z`);
      }
      return out;
    },
    game: () => P(PAD),
    video: () => film(),
    music: () => notes(),
    chat: () => P('M11 10H53A6 6 0 0 1 59 16V40A6 6 0 0 1 53 46H31L18 57V46H11A6 6 0 0 1 5 40V16A6 6 0 0 1 11 10Z' + circ(20, 28, 4) + circ(32, 28, 4) + circ(44, 28, 4)),
    system: () => P(rr(3, 16, 58, 32, 7) + rr(10, 28.5, 33, 4.5, 2.2) + circ(51, 30.5, 3.4)),
    theme: () => P('M32 6C48 6 59 16.5 59 30C59 38.5 52.5 42 46 41C41 40.2 38 43 40.2 48C42.5 53 38.5 58 32 58C17 58 5 46.5 5 32C5 17.5 17 6 32 6Z' + circ(20, 25, 4.6) + circ(31.5, 17, 4.6) + circ(44, 21, 4.6) + circ(18, 39, 4.6)),
    datetime: () => masked(fill(circ(32, 32, 26)), line('M32 32V16M32 32L43 39', 5.5)),
    power: () => S('M20 17A21 21 0 1 0 44 17', 7.5) + S('M32 7V30', 7.5),
    accessory: () => S('M11 39V31A21 21 0 0 1 53 31V39', 6.5) + P(rr(4, 34, 15, 22, 5) + rr(45, 34, 15, 22, 5)),
    display: () => P(rr(3, 7, 58, 40, 4.5) + rr(9, 13, 46, 28, 1.8)) + P(rr(26, 46, 12, 6, 0) + rr(15, 51, 34, 6, 3)),
    sound: () => P('M6 23H18L33 9V55L18 41H6Z') + S('M42 22Q49 32 42 42M49 14Q62 32 49 50', 6),
    security: () => S('M19 29V20A13 13 0 0 1 45 20V29', 7) + P(rr(9, 27, 46, 32, 6) + circ(32, 40, 5) + rr(29.5, 42, 5, 9, 2)),
    remote: () => P(rr(2, 18, 60, 28, 14) + rr(17, 22, 30, 20, 2) + circ(9.5, 32, 3) + circ(54.5, 32, 3)),
    network: () => {
      const m = globeMask(32, 32, 26, 3.4);
      return masked(m.white, m.black);
    },
  };
  const setIcon = (k) => () => {
    const b = badge(14.5, 14.5, 12);
    return masked(b.white, b.black) + masked(b.notch, '') + g(GLYPH[k](), 22, 22, 0.64);
  };

  const ICONS = {
    // ===== 分类 =====
    'cat-users': () => category(faceIcon()),
    'cat-settings': () => toolbox(),
    'cat-photo': () => camera(),
    'cat-music': () => category(notes()),
    'cat-video': () => category(film()),
    'cat-game': () => category(P(PAD)),
    'cat-network': () => setIcon('network')(),
    'cat-friends': () => {
      const back = face(25, 5, 33), front = face(5, 23, 34);
      return g(masked(back.white, back.black + fill(rr(1, 19, 42, 42, 13))) + masked(front.white, front.black), 6.5, 7, 0.8);
    },

    // ===== 用户 =====
    'user-new': () => masked(person(25, 30), '') + P(rr(43, 35.5, 18, 6, 2) + '') + P(rr(49, 29.5, 6, 18, 2)),
    'user-avatar': () => {
      const u = ++uid;
      const f = face(14, 14, 36);
      return (
        `<defs><linearGradient id="av${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc2dc"/><stop offset=".55" stop-color="#c7a8ff"/><stop offset="1" stop-color="#8fb4ff"/></linearGradient>` +
        `<mask id="avm${u}"><rect width="64" height="64" fill="#000"/><g fill="#fff" stroke="#fff">${f.white}</g><g fill="#000" stroke="#000">${f.black}</g></mask></defs>` +
        `<rect x="4" y="4" width="56" height="56" rx="12" fill="url(#av${u})"/>` +
        `<rect x="4" y="4" width="56" height="56" rx="12" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.5"/>` +
        `<rect width="64" height="64" fill="#fff" mask="url(#avm${u})"/>`
      );
    },
    power: () => GLYPH.power(),

    // ===== 照片 / 音乐 / 视频 =====
    playlist: () => P('M15 9.5C15 7 17.6 5.6 19.7 6.9L41 19.4C43 20.6 43 23.4 41 24.6L19.7 37.1C17.6 38.4 15 37 15 34.5Z') + P(rr(27, 41, 30, 6, 3) + rr(27, 51, 30, 6, 3) + circ(18.5, 44, 3.6) + circ(18.5, 54, 3.6)),
    gallery: () =>
      masked(fill(rr(22, 5, 37, 31, 4)), fill(rr(26, 9, 29, 23, 1.5)) + fill(rr(1, 17, 49, 44, 7))) +
      P(rr(5, 21, 41, 36, 4) + rr(9.5, 25.5, 32, 27, 1.5)) + P('M12 50L21.5 37L28 45L33 40L40 50Z' + circ(34, 32.5, 3.2)),
    sensme: () => masked(fill(circ(32, 32, 27)), `<g transform="translate(14 14) scale(.56)">${notes().replace(/fill="url\(#xg\)"/g, 'fill="#000"')}</g>`),
    editor: () => film(),
    folder: () => P(FOLDER),
    'folder-game': () => masked(fill(FOLDER), `<path d="${PAD}" transform="translate(16.5 22.5) scale(.48)" stroke="none"/>`),
    'folder-music': () => masked(fill(FOLDER), `<g transform="translate(19 21) scale(.42)">${notes().replace(/fill="url\(#xg\)"/g, 'fill="#000"')}</g>`),
    'folder-photo': () => masked(fill(FOLDER), `<g transform="translate(18 22) scale(.44)"><path d="M22 20L25.2 12.6Q26 11 27.8 11H36.2Q38 11 38.8 12.6L42 20Z" stroke="none"/><path d="${rr(5, 19, 54, 36, 7)}" stroke="none"/></g>`),
    'folder-video': () => masked(fill(FOLDER), `<g transform="translate(18 22) scale(.44)"><path d="${rr(4, 12, 56, 40, 3.5)}" stroke="none"/></g>`),
    trophy: () =>
      P('M17 8H47V20C47 30.5 40.5 37.5 32 38.5C23.5 37.5 17 30.5 17 20Z') + S('M17.5 13H10.5Q8.5 13 8.7 16Q10 27 19.5 29.5', 4.2) + S('M46.5 13H53.5Q55.5 13 55.3 16Q54 27 44.5 29.5', 4.2) +
      P(rr(28, 37, 8, 9, 0)) + P(rr(19, 45.5, 26, 5.5, 2)) + P(rr(14, 51, 36, 6.5, 2.5)),
    memcard: () => P('M15 5H49A4 4 0 0 1 53 9V55A4 4 0 0 1 49 59H22L11 48V9A4 4 0 0 1 15 5Z' + rr(19, 11, 26, 4, 1.8) + rr(19, 18.5, 26, 4, 1.8) + rr(22, 40, 20, 11, 2.5)),
    disc: () => {
      const u = ++uid;
      return (
        `<defs><radialGradient id="dg${u}" cx=".5" cy=".5" r=".5"><stop offset=".18" stop-color="#9aa3ad"/><stop offset=".2" stop-color="#e9edf2"/><stop offset=".42" stop-color="#ffffff"/><stop offset=".75" stop-color="#cfd5dc"/><stop offset="1" stop-color="#eef1f4"/></radialGradient>` +
        `<linearGradient id="ds${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6f0" stop-opacity="0"/><stop offset=".45" stop-color="#d8f1ff" stop-opacity=".75"/><stop offset=".55" stop-color="#ffe9c9" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
        `<path fill-rule="evenodd" fill="url(#dg${u})" d="${circ(32, 32, 27) + circ(32, 32, 4.6)}"/>` +
        `<path fill-rule="evenodd" fill="url(#ds${u})" d="${circ(32, 32, 27) + circ(32, 32, 10)}"/>` +
        `<path fill-rule="evenodd" fill="#7d8792" fill-opacity=".35" d="${circ(32, 32, 10) + circ(32, 32, 9)}"/>`
      );
    },
    toy: () => P('M32 5L55 17.5V46.5L32 59L9 46.5V17.5Z') + `<path d="M9 17.5L32 30L55 17.5M32 30V59" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2.6" stroke-linejoin="round"/>`,
    track: () => masked(fill(rr(7, 7, 50, 50, 12)), `<g transform="translate(13 12) scale(.6)">${notes().replace(/fill="url\(#xg\)"/g, 'fill="#000"')}</g>`),
    play: () => P('M20 11C20 8 23.2 6.3 25.8 7.9L52 23.8C54.5 25.3 54.5 28.7 52 30.2L25.8 46.1C23.2 47.7 20 46 20 43Z', 'transform="translate(-4 5)"'),
    slideshow: () => masked(fill(rr(5, 11, 54, 42, 6)), fill('M26 22.5C26 21 27.6 20 29 20.8L41.5 28.3C42.8 29.1 42.8 30.9 41.5 31.7L29 39.2C27.6 40 26 39 26 37.5Z')),
    info: () => masked(fill(circ(32, 32, 26)), fill(circ(32, 19.5, 4.4) + rr(28, 27, 8, 22, 3))),

    // ===== 网络 =====
    browser: () => {
      const m = globeMask(32, 32, 26, 3.4);
      return masked(m.white, m.black);
    },
    search: () => S(circ(26.5, 26.5, 15), 7) + S('M38 38L54.5 54.5', 9.5),
    manual: () => masked(fill(rr(7, 7, 50, 50, 13)), line('M24 25Q24 16.5 32 16.5Q40 16.5 40 24.5Q40 29.5 34.5 32.5Q32 34 32 38.5', 6.5) + fill(circ(32, 47.5, 4.2))),
    remote: () => GLYPH.remote(),
    download: () => P('M26 5H38V24H47.5L32 41L16.5 24H26Z') + P('M6 36V51A6 6 0 0 0 12 57H52A6 6 0 0 0 58 51V36H51.5V50.5H12.5V36Z'),
    github: () => masked(fill(rr(7, 7, 50, 50, 13)), line('M21 25L14 32L21 39M43 25L50 32L43 39M35.5 20L28.5 44', 5)),

    // ===== 好友 =====
    'friend-add': () => masked(person(25, 30), '') + P(rr(43, 35.5, 18, 6, 2)) + P(rr(49, 29.5, 6, 18, 2)),
    players: () => masked(person(22, 31, 0.92) + fill(circ(44, 15.5, 7.2)) + fill('M38.5 30Q41 28.5 44 28.5Q58 28.5 58 47H41Q41 36 38.5 30Z'), ''),
    message: () => masked(fill(rr(5, 13, 54, 39, 5)), line('M11 20L32 36L53 20', 4.5)),

    // ===== 设定条目的菱形 =====
    diamond: () => {
      const u = ++uid;
      return (
        `<defs><linearGradient id="dm${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9da3aa"/></linearGradient></defs>` +
        `<path d="M32 4L60 32L32 60L4 32Z" fill="url(#dm${u})"/>` +
        `<path d="M32 4L60 32L32 32Z" fill="#fff" fill-opacity=".55"/>` +
        `<path d="M4 32L32 60L32 32Z" fill="#000" fill-opacity=".18"/>` +
        `<path d="M32 16L48 32L32 48L16 32Z" fill="#fff" fill-opacity=".35"/>`
      );
    },
    empty: () => '',
  };
  Object.keys(GLYPH).forEach((k) => (ICONS['set-' + k] = setIcon(k)));

  // 时钟框里的小表盘：时针分针跟着真实时间走
  X.clockIcon = (h, m) => {
    const a = ((h % 12) + m / 60) * 30 * (Math.PI / 180);
    const b = m * 6 * (Math.PI / 180);
    return (
      `<svg viewBox="0 0 64 64"><g fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"><circle cx="32" cy="32" r="26"/>` +
      `<path d="M32 32L${(32 + Math.sin(a) * 14).toFixed(2)} ${(32 - Math.cos(a) * 14).toFixed(2)}M32 32L${(32 + Math.sin(b) * 21).toFixed(2)} ${(32 - Math.cos(b) * 21).toFixed(2)}"/></g></svg>`
    );
  };

  X.icon = (name) => {
    const fn = ICONS[name] || ICONS.folder;
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">${fn()}</svg>`;
  };
  X.hasIcon = (name) => !!ICONS[name];
  X.iconNames = () => Object.keys(ICONS);
  X.registerIcon = (name, fn) => (ICONS[name] = fn);
})();
