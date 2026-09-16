# Radar das Favelas

Consulta de endereço → é comunidade? qual? tá perto de uma área de risco mapeada? — pra motorista de app não se meter em furada no Rio de Janeiro.

Ver documento de arquitetura completo salvo no projeto "Radar das favelas" pro histórico de decisões e fases. Escopo: **sem** camada de ocorrência/tiroteio em tempo real. A UI não mostra qual facção/grupo tem presença em cada área (ver "Exibição simplificada" abaixo) — o dado continua existindo internamente, curado com fonte e data.

## Rodando local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre em `http://localhost:3000`.

## O que já está pronto

- Mapa (MapLibre GL) com camada de comunidades — **uma cor só (amarelo)**, sem indicar facção (ver "Exibição simplificada" abaixo).
- **Nome de cada comunidade escrito direto no mapa** (camada `comunidades-labels`, símbolo de texto, `minzoom: 13`) — importante em complexos como o do Alemão, que têm várias comunidades vizinhas com nomes diferentes (Nova Brasília, Morro do Alemão, Parque Alvorada, Morro do Adeus etc.), difíceis de distinguir só pelo contorno. Abaixo de zoom 13 os rótulos somem (evita poluir o mapa com ~1.026 nomes de uma vez na visão de cidade inteira); o MapLibre também esconde automaticamente rótulos que colidiriam entre si.
- **Busca de endereço** com sugestões ao digitar (debounce de 600ms, a partir de 5 caracteres) — não precisa clicar em "Buscar":
  - Aceita **CEP** (com ou sem hífen) — resolvido via ViaCEP (grátis, sem chave) pro endereço correspondente, depois geocodificado normalmente.
  - Endereço **com número** tenta busca estruturada primeiro (`street`/`city`/`state`), que casa número de rua melhor que busca livre, com fallback pra busca livre (incluindo uma variante com abreviação expandida — "Av."→"Avenida", "Jr"→"Junior" etc. — porque o Nominatim indexa nome de rua por extenso e uma busca abreviada exata pode não bater com nada mesmo a rua existindo) se não achar nada. Quando o número exato não é encontrado (comum em numeração informal de favela), a sugestão mostra um aviso "número aproximado" em vez de fingir precisão que não existe.
  - **Botão de localização atual** (ícone de pino ao lado da busca) — usa o GPS do navegador (pede permissão do próprio navegador) e reverse-geocodifica pra um endereço legível, útil quando o motorista já está no local.
