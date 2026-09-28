"""Local proofreading decisions; no production text is changed automatically."""
import json, sqlite3, threading
from contextlib import contextmanager
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import fitz
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'data/collections/mahabhav-kallolini'
LOCAL=ROOT/'.review';LOCAL.mkdir(exist_ok=True)
DB=LOCAL/'text-decisions.sqlite3'
LOCK=threading.Lock()
@contextmanager
def connection():
 db=sqlite3.connect(DB)
 try:
  with db: yield db
 finally: db.close()
with connection() as db:
 db.execute('CREATE TABLE IF NOT EXISTS decisions(id TEXT PRIMARY KEY,text TEXT NOT NULL,status TEXT NOT NULL,updated TEXT DEFAULT CURRENT_TIMESTAMP)')
def items():return json.loads((DATA/'human-questions.json').read_text())
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def reply(self,body,kind='application/json',status=200):
  if isinstance(body,(dict,list)):body=json.dumps(body,ensure_ascii=False).encode()
  self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
 def do_GET(self):
  path=urlparse(self.path).path
  if path=='/':return self.reply((Path(__file__).parent/'index.html').read_bytes(),'text/html; charset=utf-8')
  if path in ['/api/items','/api/export']:
   with connection() as db: decisions={i:{'text':t,'status':s,'updated':u} for i,t,s,u in db.execute('SELECT * FROM decisions')}
   return self.reply({'items':items(),'decisions':decisions})
  if path.startswith('/crop/'):
   item=next((i for i in items() if i['id']==path[6:]),None)
   if not item:return self.reply({},status=404)
   with fitz.open(DATA/'source/booklet.pdf') as doc:
    page=doc[item['page']-1];rect=fitz.Rect(item['crop']) if item.get('crop') else page.rect
    image=page.get_pixmap(matrix=fitz.Matrix(3,3),clip=rect).tobytes('png')
   return self.reply(image,'image/png')
  self.reply({},status=404)
 def do_POST(self):
  if self.path!='/api/save':return self.reply({},status=404)
  # Reject cross-site writes; this service is bound to loopback only.
  origin=self.headers.get('Origin')
  if origin and origin!='http://'+self.headers.get('Host',''):return self.reply({},status=403)
  try:
   length=int(self.headers.get('Content-Length',0))
   if length>50000:raise ValueError()
   value=json.loads(self.rfile.read(length));ident=value['id'];text=value['text'];status=value['status']
   if ident not in {i['id'] for i in items()} or not isinstance(text,str) or status not in ['draft','approved','unsure']:raise ValueError()
   with LOCK,connection() as db:
    db.execute('INSERT INTO decisions(id,text,status) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET text=excluded.text,status=excluded.status,updated=CURRENT_TIMESTAMP',(ident,text,status))
   self.reply({'saved':True})
  except (ValueError,KeyError,TypeError):self.reply({'error':'Invalid decision'},status=400)
if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8767);args=p.parse_args()
 print(f'Text review: http://127.0.0.1:{args.port}',flush=True)
 ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
