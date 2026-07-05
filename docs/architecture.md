# Arquitectura Técnica — Desmulta v1.0.0

> Fuente de verdad técnica. Actualizar con cada cambio arquitectónico significativo.

---

## 1. Topología del Sistema (Event-Driven)

```mermaid
graph TD
  subgraph Cliente["Cliente (PWA / Next.js en Vercel)"]
    A1[Formulario Completo] -->|RSA E2EE + Zod| C[POST /api/create-consultation]
    A2[Formulario SIMIT\ntelefono + foto] -->|Zod| C
    OCR[Tesseract.js OCR\nclient-side] --> A2
  end

  subgraph VIP["Portal VIP (usuarios SIMIT)"]
    V1[/vip — Login cédula+celular] -->|Hash PII (Zero-PII)| V1_1[JWT HS256 con hashes]
    V1_1 -->|Cookie httpOnly| V2[/vip/dashboard]
    V2 -->|Firestore listener| V3[Timeline en tiempo real]
    V2 --> V4[VipPushNotification FCM]
  end

  subgraph Admin["Panel Admin (/admin)"]
    K[Kanban drag-and-drop] -->|Server Action| SA[updateCaseStatus]
    M[ModalNotaOperador] -->|operatorNote| SA
    SA -->|Firestore write| L
  end

  subgraph Functions["Firebase Cloud Functions Gen2"]
    F1[onConsultationCreated] -->|sendMessage + guarda telegramMessageId| TG
    F2[onCaseStatusChange] -->|editMessageText| TG
    F2 -->|Resend email| EMAIL
    F2 -->|FCM push| PUSH
    F3[onConsultationStatusChange] -->|email solo leads| EMAIL
    F4[cronRetryNotifications] -->|retry mensajes fallidos| TG
    F5[cronCleanup] -->|limpia datos expirados| L
    F6[telegramWebhook] -->|cambiarEstado| L
  end

  subgraph Data["Capa de Datos"]
    L[(Firestore DB)]
    B[(Vercel Blob\nSIMIT captures)]
  end

  C -->|Zero-PII write| L
  C -->|Temp image| B
  L -->|Trigger| F1
  L -->|Trigger| F2
  L -->|Trigger| F3
  TG[Telegram Bot] -->|callback_query| F6
```

---

## 2. Colecciones Firestore

| Colección | Propósito | Acceso cliente | Admin SDK |
|---|---|---|---|
| `consultations/` | Lead del formulario web | Solo admin auth | ✅ |
| `consultations/{id}/private/push` | FCM token (privado) | ❌ | ✅ |
| `cases/` | Expediente legal activo | ❌ | ✅ |
| `public_tracking/` | Estado público por UUID | `get` (por UUID secreto) | ✅ |
| `leads/` | Datos OCR previos al formulario | ❌ | ✅ |
| `processed_callbacks/` | Idempotencia Telegram | ❌ | ✅ |
| `referidos/` | Sistema de referidos | Solo admin auth | ✅ |
| `edge_telemetry/` | Métricas anónimas | ❌ | ✅ |
| `legal_mandates/` | Mandatos verificados OTP | ❌ | ✅ |
| `otp_rate_limits/` | Rate limit OTP | ❌ | ✅ |
| `upload_rate_limits/` | Rate limit uploads por IP | ❌ | ✅ |

---

## 3. Flujo de Notificaciones (Estado actual)

```
Cambio de estado (Kanban O Telegram)
         │
         ▼
   Firestore write
         │
    ┌────┴────────────────────────┐
    ▼                             ▼
onCaseStatusChange          onConsultationStatusChange
(colección cases/)          (colección consultations/)
    │                             │
    ├── editMessageText Telegram  ├── email al cliente (si hay email)
    ├── email al cliente          └── (sin Telegram — evita duplicado)
    └── push FCM al cliente
         │
    ┌────┴──────────┐
    ▼               ▼
  si email       si push
  Resend send    admin.messaging().send()
                 token desde /private/push
                 o fallback campo raíz
```

**Regla:** Solo `onCaseStatusChange` notifica a Telegram. `onConsultationStatusChange` solo manda email.

---

## 4. Seguridad — 10 Capas

