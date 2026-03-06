import { Shield, Lock, FileText, CheckCircle } from 'lucide-react';

export function CentroConfianza() {
  const pilares = [
    {
      icono: <Lock className="w-6 h-6 text-primary" />,
      titulo: 'Privacidad y Habeas Data',
      descripcion:
        'Cumplimos estrictamente con la Ley 1581 de 2012. Tu cédula y teléfono están encriptados y jamás serán compartidos con terceros. Solo los usamos para consultar tu caso en el SIMIT.',
    },
    {
      icono: <FileText className="w-6 h-6 text-primary" />,
      titulo: 'Transparencia de Gestión',
      descripcion:
        'Somos un equipo independiente de gestores especializados, no una entidad gubernamental ni un bufete tradicional. Cobramos honorarios justos exclusivamente por la mediación y el trámite administrativo.',
    },
    {
      icono: <Shield className="w-6 h-6 text-primary" />,
      titulo: 'Infraestructura Segura',
      descripcion:
        'Nuestra plataforma opera bajo protocolos de seguridad de grado empresarial (SSL/TLS), bloqueando accesos no autorizados para proteger tu información financiera y personal en todo momento.',
    },
  ];

  return (
    <section className="w-full py-24 bg-muted/10 border-t border-border/20 relative z-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16 reveal">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-white/5 shadow-sm mb-6">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-black text-muted-foreground tracking-widest uppercase">
              Plataforma Verificada
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 tracking-tight">
            Tu <span className="text-primary italic">tranquilidad</span> es nuestra prioridad
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Hacemos el trabajo difícil por ti con total transparencia. Protegemos tus datos como si
            fueran nuestros y te hablamos con la verdad sobre tu proceso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pilares.map((pilar, index) => (
            <div
              key={index}
              className="reveal p-10 glass bg-card/40 border border-white/5 hover:border-primary/30 rounded-[2.5rem] hover:bg-card/80 transition-all duration-500 shadow-xl group"
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                {pilar.icono}
              </div>
              <h3 className="text-2xl font-black text-foreground mb-4 tracking-tight">
                {pilar.titulo}
              </h3>
              <p className="text-muted-foreground text-base leading-relaxed font-medium">
                {pilar.descripcion}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
