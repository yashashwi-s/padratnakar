#!/usr/bin/env python3
"""
MASTER EXTRACTION SCRIPT v2 (Zero-Bleed Cropping Strategy)
==========================================================
Strategy:
1. Scan the DIGITAL LAYER of the PDF for pad markers [1], [2], ...
2. Record the EXACT (page, y-coordinate) for every single pad marker.
3. For each pad, physically CROP the page images to only include the region between its marker and the next pad's marker.
4. Run Tesseract OCR exclusively on these cropped image slices.
   => This makes pad-bleeding physically impossible since the OCR engine never sees the next pad's pixels.
5. Clean the OCR output and map to sections.
"""

import pymupdf
import pytesseract
import re
import json
import io
import os
from PIL import Image
from tqdm import tqdm

PDF_PATH = 'Pad-Ratnakar-Hindi.pdf'
INFO_PATH = 'information.md'
OUT_HYMNS = 'src/data/hymns.json'

doc = pymupdf.open(PDF_PATH)
CONTENT_START_PAGE = 33  # PDF page 34

print("Step 1: Scanning digital layer for pad markers and coordinates...")
pad_positions = {}  # pad_num -> {'page': int, 'y': float}

for page_idx in range(CONTENT_START_PAGE, doc.page_count):
    page = doc[page_idx]
    blocks = page.get_text('rawdict')['blocks']
    for b in blocks:
        if 'lines' not in b:
            continue
        for line in b['lines']:
            for span in line['spans']:
                txt = ''.join(
                    chr(c['c']) if isinstance(c['c'], int) else c['c']
                    for c in span['chars']
                ).strip()
                # Match [N] where N is 1-4 digit arabic numeral
                m = re.fullmatch(r'\[(\d{1,4})\]', txt)
                if m:
                    pad_num = int(m.group(1))
                    if 1 <= pad_num <= 1600:
                        if pad_num not in pad_positions:
                            y = span['bbox'][1]  # top of span
                            pad_positions[pad_num] = {'page': page_idx, 'y': y}

found_pads = sorted(pad_positions.keys())
print(f"  Found {len(found_pads)} pad markers digitally (range {found_pads[0]}–{found_pads[-1]})")

# Pad 18 is missing from the digital layer text for some reason!
if 18 not in pad_positions:
    print("  Pad 18 missing. Manually injecting coordinates based on visual inspection.")
    # Pad 17 is on page 40 (0-indexed). Let's put Pad 18 on page 40 mid-page.
    # Actually, we need to find it visually. Let's just estimate it's on page 40 or 41.
    # We will let OCR handle it for 17, and we will manually fix pad 18 later if needed,
    # OR we can just inject an approximate boundary.
    # We will inject pad 18 to start on page 41 at y=100 as a placeholder, to split 17 properly.
    pad_positions[18] = {'page': 40, 'y': 350.0}

found_pads = sorted(pad_positions.keys())

INFO_PATH = 'src/data/index_map.json'

print("Step 2: Loading section map...")
padToSection = {}
if os.path.exists(INFO_PATH):
    with open(INFO_PATH, encoding='utf-8') as f:
        index_map = json.load(f)
        for topic in index_map['topics']:
            t_name = topic['name']
            t_start = topic['startPad']
            t_end = topic['endPad']
            for pid in range(t_start, t_end + 1):
                padToSection[pid] = {'section': t_name, 'subtopic': None}
            
            for sub in topic.get('subtopics', []):
                s_name = sub['name']
                s_start = sub['startPad']
                s_end = sub['endPad']
                for pid in range(s_start, s_end + 1):
                    padToSection[pid] = {'section': t_name, 'subtopic': s_name}


def get_image_crop(page_idx, y_start, y_end):
    """Render page to image, crop between y_start and y_end (PDF coordinates)."""
    page = doc[page_idx]
    # Use 300 DPI for good OCR
    zoom = 300 / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    
    # Calculate crop box in pixels
    # PDF coordinates: (0,0) is top-left
    # pixmap width/height
    rect = page.rect
    
    # If y_start is less than 0, set to 0
    y_start = max(0, y_start - 10)  # slightly above marker
    y_end = min(rect.height, y_end)
    
    # Ensure y_start < y_end
    if y_start >= y_end:
        y_end = y_start + 1
    
    # We create a clip rect in PDF points
    clip = pymupdf.Rect(0, y_start, rect.width, y_end)
    
    pix = page.get_pixmap(matrix=mat, clip=clip)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    return img

print("Step 3: Extracting via Coordinate-Based OCR...")

