# Escopo Inicial — Apuração Eleições 2026

## 1. Visão do Projeto

Criar uma aplicação web para acompanhamento da apuração das Eleições Gerais de 2026, utilizando dados oficiais do Tribunal Superior Eleitoral (TSE), com foco em:

- acompanhamento da eleição presidencial;
- acompanhamento da apuração do Senado Federal por unidade da Federação;
- desempenho nacional e regional do Partido Missão;
- acompanhamento da disputa por cadeiras na Câmara dos Deputados;
- acompanhamento da disputa por cadeiras nas Assembleias Legislativas;
- identificação dos candidatos que ocupam, na parcial, as cadeiras atribuídas ao partido/federação;
- análise territorial da votação;
- visualizações específicas para o Paraná utilizando as 8 macrorregiões analíticas definidas no projeto.

A aplicação deve priorizar leitura rápida durante a apuração, atualização automática e exploração territorial dos resultados.

---

## 2. Objetivos

### 2.1. Objetivo principal

Permitir acompanhar, em tempo próximo do real, a evolução dos resultados eleitorais e transformar os dados oficiais do TSE em visualizações mais analíticas.

### 2.2. Objetivos específicos

- visualizar a apuração presidencial nacional;
- acompanhar a disputa pelas duas vagas do Senado em cada UF/DF nas Eleições 2026;
- visualizar os candidatos que ocupam provisoriamente a faixa das vagas do Senado durante a parcial;
- acompanhar a votação do Missão;
- visualizar a distribuição geográfica dos votos;
- acompanhar cadeiras federais e estaduais por partido/federação;
- visualizar quais candidatos estão ocupando as vagas na parcial;
- registrar mudanças de cadeiras durante a apuração;
- permitir navegação territorial;
- permitir análise específica do Paraná por regiões analíticas;
- acompanhar a evolução dos resultados durante a sessão aberta, sem persistir dados eleitorais próprios.

---

## 3. Fonte de Dados

A fonte primária será a divulgação oficial de resultados do TSE.

O sistema não terá API própria, worker de ingestão nem banco de dados. O navegador buscará diretamente os arquivos JSON publicados na CDN do TSE. O acesso deverá ser validado por CORS para os domínios local e de produção antes do uso operacional.

Para o MVP, o fluxo esperado é propositalmente simples:

```text
CDN do TSE (JSONs EA)
        ↓ fetch direto / polling de 5 s
Frontend estático
        ↓
Adapters, validação e regras de domínio em TypeScript
        ↓
Estado em memória da sessão
        ↓
Visualizações
```

Os arquivos do TSE representam a fonte de verdade eleitoral. O frontend valida e transforma os contratos EA em modelos internos estáveis antes de renderizá-los.

Os componentes React não deverão depender dos nomes abreviados dos campos do TSE. Um cliente de dados e adapters TypeScript no navegador farão essa tradução; não haverá uma camada de publicação de contratos JSON própria.

O S3/CloudFront poderá hospedar exclusivamente os arquivos estáticos do frontend e assets próprios. Os resultados eleitorais não serão copiados, armazenados nem distribuídos pela infraestrutura do projeto.

---

## 4. Arquitetura Inicial

### 4.1. Princípio

A primeira versão deverá privilegiar simplicidade operacional, baixo custo e facilidade de deploy.

Arquitetura adotada para o MVP:

```text
CDN TSE ── JSONs EA ──> Browser
                            ↓
                  cliente TypeScript (polling)
                            ↓
              adapters / domínio / estado em memória
                            ↓
                        interface

CloudFront/S3 estático ──> entrega do frontend e assets próprios
```

Não há máquina de ingestão nem serviço público de dados. Cada sessão do navegador consulta a CDN do TSE diretamente.

### 4.2. Frontend

Stack inicial:

- Next.js;
- TypeScript;
- MUI;
- Lucide;
- MapLibre GL JS;
- `output: 'export'` para geração estática.

O frontend estático poderá ser publicado no S3 e distribuído pelo CloudFront. Ele consulta os dados eleitorais diretamente na CDN do TSE.

### 4.3. Cliente de dados no navegador

Stack de dados:

- TypeScript no frontend;
- cliente HTTP para os arquivos documentados dos EA;
- schemas/adapters por EA;
- agregações e regras de domínio no navegador;
- atualização dos recursos necessários à tela a cada 5 segundos.

Não usar Python worker, SQLite, banco relacional, API própria ou armazenamento de resultados no servidor.

### 4.4. Estado e distribuição

S3/CloudFront poderão armazenar e distribuir o build estático, mapas e assets próprios. Nenhum resultado, snapshot, log eleitoral ou cache durável será armazenado pelo projeto. O estado anterior necessário a comparações e gráficos ficará somente em memória enquanto a sessão estiver aberta; recarregar ou fechar a página apaga esse histórico de sessão.

### 4.5. Atualização do frontend

O frontend deverá consultar os JSONs publicados pelo TSE a cada 5 segundos durante a apuração.

Fluxo:

```text
Browser
  ↓ GET
CDN do TSE / EA JSON
```

Cadência inicial sugerida:

- 5 segundos enquanto a sessão estiver aberta durante a apuração;
- backoff quando houver falhas, respeitando a recuperação da CDN.

O polling ocorre somente para arquivos necessários ao contexto ativo, com um scheduler compartilhado no frontend para evitar requisições duplicadas. Revalidar o cache HTTP a cada ciclo e respeitar `ETag`/`Last-Modified` quando suportados. A CDN contabiliza respostas 304 no limite de acesso do TSE.

O cliente deverá solicitar revalidação HTTP (`cache: "no-cache"`) para que um `max-age` maior que 5 segundos não impeça a verificação no ciclo seguinte. Não adicionar parâmetros aleatórios de cache-busting às URLs TSE.

### 4.6. Deploy e domínio

Hospedagem estática opcional:

- S3 privado;
- CloudFront;
- ACM para certificado HTTPS;
- Route 53 ou DNS equivalente para apontamento do domínio.

Fluxo público:

```text
apuracao.dominio.com.br
        ↓
CloudFront
        ↓
S3
```

O bucket não deverá ser público diretamente. O acesso público deve ocorrer pelo CloudFront, preferencialmente com OAC.

### 4.7. Estrutura sugerida do repositório

```text
apuracao-2026/
├── AGENTS.md
├── README.md
├── docs/
│   └── product/
│       └── apuracao-2026.md
├── web/
│   ├── src/
│   ├── public/
│   └── package.json
└── infra/
    └── hosting estática opcional
```

### 4.8. Evitar no MVP

- Kafka;
- RabbitMQ;
- Kubernetes;
- Redis;
- RDS/PostgreSQL sem necessidade comprovada;
- FastAPI apenas para servir dados que podem ser distribuídos como JSON estático;
- múltiplos microserviços;
- infraestrutura excessivamente complexa.

---

## 5. Princípios Funcionais

### 5.1. Fonte oficial

Todas as informações eleitorais exibidas devem ser derivadas dos dados oficiais do TSE.

### 5.2. Parcial não é resultado final

Durante a totalização, o sistema deve usar textos como:

- "parcial";
- "cadeiras na parcial";
- "ocupando vaga na parcial";
- "na faixa de vagas".

Evitar considerar um candidato definitivamente eleito antes de a situação oficial permitir essa conclusão.

### 5.3. Evolução durante a sessão

Os arquivos do TSE representam o estado corrente da apuração. A interface poderá manter amostras em memória para desenhar evolução e eventos enquanto a sessão atual estiver aberta. Não haverá histórico durável, reconstrução após reload, nem compartilhamento de histórico entre pessoas ou dispositivos.

### 5.4. Dados territoriais

A aplicação deverá diferenciar:

- local onde os votos foram registrados;
- local de residência dos eleitores.

Quando houver análise por bairro, o bairro será o bairro do local de votação, e não necessariamente o bairro de residência do eleitor.

---

# 6. Estrutura da Aplicação

Navegação inicial:

```text
Apuração 2026

- Visão Geral
- Presidente
- Senado
- Cadeiras
- Missão
- Explorar
```

---

# 7. Visão Geral

## RF-001 — Status da apuração

Exibir:

- percentual totalizado;
- situação da eleição;
- horário da última atualização recebida do TSE;
- horário da última atualização processada pelo sistema;
- alerta caso os dados estejam sem atualização há tempo anormal.

Estados:

```text
Não iniciada
Em andamento
Totalizada
```

---

## RF-002 — Resultado presidencial

Exibir candidatos ordenados pela votação atual.

Informações mínimas por candidato:

- foto oficial do candidato, quando disponibilizada pelo TSE;
- nome de urna;
- partido/número quando aplicável ao contexto da tela;
- votos;
- percentual dos votos válidos, calculado como `cand.vap / v.vv × 100`, igual à métrica padrão da tela Presidente;
- identificar explicitamente a métrica como `% dos votos válidos`.

O campo oficial `cand.pvapn` do EA20 tem outra base de cálculo (votos computados do candidato em relação a `vvc`) e não deverá ser apresentado nesta lista, para que o percentual presidencial seja consistente entre a Visão Geral e a tela Presidente.

Informações gerais da disputa:

- votos válidos;
- votos brancos;
- votos nulos;
- percentual totalizado.

A foto do candidato deverá ser associada ao registro eleitoral oficial, preferencialmente a partir do identificador `sqcand`. Caso a imagem ainda não esteja disponível, falhe ao carregar ou não exista na fonte oficial, a interface deverá utilizar um placeholder neutro sem interromper a exibição dos demais dados do candidato.

### Agrupamento `Outros`

Na visualização resumida da disputa presidencial, o protótipo adota a exibição dos 3 candidatos mais votados individualmente e agrega os demais em uma linha `Outros`.

A linha `Outros` deverá:

- exibir o percentual agregado dos candidatos ocultos na visão resumida;
- ser clicável;
- expandir a própria lista ao ser acionada;
- exibir individualmente todos os candidatos que compõem o agrupamento;
- mostrar, no mínimo, foto, nome e percentual de cada candidato expandido;
- manter os candidatos ordenados pela votação atual;
- permitir recolher novamente a lista sem sair da tela de Presidente.

A soma dos percentuais individuais exibidos no estado expandido deverá ser consistente com o percentual agregado apresentado em `Outros`, respeitando eventuais diferenças exclusivamente decorrentes de arredondamento da apresentação.

A interação deverá existir tanto no tema claro quanto no tema escuro e utilizar transição visual equivalente ao comportamento representado no protótipo.

O usuário deverá poder selecionar um candidato e visualizar sua distribuição territorial.

---


# 8. Senado Federal

## RF-003 — Apuração do Senado por UF

A aplicação deverá possuir uma visão específica para a apuração do cargo de Senador.

Nas Eleições Gerais de 2026:

- o Senado Federal renovará 54 das 81 cadeiras;
- cada estado e o Distrito Federal elegerão 2 senadores;
- cada eleitora ou eleitor poderá registrar 2 votos para o cargo de Senador;
- a eleição é majoritária simples;
- não há segundo turno para Senador.

O sistema deverá tratar a disputa do Senado como uma eleição **por unidade da Federação**, e não como uma única eleição nacional.

A tela deverá permitir selecionar uma UF e exibir, no mínimo:

- percentual totalizado;
- quantidade de seções totalizadas;
- comparecimento e abstenção da UF;
- total de votos do cargo;
- votos a votáveis concorrentes;
- votos válidos;
- votos brancos;
- votos nulos;
- foto oficial do candidato, quando disponível;
- candidato;
- partido;
- votos do candidato (`cand.vap`);
- percentual oficial do candidato (`cand.pvapn`);
- posição na ordenação oficial (`cand.seq`);
- situação parcial derivada pela aplicação;
- situação oficial final quando disponível.

O arquivo principal será o EA20 do cargo Senador (`0005`) na abrangência UF. O TSE também disponibiliza o mesmo cargo nas abrangências município e zona, permitindo análise territorial dentro da UF.

Exemplos de arquivos:

```text
<uf>-c0005-e<eleição>-u.json
<uf><município>-c0005-e<eleição>-u.json
<uf><município>-z<zona>-c0005-e<eleição>-u.json
```

Não existe EA20 nacional (`br`) para o cargo Senador, pois sua abrangência eleitoral é a UF.

### Percentual exibido

Quando a interface utilizar diretamente `cand.pvapn`, o rótulo deverá ser:

```text
% da votação
```

ou outro texto equivalente que não afirme incorretamente que esse percentual é calculado exclusivamente sobre votos válidos.

A especificação EA20 define `cand.pvap/pvapn` como o percentual de votos computados atribuídos ao candidato em relação aos **votos a votáveis concorrentes (`vvc`)**.

Caso a aplicação queira exibir um percentual calculado especificamente sobre votos válidos, essa métrica deverá ser calculada pela própria aplicação e identificada explicitamente como métrica derivada.

