/**
 * TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO
 * DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’
 *
 * Contenedor Principal del Chat Pro v4.0.3
 * Integración Contextual Suave + Posicionamiento Táctico + Tooltip iOS
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, ShieldCheck, MessageCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { sendMessage } from '@/app/actions';
import { cn } from '@/lib/utils';

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    {
      role: 'model',
      text: 'Hola, soy el Asistente Inteligente de Desmulta. He analizado miles de casos con éxito; cuénteme su situación y le diré cómo podemos recuperar su tranquilidad vial.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detección de Scroll para mostrar en FAQ con salida suave
  useEffect(() => {
    const handleScroll = () => {
      const faqSection = document.getElementById('faq-section');
      if (faqSection) {
        const rect = faqSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Aparece suavemente al acercarse a FAQ y desaparece al alejarse mucho
        if (rect.top < windowHeight - 100 && rect.bottom > 100) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check inicial
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (messageCount >= 5) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setIsLoading(true);
    setMessageCount((prev) => prev + 1);

    const result = await sendMessage(text);

    if (result.success && result.text) {
      setMessages((prev) => [...prev, { role: 'model', text: result.text! }]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text:
            result.error ||
            'Estamos analizando un alto volumen de casos. Por favor, reintente en 30 segundos.',
        },
      ]);
    }

    setIsLoading(false);
  };

  return (
    <div
      className={cn(
        'fixed bottom-8 left-8 z-[100] flex flex-col items-start transition-all duration-1000 ease-in-out transform',
        isVisible
          ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
          : 'opacity-0 -translate-x-20 scale-50 pointer-events-none'
      )}
    >
      {/* Tooltip Táctico Pro - Solo visible si no está abierto */}
      {!isOpen && isVisible && (
        <div className="mb-4 bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl shadow-xl animate-in fade-in slide-in-from-left-4 duration-1000 delay-500">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <ShieldCheck size={12} />
            ¿Dudas sobre su caso? Analícelo aquí
          </p>
        </div>
      )}

      {/* Ventana de Chat - iOS Glass Aesthetic */}
      {isOpen && (
        <div className="mb-4 w-[350px] md:w-[400px] h-[550px] max-h-[70vh] bg-white/70 dark:bg-black/40 backdrop-blur-[30px] border border-white/40 dark:border-white/10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in slide-in-from-bottom-12 fade-in duration-500 ring-1 ring-black/5 origin-bottom-left">
          {/* Header Premium */}
          <div className="p-6 bg-primary/95 dark:bg-primary/80 backdrop-blur-md text-primary-foreground flex justify-between items-center border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-2xl shadow-inner">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest leading-none text-white">
                  Asistente Inteligente
                </h3>
                <span className="text-[10px] opacity-80 font-bold text-white/70">
                  Protocolos de Éxito Desmulta
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-all active:scale-90 text-white"
            >
              <Minus size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} text={msg.text} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/50 dark:bg-white/10 backdrop-blur-sm p-4 rounded-[2rem] rounded-tl-none text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                  Analizando su caso...
                </div>
              </div>
            )}
            {messageCount >= 5 && (
              <div className="flex flex-col items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                <AlertCircle className="text-amber-500" size={20} />
                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Límite de asesoría gratuita alcanzado. <br />
                  Inicia tu estudio formal para continuar.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[9px] font-black rounded-full mt-2"
                  onClick={() => (window.location.href = '/?action=consultar')}
                >
                  ESTUDIO GRATUITO
                </Button>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className={cn('p-4', messageCount >= 5 && 'opacity-50 pointer-events-none')}>
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
            <div className="mt-2 text-center text-[8px] font-black uppercase tracking-widest opacity-30">
              {messageCount}/5 consultas realizadas
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button - iOS Dynamic Look Posicionado a la Izquierda */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-16 h-16 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] transition-all duration-700 active:scale-90 flex items-center justify-center p-0 border-none group overflow-hidden',
          isOpen
            ? 'bg-white/80 dark:bg-black/60 backdrop-blur-xl text-foreground'
            : 'bg-primary text-primary-foreground hover:scale-110 active:rotate-12'
        )}
      >
        {isOpen ? (
          <X size={24} className="animate-in spin-in-90 duration-500" />
        ) : (
          <div className="relative">
            <MessageCircle size={28} className="relative z-10" />
            <div className="absolute inset-0 bg-white/30 rounded-full blur-xl scale-150 animate-ping opacity-0 group-hover:opacity-100" />
          </div>
        )}
      </Button>
    </div>
  );
}
