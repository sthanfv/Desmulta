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
        '¡Hola! Soy tu especialista técnico de Desmulta. Puedo verificar si tu fotomulta cumple con la Ley 1843, calcular fechas de prescripción o validar cámaras autorizadas en tu ciudad directamente aquí.',
      citations: [
        {
          norma: 'Ley 1843 de 2017',
          articulo: 'Art. 8 y 13',
          resumen: 'Exige señalización a 500m y notificación física obligatoria al RUNT.',
        },
      ],
      followUpQuestions: [
        '¿Cómo saber si una fotomulta en Bogotá o Medellín es legal?',
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

  // Helper para renderizar ícono de la herramienta
  const getToolIcon = (tipo: string) => {
    switch (tipo) {
      case 'camaras':
        return <Camera className="w-4 h-4 text-amber-400" />;
      case 'calculadora':
        return <Calculator className="w-4 h-4 text-amber-400" />;
      case 'plantilla':
        return <FileText className="w-4 h-4 text-amber-400" />;
      default:
        return <Scale className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 z-[60] flex flex-col items-start font-sans">
      {/* ─── Botón Flotante de Apertura (Trigger en Esquina Izquierda) ─── */}
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
              className="relative group flex items-center gap-3 px-4 py-3 rounded-full bg-zinc-950/90 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.18)] border border-amber-500/40 hover:border-amber-400 backdrop-blur-2xl transition-all duration-300"
              aria-label="Abrir asistente de tránsito Desmulta"
            >
              {/* Ícono de Escudo con relieve en oro */}
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-black shadow-lg shadow-amber-500/30">
                <ShieldCheck className="w-5 h-5 text-zinc-950" />
              </div>

              <div className="flex flex-col items-start pr-1 text-left hidden sm:flex">
                <span className="text-xs font-black tracking-tight text-zinc-100 flex items-center gap-1">
                  Asistente Desmulta
                </span>
                <span className="text-[10px] text-amber-400/90 font-medium">
                  Especialista en Tránsito
                </span>
              </div>

              {hasUnread && (
                <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                  1
                </span>
              )}
            </m.button>
          </LazyMotion>
        )}
      </AnimatePresence>

      {/* ─── Ventana Flotante del Asistente (Glassmorphism Ámbar Premium) ─── */}
      <AnimatePresence>
        {isOpen && (
          <LazyMotion features={domAnimation}>
            <m.div
              initial={{ opacity: 0, y: 25, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.94 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-[calc(100vw-2rem)] sm:w-[390px] h-[520px] max-h-[75vh] flex flex-col rounded-[2rem] bg-zinc-950/95 dark:bg-zinc-950/95 backdrop-blur-3xl border border-amber-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.12)] overflow-hidden"
            >
              {/* Encabezado Premium con Luz Ambiental */}
              <div className="relative flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-amber-500/20 text-zinc-100">
                <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-zinc-100 flex items-center gap-1.5">
                      Asistente <span className="text-amber-400 italic">Desmulta</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse"></span>
                      Especialista Técnico en Tránsito
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Reiniciar conversación"
                    className="p-1.5 text-zinc-400 hover:text-amber-300 hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Cerrar asistente"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Cuerpo de la Conversación */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 scroll-smooth bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-zinc-950 to-zinc-950">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      'flex flex-col ' + (msg.role === 'user' ? 'items-end' : 'items-start')
                    }
                  >
                    <div
                      className={
                        'max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed transition-all ' +
                        (msg.role === 'user'
                          ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-zinc-950 font-bold rounded-br-none shadow-lg shadow-amber-500/20'
                          : 'bg-zinc-900/90 text-zinc-100 border border-zinc-800/90 rounded-bl-none shadow-md backdrop-blur-md')
                      }
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Citas Normativas (RAG Legal) */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            Fundamento Normativo:
                          </div>
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="text-[11px] bg-zinc-950/80 p-2.5 rounded-xl border border-amber-500/20 shadow-inner"
                            >
                              <div className="font-bold text-amber-300">
                                {c.norma} — {c.articulo}
                              </div>
                              <div className="text-zinc-400 text-[10px] mt-0.5 leading-snug">
                                {c.resumen}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tarjeta Visual de Herramienta Desmulta */}
                      {msg.suggestedAction && (
                        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 to-transparent border border-amber-500/30 shadow-inner">
                          <div className="text-[11px] font-black text-amber-300 flex items-center gap-1.5 mb-1">
                            {getToolIcon(msg.suggestedAction.tipo)}
                            {msg.suggestedAction.titulo}
                          </div>
                          <p className="text-[10px] text-zinc-300 mb-2.5 leading-relaxed">
                            {msg.suggestedAction.descripcion}
                          </p>
                          <Link
                            href={msg.suggestedAction.url}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-[11px] shadow-md shadow-amber-500/20 transition-all active:scale-95"
                          >
                            Abrir herramienta
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}

                      <span
                        className={
                          'text-[9px] block mt-1.5 ' +
                          (msg.role === 'user' ? 'text-zinc-950/70 font-medium' : 'text-zinc-500')
                        }
                      >
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Preguntas de Sugerencia Rápida (Pills Interactivas) */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-w-[92%]">
                        {msg.followUpQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(q)}
                            disabled={isLoading}
                            className="text-[11px] font-medium text-left px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-amber-500/15 text-zinc-300 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/40 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-sm"
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
                  <div className="flex items-center gap-2.5 p-3 bg-zinc-900/90 rounded-2xl rounded-bl-none max-w-[80%] border border-zinc-800">
                    <ShieldCheck className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs text-zinc-400">
                      Calculando viabilidad y normativa...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pie con Formulario de Entrada */}
              <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/90">
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
                    placeholder="Pregunta sobre comparendos, prescripción..."
                    disabled={isLoading}
                    className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-zinc-100 placeholder:text-zinc-500 disabled:opacity-50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 disabled:opacity-40 transition-all active:scale-95 shrink-0 shadow-md shadow-amber-500/20"
                    aria-label="Enviar consulta"
                  >
                    <Send className="w-4 h-4 text-zinc-950" />
                  </button>
                </form>
                <p className="text-[9px] text-zinc-500 text-center mt-1.5 leading-tight">
                  Orientación técnica informativa según normativa colombiana.
                </p>
              </div>
            </m.div>
          </LazyMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
