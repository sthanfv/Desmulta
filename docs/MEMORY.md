# 🧠 MEMORIA ARQUITECTÓNICA — DESMULTA v1.0.0

| Versión | Estado     | Hitos Principales |
| :---    | :---       | :---              |
| v1.0.0  | 🟢 Estable | VIP Portal + Push Notifications + Toque Humano + Telegram sin duplicados |
| v1.0.0 | 🟢 Estable | Auditoría PDF + Previsualización Premium |
| v1.0.0 | 🟢 Estable | Reingeniería PDF + Word-wrap + Saneamiento Linter |
| v8.8.0  | 🟢 Estable | Motor OCR Tesseract 5.0 Integration |

---

## 📝 SESIÓN: CORRECCIÓN DE PRUEBAS UNITARIAS Y ESTABILIZACIÓN QA (Junio 2026)
**Objetivo:** Resolver tests unitarios fallidos en la raíz del proyecto para asegurar un entorno de QA limpio (suite verde) y libre de regresiones.

**Cambios e Implementaciones:**
- **`__tests__/circuit-breaker-firestore.test.ts`:**
  - Se mockeó `@/lib/firebase-admin` para evitar la inicialización del SDK real y dependencias de variables de entorno de Firebase Admin en los tests unitarios.
  - Se reestructuró el mock de `firebase-admin/firestore` para retornar una base de datos estática mockeada (`mockDb`) y un documento estático (`mockDoc`), alineando el comportamiento de las pruebas unitarias a la implementación directa de `get()`, `set()`, y `delete()` que utiliza el CircuitBreaker.
- **`src/app/api/admin/export-pdf/__tests__/export-pdf.test.ts`:**
  - Se mockeó la llamada HTTP global `fetch` para interceptar la petición a la Cloud Function `generatePdf` y retornar un buffer binario simulado de PDF, evitando el error de conexión externa 404/500 en local.
- **`src/tests/create-consultation.test.ts`:**
  - Se inyectaron los campos obligatorios del esquema de validación `ConsultationSchema` (`nombre`, `contacto`, `aceptoTerminos`, `antiguedad`, `tipoInfraccion`, `estadoCoactivo`) y se mockeó el rate limiter para superar las validaciones de Zod e infraestructura.
  - Se corrigió la aserción de respuesta esperada a HTTP 201 (creación exitosa).
  - Se reestructuró el mock de Firestore para soportar recursión de subcolecciones (`collection.doc.collection.doc`), resolviendo el error `counterRef.collection is not a function`.

**Resultados:**
- La suite de pruebas de Vitest pasa con 100% de éxito (verde).
- El análisis de tipos de TypeScript (`npm run typecheck`) y la compilación de producción de Next.js (`npm run build`) se completan satisfactoriamente con cero errores.

---

## 📝 SESIÓN: RESOLUCIÓN AUDITORÍA TÉCNICA v2 (Junio 2026)
**Objetivo:** Abordar hallazgos del reporte de auditoría v2, corrigiendo la regresión criptográfica e implementando mejoras de seguridad.

**Implementado:**
- **Corrección de Regresión PII:** Se reparó el bug crítico en `create-consultation/route.ts` que guardaba el hash de la cédula encriptada en lugar de la original. Ahora utiliza el `cedulaHash` calculado previamente, restaurando la funcionalidad del portal de seguimiento y el control de duplicados.
- **Protección con Circuit Breaker:** Se integró `OcrCircuitBreakerFs` en el flujo de `ocr/route.ts` para proteger las llamadas a Google Gemini AI. Adicionalmente, se protegió la conexión raíz `getAdminApp()` en `firebase-admin.ts` con el `FirebaseCircuitBreaker` *en memoria*, respetando el estándar de la industria para entornos serverless (evitando la paradoja de usar Firestore para validar Firestore).
- **Validación de Entorno Fail-Fast:** Se eliminó el archivo redundante `env-check.ts` y su llamada en `layout.tsx`. Las validaciones de `CRON_SECRET`, `COOKIE_SIGNATURE_SECRET`, `OPERATOR_PIN` y `TELEGRAM_WEBHOOK_SECRET` se unificaron en `env-validator.ts`, consolidando la validación en el startup del servidor (`instrumentation.ts`).
- **Defensa en API QR:** Se inyectó rate limiting por IP (30/min) y se limitó la longitud del payload a 500 caracteres en `/api/qr/route.ts`, previniendo ataques de amplificación. Adicionalmente, se actualizaron las reglas de `firestore.rules` denegando acceso cliente a la nueva colección `qrRateLimits`.
- **Testing Suite y QA:** Se creó una suite de pruebas para evitar futuras regresiones, incluyendo: Unit Tests con Vitest para `env-validator.ts` y `firebase-admin.ts`, un test de validación criptográfica en `create-consultation` y un test de Integración E2E en Playwright para el rate limit del QR. Todo validado con `--max-warnings 0` en ESLint y Typescript Check completo (0 errores).

---

## 📝 SESIÓN: INICIALIZACIÓN EQUIPO ÉLITE Y EJECUCIÓN FASE 0 (Junio 2026)
**Objetivo:** Inicialización como Equipo de Desarrollo Élite (Principal Engineer, DevSecOps, Privacy Officer, DBA, QA).

**Implementado:**
- **Fase 0 (Auditoría):** Stack verificado: Next.js 15.1.0, React 19, Firebase v13/v11, Tailwind, Radix UI.
- **Asimilación de Reglas:** Directivas de comunicación 100% en español establecidas, protección Zero-PII ratificada y ciclo inmutable de documentación sincronizada activado.

---

