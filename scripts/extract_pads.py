import pymupdf
import re
import json

doc = pymupdf.open('Pad-Ratnakar-Hindi.pdf')

# We'll collect text blocks from page 33 to the end, filtering out headers
full_text = ""
for i in range(33, doc.page_count):
    page = doc[i]
    blocks = page.get_text('dict')['blocks']
    for b in blocks:
        if 'lines' in b:
            block_text = ""
            for l in b['lines']:
                for s in l['spans']:
                    block_text += s['text'] + " "
                block_text += "\n"
            
            # Simple header/footer filtering
            bt_strip = block_text.strip()
            # Ignore simple page numbers
            if bt_strip.isdigit():
                continue
            # Ignore book title headers
            if '¬Œ-⁄UàŸÊ∑§⁄U' in bt_strip and len(bt_strip) < 20:
                continue
            
            full_text += block_text + "\n"

# Split into pads
# We look for [1], [2], etc. on a new line or at start
pad_splits = re.split(r'\[(\d+)\]', full_text)

pads = []
# pad_splits will be [pre-text, "1", text1, "2", text2, ...]
# pre-text is pad_splits[0]
for i in range(1, len(pad_splits), 2):
    pad_num = int(pad_splits[i])
    pad_raw = pad_splits[i+1].strip()
    
    pads.append({
        "id": pad_num,
        "raw_text": pad_raw
    })

with open('raw_pads.json', 'w', encoding='utf-8') as f:
    json.dump(pads, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(pads)} pads to raw_pads.json")
