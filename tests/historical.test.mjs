import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterRecords } from '../dist/model.mjs';

const historical = JSON.parse(readFileSync(new URL('../dist/historical.json', import.meta.url)));
test('campanhas históricas preservam ano, partido e mandato da eleição', () => {
  assert.deepEqual(historical.people.map(p => [p.name, p.electionYear, p.party, p.term]), [
    ['JAIR BOLSONARO', 2018, 'PSL', '2019–2022'], ['LULA', 2022, 'PT', '2023–2026']
  ]);
  assert.equal(new Set(historical.people.map(p => p.id)).size, 2);
  assert.ok(historical.people.every(p => p.history.length === 0));
});
test('oito compromissos de cada programa têm página válida e PDF original disponível', () => {
  for (const person of historical.people) {
    const campaigns = historical.campaigns.filter(c => c.personId === person.id);
    assert.equal(campaigns.length, 8);
    const bytes = readFileSync(new URL('../dist/' + person.planSource, import.meta.url));
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    assert.match(person.archiveSource, /^https:\/\/cdn\.tse\.jus\.br\//);
    assert.ok(person.archiveEntry.includes(String(person.electionYear)));
    for (const c of campaigns) {
      assert.ok(c.page > 0 && c.page <= person.planPages && c.description);
      assert.equal(c.status, undefined);
    }
  }
});
test('busca de Lula em 2022 exclui sua candidatura de 2026', () => {
  const records = [...historical.people, {name: 'LULA', electionYear: 2026}];
  assert.equal(filterRecords(records, {search: 'Lula', year: '2022'}).length, 1);
  assert.equal(filterRecords(records, {search: 'Bolsonaro', year: '2022'}).length, 0);
});
