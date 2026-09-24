'use client';

// Accesos rápidos del Inicio en teléfono (< 768 px): la "pantalla de inicio" de la app.
// En escritorio no se muestra; allí la Hero conserva su botón "Estudio Legal Gratuito".

import { Calculator, Camera, FileText, MessageCircle } from 'lucide-react';
import { haptic, openAssistant, openConsultation } from './app-shell';

type Action = {
  label: string;
  hint: string;
  icon: typeof FileText;
  onClick: () => void;
  highlight?: boolean;
};

export function MobileQuickActions() {
  // Solo se renderiza en Inicio: las acciones abren el modal/chat por evento, sin navegar
  const noNavigate = () => undefined;

  const actions: Action[] = [
    {
      label: 'Consultar gratis',
      hint: 'Estudio de tu caso',
      icon: FileText,
      onClick: () => openConsultation('full', '/', noNavigate),
      highlight: true,
    },
    {
      label: 'Subir foto',
      hint: 'Comparendo o SIMIT',
      icon: Camera,
      onClick: () => openConsultation('simit', '/', noNavigate),
    },
    {
      label: 'Calculadora',
      hint: '¿Ya prescribió?',
      icon: Calculator,
      onClick: () =>
        document
          .getElementById('calculadora-hero')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    {
      label: 'Asistente IA',
      hint: 'Resuelve tus dudas',
      icon: MessageCircle,
      onClick: () => openAssistant('/', noNavigate),
    },
  ];

  return (
    <nav aria-label="Accesos rápidos" className="grid grid-cols-2 gap-3 md:hidden">
      {actions.map(({ label, hint, icon: Icon, onClick, highlight }) => (
        <button
          key={label}
          type="button"
          onClick={() => {
            haptic();
            onClick();
          }}
          className={
            'flex min-h-[92px] flex-col items-start justify-between rounded-2xl border p-3.5 text-left shadow-sm transition-transform active:scale-[0.97] ' +
            (highlight
              ? 'border-primary bg-primary text-primary-foreground shadow-primary/25'
              : 'border-border/70 bg-card/80 text-foreground backdrop-blur-sm')
          }
        >
          <Icon className={'h-6 w-6 ' + (highlight ? 'text-primary-foreground' : 'text-primary')} />
          <span>
            <span className="block text-[15px] font-bold leading-tight">{label}</span>
            <span
              className={
                'block text-xs ' +
                (highlight ? 'text-primary-foreground/80' : 'text-muted-foreground')
              }
            >
              {hint}
            </span>
          </span>
        </button>
      ))}
    </nav>
  );
}
