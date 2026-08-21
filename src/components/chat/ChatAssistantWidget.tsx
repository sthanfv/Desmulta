'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
  Send,
  ArrowRight,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Scale,
  X,
  Camera,
  Calculator,
  FileText,
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
        '¡Hola! Soy tu asistente técnico de Desmulta. Puedo verificar si tu fotomulta cumple con la Ley 1843, calcular fechas de prescripción o validar cámaras autorizadas en tu ciudad.',
      citations: [
        {
          norma: 'Ley 1843 de 2017',
          articulo: 'Art. 8 y 13',
          resumen: 'Exige señalización a 500m y notificación física obligatoria al RUNT.',
        },
      ],
      followUpQuestions: [
        '¿Cómo saber si una fotomulta es legal en mi ciudad?',
        '¿A los cuántos años prescribe un comparendo?',
        '¿Qué hacer si me embargaron la cuenta bancaria?',
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

  const getToolIcon = (tipo: string) => {
    switch (tipo) {
      case 'camaras':
        return <Camera className="w-3.5 h-3.5 text-primary" />;
      case 'calculadora':
        return <Calculator className="w-3.5 h-3.5 text-primary" />;
      case 'plantilla':
        return <FileText className="w-3.5 h-3.5 text-primary" />;
      default:
        return <Scale className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    // Posición calibrada: en móvil queda a bottom-24 (por encima de la barra amarilla sticky) y en desktop a bottom-6
    <div className="fixed bottom-24 left-3.5 sm:bottom-6 sm:left-6 z-[60] flex flex-col items-start font-sans">
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
              className="relative group flex items-center gap-2.5 p-2 sm:px-3.5 sm:py-2.5 rounded-full bg-card/95 dark:bg-zinc-900/95 text-foreground shadow-xl border border-primary/40 hover:border-primary backdrop-blur-xl transition-all duration-300"
              aria-label="Abrir asistente de tránsito Desmulta"
            >
              {/* Ícono de Escudo */}
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 shrink-0">
                <ShieldCheck className="w-4 h-4 text-black" />
              </div>

              <div className="flex flex-col items-start pr-1 text-left hidden sm:flex">
                <span className="text-[11px] font-black tracking-tight text-foreground leading-tight">
                  Asistente Desmulta
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">
                  Especialista en Tránsito
                </span>
              </div>

              {hasUnread && (
                <span className="bg-primary text-primary-foreground text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                  1
                </span>
              )}
            </m.button>
          </LazyMotion>
        )}
      </AnimatePresence>

      {/* ─── Ventana Flotante Compacta y Adaptativa ─── */}
      <AnimatePresence>
        {isOpen && (
          <LazyMotion features={domAnimation}>
            <m.div
              initial={{ opacity: 0, y: 15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="w-[calc(100vw-1.75rem)] sm:w-[360px] h-[450px] max-h-[58vh] sm:max-h-[64vh] flex flex-col rounded-3xl bg-card/98 dark:bg-zinc-950/98 backdrop-blur-2xl border border-border/80 dark:border-primary/25 shadow-2xl shadow-black/40 overflow-hidden text-foreground"
            >
              {/* Encabezado Compacto */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 dark:bg-zinc-900/60 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/25 text-primary">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-tight leading-none text-foreground">
                      Asistente Desmulta
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      Especialista en Tránsito
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Reiniciar conversación"
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Cerrar asistente"
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cuerpo de la Conversación */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 scroll-smooth text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      'flex flex-col ' + (msg.role === 'user' ? 'items-end' : 'items-start')
                    }
                  >
                    <div
                      className={
                        'max-w-[88%] rounded-2xl px-3 py-2 leading-relaxed ' +
                        (msg.role === 'user'
                          ? 'bg-primary text-primary-foreground font-semibold rounded-br-none shadow-sm'
                          : 'bg-muted/70 dark:bg-zinc-900/80 text-foreground border border-border/60 rounded-bl-none shadow-sm')
                      }
                    >
                      <p className="whitespace-pre-wrap text-[11px] sm:text-xs">{msg.content}</p>

                      {/* Citas Normativas (RAG) */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-border/40 space-y-1">
                          <div className="text-[9px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" />
                            Norma:
                          </div>
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="text-[10px] bg-background/60 dark:bg-black/40 p-1.5 rounded-lg border border-border/40"
                            >
                              <div className="font-bold text-primary">
                                {c.norma} — {c.articulo}
                              </div>
                              <div className="text-muted-foreground text-[9px] leading-tight">
                                {c.resumen}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tarjeta de Acción */}
                      {msg.suggestedAction && (
                        <div className="mt-2 p-2 rounded-xl bg-primary/10 border border-primary/25">
                          <div className="text-[10px] font-black text-foreground flex items-center gap-1 mb-0.5">
                            {getToolIcon(msg.suggestedAction.tipo)}
                            {msg.suggestedAction.titulo}
                          </div>
                          <p className="text-[9px] text-muted-foreground mb-1.5 leading-snug">
                            {msg.suggestedAction.descripcion}
                          </p>
                          <Link
                            href={msg.suggestedAction.url}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] transition-all"
                          >
                            Abrir herramienta
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      )}

                      <span
                        className={
                          'text-[8px] block mt-1 ' +
                          (msg.role === 'user' ? 'text-black/60' : 'text-muted-foreground')
                        }
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Pills de preguntas sugeridas */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 max-w-[94%]">
                        {msg.followUpQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(q)}
                            disabled={isLoading}
                            className="text-[10px] font-medium text-left px-2 py-1 rounded-full bg-muted/60 hover:bg-primary/15 text-foreground hover:text-primary border border-border/70 hover:border-primary/40 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Indicador de Carga */}
                {isLoading && (
                  <div className="flex items-center gap-2 p-2 bg-muted/60 rounded-xl rounded-bl-none max-w-[70%] border border-border/50">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span className="text-[10px] text-muted-foreground">
                      Analizando normativa...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pie de Entrada */}
              <div className="p-2 border-t border-border/60 bg-muted/20">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe tu consulta..."
                    disabled={isLoading}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-background border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-transform active:scale-95 shrink-0"
                    aria-label="Enviar"
                  >
                    <Send className="w-3.5 h-3.5 text-black" />
                  </button>
                </form>
              </div>
            </m.div>
          </LazyMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
