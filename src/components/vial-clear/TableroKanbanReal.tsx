'use client';

import React, { useState, useEffect } from 'react';
import { updateConsultationStatus, updateCaseStatus, convertToCase } from '@/app/admin/actions';
import {
  Users,
  Briefcase,
  GripVertical,
  AlertCircle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Gavel,
  FileArchive,
  Image as ImageIcon,
  Phone,
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { ModalDetalleLead } from './ModalDetalleLead';

// 1. Definimos las columnas exactas para cada modo (Con UX Psicología de interfaz)
const COLUMNAS_LEADS = [
  {
    id: 'NUEVO',
    titulo: 'Nuevos Leads',
    accion: 'Llamar hoy mismo',
    icono: AlertCircle,
    color: 'border-red-500/40 text-red-500',
    bgIcon: 'bg-red-500/10',
  },
  {
    id: 'CONTACTADO',
    titulo: 'Contactados',
    accion: 'Esperando documentos',
    icono: Users,
    color: 'border-yellow-500/40 text-yellow-500',
    bgIcon: 'bg-yellow-500/10',
  },
  {
    id: 'ESTUDIO',
    titulo: 'En Proceso',
    accion: 'Listo para formalizar',
    icono: Clock,
    color: 'border-blue-500/40 text-blue-500',
    bgIcon: 'bg-blue-500/10',
  },
  {
    id: 'DESCARTADO',
    titulo: 'Descartados',
    accion: 'No viables / No contestan',
    icono: FileArchive,
    color: 'border-slate-700/50 text-slate-500',
    bgIcon: 'bg-slate-800',
  },
];

const COLUMNAS_CASOS = [
  {
    id: 'APERTURA',
    titulo: 'Casos Nuevos',
    accion: 'Armar expediente',
    icono: Briefcase,
    color: 'border-orange-500/40 text-orange-500',
    bgIcon: 'bg-orange-500/10',
  },
  {
    id: 'RADICADO',
    titulo: 'Radicados',
    accion: 'Enviado a Tránsito',
    icono: ShieldCheck,
    color: 'border-purple-500/40 text-purple-500',
    bgIcon: 'bg-purple-500/10',
  },
  {
    id: 'TRAMITE',
    titulo: 'En Espera',
    accion: 'Vigilar términos legales',
    icono: Gavel,
    color: 'border-blue-500/40 text-blue-500',
    bgIcon: 'bg-blue-500/10',
  },
  {
    id: 'FINALIZADO',
    titulo: 'Finalizados',
    accion: 'Caso ganado / cerrado',
    icono: CheckCircle2,
    color: 'border-green-500/40 text-green-500',
    bgIcon: 'bg-green-500/10',
  },
];

export interface KanbanItem {
  id: string;
  placa: string;
  ciudad: string;
  estado: string;
  ahorro?: string;
  createdAt?: string;
  evidenceUrl?: string;
  nombre?: string;
  cedula?: string;
  contacto?: string;
}

export function TableroKanbanReal({
  leadsReales,
  casosReales,
}: {
  leadsReales: KanbanItem[];
  casosReales: KanbanItem[];
}) {
  const { toast } = useToast();
  // Estado para el interruptor: ¿Vemos Ventas o vemos Operación Legal?
  const [modoVista, setModoVista] = useState<'leads' | 'casos'>('leads');

  // Estado local para Optimistic UI (aislados para no perder cambios al cambiar pestaña)
  const [localLeads, setLocalLeads] = useState<KanbanItem[]>(leadsReales);
  const [localCasos, setLocalCasos] = useState<KanbanItem[]>(casosReales);

  // Estado para el modal de detalles
  const [itemSeleccionado, setItemSeleccionado] = useState<KanbanItem | null>(null);

  // Sincronizar datos SÓLO si las props cambian (refetch desde el padre)
  useEffect(() => {
    setLocalLeads(leadsReales);
    setLocalCasos(casosReales);
  }, [leadsReales, casosReales]);

  // itemsActivos es un valor derivado del estado correcto actual
  const itemsActivos = modoVista === 'leads' ? localLeads : localCasos;

  // Cambiar de vista actualiza los items que vemos
  const cambiarVista = (modo: 'leads' | 'casos') => {
    setModoVista(modo);
  };

  // 2. El motor de arrastre
  const handleDragStart = (e: React.DragEvent, id: string, estadoActual: string) => {
    e.dataTransfer.setData('itemId', id);
    e.dataTransfer.setData('estadoAnterior', estadoActual);
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, nuevoEstado: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId');
    const estadoAnterior = e.dataTransfer.getData('estadoAnterior');

    if (estadoAnterior === nuevoEstado) return;

    // UI Optimista: Movemos la tarjeta en pantalla INMEDIATAMENTE de forma separada
    if (modoVista === 'leads') {
      setLocalLeads((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, estado: nuevoEstado } : item))
      );
    } else {
      setLocalCasos((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, estado: nuevoEstado } : item))
      );
    }

    // Ejecución Real en Backend
    try {
      if (modoVista === 'leads') {
        const result = await updateConsultationStatus(itemId, nuevoEstado.toLowerCase());
        if (result.error) throw new Error(result.error);
        toast({ title: `Lead actualizado a ${nuevoEstado}` });
      } else {
        const desc = `Movimiento manual en Kanban a ${nuevoEstado}`;
        const result = await updateCaseStatus(itemId, nuevoEstado.toLowerCase(), desc);
        if (result.error) throw new Error(result.error);
        toast({ title: `Caso actualizado a ${nuevoEstado}` });
      }
    } catch (error) {
      console.error('Fallo al actualizar en Firebase', error);
      // Revertir UI si ocurre un error
      if (modoVista === 'leads') {
        setLocalLeads((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, estado: estadoAnterior } : item))
        );
      } else {
        setLocalCasos((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, estado: estadoAnterior } : item))
        );
      }
      toast({
        variant: 'destructive',
        title: 'Error de sincronización',
        description: 'No se pudo mover la tarjeta. Intente de nuevo.',
      });
    }
  };

  // 3. Cambiar estado desde el modal (Touch-to-Move)
  const handleCambiarEstadoDesdeModal = async (id: string, nuevoEstado: string, tipo: 'lead' | 'caso') => {
    const estadoAnterior = itemSeleccionado?.estado || 'NUEVO';

    // UI Optimista
    if (tipo === 'lead') {
      setLocalLeads((prev) => prev.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item)));
    } else {
      setLocalCasos((prev) => prev.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item)));
    }

    try {
      if (tipo === 'lead') {
        const result = await updateConsultationStatus(id, nuevoEstado.toLowerCase());
        if (result.error) throw new Error(result.error);
        toast({ title: `Estado actualizado: ${nuevoEstado}` });
      } else {
        const desc = `Movimiento táctico manual a ${nuevoEstado}`;
        const result = await updateCaseStatus(id, nuevoEstado.toLowerCase(), desc);
        if (result.error) throw new Error(result.error);
        toast({ title: `Caso actualizado: ${nuevoEstado}` });
      }
    } catch (error) {
      console.error('Fallo al cambiar estado', error);
      // Revertir UI
      if (tipo === 'lead') {
        setLocalLeads((prev) => prev.map((item) => (item.id === id ? { ...item, estado: estadoAnterior } : item)));
      } else {
        setLocalCasos((prev) => prev.map((item) => (item.id === id ? { ...item, estado: estadoAnterior } : item)));
      }
      toast({ variant: 'destructive', title: 'Error al actualizar.' });
      throw error;
    }
  };

  // 4. Promover a Caso Legal desde el Modal
  const handlePromoverDesdeModal = async (item: KanbanItem) => {
    // UI Optimista: Lo quitamos de leads
    setLocalLeads((prev) => prev.filter((i) => i.id !== item.id));

    try {
      // Necesitamos el objeto completo de lead para convertToCase
      // Las props de KanbanItem mapean casi directo a Consultation
      const result = await convertToCase({
        id: item.id,
        cedula: item.cedula || '',
        nombre: item.nombre || '',
        contacto: item.contacto || '',
        status: 'en_proceso',
        // Otros campos opcionales si son necesarios según la interfaz Consultation
      } as any);

      if (!result.success) throw new Error(result.error || 'Error desconocido');

      toast({ title: 'Lead promovido a Caso Legal exitosamente' });
      // El dashboard padre debería refrescarse eventualmente, o podemos añadirlo a localCasos si queremos verlo ya.
    } catch (error) {
      console.error('Fallo al promover', error);
      // Revertir leads
      setLocalLeads((prev) => [...prev, item]);
      toast({ variant: 'destructive', title: 'Error al promover a caso.' });
      throw error;
    }
  };



  const columnasActuales = modoVista === 'leads' ? COLUMNAS_LEADS : COLUMNAS_CASOS;
  const esCaso = modoVista === 'casos';

  return (
    <div className="w-full min-h-[80vh] bg-background/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* EL INTERRUPTOR (Toggle) */}
      <div className="flex flex-col items-center mb-8 relative z-10">
        <h2 className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-3 mb-4">
          Centro de Comando
          <span className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full border border-primary/30">
            Live
          </span>
        </h2>

        <div className="bg-black/40 p-1.5 rounded-2xl border border-white/10 inline-flex shadow-inner">
          <button
            onClick={() => cambiarVista('leads')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-widest ${modoVista === 'leads'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
          >
            <Users className="w-4 h-4" /> Flujo de Ventas
          </button>
          <button
            onClick={() => cambiarVista('casos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-widest ${modoVista === 'casos'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
          >
            <Briefcase className="w-4 h-4" /> Operación Legal
          </button>
        </div>
      </div>

      {/* EL TABLERO */}
      <div className="flex flex-col lg:flex-row gap-4 overflow-x-auto pb-4 relative z-10 w-full snap-x snap-mandatory scroll-smooth custom-scrollbar">
        {columnasActuales.map((columna) => (
          <div
            key={columna.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, columna.id)}
            className="flex-1 min-w-[250px] shrink-0 snap-center bg-card/40 backdrop-blur-xl rounded-3xl border border-white/5 p-4 flex flex-col shadow-xl transition-all hover:border-white/10"
          >
            {/* CABECERA INTUITIVA PARA EL EMPLEADO */}
            <div className={`border-b-2 pb-3 mb-4 ${columna.color}`}>
              <div className="flex justify-between items-start">
                <h3 className="font-black text-lg uppercase tracking-wide flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${columna.bgIcon}`}>
                    <columna.icono className="w-4 h-4" />
                  </div>
                  {columna.titulo}
                </h3>
                <span className="bg-white/10 text-muted-foreground font-black text-xs py-1 px-3 rounded-full">
                  {itemsActivos.filter((item) => item.estado === columna.id).length}
                </span>
              </div>
              <p className="text-xs font-bold opacity-80 mt-2 flex items-center gap-1.5 ml-1">
                👉 {columna.accion}
              </p>
            </div>

            <div className="flex-1 flex flex-col gap-3 min-h-[200px] rounded-xl">
              {itemsActivos
                .filter((item) => item.estado === columna.id)
                .map((item) => {
                  const esCaptura = Boolean(item.evidenceUrl);

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id, item.estado)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        // Evita abrir modal si el clic proviene de un evento que no intencionaba abrirlo
                        if (e.defaultPrevented) return;
                        setItemSeleccionado(item);
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing shadow-lg hover:shadow-xl group relative overflow-hidden
                        ${esCaso
                          ? 'bg-slate-900/80 border-blue-500/20 hover:border-blue-500/50'
                          : 'glass border-white/10 hover:border-primary/50'
                        }`}
                    >
                      <div
                        className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${esCaso ? 'bg-blue-500' : 'bg-primary'}`}
                      />

                      {/* INDICADOR VISUAL DEL TIPO DE LEAD */}
                      <div className="absolute top-3 right-3 z-10">
                        {esCaptura ? (
                          <div className="bg-blue-500/20 text-blue-400 p-1.5 rounded-md backdrop-blur-sm border border-blue-500/30" title="Captura de Pantalla">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="bg-amber-500/20 text-amber-500 p-1.5 rounded-md backdrop-blur-sm border border-amber-500/30" title="Datos Estructurados">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-start mb-3 pr-8">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-black/40 text-muted-foreground/80 border-white/10">
                          {esCaso ? '📂 Caso' : '👤 Lead'}
                        </span>
                        {item.ahorro && !esCaptura && (
                          <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 font-black">
                            {item.ahorro}
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-2 mb-3">
                        <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground transition-colors cursor-grab mt-1 shrink-0" />
                        <div className="flex flex-col overflow-hidden w-full pr-8">
                          {/* EL TÍTULO INTELIGENTE: Si hay placa la muestra, si no, muestra la Cédula */}
                          <h4 className="text-foreground font-black text-lg uppercase tracking-wide truncate">
                            {item.placa && item.placa !== 'N/A' && item.placa !== 'Sin Identificar'
                              ? item.placa
                              : (item.cedula ? `C.C. ${item.cedula}` : "Sin Identificación")}
                          </h4>

                          {/* Mostramos el nombre debajo del título */}
                          <span className="text-xs font-semibold text-muted-foreground truncate">
                            {item.nombre || (esCaptura ? "Usuario (Captura)" : "Usuario Sin Nombre")}
                          </span>
                        </div>
                      </div>

                      {/* CONTENIDO CONDICIONAL: ¿Qué mostramos? */}
                      <div className="pl-7 mb-2">
                        {esCaptura ? (
                          // === SI ES CAPTURA DE IMAGEN ===
                          <div className="flex gap-3 items-center">
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-white/10 shrink-0 bg-black/50">
                              <Image
                                src={item.evidenceUrl!}
                                alt="Evidencia"
                                fill
                                className="object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-110"
                              />
                            </div>
                            <div className="flex flex-col justify-center overflow-hidden">
                              <p className="mb-1 flex items-center gap-1.5 font-bold text-xs text-muted-foreground truncate"><Phone className="w-3 h-3 shrink-0" /> <span className="truncate">{item.contacto || "Sin teléfono"}</span></p>
                              <span className="text-blue-400 font-bold text-[10px] uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded w-fit border border-blue-500/20 mt-1 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                Revisar img
                              </span>
                            </div>
                          </div>
                        ) : (
                          // === SI SON DATOS ESTRUCTURADOS ===
                          <div className="text-xs text-muted-foreground space-y-1">
                            {/* Si el título gigante fue la Placa, entonces mostramos la cédula aquí abajo */}
                            {item.placa && item.placa !== 'N/A' && item.placa !== 'Sin Identificar' && item.cedula && (
                              <p className="font-mono font-bold text-[11px] opacity-80">C.C. {item.cedula}</p>
                            )}
                            <p className="text-[11px] font-bold mt-1.5 flex items-center gap-1.5 truncate">
                              {item.contacto ? <><Phone className="w-3 h-3 shrink-0" /> <span className="truncate">{item.contacto}</span></> : <span className="truncate">{item.ciudad}</span>}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                        <span>ID: {item.id.slice(0, 6)}</span>
                        <span className="flex items-center gap-1.5">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Reciente'}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {/* Mensaje de "Todo limpio" si no hay tarjetas */}
              {itemsActivos.filter((item) => item.estado === columna.id).length === 0 && (
                <div className="h-28 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-muted-foreground/50 text-xs font-bold uppercase tracking-widest gap-2 mt-2">
                  <columna.icono className="w-6 h-6 opacity-50" />
                  Vacío
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE DETALLE (SMART ACTION CARD) */}
      {itemSeleccionado && (
        <ModalDetalleLead
          data={itemSeleccionado}
          onClose={() => setItemSeleccionado(null)}
          onCambiarEstado={handleCambiarEstadoDesdeModal}
          onPromoverACaso={handlePromoverDesdeModal}
          esCaso={esCaso}
        />
      )}
    </div>
  );
}
