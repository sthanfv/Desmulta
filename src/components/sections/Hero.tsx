'use client';

import React from 'react';
import { ArrowUp, FileText, ChevronRight, Shield } from 'lucide-react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { TarjetaPremium } from '@/components/ui/TarjetaPremium';
import CountUp from '@/components/ui/CountUp';
import { CardSwap, Card } from '@/components/ui/CardSwap';

const SavingsCalculator = dynamic(
  () => import('@/components/interactive/SavingsCalculator').then((mod) => mod.SavingsCalculator),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] sm:h-[400px] rounded-3xl bg-muted/10 border border-white/5 animate-pulse" />
    ),
  }
);
import { Lightbox } from '@/components/ui/lightbox';
import { useExpedienteStore } from '@/store/useExpedienteStore';
import { ReturningUserBanner } from '@/components/vial-clear/ReturningUserBanner';
import type { ShowcaseConfig } from '@/lib/site-config';

interface HeroProps {
  cityContext?: string;
  showcaseData: ShowcaseConfig;
  onConsultar: () => void;
}

/**
 * Hero - Sección de impacto principal.
 * Layout: 2 columnas en desktop.
 * IZQUIERDA: Texto + CTA + Calculadora
 * DERECHA: Imagen + Contador
 */
export const Hero = ({ cityContext, showcaseData, onConsultar }: HeroProps) => {
  const { multas } = useExpedienteStore();
  const router = useRouter();

  return (
    <LazyMotion features={domAnimation} strict>
      <section className="min-h-[100svh] flex items-center pt-24 sm:pt-36 md:pt-40 pb-16 sm:pb-24 md:pb-32 px-4 relative overflow-hidden">
      {/* Atmósfera institucional */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 blur-[60px] sm:blur-[120px] opacity-50 rounded-full" />
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
      </div>

      {/* Grid principal: 1 columna en móvil, 2 columnas en desktop */}
      <div className="max-w-6xl mx-auto w-full relative z-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* ─── COLUMNA IZQUIERDA: Título + CTA + Calculadora ─── */}
        <div className="flex flex-col gap-8">
          {/* Badge */}
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 backdrop-blur-sm w-fit"
          >
            <Shield size={15} className="text-primary" />
            <span className="tracking-wide">Soluciones para multas de tránsito</span>
          </m.div>

          {/* Titular */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] font-black text-foreground tracking-tighter leading-[1.05] sm:leading-[0.9] text-balance">
            {cityContext ? (
              <>
                <m.span
                  className="block text-foreground/90"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  MULTAS EN
                </m.span>
                <m.span
                  className="block text-primary font-bold"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  {cityContext}
                </m.span>
              </>
            ) : (
              <>
                <m.span
                  className="block text-foreground/90"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  Borramos sus multas.
                </m.span>
                <m.span
                  className="block text-primary font-black"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  De forma 100% legal.
                </m.span>
              </>
            )}
          </h1>

          {/* Descripción */}
          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground font-medium leading-[1.7] max-w-lg"
          >
            {cityContext
              ? `¿Tiene multas en ${cityContext}? Le decimos si podemos borrarlas por tiempo cumplido o errores en el proceso. Análisis gratuito.`
              : '¿Tiene multas en el SIMIT? Analizamos su caso sin costo y le decimos si podemos borrarlas por tiempo cumplido o errores en el proceso.'}
          </m.p>

          {/* CTA */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Button
              onClick={onConsultar}
              size="lg"
              className="w-full sm:w-auto h-14 sm:h-16 px-6 sm:px-12 text-base sm:text-lg font-semibold rounded-2xl shadow-md hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all group"
            >
              <span className="flex items-center gap-3">
                Consultar mis multas gratis
                <ArrowUp className="w-5 h-5 rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </span>
            </Button>
          </m.div>

          <div className="-mt-4 relative z-30">
            <ReturningUserBanner />
          </div>

          {multas.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md flex items-center gap-4 group/expediente cursor-pointer hover:bg-primary/15 transition-all"
              onClick={onConsultar}
            >
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Expediente Activo
                </p>
                <p className="text-sm font-bold text-foreground">
                  Tiene {multas.length}{' '}
                  {multas.length === 1 ? 'multa detectada' : 'multas detectadas'} por analizar
                </p>
              </div>
              <ChevronRight
                size={16}
                className="text-primary ml-auto group-hover/expediente:translate-x-1 transition-transform"
              />
            </m.div>
          )}

          {/* Simulador — IZQUIERDA, debajo del texto */}
          <m.div
            id="calculadora-hero"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="w-full"
          >
            <SavingsCalculator />
          </m.div>
        </div>

        {/* ─── COLUMNA DERECHA: Imagen + Contador + Vitrina de Documentos ─── */}
        <div className="relative group animate-in zoom-in-95 duration-1000 delay-200 z-10 w-full flex flex-col gap-6 items-center lg:items-end">
          <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-[60px] opacity-50 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none" />
          <TarjetaPremium className="relative glass-ultra p-4 overflow-hidden shadow-2xl rounded-3xl w-full">
            <Lightbox
              src="/hero-bg.avif"
              alt="Gestión de multas profesional - Desmulta"
              className="rounded-3xl object-cover aspect-[4/3] xl:aspect-[16/10] w-full shadow-xl"
              priority={true}
              blurDataURL="data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAD6AAEAAAAAAAAAQAAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAoAAAAHAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAABIbWRhdBIACgg4DKcwgIaDSDIyGAAAAFDk2deQQylAHp7ST4ZDJ/xhxBmGNs6qXpyIgjdUiPVRLpr7v49vW3pjbgtn9oY="
            />
            <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none animate-float">
              <div className="glass p-4 rounded-2xl flex items-center gap-4 border-white/20 shadow-xl backdrop-blur-xl bg-black/40">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                  {(() => {
                    const rawVal = showcaseData.counterValue || '754+';
                    const numVal = parseInt(rawVal.replace(/[^0-9]/g, ''), 10) || 0;
                    const hasPlus = rawVal.includes('+');
                    return numVal > 0 ? (
                      <>
                        <CountUp from={0} to={numVal} separator="," duration={1.5} />
                        {hasPlus && '+'}
                      </>
                    ) : (
                      rawVal
                    );
                  })()}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">
                    {showcaseData.counterLabel || 'Casos Exitosos'}
                  </div>
                  <p className="text-xs text-white/70 font-medium">Este mes en toda Colombia</p>
                </div>
              </div>
            </div>
          </TarjetaPremium>

          {/* Vitrina de Soluciones Legales Directas (Folios A4 de frente) */}
          {/* NOTA DE DESARROLLO: Si modificas los precios visuales aquí, debes actualizar en concordancia los valores en centavos en PRODUCT_PRICES dentro de src/app/api/payments/create-order/route.ts */}
          <div className="w-full max-w-[320px] sm:max-w-[350px] md:w-full mx-auto lg:mr-12 flex flex-col gap-4 mt-4 lg:mt-[72px]">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 text-center lg:text-left">
              DOCUMENTOS DE DEFENSA
            </p>
            <CardSwap width={300} height={400} delay={5000} cardDistance={30} verticalDistance={20}>
              {/* Folio 1: Derecho de Petición General */}
              <Card className="rounded-2xl border shadow-2xl p-6 flex flex-col justify-between overflow-hidden bg-card text-card-foreground border-border cursor-pointer">
                <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-foreground/[0.03] rounded-2xl opacity-50 pointer-events-none" />
                <div className="flex flex-col h-full justify-between text-left font-mono text-zinc-800 dark:text-zinc-100">
                  <div className="text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-tight leading-normal border-b border-zinc-200 dark:border-zinc-900 pb-2">
                    SEÑOR: ORGANISMO DE TRÁNSITO Y TRANSPORTE <br />
                    E. S. D. <br />
                    REF: DERECHO DE PETICIÓN — ART. 23 C.P.
                  </div>
                  <div className="my-3 space-y-2 text-[8px] text-zinc-500/80 dark:text-zinc-400/80 leading-relaxed blur-[1.5px] opacity-25 select-none pointer-events-none">
                    <p>
                      Yo, mayor de edad, identificado como aparece al pie de mi firma, en ejercicio
                      del Derecho Constitucional de Petición consagrado en el artículo 23 de la
                      Constitución Política y la Ley 1437 de 2011...
                    </p>
                    <p>
                      Solicito respetuosamente se sirva ordenar la actualización de las bases de
                      datos correspondientes al SIMIT y RUNT de las siguientes obligaciones
                      contravencionales que figuran a mi nombre...
                    </p>
                    <p>
                      Lo anterior fundamentado en la falta de notificación oportuna del comparendo
                      físico dentro de los términos perentorios de ley y la consecuente pérdida de
                      ejecutoriedad del cobro...
                    </p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border bg-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
                        95% Éxito
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        $20.000
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Petición General (Exploratorio)
                    </h4>
                    <button
                      onClick={() => router.push('/plantillas')}
                      className="w-full mt-3 py-2.5 bg-zinc-100 hover:bg-primary hover:text-primary-foreground dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all border border-zinc-200 dark:border-zinc-800 hover:border-transparent active:scale-95"
                    >
                      Ver Solución
                    </button>
                  </div>
                </div>
              </Card>

              {/* Folio 2: Prescripción Directa */}
              <Card className="rounded-2xl border shadow-2xl p-6 flex flex-col justify-between overflow-hidden bg-card text-card-foreground border-border cursor-pointer">
                <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-foreground/[0.03] rounded-2xl opacity-50 pointer-events-none" />
                <div className="flex flex-col h-full justify-between text-left font-mono text-zinc-800 dark:text-zinc-100">
                  <div className="text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-tight leading-normal border-b border-zinc-200 dark:border-zinc-900 pb-2">
                    AL DESPACHO DEL INSPECTOR DE TRÁNSITO <br />
                    E. S. D. <br />
                    REF: SOLICITUD DE PRESCRIPCIÓN — ART. 159 C.N.T.
                  </div>
                  <div className="my-3 space-y-2 text-[8px] text-zinc-500/80 dark:text-zinc-400/80 leading-relaxed blur-[1.5px] opacity-25 select-none pointer-events-none">
                    <p>
                      Yo, actuando en nombre propio, me dirijo a su despacho con el fin de solicitar
                      se declare la PRESCRIPCIÓN de la acción de cobro de las sanciones
                      contravencionales impuestas...
                    </p>
                    <p>
                      Fundamento esta petición en el artículo 159 de la Ley 769 de 2002 (Código
                      Nacional de Tránsito), el cual establece un término de prescripción de tres
                      (3) años contados a partir del hecho...
                    </p>
                    <p>
                      Dado que la obligación contravencional data de una antigüedad superior a los
                      36 meses sin que se haya notificado mandamiento de pago dentro del término
                      establecido por la ley...
                    </p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border bg-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
                        98% Éxito
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        $30.000
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Prescripción Directa (3 Años)
                    </h4>
                    <button
                      onClick={() => router.push('/plantillas')}
                      className="w-full mt-3 py-2.5 bg-zinc-100 hover:bg-primary hover:text-primary-foreground dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all border border-zinc-200 dark:border-zinc-800 hover:border-transparent active:scale-95"
                    >
                      Ver Solución
                    </button>
                  </div>
                </div>
              </Card>

              {/* Folio 3: Doble Prescripción */}
              <Card className="rounded-2xl border shadow-2xl p-6 flex flex-col justify-between overflow-hidden bg-card text-card-foreground border-border cursor-pointer">
                <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-foreground/[0.03] rounded-2xl opacity-50 pointer-events-none" />
                <div className="flex flex-col h-full justify-between text-left font-mono text-zinc-800 dark:text-zinc-100">
                  <div className="text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-tight leading-normal border-b border-zinc-200 dark:border-zinc-900 pb-2">
                    OFICINA DE EJECUCIONES COACTIVAS DE TRÁNSITO <br />
                    E. S. D. <br />
                    REF: EXCEPCIÓN DE PRESCRIPCIÓN ACUMULADA (3+3)
                  </div>
                  <div className="my-3 space-y-2 text-[8px] text-zinc-500/80 dark:text-zinc-400/80 leading-relaxed blur-[1.5px] opacity-25 select-none pointer-events-none">
                    <p>
                      En mi calidad de ejecutado dentro del proceso administrativo de cobro
                      coactivo, comparezco para interponer la excepción de prescripción de la
                      obligación conforme al Estatuto Tributario...
                    </p>
                    <p>
                      La Corte Constitucional en Sentencia T-645 de 2017 ha determinado la
                      aplicación del doble término de prescripción (3 años para proferir mandamiento
                      y 3 años adicionales para la ejecución)...
                    </p>
                    <p>
                      Al haber transcurrido más de seis (6) años desde la fecha de ocurrencia de la
                      infracción sin que se haya culminado el proceso de cobro coactivo mediante
                      remate o pago efectivo...
                    </p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border bg-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
                        94% Éxito
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        $60.000
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Doble Prescripción (Coactivo)
                    </h4>
                    <button
                      onClick={() => router.push('/plantillas')}
                      className="w-full mt-3 py-2.5 bg-zinc-100 hover:bg-primary hover:text-primary-foreground dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all border border-zinc-200 dark:border-zinc-800 hover:border-transparent active:scale-95"
                    >
                      Ver Solución
                    </button>
                  </div>
                </div>
              </Card>

              {/* Folio 4: Nulidad por Indebida Notificación */}
              <Card className="rounded-2xl border shadow-2xl p-6 flex flex-col justify-between overflow-hidden bg-card text-card-foreground border-border cursor-pointer">
                <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-foreground/[0.03] rounded-2xl opacity-50 pointer-events-none" />
                <div className="flex flex-col h-full justify-between text-left font-mono text-zinc-800 dark:text-zinc-100">
                  <div className="text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-tight leading-normal border-b border-zinc-200 dark:border-zinc-900 pb-2">
                    AUTORIDAD DE TRÁNSITO Y TRANSPORTE <br />
                    E. S. D. <br />
                    REF: RECURSO DE NULIDAD CONTRA FOTOMULTA — SENT. C-038/20
                  </div>
                  <div className="my-3 space-y-2 text-[8px] text-zinc-500/80 dark:text-zinc-400/80 leading-relaxed blur-[1.5px] opacity-25 select-none pointer-events-none">
                    <p>
                      Objeto la validez constitucional del comparendo impuesto mediante medios
                      tecnológicos (fotomulta), solicitando la declaratoria de nulidad absoluta de
                      todo lo actuado...
                    </p>
                    <p>
                      Conforme al precedente vinculante de la Sentencia C-038 de 2020 de la Corte
                      Constitucional, el principio de responsabilidad es personalísimo, debiendo la
                      entidad identificar plenamente al infractor...
                    </p>
                    <p>
                      La notificación por aviso o envío a dirección errónea sin constancia de
                      recepción física por el suscrito vulnera de forma flagrante el debido proceso
                      consagrado en el artículo 29 de la C.P...
                    </p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border bg-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
                        96% Éxito
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        $40.000
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Nulidad de Fotomulta (C-038)
                    </h4>
                    <button
                      onClick={() => router.push('/plantillas')}
                      className="w-full mt-3 py-2.5 bg-zinc-100 hover:bg-primary hover:text-primary-foreground dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all border border-zinc-200 dark:border-zinc-800 hover:border-transparent active:scale-95"
                    >
                      Ver Solución
                    </button>
                  </div>
                </div>
              </Card>

              {/* Folio 5: Acción de Tutela */}
              <Card className="rounded-2xl border shadow-2xl p-6 flex flex-col justify-between overflow-hidden bg-card text-card-foreground border-border cursor-pointer">
                <div className="absolute -inset-px bg-gradient-to-tr from-primary/5 via-transparent to-foreground/[0.03] rounded-2xl opacity-50 pointer-events-none" />
                <div className="flex flex-col h-full justify-between text-left font-mono text-zinc-800 dark:text-zinc-100">
                  <div className="text-[8px] text-zinc-500 dark:text-zinc-400 uppercase tracking-tight leading-normal border-b border-zinc-200 dark:border-zinc-900 pb-2">
                    SEÑOR: JUEZ CONSTITUCIONAL DE LA REPÚBLICA (REPARTO) <br />
                    E. S. D. <br />
                    REF: ACCIÓN DE TUTELA — VULNERACIÓN AL ART. 23 Y 29 C.P.
                  </div>
                  <div className="my-3 space-y-2 text-[8px] text-zinc-500/80 dark:text-zinc-400/80 leading-relaxed blur-[1.5px] opacity-25 select-none pointer-events-none">
                    <p>
                      Acudo ante su despacho para instaurar Acción de Tutela en contra de la
                      Secretaría de Tránsito, con el fin de obtener la protección inmediata de mis
                      derechos fundamentales al debido proceso...
                    </p>
                    <p>
                      La entidad accionada ha omitido dar respuesta de fondo, oportuna y congruente
                      al Derecho de Petición radicado en fecha anterior, configurándose la figura
                      del silencio administrativo...
                    </p>
                    <p>
                      Solicito se ordene a la accionada resolver la solicitud de prescripción de
                      forma inmediata y actualizar las bases de datos de cobro coactivo que impiden
                      el libre ejercicio de mis derechos...
                    </p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border bg-card">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/20">
                        99% Éxito
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        $25.000
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Acción de Tutela (Silencio)
                    </h4>
                    <button
                      onClick={() => router.push('/plantillas')}
                      className="w-full mt-3 py-2.5 bg-zinc-100 hover:bg-primary hover:text-primary-foreground dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all border border-zinc-200 dark:border-zinc-800 hover:border-transparent active:scale-95"
                    >
                      Ver Solución
                    </button>
                  </div>
                </div>
              </Card>
            </CardSwap>
          </div>
        </div>
      </div>
    </section>
  </LazyMotion>
  );
};
