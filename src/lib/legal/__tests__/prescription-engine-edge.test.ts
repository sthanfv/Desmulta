import { describe, it, expect } from 'vitest';
import { PrescriptionEngine } from '../prescription-engine';

describe('PrescriptionEngine Edge Cases (C-038 & Calidad OCR)', () => {
  it('debe retornar REQUIERE_REVISION si el confidenceScore es menor al umbral y no ha prescrito matemáticamente', () => {
    // Generamos una fecha de hace 2 años (no prescrito matemáticamente, que son >3)
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    const day = String(oldDate.getDate()).padStart(2, '0');
    const month = String(oldDate.getMonth() + 1).padStart(2, '0');
    const year = oldDate.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    // Simulamos un OCR con baja confianza (por debajo del umbral típico de 60-70)
    const result = PrescriptionEngine.evaluate('FOTOMULTA SIN RESOLUCION', [dateStr], 40);
    
    expect(result.status).toBe('REQUIERE_REVISION');
    expect(result.lowConfidence).toBe(true);
    expect(result.isViable).toBe(false);
  });

  it('debe retornar PRESCRITO matemáticamente sin importar la baja confianza del OCR', () => {
    // Generamos una fecha de hace 4 años (prescrito matemáticamente)
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 4);
    const day = String(oldDate.getDate()).padStart(2, '0');
    const month = String(oldDate.getMonth() + 1).padStart(2, '0');
    const year = oldDate.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    // La confianza matemática de prescripción antecede al filtro de OCR (confianza bajísima)
    const result = PrescriptionEngine.evaluate('TEXTO ILEGIBLE', [dateStr], 10);
    
    expect(result.status).toBe('PRESCRITO');
    expect(result.isViable).toBe(true);
  });
});
