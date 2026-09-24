# 🤖 Arquitectura del Asistente IA (Chatbot B2B)

> Actualizado: 2026-09-24. El ecosistema de IA de Desmulta es un microservicio independiente
> (`desmulta-ai-agent`, Python/FastAPI en Cloud Run) con un proxy y un widget en Next.js.

## Flujo de un mensaje

```
Widget (ChatAssistantWidget.tsx)
  └─ POST /api/chat (Next.js)                 src/app/api/chat/route.ts
       1. Rate limit ráfaga (8/min por IP)
       2. Validación Zod
       3. ¿Charla corta? (hola, gracias, chao…) → respuesta humana local, sin IA
       4. Rate limit diario (60/día por IP)
       5. Directiva de control (aislada del mensaje del usuario)
       6. Firma HMAC-SHA256 (timestamp + cuerpo) y POST al agente (timeout 14 s)
  └─ Agente (Cloud Run)                       desmulta-ai-agent/app
       a. Middleware HMAC (fail-closed, anti-replay, máx. 32 KB)
       b. Sanitización / anti prompt-injection
       c. Charla corta → respuesta humana sin RAG ni CTA
       d. Herramientas vivas (cámaras ANSV, prescripción, infracciones, viabilidad)
       e. RAG legal (solo se muestran al ciudadano normas que coinciden)
       f. Gemini: principal gemini-flash-lite-latest (7 s) → respaldo gemini-flash-latest (5 s)
          → si ambos fallan, motor determinista (textos fijos por palabra clave)
       g. Guardrails: bloqueo de minutas completas, botón sugerido según la pregunta
```

## 1. Conversación natural

- **Charla corta** (`src/lib/chat/small-talk.ts` en la web y `app/engine/conversation.py` en el agente): saludos, agradecimientos, despedidas, "¿quién eres?" y "¿cómo estás?" se responden como una persona, sin citar leyes ni mostrar botón comercial. Los mensajes mixtos ("hola, me llegó una fotomulta") siguen al flujo legal.
- **Prompt con personalidad** (`app/engine/prompt.py`): saludar solo si el ciudadano saluda, no repetir fórmulas, respuestas cortas (~90 palabras), una herramienta por mensaje como máximo, no inventar servicios ni precios y no prometer resultados.
- **Botón sugerido** (`app/security/guardrails.py`): se elige por lo que preguntó el ciudadano (embargo/licencia → estudio gratuito, prescripción/año antiguo → calculadora, cámara/foto → directorio ANSV, documento/precio → plantillas). Antes se decidía sobre la respuesta del modelo y casi siempre salía "Cámaras ANSV".

## 2. Memoria de la conversación

- El widget guarda la conversación en `sessionStorage` (se conserva al navegar entre páginas) y envía los últimos 10 mensajes.
- `src/lib/chat/history.ts` recorta cada mensaje a 1 500 caracteres y descarta los más antiguos hasta que el payload quepa en `AGENT_MAX_PAYLOAD_BYTES` (28 000 por defecto; el agente acepta 32 KB). Antes el agente rechazaba todo payload > 4 KB y la web caía a una respuesta legal fija.

## 3. UX del widget

- Efecto máquina de escribir (5 caracteres / 20 ms) y mensajes de espera neutros.
- En teléfono: pantalla completa, sin selector de tamaño de letra, abierto desde la pestaña "Asistente" (ver `docs/MOBILE_APP_SHELL.md`).
- Botón de WhatsApp en la cabecera del chat y en los respaldos.

## 4. Seguridad B2B

- **HMAC-SHA256** del timestamp + cuerpo; ventana anti-replay de 30 s. La caché anti-replay solo registra firmas ya verificadas.
- **Fail-closed:** sin `AGENT_HMAC_SECRET` (o con menos de 32 caracteres) el agente responde 503 a todo. No hay secretos por defecto en el código (el anterior quedó en el historial de Git y se rotó el 2026-09-23).
- La clave de Gemini viaja en el header `x-goog-api-key`, nunca en la URL.

## 5. Respaldos y alertas

- Si el agente no responde, responde con error o devuelve texto vacío, la web contesta con un mensaje honesto y un botón de WhatsApp (nunca con párrafos legales de relleno) y dispara `alertServiceFailureInBackground('chat', …)`.
- Las alertas (`src/lib/monitoring/service-alert.ts`) van a Telegram en HTML escapado, con `waitUntil` y anti-spam de 1 alerta por servicio cada 10 minutos.
- En el agente, cada fallo de Gemini queda en los logs de Cloud Run con modelo y código HTTP (antes fallaba en silencio).

## 6. Variables de entorno

| Dónde              | Variable                                                  | Uso                              |
| ------------------ | --------------------------------------------------------- | -------------------------------- |
| Vercel             | `AGENT_AI_URL`                                            | URL del agente en Cloud Run      |
| Vercel + Cloud Run | `AGENT_HMAC_SECRET`                                       | Mismo valor en ambos (64 hex)    |
| Vercel (opcional)  | `AGENT_MAX_PAYLOAD_BYTES`                                 | Presupuesto del payload (28 000) |
| Cloud Run          | `AGENT_GEMINI_API_KEY`                                    | Clave de Google AI Studio        |
| Cloud Run          | `AGENT_GEMINI_MODEL_NAME` / `AGENT_GEMINI_FALLBACK_MODEL` | Modelo principal y de respaldo   |

## 7. Diagnóstico rápido

- **El chat responde siempre lo mismo / textos legales fijos:** Gemini está fallando. Revisar los logs del servicio `desmulta-ai-agent` en Cloud Run (`Gemini (...) respondió HTTP ...`): 401 = clave inválida, 402 = créditos agotados, 404 = modelo retirado, 503/429 = saturación o cuota.
- **El chat muestra "no logro conectarme" con botón de WhatsApp:** la web no llega al agente (secreto HMAC distinto entre Vercel y Cloud Run, URL mal configurada o agente caído). Llega una alerta a Telegram.
