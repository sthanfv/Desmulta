import { useState, useEffect } from 'react';
import type { Auth } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

/**
 * Hook para escuchar en tiempo real la llegada de nuevos leads (estado 'pendiente')
 * creados en las últimas 2 horas.
 *
 * @param auth - Instancia de Auth para validar si hay sesión activa
 * @returns Número de leads nuevos en las últimas 2 horas
 */
export function useNuevosLeadsRT(auth: Auth | null) {
  const [realtimeNewLeadsCount, setRealtimeNewLeadsCount] = useState(0);

  useEffect(() => {
    if (!auth?.currentUser) return;

    // Filtro para las últimas 2 horas (Timestamp de Firestore, no string ISO)
    const dosHorasAtras = new Date(Date.now() - 2 * 3600000);

    const q = query(
      collection(db, 'consultations'),
      where('status', '==', 'pendiente'),
      where('createdAt', '>=', Timestamp.fromDate(dosHorasAtras)),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRealtimeNewLeadsCount(snap.docs.length);
      },
      (error) => {
        console.warn('[useNuevosLeadsRT] Error o permisos insuficientes en onSnapshot:', error);
        // Fallback seguro: si fallan las reglas de Firestore (ej. no es admin aún), evitamos crashear
      }
    );

    return () => unsub();
  }, [auth?.currentUser?.uid]);

  return realtimeNewLeadsCount;
}
