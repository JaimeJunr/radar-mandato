import unittest

from research import select_candidates, normalize_name, match_parliamentarian


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


if __name__ == '__main__':
    unittest.main()
