import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRecords, pageRecords, escapeHtml, safeUrl } from '../dist/model.mjs';

const people = [{ id: '1', name: 'João', office: 'Senado', state: 'PB', party: 'PSB' }, { id: '2', name: 'Lula', office: 'Presidência', state: 'BR', party: 'PT' }];
test('busca normalizada combina cargo e UF', () => {
  assert.equal(filterRecords(people, { search: 'joao', office: 'Senado', state: 'PB' }).length, 1);
  assert.equal(filterRecords(people, { search: 'joao', state: 'SP' }).length, 0);
});
test('paginação preserva todos os resultados e lida com lista vazia', () => {
  assert.deepEqual(pageRecords(people, 1, 1), [people[0]]);
  assert.deepEqual(pageRecords(people, 2, 1), [people[1]]);
  assert.deepEqual(pageRecords([], 1, 24), []);
});
test('texto público é escapado e URL executável é rejeitada', () => {
  assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl('https://www.tse.jus.br/'), 'https://www.tse.jus.br/');
});
test('filtro de eleição separa campanhas da mesma pessoa e não inclui outro ano', () => {
  const campaigns = [{ name: 'Lula', electionYear: 2022 }, { name: 'Lula', electionYear: 2026 }, { name: 'Jair Bolsonaro', electionYear: 2018 }];
  assert.deepEqual(filterRecords(campaigns, { search: 'Lula', year: '2022' }), [campaigns[0]]);
  assert.deepEqual(filterRecords(campaigns, { search: 'Bolsonaro', year: '2022' }), []);
  assert.equal(filterRecords(campaigns, { search: '', year: '' }).length, 3);
});
