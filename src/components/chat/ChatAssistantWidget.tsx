'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { Send, ArrowRight, RotateCcw, BookOpen, ShieldCheck, Scale, X } from 'lucide-react';
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
        '¡Hola! Soy tu asistente de Desmulta. Puedo ayudarte a verificar la validez técnica de una fotomulta, calcular tiempos de prescripción o comprobar si las cámaras de tu ciudad cuentan con aval de la ANSV.',
      citations: [
        {
          norma: 'Ley 1843 de 2017',
          articulo: 'Art. 8 y 13',
          resumen: 'Regulación de sistemas automáticos y notificación en dirección del RUNT.',
        },
      ],
      followUpQuestions: [
        '¿Cómo verificar si una fotomulta en Bogotá o Medellín es legal?',
        '¿A los cuántos años prescribe un comparendo?',
        '¿Qué hacer si me embargaron la cuenta bancaria por una multa?',
      ],
      timestamp: 'Ahora',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final al recibir mensajes
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
          'En Colombia, las fotomultas exigen plena identificación del conductor (Sentencia C-038/2020) y notificación formal en la dirección del RUNT (Ley 1843/2017). Si tu comparendo tiene más de 3 años sin mandamiento de pago, aplica prescripción bajo el Art. 159 del CNT.',
        citations: [
          {
            norma: 'Ley 1843 de 2017',
            articulo: 'Art. 8',
            resumen: 'Notificación física obligatoria al domicilio registrado en el RUNT.',
          },
        ],
        followUpQuestions: [
          '¿Cómo saber si la dirección del RUNT fue respetada?',
          '¿Qué trámite procede ante un embargo de cuenta?',
        ],
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
          'Conversación reiniciada. ¿En qué comparendo, fotomulta o trámite de tránsito te puedo orientar hoy?',
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
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start font-sans">
      {/* ─── Botón Flotante de Apertura (Esquina Inferior Izquierda - Zero Colisión con WhatsApp) ─── */}
      <AnimatePresence>
        {!isOpen && (
          <LazyMotion features={domAnimation}>
            <m.button
              type="button"
              onClick={() => setIsOpen(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative group flex items-center gap-3 px-4 py-3.5 rounded-full bg-card/90 dark:bg-zinc-900/90 hover:bg-card text-foreground shadow-2xl shadow-black/40 border border-primary/40 hover:border-primary backdrop-blur-xl transition-all duration-300"
              aria-label="Abrir asistente de tránsito Desmulta"
            >
              {/* Ícono de Escudo con Lupa/Acento de Marca */}
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <ShieldCheck className="w-5 h-5 text-black" />
              </div>

              <div className="flex flex-col items-start pr-1 text-left hidden sm:flex">
                <span className="text-xs font-black tracking-tight text-foreground flex items-center gap-1">
                  Asistente Desmulta
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Especialista en Tránsito
                </span>
              </div>

              {hasUnread && (
                <span className="bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  1
                </span>
              )}
            </m.button>
          </LazyMotion>
        )}
      </AnimatePresence>

      {/* ─── Ventana Flotante del Asistente (Estilo Sobrio de Marca Desmulta) ─── */}
      <AnimatePresence>
        {isOpen && (
          <LazyMotion features={domAnimation}>
            <m.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[92vw] sm:w-[410px] h-[580px] max-h-[82vh] flex flex-col rounded-3xl bg-card/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-border/80 shadow-2xl shadow-black/60 overflow-hidden"
            >
              {/* Encabezado del Asistente */}
              <div className="flex items-center justify-between px-5 py-4 bg-muted/40 dark:bg-zinc-900/60 border-b border-border/60 text-foreground">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-foreground">
                      Asistente Desmulta
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Especialista Técnico en Tránsito
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Reiniciar conversación"
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Cerrar asistente"
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Cuerpo de la Conversación */}
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
                          ? 'bg-primary text-primary-foreground font-semibold rounded-br-none shadow-md shadow-primary/20'
                          : 'bg-muted/70 dark:bg-zinc-900/80 text-foreground border border-border/60 rounded-bl-none shadow-sm')
                      }
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Citas Normativas (RAG Legal) */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border/50 space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-primary" />
                            Fundamento Normativo:
                          </div>
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="text-[11px] bg-background/80 dark:bg-black/40 p-2.5 rounded-xl border border-border/50"
                            >
                              <div className="font-bold text-primary">
                                {c.norma} — {c.articulo}
                              </div>
                              <div className="text-muted-foreground text-[10px] mt-0.5 leading-snug">
                                {c.resumen}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sugerencia Hacia Herramientas de Desmulta */}
                      {msg.suggestedAction && (
                        <div className="mt-3 p-3 rounded-2xl bg-primary/10 border border-primary/30">
                          <div className="text-[11px] font-black text-foreground flex items-center gap-1.5 mb-1">
                            <Scale className="w-3.5 h-3.5 text-primary" />
                            {msg.suggestedAction.titulo}
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2.5 leading-relaxed">
                            {msg.suggestedAction.descripcion}
                          </p>
                          <Link
                            href={msg.suggestedAction.url}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[11px] shadow-sm transition-all active:scale-95"
                          >
                            Abrir herramienta
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}

                      <span
                        className={
                          'text-[9px] block mt-1.5 ' +
                          (msg.role === 'user' ? 'text-black/70' : 'text-muted-foreground')
                        }
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Preguntas de Sugerencia Rápida (Pills) */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                        {msg.followUpQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(q)}
                            disabled={isLoading}
                            className="text-[11px] font-medium text-left px-3 py-1.5 rounded-full bg-muted/60 hover:bg-primary/15 text-foreground hover:text-primary border border-border/70 hover:border-primary/40 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Indicador de Análisis */}
                {isLoading && (
                  <div className="flex items-center gap-2 p-3 bg-muted/60 dark:bg-zinc-900/60 rounded-2xl rounded-bl-none max-w-[75%] border border-border/50">
                    <ShieldCheck className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-xs text-muted-foreground">
                      Analizando normativa de tránsito...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pie con Formulario de Entrada */}
              <div className="p-3 border-t border-border/60 bg-muted/20">
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
                    placeholder="Pregunta sobre comparendos, fotomultas, prescripción..."
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-background border border-border/80 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-transform active:scale-95 shrink-0 shadow-sm"
                    aria-label="Enviar consulta"
                  >
                    <Send className="w-4 h-4 text-black" />
                  </button>
                </form>
                <p className="text-[9px] text-muted-foreground text-center mt-1.5 leading-tight">
                  Orientación técnica informativa según normativa colombiana. No constituye
                  representación legal.
                </p>
              </div>
            </m.div>
          </LazyMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
