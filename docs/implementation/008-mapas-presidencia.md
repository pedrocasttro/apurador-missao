# Incremento 008 — Mapas da votação presidencial

## Entrega

- O contexto Brasil mostra um mapa interativo das 27 UFs. O contexto Estado mostra os municípios da UF selecionada. A cor amarela cresce linearmente com os votos absolutos do candidato no conjunto de áreas exibido; áreas sem resposta permanecem neutras e são contabilizadas.
- Clique, toque, Enter ou Espaço em uma área com resultado avança Brasil → UF → município e sincroniza os filtros existentes.
- O mapa apresenta votos e percentual de votos válidos no nome acessível da área. A métrica do resultado continua controlando a exibição do cartão; a escala do mapa permanece baseada em votos absolutos, conforme pedido.
- Os resultados territoriais são consultados diretamente nos EA20 por filho geográfico, com até duas requisições concorrentes; os resultados do mapa renovam a cada 60 segundos. O resultado do contexto selecionado continua no polling de cinco segundos.
- A conversão das malhas está reproduzível em `web/scripts/generate-president-map-assets.mjs`. Os assets foram reduzidos a trajetos SVG sem trazer dados de resultados.

## TDD e validação

- **RED:** `PATH=/tmp/apuracao-toolchain/node_modules/node/bin:$PATH npm test --workspace web -- --run tests/president-page.test.tsx -t 'mostra mapa do Brasil'` falhou porque a tela não tinha mapa de votação por UF.
- **GREEN:** testes da rota confirmam intensidade proporcional com fixture real de Paraná, drill-down para Paraná e Sarandi, troca de votos/percentual e acessibilidade dos controles.
- `npm run lint --workspace web` — passou; `npm run typecheck --workspace web` — passou; `npm test --workspace web` — 21 testes passaram.
- A checagem de integridade confirma 27 UFs e 399 geometrias municipais do Paraná, com códigos IBGE de sete dígitos e trajetos válidos.

## Fontes territoriais

- Malhas: IBGE, Malha Municipal Digital 2025. Arquivos [Brasil/UFs](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/Brasil/) e [municípios por UF](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2025/UFs/). O dataset Brasil foi usado para produzir um asset simplificado para cada UF.
- Correspondência: `EA12.mu.cdi` (código IBGE) liga municípios eleitorais TSE às geometrias IBGE; `EA12.mu.cd` segue como identificador dos arquivos EA20 municipais.
- Resultado de Sarandi: `https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/pr/pr84611-c0001-e021270-u.json`, `f=s`, geração `29/09/2026 16:29:23`.

## Resultado por local e seção

- A seleção de município ainda não mostra votos por seção. O contrato EA20 fornece resultados agregados por município e zona, não por seção. A documentação TSE direciona essa granularidade ao EA16 → EA18 → arquivo BU; EA18 informa os nomes dos BUs, que precisam ser baixados e interpretados para obter os votos.
- O arquivo EA16 de seções do simulado para o pleito obtido em EA11 retornou HTTP 404, sem fixture real de EA16/EA18/BU disponível neste ambiente. Não foi usado dado inventado para preencher essa lista.
- Foi localizado o cadastro público TSE [Eleitorado por local de votação 2026](https://dadosabertos.tse.jus.br/pl/dataset/eleitorado-2026/resource/300626b4-2b24-4d2e-b4fc-46b569cfffe5), com município, zona, seção, nome do local de votação e endereço. Ele não contém resultados; precisa ser relacionado aos BUs quando a fonte oficial correspondente estiver disponível.
- Especificações usadas: [EA16](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea16-arquivo-de-configuracao-de-secoes-eleitorais), [EA18](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea18-arquivo-auxiliar-de-secao) e [instruções de download](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026).
