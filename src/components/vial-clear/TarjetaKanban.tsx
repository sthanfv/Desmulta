import { GripVertical, Image as ImageIcon, Phone, MapPin } from "lucide-react";
import Image from "next/image";
import { KanbanItem } from "./TableroKanbanReal"; 
import { TarjetaPremium } from "../ui/TarjetaPremium";

export function TarjetaKanban({ 
  data, 
  onDragStart 
}: { 
  data: KanbanItem, 
  onDragStart: (e: React.DragEvent, id: string, estado: string) => void 
}) {
  const esCaptura = Boolean(data.evidenceUrl);
  const esCaso = data.tipo === 'caso';

  return (
    <TarjetaPremium
      className="p-4 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all rounded-xl"
    >
      <div 
        draggable
        onDragStart={(e) => onDragStart(e, data.id, data.estado)}
        className="w-full h-full"
      >
      {/* Indicador lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${esCaso ? 'bg-blue-500' : 'bg-primary'}`} />

      {/* Tipo de Lead Badge */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-black/40 text-muted-foreground/80 border-white/10">
          {esCaso ? '📂 CASO' : '👤 LEAD'}
        </span>
        {esCaptura && (
          <span className="bg-blue-500/20 text-blue-400 p-1 rounded-md" title="Captura SIMIT">
            <ImageIcon className="w-3 h-3" />
          </span>
        )}
      </div>

      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-foreground font-black text-base uppercase tracking-tight truncate">
            {data.placa && data.placa !== 'N/A' ? data.placa : (data.cedula ? `C.C. ${data.cedula}` : 'Sin Id')}
          </h4>
          <p className="text-muted-foreground text-xs truncate">{data.nombre || 'Usuario Desmulta'}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <Phone className="w-3 h-3" /> {data.contacto || 'Sin contacto'}
          </p>
          {data.ciudad && (
            <p className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {data.ciudad}
            </p>
          )}
        </div>
        
        {esCaptura && data.evidenceUrl && (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700">
            <Image 
              src={data.evidenceUrl} 
              alt="SIMIT" 
              fill 
              className="object-cover opacity-60 group-hover:opacity-100"
            />
          </div>
        )}
      </div>
      </div>
    </TarjetaPremium>
  );
}
