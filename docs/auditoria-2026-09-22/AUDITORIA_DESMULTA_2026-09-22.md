# Auditoría técnica Desmulta — 2026-09-22

**Alcance:** `C:\Workspace\Ecosistema_Desmulta\Desmulta` — ~330 archivos de `src/` (API routes, Server Actions, middleware, libs, componentes), `functions/src` (Cloud Functions), `firestore.rules`, índices, `vercel.json`, `next.config.ts`, CI/CD y scripts de la raíz.

**Qué verifiqué ejecutando (no solo leyendo):**

- Baseline del repo: `tsc --noEmit` limpio y **326/326 tests** en verde.
- Con el parche aplicado: `tsc` 0 errores, `eslint --max-warnings 0` limpio, Prettier OK, **328/328 tests** (los 326 originales —con 6 archivos de test ajustados al nuevo comportamiento— más 2 tests nuevos de seguridad).
- El bypass del SSRF guard lo reproduje contra tu código original: `https://[::ffff:169.254.169.254]/`, `https://[::ffff:7f00:1]/` y `https://[fe80::1]/` **pasan** la validación actual.

**Qué NO verifiqué:** `next build`, el entorno de producción (variables en Vercel, índices creados a mano en consola, schedules de QStash) ni el typecheck de `functions/` (sus dependencias no están instaladas). Donde un hallazgo depende de eso, lo marco como **"verificar"**.

**Entregables:**

- Este informe.
- `desmulta-fixes.patch`: 38 archivos, se aplica con `git apply` y cubre todos los hallazgos 🔴 y 🟠 y varios 🟡.

---

## 1. Veredicto

La base es sólida: cifrado AES-GCM de cédulas, reglas de Firestore que niegan todo por defecto, firma de Wompi correcta y en tiempo constante, validación de monto, rate limiting, Turnstile, _magic bytes_, guards de path traversal y Puppeteer sin JS ni red. Los parches de auditorías anteriores están bien hechos.

Los 4 hallazgos críticos (C1–C4) no estaban en la lista de pendientes previa y caen en tres frentes:

1. **Tu sistema de tokens de admin es intercambiable (C1, C2).** El token pre-OTP, el token 2FA y el token de God Mode se firman con el mismo secreto y se verifican sin mirar para qué sirven. Cualquier operador puede convertirse en superadmin, y con solo la contraseña de God Mode se salta el OTP por correo.
2. **La red de seguridad de entrega de PDFs no funciona (C3).** Si el envío falla justo después del pago, el cliente pagó y nunca recibe su documento, y ningún reintento lo rescata.
3. **Hay un secreto HMAC hardcodeado en el código y una API key real en `.env.example` (C4)**, ambos en el historial de Git.

Además hay un bug funcional grave: **el login de admin desde un navegador limpio falla siempre** (pre-login exige un 2FA que todavía no existe).

---

## 2. Tabla de hallazgos

