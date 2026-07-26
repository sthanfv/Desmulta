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
*   **Fix Dashboard Crash (React Firebase Hooks)**: Se añadió la opción `{ suppressGlobalError: true }` a las llamadas de `useDoc` referentes a `site_config` dentro de `AdminDashboard.tsx` para evitar que un error de lectura de permisos (causado por demoras de propagación de Custom Claims o reglas de autenticación estrictas) bloquee todo el Dashboard con la pantalla roja de Error Boundary.
*   Se corrieron validaciones de `typecheck` (Exitosas ✅).

### Metas Pendientes / Tareas a Seguir
*   Resolución del parpadeo (flickering) en la Calculadora (Layout Shift por animaciones y gráficas Recharts colapsando) solicitado por el usuario.

### Restricciones / Entorno Local del Usuario
*   Hardware limitado: Procesador AMD PRO A10.
*   El código de la aplicación está alojado en `C:\Workspace\Desmulta`.
*   Sistema operativo: Windows 10/11.
