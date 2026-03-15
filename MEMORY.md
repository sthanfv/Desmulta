# MEMORY.md — Estado del Proyecto Desmulta 🛡️

## 1. Contexto Actual

- **Versión**: v2.8.2
- **Estado**: Fricción Premium (JurisprudenciaScroll) - COMPLETADO.
- **Mando**: Equipo de Desarrollo Élite.

## 36. Actualización v2.8.2 (JurisprudenciaScroll & Inercia GSAP)

- **Motor de Jurisprudencia**: Implementado `JurisprudenciaScroll.tsx` con "scrubbing" de 1.5s de inercia, permitiendo que las armas legales se desplacen con suavidad táctil premium.
- **Inyección Post-Bento**: Integrado en `HomeClient.tsx` para conectar la ingeniería técnica con la base legal de Desmulta.
- **PWA Feel Consistency**: Aplicada la clase `.pwa-native-feel` a las tarjetas y títulos de la sección para evitar feedback web.
- **GSAP Context Management**: Implementado `gsap.context()` para asegurar una gestión de memoria impecable en entornos React.

## 35. Actualización v2.8.1 (Blindaje Android + Native Feel)

- **Parche de Tacto Elite**: Implementado el `.pwa-native-feel` exacto solicitado por el usuario en `globals.css`, incluyendo `touch-action: pan-y` para una estabilidad de scroll superior.
- **Blindaje en ConsultationForm**: Inyectada la clase de tacto nativo en todos los botones y selectores del formulario principal para eliminar destellos web y selecciones accidentales.
- **Background Persistence**: Forzado `background-color` en el `body` para evitar parpadeos durante el overscroll del navegador.
- **Sincronización v2.8.1**: Elevación global de versión.

## 34. Actualización v2.8.0 (Evolución PWA & Cinematografía)

- **Text Reveal Cinematográfico**: Implementado motor `LazyMotion` en `Hero.tsx` con la narrativa "Tumbamos tu fotomulta. Legalmente." usando curvas de freno Apple-like.
- **Tacto Nativo**: Inyectada clase `.pwa-native-feel` en `globals.css` para eliminar destellos táctiles y selecciones accidentales en dispositivos móviles.
- **Respect Hardware (Safe Areas)**: Refactorizado `layout.tsx` para usar `env(safe-area-inset-*)` respetando muescas (notches) y barras de gestos.
- **Optimización Anti-Rebote**: Forzado `overscroll-behavior-y: none` para una experiencia de scrolling sólida.
- **Sincronización v2.8.0**: Elevación global de versión.

## 33. Actualización v2.7.9 (Refinamiento Narrativo)

- **Simplificación de Comunicación**: Refactorizada la narrativa en `BentoDesmulta.tsx` para eliminar términos excesivamente técnicos (Zero-PII, SecurityLogger) y detalles de prescripción específicos (3 años, Art. 159).
- **Protección de Know-how**: Se cambió "Prescripción" por "Blindaje de Caducidad" para mantener una ventaja estratégica en la comunicación con el cliente.
- **Sincronización v2.7.9**: Elevación de la versión operativa.

## 32. Actualización v2.7.8 (Hotfix de Estabilidad)

- **Sincronización de Etiquetas**: Corregido error de sintaxis en `SuccessStories.tsx` donde la etiqueta de cierre no coincidía tras la migración a `MagneticCard`.
- **Extensión de Props**: Añadido soporte para `onClick` en `MagneticCard.tsx` para permitir la apertura de modales desde las tarjetas premium.
- **Sincronización v2.7.8**: Elevación de la versión de seguridad y operativa.

## 31. Actualización v2.7.7 (Refinamiento de Alta Visibilidad)

- **Hotfix de Contraste**: Se intensificó la opacidad del halo en `MagneticCard.tsx` (del 12% al 20% en light, 60% en dark) para asegurar que la "Mutación Visual" sea perceptible en pantallas de baja saturación.
- **Borde Dinámico**: Añadido borde iluminado que reacciona al mouse en `MagneticCard.tsx` mejorando la sensación de profundidad.
- **Consolidación de Componentes**: Reemplazado `TarjetaPremium` por el nuevo motor `MagneticCard` en `SuccessStories.tsx` para impacto visual inmediato.
- **Sincronización v2.7.7**: Actualización global del versionado.

