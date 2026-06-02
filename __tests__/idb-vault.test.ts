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

  it('debe serializar y guardar satisfactoriamente en IndexedDB', async () => {
    const payload = { placa: 'AAA123', contact: '3000000000' };
    await saveToVault(payload);
    
    expect(idb.set).toHaveBeenCalledWith(
      'desmulta_offline_payload',
      expect.objectContaining({ data: payload })
    );
  });

  it('debe detectar datos pendientes cuando el vault tiene contenido', async () => {
    vi.mocked(idb.get).mockResolvedValue({ data: { placa: 'BBB456' }, timestamp: Date.now() });
    
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
