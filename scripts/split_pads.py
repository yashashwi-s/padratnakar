#!/usr/bin/env python3
"""
split_pads.py — Fix cross-pad content bleeding.

The master extraction grabbed full pages of text per pad. Many pads contain:
  - Tail content from the PREVIOUS pad (before our pad's raag line)
  - Beginning content from the NEXT pad (after the next [number] marker)

This script uses the fact that each pad in the OCR starts with either:
  1. A raag/taal line like (राग X-ताल Y) or (दोहा), or
  2. Directly with verse text

We use the pad markers [N] and raag lines to find the true start of each pad's content.
"""
import json
import re

HYMNS_PATH = 'src/data/hymns.json'

# Hindi digit conversion
HINDI_DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')

def hindi_to_int(s):
    try:
        return int(s.translate(HINDI_DIGITS))
    except:
        return None


def find_pad_start(verses, pad_id):
    """Find the index where this pad's actual content starts.

    Strategy:
    1. Look for a raag/taal line (starts with '(') that appears early
    2. The pad content starts at that raag line (or just before it if there's a title line)
    3. If no raag line, the first real verse is the start
    """
    # If first line is already a raag line, start is 0
    if verses and re.match(r'^\s*\(.+\)\s*$', verses[0].strip()):
        return 0

    # Look for the FIRST raag line in the first half of verses
    half = max(len(verses) // 2, 5)
    for i in range(min(half, len(verses))):
        line = verses[i].strip()
        if re.match(r'^\s*\(.+\)\s*$', line) and len(line) < 60:
            return i

    # No raag line found — assume content starts at index 0
    return 0


def find_pad_end(verses, start_idx):
    """Find where this pad's content ends (before next pad's content starts).

    Look for a raag line appearing after a gap of content, suggesting a new pad started.
    """
    # Look for raag lines that appear after the start
    last_valid = len(verses)

    for i in range(start_idx + 1, len(verses)):
        line = verses[i].strip()
        # A raag line appearing well after the start might be:
        # 1. Part of THIS pad (if it appears within the first few lines)
        # 2. Start of the NEXT pad (if it appears later)
        if re.match(r'^\s*\(.+\)\s*$', line) and len(line) < 60:
            # If this is more than 3 lines after start, and there's actual content
            # between start and here, check if lines BEFORE this look like a different
            # pad's ending (have verse endings ॥)
            if i > start_idx + 3:
                # Check if the line before this raag line is the end of current pad
                # or just a mid-pad raag indication
                prev_line = verses[i - 1].strip() if i > 0 else ''
                # If previous line ends with ॥ and next content looks like new pad, split here
                # But many pads have multiple raag lines (e.g., different tunes for different sections)
                # So we can't blindly split. We'll be conservative.
                pass

    return len(verses)


def main():
    print("Loading hymns...")
    with open(HYMNS_PATH, 'r') as f:
        hymns = json.load(f)
    print(f"  {len(hymns)} pads loaded")

    fixed = 0
    for hymn in hymns:
        verses = hymn['verses']
        if not verses:
            continue

        start = find_pad_start(verses, hymn['id'])

        if start > 0:
            # Remove the leaked previous-pad content
            removed = verses[:start]
            hymn['verses'] = verses[start:]
            fixed += 1

        # Update title from first non-raag verse
        for v in hymn['verses']:
            if not re.match(r'^\s*\(.+\)\s*$', v.strip()):
                hymn['title'] = v.strip()[:80]
                break

    print(f"  Fixed {fixed} pads (removed leading cross-pad content)")

    # Save
    with open(HYMNS_PATH, 'w', encoding='utf-8') as f:
        json.dump(hymns, f, ensure_ascii=False, indent=2)

    # Verify
    print("\n=== SPOT CHECKS ===")
    for check_id in [1, 2, 5, 255, 500, 1000, 1500, 1557, 1560]:
        pad = next((h for h in hymns if h['id'] == check_id), None)
        if pad:
            first_verse = pad['verses'][0][:60] if pad['verses'] else '(empty)'
            print(f"  Pad {check_id}: {len(pad['verses'])} verses → {first_verse}")

    print("\n=== DONE ===")


if __name__ == '__main__':
    main()
