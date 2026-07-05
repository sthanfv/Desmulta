import { describe, it, expect } from 'vitest';
import { extraerMultasDeTexto, extraerCodigoInfraccion, extraerCodigosInfraccion } from '@/lib/simit-parser';

describe('SIMIT Parser — Extraer multas y desambiguar fechas', () => {
  it('debe extraer correctamente una multa con una sola fecha', () => {
    const texto = 'COMPARENDO: 123456789012345 FECHA: 15/05/2024 VALOR: $712.000 ESTADO: Pendiente';
    const multas = extraerMultasDeTexto(texto);

    expect(multas).toHaveLength(1);
    expect(multas[0].comparendo).toBe('123456789012345');
    expect(multas[0].fecha).toBe('15/05/2024');
    expect(multas[0].valor).toBe(712000);
  });

  it('debe desambiguar la fecha cuando se tiene una fecha de resolución en el bloque', () => {
    // El comparendo tiene dos fechas: '15/05/2024' (infracción) y '10/10/2018' (resolución).
    // '10/10/2018' está cerca del término 'RESOLUCION', por lo que debe excluirse.
    const texto = 'COMPARENDO: 987654321098765\nFECHA COMP: 15/05/2024\nRESOLUCION NRO 45 DEL 10/10/2018\nVALOR: 712000';
    const multas = extraerMultasDeTexto(texto);

    expect(multas).toHaveLength(1);
    expect(multas[0].comparendo).toBe('987654321098765');
    expect(multas[0].fecha).toBe('15/05/2024'); // La de resolución '10/10/2018' fue descartada.
  });

  it('debe aplicar fail-safe si todas las fechas del bloque están marcadas como exclusión', () => {
    // Si todas las fechas están cerca de palabras excluidas (ej. caso anómalo),
    // debe tomar la primera fecha de todas forman (fail-safe).
    const texto = 'COMPARENDO: 111111111111111\nRESOLUCION DEL 10/10/2018\nNOTIFICADO EL 15/05/2020';
    const multas = extraerMultasDeTexto(texto);

    expect(multas).toHaveLength(1);
    expect(multas[0].comparendo).toBe('111111111111111');
    expect(multas[0].fecha).toBe('10/10/2018'); // Fallback a la primera detectada
  });
});

describe('SIMIT Parser — Extracción de Códigos de Infracción CNT', () => {
  it('debe extraer código con formato estándar de forma singular y múltiple', () => {
    const texto = 'COMPARENDO DE INFRACCION: C29 CON VALOR A PAGAR';
    expect(extraerCodigoInfraccion(texto)).toBe('C29');
    expect(extraerCodigosInfraccion(texto)).toEqual(['C29']);
  });

  it('debe ignorar códigos pegados a letras (sin word boundary) para prevenir falsos positivos (ej. SERVICIO -> C10)', () => {
    // ARTICULOC24 es extraído por regexContextual (ya que ARTICULO es palabra clave).
    // CucutaC35 NO es extraído por regexContextual (hay texto entre CODIGO y C35),
    // y tampoco por regexAislado porque carece de word boundary (\b).
    const texto = 'CODIGO CucutaC35 Los Patios ARTICULOC24 fotomulta';
    expect(extraerCodigoInfraccion(texto)).toBe('C24'); 
    expect(extraerCodigosInfraccion(texto)).toEqual(['C24']); 
  });

  it('debe extraer códigos pegados a caracteres especiales o puntuación (como puntos suspensivos)', () => {
    const texto = 'Multa por INFRACCION C24... Fotodetección en Cúcuta CODIGO D04...';
    expect(extraerCodigoInfraccion(texto)).toBe('C24');
    expect(extraerCodigosInfraccion(texto)).toEqual(['C24', 'D04']);
  });

  it('debe tolerar espacios opcionales introducidos por el OCR entre la letra y los dígitos', () => {
    const texto = 'Infracción: C 24 y multa por CODIGO C02';
    expect(extraerCodigoInfraccion(texto)).toBe('C24');
    expect(extraerCodigosInfraccion(texto)).toEqual(['C24', 'C02']);
  });

  it('debe omitir falsos positivos dentro de números largos (placas, identificaciones, comparendos)', () => {
    const texto = 'PLACA SKB49C COMPARENDO 54405000000053726131 CEDULA 1090513302';
    // No debe capturar "49C" ni porciones del comparendo o cédula
    expect(extraerCodigoInfraccion(texto)).toBeNull();
    expect(extraerCodigosInfraccion(texto)).toEqual([]);
  });
});
