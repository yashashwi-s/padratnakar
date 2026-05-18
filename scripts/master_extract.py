#!/usr/bin/env python3
"""
MASTER EXTRACTION SCRIPT for Pad-Ratnakar
==========================================
Strategy:
1. Use PyMuPDF to scan the DIGITAL LAYER of the PDF for pad markers [1], [2], ...
   The pad numbers are stored as standard ASCII digits inside the Chanakya font,
   so PyMuPDF reads them perfectly (no OCR needed for numbering).
2. Record which PDF page each pad starts on (and ends before the next one).
3. For each pad's page range, run Tesseract OCR at 300dpi to get the Hindi text.
4. Stitch multi-page pads together correctly.
5. Map each pad to its section/subtopic using information.md.
6. Output a clean, validated hymns.json and sections.json.
"""

import pymupdf
import pytesseract
import re
import json
import io
import os
from PIL import Image

PDF_PATH = 'Pad-Ratnakar-Hindi.pdf'
INFO_PATH = 'information.md'
OUT_HYMNS = 'src/data/hymns.json'
OUT_SECTIONS = 'src/data/sections.json'
OCR_DUMP = 'ocr_full_dump.txt'

doc = pymupdf.open(PDF_PATH)

# ==================== STEP 1: Find All Pad Markers in the Digital Layer ====================
print("Step 1: Scanning digital layer for pad markers...")

# Map: pad_number -> (start_pdf_page_0indexed, bbox_y_start)
# We'll use page 33 onwards (PDF page 34 in human count = index 33)
CONTENT_START_PAGE = 33  # 0-indexed, PDF page 34

pad_positions = {}  # pad_num -> {'page': int, 'y': float}

for page_idx in range(CONTENT_START_PAGE, doc.page_count):
    page = doc[page_idx]
    blocks = page.get_text('rawdict')['blocks']
    for b in blocks:
        if 'lines' not in b:
            continue
        for line in b['lines']:
            for span in line['spans']:
                # Extract text from raw chars
                txt = ''.join(
                    chr(c['c']) if isinstance(c['c'], int) else c['c']
                    for c in span['chars']
                ).strip()
                # Match [N] where N is 1-4 digit arabic numeral
                m = re.fullmatch(r'\[(\d{1,4})\]', txt)
                if m:
                    pad_num = int(m.group(1))
                    if 1 <= pad_num <= 1700:
                        # Record first occurrence only
                        if pad_num not in pad_positions:
                            # y position of this span
                            y = span['bbox'][1]  # top of span
                            pad_positions[pad_num] = {'page': page_idx, 'y': y}

found_pads = sorted(pad_positions.keys())
print(f"  Found {len(found_pads)} pad markers digitally (range {found_pads[0]}–{found_pads[-1]})")

# Check for missing
all_expected = set(range(1, max(found_pads)+1))
missing = sorted(all_expected - set(found_pads))
if missing:
    print(f"  Missing {len(missing)} pad numbers: {missing[:30]}{'...' if len(missing) > 30 else ''}")

# ==================== STEP 2: Load / Reuse OCR Dump ====================
# OCR is very slow; if we already have the dump, use it.
# The dump is a concatenation of Tesseract output page-by-page.

if os.path.exists(OCR_DUMP):
    print(f"Step 2: Loading existing OCR dump from '{OCR_DUMP}'...")
    with open(OCR_DUMP, encoding='utf-8') as f:
        ocr_pages = f.read().split('\n\f\n')  # form-feed separates pages if any
    # Actually the dump was created by appending page-by-page text; let's rebuild page array
    # We stored text appended with '\n\n' between pages - we need per-page data.
    # Easier: re-read raw dump and match to page by scanning for content.
    # Since dump doesn't have per-page markers reliably, we'll re-OCR only missing pages.
    # For now, load dump as a single flat string.
    with open(OCR_DUMP, encoding='utf-8') as f:
        full_dump = f.read()
    print(f"  Dump loaded ({len(full_dump):,} chars).")
    USE_DUMP = True
else:
    print("Step 2: No OCR dump found. Will OCR page by page (slow)...")
    USE_DUMP = False
    full_dump = ""

