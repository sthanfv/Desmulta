import { describe, it, expect } from 'vitest';
import { generateMandatePDF } from '../../src/lib/legal/pdf-engine';
import { DocumentType } from '../../src/lib/legal/document-templates';

describe('Motor de PDF (pdf-engine.ts)', () => {
  it('Debe generar un PDF válido con el estándar legal sin errores de fuentes o medición', async () => {
    const payload = {
      infractorName: 'Usuario de Pruebas',
      infractorId: '1090123456',
      licensePlate: 'TST999',
      shortId: 'T-000001',
      ciudadEmision: 'Bogotá D.C.',
      autoridadTransito: 'Secretaría de Tránsito',
      direccionNotificacion: 'Calle de pruebas # 1-2',
      documentType: 'peticion_general' as DocumentType,
      operatorName: 'SISTEMA AUTOMATIZADO CI',
      operatorId: 'NIT 000.000.000-0',
      acceptedAt: new Date().toISOString(),
      ticketNumber: '',
    };

    // La función debe retornar exitosamente y no tirar errores de "ShadowRoot" o "WinAnsiEncoding"
    const pdfBytes = await generateMandatePDF(payload);
    
    // Validar que el buffer es correcto
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    
    // Un PDF generado con fuentes incrustadas pesará varios kilobytes
    expect(pdfBytes.length).toBeGreaterThan(2000); 
    
    // Los primeros bytes de un PDF estándar siempre son "%PDF"
    const header = new TextDecoder().decode(pdfBytes.slice(0, 4));
    expect(header).toBe('%PDF');
  });
});
