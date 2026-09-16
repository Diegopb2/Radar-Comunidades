export type GrupoTipo =
  | "CV"
  | "TCP"
  | "ADA"
  | "Milicia"
  | "Disputa"
  | "SemInformacao";

export type Confianca = "alta" | "media" | "baixa";

export interface GrupoInfo {
  tipo: GrupoTipo;
  confianca: Confianca;
  /** Ex.: "G1 — mapa das facções (mar/2026)", "Curadoria própria" */
  fonte: string;
  /** ISO date da última revisão desse campo */
  dataAtualizacao: string;
}

export interface ComunidadeProperties {
  id: string;
  nome: string;
  bairro: string;
  zona:
    | "Zona Norte"
    | "Zona Sul"
    | "Zona Oeste"
    | "Centro"
    | "Baixada"
    | "Niteroi/SG"
    // Pedido do Diego: incorporar as áreas do mapa colaborativo (Comando
    // Vermelho/TCP/ADA/Milícia) direto na camada principal de comunidades,
    // mesma cor amarela, sem camada separada — ver
    // data/comunidades-colaborativo.geojson. Muitas dessas áreas ficam fora
    // do Rio/Niterói/Baixada (Região dos Lagos, Costa Verde etc.), sem um
    // valor de zona que já existisse no app — "Outros municípios" cobre
    // esses casos, classificado por uma heurística geográfica simples
    // (ver script de geração nas notas do README).
    | "Outros municipios";
  grupo: GrupoInfo;
}

export type ComunidadeFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ComunidadeProperties
>;

export type ComunidadeFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ComunidadeProperties
>;

export interface ConsultaResultado {
  dentroDeComunidade: boolean;
  comunidade?: ComunidadeProperties;
  endereco: string;
  coordenadas: [number, number]; // [lng, lat]
  /** Só preenchido quando dentroDeComunidade é false e a borda mais próxima
   * fica a até LIMIAR_PROXIMIDADE_METROS (ver lib/geo.ts). */
  proximidade?: {
    comunidade: ComunidadeProperties;
    distanciaMetros: number;
  };
}
