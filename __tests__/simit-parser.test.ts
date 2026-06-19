import { describe, it, expect } from 'vitest';
import { extraerMultasDeTexto } from '@/lib/simit-parser';

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
    // debe tomar la primera fecha de todas formas (fail-safe).
    const texto = 'COMPARENDO: 111111111111111\nRESOLUCION DEL 10/10/2018\nNOTIFICADO EL 15/05/2020';
    const multas = extraerMultasDeTexto(texto);

    expect(multas).toHaveLength(1);
    expect(multas[0].comparendo).toBe('111111111111111');
    expect(multas[0].fecha).toBe('10/10/2018'); // Fallback a la primera detectada
  });
});
