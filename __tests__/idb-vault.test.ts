import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveToVault, getFromVault, clearVault, hasPendingVaultData } from '@/lib/pwa/idb-vault';
import * as idb from 'idb-keyval';

vi.mock('idb-keyval', () => ({
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}));

describe('Modulo Data Vault (PWA Offline Resiliency)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe guardar en IndexedDB filtrando los campos PII del payload (Hallazgo 1 — Auditoría Manus AI)', async () => {
    // 'placa' y 'cedula' son campos PII y deben ser filtrados antes de persistirse en IndexedDB
    // Solo los campos no-sensibles como 'contact', 'antiguedad', 'tipoInfraccion' se persisten
    const payload = { placa: 'AAA123', cedula: '123456789', contact: '3000000000', antiguedad: '1-5' };
    await saveToVault(payload);

    // Verificar que idb.set fue llamado SIN los campos PII (placa, cedula eliminados)
    expect(idb.set).toHaveBeenCalledWith(
      'desmulta_offline_payload',
      expect.objectContaining({
        data: { contact: '3000000000', antiguedad: '1-5' }, // PII excluida
      })
    );
    // Verificar que los campos PII NO están en el payload guardado
    const savedCall = vi.mocked(idb.set).mock.calls[0][1] as { data: Record<string, unknown> };
    expect(savedCall.data).not.toHaveProperty('placa');
    expect(savedCall.data).not.toHaveProperty('cedula');
  });

  it('debe detectar datos pendientes cuando el vault tiene contenido', async () => {
    vi.mocked(idb.get).mockResolvedValue({ data: { antiguedad: '1-5' }, timestamp: Date.now() });
    
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

    const result = await hasPendingVaultData();
    expect(result).toBe(true);
    expect(idb.get).toHaveBeenCalledWith('desmulta_offline_payload');
  });

  it('debe retornar false si el vault está vacío', async () => {
    vi.mocked(idb.get).mockResolvedValue(undefined);
    
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

    const result = await hasPendingVaultData();
    expect(result).toBe(false);
  });
});
