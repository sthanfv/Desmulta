# Desmulta

Sistema integral para la gestión y captación de clientes de regularización de multas de tránsito. Incluye Landing Page optimizada para conversión (SIMIT), panel de administración protegido, base de datos en tiempo real y notificaciones automatizadas a Telegram.

---

## 🛠 Stack Técnico

- **Framework:** Next.js 15.5.12 (App Router)
- **Lenguaje:** TypeScript, React 19
- **Estilos:** Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Backend / DB:** Firebase (Firestore, Auth Admin SDK)
- **Almacenamiento:** Vercel Blob (para imágenes/evidencias)
- **Despliegue:** Vercel

---

## 🔒 Auditoría y Seguridad Especializada (MANDATO-FILTRO)

El proyecto superó una auditoría de seguridad exhaustiva, garantizando grado empresarial:

- **Security Headers HTTP (Grado A):** Implementación de CSP estricto, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, y `Permissions-Policy`.
- **Mitigación SSRF:** Intercomunicación de API controlada estrictamente vía variables de entorno (`NEXT_PUBLIC_SITE_URL`).
- **Autenticación Oculta (`x-internal-secret`):** Las rutas de fondo de Vercel API están aisladas y utilizan llaves asimétricas para intercomunicarse.
- **Validación Robusta y Anti-Bot:** Verificación en cliente (Zod Schema), en backend de Next.js (`create-consultation`), y en base de datos (`firestore.rules`). Incluye un HoneyPot.
- **Defensa contra DDoS (Firestore):** Implementación de cooldown por usuario de 5 minutos mediante transacciones atómicas de Firebase.
- **0 Credenciales Expuestas:** El repositorio depende ciegamente de `.env` encriptados localmente y Vercel Variables en el cloud.

---

## 🏗 Arquitectura del Flujo de Consultas

1. El usuario completa el `ConsultationForm` validado por Zod.
2. El cliente invoca de forma segura `/api/create-consultation`.
3. El frontend inicializa `signInAnonymously()` para proteger las peticiones de Firestore.
4. `create-consultation` persiste el Lead en **Firestore** (`/consultations`). Si es exitoso, envía una llamada post-hook a `/api/notify` a sí mismo enviando la llave de seguridad interna `INTERNAL_API_SECRET`.
5. `/api/notify` procesa el request, formatea el texto, y se conecta con el Bot de Telegram usando la llave secreta, enviando la alerta al Chat ID del equipo.

---

## ⚙️ Variables de Entorno y Configuración

El archivo `.env` o `.env.local` debe contener:

```env
# Configuración Pública (Accesible por Cliente)
NEXT_PUBLIC_BRAND_NAME="Desmulta"
NEXT_PUBLIC_SITE_URL="http://localhost:9005"
NEXT_PUBLIC_WHATSAPP_NUMBER="573005648309"

# Firebase Public SDK
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
# ...

# Firebase Admin SDK (Secretos)
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Telegram Bot (Secretos)
TELEGRAM_BOT_TOKEN="1234:ABCDEF..."
TELEGRAM_CHAT_ID="987654321..."

# Llave Interna API de Next.js (Secreto Autenticación)
# (Generar con: `openssl rand -hex 32` o el CLI de node)
INTERNAL_API_SECRET="e910b23..."

# Vercel Blob (Imágenes panel admin)
BLOB_READ_WRITE_TOKEN="..."
```

---

## 🚀 Despliegue en Local y Checks de Calidad

Recomendado para trabajar en Localhost: puerto **9005**.

```bash
# Instalar dependencias puras (Compatibilidad React 19)
npm install --legacy-peer-deps

# Iniciar servidor local
npm run dev
```

El script de chequeo de Pipeline a la Fija antes de hacer Push de Vercel (Recomendado):

```bash
npm run check
# Esto invoca -> format (Prettier), lint (Next CLI), typecheck (Tsc) y Next Build.
```

## 🚀 Despliegue en Local y Checks de Calidad

Recomendado para trabajar en Localhost: puerto **9005**.

```bash
# Instalar dependencias puras (Compatibilidad React 19)
npm install --legacy-peer-deps

# Iniciar servidor local
npm run dev
```

El script de chequeo de Pipeline a la Fija antes de hacer Push de Vercel (Recomendado):

```bash
npm run check
# Esto invoca -> format (Prettier), lint (Next CLI), typecheck (Tsc), tests y Next Build.
```
