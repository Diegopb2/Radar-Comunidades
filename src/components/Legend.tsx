import { COR_COMUNIDADE } from "@/lib/groupStyle";

// Pedido do Diego: parar de mostrar nome/cor de facção na legenda — só
// indica "aqui é comunidade mapeada" (amarelo) + a busca de endereço separa
// "dentro de comunidade" de "fora de comunidade" (ver ResultPanel.tsx).
// Legenda antiga (uma linha por facção, ver GRUPO_COR/GRUPO_LABEL em
// groupStyle.ts) fica comentada pra referência caso precise reverter:
//
// const ORDEM: GrupoTipo[] = ["CV", "TCP", "ADA", "Milicia", "SemInformacao"];
// ...um <div> por tipo, com GRUPO_COR[tipo] e GRUPO_LABEL[tipo]
//
// Uma versão anterior teve duas linhas extras aqui ("Marcador de
// referência"/"Área de referência") pras camadas separadas de pontos e
// polígonos do mapa colaborativo — removidas a pedido do Diego: essas áreas
// agora entram direto no dataset principal de comunidades (mesmo amarelo
// acima), sem distinção visual na legenda.

export default function Legend() {
  return (
    <div className="bg-panel/90 backdrop-blur border border-border rounded-lg p-3 text-sm min-w-[190px]">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3.5 h-3.5 rounded-sm shrink-0 border border-white/20"
          style={{ backgroundColor: COR_COMUNIDADE }}
        />
        <span>Comunidade mapeada</span>
      </div>
    </div>
  );
}
