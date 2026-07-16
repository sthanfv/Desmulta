/**
 * Fuente de verdad única para los precios de productos.
 * Importar desde aquí en cualquier endpoint que necesite precios.
 * NUNCA duplicar este diccionario en otros archivos.
 */
export const PRODUCT_PRICES: Record<string, number> = {
  peticion_general:     2_500_000,
  prescripcion_directa: 3_500_000,
  doble_prescripcion:   4_500_000,
  nulidad_notificacion: 3_000_000,
  tutela_silencio:      5_000_000,
  poder_especial:       2_000_000,
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