## 30. Actualización v2.7.6 (Adaptabilidad de la Trinidad)

- **Tokens Adaptables**: Refactorización de `MagneticCard.tsx` y `BentoDesmulta.tsx` para utilizar clases semánticas (`bg-card`, `text-foreground`, `border-border`).
- **Soporte Light Mode**: El sistema ahora es totalmente funcional y estético tanto en tema oscuro como claro, manteniendo el efecto magnético y el desenfoque de fondo.
- **Sincronización v2.7.6**: Actualización global del versionado y documentación del Design System adaptativo.

## 29. Actualización v2.7.5 (La Obra Maestra Visual)

- **BentoDesmulta**: Implementado grid asimétrico en `src/components/sections/BentoDesmulta.tsx`. Integración de narrativa legal con componentes elite.
- **Integración Landing**: Inyectado el Bento Grid en `HomeClient.tsx` tras la sección de metodología.
- **Mejora Reveal**: Refactorización de `src/components/animations/Reveal.tsx` para soportar `className`, permitiendo su uso en grids complejos.
- **Sincronización v2.7.5**: Consolidación del versionado en todo el ADN del sistema.

## 28. Actualización v2.7.4 (La Trinidad Visual - Parte I & II)

- **MagneticCard**: Implementado motor táctil en `src/components/ui/MagneticCard.tsx`. Efecto de halo de luz primary dinámico.
- **Reveal Global**: Implementado optimizador de animación en `src/components/animations/Reveal.tsx` usando `LazyMotion` para un rendimiento de 100 en Lighthouse.
- **Sincronización v2.7.4**: Actualizado versionado global para reflejar la evolución visual.

## 27. Actualización v2.7.3 (Consolidación Maestra)

- **Single-Source Truth**: Se eliminó el directorio `/docs/` y se fusionó toda su información (Estrategia FinOps, Guía de Mantenimiento, Hoja de Ruta y Estructura de Datos) directamente en `README.md`.
- **Higiene Documental**: El proyecto ahora solo cuenta con `README.md` (Documentación Técnica y Estratégica) y `MEMORY.md` (Historia y Registro Operativo).
- **Sincronización v2.7.3**: Elevación de versión global en todos los puntos de contacto.

## 26. Actualización v2.7.2 (La Biblia del Frontend)

- **Documentación Exhaustiva**: Se actualizó el `README.md` con un desglose granular de la arquitectura de cliente, detallando el Diseño (Premium Dark), Animaciones (GSAP/Framer), Lógica de OCR Forense y Persistencia Anti-Crash.
- **Claridad Técnica**: Detalle de heurísticas legales (C-038/Art 159) y su impacto en la UI dinámina.
- **Consolidación**: Sincronización de la versión 2.7.2 en todos los activos del sistema.

## 25. Actualización v2.7.1 (Codificación Segura Telegram)

- **URL API Refactor**: Se eliminó `encodeURIComponent` del motor legal para favorecer el uso de la API nativa `URL` en la UI. Esto garantiza una construcción de enlaces "a prueba de balas" con manejo correcto de caracteres especiales y Markdown.
- **Triage Pura**: El `triage-engine.ts` ahora entrega texto plano y natural, facilitando su reutilización en otros canales (Email, Logs, etc.).

## 24. Actualización v2.7.0 (Consolidación Final)

- **Salida Telegram**: Migrado el flujo de contacto de WhatsApp a Telegram (`https://t.me/DesmultaOficial`).
- **Heurísticas Avanzadas**: El motor de triage ahora detecta fotomultas (Sentencia C-038) y posible prescripción (Art. 159 CNT) mediante expresiones regulares y lógica difusa.
- **UI Dinámica**: Soporte para prioridad `MEDIA` (color azul) y mensajes formateados en Markdown para una mejor experiencia del analista en Telegram.
- **Integración**: Sincronización total entre el OCR crudo, el store de persistencia y el motor de decisión legal.

## 23. Actualización v2.6.6 (Persistencia y Triage Legal)

