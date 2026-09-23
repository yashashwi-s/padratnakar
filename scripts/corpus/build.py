"""Rebuild accepted text, collection display data, and compact PDF layout assets."""
from integrate_pdf_decode import main as integrate
from build_collection_layout import main as collection
from extract_print_layout import main as layout

if __name__ == '__main__':
    integrate()
    collection()
    layout()
