# Desmulta — Plataforma de Saneamiento Vial Inteligente v5.50.0 🛡️🚀

TODAS LAS DECISIONES, ARCHIVOS Y CÓDIGO GENERADO DEBEN PASAR EL FILTRO DE SEGURIDAD Y CALIDAD ‘MANDATO-FILTRO’.

![Desmulta Banner](https://desmulta.vercel.app/icon.png)

## 📖 Descripción General

Desmulta es una plataforma LegalTech de alto rendimiento diseñada para la gestión administrativa y saneamiento de deudas de tránsito en Colombia. Utiliza tecnologías de vanguardia como **Next.js 15 (React 19)**, **Firebase Admin SDK** y **Zod** para garantizar procesos seguros, rápidos y transparentes.

### 🌟 Características "Nivel Dios" (Nuevas en v5.50.0)
- **Interfaz de Alta Fidelidad (`TarjetaPremium`)**: Efectos de iluminación dinámica (linterna) procesados por GPU a 120 FPS sin re-renders en React.
- **Motor FOMO Dinámico**: Notificaciones de "Consulta en Vivo" que combinan miles de permutaciones (nombres, ciudades y montos aleatorios) creando prueba social con apagado inteligente.
- **Calculadora Legal UX Premium**: Retraso psicológico de 2.5s y transiciones suaves con Framer Motion para validar la viabilidad de caducidad.
- **Persistencia de Hierro**: Autoguardado silente en `localStorage` ante cada pulsación para no perder a los leads por fallas técnicas (Modo Supervivencia).
- **Adaptativo (Multi-Tema)**: Transiciones semánticas impecables entre Claro y Oscuro.

---

## 🗺️ Mapa de Rutas (App Router)

La aplicación utiliza el `src/app` router de Next.js, con las siguientes rutas activas:

### Públicas

- `/` : Landing Page Principal con Dashboard Interactivo.
- `/servicios` : Catálogo de servicios legales ofrecidos.
- `/servicios/[ciudad]` : Landing pages dinámicas optimizadas para SEO local.
- `/blog` : Centro de autoridad legal (Sentencia C-038, Prescripción, Embargos).
- `/metodologia` : Detalle del proceso técnico-legal de saneamiento.
- `/faq` : Preguntas frecuentes y claridad normativa.
- `/terminos` : Marco legal y protección de datos (HDS).

### Administrativas

- `/admin` : Panel de control centralizado para la gestión de leads y casos.

### API (Backend)

- `/api/validar-consulta` : Motor de validación con Rate Limiting y auditoría.
- `/api/create-consultation` : Endpoint seguro para la ingesta de leads a Firestore.

---

## 🧠 Esquema de Datos y Validación (Zod)

Garantizamos la integridad de los datos mediante esquemas estrictos que previenen Inyección de Datos y ataques automatizados.

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

Utilizado en el flujo de envío rápido mediante captura de pantalla:

- `contacto`: Celular colombiano validado.
- `evidenceUrl`: URL del archivo en Vercel Blob / Firebase Storage.
- `aceptoTerminos`: Obligatorio.

---

## 🛡️ Calidad y Ciberseguridad (MANDATO-FILTRO)

### Reporte de Pruebas

- **Unitarias (Vitest):** Cobertura del 100% en lógica de validación, filtros de seguridad y Rate Limiting.
- **E2E (Playwright):** Validación del Full Funnel (Navegación -> Viabilidad -> Lead).
- **Hardening:** Headers de seguridad globales (CSP, X-Frame-Options, HSTS).

### Comandos de Verificación "Limpio Limpio"

```powershell
# Ciclo completo de calidad
npm run check    # Ejecuta format, lint y typecheck secuencialmente
npm run test     # Ejecuta la suite de Vitest
```

---

## 🎨 Diseño y Estética

- **Paleta Premium:** Oxford Blue (#0F172A) y Regulation Yellow (#FFC107).
- **Tipografía:** Inter (Moderna, Profesional).
- **Iconografía:** Lucide React (ShieldCheck, Clock, FileX2).
- **Tecnología Visual:** Tailwind CSS + Framer Motion para micro-interacciones, Efectos de Luz v5.4.

---

## ⚙️ Stack Tecnológico

- **Core:** Next.js 15 (App Router), React 19.
- **Db/Auth:** Firebase (Admin SDK, Firestore, Auth).
- **Validation:** Zod.
- **Utils:** Calculadora Legal v1.0 (Nivel Bancario - UTC Strict).
- **Styling:** Tailwind CSS, Shadcn/UI.
- **Analytics:** Vercel Analytics.
- **Communications:** Resend (Email), Telegram Bot API.

---

**Desmulta © 2026 — Ingeniería de Clase Mundial para la Justicia Vial.**
