# 🗺️ Roadmap de Excelencia Operacional (v2.0.0)

**ESTADO: EN PROGRESO**

> **MANDATO ESTRICTO:**
> Este documento contiene los 4 pilares arquitectónicos finales para el proyecto Desmulta. **No se avanzará hacia ninguna otra característica o funcionalidad del sistema hasta que estos 4 puntos estén 100% completados e implementados en los microservicios correspondientes (Next.js, Go, Python).**

---

## 📍 Punto 1: Trazabilidad Distribuida y Observabilidad (SRE)

**Estado:** ✅ Completado (Incluye Frontend y Backend)

**Objetivo:**
Inyectar un `X-Trace-Id` único desde que el usuario hace click en Next.js. Ese ID viajará a través de los _headers_ HTTP al servidor Go y a Cloud Run (Python).
Si ocurre un error en cualquier punto de la cadena, el log guardará ese `Trace-Id` permitiendo reconstruir toda la vida de la petición.

**Integración Extra (Telegram):**
Los informes de fallos y alertas técnicas (caídas de Redis, timeouts en OCR, etc.) no solo se guardarán en la base de datos, sino que se enviarán enriquecidos con el `Trace-Id` y contexto completo (IP, ubicación, acción, fecha, error) al chat de alertas técnicas de Telegram existente.

**✅ [14-AGO-2026] Logro alcanzado (Cámaras del Frontend):**
Se extendió el Pilar 1 a la capa de Next.js (cliente/React). Los `Error Boundaries` capturan fallos visuales y los envían a Telegram incluyendo la **línea exacta** del código que falló (`stack` y `componentStack`), ofreciendo vigilancia 360° en los 3 repositorios.

---

## 📍 Punto 2: Caché de Negocio (FinOps y Optimización)

**Estado:** ⏳ Pendiente

**Objetivo:**
Utilizar Upstash Redis (ya configurado para Rate Limiting) para implementar una capa de Caché transaccional.

- **Go (Calculadora):** Cachear resultados matemáticos (monto + fecha = intereses) con TTL de 24 horas.
- **Python (OCR/SIMIT):** Evitar peticiones redundantes si se consulta repetidamente la misma placa o documento.
  Esto ahorrará ciclos de cómputo en Cloud Run y Vercel, optimizando los costos de infraestructura.

---

## 📍 Punto 3: Ingeniería del Caos (Chaos Engineering)

**Estado:** ⏳ Pendiente

**Objetivo:**
Validar la resiliencia del sistema bajo estrés severo antes de que ocurra en la vida real.
Crear _Flags_ ocultos (`SIMULATE_WOMPI_CRASH=true`, demoras inyectadas de 15s en OCR, fallos simulados en Firebase) para comprobar visual y transaccionalmente que los _Circuit Breakers_ funcionan, haciendo _Fail-Open_ o _Fail-Closed_ sin corromper la base de datos ni los pagos de los usuarios.

---

## 📍 Punto 4: Pipeline de CI/CD Estricto

**Estado:** ⏳ Pendiente

**Objetivo:**
Configurar flujos de validación automatizada (por ejemplo, GitHub Actions) que impidan realizar fusiones (_merges_) a la rama `main` en los 3 repositorios (Desmulta, Go, Python) si:

- El código no compila.
- Las pruebas (Vitest/PyTest/Go Test) fallan.
- Existen vulnerabilidades reportadas (`npm audit`, escaneos estáticos).
