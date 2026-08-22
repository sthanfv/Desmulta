# 📈 Analítica de Demanda Ciudadana (Pilar 3)

Este documento detalla la arquitectura, el flujo de datos y las consideraciones de seguridad del sistema de Analítica de Demanda Ciudadana ("Google Trends de Multas") implementado en Desmulta.

## 🎯 Objetivo del Sistema
Proveer inteligencia de mercado en tiempo real sobre las problemáticas legales más consultadas por los ciudadanos (ej: embargos, prescripción, fotomultas) y su distribución geográfica (geocontexto), garantizando un costo de $0.00 USD en lecturas/escrituras de base de datos y manteniendo un cumplimiento estricto de privacidad (Zero-PII).

---

## 🏗️ Arquitectura de la Solución

El sistema se compone de tres piezas fundamentales:

### 1. Motor de Ingesta Asíncrona (`demand-tracker.ts`)
- **Ubicación:** `src/lib/analytics/demand-tracker.ts`
- **Funcionamiento:** Se inyecta en el endpoint del Asistente IA (`/api/chat/route.ts`).
- **Lógica:**
  - Extrae la intención (tema) y la ciudad mediante un analizador de expresiones regulares (Regex) de complejidad *O(1)*.
  - Genera comandos atómicos de incremento (`HINCRBY`, `INCR`).
  - Agrupa los comandos en un único **Pipeline de Upstash Redis**.
- **Ventaja SRE:** Se ejecuta de forma asíncrona (`fire-and-forget`) sin bloquear el hilo principal. No añade latencia a la respuesta del ciudadano.

### 2. Almacenamiento en Memoria (Upstash Redis)
- **Por qué Redis y no Firestore:** Guardar analíticas masivas en Firestore genera costos inmanejables por cada lectura/escritura (Data Transfer y Ops). Upstash Redis permite millones de incrementos atómicos en memoria RAM sin costo adicional y sin colisiones de concurrencia.
- **Estructura de Llaves:**
  - `analytics:demand:total:YYYY-MM` (String/Integer): Total de consultas del mes.
  - `analytics:demand:topics:YYYY-MM` (Hash): Volumen por intención legal.
  - `analytics:demand:cities:YYYY-MM` (Hash): Volumen por municipio/ciudad.

### 3. Centro de Mando Visual (`DemandTrendsWidget.tsx`)
- **Ubicación:** `src/app/admin/components/DemandTrendsWidget.tsx`
- **Renderizado:** Panel de Administración de Desmulta (`AnalyticsView.tsx`).
- **Seguridad:** Los datos se obtienen a través del Route Handler `/api/admin/analytics/demand/route.ts`, el cual exige validación criptográfica del JWT de Firebase Auth (vía cookie `__session`) asegurando que solo administradores legítimos puedan acceder a esta inteligencia de mercado.

---

## 🛡️ Auditoría de Seguridad y Resiliencia (DevSecOps)

El Pilar 3 fue diseñado bajo estrictos principios de resiliencia:

1. **Fail-Open (Tolerancia a Fallos de Telemetría):** 
   Si Upstash Redis sufre una caída temporal, el motor de ingesta atrapará el error en silencio sin colgar el chat del usuario. Priorizamos la **disponibilidad del servicio de IA** sobre la telemetría.
2. **Alertamiento Crítico (Telegram SRE):**
   Si la conexión a Redis falla, o si el microservicio de IA colapsa, el sistema no depende de los costosos logs de Vercel. Automáticamente invoca a `sendTelegramAgentAlert()` (`src/lib/telegram.ts`), notificando al equipo de ingeniería al instante en su dispositivo móvil.
3. **Protección Anti-Inyección:**
   El motor de extracción de ciudades y temas purga caracteres extraños (`normalize("NFD")`) y asigna identificadores estrictos controlados por el código (ej: `topicId = 'embargos'`). El payload del usuario nunca se inyecta crudo como llave en la base de datos.
4. **Zero-PII Compliance:**
   La analítica es 100% anónima. No se extraen, ni relacionan números telefónicos, cédulas ni nombres con estas métricas.

---

## 📊 Expansión Futura (Roadmap)
- **Comparativas Mensuales:** Agregar deltas (ej: *"+15% vs mes anterior"*).
- **Exportación CSV:** Permitir descargar la data agregada para reportes a inversores.
- **Retención (TTL):** Implementar TTL automático en las llaves de Redis (ej: 12 meses) para liberar memoria si el tráfico escala masivamente.
