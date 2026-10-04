# Apuração Eleições 2026

Aplicação de acompanhamento de resultados oficiais do TSE. Fonte funcional: [escopo inicial](docs/product/escopo_inicial_apuracao_eleicoes_2026.md). Arquitetura e backlog: [análise técnica](docs/product/analise_tecnica_e_plano_inicial.md).

## Estado atual

Fundação do frontend, navegação e temas, mais a Visão Geral inicial conectada ao EA20 presidencial nacional. A arquitetura consome diretamente a CDN do TSE no navegador, sem API própria ou banco de dados.

## Desenvolvimento

Requisitos: Node 22 (ver `.nvmrc`), npm e Python 3 para servir o export nos testes ponta a ponta.

```sh
npm ci
npm run dev
```

Abrir http://127.0.0.1:3000. O padrão usa o arquivo simulado do TSE. Para trocar o arquivo, copie `web/.env.example` para `web/.env.local`, edite `NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL` e reinicie o servidor. Na produção, usar a URL EA20 descoberta pela configuração oficial EA11; a origem esperada também precisa corresponder a `f=o`. O build de produção é inteiramente estático, em `web/out/`:

```sh
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory web/out
```

## TDD e validação

Toda mudança de comportamento segue RED → GREEN → REFACTOR. Escrever o teste antes, executar e confirmar sua falha pelo comportamento ausente, implementar, refatorar e validar novamente. Ver [AGENTS.md](AGENTS.md) e seção 36.13 do requisito.

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm exec --workspace web -- playwright install chromium
npm run test:e2e
```

`npm run check` executa todas as validações, incluindo export e E2E. No Linux, o navegador pode precisar de bibliotecas do sistema: `npm exec --workspace web -- playwright install --with-deps chromium`. Para usar um Chrome já instalado, definir `PLAYWRIGHT_CHROME_PATH` com o caminho do executável.

Testes de componentes verificam tema, contexto, navegação e contraste. E2E usa o **build exportado** via servidor de arquivos, sem servidor Next.js, para verificar rotas, navegação, responsividade e acessibilidade.

## Estrutura

- `web/`: Next.js, TypeScript, MUI, Lucide e dependência MapLibre preparada para o incremento geográfico.
- `worker/`: parser Python experimental do incremento anterior; não faz parte da arquitetura runtime e não recebe novas integrações.
- `contracts/`: contratos internos TypeScript e fixtures para validar adapters do browser.
- `infra/`: hospedagem estática S3/CloudFront opcional; sem worker de ingestão.
- `docs/implementation/`: decisões e evidência RED/GREEN por incremento.

Dados oficiais, mocks e simulado serão diferenciados explicitamente. O browser consulta diretamente a CDN oficial do TSE a cada 5 segundos, limitado aos dados do contexto ativo. Acesso cross-origin de desenvolvimento ao CDN simulado foi confirmado no Firefox em `localhost:3000`; CORS do domínio oficial de produção ainda precisa de smoke test. Não há API própria, banco, SSE ou persistência de resultado.
