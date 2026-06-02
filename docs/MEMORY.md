# 🧠 MEMORIA ARQUITECTÓNICA — DESMULTA v2.0.0

| Versión | Estado     | Hitos Principales |
| :---    | :---       | :---              |
| v2.0.0  | 🟢 Estable | VIP Portal + Push Notifications + Toque Humano + Telegram sin duplicados |
| v8.10.2 | 🟢 Estable | Auditoría PDF + Previsualización Premium |
| v8.10.1 | 🟢 Estable | Reingeniería PDF + Word-wrap + Saneamiento Linter |
| v8.8.0  | 🟢 Estable | Motor OCR Tesseract 5.0 Integration |

---

## 🛠️ SESIÓN: RECONOCIMIENTO Y ASIGNACIÓN DE ROL ÉLITE (Junio 2026)

**Objetivo:** Asignación del rol de Equipo de Desarrollo Élite (Principal Engineer, DevSecOps, Privacy Officer, DBA, QA). Ejecución obligatoria de la Fase 0 (Detección de Stack y Auditoría).

### Soluciones implementadas

**Fase 0 (Auditoría y Reconocimiento):**
- **Detección Automática de Stack:** Análisis del archivo `package.json`. Stack detectado: Next.js 15.1.0, React 19, Tailwind CSS, Firebase v11 (Client) / v13 (Admin), Zod, Vitest, Playwright.
- **Auditoría de Entorno y Dependencias:** Se inicializó la lectura obligatoria del contexto (`README.md`, `MEMORY.md`). Se ejecutó la sanación de dependencias mediante `npm audit fix` operando a través del entorno de comandos (`cmd.exe /c`).
- **Compromiso Estricto de Reglas:** Asimilación absoluta de la comunicación en español (JSDoc, MEMORY.md, commits), regla de prevención de N+1, protección de datos Zero-PII, e iteración segura en bloques pequeños de archivos.

**Estado de la Arquitectura:**
- Sistema estable y pre-auditado. Listo para recibir la siguiente orden técnica con un control de calidad y DevSecOps reforzado.

---

## 🛠️ SESIÓN: CUSTOM CLAIMS, GOD MODE Y ESTABILIZACIÓN PWA (Mayo 2026)

**Objetivo:** Transicionar a un esquema de seguridad serverless con Zero Cost Reads (Custom Claims), establecer un entorno seguro de administración (God Mode) y estabilizar el ciclo de vida de la PWA.

### Soluciones implementadas

**Autenticación y Privilegios:**
- **Custom Claims:** Migración del rol de administrador hacia Claims en los tokens JWT (`admin: true`), eliminando la necesidad de leer Firestore para validar accesos administrativos.
- **God Mode:** Panel oculto protegido mediante clave (`SUPERADMIN_AUDIT_PASSWORD`) usando tokens JWT efímeros firmados por el backend, que permiten asignar o revocar permisos.
- **Audit Logs Inmutables:** Registro estricto de accesos administrativos y modificaciones con auto-destrucción a los 30 días en base de datos.
- **App Check y CSP:** Implementación de reCAPTCHA Enterprise y ajuste de cabeceras de seguridad CSP (Content-Security-Policy) permitiendo ejecución segura sin bloquear Firebase.

**Reparación y UX:**
- **Zero-Stale Protocol PWA:** Se descubrió un bucle infinito en el servicio de auto-sanación (`PWAAutoUpdater`). Se implementó un escudo protector basado en `document.cookie` (`max-age=30`) que resiste la purga local del navegador, logrando la recarga exitosa y única.

**Estado de la Arquitectura:**
- Sistema validado localmente con 100% de éxito en tests unitarios e integrados.

---
## 🛠️ SESIÓN: CONSOLIDACIÓN DE MÉTRICAS Y LIMPIEZA DE CÓDIGO MUERTO (Mayo 2026)

**Objetivo:** Eliminar redundancia en los paneles de métricas (BI), consolidando toda la inteligencia de negocio en `AnalyticsView` y eliminando la página independiente `/admin/metricas` para reducir deuda técnica.

### Soluciones implementadas

**Limpieza de Código:**
- **Eliminación de Rutas:** Se borró el directorio `src/app/admin/metricas` completo.
- **Eliminación de Componentes:** Se eliminó el componente `MetricsDashboard.tsx` (`src/components/vial-clear/MetricsDashboard.tsx`).
- **Refactorización de UI:** Se eliminó el botón de acceso directo a `/admin/metricas` desde el header de `AdminDashboard.tsx`, unificando la experiencia de usuario exclusivamente en la pestaña de "Estadísticas".
- **Saneamiento:** Se eliminaron las importaciones huérfanas (`BarChart2`) para mantener el código limpio y cumplir estrictamente con los estándares de linting.

