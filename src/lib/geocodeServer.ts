// Toda a lógica de geocoding que ANTES rodava direto no browser (client fetch
// pro Nominatim/ViaCEP) agora roda aqui, no servidor Next.js, chamada só pela
// rota /api/geocode. Motivo: o Nominatim público tem uma política de uso
// rígida (no máximo 1 requisição/segundo, "no heavy uses") e, testando o app
// ao vivo com a busca "ao vivo" (debounce a cada tecla) + testes manuais
// repetidos no mesmo IP residencial do Diego, o IP dele levou um bloqueio
// temporário do endpoint /search (confirmado: /status respondia normal,
// /search dava "Failed to fetch" do navegador dele, mas funcionava normal de
// outro IP). Centralizar aqui permite: (1) uma fila que respeita 1 req/s de
// verdade mesmo com várias abas/usuários batendo ao mesmo tempo, e (2) um
// cache curto pra não repetir a mesma consulta em sequência (comum quando o
// usuário pausa de digitar, edita e volta, ou clica no mapa perto de onde já
// clicou). Reduz bastante a chance de tomar bloqueio de novo, mas não
// elimina — pra produção de verdade, considere um provedor pago (Google,
// LocationIQ) ou self-host do Nominatim (ver README).

import { obterZona } from "@/lib/zonasRJ";

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  numeroAproximado?: boolean;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
// Nominatim pede um User-Agent identificável — troque pelo domínio real quando publicar.
const USER_AGENT = "radar-das-favelas/0.1 (contato: defina-um-email-de-contato)";
const RJ_VIEWBOX = "-43.85,-22.72,-43.05,-23.10"; // bbox aproximado do Rio de Janeiro (Nominatim: left,top,right,bottom)
const RJ_BBOX_PHOTON = "-43.85,-23.10,-43.05,-22.72"; // Photon: left,bottom,right,top

// Photon (komoot.io) — outro geocoder gratuito baseado em dado OSM, sem
// chave, mas host diferente do Nominatim. Usado só como fallback: se o
// nominatim.openstreetmap.org der erro de rede (ex: bloqueio temporário de
// IP por uso excessivo — foi o que aconteceu em teste ao vivo, ver histórico
// no README), a busca não trava, só passa a usar essa outra fonte até o
// Nominatim voltar a responder (não fica marcado permanentemente — cada
// chamada nova tenta o Nominatim de novo primeiro).
const PHOTON_BASE = "https://photon.komoot.io/api";

// --- Fila que serializa toda chamada ao Nominatim com um intervalo mínimo
// entre elas, dentro deste processo do servidor (o `next dev`/prod continua
// um processo Node só, então essa variável de módulo persiste entre
// requisições — não é por-usuário, é global pro app inteiro, que é
// justamente o comportamento certo pra respeitar 1 req/s no total). ---
let proximaLiberacao = 0;
async function aguardarVez(): Promise<void> {
  const agora = Date.now();
  const espera = Math.max(0, proximaLiberacao - agora);
  proximaLiberacao = Math.max(agora, proximaLiberacao) + 1100; // 1.1s de folga sobre o limite de 1 req/s
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
}

// --- Cache curto em memória — mesma consulta repetida em poucos minutos não
// gera nova chamada externa. TTL curto de propósito: o dado geográfico do
// OSM não muda a ponto de precisar de cache longo, isso aqui é só pra
// absorver repetição de uso normal (digitar, pausar, editar). ---
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { timestamp: number; dados: unknown }>();

function doCache<T>(chave: string): T | null {
  const entrada = cache.get(chave);
  if (!entrada) return null;
  if (Date.now() - entrada.timestamp > CACHE_TTL_MS) {
    cache.delete(chave);
    return null;
  }
  return entrada.dados as T;
}

function salvarCache(chave: string, dados: unknown): void {
  cache.set(chave, { timestamp: Date.now(), dados });
  // limpeza oportunista pra não crescer sem limite numa sessão de dev longa
  if (cache.size > 500) {
    const chaveMaisAntiga = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
    if (chaveMaisAntiga) cache.delete(chaveMaisAntiga);
  }
}

function extrairCEP(query: string): string | null {
  const digits = query.replace(/\D/g, "");
  const pareceSoCEP = /^\d{5}-?\d{3}$/.test(query.trim());
  return pareceSoCEP && digits.length === 8 ? digits : null;
}

