import { z } from 'zod';

export const ConsultationSchema = z.object({
  cedula: z
    .string()
    .min(5, { message: 'La cédula debe tener al menos 5 caracteres.' })
    .max(20, { message: 'La cédula no puede tener más de 20 caracteres.' })
    .regex(/^[0-9]+$/, { message: 'La cédula solo debe contener números.' }),
  nombre: z
    .string()
    .trim()
    .min(3, { message: 'El nombre es requerido.' })
    .max(60, { message: 'El nombre no puede tener más de 60 caracteres.' }),
  contacto: z
    .string()
    .transform((v) => v.replace(/\s+/g, ''))
    .pipe(
      z.string().regex(/^3[0-9]{9}$/, {
        message: 'Debe ser un número de celular colombiano válido (10 dígitos, ej: 300 123 4567).',
      })
    ),
  aceptoTerminos: z.boolean().refine((value) => value === true, {
    message: 'Debe aceptar los términos y condiciones.',
  }),
  website: z.string().max(0, { message: 'Bot detected' }).optional(), // Honeypot field
  authorUid: z.string().optional(),
});

// This type is no longer used for the client-side form, but can be kept for reference
export type ConsultationFormState = {
  message?: string | null;
  errors?: {
    cedula?: string[];
    nombre?: string[];
    contacto?: string[];
    aceptoTerminos?: string[];
    website?: string[];
  };
  success: boolean;
};

export interface Consultation {
  id: string;
  cedula: string;
  nombre: string;
  contacto: string;
  aceptoTerminos: boolean;
  authorUid: string;
  status: 'pendiente' | 'contactado' | 'en_proceso' | 'terminado';
  fuente: 'web' | 'manual';
  createdAt: any; // Firebase Timestamp
  telegramStatus: 'pending' | 'sent' | 'failed';
  notifiedAt?: any;
}

export type CaseStatus = 'apertura' | 'documentacion' | 'tramite' | 'resolucion' | 'finalizado' | 'archivo';

export interface CaseHistoryEvent {
  date: any; // Firebase Timestamp or ISO string
  description: string;
  type: 'status_change' | 'note' | 'document_added' | 'system';
}

export interface Case {
  id: string;
  consultationId: string;
  cedula: string;
  nombre: string;
  contacto: string;
  status: CaseStatus;
  history: CaseHistoryEvent[];
  documents: Array<{
    name: string;
    url: string;
    uploadedAt: any;
  }>;
  createdAt: any;
  updatedAt: any;
}
