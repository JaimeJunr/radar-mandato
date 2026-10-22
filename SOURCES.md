# Referências abertas e aproveitamento

Consulta em 22/10/2026. As bases usadas no Radar continuam vindo do TSE, da Câmara e do Senado. Repositórios de terceiros são referências técnicas; não são evidência de cumprimento de promessas. Nenhum trecho de código ou dataset desses projetos foi incorporado nesta atualização.

## Aplicado nesta atualização

| Referência | O que foi aproveitado | Implementação no Radar |
| --- | --- | --- |
| [Transparência Brasil — propostas-eleicoes-2020](https://github.com/Transparencia-Brasil/propostas-eleicoes-2020) e [coletor_propostas](https://github.com/Transparencia-Brasil/coletor_propostas) | Separação entre coleta do documento, extração de texto e análise posterior. O coletor de programas é um repositório distinto do coletor de resultados. | `documents.py` extrai os PDFs oficiais já disponíveis, mantendo páginas vazias, origem e SHA-256. O corpus completo está em `dist/documents/index.json`; a seleção editorial de compromissos permanece separada. |
| [Turicas — eleicoes-brasil](https://github.com/turicas/eleicoes-brasil/tree/1450e4a98a3159c45029ea933aaa0e1d1af7d89c) | Normalização dos valores ausentes e dos nomes presentes nos arquivos do TSE. | `normalize_tse_text` limpa marcadores de ausência e espaços; `person_from_candidate` mantém número zero e usa o nome completo quando o nome de urna está ausente. |
| [electedBR](https://github.com/StrategicProjects/electedBR/tree/e31b4d6f59817a9c2789d1981413249e885e7d33) | Último turno por candidatura e eleição; distinção entre eleitos e pessoas em exercício. | `select_candidates` escolhe o turno mais recente antes de avaliar o resultado e não mistura códigos de eleição diferentes. O cadastro conserva ano, código de eleição e turno em novas coletas. A lista de exercício atual serve somente à identificação do histórico legislativo. |

As rotinas foram escritas para o formato e os testes deste projeto. Transparência Brasil e Turicas declaram GPL-3.0; electedBR declara GPL-3 em seu `DESCRIPTION`. Esta atualização usa os conceitos documentados, sem copiar implementações desses projetos.

O total legislativo também passou a usar uma única função em coleta e finalização: `historyRecords` conta relações de autoria/coautoria; `uniqueHistoryRecords` conta identificadores distintos de proposição. Uma nova coleta já produz ambas as métricas, sem depender de uma correção manual posterior.

## Outras referências avaliadas

| Projeto | Utilidade e decisão |
| --- | --- |
| [Cepesp-Fgv/cepesp-python](https://github.com/Cepesp-Fgv/cepesp-python) | Wrapper de dados eleitorais agregados, com documentação histórica até 2018. Não fornece um extrator de promessas. O Radar já obtém os campos necessários diretamente do TSE; não foi criada uma segunda dependência para a mesma coleta. |
| [carlosduplar/eleicoes-2026-monitor](https://github.com/carlosduplar/eleicoes-2026-monitor) | Referência de pipeline de notícias, pesquisas e posições. Há posições inferidas e material que exige revisão humana. Esses registros não foram importados como compromissos pessoais nem como evidência de entrega. |
| [SidneyBissoli/senado-br-mcp-cloudflare](https://github.com/SidneyBissoli/senado-br-mcp-cloudflare/tree/ab018b53ac4ce3196a41e93a963b192733ee8017) | Código MIT; dados têm termos separados em `LICENSE-DATA.md`. A família `/processo` e a distinção entre URL da fonte e data de coleta são referências úteis. O Radar já consulta `/processo?codigoParlamentarAutor=…`, diretamente no Senado; nenhum servidor MCP de terceiro é necessário. |
| [leofn/tse-candidatos-2026](https://github.com/leofn/tse-candidatos-2026) | Coleta de CSVs, redes sociais, bens, coligações e gráficos. O Radar já coleta candidaturas e redes sociais oficiais. Bens e demografia não resolvem o acompanhamento de compromissos e ficaram fora desta atualização. |
| [juliosaulo/como-meus-vizinhos-votam](https://github.com/juliosaulo/como-meus-vizinhos-votam) | Código MIT; cruza votos e geografia, documentando a natureza aproximada da inferência. Não foi importado: proximidade geográfica e votação não demonstram autoria de proposta ou cumprimento. |

Na consulta, não foi identificada licença pelos metadados do GitHub nem no caminho raiz `LICENSE` de Cepesp, Monitor e leofn. Isso não comprova ausência de termos em outros arquivos; código e bases desses projetos não foram copiados.

O endereço `CoderlunEureon/gastometro` não pôde ser resolvido na consulta. Links de tópicos e da organização Câmara dos Deputados são índices de descoberta, não datasets selecionados ou importados.

## Fontes primárias

- [Dados abertos do TSE](https://dadosabertos.tse.jus.br/): cadastro, resultados declarados e programas de governo. Cada programa histórico mantém a URL exata do ZIP oficial em `historical.json` e no índice de documentos.
- [Dados abertos da Câmara](https://dadosabertos.camara.leg.br/swagger/api.html): parlamentares e proposições, com filtro de autoria.
- [Dados abertos do Senado](https://legis.senado.leg.br/dadosabertos/): parlamentares e processos legislativos, com filtro de autor.

Não houve nova coleta nacional nesta atualização. O corpus foi gerado a partir dos PDFs oficiais versionados; o cadastro e as avaliações existentes conservam sua data e seu recorte originais.