| ID    | Sev.       | Hallazgo                                                                                                                         | En el parche     |
| ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| C1    | 🔴 Crítico | Confusión de tokens JWT admin → escalada operador→superadmin y bypass del OTP                                                    | ✅               |
| C2    | 🔴 Crítico | `POST /api/auth/session` emite `__session` sin OTP ni verificación de rol                                                        | ✅               |
| C3    | 🔴 Crítico | DLQ de PDFs nunca reintenta, la Cloud Function de reintento no está desplegada y el webhook marca idempotencia antes de procesar | ✅               |
| C4    | 🔴 Crítico | Secreto `AGENT_HMAC_SECRET` hardcodeado y `SIMIT_SCRAPER_API_KEY` real en `.env.example`                                         | ✅ (**rotar**)   |
| A1    | 🟠 Alto    | Login admin roto desde un navegador limpio                                                                                       | ✅               |
| A2    | 🟠 Alto    | SSRF en el worker OCR B2B: sigue redirecciones y hay bypass por IPv6-mapped                                                      | ✅               |
| A3    | 🟠 Alto    | Server Actions sin autenticación (`logExportAction`, `verifyOperatorPin`) y PIN operacional solo en la UI                        | ✅               |
| A4    | 🟠 Alto    | Inyección HTML en los mensajes de Telegram de leads nuevos (`ciudad` y `email` no pasan por Zod)                                 | ✅               |
| A5    | 🟠 Alto    | Crons _fail-open_ (`sync-usage`, `simit-scheduler`) y el scheduler envía cédulas descifradas a QStash                            | ✅               |
| M1    | 🟡 Medio   | Idempotencia de `create-order` rota, y peligrosa si se "arregla" a la ligera                                                     | ✅               |
| M2    | 🟡 Medio   | Editor de documentos roto y sus datos nunca llegan al PDF                                                                        | ✅ parcial       |
| M3    | 🟡 Medio   | NIT ficticio `900.000.000-1` impreso en documentos vendidos                                                                      | ✅               |
| M4    | 🟡 Medio   | Límite de subidas evadible con cuentas anónimas de Firebase                                                                      | ✅               |
| M5    | 🟡 Medio   | "Plantilla gratis Modo Dios" accesible a cualquier operador                                                                      | ✅               |
| M6    | 🟡 Medio   | DoS del documento de métricas con valores arbitrarios de `tipoInfraccion`                                                        | ✅               |
| M7    | 🟡 Medio   | Enriquecimiento de leads en Telegram nunca funciona (busca por cédula cifrada)                                                   | ✅               |
| M8    | 🟡 Medio   | "Zero-PII" es parcial: celular, nombre, email y placa se guardan en claro, y Telegram recibe todo                                | ❌ decisión tuya |
| M9    | 🟡 Medio   | CSP con `'unsafe-inline'` y `cdn.jsdelivr.net` en `script-src`                                                                   | ❌               |
| M10   | 🟡 Medio   | Token del bot de Telegram viaja en la URL de destino de QStash                                                                   | ❌               |
| M11   | 🟡 Medio   | Blog: noticias de terceros publicadas como "Equipo Legal Desmulta" y sin reescritura                                             | ❌               |
| M12   | 🟡 Medio   | Confirmación de pago queda en "PENDING" si el usuario vuelve desde otro navegador (PSE/Nequi)                                    | ❌               |
| B1–B9 | 🟢 Bajo    | Código muerto, higiene del repo, oráculos de enumeración, cuota Gemini compartida…                                               | ❌               |

---

## 3. Hallazgos críticos

### C1 — Tokens de admin intercambiables (escalada de privilegios y bypass de 2FA)

**Qué pasa.** Todos estos tokens se firman con el mismo `GOD_MODE_JWT_SECRET`:

- `temp_token` (pre-login, **antes** del OTP)
- `admin-2fa-token` (después del OTP)
- `admin-god-mode-token` (contraseña superadmin)

Además, todos se verifican con `jwtVerify(token, secret)`, sin validar audiencia, propósito ni uid:

- `src/middleware.ts:193` y `:285`
- `src/lib/auth/require-admin-session.ts:85`
- `src/app/admin/audit-actions.ts:191` (`checkGodModeSession`)
- `src/app/api/admin/documentos/generate-generic/route.ts:36`, que para el "Modo Dios" lee directamente `admin-2fa-token`.

**Ataques concretos:**

- **Operador → superadmin.** Cualquier operador con 2FA copia el valor de su cookie `admin-2fa-token` (DevTools → Application; HttpOnly impide leerla con JS, no copiarla a mano) y lo pega como `admin-god-mode-token`. Desde ese momento puede ejecutar:
  - `grantAdminAccessByEmail`
  - `revokeAdminAccess` (puede revocarte **a ti**)
  - `fetchAuditLogs` / `exportAuditLogs`
- **Contraseña God Mode → sin OTP.** `verifyGodMode` no exige sesión. Con solo `SUPERADMIN_AUDIT_PASSWORD`, el token resultante sirve como `admin-2fa-token` y el segundo factor por correo deja de proteger nada. Ojo: en tus tests esa contraseña es `9316`. Si la de producción es corta, 3 intentos por IP cada 30 minutos no bastan contra IPs rotativas.
- El `temp_token` que devuelve pre-login también sirve como 2FA. Hoy eso está enmascarado por el bug A1; si arreglas A1 sin arreglar C1, abres el bypass completo.

**Fix (en el parche):**

