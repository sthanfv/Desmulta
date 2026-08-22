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
  AlertCircle,
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
  isRateLimited?: boolean;
  citations?: Citation[];
  suggestedAction?: SuggestedAction | null;
  followUpQuestions?: string[];
  timestamp: string;
}

/**
 * Formateador liviano de Markdown sin dependencias externas pesadas.
 * Convierte encabezados ###, negritas **texto** y viñetas en elementos JSX limpios.
 */
function FormattedMessageText({ text }: { text: string }) {
  // Dividir por saltos de línea para procesar párrafos, encabezados y viñetas
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Encabezados Markdown (### Titulo)
        if (trimmed.startsWith('###')) {
          const titleText = trimmed.replace(/^###\s*/, '');
          return (
            <h4 key={idx} className="font-black text-amber-400 text-sm sm:text-[15px] mt-2 mb-1 tracking-tight">
              {titleText}
            </h4>
          );
        }

        if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
          const titleText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={idx} className="font-black text-amber-400 text-sm sm:text-[15px] mt-2 mb-1 tracking-tight">
              {titleText}
            </h4>
          );
        }

        // Viñetas Markdown (* o -)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletContent = trimmed.replace(/^[-*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1.5 text-[13px] sm:text-[14.5px]">
              <span className="text-amber-400 font-bold mt-0.5">•</span>
              <span>{parseBoldText(bulletContent)}</span>
            </div>
          );
        }

        // Párrafo estándar con negritas
        return (
          <p key={idx} className="text-[13px] sm:text-[14.5px] leading-relaxed">
            {parseBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/** Transforma las marcas **negrita** en etiquetas <strong> estilizadas */
function parseBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} className="text-amber-300 dark:text-amber-400 font-black">
          {boldText}
        </strong>
      );
    }
    return part;
  });
}