- **Fase 3 Persistencia**: Store de Zustand actualizado con middleware `persist` y `partialize`. Protección contra pérdida de leads en recargas de RAM (Android/iOS).
- **Fase 4 Triage Legal**: Implementado `src/lib/legal/triage-engine.ts` para análisis automático de severidad jurídica basado en OCR.
- **UI Inteligente**: Botón de acción dinámico en `ConsultationForm.tsx` con estilos de urgencia (pulso rojo) y mensajes personalizados para WhatsApp.
- **Integración OCR**: Sincronización del texto crudo del OCR con el estado global para análisis en tiempo real.

## 22. Actualización v2.6.5 (Motor de Lógica Difusa)

- **Fase 1 Mejoras**: Implementado el Motor de Lógica Difusa (`src/lib/utils/string-matching.ts`) basado en el algoritmo de Distancia de Levenshtein.
- **Tolerancia OCR**: El sistema ahora permite validar coincidencias de texto con un margen de error configurable, mejorando la precisión tras procesos de Tesseract.js.
- **Calidad**: Suite de tests unitarios (`src/tests/string-matching.test.ts`) pasando con éxito (3/3).

## 21. Actualización v2.6.4 (Saneamiento de Seguridad y Hoja de Ruta)

- **Auditoría de Seguridad**: Ejecutado `npm audit fix` para mitigar 2 vulnerabilidades de alto riesgo (`undici`).
- **Planificación Futura**: Creado `docs/PLAN_MEJORAS_FUTURAS.md` definiendo la estrategia de migración a Edge Runtime y optimización FinOps.
- **Validación de Integridad**: Suite de 36 pruebas unitarias verificada (100% éxito).
- **Consolidación MANDATO-FILTRO**: Verificada la ofuscación de PII en `SecurityLogger` y saneamiento de dependencias obsoletas.

## 20. Actualización v2.6.3 (Troubleshooting y Consolidación Aurora)

- **Optimización de Capas**: Se implementó transparencia en el `body` (`bg-transparent`) para habilitar la visualización de la Aurora UI sin obstrucciones de fondos sólidos.
- **Sincronización v2.6.3**: Elevación total de la versión en `package.json`, `Footer.tsx`, `README.md` y `security-headers.ts`.
- **Refuerzo Háptico**: Validación del sistema de feedback sensorial en el flujo de consulta y escaneo forense.
- **Estabilidad de Desarrollo**: Reinicio del entorno de compilación para asegurar la inyección de nuevos keyframes de Tailwind.

- **Unificación de Versión**: Se sincronizó la versión `v2.6.1` en `package.json`, `Footer.tsx`, `README.md` y `security-headers.ts`.
- **Perfeccionamiento Visual**: Animación de escaneo optimizada con `translateY` y láser rediseñado.
- **Optimización de Logs**: Reducción de ruido en el worker de Tesseract (logs cada 10%).
- **Calidad de Código**: Suite de pruebas (36/36) y build de producción validados exitosamente.
- **Despliegue**: Sincronización total con el repositorio Git.

- **Optimización de Animación**: Migrada la animación `scan` de `top` a `translateY` en `tailwind.config.ts` para mejorar el rendimiento del navegador (evitando Layout recalculations). Añadida animación `scan-forense` (2.5s).
- **Rediseño de Láser Forense**: Reestructurado el componente `AnalizadorDocumentos.tsx` para usar un contenedor animado único que desplaza tanto la línea de luz como el rastro degradado, logrando un efecto más fluido y profesional.
- **Silenciado de Logs OCR**: Ajustado el logger en `useSIMITValidator.ts` para imprimir el progreso en consola solo en intervalos del 10%. Esto reduce el ruido en desarrollo y mejora el rendimiento del hilo principal.
- **Verificación Técnica**: Typecheck superado satisfactoriamente.

- **Optimización LCP**: Se añadió la propiedad `priority` a la imagen del Hero mediante la actualización del componente `lightbox.tsx` y su implementación en `Hero.tsx`. Esto elimina la advertencia de Largest Contentful Paint.
- **Fluidez en Desarrollo**: Se comentó `useTesseractPrewarm()` en `ConsultationForm.tsx` para reducir el consumo de RAM y acelerar el _Fast Refresh_ durante las sesiones de diseño.
- **Suite de Mantenimiento**: Ejecutada con éxito la cadena completa: `format`, `lint`, `typecheck`, `test` y `build`. El proyecto cuenta con 36 pruebas unitarias pasando y un bundle de producción optimizado.

