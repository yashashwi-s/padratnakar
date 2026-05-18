#!/usr/bin/env python3
"""
clean_hymns.py — Deep clean all hymn data.

This script:
1. Strips section headers (lines matching '+ TOPIC +' or '+ TOPIC * PAGE')
2. Strips leaked pad markers ([number]) from other pads on the same page
3. Strips the pad's OWN bracket marker (e.g., [५] for pad 5)
4. Extracts raag/taal from parenthetical lines like (राग बिहाग-तीन ताल)
5. Removes empty/whitespace-only lines
6. Removes page numbers and garbage
7. Generates a full audit report

Run: python3 scripts/clean_hymns.py
"""
import json
import re
import sys
import os

HYMNS_PATH = 'src/data/hymns.json'
AUDIT_PATH = 'data_audit.txt'

# ── Regex patterns ───────────────────────────────────────────────────────────

# Section header: starts with +, contains topic name, ends with + or * (optionally followed by page number)
RE_SECTION_HEADER = re.compile(
    r'^\s*[\+\*]\s*.+\s*[\+\*]\s*[\d०-९]*\s*$'
)

# Standalone bracket marker: [number] possibly with | or ] or space
RE_BRACKET_MARKER = re.compile(
    r'^\s*\[[\s\d०-९\|\.]+[\]\|]\s*$'
)

# Raag/Taal line: (राग ...) or (दोहा) or (धुन ...) etc.
RE_RAAG_LINE = re.compile(
    r'^\s*\((.+?)\)\s*$'
)

# Hindi numeral pad number at start of content (like [१५५७०] which is OCR for pad number)
RE_PAD_NUMBER_LINE = re.compile(
    r'^\s*[\[\(]?\s*[\d०-९]+\s*[\]\)\|]?\s*$'
)

# Lines that are just page numbers or short garbage
RE_PAGE_NUMBER = re.compile(
    r'^\s*[\d०-९\s\.\-]{1,10}\s*$'
)

# Garbage characters to remove from individual lines
RE_GARBAGE_CHARS = re.compile(r'[◌○●□■◻◼⬜⬛▪▫]')

# Hindi numerals map
HINDI_DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')

def hindi_to_int(s):
    """Convert Hindi numeral string to integer."""
    try:
        return int(s.translate(HINDI_DIGITS))
    except (ValueError, AttributeError):
        return None

def extract_raag_taal(line):
    """Extract raag and taal from a parenthetical line."""
    m = RE_RAAG_LINE.match(line.strip())
    if not m:
        return None, None

    content = m.group(1).strip()

    # Simple forms: (दोहा), (सोरठा), (चौपाई), etc.
    simple_forms = ['दोहा', 'सोरठा', 'चौपाई', 'कवित्त', 'सवैया',
                    'छन्द', 'पद', 'श्लोक', 'गीत', 'भजन']
    for form in simple_forms:
        if content == form:
            return None, None  # These are verse forms, not raag/taal

    raag = None
    taal = None

    # Pattern: "राग X-Y ताल" or "राग X-ताल Y" or just "राग X"
    # Also: "धुन X-ताल Y"
    content_lower = content.lower()

    # Try to find raag
    raag_match = re.search(r'(?:राग|रांग|धुन)\s+(.+?)(?:\s*[-–]\s*(?:ताल|तीन\s+ताल)|\s*$)', content)
    if raag_match:
        raag = raag_match.group(1).strip().rstrip('-–')

    # Try to find taal
    taal_match = re.search(r'(?:ताल|तीन\s+ताल)\s*(.*?)$', content)
    if taal_match:
        taal_val = taal_match.group(0).strip()
        if taal_val:
            taal = taal_val

    # If no specific raag match but line mentions "राग", extract the whole thing
    if not raag and 'राग' in content:
        raag = content

    return raag, taal


