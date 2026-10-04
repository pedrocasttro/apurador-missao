# Parser Python experimental — fora do runtime

Este diretório contém o parser EA20 presidencial criado antes da decisão de consumir a CDN diretamente no navegador. Ele não faz parte da arquitetura runtime e não deverá receber novos parsers/ingestor.

Os schemas, adapters, domínio e polling ativos serão implementados em TypeScript em `web/src/data/`, com fixtures em `web/tests/fixtures/tse/`.

Não há banco de dados, SQLite, persistência eleitoral ou serviço público de leitura nesta arquitetura. A retenção do parser Python é temporária para referência do incremento documentado em `docs/implementation/002-parser-ea20-presidencial.md`.
