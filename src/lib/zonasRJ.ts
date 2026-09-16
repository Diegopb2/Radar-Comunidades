// Tabela bairro -> zona do Rio de Janeiro. Pedido do Diego: o card de
// endereço mostrava "Região Sudeste" (nome da grande região do Brasil, que o
// Nominatim/Photon incluem na hierarquia administrativa do OSM) em vez de
// algo útil pra quem dirige na cidade — ele quer ver a ZONA da cidade (Zona
// Norte, Zona Sul, Zona Oeste, Centro), que é como cariocas se localizam de
// verdade.
//
// Base: os 139 bairros já curados em data/comunidades.sample.geojson (cada
// comunidade tem bairro+zona), complementados aqui com bairros comuns da
// Zona Sul/Centro que não têm comunidade mapeada mas aparecem bastante em
// busca de endereço (Leblon, Lagoa, Rocinha etc.) — pra não achar "zona
// desconhecida" só porque aquele bairro específico não tem favela.
export const ZONA_POR_BAIRRO: Record<string, string> = {
  "Acari": "Zona Norte",
  "Alto da Boa Vista": "Zona Sul",
  "Anchieta": "Zona Norte",
  "Andaraí": "Zona Sul",
  "Anil": "Zona Oeste",
  "Bancários": "Zona Norte",
  "Bangu": "Zona Oeste",
  "Barra Olímpica": "Zona Oeste",
  "Barra da Tijuca": "Zona Oeste",
  "Barra de Guaratiba": "Zona Oeste",
  "Barros Filho": "Zona Norte",
  "Benfica": "Centro",
  "Bento Ribeiro": "Zona Norte",
  "Bonsucesso": "Zona Norte",
  "Botafogo": "Zona Sul",
  "Brás de Pina": "Zona Norte",
  "Cachambi": "Zona Norte",
  "Cacuia": "Zona Norte",
  "Caju": "Centro",
  "Camorim": "Zona Oeste",
  "Campinho": "Zona Norte",
  "Campo Grande": "Zona Oeste",
  "Cascadura": "Zona Norte",
  "Catete": "Zona Sul",
  "Catumbi": "Centro",
  "Cavalcanti": "Zona Norte",
  "Centro": "Centro",
  "Cidade de Deus": "Zona Oeste",
  "Cocotá": "Zona Norte",
  "Coelho Neto": "Zona Norte",
  "Colégio": "Zona Norte",
  "Complexo do Alemão": "Zona Norte",
  "Copacabana": "Zona Sul",
  "Cordovil": "Zona Norte",
  "Cosme Velho": "Zona Sul",
  "Cosmos": "Zona Oeste",
  "Costa Barros": "Zona Norte",
  "Curicica": "Zona Oeste",
  "Del Castilho": "Zona Norte",
  "Deodoro": "Zona Oeste",
  "Encantado": "Zona Norte",
  "Engenheiro Leal": "Zona Norte",
  "Engenho Novo": "Zona Norte",
  "Engenho da Rainha": "Zona Norte",
  "Engenho de Dentro": "Zona Norte",
  "Estácio": "Centro",
  "Flamengo": "Zona Sul",
  "Freguesia (Ilha do Governador)": "Zona Norte",
  "Freguesia (Jacarepaguá)": "Zona Oeste",
  "Galeão": "Zona Norte",
  "Gamboa": "Centro",
  "Gardênia Azul": "Zona Oeste",
  "Grajaú": "Zona Sul",
  "Guadalupe": "Zona Norte",
  "Guaratiba": "Zona Oeste",
  "Gávea": "Zona Sul",
  "Higienópolis": "Zona Norte",
  "Honório Gurgel": "Zona Norte",
  "Humaitá": "Zona Sul",
  "Ilha de Guaratiba": "Zona Oeste",
  "Imperial de São Cristóvão": "Centro",
  "Inhaúma": "Zona Norte",
  "Inhoaíba": "Zona Oeste",
  "Ipanema": "Zona Sul",
  "Irajá": "Zona Norte",
  "Itanhangá": "Zona Oeste",
  "Jacarepaguá": "Zona Oeste",
  "Jacarezinho": "Zona Norte",
  "Jacaré": "Zona Norte",
  "Jardim América": "Zona Norte",
  "Jardim Botânico": "Zona Sul",
  "Jardim Carioca": "Zona Norte",
  "Jardim Guanabara": "Zona Norte",
  "Jardim Sulacap": "Zona Oeste",
  "Laranjeiras": "Zona Sul",
  "Leme": "Zona Sul",
  "Lins de Vasconscelos": "Zona Norte",
  "Madureira": "Zona Norte",
  "Magalhães Bastos": "Zona Oeste",
  "Mangueira": "Centro",
  "Manguinhos": "Zona Norte",
  "Marechal Hermes": "Zona Norte",
  "Maré": "Zona Norte",
  "Méier": "Zona Norte",
  "Olaria": "Zona Norte",
  "Oswaldo Cruz": "Zona Norte",
  "Paciência": "Zona Oeste",
  "Padre Miguel": "Zona Oeste",
  "Paquetá": "Centro",
  "Parada de Lucas": "Zona Norte",
  "Parque Anchieta": "Zona Norte",
  "Parque Colúmbia": "Zona Norte",
  "Pavuna": "Zona Norte",
  "Pechincha": "Zona Oeste",
  "Pedra de Guaratiba": "Zona Oeste",
  "Penha": "Zona Norte",
  "Penha Circular": "Zona Norte",
  "Piedade": "Zona Norte",
  "Pilares": "Zona Norte",
  "Pitangueiras": "Zona Norte",
  "Portuguesa": "Zona Norte",
  "Praça Seca": "Zona Oeste",
  "Quintino Bocaiúva": "Zona Norte",
  "Ramos": "Zona Norte",
  "Realengo": "Zona Oeste",
  "Recreio dos Bandeirantes": "Zona Oeste",
  "Ricardo de Albuquerque": "Zona Norte",
  "Rio Comprido": "Centro",
  "Rocha Miranda": "Zona Norte",
  "Sampaio": "Zona Norte",
  "Santa Cruz": "Zona Oeste",
  "Santa Teresa": "Centro",
  "Santo Cristo": "Centro",
  "Santíssimo": "Zona Oeste",
  "Senador Camará": "Zona Oeste",
  "Senador Vasconcelos": "Zona Oeste",
  "Sepetiba": "Zona Oeste",
  "São Conrado": "Zona Sul",
  "São Francisco Xavier": "Zona Norte",
  "Tanque": "Zona Oeste",
  "Taquara": "Zona Oeste",
  "Tauá": "Zona Norte",
  "Tijuca": "Zona Sul",
  "Todos os Santos": "Zona Norte",
  "Tomás Coelho": "Zona Norte",
  "Turiaçu": "Zona Norte",
  "Urca": "Zona Sul",
  "Vargem Grande": "Zona Oeste",
  "Vargem Pequena": "Zona Oeste",
  "Vaz Lobo": "Zona Norte",
  "Vicente de Carvalho": "Zona Norte",
  "Vidigal": "Zona Sul",
  "Vigário Geral": "Zona Norte",
  "Vila Isabel": "Zona Sul",
  "Vila Kennedy": "Zona Oeste",
  "Vila Kosmos": "Zona Norte",
  "Vila Militar": "Zona Oeste",
  "Vila Valqueire": "Zona Oeste",
  "Água Santa": "Zona Norte",

  // Complemento — bairros sem comunidade curada mas comuns em busca de
  // endereço (a lista acima vem só do dado de comunidades, que não cobre
  // todo bairro da cidade).
  "Leblon": "Zona Sul",
  "Lagoa": "Zona Sul",
  "Rocinha": "Zona Sul",
  "Maracanã": "Zona Norte",
  "Praça da Bandeira": "Zona Norte",
  "Cidade Nova": "Centro",
  "Glória": "Centro",
  "Lapa": "Centro",
  "República": "Centro",
  "São Cristóvão": "Centro",
  "Centro Histórico": "Centro",
  "Cosmorama": "Zona Oeste",
  "Jardim Guandu": "Zona Oeste",
  "Vasco da Gama": "Centro",
  "Grumari": "Zona Oeste",
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .trim();
}

// índice normalizado (sem acento/caixa) montado uma vez, pra casar
// "Copacabana", "copacabana" ou "COPACABANA" com a mesma entrada.
const INDICE_NORMALIZADO: Map<string, string> = new Map(
  Object.entries(ZONA_POR_BAIRRO).map(([bairro, zona]) => [normalizar(bairro), zona])
);

/**
 * Dado um nome de bairro (como vem do Nominatim/Photon, formato livre),
 * retorna a zona da cidade ("Zona Norte" etc.) se o bairro for reconhecido,
 * ou null se não tiver na tabela (bairro fora do município do Rio, nome
 * grafado diferente, etc. — nesse caso o chamador cai pro nome da
 * cidade/estado normalmente).
 */
export function obterZona(bairro: string | undefined | null): string | null {
  if (!bairro) return null;
  return INDICE_NORMALIZADO.get(normalizar(bairro)) ?? null;
}
