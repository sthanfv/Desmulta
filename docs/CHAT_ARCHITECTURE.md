# 🤖 Arquitectura del Asistente IA (Chatbot B2B)

El ecosistema de Inteligencia Artificial de Desmulta está diseñado como un microservicio independiente (Python) con un frontend optimizado en UX (Next.js).

## 1. Patrón de Bypassing UX (Streaming Simulado)

Dado que el motor de Python ejecuta validaciones pesadas (RAG legal, búsqueda de radares ANSV, Infracciones y Guardrails), la respuesta toma varios segundos. Para evitar el rebote del usuario:

- **Frontend (ChatAssistantWidget.tsx):** Intercepta la petición y muestra Thinking Steps ("Consultando cámaras...", "Analizando jurisprudencia...") de forma progresiva.
- **Typewriter Effect:** Al recibir el payload final de Python, se emite letra por letra (5 chars/20ms) simulando generación en tiempo real.

## 2. Inyección de Contexto Comercial (Next.js Middleware)

El endpoint /api/chat/route.ts actúa como un **Proxy Guardrail**.

- Escanea la pregunta del usuario con Regex.
- Si detecta intenciones de búsqueda de "soluciones" (ej: "¿cómo pago?", "¿qué hago?"), inyecta de forma invisible una directiva dura al final del mensaje: [DIRECTIVA DE SISTEMA OCULTA: El usuario busca solucionar su problema...].
- Esto cura el "Síndrome de Abogado Genérico" y fuerza a la IA a vender los servicios de Desmulta.

## 3. Seguridad B2B y Fallback

- **Criptografía:** Next.js firma el payload JSON y un Timestamp con HMAC-SHA256. Python rechaza peticiones antiguas (anti-replay) o sin firma.
- **Fail-Open:** Si el microservicio falla o Google agota la cuota, Next.js intercepta el error, dispara un Telegram a soporte, y responde al usuario con un texto legal pre-programado invitándolo a usar el OCR (manteniendo al cliente en el funnel).
- **Rate Limit:** Upstash Redis bloquea a nivel IP tras 10 mensajes en 24 horas (chatAgent).
