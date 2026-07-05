# Desmulta — Motor de Justicia Vial

## 1. ¿Qué es Desmulta? (Finalidad y Propósito)
**Desmulta** es una plataforma *LegalTech* (tecnología legal) serverless enfocada en el análisis jurídico vial para ciudadanos colombianos. Su finalidad es democratizar el acceso a la defensa frente a multas de tránsito (fotomultas y comparendos físicos), permitiendo a cualquier ciudadano auditar sus infracciones, entender sus derechos legales y generar documentos jurídicos (Derechos de Petición) de forma automatizada, económica y segura.

## 2. Misión y Visión
- **Misión:** Empoderar a los conductores colombianos frente a los abusos e inconsistencias del sistema de tránsito, brindando herramientas tecnológicas de auditoría legal gratuitas (OCR) y generación de defensa a bajo costo, garantizando en todo momento la privacidad absoluta de los datos personales.
- **Visión:** Convertirse en el estándar nacional de justicia vial automatizada, integrando servicios directos a ciudadanos (B2C) y pasarelas de análisis para flotas corporativas (API B2B), estableciendo un ecosistema legal 100% digital, determinista y auditable.

## 3. ¿Qué contiene y cómo funciona? (Funcionalidades Core)
El sistema guía al ciudadano a través de un "embudo" de auditoría y defensa:

1. **Scraping y OCR Local (Costo Cero):** El usuario sube capturas de pantalla de sus comparendos (ej. del portal SIMIT). Desmulta utiliza Inteligencia Artificial de Visión (Tesseract.js) que se ejecuta **100% en el dispositivo del usuario** (celular o PC). Esto garantiza la privacidad total y elimina costos de servidores en la nube.
2. **Motor de Inferencia Legal (Heurística Determinista):** Una vez extraído el texto, el motor identifica los códigos de infracción (ej. C29, D04) y despliega un **carrusel educativo interactivo** donde explica la sanción, el valor a pagar, el riesgo de inmovilización y, lo más importante, los **argumentos de defensa legal** específicos para ese caso.
3. **Generador de Documentos Jurídicos:** Si el usuario decide defenderse, el sistema captura los datos necesarios y genera un *Derecho de Petición* a la medida, fundamentado en la ley colombiana. Incluye una previsualización en vivo, un editor en pantalla y exportación a PDF (formateado bajo estándares de juzgados colombianos).
4. **Pasarela de Pagos (Wompi):** Integración robusta y blindada con Wompi para que los usuarios puedan adquirir los documentos generados de forma confiable.
5. **Radar SIMIT (En Planeación):** Un servicio adicional por suscripción (aprovechando los pagos recurrentes de Wompi) que monitoreará automáticamente la cédula del conductor para alertarle sobre fotomultas nuevas *antes* de que lleguen a su casa, permitiendo acciones legales preventivas.

## 4. Arquitectura y Tecnología (¿Cómo está construida?)
El stack tecnológico de Desmulta es de grado empresarial, diseñado para escalar globalmente y resistir auditorías forenses de seguridad:

- **Frontend & Backend Unificado:** Construido sobre **Next.js 15** (React 19, App Router) para un renderizado híbrido y funciones Serverless de latencia ultrabaja.
- **Experiencia de Usuario (UX/UI):** Estilizado con TailwindCSS y animado con Framer Motion. La interfaz es premium (estilo aplicación nativa), con componentes magnéticos, transiciones fluidas a 60fps, soporte táctil avanzado, modo oscuro y un modo de impresión optimizado.
- **Infraestructura Cloud:** Alojado en **Vercel** (Edge Network). Usa **Firebase** (Firestore y Cloud Functions) como base de datos persistente para las transacciones.
- **Seguridad Paranoica (Zero-PII):** Cuenta con una estricta política Zero-PII (*Zero Personally Identifiable Information*). Los datos sensibles de los usuarios nunca se guardan en texto plano; son encriptados con criptografía militar (AES-256-GCM y RSA-OAEP) de extremo a extremo. Ni siquiera los administradores del sistema pueden leer los datos reales.
- **Integraciones:** Wompi (pasarela de pagos), Sentry (monitoreo y agrupación de errores en tiempo real), QStash/Upstash (Rate limiting y colas de trabajo) y un puente nativo hacia Telegram para alertas de auditoría.

## 5. El Proyecto y su Valor Diferencial
- **No es un simple chatbot de IA:** A diferencia de startups genéricas que utilizan ChatGPT o modelos similares, el núcleo legal de Desmulta es **determinista**. Esto significa que aplica reglas jurídicas exactas compiladas en código y no sufre de "alucinaciones" (inventar leyes o precedentes). En el ámbito del derecho, la precisión matemática es innegociable.
- **Costos Marginales Cercanos a Cero:** Al delegar el procesamiento más pesado (el reconocimiento óptico de imágenes OCR) al procesador del celular o computador del usuario final, Desmulta no paga costosos servidores de IA, permitiendo márgenes de ganancia extremadamente altos en el modelo B2C.
- **Escalabilidad Infinita:** Su arquitectura 100% *Serverless* garantiza que el sistema pueda atender a 1 o 100,000 ciudadanos al mismo tiempo sin necesidad de configurar servidores ni temer caídas de servicio.
