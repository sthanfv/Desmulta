/**
 * Wrapper de la Web Haptics API con manejo defensivo de errores.
 *
 * Chrome/Edge bloquean `navigator.vibrate()` si el usuario no ha interactuado
 * previamente con el frame. Se envuelven todas las llamadas en try-catch silencioso
 * para eliminar el ruido de consola `[Intervention] Blocked call to navigator.vibrate`.
 */

const vibrar = (patron: number | number[]) => {
  try {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(patron);
    }
  } catch {
    // Silenciar la intervención del navegador por falta de gesto previo del usuario
  }
};

export const Haptics = {
  /** Pulso ligero al interactuar con el escáner */
  tap: () => vibrar(10),

  /** Patrón de alerta cuando el motor heurístico falla o rechaza */
  error: () => vibrar([50, 100, 50]),

  /** Vibración contundente cuando el Semáforo Legal dicta resultado positivo */
  success: () => vibrar([100, 50, 100, 50, 100]),

  /** Fricción al arrastrar (Ej: Slider Before/After) */
  slide: () => vibrar(5),

  /** Apertura de Modales o Bottom Sheets */
  modalOpen: () => vibrar([15, 50, 15]),

  /** Cierre físico (Swipe to Dismiss) */
  modalClose: () => vibrar([10]),

  /** Límite alcanzado (Ej: Slider llega al 0% o 100% o rebote) */
  impact: () => vibrar([25]),
};
