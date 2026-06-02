import { Multa } from '@/store/useExpedienteStore';

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
        const valores = bloqueContexto.match(regexValor);

        const fecha = fechas ? fechas[0] : new Date().toLocaleDateString('es-CO');
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
