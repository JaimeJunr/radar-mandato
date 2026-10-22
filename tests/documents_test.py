import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from documents import ROOT, document_record, extract_pdf_pages, split_pages


class DocumentsTest(unittest.TestCase):
    def test_preserves_empty_pages_and_printed_page_numbers(self) -> None:
        pages = split_pages('Primeira\n\f\fTerceira\n\f')
        self.assertEqual(pages, [{'number': 1, 'text': 'Primeira'}, {'number': 2, 'text': ''},
                                 {'number': 3, 'text': 'Terceira'}])
        self.assertEqual(split_pages(''), [])

    def test_extracts_both_original_programs_with_pdf_page_numbers(self) -> None:
        for filename, count, phrase in [('bolsonaro-2018.pdf', 81, 'BRASIL'),
                                         ('lula-2022.pdf', 21, 'BRASIL')]:
            with self.subTest(filename=filename):
                pages = extract_pdf_pages(ROOT / 'dist' / 'documents' / filename)
                self.assertEqual(len(pages), count)
                self.assertIn(phrase, ' '.join(page['text'] for page in pages).upper())

    def test_rejects_non_pdf_instead_of_indexing_an_error_page(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'error.pdf'
            path.write_bytes(b'<html>Erro</html>')
            with self.assertRaisesRegex(ValueError, 'expected PDF signature'):
                extract_pdf_pages(path)

    def test_document_carries_official_provenance_and_checksum(self) -> None:
        person = {'id': '280000614517', 'name': 'JAIR BOLSONARO', 'electionYear': 2018,
                  'planSource': './documents/bolsonaro-2018.pdf', 'planPages': 81,
                  'archiveSource': 'https://cdn.tse.jus.br/programas.zip',
                  'archiveEntry': 'BR/programa.pdf'}
        record = document_record(person, ROOT / 'dist')
        pdf = ROOT / 'dist' / person['planSource']
        self.assertEqual(record['sha256'], hashlib.sha256(pdf.read_bytes()).hexdigest())
        self.assertEqual(record['archiveSource'], person['archiveSource'])
        self.assertEqual(record['candidateId'], person['id'])
        self.assertEqual(record['electionYear'], 2018)
        self.assertEqual(len(record['pages']), 81)

    def test_rejects_unexpected_page_count(self) -> None:
        person = {'id': '1', 'name': 'LULA', 'electionYear': 2022, 'planPages': 99,
                  'planSource': './documents/lula-2022.pdf', 'archiveSource': 'https://example.org',
                  'archiveEntry': 'plan.pdf'}
        with self.assertRaisesRegex(ValueError, 'received 21, expected 99'):
            document_record(person, ROOT / 'dist')

    def test_published_index_matches_both_original_pdfs(self) -> None:
        corpus = json.loads((ROOT / 'dist/documents/index.json').read_text())
        self.assertEqual({doc['electionYear'] for doc in corpus['documents']}, {2018, 2022})
        for document in corpus['documents']:
            pdf = ROOT / 'dist' / document['pdf']
            self.assertEqual(document['sha256'], hashlib.sha256(pdf.read_bytes()).hexdigest())
            self.assertEqual(document['pages'], extract_pdf_pages(pdf))


if __name__ == '__main__':
    unittest.main()
