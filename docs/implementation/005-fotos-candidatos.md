# Incremento 005 — Fotos de candidatos na Visão Geral

O EA20 fornece `sqcand`. A URL da foto é construída sob o mesmo diretório da eleição, trocando `/dados/` por `/fotos/` e acrescentando `br/{sqcand}.jpeg`, como especifica o guia de download do TSE 2026. A URL do arquivo EA20 permanece selecionável via `NEXT_PUBLIC_TSE_EA20_PRESIDENT_URL`.

O componente de avatar usa a foto diretamente da CDN. Quando a imagem não carrega, exibe o ícone neutro existente. Não persiste imagens ou resultados em serviço do projeto.

O teste de unidade verifica a construção da URL simulada e a presença do `src`; dispara erro de imagem e verifica o fallback. O E2E intercepta a rota de foto para testar uma imagem carregada, além de manter Axe nos temas claro/escuro.

Fonte: [Instruções do TSE para download dos arquivos da Divulgação de resultados das Eleições 2026](https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026).
