# Builds the offline bake renderer from the authorized Shadertoy JSON export and noise texture.
from pathlib import Path
import json,base64,sys
root=Path(__file__).resolve().parent.parent
a=json.loads((root/'references/shadertoy/t3sXW8.json').read_text())[0]
parts={p['type']:p['code'] for p in a['renderpass']}
noise='data:image/png;base64,'+base64.b64encode((root/'references/shadertoy/noise.png').read_bytes()).decode()
header='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>蓝色体积云 · liuma test</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#142a51}canvas{display:block;width:100%;height:100%}</style><canvas aria-label="蓝色体积云动态背景"></canvas><script>
// liuma test by seasnake: https://www.shadertoy.com/view/t3sXW8
// Fork of Volumetric lighting by tmst: https://www.shadertoy.com/view/tdjBR1
// Common / Cube A / Image shader bodies below are preserved verbatim.
'''
# --live builds the launcher renderer; default retains the original offline reference.
live = '--live' in sys.argv
if live:
    common=parts['common'].replace('128.0','64.0').replace('1024.0','512.0')
    common=common.replace('#define CAM_THETA (0.2*iTime)','#define CAM_THETA 0.62')
    common=common.replace('t += 32.0;', 'lmn *= 127.0/63.0; // preserve the original world-space noise scale\n    t += 32.0;')
    common=common.replace('#define RAY_STEP 0.025','#define RAY_STEP 0.035').replace('#define RAY_STEP_L 0.025','#define RAY_STEP_L 0.055')
    parts['common']=common
    parts['image']=parts['image'].replace('vec2 uv = fragCoord / iResolution.xy;', 'vec2 screen = fragCoord / iResolution.xy;\n    float aspect = iResolution.x / iResolution.y;\n    float shapeZoom = 1.55 / min(1.0, aspect);\n    vec2 center = aspect >= 1.0 ? vec2(.63, .51) : vec2(.52, .47);\n    vec2 uv = (screen - center) * shapeZoom + .5;')
    parts['image']=parts['image'].replace('fragColor = vec4(vignetteFactor * finalColor, 1.0);', 'float menuVeil = mix(.65, 1.0, smoothstep(.12, .75, screen.x));\n    fragColor = vec4(vignetteFactor * finalColor * menuVeil, 1.0);')
    header=header.replace('shader bodies below are preserved verbatim.', 'shaders adapted: fixed camera, 64 cubed volume, contained silhouette.')
code='\n'.join('const '+k+' = '+json.dumps(v,ensure_ascii=False)+';' for k,v in {'COMMON':parts['common'],'CUBE':parts['cubemap'],'IMAGE':parts['image'],'NOISE':noise}.items())
runtime=r'''
(() => {
'use strict';
const embedded = new URLSearchParams(location.search).has('theme');
const canvas = document.querySelector('canvas');
let gl, stopped = false, ready = false, raf = 0, paused = embedded, reduced = new URLSearchParams(location.search).has('bake') || matchMedia('(prefers-reduced-motion: reduce)').matches;
let time = 3.1, last = 0, lastVolume = -1, frameCount = 5, front = 0, lastDrawTime = 3.1;
const notify = type => { if (embedded) parent.postMessage({type},location.origin); };
function fail(error) { stopped=true;cancelAnimationFrame(raf);console.error(error);notify('xmb-visual-error'); }
function schedule() { if (!raf && !stopped) raf=requestAnimationFrame(frame); }
function program(body, cube) {
 const vs = '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}';
 const uniforms = '#version 300 es\nprecision highp float;precision highp int;precision highp samplerCube;\nuniform vec3 iResolution;uniform float iTime;uniform int iFrame;uniform vec4 iMouse;uniform samplerCube iChannel0;uniform sampler2D iChannel1;uniform sampler2D iChannel2;uniform int uFace;out vec4 outColor;\n';
 // OpenGL cube face direction, matching texture(samplerCube, direction).
 const cubeMain = `void main(){vec2 p=gl_FragCoord.xy/iResolution.xy*2.-1.;vec3 d;
 if(uFace==0)d=vec3(1.,-p.y,-p.x);else if(uFace==1)d=vec3(-1.,-p.y,p.x);
 else if(uFace==2)d=vec3(p.x,1.,p.y);else if(uFace==3)d=vec3(p.x,-1.,-p.y);
 else if(uFace==4)d=vec3(p.x,-p.y,1.);else d=vec3(-p.x,-p.y,-1.);
 mainCubemap(outColor,gl_FragCoord.xy,vec3(0.),d);}`;
 if (new URLSearchParams(location.search).has('bake') && !cube) body = body.replace('vec2 uv = fragCoord / iResolution.xy;', 'vec2 uv = (fragCoord / iResolution.xy - .5) * 1.3 + .5;');
 const fs = uniforms+COMMON+'\n'+body+'\n'+(cube ? cubeMain : 'void main(){mainImage(outColor,gl_FragCoord.xy);}');
 const p=gl.createProgram();
 for(const [type,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]) {
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
  gl.attachShader(p,s);gl.deleteShader(s);
 }
 gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
 const u={};for(const n of ['iResolution','iTime','iFrame','iMouse','iChannel0','iChannel1','iChannel2','uFace'])u[n]=gl.getUniformLocation(p,n);
 return {p,u};
}
let programs,cubes,fbo,noise,keyboard;
function bind(p,w,h) {
 gl.useProgram(p.p);gl.uniform3f(p.u.iResolution,w,h,1);gl.uniform1f(p.u.iTime,time);gl.uniform1i(p.u.iFrame,frameCount);
 gl.uniform4f(p.u.iMouse,0,0,0,0);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubes[front]);gl.uniform1i(p.u.iChannel0,0);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,noise);gl.uniform1i(p.u.iChannel1,1);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,keyboard);gl.uniform1i(p.u.iChannel2,2);
}
function makeCube() {
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_CUBE_MAP,tex);
 for(let face=0;face<6;face++)gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+face,0,gl.RGBA16F,1024,1024,0,gl.RGBA,gl.HALF_FLOAT,null);
 for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_CUBE_MAP,p,gl.NEAREST);
 for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R])gl.texParameteri(gl.TEXTURE_CUBE_MAP,p,gl.CLAMP_TO_EDGE);
 return tex;
}
function updateVolume() {
 const next=1-front;gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,1024,1024);
 bind(programs.cube,1024,1024);
 // Only the density and lighting pages are used (faces ±X and ±Y).
 for(let face=0;face<4;face++) {
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_CUBE_MAP_POSITIVE_X+face,cubes[next],0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Volume framebuffer unavailable');
  gl.uniform1i(programs.cube.u.uFace,face);gl.drawArrays(gl.TRIANGLES,0,3);
 }
 front=next;frameCount++;
}
function size() {
 const scale=Math.min(1,768/innerWidth,768/innerHeight);
 const w=Math.max(2,Math.round(innerWidth*scale)),h=Math.max(2,Math.round(innerHeight*scale));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
}
function render() {
 size();
 // Keep the original 128³ voxel grid; background volume updates at 15 Hz.
 if(!ready || time-lastVolume>=.55/15){updateVolume();lastVolume=time;}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
 bind(programs.image,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,3);
 lastDrawTime=time;
 if(!ready){ready=true;notify('xmb-visual-ready');}
}
function frame(now) {
 raf=0;if(stopped||paused||document.hidden)return;
 if(last&&now-last<32){schedule();return;}
 const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
 if(!reduced)time+=dt*.55;
 try{render();}catch(e){fail(e);return;}
 if(!reduced)schedule();
}
addEventListener('message',e=>{
 if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='xmb-visual-state')return;
 paused=!!e.data.paused;reduced=!!e.data.reduced;last=0;
 if(paused){cancelAnimationFrame(raf);raf=0;}else if(programs)schedule();
});
addEventListener('resize',()=>{if(programs&&!paused)schedule();});
document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden&&!paused&&programs)schedule();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL context lost'));});
async function boot(){
 gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
 if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw new Error('WebGL2 floating-point framebuffer required');
 const img=new Image();img.src=NOISE;await img.decode();
 programs={cube:program(CUBE,true),image:program(IMAGE,false)};
 cubes=[makeCube(),makeCube()];fbo=gl.createFramebuffer();
 noise=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,noise);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
 for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
 for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.REPEAT);
 keyboard=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,keyboard);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,256,3,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array(256*3));
 for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);
 // First populate density only, so the light pass never traces uninitialized data.
 bind(programs.cube,1024,1024);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,1024,1024);
 for(let face=0;face<2;face++){
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_CUBE_MAP_POSITIVE_X+face,cubes[1],0);
  gl.uniform1i(programs.cube.u.uFace,face);gl.drawArrays(gl.TRIANGLES,0,3);
 }
 front=1;
 notify('xmb-visual-loaded');if(!embedded)schedule();
}
boot().catch(fail);
})();
</script></html>
'''
# Runtime JS strings need JS newline escapes rather than a literal escaped backslash.
runtime=runtime.replace('\\\\n','\\n')
if live:
    runtime=runtime.replace('1024','512')
    runtime=runtime.replace('for(let face=0;face<4;face++)', 'for(const face of [0,2])')
    runtime=runtime.replace('for(let face=0;face<2;face++)', 'for(const face of [0])')
    runtime=runtime.replace('// Only the density and lighting pages are used (faces ±X and ±Y).', '// A 64 cubed page fits one 512 square face: +X density and +Y lighting.')
    runtime=runtime.replace('const scale=Math.min(1,768/innerWidth,768/innerHeight);', 'const mobile=innerWidth<700;\n const scale=Math.min(1,(mobile?360:768)/innerWidth,(mobile?640:432)/innerHeight);')
    runtime=runtime.replace('// Keep the original 128³ voxel grid; background volume updates at 15 Hz.', '// Recompute real density and lighting each rendered frame at 64 cubed resolution.')
    runtime=runtime.replace('if(!ready || time-lastVolume>=.55/15)', 'if(!ready || time!==lastVolume)')
    runtime=runtime.replace('now-last<32', 'now-last<(innerWidth<700?60:40)').replace('time+=dt*.55', 'time+=dt*.9')
    (root/'source/themes/effects/liuma-cloud.html').write_text(header+code+runtime)
else:
    (root/'references/shadertoy/render.html').write_text(header+code+runtime)
