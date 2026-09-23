"""Local-only format review: actual built reader, PDF crops, durable comments."""
import argparse
import json
import mimetypes
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import lru_cache
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import fitz

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / '.review'
PDF = ROOT / 'data/source/Pad-Ratnakar-Hindi.pdf'
LOCK = threading.Lock()


@lru_cache(maxsize=16)
def chunk(number):
    return json.loads((ROOT / f'public/data/layout/{number}.json').read_text())


def layout(pad):
    return chunk((pad - 1) // 100 + 1)[str(pad)]


def source_regions(pad):
    record = layout(pad)
    regions = {}
    for page in record['pages']:
        regions.setdefault(page['pdfPage'], []).extend(line['bbox'] for line in page['lines'])
    notes = list(record['footnotes'])
    for ref in record.get('footnoteRefs', []):
        notes.extend(n for n in layout(ref['ownerPadId'])['footnotes'] if n['index'] == ref['noteIndex'])
    for note in notes:
        for span in note['sourceSpans']:
            regions.setdefault(span['page'], []).append(span['bbox'])
    return regions


@lru_cache(maxsize=64)
def render(pad, page, full):
    boxes = source_regions(pad).get(page)
    if not boxes:
        raise ValueError('Page does not belong to this pad')
    # PyMuPDF document access is serialized; each render owns its document.
    with LOCK, fitz.open(PDF) as document:
        source = document[page - 1]
        rect = source.rect
        if not full:
            rect = fitz.Rect(0, max(0, min(b[1] for b in boxes) - 28), rect.width,
                             min(rect.height, max(b[3] for b in boxes) + 12))
        return source.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), clip=rect, alpha=False).tobytes('png')


@contextmanager
def database():
    db = sqlite3.connect(LOCAL / 'reviews.sqlite3', timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('CREATE TABLE IF NOT EXISTS reviews (pad INTEGER PRIMARY KEY, comment TEXT NOT NULL, status TEXT NOT NULL, viewport TEXT NOT NULL, updated TEXT NOT NULL)')
    try:
        with db:
            yield db
    finally:
        db.close()


def save_review(pad, body):
    if body.get('status') not in ('pending', 'issue', 'verified'):
        raise ValueError('Invalid status')
    comment = body.get('comment', '')
    if not isinstance(comment, str) or len(comment) > 100000:
        raise ValueError('Invalid comment')
    viewport = json.dumps(body.get('viewport', {}), ensure_ascii=False)
    updated = datetime.now(timezone.utc).isoformat()
    with database() as db:
        db.execute('INSERT INTO reviews VALUES (?,?,?,?,?) ON CONFLICT(pad) DO UPDATE SET comment=excluded.comment,status=excluded.status,viewport=excluded.viewport,updated=excluded.updated',
                   (pad, comment, body['status'], viewport, updated))
    return {'saved': True, 'updated': updated}


class Handler(BaseHTTPRequestHandler):
    def send(self, body, kind='application/json', code=200):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store' if kind == 'application/json' else 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        try:
            if parsed.path == '/api/reviews':
                with database() as db:
                    rows = [dict(row) for row in db.execute('SELECT * FROM reviews ORDER BY pad')]
                self.send({'reviews': rows})
            elif parsed.path.startswith('/api/pad/'):
                pad = self.pad_id(parsed.path)
                record = layout(pad)
                self.send({'pad': pad, 'pages': sorted(source_regions(pad)), 'sourceHash': record['canonicalTextSha256']})
            elif parsed.path.startswith('/api/image/'):
                pad = self.pad_id(parsed.path)
                query = parse_qs(parsed.query)
                self.send(render(pad, int(query['page'][0]), query.get('full') == ['1']), 'image/png')
            elif parsed.path in ('/review', '/review/'):
                self.file(ROOT / 'tools/review/index.html')
            else:
                folder = ROOT / ('tools/review' if parsed.path.startswith('/review/') else 'dist')
                relative = parsed.path.removeprefix('/review/') if parsed.path.startswith('/review/') else parsed.path.lstrip('/')
                path = (folder / (relative or 'index.html')).resolve()
                if not path.is_relative_to(folder.resolve()):
                    raise ValueError('Invalid path')
                self.file(path)
        except (ValueError, KeyError, IndexError):
            self.send({'error': 'Invalid request'}, code=400)
        except FileNotFoundError:
            self.send({'error': 'File missing; run npm run build first'}, code=404)

    def file(self, path):
        self.send(path.read_bytes(), mimetypes.guess_type(path)[0] or 'application/octet-stream')

    def pad_id(self, path):
        pad = int(path.rsplit('/', 1)[-1])
        if not 1 <= pad <= 1565:
            raise ValueError('Invalid pad')
        return pad

    def do_POST(self):
        # No remote clients or cross-origin writes to the local notebook.
        origin = self.headers.get('Origin')
        if origin and origin != f'http://{self.headers.get("Host")}':
            return self.send({'error': 'Local review only'}, code=403)
        try:
            if not self.path.startswith('/api/review/'):
                raise ValueError('Invalid path')
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 200000:
                raise ValueError('Invalid size')
            self.send(save_review(self.pad_id(self.path), json.loads(self.rfile.read(length))))
        except (ValueError, KeyError, TypeError):
            self.send({'error': 'Invalid review'}, code=400)
        except sqlite3.Error:
            self.send({'error': 'Could not save review to disk'}, code=500)

    def log_message(self, *_):
        pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8766)
    parser.add_argument('--data-dir', type=Path, default=LOCAL)
    args = parser.parse_args()
    LOCAL = args.data_dir
    LOCAL.mkdir(parents=True, exist_ok=True)
    print(f'Review: http://127.0.0.1:{args.port}/review/', flush=True)
    print(f'Comments: {LOCAL / "reviews.sqlite3"}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