### Regra de comparecimento

Como cada eleitor possui 2 escolhas para Senador em 2026, o sistema não deverá assumir que o total de votos do cargo (`v.tv`) equivale ao comparecimento (`e.c`).

Comparecimento e abstenção deverão ser lidos diretamente do elemento `e` do EA20.

---

## RF-004 — Faixa das vagas e resultado final do Senado

O número de vagas da disputa deverá ser obtido de:

```text
EA20.carg[].nv
```

Para a eleição ordinária de 2026, o valor esperado é 2 em cada UF/DF.

Durante a parcial (`and = p` e/ou `tf = n`), a aplicação deverá classificar provisoriamente os primeiros `nv` candidatos válidos na ordenação oficial do TSE (`cand.seq`) como:

```text
IN_SENATE_RANGE
```

Os demais candidatos válidos serão classificados como:

```text
OUTSIDE_SENATE_RANGE
```

Na interface, utilizar textos como:

- `na faixa`;
- `ocupando uma das 2 vagas na parcial`;
- `fora da faixa`.

Não utilizar `eleito` apenas porque o candidato está entre os dois primeiros durante uma parcial.

Quando houver totalização final, os campos oficiais do TSE deverão prevalecer:

```text
cand.e
cand.st
```

O EA10 deverá ser utilizado como confirmação complementar dos Senadores oficialmente eleitos. Para Eleições Gerais Ordinárias de primeiro turno, o TSE prevê arquivo EA10 de abrangência Brasil para o cargo Senador (`0005`), agrupando os eleitos por UF.

Exemplo:

```text
br-c0005-e<eleição>-e.json
```

Para cada senador, a aplicação deverá aceitar e manter em memória os respectivos suplentes informados em `vs[]`, utilizando:

```text
s1 → 1º suplente
s2 → 2º suplente
```

### Eventos da parcial

A aplicação poderá registrar eventos próprios quando houver mudança na faixa das duas vagas:

```text
00:18:31 — PR — Candidato B entrou na faixa do Senado
00:18:31 — PR — Candidato C saiu da faixa do Senado
```

Esses eventos são derivados pela aplicação e não devem ser apresentados como proclamação oficial de eleito.

---

# 9. Missão

## RF-005 — Visão geral do partido

Exibir indicadores consolidados do partido.

Exemplo:

```text
MISSÃO

Presidência
X votos
Y%

Senado
X candidaturas na faixa em Y UFs

Câmara Federal
X cadeiras na parcial

Assembleias
X cadeiras na parcial
```

Também exibir indicadores territoriais calculados pelo sistema.

Exemplos:

- municípios com pelo menos 1 voto;
- municípios com votação superior a 1%;
- municípios com votação superior a 3%;
- municípios com votação superior a 5%;
- municípios com votação superior a 10%.

---

# 10. Navegação Territorial

## RF-006 — Hierarquia territorial

A aplicação deverá permitir navegação por:

```text
Brasil
  ↓
Estado
  ↓
Região analítica
  ↓
Município
  ↓
Local de votação
  ↓
Seção
```

A camada "Região analítica" poderá variar conforme o estado.

No primeiro momento, essa camada será implementada com foco no Paraná.

---

## RF-007 — Breadcrumb territorial

Exemplo:

```text
Brasil > Paraná > Vale do Ivaí > Ivaiporã
```

O usuário deverá poder voltar para qualquer nível anterior.

---

# 11. Mapa Nacional

## RF-008 — Mapa eleitoral

O mapa deverá permitir selecionar:

```text
Cargo
Partido
Candidato
Métrica
```

Métricas iniciais:

- votos absolutos;
- percentual dos votos válidos.

O mapa deverá atualizar conforme os filtros selecionados.

### Interação comum dos mapas por polígonos

Todos os mapas territoriais da aplicação deverão tratar suas geometrias como elementos interativos, incluindo UF, macrorregião, município e demais níveis que possuam polígonos próprios.

No desktop, ao posicionar o cursor sobre um polígono:

- destacar visualmente a área;
- identificar a área em tooltip quando houver informação contextual disponível.

Ao clicar ou tocar em um polígono:

- manter a área selecionada;
- aplicar foco/zoom para enquadrar a geometria selecionada no mapa (`fitBounds` ou comportamento equivalente no MapLibre);
- reduzir a ênfase visual das áreas não selecionadas;
- atualizar os cards, indicadores, rankings e filtros contextuais para a área selecionada;
- atualizar o breadcrumb territorial;
- permitir avançar para o próximo nível territorial quando houver drill-down disponível;
- oferecer uma ação clara para retornar ao nível geográfico anterior.

No mobile, o toque/clique deverá ser o mecanismo principal de interação; nenhum comportamento essencial poderá depender exclusivamente de hover.

A seleção territorial deverá permanecer ativa até que o usuário selecione outra área, retorne no breadcrumb ou utilize uma ação explícita de limpar/voltar.

---

# 12. Visão Estadual

## RF-009 — Estado

Ao selecionar um estado, exibir:

- votação presidencial;
- votação do Senado, com ranking dos candidatos da UF e destaque das duas vagas na parcial;
- votação do Missão;
- votação para deputado federal;
- votação para deputado estadual/distrital;
- cadeiras federais na parcial;
- cadeiras estaduais na parcial;
- mapa municipal;
- ranking por votos;
- ranking por percentual.

---

# 13. Paraná — Regionalização Analítica

## RF-010 — Macrorregiões do Paraná

Criar uma camada territorial própria para análise dos resultados do Paraná.

A regionalização adotada no projeto será composta por 8 macrorregiões:

- Campos Gerais;
- Centro-Sul;
- Litoral;
- Noroeste;
- Nordeste;
- Oeste;
- Região Metropolitana de Curitiba;
- Sudoeste.

A relação município → macrorregião será baseada no documento de referência fornecido para o projeto e deverá ser convertida para uma estrutura versionada no repositório.

Formato sugerido:

```json
{
  "ibge_code": "XXXXXXX",
  "municipality": "SARANDI",
  "macroregion": "NOROESTE"
}
```

Antes do uso em produção, a estrutura deverá ser validada para garantir:

- todos os 399 municípios do Paraná presentes;
- nenhum município ausente;
- nenhum município duplicado entre macrorregiões;
- associação única município → macrorregião.

Essa regionalização é uma classificação analítica da aplicação.

---

## RF-011 — Mapa regional do Paraná

O mapa do Paraná deverá ser subdividido visualmente pelas 8 macrorregiões cadastradas.

Cada macrorregião deverá possuir uma geometria própria em GeoJSON.

A geometria será construída antecipadamente pela união (`dissolve/union`) dos polígonos municipais que pertencem a cada macrorregião.

Arquivos sugeridos:

```text
data/geo/
├── parana-municipalities.geojson
└── parana-macroregions.geojson
```

Exemplo:

```text
municípios da macrorregião
        ↓
geometrias municipais
        ↓
dissolve / union
        ↓
polígono da macrorregião
```

O frontend deverá utilizar MapLibre GL JS para renderização e interação com os mapas.

---

## RF-012 — Interação com região

Ao posicionar o cursor sobre uma região:

- destacar o polígono;
- apresentar tooltip;
- mostrar nome da região;
- votos;
- percentual dos votos válidos;
- percentual totalizado.

Ao clicar:

- manter a região selecionada;
- destacar o polígono;
- reduzir visualmente o destaque das demais regiões;
- centralizar e aplicar foco/zoom na geometria selecionada, enquadrando-a na área útil do mapa;
- atualizar todos os indicadores da página;
- atualizar tabelas;
- atualizar rankings;
- atualizar o breadcrumb territorial;
- permitir avançar para os municípios da região;
- permitir retornar ao Paraná completo sem perder os demais filtros analíticos ativos.

O foco visual deverá representar seleção de contexto e não apenas efeito de hover. O mesmo princípio deverá ser aplicado aos mapas de UF, município e demais níveis geográficos implementados na aplicação.

---

## RF-013 — Drill-down regional

Exemplo:

```text
Paraná
  ↓
Vale do Ivaí
  ↓
Ivaiporã
```

Ao entrar em uma região, o mapa deverá passar a exibir seus municípios.

---

# 14. Município

## RF-014 — Visão municipal

Exibir:

- votação;
- percentual;
- totalização;
- locais de votação;
- resultado por candidato;
- resultado por partido;
- comparações internas.

---

# 15. Local de votação e bairro

## RF-015 — Resultado por local de votação

Permitir visualizar resultados agregados por local de votação.

Informações mínimas:

- nome;
- endereço;
- bairro do local;
- votos;
- percentual;
- seções relacionadas.

---

## RF-016 — Bairro

Permitir agrupar os locais de votação pelo bairro do próprio local.

A interface deve utilizar nomenclatura semelhante a:

> Resultados nos locais de votação do bairro

Não utilizar:

> Votos dos moradores do bairro

sem existir fonte oficial que permita essa afirmação.

---

# 16. Seção

## RF-017 — Resultado por seção

Permitir visualizar o resultado das seções eleitorais quando essa granularidade estiver disponível no pipeline.

Exemplo:

```text
Seção    Votos    %
206       71     21,1%
207       62     18,9%
208       51     15,7%
```

---

# 17. Câmara dos Deputados

## RF-018 — Cadeiras por partido/federação

Exibir a composição parcial da Câmara dos Deputados.

A apuração de deputado federal ocorre por UF.

A visão nacional será uma consolidação realizada pela aplicação.

Exemplo:

```text
Partido/Federação       Cadeiras
Partido A                  80
Partido B                  65
MISSÃO                     14
...
```

---

## RF-019 — Cadeiras do Missão por UF

Exemplo:

```text
MISSÃO — Câmara Federal

PR    3
SP    4
SC    2
MG    2
...
```

---

## RF-020 — Ocupantes das vagas

A faixa parcial será derivada de `agr.vag` e da ordenação `cand.seq` dos candidatos válidos pertencentes à mesma agregação (`agr`). Em federações, candidatos de todos os partidos membros concorrem à mesma faixa.

Ao selecionar uma UF:

```text
MISSÃO • PR
Deputado Federal

3 cadeiras na parcial

1. Candidato A   ● na faixa
2. Candidato B   ● na faixa
3. Candidato C   ● na faixa
----------------------------
4. Candidato D   ○ fora da faixa
```

O sistema deverá respeitar a classificação oficial disponível na apuração.

---

# 18. Assembleias Legislativas

## RF-021 — Cadeiras estaduais

Permitir selecionar uma UF e visualizar a composição parcial da Assembleia Legislativa.

Exemplo:

```text
Paraná — ALEP

Partido A     11
Partido B      8
MISSÃO         5
...
```

Para o Distrito Federal, tratar deputado distrital conforme a estrutura oficial da eleição.

---

## RF-022 — Bancada estadual do Missão

Exibir:

- quantidade de cadeiras na parcial;
- candidatos na faixa das vagas;
- candidatos imediatamente fora da faixa;
- votos;
- classificação.

---

# 19. Mudanças de Cadeiras

## RF-023 — Eventos de cadeiras

Sempre que a quantidade de vagas atribuídas a um partido/federação mudar, gerar um evento.

Exemplo:

```text
19:42:18
MISSÃO ganhou 1 cadeira federal no PR
Candidato X entrou na faixa

19:39:02
MISSÃO perdeu 1 cadeira federal em SP
Candidato Y saiu da faixa
```

---

# 20. Estado de sessão

## RF-024 — Amostras de evolução em memória

Enquanto a página permanecer aberta, manter em memória os valores recebidos em ciclos sucessivos para alimentar gráficos e eventos de evolução. A amostra deverá incluir apenas os dados necessários à interface e o horário de recebimento.

Não persistir amostras em banco, arquivo, S3, `localStorage`, `sessionStorage` ou IndexedDB. Fechar/recarregar a página encerra o histórico da sessão. Não prometer reconstrução histórica completa.

## RF-025 — Mudanças de cadeiras em sessão

Comparar o resultado atual com a amostra anterior mantida em memória para identificar entradas/saídas da faixa e variações de cadeiras enquanto a sessão estiver aberta. A comparação não deverá depender de snapshots duráveis.

---

# 21. Histórico

## RF-026 — Evolução de cadeiras

Permitir visualizar a quantidade de cadeiras ao longo do tempo durante a sessão atual, usando amostras em memória coletadas pelo polling de 5 segundos. A série começa vazia/parcial e acumula dados após a página ser aberta; não inventar pontos anteriores nem recuperar histórico de sessões passadas.

Exemplo:

```text
17:00    0
17:30    4
18:00    8
18:30   11
19:00   13
19:30   12
20:00   14
```

---

## RF-027 — Evolução presidencial

