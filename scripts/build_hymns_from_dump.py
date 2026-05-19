import json
import re

with open('raw_ocr_dump.json', 'r', encoding='utf-8') as f:
    raw_pads = json.load(f)

with open('src/data/index_map.json', 'r', encoding='utf-8') as f:
    index_map = json.load(f)

# Build section map
padToSection = {}
for topic in index_map['topics']:
    t_name = topic['name']
    for pid in range(topic['startPad'], topic['endPad'] + 1):
        padToSection[pid] = {'section': t_name, 'subtopic': None}
    for sub in topic.get('subtopics', []):
        for pid in range(sub['startPad'], sub['endPad'] + 1):
            padToSection[pid] = {'section': t_name, 'subtopic': sub['name']}

hymns = []
for pid_str, raw_text in sorted(raw_pads.items(), key=lambda x: int(x[0])):
    pid = int(pid_str)
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    
    verses = []
    raag = ""
    taal = ""
    
    for line in lines:
        line = re.sub(r'[◌○●□■◻◼⬜⬛▪▫]', '', line)
        line = re.sub(r'\s+', ' ', line).strip()
        if not line: continue
        
        # Generic ignores
        if re.match(r'^[\d०-९\s]{1,5}$', line): continue
        if 'रत्नाकर' in line and len(line) < 25: continue
        if re.match(r'^\s*\[[\s\d०-९\|\.]+[\]\|]\s*$', line): continue
        if re.match(r'^\s*[\+\*]\s*.+\s*[\+\*]\s*[\d०-९]*\s*$', line): continue
        
        # Valid exclusions
        if '(दोहा)' in line:
            verses.append(line)
            continue
        if line.startswith('('):
            verses.append(line)
            continue
        if line in ['स्वात्म-समर्पण']:
            verses.append(line)
            continue
            
        # Refined Heuristics for Garbage
        spaces = line.count(' ')
        words = line.split()
        short_gibberish = sum(1 for w in words if len(w) <= 2 and not re.match(r'^[अ-ह]+$', w))
        digits = len(re.findall(r'[\d०-९]', line))
        letters = len(re.findall(r'[अ-ह]', line))
        pipe = '|' in line
        
        suspicious = False
        if pipe and letters < 15: suspicious = True
        elif digits >= 3 and letters < 10: suspicious = True
        elif len(words) > 3 and short_gibberish >= len(words) * 0.5: suspicious = True
        elif '4(न' in line or 'हा अच्च' in line: suspicious = True
        
        if not suspicious:
            verses.append(line)
            
    # Extract Raag/Taal from first 2 lines
    lines_to_remove = []
    for i in range(min(2, len(verses))):
        v = verses[i]
        if '(दोहा)' in v:
            if not raag: raag = 'दोहा'
            lines_to_remove.append(i)
        else:
            m = re.search(r'\((.+?)\)', v)
            if m:
                inner = m.group(1)
                if 'राग' in inner or 'तर्ज' in inner:
                    r = re.search(r'(?:राग|तर्ज)\s+([^-–]+?)(?:[-–]|ताल|$)', inner)
                    t = re.search(r'ताल\s+([^-–]+?)(?:[-–]|$)', inner)
                    if r and not raag: raag = r.group(1).strip()
                    if t and not taal: taal = t.group(1).strip()
                    if r or t:
                        lines_to_remove.append(i)
                        
    for i in sorted(lines_to_remove, reverse=True):
        verses.pop(i)
        
    title = verses[0][:80] if verses else ""
    sec_info = padToSection.get(pid, {'section': 'अन्य', 'subtopic': None})
    
    hymns.append({
        'id': pid,
        'title': title,
        'section': sec_info['section'],
        'subtopic': sec_info['subtopic'],
        'raag': raag,
        'taal': taal,
        'verses': verses
    })

with open('src/data/hymns.json', 'w', encoding='utf-8') as f:
    json.dump(hymns, f, ensure_ascii=False, indent=2)

print("Parsed raw_ocr_dump.json into perfectly clean hymns.json!")