- `src/lib/auth/admin-jwt.ts`: `signAdminToken(aud, claims, ttl)` y `verifyAdminToken(token, aud)` exigen `iss`, `aud` (`otp-pending` | `admin-2fa` | `god-mode` | `operator-pin`) y `HS256`. Es compatible con Edge.
- El 2FA ahora queda **ligado al uid** de la sesión Firebase, tanto en el middleware como en `requireAdminSession`.
- God Mode exige una sesión admin 2FA válida y su token lleva el uid; `checkGodModeSession` valida audiencia y uid.
- `getAdminFromCookies()` (nuevo) resuelve la identidad del admin desde las cookies para las Server Actions que no reciben `idToken`.

> ⚠️ Tras desplegar, **todos los admins deben volver a iniciar sesión**: los tokens viejos no traen `aud`.

### C2 — `/api/auth/session` emite la sesión sin OTP

`POST /api/auth/session` (línea 51) crea la cookie `__session` con **cualquier** `idToken` válido, sin OTP y sin revisar rol. Ningún componente lo usa: es legado. Combinado con C1, era la otra mitad del bypass.

**Fix:** el POST ahora devuelve 410. El DELETE (logout) se mantiene y además limpia las cookies de God Mode y del PIN.

### C3 — Clientes que pagan y no reciben el documento

Hay tres defectos encadenados:

1. **La DLQ nunca reintenta nada útil** (`src/app/api/qstash/dlq-pdf-delivery/route.ts:65`). Pide las 30 compras APROBADAS **más antiguas** (`orderBy('paidAt','asc').limit(30)`) y luego filtra en memoria las que no tienen `pdfDeliveredAt`. Después de tu venta #30, la consulta devuelve siempre las mismas 30 compras ya entregadas y ninguna falla nueva se reintenta. Además, `status == ... && paidAt <= ...` con `orderBy` requiere un índice compuesto que **no está** en `firestore.indexes.json`. Si tampoco existe en la consola, la DLQ responde 500 en cada ejecución (**verificar**).
2. **`retryFailedDeliveries` nunca se desplegó.** No está exportada en `functions/src/index.ts`. Aunque lo estuviera, consulta `pdfDeliveredAt == null`, y Firestore **no** encuentra documentos donde el campo no existe (`create-order` nunca lo inicializa).
3. **El webhook de Wompi marca la idempotencia antes de procesar** (`webhook-wompi/route.ts:141`). Crea `processed_callbacks/{txId}` y después actualiza la compra. Si ese update falla (timeout o cuota), el reintento de Wompi se trata como duplicado y la compra queda PENDING para siempre.

**Fix (en el parche):**

- `create-order` inicializa `pdfDeliveredAt: null` y `deliveryRetries: 0`.
- La DLQ filtra `pdfDeliveredAt == null` directamente en la consulta.
- Se agregan 2 índices compuestos para `purchases`.
- `scripts/backfill-pdf-delivered.ts` (`npm run backfill:pdf`) corrige las compras existentes y te lista **las aprobadas que no tienen entrega registrada**. Esas son clientes que quizá nunca recibieron su documento: revísalas a mano.
- Se elimina la Cloud Function duplicada `retryFailedDeliveries`.
- El webhook ahora hace lectura, validación, actualización e idempotencia en **una sola transacción**. Si algo falla, responde 500 y Wompi reintenta. Además:
  - La llave de idempotencia incluye el status, así un VOIDED posterior no se descarta.
  - Un DECLINED tardío no degrada una compra ya APROBADA.
  - Se valida `currency === 'COP'`.
  - Se eliminó la escritura a `banned_ips`, que ningún endpoint consultaba.

**Verificar:** que en Upstash QStash exista el schedule `*/15` hacia `/api/qstash/dlq-pdf-delivery`.

### C4 — Secretos en el repositorio

- `src/app/api/chat/route.ts:84`: el fallback de `AGENT_HMAC_SECRET` es un hex de 64 caracteres escrito en el código. Si la variable falta en Vercel, o si el agente Python usa el mismo default, cualquiera con acceso al repo puede firmar peticiones al agente IA.
- `.env.example:168`: `SIMIT_SCRAPER_API_KEY="RFPEv…"` tiene formato de key real, junto a un comentario que dice "Evasión WAF". El scraper está desactivado por cumplimiento; la key y ese comentario no deberían existir en el repo.

**Fix:** se eliminó el fallback (si no hay configuración, el chat responde con un mensaje de mantenimiento y **no** firma con un valor conocido). `.env.example` queda limpio y documenta `AGENT_AI_URL` y `AGENT_HMAC_SECRET`.

