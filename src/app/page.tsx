"use client";

import { useEffect, useState } from "react";
import MapView from "@/components/MapView";
import SearchBar from "@/components/SearchBar";
import ResultPanel from "@/components/ResultPanel";
import Legend from "@/components/Legend";
// Recolocado a pedido do Diego: o app vai ser divulgado pra comunidade real
// de motoristas/entregadores, não só uso interno de teste — precisa do aviso
// legal visível de novo.
import Disclaimer from "@/components/Disclaimer";
import { resolverEndereco } from "@/lib/geo";
import type { ComunidadeFeatureCollection, ConsultaResultado } from "@/types/comunidade";
import { reverseGeocode, type GeocodeResult } from "@/lib/geocode";

export default function Home() {
  const [dados, setDados] = useState<ComunidadeFeatureCollection | null>(null);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);
  const [marcador, setMarcador] = useState<[number, number] | null>(null);
  const [carregandoClique, setCarregandoClique] = useState(false);

  useEffect(() => {
    // no-store: o GeoJSON é curadoria periódica, não tempo real, mas um
    // fetch() do browser respeita o Cache-Control que a resposta JÁ tinha
    // quando foi cacheada — nem F5 forçado nem trocar o Cache-Control no
    // servidor invalida isso depois. Sem isso, editar o GeoJSON durante o
    // desenvolvimento parece "não fez nada" até o cache expirar sozinho.
    fetch("/api/comunidades", { cache: "no-store" })
      .then((r) => r.json())
      .then(setDados)
      .catch(() => setDados(null));
  }, []);

  function handleSelecionar(op: GeocodeResult) {
    setMarcador([op.lng, op.lat]);
    if (!dados) return;
    const res = resolverEndereco(dados, op.label, op.lng, op.lat);
    setResultado(res);
  }

  // Pedido do Diego: clicar em qualquer ponto do mapa mostra a mesma info que
  // buscar aquele endereço — reverse-geocodifica o ponto clicado pra um
  // endereço legível e roda a mesma resolução de comunidade.
  async function handleCliqueMapa(lng: number, lat: number) {
    setMarcador([lng, lat]);
    if (!dados) return;
    setCarregandoClique(true);
    let endereco: string;
    try {
      endereco = await reverseGeocode(lat, lng);
    } catch {
      // reverse geocoding falhou (ex: serviço externo fora do ar) — ainda dá
      // pra mostrar comunidade, só sem um endereço legível.
      endereco = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    setResultado(resolverEndereco(dados, endereco, lng, lat));
    setCarregandoClique(false);
  }

  return (
    // Pedido do Diego: o crédito virou um RODAPÉ de verdade (faixa inteira
    // embaixo da tela, como no print do dadosderiscos.com.br que ele mandou
    // de referência), não mais um chip discreto misturado com legenda/busca
    // — por isso o layout virou flex-col: a área do mapa (flex-1) ocupa o
    // que sobra, e o rodapé fica abaixo dela, sem se sobrepor (inclusive à
    // atribuição do MapLibre, que continua dentro da área do mapa).
    <main className="w-full h-screen overflow-hidden flex flex-col">
      <div className="relative flex-1 min-h-0">
        <MapView dados={dados} marcador={marcador} onCliqueMapa={handleCliqueMapa} />

        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex flex-col items-start gap-3 pointer-events-none">
          {/* right-[4.5rem] no mobile: dá espaço pro controle de zoom do mapa
              (top-right), que senão fica colado/coberto pela busca em telas
              estreitas — ver responsividade pedida pelo Diego. */}
          <div className="pointer-events-auto w-full max-w-xl pr-[4.5rem] sm:pr-0">
            <SearchBar onSelecionar={handleSelecionar} />
          </div>

          {carregandoClique && (
            <div className="pointer-events-auto w-full max-w-xl bg-panel border border-border rounded-lg p-4 text-sm text-gray-400">
              Verificando este ponto do mapa...
            </div>
          )}

          {!carregandoClique && resultado && (
            <div className="pointer-events-auto w-full max-w-xl">
              <ResultPanel resultado={resultado} />
            </div>
          )}

          {/* Legenda foi pro canto superior esquerdo (abaixo da busca) — no
              canto inferior esquerdo ela colidia com o indicador de dev do
              Next.js (o badge "N" que só aparece em `next dev`, não em
              produção) e ficava com a última linha cortada. */}
          <div className="pointer-events-auto">
            <Legend />
          </div>
        </div>

        {/* Recolocado a pedido do Diego pra divulgação pública — em telas
            estreitas some o risco de colidir com o zoom control (top-right)
            porque fica no canto oposto (bottom-right), abaixo da área onde
            o ResultPanel/busca aparecem. */}
        <div className="absolute bottom-4 right-4 max-w-xs bg-panel/90 backdrop-blur border border-border rounded-lg p-3 pointer-events-auto">
          <Disclaimer />
        </div>
      </div>

      {/* Rodapé com o crédito — cor de destaque (amarelo da marca, mesma
          COR_COMUNIDADE do mapa) pro nome do Diego não ficar apagado, ao
          contrário do chip cinza de antes. */}
      <footer className="shrink-0 bg-panel border-t border-border text-center py-2 px-3 text-xs sm:text-sm text-gray-400">
        Desenvolvido por{" "}
        <a
          href="https://diegopb2.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 font-semibold hover:text-amber-300 hover:underline"
        >
          Diego
        </a>
      </footer>
    </main>
  );
}
