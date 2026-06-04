# Roadmap Estratégico - Desmulta v8+

## 1. Rendimiento y Escalabilidad (Performance)

*   **Migración a Arquitectura Edge (Edge Functions):**
    Evaluar la migración de las operaciones de telemetría y middlewares de seguridad hacia funciones Edge (ej. Vercel Edge o Cloudflare Workers) para reducir el TTFB (Time to First Byte) a <50ms y ejecutar el rate-limiting más cerca del usuario.
*   **Optimización de Bundle Size:**
    Analizar el peso de componentes dinámicos como `Tesseract.js`. Se recomienda aislar completamente el OCR a un web worker o, idealmente, trasladar el procesamiento de imágenes SIMIT a una Cloud Function asíncrona para descargar el cliente móvil.
*   **Gestión de Estados e Hidratación:**
    Implementar estrategias avanzadas de *Progressive Hydration* para componentes pesados. Diferir aún más la carga de elementos decorativos interactivos para garantizar métricas LCP perfectas.

## 2. Seguridad DevSecOps (Security)

*   **Rotación Automática de Secretos:**
    Integrar un sistema de rotación de claves para tokens JWT y API Keys de integraciones externas (ej. Turnstile, Telegram) mediante GitHub Actions y Google Cloud Secret Manager.
*   **Auditoría de Dependencias Continua:**
    Establecer en el pipeline CI/CD herramientas de análisis estático avanzado (SAST) y análisis de composición de software (SCA) para bloquear deploys si se detectan vulnerabilidades de severidad Alta o Crítica.
*   **Honeypots y Análisis de Patrones:**
    Mejorar el sistema de Honeypots incorporando análisis de huella dactilar de navegador (browser fingerprinting) sin recolección de PII, para detectar granjas de bots más sofisticadas.

## 3. Automatización de Negocios (Business Automation)

*   **Respuestas Asistidas por IA:**
    Implementar un agente de LLM integrado en el panel de administrador para redactar borradores automáticos de derechos de petición y tutelas, basándose en la jurisprudencia de las multas detectadas.
*   **Embudos de Conversión Avanzados:**
    Completar la telemetría para rastrear el "Drop-off Rate" exacto en cada paso del formulario, permitiendo campañas de *Retargeting* anónimas y optimización de UX basada en datos.
*   **Pasarela de Pago Integrada (Fase 2):**
    Cuando el modelo de negocio escale, incorporar flujos de pago embebidos directamente en el seguimiento del caso (ej. Stripe o Wompi) utilizando links seguros de un solo uso que expiran en 24h.
