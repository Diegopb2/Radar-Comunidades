import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Mesmo padrão da rota /api/comunidades — serve o GeoJSON de pontos do mapa
// colaborativo (ver data/pontos-comunitarios.geojson e a explicação em
// README.md/doc de arquitetura sobre por que esses pontos são tratados
// separado dos polígonos de comunidade oficiais, com confiança sempre baixa).
export async function GET() {
  const filePath = path.join(process.cwd(), "data", "pontos-comunitarios.geojson");
  const raw = await fs.readFile(filePath, "utf-8");
  const geojson = JSON.parse(raw);

  return NextResponse.json(geojson, {
    headers: {
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
