# Memoria del Sistema (Desmulta)

## Estado Actual
El sistema tiene integrado el registro y envío de notificaciones Push y envío de correos, coordinado mediante Firebase Cloud Functions para atrapar cambios hechos desde el Panel Web y desde Telegram de manera uniforme.

## Últimos Cambios Realizados
- **Centralización de Notificaciones Push**: Se eliminó el envío de notificaciones desde el cliente (`actions.ts`) y se movió a las Cloud Functions (`onCaseStatusChange.ts` y `onConsultationStatusChange.ts`). 
- **Corrección de Correos Duplicados**: Se ajustó la matriz de estados en `onConsultationStatusChange.ts` para ignorar los estados que crean/modifican un caso legal (como "Contactado" y "En Estudio"), los cuales ya son atendidos por `onCaseStatusChange.ts`.
- **Enriquecimiento del Push (Toque Humano)**: Se modificó la plantilla de Push (`push-notifications.ts`) para incluir la `operatorNote` (nota del asesor) al final del cuerpo de la notificación si existe, agregando estética y separación clara.
- **Mejora UX en Panel Web**: Se expandieron de 3 a 6 las opciones predeterminadas de respuestas rápidas (Toque Humano) en el componente `ModalNotaOperador.tsx` para cubrir más escenarios legales de manera profesional.
- **Corrección de Idempotencia Telegram**: Se corrigió el webhook de Telegram (`telegramWebhook.ts`) cambiando la verificación de idempotencia de un simple ID de mensaje a una validación de estado anterior vs nuevo, previniendo dobles toques que bloqueaban el teclado.

## Archivos Afectados
- `functions/src/onCaseStatusChange.ts`
- `functions/src/push-notifications.ts`
- `functions/src/telegramWebhook.ts`
- `src/app/admin/actions.ts`
- `src/components/vial-clear/ModalNotaOperador.tsx`

## Decisiones Técnicas
- Todo lo relacionado a disparar Push notifications (FCM) debe ocurrir de lado del servidor usando Firestore Triggers (Cloud Functions) para garantizar que los cambios provenientes de Telegram u otras fuentes externas también notifiquen al cliente final sin depender de la UI.
- No depender de variables "front" para la gestión de las colas de push.
