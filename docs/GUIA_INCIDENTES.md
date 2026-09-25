# Guía de incidentes — "qué hacer si…"

Guía corta para cuando algo falla. Está pensada para leerse con prisa: síntoma → cómo confirmarlo → qué hacer.
Sigue la práctica estándar de la industria (runbooks de SRE): cada alerta tiene un paso a paso escrito antes de que ocurra.

## 1. Qué vigila el sistema

| Capa                 | Herramienta                                               | Quién avisa                                                            |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| ¿El sitio responde?  | Monitor externo (UptimeRobot, gratis) → `GET /api/health` | Correo al propietario si falla dos veces seguidas                      |
| Errores de código    | Sentry                                                    | Correo de Sentry / webhook `/api/webhooks/sentry`                      |
| Servicios que fallan | `src/lib/monitoring/service-alert.ts` (perro guardián)    | Canal de soporte de Telegram (máximo 1 aviso cada 10 min por servicio) |
| Dependencias caídas  | Cortacircuitos (`src/lib/security/*circuit-breaker*`)     | Deja de llamar al servicio caído y responde con plan B                 |
| Reinicio de procesos | Vercel, Cloud Run y Cloud Functions (automático)          | Nadie: la plataforma arranca otra instancia sola                       |
| Datos vencidos       | TTL de Firestore + `cronLimpieza` (03:00 diario)          | —                                                                      |
| Copias de seguridad  | Copia diaria de Firestore (se guardan 7 días)             | —                                                                      |

## 2. Ruta de salud `/api/health`

- `200 {"status":"ok"}`: el sitio y Firestore responden.
- `503 {"status":"degradado"}`: el sitio responde pero Firestore no.
- Es pública y no expone detalles internos. Guarda el resultado 30 s para no gastar lecturas y espera hasta 8 s a Firestore (el primer acceso en frío puede pasar de 3 s).
- Está **exenta del geobloqueo** (`src/middleware.ts`): los monitores revisan desde fuera de Colombia.

### Configurar el monitor externo (una sola vez, gratis)

1. Crear cuenta gratis en <https://uptimerobot.com>.
2. _Add New Monitor_ → tipo **HTTP(s)** → URL `https://desmulta.online/api/health` → intervalo **5 minutos**.
3. En _Alert Contacts_ dejar el correo del propietario (y Telegram si la cuenta gratis lo ofrece).
4. Opcional: crear una "Status page" pública gratis para compartir el estado del servicio.

## 3. Síntomas y qué hacer

### El monitor dice que el sitio está caído

1. Abrir <https://www.vercel-status.com>: si Vercel está caído, solo queda esperar.
2. Si Vercel está bien, revisar el último despliegue en Vercel → _Deployments_. Si falló o rompió algo, usar **Instant Rollback** al despliegue anterior (gratis).
3. Revisar Sentry para ver el error exacto.

### `/api/health` responde 503 (Firestore)

1. Revisar <https://status.firebase.google.com>.
2. Revisar en Firebase Console → _Usage_ si se agotó alguna cuota o hay un problema de facturación.
3. Si Firestore vuelve, el cortacircuitos se cierra solo; no hay que reiniciar nada.

### El asistente responde siempre "no pude consultar" (modo local)

1. Llega un aviso a Telegram del perro guardián con el servicio que falla.
2. Causa más común: la clave de Gemini sin cuota o bloqueada. Probarla y, si hace falta, cambiar `GEMINI_API_KEY` en Cloud Run (agente) y en Vercel.
3. Ver `docs/CHAT_ARCHITECTURE.md` para el detalle del flujo.

### No llegan casos nuevos a Telegram

1. `cronRetryNotifications` reintenta los envíos fallidos automáticamente.
2. Si persiste, revisar el token del bot y el ID del canal en Firebase Secrets / Vercel.

### Los pagos de Wompi no se confirman

1. Revisar el estado de Wompi y el panel de eventos del webhook.
2. Ver `docs/WOMPI_WEBHOOKS.md` (firma, idempotencia y reintentos).

### Las noticias del blog dejaron de actualizarse

1. Revisar `logs/blog-sync.log` en el PC.
2. Revisar en el Programador de tareas de Windows la tarea **"Desmulta - Noticias del blog"**.
3. Correr a mano: `npm run blog:publish`.

### Se borraron o dañaron datos en Firestore

Las copias diarias se guardan 7 días. Restaurar **no sobrescribe** la base actual: crea una base nueva con los datos de la copia, desde la que se recupera lo perdido.

```bash
# 1. Ver las copias disponibles
gcloud firestore backups list --project studio-9140393615-6d1a3

# 2. Restaurar una copia en una base nueva (ej. "restaurada")
gcloud firestore databases restore \
  --source-backup=projects/studio-9140393615-6d1a3/locations/nam5/backups/ID_DE_LA_COPIA \
  --destination-database=restaurada --project studio-9140393615-6d1a3
```

Después se copian los documentos necesarios de `restaurada` a `(default)` y se borra la base `restaurada` para no pagar por ella.

Costo: las copias se cobran por almacenamiento; para una base del tamaño de Desmulta son centavos de dólar al mes. Restaurar se cobra por GB leído (también centavos).

### GitHub Actions no corre

La cuenta de GitHub está bloqueada por facturación. Mientras tanto, CI no corre en GitHub: la validación es local (Husky + `npm run validate`) y el blog se publica desde el PC.
