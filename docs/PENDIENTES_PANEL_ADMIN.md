# Pendientes: panel de administración (próxima sesión)

> **Estado:** acordado con el propietario el 2026-09-24, **sin empezar**. Al volver a Desmulta, se arranca por aquí, en este orden.
> Contexto: se revisó el panel contra el estándar de la industria. El panel de operación (clientes, casos, estadísticas, auditoría, usuarios, contenido) ya cumple. Las claves, copias de seguridad y servidores **no** van en el panel: se manejan desde las consolas de Google, Vercel y GitHub, con verificación en dos pasos. Faltan tres funciones de operación.

## 1. Borrar los datos de una persona cuando lo pida (PRIORIDAD: obligación legal)

**Por qué:** la Ley 1581 de 2012 (art. 8 lit. e y art. 15) da derecho a pedir la supresión de los datos; el reclamo debe resolverse en máximo 15 días hábiles. Hoy el panel solo borra en bloque las consultas vencidas (`deleteExpiredConsultations`) y las capturas SIMIT (`deleteSimitCaptures`). No puede borrar a una persona concreta: habría que hacerlo por terminal, como la limpieza del 2026-09-24.

**Qué construir:**

- Acción en el panel "Borrar datos de un titular": buscar por cédula o celular usando las huellas `cedulaHash` / `contactoHash` (HMAC; no se busca en texto plano).
- Mostrar lo encontrado antes de borrar y pedir confirmación escrita. Exigir sesión 2FA + PIN de operador o God Mode.
- Borrar en cascada:
  - `consultations` y su subcolección `private`, `consultas_index`, `public_tracking`;
  - `cases`, `leads`, `simit_leads`, `simit_subscriptions`, `pdf_tokens`;
  - las fotos en Vercel Blob (`evidenceUrl`, reutilizar `/api/internal/purge-blob`).
- **`purchases` NO se borra, se anonimiza:** los registros contables deben conservarse (Código de Comercio art. 60; Ley 962 de 2005 art. 28: 10 años). Se quita nombre, contacto y cédula y se deja monto, fecha y referencia de Wompi.
- Registrar la supresión en `audit_logs` (quién, cuándo, cuántos documentos; sin los datos borrados).
- Limitación conocida: los mensajes ya enviados a Telegram no se pueden borrar desde el sistema. Documentarlo en la política de privacidad.

**Archivos de partida:** `src/app/admin/actions.ts`, `src/app/admin/audit-actions.ts`, `src/app/api/create-consultation/route.ts` (cómo se guardan los datos y los hashes), `src/app/api/internal/purge-blob/route.ts`, `src/app/privacidad/page.tsx`.

**Pruebas:** integración con el emulador de Firestore (borra todo lo de la persona y nada de otras; anonimiza `purchases`; deja rastro en auditoría; rechaza sin 2FA/PIN).

## 2. Cambiar precios desde el panel

**Por qué:** hoy los precios están escritos en el código (`src/lib/payments/product-prices.ts`, `PRODUCT_PRICES` en centavos). Cambiar $19.500 exige programar y publicar. Lo estándar es editarlos desde el panel.

**Qué construir:**

- Guardar los precios en Firestore (`site_config/prices`), usando los del código como respaldo si el documento no existe o falla.
- Pestaña en el panel con validación (zod; mínimo y máximo razonables; solo productos conocidos) y registro en `audit_logs` de cada cambio (antes → después).
- **Cuidado con la integridad de pagos:** el precio lo decide siempre el servidor. `src/app/api/payments/create-order/route.ts` y el webhook de Wompi deben leer la misma fuente; nunca aceptar un precio enviado por el navegador.
- Consumidores actuales de `PRODUCT_PRICES`: `create-order/route.ts`, `api/payments/prices/route.ts`, `components/sections/Hero.tsx`.

**Pruebas:** unitarias de validación, integración (precio cambiado → la orden usa el nuevo; documento ausente → respaldo del código) y que el webhook rechace montos que no coinciden.

## 3. Controlar el blog desde el panel

