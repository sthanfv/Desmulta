import { NextResponse } from 'next/server';

/**
 * Motor de ValidaciÃ³n en el Edge â€” Desmulta v5.15.0
 *
 * Ventajas:
 * 1. Latencia < 50ms (Ejecución en el nodo más cercano).
 * 2. Protección anti-DDoS (Filtra basura antes de la DB).
 * 3. Ahorro de recursos en Supabase/Firebase.
 *
 * MANDATO-FILTRO: Seguridad y Velocidad Extrema.
 */

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { placa, cedula } = body;

    // 1. Validación de presencia (Cédula obligatoria, Placa opcional)
    if (!cedula) {
      return NextResponse.json({ error: 'El número de cédula es obligatorio' }, { status: 400 });
    }

    // 2. Validación de formato de placa (Solo si se proporciona)
    if (placa && placa.trim() !== '') {
      const regexPlaca = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]$/i;
      if (!regexPlaca.test(placa)) {
        return NextResponse.json(
          { error: 'Formato de placa inválido. Use AAA123 para carros o AAA12A para motos.' },
          { status: 400 }
        );
      }
    }

    // 3. Validación de cédula (Solo números, 5 a 20 dígitos para cubrir NITs y cédulas extranjeras)
    if (!/^\d{5,20}$/.test(cedula)) {
      return NextResponse.json(
        { error: 'Número de cédula inválido. Verifique e intente nuevamente.' },
        { status: 400 }
      );
    }

    // En este punto, los datos están saneados y listos para la DB principal
    return NextResponse.json({
      success: true,
      mensaje: 'Validación preliminar exitosa. Analizando viabilidad de prescripción...',
      datos: {
        placa: placa.toUpperCase(),
        cedula,
      },
    });
  } catch (err) {
    console.error('[validar-consulta] Error en el Edge:', err); // En el Edge no usamos el logger singleton de Node
    return NextResponse.json(
      { error: 'Error procesando la solicitud en el Edge' },
      { status: 500 }
    );
  }
}
