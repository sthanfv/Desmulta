import React, { useState } from 'react';
import {
  X,
  Phone,
  Calendar,
  ExternalLink,
  Loader2,
  Briefcase,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import Image from 'next/image';
import { KanbanItem } from './TableroFlujoTrabajo';
import { useAuth } from '@/firebase';
import { generarPoderLegal } from '@/app/admin/actions';
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  sugerirTipoDocumento,
} from '@/lib/legal/document-templates';
import { useToast } from '@/hooks/use-toast';

interface ModalDetalleLeadProps {
  data: KanbanItem;
  onClose: () => void;
  onCambiarEstado: (id: string, nuevoEstado: string, tipo: 'lead' | 'caso') => Promise<void>;
  onPromoverACaso?: (lead: KanbanItem) => Promise<void>;
  esCaso: boolean;
}

export function ModalDetalleLead({
  data,
  onClose,
  onCambiarEstado,
  onPromoverACaso,
  esCaso,
}: ModalDetalleLeadProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const auth = useAuth();
  const { toast } = useToast();

  const esSimitCaptura = data?.cedula === 'SIMIT-CAPTURA';

  const templateData = {
    nombre: esSimitCaptura ? 'REQUIERE INGRESO MANUAL' : data?.nombre || '',
    cedula: esSimitCaptura ? 'REQUIERE INGRESO MANUAL' : data?.cedula || '',
    email: data?.email || '',
  };

  const [isEditing, setIsEditing] = useState(false);
  // Sugerencia automática del tipo de documento basada en datos del caso
  const sugerencia = sugerirTipoDocumento(
    data?.antiguedad,
    data?.estadoCoactivo,
    data?.tipoInfraccion
  );
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>(sugerencia.tipo);
  const [editData, setEditData] = useState({
    nombre: templateData.nombre,
    cedula: templateData.cedula,
    email: templateData.email,
  });

  const isInvalid =
    editData.nombre === 'REQUIERE INGRESO MANUAL' ||
    editData.cedula === 'REQUIERE INGRESO MANUAL' ||
    !editData.email ||
    !editData.email.includes('@');

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!data) return null;

  const esCaptura = Boolean(data.evidenceUrl);
  const numeroLimpio = data.contacto ? data.contacto.replace(/\D/g, '') : '';
  const mensajeBase = `Hola ${data.nombre || 'conductor'}, soy del equipo técnico de Desmulta. Recibí tu solicitud de estudio de viabilidad ${data.placa && data.placa !== 'N/A' && data.placa !== 'Sin Identificar' ? `para la placa ${data.placa}` : 'en nuestra plataforma'}. ¿Tienes un momento para revisar tu caso?`;
  const prefix = numeroLimpio.startsWith('57') ? '' : '57';
  const linkWhatsApp = `https://wa.me/${prefix}${numeroLimpio}?text=${encodeURIComponent(mensajeBase)}`;

  const handleAction = async (actionFn: () => Promise<void>, actionName: string) => {
    setIsProcessing(actionName);
    try {
      await actionFn();
      onClose();
    } catch (error) {
      console.error(`Error en ${actionName}:`, error);
      setIsProcessing(null);
    }
  };

  const handleDescargarPoder = async () => {
    setIsProcessing('pdf');
    try {
      const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
      const result = await generarPoderLegal(
        idToken,
        data.id,
        isEditing
          ? { nombre: editData.nombre, cedula: editData.cedula, email: editData.email }
          : undefined,
        selectedDocType
      );

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Error al generar el poder',
          description: result.error,
        });
        return;
      }

      // Descarga directa en el navegador sin abrir nueva pestaña
      const byteCharacters = atob(result.base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: '✅ Poder generado', description: `Archivo: ${result.filename}` });
    } catch (err) {
      console.error('[ModalDetalleLead] Error descargando poder:', err);
      toast({ variant: 'destructive', title: 'Error inesperado al generar el PDF.' });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 relative z-10">
        {/* CABECERA */}
        <div className="flex justify-between items-start p-5 border-b border-white/5 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              {esCaso ? 'Detalle del Caso' : 'Detalle de la Solicitud'}
            </h2>
            <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mt-1 opacity-50 flex items-center gap-1.5">
              Ref: <span className="text-white opacity-100">{data.id}</span>
              {data.esRecurrente && (
                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 ml-2 animate-pulse">
                  RECURRENTE ({data.conteoRetornos || 1} VECES)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO */}
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Bloque de Identificación */}
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6 shadow-inner">
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mb-1">
                  Cliente
                </p>
                <p className="text-lg font-bold text-foreground">
                  {data.nombre || (esCaptura ? 'Usuario (Captura)' : 'No proporcionado')}
                </p>
              </div>
              <div className="flex flex-wrap gap-6">
                {data.cedula && (
                  <div className="group/item">
                    <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mb-1 flex items-center justify-between">
                      Cédula
                      <button
                        onClick={() => copyToClipboard(data.cedula!, 'cedula')}
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:text-primary"
                        title="Copiar Cédula"
                      >
                        {copiedField === 'cedula' ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </p>
                    <p className="text-sm text-muted-foreground font-mono font-bold tracking-tight">
                      {data.cedula}
                    </p>
                  </div>
                )}
                {data.placa && data.placa !== 'N/A' && data.placa !== 'Sin Identificar' && (
                  <div className="group/item">
                    <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mb-1 flex items-center justify-between">
                      Placa
                      <button
                        onClick={() => copyToClipboard(data.placa, 'placa')}
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:text-primary"
                        title="Copiar Placa"
                      >
                        {copiedField === 'placa' ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-yellow-400 uppercase tracking-widest bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 w-fit">
                        {data.placa}
                      </p>
                    </div>
                  </div>
                )}
                {data.ciudad && data.ciudad !== 'Por definir' && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mb-1">
                      Ciudad
                    </p>
                    <p className="text-sm text-muted-foreground font-bold">{data.ciudad}</p>
                  </div>
                )}
              </div>
            </div>

            {esCaptura && (
              <div className="w-full md:w-32 h-32 relative rounded-xl overflow-hidden border-2 border-white/10 shrink-0 bg-black/40">
                <Image
                  src={data.evidenceUrl!}
                  alt="Evidencia del SIMIT"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <a
                  href={data.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-xs font-black gap-2 uppercase tracking-widest"
                >
                  <ExternalLink className="w-5 h-5" /> Ampliar
                </a>
              </div>
            )}
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-3 text-muted-foreground bg-white/5 border border-white/5 p-4 rounded-xl shadow-inner">
            <Calendar className="w-5 h-5 opacity-50" />
            <span className="text-xs font-bold uppercase tracking-widest">
              Registrado el:{' '}
              <span className="text-foreground ml-1">
                {data.createdAt ? new Date(data.createdAt).toLocaleString() : 'Reciente'}
              </span>
            </span>
          </div>
        </div>

        {/* FOOTER & BOTONES */}
        <div className="p-4 md:p-5 border-t border-white/5 bg-slate-900 flex flex-col gap-3 shrink-0">
          {/* WhatsApp */}
          <a
            href={linkWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-900/20 text-sm uppercase tracking-widest"
          >
            <Phone className="w-5 h-5 flex-shrink-0" />
            Contactar por WhatsApp
          </a>

          {/* ── BOTÓN PODER LEGAL — solo visible en casos ── */}
          {esCaso &&
            (!isEditing ? (
              <button
                onClick={() => {
                  setEditData({
                    nombre: templateData.nombre,
                    cedula: templateData.cedula,
                    email: templateData.email,
                  });
                  setIsEditing(true);
                }}
                disabled={isProcessing === 'pdf'}
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black py-3 rounded-xl flex justify-center items-center gap-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                <>
                  <FileText className="w-4 h-4" /> Configurar Poder de Gestión
                </>
              </button>
            ) : (
              <div className="bg-slate-800/80 p-4 rounded-xl border border-amber-500/40 shadow-inner space-y-3 animate-in fade-in zoom-in duration-200">
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Check className="w-3 h-3" /> Configurar Documento Legal
                </p>

                {/* Selector de tipo de documento */}
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                    Tipo de Documento
                  </p>
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500/50 outline-none p-3 rounded-lg text-sm text-white font-semibold focus:ring-1 focus:ring-amber-500/50 transition-all"
                  >
                    {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                  {/* Sugerencia automática del sistema */}
                  <p className="text-[10px] text-amber-400/70 pl-1">
                    ✦ Sugerencia:{' '}
                    <span className="font-bold">{DOCUMENT_TYPE_LABELS[sugerencia.tipo]}</span> —{' '}
                    {sugerencia.razon}
                  </p>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-2">
                    Datos del Poderdante
                  </p>
                </div>

                <input
                  type="text"
                  value={editData.nombre}
                  onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500/50 outline-none p-3 rounded-lg text-sm text-white font-semibold focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-muted-foreground/50"
                  placeholder="Nombre de la persona"
                />
                <input
                  type="text"
                  value={editData.cedula}
                  onChange={(e) => setEditData({ ...editData, cedula: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500/50 outline-none p-3 rounded-lg text-sm text-white font-semibold focus:ring-1 focus:ring-amber-500/50 transition-all font-mono placeholder:text-muted-foreground/50"
                  placeholder="Cédula de ciudadanía"
                />
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500/50 outline-none p-3 rounded-lg text-sm text-white font-semibold focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-muted-foreground/50"
                  placeholder="Correo electrónico (Obligatorio)"
                  required
                />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white p-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDescargarPoder}
                    disabled={isProcessing === 'pdf' || isInvalid}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-black p-3 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-500"
                  >
                    {isProcessing === 'pdf' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Confirmar PDF'
                    )}
                  </button>
                </div>
              </div>
            ))}

          {/* Controles de estado */}
          <div className="flex gap-2 w-full mt-1">
            {!esCaso && data.estado === 'NUEVO' && (
              <button
                onClick={() =>
                  handleAction(() => onCambiarEstado(data.id, 'CONTACTADO', 'lead'), 'contactado')
                }
                disabled={isProcessing !== null}
                className="flex-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors hover:bg-yellow-500/20 disabled:opacity-50 flex justify-center items-center"
              >
                {isProcessing === 'contactado' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Marcar como Contactado'
                )}
              </button>
            )}

            {data.estado !== 'DESCARTADO' && (
              <button
                onClick={() =>
                  handleAction(
                    () => onCambiarEstado(data.id, 'DESCARTADO', esCaso ? 'caso' : 'lead'),
                    'descartado'
                  )
                }
                disabled={isProcessing !== null}
                className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl border border-slate-700 hover:bg-slate-700/80 text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isProcessing === 'descartado' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Descartar'
                )}
              </button>
            )}
          </div>

          {/* Promover a Caso */}
          {!esCaso && data.estado !== 'DESCARTADO' && onPromoverACaso && (
            <button
              onClick={() => handleAction(() => onPromoverACaso(data), 'promover')}
              disabled={isProcessing !== null}
              className="w-full mt-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-black py-3 rounded-xl flex justify-center items-center gap-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {isProcessing === 'promover' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Briefcase className="w-4 h-4" /> Promover a Gestión de Caso
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