**Estado de la Arquitectura:**
- Arquitectura simplificada. Una única fuente de verdad visual (`AnalyticsView.tsx`) para consumir `getAnalyticsStats`.
- Validación de tipos y linter ejecutada satisfactoriamente, asegurando que no queden referencias rotas.

---
## 🛠️ SESIÓN: INSPECCIÓN DE CÓDIGO Y AUDITORÍA DE DEPENDENCIAS (Mayo 2026)

**Objetivo:** Aplicar fase de reconocimiento, auditar stack tecnológico y dependencias, y ejecutar suite de validación, garantizando el cumplimiento de directivas de privacidad y seguridad sin regresiones.

### Soluciones implementadas

**Auditoría de Dependencias (Fase 0):**
- **Reconocimiento de Stack:** Next.js 15, React 19, Tailwind CSS, Vercel Blob, Firebase Admin/Functions Gen2, Zod, Vitest. Panel `TouchDebugger` activo en modo de pruebas.
- **Auditoría:** Se ejecutó `npm audit fix` para tratar de resolver vulnerabilidades en `xlsx`, `workbox-webpack-plugin`, y `uuid`. Se ha evitado el uso de la bandera `--force` para preservar dependencias core como `next` y `firebase-admin`. Existen 16 vulnerabilidades detectadas en subdependencias.

**Mejoras en UI/UX & Debugging:**
- **TouchDebugger:** Se verificó la implementación de `TouchDebugger.tsx`. Atrapa errores sin exponer datos PII en producción, protegido mediante `DEBUG_PIN`.
- **Auto-Crítica:** Revisión interna aprobada. No se encontraron datos en duro, credenciales ni comentarios en inglés en mis contribuciones.

**Estado de la Arquitectura:**
- Suite de pruebas completa (`npm run validate`) superada satisfactoriamente, asegurando CI/CD estable.

---

## 🛠️ SESIÓN: ESTABILIZACIÓN DE PRODUCCIÓN Y QA v2.0.3 (Mayo 2026)

**Objetivo:** Garantizar la fiabilidad total de la plataforma en producción mediante la resolución de fallos de integración, securización y auditoría de UI/UX de cara al cliente.

### Soluciones implementadas

**Infraestructura de Pruebas y QA:**
- **Mocks Dinámicos Next.js:** Inyección de `next/headers` en las pruebas de server actions para evitar colapsos de contexto en `vitest` fuera de las peticiones HTTP (`expediente.actions.test.ts`, `portal-session-security.test.ts`).
- **Fail-CLOSED Persistente:** Mocks robustos para `runTransaction` de Firestore y sincronización estática de `process.env.VIP_JWT_SECRET` en Vitest `setup.ts` para que la suite de pruebas valide la arquitectura anti-DDoS correctamente.
- **Suite Verde:** Logrado el pase de las 255 pruebas en 57 suites validando reglas de seguridad Zero-PII, Rate Limit, y lógicas funcionales.

**Seguridad y Arquitectura:**
- **Zero-PII Hashing:** Sustitución de `SHA-256` simple por `HMAC-SHA256` con Salt (`PII_HMAC_SECRET`) en la creación de consultas antiguas, unificando la criptografía en todo el ecosistema (crítico para la búsqueda en portal VIP).
- **Rate Limit Edge-Ready:** El Rate limit en memoria de `estado/actions.ts` fue migrado a la infraestructura de `Firestore` mediante el motor `rate-limit.ts` (Persistencia entre cold-starts).
- **Protección JWT VIP:** Resolución de la vulnerabilidad en `vip-jwt.ts` donde el secreto caía a un valor por defecto inseguro. Ahora obliga a usar `VIP_JWT_SECRET` en producción con error fatal si no se provee.

**Experiencia del Cliente (UI/UX):**
- **Feedback Empático:** Reelaboración de textos para casos descartados en `TrackingClientUI.tsx`, brindando una explicación clara y ofreciendo pasos de acción en lugar de un "No Viable" agresivo.
- **FAQ Constructivas:** Simplificación y enfoque de asistencia en las FAQs de garantías legales.
- **Portal VIP UX:** Adición de respuestas de error 429 explícitas con cabeceras `Retry-After` propagadas al componente frontend para activar el `RateLimitBanner` correctamente en dispositivos móviles.

