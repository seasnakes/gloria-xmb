/* XMB 背景：按月变色的渐变底 + 丝带波浪 + 闪光粒子 + 泛光（WebGL）。
 * 月份颜色来自 PS3 固件 lines.qrc 的取色表（psdevwiki），一天分黎明 / 白天 / 黄昏 / 夜晚。
 * 底色模型照实机截图反推：白天上方偏冷偏亮、下方偏紫偏暗；夜晚整体压暗、上方更暗。
 * 波浪是几条丝带网格，亮度按“投影后的线密度”算：丝带转到侧面时线条挤在一起，就出现亮边。 */
(function () {
  const X = (window.XMB = window.XMB || {});

  const MONTH_HEX = ['CBCBCB', 'D8BF1A', '6DB217', 'E17E9A', '178816', '9A61C8', '02CDC7', '0C76C0', 'B444C0', 'E5A708', '875B1E', 'E3412A'];
  const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const mul = (a, k) => a.map((v, i) => v * (Array.isArray(k) ? k[i] : k));
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const bump = (v, c, w) => Math.exp(-((v - c) * (v - c)) / (w * w));

  // ---------- 主题颜色 ----------
  const decodedCache = {};
  const decode = (th) => {
    const T = (th && th.monthTex) || X.monthTex;
    const key = (th && th.id) || 'original';
    if (decodedCache[key]) return decodedCache[key];
    const conv = (s) => {
      const a = new Float32Array(s.length / 2);
      for (let i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16) / 255;
      return a;
    };
    return (decodedCache[key] = { w: T.w, h: T.h, day: T.day.map(conv), night: T.night.map(conv) });
  };
  const lerpArr = (a, b, t) => {
    if (t <= 0) return a;
    const o = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) o[i] = a[i] + (b[i] - a[i]) * t;
    return o;
  };
  const hexToRgb = (c) => {
    const h = String(c).replace('#', '');
    const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
  };
  const avg = (a) => {
    const c = [0, 0, 0];
    for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) c[k] += a[i + k];
    return c.map((v) => (v * 3) / a.length);
  };

  const theme = {
    MONTH_HEX,
    // 当前月份（及过渡比例）：每月 24 号之后慢慢过渡到下个月
    monthOf(date, fixed) {
      if (fixed) return { m: fixed - 1, next: fixed - 1, t: 0 };
      const m = date.getMonth();
      const d = date.getDate() + date.getHours() / 24;
      const days = new Date(date.getFullYear(), m + 1, 0).getDate();
      return { m, next: (m + 1) % 12, t: sstep(24, days + 1, d) };
    },
    hourOf(date, mode) {
      return { dawn: 5.6, day: 12, dusk: 19.0, night: 23 }[mode] ?? date.getHours() + date.getMinutes() / 60;
    },
    // 夜→昼 4:00–6:30，昼→夜 18:00–20:30（参照 BACKGROUND.mnu 的 NIGHT2DAY / DAY2NIGHT）
    timeState(h) {
      return { h, day: sstep(4, 6.5, h) * (1 - sstep(18, 20.5, h)) };
    },
    compute(date, { fixed = 0, hour, black = false, theme: th = null } = {}) {
      const D = decode(th);
      const monthly = !th || th.monthly !== false;
      const mo = monthly ? theme.monthOf(date, fixed) : { m: 0, next: 0, t: 0 };
      const ts = theme.timeState(hour);
      const pick = (arr, i) => arr[Math.min(i, arr.length - 1)];
      const day = lerpArr(pick(D.day, mo.m), pick(D.day, mo.next), mo.t);
      const night = lerpArr(pick(D.night, mo.m), pick(D.night, mo.next), mo.t);
      // 图标染色：主题指定了就用指定的，否则取当前底色的平均色，归一化后和白色混合
      let icon;
      if (black) icon = [1, 1, 1];
      else if (th && th.icon) icon = hexToRgb(th.icon);
      else {
        const c = mix(avg(night), avg(day), ts.day);
        const mx = Math.max(...c, 0.01);
        icon = mix([1, 1, 1], mul(c, 1 / mx), 0.42 + 0.12 * (1 - ts.day));
      }
      const wave = (th && th.wave) || {};
      return {
        day, night, w: D.w, h: D.h, ts, black, icon,
        waveTint: wave.tint ? hexToRgb(wave.tint) : [1, 1, 1],
        waveBright: wave.brightness || 1,
        key: `${(th && th.id) || 'original'}-${mo.m}-${mo.next}-${mo.t.toFixed(3)}-${black}`,
      };
    },
  };
  X.theme = theme;

  // ---------- 着色器 ----------
  const VS_QUAD = `attribute vec2 aP; varying vec2 vUv; void main(){ vUv = aP*0.5+0.5; gl_Position = vec4(aP,0.,1.); }`;
  const FS_BG = `precision highp float; varying vec2 vUv;
    uniform sampler2D tD0, tN0, tD1, tN1; uniform float uDay, uFade, uBlack, uAspect, uTime;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
      vec3 c0 = mix(texture2D(tN0, uv).rgb, texture2D(tD0, uv).rgb, uDay);
      vec3 c1 = mix(texture2D(tN1, uv).rgb, texture2D(tD1, uv).rgb, uDay);
      vec3 col = mix(c0, c1, uFade);
      // 显示端的曝光 / 白电平：比贴图本身暗一点、灰一点
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 0.82) * 0.8;
      // 波浪所在高度的一条很淡的柔光
      float t = 1.0 - vUv.y;
      col += col * 0.12 * exp(-pow((t - 0.55) / 0.2, 2.0));
      float vig = smoothstep(1.5, 0.4, length(vec2((vUv.x - 0.5) * 1.1, (vUv.y - 0.45) * 1.2)));
      col *= mix(0.84, 1.0, vig);
      col = mix(col, vec3(0.0), uBlack);
      col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
      gl_FragColor = vec4(col, 1.0);
    }`;

  const VS_WAVE = `attribute vec2 aUV;
    uniform float uT; uniform vec4 uA, uB, uC; uniform vec2 uBand;
    varying float vR, vS, vDens;
    float cY(float u, float t){ return uA.x + uA.y*sin(1.65*u + 0.21*t + uC.x) + uA.z*sin(3.2*u - 0.29*t + uC.y) + uA.w*u*sin(0.05*t + uC.z); }
    float wF(float u, float t){ return uB.x * (1.0 + uB.y*sin(2.2*u + 0.17*t + uC.z)); }
    float tF(float u, float t){ return uB.z + uB.w*sin(1.8*u - 0.25*t + uC.y) + 0.45*uB.w*sin(3.9*u + 0.33*t + uC.x); }
    void main(){
      float u = mix(-1.18, 1.18, aUV.x);
      float t = uT * uC.w;
      float c = cY(u, t), w = wF(u, t), th = tF(u, t);
      float off = aUV.y - 0.5;
      // 每根线的扭转角略有不同，交叉点会散开，不会全挤成一个尖点
      float k = 1.5 * (0.75 + 0.5 * sin(1.3 * u + 0.19 * t + uC.x));
      float th2 = th + off * k;
      float y = c + off * w * cos(th2);
      float x = u + off * w * sin(th2) * 0.12;
      float dy = w * cos(th2) - off * w * k * sin(th2);
      vDens = 1.0 / max(abs(dy), 0.026);
      vR = aUV.y; vS = aUV.x;
      gl_Position = vec4(x, uBand.y + y * uBand.x, 0.0, 1.0);
    }`;
  const FS_WAVE = `precision highp float;
    varying float vR, vS, vDens; uniform float uBright, uT; uniform vec3 uTint;
    void main(){
      float edge = smoothstep(0.0, 0.16, vR) * smoothstep(1.0, 0.84, vR);
      float ends = smoothstep(0.0, 0.06, vS) * smoothstep(1.0, 0.94, vS);
      float s1 = 0.5 + 0.5*sin(vR*25.1327 + vS*6.0 + uT*0.09);
      float s2 = 0.5 + 0.5*sin(vR*69.115 - vS*9.0 - uT*0.06);
      float s3 = 0.5 + 0.5*sin(vR*150.0 + vS*15.0);
      float strands = 0.42 + 0.36*pow(s1, 2.5) + 0.14*s2 + 0.08*s3;
      float d = vDens * 0.085 * uBright;
      float a = d * strands * edge * ends;
      a = 1.0 - exp(-a);
      gl_FragColor = vec4(uTint * a, a);
    }`;

  const VS_PT = `attribute vec2 aPos; attribute vec4 aD;
    uniform float uScale; varying vec4 vD;
    void main(){ gl_Position = vec4(aPos, 0., 1.); gl_PointSize = max(1.0, aD.x * uScale); vD = aD; }`;
  const FS_PT = `precision highp float; varying vec4 vD;
    void main(){
      vec2 p = gl_PointCoord * 2.0 - 1.0; float r = dot(p, p);
      float a;
      if (vD.x > 7.0) a = smoothstep(1.0, 0.55, r) * 0.55 + exp(-r * 3.0) * 0.25;
      else a = exp(-r * 7.0) + exp(-r * 2.0) * 0.25;
      a *= vD.y; if (a < 0.002) discard;
      vec3 c = vec3(1.0);
      if (vD.z > 2.5) c = vec3(1.0, 0.97, 0.82); else if (vD.z > 1.5) c = vec3(1.0, 0.86, 0.95); else if (vD.z > 0.5) c = vec3(0.82, 0.93, 1.0);
      gl_FragColor = vec4(c * a, a);
    }`;

  const FS_BLUR = `precision mediump float; varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir;
    void main(){
      vec4 c = texture2D(uTex, vUv) * 0.227027;
      c += (texture2D(uTex, vUv + uDir * 1.3846) + texture2D(uTex, vUv - uDir * 1.3846)) * 0.316216;
      c += (texture2D(uTex, vUv + uDir * 3.2308) + texture2D(uTex, vUv - uDir * 3.2308)) * 0.07027;
      gl_FragColor = c;
    }`;
  const FS_COPY = `precision mediump float; varying vec2 vUv; uniform sampler2D uTex; uniform float uK;
    void main(){ gl_FragColor = texture2D(uTex, vUv) * uK; }`;

  // 两条主丝带 + 一层很淡的宽丝带（参数：A=中线 y0/振幅1/振幅2/倾斜，B=宽度/宽度变化/扭转/扭转幅度，C=相位×3/速度）
  const RIBBONS = [
    { A: [-0.04, 0.16, 0.06, 0.1], B: [0.4, 0.32, 0.95, 1.05], C: [0.0, 1.3, 2.1, 1.0], bright: 1.0 },
    { A: [-0.1, 0.13, 0.07, -0.06], B: [0.28, 0.3, 1.25, 1.2], C: [2.4, 0.4, 4.0, 0.86], bright: 0.8 },
    { A: [-0.02, 0.19, 0.04, 0.08], B: [0.62, 0.2, 0.35, 0.4], C: [1.1, 2.6, 0.7, 0.7], bright: 0.42 },
  ];
  const cYjs = (r, u, t) => {
    const [a0, a1, a2, a3] = r.A, [p1, p2, p3] = r.C;
    t *= r.C[3];
    return a0 + a1 * Math.sin(1.65 * u + 0.21 * t + p1) + a2 * Math.sin(3.2 * u - 0.29 * t + p2) + a3 * u * Math.sin(0.05 * t + p3);
  };

  function compile(gl, vs, fs) {
    const mk = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }

  class Background {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = (this.gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false }));
      if (!gl) throw new Error('WebGL unavailable');
      this.bgP = compile(gl, VS_QUAD, FS_BG);
      this.waveP = compile(gl, VS_WAVE, FS_WAVE);
      this.ptP = compile(gl, VS_PT, FS_PT);
      this.blurP = compile(gl, VS_QUAD, FS_BLUR);
      this.copyP = compile(gl, VS_QUAD, FS_COPY);

      this.quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

      // 丝带网格
      const NS = 420, NR = 36;
      const v = [];
      for (let i = 0; i <= NS; i++) for (let j = 0; j <= NR; j++) v.push(i / NS, j / NR);
      const idx = [];
      for (let i = 0; i < NS; i++)
        for (let j = 0; j < NR; j++) {
          const a = i * (NR + 1) + j, b = a + NR + 1;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      this.meshV = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.meshV);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
      this.meshI = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshI);
      this.idxType = gl.getExtension('OES_element_index_uint') ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.idxType === gl.UNSIGNED_INT ? new Uint32Array(idx) : new Uint16Array(idx), gl.STATIC_DRAW);
      this.idxCount = idx.length;

      // 粒子
      this.N = 400;
      this.pts = [];
      this.ptData = new Float32Array(this.N * 6);
      this.ptBuf = gl.createBuffer();
      this.wind = [0, 0];
      this.t = 0;
      for (let i = 0; i < this.N; i++) this.pts.push(this.spawn({}, true));

      // 底色贴图：0 = 上一个主题，1 = 当前主题，换主题时交叉淡入
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      this.tex = { d0: this.mkTex(), n0: this.mkTex(), d1: this.mkTex(), n1: this.mkTex() };
      this.day = this.dayTarget = 1;
      this.fade = 1;
      this.blackAmt = this.blackTarget = 0;
      this.themeKey = '';
      this.band = [1, 0];
      this.waveTint = [1, 1, 1];
      this.waveBright = 1;
      this.energy = this.energyT = 0;
      this.wave = true;
      this.waveAlpha = 1;
      this.fbos = [];
      this.resize();
      addEventListener('resize', () => this.resize());
    }

    makeFBO(w, h) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, fb, w, h };
    }

    resize() {
      const gl = this.gl;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(innerWidth * dpr);
      this.canvas.height = Math.round(innerHeight * dpr);
      for (const f of this.fbos) {
        gl.deleteTexture(f.tex);
        gl.deleteFramebuffer(f.fb);
      }
      const bw = Math.max(64, Math.round(innerWidth / 4)), bh = Math.max(36, Math.round(innerHeight / 4));
      this.fbos = [this.makeFBO(bw, bh), this.makeFBO(bw, bh)];
    }

    mkTex() {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3));
      return t;
    }
    upload(t, arr, w, h) {
      const gl = this.gl;
      const u8 = new Uint8Array(arr.length);
      for (let i = 0; i < arr.length; i++) u8[i] = Math.round(clamp(arr[i], 0, 1) * 255);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0, gl.RGB, gl.UNSIGNED_BYTE, u8);
    }

    setTheme(th) {
      this.waveTint = th.waveTint || [1, 1, 1];
      this.waveBright = th.waveBright || 1;
      this.dayTarget = th.ts.day;
      this.blackTarget = th.black ? 1 : 0;
      this.black = th.black;
      this.wave = th.wave !== false;
      if (th.key === this.themeKey) return;
      const T = this.tex;
      [T.d0, T.d1] = [T.d1, T.d0];
      [T.n0, T.n1] = [T.n1, T.n0];
      this.upload(T.d1, th.day, th.w, th.h);
      this.upload(T.n1, th.night, th.w, th.h);
      this.fade = this.themeKey ? 0 : 1;
      this.themeKey = th.key;
    }
    snap() {
      this.day = this.dayTarget;
      this.fade = 1;
      this.blackAmt = this.blackTarget;
    }

    // 窄屏时 XMB 主体不在正中，波浪跟着它走：scale = 主体高度 / 屏幕高度，offset = 主体中心（裁剪空间）
    setBand(scale, offset) {
      this.band = [scale, offset];
    }

    // 音乐律动（0–1）：波浪变亮、闪光更活跃
    setEnergy(e) {
      this.energyT = Math.max(0, Math.min(1, e || 0));
    }

    // 光标移动时粒子往反方向“甩”
    impulse(dx, dy) {
      this.wind[0] += dx;
      this.wind[1] += dy;
    }

    spawn(p, initial) {
      const r = Math.random();
      p.x = -1.15 + Math.random() * 2.3;
      const rib = RIBBONS[Math.random() < 0.7 ? 0 : 1];
      const cy = cYjs(rib, p.x, this.t || 0);
      const g = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      p.y = Math.random() < 0.85 ? cy + g * 0.34 : -1 + Math.random() * 2;
      p.vx = 0.006 + Math.random() * 0.018;
      p.vy = (Math.random() - 0.45) * 0.01;
      p.life = 0;
      p.max = 6 + Math.random() * 12;
      if (initial) p.life = Math.random() * p.max;
      p.size = r < 0.04 ? 8 + Math.random() * 10 : r < 0.24 ? 2.6 + Math.random() * 1.8 : 1.2 + Math.random() * 1.2;
      p.bright = p.size > 7 ? 0.08 + Math.random() * 0.1 : 0.5 + Math.random() * 0.5;
      p.tint = Math.random() < 0.55 ? 0 : 1 + Math.floor(Math.random() * 3);
      p.tw = Math.random() * 6.28;
      p.tws = 0.6 + Math.random() * 2.5;
      return p;
    }

    step(dt) {
      this.t += dt;
      const k = 1 - Math.exp(-dt * 3.0);
      this.day += (this.dayTarget - this.day) * k;
      this.blackAmt += (this.blackTarget - this.blackAmt) * k;
      this.fade = Math.min(1, this.fade + dt / 0.9);
      this.energy += (this.energyT - this.energy) * (1 - Math.exp(-dt * 10));
      this.waveAlpha += ((this.wave ? 1 : 0) - this.waveAlpha) * k;
      const wd = Math.exp(-dt * 2.2);
      this.wind[0] *= wd;
      this.wind[1] *= wd;
      const asp = innerWidth / innerHeight;
      for (let i = 0; i < this.N; i++) {
        const p = this.pts[i];
        p.life += dt;
        if (p.life > p.max || p.x > 1.25 || p.x < -1.25 || p.y > 1.2 || p.y < -1.2) this.spawn(p, false);
        p.vx = clamp(p.vx + (Math.random() - 0.5) * 0.0002 * dt * 60, -0.02, 0.04);
        p.vy = clamp(p.vy + (Math.random() - 0.5) * 0.0002 * dt * 60, -0.02, 0.02);
        const depth = p.size > 7 ? 1.6 : p.size > 2.3 ? 1.15 : 0.8;
        p.x += (p.vx + this.wind[0] * depth) * dt;
        p.y += (p.vy + this.wind[1] * depth * asp * 0.5) * dt;
        const fade = Math.min(1, p.life / 1.5, (p.max - p.life) / 1.5);
        const tw = 0.65 + 0.35 * Math.sin(this.t * p.tws + p.tw);
        const o = i * 6;
        this.ptData[o] = p.x;
        this.ptData[o + 1] = p.y;
        this.ptData[o + 2] = p.size;
        this.ptData[o + 3] = Math.max(0, fade) * p.bright * tw * this.waveAlpha * (this.black ? 1.25 : 1) * (1 + this.energy * 1.4);
        this.ptData[o + 4] = p.tint;
        this.ptData[o + 5] = 0;
      }
    }

    quadAttr(prog) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      const a = gl.getAttribLocation(prog.p, 'aP');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      return a;
    }

    drawWaves() {
      const gl = this.gl;
      if (this.waveAlpha < 0.01) return;
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
      gl.useProgram(this.waveP.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.meshV);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshI);
      const aUV = gl.getAttribLocation(this.waveP.p, 'aUV');
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(this.waveP.u.uT, this.t);
      gl.uniform2f(this.waveP.u.uBand, this.band[0], this.band[1]);
      gl.uniform3fv(this.waveP.u.uTint, this.waveTint);
      const k = this.black ? 0.75 : 1;
      for (const r of RIBBONS) {
        gl.uniform4fv(this.waveP.u.uA, r.A);
        gl.uniform4fv(this.waveP.u.uB, r.B);
        gl.uniform4fv(this.waveP.u.uC, r.C);
        gl.uniform1f(this.waveP.u.uBright, r.bright * this.waveAlpha * k * this.waveBright * (0.72 + 0.28 * this.day) * (1 + this.energy * 0.9));
        gl.drawElements(gl.TRIANGLES, this.idxCount, this.idxType, 0);
      }
      gl.disableVertexAttribArray(aUV);
    }

    drawParticles(h) {
      const gl = this.gl;
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.ptP.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
      const aPos = gl.getAttribLocation(this.ptP.p, 'aPos');
      const aD = gl.getAttribLocation(this.ptP.p, 'aD');
      gl.enableVertexAttribArray(aPos);
      gl.enableVertexAttribArray(aD);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(aD, 4, gl.FLOAT, false, 24, 8);
      gl.uniform1f(this.ptP.u.uScale, h / 720);
      gl.drawArrays(gl.POINTS, 0, this.N);
      gl.disableVertexAttribArray(aPos);
      gl.disableVertexAttribArray(aD);
    }

    blur(src, dst, dx, dy) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, dst.w, dst.h);
      gl.disable(gl.BLEND);
      gl.useProgram(this.blurP.p);
      const a = this.quadAttr(this.blurP);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(this.blurP.u.uTex, 0);
      gl.uniform2f(this.blurP.u.uDir, dx / src.w, dy / src.h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(a);
    }

    render(dt) {
      const gl = this.gl;
      this.step(Math.min(dt, 0.05));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.ptBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.ptData, gl.DYNAMIC_DRAW);
      gl.disable(gl.DEPTH_TEST);
      const W = this.canvas.width, H = this.canvas.height;
      const [A, B] = this.fbos;

      // 1) 泛光源：低分辨率画一遍丝带和粒子，再模糊
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb);
      gl.viewport(0, 0, A.w, A.h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      this.drawWaves();
      this.drawParticles(A.h * 1.6);
      this.blur(A, B, 1, 0);
      this.blur(B, A, 0, 1);
      this.blur(A, B, 2.2, 0);
      this.blur(B, A, 0, 2.2);

      // 2) 正式画面
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.disable(gl.BLEND);
      gl.useProgram(this.bgP.p);
      let a = this.quadAttr(this.bgP);
      const T = this.tex;
      [T.d0, T.n0, T.d1, T.n1].forEach((tx, i) => {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, tx);
      });
      gl.uniform1i(this.bgP.u.tD0, 0);
      gl.uniform1i(this.bgP.u.tN0, 1);
      gl.uniform1i(this.bgP.u.tD1, 2);
      gl.uniform1i(this.bgP.u.tN1, 3);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(this.bgP.u.uDay, this.day);
      gl.uniform1f(this.bgP.u.uFade, this.fade);
      gl.uniform1f(this.bgP.u.uBlack, this.blackAmt);
      gl.uniform1f(this.bgP.u.uAspect, W / H);
      gl.uniform1f(this.bgP.u.uTime, this.t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(a);

      gl.enable(gl.BLEND);
      this.drawWaves();
      this.drawParticles(H);

      // 3) 叠加泛光
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
      gl.useProgram(this.copyP.p);
      a = this.quadAttr(this.copyP);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, A.tex);
      gl.uniform1i(this.copyP.u.uTex, 0);
      gl.uniform1f(this.copyP.u.uK, 0.9);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disableVertexAttribArray(a);
    }
  }

  X.Background = Background;
})();
