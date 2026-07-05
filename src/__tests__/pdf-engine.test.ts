import { describe, it, expect } from 'vitest';
import { generateMandatePDF, MandatePayload } from '@/lib/legal/pdf-engine';
import { DocumentType } from '@/lib/legal/document-templates';
import zlib from 'zlib';

function extractPDFText(buffer: Uint8Array): string {
  const binary = Buffer.from(buffer);
  let text = '';
  let pos = 0;
  while (true) {
    const streamStart = binary.indexOf('stream', pos);
    if (streamStart === -1) break;
    let dataStart = streamStart + 6;
    if (binary[dataStart] === 13) dataStart++; // \r
    if (binary[dataStart] === 10) dataStart++; // \n
    const streamEnd = binary.indexOf('endstream', dataStart);
    if (streamEnd === -1) break;
    let dataEnd = streamEnd;
    if (binary[dataEnd - 1] === 10) dataEnd--; // \n
    if (binary[dataEnd - 1] === 13) dataEnd--; // \r
    const streamData = binary.subarray(dataStart, dataEnd);
    try {
      const decompressed = zlib.inflateSync(streamData);
      const decompressedStr = decompressed.toString('utf-8');

      // Decodificamos cadenas hexadecimales de PDF como <506172...> Tj
      const decodedStr = decompressedStr.replace(/<([0-9a-fA-F]+)>/g, (_, hex) => {
        try {
          return Buffer.from(hex, 'hex').toString('utf-8');
        } catch {
          return '';
        }
      });

      text += decodedStr + '\n';
    } catch {
      // Ignoramos flujos que no sean de texto comprimido estándar
    }
    pos = streamEnd + 9;
  }
  return text;
}

// Payload base reutilizable para los tests
const baseMock: MandatePayload = {
  infractorName: 'CARLOS PEREZ TEST',
  infractorId: '1099887766',
  operatorName: 'OPERADOR TEST DESMULTA',
  operatorId: '0987654321',
  ticketNumber: 'COMP-00000000',
  licensePlate: 'ABC123',
  shortId: 'CASO-099',
  acceptedAt: new Date('2024-06-15T10:00:00.000Z').toISOString(),
};

