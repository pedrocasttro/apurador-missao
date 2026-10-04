# Incremento 001 — fundação com TDD

## Escopo

Formalizar TDD; estruturar monorepo mínimo; criar Next.js estático, tema Light/Dark, navegação e AppShell. Conteúdo eleitoral, contratos, mapas, ingestão e infraestrutura executável permanecem nos próximos incrementos.

## Referências

- Requisito: seções 4, 6, 34.2 e 36.13.
- Figma via MCP: sidebar Light `3:3`, Dark `19:45`; Main Light `3:47`, Dark `19:101`; Foundations `1:32`; protótipo `29:2` e equivalentes de tema.
- Logos vetoriais oficiais do arquivo: grupos `22:8` e `22:38`. SVGs locais preservam dimensões intrínsecas 131.229 × 103.5, no slot 138 × 110.916 com offsets do Figma.
- [Next.js: exportação estática](https://nextjs.org/docs/app/guides/static-exports).
- [MUI: integração Next.js](https://mui.com/material-ui/integrations/nextjs/).

## Decisões técnicas do incremento

- Node 22, npm workspaces e lockfile; nenhuma ferramenta adicional de orquestração.
- Vitest + Testing Library para comportamento; Playwright + axe para build estático e acessibilidade.
- Provider de tema no layout compartilhado, sem persistência entre sessões adicionada implicitamente.
- Ícones Lucide conforme requisito; logos reais exportadas do Figma. Fontes Inter distribuídas localmente pelo pacote @fontsource/inter.
- Contraste: usar `color/on-primary` preto existente em Foundations para texto sobre amarelo.
- Mobile: drawer entre as alternativas já descritas no Figma; tablet: rail; desktop: sidebar 240 px. Sem inventar destino adicional.
- Títulos de rota conhecidos são cascas de navegação, não telas eleitorais concluídas. O conteúdo eleitoral ainda não é renderizado; não adicionar mensagem de estado, mock ou dado que as fontes não definam.
- Next usa a API TypeScript (`experimental.useTypeScriptCli: false`) porque a execução CLI de `--showConfig` neste ambiente encerrou com saída vazia; `tsc --noEmit` continua como etapa explícita do CI.

## Cenários escritos antes da implementação

1. Seis destinos, somente uma página ativa e atalho para o conteúdo.
2. Troca de tema preserva controles e conteúdo expandido sem remontagem.
3. Switch opera pelo teclado e muda a logo.
4. Nenhuma parcial/atualização fictícia.
5. Navegação real preserva tema; switch preserva URL e query string.
6. Todas as rotas respondem diretamente no servidor estático.
7. Contraste e auditoria axe nos dois temas; assets locais carregam.
8. Drawer mobile fecha após navegação e Escape, restaura foco; rail tablet preserva destinos; sem overflow horizontal.

## Evidência de execução

- **RED observado antes da fundação:** os testes de comportamento executados contra a árvore vazia falharam por falta de navegação, alternância Light/Dark e identidade visual, como esperado; uma verificação negativa para conteúdo eleitoral fictício passou.
- **GREEN:** `npm run lint`, `npm run typecheck` e `npm test` passaram; os testes unitários cobrem seis cenários de tema, contraste, navegação, teclado e preservação do estado de controles.
- **Build:** `npm run build` gerou export estático para `/`, `/presidente/`, `/senado/`, `/cadeiras/`, `/missao/` e `/explorar/`.
- **Navegador:** `PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome npm run test:e2e` passou 10/10 cenários contra o export servido como arquivo estático, incluindo rotas diretas, navegação, query string, tema, mobile, tablet, Axe nos dois temas e assets locais. A inspeção visual em 1440 × 960 conferiu a hierarquia do shell e o slot da marca com o frame desktop do Figma.
- **Segurança de dependências:** `npm audit --omit=dev` reportou zero vulnerabilidades de produção. `npm audit` encontrou cinco alertas altos apenas na cadeia de lint `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`; a faixa afetada atual vai até `braces@3.0.3`, ainda a versão mais recente publicada consultada. A correção sugerida pelo audit rebaixaria `eslint-config-next` para 14.2.35 (breaking); manter Next 16 e registrar a atualização pendente do upstream.
- **Limite desta etapa:** sem dados eleitorais, contratos TSE, visualizações, interação de mapas ou análise cromática pixel a pixel; esses itens pertencem aos incrementos seguintes.
