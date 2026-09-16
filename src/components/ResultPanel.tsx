import type { ConsultaResultado } from "@/types/comunidade";
import { COR_COMUNIDADE } from "@/lib/groupStyle";

// "Niteroi/SG" é o valor curto salvo no dado (ver ComunidadeProperties em
// types/comunidade.ts) — pra exibição na tela usamos o nome por extenso.
// "Outros municipios" já é legível como está, sem precisar de tradução.
const ZONA_LABEL: Record<string, string> = {
  "Niteroi/SG": "Niterói",
};

// Pedido do Diego: os cards de resultado pararam de mostrar nome de facção,
// confiança e fonte — só "é comunidade" / "fora de comunidade", sem
// detalhar qual grupo nem o nível de confiança do dado. As linhas removidas
// ficam comentadas abaixo (não apagadas) pra facilitar reverter. Import
// antigo usado nelas: GRUPO_COR, GRUPO_LABEL, CONFIANCA_LABEL (@/lib/groupStyle)
//
// Uma versão anterior teve dois cards extras aqui ("área de referência
// desenhada no mapa colaborativo" e "perto de uma área de risco") pras
// camadas separadas de polígono/ponto do mapa colaborativo — removidos a
// pedido do Diego: essas áreas agora entram direto no dataset principal de
// comunidades, então caem no mesmo card de "Comunidade mapeada" abaixo.

export default function ResultPanel({ resultado }: { resultado: ConsultaResultado }) {
  if (!resultado.dentroDeComunidade || !resultado.comunidade) {
    // Pedido do Diego: endereço fora de qualquer comunidade mas bem perto da
    // borda de uma (ex: rua na divisa) merece um aviso, não só "fora de área
    // mapeada" — sem indicar grupo/facção, só a distância (ver
    // LIMIAR_PROXIMIDADE_METROS em lib/geo.ts).
    if (resultado.proximidade) {
      return (
        <div className="bg-panel border border-amber-500/50 rounded-lg p-4 text-sm space-y-2">
          <p className="text-gray-400 text-xs">{resultado.endereco}</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm shrink-0 bg-amber-500" />
            <span className="font-medium">Próximo a uma comunidade mapeada</span>
          </div>
          <p className="text-gray-400 text-xs">
            {resultado.proximidade.comunidade.nome} — ~{resultado.proximidade.distanciaMetros} m de distância
          </p>
        </div>
      );
    }

    return (
      <div className="bg-panel border border-border rounded-lg p-4 text-sm space-y-1">
        <p className="font-medium">Fora de área mapeada como comunidade</p>
        <p className="text-gray-400 text-xs">{resultado.endereco}</p>
      </div>
    );
  }

  const c = resultado.comunidade;

  return (
    <div className="bg-panel border border-border rounded-lg p-4 text-sm space-y-2">
      <p className="text-gray-400 text-xs">{resultado.endereco}</p>
      <p className="font-semibold text-base">{c.nome}</p>
      <p className="text-gray-400 text-xs">
        {c.bairro ? `${c.bairro} — ` : ""}
        {ZONA_LABEL[c.zona] ?? c.zona}
      </p>

      <div className="flex items-center gap-2 pt-1">
        <span
          className="inline-block w-3 h-3 rounded-sm shrink-0"
          style={{ backgroundColor: COR_COMUNIDADE }}
        />
        <span className="font-medium">Comunidade mapeada</span>
      </div>

      {/* Removido a pedido do Diego — ficam comentadas pra reverter fácil:
      <div className="text-xs text-gray-400 space-y-0.5 pt-1 border-t border-border">
        <p>{CONFIANCA_LABEL[c.grupo.confianca]}</p>
        <p>Fonte: {c.grupo.fonte}</p>
        <p>Atualizado em: {c.grupo.dataAtualizacao}</p>
      </div>
      */}
    </div>
  );
}
