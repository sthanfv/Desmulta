/**
 * Motor de Lógica Difusa (Fuzzy Matching) para Desmulta v2.6.5.
 * Basado en el algoritmo de Distancia de Levenshtein para tolerar errores de OCR.
 * MANDATO-FILTRO: Documentación en español y alta precisión técnica.
 */

/**
 * Calcula la distancia de Levenshtein entre dos cadenas de texto.
 * Determina el número mínimo de ediciones (inserciones, eliminaciones o sustituciones)
 * necesarias para transformar una cadena en otra.
 *
 * @param a - Primera cadena a comparar.
 * @param b - Segunda cadena a comparar.
 * @returns El número de ediciones necesarias.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // Eliminación
        matrix[i][j - 1] + 1, // Inserción
        matrix[i - 1][j - 1] + cost // Sustitución
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Verifica si una cadena coincide con un objetivo objetivo tolerando un margen de error (Lógica Difusa).
 * Útil para validar textos procesados por OCR que pueden tener caracteres mal interpretados (ej. '0' por 'O').
 *
 * @example isFuzzyMatch('C0BR0', 'COBRO', 2) -> true
 *
 * @param word - Texto extraído del OCR o entrada del usuario.
 * @param target - Texto de referencia esperado.
 * @param tolerance - Número máximo de ediciones permitidas (por defecto 1).
 * @returns boolean - true si la coincidencia está dentro del margen de tolerancia.
 */
export function isFuzzyMatch(word: string, target: string, tolerance: number = 1): boolean {
  if (!word || !target) return false;

  // Optimización FinOps: Si la diferencia de longitud es mayor a la tolerancia,
  // es matemáticamente imposible que coincidan dentro del margen.
  if (Math.abs(word.length - target.length) > tolerance) return false;

  return getLevenshteinDistance(word, target) <= tolerance;
}
