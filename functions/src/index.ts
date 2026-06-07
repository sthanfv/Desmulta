import * as admin from 'firebase-admin';

// Inicializar el Admin SDK una sola vez para todas las funciones
admin.initializeApp();

// Exportar funciones
export { cronLimpieza } from './cronCleanup';
export { cronRetryNotifications } from './cronRetryNotifications';
export { onCaseStatusChange, onCaseCreated, onConsultationStatusChange } from './onCaseStatusChange';
export { onConsultationCreated } from './onConsultationCreated';
export { onPushOptIn } from './onPushOptIn';
export { telegramWebhook } from './telegramWebhook';
export { onCasoChanged, onConsultaChanged } from './auditTriggers';
