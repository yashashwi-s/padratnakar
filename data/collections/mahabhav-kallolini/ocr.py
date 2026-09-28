"""Resumable local OCR. Outputs are candidates, never approved canonical text."""
from pathlib import Path
import concurrent.futures, subprocess, os, json, hashlib, sys
import fitz
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'source/booklet.pdf'
HINDI='--hindi' in sys.argv or '--single-block' in sys.argv
SINGLE='--single-block' in sys.argv
RAW=ROOT/('hindi-block-ocr' if SINGLE else 'hindi-ocr' if HINDI else 'raw-ocr'); RAW.mkdir(exist_ok=True)
TMP=Path('/private/tmp/kallolini-pages'); TMP.mkdir(exist_ok=True)
def page_ocr(i):
    target=RAW/f'{i+1:03}'
    if target.with_suffix('.txt').exists() and target.with_suffix('.tsv').exists() and target.with_suffix('.tsv').stat().st_size > 0: return i+1
    doc=fitz.open(SOURCE); page=doc[i]
    pix=page.get_pixmap(matrix=fitz.Matrix(3,3),colorspace=fitz.csGRAY)
    image=TMP/f'{i+1:03}.png'; pix.save(image)
    subprocess.run(['tesseract',str(image),str(target),'-l','hin' if HINDI else 'hin+eng','--psm','6' if SINGLE else '3','txt','tsv'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,env={**os.environ,'OMP_THREAD_LIMIT':'1'})
    return i+1
if __name__=='__main__':
    doc=fitz.open(SOURCE)
    (ROOT/('hindi-block-pass.json' if SINGLE else 'hindi-pass.json' if HINDI else 'source.json')).write_text(json.dumps({'title':'महाभाव-कल्लोलिनी','pageCount':len(doc),'sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'status':'raw-ocr-unverified','method':f'Tesseract {"hin" if HINDI else "hin+eng"}, automatic segmentation, grayscale 216 dpi; page-level source coordinates in TSV','embeddedTextCharacters':sum(len(p.get_text()) for p in doc)},ensure_ascii=False,indent=2)+'\n')
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for number in pool.map(page_ocr,range(len(doc))): print(f'Page {number}/{len(doc)} saved',flush=True)