> 🔑 **Rota ambos secretos hoy.** Siguen en el historial de Git: borrarlos del archivo no basta. Rota también `GOD_MODE_JWT_SECRET` (mínimo 32 caracteres; el nuevo helper lo exige).

---

## 4. Hallazgos altos

### A1 — El login de admin falla desde un navegador limpio

`/api/auth/pre-login:68` llama a `requireAdminSession()`, y desde el 2026-08-22 esa función exige la cookie `admin-2fa-token`, que solo se emite **después** del OTP. Mientras tu navegador conserve un token de menos de 8 horas, entras; en incógnito, en otro equipo o al día siguiente, pre-login responde 401. Pasa lo mismo con `sendAdminOtp` y `verifyAdminOtp`.

**Pruébalo antes de aplicar el parche:** abre `/acceso-panel` en incógnito.

**Fix:** nueva función `verifyAdminIdToken()` (idToken + rol, sin 2FA) solo para pre-login y el envío o verificación del OTP. `requireAdminSession()` = `verifyAdminIdToken()` + 2FA con el mismo uid.

### A2 — SSRF en el worker OCR B2B

`src/app/api/qstash/ocr-worker/route.ts:192`: `fetch(webhookUrl)` sigue redirecciones por defecto. Un cliente B2B registra `https://suyo.com/hook`, pasa la validación y su servidor responde `302 → http://127.0.0.1:9001/...` (API de runtime de Lambda) o hacia la red interna.

`ssrf-guard.ts` además compara prefijos de texto, pero el parser de URL serializa `[::ffff:169.254.169.254]` como `[::ffff:a9fe:a9fe]`, que no coincide con ningún prefijo (lo comprobé ejecutándolo). Tampoco cubre `fe80::/10`, `::` ni multicast, y `includes('local')` bloquea dominios legítimos como `localiza.com`.

**Fix:**

- `redirect: 'error'` y timeout de 10 s en el fetch.
- Guard reescrito con `net.BlockList` por subred (IPv4, IPv6 e IPv4-mapped en forma decimal y hexadecimal).
- Coincidencia exacta o por sufijo de hosts, y solo puerto 443.

Riesgo residual documentado en el código: DNS rebinding entre la validación y el fetch.

### A3 — Server Actions sin autenticación

Toda función exportada de un archivo `'use server'` es un endpoint POST público.

- **`logExportAction`** (importada en `TableroFlujoTrabajo`) no validaba sesión y metía `payload.user` **sin escapar** en un mensaje HTML de Telegram. Cualquiera podía mandar alertas falsas con enlaces a tu chat de seguridad y escribir en `audit_logs`.
- **`verifyOperatorPin`** solo devolvía `{success:true}`. El PIN protegía **la UI**, pero `deleteExpiredConsultations` y `deleteSimitCaptures` no lo verificaban en el servidor.
- `logAdminAction` estaba exportada desde un archivo `'use server'` y `sync-operator-roster.ts` tenía `'use server'` sin necesidad.

**Fix:**

- Todas estas acciones exigen `getAdminFromCookies()`.
- El PIN emite una cookie firmada de 5 minutos que las dos acciones destructivas verifican.
- `logAdminAction` se movió a `src/lib/audit/log-admin-action.ts`.
- Se quitó `'use server'` del roster.

### A4 — Inyección en los mensajes de Telegram de leads nuevos

- En `create-consultation`, `ciudad` y `emailContacto` se leen del payload E2E descifrado **sin pasar por Zod**.
- En `functions/src/onConsultationCreated.ts:192-201`, esos campos, junto con `placa`, `contacto` y la salida del OCR, se insertan sin escapar en un mensaje `parse_mode: 'HTML'`.

Resultado: un atacante puede meter `<a href="https://phishing">Ver cédula</a>` en el chat de tus operadores, o simplemente un `<` que hace que Telegram rechace el mensaje, y **el lead nunca te llega**.

**Fix:** validación con Zod (`ciudad` hasta 80 caracteres Unicode, `email` válido hasta 254) y `escapeHtml` en todos los campos del mensaje, incluida la salida del OCR.

### A5 — Crons _fail-open_ y PII hacia QStash

