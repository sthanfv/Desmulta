import { describe, it, expect } from 'vitest';
import { STATUS_TEMPLATES } from '../lib/notifications/notification-dispatcher';
import { buildStatusChangeEmail } from '../lib/email-templates';

describe('Notificaciones con Toque Humano (Notas de Operador)', () => {
  const note = 'Esta es una nota personalizada del especialista.';
  const caseId = 'CASE-12345';

  describe('Notificaciones Push', () => {
    it('Debe incluir la nota del operador en todos los estados definidos', () => {
      // Obtenemos todos los estados configurados en el objeto STATUS_TEMPLATES
      const statuses = Object.keys(STATUS_TEMPLATES);

      expect(statuses.length).toBeGreaterThan(0);

      statuses.forEach((status) => {
        const templateFn = STATUS_TEMPLATES[status as keyof typeof STATUS_TEMPLATES];

        // Generar notificación sin nota
        const pushWithoutNote = templateFn(caseId);
        expect(pushWithoutNote.body).not.toContain('💬 Nota:');
        expect(pushWithoutNote.body).not.toContain(note);

        // Generar notificación con nota
        const pushWithNote = templateFn(caseId, note);
        expect(pushWithNote.body).toContain('💬 Nota:');
        expect(pushWithNote.body).toContain(note);
      });
    });
  });

  describe('Notificaciones por Correo Electrónico', () => {
    it('Debe incluir la nota del operador en el HTML del correo si se proporciona', () => {
      const emailWithoutNote = buildStatusChangeEmail(
        'Juan Perez',
        'En Estudio',
        'Estamos analizando tu caso.'
      );
      expect(emailWithoutNote).not.toContain('Mensaje de tu asesor:');
      expect(emailWithoutNote).not.toContain(note);

      const emailWithNote = buildStatusChangeEmail(
        'Juan Perez',
        'En Estudio',
        'Estamos analizando tu caso.',
        note
      );
      expect(emailWithNote).toContain('Mensaje de tu asesor:');
      expect(emailWithNote).toContain(note);
      expect(emailWithNote).toContain('font-style: italic'); // Verifica que se aplican estilos
    });
  });
});