**Dashboard Administrativo:**
- **Métricas Real-Time:** Inserción de un contador visual en el encabezado (`TableroFlujoTrabajo.tsx`) para leads recientes (<2h) y urgentes (>2h) mejorando la lectura operacional a simple vista.
- **Logout Seguro:** Habilitado el modal interactivo de advertencia de inactividad (`AdminDashboard.tsx`) que avisa al operador antes de expulsarlo de la sesión, previniendo la pérdida de redacción.

---

## 🛠️ SESIÓN: OPTIMIZACIÓN OPERATIVA Y REPORTES v2.0.2 (Mayo 2026)

**Objetivo:** Mejorar la eficiencia del operador y la entrega de reportes tanto internos como externos.

### Soluciones implementadas

**Generación de Códigos QR para Seguimiento:**
- **Admin Kanban:** Se insertó un QR descargable (SVG) en `ModalDetalleExpediente.tsx` utilizando `qrcode.react`, para que el administrador lo pueda compartir.
- **Cliente (Frontend):** Se agregó el QR en la pantalla de éxito final (`StepSuccess.tsx`) con un botón de descarga.
- **Cliente (Email):** Se implementó `https://api.qrserver.com` en `functions/src/onCaseStatusChange.ts` para inyectar una imagen estática del QR dentro de la plantilla HTML, evitando filtros anti-spam por SVGs o base64.
- **Seguridad:** El QR contiene únicamente la URL de tracking (`/seguir/UUID`), protegiendo los datos PII del cliente según el diseño Zero-PII del sistema.
- **Fix Tipado Kanban:** Se añadió `trackingUuid` a los modelos `ConsultationRow` y `CaseRow` en `useAdminStats`, y se reemplazó el uso obsoleto e inválido de `shortId` en la generación de QR en `ModalDetalleExpediente.tsx`.

**Reportes y Filtros Avanzados (Kanban):**
- Controles de filtrado añadidos a `TableroFlujoTrabajo.tsx` para **Estado**, **Ciudad** y **Fecha**.
- Unificación en `filteredItems` usando `useMemo` para optimizar renders sin re-calcular excesivamente.
- **Excel:** Ajustado para respetar filtros activos e incluye una columna nueva `AHORRO` (SheetJS).
- **PDF:** Implementación de generación dinámica y paginada en A4 utilizando `pdf-lib`.

---

## 🛠️ SESIÓN: HARDENING DE SEGURIDAD + PUSH NOTIFICATIONS (Mayo 2026)

**Objetivo:** Cerrar brechas de seguridad, eliminar duplicados de notificaciones, activar push para todos los usuarios.

### Problema raíz diagnosticado
Cada cambio de estado disparaba 2 funciones en paralelo (`onCaseStatusChange` + `onConsultationStatusChange`) y cada una enviaba un mensaje nuevo a Telegram, resultando en 2–4 mensajes por movimiento. Además, `actions.ts` tenía una Fase 3 que enviaba email y push directamente, creando 2–3 emails por cambio.

### Soluciones implementadas

**Telegram sin duplicados:**
- `onConsultationCreated` guarda el `telegramMessageId` de la respuesta de Telegram.
- `notifyTelegramStatusChange` usa `editMessageText` (edita el mensaje existente) en lugar de `sendMessage`.
- `onConsultationStatusChange` ya no llama `notifyTelegramStatusChange` — solo `onCaseStatusChange` lo hace.
- `cronRetryNotifications` guarda el nuevo `telegramMessageId` cuando reintenta.

**Push notifications activadas:**
- `processCaseEmail` envía push ANTES del bloque de email — usuarios SIMIT sin email reciben push.
- FCM token buscado en `consultations/{id}/private/push` (privado) + fallback en campo raíz.
- `useWebPush.ts` registra el token sin requerir sesión Firebase Auth.
- Token FCM expirado eliminado automáticamente del catch de `admin.messaging().send()`.

**Seguridad:**
- Rate limit VIP auth: `Map` en-memoria → Firestore persistente.
- Ownership check en `/api/vip/web-push`: cédula del expediente debe coincidir con cédula de la sesión.
- `VIP_SECRET` centralizado en `vip-jwt.ts`, exportado para uso externo.
- Firestore rules: subcolección `/private`, `referidos/`, `referidosCooldowns/`, `otp_rate_limits/` explícitamente cerradas.

