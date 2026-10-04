# Apuração Eleições 2026 — análise técnica e plano inicial

Data da análise: 04/10/2026. Status: proposta de implementação; nenhum código de produto implementado.

## 1. Fontes e alcance da análise

- Requisito lido integralmente: [escopo_inicial_apuracao_eleicoes_2026.md](escopo_inicial_apuracao_eleicoes_2026.md), 3.106 linhas, seções 1–36 e RF-001–RF-033.
- [Figma](https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV): inspeção por MCP das quatro páginas, das variáveis e estilos, do Auto Layout, das telas Light/Dark e das reações do protótipo. Foram examinadas imagens dos 14 frames de telas e de Foundations. A animação foi analisada por seus gatilhos, destinos, duração e easing; não foi realizada sessão manual de reprodução no player.
- Documentação oficial TSE: consulta aos oito EAs referenciados e ao FAQ técnico, com conferência dirigida das regras de maior risco. Isso não substitui a futura validação dos parsers com payloads 2026.
- Workspace: existe o requisito, sem aplicação, infraestrutura, testes ou AGENTS.md. Não há implementação anterior a preservar.

Precedência: TSE para semântica eleitoral; Markdown para domínio, funcionalidade e arquitetura; Figma para visual e interação. As propostas técnicas deste relatório não acrescentam funcionalidades. Lacunas permanecem explicitamente pendentes.

## 2. Estrutura e análise do requisito

| Bloco | Conteúdo | Consequência para implementação |
|---|---|---|
| 1–5 | Objetivos, fonte oficial, arquitetura, parcial/final e proveniência territorial | Browser busca a CDN diretamente; sem API, worker ou banco; não inferir eleito ou residência do eleitor |
| 6–9; RF-001–005 | Navegação, status, Presidência, Senado, Missão | Cinco áreas principais P0; Explorar é P1; Senado sempre vinculado à UF |
| 10–16; RF-006–017 | Hierarquia, breadcrumb, mapas, PR, município, local, bairro e seção | Geografia oficial e regionalização analítica são modelos distintos; local/seção entram em P2 |
| 17–19; RF-018–023 | Câmara, Assembleias/DF, ocupantes, eventos | Cadeiras derivadas por agregação e UF; não recalcular distribuição eleitoral por conta própria |
| 20–21; RF-024–027 | Amostras e evolução de sessão | Histórico volátil da sessão atual; sem reconstrução após reload ou entre dispositivos |
| 22–23; RF-028–029 | Explorador e capilaridade | Filtros coordenados, métricas derivadas e cobertura territorial explícita |
| 24–25; RF-030–033 | Polling, integridade e proveniência | Atualização direta do browser a cada 5 s; distinguir dado atual, falha e dado antigo |
| 26 | Oito EAs, campos CORE/OPS/COND/PASS, adapters e aceite | Schemas independentes; campos condicionais e desconhecidos tratados conscientemente |
| 27–29 | Modelo lógico e agregações | Modelos internos TypeScript; resultados só em memória e na CDN TSE |
| 30–33 | Prioridades, sucesso, decisões P7/P8/P9 e sequência | Não reabrir P8/P9 como decisões de produto; validar execução com fixtures e payload real |
| 34–36 | Figma, exclusões, fluxo de trabalho e qualidade | Light/Dark no mesmo ciclo; tarefas pequenas; mocks identificados; validação visual |

### Escopo por prioridade

- **P0:** Presidência, Senado por UF, Missão, consulta Brasil/UF/município, cadeiras federais/estaduais, candidatos na faixa, polling direto, eventos de sessão e proveniência.
- **P1:** mapas, oito macrorregiões do Paraná, drill-down regional, gráficos com amostras da sessão atual, capilaridade e Explorar.
- **P2:** locais, bairros dos locais, seções/BU e análises posteriores.

A ordem de construção visual das seções 33 e 36 inclui mapas antes da integração. Ela é compatível com desenvolvimento por mocks, mas não altera as prioridades de entrega. Um frontend demonstrável com mocks ainda não atende ao aceite do MVP oficial.

### Invariantes de domínio

1. Senado: disputa por UF/DF; faixa parcial usa candidatos válidos, ordem oficial e número de vagas do cargo. A classificação da disputa continua estadual mesmo quando o mapa mostra votação municipal.
2. Proporcionais: quantidade oficial de vagas da agregação; candidatos válidos de todos os partidos da federação participam da mesma ordenação. Não atribuir todas as vagas da federação ao Missão.
3. Parcial e situação oficial são informações diferentes. Segundo turno, suplência e ausência de atribuição de eleitos não podem virar um booleano genérico de eleito.
4. O total nacional de cadeiras e os indicadores nacionais do Senado são agregações da aplicação. Presidência nacional usa a fonte nacional oficial, incluindo sua cobertura territorial.
5. O cliente mantém amostras/eventos em memória enquanto a sessão está aberta; não persiste nem reconstrói histórico após reload.
6. Identificadores de eleição, candidatura e território são strings; nomes e slugs servem para apresentação, não para junções.
7. Somar votos e denominadores antes de calcular percentuais de regiões; não fazer média simples de percentuais municipais. A fórmula e a cobertura de cada indicador precisam ser documentadas.
8. Mocks, simulado TSE e dados oficiais são origens distintas e não podem compartilhar publicação de produção por acidente.

