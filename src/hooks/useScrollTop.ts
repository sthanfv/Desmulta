import { useState, useEffect } from 'react';

/**
 * useScrollTop - Hook para manejar la visibilidad del botón de scroll al inicio.
 * MANDATO-FILTRO: Optimización de eventos de scroll con passive listeners.
 */
export function useScrollTop(threshold = 400) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    let lastScrollValue = window.scrollY;

    const handleScroll = () => {
      const currentScroll = window.scrollY;

      // Solo actualizar si cruzamos el umbral para evitar re-renders innecesarios
      if (
        (currentScroll > threshold && lastScrollValue <= threshold) ||
        (currentScroll <= threshold && lastScrollValue > threshold)
      ) {
        setShowScrollTop(currentScroll > threshold);
      }
      lastScrollValue = currentScroll;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return showScrollTop;
}