# ==================== STEP 3: Per-Page OCR Cache ====================
print("Step 3: Building per-page OCR cache...")

# We need to know: for page P, what is the OCR'd text?
# Strategy: OCR each page we need and cache. Skip pages we don't have pad markers on.
# The pad_positions dict tells us exactly which pages have pad starts.
# We need OCR for pages from CONTENT_START_PAGE up to the last pad's page + a few more.

pages_needed = set()
sorted_pads = sorted(pad_positions.keys())
for i, pad_num in enumerate(sorted_pads):
    start_page = pad_positions[pad_num]['page']
    # End page = start page of next pad (or same if same page), or start_page+4 as safety
    if i + 1 < len(sorted_pads):
        end_page = pad_positions[sorted_pads[i+1]]['page']
    else:
        end_page = start_page + 3
    for p in range(start_page, end_page + 1):
        pages_needed.add(p)

page_ocr = {}  # page_idx -> ocr_text

# OCR pass: do all needed pages
pages_to_ocr = sorted(pages_needed)
total = len(pages_to_ocr)
for idx, page_idx in enumerate(pages_to_ocr):
    if page_idx in page_ocr:
        continue
    if idx % 50 == 0:
        print(f"  OCR-ing page {page_idx+1} ({idx}/{total})...")
    page = doc[page_idx]
    pix = page.get_pixmap(dpi=300)
    img = Image.open(io.BytesIO(pix.tobytes()))
    text = pytesseract.image_to_string(img, lang='hin')
    page_ocr[page_idx] = text

print(f"  OCR cache built for {len(page_ocr)} pages.")

# ==================== STEP 4: Extract Each Pad ====================
print("Step 4: Extracting pad text...")

def clean_page_text(text):
    """Remove page headers, page numbers and 'पद-रत्नाकर' strings."""
    lines = text.split('\n')
    clean = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r'^\d+$', stripped):
            continue
        if 'रत्नाकर' in stripped and len(stripped) < 25:
            continue
        clean.append(stripped)
    return '\n'.join(clean)

raw_pads_text = {}  # pad_num -> raw text

for i, pad_num in enumerate(sorted_pads):
    start_page = pad_positions[pad_num]['page']
    # Next pad
    next_pad = sorted_pads[i+1] if i + 1 < len(sorted_pads) else None
    end_page = pad_positions[next_pad]['page'] if next_pad else start_page + 3

    # Collect text across pages
    text_parts = []
    for p_idx in range(start_page, min(end_page + 1, doc.page_count)):
        page_text = page_ocr.get(p_idx, "")
        cleaned = clean_page_text(page_text)
        text_parts.append(cleaned)

    full_pad_text = '\n'.join(text_parts)

    # Now cut: from [pad_num] to [next_pad] (or end)
    # Find the pad marker [pad_num] in the text
    marker_pattern = re.compile(
        r'\[' + str(pad_num) + r'\]'
    )
    next_marker_pattern = re.compile(
        r'\[' + str(next_pad) + r'\]'
    ) if next_pad else None

    # Find start
    m_start = marker_pattern.search(full_pad_text)
    if not m_start:
        # Marker not found in OCR text (common for OCR misread numbers)
        # Just use the full text minus last section which belongs to next pad
        # Use the OCR of just the start page
        start_text = clean_page_text(page_ocr.get(start_page, ""))
        raw_pads_text[pad_num] = start_text
        continue

    text_after_marker = full_pad_text[m_start.end():]

    if next_marker_pattern:
        m_end = next_marker_pattern.search(text_after_marker)
        if m_end:
            raw_pads_text[pad_num] = text_after_marker[:m_end.start()].strip()
        else:
            raw_pads_text[pad_num] = text_after_marker.strip()
    else:
        raw_pads_text[pad_num] = text_after_marker.strip()

print(f"  Extracted text for {len(raw_pads_text)} pads.")

