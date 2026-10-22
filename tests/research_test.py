import unittest

from research import select_candidates, normalize_name, match_parliamentarian, person_from_candidate, summarize_history


class ResearchTest(unittest.TestCase):
    def candidate(self, **changes):
        row = {'NR_TURNO': '1', 'DS_CARGO': 'SENADOR', 'DS_SIT_TOT_TURNO': 'ELEITO',
               'SQ_CANDIDATO': '1', 'SG_UF': 'SP', 'NM_URNA_CANDIDATO': 'ANA'}
        return row | changes

    def test_selects_elected_and_excludes_substitutes(self):
        rows = [self.candidate(), self.candidate(SQ_CANDIDATO='2', DS_SIT_TOT_TURNO='SUPLENTE')]
        self.assertEqual(len(select_candidates(rows)), 1)

    def test_deduplicates_turns_and_keeps_presidential_candidates(self):
        president = self.candidate(SQ_CANDIDATO='3', DS_CARGO='PRESIDENTE', NM_URNA_CANDIDATO='LULA', DS_SIT_TOT_TURNO='2º TURNO')
        self.assertEqual(len(select_candidates([president, president | {'NR_TURNO': '2'}])), 1)

    def test_paraiba_override_requires_exact_id_and_records_source(self):
        row = self.candidate(SQ_CANDIDATO='150002544905', SG_UF='PB', DS_SIT_TOT_TURNO='#NULO')
        selected = select_candidates([row])
        self.assertEqual(len(selected), 1)
        self.assertIn('senado.leg.br', selected[0]['electionSource'])
        self.assertEqual(select_candidates([row | {'SG_UF': 'SP'}]), [])

    def test_normalizes_accents_and_matches_exact_name_and_state(self):
        self.assertEqual(normalize_name('João Azevêdo'), 'JOAO AZEVEDO')
        person = {'name': 'João Azevêdo', 'fullName': 'João Azevêdo Lins', 'state': 'PB'}
        matches = [{'name': 'JOAO AZEVEDO', 'fullName': '', 'state': 'PB', 'id': '1'}]
        self.assertEqual(match_parliamentarian(person, matches)['id'], '1')
        self.assertIsNone(match_parliamentarian(person | {'state': 'SP'}, matches))

    def test_ambiguous_match_does_not_guess(self):
        person = {'name': 'Ana', 'fullName': 'Ana', 'state': 'SP'}
        self.assertIsNone(match_parliamentarian(person, [person | {'id': '1'}, person | {'id': '2'}]))

    def test_keeps_latest_round_without_merging_distinct_elections(self):
        first = self.candidate(CD_ELEICAO='100', NR_TURNO='1')
        second = first | {'NR_TURNO': '2'}
        other = first | {'CD_ELEICAO': '200'}
        selected = select_candidates([second, first, other])
        self.assertEqual(len(selected), 2)
        self.assertEqual(selected[0]['NR_TURNO'], '2')

    def test_latest_round_result_replaces_earlier_result(self):
        first = self.candidate()
        last = first | {'NR_TURNO': '2', 'DS_SIT_TOT_TURNO': 'NÃO ELEITO'}
        self.assertEqual(select_candidates([first, last]), [])

    def test_cleans_tse_placeholders_and_spacing_without_losing_number(self):
        row = self.candidate(NM_URNA_CANDIDATO=' #NULO ', NM_CANDIDATO=' ANA  SILVA ',
                             SG_PARTIDO='#NE', NR_CANDIDATO='0', electionSource='https://example.org')
        person = person_from_candidate(row)
        self.assertEqual(person['name'], 'ANA SILVA')
        self.assertEqual(person['party'], '')
        self.assertEqual(person['number'], '0')
        self.assertEqual(person['electionYear'], 2026)
        self.assertEqual(person['round'], 1)
        self.assertEqual(normalize_name(' João   Azevêdo\nLins '), 'JOAO AZEVEDO LINS')

    def test_summarizes_coauthorship_without_counting_it_as_unique_bills(self):
        people = [{'history': [{'id': 'camara-1'}, {'id': 'camara-2'}], 'historyStatus': 'Consulta oficial concluída'},
                  {'history': [{'id': 'camara-1'}], 'historyStatus': 'Coleta indisponível (HTTPError)'}]
        self.assertEqual(summarize_history(people), {'historyRecords': 3, 'uniqueHistoryRecords': 2, 'historyFailures': 1})
        self.assertEqual(summarize_history([]), {'historyRecords': 0, 'uniqueHistoryRecords': 0, 'historyFailures': 0})


if __name__ == '__main__':
    unittest.main()
