# Desmulta — Plataforma de Saneamiento Vial Inteligente v5.1.0

![Desmulta Banner](https://desmulta-ofi.vercel.app/icon.png)

---

## 1. Propósito y Visión General
**Desmulta** es una solución integral diseñada para democratizar y automatizar la defensa administrativa y el saneamiento vial en Colombia. El proyecto resuelve la complejidad y la falta de transparencia en el manejo de infracciones de tránsito, permitiendo que ciudadanos y empresas gestionen la viabilidad jurídica de sus multas de forma técnica y profesional.

*   **Problema Principal:** El difícil acceso a la justicia administrativa y la complejidad de los portales gubernamentales. 
*   **Usuario Final:** Conductores particulares, flotas de transporte y propietarios de vehículos que buscan una evaluación jurídica honesta y rápida sobre la prescripción o caducidad de sus multas.

---

## 2. Stack Tecnológico
Hemos seleccionado un stack de vanguardia para garantizar seguridad, velocidad y escalabilidad (MANDATO-FILTRO):

*   **Frontend & Backend:** [Next.js 15 (App Router)](https://nextjs.org/) con [React 19](https://react.dev/), aprovechando **Server Actions** para un procesamiento seguro y rápido.
*   **Estilos:** [Tailwind CSS](https://tailwindcss.com/) con una estética premium basada en **iOS Glassmorphism** y micro-animaciones con **GSAP**.
*   **Base de Datos & Seguridad:** [Firebase (Firestore)](https://firebase.google.com/) para persistencia en tiempo real y [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) para operaciones privilegiadas.
*   **Almacenamiento de Evidencias:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) para capturas de pantalla de alta disponibilidad.
*   **Despliegue:** Alojado en la infraestructura de **Vercel** con integración continua de GitHub.

---

## 3. Arquitectura y Funcionalidades Clave
*   **Tipo de Aplicación:** Se comporta como una **PWA (Progressive Web App)** con capacidades de SSR (Server-Side Rendering) y CSR para una experiencia fluida.
*   **Integraciones Externas:**
    *   **Telegram API:** Sistema de alertas críticas para analistas con envío de evidencias en tiempo real.
    *   **Google Genkit:** Orquestación de IA para análisis predictivo y gestión de Knowledge Base.
*   **Seguridad y Validación:** 
    *   **Zod:** Validación estricta de esquemas en todos los puntos de entrada.
    *   **Rate Limiting:** Protección por IP en endpoints sensibles (Upload/Consultas).
    *   **Encriptación:** Canales cifrados SSL y protocolos de seguridad RSA.

---

## 4. Lógica de Negocio y Flujos
1.  **El Viaje del Usuario:**
    *   **Consulta Express:** El usuario sube su captura de SIMIT o completa un formulario de 30 segundos.
    *   **Validación de Analista:** El sistema (y un equipo experto) evalúan la prescripción basándose en datos técnicos.
    *   **Certificación:** El usuario recibe un dictamen de viabilidad gratuito.
2.  **Manejo de Estados y Gestión:**
    *   El estudio de viabilidad es **100% gratuito**, lo que genera confianza y captura leads de alta calidad.
    *   **Contratación:** Solo si el caso es viable, se inicia la gestión administrativa mediante honorarios por resultados.
    *   *Nota:* No se realizan cobros automáticos; cada fase de contratación es manual y transparente para evitar devoluciones complejas.

---

## 5. El Estado Actual y Objetivo
*   **Estado:** El proyecto se encuentra en **Fase de Producción v5.1.0**, con el flujo SIMIT 100% operativo, seguridad de almacenamiento blindada y arquitectura de IA integrada.
*   **Tu Ayuda:** Mi labor como **Desarrollador Senior Specialist** es mantener el **MANDATO-FILTRO**: asegurar que cada línea de código sea segura, que la UI sea de clase mundial (Premium) y que la lógica de negocio esté blindada contra errores o abusos.

---
**Desmulta © 2026 — Ingeniería de Datos para un Tránsito Justo**