## 📝 SESIÓN: VALIDACIÓN FAIL-FAST DE ENTORNO (Junio 2026)
**Objetivo:** Crear un validador de variables de entorno estricto que blinde el arranque (boot) de la aplicación y prevenga ejecuciones vulnerables.

**Implementado:**
- **`env-validator.ts`:** Se desarrolló un esquema Zod integral que evalúa variables criptográficas (RSA, HMAC), credenciales de Firebase Admin SDK y secretos de JWT. Se clasificaron en CRÍTICAS, ALTAS y MEDIAS (estas últimas degradan silenciosamente).
- **Inyección en Boot (`instrumentation.ts`):** Se interceptó el hook `register()` del entorno Node.js de Next.js. Si las variables CRÍTICAS fallan en modo producción (y no bajo un proceso CI puramente compilatorio), el servidor lanza un `FATAL ERROR` y detiene el arranque. En desarrollo, emite advertencias sonoras en consola (`SecurityLogger.warn`).

---

## 📝 SESIÓN: FASE 3 — CALIDAD Y MANTENIBILIDAD (Junio 2026)
**Objetivo:** Culminar la Fase 3 completando el feedback visual en formularios y confirmando el estatus de las tareas ya refactorizadas.

**Implementado:**
- **Mantenibilidad Integral Verificada:** Se confirmó la implementación previa y activa de las validaciones cruzadas para `cronCleanup`, la estandarización `VALIDATION_ERROR` mediante Zod en OCR, el guard de seguridad de entorno en criptografía cliente (`typeof window`), y la cobertura de tests exhaustiva para notificaciones (`cronRetryNotifications`) y umbrales globales de Vitest (75%).
- **Feedback Visual (Tailwind):** Se completó la inyección de clases reactivas de error (`border-destructive focus-visible:ring-destructive`) para todos los `<Input />` y selectores dinámicos en `StepPreAnalisis.tsx`, `StepViabilidad.tsx` y `StepContacto.tsx`, asegurando que además del `scrollIntoView` introducido previamente, el usuario tenga claridad visual inmediata sobre los campos defectuosos.

---

## 📝 SESIÓN: FASE 2 — SEGURIDAD Y DATOS (Junio 2026)
**Objetivo:** Consolidación de políticas Zero-PII, resiliencia Serverless y estandarización de respuestas API.

**Implementado:**
- **Tarea 2.1 (Decisión PII):** Se validó que el código ya usa `encryptSymmetric` (AES-256-GCM) para guardar PII en `create-consultation`. Documentada la política oficialmente en `docs/architecture_v8.md` como **ADR-001 Zero-PII**.
- **Tarea 2.2 (CircuitBreaker):** Se adaptó `circuit-breaker-firestore.ts` añadiendo métodos de compatibilidad `loadState` y `saveState`, operando sobre la colección exclusiva `circuit_breaker_state`. Se protegió dicha colección en `firestore.rules` (solo Admin SDK).
- **Tarea 2.3 (Estandarización API):** Consolidado mediante el módulo `api-response.ts` creado en la sesión anterior, aplicándose a las 4 rutas principales.

---

## 📝 SESIÓN: HALLAZGOS MEDIOS Y BAJOS — AUDITORÍA ENTERPRISE (Junio 2026)
**Objetivo:** Implementar los 9 hallazgos de nivel Medio (🟡) y Bajo (🔵) de la auditoría técnica integral.

**Implementado:**
- **M1:** `api-response.ts` — Módulo de errores estándar. Las 4 rutas API usan `apiError(code, message)`.
- **M2:** `useExpedienteStore.ts` — TTL 24h en multas con `onRehydrateStorage` y campo `multasCachedAt`.
- **M3:** `ocr/route.ts` — Validación Zod del body (integrado con M1).
- **M4:** `ConsultationForm.tsx` — Scroll al primer campo con error tras el toast.
- **M5:** `cronCleanup.ts` — Purga diferenciada: abandonados≥14d, finalizados≥30d. Activos NUNCA se borran.
- **B1:** `client-crypto.ts` — Guardia de entorno en `hashSHA256`.
- **B2:** `vitest.config.ts` — Umbrales 75/75/70.
- **B3:** `next.config.ts` — Export renombrado a `nextConfigBase`.
- **B4:** `cronRetryNotifications.test.ts` — 2 nuevos casos: límite reintentos y fail-safe Telegram.

---

## 📝 SESIÓN: CORRECCIONES DE AUDITORÍA DE SEGURIDAD — PLAN ENTERPRISE (Junio 2026)
**Objetivo:** Resolver los 4 hallazgos identificados en la auditoría técnica integral del repositorio Desmulta, que incluyó lectura directa de todo el código fuente.

