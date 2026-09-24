// ─────────────────────────────────────────────────────────────────────────────
// Modo app en teléfono — lógica pura (rutas, pestañas y acciones)
//
// Desmulta es una sola web; en pantallas < 768 px se superpone una "carcasa" de app nativa
// (barra superior + barra de pestañas). Aquí vive la lógica sin UI para poder probarla.
// ─────────────────────────────────────────────────────────────────────────────

export type AppTab = 'inicio' | 'mi-caso' | 'consultar' | 'asistente' | 'mas';
export type ConsultationMode = 'full' | 'simit';

/** Zonas privadas o de herramientas donde NO se muestra la carcasa de app. */
const EXCLUDED_PREFIXES = [
  '/admin',
  '/acceso-panel',
  '/vip',
  '/documentos',
  '/api-docs',
  '/test-flujo',
  '/logout',
  '/geo-bloqueado',
  '/offline',
  '/_escudo-simit',
];

export function isAppShellRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return !EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Pestaña resaltada según la ruta (las acciones Consultar/Asistente/Más no son rutas). */
export function activeTabFor(pathname: string | null | undefined): AppTab | null {
  if (pathname === '/') return 'inicio';
  if (pathname && /^\/(estado|seguir)(\/|$)/.test(pathname)) return 'mi-caso';
  return null;
}

// Eventos que escuchan HomeClient (modal de consulta) y ChatAssistantWidget (chat)
export const OPEN_CONSULTATION_EVENT = 'open-consultation-modal';
export const OPEN_ASSISTANT_EVENT = 'open-chat-assistant';

type Navigate = (href: string) => void;

/**
 * Abre el formulario de consulta. En Inicio abre el modal directamente; en otra página
 * navega a Inicio con ?action=consultar&modo=..., que HomeClient lee al montar.
 */
export function openConsultation(mode: ConsultationMode, pathname: string, navigate: Navigate) {
  if (pathname === '/') {
    window.dispatchEvent(new CustomEvent(OPEN_CONSULTATION_EVENT, { detail: { mode } }));
    return;
  }
  navigate(`/?action=consultar&modo=${mode}`);
}

/** Abre el asistente (el chat vive en Inicio). */
export function openAssistant(pathname: string, navigate: Navigate) {
  if (pathname === '/') {
    window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT));
    return;
  }
  navigate('/?action=asistente');
}

/** Vibración corta al tocar (solo Android la soporta; en iOS no hace nada). */
export function haptic(ms = 8) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    // Algunos navegadores lanzan si la página no tuvo interacción previa
  }
}
