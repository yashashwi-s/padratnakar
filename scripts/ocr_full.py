#!/usr/bin/env python3
"""
Full OCR extraction of Pad-Ratnakar PDF.
Extracts all hymns (pads) with section headers, raag/taal metadata, and footnotes.
Outputs src/data/hymns.json and src/data/sections.json
"""
import pymupdf
import pytesseract
from PIL import Image
import io
import json
import os
import re
import sys

PDF_PATH = "Pad-Ratnakar-Hindi.pdf"
# Content pages start at page 35 (0-indexed: 34) and go to the end
START_PAGE = 34
# Skip back-matter if any — we'll just go to the end
OUTPUT_HYMNS = "src/data/hymns.json"
OUTPUT_SECTIONS = "src/data/sections.json"

# Known section headers that appear as running headers in the PDF
SECTION_HEADERS = [
    "वन्दना एवं प्रार्थना",
    "श्रीराधा-माधव-स्वरूप-माधुरी",
    "श्रीकृष्ण-बाल-लीला-माधुरी",
    "श्रीराधा-माधव-लीला-माधुरी",
    "वृन्दावन-शोभा",
    "निकुंज-लीला",
    "गोपी-प्रेम",
    "आवनी-लीला",
    "मुरली-ध्वनि",
    "रस-लीला",
    "मिलन-लीला",
    "झूलन-लीला",
    "नौकाविहार",
    "होली-लीला",
    "प्रेमवैचित्त्य-लीला",
    "विरह एवं उद्धव-लीला",
    "मधुर-लीला",
    "विचित्र तरंगें",
    "श्रीकृष्ण के प्रेमोद्गार",
    "श्रीराधा के प्रेमोद्गार",
    "गोपिका-प्रेम",
    "प्रेम-तत्त्व",
    "भगवन्नाम-महिमा",
    "भगवान का स्वभाव",
    "श्रीमद्भगवद्गीता",
    "व्यवहार-परमार्थ",
    "अनुभूति",
    "स्तुति",
    "आरती",
    "पद-रत्नाकर",
]


def ocr_page(doc, page_num):
    """OCR a single page and return the text."""
    page = doc[page_num]
    pix = page.get_pixmap(dpi=300)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    text = pytesseract.image_to_string(img, lang='hin')
    return text


def detect_section(text, current_section):
    """Detect section header from page text."""
    for header in SECTION_HEADERS:
        if header in text:
            return header
    return current_section


def parse_pads_from_text(all_pages_text):
    """Parse the combined OCR text into structured pad objects."""
    hymns = []
    current_section = "वन्दना एवं प्रार्थना"
    
    # Pattern to detect pad numbers: [number] or number- at the start of a line
    # Examples: [85], [3], 85-छुड़ा दो..., [८५]
    pad_pattern = re.compile(
        r'^\s*\[?\s*(\d+)\s*\]?\s*$|'           # standalone number like [85] or 85
        r'^\s*\[?\s*(\d+)\s*\]?\s*\n\s*\(',      # number followed by raag line
        re.MULTILINE
    )
    
    # Pattern for raag/taal
    raag_pattern = re.compile(r'\((?:राग|तर्ज|राण)\s+(.+?)(?:—|-)(.+?)\)')
    
    # Split the entire text into chunks by pad-number markers
    # We'll iterate through pages and accumulate
    current_pad = None
    current_verses = []
    current_raag = ""
    current_taal = ""
    current_page = 0
    pad_id = 0
    
    for page_data in all_pages_text:
        page_num = page_data['page']
        text = page_data['text']
        
        # Detect section from running header
        section = detect_section(text, current_section)
        if section != current_section:
            current_section = section
        
        # Split into lines for processing
        lines = text.split('\n')
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            
            # Skip page numbers (standalone digits at top/bottom)
            if re.match(r'^\d{1,3}$', stripped):
                continue
            
            # Skip running headers like "✥पद-रत्नाकर✥" or "✥वन्दना एवं प्रार्थना✥"
            if '✥' in stripped or '+ पद-रत्नाकर +' in stripped or '* पद-रत्नाकर *' in stripped:
                continue
            
            # Detect pad number marker: [85] or [८५]
            pad_match = re.match(r'^\s*\[\s*(\d+)\s*\]\s*$', stripped)
            if not pad_match:
                # Try Devanagari numerals
                devanagari = stripped.replace('[', '').replace(']', '').strip()
                dev_num = devanagari_to_int(devanagari)
                if dev_num and dev_num > 0 and dev_num < 2000:
                    pad_match = True
                    pad_id_new = dev_num
                else:
                    pad_match = None
            else:
                pad_id_new = int(pad_match.group(1))
                pad_match = True
            
            if pad_match and pad_id_new > pad_id:
                # Save previous pad
                if current_verses:
                    hymns.append({
                        "id": pad_id,
                        "section": current_section,
                        "raag": current_raag,
                        "taal": current_taal,
                        "title": extract_title(current_verses),
                        "verses": current_verses,
                        "footnotes": [],
                        "page": current_page,
                    })
                
                pad_id = pad_id_new
                current_verses = []
                current_raag = ""
                current_taal = ""
                current_page = page_num + 1  # 1-indexed for display
                continue
            
            # Detect raag/taal line
            raag_match = raag_pattern.search(stripped)
            if raag_match:
                current_raag = raag_match.group(1).strip()
                current_taal = raag_match.group(2).strip()
                continue
            
            # Also detect simpler raag format: (राग भैरवी-ताल कहरवा)
            simple_raag = re.match(r'^\((.+)\)$', stripped)
            if simple_raag:
                parts = simple_raag.group(1)
                if 'राग' in parts or 'तर्ज' in parts or 'ताल' in parts:
                    # Try to split raag and taal
                    if '—' in parts:
                        r, t = parts.split('—', 1)
                    elif '-' in parts and 'ताल' in parts:
                        idx = parts.index('ताल')
                        r = parts[:idx].rstrip(' -')
                        t = parts[idx:]
                    else:
                        r = parts
                        t = ""
                    current_raag = r.strip()
                    current_taal = t.strip()
                    continue
            
            # Regular verse line — add to current pad
            if pad_id > 0:
                current_verses.append(stripped)
    
    # Don't forget the last pad
    if current_verses and pad_id > 0:
        hymns.append({
            "id": pad_id,
            "section": current_section,
            "raag": current_raag,
            "taal": current_taal,
            "title": extract_title(current_verses),
            "verses": current_verses,
            "footnotes": [],
            "page": current_page,
        })
    
    return hymns


