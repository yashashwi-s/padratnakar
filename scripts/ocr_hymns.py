import pymupdf
import pytesseract
from PIL import Image
import io
import json
import os

def ocr_pages():
    pdf_path = "Pad-Ratnakar-Hindi.pdf"
    print("Converting PDF pages to images using PyMuPDF...")
    doc = pymupdf.open(pdf_path)
    
    text = ""
    # Get pages 70 to 73
    for page_num in range(70, 73):
        print(f"Running OCR on page {page_num+1}...")
        page = doc[page_num]
        pix = page.get_pixmap(dpi=300)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        page_text = pytesseract.image_to_string(img, lang='hin')
        text += page_text + "\n"
        
    print("Parsing OCR text...")
    # Save raw OCR text for debugging
    with open("ocr_raw.txt", "w", encoding="utf-8") as f:
        f.write(text)
        
    # We will do a basic parse into hymns.
    # Hymns might be numbered or separated by blank lines.
    # We will just treat the text as an array of paragraphs for the basic app.
    
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    hymns = []
    current_hymn = []
    
    for p in paragraphs:
        # If it looks like a number like "1-", it's a new hymn (but OCR might miss the number)
        # Let's just bundle every 4 paragraphs into a "hymn" or if it ends with "॥", start new.
        current_hymn.append(p)
        if "॥" in p or len(current_hymn) > 5:
            hymns.append({
                "id": len(hymns) + 1,
                "title": current_hymn[0][:30] + "...",
                "verses": current_hymn
            })
            current_hymn = []
            
    if current_hymn:
        hymns.append({
            "id": len(hymns) + 1,
            "title": current_hymn[0][:30] + "...",
            "verses": current_hymn
        })
        
    # Save to src/data/hymns.json
    os.makedirs("src/data", exist_ok=True)
    with open("src/data/hymns.json", "w", encoding="utf-8") as f:
        json.dump(hymns, f, ensure_ascii=False, indent=2)
        
    print("Saved hymns.json with", len(hymns), "hymns.")

if __name__ == "__main__":
    ocr_pages()
