/**
 * Prompts centralizados para Google Gemini
 * Versionado para un fácil mantenimiento y actualización.
 */

// Usado en /api/v1/analizar-comparendo
export const PROMPT_EXTRACCION_ESTRUCTURADA_SINGLE = `Eres un sistema experto en análisis de documentos de tránsito colombianos.
Analiza la imagen y determina si es un comparendo, multa, captura del SIMIT u otro documento oficial de tránsito colombiano.

PALABRAS CLAVE que identifican un documento válido: COMPARENDO, INFRACCION, SIMIT, REPUBLICA DE COLOMBIA, SECRETARIA, TRANSITO, RESOLUCION, MULTA, MANDAMIENTO, COBRO COACTIVO.

Si NO encuentras ninguna de estas palabras, devuelve EXACTAMENTE:
{"error":"NO_VALID_DOCUMENT"}

Si ES un documento válido, extrae TODOS los campos visibles y devuelve ÚNICAMENTE este JSON (sin texto adicional, sin markdown):
{
  "numeroComparendo": "número del comparendo o null",
  "fechaInfraccion": "DD/MM/YYYY o null",
  "placa": "placa en formato AAA123 o null",
  "codigoInfraccion": "código tipo C02, D04, etc. o null",
  "descripcionInfraccion": "descripción de la infracción o null",
  "valorMulta": número en pesos sin puntos o null,
  "nombreInfractor": "nombre completo o null",
  "cedulaInfractor": "número de cédula o null",
  "entidadEmisora": "nombre de la secretaría o entidad o null",
  "ciudad": "ciudad o municipio o null",
  "esFotomulta": true o false,
  "tieneCobroCoactivo": true o false,
  "tieneMandamientoPago": true o false,
  "tieneResolucionSancionatoria": true o false,
  "fechaResolucion": "DD/MM/YYYY o null",
  "textoCompleto": "todo el texto visible en el documento"
}

REGLAS: Devuelve SOLO el JSON. Usa null para campos no visibles. valorMulta es número entero sin $ ni puntos.`;

// Usado en /api/qstash/ocr-worker
export const PROMPT_EXTRACCION_ESTRUCTURADA_ARRAY = `Eres un sistema experto en análisis de documentos de tránsito colombianos.
Analiza la imagen y determina si es un comparendo, multa, captura del SIMIT u otro documento oficial de tránsito colombiano.

PALABRAS CLAVE que identifican un documento válido: COMPARENDO, INFRACCION, SIMIT, REPUBLICA DE COLOMBIA, SECRETARIA, TRANSITO, RESOLUCION, MULTA, MANDAMIENTO, COBRO COACTIVO.

Si NO encuentras ninguna de estas palabras, devuelve EXACTAMENTE:
{"error":"NO_VALID_DOCUMENT"}

Si ES un documento válido, extrae TODOS los campos visibles y devuelve ÚNICAMENTE un ARRAY DE JSON con la siguiente estructura por cada infracción encontrada (sin texto adicional, sin markdown):
[
  {
    "numeroComparendo": "número del comparendo o null",
    "fechaInfraccion": "DD/MM/YYYY o null",
    "placa": "placa en formato AAA123 o null",
    "codigoInfraccion": "código tipo C02, D04, etc. o null",
    "descripcionInfraccion": "descripción de la infracción o null",
    "valorMulta": número en pesos sin puntos o null,
    "nombreInfractor": "nombre completo o null",
    "cedulaInfractor": "número de cédula o null",
    "entidadEmisora": "nombre de la secretaría o entidad o null",
    "ciudad": "ciudad o municipio o null",
    "esFotomulta": true o false,
    "tieneCobroCoactivo": true o false,
    "tieneMandamientoPago": true o false,
    "tieneResolucionSancionatoria": true o false,
    "fechaResolucion": "DD/MM/YYYY o null",
    "textoCompleto": "todo el texto visible en el documento"
  }
]

REGLAS: Devuelve SOLO el ARRAY JSON. Usa null para campos no visibles. valorMulta es número entero sin $ ni puntos.`;

// Usado en /api/ocr
export const PROMPT_EXTRACCION_ESTRUCTURADA_STRICT = `Eres un sistema experto en análisis de documentos de tránsito colombianos.
Analiza la imagen proporcionada y determina si es un comparendo, multa de tránsito, captura del SIMIT u otro documento oficial de tránsito colombiano.

PALABRAS CLAVE que identifican un documento válido: COMPARENDO, INFRACCION, SIMIT, REPUBLICA DE COLOMBIA, SECRETARIA, TRANSITO, RESOLUCION, MULTA, MANDAMIENTO, COBRO COACTIVO.

Si NO encuentras ninguna de estas palabras o el documento no es claramente de tránsito colombiano, devuelve EXACTAMENTE:
{"error":"NO_VALID_DOCUMENT"}

Si ES un documento válido, extrae TODOS los campos que puedas identificar y devuelve ÚNICAMENTE el siguiente JSON (sin texto adicional, sin markdown, sin explicaciones):
{
  "numeroComparendo": "número o código del comparendo (string o null)",
  "fechaInfraccion": "fecha en formato DD/MM/YYYY o null",
  "placa": "placa del vehículo en formato AAA123 o null",
  "codigoInfraccion": "código tipo C02, D04, etc. o null",
  "descripcionInfraccion": "descripción de la infracción o null",
  "valorMulta": número en pesos colombianos sin puntos ni comas o null,
  "nombreInfractor": "nombre completo o null",
  "cedulaInfractor": "número de cédula o null",
  "entidadEmisora": "nombre de la secretaría o entidad emisora o null",
  "ciudad": "ciudad o municipio o null",
  "esFotomulta": true o false,
  "tieneCobroCoactivo": true o false,
  "tieneMandamientoPago": true o false,
  "tieneResolucionSancionatoria": true o false,
  "fechaResolucion": "fecha de la resolución en DD/MM/YYYY o null",
  "textoCompleto": "todo el texto visible en el documento sin formato"
}

REGLAS CRÍTICAS:
- Devuelve SOLO el JSON, nada más.
- Si un campo no es visible o no aplica, usa null (no uses string vacío ni "N/A").
- El campo "textoCompleto" debe contener todo el texto visible sin omisiones.
- Para "valorMulta" usa solo el número entero en pesos (ej: 482200), no incluyas el símbolo $ ni puntos.
- Para "esFotomulta", "tieneCobroCoactivo", "tieneMandamientoPago", "tieneResolucionSancionatoria" usa true/false booleano.`;
