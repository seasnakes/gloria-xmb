from pathlib import Path
import json,subprocess,concurrent.futures,shutil
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'source'; MEDIA=SRC/'content/media/worlds';MEDIA.mkdir(parents=True,exist_ok=True)
GEN=Path('/Users/seasnake/.codex/generated_images/01a162df-539b-77a0-ad8b-850b6899f979')
# Ordered for the new launcher; source offsets are from the approved v4 timeline.
rows=[
('ds','饥荒',"Don't Starve",14,'森林、营火与黑暗中的生存','Forest, campfire and survival','5ff7de77-38bd-453b-bfea-e71b4164efce'),
('life','人森 · 梦想生活','Tomodachi Life',6,'朋友收集 · 梦想生活｜生活模拟片段','Living the Dream · life simulation','937babc9-1b7e-426a-9c56-af3ddbfa8032'),
('dbh','底特律：变人','Detroit: Become Human',70,'雨夜重建、选择与觉醒','Reconstruction, choice and awakening','811b661d-58dc-41bc-82cc-e6115c128889'),
('p5','女神异闻录 5','Persona 5',54,'预告信、觉醒与总攻击','Calling card, awakening and all-out attack','3f334453-0aeb-4a11-b667-bd191836c1b0'),
('ut','传说之下','Undertale',22,'像素灵魂，为单调上色','A pixel soul brings color to the world','cf7e9834-399a-4af6-a4d7-0a1cf9dd51f4'),
('dr','弹丸论破','Danganronpa',30,'无休止议论与「不对！」','Nonstop debate and a decisive objection','0ff54b9f-b7fc-4447-b2d4-ad9d08d39192'),
('mc','我的世界','Minecraft',38,'樱花林、彩虹羊毛与创造','Cherry blossoms, rainbow wool and creation','e4f01c09-1604-4eb4-972c-0665ee23015f'),
('mv','纪念碑谷','Monument Valley',46,'不可能之塔与三角光柱','Impossible towers and a prism of light','d9d38197-5407-40d4-9842-83c905241223'),
('gr','重力异想世界','Gravity Rush',62,'浮空城、漫画与重力踢','Floating cities, comic panels and gravity','12099291-d1aa-4a5d-b76d-f098ef8fb7e8'),
('mgs','合金装备','Metal Gear Solid',78,'Codec 来电与和平行者式动态漫画','Codec calls and a motion comic','8f89bb56-6da7-49bd-af69-5b068c5b35de')]
MASTER='/Users/seasnake/gloria/mv/out/GLORIA_多元宇宙_1080p60_v4.mp4'
def run(args):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=True)
def job(row):
 id,zh,en,start,desc,desc_en,uid=row
 image=GEN/f'exec-{uid}.png'
 for name,w,q in [('cover',1280,80),('thumb',384,76),('mobile',720,78)]:
  subprocess.run(['cwebp','-quiet','-resize',str(w),'0','-q',str(q),str(image),'-o',str(MEDIA/f'{id}-{name}.webp')],check=True)
 run(['-ss',str(start),'-i',MASTER,'-t','8','-vf','scale=960:540,fps=24','-c:v','libx264','-preset','fast','-crf','29','-maxrate','1100k','-bufsize','1600k','-pix_fmt','yuv420p','-c:a','aac','-b:a','80k','-movflags','+faststart',str(MEDIA/f'{id}.mp4')])
 run(['-ss','0.5','-i',str(MEDIA/f'{id}.mp4'),'-t','6','-vf','scale=480:270,fps=24','-c:v','libx264','-preset','fast','-crf','30','-maxrate','350k','-bufsize','500k','-pix_fmt','yuv420p','-c:a','aac','-b:a','64k','-movflags','+faststart',str(MEDIA/f'{id}-preview.mp4')])
 return dict(id=id,title=zh,en=en,desc=desc,descEn=desc_en,sourceStart=start,duration=8,kind='simulation',thumb=f'content/media/worlds/{id}-thumb.webp',bg=f'content/media/worlds/{id}-cover.webp',bgMobile=f'content/media/worlds/{id}-mobile.webp',preview=f'content/media/worlds/{id}-preview.mp4',clip=f'content/media/worlds/{id}.mp4',url=f'content/media/worlds/{id}.mp4',artSource=str(image))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:games=list(pool.map(job,rows))
p=SRC/'content/data.js';data=json.loads(p.read_text().split('XMB.content = ',1)[1].strip().rstrip(';'))
if 'tools' not in data:data['tools']=data['games']
data['games']=[{k:v for k,v in g.items() if k!='artSource'} for g in games]
for tool in data['tools']:
 for key in ('bg','preview','bgMobile'):tool.pop(key,None)
cotton=SRC/'content/media/cotton';cotton.mkdir(exist_ok=True)
frames='/Users/seasnake/gloria/fomo/ui/assets/wallfx_v4/f%05d.jpg'
# A slow, seamless ping-pong of the actual daylight cotton fluid frames.
run(['-framerate','30','-start_number','1831','-i',frames,'-filter_complex','[0:v]trim=duration=4,setpts=PTS-STARTPTS,scale=960:540,fps=15,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]','-map','[v]','-an','-c:v','libx264','-preset','fast','-crf','29','-pix_fmt','yuv420p','-movflags','+faststart',str(cotton/'loop.mp4')])
subprocess.run(['cwebp','-quiet','-resize','960','0','-q','82','/Users/seasnake/gloria/fomo/ui/assets/wallfx_v4/f01831.jpg','-o',str(cotton/'poster.webp')],check=True)
data['cotton']={'video':'content/media/cotton/loop.mp4','poster':'content/media/cotton/poster.webp'}
p.write_text('XMB.content = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
(ROOT/'media-manifest.json').write_text(json.dumps({'master':MASTER,'games':games,'cotton_source':frames},ensure_ascii=False,indent=2))
print('Prepared',len(games),'simulation worlds')