- **Clicar em qualquer ponto do mapa** mostra a mesma informação que buscar aquele endereço (reverse-geocodifica o ponto e roda a mesma resolução de comunidade/proximidade) — não precisa passar pela busca pra explorar o mapa.
- Point-in-polygon no client (Turf.js) — resolve "esse endereço cai em qual comunidade" sem round-trip extra ao backend depois que o GeoJSON carrega.
- **Proximidade**: quando o endereço não cai dentro de nenhuma comunidade com limite oficial, o app checa se ele fica a até 400m de um ponto do mapa colaborativo (ver seção "Sobre os dados") e avisa que tá perto de uma área de risco mapeada — sem indicar qual grupo. Ver `data/pontos-comunitarios.geojson`, `/api/pontos-risco`, `RAIO_PROXIMIDADE_METROS` em `lib/geo.ts`.
- API routes `/api/comunidades`, `/api/pontos-risco` (servem os GeoJSON com cache) e `/api/geocode` (proxy de geocoding — ver "Geocoding: por que um proxy" abaixo).
- Legenda com uma entrada só ("Comunidade mapeada").
- **Rodapé "Desenvolvido por Diego"**, faixa inteira embaixo da tela (nome em destaque, cor âmbar da marca) linkando pro site pessoal dele (https://diegopb2.github.io/, abre em nova aba) — inspirado no rodapé do concorrente dadosderiscos.com.br que ele mandou de referência. A área do mapa (`flex-1`) ocupa o resto da tela acima do rodapé, sem sobrepor a atribuição do MapLibre.
- **Ícone da aba (favicon)** — `src/app/icon.svg`, convenção automática do Next.js App Router (não precisa registrar em `metadata`).
- **Responsivo pra celular/tablet** — testado em 375px (celular) e 768px (tablet): a busca reserva espaço do controle de zoom do mapa em telas estreitas (senão ficava coberta), e o botão "Buscar" quebra pra linha de baixo em vez de cortar se a tela for estreita demais pros três elementos numa linha só.

### Geocoding: por que um proxy (`/api/geocode`, `lib/geocodeServer.ts`)

A busca de endereço/CEP/reverse geocoding **não chama mais o Nominatim direto do navegador** — todo esse trabalho agora roda no servidor, atrás de `/api/geocode`, implementado em `lib/geocodeServer.ts`. Motivo real, não teórico: testando o app ao vivo (a busca "ao vivo" digitando dispara uma chamada por pausa de digitação, mais os testes manuais), o IP residencial do Diego levou um **bloqueio temporário do Nominatim** — `/status` respondia normal, mas `/search` dava erro de rede, e o mesmo request de outro IP funcionava sem problema. É a política de uso do Nominatim público fazendo o que promete ("no heavy uses", 1 req/s) — não um bug do app, mas algo que qualquer uso real ia eventualmente esbarrar.

O proxy resolve isso em duas frentes:
1. **Fila com 1.1s de intervalo mínimo** entre chamadas reais ao Nominatim (`aguardarVez()`) — reforça o limite de verdade mesmo com várias buscas disparando quase juntas, coisa que o client sozinho não consegue garantir.
2. **Cache em memória de 5 minutos** por consulta — evita repetir a mesma chamada externa quando o usuário pausa de digitar, edita e volta, ou clica duas vezes perto do mesmo lugar no mapa.
3. **Fallback pro Photon** (`photon.komoot.io`, outro geocoder gratuito baseado em OSM, sem chave, host diferente): se o Nominatim falhar por erro de rede/HTTP (não só "0 resultado" — isso não conta como falha), a busca tenta o Photon automaticamente pra aquela consulta, sem cair fora do ar. Cada chamada nova tenta o Nominatim primeiro de novo — não fica "preso" no fallback depois que o Nominatim volta.

Isso reduz bastante o risco de tomar bloqueio de novo, mas não elimina: o proxy roda no mesmo processo Node do `next dev`, que sai pra internet pelo mesmo IP residencial de quem tá rodando — um proxy não muda o IP de saída. Pra produção de verdade, considere um provedor pago (Google Geocoding API, LocationIQ) ou self-host do Nominatim.

**Label do endereço usa zona da cidade, não a grande região do Brasil.** O `display_name` do Nominatim (e o campo `state` do Photon) concatenam toda a hierarquia administrativa do OSM — pro Brasil isso inclui a "grande região" (ex: "Região Sudeste"), que não ajuda ninguém dirigindo na cidade. Em vez de usar esse texto cru, `geocodeServer.ts` monta o label a partir de rua + bairro + **zona** (Zona Norte/Sul/Oeste/Centro), via a tabela `ZONA_POR_BAIRRO` em `lib/zonasRJ.ts` (139 bairros vindos da curadoria de comunidades, mais alguns bairros comuns sem comunidade mapeada — Leblon, Lagoa, Rocinha etc.). Bairro não reconhecido na tabela cai pro nome da cidade em vez de zona.

### Exibição simplificada (a pedido do Diego)

A UI não mostra mais **qual** facção/grupo tem presença numa área — nem no mapa (cor única, amarelo), nem no popup de clique, nem no card de resultado da busca, nem na legenda. Também não mostra mais o texto de "baixa confiança"/fonte por card, nem o disclaimer fixo no canto da tela. O motivo é evitar reforçar rótulo de facção-por-área na tela pro motorista, mantendo só a informação acionável: "é comunidade mapeada" e "tá perto de uma área de risco mapeada".

**O dado em si não mudou** — `grupo` (tipo/confiança/fonte/data) continua em cada feature do GeoJSON, só não é mais lido pela UI. Toda a lógica removida (cor por facção, popup com grupo, texto de confiança/fonte no card, disclaimer) ficou **comentada, não apagada**, em `MapView.tsx`, `ResultPanel.tsx`, `Legend.tsx`, `page.tsx` e `groupStyle.ts` (`COR_COMUNIDADE` é a cor única nova; `GRUPO_COR`/`GRUPO_LABEL`/`CONFIANCA_LABEL` continuam existindo só como referência) — fácil reverter se decidir voltar a mostrar facção na tela.

## Sobre os dados (`data/comunidades.sample.geojson`)

**Cobertura geográfica: completa.** Os limites de **todas as ~1.072 favelas/comunidades do Rio** vêm da camada oficial `SABREN/Limites_de_Favelas` (2022) do Data.Rio/Instituto Pereira Passos — dados abertos, `pgeo3.rio.rj.gov.br/arcgis/rest/services/SABREN/Limites_de_Favelas`. Mesma área/contagem (1.072) que a camada `Habitacao/Favelas_Urbanizacao` do Data.Rio (a que o Diego apontou como referência confiável) — são a mesma base de limites oficiais, essa segunda só adiciona campos de programa de urbanização que não usamos aqui. O mapa já mostra a área real de qualquer favela do município, não só um punhado de exemplos.

**Atribuição de grupo/facção: curada pra 14 comunidades conhecidas** (Rocinha, Vidigal, Cidade de Deus, Complexo do Alemão, Maré — dividida em 2 polígonos —, Rio das Pedras, Muzema, Tijuquinha, Jacarezinho, Manguinhos, Complexo da Penha, Batam, Chapadão). Cada uma tem `grupo` preenchido a partir de fonte pública verificável, citada no próprio campo `fonte` do GeoJSON (pesquisa territorial da Redes da Maré, decisão judicial da Operação Contenção/CNN Brasil, Tribuna do Sertão, Meia Hora, Wikipédia, Revista Oeste, wikifavelas.com.br/Dicionário de Favelas Marielle Franco), com `confianca` honesta — nem toda entrada é `alta` por padrão — e `dataAtualizacao` real. Rocinha ficou com `grupo.tipo: "SemInformacao"` de propósito: as fontes encontradas não convergem num único grupo em controle atual (histórico de disputa interna na ADA em 2017 + reportagem de 2025 sobre entrada do PCC), então a informação honesta é "sem confirmação", não um chute nem uma categoria especial de "disputa" (essa categoria foi removida da legenda). **Essa curadoria não muda com a exibição simplificada** — o dado continua existindo, só não aparece mais na tela (ver "Exibição simplificada" acima).

**Complexos = várias comunidades com nome próprio, não um polígono só.** Os 11 complexos/áreas com múltiplas comunidades reconhecíveis (Alemão, Maré, Penha, Jacarezinho, Manguinhos, Rio das Pedras, Muzema, Tijuquinha, Batam, Cidade de Deus, Rocinha) foram **divididos** nas comunidades individuais oficiais do SABREN (cada uma com seu próprio `nome` real — ex: Alemão virou 15 features: Nova Brasília, Morro do Alemão, Parque Alvorada, Morro do Adeus, Fazendinha etc.), todas compartilhando o mesmo `grupo` curado do complexo original. Antes, cada complexo era um único polígono multi-parte com um nome genérico — o que fazia o rótulo no mapa (`comunidades-labels`, ver acima) mostrar só um nome pro complexo inteiro, escondendo os nomes reais que ajudam a identificar cada área. Vidigal ficou de fora da divisão (já é um polígono único no SABREN).

**As outras ~1.012 áreas aparecem no mapa com limite real** (não estão escondidas nem omitidas — pra dar a mesma sensação de "mapa cheio" que o concorrente tem) **mas com `grupo.tipo: "SemInformacao"`**, porque atribuir facção sem fonte checada por área é exatamente o tipo de chute que o Radar das Favelas se propõe a não fazer (ver seção 2 do documento de arquitetura). Preencher essas com responsabilidade é trabalho contínuo de curadoria — ver "Próximos passos" — não um preenchimento automático que eu faria aqui sem conseguir verificar cada uma.

### Cobertura fora do município do Rio (`data/comunidades-niteroi.geojson`)

O SABREN só cobre o município do Rio — Niterói, São Gonçalo, a Baixada Fluminense e a Região dos Lagos não têm limite de favela nenhum no mapa antes desta seção. Pedido do Diego: expandir pra região metropolitana inteira. Situação real, região por região:

- **Niterói — coberto (145 comunidades).** Achei uma fonte oficial equivalente ao SABREN: a camada **"Zonas de Especial Interesse Social (Mapa 8)"** do Plano Diretor de Niterói 2019 (Lei nº 3385/2019), publicada em dados abertos pela prefeitura (SMU/SIGEO) via ArcGIS FeatureServer (`services8.arcgis.com/.../Grouplayer_SMU_PLANODIRETOR_AGOL/FeatureServer/430`). Cada feature já vem com nome da comunidade (`tx_comunidade`) e bairro (`tx_bairro`) — mesmo padrão do SABREN. Baixado, convertido pro schema do app e integrado como arquivo separado (`data/comunidades-niteroi.geojson`), somado ao GeoJSON do Rio na resposta de `/api/comunidades` (ver `route.ts`). Todas entram com `grupo.tipo: "SemInformacao"` — é limite oficial de ZEIS, não confirmação de presença de facção/milícia, mesma regra do resto do app. Na tela, a zona aparece como "Niterói" (`ZONA_LABEL` em `ResultPanel.tsx` traduz o valor interno `"Niteroi/SG"`).
- **São Gonçalo — ainda não coberto.** Não achei geoportal municipal com camada equivalente (ZEIS/AEIS) em dados abertos. O wikifavelas.com.br tem uma "Lista de Favelas de São Gonçalo" (nomes, sem geometria) que serve de checklist de prioridade, igual ao método já usado pra curar facção no Rio — mas sem polígono oficial não dá pra desenhar no mapa sem inventar limite, o que vai contra o princípio do projeto.
- **Baixada Fluminense — ainda não coberto.** Duque de Caxias tem um portal de dados abertos (`dadosabertos-geocaxias.hub.arcgis.com`) mas sem camada de favela/assentamento informal publicada nele até agora. Não achei portal equivalente pra Nova Iguaçu, Belford Roxo, São João de Meriti e os demais municípios da Baixada.
- **Região dos Lagos — nem é oficialmente Região Metropolitana.** Pela divisão político-administrativa atual (lei de dez/2018, 22 municípios), a Região Metropolitana do Rio é só núcleo (Rio) + Leste Metropolitano (Niterói, São Gonçalo, Itaboraí, Maricá, Tanguá) + Baixada Fluminense (13 municípios) + Magé/Guapimirim/Petrópolis/Rio Bonito/Cachoeiras de Macacu. Região dos Lagos (Cabo Frio, Búzios, Araruama etc.) é uma região geográfica separada do IBGE, não parte da RM oficial — prioridade mais baixa pra essa expansão.
- **Fonte candidata pra cobrir o resto de uma vez: IBGE Censo 2022 — "Favelas e Comunidades Urbanas".** É um levantamento nacional novo (12.348 favelas no Brasil), com geometria por comunidade individual, baixável pela Plataforma Geográfica Interativa do IBGE (`ibge.gov.br` → Geociências → Organização do território → Tipologias do território → Favelas e Comunidades Urbanas). Cobre qualquer município do Brasil, então resolveria São Gonçalo/Baixada de uma vez — mas o download é manual pela interface (não achei um endpoint direto tipo o ArcGIS de Niterói) e teria que ser avaliado se os nomes de comunidade batem em granularidade com o que já usamos. Fica como próximo passo mais promissor.

### Áreas do mapa colaborativo incorporadas à camada principal (`data/comunidades-colaborativo.geojson`)

Essa seção passou por três versões na mesma tarde — registro completo abaixo, porque cada uma corrigiu um erro real da anterior e vale entender o porquê.

**V1 — só pontos.** Diego insistiu várias vezes (ver histórico mais abaixo no doc de arquitetura) pra usar o Google MyMaps "Mapa Das Facções RJ" (mapeamento colaborativo, sem autor/instituição identificada publicamente) como fonte. Primeira extração do KML só pegou os placemarks `<Point>` (3.344 pontos) — usados só pra busca por proximidade (raio 400m), nunca desenhados no mapa.

**V2 — descobri que tinha polígono, mas tratei como camada separada de baixa confiança.** Diego mandou print do próprio Google MyMaps mostrando pastas como "ÁREAS DOMINADAS PELO COMANDO VERMELHO" com regiões sombreadas, questionando minha afirmação de que "esse mapa colaborativo só tem pontos" — ele tinha razão. Reabri o KML e achei **1.672 placemarks `<Polygon>` de verdade** (área desenhada), misturados nas mesmas pastas dos pontos — minha extração original só tinha pego os pontos. Corrigi criando uma camada própria (`poligonos-risco.geojson`, depois com cor exata por facção extraída do `<Style>` do KML — CV `#a52714`, TCP `#558b2f`, ADA `#ffd600`, Milícia `#01579b`/`#0288d1`), visualmente distinta dos polígonos oficiais e com um card de resultado próprio ("área de referência, sem limite oficial").

**V3 — Diego corrigiu de novo: era pra copiar direto, sem camada separada.** Ele disse: "fez errado, era só para copiar as áreas já listadas em todo o rj, mantendo nossas cores amarelas, e retirando esses pontos e essas áreas de referência". Ou seja: as ~1.672 áreas iam pra dentro do dataset principal de comunidades (mesmo amarelo, mesmo tratamento de sempre), não uma camada visualmente separada — e a camada de pontos (marcador laranja) devia sair de vez, não só parar de ser desenhada.

**Implementação final:** reextraídas as 1.672 áreas do KML (excluída a pasta "Neutras", 21 áreas, mesmo critério de sempre) direto pro schema de `ComunidadeProperties` — `id: "colab-<slug>"`, `nome`, `grupo` (tipo/CV-TCP-ADA-Milícia preservado no dado, `confianca: "baixa"`, fonte explicando a origem colaborativa — nada disso aparece na UI, mesma regra já aplicada ao resto do app desde a "Exibição simplificada"). `bairro` fica vazio (o KML não tem esse campo — `ResultPanel.tsx` já lida bem, só omite o traço quando não tem bairro). `zona` é classificada por uma heurística geográfica simples a partir do centroide de cada polígono (bounding box aproximado pra Niterói/São Gonçalo, Baixada Fluminense, e os quatro quadrantes do Rio) — **não é uma fonte oficial de zona**, é só pra manter o campo preenchido; áreas fora dessas regiões (Região dos Lagos, Costa Verde etc., ~369 das 1.672) caem em um novo valor `"Outros municipios"`. Arquivo salvo em `data/comunidades-colaborativo.geojson`, somado aos outros dois na resposta de `/api/comunidades` (ver `route.ts`) — agora ~2.889 features no total, mesma cor amarela (`COR_COMUNIDADE`), mesmo contorno sólido, sem distinção visual.

A camada de pontos (`pontos-comunitarios.geojson`, `/api/pontos-risco`), a busca por proximidade (`RAIO_PROXIMIDADE_METROS` em `lib/geo.ts`) e a camada separada de polígonos coloridos por facção (`poligonos-risco.geojson`, `/api/poligonos-risco`) foram todas removidas — arquivos de dados e rotas apagados, `lib/geo.ts` voltou a ser só a checagem de comunidade, `ConsultaResultado` perdeu os campos `areaReferencia`/`proximidade`, e a legenda/`ResultPanel.tsx` voltaram a ter uma entrada só ("Comunidade mapeada").

**Nada disso muda o princípio de integridade do projeto:** as áreas continuam marcadas internamente com `confianca: "baixa"` e a fonte real (mapa colaborativo sem autor identificado) — só que, a pedido explícito do Diego, essa distinção não aparece mais na tela, igual já acontecia com o resto das comunidades "SemInformacao" do SABREN/Niterói. São Gonçalo, Baixada Fluminense e Região dos Lagos continuam sem uma fonte *oficial* de limite (SABREN/prefeitura/IBGE) — a diferença é que agora têm limite desenhado pelo mapa colaborativo, tratado com a mesma cor/confiança que o resto do app.

Fontes candidatas já avaliadas pra expandir a curadoria: **wikifavelas.com.br** (Dicionário de Favelas Marielle Franco) é a fonte principal em uso agora — os artigos individuais por comunidade têm conteúdo verificável (usado pra curar Batam). O "Mapa Histórico dos Grupos Armados" do GENI/UFF tem um relatório em PDF, mas o mapa interativo (fogocruz.github.io/mapafc) está fora do ar — sem dataset bruto acessível. O mapa do concorrente dadosderiscos.com.br e o "Pega Visão RJ" citado pelo Poder360 são ambos crowdsourced sem metodologia/fonte citada por área — decidido não usar nenhum dos dois como fonte primária, só como lista de prioridade de pesquisa. Inspecionando o próprio código-fonte do dadosderiscos.com.br: cada um dos 1.671 polígonos carrega só `nome` + `facção`, sem fonte nem data individual — o popup mostra o mesmo texto genérico ("Informação pública compilada · base jul/2026") em todas as áreas. E o número de áreas "CV" no dataset deles (1.000) bate com o "mais de mil áreas" que reportagens (ex: Revista Oeste, 29/10/2025) atribuem justamente ao mapa crowdsourced do Pega Visão RJ — evidência de que a base de dados é, na prática, a mesma fonte não verificada, só com visual mais polido. Usamos o dataset deles como lista de prioridade e verificamos item a item com fonte independente antes de curar — foi assim que **Chapadão** entrou (CV, confiança média — Super Rádio Tupi, 10/03/2026, Operação Contenção com prisões de membros do CV no local). O repositório `github.com/Baldros/Sinal-Aberto` (avaliado) é um projeto adjacente e bem estruturado, mas resolve um problema diferente — atividade armada/policial *recente* (via API do Fogo Cruzado, ISP Dados RJ, IBGE, COR.Rio), não controle territorial por facção — e não serve como fonte de curadoria pra esse campo.

Clicar em qualquer ponto do mapa mostra a mesma informação que buscar aquele endereço (comunidade/bairro/zona) — não precisa passar pela busca. Isso substituiu o popup simples de antes (só nome, sem bairro/zona) — ver "O que já está pronto".

Território muda de mão e é frequentemente contestado — trate como o disclaimer do próprio app já avisa, pras comunidades curadas e principalmente pras que ainda não têm curadoria nenhuma.

## Bugs conhecidos que já foram resolvidos (documentado pra não perder tempo se reaparecer)

1. **Mapa com altura 0 / invisível**: o MapLibre GL injeta a classe `maplibregl-map` na própria div que você passa como `container`, e o CSS da lib define `.maplibregl-map { position: relative }`. Se essa mesma div também tiver a classe Tailwind `absolute`, o `relative` da lib pode vencer no cascade (mesma especificidade, depende da ordem de carregamento) e o mapa fica com altura 0 sem erro nenhum no console. Solução aplicada em `MapView.tsx`: um wrapper externo com `absolute inset-0` (sem a classe da lib), e a div que o MapLibre realmente usa recebe `width/height: 100%` via `style` inline.
2. **Mapa carrega mas fica em branco (sem ruas/dados) mesmo sem erro**: o maplibre-gl v6 resolve a URL do worker internamente via `import.meta.url`. Nesse setup (Next.js + Turbopack/webpack em dev), isso resolvia pra um `file:///...` local em vez de uma URL http válida — o worker nunca carregava, e sem worker nenhum tile vetorial é decodificado (o estilo/atribuição carregam normalmente, mas nada de dado aparece). Corrigido copiando `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs` **e** seu import relativo `maplibre-gl-shared.mjs` pra `public/` e apontando a lib pra eles com `maplibregl.setWorkerUrl("/maplibre-gl-worker.js")` antes de criar o mapa. **Se atualizar a versão do `maplibre-gl`, precisa recopiar esses dois arquivos de novo** (o conteúdo muda a cada versão).
3. **Busca/clique travava pra sempre em "Verificando este ponto do mapa..." (ou não retornava nada na busca)**: achado numa verificação em campo (não relacionado a essa mudança em si). Um registro de `data/comunidades-niteroi.geojson` ("Jacaré 2", id `niteroi-jacare-2`) veio com `geometry: null` do export original do ArcGIS — o `turf.booleanPointInPolygon` lança `TypeError: Cannot read properties of null (reading 'type')` ao chegar nesse item no loop de `resolverEndereco` (`lib/geo.ts`), travando a função inteira pra QUALQUER busca/clique que não desse match antes dele no array (a maioria). Corrigido dos dois lados: removido o registro com geometria nula de `comunidades-niteroi.geojson`, e adicionado guard (`feature.geometry &&`) no loop de `resolverEndereco` pra nenhum dado futuro com geometria nula derrubar a busca de novo.

## Estrutura

```
src/
  app/
    page.tsx                    → página principal (mapa + busca + resultado + clique no mapa)
    api/comunidades/route.ts    → serve o GeoJSON de comunidades
    api/pontos-risco/route.ts   → serve o GeoJSON de pontos de proximidade
    api/geocode/route.ts        → proxy de geocoding (ver "Geocoding: por que um proxy")
  components/
    MapView.tsx     → mapa MapLibre GL + camadas + clique no mapa
    SearchBar.tsx    → busca de endereço (sugestão ao digitar, CEP, localização atual)
    ResultPanel.tsx  → card de resultado
    Legend.tsx       → legenda
    Disclaimer.tsx   → aviso legal (removido da tela, ver "Exibição simplificada")
  lib/
    geocode.ts       → client: chama /api/geocode
    geocodeServer.ts → servidor: Nominatim + ViaCEP + Photon (fallback) + fila + cache
    geo.ts           → point-in-polygon e proximidade (Turf.js)
    groupStyle.ts    → cor única + cores/labels antigos por tipo de grupo (referência)
  types/
    comunidade.ts → modelo de dados
data/
  comunidades.sample.geojson    → polígonos de comunidade (ver seção acima)
  pontos-comunitarios.geojson   → pontos de proximidade (ver "Camada de proximidade")
```

## Próximos passos

1. Substituir os polígonos de exemplo pelos limites reais (Data.Rio/ArcGIS).
2. Preencher `grupo` pras comunidades prioritárias com fonte real (Fase 2 do plano).
3. Testar o geocoder com endereços reais de favela (numeração informal costuma quebrar geocoder padrão) — se a taxa de erro for alta, trocar Nominatim por Google Geocoding API (`.env.example` já deixa o hook pronto).
4. Trocar o estilo do mapa (`MapView.tsx`, `style: "https://demotiles.maplibre.org/style.json"`) por um estilo próprio antes de produção — o demo tile do MapLibre não é pra uso real.
5. Deploy (sugestão: Cloudflare Tunnel + PM2, ou qualquer host Node — Vercel, Railway, VPS próprio).
