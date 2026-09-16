"use client";

import { useEffect, useRef, useState } from "react";
import { geocodeAddress, reverseGeocode, type GeocodeResult } from "@/lib/geocode";

interface Props {
  onSelecionar: (resultado: GeocodeResult) => void;
  // Pedido do Diego: botão de limpar o campo de endereço (X). Opcional —
  // quando informado, também limpa o pino/resultado no mapa (ver page.tsx).
  onLimpar?: () => void;
}

// Nominatim pede no máximo 1 requisição/segundo — um debounce de 600ms
// enquanto o usuário digita fica bem dentro disso na prática (uso de uma
// pessoa só, não em rajada) e ainda dá sugestão "ao vivo" sem span de request.
const DEBOUNCE_MS = 600;
// Só busca automaticamente a partir daqui — string muito curta gera lista
// grande e inútil e gasta chamada à toa.
const MIN_CHARS = 5;

export default function SearchBar({ onSelecionar, onLimpar }: Props) {
  const [query, setQuery] = useState("");
  const [opcoes, setOpcoes] = useState<GeocodeResult[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function executarBusca(q: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCarregando(true);
    setErro(null);
    try {
      const resultados = await geocodeAddress(q, controller.signal);
      setOpcoes(resultados);
      if (resultados.length === 0) {
        setErro("Nenhum endereço encontrado. Tente incluir bairro e cidade, ou digite o CEP.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErro("Falha ao buscar o endereço. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  function handleChange(valor: string) {
    setQuery(valor);
    setErro(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const cepCompleto = /^\d{5}-?\d{3}$/.test(valor.trim());
    if (!cepCompleto && valor.trim().length < MIN_CHARS) {
      setOpcoes([]);
      return;
    }

    debounceRef.current = setTimeout(() => executarBusca(valor), DEBOUNCE_MS);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    executarBusca(query);
  }

  function limpar() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setQuery("");
    setOpcoes([]);
    setErro(null);
    onLimpar?.();
  }

  function selecionar(op: GeocodeResult) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    onSelecionar(op);
    setOpcoes([]);
    setQuery(op.label);
  }

  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) {
      setErro("Seu navegador não suporta localização automática.");
      return;
    }
    setErro(null);
    setBuscandoLocal(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const label = await reverseGeocode(latitude, longitude);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          setQuery(label);
          onSelecionar({ label, lat: latitude, lng: longitude });
        } catch {
          setErro("Achei sua localização, mas não consegui identificar o endereço.");
        } finally {
          setBuscandoLocal(false);
        }
      },
      () => {
        setErro("Não consegui acessar sua localização — verifique a permissão do navegador.");
        setBuscandoLocal(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="w-full max-w-xl">
      {/* flex-wrap + min-w no input: em telas bem estreitas (celular em
          retrato, com a busca já compartilhando espaço com o controle de
          zoom do mapa) os três elementos numa linha só ficavam espremidos
          ou cortados — agora o botão "Buscar" quebra pra linha de baixo
          se não couber, em vez de sumir atrás de outro elemento. */}
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[9rem]">
          <input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Endereço, número ou CEP no Rio de Janeiro..."
            // pr-9: espaço pro botão X não ficar em cima do texto digitado
            className="w-full bg-panel border border-border rounded-lg px-4 pr-9 py-2.5 text-sm outline-none focus:border-gray-500"
          />
          {query && (
            <button
              type="button"
              onClick={limpar}
              title="Limpar endereço"
              aria-label="Limpar endereço"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={usarLocalizacaoAtual}
          disabled={buscandoLocal}
          title="Usar minha localização atual"
          aria-label="Usar minha localização atual"
          className="bg-panel border border-border text-sm rounded-lg px-3 py-2.5 disabled:opacity-50 hover:border-gray-500 flex items-center justify-center shrink-0"
        >
          {buscandoLocal ? (
            "..."
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          )}
        </button>
        <button
          type="submit"
          disabled={carregando}
          className="bg-white text-black font-medium rounded-lg px-4 py-2.5 text-sm disabled:opacity-50 shrink-0"
        >
          {carregando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {erro && <p className="text-xs text-red-400 mt-2">{erro}</p>}

      {opcoes.length > 0 && (
        <ul className="mt-2 bg-panel border border-border rounded-lg divide-y divide-border overflow-hidden">
          {opcoes.map((op, i) => (
            <li key={i}>
              <button
                onClick={() => selecionar(op)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-white/5"
              >
                <div>{op.label}</div>
                {op.numeroAproximado && (
                  <div className="text-xs text-amber-500/80 mt-0.5">
                    Número aproximado — o mapa pode marcar um ponto próximo, não o número exato
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
