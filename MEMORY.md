# MEMORY.md — Estado del Proyecto Desmulta 🛡️

## 1. Contexto Actual

- **Versión**: v2.3.8
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
- **FinOps (Optimización de Costos)**: 
  - Estrategia Singleton en Firebase Admin SDK para minimizar conexiones.
  - Paginación estricta y limitación de documentos en consultas Firestore (Admin Dashboard) para evitar sobrecostos de lectura.
  - Implementación de Cron Jobs en Vercel para la limpieza automatizada de capturas SIMIT en Vercel Blob (prevención de almacenamiento muerto).
  - Límites de facturación y alertas de consumo configuradas para la API de Gemini.
- **UI/UX y Mobile-First**:
  - Telemetría: Uso planificado de mapas de calor/métricas para optimizar el embudo de conversión del formulario de 3 pasos.
  - Tolerancia a fallos de red: Service Worker configurado (`NetworkFirst`) para reintentos de subida de imágenes en conexiones móviles inestables.

## 4. Auditoría de Seguridad e Integridad (v2.3.7)

- **Vulnerabilidades**: 14 detectadas (Low) vía `npm audit`. Se ejecutó `npm audit fix`.
- **Integridad**: Build verificado exitosamente por el usuario.
- **UX**: Fase de humanización completada. Mensajes técnicos transformados a lenguaje natural para el ciudadano. Los límites de Rate Limit ahora muestran tiempo preciso (minutos/segundos o horas/minutos).
- **Documentación**: Auditoría total del `README.md` v2.3.7 completada. Refleja ahora toda la profundidad técnica (Genkit, Telegram, Seguridad, PWA).
- **Turnstile**: Verificado en modo _Managed_. Validación automática activada para el 90% de los casos.
- **CSP Hardening (v2.3.8)**: Eliminado `unsafe-eval` de `script-src`. Restringido `form-action`, mejorado `Referrer-Policy` a `strict-origin-when-cross-origin`, y `Permissions-Policy` extendida con `payment=(), usb=()`.

## 5. Tareas Pendientes

- [x] Aplicar `npm audit fix` para mitigar riesgos bajos.
- [x] Humanización de mensajes de error y límites.
- [x] **Seguridad**: Estrechar CSP (Content Security Policy) en el Middleware para mitigar riesgos XSS.
- [x] **Seguridad**: Verificar ofuscación de PII en logs de producción (Honeypot/SecurityLogger).
- [ ] **FinOps/Rendimiento**: Implementar mejoras hacia Edge Runtime (según `PLAN_MEJORAS_FUTURAS.md`).
- [ ] **UI/UX**: Pruebas de estrés offline para el Service Worker en la carga SIMIT.
