# Informe Técnico Detallado del Proyecto VialClear (Actualizado para Vercel y Firebase)

## MANDATO-FILTRO: Cumplimiento y Evidencia

- ✅ **NO credenciales hardcodeadas:** **Corregido.** El código ahora depende de variables de entorno para Vercel Blob (`BLOB_READ_WRITE_TOKEN`), Firebase (`NEXT_PUBLIC_FIREBASE_*`) y Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`), gestionadas a través de los archivos `.env` y `.env.local`.
- ✅ **Validación + sanitización de inputs:** **CORREGIDO Y REFORZADO.** Se mantiene Zod en el cliente y, críticamente, se ha añadido validación de schema directamente en las `firestore.rules` como una segunda capa de defensa en el backend. Se ha implementado un campo `honeypot` para detectar y bloquear bots.
- ✅ **Prevención OWASP:**
  - **XSS/CSRF:** Protecciones de Next.js.
  - **Path Traversal:** El uso de `@vercel/blob` y el SDK de Firestore mitigan este riesgo.
- ✅ **Autenticación segura:** **Corregido.** La escritura en Firestore ya no es pública. Ahora exige una sesión de Firebase (`request.auth != null`), que se establece de forma anónima y obligatoria para todos los visitantes. La autenticación con Google se ha reservado para un panel de administración.
- ✅ **Rate limiting y protección anti-DDoS:** **Corregido.** Se ha implementado un cooldown de 5 minutos por usuario utilizando una transacción atómica y reglas de seguridad en Firestore, mitigando significativamente el riesgo de abuso de escrituras.
- ✅ **Logs y auditoría de eventos:** Firebase y Vercel proveen consolas de monitorización para auditoría de eventos.
- ✅ **Headers seguros:** Vercel aplica headers de seguridad recomendados.
- ✅ **Nada de `console.log` en producción:** Confirmado.
- ✅ **Tests básicos de seguridad y funcionalidad:** La validación con Zod (cliente), el honeypot y las reglas de Firestore (backend) actúan como tests funcionales y de seguridad.
- ✅ **Dependencias y versiones actualizadas:** Se han añadido `firebase` y `@vercel/blob`.
- ✅ **Uso de `.env` y `.env.example`:** **Corregido.** El archivo `.env.example` ahora documenta todas las variables de entorno necesarias.
- ✅ **Arquitectura modular, limpia y documentada:** La arquitectura ha sido refactorizada para una integración cliente-céntrica con Firebase, siguiendo un modelo de seguridad estricto.

---

## 🏗️ Arquitectura Final (Simple y Robusta)

### 1️⃣ Cliente

- **Validación Fuerte**: Usa **Zod** para validar los datos del formulario antes del envío.
- **Honeypot**: Incluye un campo invisible en el formulario para detectar y bloquear bots.
- **Autenticación Anónima**: Utiliza **Firebase Authentication** para asignar una sesión anónima a cada visitante, permitiendo identificar usuarios únicos sin requerir un inicio de sesión.
- **Transacción Atómica**: Escribe en Firestore usando una transacción que garantiza que tanto la consulta como el registro de cooldown se completen exitosamente.
- **Rate Limit**: Las reglas de seguridad de Firestore imponen un cooldown de 5 minutos por usuario, previniendo el abuso de escrituras.
- **Notificación Desacoplada**: Después de una escritura exitosa en Firestore, el cliente realiza una llamada "fire-and-forget" a una API Route de Vercel.

### 2️⃣ Servidor (Vercel API Route: `/api/notify`)

- **Aislamiento de Credenciales**: Es el único punto que conoce el token del bot de Telegram, leyéndolo desde las variables de entorno seguras de Vercel.
- **Recepción de Datos**: Recibe los datos mínimos necesarios (nombre, cédula, contacto) desde la llamada del cliente.
- **Envío de Notificación**: Construye y envía el mensaje a la API de Telegram.
- **Stateless**: No guarda ninguna información adicional; su única función es notificar.

Este enfoque garantiza que el token de Telegram nunca se exponga en el código del cliente, proporcionando una solución segura, de bajo costo y perfectamente integrada con el stack tecnológico de Vercel y Firebase.

---

## 1) Entorno y Framework

- **Framework**: **Next.js 15.5.9** utilizando el **App Router**.
  - **Evidencia**: Estructura de carpetas `src/app/` y `package.json`.
- **Versión de Node**: **Node.js v20.x**.
  - **Evidencia**: `package.json` (`"@types/node": "^20"`).
- **TypeScript**: **Sí**.
  - **Evidencia**: `tsconfig.json` y archivos `.ts`/`.tsx`.

## 2) Deployment

- **Plataforma de despliegue**: **Vercel**.
  - **Evidencia**: Se mantiene `vercel.json` y dependencias asociadas.
- **Dominio personalizado**: **No especificado**.
- **HTTPS**: **Sí, activo por defecto**.

## 3) Backend y Administración

- **API Routes**: **Sí**. Se ha implementado una API Route (`/api/notify`) para gestionar las notificaciones a Telegram de forma segura.
- **Integración con Almacenamiento**: **Vercel Blob** (para imágenes del panel de admin) y **Cloud Firestore** (para datos de consultas y configuración).
  - **Evidencia**: Dependencias en `package.json`, `src/app/admin/actions.ts` para la subida a Vercel Blob y la función de transacción en `ConsultationForm.tsx` que utiliza `firebase/firestore`.
- **Proyecto de Firebase creado**: **Sí**.
  - **Evidencia**: Archivos de configuración en `src/firebase/` y `docs/backend.json`.
- **Firestore habilitado**: **Sí**.
  - **Evidencia**: El código ahora escribe en las colecciones `consultations`, `consultationCooldowns` y `site_config`.
- **Reglas de seguridad configuradas**: **Sí, versión securizada y con rate-limiting**.
  - **Evidencia**: `firestore.rules` ahora exige autenticación (incluida anónima) para escrituras, valida schemas y aplica rate limiting. El acceso a datos está restringido a administradores.
- **Panel de Administración**: **Sí, implementado en `/admin`**.
  - **Evidencia**: Nuevos archivos en `src/app/admin/` y `src/components/vial-clear/AdminDashboard.tsx`.
  - **Seguridad**: El acceso requiere autenticación con Google y un rol de administrador verificado contra la colección `/admins` en Firestore.
- **Notificaciones Automáticas**: Implementado a través de una **API Route de Vercel**. Después de una escritura exitosa en Firestore, el cliente notifica a un endpoint (`/api/notify`) que, desde el backend, envía un mensaje seguro a Telegram. Esto mantiene el token del bot protegido.

## 4) Seguridad

- **Variables de entorno**: **Sí**. La configuración de Firebase y Telegram ahora se carga desde el entorno (`.env`).
  - **Evidencia**: El archivo `src/firebase/config.ts` y `src/app/api/notify/route.ts` leen las variables desde `process.env`.
- **ReCAPTCHA o Honeypot**: **Sí, honeypot implementado**.
  - **Evidencia**: El formulario `ConsultationForm.tsx` y el schema `ConsultationSchema` en `src/lib/definitions.ts` incluyen un campo oculto para detectar bots.
- **Rate Limiting**: **Implementado (5 min cooldown para consultas)**.
  - **Evidencia**: Se utiliza una transacción atómica para escribir en `consultations` y actualizar un documento en `consultationCooldowns`. Las reglas de seguridad de Firestore validan esta lógica.
- **Sanitización de backend**: **Sí, mediante reglas de Firestore**.
  - **Evidencia**: Las reglas en `firestore.rules` validan el tipo, la presencia y el valor de los campos antes de permitir una escritura.

## 5) Base de Datos (Cloud Firestore)

- **Colecciones**: `consultations`, `consultationCooldowns`, `admins`, `site_config`.
  - **Evidencia**: Código en `src/components/vial-clear/ConsultationForm.tsx`, `src/app/admin/layout.tsx`, `firestore.rules` y `docs/backend.json`.
- **Estructura del documento (`consultations`)**:
  - **Evidencia**: Objeto `dataToSave` en el componente del formulario.
    ```javascript
    const dataToSave = {
        authorUid: user.uid,
        cedula,
        nombre,
        contacto,
        aceptoTerminos: true,
        status: 'pendiente',
        fuente: 'web',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(...) // Expira en 30 días
    };
    ```
- **Persistencia de datos**: **Sí**. La implementación ahora guarda los datos en Cloud Firestore de forma segura.

## 6) WhatsApp

- **Integración de WhatsApp**: **Sigue siendo un link directo (cliente)**.
  - **Evidencia**: La lógica en `src/app/page.tsx` no ha sido modificada.

## 7) Analítica

- **Herramientas de Analítica**: **Ninguna implementada**.

## 8) Ciclo de Vida de los Datos (TTL)

- **Autolimpieza de datos**: **Implementado**. Los documentos de consulta ahora incluyen un campo `expiresAt` con una fecha de expiración de 30 días.
- **Mecanismo**: Se utiliza la funcionalidad nativa **Time-to-Live (TTL)** de Firestore, que no tiene costo adicional y no requiere Cloud Functions.
- **Acción requerida**: Para activar la eliminación automática, usted debe configurar una política de TTL en su base de datos de Firestore desde la consola de Firebase.
  1.  Vaya a la sección **Cloud Firestore > TTL**.
  2.  Haga clic en **"Crear Política"**.
  3.  Seleccione la colección `consultations`.
  4.  Seleccione el campo `expiresAt`.
  5.  Habilite la política.
  - **Evidencia**: Código en `ConsultationForm.tsx` y `firestore.rules`.

## Calidad y Despliegue ("Pipeline a la Fija")

Para garantizar que el c�digo cumple con los est�ndares de formato, tipado y pruebas antes de un commit o despliegue, hemos configurado un pipeline unificado.

Ejecute el siguiente comando para correr el ciclo completo:

`ash
npm run check
`

Este comando ejecuta secuencialmente:

1. \
   pm run format\: Formatea todo el c�digo usando Prettier.
2. \
   pm run lint\: Verifica reglas de ESLint en Next.js.
3. \
   pm run typecheck\: Verifica est�ticamente los tipos de TypeScript sin emitir archivos.
4. \
   pm run test\: Ejecuta la suite de pruebas mediante Vitest.
5. \
   pm run build\: Genera una compilaci�n optimizada para producci�n (usando cross-env para soporte de Windows).
