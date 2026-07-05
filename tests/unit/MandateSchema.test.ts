import { describe, it, expect } from 'vitest';
import { MandateSchema } from '../../src/lib/schemas';

/**
 * Unit Tests: Mandate Validation Rules — Desmulta v8.2.0
 * 
 * Este suite valida que las reglas condicionales de negocio basadas en la Ley 2213
 * se cumplan estrictamente a nivel de esquema, sin tocar la base de datos ni el DOM.
 */

describe('Mandate Validation Rules (Ley 2213 Compliance)', () => {
  const failingCases = [
    {
      citizenName: 'kz pro',
      citizenId: '1090458665',
      requiresOperatorFiling: true,
      email: '',
      caseId: 'EXP-177'
    }
  ];

  failingCases.forEach((caseData: any, i: number) => {
    it(`should fail if requiresOperatorFiling is true but email is missing (case ${i + 1})`, () => {
      const result = MandateSchema.safeParse(caseData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const emailError = result.error.issues.find(i => i.path.includes('email'));
        expect(emailError).toBeDefined();
        expect(emailError?.message).toContain('obligatorio');
      }
    });
  });

  it('should PASS if operator filing is TRUE and email is PROVIDED', () => {
    const validPayload = {
      citizenName: 'kz pro',
      citizenId: '1090458665',
      requiresOperatorFiling: true,
      email: 'fv9316@proton.me',
      caseId: 'EXP-177'
    };

    const result = MandateSchema.safeParse(validPayload);
    
    // Debe pasar la validación
    expect(result.success).toBe(true);
  });

  it('should PASS if operator filing is FALSE and email is MISSING', () => {
    const validPayload = {
      citizenName: 'kz pro',
      citizenId: '1090458665',
      requiresOperatorFiling: false,
      email: '',
      caseId: 'EXP-177'
    };

    const result = MandateSchema.safeParse(validPayload);
    
    // Debe pasar porque no requiere radicación por operador
    expect(result.success).toBe(true);
  });
});
