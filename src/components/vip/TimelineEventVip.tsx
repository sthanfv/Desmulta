import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface TimelineEventData {
  date?: string | number | { toDate: () => Date };
  timestamp?: string | number | { toDate: () => Date };
  state?: string;
  type?: string;
  systemMsg?: string;
  description?: string;
  operatorNote?: string;
}

interface TimelineEventVipProps {
  event: TimelineEventData;
  isLatest: boolean;
}

export function TimelineEventVip({ event, isLatest }: TimelineEventVipProps) {
  // Parse date handling Firebase Timestamps or string dates
  let dateObj = new Date();
  if (event.date) {
    if (typeof event.date === 'object' && event.date !== null && 'toDate' in event.date) {
      dateObj = event.date.toDate();
    } else if (typeof event.date === 'string' || typeof event.date === 'number') {
      dateObj = new Date(event.date);
    }
  } else if (event.timestamp) {
    if (
      typeof event.timestamp === 'object' &&
      event.timestamp !== null &&
      'toDate' in event.timestamp
    ) {
      dateObj = event.timestamp.toDate();
    } else {
      dateObj = new Date(event.timestamp as string | number);
    }
  }

  const dateStr = format(dateObj, "d 'de' MMMM, yyyy - h:mm a", { locale: es });
  const title = event.state || event.type || 'Actualización';
  const description = event.systemMsg || event.description || '';
  const operatorNote = event.operatorNote;

  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0c0c0e] bg-white/5 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 transition-colors">
        {isLatest ? (
          <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" />
        ) : (
          <Circle className="w-3 h-3 fill-current" />
        )}
      </div>

      {/* Card */}
      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg transition-transform hover:-translate-y-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white capitalize text-lg">{title.replace(/_/g, ' ')}</h3>
          <span className="text-[10px] uppercase font-semibold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full">
            {format(dateObj, 'dd MMM', { locale: es })}
          </span>
        </div>

        {description && <p className="text-sm text-slate-400 mb-3">{description}</p>}

        {operatorNote && (
          <div className="mt-3 p-3 bg-[#D4AF37]/5 border-l-2 border-[#D4AF37] rounded-r-lg">
            <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider block mb-1">
              Nota de tu Asesor
            </span>
            <p className="text-sm text-slate-300 italic">&quot;{operatorNote}&quot;</p>
          </div>
        )}

        <div className="mt-2 text-xs text-slate-500 text-right">{dateStr}</div>
      </div>
    </div>
  );
}