# ==================== STEP 5: Load Section Map ====================
print("Step 5: Loading section map...")
padToSection = {}
if os.path.exists(INFO_PATH):
    with open(INFO_PATH, encoding='utf-8') as f:
        for line in f:
            m = re.search(r'- \*\*(.+?)\*\*: Pads (\d+) to (\d+)', line)
            if m:
                full_topic = m.group(1)
                start_p, end_p = int(m.group(2)), int(m.group(3))
                section = full_topic
                subtopic = None
                if '->' in full_topic:
                    parts = full_topic.split('->', 1)
                    section = parts[0].strip()
                    subtopic = parts[1].strip()
                for pid in range(start_p, end_p + 1):
                    padToSection[pid] = {'section': section, 'subtopic': subtopic}
else:
    print(f"WARNING: {INFO_PATH} not found.")

# ==================== STEP 6: Parse Each Pad ====================
print("Step 6: Parsing pad text into structured hymns...")

def parse_pad(pad_id, raw_text):
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    raag = ""
    taal = ""
    verses = []
    footnotes = []

    for line in lines:
        # Skip stray numbers and headers
        if re.match(r'^[\d]+$', line):
            continue
        if 'रत्नाकर' in line and len(line) < 25:
            continue
        # Footnotes (lines starting with * etc.)
        if line.startswith('*') or line.startswith('✦'):
            footnotes.append(line)
            continue
        # Raag/Taal header
        raag_match = re.match(r'^\((.+?)\)$', line)
        if raag_match:
            inner = raag_match.group(1)
            r = re.search(r'राग\s+([\w\s\-]+?)(?:\s*[-–]\s*|$)', inner)
            t = re.search(r'ताल\s+([\w\s]+?)(?:\s*[-–]\s*|$)', inner)
            j = re.search(r'तर्ज\s+([\w\s\-]+?)(?:\s*[-–]\s*|$)', inner)
            if r: raag = r.group(1).strip()
            if t: taal = t.group(1).strip()
            if j and not raag: raag = j.group(1).strip()
            if r or t or j:
                continue
        verses.append(line)

    title = verses[0] if verses else ""
    sec_info = padToSection.get(pad_id, {'section': 'अन्य', 'subtopic': None})

    return {
        'id': pad_id,
        'title': title,
        'section': sec_info['section'],
        'subtopic': sec_info['subtopic'],
        'raag': raag,
        'taal': taal,
        'verses': verses,
        'footnotes': footnotes
    }

hymns = []
for pad_num in sorted(raw_pads_text.keys()):
    hymns.append(parse_pad(pad_num, raw_pads_text[pad_num]))

# ==================== STEP 7: Save ====================
print(f"Step 7: Saving {len(hymns)} hymns...")
with open(OUT_HYMNS, 'w', encoding='utf-8') as f:
    json.dump(hymns, f, ensure_ascii=False, indent=2)

all_sections = {}
for h in hymns:
    sec = h['section']
    sub = h['subtopic']
    if sec not in all_sections:
        all_sections[sec] = {'name': sec, 'subtopics': set(), 'padCount': 0}
    all_sections[sec]['padCount'] += 1
    if sub:
        all_sections[sec]['subtopics'].add(sub)

sections_list = [
    {'name': s, 'padCount': d['padCount'], 'subtopics': sorted(d['subtopics'])}
    for s, d in all_sections.items()
]
with open(OUT_SECTIONS, 'w', encoding='utf-8') as f:
    json.dump(sections_list, f, ensure_ascii=False, indent=2)

# ==================== STEP 8: Validation ====================
print("\n=== VALIDATION REPORT ===")
ids = [h['id'] for h in hymns]
if ids:
    missing_final = sorted(set(range(1, max(ids)+1)) - set(ids))
    print(f"Total pads extracted: {len(hymns)}")
    print(f"ID range: {min(ids)}–{max(ids)}")
    if missing_final:
        print(f"Missing {len(missing_final)} IDs (these have OCR-unreadable markers): {missing_final[:20]}{'...' if len(missing_final)>20 else ''}")
    else:
        print("OK: All pad IDs are consecutive.")
print(f"Sections: {len(sections_list)}")
print(f"Pads with raag: {sum(1 for h in hymns if h['raag'])}")
print(f"Pads with taal: {sum(1 for h in hymns if h['taal'])}")
print(f"Empty pads (no verses): {sum(1 for h in hymns if not h['verses'])}")
print("=== DONE ===")