def extract_title(verses):
    """Extract title from first verse line (first meaningful line)."""
    for v in verses:
        cleaned = v.strip()
        if cleaned and len(cleaned) > 5:
            # Take first line, truncate
            first_line = cleaned.split('\n')[0].split('॥')[0].split('।')[0]
            return first_line[:80].strip()
    return "—"


DEVANAGARI_DIGITS = {'०': 0, '१': 1, '२': 2, '३': 3, '४': 4,
                     '५': 5, '६': 6, '७': 7, '८': 8, '९': 9}

def devanagari_to_int(s):
    """Convert Devanagari numeral string to int, or None if not a valid number."""
    s = s.strip()
    if not s:
        return None
    result = 0
    for ch in s:
        if ch in DEVANAGARI_DIGITS:
            result = result * 10 + DEVANAGARI_DIGITS[ch]
        else:
            return None
    return result if result > 0 else None


def build_sections(hymns):
    """Build sections list from hymns data."""
    sections = {}
    for h in hymns:
        sec = h['section']
        if sec not in sections:
            sections[sec] = {"name": sec, "padCount": 0, "startId": h['id'], "endId": h['id']}
        sections[sec]["padCount"] += 1
        sections[sec]["endId"] = max(sections[sec]["endId"], h['id'])
    return list(sections.values())


def main():
    doc = pymupdf.open(PDF_PATH)
    total_pages = doc.page_count
    print(f"PDF has {total_pages} pages. OCR-ing pages {START_PAGE+1} to {total_pages}...")
    
    all_pages = []
    
    for page_num in range(START_PAGE, total_pages):
        if page_num % 10 == 0:
            print(f"  Processing page {page_num+1}/{total_pages}...", flush=True)
        
        try:
            text = ocr_page(doc, page_num)
            all_pages.append({"page": page_num, "text": text})
        except Exception as e:
            print(f"  WARNING: Failed to OCR page {page_num+1}: {e}", file=sys.stderr)
            continue
    
    print(f"OCR complete. Parsing {len(all_pages)} pages into pads...")
    
    hymns = parse_pads_from_text(all_pages)
    print(f"Found {len(hymns)} pads.")
    
    # Build sections
    sections = build_sections(hymns)
    print(f"Found {len(sections)} sections.")
    
    # Save
    os.makedirs("src/data", exist_ok=True)
    
    with open(OUTPUT_HYMNS, 'w', encoding='utf-8') as f:
        json.dump(hymns, f, ensure_ascii=False, indent=2)
    print(f"Saved {OUTPUT_HYMNS}")
    
    with open(OUTPUT_SECTIONS, 'w', encoding='utf-8') as f:
        json.dump(sections, f, ensure_ascii=False, indent=2)
    print(f"Saved {OUTPUT_SECTIONS}")
    
    # Print summary
    print("\n=== Summary ===")
    for sec in sections:
        print(f"  {sec['name']}: {sec['padCount']} pads (#{sec['startId']}–#{sec['endId']})")


if __name__ == "__main__":
    main()
