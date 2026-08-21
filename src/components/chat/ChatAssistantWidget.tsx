'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

interface Citation {
  norma: string;
  articulo: string;
  resumen: string;
}

interface SuggestedAction {
  tipo: string;
  titulo: string;
  url: string;
  descripcion: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggestedAction?: SuggestedAction | null;
  followUpQuestions?: string[];
  timestamp: string;
}

export function ChatAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        '¡Hola! Soy el Asistente Jurídico de Desmulta. Puedo verificar si tu fotomulta es legal, calcular cuándo prescribe un comparendo o consultar si el radar de tu ciudad tiene permiso de la ANSV.',
      citations: [
        {
          norma: 'Ley 1843 de 2017',
          articulo: 'Art. 8 y 13',
          resumen: 'Regulación de fotomultas y señalización a 500m.',
        },
      ],
      followUpQuestions: [
        '¿Cómo saber si una fotomulta es legal en Bogotá?',
        '¿Cuándo prescribe una multa de tránsito?',
        '¿Qué pasa si me embargaron la cuenta bancaria?',
      ],
      timestamp: 'Ahora',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final cuando llegan mensajes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Foco al abrir
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsgId = 'user-' + Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      // Historial para contexto conversacional
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-1')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: 'asst-' + Date.now(),
        role: 'assistant',
        content: data.reply || 'No pude procesar la consulta en este momento.',
        citations: data.citations || [],
        suggestedAction: data.suggested_action || null,
        followUpQuestions: data.follow_up_questions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[ChatWidget] Error enviando mensaje:', err);
      const fallbackMsg: Message = {
        id: 'asst-' + Date.now(),
        role: 'assistant',
        content:
          'En Colombia, las fotomultas exigen plena identificación del conductor (Sentencia C-038/2020) y notificación formal en la dirección del RUNT (Ley 1843/2017). Si tu caso tiene más de 3 años sin cobro coactivo, ya prescribió bajo el Art. 159 del CNT.',
        citations: [
          {
            norma: 'Ley 1843 de 2017',
            articulo: 'Art. 8',
            resumen: 'Notificación obligatoria.',
          },
        ],
        followUpQuestions: ['¿Cómo calcular si ya prescribió?', '¿Qué hacer si me embargaron?'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content:
          'Conversación reiniciada. ¿En qué comparendo, fotomulta o trámite de tránsito te puedo asesorar hoy?',
        followUpQuestions: [
          '¿Cómo saber si una fotomulta es legal?',
          '¿Cuándo prescribe una multa de tránsito?',
          '¿Qué pasa si me embargaron la cuenta bancaria?',
        ],
        timestamp: 'Ahora',
      },
    ]);
  };

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}>
      {/* ─── Botón Flotante de Apertura (Trigger) ─── */}
      <AnimatePresence>
        {!isOpen && (
          <LazyMotion features={domAnimation}>
            <m.button
              type="button"
              onClick={() => setIsOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative group flex items-center gap-3 px-4 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-900/30 border border-emerald-400/30 transition-all duration-300"
              aria-label="Abrir asistente de multas"
            >
              <div className="relative">
                <Bot className="w-6 h-6 animate-pulse text-white" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-200"></span>
                </span>
              </div>
              <span className="text-sm font-bold tracking-tight pr-1 hidden sm:inline-block">
                Asistente Jurídico IA
              </span>
              {hasUnread && (
                <span className="bg-amber-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                  1
                </span>
              )}
            </m.button>
          </LazyMotion>
        )}
      </AnimatePresence>

      {/* ─── Ventana Flotante del Chatbot ─── */}
      <AnimatePresence>
        {isOpen && (
          <LazyMotion features={domAnimation}>
            <m.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[92vw] sm:w-[410px] h-[590px] max-h-[85vh] flex flex-col rounded-3xl bg-background/95 backdrop-blur-2xl border border-border/80 shadow-2xl shadow-black/40 overflow-hidden"
            >
              {/* Encabezado del Chat */}
              <div className="flex items-center justify-between px-5 py-4 bg-emerald-600 dark:bg-emerald-950/60 border-b border-emerald-500/30 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                    <Bot className="w-5 h-5 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                      Asistente Desmulta
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    </h3>
                    <p className="text-[11px] text-emerald-100/90 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                      En línea · Especialista en Tránsito
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Reiniciar conversación"
                    className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Cerrar chat"
                    className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Cuerpo del Chat (Mensajes) */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 scroll-smooth">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      'flex flex-col ' + (msg.role === 'user' ? 'items-end' : 'items-start')
                    }
                  >
                    <div
                      className={
                        'max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ' +
                        (msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-900/20'
                          : 'bg-muted/70 dark:bg-zinc-900/80 text-foreground border border-border/60 rounded-bl-none shadow-sm')
                      }
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Citas Legales */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Fundamento Legal:
                          </div>
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="text-[11px] bg-background/60 dark:bg-black/30 p-2 rounded-lg border border-border/40"
                            >
                              <div className="font-semibold text-primary">
                                {c.norma} — {c.articulo}
                              </div>
                              <div className="text-muted-foreground text-[10px] mt-0.5 leading-snug">
                                {c.resumen}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sugerencia Comercial / CTA hacia Desmulta */}
                      {msg.suggestedAction && (
                        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mb-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {msg.suggestedAction.titulo}
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            {msg.suggestedAction.descripcion}
                          </p>
                          <Link
                            href={msg.suggestedAction.url}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                          >
                            Ir a la herramienta
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}

                      <span
                        className={
                          'text-[9px] block mt-1.5 ' +
                          (msg.role === 'user' ? 'text-emerald-100' : 'text-muted-foreground')
                        }
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Preguntas Sugeridas de Seguimiento (Pills) */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                        {msg.followUpQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(q)}
                            disabled={isLoading}
                            className="text-[11px] font-medium text-left px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                          >
                            💡 {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Indicador de Escritura */}
                {isLoading && (
                  <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-2xl rounded-bl-none max-w-[70%] border border-border/40">
                    <Bot className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span className="text-xs text-muted-foreground animate-pulse">
                      Consultando bases jurídicas...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pie con Formulario de Entrada */}
              <div className="p-3 border-t border-border/60 bg-muted/30">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe tu pregunta sobre fotomultas o comparendos..."
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-background border border-border/80 focus:outline-none focus:border-emerald-500 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors shrink-0"
                    aria-label="Enviar mensaje"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <p className="text-[9px] text-muted-foreground text-center mt-1.5">
                  Orientación pedagógica y jurídica bajo la ley colombiana.
                </p>
              </div>
            </m.div>
          </LazyMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
