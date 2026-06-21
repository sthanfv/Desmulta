# Telegram CRM Pipeline & Analytics Funnel v2.0

## Descripción General
Esta documentación detalla la arquitectura implementada para transformar la plataforma Desmulta en un CRM operativo impulsado por Telegram y paneles de analítica en tiempo real.

## 1. Pipeline de Ingesta y Notificación
El pipeline conecta la entrada del usuario en la web con el sistema de respuesta del equipo operativo.

### Flujo de Datos
1. **Captura (Calculadora/OCR):** El usuario ingresa sus datos o sube una captura del SIMIT. Esto genera un documento en la colección `leads`.
2. **Formulario Web:** Si el usuario decide continuar, llena el formulario, creando un documento en `consultations`.
3. **Motor Legal (Prescription Engine):** De fondo, se calculan las probabilidades de caducidad, prescripción y solidaridad (C-038).
4. **Webhook de Telegram (`onConsultationCreated`) y Actualizaciones:**
    - Una Cloud Function detecta la creación de la consulta, extrae el `telegramMessageId` y lo guarda.
    - Se aplica un `delay` de 3 segundos para prevenir condiciones de carrera y permitir que las sub-colecciones (como el OCR) se estabilicen.
    - Hace un "Join" con la colección `leads` para traer datos financieros (Total Deuda, Cantidad de Multas).
    - Ensambla un **Dictamen Legal** y lo envía vía Telegram al equipo.
    - Incluye botones Inline (Contactado, En Estudio, Radicado, Descartar) que interactúan bidireccionalmente con la base de datos Firestore.
    - Al cambiar los estados en el Kanban, el mensaje original se actualiza (`editMessageText`) dinámicamente, evitando mensajes duplicados. Todo el envío de emails y push al cliente queda centralizado y consolidado en Firebase para no enviar alertas repetidas.

## 2. Embudo de Ventas (Funnel Metrics)
Para medir la rentabilidad del sistema, se implementó un embudo de conversión de 3 fases en el panel de administrador.

### Fases del Embudo
- **Total Prospectos (Top of Funnel):** Usuarios que utilizaron calculadoras o subieron imágenes (Colección `leads`).
- **Consultas Creadas (Middle of Funnel):** Usuarios altamente calificados que enviaron el formulario de contacto (Colección `consultations`).
- **Casos Activos (Bottom of Funnel):** Expedientes aprobados por el operador para iniciar proceso jurídico (Colección `cases`).

### Optimización y Caché (Reducción de Costos)
Dado que el Dashboard consume lecturas de Firestore que pueden ser costosas a escala:
- Se implementó `unstable_cache` de Next.js.
- El servidor retiene el cálculo del embudo en caché de memoria durante 5 minutos (`revalidate: 300`).
- Esto significa que múltiples recargas del dashboard no incurrirán en cobros de lecturas de base de datos repetitivas.

## 3. Seguridad Perimetral
- **Honeypot:** Campos ocultos en los formularios para capturar bots (`websiteHoneypot`).
- **Rate Limiting:** Bloqueo por IP mediante Upstash Redis Edge (ej. `telemetry: 3/24h`, `crashReport: 20/1m`).
- **E2EE:** Desencriptación en tránsito (`decryptE2EPayload`) para Cédulas y Teléfonos.

## 4. Telemetría y Crash Reporting (Sistema NOC)
Además de funcionar como CRM, Telegram actúa como el **Network Operations Center (NOC)** de la plataforma:
- **Captura de Excepciones Críticas:** Cualquier error 500 no controlado de React (Server o Client Components) es capturado por las *Error Boundaries* (`error.tsx` / `global-error.tsx`).
- **Almacenamiento Redundante:** El payload del error se envía a la colección `crash_reports` en Firestore, garantizando que haya un registro persistente incluso si la API de Telegram falla.
- **Notificación Push a Telegram:** Se envía una alerta roja a un canal secundario (Supergrupo de Alertas Técnicas, configurado vía `TELEGRAM_DEV_CHAT_ID`) utilizando un parseador `HTML` seguro, adjuntando el *Stack Trace* seguro (digest ID) y la URL afectada.
- **Tolerancia a Fallos:** La ruta interna `/api/internal/crash-report` está fortificada por *Upstash Redis* limitando agresivamente los envíos (20/min) para evitar saturación durante reinicios en bucle, y el frontend cuenta con filtros anti-duplicados para el React Strict Mode.