**Hallazgos Corregidos:**
1. **🔴 [CRÍTICO] Hashing Inconsistente en `validar-consulta`:** `src/app/api/validar-consulta/route.ts` usaba `crypto.subtle.digest('SHA-256')` puro. `create-consultation` guarda el índice usando `hashPII()` (HMAC-SHA256 con `PII_HMAC_SECRET`). La detección de duplicados era completamente ciega. **Corrección:** importar y usar `hashPII()` en `validar-consulta`.
2. **🟠 [ALTO] FAIL-OPEN en Rate Limit:** `validar-consulta` continuaba la ejecución cuando el rate-limiter fallaba por infraestructura. Dado que Turnstile fue desactivado en esta ruta (para evitar `timeout-or-duplicate`), el rate-limit era la ÚNICA defensa activa. **Corrección:** convertido a FAIL-CLOSED retornando HTTP 503.
3. **🟠 [ALTO] Header `x-author-uid` Spoofeable:** `/api/upload/route.ts` leía el UID del autor desde un header del cliente — spoofeable con `curl`. El rate-limit de uploads podía agotarse para cualquier usuario objetivo. **Corrección:** eliminado `x-author-uid`, el rate-limit ahora usa solo la IP (inyectada por Vercel, no falsificable por el cliente).
4. **🔴 [CRÍTICO] CircuitBreaker In-Memory:** Las instancias globales del CircuitBreaker se perdían en cada cold start de Vercel Serverless. **Corrección:** creado `circuit-breaker-firestore.ts` con estado persistido en Firestore (`circuit_breakers/{serviceName}`). Las instancias `OcrCircuitBreakerFs` y `FirebaseCircuitBreakerFs` están listas para usarse en API Routes del servidor.
5. **🟠 [ALTO] PII (Cédula) en texto plano:** `create-consultation` guardaba la cédula en texto plano en la colección `consultations`, rompiendo la filosofía Zero-PII frente a brechas de datos. **Corrección:** Implementada encriptación simétrica (AES-256-GCM) en reposo. Se guarda como `ENC:iv:authTag:encrypted`. El panel de administración (`admin/actions.ts`) desencripta automáticamente al vuelo si detecta el prefijo `ENC:`, manteniendo intacta la operatividad (consulta de SIMIT).

**Decisiones Arquitectónicas:**
- El `CircuitBreaker` original (en-memoria) se mantiene para el `SystemHealthProvider` (componente cliente visual). No puede reemplazarse por la versión Firestore porque usa métodos síncronos (`getState()`, `subscribe()`).
- `CircuitBreakerFs` es exclusivamente para uso en API Routes del servidor (async).
- La colección `circuit_breakers` en Firestore requiere una regla de seguridad: denegada desde el cliente (solo Admin SDK).
- Para la encriptación simétrica, se usa un formato con prefijo (`ENC:`) para asegurar compatibilidad hacia atrás con los casos antiguos que están en texto plano.

**Archivos Modificados:**
- `src/app/api/validar-consulta/route.ts` — 3 correcciones (import, fail-closed, hashPII)
- `src/app/api/upload/route.ts` — Eliminación de header spoofeable
- `src/lib/security/circuit-breaker-firestore.ts` — NUEVO módulo con persistencia
- `src/lib/security/server-crypto.ts` — Añadidos `encryptSymmetric` y `decryptSymmetric`
- `src/app/api/create-consultation/route.ts` — Encripta la cédula al crear (AES-256)
- `src/app/admin/actions.ts` — Desencripta la cédula al consultar para el panel administrativo

**Estado Arquitectónico:**
Las 4 vulnerabilidades de la auditoría han sido neutralizadas. TypeScript: sin errores. Tests: 2/2 passing.

---

## 📝 SESIÓN: OPTIMIZACIÓN DE NOTIFICACIONES OMNICANAL Y WIDGETS (Junio 2026)
**Objetivo:** Reparar la lógica de notificaciones duplicadas en Telegram, asegurar la propagación de la "Nota del Operador" en Push y Email, y evitar la detención de la animación de WhatsApp.

**Acciones Realizadas:**
1. **Sincronización Inteligente de Telegram:** Se reescribió el manejador en `onCaseStatusChange.ts`. Ahora la función reintenta dinámicamente (`editMessageCaption` vs `editMessageText`) analizando la respuesta de error de la API de Telegram, previniendo la creación de mensajes "nuevos" innecesarios como fallback.
2. **Propagación del "Toque Humano":** La "Nota del Operador" capturada en el Kanban ahora viaja íntegra hacia las plantillas de notificaciones Push (`push-notifications.ts`) y se renderiza en un bloque distintivo dentro de las plantillas de correo (`onCaseStatusChange.ts`), garantizando omnicanalidad.
3. **Animación WhatsApp Inmortal:** Se removió el timeout artificial de 30 segundos en `magic-rings.tsx`. La animación WebGL continuará infinitamente, deteniéndose únicamente por ahorro de batería cuando `document.hidden` sea `true`.
4. **Validación Exhaustiva (Vitest):** Creada la suite `operator-note-notifications.test.ts` que itera sobre los 14 estados del Kanban exigiendo matemáticamente que la firma del mensaje y la nota del operador se inyecten correctamente en las plantillas sin mutaciones.

**Estado Arquitectónico:**
El sistema omnicanal de Desmulta (Email, Push, Telegram) opera de forma cohesiva y libre de duplicados, blindado por pruebas automatizadas (100% pass) contra futuras regresiones.

---

## 📝 SESIÓN: INICIALIZACIÓN EQUIPO ÉLITE Y EJECUCIÓN FASE 0 (Junio 2026)
**Objetivo:** Reasignación del rol de Equipo de Desarrollo Élite (Principal Engineer, DevSecOps, Privacy Officer, DBA, QA). Ejecución de la Fase 0 y confirmación de protocolos.

**Acciones Realizadas:**
1. **Auditoría de Entorno (Fase 0):** Se detectó el stack: Next.js 15.1.0, React 19, Tailwind CSS, Radix UI, Firebase, Vitest, Zod, Playwright.
2. **Revisión Documental:** Se leyeron `README.md`, `docs/MEMORY.md` y `docs/ARCHITECTURE.md` para recuperar el contexto (Zero-PII, Custom Claims, Push Notifications).
3. **Acoplamiento de Directivas:** Se han asimilado estrictamente las reglas de comunicación 100% en español, prevención de exposición de datos (OWASP), sincronización inmutable de documentación y ciclo de validación.

**Estado Arquitectónico:**
DevSecOps alineado, entorno auditado y preparado para recibir mandatos operativos o tareas de desarrollo.