## 3. Figma: inventário e fundamentos

### Páginas inspecionadas

| Página | Node ID | Conteúdo observado |
|---|---|---|
| 00 — Foundations | `0:1` | Foundations `1:32`, cinco componentes e Brand Assets `20:2` |
| 01 — Screens | `1:2` | Seis telas em Light/Dark e Presidente expandido nos dois temas: 14 frames |
| 02 — Prototype | `1:3` | 14 frames navegáveis, fluxo inicial `29:2` |
| 03 — Interface Requirements | `6:2` | Regras textuais de interação, responsividade, MUI e acessibilidade |

### Tokens observados

A coleção `App Theme` contém 24 variáveis e modos Light/Dark. Existem quatro estilos tipográficos Inter.

| Token | Light | Dark |
|---|---|---|
| Fundo | `#F8F8F6` | `#0A0A0A` |
| Superfície | `#FFFFFF` | `#151515` |
| Superfície alternativa | `#F2F1EE` | `#1D1D1D` |
| Primária | `#FDBF35` | `#FDBF35` |
| Primária suave | `#FFF6D8` | `#30270C` |
| Texto primário | `#0A0A0A` | `#F7F7F7` |
| Texto secundário | `#5E5E5E` | `#BDBDBD` |
| Borda | `#E5E3DE` | `#2A2A2A` |
| Sucesso | `#027A48` | `#58D68D` |
| Alerta | `#B54708` | `#F5B041` |
| Erro | `#B42318` | `#FF7A70` |
| Informação | `#175CD3` | `#7EB6FF` |
| Sobre primária | `#0A0A0A` | `#0A0A0A` |

- Inter: H1 28/36 bold; H2 20/28 semibold; Body 14/20 regular; Label 12/16 medium.
- Espaçamentos: 4, 8, 12, 16, 24 e 32. Raios: 8, 12, 16 e 999.
- Frames desktop: 1440 × 960; sidebar de 240 e área principal de 1200.
- Auto Layout horizontal na tela, vertical em Main. Main usa padding 24/28/28/28 e gap 18; esses valores existem no layout, apesar de não terem tokens próprios.
- Marca: logo positiva no Light e negativa no Dark; amarelo permanece como destaque.
- Responsividade documentada no Figma: desktop ≥1200; tablet 768–1199 com rail; mobile <768 com navegação inferior/drawer, cards em uma coluna e tabelas com scroll. Não existem frames tablet/mobile. A escolha entre navegação inferior e drawer ainda não está fechada.

**Maturidade do sistema visual:** cinco componentes em Foundations (`MUI/Button/Contained`, `MUI/Chip/Live`, `MUI/NavItem/Active`, `MUI/Select/Default`, `MUI/Card/Metric`), sem instâncias nas 14 telas. Nas amostras auditadas de Visão Geral e Senado, Light/Dark, não há bindings de variáveis. Há um vocabulário visual reutilizável, mas a biblioteca ainda não governa os frames por composição/tokenização.

### Telas e fluxos

| Fluxo | Frames Light / Dark | Conteúdo e comportamento observado | Cobertura pendente |
|---|---|---|---|
| Visão Geral | `3:2` / `19:44` | KPIs, Presidência resumida, Missão, evolução da totalização e eventos | Dois horários de proveniência, estados de falha e indicadores completos exigidos pelo requisito |
| Presidente | `3:137` / `19:198` | Métrica/candidato/abrangência, três candidatos + Outros, mapa de UF | Filtros e candidatos sem transições de alteração; mapa sem seleção executável |
| Outros | `26:2` / `26:180` | Expansão inline, quatro candidatos de exemplo, placeholder + nome + percentual | Valores são ilustrativos; total de linhas deve acompanhar o contrato, sem limite de quatro |
| Senado | `7:47` / `19:947` | UF PR, duas vagas, ranking parcial, rótulo `% da votação`, mapa estadual | Final/suplentes, dados completos de comparecimento/seções/votos; linha de corte aparece como texto abaixo da lista, não separador entre 2º e 3º |
| Cadeiras | `3:259` / `19:339` | Câmara/Assembleias, UF, tabela por agregação, Missão por UF, variação | Não há estado de Assembleia nem detalhe da faixa por UF/candidato; controles não possuem ligações no protótipo |
| Missão | `3:440` / `19:539` | Contexto Paraná, cargo/métrica/candidato, KPIs, oito regiões e ranking | Visão nacional, capilaridade e demais estados não têm frames próprios |
| Noroeste | `3:619` / `19:737` | Contexto regional, municípios, ranking, Sarandi marcada | Não há tela de município; seleção Sarandi não altera KPIs regionais; breadcrumb é título sem ação |
| Explorar | Item na sidebar | Destino descrito no requisito | Sem frame e sem ligação de navegação |

