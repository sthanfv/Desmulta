import { describe, it, expect, beforeEach } from 'vitest';
import { useExpedienteStore } from '../store/useExpedienteStore';

describe('🛒 Store de Expediente (Zustand)', () => {
  beforeEach(() => {
    useExpedienteStore.getState().clearExpediente();
  });

  it('Debe agregar multas y calcular la deuda total correctamente', () => {
    const store = useExpedienteStore.getState();
    
    store.addMulta({ id: '1', comparendo: '111', fecha: '2023', valor: 500000, estado: 'Cobro' });
    store.addMulta({ id: '2', comparendo: '222', fecha: '2024', valor: 350000, estado: 'Cobro' });

    const stateActualizado = useExpedienteStore.getState();
    expect(stateActualizado.multas.length).toBe(2);
    expect(stateActualizado.getTotalDeuda()).toBe(850000);
  });

  it('Debe eliminar una multa correctamente', () => {
    const store = useExpedienteStore.getState();
    store.addMulta({ id: '1', comparendo: '111', fecha: '2023', valor: 500000, estado: 'Cobro' });
    store.removeMulta('1');
    expect(useExpedienteStore.getState().multas.length).toBe(0);
  });

  it('Debe bloquear multas duplicadas (mismo comparendo)', () => {
    const store = useExpedienteStore.getState();
    
    store.addMulta({ id: '1', comparendo: '999', fecha: '2023', valor: 500000, estado: 'Cobro' });
    store.addMulta({ id: '2', comparendo: '999', fecha: '2023', valor: 500000, estado: 'Cobro' });

    expect(useExpedienteStore.getState().multas.length).toBe(1);
  });
});
