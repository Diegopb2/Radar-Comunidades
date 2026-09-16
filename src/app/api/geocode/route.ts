import { NextRequest, NextResponse } from "next/server";
import { buscarEndereco, buscarReverso } from "@/lib/geocodeServer";

// Proxy pro geocoding (ver geocodeServer.ts pro motivo de existir esse
// intermediário em vez do client chamar Nominatim/ViaCEP direto).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");

  try {
    if (tipo === "reverse") {
      const lat = parseFloat(searchParams.get("lat") ?? "");
      const lng = parseFloat(searchParams.get("lng") ?? "");
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return NextResponse.json({ erro: "lat/lng inválidos" }, { status: 400 });
      }
      const label = await buscarReverso(lat, lng);
      return NextResponse.json({ label });
    }

    const q = searchParams.get("q");
    if (!q || !q.trim()) {
      return NextResponse.json({ erro: "parâmetro q é obrigatório" }, { status: 400 });
    }

    const resultados = await buscarEndereco(q);
    return NextResponse.json({ resultados });
  } catch (e) {
    // Loga o erro real no servidor (útil pra depurar sem expor detalhe
    // interno pro client) — foi assim que se descobriu o parâmetro
    // `lang=pt` inválido no fallback do Photon, por exemplo.
    console.error("Erro em /api/geocode:", e);
    return NextResponse.json({ erro: "Falha ao consultar o serviço de geocoding" }, { status: 502 });
  }
}
