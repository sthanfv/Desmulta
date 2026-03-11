# MEMORY.md — Estado del Proyecto Desmulta 🛡️

## 1. Contexto Actual

- **Versión**: v2.3.7
- **Estado**: Fase de reconocimiento inicial completada.
- **Mando**: Equipo de Desarrollo Élite (Principal Engineer, DevSecOps, DBA, QA).

## 2. Stack Tecnológico Detectado

- **Frontend**: Next.js 15.5.12, React 19.2.1 (PWA con `@ducanh2912/next-pwa`).
- **Estilos**: Tailwind CSS 3.4.1, UI based on Radix UI primitives.
- **Backend/DB**: Firebase Admin SDK (Server-side queries), Firestore.
- **IA**: Genkit con Google GenAI (Gemini).
- **Seguridad**: Logger de seguridad personalizado con ofuscación de PII, Middlewares de protección, Cloudflare Turnstile.
- **Infraestructura**: Vercel (Edge Runtime ready), Vercel Blob para storage.

## 3. Decisiones de Arquitectura

- **Modularidad Estricta**: Separación clara entre `src/app` (rutas/actions), `src/components`, `src/lib` y `src/services`.
- **Zero-Trust**: Validación de datos con Zod, protección de API con Turnstile, y logger que ofusca PII (Cédulas, Teléfonos).
- **Sincronización Dinámica**: Uso de Server Actions para invalidar caché y actualizar el frontend instantáneamente.

## 4. Auditoría de Seguridad e Integridad (v2.3.7)

- **Vulnerabilidades**: 14 detectadas (Low) vía `npm audit`. Se ejecutó `npm audit fix`.
- **Integridad**: Build verificado exitosamente por el usuario.
- **UX**: Fase de humanización completada. Mensajes técnicos transformados a lenguaje natural para el ciudadano. Los límites de Rate Limit ahora muestran tiempo preciso (minutos/segundos o horas/minutos).
- **Turnstile**: Verificado en modo _Managed_. Validación automática activada para el 90% de los casos.

## 5. Tareas Pendientes

- [x] Aplicar `npm audit fix` para mitigar riesgos bajos.
- [x] Humanización de mensajes de error y límites.
- [ ] Estrechar CSP si es necesario.
- [ ] Implementar mejoras de rendimiento hacia Edge Runtime (según `PLAN_MEJORAS_FUTURAS.md`).
