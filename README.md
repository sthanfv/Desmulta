# Desmulta — Plataforma Integral de Gestión y Resolución de Infracciones v2.8.3 🛡️🚀

**Infraestructura de Clase Mundial para la Justicia Vial en Colombia.**

## 📖 1. Visión General

Desmulta es un ecosistema tecnológico diseñado para empoderar al ciudadano frente a las fotomultas e infracciones de tránsito. Utiliza **Inteligencia Artificial Local (OCR)** y motores de **Lógica Difusa** para analizar la viabilidad legal de las multas basándose en la Sentencia C-038 de 2020 y el Art. 159 del Código Nacional de Tránsito.

---

## 🎨 2. Enciclopedia del Frontend (Arquitectura de Cliente)

El frontend de **Desmulta** está diseñado bajo premisas de **Aestethic Excellence** y **Performance Crítico**.

### 🏛️ Paradigma de Diseño: "Legal-Premium Adaptive"

- **Design System**: Basado en tokens de Tailwind v3.4 con extensiones para **Glassmorphism** y soporte nativo para temas Claro/Oscuro.
- **Paleta de Colores**:
  - `Primary`: HSL(142 71% 45%) — Verde esmeralda legal.
  - `Foreground`: Adaptativo vía variables CSS (Zinc-950 / Zinc-50).
  - `Card`: Fondo translúcido `bg-card/40` optimizado para `backdrop-blur`.
- **Feedback Háptico**: Integración nativa con `navigator.vibrate` para confirmaciones físicas.

### 🎭 Animación e Interactividad

- **BentoDesmulta (Obra Maestra)**: Grid asimétrico que fusiona la narrativa legal con interactividad premium.
- **MagneticCard (v1.2.0)**: Refinado para Alta Visibilidad en modo claro. Halo intensificado con variables CSS para rendimiento extremo.
- **Reveal (LazyMotion)**: Optimizador de carga para animaciones cinemáticas "Apple-like".
- **GSAP (GreenSock)**: Orquestación cinemática y ScrollTrigger.

### 🧠 Módulos Inteligentes

- **OCR Forense**: Tesseract.js v7.0 con visualización de Bounding Boxes.
- **Motor de Triage v1.1.0**: Análisis en tiempo real de `ocrRawText` para priorización de leads.
- **Persistencia Anti-Crash**: Zustand con middleware `persist` y `partialize` para resiliencia en móviles gama baja.

---

## 🏗️ 3. Estructura de Datos & Seguridad (Firestore)

### Entidades Principales

- **Consultation**: Solicitudes iniciales representadas por procesos de viabilidad.
- **Case**: Expedientes jurídicos administrados con historial de comparendos.
- **Asset**: Metadatos de evidencias (imágenes/PDFs) almacenados en Vercel Blob.

### Seguridad: Authorization Independence

Este sistema implementa **Independencia de Autorización** mediante la denormalización de `assignedToId` en subcolecciones, permitiendo:

1.  **Reglas Atómicas**: Verificaciones sin necesidad de llamadas `get()` cruzadas.
2.  **Escalabilidad**: Soporte para transiciones y batches pesados sin degradación de rendimiento.

---

## 🛠️ 4. Guía de Mantenimiento & DevSecOps

### Mantenimiento de Datos

- **Colecciones Seguras (`consultations`, `cases`)**: Se pueden limpiar para reiniciar la operación comercial.
- **Colección Protegida (`site_config`)**: **No borrar**. Contiene la identidad administrativa del sitio.
- **Limpieza de Archivos**: Use el botón "LIMPIAR CAPTURAS" en el Admin para depurar archivos `simit_cap_*` en Vercel Blob.

### Estrategia de Seguridad

- **Cloudflare Turnstile**: Bloqueo reactivo de bots.
- **Security Headers**: Política CSP endurecida (v2.7.3) para prevenir XSS y exfiltración de datos.
- **Zero-PII Logging**: Ofuscación automática de datos sensibles en consola.

---

## 🚀 5. Hoja de Ruta & FinOps (Mejoras Futuras)

### Próximos Hitos (v3.0.0)

- **Edge Runtime Migration**: Transición de Server Actions críticas a Edge para reducir el TTFB, utilizando la REST API de Firebase para superar limitaciones del Admin SDK.
- **Web Workers OCR**: Desplazamiento del procesamiento de Tesseract a hilos secundarios para un hilo principal 100% fluido en móviles.
- **Limpieza Predictiva**: Heurísticas post-OCR para identificar y purgar capturas sin valor legal antes de 24h.

---

## 📂 6. Estructura del Proyecto

```plaintext
├── /public           # Assets y Service Worker v2.7.3
├── /src
│   ├── /app          # Server Actions y API Routes
│   ├── /components   # UI Dinámica (Vial-Clear & Primitives)
│   ├── /lib          # Motores Legales, Seguridad y Utilidades
│   ├── /store        # Estado Global Persistente (Zustand)
│   └── /tests        # Suite de Calidad (Vitest)
```

---

**Desmulta - Equipo de Desarrollo Élite (MANDATO-FILTRO)**
