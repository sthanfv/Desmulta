'use client';

import React, { useState, useEffect } from 'react';
import { updateConsultationStatus, updateCaseStatus, convertToCase } from '@/app/admin/actions';
import {
  Users,
  Briefcase,
  AlertCircle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Gavel,
  FileArchive,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ModalDetalleLead } from './ModalDetalleLead';
import { TarjetaKanban } from './TarjetaKanban';
import { Consultation } from '@/lib/definitions';

// 1. Definimos las columnas exactas para cada modo (Con UX Psicología de interfaz)
const COLUMNAS_LEADS = [
  {
    id: 'NUEVO',
    titulo: 'Nuevas Solicitudes',
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
  tipo: 'lead' | 'caso';
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
        toast({ title: `Solicitud actualizada a ${nuevoEstado}` });
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
  const handleCambiarEstadoDesdeModal = async (
    id: string,
    nuevoEstado: string,
    tipo: 'lead' | 'caso'
  ) => {
    const estadoAnterior = itemSeleccionado?.estado || 'NUEVO';

    // UI Optimista
    if (tipo === 'lead') {
      setLocalLeads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
      );
    } else {
      setLocalCasos((prev) =>
        prev.map((item) => (item.id === id ? { ...item, estado: nuevoEstado } : item))
      );
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
        setLocalLeads((prev) =>
          prev.map((item) => (item.id === id ? { ...item, estado: estadoAnterior } : item))
        );
      } else {
        setLocalCasos((prev) =>
          prev.map((item) => (item.id === id ? { ...item, estado: estadoAnterior } : item))
        );
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
      } as unknown as Consultation);

      if (!result.success) throw new Error(result.error || 'Error desconocido');

      toast({ title: 'Solicitud promovida a Caso Legal exitosamente' });
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
            En Vivo
          </span>
        </h2>

        <div className="bg-black/40 p-1.5 rounded-2xl border border-white/10 inline-flex shadow-inner">
          <button
            onClick={() => cambiarVista('leads')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-widest ${
              modoVista === 'leads'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" /> Gestión de Solicitudes
          </button>
          <button
            onClick={() => cambiarVista('casos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-widest ${
              modoVista === 'casos'
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

            <div className="flex-1 flex flex-col gap-3 min-h-[200px] max-h-[65vh] overflow-y-auto overscroll-contain pr-2 rounded-xl custom-scrollbar">
              {itemsActivos
                .filter((item) => item.estado === columna.id)
                .map((item) => (
                  <div key={item.id} onClick={() => setItemSeleccionado(item)}>
                    <TarjetaKanban data={item} onDragStart={handleDragStart} />
                  </div>
                ))}

              {/* Mensaje de "Vacío" si no hay tarjetas */}
              {itemsActivos.filter((item) => item.estado === columna.id).length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 text-sm font-medium">
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
