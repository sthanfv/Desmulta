# CHANGELOG — Desmulta

Todas las versiones y cambios significativos del proyecto.

## [Sin versión] - Septiembre 2026

> Cambios en `main` pendientes de asignar versión (la versión solo se sube por orden explícita).

### ✨ Features & UX

- **Blog semanal sin GitHub Actions:** tarea del Programador de tareas de Windows (lunes 19:30) que ejecuta `scripts/blog-sync-publish.ps1` (`npm run blog:publish`): importa noticias, valida el MDX (`npm run blog:validate`) y publica en `main`.

- **Modo app en teléfono:** barra de pestañas, paneles nativos, chat a pantalla completa, Inicio con accesos rápidos, barra con flecha atrás en páginas internas y transición de pantalla. Ver `docs/MOBILE_APP_SHELL.md`.
- **Chat con IA real y conversación natural:** charla corta humana, prompt con personalidad, botón según la pregunta, memoria de la conversación, respaldo con WhatsApp. Ver `docs/CHAT_ARCHITECTURE.md`.

### 🔒 Security & FinOps

- Auditoría 2026-09-22: tokens de admin con audiencia, 2FA ligado al uid, webhook de Wompi transaccional, SSRF guard con `net.BlockList`, secretos hardcodeados eliminados y rotados. Informe en `docs/auditoria-2026-09-22/`.
- Rate limit del chat en dos niveles (8/min + 60/día) y alertas de caída de chat/OCR con anti-spam.
- `next` 15.5.26 (vulnerabilidad crítica), `sharp` 0.35.4, `postcss` y `serialize-javascript` parcheados.

### 🐛 Fixes

- El chat nunca había usado IA en producción (clave inválida, modelo retirado, créditos agotados) y respondía textos fijos sin dejar rastro en logs.
- OCR con modelo retirado (`gemini-2.5-flash`): ahora configurable con `GEMINI_OCR_MODEL`.
- CI ignoraba la rama `main`; CD duplicaba el despliegue a Vercel.
- Tests E2E desactualizados (smoke, God Mode, Escudo SIMIT) y test de Functions sin `PII_ENCRYPTION_SALT`.

## [v1.0.0] - Junio 2026

### ✨ Features & UX

