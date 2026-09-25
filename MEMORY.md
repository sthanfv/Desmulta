# 🧠 Memoria Central - Desmulta

> ⚠️ **DIRECTIVA ESTRICTA DE MANTENIMIENTO (PARA IAs Y DESARROLLADORES)** ⚠️
>
> 1. **Fechas Obligatorias:** Cada vez que leas, actualices o modifiques este archivo, DEBES fechar la entrada (Ej. `[2026-08-17] Auditoría...`). El archivo debe reflejar la cronología real para evitar la degradación de la documentación.
> 2. **Escepticismo Activo (No confíes ciegamente):** Este archivo es una bitácora, pero la realidad reside en el código y en la infraestructura. Antes de dar por hecho el "Estado Actual", DEBES verificar si las variables de entorno, contenedores o servicios siguen existiendo realmente. Mantenlo conciso, eliminando historial irrelevante.
> 3. **Validación proporcional y Husky:** El hook pre-commit ya corre eslint, prettier, `vitest related` y `tsc` sobre lo que cambió. Cambios pequeños → basta con el hook (o `--no-verify` si es solo documentación). Cambios medianos → además `npm run build` o el spec E2E afectado. Cambios grandes o de riesgo (pagos, auth, seguridad, dependencias) → `npm run validate` completo, por pasos. La máquina de desarrollo es modesta: nunca correr todo en paralelo.
> 4. **Reglas de trabajo:** ver `CLAUDE.md` en la raíz (lo leen automáticamente los agentes de IA). Esta bitácora se actualiza en el mismo commit que el código.

## 🏗️ Estado Actual de Implementación (Actualizado: 2026-09-24)

### Módulos Principales

1. **Frontend (Next.js 15.5 / React 19)**:
   - **Modo app en teléfono (< 768 px):** barra de pestañas (Inicio · Mi caso · Consultar · Asistente · Más), barra superior con flecha atrás, paneles nativos (vaul) y chat en pantalla completa. Escritorio sin cambios. Ver `docs/MOBILE_APP_SHELL.md`.
   - **Tablero Kanban (`vial-clear`)**: Modo compacto activado. Progressive Disclosure para reducir estrés cognitivo.
   - **Dashboard Analytics**: Round-Robin de asignación de operadores integrado.
   - **Calculadora Pública**: Protegida por Cloudflare Turnstile, Honeypots y cifrado E2E.
   - **Seguridad UI**: Light Mode automático (OS-Level), Open Graph dinámico para expedientes.
2. **Backend & Seguridad**:
   - **Zero-PII Storage**: AES-256-GCM y HMAC-SHA256 para aislamiento total de datos de clientes.
   - **Tokens de admin con audiencia** (`src/lib/auth/admin-jwt.ts`): `otp-pending`, `admin-2fa`, `god-mode`, `operator-pin`; el 2FA queda ligado al uid de la sesión.
   - **Rate Limiting**: Upstash Redis. Chat: 8 msg/min + 60 msg/día por IP (fail-closed). OCR: 3 cada 7 días.
   - **Middlewares**: Geobloqueo estricto (Solo tráfico desde Colombia - `x-vercel-ip-country`). Defensa Zero-Trust con JWTs de Firebase y OTPs.
   - **Alertas de caída** (`src/lib/monitoring/service-alert.ts`): chat y OCR → Telegram en HTML, 1 alerta por servicio cada 10 min.
   - **Salud y recuperación:** `GET /api/health` (monitor externo, exenta del geobloqueo), copia diaria de Firestore con 7 días de retención y runbook en `docs/GUIA_INCIDENTES.md`.
