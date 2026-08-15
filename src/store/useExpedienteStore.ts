import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { z } from 'zod';
import { encryptForStorage, decryptFromStorage } from '@/lib/security/storage-crypto';

let unsubscribeFirestore: Unsubscribe | null = null;

export interface Multa {
  id: string;
  comparendo: string;
  fecha: string;
  valor: number;
  estado: string; // ej: 'Cobro Coactivo'
}

interface ExpedienteState {
  cedula: string | null;
  nombre: string | null;
  placa: string | null;
  email: string | null;
  celular: string | null;
  ciudad: string | null;
  autoridad: string | null;
  direccion: string | null;
  estado: string | null;
  multas: Multa[];
  /** Timestamp (ms) de la última vez que se escribieron multas. Usada para invalidar el caché a las 24h. */
  multasCachedAt: number | null;
  ocrRawText: string | null;
  capturedImage: string | null; // No persistido (muy pesado)
  setCapturedImage: (img: string | null) => void;
  setFormData: (data: Partial<ExpedienteState>) => void;
  setCedula: (cedula: string) => void;
  setEstado: (estado: string) => void;
  setOcrRawText: (text: string) => void;
  addMulta: (multa: Multa) => void;
  addMultas: (multas: Multa[]) => void;
  removeMulta: (id: string) => void;
  getTotalDeuda: () => number;
  clearExpediente: () => void;

  /** Firestore Realtime Sync */
  trackingUuid: string | null;
  setTrackingUuid: (uuid: string) => void;
  startSync: (uuid: string) => void;
  stopSync: () => void;
}

// 🛡️ Esquema de validación para prevenir sobrescritura arbitraria del estado
const FormDataSchema = z
  .object({
    cedula: z
      .string()
      .regex(/^\d{6,12}$/)
      .optional(),
    nombre: z.string().max(100).optional(),
    placa: z.string().max(10).optional(),
    email: z.string().email().optional(),
    celular: z.string().max(15).optional(),
    ciudad: z.string().max(50).optional(),
    autoridad: z.string().max(100).optional(),
    direccion: z.string().max(200).optional(),
  })
  .partial();

export const useExpedienteStore = create<ExpedienteState>()(
  persist(
    (set, get) => ({
      cedula: null,
      nombre: null,
      placa: null,
      email: null,
      celular: null,
      ciudad: null,
      autoridad: null,
      direccion: null,
      estado: null,
      multas: [],
      multasCachedAt: null,
      ocrRawText: null,
      capturedImage: null,
      setCapturedImage: (capturedImage) => set({ capturedImage }),
      setFormData: (data) => {
        const parsed = FormDataSchema.safeParse(data);
        if (!parsed.success) return;
        set((state) => ({ ...state, ...parsed.data }));
      },
      setCedula: (cedula) => set({ cedula }),
      setEstado: (estado) => set({ estado }),
      setOcrRawText: (ocrRawText) => set({ ocrRawText }),
      addMulta: (multa) =>
        set((state) => {
          if (state.multas.some((m) => m.comparendo === multa.comparendo)) return state;
          return { multas: [...state.multas, multa], multasCachedAt: Date.now() };
        }),
      addMultas: (nuevasMultas) =>
        set((state) => {
          const multasFiltradas = nuevasMultas.filter(
            (nm) => !state.multas.some((m) => m.comparendo === nm.comparendo)
          );
          if (multasFiltradas.length === 0) return state;
          return { multas: [...state.multas, ...multasFiltradas], multasCachedAt: Date.now() };
        }),
      removeMulta: (id) => set((state) => ({ multas: state.multas.filter((m) => m.id !== id) })),
      getTotalDeuda: () => get().multas.reduce((total, multa) => total + multa.valor, 0),
      clearExpediente: () => {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
        set({
          cedula: null,
          nombre: null,
          placa: null,
          email: null,
          celular: null,
          ciudad: null,
          autoridad: null,
          direccion: null,
          estado: null,
          multas: [],
          ocrRawText: null,
          capturedImage: null,
          multasCachedAt: null,
          trackingUuid: null,
        });
      },
      trackingUuid: null,
      setTrackingUuid: (trackingUuid) => set({ trackingUuid }),
      startSync: (uuid) => {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }
        set({ trackingUuid: uuid });
        const docRef = doc(db, 'expedientes', uuid);
        unsubscribeFirestore = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              // Actualizamos la tienda Zustand reactivamente desde Firebase en vez de hacer Polling manual
              set((state) => ({
                ...state,
                multas: data.multas || state.multas,
                nombre: data.nombre || state.nombre,
                estado: data.estado || state.estado,
                // Si la base de datos es la fuente de verdad, actualizamos cache
                multasCachedAt: Date.now(),
              }));
            }
          },
          (error) => {
            console.error('[Zustand] Error en onSnapshot:', error);
          }
        );
      },
      stopSync: () => {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
      },
    }),
    {
      name: 'desmulta-expediente-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string): Promise<string | null> => {
          const stored = await get(name);
          if (!stored) return null;
          try {
            return await decryptFromStorage(stored as string);
          } catch (_e) {
            // Retrocompatibilidad: si no se puede descifrar (posiblemente porque estaba en texto plano),
            // se retorna el valor original para que Zustand lo parsee y luego se guarde cifrado.
            return stored as string;
          }
        },
        setItem: async (name: string, value: string): Promise<void> => {
          const encrypted = await encryptForStorage(value);
          await set(name, encrypted);
        },
        removeItem: async (name: string): Promise<void> => {
          await del(name);
        },
      })),
      // Solo persistimos datos ligeros para evitar crash de RAM
      partialize: (state) => ({
        // ✅ cedula eliminada del localStorage — es PII sensible.
        // Si el usuario comparte dispositivo, no quedan datos personales.
        multas: state.multas,
        // Timestamp para invalidación de caché (TTL 24h)
        multasCachedAt: state.multasCachedAt,
        trackingUuid: state.trackingUuid,
        // ocrRawText también puede contener nombre/placa del SIMIT — eliminado.
      }),
      // Invalida multas persistidas si tienen más de 24 horas
      // Evita que el usuario vea información desactualizada del SIMIT indefinidamente
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const TTL_24H = 24 * 60 * 60 * 1000;
        if (state.multasCachedAt && Date.now() - state.multasCachedAt > TTL_24H) {
          state.multas = [];
          state.multasCachedAt = null;
        }
      },
    }
  )
);
