import { MagneticCard } from '@/components/ui/MagneticCard';
import { Reveal } from '@/components/animations/Reveal';
import { ShieldCheck, Scale, Zap, FileSearch } from 'lucide-react';

/**
 * BentoDesmulta v1.1.0 - La Obra Maestra Visual (Adaptable)
 * Grid asimétrico optimizado para temas claro/oscuro mediante tokens de Tailwind.
 */
export function BentoDesmulta() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-24">
      <Reveal>
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-5xl">
            Ingeniería Legal <span className="text-primary">Avanzada.</span>
          </h2>
          <p className="mt-4 text-muted-foreground uppercase tracking-widest text-sm text-balance">
            Arquitectura diseñada para tumbar fotomultas
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
        <Reveal delay={0.1} className="md:col-span-2">
          <MagneticCard className="flex h-full min-h-[300px] flex-col justify-between p-8">
            <div className="w-fit rounded-full bg-primary/10 p-3 text-primary">
              <FileSearch size={32} />
            </div>
            <div className="mt-6">
              <h3 className="text-2xl font-bold text-foreground">OCR Forense en Tiempo Real</h3>
              <p className="mt-2 text-muted-foreground">
                Nuestro motor de visión artificial escanea tu captura del SIMIT, aislando fechas de
                notificación y estados de cobro coactivo en milisegundos para detectar vicios de
                procedimiento.
              </p>
            </div>
          </MagneticCard>
        </Reveal>

        <Reveal delay={0.2} direction="left">
          <MagneticCard className="flex h-full min-h-[300px] flex-col justify-between p-8">
            <div className="w-fit rounded-full bg-blue-500/10 p-3 text-blue-500">
              <Scale size={32} />
            </div>
            <div className="mt-6">
              <h3 className="text-xl font-bold text-foreground">Sentencia C-038</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Aplicamos jurisprudencia estricta. Si no te identificaron plenamente, la multa es
                inconstitucional.
              </p>
            </div>
          </MagneticCard>
        </Reveal>

        <Reveal delay={0.3}>
          <MagneticCard className="flex h-full min-h-[300px] flex-col justify-between p-8">
            <div className="w-fit rounded-full bg-green-500/10 p-3 text-green-500">
              <ShieldCheck size={32} />
            </div>
            <div className="mt-6">
              <h3 className="text-xl font-bold text-foreground">Blindaje de Caducidad</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Nuestro sistema identifica automáticamente multas que ya no deberían estar en tu
                historial por tiempos legales vencidos.
              </p>
            </div>
          </MagneticCard>
        </Reveal>

        <Reveal delay={0.4} className="md:col-span-2" direction="right">
          <MagneticCard className="relative flex h-full min-h-[300px] items-end p-8 overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10">
              <Zap size={250} className="text-primary" />
            </div>
            <div className="relative z-10 w-full md:w-2/3">
              <h3 className="text-2xl font-bold text-foreground">
                Tu Privacidad es Nuestra Prioridad
              </h3>
              <p className="mt-2 text-muted-foreground">
                Tu información personal es sagrada. Usamos protocolos avanzados para que tus datos
                estén siempre protegidos y nunca queden expuestos.
              </p>
            </div>
          </MagneticCard>
        </Reveal>
      </div>
    </section>
  );
}