Permitir acompanhar como o percentual dos candidatos mudou durante a totalização enquanto a sessão atual estiver aberta. O gráfico usa apenas as amostras observadas nessa sessão e começa a acumular após a página ser aberta.

Relacionar sempre o resultado ao percentual totalizado naquele instante.

---

# 22. Explorador Eleitoral

## RF-028 — Filtros analíticos

Criar uma tela de exploração com os filtros:

```text
Cargo
Partido
Candidato
Estado
Região
Município
Métrica
```

A alteração dos filtros deverá atualizar:

- mapa;
- indicadores;
- ranking;
- tabelas.

---

# 23. Capilaridade

## RF-029 — Dispersão territorial

Calcular indicadores territoriais.

Exemplo:

```text
Municípios com ≥ 1 voto
Municípios com ≥ 1%
Municípios com ≥ 3%
Municípios com ≥ 5%
Municípios com ≥ 10%
```

Esses dados podem ser apresentados nacionalmente e por estado.

---

# 24. Atualização em Tempo Próximo do Real

## RF-030 — Polling direto da CDN no navegador

Enquanto a sessão da aplicação estiver aberta durante a apuração, o cliente de dados deverá consultar a CDN do TSE a cada 5 segundos, buscando apenas os recursos necessários ao contexto ativo. Usar EA11/EA14/EA15 para descobrir a configuração e orientar consultas quando aplicável; não varrer rotas.

Revalidar recursos em cada ciclo respeitando cache HTTP e validadores (`ETag`/`Last-Modified`) quando suportados pela CDN. Tratar 304 como resposta sem mudança; o TSE informa que 304 também conta para limite de requisições. O intervalo de 5 segundos é a cadência solicitada pelo produto, não garantia de que o TSE publique dados novos nesse ritmo.

Suspender consultas duplicadas de componentes na mesma aba e evitar polling de rotas não usadas. Erros, 404 e respostas inválidas devem ser mostrados/logados no cliente com backoff; a aplicação não deverá tentar enumerar nomes de arquivos.

---

## RF-031 — Atualização automática da interface

O usuário não deverá precisar recarregar a página. O navegador consome a CDN do TSE diretamente, valida e adapta o EA, compara com o estado anterior em memória e atualiza as visualizações. Componentes React recebem somente o modelo de domínio interno, nunca o JSON bruto do TSE.

A leitura deve ser testada em desenvolvimento local e no domínio de produção via CORS. Se a CDN oficial não autorizar a origem pública do app, a atualização direta não funciona; não criar proxy silencioso, pois API/serviço de dados está fora do escopo.

---

# 25. Integridade e Observabilidade

## RF-032 — Proveniência

Exibir:

```text
Fonte: Tribunal Superior Eleitoral
Última atualização TSE: HH:mm:ss
Última resposta recebida no navegador: HH:mm:ss
```

---

## RF-033 — Estado de atualização

Detectar situações como:

- TSE sem atualização;
- arquivo indisponível;
- falha no parsing;
- atraso do arquivo em relação ao polling;
- falha de rede/CORS no fetch direto.

O sistema não deve apresentar dados antigos como se fossem atuais sem sinalização.

---

# 26. Contrato de Integração com o TSE

### Referências oficiais dos contratos

As especificações foram validadas contra os documentos oficiais publicados pelo TSE em:

- https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados
- EA10: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea10-arquivo-de-resultado-de-eleitos
- EA11: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea11-arquivo-de-configuracao-de-eleicoes
- EA12: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea12-arquivo-de-configuracao-de-municipios
- EA14: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea14-arquivo-de-acompanhamento-brasil
- EA15: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea15-arquivo-de-acompanhamento-uf
- EA16: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea16-arquivo-de-configuracao-de-secoes-eleitorais
- EA18: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea18-arquivo-auxiliar-de-secao
- EA20: https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/tse-ea20-arquivo-de-resultado-unificado
- Regras 2026 para Senado e quantidade de vagas: https://www.tse.jus.br/eleicoes/cde-2026
- Ordem de votação e dois votos para Senador: https://www.tse.jus.br/comunicacao/noticias/2026/Marco/eleicoes-2026-conheca-a-ordem-de-votacao-na-urna-eletronica
- Resolução-TSE nº 23.751/2026: https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-751-de-26-de-fevereiro-de-2026
- FAQ técnico 2026: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados

Fonte complementar para locais de votação:

- https://dadosabertos.tse.jus.br/dataset/eleitorado-2026

## 25.1. Arquivos oficiais adotados

O projeto adotará os seguintes arquivos da Divulgação de Resultados do TSE 2026:

```text
EA10
EA11
EA12
EA14
EA15
EA16
EA18
EA20
```

Responsabilidade prevista:

```text
EA10 → resultado agregado de eleitos para os cargos/abrangências previstos pelo arquivo; no escopo atual, confirmação complementar de Senadores e Deputados Federais
EA11 → configuração da eleição
EA12 → municípios e zonas
EA14 → controle nacional de atualização
EA15 → controle estadual/municipal de atualização
EA16 → configuração de seções
EA18 → dados auxiliares para granularidade por seção/urna
EA20 → resultados, votos, candidatos, partidos/federações,
       totalização e vagas
```

Cada EA deverá possuir:

- parser próprio;
- schema próprio;
- validação independente;
- adapter para o domínio interno.

Estrutura sugerida:

```text
tse/
├── schemas/
│   ├── ea10.py
│   ├── ea11.py
│   ├── ea12.py
│   ├── ea14.py
│   ├── ea15.py
│   ├── ea16.py
│   ├── ea18.py
│   └── ea20.py
│
└── adapters/
    ├── election.py
    ├── geography.py
    ├── tracking.py
    ├── results.py
    └── elected.py
```

O restante da aplicação não deverá depender diretamente dos nomes de campos do TSE.

Fluxo:

```text
TSE JSON
   ↓
schema/parser
   ↓
adapter
   ↓
domínio interno
   ↓
PostgreSQL
```

## 25.2. Papel do EA20

O EA20 será o núcleo da apuração e deverá alimentar:

- Presidência;
- Senado;
- votos por candidato;
- votos por partido/federação;
- totalização;
- deputado federal;
- deputado estadual/distrital;
- quantidade de vagas por agremiação/federação;
- estado parcial/final da apuração.

Campos já considerados relevantes no contrato EA20 incluem, entre outros:

```text
ele
t
f
tpabr
cdabr
dg
hg
idg
dt
ht
tf
and

carg[]
  cd
  nv
  qe
  fed[]
  agr[]
    n
    nm
    tp
    vag
    par[]
      n
      sg
      nfed
      cand[]
        sqcand
        nmu
        dvt
        seq
        e
        st
        vap
        pvap
```

A implementação final deverá ser validada contra arquivos 2026 reais ou simulados.

## 25.3. Uso do EA10

O EA10 será utilizado como fonte complementar de confirmação de eleitos nos cargos e abrangências em que o TSE gera esse arquivo.

Nas Eleições Gerais Ordinárias de 2026, ele não cobre todo o nosso conjunto de cargos. Para o escopo da aplicação, será utilizado para confirmação agregada dos **Senadores** e dos **Deputados Federais** eleitos.

Presidente, Deputados Estaduais e Deputados Distritais deverão ter sua situação final obtida no EA20 (`cand.e`/`cand.st`), respeitando `tf` e `and`.

O EA10 não deverá substituir o EA20 durante a parcial.

## 25.4. Fontes complementares

Os EAs cobrem o núcleo eleitoral oficial, porém o produto também utilizará dados complementares:

```text
TSE → resultados eleitorais
TSE → fotos oficiais dos candidatos, associadas ao identificador da candidatura quando disponíveis
IBGE/malha geográfica → polígonos de UF e município
Nossa tabela → município → macrorregião do Paraná
TSE Dados Abertos — Eleitorado por local de votação 2026 → local/endereço/bairro
Snapshots próprios → histórico da apuração
```


## 25.5. Contratos TSE 2026 validados campo a campo

### Status da validação

Os contratos abaixo foram revisados contra as especificações oficiais publicadas pelo TSE para as Eleições 2026.

Arquivos validados:

- EA10 — Arquivo de resultado de eleitos;
- EA11 — Arquivo de configuração de eleições;
- EA12 — Arquivo de configuração de municípios;
- EA14 — Arquivo de acompanhamento Brasil;
- EA15 — Arquivo de acompanhamento UF;
- EA16 — Arquivo de configuração de seções eleitorais;
- EA18 — Arquivo auxiliar de seção;
- EA20 — Arquivo de resultado unificado.

Para implementação, considerar quatro classificações:

| Classificação | Significado |
|---|---|
| `CORE` | Campo utilizado pelo domínio funcional e normalmente persistido |
| `OPS` | Campo utilizado pelo cliente de dados, controle de atualização ou observabilidade |
| `COND` | Campo condicional que deve ser aceito pelo parser, mas só é usado em determinados cargos/situações |
| `PASS` | Campo aceito pelo parser, porém sem necessidade de persistência no MVP |

### Regras gerais dos parsers

1. Cada EA terá schema e parser próprios.
2. O parser deve aceitar ausência de campos que a documentação classifica como condicionais.
3. Identificadores territoriais e eleitorais usados em nomes de arquivos devem ser normalizados como strings, preservando ou recompondo zeros à esquerda quando aplicável.
4. `idg` identifica a geração do arquivo específico. Não deve ser tratado como contador global entre EAs distintos.
5. `f=s` representa simulado e `f=o` representa oficial.
6. Em produção, dados oficiais deverão ser diferenciados explicitamente de fixtures/simulação.
7. Nos pares de percentual em que o TSE fornece uma representação formatada e outra numérica de maior precisão, o domínio deverá preferir a variante numérica terminada em `n` para armazenamento e cálculos.
8. O frontend não deve consumir os campos abreviados do TSE diretamente. A tradução ocorre nos adapters.
9. O raw JSON poderá ser opcionalmente armazenado para diagnóstico, mas não será o modelo de domínio da aplicação.
10. Schemas devem permitir evolução compatível: campos adicionais desconhecidos não devem derrubar a ingestão, mas devem gerar log de observabilidade.

---

### 25.5.1. EA10 — Resultado de eleitos

**Arquivo:** `<br|uf>-c<cargo>-e<eleição>-e.json`

**Uso no projeto:** confirmação complementar de eleitos após totalização.

**Restrição relevante para 2026:** nas Eleições Gerais Ordinárias, o EA10 não é uma fonte universal para todos os cargos. A especificação prevê, no primeiro turno, arquivo de abrangência Brasil para Governador, Senador e Deputado Federal. Para nosso escopo, ele será utilizado para confirmação dos **Senadores** e **Deputados Federais** eleitos. Deputado Estadual/Distrital e Presidente deverão ser confirmados pelo EA20.

| Caminho | Significado no domínio | Uso |
|---|---|---|
| `ele` | código da eleição | `CORE` |
| `cdabr` | abrangência do arquivo (`br`/UF) | `CORE` |
| `nmabr` | nome da abrangência | `PASS` |
| `t` | turno | `CORE` |
| `f` | simulado/oficial | `OPS` |
| `cdcar` | código do cargo | `CORE` |
| `nmcar` | nome do cargo | `PASS` |
| `dg` | data de geração | `OPS` |
| `hg` | hora de geração | `OPS` |
| `idg` | geração do JSON | `OPS` |
| `abr[].dt` | data da última totalização da abrangência | `CORE` |
| `abr[].ht` | hora da última totalização | `CORE` |
| `abr[].tpabr` | tipo de abrangência (`uf`/`mu`) | `CORE` |
| `abr[].cdabr` | código da abrangência | `CORE` |
| `abr[].nmabr` | nome da abrangência | `PASS` |
| `abr[].tvap` | votos atribuídos a candidato/legenda | `CORE` |
| `abr[].scv` | indica ausência de candidatos para o cargo | `COND` |
| `abr[].esae` | eleição sem atribuição de eleito | `COND` |
| `abr[].mnae[]` | motivos da não atribuição de eleitos | `COND` |
| `abr[].cand[].n` | número do candidato | `CORE` |
| `abr[].cand[].sqcand` | identificador sequencial do candidato | `CORE` |
| `abr[].cand[].nm` | nome completo | `CORE` |
| `abr[].cand[].nmu` | nome de urna | `CORE` |
| `abr[].cand[].sgp` | sigla do partido | `CORE` |
| `abr[].cand[].com` | composição partidária/coligação | `COND` |
| `abr[].cand[].vap` | votos computados do candidato | `CORE` |
| `abr[].cand[].seq` | ordem do candidato | `CORE` |
| `abr[].cand[].vs[].tp` | vice/1º suplente/2º suplente | `COND` |
| `abr[].cand[].vs[].sqcand` | id do vice/suplente | `COND` |
| `abr[].cand[].vs[].nm` | nome do vice/suplente | `COND` |
| `abr[].cand[].vs[].nmu` | nome de urna do vice/suplente | `COND` |
| `abr[].cand[].vs[].sgp` | partido do vice/suplente | `COND` |

