import { NextResponse } from 'next/server';

/**
 * Motor de Validación en el Edge — Desmulta v5.4.1
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

        // 1. Validación de presencia
        if (!placa || !cedula) {
            return NextResponse.json(
                { error: 'La placa y la cédula son obligatorias' },
                { status: 400 }
            );
        }

        // 2. Validación de formato (Colombia: Carros AAA123, Motos AAA12A)
        // Refinamos el regex para mayor compatibilidad nacional
        const regexPlaca = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]$/i;

        if (!regexPlaca.test(placa)) {
            return NextResponse.json(
                { error: 'Formato de placa inválido. Use AAA123 para carros o AAA12A para motos.' },
                { status: 400 }
            );
        }

        // 3. Validación de cédula (Solo números, 6 a 10 dígitos)
        if (!/^\d{6,10}$/.test(cedula)) {
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
                cedula
            }
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Error procesando la solicitud en el Edge' },
            { status: 500 }
        );
    }
}
