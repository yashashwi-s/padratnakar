import pymupdf
import pytesseract
import re
import json
import io
import os
import multiprocessing
from PIL import Image
from tqdm import tqdm

PDF_PATH = 'Pad-Ratnakar-Hindi.pdf'
INFO_PATH = 'src/data/index_map.json'
OUT_HYMNS = 'src/data/hymns.json'

def get_image_crop(doc, page_idx, y_start, y_end):
    page = doc[page_idx]
    zoom = 300 / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    rect = page.rect
    y_start = max(0, y_start - 10)
    y_end = min(rect.height, y_end)
    if y_start >= y_end: y_end = y_start + 1
    clip = pymupdf.Rect(0, y_start, rect.width, y_end)
    pix = page.get_pixmap(matrix=mat, clip=clip)
    return Image.open(io.BytesIO(pix.tobytes("png")))

def process_pad(args):
    pad_num, start_info, end_info = args
    # Open doc per process to avoid thread issues
    doc = pymupdf.open(PDF_PATH)
    start_page = start_info['page']
    start_y = start_info['y']
    
    if end_info:
        end_page = end_info['page']
        end_y = end_info['y']
    else:
        end_page = start_page
        end_y = doc[start_page].rect.height
        
    extracted_text = ""
    if start_page == end_page:
        img = get_image_crop(doc, start_page, start_y, end_y)
        extracted_text = pytesseract.image_to_string(img, lang='hin')
    else:
        img1 = get_image_crop(doc, start_page, start_y, doc[start_page].rect.height)
        extracted_text += pytesseract.image_to_string(img1, lang='hin') + "\n"
        for p in range(start_page + 1, end_page):
            img_mid = get_image_crop(doc, p, 50, doc[p].rect.height - 50)
            extracted_text += pytesseract.image_to_string(img_mid, lang='hin') + "\n"
        if end_y > 50:
            img_last = get_image_crop(doc, end_page, 50, end_y)
            extracted_text += pytesseract.image_to_string(img_last, lang='hin') + "\n"
            
    doc.close()
    return pad_num, extracted_text.strip()

if __name__ == '__main__':
    doc = pymupdf.open(PDF_PATH)
    pad_positions = {}
    for page_idx in range(33, doc.page_count):
        page = doc[page_idx]
        blocks = page.get_text('rawdict')['blocks']
        for b in blocks:
            if 'lines' not in b: continue
            for line in b['lines']:
                for span in line['spans']:
                    txt = ''.join(chr(c['c']) if isinstance(c['c'], int) else c['c'] for c in span['chars']).strip()
                    m = re.fullmatch(r'\[(\d{1,4})\]', txt)
                    if m:
                        pad_num = int(m.group(1))
                        if 1 <= pad_num <= 1600 and pad_num not in pad_positions:
                            pad_positions[pad_num] = {'page': page_idx, 'y': span['bbox'][1]}
    
    if 18 not in pad_positions: pad_positions[18] = {'page': 40, 'y': 350.0}
    found_pads = sorted(pad_positions.keys())
    doc.close()
    
    tasks = []
    for i in range(len(found_pads)):
        pad_num = found_pads[i]
        start_info = pad_positions[pad_num]
        end_info = pad_positions[found_pads[i+1]] if i + 1 < len(found_pads) else None
        tasks.append((pad_num, start_info, end_info))
        
    print(f"Starting multiprocessing OCR for {len(tasks)} pads...")
    raw_pads_text = {}
    with multiprocessing.Pool(processes=multiprocessing.cpu_count()) as pool:
        results = list(tqdm(pool.imap_unordered(process_pad, tasks), total=len(tasks)))
        
    for pad_num, txt in results:
        raw_pads_text[pad_num] = txt
        
    with open('raw_ocr_dump.json', 'w') as f:
        json.dump(raw_pads_text, f, ensure_ascii=False)
        
    print("Done multiprocessing OCR! Wrote to raw_ocr_dump.json")
