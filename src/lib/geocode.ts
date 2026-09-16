export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  // true quando a busca tinha número mas o resultado encontrado não bate
  // exatamente com esse número (Nominatim "arredondou" pro ponto mais
  // próximo na rua) — comum em numeração informal de favela. A UI usa isso
  // pra avisar "número aproximado" em vez de passar confiança que não existe.
  numeroAproximado?: boolean;
}

// A lógica de geocoding (Nominatim/ViaCEP, expansão de abreviação, fila de
// requisição, cache) mudou pra rodar no servidor — ver
// src/lib/geocodeServer.ts pro motivo (resumo: chamar o Nominatim direto do
// browser, sem nenhum controle de volume, foi o que causou um bloqueio
// temporário do IP do Diego durante os testes). Este arquivo agora só chama
// a rota interna /api/geocode.

export async function geocodeAddress(
  query: string,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`Geocoding falhou: ${res.status}`);
  const data = (await res.json()) as { resultados?: GeocodeResult[]; erro?: string };
  return data.resultados ?? [];
}

/**
 * Reverse geocoding — usado pelo botão "usar minha localização atual" e
 * pelo clique no mapa (lat/lng → endereço legível pra mostrar no resultado).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const usp = new URLSearchParams({ tipo: "reverse", lat: String(lat), lng: String(lng) });
  const res = await fetch(`/api/geocode?${usp}`);
  if (!res.ok) throw new Error(`Reverse geocoding falhou: ${res.status}`);
  const data = (await res.json()) as { label?: string };
  return data.label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
