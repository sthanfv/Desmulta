/**
 * Fuente de verdad única para los precios de productos.
 * Importar desde aquí en cualquier endpoint que necesite precios.
 * NUNCA duplicar este diccionario en otros archivos.
 */
export const PRODUCT_PRICES: Record<string, number> = {
  peticion_general:        2_000_000, // $20.000 COP
  prescripcion_directa:    3_000_000, // $30.000 COP
  doble_prescripcion:      6_000_000, // $60.000 COP
  nulidad_notificacion:    4_000_000, // $40.000 COP
  tutela_silencio:         2_500_000, // $25.000 COP
  caducidad_1_anio:        3_000_000, // $30.000 COP
  nulidad_falta_identidad: 3_500_000, // $35.000 COP
} as const;

export type ProductType = keyof typeof PRODUCT_PRICES;

/**
 * Formatea un valor en centavos a formato de moneda colombiana.
 * @param centavos - Valor en centavos
 * @returns Cadena formateada (ej: '$25.000')
 */
export function formatearCOP(centavos: number): string {
  return '$' + (centavos / 100).toLocaleString('es-CO');
}