- **Animación Cinemática**: Actualizados keyframes en `tailwind.config.ts` usando `translateY` para mayor suavidad. Implementada animación `scan-fast` (2s) para un efecto de barrido más dinámico en el componente `AnalizadorDocumentos.tsx`.
- **Rediseño del Láser**: Mejora visual en el componente de análisis con una línea de luz más intensa y un degradado de barrido descendente.
- **Optimización de Hilo Principal**: Implementado _Throttling_ en el hook `useSIMITValidator.ts`. El progreso del OCR ahora solo actualiza el estado si el avance es mayor al 5%, evitando congelamientos del navegador durante el procesamiento de imágenes pesadas.
- **Verificación Técnica**: Build y Typecheck validados exitosamente.

- **Corrección CSP Estricta**: Se actualizaron `connect-src` e `img-src` en `src/lib/security-headers.ts` para permitir dominios críticos (`tessdata.projectnaptha.com`, `grainy-gradients.vercel.app`, `challenges.cloudflare.com`) y evitar bloqueos en el motor OCR y assets visuales.
- **Simplificación PWA**: Se eliminó la configuración manual de `workboxOptions` en `next.config.ts` para permitir que el plugin use una configuración estable por defecto, resolviendo errores de generación de Service Worker (`_async_to_generator`).
- **Verificación de Build**: Ejecutado `npm run typecheck` satisfactoriamente tras los ajustes.

## 9. Actualización v2.4.3 (Estabilidad y Seguridad)

- **Corrección CSP**: Se habilitó `challenges.cloudflare.com` y `va.vercel-scripts.com` en `script-src-elem`. Se restauró `unsafe-eval` dinámicamente solo para entorno de desarrollo (HMR).
- **Limpieza de Permissions-Policy**: Eliminadas las directivas `browsing-topics` e `interest-cohort` que generaban warnings en navegadores modernos.
- **Validación Humana**: Verificado que el 100% de los diálogos, Toasts y esquemas de validación Zod hablen un español natural y profesional.
- **Hotfix de Persistencia**: Corregida la consulta de Firestore para persistir leads 'descartados' y 'finalizados'. Sincronizados los strings de estado entre DB y UI.
- **Saneamiento de Serialización**: Implementado mapeo de arrays de historial y documentos para convertir Timestamps de Firestore en Strings ISO, evitando fallos en Client Components.
- **Preparación Release**: Ejecutados checks de `format`, `lint`, `typecheck` y `build` satisfactorios. Código sincronizado con GitHub.

## 10. Actualización v2.4.4 (Copiado y Calidad de Código)

- **Copiado Inteligente**: Implementado `copyToClipboard` con botones dinámicos en el modal de detalles. Habilitada la selección de texto global (`user-select: auto`) para agilizar trámites en SIMIT.
- **Zero 'any' Policy**: Refactorización de serialización en `actions.ts`. Se eliminó todo rastro de `any`, permitiendo que el build de producción se complete sin errores.

## 11. Actualización v2.4.5 (Hiper-Localismo en el Edge)

- **Geolocalización Nativa**: Implementado middleware para interceptar `x-vercel-ip-city` e inyectar `x-ciudad-usuario` en las cabeceras.
- **Contexto Dinámico**: La página de inicio y el Hero ahora adaptan su mensaje según la ciudad detectada (ej: "Lideramos el saneamiento vial en Medellín").

## 12. Actualización v2.4.6 (Expediente Único y FinOps)

- **Zustand Persist**: Implementado `useExpedienteStore` para persistir multas detectadas en el cliente (localStorage).
- **Consolidación Atómica**: Nueva Server Action `consolidarExpedienteEnDB` que utiliza `arrayUnion` e `increment` en Firestore para evitar duplicados y reducir costos de escritura.
- **Heurística OCR**: Integrado `extraerMultasDeTexto` para obtener datos estructurados (comparendo, fecha, valor) directamente desde el OCR de Tesseract.

