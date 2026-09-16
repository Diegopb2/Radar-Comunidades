import { booleanPointInPolygon, point } from "@turf/turf";
import type { ComunidadeFeatureCollection, ConsultaResultado } from "@/types/comunidade";

/**
 * Resolve, no client, se um ponto (lng, lat) cai dentro de alguma comunidade.
 * Roda em cima do GeoJSON já carregado — sem round-trip ao backend por consulta.
 *
 * Pedido do Diego: as áreas do mapa colaborativo (Mapa Das Facções RJ) foram
 * incorporadas direto no dataset principal de comunidades (ver
 * data/comunidades-colaborativo.geojson e /api/comunidades), com a mesma cor
 * amarela das demais — não são mais uma camada/checagem separada. As camadas
 * de "marcador de referência" (pontos, busca por proximidade) e "área de
 * referência" (polígono tracejado/colorido por facção) foram removidas a
 * pedido dele; essa função voltou a ser só a checagem de comunidade.
 */
export function resolverEndereco(
  fc: ComunidadeFeatureCollection,
  endereco: string,
  lng: number,
  lat: number
): ConsultaResultado {
  const pt = point([lng, lat]);

  // Bug real encontrado numa verificação anterior: um registro de
  // comunidades-niteroi.geojson ("Jacaré 2") veio com `geometry: null` do
  // export original do ArcGIS, e o turf (booleanPointInPolygon) lança
  // TypeError ao processar geometria nula — trava a busca inteira (qualquer
  // clique/endereço que não desse match ANTES desse item no array). Já
  // removido o registro ruim do dado, mas o guard fica aqui também —
  // geometria nula não deveria nunca derrubar a busca de novo, seja qual for
  // a origem do dado.
  for (const feature of fc.features) {
    if (feature.geometry && booleanPointInPolygon(pt, feature)) {
      return {
        dentroDeComunidade: true,
        comunidade: feature.properties,
        endereco,
        coordenadas: [lng, lat],
      };
    }
  }

  return {
    dentroDeComunidade: false,
    endereco,
    coordenadas: [lng, lat],
  };
}
