import { useEffect } from 'react';

/**
 * useRevealObserver - Hook para manejar la animación 'reveal' de elementos UI.
 * MANDATO-FILTRO: Uso de IntersectionObserver para optimización de performance.
 */
export function useRevealObserver(threshold = 0.1) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [threshold]);
}
