#!/usr/bin/env python3
"""
Rebuild hymns.json using:
  1. The existing master-extracted hymns.json (1564 pads with OCR text)
  2. The corrected index_map.json (hand-crafted topic/subtopic mapping)

This script does NOT re-run OCR. It only re-tags each pad with the correct
section and subtopic from the index map.
"""
import json
import os

HYMNS_PATH = 'src/data/hymns.json'
INDEX_MAP_PATH = 'src/data/index_map.json'
SECTIONS_PATH = 'src/data/sections.json'

# ── Load existing hymns ──────────────────────────────────────────────────────
print("Loading existing hymns...")
with open(HYMNS_PATH, 'r', encoding='utf-8') as f:
    hymns = json.load(f)
print(f"  Loaded {len(hymns)} pads (IDs {hymns[0]['id']}–{hymns[-1]['id']})")

# ── Load index map ───────────────────────────────────────────────────────────
print("Loading index map...")
with open(INDEX_MAP_PATH, 'r', encoding='utf-8') as f:
    index_map = json.load(f)

# ── Build pad→section/subtopic lookup ────────────────────────────────────────
pad_lookup = {}  # padId → { section, subtopic }

for topic in index_map['topics']:
    topic_name = topic['name']
    start, end = topic['startPad'], topic['endPad']

    # Build subtopic ranges first (more specific wins)
    subtopic_ranges = []
    for sub in topic.get('subtopics', []):
        subtopic_ranges.append((sub['startPad'], sub['endPad'], sub['name']))

    for pid in range(start, end + 1):
        # Check if this pad falls into a subtopic
        matched_subtopic = None
        for s_start, s_end, s_name in subtopic_ranges:
            if s_start <= pid <= s_end:
                matched_subtopic = s_name
                break

        pad_lookup[pid] = {
            'section': topic_name,
            'subtopic': matched_subtopic,
        }

print(f"  Index map covers pads {min(pad_lookup.keys())}–{max(pad_lookup.keys())}")

# ── Re-tag each hymn ─────────────────────────────────────────────────────────
print("Re-tagging hymns...")
untagged = 0
for hymn in hymns:
    pid = hymn['id']
    if pid in pad_lookup:
        hymn['section'] = pad_lookup[pid]['section']
        hymn['subtopic'] = pad_lookup[pid]['subtopic']
    else:
        hymn['section'] = 'अन्य'
        hymn['subtopic'] = None
        untagged += 1

if untagged:
    print(f"  WARNING: {untagged} pads not covered by index map")
else:
    print("  All pads successfully tagged")

# ── Save updated hymns ───────────────────────────────────────────────────────
print(f"Saving {len(hymns)} hymns...")
with open(HYMNS_PATH, 'w', encoding='utf-8') as f:
    json.dump(hymns, f, ensure_ascii=False, indent=2)

# ── Generate sections.json ───────────────────────────────────────────────────
sections_list = []
for topic in index_map['topics']:
    actual_pads = [h for h in hymns if h['section'] == topic['name']]
    entry = {
        'name': topic['name'],
        'padCount': len(actual_pads),
        'startPad': topic['startPad'],
        'endPad': topic['endPad'],
        'subtopics': []
    }
    for sub in topic.get('subtopics', []):
        sub_pads = [h for h in actual_pads if h['subtopic'] == sub['name']]
        entry['subtopics'].append({
            'name': sub['name'],
            'padCount': len(sub_pads),
            'startPad': sub['startPad'],
            'endPad': sub['endPad'],
        })
    sections_list.append(entry)

with open(SECTIONS_PATH, 'w', encoding='utf-8') as f:
    json.dump(sections_list, f, ensure_ascii=False, indent=2)

# ── Validation ───────────────────────────────────────────────────────────────
print("\n=== VALIDATION ===")
print(f"Total pads: {len(hymns)}")
print(f"Sections: {len(sections_list)}")
for sec in sections_list:
    subs_str = ""
    if sec['subtopics']:
        sub_names = [f"{s['name']} ({s['padCount']})" for s in sec['subtopics']]
        subs_str = f"  → {', '.join(sub_names)}"
    print(f"  {sec['name']}: {sec['padCount']} pads{subs_str}")

# Check pad 255 specifically (should be in मुरली-ध्वनि, NOT a separate section)
pad255 = next((h for h in hymns if h['id'] == 255), None)
if pad255:
    print(f"\nPad 255 check: section='{pad255['section']}', subtopic='{pad255['subtopic']}'")

ids = set(h['id'] for h in hymns)
missing = sorted(set(range(1, 1566)) - ids)
if missing:
    print(f"Missing pad IDs ({len(missing)}): {missing[:20]}{'...' if len(missing) > 20 else ''}")

print("=== DONE ===")
