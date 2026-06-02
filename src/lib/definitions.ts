import { z } from 'zod';
import {
  LegalStatusEnum,
  OCRAnalysisSchema,
  ConsultationSchemaBase,
  ConsultationSchema,
  SimitCaptureSchema,
} from './schemas';

export {
  LegalStatusEnum,
  OCRAnalysisSchema,
  ConsultationSchemaBase,
  ConsultationSchema,
  SimitCaptureSchema,
};

export type OCRAnalysisResult = z.infer<typeof OCRAnalysisSchema>;
export type LegalStatus = z.infer<typeof LegalStatusEnum>;

export interface EventoTracking {
  tipo: 'status_change' | 'nota' | 'documento' | 'system';
  estadoNuevo?: string | null;
  estadoAnterior?: string | null;
  descripcion: string;
  fecha: string;
}

export interface TrackingCase {
  shortId: string;
  status: string;
  nombre: string;
  ciudad: string;
  createdAt: string | null;
  eventos?: EventoTracking[];
  operatorNote?: string;
}

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
  ciudad?: string;
  status: 'pendiente' | 'contactado' | 'en_proceso' | 'terminado';
  fuente: 'web' | 'manual' | 'simit_capture';
  shortId?: string;
  createdAt: string;
  telegramStatus: 'pending' | 'sent' | 'failed';
  notifiedAt?: string;
}

export type CaseStatus =
  | 'APERTURA'
  | 'DOCUMENTACION'
  | 'TRAMITE'
  | 'RESOLUCION'
  | 'FINALIZADO'
  | 'ARCHIVO';

export interface CaseHistoryEvent {
  date: string;
  description: string;
  type: 'status_change' | 'note' | 'document_added' | 'system';
}

export interface Case {
  id: string;
  consultationId: string;
  authorUid: string;
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
