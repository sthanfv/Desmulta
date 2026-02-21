'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  ArrowRightLeft,
  CheckCircle2,
  Search,
  Info,
  AlertTriangle,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConsultationForm } from '@/components/vial-clear/ConsultationForm';
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
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Saneamiento Vial';

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

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      `Hola, vengo de la web de ${brandName}. Deseo el estudio de viabilidad gratuito para mis multas.`
    );
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573000000000';
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
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
        <section className="grid lg:grid-cols-2 gap-12 items-center mb-32">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              Gestión Administrativa Especializada
            </span>
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] mb-8 text-foreground">
              Borramos sus <span className="text-primary">multas</span> legalmente.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              Intermediamos ante las Secretarías de Tránsito para aplicar la prescripción de deudas
              antiguas. Usted recupera su libertad financiera; nosotros nos encargamos del papeleo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="bg-primary text-primary-foreground font-black px-8 h-16 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-lg shadow-yellow-500/20 text-base"
              >
                SOLICITAR REVISIÓN GRATIS
                <ArrowRightLeft size={20} />
              </Button>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-yellow-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-card border border-white/10 rounded-3xl p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <CheckCircle2 className="text-primary" size={20} />
                  Resultados Reales
                </h3>
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                  Caso de Éxito
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="relative h-48 bg-muted rounded-xl border border-red-500/30 overflow-hidden flex items-center justify-center p-4">
                    <span className="absolute top-2 left-2 bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded z-10">
                      ANTES
                    </span>
                    {isShowcaseLoading ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" />
                      </div>
                    ) : (
                      <Image
                        src={
                          showcaseData?.beforeImageUrl ||
                          'https://picsum.photos/seed/before/600/400'
                        }
                        alt="Imagen de un caso de éxito antes de la intervención."
                        fill
                        className="object-cover"
                        data-ai-hint="debt screen"
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Deuda de multas activa
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="relative h-48 bg-muted rounded-xl border border-green-500/30 overflow-hidden flex items-center justify-center p-4">
                    <span className="absolute top-2 left-2 bg-green-600 text-[10px] font-bold px-2 py-0.5 rounded z-10">
                      DESPUÉS
                    </span>
                    {isShowcaseLoading ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" />
                      </div>
                    ) : (
                      <Image
                        src={
                          showcaseData?.afterImageUrl || 'https://picsum.photos/seed/after/600/400'
                        }
                        alt="Imagen del mismo caso de éxito después de la intervención, mostrando paz y salvo."
                        fill
                        className="object-cover"
                        data-ai-hint="clear screen"
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground">
                    Resolución de prescripción aplicada
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card/50 border border-white/5 rounded-3xl p-8 lg:p-12 mb-32">
          <h2 className="text-3xl font-bold mb-10 text-center text-primary">
            ¿Cómo funciona nuestro servicio?
          </h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 items-center">
            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                <div className="bg-white/5 p-3 rounded-xl h-fit">
                  <Search className="text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-2">1. Estudio Inicial (Cero Costo)</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Analizamos su historial en el SIMIT sin cobrarle un solo peso. Determinamos qué
                    deudas aplican para eliminación legal inmediata.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-white/5 p-3 rounded-xl h-fit">
                  <ShieldCheck className="text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-xl mb-2">2. Gestión Profesional</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Si su caso es viable, se le informará el costo de nuestra gestión. No cobramos
                    por la información, cobramos por el éxito administrativo de su proceso.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 p-8 rounded-2xl flex flex-col justify-center">
              <h4 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Info size={20} className="text-primary" />
                Nota importante
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed italic">
                "El estudio de viabilidad es una cortesía para identificar oportunidades. La
                ejecución de trámites administrativos, radicación de memoriales y seguimiento ante
                las autoridades conlleva honorarios profesionales que se ajustan según la
                complejidad y cuantía del saneamiento."
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black/30 border-t border-white/5 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-12 items-start">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary p-1.5 rounded-md">
                  <ShieldCheck className="text-primary-foreground" size={20} />
                </div>
                <span className="font-bold tracking-tighter text-lg uppercase">{brandName}</span>
              </div>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                Expertos en gestión administrativa de tránsito. Recuperamos la movilidad financiera
                de los conductores colombianos basándonos en la normativa vigente de prescripción y
                caducidad.
              </p>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-2xl">
              <h5 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle size={14} />
                Aviso Legal Importante
              </h5>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                <strong>DESCARGO DE RESPONSABILIDAD:</strong> {brandName.toUpperCase()} NO es una
                firma de abogados ni pretende ejercer la abogacía. Somos una empresa de{' '}
                <strong>intermediación y gestión administrativa</strong> ante organismos de
                tránsito. Nuestra labor se limita a la radicación y seguimiento de derechos de
                petición y recursos administrativos fundamentados en leyes de tránsito. Los
                resultados pueden variar según el organismo de tránsito y la situación particular
                del comparendo. No garantizamos el éxito en todos los casos, aunque contamos con una
                alta tasa de efectividad basada en jurisprudencia administrativa.
              </p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5 text-slate-600 text-xs">
            <p>© 2024 {brandName}. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-primary transition-colors">
                Términos de Servicio
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Política de Privacidad
              </a>
            </div>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <div className="bg-slate-900 border border-primary/30 px-4 py-2 rounded-xl text-[10px] text-primary font-bold shadow-2xl animate-bounce">
          ¿Dudas? Chat en vivo
        </div>
        <button
          onClick={handleWhatsAppClick}
          className="bg-green-500 hover:bg-green-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-transform hover:scale-110 active:scale-95"
          title="Consultar por WhatsApp"
        >
          <MessageCircle size={32} />
        </button>
      </div>

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
