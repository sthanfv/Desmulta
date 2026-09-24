'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import {
  Send,
  ArrowRight,
  RotateCcw,
  BookOpen,
  MessageSquareQuote,
  Scale,
  X,
  Camera,
  Calculator,
  FileText,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { buildWhatsAppUrl } from '@/lib/chat/whatsapp';
import { STARTER_QUESTIONS } from '@/lib/chat/small-talk';
import { OPEN_ASSISTANT_EVENT } from '@/components/mobile/app-shell';

// Memoria de la conversación entre páginas / recargas (solo esta pestaña; sin datos en servidor)
const CHAT_STORAGE_KEY = 'desmulta-chat-v1';
const MAX_STORED_MESSAGES = 30;
const HISTORY_SENT_TO_AGENT = 10;

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
  isTyping?: boolean;
  citations?: Citation[];
  suggestedAction?: SuggestedAction | null;
  followUpQuestions?: string[];
  timestamp: string;
}

type FontScale = 'normal' | 'large' | 'xlarge';

/** Función utilitaria para formatear la hora en formato civil estándar (12h con a.m. / p.m.) */
function getCivilTimeString(): string {
  return new Date().toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formateador liviano de Markdown sin dependencias externas pesadas.
 * Convierte encabezados ###, negritas **texto** y viñetas en elementos JSX limpios y escalables.
 */
function FormattedMessageTextStatic({ text, fontScale }: { text: string; fontScale: FontScale }) {
  const lines = text.split('\n');

  const getTitleSizeClass = () => {
    if (fontScale === 'xlarge') return 'text-base sm:text-lg leading-snug';
    if (fontScale === 'large') return 'text-sm sm:text-base leading-snug';
    return 'text-xs sm:text-[14px] leading-snug';
  };

  const getBodySizeClass = () => {
    if (fontScale === 'xlarge') return 'text-[15px] sm:text-[17px] leading-loose tracking-normal';
    if (fontScale === 'large')
      return 'text-[14px] sm:text-[15.5px] leading-relaxed tracking-normal';
    return 'text-[13px] sm:text-[14px] leading-relaxed tracking-normal';
  };

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Encabezados Markdown (### Titulo)
        if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('#')) {
          const titleText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4
              key={idx}
              className={`font-black text-amber-400 mt-2.5 mb-1 tracking-tight ${getTitleSizeClass()}`}
            >
              {titleText}
            </h4>
          );
        }

        // Viñetas Markdown (* o -)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletContent = trimmed.replace(/^[-*]\s*/, '');
          return (
            <div key={idx} className={`flex items-start gap-1.5 pl-1.5 ${getBodySizeClass()}`}>
              <span className="text-amber-400 font-bold mt-0.5">•</span>
              <span>{parseBoldText(bulletContent)}</span>
            </div>
          );
        }

        // Párrafo estándar con negritas
        return (
          <p key={idx} className={getBodySizeClass()}>
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

function FormattedMessageText({
  text,
  fontScale,
  isTyping,
}: {
  text: string;
  fontScale: FontScale;
  isTyping?: boolean;
}) {
  const [displayedText, setDisplayedText] = useState(isTyping ? '' : text);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(text);
      return;
    }

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.slice(0, currentIndex + 5));
      currentIndex += 5;
      if (currentIndex >= text.length) {
        clearInterval(intervalId);
        setDisplayedText(text);
      }
    }, 20);

    return () => clearInterval(intervalId);
  }, [text, isTyping]);

  return <FormattedMessageTextStatic text={displayedText} fontScale={fontScale} />;
}

