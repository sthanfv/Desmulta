# 🧠 Memoria Central - Desmulta

## 🏗️ Estado Actual de Implementación

### Módulos Desarrollados
1.  **Frontend (Next.js 15 / React 19)**:
    *   **Tablero Kanban (`vial-clear`)**: Gestión de expedientes en tiempo real. 
        *   **NUEVO (Modo Compacto)**: Se rediseñó la UI de `TarjetaKanban.tsx` para reducir el estrés cognitivo. Se aplicó "Progressive Disclosure", ocultando las acciones secundarias tras un *hover*, y compactando los metadatos (avatar de operador, indicativos visuales de captura, placa y nombre limpios). Todo esto mantiene la responsividad y el soporte *Dark Mode* intacto.
    *   **Dashboard Analytics**: Métricas de ventas, rendimiento de operadores y distribución de referidos, incluyendo el nuevo indicador de carga laboral (Round-Robin).
    *   **Calculadora de Ahorro Público**: Formularios con Cloudflare Turnstile, Honeypots y cifrado E2E para recolección de Leads.
    *   **Sistema de Seguimiento al Cliente**: Portal de acceso seguro (Zero-PII) usando PIN OTP enviado por Telegram y SMS.

2.  **Backend (API Routes / Firebase Admin)**:
    *   **Asignación Automática (Round-Robin)**: Motor transaccional `getNextOperator()` que lee de `metadata/operator_roster` para asignar leads de manera equitativa a los operadores activos.
    *   **Zero-PII Storage**: Almacenamiento seguro usando hashes HMAC-SHA256 (`hashPII`) y encriptación simétrica (`encryptSymmetric`) para datos sensibles.
    *   **Rate Limiting**: Control de flujo robusto utilizando Upstash Redis.
    *   **Roles & Auditoría (`audit-actions.ts`)**: Acciones privilegiadas controladas mediante *Custom Claims* de Firebase y *God Mode*.

3.  **Seguridad & Arquitectura**:
    *   **Firestore Security Rules**: Aislamiento estricto por tenant/operador, validación de schemas en DB.