def is_section_header(line):
    """Check if a line is a section header (+ TOPIC + or + TOPIC * PAGE)."""
    stripped = line.strip()
    if not stripped:
        return False

    # Must contain both + and * or two +
    has_plus = '+' in stripped
    has_star = '*' in stripped

    if not (has_plus or has_star):
        return False

    # Check if it matches the pattern: starts with +/* and ends with +/*
    if RE_SECTION_HEADER.match(stripped):
        return True

    # Also catch: + TOPIC * (at start or end of line)
    if (stripped.startswith('+') or stripped.startswith('*')):
        if stripped.count('+') + stripped.count('*') >= 2:
            # But NOT if it's actual verse text with * for emphasis
            # Actual headers have the format: + NAME + or + NAME * NUMBER
            inner = stripped.lstrip('+* ').rstrip('+* ')
            # If inner text is very short or looks like a section name
            if len(inner) < 60 and not any(c in inner for c in '।॥'):
                return True

    return False


def is_bracket_marker(line):
    """Check if a line is just a pad number marker like [१] or [१५५७ |."""
    return bool(RE_BRACKET_MARKER.match(line.strip()))


def is_pad_number_line(line, pad_id):
    """Check if line is the pad's own number display."""
    stripped = line.strip()
    m = RE_PAD_NUMBER_LINE.match(stripped)
    if m:
        # Try to parse the number
        nums = re.findall(r'[\d०-९]+', stripped)
        for n in nums:
            val = hindi_to_int(n)
            if val and (val == pad_id or val == pad_id * 10 or val == pad_id + pad_id * 10):
                return True
        # If it's just a number < 2000 and matches approximately
        if nums:
            val = hindi_to_int(nums[0])
            if val and abs(val - pad_id) <= 2:
                return True
    return False


def is_garbage_line(line):
    """Check if a line is just garbage/whitespace/numbers."""
    stripped = line.strip()
    if not stripped:
        return True
    # Pure whitespace or very short non-Devanagari
    if len(stripped) <= 2:
        return True
    # Just numbers
    if RE_PAGE_NUMBER.match(stripped):
        return True
    return False


def clean_line(line):
    """Clean a single line of text."""
    # Remove garbage unicode chars
    line = RE_GARBAGE_CHARS.sub('', line)
    # Normalize whitespace
    line = re.sub(r'\s+', ' ', line).strip()
    return line


def has_legitimate_star_plus(line):
    """Check if * or + is used legitimately (emphasis in verse text)."""
    stripped = line.strip()
    # If it contains verse markers (।, ॥) it's probably real verse text
    if '।' in stripped or '॥' in stripped:
        return True
    # If it's long and contains real words, it's probably verse text
    words = stripped.split()
    if len(words) > 5:
        return True
    return False


def clean_pad(hymn):
    """Clean a single pad's data. Returns cleaned hymn dict + list of issues found."""
    pid = hymn['id']
    verses = hymn.get('verses', [])
    issues = []

    cleaned_verses = []
    raag = hymn.get('raag')
    taal = hymn.get('taal')
    found_raag_line = False

    for i, verse in enumerate(verses):
        original = verse
        line = clean_line(verse)

        if not line:
            continue

        # 1. Remove section headers
        if is_section_header(line):
            issues.append(f'  Removed section header: "{line}"')
            continue

        # 2. Remove bracket markers (other pads' numbers)
        if is_bracket_marker(line):
            issues.append(f'  Removed bracket marker: "{line}"')
            continue

        # 3. Check for pad's own number line
        if is_pad_number_line(line, pid):
            issues.append(f'  Removed pad number line: "{line}"')
            continue

        # 4. Extract raag/taal from parenthetical lines
        r, t = extract_raag_taal(line)
        if RE_RAAG_LINE.match(line) and (r or line.strip().startswith('(') and len(line.strip()) < 50):
            if r and not raag:
                raag = r
            if t and not taal:
                taal = t
            # Keep the raag line as the first verse for display
            if not found_raag_line:
                found_raag_line = True
                cleaned_verses.append(line)
            else:
                issues.append(f'  Removed duplicate raag line: "{line}"')
            continue

        # 5. Skip garbage lines
        if is_garbage_line(line):
            issues.append(f'  Removed garbage: "{line}"')
            continue

        # 6. Lines with + or * that aren't real verse text
        if ('+' in line or '*' in line) and not has_legitimate_star_plus(line):
            issues.append(f'  Removed +/* line: "{line}"')
            continue

        # Keep this line
        cleaned_verses.append(line)

    # Update hymn
    hymn_clean = {
        'id': pid,
        'section': hymn.get('section', ''),
        'subtopic': hymn.get('subtopic'),
        'raag': raag,
        'taal': taal,
        'title': '',
        'verses': cleaned_verses,
    }

    # Set title from first real verse line (skip raag line)
    for v in cleaned_verses:
        if not RE_RAAG_LINE.match(v):
            hymn_clean['title'] = v[:80]
            break

    return hymn_clean, issues


