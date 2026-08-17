# 🧠 Memoria Central - Desmulta

> ⚠️ **DIRECTIVA ESTRICTA DE MANTENIMIENTO (PARA IAs Y DESARROLLADORES)** ⚠️
>
> 1. **Fechas Obligatorias:** Cada vez que leas, actualices o modifiques este archivo, DEBES fechar la entrada (Ej. `[2026-08-17] Auditoría...`). El archivo debe reflejar la cronología real para evitar la degradación de la documentación.
> 2. **Escepticismo Activo (No confíes ciegamente):** Este archivo es una bitácora, pero la realidad reside en el código y en la infraestructura. Antes de dar por hecho el "Estado Actual", DEBES verificar si las variables de entorno, contenedores o servicios siguen existiendo realmente. Mantenlo conciso, eliminando historial irrelevante.

## 🏗️ Estado Actual de Implementación (Actualizado: 2026-08-17)

### Módulos Principales

1. **Frontend (Next.js 15 / React 19)**:
   - **Tablero Kanban (`vial-clear`)**: Modo compacto activado. Progressive Disclosure para reducir estrés cognitivo.
   - **Dashboard Analytics**: Round-Robin de asignación de operadores integrado.
   - **Calculadora Pública**: Protegida por Cloudflare Turnstile, Honeypots y cifrado E2E.
   - **Seguridad UI**: Sticky CTA para CRO, Light Mode automático (OS-Level), Open Graph dinámico para expedientes.
2. **Backend & Seguridad**:
   - **Zero-PII Storage**: AES-256-GCM y HMAC-SHA256 para aislamiento total de datos de clientes.
   - **Rate Limiting**: Upstash Redis activo (Calculadora limitada a 10 consultas/día por IP).
   - **Middlewares**: Geobloqueo estricto (Solo tráfico desde Colombia - `x-vercel-ip-country`). Defensa Zero-Trust con JWTs de Firebase y OTPs.
3. **Integraciones B2B y Microservicios**:
   - **Motor Financiero (Go)**: Integrado vía HMAC-SHA256 (`desmulta-calculadora-go`). Serverless.
   - **Lector OCR (Python)**: Desplegado en Cloud Run. Usa QStash para mensajería asíncrona.
   - **Pasarela de Pagos (Wompi)**: Credenciales de producción activas. Idempotencia y Circuit Breaker implementados.

---

## 📜 Historial Reciente (Últimos Cambios Clave)

### [2026-08-16 a 2026-08-17] - Auditorías y Hotfixes

- **Criptografía Zero-PII y Auditoría:** 19 vulnerabilidades parchadas exitosamente (incluyendo SSRF, Path Traversal, HTML Injection).
- **Seguridad (OTP):** Se incrementó el tiempo de expiración del código OTP (2FA Administrativo) de 2 a 5 minutos en `src/lib/auth/otp-service.ts` para mitigar delays de Resend.
- **Trazabilidad (Pilar 1 SRE):** Inyección de `X-Trace-Id` en los 3 repositorios para observabilidad distribuida. Alertas de colapso enlazadas directamente a Telegram y Sentry.
- **Cancelación SIMIT Scraper:** El motor de scraping estocástico hacia SIMIT fue inhabilitado permanentemente (HTTP 410 Gone) por cumplimiento de normativa Anti-Scraping (Riesgo Ley 1273 de 2009).

### [2026-08-14] - Implementación de Caché (Pilar 2)

- Patron Cache-Aside con Upstash Redis para proteger los motores pesados de Go (Calculadora) y OCR, mitigando facturación redundante en Serverless.

## 📌 Metas Pendientes / Tareas a Seguir

- Ninguna tarea pendiente a nivel crítico. El sistema se encuentra estable, seguro y en etapa de monitoreo.
