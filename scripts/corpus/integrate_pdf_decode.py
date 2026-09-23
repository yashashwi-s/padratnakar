"""Integrate the user-accepted PDF font decoding with physical-page note provenance."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
CANDIDATES = ROOT / 'data/source/decoded-candidates.jsonl'
PDF = ROOT / 'data/source/Pad-Ratnakar-Hindi.pdf'
CONVERTER = ROOT / 'scripts/corpus/convert_json.cjs'


def inverse(text):
    out = []
    for char in text:
        if char == '¤':
            out.append('\ue100')
        else:
            try:
                byte = char.encode('mac_roman')
                try: out.append(byte.decode('cp1252'))
                except UnicodeDecodeError: out.append(chr(byte[0]))
            except UnicodeEncodeError: out.append(char)
    return ''.join(out)


def cleanup(text):
    text = text.replace('ï', '').replace('Ó', '’')
    prebase = re.compile(r'ç((?:[क-ह][़]?)(?:्[क-ह][़]?)*)')
    for _ in range(3):
        text = prebase.sub(lambda m: m.group(1) + 'ि', text)
    text = re.sub(r'ॢ([क-ह][़]?)', lambda m: 'र्' + m.group(1) + 'ि', text)
    return re.sub(r'[ \t]+', ' ', text).strip()


def convert(raws):
    records = []
    for raw in raws:
        legacy = inverse(raw)
        records.append({'converterInput': legacy.replace('\ue100','झ्').replace('Ÿô','श्रे').replace('_','ट्ठ').replace('Ñ','ः').replace('ú','ॐ').replace('ï','')})
    result = subprocess.run(['node', str(CONVERTER)], input=json.dumps(records, ensure_ascii=False), text=True, capture_output=True, check=True)
    return [cleanup(x['decoded']) for x in json.loads(result.stdout)]


def line_spans(page, page_num):
    found=[]
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            spans=[s for s in line.get('spans',[]) if s['text'].strip() and abs(s['size']-12.0)<0.2]
            if not spans: continue
            if any(abs(s['size']-12.0)>=0.2 for s in line.get('spans',[]) if s['text'].strip()): continue
            raw=''.join(s['text'] for s in spans).strip()
            bbox=[min(s['bbox'][0] for s in spans),min(s['bbox'][1] for s in spans),max(s['bbox'][2] for s in spans),max(s['bbox'][3] for s in spans)]
            found.append({'page':page_num,'raw':raw,'bbox':bbox,'fontSize':12})
    return sorted(found,key=lambda s:(s['bbox'][1],s['bbox'][0]))


def main():
    old=json.loads((ROOT/'data/source/catalog.json').read_text())
    records=[json.loads(line) for line in CANDIDATES.open()]
    assert len(old)==len(records)==1565
    doc=fitz.open(PDF)
    physical=[]
    for index in range(33,948): physical.extend(line_spans(doc[index],index+1))
    decoded=convert([x['raw'] for x in physical])
    for span,txt in zip(physical,decoded): span['text']=txt
    # Printed small type includes inline Gita citations and translation attributions.
    # Notes are identified by their asterisk/numbered entry, plus the documented
    # three-page continuation of the note beginning on physical page 915.
    starts=[]
    for i,s in enumerate(physical):
        t=s['text']
        if t.startswith('*') or t.startswith('नोट') or (s['page'] in (679,680,938) and re.match(r'^\d+[.\-]',t)):
            starts.append(i)
    footnote_lines=[]
    for i,s in enumerate(physical):
        p=s['page']; t=s['text']
        if p in (915,916,917) and (p>915 or s['bbox'][1]>=360):
            footnote_lines.append(s);continue
        if p in (679,680) and s['bbox'][1]>= (430 if p==679 else 345):
            footnote_lines.append(s);continue
        if p==946 and s['bbox'][1]>=460:
            footnote_lines.append(s);continue
        if p==938 and s['bbox'][1]>=470:
            footnote_lines.append(s);continue
        if any(physical[j]['page']==p and physical[j]['bbox'][1]<=s['bbox'][1] for j in starts):
            # Bottom note lines follow their marker on each physical page.
            footnote_lines.append(s)
    # Group normal asterisk notes by page; numbered entries by entry; merge the
    # page 915-917 continuation under the first asterisk.
    groups=[]
    for s in footnote_lines:
        t=s['text'];p=s['page']; numbered=re.match(r'^(\d+)[.\-]',t)
        if p in (915,916,917):
            key='long-915'
        elif numbered and p in (679,680,938):
            key=f'{p}-{numbered.group(1)}'
        elif groups and groups[-1]['key'].startswith(f'{p}-') and not t.startswith('*') and not numbered:
            key=groups[-1]['key']
        else:
            key=f'{p}-asterisk'
        if not groups or groups[-1]['key']!=key:groups.append({'key':key,'spans':[]})
        groups[-1]['spans'].append(s)
    result=[]; audit={'footnotes':[],'unmatchedNoteLines':[],'ambiguousOwnership':[],'nonNoteSmallPrint':[]}
    for old_h,r in zip(old,records):
        assert old_h['id']==r['id']
        lines=r['lines'][:]
        note_groups=[]
        for group in groups:
            spans=group['spans'];first=spans[0];page=first['page'];y=first['bbox'][1]
            owner_by_page={112:153,178:271,193:295,218:333,246:363,257:376,265:384,266:387,286:414,394:612,679:1025,680:1025,915:1504,918:1508,940:1547,943:1556,946:1562}
            if page==938:owner=1544 if first['text'].startswith('१') else 1545
            elif page in owner_by_page:owner=owner_by_page[page]
            else:
                candidates=[x for x in records if x['startPdfPage']<=page<=x['endPdfPage'] and (x['startPdfPage']<page or x['startY']<=y)]
                owner=max(candidates,key=lambda x:x['id'])['id'] if candidates else None
                # A bottom note printed after the next pad starts can refer to
                # the previous pad. Keep the source-based owner for review.
            if owner==r['id']:note_groups.append(group)
        removed=[]
        # Remove note text from whichever pad interval included its physical span.
        for span in footnote_lines:
            if not (r['startPdfPage']<=span['page']<=r['endPdfPage']):continue
            if not (r['startPdfPage']<span['page'] or r['startY']<=span['bbox'][1]):continue
            if not (r['endPdfPage']>span['page'] or span['bbox'][1]<r['endY']):continue
            target=span['text']
            if target in lines:
                lines.remove(target);removed.append(target)
            else:
                audit['unmatchedNoteLines'].append({'padId':r['id'],'page':span['page'],'text':target,'bbox':span['bbox']})
        hym={k:v for k,v in old_h.items() if k!='sourceHeadings'}
        headings=[]
        while lines and (re.fullmatch(r'[\[(][०-९0-9]+[\])]',lines[0]) or (lines[0].startswith('(') and (lines[0].endswith(')') or lines[0].startswith('(राग ')))):
            heading=lines.pop(0)
            if not re.fullmatch(r'[\[(][०-९0-9]+[\])]',heading):headings.append(heading)
        if len(lines)>1 and lines[1].startswith('(') and lines[1].endswith(')') and not any(c in lines[0] for c in '।॥'):
            headings.append(lines.pop(0))
            headings.append(lines.pop(0))
        elif len(lines)>1 and lines[0] in old_h['sourceHeadings'] and len(lines[0])<55 and not any(c in lines[0] for c in '।॥!?') and lines[1].endswith(('।','॥')):
            headings.append(lines.pop(0))
        hym['headings']=headings
        form_heading=next((x[1:-1] for x in headings if x.startswith('(') and x.endswith(')') and not x.startswith('(राग ')),None)
        if form_heading:hym['form']=form_heading
        raag_heading=next((x[1:-1] for x in headings if x.startswith('(राग ') and x.endswith(')')),None)
        if raag_heading:
            parts=re.split(r'[—–-]',raag_heading,maxsplit=1)
            hym['raag']=parts[0].removeprefix('राग ').strip()
            if len(parts)>1:hym['taal']=parts[1].replace('ताल','').strip()
        title_source=next((line for line in headings if not line.startswith('(')),None) or (lines[0] if lines else old_h['title'])
        hym['title']=title_source
        hym['verses']=lines
        stanzas=[]
        stanza=[]
        for line in lines:
            stanza.append(line)
            if line.endswith('॥') or line.endswith('॥*') or re.search(r'॥[०-९0-9]+$',line):
                stanzas.append(stanza);stanza=[]
        if stanza:stanzas.append(stanza)
        hym['stanzas']=stanzas
        hym['footnotes']=[]
        for group in note_groups:
            spans=group['spans'];texts=[s['text'] for s in spans]
            if spans[0]['page']==680:
                texts=[re.sub(r'^०(?=[१-९]\.)','',t) for t in texts]
            marker='*'
            match=re.match(r'^(\d+)[.\-]',texts[0])
            if match:marker=str(int(match.group(1).translate(str.maketrans('०१२३४५६७८९','0123456789'))))
            pages=sorted(set(s['page'] for s in spans))
            if pages==[946]:marker='नोट'
            item={'marker':marker,'lines':texts,'sourcePages':pages,'sourceSpans':[{'page':s['page'],'bbox':s['bbox'],'fontSize':s['fontSize'],'raw':s['raw']} for s in spans]}
            targets={178:[269,270,271],218:[333,349],246:[360,361,362,363],257:[374,375,376],265:[383,384],266:[385,386,387],286:[412,413,414],943:[1551,1552,1553,1554,1555,1556],946:[1560,1561,1562]}
            if pages[0] in targets:item['targetPadIds']=targets[pages[0]]
            if pages==[218]:
                item['locationConfidence']='inferred-from-page-position-and-this-pad-wording'
                item['locationNote']='The note says यह पद एवं पद संख्या ३४९; it appears after pad 333 begins on physical PDF page 218, but no decoded verse asterisk survives.'
            hym['footnotes'].append(item)
            audit['footnotes'].append({'padId':r['id'],'marker':marker,'pages':pages,'lines':texts})
        hym['source']={'method':'pdf-font-decoding','pages':list(range(r['startPdfPage'],r['endPdfPage']+1)),'regions':r['contentRegions'],'decodedSha256':r['decodedSha256']}
        hym['textStatus']='pdf-decoded-user-accepted'
        result.append(hym)
    # Physical PDF inspection confirmed the following boundary/typography fixes.
    corrections=[
        {'padId':982,'field':'headings','before':'( )','after':None,'pdfPage':657,'reason':'Empty phantom heading; no corresponding printed text.'},
        {'padId':984,'field':'headings','before':'(गीता ८। १६)','after':None,'pdfPage':658,'reason':'Citation belongs to pad 983 and is already retained there.'},
        {'padId':985,'field':'headings','before':'(गीता ८। २४, २६ २७)','after':None,'pdfPage':658,'reason':'Citation belongs to pad 984 and is already retained there.'},
        {'padId':984,'field':'verses','before':'(गीता ८। २४ २६-२७)','after':'(गीता ८। २४, २६-२७)','pdfPage':658,'reason':'Restore printed comma, confirmed against original PDF.'},
    ]
    for c in corrections:
        values=result[c['padId']-1][c['field']]
        assert c['before'] in values, c
        pos=values.index(c['before'])
        if c['after'] is None:values.pop(pos)
        else:values[pos]=c['after']
    for pad_id in (982,984,985):result[pad_id-1]['form']=None
    # This explanatory line is 13pt, unlike the 12pt notes above, and is
    # printed below pad 105 while its two raised markers belong to pad 104.
    note_span=next(s for b in doc[81].get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans'] if s['bbox'][1]>480 and s['text'].startswith('1-'))
    note_text=convert([note_span['text']])[0]
    assert note_text=='१-मेल मिलाप। २-विरोध।'
    result[104]['verses'].remove(note_text)
    result[103]['footnotes'].append({'marker':'१, २','lines':[note_text],'sourcePages':[82],
        'sourceSpans':[{'page':82,'bbox':list(note_span['bbox']),'fontSize':note_span['size'],'raw':note_span['text']}],
        'locationConfidence':'printed-numbered-markers-in-pad-104'})
    audit['footnotes'].append({'padId':104,'marker':'१, २','pages':[82],'lines':[note_text]})
    audit['sourceCorrections']=corrections+[{'padId':105,'field':'verses','before':note_text,'after':None,'pdfPage':82,'reason':'Moved to pad 104 footnotes, following raised markers 1 and 2.'}]
    for hym in result:
        stanzas=[];stanza=[]
        for line in hym['verses']:
            stanza.append(line)
            if line.endswith('॥') or line.endswith('॥*') or re.search(r'॥[०-९0-9]+$',line):
                stanzas.append(stanza);stanza=[]
        if stanza:stanzas.append(stanza)
        hym['stanzas']=stanzas
    reviews={r['padId']:r for r in json.loads((ROOT/'data/source/reviewed-overrides.json').read_text())}
    verified_count=0
    for pad_id,review in sorted(reviews.items()):
        if review.get('state')!='verified':continue
        hym=result[pad_id-1]
        reviewed_lines=review['text'].splitlines()
        hym['verses']=reviewed_lines
        reviewed_stanzas=[];stanza=[]
        for line in reviewed_lines:
            stanza.append(line)
            if line.endswith('॥') or line.endswith('॥*'):
                reviewed_stanzas.append(stanza);stanza=[]
        if stanza:reviewed_stanzas.append(stanza)
        hym['stanzas']=reviewed_stanzas
        meta=review.get('metadata') or {}
        for key in ('raag','taal','section'):
            if key in meta:hym[key]=meta[key]
        hym['subtopic']=meta.get('subsection')
        hym['form']=meta.get('form')
        hym['headings']=[x for x in meta.get('headerLines',[]) if not re.fullmatch(r'\[[०-९0-9]+\]',x)]
        hym['title']=(meta.get('titles') or [reviewed_lines[0] if reviewed_lines else hym['title']])[0]
        hym['textStatus']='human-verified'
        hym['review']={'reviewer':review.get('reviewer'),'revision':review.get('revision'),'updatedAt':review.get('updatedAt'),'textSha256':review.get('textSha256')}
        verified_count+=1
    audit['verifiedReviewsPreserved']=verified_count
    for hym in result:hym['footnoteRefs']=[]
    for owner in result:
        for note_index,note in enumerate(owner['footnotes']):
            for target_id in note.get('targetPadIds',[owner['id']]):
                ref={'ownerPadId':owner['id'],'noteIndex':note_index,'marker':note['marker'],'sourcePages':note['sourcePages']}
                if 'locationConfidence' in note:ref['locationConfidence']=note['locationConfidence']
                result[target_id-1]['footnoteRefs'].append(ref)
    audit['ambiguousOwnership']=[{'ownerPadId':333,'sourcePages':[218],'targetPadIds':[333,349],
        'locationConfidence':'inferred-from-page-position-and-this-pad-wording',
        'reason':'The note says यह पद एवं पद संख्या ३४९, and appears after pad 333 begins; no decoded verse asterisk survives.'}]
    # Every recovered note line must have an owner; unmatched lines retain full
    # coordinates in the audit for source inspection, never silently discarded.
    audit['counts']={'pads':len(result),'footnotes':sum(len(x['footnotes']) for x in result),'unmatchedNoteLines':len(audit['unmatchedNoteLines'])}
    (ROOT/'src/data/hymns.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'docs/data-footnote-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(audit['counts']))

if __name__=='__main__':main()