def main():
    print("Loading hymns...")
    with open(HYMNS_PATH, 'r', encoding='utf-8') as f:
        hymns = json.load(f)
    print(f"  Loaded {len(hymns)} pads")

    print("Cleaning...")
    cleaned = []
    all_issues = {}
    total_lines_removed = 0
    total_lines_before = 0
    total_lines_after = 0

    for hymn in hymns:
        before_count = len(hymn.get('verses', []))
        total_lines_before += before_count

        clean, issues = clean_pad(hymn)
        cleaned.append(clean)

        after_count = len(clean['verses'])
        total_lines_after += after_count
        removed = before_count - after_count
        total_lines_removed += removed

        if issues:
            all_issues[clean['id']] = issues

    # Save cleaned hymns
    print(f"Saving {len(cleaned)} cleaned pads...")
    with open(HYMNS_PATH, 'w', encoding='utf-8') as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    # Write audit report
    print(f"Writing audit report to {AUDIT_PATH}...")
    with open(AUDIT_PATH, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("PAD RATNAKAR DATA CLEANING AUDIT\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Total pads: {len(cleaned)}\n")
        f.write(f"Total verse lines before: {total_lines_before}\n")
        f.write(f"Total verse lines after: {total_lines_after}\n")
        f.write(f"Lines removed: {total_lines_removed}\n")
        f.write(f"Pads with changes: {len(all_issues)}\n\n")

        # Summary of clean pads (no issues)
        clean_pads = [h['id'] for h in cleaned if h['id'] not in all_issues]
        f.write(f"Clean pads (no changes needed): {len(clean_pads)}\n\n")

        f.write("-" * 80 + "\n")
        f.write("DETAILED CHANGES BY PAD\n")
        f.write("-" * 80 + "\n\n")

        for pid in sorted(all_issues.keys()):
            f.write(f"Pad {pid}:\n")
            for issue in all_issues[pid]:
                f.write(f"{issue}\n")
            f.write("\n")

        # Full content audit - every pad
        f.write("\n" + "=" * 80 + "\n")
        f.write("FULL CONTENT AUDIT (ALL PADS)\n")
        f.write("=" * 80 + "\n\n")

        for h in cleaned:
            f.write(f"--- Pad {h['id']} ---\n")
            f.write(f"Section: {h['section']}\n")
            if h['subtopic']:
                f.write(f"Subtopic: {h['subtopic']}\n")
            if h['raag']:
                f.write(f"Raag: {h['raag']}\n")
            if h['taal']:
                f.write(f"Taal: {h['taal']}\n")
            f.write(f"Verses ({len(h['verses'])}):\n")
            for v in h['verses']:
                f.write(f"  {v}\n")
            f.write("\n")

    # Print summary
    print(f"\n=== CLEANING SUMMARY ===")
    print(f"Total pads: {len(cleaned)}")
    print(f"Lines removed: {total_lines_removed} ({total_lines_before} → {total_lines_after})")
    print(f"Pads modified: {len(all_issues)}")

    # Spot check specific pads
    for check_id in [1, 5, 255, 500, 1000, 1500, 1557, 1560]:
        pad = next((h for h in cleaned if h['id'] == check_id), None)
        if pad:
            print(f"\nPad {check_id}: {len(pad['verses'])} verses, raag={pad.get('raag','')}")
            for v in pad['verses'][:3]:
                print(f"  {v[:80]}")

    print("\n=== DONE ===")
    print(f"Full audit written to: {AUDIT_PATH}")


if __name__ == '__main__':
    main()
