'use client';

import { useEffect, useState } from 'react';

/**
 * Hook para solucionar los problemas de Hydration Mismatch (Server vs Client)
 * cuando se utilizan estados persistentes como Zustand con almacenamiento asíncrono (idb-keyval).
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
