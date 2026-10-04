# Apuração Eleições 2026

## Fontes de verdade

1. `docs/product/escopo_inicial_apuracao_eleicoes_2026.md`: requisitos, domínio e arquitetura. Ler integralmente antes de iniciar trabalho relevante.
2. Figma MCP: https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV — consultar Light, Dark, Foundations e interações antes de codar UI.
3. Documentação oficial do TSE: semântica e campos eleitorais. Nunca inferir significado de abreviações.

## TDD obrigatório

- Toda mudança de comportamento começa por teste de aceite/comportamento escrito antes da implementação.
- RED: executar e confirmar que falha pelo comportamento ausente. Erro de ambiente não comprova RED; ausência inicial do módulo deve ser seguida de falha comportamental quando o módulo existir.
- GREEN: implementar somente o necessário para passar.
- REFACTOR: melhorar a estrutura mantendo os testes verdes.
- Correção de bug começa por teste de regressão. Não enfraquecer expectativas para acomodar um defeito.
- UI: Testing Library para comportamento e Playwright no build estático para navegação, tema, responsividade e acessibilidade. Comparar visualmente com o Figma.
- Dados no browser: antes de cada parser/adapter TypeScript, testar fixtures simuladas TSE (`f=s`) para EA10, EA11, EA12, EA14, EA15, EA16, EA18 e EA20; etiquetar origem, URL e geração. Se um EA estiver indisponível por condição documentada, usar fixture sintética rotulada e registrar a validação real como pendente. Testar perfil oficial (`f=o`), rejeição cruzada, CORS, erros HTTP/JSON, polling de 5 segundos e revalidação de cache. Não persistir estado eleitoral.
- Configuração, documentação e assets usam validação apropriada (build, lint, integridade, render), sem testes artificiais que apenas repetem sua implementação.
- Registrar evidência RED/GREEN, comandos e limitações na entrega. TDD não significa apenas adicionar testes depois ou perseguir uma porcentagem de cobertura.

## Restrições

- Manter Next.js estático (`output: 'export'`) → hospedagem estática S3/CloudFront opcional. O navegador consome diretamente a CDN do TSE; não criar API, worker de ingestão ou banco de dados.
- Nunca misturar mocks, simulado e resultados oficiais. Proveniência deve chegar até a interface.
- Usar o simulado no desenvolvimento. No perfil oficial, carregar EA11/códigos oficiais e validar GET/CORS no domínio final; sem fallback e sem reaproveitar IDs do simulado.
- Guardar amostras/eventos somente em memória durante a sessão; não usar localStorage, sessionStorage, IndexedDB, SQLite ou outro banco para resultados.
- Parcial não é eleito. P8/P9, federações, denominadores e proveniência devem ser preservados.
- Não inventar interação, resultado ou classificação territorial. Registrar conflitos; avançar no trabalho independente.
- Implementar por incrementos pequenos; não construir todo o produto em uma única tarefa.

## Validação

- Executar lint, typecheck, testes e build do escopo alterado antes de concluir.
- Para UI, testar Light/Dark, teclado e mobile; validar o aplicativo executando contra os frames correspondentes.
- Não deixar resultados ilustrativos aparentarem dados oficiais. Não declarar funcionalidade pronta com placeholder.
- Manter mudanças e documentação dentro do escopo autorizado.
