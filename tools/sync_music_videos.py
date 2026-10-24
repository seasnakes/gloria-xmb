"""Refresh the requested public playlist and newer published videos; preserve existing content."""
from pathlib import Path
import urllib.request,json,subprocess,concurrent.futures,tempfile
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'source';P=SRC/'content/data.js'
HEAD={'User-Agent':'Mozilla/5.0','Referer':'https://music.163.com/'}
def fetch(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers=HEAD),timeout=25)
def cover(url,dest):
 dest=SRC/dest;dest.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile(suffix='.jpg') as f:
  f.write(fetch(url.replace('http://','https://')).read());f.flush()
  subprocess.run(['cwebp','-quiet','-resize','480','0','-q','78',f.name,'-o',str(dest)],check=True)
def song(s):
 sid=s['id'];url=f'https://music.163.com/song/media/outer/url?id={sid}.mp3'
 with fetch(url) as response:available=response.headers.get('Content-Type','').startswith('audio/')
 path=f'content/media/music/{sid}.webp';cover(s['al']['picUrl']+'?param=480y480',path)
 return dict(id=sid,title=s['name'],artist=' / '.join(a['name'] for a in s['ar']),album=s['al']['name'],duration=round(s['dt']/1000),cover=path,bg=path,bgBlur=True,audio=url if available else None,url=f'https://music.163.com/song?id={sid}',externalOnly=not available,start=0,end=None,lyrics=None)
def video(v):
 url='https://api.bilibili.com/x/web-interface/view?bvid='+v['bvid']
 d=json.load(fetch(url));assert d['code']==0,d;d=d['data']
 path=f"content/media/video/{v['bvid']}.webp";cover(d['pic']+'@640w_360h_1c.jpg',path)
 return dict(bvid=v['bvid'],title=d['title'],cover=path,duration=d['duration'],pubdate=d['pubdate'],owner=d['owner']['name'],views=d['stat']['view'],desc=d.get('desc','')[:200])
def main():
 data=json.loads(P.read_text().split('XMB.content = ',1)[1].strip().rstrip(';'))
 playlist=json.load(fetch('https://music.163.com/api/v6/playlist/detail?id=18506316853&n=1000'))['playlist']
 assert len(playlist['tracks'])==playlist['trackCount'],'Incomplete playlist'
 latest=json.loads(subprocess.check_output(['/Users/seasnake/.local/bin/toy','video','mine','--size','50','--json']))['list']
 group=next(g for g in data['videos']['groups'] if g['name']=='我的投稿');cutoff=max(v['pubdate'] for v in group['items']);known={v['bvid'] for v in group['items']}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  tracks=list(pool.map(song,playlist['tracks']))
  added=list(pool.map(video,[v for v in latest if v['publishTime']>cutoff and v['bvid'] not in known]))
 data['music']['groups']=[dict(name=playlist['name'],en='GLORIA Playlist',playlistId=playlist['id'],url='https://music.163.com/playlist?id=18506316853',items=tracks)]+[g for g in data['music']['groups'] if g.get('playlistId')!=playlist['id']]
 group['items']=sorted(group['items']+added,key=lambda v:v['pubdate'],reverse=True)
 backup=ROOT/'before-playlist-data.js'
 if not backup.exists():backup.write_text(P.read_text())
 P.write_text('XMB.content = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
 report=dict(tracks=len(tracks),externalOnly=[t['title'] for t in tracks if t['externalOnly']],newVideos=[v['title'] for v in added],videoCount=len(group['items']))
 (ROOT/'content-sync-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
