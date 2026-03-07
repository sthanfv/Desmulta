import React, { useState } from 'react';
import { X, Phone, Calendar, ExternalLink, Loader2, Briefcase } from 'lucide-react';
import Image from 'next/image';
import { KanbanItem } from './TableroKanbanReal';

interface ModalDetalleLeadProps {
    data: KanbanItem;
    onClose: () => void;
    onCambiarEstado: (id: string, nuevoEstado: string, tipo: 'lead' | 'caso') => Promise<void>;
    onPromoverACaso?: (lead: KanbanItem) => Promise<void>;
    esCaso: boolean;
}

export function ModalDetalleLead({ data, onClose, onCambiarEstado, onPromoverACaso, esCaso }: ModalDetalleLeadProps) {
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    if (!data) return null;

    const esCaptura = Boolean(data.evidenceUrl);

    // 1. Limpiamos el número por si el usuario le puso espacios o guiones
    const numeroLimpio = data.contacto ? data.contacto.replace(/\D/g, '') : '';

    // 2. Creamos el mensaje predeterminado profesional para Desmulta
    const mensajeBase = `Hola ${data.nombre || 'conductor'}, soy del equipo legal de Desmulta. Recibí tu solicitud de estudio de viabilidad ${data.placa && data.placa !== 'N/A' && data.placa !== 'Sin Identificar' ? `para la placa ${data.placa}` : 'en nuestra plataforma'}. ¿Tienes un momento para revisar tu caso?`;

    // 3. Generamos el enlace oficial de WhatsApp (Asumiendo código de Colombia +57 si no tiene código de país)
    const prefix = numeroLimpio.startsWith('57') ? '' : '57';
    const linkWhatsApp = `https://wa.me/${prefix}${numeroLimpio}?text=${encodeURIComponent(mensajeBase)}`;

    const handleAction = async (actionFn: () => Promise<void>, actionName: string) => {
        setIsProcessing(actionName);
        try {
            await actionFn();
            onClose(); // Cerrar modal después de la acción
        } catch (error) {
            console.error(`Error en ${actionName}:`, error);
            setIsProcessing(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            {/* Overlay click para cerrar */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 relative z-10">

                {/* CABECERA */}
                <div className="flex justify-between items-center p-5 border-b border-white/5 bg-slate-900/50">
                    <h3 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
                        Detalle del {esCaso ? 'Caso' : 'Prospecto'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* CUERPO DEL MODAL */}
                <div className="p-6 space-y-6">

                    {/* Bloque de Identificación */}
                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6 shadow-inner">
                        <div className="flex-1 space-y-4">
                            <div>
                                <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mb-1">Cliente</p>
                                <p className="text-lg font-bold text-foreground">{data.nombre || (esCaptura ? "Usuario (Captura)" : "No proporcionado")}</p>
                            </div>
                            <div className="flex flex-wrap gap-6">
                                {data.cedula && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mb-1">Cédula</p>
                                        <p className="text-sm text-muted-foreground font-mono font-bold tracking-tight">{data.cedula}</p>
                                    </div>
                                )}
                                {data.placa && data.placa !== 'N/A' && data.placa !== 'Sin Identificar' && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mb-1">Placa</p>
                                        <p className="text-sm font-black text-yellow-400 uppercase tracking-widest bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 w-fit">{data.placa}</p>
                                    </div>
                                )}
                                {data.ciudad && data.ciudad !== 'Por definir' && (
                                    <div>
                                        <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mb-1">Ciudad</p>
                                        <p className="text-sm text-muted-foreground font-bold">{data.ciudad}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Si hay imagen, la mostramos en grande */}
                        {esCaptura && (
                            <div className="w-full md:w-32 h-32 relative rounded-xl overflow-hidden border-2 border-white/10 shrink-0 bg-black/40">
                                <Image src={data.evidenceUrl!} alt="Evidencia del SIMIT" fill className="object-contain" />
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

                    {/* Bloque de Contacto */}
                    <div className="flex items-center gap-3 text-muted-foreground bg-white/5 border border-white/5 p-4 rounded-xl shadow-inner">
                        <Calendar className="w-5 h-5 opacity-50" />
                        <span className="text-xs font-bold uppercase tracking-widest">Registrado el: <span className="text-foreground ml-1">{data.createdAt ? new Date(data.createdAt).toLocaleString() : 'Reciente'}</span></span>
                    </div>
                </div>

                {/* FOOTER & BOTONES DE ACCIÓN (Touch Friendly) */}
                <div className="p-5 border-t border-white/5 bg-slate-900 flex flex-col gap-3">

                    {/* Botón Principal (WhatsApp) */}
                    <a
                        href={linkWhatsApp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-900/20 text-sm uppercase tracking-widest"
                    >
                        <Phone className="w-5 h-5 flex-shrink-0" />
                        Contactar por WhatsApp
                    </a>

                    {/* Controles Rápidos para Móvil: Tap-to-Move */}
                    <div className="flex gap-2 w-full mt-1">
                        {(!esCaso && data.estado === 'NUEVO') && (
                            <button
                                onClick={() => handleAction(() => onCambiarEstado(data.id, 'CONTACTADO', 'lead'), 'contactado')}
                                disabled={isProcessing !== null}
                                className="flex-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors hover:bg-yellow-500/20 disabled:opacity-50 flex justify-center items-center"
                            >
                                {isProcessing === 'contactado' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Marcar Contactado'}
                            </button>
                        )}

                        {data.estado !== 'DESCARTADO' && (
                            <button
                                onClick={() => handleAction(() => onCambiarEstado(data.id, 'DESCARTADO', esCaso ? 'caso' : 'lead'), 'descartado')}
                                disabled={isProcessing !== null}
                                className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl border border-slate-700 hover:bg-slate-700/80 text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50 flex justify-center items-center"
                            >
                                {isProcessing === 'descartado' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Descartar'}
                            </button>
                        )}
                    </div>

                    {/* Botón de Promoción a Caso Legal */}
                    {!esCaso && data.estado !== 'DESCARTADO' && onPromoverACaso && (
                        <button
                            onClick={() => handleAction(() => onPromoverACaso(data), 'promover')}
                            disabled={isProcessing !== null}
                            className="w-full mt-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-black py-3 rounded-xl flex justify-center items-center gap-2 text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            {isProcessing === 'promover' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <><Briefcase className="w-4 h-4" /> Promover a Caso Legal</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