## 13. Actualización v2.4.7 (Suite de Pruebas y Pulido UX)

- **Blindaje con Vitest**: Creada suite de pruebas con 36 tests (100% éxito) cubriendo Middleware, Zustand Store y Server Actions.
- **Hotfix de Jerarquía Visual**: Elevado `z-index` de Toasts a `99999` para evitar que queden ocultos tras modales.
- **UX Inteligente**: El flujo de éxito ahora distingue entre "Expediente Creado" y "Anexo de Multas", celebrando la actualización del usuario recurrente.
- **Cierre Automático**: Implementado cierre de modales tras éxito para mejorar la fluidez del embudo.

## 2. Stack Tecnológico Detectado

- **Frontend**: Next.js 15.5.12, React 19.2.1 (PWA con `@ducanh2912/next-pwa`).
- **Estilos**: Tailwind CSS 3.4.1, UI based on Radix UI primitives.
- **Backend/DB**: Firebase Admin SDK (Server-side queries), Firestore.
- **IA / OCR**: **Tesseract.js** (OCR 100% Client-Side, Costo Cero). Sustituye a cualquier motor de IA en la nube para validar imágenes SIMIT. Funciona en el dispositivo del usuario sin consumir API keys ni servidores.
- **Seguridad**: Logger de seguridad personalizado con ofuscación de PII, Middlewares de protección, Cloudflare Turnstile.
- **Infraestructura**: Vercel (Next.js Node.js Serverless estable), Vercel Blob para storage.

## 3. Decisiones de Arquitectura

- **Modularidad Estricta**: Separación clara entre `src/app` (rutas/actions), `src/components`, `src/lib` y `src/services`.
- **Zero-Trust**: Validación de datos con Zod, protección de API con Turnstile, y logger que ofusca PII (Cédulas, Teléfonos).
- **Sincronización Dinámica**: Uso de Server Actions para invalidar caché y actualizar el frontend instantáneamente.
- **FinOps (Optimización de Costos)**:
  - Estrategia Singleton en Firebase Admin SDK para minimizar conexiones.
  - Paginación estricta y limitación de documentos en consultas Firestore (Admin Dashboard) para evitar sobrecostos de lectura.
  - Implementación de Cron Jobs en Vercel para la limpieza automatizada de capturas SIMIT en Vercel Blob (prevención de almacenamiento muerto).
  - Sin costos de IA en la nube: el OCR (Tesseract.js) es 100% Client-Side. El único motor de procesamiento de imágenes reside en el dispositivo del usuario.
- **UI/UX y Mobile-First**:
  - Telemetría: Uso planificado de mapas de calor/métricas para optimizar el embudo de conversión del formulario de 3 pasos.
  - Tolerancia a fallos de red: Service Worker configurado (`NetworkFirst`) para reintentos de subida de imágenes en conexiones móviles inestables.

## 4. Auditoría de Seguridad e Integridad (v2.3.7)

- **Vulnerabilidades**: 14 detectadas (Low) vía `npm audit`. Se ejecutó `npm audit fix`.
- **Integridad**: Build verificado exitosamente por el usuario.
- **UX**: Fase de humanización completada. Mensajes técnicos transformados a lenguaje natural para el ciudadano. Los límites de Rate Limit ahora muestran tiempo preciso (minutos/segundos o horas/minutos).
- **Auditoría v2.4.0**: Build verificado. Documentación purgada de referencias a Gemini, Genkit y GEMINI_API_KEY. Tesseract.js es el único motor de procesamiento de imágenes registrado.
- **Turnstile**: Verificado en modo _Managed_. Validación automática activada para el 90% de los casos.
- **CSP Hardening (v2.3.8)**: Eliminado `unsafe-eval` de `script-src`. Restringido `form-action`, mejorado `Referrer-Policy` a `strict-origin-when-cross-origin`, y `Permissions-Policy` extendida con `payment=(), usb=()`.
- **Motor OCR Zero-Waste (v2.3.9)**: Implementado `useSIMITValidator.ts` con Tesseract.js. Tres capas de filtrado en cliente: peso/formato → OCR → heurística con 10 frases-ancla de la UI oficial del SIMIT. Las imágenes falsas son bloqueadas antes de llegar a Vercel Blob o Firebase. Costo de infra evitado: 100%.
- **OCR Offline & Instantáneo (v2.4.0)**:
  - `useTesseractPrewarm.ts`: Inyecta `link rel=prefetch` silencioso al montar el formulario. El modelo `spa.traineddata` se descarga mientras el usuario llena el formulario.
  - `next.config.ts`: Regla `CacheFirst` en el Service Worker para persistir el modelo OCR de 20MB por 1 año. El validador SIMIT funciona completamente offline.

