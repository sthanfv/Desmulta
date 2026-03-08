import { useCallback } from 'react';

/**
 * useMouseFollow - Hook para manejar el efecto de seguimiento de ratón en el fondo.
 * MANDATO-FILTRO: Optimización para evitar re-renders en Mobile.
 */
export function useMouseFollow() {
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return;
    
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    target.style.setProperty('--mouse-x', `${x}px`);
    target.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  return handleMouseMove;
}
