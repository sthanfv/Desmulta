import {
  Users,
  Briefcase,
  AlertCircle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ClipboardList,
  FileArchive,
} from 'lucide-react';

export const COLUMNAS_LEADS = [
  {
    id: 'NUEVO',
    titulo: 'Nuevas Solicitudes',
    accion: 'Llamar hoy mismo',
    descripcion:
      'Nuevos registros que acaban de entrar al sistema. Meta: contactar en menos de 2 horas para máxima conversión.',
    icono: AlertCircle,
    color: 'border-red-500/40 text-red-500',
    bgIcon: 'bg-red-500/10',
  },
  {
    id: 'CONTACTADO',
    titulo: 'Contactados',
    accion: 'Esperando documentos',
    descripcion:
      'Conversación técnica iniciada. Estamos a la espera de cédula o captura SIMIT para el estudio de viabilidad.',
    icono: Users,
    color: 'border-yellow-500/40 text-yellow-500',
    bgIcon: 'bg-yellow-500/10',
  },
  {
    id: 'ESTUDIO',
    titulo: 'En Proceso',
    accion: 'Listo para formalizar',
    descripcion:
      'Documentación en revisión por la mesa técnica. El caso está siendo calificado para inicio de trámite.',
    icono: Clock,
    color: 'border-blue-500/40 text-blue-500',
    bgIcon: 'bg-blue-500/10',
  },
  {
    id: 'DESCARTADO',
    titulo: 'Descartados',
    accion: 'Gestión Finalizada',
    descripcion:
      'Solicitudes que no cumplen criterios técnicos, falsas alarmas o clientes que desistieron del proceso.',
    icono: FileArchive,
    color: 'border-slate-700/50 text-slate-500',
    bgIcon: 'bg-slate-800',
  },
  {
    id: 'CONVERTIDO',
    titulo: 'Convertidos a Caso',
    accion: 'Ver en pestaña Casos',
    descripcion:
      'Leads que avanzaron exitosamente a gestión formal. También aparecen en la pestaña Casos Activos.',
    icono: CheckCircle2,
    color: 'border-green-500/40 text-green-500',
    bgIcon: 'bg-green-500/10',
  },
];

export const COLUMNAS_CASOS = [
  {
    id: 'APERTURA',
    titulo: 'Casos Nuevos',
    accion: 'Armar expediente',
    descripcion:
      'Caso formalizado. Recolectando evidencias, poderes y preparando el sustento técnico para radicación.',
    icono: Briefcase,
    color: 'border-orange-500/40 text-orange-500',
    bgIcon: 'bg-orange-500/10',
  },
  {
    id: 'RADICADO',
    titulo: 'Radicados',
    accion: 'Enviado a Tránsito',
    descripcion:
      'Expediente entregado formalmente ante el organismo de tránsito. El tiempo de respuesta administrativo empieza a correr.',
    icono: ShieldCheck,
    color: 'border-purple-500/40 text-purple-500',
    bgIcon: 'bg-purple-500/10',
  },
  {
    id: 'TRAMITE',
    titulo: 'En Espera',
    accion: 'Vigilar términos',
    descripcion:
      'Seguimiento de términos de ley. Vigilando vencimientos y respuestas del tránsito para actuar de inmediato.',
    icono: ClipboardList,
    color: 'border-blue-500/40 text-blue-500',
    bgIcon: 'bg-blue-500/10',
  },
  {
    id: 'FINALIZADO',
    titulo: 'Finalizados',
    accion: 'Caso Ganado/Cerrado',
    descripcion:
      'Resolución final emitida. Caso saneado exitosamente o cerrado por orden administrativo.',
    icono: CheckCircle2,
    color: 'border-green-500/40 text-green-500',
    bgIcon: 'bg-green-500/10',
  },
];

export const COLUMNAS_UNIFICADAS = [...COLUMNAS_LEADS, ...COLUMNAS_CASOS];
