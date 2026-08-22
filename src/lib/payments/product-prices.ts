/**
 * Fuente de verdad única para los precios de productos.
 * Importar desde aquí en cualquier endpoint que necesite precios.
 * NUNCA duplicar este diccionario en otros archivos.
 */
export const PRODUCT_PRICES: Record<string, number> = {
  peticion_general: 1_950_000, // $19.500 COP
  prescripcion_directa: 2_950_000, // $29.500 COP
  doble_prescripcion: 3_950_000, // $39.500 COP
  nulidad_notificacion: 2_450_000, // $24.500 COP
  tutela_silencio: 1_950_000, // $19.500 COP
  caducidad_1_anio: 2_950_000, // $29.500 COP
  nulidad_falta_identidad: 2_450_000, // $24.500 COP
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
