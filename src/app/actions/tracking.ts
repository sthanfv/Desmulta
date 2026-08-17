'use server';

import { unstable_cache } from 'next/cache';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * getExpedienteCacheado v2.0
 *
 * Cambios sobre la versión anterior:
 * - Serializa el campo `eventos` del public_tracking para que el cliente
 *   pueda mostrar el historial real de actividad en /seguir/[id]
 * - Los eventos los escribe el telegramWebhook cada vez que cambias
 *   el estado desde Telegram con los botones inline
 * - TTL mantenido en 180s para proteger cuota Firestore
 */

interface EventoRaw {
  tipo?: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  descripcion?: string;
  fecha?: string;
  operador?: string;
}

export const getExpedienteCacheado = unstable_cache(
  async (shortId: string) => {
    getAdminApp();
    const db = getFirestore();

    // DevSecOps: Prevenir Path Traversal en Firestore
    if (!/^[a-zA-Z0-9_-]{5,50}$/.test(shortId)) {
      return null;
    }

    const docRef = db.collection('public_tracking').doc(shortId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return null;

    const data = docSnap.data()!;

    // Serializar eventos de forma segura para cruzar el Server/Client boundary.
    // Solo exponemos campos necesarios — sin datos del operador (Zero-PII).
    const eventosRaw: EventoRaw[] = Array.isArray(data.eventos) ? data.eventos : [];
    const eventos = eventosRaw
      .filter((e) => e.descripcion && e.fecha)
      .map((e) => ({
        tipo: (e.tipo as 'status_change' | 'nota' | 'documento' | 'system') || 'system',
        estadoAnterior: e.estadoAnterior || null,
        estadoNuevo: e.estadoNuevo || null,
        descripcion: String(e.descripcion),
        fecha: String(e.fecha),
        // No exponemos e.operador al cliente (Zero-PII)
      }));

    return {
      shortId: data.shortId || docSnap.id,
      docId: docSnap.id,
      status: data.status || 'pendiente',
      nombre: data.nombreOfuscado || data.nombre || 'Ciudadano',
      ciudad: data.ciudad || 'Colombia',
      createdAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      eventos,
    };
  },
  ['tracking-cache'],
  {
    tags: ['tracking'],
    revalidate: 180, // 3 minutos — latencia máxima aceptable para el cliente
  }
);