**Adapter sugerido:**

```text
EA10
  ↓
OfficialElectedCandidate[]
```

---

### 25.5.2. EA11 — Configuração de eleições

**Arquivo:** `ele-c.json`

**Uso no projeto:** bootstrap da integração. Deve ser o primeiro contrato consultado para descobrir pleitos, eleições, cargos, abrangências e diretórios de download.

| Caminho | Significado no domínio | Uso |
|---|---|---|
| `dg` | data de geração | `OPS` |
| `hg` | hora de geração | `OPS` |
| `idg` | geração do arquivo | `OPS` |
| `f` | simulado/oficial | `OPS` |
| `arq[].tp` | tipo do arquivo/diretório | `CORE` |
| `arq[].dir` | template/caminho de download | `CORE` |
| `pl[].cd` | código do pleito | `CORE` |
| `pl[].cdpr` | código do processo eleitoral | `CORE` |
| `pl[].c` | ciclo eleitoral | `CORE` |
| `pl[].dt` | data do pleito | `CORE` |
| `pl[].dtlim` | data limite da divulgação | `OPS` |
| `pl[].e[].cd` | código da eleição | `CORE` |
| `pl[].e[].cdt2` | código da eleição de segundo turno | `COND` |
| `pl[].e[].sqele` | sequencial da eleição no DivulgaCand | `COND` |
| `pl[].e[].nm` | nome da eleição | `CORE` |
| `pl[].e[].t` | turno | `CORE` |
| `pl[].e[].tp` | tipo da eleição | `CORE` |
| `pl[].e[].abr[].cd` | abrangência (`br`/UF) | `CORE` |
| `pl[].e[].abr[].mu[].cd` | código TSE do município | `COND` |
| `pl[].e[].abr[].mu[].cdi` | identificador IBGE informado pelo TSE | `COND` |
| `pl[].e[].abr[].cp[].cd` | código do cargo/pergunta | `CORE` |
| `pl[].e[].abr[].cp[].ds` | descrição do cargo/pergunta | `CORE` |
| `pl[].e[].abr[].cp[].tp` | majoritário/proporcional/consulta | `CORE` |

**Valores de `arq[].tp` a aceitar:** `e`, `u`, `ab`, `cm`, `cs`, `a`, `aux`, `ft`.

> Nota de robustez: a representação resumida do documento EA11 não lista todos os valores encontrados posteriormente no dicionário. O parser deve seguir o dicionário completo e aceitar `aux` e `ft`.

**Adapter sugerido:**

```text
EA11
  ↓
ElectionProcess
Plebiscite
Election
Office
DownloadRoute
```

---

### 25.5.3. EA12 — Configuração de municípios

**Arquivo:** `mun-e<eleição>-cm.json`

**Uso no projeto:** cadastro territorial eleitoral e relação município → zonas.

| Caminho | Significado no domínio | Uso |
|---|---|---|
| `dg` | data de geração | `OPS` |
| `hg` | hora de geração | `OPS` |
| `idg` | geração do arquivo | `OPS` |
| `f` | simulado/oficial | `OPS` |
| `abr[].cd` | sigla da UF | `CORE` |
| `abr[].ds` | nome da UF | `CORE` |
| `abr[].mu[].cd` | código TSE do município | `CORE` |
| `abr[].mu[].cdi` | identificador IBGE fornecido pelo TSE | `CORE` |
| `abr[].mu[].nm` | município | `CORE` |
| `abr[].mu[].c` | indica capital | `PASS` |
| `abr[].mu[].z[]` | zonas eleitorais do município | `CORE` |

**Regra de implementação:** `cd`, `cdi` e números de zona devem ser tratados no domínio como identificadores opacos/string. Não assumir comprimento sem validar payload real.

**Adapter sugerido:**

```text
EA12
  ↓
State
Municipality
ElectoralZone
```

---

### 25.5.4. EA14 — Acompanhamento Brasil

**Arquivo:** `br-e<eleição>-ab.json`

**Uso no projeto:** acompanhamento nacional, identificação do estágio da totalização e direcionamento do polling para UFs alteradas.

#### Raiz e abrangência

| Caminho | Significado | Uso |
|---|---|---|
| `ele` | eleição | `CORE` |
| `t` | turno | `CORE` |
| `f` | simulado/oficial | `OPS` |
| `dg` | geração — data | `OPS` |
| `hg` | geração — hora | `OPS` |
| `idg` | geração do arquivo | `OPS` |
| `abr[].and` | não iniciado/parcial/finalizado | `CORE` |
| `abr[].tpabr` | `br` ou `uf` | `CORE` |
| `abr[].cdabr` | `br` ou sigla da UF | `CORE` |
| `abr[].dt` | data da última totalização da abrangência | `CORE` |
| `abr[].ht` | hora da última totalização da abrangência | `CORE` |

#### Estados e municípios

| Campo | Significado | Uso |
|---|---|---|
| `ufsnr` | UFs não iniciadas | `CORE` |
| `pufsnr` | % formatado de UFs não iniciadas | `PASS` |
| `pufsnrn` | % numérico de UFs não iniciadas | `CORE` |
| `ufspt` | UFs em totalização | `CORE` |
| `pufspt` | % formatado de UFs em totalização | `PASS` |
| `pufsptn` | % numérico de UFs em totalização | `CORE` |
| `ufsf` | UFs finalizadas | `CORE` |
| `pufsf` | % formatado de UFs finalizadas | `PASS` |
| `pufsfn` | % numérico de UFs finalizadas | `CORE` |
| `munnr` | municípios não iniciados | `CORE` |
| `pmunnr` | % formatado | `PASS` |
| `pmunnrn` | % numérico | `CORE` |
| `munpt` | municípios em totalização | `CORE` |
| `pmunpt` | % formatado | `PASS` |
| `pmunptn` | % numérico | `CORE` |
| `munf` | municípios finalizados | `CORE` |
| `pmunf` | % formatado | `PASS` |
| `pmunfn` | % numérico | `CORE` |

#### `abr[].s` — seções

| Campo | Significado | Uso |
|---|---|---|
| `ts` | total de seções | `CORE` |
| `st` | seções totalizadas | `CORE` |
| `pst` | % formatado totalizado | `PASS` |
| `pstn` | % numérico totalizado | `CORE` |
| `snt` | seções não totalizadas | `CORE` |
| `psnt` | % formatado não totalizado | `PASS` |
| `psntn` | % numérico não totalizado | `CORE` |
| `si` | seções instaladas | `CORE` |
| `psi` | % formatado instaladas | `PASS` |
| `psin` | % numérico instaladas | `CORE` |
| `sni` | seções não instaladas | `CORE` |
| `psni` | % formatado não instaladas | `PASS` |
| `psnin` | % numérico não instaladas | `CORE` |
| `sa` | seções apuradas | `CORE` |
| `psa` | % formatado apuradas | `PASS` |
| `psan` | % numérico apuradas | `CORE` |
| `sna` | seções não apuradas | `CORE` |
| `psna` | % formatado não apuradas | `PASS` |
| `psnan` | % numérico não apuradas | `CORE` |

#### `abr[].e` — eleitorado

| Campo | Significado | Uso |
|---|---|---|
| `te` | eleitorado total | `CORE` |
| `est` | eleitorado em seções totalizadas | `CORE` |
| `pest` | % formatado | `PASS` |
| `pestn` | % numérico | `CORE` |
| `esnt` | eleitorado em seções não totalizadas | `CORE` |
| `pesnt` | % formatado | `PASS` |
| `pesntn` | % numérico | `CORE` |
| `esi` | eleitorado em seções instaladas | `CORE` |
| `pesi` | % formatado | `PASS` |
| `pesin` | % numérico | `CORE` |
| `esni` | eleitorado em seções não instaladas | `CORE` |
| `pesni` | % formatado | `PASS` |
| `pesnin` | % numérico | `CORE` |
| `esa` | eleitorado em seções apuradas | `CORE` |
| `pesa` | % formatado | `PASS` |
| `pesan` | % numérico | `CORE` |
| `esna` | eleitorado em seções não apuradas | `CORE` |
| `pesna` | % formatado | `PASS` |
| `pesnan` | % numérico | `CORE` |
| `c` | comparecimento | `CORE` |
| `pc` | % formatado de comparecimento | `PASS` |
| `pcn` | % numérico de comparecimento | `CORE` |
| `a` | abstenção | `CORE` |
| `pa` | % formatado de abstenção | `PASS` |
| `pan` | % numérico de abstenção | `CORE` |

**Regra de polling:** comparar `EA14.idg`; quando houver nova geração, comparar `abr[UF].dt/ht` e/ou estado de acompanhamento para decidir quais EAs/UFs precisam ser atualizados.

**Adapter sugerido:**

```text
EA14
  ↓
NationalTracking
StateTrackingHint[]
```

---

### 25.5.5. EA15 — Acompanhamento UF

**Arquivo:** `<uf>-e<eleição>-ab.json`

**Uso no projeto:** localizar alterações dentro de uma UF e acompanhar estado/municípios.

#### Raiz e abrangência

| Caminho | Significado | Uso |
|---|---|---|
| `ele` | eleição | `CORE` |
| `t` | turno | `CORE` |
| `f` | simulado/oficial | `OPS` |
| `dg` | data de geração | `OPS` |
| `hg` | hora de geração | `OPS` |
| `idg` | geração do arquivo | `OPS` |
| `abr[].and` | estado da totalização | `CORE` |
| `abr[].tpabr` | `uf` ou `mun` | `CORE` |
| `abr[].cdabr` | UF ou município | `CORE` |
| `abr[].dt` | data da última totalização | `CORE` |
| `abr[].ht` | hora da última totalização | `CORE` |
| `abr[].munnr` | municípios não iniciados | `CORE` |
| `abr[].pmunnr` | % formatado | `PASS` |
| `abr[].pmunnrn` | % numérico | `CORE` |
| `abr[].munpt` | municípios em totalização | `CORE` |
| `abr[].pmunpt` | % formatado | `PASS` |
| `abr[].pmunptn` | % numérico | `CORE` |
| `abr[].munf` | municípios finalizados | `CORE` |
| `abr[].pmunf` | % formatado | `PASS` |
| `abr[].pmunfn` | % numérico | `CORE` |

Os objetos `abr[].s` e `abr[].e` possuem os mesmos campos quantitativos definidos no EA14:

```text
s:
ts, st, pst, pstn, snt, psnt, psntn,
si, psi, psin, sni, psni, psnin,
sa, psa, psan, sna, psna, psnan

e:
te, est, pest, pestn, esnt, pesnt, pesntn,
esi, pesi, pesin, esni, pesni, pesnin,
esa, pesa, pesan, esna, pesna, pesnan,
c, pc, pcn, a, pa, pan
```

Aplicar a mesma regra: contadores e variantes numéricas `*n` são `CORE`; percentuais formatados são `PASS`.

**Regra de polling:** quando `EA15.idg` mudar, comparar `abr[município].dt/ht` para identificar os municípios cujo resultado precisa ser reconsultado.

**Adapter sugerido:**

```text
EA15
  ↓
StateTracking
MunicipalityTrackingHint[]
```

---

### 25.5.6. EA16 — Configuração de seções eleitorais

**Arquivo:** `<uf>-p<pleito>-cs.json`

**Uso no projeto:** município → zona → seção e descoberta do EA18.

| Caminho | Significado | Uso |
|---|---|---|
| `dg` | data de geração | `OPS` |
| `hg` | hora de geração | `OPS` |
| `idg` | geração do arquivo | `OPS` |
| `f` | simulado/oficial | `OPS` |
| `cdp` | código do pleito | `CORE` |
| `abr[].cd` | UF | `CORE` |
| `abr[].ds` | nome da UF | `PASS` |
| `abr[].mu[].cd` | município TSE | `CORE` |
| `abr[].mu[].nm` | nome do município | `CORE` |
| `abr[].mu[].zon[].cd` | zona eleitoral | `CORE` |
| `abr[].mu[].zon[].sec[].ns` | número da seção | `CORE` |
| `abr[].mu[].zon[].sec[].nsp` | seção principal quando a seção é agregada | `CORE` |
| `abr[].mu[].zon[].sec[].nsa[]` | seções agregadas à principal | `CORE` |
| `abr[].mu[].zon[].sec[].da` | data do EA18 da seção | `OPS` |
| `abr[].mu[].zon[].sec[].ha` | hora do EA18 da seção | `OPS` |

**Regra relevante:** `da` e `ha` só aparecem para seção principal e após geração do auxiliar correspondente. Eles podem ser usados para evitar consultas EA18 sem necessidade.