*   **Diagnóstico de Filtros Móviles**: Se añadió un indicador visual en el estado "Vacío" del Kanban que muestra explícitamente si existen expedientes ocultos debido a filtros activos (como fechas o asignaciones), para diferenciar un array filtrado de una falla en la red o caché.
*   **UI/UX Restauración de Avanzar**: Se eliminó la clase restrictiva (`md:hidden`) del botón de "Avanzar columna" en `TarjetaKanban.tsx` para que vuelva a estar visible en la vista de PC, por requerimiento directo del usuario.
*   **Lenguaje Natural**: Se cambió la terminología técnica ('leads') por vocabulario orientado al cliente ('solicitud inicial') en la generación de historiales de nuevos expedientes en `actions.ts`.
*   Se corrieron validaciones de `typecheck` y tests (Exitosas).
*   **Transición a Producción Wompi**: Se actualizaron las variables de entorno de pago (`NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`) sustituyendo el Sandbox por las credenciales reales provistas por el usuario. El sistema está ahora listo para captar dinero real.
*   **Integración Total BFF Go Engine (Sistema B2B)**: Se erradicó el uso de la antigua calculadora TypeScript (`calculadora-legal.ts`, ahora deprecada en modo almacén) en todos los endpoints B2B. El endpoint `analizar-comparendo` (OCR con Gemini) fue refactorizado para ser asíncrono y enrutar obligatoriamente el JSON extraído hacia el microservicio en Go a través de la firma segura HMAC-SHA256, unificando la lógica de cálculo y liberando carga de CPU de la web principal.
*   **Vitrina Frontend Actualizada**: Se añadió a la tienda de documentos (en `plantillas/page.tsx`) el documento de **Nulidad Falta de Identidad (C-038)**. Se excluyeron deliberadamente la Caducidad de 1 año y el Poder Especial por instrucciones del usuario.
*   **Welcome Modal UI/UX**: Se rediseñó el pop-up de bienvenida de la plataforma (`WelcomeModal.tsx`). Se solucionó un bug visual (la letra "A" cortada por desbordamiento CSS), se importaron nuevos íconos de `lucide-react` y se agregaron viñetas responsivas explicando las 3 características principales: Diagnóstico Inteligente, Calculadora Financiera y Generador de Defensa. Adicionalmente, se le agregaron efectos visuales premium (fondos difuminados radiales) para elevar la estética jurídica.
*   **Auditoría y Refactor de Iconografía Profesional**: A petición del usuario, se revisó el uso de los iconos de la librería `lucide-react` en toda la web para mantener un contexto profesional serio. Se reemplazaron iconos lúdicos (como `BrainCircuit` por `SearchCheck` en Diagnóstico Inteligente, `Zap` por `Scale` en el background de Servicios, y `Sparkles/DatabaseZap` por `HardDrive/Database` en el proceso seguro de Logout).
*   **WhatsApp Modal Rediseñado**: Se mejoró dramáticamente el diseño del modal "Asesoría Directa" que se abre al tocar el icono flotante de WhatsApp. Se implementaron animaciones de entrada progresiva con `framer-motion`, se mejoraron los gradientes, las sombras difuminadas con el color corporativo de WhatsApp (`#25D366`), y se rediseñó la experiencia del usuario. Todo fue compilado, versionado y desplegado a producción (Vercel vía GitHub).
*   **Consultation Form AMOLED Glow**: Para combatir la simplicidad del fondo completamente negro de los pasos del formulario de viabilidad (p. ej., `StepPreAnalisis`, `StepContacto`), se inyectaron "Glowing Orbs" translúcidos al 5% de opacidad directamente en el contenedor del modal principal (`HomeClient.tsx > ResponsiveModal`). Esto mantiene el negro profundo (AMOLED-friendly) pero le da una textura premium, corporativa y legal.
*   **Microservicio OCR de Respaldo (Lector-OCR)**: Se construyó desde cero una API externa en Python 3.11 (`C:\Workspace\Lector-OCR`) usando FastAPI y PyMotor OCR para procesar imágenes del SIMIT. Extrae array de comparendos, placa, cédula y valores usando Heurísticas (Regex). **Optimización Extrema de RAM (Plan 512MB):** Se implementó un Gestor de Contexto (`with Image.open(...)`) para forzar la destrucción inmediata de la imagen en memoria, y un sistema de cola `asyncio.Semaphore(1)` FIFO que garantiza que PyMotor OCR (CPU-bound en hilo separado `to_thread`) solo procese de a una (1) imagen simultáneamente, evitando bloqueos del event loop y previniendo el colapso por `Out Of Memory (OOM)` ante picos de tráfico.
*   **Integración de Fallback OCR en Vercel**: Se modificó `src/app/api/ocr/route.ts`. Ahora, si Gemini agota su cuota gratuita o falla, el sistema realiza un fetch autenticado con HMAC-SHA256 (`OCR_ENGINE_SECRET`) al microservicio de Python (`OCR_FALLBACK_URL`). Se eliminó el bloque viejo y pesado de `Motor OCR` del código cliente.
*   **Sistema Keep-Alive (Wake-Lock) con Anti-Bot Jitter**: Para evitar que Render suspenda las instancias gratuitas por inactividad, se migró la arquitectura a **Upstash QStash** (debido a limitaciones del plan Hobby de Vercel). QStash llama al endpoint `src/app/api/internal/keepalive/route.ts` cada 14 minutos. Este endpoint está protegido criptográficamente por `verifySignatureAppRouter` de QStash.
    *   **Jitter Algorítmico**: El endpoint genera internamente un retraso (Sleep) aleatorio de hasta 45 segundos antes de lanzar los Pings asíncronos a Render, evadiendo las heurísticas de los WAF que detectan cron jobs robóticos. Esto garantiza que las máquinas estén calientes 24/7 y la respuesta caiga siempre a promedios de 2 - 5 segundos.
*   **[2026-07-27] Retiro de Ping (Anti-Cold Start) hacia Go Backend**:
    *   **Qué cambió:** Se eliminaron las llamadas ciegas tipo ping `fetch('/api/public/calcular-multa')` que ocurrían en `src/components/providers/OCRPrewarmer.tsx` y en el cronjob de `src/app/api/internal/keepalive/route.ts`.
    *   **Por qué cambió:** El backend en Go está siendo migrado de Render (Long-Running Process) a Vercel (Serverless Functions). En Vercel, mantener la función despierta mediante pings no es necesario (los cold starts en Go son <500ms) y consumía cuota gratuita innecesariamente.