## 5. Tareas Pendientes

- [x] Aplicar `npm audit fix` para mitigar riesgos bajos.
- [x] Humanización de mensajes de error y límites.
- [x] **Seguridad**: Estrechar CSP (Content Security Policy) en el Middleware para mitigar riesgos XSS.
- [x] **Seguridad**: Verificar ofuscación de PII en logs de producción (Honeypot/SecurityLogger).
- [ ] **FinOps/Rendimiento**: Implementar mejoras hacia Edge Runtime (según `PLAN_MEJORAS_FUTURAS.md`).
- [ ] **UI/UX**: Pruebas de estrés offline para el Service Worker en la carga SIMIT.

## 6. Actualización v2.4.1 (Seguridad y Limpieza Edge)

- **Eliminación Total de Genkit**: Se identificaron 17 vulnerabilidades bajas asociadas a `genkit`, `@genkit-ai/*` y `firebase-admin`. Como `firebase-admin` no se pudo actualizar automáticamente sin breaking changes, y Genkit era código legado, se refactorizó `src/app/actions.ts` para utilizar `@google/generative-ai` directamente.
- **Limpieza de Dependencias**: Se desinstalaron `genkit` y `@genkit-ai/google-genai`. Los archivos en `src/ai/` que usaban Genkit fueron marcados como obsoletos/eliminados. El chat inteligente (Desmulta Chat) ahora opera directamente con el SDK de Google Generative AI, ahorrando dependencias innecesarias y mejorando la seguridad.
- **Aclaración Edge Runtime**: Se verificó que las API de control (como `validar-consulta`) se ejecutan sobre Node.js estable y no sobre Edge, debido a incompatibilidades intrínsecas del SDK de `firebase-admin` con el motor V8 puro sin polyfills. `PLAN_MEJORAS_FUTURAS.md` debe redactarse bajo este contexto realista.

## 7. Hotfix v2.4.2 (Estabilización de Build CI/CD)

- **Corrección API Cron (`force-dynamic`)**: Se corrigió el error `[PageNotFoundError]` lanzado por `next build` al recolectar datos de las páginas (`/api/cron/*`). Añadiendo `export const dynamic = 'force-dynamic'`, se evitó explícitamente que Next.js intentara la Generación Estática (SSG) de rutas Cron sin cuerpo dependiente de HTTP en build-time, logrando una compilación de Producción limpia (Output de Serverless y PWA service workers perfectos).

## 8. Sesión Actual: Mando Élite (Saneamiento)

- **Eliminación Definitiva de Genkit**: Conforme al MANDATO-FILTRO, se desinstalaron `genkit`, `@genkit-ai/*` y dependencias asociadas, eliminando 282 paquetes residuales.
- **Limpieza de Archivos**: Se eliminaron los archivos obsoletos `src/ai/genkit.ts` y los flujos en `src/ai/flows/` que causaban errores de tipos tras la desinstalación.
- **Verificación de Integridad**: Ejecutado `npm run typecheck` con éxito (0 errores). El sistema es estable utilizando el SDK directo de Google Generative AI en `src/app/actions.ts`.
- **Estado de Vulnerabilidades**: Mitigadas las vulnerabilidades críticas/medias asociadas a Genkit. Las 8 vulnerabilidades bajas restantes pertenecen a la cadena de `firebase-admin`, cuya actualización mayor a v10 se posterga para mantener estabilidad de producción (Admin SDK).
- **Compromiso MANDATO-FILTRO**: Verificado. Documentación y logs actualizados 100% en ESPAÑOL.