**Métricas:** 330 archivos · 8 capas de seguridad · Sin deuda técnica crítica activa.

---

## 🛠️ SESIÓN: PORTAL VIP + TOQUE HUMANO (Mayo 2026)

**Objetivo:** Canal de comunicación para usuarios SIMIT (solo teléfono + foto) y humanización del CRM.

### Portal VIP (formulario SIMIT)
- `/vip` — Login con cédula + celular → JWT HS256 → cookie httpOnly.
- `/vip/dashboard` — Timeline de estado del expediente en tiempo real.
- `VipPushNotification.tsx` — Activación de notificaciones push para usuarios VIP.
- `/api/vip/auth` — Autenticación con verificación en Firestore + rate limit.
- `/api/vip/web-push` — Registro de FCM token con ownership validation.
- `src/lib/security/vip-jwt.ts` — `signVipSession` / `verifyVipSession` / `VIP_SECRET`.

### El Toque Humano (notas del operador)
- `ModalNotaOperador.tsx` — Dialog que aparece al cambiar estado en Kanban.
- El operador puede escribir un mensaje personal (opcional).
- `operatorNote` se guarda en `history[]` del documento en Firestore.
- La Cloud Function `onCaseStatusChange` extrae el último `operatorNote` de `history` y lo incluye en el email al cliente y en el body del push.
- `email-templates.ts` tiene el bloque HTML del `operatorNote` con estilo cursiva.

---

## 🛠️ SESIÓN: CRM TELEGRAM v2.0 (Mayo 2026)

**Objetivo:** Eliminar fragmentación de datos y estabilizar flujo de operaciones en Telegram.

- **Unificación:** `cambiarEstado` crea un documento maestro en `cases/` cuando el operador pulsa "Contactado". Resuelve el problema de datos esparcidos en múltiples colecciones.
- **Idempotencia:** `processed_callbacks` bloquea dobles ejecuciones bajo latencia de red.
- **Comandos bot:** `/stats`, `/pendientes`, `/ayuda` para consultas rápidas del operador.
- **Estado final:** Backend CRM v2.0 funcional y centralizado.

---

## 🏗️ DECISIONES DE ARQUITECTURA PERMANENTES

| Decisión | Razón |
|---|---|
| Cloud Functions Gen2 para notificaciones | Desacoplado del servidor Next.js. Auto-retry. Sin cold start en triggers Firestore. |
| FCM token en subcolección `/private/push` | El cliente no puede leer tokens de otras personas via Firestore rules. |
| `editMessageText` en lugar de `sendMessage` | 1 mensaje por caso en Telegram, no 1 por cada cambio de estado. |
| `processCaseEmail` como función única | Email + push + operatorNote en un solo lugar. Fácil de testear y mantener. |
| Rate limit Firestore (no Map en-memoria) | Persiste entre workers serverless de Vercel. Fail-CLOSED: si Firestore falla, bloquea. |
| Zero-PII en `public_tracking` | SHA-256 de cédula. El tracking público no expone identidad. |
| RSA E2EE en formulario | La clave privada nunca sale del servidor. El proxy de Vercel tampoco ve los datos. |

---

## 🛠️ SESIÓN: REVISIÓN DE SEGURIDAD Y CUMPLIMIENTO (Mayo 2026)

**Objetivo:** Aplicar fase de reconocimiento, auditar stack tecnológico y dependencias, garantizando el cumplimiento de directivas de privacidad y seguridad sin regresiones.

### Soluciones implementadas

**Auditoría de Dependencias (Fase 0):**
- **Reconocimiento de Stack:** Next.js 15, React 19, Tailwind CSS, Vercel Blob, Firebase Admin/Functions Gen2, Zod, Vitest.
- **Auditoría:** Se ejecutó `npm audit fix`. Detectadas 16 vulnerabilidades heredadas (14 moderadas, 2 altas) en subdependencias (`xlsx`, `postcss`, `uuid`). Se evitó la bandera `--force` para preservar dependencias core como `next` y `firebase-admin`. Se recomienda reemplazar `xlsx` por una alternativa sin riesgo de ReDoS.

