# CHANGELOG — Desmulta

Todas las versiones y cambios significativos del proyecto.

## [v1.0.1] - Junio 2026
### ✨ Features & UX
- **Kanban Cinético:** Implementación de un motor de *edge-scroll* basado en `requestAnimationFrame` para la versión móvil del Tablero Flujo de Trabajo, mejorando radicalmente la usabilidad al arrastrar tarjetas hacia los bordes.
- **Loading Skeletons (SSR):** Incorporados estados de carga (`loading.tsx`) nativos de Next.js en las rutas de mayor impacto (Blog, Multas por ciudad y Portal VIP) evitando destellos visuales durante la hidratación y revalidación SSG.
- **Auditoría Forense Avanzada:** `TouchDebugger` evolucionó a la **v9.0**, integrando intercepción global de red y consola, auto-heal (Botón NUCLEAR) perfeccionado sin bloqueos en Android (sin `window.confirm`), y correcciones de fugas de memoria al desmontar.

### 🔒 Security & FinOps
- **Zero-PII & Fail-Closed Testing:** Se reforzó el pipeline DevSecOps con 4 nuevas suites de pruebas (`piiScrubber-colombia`, `rate-limit-failclosed`, `prescription-engine-edge`, `middleware-auth`) garantizando que ninguna regresión rompa la anonimización legal y el firewall.
- **Índices Firestore Strict:** Creado índice compuesto (`event` ASC, `ts` DESC) en `edge_telemetry` para asegurar la velocidad extrema de las consultas de analíticas sin desbordar el consumo.

## [v1.0.0] - Mayo 2026
### 🚀 Estabilidad & CI/CD
- **Full Coverage Enforcement:** El workflow de GitHub Actions ahora incluye validación dura de cobertura de tests (`npm run test:coverage:ci`) antes de realizar el build.
- **Tipado Estricto de Errores:** Bloques `catch (e)` refactorizados a `catch (e: unknown)` y chequeos de `instanceof Error` a lo largo del panel de administración (Galería, Layout) para evitar crashes por tipos `any` inseguros.

### 🔒 Security & Sentry
- **Logs Cero-Exposición:** Reemplazados llamados genéricos de `console.error` y `console.warn` en `env-check.ts`, `tesseract-worker.ts`, y `pushService.ts` por envíos directos a `SecurityLogger`.
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
- **FIX CRÍTICO (God Mode):** Eliminado el *fallback inseguro* hardcodeado (`desmulta-admin-2026`) en `audit-actions.ts`. Si la variable `SUPERADMIN_AUDIT_PASSWORD` falta, el sistema bloquea el acceso por defecto.
- **Zero-PII en Expedientes:** `expediente.actions.ts` fue refactorizado. Ya no almacena nombres, cédulas ni teléfonos en texto plano en la colección `leads`, asegurando privacidad end-to-end usando `hashPII()`.
- **Rendimiento Masivo (FinOps):** `deleteExpiredConsultations` en `admin/actions.ts` ahora ejecuta operaciones paginadas (`.limit(500)`) para evitar colapsos por *Out of Memory* (Timeout) en Vercel Serverless.

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
- Formulario E2EE con RSA, OCR Tesseract client-side, infraestructura Vercel + Firebase.
