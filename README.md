# Desmulta — Plataforma de Saneamiento Vial Inteligente v1.9.3 🛡️🚀

TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO DE SEGURIDAD Y CALIDAD 'MANDATO-FILTRO'.

![Desmulta Banner](https://desmulta.vercel.app/icon.png)

## 📖 Descripción General

Desmulta es una plataforma LegalTech de alto rendimiento diseñada para la gestión administrativa y saneamiento de deudas de tránsito en Colombia. Utiliza tecnologías de vanguardia como **Next.js 15 (React 19)**, **Firebase Admin SDK** y **Zod** para garantizar procesos seguros, rápidos y transparentes.

---

## 🔐 Parche de Seguridad — v1.9.0 (2026-03-07)

Auditoría completa de seguridad ejecutada bajo **MANDATO-FILTRO**. Se corrigieron 6 hallazgos identificados por el equipo de Seguridad:

| # | Severidad | Hallazgo | Archivo Afectado | Estado |
|:---|:---|:---|:---|:---|
| H1 | 🔴 Crítico | **Path Traversal (LFI)** — slug sin sanitizar en `getBlogPostBySlug` | `src/lib/mdx.ts` | ✅ Corregido |
| H2 | 🔴 Crítico | `console.error` directo en producción (bypasea logger seguro) | `src/app/api/upload/route.ts` | ✅ Corregido |
| H3 | 🔴 Crítico | Sin validación de tipo MIME ni tamaño máximo en endpoint de carga | `src/app/api/upload/route.ts` | ✅ Corregido |
| H4 | 🟡 Medio | IP Spoofing en rate limiting — `x-forwarded-for` sin validación de origen | `src/app/api/upload/route.ts` | ✅ Corregido |
| H5 | 🟡 Medio | **PII en logs** — número de cédula expuesto en claro | `src/app/api/validar-consulta/route.ts` | ✅ Corregido |
| H6 | 🟡 Medio | Filename sin sanitizar → Path Traversal #2 en Vercel Blob | `src/app/api/upload/route.ts` | ✅ Corregido |

### Detalle técnico de las correcciones

- **H1**: Función `sanitizarSlug()` con regex `^[a-z0-9-]+$` + verificación `path.resolve().startsWith(BLOG_DIR + sep)`.
- **H2**: Reemplazado `console.error` por `logger.error` del módulo `@/lib/logger/security-logger`.
- **H3**: *Allowlist* de MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) + límite de 5 MB verificado vía `Content-Length` antes de leer el stream.
- **H4**: Función `extraerIpConfiable()` que prioriza `x-vercel-forwarded-for` (inyectado por la infraestructura de Vercel, no falsificable por el cliente) sobre `x-forwarded-for`.
- **H5**: Función `ofuscarPII()` que muestra solo los últimos 4 dígitos en logs. Ej: `1090123456` → `****3456`.
- **H6**: Función `sanitizarNombreArchivo()` con regex `[^a-zA-Z0-9._-]` → reemplaza inválidos por `_` y limita a 100 caracteres.

---

## ⚡ Edge Runtime y Arquitectura Serverless O(1) — v1.9.2 (2026-03-07)

Optimización profunda del motor de validación para latencia cercana a cero eliminando las dependencias nativas de Node.js en favor del **Vercel Edge Network**:

- **Índice Ciego (Blind Index)**: Se implementó una colección `consultas_index` en Firestore operada exclusivamente bajo métodos Hash (SHA-256) creados mediante `crypto.subtle` (Edge) y `crypto` (Node).
- **Cero Exposición PII**: En la validación primaria, la cédula nunca se envía en texto plano como parámetro de consulta a la base de datos, garantizando protección técnica extrema de PII frente a atacantes (MANDATO-FILTRO).
- **Fetch Directo REST API**: Integración transparente de `https://firestore.googleapis.com` mediante Web API Key y Firestore Rules estrictas (solo `get`), superando la limitación de permisos en la capa Edge sin exponer la BBDD a enumeración (`list`).
- Limpieza de props residuales y mitigación final del linter (Object Injection en Landing).

---

## 💎 Perfección Estética y Performance Mobile — v1.9.3 (2026-03-08)

Refinamiento final de la interfaz y optimización de recursos para dispositivos móviles:

- **Fix Tipográfico Hero**: Ajuste de interlineado (`leading-tight`) y paddings de seguridad en textos con gradiente para evitar el recorte visual de caracteres (e.g., la 'O' de Liderazgo).
- **CPU Bypass (Mobile)**: Desactivación inteligente de listeners de `mousemove` en dispositivos táctiles (< 768px) para reducir el consumo de ciclos de CPU y batería.
- **Optimización de Renderizado**: Reducción de la carga de `backdrop-blur` y simplificación de las capas de `MeshBackground` en móviles, garantizando una fluidez de scroll constante.
- **Turnstile Hardening**: Validación estricta de Cloudflare Turnstile reintroducida en esquemas Zod tras la limpieza de duplicados.

---

## 🌟 Historial de Características

### v1.8.x

