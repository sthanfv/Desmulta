# MEMORY.md - Historial del Sistema

## 2026-06-21: Implementación de Pagos Wompi (Fases 1 a 4 completadas)
- **Qué cambió:** 
  - Se añadieron variables de entorno Sandbox de Wompi.
  - Se modificó `firestore.rules` para asegurar las transacciones.
  - Se crearon rutas API para generar órdenes de pago (`create-order`) y recibir notificaciones (`webhook-wompi`).
  - Se diseñó la UI de pago incrustando el widget Wompi en `WompiCheckout.tsx` y la página de confirmación en tiempo real.
  - Se implementó la lógica de entrega en `pdf-delivery.ts` para enviar el PDF generado al correo del cliente tras un pago aprobado.
  - Se creó un script de Cloud Functions `retryFailedDeliveries.ts` para tolerar caídas de la red en la entrega del correo.
  - Se agregó una UI dedicada en `src/app/test-pago/page.tsx` para probar el flujo completo localmente.
  - Se refactorizó `WompiCheckout.tsx` para usar Web Checkout mediante redirección en lugar de inyección de script DOM.
- **Por qué cambió:** 
  - Para implementar un checkout integral y nativo en Colombia.
  - La inyección dinámica del script `widget.js` de Wompi fallaba de manera silenciosa en Next.js (comportamiento documentado debido a que los widgets legacy dependen de `document.currentScript`).
- **Archivos afectados:** 
  - `.env`, `src/lib/env-validator.ts`, `firestore.rules`
  - `src/app/api/payments/create-order/route.ts`
  - `src/components/payments/WompiCheckout.tsx`
  - `src/app/documentos/confirmacion/page.tsx`
  - `src/app/api/payments/webhook-wompi/route.ts`
  - `src/lib/payments/pdf-delivery.ts`
  - `functions/src/retryFailedDeliveries.ts`
  - `src/app/test-pago/page.tsx`
- **Decisiones técnicas:**
  - Uso de **Hash HMAC-SHA256** (`hashPII`) para guardar PII.
  - Uso del **Web Checkout nativo de Wompi** mediante construcción de URL y botón estándar de React, evitando manipulaciones imperativas del DOM (`appendChild`).
- **Estado actual:** ✅ Listo y desplegado en modo Sandbox.

## 2026-06-21: Corrección de Errores de Tipado de TypeScript para Producción
- **Qué cambió:**
  - Se corrigió el tipo de estado `status` en la interfaz `PurchaseData` en `confirmacion/page.tsx`.
  - Se creó la interfaz `PurchaseData` en el editor `editor/[id]/page.tsx` para evitar el uso del tipo `unknown`.
  - Se corrigieron los accesos a `window.WidgetCheckout` y el tipado del callback de checkout en `peticion-general/page.tsx`.
  - Se definió la interfaz `CheckoutData` en `test-pago/page.tsx` para compatibilidad estricta con las props del componente `WompiCheckout`.
  - Se ajustó la función `formatDate` en `SalesAdminView.tsx` para validar de forma Type-Safe la existencia de la función `.toDate()` de los Timestamps de Firestore.
  - Se eliminó la importación no utilizada `_degrees` en `pdf-engine.ts`.
- **Por qué cambió:**
  - Para posibilitar la compilación exitosa del proyecto (`npm run build`) en el entorno de producción de Vercel y eliminar advertencias de TypeScript.
- **Archivos afectados:**
  - `src/app/documentos/confirmacion/page.tsx`
  - `src/app/documentos/editor/[id]/page.tsx`
  - `src/app/documentos/generador/peticion-general/page.tsx`
  - `src/app/test-pago/page.tsx`
  - `src/components/vial-clear/SalesAdminView.tsx`
  - `src/lib/legal/pdf-engine.ts`
- **Decisiones técnicas:**
  - Uso de casteo explícito con interfaces locales e instanciación de tipos seguros sin recurrir a `any` genéricos siempre que fuera viable.
  - Comprobación del tipo de error usando `instanceof Error` en bloques `catch`.
- **Estado actual:** ✅ Proyecto compila 100% libre de errores de TypeScript en modo de producción.
