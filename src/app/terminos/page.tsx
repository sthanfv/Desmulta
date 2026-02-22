'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TerminosPage() {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta';

  return (
    <div className="min-h-screen bg-[#020817] text-slate-300 font-sans selection:bg-primary/30">
      {/* Header Simple */}
      <header className="fixed top-0 w-full z-50 bg-[#020817]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold">Volver al inicio</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={24} />
            <span className="font-black tracking-tighter text-xl uppercase text-white">
              {brandName}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <div className="mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-6 text-white leading-tight">
            Términos de Servicio y <br />
            <span className="text-primary">Política de Privacidad</span>
          </h1>
          <p className="text-lg text-slate-400">
            Última actualización: Febrero de 2024. Le rogamos leer detenidamente estos términos
            antes de utilizar nuestros servicios de gestión administrativa.
          </p>
        </div>

        <div className="space-y-16">
          {/* Términos de Servicio */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <FileText className="text-primary" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">1. Términos de Servicio</h2>
            </div>

            <div className="space-y-6 text-slate-400 leading-relaxed">
              <p>
                <strong>1.1. Naturaleza del Servicio:</strong> {brandName} actúa como un facilitador
                y gestor administrativo para la debida diligencia de procesos y requerimientos ante
                los organismos de tránsito correspondientes en el territorio nacional. No somos una
                entidad estatal ni un despacho judicial.
              </p>
              <p>
                <strong>1.2. Estudio de Viabilidad:</strong> El análisis inicial de su caso a través
                del Sistema Integrado de Información sobre Multas y Sanciones por Infracciones de
                Tránsito (SIMIT) es un servicio totalmente gratuito y de carácter informativo. No
                obliga a la contratación de la gestión posterior.
              </p>
              <p>
                <strong>1.3. Honorarios Profesionales:</strong> La ejecución de trámites y gestión
                documental conlleva el cobro de honorarios. Estos serán informados de manera
                transparente una vez se determine la viabilidad de su caso y antes de iniciar
                cualquier actuación. El cobro está sujeto a la obtención de resultados favorables
                (exoneración o regularización de la cuenta), salvo acuerdo contrario expresado por
                escrito.
              </p>
              <p>
                <strong>1.4. Garantía de Resultados:</strong> Si bien contamos con una alta
                efectividad fundamentada en la normativa vigente y fallos administrativos,{' '}
                {brandName} advierte que las decisiones finales dependen en exclusiva de los
                organismos de tránsito correspondientes. Por tanto, no se garantiza el éxito en el
                100% de los expedientes, ya que cada caso tiene sus particularidades.
              </p>
            </div>
          </section>

          <hr className="border-white/10" />

          {/* Política de Privacidad */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <Lock className="text-primary" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">2. Política de Privacidad</h2>
            </div>

            <div className="space-y-6 text-slate-400 leading-relaxed">
              <p>
                <strong>2.1. Tratamiento de Datos:</strong> Al enviar el formulario de viabilidad,
                usted autoriza a{brandName} a consultar su estado de cuenta en el SIMIT y demás
                bases de datos públicas de tránsito utilizando el número de identificación
                proporcionado.
              </p>
              <p>
                <strong>2.2. Uso de la Información:</strong> Los datos personales (número de
                documento, nombre, teléfono) serán utilizados exclusivamente con los siguientes
                fines:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Realizar la consulta de deudas y comparendos.</li>
                <li>
                  Contactarle vía telefónica o por WhatsApp para entregarle los resultados de la
                  pre-evaluación.
                </li>
                <li>
                  Efectuar cobros o enviar comprobantes asociados a posibles contratos de mandato.
                </li>
              </ul>
              <p>
                <strong>2.3. Protección y Confidencialidad:</strong> Su información es manejada bajo
                estándares de confidencialidad. {brandName} no almacena los números de
                identificación de forma permanente después de que el proceso ha culminado ni
                comercializa bases de datos con terceros bajo ninguna circunstancia.
              </p>
            </div>
          </section>

          {/* Contacto */}
          <div className="bg-primary/5 border border-primary/20 p-8 rounded-2xl relative overflow-hidden">
            <h3 className="text-xl font-bold text-white mb-4">Aceptación de Términos</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 relative z-10">
              Al utilizar nuestra plataforma y canales de comunicación (WhatsApp, formularios),
              usted declara haber leído y comprendido los presentes términos de servicio y autoriza
              el tratamiento de sus datos conforme a nuestra política de privacidad.
            </p>
            <Link href="/">
              <Button className="bg-primary text-primary-foreground font-bold hover:bg-yellow-400">
                Entendido, volver
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
