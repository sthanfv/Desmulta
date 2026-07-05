import { Multa } from '@/store/useExpedienteStore';

const CODIGOS_VALIDOS = new Set([
  'A01',
  'A02',
  'A03',
  'A04',
  'A05',
  'A06',
  'A07',
  'A08',
  'A09',
  'A10',
  'A11',
  'A12',
  'B01',
  'B02',
  'B03',
  'B04',
  'B05',
  'B06',
  'B07',
  'B08',
  'B09',
  'B10',
  'B11',
  'B12',
  'B13',
  'B14',
  'B15',
  'B16',
  'B17',
  'B18',
  'B19',
  'B20',
  'B21',
  'B22',
  'B23',
  'C01',
  'C02',
  'C03',
  'C04',
  'C05',
  'C06',
  'C07',
  'C08',
  'C09',
  'C10',
  'C11',
  'C12',
  'C13',
  'C14',
  'C15',
  'C16',
  'C17',
  'C18',
  'C19',
  'C20',
  'C21',
  'C22',
  'C23',
  'C24',
  'C25',
  'C26',
  'C27',
  'C28',
  'C29',
  'C30',
  'C31',
  'C32',
  'C33',
  'C34',
  'C35',
  'C36',
  'C37',
  'C38',
  'C39',
  'D01',
  'D02',
  'D03',
  'D04',
  'D05',
  'D06',
  'D07',
  'D08',
  'D09',
  'D10',
  'D11',
  'D12',
  'D13',
  'D14',
  'D15',
  'D16',
  'D17',
  'E01',
  'E02',
  'E03',
  'E04',
]);

/**
 * Extrae el código de infracción del CNT (Código Nacional de Tránsito) desde
 * el texto crudo producido por el motor OCR local (Tesseract).
 *
 * Los códigos válidos siguen el patrón: letra [A-E] + 2 dígitos (ej: C02, D04, A01).
 * Se busca el primer código precedido por palabras clave contextuales del comparendo
 * para descartar falsos positivos (placas como "ABC123" no deben coincidir).
 *
 * @param rawText - Texto extraído directamente por Tesseract desde la imagen.
 * @returns El código normalizado en mayúsculas (ej: "C29") o null si no se detecta.
 */
export function extraerCodigoInfraccion(rawText: string): string | null {
  if (!rawText || rawText.trim().length === 0) return null;

  let textoNorm = rawText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // 🛡️ SANITIZACIÓN
  const regexPlacas = /\b[A-Z]{3}\s?\d{2,3}[A-Z]?\b/g;
  textoNorm = textoNorm.replace(regexPlacas, ' ');

  // Patrón primario estricto: código CNT precedido de contexto de infracción
  // Captura patrones como "INFRACCION: C02", "COD. C29", "CODIGO D04", "C 02", etc.
  const regexContextual =
    /(?:INFRA[C|K]CION|INFRACCION|C[OÓ]DIGO|COD\.?|CODIGO|ART\.?|ARTICULO)[:\s.]*([A-E]\s?\d{2})(?!\d)/;
  const matchContextual = textoNorm.match(regexContextual);
  if (matchContextual) {
    return matchContextual[1].replace(/\s/g, '').toUpperCase();
  }

  // 🛡️ RE-INTRODUCIDO PERO RESTRINGIDO: regexAislado
  // Sólo extrae sin espacios intermedios y verifica contra la whitelist oficial.
  // Sólo extrae si el código es una palabra completa (o delimitada) para evitar
  // que sufijos de palabras como SERVICIO (CIO -> C10) o PABLO (BLO -> B10) generen falsos positivos.
  const ocrMap: Record<string, string> = { O: '0', I: '1', L: '1', S: '5', Z: '2' };
  const regexAislado = /\b([A-E])([0-9OILSZ]{2})\b/g;
  let matchAislado;
  while ((matchAislado = regexAislado.exec(textoNorm)) !== null) {
    let digitos = matchAislado[2];
    digitos = digitos.replace(/[OILSZ]/g, (char) => ocrMap[char]);
    const codigo = `${matchAislado[1]}${digitos}`;
    if (CODIGOS_VALIDOS.has(codigo)) {
      return codigo; // Retorna el primero válido encontrado
    }
  }

  return null;
}

/**
 * SIMIT Parser — Heurística de extracción de multas desde texto OCR.
 * Busca patrones de comparendos (generalmente números largos), fechas y valores.
 * MANDATO-FILTRO: Lógica resiliente a fallos parciales de OCR. Ventana de bloque para Móvil/PC.
 */
