import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Reenvío al motor cuántico de Golang (Fase 1.5 - Ahora en Producción)
    const engineUrl = process.env.GO_ENGINE_URL || 'https://desmulta-calculadora-go.onrender.com/api/v1/calcular-multa';
    const secretToken = process.env.GO_ENGINE_SECRET || 'dev_secret_123';
    
    const goResponse = await fetch(engineUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Engine-Token': secretToken
      },
      body: JSON.stringify(body)
    });

    if (!goResponse.ok) {
      throw new Error(`El motor de Golang falló o está apagado (HTTP ${goResponse.status})`);
    }

    const goJson = await goResponse.json();
    
    // Retornamos directamente lo que dijo Go
    return NextResponse.json(goJson, { status: 200 });

  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error interno al procesar el cálculo. ' + mensaje },
      { status: 500 }
    );
  }
}
