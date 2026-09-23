import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('review_server', Path(__file__).resolve().parents[2] / 'tools/review/server.py')
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)

class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.original = review.LOCAL
        review.LOCAL = Path(self.directory.name)

    def tearDown(self):
        review.LOCAL = self.original
        self.directory.cleanup()

    def test_save_update_and_reopen_without_duplicate(self):
        review.save_review(1, {'comment': 'gap\nline 2', 'status': 'issue', 'viewport': {'width': 390}})
        review.save_review(2, {'comment': 'keep this', 'status': 'pending'})
        review.save_review(1, {'comment': 'revised', 'status': 'verified'})
        with review.database() as db:
            rows = db.execute('SELECT * FROM reviews ORDER BY pad').fetchall()
        self.assertEqual(len(rows), 2)
        self.assertEqual((rows[0]['comment'], rows[0]['status']), ('revised', 'verified'))
        self.assertEqual(rows[1]['comment'], 'keep this')

    def test_invalid_status_does_not_overwrite(self):
        review.save_review(1, {'comment': 'original', 'status': 'issue'})
        with self.assertRaises(ValueError):
            review.save_review(1, {'comment': 'bad', 'status': 'unknown'})
        with review.database() as db:
            self.assertEqual(db.execute('SELECT comment FROM reviews').fetchone()[0], 'original')

    def test_shared_and_continued_footnote_pages(self):
        self.assertIn(946, review.source_regions(1560))
        self.assertGreater(len(review.source_regions(1504)), 2)
        self.assertIn(82, review.source_regions(104))

    def test_crop_is_png_and_rejects_unrelated_page(self):
        self.assertTrue(review.render(1, 34, False).startswith(b'\x89PNG\r\n\x1a\n'))
        with self.assertRaises(ValueError):
            review.render(1, 1, False)

if __name__ == '__main__':
    unittest.main()
