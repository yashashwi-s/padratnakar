"""Validate every canonical line association and cross-page footnote geometry."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
hymns=json.loads((ROOT/'src/data/hymns.json').read_text())
records={}
for path in sorted((ROOT/'public/data/layout').glob('*.json')):
    chunk=json.loads(path.read_text())
    assert not records.keys() & chunk.keys()
    records.update(chunk)
assert set(records)=={str(n) for n in range(1,1566)}
count=0
for h in hymns:
    p=records[str(h['id'])]
    expected=hashlib.sha256(json.dumps({'headings':h['headings'],'verses':h['verses']},ensure_ascii=False).encode()).hexdigest()
    assert p['canonicalTextSha256']==expected
    assert p['padId']==h['id'] and p['pages']
    references=[]
    for page in p['pages']:
        assert page['width']>0 and page['height']>0
        for row in page['lines']:
            assert row['bbox'][0]<=row['bbox'][2] and row['bbox'][1]<=row['bbox'][3]
            assert row['segments']
            references.extend((r['role'],r['index']) for r in row['textReferences'])
            count+=len(row['textReferences'])
            if row['segmentTextAligned']:
                text=''.join(s['text'] for s in row['segments'])
                for ref in row['textReferences']:
                    canonical=h['headings' if ref['role']=='heading' else 'verses'][ref['index']]
                    assert ''.join(text.split())==''.join(canonical.split()),(h['id'],ref)
    target=[('heading',i) for i in range(len(h['headings']))]+[('verse',i) for i in range(len(h['verses']))]
    assert sorted(references)==sorted(target),(h['id'],references,target)
    assert len(p['footnotes'])==len(h['footnotes'])
    for note,source in zip(p['footnotes'],h['footnotes']):
        assert note['sourcePages']==source['sourcePages']
        assert note['sourceSpans']==[{k:v for k,v in span.items() if k!='raw'} for span in source['sourceSpans']]
audit=json.loads((ROOT/'docs/print-layout-audit.json').read_text())
assert audit['unmatchedLines']==[] and audit['ambiguousLines']==[]
assert audit['matchedLines']==count
assert records['1504']['footnotes'][0]['sourcePages']==[915,916,917]
print(f'Validated all {count} canonical line positions across 1565 pads and all footnotes.')