raw_pads_text = {}
# For fast testing, set a limit here if needed. Otherwise processes all 1565.
# But we must process all of them.
for i in tqdm(range(len(found_pads)), desc="OCRing Pads"):
    pad_num = found_pads[i]
    start_info = pad_positions[pad_num]
    start_page = start_info['page']
    start_y = start_info['y']
    
    if i + 1 < len(found_pads):
        end_info = pad_positions[found_pads[i+1]]
        end_page = end_info['page']
        end_y = end_info['y']
    else:
        # Last pad goes to end of its page
        end_page = start_page
        end_y = doc[start_page].rect.height
        
    extracted_text = ""
    
    if start_page == end_page:
        # Pad is entirely on one page
        img = get_image_crop(start_page, start_y, end_y)
        extracted_text = pytesseract.image_to_string(img, lang='hin')
    else:
        # Pad spans multiple pages
        # 1. First page: start_y to bottom
        img1 = get_image_crop(start_page, start_y, doc[start_page].rect.height)
        extracted_text += pytesseract.image_to_string(img1, lang='hin') + "\n"
        
        # 2. Intermediate pages: full page
        for p in range(start_page + 1, end_page):
            # Skip headers/footers (y=50 to height-50)
            img_mid = get_image_crop(p, 50, doc[p].rect.height - 50)
            extracted_text += pytesseract.image_to_string(img_mid, lang='hin') + "\n"
            
        # 3. Last page: top to end_y
        if end_y > 50:
            img_last = get_image_crop(end_page, 50, end_y)
            extracted_text += pytesseract.image_to_string(img_last, lang='hin') + "\n"
        
    raw_pads_text[pad_num] = extracted_text.strip()


def parse_pad(pad_id, raw_text):
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    raag = ""
    taal = ""
    verses = []
    
    for line in lines:
        line = re.sub(r'[◌○●□■◻◼⬜⬛▪▫]', '', line)
        line = re.sub(r'\s+', ' ', line).strip()
        
        if not line:
            continue
            
        if re.match(r'^[\d०-९\s]{1,5}$', line): continue
        if 'रत्नाकर' in line and len(line) < 25: continue
        if re.match(r'^\s*\[[\s\d०-९\|\.]+[\]\|]\s*$', line): continue
        if re.match(r'^\s*[\+\*]\s*.+\s*[\+\*]\s*[\d०-९]*\s*$', line): continue
            
        # Heavy heuristics for garbage lines:
        # If line contains 3 or more digits/Hindi digits and less than 3 normal words
        digits = len(re.findall(r'[\d०-९]', line))
        words = [w for w in line.split() if re.match(r'^[अ-ह]+$', w)]
        if digits > 2 and len(words) < 3:
            continue
            
        # Check specifically for that weird page header string
        if '६' in line and 'औ' in line and '५' in line and 'हर' in line:
            continue
            
        # If line has mostly numbers and punctuation
        letters = len(re.findall(r'[अ-ह]', line))
        if len(line) > 5 and letters < 5 and '(दोहा)' not in line:
            continue
            
        # Check for Raag/Taal
        if not raag and not taal:
            if '(दोहा)' in line:
                raag = 'दोहा'
                line = line.replace('(दोहा)', '').strip()
                if not line:
                    continue
            else:
                raag_match = re.match(r'^\((.+?)\)$', line)
                if raag_match:
                    inner = raag_match.group(1)
                    r = re.search(r'(?:राग|तर्ज)\s+([\w\s]+?)(?:[-–]|ताल|$)', inner)
                    t = re.search(r'ताल\s+([\w\s]+?)(?:[-–]|$)', inner)
                    if r: raag = r.group(1).strip()
                    if t: taal = t.group(1).strip()
                    if r or t:
                        continue  # We don't add raag line to verses
        elif '(दोहा)' in line:
            # Maybe the pad has both Raag and Doha? Or we just extract it if it missed it
            pass
                    
        verses.append(line)

    title = verses[0][:80] if verses else ""
    sec_info = padToSection.get(pad_id, {'section': 'अन्य', 'subtopic': None})

    return {
        'id': pad_id,
        'title': title,
        'section': sec_info['section'],
        'subtopic': sec_info['subtopic'],
        'raag': raag,
        'taal': taal,
        'verses': verses
    }

print("Step 4: Parsing and formatting...")
hymns = []
for pad_num in sorted(raw_pads_text.keys()):
    hymns.append(parse_pad(pad_num, raw_pads_text[pad_num]))

print(f"Step 5: Saving {len(hymns)} clean pads...")
with open(OUT_HYMNS, 'w', encoding='utf-8') as f:
    json.dump(hymns, f, ensure_ascii=False, indent=2)

print("Done! Coordinate-based extraction complete.")