Links diretos para revisão: [Foundations](https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV?node-id=1-32), [Screens](https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV?node-id=1-2), [Prototype](https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV?node-id=29-2), [Interface Requirements](https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV?node-id=6-3).

### Protótipo animado: evidência das ligações

- Navegação entre Visão Geral, Presidente, Senado, Cadeiras e Missão nos dois temas; destino Missão abre Paraná.
- Presidente Light: `29:174` ↔ expandido `29:333`.
- Presidente Dark: `29:1554` ↔ expandido `29:1705`.
- Switch recolhido: `29:174` ↔ `29:1554`; expandido: `29:333` ↔ `29:1705`. Preserva efetivamente o estado de Outros no grafo.
- Todas as telas possuem ligação ao equivalente de tema; navegação lateral permanece no grupo Light/Dark corrente.
- Missão Paraná → Noroeste: `29:970` → `29:1174` e `29:2318` → `29:2514`. Retorno disponível por Nav/Missão; não por breadcrumb.
- As ligações inspecionadas usam `ON_CLICK`, `SMART_ANIMATE`, `EASE_OUT`, aproximadamente **240 ms**. O texto da página de requisitos menciona ~280 ms; o grafo executável é a evidência mais específica.
- Não há reações de hover, clique municipal, zoom focado ou avanço para zona/seção. Só Noroeste é clicável entre as oito regiões. Não foi encontrado estado dedicado de enquadramento da geometria.
- Não existem frames próprios de loading, vazio, erro, reconectando, atrasado ou finalizado, embora sejam exigidos por texto.

O protótipo confirma navegação, tema e Outros. Não comprova preservação de filtros arbitrários ou seleção territorial dinâmica: os controles são estáticos. A implementação desses comportamentos continua obrigatória pelo requisito, com o visual faltante registrado para detalhamento.

### Componentes reutilizáveis propostos

| Grupo | Componentes | Responsabilidade |
|---|---|---|
| Estrutura | AppShell, Sidebar/NavItem, PageHeader, ThemeSwitch, BrandLogo | Navegação, tema, identidade e layout adaptável |
| Indicadores | MetricCard, ProgressSummary, ElectionStatus, FreshnessIndicator | Separar totalização, status eleitoral e saúde dos dados |
| Candidatos | CandidateIdentity, CandidateRow, CandidateRanking, OthersDisclosure | Foto oficial/placeholder, nome, votos e expansão acessível |
| Vagas | RangeBadge, RangeCutoff, SeatTable, CandidateRangeList | Reutilizar apresentação; Senado e proporcionais mantêm regras de domínio distintas |
| Filtros | FilterBar, OfficeSelect, TerritorySelect, CandidateSelect, MetricSelect | Sincronizar contexto sem incorporar campos TSE à UI |
| Território | TerritoryBreadcrumb, ElectoralMap, MapLegend, TerritoryTooltip, TerritoryRanking | Seleção persistente, fitBounds, retorno e alternativa textual |
| Histórico | SeatEventList, HistoryChart | Eventos e séries apenas das amostras observadas nesta sessão |
| Estados | LoadingState, EmptyState, DataError, StaleDataNotice | Estados exigidos, cujo detalhamento visual está pendente |

MUI e Lucide são as bases exigidas; esses nomes são uma proposta de organização do código, não componentes já existentes no repositório.

## 4. Arquitetura proposta

Atualização arquitetural validada no browser para o CDN simulado (localhost:3000):

```text
CDN TSE (EA JSON) ←── GET/polling 5 s ── Browser
                                          ↓
                              schemas/adapters TypeScript
                                          ↓
                            agregações + sessão em memória
                                          ↓
                                componentes Next estáticos

S3/CloudFront opcional: frontend e assets próprios somente
```

### Frontend

