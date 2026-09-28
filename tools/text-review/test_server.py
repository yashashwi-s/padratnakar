import importlib.util,io,json,sqlite3,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('review_server',Path(__file__).with_name('server.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class SavingTest(unittest.TestCase):
 def test_save_reload_and_reject_unknown(self):
  with tempfile.TemporaryDirectory() as tmp:
   original=m.DB;m.DB=Path(tmp)/'test.sqlite'
   try:
    with m.connection() as db:db.execute('CREATE TABLE decisions(id TEXT PRIMARY KEY,text TEXT NOT NULL,status TEXT NOT NULL,updated TEXT DEFAULT CURRENT_TIMESTAMP)')
    item=m.items()[0]
    def request(value):
     body=json.dumps(value).encode();h=object.__new__(m.Handler);h.path='/api/save';h.headers={'Content-Length':str(len(body)),'Host':'127.0.0.1:8767','Origin':'http://127.0.0.1:8767'};h.rfile=io.BytesIO(body);out=[];h.reply=lambda body,kind=None,status=200:out.append((status,body));h.do_POST();return out
    self.assertEqual(request({'id':item['id'],'text':'परीक्षण','status':'draft'})[0][0],200)
    self.assertEqual(request({'id':item['id'],'text':'सुधार','status':'approved'})[0][0],200)
    with m.connection() as db:self.assertEqual(db.execute('SELECT text,status FROM decisions').fetchone(),('सुधार','approved'))
    self.assertEqual(request({'id':'missing','text':'x','status':'approved'})[0][0],400)
   finally:m.DB=original
if __name__=='__main__':unittest.main()