**Adapter sugerido:**

```text
EA16
  ↓
ElectoralZone
ElectoralSection
SectionAggregation
SectionAuxHint
```

---

### 25.5.7. EA18 — Auxiliar de seção

**Arquivo:**

```text
p<pleito>-<uf>-m<município>-z<zona>-s<seção>-aux.json
```

**Uso no projeto:** localizar os arquivos de urna de uma seção e conhecer situação/hash do recebimento.

| Caminho | Significado | Uso |
|---|---|---|
| `dg` | data de geração | `OPS` |
| `hg` | hora de geração | `OPS` |
| `idg` | geração do JSON | `OPS` |
| `f` | simulado/oficial | `OPS` |
| `st` | situação da seção | `CORE` |
| `hashes[].hash` | identificador hash dos arquivos recebidos | `CORE` |
| `hashes[].dr` | data do recebimento | `OPS` |
| `hashes[].hr` | hora do recebimento | `OPS` |
| `hashes[].st` | situação do conjunto/hash | `CORE` |
| `hashes[].arq[].nm` | nome do arquivo com extensão | `CORE` |
| `hashes[].arq[].tp` | tipo do arquivo | `CORE` |

Situações documentadas:

```text
Seção após recebimento:
- Recebida

Seção após totalização final:
- Não instalada
- Não apurada
- Anulada
- Totalizada

Hash após recebimento:
- Recebido

Hash após totalização final:
- Rejeitado
- Excluído
- Totalizado
```

Os arquivos de urna disponibilizados podem incluir, entre outros, BU, RDV e log da urna.

**Observação de escopo:** o EA18 não contém por si só os votos por candidato da seção; ele fornece metadados e caminhos/hashes dos arquivos de urna. Caso o produto precise do voto no nível da seção, será necessário consumir/processar o arquivo de urna adequado, especialmente o BU, usando o EA18 como índice auxiliar.

**Adapter sugerido:**

```text
EA18
  ↓
SectionReceipt
UrnFileReference[]
```

---

### 25.5.8. EA20 — Resultado unificado

**Arquivos:**

```text
Brasil:
br-c<cargo>-e<eleição>-u.json

UF:
<uf>-c<cargo>-e<eleição>-u.json

Município:
<uf><município>-c<cargo>-e<eleição>-u.json

Zona:
<uf><município>-z<zona>-c<cargo>-e<eleição>-u.json
```

Cargos centrais do projeto:

```text
0001 Presidente
0005 Senador
0006 Deputado Federal
0007 Deputado Estadual
0008 Deputado Distrital
```

Para `0005 Senador`:

- o tipo do cargo é majoritário de abrangência UF;
- existe EA20 por UF, município e zona;
- não existe arquivo EA20 de abrangência Brasil para o resultado do cargo;
- `carg[].nv` informa o número de vagas da disputa;
- `cand.vap` informa os votos computados do candidato;
- `cand.pvapn` informa o percentual do candidato em relação a `vvc`;
- `cand.vs[]` pode conter `s1` e `s2` para os suplentes;
- `cand.e` e `cand.st` devem prevalecer para a condição oficial final.

#### Raiz

| Campo | Significado | Uso |
|---|---|---|
| `ele` | eleição | `CORE` |
| `t` | turno | `CORE` |
| `f` | simulado/oficial | `OPS` |
| `sup` | eleição suplementar | `COND` |
| `tpabr` | `br`, `uf`, `mu`, `zona` | `CORE` |
| `cdabr` | código da abrangência | `CORE` |
| `dg` | data de geração | `OPS` |
| `hg` | hora de geração | `OPS` |
| `idg` | geração do arquivo | `OPS` |
| `dv` | votação pode ser divulgada | `CORE` |
| `dt` | data da totalização | `CORE` |
| `ht` | hora da totalização | `CORE` |
| `tf` | totalização final | `CORE` |
| `and` | não iniciado/parcial/finalizado | `CORE` |
| `md` | resultado matematicamente definido para majoritários | `COND` |
| `esae` | sem atribuição de eleito após final | `COND` |
| `mnae[]` | motivos da não atribuição | `COND` |

#### `carg[]`

| Campo | Significado | Uso |
|---|---|---|
| `cd` | cargo | `CORE` |
| `nmn` | nome neutro | `PASS` |
| `nmm` | nome masculino | `PASS` |
| `nmf` | nome feminino | `PASS` |
| `nv` | número de vagas do cargo | `CORE` |
| `qe` | quociente eleitoral | `CORE` para proporcionais |

#### `carg[].fed[]`

| Campo | Significado | Uso |
|---|---|---|
| `n` | número da federação | `CORE` |
| `nm` | nome | `CORE` |
| `sg` | sigla | `CORE` |
| `com` | composição | `CORE` |
| `npar[]` | números dos partidos membros | `CORE` |

#### `carg[].agr[]`

| Campo | Significado | Uso |
|---|---|---|
| `n` | número da agremiação | `CORE` |
| `nm` | nome | `CORE` |
| `tp` | coligação/partido isolado/federação (`c/i/f`) | `CORE` |
| `tvtn` | votos válidos nominais da agregação | `CORE` |
| `tvtl` | votos válidos de legenda | `CORE` |
| `tvan` | votos computados nominais | `CORE` |
| `tval` | votos computados de legenda | `CORE` |
| `vag` | vagas da federação/partido isolado na parcial | `CORE` |
| `com` | composição da agregação | `CORE` |

**Regra crítica:** `agr.vag` é a fonte oficial para a quantidade de cadeiras na parcial do partido isolado/federação. O valor pode mudar a cada totalização e só se torna definitivo no encerramento.

#### `carg[].agr[].par[]`

| Campo | Significado | Uso |
|---|---|---|
| `n` | número do partido | `CORE` |
| `sg` | sigla | `CORE` |
| `nm` | nome | `CORE` |
| `nfed` | federação do partido | `COND` |
| `dvt` | destinação do voto do partido | `CORE` |
| `tvtn` | votos válidos nominais | `CORE` |
| `tvtl` | votos válidos de legenda | `CORE` |
| `tvan` | votos computados nominais | `CORE` |
| `tval` | votos computados de legenda | `CORE` |

> Nota de validação: o diagrama estrutural da especificação cita `vag` sob `par`, porém o JSON canônico apresentado e o dicionário do elemento `par` não definem esse atributo. A implementação **não deve depender de `par.vag`**. Para cadeiras, utilizar `agr.vag`.

#### `carg[].agr[].par[].cand[]`

| Campo | Significado | Uso |
|---|---|---|
| `n` | número na urna | `CORE` |
| `sqcand` | identificador único/sequencial | `CORE` |
| `nm` | nome completo | `CORE` |
| `nmu` | nome de urna | `CORE` |
| `dt` | nascimento | `PASS` |
| `dvt` | destinação do voto | `CORE` |
| `seq` | ordem do candidato na eleição | `CORE` |
| `e` | eleito/2º turno (`s`/`n`) | `CORE` |
| `st` | situação final da totalização | `CORE` |
| `vap` | votos computados do candidato | `CORE` |
| `pvap` | percentual formatado | `PASS` |
| `pvapn` | percentual numérico | `CORE` |

`st` só deve ser considerado status oficial final quando houver totalização final. Valores documentados incluem:

```text
Eleito
Eleito por QP
Eleito por média
Não eleito
2º turno
Suplente
```

#### `cand[].vs[]`

| Campo | Significado | Uso |
|---|---|---|
| `tp` | vice, 1º suplente ou 2º suplente | `COND` |
| `sqcand` | id do vice/suplente | `COND` |
| `nm` | nome | `COND` |
| `nmu` | nome de urna | `COND` |
| `sgp` | partido | `COND` |

#### `cand[].subs[]`

| Campo | Significado | Uso |
|---|---|---|
| `nm` | nome do substituído | `COND` |
| `nmu` | nome de urna | `COND` |
| `sgp` | partido | `COND` |

#### `perg[]` / `resp[]`

Campos de consulta popular:

```text
perg[].cd
perg[].ds
resp[].n
resp[].ds
resp[].seq
resp[].e
resp[].st
resp[].vap
resp[].pvap
resp[].pvapn
```

Classificação: `PASS` no MVP das Eleições Gerais 2026. O parser pode aceitar esses objetos, mas eles não integram as telas atuais.

#### `s` — seções

```text
ts
st
pst
pstn
snt
psnt
psntn
si
psi
psin
sni
psni
psnin
sa
psa
psan
sna
psna
psnan
```

Mesma política do EA14/EA15: contadores e variantes numéricas `*n` são `CORE`; percentuais formatados são `PASS`.

#### `e` — eleitorado

```text
te
est
pest
pestn
esnt
pesnt
pesntn
esi
pesi
pesin
esni
pesni
pesnin
esa
pesa
pesan
esna
pesna
pesnan
c
pc
pcn
a
pa
pan
```

Mesma política: contadores e variantes numéricas são `CORE`.

#### `v` — votos

| Campo | Significado | Uso |
|---|---|---|
| `tv` | total de votos | `CORE` |
| `vvc` | votos a votáveis concorrentes | `CORE` |
| `pvvc` | percentual formatado | `PASS` |
| `pvvcn` | percentual numérico | `CORE` |
| `vv` | votos válidos | `CORE` |
| `pvv` | percentual formatado de válidos | `PASS` |
| `pvvn` | percentual numérico de válidos | `CORE` |
| `vl` | votos de legenda | `CORE` |
| `pvl` | percentual formatado | `PASS` |
| `pvln` | percentual numérico | `CORE` |
| `vnom` | votos nominais | `CORE` |
| `pvnom` | percentual formatado | `PASS` |
| `pvnomn` | percentual numérico | `CORE` |
| `van` | votos anulados | `CORE` |
| `pvan` | percentual formatado | `PASS` |
| `pvann` | percentual numérico | `CORE` |
| `vansj` | votos anulados sub judice | `CORE` |
| `pvansj` | percentual formatado | `PASS` |
| `pvansjn` | percentual numérico | `CORE` |
| `vscv` | votos sem candidato para votar | `COND` |
| `vb` | brancos | `CORE` |
| `pvb` | percentual formatado | `PASS` |
| `pvbn` | percentual numérico | `CORE` |
| `tvn` | total de nulos | `CORE` |
| `ptvn` | percentual formatado | `PASS` |
| `ptvnn` | percentual numérico | `CORE` |
| `vn` | nulos | `CORE` |
| `pvn` | percentual formatado | `PASS` |
| `pvnn` | percentual numérico | `CORE` |
| `vnt` | nulos técnicos | `CORE` |
| `pvnt` | percentual formatado | `PASS` |
| `pvntn` | percentual numérico | `CORE` |
| `vsan` | votos de seções anuladas | `COND` |

**Adapter sugerido:**

```text
EA20
  ↓
ElectionProgress
OfficeResult
PartyAggregationResult
PartyResult
CandidateResult
SeatAllocation
TurnoutResult
VoteTotals
```

---

## 25.6. Cobertura do escopo após validação dos EAs

| Funcionalidade | Fonte |
|---|---|
| Presidência nacional | EA20 BR / cargo 0001 |
| Presidência por UF | EA20 UF / 0001 |
| Presidência por município | EA20 município / 0001 |
| Presidência por zona | EA20 zona / 0001 |
| Senado por UF | EA20 UF / cargo 0005 |
| Senado por município | EA20 município / cargo 0005 |
| Senado por zona | EA20 zona / cargo 0005 |
| Quantidade de vagas do Senado na UF | `EA20.carg[].nv` |
| Suplentes de Senador | `EA20.carg[].agr[].par[].cand[].vs[]` (`s1`/`s2`) |
| Senadores oficialmente eleitos | EA10 BR / cargo 0005, agrupado por UF |
| Deputado Federal | EA20 / 0006 |
| Deputado Estadual | EA20 / 0007 |
| Deputado Distrital | EA20 / 0008 |
| Cadeiras de partido/federação | `EA20.carg[].agr[].vag` |
| Votos do partido/federação | EA20 `agr/par` |
| Votos de candidato | EA20 `cand` |
| Situação oficial final do candidato | EA20 `cand.e/cand.st` |
| Confirmação complementar de Senadores e Deputados Federais | EA10 |
| Configuração de pleitos/eleições/cargos | EA11 |
| Município e zonas | EA12 |
| Acompanhamento Brasil/UF | EA14 |
| Acompanhamento UF/município | EA15 |
| Município → zona → seção | EA16 |
| Arquivos de urna de seção | EA18 |
| Evolução da parcial | amostras em memória da sessão atual |
| Macrorregiões do Paraná | tabela própria |
| Polígonos | GeoJSON/malha geográfica |
| Local de votação e bairro | dataset `Eleitorado por local de votação - 2026` do TSE |
| Voto por seção | BU/arquivo de urna descoberto via EA18 |

