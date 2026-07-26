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
    *   **Middlewares**: Firewall de Cloudflare, Edge-Middlewares para sanitización de Request.
    *   **Sincronización Automática**: El roster de operadores se auto-sincroniza en la base de datos `metadata/operator_roster`.

### Últimos Cambios (Sesión Actual)
*   **Asignación Round-Robin Transaccional**: Creados `operator-assignment.ts` y `sync-operator-roster.ts` e integrados en `/api/create-consultation` y `/api/leads`.
*   **UI Dashboard/Kanban**: Filtro de "Mis Asignaciones", indicador de Carga de Trabajo y Panel Analítico Activo.
*   **Modo Compacto Tarjetas Kanban**: Refactorización del diseño de tarjetas eliminando miniaturas inútiles (se reemplazaron por un icono de clip), cambiando badges largos por avatares pequeños, y usando *hover states* para acciones secundarias.
*   **Seguridad de Sesión Estricta (Tab-Lock)**: Se refactorizó `/api/auth/session` para emitir cookies de sesión volátiles (sin `maxAge`), y se inyectó un candado en `sessionStorage` durante el inicio de sesión. `AdminDashboard.tsx` verifica este candado al montar; si no existe (ej. pestaña duplicada o reabierta), el usuario es expulsado, garantizando que el ciclo de vida de la sesión esté atado estrictamente a la pestaña activa.
*   **Fix Crítico: Corrupción de SDK Firebase Auth**: Se ajustó `client-logout.ts` y `pwa-heal.ts` para EVITAR la eliminación forzada de la base de datos IndexedDB `firebaseLocalStorageDb`. Borrar esta base de datos en caliente (operación "Scorched Earth") corrompía el SDK de Firebase en la pestaña actual, lo que ocasionaba un falso error `auth/network-request-failed` en intentos de login posteriores en la misma ventana.
*   **Fix Dashboard Crash (React Firebase Hooks)**: Se añadió la opción `{ suppressGlobalError: true }` a las llamadas de `useDoc` referentes a `site_config` dentro de `AdminDashboard.tsx` para evitar que un error de lectura de permisos bloquee todo el Dashboard.
*   **Fix Backend Queries Case-Sensitivity**: Se añadió una redundancia de mapeo en mayúsculas a las consultas `.where('status', 'in', [...])` de `getConsultations` y `getCases` dentro de `actions.ts`. Esto soluciona un bug en el que los leads antiguos (cuyo estado en BD estaba en MAYÚSCULAS) no cargaban en el tablero Kanban.
*   **Fix UX: Layout Shift en Calculadora**: En `SavingsCalculator.tsx` se solucionó el *flickering* (parpadeo) de Recharts.
*   **Ajuste Estadísticas**: Se ajustó el *fallback value* del componente estadístico a `204+` desde `754+` de acuerdo a lo reportado.
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

### Metas Pendientes / Tareas a Seguir
*   Todo completado con éxito por ahora. Ninguna tarea pendiente a nivel crítico.

### Restricciones / Entorno Local del Usuario
*   Hardware limitado: Procesador AMD PRO A10.
*   El código de la aplicación está alojado en `C:\Workspace\Desmulta`.
*   Sistema operativo: Windows 10/11.
