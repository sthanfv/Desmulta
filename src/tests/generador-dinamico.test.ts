import { describe, it, expect } from 'vitest';
import {
  sugerirTipoDocumento,
  DOCUMENT_TEMPLATES,
  DocumentType,
} from '../lib/legal/document-templates';
import { generateMandatePDF } from '../lib/legal/pdf-engine';

describe('Pruebas de Motor de Decisiones y Sugerencia de Documentos', () => {
  it('debe sugerir doble_prescripcion si tiene más de 3 años y está en coactivo', () => {
    const sugerencia = sugerirTipoDocumento('Más de 3 años', 'SÍ', 'C29');
    expect(sugerencia.tipo).toBe('doble_prescripcion');
    expect(sugerencia.razon).toContain('doble prescripción');
  });

  it('debe sugerir prescripcion_directa si tiene más de 3 años y no está en coactivo', () => {
    const sugerencia = sugerirTipoDocumento('Más de 3 años', 'NO', 'C29');
    expect(sugerencia.tipo).toBe('prescripcion_directa');
    expect(sugerencia.razon).toContain('prescripción directa');
  });

  it('debe sugerir nulidad_notificacion si es fotomulta (infracción por cámara)', () => {
    const sugerencia = sugerirTipoDocumento('Entre 1 y 3 años', 'NO', 'Cámara de velocidad C29');
    expect(sugerencia.tipo).toBe('nulidad_notificacion');
    expect(sugerencia.razon).toContain('nulidad por indebida notificación');
  });

  it('debe sugerir peticion_general para casos entre 1 y 3 años generales', () => {
    const sugerencia = sugerirTipoDocumento('Entre 1 y 3 años', 'NO', 'C29');
    expect(sugerencia.tipo).toBe('peticion_general');
  });
});

describe('Pruebas de Generación de PDF para todos los tipos de plantillas', () => {
  const basePayload = {
    infractorName: 'Ciudadano de Prueba',
    infractorId: '1090123456',
    operatorName: 'SISTEMA AUTOMATIZADO',
    operatorId: 'NIT 900.000.000-1',
    ticketNumber: '110010002233',
    licensePlate: 'TST123',
    shortId: 'TEST12',
    acceptedAt: new Date().toISOString(),
    citizenEmail: 'test@desmulta.online',
  };

  const plantillas: DocumentType[] = [
    'peticion_general',
    'prescripcion_directa',
    'doble_prescripcion',
    'nulidad_notificacion',
    'tutela_silencio',
  ];

  plantillas.forEach((tipo) => {
    it(`debe generar correctamente el PDF binario para la plantilla ${tipo}`, async () => {
      const payload = {
        ...basePayload,
        documentType: tipo,
      };

      const pdfBytes = await generateMandatePDF(payload);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);

      // Los archivos PDF válidos deben comenzar con la firma mágica %PDF- (bytes [37, 80, 68, 70, 45])
      expect(pdfBytes[0]).toBe(37); // %
      expect(pdfBytes[1]).toBe(80); // P
      expect(pdfBytes[2]).toBe(68); // D
      expect(pdfBytes[3]).toBe(70); // F
      expect(pdfBytes[4]).toBe(45); // -
    });
  });
});
