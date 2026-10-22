export function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
export function filterRecords(records, filters) {
  return records.filter(r => (!filters.office || r.office === filters.office) && (!filters.state || r.state === filters.state)
    && (!filters.year || String(r.electionYear ?? 2026) === filters.year)
    && (!filters.status || (filters.status === 'Não avaliada' ? !r.assessment : r.assessment?.status === filters.status))
    && normalize([r.name, r.fullName, r.party, r.title, r.description].join(' ')).includes(normalize(filters.search)));
}
export function pageRecords(records, page, size = 24) { return records.slice((page - 1) * size, page * size); }
export function attachAssessments(campaigns, assessments) {
  return campaigns.map(campaign => ({ ...campaign, assessment: assessments.find(a => a.personId === campaign.personId && a.campaignTitle === campaign.title) }));
}
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
export function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : '#'; }
  catch { return '#'; }
}
