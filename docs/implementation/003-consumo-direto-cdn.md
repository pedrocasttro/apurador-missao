# 003 — Consumo direto da CDN pelo navegador

## Decisão

O frontend estático buscará os arquivos EA diretamente da CDN do TSE. O produto não terá API própria, worker de ingestão ou banco de dados. Os parsers/adapters e regras de agregação runtime serão TypeScript no browser. O polling ocorre a cada 5 segundos para os arquivos necessários ao contexto ativo.

Não persistir resultados ou histórico em servidor, banco, `localStorage`, `sessionStorage` ou IndexedDB. Amostras e eventos de evolução são voláteis e duram somente enquanto a aba atual estiver aberta; recarregar a página os perde.

S3/CloudFront, se adotados, hospedarão somente frontend e assets próprios, nunca JSONs eleitorais coletados ou normalizados.

## Evidência CORS local

Em 04/10/2026, o usuário executou no Web Console do Firefox, com a aplicação aberta em `http://localhost:3000`, um GET de:

```text
https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json
```

A resposta foi `200`, `application/json`, com corpo EA20 e `f=s`. Isso confirma que o navegador local consegue ler o EA20 simulado cross-origin. Um teste anterior com `HEAD` retornou `403`; HEAD não representa o GET usado por `fetch` e não deve ser usado como único teste CORS.

## Limites e aceite restante

- O teste comprova somente o domínio local e a CDN simulada. Antes de produção, executar GET via navegador no domínio real do frontend contra a CDN oficial, conferir `f=o`, CORS e a configuração EA11/códigos oficiais.
- A CDN pode enviar `Cache-Control: max-age` superior a cinco segundos. O cliente deverá revalidar com `cache: "no-cache"` por ciclo; não usar query de cache-busting. Validar que a CDN/browser reaproveite o corpo quando responder 304.
- O TSE publica limite de 100 requisições/s por IP e contabiliza 304. Consultar somente recursos usados pela tela/contexto, centralizar polling na aba e não enumerar rotas.
- O TSE pode não gerar atualização em cada intervalo de cinco segundos. A UI deverá mostrar horário de geração/recepção e estado de atraso.
- Gráficos e eventos não cobrem períodos anteriores à abertura da sessão atual. A série começa vazia/parcial; isso é uma limitação funcional aceita pela decisão de não persistir.

## TDD para a nova arquitetura

Antes do cliente de dados:

1. testar cada parser/adaptador TypeScript com fixtures simuladas 2026 dos EA utilizados;
2. testar aceitação de `f=s` no perfil simulado e `f=o` no perfil oficial, com rejeição cruzada;
3. testar status não-2xx, JSON inválido, timeout, CORS via smoke manual, e preservação do último dado válido com aviso de atraso;
4. usar relógio/fetch controlados para provar intervalo de cinco segundos, revalidação, deduplicação por recurso/contexto e cancelamento de consultas obsoletas;
5. testar séries/eventos em memória e verificar que nenhuma API de persistência do browser é chamada;
6. testar o export estático e o fluxo ponta a ponta com fixture sem depender da disponibilidade do TSE.

## Migração do protótipo anterior

O parser Python EA20 permanece apenas como experimento documentado em `worker/` e não será usado no runtime. O trabalho de integração prossegue em `web/src/data/`; não adicionar outros parsers Python.
