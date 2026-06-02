# CHANGELOG — Desmulta

Todas las versiones y cambios significativos del proyecto.

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