export function ChatAssistantWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>('normal');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        '¡Hola! 👋 Soy el asistente de Desmulta. Cuéntame qué pasó con tu multa o comparendo y lo revisamos juntos.',
      citations: [],
      followUpQuestions: STARTER_QUESTIONS,
      timestamp: 'Ahora',
    },
  ]);
  const [restored, setRestored] = useState(false);

  // Restaurar la conversación tras montar (no en el render inicial: evita desajustes de hidratación)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // Almacenamiento no disponible (modo privado / bloqueado): se sigue sin memoria local
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      const toStore = messages
        .slice(-MAX_STORED_MESSAGES)
        .map((msg) => ({ ...msg, isTyping: false }));
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // Cuota llena o almacenamiento bloqueado: no es crítico
    }
  }, [messages, restored]);

  // Pestaña "Asistente" del modo app: evento en Inicio o ?action=asistente desde otra página
  useEffect(() => {
    const open = () => setIsOpen(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'asistente') {
      open();
      window.history.replaceState({}, '', window.location.pathname);
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, open);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, open);
  }, []);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setThinkingStep((prev) => (prev + 1) % 4);
      }, 1800);
      return () => clearInterval(interval);
    } else {
      setThinkingStep(0);
    }
  }, [isLoading]);

  const thinkingMessages = [
    'Escribiendo...',
    'Revisando tu pregunta...',
    'Buscando la mejor forma de explicarte...',
    'Ya casi...',
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final al recibir mensajes o cambiar escala
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, fontScale]);

  // Foco al abrir
  useEffect(() => {
    if (isOpen) {
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
      timestamp: getCivilTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      // Historial para contexto conversacional
      const historyPayload = messages
        .filter((m) => !m.id.startsWith('welcome-') && !m.isRateLimited)
        .slice(-HISTORY_SENT_TO_AGENT)
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
        isTyping: true,
        content: data.reply || 'No pude procesar la consulta en este momento.',
        isRateLimited: data.isRateLimited || res.status === 429,
        citations: data.citations || [],
        suggestedAction: data.suggested_action || null,
        followUpQuestions: data.follow_up_questions || [],
        timestamp: getCivilTimeString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[ChatWidget] Error enviando mensaje:', err);
      // Sin conexión con el servidor: mensaje honesto y salida humana (antes: párrafo legal fijo)
      const fallbackMsg: Message = {
        id: 'asst-' + Date.now(),
        role: 'assistant',
        content:
          'Uy, parece que se cayó la conexión y no pude responderte 😕. Revisa tu internet e intenta de nuevo, o escríbenos por WhatsApp y una persona del equipo te ayuda.',
        citations: [],
        suggestedAction: {
          tipo: 'whatsapp',
          titulo: 'Hablar con una persona',
          url: buildWhatsAppUrl(),
          descripcion: 'Nuestro equipo te responde por WhatsApp.',
        },
        followUpQuestions: [],
        timestamp: getCivilTimeString(),
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
        content: '¡Listo, empecemos de nuevo! 😊 ¿En qué te puedo ayudar?',
        citations: [],
        followUpQuestions: STARTER_QUESTIONS,
        timestamp: 'Ahora',
      },
    ]);
  };

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
      case 'whatsapp':
        return <MessageCircle className="w-3.5 h-3.5 text-primary" />;
      case 'modal_full':
      case 'plantilla':
        return <FileText className="w-3.5 h-3.5 text-primary" />;
      default:
        return <Scale className="w-3.5 h-3.5 text-primary" />;
    }
  };

  if (pathname !== '/') {
    return null;
  }

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

      {/* ─── Posición: en móvil a la derecha (right-4) para pulgar, en desktop a la izquierda (left-6) ─── */}
      <div className="chat-widget-container fixed bottom-24 right-4 sm:bottom-6 sm:left-6 z-[60] flex flex-col items-end sm:items-start font-sans transition-all duration-300">
        <LazyMotion features={domAnimation}>
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <m.button
                key="chat-trigger"
                type="button"
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative group hidden md:flex items-center gap-2.5 p-2 sm:px-4 sm:py-2.5 rounded-full bg-card/95 dark:bg-zinc-900/95 text-foreground shadow-2xl border border-primary/40 hover:border-primary backdrop-blur-xl transition-all duration-300"
                aria-label="Abrir asistente de tránsito Desmulta"
              >
                {/* Ícono de Diálogo Conversacional */}
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 shrink-0">
                  <MessageSquareQuote className="w-4 h-4 text-black" />
                </div>

                <div className="flex flex-col items-start pr-1 text-left hidden sm:flex">
                  <span className="text-xs font-black tracking-tight text-foreground leading-tight">
                    Asistente Desmulta
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Especialista en Tránsito
                  </span>
                </div>
              </m.button>
            ) : (
              <m.div
                key="chat-window"
                initial={{ opacity: 0, y: 25, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 25, scale: 0.96 }}
                transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                className="fixed inset-0 md:static w-full md:w-[400px] h-[100dvh] md:h-[510px] md:max-h-[520px] flex flex-col rounded-none md:rounded-[2rem] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:pt-0 md:pb-0 bg-card/98 dark:bg-zinc-950/98 backdrop-blur-3xl md:border border-border/80 dark:border-primary/25 shadow-2xl shadow-black/60 overflow-hidden text-foreground"
              >
                {/* Encabezado del Asistente con Accesibilidad de Tamaño de Letra */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 dark:bg-zinc-900/60 border-b border-border/60 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-primary/10 border border-primary/25 text-primary">
                      <MessageSquareQuote className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black tracking-tight leading-none text-foreground">
                        Asistente Desmulta
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        Especialista en Tránsito
                      </p>
                    </div>
                  </div>

                  {/* Controles de Cabecera: Selector de Letra (A- / A+) + Reset + Cerrar */}
                  <div className="flex items-center gap-1.5">
                    {/* Selector de Accesibilidad Visual (A- / A+) */}
                    <div className="hidden md:flex items-center bg-background/80 dark:bg-zinc-900/90 rounded-lg p-0.5 border border-border/60 shadow-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setFontScale((prev) =>
                            prev === 'xlarge' ? 'large' : prev === 'large' ? 'normal' : 'normal'
                          )
                        }
                        disabled={fontScale === 'normal'}
                        title="Reducir tamaño de letra"
                        className="px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 rounded transition-colors"
                      >
                        A-
                      </button>
                      <span className="text-[9px] font-black px-1 text-primary">
                        {fontScale === 'normal' ? '1x' : fontScale === 'large' ? '1.2x' : '1.4x'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFontScale((prev) =>
                            prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'xlarge'
                          )
                        }
                        disabled={fontScale === 'xlarge'}
                        title="Aumentar tamaño de letra"
                        className="px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 rounded transition-colors"
                      >
                        A+
                      </button>
                    </div>

                    <a
                      href={buildWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Hablar con una persona por WhatsApp"
                      aria-label="Hablar con una persona por WhatsApp"
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
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

                {/* Cuerpo de la Conversación */}
                <div className="flex-1 p-3.5 overflow-y-auto overscroll-contain space-y-3.5 scroll-smooth">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={
                        'flex flex-col ' +
                        (msg.role === 'user' ? 'items-end' : 'items-start w-full')
                      }
                    >
                      <div
                        className={
                          'rounded-2xl px-3.5 py-2.5 shadow-sm transition-all ' +
                          (msg.role === 'user'
                            ? 'max-w-[85%] bg-primary text-primary-foreground font-semibold rounded-br-none'
                            : msg.isRateLimited
                              ? 'w-full bg-amber-500/10 border border-amber-500/30 text-foreground rounded-bl-none'
                              : 'w-full bg-muted/75 dark:bg-zinc-900/85 text-foreground border border-border/70 rounded-bl-none')
                        }
                      >
                        {/* Mensaje Renderizado con Escala Dinámica de Tipografía */}
                        <FormattedMessageText
                          text={msg.content}
                          fontScale={fontScale}
                          isTyping={msg.isTyping}
                        />

                        {/* Tarjeta de Alerta de Rate Limit con Prueba Social */}
                        {msg.isRateLimited && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-background/80 border border-amber-500/20 text-xs space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-amber-500 dark:text-amber-400 text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Mientras tanto, puedes seguir por aquí
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <a
                                href={buildWhatsAppUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] shadow-sm transition-all active:scale-95"
                              >
                                <MessageCircle className="w-3 h-3" />
                                Escribir por WhatsApp
                              </a>
                              <button
                                type="button"
                                onClick={() => handleOpenDesmultaModal('simit')}
                                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-bold text-[10px] border border-border transition-all active:scale-95"
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

                        {/* Citas Normativas (RAG Legal) - Aprovecha el 100% del ancho */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1 w-full">
                            <div className="text-[9px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
                              <BookOpen className="w-2.5 h-2.5" />
                              Norma de Referencia:
                            </div>
                            {msg.citations.map((c, i) => (
                              <div
                                key={i}
                                className="text-[10px] sm:text-[11px] bg-background/60 dark:bg-black/40 p-2.5 rounded-lg border border-border/40 w-full"
                              >
                                <div className="font-bold text-primary">
                                  {c.norma} — {c.articulo}
                                </div>
                                <div className="text-muted-foreground leading-relaxed mt-0.5">
                                  {c.resumen}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tarjeta Visual de Herramienta o Modal Desmulta */}
                        {msg.suggestedAction && !msg.isRateLimited && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-primary/10 border border-primary/25 w-full">
                            <div className="text-[11px] sm:text-xs font-black text-foreground flex items-center gap-1 mb-0.5">
                              {getToolIcon(msg.suggestedAction.tipo)}
                              {msg.suggestedAction.titulo}
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-2 leading-snug">
                              {msg.suggestedAction.descripcion}
                            </p>

                            {/* Si la acción es abrir un modal interno */}
                            {msg.suggestedAction.tipo === 'whatsapp' ? (
                              <a
                                href={buildWhatsAppUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] transition-all active:scale-95 shadow-sm"
                              >
                                Escribir por WhatsApp
                                <ArrowRight className="w-2.5 h-2.5" />
                              </a>
                            ) : msg.suggestedAction.tipo === 'modal_simit' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDesmultaModal('simit')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] transition-all active:scale-95 shadow-sm"
                              >
                                Subir foto de comparendo
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            ) : msg.suggestedAction.tipo === 'modal_full' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDesmultaModal('full')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] transition-all active:scale-95 shadow-sm"
                              >
                                Radicar estudio formal
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <Link
                                href={msg.suggestedAction.url}
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] transition-all active:scale-95 shadow-sm"
                              >
                                Abrir herramienta
                                <ArrowRight className="w-2.5 h-2.5" />
                              </Link>
                            )}
                          </div>
                        )}

                        <span
                          className={
                            'text-[9px] block mt-1.5 ' +
                            (msg.role === 'user' ? 'text-black/60' : 'text-muted-foreground')
                          }
                        >
                          {msg.timestamp}
                        </span>
                      </div>

                      {/* Pills de preguntas sugeridas */}
                      {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 w-full">
                          {msg.followUpQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMessage(q)}
                              disabled={isLoading}
                              className="text-[10px] sm:text-[11px] font-medium text-left px-2.5 py-1 rounded-full bg-muted/60 hover:bg-primary/15 text-foreground hover:text-primary border border-border/70 hover:border-primary/40 transition-all active:scale-95 disabled:opacity-50"
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
                      <MessageSquareQuote className="w-3.5 h-3.5 text-primary animate-pulse" />
                      <span className="text-[11px] font-medium text-primary animate-pulse">
                        {thinkingMessages[thinkingStep]}
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
                      className="flex-1 px-3 py-2 text-[13px] sm:text-[14px] rounded-xl bg-background border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground disabled:opacity-50"
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
            )}
          </AnimatePresence>
        </LazyMotion>
      </div>
    </>
  );
}