export function ChatAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        '¡Hola! Soy tu especialista técnico de Desmulta. Puedo verificar si tu fotomulta cumple con la Ley 1843, calcular fechas de prescripción o validar radares autorizados en tu ciudad.',
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

      const data = await res.json();

      const assistantMsg: Message = {
        id: 'asst-' + Date.now(),
        role: 'assistant',
        content: data.reply || 'No pude procesar la consulta en este momento.',
        isRateLimited: data.isRateLimited || res.status === 429,
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
        suggestedAction: {
          tipo: 'modal_simit',
          titulo: 'Subir Captura para Estudio Técnico',
          url: '#subir-captura',
          descripcion: 'Un operador evaluará tu fotomulta de forma inmediata.',
        },
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

  // Disparador de Modales Directos de Desmulta
  const handleOpenDesmultaModal = (mode: 'full' | 'simit') => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('open-consultation-modal', { detail: { mode } }));
  };

  const getToolIcon = (tipo: string) => {
    switch (tipo) {
      case 'modal_simit':
      case 'camaras':
        return <Camera className="w-3.5 h-3.5 text-primary" />;
      case 'calculadora':
        return <Calculator className="w-3.5 h-3.5 text-primary" />;
      case 'modal_full':
      case 'plantilla':
        return <FileText className="w-3.5 h-3.5 text-primary" />;
      default:
        return <Scale className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <>
      {/* ─── Overlay sutil en Móvil al abrir el Bottom Sheet ─── */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] sm:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

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
                className="relative group flex items-center gap-2.5 p-2 sm:px-3.5 sm:py-2.5 rounded-full bg-card/95 dark:bg-zinc-900/95 text-foreground shadow-2xl border border-primary/40 hover:border-primary backdrop-blur-xl transition-all duration-300"
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

        {/* ─── Ventana / Bottom Sheet del Asistente ─── */}
        <AnimatePresence>
          {isOpen && (
            <LazyMotion features={domAnimation}>
              <m.div
                initial={{ opacity: 0, y: 25, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 25, scale: 0.96 }}
                transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                className="fixed inset-x-0 bottom-0 sm:static w-full sm:w-[380px] h-[64vh] max-h-[490px] sm:h-[490px] flex flex-col rounded-t-[2.2rem] sm:rounded-[2rem] bg-card/98 dark:bg-zinc-950/98 backdrop-blur-3xl border-t sm:border border-border/80 dark:border-primary/25 shadow-2xl shadow-black/60 overflow-hidden text-foreground"
              >
                {/* Tirador visual de Bottom Sheet en Móvil */}
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

                {/* Encabezado del Asistente */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 dark:bg-zinc-900/60 border-b border-border/60 shrink-0">
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleResetChat}
                      title="Reiniciar conversación"
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      title="Cerrar asistente"
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Cuerpo de la Conversación con Formateador Markdown */}
                <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 scroll-smooth">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={
                        'flex flex-col ' + (msg.role === 'user' ? 'items-end' : 'items-start')
                      }
                    >
                      <div
                        className={
                          'max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm transition-all ' +
                          (msg.role === 'user'
                            ? 'bg-primary text-primary-foreground font-semibold rounded-br-none'
                            : msg.isRateLimited
                            ? 'bg-amber-500/10 border border-amber-500/30 text-foreground rounded-bl-none'
                            : 'bg-muted/75 dark:bg-zinc-900/85 text-foreground border border-border/70 rounded-bl-none')
                        }
                      >
                        {/* Mensaje Renderizado con Markdown (Sin # ni **) */}
                        <FormattedMessageText text={msg.content} />

                        {/* Tarjeta de Alerta de Rate Limit con Prueba Social */}
                        {msg.isRateLimited && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-background/80 border border-amber-500/20 text-xs space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-amber-500 dark:text-amber-400 text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Alta Demanda Ciudadana
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              Para garantizar atención ágil a todos los conductores, puedes radicar tu caso directamente para estudio con un operador:
                            </p>
                            <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDesmultaModal('simit')}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] shadow-sm transition-all active:scale-95"
                              >
                                <Camera className="w-3 h-3" />
                                Subir Foto de Multa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDesmultaModal('full')}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold text-[10px] border border-border transition-all active:scale-95"
                              >
                                <FileText className="w-3 h-3" />
                                Estudio Completo
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Citas Normativas (RAG Legal) */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1">
                            <div className="text-[9px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                              <BookOpen className="w-2.5 h-2.5" />
                              Norma de Referencia:
                            </div>
                            {msg.citations.map((c, i) => (
                              <div
                                key={i}
                                className="text-[10px] bg-background/60 dark:bg-black/40 p-2 rounded-lg border border-border/40"
                              >
                                <div className="font-bold text-primary">
                                  {c.norma} — {c.articulo}
                                </div>
                                <div className="text-muted-foreground text-[9px] leading-tight mt-0.5">
                                  {c.resumen}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tarjeta Visual de Herramienta o Modal Desmulta */}
                        {msg.suggestedAction && !msg.isRateLimited && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-primary/10 border border-primary/25">
                            <div className="text-[11px] font-black text-foreground flex items-center gap-1 mb-0.5">
                              {getToolIcon(msg.suggestedAction.tipo)}
                              {msg.suggestedAction.titulo}
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-2 leading-snug">
                              {msg.suggestedAction.descripcion}
                            </p>

                            {/* Si la acción es abrir un modal interno */}
                            {msg.suggestedAction.tipo === 'modal_simit' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDesmultaModal('simit')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] transition-all active:scale-95 shadow-sm"
                              >
                                Subir foto de comparendo
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            ) : msg.suggestedAction.tipo === 'modal_full' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDesmultaModal('full')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] transition-all active:scale-95 shadow-sm"
                              >
                                Radicar estudio formal
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <Link
                                href={msg.suggestedAction.url}
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] transition-all active:scale-95 shadow-sm"
                              >
                                Abrir herramienta
                                <ArrowRight className="w-2.5 h-2.5" />
                              </Link>
                            )}
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
                              className="text-[10px] font-medium text-left px-2.5 py-1 rounded-full bg-muted/60 hover:bg-primary/15 text-foreground hover:text-primary border border-border/70 hover:border-primary/40 transition-all active:scale-95 disabled:opacity-50"
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
                    <div className="flex items-center gap-2 p-2.5 bg-muted/60 rounded-xl rounded-bl-none max-w-[75%] border border-border/50">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary animate-pulse" />
                      <span className="text-[11px] text-muted-foreground">
                        Consultando bases de tránsito...
                      </span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Pie de Entrada */}
                <div className="p-2.5 border-t border-border/60 bg-muted/20 shrink-0">
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
                      placeholder="Pregunta sobre comparendos, prescripción..."
                      disabled={isLoading}
                      className="flex-1 px-3 py-2 text-[13px] sm:text-[14.5px] rounded-xl bg-background border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      className="p-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-transform active:scale-95 shrink-0 shadow-sm"
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
    </>
  );
}