- Next.js, TypeScript, MUI, Lucide e MapLibre; build com `output: 'export'`.
- Rotas estáticas por área de produto; seleção territorial, eleição, turno, cargo, candidato e métrica em estado de cliente. Proposta: representar filtros navegáveis na query string, evitando depender de rotas dinâmicas geradas em servidor.
- Tema no provider comum e expansão de Outros no estado da tela, sem remontar a página na troca de tema. Persistência após fechar o navegador não é requisito definido.
- O cliente chama a CDN do TSE diretamente. Uma camada TypeScript valida cada EA e cria modelos internos; componentes não conhecem os campos abreviados.
- Polling a cada 5 segundos apenas para recursos do contexto ativo; scheduler compartilhado, revalidação HTTP, cancelamento de respostas de filtros anteriores e backoff. Preservar último dado válido com sinalização de atraso/falha.
- CORS do CDN simulado foi confirmado por GET no Firefox em `http://localhost:3000`: HTTP 200, `application/json`, corpo EA20 `f=s`. CORS do ambiente oficial e do domínio de produção ainda precisam de smoke test.
- MapLibre no cliente, geometrias estáticas carregadas por escopo. Estado territorial único alimenta mapa, breadcrumb, KPIs e rankings.
- Fotos oficiais poderão ser carregadas diretamente da rota indicada pelo EA11; confirmar regras CORS/cross-origin e fallback visual.

### Sessão e hospedagem

- EA14/EA15 orientam descoberta de alterações; resultados são buscados pelo browser na CDN. Atraso entre arquivos precisa ser exposto como proveniência parcial.
- P8 e P9 são funções TypeScript de domínio separadas. Rankings municipais não redefinem vagas da disputa estadual.
- Manter amostras/eventos apenas em memória. Sem banco, snapshots S3, storage do navegador, recuperação entre sessões ou histórico compartilhado.
- Hospedagem estática S3/CloudFront é opcional e atende somente HTML/JS/CSS/mapas/assets. Não publicar JSON de resultados do projeto.
- Testar comportamento com fixtures sem rede na CI. Smoke test manual de GET/CORS contra domínio oficial em produção antes da operação.

## 5. Contratos de dados necessários

Os nomes abaixo são propostas internas. Não representam novos campos do TSE.

### Envelope comum

`schema_version`, `revision`, `generated_at`, `updated_at`, contexto de eleição/turno/cargo/território, origem dos dados, proveniência e disponibilidade.

Proveniência deve distinguir geração do arquivo na fonte, totalização, recebimento, processamento e publicação. Uma agregação deve informar cobertura e intervalo temporal das entradas; não apresentar um timestamp único como garantia de sincronismo de todas as UFs.

Percentuais precisam trazer valor e base semântica: votação oficial, votos válidos, participação no total estadual, totalização por seções etc. Ausente/não divulgado não pode ser serializado como zero indistintamente. Inteiros eleitorais e identificadores exigem validação de tipo; percentuais devem conservar a precisão da fonte até a apresentação.

### Recursos

| Contrato | Conteúdo mínimo | Consumidores |
|---|---|---|
| ElectionCatalog | Eleições, pleitos, turnos, cargos e abrangências disponíveis | Bootstrap, filtros |
| GeographyCatalog | UF, município TSE, vínculo IBGE validado, região analítica, pais e geometria | Mapas, filtros, breadcrumb |
| Overview | Progresso, resumo presidencial, Missão, cadeiras e eventos | Visão Geral |
| PresidentResult | Todos os candidatos, identidade/foto, votos, percentual com base, totais e status | Presidente e Outros; agrupamento usa lista completa |
| SenateResult por UF | Vagas, ranking, situação parcial/oficial, suplentes, seções, eleitorado e totais de votos | Senado |
| SeatResult por cargo/UF | Agregação, partidos membros, vagas, candidatos, ordem, faixa e situação oficial | Cadeiras, bancadas |
| SeatSummary | Consolidação nacional federal, por UF e recorte Missão, com cobertura e eventos | Visão Geral, Cadeiras, Missão |
| MissionSummary por território/cargo | Votos, participação, vagas no contexto pertinente e indicadores territoriais | Missão |
| GeographicResults | Resultados por filho territorial, métricas/denominadores, progresso, ids da geometria | Mapas, rankings e drill-down |
| SessionSeries | Amostras de totalização e cadeiras, mantidas em memória na aba atual | Gráficos da sessão aberta |
| SessionEvents | Tipo, território/cargo, antes/depois e horário de recebimento | Mudanças observadas nesta sessão |
| FeedStatus | Último recebimento TSE, falhas e recursos afetados | Proveniência e alertas |

Dados de local/seção e referência ao BU são contratos P2; não devem ser simulados como se já fossem cobertos pelo EA18.

Cada EA terá schema/adaptador TypeScript, fixture e testes de serialização/conversão para o modelo de domínio. Não haverá modelo Python runtime ou API de dados própria.

### Correspondência com fontes TSE

