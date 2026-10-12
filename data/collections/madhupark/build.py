"""Build Madhupark from visually reviewed text and retained scan locators."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE_SHA256 = "b55657097809d4ab94fd4dc8535f3164a45ffc7e20b02f697c05acb248b9f9b0"


def build():
    source_pdf = ROOT / 'source/booklet.pdf'
    if source_pdf.exists():
        assert hashlib.sha256(source_pdf.read_bytes()).hexdigest() == SOURCE_SHA256
    source_map = json.loads((ROOT / 'source-map.json').read_text())
    parts = re.split(r'^# (\d+)\s*$', (ROOT / 'transcription.txt').read_text(), flags=re.M)
    entries = []
    for number, text in zip(parts[1::2], parts[2::2]):
        number = int(number)
        blocks = [block.splitlines() for block in text.strip().split('\n\n')]
        verses = [line for block in blocks for line in block]
        regions = source_map[number - 1]['regions']
        assert sum(region['lineCount'] for region in regions) == len(verses), number
        lines = []
        for region in regions:
            for _ in range(region['lineCount']):
                lines.append({'text': verses[len(lines)], 'sourcePage': region['pdfPage'],
                              'sourceRegion': region['bbox'], 'positionPrecision': 'verse-block'})
        entries.append({'sequence': number, 'printedNumber': number,
                        'title': verses[0], 'blocks': blocks, 'lines': lines,
                        'sourcePages': [region['pdfPage'] for region in regions]})
    assert [e['sequence'] for e in entries] == list(range(1, 56))
    return {'schemaVersion': 1, 'title': 'मधुपर्क',
            'source': {'path': 'source/booklet.pdf', 'pageCount': 39,
                       'sha256': SOURCE_SHA256,
                       'method': 'Assistant visual transcription checked against all verse blocks; OCR retained only as candidates',
                       'status': 'assistant-reviewed; not human-proofread'},
            'scope': 'Numbered pads 1–55 only; introductory and explanatory prose excluded',
            'normalizations': ['Semantic single spaces', 'Unicode danda punctuation',
                               'Printed verse line endings retained; stanza gaps follow verse units'],
            'entries': entries}


if __name__ == '__main__':
    (ROOT / 'collection.json').write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n')
