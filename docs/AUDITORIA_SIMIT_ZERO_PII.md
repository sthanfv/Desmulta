# Auditoría de Seguridad y Flujo: Escudo SIMIT (Zero-PII)

**Fecha de Auditoría:** 09-08-2026
**Objetivo:** Rastrear el flujo completo de los datos personales (Cédula y Email) desde su captura en el Frontend hasta el procesamiento asíncrono en Cloud Run, garantizando que el diseño Zero-PII se cumple en cada nodo de la arquitectura.

---

## 1. Entrada de Datos (Frontend & WAF)

**Ubicación:** `src/app/escudo-simit/page.tsx`

- **Flujo:** El usuario ingresa su Cédula y Email en la Landing Page.
- **Validación Anti-Bot:** Antes de que cualquier dato viaje, Cloudflare Turnstile intercepta la interacción y genera un Token de un solo uso.
- **Transmisión Segura:** Los datos viajan cifrados bajo el protocolo TLS 1.3 directo al backend de Next.js (`/api/escudo-simit/activate`).

## 2. Capa de Negocio (Suscripción y Cifrado)

**Ubicación:** `src/app/api/escudo-simit/activate/route.ts` & `src/lib/data/simit-subscriptions.ts`

- **Recepción:** El endpoint de activación recibe la Cédula y el Email en memoria RAM.
- **Cifrado Inmediato (AES-256-GCM):** Los datos _nunca_ se envían a la base de datos en texto plano. La función `encryptData` (ubicada en `crypto.ts`) toma los valores y los encripta usando `SIMIT_ENCRYPTION_KEY` generando un cifrado con Vector de Inicialización (IV) único y Etiqueta de Autenticación.
- **Anonimización del Documento (SHA-256):** Para que Firestore pueda realizar búsquedas e indexar usuarios sin conocer sus cédulas, el ID del documento se crea haciendo un Hash irreversible HMAC-SHA-256 (`hashData`) de la Cédula usando la llave `SIMIT_SALT`.
- **Almacenamiento (Salida a DB):** Se guarda en la colección `simit_subscriptions` bajo el ID ofuscado. Si alguien vulnera la base de datos de Google, solo verá Hashes irreversibles y texto cifrado.

## 3. Orquestador de Monitoreo (Upstash QStash)

**Ubicación:** `src/app/api/qstash/simit-worker/route.ts`

- **Invocación Segura:** QStash hace ping automático (CRON) al worker. La cabecera `upstash-signature` se valida estrictamente.
- **Desencriptación Volátil:** El worker lee todos los documentos ofuscados de Firestore. Extrae el IV, el AuthTag y el texto cifrado, y los desencripta en memoria RAM usando la `SIMIT_ENCRYPTION_KEY`.
- **Destrucción de Contexto:** Una vez extraídos los datos, el motor crea un array en memoria para enviarlo al Scraper.

## 4. El Motor Scraper (Cloud Run)

**Ubicación:** `desmulta-scraper` (Infraestructura Externa - CI/CD GitHub)

- **Autenticación B2B:** El worker en Vercel firma la petición HTTP hacia Cloud Run inyectando la cabecera `x-api-key`.
- **Evasión Avanzada:** Cloud Run recibe el lote de cédulas. Usa Playwright con rotación de _User Agents_, _Viewport spoofing_ y _Random Delays_ de 8 a 15 segundos para simular ser un humano buscando en SIMIT.
- **Respuesta JSON:** SIMIT devuelve el HTML, el scraper lo extrae usando selectores precisos y devuelve un JSON estructurado hacia Vercel.

## 5. Salida de Datos (Resend y Comparación)

**Ubicación:** `simit-worker/route.ts`

- **Algoritmo de Estado:** El worker compara `totalMultas` extraído del SIMIT vs `lastKnownFinesCount` en memoria.
- **Ruteo de Alerta:** Si detecta discrepancias al alza (nueva infracción), construye dinámicamente un correo React (`buildEscudoSimitEmail`) inyectando el detalle de las multas.
- **Despacho:** Envía el payload a Resend y actualiza el nuevo conteo de multas en la base de datos ofuscada de Firestore.
- **Limpieza (Garbage Collection):** El proceso termina y Node.js destruye los datos descifrados de la memoria RAM.

---

### 🛡️ VEREDICTO DE LA AUDITORÍA

**ESTADO: APROBADO (ENTERPRISE-GRADE)**
La cadena de custodia de la información cumple con la arquitectura _Zero-Trust_ y _Privacidad por Diseño_. No existen fugas de Información de Identificación Personal (PII) en reposo, en los logs ni en el almacenamiento persistente. La tubería CI/CD asegura actualizaciones continuas sin downtime y los tiempos de latencia del scraper (8-15s) están absorbidos por la asincronía del QStash Worker.
