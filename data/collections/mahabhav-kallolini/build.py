"""Build this edition from source-checked transcriptions, keeping OCR immutable.

No text is imported from another book. Coordinate matches are supporting layout
metadata and are explicitly marked when the OCR does not align reliably.
"""
from pathlib import Path
import difflib
import hashlib
import importlib.util
import json
import re

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('ocr_candidates', ROOT / 'build-candidates.py')
ocr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ocr)


def normal(text):
    return re.sub(r'[^\u0900-\u097fa-z0-9]', '', text.lower()).replace('़', '')


def match_rows(source, corrected):
    """Monotone global alignment; retain uncertain matches rather than invent boxes."""
    n, m = len(corrected), len(source)
    dp = [[float('inf')] * (m + 1) for _ in range(n + 1)]
    back = {}
    dp[0][0] = 0
    for i in range(n + 1):
        for j in range(m + 1):
            value = dp[i][j]
            if j < m and value + .55 < dp[i][j + 1]:
                dp[i][j + 1] = value + .55
                back[i, j + 1] = (i, j, 'skip-source', 0)
            if i < n and value + .8 < dp[i + 1][j]:
                dp[i + 1][j] = value + .8
                back[i + 1, j] = (i, j, 'unmatched', 0)
            if i < n and j < m:
                a, b = normal(corrected[i]['text']), normal(source[j]['text'])
                score = difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()
                cost = (1 - score) * 1.3
                if value + cost < dp[i + 1][j + 1]:
                    dp[i + 1][j + 1] = value + cost
                    back[i + 1, j + 1] = (i, j, 'match', score)
    result = [None] * n
    i, j = n, m
    while i or j:
        pi, pj, action, score = back[i, j]
        if action == 'match':
            result[pi] = {'bbox': source[pj]['bbox'], 'similarity': round(score, 3),
                          'ocrText': source[pj]['text'], 'reliable': score >= .62}
        i, j = pi, pj
    return result


def build():
    structure = json.loads((ROOT / 'sections.json').read_text())
    decisions = json.loads((ROOT / 'human-decisions.json').read_text())
    files = sorted((ROOT / 'proofread').glob('pages-*.json'))
    pages = [p for f in files for p in json.loads(f.read_text())['pages']]
    pages.sort(key=lambda p: p['pdfPage'])
    assert all(p.get('reviewStatus') == 'direct-visual-transcription-complete' for p in pages), 'Every page needs explicit completed visual review; skeletal drafts cannot be published'
    assert [p['pdfPage'] for p in pages] == list(range(13, 79)), 'All 66 body pages must be proofread exactly once'
    for decision in decisions:
        page = next(p for p in pages if p['pdfPage'] == decision['pdfPage'])
        assert any(row.get('humanDecisionId') == decision['id'] and row['text'] == decision['text'] for row in page['lines']), 'User-approved reading must survive verbatim'
    entries, metadata, unresolved, alignment = [], [], [], []
    current = None
    expected_number = 1
    for page in pages:
        page_no = page['pdfPage']
        rows = page['lines']
        assert rows, f'Empty page {page_no}'
        assert all(r.get('role') in {'page-number', 'section-heading', 'pad-number', 'musical-heading', 'verse', 'decoration', 'footnote'} for r in rows)
        matches = match_rows(ocr.physical_lines(ocr.lines(page_no)), rows)
        for issue in page.get('uncertainties', []):
            unresolved.append({'pdfPage': page_no, **issue})
        if page_no == 78:
            current = {'id': 'mahabhav-kallolini-aarti', 'sequence': 117, 'printedNumber': None,
                       'sectionId': 'aarti', 'title': structure['sections'][-1]['name'], 'lines': []}
            entries.append(current)
        for index, row in enumerate(rows):
            role, text = row['role'], row['text'].strip()
            assert text, (page_no, index)
            if role == 'pad-number':
                number = row['padNumber']
                assert number == expected_number, (page_no, number, expected_number)
                expected_number += 1
                section = next(s for s in structure['sections'] if s['firstPad'] is not None and s['firstPad'] <= number <= s['lastPad'])
                current = {'id': f'mahabhav-kallolini-{number:03}', 'sequence': number,
                           'printedNumber': number, 'sectionId': section['id'], 'lines': []}
                entries.append(current)
                continue
            if role in {'page-number', 'section-heading', 'decoration'}:
                metadata.append({'text': text, 'role': role, 'sourcePage': page_no})
                continue
            assert current is not None, (page_no, text)
            match = matches[index]
            source = {'sourcePage': page_no, 'sourceLineIndex': index, 'text': text, 'role': role,
                      'stanzaBreakAfter': bool(row.get('stanzaBreakAfter')),
                      'sourceBbox': match['bbox'] if match and match['reliable'] and 8 <= match['bbox'][3]-match['bbox'][1] <= 100 else None,
                      'alignmentSimilarity': match['similarity'] if match else 0}
            current['lines'].append(source)
            if not source['sourceBbox']:
                alignment.append({'entry': current['sequence'], 'pdfPage': page_no, 'text': text,
                                  'bestMatch': match})
    assert expected_number == 117 and len(entries) == 117
    for entry in entries:
        entry['sourcePages'] = sorted({l['sourcePage'] for l in entry['lines']})
        entry['headings'] = [l['text'] for l in entry['lines'] if l['role'] == 'musical-heading']
        verses = [l for l in entry['lines'] if l['role'] == 'verse']
        assert verses, entry['sequence']
        entry['title'] = entry.get('title') or verses[0]['text']
        entry['blocks'] = []
        block = []
        for line in verses:
            block.append(line['text'])
            if line['stanzaBreakAfter']:
                entry['blocks'].append(block)
                block = []
        if block:
            entry['blocks'].append(block)
        entry['textStatus'] = 'assistant-source-checked'
        entry['uncertainties'] = [u for u in unresolved if u['pdfPage'] in entry['sourcePages']]
    result = {'schemaVersion': 1, 'title': structure['title'], 'sections': structure['sections'],
              'status': 'source-checked-with-unresolved-readings' if unresolved else 'assistant-source-checked',
              'source': {'path': 'source/booklet.pdf', 'sha256': hashlib.sha256((ROOT/'source/booklet.pdf').read_bytes()).hexdigest(),
                         'pageCount': 84, 'method': 'Three local OCR passes, followed by direct visual transcription of all 66 body pages; supporting comparisons never replace source text'},
              'entries': entries, 'pageMetadata': metadata}
    (ROOT / 'collection.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'remaining-readings.json').write_text(json.dumps(unresolved, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'alignment-review.json').write_text(json.dumps(alignment, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'transcription.md').write_text('# महाभाव-कल्लोलिनी\n\nAssistant source-checked transcription; original spellings retained.\n\n' + '\n\n'.join(
        '## ' + s['name'] + '\n\n' + '\n\n'.join(
            '### ' + str(e['printedNumber'] or 'आरती') + ' · ' + e['title'] + '\n\n' + '\n'.join(e['headings']) + '\n\n' + '\n\n'.join('\n'.join(b) for b in e['blocks'])
            for e in entries if e['sectionId'] == s['id']) for s in structure['sections']) + '\n')
    print(json.dumps({'entries': len(entries), 'bodyPages': len(pages), 'sourceCheckedLines': sum(len(e['lines']) for e in entries),
                      'unresolvedReadings': len(unresolved), 'layoutMatchesToReview': len(alignment)}, indent=2))


if __name__ == '__main__':
    build()
