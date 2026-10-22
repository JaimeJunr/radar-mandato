import { attachAssessments, filterRecords, pageRecords, escapeHtml as e, safeUrl } from './model.mjs';

const state = { view: 'people', page: 1, people: [], campaigns: [], history: [], metadata: {} };
const $ = selector => document.querySelector(selector);
const format = value => Number(value).toLocaleString('pt-BR');
const link = (url, label) => `<a href="${e(safeUrl(url.startsWith('./documents/') ? new URL(url, document.baseURI).href : url))}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`;
const personLabel = p => `${e(p.office)} · ${e(p.state)} · ${e(p.party)} · Eleição ${e(p.electionYear ?? 2026)}`;

function readFilters() {
  return { search: $('#search').value, office: $('#office').value, state: $('#state').value, year: $('#year').value, status: state.view === 'campaign' ? $('#status').value : '' };
}

function personCard(person) {
  const count = state.campaigns.filter(c => c.personId === person.id).length;
  return `<article class="card"><div class="card-top"><span class="tag">${e(person.state)} / ${e(person.party)}</span><span class="status">${e(person.result)}</span></div><h3>${e(person.name)}</h3><p>${personLabel(person)}<br>${person.term ? `Mandato ${e(person.term)}<br>` : ''}${count ? `${count} compromissos documentados` : 'Promessas: pesquisa pendente'}<br>${person.history.length ? `${format(person.history.length)} registros legislativos em 2026` : e(person.historyStatus)}</p><button data-person="${e(person.id)}">Abrir dossiê e fontes <span>↗</span></button></article>`;
}

function recordCard(record) {
  const excerpt = record.description.slice(0, 200);
  return `<article class="card"><div class="card-top"><span class="tag">${e(record.area || record.house)}</span>${state.view === 'campaign' ? statusBadge(record) : '<span class="status">Registro oficial</span>'}</div><h3>${e(record.title)}</h3><p>${e(excerpt)}${record.description.length > 200 ? '…' : ''}</p><div class="person"><div><strong>${e(record.name)}</strong><small>${personLabel(record)}</small></div></div><button data-record="${e(record.key)}">${state.view === 'campaign' ? 'Ler compromisso e avaliação' : 'Ver registro e tramitação'} <span>↗</span></button></article>`;
}

function statusBadge(record) {
  const status = record.assessment?.status || 'Não avaliada';
  const colors = { 'Cumprida': 'fulfilled', 'Não cumprida': 'unfulfilled', 'Parcialmente cumprida': 'partial', 'Em andamento': 'ongoing' };
  return `<span class="status ${colors[status] || 'unassessed'}">${e(status)}</span>`;
}

function assessmentDetails(record) {
  const a = record.assessment;
  if (!a) return '<p>Cumprimento: ainda não avaliado nesta pesquisa. Ausência de avaliação não significa descumprimento.</p>';
  return `<section class="assessment"><h3>Avaliação editorial</h3>${statusBadge(record)}<p>Consulta: 22/10/2026 · Período avaliado: ${e(a.periodStart)} a ${e(a.periodEnd)}${record.electionYear === 2022 ? ' · Mandato em curso; avaliação provisória' : ' · Mandato encerrado'}</p><h4>Critério</h4><p>${e(a.criterion)}</p><h4>O que foi verificado</h4><p>${e(a.finding)}</p><h4>Escopo e limitações</h4><p>${e(a.limitation)}</p><h4>Evidências da execução</h4><ul>${a.evidence.map(s => `<li>${link(s.url, s.title)}</li>`).join('')}</ul></section>`;
}

function render() {
  const all = state.view === 'people' ? state.people : state.view === 'campaign' ? state.campaigns : state.history;
  const records = filterRecords(all, readFilters());
  const pages = Math.max(1, Math.ceil(records.length / 24));
  $('#status').disabled = state.view !== 'campaign';
  state.page = Math.min(state.page, pages);
  $('#count').textContent = `${format(records.length)} ${state.view === 'people' ? 'CANDIDATURAS ENCONTRADAS' : 'REGISTROS ENCONTRADOS'}`;
  $('#range').textContent = state.view === 'history' ? 'HISTÓRICO LEGISLATIVO · ANO 2026' : `ELEIÇÕES ${$('#year').value || '2018 / 2022 / 2026'}`;
  $('#cards').innerHTML = pageRecords(records, state.page).map(state.view === 'people' ? personCard : recordCard).join('');
  $('.empty').hidden = records.length > 0;
  $('#previous').disabled = state.page === 1;
  $('#next').disabled = state.page === pages;
  $('#page-label').textContent = `Página ${state.page} de ${format(pages)}`;
  updateViewNote();
}

