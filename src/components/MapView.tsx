"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ComunidadeFeatureCollection } from "@/types/comunidade";
import { COR_COMUNIDADE } from "@/lib/groupStyle";

interface Props {
  // Pedido do Diego: as áreas do mapa colaborativo (Mapa Das Facções RJ)
  // foram incorporadas direto nesse dataset (mesma cor amarela de sempre —
  // ver data/comunidades-colaborativo.geojson e /api/comunidades), em vez de
  // camadas próprias de "marcador"/"área de referência" que existiram numa
  // versão anterior (removidas a pedido dele).
  dados: ComunidadeFeatureCollection | null;
  marcador: [number, number] | null; // [lng, lat]
  onMapaPronto?: (map: MapLibreMap) => void;
  // Pedido do Diego: clicar em qualquer ponto do mapa mostra a mesma info que
  // buscar aquele endereço, não só um popup com nome.
  onCliqueMapa?: (lng: number, lat: number) => void;
}

const RIO_CENTER: [number, number] = [-43.2, -22.91];

// O maplibre-gl v6 calcula a URL do worker via `import.meta.url` internamente.
// Em dev com Next.js (Turbopack e também webpack, nesse setup) isso resolve
// pra um caminho de arquivo local (file:///...) em vez de uma URL http válida,
// então o worker nunca carrega — e sem o worker, nenhum tile vetorial é
// decodificado: o mapa fica com o estilo/atribuição carregados mas 100% em
// branco, sem erro visível além de um "module script... text/html" no
// console. Copiamos o worker pra `public/` e apontamos a lib pra ele
// explicitamente, o que contorna o problema por completo.
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl("/maplibre-gl-worker.js");
}

