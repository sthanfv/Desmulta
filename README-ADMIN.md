# 🛡️ Informe Técnico: Panel de Administración (`/admin`)

Este documento detalla exhaustivamente la arquitectura, componentes, seguridad y funciones disponibles en la ruta `/admin` del proyecto **Desmulta**.

---

## 🏗️ 1. Arquitectura de Enrutamiento (App Router)

El panel de administración está construido utilizando el _App Router_ de Next.js (`src/app/admin`) y se compone de los siguientes archivos estructurales:

- **`layout.tsx`**: Es el guardián de la ruta. Implementa la barrera de seguridad. Solo permite el acceso a usuarios autenticados mediante Firebase Auth cuyo UID exista en la colección `admins` de Firestore. Si el usuario no está logueado, renderiza el formulario de inicio de sesión. Si está logueado pero no es administrador, muestra una pantalla de "Acceso Denegado".
- **`page.tsx`**: Archivo de entrada de la ruta. Es un _Server Component_ que envuelve el componente principal (`AdminDashboard`) en un bloque `<Suspense>`, mostrando un esqueleto de carga (`AdminSkeleton`) mientras el cliente hidrata la aplicación.
- **`loading.tsx`**: Archivo de fallback nativo de Next.js para mostrar estados de carga mientras se resuelven las promesas del lado del servidor.
- **`actions.ts`**: Contiene exclusivamente _Server Actions_ (`'use server'`) que interactúan de forma segura con Firebase Admin SDK y Vercel Blob, evadiendo la exposición de credenciales al cliente.

---

## 🔒 2. Seguridad y Autenticación

- **Autenticación (Firebase Auth)**: El acceso requiere **Email y Contraseña**. Se incluye lógica de detección de credenciales inválidas y recuperación de contraseña (`sendPasswordResetEmail`).
- **Autorización (RBAC simple)**: No basta con estar registrado. El sistema verifica en tiempo real (`useDoc(adminRef)`) que el UID del usuario exista en la colección `admins` de Firestore. Esto impide que cualquier usuario regular ingrese al panel.
- **Transacciones Seguras**: Las operaciones críticas en BD (como pasar un Lead a Caso Activo) utilizan transacciones atómicas (`runTransaction`) para evitar inconsistencias si el proceso falla a la mitad.

---

## 🎛️ 3. Componentes Principales de la UI

### `AdminDashboard.tsx`

Es el cerebro interactivo del panel. Utiliza un sistema de pestañas (`Tabs` de Shadcn UI) para fragmentar la información en tres grandes módulos:

1. **Centro de Comando (`TableroKanbanReal`)**:
   - Una vista de tablero Kanban interactivo con soporte para **Drag & Drop** nativo y **Tap-to-Move** para móviles.
   - **Smart Cards**: Detectan el tipo de lead (Imagen SIMIT vs Datos) y ajustan su visualización aplicando Fallback automático: prioriza Placa, si no existe usa la Cédula como título.
   - **Columnas/Estados**: `NUEVO`, `CONTACTADO`, `ESTUDIO`, `DESCARTADO` (Ventas) / `APERTURA`, `RADICADO`, `TRAMITE`, `FINALIZADO` (Casos).
   - Utiliza UI Optimista (Optimistic UI) para actualizar el DOM instantáneamente al arrastrar y soltar sin esperar la respuesta del servidor, garantizando 0 lag.
   - **Modal de Acción Rápida (`ModalDetalleLead`)**: Ventana flotante de alto rendimiento para visualización profunda, previsualización de capturas SIMIT y contacto directo vía WhatsApp con mensajes pre-llenados inteligentes.

2. **Gestión de Leads (`ConsultationsList` - Módulo de Prospectos)**:
   - Visualización de todas las consultas (Leads) entrantes.
   - Permite la visualización de datos de los clientes potenciales y ofrece botones de acción rápida, como abrir un chat de WhatsApp directo con el usuario.

3. **Casos Activos (`CasesList` - Procesos Legales en Trámite)**:
   - Módulo exclusivo para procesos jurídicos que ya fueron validados y están formalizados.

### Módulos Adicionales (Configuración del Sitio)

Dentro del mismo `AdminDashboard`, existen dos formularios construidos con `React Hook Form` y validados estrictamente con `Zod`:

- **Historias de Éxito (`showcaseSchema`)**:
  - Permite subir fotos del "Antes" y "Después" de una multa (usando Vercel Blob).
  - Permite configurar los textos dinámicos "Valor del Contador" (ej. "1k+") y su etiqueta ("Casos Exitosos").
- **Identidad Institucional (`footerSchema`)**:
  - Panel para modificar variables globales de contacto que se reflejan en el Footer de toda la web: WhatsApp, Email, Dirección Física, URL de Instagram y URL de Facebook.

---

## ⚡ 4. Acciones del Servidor (`actions.ts`)

El archivo de Server Actions es el puente entre el frontend admin y la base de datos segura. Contiene las siguientes funciones vitales:

1. **`getConsultations` y `getCases`**: Obtienen los leads y los casos activos de Firestore, implementando **paginación** (`limit`, `startAfter`) para evitar cuellos de botella en memoria cuando la BD crezca.
2. **`uploadImage` / `uploadCaseDocument`**: Sube imágenes y evidencias fotográficas a **Vercel Blob**, generando urls públicas y vinculándolas a los expedientes.
3. **`convertToCase`**: Lógica de negocio crítica. Toma un Lead (`Consultation`) y lo convierte en un `Case` nuevo con estado `apertura`, creando el primer registro en su historial de auditoría. (Operación Transaccional).
4. **`updateCaseStatus` / `updateConsultationStatus`**: Actualiza los estados en la base de datos y adjunta descripciones de auditoría en los arrays `history`. Invoca `revalidatePath('/admin')` para refrescar la UI sin necesidad de un F5 por parte del cliente.
5. **Mantenimiento y Saneamiento (`deleteExpiredConsultations`, `deleteSimitCaptures`)**:
   - Funciones diseñadas para cumplir políticas de retención de datos.
   - Permiten borrar leads de más de 7 días de antigüedad.
   - Permiten vaciar las capturas temporales del SIMIT alojadas en Vercel Blob para ahorrar costos de almacenamiento.

---

## 🚀 5. Resumen del Flujo de Usuario (Admin)

1. El Admin entra a `/admin`.
2. Se autentica. (Si falla, el Layout lo bloquea).
3. Entra al **Dashboard** (App Router carga `page.tsx` -> `AdminDashboard.tsx`).
4. Revisa prospectos en la pestaña **Gestión de Leads**.
5. Los que son viables, los promueve a **Casos Activos** mediante server actions.
6. Administra el flujo de trabajo arrastrando tarjetas en el **Centro de Comando (Kanban)**.
7. Ocasionalmente, actualiza las pruebas de éxito (Fotos) y los datos de contacto corporativos que se ven en la Landing Page pública.
8. Realiza purgas de datos basura mediante los botones de limpieza (SIMIT y Expirados).

---

_Informe generado automáticamente tras escaneo profundo del repositorio local (v1.8.0)._
