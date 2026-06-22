# MEMORY.md - Historial del Sistema

## 2026-06-21: Auditoría Enterprise Rev2 - Fase 2 (Escalabilidad y Rendimiento)
- **Qué cambió:**
  - Se instalaron las dependencias `@upstash/qstash` para colas asíncronas y `rss-parser` para extraer feeds seguros.
  - Se refactorizó la función `incrementUsage()` en `api-key-guard.ts` eliminando las transacciones de Firestore por cada Request B2B y cambiándolas por operaciones atómicas `INCR` en Redis (Upstash).
  - Se creó un endpoint CRON (`api/cron/sync-usage/route.ts`) para sincronizar masivamente (`Batch Write`) el uso total desde Redis hacia Firestore.
  - Se desacopló el OCR de la API B2B de forma asíncrona. Si el endpoint `/api/v1/analizar-comparendo` recibe un `webhookUrl`, devuelve `202 Accepted` de inmediato y pasa la imagen a un Worker en QStash (`api/qstash/ocr-worker/route.ts`).
  - Se reescribió la validación de XML en `sync-blog-rss.ts` utilizando el AST de `rss-parser` en lugar de regex quebradizo.
- **Por qué cambió:**
  - Para cumplir con la Sección 6 del informe de auditoría, eliminando los cuellos de botella del procesamiento sincrónico con Gemini AI y el rate-limiting de base de datos bajo alta concurrencia.
- **Archivos afectados:**
  - `package.json`
  - `src/lib/security/api-key-guard.ts`
  - `src/app/api/cron/sync-usage/route.ts`
  - `src/app/api/v1/analizar-comparendo/route.ts`
  - `src/app/api/qstash/ocr-worker/route.ts`
  - `scripts/sync-blog-rss.ts`
- **Decisiones técnicas:**
  - Optamos por un patrón de arquitectura orientada a eventos para el OCR, manteniendo retrocompatibilidad: si no se envía `webhookUrl`, la API B2B opera de forma sincrónica legacy. 
  - La sincronización de cuotas hacia Firestore se hace asíncrona para ahorrar I/O, pero `validateApiKey()` lee en tiempo real el valor de Redis para asegurar que el `remainingMonth` sea estricto.
- **Estado actual:** ✅ Infraestructura B2B lista para escalar de manera masiva y asíncrona sin sobrecostos de servidor ni bloqueos (Timeout 504).

## 2026-06-21: Auditoría Enterprise Rev2 - Fase 1 (Vulnerabilidades Críticas)
- **Qué cambió:**
  - Se corrigió la validación de firmas criptográficas de Wompi en `webhook-wompi/route.ts` utilizando las propiedades dinámicas de `event.signature.properties`.
  - Se exceptuó del geobloqueo a `/api/v1` y `/api/payments/webhook-wompi` en `middleware.ts`.
  - Se blindó la ruta `/api/documentos/download/route.ts` exigiendo `downloadToken` (con verificación de límite de uso de 3 descargas y caducidad de 72 horas) en lugar del parámetro `ref` predecible.
  - Se reconstruyó el esquema de seguridad de las API Keys B2B usando solo el `keyId` como identificador y el secreto como hash SHA-256 en la colección `api_keys`, la cual se protegió totalmente en `firestore.rules`.
  - Se desactivó la publicación automática y se suprimió la autoría falsa del script `sync-blog-rss.ts`.
- **Por qué cambió:**
  - Para resolver los dos hallazgos críticos (Pagos Wompi bloqueados y Gateway B2B no accesible) y dos de riesgo alto (API Keys en texto plano y descarga masiva de PDFs).
- **Archivos afectados:**
  - `src/app/api/payments/webhook-wompi/route.ts`, `src/middleware.ts`, `src/app/api/documentos/download/route.ts`, `src/app/api/admin/api-keys/route.ts`, `src/lib/security/api-key-guard.ts`, `firestore.rules`, `scripts/sync-blog-rss.ts`
- **Decisiones técnicas:**
  - El sistema posee una arquitectura equivalente a las Keys de Stripe, donde los secretos generados antes (que se guardaron con ID = key secreta) quedaron invalidados de facto.
- **Estado actual:** ✅ Todas las brechas Críticas y Altas cerradas.

## 2026-06-21: Auditoría y Depuración de Plataforma (QA & Security)
- **Qué cambió:**
  - Se mitigaron vulnerabilidades críticas en dependencias, se revisaron logs sensibles y se mejoró la suite de tests en `vitest.config.ts` y `teardown.ts`.
- **Por qué cambió:**
  - Para asegurar la compilación impecable y seguridad del proyecto.
- **Estado actual:** ✅ Plataforma auditada.

## 2026-06-21: Implementación de Pagos Wompi (Fases 1 a 4 completadas)
- **Qué cambió:** 
  - Se diseñó un flujo seguro end-to-end con el Widget Web Checkout de Wompi, validación de Sandbox en `/api/payments/create-order` y envío de PDFs al correo mediante Cloud Functions (`retryFailedDeliveries.ts`).
- **Estado actual:** ✅ Desplegado en Sandbox.

## 2026-06-21: Corrección de Errores de Tipado de TypeScript para Producción
- **Qué cambió:**
  - Se tiparon correctamente estados asíncronos y objetos de pago Wompi eliminando todo uso de `any` no explícito.
- **Estado actual:** ✅ Proyecto compila 100% libre de errores de TypeScript en producción.
