"""Build the accepted collection from visually transcribed Markdown."""
import hashlib, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent
source = ROOT/'source/booklet.pdf'
pages = [[1],[2],[2],[3],[4],[5,6],[7,8],[9,10,11],[12],[13],[13,14],[14],[14],[15],[15],[16],[17],[18]]
# Exact body line counts at physical page breaks, from visual inspection.
breaks = {6:[16,16],7:[25,26],8:[20,22,20],11:[8,11]}
issues = []

entries=[]
for block in re.split(r'(?m)^## ',(ROOT/'transcription.md').read_text())[1:]:
    rows=block.splitlines(); number,title=rows[0].split(' · ',1); n=int(number)
    groups=[g.splitlines() for g in '\n'.join(rows[2:]).strip().split('\n\n')]
    lines=[line for g in groups for line in g]
    counts=breaks.get(n,[len(lines)])
    assert sum(counts)==len(lines), (n,counts,len(lines))
    provenance=[];i=0
    for page,count in zip(pages[n-1],counts):
        for j in range(count): provenance.append({'text':lines[i+j],'sourcePage':page,'lineInEntry':i+j+1})
        i+=count
    entries.append({'id':f'bhaiji-jayanti-{n:02}','sequence':n,'printedNumber':n if n<=15 else None,'title':title,'kind':'pad' if n<=15 else ['aarti','charan-vandana','jaygaan'][n-16],'sectionHeading':'भजन' if n==10 else None,'sourcePages':pages[n-1],'blocks':groups,'lines':provenance,'textStatus':'visually-transcribed-with-user-corrections','uncertainties':[x for x in issues if x['entry']==n]})
assert len(entries)==18
assert set(p for e in entries for p in e['sourcePages'])==set(range(1,19))
result={'schemaVersion':1,'title':'श्री भाईजी जयन्ती महोत्सव के पद','status':'accepted-for-collection','invocation':'॥ श्रीहरिः ॥','source':{'path':'source/booklet.pdf','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pageCount':18,'type':'image-only-scan','method':'Hindi OCR candidates, then assistant visual transcription of every rendered page; not PDF font decoding'},'normalizations':['Unicode danda and stanza digits','Typographic quotation marks','Header/footer repetition stored as metadata; printed line breaks retained','Whitespace is semantic, not a facsimile of alignment'],'entries':entries}
(ROOT/'collection.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(ROOT/'uncertainties.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2)+'\n')
print(f'Validated {len(entries)} entries, {sum(len(e["lines"]) for e in entries)} body lines, all 18 pages, {len(issues)} review notes.')
