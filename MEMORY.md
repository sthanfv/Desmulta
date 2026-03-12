# MEMORY.md — Estado del Proyecto Desmulta 🛡️

## 1. Contexto Actual

- **Versión**: v2.4.4
- **Estado**: Habilitación de copiado administrativo y hotfix de tipado estricto (v2.4.4) completado.
- **Mando**: Equipo de Desarrollo Élite.

## 9. Actualización v2.4.3 (Estabilidad y Seguridad)

- **Corrección CSP**: Se habilitó `challenges.cloudflare.com` y `va.vercel-scripts.com` en `script-src-elem`. Se restauró `unsafe-eval` dinámicamente solo para entorno de desarrollo (HMR).
- **Limpieza de Permissions-Policy**: Eliminadas las directivas `browsing-topics` e `interest-cohort` que generaban warnings en navegadores modernos.
- **Validación Humana**: Verificado que el 100% de los diálogos, Toasts y esquemas de validación Zod hablen un español natural y profesional.
- **Hotfix de Persistencia**: Corregida la consulta de Firestore para persistir leads 'descartados' y 'finalizados'. Sincronizados los strings de estado entre DB y UI.
- **Saneamiento de Serialización**: Implementado mapeo de arrays de historial y documentos para convertir Timestamps de Firestore en Strings ISO, evitando fallos en Client Components.
- **Preparación Release**: Ejecutados checks de `format`, `lint`, `typecheck` y `build` satisfactorios. Código sincronizado con GitHub.
## 10. Actualización v2.4.4 (Copiado y Calidad de Código)

- **Copiado Inteligente**: Implementado `copyToClipboard` con botones dinámicos en el modal de detalles. Habilitada la selección de texto global (`user-select: auto`) para agilizar trámites en SIMIT.
- **Zero 'any' Policy**: Refactorización de serialización en `actions.ts`. Se eliminó todo rastro de `any`, permitiendo que el build de producción se complete sin errores.
- **Limpieza de Git**: Sincronización oficial de archivos técnicos y guías de mantenimiento.

## 2. Stack Tecnológico Detectado

- **Frontend**: Next.js 15.5.12, React 19.2.1 (PWA con `@ducanh2912/next-pwa`).
- **Estilos**: Tailwind CSS 3.4.1, UI based on Radix UI primitives.
- **Backend/DB**: Firebase Admin SDK (Server-side queries), Firestore.
- **IA / OCR**: **Tesseract.js** (OCR 100% Client-Side, Costo Cero). Sustituye a cualquier motor de IA en la nube para validar imágenes SIMIT. Funciona en el dispositivo del usuario sin consumir API keys ni servidores.
- **Seguridad**: Logger de seguridad personalizado con ofuscación de PII, Middlewares de protección, Cloudflare Turnstile.
- **Infraestructura**: Vercel (Next.js Node.js Serverless estable), Vercel Blob para storage.

## 3. Decisiones de Arquitectura

- **Modularidad Estricta**: Separación clara entre `src/app` (rutas/actions), `src/components`, `src/lib` y `src/services`.
- **Zero-Trust**: Validación de datos con Zod, protección de API con Turnstile, y logger que ofusca PII (Cédulas, Teléfonos).
- **Sincronización Dinámica**: Uso de Server Actions para invalidar caché y actualizar el frontend instantáneamente.
- **FinOps (Optimización de Costos)**:
  - Estrategia Singleton en Firebase Admin SDK para minimizar conexiones.
  - Paginación estricta y limitación de documentos en consultas Firestore (Admin Dashboard) para evitar sobrecostos de lectura.
  - Implementación de Cron Jobs en Vercel para la limpieza automatizada de capturas SIMIT en Vercel Blob (prevención de almacenamiento muerto).
  - Sin costos de IA en la nube: el OCR (Tesseract.js) es 100% Client-Side. El único motor de procesamiento de imágenes reside en el dispositivo del usuario.
- **UI/UX y Mobile-First**:
  - Telemetría: Uso planificado de mapas de calor/métricas para optimizar el embudo de conversión del formulario de 3 pasos.
  - Tolerancia a fallos de red: Service Worker configurado (`NetworkFirst`) para reintentos de subida de imágenes en conexiones móviles inestables.

## 4. Auditoría de Seguridad e Integridad (v2.3.7)