function updateViewNote() {
  const notes = {
    people: 'Base dos eleitos e presidenciáveis de 2026, com as campanhas históricas de Jair Bolsonaro em 2018 e Lula em 2022. Cada candidatura tem seu próprio dossiê. Cadastro confirmado não significa pesquisa de promessas concluída.',
    campaign: 'Os 16 compromissos selecionados de Bolsonaro / 2018 e Lula / 2022 têm avaliação editorial, critério e evidências. Bolsonaro: recorte 2019–2022 encerrado. Lula: avaliação provisória até 22/10/2026. Outros registros ainda não avaliados. A seleção não representa uma nota geral dos governos.',
    history: 'Vínculos de autoria de proposições de 2026, incluindo coautorias e repetições por pessoa. Cobertura restrita a eleitos identificados por nome exato e UF nas listas atuais da Câmara e do Senado. Aprovação ou tramitação encerrada não significa promessa cumprida. Assembleias estaduais ainda não coletadas.'
  };
  $('#view-note').textContent = notes[state.view];
}

function showDialog(html) {
  $('#details').innerHTML = html;
  $('dialog').showModal();
}

function showRecord(key) {
  const record = [...state.campaigns, ...state.history].find(r => r.key === key);
  if (!record) return;
  showDialog(`<p class="eyebrow">${record.personId ? `COMPROMISSO DOCUMENTADO / ${e(record.electionYear)}` : 'HISTÓRICO LEGISLATIVO / 2026'}</p><h2>${e(record.title)}</h2><p>${e(record.name)} · ${personLabel(record)}${record.term ? `<br>Mandato ${e(record.term)}` : ''}</p><p>${e(record.description)}</p><p>${e(record.reference || record.date)}</p><p>${e(record.authorship || 'Resumo editorial do documento indicado. O resultado eleitoral não foi tratado como entrega de política pública.')}</p>${record.personId ? assessmentDetails(record) : `<p>Situação na fonte: ${e(record.status)}. Não equivale a cumprimento de promessa.</p>`}${link(record.source, 'Conferir documento oficial')}`);
}

function showPerson(id) {
  const person = state.people.find(p => p.id === id);
  if (!person) return;
  if (person.electionYear !== 2026) { showHistoricalPerson(person); return; }
  const promises = state.campaigns.filter(c => c.personId === id);
  const history = person.history.slice(0, 20);
  showDialog(`<p class="eyebrow">DOSSIÊ / ELEIÇÕES 2026</p><h2>${e(person.name)}</h2><p>${e(person.fullName)}<br>${personLabel(person)} · Número ${e(person.number)}</p><p>${link(person.electionSource, 'Fonte da candidatura e resultado')}</p><h3>Compromissos documentados</h3>${promises.length ? promises.map(c => `<p>${e(c.title)}<br>${link(c.source, c.reference)}</p>`).join('') : '<p>Pesquisa individual de promessas ainda pendente. Não foi concluído que esta pessoa não tenha feito promessas.</p>'}<h3>Fontes de campanha declaradas ao TSE</h3>${person.socialSources.length ? person.socialSources.map(url => `<p>${link(url, url)}</p>`).join('') : '<p>Sem endereço aproveitável no arquivo consultado. Isso não demonstra ausência de canais de campanha.</p>'}<p class="view-note">Os endereços foram declarados à Justiça Eleitoral. O conteúdo de cada canal ainda precisa de verificação editorial.</p><h3>Atividade legislativa anterior · 2026</h3><p>${e(person.historyStatus)}</p>${person.historySource ? `<p>${link(person.historySource, 'Consultar coleta oficial por autoria')}</p>` : ''}${history.map(h => `<p><strong>${e(h.title)}</strong> · ${e(h.date)}<br>${e(h.description)}<br>${link(h.source, 'Tramitação')}</p>`).join('')}${person.history.length > 20 ? '<p>Exibindo os primeiros 20 registros. Busque o nome na aba Histórico legislativo para consultar todos os registros coletados.</p>' : ''}<p>Sem vínculo automático com uma promessa eleitoral. Novos mandatos parlamentares começam em fevereiro de 2027.</p>`);
}

