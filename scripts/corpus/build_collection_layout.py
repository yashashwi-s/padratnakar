"""Materialize collection-only presentation instructions; canonical pads stay intact."""
import json
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def main():
    manifest=json.loads((ROOT/'src/data/shodash-geet.json').read_text())
    hymns={h['id']:h for h in json.loads((ROOT/'src/data/hymns.json').read_text())}
    result={k:manifest[k] for k in ('invocation','bookTitle','title','closingDedication')}
    result['closingDedicationStyle']={'weight':'bold','sizeRole':'larger-than-verse'}
    result['items']=[]
    digits=str.maketrans('0123456789','०१२३४५६७८९')
    for entry in manifest['items']:
        h=hymns[entry['padId']]
        stanzas=[list(s) for s in h['stanzas']]
        if entry.get('openingLineDisplay'):
            assert stanzas[0][0]==entry['openingLineSource']
            stanzas[0][0]=entry['openingLineDisplay']
        if entry.get('stanzaLineCounts'):
            lines=[line for stanza in stanzas for line in stanza]
            assert sum(entry['stanzaLineCounts'])==len(lines)
            stanzas=[]
            offset=0
            for count in entry['stanzaLineCounts']:
                stanza=lines[offset:offset+count]
                stanza[-1]=re.sub(r'[।॥!]+$', '', stanza[-1])+'॥'
                stanzas.append(stanza)
                offset+=count
        if entry.get('footnoteMarkerAfterStanza'):
            stanzas=[[line.removesuffix('*') for line in stanza] for stanza in stanzas]
            stanzas[entry['footnoteMarkerAfterStanza']-1][-1]+='*'
        for i,s in enumerate(stanzas,1):
            s[-1]=re.sub(r'॥(\*?)$',lambda m:'॥'+str(i).translate(digits)+'॥'+m[1],s[-1])
        if entry['role']=='closing':
            stanzas[-1][-1]=stanzas[-1][-1].removesuffix('*')
        headings=list(h['headings'])
        if entry['role'] in manifest['rendering']['suppressMusicalHeadingForRoles']:
            headings=[s for s in headings if not re.match(r'^\((?:राग|दोहा)(?:[ )—–-])',s)]
        result['items'].append({**entry,'headings':headings,'stanzas':stanzas,
                               'sourceLayout':{'padId':h['id'],'chunk':(h['id']-1)//100+1},
                               'footnotes':h['footnotes'],'footnoteRefs':h.get('footnoteRefs',[]),
                               'numberingProvenance':'Collection display rule from supplied sample images; original pad text unchanged'})
    assert [i['padId'] for i in result['items']]==[1]+[n for pair in zip(range(550,558),range(608,616)) for n in pair]+[1508]
    assert len(result['items'])==18
    assert not result['items'][0]['headings'] and not result['items'][-1]['headings']
    numbered=re.compile(r'॥[०-९]+॥\*?$')
    assert all(stanza and numbered.search(stanza[-1]) for item in result['items'] for stanza in item['stanzas'])
    (ROOT/'data/shodash-geet-layout.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print('Built 18 collection entries with separate display numbering and source-layout references.')
if __name__=='__main__':main()
