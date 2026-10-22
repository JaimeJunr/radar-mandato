# Radar do Mandato

Observatório de compromissos eleitorais e atividade legislativa, com fontes e avaliações documentadas.

[Abrir o site no Sites](https://radar-mandato-jaime.jaimeodairbassojunio.chatgpt.site) — acesso privado.

## Conteúdo

- Cadastro dos parlamentares eleitos em 2026, incluindo deputados distritais, e dos presidenciáveis Lula e Flávio Bolsonaro.
- Programas de Jair Bolsonaro em 2018 e Lula em 2022, com cópias originais dos PDFs do TSE e páginas de referência.
- Busca e filtros por cargo, UF, eleição e cumprimento.
- Histórico legislativo de 2026 para candidaturas identificadas nas bases atuais da Câmara e do Senado.
- Dezesseis avaliações editoriais de cumprimento, com critério, período, evidências e limitações.

A base é uma fotografia da coleta de 22/10/2026. Há pesquisa pendente de promessas individuais e históricos estaduais. Ausência de registro ou avaliação não significa ausência de atuação ou descumprimento.

## Executar localmente

O site usa HTML, CSS e JavaScript, sem instalação de dependências nem etapa de build.

```sh
python3 -m http.server 4173 --directory dist
```

Abra <http://localhost:4173>.

## Testes

Requer Node.js com suporte a `node:test` e Python 3.10 ou superior.

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p '*_test.py'
```

Os testes dos documentos exigem `pdftotext`, do pacote Poppler (`poppler-utils` no Debian/Ubuntu).

## Programas completos e reutilização de dados

[Índice dos programas por página](dist/documents/index.json): texto das 102 páginas dos programas de Bolsonaro 2018 e Lula 2022, com identificador da candidatura, ano, URL do arquivo oficial, entrada no ZIP e SHA-256 do PDF. O texto foi extraído automaticamente e deve ser conferido no original; a numeração corresponde à posição da página no PDF. Esse índice não transforma parágrafos em promessas nem atribui cumprimento.

Para regenerar o índice a partir dos PDFs versionados:

```sh
python3 documents.py
```

As melhorias inspiradas nas referências abertas incluem limpeza de valores ausentes do TSE e espaços nos nomes, preservação do último turno por eleição e candidatura, e contagem separada de proposições únicas e relações de autoria. Eleição não comprova exercício atual do cargo. A vinculação às bases legislativas continua exigindo nome e UF sem ambiguidade.

Veja [fontes, licenças e decisões de aproveitamento](SOURCES.md). As implementações são próprias; não há dependência dos serviços de terceiros nem código transplantado desses repositórios.

## Arquivos principais

| Caminho | Conteúdo |
| --- | --- |
| `dist/index.html`, `dist/app.js`, `dist/model.mjs` | Interface, navegação e filtros |
| `dist/research.json` | Cadastro de 2026 e registros legislativos coletados |
| `dist/campaigns.json` | Compromissos selecionados de 2026 |
| `dist/historical.json` | Campanhas de 2018 e 2022 e seus compromissos |
| `dist/assessments.json` | Avaliações editoriais, critérios e evidências |
| `dist/documents/` | PDFs originais dos programas do TSE |
| `research.py` | Coleta de dados oficiais e programas históricos |
| `documents.py`, `dist/documents/index.json` | Extração reproduzível e corpus dos programas por página |
| `.openai/hosting.json` | Identidade e configuração do site existente no Sites |

Os recortes e datas da coleta estão fixados no código e nos dados. Atualizá-los exige conferir as fontes e as avaliações correspondentes; a publicação não executa coleta automática.

## Publicação

O site é hospedado no Sites. Este repositório armazena o código e os dados; fazer push no GitHub não publica automaticamente uma nova versão no Sites. A publicação atual usa o repositório gerenciado pelo serviço.

## Critérios de cumprimento

As classificações são editoriais, conforme o compromisso específico: propor, aprovar e executar são entregas distintas. O período de Bolsonaro é 2019–2022; a avaliação de Lula cobre 2023 até 22/10/2026 e é provisória, pois o mandato está em curso. A seleção de compromissos não constitui nota geral dos governos.