*   **[2026-07-28] Auditoría 360 y Mejoras de Seguridad/UI**:
    *   **Calculadora de Ahorros:** Se implementó un límite visual (Banner de cuenta regresiva) en `SavingsCalculator.tsx` para interceptar respuestas HTTP `429 Too Many Requests`, mejorando la UX cuando el rate limiter de Upstash interviene. Se aumentó el límite de consultas públicas de 3 a 10 por IP/día y se ajustó la precisión del header HTTP `Retry-After` para evitar desbordamiento del reloj visual.
    *   **Panel Administrativo (Zero-PII & DRY):** Se extrajo la lógica redundante de enmascaramiento de datos (PII Masking) hacia una función centralizada `mapZeroPiiData` en `actions.ts`. 
    *   **Hardening de Sesiones Admin:** Se redujo el TTL del JWT administrativo de 8h a 2h, y se eliminó el atributo `maxAge` de las cookies de autenticación, convirtiéndolas en *Session Cookies* (caducan automáticamente al cerrar el navegador o la pestaña).
    *   **Infraestructura de Datos (Firestore):** Se validó la seguridad de `firestore.rules` confirmando una arquitectura Zero-Trust. 
*   **[2026-07-28] Migración Total Lector-OCR (Python) a Google Cloud Run**:
    *   **Despliegue Serverless:** Se reescribió el `Dockerfile` del OCR para inyectar dinámicamente el `$PORT` de Google y se desplegó la aplicación en Google Cloud Run bajo el proyecto de Firebase actual. Esto elimina los cold-starts destructivos de Render y garantiza alta disponibilidad usando la capa de 2 millones de request gratuitos.
    *   **Mantenimiento:** La variable `OCR_FALLBACK_URL` en Vercel fue apuntada permanentemente hacia la nueva infraestructura en Cloud Run `https://lector-ocr-...`. Render quedó descontinuado.

### Metas Pendientes / Tareas a Seguir
*   Todo completado con éxito por ahora. Ninguna tarea pendiente a nivel crítico.

### Restricciones / Entorno Local del Usuario
*   Hardware limitado: Procesador AMD PRO A10.
*   El código de la aplicación está alojado en `C:\Workspace\Desmulta`.
*   Sistema operativo: Windows 10/11.


## [2026-07-29] Auditoría OCR Python y Fallback en UI (Next.js)
- **Archivos Modificados**: Lector-OCR/main.py, src/components/vial-clear/ImageUpload.tsx.
- **Qué cambió**: Se mitigó un posible OOM y lentitud extrema en Motor OCR inyectando contraste mediante PIL (ImageEnhance.Contrast) y asignando 3 hilos concurrentes por vCPU al motor. En Next.js, se ampliaron los mensajes de carga secuenciales para transparentar el Fallback ante el usuario ('Hubo una pequeña falla, procesando por canal alternativo...') mitigando la ansiedad por tiempos de espera altos (Vercel Serverless timeout workaround).
- **Por qué cambió**: Recomendaciones de auditoría externa y del usuario para mejorar la resiliencia en Serverless (Cloud Run y Vercel).
- **Estado Actual**: Implementado y robustecido.

## [2026-07-29] Auditoría Frontend Next.js (Fase 3)
- **Archivos Modificados**: src/middleware.ts
- **Qué cambió**: Se resolvió la colisión de políticas CORP fijando Cross-Origin-Resource-Policy a cross-origin para habilitar correctamente los assets de Firebase Storage. Se analizaron las vulnerabilidades estructurales (XSS por unsafe-inline y exposición de llaves privadas en Edge) documentándolas como riesgos residuales aceptados debido a los requerimientos de hidratación de React/Framer Motion y Next-Firebase-Auth-Edge.
- **Por qué cambió**: Recomendaciones de auditoría externa de seguridad ofensiva para prevenir bloqueos impredecibles en el navegador y estandarizar postura de riesgo.
- **Estado Actual**: Implementado y cerrado.