| Fonte | Função no pipeline |
|---|---|
| EA11 | Descobrir eleição, cargos e rotas de arquivos/fotos |
| EA12 | Cadastro municipal e zonas; conciliação com geometrias |
| EA14 / EA15 | Acompanhamento e indícios de atualização por UF/município |
| EA20 | Resultados, progresso, candidatos, agregações e situação eleitoral |
| EA10 | Confirmação complementar final para Senado e deputado federal |
| EA16 / EA18 | Seções/agregações e descoberta de arquivos de urna, preparando P2 |
| BU + cadastro de locais | Votos por seção e vínculo com local/endereço/bairro, em P2 |

Conferências oficiais críticas: o percentual do candidato é relativo a votáveis concorrentes; vagas proporcionais pertencem à agregação; há campos condicionais antes da primeira parcial e conforme o tipo de agregação. A implementação deve respeitar essas condições, inclusive na ausência de destinação de voto. [EA20 oficial](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado).

O EA10 não é universal para os cargos do produto; sua cobertura de primeiro turno inclui Senado e deputado federal. [EA10 oficial](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea10-arquivo-de-resultado-de-eleitos).

O EA11 inclui `ft` no dicionário de tipos de arquivo, permitindo descobrir a rota de fotos. [EA11 oficial](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea11-arquivo-de-configuracao-de-eleicoes).

O EA18 fornece metadados e referências de arquivos de urna; os votos por seção exigem processamento da fonte de urna apropriada. [EA18 oficial](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea18-arquivo-auxiliar-de-secao).

### Ambientes TSE verificados em 04/10/2026