function showHistoricalPerson(person) {
  const promises = state.campaigns.filter(c => c.personId === person.id);
  showDialog(`<p class="eyebrow">DOSSIÊ / ELEIÇÃO ${e(person.electionYear)}</p><h2>${e(person.name)}</h2><p>${e(person.fullName)}<br>${personLabel(person)} · Número ${e(person.number)}<br>Mandato ${e(person.term)} · ${e(person.result)}</p><p>${link(person.electionSource, 'Cadastro oficial da eleição')}</p><h3>Programa de governo registrado</h3><p>${link(person.planSource, 'Abrir PDF original do TSE')}<br>${link(person.archiveSource, 'Arquivo oficial de origem no TSE')}</p><p>Documento de ${e(person.planPages)} páginas. Arquivo dentro do pacote: ${e(person.archiveEntry)}. Cópia do PDF original, sem alteração do conteúdo.</p><h3>Compromissos documentados</h3>${promises.map(c => `<p><strong>${e(c.title)}</strong><br>${e(c.description)}<br>${link(c.source, c.reference)}</p><details><summary>Ver avaliação de cumprimento e evidências</summary>${assessmentDetails(c)}</details>`).join('')}<h3>Cobertura e cumprimento</h3><p>Seleção inicial de oito compromissos do programa, não um inventário completo. Os oito compromissos têm avaliações documentadas. Para Bolsonaro, considera-se o mandato encerrado em 31/12/2022; para Lula, o mandato em curso até 22/10/2026. Os status são interpretações editoriais dos critérios e fontes apresentados. O histórico legislativo de 2026 permanece separado destes compromissos presidenciais.</p>`);
}

function showMethod() {
  const m = state.metadata;
  showDialog(`<p class="eyebrow">FONTES / COBERTURA</p><h2>Uma fonte para cada afirmação.</h2><p>Arquivo do TSE gerado em ${e(m.tseGeneratedAt)}. Esta é uma fotografia da coleta, sem atualização automática.</p><p>${link(m.source, 'Candidatos e redes sociais · TSE')}<br>${link('https://dadosabertos.camara.leg.br/swagger/api.html', 'Dados Abertos da Câmara')}<br>${link('https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html', 'Dados Abertos do Senado')}</p><h3>O que foi coletado</h3><p>54 senadores, 513 deputados federais, 1.035 estaduais e 24 distritais eleitos; Lula e Flávio Bolsonaro como presidenciáveis. ${format(m.socialPeople)} pessoas com canais declarados ao TSE. Histórico de 2026 consultado para ${format(m.historyPeople)} correspondências nas listas atuais do Congresso; ${format(m.historyFailures)} falhas de coleta.</p><p>A situação dos dois senadores da PB está nula no CSV. A inclusão deles foi confirmada em notícia da Agência Senado, citada nos respectivos dossiês.</p><h3>Campanhas históricas</h3><p>Jair Bolsonaro / 2018 (PSL, mandato 2019–2022) e Lula / 2022 (PT, mandato 2023–2026): oito compromissos selecionados por campanha, com páginas conferidas nos programas originais do TSE. As cópias dos PDFs estão disponíveis nos dossiês, junto do arquivo oficial de origem. Os 16 compromissos possuem avaliação de cumprimento com critério e evidências, disponível nos detalhes.</p><h3>Critérios de cumprimento</h3><p>Cumprida: entrega do compromisso no nível definido (proposição, norma ou execução). Parcialmente cumprida: entrega de parte do escopo. Não cumprida: resultado prometido não entregue no mandato encerrado. Em andamento: execução em curso sem comprovação de conclusão. O mandato de Lula segue em curso; sua avaliação é provisória. Ausência de avaliação nunca significa descumprimento. Aprovar uma proposta só cumpre o compromisso quando ele é de propor ou aprovar; uma promessa de execução exige evidência de entrega. As classificações são editoriais, não vereditos oficiais.</p><h3>O que permanece pendente</h3><p>Pesquisa individual de promessas da maioria dos parlamentares, coleta nas assembleias estaduais e distrital, mandatos anteriores a 2026 e avaliação de cumprimento dos registros fora desta seleção histórica. Não ter registro coletado não prova ausência de atuação.</p><h3>Como interpretar</h3><p>Planos contêm diretrizes e compromissos com diferentes níveis de precisão. A seleção exibida ainda não é exaustiva. Proposição apresentada, coautoria, aprovação e entrega são etapas distintas. Nenhuma recebe automaticamente o rótulo de promessa cumprida. Parlamentares são vinculados às bases por nome exato normalizado e UF; casos ambíguos não são associados.</p><p><a href="research.json" download>Baixar base de pesquisa ↗</a></p>`);
}

