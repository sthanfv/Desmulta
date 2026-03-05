import { z } from 'zod';

export const ConsultationSchema = z.object({
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
    .transform((val) => val.replace(/[<>]/g, '')), // Sanitización básica XSS
  contacto: z
    .string()
    .transform((v) => v.replace(/\D/g, '')) // Solo números
    .pipe(
      z.string().regex(/^3[0-9]{9}$/, {
        message: 'Debe ser un número de celular colombiano válido (10 dígitos, ej: 300 123 4567).',
      })
    ),
  email: z.string().email({ message: 'Correo electrónico inválido.' }).optional().or(z.literal('')),
  aceptoTerminos: z.boolean().refine((value) => value === true, {
    message: 'Debe aceptar los términos y condiciones.',
  }),
  _tramp_field: z.string().max(0, { message: 'Bot detected' }).optional(),
  authorUid: z.string().optional(),
  antiguedad: z.string().min(1, { message: 'Seleccione la antigüedad de la multa.' }),
  tipoInfraccion: z.string().min(1, { message: 'Seleccione el tipo de infracción.' }),
  estadoCoactivo: z.string().min(1, { message: 'Seleccione si el caso está en cobro coactivo.' }),
  evidenceUrl: z.string().url().optional().or(z.literal('')),
});

// Schema simplificado para flujo SIMIT Tutorial (captura de pantalla ya contiene cédula)
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
  _tramp_field: z.string().max(0, { message: 'Bot detected' }).optional(),
  authorUid: z.string().optional(),
});

// This type is no longer used for the client-side form, but can be kept for reference
export type ConsultationFormState = {
  message?: string | null;
  errors?: {
    cedula?: string[];
    nombre?: string[];
    contacto?: string[];
    placa?: string[];
    aceptoTerminos?: string[];
    website?: string[];
  };
  success: boolean;
};

export interface Consultation {
  id: string;
  cedula: string;
  placa: string;
  nombre: string;
  contacto: string;
  email?: string;
  aceptoTerminos: boolean;
  authorUid: string;
  antiguedad: string;
  tipoInfraccion: string;
  estadoCoactivo: string;
  fechaMulta?: string;
  status: 'pendiente' | 'contactado' | 'en_proceso' | 'terminado';
  fuente: 'web' | 'manual' | 'simit_capture';
  shortId?: string;
  createdAt: string;
  telegramStatus: 'pending' | 'sent' | 'failed';
  notifiedAt?: string;
}

export type CaseStatus =
  | 'apertura'
  | 'documentacion'
  | 'tramite'
  | 'resolucion'
  | 'finalizado'
  | 'archivo';

export interface CaseHistoryEvent {
  date: string;
  description: string;
  type: 'status_change' | 'note' | 'document_added' | 'system';
}

export interface Case {
  id: string;
  consultationId: string;
  cedula: string;
  placa: string;
  nombre: string;
  contacto: string;
  status: CaseStatus;
  history: CaseHistoryEvent[];
  documents: Array<{
    name: string;
    url: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