export default function MapView({ dados, marcador, onMapaPronto, onCliqueMapa }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  // O clique é registrado uma vez só (useEffect de mount, deps []), mas o
  // callback muda de identidade a cada render do componente pai (fecha sobre
  // `dados`, que chega depois via fetch assíncrono). Sem o ref, o listener
  // ficaria preso pra sempre na versão de onCliqueMapa capturada no primeiro
  // render (quando os dados ainda eram null).
  const onCliqueMapaRef = useRef(onCliqueMapa);
  onCliqueMapaRef.current = onCliqueMapa;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // OpenFreeMap "liberty" — estilo vetorial completo (ruas, bairros,
      // relevo), gratuito e sem chave de API. O demo tile do MapLibre
      // (demotiles.maplibre.org) só tem contorno de país, fica em branco
      // nesse zoom — por isso parecia que o mapa "não carregava". Antes de
      // produção, considere hospedar seu próprio estilo (MapTiler, Protomaps
      // self-hosted) pra não depender de um serviço gratuito de terceiro.
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: RIO_CENTER,
      zoom: 10.5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.getCanvas().style.cursor = "pointer"; // o mapa inteiro é clicável agora, ver onCliqueMapa
    map.on("click", (e) => {
      onCliqueMapaRef.current?.(e.lngLat.lng, e.lngLat.lat);
    });
    mapRef.current = map;
    onMapaPronto?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega/atualiza a camada de comunidades quando os dados chegam
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !dados) return;

    function aplicarCamadas() {
      if (map!.getSource("comunidades")) {
        (map!.getSource("comunidades") as maplibregl.GeoJSONSource).setData(dados as any);
        return;
      }

      map!.addSource("comunidades", { type: "geojson", data: dados as any });

      // Pedido do Diego: parar de colorir por facção — toda comunidade
      // mapeada entra na mesma cor (amarelo), sem expor qual grupo tem
      // presença ali. O dado de `grupo` continua existindo no GeoJSON (só
      // não é mais usado pra cor/label na UI) — ver COR_COMUNIDADE em
      // groupStyle.ts. Lógica antiga (cor por facção via match expression)
      // fica comentada abaixo só como referência caso precise reverter:
      //
      // const corPorGrupo: any = [
      //   "match", ["get", "tipo", ["get", "grupo"]],
      //   "CV", GRUPO_COR.CV, "TCP", GRUPO_COR.TCP, "ADA", GRUPO_COR.ADA,
      //   "Milicia", GRUPO_COR.Milicia, GRUPO_COR.SemInformacao,
      // ];

      map!.addLayer({
        id: "comunidades-fill",
        type: "fill",
        source: "comunidades",
        paint: {
          "fill-color": COR_COMUNIDADE,
          "fill-opacity": 0.45,
        },
      });

      map!.addLayer({
        id: "comunidades-outline",
        type: "line",
        source: "comunidades",
        paint: {
          "line-color": COR_COMUNIDADE,
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });

      // Pedido do Diego: mostrar o nome de cada comunidade direto no mapa,
      // sem precisar clicar — importante em complexos como o do Alemão, que
      // têm várias comunidades vizinhas com nomes diferentes (Nova Brasília,
      // Grota, Fazendinha etc.), difíceis de distinguir só pelo contorno.
      // minzoom 13: em zoom de cidade inteira, ~1.026 rótulos ao mesmo tempo
      // viram poluição visual ilegível — o rótulo só aparece quando já dá
      // pra ler (zoom de bairro/complexo pra cima). O MapLibre também some
      // automaticamente com rótulos que colidiriam entre si (comportamento
      // padrão do symbol layer, sem precisar configurar nada a mais).
      map!.addLayer({
        id: "comunidades-labels",
        type: "symbol",
        source: "comunidades",
        minzoom: 13,
        layout: {
          "text-field": ["get", "nome"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 13, 11, 17, 15],
          "text-font": ["Noto Sans Regular"],
          "text-max-width": 8,
          "symbol-placement": "point",
        },
        paint: {
          "text-color": "#3f2d00",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
      });

      // Pedido do Diego: clicar em qualquer ponto do mapa (não só em cima de
      // uma comunidade) mostra a mesma info que buscar aquele endereço —
      // nome, bairro/zona, ou proximidade com área de risco. Isso substituiu
      // o popup pequeno de antes (só nome, sem bairro/zona/proximidade), que
      // fica comentado abaixo pra referência caso precise reverter. O
      // listener de clique em si é registrado uma vez só no mount (ver
      // useEffect acima, `onCliqueMapaRef`), não aqui dentro — não precisa
      // repetir por camada.
      //
      // const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "280px" });
      // map!.on("mouseenter", "comunidades-fill", () => { map!.getCanvas().style.cursor = "pointer"; });
      // map!.on("mouseleave", "comunidades-fill", () => { map!.getCanvas().style.cursor = ""; });
      // map!.on("click", "comunidades-fill", (e) => {
      //   const feature = e.features?.[0];
      //   if (!feature) return;
      //   const props = feature.properties as any;
      //   popup.setLngLat(e.lngLat).setHTML(
      //     `<div style="font-family:inherit;min-width:160px">` +
      //       `<div style="font-weight:600;font-size:14px">${props.nome ?? "Comunidade"}</div>` +
      //       `<div style="font-size:12px;opacity:0.7;margin-top:2px">Comunidade mapeada</div>` +
      //       `</div>`
      //   ).addTo(map!);
      // });
    }

    if (map.isStyleLoaded()) {
      aplicarCamadas();
    } else {
      map.once("load", aplicarCamadas);
    }
  }, [dados]);

  // Pino de resultado de busca
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!marcador) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: "#ffffff" });
    }
    markerRef.current.setLngLat(marcador).addTo(map);
    map.flyTo({ center: marcador, zoom: 15, duration: 800 });
  }, [marcador]);

  // O maplibre-gl adiciona a classe "maplibregl-map" à div do container, e o
  // CSS da própria lib define `.maplibregl-map { position: relative }` — isso
  // colide em especificidade com a classe "absolute" do Tailwind na MESMA div
  // (dependendo da ordem de carregamento, o position:relative da lib vence e
  // o mapa fica com altura 0, invisível). Solução: a div que recebe a classe
  // da lib só controla w-full/h-full (propriedade diferente, sem conflito);
  // quem faz o "absolute inset-0" é o wrapper externo, que a lib não toca.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
