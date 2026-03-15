/**
 * Utilidades Hápticas para Feedback Sensorial.
 * MANDATO-FILTRO: Experiencia premium en dispositivos Android.
 */
export const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          window.navigator.vibrate(10);
          break;
        case 'medium':
          window.navigator.vibrate(30);
          break;
        case 'success':
          window.navigator.vibrate([20, 50, 20]);
          break;
        case 'error':
          window.navigator.vibrate([100, 30, 100]);
          break;
        default:
          window.navigator.vibrate(10);
      }
    } catch (e) {
      // Silenciamos errores si el navegador bloquea la vibración
      console.warn('[Haptics]: Vibración no disponible o bloqueada por el sistema.');
    }
  }
};
