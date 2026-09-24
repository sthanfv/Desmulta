'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Database,
  Eye,
  Cpu,
  MessageCircle,
  UserCheck,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOOTER_DEFAULTS } from '@/lib/config-constants';

/** Fecha de la última revisión del contenido (actualizar al cambiar el texto). */
const ULTIMA_ACTUALIZACION = '24 de septiembre de 2026';

export default function PrivacidadPage() {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta';
  const contactEmail = FOOTER_DEFAULTS.email;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground/80 font-sans selection:bg-primary/30">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,191,0,0.05)_0%,transparent_40%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_90%_90%,rgba(255,191,0,0.03)_0%,transparent_40%)] pointer-events-none" />

      <header data-desktop-header className="fixed top-0 w-full z-50 p-6">
        <div className="max-w-4xl mx-auto glass rounded-3xl px-8 h-16 flex items-center justify-between shadow-2xl border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group active:scale-95"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <span className="font-black tracking-tighter text-lg uppercase text-foreground">
              {brandName}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-6 md:pt-36 pb-24">
        <div className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-foreground tracking-tight leading-[0.95]">
            Políticas de <br />
            <span className="text-primary italic underline decoration-primary/20 underline-offset-8">
              Privacidad
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl">
            Transparencia técnica y compromiso ético con el manejo y protección de su información.
          </p>
          <p className="mt-4 text-sm text-muted-foreground/70">
            Última actualización: {ULTIMA_ACTUALIZACION}
          </p>
        </div>

        <div className="space-y-12">
          {/* SECCIÓN 1: Recolección y Tratamiento */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Database className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Recolección y Tratamiento
              </h2>
            </div>

            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.1. Base Legal (Ley 1581 de 2012)
                </h4>
                <p>
                  En cumplimiento de la legislación colombiana (Ley 1581 de 2012 de Protección de
                  Datos Personales), le informamos que {brandName} recopila y procesa su información
                  personal (nombre, documento, placa, información de contacto) única y
                  exclusivamente para la ejecución de la consulta técnica de comparendos y el
                  mandato representativo aplicable.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.2. No Comercialización
                </h4>
                <p>
                  Garantizamos que <strong>NO</strong> vendemos, alquilamos ni compartimos sus datos
                  personales con agencias de publicidad externas, bases de datos masivas o terceros
                  no involucrados directamente en su representación legal.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: Rastreadores y Telemetría */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Eye className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Uso de Tecnologías y Rastreadores
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  2.1. Etiqueta de Privacidad y Servicios de Terceros
                </h4>
                <p>
                  Para garantizar la estabilidad, rendimiento y seguridad de la plataforma, así como
                  para entender cómo interactúan los usuarios con ella, utilizamos las siguientes
                  herramientas (trackers/SDKs):
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4 text-foreground/80">
                  <li>
                    <strong>Google Analytics:</strong> Recopila datos anónimos de comportamiento,
                    tiempo en página y flujos de usuario.
                  </li>
                  <li>
                    <strong>Meta Pixel:</strong> Atribución de eventos publicitarios para optimizar
                    campañas de divulgación legal.
                  </li>
                  <li>
                    <strong>Vercel Analytics & Speed Insights:</strong> Monitorización del
                    rendimiento del servidor y tiempos de carga de la web.
                  </li>
                  <li>
                    <strong>Sentry:</strong> Telemetría y reporte de errores en tiempo real.
                    Recopila trazas del sistema (no información sensible del caso) cuando ocurre un
                    error en la plataforma.
                  </li>
                  <li>
                    <strong>Microsoft Clarity:</strong> Mapas de calor y grabaciones anonimizadas de
                    la navegación (clics, desplazamiento) para mejorar la usabilidad. Los campos de
                    los formularios se enmascaran.
                  </li>
                  <li>
                    <strong>Cloudflare Turnstile:</strong> Verificación anti-bots en formularios y
                    en la carga de imágenes, para proteger el servicio de abusos automatizados.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: Procesamiento Local y "IA" */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Cpu className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Lectura de Documentos con Inteligencia Artificial
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  3.1. Extracción de Texto de Documentos
                </h4>
                <p>
                  Cuando usted sube la foto de un comparendo o una captura del SIMIT, la imagen se
                  envía de forma cifrada a nuestros servidores y se procesa con un servicio de
                  inteligencia artificial de Google (Gemini) para leer los datos del documento
                  (número de comparendo, fechas, valores). Si ese servicio no está disponible, se
                  usa un lector de respaldo operado por {brandName}.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  3.2. Límites del Tratamiento
                </h4>
                <p>
                  Las imágenes se usan <strong>únicamente</strong> para el diagnóstico de su caso.
                  Utilizamos el servicio de pago de Google, cuyas condiciones establecen que el
                  contenido enviado no se usa para entrenar sus modelos. Las capturas del SIMIT se
                  eliminan automáticamente a los 7 días.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: Mandato Electrónico y Extracción de Datos (Scraping) */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-400">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Database className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Mandato y Consulta de Información
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  4.1. Autorización (Habeas Data)
                </h4>
                <p>
                  En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios, al
                  suministrar su número de documento y aceptar estas políticas, usted autoriza a{' '}
                  {brandName} a tratar su información para estudiar su caso y, cuando contrate un
                  servicio, a actuar en su representación ante los organismos de tránsito.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  4.2. Sin Consultas Automatizadas
                </h4>
                <p>
                  {brandName} <strong>no</strong> utiliza sistemas automatizados (bots o scraping)
                  para consultar plataformas del Estado como el SIMIT o el RUNT. La información de
                  su caso proviene de lo que usted nos entrega (formularios, fotos y capturas) y de
                  las gestiones que realiza nuestro equipo.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 5: Asistente virtual */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <MessageCircle className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Asistente Virtual
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  5.1. Cómo se procesan sus mensajes
                </h4>
                <p>
                  Los mensajes que escribe en el asistente se envían a un servicio de inteligencia
                  artificial de Google (Gemini) para generar la respuesta. No pedimos su nombre ni
                  su documento en el chat: le recomendamos no escribir datos personales en él.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  5.2. Qué conservamos
                </h4>
                <p>
                  La conversación se guarda solo en su navegador y se borra al cerrar la pestaña. En
                  nuestros sistemas guardamos únicamente estadísticas agregadas de los temas
                  consultados (por ejemplo, &quot;prescripción&quot; o &quot;embargos&quot;), sin el
                  texto de sus mensajes.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 6: Derechos del titular */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <UserCheck className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Sus Derechos como Titular
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  6.1. Derechos (Art. 8, Ley 1581 de 2012)
                </h4>
                <p>
                  Usted puede, en cualquier momento y de forma gratuita: conocer, actualizar y
                  rectificar sus datos; solicitar prueba de la autorización otorgada; ser informado
                  sobre el uso que se les ha dado; revocar la autorización o pedir la supresión de
                  sus datos cuando no exista un deber legal o contractual de conservarlos; y
                  presentar quejas ante la Superintendencia de Industria y Comercio.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  6.2. Cómo ejercerlos
                </h4>
                <p>
                  Escríbanos a{' '}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-primary underline underline-offset-4"
                  >
                    {contactEmail}
                  </a>{' '}
                  indicando su nombre, su solicitud y un medio de respuesta. Atendemos consultas en
                  un máximo de 10 días hábiles y reclamos en un máximo de 15 días hábiles, según los
                  artículos 14 y 15 de la Ley 1581 de 2012.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 7: Conservación y seguridad */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Clock className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Conservación y Seguridad
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  7.1. Tiempo de conservación
                </h4>
                <p>
                  Conservamos sus datos mientras se estudia o gestiona su caso y durante el tiempo
                  que exijan las obligaciones legales, contables o de defensa aplicables. Las
                  capturas del SIMIT se eliminan a los 7 días y las solicitudes de consulta que no
                  avanzan se depuran periódicamente.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  7.2. Medidas de seguridad
                </h4>
                <p>
                  Los datos sensibles, como el número de documento, se almacenan cifrados. El acceso
                  al panel interno exige doble verificación y cada acceso queda registrado.
                </p>
              </div>
            </div>
          </section>

          {/* Accept Card */}
          <div className="relative group animate-in zoom-in-95 duration-700 delay-400">
            <div className="absolute inset-0 bg-primary/10 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-primary text-primary-foreground p-12 rounded-[3rem] text-center space-y-8 overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-[80px] pointer-events-none" />
              <h3 className="text-3xl font-black tracking-tight relative z-10">
                Aceptación de Términos
              </h3>
              <p className="text-lg opacity-90 font-medium max-w-xl mx-auto relative z-10">
                Al utilizar la plataforma, usted confirma haber leído y entendido estas Políticas de
                Privacidad, incluyendo el uso de rastreadores analíticos y la declaración de
                privacidad técnica.
              </p>
              <div className="relative z-10">
                <Link href="/terminos">
                  <Button className="h-16 px-12 bg-foreground text-background hover:bg-foreground/90 font-black rounded-2xl active:scale-95 transition-all text-lg shadow-xl border-none">
                    LEER TÉRMINOS Y CONDICIONES
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-20 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">
          Ley 1581 de 2012 • Protección de Datos Personales • Ley 2213 de 2022
        </p>
      </footer>
    </div>
  );
}
