import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Multa {
  id: string;
  comparendo: string;
  fecha: string;
  valor: number;
  estado: string; // ej: 'Cobro Coactivo'
}

interface ExpedienteState {
  cedula: string | null;
  multas: Multa[];
  ocrRawText: string | null;
  capturedImage: string | null; // No persistido (muy pesado)
  setCedula: (cedula: string) => void;
  setOcrRawText: (text: string) => void;
  setCapturedImage: (img: string | null) => void;
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
      multas: [],
      ocrRawText: null,
      capturedImage: null,
      setCedula: (cedula) => set({ cedula }),
      setOcrRawText: (ocrRawText) => set({ ocrRawText }),
      setCapturedImage: (capturedImage) => set({ capturedImage }),
      addMulta: (multa) =>
        set((state) => {
          if (state.multas.some((m) => m.comparendo === multa.comparendo)) return state;
          return { multas: [...state.multas, multa] };
        }),
      addMultas: (nuevasMultas) =>
        set((state) => {
          const multasFiltradas = nuevasMultas.filter(
            (nm) => !state.multas.some((m) => m.comparendo === nm.comparendo)
          );
          if (multasFiltradas.length === 0) return state;
          return { multas: [...state.multas, ...multasFiltradas] };
        }),
      removeMulta: (id) => set((state) => ({ multas: state.multas.filter((m) => m.id !== id) })),
      getTotalDeuda: () => get().multas.reduce((total, multa) => total + multa.valor, 0),
      clearExpediente: () =>
        set({ cedula: null, multas: [], ocrRawText: null, capturedImage: null }),
    }),
    {
      name: 'desmulta-expediente-storage',
      storage: createJSONStorage(() => localStorage),
      // Solo persistimos datos ligeros para evitar crash de RAM
      partialize: (state) => ({
        cedula: state.cedula,
        multas: state.multas,
        ocrRawText: state.ocrRawText,
      }),
    }
  )
);
