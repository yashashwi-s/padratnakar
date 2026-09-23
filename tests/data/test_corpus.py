import json
from pathlib import Path

root=Path(__file__).resolve().parents[2]
h=json.loads((root/'src/data/hymns.json').read_text())
a=json.loads((root/'docs/data-footnote-audit.json').read_text())
m=json.loads((root/'src/data/shodash-geet.json').read_text())
assert [x['id'] for x in h]==list(range(1,1566))
assert all(x['verses'] and x['source']['method']=='pdf-font-decoding' for x in h)
overrides=json.loads((root/'data/source/reviewed-overrides.json').read_text())
assert sum(x['textStatus']=='human-verified' for x in h)>=sum(r['state']=='verified' for r in overrides)
assert sum(len(x['footnotes']) for x in h)==33
assert a['counts']['unmatchedNoteLines']==0
assert a['verifiedReviewsPreserved']==sum(x['textStatus']=='human-verified' for x in h)
assert [x['padId'] for x in m['items']]==[1,550,608,551,609,552,610,553,611,554,612,555,613,556,614,557,615,1508]
assert m['rendering']['numberStanzas'] is True
assert m['rendering']['suppressMusicalHeadingForRoles']==['opening','closing']
assert [x for x in m['items'] if x['padId']==608][0]['openingLines']==['हौं तो दासी नित्य तिहारी।']
assert all(x['openingLines']==['हौं तो दासी नित्य तिहारी।'] if x['padId']==608 else 'openingLines' not in x for x in m['items'])
assert any(f['sourcePages']==[915,916,917] for f in h[1503]['footnotes'])
assert any(f['sourcePages']==[918] for f in h[1507]['footnotes'])
assert not h[1509]['footnotes']
assert len(h[1024]['footnotes'])==15 and not h[1025]['footnotes']
assert h[1561]['footnotes'][0]['targetPadIds']==[1560,1561,1562]
assert h[1555]['footnotes'][0]['targetPadIds']==list(range(1551,1557))
for targets,owner in [([269,270,271],271),([333,349],333),(list(range(1551,1557)),1556),([1560,1561,1562],1562)]:
    for target in targets:
        assert any(ref['ownerPadId']==owner for ref in h[target-1]['footnoteRefs'])
assert h[332]['footnotes'][0]['locationConfidence']=='inferred-from-page-position-and-this-pad-wording'
assert a['ambiguousOwnership'][0]['ownerPadId']==333
assert h[270]['footnotes'][0]['targetPadIds']==[269,270,271]
assert h[611]['footnotes'] and not h[612]['footnotes']
assert h[1546]['footnotes'] and not h[1548]['footnotes']
assert h[1542]['title']=='माँका दुलार'
for x in h:
    assert [line for stanza in x['stanzas'] for line in stanza]==x['verses']
    assert all(f['lines'] and f['sourceSpans'] for f in x['footnotes'])
    assert all(h[r['ownerPadId']-1]['footnotes'][r['noteIndex']]['marker']==r['marker'] for r in x['footnoteRefs'])
print('Integrated data checks passed')

assert h[103]['footnotes'][0]['lines']==['१-मेल मिलाप। २-विरोध।']
assert '१-मेल मिलाप। २-विरोध।' not in h[104]['verses']
assert h[983]['verses'][-1]=='(गीता ८। २४, २६-२७)'
assert not any(x.startswith('(गीता ') for n in (984,985) for x in h[n-1]['headings'])

assert h[1463]["headings"]==["(राग भैरवी—ताल कहरवा"]
assert h[1463]["verses"][0].startswith("धनासक्त")
