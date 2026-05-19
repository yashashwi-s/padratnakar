#!/usr/bin/env python3
import json
import re

with open('src/data/hymns.json', 'r', encoding='utf-8') as f:
    hymns = json.load(f)

cleaned_pads = 0
for h in hymns:
    new_verses = []
    pad_cleaned = False
    
    for text in h['verses']:
        # Don't delete valid text
        if '(दोहा)' in text: 
            new_verses.append(text)
            continue
        if text.startswith('('): 
            new_verses.append(text)
            continue
        if 'रत्नाकर' in text: 
            new_verses.append(text)
            continue
        if text == 'स्वात्म-समर्पण': 
            new_verses.append(text)
            continue
            
        spaces = text.count(' ')
        words = text.split()
        short_words = sum(1 for w in words if len(w) <= 2)
        
        digits = len(re.findall(r'[\d०-९]', text))
        letters = len(re.findall(r'[अ-ह]', text))
        
        # Rule 1: High density of short gibberish words and digits
        if spaces >= 4 and short_words >= spaces * 0.5 and digits >= 2:
            print(f"Pad {h['id']} removed GARBAGE 1: {text}")
            pad_cleaned = True
            continue
            
        # Rule 2: Mostly digits, very few letters
        if digits >= 5 and letters < 15:
            print(f"Pad {h['id']} removed GARBAGE 2: {text}")
            pad_cleaned = True
            continue
            
        # Rule 3: Known specific garbage patterns from borders
        if 'हरे' in text and 'ट्रक' in text:
            print(f"Pad {h['id']} removed GARBAGE 3: {text}")
            pad_cleaned = True
            continue
            
        if 'अचुका जिला' in text or 'छत ला आवाज' in text:
            print(f"Pad {h['id']} removed GARBAGE 4: {text}")
            pad_cleaned = True
            continue
            
        # Rule 4: Pipe character which is an artifact of borders
        if '|' in text and letters < 20:
            print(f"Pad {h['id']} removed GARBAGE 5: {text}")
            pad_cleaned = True
            continue
            
        # If it survives, keep it
        new_verses.append(text)
        
    h['verses'] = new_verses
    
    # If the first verse changed, update the title
    if pad_cleaned and h['verses']:
        h['title'] = h['verses'][0][:80]
        cleaned_pads += 1

print(f"Cleaned {cleaned_pads} pads containing OCR artifacts.")

with open('src/data/hymns.json', 'w', encoding='utf-8') as f:
    json.dump(hymns, f, ensure_ascii=False, indent=2)

print("Saved clean JSON.")