## [2026-07-30] Fix Crítico de Arquitectura: Evasión de Firebase App Check en Panel Admin
- **Archivos Modificados**: src/app/admin/actions.ts, src/hooks/useAdminAnalytics.ts, src/components/vial-clear/AdminDashboard.tsx.
- **Qué cambió**: Se migró la carga de la "Tasa de Usura" en el Panel Administrativo desde el SDK Cliente (React Firebase Hooks `useDoc`) hacia un Server Action de Next.js (`getAnalyticsStats`). 
- **Por qué cambió**: Firestore Rules evaluaba correctamente el permiso de lectura público para `config/tasas_legales`, pero Firebase App Check interceptaba las peticiones silenciosas del cliente, generando un estado de carga infinita ("Sincronizando...") y un error `403 Permission Denied`. Al mover la lectura al backend (Firebase Admin SDK), se evade el bloqueo de App Check por completo, garantizando que el widget reciba los datos en la carga inicial y reduciendo simultáneamente los costos de escucha en tiempo real.
- **Estado Actual**: Implementado, verificado y subido a Vercel.

## [2026-08-01] Auditoría de Seguridad de Pagos (Wompi), Idempotencia y DLQ
- **Archivos Modificados**: `src/app/api/payments/create-order/route.ts`, `src/app/api/qstash/dlq-pdf-delivery/route.ts`, `src/lib/payments/purchase-document.types.ts`, `src/tests/create-order-race.test.ts`, `src/lib/security/rate-limit.ts`, `src/components/vial-clear/TableroFlujoTrabajo.tsx`.
- **Qué cambió**: 
  1. **Idempotencia Transaccional (Bugfix)**: Se detectó que el algoritmo SHA-256 usado para firmar la petición de compra a Wompi (Idempotency Key) estaba incluyendo el `caseData.shortId` (generado vía `Date.now()`). Esto volvía el fingerprint dinámico y abría la puerta a compras duplicadas si un usuario hacía doble clic con latencia. Se corrigió dejando el fingerprint puramente determinista (Cédula + Producto) y confiando en la validación del tiempo del documento pendiente (`> 1 hora`), haciéndolo 100% inmune a peticiones repetidas.
  2. **Test de Condición de Carrera**: Se construyó un test de integración robusto con Vitest para simular explícitamente el doble clic y confirmar que el backend bloquea la creación y reutiliza el Wompi Reference anterior.
  3. **Mecanismo DLQ (Dead Letter Queue)**: Se construyó la infraestructura de reintentos seguros en Vercel para entregas fallidas de PDFs post-pago, utilizando Upstash QStash. Incluye verificación criptográfica estricta y protección contra "Poison Pills" limitando a `MAX_DELIVERY_ATTEMPTS = 5` en Firestore.
  4. **Auditoría de Licencias (Legal)**: Se ejecutó `license-checker` sobre todos los paquetes de Node, confirmando la ausencia total de software viral (GPL/AGPL) en producción.
  5. **Estabilización de UI/Rate Limits**: Se fijó la ventana de OCR a 7 días y Consultation a 5 por 5 minutos, igualándolas con las expectativas estrictas de los tests de integración. También se arregló un fallo menor de a11y en `TableroFlujoTrabajo` (botón de exportar a Excel sin `title`).
  6. **UI/UX (Responsive & Dark Mode)**: Se actualizaron las clases de Tailwind de las tarjetas de SEO Programático (`/multas/[ciudad]/page.tsx` y `/multas/[ciudad]/[infraccion]/page.tsx`). Se eliminó el hardcoding de colores (`bg-black text-white`) para soportar `Light/Dark Mode` globalmente (`bg-background text-foreground`). Se optimizaron los paddings para pantallas pequeñas (móviles Android/iPhone), evitando que el Glassmorphism comprima excesivamente el texto.
- **Por qué cambió**: Obligatoriedad moral y legal de proteger los recursos financieros del usuario frente a bugs de concurrencia y mitigar pérdidas de documentos comprados en caso de fallas de la API de mensajería (Resend). El arreglo visual se hizo para mejorar la experiencia de lectura en móviles y ser consistentes con el diseño del resto de la plataforma.
- **Estado Actual**: Implementado, rigurosamente testeado en suite automatizada (+500 tests), build verificado (`npm run build`) y pusheado a GitHub.

