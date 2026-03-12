import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setCedula: (cedula: string) => void;
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
      setCedula: (cedula) => set({ cedula }),
      addMulta: (multa) => 
        set((state) => {
          if (state.multas.some(m => m.comparendo === multa.comparendo)) return state;
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
      removeMulta: (id) => 
        set((state) => ({ multas: state.multas.filter(m => m.id !== id) })),
      getTotalDeuda: () => get().multas.reduce((total, multa) => total + multa.valor, 0),
      clearExpediente: () => set({ cedula: null, multas: [] }),
    }),
    {
      name: 'desmulta-expediente-storage',
    }
  )
);