- `cron/sync-usage:22`: `if (cronSecret) {…}` deja el endpoint abierto si falta la variable.
- `cron/simit-scheduler:20`: `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``→ sin la variable, el header literal`Bearer undefined`pasa. Además, **descifra cédulas** y las publica en QStash hacia`/api/qstash/simit-worker`, una ruta que no existe (la carpeta es `\_simit-worker`, que Next no enruta). QStash reintenta con PII en claro.

**Fix:** `sync-usage` pasa a _fail-closed_ y `simit-scheduler` se elimina (el scraper está dado de baja).

---

## 5. Hallazgos medios

**M1 — Idempotencia de `create-order`.** Se consultaba `sha256(cedula-producto)` pero se guardaba `idempotencyKey = wompiReference`, así que la reutilización nunca ocurría. Si se hubiera arreglado solo esa línea, la orden pendiente y **su cookie `dt_`** se habrían entregado a cualquiera que conociera la cédula de la víctima. Cuando la víctima pagara, el atacante descargaría su documento con PII.

- **Fix:** llave `sha256(hashPII(cédula):producto:email)`. Solo se reutiliza la orden si el navegador ya presenta la cookie `dt_` de esa orden.
- Hay un test nuevo que prueba que otro navegador **no** recibe la orden.

**M2 — Editor de documentos.** `documentos/editor/[id]` leía el token desde `?token=` o `sessionStorage`, pero el generador ya no llena ninguno de los dos (`generador/[slug]/page.tsx:205`), así que el editor siempre redirigía al inicio.

- **Fix:** el token se lee de la cookie HttpOnly `dt_<ref>` y `ref` se valida con regex.
- **Pendiente:** `finalDocumentData` (ciudad, autoridad, dirección) se guarda pero **ningún motor PDF/DOCX lo usa**. O lo conectas a `generateMandatePDF`, o eliminas el editor.

**M3 — NIT ficticio.** `documentos/download/route.ts:123` y `:221` imprimen `operatorId: 'NIT 900.000.000-1'` en los documentos que el cliente descarga, mientras que el PDF del correo usa `OPERATOR_LEGAL_ID`.

- **Fix:** ambos usan las mismas variables de entorno. Configura `OPERATOR_LEGAL_NAME` y `OPERATOR_LEGAL_ID` en Vercel.

**M4 — `/api/upload`.** Con un `idToken` válido, el cupo semanal se contaba por UID en vez de por IP. Cada cuenta anónima nueva de Firebase daba 5 subidas más.

- **Fix:** el cupo se cuenta siempre por IP.

**M5 — Plantillas gratis "Modo Dios".** `generate-generic` validaba `admin-2fa-token`, así que cualquier operador generaba gratis documentos que se venden.

- **Fix:** exige `admin-god-mode-token` con audiencia y uid correctos.

**M6 — DoS de métricas.** `infraction_${tipoInfraccion}` crea un campo nuevo por cada valor arbitrario en `system_metrics/global_stats_shard_N`. Con suficientes valores distintos, el documento llega a 1 MB y **1 de cada 10 consultas falla** (el shard se elige al azar).

- **Fix:** formato y longitud acotados.
- **Recomendado:** convertir `tipoInfraccion`, `antiguedad` y `estadoCoactivo` a `z.enum` con las opciones reales.

**M7 — Enriquecimiento de leads.** `onConsultationCreated.ts:211` busca `leads.where('cedula','==', data.cedula)`, pero `data.cedula` está cifrada con IV aleatorio y `leads` guarda `cedulaHash`, así que nunca encuentra nada. Tus operadores nunca vieron el "Historial SIMIT" en Telegram.

- **Fix:** la búsqueda usa `cedulaHash`.

**M8 — "Zero-PII" es parcial (sin parche: es decisión de negocio).** Solo la cédula va cifrada. `contacto` (celular), `nombre`, `emailContacto` y `placa` se guardan en claro en `consultations`, y el mensaje de Telegram lleva nombre, celular, email y placa. Esto importa por dos razones:

- Lo que presentas a inversionistas como "Zero-PII / aislamiento total" no coincide con el código.
- Telegram procesa esos datos en servidores fuera de Colombia. Tu política de privacidad debería declararlo (transferencia internacional, Ley 1581 de 2012). Consúltalo con un abogado; no soy abogado.

**Opción técnica:** cifrar `contacto` y `emailContacto` con `encryptSymmetric` (ya tienes `contactoHash` para las búsquedas) y mandar a Telegram solo el shortId y un botón "Ver datos" que abra el panel.

**M9 — CSP.** `script-src` incluye `'unsafe-inline'` **y** `https://cdn.jsdelivr.net` (sirve cualquier paquete npm, lo que es un bypass directo de CSP). En la práctica, la CSP no frena un XSS; `MEMORY.md` dice "100% blindadas".