- **Simulado/staging:** `https://resultados-sim.tse.jus.br/simulado/simulado2026`; pleito `17801`; eleições `21270` (Federal), `21272` (Estadual) e `21274` (Conselho Distrital). O TSE documenta formatos EA10, EA11, EA12, EA14, EA15, EA16, EA18 e EA20 para a divulgação e descreve simulado de abrangência nacional/cargos; o CDN não oferece listagem de arquivos. Confirmamos diretamente a configuração `ele-c.json` e um EA20 presidencial (`f=s`, `dg=29/09/2026`). Ainda não validamos payloads acessíveis para cada um dos demais EAs. As janelas oficiais de simulado terminaram em 29/09/2026, então os dados são fixtures de desenvolvimento, não atualização ao vivo. Obter arquivos por rotas descobertas na configuração/documentação, sem enumerar URLs; marcar indisponibilidade por EA, especialmente para EA10 e EA18, cuja geração é condicional. [Página técnica TSE 2026](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados), [arquivos e especificações EA](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados), [configuração do simulado](https://resultados-sim.tse.jus.br/simulado/simulado2026/comum/config/ele-c.json), [EA20 Presidência simulado](https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json).
- **Oficial:** base `https://resultados.tse.jus.br`, ambiente `oficial`; códigos publicados para 04/10/2026: `6257` (Federal), `6259` (Estadual) e `6261` (Conselho Distrital). O TSE informa que a divulgação começa às 17h de Brasília. O bootstrap deve descobrir ciclo e códigos a partir de `ele-c.json`, não reutilizar ids do simulado. [Página técnica oficial](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados), [divulgação 2026](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/divulgacao-dos-resultados-das-eleicoes-2026).
- O limite publicado é 100 requisições/s por IP e URLs incorretas/404 podem causar bloqueio. Não enumerar caminhos: ler bootstrap/configuração, limitar chamadas e identificar respostas de origem simulado (`f=s`) e oficial (`f=o`). Em 04/10/2026, GET do EA20 no Firefox, com página local em `http://localhost:3000`, retornou 200/JSON no contexto do app; `HEAD` retornou 403, portanto validar com GET. A origem oficial ainda precisa ser testada no domínio de produção. [Página técnica TSE 2026](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados).

**Decisão operacional registrada:** desenvolver parsers/adapters com fixtures simuladas `f=s` para todos os EAs do escopo. Às 17h de 04/10/2026 (Brasília), configurar a ingestão para o perfil oficial `f=o` e os códigos descobertos no EA11 oficial. Não fazer fallback entre ambientes; testar e validar cada EA disponível, mantendo fixtures sintéticas identificadas e validação real pendente quando o CDN não tiver payload elegível.

## 6. Estrutura proposta do monorepo

Manter `web/`, `contracts/` e `infra/` na raiz. O diretório `worker/` existente é um parser experimental legado, fora do runtime; não há motivo para novos processos, banco ou orquestrador.

```text
apurador-missao/
├── AGENTS.md
├── README.md
├── docs/
│   ├── product/
│   │   ├── escopo_inicial_apuracao_eleicoes_2026.md
│   │   └── analise_tecnica_e_plano_inicial.md
│   ├── architecture/             # decisões técnicas e publicação
│   ├── design/                   # inventário de frames e lacunas
│   ├── tse/                      # referências, versões e mapeamentos
│   └── operations/               # execução, recuperação e encerramento
├── contracts/
│   └── v1/
│       ├── schemas/
│       └── fixtures/
├── web/
│   ├── src/
│   │   ├── app/                  # layout e rotas estáticas
│   │   ├── theme/
│   │   ├── components/           # shell e apresentação compartilhada
│   │   ├── features/
│   │   │   ├── overview/
│   │   │   ├── president/
│   │   │   ├── senate/
│   │   │   ├── seats/
│   │   │   ├── mission/
│   │   │   ├── geography/
│   │   │   └── explorer/         # P1
│   │   ├── data/                 # cliente, polling, validação
│   │   ├── contracts/            # tipos TS alinhados a contracts/v1
│   │   └── mocks/
│   ├── public/                   # marca/fontes e assets do frontend
│   ├── tests/                    # comportamento, visual e E2E
│   └── package.json
├── data/
│   ├── reference/                # município → região; conciliação TSE/IBGE
│   └── geo/                      # geometrias versionadas e metadados
├── scripts/                      # preparação geográfica/contratos
├── infra/                        # hospedagem estática, certificado e DNS
└── .github/workflows/            # validações independentes e contratos
```

Dados eleitorais correntes e históricos não são armazenados pelo projeto nem entram no Git. Geometrias de referência têm origem, versão e processo de geração documentados. O diretório `worker/` existente contém um parser experimental legado, fora do runtime; os novos adapters serão implementados em `web/src/data/`.

## 7. Backlog em ordem de implementação

Cada item deve ser uma mudança pequena. Itens relacionados a UI incluem Light/Dark, teclado, comportamento mobile e comparação com o Figma. A ordem segue frontend com mocks antes da integração real, conforme o requisito.

**Atualização de execução:** TDD é obrigatório em todo o backlog, por decisão do usuário. Cada comportamento segue RED → GREEN → REFACTOR, com evidência de falha e sucesso. Configuração, documentação e assets recebem validações apropriadas. A regra está formalizada na seção 36.13 do requisito e no AGENTS.md.

| Ordem | Entrega | Dependência e aceite específico |
|---|---|---|
| 01 | Conciliar fontes e registrar decisões/lacunas | Corrigir referências editoriais; definir visual faltante antes da tela afetada; obter tabela regional |
| 02 | Raiz do repositório, README e AGENTS.md | Apontar para o requisito real, fontes e critérios de pronto |
| 03 | Esqueleto web e verificações | Build estático; lint/typecheck/testes disponíveis; dependências fixadas |
| 04 | Tokens, tipografia e logos | Fidelidade aos dois temas; resolver contraste do amarelo |
| 05 | AppShell e navegação principal | Rotas estáticas e navegação por teclado; mobile/rail conforme decisão visual |
| 06 | Switch Light/Dark | Preservar rota e contexto; navegação permanece no tema |
| 07 | Envelope e contratos de leitura | Versão, origem, tempo e semântica de percentuais; fixtures válidas |
| 08 | Cliente de dados e estados operacionais mockados | Mesmo contrato para mock/produção; loading/vazio/erro/atraso identificáveis |
| 09 | Visão Geral | Resumo presidencial, indicadores, eventos e proveniência |
| 10 | Presidente: ranking e filtros | Lista completa no contrato, três candidatos no resumo; fotos/placeholder |
| 11 | Presidente: Outros | Expandir/recolher; soma consistente; tema preserva expansão |
| 12 | Senado: parcial por UF | Ranking e corte por quantidade de vagas; rótulo correto; métricas obrigatórias |
| 13 | Senado: estado oficial e suplentes | Fixture final e ausência de confirmação; visual previamente detalhado |
| 14 | Cadeiras: composição federal | Agregações nacionais e tabela por UF; dados incompletos identificados |
| 15 | Cadeiras: Assembleias/DF | Contexto estadual e cargo distrital corretos |
| 16 | Cadeiras: ocupantes da faixa | Federação com múltiplos partidos; fotos, corte e eventos em mocks |
| 17 | Missão: resumos e recortes | Nacional/UF e vínculos com cadeiras; definir base de cada indicador |
| 18 | Preparação geográfica | TSE/IBGE conciliados; 399 municípios PR uma única vez; oito geometrias válidas |
| 19 | MapLibre compartilhado | Hover/toque, seleção, enquadramento, menor ênfase das demais áreas e alternativa textual |
| 20 | Brasil → UF → município | Breadcrumb e contexto sincronizam mapas, cards, filtros e rankings |
| 21 | PR → macrorregião → município | GeoJSON real; retorno preserva filtros; tema preserva seleção |
| 22 | P1: Explorar, capilaridade e gráficos | Dividir em três tarefas; métricas e limiares previamente fechados |
| 23 | Browser: EA11 e EA12 | Fixtures simuladas, bootstrap e geografia; testar origem, campos opcionais e adicionais |
| 24 | Browser: EA20 | Fixtures presidenciais, Senado e proporcionais por abrangência; perfis simulado/oficial |
| 25 | Browser: EA14 e EA15 | Fixtures simuladas; mudanças direcionam consultas; testar atraso e rejeição cruzada |
| 26 | Browser: EA10, EA16 e EA18 | Fixtures se elegíveis; confirmar/discover; marcar indisponibilidade condicional |
| 27 | Adapters e modelos TypeScript | Tradução isolada; validação/serialização com fixtures por EA |
| 28 | Regra P8 | Executar os dez cenários exigidos; não inventar ocupante quando faltarem válidos |
| 29 | Regra P9 e finais | Testar UF, faixa, suplentes e transição para situação oficial; não inferir comparecimento |
| 30 | Agregações territoriais e Missão | Votos/denominadores conciliados; cobertura e temporalidade explícitas |
| 31 | Séries e eventos da sessão | Amostras em memória; entrada/saída da faixa; nenhum histórico após reload |
| 32 | Scheduler de polling no browser | Ciclo 5 s, contexto ativo, revalidação de cache, retentativas/backoff e cancelamento |
| 33 | Integração direta com CDN | CORS, carregamento EA, erros HTTP/JSON e proveniência |
| 34 | CloudFront/OAC e frontend | Hospedagem estática apenas de site/assets; HTTPS, DNS, cache e rotas |
| 35 | Integração com payloads 2026 | Aceite P7/P8/P9; simulado e oficial; smoke GET/CORS oficial no domínio final; falhas e E2E |
| 36 | P2: BU e locais/seções | Importar cadastro; tratar seções agregadas; ligar votos ao local sem inferir residência |

As tarefas 18–22 são P1 e acompanham a sequência visual; podem ser planejadas como marco separado sem alterar o P0. Preparação da base regional deve começar cedo, pois depende de um documento externo ausente.

Critério de pronto: testes pertinentes ao item, lint/typecheck/build quando aplicáveis, fixtures rotuladas, paridade de contrato, visual Light/Dark e estados previstos. Publicação e processamento eleitoral exigem testes de falha e reexecução, não apenas o caminho feliz.

## 8. Riscos, inconsistências e decisões necessárias

### Problemas que afetam domínio ou aceite

| ID | Evidência | Impacto / encaminhamento |
|---|---|---|
| R01 | Vários trechos anteriores exigiam worker, API estática e snapshots persistentes | Arquitetura foi alterada por decisão do usuário para browser → CDN TSE; histórico agora é efêmero e só dura a sessão |
| R02 | RF-007/RF-013 usam Vale do Ivaí; lista fechada tem oito regiões e não inclui esse nome | Não criar uma nona região nem adivinhar sua equivalência. Substituir exemplos após consultar a tabela oficial do projeto |
| R03 | Documento município → região não está no workspace | Bloqueia classificação real e validação dos 399 municípios; geometrias ilustrativas do Figma não substituem essa fonte |
| R04 | RF-005 usa “superior a”; RF-029 usa ≥ | Muda contagem nos valores de fronteira. Decidir operador, denominador e tratamento de municípios sem apuração |
| R05 | Mapas/filtros obrigatórios estão só parcialmente prototipados | Completar estados de seleção, foco e retorno; não alegar que o protótipo já demonstra o fluxo inteiro |
| R06 | Senado e Cadeiras não têm estados finais/detalhes completos | Detalhar final/suplentes, ocupantes por UF, Assembleias e campos mínimos antes da implementação correspondente |
| R07 | Senado: requisito pede corte entre 2º/3º; frame coloca uma legenda após os quatro candidatos | Registrar divergência visual/funcional e definir a posição do separador |
| R08 | Missão/Noroeste exibem seleção, mas KPIs continuam no contexto pai | Definir representação de seleção versus navegação; RF-008/RF-012 exigem atualização de contexto, não só highlight |
| R09 | Figma rotula Presidência `% votos válidos`; contrato pode usar percentual oficial com outra base | Contrato deve distinguir métricas; não reutilizar o mesmo valor sob rótulos diferentes |
| R10 | “Tempo anormal” e dados atrasados sem limiar | Definir tolerância por fase, cobertura e tipos de falha; polling a cada 5 s não garante dados novos a cada 5 s |
| R11 | Regra de faixa descrita durante parcial; destino do voto pode faltar antes dela | Não classificar líderes antes de existir parcial válida; testar ausências, códigos novos e estados sem candidatos |
| R12 | Eventos Senado são “poderá” em RF-004, mas obrigatórios no sucesso do MVP | Planejar como obrigatórios conforme seção 31; harmonizar redação |
| R13 | Figma mostra série histórica, agora limitada pela arquitetura à sessão atual | O gráfico começa vazio/parcial quando a página abre; não recupera pontos anteriores. Validar se esse recorte atende o produto |
| R14 | “Cadeiras do partido” quando o partido integra federação | Manter vagas oficiais da federação separadas dos ocupantes filiados ao partido; não duplicar nem inventar quota oficial |
| R15 | Variação Δ e “desde 18:30” no Figma sem regra temporal completa | Definir referência da variação nos cards/tabelas; eventos comparam amostras da sessão |
| R16 | Tema e Outros definidos; efeito de polling ao mudar o top 3 não detalhado | Definir continuidade da lista expandida e da seleção quando a ordenação mudar; não congelar o ranking oficial |
| R17 | GET/CORS funcionou para EA20 simulado em `localhost:3000`; origem oficial e domínio final ainda não testados | Antes do lançamento, executar smoke GET no domínio real; TSE limita 100 req/s/IP e conta 304, então polling tem que ser único por recurso/contexto |

### Lacunas visuais e acessibilidade

- Não há tela dedicada a Explorar, visão municipal, Missão nacional ou local/seção.
- Estados de sistema e responsividade são descritos, mas não desenhados. Mobile admite duas alternativas de navegação, sem escolha definida.
- Exemplos usam placeholders de candidato; o layout com fotos oficiais ainda precisa ser validado.
- O botão de Foundations usa texto branco no amarelo. Para os tokens branco/#FDBF35, o contraste calculado é aproximadamente **1,66:1**; `on-primary` preto existe e produz aproximadamente **11,95:1**. Conciliar o componente com o token e o requisito de acessibilidade.
- Há cores de mapas/ícones sem tokens semânticos dedicados e telas sem bindings. Não copiar valores pontuais como novas regras de domínio visual.
- Barras presidenciais têm extensão uniforme apesar dos percentuais diferentes; não há escala/legenda funcional definida para elas. Confirmar se são decorativas ou quantitativas.
- O texto de Interface Requirements omite Senado na enumeração antiga de destinos, apesar de Senado existir nos frames e nas ligações.
- Textos técnicos como `cand.pvapn` aparecem na tela Senado: avaliar sua apresentação como nota explicativa legível antes de levar nomes brutos de campos ao produto.

### Riscos operacionais

O FAQ oficial informa limite de **100 requisições/s por IP**, contabiliza respostas 304 e alerta para bloqueios. Também explica que EA14/EA15 e EA20 são gerados/distribuídos de forma não simultânea. Logo, o scheduler precisa limitar concorrência e repetir consultas pendentes; marcar um recurso como atualizado só pelo sinal do acompanhamento pode perder uma atualização. [FAQ técnico TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados).

- Confirmar URLs e identidade das eleições pelo bootstrap; não assumir um único código para todos os cargos do ano.
- Separar finalização da apuração territorial de resultado oficial da disputa; município concluído não proclama senador.
- Evitar porcentagens com cobertura incompleta ou fontes de instantes distintos apresentadas como totais sincronizados.
- Tratar correções/reprocessamento: votos e cadeiras não são necessariamente monotônicos; o histórico não deve descartar reduções.
- Não usar timestamp de processamento novo para disfarçar resultado antigo. Guardar tempos de fonte e operação separadamente.
- JSONs atuais precisam de cache coerente com o polling; invalidação massiva a cada ciclo não deve ser o mecanismo normal.
- Perda da máquina, duplicação de processamento e falha de upload exigem recuperação testada a partir do S3.
- TSE/IBGE requer conciliação verificável de códigos; não completar zeros ou converter nomes como substituto de um mapeamento validado.
- O uso de `dv`, ausência de atribuição de eleitos, zero denominador, dados ausentes e retomada após falha requer estados explícitos, ainda sem desenho completo.

### Correções editoriais sem decisão funcional nova

- Corrigir referências internas a `docs/product/apuracao-2026.md` para o caminho existente.
- Corrigir numeração de subseções 25.x dentro da seção 26, 31.x dentro da seção 32 e item repetido na lista de testes.
- Atualizar texto do Figma sobre destinos e duração da transição após conciliar com o grafo.
- Registrar versões/datas das fontes TSE consultadas e relacionar cada teste ao respectivo EA/RF.

## 9. Primeiro incremento recomendado

Após tratar as divergências que afetem a fundação visual, executar apenas: **estrutura mínima + AGENTS.md + build estático + tokens Light/Dark + AppShell/navegação**. Usar conteúdo neutro, sem resultados eleitorais inventados. Contratos, mocks e Visão Geral vêm nas tarefas seguintes. Este relatório não executa esse incremento.