// O OSM/Nominatim costuma indexar o nome da rua por extenso, mas o ViaCEP (e
// muita gente digitando) usa abreviação — "Av.", "R.", "Jr" etc. Uma busca
// que bate char-a-char com a abreviação dá 0 resultado mesmo a rua existindo
// no mapa (foi exatamente o que aconteceu com "Martin Luther King Jr" — o
// OSM tem "Junior" por extenso). Expandir as abreviações mais comuns antes
// de tentar de novo resolve a maioria desses casos sem precisar de API paga.
const ABREVIACOES: Array<[RegExp, string]> = [
  [/\bAv\.?\b/gi, "Avenida"],
  // "R." só com ponto — "R" sozinho é comum demais como inicial de nome pra
  // arriscar trocar sempre.
  [/\bR\./gi, "Rua"],
  [/\bTv\.?\b|\bTrav\.?\b/gi, "Travessa"],
  [/\bAl\.?\b/gi, "Alameda"],
  [/\bPç?a\.?\b/gi, "Praça"],
  [/\bEstr\.?\b/gi, "Estrada"],
  [/\bLgo\.?\b/gi, "Largo"],
  [/\bJr\.?\b/gi, "Junior"],
];

function expandirAbreviacoes(texto: string): string {
  return ABREVIACOES.reduce((acc, [re, subst]) => acc.replace(re, subst), texto);
}

interface EnderecoCEP {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

async function resolverCEP(cep: string): Promise<EnderecoCEP | null> {
  const chave = `cep-raw:${cep}`;
  const cacheado = doCache<EnderecoCEP | null>(chave);
  if (cacheado !== null) return cacheado;

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!res.ok) return null;
  const data = (await res.json()) as EnderecoCEP & { erro?: boolean };
  const resultado = data.erro ? null : data;
  salvarCache(chave, resultado);
  return resultado;
}

function variantesDeCEP(e: EnderecoCEP): string[] {
  const completo = [e.logradouro, e.bairro, e.localidade, e.uf].filter(Boolean).join(", ");
  const semBairro = [e.logradouro, e.localidade].filter(Boolean).join(", ");
  const variantes = [completo, semBairro];
  const expandido = expandirAbreviacoes(completo);
  if (expandido !== completo) variantes.push(expandido, expandirAbreviacoes(semBairro));
  return [...new Set(variantes.filter(Boolean))];
}

interface NominatimHit {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    municipality?: string;
  };
}

async function buscarNominatim(
  params: Record<string, string>
): Promise<NominatimHit[]> {
  const usp = new URLSearchParams({
    format: "jsonv2",
    countrycodes: "br",
    limit: "5",
    addressdetails: "1",
    ...params,
  });
  const chave = `nominatim:${usp.toString()}`;
  const cacheado = doCache<NominatimHit[]>(chave);
  if (cacheado) return cacheado;

  await aguardarVez();
  const res = await fetch(`${NOMINATIM_BASE}/search?${usp}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Geocoding falhou: ${res.status}`);
  const dados = (await res.json()) as NominatimHit[];
  salvarCache(chave, dados);
  return dados;
}

// Pedido do Diego: o card de resultado mostrava "Região Sudeste" — o
// display_name do Nominatim concatena TODA a hierarquia administrativa do
// OSM (rua, bairro, cidade, região metropolitana, ESTADO, GRANDE REGIÃO,
// país), e pro Brasil isso inclui a grande região ("Região Sudeste"), que não
// ajuda ninguém dirigindo na cidade. Em vez do display_name cru, montamos um
// label próprio: rua, bairro, e a ZONA da cidade (Zona Norte/Sul/Oeste/
// Centro — como carioca se localiza de verdade), usando a tabela bairro->zona
// em zonasRJ.ts. Sem estado/região/país.
function montarLabelNominatim(hit: NominatimHit): string {
  const addr = hit.address;
  if (!addr) return hit.display_name;

  const rua = [addr.house_number, addr.road].filter(Boolean).join(" ");
  const bairro = addr.neighbourhood || addr.suburb || addr.city_district;
  const zona = obterZona(bairro) ?? obterZona(addr.city_district);
  const cidade = addr.city || addr.town || addr.municipality;

  const partes = [rua, bairro, zona ?? cidade].filter((p): p is string => !!p);
  // dedup consecutivo (ex: bairro igual ao que a zona já cobriria)
  const vistos = new Set<string>();
  const label = partes
    .filter((p) => !vistos.has(p) && (vistos.add(p), true))
    .join(", ");

  return label || hit.display_name;
}

function paraResultado(hit: NominatimHit, numeroBuscado: string | null): GeocodeResult {
  const numeroAproximado = !!numeroBuscado && hit.address?.house_number !== numeroBuscado;
  return {
    label: montarLabelNominatim(hit),
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    numeroAproximado,
  };
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }; // [lon, lat]
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

function montarLabelPhoton(props: PhotonFeature["properties"]): string {
  const rua = [props.housenumber, props.street].filter(Boolean).join(" ");
  // Mesmo motivo do montarLabelNominatim acima: props.state do Photon pro
  // Brasil costuma vir como a grande região ("Sudeste"), não o estado —
  // trocamos pela zona da cidade quando o bairro (district) é reconhecido, e
  // só caímos pra city/state/country se não for.
  const zona = obterZona(props.district);
  const partes = [rua || props.name, props.district, zona ?? props.city];
  // remove vazios e repetição consecutiva (ex: name igual a street)
  const vistos = new Set<string>();
  return partes
    .filter((p): p is string => !!p && !vistos.has(p) && (vistos.add(p), true))
    .join(", ");
}

