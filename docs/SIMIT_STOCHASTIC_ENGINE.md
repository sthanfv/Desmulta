# 🎲 Motor Estocástico SIMIT (Evasión WAF Avanzada)

El Motor Estocástico es el "cerebro" detrás del orquestador de Scraper SIMIT en la arquitectura Zero-PII.
Fue diseñado para resolver un problema crítico: **¿Cómo evadimos el baneo de IP si tenemos que consultar cientos de cédulas usando una misma IP estática de Cloud Run, sin activar las alarmas del WAF?**

La solución es emular el comportamiento humano mediante el caos matemático.

## 1. El Problema de los Patrones

Los sistemas de ciberseguridad modernos (WAFs como Cloudflare o Akamai) detectan patrones temporales.

- Si envías 50 solicitudes a las 00:00 todos los días = Baneo.
- Si envías 5 solicitudes exactamente cada 10 minutos = Baneo.
- Si envías ráfagas de 50 en la madrugada = Baneo.

## 2. Solución: El Orquestador Estocástico

En lugar de programar un CRON para que se ejecute a una hora exacta, el sistema utiliza un "Despertador" continuo y un "Dado" probabilístico.

### 2.1 QStash Ping

QStash hace PING a la ruta `/api/qstash/simit-worker` **CADA 1 MINUTO** (`* * * * *`).

### 2.2 Compuerta de Tiempo (Time-Gating)

Al recibir el PING, el sistema revisa la hora actual en la Zona Horaria de Bogotá (`America/Bogota`).

- Si son entre las **10:00 PM y las 06:59 AM**, el sistema asume que los humanos están durmiendo y apaga la función inmediatamente. No se gasta memoria ni base de datos.
- **Rango de Actividad:** 900 minutos útiles al día (07:00 a 21:59).

### 2.3 El Gatillo Probabilístico (Jitter)

Durante el rango de actividad, el servidor tira un dado aleatorio.

- Probabilidad de éxito: **6%** (configurable).
- Si el dado cae en el 94%, la función se apaga silenciosamente (Skipped).
- Si el dado cae en el 6%, **se activa la ejecución**.
  _Resultado:_ El scraper se ejecutará en promedios de ~54 veces al día (900 min \* 0.06), pero los minutos exactos serán 100% aleatorios (ej. 07:11, 07:12, 08:41). Es imposible predecir el siguiente escrutinio.

### 2.4 Lotes Dinámicos (Batching)

Una vez activada la ejecución, el worker no extrae una cantidad predecible de datos. Ejecuta una función `getRandomBatchSize(1, 4)` para escoger aleatoriamente entre 1 y 4 cédulas para escrutar en esa ronda.

### 2.5 Rotación Semanal (Slow Drip)

Para evitar saturar a los usuarios y al sistema, el worker hace un query a Firestore pidiendo: _"Dame las cédulas más antiguas que lleven MÁS DE 7 DÍAS sin haber sido consultadas"_.
De este modo, si tenemos 500 usuarios, el sistema los irá goteando a lo largo de toda la semana de forma invisible, respetando la IP estática.

---

**Ruta del archivo:** `src/lib/security/stochastic-engine.ts`
**Pruebas unitarias:** `src/lib/security/__tests__/stochastic-engine.test.ts` (10,000 iteraciones comprobando la convergencia probabilística).
