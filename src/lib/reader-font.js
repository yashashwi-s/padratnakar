export const READER_FONT = '700 18px "Noto Serif Devanagari"';

// fonts.ready alone may resolve before React has requested the reader face.
export function loadReaderFont() {
  return document.fonts.load(READER_FONT, "श्रीराधा कृष्ण पद रत्नाकर");
}
