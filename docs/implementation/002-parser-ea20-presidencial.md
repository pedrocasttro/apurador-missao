# 002 — Parser presidencial EA20 em TDD

## Incremento

Adicionado um primeiro parser isolado para o EA20 presidencial nacional (`0001` / `br`) e uma fixture do CDN de simulado do TSE. O parser produz nomes de domínio legíveis, ordena candidatos por votos atuais e preserva o percentual numérico como `Decimal`.

O campo TSE `f` é convertido para a proveniência explícita `simulated` ou `official`. Valores diferentes de `s` e `o` são rejeitados, e o chamador pode exigir uma origem para evitar mistura entre dados oficiais e simulados. O parser não interpreta os candidatos como eleitos nem deriva resultado final nesta etapa.

## Fonte da fixture

- Arquivo TSE: `https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21270/dados/br/br-c0001-e021270-u.json`
- Eleição de simulado `21270`, cargo Presidente, abrangência Brasil.
- O payload informa `f=s` e geração em `29/09/2026 16:29:12`; portanto, é material de desenvolvimento e não resultado atual.
- Os percentuais `pvapn` dessa fixture usam vírgula como separador decimal. O adapter converte esse formato para `Decimal`, sem arredondar.

## TDD

- **RED:** com os quatro testes escritos e um parser stub, `PYTHONPATH=worker/src python3 -m unittest discover -s worker/tests -v` falhou nos comportamentos ausentes. Durante a primeira implementação, o teste com payload real também revelou cargo sem zero à esquerda e separador decimal com vírgula; ambos foram corrigidos mantendo as expectativas funcionais.
- **GREEN:** o mesmo comando passou nos quatro testes.
- **Validação:** `python3 -m compileall -q worker/src worker/tests` passou.
- O ambiente atual não tem pytest instalado; o incremento usou `unittest` da biblioteca padrão para não bloquear a validação nem instalar dependências. O requisito do worker ainda prevê pytest para o pipeline completo.

## Limites

Este parser não faz polling, não consulta o TSE, não publica contratos no S3 e não alimenta a interface. O simulado oficial terminou antes de 04/10/2026; sua fixture permite desenvolver e verificar parsing/UI até a abertura da apuração, mas não fornece atualização contínua para ensaiar a ingestão ao vivo. A operação oficial começa às 17h (horário de Brasília), com `f=o` e os identificadores oficiais documentados em `docs/product/analise_tecnica_e_plano_inicial.md`.
