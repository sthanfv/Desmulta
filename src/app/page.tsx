'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRightLeft,
  CheckCircle2,
  Search,
  Info,
  AlertTriangle,
  MessageCircle,
  Loader2,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConsultationForm } from '@/components/vial-clear/ConsultationForm';
import { Lightbox } from '@/components/ui/lightbox';
import {
  useAuth,
  useUser,
  initiateAnonymousSignIn,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { doc } from 'firebase/firestore';

export default function VialClearPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWhatsAppWarningOpen, setIsWhatsAppWarningOpen] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Desmulta';

  // Fetch showcase images from Firestore
  const showcaseRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'site_config', 'showcase') : null),
    [firestore]
  );
  const { data: showcaseData, isLoading: isShowcaseLoading } = useDoc<{
    beforeImageUrl: string;
    afterImageUrl: string;
  }>(showcaseRef);

  useEffect(() => {
    // When the state of authentication finishes loading and there is no user (neither anonymous nor explicit),
    // an anonymous session is initiated. This is crucial to secure Firestore writes.
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  const handleWhatsAppRedirect = () => {
    const message = encodeURIComponent(
      `Hola, vengo de la web de ${brandName}. Deseo una asesoría directa para gestionar mis multas.`
    );
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573005648309';
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    setIsWhatsAppWarningOpen(false);
  };

  return (
    <div className="min-h-screen font-body">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-white/5 px-6 py-4">
        <nav className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md">
              <ShieldCheck className="text-primary-foreground" size={24} />
            </div>
            <span className="font-black tracking-tighter text-xl uppercase">{brandName}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all"
            >
              Estudio Gratuito
            </Button>
          </div>
        </nav>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24">
        <section className="flex flex-col items-center text-center mb-24 max-w-4xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
            Gestión Administrativa Especializada
          </span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] mb-8 text-foreground">
            Borramos sus <span className="text-primary">multas</span> legalmente.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl">
            Intermediamos ante las Secretarías de Tránsito para gestionar y sanear legalmente sus
            deudas pendientes. Usted recupera su libertad financiera; nosotros nos encargamos del
            complejo proceso administrativo.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
            <Button
              onClick={() => setIsModalOpen(true)}
              size="lg"
              className="bg-primary text-primary-foreground font-black px-8 h-16 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-[0_0_30px_rgba(234,179,8,0.2)] text-base w-full sm:w-auto"
            >
              SOLICITAR REVISIÓN GRATUITA
              <ArrowRightLeft size={20} />
            </Button>
          </div>
        </section>

        <section className="relative z-10 max-w-4xl mx-auto mb-32">
          {/* Resultados Reales Card Centered */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-yellow-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-card border border-white/10 rounded-3xl p-8 overflow-hidden">
              <div className="flex justify-between items-center mb-6 lg:mb-10">
                <h3 className="font-bold text-xl lg:text-2xl flex items-center gap-3">
                  <CheckCircle2 className="text-primary" size={24} />
                  Resultados Reales
                </h3>
                <span className="text-sm text-muted-foreground uppercase font-bold tracking-widest hidden sm:block">
                  Caso de Éxito
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-4">
                  <div className="relative h-64 bg-muted rounded-2xl border border-red-500/30 overflow-hidden flex items-center justify-center p-4">
                    <span className="absolute top-4 left-4 bg-red-600 text-xs font-bold px-3 py-1 rounded z-10">
                      ANTES
                    </span>
                    {isShowcaseLoading ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" />
                      </div>
                    ) : showcaseData?.beforeImageUrl ? (
                      <Lightbox
                        src={showcaseData.beforeImageUrl}
                        alt="Imagen de un caso de éxito antes de la intervención."
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center p-4">
                        <AlertTriangle className="h-10 w-10 text-slate-500/50 mb-3" />
                        <span className="text-sm text-slate-500 text-center leading-tight">
                          Estado Base no cargado
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-center text-muted-foreground font-medium">
                    Deuda de multas activa
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative h-64 bg-muted rounded-2xl border border-green-500/30 overflow-hidden flex items-center justify-center p-4">
                    <span className="absolute top-4 left-4 bg-green-600 text-xs font-bold px-3 py-1 rounded z-10">
                      DESPUÉS
                    </span>
                    {isShowcaseLoading ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" />
                      </div>
                    ) : showcaseData?.afterImageUrl ? (
                      <Lightbox
                        src={showcaseData.afterImageUrl}
                        alt="Imagen caso de éxito resuelto"
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center p-4">
                        <ShieldCheck className="h-10 w-10 text-slate-500/50 mb-3" />
                        <span className="text-sm text-slate-500 text-center leading-tight">
                          Estado Final no cargado
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-center text-muted-foreground font-medium">
                    Proceso de saneamiento completado exitosamente
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card/30 border border-white/5 rounded-3xl p-8 lg:p-12 mb-32 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>

          <div className="text-center max-w-2xl mx-auto mb-16 relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-white">
              No deje que las <span className="text-primary">multas</span> limiten su vida
            </h2>
            <p className="text-muted-foreground text-lg">
              El tiempo pasa, los intereses de mora crecen y el riesgo de embargos aumenta. Tenemos
              un proceso administrativo claro para devolverle la tranquilidad.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative z-10">
            {/* Paso 1 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col relative group hover:border-red-500/50 transition-colors">
              <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center mb-6">
                <AlertTriangle size={28} />
              </div>
              <h4 className="font-bold text-xl mb-3 text-white">1. El Problema que Crece</h4>
              <p className="text-muted-foreground leading-relaxed text-sm flex-1">
                Las deudas acumuladas en el SIMIT pueden derivar en cobros coactivos y embargos de
                cuentas bancarias. Ignorarlo no elimina la deuda.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col relative group hover:border-yellow-500/50 transition-colors">
              <div className="w-14 h-14 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center mb-6">
                <Search size={28} />
              </div>
              <h4 className="font-bold text-xl mb-3 text-white">2. Estudio Cero Costo</h4>
              <p className="text-muted-foreground leading-relaxed text-sm flex-1">
                Llene nuestro formulario y sus datos serán evaluados <strong>gratuitamente</strong>.
                Determinaremos la viabilidad jurídica para borrar sus deudas.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-2xl flex flex-col relative group hover:border-green-500/50 transition-colors">
              <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck size={28} />
              </div>
              <h4 className="font-bold text-xl mb-3 text-white">3. Saneamiento Exitoso</h4>
              <p className="text-muted-foreground leading-relaxed text-sm flex-1">
                Si su caso es aprobable, realizamos la gestión ante Tránsito. Cotizaremos honorarios
                profesionales ajustados a su favor, cobrando resultados.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black/30 border-t border-white/5 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-12 mb-12">
            {/* Aviso Legal Prioritario */}
            <div className="bg-slate-900/50 border-2 border-slate-700/50 p-6 sm:p-8 rounded-xl shadow-inner relative overflow-hidden w-full">
              <div className="absolute top-0 left-0 w-2 h-full bg-yellow-500"></div>
              <h5 className="text-yellow-500 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-3">
                <AlertTriangle size={18} className="text-yellow-500" />
                Aviso Legal y Declaración Institucional
              </h5>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed text-justify">
                <strong>ACLARATORIA INSTITUCIONAL:</strong> {brandName.toUpperCase()} NO es una
                unidad gubernamental ni firma litigante judicial. Somos una organización privada
                dedicada a la <strong>orientación y gestión de procesos administrativos</strong>{' '}
                ante los diferentes organismos de tránsito a nivel nacional, abogando por el debido
                proceso. Los reportes presentados como casos de éxito corresponden a expedientes
                tramitados efectivamente; sin embargo, no todas las deudas aplican y los resultados
                varían obligatoriamente según el tipo de infracción y tiempo de mora. Toda actuación
                acarrea honorarios profesionales pactados con el cliente tras la revisión de
                viabilidad.
              </p>
            </div>

            {/* Branding y Logo */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary p-2 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                  <ShieldCheck className="text-primary-foreground" size={24} />
                </div>
                <span className="font-black tracking-tighter text-xl uppercase">{brandName}</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Expertos en gestión administrativa de tránsito. Recuperamos la movilidad financiera
                de los conductores colombianos basándonos en el estricto cumplimiento legal.
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5 text-slate-600 text-xs">
            <p>
              © {new Date().getFullYear()} {brandName}. Todos los derechos reservados.
            </p>
            <div className="flex gap-6">
              <Link href="/terminos" className="hover:text-primary transition-colors">
                Términos de Servicio
              </Link>
              <Link href="/terminos" className="hover:text-primary transition-colors">
                Política de Privacidad
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 group">
        <div className="bg-white px-4 py-2 rounded-full text-[11px] text-slate-800 font-bold shadow-xl animate-bounce relative hidden group-hover:block border border-slate-200">
          ¿Dudas? Chat en vivo
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-slate-200 rotate-45"></div>
        </div>
        <button
          onClick={() => setIsWhatsAppWarningOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-transform hover:scale-110 active:scale-95"
          title="Consultar por WhatsApp"
        >
          <MessageCircle size={32} />
        </button>
      </div>

      <Dialog open={isWhatsAppWarningOpen} onOpenChange={setIsWhatsAppWarningOpen}>
        <DialogContent className="w-[95vw] max-w-lg bg-slate-900 border border-primary/20 rounded-[2rem] shadow-2xl p-6 sm:p-8 overflow-hidden">
          <div className="mb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
              <MessageCircle className="text-green-500" size={28} />
              Chat de Asesoría en Vivo
            </DialogTitle>
          </div>
          <div className="space-y-4 text-slate-300">
            <p className="text-sm sm:text-base leading-relaxed">
              Recuerde que el estudio de viabilidad llenando nuestro formulario base es{' '}
              <strong className="text-primary text-base sm:text-lg">completamente gratuito</strong>.
            </p>
            <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center sm:items-start mt-4">
              <Info className="text-primary shrink-0 sm:mt-0.5" size={28} />
              <p className="text-sm leading-relaxed text-center sm:text-left">
                El canal de chat directo está diseñado para iniciar la contratación de trámites. La
                radicación y ejecución administrativa{' '}
                <strong>generan cobro de honorarios profesionales</strong> por resultados.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-8">
            <Button
              variant="ghost"
              onClick={() => setIsWhatsAppWarningOpen(false)}
              className="text-slate-400 hover:text-white w-full sm:w-auto h-auto min-h-12 py-3 whitespace-normal"
            >
              No, prefiero el estudio gratuito
            </Button>
            <Button
              onClick={handleWhatsAppRedirect}
              className="bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto h-auto min-h-12 py-3 whitespace-normal"
            >
              Entendido, abrir Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border border-primary/20 rounded-[2rem] shadow-2xl overflow-hidden p-0">
          <DialogHeader className="px-8 py-6 border-b border-white/5 flex-row justify-between items-center bg-white/5">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="text-primary" size={20} />
              Revisión Gratuita
            </DialogTitle>
          </DialogHeader>
          <div className="p-8">
            <ConsultationForm onClose={() => setIsModalOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
