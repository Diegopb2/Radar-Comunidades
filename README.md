# Radar das Favelas

Digite um endereço no Rio de Janeiro e saiba na hora se ele fica dentro de uma comunidade mapeada — pensado pra motoristas de app (Uber, 99, entregadores) que precisam decidir uma corrida sem conhecer a região.

## O que o app faz

- **Busca de endereço** com sugestões ao digitar, aceita CEP e endereço com número.
- **Localização atual** via GPS do navegador, pra quando você já está no local.
- **Mapa interativo** (MapLibre GL) com todas as comunidades do Rio de Janeiro, Niterói e região metropolitana marcadas, cada uma com nome visível no mapa.
- **Clique em qualquer ponto do mapa** pra ver a mesma informação de uma busca.
- Resultado rápido e direto: dentro de comunidade mapeada ou não, sem informação extra que não ajuda quem tá dirigindo.

## Rodando local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre em `http://localhost:3000`.

## Stack

Next.js, TypeScript, Tailwind CSS, MapLibre GL e Turf.js pro cálculo geográfico. Geocoding via Nominatim/Photon (OpenStreetMap) e ViaCEP.

## Estrutura

```
src/
  app/
    page.tsx                  → página principal (mapa + busca + resultado)
    api/comunidades/route.ts  → serve os dados das comunidades
    api/geocode/route.ts      → proxy de geocoding
  components/
    MapView.tsx      → mapa e camadas
    SearchBar.tsx     → busca de endereço, CEP e localização atual
    ResultPanel.tsx   → card de resultado
    Legend.tsx        → legenda do mapa
  lib/
    geocode.ts        → busca de endereço
    geo.ts            → point-in-polygon (Turf.js)
  types/
    comunidade.ts      → modelo de dados
data/
  *.geojson            → polígonos das comunidades mapeadas
```

## Sobre os dados

As áreas mapeadas combinam bases públicas oficiais (Data.Rio/SABREN, Plano Diretor de Niterói) com um mapeamento colaborativo, sempre priorizando o limite geográfico real de cada comunidade.

## Próximos passos

1. Ampliar a cobertura geográfica da região metropolitana.
2. Deploy em produção.

## Licença

Veja o arquivo [LICENSE](LICENSE).

---

Desenvolvido por [Diego](https://diegopb2.github.io/).