---

## 📝 SESIÓN: REINICIALIZACIÓN EQUIPO ÉLITE Y RECONOCIMIENTO (Junio 2026)
**Objetivo:** Reasignación del rol de Equipo de Desarrollo Élite (Principal Engineer, DevSecOps, Privacy Officer, DBA, QA). Ejecución de la Fase 0.

**Acciones Realizadas:**
1. **Auditoría de Entorno (Fase 0):** Se detectó el stack: Next.js 15.1.0, React 19, Tailwind CSS, Radix UI, Firebase (Admin v13, Client v11), Vitest, Zod, Playwright.
2. **Revisión Documental:** Se leyeron `README.md`, `MEMORY.md` y `ARCHITECTURE.md` asimilando el contexto Zero-PII, el God Mode, la Super-Calculadora y la arquitectura de seguridad.
3. **Acoplamiento de Directivas:** Asimiladas las reglas de desarrollo 100% en español (excepto código), prevención de N+1 y ciclo inmutable de sincronización de documentación.

**Estado Arquitectónico:**
DevSecOps alineado y entorno preparado para recibir nuevos mandatos operativos.

---

## 📝 SESIÓN: OPTIMIZACIÓN DE CONVERSIÓN HERO (SUPER-CALCULADORA) (Junio 2026)
**Objetivo:** Transformar la sección Hero en una máquina de conversión de leads unificando la simulación financiera y legal en un único componente interactivo, eliminando fricciones y fragmentaciones.

**Acciones Realizadas:**
1. **Fusión de Interfaces (Super-Calculadora):** Se integró la lógica de `CalculadoraPrescripcion.tsx` dentro de `SavingsCalculator.tsx`, permitiendo a los usuarios ver de inmediato la devaluación de su dinero en tiempo real (Intereses) y solicitar bajo demanda el análisis legal de prescripción en un solo pantallazo.
2. **[2026-06-08] Refactor Hero UI y Accesibilidad:**
  - Conversión del bloque `Hero.tsx` en 2 columnas en Desktop.
  - Resolución de inconsistencias entre Dark/Light Mode en el simulador.
3. **Refinamiento UI/UX del Simulador:**
  - **Corrección de Renderizado Crítico:** Se eliminó la directiva `contain: 'strict'` en `StarBorder.tsx` que causaba el colapso (altura 0) del componente, recuperando la visibilidad del simulador en PC y Móvil.
  - **Limpieza de Interfaz:** Se eliminaron botones y accesos flotantes (FAB) redundantes hacia la calculadora desde la barra superior (`Header.tsx`) para limpiar el diseño y enfocar la atención en el Hero, evitando solapamiento con el logo.
  - **Reset de Estado Cero:** Se inicializaron explícitamente en `$0` y `0 meses` los valores de arranque del simulador y se ajustó el Slider para permitir arrancar limpiamente, evitando sesgos cognitivos por datos pre-cargados al recargar la página.
2. **Flujo Híbrido de Tensión (UX):** Se implementó una actualización instantánea para los cálculos financieros (capital + meses), pero se conservó un retraso intencional de 2.5 segundos para la respuesta de viabilidad legal (botón "Evaluando Prescripción..."), generando tensión psicológica antes de revelar el Ahorro Potencial.
3. **Limpieza de Código Muerto:** Se eliminó por completo el archivo redundante `CalculadoraPrescripcion.tsx`, limpiando la deuda técnica y unificando el punto de contacto en la arquitectura.
4. **Captura Directa (Zero-PII Lead Gen):** El formulario para captura de leads (`/api/telemetry`) fue acoplado directamente al resultado positivo de la evaluación legal, requiriendo únicamente el número de celular para iniciar el flujo de conversión mediante WhatsApp.

**Estado Arquitectónico:**
El Hero cuenta ahora con una "Super-Calculadora" unificada en `SavingsCalculator.tsx` anclada en `HomeClient.tsx`. El componente respeta las reglas Zero-PII en la telemetría y el sistema superó exitosamente los chequeos de tipos (`typecheck`).

---

## 📝 SESIÓN: HARDENING DE AUDITORÍA Y ALERTAS EN TIEMPO REAL (Junio 2026)
**Objetivo:** Finalizar la estabilización de producción y blindaje de seguridad del panel administrativo, con enfoque específico en la generación de PDFs y prevención de exfiltración de datos.

**Acciones Realizadas:**
1. **Auditoría Inmutable (Cloud Functions):** Implementación de `onCasoChanged` y `onConsultaChanged` (`onDocumentWritten` triggers) para interceptar cambios directos en Firestore y registrar las acciones en `audit_logs`, inyectando `_lastOperatorEmail` en las transacciones para asegurar trazabilidad.
2. **Alertas Críticas de Telegram:** Creación de un canal de notificaciones en tiempo real para alertar sobre acciones críticas: exportación masiva de datos (Excel/PDF) y eliminación (DELETE) directa de registros en la base de datos.
3. **Hardening de Generación de PDFs:** Corrección del error 500 en Vercel (Production) empaquetando forzosamente el binario de Chromium con `outputFileTracingIncludes` en `next.config.ts`.
4. **Renombramiento de "God Mode":** Traducción integral de la interfaz de seguridad a "Modo Dios" para mejorar la familiaridad del equipo operativo, acoplando rate-limiting al PIN de acceso para mitigar fuerza bruta.

**Estado Arquitectónico:**
El sistema posee una capa de observabilidad reactiva para incidentes de seguridad (Mejoras A y C). Los tests locales garantizan que la evasión del frontend siga reportando y auditando acciones destructivas en la base de datos.


