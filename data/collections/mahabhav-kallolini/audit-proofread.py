"""Coverage diagnostics only: OCR is an imperfect locator, never the text authority."""
import json,runpy,difflib,re
from pathlib import Path
r=Path(__file__).resolve().parent
m=runpy.run_path(str(r/'build-candidates.py'))
reports=[]
for file in sorted((r/'proofread').glob('pages-*.json')):
 try:d=json.loads(file.read_text())
 except json.JSONDecodeError:continue
 for page in d['pages']:
  number=page['pdfPage'];raw=m['physical_lines'](m['lines'](number,'hindi-block-ocr'))
  rows=[x for x in raw if len(m['normalized'](x['text']))>10]
  proof=[x for x in page['lines'] if x['role'] not in ['page-number','pad-number','decoration']]
  omitted=[]
  for line in rows:
   a=m['normalized'](line['text']);score=max((difflib.SequenceMatcher(None,a,m['normalized'](b['text']),autojunk=False).ratio() for b in proof),default=0)
   if score<.5:omitted.append({'ocr':line['text'],'bbox':line['bbox'],'similarity':round(score,2)})
  reports.append({'pdfPage':number,'proofLines':len(proof),'ocrRows':len(rows),'reviewStatus':page.get('reviewStatus'),'potentialOmissions':omitted})
(r/'coverage-diagnostics.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
for p in reports:
 if len(p['potentialOmissions'])>2:print(p['pdfPage'],p['proofLines'],p['ocrRows'],'suspect',len(p['potentialOmissions']))
