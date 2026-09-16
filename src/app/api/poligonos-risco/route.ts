import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

// Mesmo padrão de /api/pontos-risco, mas pros placemarks do mapa colaborativo
// que já vêm como Polygon (área desenhada), não só ponto — ver
// data/poligonos-risco.geojson e types/comunidade.ts (PoligonoRiscoProperties).
export async function GET() {
  const filePath = path.join(process.cwd(), "data", "poligonos-risco.geojson");
  const raw = await fs.readFile(filePath, "utf-8");
  const geojson = JSON.parse(raw);

  return NextResponse.json(geojson, {
    headers: {
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