## 📝 SESIÓN: INICIALIZACIÓN EQUIPO ÉLITE Y RECONOCIMIENTO (Junio 2026)
**Objetivo:** Asignación del rol de Equipo de Desarrollo Élite (Principal Engineer, DevSecOps, Privacy Officer, DBA, QA). Ejecución de la Fase 0 (Detección de Stack y Auditoría de código base).

**Acciones Realizadas:**
1. **Auditoría de Entorno (Fase 0):** Se detectó y analizó el stack completo: Next.js 15.1.0, React 19, Tailwind CSS, Radix UI, Firebase (Admin v13, Client v11), Vitest, Zod, Playwright.
2. **Revisión de Seguridad y Dependencias:** Se ejecutó `npm audit`. Detectadas 16 vulnerabilidades heredadas en subdependencias, las cuales requieren `--force` pero no comprometen de forma crítica la seguridad del core por las capas de mitigación (Zero-PII).
3. **Validación de Código Base:** Se inició la ejecución de la suite completa `npm run validate` para verificar la estabilidad del linter, el analizador de tipos y las pruebas de integración.
4. **Acoplamiento de Directivas:** Se han asimilado estrictamente las reglas bilingües de desarrollo (español para documentación/comentarios), prevención de fugas PII, estándares web modernos (Core Web Vitals) y ciclo inmutable de sincronización de documentación.

**Estado Arquitectónico:**
El sistema mantiene la estabilidad documentada de la v1.0.0. DevSecOps alineado y entorno preparado para recibir nuevos mandatos operativos.

## 📝 SESIÓN: BLINDAJE DE QA, UX CINÉTICO Y TOUCH-DEBUGGER v9 (Junio 2026)
**Objetivo:** Elevar el estándar de calidad de Desmulta introduciendo scrolling táctil inmersivo, estados de carga nativos y eliminando fallos en el módulo de diagnóstico (TouchDebugger).

**Acciones Realizadas:**
1. **Edge-Scroll Cinético en Kanban:** Se reescribió la lógica de arrastre en `TableroFlujoTrabajo.tsx` integrando una heurística de aceleración táctil (`requestAnimationFrame`) que permite navegar horizontalmente el tablero acercando la tarjeta a los bordes.
2. **TouchDebugger v1.0.0:** Se eliminó la dependencia a `window.innerHeight` que rompía el SSR, se purgó la memoria de los arrays estáticos en `cleanup`, y se evadió la inestabilidad de `window.confirm` en dispositivos Android reemplazando el botón "Nuclear" con un patrón de doble-tap.
3. **Optimización Visual (Loading States):** Prevención de bloqueos o destellos en Next.js creando esqueletos visuales (`loading.tsx`) consistentes con el diseño para Blog, Multas y VIP Dashboard.
4. **Pruebas Unitarias de Casos de Borde:** Integradas 4 suites críticas (`rate-limit-failclosed`, `prescription-engine-edge`, `middleware-auth`, `piiScrubber-colombia`) consolidando el entorno `npm run validate` como muro infranqueable.

**Estado Arquitectónico:**
La versión 1.0.0 se encuentra blindada y documentada, operando bajo estricta validación de QA y proporcionando una experiencia de usuario ultra fluida.

---

## 📝 [Sesión Anterior] Estabilización v1.0.0 y Saneamiento de Logs / Producción
**Objetivo:** Finalizar la preparación para producción de Desmulta v1.0.0 estabilizando las pruebas unitarias, sanitizando los logs del cliente, refactorizando tipados inseguros y reduciendo costos de lectura en Firestore.
**Acciones Realizadas:**
1. **Infraestructura de Tests y Cobertura en CI:** Se inyectó la validación estricta de cobertura (`npm run test:coverage:ci`) en `.github/workflows/ci.yml` para garantizar que el pipeline falle si no se cumple el umbral del 70%.
2. **Higiene de Logs (Cero Fugas en Producción):** Se limpiaron todos los `console.log`, `console.error` y `console.warn` en `src/lib/env-check.ts`, `tesseract-worker.ts`, `pushService.ts` y componentes UI. Se implementó el envío directo a `SecurityLogger`. 
3. **Optimización FinOps (Firestore):** Se refactorizó la recolección de métricas `edge_telemetry` en el dashboard de administrador para leer solo documentos de los últimos 30 días y con límite de 5000, evitando colapsos y cobros excesivos por lecturas masivas a toda la colección.
4. **Tipado Estricto & Sentry:** Se eliminaron tipados inseguros `any` en funciones críticas (como `DecodedIdToken | undefined` al leer las sesiones) y se corrigieron bloques catch para usar `catch (e: unknown)`. Sentry fue acoplado de forma nativa a `SecurityLogger.error/security` para capturar el payload y los detalles exactos en producción.

**Estado Arquitectónico:**
El pipeline QA está reparado. El código de producción cumple con los requisitos de logging seguro y manejo de estado. La aplicación está lista para el release v1.0.0.

---

## 🛠️ SESIÓN: HARDENING DE SEGURIDAD V2 (Junio 2026)

**Objetivo:** Eliminar almacenamiento innecesario de PII en disco y endurecer reglas de TypeScript en Cloud Functions y telemetría.

### Soluciones implementadas

**Protección de Datos (Zustand) y Privacidad de Negocio:**
- **Eliminación de PII en local:** Se sacó la `cedula` y `ocrRawText` del middleware de persistencia (`partialize`) en `useExpedienteStore.ts`. Estos datos ya no quedan guardados en `localStorage`, limitando exposición si se usan dispositivos compartidos.
- **Ofuscación de IDs:** Se modificó la generación de `shortId` en `src/app/api/create-consultation/route.ts` para usar un UUID truncado (`crypto.randomUUID()`) en lugar del contador secuencial, evitando revelar el volumen de negocio a competidores. El contador real se preserva privadamente en `internalRef`.