### Descoberta importante: local de votação não está nos oito EAs

EA12 e EA16 chegam a município, zona e seção, mas não fornecem o cadastro completo do local de votação/endereço/bairro necessário aos RF-015 e RF-016.

Para cobrir esse escopo, adicionar como fonte estática pré-eleição:

```text
Portal de Dados Abertos do TSE
→ Eleitorado - 2026
→ Eleitorado por local de votação - 2026
```

Essa base deverá ser importada antes da apuração e relacionada à estrutura eleitoral usada pelo projeto.

### Descoberta importante: EA18 não é o resultado da seção

O EA18 é um índice/metadado dos arquivos de urna recebidos. Ele não substitui o BU.

Portanto:

```text
EA16
  ↓ seção
EA18
  ↓ arquivo/hash
BU
  ↓
votos efetivos da seção
```

A funcionalidade de votação por seção deverá prever um parser/importador de BU ou outra representação oficial equivalente disponibilizada pelo TSE.

---

## 25.7. Critérios de aceite dos schemas

Para considerar a implementação do P7 concluída, o código deverá possuir:

1. modelo/schema para os oito EAs;
2. fixtures de JSON para cada EA;
3. testes de parsing válido;
4. testes de campos condicionais ausentes;
5. testes de valores desconhecidos adicionais sem quebra da ingestão;
6. normalização de UF, município, zona e seção;
7. separação entre valor formatado e valor numérico de percentuais;
8. teste de EA20 majoritário presidencial;
9. teste de EA20 de Senador (`0005`) com `carg.nv = 2`;
10. teste de ranking parcial do Senado com dois candidatos `IN_SENATE_RANGE`;
11. teste de EA10 de Senador com dois eleitos por UF e `vs[]` para suplentes;
12. teste de que `cand.pvapn` do Senado é tratado como percentual sobre `vvc`, sem rotulagem incorreta como `% dos votos válidos`;
13. teste que garanta que comparecimento (`e.c`) não seja inferido a partir de `v.tv` no Senado;
14. teste de EA20 proporcional com partido isolado;
15. teste de EA20 proporcional com federação;
16. teste de EA20 em abrangência UF;
17. teste de EA20 em abrangência município;
18. teste de EA20 em abrangência zona;
19. teste de EA16 com seção principal/agregada;
20. teste de EA18 antes e depois da totalização;
21. teste que garanta que cadeiras são lidas de `agr.vag`, nunca de `par.vag`;
22. teste de configuração que rejeite mistura acidental de `f=s` com dados oficiais `f=o`.

As fixtures do frontend, em `web/tests/fixtures/tse/`, deverão cobrir payloads simulados do ambiente 2026 para cada EA utilizado pelo projeto: EA10, EA11, EA12, EA14, EA15, EA16, EA18 e EA20. Cada fixture deve registrar URL de origem, data/hora de geração, eleição/pleito, abrangência e `f=s`. A fixture deve representar um payload efetivamente obtido do CDN simulado; exemplos sintéticos derivados do schema devem ser identificados como sintéticos e não contam como validação de payload real do simulado.

EA10 e EA18 podem depender de condições de geração/abrangência. Registrar ausência ou indisponibilidade do arquivo e não fabricar uma fixture simulada que aparente ter vindo do TSE. Nesses casos, cobrir o parser com fixture sintética explicitamente rotulada, manter a validação contra payload simulado como pendente e seguir a regra de disponibilidade descrita na documentação oficial.

A validação contra um payload real/simulado do ambiente 2026 passa a ser critério de aceite da implementação, não uma decisão de produto pendente.


# 27. Modelo de Dados Inicial

As entidades abaixo representam o **modelo lógico de domínio** em memória no frontend. Não implicam tabelas, persistência no navegador ou contratos de leitura publicados pelo projeto.

Entidades sugeridas:

```text
election
office

party
federation
candidate

state
municipality
electoral_region
electoral_region_municipality

polling_place
section

current_result
candidate_result
party_result
candidate_companion

majoritarian_result
majoritarian_candidate_sample

seat_result
seat_candidate

session_result_sample
session_seat_sample
session_seat_event
session_senate_range_event
```

---

# 28. Agregações

No ciclo de polling, calcular em memória as agregações necessárias à tela ativa, como:

```text
party_summary_brazil
party_summary_state
party_summary_region
party_summary_municipality

candidate_summary_brazil
candidate_summary_state
candidate_summary_region
candidate_summary_municipality

senate_summary_state
senate_summary_region
senate_summary_municipality
senate_summary_zone

seat_summary_federal
seat_summary_state
```

---

# 29. Contratos internos do frontend

O cliente do navegador consome diretamente os JSONs dos EA na CDN do TSE, valida esses payloads e os converte para modelos internos TypeScript. Não há contratos JSON eleitorais publicados pelo projeto.

Os tipos internos do frontend deverão obedecer aos seguintes princípios:

- não expor campos abreviados do TSE diretamente;
- utilizar nomes estáveis e legíveis;
- preservar origem `simulated`/`official`, timestamps do TSE e hora de recebimento;
- não vazar nomes abreviados dos EA para componentes React;
- carregar somente os arquivos necessários ao escopo atualmente consultado;
- manter os modelos versionados por teste/contrato dentro do frontend.

---

# 30. Prioridades

## P0 — Obrigatório para a primeira versão

- leitura direta dos arquivos oficiais da CDN pelo navegador;
- apuração presidencial;
- apuração do Senado por UF/DF;
- indicação dos dois candidatos na faixa das vagas do Senado durante a parcial;
- confirmação final de Senadores eleitos e respectivos suplentes;
- votação do Missão;
- Brasil → UF → município;
- atualização automática;
- cadeiras federais;
- cadeiras estaduais;
- cadeiras por partido/federação;
- candidatos na faixa de vagas;
- evolução/eventos observados na sessão atual;
- indicadores de atualização/proveniência.

## P1 — Alta prioridade

- mapa nacional;
- mapa do Paraná;
- regionalização analítica do Paraná;
- mapa regional interativo;
- Paraná → região → município;
- gráficos de histórico limitados à sessão atual;
- capilaridade;
- explorador eleitoral.

## P2 — Evolução

- local de votação;
- bairro do local;
- seção;
- análises territoriais avançadas;
- comparações entre eleições;
- exportação;
- compartilhamento de visualizações;
- análises pós-eleição.

---

# 31. Critérios de Sucesso do MVP

O MVP será considerado funcional se permitir:

1. acompanhar a apuração presidencial;
2. selecionar uma UF/DF e acompanhar a apuração do Senado;
3. identificar os dois candidatos que ocupam a faixa das vagas do Senado durante a parcial, sem tratá-los como oficialmente eleitos;
4. confirmar, após a totalização final, os Senadores oficialmente eleitos e seus suplentes;
5. acompanhar a votação do Missão;
6. consultar resultados por UF e município;
7. visualizar quantas cadeiras cada partido/federação possui na parcial das eleições proporcionais;
8. visualizar especificamente as cadeiras proporcionais do Missão;
9. identificar candidatos que ocupam essas vagas proporcionais na parcial;
10. acompanhar Câmara Federal e Assembleias;
11. registrar mudanças de cadeiras proporcionais e mudanças na faixa do Senado ao longo da apuração;
12. receber atualizações sem refresh manual;
13. identificar claramente a fonte e o horário dos dados.

---

# 32. Decisões Técnicas

## 32.1. Decisões fechadas

1. **Macrorregiões do Paraná:** 8 macrorregiões definidas no escopo.
2. **Município → macrorregião:** utilizar a classificação do documento fornecido e convertê-la para estrutura versionada.
3. **Formato geográfico:** GeoJSON.
4. **Biblioteca de mapas:** MapLibre GL JS.
5. **Distribuição:** publicar somente o frontend estático e assets próprios em S3 + CloudFront, se AWS for mantida. O navegador busca resultados diretamente na CDN do TSE.
6. **Polling TSE:** consulta do navegador a cada 5 segundos enquanto a aplicação estiver aberta durante a apuração; demanda limitada aos dados do escopo ativo.
7. **Fontes TSE:** EA10, EA11, EA12, EA14, EA15, EA16, EA18 e EA20.
8. **Persistência:** não manter banco de dados nem persistência eleitoral no servidor ou navegador.
9. **Histórico:** amostras e eventos de evolução existem apenas em memória durante a sessão atual; reload/fechamento os descarta.
10. **P7 — Contratos dos schemas TSE 2026:** validado documentalmente campo a campo para EA10, EA11, EA12, EA14, EA15, EA16, EA18 e EA20; validação contra payload real/simulado passa a ser critério de aceite da implementação.
11. **P8 — Faixa de vagas:** usar `agr.vag` como quantidade de cadeiras e `cand.seq` como ordenação canônica dos candidatos elegíveis dentro da agregação; federação é tratada como uma única agremiação.
12. **P9 — Senado:** tratar Senador (`0005`) como disputa majoritária por UF; usar `carg.nv` para o número de vagas, `cand.seq` para a faixa parcial derivada e `cand.e/cand.st` + EA10 para a condição oficial final.

## 32.2. Decisões fechadas após validação do P8

### P8 — Regra da faixa de vagas em cargos proporcionais

O P8 está considerado fechado para implementação.

A quantidade de vagas que uma federação ou partido isolado está levando durante a parcial será obtida exclusivamente do campo:

```text
carg[].agr[].vag
```

O TSE define esse campo como a quantidade de vagas da agregação na totalização corrente. Durante a parcial, o valor pode aumentar ou diminuir a cada nova totalização.

#### Regra para identificar os candidatos na faixa

Para cada `agr` de cargo proporcional:

```text
seat_count = agr.vag
```

O sistema deverá:

1. reunir todos os candidatos de todos os `par[]` pertencentes à mesma `agr`;
2. considerar somente candidatos com destinação de voto compatível com candidatura válida para ocupação da vaga;
3. excluir candidatos cujo `dvt` esteja como `Anulado` ou `Anulado sub judice`;
4. utilizar `cand.seq` como ordenação canônica fornecida pelo TSE;
5. ordenar `seq` em ordem ascendente;
6. selecionar os primeiros `seat_count` candidatos;
7. classificá-los internamente como `IN_SEAT_RANGE`;
8. classificar os demais candidatos válidos como `OUTSIDE_SEAT_RANGE`;
9. comparar o conjunto atual com o resultado anterior em memória para produzir eventos da sessão.

Pseudo-regra:

```python
candidates = flatten(agr.par[*].cand)

eligible = [
    candidate
    for candidate in candidates
    if candidate.dvt == "Válido"
]

ordered = sorted(
    eligible,
    key=lambda candidate: candidate.seq
)

inside = ordered[:agr.vag]
outside = ordered[agr.vag:]
```

> A implementação deve preferir `seq` à ordenação manual apenas por votos. O campo representa a ordem do candidato na eleição e absorve os critérios oficiais de classificação/desempate. `vap` permanece disponível para exibição.

#### Federações

Quando:

```text
agr.tp = "f"
```

a faixa deverá ser calculada sobre **todos os candidatos da federação**, independentemente de qual partido membro (`par`) lançou cada candidato.

Exemplo:

```text
agr
└── Federação X
    ├── vag = 3
    ├── Partido A
    │   ├── candidato A1
    │   └── candidato A2
    └── Partido B
        ├── candidato B1
        └── candidato B2
```

Não calcular:

```text
vagas do Partido A
+
vagas do Partido B
```

Calcular:

```text
todos os candidatos da agr
        ↓
ordem seq
        ↓
primeiros agr.vag
```

A federação deve ser tratada como uma única agremiação para obtenção de cadeiras.

#### Partido isolado

Quando:

```text
agr.tp = "i"
```

o mesmo algoritmo será aplicado, porém a agregação possuirá um único partido relevante.

#### Campo `e`

O campo:

```text
cand.e
```

não deverá ser utilizado para determinar a faixa de vagas durante a parcial.

Ele será utilizado para a condição oficial de eleito/segundo turno quando o TSE atribuir essa condição.

Portanto:

```text
cand.e = n
```

não significa necessariamente que o candidato esteja fora da faixa durante uma apuração parcial.

#### Campo `st`

O campo:

```text
cand.st
```

é situação final de totalização e não será utilizado como fonte da faixa parcial.

Quando houver totalização final, poderá assumir valores como:

```text
Eleito
Eleito por QP
Eleito por média
Não eleito
Suplente
2º turno
```

Após a totalização final, o status oficial deverá prevalecer sobre a classificação derivada da parcial.

#### Estados internos

A aplicação utilizará pelo menos:

```text
IN_SEAT_RANGE
OUTSIDE_SEAT_RANGE
OFFICIALLY_ELECTED
OFFICIAL_ALTERNATE
OFFICIALLY_NOT_ELECTED
```

