from pathlib import Path
import hashlib,json,re,shutil,subprocess,tempfile,zipfile
ROOT=Path(__file__).resolve().parent
VERSION=json.loads((ROOT/'package.json').read_text())['version']
SRC=ROOT/"source"; OUT=ROOT/"package"
raw=(SRC/'content/data.js').read_text();data=json.loads(raw.split('XMB.content = ',1)[1].strip().rstrip(';'))
refs=set()
def collect(v):
 if isinstance(v,dict):
  for x in v.values():collect(x)
 elif isinstance(v,list):
  for x in v:collect(x)
 elif isinstance(v,str) and v.startswith('content/media/'):refs.add(v)
collect(data)
if OUT.exists():shutil.rmtree(OUT)
OUT.mkdir(exist_ok=True)
for ref in sorted(refs):
 source=SRC/ref;dest=OUT/ref;assert source.is_file(),ref
 dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest)
# Self-contained visual themes are loaded lazily in an isolated frame.
shutil.copytree(SRC/'themes/effects', OUT/'themes/effects')
shutil.copytree(SRC/'themes/thumbnails', OUT/'themes/thumbnails')
html=(SRC/'index.html').read_text();scripts=re.findall(r'<script src="([^"]+)"[^>]*></script>',html)
manifest=re.findall(r"'([^']+\.js)'",(SRC/'plugins/plugins.js').read_text());parts=[]
for name in scripts:
 if name not in ('plugins/plugins.js','js/boot.js'):parts.append((SRC/name).read_text())
for name in manifest:
 parts.append('XMB.content='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';' if name=='content/data.js' else (SRC/name).read_text())
parts.append('XMB.manifest=[];\n'+(SRC/'js/boot.js').read_text())
with tempfile.TemporaryDirectory() as temp:
 combined=Path(temp)/'combined.js';mini=Path(temp)/'app.js';combined.write_text('\n;\n'.join(parts))
 subprocess.run(['node',str(ROOT/'node_modules/terser/bin/terser'),str(combined),'--compress','--mangle','--output',str(mini)],check=True)
 code=mini.read_bytes()
styles=re.findall(r'<link rel="stylesheet" href="([^"]+)">',html)
css=b'\n'.join((SRC/name).read_bytes() for name in styles)
assets=OUT/'assets'
if assets.exists():shutil.rmtree(assets)
assets.mkdir()
jsname='app.'+hashlib.sha256(code).hexdigest()[:12]+'.js';cssname='xmb.'+hashlib.sha256(css).hexdigest()[:12]+'.css'
(assets/jsname).write_bytes(code);(assets/cssname).write_bytes(css)
html=re.sub(r'<script src="[^"]+"[^>]*></script>\s*','',html)
html=re.sub(r'<link rel="stylesheet" href="[^"]+">','',html)
html=html.replace('</head>',f'<link rel="stylesheet" href="assets/{cssname}"></head>').replace('</body>',f'<script defer src="assets/{jsname}"></script>\n</body>')
(OUT/'index.html').write_text(html)
subprocess.run(['node','--check',str(assets/jsname)],check=True)
visuals=sorted((OUT/'themes/effects').rglob('*.html'))
for visual in visuals:
 for ref in re.findall(r'''['"](assets/[^'"]+)['"]''',visual.read_text()):
  assert (visual.parent/ref).is_file(),ref
 for script in re.findall(r'<script[^>]*>(.*?)</script>',visual.read_text(),re.S):
  subprocess.run(['node','--check'],input=script,text=True,check=True)
for name in manifest:
 for ref in re.findall(r"visualThemes\.register\([^,]+,\s*'([^']+)'",(SRC/name).read_text()):
  assert (OUT/ref).is_file(),ref
for source in [SRC/'js/xmb.js', *(SRC/name for name in manifest)]:
 for ref in re.findall(r'themes/thumbnails/[a-zA-Z0-9-]+\.(?:png|webp|svg)', source.read_text()):
  assert (OUT/ref).is_file(),ref
release={'version':VERSION,'content_sha256':hashlib.sha256(raw.encode()).hexdigest(),'js':jsname,'css':cssname}
(OUT/'version.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')
archive=ROOT/'gloria-xmb-cotton-v2.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in sorted(OUT.rglob('*')):
  if f.is_file():z.write(f,str(f.relative_to(OUT)))
report={'version':VERSION,'package':str(OUT),'zip':str(archive),'zip_bytes':archive.stat().st_size,'bytes':sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file()),'games':len(data['games']),'photos':sum(len(a['items']) for a in data['photos']['albums']),'videos':sum(len(g['items']) for g in data['videos']['groups']),'media_files':len(refs),'visual_themes':[str(p.relative_to(OUT)) for p in visuals],'js':jsname,'css':cssname,'local_references_verified':True}
(ROOT/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
