# Incremento 006 — Expansão de “Outros” na Visão Geral

## Entrega

- A linha agregada “Outros” agora é um botão acessível que revela os demais candidatos presidenciais ordenados pela votação recebida do adapter EA20.
- Cada candidato expandido mantém foto (com fallback neutro), nome, votos e percentual. A ação “Recolher Outros” fecha novamente o grupo.
- O botão informa seu estado com `aria-expanded` e funciona por teclado via elemento nativo de botão.
- O subtítulo passou de “votos válidos” para “% da votação”, pois o EA20 `pvapn` usado nesta tela considera votos a votáveis concorrentes (`vvc`), conforme RF-002.

## TDD

- **RED:** depois de usar o Node 22 disponível em `/tmp/apuracao-toolchain/node_modules/node/bin`, o teste de aceite falhou porque não havia botão para expandir “Outros”. A primeira tentativa com o Node 20.11.1 do shell não carregou o Vitest (`node:util.styleText` ausente) e não foi considerada evidência RED.
- **GREEN:** implementação do botão, renderização da lista e recolhimento. Teste unitário direcionado passou (5/5), incluindo nomes, fotos e percentuais dos candidatos expandidos.
- **E2E:** o teste do export estático confirma expansão com Enter, recolhimento com Espaço, estados Light/Dark, acessibilidade Axe e viewport mobile sem overflow horizontal.

## Validação

- `npm run lint` — passou.
- `npm run typecheck` — passou após o build. Uma execução em paralelo ao build encontrou arquivos temporários `.next/types` sendo recriados e falhou por corrida, não por erro de tipos.
- `npm test` — 17 testes passaram; o teste direcionado também foi repetido após ampliar suas asserções.
- `npm run build` — passou e gerou o export estático.
- `npm run test:e2e --workspace web -- --grep "Visão Geral"` — passou (1/1). O servidor estático exige permissão de socket local, então a execução foi autorizada fora do sandbox.

## Limitações

- O arquivo Figma acessível nesta sessão apresenta Foundations, mas não contém frames da tela Presidente nem da interação de “Outros”. A composição visual desta etapa preserva a linha já existente; uma comparação com o frame presidencial continua pendente.
- Esta entrega cobre o agrupamento resumido em “Outros”. A tela dedicada `/presidente/` e a distribuição territorial selecionável continuam pendentes, pois ainda não há frame presidencial acessível nem dados territoriais configurados nesta etapa.
- Os dados da fixture são simulados e permanecem identificados como material de desenvolvimento; nenhum dado oficial foi validado por este incremento.
