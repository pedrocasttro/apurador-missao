# Incremento 007 — Aba Presidência

## Entrega

- A rota estática `/presidente/` consome EA11, EA12 e EA20 diretamente da CDN do TSE. O perfil esperado é conferido pelo campo `f` e divergências entre a eleição de EA11 e o endpoint configurado são rejeitadas.
- A tela permite localizar um candidato por nome, número ou partido, escolher `% de votos válidos` ou `Votos totais` e consultar Brasil, estado ou município. O seletor de cidade fica habilitado após a escolha da UF.
- A métrica percentual é derivada de `cand.vap / v.vv`; a métrica absoluta exibe `cand.vap`. O tooltip mostra o valor complementar.
- A tela identifica claramente o perfil simulado ou oficial, informa horário de atualização e consulta novamente os resultados a cada cinco segundos. Os dados ficam em memória.
- `ResultFilters` concentra os filtros de métrica, candidato e abrangência para reaproveitamento nas telas eleitorais seguintes.

## TDD e evidência

- **RED:** testes da tela foram escritos contra a rota ainda sem comportamento; falharam por falta de configuração, busca de candidato e dados por abrangência.
- **GREEN:** `PATH=/tmp/apuracao-toolchain/node_modules/node/bin:$PATH npm test --workspace web -- --run tests/president-page.test.tsx` — 2 testes passaram. Cobrem autocomplete, métricas e tooltips recíprocos, UF, cidade e endpoint de Curitiba.
- Um teste inicialmente falhou porque a expectativa exigia texto sem a continuação “· primeiro turno”; a asserção foi ajustada para localizar o rótulo territorial sem remover informação da UI. A primeira execução do teste completo teve timeout de 5 s durante inicialização concorrente; o timeout do caso foi aumentado para 10 s.
- `npm run lint --workspace web` — passou; `npm run typecheck --workspace web` — passou; `npm test --workspace web` — 19 testes passaram; `npm run build --workspace web` — passou e gerou `/presidente` como página estática.
- `PATH=/tmp/apuracao-toolchain/node_modules/.bin:$PATH PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e --workspace web -- --grep 'Presidência consome fixtures TSE'` — passou (1/1), incluindo busca por teclado, tooltip focável, Light/Dark, Axe e viewport mobile sem overflow.

## Fixtures e fontes

- EA11: `https://resultados-sim.tse.jus.br/simulado/simulado2026/comum/config/ele-c.json`, `f=s`, geração `14/09/2026 20:58:55`.
- EA12: `https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/config/mun-e021270-cm.json`, `f=s`, geração `14/09/2026 22:57:56`.
- EA20 Paraná: `https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/pr/pr-c0001-e021270-u.json`, `f=s`, geração `29/09/2026 16:29:09`.
- EA20 Curitiba: `https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/pr/pr75353-c0001-e021270-u.json`, `f=s`, geração `29/09/2026 16:29:21`.
- A montagem das rotas segue o contexto de implantação presente no endpoint configurado e os códigos descobertos por EA11; o conteúdo de EA12/EA20 é verificado antes de ser usado.
- Semântica conferida na documentação oficial do TSE: [EA11](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea11-arquivo-de-configuracao-de-eleicoes), [EA12](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea12-arquivo-de-configuracao-de-municipios) e [EA20](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado).

## Limitações

- Nesta entrega, o resultado apresentado é do candidato selecionado. A tabela comparativa e a interação de expansão de “Outros” pertencem à Visão Geral existente; não são repetidas na aba presidencial.
- A visualização cartográfica por estado/município depende das malhas territoriais oficiais e permanece fora deste incremento. A tela apresenta os totais e a abrangência textual do arquivo selecionado.
- A validação usa fixtures do perfil simulado. O perfil oficial, CORS no domínio publicado e atualização durante apuração real ainda precisam ser verificados quando a CDN liberar os arquivos oficiais.
- O filtro adicional de Deputado Federal/Estadual e a obrigatoriedade de UF para estadual pertencem à futura tela de Deputados.
