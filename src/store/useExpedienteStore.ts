import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

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
  multas: Multa[];
  /** Timestamp (ms) de la última vez que se escribieron multas. Usada para invalidar el caché a las 24h. */
  multasCachedAt: number | null;
  ocrRawText: string | null;
  capturedImage: string | null; // No persistido (muy pesado)
  setCapturedImage: (img: string | null) => void;
  setFormData: (data: Partial<ExpedienteState>) => void;
  setCedula: (cedula: string) => void;
  setOcrRawText: (text: string) => void;
  addMulta: (multa: Multa) => void;
  addMultas: (multas: Multa[]) => void;
  removeMulta: (id: string) => void;
  getTotalDeuda: () => number;
  clearExpediente: () => void;
}

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
      multas: [],
      multasCachedAt: null,
      ocrRawText: null,
      capturedImage: null,
      setCapturedImage: (capturedImage) => set({ capturedImage }),
      setFormData: (data) => set((state) => ({ ...state, ...data })),
      setCedula: (cedula) => set({ cedula }),
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
      clearExpediente: () =>
        set({
          cedula: null,
          nombre: null,
          placa: null,
          email: null,
          celular: null,
          ciudad: null,
          autoridad: null,
          direccion: null,
          multas: [],
          ocrRawText: null,
          capturedImage: null,
          multasCachedAt: null,
        }),
    }),
    {
      name: 'desmulta-expediente-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string): Promise<string | null> => {
          return (await get(name)) || null;
        },
        setItem: async (name: string, value: string): Promise<void> => {
          await set(name, value);
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
