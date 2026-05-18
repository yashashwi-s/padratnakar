from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTChar, LTTextLine

def extract_raw_codes(pdf_path, target_page):
    for i, page_layout in enumerate(extract_pages(pdf_path)):
        if i == target_page:
            raw_text = ""
            for element in page_layout:
                if isinstance(element, LTTextContainer):
                    for text_line in element:
                        if isinstance(text_line, LTTextLine):
                            for char in text_line:
                                if isinstance(char, LTChar):
                                    raw_text += char.get_text()
                            raw_text += "\n"
            print("--- RAW TEXT FROM PDFMINER ---")
            print(raw_text[:500])
            break

extract_raw_codes('Pad-Ratnakar-Hindi.pdf', 34)