- **Quick win:** quita `cdn.jsdelivr.net` de `script-src` y `worker-src` (ya no usas Tesseract en el cliente) y `api.telegram.org` de `connect-src` (ningún componente cliente lo usa).

**M10 — Token del bot en QStash.** `security-logger.ts:155` publica en QStash con destino `https://api.telegram.org/bot${TOKEN}/sendMessage`. El token de tu bot queda en los logs y en el dashboard de Upstash, y cada `logger.error` consume cuota de QStash, la misma que usa el OCR B2B.

- **Fix sugerido:** encola hacia un endpoint propio firmado (`/api/internal/telegram-relay` con `verifySignatureAppRouter`) que llame a Telegram con el token desde el servidor.

**M11 — Blog.** `blog-sync.yml` no pasa `GEMINI_API_KEY`, así que el script usa "el contenido crudo". Los posts se publican con `author: "Equipo Legal Desmulta"` y títulos como "… - Diario Occidente". Tienes riesgo de derechos de autor (Ley 23 de 1982) y de contenido duplicado para SEO, y noticias efímeras de pico y placa que envejecen mal.

- **Qué hacer:** marcarlos como `draft`, pasar la key al workflow o dejar de importar, y usar un autor honesto ("Resumen de <medio>") con enlace canónico.

**M12 — Confirmación de pago.** Si el pago vuelve en otro navegador (app del banco o Nequi), no hay cookie `dt_`, `/api/payments/status` responde 401 y la página hace polling 5 minutos hasta mostrar "PENDING", aunque el cliente ya pagó.

- **Fix sugerido:** con un 401, mostrar "Tu pago se procesó; revisa tu correo, allí llega el documento".

---

## 6. Hallazgos bajos e higiene

- **B1 — Código muerto con superficie de ataque:**
  - `authorize-download` y el flujo `pdf_tokens`: consulta `documentos_generados`, una colección que nadie escribe, y el email no incluye el enlace.
  - `actions/legal-auth.ts`, `actions/telegram-bridge.ts` y `SignatureInterceptor`: no se montan. Además, el OTP de "firma" no liga el email a la cédula y el `documentId` exige 10 o más dígitos, lo que excluye cédulas de 6 a 8 dígitos.
  - `TrackingVerificationModal` y `getConsultationActivity`: no se montan, pero devuelven deudas y casos **de cualquier cédula**. Bórralos antes de que alguien los vuelva a conectar.
  - `vip/auth/verify`: lee `vip_otp:*` de Redis, que nadie escribe.
  - `_simit-worker` y `_escudo-simit`.
- **B2 —** `_portal_session` se emite en `estado/actions.ts` pero **nunca se valida**; `/seguir/[id]` funciona solo con la URL. El comentario sobre "el guard del middleware" es falso. O eliminas la cookie o implementas la validación.
- **B3 —** VIP login: el mensaje "No se encontraron expedientes con esa combinación" confirma si una cédula + celular es cliente tuyo. Usa un mensaje genérico y, mejor aún, un OTP por correo (ya tienes Resend).
- **B4 —** La cuota `gemini:daily:{fecha}` se comparte entre B2C (`/api/ocr`, límite 1000) y B2B (worker, límite 5000): el tráfico B2B agota la cuota pública. Usa llaves separadas.
- **B5 —** Crons sin scheduler en el repo: `finops`, `sync-usage`, `sync-usura` y `keepalive` (solo `followup-cron` está en `vercel.json`). **Verificar** en QStash; sin `sync-usage`, el uso B2B nunca se persiste en Firestore.
- **B6 —** Raíz del repo:
  - `video_test.mp4` (64 MB, no está en `.gitignore`).
  - 10 scripts sueltos.
  - `ansv.html`, `app-fd.js` y `root.js` copiados de un sitio de terceros (con su tag de GA `G-4BLXXPHJG8`).
  - `scripts/reset-godmode.mjs` con tu IP pública.

  Mueve todo a `scripts/sandbox/` (ya está en `.gitignore`) o bórralo.

