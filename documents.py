"""Indexa os PDFs oficiais por página, preservando a fonte e a integridade."""
import hashlib
import json
import subprocess
from pathlib import Path
from typing import TypedDict

ROOT = Path(__file__).parent


class PdfPage(TypedDict):
    number: int
    text: str


class PlanCandidate(TypedDict):
    id: str
    name: str
    electionYear: int
    planSource: str
    planPages: int
    archiveSource: str
    archiveEntry: str


class PlanDocument(TypedDict):
    candidateId: str
    name: str
    electionYear: int
    pdf: str
    archiveSource: str
    archiveEntry: str
    sha256: str
    pages: list[PdfPage]


def split_pages(text: str) -> list[PdfPage]:
    if not text:
        return []
    chunks = text.split('\f')
    if chunks[-1] == '':
        chunks.pop()
    return [{'number': number, 'text': chunk.strip()} for number, chunk in enumerate(chunks, 1)]


def extract_pdf_pages(path: Path) -> list[PdfPage]:
    signature = path.read_bytes()[:5]
    if signature != b'%PDF-':
        raise ValueError(f'invalid document: received {signature!r}, expected PDF signature')
    extracted = subprocess.run(['pdftotext', '-layout', '-enc', 'UTF-8', str(path), '-'],
                               check=True, capture_output=True, encoding='utf-8')
    return split_pages(extracted.stdout)


def document_record(person: PlanCandidate, public_root: Path) -> PlanDocument:
    path = public_root / person['planSource']
    pages = extract_pdf_pages(path)
    if len(pages) != person['planPages']:
        raise ValueError(f"invalid page count: received {len(pages)}, expected {person['planPages']}")
    return {'candidateId': person['id'], 'name': person['name'], 'electionYear': person['electionYear'],
            'pdf': person['planSource'], 'archiveSource': person['archiveSource'],
            'archiveEntry': person['archiveEntry'], 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'pages': pages}


def index_documents(public_root: Path) -> None:
    people: list[PlanCandidate] = json.loads((public_root / 'historical.json').read_text())['people']
    documents = [document_record(person, public_root) for person in people]
    corpus = {'schemaVersion': 1, 'extractor': 'pdftotext -layout -enc UTF-8',
              'note': 'Texto extraído automaticamente; página é a posição no PDF. Confira o original. Não são promessas nem avaliações.',
              'documents': documents}
    target = public_root / 'documents' / 'index.json'
    target.write_text(json.dumps(corpus, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(documents)} documentos, {sum(len(doc["pages"]) for doc in documents)} páginas: {target}')


if __name__ == '__main__':
    index_documents(ROOT / 'dist')