**Por qué:** las noticias se importan y publican solas cada lunes desde el PC (`scripts/blog-sync-publish.ps1`, tarea de Windows "Desmulta - Noticias del blog"). Si una sale mal, no se puede ocultar con un clic: hay que editar el archivo MDX y publicar. Lo estándar es aprobar u ocultar artículos desde el panel.

**Qué construir (propuesta):**

- Colección `blog_overrides/{slug}` con `{ hidden: true }`, que se lee al generar el listado, la página del artículo y el `sitemap`.
- Revalidación bajo demanda (`revalidatePath`) al ocultar o mostrar, para que el cambio se vea en minutos. Hoy `src/app/blog/[slug]/page.tsx` revalida cada 24 h.
- Lista de artículos en el panel con "Ocultar / Mostrar" y enlace para verlos.
- Opcional: modo "revisar antes de publicar" (los artículos nuevos entran con `draft: true` y se aprueban desde el panel). Ya existe el campo `draft` en `src/lib/mdx.ts`.

**Archivos de partida:** `src/lib/mdx.ts`, `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, `src/app/sitemap.ts`, `scripts/sync-blog-rss.ts`.

**Pruebas:** un artículo oculto no aparece en el listado ni en el sitemap y su página responde 404; al mostrarlo vuelve a aparecer.

## 4. Segundo factor del panel con app autenticadora (TOTP)

**Por qué:** hoy el segundo factor del admin de Desmulta es un código por correo (`src/app/admin/otp-actions.ts`, como Wompi). Sirve, pero según NIST 800-63B el correo no es un autenticador fuerte: quien entre al correo tiene ambos factores. La app autenticadora (TOTP, RFC 6238) es el estándar de GitHub, Vercel y los bancos; es gratis y no depende de que llegue un correo.

**Qué construir** (ya está hecho y probado en Origgo, reutilizar):

- TOTP sin dependencias: `../hunter-portal-showcase/lib/admin/totp.js` (vectores oficiales del RFC 6238 en `tests/admin_2fa.test.js`).
- Enrolamiento local con QR y 8 códigos de respaldo de un solo uso: `scripts/admin-2fa-enrolar.js`.
- Un solo uso por código (creación atómica en Firestore), máx. 5 intentos cada 15 min, auditoría de ingresos y rechazos.
- Mantener el código por correo como **respaldo** opcional, o reemplazarlo; decidirlo con el propietario.
- Encaja con el flujo actual de audiencias JWT (`otp-pending` → `admin-2fa` en `src/lib/auth/admin-jwt.ts`).

## 5. Animación de la verificación del código (OTP) — ✅ HECHA (2026-09-25)

**Hecho:** `src/components/admin/CasillasOtp.tsx` (+ `.module.css`), usado en `src/app/acceso-panel/page.tsx`. Ver la entrada del 2026-09-25 en `MEMORY.md`. Si se cambia a TOTP (tarea 4), el mismo componente sirve sin cambios.

**Por qué:** el propietario compartió una referencia visual (video en `C:\Users\Sthan\Escritorio\para antigravity`, componente "OTP Verification"): casillas con brillo en la activa, dígitos que entran animados y, al completar, los dígitos se juntan en el centro con un destello, la tarjeta cambia de color y aparece un check dentro de un anillo luminoso con botón "Continuar". Se hará primero en Origgo y luego aquí, con los colores de Desmulta.

**Cómo:** solo CSS y JavaScript (sin librerías, sin costo), respetando `prefers-reduced-motion`; incluir sacudida en código incorrecto. Reutilizar el componente de Origgo (`../hunter-portal-showcase/src/admin/`).

## Cómo trabajar estas tareas (reglas del propietario)

- Revisar la RAM y la CPU libres antes de pruebas pesadas. Correr E2E con `--workers=1` y de a un archivo.
- Validación proporcional, documentación sincronizada (MEMORY.md, `docs/`), commits en español con prefijos oficiales, directo a `main`.

## Otros pendientes pequeños (fuera de estas tres tareas)

- Quitar el "+" del contador de casos (debe decir `205`) desde el panel: vitrina de casos (`site_config/showcase.counterValue`).
- Prueba final en producción: una consulta real desde el celular, para confirmar que llega a Telegram como caso 1.
