# Plan Estratégico de Mejoras Futuras — Desmulta (Post v2.0.0)

Este documento proyecta el roadmap de crecimiento tecnológico y de negocio para Desmulta, asegurando el escalado responsable bajo nuestro **MANDATO-FILTRO**.

## 1. Mejoras de Ingeniería y Rendimiento (Performance)

- **Migración a Edge Runtime**: Actualmente las peticiones y rutas de Firebase corren en Node.js Serverless. Mover funciones de validación a Edge Runtime con `export const runtime = 'edge'` y fetch directos a la REST API de Firestore disminuirá la latencia en milisegundos.
- **Service Workers (Avanzado)**: PWA Offline-First. Ampliar funciones de `PwaRegistry` para cachear blogs y respuestas frecuentes, aumentando velocidad de carga inicial.
- **Optimización de Imágenes**: Aunque usamos `next/image`, la inclusión directa de formatos como **AVIF** para los assets más pesados de la landing page (fondo) podría reducir el peso de red un 20%.

## 2. Atractivo Visual y Crecimiento (Growth & UI)

- **Gamificación del Caso (Barra de Progreso interactiva)**: Una vez que el usuario ingresa sus datos y tiene expediente, crear un enrutador `/estado/X` que le permita ver la salud de su proceso (Análisis Técnico -> Radicación -> Decisión). Los componentes premium ya existentes servirán para esto.
- **Micro-interacciones Lottie**: Integrar animaciones vectoriales SVG con react-lottie para el escudo protector o el botón CTA, mejorando la sensación háptica percibida al hacer tap.
- **Dark Mode Dinámico (Auto-Toggle)**: Vincular la paleta oscura mediante geolocalización o la hora en UTC del usuario al entrar al sitio.

## 3. Automatización e IA (Genkit & LLMs)

- **Chatbot Asesor Inicial con Gemini**: Integrar un flow Genkit que filtre la intención del usuario automáticamente (¿Fotodetección o comparendo físico?), lo categorice con un score de éxito previo y asigne una ruta técnica o WhatsApp humano ya con contexto.
- **Auto-Clasificador OCR en Captura SIMIT**: Procesar automáticamente las capturas del SIMIT enviadas en `/api/upload` extrayendo montos y fecha usando Vision API AI, inyectando estos datos directamente en el CRM.

## 4. Analítica y Conversión

- **A/B Testing de CTA**: Probar "Consultar Gratis" vs "Iniciar Saneamiento" utilizando Middlewares de Next.js, guardando variables en Cookies para evaluar qué frase inyecta mayor intención de compra.
- **Heatmaps**: Introducir métricas para rastrear clics falsos o abandonos del "Formulario Avanzado", corrigiendo la fricción del usuario.

## 5. Ciberseguridad Activa (Roadmap)

- **Recaptcha/Turnstile en Ingesta de Datos**: Actualizar nuestros FormHandlers y agregar verificación pasiva Cloudflare Turnstile evitando scripts masivos por encima del rate limit manejado.
- **Auditoría SBOM Continua**: Automatizar el rastreo de dependencias vulnerables en CI/CD con Github Actions para frenar el deploy si hay un error P0 detectado en NPM.
