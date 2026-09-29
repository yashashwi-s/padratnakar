#!/usr/bin/env python3
"""Assemble a Play handoff from verified signed artifacts; never copies secrets."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--release-dir', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
source, output = args.release_dir.resolve(), args.output.resolve()
if output.exists():
    raise SystemExit('Choose a new output directory; existing packets are never overwritten.')
if output.is_relative_to(root):
    raise SystemExit('Keep binary packets outside Git.')
version = json.loads((root / 'package.json').read_text())['version']
artifacts = [f'pad-ratnakar-{version}.apk', f'pad-ratnakar-{version}.aab']
hashes = dict(line.split()[::-1] for line in (source / 'SHA256SUMS.txt').read_text().splitlines())
for name in artifacts:
    if hashlib.sha256((source / name).read_bytes()).hexdigest() != hashes.get(name):
        raise SystemExit(f'Artifact checksum mismatch: {name}')
limits = {'title.txt': 30, 'short-description.txt': 80, 'full-description.txt': 4000}
counts = {}
for path in (root / 'release-assets/listing').glob('*/*.txt'):
    length = len(path.read_text().strip())
    if length > limits[path.name]:
        raise SystemExit(f'Listing too long: {path}: {length}')
    counts[str(path.relative_to(root / 'release-assets'))] = length
output.mkdir(parents=True)
for name in artifacts + ['signing-certificate.pem', 'SHA256SUMS.txt', 'RELEASE.md']:
    shutil.copy2(source / name, output / name)
shutil.copytree(root / 'release-assets/listing', output / 'listing')
shutil.copytree(root / 'docs/release', output / 'instructions')
(output / 'graphics').mkdir()
for name in ['play-icon-512.png', 'feature-graphic-1024x500.png']:
    shutil.copy2(root / 'release-assets' / name, output / 'graphics' / name)
shutil.copytree(root / 'release-assets/screenshots', output / 'reference-only-old-screenshots')
(output / 'START-HERE.txt').write_text('''Pad Ratnakar Play submission preparation\n\nUpload account: yashashwisinghania@gmail.com\n1. Read instructions/console-worksheet.md.\n2. Complete account purchase/identity/device verification yourself.\n3. Finalize public publisher/support/privacy details.\n4. Use the existing signing identity if Play must update external APK installs.\n5. Replace reference-only-old-screenshots with current phone captures.\n6. Upload the AAB to a closed test; share the APK only for direct distribution.\n7. Follow instructions/closed-testing.md and actual Console requirements.\n\nNothing is submitted or published by this packet. No private signing material is included.\n''')
(output / 'listing-validation.json').write_text(json.dumps(counts, ensure_ascii=False, indent=2) + '\n')
files = sorted(p for p in output.rglob('*') if p.is_file())
(output / 'PACKET-SHA256SUMS.txt').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(output)}\n' for p in files))
shutil.make_archive(str(output), 'zip', root_dir=output.parent, base_dir=output.name)
print(f'Prepared {output.name}.zip; {len(files)} files; all listing limits and artifact checksums passed.')
