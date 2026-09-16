import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Fase 1: serve o GeoJSON estático de /data. Quando a base virar algo maior
// (banco, atualização por curadoria com histórico), troca só o corpo desta
// função — o contrato HTTP pro client não muda.
//
// Pedido do Diego: expandir a cobertura além do município do Rio (Niterói,
// São Gonçalo, Baixada Fluminense, Região dos Lagos). Começamos por Niterói
// (única com fonte oficial já encontrada e integrada — ver README, seção
// "Cobertura fora do município do Rio"). Em vez de misturar tudo num arquivo
// só, cada município novo vira seu próprio GeoJSON em /data — mais fácil de
// atualizar/revisar a curadoria de cada fonte separadamente — e essa rota
// concatena os features de todos na resposta única que o client já espera.
//
// `comunidades-colaborativo.geojson`: as ~1.672 áreas do mapa colaborativo
// "Mapa Das Facções RJ" (Google MyMaps), incorporadas aqui a pedido do Diego
// — mesma cor amarela/estilo das demais comunidades, sem camada separada.
// Continuam com `grupo.confianca: "baixa"` e a fonte real no dado (não
// exibida na UI, mesma regra do resto do app) — ver README, seção "Áreas do
// mapa colaborativo incorporadas à camada principal".
const ARQUIVOS_COMUNIDADES = [
  "comunidades.sample.geojson",
  "comunidades-niteroi.geojson",
  "comunidades-colaborativo.geojson",
];

export async function GET() {
  const colecoes = await Promise.all(
    ARQUIVOS_COMUNIDADES.map(async (nome) => {
      const filePath = path.join(process.cwd(), "data", nome);
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw) as { type: "FeatureCollection"; features: unknown[] };
    })
  );

  const geojson = {
    type: "FeatureCollection" as const,
    features: colecoes.flatMap((c) => c.features),
  };

  return NextResponse.json(geojson, {
    headers: {
      // Dado muda por curadoria, não em tempo real — mas 1h de cache "duro"
      // (sem revalidação) deixava o browser servindo GeoJSON velho até depois
      // de trocar o arquivo, o que mascarava atualizações de curadoria como
      // "não carregou". max-age curto + must-revalidate: cliente sempre
      // confere com o servidor, e o servidor só reenvia o corpo se mudou.
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