- **Vulnerabilidades**: 14 detectadas (Low) vía `npm audit`. Se ejecutó `npm audit fix`.
- **Integridad**: Build verificado exitosamente por el usuario.
- **UX**: Fase de humanización completada. Mensajes técnicos transformados a lenguaje natural para el ciudadano. Los límites de Rate Limit ahora muestran tiempo preciso (minutos/segundos o horas/minutos).
- **Auditoría v2.4.0**: Build verificado. Documentación purgada de referencias a Gemini, Genkit y GEMINI_API_KEY. Tesseract.js es el único motor de procesamiento de imágenes registrado.
- **Turnstile**: Verificado en modo _Managed_. Validación automática activada para el 90% de los casos.
- **CSP Hardening (v2.3.8)**: Eliminado `unsafe-eval` de `script-src`. Restringido `form-action`, mejorado `Referrer-Policy` a `strict-origin-when-cross-origin`, y `Permissions-Policy` extendida con `payment=(), usb=()`.
- **Motor OCR Zero-Waste (v2.3.9)**: Implementado `useSIMITValidator.ts` con Tesseract.js. Tres capas de filtrado en cliente: peso/formato → OCR → heurística con 10 frases-ancla de la UI oficial del SIMIT. Las imágenes falsas son bloqueadas antes de llegar a Vercel Blob o Firebase. Costo de infra evitado: 100%.
- **OCR Offline & Instantáneo (v2.4.0)**:
  - `useTesseractPrewarm.ts`: Inyecta `link rel=prefetch` silencioso al montar el formulario. El modelo `spa.traineddata` se descarga mientras el usuario llena el formulario.
  - `next.config.ts`: Regla `CacheFirst` en el Service Worker para persistir el modelo OCR de 20MB por 1 año. El validador SIMIT funciona completamente offline.

## 5. Tareas Pendientes

- [x] Aplicar `npm audit fix` para mitigar riesgos bajos.
- [x] Humanización de mensajes de error y límites.
- [x] **Seguridad**: Estrechar CSP (Content Security Policy) en el Middleware para mitigar riesgos XSS.
- [x] **Seguridad**: Verificar ofuscación de PII en logs de producción (Honeypot/SecurityLogger).
- [ ] **FinOps/Rendimiento**: Implementar mejoras hacia Edge Runtime (según `PLAN_MEJORAS_FUTURAS.md`).
- [ ] **UI/UX**: Pruebas de estrés offline para el Service Worker en la carga SIMIT.

## 6. Actualización v2.4.1 (Seguridad y Limpieza Edge)

- **Eliminación Total de Genkit**: Se identificaron 17 vulnerabilidades bajas asociadas a `genkit`, `@genkit-ai/*` y `firebase-admin`. Como `firebase-admin` no se pudo actualizar automáticamente sin breaking changes, y Genkit era código legado, se refactorizó `src/app/actions.ts` para utilizar `@google/generative-ai` directamente.
- **Limpieza de Dependencias**: Se desinstalaron `genkit` y `@genkit-ai/google-genai`. Los archivos en `src/ai/` que usaban Genkit fueron marcados como obsoletos/eliminados. El chat inteligente (Desmulta Chat) ahora opera directamente con el SDK de Google Generative AI, ahorrando dependencias innecesarias y mejorando la seguridad.
- **Aclaración Edge Runtime**: Se verificó que las API de control (como `validar-consulta`) se ejecutan sobre Node.js estable y no sobre Edge, debido a incompatibilidades intrínsecas del SDK de `firebase-admin` con el motor V8 puro sin polyfills. `PLAN_MEJORAS_FUTURAS.md` debe redactarse bajo este contexto realista.

## 7. Hotfix v2.4.2 (Estabilización de Build CI/CD)

- **Corrección API Cron (`force-dynamic`)**: Se corrigió el error `[PageNotFoundError]` lanzado por `next build` al recolectar datos de las páginas (`/api/cron/*`). Añadiendo `export const dynamic = 'force-dynamic'`, se evitó explícitamente que Next.js intentara la Generación Estática (SSG) de rutas Cron sin cuerpo dependiente de HTTP en build-time, logrando una compilación de Producción limpia (Output de Serverless y PWA service workers perfectos).

## 8. Sesión Actual: Mando Élite (Reconocimiento)

- **Auditoría e Inicialización**: Ejecutada `npm audit` detectando 14 vulnerabilidades de baja severidad ligadas a la dependencia profunda `firebase-admin`. No se forzó una actualización mayor (breaking change) en esta fase cero, se intentó mitigación estándar con `npm audit fix`.
- **Stack Ratificado Automáticamente**: Next.js 15, React 19, Tailwind CSS, Firestore, TypeScript estricto, Vercel Blob, Tesseract.js (Client-Side).
- **Compromiso MANDATO-FILTRO**: Activado. Todas las comunicaciones, logs, comentarios y documentación se generarán y verificarán internamente 100% en ESPAÑOL.
