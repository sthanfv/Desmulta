/**
 * Haptics: Motor de retroalimentación sensorial para dispositivos móviles.
 * Proporciona vibraciones sutiles para reforzar la percepción de calidad y respuesta visual.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

export const haptics = {
  vibrate: (style: HapticStyle = 'light') => {
    if (typeof window === 'undefined' || !navigator.vibrate) return;

    switch (style) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate(40);
        break;
      case 'success':
        navigator.vibrate([15, 30, 15]);
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        navigator.vibrate([50, 100, 50, 100]);
        break;
    }
  },
};
