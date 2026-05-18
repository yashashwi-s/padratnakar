import pymupdf
import json

doc = pymupdf.open('Pad-Ratnakar-Hindi.pdf')

data = []
# Pages 9 to 32 (0-indexed) are index 10 to 33 (1-indexed)
for p in range(9, 33):
    page = doc[p]
    blocks = page.get_text('dict')['blocks']
    for b in blocks:
        if 'lines' in b:
            for l in b['lines']:
                line_text = ""
                line_size = 0
                for s in l['spans']:
                    text = s['text'].strip()
                    if text:
                        line_text += text + " "
                        line_size = max(line_size, s['size'])
                
                line_text = line_text.strip()
                if line_text:
                    data.append({"size": round(line_size), "text": line_text})

with open('index_raw.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Saved to index_raw.json")
