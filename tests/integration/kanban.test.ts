import { describe, it, expect, beforeAll, vi } from 'vitest';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { testDb } from '../setup/firebase.mock';
import { convertToCase } from '../../src/app/admin/actions';

// Mock de FieldValue de Admin SDK para compatibilidad con Client SDK en el emulador
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({}),
  Timestamp: {
    fromDate: (date: Date) => date,
  },
  FieldValue: {
    serverTimestamp: () => serverTimestamp(),
    arrayUnion: (...args: unknown[]) => args,
  },
}));

/**
 * Kanban Firestore Integration Test — Desmulta v8.3.0
 * 
 * Este test verifica una de las rutas críticas del CRM Administrativo:
 * La conversión de un Lead (Consulta) en un Caso Administrativo.
 * 
 * Utiliza el Firebase Local Emulator Suite para asegurar atomicidad y 
 * transiciones de estado correctas sin afectar producción.
 */

describe('Kanban Firestore Integration (Transition Pipeline)', () => {
  const testLeadId = 'lead_test_001';

  beforeAll(async () => {
    // Poblar el emulador con datos iniciales (Seed)
    // Utilizamos setDoc del SDK de Cliente ya que testDb está configurado así en el mock
    await setDoc(doc(testDb, 'consultations', testLeadId), {
      status: 'estudio',
      tipo: 'lead',
      cedula: '12345',
      nombre: 'Test Case User',
      contacto: '3000000000',
      createdAt: new Date(),
    });
  });

  it('should transition lead to cases collection upon conversion', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockLeadData: any = {  
      id: testLeadId, 
      tipo: 'lead',
      cedula: '12345',
      nombre: 'Test Case User',
      contacto: '3000000000'
    };
    
    // Ejecutar la lógica de negocio contra el emulador
    // Pasamos un token dummy y el dbOverride que apunta al emulador
    const result = await convertToCase('TEST_MODE_TOKEN', mockLeadData, 'APERTURA', {
      // Mock parcial del Admin SDK para que funcione con el Client SDK del emulador
      collection: (name: string) => ({
        doc: (id: string) => {
          const docRef = doc(testDb, name, id);
          return {
            get: () => getDoc(docRef),
            set: (data: Record<string, unknown>) => setDoc(docRef, data),
            update: (data: Record<string, unknown>) => setDoc(docRef, data, { merge: true }),
          };
        }
      }),
      runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => {
        const transaction = {
          get: (ref: { get: () => unknown }) => ref.get(),
          set: (ref: { set: (d: unknown) => unknown }, data: unknown) => ref.set(data),
          update: (ref: { update: (d: unknown) => unknown }, data: unknown) => ref.update(data),
        };
        try {
          return await callback(transaction);
        } catch (e) {
          console.error('[Transaction Mock Error]:', e);
          throw e;
        }
      }
    } as unknown as any);

    if (!result.success) {
      console.error('[convertToCase FAIL]:', result.error);
    }
    expect(result.success).toBe(true);

    // 🔍 Aserción 1: El documento debe existir en la colección 'cases'
    const caseDoc = await getDoc(doc(testDb, 'cases', result.caseId!));
    expect(caseDoc.exists()).toBe(true);
    expect(caseDoc.data()?.status).toBe('APERTURA');
    expect(caseDoc.data()?.cedula).toBe('12345');

    // 🔍 Aserción 2: El documento original debe haber cambiado su estado a 'en_proceso'
    const leadDoc = await getDoc(doc(testDb, 'consultations', testLeadId));
    expect(leadDoc.exists()).toBe(true);
    expect(leadDoc.data()?.status).toBe('en_proceso');
  });
});