**Refactorización y Mitigación de Vulnerabilidad:**
- **Reemplazo de `xlsx` por `exceljs`:** Se removió la librería `xlsx` (vulnerable a Prototype Pollution y ReDoS) y se implementó `exceljs` junto con `file-saver` para la exportación del Kanban en `TableroFlujoTrabajo.tsx`.
- **Pruebas Automatizadas:** Se redactó prueba unitaria (`TableroFlujoTrabajo.test.tsx`) y prueba End-to-End (`admin-export.test.ts`) validando que la integración en el frontend y el trigger de descarga funcionen correctamente, mitigando roturas futuras.

**Estado de la Arquitectura:**
- La arquitectura mantiene 8 capas de seguridad activas (Zero-PII Hashing, E2EE RSA).
- Privacidad asegurada: No se hallaron credenciales hardcodeadas (se utiliza configuración en `.env` / Vercel Secrets).

---

## ⚠️ FIX PENDIENTE MENOR (no bloquea producción)

No hay fixes menores pendientes reportados.

---

## 🛠️ SESIÓN: RECONOCIMIENTO Y ASIGNACIÓN DE ROL ÉLITE (Mayo 2026)

**Objetivo:** Inicialización del agente como Equipo de Desarrollo Élite (Principal Engineer, DevSecOps, Privacy Officer, DBA, QA) y ejecución de la Fase 0.

### Soluciones implementadas

**Fase 0 (Auditoría y Reconocimiento):**
- **Detección Automática de Stack:** Análisis del `package.json` completado. El stack detectado incluye Next.js 15.1.0, React 19, Tailwind CSS, Radix UI, Firebase (Admin v13, Client v11, Next-Firebase-Auth-Edge), Vitest, Playwright y Zod.
- **Auditoría de Entorno:** Se identificaron políticas de ejecución restrictivas en PowerShell local (Execution Policies) para comandos `npm`. Las llamadas a `npm` se ejecutarán mediante `cmd.exe /c` si es estrictamente necesario.
- **Validación Documental:** Se leyeron satisfactoriamente `README.md` y `docs/MEMORY.md`, recuperando el contexto de seguridad (Zero-PII, Custom Claims, ExcelJS) implementado en las sesiones previas.

**Estado de la Arquitectura:**
- Sistema estable sin modificaciones estructurales aplicadas en esta inicialización. Listo para recibir la primera orden de trabajo.

---

## 🛠️ SESIÓN: AUDITORÍA QA A PETICIÓN (Mayo 2026)

**Objetivo:** Verificar la afirmación de estabilidad ejecutando las pruebas de integración y rate limit a petición explícita.

### Soluciones implementadas

**Auditoría y Corrección de QA:**
- **Rate Limit Validado:** Se ejecutó la suite completa. Las pruebas de estrangulamiento (`src/tests/telemetry.test.ts`) pasaron exitosamente confirmando que el bloqueo por IP masiva (`ip-flood`) funciona en el motor de telemetría.
- **Detección de Deuda Técnica en Tests:** Se halló que `__tests__/expediente.actions.test.ts` estaba fallando. Los mocks esperaban datos en texto plano (`cedula`, `telefono`), pero el backend ya había sido refactorizado a **Zero-PII Hashing**.
- **Refactorización de Pruebas:** Se actualizó `expediente.actions.test.ts` introduciendo un mock para `hashPII` y cambiando las aserciones a `cedulaHash` y `telefonoHash`. También se sincronizó el string del logger (`[FinOps] Nuevo expediente creado (Zero-PII):`).
- **Validación Exitosa:** Tras la corrección, la ejecución local mediante `vitest run __tests__/expediente.actions.test.ts` devolvió un pase 100% verde (3 tests exitosos en 21ms).

**Estado de la Arquitectura:**
- Pruebas de integración completamente alineadas con la arquitectura segura actual. La infraestructura DevSecOps está 100% en verde.

---

## 🛠️ SESIÓN: INCIDENTE OPERATIVO DE INFRAESTRUCTURA (Mayo 2026)

**Objetivo:** Resolver falla crítica reportada en producción (Vercel) al intentar acceder a la ruta `/admin/auditoria`.

### Soluciones implementadas

**Diagnóstico DevSecOps:**
- **Problema:** El log de Vercel arrojó `[ERROR] CRITICAL: GOD_MODE_JWT_SECRET no configurada.` con un status 200 en el middleware pero fallando en el Server Action interno (`verifyGodMode`).
- **Causa Raíz:** La arquitectura de seguridad *God Mode* se diseñó bajo un modelo "Fail-CLOSED". Si la variable de entorno responsable de firmar criptográficamente las cookies de sesión (`GOD_MODE_JWT_SECRET`) no existe, el sistema bloquea inmediatamente cualquier intento de acceso, evitando fugas de seguridad o el uso de valores por defecto inseguros en producción.
- **Resolución:** Se instruyó al arquitecto/usuario a inyectar la variable `GOD_MODE_JWT_SECRET` directamente en el panel de Vercel y redesplegar, ya que el código se encuentra estable y actuó exactamente como fue diseñado (Defensa en Profundidad).