function bindEvents() {
  document.querySelectorAll('input,select').forEach(el => el.addEventListener('input', () => { state.page = 1; render(); }));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    state.view = button.dataset.view; state.page = 1;
    document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    render();
  }));
  $('#cards').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.dataset.person) showPerson(button.dataset.person);
    if (button?.dataset.record) showRecord(button.dataset.record);
  });
  $('#previous').addEventListener('click', () => { state.page--; render(); $('#propostas').scrollIntoView(); });
  $('#next').addEventListener('click', () => { state.page++; render(); $('#propostas').scrollIntoView(); });
  $('#close').addEventListener('click', () => $('dialog').close());
  $('#method').addEventListener('click', showMethod);
}

async function initialize() {
  try {
    const responses = await Promise.all([fetch('./research.json'), fetch('./campaigns.json'), fetch('./historical.json'), fetch('./assessments.json')]);
    if (responses.some(r => !r.ok)) throw new Error('Base indisponível');
    const [research, campaigns, historical, assessments] = await Promise.all(responses.map(r => r.json()));
    state.metadata = research.metadata;
    state.people = [...research.people.map(p => ({ ...p, electionYear: 2026 })), ...historical.people].sort((a, b) => {
      if (a.office === 'Presidência' && b.office === 'Presidência') return a.electionYear - b.electionYear || a.name.localeCompare(b.name, 'pt-BR');
      return a.office === 'Presidência' ? -1 : b.office === 'Presidência' ? 1 : a.name.localeCompare(b.name, 'pt-BR');
    });
    const historicalCampaigns = historical.campaigns.map(c => {
      const person = historical.people.find(p => p.id === c.personId);
      return { ...c, source: `${person.planSource}#page=${c.page}`, reference: `Programa registrado no TSE · eleição ${person.electionYear} · p. ${c.page}${c.item ? ` · item ${c.item}` : ''}` };
    });
    state.campaigns = attachAssessments([...campaigns, ...historicalCampaigns].map((c, i) => ({ ...state.people.find(p => p.id === c.personId), ...c, key: `campaign-${i}` })), assessments.items);
    state.history = state.people.flatMap(p => p.history.map(h => ({ name: p.name, office: p.office, state: p.state, party: p.party, electionYear: p.electionYear, ...h, key: `${p.id}-${h.id}` })));
    [...new Set(state.people.map(p => p.state))].sort().forEach(uf => $('#state').add(new Option(uf, uf)));
    $('#senators').textContent = format(research.metadata.counts.Senado);
    $('#federal').textContent = format(research.metadata.counts['Deputado federal']);
    $('#state-count').textContent = format(research.metadata.counts['Deputado estadual'] + research.metadata.counts['Deputado distrital']);
    $('#history-count').previousElementSibling.textContent = 'PROPOSIÇÕES DISTINTAS / 2026';
    $('#history-count').textContent = format(research.metadata.uniqueHistoryRecords);
    $('.caption').textContent = `COLETA EM ${research.metadata.checkedAt.split('-').reverse().join('/')}`;
    $('#coverage').textContent = `Base de 2026: ${format(research.people.length - 2)} parlamentares eleitos + Lula e Flávio Bolsonaro. Arquivo histórico: Jair Bolsonaro / 2018 e Lula / 2022. ${state.campaigns.length} compromissos selecionados; ${assessments.items.length} avaliados nos mandatos de 2019–2022 e 2023–2026. Demais registros ainda sem avaliação.`;
    bindEvents(); render();
  } catch {
    $('#coverage').textContent = 'Não foi possível carregar a base. Recarregue a página para tentar novamente.';
  }
}

initialize();
