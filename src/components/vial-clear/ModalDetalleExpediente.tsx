import { logger } from '@/lib/logger/security-logger';
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
  User,
  Hash,
  Car,
  ChevronRight,
  ShieldAlert,
  Download,
  Eye,
} from 'lucide-react';
import Image from 'next/image';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { KanbanItem } from './TableroFlujoTrabajo';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { CAUSALES_TRANSITO } from '@/lib/legal/legal-types';
import { logRevealAuditAction } from '@/app/admin/audit-actions';
import { ModalDocumentos } from './modal-parts/ModalDocumentos';
import { ModalEdicionDatos } from './modal-parts/ModalEdicionDatos';
import { maskData } from '@/lib/security/masking';

interface ModalDetalleExpedienteProps {
  data: KanbanItem;
  onClose: () => void;
  onCambiarEstado: (id: string, nuevoEstado: string, tipo: 'lead' | 'caso') => Promise<void>;
  onPromoverACaso?: (lead: KanbanItem) => Promise<void>;
  esCaso: boolean;
}

export function ModalDetalleExpediente({
  data,
  onClose,
  onCambiarEstado,
  onPromoverACaso,
  esCaso,
}: ModalDetalleExpedienteProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();
  const [pdfPreviews, setPdfPreviews] = useState<{ base64: string; filename: string }[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!modalRef.current) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, data]);

  const esSimitCaptura = data?.cedula === 'SIMIT-CAPTURA';

  const templateData = {
    nombre: esSimitCaptura ? 'REQUIERE INGRESO MANUAL' : data?.nombre || '',
    cedula: esSimitCaptura ? 'REQUIERE INGRESO MANUAL' : data?.cedula || '',
    email: data?.email || '',
    ticketNumber: data?.ticketNumber || '',
    placa:
      data?.placa && data?.placa !== 'N/A' && data?.placa !== 'Sin Identificar' ? data?.placa : '',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>(['poder', 'peticion']);
  const [selectedCausal, setSelectedCausal] = useState<string>('');
  const [editData, setEditData] = useState({
    nombre: templateData.nombre,
    cedula: templateData.cedula,
    email: templateData.email,
    ticketNumber: templateData.ticketNumber,
    placa: templateData.placa,
    ciudad: data && 'ciudad' in data ? String(data.ciudad) : '',
    operatorNote: '',
  });

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
      logger.error(`Error en ${actionName}:`, error);
      setIsProcessing(null);
    }
  };

  const handleReveal = async () => {
    setIsProcessing('reveal');
    try {
      const result = await logRevealAuditAction(data.id);
      if (result.success) {
        setIsRevealed(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de Seguridad',
          description: result.error || 'Error al revelar',
        });
      }
    } catch (_e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo auditar la acción',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleGenerarDocumentos = async () => {
    if (selectedDocs.length === 0) {
      toast({ variant: 'destructive', title: 'Selecciona al menos un documento a generar.' });
      return;
    }
    setIsProcessing('pdf');
    setPdfPreviews([]);
    setCurrentPreviewIndex(0);
    try {
      const idToken = (await auth?.currentUser?.getIdToken(true)) || '';
      const { buildPoderPDF, buildPeticionPDF } = await import('@/app/admin/actions');
      const overrideData = isEditing
        ? {
            nombre: editData.nombre,
            cedula: editData.cedula,
            email: editData.email,
            ticketNumber: editData.ticketNumber,
            placa: editData.placa,
          }
        : undefined;

      const newPreviews: { base64: string; filename: string }[] = [];

      if (selectedDocs.includes('poder')) {
        const resultPoder = await buildPoderPDF(idToken, data.id, overrideData);
        if (resultPoder.success) {
          newPreviews.push({ base64: resultPoder.base64, filename: resultPoder.filename });
        } else {
          toast({ variant: 'destructive', title: 'Error Poder', description: resultPoder.error });
        }
      }

      if (selectedDocs.includes('peticion')) {
        const resultPeticion = await buildPeticionPDF(
          idToken,
          data.id,
          selectedCausal,
          overrideData
        );
        if (resultPeticion.success) {
          newPreviews.push({ base64: resultPeticion.base64, filename: resultPeticion.filename });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error Petición',
            description: resultPeticion.error,
          });
        }
      }

      if (newPreviews.length > 0) {
        if (newPreviews.length === 1) {
          const { base64, filename } = newPreviews[0];
          const link = document.createElement('a');
          link.href = `data:application/pdf;base64,${base64}`;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast({ title: '✅ Documento Descargado', description: `Se ha descargado ${filename}` });
        } else {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          newPreviews.forEach(({ base64, filename }) => {
            zip.file(filename, base64, { base64: true });
          });
          const content = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = url;
          link.download = `documentos_cliente_${data.cedula || data.id}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast({
            title: '✅ Documentos Descargados',
            description: `Se ha descargado el archivo ZIP.`,
          });
        }
        setPdfPreviews(newPreviews);
      }
    } catch (err) {
      logger.error('[ModalDetalleExpediente] Error:', err);
      toast({ variant: 'destructive', title: 'Error inesperado al generar los PDF.' });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl p-4 sm:p-6 transition-all">
      <div className="absolute inset-0" onClick={onClose} />

      {/* MODAL CONTAINER - Diseño Alta Fidelidad */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-[#0a0f1c] border border-slate-200/60 dark:border-slate-800 rounded-[2rem] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-[0_30px_100px_-15px_rgba(0,0,0,0.3)] ring-1 ring-slate-900/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-200 relative z-10"
      >
        {/* HEADER ULTRALIMPIO */}
        <div className="flex justify-between items-center px-8 py-6 bg-white dark:bg-[#0a0f1c] border-b border-slate-100 dark:border-slate-800/80 sticky top-0 z-20">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                {esCaso ? (
                  <Briefcase className="w-5 h-5 text-amber-500" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-primary" />
                )}
                {esCaso ? 'Expediente Jurídico' : 'Solicitud de Viabilidad'}
              </h2>
              {data.esRecurrente && (
                <span className="bg-blue-600 dark:bg-blue-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm shadow-blue-500/30">
                  Retorno ({data.conteoRetornos || 1})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                REF: <span className="text-slate-900 dark:text-slate-200 ml-1">{data.id}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 p-2 rounded-full shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CUERPO PRINCIPAL (Scrollable) */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 dark:bg-transparent">
          {/* SECCIÓN 1: IDENTIDAD */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              Identidad del Ciudadano
            </h3>
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm relative">
              {!isRevealed && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md">
                  <button
                    onClick={handleReveal}
                    disabled={isProcessing === 'reveal'}
                    className="flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    {isProcessing === 'reveal' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    Revelar Información Sensible
                  </button>
                </div>
              )}
              {/* Fila Nombre */}
              <div className="flex items-center p-4 border-b border-slate-100 dark:border-slate-800/60">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                  <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-base font-bold text-slate-950 dark:text-white">
                    {isRevealed
                      ? data.nombre ||
                        (esCaptura ? 'Usuario de SIMIT (Requiere Validación)' : 'Sin Registrar')
                      : maskData(data.nombre || 'Sin Registrar', 'name')}
                  </p>
                </div>
              </div>

              {/* Fila Cédula & Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/60 bg-slate-50/50 dark:bg-[#0f1523]">
                {data.cedula && (
                  <div className="group p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <Hash className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Documento
                        </p>
                        <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-200 tracking-tight">
                          {isRevealed ? data.cedula : maskData(data.cedula!, 'id')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          isRevealed ? data.cedula! : maskData(data.cedula!, 'id'),
                          'cedula'
                        )
                      }
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 shadow-sm opacity-0 group-hover:opacity-100"
                    >
                      {copiedField === 'cedula' ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {data.contacto && (
                  <div className="group p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Contacto
                        </p>
                        <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-200 tracking-tight">
                          {isRevealed ? data.contacto : maskData(data.contacto!, 'phone')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          isRevealed ? data.contacto! : maskData(data.contacto!, 'phone'),
                          'telefono'
                        )
                      }
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 shadow-sm opacity-0 group-hover:opacity-100"
                    >
                      {copiedField === 'telefono' ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN QR DE SEGUIMIENTO */}
          {data.trackingUuid && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                Seguimiento del Cliente
              </h3>
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  {/* QR visible — pequeño, solo para mostrar */}
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                    <QRCodeSVG
                      value={`${process.env.NEXT_PUBLIC_APP_URL || 'https://desmulta.online'}/seguir/${data.trackingUuid}`}
                      size={72}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Portal de Seguimiento
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      El cliente puede escanear este QR para ver el estado en tiempo real. Sin
                      iniciar sesión.
                    </p>
                    {/* Canvas oculto en alta resolución para la descarga */}
                    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                      <QRCodeCanvas
                        id={`qr-hd-${data.trackingUuid}`}
                        value={`${process.env.NEXT_PUBLIC_APP_URL || 'https://desmulta.online'}/seguir/${data.trackingUuid}`}
                        size={320}
                        level="H"
                        includeMargin
                      />
                    </div>
                    <button
                      onClick={() => {
                        const trackingId = data.trackingUuid || 'NA';
                        const qrCanvas = document.getElementById(
                          `qr-hd-${trackingId}`
                        ) as HTMLCanvasElement;
                        if (!qrCanvas) return;

                        // Crear canvas final con marca
                        const PADDING = 28;
                        const QR_SIZE = 320;
                        const HEADER_H = 56;
                        const FOOTER_H = 40;
                        const TOTAL_W = QR_SIZE + PADDING * 2;
                        const TOTAL_H = QR_SIZE + HEADER_H + FOOTER_H + PADDING * 2;

                        const out = document.createElement('canvas');
                        out.width = TOTAL_W;
                        out.height = TOTAL_H;
                        const ctx = out.getContext('2d')!;

                        // Fondo blanco limpio
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, TOTAL_W, TOTAL_H);

                        // Franja superior dorada
                        ctx.fillStyle = '#F5A800';
                        ctx.fillRect(0, 0, TOTAL_W, HEADER_H);

                        // Texto "DESMULTA" en la franja
                        ctx.fillStyle = '#000000';
                        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('DESMULTA', TOTAL_W / 2, HEADER_H / 2);

                        // QR centrado
                        ctx.drawImage(qrCanvas, PADDING, HEADER_H + PADDING, QR_SIZE, QR_SIZE);

                        // ID del expediente bajo el QR
                        ctx.fillStyle = '#6b7280';
                        ctx.font = '13px system-ui, -apple-system, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillText(
                          `Expediente: ${trackingId.slice(0, 8).toUpperCase()}`,
                          TOTAL_W / 2,
                          HEADER_H + PADDING + QR_SIZE + 10
                        );

                        // Pie con URL
                        ctx.fillStyle = '#9ca3af';
                        ctx.font = '11px system-ui, -apple-system, sans-serif';
                        ctx.fillText('desmulta.online/seguir', TOTAL_W / 2, TOTAL_H - 18);

                        out.toBlob((blob) => {
                          if (!blob) return;
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(blob);
                          a.download = `QR_Desmulta_${trackingId.slice(0, 8)}.png`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                        }, 'image/png');
                      }}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl
                        bg-primary/10 hover:bg-primary/20 border border-primary/30
                        text-primary dark:text-primary text-xs font-bold transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar QR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: VEHÍCULO Y EVIDENCIA */}
          {(data.placa || esCaptura) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Placa Destacada */}
              {data.placa && data.placa !== 'N/A' && data.placa !== 'Sin Identificar' && (
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                  {!isRevealed && (
                    <div className="absolute inset-0 z-10 bg-white/60 dark:bg-black/60 backdrop-blur-md" />
                  )}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 dark:bg-yellow-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Car className="w-3.5 h-3.5" /> Vehículo Implicado
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-black text-yellow-600 dark:text-yellow-500 tracking-widest uppercase">
                      {isRevealed ? data.placa : maskData(data.placa!, 'plate')}
                    </p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          isRevealed ? data.placa! : maskData(data.placa!, 'plate'),
                          'placa'
                        )
                      }
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-all border border-slate-200 dark:border-slate-700 hover:border-yellow-400 dark:hover:border-yellow-600/50 shadow-sm"
                    >
                      {copiedField === 'placa' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Evidencia SIMIT (Alta Fidelidad) */}
              {esCaptura && (
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm h-full min-h-[140px] flex flex-col justify-between group">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    Evidencia SIMIT Adjunta
                  </p>
                  <div className="w-full flex-1 relative rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-black/40">
                    <Image
                      src={data.evidenceUrl!}
                      alt="Evidencia SIMIT"
                      fill
                      className="object-contain p-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <a
                      href={data.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 text-white text-xs font-black gap-2 uppercase tracking-widest"
                    >
                      <ExternalLink className="w-5 h-5 mb-1" /> Ampliar Captura
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 mt-8">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase">
              Ingreso: {data.createdAt ? new Date(data.createdAt).toLocaleString() : 'Reciente'}
            </span>
          </div>

          {/* ÁREA DE EDICIÓN DE PDF (SaaS Style) */}
          {esCaso && isEditing && (
            <div className="bg-amber-50/50 dark:bg-amber-500/[0.03] p-6 rounded-2xl border border-amber-200/50 dark:border-amber-500/20 animate-in fade-in slide-in-from-bottom-4 shadow-inner">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-950 dark:text-amber-500 uppercase tracking-widest">
                    Motor Documental
                  </h3>
                  <p className="text-[10px] text-amber-700/60 dark:text-amber-500/60 font-bold uppercase tracking-wider">
                    Configura y emite documentos legales
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Custom Checkboxes tipo Tarjeta */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="relative cursor-pointer">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={selectedDocs.includes('poder')}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDocs((prev) => [...prev, 'poder']);
                        else setSelectedDocs((prev) => prev.filter((d) => d !== 'poder'));
                      }}
                    />
                    <div className="w-full h-full bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all peer-checked:border-amber-500 peer-checked:bg-amber-50/50 dark:peer-checked:bg-amber-500/10 peer-checked:shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                          Poder
                        </span>
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-amber-500 flex items-center justify-center">
                          {selectedDocs.includes('poder') && (
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Documento de representación legal.
                      </p>
                    </div>
                  </label>

                  <label className="relative cursor-pointer">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={selectedDocs.includes('peticion')}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDocs((prev) => [...prev, 'peticion']);
                        else setSelectedDocs((prev) => prev.filter((d) => d !== 'peticion'));
                      }}
                    />
                    <div className="w-full h-full bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-all peer-checked:border-amber-500 peer-checked:bg-amber-50/50 dark:peer-checked:bg-amber-500/10 peer-checked:shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                          Acción
                        </span>
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-amber-500 flex items-center justify-center">
                          {selectedDocs.includes('peticion') && (
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Derecho de petición o tutela.
                      </p>
                    </div>
                  </label>
                </div>

                {selectedDocs.includes('peticion') && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black text-amber-900/60 dark:text-amber-500/60 uppercase tracking-widest mb-1.5 ml-1">
                      Fundamento Jurídico
                    </p>
                    <select
                      value={selectedCausal}
                      onChange={(e) => setSelectedCausal(e.target.value)}
                      className="w-full bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-sm font-semibold text-slate-900 dark:text-white shadow-sm focus:border-amber-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="" disabled>
                        Seleccione la causal de defensa...
                      </option>
                      {Object.values(CAUSALES_TRANSITO).map((causal) => (
                        <option key={causal.id} value={causal.id}>
                          {causal.titulo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <ModalEdicionDatos
                  datos={editData}
                  onChange={(campo, valor) => setEditData((prev) => ({ ...prev, [campo]: valor }))}
                  onGuardar={handleGenerarDocumentos}
                  onCancelar={() => setIsEditing(false)}
                  isGuardando={isProcessing === 'pdf'}
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER & ACTIONS */}
        <div className="p-6 bg-white dark:bg-[#080d18] border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-3 shrink-0 relative z-20">
          <a
            href={isRevealed ? linkWhatsApp : '#'}
            target={isRevealed ? '_blank' : undefined}
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!isRevealed) {
                e.preventDefault();
                toast({
                  variant: 'destructive',
                  title: 'Acceso Denegado',
                  description: 'Debe revelar la información sensible para contactar al cliente.',
                });
              }
            }}
            className={`w-full font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-sm uppercase tracking-widest ${isRevealed ? 'bg-[#25D366] hover:bg-[#1EBE5D] text-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_15px_30px_-10px_rgba(37,211,102,0.4)]' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-70'}`}
          >
            <Phone className="w-5 h-5 fill-current" /> Enviar Mensaje a Cliente
          </a>

          {esCaso && !isEditing && (
            <button
              onClick={() => {
                setEditData({
                  nombre: templateData.nombre,
                  cedula: templateData.cedula,
                  email: templateData.email,
                  ticketNumber: templateData.ticketNumber,
                  placa: templateData.placa,
                  ciudad: data && 'ciudad' in data ? String(data.ciudad) : '',
                  operatorNote: '',
                });
                setIsEditing(true);
              }}
              disabled={isProcessing === 'pdf'}
              className="w-full bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-black py-4 rounded-xl flex justify-center items-center gap-2 text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> Configurar Acción Legal
            </button>
          )}

          <div className="flex gap-3 w-full mt-2">
            {!esCaso && data.estado === 'NUEVO' && (
              <button
                onClick={() =>
                  handleAction(() => onCambiarEstado(data.id, 'CONTACTADO', 'lead'), 'contactado')
                }
                disabled={isProcessing !== null}
                className="flex-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200/50 dark:border-blue-500/30 flex justify-center items-center active:scale-[0.98]"
              >
                {isProcessing === 'contactado' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirmar Contacto'
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
                className="flex-1 bg-transparent hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 dark:hover:text-red-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-500/30 active:scale-[0.98]"
              >
                {isProcessing === 'descartado' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Rechazar / Descartar'
                )}
              </button>
            )}
          </div>

          {!esCaso && data.estado !== 'DESCARTADO' && onPromoverACaso && (
            <button
              onClick={() => handleAction(() => onPromoverACaso(data), 'promover')}
              disabled={isProcessing !== null}
              className="w-full mt-1 border-2 border-slate-950 dark:border-white text-slate-950 dark:text-white hover:bg-slate-950 hover:text-white dark:hover:bg-white dark:hover:text-slate-950 font-black py-4 rounded-xl flex justify-center items-center gap-2 text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
            >
              {isProcessing === 'promover' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Formalizar como Expediente <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {pdfPreviews.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl p-4 sm:p-6 transition-all">
          <div className="absolute inset-0" onClick={() => setPdfPreviews([])} />
          <div className="bg-white dark:bg-[#0a0f1c] border border-slate-200/60 dark:border-slate-800 rounded-2xl w-full max-w-4xl flex flex-col overflow-hidden shadow-2xl relative z-10 p-4">
            <ModalDocumentos
              documentos={pdfPreviews}
              indiceActual={currentPreviewIndex}
              onCambiarIndice={setCurrentPreviewIndex}
              onCerrar={() => setPdfPreviews([])}
            />
          </div>
        </div>
      )}
    </div>
  );
}
