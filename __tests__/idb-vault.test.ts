import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveToVault, getFromVault, clearVault, hasPendingVaultData, saveDraftToVault, getDraftFromVault } from '@/lib/pwa/idb-vault';
import * as idb from 'idb-keyval';

// Mock del almacenamiento IndexedDB
vi.mock('idb-keyval', () => {
  const store: Record<string, any> = {};
  return {
    set: vi.fn(async (key: string, value: any) => {
      store[key] = value;
    }),
    get: vi.fn(async (key: string) => {
      return store[key];
    }),
    del: vi.fn(async (key: string) => {
      delete store[key];
    }),
  };
});

describe('Modulo Data Vault (H-9 — Cifrado AES-GCM Local)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('debe cifrar y guardar el payload completo en IndexedDB (sin filtrar PII)', async () => {
    const payload = { 
      placa: 'AAA123', 
      cedula: '123456789', 
      contact: '3000000000', 
      antiguedad: '1-5' 
    };

    // Guardar en el vault (esto internamente genera la llave en sessionStorage y cifra)
    await saveToVault(payload);

    // 1. Verificar que idb.set fue llamado
    expect(idb.set).toHaveBeenCalledTimes(1);

    // 2. Extraer los datos enviados a IndexedDB
    const savedCall = vi.mocked(idb.set).mock.calls[0];
    const keyUsed = savedCall[0];
    const payloadPersistido = savedCall[1];

    expect(keyUsed).toBe('desmulta_offline_payload');
    expect(payloadPersistido).toHaveProperty('timestamp');
    expect(payloadPersistido).toHaveProperty('data');
    
    // El payload debe contener la información cifrada (estructura iv y data)
    const encryptedData = payloadPersistido.data;
    expect(encryptedData).toHaveProperty('iv');
    expect(encryptedData).toHaveProperty('data');
    
    // Verificamos que no esté guardado en texto plano en IndexedDB
    expect(encryptedData).not.toHaveProperty('placa');
    expect(encryptedData).not.toHaveProperty('cedula');
  });

  it('debe poder recuperar y descifrar el payload original completo si la sesión está activa', async () => {
    const originalPayload = { 
      placa: 'AAA123', 
      cedula: '123456789', 
      contact: '3000000000', 
      antiguedad: '1-5' 
    };

    // Guardar
    await saveToVault(originalPayload);

    // Recuperar
    const result = await getFromVault();

    // Debe ser exactamente igual al original (descifrado correcto)
    expect(result).toBeDefined();
    expect(result?.data).toEqual(originalPayload);
  });

  it('debe fallar y retornar undefined si la llave de sessionStorage se pierde (Fail-Closed)', async () => {
    const originalPayload = { 
      placa: 'AAA123', 
      cedula: '123456789' 
    };

    // Guardar (crea la clave en sessionStorage)
    await saveToVault(originalPayload);

    // Borrar la llave de sessionStorage (simula cierre de pestaña o robo del archivo IDB por atacante)
    sessionStorage.clear();

    // Intentar recuperar
    const result = await getFromVault();

    // Como no hay llave, el descifrado falla y debe retornar undefined (protección PII)
    expect(result).toBeUndefined();

    // Además, debe limpiar el vault de datos huérfanos que ya no se pueden descifrar
    expect(idb.del).toHaveBeenCalledWith('desmulta_offline_payload');
  });

  it('debe funcionar el guardado y recuperación cifrada de borradores (Drafts)', async () => {
    const draftPayload = {
      nombre: 'Pedro Pérez',
      email: 'pedro@gmail.com',
      placa: 'XYZ789'
    };

    // Guardar borrador
    await saveDraftToVault(draftPayload);

    // Recuperar borrador
    const recovered = await getDraftFromVault();

    expect(recovered).toEqual(draftPayload);
  });
});