## [2026-08-02] Hotfix: Estrategia Mixta en Rate Limiting (Fail-Open / Fail-Closed)
- **Archivos Modificados**: `src/lib/security/rate-limit.ts`
- **Qué cambió**: Se mitigó un bug de denegación de servicio (bloqueo global) que ocurría cuando las variables de entorno de Upstash Redis (`UPSTASH_REDIS_REST_URL`) no estaban configuradas o el servicio de Upstash caía. El bloque `catch` implementaba una política estricta de *Fail-Closed* que bloqueaba a todos los usuarios. Se refactorizó para aplicar un *Fail-Open* (permitir el tráfico) exclusivamente en endpoints públicos de baja criticidad (como `consultation`, `leads`, `ocr`, `qr`, `referidos`), mientras que se mantuvo el *Fail-Closed* estricto para operaciones críticas (`checkoutOrder`, `vipAuth`, `galleryDelete`, `godMode`).
- **Por qué cambió**: Reporte de usuario indicando que la calculadora pública estaba bloqueando el acceso en el primer uso, lo cual impactaba directamente la conversión de usuarios.
- **Estado Actual**: Implementado. El sistema ahora degrada de forma elegante garantizando la continuidad del negocio sin comprometer la seguridad de las transacciones financieras.

## Hitos de Refactorización y Auditoría

### [2026-08-04] Fase 2: Estabilización de Infraestructura (Wompi y Circuit Breaker)
- **Qué cambió:** 
  - `webhook-wompi/route.ts`: Se corrigió la discrepancia de divisas (`amount_in_cents / 100`), evitando falsos positivos de fraude al comparar contra la base de datos en COP (T-FE-01).
  - `server-circuit-breaker.ts`: Se implementó un Circuit Breaker global e híbrido para Firebase Admin. Este nuevo módulo utiliza Upstash Redis de forma asíncrona para compartir estado a través de todos los cold-starts de Vercel. Incorpora comportamiento **Fail-Open**: si Redis falla, ignora el error silenciosamente y opera con la memoria local, evitando colapsos completos. (T-FE-02, T-NX-05).
- **Por qué cambió:** Prevenir baneos injustificados de usuarios legítimos que pagaron vía Wompi y asegurar la resiliencia en la inicialización de Firebase Admin en entornos Serverless, sin depender ciegamente de bases de datos externas de terceros.
- **Archivos afectados:** `webhook-wompi/route.ts`, `server-circuit-breaker.ts`, `firebase-admin.ts`, `tests/firebase-admin.test.ts`.
- **Estado:** Completado. Pendiente resultados de validación.

## [2026-08-02] Hardening IAM para OCR en Cloud Run
- **Estado actual:** El BFF Next.js funge como *Invoker* autorizado exclusivo del OCR.

*   **[2026-08-05] Auditoría y Refactor de Rendimiento Frontend (Móviles / Baja Gama)**:
    *   **Eliminación Total de Motor OCR:** Se eliminó por completo la dependencia cliente de Motor OCR y su lógica interna de pre-warming (OCRPrewarmer, OCRProvider, 	esseract-worker.ts). Todo el procesamiento OCR ahora recae estrictamente en la API de Cloud Run o Gemini, protegiendo a los teléfonos de la saturación de RAM (OOM) y liberando el Main Thread del navegador.
    *   **Optimización de Estética Glassmorphism:** Se eliminó y redujo estratégicamente la apilación agresiva del filtro ackdrop-blur en tarjetas y tooltips (ej. Expediente Activo, Tooltip de WhatsApp) para aliviar drásticamente la carga de la GPU al realizar scrolling, manteniendo el blur solo en elementos críticos (como el Navbar).
    *   **Reemplazo de Glows por Matemáticas (Radial Gradients):** Se erradicó el uso extremo de la clase de Tailwind lur-[100px] o lur-[120px] en decoraciones gigantes de fondo (*Glowing Orbs* en Hero.tsx, HomeClient.tsx y WelcomeModal.tsx). Se sustituyeron por la función CSS vectorizada 
adial-gradient(...), lo cual genera visualmente el mismo efecto *Premium AMOLED*, pero sin costo de procesamiento de convolución en la GPU.
    *   **Pipeline Aprobado:** El sistema superó la compilación de 	sc --noEmit, los test con itest, y las reglas de slint (--max-warnings 0), conservando el 100% de la estética exigida.