**Estado de la Arquitectura:**
- Sistema protegiéndose activamente contra malas configuraciones en producción. Infraestructura robusta.

---

## 🛠️ SESIÓN: RESOLUCIÓN DE LINTER Y CONFIGURACIÓN VERCEL (Mayo 2026)

**Objetivo:** Eliminar los warnings de ESLint (`any` implícitos y vulnerabilidad de ataque de tiempo) y generar el token para el acceso a God Mode.

### Soluciones implementadas

**Refactorización de Tipado estricto:**
- **Auditoría God Mode:** Se sustituyeron los tipos `any` por `unknown` o `Record<string, unknown>` en `src/app/admin/audit-actions.ts` y la página `page.tsx` para satisfacer la regla `--max-warnings 0`.
- **Mitigación de Timing Attack:** En `verifyGodMode` se utilizaba una simple igualdad (`password !== expectedPassword`). Se reemplazó por la función nativa `timingSafeEqual` de `node:crypto` (junto a la comprobación de longitud de buffer) para evitar ataques de tiempo contra la contraseña maestra.
- **Limpieza de variables no usadas:** Se ignoró un parámetro de error en `PWAAutoUpdater.tsx` y se ajustó el cast de window en `client-provider.tsx` eliminando `any`.
- **Suite Verde:** La ejecución de `npm run lint` finalizó con 0 errores y 0 advertencias, garantizando el estándar de calidad en el CI.

**Resolución de Configuraciones:**
- **God Mode JWT Secret:** El usuario intentó generar un Hash en un entorno de PowerShell local con sintaxis Node.js lo cual falló. El agente generó proactivamente una clave aleatoria segura de 64 caracteres Hex para ser inyectada en Vercel como `GOD_MODE_JWT_SECRET`.
- **Auditoría de Dependencias Legacy:** Se investigó el origen de las advertencias del paquete `uuid`, `rimraf` y `glob` en consola, concluyendo que provienen de librerías de terceros fuertemente acopladas (`exceljs`, `@ducanh2912/next-pwa`, `firebase-admin`). Se desaconseja hacer un override (resolutions) brusco para evitar romper la exportación de Excels o el registro PWA; se esperará a la actualización por parte de sus respectivos autores.

**Estado de la Arquitectura:**
- Calidad de código restaurada a `--max-warnings 0` en el Linter.
- El despliegue de Vercel debe funcionar correctamente tras inyectar la clave provista.

---

## 🛠️ SESIÓN: DESPLIEGUE REGLAS FIRESTORE Y VALIDACIÓN ÉLITE (Junio 2026)

**Objetivo:** Resolver el error de permisos `Missing or insufficient permissions` en la colección `site_config` y ejecutar la fase 0 del nuevo mandato de Equipo de Desarrollo Élite.

### Soluciones implementadas

**Diagnóstico y Despliegue (Firestore):**
- **Causa Raíz:** El entorno local (`npm run dev`) conectaba a la base de datos de producción (`studio-9140393615`), pero las reglas actualizadas en el repositorio local (que permitían acceso público a `site_config/showcase`) no habían sido desplegadas en la nube.
- **Solución:** Se utilizó el servidor MCP para desplegar `firestore.rules` al entorno de producción, sincronizando las políticas y permitiendo la carga exitosa de componentes interactivos (como `SavingsCounter`).

**Reconocimiento y Estandarización (Fase 0):**
- **Detección Automática:** Stack verificado (Next.js 15, Firebase 11, Zod, Tailwind, Vitest). Las auditorías operan sobre este marco.
- **Validación Completa:** Se ejecutó la pipeline completa (`npm run format && npm run typecheck && npm run test:integration && npm run test:e2e && npm run build && npm run lint`), certificando la estabilidad de extremo a extremo sin introducir nuevas regresiones.

**Estado de la Arquitectura:**
- 🟢 Estable. El modelo de permisos de Firestore ahora está unificado y el sistema ha pasado los controles más estrictos de tipo y linting.
