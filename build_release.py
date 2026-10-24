from pathlib import Path
import hashlib,json,re,shutil,subprocess,tempfile,zipfile
ROOT=Path(__file__).resolve().parent
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
html=(SRC/'index.html').read_text();scripts=re.findall(r'<script src="([^"]+)"[^>]*></script>',html)
manifest=re.findall(r"'([^']+\.js)'",(SRC/'plugins/plugins.js').read_text());parts=[]
for name in scripts:
 if name not in ('plugins/plugins.js','js/boot.js'):parts.append((SRC/name).read_text())
for name in manifest:
 parts.append('XMB.content='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';' if name=='content/data.js' else (SRC/name).read_text())
parts.append('XMB.manifest=[];\n'+(SRC/'js/boot.js').read_text())
with tempfile.TemporaryDirectory() as temp:
 combined=Path(temp)/'combined.js';mini=Path(temp)/'app.js';combined.write_text('\n;\n'.join(parts))
 subprocess.run(['node','/Users/seasnake/.npm/_npx/acafc2464b6ed592/node_modules/terser/bin/terser',str(combined),'--compress','--mangle','--output',str(mini)],check=True)
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
archive=ROOT/'gloria-xmb-cotton-v2.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in sorted(OUT.rglob('*')):
  if f.is_file():z.write(f,str(f.relative_to(OUT)))
report={'package':str(OUT),'zip':str(archive),'zip_bytes':archive.stat().st_size,'bytes':sum(f.stat().st_size for f in OUT.rglob('*') if f.is_file()),'games':len(data['games']),'photos':sum(len(a['items']) for a in data['photos']['albums']),'videos':sum(len(g['items']) for g in data['videos']['groups']),'media_files':len(refs),'js':jsname,'css':cssname,'local_references_verified':True}
(ROOT/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
