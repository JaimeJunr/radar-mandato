import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const research = JSON.parse(readFileSync(new URL('../dist/research.json', import.meta.url)));
const campaigns = JSON.parse(readFileSync(new URL('../dist/campaigns.json', import.meta.url)));
test('cadastro cobre todos os cargos, UFs e identificadores únicos', () => {
  assert.equal(research.people.length, 1628);
  assert.equal(new Set(research.people.map(p => p.id)).size, 1628);
  for (const [office, count] of Object.entries(research.metadata.counts)) {
    assert.equal(research.people.filter(p => p.office === office).length, count);
  }
  assert.equal(new Set(research.people.filter(p => p.office !== 'Presidência').map(p => p.state)).size, 27);
});
test('compromissos têm pessoa válida, documento e descrição; sem veredito inventado', () => {
  assert.equal(campaigns.length, 18);
  for (const c of campaigns) {
    assert.ok(research.people.some(p => p.id === c.personId));
    assert.match(c.source, /^https:\/\/(www\.tse\.jus\.br|www12\.senado\.leg\.br)\//);
    assert.ok(c.description && c.reference);
    assert.equal(c.status, undefined);
  }
});
test('registros de autoria permanecem no recorte e preservam procedência', () => {
  const records = research.people.flatMap(p => p.history);
  assert.equal(records.length, research.metadata.historyRecords);
  for (const r of records) {
    assert.match(r.date, /^2026-/);
    assert.ok(r.date <= '2026-10-21');
    assert.match(r.source, /^https:\/\/(www\.camara\.leg\.br|www25\.senado\.leg\.br)\//);
    assert.ok(r.authorship && r.id);
  }
});