Durante a parcial:

```text
agr.vag + cand.seq
        ↓
IN_SEAT_RANGE / OUTSIDE_SEAT_RANGE
```

Após totalização final:

```text
cand.e + cand.st
        ↓
status oficial
```

#### Eventos

Para cada ciclo novo recebido em memória:

```text
previous_inside = {A, B, C}
current_inside  = {A, B, D}
```

Gerar:

```text
D → entrou na faixa
C → saiu da faixa
```

Se `agr.vag` mudar:

```text
2 → 3
```

gerar evento da agregação:

```text
ganhou 1 cadeira na parcial
```

e evento do candidato que entrou na faixa.

Para redução:

```text
3 → 2
```

gerar:

```text
perdeu 1 cadeira na parcial
```

e evento do candidato que saiu.

#### Consistência obrigatória

A cada processamento proporcional validar:

```text
len(IN_SEAT_RANGE) <= agr.vag
```

Quando houver candidatos válidos suficientes:

```text
len(IN_SEAT_RANGE) == agr.vag
```

Caso `agr.vag > quantidade de candidatos elegíveis`, registrar alerta de integridade e não inventar ocupantes.

#### Testes obrigatórios do P8

Criar fixtures/testes para:

1. partido isolado com `vag = 0`;
2. partido isolado ganhando cadeira;
3. partido isolado perdendo cadeira;
4. federação com candidatos de dois ou mais partidos;
5. candidato anulável/anulado fora da faixa;
6. empate de votos em que `seq` define a ordenação;
7. mudança de ordenação sem mudança de `agr.vag`;
8. entrada e saída simultânea da faixa;
9. totalização final substituindo status parcial;
10. inconsistência `agr.vag > candidatos elegíveis`.

### Fundamentação técnica do P8

A decisão se baseia em três pontos:

1. o EA20 2026 define `agr.vag` como o número de vagas da agregação e `cand.seq` como o sequencial da ordem do candidato na eleição;
2. a documentação técnica anterior do próprio modelo de Divulgação do TSE explicita que, durante parciais proporcionais, conhecida a quantidade `vag`, os candidatos que naquele momento estão levando as vagas são os `n` candidatos mais bem classificados daquela agregação, e informa que `seq` pode ser utilizado para ordenar candidatos;
3. federações atuam como uma única agremiação nas eleições, inclusive para contagem de votos e obtenção de cadeiras.

A implementação deverá ainda ser testada contra payload do ambiente oficial/simulado 2026 como validação operacional, mas isso não é mais uma decisão de produto em aberto.



## 32.3. Regra fechada do Senado — P9

### Abrangência

O cargo Senador (`0005`) é majoritário de abrangência UF.

Não haverá consolidação nacional tratada como uma única eleição. Qualquer indicador nacional de Senadores por partido será uma **agregação analítica própria da aplicação** a partir dos resultados das 27 UFs/DF.

### Quantidade de vagas

A aplicação deverá ler:

```text
carg.nv
```

Para a eleição ordinária de 2026, o valor esperado é 2 por UF/DF.

### Faixa parcial

Durante a parcial, a aplicação deverá:

```text
1. selecionar candidatos com destinação válida;
2. ordenar pela ordem oficial `cand.seq`;
3. selecionar os primeiros `carg.nv`;
4. marcar como IN_SENATE_RANGE;
5. marcar os demais como OUTSIDE_SENATE_RANGE.
```

Essa classificação é derivada pela aplicação e serve apenas para a experiência em tempo real.

### Resultado oficial

Na totalização final, prevalecem:

```text
cand.e
cand.st
```

O EA10 do cargo `0005` será utilizado como confirmação complementar dos eleitos por UF.

### Suplentes

Os suplentes serão lidos de:

```text
cand.vs[]
```

com tipos:

```text
s1
s2
```

### Percentuais

O percentual oficial `cand.pvapn` não deve ser rotulado automaticamente como `% de votos válidos`, pois a documentação do EA20 o define em relação a `vvc`.

### Comparecimento

O comparecimento deverá ser lido de `e.c`. Como há duas escolhas para Senador em 2026, não calcular comparecimento a partir de `v.tv`.

---

# 33. Escopo Inicial de Entrega

A primeira entrega deve privilegiar estabilidade durante a apuração e evolução incremental do código.

Ordem recomendada:

```text
1. Estrutura do repositório + AGENTS.md
2. Frontend estático + App Shell + Light/Dark
3. Contratos JSON mockados
4. Tela Visão Geral
5. Tela Presidente + Outros expandível
6. Tela Senado
7. Tela Cadeiras
8. Tela Missão
9. Mapas + MapLibre + GeoJSON
10. Regionalização do Paraná + drill-down
11. Cliente direto da CDN TSE + EA11 bootstrap + schemas/adapters TypeScript
12. Polling compartilhado, CORS, cache/revalidação e estados de erro/stale
13. Regras de cadeiras/Senado e histórico efêmero em memória
14. Hospedagem estática do frontend e assets
15. Smoke test do domínio de produção contra a CDN oficial
16. Testes integrados com fixtures reais/simuladas 2026
```

A regionalização do Paraná deve ser preparada antecipadamente, pois a geometria é estática e pode ser gerada antes da eleição.

Durante a apuração, o sistema deverá apenas associar os resultados municipais às regiões e recalcular os agregados.

---


# 34. Alinhamento com o Figma

O escopo funcional deve permanecer sincronizado com o arquivo de protótipo:

```text
Apuração Eleições 2026 — Interface & Prototype
```

Arquivo atual:

```text
https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV
```

Telas principais atualmente representadas no Figma:

```text
01 — Visão Geral
02 — Presidente
03 — Cadeiras
04 — Missão Paraná
05 — Região Noroeste
06 — Senado
```

O fluxo de protótipo contém os mesmos destinos e inclui navegação para a tela de Senado.

## 34.1. Regras da tela Senado no Figma

A tela `06 — Senado` deverá permanecer alinhada às seguintes regras funcionais:

- seleção obrigatória de UF/DF para a disputa;
- destaque de `carg.nv` vagas — 2 em 2026;
- linha de corte visual entre o último candidato na faixa e o primeiro fora da faixa;
- uso de `na faixa` durante a parcial;
- nunca apresentar `eleito` apenas por posição parcial;
- mostrar `% da votação` quando o valor vier diretamente de `cand.pvapn`;
- não rotular `cand.pvapn` como `% votos válidos`;
- mapa territorial restrito à UF selecionada;
- permitir drill-down UF → município → zona e, futuramente, seção;
- exibir estado `PARCIAL` enquanto não houver totalização final;
- após a totalização final, utilizar `cand.e/cand.st` como status oficial;
- suportar visualização de 1º e 2º suplentes do candidato eleito.

## 34.2. Padrão visual e implementação

A interface deverá seguir o que foi definido no Figma:

- Auto Layout;
- padrões equivalentes aos componentes MUI;
- ícones Lucide quando apropriado;
- MapLibre GL JS para mapas;
- estados de loading, parcial, finalizado, erro, reconexão e dados atrasados;
- Smart Animate no protótipo como referência de transição, sem obrigatoriedade de reproduzir exatamente a animação na implementação caso haja restrição técnica.

### Temas Light e Dark

A aplicação deverá possuir tema claro e tema escuro.

Regras mínimas:

- disponibilizar um switch de tema nas telas principais;
- o switch deverá alternar entre Light e Dark sem alterar a rota ou o contexto funcional atual;
- a troca de tema deverá preservar filtros, seleção territorial, candidato selecionado e demais estados relevantes da página;
- na tela de Presidente, se `Outros` estiver expandido, a troca de tema deverá manter o estado expandido; se estiver recolhido, deverá permanecer recolhido;
- a navegação entre as telas deverá preservar o tema ativo;
- o dark mode deverá utilizar a versão negativa da logo da Missão;
- o light mode deverá utilizar a versão positiva da logo;
- cores de superfícies, textos, bordas, seleção, hover e mapas deverão utilizar os respectivos tokens de cada tema, mantendo o amarelo da marca como cor de destaque;
- estados semânticos de sucesso, alerta e erro deverão continuar distinguíveis e acessíveis nos dois temas.

O protótipo Figma contém fluxos paralelos Light e Dark conectados pelo switch e deverá ser utilizado como referência funcional para essa persistência de contexto.

## 34.3. Identidade visual dos candidatos

Nas listas e rankings em que candidatos são apresentados individualmente, a interface deverá exibir **foto + nome** como identidade primária do candidato quando a foto oficial estiver disponível.

Aplicações mínimas no MVP:

- resultado presidencial na Visão Geral;
- ranking da tela Presidente;
- candidatos exibidos ao expandir `Outros`;
- ranking da tela Senado;
- listas de candidatos que ocupam ou disputam a faixa de vagas proporcionais quando essa informação for apresentada individualmente.

A imagem deverá utilizar fonte oficial do TSE associada ao candidato. Na ausência da imagem, utilizar placeholder neutro e manter nome, votos, percentual e demais informações normalmente disponíveis.

## 34.4. Comportamentos obrigatórios do protótipo animado

O protótipo navegável deverá representar, no mínimo, os seguintes comportamentos funcionais:

1. **Expansão de `Outros` na Presidência**
   - clicar em `Outros` abre o estado expandido;
   - o estado expandido lista todos os demais candidatos individualmente com foto, nome e percentual;
   - clicar novamente em `Outros`/ação equivalente recolhe a lista;
   - o comportamento existe em Light e Dark;
   - a transição utiliza Smart Animate como referência visual.

2. **Alternância de tema**
   - o switch alterna Light ↔ Dark;
   - a troca preserva a tela atual;
   - a troca preserva o estado expandido/recolhido de `Outros`;
   - a navegação posterior permanece no tema selecionado.

3. **Mapas interativos**
   - os polígonos representam áreas clicáveis;
   - o clique seleciona a geometria e leva o mapa ao estado focado daquela área;
   - o estado focado deve representar zoom/enquadramento da área, perda de ênfase das demais geometrias e atualização do contexto territorial;
   - quando houver próximo nível disponível, o clique poderá avançar no drill-down;
   - o breadcrumb/ação de retorno deverá permitir voltar ao nível anterior;
   - a interação deve respeitar a paleta Light ou Dark ativa.

As interações do protótipo representam comportamento funcional esperado. A implementação poderá utilizar transições diferentes do Smart Animate desde que preserve os mesmos estados, ações e consequências funcionais.

---

# 35. Fora do Escopo Inicial

Não faz parte do MVP inicial:

- previsão de resultado;
- projeção de cadeiras baseada em modelos estatísticos;
- inferência de residência do eleitor;
- inferência de intenção de voto;
- dados individualizados de eleitores;
- cadastro manual de resultados;
- substituição dos dados oficiais do TSE por fontes não oficiais.

O sistema é uma plataforma de visualização e análise de resultados oficiais, não um sistema de previsão eleitoral.

---

# 36. Desenvolvimento Assistido por IA — Codex

O projeto será desenvolvido com apoio de agentes de IA, principalmente Codex. Para evitar divergências entre requisito, design e implementação, o agente deverá trabalhar com fontes de verdade explícitas e executar tarefas de forma incremental.

## 36.1. Fontes de verdade e precedência

O agente deverá utilizar simultaneamente as seguintes fontes:

1. **Este documento (`docs/product/apuracao-2026.md`)** — regras funcionais, domínio eleitoral, arquitetura e critérios de aceite.
2. **Figma (`Apuração Eleições 2026 — Interface & Prototype`)** — aparência, hierarquia visual, espaçamento, temas, componentes, estados e interações do protótipo.
3. **Documentação oficial do TSE** — semântica dos contratos eleitorais EA10/EA11/EA12/EA14/EA15/EA16/EA18/EA20 e demais dados oficiais.
4. **Código e testes do repositório** — implementação corrente, desde que não contradiga uma decisão mais recente registrada neste documento.

Arquivo Figma de referência:

```text
https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV
```

Em caso de conflito:

- regra eleitoral/dado: prevalece a documentação oficial do TSE;
- regra funcional: prevalece este documento;
- aparência/interação: prevalece o Figma;
- se duas fontes oficiais do projeto entrarem em conflito e a precedência acima não resolver, o agente deverá **interromper a implementação daquela decisão e registrar a divergência**, em vez de inventar uma solução silenciosamente.

## 36.2. Acesso obrigatório ao Figma

Quando a tarefa envolver interface, comportamento visual ou interação, o Codex deverá acessar o arquivo por **Figma MCP** antes de implementar.

O agente não deverá reproduzir a interface apenas a partir de screenshots se o MCP estiver disponível. Deverá inspecionar os frames, componentes, variáveis, Auto Layout e protótipo navegável correspondentes à tarefa.

Antes de modificar uma tela, o agente deverá verificar pelo menos:

