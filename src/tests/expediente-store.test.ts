import { describe, it, expect, beforeEach } from 'vitest';
import { useExpedienteStore } from '../store/useExpedienteStore';

describe('🛒 Store de Expediente (Zustand Client-Side)', () => {
  // Limpiamos la memoria antes de cada prueba para que no haya datos basura
  beforeEach(() => {
    useExpedienteStore.getState().clearExpediente();
  });

  it('Debe iniciar con un expediente completamente vacío', () => {
    const state = useExpedienteStore.getState();
    expect(state.multas.length).toBe(0);
    expect(state.getTotalDeuda()).toBe(0);
  });

  it('Debe agregar multas correctamente y calcular el total de la deuda', () => {
    const { addMulta } = useExpedienteStore.getState();

    addMulta({ id: '1', comparendo: '12345', fecha: '2023', valor: 500000, estado: 'Cobro' });
    addMulta({ id: '2', comparendo: '67890', fecha: '2024', valor: 350000, estado: 'Cobro' });

    const stateActualizado = useExpedienteStore.getState();
    expect(stateActualizado.multas.length).toBe(2);
    // 500,000 + 350,000 = 850,000
    expect(stateActualizado.getTotalDeuda()).toBe(850000);
  });

  it('Escudo FinOps: Debe bloquear multas duplicadas basadas en el número de comparendo', () => {
    const { addMulta } = useExpedienteStore.getState();

    // El usuario agrega la multa
    addMulta({ id: '1', comparendo: '99999', fecha: '2023', valor: 500000, estado: 'Cobro' });

    // El usuario se equivoca e intenta agregar LA MISMA multa de nuevo
    addMulta({ id: '2', comparendo: '99999', fecha: '2023', valor: 500000, estado: 'Cobro' });

    const stateActualizado = useExpedienteStore.getState();

    // El escudo debió bloquear la segunda. Solo debe existir 1 en el array.
    expect(stateActualizado.multas.length).toBe(1);
    expect(stateActualizado.getTotalDeuda()).toBe(500000);
  });
});
