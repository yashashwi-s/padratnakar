import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import re
import json
import os

pdf_path = 'Pad-Ratnakar-Hindi.pdf'
doc = fitz.open(pdf_path)

print("Starting OCR extraction. This may take a few minutes...")

full_text = ""

# The book content starts from PDF page 33 (0-indexed)
# We will process from page 33 to the end.
for i in range(33, doc.page_count):
    page = doc[i]
    pix = page.get_pixmap(dpi=300)
    img = Image.open(io.BytesIO(pix.tobytes()))
    
    # Run Tesseract
    text = pytesseract.image_to_string(img, lang='hin')
    
    # Filter out page numbers at top/bottom and 'पद-रत्नाकर' headers
    lines = text.split('\n')
    filtered_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        # Remove standalone numbers (page numbers)
        if stripped.isdigit():
            continue
        # Remove headers
        if 'रत्नाकर' in stripped and len(stripped) < 20:
            continue
        filtered_lines.append(stripped)
        
    full_text += "\n".join(filtered_lines) + "\n\n"
    if i % 10 == 0:
        print(f"Processed page {i} of {doc.page_count}")

# Save full text just in case
with open('ocr_full_dump.txt', 'w', encoding='utf-8') as f:
    f.write(full_text)

# Parse the text into pads
# We look for [१], [२]... using Hindi numerals
# Since OCR might sometimes mess up brackets, we can use a slightly robust regex
# E.g., [१], (१], [१), etc.
# Hindi numerals: ०१२३४५६७८९
# Let's map Hindi numerals to ints
hindi_to_int = str.maketrans('०१२३४५६७८९', '0123456789')

pad_pattern = re.compile(r'^[\[\(\{][०-९0-9]+[\]\)\}]', re.MULTILINE)

# We find all matches to split the string
matches = list(pad_pattern.finditer(full_text))

raw_pads = []
for i in range(len(matches)):
    start_idx = matches[i].end()
    end_idx = matches[i+1].start() if i + 1 < len(matches) else len(full_text)
    
    match_str = matches[i].group()
    # Extract just the number
    num_str = re.search(r'[०-९0-9]+', match_str).group()
    # Translate Hindi to standard if needed
    try:
        pad_num = int(num_str.translate(hindi_to_int))
    except ValueError:
        continue
        
    pad_raw = full_text[start_idx:end_idx].strip()
    raw_pads.append({
        "id": pad_num,
        "raw_text": pad_raw
    })

print(f"Found {len(raw_pads)} pads.")

# Now parse information.md to map topics
padToSectionMap = {}
if os.path.exists('information.md'):
    with open('information.md', 'r', encoding='utf-8') as f:
        for line in f:
            # - **Topic -> Subtopic**: Pads 1 to 50
            m = re.search(r'- \*\*(.+?)\*\*: Pads (\d+) to (\d+)', line)
            if m:
                full_topic = m.group(1)
                start_p = int(m.group(2))
                end_p = int(m.group(3))
                
                section = full_topic
                subtopic = None
                if '->' in full_topic:
                    parts = full_topic.split('->')
                    section = parts[0].strip()
                    subtopic = parts[1].strip()
                
                for p_id in range(start_p, end_p + 1):
                    padToSectionMap[p_id] = {"section": section, "subtopic": subtopic}

hymns = []
for pad in raw_pads:
    lines = pad['raw_text'].split('\n')
    raag = ""
    taal = ""
    verses = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Match Raag/Taal e.g. (राग भैरवी-ताल कहरवा) or (तर्ज लावनी-ताल कहरवा)
        if line.startswith('(') and ('राग' in line or 'ताल' in line or 'तर्ज' in line):
            clean_line = re.sub(r'[()]', '', line)
            parts = re.split(r'[-—–]', clean_line)
            for part in parts:
                if 'राग' in part or 'तर्ज' in part:
                    raag = part.replace('राग', '').replace('तर्ज', '').strip()
                elif 'ताल' in part:
                    taal = part.replace('ताल', '').strip()
                elif not raag:
                    raag = part.strip()
            continue
            
        verses.append(line)
        
    title = verses[0] if verses else ""
    
    sec_info = padToSectionMap.get(pad['id'], {"section": "अन्य", "subtopic": None})
    
    hymns.append({
        "id": pad['id'],
        "title": title,
        "section": sec_info['section'],
        "subtopic": sec_info['subtopic'],
        "raag": raag,
        "taal": taal,
        "verses": verses,
        "footnotes": []
    })

with open('src/data/hymns.json', 'w', encoding='utf-8') as f:
    json.dump(hymns, f, ensure_ascii=False, indent=2)

print(f"Saved {len(hymns)} pads to src/data/hymns.json")
