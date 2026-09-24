'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, Lock, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TerminosPage() {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta';

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
            Términos & <br />
            <span className="text-primary italic underline decoration-primary/20 underline-offset-8">
              Condiciones Generales
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl">
            Transparencia técnica y jurídica en el manejo de sus datos y la gestión de sus procesos
            administrativos.
          </p>
        </div>

        <div className="space-y-12">
          {/* SECCIÓN 1: Condiciones de Servicio */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <FileText className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Gestión y Servicios
              </h2>
            </div>

            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.1. Naturaleza de la Gestión (SaaS LegalTech)
                </h4>
                <p>
                  {brandName} actúa exclusivamente como un facilitador tecnológico y gestor
                  administrativo integral.{' '}
                  <strong>
                    No somos un bufete de abogados, ni proveemos representación en calidad de
                    apoderados judiciales.
                  </strong>{' '}
                  Toda la documentación y gestión administrativa procesada por nuestra plataforma
                  tecnológica es impulsada bajo la figura de titularidad del usuario (actuación a
                  nombre propio). Nuestra plataforma estructura la viabilidad técnica y normativa,
                  pero es el usuario quien figura como titular formal ante las autoridades
                  competentes.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.2. Gratuidad del Diagnóstico Preliminar
                </h4>
                <p>
                  El análisis técnico inicial mediante cruce de bases de datos es gratuito y de
                  carácter exploratorio, sin obligatoriedad de contratación para las fases
                  posteriores.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.3. Estructura de Honorarios (Fases)
                </h4>
                <div className="space-y-4">
                  <p>
                    La ejecución de trámites de saneamiento se divide en tres fases operativas,
                    informadas de manera transparente:
                  </p>
                  <ul className="list-none space-y-3 pl-0">
                    <li className="flex gap-2">
                      <span className="text-primary font-black shrink-0">Fase 1 - Apertura:</span>
                      <span>
                        Anticipo que cubre el costeo operativo, análisis de viabilidad,
                        estructuración de causales de defensa y emisión documental.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-black shrink-0">Fase 2 - Gestión:</span>
                      <span>
                        Acompañamiento técnico, generación automatizada de documentos y radicación
                        formal de requerimientos jurídicos bajo la titularidad exclusiva del
                        usuario, incluyendo el seguimiento de términos perentorios del Estado.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-black shrink-0">Fase 3 - Éxito:</span>
                      <span>
                        Honorario de resultado aplicable de forma exclusiva al confirmarse la
                        resolución a favor y/o la depuración del expediente.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.4. Políticas de Desistimiento
                </h4>
                <p>
                  Si el usuario desiste durante la Fase 1, se reintegrará su dinero descontando un
                  30% por concepto de apertura de expediente, uso de plataforma y análisis jurídico.
                  Al iniciar la Fase 2 (radicación formal ante autoridades), los valores abonados
                  adquieren el carácter de no reembolsables debido al consumo de recursos técnicos y
                  humanos.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  1.5. Obligación de Medio (No de Resultado)
                </h4>
                <p>
                  Nuestra labor constituye una <strong>obligación de medio</strong>. {brandName}{' '}
                  garantiza la estricta aplicación de la normativa vigente (Ley 769 de 2002, CPACA,
                  jurisprudencia constitucional) y el mayor estándar de diligencia técnica. Sin
                  embargo, no se garantiza infalibilidad en el resultado final, el cual recae
                  exclusivamente en la autonomía y discrecionalidad de las autoridades
                  administrativas o jueces de la República.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: Privacidad */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Lock className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Privacidad y Tratamiento
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  2.1. Autorización de Consulta
                </h4>
                <p>
                  Al someter su caso, autoriza el tratamiento de sus datos personales para la
                  consulta técnica en plataformas de interoperabilidad estatal y la posterior
                  gestión de su expediente.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  2.2. Seguridad Criptográfica
                </h4>
                <p>
                  La información aportada transita y se almacena bajo encriptación de grado
                  industrial en infraestructura en la nube. {brandName} no comercializa, transfiere
                  ni cede sus bases de datos a terceros con fines publicitarios.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: Propiedad Intelectual (NUEVO BLINDAJE) */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Scale className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Propiedad Intelectual
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  3.1. Secreto Profesional y Tecnológico
                </h4>
                <p>
                  La arquitectura del sistema, los algoritmos de detección de causales, los
                  fundamentos jurídicos aplicados y las plantillas documentales generadas por la
                  plataforma son propiedad intelectual exclusiva de {brandName} y constituyen
                  secreto profesional.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  3.2. Prohibición de Reproducción
                </h4>
                <p>
                  Los documentos legales entregados al usuario son de uso estrictamente personal,
                  nominativo e intransferible para el caso específico contratado. Queda
                  terminantemente prohibida su comercialización, reproducción, alteración o uso como
                  formato modelo para terceros ajenos al contrato.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: Contenido Generado por el Usuario y Responsabilidad */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <FileText className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Contenido del Usuario y Responsabilidad
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  4.1. Veracidad y Licitud de Documentos (UGC)
                </h4>
                <p>
                  El usuario asume la responsabilidad total, exclusiva y penal sobre cualquier
                  documento, imagen (incluyendo comparendos), archivo PDF o dato subido a la
                  plataforma. {brandName} actúa estrictamente como un procesador de la información
                  suministrada y no se responsabiliza por la carga de contenido ilícito, falsificado
                  o protegido por derechos de autor por parte de terceros.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  4.2. Cláusula de Retiro y Refugio Legal
                </h4>
                <p>
                  En cumplimiento de normativas internacionales de protección de plataformas (ej.
                  DMCA) y leyes locales, {brandName} se reserva el derecho de retirar o eliminar
                  cualquier contenido que infrinja derechos de terceros o las leyes vigentes. Si
                  considera que un material infringe sus derechos, podrá notificarlo a través de
                  nuestros canales oficiales.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 5: Jurisdicción y Arbitraje */}
          <section className="floating-card bg-card/40 backdrop-blur-sm border border-white/10 p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-700">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
                <Scale className="text-primary" size={28} />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Jurisdicción y Arbitraje
              </h2>
            </div>
            <div className="grid gap-8 text-muted-foreground leading-relaxed text-lg">
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  5.1. Renuncia a Demandas Colectivas
                </h4>
                <p>
                  Al aceptar estos términos, usted acepta que cualquier reclamo o disputa legal
                  relacionada con el uso de nuestros servicios deberá resolverse de manera
                  individual, renunciando expresamente a participar en cualquier tipo de acción,
                  litigio o demanda colectiva.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-foreground uppercase tracking-widest text-xs opacity-60">
                  5.2. Cláusula de Arbitraje (Colombia)
                </h4>
                <p>
                  Toda controversia o diferencia relativa a la prestación de los servicios será
                  resuelta por un Tribunal de Arbitramento designado por el Centro de Arbitraje y
                  Conciliación de la Cámara de Comercio correspondiente a la sede principal de{' '}
                  {brandName} en la República de Colombia, sujeto a las leyes colombianas y fallando
                  en derecho.
                </p>
              </div>
            </div>
          </section>

          {/* Accept Card */}
          <div className="relative group animate-in zoom-in-95 duration-700 delay-300">
            <div className="absolute inset-0 bg-primary/10 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-primary text-primary-foreground p-12 rounded-[3rem] text-center space-y-8 overflow-hidden">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/10 rounded-full blur-[80px] pointer-events-none" />
              <h3 className="text-3xl font-black tracking-tight relative z-10">
                Compromiso de Confianza
              </h3>
              <p className="text-lg opacity-90 font-medium max-w-xl mx-auto relative z-10">
                Saneamiento vial profesional, ético y eficiente. Al utilizar nuestros servicios,
                acepta estas condiciones diseñadas para la protección mutua.
              </p>
              <div className="relative z-10">
                <Link href="/">
                  <Button className="h-16 px-12 bg-foreground text-background hover:bg-foreground/90 font-black rounded-2xl active:scale-95 transition-all text-lg shadow-xl border-none">
                    ACEPTAR Y VOLVER
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
