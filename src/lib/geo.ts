import {
  booleanPointInPolygon,
  point,
  centroid,
  distance as distanciaEntrePontos,
  pointToPolygonDistance,
} from "@turf/turf";
import type { ComunidadeFeature, ComunidadeFeatureCollection, ConsultaResultado } from "@/types/comunidade";

// Pedido do Diego: quando o endereço cai fora de qualquer comunidade mas tá
// bem pertinho da borda de uma (ex: rua na divisa), avisar em vez de só
// dizer "fora de área mapeada" — sem indicar qual grupo/facção, mesma regra
// de sempre, só a distância até a comunidade mais próxima.
const LIMIAR_PROXIMIDADE_METROS = 150;

// Filtro grosseiro por distância até o centroide antes de calcular a
// distância real até a borda do polígono (mais cara) — evita rodar
// pointToPolygonDistance nas ~2.900 comunidades a cada busca sem match.
const RAIO_FILTRO_GROSSEIRO_METROS = 3000;

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
 * pedido dele; essa função voltou a ser só a checagem de comunidade + o
 * alerta de proximidade abaixo.
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

  // Não caiu em nenhuma — checa se tá bem perto da borda de alguma antes de
  // desistir. `pointToPolygonDistance` lida com Polygon/MultiPolygon e
  // buracos, retorna negativo se o ponto tivesse caído dentro (não deveria
  // acontecer aqui, já que o loop acima não deu match), então ignoramos
  // valores negativos como precaução.
  let maisProxima: ComunidadeFeature["properties"] | null = null;
  let menorDistancia = Infinity;

  for (const feature of fc.features) {
    if (!feature.geometry) continue;

    // Filtro grosseiro primeiro: se o centroide já tá longe, nem vale
    // calcular a distância real até a borda.
    const distCentroide = distanciaEntrePontos(pt, centroid(feature), { units: "meters" });
    if (distCentroide > RAIO_FILTRO_GROSSEIRO_METROS) continue;

    const dist = pointToPolygonDistance(pt, feature.geometry, { units: "meters" });
    if (dist >= 0 && dist <= LIMIAR_PROXIMIDADE_METROS && dist < menorDistancia) {
      menorDistancia = dist;
      maisProxima = feature.properties;
    }
  }

  if (maisProxima) {
    return {
      dentroDeComunidade: false,
      endereco,
      coordenadas: [lng, lat],
      proximidade: { comunidade: maisProxima, distanciaMetros: Math.round(menorDistancia) },
    };
  }

  return {
    dentroDeComunidade: false,
    endereco,
    coordenadas: [lng, lat],
  };
}
