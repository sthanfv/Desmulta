'use client';
import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Haptics } from '@/lib/utils/haptics';

interface PreQualifyWidgetProps {
  onQualify: () => void;
}

export function PreQualifyWidget({ onQualify }: PreQualifyWidgetProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const steps = [
    {
      title: '¿De qué tipo es su infracción?',
      options: [
        { label: 'Fotomulta (Cámara)', value: 'foto' },
        { label: 'Agente de Tránsito', value: 'agente' },
        { label: 'Alcoholemia', value: 'alcohol' },
      ],
    },
    {
      title: '¿Hace cuánto tiempo ocurrió?',
      options: [
        { label: 'Menos de 1 año', value: 'reciente' },
        { label: 'Entre 1 y 3 años', value: 'medio' },
        { label: 'Más de 3 años', value: 'antiguo' },
      ],
    },
    {
      title: '¿Cómo se enteró de la multa?',
      options: [
        { label: 'Me notificaron a tiempo', value: 'notificado' },
        { label: 'Me enteré por un cobro coactivo o embargo', value: 'embargo' },
        { label: 'Revisando el SIMIT por casualidad', value: 'casualidad' },
      ],
    },
  ];

  const handleSelect = (val: string) => {
    Haptics.tap();
    const newAnswers = { ...answers, [step]: val };
    setAnswers(newAnswers);

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setStep(99); // Pantalla de resultado real
    }
  };

  const evalResult = () => {
    const type = answers[0]; // 'foto' | 'agente' | 'alcohol'
    const time = answers[1]; // 'reciente' | 'medio' | 'antiguo'
    const source = answers[2]; // 'notificado' | 'embargo' | 'casualidad'

    const evaluation = evaluateViability(type, time, source);

    // Mapear elementos visuales específicos de React que no pertenecen al motor lógico puro
    let icon = <ShieldCheck className="w-10 h-10 text-blue-500" />;
    let color = 'text-blue-500 bg-blue-500/10 border-blue-500/30';

    if (type === 'alcohol') {
      icon = <AlertCircle className="w-10 h-10 text-amber-500" />;
      color = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    } else if (time === 'antiguo') {
      icon = <CheckCircle2 className="w-10 h-10 text-emerald-500" />;
      color = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    } else if (type === 'foto' && (source === 'embargo' || source === 'casualidad')) {
      icon = <CheckCircle2 className="w-10 h-10 text-emerald-500" />;
      color = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    } else if (time === 'reciente' && source === 'notificado') {
      icon = <XCircle className="w-10 h-10 text-rose-500" />;
      color = 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    }

    return {
      ...evaluation,
      icon,
      color,
    };
  };

  if (step === 99) {
    const res = evalResult();
    return (
      <div className="p-8 text-center animate-in zoom-in duration-500 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-20 h-20 bg-muted/20 border border-border/40 rounded-full flex items-center justify-center mb-6">
          {res.icon}
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${res.color}`}
        >
          {res.probability}
        </div>
        <h3 className="text-2xl font-black text-foreground mb-3">{res.title}</h3>
        <p className="text-muted-foreground text-sm md:text-base max-w-sm leading-relaxed">
          {res.desc}
        </p>
        <button
          onClick={onQualify}
          className="mt-6 px-8 py-3 bg-primary text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Iniciar Consulta Gratuita →
        </button>
      </div>
    );
  }

  const current = steps[step];

  return (
    <div className="p-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="text-primary w-5 h-5" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Pre-calificador Inteligente ({step + 1}/{steps.length})
        </span>
      </div>
      <h3 className="text-xl md:text-2xl font-black mb-6 text-foreground leading-tight">
        {current.title}
      </h3>
      <div className="space-y-3">
        {current.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className="w-full text-left p-4 rounded-2xl border border-border/40 bg-muted/20 hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-between group active:scale-[0.98]"
          >
            <span className="font-bold text-foreground/80 group-hover:text-primary transition-colors text-sm md:text-base">
              {opt.label}
            </span>
            <div className="w-8 h-8 rounded-full bg-background border border-border/50 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Evalúa de forma pura la viabilidad legal preliminar de una infracción de tránsito.
 * Basado en la normativa colombiana y la Sentencia C-038/2020.
 *
 * @param type Tipo de infracción ('foto' | 'agente' | 'alcohol')
 * @param time Antigüedad de la multa ('reciente' | 'medio' | 'antiguo')
 * @param source Origen del conocimiento de la multa ('notificado' | 'embargo' | 'casualidad')
 */
export function evaluateViability(type: string, time: string, source: string) {
  if (type === 'alcohol') {
    return {
      success: false,
      probability: 'Baja Probabilidad (15%)',
      title: 'Caso de Alta Complejidad',
      desc: 'Las multas por alcoholemia son de carácter prioritario y las notificaciones se perfeccionan casi siempre en la vía pública con firma. Requiere un análisis y defensa especializada avanzada.',
      cta: 'Cargando formulario técnico especializado...',
    };
  }

  if (time === 'antiguo') {
    return {
      success: true,
      probability: 'Alta Probabilidad (95%)',
      title: 'Alta Probabilidad de Éxito',
      desc: 'Su multa supera los 3 años de antigüedad requeridos por la ley. Es altamente elegible para solicitar la Prescripción Directa o por Doble Término de forma inmediata.',
      cta: 'Cargando formulario prioritario...',
    };
  }

  if (type === 'foto' && (source === 'embargo' || source === 'casualidad')) {
    return {
      success: true,
      probability: 'Alta Probabilidad (85%)',
      title: 'Caso Altamente Viable',
      desc: 'Las fotomultas no notificadas formalmente vulneran el debido proceso (Sentencia C-038/2020 de la Corte Constitucional). Su caso tiene bases jurídicas sólidas para nulidad.',
      cta: 'Cargando formulario prioritario...',
    };
  }

  if (time === 'reciente' && source === 'notificado') {
    return {
      success: false,
      probability: 'Baja Probabilidad (20%)',
      title: 'Viabilidad Preliminar Limitada',
      desc: 'Multa reciente e impuesta bajo los términos formales de notificación. Nuestro equipo de especialistas revisará su caso manualmente para buscar atenuantes o fallas técnicas.',
      cta: 'Cargando formulario de consulta técnica...',
    };
  }

  // Caso por defecto
  return {
    success: true,
    probability: 'Viabilidad Moderada (60%)',
    title: 'Caso Viable bajo Estudio',
    desc: 'Existen indicios de posibles omisiones administrativas en el proceso de cobro. Recomendamos iniciar la solicitud de información formal para auditar la notificación.',
    cta: 'Cargando formulario de consulta...',
  };
}
