from pathlib import Path
import csv,re,json
root=Path(__file__).resolve().parent
def lines(page,folder='hindi-ocr'):
 words=[r for r in csv.DictReader((root/folder/f'{page:03}.tsv').open(),delimiter='\t',quoting=csv.QUOTE_NONE) if r['level']=='5' and r['text'].strip()]
 groups={}
 for w in words:groups.setdefault((w['block_num'],w['par_num'],w['line_num']),[]).append(w)
 rows=[]
 for g in groups.values():
  x=min(int(w['left']) for w in g);y=min(int(w['top']) for w in g);right=max(int(w['left'])+int(w['width']) for w in g);bottom=max(int(w['top'])+int(w['height']) for w in g)
  rows.append({'text':' '.join(w['text'] for w in g),'bbox':[x,y,right,bottom],'confidence':round(sum(float(w['conf']) for w in g)/len(g),1),'words':[{'text':w['text'],'confidence':float(w['conf']),'bbox':[int(w['left']),int(w['top']),int(w['left'])+int(w['width']),int(w['top'])+int(w['height'])]} for w in g]})
 return sorted(rows,key=lambda r:(r['bbox'][1],r['bbox'][0]))

def normalized(text):
 return re.sub(r'[^\u0900-\u097fa-z0-9]','',text.lower())

def physical_lines(rows):
 # Rejoin columns of the same printed line using geometric overlap; retain
 # every OCR word and its coordinates, never reconstruct words by meaning.
 merged=[]
 for row in rows:
  match=next((a for a in reversed(merged[-4:]) if max(a['bbox'][3]-a['bbox'][1],row['bbox'][3]-row['bbox'][1]) < 2*min(a['bbox'][3]-a['bbox'][1],row['bbox'][3]-row['bbox'][1]) and not (len(row['text'])<18 and re.search(r'[\[\]]',row['text'])) and not (len(a['text'])<18 and re.search(r'[\[\]]',a['text'])) and min(a['bbox'][3],row['bbox'][3])-max(a['bbox'][1],row['bbox'][1]) > .5*min(a['bbox'][3]-a['bbox'][1],row['bbox'][3]-row['bbox'][1])),None)
  if match:
   match['words']+=row['words'];match['words'].sort(key=lambda w:w['bbox'][0])
   match['text']=' '.join(w['text'] for w in match['words'])
   match['bbox']=[min(match['bbox'][0],row['bbox'][0]),min(match['bbox'][1],row['bbox'][1]),max(match['bbox'][2],row['bbox'][2]),max(match['bbox'][3],row['bbox'][3])]
   match['confidence']=round(sum(w['confidence'] for w in match['words'])/len(match['words']),1)
  else: merged.append(row)
 return sorted(merged,key=lambda r:(r['bbox'][1],r['bbox'][0]))

if __name__=='__main__':
 import difflib,hashlib
 sections=json.loads((root/'sections.json').read_text())
 entries=[];pageRecords=[];current=None;markerNumber=0;excluded=[]
 for page in range(1,85):
  rows=physical_lines(lines(page)); alt=physical_lines(lines(page,'hindi-block-ocr'))
  for row in rows:
   matches=[a for a in alt if min(a['bbox'][3],row['bbox'][3])-max(a['bbox'][1],row['bbox'][1])>0]
   row['alternateText']=' '.join(a['text'] for a in matches)
   row['passesAgree']=normalized(row['text'])==normalized(row['alternateText'])
   row['pdfPage']=page
   row['coordinateScale']=3
  pageRecords.append({'pdfPage':page,'lines':rows,'status':'unverified-ocr'})
  if not 13<=page<=78: continue
  if page==78:
   current={'id':'aarti','number':None,'sectionId':'aarti','title':sections['sections'][-1]['name'],'lines':[],'status':'unverified-ocr'};entries.append(current)
  for row in rows:
   text=row['text']; y=row['bbox'][1]
   sectionZones={23:(360,528),32:(0,775),62:(0,240),64:(0,275),66:(0,278),73:(0,237),78:(0,350)}
   zone=sectionZones.get(page)
   if zone and zone[0]<=y<zone[1]:
    excluded.append({'reason':'section-heading-or-decoration','line':row});continue
   isMarker=(len(text)<18 and bool(re.search(r'[\[\]]',text))) or (page==24 and text=='(२०)') or (page==75 and text=='(११३)')
   if isMarker:
    markerNumber+=1
    section=next(s for s in sections['sections'] if s['firstPad'] is not None and s['firstPad']<=markerNumber<=s['lastPad'])
    current={'id':f'pad-{markerNumber:03}','number':markerNumber,'sectionId':section['id'],'marker':row,'lines':[],'status':'unverified-ocr'};entries.append(current);continue
   # Page-number rows are retained in page OCR, separated from body candidates.
   if y<140 and len(text)<14 and re.fullmatch(r'\([०-९0-9]+\)',text):
    excluded.append({'reason':'printed-page-number','line':row});continue
   if current is None:
    excluded.append({'reason':'opening-illustration-or-heading','line':row});continue
   current['lines'].append(row)
 assert markerNumber==116,markerNumber
 assert len(entries)==117
 for e in entries:
  e['sourcePages']=sorted(set([r['pdfPage'] for r in e['lines']]+([e['marker']['pdfPage']] if e.get('marker') else [])))
  e['title']=e.get('title') or next((r['text'] for r in e['lines'] if not r['text'].startswith('(')),e['id'])
  e['reviewRequired']=True
  e['reviewReasons']=['All OCR text requires source review before publication; confidence and pass agreement do not prove correctness.']
 result={'schemaVersion':1,'title':sections['title'],'status':'unverified-ocr-not-for-production','sections':sections['sections'],'source':json.loads((root/'source.json').read_text()),'entries':entries,'excludedLines':excluded}
 (root/'candidates.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 (root/'pages.jsonl').write_text(''.join(json.dumps(p,ensure_ascii=False)+'\n' for p in pageRecords))
 review=[{'entryId':e['id'],'pdfPage':r['pdfPage'],'bbox':r['bbox'],'text':r['text'],'alternateText':r['alternateText'],'confidence':r['confidence'],'reasons':(['ocr-pass-disagreement'] if not r['passesAgree'] else [])+(['low-word-confidence'] if any(w['confidence']<65 for w in r['words']) else [])} for e in entries for r in e['lines'] if not r['passesAgree'] or any(w['confidence']<65 for w in r['words'])]
 (root/'review-queue.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
 (root/'extracted-text.md').write_text('# महाभाव-कल्लोलिनी — OCR candidates, not proofread\n\n'+ '\n\n'.join('## '+s['name']+'\n\n'+'\n\n'.join('### '+str(e['number'] or 'आरती')+' · '+e['title']+'\n\n'+'\n'.join(r['text'] for r in e['lines']) for e in entries if e['sectionId']==s['id']) for s in sections['sections'])+'\n')
 report={'pdfPages':84,'numberedPads':116,'additionalAarti':1,'sections':8,'candidateLines':sum(len(e['lines']) for e in entries),'flaggedLines':len(review),'verifiedBodyLines':0,'productionReady':False}
 (root/'audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