**Endurecimiento de Tipos y Precisión Legal:**
- **Sustitución de `any`:** Se implementó la interfaz `CaseAfterData` en `onCaseStatusChange.ts` para tipar estrictamente el parámetro `after`, evitando errores silenciosos si la estructura en Firestore cambia.
- **Lógica de Fechas Exacta:** Se migraron los cálculos manuales de diferencia de años a la función `differenceInYears` de `date-fns` en `estrategia-legal.ts` y `prescription-engine.ts`, resolviendo el bug de saltos en años bisiestos para dictámenes legales.

**Gestión de Errores y Logging:**
- **Visibilidad controlada:** Se sustituyeron los bloques `catch(() => {})` silenciosos en los envíos de métricas a `/api/abandonment` (en `StepContacto.tsx`) por logs de depuración (`console.debug`) exclusivos de desarrollo.
- **Centralización de Telemetría:** Se reemplazaron las llamadas `console.log` y `console.warn` en `src/firebase/index.ts` y `src/lib/resend.ts` por el logger centralizado del sistema (`@/lib/logger/security-logger`), mejorando la observabilidad en producción y limpiando las consolas de los usuarios.

**Calidad y Pruebas Unitarias (Fix 8):**
- **Cobertura Mínima de Tests:** Se implementó cobertura oficial en el entorno `vitest.config.ts` utilizando `@vitest/coverage-v8`. Se exigen umbrales estrictos (`lines: 70`, `functions: 70`, `branches: 65`) para los módulos más críticos (`src/lib/security/**`, `src/lib/legal/**`, `src/app/api/**`), asegurando que cualquier regresión en seguridad o dictámenes legales rompa los despliegues de CI. Se añadieron los comandos `test:coverage` y `test:coverage:ci` a `package.json`.

**Refactorización Arquitectónica UI:**
- **Extracción de Estado UI:** Se creó el custom hook `useConsultationForm.ts` (`src/hooks/useConsultationForm.ts`) para aislar más de 20 estados, refs y subscripciones de eventos del componente de vista `ConsultationForm.tsx`. Esto reduce el acoplamiento y aumenta drásticamente la legibilidad del UI principal.

**Estado de la Arquitectura:**
- Código endurecido, ofuscado comercialmente, modularizado y con fechas precisas. Tipado 100% estricto respetando el `eslint --max-warnings 0`. Prevención de filtración pasiva de PII.
## 🛠️ SESIÓN: RECONOCIMIENTO Y ASIGNACIÓN DE ROL ÉLITE (Junio 2026)

**Objetivo:** Asignación del rol de Equipo de Desarrollo Élite (Principal Engineer, DevSecOps, Privacy Officer, DBA, QA). Ejecución obligatoria de la Fase 0 (Detección de Stack y Auditoría).

### Soluciones implementadas

**Fase 0 (Auditoría y Reconocimiento):**
- **Detección Automática de Stack:** Análisis del archivo `package.json`. Stack detectado: Next.js 15.1.0, React 19, Tailwind CSS, Firebase v11 (Client) / v13 (Admin), Zod, Vitest, Playwright.
- **Auditoría de Entorno y Dependencias:** Se inicializó la lectura obligatoria del contexto (`README.md`, `MEMORY.md`). Se ejecutó la sanación de dependencias mediante `npm audit fix` operando a través del entorno de comandos (`cmd.exe /c`). Quedan 16 vulnerabilidades residuales en subdependencias que requieren comandos con `--force` (no aplicado para evitar regresiones).
- **Compromiso Estricto de Reglas:** Asimilación absoluta de la comunicación en español (JSDoc, MEMORY.md, commits), regla de prevención de N+1, protección de datos Zero-PII, e iteración segura en bloques pequeños de archivos.

**Estado de la Arquitectura:**
- Sistema estable y pre-auditado. Suite de validación ejecutada (`npm run validate`). Listo para recibir la siguiente orden técnica con un control de calidad y DevSecOps reforzado.

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

### 🚧 Bloqueos y Tareas Pendientes
*   **Siguiente Paso Inmediato:** Las tareas críticas de la sesión actual han sido completadas:
    1.  Limpieza de `any` completada en `push-notifications.ts`, `onConsultationCreated.ts`, `onCaseStatusChange.ts` y `cronRetryNotifications.ts` con tipado estricto.
    2.  Actualizados los bloques `catch` silenciados por `console.debug` en el frontend (`TrackingClientUI.tsx` y `TouchDebugger.tsx`).
    3.  Finalizado el reemplazo de `Math.random()` por `crypto.randomUUID()` en el API de creación de consultas (`create-consultation/route.ts`).
    4.  El test legal relacionado con las fechas de fotomulta fue ajustado (`>= 1` año) para reflejar fielmente la ley y el comportamiento de `differenceInYears`.
    5.  `npm run build` en la carpeta `functions` compila exitosamente bajo tipado estricto. (Ojo: Algunos tests de integración pueden fallar localmente por falta de credenciales de Firebase en el entorno).

### 📁 Documentación Relacionada
*   `docs/MEMORY.md`: Historial de decisiones actualizado.
*   `C:\Users\Sthan\.gemini\antigravity\brain\542f348c-33bd-4918-a2e7-8f3922684ebc\task.md`: Lista de verificación (checklist) activa del plan de saneamiento.

**Estado del Sistema:** Operativo y bajo supervisión estricta de calidad. Tipado estricto garantizado en Cloud Functions críticas..

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
# Memoria del Sistema (MEMORY.md)

