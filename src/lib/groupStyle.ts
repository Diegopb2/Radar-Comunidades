import type { GrupoTipo } from "@/types/comunidade";

// "Disputa"/"Território contestado" saiu da legenda e do mapa (MapView.tsx
// já não gera essa cor — qualquer área nessa situação cai em SemInformacao).
// O tipo continua existindo em GrupoTipo só por compatibilidade de dado
// antigo; não use essa entrada em UI nova.
export const GRUPO_COR: Record<GrupoTipo, string> = {
  CV: "#dc2626", // vermelho
  TCP: "#2563eb", // azul
  ADA: "#16a34a", // verde
  Milicia: "#6b7280", // cinza
  Disputa: "#9333ea", // não usado — mapeado igual a SemInformacao
  SemInformacao: "#9333ea", // roxo — sinaliza "sem dado", nunca deixar transparente/sumido
};

export const GRUPO_LABEL: Record<GrupoTipo, string> = {
  CV: "CV",
  TCP: "TCP",
  ADA: "ADA",
  Milicia: "Milícia",
  Disputa: "Sem informação verificada", // não usado — ver comentário acima
  SemInformacao: "Sem informação verificada",
};

export const CONFIANCA_LABEL: Record<string, string> = {
  alta: "Alta confiança",
  media: "Confiança média",
  baixa: "Baixa confiança",
};

// Pedido do Diego: parar de expor cor/nome de facção no mapa e nos cards —
// mostrar só "é comunidade" (amarelo, uma cor só) + a checagem de
// proximidade com área de risco, sem dizer qual grupo. GRUPO_COR/GRUPO_LABEL
// continuam existindo (o dado em si não muda, só a exibição), usados agora
// só como referência caso precise reverter.
export const COR_COMUNIDADE = "#eab308"; // amarelo

// COR_PONTO_RISCO existiu numa versão anterior (pontos e polígonos do mapa
// colaborativo em camadas separadas, cor laranja distinta) — removida a
// pedido do Diego: essas áreas agora entram direto no dataset principal de
// comunidades acima, mesma cor amarela, sem camada/cor própria.
