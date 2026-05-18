import pymupdf
import sys
import os

def extract_all_text(pdf_path, output_path):
    print(f"Extracting from {pdf_path}...")
    try:
        doc = pymupdf.open(pdf_path)
    except Exception as e:
        print(f"Error opening {pdf_path}: {e}")
        return
    
    with open(output_path, 'w', encoding='utf-8') as f:
        # We will loop through all pages
        # Hymns usually start from a certain page, but we can extract all and clean later.
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            # Add a delimiter for pages
            f.write(f"--- PAGE {page_num + 1} ---\n")
            f.write(text)
            f.write("\n")
            
    print(f"Extraction complete! Saved to {output_path}")

if __name__ == "__main__":
    pdf_file = "Pad-Ratnakar-Hindi.pdf"
    if not os.path.exists(pdf_file):
        print("PDF not found in current directory.")
        sys.exit(1)
        
    extract_all_text(pdf_file, "raw_text.txt")
