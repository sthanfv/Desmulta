'use client';
import { logger } from '@/lib/logger/security-logger';

/**
 * TouchDebugger v1.0.0 — Panel de diagnóstico forense avanzado (F12 Móvil)
 *
 * Mejoras sobre v8.0:
 * - Añadido interceptor de Consola Global (Log, Warn, Error, Info, Unhandled Rejections).
 * - El panel ahora es completamente redimensionable desde la esquina inferior derecha.
 * - Tab CONSOLA: visualización en tiempo real de los logs de la aplicación.
 * - Z-Index extremo (z-[9999999]) para asegurar que nunca quede detrás de modales.
 * - Mejorada la transparencia con soporte para modo oscuro adaptativo.
 * - Separación de la lógica de arrastre (drag) y redimensionamiento (resize).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { mediaLogger, MediaLogEvent } from '@/lib/logger/media-logger';
import * as Sentry from '@sentry/nextjs';
import { healPwaCache } from '@/lib/utils/pwa-heal';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface TouchLog {
  id: number;
  time: string;
  x: number;
  y: number;
  tagName: string;
}

interface NetworkEntry {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  timestamp: string;
  ok: boolean;
  reqBody?: string;
  resBody?: string;
}

interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  time: string;
}

type DebugTab = 'MEDIA' | 'ERRORES' | 'RED' | 'DEVICE' | 'TOUCH' | 'CONSOLE' | 'STORAGE';

// ─── Utilidades ───────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production';
const DEBUG_PIN = process.env.NEXT_PUBLIC_DEBUG_PIN || '1234';

function DeltaBadge({ ms }: { ms: number }) {
  if (ms <= 0) return null;
  const label = ms > 999 ? `+${(ms / 1000).toFixed(1)}s` : `+${ms}ms`;
  const color =
    ms > 5000
      ? 'text-red-400 bg-red-950/60'
      : ms > 1000
        ? 'text-amber-400 bg-amber-950/60'
        : 'text-emerald-400 bg-emerald-950/60';
  return (
    <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${color}`}>{label}</span>
  );
}

function TypeChip({ type }: { type: MediaLogEvent['type'] }) {
  const colors: Record<MediaLogEvent['type'], string> = {
    ERROR: 'text-red-400',
    COMPRESSION: 'text-violet-400',
    OCR: 'text-blue-400',
    FILE: 'text-emerald-400',
    UPLOAD: 'text-amber-400',
  };
  return (
    <span className={`text-[8px] font-black shrink-0 ${colors[type] || 'text-zinc-400'}`}>
      {type}
    </span>
  );
}

// ─── Interceptores ────────────────────────────────────────────────────────────

const networkLog: NetworkEntry[] = [];
let fetchPatched = false;

function patchFetch() {
  if (fetchPatched || typeof window === 'undefined') return;
  fetchPatched = true;

  const TRACKED = ['/api/telemetry', '/api/upload', '/api/gallery', '/api/validar-consulta'];
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const isTracked = TRACKED.some((t) => url.includes(t));

    if (!isTracked) return originalFetch(input, init);

    const start = performance.now();
    let status = 0;
    let ok = false;
    let resBody = '';
    let reqBody = '';

    if (init?.body) {
      reqBody = typeof init.body === 'string' ? init.body : 'Objeto Complejo';
    }

    try {
      const response = await originalFetch(input, init);
      status = response.status;
      ok = response.ok;

      try {
        const clone = response.clone();
        const text = await clone.text();
        resBody = text;
      } catch (_e) {
        resBody = 'No se pudo leer body';
      }

      return response;
    } catch (err) {
      status = 0;
      ok = false;
      resBody = String(err);
      throw err;
    } finally {
      const durationMs = Math.round(performance.now() - start);
      const entry: NetworkEntry = {
        url: url.replace(window.location.origin, ''),
        method: (init?.method || 'GET').toUpperCase(),
        status,
        durationMs,
        timestamp: new Date().toISOString().split('T')[1].slice(0, 11),
        ok,
        reqBody,
        resBody,
      };
      networkLog.unshift(entry);
      if (networkLog.length > 30) networkLog.pop();
    }
  };
}

const consoleLog: ConsoleEntry[] = [];
let consolePatched = false;

function patchConsole() {
  if (consolePatched || typeof window === 'undefined') return;
  consolePatched = true;

  const methods: ('log' | 'warn' | 'error' | 'info')[] = ['log', 'warn', 'error', 'info'];
  methods.forEach((method) => {
    const orig = console[method];
    console[method] = (...args: unknown[]) => {
      consoleLog.unshift({
        type: method,
        args: args.map((a) => {
          try {
            return typeof a === 'object' ? JSON.stringify(a) : String(a);
          } catch (_e) {
            return String(a);
          }
        }),
        time: new Date().toISOString().split('T')[1].slice(0, 11),
      });
      if (consoleLog.length > 50) consoleLog.pop();
      orig.apply(console, args);
    };
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Rejection:', event.reason);
  });
  window.addEventListener('error', (event) => {
    logger.error('Window Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
    });
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function TouchDebugger() {
  const [isActive, setIsActive] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const [activeTab, setActiveTab] = useState<DebugTab>('CONSOLE');
  const [touchLogs, setTouchLogs] = useState<TouchLog[]>([]);
  const [mediaLogs, setMediaLogs] = useState<MediaLogEvent[]>([]);
  const [networkEntries, setNetworkEntries] = useState<NetworkEntry[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<Record<string, unknown>>({});
  const [storageEntries, setStorageEntries] = useState<
    { key: string; value: string; type: 'local' | 'session' }[]
  >([]);

  const [copied, setCopied] = useState(false);
  const [sentToSentry, setSentToSentry] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmNuclear, setConfirmNuclear] = useState(false);

  // Estados de posición y tamaño
  const [pos, setPos] = useState({ x: 10, y: 0 });
  const [size, setSize] = useState({ w: 320, h: 250 });

  useEffect(() => {
    setPos({ x: 10, y: window.innerHeight - 300 });
  }, []);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const isResizing = useRef(false);
  const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });

  const tapTimesRef = useRef<number[]>([]);
  const logIdRef = useRef(0);
  const tapCountResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Activar panel ───────────────────────────────────────────────────────────
  const activatePanel = useCallback(() => {
    patchFetch();
    patchConsole();
    mediaLogger.getDetailedDeviceInfo().then((info) => {
      setDeviceInfo(info);
    });
    setMediaLogs(mediaLogger.getLogs());
    setNetworkEntries([...networkLog]);
    setConsoleEntries([...consoleLog]);
    setTouchLogs([]);
    setIsActive(true);
    setTapCount(0);
  }, []);

  // ── Gesto de activación: 5 toques rápidos en esquina inferior izquierda ────
  const handleActivationTap = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const isInCorner = touch.clientX < 100 && touch.clientY > window.innerHeight - 100;
      if (!isInCorner) return;

      const now = Date.now();
      const newTaps = [...tapTimesRef.current.slice(-4), now];
      tapTimesRef.current = newTaps;

      const currentCount = newTaps.length;
      setTapCount(currentCount);

      if (tapCountResetTimer.current) clearTimeout(tapCountResetTimer.current);
      tapCountResetTimer.current = setTimeout(() => setTapCount(0), 2000);

      if (newTaps.length === 5) {
        const span = newTaps[4] - newTaps[0];
        if (span < 1500) {
          tapTimesRef.current = [];
          setTapCount(0);
          if (tapCountResetTimer.current) clearTimeout(tapCountResetTimer.current);

          if (IS_PROD) {
            setPinMode(true);
            setPinInput('');
            setPinError(false);
          } else {
            activatePanel();
          }
        }
      }
    },
    [activatePanel]
  );

  // ── Validación del PIN ──────────────────────────────────────────────────────
  const handlePinSubmit = useCallback(
    (digit: string) => {
      const next = (pinInput + digit).slice(0, 4);
      setPinInput(next);
      if (next.length === 4) {
        if (next === DEBUG_PIN) {
          setPinMode(false);
          activatePanel();
        } else {
          setPinError(true);
          setTimeout(() => {
            setPinInput('');
            setPinError(false);
          }, 800);
        }
      }
    },
    [pinInput, activatePanel]
  );

  // ── Drag del panel ──────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Si estamos haciendo clic en un botón, no iniciamos drag
    if ((e.target as HTMLElement).closest('button')) return;

    isDragging.current = true;
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // ── Resize del panel ────────────────────────────────────────────────────────
  const onResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isResizing.current = true;
    resizeStart.current = { w: size.w, h: size.h, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current) return;
    e.stopPropagation();
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;
    setSize({
      w: Math.max(280, resizeStart.current.w + dx), // Ancho mínimo
      h: Math.max(200, resizeStart.current.h + dy), // Alto mínimo
    });
  };
  const onResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current) return;
    e.stopPropagation();
    isResizing.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // ── Captura de toques cuando el panel está activo ──────────────────────────
  const handleDebugTouch = useCallback(
    (e: TouchEvent) => {
      if (!isActive || activeTab !== 'TOUCH') return;
      const touch = e.touches[0];
      if (!touch) return;
      const target = e.target as HTMLElement;
      const newLog: TouchLog = {
        id: ++logIdRef.current,
        time: new Date().toISOString().split('T')[1].slice(0, 11),
        x: Math.round(touch.clientX),
        y: Math.round(touch.clientY),
        tagName: target?.tagName?.toLowerCase() || '?',
      };
      setTouchLogs((prev) => [newLog, ...prev.slice(0, 29)]);
    },
    [isActive, activeTab]
  );

  // ── Refrescar datos al cambiar de tab ──────────────────────────────────────
  const refreshTab = useCallback((tab: DebugTab) => {
    setActiveTab(tab);
    if (tab === 'MEDIA' || tab === 'ERRORES') setMediaLogs(mediaLogger.getLogs());
    if (tab === 'RED') setNetworkEntries([...networkLog]);
    if (tab === 'CONSOLE') setConsoleEntries([...consoleLog]);
    if (tab === 'DEVICE') {
      mediaLogger.getDetailedDeviceInfo().then((info) => setDeviceInfo(info));
    }
    if (tab === 'STORAGE') {
      try {
        const entries: { key: string; value: string; type: 'local' | 'session' }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) entries.push({ key: k, value: localStorage.getItem(k) || '', type: 'local' });
        }
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k) entries.push({ key: k, value: sessionStorage.getItem(k) || '', type: 'session' });
        }
        setStorageEntries(entries);
      } catch (_e) {
        console.debug('Storage error', _e);
      }
    }
  }, []);

  // ── Generar texto de diagnóstico estructurado en español ──────────────────────
  const getFormattedLogText = () => {
    let body = `=== DIAGNÓSTICO DESMULTA: ${activeTab} v1.0.0 ===\n\n`;

    if (activeTab === 'TOUCH') {
      body += touchLogs
        .map((l) => `[${l.time}] X:${l.x} Y:${l.y} Elemento: <${l.tagName}>`)
        .join('\n');
    } else if (activeTab === 'RED') {
      body += networkEntries
        .map(
          (n) =>
            `[${n.timestamp}] ${n.method} ${n.url} → Estado: ${n.status || 'FALLO'} (${n.durationMs}ms)\n` +
            (n.reqBody ? `REQ: ${n.reqBody}\n` : '') +
            (n.resBody ? `RES: ${n.resBody}\n` : '')
        )
        .join('\n');
    } else if (activeTab === 'STORAGE') {
      body += storageEntries
        .map((s) => `[${s.type.toUpperCase()}] ${s.key}:\n${s.value}\n`)
        .join('\n');
    } else if (activeTab === 'CONSOLE') {
      body += consoleEntries
        .map((c) => `[${c.time}] [${c.type.toUpperCase()}] ${c.args.join(' ')}`)
        .join('\n');
    } else if (activeTab === 'DEVICE') {
      const mappedInfo: Record<string, unknown> = {};
      Object.entries(deviceInfo).forEach(([k, v]) => {
        const keys: Record<string, string> = {
          ua: 'Navegador (UserAgent)',
          ram: 'Memoria RAM',
          cores: 'Núcleos CPU',
          screen: 'Resolución',
          networkType: 'Tipo de Red',
          downlinkMbps: 'Velocidad (Mbps)',
          rttMs: 'Ping (RTT ms)',
          realOS: 'Sist. Operativo',
          model: 'Modelo Celular',
        };
        mappedInfo[keys[k] || k] = v;
      });
      body += JSON.stringify(mappedInfo, null, 2);
    } else {
      const logs =
        activeTab === 'ERRORES' ? mediaLogs.filter((l) => l.type === 'ERROR') : mediaLogs;
      body += logs
        .map((l) => `[${l.time}] (+${l.elapsedMs}ms) [${l.type}] ${l.message}`)
        .join('\n');
    }
    return body;
  };

  // ── Exportación ────────────────────────────────────────────────────────────
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const body = getFormattedLogText();
    navigator.clipboard
      .writeText(body)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch((err) => {
        logger.warn('Fallo al copiar con API de Clipboard, usando descarga de archivo', err);
        handleDownload(e);
      });
  };

  const _handleShareOrDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const logText = getFormattedLogText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Diagnóstico Desmulta - ${activeTab}`, text: logText });
        return;
      } catch (err) {
        logger.warn('Share API cancelada o fallida, usando descarga', err);
      }
    }
    handleDownload(e);
  };

  const handleDownload = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const logText = getFormattedLogText();
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `desmulta-diagnostico-${activeTab.toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSentryReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const errorLogs = mediaLogs.filter((l) => l.type === 'ERROR').slice(0, 5);
    Sentry.withScope((scope) => {
      scope.setLevel('warning');
      scope.setTag('source', 'TouchDebugger');
      scope.setExtra('console_logs', consoleEntries.slice(0, 10));
      scope.setExtra('mediaLogs_errors', errorLogs);
      scope.setExtra('deviceInfo', deviceInfo);
      scope.setExtra('networkLog', networkEntries.slice(0, 5));
      Sentry.captureMessage('[TouchDebugger] Reporte manual de diagnóstico de campo');
    });
    setSentToSentry(true);
    setTimeout(() => setSentToSentry(false), 3000);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2500);
      return;
    }
    mediaLogger.clear();
    setMediaLogs([]);
    setTouchLogs([]);
    networkLog.length = 0;
    setNetworkEntries([]);
    consoleLog.length = 0;
    setConsoleEntries([]);
    setConfirmClear(false);
  };

  // ── Listeners ───────────────────────────────────────────────────────────────
  useEffect(() => {
    document.addEventListener('touchstart', handleActivationTap, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleActivationTap);
      consoleLog.length = 0;
      networkLog.length = 0;
    };
  }, [handleActivationTap]);

  useEffect(() => {
    if (!isActive) return;
    document.addEventListener('touchstart', handleDebugTouch, { passive: true });
    // Actualizador automático de consola mientras el panel esté activo
    const interval = setInterval(() => {
      if (activeTab === 'CONSOLE') setConsoleEntries([...consoleLog]);
      if (activeTab === 'RED') setNetworkEntries([...networkLog]);
      if (activeTab === 'STORAGE') {
        try {
          const entries: { key: string; value: string; type: 'local' | 'session' }[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) entries.push({ key: k, value: localStorage.getItem(k) || '', type: 'local' });
          }
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k)
              entries.push({ key: k, value: sessionStorage.getItem(k) || '', type: 'session' });
          }
          setStorageEntries(entries);
        } catch (_e) {
          console.debug('Storage interval error', _e);
        }
      }
    }, 1000);
    return () => {
      document.removeEventListener('touchstart', handleDebugTouch);
      clearInterval(interval);
    };
  }, [isActive, handleDebugTouch, activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      mediaLogger.getDetailedDeviceInfo().then((info) => {
        mediaLogger.log('FILE', 'Diagnóstico de arranque', info as Record<string, unknown>);
      });
    }
  }, []);

  // ── Render: Feedback de taps (1-4) ─────────────────────────────────────────
  if (!isActive && !pinMode && tapCount > 0 && tapCount < 5) {
    return (
      <div
        className="fixed z-[9999999] bottom-6 left-4 flex gap-1 pointer-events-none"
        aria-hidden="true"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${i < tapCount ? 'bg-primary opacity-90' : 'bg-white/20'}`}
          />
        ))}
      </div>
    );
  }

  // ── Render: Modal de PIN (solo producción) ──────────────────────────────────
  if (pinMode) {
    return (
      <div className="fixed inset-0 z-[9999999] bg-black/60 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 w-64 shadow-2xl font-mono">
          <p className="text-white/60 text-[10px] text-center uppercase tracking-widest mb-4">
            Debug PIN
          </p>
          <div className="flex justify-center gap-3 mb-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-black transition-all ${
                  pinError
                    ? 'border-red-500 bg-red-950/40 text-red-400'
                    : i < pinInput.length
                      ? 'border-primary bg-primary/20 text-primary'
                      : 'border-white/10 text-white/20'
                }`}
              >
                {i < pinInput.length ? '●' : '○'}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  if (d === '⌫') setPinInput((p) => p.slice(0, -1));
                  else if (d) handlePinSubmit(d);
                }}
                disabled={!d}
                className={`h-10 rounded-xl text-sm font-bold transition-all active:scale-95 ${d ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-transparent cursor-default'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPinMode(false)}
            className="w-full mt-4 text-zinc-600 text-[9px] uppercase tracking-wider hover:text-zinc-400 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (!isActive) return null;

  // ── Datos del tab activo ────────────────────────────────────────────────────
  const errorLogs = mediaLogs.filter((l) => l.type === 'ERROR');
  const consoleErrorLogs = consoleEntries.filter((c) => c.type === 'error');

  const TABS: { id: DebugTab; label: string; count?: number }[] = [
    { id: 'CONSOLE', label: 'CONSOLA', count: consoleErrorLogs.length },
    { id: 'RED', label: 'RED', count: networkEntries.length },
    { id: 'ERRORES', label: 'ERR', count: errorLogs.length },
    { id: 'MEDIA', label: 'MEDIOS' },
    { id: 'DEVICE', label: 'DISP' },
    { id: 'TOUCH', label: 'TOUCH' },
    { id: 'STORAGE', label: 'STOR', count: storageEntries.length },
  ];

  return (
    <div
      className="fixed z-[9999999] font-mono pointer-events-auto shadow-2xl flex flex-col bg-zinc-950/95 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, touchAction: 'none' }}
    >
      {/* ── Drag Header ─────────────────────────────────────────────────── */}
      <div
        className="h-5 flex items-center justify-between px-2 bg-zinc-900 border-b border-white/10 cursor-move shrink-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase pointer-events-none">
          ::: TouchDebugger v1.0.0 :::
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsActive(false);
          }}
          className="w-4 h-4 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors pointer-events-auto"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-stretch border-b border-white/10 select-none bg-zinc-900/50 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={(e) => {
              e.stopPropagation();
              refreshTab(tab.id);
            }}
            className={`flex-1 min-w-[40px] h-8 text-[9px] sm:text-[10px] font-black tracking-wider transition-colors relative ${
              activeTab === tab.id
                ? 'bg-primary text-black'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`absolute top-0.5 right-0.5 text-[7px] font-black px-0.5 rounded ${tab.id === 'ERRORES' || tab.id === 'CONSOLE' ? 'text-red-400' : 'text-white/50'}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ───────────────────────────────────────────────────── */}
      <div className="overflow-y-auto flex-1 select-text scrollbar-thin scrollbar-thumb-white/10">
        {/* CONSOLA */}
        {activeTab === 'CONSOLE' && (
          <div className="p-1">
            {consoleEntries.length === 0 ? (
              <p className="text-center text-zinc-600 text-[10px] uppercase py-5 animate-pulse">
                Esperando logs...
              </p>
            ) : (
              consoleEntries.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-2 py-1.5 border-b border-white/5 ${c.type === 'error' ? 'bg-red-950/30 text-red-400' : c.type === 'warn' ? 'bg-amber-950/20 text-amber-400' : 'text-zinc-300'}`}
                >
                  <span className="text-[8px] opacity-50 shrink-0 mt-0.5">{c.time}</span>
                  <span className="text-[10px] font-bold uppercase shrink-0 mt-0.5 w-8">
                    {c.type}
                  </span>
                  <span className="text-[10px] break-all whitespace-pre-wrap leading-tight">
                    {c.args.join(' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* RED */}
        {activeTab === 'RED' && (
          <div className="p-1">
            {networkEntries.length === 0 ? (
              <p className="text-center text-zinc-600 text-[10px] uppercase py-5 animate-pulse">
                Sin llamadas de red
              </p>
            ) : (
              networkEntries.map((n, i) => (
                <div key={i} className="flex flex-col gap-1 px-2 py-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-black shrink-0 ${n.ok ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {n.status || 'ERR'}
                    </span>
                    <span className="text-white/70 text-[9px] break-all flex-1 leading-tight">
                      {n.url}
                    </span>
                    <span
                      className={`text-[9px] shrink-0 font-bold ${n.durationMs > 1000 ? 'text-red-400' : n.durationMs > 400 ? 'text-amber-400' : 'text-emerald-400'}`}
                    >
                      {n.durationMs}ms
                    </span>
                  </div>
                  {/* Cuerpos de petición y respuesta */}
                  {(n.reqBody || n.resBody) && (
                    <div className="mt-1 flex flex-col gap-1 text-[8px] max-h-32 overflow-y-auto scrollbar-thin">
                      {n.reqBody && (
                        <div className="bg-blue-950/20 p-1 rounded text-blue-200 break-all">
                          <span className="font-bold text-blue-400 mb-0.5 block">REQ:</span>{' '}
                          {n.reqBody}
                        </div>
                      )}
                      {n.resBody && (
                        <div
                          className={`p-1 rounded break-all ${n.ok ? 'bg-emerald-950/20 text-emerald-200' : 'bg-red-950/20 text-red-200'}`}
                        >
                          <span
                            className={`font-bold mb-0.5 block ${n.ok ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            RES:
                          </span>{' '}
                          {n.resBody}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* STORAGE */}
        {activeTab === 'STORAGE' && (
          <div className="p-1 space-y-1">
            {storageEntries.length === 0 ? (
              <p className="text-center text-zinc-600 text-[10px] py-5">Storage vacío</p>
            ) : (
              storageEntries.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-0.5 px-2 py-1.5 border-b border-white/5 bg-zinc-900/30"
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[9px] font-bold ${s.type === 'local' ? 'text-blue-400' : 'text-fuchsia-400'}`}
                    >
                      [{s.type.toUpperCase()}] {s.key}
                    </span>
                    <button
                      onClick={() =>
                        s.type === 'local'
                          ? localStorage.removeItem(s.key)
                          : sessionStorage.removeItem(s.key)
                      }
                      className="text-[8px] text-red-400 hover:text-red-300 px-1 py-0.5 bg-red-400/10 rounded"
                    >
                      BORRAR
                    </button>
                  </div>
                  <span className="text-white/60 text-[9px] break-all max-h-24 overflow-y-auto mt-1 scrollbar-thin">
                    {s.value}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* MEDIA / ERRORES / TOUCH */}
        {(activeTab === 'MEDIA' || activeTab === 'ERRORES' || activeTab === 'TOUCH') && (
          <div className="p-1">
            {(() => {
              const tabLogs =
                activeTab === 'ERRORES'
                  ? mediaLogs.filter((l) => l.type === 'ERROR')
                  : activeTab === 'MEDIA'
                    ? mediaLogs
                    : touchLogs;
              if (tabLogs.length === 0)
                return (
                  <p className="text-center text-zinc-600 text-[10px] uppercase py-5 animate-pulse">
                    Sin registros
                  </p>
                );

              return (tabLogs as (TouchLog | MediaLogEvent)[]).map((log, i) => {
                if ('tagName' in log) {
                  const tl = log as TouchLog;
                  return (
                    <div
                      key={tl.id || i}
                      className="flex items-center gap-2 px-2 py-1.5 border-b border-white/5"
                    >
                      <span className="text-primary text-[10px] font-bold shrink-0">
                        ({tl.x},{tl.y})
                      </span>
                      <span className="text-emerald-400 text-[10px] truncate">
                        &lt;{tl.tagName}&gt;
                      </span>
                      <span className="text-white/30 text-[9px] ml-auto shrink-0">{tl.time}</span>
                    </div>
                  );
                }
                const ml = log as MediaLogEvent;
                return (
                  <div
                    key={ml.id || i}
                    className={`flex flex-col gap-1 px-2 py-1.5 border-b border-white/5 ${ml.type === 'ERROR' ? 'bg-red-950/20' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <TypeChip type={ml.type} />
                      <DeltaBadge ms={ml.elapsedMs} />
                    </div>
                    <span className="text-white/80 text-[10px] leading-tight break-all">
                      {ml.message}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* DEVICE */}
        {activeTab === 'DEVICE' && (
          <div className="px-3 py-3 space-y-1">
            {Object.entries(deviceInfo).length === 0 ? (
              <p className="text-zinc-600 text-[10px] py-3 text-center animate-pulse">
                Cargando perfil hardware...
              </p>
            ) : (
              Object.entries(deviceInfo).map(([k, v]) => {
                const keys: Record<string, string> = {
                  ua: 'Navegador',
                  ram: 'Memoria RAM',
                  cores: 'Núcleos CPU',
                  screen: 'Resolución',
                  networkType: 'Conexión',
                  downlinkMbps: 'Velocidad (Mbps)',
                  rttMs: 'Ping (ms)',
                  realOS: 'Sist. Operativo',
                  model: 'Modelo Celular',
                };
                return (
                  <div key={k} className="flex gap-2 border-b border-white/5 pb-1.5 pt-1">
                    <span className="text-zinc-500 text-[10px] shrink-0 w-28 font-bold">
                      {keys[k] || k}
                    </span>
                    <span className="text-white/90 text-[10px] break-all">{String(v)}</span>
                  </div>
                );
              })
            )}
            {IS_PROD && (
              <div className="mt-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex flex-col gap-1 items-center">
                <span className="text-amber-400 text-[10px] font-black uppercase">
                  Modo Producción Activo
                </span>
                <span className="text-amber-400/60 text-[9px]">
                  Mecanismo de PIN de seguridad habilitado.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pie: acciones y Resize Handle ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-white/10 bg-zinc-900/80 shrink-0 relative">
        <button
          onClick={handleSentryReport}
          className={`px-2 py-1.5 rounded text-[9px] font-black uppercase tracking-wide transition-all active:scale-95 flex-1 ${sentToSentry ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
        >
          {sentToSentry ? '✓ Enviado' : 'Sentry'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!confirmNuclear) {
              setConfirmNuclear(true);
              setTimeout(() => setConfirmNuclear(false), 2500);
              return;
            }
            setConfirmNuclear(false);
            healPwaCache();
          }}
          className={`px-2 py-1.5 rounded text-[9px] font-black uppercase tracking-wide transition-all active:scale-95 border ${
            confirmNuclear
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-red-950/80 text-red-400 hover:bg-red-900/80 border-red-500/30'
          }`}
          title="Destruir estado local (Auto-Heal)"
        >
          {confirmNuclear ? '¿SEGURO?' : 'NUCLEAR'}
        </button>
        <button
          onClick={handleClear}
          className={`px-2 py-1.5 rounded text-[9px] font-black uppercase tracking-wide transition-all active:scale-95 flex-1 ${confirmClear ? 'bg-red-600 text-white' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
        >
          {confirmClear ? 'Seguro?' : 'Clear'}
        </button>
        <button
          onClick={handleCopy}
          className={`px-2 py-1.5 rounded text-[9px] font-black uppercase tracking-wide transition-all active:scale-95 flex-1 ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-zinc-200'}`}
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>

        {/* Mango de redimensionamiento */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-50 hover:opacity-100"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11 1L1 11M11 6L6 11M11 11H10.99"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