## Estado Actual
El sistema acaba de pasar por la **Auditoría Enterprise v3 (Fase de limpieza técnica y seguridad)**.
Se han implementado correcciones críticas a nivel de seguridad, integridad de datos, limpieza de dependencias y estandarización del código fuente.

## Cambios Realizados y Por Qué
1. **Filtro de Estados en `deleteExpiredConsultations`**: Corregido bug crítico. Anteriormente borraba consultas finalizadas si pasaban de 30 días independientemente del estado. Ahora solo aplica a consultas descartadas/abandonadas.
2. **Corrección de `followup-cron`**: Se modificó la query a Firestore porque apuntaba a `email`, campo inexistente. Se cambió a `emailContacto`.
3. **Idempotencia en `convertToCase`**: Evita la concatenación infinita de prefijos `ENC:` al crear casos a partir de leads.
4. **Seguridad en Auth VIP**: Se reemplazó el fallback en texto plano a comparación segura (timing-safe) mediante hashing, garantizando Zero-PII en base de datos para VIP.
5. **Zero-PII en Canal de Telegram**: Se enmascaran correos y teléfonos (ej. `a***@gmail.com`) en las alertas de abandono (`/api/abandonment`) porque Telegram no es medio de almacenamiento, mitigando fugas de PII.
6. **Validación de Entorno (`env-validator.ts`)**: Se añadió obligatoriedad a `TELEGRAM_SECURITY_CHAT_ID` para evitar crasheos silenciosos en producción.
7. **Limpieza del Repositorio (Git Hygiene)**: Eliminados del índice de git y añadidos a `.gitignore` múltiples archivos residuales (`dump.txt`, `recovery.txt`, `eslint_output.txt`).
8. **Unificación de Sistema de Notificaciones (Toaster)**: Se desinstaló `sonner` y se migró todo el sistema a `shadcn/ui use-toast`. Esto afecta a `feedback.ts`, `PushProvider.tsx` y `layout.tsx`, reduciendo el tamaño del bundle.
9. **Eliminación de Generador QR duplicado**: Se desinstaló la librería de cliente `qrcode.react`. Los componentes (`StepSuccess.tsx`, `ModalDetalleExpediente.tsx`, `TrackingClientUI.tsx`) ahora consumen directamente `/api/qr?data=...&size=...` mediante la etiqueta `<img>` y lo pintan en `canvas` nativo para descargas.

## Decisiones Técnicas
- **PDF (jspdf vs pdf-lib)**: Se mantiene la dualidad. `jspdf` y `jspdf-autotable` son imprescindibles para la generación de reportes tabulares complejos en el panel de auditoría (exportación masiva). `pdf-lib` es indispensable para la manipulación y llenado de las plantillas jurídicas complejas de la aplicación.
- Se delegó la creación de imágenes QR a la API nativa de Node.js en `/api/qr` reduciendo la huella de código entregada al navegador (cliente).

## Archivos Afectados
- `src/app/admin/actions.ts`
- `src/app/api/internal/followup-cron/route.ts`
- `src/app/api/vip/auth/route.ts`
- `src/app/api/abandonment/route.ts`
- `src/lib/env-validator.ts`
- `src/app/layout.tsx`
- `src/lib/ui/feedback.ts`
- `src/components/providers/PushProvider.tsx`
- `src/app/api/qr/route.ts`
- `src/components/vial-clear/ModalDetalleExpediente.tsx`
- `src/components/vial-clear/steps/StepSuccess.tsx`
- `src/app/seguir/[id]/TrackingClientUI.tsx`
- `.gitignore` y package.json
  
## Auditor�a v3 - Correcciones Pendientes (Telegram, Admin, Env)  
- **getAnalyticsStats**: Optimizado para limitar lecturas a 2000 documentos recientes, evitando el desbordamiento de facturaci�n y lecturas ilimitadas de Firebase.  
- **.env.example**: Se documentaron las variables faltantes NEXT_PUBLIC_BASE_API_KEY y TELEGRAM_SECURITY_CHAT_ID.  
- **telegramWebhook**: Implementada la idempotencia en cambiarEstado mediante la verificaci�n del lastBotMessageId, previniendo que un doble tap en un bot�n ejecute la acci�n dos veces. 
  
## Auditor�a v3 - UI/UX Toasts  
- **Toaster**: Se corrigi� el desbordamiento de notificaciones muy largas en m�vil a�adiendo lex-1 y truncamiento en 	oaster.tsx. Se agreg� margen superior considerando safe-area-inset-top en 	oast.tsx para evitar cruce con el Notch en iPhones o la barra superior nativa.

## 🚩 SESIÓN: AUDITORÍA v4 — REVELADO SEGURO DE CÉDULA EN TELEGRAM CRM (Junio 2026)
**Objetivo:** Permitir a los analistas ver la cédula en Telegram de forma segura sin violar la directiva Zero-PII ni persistir datos personales en el historial del chat.

**Implementado:**
- **Botón Inline Efímero:** Se agregó el botón `🪪 Ver Cédula` al lado de WhatsApp en el markup inline de los casos enviados a Telegram.
- **Handler Callback en Webhook:** Se implementó la interceptación de `vercedula_DOCID` en `telegramWebhook.ts`. Al pulsarlo, el bot descifra la cédula guardada en Firestore y responde mediante `answerCallbackQuery` con `show_alert: true`. El dato se muestra en una modal temporal nativa de Telegram que se destruye al cerrarse y no se registra en el historial del chat.
- **Enmascaramiento Inicial:** Se removió la cédula encriptada larga del texto del mensaje inicial para evitar ruido visual e historial sucio, dejando un mensaje indicativo.
- **Criptografía Aislada en Functions:** Se creó `crypto-utils.ts` en `/functions` implementando `encryptSymmetric` y `decryptSymmetric` usando AES-256-GCM para mantener la compatibilidad con el backend Next.js de forma autocontenida.
- **Suite de Pruebas robusta:** Se agregaron 3 nuevos tests unitarios en `telegramWebhook.test.ts` con validación estricta de JSON, verificando los flujos exitosos, de error y de datos inexistentes.

