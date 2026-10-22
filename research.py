"""Coleta reproduzível de dados públicos; não classifica cumprimento de promessas."""
import csv
import io
import json
import unicodedata
import urllib.request
import zipfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

Record = dict[str, Any]
ROOT = Path(__file__).parent
TSE = 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/'
ELECTION_SOURCE = 'https://dadosabertos.tse.jus.br/dataset/candidatos-2026'
PB_SOURCE = 'https://www12.senado.leg.br/noticias/materias/2026/10/04/joao-azevedo-e-veneziano-sao-eleitos-senadores-pela-paraiba'
PB_IDS = {'150002544905', '150002549793'}
OFFICES = {'SENADOR': 'Senado', 'DEPUTADO FEDERAL': 'Deputado federal',
           'DEPUTADO ESTADUAL': 'Deputado estadual', 'DEPUTADO DISTRITAL': 'Deputado distrital',
           'PRESIDENTE': 'Presidência'}


def select_candidates(rows: list[Record]) -> list[Record]:
    selected: dict[str, Record] = {}
    for row in rows:
        is_pb = row['SQ_CANDIDATO'] in PB_IDS and row['SG_UF'] == 'PB' and row['DS_CARGO'] == 'SENADOR'
        is_president = row['DS_CARGO'] == 'PRESIDENTE' and row['NM_URNA_CANDIDATO'] in {'LULA', 'FLAVIO BOLSONARO'}
        is_elected = row['DS_CARGO'] in OFFICES and row['DS_SIT_TOT_TURNO'].startswith('ELEITO')
        if is_pb or is_president or is_elected:
            selected.setdefault(row['SQ_CANDIDATO'], row | {'electionSource': PB_SOURCE if is_pb else ELECTION_SOURCE})
    return list(selected.values())


def normalize_name(name: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', name.upper()) if not unicodedata.combining(c)).strip()


def match_parliamentarian(person: Record, roster: list[Record]) -> Record | None:
    names = {normalize_name(person['name']), normalize_name(person['fullName'])} - {''}
    matches = [p for p in roster if p['state'] == person['state'] and names.intersection(
        {normalize_name(p['name']), normalize_name(p['fullName'])} - {''})]
    return matches[0] if len(matches) == 1 else None


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={'Accept': 'application/json,*/*'})
    return urllib.request.urlopen(request).read()


def fetch_json(url: str) -> Any:
    return json.loads(fetch_bytes(url))


def zip_rows(url: str, filename: str) -> list[Record]:
    archive = zipfile.ZipFile(io.BytesIO(fetch_bytes(url)))
    return list(csv.DictReader(io.TextIOWrapper(archive.open(filename), encoding='latin-1'), delimiter=';'))


def paginated_chamber(url: str) -> list[Record]:
    records: list[Record] = []
    while url:
        response = fetch_json(url)
        records.extend(response['dados'])
        url = next((link['href'] for link in response['links'] if link['rel'] == 'next'), '')
    return records


def current_rosters() -> list[Record]:
    chamber = paginated_chamber('https://dadosabertos.camara.leg.br/api/v2/deputados?itens=100')
    senate = fetch_json('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json')
    roster = [{'name': p['nome'], 'fullName': '', 'state': p['siglaUf'], 'id': str(p['id']), 'house': 'Câmara'} for p in chamber]
    for item in senate['ListaParlamentarEmExercicio']['Parlamentares']['Parlamentar']:
        p = item['IdentificacaoParlamentar']
        roster.append({'name': p['NomeParlamentar'], 'fullName': p['NomeCompletoParlamentar'],
                       'state': p['UfParlamentar'], 'id': p['CodigoParlamentar'], 'house': 'Senado'})
    return roster


def person_from_candidate(row: Record) -> Record:
    return {'id': row['SQ_CANDIDATO'], 'name': row['NM_URNA_CANDIDATO'], 'fullName': row['NM_CANDIDATO'],
            'office': OFFICES[row['DS_CARGO']], 'state': row['SG_UF'], 'party': row['SG_PARTIDO'],
            'number': row['NR_CANDIDATO'], 'result': 'Disputa presidencial' if row['DS_CARGO'] == 'PRESIDENTE' else 'Eleito em 2026',
            'electionSource': row['electionSource'], 'socialSources': [], 'history': [],
            'campaignStatus': 'Pesquisa de promessas pendente', 'historyStatus': 'Histórico individual ainda não coletado'}


def collect_history(person: Record) -> Record:
    member = person.get('member')
    if not member:
        return person
    house, identifier = member['house'], member['id']
    source = (f'https://dadosabertos.camara.leg.br/api/v2/proposicoes?idDeputadoAutor={identifier}&ano=2026&itens=100'
              if house == 'Câmara' else f'https://legis.senado.leg.br/dadosabertos/processo?codigoParlamentarAutor={identifier}&ano=2026')
    person['historySource'] = source
    try:
        entries = paginated_chamber(source) if house == 'Câmara' else fetch_json(source)
        person['history'] = [history_entry(p, house) for p in entries if '2026-01-01' <= str(p.get('dataApresentacao', ''))[:10] <= '2026-10-21']
        person['historyStatus'] = 'Consulta oficial concluída · recorte 2026'
    except Exception as error:
        person['historyStatus'] = f'Coleta indisponível ({type(error).__name__})'
    return person


