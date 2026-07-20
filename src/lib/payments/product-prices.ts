/**
 * Fuente de verdad única para los precios de productos.
 * Importar desde aquí en cualquier endpoint que necesite precios.
 * NUNCA duplicar este diccionario en otros archivos.
 */
export const PRODUCT_PRICES: Record<string, number> = {
  peticion_general: 3_900_000, // $39.000 COP
  prescripcion_directa: 5_900_000, // $59.000 COP
  doble_prescripcion: 7_900_000, // $79.000 COP
  nulidad_notificacion: 4_900_000, // $49.000 COP
  tutela_silencio: 3_900_000, // $39.000 COP
  caducidad_1_anio: 5_900_000, // $59.000 COP
  nulidad_falta_identidad: 4_900_000, // $49.000 COP
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
