import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { onCasoChanged, onConsultaChanged } from '../auditTriggers';

// Mocking
vi.mock('firebase-admin', () => {
  const addMock = vi.fn().mockResolvedValue({ id: 'mock-doc-id' });
  const serverTimestampMock = vi.fn().mockReturnValue('mocked-timestamp');
  
  const firestoreFn = () => ({
    collection: (col: string) => ({
      add: addMock,
    }),
  });
  
  firestoreFn.FieldValue = {
    serverTimestamp: serverTimestampMock,
  };

  return {
    firestore: firestoreFn,
  };
});

vi.mock('../telegram-utils', () => ({
  sendSecurityAlert: vi.fn().mockResolvedValue(undefined),
}));

import { sendSecurityAlert } from '../telegram-utils';

describe('Audit Triggers - Mejora A & C', () => {
  let dbMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock = admin.firestore().collection('audit_logs');
  });

  describe('onCasoChanged', () => {
    it('debe registrar un DELETE y enviar alerta por Telegram', async () => {
      // Simulamos que el documento fue eliminado (after no existe)
      const mockEvent = {
        params: { caseId: 'CASO-123' },
        data: {
          before: {
            exists: true,
            data: () => ({ _lastOperatorEmail: 'hacker@test.com' }),
          },
          after: {
            exists: false,
            data: () => undefined,
          },
        },
      } as any;

      // Llamamos al handler directamente (esto es posible en Firebase v2 si se extrae o casteando)
      // En functions/v2, el trigger retorna una función que podemos llamar con el evento
      const handler = (onCasoChanged as any).run || onCasoChanged;
      await handler(mockEvent);

      // Verificaciones
      expect(sendSecurityAlert).toHaveBeenCalledTimes(1);
      expect(sendSecurityAlert).toHaveBeenCalledWith(expect.stringContaining('CASO-123'));
      expect(sendSecurityAlert).toHaveBeenCalledWith(expect.stringContaining('hacker@test.com'));

      expect(dbMock.add).toHaveBeenCalledTimes(1);
      expect(dbMock.add).toHaveBeenCalledWith(expect.objectContaining({
        action: 'DELETE',
        adminEmail: 'hacker@test.com',
        resource: 'Case'
      }));
    });

    it('debe registrar un UPDATE sin enviar Telegram cuando cambia de estado', async () => {
      const mockEvent = {
        params: { caseId: 'CASO-123' },
        data: {
          before: {
            exists: true,
            data: () => ({ status: 'NUEVO' }),
          },
          after: {
            exists: true,
            data: () => ({ status: 'RADICADO', _lastOperatorEmail: 'admin@test.com' }),
          },
        },
      } as any;

      const handler = (onCasoChanged as any).run || onCasoChanged;
      await handler(mockEvent);

      expect(sendSecurityAlert).not.toHaveBeenCalled();
      expect(dbMock.add).toHaveBeenCalledTimes(1);
      expect(dbMock.add).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        adminEmail: 'admin@test.com',
        resource: 'CaseStatus'
      }));
    });
  });
});
