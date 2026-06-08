import { z } from 'zod';

/**
 * Esquemas de Validación Centralizados — Desmulta v8.4.0
 *
 * Este archivo centraliza las reglas de negocio críticas para asegurar la
 * integridad de los datos antes de su procesamiento legal o persistencia.
 */

// Enum de estados legales para semaforización
export const LegalStatusEnum = z.enum([
  'PRESCRITO',
  'CADUCADO',
  'IMPUGNABLE_C038',
  'VIGENTE',
  'REQUIERE_REVISION',
  'DESCONOCIDO',
]);

/**
 * OCRAnalysisSchema - Esquema para el resultado del análisis OCR y motor legal.
 */
export const OCRAnalysisSchema = z.object({
  hasSimitFormat: z.boolean().default(false),
  isViable: z.boolean(),
  status: LegalStatusEnum,
  confidenceScore: z.number().min(0).max(100),
  detectedDates: z.array(z.string()).default([]),
  technicalDictum: z.string(),
  infractionCode: z.string().optional(),
  rawText: z.string().optional(),
  extractedName: z.string().optional(),
  extractedId: z.string().optional(),
  lowConfidence: z.boolean().optional(),
});

/**
 * ConsultationSchemaBase — objeto puro sin superRefine.
 */
export const ConsultationSchemaBase = z.object({
  cedula: z
    .string()
    .min(5, { message: 'La cédula debe tener al menos 5 caracteres.' })
    .max(20, { message: 'La cédula no puede tener más de 20 caracteres.' })
    .regex(/^[0-9]+$/, { message: 'La cédula solo debe contener números.' })
    .trim(),
  placa: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => val === '' || /^[A-Z]{3}[0-9]{2}[0-9A-Z]$/.test(val), {
      message: 'Placa inválida (Formato: AAA123 o AAA12A).',
    })
    .optional(),
  nombre: z
    .string()
    .trim()
    .min(3, { message: 'El nombre es requerido.' })
    .max(60, { message: 'El nombre no puede tener más de 60 caracteres.' })
    .transform((val) => val.replace(/[<>]/g, '')),
  contacto: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(
      z.string().regex(/^3[0-9]{9}$/, {
        message: 'Debe ser un número de celular colombiano válido (10 dígitos, ej: 300 123 4567).',
      })
    ),
  email: z.string().email({ message: 'Correo electrónico inválido.' }).optional().or(z.literal('')),
  requiresOperatorFiling: z.boolean().default(false),
  aceptoTerminos: z.boolean().refine((value) => value === true, {
    message: 'Debe aceptar los términos y condiciones.',
  }),
  websiteHoneypot: z.string().optional(),
  authorUid: z.string().optional(),
  antiguedad: z.string().min(1, { message: 'Seleccione la antigüedad de la multa.' }),
  tipoInfraccion: z.string().min(1, { message: 'Seleccione el tipo de infracción.' }),
  estadoCoactivo: z.string().min(1, { message: 'Seleccione si el caso está en cobro coactivo.' }),
  evidenceUrl: z.string().url().optional().or(z.literal('')),
  ciudad: z.string().optional().or(z.literal('')),
  cfToken: z.string().optional(),
  ocrData: OCRAnalysisSchema.optional(),
});

/**
 * ConsultationSchema — esquema principal con validación condicional.
 */
export const ConsultationSchema = ConsultationSchemaBase.superRefine((val, ctx) => {
  if (val.requiresOperatorFiling && !val.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'El correo electrónico es estrictamente requerido para el flujo de radicación por operador.',
      path: ['email'],
    });
  }
});

// Schema simplificado para flujo SIMIT Tutorial
export const SimitCaptureSchema = z.object({
  contacto: z
    .string()
    .transform((v) => v.replace(/\s+/g, ''))
    .pipe(
      z.string().regex(/^3[0-9]{9}$/, {
        message: 'Debe ser un número de celular colombiano válido (10 dígitos, ej: 300 123 4567).',
      })
    ),
  evidenceUrl: z.string().url({ message: 'Debe subir una captura de pantalla del SIMIT.' }),
  aceptoTerminos: z.boolean().refine((value) => value === true, {
    message: 'Debe aceptar los términos y condiciones.',
  }),
  websiteHoneypot: z.string().optional(),
  authorUid: z.string().optional(),
  cfToken: z.string().optional(),
  ocrData: OCRAnalysisSchema.optional(),
});

/**
 * MandateSchema
 * Valida la información necesaria para el Poder Legal (Mandato).
 *
 * REGLA DE NEGOCIO:
 * Si 'requiresOperatorFiling' es verdadero, el campo 'email' es OBLIGATORIO
 * para cumplir con los protocolos de notificación de la Ley 2213.
 */
export const MandateSchema = z
  .object({
    citizenName: z.string().min(3, 'El nombre debe ser válido'),
    citizenId: z.string().min(5, 'El documento de identidad es inválido'),
    requiresOperatorFiling: z.boolean(),
    email: z.string().email('Correo electrónico inválido').or(z.literal('')),
    caseId: z.string().min(1, 'El ID del caso es obligatorio'),
  })
  .superRefine(
    (data: { requiresOperatorFiling: boolean; email?: string | null }, ctx: z.RefinementCtx) => {
      // Validación condicional: Ley 2213
      if (data.requiresOperatorFiling && (!data.email || data.email.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El correo electrónico es obligatorio para radicación por operador (Ley 2213)',
          path: ['email'],
        });
      }
    }
  );

export type MandateInput = z.infer<typeof MandateSchema>;

/**
 * Esquema para Leads capturados directamente desde la Calculadora (SavingsCalculator)
 */
export const SimitLeadSchema = z.object({
  tipo: z.literal('SIMIT_LEAD').optional(),
  probability: z.string().optional(),
  contacto: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(
      z.string().regex(/^3[0-9]{9}$/, {
        message: 'Debe ser un número de celular colombiano válido (10 dígitos, ej: 300 123 4567).',
      })
    ),
  nombre: z.string().optional(),
  website_hp: z.string().optional(),
  deuda_total: z.number().optional(),
  ahorro_potencial: z.number().optional(),
});