- **Sincronización Automática de Blog RSS-to-MDX (Idea #10):** Implementación de script robusto `sync-blog-rss.ts` con soporte dual para feeds RSS y Atom (Google Alerts), extracción y decodificación de URLs de destino reales, notificaciones automáticas a Telegram de nuevos artículos y workflow en GitHub Actions para ejecución cron diaria con commits automáticos a `main`.
- **Páginas de Infracción Específica por Código (Idea #09):** Rutas estáticas generadas a tiempo de compilación (SSG) `/multas/codigo/[codigo]` que detallan los 10 códigos de tránsito más buscados en Colombia a partir de `codigos-infraccion.json`, interconectadas mediante el Footer e integradas dinámicamente en `sitemap.ts`.
- **Compartición Híbrida en Historias (Stories):** Detección inteligente de agente de usuario en `StoryProgressModal.tsx` para delegar a la Web Share API en móviles y realizar copias directas al portapapeles con avisos animados en escritorios, evitando spinner infinito y bloqueos de seguridad.
- **Depuración de Mapeo de Origen (Source Maps):** Eliminación de las directivas `sourceMappingURL` en dependencias estáticas locales en `public/` (`worker.min.js`, `firebase-app-compat.js`, `firebase-messaging-compat.js`) erradicando de raíz las alertas 404 en el servidor de producción.
- **El Toque Humano (Expansión):** La "Nota del Operador" ingresada al cambiar de estado ahora se inyecta automáticamente en las plantillas de correo electrónico y notificaciones Web Push, garantizando una comunicación omnicanal más personalizada y empática.
- **Kanban Cinético:** Implementación de un motor de _edge-scroll_ basado en `requestAnimationFrame` para la versión móvil del Tablero Flujo de Trabajo, mejorando radicalmente la usabilidad al arrastrar tarjetas hacia los bordes.
- **Loading Skeletons (SSR):** Incorporados estados de carga (`loading.tsx`) nativos de Next.js en las rutas de mayor impacto (Blog, Multas por ciudad y Portal VIP) evitando destellos visuales durante la hidratación y revalidación SSG.
- **Auditoría Forense Avanzada:** `TouchDebugger` evolucionó a la **v1.0.0**, integrando intercepción global de red y consola, auto-heal (Botón NUCLEAR) perfeccionado sin bloqueos en Android (sin `window.confirm`), y correcciones de fugas de memoria al desmontar.

### 🔒 Security & FinOps

- **Auditoría Inmutable (Mejora A):** Migración del registro de auditoría desde el cliente hacia Firebase Cloud Functions (`onDocumentWritten`). Ahora los cambios de estado en Prospectos y Casos se registran automáticamente en Firestore, incluyendo identificadores del operador (`_lastOperatorEmail`) para trazabilidad inquebrantable.
- **Alertas de Seguridad en Tiempo Real (Mejora C):** Integración de Telegram Security Alerts. Se disparan notificaciones críticas inmediatas a un canal privado cuando se detecta una eliminación (DELETE) directa en la base de datos o cuando se realiza una exportación masiva de datos desde el Modo Dios.
- **Rate Limiting Modo Dios:** Implementación de control de tasa para los intentos de ingreso al Modo Dios mediante PIN, mitigando ataques de fuerza bruta.
- **Zero-PII & Fail-Closed Testing:** Se reforzó el pipeline DevSecOps con 4 nuevas suites de pruebas (`piiScrubber-colombia`, `rate-limit-failclosed`, `prescription-engine-edge`, `middleware-auth`) garantizando que ninguna regresión rompa la anonimización legal y el firewall.
- **Índices Firestore Strict:** Creado índice compuesto (`event` ASC, `ts` DESC) en `edge_telemetry` para asegurar la velocidad extrema de las consultas de analíticas sin desbordar el consumo.

### 🐛 Fixes

- **Animación WhatsApp Inmortal:** Eliminado el timeout de 30 segundos en el widget de WhatsApp (`magic-rings.tsx`). La animación WebGL ahora corre indefinidamente para evitar la sensación de página "congelada", pausándose únicamente cuando la pestaña está oculta (`document.hidden`) para ahorrar batería.
- **Telegram CRM Sincronización Inteligente:** Refactorizada la alerta en `onCaseStatusChange.ts` para evitar la duplicación de mensajes y los "fallbacks" que enviaban mensajes nuevos al final del chat. Se implementó una lógica de reintentos inteligente (`editMessageCaption` vs `editMessageText`) que intercepta errores de la API de Telegram y garantiza que el mensaje original se edite siempre.
- **Notificaciones Push Duplicadas:** Eliminado el envío de notificaciones Web Push desde Firebase Functions, delegando esta responsabilidad exclusivamente al motor Next.js (`actions.ts`) para evitar alertas dobles en el dispositivo del usuario.
- **Vercel PDF Export Fix:** Configuración de `outputFileTracingIncludes` en `next.config.ts` para forzar la inclusión de los binarios de `@sparticuz/chromium`, solucionando el error 500 al generar PDFs en el entorno de producción.
- **Traducción Modo Dios:** Renombramiento de toda la interfaz administrativa de "God Mode" a "Modo Dios" para mejorar la experiencia UX del operador local.

## [v1.0.0] - Mayo 2026

### 🚀 Estabilidad & CI/CD

- **Full Coverage Enforcement:** El workflow de GitHub Actions ahora incluye validación dura de cobertura de tests (`npm run test:coverage:ci`) antes de realizar el build.
- **Tipado Estricto de Errores:** Bloques `catch (e)` refactorizados a `catch (e: unknown)` y chequeos de `instanceof Error` a lo largo del panel de administración (Galería, Layout) para evitar crashes por tipos `any` inseguros.

### 🔒 Security & Sentry

- **Logs Cero-Exposición:** Reemplazados llamados genéricos de `console.error` y `console.warn` en `env-check.ts` y `pushService.ts` por envíos directos a `SecurityLogger`.
- **Sentry Nativo:** Refactorizado el `SecurityLogger` para delegar directamente payloads con contexto enriquecido mediante `Sentry.captureMessage`, eliminando variables envueltas que dificultaban la lectura de incidentes de seguridad y errores en producción.
- **Limpieza de UI Logs:** Los logs informativos del lado cliente como la limpieza de `localStorage` en el Tracking UI ahora están ocultos detrás de chequeos `process.env.NODE_ENV === 'development'`.

### ⚡ Rendimiento & FinOps

- **Query Optimizada:** La recolección de métricas `edge_telemetry` ahora acota por fecha (30 días) y límite (5000 docs) evitando escaneos masivos en colecciones crecientes, reduciendo severamente las cuotas de lectura de Firestore.
- **DecodedIdToken Seguro:** Refactorizados cast inseguros (`let decodedToken: any`) hacia el estándar `DecodedIdToken | undefined` en las Firebase Functions del Admin.

## [v1.0.0] - Mayo 2026

### 🚀 Features & UX

- **Auditoría Forense:** Traducción dinámica de acciones técnicas (`UPDATE`, `UPLOAD`) a etiquetas legibles ("MOVER / ESTADO", "SUBIR ARCHIVO") en el UI administrativo y en la exportación PDF.
- **Admin Panel:** El Dashboard de auditoría ahora exporta reportes forenses más limpios utilizando `jspdf-autotable`.

### 🔒 Security & Performance

- **FIX CRÍTICO (God Mode):** Eliminado el _fallback inseguro_ hardcodeado (`desmulta-admin-2026`) en `audit-actions.ts`. Si la variable `SUPERADMIN_AUDIT_PASSWORD` falta, el sistema bloquea el acceso por defecto.
- **Zero-PII en Expedientes:** `expediente.actions.ts` fue refactorizado. Ya no almacena nombres, cédulas ni teléfonos en texto plano en la colección `leads`, asegurando privacidad end-to-end usando `hashPII()`.
- **Rendimiento Masivo (FinOps):** `deleteExpiredConsultations` en `admin/actions.ts` ahora ejecuta operaciones paginadas (`.limit(500)`) para evitar colapsos por _Out of Memory_ (Timeout) en Vercel Serverless.

## [v1.0.0] - Mayo 2026

### 🔒 Security — Zero-PII completo en Portal VIP

- **FIX CRÍTICO**: `vip-jwt.ts` ahora firma `{ hashedCedula, hashedCelular }` en lugar
  de PII en texto plano. El JWT nunca vuelve a contener una cédula real.
- **FIX CRÍTICO**: `vip/dashboard/page.tsx` y `vip/auth/route.ts` ahora buscan en
  Firestore por el campo `cedulaHash` (HMAC-SHA256), no por el campo `cedula`.
  Esto unifica el sistema Zero-PII en todas las rutas de acceso VIP.
- `vip/auth/route.ts`: verificación de celular ahora usa hash con fallback para
  registros anteriores (`contactoHash` o texto plano si el documento es antiguo).
- `firestore.rules`: se añadieron reglas explícitas para `audit_logs`,
  `vip_auth_rl` y `rate_limits/*` — todas denegadas desde el cliente.

## [v1.0.0] - Mayo 2026

### ✨ Features

- **Tablero**: badges de carga en la cabecera — total leads activos, casos y urgentes (>2h).
- **Tablero**: filtro de fecha como rango desde/hasta en lugar de día exacto.
- **Tablero**: log de auditoría inmutable en Firestore para cada exportación Excel y PDF.
- **Portal cliente**: metadata dinámica en `/seguir/[id]` con estado real del caso.
  Preview de WhatsApp muestra "Estado de Caso: En Trámite | Desmulta".
- **Portal cliente**: bloque empático para estado `descartado` con CTA a WhatsApp
  y número de contacto desde variable de entorno.
- **Portal VIP**: `RateLimitBanner` en la página de login — feedback visual inline
  con countdown para el 429, reemplazando el toast invisible en móvil.

### 🔒 Security

- `vip-jwt.ts`: eliminado fallback hardcodeado `'fallback-vip-secret-...'`.
  `getVipSecret()` lanza error fatal si `VIP_JWT_SECRET` no está definida.
- `env-check.ts`: `VIP_JWT_SECRET` y `PII_HMAC_SECRET` ahora son obligatorias
  en el esquema Zod — el arranque falla en producción si no están presentes.
- `estado/actions.ts`: rate limit migrado de Map en memoria a Firestore.
  Resiste cold starts de Vercel sin resetear contadores.
- `firestore.rules`: se añadieron reglas para `referidos`, `referidosCooldowns`.

### 🐛 Fixes

- `ModalNotaOperador.tsx`: `addQuickReply` reemplaza el texto en lugar de concatenarlo.
- `FAQ.tsx`: texto de garantías reorientado al cliente, sin defensividad.
- `StepSuccess.tsx`: título cambiado de "Certificación en Trámite" a "Consulta Recibida".
- `StepSuccess.tsx`: QR descargable usa `QRCodeCanvas` (nativo a píxeles) en lugar
  de SVG→blob, resolviendo la descarga en blanco en Safari/iOS.

## [v1.0.0] - Mayo 2026

### 🚀 Features

- **Portal VIP**: acceso mediante cédula y celular con JWT HS256 y timeline en tiempo real.
- **Notificaciones Push Web**: FCM integrado, auto-registro y purga de tokens expirados.
- **El Toque Humano**: `ModalNotaOperador` con plantillas y mensajes personalizados
  inyectados en emails y push.
- **Telegram CRM v2.0**: `editMessageText` en lugar de nuevos mensajes — un único
  documento maestro por caso que muta con cada cambio de estado.
- **Comandos Bot Telegram**: `/stats`, `/pendientes`, `/ayuda`.

### 🔒 Security

- `vip-jwt.ts`: `VIP_SECRET` centralizado y exportado.
- Rate limiting persistente en `/api/vip/auth` (Firestore).
- Verificación de ownership en tokens FCM para `/api/vip/web-push`.
- Reglas Firestore: `/private/push`, `otp_rate_limits/`, `referidosCooldowns/` cerradas.

## [v1.0.0] - Lanzamiento Inicial

- Formulario E2EE con RSA, extracción OCR vía API, infraestructura Vercel + Firebase.
