'use client';

import React, { useState } from 'react';
import { GripVertical, AlertCircle, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

// 1. Tipos de datos (Alineados temporalmente con Firebase)
export type EstadoCaso = 'NUEVO' | 'ESTUDIO' | 'RADICADO' | 'FINALIZADO';

export interface Lead {
  id: string;
  placa: string;
  ciudad: string;
  estado: EstadoCaso;
  montoAprox?: string;
}

// 2. Configuración de las Columnas Oxford/Regulation
const COLUMNAS: { id: EstadoCaso; titulo: string; icono: React.ElementType; color: string }[] = [
  { id: 'NUEVO', titulo: 'Nuevos Leads', icono: AlertCircle, color: 'text-blue-400' },
  { id: 'ESTUDIO', titulo: 'En Estudio Legal', icono: Clock, color: 'text-primary' },
  { id: 'RADICADO', titulo: 'Petición Radicada', icono: ShieldCheck, color: 'text-purple-400' },
  { id: 'FINALIZADO', titulo: 'Caso Ganado', icono: CheckCircle2, color: 'text-green-400' },
];

export function TableroKanban({ leadsIniciales }: { leadsIniciales: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(leadsIniciales);

  // 3. Motores de arrastre nativo de HTML5
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    // Efecto visual al agarrar la tarjeta (GPU Acceleration)
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Obligatorio para permitir soltar en la zona
  };

  const handleDrop = async (e: React.DragEvent, nuevoEstado: EstadoCaso) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');

    // Actualizamos la UI inmediatamente (Optimistic UI Cero Lag)
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, estado: nuevoEstado } : lead))
    );

    // TODO: Conectar actualización de estado con Firebase Firestore vía actions en una iteración posterior
    // await actualizarEstadoFirebase(leadId, nuevoEstado);
  };

  return (
    <div className="w-full min-h-[80vh] bg-background/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="mb-8 relative z-10">
        <h2 className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
          Centro de Comando{' '}
          <span className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full border border-primary/30">
            Live
          </span>
        </h2>
        <p className="text-muted-foreground font-medium mt-1">
          Arrastra los expedientes para actualizar su estatus operativo.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 overflow-x-auto pb-4 relative z-10">
        {COLUMNAS.map((columna) => (
          <div
            key={columna.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, columna.id)}
            className="flex-1 min-w-[280px] bg-card/40 backdrop-blur-xl rounded-2xl border border-white/5 p-4 flex flex-col shadow-xl transition-all hover:border-white/10"
          >
            {/* Cabecera de la columna */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
              <div className={`p-2 rounded-xl bg-white/5 ${columna.color} shadow-inner`}>
                <columna.icono className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-foreground/90 uppercase text-sm tracking-wider">
                {columna.titulo}
              </h3>
              <span className="ml-auto bg-primary/10 text-primary font-black text-xs py-1 px-3 rounded-full border border-primary/20">
                {leads.filter((l) => l.estado === columna.id).length}
              </span>
            </div>

            {/* Zona de Tarjetas (Dropzone) */}
            <div className="flex-1 flex flex-col gap-3 min-h-[200px] rounded-xl transition-colors">
              {leads
                .filter((lead) => lead.estado === columna.id)
                .map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    className="glass p-4 rounded-xl cursor-grab active:cursor-grabbing border-white/10 hover:border-primary/50 transition-all duration-200 shadow-lg hover:shadow-primary/10 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        <span className="font-black text-foreground text-lg tracking-widest">
                          {lead.placa}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-4 text-xs font-bold uppercase tracking-wider">
                      <span className="text-muted-foreground">{lead.ciudad}</span>
                      {lead.montoAprox && <span className="text-primary">{lead.montoAprox}</span>}
                    </div>
                  </div>
                ))}
              {leads.filter((l) => l.estado === columna.id).length === 0 && (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-white/5 rounded-xl">
                  Zona Libre
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