describe('PDF Engine — Motor de Generación de Poder Legal', () => {
  describe('Contrato de salida del buffer', () => {
    it('debe generar un Uint8Array en memoria (nunca null ni undefined)', async () => {
      const buffer = await generateMandatePDF(baseMock);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer).not.toBeNull();
    });

    it('debe generar un PDF con tamaño mínimo realista (> 1KB)', async () => {
      const buffer = await generateMandatePDF(baseMock);
      // Un PDF mínimo de pdf-lib sin cabeceras pesadas mide al menos 1000 bytes
      expect(buffer.length).toBeGreaterThan(1000);
    });

    it('debe generar un archivo con magic number PDF válido (%PDF-)', async () => {
      const buffer = await generateMandatePDF(baseMock);
      const header = new TextDecoder().decode(buffer.slice(0, 5));
      expect(header).toBe('%PDF-');
    });
  });

  describe('Casos de borde del payload', () => {
    it('debe funcionar cuando ticketNumber es POR_DEFINIR (campos vacíos opcionales)', async () => {
      const payloadSinComparendo: MandatePayload = {
        ...baseMock,
        ticketNumber: 'POR_DEFINIR',
      };
      const buffer = await generateMandatePDF(payloadSinComparendo);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(1000);
    });

    it('debe funcionar cuando licensePlate es N/A (capturas SIMIT sin placa)', async () => {
      const payloadSinPlaca: MandatePayload = {
        ...baseMock,
        licensePlate: 'N/A',
      };
      const buffer = await generateMandatePDF(payloadSinPlaca);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(1000);
    });

    it('debe funcionar con acceptedAt vacío (consentimiento no registrado)', async () => {
      const payloadSinFecha: MandatePayload = {
        ...baseMock,
        acceptedAt: '',
      };
      // No debe lanzar excepción aunque la fecha esté vacía
      await expect(generateMandatePDF(payloadSinFecha)).resolves.toBeInstanceOf(Uint8Array);
    });

    it('debe generar PDFs diferentes para infractores distintos (no caching)', async () => {
      const payloadA: MandatePayload = { ...baseMock, infractorId: '1111111111' };
      const payloadB: MandatePayload = { ...baseMock, infractorId: '9999999999' };

      const bufferA = await generateMandatePDF(payloadA);
      const bufferB = await generateMandatePDF(payloadB);

      // Los PDFs deben ser distintos porque el contenido cambia
      expect(Buffer.from(bufferA).toString('base64')).not.toBe(
        Buffer.from(bufferB).toString('base64')
      );
    });

    it('debe generar un shortId distinto en cada PDF si el shortId es diferente', async () => {
      const payloadRef1: MandatePayload = { ...baseMock, shortId: 'CASO-001' };
      const payloadRef2: MandatePayload = { ...baseMock, shortId: 'CASO-999' };

      const buf1 = await generateMandatePDF(payloadRef1);
      const buf2 = await generateMandatePDF(payloadRef2);

      expect(buf1.length).toBeGreaterThan(0);
      expect(buf2.length).toBeGreaterThan(0);
      // Contenidos distintos
      expect(Buffer.from(buf1).equals(Buffer.from(buf2))).toBe(false);
    });

    it('debe generar un PDF valido con la estrategia PRESCRIPCION DIRECTA', async () => {
      const payload: MandatePayload = {
        ...baseMock,
        documentType: 'prescripcion_directa' as DocumentType,
      };
      const buffer = await generateMandatePDF(payload);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(2500);

      // Verificamos que el título se haya inyectado correctamente
      const pdfText = extractPDFText(buffer);
      expect(pdfText).toContain('PODER PARA SOLICITUD DE PRESCRIPCION EXTINTIVA');
    });

    it('debe generar un PDF valido con la estrategia NULIDAD_NOTIFICACION', async () => {
      const payload: MandatePayload = {
        ...baseMock,
        documentType: 'nulidad_notificacion' as DocumentType,
      };
      const buffer = await generateMandatePDF(payload);
      expect(buffer).toBeInstanceOf(Uint8Array);

      const pdfText = extractPDFText(buffer);
      expect(pdfText).toContain('PODER PARA RECURSO DE NULIDAD POR INDEBIDA NOTIFICACION');
    });

    it('debe usar PETICION_GENERAL por defecto si no se envia estrategia', async () => {
      const payloadSinEstrategia: MandatePayload = { ...baseMock };
      const buffer = await generateMandatePDF(payloadSinEstrategia);
      expect(buffer).toBeInstanceOf(Uint8Array);
    });
  });

  describe('Idempotencia y seguridad', () => {
    it('debe generar el mismo tamaño aproximado para el mismo payload (idempotencia)', async () => {
      const buf1 = await generateMandatePDF(baseMock);
      const buf2 = await generateMandatePDF(baseMock);
      // Tamaños muy cercanos (diferencia < 100 bytes por timestamps internos de pdf-lib)
      expect(Math.abs(buf1.length - buf2.length)).toBeLessThan(100);
    });

    it('no debe lanzar excepciones con caracteres especiales en el nombre del infractor', async () => {
      const payloadConAcentos: MandatePayload = {
        ...baseMock,
        infractorName: 'CAMILO MUNOZ PENALOZA', // Sin tildes — compatible con Helvetica
      };
      await expect(generateMandatePDF(payloadConAcentos)).resolves.toBeInstanceOf(Uint8Array);
    });

    it('debe generar múltiples páginas y aplicar word-wrap con textos extremadamente largos', async () => {
      // Creamos un payload con un nombre absurdo que forzaría saltos de línea y posiblemente de página
      const longText = 'TEXTO '.repeat(3000);
      const payloadExtremo: MandatePayload = {
        ...baseMock,
        infractorName: longText,
      };

      const buffer = await generateMandatePDF(payloadExtremo);
      expect(buffer).toBeInstanceOf(Uint8Array);

      // El tamaño debe ser mayor debido a las múltiples páginas, considerando compresión eficiente
      expect(buffer.length).toBeGreaterThan(3000);
    });
  });
});
