# Incremento 004 — Visão Geral com EA20 presidencial

## Entrega

- A rota `/` consulta diretamente o arquivo EA20 presidencial nacional no navegador.
- `NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL` seleciona o arquivo. O valor de desenvolvimento está em `web/.env.example`; o perfil simulado/oficial é conferido contra `f` e, sem override, inferido pelo domínio da URL.
- A consulta revalida com `cache: "no-cache"` e repete a cada cinco segundos após cada resposta, evitando requisições sobrepostas.
- O adapter TypeScript traduz totalização, votos válidos/brancos/nulos e candidatos para o domínio da UI. O resumo apresenta três candidatos e agrega os demais em `Outros`.
- Dados `f=s` são rotulados como simulados e acompanhados por aviso de que não representam apuração corrente.
- Erros HTTP e de parsing são mostrados, sem fallback para dados inventados.

## Fonte e limites desta etapa

A fixture do EA20 veio do endpoint simulado descrito em `docs/implementation/002-parser-ea20-presidencial.md` e registra `f=s`. Câmara, Assembleias e desempenho do partido não são apresentados como números: aguardam a descoberta/configuração dos recursos EA correspondentes. A troca para produção requer configurar a URL oficial descoberta via EA11 e confirmar GET/CORS na origem pública do app. Este incremento ainda não implementa o bootstrap EA11.

## TDD e validação

Os testes cobrem endpoint padrão e substituível, perfil/origem, código da eleição, transformação e ordenação, resposta HTTP e campo obrigatório, estados de interface, aviso de dados simulados, polling/backoff e acessibilidade nos temas claro/escuro e no mobile. No ciclo TDD do backoff, o RED mostrou uma segunda requisição antes de 10 s após a primeira falha; depois da mudança para backoff exponencial, o teste passou. Na comparação visual em 1440 px, o RED encontrou os painéis empilhados (diferença vertical de 299 px); o breakpoint passou a alinhar os painéis lado a lado conforme o Figma. Axe então sinalizou falta de role de imagem nos placeholders; foi corrigido com `role="img"` e nome acessível por candidato. Um RED adicional provou que a resposta `ele` poderia divergir do código no nome do arquivo; o cliente agora rejeita essa mistura de eleições.
