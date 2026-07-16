/**
 * @file prices/route.ts
 * @description Endpoint público que expone los precios de los productos de Desmulta.
 *
 * PROPÓSITO — FUENTE DE VERDAD ÚNICA:
 *   Los precios de los productos viven EXCLUSIVAMENTE en `@/lib/payments/product-prices`.
 *   Este endpoint los expone al frontend para que ninguna página tenga precios hardcodeados.
 *
 *   Beneficios:
 *   - Un solo cambio de precio en el servidor se refleja automáticamente en
 *     todos los frontends sin necesidad de tocar componentes React.
 *   - Elimina la posibilidad de desajuste visual (el cliente ve un precio
 *     diferente al que Wompi cobra realmente).
 *   - Facilita cambios de precio dinámicos o por campaña en el futuro.
 *
 * SEGURIDAD:
 *   - Los precios son información pública (ya que el usuario los ve antes de
 *     pagar). No se requiere autenticación para este endpoint.
 *   - El monto real cobrado siempre se calcula en `create-order/route.ts`
 *     desde el mismo diccionario. Este endpoint solo lo expone para UI.
 *   - Se añade `Cache-Control` para reducir latencia en producción.
 *
 * HISTORIAL:
 *   - v1.0.0 (2026-06-22): Creación. Corrección auditoría — elimina precios
 *     hardcodeados en el frontend (hallazgo #4 de la auditoría forense Wompi).
 */

import { NextResponse } from 'next/server';
import { PRODUCT_PRICES, formatearCOP } from '@/lib/payments/product-prices';

/**
 * Manejador GET del endpoint de precios.
 * Devuelve los precios de todos los productos disponibles en centavos
 * y en formato legible para el usuario.
 *
 * @returns JSON con los precios en centavos y formateados para mostrar en UI.
 *
 * @example
 * // Respuesta:
 * {
 *   "peticion_general": { "centavos": 2500000, "display": "$25.000" },
 *   ...
 * }
 */
export async function GET() {
  // Construir el objeto de respuesta combinando centavos y formato legible
  const precios = Object.entries(PRODUCT_PRICES).reduce<
    Record<string, { centavos: number; display: string }>
  >((acc, [clave, centavos]) => {
    acc[clave] = {
      centavos,
      display: formatearCOP(centavos),
    };
    return acc;
  }, {});

  return NextResponse.json(precios, {
    headers: {
      // Cachear 5 minutos en el navegador, 10 minutos en CDN/Edge
      // Si se cambia un precio, se invalida en máximo 10 minutos.
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
