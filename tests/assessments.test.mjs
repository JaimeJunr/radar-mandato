import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachAssessments, filterRecords } from '../dist/model.mjs';

test('avaliação só se vincula ao mesmo compromisso e candidatura', () => {
  const campaigns = [{personId:'2018',title:'Trabalho'}, {personId:'2022',title:'Trabalho'}];
  const assessment = {personId:'2018',campaignTitle:'Trabalho',status:'Parcialmente cumprida'};
  const result = attachAssessments(campaigns, [assessment]);
  assert.equal(result[0].assessment, assessment);
  assert.equal(result[1].assessment, undefined);
  assert.equal(campaigns[0].assessment, undefined);
});
test('status combina com ano e busca; desconhecido não vira descumprimento', () => {
  const records = [{name:'Lula',electionYear:2022,assessment:{status:'Cumprida'}}, {name:'Lula',electionYear:2026}];
  assert.equal(filterRecords(records,{search:'Lula',year:'2022',status:'Cumprida'}).length,1);
  assert.equal(filterRecords(records,{search:'Lula',year:'2026',status:'Não cumprida'}).length,0);
});
test('cada compromisso histórico tem avaliação única, período, critério e evidências', () => {
  const historical = JSON.parse(readFileSync(new URL('../dist/historical.json', import.meta.url)));
  const assessments = JSON.parse(readFileSync(new URL('../dist/assessments.json', import.meta.url)));
  assert.equal(assessments.items.length, 16);
  assert.equal(new Set(assessments.items.map(a => a.personId + a.campaignTitle)).size,16);
  const records = attachAssessments(historical.campaigns, assessments.items);
  for (const r of records) {
    const a = r.assessment;
    assert.ok(a && a.criterion && a.finding && a.limitation);
    assert.ok(['Cumprida','Não cumprida','Parcialmente cumprida','Em andamento'].includes(a.status));
    assert.equal(a.periodEnd,r.personId === '280000614517' ? '2022-12-31' : '2026-10-22');
    assert.ok(a.evidence.length > 0 && a.evidence.every(s => /^https:\/\//.test(s.url) && s.title));
  }
});
