#!/usr/bin/env python3
"""
Perfect pad extractor for Pad-Ratnakar.
Processes the OCR full dump, fixes broken pad markers (spaces, pipes, etc.),
maps pads to sections from information.md, and outputs a highly structured hymns.json.
"""
import re
import json
import os

# ==================== Step 1: Load OCR Dump ====================
print("Loading OCR dump...")
with open('ocr_full_dump.txt', 'r', encoding='utf-8') as f:
    full_text = f.read()

# ==================== Step 2: Fix Pad Markers ====================
# OCR sometimes produces: [१२ ], [१२ |], [१२|], [१ ], etc.
# Normalise these to [N] where N is the Hindi number.
# A pad marker is a line that has ONLY a bracketed Hindi number (with possible junk).
print("Normalising pad markers...")

# Replace lines like "[१२ |]", "[१२ ]", "[१२|]" → "[१२]"
def fix_markers(text):
    # For each line, check if it looks like a pad marker
    lines = text.split('\n')
    fixed = []
    for line in lines:
        stripped = line.strip()
        # Match a line that is essentially: optional [ ( { , some hindi digits, optional spaces/pipes/| and ] ) }
        m = re.match(r'^[\[\(\{]([०-९\s]+)[\s\|।\]\)\}]*$', stripped)
        if m:
            digits = re.sub(r'\s+', '', m.group(1))  # remove any spaces inside
            if digits:
                fixed.append(f'[{digits}]')
                continue
        fixed.append(line)
    return '\n'.join(fixed)

full_text = fix_markers(full_text)

# ==================== Step 3: Split into Pads ====================
print("Splitting into pads...")

# Now split on pad markers that appear on their own line
# Pattern: beginning of line, [hindi_digits], end of line
# We build a list of (pad_num, text_block)
segments = re.split(r'(?m)^\[([०-९]+)\]$', full_text)
# segments is: [pre_text, num1, text1, num2, text2, ...]

hindi_to_int = str.maketrans('०१२३४५६७८९', '0123456789')

raw_pads = []
for i in range(1, len(segments), 2):
    num_str = segments[i]
    text_block = segments[i+1].strip() if (i+1) < len(segments) else ""
    try:
        pad_num = int(num_str.translate(hindi_to_int))
    except ValueError:
        continue
    # Only include pads in valid range 1-1600
    if 1 <= pad_num <= 1600:
        raw_pads.append({'id': pad_num, 'raw': text_block})

print(f"Found {len(raw_pads)} raw pads")

# ==================== Step 4: Load Section Map ====================
print("Loading section map...")
padToSection = {}
SECTION_FILE = 'information.md'
if os.path.exists(SECTION_FILE):
    with open(SECTION_FILE, 'r', encoding='utf-8') as f:
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
    print(f"WARNING: {SECTION_FILE} not found. All pads will be 'अन्य'.")

# ==================== Step 5: Parse Each Pad ====================
print("Parsing pads...")

def parse_pad(pad_id, raw_text):
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    
    raag = ""
    taal = ""
    verses = []
    footnotes = []
    in_footnote = False

    for line in lines:
        # Skip page headers/footers: "पद-रत्नाकर" and lone numbers
        if re.match(r'^[\d]+$', line):
            continue
        if 'रत्नाकर' in line and len(line) < 20:
            continue
        # Footnote detection: lines starting with * or ✦ 
        if line.startswith('*') or line.startswith('✦') or line.startswith('✥'):
            footnotes.append(line)
            in_footnote = True
            continue
        if in_footnote:
            footnotes.append(line)
            continue

        # Raag / Taal header: e.g. (राग भैरवी-ताल कहरवा) or (तर्ज लावनी-ताल कहरवा)
        raag_match = re.match(r'^\((.+?)\)$', line)
        if raag_match:
            inner = raag_match.group(1)
            # Could be raag or taal or both
            r_match = re.search(r'राग\s+([\w\s\-]+?)(?:\s*[–\-]\s*|$)', inner)
            t_match = re.search(r'ताल\s+([\w\s]+?)(?:\s*[–\-]\s*|$)', inner)
            j_match = re.search(r'तर्ज\s+([\w\s\-]+?)(?:\s*[–\-]\s*|$)', inner)
            if r_match:
                raag = r_match.group(1).strip()
            if t_match:
                taal = t_match.group(1).strip()
            if j_match and not raag:
                raag = j_match.group(1).strip()  # treat tarz as raag
            # Only skip this line if it clearly is raag/taal info
            if r_match or t_match or j_match:
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
seen_ids = set()
for rp in raw_pads:
    if rp['id'] in seen_ids:
        continue  # skip duplicates (page overlap)
    seen_ids.add(rp['id'])
    hymns.append(parse_pad(rp['id'], rp['raw']))

# Sort by pad number
hymns.sort(key=lambda h: h['id'])

# ==================== Step 6: Save ====================
print(f"Saving {len(hymns)} pads to src/data/hymns.json...")
with open('src/data/hymns.json', 'w', encoding='utf-8') as f:
    json.dump(hymns, f, ensure_ascii=False, indent=2)

# Build sections summary
all_sections = {}
for h in hymns:
    sec = h['section']
    sub = h['subtopic']
    if sec not in all_sections:
        all_sections[sec] = {'name': sec, 'subtopics': set(), 'padCount': 0}
    all_sections[sec]['padCount'] += 1
    if sub:
        all_sections[sec]['subtopics'].add(sub)

sections_list = []
for sec_name, sec_data in all_sections.items():
    sections_list.append({
        'name': sec_name,
        'padCount': sec_data['padCount'],
        'subtopics': sorted(list(sec_data['subtopics']))
    })

with open('src/data/sections.json', 'w', encoding='utf-8') as f:
    json.dump(sections_list, f, ensure_ascii=False, indent=2)

print(f"Saved {len(sections_list)} sections to src/data/sections.json")

# ==================== Step 7: Validation Report ====================
print("\n=== VALIDATION REPORT ===")
ids = [h['id'] for h in hymns]
expected = set(range(1, max(ids)+1))
actual = set(ids)
missing = expected - actual
if missing:
    print(f"WARNING: {len(missing)} missing pad IDs: {sorted(missing)[:20]}...")
else:
    print(f"OK: All {len(hymns)} pad IDs are consecutive from 1 to {max(ids)}")
print(f"Pads with no section assigned: {sum(1 for h in hymns if h['section'] == 'अन्य')}")
print(f"Pads with raag info: {sum(1 for h in hymns if h['raag'])}")
print(f"Pads with taal info: {sum(1 for h in hymns if h['taal'])}")
print("=== DONE ===")