- **Kanban Pro (v1.8.0)**: Tablero dual (Ventas/Legal) con **Smart Cards** de detección automática (Imagen vs. Datos), sistema Fallback Placa → Cédula.
- **Acciones Tácticas Móviles (`Tap-to-Move`)**: Modal de acción rápida para celulares. Elimina dependencia del Drag & Drop en pantallas táctiles.
- **Unificación One-Page (v1.8.5)**: Blog, FAQ, Servicios y Legal en una única interfaz de alto rendimiento.
- **Terminología 100% en español**: «Solicitudes» en lugar de «Leads».

### v1.7.x

- **Interfaz de Alta Fidelidad (`TarjetaPremium`)**: Efectos de iluminación dinámica (linterna) procesados por GPU a 120 FPS sin re-renders en React.
- **Motor FOMO Dinámico**: Notificaciones de «Consulta en Vivo» con miles de permutaciones y apagado inteligente.
- **Calculadora Legal UX Premium**: Retraso psicológico de 2.5s con Framer Motion para validar viabilidad de prescripción.
- **Persistencia de Hierro**: Autoguardado silente en `localStorage` ante cada pulsación.
- **Adaptativo (Multi-Tema)**: Transiciones semánticas entre modo Claro y Oscuro.

---

## 🗺️ Mapa de Rutas (App Router)

### Públicas

- `/` : Landing Page Principal con Dashboard Interactivo.
- `/servicios` : Catálogo de servicios legales ofrecidos.
- `/servicios/[ciudad]` : Landing pages dinámicas optimizadas para SEO local.
- `/blog` : Centro de autoridad legal (Sentencia C-038, Prescripción, Embargos).
- `/metodologia` : Detalle del proceso técnico-legal de saneamiento.
- `/faq` : Preguntas frecuentes y claridad normativa.
- `/terminos` : Marco legal y protección de datos (HDS).

### Administrativas

- `/admin` : Panel de control centralizado para la gestión de solicitudes y casos.

### API (Backend)

- `/api/validar-consulta` : Motor de validación con Rate Limiting, ofuscación de PII y auditoría.
- `/api/create-consultation` : Endpoint seguro para la ingesta de solicitudes a Firestore.
- `/api/upload` : Endpoint de carga de evidencia fotográfica con validación MIME, tamaño y filename.

---

## 🧠 Esquema de Datos y Validación (Zod)

### Formulario de Consulta (`ConsultationSchema`)

| Campo            | Tipo    | Validación / Regla                              |
| :--------------- | :------ | :---------------------------------------------- |
| `cedula`         | String  | Numérico, 5-20 caracteres.                      |
| `placa`          | String  | Formato AAA123 o AAA12A (Opcional).             |
| `nombre`         | String  | Mínimo 3 caracteres, sanitización XSS.          |
| `contacto`       | String  | Celular colombiano (10 dígitos, empieza por 3). |
| `email`          | String  | Formato email válido (Opcional).                |
| `antiguedad`     | String  | Selección obligatoria de rango temporal.        |
| `tipoInfraccion` | String  | Clasificación del comparendo.                   |
| `estadoCoactivo` | String  | Estado jurídico del cobro.                      |
| `aceptoTerminos` | Boolean | True (Obligatorio).                             |
| `_tramp_field`   | String  | Honeypot Anti-Bot (Debe estar vacío).           |

### Captura SIMIT (`SimitCaptureSchema`)

- `contacto`: Celular colombiano validado.
- `evidenceUrl`: URL del archivo en Vercel Blob / Firebase Storage.
- `aceptoTerminos`: Obligatorio.

---

## 🛡️ Calidad y Ciberseguridad (MANDATO-FILTRO)

### Estado del Filtro — v1.9.0

| Control | Estado |
|:---|:---|
| Sin credenciales hardcodeadas | ✅ |
| Validación + sanitización de inputs (Zod) | ✅ |
| Prevención Path Traversal (LFI) | ✅ Corregido en v1.9.0 |
| Validación MIME y tamaño en uploads | ✅ Corregido en v1.9.0 |
| Rate Limiting anti-IP spoofing | ✅ Corregido en v1.9.0 |
| PII ofuscada en logs | ✅ Corregido en v1.9.0 |
| Headers seguros (CSP, HSTS, COOP, CORP) | ✅ |
| Sin `console.log`/`console.error` en producción | ✅ Corregido en v1.9.0 |
| Tests automatizados (Vitest + Playwright) | ✅ |

### Comandos de Verificación

```powershell
# Ciclo completo de calidad
npm run check    # format + lint + typecheck + test + build
npm run test     # Suite Vitest (seguridad + validación + rate limiting)
npm run test:smoke  # Suite Playwright (E2E)
```

---

## 🎨 Diseño y Estética

- **Paleta:** Oxford Blue (`#0F172A`) y Amarillo Regulación (`#FFC107`).
- **Tipografía:** Inter (Moderna, Profesional).
- **Iconografía:** Lucide React.
- **Tecnología Visual:** Tailwind CSS + Framer Motion + GSAP.

---

## ⚙️ Stack Tecnológico

- **Core:** Next.js 15 (App Router), React 19.
- **Db/Auth:** Firebase (Admin SDK, Firestore, Auth).
- **Validación:** Zod.
- **Estilos:** Tailwind CSS, Shadcn/UI.
- **Analytics:** Vercel Analytics.
- **Comunicaciones:** Resend (Email), Telegram Bot API.
- **IA:** Google Genkit + Gemini.

---

**Desmulta © 2026 — Ingeniería de Clase Mundial para la Justicia Vial.**