async function buscarPhoton(query: string, numeroBuscado: string | null): Promise<GeocodeResult[]> {
  const chave = `photon:${query}`;
  const cacheado = doCache<GeocodeResult[]>(chave);
  if (cacheado) return cacheado;

  // Photon só aceita lang default/de/en/fr — "pt" dá 400. Deixa no default
  // (retorna o nome como tá no OSM, que já costuma ser o nome local mesmo).
  const usp = new URLSearchParams({ q: query, limit: "5", bbox: RJ_BBOX_PHOTON });
  const res = await fetch(`${PHOTON_BASE}/?${usp}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Photon falhou: ${res.status}`);
  const data = (await res.json()) as { features: PhotonFeature[] };

  const resultados = data.features
    .filter((f) => f.properties.street || f.properties.name) // descarta hits sem nome útil
    .map((f) => ({
      label: montarLabelPhoton(f.properties),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      numeroAproximado: !!numeroBuscado && f.properties.housenumber !== numeroBuscado,
    }));

  salvarCache(chave, resultados);
  return resultados;
}

// Tenta o Nominatim (várias variantes, primeiro restrito ao Rio, depois sem
// restrição geográfica) e só recorre ao Photon se o Nominatim der erro de
// rede/HTTP — "achou 0 resultado" não conta como falha, só "não conseguiu
// nem perguntar".
async function buscarComFallback(
  queries: string[],
  numeroBuscado: string | null = null
): Promise<GeocodeResult[]> {
  try {
    for (const q of queries) {
      const hits = await buscarNominatim({ q, viewbox: RJ_VIEWBOX, bounded: "1" });
      if (hits.length > 0) return hits.map((h) => paraResultado(h, numeroBuscado));
    }
    if (queries[0]) {
      const hits = await buscarNominatim({ q: queries[0] });
      if (hits.length > 0) return hits.map((h) => paraResultado(h, numeroBuscado));
    }
    return [];
  } catch {
    for (const q of queries) {
      const hits = await buscarPhoton(q, numeroBuscado);
      if (hits.length > 0) return hits;
    }
    return [];
  }
}

/**
 * Busca endereço/CEP/número — mesma lógica de antes (ver comentário no topo
 * do arquivo pra por que isso agora roda no servidor).
 */
export async function buscarEndereco(query: string): Promise<GeocodeResult[]> {
  const cep = extrairCEP(query);
  if (cep) {
    const endereco = await resolverCEP(cep);
    if (!endereco) return [];
    return buscarComFallback(variantesDeCEP(endereco));
  }

  const matchNumero = query.match(/\b(\d{1,6}[a-zA-Z]?)\b/);
  const numero = matchNumero ? matchNumero[1] : null;

  if (numero) {
    const rua = query
      .replace(matchNumero![0], " ")
      .replace(/,/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    for (const ruaTentativa of [...new Set([rua, expandirAbreviacoes(rua)])]) {
      try {
        const hitsEstruturado = await buscarNominatim({
          street: `${numero} ${ruaTentativa}`,
          city: "Rio de Janeiro",
          state: "RJ",
          country: "Brazil",
        });
        if (hitsEstruturado.length > 0) {
          return hitsEstruturado.map((h) => paraResultado(h, numero));
        }
      } catch {
        // segue tentando as próximas variantes
      }
    }
  }

  return buscarComFallback([...new Set([query, expandirAbreviacoes(query)])], numero);
}

/**
 * Reverse geocoding — usado tanto pelo botão "usar minha localização atual"
 * quanto pelo clique no mapa.
 */
export async function buscarReverso(lat: number, lng: number): Promise<string> {
  const chave = `reverse:${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cacheado = doCache<string>(chave);
  if (cacheado) return cacheado;

  let label: string;
  try {
    await aguardarVez();
    const usp = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lng), addressdetails: "1" });
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${usp}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`Reverse geocoding falhou: ${res.status}`);
    const data = (await res.json()) as NominatimHit;
    label = data.display_name ? montarLabelNominatim(data) : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    // Nominatim indisponível — tenta o reverse do Photon (mesmo motivo do
    // fallback em buscarComFallback acima).
    const usp = new URLSearchParams({ lat: String(lat), lon: String(lng) });
    const res = await fetch(`https://photon.komoot.io/reverse?${usp}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`Reverse geocoding (fallback) falhou: ${res.status}`);
    const data = (await res.json()) as { features?: PhotonFeature[] };
    label = data.features?.[0] ? montarLabelPhoton(data.features[0].properties) : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  salvarCache(chave, label);
  return label;
}
