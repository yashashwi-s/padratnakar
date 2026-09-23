"""Preserve original PDF geometry without adding spacing to canonical Unicode text."""
import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
import fitz
from integrate_pdf_decode import ROOT, PDF, convert

OUT = ROOT / 'public/data/layout'
def norm(s):
    return re.sub(r'\s+', '', s)
def rounded(box):
    return [round(v, 3) for v in box]
def main(raw_output=None):
    hymns = json.loads((ROOT/'src/data/hymns.json').read_text())
    doc = fitz.open(PDF)
    OUT.mkdir(parents=True, exist_ok=True)
    cache = {}
    chunks = {}
    if raw_output:
        raw_output=Path(raw_output)
        raw_output.mkdir(parents=True, exist_ok=True)
    def page_rows(n):
        if n in cache: return cache[n]
        fragments = []
        for block in doc[n-1].get_text('rawdict')['blocks']:
            for line in block.get('lines', []):
                for s in line['spans']:
                    raw = ''.join(c['c'] for c in s['chars'])
                    if not raw.strip(): continue
                    fragments.append({'raw':raw, 'characters':[{'raw':c['c'],'bbox':rounded(c['bbox']),'origin':rounded(c['origin'])} for c in s['chars']], 'bbox':rounded(s['bbox']),
                                      'baseline':round(s['origin'][1],3), 'font':s['font'], 'fontSize':round(s['size'],3)})
        rows=[]
        for f in sorted(fragments,key=lambda f:(f['baseline'],f['bbox'][0])):
            if not rows or abs(rows[-1]['baseline']-f['baseline']) > .7:
                rows.append({'baseline':f['baseline'],'fragments':[]})
            rows[-1]['fragments'].append(f)
        # Raised note numerals and leader dots sit above their surrounding text.
        # Retain each fragment baseline but associate it with the nearest lower
        # body baseline when its x position is within that body line.
        satellites=[]
        for row in rows:
            raw=''.join(f['raw'].strip() for f in row['fragments'])
            if re.fullmatch(r'[0-9]+|\.{2,}', raw):
                candidates=[r for r in rows if .7 < r['baseline']-row['baseline'] <= 6.5
                            and any(f['fontSize']>=14 for f in r['fragments'])
                            and min(f['bbox'][0] for f in r['fragments'])-10 <= row['fragments'][0]['bbox'][0]
                            and max(f['bbox'][2] for f in r['fragments'])+10 >= row['fragments'][-1]['bbox'][2]]
                if len(candidates)==1:
                    candidates[0]['fragments'].extend(row['fragments'])
                    satellites.append(row)
        rows=[r for r in rows if r not in satellites]
        raws=[]
        for row in rows:
            row['fragments'].sort(key=lambda f:f['bbox'][0])
            fs=row['fragments']
            row['bbox']=[min(f['bbox'][0] for f in fs),min(f['bbox'][1] for f in fs),max(f['bbox'][2] for f in fs),max(f['bbox'][3] for f in fs)]
            row['gaps']=[round(b['bbox'][0]-a['bbox'][2],3) for a,b in zip(fs,fs[1:])]
            raws.append(' '.join(f['raw'].strip() for f in fs))
        flat=[f for row in rows for f in row['fragments']]
        decoded=convert(raws+[f['raw'] for f in flat])
        for row,text in zip(rows,decoded):row['decodedText']=text
        for f,text in zip(flat,decoded[len(rows):]):f['decodedText']=text
        cache[n]=rows
        return rows
    audit={'schemaVersion':1,'pads':len(hymns),'matchedLines':0,'unmatchedLines':[],'ambiguousLines':[]}
    for h in hymns:
        pages=[]
        for region in h['source']['regions']:
            n=region['pdfPage']
            rows=[dict(r) for r in page_rows(n) if r['baseline'] >= region['y0'] and r['bbox'][1] < region['y1']-.01 and r['bbox'][0] < region['x1'] and r['bbox'][2]>region['x0']]
            pages.append({'pdfPage':n,'width':doc[n-1].rect.width,'height':doc[n-1].rect.height,'region':region,'rows':rows})
        targets=[('heading',i,t) for i,t in enumerate(h['headings'])]+[('verse',i,t) for i,t in enumerate(h['verses'])]
        target_counts=Counter(norm(t) for _,_,t in targets)
        seen=Counter()
        for role,i,t in targets:
            key=norm(t)
            found=[(p,r) for p in pages for r in p['rows'] if norm(r['decodedText'])==key]
            # Equal numbers of identical canonical/source lines pair in reading
            # order. Each physical occurrence is used once, never guessed.
            if len(found)==target_counts[key]:
                p,r=found[seen[key]];seen[key]+=1
                r.setdefault('textReferences',[]).append({'role':role,'index':i})
                audit['matchedLines']+=1
            else:
                audit['ambiguousLines' if found else 'unmatchedLines'].append({'padId':h['id'],'role':role,'index':i,'text':t,'candidateCount':len(found)})
        notes=[]
        for i,note in enumerate(h['footnotes']):
            notes.append({'index':i,'marker':note['marker'],'sourceSpans':note['sourceSpans'],'sourcePages':note['sourcePages']})
        payload={'schemaVersion':1,'padId':h['id'],'units':'PDF points; top-left origin','canonicalTextSha256':hashlib.sha256(json.dumps({'headings':h['headings'],'verses':h['verses']},ensure_ascii=False).encode()).hexdigest(),'pages':pages,'footnotes':notes,'footnoteRefs':h.get('footnoteRefs',[])}
        if raw_output:
            (raw_output/f'{h['id']}.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
        compact={k:payload[k] for k in ('schemaVersion','padId','units','canonicalTextSha256','footnoteRefs')}
        compact['pages']=[]
        for page in pages:
            lines=[]
            for row in page['rows']:
                if not row.get('textReferences'):continue
                fragments=row['fragments']
                safe=norm(''.join(f['decodedText'] for f in fragments))==norm(row['decodedText'])
                lines.append({'baseline':row['baseline'],'bbox':row['bbox'],
                    'textReferences':row['textReferences'],
                    'segments': [{'text':f['decodedText'] if safe else None,'bbox':f['bbox'],'baseline':f['baseline'],'fontSize':f['fontSize']} for f in fragments],
                    'segmentTextAligned':safe})
            compact['pages'].append({'pdfPage':page['pdfPage'],'width':page['width'],'height':page['height'],'lines':lines})
        compact['footnotes']=[{**note,'sourceSpans':[{k:v for k,v in span.items() if k!='raw'} for span in note['sourceSpans']]} for note in notes]
        chunks.setdefault((h['id']-1)//100+1,{})[str(h['id'])]=compact
    for chunk,records in chunks.items():
        (OUT/f'{chunk}.json').write_text(json.dumps(records,ensure_ascii=False,separators=(',',':'))+'\n')
    audit['sourcePdfSha256']=hashlib.sha256(PDF.read_bytes()).hexdigest()
    (ROOT/'docs/print-layout-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:len(v) if isinstance(v,list) else v for k,v in audit.items()}))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--raw-output',help='Optional external directory for full character-level research records')
    main(parser.parse_args().raw_output)
