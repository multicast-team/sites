from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import re,subprocess,json
r=Path(__file__).resolve().parents[1]
errors=[];counts={'html':0,'js':0,'inline_js':0,'links':0}
class Check(HTMLParser):
 def __init__(self,p):super().__init__();self.p=p
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  for key in ('href','src','action'):
   u=a.get(key)
   if not u or '${' in u:continue
   if u.startswith('/') and not u.startswith('//'):errors.append(f'{self.p}: root-relative {u}')
   parsed=urlsplit(u)
   if parsed.scheme or parsed.netloc or not parsed.path:continue
   counts['links']+=1
   target=(self.p.parent/unquote(parsed.path)).resolve()
   if target.is_dir():target=target/'index.html'
   if not target.is_relative_to(r.resolve()) or not target.is_file():errors.append(f'{self.p}: missing {u}')
for p in sorted(r.rglob('*')):
 if '.publish' in p.parts or p.suffix not in ('.html','.js','.css'):continue
 s=p.read_text()
 if p.name!='radar-translations.js' and re.search(r'[\u3400-\u9fff]',s):errors.append(f'{p}: Chinese outside API dictionary')
 if 'googletagmanager.com' in s or re.search(r'\bgtag\(',s):errors.append(f'{p}: analytics')
 if re.search(r'2026\.ip138\.com|my\.ip\.cn',s):errors.append(f'{p}: obsolete IP provider')
 if p.suffix=='.js':
  counts['js']+=1;c=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
  if c.returncode:errors.append(c.stderr)
 if p.suffix=='.html':
  counts['html']+=1;Check(p).feed(s)
  if '<html lang="ru"' not in s:errors.append(f'{p}: wrong language')
  for m in re.finditer(r'<script\b([^>]*)>(.*?)</script>',s,re.S|re.I):
   if 'src=' in m[1]:continue
   if 'application/ld+json' in m[1]:json.loads(m[2]);continue
   if not m[2].strip():continue
   counts['inline_js']+=1;c=subprocess.run(['node','--check','--input-type=commonjs'],input=m[2],capture_output=True,text=True)
   if c.returncode:errors.append(f'{p}: '+c.stderr)
print(json.dumps({'counts':counts,'errors':errors},ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