def history_entry(entry: Record, house: str) -> Record:
    if house == 'Câmara':
        return {'id': f"camara-{entry['id']}", 'title': f"{entry['siglaTipo']} {entry['numero']}/{entry['ano']}",
                'description': entry.get('ementa', ''), 'date': entry.get('dataApresentacao', '')[:10],
                'source': f"https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao={entry['id']}",
                'status': 'Consultar tramitação', 'authorship': 'Autoria ou coautoria conforme filtro oficial da Câmara', 'house': house}
    return {'id': f"senado-{entry['id']}", 'title': entry['identificacao'], 'description': entry.get('ementa', ''),
            'date': entry.get('dataApresentacao', ''), 'source': f"https://www25.senado.leg.br/web/atividade/materias/-/materia/{entry['codigoMateria']}",
            'status': entry.get('situacaoAtual', 'Consultar tramitação'), 'authorship': entry.get('autoria', ''), 'house': house}


def collect_research() -> None:
    rows = zip_rows(TSE + 'consulta_cand_2026.zip', 'consulta_cand_2026_BRASIL.csv')
    people = [person_from_candidate(row) for row in select_candidates(rows)]
    social = zip_rows(TSE + 'rede_social_candidato_2026.zip', 'rede_social_candidato_2026_BRASIL.csv')
    by_id = {p['id']: p for p in people}
    for row in social:
        person = by_id.get(row.get('SQ_CANDIDATO', ''))
        url = row.get('DS_URL', '')
        if person and url.startswith(('https://', 'http://')) and url not in person['socialSources']:
            person['socialSources'].append(url)
    roster = current_rosters()
    for person in people:
        lookup = person | {'state': 'RJ'} if person['name'] == 'FLAVIO BOLSONARO' else person
        person['member'] = match_parliamentarian(lookup, roster)
    with ThreadPoolExecutor(max_workers=3) as pool:
        people = list(pool.map(collect_history, people))
    metadata = {'checkedAt': '2026-10-21', 'tseGeneratedAt': rows[0]['DT_GERACAO'] + ' ' + rows[0]['HH_GERACAO'],
                'source': ELECTION_SOURCE, 'counts': dict(Counter(p['office'] for p in people)),
                'historyPeople': sum(bool(p['member']) for p in people),
                'historyRecords': sum(len(p['history']) for p in people),
                'socialPeople': sum(bool(p['socialSources']) for p in people),
                'historyFailures': sum(p['historyStatus'].startswith('Coleta indisponível') for p in people),
                'notes': ['Senadores da PB confirmados pela Agência Senado; situação nula no CSV do TSE.',
                          'Identificação entre bases por nome exato normalizado e UF; sem correspondência ambígua.',
                          'Histórico legislativo de 2026 somente para correspondências nas listas atuais da Câmara e do Senado.',
                          'Históricos estaduais e distritais e promessas parlamentares permanecem pendentes.']}
    target = ROOT / 'dist' / 'research.json'
    target.write_text(json.dumps({'metadata': metadata, 'people': people}, ensure_ascii=False, separators=(',', ':')))
    print(json.dumps(metadata, ensure_ascii=False))


def finalize_snapshot() -> None:
    target = ROOT / 'dist' / 'research.json'
    snapshot = json.loads(target.read_text())
    for person in snapshot['people']:
        person['history'] = [entry for entry in person['history'] if '2026-01-01' <= entry['date'] <= '2026-10-21']
    snapshot['metadata']['checkedAt'] = '2026-10-22'
    snapshot['metadata']['historyRecords'] = sum(len(p['history']) for p in snapshot['people'])
    snapshot['metadata']['uniqueHistoryRecords'] = len({h['id'] for p in snapshot['people'] for h in p['history']})
    snapshot['metadata']['historyFailures'] = sum(p['historyStatus'].startswith('Coleta indisponível') for p in snapshot['people'])
    target.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')))
    print(json.dumps(snapshot['metadata'], ensure_ascii=False))


def download_historical_plans() -> None:
    snapshot = json.loads((ROOT / 'dist' / 'historical.json').read_text())
    for person in snapshot['people']:
        archive = zipfile.ZipFile(io.BytesIO(fetch_bytes(person['archiveSource'])))
        target = ROOT / 'dist' / person['planSource']
        target.parent.mkdir(parents=True, exist_ok=True)
        document = archive.read(person['archiveEntry'])
        if not document.startswith(b'%PDF-'):
            raise ValueError(f"invalid document: received {document[:5]!r}, expected PDF signature")
        target.write_bytes(document)
        print(f"{person['name']} / {person['electionYear']}: {len(document)} bytes, original do TSE")


if __name__ == '__main__':
    collect_research()
