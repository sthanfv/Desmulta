/**
 * Fuente de verdad única para los precios de productos.
 * Importar desde aquí en cualquier endpoint que necesite precios.
 * NUNCA duplicar este diccionario en otros archivos.
 */
export const PRODUCT_PRICES: Record<string, number> = {
  peticion_general:        1_490_000, // $14.900 COP
  prescripcion_directa:    2_490_000, // $24.900 COP
  doble_prescripcion:      3_490_000, // $34.900 COP
  nulidad_notificacion:    2_990_000, // $29.900 COP
  tutela_silencio:         1_990_000, // $19.900 COP
  poder_especial:          1_490_000, // $14.900 COP
  caducidad_1_anio:        2_990_000, // $29.900 COP
  nulidad_falta_identidad: 2_490_000, // $24.900 COP
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