- frame Light;
- frame Dark correspondente;
- Foundations/tokens relevantes;
- estado(s) alternativo(s) da tela;
- interações do protótipo;
- componentes reutilizáveis já existentes.

Comportamentos que obrigatoriamente deverão ser verificados no protótipo:

- switch Light ↔ Dark;
- persistência de contexto ao trocar tema;
- expansão/recolhimento de `Outros` na Presidência;
- foto + nome dos candidatos;
- navegação lateral;
- clique em polígonos e foco territorial;
- drill-down Paraná → macrorregião → município;
- estados parcial/final/loading/erro quando representados.

## 36.3. Arquivo `AGENTS.md`

O repositório deverá possuir um `AGENTS.md` na raiz com instruções permanentes para o agente. O conteúdo mínimo deverá orientar o Codex a:

- ler este requisito antes de alterações relevantes;
- utilizar Figma MCP para tarefas de UI;
- não inventar campos ou semântica do TSE;
- manter parcial diferente de resultado final;
- preservar o frontend estático e o consumo direto da CDN do TSE; não adicionar API ou persistência de resultados;
- executar lint, typecheck e testes antes de concluir tarefas;
- manter mudanças pequenas, revisáveis e coerentes com o escopo solicitado.

Exemplo de diretriz central para o `AGENTS.md`:

```md
## Fontes de verdade

1. docs/product/apuracao-2026.md — domínio e requisitos
2. Figma MCP — design e interação
3. Documentação oficial do TSE — contratos de dados

Para tarefas de UI, consulte o Figma antes de codar.
Para tarefas de integração eleitoral, nunca suponha a semântica de um campo do TSE.
```

## 36.4. Estratégia de execução das tarefas

O Codex não deverá tentar implementar o produto inteiro em uma única tarefa.

Cada tarefa deverá possuir escopo pequeno e verificável, preferencialmente uma destas categorias:

```text
Foundation / tema
App Shell / navegação
Tela individual
Componente reutilizável
Interação específica
Mapa / nível territorial
Contrato JSON
Parser TSE
Adapter de domínio
Regra eleitoral
Worker / publicação
Infra / deploy
Testes
```

Fluxo obrigatório de uma tarefa relevante:

```text
1. Ler o requisito relacionado
2. Inspecionar o Figma quando aplicável
3. Inspecionar o código existente
4. Identificar dependências e riscos
5. Propor/registrar um plano curto
6. Escrever e executar testes primeiro, confirmando falha pelo comportamento ausente (RED)
7. Implementar apenas o escopo solicitado até os testes passarem (GREEN), refatorar e rodar validações novamente (REFACTOR)
8. Comparar comportamento/visual com a fonte de verdade
9. Corrigir divergências encontradas
10. Resumir o que mudou e o que permanece pendente
```

## 36.5. Desenvolvimento do frontend com IA

A implementação visual deverá ser feita gradualmente. Ordem recomendada:

```text
Foundation/tokens
  ↓
App Shell
  ↓
Sidebar + navegação
  ↓
Light/Dark
  ↓
Visão Geral
  ↓
Presidente
  ↓
Senado
  ↓
Cadeiras
  ↓
Missão
  ↓
Mapas/drill-down
```

Para cada tela, o agente deverá:

- consultar o frame correspondente no Figma;
- utilizar componentes/tokens existentes antes de criar novos;
- implementar Light e Dark no mesmo ciclo de trabalho;
- implementar os estados funcionais da tela, não apenas o estado estático;
- validar responsividade;
- validar acessibilidade básica e navegação por teclado onde aplicável;
- evitar valores visuais arbitrários quando o valor puder ser obtido do Figma.

## 36.6. Dados mockados, simulados e oficiais

O desenvolvimento da interface deverá começar com fixtures/mocks compatíveis com os contratos internos da aplicação.

Mocks deverão ser explicitamente separados de dados oficiais.

Estrutura sugerida:

```text
web/src/mocks/
web/tests/fixtures/tse/
```

Regras:

- nenhum mock poderá ser confundido com dado oficial;
- o frontend deverá consumir os mesmos modelos TypeScript tanto para mocks quanto para dados adaptados diretamente do TSE;
- fixtures TSE deverão indicar se representam `f=s` ou `f=o`;
- valores de exemplo do Figma não deverão ser tratados como resultados eleitorais reais.

## 36.7. Regras para consumo direto do TSE

Ao trabalhar nos parsers/adapters, o agente deverá:

- consultar as referências oficiais já listadas neste documento;
- implementar schemas e adapters TypeScript por EA;
- aceitar campos condicionais conforme a especificação e ignorar campos adicionais desconhecidos sem quebrar;
- não inferir significado a partir do nome abreviado de um campo;
- adicionar fixture e teste para cada comportamento relevante;
- manter fixture simulada (`f=s`) por EA utilizado, conforme 25.7; payload sintético deve estar identificado;
- buscar diretamente a CDN no cliente de dados do navegador e validar CORS no localhost e no domínio de produção;
- consultar somente recursos necessários ao contexto ativo, a cada 5 segundos, com revalidação de cache HTTP;
- manter origem e estado eleitoral apenas em memória; não gravar dados eleitorais em banco, API, storage do navegador ou serviço de arquivos;
- impedir que campos brutos do TSE vazem diretamente para os componentes React.

Qualquer descoberta que altere uma decisão funcional deverá primeiro ser registrada neste documento ou em decisão técnica versionada.

### 36.7.1. Uso do simulado e troca para o ambiente oficial

Até a divulgação oficial, usar payloads EA simulados (`f=s`) para desenvolver e validar parsers, regras de domínio e interfaces. Cobrir EA10, EA11, EA12, EA14, EA15, EA16, EA18 e EA20, respeitando a disponibilidade condicional de cada arquivo. Os dados simulados devem aparecer claramente identificados e nunca como apuração corrente.

A partir das 17h de 04/10/2026 (horário de Brasília), configurar o cliente do navegador para o ambiente oficial (`f=o`), usando códigos e rotas descobertos pela configuração EA11 oficial. Não reutilizar identificadores ou URLs do simulado. Validar CORS e os arquivos essenciais via GET no domínio de produção antes da operação. Os schemas/adapters TypeScript serão comuns quando os formatos forem compatíveis.

Validar `f` e a configuração esperada antes de aceitar cada arquivo. Rejeitar mistura de ambientes e não fazer fallback automático. Se payload oficial revelar diferença de schema ou semântica, registrar e criar teste de regressão antes de mudar parser ou regra.

## 36.8. Modelos internos do frontend

Os modelos normalizados TypeScript formam a fronteira entre os adapters TSE e os componentes React. Os resultados continuam somente no CDN do TSE e na memória volátil da sessão.

Cada adapter deverá possuir schema/type, fixture identificada, testes de parsing válido/condicional/desconhecido e teste de conversão para o modelo interno. O tipo interno deve preservar proveniência, timestamp de geração TSE e horário de recebimento. Mudanças incompatíveis precisam de atualização explícita dos consumidores e testes.

## 36.9. Critério de pronto para tarefas do Codex

Uma tarefa só poderá ser considerada concluída quando, conforme aplicável:

- requisito funcional atendido;
- ciclo TDD comprovado: teste escrito antes, falha pertinente observada, implementação e testes verdes;
- paridade com o Figma verificada;
- Light e Dark verificados;
- lint aprovado;
- typecheck aprovado;
- testes aprovados;
- nenhum erro relevante no console;
- estados loading/erro/vazio considerados;
- comportamento mobile considerado;
- dados simulados claramente identificados;
- alteração documentada quando introduzir nova decisão técnica.

Para tarefas de interface, a validação visual deverá incluir comparação da aplicação executando localmente com o frame correspondente no Figma.

## 36.10. Git e revisabilidade

O desenvolvimento assistido por IA deverá favorecer mudanças pequenas e fáceis de revisar.

Regras recomendadas:

- uma tarefa funcional por branch/PR quando possível;
- commits descritivos;
- não misturar refatorações grandes com feature nova sem necessidade;
- não alterar arquivos fora do escopo apenas por preferência estética do agente;
- preservar decisões existentes quando não fazem parte da tarefa;
- incluir no PR uma descrição do requisito atendido, testes executados e referências ao Figma quando aplicável.

## 36.11. Prompt-base para início do desenvolvimento

Prompt recomendado para uma nova sessão do Codex:

```text
Leia integralmente:
- AGENTS.md
- docs/product/apuracao-2026.md

Use o Figma MCP para analisar:
https://www.figma.com/design/naHeWi7SEDeiQ0suLRaGoV

O Markdown define domínio, arquitetura e regras funcionais.
O Figma define aparência, estados e interações.
A documentação oficial do TSE define a semântica dos dados eleitorais.

Antes de escrever código:
1. identifique o requisito relacionado à tarefa;
2. inspecione os frames/estados relevantes no Figma;
3. inspecione o código atual;
4. informe um plano curto;
5. implemente somente o escopo solicitado.

Não invente campos ou regras do TSE.
Não implemente o produto inteiro de uma vez.
Preserve Light/Dark e os estados do protótipo.
Ao final rode lint, typecheck e testes e corrija divergências encontradas.
```

## 36.12. Primeira sequência recomendada para o Codex

A primeira execução assistida deverá ocorrer nesta ordem:

1. criar estrutura inicial do repositório;
2. criar `AGENTS.md`;
3. configurar Next.js + TypeScript + MUI + Lucide + MapLibre;
4. configurar `output: 'export'`;
5. criar tokens/tema Light/Dark a partir do Figma;
6. implementar App Shell e navegação;
7. criar contratos TypeScript e mocks;
8. implementar a Visão Geral;
9. implementar Presidente, incluindo `Outros`;
10. implementar Senado;
11. implementar Cadeiras;
12. implementar Missão e mapas;
13. desenvolver cliente de dados, parsers/adapters TypeScript e polling direto com fixtures simuladas por EA e TDD;
14. publicar somente o frontend estático e assets próprios;
15. validar CORS para o domínio final e testar o perfil oficial via navegador;
16. executar teste ponta a ponta com payloads 2026 reais/simulados.

Essa sequência valida design e adapters com dados simulados antes de trocar o cliente para o ambiente oficial. O uso de fixtures simuladas não autoriza apresentá-las como apuração corrente.

## 36.13. Desenvolvimento orientado a testes — obrigatório

Toda implementação deverá seguir TDD: RED → GREEN → REFACTOR. Para cada comportamento, escrever primeiro um teste verificável, executá-lo e observar a falha pelo comportamento ausente; implementar o mínimo necessário para passar; refatorar mantendo os testes verdes. Bugs exigem teste de regressão antes da correção.

Aplicar a estratégia em todas as camadas:

- frontend: testes de componentes/interações, cliente HTTP e polling com relógio/fetch controlados, e testes ponta a ponta no build estático;
- domínio eleitoral: fixtures e cenários de borda antes das regras;
- integração direta TSE: parsing, condicionais, normalização, CORS, HTTP, timeout, cache/revalidação e falhas com fixtures identificadas;
- cada parser de EA em TypeScript deve iniciar com testes sobre fixture simulada 2026 (`f=s`) obtida do CDN; se indisponível por condição documentada, usar fixture sintética identificada e manter a validação de payload simulado pendente;
- cada EA deve testar campos obrigatórios, condicionais ausentes, campos adicionais desconhecidos e proveniência. Testes de origem devem provar aceitação de `f=s` no perfil de desenvolvimento, aceitação de `f=o` no perfil oficial e rejeição cruzada entre perfis;
- validar adapters com o mesmo contrato de domínio para payload simulado e oficial. Diferenças entre payloads devem ter testes específicos sem enfraquecer casos simulados existentes;
- testar a troca de configuração do perfil simulado para oficial via EA11, rejeição de origem/código incompatível e ausência de fallback;
- testar polling de 5 segundos, uma requisição por recurso/contexto, cache revalidado, cancelamento de requisição obsoleta e pausa/backoff especificados;
- provar que resultados e histórico de sessão não são gravados em localStorage, sessionStorage, IndexedDB ou serviço remoto do projeto;
- modelos TypeScript: compatibilidade entre todos os adapters e consumidores da interface;
- infraestrutura: validar build/export e publicação estática; não criar worker, API de resultados ou banco de dados.

Configuração inicial, documentação e assets devem ter validações pertinentes, como build, lint, integridade dos arquivos e inspeção visual. Não criar testes artificiais apenas para reproduzir constantes da implementação. Erros de ambiente não substituem a evidência de falha comportamental.

Cada entrega deve registrar os testes executados, a evidência RED/GREEN e limitações restantes. Cobertura é um indicador auxiliar; não substitui cenários de aceite. Light/Dark, preservação de contexto, responsividade e acessibilidade fazem parte dos testes de UI.