3. **Integraciones B2B y Microservicios** (repos en `C:\Workspace\Ecosistema_Desmulta\`):
   - **Agente IA (`desmulta-ai-agent`, FastAPI en Cloud Run):** Gemini `gemini-flash-lite-latest` con respaldo `gemini-flash-latest`; despliegue automático desde GitHub (Cloud Build). Ver `docs/CHAT_ARCHITECTURE.md`.
   - **Motor Financiero (Go)**: Integrado vía HMAC-SHA256 (`desmulta-calculadora-go`). Serverless.
   - **Lector OCR (Python)**: Respaldo del OCR de Gemini. Usa QStash para mensajería asíncrona.
   - **Pasarela de Pagos (Wompi)**: Credenciales de producción activas. Webhook transaccional e idempotente.

---

## 📜 Historial Reciente (Últimos Cambios Clave)

### [2026-09-24] - Operación (salud, copias, runbook) y revisión visual completa de la portada

**Por qué:** el propietario preguntó si al sistema le falta algo según el estándar de la industria y encontró texto apretado en la sección final de la portada. Se pidió aplicar todo, probarlo y documentarlo.

- **Copias de seguridad:** no existía ninguna. Se activó la copia diaria de Firestore `(default)` con retención de 7 días (`gcloud firestore backups schedules create`). Cuesta centavos al mes. Restauración en `docs/GUIA_INCIDENTES.md`.
- **Salud:** nueva ruta pública `GET /api/health` (`src/app/api/health/route.ts` + `src/lib/monitoring/health.ts`): 200/503 según Firestore, sin detalles internos, resultado guardado 30 s, espera hasta 8 s (el primer acceso en frío tardó >3 s en local y daba 503 falso). Exenta del geobloqueo en `src/middleware.ts` porque los monitores revisan desde fuera de Colombia.
- **Runbook:** `docs/GUIA_INCIDENTES.md` (qué vigila el sistema, cómo configurar UptimeRobot gratis, síntomas → qué hacer, restauración de copias). Enlazado en README, ARCHITECTURE y CLAUDE.md.
- **Auditoría visual** (Playwright en PC 1366×768 y móvil 390×844 sobre 14 páginas + revisión de capturas):
  - Sección final (`CTA.tsx`): el subtítulo estaba dentro del h2 y heredaba `tracking-tighter` → palabras pegadas. Ahora es un párrafo. El botón SIMIT pasa a secundario (contorno) y sin animación de escritura (`TextType` eliminado, ya no se usaba).
  - **Ventana de bienvenida eliminada** (`WelcomeModal.tsx`): tapaba la página a cada visitante nuevo, en pantallas de 768 px de alto se cortaba sin mostrar el botón, y su botón "Iniciar mi diagnóstico" solo la cerraba. Google penaliza en móvil las ventanas que tapan el contenido al llegar.
  - **Tarjetas invisibles en modo claro** (`TarjetaPremium.tsx`): fondo blanco translúcido sobre blanco y una sombra interior que anulaba la de `.card-elevated`. Ahora tienen fondo y borde visibles en claro; en móvil el carrusel de "Por qué elegirnos" ya no parece texto cortado.
  - **Botones flotantes:** había tres (asistente abajo a la izquierda, WhatsApp verde de 80 px con animación permanente y "volver arriba"). Queda un solo lanzador abajo a la derecha, "¿Necesita ayuda? — Asistente y WhatsApp", con WhatsApp destacado en la cabecera del chat; "volver arriba" es pequeño y aparece tras 1 000 px.
  - **Textos falsos corregidos:** "su información nunca viaja a servidores externos" (`Pillars.tsx`) y "tus datos están encriptados y jamás serán compartidos" (`Methodology.tsx`). La portada decía "205+ casos exitosos este mes" y más abajo la misma cifra como total: ahora dice "en toda Colombia".
  - Pie de página: el correo se cortaba en 1366 px; ahora se parte en dos líneas. "Email corporativo" pasa a "Correo de contacto".
  - **Blog:** los resúmenes traían el resaltado de Google Noticias (`**multas**`, "..."). Nuevo `src/lib/text/excerpt.ts` (`buildExcerpt`): el importador genera el resumen desde el texto del artículo, y se corrigieron 37 artículos. Fecha y enlace de las tarjetas con más contraste en modo claro.
- **Pruebas nuevas:** `health-check.test.ts`, `excerpt.test.ts` (incluye que ningún artículo tenga Markdown en el resumen) y un caso de geobloqueo para `/api/health`.

### [2026-09-24] - Blog: publicación semanal desde el PC (sin GitHub Actions)

- Con la cuenta de GitHub bloqueada por facturación, la importación de noticias corre en el PC del propietario con el **Programador de tareas de Windows** (tarea "Desmulta - Noticias del blog", lunes 19:30; si el PC está apagado, corre al encenderlo).
- `scripts/blog-sync-publish.ps1` (`npm run blog:publish`): actualiza `main`, corre `blog:sync`, valida con `scripts/validate-blog-mdx.mjs` (`npm run blog:validate`) y, si todo compila, hace commit y push (Vercel despliega). Si un artículo no compila, descarta los cambios. Registro en `logs/blog-sync.log` (ignorado por Git).
- Recolección manual de hoy: 2 artículos nuevos (44/44 válidos).

### [2026-09-24] - Firebase al día, causa del bloqueo de GitHub Actions y revisión legal (Ley 1480 / 1581)

- **GitHub Actions:** la API pública de runs muestra la causa real: _"The job was not started because your account is locked due to a billing issue."_ La cuenta de GitHub está bloqueada por facturación; ningún workflow (CI, blog, Lighthouse) puede correr hasta resolverlo en github.com/settings/billing.
- **Firestore:** se desplegaron los índices de `purchases` (DLQ de PDF e idempotencia). `firestore.indexes.json` se reemplazó por la exportación de producción (15 índices, 6 field overrides, 5 TTL: `audit_logs.expireAt`, `consultationCooldowns.lastAttemptAt`, `otp_rate_limits.windowStart`, `processed_callbacks.processedAt`, `validar_consulta_rl.windowStart`); antes el archivo no reflejaba producción y un deploy con `--force` habría borrado los TTL.
- **Backfill** `npm run backfill:pdf`: 2 compras actualizadas, 0 aprobadas sin entrega; segunda corrida 0 cambios (idempotente).
- **Términos:** se reemplazaron cláusulas abusivas según la Ley 1480 de 2011: arbitraje obligatorio (Art. 43 num. 12) y renuncia a acciones colectivas (Ley 472 de 1998); el desistimiento ahora reconoce el derecho de retracto de 5 días hábiles (Art. 47) y conserva el 30% solo fuera del retracto; nueva sección de ley aplicable, interpretación favorable (Art. 34), reversión del pago (Art. 51) y canal de reclamación (15 días hábiles, SIC).
- **Privacidad:** nueva sección 8 (Decreto 1377 de 2013): responsable del tratamiento, encargados y transmisión internacional de datos (Google, Vercel, Upstash, Resend, Telegram, analítica; Arts. 25-26 Ley 1581) y vigencia.
- **CLAUDE.md** reescrito con el protocolo MANDATO-FILTRO del propietario (arranque, prefijos de commit, validación, reporte en 6 secciones).
- **Pendiente:** razón social, NIT y dirección del responsable (Art. 50 Ley 1480 / Decreto 1377) — solo el propietario los tiene; revisión gratuita sugerida en un consultorio jurídico universitario.

### [2026-09-24] - Recolección de noticias manual (`npm run blog:sync`)

- 7 artículos nuevos reescritos con Gemini (`gemini-flash-lite-latest`), 250-320 palabras, validados con el compilador MDX (7/7). Notificación de Telegram enviada.
- La poda automática (máx. 30 importados) eliminó 3 antiguos, entre ellos "Tatequieto": sus dos slugs redirigen ahora a `/blog`.
- Secreto `GEMINI_API_KEY` creado en GitHub por el propietario; falta resolver por qué GitHub Actions se corta a los 2 s para que la recolección vuelva a ser automática (diaria, 06:00 UTC).
- Mejora posible: los `excerpt` arrastran texto basura de Google Alerts ("Descargue la App…").

### [2026-09-24] - Privacidad y Términos: correcciones de exactitud

- **Privacidad (`src/app/privacidad/page.tsx`):** decía que el OCR se procesaba "100% en su dispositivo" y que las imágenes no se enviaban a IA externa — **falso** (`/api/ocr` usa Gemini y Lector-OCR). También afirmaba consultas automatizadas (bots/scraping) al SIMIT/RUNT, desactivadas por cumplimiento. Se corrigió y se agregaron: Microsoft Clarity y Cloudflare Turnstile en rastreadores, asistente virtual (mensajes a Gemini, conversación solo en el navegador, analítica sin texto), derechos del titular (Art. 8 Ley 1581) con canal y plazos (Arts. 14-15), conservación y seguridad, y fecha de actualización.
- **Términos (`src/app/terminos/page.tsx`):** nueva cláusula 1.6 (herramientas automáticas y asistente: orientativos, no son asesoría jurídica) y fecha de actualización.
- **Pendiente legal (decisión del propietario):** que un abogado revise ambos textos; en particular la cláusula 5.1 "Renuncia a demandas colectivas" (Ley 472 de 1998 / Ley 1480 de 2011) y el derecho de retracto en ventas en línea (Art. 47 Ley 1480).

### [2026-09-24] - Visor de casos de éxito (`src/components/sections/SuccessCases.tsx`)

- Fotos optimizadas por Next.js (antes `unoptimized`: se descargaba el original completo en cada teléfono) con `sizes` y aparición suave al cargar.
- Deslizar entre casos: la tarjeta sigue al dedo, se bloquea el eje (vertical = scroll) y la animación se orienta según la dirección. **Bug corregido:** arrastrar la manija antes/después más de 50 px saltaba al caso siguiente.
- Precarga invisible de los casos vecinos (misma `sizes`) para que no parpadee al deslizar.
- Visor a pantalla completa: el gesto/botón "atrás" lo cierra (entrada propia en el historial), Escape lo cierra, bloquea el scroll del fondo, contador "Caso X de N", flechas para pasar de caso (ocultas con zoom) y botones con nombre accesible.
- Tests nuevos: `src/tests/success-cases-viewer.test.tsx`.

### [2026-09-24] - Blog: títulos rotos y sincronización detenida; Referidos solo para clientes

- **Títulos con "39":** el importador (`scripts/sync-blog-rss.ts`) solo decodificaba 5 entidades HTML; `&#39;` (apóstrofo) quedaba crudo en el título y como "39" en el slug. Nuevo `src/lib/text/html-entities.ts` (entidades numéricas y nombradas, doble escapado). Los 2 artículos afectados se renombraron a slugs limpios con redirección 301 en `next.config.ts`.
- **Blog detenido desde el 22/08:** (1) el workflow `blog-sync.yml` no llegaba a correr (GitHub Actions cortado a los 2 s); (2) no pasaba `GEMINI_API_KEY` al script, así que nunca reescribía con IA; (3) abría un Pull Request que nadie aprobaba; (4) el script usaba el modelo retirado `gemini-2.5-flash`. Ahora: modelo `GEMINI_BLOG_MODEL` (por defecto `gemini-flash-lite-latest`), clave por header y publicación directa en `main`. **Requiere el secreto `GEMINI_API_KEY` en GitHub.**
- **Referidos:** la regla "solo clientes" seguía en el servidor (`src/app/referidos/actions.ts`: el referidor debe tener una consulta ya revisada), pero el enlace se había puesto por error en el menú "Más" del modo app, visible para todos. Se quitó: se entra solo desde el banner del seguimiento de caso (`/seguir/[id]`). Además, un cliente que escribía su número con +57 era rechazado (12 dígitos vs. 10 guardados); se normaliza.

### [2026-09-22 a 2026-09-24] - Auditoría de seguridad, chat con IA real y modo app en teléfono

- **Auditoría de seguridad (commit `6c28bd6`):** tokens de admin con audiencia (antes cualquier JWT del mismo secreto abría God Mode o saltaba el OTP), 2FA ligado al uid, `POST /api/auth/session` desactivado, webhook de Wompi transaccional (ya no quedan pagos "pendientes para siempre"), DLQ de PDF filtrando `pdfDeliveredAt == null` (+ índice y `npm run backfill:pdf`), SSRF guard con `net.BlockList`, escape HTML en Telegram, eliminación de secretos hardcodeados (HMAC del agente y API key del scraper SIMIT). Informe: `docs/auditoria-2026-09-22/`.
- **Chat (commits `1d95f2c`, agente `e4507c9`→`a2abdd0`):** diagnóstico: el chat NUNCA usó IA en producción (clave de Gemini inválida + modelo `gemini-2.5-flash` retirado + créditos agotados) y respondía 4 párrafos fijos por palabra clave, sin dejar rastro en logs. Ahora: charla corta humana (hola/gracias/chao sin leyes), prompt con personalidad y honestidad (no inventa servicios ni promete resultados), botón sugerido según la pregunta, memoria de 10 mensajes con presupuesto de bytes (antes el agente rechazaba > 4 KB), respaldo con WhatsApp si el agente falla, fallos de Gemini registrados. Secreto HMAC rotado en Vercel y Cloud Run (el filtrado responde 401).
- **OCR (commit `c14a7e9`):** el modelo estaba escrito a mano y retirado; ahora `GEMINI_OCR_MODEL` (por defecto `gemini-flash-lite-latest`), verificado con una imagen real.
- **Dependencias:** `next` 15.5.26 (vulnerabilidad crítica), `sharp` 0.35.4, `postcss`/`serialize-javascript` parcheados vía `overrides`.
- **GitHub Actions:** CI ahora corre en `main` (antes ignoraba `main`); CD solo despliega Firebase (Vercel ya despliega la web); Lighthouse semanal contra producción.
- **Modo app en teléfono (commits `1f621e7`, `d7a0fc1`, `433d172`, `c2f895e`):** fase 1 carcasa + pestañas + paneles + chat a pantalla completa; fase 2 Inicio con accesos rápidos y pilares en carrusel; fase 3 barra con flecha atrás en páginas internas y transición de pantalla; la marca de la barra se recoge al bajar como en escritorio. Sin ocultar contenido (SEO mobile-first intacto).
- **Tests:** E2E reparados (smoke buscaba un botón que cambió de texto; God Mode sin bypass E2E tras la auditoría; Escudo SIMIT omitido porque la página está desactivada). Integración 590/590.

### [2026-08-22] - Auditoría Estricta DevSecOps y Hotfixes Financieros

> Nota [2026-09-24]: esta entrada llegó con las comillas invertidas perdidas; se reparó. Los valores de precios que se perdieron no se reconstruyeron: la fuente de verdad es `PRODUCT_PRICES` en `src/lib/payments/product-prices.ts`.

- **Vulnerabilidad DoS en Middleware**: Se corrigió el `path` de la cookie OTP (`admin-2fa-token`) en el generador de auth para prevenir que el Middleware bloqueara a los administradores en `/api/admin/`.
- **Privilege Escalation en Server Actions**: Se inyectó validación nativa 2FA (con `jwtVerify`) dentro de `requireAdminSession.ts` para evitar invocaciones maliciosas de Server Actions desde rutas públicas. (Reforzado el 2026-09-22 con tokens con audiencia.)
- **SSRF / LFI en Motor PDF**: Se mitigó la inyección de código con los filtros `escapeHtml` y `escapeCssString` dentro de `src/lib/pdf/template.ts`.
- **Logic Flaw Crítico en Pasarela Wompi**: Se arregló un bug financiero donde Wompi comparaba montos de validación con división de `/ 100`, lo que denegaba erróneamente todas las compras válidas como `FLAGGED_AMOUNT_MISMATCH`.
- **Revisión General de Precios (50% de Descuento)**:
  - Catálogo nativo (`PRODUCT_PRICES`) rebajado un 50% en centavos.
  - Vistas UI (Hero, Calculadora, Formulario IA, Generador) ajustadas a los nuevos precios.
  - Componente `AdminDashboard` y suite de pruebas unitarias re-escritos con aserciones alineadas al descuento.
- **Tolerancia a Fallos de Pagos Validada**:
  - Webhook configurado con `waitUntil()` nativo para retención de contenedor.
  - Reintentos vía Upstash QStash DLQ cada 15 min implementados para PDF no entregados.

### [2026-08-22] - Corrección de Coherencia IA (RAG Proxy)

- Inyección de Guardarraíl Comercial Algorítmico en `src/app/api/chat/route.ts` para alinear ventas sin afectar pedagogía. Tests: `chat-guardrail.test.ts`.
- Configurado Isolation Testing en package.json (`vitest related`) para velocidad DevSecOps.
- Añadido `ChatConsumptionWidget` al dashboard usando Upstash Redis para trackear consumo de API del Chat a costo 0 de BBDD.
- Pilar 4: UX de Streaming Simulado en el `ChatAssistantWidget` (Thinking Steps + Typewriter). (El typewriter no se activaba; corregido el 2026-09-22.)
- SEO CTR y Distribución:
  - Script `blog:sync` con Google Alerts y Gemini IA para reescritura de artículos y generación de MDX libres de plagio.
  - Logotipo oficial en `layout.tsx` para su visualización en Google Search.
  - Schema.org JSON-LD (`FAQPage` y `AggregateRating`) en `page.tsx` para Rich Snippets.
  - Cabeceras CSP y HSTS verificadas en `middleware.ts`.

### [2026-08-21] - Fase 3: Telemetría Zero-Cost y Observabilidad

- [x] **Analítica de Demanda Ciudadana (Google Trends de Multas)**: rastreador asíncrono en RAM usando Upstash Redis. Costo $0 (cero lecturas/escrituras de Firestore). Clasifica temas como embargos, prescripción y ciudades.
- [x] **Dashboard Administrativo**: `DemandTrendsWidget.tsx` incrustado en `AnalyticsView.tsx`.
- [x] **Seguridad Admin**: la telemetría solo se extrae validando el token `__session` de administrador en el Route Handler con `next-firebase-auth-edge`.
- [x] **Tolerancia a Fallos y SRE**: alertas a Telegram (`sendTelegramAgentAlert`) cuando falla el motor del agente de IA. (Desde 2026-09-22 el chat usa `service-alert.ts` con anti-spam.)

### [2026-08-19] - Consolidación de Servicios (Documentación de Funcionalidades)

- **Calculadora de Tiempo y SIMIT OCR:** Operativos. Escaneo de comparendos y cálculo de fechas con IA y lógica determinista (Go).
- **Directorio de Códigos de Infracción y Ciudades:** Base de datos estática navegable (SEO programático).
- **Directorio Nacional de Radares (ANSV):** Directorio interactivo con coordenadas GPS conectado a Google Maps.
- **Portal VIP de Seguimiento (Seguridad):** Trazabilidad y estado para usuarios registrados, bajo reglas Zero-PII.
- **Limpieza DevSecOps:** Erradicación de advertencias de compilación en Vercel.

### [2026-08-18] - Fase 4: SEO Programático (ANSV) y Generación de Leads

- [x] Generador de JSON de ANSV (`fetch-ansv.js`) con coordenadas GPS exactas.
- [x] Ruta dinámica `/multas/[ciudad]/camaras` en `sitemap.ts`.
- [x] UI de radar premium (`conic-gradient`, LazyMotion) y tarjetas de cámaras con colorimetría por severidad.
- [x] Empty State optimizado para ciudades sin cámaras; auditoría dual-theme (claro/oscuro); token `brand` en `tailwind.config.ts`.
- [x] Fuzzy Search: normalización de tildes y sufijo "D.C." (Bogotá aparecía con 0 cámaras).

### [2026-08-16 a 2026-08-17] - Auditorías y Hotfixes

- **Criptografía Zero-PII y Auditoría:** 19 vulnerabilidades parchadas (incluyendo SSRF, Path Traversal, HTML Injection).
- **Seguridad (OTP):** expiración del OTP administrativo de 2 a 5 minutos en `src/lib/auth/otp-service.ts`.
- **Trazabilidad (Pilar 1 SRE):** `X-Trace-Id` en los 3 repositorios; alertas enlazadas a Telegram y Sentry.
- **Cancelación SIMIT Scraper:** el scraping hacia SIMIT fue inhabilitado permanentemente por cumplimiento (Riesgo Ley 1273 de 2009). El 2026-09-22 se eliminaron el scheduler y la API key del `.env.example`.

### [2026-08-14] - Implementación de Caché (Pilar 2)

- Patrón Cache-Aside con Upstash Redis para proteger los motores pesados de Go (Calculadora) y OCR.

---

## 🎯 Metas Pendientes / Tareas a Seguir (Actualizado: 2026-09-24)

- **Seguridad:** generar una clave nueva de Gemini en AI Studio (las actuales quedaron expuestas en una conversación) y revocar la API key del scraper SIMIT, que sigue en el historial de Git.
- **Vercel:** confirmar `GEMINI_API_KEY` nueva (OCR) y, opcional, `GEMINI_OCR_MODEL`.
- **GitHub Actions:** la cuenta de GitHub está **bloqueada por facturación** ("account is locked due to a billing issue"); resolver en github.com/settings/billing. Secreto `GEMINI_API_KEY` ya creado. CD necesita además `FIREBASE_TOKEN`.
- **Monitor externo:** crear la cuenta gratis de UptimeRobot y el monitor a `https://desmulta.online/api/health` (pasos en `docs/GUIA_INCIDENTES.md`).
- **Cifras públicas por confirmar con el propietario:** "205+ casos exitosos" (portada) y "Más de 500+ usuarios referidos este mes" (`/referidos`); si no son reales, son publicidad engañosa (Ley 1480, art. 30).
- **Legal:** el proyecto no tiene empresa registrada: identificar al responsable por marca, correo y, si el propietario acepta, nombre y ciudad; revisión opcional por un consultorio jurídico universitario (gratuito).
- Evaluar posible expansión del embudo hacia suscripciones automáticas (notificaciones).