| Capa | Mecanismo | Archivo clave |
|---|---|---|
| Red | HSTS + CSP nonce + X-Frame-Options | `src/middleware.ts` |
| CSRF / Origin | Validación de cabecera Origin contra SITE_URL en endpoints admin | `/api/gallery` y `/api/admin/export-pdf` |
| Auth Admin | JWT ECDSA + httpOnly cookie | `src/lib/require-admin-session.ts` |
| Doble Factor (2FA) | Código OTP de 6 dígitos enviado por email (Expiración de 2 minutos) con Cookie HttpOnly | `src/app/admin/otp-actions.ts` |
| Auth VIP | JWT HS256 + httpOnly + sameSite:lax (Zero-PII: Solo Hashes) | `src/lib/security/vip-jwt.ts` |
| Rate limit | Upstash Redis en memoria (Fail-CLOSED), granularidad en galería | `src/lib/security/rate-limit.ts` |
| Validación | Zod en todos los endpoints | Cada `route.ts` |
| Upload | Magic bytes + MIME whitelist + 10MB | `src/app/api/upload/route.ts` |
| Anti-bot | Cloudflare Turnstile server-side | `src/lib/turnstile.ts` |
| Cifrado | RSA E2EE formulario + SHA-256 PII | `src/lib/encryption.ts` |

### Excepciones de Seguridad Conocidas
*   **style-src unsafe-inline (CSP):** Se permite la directiva `'unsafe-inline'` en `style-src` debido a los requerimientos de hidratación dinámica de Framer Motion y Tailwind CSS en Next.js. Es una excepción aceptada en beneficio del dinamismo visual de la interfaz de usuario de cara al cliente y en ausencia de un motor de hashes/nonces dinámicos a tiempo de compilación.

---

## 5. Cloud Functions — Descripción

| Función | Trigger | Propósito |
|---|---|---|
| `onCasoChanged` | Firestore `onDocumentWritten` `casos/` | Auditoría inmutable (Mejora A) y alertas de seguridad Telegram ante DELETE (Mejora C). |
| `onConsultaChanged` | Firestore `onDocumentWritten` `consultations/` | Auditoría inmutable (Mejora A) y alertas de seguridad Telegram ante DELETE (Mejora C). |
| `onConsultationCreated` | Firestore create `consultations/` | Envía mensaje a Telegram con dictamen + guarda `telegramMessageId` |
| `onCaseStatusChange` | Firestore update `cases/` | Email + Push + edita mensaje Telegram |
| `onCaseCreated` | Firestore create `cases/` | Email de bienvenida al caso |
| `onConsultationStatusChange` | Firestore update `consultations/` | Email al cliente (no Telegram) |
| `onPushOptIn` | Firestore update (fcmToken) | Notifica al operador en Telegram que un cliente activó push |
| `telegramWebhook` | HTTP POST | Procesa callbacks de botones Telegram, cambia estados |
| `cronRetryNotifications` | Schedule cada 15 min | Reintenta mensajes Telegram fallidos, guarda nuevo `telegramMessageId` |
| `cronLimpieza` | Schedule diaria | Elimina `processed_callbacks` expirados, limpia rate limits |

---

## 6. Variables de Entorno Requeridas

### Vercel (Next.js)
```env
FIREBASE_ADMIN_CREDENTIALS=...   # JSON base64 del service account
RESEND_API_KEY=re_...             # Para emails desde server actions
NEXT_PUBLIC_FIREBASE_*=...        # Config pública de Firebase
CLOUDFLARE_TURNSTILE_SECRET=...  # Validación anti-bot server-side
VIP_JWT_SECRET=...                # Mínimo 32 chars aleatorios (¡CAMBIAR el fallback!)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
INTERNAL_API_SECRET=...          # Para /api/internal/purge-blob
BLOB_READ_WRITE_TOKEN=...        # Vercel Blob
NEXT_PUBLIC_VAPID_KEY=...        # Push notifications web
```

### Firebase Secrets (Cloud Functions)
```
RESEND_API_KEY          → firebase functions:secrets:set RESEND_API_KEY
TELEGRAM_BOT_TOKEN      → firebase functions:secrets:set TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID        → firebase functions:secrets:set TELEGRAM_CHAT_ID
TELEGRAM_WEBHOOK_SECRET → firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET
```

---

## 7. Despliegue

```bash
# Next.js → Vercel (automático via git push a main)
# O manual:
vercel --prod

# Cloud Functions
firebase deploy --only functions

# Firestore Rules
firebase deploy --only firestore:rules

# Firestore Indexes
firebase deploy --only firestore:indexes
```