- **B7 —** La verificación de admin está duplicada en 8 archivos (misma config de `getTokens`), y unos exigen `ADMIN_EMAILS` y otros no. Unifícala en un helper (`getAdminFromCookies` es un buen punto de partida).
- **B8 —** Los rate limits _fail-open_ incluyen `ocr`: si Upstash cae, el OCR con Gemini queda sin límite. Ese bucket debería ser _fail-closed_.
- **B9 —** Los PIN de debug (`NEXT_PUBLIC_DEBUG_PIN` y el hash SHA-256 del PIN) están en el bundle cliente y se sacan por fuerza bruta al instante. Solo es aceptable si ese panel no expone nada.

---

## 7. Estado de los 5 pendientes de la auditoría anterior

| Pendiente                              | Estado real                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| IDOR en `/api/documentos/download`     | ✅ Corregido: exige `downloadToken` en cookie con comparación en tiempo constante                 |
| SSRF por `webhookUrl` en el worker OCR | ⚠️ Mitigado a medias: el guard existe pero era evadible (A2). Cerrado en el parche                |
| `createWorker('spa')` / Tesseract      | ✅ Resuelto: Tesseract salió del server y el fallback es el servicio Python                       |
| MDX del RSS compilado en el servidor   | ✅ Técnicamente mitigado (`next-mdx-remote` v6 bloquea JS). ⚠️ Queda el riesgo de contenido (M11) |
| Crons _fail-open_                      | ❌ Seguía en 2 rutas (A5). Cerrado en el parche                                                   |

---

## 8. Cómo aplicar el parche

```powershell
cd C:\Workspace\Ecosistema_Desmulta\Desmulta
git checkout -b fix/auditoria-2026-09-22
git apply --check desmulta-fixes.patch   # debe salir sin errores
git apply desmulta-fixes.patch
npm run typecheck
npx vitest run                          # esperado: 328 passed
git add -A
git commit -m "seguridad: tokens admin con audiencia, DLQ de PDFs, SSRF, secretos y validaciones"
```

**Orden de despliegue:**

1. **Rota los secretos** en Vercel y en `desmulta-ai-agent`: `AGENT_HMAC_SECRET`, `GOD_MODE_JWT_SECRET` (mínimo 32 caracteres) y `SUPERADMIN_AUDIT_PASSWORD` si es corta. Revoca `SIMIT_SCRAPER_API_KEY`.
2. Configura en Vercel `AGENT_AI_URL`, `OPERATOR_LEGAL_NAME` y `OPERATOR_LEGAL_ID`, y confirma que `CRON_SECRET` exista.
3. `firebase deploy --only firestore:indexes` y espera a que los 2 índices nuevos terminen de construirse.
4. `npm run backfill:pdf -- --dry-run` (solo cuenta) y luego `npm run backfill:pdf` → **revisa la lista de "APROBADAS sin entrega"**.
5. Despliega en Vercel (el merge a `main` dispara `cd.yml`).
6. `firebase deploy --only functions` (por `onConsultationCreated`). Si alguna vez desplegaste `retryFailedDeliveries`, acepta eliminarla.
7. En Upstash, confirma el schedule de la DLQ cada 15 minutos.
8. Todos los admins vuelven a iniciar sesión. Prueba en incógnito el login, God Mode, el PIN, un pago sandbox de Wompi y un lead de prueba en Telegram.

---

## 9. Qué está bien hecho

- Firma de Wompi con `properties` dinámicas y `timingSafeEqual`, más validación de monto contra el precio del servidor.
- Reglas de Firestore que niegan todo por defecto, con reglas explícitas por colección.
- AES-256-GCM con IV aleatorio, PBKDF2 de 600k iteraciones y HMAC para las búsquedas por hash.
- Webhook de Telegram con secreto en tiempo constante y allowlist de `chat_id`.
- Puppeteer con JS deshabilitado, red bloqueada y HTML sanitizado.
- Zod en casi todas las entradas, _magic bytes_ en uploads y guards de path traversal en el blog.
- Suite de tests amplia (326) que corre rápido: se pudo usar para validar el parche.