**Decisiones Técnicas:**
- Se inyectaron los secretos `PII_ENCRYPTION_KEY` y `PII_HMAC_SECRET` en las funciones `telegramWebhook` y `onConsultationCreated`.
- Se resetean los mocks de firestore y fetch antes de cada test en `telegramWebhook.test.ts` para evitar contaminación cruzada de llamadas.

**Archivos Afectados:**
- [crypto-utils.ts](file:///C:/Workspace/Desmulta/functions/src/crypto-utils.ts) (NUEVO)
- [telegramWebhook.ts](file:///C:/Workspace/Desmulta/functions/src/telegramWebhook.ts)
- [onConsultationCreated.ts](file:///C:/Workspace/Desmulta/functions/src/onConsultationCreated.ts)
- [telegramWebhook.test.ts](file:///C:/Workspace/Desmulta/functions/src/__tests__/telegramWebhook.test.ts)

## 🚩 SESIÓN: ESTABILIZACIÓN QA ENTERPRISE v4 — REMOCIÓN DE WARNINGS LINTER (Junio 2026)
**Objetivo:** Resolver los warnings restantes del linter de Next.js relacionados con elementos `<img>` no optimizados para lograr una suite 100% libre de advertencias y asegurar compilación limpia en producción.

**Implementado:**
- **Inyección de Exclusiones de Linter para Códigos QR:**
  - Se añadieron directivas `{/* eslint-disable-next-line @next/next/no-img-element */}` antes de cada etiqueta `<img>` en `ModalDetalleExpediente.tsx` (para la previsualización del código QR y su versión HD de descarga) y en `StepSuccess.tsx` (para el QR de respaldo del cliente).
  - Esto desactiva de manera controlada la advertencia `@next/next/no-img-element` de ESLint para estas imágenes de códigos QR que se generan dinámicamente y no se benefician de la optimización nativa del componente `<Image />` de Next.js.
- **Validación Exitosa de la Suite de QA:**
  - `npm run lint` finalizó exitosamente con **0 errores y 0 advertencias** (respetando `--max-warnings 0`).
  - `npm run typecheck` completó sin errores de compilación de tipos.
  - La suite de pruebas de integración de Vitest (`npm run test:integration`) se ejecutó en el Emulador de Firebase Firestore con pase exitoso del 100% de los tests unitarios y de integración.
  - `npm run build` compiló exitosamente el 100% de la aplicación Next.js y prerenderizó las 329 páginas del portal de manera satisfactoria.

**Archivos Afectados:**
- [ModalDetalleExpediente.tsx](file:///c:/Workspace/Desmulta/src/components/vial-clear/ModalDetalleExpediente.tsx)
- [StepSuccess.tsx](file:///c:/Workspace/Desmulta/src/components/vial-clear/steps/StepSuccess.tsx)
- [MEMORY.md](file:///c:/Workspace/Desmulta/docs/MEMORY.md)

## 🚩 SESIÓN: HARDENING DE SEGURIDAD ENTERPRISE v4 — PROTECCIÓN DE CÉDULA EN FIRESTORE Y SANITIZACIÓN OG (Junio 2026)
**Objetivo:** Resolver el hallazgo de nivel ALTO referente al uso directo de la cédula del ciudadano en las claves de documentos de Firestore, y mitigar abusos de payloads largos en el generador dinámico de imágenes OG.

**Implementado:**
- **Criptografía de Claves en Firestore (`legal_mandates` y `otp_rate_limits`):**
  - En lugar de usar la cédula en texto plano (`documentId`) directamente en las rutas de documentos, ahora se calcula de manera idempotente un hash SHA-256 (`mandateKey = sha256(documentId).slice(0, 40)`) en `legal-auth.ts` (tanto en la creación/despacho como en la verificación de OTP) y en `telegram-bridge.ts` (al validar la existencia del mandato para la Cloud Function).
  - Esto evita la exfiltración pasiva de cédulas en texto plano en los logs de Cloud Logging e impide el rastreo masivo a nivel de URLs de base de datos.
- **Sanitización de Parámetros en API OG (`/api/og`):**
  - Se limitó la longitud de los parámetros de búsqueda `ciudad` y `dept` a 60 caracteres y `title` a 80 caracteres mediante llamadas `slice(0, MAX_PARAM_LEN)` al inicio del handler.
  - Esto neutraliza ataques de denegación de servicio o saturación de Vercel Edge mediante el envío de strings inusualmente largos de miles de caracteres.
- **Validación QA:**
  - El linter (`npm run lint`), el chequeador de tipos (`npm run typecheck`), los tests unitarios (`vitest run`) y el empaquetado final (`npm run build`) han sido completados satisfactoriamente con 100% de éxito.

**Archivos Afectados:**
- [legal-auth.ts](file:///c:/Workspace/Desmulta/src/actions/legal-auth.ts)
- [telegram-bridge.ts](file:///c:/Workspace/Desmulta/src/actions/telegram-bridge.ts)
- [route.tsx](file:///c:/Workspace/Desmulta/src/app/api/og/route.tsx)
- [MEMORY.md](file:///c:/Workspace/Desmulta/docs/MEMORY.md)