export function extraerMultasDeTexto(texto: string): Multa[] {
  const multas: Multa[] = [];
  const lineas = texto.split('\n');

  // Patrón simple: Busca números de comparendo (generalmente 15-20 dígitos)
  const regexComparendo = /\b\d{10,20}\b/g;

  // Patrón de fecha (DD/MM/AAAA)
  const regexFecha = /(\d{2}\/\d{2}\/\d{4})/g;

  // Patrón de valor monetario (Optimizado para evitar ReDoS)
  // eslint-disable-next-line security/detect-unsafe-regex
  const regexValor = /\$?\s?(\d{1,3}(?:\.\d{3})+|\d{6,8})/g;

  lineas.forEach((linea, index) => {
    const comparendosEncontrados = linea.match(regexComparendo);

    if (comparendosEncontrados) {
      comparendosEncontrados.forEach((comp) => {
        // 🛡️ DEVSECOPS FIX: Ventana de Bloque (Lookahead de 8 líneas)
        // Engloba tanto la fila horizontal (PC) como la tarjeta vertical (Móvil).
        const bloqueContexto = lineas.slice(index, index + 8).join(' ');

        const fechas = bloqueContexto.match(regexFecha);
        // 🛡️ DEVSECOPS: Excluir el número de comparendo del bloque de valores para evitar falsos positivos
        const bloqueSinComparendo = bloqueContexto.replace(comp, '');
        const valores = bloqueSinComparendo.match(regexValor);

        let fecha = new Date().toLocaleDateString('es-CO');
        if (fechas && fechas.length > 0) {
          const bloqueUpper = bloqueContexto.toUpperCase();
          const palabrasExcluidas = ['RESOL', 'NOTIF'];
          const fechasLimpias = fechas.filter((fStr) => {
            let idx = bloqueUpper.indexOf(fStr);
            while (idx !== -1) {
              const start = Math.max(0, idx - 30);
              const end = Math.min(bloqueUpper.length, idx + fStr.length + 5);
              const context = bloqueUpper.substring(start, end);
              const tienePalabraExcluida = palabrasExcluidas.some((p) => context.includes(p));
              if (tienePalabraExcluida) {
                return false;
              }
              idx = bloqueUpper.indexOf(fStr, idx + 1);
            }
            return true;
          });
          fecha = fechasLimpias.length > 0 ? fechasLimpias[0] : fechas[0];
        }
        let valor = 0;

        if (valores) {
          // Limpiamos el valor de puntos y símbolos
          const valorLimpio = valores[0].replace(/[^0-9]/g, '');
          valor = parseInt(valorLimpio) || 0;
        }

        // Estado: Buscamos palabras clave en el bloque completo
        let estado = 'Pendiente';
        const contextoLower = bloqueContexto.toLowerCase();
        if (contextoLower.includes('coactivo')) estado = 'Cobro Coactivo';
        if (contextoLower.includes('embargo')) estado = 'Embargo';

        multas.push({
          id: `simit-${comp}-${Date.now()}`,
          comparendo: comp,
          fecha,
          valor,
          estado,
        });
      });
    }
  });

  // Eliminar duplicados por número de comparendo
  return multas.filter((v, i, a) => a.findIndex((t) => t.comparendo === v.comparendo) === i);
}

/**
 * Extrae TODOS los códigos de infracción únicos del CNT desde el texto del OCR.
 * Ahora EXIGE contexto estricto para evitar falsos positivos.
 *
 * @param rawText - Texto extraído por Tesseract.
 * @returns Array de códigos normalizados (ej: ["C29", "C02"]) o array vacío.
 */
export function extraerCodigosInfraccion(rawText: string): string[] {
  if (!rawText || rawText.trim().length === 0) return [];

  let textoNorm = rawText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // 🛡️ SANITIZACIÓN
  const regexPlacas = /\b[A-Z]{3}\s?\d{2,3}[A-Z]?\b/g;
  textoNorm = textoNorm.replace(regexPlacas, ' ');
  // NOTA: Se eliminó la sanitización de 'CION' porque rompía el keyword 'INFRACCION'
  // y ya no es necesaria al usar búsqueda estrictamente contextual.

  const codigos: string[] = [];
  const ocrMap: Record<string, string> = { O: '0', I: '1', L: '1', S: '5', Z: '2' };

  // ÚNICO PASO: Búsqueda contextual estricta.
  // No podemos permitir heurísticas aisladas porque capturan direcciones y horas.
  const regexContextual =
    /(?:INFRA[C|K]CION|INFRACCION|C[OÓ]DIGO|COD\.?|CODIGO|ART\.?|ARTICULO)[:\s.]*([A-E]\s?[0-9OILSZ]{2})(?!\d)/g;

  let matchCtx;
  while ((matchCtx = regexContextual.exec(textoNorm)) !== null) {
    const fragmento = matchCtx[1].replace(/\s/g, '');
    const letra = fragmento[0];
    let digitos = fragmento.substring(1);
    digitos = digitos.replace(/[OILSZ]/g, (char) => ocrMap[char]);
    const codigo = `${letra}${digitos}`;
    if (!codigos.includes(codigo)) codigos.push(codigo);
  }

  // PASO 2: Rescate Aislado Estricto (Para capturar códigos en tablas de SIMIT sin keywords)
  // Atrapa formatos como "C02" pero exige que pertenezcan a la lista oficial de códigos válidos.
  // Se exigen word boundaries \b para evitar falsos positivos con palabras como SERVICIO (C10) o PUEBLO (B10).
  if (codigos.length === 0) {
    const regexAislado = /\b([A-E])([0-9OILSZ]{2})\b/g;
    let matchAislado;
    while ((matchAislado = regexAislado.exec(textoNorm)) !== null) {
      let digitos = matchAislado[2];
      digitos = digitos.replace(/[OILSZ]/g, (char) => ocrMap[char]);
      const codigo = `${matchAislado[1]}${digitos}`;
      if (CODIGOS_VALIDOS.has(codigo) && !codigos.includes(codigo)) {
        codigos.push(codigo);
      }
    }
  }

  return codigos;
}
